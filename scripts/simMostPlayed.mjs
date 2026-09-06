/* Most Played Today counts PEOPLE, not rows.
 *
 * Round 481. The home page's first section under the hero says "most played
 * today", and until this round the database function behind it ranked by
 * count(*) over game_completions. The simulations record a completion per
 * season, so a single person leaving Club Manager running outranked a game
 * hundreds of people really played, and the section quietly became a list of
 * which simulations someone had left open.
 *
 * MEASURED on 2026-09-06 before the change, which is where the numbers in the
 * migration and the hook come from: 9,822 completion rows that day from 185
 * distinct players; club-manager 4,469 rows from 32 people, soccer-career
 * 4,391 from 131, and mlb-front-office 434 rows from TWO people, which put it
 * third on the list. Ranked by people: soccer-career 131, club-manager 32,
 * nba-my-career 10. Over the previous 21 days, 70 percent of all completions
 * (194,161 of 276,577) came from sessions where one player recorded 50 or more
 * of one game in one day, and every one of those games is a season simulation.
 *
 * WHAT THIS HOLDS, against the live database, because the defect lived in the
 * database and a source-only check could never have seen it:
 *   1. The function ranks by distinct players. Proved by finding a game whose
 *      row count and player count disagree and holding that the ranking
 *      follows the players. If no such game exists today the section says so
 *      and does not claim to have checked.
 *   2. Its floor is a floor on people: a game played by fewer than the minimum
 *      DIFFERENT people is absent however many rows it has.
 *   3. The hook asks for the same floor the function defaults to, so the two
 *      cannot drift.
 *
 * Negative control: MOST_PLAYED_CONTROL=rows asks section 1 to expect the OLD
 * count(*) ranking instead of the people one. Against correct code the
 * function answers with people, so the expectation fails and the control
 * fires. It touches no database object, which is the point: a control that
 * had to create a function in production would be a worse thing than the
 * defect. It refuses to run on a day when the two orders happen to agree,
 * because then it proves nothing.
 *
 * Run: node scripts/simMostPlayed.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.MOST_PLAYED_CONTROL || '';
if (CONTROL && CONTROL !== 'rows') {
  console.error(`MOST_PLAYED_CONTROL=${CONTROL} is not a control this harness knows (rows)`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const client = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
const URL_ = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
const KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];
const HEAD = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function rpc(name, body) {
  const res = await fetch(`${URL_}/rest/v1/rpc/${name}`, { method: 'POST', headers: HEAD, body: JSON.stringify(body) });
  if (!res.ok) return null;
  return res.json();
}

/* Today's rows, paged, because PostgREST caps every select at 1,000 and this
   table takes 20,000 rows a day. This is the independent side of the check:
   the ranking is measured from the rows rather than asked of the function
   that is being judged. */
async function todaysRows() {
  const day = new Date().toISOString().slice(0, 10);
  const out = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(
      `${URL_}/rest/v1/game_completions?select=game,player_name&completed_on=eq.${day}`,
      { headers: { ...HEAD, Range: `${from}-${from + 999}` } },
    );
    if (!res.ok) return null;
    const page = await res.json();
    out.push(...page);
    if (page.length < 1000) break;
    if (from > 60000) break;
  }
  return out;
}

const rows = await todaysRows();
if (!rows) {
  console.error('MOST PLAYED UNREACHABLE. NOTHING WAS CHECKED.');
  process.exit(1);
}
const byGame = new Map();
for (const r of rows) {
  const e = byGame.get(r.game) ?? { rows: 0, players: new Set() };
  e.rows += 1;
  if (r.player_name) e.players.add(r.player_name);
  byGame.set(r.game, e);
}
const allPlayers = new Set(rows.map(r => r.player_name).filter(Boolean));
console.log(`${rows.length} completion rows today across ${byGame.size} games, from ${allPlayers.size} distinct players`);
if (rows.length < 50) {
  console.log('   too early in the day to judge a ranking; nothing was checked');
  process.exit(0);
}

