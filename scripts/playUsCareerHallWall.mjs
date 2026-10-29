/* Round 1570: the Hall wall, walked in a real browser on a served build, on all four US career routes.
 *
 * Asserted at 390 by 844 (touch) and 1280 by 900; measured and reported at 320 by 640.
 *   A  an active save six seasons in, retired with Hang them up now and its confirmation; the Hall card's headline
 *      is on the page; Start over's prompt says the card stays on the Hall wall; confirmed, the create screen's
 *      top is in view under the menu bar (1569's R1 measure); the wall opener below Enter the draft is at least
 *      44 by 44; opened cold (the first open of the visit), the wall's top is in view below the 48 px bar with no
 *      sideways scroll; the "?" shows the four lines; a tile opens the plaque, whose headline is the card's; Back
 *      gives the tile focus and moves scrollY by at most 1 px; a reload keeps the wall's bytes and its tiles.
 *   B  a retired save: the retirement screen's opener, scrolled to and pressed once the card has landed, opens
 *      the wall cold with its top in view; Start over pressed on the wall closes it and lands on the create
 *      screen with its top in view and "Hall wall (1)" below Enter the draft.
 *   C  a stored wall of 12 with 24 letter names: the whole grid fits the screen without a scroll and no tile line
 *      is cut (390 and 1280; 320 reported), and the
 *      layout shift of the create screen at 1280 by 900 with that wall and with none is reported.
 * After each screen: a screenshot in $RC_OUT (or .tmp-fx/play-hall-wall) to LOOK at.
 *
 * Saves are built in Node on this tree's engines from one seeded stream a route. The live database host is
 * aborted, anything else off the served origin gets an empty answer.
 *
 * Control PLAY_CONTROL=nowall: an init script makes every write of a key ending -my-career-hall-v1 throw. The
 * "stays" check and the opener check must fail and nothing else (scripts/lib/servedCodeControl.mjs); the walk
 * stops each journey there, and B and C do not run under it.
 *
 * Needs dist/ (a plain vite build). Run: node scripts/playUsCareerHallWall.mjs (ONLY=/nba-my-career for one route;
 * in Git Bash prefix MSYS_NO_PATHCONV=1).
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
import { controlledChecks } from './lib/servedCodeControl.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.PLAY_CONTROL || '';
if (CONTROL && CONTROL !== 'nowall') { console.error(`Unknown control ${CONTROL}`); process.exit(2); }
const OUT = path.resolve(process.env.RC_OUT || path.join(ROOT, '.tmp-fx/play-hall-wall'));
fs.mkdirSync(OUT, { recursive: true });
if (!fs.existsSync(path.join(ROOT, 'dist/index.html'))) { console.error('Build dist before this walk. Refusing to run.'); process.exit(2); }

const bundle = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hall-wall-walk-')), 'engine.cjs');
await build({
  stdin: { contents: `
    export { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
    export { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
    export { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
    export { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
    export { pendingTalk } from '@/lib/usCareerRetirementFlow';
    export { defaultAppearance } from '@/lib/soccerCareerAppearance';
    export { hallRecordFor } from '@/lib/careerHallOfFame';
    export { hallWallEntry, hallWallKey } from '@/lib/usCareerHallWall';
    export { hallHeadline } from '@/components/career/HallOfFameCard';
  `, resolveDir: ROOT, sourcefile: 'play-hall-wall-engine.tsx', loader: 'tsx' },
  outfile: bundle, bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent', jsx: 'automatic', alias: { '@': path.join(ROOT, 'src') },
});
if (/supabase\.co/.test(fs.readFileSync(bundle, 'utf-8'))) { console.error('The engine bundle reaches the live database host. Refusing to run.'); process.exit(2); }
const M = createRequire(import.meta.url)(bundle);
const ONLY = process.env.ONLY || '';
const SPORTS = [M.NBA_CAREER_SPORT, M.NFL_CAREER_SPORT, M.MLB_CAREER_SPORT, M.NHL_CAREER_SPORT].filter(s => !ONLY || ONLY === `/${s.gameSlug}`);
if (!SPORTS.length) { console.error(`ONLY=${ONLY} names no US career route (Git Bash: prefix MSYS_NO_PATHCONV=1)`); process.exit(2); }

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** Six seasons in, outside the talk rule and the hard stop, with a salt: the board shows Hang them up now. */
function activeCareer(sport, seed) {
  for (let s = seed; s < seed + 300; s += 1) {
    const rng = mulberry32(s), pos = sport.create.defaultPos;
    const c = sport.startCareer(`Wall Walk ${s}`, pos, sport.create.archetypes[pos][0], rng, M.defaultAppearance(), 'now');
    c.summerSalt = `walk${s}`;
    let tq = sport.rollTeamQuality(null, rng);
    sport.assignRole(c, tq, rng);
    for (let y = 0; y < 6; y += 1) { sport.campBattle(c, tq, rng); sport.simSeason(c, tq, rng); sport.progress(c, rng); tq = sport.rollTeamQuality(tq, rng); }
    c.pendingRivalryEvent = null; c.pendingRivalryChoice = null; c.suspendedSeasons = 0; c.contractYears = 3; delete c.summer;
    if (c.retired || sport.shouldRetire(c) || M.pendingTalk(c, sport.hall)) continue;
    return { c, tq };
  }
  throw new Error(`${sport.slug}: no active career outside the talk rule`);
}
const saveOf = (c, tq, phase) => JSON.stringify({ c, phase, teamQuality: tq, coach: null });
/** Twelve plaques: one engine career's plaque under twelve keys and names. */
function wallOf12(sport) {
  const { c } = activeCareer(sport, 1700); c.retired = true;
  const base = M.hallWallEntry(sport, c);
  /* 24 letters, the create screen's cap, so the tiles' wrapping is walked at its worst (the run lens saw 11 of 12
     such names cut at 390 before the tile lines wrapped). */
  return JSON.stringify({ v: 1, entries: Array.from({ length: 12 }, (_, i) => ({ ...base, key: `walk-${i}`, name: `Christopher Vandenberg ${String.fromCharCode(65 + i)}` })) });
}

