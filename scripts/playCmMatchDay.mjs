/* Round 1340: Club Manager's match day screens on the built site, read like a scoreboard.

   The dist is served by scripts/lib/hostLikeServer.mjs on a port of its own; supabase.co and every host but this
   one and the font hosts are aborted; the clock is fixed. Saves are planted, built in node by the real engine
   (bundled with esbuild and played on a seeded stream to the state wanted), written under the save key before the
   page opens, then Resume Career on slot 1:
     A  Liverpool 2026-27 with an away league match next.
     B  the same career on to its next home league match.
     C  a final next, on a neutral ground (a strong club's season walked to its cup or European final).
     E  an away second leg (pictures only, no assertion: the reviewers judge the aggregate line by eye).
     D  (Round 1340b) the hub's Stats tile at 320: Eintracht Frankfurt with Ayoube Amaimouni-Echghouyab, whose
        pitch name is the longest in the pool, on 12 goals (a layout plant) so he leads it. The tile's line must
        read his pitch name ("Amaimouni-Echghouyab leads with 12") and wrap to at most two lines.
   At 320 by 640, 390 by 844 and 1280 by 900, and again at 390 with reduced motion, each of A, B and C is walked:
   the hub's next match card, the Match Centre, Play Live (the strip, the score's digits, the line under the
   pitch at 320 and 390 and the full stats at 1280), Skip to the interval (the interval card and the dressing
   room's card), Second half, Skip, Full report (the scoreline, the scorer columns, the stats header and first
   bar, the momentum legend, the shots row, the best columns, the timeline's header and every row's columns).
   Every two sided block must read home side first, read by its data attributes, my club picked out in green.
   The timeline: every name whole (its box's scrollWidth at most its clientWidth plus 1, never an ellipsis), every
   (P) or (O.G) mark on its name's last line (or, only when his last word and the mark together are wider than the
   column, at the start of the very next line: r1340-F4 met one at 320 and r1340-m1's probe showed no white-space
   rule keeps it up without splitting the name; how many is printed), the toggle at least 44 px tall. The page
   never jumps: window.scrollY
   is read before and after every step that is not a navigation (a settle on the report, the toggle) and must not
   move; the document height of each screen is printed. The reduced motion pass also reads
   document.getAnimations() on the report card and the timeline once the verdict is in, before the toggle is
   pressed: none may be running.
   Pictures of every screen go to $RC_OUT/matchday (or a temp folder), named <save>-<width>[-rm]-<screen>.jpg.

   Controls (PLAY_MATCHDAY_CONTROL=..., each asserting its anchor first, run on save A at 390 only):
     swap  the hub card's two names are swapped in the DOM after both are found: the order check must go red.
     cut   nowrap, overflow hidden and an ellipsis on [data-cm-tl-name]: the whole name check must go red.
     jump  the window is scrolled 300 px inside the report's settle step: the jump check must go red.
     fullname  (save D at 320 only) the Stats tile's line is set to his whole name in the DOM after the tile is
           found: the two line check must go red.
   With MATCHDAY_COMPARE_DIST=<a served build of the round's base> the walk instead compares builds (the brief's
   step a6): A, B and C at the three sizes walked by the same taps on the head and on the base, Math.random seeded
   at load and again on every tap and the clock fixed, so both builds draw the same matches. Text nodes under 12 px
   on each screen are counted and the head may never have more; the save after the walk must be the base's to the
   byte (the first differing key is printed on a red); the document heights are printed side by side, never
   asserted. One build walked twice first proves the seeded save is stable; if it is not, the run cannot judge.
   Exit codes: 0 green, 1 red (or a control that fired), 2 could not run, 3 a control that did not fire.
   Green is the closing summary line and the real exit code.

   Run (after a build into dist): node scripts/playCmMatchDay.mjs
*/
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import pw from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.RC_OUT ? path.join(process.env.RC_OUT, 'matchday') : path.join(os.tmpdir(), `cmMatchDayWalk.${process.pid}`);
const WORK = path.join(os.tmpdir(), `cmMatchDayEngine.${process.pid}`);
const KEY = 'dukb-club-manager-save';
const NOW = Date.parse('2026-10-16T16:00:00Z');
const CONTROL = process.env.PLAY_MATCHDAY_CONTROL || '';
const CONTROLS = ['swap', 'cut', 'jump', 'fullname'];
const SIZES_ALL = [[320, 640], [390, 844], [1280, 900]];
if (CONTROL && !CONTROLS.includes(CONTROL)) { console.error(`PLAY_MATCHDAY_CONTROL=${CONTROL} is not a control this walk knows`); process.exit(2); }
const cannotRun = m => { console.error(`playCmMatchDay could not run: ${m}`); process.exit(2); };
if (!fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) cannotRun('no dist/index.html: build first');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(WORK, { recursive: true });

const failures = [];
const fired = { swap: 0, cut: 0, jump: 0, fullname: 0 };
let checks = 0;
const check = (ok, what) => { checks += 1; if (!ok) { failures.push(what); if (failures.length <= 40) console.error(`  FAIL: ${what}`); } return ok; };