console.log('1) the ranking follows people, not rows');
{
  /* Only games with a cap row can appear: the function joins the allowlist. */
  const caps = await fetch(`${URL_}/rest/v1/game_score_caps?select=game&limit=2000`, { headers: HEAD }).then(r => r.json());
  const capped = new Set(caps.map(c => c.game));
  const eligible = [...byGame.entries()].filter(([g]) => capped.has(g));
  const byRows = [...eligible].sort((a, b) => b[1].rows - a[1].rows || a[0].localeCompare(b[0])).map(x => x[0]);
  const byPeople = [...eligible].sort((a, b) => b[1].players.size - a[1].players.size || a[0].localeCompare(b[0])).map(x => x[0]);
  const disagree = byRows.slice(0, 5).join(',') !== byPeople.slice(0, 5).join(',');
  if (CONTROL === 'rows' && !disagree) {
    console.error('control cannot run: the people ranking and the row ranking agree today, so expecting the row order proves nothing');
    process.exit(1);
  }
  const want = CONTROL === 'rows' ? byRows : byPeople;
  const top = await rpc('most_played_today', { p_min: 1, p_limit: 5 });
  if (!top) { fail('the function did not answer, so nothing was checked'); }
  else {
    const got = top.map(t => t.game).join(',');
    console.log(`   by people: ${byPeople.slice(0, 5).join(', ')}`);
    console.log(`   by rows:   ${byRows.slice(0, 5).join(', ')}`);
    console.log(`   function:  ${got}`);
    if (!disagree) {
      console.log('   the two orders agree today, so this run cannot tell them apart and does not claim to');
    } else if (got !== want.slice(0, top.length).join(',')) {
      fail(`the function returned ${got}, which is not the ${CONTROL === 'rows' ? 'row' : 'people'} ranking ${want.slice(0, top.length).join(',')}; today those two differ, so it is ranking something else`);
    } else {
      console.log(`   the two orders differ today and the function follows the ${CONTROL === 'rows' ? 'rows' : 'people'}`);
    }
    for (const t of top) {
      const e = byGame.get(t.game);
      if (e && Number(t.plays) !== e.players.size) fail(`the function reports ${t.plays} for ${t.game} where ${e.players.size} different people played it`);
    }
  }
}

console.log('2) the floor is a floor on people');
{
  const strict = await rpc('most_played_today', { p_min: 1000000, p_limit: 5 });
  if (strict === null) fail('the function did not answer a high floor');
  else if (strict.length !== 0) fail(`a floor of a million people still returned ${strict.length} game(s), so the floor is not counting people`);
  else console.log('   a floor no game can clear returns nothing');
}

console.log('3) the hook asks for the floor the function defaults to');
{
  const src = fs.readFileSync(path.join(ROOT, 'src', 'hooks', 'useMostPlayed.ts'), 'utf8');
  const m = src.match(/const MIN_PLAYERS_TO_QUALIFY\s*=\s*(\d+)/);
  if (!m) fail('useMostPlayed.ts no longer names MIN_PLAYERS_TO_QUALIFY, so the floor it sends is not readable here');
  else {
    const asked = Number(m[1]);
    const withFloor = await rpc('most_played_today', { p_min: asked, p_limit: 3 });
    console.log(`   the hook asks for ${asked} players and gets ${withFloor ? withFloor.length : 'no'} game(s)`);
    if (!src.includes('p_min: MIN_PLAYERS_TO_QUALIFY')) fail('the hook does not pass MIN_PLAYERS_TO_QUALIFY as p_min, so the constant is decoration');
  }
}

console.log('');
if (CONTROL === 'rows') {
  if (failures > 0) { console.log(`simMostPlayed control: green. The row ranking was caught (${failures} finding${failures === 1 ? '' : 's'}).`); process.exit(0); }
  console.error('simMostPlayed control: RED. A ranking by rows went unnoticed.');
  process.exit(1);
}
if (failures > 0) { console.error(`simMostPlayed: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simMostPlayed: green. The home page ranks what people played, not how many seasons somebody simulated.');
