/* Round 1544: the national team's call on /nba-my-career, walked in a real browser on a served build
 * (brief-1541 3.7's walk, cut to Part B1; the Trophy Case rows and the International tile are Round 1557's).
 *
 *   (a) a throwback save after the season labelled 2003, rated 90, with its summer dealt: the holding box, then
 *       the call for the 2004 Olympics in the same place; Go, the result, Your games and Back, The bracket (a
 *       group and Back) and Back, Continue to the summer's card. At 320 by 640, 390 by 844 and 1280 by 900.
 *       Then a reload mid beat asks again.
 *   (b) Rest: the row says went false, no result, the hub.
 *   (c) a modern save after the season labelled 2026: the 2027 World Cup call carries the generated field
 *       line and the format line.
 *   (d) rated 80 after 2003, and after the season labelled 2004 (no edition in 2005): no call, nothing of the
 *       national team on screen.
 *   (e) on every screen of (a): no sideways scroll, every control at least 44 px tall, no text of the two new
 *       screens or the holding box under 12 px, nothing cut at the sides, the screen's top in view on its
 *       arrival, and the holding box never moves the page (scrollY the same when the card lands; the face's
 *       chunk is held back 900 ms so the box is really seen). A screenshot of each screen goes to $RC_OUT (or
 *       .tmp-fx/play-nba-intl) to LOOK at.
 *
 *   (f) Round 1557, the medal on the shelf, at the three sizes: a throwback save that went to Athens and came
 *       home with a medal (the first seed from 1544 up, answered Go in Node through the real face; it prints
 *       which) and rested in 2006. The hub tile counts the medal once; the case shows its row with 2004 and the
 *       International tile; the view lists the summers with the case and the badges gone; the 2004 summer opens
 *       its result (Your games there, so it played again) and its Back is the list, the list's Back the case;
 *       the screens obey (e), except that the case's own row markup (10 and 11 px since Round 208) is exempt
 *       from the 12 px rule by name (critic correction 8) and only the International tile is held to it; the
 *       save is not written.
 *   (g) Round 1557 (1544's review, minor 6), at 320 and 390, the page's Math.random seeded: four fresh careers
 *       rated 96 and a save one season before the 2006 World Championship at 95, Play, then the curtain's
 *       Continue alone: the screen that takes the curtain's place (whatever it is) arrives with its top in
 *       view. It prints where, and fails when fewer than 2 runs at 320 were measured from a scrolled page.
 *
 * Saves are built in Node by the real NBA engine. The live database host is aborted; anything else off the
 * served origin gets an empty answer.
 *
 * Controls, each on a SECOND dist built from a tree copy that is never committed (PLAY_INTL_DIST names it):
 *   PLAY_INTL_CONTROL=nobeat   the board ignores sport.intl            walk (a) at 390 must find no call
 *   PLAY_INTL_CONTROL=lowbar   the gate's bar is 95                   walk (a) at 390 must find no call
 *   PLAY_INTL_CONTROL=nocurtain  the board's revealRef key without its curtain term   walk (g) must fail from
 *                              at least 2 measured scrolled runs at 320 (Round 1557's fix)
 * A control prints "CONTROL <name> FIRED" and exits 1, or "DID NOT FIRE" and exits 3. Exit 2: could not run.
 *
 * Needs dist/ (a plain vite build). Run: ENGINES=chromium node scripts/playNbaIntl.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.PLAY_INTL_CONTROL || '';
if (CONTROL && CONTROL !== 'nobeat' && CONTROL !== 'lowbar' && CONTROL !== 'nocurtain') { console.error(`Unknown control ${CONTROL}`); process.exit(2); }
const DIST = path.resolve(process.env.PLAY_INTL_DIST || path.join(ROOT, 'dist'));
if (CONTROL && !process.env.PLAY_INTL_DIST) { console.error('A control runs on its own dist: set PLAY_INTL_DIST. Refusing to run.'); process.exit(2); }
const OUT = path.resolve(process.env.RC_OUT || path.join(ROOT, '.tmp-fx/play-nba-intl'));
fs.mkdirSync(OUT, { recursive: true });
if (!fs.existsSync(path.join(DIST, 'index.html'))) { console.error(`Build ${DIST} before this walk. Refusing to run.`); process.exit(2); }

const bundle = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'nba-intl-walk-')), 'engine.cjs');
await build({
  stdin: { contents: `
    export { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
    export { startSummer } from '@/lib/usCareerSummer';
    export { defaultAppearance } from '@/lib/soccerCareerAppearance';
    export { NBA_CAREER_INTL } from '@/lib/nbaCareerIntl';
  `, resolveDir: ROOT, sourcefile: 'play-nba-intl-engine.ts', loader: 'ts' },
  outfile: bundle, bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') },
});
if (/supabase\.co/.test(fs.readFileSync(bundle, 'utf-8'))) { console.error('The engine bundle reaches the live database host. Refusing to run.'); process.exit(2); }
const M = createRequire(import.meta.url)(bundle);
const sport = M.NBA_CAREER_SPORT;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** A career after `seasons` seasons in `era`, its last season rated `ovr`; `deal` deals the summer as the press does. */
function career(era, seasons, ovr, deal) {
  const rng = mulberry32(1544);
  const pos = 'SF';
  const c = sport.startCareer('Intl Walker', pos, sport.create.archetypes[pos][0], rng, M.defaultAppearance(), era);
  let tq = sport.rollTeamQuality(null, rng);
  sport.assignRole(c, tq, rng);
  for (let y = 0; y < seasons; y += 1) {
    sport.campBattle(c, tq, rng); sport.simSeason(c, tq, rng); sport.progress(c, rng); tq = sport.rollTeamQuality(tq, rng);
  }
  const line = c.seasons[c.seasons.length - 1];
  line.ovr = ovr;
  if (line.teamResult === 'SUSPENDED') line.teamResult = 'Missed the playoffs';
  Object.assign(c, { ovr, age: 24, health: 90, retired: false, suspendedSeasons: 0, contractYears: 3, pendingRivalryEvent: null, pendingRivalryChoice: null });
  let phase = 'season';
  if (deal && M.startSummer(c, sport, rng, null)) phase = 'event';
  return { save: JSON.stringify({ c, phase, teamQuality: tq, coach: null }), c, phase, last: line.year, pending: sport.intl.pendingYear(c) };
}
/* Round 1557: a career that went to Athens and came home with a medal (the first seed from 1544 up whose 2004
   summer, answered Go in Node through the real face, gives one), then two more seasons and the 2006 call
   rested if it came, so the case has a medal row, the hub tile counts it, and the International view holds a
   summer to open (its tournament plays again from the save) beside a rested one or alone. */