/* ---- the planted saves, built by the real engine on a seeded stream and a fixed clock ---- */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const HOUSE_RANDOM = Math.random;
const HOUSE_DATE = Date;
function fixed(seed, fn) {
  Math.random = seeded(seed);
  globalThis.Date = class extends HOUSE_DATE { constructor(...args) { super(...(args.length ? args : [NOW])); } static now() { return NOW; } };
  try { return fn(); } finally { Math.random = HOUSE_RANDOM; globalThis.Date = HOUSE_DATE; }
}
const memory = new Map();
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k), clear: () => memory.clear() };
const bundle = path.join(WORK, 'engine.mjs');
await build({ entryPoints: [path.join(ROOT, 'src/lib/clubManager.ts')], bundle: true, platform: 'node', format: 'esm', outfile: bundle, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error', loader: { '.png': 'empty', '.svg': 'empty', '.jpg': 'empty' } });
const cm = await import(pathToFileURL(bundle).href);
await cm.ensureAllEraRosters();

/** Plays a career on until want(fixture, state) holds before a match; returns that state and its fixture. */
function walkTo(state, seed, want, limit = 120) {
  let s = state;
  for (let step = 0; step < limit; step++) {
    let fx = null;
    try { fx = cm.nextFixture(s); } catch { fx = null; }
    if (fx && fx.kind === 'match' && want(fx, s)) return { state: s, fx };
    const res = fixed(seed * 104729 + step * 31 + 5, () => cm.playNextEntry(s, { skipHalftime: true }));
    if (!res || !res.state || res.kind === 'seasonOver' || res.state.sacked) return null;
    s = res.state;
  }
  return null;
}
const start = (club, seed, era) => fixed(seed * 7919 + 17, () => cm.startCareer(club, era));
const plant = (name, found, assert = true) => ({
  name, assert, raw: JSON.stringify(cm.trimCareer(found.state)), club: found.state.clubName,
  fxHome: found.fx.home, opponent: found.fx.opponent, compLabel: found.fx.compLabel,
});
const saves = [];
const liverpool = start('Liverpool', 0);
const a = walkTo(liverpool, 0, fx => fx.competition === 'league' && fx.home === false);
if (!a) cannotRun('Liverpool found no away league match');
saves.push(plant('A', a));
const b = walkTo(a.state, 1, (fx, s) => s.week > a.state.week && fx.competition === 'league' && fx.home === true);
if (!b) cannotRun('Liverpool found no home league match after A');
saves.push(plant('B', b));
let c = null;
for (const club of ['Real Madrid', 'Man City', 'Bayern Munich', 'PSG', 'Inter', 'Arsenal']) {
  for (let seed = 100; seed < 104 && !c; seed++) c = walkTo(start(club, seed), seed, fx => fx.home === null, 200);
  if (c) break;
}
if (!c) cannotRun('no strong club reached a final on a neutral ground');
saves.push(plant('C', c));
let e = null;
for (const club of ['Real Madrid', 'Man City', 'Bayern Munich', 'Liverpool', 'Barcelona']) {
  for (let seed = 200; seed < 203 && !e; seed++) e = walkTo(start(club, seed), seed, (fx, s) => fx.home === false && !!fixed(1, () => cm.matchFacts(s))?.firstLeg, 200);
  if (e) break;
}
if (e) saves.push(plant('E', e, false));
else console.log('no away second leg found: save E (pictures only) is left out');
for (const s of saves) console.log(`save ${s.name}: ${s.club} against ${s.opponent} (${s.compLabel}), ${s.fxHome === null ? 'neutral' : s.fxHome ? 'home' : 'away'}, ${s.raw.length} bytes`);
/* D (Round 1340b): the hub's Stats tile at 320 with the longest pitch name in the pool leading the scoring.
   src/lib/cmMatchDisplay.test.ts prints that name over the whole pool (r1340-x1: Amaimouni-Echghouyab, 20
   characters, Eintracht Frankfurt's Ayoube Amaimouni-Echghouyab). His 12 goals are a LAYOUT PLANT, set on the
   save so he leads the tile; nothing else in the save moves. */
const TILE_CLUB = 'Eintracht Frankfurt', TILE_MAN = 'Ayoube Amaimouni-Echghouyab', TILE_GOALS = 12;
const displayBundle = path.join(WORK, 'display.mjs');
await build({ entryPoints: [path.join(ROOT, 'src/lib/cmMatchDisplay.ts')], bundle: true, platform: 'node', format: 'esm', outfile: displayBundle, logLevel: 'error' });
const display = await import(pathToFileURL(displayBundle).href);
const dState = start(TILE_CLUB, 300);
const dMan = dState?.squad.find(p => p.name === TILE_MAN);
if (!dMan) cannotRun(`${TILE_MAN} is not in ${TILE_CLUB}'s squad at the start of a career`);
dMan.seasonGoals = TILE_GOALS;
const saveD = { name: 'D', raw: JSON.stringify(cm.trimCareer(dState)), club: TILE_CLUB, man: TILE_MAN, line: `${display.pitchName(TILE_MAN)} leads with ${TILE_GOALS}` };
console.log(`save D: ${TILE_CLUB} with ${TILE_MAN} on ${TILE_GOALS} goals (planted), the tile should read "${saveD.line}", ${saveD.raw.length} bytes`);

/* ---- the served build (and, for the comparison, the base's) ---- */
const servers = [];
async function serveDist(dir) {
  const port = await new Promise((resolve, reject) => {
    const probe = createServer(); probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => { const p = probe.address().port; probe.close(err => (err ? reject(err) : resolve(p))); });
  });
  const server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), dir, String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  servers.push(server);
  let log = '';
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`the host did not start: ${log}`)), 15000);
    server.once('exit', code => { clearTimeout(timer); reject(new Error(`the host exited ${code}: ${log}`)); });
    server.stdout.on('data', d => { log += d; if (log.includes('host-like server:')) { clearTimeout(timer); resolve(); } });
    server.stderr.on('data', d => { log += d; });
  }).catch(err => cannotRun(String(err.message)));
  return `http://127.0.0.1:${port}`;
}
const BASE = await serveDist('dist');
const browser = await pw.chromium.launch({ headless: true });
process.on('exit', () => { for (const s of servers) { try { s.kill(); } catch { /* gone */ } } try { fs.rmSync(WORK, { recursive: true, force: true }); } catch { /* gone */ } });

