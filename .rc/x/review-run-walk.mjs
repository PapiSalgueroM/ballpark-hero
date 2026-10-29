/* Reviewer (run lens) walk of Round 1570's Hall wall, on the runner's served build (#!serve gives BASE).
 * Journeys, each a fresh context with the live database host aborted:
 *   P  a player six seasons in retires through the UI, opens the wall from the retirement screen (waiting for the
 *      card), reads the "?", opens his plaque, goes back, presses New career (the prompt must say the card stays),
 *      lands on create, opens the wall from there, reloads. All four routes at 390x844 touch with reduced motion,
 *      NBA and MLB again at 1280x900 without it.
 *   F  a stored wall of 12 REAL plaques (natural retirements, 4 Hall of Famers, 8 misses, 24 letter names) and a
 *      retired save that missed: the newcomer goes up first and the oldest miss comes down; the grid at 390, 1280
 *      and 320, a long plaque, dark mode at 390.
 *   V  a wall saved by a newer version (v 2); R  every wall write refused. Both from the retirement screen.
 * Screenshots go to RC_OUT. Exit 1 on any FAIL. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = path.resolve(process.env.RC_OUT || path.join(ROOT, '.tmp-fx/review-walk'));
fs.mkdirSync(OUT, { recursive: true });
const { chromium } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href);
const bundle = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'review-walk-')), 'engine.cjs');
await build({
  stdin: { contents: `
    export { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
    export { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
    export { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
    export { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
    export { pendingTalk } from '@/lib/usCareerRetirementFlow';
    export { defaultAppearance } from '@/lib/soccerCareerAppearance';
    export { stampHallCalibration } from '@/lib/careerHallOfFame';
    export { hallWallEntry, hallWallKey, wallKeyOf } from '@/lib/usCareerHallWall';
  `, resolveDir: ROOT, sourcefile: 'review-walk-engine.tsx', loader: 'tsx' },
  outfile: bundle, bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent', jsx: 'automatic', alias: { '@': path.join(ROOT, 'src') },
});
globalThis.localStorage = { getItem: () => null, setItem: () => undefined, removeItem: () => undefined, clear: () => undefined, key: () => null, length: 0 };
const M = createRequire(import.meta.url)(bundle);
const SPORTS = { nba: M.NBA_CAREER_SPORT, nfl: M.NFL_CAREER_SPORT, mlb: M.MLB_CAREER_SPORT, nhl: M.NHL_CAREER_SPORT };

let pass = 0, fail = 0;
const say = (ok, what) => { if (ok) pass += 1; else fail += 1; console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${what}`); };
const note = what => console.log(`  NOTE  ${what}`);
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function activeCareer(sport, seed) {
  for (let s = seed; s < seed + 300; s += 1) {
    const rng = mulberry32(s), pos = sport.create.defaultPos;
    const c = sport.startCareer(`Review Walker ${s % 100}`, pos, sport.create.archetypes[pos][0], rng, M.defaultAppearance(), 'now');
    c.summerSalt = `rw${s}`;
    let tq = sport.rollTeamQuality(null, rng);
    sport.assignRole(c, tq, rng);
    for (let y = 0; y < 6; y += 1) { sport.campBattle(c, tq, rng); sport.simSeason(c, tq, rng); sport.progress(c, rng); tq = sport.rollTeamQuality(tq, rng); }
    c.pendingRivalryEvent = null; c.pendingRivalryChoice = null; c.suspendedSeasons = 0; c.contractYears = 3; delete c.summer;
    if (c.retired || sport.shouldRetire(c) || M.pendingTalk(c, sport.hall)) continue;
    return { c, tq };
  }
  throw new Error(`${sport.slug}: no active career`);
}
/** A natural retirement (played until the engine retires him), stamped as the board's persist stamps it. */
function naturalRetired(sport, seed, name) {
  const rng = mulberry32(seed * 7 + 3);
  const positions = Object.keys(sport.create.archetypes);
  const pos = positions[seed % positions.length];
  const c = sport.startCareer(name, pos, sport.create.archetypes[pos][0], rng, M.defaultAppearance(), 'now');
  c.summerSalt = `nr${seed}`;
  let tq = sport.rollTeamQuality(null, rng);
  sport.assignRole(c, tq, rng);
  for (let y = 0; y < 40 && !sport.shouldRetire(c); y += 1) { sport.simSeason(c, tq, rng); sport.progress(c, rng); tq = sport.rollTeamQuality(tq, rng); }
  c.retired = true;
  c.pendingRivalryEvent = null; c.pendingRivalryChoice = null; delete c.summer;
  M.stampHallCalibration(c);
  return { c, tq };
}
const NAMES = ['Christopher Vandenberghe', 'Maximilian Featherstonex', 'Alessandro Montgomeryson', 'Jonathan Abernathy-Wells',
  'Demetrius Okonkwo-Bailey', 'Sebastian Wolfeschlegel', 'Theodore Rutherfordsons', 'Bartholomew Kowalczykski',
  'Fitzgerald Harrington', 'Leopold Szczepanskiewicz', 'Montgomery Fairweathers', 'Nathaniel Chamberlaine'];