function medalCareer() {
  const F = M.NBA_CAREER_INTL;
  for (let seed = 1544; seed < 1644; seed += 1) {
    const rng = mulberry32(seed);
    const c = sport.startCareer('Intl Walker', 'SF', sport.create.archetypes.SF[0], rng, M.defaultAppearance(), 'y2004');
    let tq = sport.rollTeamQuality(null, rng);
    sport.assignRole(c, tq, rng);
    sport.campBattle(c, tq, rng); sport.simSeason(c, tq, rng); sport.progress(c, rng); tq = sport.rollTeamQuality(tq, rng);
    const first = c.seasons[c.seasons.length - 1];
    first.ovr = 92;
    if (first.teamResult === 'SUSPENDED') first.teamResult = 'Missed the playoffs';
    Object.assign(c, { ovr: 92, age: 24, health: 90, retired: false, suspendedSeasons: 0, contractYears: 3, pendingRivalryEvent: null, pendingRivalryChoice: null });
    if (!F.pending(c)) continue;
    const went = F.answer(c, 'go');
    if (!went || !['gold', 'silver', 'bronze'].includes(went.row.place)) continue;
    for (let y = 0; y < 2; y += 1) { sport.campBattle(c, tq, rng); sport.simSeason(c, tq, rng); sport.progress(c, rng); tq = sport.rollTeamQuality(tq, rng); }
    const line = c.seasons[c.seasons.length - 1];
    if (line.teamResult === 'SUSPENDED') line.teamResult = 'Missed the playoffs';
    Object.assign(c, { retired: false, suspendedSeasons: 0, contractYears: 3, pendingRivalryEvent: null, pendingRivalryChoice: null, health: Math.max(c.health, 60) });
    if (F.pending(c)) F.answer(c, 'rest');
    if (F.pending(c) || sport.intl.pendingYear(c) !== null) continue;
    const replays = !!F.tournamentOf(c, 2004);
    const awards = c.seasons.reduce((n, s) => n + (s.awards?.length ?? 0), 0);
    return { save: JSON.stringify({ c, phase: 'season', teamQuality: tq, coach: null }), c, seed, place: went.row.place, rows: c.intl.summers.length, replays, tile: sport.ringsOf(c) + awards + 1 };
  }
  return null;
}
const E = medalCareer();
if (!E || !E.replays) { console.error(`No seed from 1544 to 1643 gave a medal in 2004 whose tournament plays again (${E ? 'it does not replay' : 'none found'}). Refusing to run.`); process.exit(2); }
console.log(`save E: seed ${E.seed}, ${E.place} in 2004, ${E.rows} summer rows, the tile should read ${E.tile} honours`);
const A = career('y2004', 1, 90, true);
const B = career('y2004', 1, 90, false);
const C = career('now', 1, 90, false);
const D1 = career('y2004', 1, 80, false);
const D2 = career('y2004', 2, 95, false);
const setup = [['A', A, 2004, 'event'], ['B', B, 2004, 'season'], ['C', C, 2027, 'season'], ['D1', D1, null, 'season'], ['D2', D2, null, 'season']];
let setupBad = 0;
for (const [id, s, want, phase] of setup) {
  const ok = s.pending === want && s.phase === phase;
  console.log(`save ${id}: last season ${s.last}, phase ${s.phase}, the gate's call ${s.pending ?? 'none'}${ok ? '' : ` (WANTED ${want ?? 'none'} in ${phase})`}`);
  if (!ok) setupBad += 1;
}
if (setupBad) { console.error('The planted saves are not the ones this walk needs. Refusing to run.'); process.exit(2); }

