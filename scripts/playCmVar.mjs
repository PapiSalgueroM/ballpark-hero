/* The Club Manager review walk: a player's match with video reviews, on a LIT build, in a real browser.
 *
 * Round 1218 fix rewrote it. The walk Round 1181 shipped looked for a goal a review confirms and a penalty a
 * review confirms, which the rates taken from real football never produce, pinned a label that no longer
 * exists and needed a font cache only one workflow builds. This one plays what a player can meet now:
 *   a goal of mine ruled out (drawn first, then the card), a penalty a review gives that goes in, one that is
 *   saved, a goal ruled out in the minute after a real goal (the card must never sit on that goal), two reviews
 *   in one half, leaving mid review and coming back, Skip during a review, reduced motion, the report's
 *   timeline rows, the match's own help and the How to Play paragraph, at 390 (touch) and 1280.
 * The matches are REAL halves of the engine on the shipped rates: the first three league matches of a fresh
 * 2026-27 Everton career (the career scripts/simCmVar.mjs uses), found by searching seeds. A review's id holds
 * the fixture, the minute and the man, so one fixture reviews only a handful of incidents: a saved penalty and a
 * goal before a ruled out one are looked for in the second and third match. A kind that is not found FAILS.
 * Every case is ASSERTED (what the card says and where it is, the score under it, that the page did not move,
 * that the save after full time is the engine's own settlement) and photographed. Exit 0 only when every
 * assertion held. On a dark build it exits 2 and says how to light one:
 *   node scripts/qa/cmVarLit.mjs on && npm run build && CI=1 node scripts/playCmVar.mjs; s=$?; node scripts/qa/cmVarLit.mjs off; exit $s
 * It serves dist itself (scripts/lib/hostLikeServer.mjs) unless BASE names a served build. The live database
 * is blocked: every request to another host is answered here, and supabase.co is aborted.
 */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import pw from './lib/playwrightLoader.mjs';