/* ---- reading the screens, in the page ---- */
/** The hub card's two names, in document order: their side words, their texts and my name's class. */
const readHub = page => page.evaluate(() => {
  const card = document.querySelector('[data-cm-next-match]');
  if (!card) return null;
  const names = [...card.querySelectorAll('[data-cm-next-side]')];
  return { sides: names.map(n => n.getAttribute('data-cm-next-side')), texts: names.map(n => n.textContent.trim()), mine: names.find(n => n.getAttribute('data-cm-next-side') === 'me')?.className ?? '' };
});
const readCentre = page => page.evaluate(() => {
  const sides = [...document.querySelectorAll('[data-cm-mc-side]')];
  return { sides: sides.map(n => n.getAttribute('data-cm-mc-side')), tie: sides.slice(0, 2).map(n => n.firstElementChild?.textContent.trim()) };
});
/** The live stage: the strip's names and digits, the line under the pitch, and the full stats. */
const readLive = page => page.evaluate(() => {
  const strip = document.querySelector('.cm-strip-score');
  const score = strip?.querySelector('[data-cm-live-score]');
  const kids = strip ? [...strip.children].filter(k => k !== score) : [];
  const line = document.querySelector('[data-cm-live-statline]');
  const poss = line ? [...line.children].find(s => s.textContent.startsWith('Poss')) : null;
  const stats = document.querySelector('[data-cm-live-stats]');
  return {
    names: kids.map(k => k.textContent.trim()), mineGreen: kids.map(k => k.className.includes('text-primary')),
    digits: score ? [...score.querySelectorAll('[data-cm-score-of]')].map(d => d.getAttribute('data-cm-score-of')) : [],
    lineShown: !!line && getComputedStyle(line).display !== 'none',
    lineBoldFirst: poss ? poss.childNodes[1]?.nodeName === 'B' : null,
    poss: stats ? [...stats.querySelectorAll('[data-cm-live-poss]')].map(p => p.getAttribute('data-cm-live-poss')) : [],
    cells: stats ? [...stats.querySelectorAll('[data-cm-live-stat]')].map(c => c.querySelector('[data-cm-live-stat-n]')?.getAttribute('data-cm-live-stat-n')) : [],
    statsHead: stats ? [...stats.firstElementChild.children].map(s => s.textContent.trim()) : [],
  };
});
/** The interval: the live card's digits and names, and the dressing room's card. */
const readInterval = page => page.evaluate(() => {
  const stage = document.querySelector('[data-cm-live-stage="interval"]');
  const score = stage?.querySelector('[data-cm-live-score]');
  const names = score?.nextElementSibling ? [...score.nextElementSibling.querySelectorAll('span')].map(s => s.textContent.trim()) : [];
  const big = stage ? [...stage.querySelectorAll('span')].find(s => s.className.includes('text-3xl')) : null;
  const row = big ? [...big.parentElement.children].map(s => s.textContent.trim()) : [];
  return { digits: score ? [...score.querySelectorAll('[data-cm-score-of]')].map(d => d.getAttribute('data-cm-score-of')) : [], names, row };
});
/** The report: every two sided block in document order, by its data attributes, and the timeline. */
const readReport = page => page.evaluate(() => {
  const scoreBox = [...document.querySelectorAll('div')].find(d => d.className.includes('font-display') && d.className.includes('text-2xl') && /^\d+ - \d+$/.test(d.textContent.trim()));
  const sideOf = el => el?.textContent.trim();
  const order = name => [...document.querySelectorAll(`[${name}]`)].map(n => n.getAttribute(name));
  const headOf = middle => {
    const mid = [...document.querySelectorAll('span')].find(s => s.textContent.trim() === middle && s.parentElement?.children.length === 3);
    return mid ? [...mid.parentElement.children].map(s => s.textContent.trim()) : [];
  };
  const firstBar = document.querySelector('[data-cm-stat]');
  const rows = [...document.querySelectorAll('li[data-cm-tl-side]')].map(li => ({
    side: li.getAttribute('data-cm-tl-side'), inFirst: !!li.children[0]?.querySelector('[data-cm-tl-entry]'),
  }));
  return {
    scoreline: scoreBox ? [sideOf(scoreBox.previousElementSibling), sideOf(scoreBox.nextElementSibling)] : [],
    scorers: order('data-cm-scorer-col'), legend: order('data-cm-legend'), shots: order('data-cm-shots'), best: order('data-cm-best'),
    statsHead: headOf('Match stats'), timelineHead: headOf('Timeline'),
    firstBar: firstBar ? firstBar.querySelector('[data-cm-stat-n]')?.getAttribute('data-cm-stat-n') : null,
    rows, timeline: !!document.querySelector('[data-cm-timeline]'),
  };
});
/** Every timeline name: whole (its box never narrower than its text) and never ended with an ellipsis; every mark
 *  on its name's last line; the toggle's height. */