let failures = 0;
const fail = (id, what) => { failures += 1; console.error(`  FAIL ${id}: ${what}`); };
const shots = [];

const port = await new Promise((resolve, reject) => {
  const probe = createServer(); probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => { const chosen = probe.address().port; probe.close(error => (error ? reject(error) : resolve(chosen))); });
});
const BASE = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', DIST, String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let serverLog = '';
server.stderr.on('data', data => { serverLog += data; });
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`the server did not start within 20 seconds: ${serverLog}`)), 20000);
  server.once('exit', code => { clearTimeout(timer); reject(new Error(`the server exited ${code}: ${serverLog}`)); });
  server.stdout.on('data', data => { serverLog += data; if (String(data).includes('host-like server:')) { clearTimeout(timer); resolve(); } });
});

const SIZES = [{ width: 320, height: 640, touch: true }, { width: 390, height: 844, touch: true }, { width: 1280, height: 900, touch: false }];
const ROUTE = '/nba-my-career';

async function open(browser, size, saveValue, randomSeed = null) {
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height }, isMobile: size.touch, hasTouch: size.touch, deviceScaleFactor: 1, serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [
      { name: sport.saveKey, value: saveValue },
      { name: `rules-gate-seen:${ROUTE}`, value: '1' }, { name: 'cookie-consent', value: 'essential' },
    ] }] },
  });
  await context.route('**/*', r => {
    const url = r.request().url();
    if (/supabase\.co/.test(url)) return r.abort();
    if (new URL(url).origin === BASE) return r.continue();
    const type = r.request().resourceType();
    return r.fulfill({ status: 200, contentType: type === 'stylesheet' ? 'text/css' : 'application/json', body: type === 'stylesheet' ? '' : '[]' });
  });
  /* The face's chunk is held back so the holding box is on screen long enough to be measured. */
  await context.route(/\/assets\/nbaCareerIntl-[^/]+\.js$/, async r => { await new Promise(res => setTimeout(res, 900)); await r.continue(); });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  /* Round 1557's fix: walk (g) seeds the page's Math.random, so its season (and the screen after the curtain) is
     the same on every run and on every dist. */
  if (randomSeed !== null) {
    await page.addInitScript(seed => {
      let a = seed >>> 0;
      Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    }, randomSeed);
  }
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'domcontentloaded' });
  return { context, page, errors };
}

const SCREEN = '[data-intl-call], [data-intl-result], [data-intl-holding]';
/** (e) on the screen now up: sideways scroll, control heights, text sizes, nothing cut, the top in view. */
/* Round 1557: sel names the screen (the case and the International view are not national team screens), and
   smallSel, when set, scopes the 12 px rule to the new text in it: the case's medal rows draw in the case's own
   row markup (10 and 11 px since Round 208), exempt by name under critic correction 8. */
