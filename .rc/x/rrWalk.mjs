/* Round 1302 review (run lens): the reviewer's own walk. Never committed: sent to a runner as .rc/x/rrWalk.mjs.
 * RR_MODE=dark plays what ships (the switch off): no save, the help, a whole match, the report: no review anywhere.
 * RR_MODE=lit plays the reviewer's own halves on a build with the switch on in the runner's checkout:
 *   two late ruled out goals in crowded halves (league match 2, seeds 2219 and 2379), the plain ruled out goal
 *   with reduced motion, the How to Play paragraph and the match's own help. 390x844 (touch) and 1280x900.
 * The database host is aborted; every other foreign host is answered empty. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const MODE = process.env.RR_MODE === 'lit' ? 'lit' : 'dark';
const OUT = path.resolve(process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'rr-walk-out'));
fs.mkdirSync(OUT, { recursive: true });
const pw = (await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href)).default;
const { cmVarLiveState } = await import(pathToFileURL(path.join(ROOT, 'scripts/qa/cmVarLit.mjs')).href);
const state = cmVarLiveState();
console.log(`rrWalk: mode ${MODE}, the switch in this checkout is ${state}`);
if ((MODE === 'lit') !== (state === 'on')) { console.log('rrWalk: ABORT, the build does not match the mode'); process.exit(7); }

const KEY = 'dukb-club-manager-save', NOW = 1791547200000, SECOND_SEED = 5312, FINISH_SEED = 5313;
function fixedDate(fn) {
  const Old = Date;
  globalThis.Date = class extends Old { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
  try { return fn(); } finally { globalThis.Date = Old; }
}
const realRandom = Math.random;
function seeded(seed, fn) {
  let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = realRandom; }
}
const memory = new Map();
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k) };
const bundle = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rr-walk-')), 'engine.mjs');
await build({ entryPoints: [path.join(ROOT, 'src/lib/clubManager.ts')], bundle: true, platform: 'node', format: 'esm', outfile: bundle, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error' });
const cm = await import(pathToFileURL(bundle).href);
const place = e => e.minute + (e.plus ?? 0);
const isChance = e => e.kind === 'goal' || e.kind === 'shot' || e.kind === 'save';
const reviewsOf = feed => feed.filter(e => e.kind === 'var' && e.review).sort((a, b) => place(a) - place(b));
const entries = [];
fixedDate(() => {
  const first = seeded(4107, () => cm.startCareer('Everton'));
  delete first.realLeagueFixtures;
  first.squad = first.squad.map(p => ({ ...p, fitness: 100, morale: 70, injuryWeeks: 0, suspendedMatches: 0 }));
  entries.push(first);
  for (let n = 0; n < 2; n++) entries.push(seeded(5000 + n, () => cm.playNextEntry(entries[n], { skipHalftime: true, noCoach: true })).state);
});

/* ---- the build, served ---- */
let BASE = process.env.RR_OWN_SERVER ? '' : (process.env.BASE || '').replace(/\/$/, ''), server = null;
if (!BASE) {
  const port = await new Promise((resolve, reject) => { const p = createServer(); p.once('error', reject); p.listen(0, '127.0.0.1', () => { const v = p.address().port; p.close(e => (e ? reject(e) : resolve(v))); }); });
  BASE = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`the server did not start: ${log}`)), 15000);
    server.once('exit', code => { clearTimeout(timer); reject(new Error(`the server exited ${code}: ${log}`)); });
    server.stdout.on('data', d => { log += d; if (String(d).includes('host-like server:')) { clearTimeout(timer); resolve(); } });
    server.stderr.on('data', d => { log += d; });
  });
}
const PROFILES = [{ name: '390', width: 390, height: 844, touch: true }, { name: '1280', width: 1280, height: 900, touch: false }];
const browser = await pw.chromium.launch({ headless: true });
const report = { mode: MODE, rows: [] }, problems = [];
const save = () => fs.writeFileSync(path.join(OUT, `rr-walk-${MODE}.json`), JSON.stringify(report, null, 1));

