/** Actual offline Soccer Career route, fifteen saved fictional league seasons.
 * Existing club names and the world helpers supply each field. Relegation and
 * promotion settle from the actual derived final table, never real results.
 * BASE reuses a built host; SHOTS receives phone and desktop evidence.
 * PLAY_SOCCER_LEAGUE_WORLD_CONTROL=missing-snapshot removes a held snapshot
 * after expectations are prepared and must fail the visible movement check.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';
import { bundleAwardsNight } from './lib/careerAwardsNightBundle.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 4585);
const BASE = process.env.BASE || `http://127.0.0.1:${PORT}`;
const SHOTS = path.resolve(ROOT, process.env.SHOTS || '.tmp-fx/shots');
const CONTROL = process.env.PLAY_SOCCER_LEAGUE_WORLD_CONTROL || '';
if (CONTROL && CONTROL !== 'missing-snapshot') throw new Error(`unknown league-world control ${CONTROL}`);
const B = await bundleAwardsNight(ROOT, { extra: {
  world: 'src/lib/soccerCareerLeagueWorld.ts', season: 'src/lib/season/soccer.ts', core: 'src/lib/season/core.ts',
} });
const captured = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8')).saves.find(s => s.id === 'ere' && s.kind === 'player')?.state;
assert.ok(captured, 'recorded player save exists');
const club = B.soccer.FALLBACK_CLUBS.find(c => c.name === 'Arsenal');
assert.ok(club, 'fixture club belongs to the existing pool');
const state = structuredClone(captured);
const template = structuredClone(state.seasons.at(-1));
Object.assign(state, { playerName: 'Simulated League World Fixture', currentClub: club.name,
  currentClubCountry: club.country, currentClubTier: club.tier, currentClubColor: club.color,
  currentLeague: club.league, position: 'CM', overall: 82, seasons: [], events: [], awards: [], story: [],
  leagueWorld: undefined, phase: 'season_summary', pendingSummary: null, pendingBallonDor: null,
  pendingEvents: [], loan: null, pendingLoanOffers: null, transferSituation: null, retired: false });
delete state.seasonMoments;
const seasons = [], contexts = new Map();
for (let year = 2026; year <= 2040; year += 1) {
  B.world.prepareLeagueWorld(state, B.soccer.FALLBACK_CLUBS, year);
  const members = state.leagueWorld.leagues[state.currentLeague];
  assert.ok(members?.includes(club.name), `fixture ${year} belongs to its projected division`);
  const row = { ...structuredClone(template), year, age: 22 + year - 2026,
    club: club.name, clubCountry: club.country, clubTier: state.currentClubTier,
    apps: 30, leagueApps: 28, goals: 5, assists: 4, cleanSheets: 0, yellowCards: 2, redCards: 0,
    rating: 6.9, injury: null, injuryWeeks: 0, injurySevere: false,
    leagueTitle: year === 2027, leagueFinish: year === 2026 ? members.length : year === 2027 ? 1 : 7,
    leagueSize: members.length, domesticCup: false, championsLeague: false, worldCup: false,
    continentalCup: false, ballonDor: false, ballonDorRank: null, intApps: 0, intGoals: 0,
    intAssists: 0, intRating: 0, tournament: null, tournamentResult: null, type: 'playing' };
  for (const key of ['leagueWorld', 'derbies', 'cupRun', 'domesticCupName', 'clubCupRun', 'clubCupTitle', 'onLoanFrom', 'suspensionMatches']) delete row[key];
  state.seasons.push(row);
  B.world.recordLeagueWorldSeason(state, B.soccer.FALLBACK_CLUBS, row);
  const ctx = B.season.buildSoccerSeasonCtx(state, B.soccer.FALLBACK_CLUBS, row);
  const derived = B.core.deriveSeason(B.season.SOCCER, row, ctx);
  assert.ok(derived?.mode === 'table', `fixture ${year} actually derives a complete table`);
  assert.deepEqual(B.core.disagreements(B.season.SOCCER, row, ctx, derived), []);
  const table = B.core.tableAt(derived, derived.games.length);
  const order = table.map(entry => derived.labels[entry.slot].name);
  assert.equal(order.indexOf(club.name) + 1, row.leagueFinish);
  assert.deepEqual([...order].sort(), [...row.leagueWorld.members].sort());
  B.world.settleLeagueWorld(state, B.soccer.FALLBACK_CLUBS, row, order);
  seasons.push({ row, derived, table });
  B.world.prepareLeagueWorld(state, B.soccer.FALLBACK_CLUBS, year + 1);
  const snapshot = structuredClone(state);
  Object.assign(snapshot, { pendingSummary: snapshot.seasons.at(-1), phase: 'season_summary', age: row.age,
    events: [`📋 Completed the ${row.year} simulated season at ${row.club}.`] });
  contexts.set(year, snapshot);
}
assert.equal(seasons.length, 15);
assert.deepEqual(seasons[0].row.leagueWorld.movement, { club: club.name, from: 'Premier League', to: 'Championship', kind: 'relegated' });
assert.deepEqual(seasons[1].row.leagueWorld.movement, { club: club.name, from: 'Championship', to: 'Premier League', kind: 'promoted' });
assert.notDeepEqual([...seasons[0].row.leagueWorld.members].sort(), [...seasons.at(-1).row.leagueWorld.members].sort(), 'fifteen years must visibly change the held field');
for (const { row, derived } of seasons) {
  const replay = B.core.deriveSeason(B.season.SOCCER, row, B.season.buildSoccerSeasonCtx(contexts.get(2040), B.soccer.FALLBACK_CLUBS, row));
  assert.deepEqual(replay, derived, 'future movement cannot rewrite an older saved season');
}
console.log('fixture simulated: 15 held seasons2026-2040; Arsenal relegated2026, promoted2027; exact derived tables settle every swap');
let checks = 0, failed = 0, browser = null, server = null;
const check = (ok, label) => { checks += 1; console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`); if (!ok) failed += 1; };
const saved = page => page.evaluate(() => localStorage.getItem('soccerCareerSave'));
async function keyClick(page, selector) {
  await page.locator(`${selector}:visible`).evaluate(el => el.focus({ preventScroll: true }));
  await page.keyboard.press('Enter');
}
async function inspectSeason(page, width, item, tag) {
  const { row, derived, table } = item;
  await page.locator('[data-kickoff]:visible').waitFor({ timeout: 30000 });
  check((await page.locator('[data-kickoff]:visible').innerText()).includes(row.leagueWorld.league), `${tag}/${row.year}: kickoff uses the saved division ${row.leagueWorld.league}`);
  if (width < 768) {
    await keyClick(page, '[data-centre-fixtures]');
    const names = await page.locator('[data-centre-stage] [data-fixture-name]').allTextContents();
    const expected = derived.games.map(game => derived.labels[game.opp].name);
    check(JSON.stringify(names) === JSON.stringify(expected) && names.length === 2 * (row.leagueSize - 1), `${tag}/${row.year}: full phone opponents match the saved field and calendar`);
    await page.locator('[data-centre-stage]').getByRole('button', { name: '← Back', exact: true }).click();
  }
  await page.locator('[data-kickoff]:visible').getByRole('button', { name: '⏭ Straight to the final table', exact: true }).click();
  const review = page.locator('[data-review]:visible');
  await review.waitFor();
  const mine = table.findIndex(entry => entry.slot === 0);
  const start = width < 768 ? Math.max(0, Math.min(mine - 2, table.length - 5)) : 0;
  const slice = width < 768 ? table.slice(start, start + 5) : table;
  const expected = slice.map((entry, index) => [String(start + index + 1), derived.labels[entry.slot].key,
    String(entry.w), String(entry.d), String(entry.l), `${entry.gf}-${entry.ga}`,
    `${entry.gf - entry.ga > 0 ? '+' : ''}${entry.gf - entry.ga}`, String(entry.pts)]);
  const actual = await page.locator('[data-centre-table]:visible [data-club]').evaluateAll(els => els.map(el => [...el.children].map(cell => cell.textContent.trim())));
  check(JSON.stringify(actual) === JSON.stringify(expected), `${tag}/${row.year}: every visible final-table cell equals the actual derived season`);
  const text = await review.innerText();
  const movement = row.leagueWorld.movement;
  check(text.includes('Simulated league world: direct promotion and relegation between two divisions.')
    && (!movement || text.includes(`${movement.club} ${movement.kind} to ${movement.to}.`)), `${tag}/${row.year}: review labels the simulation and exact saved club movement`);
  const crowned = row.leagueFinish === 1 ? club.name : row.leagueWorld.champion;
  check(derived.labels[table[0].slot].name === crowned && (row.leagueFinish === 1 || await page.locator('[data-review-champion]').innerText() === `${crowned} won it`), `${tag}/${row.year}: champion agrees with the saved field and table`);
  if ([2026, 2027, 2040].includes(row.year)) await page.screenshot({ path: path.join(SHOTS, `soccer-career-world-${width}-${row.year}.png`), fullPage: false });
  await page.keyboard.press('Tab');
  check(await page.locator('[data-season-centre]:visible [role="dialog"]').evaluate(el => el.contains(document.activeElement)), `${tag}/${row.year}: keyboard focus stays in the replay`);
  await page.keyboard.press('Escape');
  await page.locator('[data-season-centre]').waitFor({ state: 'detached' });
}
async function journey(width, height, year, allSeasons) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
  const fixture = structuredClone(contexts.get(year));
  if (CONTROL && year === 2026) {
    assert.ok(fixture.pendingSummary.leagueWorld?.movement, 'control requires the real held snapshot');
    delete fixture.pendingSummary.leagueWorld;
    delete fixture.seasons.at(-1).leagueWorld;
    console.log(`control applied: ${width}/${year} held movement snapshot removed`);
  }
  const tag = `${width}x${height}`;
  try {
    await context.addInitScript(bytes => {
      if (!sessionStorage.getItem('league-world-harness')) {
        sessionStorage.setItem('league-world-harness', '1');
        localStorage.setItem('soccerCareerSave', bytes);
        localStorage.setItem('cookie-consent', 'essential');
        localStorage.setItem('seasonCentre:help', '1');
      }
    }, JSON.stringify(fixture));
    await context.route(/supabase\.co/, route => route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(String(error).slice(0, 180)));
    await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator('[data-watch-week-by-week]:visible').waitFor({ timeout: 45000 });
    const bytes = await saved(page);
    const totals = await page.locator('[data-career-recorded-stats]').innerText();
    const scroll = await page.evaluate(() => scrollY);
    const expected = contexts.get(year);
    const item = seasons.find(s => s.row.year === year);
    const projected = B.world.projectLeagueWorldClubs(expected, B.soccer.FALLBACK_CLUBS, year + 1).find(c => c.name === club.name);
    check(JSON.parse(bytes).currentLeague === projected.league && projected.league === expected.currentLeague, `${tag}/${year}: currentLeague follows the club's actual next-year membership`);
    const movement = item.row.leagueWorld.movement;
    if (movement) check((await page.locator('[data-summary-club-movement]').count()) === 1
      && (await page.locator('[data-summary-club-movement]').innerText()).includes(`${club.name} ${movement.kind} to ${movement.to} for next season.`), `${tag}/${year}: current summary prints the exact saved ${movement.kind}`);
    check((await page.locator('[data-summary-league-world]').allTextContents()).join(' ').includes("Your career's simulated league world"), `${tag}/${year}: summary clearly labels fictional league results`);
    if (CONTROL && year === 2026) return;
    if (movement) await page.screenshot({ path: path.join(SHOTS, `soccer-career-world-${width}-${year}-summary.png`), fullPage: false });
    await keyClick(page, '[data-watch-week-by-week]');
    await inspectSeason(page, width, item, tag);
    if (allSeasons) for (const earlier of seasons.slice(0, -1)) {
      await keyClick(page, '[data-open-season-replays]');
      await page.locator('[data-season-picker]').waitFor();
      check(await page.locator('[data-replay-row]').count() === 15 && await page.locator('[data-replay-locked]').count() === 0, `${tag}/${earlier.row.year}: all15 saved league worlds remain replayable`);
      await keyClick(page, `[data-replay-row="${seasons.indexOf(earlier)}"]`);
      await inspectSeason(page, width, earlier, tag);
    }
    check(await saved(page) === bytes && await page.locator('[data-career-recorded-stats]').innerText() === totals && await page.evaluate(() => scrollY) === scroll, `${tag}/${year}: all replay views preserve exact save, totals and page position`);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-watch-week-by-week]:visible').waitFor({ timeout: 45000 });
    check(await saved(page) === bytes && await page.locator('[data-career-recorded-stats]').innerText() === totals, `${tag}/${year}: reload preserves the exact league world and career totals`);
    check(errors.length === 0 && await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${tag}/${year}: no page errors or horizontal overflow${errors.length ? ` (${errors.join('; ')})` : ''}`);
  } finally { await context.close(); }
}
try {
  if (!process.env.BASE) {
    const dist = path.join(ROOT, 'dist');
    if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('dist/index.html absent; finish the build first');
    server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), dist, String(PORT)], { stdio: 'ignore' });
    await new Promise(resolve => setTimeout(resolve, 1200));
  }
  fs.mkdirSync(SHOTS, { recursive: true });
  browser = await pw.chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });
  for (const [width, height] of [[390, 844], [1280, 900]]) for (const year of [2026, 2027, 2040]) {
    try { await journey(width, height, year, year === 2040); }
    catch (error) { check(false, `${width}x${height}/${year}: ${String(error.stack || error).slice(0, 500)}`); }
  }
} catch (error) { check(false, String(error.stack || error).slice(0, 500)); }
finally { await browser?.close(); server?.kill(); }
console.log(`playSoccerCareerLeagueWorld: ${checks} checks, ${failed} failed; screenshots ${SHOTS}`);
process.exit(failed ? 1 : 0);