const port = await new Promise((resolve, reject) => {
  const probe = createServer(); probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => { const chosen = probe.address().port; probe.close(error => (error ? reject(error) : resolve(chosen))); });
});
const BASE = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let serverLog = '';
server.stderr.on('data', data => { serverLog += data; });
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`the server did not start within 20 seconds: ${serverLog}`)), 20000);
  server.once('exit', code => { clearTimeout(timer); reject(new Error(`the server exited ${code}: ${serverLog}`)); });
  server.stdout.on('data', data => { serverLog += data; if (String(data).includes('host-like server:')) { clearTimeout(timer); resolve(); } });
});

const { say, verdict } = controlledChecks(CONTROL);
const proof = CONTROL ? { nowall: 0 } : {};
const SIZES = [{ width: 390, height: 844, touch: true, assert: true }, { width: 1280, height: 900, touch: false, assert: true }, { width: 320, height: 640, touch: true, assert: false }];
const NOWALL = "(() => { window.__wallRefused = 0; const real = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (String(k).endsWith('-my-career-hall-v1')) { window.__wallRefused += 1; throw new DOMException('refused', 'QuotaExceededError'); } return real.call(this, k, v); }; })();";
const measured = [];

async function open(browser, sport, size, items) {
  const route = `/${sport.gameSlug}`;
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height }, isMobile: size.touch, hasTouch: size.touch, deviceScaleFactor: 1, serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [
      ...items, { name: `rules-gate-seen:${route}`, value: '1' }, { name: 'cookie-consent', value: 'essential' },
    ] }] },
  });
  if (CONTROL === 'nowall') await context.addInitScript(NOWALL);
  await context.route('**/*', r => {
    const url = r.request().url();
    if (/supabase\.co/.test(url)) return r.abort();
    if (new URL(url).origin === BASE) return r.continue();
    const type = r.request().resourceType();
    return r.fulfill({ status: 200, contentType: type === 'stylesheet' ? 'text/css' : 'application/json', body: type === 'stylesheet' ? '' : '[]' });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
  return { context, page, errors };
}
const box = (page, sel) => page.evaluate(s => { const r = document.querySelector(s)?.getBoundingClientRect(); return r ? { top: r.top, bottom: r.bottom, width: r.width, height: r.height } : null; }, sel);
const view = page => page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, ih: innerHeight, y: scrollY }));
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`) });
/** The check, asserted at 390 and 1280 and only reported at 320. */
const sayAt = (size, ok, what, guarded = false) => (size.assert ? say(ok, what, guarded) : console.log(`  MEASURED  ${what}: ${ok ? 'holds' : 'does not hold'}`));
const tap = (size, locator) => (size.touch ? locator.tap() : locator.click());

/** The wall's top under the 48 px bar and on screen, no sideways scroll. */
async function wallInView(page, size, id) {
  await page.waitForSelector('[data-career-hall-wall]');
  await page.waitForTimeout(700);
  const r = await box(page, '[data-career-hall-wall]'), v = await view(page);
  measured.push(`${id}: wall top ${Math.round(r.top)} of ${v.ih}, page ${v.sw} wide on ${v.iw}`);
  sayAt(size, r.top >= 40 && r.top <= v.ih - 120, `${id}: the wall's top is in view under the bar (${Math.round(r.top)} of ${v.ih})`);
  sayAt(size, v.sw <= v.iw, `${id}: no sideways scroll on the wall (${v.sw} on ${v.iw})`);
}