const saveOf = (c, tq, phase) => JSON.stringify({ c, phase, teamQuality: tq, coach: null });

const REFUSE = "(() => { const real = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (String(k).endsWith('-my-career-hall-v1')) throw new DOMException('refused', 'QuotaExceededError'); return real.call(this, k, v); }; })()";
async function open(browser, sport, size, items, opts = {}) {
  const route = `/${sport.gameSlug}`;
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height }, isMobile: !!size.touch, hasTouch: !!size.touch, deviceScaleFactor: 1, serviceWorkers: 'block',
    reducedMotion: opts.motion ?? 'no-preference', colorScheme: opts.scheme ?? 'light',
    storageState: { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [
      ...items, { name: `rules-gate-seen:${route}`, value: '1' }, { name: 'cookie-consent', value: 'essential' },
    ] }] },
  });
  if (opts.refuse) await context.addInitScript(REFUSE);
  await context.route('**/*', r => {
    const url = r.request().url();
    if (/supabase\.co/.test(url)) return r.abort();
    if (new URL(url).origin === new URL(BASE).origin) return r.continue();
    return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
  return { context, page, errors };
}
const tap = (size, loc) => (size.touch ? loc.tap() : loc.click());
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`) });
const view = page => page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, ih: innerHeight, y: scrollY }));
const boxOf = (page, sel) => page.evaluate(s => { const r = document.querySelector(s)?.getBoundingClientRect(); return r ? { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height } : null; }, sel);
/** Tiles: inside the viewport sideways, no two overlapping, and how many of their lines are cut with an ellipsis. */
const tileReport = page => page.evaluate(() => {
  const tiles = [...document.querySelectorAll('[data-career-hall-wall-tile]')].map(t => t.getBoundingClientRect());
  let overlap = 0;
  for (let i = 0; i < tiles.length; i += 1) for (let j = i + 1; j < tiles.length; j += 1) {
    const a = tiles[i], b = tiles[j];
    if (a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5) overlap += 1;
  }
  const spans = [...document.querySelectorAll('[data-career-hall-wall-tile] span')];
  const cut = spans.filter(s => s.scrollWidth > s.clientWidth + 1).map(s => s.textContent);
  const outside = tiles.filter(r => r.left < 0 || r.right > innerWidth + 0.5).length;
  const bottom = tiles.length ? Math.max(...tiles.map(r => r.bottom)) : 0;
  return { n: tiles.length, overlap, outside, cut, bottom: Math.round(bottom), first: document.querySelector('[data-career-hall-wall-tile] span')?.textContent ?? null };
});
async function wallTop(page, size, id) {
  await page.waitForSelector('[data-career-hall-wall]');
  await page.waitForTimeout(800);
  const r = await boxOf(page, '[data-career-hall-wall]'), v = await view(page);
  say(r && r.top >= 40 && r.top <= v.ih - 120, `${id}: the wall's top is in view (${Math.round(r?.top ?? -1)} of ${v.ih})`);
  say(v.sw <= v.iw, `${id}: no sideways scroll (${v.sw} on ${v.iw})`);
}
async function waitOpener(page) {
  const opener = page.locator('[data-career-hall-wall-opener="retired"]');
  await opener.waitFor();
  const early = await opener.isDisabled();
  const t0 = Date.now();
  await page.waitForFunction(() => !document.querySelector('[data-career-hall-wall-opener="retired"]')?.disabled, null, { timeout: 25000 });
  return { opener, early, waited: Date.now() - t0 };
}