async function look(id, size, page, errors, name, arrival = true, sel = SCREEN, smallSel = null) {
  const m = await page.evaluate(({ sel, smallSel }) => {
    const box = document.querySelector(sel);
    const r = box?.getBoundingClientRect();
    const small = [];
    const cut = [];
    const lowButtons = [];
    for (const el of box ? [box, ...box.querySelectorAll('*')] : []) {
      const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (own && fs < 12 && (!smallSel || el.closest(smallSel))) small.push(`${el.tagName.toLowerCase()} ${fs}px "${el.textContent.trim().slice(0, 30)}"`);
      const er = el.getBoundingClientRect();
      if (er.width > 0 && (er.left < -1 || er.right > innerWidth + 1)) cut.push(`${el.tagName.toLowerCase()} ${Math.round(er.left)} to ${Math.round(er.right)}`);
      if (el.tagName === 'BUTTON' && er.height > 0 && er.height < 44) lowButtons.push(`"${el.textContent.trim().slice(0, 24)}" ${Math.round(er.height)}px`);
    }
    return { sw: document.documentElement.scrollWidth, iw: innerWidth, ih: innerHeight, sy: scrollY, top: r ? r.top : null, small, cut, lowButtons };
  }, { sel, smallSel });
  if (m.top === null) { fail(id, `${name}: no screen ${sel} is up`); return m; }
  if (m.sw > m.iw) fail(id, `${name}: the page scrolls sideways (${m.sw} wide in ${m.iw})`);
  if (m.lowButtons.length) fail(id, `${name}: controls under 44 px: ${m.lowButtons.join(', ')}`);
  if (m.small.length) fail(id, `${name}: text under 12 px: ${m.small.slice(0, 4).join(', ')}`);
  if (m.cut.length) fail(id, `${name}: cut at the sides: ${m.cut.slice(0, 4).join(', ')}`);
  if (arrival && (m.top < -1 || m.top > m.ih * 0.6)) fail(id, `${name}: the screen's top arrived at ${Math.round(m.top)} in a ${m.ih} high view`);
  if (errors.length) fail(id, `${name}: page errors ${errors.slice(0, 2).join(' | ')}`);
  const file = `${id}-${name}.png`;
  await page.screenshot({ path: path.join(OUT, file), fullPage: false });
  shots.push(file);
  return m;
}
const tap = async (size, locator) => { if (size.touch) await locator.tap(); else await locator.click(); };
const settle = page => page.waitForTimeout(900);

const readSave = page => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), sport.saveKey);
const text = page => page.evaluate(() => document.querySelector('main')?.innerText ?? document.body.innerText);
const hubUp = async page => await page.locator('button:has-text("Play the")').count() > 0;

