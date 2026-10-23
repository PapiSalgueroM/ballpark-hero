/* Round 1544 review (lens RUNS), second pass on dacf07f39: the summers the first pass never put on screen.
 * P35 / P36: a 'now' career called to a PROJECTED summer (the 2035 World Cup, the 2036 Olympics: the game's own).
 * H: a throwback 2004 call that comes home HURT (salt searched in Node by the real engine).
 * G: a throwback 2004 call at 87 that wins NO medal.
 * Saves are built in Node by the real engine (the same way scripts/playNbaIntl.mjs builds them); the browser's
 * saved row must equal the Node answer (the keyed stream is the same in both). Served by #!serve at $BASE;
 * supabase.co aborted, every other host answered empty. Pictures (JPEG) go to $RC_OUT. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const BASE = (process.env.BASE || 'http://localhost:4173').replace(/\/$/, '');
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx/run2-walk');
fs.mkdirSync(OUT, { recursive: true });

const bundle = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'r1544-run2-')), 'engine.cjs');
await build({
  stdin: { contents: `
    export { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
    export { defaultAppearance } from '@/lib/soccerCareerAppearance';
  `, resolveDir: ROOT, sourcefile: 'r1544-run2-engine.ts', loader: 'ts' },
  outfile: bundle, bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') },
});
const M = createRequire(import.meta.url)(bundle);
const sport = M.NBA_CAREER_SPORT;
const face = await sport.intl.load();

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function career(era, seasons, ovr, salt) {
  const rng = mulberry32(1544);
  const pos = 'SF';
  const c = sport.startCareer('Intl Walker', pos, sport.create.archetypes[pos][0], rng, M.defaultAppearance(), era);
  let tq = sport.rollTeamQuality(null, rng);
  sport.assignRole(c, tq, rng);
  for (let y = 0; y < seasons; y += 1) { sport.campBattle(c, tq, rng); sport.simSeason(c, tq, rng); sport.progress(c, rng); tq = sport.rollTeamQuality(tq, rng); }
  const line = c.seasons[c.seasons.length - 1];
  line.ovr = ovr;
  if (line.teamResult === 'SUSPENDED') line.teamResult = 'Missed the playoffs';
  Object.assign(c, { ovr, age: 24, health: 90, retired: false, suspendedSeasons: 0, contractYears: 3, pendingRivalryEvent: null, pendingRivalryChoice: null });
  if (salt) c.summerSalt = salt;
  const copy = JSON.parse(JSON.stringify(c));
  const res = face.answer(copy, 'go');
  return { c, tq, pending: sport.intl.pendingYear(c), row: res?.row ?? null, save: JSON.stringify({ c, phase: 'season', teamQuality: tq, coach: null }) };
}
const P35 = career('now', 9, 90, null);
const P36 = career('now', 10, 90, null);
let H = null; let G = null;
for (let k = 0; k < 400 && (!H || !G); k += 1) {
  if (!H) { const s = career('y2004', 1, 90, `rvh${k}`); if (s.row?.hurt) H = s; }
  if (!G) { const s = career('y2004', 1, 87, `rvg${k}`); if (s.row && !['gold', 'silver', 'bronze'].includes(s.row.place)) G = s; }
}
for (const [id, s] of Object.entries({ P35, P36, H, G })) console.log(`save ${id}: pending ${s?.pending ?? 'none'}, salt ${s?.c?.summerSalt}, Node row ${JSON.stringify(s?.row)}`);
if (process.env.NODE_ONLY) process.exit(0);
const { chromium } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href);

let failures = 0;
const fail = (id, what) => { failures += 1; console.error(`  FAIL ${id}: ${what}`); };
const shots = [];
const ROUTE = '/nba-my-career';
async function open(browser, size, saveValue, reduce) {
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height }, isMobile: size.touch, hasTouch: size.touch, deviceScaleFactor: 1,
    reducedMotion: reduce ? 'reduce' : 'no-preference', serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [
      { name: sport.saveKey, value: saveValue }, { name: `rules-gate-seen:${ROUTE}`, value: '1' }, { name: 'cookie-consent', value: 'essential' },
    ] }] },
  });
  await context.route('**/*', r => {
    const url = r.request().url();
    if (/supabase\.co/.test(url)) return r.abort();
    if (new URL(url).origin === BASE) return r.continue();
    const type = r.request().resourceType();
    return r.fulfill({ status: 200, contentType: type === 'stylesheet' ? 'text/css' : 'application/json', body: type === 'stylesheet' ? '' : '[]' });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'domcontentloaded' });
  return { context, page, errors };
}
const SCREEN = '[data-intl-call], [data-intl-result]';
async function shot(id, page, name, full = false) {
  const m = await page.evaluate(sel => {
    const box = document.querySelector(sel); const small = []; const cut = [];
    for (const el of box ? [box, ...box.querySelectorAll('*')] : []) {
      const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      if (own && parseFloat(getComputedStyle(el).fontSize) < 12) small.push(el.textContent.trim().slice(0, 30));
      const er = el.getBoundingClientRect();
      if (er.width > 0 && (er.left < -1 || er.right > innerWidth + 1)) cut.push(el.tagName);
    }
    return { sw: document.documentElement.scrollWidth, iw: innerWidth, small, cut, text: box?.innerText ?? '' };
  }, SCREEN);
  if (m.sw > m.iw) fail(id, `${name}: sideways scroll ${m.sw} in ${m.iw}`);
  if (m.small.length) fail(id, `${name}: text under 12 px: ${m.small.slice(0, 3).join(' | ')}`);
  if (m.cut.length) fail(id, `${name}: cut at the sides: ${m.cut.slice(0, 3).join(', ')}`);
  if (/undefined|\bnull\b|NaN/.test(m.text)) fail(id, `${name}: a broken word on screen`);
  const file = `${id}-${name}.jpg`;
  await page.screenshot({ path: path.join(OUT, file), type: 'jpeg', quality: 55, fullPage: full });
  shots.push(file);
  return m.text;
}
const tap = async (size, loc) => { if (size.touch) await loc.tap(); else await loc.click(); };
const readSave = page => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), sport.saveKey);