const readNames = page => page.evaluate(() => {
  const names = [...document.querySelectorAll('[data-cm-tl-name]')].map(n => {
    const style = getComputedStyle(n);
    const box = style.display === 'inline' ? n.closest('[data-cm-tl-entry]') : n;
    return { text: n.textContent.trim(), over: box.scrollWidth - box.clientWidth, ellipsis: style.textOverflow === 'ellipsis' || getComputedStyle(box).textOverflow === 'ellipsis' };
  });
  const marks = [...document.querySelectorAll('[data-cm-tl-mark]')].map(m => {
    const name = m.previousElementSibling?.matches('[data-cm-tl-name]') ? m.previousElementSibling : null;
    const lines = name ? [...name.getClientRects()] : [];
    const last = lines[lines.length - 1];
    const r = m.getBoundingClientRect();
    const onLast = !!last && r.top < last.bottom && r.bottom > last.top;
    /* The one way off the last line that is not a fault: his last word and the mark together are wider than the
       column, so the mark starts the very next line (no white-space rule can avoid it without splitting the name). */
    const cell = m.closest('[data-cm-tl-entry]')?.parentElement;
    const room = cell ? cell.clientWidth : Infinity;
    const forced = !onLast && !!last && r.top >= last.bottom - 1 && r.top < last.bottom + last.height && last.width + r.width > room + 0.5;
    return { name: name?.textContent.trim() ?? null, onLast, forced, lines: lines.length };
  });
  const toggle = document.querySelector('[data-cm-tl-toggle]');
  return { names, marks, toggle: toggle ? toggle.getBoundingClientRect().height : null };
});
/** Animations running inside the report card or the timeline. */
const runningOnReport = page => page.evaluate(() => {
  const card = document.querySelector('[data-cm-timeline]')?.closest('.max-w-md') ?? document.body;
  return document.getAnimations().filter(an => an.playState === 'running' && an.effect?.target && card.contains(an.effect.target))
    .map(an => `${an.effect.target.tagName.toLowerCase()}.${String(an.effect.target.className).split(' ').slice(0, 3).join('.')} ${an.animationName ?? an.transitionProperty ?? ''}`);
});
const heightOf = page => page.evaluate(() => document.documentElement.scrollHeight);
/** Waits for the live viewer to say it is at a stage, by its attribute alone (no visibility rule). */
const stageIs = (page, value, timeout = 45000) => page.waitForFunction(v => [...document.querySelectorAll('[data-cm-live-stage]')]
  .some(el => el.getAttribute('data-cm-live-stage') === v), value, { timeout });
/** What the page shows when a step stops: the stages present and the first visible buttons. */
const whereAmI = page => page.evaluate(() => {
  const stages = [...document.querySelectorAll('[data-cm-live-stage]')].map(el => `${el.getAttribute('data-cm-live-stage')}@${el.getAttribute('data-cm-live-minute')}`);
  const buttons = [...document.querySelectorAll('button')].filter(b => b.offsetParent !== null).map(b => b.textContent.trim().slice(0, 24)).filter(Boolean).slice(0, 14);
  return `stages [${stages.join(', ')}], buttons [${buttons.join(' | ')}]`;
}).catch(() => 'the page could not be read');
const scrollYOf = page => page.evaluate(() => window.scrollY);
const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);

