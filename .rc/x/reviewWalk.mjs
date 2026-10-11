// Round 1303 review (run lens), never committed. A player's live match in a real browser, on whatever build is
// served: DARK (as it ships: no review may ever show, and a goal a review WOULD rule out counts) or STAGED
// (node scripts/qa/cmVarLit.mjs on goal: the card, the score staying, both halves). Walks what the builder's
// walk did not: the OTHER side's goal ruled out in a first half, and a goal of mine ruled out in a SECOND half.
// Run from the repo root on a runner: node .rc/x/reviewWalk.mjs   (BASE = a served build, or it serves dist itself)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const at = p => pathToFileURL(path.join(ROOT, p)).href;
const { seeded } = await import(at('scripts/lib/cmVarFleet.mjs'));
const { cmVarLiveState, cmVarStagedKinds } = await import(at('scripts/qa/cmVarLit.mjs'));
const KINDS = cmVarLiveState() === 'on' ? cmVarStagedKinds() : [];
const LIT = KINDS.length > 0;
console.log(`reviewWalk: the checkout is ${LIT ? `STAGED, the build plays ${KINDS.join(' and ')}` : 'DARK (as it ships)'}.`);
const OUT = path.resolve(process.env.RC_OUT || path.join(ROOT, '.tmp-fx/review-walk-out'));
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'dukb-club-manager-save', NOW = 1791547200000;
const clone = v => JSON.parse(JSON.stringify(v));
function fixedDate(fn) {
  const OriginalDate = Date;
  globalThis.Date = class extends OriginalDate { constructor(...args) { super(...(args.length ? args : [NOW])); } static now() { return NOW; } };
  try { return fn(); } finally { globalThis.Date = OriginalDate; }
}
const eng = (seed, fn) => fixedDate(() => seeded(seed, fn));
const memory = new Map();
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k) };
const bundle = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'r1303-review-walk-')), 'engine.mjs');
await build({ entryPoints: [path.join(ROOT, 'src/lib/clubManager.ts')], bundle: true, platform: 'node', format: 'esm', outfile: bundle, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error' });
const cm = await import(pathToFileURL(bundle).href);

const place = e => e.minute + (e.plus ?? 0);
const isChance = e => e.kind === 'goal' || e.kind === 'shot' || e.kind === 'save';
const reviewsOf = feed => feed.filter(e => e.kind === 'var' && e.review);
/** One goal ruled out, on the side asked for, between two minutes, with nothing else within two minutes of it. */
function lone(feed, side, from, to) {
  const all = reviewsOf(feed).filter(v => v.minute >= from - 6 && v.minute <= to + 30);
  const v = reviewsOf(feed).find(r => r.review.incident === 'goal' && r.review.decision === 'disallowed' && r.side === side && r.minute >= from && r.minute <= to && !r.plus);
  if (!v || all.length !== 1) return null;
  return feed.some(e => e !== v && isChance(e) && Math.abs(e.minute - v.minute) <= 2) ? null : v;
}
const goalsBy = (feed, pos) => ({ me: feed.filter(e => e.kind === 'goal' && e.side === 'me' && place(e) <= pos).length, opp: feed.filter(e => e.kind === 'goal' && e.side === 'opp' && place(e) <= pos).length });
/* The career: a fresh 2026-27 Everton save, the generated fixture list (as scripts/simCmVar.mjs asks for it). */
const pre = eng(4107, () => cm.startCareer('Everton'));
delete pre.realLeagueFixtures;
let H1 = null;
for (let seed = 5000; seed < 11000 && !H1; seed++) {
  const half = eng(seed, () => cm.playNextEntry(pre, { varReviews: ['goal'] }));
  if (half.kind !== 'halftime') continue;
  const v = lone(cm.liveFeed(half.state.live), 'opp', 6, 26);
  if (v) H1 = { seed, v };
}
if (!H1) { console.log('reviewWalk: ABORT, no first half with one goal of the other side ruled out in 6,000 seeds'); process.exit(3); }
console.log(`reviewWalk: first half seed ${H1.seed}: ${H1.v.text} (${H1.v.side}) at ${H1.v.minute}', ${H1.v.review.decision}`);
if (process.env.REVIEW_WALK_SEARCH_ONLY === '1') {
  /* A dry look at the second half search too, on the engine's own half time state, then stop before any browser. */
  const stop = eng(H1.seed, () => cm.playNextEntry(pre, { varReviews: ['goal'] }));
  let found = null;
  for (let seed = 20000; seed < 32000 && !found; seed++) { const st = eng(seed, () => cm.startSecondHalf(clone(stop.state))); const v2 = st?.live ? lone(cm.liveFeed(st.live).filter(e => e.minute > 45), 'me', 48, 64) : null; if (v2) found = { seed, minute: v2.minute, who: v2.text }; }
  console.log(`reviewWalk: search only: second half ${JSON.stringify(found)}`);
  process.exit(found ? 0 : 3);
}
const pw = (await import(at('scripts/lib/playwrightLoader.mjs'))).default;

let BASE = process.env.BASE || '', server = null;
if (!BASE) {
  const port = await new Promise((resolve, reject) => { const probe = createServer(); probe.once('error', reject); probe.listen(0, '127.0.0.1', () => { const value = probe.address().port; probe.close(error => (error ? reject(error) : resolve(value))); }); });
  BASE = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('the server did not start')), 15000); server.stdout.on('data', data => { if (String(data).includes('host-like server:')) { clearTimeout(timer); resolve(); } }); server.once('exit', code => reject(new Error('the server exited ' + code))); });
}
BASE = BASE.replace(/\/$/, '');
const PROFILES = [{ name: '390', width: 390, height: 844, touch: true }, { name: '1280', width: 1280, height: 900, touch: false }];
const browser = await pw.chromium.launch({ headless: true });
const report = { lit: LIT, kinds: KINDS, h1: { seed: H1.seed, minute: H1.v.minute, who: H1.v.text }, cases: [] };
const failures = [];

