/* Round 1555 walk (not committed): play NBA Starting 5 end to end on the built site with the database host MOCKED
 * (every supabase.co request is answered locally or aborted; nothing reaches the network). Every team gets the same
 * made up roster (WalkA..WalkE plus a Ghost with no record), every number is linear in one factor, so the score is 50
 * on every challenge and both directions: best five 13+13+19+19+22 = 86 (scaled), worst 10+10+16+16+22 = 74, the
 * walked five A, B, C, D, E = 80.  Run: BASE=http://localhost:4173 node .rc/x/walk1555.mjs */
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium, devices } = pw;
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '.';
const ALL_CODES = 'ATL,BOS,BRK,NJN,NYN,CHO,CHH,CHA,CHI,CLE,DAL,DEN,DET,GSW,SFW,HOU,SDR,IND,LAC,SDC,BUF,LAL,MEM,VAN,MIA,MIL,MIN,NOP,NOH,NOK,NYK,OKC,SEA,ORL,PHI,PHO,POR,SAC,KCK,KCO,CIN,SAS,TOR,UTA,NOJ,WAS,WSB,CAP,BAL';
const LETTERS = [['A', 'G', 10], ['B', 'G', 13], ['C', 'F', 16], ['D', 'F', 19], ['E', 'C', 22]];
const nickOf = team => team.split(' ').pop().replace(/[^A-Za-z0-9]/g, '');
const roster = team => [
  ...LETTERS.map(([l, pos], i) => ({ player_id: i + 1, first_name: `Walk${l}`, last_name: nickOf(team), position: pos, team })),
  { player_id: 9, first_name: 'Ghost', last_name: nickOf(team), position: null, team },
];
const ALL_TEAMS = new Set(['Atlanta Hawks', 'Boston Celtics', 'Brooklyn Nets', 'Charlotte Hornets', 'Chicago Bulls',
  'Cleveland Cavaliers', 'Dallas Mavericks', 'Denver Nuggets', 'Detroit Pistons', 'Golden State Warriors', 'Houston Rockets',
  'Indiana Pacers', 'LA Clippers', 'Los Angeles Lakers', 'Memphis Grizzlies', 'Miami Heat', 'Milwaukee Bucks',
  'Minnesota Timberwolves', 'New Orleans Pelicans', 'New York Knicks', 'Oklahoma City Thunder', 'Orlando Magic',
  'Philadelphia 76ers', 'Phoenix Suns', 'Portland Trail Blazers', 'Sacramento Kings', 'San Antonio Spurs',
  'Toronto Raptors', 'Utah Jazz', 'Washington Wizards']);
const records = () => [...ALL_TEAMS].flatMap(team => LETTERS.map(([l, , f]) => {
  const games = f * 50;
  return { id: 1, player_name: `Walk${l} ${nickOf(team)}`, teams: ALL_CODES, year_from: '1995-96', games,
    points: f * games, trb: (f / 2) * games, ast: (f / 4) * games, stl: (f / 10) * games, blk: (f / 10) * games, three_p: f * 40 };
}));
let fails = 0;
const fail = m => { fails += 1; console.error(`  FAIL: ${m}`); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
let reached = 0;
await ctx.route(/supabase\.co/, async route => {
  const url = new URL(route.request().url());
  if (url.pathname.endsWith('/rest/v1/nba_players_extended_v2')) {
    const eq = url.searchParams.get('team') || '';
    const team = eq.startsWith('eq.') ? decodeURIComponent(eq.slice(3)) : '';
    if (team) ALL_TEAMS.add(team);
    reached += 1;
    /* Release BR triage: since c13d48a6 (Round 1555's own, after this walk last ran green on fb3081a2) the page also
       reads the whole table, unfiltered, as a name census and refuses every team when it comes back empty
       ("Couldn't load the record"). The census is every walked roster once; WALK1555_CONTROL=twice lists each name
       twice, so every pick is held as a namesake and the walk must go red. */
    const census = [...ALL_TEAMS].flatMap(roster);
    const body = team ? roster(team) : process.env.WALK1555_CONTROL === 'twice' ? [...census, ...census] : census;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  }
  if (url.pathname.endsWith('/rest/v1/nba_player_stats')) {
    reached += 1;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(records()) });
  }
  return route.abort();
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto(`${BASE}/nba-starting-5`, { waitUntil: 'load' });
for (const name of [/reject/i, /decline/i, /necessary only/i]) {
  const b = page.getByRole('button', { name }).first();
  if (await b.isVisible().catch(() => false)) { await b.click().catch(() => {}); break; }
}
await page.getByRole('button', { name: /Let's Go/ }).click({ timeout: 20000 });
const banner = (await page.locator('text=/Find the/').first().textContent({ timeout: 10000 }).catch(() => '')) || '';
console.log(`   challenge: ${banner.replace(/\s+/g, ' ').trim()}`);
const roles = ['PG', 'SG', 'SF', 'PF', 'C'];
for (let i = 0; i < 5; i++) {
  const btn = page.getByRole('button', { name: roles[i], exact: true });
  await btn.waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForFunction(r => [...document.querySelectorAll('button')].some(b => b.textContent?.trim() === r && !b.disabled), roles[i], { timeout: 15000 });
  await btn.click();
  const input = page.getByRole('combobox');
  await input.waitFor({ timeout: 10000 });
  if (i === 0) {
    await input.fill('Ghost');
    await page.getByRole('option').filter({ hasText: 'Ghost' }).first().click({ timeout: 10000 });
    const refused = await page.locator('text=/can.t find a career line/').first().waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false);
    if (!refused) fail('a pick with no record was not refused with the reason');
    else console.log('   the Ghost pick was refused with the reason');
    await page.screenshot({ path: `${OUT}/nba5-refusal.png` });
    await input.fill('');
  }
  await input.fill('Walk');
  await page.getByRole('option').filter({ hasText: `Walk${LETTERS[i][0]}` }).first().click({ timeout: 10000 });
  await page.waitForTimeout(400);
}
await page.getByRole('button', { name: /Submit Lineup/ }).click({ timeout: 20000 });
await page.locator('text=Best five your teams allowed').first().waitFor({ timeout: 15000 }).catch(() => fail('no best five list on the result'));
await page.waitForTimeout(2500);
const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
await page.screenshot({ path: `${OUT}/nba5-result.png`, fullPage: true });
if (!/out of 100/.test(body)) fail('the result does not say out of 100');
if (!/\b50\b/.test(body)) fail('the score 50 the mock league fixes is not on the result');
if (/All-Time Five|AI referee|offline judge/.test(body)) fail('the old verdict words are still on the result');
const m = body.match(/Your five: ([0-9.]+)[^.]*\. The best five your teams allowed: ([0-9.]+)\. The worst: ([0-9.]+)\./);
console.log(`   result line: ${m ? m[0] : 'not found'}`);
if (!m) fail('the stat line with your, best and worst totals is missing');
if (errors.length) fail(`page errors: ${errors.slice(0, 3).join(' | ')}`);
if (reached < 2) fail(`the mocked record was asked ${reached} times, the walk did not reach the pool`);
await browser.close();
if (fails) { console.error(`walk1555: RED, ${fails} failure(s)`); process.exit(1); }
console.log(`walk1555: green. Refusal shown, five scored 50 out of 100 against the mocked best and worst, ${reached} mocked reads, no page error.`);