/* ---- one save at one size ---- */
const heights = [];
async function walk(save, width, height, reduced) {
  const id = `${save.name}-${width}${reduced ? '-rm' : ''}`;
  const touch = width < 1000;
  const me = save.fxHome !== false;
  const firstSide = me ? 'me' : 'opp';
  const order2 = me ? ['me', 'opp'] : ['opp', 'me'];
  const word2 = me ? ['mine', 'theirs'] : ['theirs', 'mine'];
  const names2 = me ? [save.club, save.opponent] : [save.opponent, save.club];
  const assert = (ok, what) => (save.assert ? check(ok, `${id}: ${what}`) : ok);
  const context = await browser.newContext({
    viewport: { width, height }, isMobile: touch, hasTouch: touch, reducedMotion: reduced ? 'reduce' : 'no-preference',
    colorScheme: 'dark', serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: KEY, value: save.raw }, { name: 'cookie-consent', value: 'essential' }, { name: 'dukb-theme', value: 'dark' }] }] },
  });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === BASE) return route.continue();
    if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.continue();
    return route.abort('blockedbyclient');
  });
  await context.routeWebSocket('**/*', socket => socket.close());
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on('pageerror', err => errors.push(String(err)));
  await page.addInitScript(now => {
    const Old = Date;
    window.Date = class extends Old { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
  }, NOW);
  const shot = async (screen, full = false) => page.screenshot({ path: path.join(OUT, `${id}-${screen}.jpg`), type: 'jpeg', quality: 60, fullPage: full }).catch(() => {});
  const act = async locator => { await locator.waitFor({ timeout: 45000 }); if (touch) await locator.tap(); else await locator.click(); };
  const visibleButton = name => page.locator('button:visible').filter({ hasText: new RegExp(`^\\s*${name}\\s*$`) }).first();
  const row = { id, screens: {} };
  let step = 'the hub';
  try {
    /* The hub. */
    await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    for (let i = 0; i < 3 && await page.locator('[role="dialog"][data-state="open"]').count(); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(250); }
    await act(page.locator('[data-testid="cm-slot-1"]').getByRole('button', { name: 'Resume Career', exact: true }));
    await page.locator('[data-cm-next-match]').waitFor({ timeout: 45000 });
    await page.evaluate(() => document.fonts.ready);
    if (CONTROL === 'swap') {
      const swapped = await page.evaluate(() => {
        const n = [...document.querySelectorAll('[data-cm-next-match] [data-cm-next-side]')];
        if (n.length !== 2) return false;
        n[0].parentNode.insertBefore(n[1], n[0]);
        return true;
      });
      if (!swapped) cannotRun('PLAY_MATCHDAY_CONTROL=swap: the hub card does not hold two named sides');
    }
    const hub = await readHub(page);
    const hubOk = !!hub && same(hub.sides, order2) && same(hub.texts, names2) && hub.mine.includes('text-primary');
    if (!hubOk && CONTROL === 'swap') fired.swap += 1;
    assert(hubOk, `the hub card reads ${hub ? `${hub.texts.join(' vs ')} (${hub.sides.join(' ')}), my name ${hub.mine.includes('text-primary') ? 'green' : 'not green'}` : 'nothing'}, not ${names2.join(' vs ')}`);
    row.screens.hub = await heightOf(page);
    await shot('hub');
    if (CONTROL === 'swap') return row;

    /* The Match Centre: the tie, the form rows and the ones to watch. */
    step = 'the Match Centre';
    await act(page.locator('button:visible').filter({ hasText: 'Match Centre: form' }).first());
    await page.locator('[data-cm-mc-side]').first().waitFor({ timeout: 20000 });
    const centre = await readCentre(page);
    const sidesWant = centre.sides.length === 6 ? [...order2, ...order2, ...order2] : [...order2, ...order2];
    assert(same(centre.sides, sidesWant) && same(centre.tie, names2), `the Match Centre reads ${centre.tie.join(' vs ')} (${centre.sides.join(' ')})`);
    row.screens.centre = await heightOf(page);
    await shot('centre');

    /* Play Live: the strip, the digits, the line under the pitch at 320 and 390, the full stats at 1280. */
    await act(page.locator('button:visible[data-cm-way="live"]').first());
    step = 'kick off'; await stageIs(page, 'first');
    await page.waitForTimeout(1200);
    const live = await readLive(page);
    assert(same(live.names, names2) && same(live.mineGreen, me ? [true, false] : [false, true]), `the strip reads ${live.names.join(' v ')} (green ${live.mineGreen.join(' ')})`);
    assert(same(live.digits, order2), `the strip's digits read ${live.digits.join(' then ')}`);
    assert(same(live.poss, word2) && live.cells.length > 0 && live.cells.every(c => c === word2[0]), `the full stats read ${live.poss.join(' ')} and cells ${[...new Set(live.cells)].join(' ')}`);
    assert(same([live.statsHead[0], live.statsHead[2]], names2), `the full stats' header reads ${live.statsHead.join(' | ')}`);
    if (width < 1000) assert(live.lineShown && live.lineBoldFirst === me, `the line under the pitch ${live.lineShown ? `has my number ${live.lineBoldFirst ? 'first' : 'second'}` : 'is not shown'}`);
    row.screens.live = await heightOf(page);
    await shot('live');

    /* Skip to the interval: the live card and the dressing room's card. */
    await act(visibleButton('Skip'));
    step = 'the interval'; await stageIs(page, 'interval');
    await page.waitForTimeout(600);
    const iv = await readInterval(page);
    assert(same(iv.digits, order2) && same(iv.names, names2), `the interval card reads ${iv.names.join(' vs ')} (${iv.digits.join(' then ')})`);
    assert(iv.row.length === 3 && same([iv.row[0], iv.row[2]], names2), `the dressing room's card reads ${iv.row.join(' | ')}`);
    row.screens.interval = await heightOf(page);
    await shot('interval');

    /* Second half, then on to the report whatever the night brings (extra time, penalties). */
    step = 'the second half';
    await act(visibleButton('Second half'));
    const deadline = Date.now() + 90000;
    while (Date.now() < deadline) {
      if (await page.locator('[data-cm-timeline]').count()) break;
      const report = visibleButton('Full report');
      if (await report.count()) { await act(report); await page.waitForTimeout(800); continue; }
      const skip = visibleButton('Skip');
      if (await skip.count()) { await act(skip).catch(() => {}); await page.waitForTimeout(800); continue; }
      await page.waitForTimeout(700);
    }
    if (!(await page.locator('[data-cm-timeline]').count())) { await shot('stuck'); throw new Error('the report never came'); }

    /* The report, once its verdict is in. */
    step = 'the report';
    await page.waitForTimeout(4000);
    const rep = await readReport(page);
    assert(same(rep.scoreline, names2), `the scoreline reads ${rep.scoreline.join(' v ')}`);
    assert(rep.scorers.length === 0 || same(rep.scorers, word2), `the scorer columns read ${rep.scorers.join(' ')}`);
    assert(same([rep.statsHead[0], rep.statsHead[2]], names2), `the stats header reads ${rep.statsHead.join(' | ')}`);
    assert(rep.firstBar === word2[0], `the first stat bar's first number is ${rep.firstBar}`);
    assert(same(rep.legend, word2) && same(rep.shots, word2) && (rep.best.length === 0 || same(rep.best, word2)), `the legend, shots and best read ${rep.legend.join(' ')}, ${rep.shots.join(' ')}, ${rep.best.join(' ')}`);
    assert(same([rep.timelineHead[0], rep.timelineHead[2]], names2), `the timeline's header reads ${rep.timelineHead.join(' | ')}`);
    const wrongRows = rep.rows.filter(r => r.inFirst !== (r.side === firstSide));
    assert(rep.rows.length > 0 && wrongRows.length === 0, `${wrongRows.length} of ${rep.rows.length} timeline rows sit in the wrong column`);
    if (reduced) {
      const running = await runningOnReport(page);
      assert(running.length === 0, `with reduced motion ${running.length} animations still run on the report: ${running.slice(0, 3).join('; ')}`);
    }
    row.screens.report = await heightOf(page);
    await shot('report');

    /* The page never jumps: a settle on the report, then the toggle. */
    let y0 = await scrollYOf(page);
    if (CONTROL === 'jump') await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForTimeout(1500);
    let y1 = await scrollYOf(page);
    if (y1 !== y0 && CONTROL === 'jump') fired.jump += 1;
    assert(y1 === y0, `the report moved the page from ${y0} to ${y1} while nothing was tapped`);
    if (CONTROL === 'jump') return row;

    /* The timeline: whole names, marks on the last line, a 44 px toggle. */
    step = 'the timeline';
    if (CONTROL === 'cut') {
      const n = await page.evaluate(() => {
        const names = document.querySelectorAll('[data-cm-tl-name]');
        if (!names.length) return 0;
        const style = document.createElement('style');
        style.textContent = '[data-cm-tl-name]{display:inline-block;max-width:4em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;vertical-align:bottom}';
        document.head.appendChild(style);
        return names.length;
      });
      if (!n) cannotRun('PLAY_MATCHDAY_CONTROL=cut: the timeline holds no name');
    }
    const tl = await readNames(page);
    const cut = tl.names.filter(n => n.over > 1 || n.ellipsis);
    if (cut.length && CONTROL === 'cut') fired.cut += 1;
    assert(tl.names.length > 0 && cut.length === 0, `${cut.length} of ${tl.names.length} timeline names are cut: ${cut.slice(0, 3).map(n => n.text).join('; ')}`);
    if (CONTROL === 'cut') return row;
    const offLine = tl.marks.filter(m => !m.onLast && !m.forced);
    assert(offLine.length === 0, `${offLine.length} of ${tl.marks.length} marks are off their name's last line with room for them on it: ${offLine.slice(0, 3).map(m => m.name).join('; ')}`);
    row.forced = tl.marks.filter(m => m.forced).length;
    if (tl.toggle !== null) {
      assert(tl.toggle >= 44, `the timeline toggle is ${tl.toggle.toFixed(1)} px tall`);
      y0 = await scrollYOf(page);
      await page.evaluate(() => document.querySelector('[data-cm-tl-toggle]').click());
      await page.waitForTimeout(800);
      y1 = await scrollYOf(page);
      assert(y1 === y0, `the timeline toggle moved the page from ${y0} to ${y1}`);
      await page.locator('[data-cm-timeline]').screenshot({ path: path.join(OUT, `${id}-timeline.jpg`), type: 'jpeg', quality: 60 }).catch(() => {});
    }
    row.marks = tl.marks.length;
    row.names = tl.names.length;
  } catch (err) {
    assert(false, `the walk stopped at ${step}: ${String(err.message).split('\n')[0]}; ${await whereAmI(page)}`);
    await shot('error');
  } finally {
    assert(errors.length === 0, `page errors: ${errors.slice(0, 2).join(' | ')}`);
    await context.close();
  }
  return row;
}

