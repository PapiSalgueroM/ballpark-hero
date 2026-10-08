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
      hub opens on that club in Season 1, with no horizontal overflow. The
      Table tab's card holds one row a club of the league.
   5. The ? button: the help names the league and closes.
   7. A live match at that club: Play Live opens the pitch and the match is
      driven to FULL TIME; back at the club the table still holds one row a
      club. This step also runs a third time at 390 by 844 with the browser
      asking for reduced motion (the walk only asks that the match plays to
      full time there with no error; what reduced motion must look like is
      held by playReducedMotion and src/test/liveSimMotion.test.tsx).
   6. The old save: scripts/data/cmOldSave1052Fixture.json, written by the
      engine before the round, is put under the save key before the page
      loads. The page opens on the save slots, the walk presses Resume
      Career, and the HUB must open on Sevilla: the tabs are there and the
      slots screen is gone. (The first cut of this step passed on the slot
      tile's own words, "Sevilla" and "Season 1", without ever opening the
      save.) Then the Table tab, Browse leagues, and each new league's tile:
      the card must draw one row a club of that league with no error, in a
      save that holds no table for it yet. The sentence the card prints is
      put in the output and a screenshot is saved when PLAY_SHOTS (or the
      remote runner's RC_OUT) names a folder.
   (Step 4 is Argentina's and joins with that country.)

   Negative controls (PLAY_NEWCOUNTRIES_CONTROL):
     nonation  looks for a nation the game does not have: red at step 1.
     noresume  step 6 does not press Resume Career: red at step 6, because
               the slots screen is not the hub.

   MEASURED 2026-10-08 on a GitHub runner at 3d26d7e0, a plain build served
   like the host: green, exit 0, 55 seconds. At 390x844, at 1280x800 and at
   390x844 with reduced motion asked for: the Russia tile with the engine's
   1 league and 16 clubs, the league tile with its 16 clubs and the Russian
   Cup and no Champions League, All nations back to the nations, 16 club
   tiles, the hub on Zenit in Season 1 with 16 rows on its table card, the
   help naming the league, a live match played to full time and the table
   then reading "Russian Premier League · round 1 of 30" with 16 rows. At
   the first two: the old save's slots, Resume Career, the hub on Sevilla,
   the browser saying "27 leagues in this save" and the Russian Premier
   League drawing 16 rows under "pre-season, alphabetical order" (the save
   holds no table for the league until its first summer, so the card shows
   every club on zero while the save is four weeks from its end: no error,
   and the card's wording is its owner's to change). No sideways overflow
   anywhere; 8 requests to the database host aborted, no console or page
   error. Controls: nonation 3 failures (step 1 in each run), noresume 2
   (step 6 at each size), both exit 1.

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
if (CONTROL && !['nonation', 'noresume'].includes(CONTROL)) { console.error(`PLAY_NEWCOUNTRIES_CONTROL=${CONTROL} is not a control this walk knows (nonation, noresume)`); process.exit(2); }
const SHOTS = process.env.PLAY_SHOTS || process.env.RC_OUT || '';
/* The countries the round added, by nation id. Everything else is read from the engine. */
const COUNTRIES = (process.env.PLAY_NEWCOUNTRIES || 'russia').split(',');
/* width, height, reduced motion asked for */
const VIEWPORTS = [[390, 844, false], [1280, 800, false], [390, 844, true]];
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
/* the old save's club and its league, from the fixture and the engine */
const OLD_CLUB = 'Sevilla';
const OLD_LEAGUE = cm.REAL_LEAGUES.find(l => l.clubs.includes(OLD_CLUB));
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const browser = await chromium.launch();
let aborted = 0;
const counts = [];
for (const [w, h, reduced] of VIEWPORTS) {
  const tag = `${w}x${h}${reduced ? ' reduced motion' : ''}`;
  const newPage = async init => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
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
  const press = (page, rx, ms = 800) => page.locator('button:visible').filter({ hasText: rx }).first().click({ timeout: ms }).then(() => true).catch(() => false);
  /* the Table tab's card: its heading and how many club rows it draws */
  const tableCard = page => page.evaluate(() => {
    const root = document.querySelector('[data-world-tables]');
    if (!root) return null;
    const heading = (root.innerText || '').split('\n').map(s => s.trim()).find(s => /pre-season|round \d+ of \d+/i.test(s)) || '';
    return { rows: new Set([...root.querySelectorAll('[data-club]')].map(e => e.getAttribute('data-club'))).size, title: heading };
  });
  const openTable = async page => { await page.getByRole('tab', { name: /^Table$/ }).first().click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(800); return tableCard(page); };
  const clearRoom = async page => { await page.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1500 }).catch(() => {}); };

  for (const c of CONTROL === 'noresume' ? [] : expected) {
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
    const card0 = await openTable(page);
    if (!card0 || card0.rows !== first.clubs.length) fail(`${tag}: step 3: the table card draws ${card0 ? card0.rows : 'no'} rows for ${first.name}, the league has ${first.clubs.length} clubs`);
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
    /* 7. a live match at the club, to full time */
    await page.getByRole('tab', { name: /^Home$/ }).first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
    let liveNote = 'not started';
    if (!(await press(page, /Play Live/i, 6000))) fail(`${tag}: step 7: no Play Live button on the ${club} hub`);
    else if (!(await page.locator('[data-cm-live-pitch]').first().waitFor({ timeout: 10000 }).then(() => true).catch(() => false))) fail(`${tag}: step 7: Play Live did not open the pitch`);
    else {
      const fixture = (await text(page)).slice(0, 400);
      if (!fixture.includes(club)) fail(`${tag}: step 7: the live match does not name ${club}`);
      const heading = async () => ((await page.locator('h1').first().innerText({ timeout: 700 }).catch(() => '')) || '').trim().toUpperCase();
      let finished = false;
      const deadline = Date.now() + 120000;
      while (!finished && Date.now() < deadline) {
        if ((await heading()) === 'FULL TIME') { finished = true; break; }
        if (await press(page, /full report/i, 600)) { await page.waitForTimeout(700); continue; }
        await press(page, /^\s*4x\s*$/, 600);
        if (await press(page, /second half/i, 600)) { await page.waitForTimeout(500); continue; }
        if (await press(page, /skip/i, 600)) { await page.waitForTimeout(600); continue; }
        if (await press(page, /take the pens|penalt|continue|carry on|next/i, 600)) { await page.waitForTimeout(500); continue; }
        await page.waitForTimeout(1200);
      }
      if (!finished) fail(`${tag}: step 7: the live match at ${club} did not reach FULL TIME in two minutes (the page reads: ${(await text(page)).slice(0, 160)})`);
      else {
        for (let i = 0; i < 6; i++) { if (await page.getByRole('tab', { name: /^Table$/ }).count()) break; if (!(await press(page, /continue|next|carry on|club home|back to club|^ok$/i, 1500))) break; await page.waitForTimeout(700); }
        const card1 = await openTable(page);
        if (!card1 || card1.rows !== first.clubs.length) fail(`${tag}: step 7: after the match the table card draws ${card1 ? card1.rows : 'no'} rows, the league has ${first.clubs.length} clubs`);
        liveNote = `full time, table then "${card1?.title ?? 'none'}"`;
      }
    }
    counts.push(`${tag} ${c.name}: ${c.leagues.length} league(s), ${seen.length} club tiles, hub on ${club}, ${card0?.rows ?? 0} table rows, live match ${liveNote}`);
    await ctx.close();
  }

  /* 6. the old save: resumed, then every new league in the world browser */
  if (CONTROL !== 'nonation' && !reduced) {
    const raw = fs.readFileSync(path.join(ROOT, 'scripts', 'data', 'cmOldSave1052Fixture.json'), 'utf8');
    const { ctx, page } = await newPage({ fn: ([k, v]) => { try { if (!localStorage.getItem(k)) localStorage.setItem(k, v); } catch { /* storage blocked */ } }, arg: [SAVE_KEY, raw] });
    await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await clearRoom(page);
    await page.waitForTimeout(1500);
    const slots = await text(page);
    if (!/Resume Career/i.test(slots) || !/Sevilla/.test(slots)) fail(`${tag}: step 6: the page did not open on the save slots with the Sevilla save (it reads: ${slots.slice(0, 200)})`);
    if (CONTROL !== 'noresume') { await press(page, /Resume Career/i, 5000); await page.waitForTimeout(1800); }
    /* the hub, not the slot tile: the tabs are there and the slots screen is gone */
    const tabs = await page.getByRole('tab').count();
    const hubText = await text(page);
    const onHub = tabs > 0 && !/Resume Career/i.test(hubText) && /Sevilla/.test(hubText);
    if (!onHub) fail(`${tag}: step 6: the old save's hub did not open on Sevilla (${tabs} tabs; the page reads: ${hubText.slice(0, 200)})`);
    else {
      await overflow(page, 'the old save\'s hub');
      const mine = await openTable(page);
      if (!mine || mine.rows !== OLD_LEAGUE.clubs.length) fail(`${tag}: step 6: the old save's own table draws ${mine ? mine.rows : 'no'} rows, ${OLD_LEAGUE.name} has ${OLD_LEAGUE.clubs.length} clubs`);
      for (const c of expected) for (const l of c.leagues) {
        if (!(await press(page, /Browse leagues/i, 5000))) { fail(`${tag}: step 6: no Browse leagues button in the old save`); continue; }
        await page.waitForTimeout(500);
        const said = ((await page.locator('[data-world-tables]').innerText().catch(() => '')).match(/\d+ leagues in this save/) || [''])[0];
        const lt = page.locator(`[data-world-league="${l.id}"]`).first();
        if (!(await lt.count())) { fail(`${tag}: step 6: the old save's world browser has no tile for ${l.name}`); continue; }
        await lt.scrollIntoViewIfNeeded().catch(() => {});
        await lt.click({ timeout: 4000 }).catch(() => fail(`${tag}: step 6: the ${l.name} tile could not be pressed`));
        await page.waitForTimeout(700);
        const card = await tableCard(page);
        if (!card || card.rows !== l.clubs.length) fail(`${tag}: step 6: in the old save the ${l.name} table draws ${card ? card.rows : 'no'} rows, the league has ${l.clubs.length} clubs`);
        if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, `newcountries-oldsave-${l.id}-${w}.png`) }).catch(() => {}); }
        counts.push(`${tag} old save, resumed on Sevilla: browser says "${said}"; ${l.name} draws ${card?.rows ?? 0} rows under "${card?.title ?? 'no heading'}"`);
      }
    }
    await ctx.close();
  }
}
await browser.close();
console.log(counts.map(c => '   ' + c).join('\n'));
console.log(`   ${aborted} requests to the database host aborted`);
if (CONTROL) { console.log(`playClubManagerNewCountries: ${failures} failure(s) under control ${CONTROL}${failures ? '' : ': THE CONTROL DID NOT FIRE'}`); process.exit(failures ? 1 : 3); }
if (failures) { console.log(`playClubManagerNewCountries: ${failures} failure(s)`); process.exit(1); }
console.log(`playClubManagerNewCountries: green. ${expected.map(c => c.name).join(' and ')} can be picked, started, played live and found in an old save's world (${VIEWPORTS.length} runs: ${VIEWPORTS.map(v => `${v[0]}x${v[1]}${v[2] ? ' reduced motion' : ''}`).join(', ')}).`);