/** (a): the call, Go, the result's views, Continue to the summer's card. Returns whether the call came. */
async function walkA(browser, size) {
  const id = `a-${size.width}`;
  const { context, page, errors } = await open(browser, size, A.save);
  try {
    await page.waitForSelector('[data-intl-holding], [data-intl-call]', { timeout: 12000 });
    const held = await page.locator('[data-intl-holding]').count() > 0;
    const y0 = await page.evaluate(() => scrollY);
    if (held) await look(id, size, page, errors, '1-holding', false);
    else fail(id, 'the holding box was never seen (the face landed first)');
    await page.waitForSelector('[data-intl-call]', { timeout: 12000 });
    await page.waitForTimeout(400);
    const y1 = await page.evaluate(() => scrollY);
    if (Math.abs(y1 - y0) > 1) fail(id, `the card landing moved the page from ${y0} to ${y1}`);
    await look(id, size, page, errors, '2-call', false);
    const t = await text(page);
    if (!t.includes('the 2004 Olympics in Athens')) fail(id, 'the call does not name the 2004 Olympics in Athens');
    if (/Team USA|USA Basketball|Dream Team/.test(t)) fail(id, 'a word the round bans is on screen');
    await tap(size, page.locator('[data-intl-answer="go"]'));
    await page.waitForSelector('[data-intl-result]');
    await settle(page);
    await look(id, size, page, errors, '3-result');
    const s = await readSave(page);
    const row = s?.c?.intl?.summers?.[0];
    if (!row || row.year !== 2004 || row.edition !== 'oly-2004' || row.went !== true) fail(id, `the save's row is ${JSON.stringify(row)}`);
    if (s?.phase !== 'event') fail(id, `the save's phase is ${s?.phase}, not the event it had`);
    await tap(size, page.locator('[data-intl-tile="games"]'));
    await page.waitForSelector('[data-intl-view="games"]');
    await settle(page);
    await look(id, size, page, errors, '4-games');
    const games = await page.locator('[data-intl-view="games"] li').count();
    if (games !== row?.games) fail(id, `Your games lists ${games} games, the row says ${row?.games}`);
    await tap(size, page.locator('[data-intl-back]'));
    await page.waitForSelector('[data-intl-view="main"]');
    await settle(page);
    await tap(size, page.locator('[data-intl-tile="bracket"]'));
    await page.waitForSelector('[data-intl-view="bracket"]');
    await settle(page);
    await look(id, size, page, errors, '5-bracket');
    const other = page.locator('[data-intl-tile^="group-"], [data-intl-tile^="round-"]');
    if (await other.count() < 1) fail(id, 'the bracket offers no other group or round');
    else {
      await tap(size, other.first());
      await page.waitForSelector('[data-intl-view^="group:"], [data-intl-view^="round:"]');
      await settle(page);
      await look(id, size, page, errors, '6-group-or-round');
      await tap(size, page.locator('[data-intl-back]'));
      await page.waitForSelector('[data-intl-view="bracket"]');
    }
    await tap(size, page.locator('[data-intl-back]'));
    await page.waitForSelector('[data-intl-view="main"]');
    await tap(size, page.locator('[data-intl-continue]'));
    await page.waitForTimeout(1200);
    if (await page.locator(SCREEN).count()) fail(id, 'Continue left a national team screen up');
    const card = await page.locator('[data-career-event], [data-career-decision-option]').count();
    if (!card) fail(id, 'Continue did not go on to the summer\'s card');
    await page.screenshot({ path: path.join(OUT, `${id}-7-summer-card.png`) });
    shots.push(`${id}-7-summer-card.png`);
    return true;
  } catch (e) {
    fail(id, `the walk stopped: ${String(e).split('\n')[0].slice(0, 160)}`);
    return false;
  } finally { await context.close(); }
}

