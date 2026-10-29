/* Review 1557 (run lens): play the medals on the shelf the way a player would, on the served build at BASE.
   390 by 844 and 1280 by 900 (and 320 by 640 once), reduced motion on and off. Saves built in Node by the head's
   engine (and, with OLD_TREE, one built by 1544's closing head's engine). Screenshots and a JSON of measurements
   go to RC_OUT. The live database host is aborted. Exit 0 ran (findings are printed as NOTE lines), 2 could not run. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx/walk1557');
fs.mkdirSync(OUT, { recursive: true });
const { chromium } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href);

async function engine(dir) {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'walk1557-')), 'engine.cjs');
  await build({
    stdin: { contents: `
      export { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
      export { defaultAppearance } from '@/lib/soccerCareerAppearance';
      export { NBA_CAREER_INTL } from '@/lib/nbaCareerIntl';
    `, resolveDir: dir, sourcefile: 'walk1557-engine.ts', loader: 'ts' },
    outfile: out, bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent', alias: { '@': path.join(dir, 'src') },
  });
  return createRequire(import.meta.url)(out);
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/* the first seed whose 2004 summer (answer `first`) ends as `want` wants, then two seasons, the 2006 call rested */
function summerCareer(M, first, want) {
  const sport = M.NBA_CAREER_SPORT; const F = M.NBA_CAREER_INTL;
  for (let seed = 1544; seed < 1744; seed += 1) {
    const rng = mulberry32(seed);
    const c = sport.startCareer('Intl Walker', 'SF', sport.create.archetypes.SF[0], rng, M.defaultAppearance(), 'y2004');
    let tq = sport.rollTeamQuality(null, rng);
    sport.assignRole(c, tq, rng);
    sport.campBattle(c, tq, rng); sport.simSeason(c, tq, rng); sport.progress(c, rng); tq = sport.rollTeamQuality(tq, rng);
    const l0 = c.seasons[c.seasons.length - 1];
    l0.ovr = 92; if (l0.teamResult === 'SUSPENDED') l0.teamResult = 'Missed the playoffs';
    Object.assign(c, { ovr: 92, age: 24, health: 90, retired: false, suspendedSeasons: 0, contractYears: 3, pendingRivalryEvent: null, pendingRivalryChoice: null });
    if (!F.pending(c)) continue;
    const res = F.answer(c, first);
    if (!want(res)) continue;
    for (let y = 0; y < 2; y += 1) { sport.campBattle(c, tq, rng); sport.simSeason(c, tq, rng); sport.progress(c, rng); tq = sport.rollTeamQuality(tq, rng); }
    const l1 = c.seasons[c.seasons.length - 1];
    if (l1.teamResult === 'SUSPENDED') l1.teamResult = 'Missed the playoffs';
    Object.assign(c, { retired: false, suspendedSeasons: 0, contractYears: 3, pendingRivalryEvent: null, pendingRivalryChoice: null, health: Math.max(c.health, 60) });
    if (F.pending(c)) F.answer(c, 'rest');
    if (F.pending(c) || sport.intl.pendingYear(c) !== null) continue;
    return { c, tq, seed, place: res?.row?.place ?? 'rested' };
  }
  return null;
}
const M = await engine(ROOT);
const sport = M.NBA_CAREER_SPORT;
const saveOf = (c, tq) => JSON.stringify({ c, phase: 'season', teamQuality: tq, coach: null });
const medal = r => r && ['gold', 'silver', 'bronze'].includes(r.row.place);
const E = summerCareer(M, 'go', medal);
const R = summerCareer(M, 'rest', r => r === null || r === undefined || r.row?.went === false || true);
if (!E || !R) { console.error('walk1557: could not build the saves. Refusing to run.'); process.exit(2); }
const E0c = JSON.parse(JSON.stringify(E.c)); for (const s of E0c.seasons) s.awards = []; E0c.mvps = 0; E0c.allNbas = 0; E0c.allStars = 0;
const SAVES = { E: { save: saveOf(E.c, E.tq), note: `seed ${E.seed}, ${E.place} in 2004` }, R: { save: saveOf(R.c, R.tq), note: `seed ${R.seed}, rested 2004` }, E0: { save: saveOf(E0c, E.tq), note: 'E with every season award stripped' } };
if (process.env.OLD_TREE) {
  const O = await engine(process.env.OLD_TREE);
  const OE = summerCareer(O, 'go', medal);
  if (OE) SAVES.OLD = { save: saveOf(OE.c, OE.tq), note: `built by ${process.env.OLD_TREE}'s engine, seed ${OE.seed}, ${OE.place}` };
  else console.log('NOTE the old tree gave no medal save');
}
for (const [k, s] of Object.entries(SAVES)) console.log(`save ${k}: ${s.note}, summers ${JSON.stringify(JSON.parse(s.save).c.intl?.summers?.map(r => [r.year, r.went, r.place ?? null]))}`);

