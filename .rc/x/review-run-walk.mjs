/* Round 1544 adversarial review (lens RUNS): the national team's call played the way a player meets it.
   W1: a 'now' career rated 96 presses "Play the 2026 season" on the real board: the curtain, the call,
       Go, the result and its views, Continue, then a reload. At 390x844 (reduced motion on and off) and
       1280x900; Rest at 390.
   W2: a throwback career after the season labelled 2018, rated 90 at 34: the 2019 World Cup in China
       (32 nations, two group rounds played as one): the bracket's tiles, a round, at 390 and 1280.
   W3: Go tapped twice fast: one row.
   Reads BASE (a served build), aborts supabase.co, writes PNGs into RC_OUT. Exit 1 on any failure. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const { chromium } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href);
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx/review-walk');
fs.mkdirSync(OUT, { recursive: true });
const bundle = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rv-walk-')), 'engine.cjs');
await build({
  stdin: { contents: `export { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
export { defaultAppearance } from '@/lib/soccerCareerAppearance';`, resolveDir: ROOT, loader: 'ts' },
  outfile: bundle, bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') },
});
if (/supabase\.co/.test(fs.readFileSync(bundle, 'utf-8'))) { console.error('engine bundle reaches supabase. Refusing.'); process.exit(2); }
const M = createRequire(import.meta.url)(bundle);
const sport = M.NBA_CAREER_SPORT;
function mulberry32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* W1's save: a fresh 'now' career, rated 96, before its first season. */
function fresh() {
  const rng = mulberry32(4401);
  const c = sport.startCareer('Run Reviewer', 'SF', sport.create.archetypes.SF[0], rng, M.defaultAppearance(), 'now');
  const tq = sport.rollTeamQuality(null, rng);
  sport.assignRole(c, tq, rng);
  Object.assign(c, { ovr: 96, pot: 99, age: 24, health: 95 });
  return JSON.stringify({ c, phase: 'season', teamQuality: tq, coach: null });
}
/* W2's save: a throwback career after `n` seasons, the last rated 90, 34 that summer. */
function veteran(n, seed) {
  const rng = mulberry32(seed);
  const c = sport.startCareer('Run Veteran', 'SF', sport.create.archetypes.SF[0], rng, M.defaultAppearance(), 'y2004');
  let tq = sport.rollTeamQuality(null, rng);
  sport.assignRole(c, tq, rng);
  for (let y = 0; y < n; y += 1) { sport.campBattle(c, tq, rng); sport.simSeason(c, tq, rng); sport.progress(c, rng); tq = sport.rollTeamQuality(tq, rng); }
  const line = c.seasons[c.seasons.length - 1];
  line.ovr = 90; if (line.teamResult === 'SUSPENDED') line.teamResult = 'Missed the playoffs';
  Object.assign(c, { ovr: 90, age: 34, health: 90, retired: false, suspendedSeasons: 0, contractYears: 2, pendingRivalryEvent: null, pendingRivalryChoice: null });
  return { save: JSON.stringify({ c, phase: 'season', teamQuality: tq, coach: null }), year: line.year, pending: sport.intl.pendingYear(c) };
}
const F = fresh();
let V = null;
for (let seed = 1; seed < 40 && !V; seed += 1) { const v = veteran(16, seed); if (v.pending === 2019) V = v; }
console.log(`W2 save: ${V ? `last season ${V.year}, the gate's call ${V.pending}` : 'NONE FOUND'}`);

let failures = 0;
const fail = (id, what) => { failures += 1; console.log(`  FAIL ${id}: ${what}`); };
const note = (id, what) => console.log(`  ${id}: ${what}`);
const ROUTE = '/nba-my-career';

async function open(browser, size, save, motion) {
  const context = await browser.newContext({
    viewport: { width: size.w, height: size.h }, isMobile: size.w < 800, hasTouch: size.w < 800, deviceScaleFactor: 1,
    reducedMotion: motion, serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [
      { name: sport.saveKey, value: save }, { name: `rules-gate-seen:${ROUTE}`, value: '1' }, { name: 'cookie-consent', value: 'essential' },
    ] }] },
  });
  await context.route('**/*', r => {
    const url = r.request().url();
    if (/supabase\.co/.test(url)) return r.abort();
    if (new URL(url).origin === new URL(BASE).origin) return r.continue();
    const type = r.request().resourceType();
    return r.fulfill({ status: 200, contentType: type === 'stylesheet' ? 'text/css' : 'application/json', body: type === 'stylesheet' ? '' : '[]' });
  });
  const page = await context.newPage();
  /* The runner drops RC_OUT over 25 MB: every picture is a JPEG. */
  const raw = page.screenshot.bind(page);
  page.screenshot = o => raw({ ...o, path: o.path.replace(/\.png$/, '.jpg'), type: 'jpeg', quality: 45 });
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'domcontentloaded' });
  return { context, page, errors };
}
const readSave = page => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), sport.saveKey);
const bodyText = page => page.evaluate(() => document.body.innerText);
const tap = async (size, loc) => { if (size.w < 800) await loc.tap(); else await loc.click(); };
const btn = (page, text) => page.locator('button', { hasText: text });