async function journeyA(browser, sport, size) {
  const id = `A ${sport.slug} ${size.width}`, tag = `A-${sport.slug}-${size.width}`;
  const { c, tq } = activeCareer(sport, 1570);
  const { context, page, errors } = await open(browser, sport, size, [{ name: sport.saveKey, value: saveOf(c, tq, 'season') }]);
  try {
    await tap(size, page.getByRole('button', { name: /Hang them up now/ }));
    await tap(size, page.getByRole('alertdialog').getByRole('button', { name: 'Retire this player' }));
    await page.waitForFunction(k => JSON.parse(localStorage.getItem(k) || '{}').phase === 'retired', sport.saveKey);
    const retired = JSON.parse(await page.evaluate(k => localStorage.getItem(k), sport.saveKey)).c;
    const headline = M.hallHeadline(M.hallRecordFor(sport.hall, retired), sport.hall.rules);
    await page.waitForFunction(h => [...document.querySelectorAll('h3')].some(x => x.textContent === h), headline);
    /* The wall's rules load after the retirement (the lazy fallback of r1570-s5a), so the plaque goes up a moment
       later: wait for it (or, under the control, for its refused write) before the prompt is read. */
    if (CONTROL) {
      await page.waitForFunction(() => (window.__wallRefused || 0) > 0);
      proof.nowall += await page.evaluate(() => window.__wallRefused || 0);
    } else await page.waitForFunction(k => !!localStorage.getItem(k), M.hallWallKey(sport.slug));
    await tap(size, page.locator('[data-career-start-over] button'));
    const words = await page.getByRole('alertdialog').innerText();
    sayAt(size, words.includes('The Hall of Fame card stays on your Hall wall.'), `${id}: Start over says the card stays on the Hall wall`, true);
    await tap(size, page.getByRole('alertdialog').getByRole('button', { name: 'Start new career' }));
    await page.getByRole('button', { name: 'Enter the draft' }).waitFor();
    await page.waitForTimeout(700);
    const top = await page.getByText('Create your player').first().boundingBox(), v = await view(page);
    sayAt(size, !!top && top.y >= 0 && top.y < v.ih - 60, `${id}: the create screen's top is in view after the restart (${Math.round(top?.y ?? -1)} of ${v.ih})`);
    const opener = page.locator('[data-career-hall-wall-opener="create"]');
    const has = await opener.count() === 1;
    if (has) await opener.scrollIntoViewIfNeeded();
    const ob = has ? await box(page, '[data-career-hall-wall-opener="create"]') : null;
    sayAt(size, !!ob && ob.width >= 44 && ob.height >= 44, `${id}: the create screen offers the wall below Enter the draft, ${ob ? `${Math.round(ob.width)} by ${Math.round(ob.height)}` : 'missing'}`, true);
    if (CONTROL || !has) return;
    await tap(size, opener);
    await wallInView(page, size, `${id} cold from create`);
    await shot(page, `${tag}-1-wall`);
    await tap(size, page.getByRole('button', { name: 'How the Hall wall works' }));
    const help = await page.locator('[data-career-hall-wall-help]').innerText();
    sayAt(size, help.split('\n').filter(Boolean).length === 4 && help.includes('The wall holds 12.') && help.includes('Example:'), `${id}: the "?" shows the four lines`);
    await shot(page, `${tag}-2-help`);
    const yBefore = (await view(page)).y;
    await tap(size, page.locator('[data-career-hall-wall-tile]').first());
    await page.waitForSelector('[data-career-hall-wall-plaque]');
    const said = await page.locator('[data-career-hall-wall-headline]').innerText();
    sayAt(size, said === headline, `${id}: the plaque's headline is the card's ("${said}")`);
    await shot(page, `${tag}-3-plaque`);
    await tap(size, page.getByRole('button', { name: 'Back to the wall' }));
    await page.waitForTimeout(500);
    const focused = await page.evaluate(() => document.activeElement?.hasAttribute('data-career-hall-wall-tile') ?? false), yAfter = (await view(page)).y;
    sayAt(size, focused && Math.abs(yAfter - yBefore) <= 1, `${id}: Back gives the tile focus, scrollY ${yBefore} then ${yAfter}`);
    const bytes = await page.evaluate(k => localStorage.getItem(k), M.hallWallKey(sport.slug));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-career-hall-wall-opener="create"]').waitFor();
    const again = await page.evaluate(k => localStorage.getItem(k), M.hallWallKey(sport.slug));
    await tap(size, page.locator('[data-career-hall-wall-opener="create"]'));
    await page.waitForSelector('[data-career-hall-wall-tile]');
    sayAt(size, again === bytes && await page.locator('[data-career-hall-wall-tile]').count() === 1, `${id}: a reload keeps the wall's bytes and its one tile`);
  } finally {
    sayAt(size, errors.length === 0, `${id}: no page error ${errors.join(' | ').slice(0, 160)}`);
    await context.close();
  }
}