const ROUTE = '/nba-my-career';
const results = [];
const notes = [];
const note = s => { notes.push(s); console.log(`NOTE ${s}`); };
async function openCtx(browser, size, rm, save) {
  const touch = size.width < 1000;
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height }, isMobile: touch, hasTouch: touch, deviceScaleFactor: 1, serviceWorkers: 'block',
    reducedMotion: rm ? 'reduce' : 'no-preference',
    storageState: { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [
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
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'domcontentloaded' });
  return { context, page, errors };
}
const tap = async (touch, loc) => { if (touch) await loc.tap(); else await loc.click(); };
/* JPEG, so a whole request stays under the runner's 25 MB return cap (r1557-run-c dropped every file) */
const shot = async (page, file, full = false) => { const f = file.replace(/\.png$/, '.jpg'); await page.screenshot({ path: path.join(OUT, f), fullPage: full, type: 'jpeg', quality: 60 }); return f; };
const caseTile = page => page.locator('button:has(div.uppercase)').filter({ hasText: /Trophy Case/i }).first();
const NEW_BADGES = ['intl_medal', 'olympic_gold', 'world_cup_gold'];

async function flow(browser, key, size, rm) {
  const id = `${key}-${size.width}-${rm ? 'rm' : 'mo'}`;
  const touch = size.width < 1000;
  const r = { id, shots: [] };
  const { context, page, errors } = await openCtx(browser, size, rm, SAVES[key].save);
  try {
    await page.waitForSelector('button:has-text("Play the")', { timeout: 20000 });
    await page.waitForTimeout(1500);
    const before = await page.evaluate(k => localStorage.getItem(k), sport.saveKey);
    r.tile = (await caseTile(page).innerText()).replace(/\s+/g, ' ');
    r.shots.push(await shot(page, `${id}-0-hub.png`));
    await tap(touch, caseTile(page));
    await page.waitForSelector('[data-trophy-case]');
    await page.waitForTimeout(60);
    r.rowOpacityEarly = await page.evaluate(() => [...document.querySelectorAll('[data-trophy-case] .cm-tick-in')].map(e => Number(getComputedStyle(e).opacity)));
    await page.waitForTimeout(1200);
    r.caseText = (await page.locator('[data-trophy-case]').innerText()).replace(/\s+/g, ' ').slice(0, 500);
    r.caseTop = await page.evaluate(() => Math.round(document.querySelector('[data-trophy-case]').getBoundingClientRect().top));
    r.sideways = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    r.badges = await page.evaluate(ids => ids.map(i => { const b = document.querySelector(`[data-career-badge="${i}"]`); return b ? `${i}:${b.getAttribute('data-earned')}` : `${i}:missing`; }), NEW_BADGES);
    r.badgeCount = await page.evaluate(() => [...document.querySelectorAll('span')].map(s => s.textContent).find(t => /^\d+ of \d+$/.test(t ?? '')) ?? null);
    r.truncated = await page.evaluate(() => [...document.querySelectorAll('[data-career-badge] .truncate')].filter(s => s.scrollWidth > s.clientWidth + 1).map(s => s.closest('[data-career-badge]').getAttribute('data-career-badge')));
    r.shots.push(await shot(page, `${id}-1-case.png`));
    r.shots.push(await shot(page, `${id}-1-case-full.png`, true));
    if (await page.locator('[data-intl-open]').count()) {
      const y0 = await page.evaluate(() => Math.round(scrollY));
      await tap(touch, page.locator('[data-intl-open]'));
      await page.waitForSelector('[data-intl-summers-view="list"]');
      await page.waitForTimeout(900);
      r.listArrive = await page.evaluate(() => ({ sy: Math.round(scrollY), top: Math.round(document.querySelector('[data-intl-summers-view]').getBoundingClientRect().top), ih: innerHeight }));
      r.listArrive.y0 = y0;
      r.listText = (await page.locator('[data-intl-summers-view]').innerText()).replace(/\s+/g, ' ').slice(0, 400);
      r.stacked = await page.locator('[data-trophy-case], [data-career-badge]').count();
      r.shots.push(await shot(page, `${id}-2-intl.png`));
      const went = page.locator('[data-intl-summer]');
      if (await went.count()) {
        await tap(touch, went.first());
        await page.waitForSelector('[data-intl-result]');
        await page.waitForTimeout(900);
        r.resultArrive = await page.evaluate(() => ({ sy: Math.round(scrollY), top: Math.round(document.querySelector('[data-intl-summers-view]').getBoundingClientRect().top) }));
        r.shots.push(await shot(page, `${id}-3-summer.png`));
        r.shots.push(await shot(page, `${id}-3-summer-full.png`, true));
        await tap(touch, page.locator('[data-intl-continue]'));
        await page.waitForSelector('[data-intl-summers-view="list"]');
      }
      await tap(touch, page.locator('[data-intl-summers-back]'));
      await page.waitForSelector('[data-trophy-case]');
      /* leave the panel by the header's Hub button with the view open, then come back */
      await tap(touch, page.locator('[data-intl-open]'));
      await page.waitForSelector('[data-intl-summers-view="list"]');
      await tap(touch, page.locator('button').filter({ hasText: /^\s*Hub\s*$/ }).first());
      await page.waitForSelector('button:has-text("Play the")');
      await page.waitForTimeout(400);
      await tap(touch, caseTile(page));
      await page.waitForTimeout(900);
      r.reopen = { case: await page.locator('[data-trophy-case]').count(), view: await page.locator('[data-intl-summers-view]').count() };
      r.shots.push(await shot(page, `${id}-4-reopen.png`));
    }
    r.saveWritten = (await page.evaluate(k => localStorage.getItem(k), sport.saveKey)) !== before;
    r.errors = errors.slice(0, 3);
  } catch (e) { r.stopped = String(e).split('\n')[0].slice(0, 200); r.shots.push(await shot(page, `${id}-stopped.png`).catch(() => null)); } finally { await context.close(); }
  results.push(r);
  console.log(JSON.stringify(r));
}

const browser = await chromium.launch();
const ONLY = process.env.WALK_ONLY || '';
try {
  const plan = ONLY === 'leave'
    ? [['E', { width: 390, height: 844 }, false]]
    : [['E', { width: 390, height: 844 }, true], ['E', { width: 390, height: 844 }, false], ['E', { width: 1280, height: 900 }, true], ['E', { width: 1280, height: 900 }, false],
      ['E', { width: 320, height: 640 }, false], ['R', { width: 390, height: 844 }, false], ['E0', { width: 390, height: 844 }, false], ['OLD', { width: 390, height: 844 }, false]];
  for (const [key, size, rm] of plan) if (SAVES[key]) await flow(browser, key, size, rm);
} finally { await browser.close(); }
fs.writeFileSync(path.join(OUT, 'walk1557.json'), JSON.stringify({ saves: Object.fromEntries(Object.entries(SAVES).map(([k, s]) => [k, s.note])), results }, null, 1));
console.log(`walk1557: ran ${results.length} flows, ${results.filter(r => r.stopped).length} stopped; screenshots and walk1557.json in ${OUT}`);
