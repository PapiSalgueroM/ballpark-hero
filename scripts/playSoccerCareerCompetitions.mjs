/** Actual Soccer Career route: named saved cup games and the existing squad.
 * Captured career bytes supply a valid save; explicit fictional cup outcomes
 * come from the unit fixture. Scores below are simulation test results.
 * Run after a complete build. BASE reuses a host, SHOTS receives screenshots.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';
import { bundleAwardsNight } from './lib/careerAwardsNightBundle.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT || 4575);
const BASE = process.env.BASE || `http://127.0.0.1:${PORT}`;
const SHOTS = path.resolve(ROOT, process.env.SHOTS || '.tmp-fx/shots');
const B = await bundleAwardsNight(ROOT, { extra: {
  fixtures: 'src/test/fixtures/soccerSeasonCompetitions1173.ts', squad: 'src/lib/soccerClubSquad.ts',
} });
const captured = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8')).saves.find(s => s.id === 'ere').state;
const fixture = structuredClone(captured);
const lastIndex = fixture.seasons.length - 1;
const row = { ...structuredClone(B.fixtures.cupSeason), year: fixture.seasons[lastIndex].year, age: fixture.seasons[lastIndex].age };
const campaign = { ...structuredClone(B.fixtures.clubCampaign), seasonYear: row.year, club: row.club };
Object.assign(campaign.matches[1], { goalsAgainst: 1, aggAgainst: 2, decidedBy: 'penalties', pensFor: 4, pensAgainst: 5 });
row.clubCupRun = structuredClone(campaign);
fixture.seasons[lastIndex] = row;
const olderIndex = fixture.seasons.findLastIndex((season, index) => index < lastIndex && season.type === 'playing');
if (olderIndex < 0) throw new Error('fixture refused: no older playing row');
const older = fixture.seasons[olderIndex];
Object.assign(older, { championsLeague: true, domesticCup: false, leagueFinish: 7, leagueSize: 18 });
for (const key of ['leagueWorld', 'clubCupRun', 'clubCupTitle', 'cupRun']) delete older[key];
const club = B.soccer.FALLBACK_CLUBS.find(c => c.name === row.club);
if (!club) throw new Error('fixture refused: the club is absent from the game pool');
Object.assign(fixture, { currentClub: club.name, currentClubCountry: club.country, currentClubTier: club.tier,
  currentClubColor: club.color, currentLeague: club.league, phase: 'season_summary', pendingSummary: row, lastUCLResult: campaign });
let checks = 0, failed = 0;
const check = (ok, label) => { checks += 1; console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`); if (!ok) failed += 1; };
const saved = page => page.evaluate(() => localStorage.getItem('soccerCareerSave'));
const y = page => page.evaluate(() => scrollY);
async function keyClick(page, selector) {
  await page.locator(`${selector}:visible`).evaluate(el => el.focus({ preventScroll: true }));
  await page.keyboard.press('Enter');
}
async function namedShot(page, label) { await page.screenshot({ path: path.join(SHOTS, label) }); }
async function walk(width, height) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
  await ctx.addInitScript(bytes => {
    if (!sessionStorage.getItem('competition-harness')) {
      sessionStorage.setItem('competition-harness', '1');
      localStorage.setItem('soccerCareerSave', bytes);
      localStorage.setItem('cookie-consent', 'essential');
      localStorage.setItem('seasonCentre:help', '1');
      localStorage.setItem('soccerSquad:help', '1');
    }
  }, JSON.stringify(fixture));
  await ctx.route(/supabase\.co/, route => route.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error).slice(0, 180)));
  const tag = `${width}x${height}`;
  try {
    await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('[data-watch-week-by-week]', { timeout: 45000 });
    const bytes = await saved(page);
    const recordedTotals = await page.locator('[data-career-recorded-stats]').innerText();
    const view = B.squad.squadView(JSON.parse(bytes));
    if (!view) throw new Error('fixture refused: current squad did not resolve');
    const initialY = await y(page);
    await keyClick(page, '[data-watch-week-by-week]');
    await page.waitForSelector('[data-kickoff]', { timeout: 30000 });
    check(await page.locator('[data-centre-competition="domestic"]').innerText() === 'FA Cup', `${tag}: the actual route names its recorded FA Cup`);
    await page.locator('[data-kickoff]').getByRole('button').filter({ hasText: /^▶/ }).first().click();
    await page.waitForSelector('[data-matchday], [data-poster]');
    if (await page.locator('[data-poster]').count()) await page.locator('[data-centre-bar]').getByRole('button').filter({ hasText: /^▶/ }).first().click();
    for (let offers = 0; offers < 4; offers += 1) {
      await page.waitForSelector('[data-full-time], [data-moment-offer]');
      if (await page.locator('[data-full-time]').count()) break;
      await page.locator('[data-moment-pass]').click();
      await page.waitForTimeout(50);
    }
    await page.waitForSelector('[data-full-time]');
    await page.waitForTimeout(100);
    const leagueClock = await page.locator('[data-match-clock]').elementHandle();
    await keyClick(page, '[data-centre-competition="domestic"]');
    await page.waitForSelector('[data-centre-cup-games]');
    check(await page.locator('[data-centre-cup-open]').count() === 4, `${tag}: four recorded cup stages, no invented early fixtures`);
    await keyClick(page, '[data-centre-cup-open="1"]');
    await page.waitForSelector('[data-centre-cup-game="1"]');
    const domestic = await page.locator('[data-centre-cup-game]').innerText();
    check(domestic.includes('Quarter-final') && domestic.includes('Chelsea') && await page.locator('[data-centre-cup-score]').innerText() === '2-1', `${tag}: quarter-final opponent and exact saved score`);
    check(!/Home|Away/.test(domestic), `${tag}: no unresearched cup ground is claimed`);
    await page.getByRole('button', { name: '› Next game', exact: true }).click();
    await page.getByRole('button', { name: '› Next game', exact: true }).click();
    check((await page.locator('[data-centre-cup-game]').innerText()).includes('5-4 on penalties') && await page.locator('[data-centre-cup-score]').innerText() === '1-1', `${tag}: the final keeps its score and penalty result`);
    await namedShot(page, `career-competitions-${width}-fa-cup.png`);
    await page.getByRole('button', { name: '‹ All games', exact: true }).click();
    await keyClick(page, '[data-centre-competition="club"]');
    await page.waitForSelector('[data-centre-cup-games]');
    check(await page.locator('[data-centre-competition="club"]').innerText() === 'Champions League' && await page.locator('[data-centre-cup-open]').count() === 2, `${tag}: recorded European competition and both saved legs`);
    await keyClick(page, '[data-centre-cup-open="1"]');
    const european = await page.locator('[data-centre-cup-game]').innerText();
    check(european.includes('Quarter-final, leg 2') && european.includes('Barcelona') && european.includes('2-2 on aggregate') && european.includes('4-5 on penalties') && await page.locator('[data-centre-cup-score]').innerText() === '0-1', `${tag}: deciding leg keeps opponent, score, aggregate and penalties`);
    await page.keyboard.press('Tab');
    check(await page.locator('[data-centre-saved-competition] [role="dialog"]').evaluate(el => el.contains(document.activeElement)), `${tag}: Tab from the game heading stays inside the panel`);
    await namedShot(page, `career-competitions-${width}-european-tie.png`);
    await keyClick(page, '[data-centre-competition="squad"]');
    await page.waitForSelector('[data-centre-current-squad]');
    check((await page.locator('[data-centre-current-squad]').innerText()).includes('current club') && (await page.locator('[data-centre-current-squad]').innerText()).includes('Past matchday lineups were not kept'), `${tag}: current squad is clearly separate from historical matchday lineups`);
    await keyClick(page, '[data-squad-tile]');
    await page.waitForSelector('[data-squad-sheet]');
    check(await page.locator('[data-squad-source]').getAttribute('data-squad-source') === view.source, `${tag}: existing squad source label stays intact`);
    await keyClick(page, '[data-squad-open="eleven"]');
    await page.waitForSelector('[data-squad-xi]');
    const eleven = await page.locator('[data-squad-xi] [data-squad-man]').evaluateAll(els => els.map(el => el.getAttribute('title')));
    const expectedEleven = ['ATT', 'MID', 'DEF', 'GK'].flatMap(group => view.eleven[group].map(man => man.name));
    check(JSON.stringify(eleven) === JSON.stringify(expectedEleven) && eleven.length === 11, `${tag}: the actual eleven matches the existing squad model`);
    await namedShot(page, `career-competitions-${width}-eleven.png`);
    await page.keyboard.press('Escape');
    await page.waitForSelector('[data-squad-screen="home"]');
    check(await page.locator('[data-season-centre]:visible').count() === 1, `${tag}: leaving the eleven keeps the Season Centre open`);
    await keyClick(page, '[data-squad-open="bench"]');
    await page.waitForSelector('[data-squad-bench]');
    const bench = await page.locator('[data-squad-bench] [data-squad-name]').allTextContents();
    check(JSON.stringify(bench.map(name => name.trim().replace(/ ©$/, ''))) === JSON.stringify(view.bench.map(man => man.name)), `${tag}: every bench player matches the existing squad model`);
    await page.keyboard.press('Escape');
    await page.waitForSelector('[data-squad-screen="home"]');
    await page.keyboard.press('Escape');
    await page.waitForSelector('[data-squad-sheet]', { state: 'detached' });
    check(await page.locator('[data-squad-tile]').evaluate(el => el === document.activeElement), `${tag}: squad Back restores tile focus`);
    await keyClick(page, '[data-centre-competition="league"]');
    await page.waitForSelector('[data-full-time]');
    check(await page.locator('[data-match-clock]').evaluate((el, previous) => el === previous, leagueClock) && await page.locator('[data-centre-competition="league"]').evaluate(el => el === document.activeElement), `${tag}: returning to league keeps the exact watched match and selected-tab focus`);
    await page.getByRole('button', { name: /Sim the rest/ }).click();
    await page.waitForSelector('[data-review]');
    const leagueReview = await page.locator('[data-review]').elementHandle();
    await keyClick(page, '[data-centre-competition="domestic"]');
    await keyClick(page, '[data-centre-competition="league"]');
    check(await page.locator('[data-review]').evaluate((el, previous) => el === previous, leagueReview) && await page.locator('[data-kickoff]').count() === 0, `${tag}: completed league review survives competition changes without restarting`);
    await page.keyboard.press('Escape');
    await page.waitForSelector('[data-season-centre]', { state: 'detached' });
    check(await saved(page) === bytes && await y(page) === initialY, `${tag}: switching competitions and squads preserves save bytes and page scroll`);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await keyClick(page, '[data-watch-week-by-week]');
    await page.waitForSelector('[data-kickoff]');
    await page.locator('[data-kickoff]').getByRole('button').filter({ hasText: /^▶/ }).first().click();
    if (await page.locator('[data-poster]').count()) await page.locator('[data-centre-bar]').getByRole('button').filter({ hasText: /^▶/ }).first().click();
    await page.waitForFunction(() => Number(document.querySelector('[data-match-clock]')?.getAttribute('data-minute')) >= 3);
    const liveClock = await page.locator('[data-match-clock]').elementHandle();
    await keyClick(page, '[data-centre-competition="domestic"]');
    const frozenMinute = await page.locator('[data-match-clock]').getAttribute('data-minute');
    await page.waitForTimeout(500);
    check(await page.locator('[data-match-clock]').getAttribute('data-minute') === frozenMinute && await saved(page) === bytes, `${tag}: hidden live league clock and save stay frozen`);
    await keyClick(page, '[data-centre-competition="league"]');
    check(await page.locator('[data-match-clock]').evaluate((el, previous) => el === previous, liveClock) && Number(await page.locator('[data-match-clock]').getAttribute('data-minute')) >= Number(frozenMinute), `${tag}: returning resumes the same live clock without resetting its minute`);
    await page.getByRole('button', { name: /Pause/ }).click();
    const pausedMinute = await page.locator('[data-match-clock]').getAttribute('data-minute');
    await keyClick(page, '[data-centre-competition="domestic"]');
    await keyClick(page, '[data-centre-competition="league"]');
    check(await page.locator('[data-match-clock]').getAttribute('data-minute') === pausedMinute && await page.getByRole('button', { name: /Resume/ }).isVisible(), `${tag}: a paused league retains its minute and paused state across tabs`);
    await page.keyboard.press('Escape');
    await page.waitForSelector('[data-season-centre]', { state: 'detached' });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await keyClick(page, '[data-open-season-replays]');
    await page.waitForSelector('[data-season-picker]');
    await keyClick(page, `[data-replay-row="${olderIndex}"]`);
    await page.waitForSelector('[data-centre-league-unavailable]');
    check(await page.locator('[data-match-clock]').count() === 0, `${tag}: old trophy season is accessible without fabricating its unavailable league`);
    await keyClick(page, '[data-centre-competition="club"]');
    await page.waitForSelector('[data-centre-cup-missing]');
    const historical = await page.locator('[data-centre-saved-competition]').innerText();
    check(await page.locator('[data-centre-cup-open]').count() === 0 && historical.includes('not kept') && !historical.includes('Barcelona'), `${tag}: old replay marks missing games and never borrows the latest European opponents`);
    await keyClick(page, '[data-centre-competition="squad"]');
    check(await page.locator('[data-centre-competition-context]').innerText() === `${view.club} · Current squad · ${view.year}/${String(view.year + 1).slice(-2)}`, `${tag}: historical replay labels the actual current squad club and upcoming season`);
    await page.keyboard.press('Escape');
    await page.waitForSelector('[data-season-centre]', { state: 'detached' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-watch-week-by-week]', { timeout: 45000 });
    check(await saved(page) === bytes && await page.locator('[data-career-recorded-stats]').innerText() === recordedTotals, `${tag}: reload preserves all save bytes and recorded totals`);
    check(errors.length === 0 && await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${tag}: no page errors or sideways scroll${errors.length ? ` (${errors.join('; ')})` : ''}`);
  } finally { await ctx.close(); }
}

let server = null, browser = null;
try {
  if (!process.env.BASE) {
    if (!fs.existsSync(path.join(DIST, 'index.html'))) throw new Error('dist/index.html missing; run a build first');
    server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), DIST, String(PORT)], { stdio: 'ignore' });
    await new Promise(resolve => setTimeout(resolve, 1200));
  }
  fs.mkdirSync(SHOTS, { recursive: true });
  browser = await pw.chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });
  for (const [width, height] of [[390, 844], [1280, 900]]) {
    try { await walk(width, height); } catch (error) { check(false, `${width}x${height}: ${String(error.stack || error).slice(0, 500)}`); }
  }
} catch (error) { check(false, String(error.stack || error).slice(0, 500)); }
finally { await browser?.close(); server?.kill(); }
console.log(`playSoccerCareerCompetitions: ${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