async function open(profile, motion, pre, seed) {
  const storage = [{ name: 'cookie-consent', value: 'essential' }, { name: 'dukb-theme', value: 'dark' }];
  if (pre) storage.push({ name: KEY, value: JSON.stringify(pre) });
  const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, isMobile: profile.touch, hasTouch: profile.touch,
    colorScheme: 'dark', reducedMotion: motion, serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: BASE, localStorage: storage }] } });
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === BASE) return route.continue();
    if (/supabase\.co$/.test(url.hostname)) return route.abort();
    return route.fulfill({ status: 200, contentType: request.resourceType() === 'stylesheet' ? 'text/css' : 'application/json', body: request.resourceType() === 'stylesheet' ? '' : '[]' });
  });
  await context.routeWebSocket('**/*', socket => socket.close());
  const page = await context.newPage(); page.setDefaultTimeout(20000);
  await page.addInitScript(({ now, seed, second, finish, key }) => {
    const OldDate = Date; window.Date = class extends OldDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
    const seedRandom = s => { let a = s >>> 0; Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
    window.__seen = [];
    const read = () => {
      const card = document.querySelector('[data-cm-var]'), pitch = document.querySelector('[data-cm-live-pitch]'), root = document.querySelector('[data-cm-live-stage]');
      return { card: card ? `${card.dataset.cmVar}:${card.dataset.cmVarId}` : 'none', motion: pitch?.dataset.cmMotion ?? null, phase: pitch?.dataset.cmMotionPhase ?? null,
        goalText: document.querySelector('[data-cm-goal-card]')?.textContent ?? '', net: !!document.querySelector('[data-cm-net="goal"]'), stage: root?.dataset.cmLiveStage ?? null, minute: root?.dataset.cmLiveMinute ?? null,
        score: [...document.querySelectorAll('[data-cm-live-stagebox] [data-cm-score-of]')].map(el => `${el.dataset.cmScoreOf}=${el.textContent}`).join(' ') };
    };
    new MutationObserver(() => {
      const now = read(), last = window.__seen.at(-1);
      if (!last || last.card !== now.card || last.motion !== now.motion || last.phase !== now.phase || last.goalText !== now.goalText || last.score !== now.score || last.stage !== now.stage) { if (window.__seen.length < 6000) window.__seen.push({ ...now, t: Math.round(performance.now()) }); }
    }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-cm-var', 'data-cm-motion', 'data-cm-motion-phase', 'data-cm-goal-card', 'data-cm-live-stage'], characterData: true });
    document.addEventListener('click', event => {
      const button = event.target.closest?.('button'); if (!button) return;
      if (button.matches('[data-cm-way="live"], [data-cm-way="quick"]')) { if (!(button.matches('[data-cm-way="live"]') && JSON.parse(localStorage.getItem(key) || 'null')?.live)) seedRandom(seed); }
      if (button.textContent.trim() === 'Second half') seedRandom(second);
      if (button.textContent.trim() === 'Skip' && document.querySelector('[data-cm-live-stage="second"]')) seedRandom(finish);
    }, true);
  }, { now: NOW, seed, second: SECOND_SEED, finish: FINISH_SEED, key: KEY });
  const errors = [];
  page.on('pageerror', error => errors.push(String(error).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR_|ERR_FAILED/.test(m.text())) errors.push(m.text().slice(0, 300)); });
  const activate = async button => { if (profile.touch) await button.tap(); else { await button.focus(); await button.press('Enter'); } };
  const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  const stage = async name => { await page.locator(`[data-cm-live-stage="${name}"]`).waitFor({ state: 'attached' }); await page.locator('[data-cm-live-stagebox]').waitFor({ state: 'visible' }); };
  const shot = async name => { await page.screenshot({ path: path.join(OUT, `${name}.jpg`), type: 'jpeg', quality: 62 }); return `${name}.jpg`; };
  const wide = () => page.evaluate(() => ({ docWidth: document.documentElement.scrollWidth, vw: innerWidth }));
  const speed = async label => activate(page.locator('[data-cm-live-controls]').getByRole('button', { name: label, exact: true }));
  const untilMinute = (m, timeout = 90000) => page.waitForFunction(min => Number(document.querySelector('[data-cm-live-stage]')?.dataset.cmLiveMinute ?? 0) >= min || document.querySelector('[data-cm-live-stage="interval"]'), m, { timeout });
  return { context, page, errors, activate, saved, stage, shot, wide, speed, untilMinute };
}
const toHub = async w => { await w.page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded' }); await w.activate(w.page.locator('[data-testid="cm-slot-1"]').getByRole('button', { name: 'Resume Career', exact: true })); await w.page.locator('[data-cm-way="live"]').waitFor(); };
const squash = seen => { const out = []; for (const s of seen) { const k = `${s.card === 'none' ? '-' : s.card.split(':')[0]}|${s.motion}/${s.phase}|${s.goalText ? 'G:' + s.goalText.slice(0, 28) : ''}|${s.score}|${s.stage}`; if (out.at(-1) !== k) out.push(k); } return out; };

/* ---- LIT: a half the reviewer picked, played by the page from kickoff (4x to the 40th minute, then the default 2x) ---- */
async function litHalf(profile, motion, k, seed, tag, opts = {}) {
  const id = `lit-${profile.name}-${motion === 'reduce' ? 'reduced' : 'motion'}-${tag}`;
  const row = { id, seed, match: k + 1, shots: [], notes: [], bad: [] }; report.rows.push(row);
  const w = await open(profile, motion, entries[k], seed);
  try {
    await toHub(w);
    const before = await w.saved();
    const half = fixedDate(() => seeded(seed, () => cm.playNextEntry(before, { varReviews: true })));
    const live = half.state.live, feed = cm.liveFeed(live), whistle = 45 + (live.added?.h1 ?? 0);
    const v = reviewsOf(feed).at(-1);
    if (!v) throw new Error('the engine draws no review from the save the page holds on this seed');
    const club = v.side === 'me' ? before.clubName : live.opponent;
    const late = feed.filter(e => isChance(e) && place(e) >= Math.min(45, place(v) - 2));
    row.engine = { whistle, review: `${v.review.decision} ${v.side} ${cm.minuteLabel(v)} ${v.text}`, chances: late.map(e => `${e.kind}:${e.side}@${place(e)} ${e.text}`), halfScore: ['me', 'opp'].map(s => feed.filter(e => e.kind === 'goal' && e.side === s).length).join('-') };
    await w.activate(w.page.locator('[data-cm-way="live"]'));
    await w.stage('first');
    if ((await w.saved()).live?.varReviews !== true) row.bad.push('the saved match does not carry the review opt in on a lit build');
    await w.speed('4x');
    await w.untilMinute(Math.min(40, v.minute - 3));
    await w.speed('2x');
    await w.page.waitForFunction(rid => document.querySelector('[data-cm-var]')?.dataset.cmVarId === rid, v.review.id, { timeout: 90000 });
    const card = w.page.locator('[data-cm-var]');
    const box = await card.evaluate(el => { const b = el.getBoundingClientRect(); const pitch = document.querySelector('[data-cm-live-pitch]'); return { text: el.innerText.replace(/\n/g, ' | '), x: Math.round(b.x), right: Math.round(b.right), top: Math.round(b.top), bottom: Math.round(b.bottom), vw: innerWidth, vh: innerHeight, animations: el.getAnimations({ subtree: true }).length, cut: [...el.querySelectorAll('p')].some(p => p.scrollWidth > p.clientWidth + 1), motion: pitch?.dataset.cmMotion, phase: pitch?.dataset.cmMotionPhase, running: document.getAnimations().filter(a => a.playState === 'running').length }; });
    row.card = box;
    row.shots.push(await w.shot(`${id}-1-checking`));
    if (!(box.x >= 0 && box.right <= box.vw && box.top >= 0 && box.bottom <= box.vh && !box.cut)) row.bad.push(`the card is not whole on the screen: ${JSON.stringify(box)}`);
    if (!box.text.includes(`${v.text}, ${club}, ${cm.minuteLabel(v)}`)) row.bad.push(`the card does not name the man, his club and the minute: ${box.text}`);
    await w.page.locator('[data-cm-var="decided"]').waitFor();
    row.decided = (await card.innerText()).replace(/\n/g, ' | ');
    row.shots.push(await w.shot(`${id}-2-decided`));
    await card.waitFor({ state: 'hidden' });
    await w.page.waitForTimeout(350);
    row.shots.push(await w.shot(`${id}-3-after`));
    if (opts.matchHelp) {
      await w.activate(w.page.getByRole('button', { name: 'How watching a match works' }));
      const lines = w.page.locator('[data-cm-live-help]'); await lines.waitFor();
      row.matchHelp = await lines.innerText();
      row.shots.push(await w.shot(`${id}-5-match-help`));
      await w.activate(w.page.getByRole('button', { name: 'Close the help' }));
    }
    if (opts.toWhistle) {
      await w.page.locator('[data-cm-live-stage="interval"]').waitFor({ timeout: 60000 });
      row.shots.push(await w.shot(`${id}-4-whistle`));
      await w.page.waitForTimeout(2600);
      row.shots.push(await w.shot(`${id}-4b-interval`));
    }
    const seen = await w.page.evaluate(() => window.__seen);
    const mine = `:${v.review.id}`, under = seen.filter(s => s.card.endsWith(mine));
    const ruledOut = v.review.decision === 'disallowed';
    row.under = [...new Set(under.map(s => `${s.motion}/${s.phase}${s.goalText ? ' +goal card' : ''}`))];
    row.scoresUnder = [...new Set(under.map(s => s.score))];
    row.story = squash(seen.filter(s => Number(s.minute) >= Math.min(44, v.minute - 1) || s.stage === 'interval')).slice(0, 60);
    const wrong = under.filter(s => s.goalText || !(s.motion === 'pass' || (ruledOut && s.motion === 'goal' && s.phase === 'net')));
    if (wrong.length) row.bad.push(`under the review card the pitch showed ${[...new Set(wrong.map(s => `${s.motion}/${s.phase}${s.goalText ? ' with a goal card' : ''}`))].join(', ')} (the rule of the repo test: nothing but a pass or the ruled out goal in its net)`);
    if (row.scoresUnder.length > 1) row.bad.push(`the score moved under the card: ${row.scoresUnder.join(' / ')}`);
    if (opts.toWhistle) {
      for (const g of late.filter(e => e.kind === 'goal')) {
        const at = seen.findIndex(s => s.goalText.includes(g.text));
        row.notes.push(`real goal ${g.side} ${g.text} at ${place(g)}: scorer card ${at < 0 ? 'NEVER shown (to 2.6 s into the interval)' : `shown at sample ${at}, stage ${seen[at].stage}`}`);
        if (at < 0) row.bad.push(`the real goal of ${g.text} at ${place(g)} never got its scorer card`);
      }
      row.endScore = seen.at(-1)?.score;
    }
    if (motion === 'reduce') { row.notes.push(`reduced motion: ${box.animations} animation(s) on the card, ${box.running} running on the page when it opened; under the card: ${row.under.join(', ')}`); if (box.animations) row.bad.push('the card animates with reduced motion on'); }
    const fit = await w.wide(); if (fit.docWidth > fit.vw + 1) row.bad.push(`the match screen scrolls sideways: ${JSON.stringify(fit)}`);
  } catch (error) { row.bad.push(`the walk stopped: ${String(error.stack || error).slice(0, 500)}`); row.shots.push(await w.shot(`${id}-STOPPED`).catch(() => 'no shot')); }
  finally { for (const e of w.errors.slice(0, 3)) row.bad.push(`a page error: ${e}`); await w.context.close(); save(); }
  for (const b of row.bad) problems.push(`${id}: ${b}`);
  console.log(`ROW ${id}: ${row.bad.length ? 'BAD' : 'ok'} | engine ${JSON.stringify(row.engine ?? null)} | card "${row.card?.text ?? ''}" over ${row.card?.motion}/${row.card?.phase} | under ${JSON.stringify(row.under ?? [])} | ${row.notes.join(' ; ')} | ${row.bad.join(' ; ').slice(0, 500)}`);
  console.log(`STORY ${id}: ${(row.story ?? []).join('  >  ').slice(0, 1500)}`);
}

async function hubHelp(profile, pre) {
  const id = `${MODE}-${profile.name}-how-to-play`, row = { id, shots: [], notes: [], bad: [] }; report.rows.push(row);
  const w = await open(profile, 'no-preference', pre, 1);
  try {
    await toHub(w);
    await w.activate(w.page.getByRole('button', { name: 'How to play' }).first());
    await w.page.waitForTimeout(700);
    const text = await w.page.evaluate(() => document.body.innerText);
    row.mentionsVar = /\bVAR\b/.test(text);
    row.shots.push(await w.shot(`${id}-1-open`));
    if (MODE === 'dark') { if (row.mentionsVar) row.bad.push('the dark build mentions VAR in How to Play'); }
    else {
      const para = w.page.locator('p', { hasText: "VAR in today's game" }).first();
      await para.waitFor({ timeout: 10000 }); await para.scrollIntoViewIfNeeded();
      row.text = await para.innerText();
      const box = await para.evaluate(el => { const b = el.getBoundingClientRect(); return { x: Math.round(b.x), right: Math.round(b.right), height: Math.round(b.height), vw: innerWidth, vh: innerHeight, docWidth: document.documentElement.scrollWidth }; });
      row.box = box;
      if (!(box.x >= 0 && box.right <= box.vw && box.docWidth <= box.vw + 1)) row.bad.push(`the VAR paragraph does not fit the screen: ${JSON.stringify(box)}`);
      row.shots.push(await w.shot(`${id}-2-var-paragraph`));
      await para.screenshot({ path: path.join(OUT, `${id}-3-paragraph-only.jpg`), type: 'jpeg', quality: 70 }).catch(() => {});
      row.shots.push(`${id}-3-paragraph-only.jpg`);
    }
  } catch (error) { row.bad.push(`the walk stopped: ${String(error.stack || error).slice(0, 400)}`); await w.shot(`${id}-STOPPED`).catch(() => {}); }
  finally { for (const e of w.errors.slice(0, 3)) row.bad.push(`a page error: ${e}`); await w.context.close(); save(); }
  for (const b of row.bad) problems.push(`${id}: ${b}`);
  console.log(`ROW ${id}: ${row.bad.length ? 'BAD' : 'ok'} | mentions VAR: ${row.mentionsVar} | ${JSON.stringify(row.box ?? null)} | ${(row.text ?? '').slice(0, 900)} | ${row.bad.join(' ; ').slice(0, 300)}`);
}

/* ---- DARK: what ships. A visitor with no save, then a whole match the way a player plays it, and its report. ---- */
async function landing(profile) {
  const id = `dark-${profile.name}-landing`, row = { id, shots: [], notes: [], bad: [] }; report.rows.push(row);
  const w = await open(profile, 'no-preference', null, 1);
  try {
    await w.page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded' });
    await w.page.waitForTimeout(1800);
    row.shots.push(await w.shot(`${id}-1`));
    const fit = await w.wide(); if (fit.docWidth > fit.vw + 1) row.bad.push(`the page scrolls sideways: ${JSON.stringify(fit)}`);
    if (/\bVAR\b/.test(await w.page.evaluate(() => document.body.innerText))) row.bad.push('the dark landing mentions VAR');
  } catch (error) { row.bad.push(`the walk stopped: ${String(error.stack || error).slice(0, 400)}`); }
  finally { for (const e of w.errors.slice(0, 3)) row.bad.push(`a page error: ${e}`); await w.context.close(); save(); }
  for (const b of row.bad) problems.push(`${id}: ${b}`);
  console.log(`ROW ${id}: ${row.bad.length ? 'BAD ' + row.bad.join(' ; ').slice(0, 300) : 'ok'}`);
}
async function darkMatch(profile, motion, seed) {
  const id = `dark-${profile.name}-${motion === 'reduce' ? 'reduced' : 'motion'}-match-${seed}`, row = { id, seed, shots: [], notes: [], bad: [] }; report.rows.push(row);
  const w = await open(profile, motion, entries[0], seed);
  const says = async where => { if (/\bVAR\b/.test(await w.page.evaluate(() => document.body.innerText))) row.bad.push(`the dark build says VAR ${where}`); };
  try {
    await toHub(w);
    const before = await w.saved();
    const asked = fixedDate(() => seeded(seed, () => cm.playNextEntry(before, { varReviews: true })));
    row.notes.push(`asked for reviews, this seed would hold ${reviewsOf(cm.liveFeed(asked.state.live)).length} review(s) in the first half`);
    await w.activate(w.page.locator('[data-cm-way="live"]'));
    await w.stage('first');
    const live = (await w.saved()).live;
    row.optIn = live?.varReviews ?? null;
    if (live?.varReviews === true) row.bad.push('the dark build asked the engine for reviews');
    await w.speed('4x');
    await w.page.waitForTimeout(3200);
    row.shots.push(await w.shot(`${id}-1-first-half`));
    await w.page.locator('[data-cm-live-stage="interval"]').waitFor({ timeout: 90000 });
    await says('at the interval');
    row.shots.push(await w.shot(`${id}-2-interval`));
    await w.activate(w.page.getByRole('button', { name: 'Second half', exact: true }));
    await w.stage('second');
    await w.page.waitForTimeout(2600);
    row.shots.push(await w.shot(`${id}-3-second-half`));
    await w.activate(w.page.locator('[data-cm-live-controls]').getByRole('button', { name: 'Skip', exact: true }));
    await w.stage('done');
    await says('at full time');
    row.shots.push(await w.shot(`${id}-4-full-time`));
    await w.activate(w.page.locator('[data-cm-live-controls]').getByRole('button', { name: 'Full report', exact: true }));
    await w.page.locator('[data-cm-timeline]').waitFor();
    row.varRows = await w.page.locator('[data-cm-tl="var"]').count();
    if (row.varRows) row.bad.push(`the report of a dark match has ${row.varRows} review row(s)`);
    await says('in the report');
    row.shots.push(await w.shot(`${id}-5-report`));
    const seen = await w.page.evaluate(() => window.__seen);
    row.cards = seen.filter(s => s.card !== 'none').length;
    if (row.cards) row.bad.push(`a review card was on the screen ${row.cards} time(s) on a dark build`);
    const after = await w.saved(), text = JSON.stringify(after);
    row.result = after.resultLog?.at(-1)?.score ?? null;
    if (text.includes('"kind":"var"') || text.includes('"varReviews":true')) row.bad.push('the save of a dark match holds a review');
    const fit = await w.wide(); if (fit.docWidth > fit.vw + 1) row.bad.push(`the report scrolls sideways: ${JSON.stringify(fit)}`);
  } catch (error) { row.bad.push(`the walk stopped: ${String(error.stack || error).slice(0, 500)}`); row.shots.push(await w.shot(`${id}-STOPPED`).catch(() => 'no shot')); }
  finally { for (const e of w.errors.slice(0, 3)) row.bad.push(`a page error: ${e}`); await w.context.close(); save(); }
  for (const b of row.bad) problems.push(`${id}: ${b}`);
  console.log(`ROW ${id}: ${row.bad.length ? 'BAD' : 'ok'} | opt in ${row.optIn} | cards ${row.cards} | review rows ${row.varRows} | result ${row.result} | ${row.notes.join(' ; ')} | ${row.bad.join(' ; ').slice(0, 500)}`);
}

try {
  if (MODE === 'dark') {
    for (const p of PROFILES) await landing(p);
    for (const p of PROFILES) await hubHelp(p, entries[0]);
    await darkMatch(PROFILES[0], 'no-preference', 2460);
    await darkMatch(PROFILES[1], 'reduce', 2460);
    await darkMatch(PROFILES[0], 'reduce', 1735);
    await darkMatch(PROFILES[1], 'no-preference', 1735);
  } else if (process.env.RR_CASES) {
    /* RR_CASES="k:seed:tag,k:seed:tag": only these halves, each to the whistle, at both widths with motion and at 390 with reduced motion. */
    for (const spec of process.env.RR_CASES.split(',')) {
      const [k, seed, tag] = spec.split(':');
      for (const p of PROFILES) await litHalf(p, 'no-preference', Number(k), Number(seed), tag, { toWhistle: true });
      await litHalf(PROFILES[0], 'reduce', Number(k), Number(seed), tag, { toWhistle: true });
    }
  } else {
    for (const p of PROFILES) await hubHelp(p, entries[0]);
    for (const p of PROFILES) { await litHalf(p, 'no-preference', 1, 2219, 'crowded-2219', { toWhistle: true }); await litHalf(p, 'no-preference', 1, 2379, 'crowded-2379', { toWhistle: true }); }
    await litHalf(PROFILES[0], 'reduce', 0, 2460, 'plain-2460', { matchHelp: true });
    await litHalf(PROFILES[1], 'reduce', 0, 2460, 'plain-2460');
    await litHalf(PROFILES[0], 'reduce', 1, 2219, 'crowded-2219', { toWhistle: true });
  }
} finally { await browser.close(); if (server) server.kill(); save(); }
for (const line of problems.slice(0, 40)) console.log(`PROBLEM ${line.split('\n')[0].slice(0, 420)}`);
console.log(`rrWalk ${MODE}: ${report.rows.length} rows, ${problems.length} problem(s).`);
process.exit(problems.length ? 1 : 0);