assert(process.env.CI, 'Run the review walk in remote CI, never on a desk machine');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
{
  const { cmVarLiveState } = await import('./qa/cmVarLit.mjs');
  if (cmVarLiveState() !== 'on') {
    console.error('playCmVar: cannot run: VAR is switched off (CM_VAR_LIVE is false in src/lib/clubManagerVarLive.ts), so the page asks for no review.');
    console.error('playCmVar: light a scratch checkout first: node scripts/qa/cmVarLit.mjs on, then npm run build, then this walk, then node scripts/qa/cmVarLit.mjs off.');
    process.exit(2);
  }
}
const OUT = path.resolve(process.env.RC_OUT || process.env.CM_VAR_NATIVE_ARTIFACTS || process.env.SHOTS || path.join(ROOT, 'cm-var-artifacts/native'));
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'dukb-club-manager-save', NOW = 1791547200000, SECOND_SEED = 5312, FINISH_SEED = 5313;
const clone = v => JSON.parse(JSON.stringify(v));
function fixedDate(fn) {
  const OriginalDate = Date;
  globalThis.Date = class extends OriginalDate { constructor(...args) { super(...(args.length ? args : [NOW])); } static now() { return NOW; } };
  try { return fn(); } finally { globalThis.Date = OriginalDate; }
}
const memory = new Map();
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k) };
/* The bundled engine goes to a temp folder, not beside the screenshots: it is several megabytes and a runner sends that folder back. */
const bundle = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cm-var-walk-')), 'engine.mjs');
await build({ entryPoints: [path.join(ROOT, 'src/lib/clubManager.ts')], bundle: true, platform: 'node', format: 'esm', outfile: bundle, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error' });
process.env.CM_VAR_FIXTURE_ONLY = '1';
const { withCmVarSeed } = await import('./simCmVar.mjs');
const engine = tag => import(`${pathToFileURL(bundle).href}?${tag}`);

/* ---- the halves ---- */
const place = e => e.minute + (e.plus ?? 0);
const isChance = e => e.kind === 'goal' || e.kind === 'shot' || e.kind === 'save';
const reviewsOf = feed => feed.filter(e => e.kind === 'var' && e.review).sort((a, b) => place(a) - place(b));
const kickOf = (live, v) => live.h1Play.find(p => p.kind === 'shot' && p.review?.id === v.review.id);
function alone(v, feed) {
  const own = e => v.review.decision === 'awarded' && e.minute === v.minute && e.side === v.side && e.text === v.text;
  return v.minute >= 4 && v.minute <= 38 && !v.plus
    && !feed.some(e => e !== v && isChance(e) && !own(e) && e.minute >= v.minute - 2 && e.minute <= v.minute + 2)
    && !reviewsOf(feed).some(o => o !== v && Math.abs(o.minute - v.minute) <= 3);
}
/** What each case is played on: which league match of the career, a seed that holds it today, and the half it wants. */
const WANTED = {
  ruledOut: { match: 0, hint: 2460, want: feed => reviewsOf(feed).find(v => v.review.decision === 'disallowed' && v.side === 'me' && alone(v, feed)) },
  penaltyScored: { match: 0, hint: 1735, want: (feed, live) => reviewsOf(feed).find(v => v.review.decision === 'awarded' && alone(v, feed) && !!kickOf(live, v)?.goal) },
  penaltySaved: { match: 2, hint: 2193, want: (feed, live) => reviewsOf(feed).find(v => { const k = kickOf(live, v); return v.review.decision === 'awarded' && alone(v, feed) && !!k && !k.goal && !!k.on; }) },
  goalBefore: { match: 1, hint: 1724, want: feed => { const all = reviewsOf(feed); return all.length === 1 && all[0].review.decision === 'disallowed' && all[0].minute >= 4 && all[0].minute <= 40 && !all[0].plus && feed.some(e => e.kind === 'goal' && place(e) === place(all[0]) - 1) ? all[0] : null; } },
  two: { match: 0, hint: 2453, want: feed => { const all = reviewsOf(feed); return all.length === 2 && all.every(r => r.minute >= 4 && r.minute <= 40 && !r.plus) && all[1].minute - all[0].minute >= 4 ? all[0] : null; } },
};
const fixtures = {};
{
  const cm = await engine('search');
  const entries = [];
  fixedDate(() => {
    const first = withCmVarSeed(4107, () => cm.startCareer('Everton'));
    /* The generated fixture list, the way simCmVar asks for it: only the real list's opt in key is taken off. */
    delete first.realLeagueFixtures;
    first.squad = first.squad.map(p => ({ ...p, fitness: 100, morale: 70, injuryWeeks: 0, suspendedMatches: 0 }));
    entries.push(first);
    for (let n = 0; n < 2; n++) entries.push(withCmVarSeed(5000 + n, () => cm.playNextEntry(entries[n], { skipHalftime: true, noCoach: true })).state);
    for (const [kind, spec] of Object.entries(WANTED)) {
      const pre = entries[spec.match];
      for (const seed of [spec.hint, ...Array.from({ length: 2500 }, (_, i) => 1700 + i)]) {
        const stop = withCmVarSeed(seed, () => cm.playNextEntry(pre, { varReviews: true }));
        if (stop.kind !== 'halftime' || stop.state.live.varReviews !== true) continue;
        const feed = cm.liveFeed(stop.state.live), review = spec.want(feed, stop.state.live);
        if (!review) continue;
        fixtures[kind] = { kind, pre, seed, review, second: kind === 'two' ? reviewsOf(feed)[1] : null };
        break;
      }
      console.log(`FIXTURE ${kind}: ${fixtures[kind] ? `league match ${spec.match + 1}, seed ${fixtures[kind].seed}, ${fixtures[kind].review.side} ${fixtures[kind].review.minute}' ${fixtures[kind].review.text}, ${fixtures[kind].review.review.decision}` : 'NOT FOUND'}`);
    }
  });
}
const report = { fixtures: Object.fromEntries(Object.entries(fixtures).map(([k, f]) => [k, { seed: f.seed, minute: f.review.minute, side: f.review.side, who: f.review.text, decision: f.review.review.decision }])), cases: [], help: [] };
const save = () => fs.writeFileSync(path.join(OUT, 'walk-report.json'), JSON.stringify(report, null, 1));
const failures = [];
for (const kind of Object.keys(WANTED)) if (!fixtures[kind]) failures.push(`no half of the search holds the ${kind} case`);
save();

/* ---- the build, served ---- */
let BASE = process.env.BASE || '', server = null;
if (!BASE) {
  const port = await new Promise((resolve, reject) => { const probe = createServer(); probe.once('error', reject); probe.listen(0, '127.0.0.1', () => { const value = probe.address().port; probe.close(error => (error ? reject(error) : resolve(value))); }); });
  BASE = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let log = '';
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`The server did not start: ${log}`)), 15000);
    server.once('error', error => { clearTimeout(timer); reject(error); });
    server.once('exit', code => { clearTimeout(timer); reject(new Error(`The server exited ${code}: ${log}`)); });
    server.stdout.on('data', data => { log += data; if (String(data).includes('host-like server:')) { clearTimeout(timer); resolve(); } });
    server.stderr.on('data', data => { log += data; });
  });
}
const PROFILES = [{ name: '390', width: 390, height: 844, touch: true }, { name: '1280', width: 1280, height: 900, touch: false }];
const browser = await pw.chromium.launch({ headless: true });