async function open(profile, motion) {
  const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, isMobile: profile.touch, hasTouch: profile.touch, colorScheme: 'dark', reducedMotion: motion, serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: KEY, value: JSON.stringify(pre) }, { name: 'cookie-consent', value: 'essential' }, { name: 'dukb-theme', value: 'dark' }] }] } });
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === BASE) return route.continue();
    if (/supabase\.co$/.test(url.hostname)) return route.abort();
    return route.fulfill({ status: 200, contentType: request.resourceType() === 'stylesheet' ? 'text/css' : 'application/json', body: request.resourceType() === 'stylesheet' ? '' : '[]' });
  });
  await context.routeWebSocket('**/*', socket => socket.close());
  const page = await context.newPage(); page.setDefaultTimeout(25000);
  await page.addInitScript(({ now, h1 }) => {
    const OldDate = Date; window.Date = class extends OldDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
    const seedRandom = s => { let a = s >>> 0; Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
    window.__cards = [];
    new MutationObserver(() => { const card = document.querySelector('[data-cm-var]'); const id = card ? `${card.dataset.cmVar}:${card.dataset.cmVarId}` : null; if (id && window.__cards.at(-1) !== id && window.__cards.length < 200) window.__cards.push(id); })
      .observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-cm-var'] });
    document.addEventListener('click', event => {
      const button = event.target.closest?.('button'); if (!button) return;
      if (button.matches('[data-cm-way="live"]')) seedRandom(h1);
      if (button.textContent.trim() === 'Second half') seedRandom(window.__h2Seed ?? 7);
      if (button.textContent.trim() === 'Skip' && document.querySelector('[data-cm-live-stage="second"]')) seedRandom(4242);
    }, true);
  }, { now: NOW, h1: H1.seed });
  const errors = [];
  page.on('pageerror', error => errors.push(String(error).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR_|ERR_FAILED/.test(m.text())) errors.push(m.text().slice(0, 300)); });
  const activate = async button => { if (profile.touch) await button.tap(); else { await button.focus(); await button.press('Enter'); } };
  const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  const score = () => page.locator('[data-cm-live-stagebox] [data-cm-score-of]').evaluateAll(els => Object.fromEntries(els.map(el => [el.dataset.cmScoreOf, Number(el.textContent)])));
  const stage = async name => { await page.locator(`[data-cm-live-stage="${name}"]`).waitFor({ state: 'attached', timeout: 40000 }); };
  const wide = () => page.evaluate(() => ({ docWidth: document.documentElement.scrollWidth, vw: innerWidth }));
  const shot = async name => { await page.screenshot({ path: path.join(OUT, `${name}.jpg`), type: 'jpeg', quality: 62 }); return `${name}.jpg`; };
  const minuteAt = m => page.waitForFunction(min => Number(document.querySelector('[data-cm-live-stage]')?.dataset.cmLiveMinute ?? 0) >= min || !!document.querySelector('[data-cm-live-stage="interval"], [data-cm-live-stage="done"]'), m, { timeout: 200000 });
  return { context, page, errors, activate, saved, score, stage, wide, shot, minuteAt };
}
const toHub = async w => { await w.page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded' }); await w.activate(w.page.locator('[data-testid="cm-slot-1"]').getByRole('button', { name: 'Resume Career', exact: true })); await w.page.locator('[data-cm-way="live"]').waitFor(); };

/* ---- the second half: a goal of MINE ruled out, found on the save the page holds at the interval ---- */
async function secondHalf(w, row, check, snap, before, flat) {
  await w.activate(w.page.locator('[data-cm-live-controls]').getByRole('button', { name: 'Skip', exact: true })).catch(() => {});
  await w.page.locator('[data-cm-live-stage="interval"]').waitFor({ timeout: 60000 });
  await snap('6-interval');
  const b1 = await w.saved();
  const forSearch = LIT ? b1 : { ...b1, live: { ...b1.live, varReviews: true, varKinds: ['goal'] } };
  let H2 = null;
  for (let seed = 20000; seed < 32000 && !H2; seed++) {
    const st = eng(seed, () => cm.startSecondHalf(clone(forSearch)));
    if (!st?.live) continue;
    const feed = cm.liveFeed(st.live);
    const v2 = lone(feed.filter(e => e.minute > 45), 'me', 48, 64);
    if (v2) H2 = { seed, v: v2, feed };
  }
  check(!!H2, 'no second half with one goal of mine ruled out in 12,000 seeds (walk inconclusive)');
  if (!H2) return;
  row.h2 = { seed: H2.seed, minute: H2.v.minute, who: H2.v.text };
  await w.page.evaluate(s => { window.__h2Seed = s; }, H2.seed);
  await w.activate(w.page.getByRole('button', { name: 'Second half', exact: true }));
  await w.stage('second');
  const live2 = (await w.saved()).live;
  if (LIT) check(JSON.stringify(cm.liveFeed(live2)) === JSON.stringify(H2.feed), 'the second half the page drew is not the half the engine draws on that seed (walk inconclusive)');
  else check(!reviewsOf(cm.liveFeed(live2)).length, 'the second half of a dark build holds a review event');
  await w.activate(w.page.locator('[data-cm-live-controls]').getByRole('button', { name: '4x', exact: true })).catch(() => {});
  if (LIT) {
    await w.page.waitForFunction(rid => document.querySelector('[data-cm-var]')?.dataset.cmVarId === rid, H2.v.review.id, { timeout: 200000 });
    const card = w.page.locator('[data-cm-var]');
    row.h2ScoreUnder = await w.score();
    await snap('7-h2-checking');
    const prior = goalsBy(H2.feed, place(H2.v) - 1);
    check(row.h2ScoreUnder.me === prior.me && row.h2ScoreUnder.opp === prior.opp, `second half: the score under the card is ${JSON.stringify(row.h2ScoreUnder)}, the engine has ${JSON.stringify(prior)} before the incident`);
    await w.page.locator('[data-cm-var="decided"]').waitFor({ timeout: 30000 });
    row.h2Decided = flat(await card.innerText());
    await snap('8-h2-decided');
    check(row.h2Decided.includes('VAR: goal ruled out') && row.h2Decided.includes(H2.v.text), `second half: the decision reads: ${row.h2Decided}`);
    await card.waitFor({ state: 'hidden', timeout: 30000 });
    await w.page.waitForTimeout(500);
    row.h2ScoreAfter = await w.score();
    const after = goalsBy(H2.feed, place(H2.v));
    check(row.h2ScoreAfter.me === after.me && row.h2ScoreAfter.opp === after.opp, `second half: after the review the score is ${JSON.stringify(row.h2ScoreAfter)}, the engine has ${JSON.stringify(after)}`);
    await snap('9-h2-after');
  } else {
    await w.minuteAt(H2.v.minute + 2);
    row.h2ScoreAfter = await w.score();
    await snap('7-h2-goal-counts');
  }
  await w.activate(w.page.locator('[data-cm-live-controls]').getByRole('button', { name: 'Skip', exact: true })).catch(() => {});
  await w.page.waitForFunction(({ key, week }) => JSON.parse(localStorage.getItem(key)).week === week, { key: KEY, week: before.week + 1 }, { timeout: 60000 });
  await w.stage('done');
  await snap('10-full-time');
  await w.activate(w.page.locator('[data-cm-live-controls]').getByRole('button', { name: 'Full report', exact: true }));
  await w.page.locator('[data-cm-timeline]').waitFor();
  const rows = await w.page.locator('[data-cm-tl="var"]').evaluateAll(els => els.map(el => ({ clock: el.dataset.cmTlClock, side: el.dataset.cmTlSide, shown: el.textContent.trim().slice(0, 120) })));
  row.timeline = rows;
  if (LIT) check(rows.length === 2 && rows.every(r => r.shown.includes('VAR')), `the report does not hold the two reviews: ${JSON.stringify(rows)}`);
  else check(rows.length === 0, `the report of a dark build holds review rows: ${JSON.stringify(rows)}`);
  await w.page.locator(LIT ? '[data-cm-tl="var"]' : '[data-cm-timeline]').first().scrollIntoViewIfNeeded();
  await snap('11-report');
}

/* ---- How to Play on the hub ---- */
async function runHelp(profile) {
  const id = `${profile.name}-howto`, tag = LIT ? 'lit' : 'dark';
  const row = { id, shots: [], fail: [] }; report.cases.push(row);
  const w = await open(profile, 'no-preference');
  try {
    await toHub(w);
    await w.activate(w.page.getByRole('button', { name: 'How to play' }).first());
    await w.page.waitForTimeout(800);
    const block = w.page.locator('[data-cm-help="var"]');
    const n = await block.count();
    row.blocks = n;
    if (LIT) {
      if (n < 1) row.fail.push('a staged build shows no VAR block in How to Play');
      else { await block.first().scrollIntoViewIfNeeded(); row.text = (await block.first().innerText()).split('\n').filter(Boolean).join(' | '); if (!row.text.includes('This game reviews goals only')) row.fail.push('the VAR block does not say goals only'); for (const never of ['can become a penalty', 'a penalty given about once', 'a penalty a review gave', 'Serie A 2017', '2023/24', '2023-24']) if (row.text.includes(never)) row.fail.push(`the VAR block says "${never}"`); }
    } else {
      if (n !== 0) row.fail.push('a dark build shows the VAR block in How to Play');
      const all = await w.page.evaluate(() => document.body.innerText);
      row.varWords = ['VAR', 'video review'].filter(s => all.includes(s));
      if (row.varWords.length) row.fail.push(`How to Play of a dark build says ${row.varWords.join(' and ')}`);
    }
    row.shots.push(await w.shot(`${tag}-${id}-1`));
    const s = await w.wide(); if (s.docWidth > s.vw + 1) row.fail.push(`How to Play scrolls sideways: ${JSON.stringify(s)}`);
    if (w.errors.length) row.fail.push(`page errors: ${w.errors.slice(0, 3).join(' || ')}`);
  } catch (error) { row.fail.push(`the walk stopped: ${String(error.stack || error).slice(0, 400)}`); }
  finally { await w.context.close(); }
  for (const message of row.fail) failures.push(`${id}: ${message}`);
  console.log(`HELP ${id}: ${row.fail.length ? `FAILED ${row.fail[0].slice(0, 240)}` : 'ok'} | blocks ${row.blocks} | ${(row.text ?? '').slice(0, 900)}`);
}

/* ---- one match, both halves ---- */
async function runMatch(profile, motion) {
  const id = `${profile.name}-${motion === 'reduce' ? 'reduced' : 'motion'}`;
  const tag = LIT ? 'lit' : 'dark';
  const row = { id, shots: [], fail: [], notes: [] }; report.cases.push(row);
  const check = (ok, message) => { if (!ok) row.fail.push(message); };
  const w = await open(profile, motion);
  const snap = async name => { row.shots.push(await w.shot(`${tag}-${id}-${name}`)); const s = await w.wide(); check(s.docWidth <= s.vw + 1, `the page scrolls sideways at ${name}: ${JSON.stringify(s)}`); };
  const flat = text => text.split('\n').filter(Boolean).join(' | ');
  try {
    await toHub(w);
    await snap('1-hub');
    const before = await w.saved();
    const asked = eng(H1.seed, () => cm.playNextEntry(clone(before), { varReviews: ['goal'] }));
    const plain = eng(H1.seed, () => cm.playNextEntry(clone(before), {}));
    const litFeed = cm.liveFeed(asked.state.live), plainFeed = cm.liveFeed(plain.state.live);
    const v = reviewsOf(litFeed).find(e => e.review.id === H1.v.review.id);
    check(!!v, 'the engine does not draw the first half fixture from the save the page holds (walk inconclusive)');
    await w.activate(w.page.locator('[data-cm-way="live"]'));
    await w.stage('first');
    const live = (await w.saved()).live;
    const want = LIT ? asked.state.live : plain.state.live;
    check(JSON.stringify(live?.h1Play) === JSON.stringify(want.h1Play), 'the first half the page saved is not the half the engine plays for what this build asks');
    if (LIT) { check(live?.varReviews === true, 'no review opt in on the saved match of a staged build'); check(JSON.stringify(live?.varKinds) === JSON.stringify(KINDS), `the saved match holds varKinds ${JSON.stringify(live?.varKinds)}`); }
    else { check(!('varReviews' in (live ?? {})) && !('varKinds' in (live ?? {})), 'the saved match of a dark build holds a review key'); check(!reviewsOf(plainFeed).length, 'the dark half holds a review event'); }
    await w.activate(w.page.locator('[data-cm-live-controls]').getByRole('button', { name: '4x', exact: true }));
    if (motion === 'no-preference') {
      await w.activate(w.page.getByRole('button', { name: 'How watching a match works' }));
      const help = w.page.locator('[data-cm-live-help]'); await help.waitFor();
      row.matchHelp = flat(await help.innerText()).slice(0, 1700);
      if (LIT) { check(row.matchHelp.includes('VAR here reviews goals only'), 'the match help does not say goals only'); check(!['penalty a review', 'can become a penalty', 'gives a penalty'].some(s => row.matchHelp.includes(s)), 'the match help tells of a penalty by review'); }
      else check(!row.matchHelp.includes('VAR') && !row.matchHelp.toLowerCase().includes('review'), 'the match help of a dark build speaks of VAR or a review');
      await snap('2-match-help');
      await w.activate(help.locator('button').first());
      await help.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => row.notes.push('the match help did not close on its first button'));
    }
    if (v && LIT) {
      await w.page.waitForFunction(rid => document.querySelector('[data-cm-var]')?.dataset.cmVarId === rid, v.review.id, { timeout: 200000 });
      const card = w.page.locator('[data-cm-var]');
      const box = await card.evaluate(el => { const b = el.getBoundingClientRect(); return { x: Math.round(b.x), right: Math.round(b.right), top: Math.round(b.top), bottom: Math.round(b.bottom), vw: innerWidth, vh: innerHeight }; });
      row.h1Card = box; row.h1ScoreUnder = await w.score();
      await snap('3-h1-checking');
      check(box.x >= 0 && box.right <= box.vw && box.top >= 0 && box.bottom <= box.vh, `the card is not whole on the screen: ${JSON.stringify(box)}`);
      const prior = goalsBy(litFeed, place(v) - 1);
      check(row.h1ScoreUnder.me === prior.me && row.h1ScoreUnder.opp === prior.opp, `the score under the card is ${JSON.stringify(row.h1ScoreUnder)}, the engine has ${JSON.stringify(prior)} before the incident`);
      await w.page.locator('[data-cm-var="decided"]').waitFor({ timeout: 30000 });
      row.h1Decided = flat(await card.innerText());
      await snap('4-h1-decided');
      check(row.h1Decided.includes('VAR: goal ruled out') && row.h1Decided.includes(v.text), `the decision reads: ${row.h1Decided}`);
      await card.waitFor({ state: 'hidden', timeout: 30000 });
      await w.page.waitForTimeout(500);
      row.h1ScoreAfter = await w.score();
      const after = goalsBy(litFeed, place(v));
      check(row.h1ScoreAfter.opp === after.opp && row.h1ScoreAfter.me === after.me, `after the review the score is ${JSON.stringify(row.h1ScoreAfter)}, the engine has ${JSON.stringify(after)}`);
      await snap('5-h1-after');
    } else if (v) {
      await w.minuteAt(v.minute + 2);
      row.h1ScoreAfter = await w.score();
      const counted = goalsBy(plainFeed, v.minute + 1), ruled = goalsBy(litFeed, v.minute + 1);
      row.notes.push(`dark: at ${v.minute + 2}' the page shows ${JSON.stringify(row.h1ScoreAfter)}; the engine without reviews has ${JSON.stringify(counted)} by ${v.minute + 1}', with the goal kind it would have ${JSON.stringify(ruled)}`);
      check(counted.opp === ruled.opp + 1, 'the fixture is not one a review would take a goal of the other side out of (walk inconclusive)');
      check(row.h1ScoreAfter.opp >= counted.opp, `the goal a review would rule out does not count on a dark build: ${JSON.stringify(row.h1ScoreAfter)}`);
      await snap('3-h1-goal-counts');
    }
    await secondHalf(w, row, check, snap, before, flat);
    row.cards = await w.page.evaluate(() => window.__cards);
    if (!LIT) check(row.cards.length === 0, `a review card was drawn on a dark build: ${JSON.stringify(row.cards)}`);
    check(w.errors.length === 0, `page errors: ${w.errors.slice(0, 3).join(' || ')}`);
  } catch (error) { row.fail.push(`the walk stopped: ${String(error.stack || error).slice(0, 500)}`); await w.page.screenshot({ path: path.join(OUT, `${tag}-${id}-FAILURE.jpg`), type: 'jpeg', quality: 55 }).catch(() => {}); }
  finally { await w.context.close(); fs.writeFileSync(path.join(OUT, `review-walk-${tag}.json`), JSON.stringify(report, null, 1)); }
  for (const message of row.fail) failures.push(`${id}: ${message}`);
  console.log(`CASE ${id}: ${row.fail.length ? `FAILED (${row.fail.length}) ${row.fail[0].slice(0, 260)}` : 'ok'} | h1 ${JSON.stringify(row.h1Decided ?? row.h1ScoreAfter ?? null)} | h2 ${JSON.stringify(row.h2 ?? null)} ${JSON.stringify(row.h2Decided ?? row.h2ScoreAfter ?? null)} | cards ${JSON.stringify(row.cards ?? null)}`);
}

/* ---- main ---- */
for (const profile of PROFILES) await runHelp(profile);
for (const profile of PROFILES) for (const motion of ['no-preference', 'reduce']) await runMatch(profile, motion);
await browser.close();
if (server) server.kill();
fs.writeFileSync(path.join(OUT, `review-walk-${LIT ? 'lit' : 'dark'}.json`), JSON.stringify(report, null, 1));
for (const f of failures) console.log(`FAIL ${f.slice(0, 400)}`);
console.log(`reviewWalk (${LIT ? 'staged ' + KINDS.join(' and ') : 'dark'}): ${report.cases.length} cases, ${failures.length} failed assertion(s). ${failures.length ? 'RED' : 'green'}.`);
process.exit(failures.length ? 1 : 0);