async function journeyB(browser, sport, size) {
  const id = `B ${sport.slug} ${size.width}`;
  const { c } = activeCareer(sport, 1580); c.retired = true;
  const { context, page, errors } = await open(browser, sport, size, [{ name: sport.saveKey, value: saveOf(c, null, 'retired') }]);
  try {
    const opener = page.locator('[data-career-hall-wall-opener="retired"]');
    await opener.waitFor();
    await page.waitForFunction(() => !document.querySelector('[data-career-hall-wall-opener="retired"]')?.disabled, null, { timeout: 20000 });
    await opener.scrollIntoViewIfNeeded();
    const ob = await box(page, '[data-career-hall-wall-opener="retired"]');
    sayAt(size, ob.height >= 44, `${id}: the retirement screen's opener is ${Math.round(ob.height)} px tall`);
    await tap(size, opener);
    await wallInView(page, size, `${id} cold from the retirement screen`);
    await shot(page, `B-${sport.slug}-${size.width}-wall`);
    /* Critic correction 2, measured in a real browser (the read lens, finding 8): Start over pressed ON the wall
       closes the wall and lands on the create screen with its top in view and the wall's opener there. */
    await page.waitForFunction(k => !!localStorage.getItem(k), M.hallWallKey(sport.slug));
    await tap(size, page.locator('[data-career-start-over] button'));
    await tap(size, page.getByRole('alertdialog').getByRole('button', { name: 'Start new career' }));
    await page.getByRole('button', { name: 'Enter the draft' }).waitFor();
    await page.waitForTimeout(700);
    const top = await page.getByText('Create your player').first().boundingBox(), v = await view(page);
    const closed = await page.locator('[data-career-hall-wall]').count() === 0;
    const opener1 = (await page.locator('[data-career-hall-wall-opener="create"]').textContent())?.includes('Hall wall (1)') ?? false;
    sayAt(size, closed && opener1 && !!top && top.y >= 0 && top.y < v.ih - 60,
      `${id}: Start over on the wall lands on create, top in view (${Math.round(top?.y ?? -1)} of ${v.ih}), wall closed ${closed}, opener reads 1 ${opener1}`);
    await shot(page, `B-${sport.slug}-${size.width}-after-start-over`);
  } finally {
    sayAt(size, errors.length === 0, `${id}: no page error ${errors.join(' | ').slice(0, 160)}`);
    await context.close();
  }
}