async function walkReload(browser, size) {
  const id = `reload-${size.width}`;
  const { context, page, errors } = await open(browser, size, A.save);
  try {
    await page.waitForSelector('[data-intl-call]', { timeout: 12000 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-intl-call]', { timeout: 12000 });
    await look(id, size, page, errors, 'asked-again', false);
    if ((await readSave(page))?.c?.intl) fail(id, 'a reload mid beat wrote a summer row');
  } catch (e) { fail(id, `the walk stopped: ${String(e).split('\n')[0].slice(0, 160)}`); } finally { await context.close(); }
}

async function walkB(browser, size) {
  const id = `b-${size.width}`;
  const { context, page, errors } = await open(browser, size, B.save);
  try {
    await page.waitForSelector('[data-intl-call]', { timeout: 12000 });
    await tap(size, page.locator('[data-intl-answer="rest"]'));
    await page.waitForTimeout(1200);
    const s = await readSave(page);
    if (JSON.stringify(s?.c?.intl) !== JSON.stringify({ v: 1, summers: [{ year: 2004, edition: 'oly-2004', went: false }] })) fail(id, `Rest saved ${JSON.stringify(s?.c?.intl)}`);
    if (await page.locator('[data-intl-result]').count()) fail(id, 'Rest showed a result');
    if (!(await hubUp(page))) fail(id, 'Rest did not go on to the hub');
    if (errors.length) fail(id, `page errors ${errors.slice(0, 2).join(' | ')}`);
    await page.screenshot({ path: path.join(OUT, `${id}-hub.png`) });
    shots.push(`${id}-hub.png`);
  } catch (e) { fail(id, `the walk stopped: ${String(e).split('\n')[0].slice(0, 160)}`); } finally { await context.close(); }
}

async function walkC(browser, size) {
  const id = `c-${size.width}`;
  const { context, page, errors } = await open(browser, size, C.save);
  try {
    await page.waitForSelector('[data-intl-call]', { timeout: 12000 });
    await settle(page);
    await look(id, size, page, errors, 'call-2027', false);
    const t = await text(page);
    if (!t.includes('the 2027 Basketball World Cup in Qatar')) fail(id, 'the call does not name the 2027 World Cup in Qatar');
    if (!t.includes('This field is the game\'s own.')) fail(id, 'the generated field line is missing');
    /* the review of Round 1544: no page read holds 2027's format, so the call must not claim two group rounds */
    if (t.includes('two group rounds')) fail(id, 'the call claims a format the ledger has no source for');
  } catch (e) { fail(id, `the walk stopped: ${String(e).split('\n')[0].slice(0, 160)}`); } finally { await context.close(); }
}

async function walkD(browser, size, s, name) {
  const id = `d-${name}-${size.width}`;
  const { context, page } = await open(browser, size, s.save);
  try {
    await page.waitForSelector('button:has-text("Play the")', { timeout: 15000 });
    await page.waitForTimeout(1500);
    if (await page.locator(SCREEN).count()) fail(id, 'a national team screen came up');
  } catch (e) { fail(id, `the walk stopped: ${String(e).split('\n')[0].slice(0, 160)}`); } finally { await context.close(); }
}

/** (f) Round 1557: the medal on the shelf. The hub tile counts it once; the case shows its row and the
 *  International tile; the view lists the summers (the case and the badges are gone, never stacked under it);
 *  the 2004 summer opens its result with Back to the list; the list's Back is the case again. */
async function walkCase(browser, size) {
  const id = `f-${size.width}`;
  const { context, page, errors } = await open(browser, size, E.save);
  try {
    await page.waitForSelector('button:has-text("Play the")', { timeout: 15000 });
    await page.waitForTimeout(1200);
    const loaded = JSON.stringify(await readSave(page));
    const want = `${E.tile} ${E.tile === 1 ? 'honour' : 'honours'}`;
    const tile = page.locator('button:has(div.uppercase)').filter({ hasText: /Trophy Case/i }).first();
    const tileText = (await tile.innerText()).replace(/\s+/g, ' ');
    if (!tileText.includes(want)) fail(id, `the hub tile reads "${tileText}", not ${want}`);
    await tap(size, tile);
    await page.waitForSelector('[data-trophy-case]');
    await settle(page);
    const caseText = await page.locator('[data-trophy-case]').innerText();
    const medalWord = `Olympic ${E.place}`;
    if (!caseText.includes(medalWord) || !caseText.includes('2004')) fail(id, `the case has no "${medalWord}" row with 2004`);
    if (await page.locator('[data-intl-open]').count() !== 1) fail(id, 'the case has no International tile');
    await look(id, size, page, errors, '1-case', true, '[data-trophy-case]', '[data-intl-open]');
    await tap(size, page.locator('[data-intl-open]'));
    await page.waitForSelector('[data-intl-summers-view="list"]');
    await settle(page);
    if (await page.locator('[data-trophy-case], [data-career-badge]').count()) fail(id, 'the International view stacks over the case or the badges');
    if (await page.locator('[data-intl-summer="2004"]').count() !== 1) fail(id, 'the list has no 2004 summer to open');
    await look(id, size, page, errors, '2-international', true, '[data-intl-summers-view]');
    await tap(size, page.locator('[data-intl-summer="2004"]'));
    await page.waitForSelector('[data-intl-result]');
    await settle(page);
    if (await page.locator(`[data-intl-place="${E.place}"]`).count() !== 1) fail(id, `the 2004 result does not say ${E.place}`);
    if (await page.locator('[data-intl-tile="games"]').count() !== 1) fail(id, 'the 2004 result offers no Your games: its tournament did not play again');
    await look(id, size, page, errors, '3-summer-2004');
    const backLabel = (await page.locator('[data-intl-continue]').innerText()).trim();
    if (backLabel !== 'Back') fail(id, `the result's button reads "${backLabel}", not Back`);
    await tap(size, page.locator('[data-intl-continue]'));
    await page.waitForSelector('[data-intl-summers-view="list"]');
    await settle(page);
    await look(id, size, page, errors, '4-back-to-list', true, '[data-intl-summers-view]');
    await tap(size, page.locator('[data-intl-summers-back]'));
    await page.waitForSelector('[data-trophy-case]');
    await settle(page);
    if (await page.locator('[data-intl-summers-view]').count()) fail(id, 'Back left the International view up');
    await look(id, size, page, errors, '5-back-to-case', true, '[data-trophy-case]', '[data-intl-open]');
    const t = await text(page);
    if (/Team USA|USA Basketball|Dream Team/.test(t)) fail(id, 'a word the round bans is on screen');
    if (JSON.stringify(await readSave(page)) !== loaded) fail(id, 'looking at the shelf wrote the save');
  } catch (e) { fail(id, `the walk stopped: ${String(e).split('\n')[0].slice(0, 160)}`); } finally { await context.close(); }
}

/** (g) Round 1557 (1544's review, minor 6): the curtain closing is a screen change of its own, so the screen that
 *  takes its place (a rivalry card, the call, the summer's card, whatever the season dealt) arrives with its top in
 *  view. Rebuilt by 1557's fix (review-run-1557, major 1): the first draft played an unseeded season, tapped on
 *  through later screens (and a tap scrolls its own button into view, doing the hook's work for it) and returned
 *  green when no call came, so it stayed green with the curtain's key term removed. Now the page's Math.random is
 *  seeded, and the walk measures the curtain's OWN wrapper (the board reuses that div for the next screen, which is
 *  why only a key term can move it) right after the curtain's Continue and before any other tap. The runs at 320
 *  are the ones that can show a jump: the curtain is taller than the screen there, so its Continue is tapped with
 *  the page scrolled down. Measured on the head by review-run-1557 (r1557-run-e, the same careers and seeds):
 *  Continue tapped at scrollY 351, 427, 465 and 432, then 185 with the next card whole; without the term the page
 *  stays put and the card's heading is above the screen. A run whose next screen is not in that wrapper (the hub)
 *  is printed, not measured, and fewer than CURTAIN_FLOOR measured scrolled runs at 320 is a failure: a walk that
 *  measured nothing proves nothing. */
const CURTAIN_FLOOR = 2;
/** A fresh 'now' career rated 96 (review-run-1557's arrive2 careers: seed 4400 + k, Math.random 900 + k). */
function freshCareer(seed) {
  const rng = mulberry32(seed);
  const c = sport.startCareer('Intl Walker', 'SF', sport.create.archetypes.SF[0], rng, M.defaultAppearance(), 'now');
  const tq = sport.rollTeamQuality(null, rng);
  sport.assignRole(c, tq, rng);
  Object.assign(c, { ovr: 96, pot: 99, age: 24, health: 95 });
  return JSON.stringify({ c, phase: 'season', teamQuality: tq, coach: null });
}
async function walkCurtain(browser, size, saveValue, randomSeed, tag) {
  const id = `g-${size.width}-${tag}`;
  const { context, page, errors } = await open(browser, size, saveValue, randomSeed);
  try {
    await tap(size, page.locator('button:has-text("Play the")').first());
    await page.waitForSelector('[data-season-reveal]', { timeout: 15000 });
    const cont = page.locator('[data-season-reveal] button', { hasText: 'Continue' }).first();
    await cont.waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(3500);
    await page.evaluate(() => { window.__curtainWrap = document.querySelector('[data-season-reveal]').parentElement; });
    await tap(size, cont);
    const tappedAt = await page.evaluate(() => Math.round(scrollY));
    await page.waitForTimeout(1500);
    const m = await page.evaluate(() => {
      const w = window.__curtainWrap;
      const r = w && w.isConnected && !w.querySelector('[data-season-reveal]') ? w.getBoundingClientRect() : null;
      const what = !r ? (document.querySelector('[data-season-reveal]') ? 'the curtain still up' : 'a screen outside the curtain\'s wrapper (the hub)')
        : w.querySelector('[data-intl-call]') ? 'the call' : w.querySelector('[data-intl-holding]') ? 'the holding box' : w.querySelector('[data-career-event]') || w.matches('[data-career-event]') ? 'a summer card'
        : `"${(w.innerText || '').trim().split('\n')[0].slice(0, 40)}"`;
      return { top: r && r.height > 0 ? Math.round(r.top) : null, ih: innerHeight, sy: Math.round(scrollY), what };
    });
    if (m.top === null) {
      console.log(`  ${id}: Continue tapped at scrollY ${tappedAt}; next ${m.what}, not measured (scrollY ${m.sy})`);
      return { measured: false, scrolled: false };
    }
    console.log(`  ${id}: Continue tapped at scrollY ${tappedAt}; next ${m.what} arrived with its top at ${m.top} in a ${m.ih} high view (scrollY ${m.sy})`);
    if (m.top < -1 || m.top > m.ih * 0.6) fail(id, `after the curtain ${m.what} arrived with its top at ${m.top} in a ${m.ih} high view (Continue tapped at scrollY ${tappedAt}, now ${m.sy})`);
    if (errors.length) fail(id, `page errors ${errors.slice(0, 2).join(' | ')}`);
    await page.screenshot({ path: path.join(OUT, `${id}-after-curtain.png`) });
    shots.push(`${id}-after-curtain.png`);
    return { measured: true, scrolled: tappedAt > 0 };
  } catch (e) { fail(id, `the walk stopped: ${String(e).split('\n')[0].slice(0, 160)}`); return { measured: false, scrolled: false }; } finally { await context.close(); }
}
/** (g) at 320 (four fresh careers, the ones that can jump) and 390 (two, where the curtain fits), then D2's 2006
 *  call at both. Fails when fewer than CURTAIN_FLOOR runs at 320 were measured from a scrolled page. */
async function walkCurtains(browser) {
  let scrolled320 = 0;
  for (let k = 0; k < 4; k += 1) { const r = await walkCurtain(browser, SIZES[0], freshCareer(4400 + k), 900 + k, `k${k}`); if (r.measured && r.scrolled) scrolled320 += 1; }
  for (let k = 0; k < 2; k += 1) await walkCurtain(browser, SIZES[1], freshCareer(4400 + k), 900 + k, `k${k}`);
  for (const size of SIZES.slice(0, 2)) await walkCurtain(browser, size, D2.save, 1544, 'call2006');
  console.log(`  g: ${scrolled320} runs at 320 measured from a scrolled page (floor ${CURTAIN_FLOOR})`);
  if (scrolled320 < CURTAIN_FLOOR) fail('g', `only ${scrolled320} runs at 320 measured the arrival from a scrolled page (floor ${CURTAIN_FLOOR}): the walk proves nothing`);
  return scrolled320;
}

const browser = await chromium.launch();
let exit = 0;
try {
  if (CONTROL === 'nocurtain') {
    /* Round 1557's fix: a dist without the curtain's key term must fail walk (g), from runs it really measured. */
    const before = failures;
    const scrolled = await walkCurtains(browser);
    const fired = scrolled >= CURTAIN_FLOOR && failures > before;
    console.log(`playNbaIntl: CONTROL ${CONTROL} ${fired ? 'FIRED' : 'DID NOT FIRE'} (walk (g): ${scrolled} runs at 320 measured from a scrolled page, ${failures - before} failures)`);
    exit = fired ? 1 : 3;
  } else if (CONTROL) {
    /* A control's dist cannot call: walk (a) at 390 must not find the call. */
    const before = failures;
    const came = await walkA(browser, SIZES[1]);
    const fired = !came && failures > before;
    console.log(`playNbaIntl: CONTROL ${CONTROL} ${fired ? 'FIRED' : 'DID NOT FIRE'} (walk (a) at 390 ${came ? 'still met the call' : 'met no call'}, ${failures - before} failures)`);
    exit = fired ? 1 : 3;
  } else {
    for (const size of SIZES) await walkA(browser, size);
    await walkReload(browser, SIZES[1]);
    await walkB(browser, SIZES[1]);
    await walkC(browser, SIZES[0]);
    await walkD(browser, SIZES[1], D1, 'rated80');
    await walkD(browser, SIZES[1], D2, 'summer2005');
    for (const size of SIZES) await walkCase(browser, size);
    await walkCurtains(browser);
    console.log(`  screenshots in ${OUT}: ${shots.join(' ')}`);
    console.log(failures ? `playNbaIntl: RED, ${failures} failures` : `playNbaIntl: green. The call, Go and its result's views, Rest, a reload mid beat, the 2027 World Cup's lines and no call at 80 or in 2005, at 320, 390 and 1280; ${shots.length} screenshots to look at.`);
    exit = failures ? 1 : 0;
  }
} finally {
  await browser.close();
  server.kill();
}
process.exit(exit);