const SCREEN = '[data-intl-call], [data-intl-result], [data-intl-holding]';
async function shot(id, size, page, errors, name, sel = SCREEN, full = false) {
  const m = await page.evaluate(s => {
    const box = document.querySelector(s);
    const r = box?.getBoundingClientRect();
    const small = []; const cut = []; const low = [];
    for (const el of box ? [box, ...box.querySelectorAll('*')] : []) {
      const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (own && fs < 12) small.push(`${el.tagName.toLowerCase()} ${fs}px "${el.textContent.trim().slice(0, 30)}"`);
      const er = el.getBoundingClientRect();
      if (er.width > 0 && (er.left < -1 || er.right > innerWidth + 1)) cut.push(`${el.tagName.toLowerCase()} ${Math.round(er.left)}..${Math.round(er.right)}`);
      if (el.tagName === 'BUTTON' && er.height > 0 && er.height < 44) low.push(`"${el.textContent.trim().slice(0, 24)}" ${Math.round(er.height)}px`);
      if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX === 'visible' && el.clientWidth > 0 && el.tagName !== 'svg') cut.push(`${el.tagName.toLowerCase()} overflows ${el.scrollWidth}>${el.clientWidth}`);
    }
    return { sw: document.documentElement.scrollWidth, iw: innerWidth, ih: innerHeight, sy: Math.round(scrollY), top: r ? Math.round(r.top) : null, h: r ? Math.round(r.height) : null, small, cut, low };
  }, sel);
  const tag = `${name} top ${m.top} h ${m.h} scrollY ${m.sy}`;
  if (m.top === null) fail(id, `${name}: ${sel} is not on screen`);
  else {
    if (m.sw > m.iw) fail(id, `${name}: sideways scroll ${m.sw} in ${m.iw}`);
    if (m.low.length) fail(id, `${name}: controls under 44 px: ${m.low.join(', ')}`);
    if (m.small.length) fail(id, `${name}: text under 12 px: ${m.small.slice(0, 4).join(', ')}`);
    if (m.cut.length) fail(id, `${name}: cut or overflowing: ${m.cut.slice(0, 4).join(', ')}`);
    if (m.top < -1 || m.top > m.ih * 0.6) fail(id, `${name}: the screen's top arrived at ${m.top} in a ${m.ih} view`);
  }
  if (errors.length) fail(id, `${name}: page errors ${errors.slice(0, 2).join(' | ')}`);
  await page.screenshot({ path: path.join(OUT, `${id}-${name}.png`), fullPage: full });
  note(id, tag);
  return m;
}