const shift = page => page.evaluate(() => new Promise(resolve => {
  let total = 0;
  new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) total += e.value; }).observe({ type: 'layout-shift', buffered: true });
  setTimeout(() => resolve(Math.round(total * 10000) / 10000), 300);
}));
async function journeyC(browser, sport, size) {
  const id = `C ${sport.slug} ${size.width}`;
  const { context, page, errors } = await open(browser, sport, size, [{ name: M.hallWallKey(sport.slug), value: wallOf12(sport) }]);
  try {
    const opener = page.locator('[data-career-hall-wall-opener="create"]');
    await opener.waitFor();
    await page.waitForTimeout(1500);
    if (size.width === 1280) {
      const withWall = await shift(page);
      const bare = await open(browser, sport, size, []);
      await bare.page.getByRole('button', { name: 'Enter the draft' }).waitFor();
      await bare.page.waitForTimeout(1500);
      const none = await shift(bare.page);
      await bare.context.close();
      measured.push(`${id}: layout shift of the create screen ${withWall} with a wall of 12, ${none} with none`);
    }
    await opener.scrollIntoViewIfNeeded();
    await tap(size, opener);
    await page.waitForSelector('[data-career-hall-wall-tile]');
    await page.waitForTimeout(700);
    const fit = await page.evaluate(() => {
      const tiles = [...document.querySelectorAll('[data-career-hall-wall-tile]')].map(t => t.getBoundingClientRect());
      const wall = document.querySelector('[data-career-hall-wall]').getBoundingClientRect();
      const cut = [...document.querySelectorAll('[data-career-hall-wall-tile] span')].filter(s => s.scrollWidth > s.clientWidth + 1).length;
      return { n: tiles.length, top: wall.top, bottom: Math.max(...tiles.map(r => r.bottom)), ih: innerHeight, tileH: Math.min(...tiles.map(r => r.height)), cut };
    });
    sayAt(size, fit.cut === 0, `${id}: no tile line is cut (${fit.cut} lines wider than their box)`);
    measured.push(`${id}: 12 tiles from ${Math.round(fit.top)} to ${Math.round(fit.bottom)} of ${fit.ih}, the shortest tile ${Math.round(fit.tileH)} px`);
    sayAt(size, fit.n === 12 && fit.top >= 40 && fit.bottom <= fit.ih, `${id}: the whole wall of 12 fits the screen (${Math.round(fit.top)} to ${Math.round(fit.bottom)} of ${fit.ih})`);
    sayAt(size, fit.tileH >= 44, `${id}: every tile is at least 44 px tall (${Math.round(fit.tileH)})`);
    await shot(page, `C-${sport.slug}-${size.width}-wall-of-12`);
  } finally {
    sayAt(size, errors.length === 0, `${id}: no page error ${errors.join(' | ').slice(0, 160)}`);
    await context.close();
  }
}

const browser = await chromium.launch();
try {
  for (const sport of SPORTS) for (const size of SIZES) {
    console.log(`${sport.gameSlug} at ${size.width} by ${size.height}`);
    await journeyA(browser, sport, size);
    if (CONTROL) continue;
    await journeyB(browser, sport, size);
    await journeyC(browser, sport, size);
  }
} catch (err) {
  say(false, `the walk stopped: ${String(err && err.message).split('\n')[0]}`);
} finally {
  await browser.close();
  server.kill();
}
for (const line of measured) console.log(`  MEASURED  ${line}`);
console.log(`screenshots in ${OUT}`);
process.exit(verdict('playUsCareerHallWall', proof, { minGuarded: 2 * SPORTS.length * 2 }));
