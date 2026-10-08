/* Round 1052: a browser walk of the countries that round added to Club
   Manager, on the BUILT site (dist served by scripts/lib/hostLikeServer.mjs
   or any host like server; never `npx serve -s`). Chromium only, at 390 by
   844 and 1280 by 800. Every request to the database host is aborted and
   counted, and the walk is red on any console error or page error.

   What it reads, a viewport:
   1. /club-manager, today's game: the nation step holds a tile for each new
      country, and the tile's league and club counts are the engine's own
      (the walk bundles the engine and reads NATIONS and REAL_LEAGUES; it
      types no number). No horizontal overflow.
   2. The country: one tile a league with its club count and its cup, and no
      "Champions League" on a league that hands out no European places. The
      back button returns to the nations. Into the league: one tile a club,
      every club of the league and no other.
   3. A career at the league's first club (the manager builder skipped): the
      hub opens on that club in Season 1, with no horizontal overflow.
   5. The ? button: the help names the league and closes.
   6. The old save: scripts/data/cmOldSave1052Fixture.json, written by the
      engine before the round, is put under the save key before the page
      loads, and the hub opens on Sevilla with no error.
   (Step 4 is Argentina's and joins with that country. The live match and
   its reduced motion form are walked for every league by playClubManager
   and playReducedMotion, which run beside this.)

   Negative control: PLAY_NEWCOUNTRIES_CONTROL=nonation looks for a nation
   the game does not have, and the walk must fail at step 1.

   MEASURED: written from the first green run, below the code's summary.

   Run: SWEEP_BASE=http://localhost:4173 node scripts/playClubManagerNewCountries.mjs */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import pw from './lib/playwrightLoader.mjs';