/* W1: the press, the curtain, the call, Go (or Rest), the views, Continue, a reload. */
async function walk1(browser, size, motion, answer) {
  const id = `w1-${size.w}-${motion === 'reduce' ? 'rm' : 'mo'}-${answer}`;
  const { context, page, errors } = await open(browser, size, F, motion);
  try {
    await btn(page, 'Play the 2026 season').first().waitFor();
    await tap(size, btn(page, 'Play the 2026 season').first());
    await page.waitForSelector('[data-season-reveal]');
    await page.waitForTimeout(motion === 'reduce' ? 300 : 2500);
    const t0 = await bodyText(page);
    if (!t0.includes('The US national team wants you this summer. You decide next.')) fail(id, 'the curtain does not carry the call line');
    await shot(id, size, page, errors, '1-curtain', '[data-season-reveal]');
    for (let i = 0; i < 6 && !(await page.locator('[data-intl-call]').count()); i += 1) {
      if (await page.locator('[data-intl-holding]').count()) { await page.waitForSelector('[data-intl-call]'); break; }
      const cont = btn(page, 'Continue');
      if (await cont.count()) { await tap(size, cont.first()); await page.waitForTimeout(motion === 'reduce' ? 400 : 1500); } else await page.waitForTimeout(500);
    }
    await page.waitForSelector('[data-intl-call]');
    await page.waitForTimeout(motion === 'reduce' ? 300 : 900);
    await shot(id, size, page, errors, '2-call');
    const t1 = await bodyText(page);
    if (!t1.includes('the 2027 Basketball World Cup in Qatar')) fail(id, 'the call does not name the 2027 World Cup in Qatar');
    if (/Team USA|USA Basketball|Dream Team/.test(t1)) fail(id, 'a banned word is on screen');
    const pressed = await readSave(page);
    note(id, `at the call: phase ${pressed?.phase}, summer dealt ${pressed?.c?.summer ? 'yes' : 'no'}, intl ${JSON.stringify(pressed?.c?.intl ?? null)}`);
    await tap(size, page.locator(`[data-intl-answer="${answer}"]`));
    await page.waitForTimeout(motion === 'reduce' ? 500 : 1500);
    const after = await readSave(page);
    note(id, `after ${answer}: phase ${after?.phase}, intl ${JSON.stringify(after?.c?.intl ?? null).slice(0, 220)}`);
    if (after?.phase !== pressed?.phase) fail(id, `the answer moved the phase ${pressed?.phase} to ${after?.phase}`);
    if (JSON.stringify(after?.c?.summer ?? null) !== JSON.stringify(pressed?.c?.summer ?? null)) fail(id, 'the answer touched the dealt summer');
    if (answer === 'go') await walkResult(id, size, page, errors, motion, false);
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT, `${id}-8-next.png`) });
    const nextKind = (await page.locator('[data-career-event], [data-career-decision-option]').count()) ? 'summer card' : (await btn(page, 'Play the').count()) ? 'hub' : 'something else';
    note(id, `after the beat: ${nextKind}`);
    if (nextKind === 'something else') fail(id, 'after the beat neither the summer card nor the hub is up');
    if (pressed?.c?.summer && nextKind !== 'summer card') fail(id, 'a summer was dealt but its card did not come next');
    const bytes = await page.evaluate(k => localStorage.getItem(k), sport.saveKey);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    if (await page.locator(SCREEN).count()) fail(id, 'a reload after the answer shows a national team screen');
    const bytes2 = await page.evaluate(k => localStorage.getItem(k), sport.saveKey);
    if (bytes !== bytes2) note(id, 'NOTE the reload rewrote the save');
    await page.screenshot({ path: path.join(OUT, `${id}-9-reload.png`) });
  } catch (e) {
    fail(id, `the walk stopped: ${String(e).split('\n')[0].slice(0, 200)}`);
    await page.screenshot({ path: path.join(OUT, `${id}-stopped.png`) }).catch(() => {});
  } finally { await context.close(); }
}

/* The result and its views, then Continue. `deep` opens every kind of tile once. */
async function walkResult(id, size, page, errors, motion, deep) {
  const pause = motion === 'reduce' ? 300 : 900;
  await page.waitForSelector('[data-intl-result]');
  await page.waitForTimeout(pause);
  await shot(id, size, page, errors, '3-result');
  note(id, `result text: ${(await page.locator('[data-intl-result]').innerText()).replace(/\s+/g, ' ').slice(0, 400)}`);
  const s = await readSave(page);
  const row = s?.c?.intl?.summers?.[s.c.intl.summers.length - 1];
  await tap(size, page.locator('[data-intl-tile="games"]'));
  await page.waitForSelector('[data-intl-view="games"]');
  await page.waitForTimeout(pause);
  await shot(id, size, page, errors, '4-games', SCREEN, true);
  const n = await page.locator('[data-intl-view="games"] li').count();
  if (n !== row?.games) fail(id, `Your games lists ${n}, the row says ${row?.games}`);
  await tap(size, page.locator('[data-intl-back]'));
  await page.waitForSelector('[data-intl-view="main"]');
  await tap(size, page.locator('[data-intl-tile="bracket"]'));
  await page.waitForSelector('[data-intl-view="bracket"]');
  await page.waitForTimeout(pause);
  await shot(id, size, page, errors, '5-bracket', SCREEN, true);
  const tiles = await page.locator('[data-intl-tile]').evaluateAll(els => els.map(e => e.getAttribute('data-intl-tile')));
  note(id, `bracket tiles: ${tiles.join(' ')}`);
  const pick = deep ? tiles : tiles.slice(0, 1);
  const kinds = new Set();
  for (const t of pick) {
    const kind = t.startsWith('group-') ? 'group' : t;
    if (kinds.has(kind)) continue;
    kinds.add(kind);
    await tap(size, page.locator(`[data-intl-tile="${t}"]`));
    await page.waitForSelector('[data-intl-view^="group:"], [data-intl-view^="round:"]');
    await page.waitForTimeout(pause);
    await shot(id, size, page, errors, `6-${t}`, SCREEN, true);
    await tap(size, page.locator('[data-intl-back]'));
    await page.waitForSelector('[data-intl-view="bracket"]');
  }
  await tap(size, page.locator('[data-intl-back]'));
  await page.waitForSelector('[data-intl-view="main"]');
  await tap(size, page.locator('[data-intl-continue]'));
  await page.waitForTimeout(1200);
  if (await page.locator(SCREEN).count()) fail(id, 'Continue left a national team screen up');
}