async function journeyP(browser, slug, size, motion) {
  const sport = SPORTS[slug], id = `P ${slug} ${size.width} ${motion}`, tag = `P-${slug}-${size.width}-${motion === 'reduce' ? 'rm' : 'mo'}`;
  const { c, tq } = activeCareer(sport, 1570);
  const { context, page, errors } = await open(browser, sport, size, [{ name: sport.saveKey, value: saveOf(c, tq, 'season') }], { motion });
  try {
    await tap(size, page.getByRole('button', { name: /Hang them up now/ }));
    await tap(size, page.getByRole('alertdialog').getByRole('button', { name: 'Retire this player' }));
    await page.waitForFunction(k => JSON.parse(localStorage.getItem(k) || '{}').phase === 'retired', sport.saveKey);
    await page.waitForTimeout(300);
    await shot(page, `${tag}-1-retired-top`);
    const { opener, early, waited } = await waitOpener(page);
    note(`${id}: retirement opener disabled at first sight ${early}, enabled after ${waited} ms`);
    await opener.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await shot(page, `${tag}-2-retired-opener`);
    const ob = await boxOf(page, '[data-career-hall-wall-opener="retired"]');
    say(ob && ob.height >= 44, `${id}: retirement opener ${Math.round(ob?.width ?? 0)} by ${Math.round(ob?.height ?? 0)}`);
    await tap(size, opener);
    await wallTop(page, size, `${id} wall cold from retirement`);
    const t1 = await tileReport(page);
    say(t1.n === 1 && t1.overlap === 0 && t1.outside === 0, `${id}: one tile on the wall (${JSON.stringify(t1)})`);
    say(!(await page.locator('text=This browser did not keep the wall').count()), `${id}: no "did not keep" line when the plaque is up`);
    await shot(page, `${tag}-3-wall`);
    await tap(size, page.getByRole('button', { name: 'How the Hall wall works' }));
    await shot(page, `${tag}-4-help`);
    await tap(size, page.locator('[data-career-hall-wall-tile]').first());
    await page.waitForSelector('[data-career-hall-wall-plaque]');
    await page.waitForTimeout(300);
    say((await view(page)).sw <= size.width, `${id}: plaque has no sideways scroll`);
    await shot(page, `${tag}-5-plaque`);
    await tap(size, page.getByRole('button', { name: 'Back to the wall' }));
    await page.waitForTimeout(300);
    await tap(size, page.getByRole('button', { name: 'Back to retirement' }));
    await page.waitForTimeout(500);
    const focus = await page.evaluate(() => document.activeElement?.getAttribute('data-career-hall-wall-opener'));
    say(focus === 'retired', `${id}: Back to retirement focuses the opener (${focus})`);
    await tap(size, page.getByRole('button', { name: 'New career', exact: true }));
    const words = await page.getByRole('alertdialog').innerText();
    say(words.includes('The Hall of Fame card stays on your Hall wall.'), `${id}: New career says the card stays`);
    await shot(page, `${tag}-6-prompt`);
    await tap(size, page.getByRole('alertdialog').getByRole('button', { name: 'Start new career' }));
    await page.getByRole('button', { name: 'Enter the draft' }).waitFor();
    const co = page.locator('[data-career-hall-wall-opener="create"]');
    await co.waitFor();
    say((await co.innerText()).includes('Hall wall (1)'), `${id}: create opener reads Hall wall (1)`);
    await co.scrollIntoViewIfNeeded();
    await shot(page, `${tag}-7-create-opener`);
    await tap(size, co);
    await wallTop(page, size, `${id} wall from create`);
    say(!(await page.locator('text=This browser did not keep the wall').count()), `${id}: no "did not keep" line from create`);
    await shot(page, `${tag}-8-wall-from-create`);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-career-hall-wall-opener="create"]').waitFor();
    say(true, `${id}: the create opener is back after a reload`);
  } catch (e) {
    say(false, `${id}: threw ${String(e).split('\n')[0].slice(0, 200)}`);
    await shot(page, `${tag}-ERROR`).catch(() => undefined);
  } finally {
    say(errors.length === 0, `${id}: no page error ${errors.join(' | ').slice(0, 200)}`);
    await context.close();
  }
}

