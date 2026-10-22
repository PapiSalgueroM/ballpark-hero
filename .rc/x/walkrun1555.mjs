/* Round 1555 adversarial review (runs lens): PLAY NBA Starting 5 on the built site with the database host MOCKED
 * (every supabase.co request is answered locally or aborted). Unlike the builder's walk, every team's numbers differ,
 * so Highest and Lowest give different scores, and the walk computes the expected best five, worst five, score and
 * every pick's "best here" ITSELF (an independent brute force over the 120 slot orders) and compares them with the
 * page. 390x844 and 1280x900, reduced motion on and off, two games each (Play Again between). Fixture names only.
 * Run: BASE=http://localhost:4173 RC_OUT=out node .rc/x/walkrun1555.mjs */
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '.';
const TEAMS = ['Atlanta Hawks', 'Boston Celtics', 'Brooklyn Nets', 'Charlotte Hornets', 'Chicago Bulls',
  'Cleveland Cavaliers', 'Dallas Mavericks', 'Denver Nuggets', 'Detroit Pistons', 'Golden State Warriors', 'Houston Rockets',
  'Indiana Pacers', 'LA Clippers', 'Los Angeles Lakers', 'Memphis Grizzlies', 'Miami Heat', 'Milwaukee Bucks',
  'Minnesota Timberwolves', 'New Orleans Pelicans', 'New York Knicks', 'Oklahoma City Thunder', 'Orlando Magic',
  'Philadelphia 76ers', 'Phoenix Suns', 'Portland Trail Blazers', 'Sacramento Kings', 'San Antonio Spurs',
  'Toronto Raptors', 'Utah Jazz', 'Washington Wizards'];
const CODE = { 'Atlanta Hawks': 'ATL', 'Boston Celtics': 'BOS', 'Brooklyn Nets': 'BRK', 'Charlotte Hornets': 'CHO', 'Chicago Bulls': 'CHI',
  'Cleveland Cavaliers': 'CLE', 'Dallas Mavericks': 'DAL', 'Denver Nuggets': 'DEN', 'Detroit Pistons': 'DET', 'Golden State Warriors': 'GSW',
  'Houston Rockets': 'HOU', 'Indiana Pacers': 'IND', 'LA Clippers': 'LAC', 'Los Angeles Lakers': 'LAL', 'Memphis Grizzlies': 'MEM',
  'Miami Heat': 'MIA', 'Milwaukee Bucks': 'MIL', 'Minnesota Timberwolves': 'MIN', 'New Orleans Pelicans': 'NOP', 'New York Knicks': 'NYK',
  'Oklahoma City Thunder': 'OKC', 'Orlando Magic': 'ORL', 'Philadelphia 76ers': 'PHI', 'Phoenix Suns': 'PHO', 'Portland Trail Blazers': 'POR',
  'Sacramento Kings': 'SAC', 'San Antonio Spurs': 'SAS', 'Toronto Raptors': 'TOR', 'Utah Jazz': 'UTA', 'Washington Wizards': 'WAS' };