/* ---- the base comparison (MATCHDAY_COMPARE_DIST=<the base build's dist>): text under 12 px never more on the head,
   the save after the same seeded taps equal on both builds, the document heights printed side by side ---- */
const smallText = page => page.evaluate(() => {
  let n = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const el = t.parentElement;
    if (!t.textContent.trim() || !el || el.closest('.sr-only, script, style')) continue;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    if (!r.width || !r.height || s.visibility === 'hidden') continue;
    if (parseFloat(s.fontSize) < 12) n += 1;
  }
  return n;
});
function firstDiff(x, y, at = '') {
  if (JSON.stringify(x) === JSON.stringify(y)) return null;
  if (x && y && typeof x === 'object' && typeof y === 'object') {
    for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) {
      const d = firstDiff(x[k], y[k], `${at}.${k}`);
      if (d) return d;
    }
  }
  return `${at || '(root)'}: ${JSON.stringify(x)?.slice(0, 80)} against ${JSON.stringify(y)?.slice(0, 80)}`;
}
/** The same taps on any build, Math.random seeded at load and again on every tap, the clock fixed. */
async function seededWalk(url, save, width, height) {
  const touch = width < 1000;
  const context = await browser.newContext({
    viewport: { width, height }, isMobile: touch, hasTouch: touch, colorScheme: 'dark', serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: url, localStorage: [{ name: KEY, value: save.raw }, { name: 'cookie-consent', value: 'essential' }, { name: 'dukb-theme', value: 'dark' }] }] },
  });
  await context.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.origin === url || ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(u.hostname)) return route.continue();
    return route.abort('blockedbyclient');
  });
  await context.routeWebSocket('**/*', socket => socket.close());
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  await page.addInitScript(now => {
    const Old = Date;
    window.Date = class extends Old { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
    const seeded = seed => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
    let taps = 0;
    Math.random = seeded(1340);
    document.addEventListener('click', () => { taps += 1; Math.random = seeded(1340 + taps * 7919); }, true);
  }, NOW);
  const act = async locator => { await locator.waitFor({ timeout: 45000 }); if (touch) await locator.tap(); else await locator.click(); };
  const button = name => page.locator('button:visible').filter({ hasText: new RegExp(`^\\s*${name}\\s*$`) }).first();
  const screens = {};
  const measure = async key => { screens[key] = { small: await smallText(page), height: await heightOf(page) }; };
  try {
    await page.goto(`${url}/club-manager`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    for (let i = 0; i < 3 && await page.locator('[role="dialog"][data-state="open"]').count(); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(250); }
    await act(page.locator('[data-testid="cm-slot-1"]').getByRole('button', { name: 'Resume Career', exact: true }));
    await page.locator('[data-cm-hub]').waitFor({ timeout: 45000 });
    await page.waitForTimeout(1500);
    await measure('hub');
    await act(page.locator('button:visible').filter({ hasText: 'Match Centre: form' }).first());
    await page.getByText('Engine odds', { exact: false }).first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(800);
    await measure('centre');
    await act(page.locator('button:visible[data-cm-way="live"]').first());
    await stageIs(page, 'first');
    await page.waitForTimeout(1200);
    await measure('live');
    await act(button('Skip'));
    await stageIs(page, 'interval');
    await page.waitForTimeout(600);
    await measure('interval');
    await act(button('Second half'));
    const deadline = Date.now() + 90000;
    while (Date.now() < deadline && !(await page.locator('[data-cm-timeline]').count())) {
      if (await button('Full report').count()) await act(button('Full report'));
      else if (await button('Skip').count()) await act(button('Skip')).catch(() => {});
      await page.waitForTimeout(800);
    }
    await page.locator('[data-cm-timeline]').waitFor({ timeout: 5000 });
    await page.waitForTimeout(4000);
    await measure('report');
    return { screens, save: await page.evaluate(k => localStorage.getItem(k), KEY) };
  } catch (err) {
    return { screens, save: null, error: String(err.message).split('\n')[0] };
  } finally {
    await context.close();
  }
}
const COMPARE = process.env.MATCHDAY_COMPARE_DIST || '';
/* ---- save D: the Stats tile at 320 ---- */
/** The hub's Stats tile on save D: its line holds the leader's pitch name and wraps to at most two lines. Under
 *  PLAY_MATCHDAY_CONTROL=fullname the line is set to his whole name in the DOM, after the tile is found. */
async function walkTile(width, height) {
  const id = `D-${width}`;
  const context = await browser.newContext({
    viewport: { width, height }, isMobile: true, hasTouch: true, colorScheme: 'dark', serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: KEY, value: saveD.raw }, { name: 'cookie-consent', value: 'essential' }, { name: 'dukb-theme', value: 'dark' }] }] },
  });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === BASE || ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.continue();
    return route.abort('blockedbyclient');
  });
  await context.routeWebSocket('**/*', socket => socket.close());
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  await page.addInitScript(now => {
    const Old = Date;
    window.Date = class extends Old { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
  }, NOW);
  try {
    await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    for (let i = 0; i < 3 && await page.locator('[role="dialog"][data-state="open"]').count(); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(250); }
    await page.locator('[data-testid="cm-slot-1"]').getByRole('button', { name: 'Resume Career', exact: true }).tap();
    await page.locator('[data-cm-next-match]').waitFor({ timeout: 45000 });
    await page.evaluate(() => document.fonts.ready);
    const tile = await page.evaluate(({ control, whole }) => {
      const root = document.querySelector('[data-testid="cm-show-slots"]')?.closest('header')?.parentElement;
      for (const b of root ? root.querySelectorAll('.grid > button') : []) {
        const divs = [...b.querySelectorAll(':scope > div')];
        const i = divs.findIndex(d => d.classList.contains('uppercase'));
        if (i < 0 || divs[i].textContent.trim() !== 'Stats' || !divs[i + 2]) continue;
        const sub = divs[i + 2];
        if (control) sub.textContent = whole;
        const cs = getComputedStyle(sub);
        const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
        b.scrollIntoView({ block: 'center' });
        return { text: sub.innerText.trim(), lines: Math.round(sub.getBoundingClientRect().height / lh), h: Math.round(b.getBoundingClientRect().height) };
      }
      return null;
    }, { control: CONTROL === 'fullname', whole: `${TILE_MAN} leads with ${TILE_GOALS}` });
    await page.screenshot({ path: path.join(OUT, `${id}${CONTROL ? `-${CONTROL}` : ''}-stats.jpg`), type: 'jpeg', quality: 60 }).catch(() => {});
    if (!check(!!tile, `${id}: the hub has no Stats tile`)) return;
    console.log(`${id}: the Stats tile reads "${tile.text}" on ${tile.lines} line(s), the tile ${tile.h} px tall`);
    if (CONTROL !== 'fullname') check(tile.text === saveD.line, `${id}: the Stats tile reads "${tile.text}", not "${saveD.line}"`);
    const fits = check(tile.lines <= 2, `${id}: the Stats tile's line wraps to ${tile.lines} lines ("${tile.text}")`);
    if (!fits && CONTROL === 'fullname') fired.fullname += 1;
  } catch (e) {
    check(false, `${id}: the Stats tile walk stopped (${String(e.message).split('\n')[0]})`);
  } finally {
    await context.close();
  }
}

