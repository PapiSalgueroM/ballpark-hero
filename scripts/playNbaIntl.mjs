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
 * Saves are built in Node by the real NBA engine. The live database host is aborted; anything else off the
 * served origin gets an empty answer.
 *
 * Controls, each on a SECOND dist built from a tree copy that is never committed (PLAY_INTL_DIST names it):
 *   PLAY_INTL_CONTROL=nobeat   the board ignores sport.intl            walk (a) at 390 must find no call
 *   PLAY_INTL_CONTROL=lowbar   the gate's bar is 95                   walk (a) at 390 must find no call
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
if (CONTROL && CONTROL !== 'nobeat' && CONTROL !== 'lowbar') { console.error(`Unknown control ${CONTROL}`); process.exit(2); }
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

async function open(browser, size, saveValue) {
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
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'domcontentloaded' });
  return { context, page, errors };
}

const SCREEN = '[data-intl-call], [data-intl-result], [data-intl-holding]';
/** (e) on the screen now up: sideways scroll, control heights, text sizes, nothing cut, the top in view. */
async function look(id, size, page, errors, name, arrival = true) {
  const m = await page.evaluate(sel => {
    const box = document.querySelector(sel);
    const r = box?.getBoundingClientRect();
    const small = [];
    const cut = [];
    const lowButtons = [];
    for (const el of box ? [box, ...box.querySelectorAll('*')] : []) {
      const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (own && fs < 12) small.push(`${el.tagName.toLowerCase()} ${fs}px "${el.textContent.trim().slice(0, 30)}"`);
      const er = el.getBoundingClientRect();
      if (er.width > 0 && (er.left < -1 || er.right > innerWidth + 1)) cut.push(`${el.tagName.toLowerCase()} ${Math.round(er.left)} to ${Math.round(er.right)}`);
      if (el.tagName === 'BUTTON' && er.height > 0 && er.height < 44) lowButtons.push(`"${el.textContent.trim().slice(0, 24)}" ${Math.round(er.height)}px`);
    }
    return { sw: document.documentElement.scrollWidth, iw: innerWidth, ih: innerHeight, sy: scrollY, top: r ? r.top : null, small, cut, lowButtons };
  }, SCREEN);
  if (m.top === null) { fail(id, `${name}: no national team screen is up`); return m; }
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

const browser = await chromium.launch();
let exit = 0;
try {
  if (CONTROL) {
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
    console.log(`  screenshots in ${OUT}: ${shots.join(' ')}`);
    console.log(failures ? `playNbaIntl: RED, ${failures} failures` : `playNbaIntl: green. The call, Go and its result's views, Rest, a reload mid beat, the 2027 World Cup's lines and no call at 80 or in 2005, at 320, 390 and 1280; ${shots.length} screenshots to look at.`);
    exit = failures ? 1 : 0;
  }
} finally {
  await browser.close();
  server.kill();
}
process.exit(exit);