async function open(profile, motion, pre, seed) {
  const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, isMobile: profile.touch, hasTouch: profile.touch,
    colorScheme: 'dark', reducedMotion: motion, serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: BASE,
      localStorage: [{ name: KEY, value: JSON.stringify(pre) }, { name: 'cookie-consent', value: 'essential' }, { name: 'dukb-theme', value: 'dark' }] }] } });
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
    /* What the screen showed, as it changed: the review card and what the pitch was playing under it. */
    window.__seen = [];
    const read = () => {
      const card = document.querySelector('[data-cm-var]'), pitch = document.querySelector('[data-cm-live-pitch]'), root = document.querySelector('[data-cm-live-stage]');
      return { card: card ? `${card.dataset.cmVar}:${card.dataset.cmVarId}` : 'none', motion: pitch?.dataset.cmMotion ?? null, phase: pitch?.dataset.cmMotionPhase ?? null,
        goalCard: !!document.querySelector('[data-cm-goal-card]'), minute: root?.dataset.cmLiveMinute ?? null, y: Math.round(window.scrollY),
        score: [...document.querySelectorAll('[data-cm-live-stagebox] [data-cm-score-of]')].map(el => `${el.dataset.cmScoreOf}=${el.textContent}`).join(' ') };
    };
    new MutationObserver(() => {
      const now = read(), last = window.__seen.at(-1);
      if (!last || last.card !== now.card || last.motion !== now.motion || last.phase !== now.phase || last.goalCard !== now.goalCard || last.score !== now.score) { if (window.__seen.length < 4000) window.__seen.push({ ...now, t: Math.round(performance.now()) }); }
    }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-cm-var', 'data-cm-motion', 'data-cm-motion-phase', 'data-cm-goal-card'], characterData: true });
    document.addEventListener('click', event => {
      const button = event.target.closest?.('button'); if (!button) return;
      if (button.matches('[data-cm-way="live"], [data-cm-way="quick"]')) { if (!(button.matches('[data-cm-way="live"]') && JSON.parse(localStorage.getItem(key) || 'null')?.live)) seedRandom(seed); }
      if (button.textContent.trim() === 'Second half') seedRandom(second);
      if (button.textContent.trim() === 'Skip' && document.querySelector('[data-cm-live-stage="second"]')) seedRandom(finish);
    }, true);
  }, { now: NOW, seed, second: SECOND_SEED, finish: FINISH_SEED, key: KEY });
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  /* A request this walk answers or aborts itself is not the page's error. */
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR_|ERR_FAILED/.test(m.text())) errors.push(m.text().slice(0, 300)); });
  const activate = async button => { if (profile.touch) await button.tap(); else { await button.focus(); await button.press('Enter'); } };
  const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  const score = () => page.locator('[data-cm-live-stagebox] [data-cm-score-of]').evaluateAll(els => Object.fromEntries(els.map(el => [el.dataset.cmScoreOf, Number(el.textContent)])));
  const stage = async name => { await page.locator(`[data-cm-live-stage="${name}"]`).waitFor({ state: 'attached' }); await page.locator('[data-cm-live-stagebox]').waitFor({ state: 'visible' }); };
  const where = () => page.evaluate(() => { const box = document.querySelector('[data-cm-live-stagebox]')?.getBoundingClientRect(); return { scrollY: Math.round(window.scrollY), top: box ? Math.round(box.top) : null, docWidth: document.documentElement.scrollWidth, vw: innerWidth }; });
  const shot = async name => { await page.screenshot({ path: path.join(OUT, `${name}.jpg`), type: 'jpeg', quality: 60 }); return `${name}.jpg`; };
  return { context, page, errors, activate, saved, score, stage, where, shot };
}
const toHub = async w => { await w.page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded' }); await w.activate(w.page.locator('[data-testid="cm-slot-1"]').getByRole('button', { name: 'Resume Career', exact: true })); await w.page.locator('[data-cm-way="live"]').waitFor(); };

/** From wherever the first half stands to full time and the report: Skip, Second half, Skip. The save after
 *  the whistle must be the engine's own settlement of the same seeds, and the report's review rows must be whole. */
async function finishMatch(w, row, check, id, cm, before, v, compare) {
  if (!(await w.page.locator('[data-cm-live-stage="interval"]').count())) {
    await w.activate(w.page.locator('[data-cm-live-controls]').getByRole('button', { name: 'Skip', exact: true }));
    await w.page.locator('[data-cm-live-stage="interval"]').waitFor({ timeout: 30000 });
  }
  check((await w.page.locator('[data-cm-var]').count()) === 0, 'a review card is still up at the interval');
  await w.activate(w.page.getByRole('button', { name: 'Second half', exact: true }));
  await w.stage('second');
  const beforeFinish = await w.saved();
  const expected = fixedDate(() => withCmVarSeed(FINISH_SEED, () => cm.resumeMatch(beforeFinish)));
  await w.activate(w.page.locator('[data-cm-live-controls]').getByRole('button', { name: 'Skip', exact: true }));
  await w.page.waitForFunction(({ key, week }) => JSON.parse(localStorage.getItem(key)).week === week, { key: KEY, week: before.week + 1 }, { timeout: 30000 });
  await w.stage('done');
  const after = await w.saved();
  row.result = after.resultLog.at(-1)?.score ?? null;
  if (compare) check(JSON.stringify(after) === JSON.stringify(clone(cm.trimCareer(expected.state))), `the save after full time (${row.result}) is not the engine's settlement of the same seeds (${expected.state.resultLog.at(-1)?.score})`);
  row.shots.push(await w.shot(`${id}-8-full-time`));
  await w.activate(w.page.locator('[data-cm-live-controls]').getByRole('button', { name: 'Full report', exact: true }));
  await w.page.locator('[data-cm-timeline]').waitFor();
  const rows = await w.page.locator('[data-cm-tl="var"]').evaluateAll(els => els.map(el => { const t = el.querySelector('[title]'); return { clock: el.dataset.cmTlClock, side: el.dataset.cmTlSide, title: t?.getAttribute('title') ?? '', shown: (t ?? el).textContent, cut: t ? t.scrollWidth > t.clientWidth + 1 : null }; }));
  row.timeline = rows;
  const label = v.review.decision === 'disallowed' ? 'VAR: goal ruled out' : 'VAR: penalty awarded';
  check(rows.filter(r => r.clock === cm.minuteLabel(v) && r.side === v.side && r.title.includes(`${label}: ${v.text}`)).length === 1, `the report has no row "${label}: ${v.text}" at ${cm.minuteLabel(v)}`);
  check(rows.every(r => r.cut === false && r.shown.includes('VAR:')), `a review row of the report is cut off: ${JSON.stringify(rows.filter(r => r.cut !== false))}`);
  const first = w.page.locator('[data-cm-tl="var"]').first();
  if (await first.count()) { await first.scrollIntoViewIfNeeded(); row.shots.push(await w.shot(`${id}-9-report-timeline`)); }
  const end = await w.where();
  check(end.docWidth <= end.vw + 1, 'the report scrolls sideways');
}

async function runCase(profile, motion, kind, variant) {
  const f = fixtures[kind]; if (!f) return;
  const id = `${profile.name}-${motion === 'reduce' ? 'reduced' : 'motion'}-${kind}-${variant}`;
  const row = { id, kind, variant, seed: f.seed, shots: [], fail: [] }; report.cases.push(row);
  const check = (ok, message) => { if (!ok) row.fail.push(message); };
  const started = Date.now();
  const w = await open(profile, motion, f.pre, f.seed);
  try {
    await toHub(w);
    const before = await w.saved();
    const cm = await engine(`case=${id}`);
    const half = fixedDate(() => withCmVarSeed(f.seed, () => cm.playNextEntry(before, { varReviews: true })));
    const live = half.state.live, feed = cm.liveFeed(live);
    const v = reviewsOf(feed).find(e => e.review.id === f.review.review.id);
    assert(v, 'the engine does not draw this fixture from the save the page holds');
    const goalsBy = pos => ({ me: feed.filter(e => e.kind === 'goal' && e.side === 'me' && place(e) <= pos).length, opp: feed.filter(e => e.kind === 'goal' && e.side === 'opp' && place(e) <= pos).length });
    const same = (a, b) => a.me === b.me && a.opp === b.opp;
    const prior = goalsBy(place(v) - 1), kick = kickOf(live, v), ruledOut = v.review.decision === 'disallowed';
    const club = v.side === 'me' ? before.clubName : live.opponent;
    row.engine = { minute: cm.minuteLabel(v), side: v.side, who: v.text, decision: v.review.decision, prior, kick: kick ? (kick.goal ? 'scored' : kick.on ? 'saved' : 'wide') : null };
    await w.activate(w.page.locator('[data-cm-way="live"]'));
    await w.stage('first');
    check((await w.saved()).live?.varReviews === true, 'the saved match does not carry the review opt in on a lit build');
    await w.activate(w.page.locator('[data-cm-live-controls]').getByRole('button', { name: '4x', exact: true }));
    const whereBefore = await w.where();
    await w.page.waitForFunction(rid => document.querySelector('[data-cm-var]')?.dataset.cmVarId === rid, v.review.id, { timeout: 120000 });
    const card = w.page.locator('[data-cm-var]');
    const box = await card.evaluate(el => { const b = el.getBoundingClientRect(); return { text: el.innerText.replace(/\n/g, ' | '), x: Math.round(b.x), right: Math.round(b.right), top: Math.round(b.top), bottom: Math.round(b.bottom), vw: innerWidth, vh: innerHeight, animations: el.getAnimations({ subtree: true }).length, cut: [...el.querySelectorAll('p')].some(p => p.scrollWidth > p.clientWidth + 1) }; });
    const whereChecking = await w.where(), scoreChecking = await w.score();
    const minuteChecking = Number(await w.page.locator('[data-cm-live-stage]').getAttribute('data-cm-live-minute'));
    row.shots.push(await w.shot(`${id}-1-checking`));
    Object.assign(row, { card: box, scoreChecking, minuteChecking });
    check(box.x >= 0 && box.right <= box.vw && box.top >= 0 && box.bottom <= box.vh && !box.cut, `the card is not whole on the screen: ${JSON.stringify(box)}`);
    check(box.animations === 0, 'the card animates');
    check(box.text.includes(`${v.text}, ${club}, ${cm.minuteLabel(v)}`), `the card does not name the man, his club and the minute: ${box.text}`);
    check(same(scoreChecking, prior), `the score under the card is ${JSON.stringify(scoreChecking)} and the engine has ${JSON.stringify(prior)} before the incident`);
    check(minuteChecking >= v.minute, `the card opened at ${minuteChecking}', before the incident's own minute, ${v.minute}'`);
    check(whereChecking.scrollY === whereBefore.scrollY && whereChecking.top === whereBefore.top, `the page moved when the card opened: ${JSON.stringify(whereBefore)} to ${JSON.stringify(whereChecking)}`);
    check(whereChecking.docWidth <= whereChecking.vw + 1, 'the match screen scrolls sideways');
    if (variant === 'plain') {
      await w.page.locator('[data-cm-var="decided"]').waitFor();
      const decided = (await card.innerText()).replace(/\n/g, ' | ');
      row.decided = decided;
      row.shots.push(await w.shot(`${id}-2-decided`));
      check(decided.includes(ruledOut ? 'VAR: goal ruled out' : 'VAR: penalty awarded') && decided.includes(ruledOut ? 'No goal.' : `Penalty to ${club}.`), `the decision reads: ${decided}`);
      await card.waitFor({ state: 'hidden' });
      const whereAfter = await w.where();
      check(whereAfter.scrollY === whereBefore.scrollY && whereAfter.top === whereBefore.top, 'the page moved when the card closed');
      const want = goalsBy(place(v));
      if (kick?.goal) await w.page.waitForFunction(({ side, n }) => Number(document.querySelector(`[data-cm-live-stagebox] [data-cm-score-of="${side}"]`)?.textContent) === n, { side: v.side, n: want[v.side] }, { timeout: 20000 }).catch(() => check(false, 'the penalty a review gave never reached the score'));
      else await w.page.waitForTimeout(kick ? 1200 : 400);
      row.scoreAfter = await w.score();
      row.shots.push(await w.shot(`${id}-3-after`));
      const seen = await w.page.evaluate(() => window.__seen);
      const mine = `:${v.review.id}`, opened = seen.findIndex(s => s.card.endsWith(mine)), closed = seen.map(s => s.card.endsWith(mine)).lastIndexOf(true);
      const under = seen.filter(s => s.card !== 'none');
      check(!under.some(s => s.goalCard), 'a goal card was up under a review card');
      check(under.every(s => s.motion === 'pass' || (ruledOut && s.motion === 'goal' && s.phase === 'net')), `an action was in flight under the review card: ${JSON.stringify(under.find(s => !(s.motion === 'pass' || (ruledOut && s.motion === 'goal' && s.phase === 'net'))))}`);
      check(new Set(under.filter(s => s.card.endsWith(mine)).map(s => s.score)).size === 1, 'the score moved while the review card was up');
      if (kind === 'ruledOut') check(motion === 'reduce' ? under.some(s => s.motion === 'goal' && s.phase === 'net') : seen.slice(0, opened).some(s => s.motion === 'goal' && s.phase === 'flight'), 'the ruled out goal was not drawn before its review');
      if (ruledOut) check(seen[closed + 1]?.motion !== 'goal', 'the ruled out goal went on playing after its review');
      if (kick) check(seen.slice(closed + 1).some(s => s.motion === (kick.goal ? 'goal' : kick.on ? 'save' : 'shot') && s.phase !== 'plant'), 'the kick of the penalty a review gave was not played after the card');
      if (kick && !kick.goal) check(same(row.scoreAfter, prior), 'the score moved on a penalty that did not go in');
      if (f.second) {
        const seenSecond = await w.page.waitForFunction(rid => document.querySelector('[data-cm-var]')?.dataset.cmVarId === rid, f.second.review.id, { timeout: 90000 }).then(() => true).catch(() => false);
        check(seenSecond, 'the second review of the half never got its card');
        if (seenSecond) { row.shots.push(await w.shot(`${id}-5-second-review`)); await card.waitFor({ state: 'hidden', timeout: 15000 }); }
      }
      if (kind === 'ruledOut' && motion === 'no-preference') {
        await w.activate(w.page.getByRole('button', { name: 'How watching a match works' }));
        const helpLines = w.page.locator('[data-cm-live-help]');
        await helpLines.waitFor();
        const text = await helpLines.innerText();
        check(text.includes('goes in first') && text.includes('VAR example'), 'the match help does not explain the review');
        row.shots.push(await w.shot(`${id}-4-help`));
        await w.activate(w.page.getByRole('button', { name: 'Close the help' }));
      }
    } else if (variant === 'leave') {
      await w.page.reload({ waitUntil: 'domcontentloaded' });
      await w.activate(w.page.locator('[data-testid="cm-slot-1"]').getByRole('button', { name: 'Resume Career', exact: true }));
      const resume = w.page.getByRole('button', { name: 'Resume match', exact: true });
      await resume.waitFor();
      await w.activate(resume);
      await w.stage('first');
      check(same(await w.score(), prior), 'back in the match the score is not the one it was left on');
      const again = await w.page.waitForFunction(rid => document.querySelector('[data-cm-var]')?.dataset.cmVarId === rid, v.review.id, { timeout: 12000 }).then(() => true).catch(() => false);
      check(again, 'the review was not shown again after coming back');
      row.shots.push(await w.shot(`${id}-3-returned`));
      if (again) await card.waitFor({ state: 'hidden', timeout: 15000 });
    } else if (variant === 'skip') {
      await w.activate(w.page.locator('[data-cm-live-controls]').getByRole('button', { name: 'Skip', exact: true }));
      await w.page.locator('[data-cm-live-stage="interval"]').waitFor({ timeout: 20000 });
      await w.page.waitForTimeout(600);
      check((await card.count()) === 0, 'the review card outlived Skip');
      row.shots.push(await w.shot(`${id}-2-after-skip`));
    }
    await finishMatch(w, row, check, id, cm, before, v, variant !== 'leave');
  } catch (error) { row.fail.push(`the walk stopped: ${String(error.stack || error).slice(0, 700)}`); await w.page.screenshot({ path: path.join(OUT, `${id}-FAILURE.jpg`), type: 'jpeg', quality: 60 }).catch(() => {}); row.shots.push(`${id}-FAILURE.jpg`); }
  finally { for (const e of w.errors.slice(0, 4)) row.fail.push(`a page error: ${e}`); row.seconds = Math.round((Date.now() - started) / 1000); await w.context.close(); save(); }
  for (const message of row.fail) failures.push(`${id}: ${message}`);
  console.log(`CASE ${id}: ${row.fail.length ? `FAILED (${row.fail.length}) ${row.fail[0].split('\n')[0].slice(0, 260)}` : 'ok'} | ${row.engine ? `${row.engine.decision} ${row.engine.side} ${row.engine.minute}` : ''} | card "${row.card?.text ?? ''}" at ${row.minuteChecking ?? '-'}' | score under it ${JSON.stringify(row.scoreChecking ?? null)} | result ${row.result ?? '-'} | ${row.seconds}s`);
}

/** The How to Play paragraph, as a lit build prints it. */
async function hubHelp(profile) {
  const f = Object.values(fixtures)[0]; if (!f) return;
  const id = `${profile.name}-hub-help`, row = { id, shots: [], fail: [] }; report.help.push(row);
  const w = await open(profile, 'no-preference', f.pre, f.seed);
  try {
    await toHub(w);
    await w.activate(w.page.getByRole('button', { name: 'How to play' }).first());
    const para = w.page.locator('p', { hasText: "VAR in today's game" }).first();
    await para.waitFor({ timeout: 10000 });
    await para.scrollIntoViewIfNeeded();
    row.text = await para.innerText();
    const box = await para.evaluate(el => { const b = el.getBoundingClientRect(); return { x: Math.round(b.x), right: Math.round(b.right), vw: innerWidth, docWidth: document.documentElement.scrollWidth }; });
    if (!(box.x >= 0 && box.right <= box.vw && box.docWidth <= box.vw + 1)) row.fail.push(`the VAR paragraph does not fit the screen: ${JSON.stringify(box)}`);
    for (const must of ['Premier League', 'Champions League', 'a clearly wrong second yellow', 'goals and penalties only', 'goes in first']) if (!row.text.includes(must)) row.fail.push(`the VAR paragraph does not say "${must}"`);
    if (row.text.includes('straight red cards')) row.fail.push('the VAR paragraph still states the protocol of before July 2026');
    row.shots.push(await w.shot(`${id}-1-var-paragraph`));
  } catch (error) { row.fail.push(`the walk stopped: ${String(error.stack || error).slice(0, 500)}`); await w.page.screenshot({ path: path.join(OUT, `${id}-FAILURE.jpg`), type: 'jpeg', quality: 55 }).catch(() => {}); }
  finally { await w.context.close(); save(); }
  for (const message of row.fail) failures.push(`${id}: ${message}`);
  console.log(`HELP ${id}: ${row.fail.length ? `FAILED ${row.fail[0].slice(0, 200)}` : 'ok'} | ${(row.text ?? '').slice(0, 160)}`);
}

try {
  for (const profile of PROFILES) await hubHelp(profile);
  for (const profile of PROFILES) for (const kind of ['ruledOut', 'penaltyScored', 'penaltySaved', 'goalBefore']) await runCase(profile, 'no-preference', kind, 'plain');
  for (const profile of PROFILES) for (const kind of ['ruledOut', 'penaltyScored']) await runCase(profile, 'reduce', kind, 'plain');
  await runCase(PROFILES[0], 'no-preference', 'two', 'plain');
  for (const variant of ['leave', 'skip']) for (const profile of PROFILES) for (const kind of ['ruledOut', 'penaltyScored']) await runCase(profile, 'no-preference', kind, variant);
} finally { await browser.close(); if (server) server.kill(); save(); }
for (const line of failures.slice(0, 60)) console.log(`FAIL ${line.split('\n')[0].slice(0, 420)}`);
console.log(`playCmVar: ${report.cases.length} cases and ${report.help.length} help views at 390 and 1280, ${Object.keys(fixtures).length} of ${Object.keys(WANTED).length} fixtures found, ${failures.length} failed assertion(s).`);
if (failures.length) { console.log('playCmVar: FAILED.'); process.exit(1); }
console.log('playCmVar: green. Every review a player can meet was shown whole, at its minute, over nothing else, and every match settled as the engine settles it.');
process.exit(0);