const nick = team => team.split(' ').pop().replace(/[^A-Za-z0-9]/g, '');
/* [first name, position, base(t), year_from]; Twin is on the roster twice (a namesake), Ghost has no record. */
const PEOPLE = [
  ['Ace', 'G', t => 5 + (t * 3) % 11], ['Bolt', 'G', t => 8 + (t * 5) % 13], ['Cruz', 'F', t => 6 + (t * 7) % 9],
  ['Dove', 'F', t => 3 + (t * 11) % 17], ['Echo', 'C', t => 4 + (t * 2) % 15], ['Flex', null, t => 2 + (t * 13) % 23],
  ['Oldie', 'G', t => 20 + t % 7, '1970-71'], ['Twin', 'F', () => 9],
];
const recordOf = (team, [first, , baseFn, yearFrom]) => {
  const t = TEAMS.indexOf(team), base = baseFn(t), games = 300 + base * 17;
  return { id: t * 10 + 1, player_name: `${first} ${nick(team)}`, teams: CODE[team], year_from: yearFrom || '1995-96', games,
    points: base * games, ast: base * 0.5 * games, trb: base * 0.7 * games, stl: base * 0.1 * games, blk: base * 0.05 * games, three_p: base * 41 };
};
const rosterOf = team => [
  ...PEOPLE.map(([first, pos], i) => ({ player_id: i + 1, first_name: first, last_name: nick(team), position: pos, team })),
  { player_id: 20, first_name: 'Twin', last_name: nick(team), position: 'F', team },
  { player_id: 21, first_name: 'Ghost', last_name: nick(team), position: null, team },
];
const allRecords = () => TEAMS.flatMap(team => PEOPLE.map(p => recordOf(team, p)));
const COL = { PPG: ['points', true], APG: ['ast', true], RPG: ['trb', true], SPG: ['stl', true], BPG: ['blk', true], '3PM': ['three_p', false], GP: ['games', false] };
const r1 = v => Math.round(v * 10) / 10;
const fits = (pos, role) => !pos || (pos === 'G' ? role === 'PG' || role === 'SG' : pos === 'F' ? role === 'SF' || role === 'PF' : role === 'C');
const ROLES = ['PG', 'SG', 'SF', 'PF', 'C'];
/* Independent: the values a team allows in a slot for this unit. */
function slotValues(team, role, unit) {
  const [col, perGame] = COL[unit];
  return PEOPLE.filter(p => p[0] !== 'Twin' && fits(p[1], role)).flatMap(p => {
    const rec = recordOf(team, p);
    if ((unit === 'SPG' || unit === 'BPG') && Number(rec.year_from.slice(0, 4)) < 1973) return [];
    return [perGame ? r1(rec[col] / rec.games) : Math.round(rec[col])];
  });
}
function extreme(teams, unit, mode) {
  let best = null;
  const perm = (a, k) => {
    if (k === a.length) {
      const sum = r1(a.reduce((s, role, i) => { const v = slotValues(teams[i], role, unit); return s + (mode === 'max' ? Math.max(...v) : Math.min(...v)); }, 0));
      if (best === null || (mode === 'max' ? sum > best : sum < best)) best = sum;
      return;
    }
    for (let i = k; i < a.length; i++) { [a[k], a[i]] = [a[i], a[k]]; perm(a, k + 1); [a[k], a[i]] = [a[i], a[k]]; }
  };
  perm([...ROLES], 0);
  return best;
}
const fmt = v => (Number.isInteger(v) ? String(v) : v.toFixed(1));
let fails = 0;
const fail = m => { fails += 1; console.error(`  FAIL: ${m}`); };
const seen = { highest: 0, lowest: 0 };

async function pick(page, first, team, expectRefusal, tag) {
  const input = page.getByRole('combobox');
  await input.fill('');
  await input.fill(first);
  await page.getByRole('option').filter({ hasText: `${first} ${nick(team)}` }).first().click({ timeout: 10000 });
  if (!expectRefusal) return;
  const ok = await page.locator(`text=${expectRefusal}`).first().waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false);
  if (!ok) fail(`${tag}: ${first} ${nick(team)} was not refused with ${expectRefusal}`);
  else console.log(`   ${tag}: ${first} refused (${expectRefusal})`);
  return ok;
}