if (COMPARE) {
  if (!fs.existsSync(path.join(COMPARE, 'index.html'))) cannotRun(`MATCHDAY_COMPARE_DIST=${COMPARE} holds no index.html`);
  const BASE_URL = await serveDist(COMPARE);
  /* The stream is only comparable if one build gives the same save twice. */
  const once = await seededWalk(BASE, saves[0], 390, 844);
  const twice = await seededWalk(BASE, saves[0], 390, 844);
  if (!once.save || !twice.save) cannotRun(`the seeded walk did not finish on the head (${once.error ?? twice.error})`);
  const noise = firstDiff(JSON.parse(once.save), JSON.parse(twice.save));
  console.log(`one build twice, save A at 390: ${noise ? `the saves differ at ${noise}` : 'the same save to the byte'}`);
  if (noise) cannotRun('the seeded save is not stable on one build, so head against base cannot be judged');
  for (const save of saves.filter(s => s.assert)) {
    for (const [w, h] of SIZES_ALL) {
      const head = await seededWalk(BASE, save, w, h);
      const base = await seededWalk(BASE_URL, save, w, h);
      const id = `${save.name}-${w}`;
      check(!head.error && !base.error, `${id}: a seeded walk stopped (head: ${head.error ?? 'fine'}, base: ${base.error ?? 'fine'})`);
      for (const key of Object.keys(base.screens)) {
        const hs = head.screens[key];
        const bs = base.screens[key];
        console.log(`${id} ${key}: text under 12 px head ${hs?.small ?? '-'} base ${bs.small}; height head ${hs?.height ?? '-'} base ${bs.height}`);
        check(!!hs && hs.small <= bs.small, `${id} ${key}: ${hs?.small} text nodes under 12 px on the head against ${bs.small} on the base`);
      }
      if (head.save && base.save) {
        const d = firstDiff(JSON.parse(head.save), JSON.parse(base.save));
        check(!d, `${id}: the save after the same seeded taps differs from the base's at ${d}`);
        if (!d) console.log(`${id}: the save after the walk is the base's to the byte (${head.save.length} bytes)`);
      }
    }
  }
  await browser.close();
  if (failures.length) { console.log(`playCmMatchDay compare: RED, ${failures.length} failures`); process.exit(1); }
  console.log(`playCmMatchDay compare: green. Against ${COMPARE}: no screen has more text under 12 px, and every save after the same seeded taps is the base's`);
  process.exit(0);
}