async function walk(browser, id, s, size, reduce, expect) {
  if (!s) { fail(id, 'no planted save'); return; }
  if (s.pending !== expect.year) { fail(id, `the planted save is pending ${s.pending}, wanted ${expect.year}`); return; }
  const { context, page, errors } = await open(browser, size, s.save, reduce);
  try {
    await page.waitForSelector('[data-intl-call]', { timeout: 20000 });
    await page.waitForTimeout(900);
    const call = await shot(id, page, '1-call');
    console.log(`  ${id} call text: ${call.replace(/\s+/g, ' ').slice(0, 400)}`);
    if (expect.label && !call.includes(expect.label)) fail(id, `the call does not name "${expect.label}"`);
    if (expect.field && !call.includes(expect.field)) fail(id, `the call lacks "${expect.field}"`);
    if (expect.year > 2024 && call.includes('real tournament was played')) fail(id, 'a summer to come says the real tournament was played');
    if (/Team USA|USA Basketball|Dream Team/.test(call)) fail(id, 'a banned word on the call');
    await tap(size, page.locator('[data-intl-answer="go"]'));
    await page.waitForSelector('[data-intl-result]');
    await page.waitForTimeout(900);
    const res = await shot(id, page, '2-result', true);
    console.log(`  ${id} result text: ${res.replace(/\s+/g, ' ').slice(0, 500)}`);
    if (expect.field && !res.includes(expect.field)) fail(id, `the result lacks "${expect.field}"`);
    if (expect.year > 2024 && res.includes('real tournament was played')) fail(id, 'a summer to come says the real tournament was played');
    const saved = (await readSave(page))?.c?.intl?.summers?.find(r => r.year === expect.year);
    const keys = ['year', 'edition', 'went', 'place', 'games', 'wins', 'hurt'];
    const a = JSON.stringify(keys.map(k => saved?.[k])); const b = JSON.stringify(keys.map(k => s.row?.[k]));
    if (a !== b) fail(id, `the browser saved ${a}, the Node engine answers ${b}`);
    if (s.row?.hurt && !res.includes('You came home hurt: health down 8, never below 30.')) fail(id, 'the hurt line is missing');
    if (expect.noMedal && /Gold|Silver|Bronze/.test(res.split('\n').slice(0, 4).join(' '))) fail(id, 'a medal word heads a summer with no medal');
    if (expect.bracket) {
      await tap(size, page.locator('[data-intl-tile="bracket"]'));
      await page.waitForSelector('[data-intl-view="bracket"]');
      await page.waitForTimeout(700);
      await shot(id, page, '3-bracket', true);
      const tiles = await page.locator('[data-intl-tile^="group-"], [data-intl-tile^="round-"]').count();
      console.log(`  ${id} bracket tiles: ${tiles}`);
      if (tiles > 0) {
        await tap(size, page.locator('[data-intl-tile^="group-"], [data-intl-tile^="round-"]').first());
        await page.waitForSelector('[data-intl-view^="group:"], [data-intl-view^="round:"]');
        await page.waitForTimeout(700);
        await shot(id, page, '4-other', true);
        await tap(size, page.locator('[data-intl-back]'));
        await page.waitForSelector('[data-intl-view="bracket"]');
      }
      await tap(size, page.locator('[data-intl-back]'));
      await page.waitForSelector('[data-intl-view="main"]');
    }
    await tap(size, page.locator('[data-intl-continue]'));
    await page.waitForTimeout(1500);
    if (await page.locator(SCREEN).count()) fail(id, 'Continue left a national team screen up');
    const after = (await readSave(page))?.c;
    console.log(`  ${id} after Continue: health ${after?.health}, rows ${after?.intl?.summers?.length}`);
    if (s.row?.hurt && after?.health !== 82) fail(id, `health after a hurt summer is ${after?.health}, not 82 (90 less 8)`);
    if (!s.row?.hurt && after?.health !== 90) fail(id, `health after a healthy summer is ${after?.health}, not 90`);
    await page.screenshot({ path: path.join(OUT, `${id}-5-after.jpg`), type: 'jpeg', quality: 55 });
    shots.push(`${id}-5-after.jpg`);
    if (errors.length) fail(id, `page errors ${errors.slice(0, 2).join(' | ')}`);
  } catch (e) { fail(id, `the walk stopped: ${String(e).split('\n')[0].slice(0, 200)}`); } finally { await context.close(); }
}

const browser = await chromium.launch();
const PHONE = { width: 390, height: 844, touch: true };
const WIDE = { width: 1280, height: 900, touch: false };
const PROJ = "Host and field are the game's own.";
try {
  await walk(browser, 'p35-390-rm', P35, PHONE, true, { year: 2035, label: 'the 2035 Basketball World Cup', field: PROJ, bracket: true });
  await walk(browser, 'p35-1280-mo', P35, WIDE, false, { year: 2035, label: 'the 2035 Basketball World Cup', field: PROJ, bracket: true });
  await walk(browser, 'p36-390-mo', P36, PHONE, false, { year: 2036, label: 'the 2036 Olympics', field: PROJ, bracket: true });
  await walk(browser, 'h-390-rm', H, PHONE, true, { year: 2004, label: 'the 2004 Olympics in Athens', hurt: true });
  await walk(browser, 'g-390-mo', G, PHONE, false, { year: 2004, label: 'the 2004 Olympics in Athens', noMedal: true, bracket: true });
} finally { await browser.close(); }
console.log(`review-run2-walk: ${failures} failure(s), ${shots.length} pictures: ${shots.join(' ')}`);
process.exit(failures ? 1 : 0);