/* W2: the 2019 World Cup in China, a played edition of 32 nations. */
async function walk2(browser, size, motion) {
  const id = `w2-${size.w}`;
  if (!V) { fail(id, 'no planted save is called to 2019'); return; }
  const { context, page, errors } = await open(browser, size, V.save, motion);
  try {
    await page.waitForSelector('[data-intl-call]');
    await page.waitForTimeout(600);
    await shot(id, size, page, errors, '2-call');
    const t = await bodyText(page);
    note(id, `call text: ${(await page.locator('[data-intl-call]').innerText()).replace(/\s+/g, ' ').slice(0, 300)}`);
    if (!t.includes('2019')) fail(id, 'the call does not name 2019');
    await tap(size, page.locator('[data-intl-answer="go"]'));
    await walkResult(id, size, page, errors, motion, true);
  } catch (e) {
    fail(id, `the walk stopped: ${String(e).split('\n')[0].slice(0, 200)}`);
    await page.screenshot({ path: path.join(OUT, `${id}-stopped.png`) }).catch(() => {});
  } finally { await context.close(); }
}

/* W3: Go tapped twice before the result lands, and Rest right after Go. */
async function walk3(browser, size) {
  const id = `w3-${size.w}`;
  const { context, page, errors } = await open(browser, size, V?.save ?? F, 'reduce');
  try {
    await page.waitForSelector('[data-intl-call]');
    await page.evaluate(() => { const g = document.querySelector('[data-intl-answer="go"]'); const r = document.querySelector('[data-intl-answer="rest"]'); g.click(); g.click(); r?.click(); });
    await page.waitForTimeout(1500);
    const s = await readSave(page);
    const rows = s?.c?.intl?.summers ?? [];
    note(id, `rows after a double Go and a Rest: ${JSON.stringify(rows.map(r => [r.year, r.went]))}`);
    if (rows.length !== 1 || rows[0].went !== true) fail(id, `a double tap wrote ${rows.length} rows`);
    if (errors.length) fail(id, `page errors ${errors.slice(0, 2).join(' | ')}`);
  } catch (e) { fail(id, `the walk stopped: ${String(e).split('\n')[0].slice(0, 200)}`); } finally { await context.close(); }
}

const browser = await chromium.launch();
try {
  await walk1(browser, { w: 390, h: 844 }, 'reduce', 'go');
  await walk1(browser, { w: 390, h: 844 }, 'no-preference', 'go');
  await walk1(browser, { w: 1280, h: 900 }, 'no-preference', 'go');
  await walk1(browser, { w: 390, h: 844 }, 'no-preference', 'rest');
  await walk1(browser, { w: 320, h: 640 }, 'no-preference', 'go');
  await walk2(browser, { w: 390, h: 844 }, 'reduce');
  await walk2(browser, { w: 1280, h: 900 }, 'no-preference');
  await walk3(browser, { w: 390, h: 844 });
} finally { await browser.close(); }
console.log(`  screenshots: ${fs.readdirSync(OUT).filter(f => f.endsWith('.jpg')).join(' ')}`);
console.log(failures ? `review-run-walk: RED, ${failures} failures` : 'review-run-walk: green');
process.exit(failures ? 1 : 0);