/* ---- the walks ---- */
const SIZES = SIZES_ALL;
const runs = [];
if (CONTROL === 'fullname') { /* save D alone, below */ } else if (CONTROL) runs.push([saves[0], 390, 844, false]);
else {
  for (const save of saves) for (const [w, h] of SIZES) runs.push([save, w, h, false]);
  for (const save of saves.filter(s => s.assert)) runs.push([save, 390, 844, true]);
}
const t0 = Date.now();
for (const [save, w, h, rm] of runs) {
  const row = await walk(save, w, h, rm);
  heights.push(row);
  console.log(`${row.id}: heights ${Object.entries(row.screens).map(([k, v]) => `${k} ${v}`).join(', ')}${row.names !== undefined ? `; ${row.names} timeline names, ${row.marks} marks (${row.forced ?? 0} on the next line, no room on the last)` : ''}`);
}
if (!CONTROL || CONTROL === 'fullname') await walkTile(320, 640);
await browser.close();
fs.writeFileSync(path.join(OUT, 'heights.json'), JSON.stringify(heights, null, 2));
console.log(`${runs.length} walks, ${checks} checks, ${((Date.now() - t0) / 1000).toFixed(0)}s; pictures in ${OUT}`);
if (CONTROL) {
  console.log(`control ${CONTROL}: fired ${fired[CONTROL]} time(s)`);
  if (fired[CONTROL] > 0) { console.log(`playCmMatchDay: CONTROL ${CONTROL} FIRED`); process.exit(1); }
  console.log(`playCmMatchDay: CONTROL ${CONTROL} DID NOT FIRE`);
  process.exit(3);
}
if (failures.length) { console.log(`playCmMatchDay: RED, ${failures.length} failures`); process.exit(1); }
console.log(`playCmMatchDay: green. ${runs.length} walks over ${saves.length} saves, every match day screen home side first, whole names on the timeline, a 44 px toggle, the page never moved`);
process.exit(0);