const { chromium } = pw;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_FWD = ROOT.replaceAll('\\', '/');
const BASE = process.env.SWEEP_BASE || 'http://127.0.0.1:4173';
const CONTROL = process.env.PLAY_NEWCOUNTRIES_CONTROL || '';
if (CONTROL && CONTROL !== 'nonation') { console.error(`PLAY_NEWCOUNTRIES_CONTROL=${CONTROL} is not a control this walk knows (nonation)`); process.exit(2); }
/* The countries the round added, by nation id. Everything else is read from the engine. */
const COUNTRIES = (process.env.PLAY_NEWCOUNTRIES || 'russia').split(',');
const VIEWPORTS = [[390, 844], [1280, 800]];
const SAVE_KEY = 'dukb-club-manager-save';

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/* the expected numbers, from the engine itself */
const TMP = fs.mkdtempSync(path.join(process.env.TEMP || process.env.TMP || os.tmpdir(), 'plaync-'));
process.on('exit', () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ } });
fs.writeFileSync(path.join(TMP, 'e.mjs'), `export { NATIONS, REAL_LEAGUES, leagueRulesOf } from '${ROOT_FWD}/src/lib/clubManager.ts';\n`);
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
await build({
  entryPoints: [path.join(TMP, 'e.mjs')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(TMP, 'o.mjs'), alias: { '@': `${ROOT_FWD}/src` }, logLevel: 'error',
  plugins: [{ name: 'sb', setup(b) { b.onResolve({ filter: /integrations\/supabase\/client/ }, () => ({ path: 'sb', namespace: 'sb' })); b.onLoad({ filter: /.*/, namespace: 'sb' }, () => ({ contents: 'export const supabase = null; export const SUPABASE_URL = ""; export const SUPABASE_PUBLISHABLE_KEY = "";', loader: 'js' })); } }],
});
const cm = await import(pathToFileURL(path.join(TMP, 'o.mjs')).href);
const expected = COUNTRIES.map(id => {
  const nation = cm.NATIONS.find(n => n.id === id);
  if (!nation) { console.error(`${id} is not a nation of the game; nothing to walk`); process.exit(2); }
  const leagues = nation.leagueIds.map(lid => { const l = cm.REAL_LEAGUES.find(x => x.id === lid); const r = cm.leagueRulesOf(lid); return { id: lid, name: l.name, clubs: l.clubs, cup: r.cup, europe: r.europe !== null }; });
  return { id, name: CONTROL === 'nonation' ? 'Atlantis' : nation.name, leagues, clubs: leagues.reduce((s, l) => s + l.clubs.length, 0) };
});
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const browser = await chromium.launch();
let aborted = 0;
const counts = [];
for (const [w, h] of VIEWPORTS) {
  const tag = `${w}x${h}`;
  const newPage = async init => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    if (init) await ctx.addInitScript(init.fn, init.arg);
    const page = await ctx.newPage();
    await page.route(/supabase\.co/, r => { aborted += 1; return r.abort(); });
    /* a request this walk aborts on purpose logs a failed fetch: that is not the page's error */
    page.on('console', m => { if (m.type() === 'error' && !/supabase|Failed to load resource|net::ERR_FAILED/i.test(m.text())) fail(`${tag}: console error: ${m.text().slice(0, 200)}`); });
    page.on('pageerror', e => fail(`${tag}: page error: ${String(e).slice(0, 200)}`));
    return { ctx, page };
  };
  const text = async page => (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
  const overflow = async (page, where) => { const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); if (o > 1) fail(`${tag}: ${where} overflows sideways by ${o}px`); };
  const tile = (page, rx) => page.locator('button:visible').filter({ hasText: rx }).first();
  const clearRoom = async page => { await page.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1500 }).catch(() => {}); };

  for (const c of expected) {
    const { ctx, page } = await newPage();
    await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await clearRoom(page);
    await tile(page, /2026-27/).click({ timeout: 8000 }).catch(() => fail(`${tag}: no 2026-27 tile to start today's game`));
    /* 1. the nation tile */
    const nationTile = tile(page, new RegExp(esc(c.name)));
    const nationFound = await nationTile.waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
    if (!nationFound) { fail(`${tag}: step 1: no nation tile for ${c.name} (the page reads: ${(await text(page)).slice(0, 160)})`); await ctx.close(); continue; }
    const nationText = (await nationTile.innerText()).replace(/\s+/g, ' ');
    const wantLeagues = new RegExp(`\\b${c.leagues.length} leagues?\\b`); const wantClubs = new RegExp(`\\b${c.clubs} clubs\\b`);
    if (!wantLeagues.test(nationText) || !wantClubs.test(nationText)) fail(`${tag}: step 1: the ${c.name} tile reads "${nationText}", the engine has ${c.leagues.length} league(s) and ${c.clubs} clubs`);
    await overflow(page, 'the nation step');
    /* 2. the league tiles, the back button, the club tiles */
    await nationTile.click({ timeout: 5000 });
    for (const l of c.leagues) {
      const lt = tile(page, new RegExp(esc(l.name)));
      if (!(await lt.waitFor({ timeout: 8000 }).then(() => true).catch(() => false))) { fail(`${tag}: step 2: no league tile for ${l.name}`); continue; }
      const ltText = (await lt.innerText()).replace(/\s+/g, ' ');
      if (!new RegExp(`\\b${l.clubs.length} clubs\\b`).test(ltText)) fail(`${tag}: step 2: the ${l.name} tile reads "${ltText}", the league has ${l.clubs.length} clubs`);
      if (l.cup && !ltText.includes(l.cup)) fail(`${tag}: step 2: the ${l.name} tile does not name ${l.cup}: "${ltText}"`);
      if (!l.europe && /Champions League/i.test(ltText)) fail(`${tag}: step 2: the ${l.name} tile talks of the Champions League and the league hands out no European places`);
    }
    await overflow(page, 'the league step');
    /* the picker's own way back from the league step (the navbar's Back leaves the page) */
    const back = page.locator('button:visible').filter({ hasText: /^\s*All nations\s*$/ }).first();
    if (!(await back.count())) fail(`${tag}: step 2: no "All nations" back button on the league step`);
    else {
      await back.click({ timeout: 5000 });
      if (!(await tile(page, new RegExp(esc(c.name))).waitFor({ timeout: 8000 }).then(() => true).catch(() => false))) fail(`${tag}: step 2: the back button did not return to the nations`);
      else await tile(page, new RegExp(esc(c.name))).click({ timeout: 5000 });
    }
    const first = c.leagues[0];
    await tile(page, new RegExp(esc(first.name))).click({ timeout: 8000 }).catch(() => fail(`${tag}: step 2: could not open ${first.name}`));
    /* A club's tile is the button that holds its name and no longer club name of the league that contains it
       (a tile's text runs its parts together, so the name is matched as text, not as a word). */
    const clubTile = name => { let loc = page.locator('button:visible').filter({ hasText: name }); for (const longer of first.clubs.filter(x => x !== name && x.includes(name))) loc = loc.filter({ hasNotText: longer }); return loc.first(); };
    await clubTile(first.clubs[0]).waitFor({ timeout: 8000 }).catch(() => {});
    const seen = [];
    for (const club of first.clubs) if (await clubTile(club).count()) seen.push(club);
    if (seen.length !== first.clubs.length) fail(`${tag}: step 2: ${seen.length} of ${first.clubs.length} ${first.name} clubs have a tile (missing ${first.clubs.filter(x => !seen.includes(x)).slice(0, 5).join(', ')})`);
    await overflow(page, 'the club step');
    /* 3. a career at the league's first club */
    const club = first.clubs[0];
    await clubTile(club).click({ timeout: 8000 }).catch(() => fail(`${tag}: step 3: no ${club} tile to press`));
    await tile(page, /take the job|confirm|start/i).click({ timeout: 8000 }).catch(() => {});
    await page.getByText(/who is in the dugout/i).first().waitFor({ timeout: 8000 }).catch(() => {});
    await tile(page, /skip: just manage/i).click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const hub = await text(page);
    if (!/Season 1/i.test(hub) || !hub.includes(club)) fail(`${tag}: step 3: the hub did not open on ${club} in Season 1 (the page reads: ${hub.slice(0, 200)})`);
    await overflow(page, `the ${club} hub`);
    /* 5. the ? button */
    const opener = page.locator('button:visible[aria-label="How to play"]').first();
    if (!(await opener.count())) fail(`${tag}: step 5: no ? button on the hub`);
    else {
      await opener.click({ timeout: 5000 });
      await page.waitForTimeout(600);
      const helpText = await text(page);
      for (const l of c.leagues) if (!helpText.includes(l.name)) fail(`${tag}: step 5: the help does not name ${l.name}`);
      await page.keyboard.press('Escape');
    }
    counts.push(`${tag} ${c.name}: ${c.leagues.length} league(s), ${seen.length} club tiles, hub on ${club}`);
    await ctx.close();
  }

  /* 6. the old save */
  if (!CONTROL) {
    const raw = fs.readFileSync(path.join(ROOT, 'scripts', 'data', 'cmOldSave1052Fixture.json'), 'utf8');
    const { ctx, page } = await newPage({ fn: ([k, v]) => { try { if (!localStorage.getItem(k)) localStorage.setItem(k, v); } catch { /* storage blocked */ } }, arg: [SAVE_KEY, raw] });
    await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await clearRoom(page);
    await page.waitForTimeout(1500);
    let t = await text(page);
    if (!/Sevilla/.test(t)) { await tile(page, /continue|resume|Sevilla/i).click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(1200); t = await text(page); }
    if (!/Sevilla/.test(t) || !/Season 1/i.test(t)) fail(`${tag}: step 6: the old save did not open on Sevilla in Season 1 (the page reads: ${t.slice(0, 200)})`);
    await overflow(page, 'the old save\'s hub');
    counts.push(`${tag} old save: Sevilla`);
    await ctx.close();
  }
}
await browser.close();
console.log(counts.map(c => '   ' + c).join('\n'));
console.log(`   ${aborted} requests to the database host aborted`);
if (CONTROL) { console.log(`playClubManagerNewCountries: ${failures} failure(s) under control ${CONTROL}${failures ? '' : ': THE CONTROL DID NOT FIRE'}`); process.exit(failures ? 1 : 3); }
if (failures) { console.log(`playClubManagerNewCountries: ${failures} failure(s)`); process.exit(1); }
console.log(`playClubManagerNewCountries: green. ${expected.map(c => c.name).join(' and ')} can be picked, started and reopened at ${VIEWPORTS.map(v => v.join('x')).join(' and ')}.`);