/** Twelve real plaques (newest first): Hall of Famers at 1, 2, 4 and 11, misses elsewhere, so the oldest miss is
 *  index 10 and the oldest plaque (index 11) is a Hall of Famer that must stay. And a retired newcomer who missed. */
function fullWall(sport) {
  const hof = [], miss = [];
  let newcomer = null;
  for (let seed = 1; seed < 4000 && (hof.length < 4 || miss.length < 9); seed += 1) {
    const { c, tq } = naturalRetired(sport, seed, 'x');
    const e0 = M.hallWallEntry(sport, c);
    if (!e0) continue;
    const isHof = e0.hall.outcome === 'inducted';
    if (isHof && hof.length < 4) hof.push(c);
    else if (!isHof && miss.length < 9) miss.push({ c, tq });
  }
  if (hof.length < 4 || miss.length < 9) throw new Error(`${sport.slug}: found ${hof.length} Hall of Famers and ${miss.length} misses`);
  newcomer = miss.pop();
  newcomer.c.name = 'Quintavious Brightwaters';
  const order = ['m', 'h', 'h', 'm', 'h', 'm', 'm', 'm', 'm', 'm', 'm', 'h'];
  let hi = 0, mi = 0;
  const entries = order.map((k, i) => {
    const c = k === 'h' ? hof[hi++] : miss[mi++].c;
    c.name = NAMES[i];
    return M.hallWallEntry(sport, c);
  });
  return { wall: JSON.stringify({ v: 1, entries }), entries, newcomer };
}

async function journeyF(browser, slug, size, opts, tag) {
  const sport = SPORTS[slug], id = `F ${slug} ${size.width} ${opts.motion ?? ''} ${opts.scheme ?? ''}`.trim();
  const { wall, entries, newcomer } = fullWall(sport);
  const { context, page, errors } = await open(browser, sport, size, [
    { name: M.hallWallKey(sport.slug), value: wall }, { name: sport.saveKey, value: saveOf(newcomer.c, newcomer.tq, 'retired') },
  ], opts);
  try {
    const { opener } = await waitOpener(page);
    await opener.scrollIntoViewIfNeeded();
    await tap(size, opener);
    await wallTop(page, size, `${id} full wall`);
    const t = await tileReport(page);
    const stored = JSON.parse(await page.evaluate(k => localStorage.getItem(k), M.hallWallKey(sport.slug)));
    const keys = stored.entries.map(e => e.key);
    const want = [M.wallKeyOf(newcomer.c, sport.hall), ...entries.map(e => e.key).filter((_, i) => i !== 10)];
    say(JSON.stringify(keys) === JSON.stringify(want), `${id}: newcomer first, oldest miss (index 10) down, oldest Hall of Famer kept`);
    say(t.n === 12 && t.overlap === 0 && t.outside === 0, `${id}: 12 tiles, none overlapping or outside (${t.n}, ${t.overlap}, ${t.outside})`);
    say(t.bottom <= size.height || size.width === 320, `${id}: the grid ends at ${t.bottom} of ${size.height}`);
    note(`${id}: first tile "${t.first}", ${t.cut.length} cut lines: ${t.cut.slice(0, 6).join(' / ')}`);
    await shot(page, `${tag}-1-grid`);
    // The longest plaque: the most clubs and honours.
    const longest = stored.entries.map((e, i) => ({ i, n: e.teams.length + e.honours.length + e.hall.ballots.length })).sort((a, b) => b.n - a.n)[0].i;
    await tap(size, page.locator('[data-career-hall-wall-tile]').nth(longest));
    await page.waitForSelector('[data-career-hall-wall-plaque]');
    await page.waitForTimeout(400);
    const v = await view(page);
    say(v.sw <= v.iw, `${id}: the longest plaque has no sideways scroll (${v.sw} on ${v.iw})`);
    await shot(page, `${tag}-2-plaque`);
    await page.screenshot({ path: path.join(OUT, `${tag}-3-plaque-full.png`), fullPage: true });
    await tap(size, page.getByRole('button', { name: 'Back to the wall' }));
    await page.waitForTimeout(400);
    const focusTile = await page.evaluate(() => document.activeElement?.hasAttribute('data-career-hall-wall-tile') ?? false);
    say(focusTile, `${id}: Back to the wall focuses the tile`);
  } catch (e) {
    say(false, `${id}: threw ${String(e).split('\n')[0].slice(0, 200)}`);
    await shot(page, `${tag}-ERROR`).catch(() => undefined);
  } finally {
    say(errors.length === 0, `${id}: no page error ${errors.join(' | ').slice(0, 200)}`);
    await context.close();
  }
}

