// Round 1218 review (run lens): a player's walk of a LIT build (CM_VAR_LIVE turned on in the runner's checkout only).
// Run from the repo root with BASE set to a served dist and RC_OUT to a folder for screenshots.
// It asserts little and records much: every case writes what it saw into walk-report.json and prints one line.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'walk-out');
fs.mkdirSync(OUT, { recursive: true });
const pw = (await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href)).default;
const KEY = 'dukb-club-manager-save', NOW = 1791547200000, SECOND_SEED = 5312, FINISH_SEED = 5313;
const clone = v => JSON.parse(JSON.stringify(v));
function fixedDate(fn) {
  const OriginalDate = Date;
  globalThis.Date = class extends OriginalDate { constructor(...args) { super(...(args.length ? args : [NOW])); } static now() { return NOW; } };
  try { return fn(); } finally { globalThis.Date = OriginalDate; }
}
const memory = new Map();
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k) };
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'r1218-walk-'));
const bundle = path.join(work, 'engine.mjs');
await build({ entryPoints: [path.join(ROOT, 'src/lib/clubManager.ts')], bundle: true, platform: 'node', format: 'esm', outfile: bundle, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error' });
process.env.CM_VAR_FIXTURE_ONLY = '1';
const { findCmVarFixture, withCmVarSeed } = await import(pathToFileURL(path.join(ROOT, 'scripts/simCmVar.mjs')).href);

const report = { base: BASE, fixtures: {}, cases: [], help: [] };
const save = () => fs.writeFileSync(path.join(OUT, 'walk-report.json'), JSON.stringify(report, null, 1));
const fixtures = {};
for (const kind of ['disallowed', 'awarded_scored', 'awarded_missed']) {
  try {
    const cm = await import(`${pathToFileURL(bundle).href}?fixture=${kind}`);
    const t = Date.now();
    const f = fixedDate(() => findCmVarFixture(cm, kind));
    fixtures[kind] = f;
    report.fixtures[kind] = { seed: f.seed, minute: f.event.minute, side: f.event.side, who: f.event.who, review: f.event.review, comp: f.paused.live.compLabel, opponent: f.paused.live.opponent, searchMs: Date.now() - t };
    console.log(`FIXTURE ${kind}: seed ${f.seed}, ${f.event.minute}', side ${f.event.side}, ${f.event.who}, ${f.paused.live.compLabel} against ${f.paused.live.opponent}`);
  } catch (error) { report.fixtures[kind] = { error: String(error.message || error) }; console.log(`FIXTURE ${kind}: NOT FOUND (${error.message})`); }
}
/* Two grounds the bounded search of simCmVar does not look for: a review at the very end of the half (45' or added time)
   and two reviews in one half. Same fresh career, same seeds, the real rates. */
{
  const cm = await import(`${pathToFileURL(bundle).href}?fixture=extra`);
  const pre = fixtures.disallowed?.pre ?? fixtures.awarded_scored?.pre;
  if (pre) fixedDate(() => {
    for (let seed = 1700; seed < 3700 && !(fixtures.lastminute && fixtures.two); seed++) {
      const stop = withCmVarSeed(seed, () => cm.playNextEntry(pre, { varReviews: true }));
      if (stop.kind !== 'halftime') continue;
      const feed = cm.liveFeed(stop.state.live).filter(e => e.kind === 'var' && e.review).sort((a, b) => a.minute - b.minute || (a.plus ?? 0) - (b.plus ?? 0));
      const late = feed.find(e => e.minute >= 45 || e.plus);
      if (late && !fixtures.lastminute) fixtures.lastminute = { pre, seed, paused: stop.state, event: late };
      if (feed.length >= 2 && !fixtures.two) fixtures.two = { pre, seed, paused: stop.state, event: feed[0], second: feed[1] };
    }
  });
  for (const kind of ['lastminute', 'two']) {
    const f = fixtures[kind];
    report.fixtures[kind] = f ? { seed: f.seed, minute: f.event.minute, plus: f.event.plus ?? 0, side: f.event.side, review: f.event.review, second: f.second ? { minute: f.second.minute, plus: f.second.plus ?? 0, side: f.second.side, review: f.second.review } : undefined } : { error: 'not found in seeds 1700 to 3699' };
    console.log(`FIXTURE ${kind}: ${f ? `seed ${f.seed}, ${f.event.minute}'${f.event.plus ? '+' + f.event.plus : ''} ${f.event.review.decision}${f.second ? `, then ${f.second.minute}' ${f.second.review.decision}` : ''}` : 'NOT FOUND'}`);
  }
}
save();

const PROFILES =[{ name: '390', width: 390, height: 844, touch: true }, { name: '1280', width: 1280, height: 900, touch: false }];
const browser = await pw.chromium.launch({ headless: true });

async function open(profile, motion, pre, seed) {
  const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, isMobile: profile.touch, hasTouch: profile.touch,
    colorScheme: 'dark', reducedMotion: motion, serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: BASE,
      localStorage: [{ name: KEY, value: JSON.stringify(pre) }, { name: 'cookie-consent', value: 'essential' }, { name: 'dukb-theme', value: 'dark' }] }] } });
  const outside = [];
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === BASE) return route.continue();
    outside.push(url.hostname);
    if (/supabase\.co$/.test(url.hostname)) return route.abort();
    return route.fulfill({ status: 200, contentType: request.resourceType() === 'stylesheet' ? 'text/css' : 'application/json', body: request.resourceType() === 'stylesheet' ? '' : '[]' });
  });
  await context.routeWebSocket('**/*', socket => socket.close());
  const page = await context.newPage(); page.setDefaultTimeout(20000);
  await page.addInitScript(({ now, seed, second, finish, key }) => {
    const OldDate = Date; window.Date = class extends OldDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
    const seedRandom = s => { let a = s >>> 0; Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
    window.__varLog = [];
    new MutationObserver(() => {
      const el = document.querySelector('[data-cm-var]'); const s = el ? `${el.dataset.cmVar}:${el.dataset.cmVarId}` : 'none'; const last = window.__varLog.at(-1);
      if ((!last && s !== 'none') || (last && last.s !== s)) window.__varLog.push({ s, t: Math.round(performance.now()), y: Math.round(window.scrollY), minute: document.querySelector('[data-cm-live-stage]')?.dataset.cmLiveMinute ?? null, text: el ? el.innerText.replace(/\n/g, ' | ') : '' });
    }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-cm-var'] });
    document.addEventListener('click', event => {
      const button = event.target.closest?.('button'); if (!button) return;
      if (button.matches('[data-cm-way="live"], [data-cm-way="quick"]')) { if (!(button.matches('[data-cm-way="live"]') && JSON.parse(localStorage.getItem(key) || 'null')?.live)) seedRandom(seed); }
      if (button.textContent.trim() === 'Second half') seedRandom(second);
      if (button.textContent.trim() === 'Skip' && document.querySelector('[data-cm-live-stage="second"]')) seedRandom(finish);
    }, true);
  }, { now: NOW, seed, second: SECOND_SEED, finish: FINISH_SEED, key: KEY });
  const errors = [];
  page.on('pageerror', error => errors.push(String(error))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
  const activate = async button => { if (profile.touch) await button.tap(); else { await button.focus(); await button.press('Enter'); } };
  const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  const score = () => page.locator('[data-cm-live-stagebox] [data-cm-score-of]').evaluateAll(els => Object.fromEntries(els.map(el => [el.dataset.cmScoreOf, Number(el.textContent)])));
  const stage = async name => { await page.locator(`[data-cm-live-stage="${name}"]`).waitFor({ state: 'attached' }); await page.locator('[data-cm-live-stagebox]').waitFor({ state: 'visible' }); };
  const where = () => page.evaluate(() => { const box = document.querySelector('[data-cm-live-stagebox]')?.getBoundingClientRect(); return { scrollY: Math.round(window.scrollY), top: box ? Math.round(box.top) : null, height: box ? Math.round(box.height) : null, docWidth: document.documentElement.scrollWidth }; });
  const shot = async name => { await page.screenshot({ path: path.join(OUT, `${name}.jpg`), type: 'jpeg', quality: 60 }); return `${name}.jpg`; };
  return { context, page, errors, outside, activate, saved, score, stage, where, shot };
}
const toHub = async w => { await w.page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded' }); await w.activate(w.page.locator('[data-testid="cm-slot-1"]').getByRole('button', { name: 'Resume Career', exact: true })); await w.page.locator('[data-cm-way="live"]').waitFor(); };

async function finishMatch(w, row, id, cm, before, compare) {
  if (!(await w.page.locator('[data-cm-live-stage="interval"]').count())) {
    const skip = w.page.locator('[data-cm-live-controls]').getByRole('button', { name: 'Skip', exact: true });
    if (await skip.count()) await w.activate(skip).catch(() => row.notes.push('Skip could not be pressed before the interval'));
    await w.page.locator('[data-cm-live-stage="interval"]').waitFor({ timeout: 30000 });
  }
  row.intervalScore = await w.score();
  await w.activate(w.page.getByRole('button', { name: 'Second half', exact: true }));
  await w.stage('second');
  const beforeFinish = await w.saved();
  const expected = fixedDate(() => withCmVarSeed(FINISH_SEED, () => cm.resumeMatch(beforeFinish)));
  await w.activate(w.page.locator('[data-cm-live-controls]').getByRole('button', { name: 'Skip', exact: true }));
  await w.page.waitForFunction(({ key, week }) => JSON.parse(localStorage.getItem(key)).week === week, { key: KEY, week: before.week + 1 }, { timeout: 30000 });
  await w.stage('done');
  const after = await w.saved();
  if (compare) row.settledAsEngine = JSON.stringify(after) === JSON.stringify(clone(cm.trimCareer(expected.state)));
  row.result = after.resultLog.at(-1)?.score ?? null;
  row.engineResult = expected.state.resultLog.at(-1)?.score ?? null;
  row.shots.push(await w.shot(`${id}-8-full-time`));
  await w.activate(w.page.locator('[data-cm-live-controls]').getByRole('button', { name: 'Full report', exact: true }));
  await w.page.locator('[data-cm-timeline]').waitFor();
  row.timeline = await w.page.locator('[data-cm-tl="var"]').evaluateAll(els => els.map(el => { const t = el.querySelector('[title]'); const b = el.getBoundingClientRect(); return { clock: el.dataset.cmTlClock, side: el.dataset.cmTlSide, title: t?.getAttribute('title') ?? '', shown: (t ?? el).textContent, cut: t ? t.scrollWidth > t.clientWidth + 1 : null, rowWidth: Math.round(b.width), textWidth: t ? [t.clientWidth, t.scrollWidth] : null }; }));
  const first = w.page.locator('[data-cm-tl="var"]').first();
  if (await first.count()) { await first.scrollIntoViewIfNeeded(); row.shots.push(await w.shot(`${id}-9-report-timeline`)); }
  row.docWidthReport = (await w.where()).docWidth;
}

async function runCase(profile, motion, kind, variant) {
  const f = fixtures[kind]; if (!f) return;
  const id = `${profile.name}-${motion === 'reduce' ? 'reduced' : 'motion'}-${kind}-${variant}`;
  const row = { id, kind, variant, seed: f.seed, shots: [], notes: [] }; report.cases.push(row);
  const started = Date.now();
  const w = await open(profile, motion, f.pre, f.seed);
  try {
    await toHub(w);
    const before = await w.saved();
    const cm = await import(`${pathToFileURL(bundle).href}?case=${id}`);
    const half = fixedDate(() => withCmVarSeed(f.seed, () => cm.playNextEntry(before, { varReviews: true })));
    const live = half.state.live, incident = live.h1Play.find(e => e.review?.id === f.event.review.id);
    row.engine = { lit: live.varReviews === true, incident: incident ? { minute: incident.minute, who: incident.who, decision: incident.review.decision } : null, half: [live.myGoals, live.oppGoals], reviewsInHalf: live.h1Play.filter(e => e.kind === 'var').length };
    row.prior = { me: live.h1My.filter(g => g.minute < f.event.minute).length, opp: live.h1Opp.filter(g => g.minute < f.event.minute).length };
    await w.activate(w.page.locator('[data-cm-way="live"]'));
    await w.stage('first');
    row.savedLit = (await w.saved()).live?.varReviews === true;
    await w.activate(w.page.locator('[data-cm-live-controls]').getByRole('button', { name: '4x', exact: true }));
    row.whereBefore = await w.where();
    await w.page.waitForFunction(rid => { const el = document.querySelector('[data-cm-var]'); return el?.dataset.cmVarId === rid; }, f.event.review.id, { timeout: 120000 });
    const card = w.page.locator('[data-cm-var]');
    row.card = await card.evaluate(el => { const b = el.getBoundingClientRect(); return { state: el.dataset.cmVar, text: el.innerText.replace(/\n/g, ' | '), x: Math.round(b.x), right: Math.round(b.right), top: Math.round(b.top), bottom: Math.round(b.bottom), vw: innerWidth, animations: el.getAnimations({ subtree: true }).length, transition: getComputedStyle(el).transitionDuration, animationName: getComputedStyle(el).animationName, fonts: [...el.querySelectorAll('p')].map(p => parseFloat(getComputedStyle(p).fontSize)) }; });
    row.whereChecking = await w.where(); row.scoreChecking = await w.score();
    row.shots.push(await w.shot(`${id}-1-checking`));
    if (variant === 'plain') {
      await w.page.locator('[data-cm-var="decided"]').waitFor();
      row.decided = { text: (await card.innerText()).replace(/\n/g, ' | '), decision: await card.getAttribute('data-cm-var-decision'), score: await w.score() };
      row.whereDecided = await w.where();
      row.shots.push(await w.shot(`${id}-2-decided`));
      await card.waitFor({ state: 'hidden' });
      row.whereAfter = await w.where();
      if (f.event.minute < 44 && !f.event.plus) await w.page.waitForFunction(m => Number(document.querySelector('[data-cm-live-stage]')?.dataset.cmLiveMinute) >= m, f.event.minute + 1, { timeout: 30000 }).catch(() => row.notes.push('the clock did not pass the review minute in 30 s'));
      else await w.page.waitForTimeout(2500);
      row.stageAfter = await w.page.locator('[data-cm-live-stage]').evaluate(el => ({ stage: el.dataset.cmLiveStage, minute: el.dataset.cmLiveMinute }));
      row.scoreAfter = await w.score();
      row.shots.push(await w.shot(`${id}-3-after`));
      if (f.second) {
        row.secondSeen = await w.page.waitForFunction(rid => document.querySelector('[data-cm-var]')?.dataset.cmVarId === rid, f.second.review.id, { timeout: 90000 }).then(() => true).catch(() => false);
        if (row.secondSeen) { row.shots.push(await w.shot(`${id}-5-second-review`)); await card.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => row.notes.push('the second review card did not close')); row.scoreAfterSecond = await w.score(); }
      }
      if (kind === 'disallowed' && motion === 'no-preference') {
        await w.activate(w.page.getByRole('button', { name: 'How watching a match works' }));
        await w.page.waitForTimeout(500);
        row.helpText = await w.page.evaluate(() => [...document.querySelectorAll('li, p')].map(el => el.textContent).filter(t => /VAR/.test(t)).slice(0, 4));
        row.shots.push(await w.shot(`${id}-4-help`));
        await w.activate(w.page.getByRole('button', { name: 'How watching a match works' }));
      }
    } else if (variant === 'leave') {
      const during = await w.saved();
      row.savedMinuteDuring = during.live?.liveMinute ?? during.live?.minute ?? null;
      await w.page.reload({ waitUntil: 'domcontentloaded' });
      await w.activate(w.page.locator('[data-testid="cm-slot-1"]').getByRole('button', { name: 'Resume Career', exact: true }));
      const resume = w.page.getByRole('button', { name: 'Resume match', exact: true });
      await resume.waitFor();
      row.shots.push(await w.shot(`${id}-2-back-at-the-club`));
      await w.activate(resume);
      await w.stage('first');
      row.returned = { minute: await w.page.locator('[data-cm-live-stage]').getAttribute('data-cm-live-minute'), score: await w.score() };
      row.reviewShownAgain = await w.page.waitForFunction(() => !!document.querySelector('[data-cm-var]'), null, { timeout: 9000 }).then(() => true).catch(() => false);
      row.shots.push(await w.shot(`${id}-3-returned`));
      if (row.reviewShownAgain) await card.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => row.notes.push('the review card did not close in 15 s after coming back'));
      row.scoreAfterReturn = await w.score();
    } else if (variant === 'skip') {
      await w.activate(w.page.locator('[data-cm-live-controls]').getByRole('button', { name: 'Skip', exact: true }));
      row.reachedInterval = await w.page.locator('[data-cm-live-stage="interval"]').waitFor({ timeout: 20000 }).then(() => true).catch(() => false);
      row.cardRightAfterSkip = await card.count();
      await w.page.waitForTimeout(700);
      row.cardLater = await card.count();
      row.shots.push(await w.shot(`${id}-2-after-skip`));
    }
    await finishMatch(w, row, id, cm, before, variant !== 'leave');
    row.varLog = await w.page.evaluate(() => window.__varLog);
  } catch (error) { row.error = String(error.stack || error).slice(0, 900); await w.page.screenshot({ path: path.join(OUT, `${id}-FAILURE.jpg`), type: 'jpeg', quality: 60 }).catch(() => {}); row.shots.push(`${id}-FAILURE.jpg`); row.varLog = await w.page.evaluate(() => window.__varLog).catch(() => null); }
  finally { row.errors = w.errors.slice(0, 6); row.outside = [...new Set(w.outside)]; row.seconds = Math.round((Date.now() - started) / 1000); await w.context.close(); save(); }
  console.log(`CASE ${id}: ${row.error ? 'ERROR ' + row.error.split('\n')[0] : 'done'} | card ${row.card?.state ?? '-'} "${row.card?.text ?? ''}" | decided "${row.decided?.text ?? ''}" | scores prior ${JSON.stringify(row.prior)} checking ${JSON.stringify(row.scoreChecking)} after ${JSON.stringify(row.scoreAfter ?? row.scoreAfterReturn ?? row.intervalScore)} | half ${JSON.stringify(row.engine?.half)} interval ${JSON.stringify(row.intervalScore)} | result ${row.result} engine ${row.engineResult} same save ${row.settledAsEngine} | ${row.seconds}s`);
}

async function hubHelp(profile) {
  const f = fixtures.disallowed ?? Object.values(fixtures)[0]; if (!f) return;
  const id = `${profile.name}-hub-help`; const row = { id, shots: [] }; report.help.push(row);
  const w = await open(profile, 'no-preference', f.pre, f.seed);
  try {
    await toHub(w);
    row.shots.push(await w.shot(`${id}-0-hub`));
    await w.activate(w.page.getByRole('button', { name: 'How to play' }).first());
    const para = w.page.locator('p', { hasText: 'VAR, where real football uses it' }).first();
    await para.waitFor({ timeout: 10000 });
    row.text = await para.innerText();
    await para.scrollIntoViewIfNeeded();
    row.box = await para.evaluate(el => { const b = el.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height), x: Math.round(b.x), right: Math.round(b.right), vw: innerWidth, vh: innerHeight, docWidth: document.documentElement.scrollWidth }; });
    row.shots.push(await w.shot(`${id}-1-var-paragraph`));
  } catch (error) { row.error = String(error.stack || error).slice(0, 600); await w.page.screenshot({ path: path.join(OUT, `${id}-FAILURE.jpg`), type: 'jpeg', quality: 55 }).catch(() => {}); }
  finally { row.errors = w.errors.slice(0, 6); await w.context.close(); save(); }
  console.log(`HELP ${id}: ${row.error ? 'ERROR ' + row.error.split('\n')[0] : 'done'} | ${row.box ? JSON.stringify(row.box) : ''} | ${(row.text ?? '').slice(0, 200)}`);
}

const T0 = Date.now(), within = () => Date.now() - T0 < 28 * 60 * 1000;
try {
  for (const profile of PROFILES) await hubHelp(profile);
  for (const profile of PROFILES) for (const motion of ['no-preference', 'reduce']) for (const kind of ['disallowed', 'awarded_scored', 'awarded_missed']) if (within()) await runCase(profile, motion, kind, 'plain');
  for (const profile of PROFILES) if (within()) await runCase(profile, 'no-preference', 'lastminute', 'plain');
  if (within()) await runCase(PROFILES[0], 'no-preference', 'two', 'plain');
  for (const variant of ['leave', 'skip']) for (const profile of PROFILES) for (const kind of ['disallowed', 'awarded_scored']) if (within()) await runCase(profile, 'no-preference', kind, variant);
} finally { await browser.close(); save(); }
const errors = report.cases.filter(c => c.error).length + report.help.filter(c => c.error).length;
console.log(`r1218walk: ${report.cases.length} cases and ${report.help.length} help views, ${errors} with an error, ${Object.values(report.fixtures).filter(f => !f.error).length} of 3 fixtures found.`);
process.exit(0);