async function playOne(page, tag, shots) {
  await page.getByRole('button', { name: /Let's Go/ }).click({ timeout: 25000 });
  const banner = ((await page.locator('text=/Find the/').first().textContent({ timeout: 10000 })) || '').replace(/\s+/g, ' ').trim();
  const dir = /HIGHEST/.test(banner) ? 'highest' : /LOWEST/.test(banner) ? 'lowest' : null;
  const unit = (banner.match(/\(([^)]+)\)\s*$/) || [])[1];
  if (!dir || !COL[unit]) { fail(`${tag}: could not read the challenge from "${banner}"`); return; }
  seen[dir] += 1;
  const teams = [];
  const MAIN = ['Ace', 'Bolt', 'Cruz', 'Dove', 'Echo'];
  for (let i = 0; i < 5; i++) {
    await page.waitForFunction(r => [...document.querySelectorAll('button')].some(b => b.textContent?.trim() === r && !b.disabled), ROLES[i], { timeout: 20000 });
    await page.getByRole('button', { name: ROLES[i], exact: true }).click();
    const filling = ((await page.locator('text=/Filling:/').first().textContent({ timeout: 10000 })) || '').replace(/\s+/g, ' ');
    const team = TEAMS.find(t => filling.endsWith(` from ${t}`));
    if (!team) { fail(`${tag}: no dealt team in "${filling}"`); return; }
    teams.push(team);
    if (i === 0) {
      await pick(page, 'Ghost', team, "/can.t find a career line/", tag);
      if (shots) await page.screenshot({ path: `${OUT}/${tag}-refusal.png` });
    }
    if (i === 1 && (unit === 'SPG' || unit === 'BPG')) {
      await pick(page, 'Oldie', team, '/1973-74/', tag);
      await page.screenshot({ path: `${OUT}/${tag}-stocks-refusal.png` });
    }
    if (i === 2) await pick(page, 'Twin', team, '/More than one/', tag);
    await pick(page, MAIN[i], team, null, tag);
    await page.waitForTimeout(300);
  }
  await page.getByRole('button', { name: /Submit Lineup/ }).waitFor({ timeout: 20000 });
  if (shots) await page.screenshot({ path: `${OUT}/${tag}-review.png`, fullPage: true });
  await page.getByRole('button', { name: /Submit Lineup/ }).click();
  await page.locator('text=Best five your teams allowed').first().waitFor({ timeout: 20000 }).catch(() => fail(`${tag}: no best five list`));
  await page.waitForTimeout(3000);
  const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  await page.screenshot({ path: `${OUT}/${tag}-result.png`, fullPage: true });
  /* Expected, computed here and nowhere else. */
  const mode = dir === 'highest' ? 'max' : 'min';
  const picks = teams.map((team, i) => {
    const rec = recordOf(team, PEOPLE[i]);
    const [col, perGame] = COL[unit];
    const v = perGame ? r1(rec[col] / rec.games) : Math.round(rec[col]);
    const vals = slotValues(team, ROLES[i], unit);
    const hi = Math.max(...vals), lo = Math.min(...vals);
    const close = hi === lo ? 1 : (dir === 'highest' ? v - lo : hi - v) / (hi - lo);
    return { v, best: dir === 'highest' ? hi : lo, close };
  });
  const yours = r1(picks.reduce((s, p) => s + p.v, 0));
  const best = extreme(teams, unit, mode), worst = extreme(teams, unit, mode === 'max' ? 'min' : 'max');
  const gained = dir === 'highest' ? yours - worst : worst - yours;
  const score = best === worst ? 100 : Math.max(0, Math.min(100, Math.round((gained / Math.abs(best - worst)) * 100)));
  const line = `Your five: ${fmt(yours)} ${unit}. The best five your teams allowed: ${fmt(best)}. The worst: ${fmt(worst)}.`;
  const grid = picks.map(p => (p.close >= 0.9 ? '🟩' : p.close >= 0.6 ? '🟨' : '⬜')).join('');
  console.log(`   ${tag}: ${dir} ${unit}, teams ${teams.map(nick).join('/')}, expected score ${score}, ${line} grid ${grid}`);
  if (!body.includes(line)) fail(`${tag}: stat line missing; page says "${(body.match(/Your five:[^.]*\.[^.]*\.[^.]*\./) || ['none'])[0]}"`);
  if (!new RegExp(`(^|\\D)${score}(\\D|$)`).test(body.slice(0, body.indexOf('Your five:')))) fail(`${tag}: score ${score} not shown above the stat line`);
  if (!body.includes(grid)) fail(`${tag}: emoji grid ${grid} not on the page`);
  for (const [i, p] of picks.entries()) if (!body.includes(`best here ${fmt(p.best)}`)) fail(`${tag}: ${ROLES[i]} best here ${fmt(p.best)} not on the page`);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (over > 1) fail(`${tag}: the page scrolls sideways by ${over}px`);
  await page.getByRole('button', { name: /Play Again/ }).click({ timeout: 10000 });
}

let reached = 0;
const browser = await chromium.launch();
for (const [w, h] of [[390, 844], [1280, 900]]) {
  for (const motion of ['reduce', 'no-preference']) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: motion, isMobile: w < 500, hasTouch: w < 500 });
    await ctx.route(/supabase\.co/, async route => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/rest/v1/nba_players_extended_v2')) {
        const eq = url.searchParams.get('team') || '';
        const team = eq.startsWith('eq.') ? decodeURIComponent(eq.slice(3)) : '';
        reached += 1;
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(TEAMS.includes(team) ? rosterOf(team) : []) });
      }
      if (url.pathname.endsWith('/rest/v1/nba_player_stats')) { reached += 1; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(allRecords()) }); }
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
    const tag0 = `w${w}-${motion === 'reduce' ? 'rm' : 'anim'}`;
    if (motion === 'reduce') {
      await page.getByRole('button', { name: 'How to play' }).first().click({ timeout: 15000 });
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${OUT}/${tag0}-howto.png` });
      const dlg = page.getByRole('dialog').first();
      await dlg.evaluate(el => { const s = el.querySelector('[class*=overflow]') || el; s.scrollTop = s.scrollHeight; }).catch(() => {});
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/${tag0}-howto-end.png` });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
    for (const g of [1, 2]) {
      try { await playOne(page, `${tag0}-g${g}`, g === 1); } catch (e) { fail(`${tag0}-g${g}: ${String(e).split('\n')[0]}`); await page.screenshot({ path: `${OUT}/${tag0}-g${g}-crash.png` }).catch(() => {}); break; }
    }
    if (errors.length) fail(`${tag0}: page errors: ${errors.slice(0, 3).join(' | ')}`);
    await ctx.close();
  }
}
await browser.close();
console.log(`   directions played: highest ${seen.highest}, lowest ${seen.lowest}; ${reached} mocked reads`);
if (!seen.highest || !seen.lowest) console.log('   NOTE: one direction was never dealt this run (the spin is Math.random)');
if (fails) { console.error(`walkrun1555: RED, ${fails} failure(s)`); process.exit(1); }
console.log('walkrun1555: green. Every result matched the walk\'s own brute force.');