async function journeyVR(browser, slug, size, kind) {
  const sport = SPORTS[slug], id = `${kind} ${slug} ${size.width}`;
  const { c } = activeCareer(sport, 1590); c.retired = true;
  const items = [{ name: sport.saveKey, value: saveOf(c, null, 'retired') }];
  if (kind === 'V') items.push({ name: M.hallWallKey(sport.slug), value: JSON.stringify({ v: 2, entries: [{ any: 'thing' }] }) });
  const { context, page, errors } = await open(browser, sport, size, items, { refuse: kind === 'R' });
  try {
    const { opener } = await waitOpener(page);
    await tap(size, page.getByRole('button', { name: 'New career', exact: true }));
    const words = await page.getByRole('alertdialog').innerText();
    say(words.includes('The Hall of Fame card goes too.'), `${id}: New career says the card goes too`);
    await tap(size, page.getByRole('alertdialog').getByRole('button', { name: 'Keep this career' }));
    await page.waitForTimeout(300);
    await opener.scrollIntoViewIfNeeded();
    await tap(size, opener);
    await wallTop(page, size, `${id} wall`);
    const text = await page.locator('[data-career-hall-wall]').innerText();
    if (kind === 'V') say(text.includes('saved by a newer version'), `${id}: the newer version line`);
    else say(text.includes('did not keep the wall'), `${id}: the did not keep line`);
    if (kind === 'V') say(await page.evaluate(k => JSON.parse(localStorage.getItem(k)).v, M.hallWallKey(sport.slug)) === 2, `${id}: the v2 wall is not written over`);
    await shot(page, `${kind}-${slug}-${size.width}-wall`);
  } catch (e) {
    say(false, `${id}: threw ${String(e).split('\n')[0].slice(0, 200)}`);
    await shot(page, `${kind}-${slug}-${size.width}-ERROR`).catch(() => undefined);
  } finally {
    say(errors.length === 0, `${id}: no page error ${errors.join(' | ').slice(0, 200)}`);
    await context.close();
  }
}

const browser = await chromium.launch();
const PHONE = { width: 390, height: 844, touch: true }, DESK = { width: 1280, height: 900 }, SMALL = { width: 320, height: 640, touch: true };
try {
  for (const slug of ['nba', 'nfl', 'mlb', 'nhl']) await journeyP(browser, slug, PHONE, 'reduce');
  for (const slug of ['nba', 'mlb']) await journeyP(browser, slug, DESK, 'no-preference');
  await journeyF(browser, 'nfl', PHONE, { motion: 'reduce' }, 'F-nfl-390-rm');
  await journeyF(browser, 'mlb', PHONE, { motion: 'no-preference' }, 'F-mlb-390-mo');
  await journeyF(browser, 'nhl', DESK, { motion: 'no-preference' }, 'F-nhl-1280-mo');
  await journeyF(browser, 'nba', SMALL, { motion: 'reduce' }, 'F-nba-320-rm');
  await journeyF(browser, 'nba', PHONE, { motion: 'reduce', scheme: 'dark' }, 'F-nba-390-dark');
  await journeyVR(browser, 'nfl', PHONE, 'V');
  await journeyVR(browser, 'nhl', PHONE, 'R');
} finally {
  await browser.close();
}
console.log(`review walk: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
