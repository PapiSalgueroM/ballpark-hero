/** Actual Soccer Career route, recorded save shape with explicit simulated
 * card totals and a served ban. No historical results are asserted here.
 * Run after a completed build. BASE reuses a host; SHOTS receives evidence.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';
import { bundleAwardsNight } from './lib/careerAwardsNightBundle.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT || 4581);
const BASE = process.env.BASE || `http://127.0.0.1:${PORT}`;
const SHOTS = path.resolve(ROOT, process.env.SHOTS || '.tmp-fx/shots');
const B = await bundleAwardsNight(ROOT, { extra: {
  season: 'src/lib/season/soccer.ts', core: 'src/lib/season/core.ts', discipline: 'src/lib/soccerDiscipline.ts',
} });
const captured = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8')).saves.find(s => s.id === 'ere' && s.kind === 'player')?.state;
if (!captured) throw new Error('fixture refused: recorded player save absent');
const club = B.soccer.FALLBACK_CLUBS.find(c => c.name === 'Real Madrid');
if (!club) throw new Error('fixture refused: club absent from the game pool');
let fixture, derived, redGame;
for (let key = 0; key < 32 && !redGame; key += 1) {
  const candidate = structuredClone(captured);
  const row = candidate.seasons[candidate.seasons.length - 1];
  if (row.type !== 'playing') throw new Error('fixture refused: last recorded row is not playing');
  Object.assign(row, { club: club.name, clubCountry: club.country, clubTier: club.tier,
    apps: 30, leagueApps: 30, goals: 12, assists: 6, cleanSheets: 0, yellowCards: 4, redCards: 1,
    rating: 7.5, suspensionMatches: 3, injury: null, injuryWeeks: 0, injurySevere: false,
    leagueTitle: false, domesticCup: false, championsLeague: false, worldCup: false, ballonDor: false, ballonDorRank: null });
  for (const field of ['leagueFinish', 'leagueSize', 'leagueWorld', 'derbies', 'cupRun', 'clubCupRun', 'clubCupTitle']) delete row[field];
  Object.assign(candidate, { playerName: `Discipline Fixture ${key}`, position: 'ST',
    currentClub: club.name, currentClubCountry: club.country, currentClubTier: club.tier,
    currentClubColor: club.color, currentLeague: club.league, phase: 'season_summary', pendingSummary: row,
    pendingBallonDor: null, pendingEvents: [], pendingAppealResult: null });
  delete candidate.seasonMoments;
  delete candidate.pendingSuspensionMatches;
  const ctx = B.season.buildSoccerSeasonCtx(candidate, B.soccer.FALLBACK_CLUBS, row);
  const plan = B.core.deriveSeason(B.season.SOCCER, row, ctx);
  if (!plan || plan.games.length !== 38 || B.core.disagreements(B.season.SOCCER, row, ctx, plan).length) continue;
  const game = plan.games.find((g, index) => g.line.red === 1 && plan.games[index + 1]?.why === 'suspended'
    && g.events.some(e => e.kind === 'goal' && e.min > g.offAt));
  if (game) { fixture = candidate; derived = plan; redGame = game; }
}
if (!fixture || !derived || !redGame) throw new Error('fixture refused: no actual derived midseason send-off, suspension and later goal to witness');
const row = fixture.seasons[fixture.seasons.length - 1];
const red = redGame.events.find(e => e.kind === 'red' && e.mine);
if (!red || red.min !== redGame.offAt || redGame.events.some(e => e.mine && e.min > red.min)) throw new Error('fixture refused: card time disagrees with his off time');
if (derived.games.reduce((n, g) => n + (g.line.red ?? 0), 0) !== row.redCards || derived.games.reduce((n, g) => n + (g.line.yellow ?? 0), 0) !== row.yellowCards) throw new Error('fixture refused: cards do not conserve recorded totals');
console.log(`fixture simulated: matchday ${redGame.md}, red at ${red.min}, next game suspended, ${row.yellowCards} yellows/${row.redCards} reds, ${row.suspensionMatches} served club bans`);

let checks = 0, failed = 0, server = null, browser = null;
const check = (ok, label) => { checks += 1; console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`); if (!ok) failed += 1; };
const saved = page => page.evaluate(() => localStorage.getItem('soccerCareerSave'));
async function keyClick(page, selector) {
  await page.locator(`${selector}:visible`).evaluate(el => el.focus({ preventScroll: true }));
  await page.keyboard.press('Enter');
}
async function finishMatch(page, md) {
  if (await page.locator('[data-poster]:visible').count()) await page.locator('[data-centre-bar]:visible').getByRole('button').filter({ hasText: /^▶/ }).first().click();
  await page.locator(`[data-matchday="${md}"]:visible`).waitFor({ timeout: 10000 });
  for (let offers = 0; offers < 4; offers += 1) {
    await page.locator('[data-full-time]:visible, [data-moment-offer]:visible').first().waitFor({ timeout: 10000 });
    if (await page.locator('[data-full-time]:visible').count()) return;
    await page.locator('[data-moment-pass]:visible').click();
  }
  await page.locator('[data-full-time]:visible').waitFor({ timeout: 10000 });
}
async function journey(width, height) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
  const tag = `${width}x${height}`;
  try {
    await context.addInitScript(bytes => {
      if (!sessionStorage.getItem('discipline-harness')) {
        sessionStorage.setItem('discipline-harness', '1');
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
    await keyClick(page, '[data-watch-week-by-week]');
    await page.locator('[data-kickoff]:visible').waitFor({ timeout: 30000 });
    await page.locator('[data-kickoff]:visible').getByRole('button').filter({ hasText: /^▶/ }).first().click();
    let yellowCount = 0, redCount = 0;
    for (let md = 1; md <= derived.games.length; md += 1) {
      await finishMatch(page, md);
      const game = derived.games[md - 1];
      const panel = page.locator(`[data-matchday="${md}"]:visible`);
      const events = await panel.locator('[data-clock-events] li').evaluateAll(els => els.map(el => ({
        minute: Number(el.firstElementChild?.textContent.replace(/\D/g, '')),
        text: el.lastElementChild?.textContent.trim(),
      })));
      const reds = events.filter(e => e.text === '🟥 Sent off');
      const yellows = events.filter(e => e.text === '🟨 You go in the book');
      redCount += reds.length; yellowCount += yellows.length;
      check(reds.length === (game.line.red ?? 0) && yellows.length === (game.line.yellow ?? 0), `${tag} matchday${md}: actual card feed matches that game's recorded allocation`);
      const expectedScore = game.home ? `${game.us}-${game.them}` : `${game.them}-${game.us}`;
      check(await panel.locator('[data-score-bug]').innerText() === expectedScore, `${tag} matchday${md}: cards leave the exact derived score ${expectedScore}`);
      if (md === redGame.md) {
        check(reds.length === 1 && reds[0].minute === red.min && red.min === redGame.offAt
          && (await panel.locator('[data-his-line]').innerText()).includes('🟥 Sent off'), `${tag}: send-off text and minute match his offAt and his match line`);
        check(await panel.locator('[data-mini-pitch]').count() === 1 && await panel.locator('[data-pitch-ring]').count() === 0, `${tag}: a goal after his red shows him off the pitch`);
        await page.screenshot({ path: path.join(SHOTS, `soccer-career-discipline-${width}-red.png`), fullPage: false });
      }
      if (md === redGame.md + 1) {
        check(await panel.locator('[data-his-line]').innerText() === 'Suspended' && events.every(e => !/You|Sent off/.test(e.text)), `${tag}: next match says Suspended with no player events`);
        await page.screenshot({ path: path.join(SHOTS, `soccer-career-discipline-${width}-ban.png`), fullPage: false });
      }
      if (game.why === 'suspended') check(await panel.locator('[data-his-line]').innerText() === 'Suspended', `${tag} matchday${md}: served-ban gaps are visible`);
      if (md < derived.games.length) await page.locator('[data-centre-bar]:visible').getByRole('button', { name: `▶ League game ${md + 1}`, exact: true }).click();
    }
    check(redCount === row.redCards && yellowCount === row.yellowCards, `${tag}: actual complete match feeds conserve ${row.redCards} red and ${row.yellowCards} yellow cards`);
    await page.locator('[data-centre-bar]:visible').getByRole('button', { name: '📋 Season review', exact: true }).click();
    const review = page.locator('[data-review]:visible');
    await review.waitFor();
    const text = await review.innerText();
    check(text.includes(`Discipline: ${B.discipline.soccerCardLine(row.yellowCards, row.redCards)} in all competitions.`)
      && text.includes(`${row.suspensionMatches} club matches missed through suspension.`), `${tag}: review uses exact saved cards and actually served ban count`);
    await page.screenshot({ path: path.join(SHOTS, `soccer-career-discipline-${width}-review.png`), fullPage: false });
    check(await saved(page) === bytes, `${tag}: watching all cards preserves exact career save bytes`);
    await keyClick(page, '[data-centre-exit]');
    await page.locator('[data-season-centre]').waitFor({ state: 'detached' });
    check(await page.evaluate(() => scrollY) === scroll && await page.locator('[data-career-recorded-stats]').innerText() === totals, `${tag}: closing restores page position and recorded stats`);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-watch-week-by-week]:visible').waitFor({ timeout: 45000 });
    check(await saved(page) === bytes && await page.locator('[data-career-recorded-stats]').innerText() === totals, `${tag}: reload preserves exact save and totals`);
    check(errors.length === 0 && await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${tag}: no page errors or horizontal overflow${errors.length ? ` (${errors.join('; ')})` : ''}`);
  } finally { await context.close(); }
}
try {
  if (!process.env.BASE) {
    if (!fs.existsSync(path.join(DIST, 'index.html'))) throw new Error('dist/index.html absent; finish the build first');
    server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), DIST, String(PORT)], { stdio: 'ignore' });
    await new Promise(resolve => setTimeout(resolve, 1200));
  }
  fs.mkdirSync(SHOTS, { recursive: true });
  browser = await pw.chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });
  for (const [width, height] of [[390, 844], [1280, 900]]) {
    try { await journey(width, height); } catch (error) { check(false, `${width}x${height}: ${String(error.stack || error).slice(0, 500)}`); }
  }
} catch (error) { check(false, String(error.stack || error).slice(0, 500)); }
finally { await browser?.close(); server?.kill(); }
console.log(`playSoccerCareerDiscipline: ${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
