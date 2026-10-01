/**
 * Round 370: the cached World Leaderboard still tells the truth.
 *
 * WHY THE CACHE EXISTS. Supabase alerted that the project was depleting its
 * Disk IO Budget, which ends with the instance unresponsive. pg_stat_statements
 * named the cause: global_rank, 1,541,353 calls and 1.9 billion buffer blocks,
 * called from useGameNavbarStats on EVERY GAME PAGE LOAD. Every visitor to
 * every page triggered a full ranking of every player on the site. Round 360
 * had made each of those calls about ten times more expensive by joining
 * game_denominators, whose NULL cap fallback runs a percentile subquery per
 * game. The ranking is now precomputed into public.player_ranks and refreshed
 * by cron every five minutes: 242 ms and 70,818 blocks became 12.9 ms and 969.
 *
 * WHY THIS FENCE EXISTS, and it is not about performance. A cache introduces a
 * failure mode the live query never had: it can be WRONG. If the cron job stops
 * or the refresh errors, every rank on the site silently freezes at whatever it
 * was, and nothing anywhere would say so. A player would see a stale position
 * and have no way to know. That is the thing worth guarding, so this compares
 * the cached answer against a freshly computed one rather than checking that
 * the cache merely exists.
 *
 * What it holds, read only against live data through the anonymous key, which
 * is the same path the site uses:
 *   1. The cache is populated at all.
 *   2. For the top players, the cached global_rank agrees with the live
 *      global_leaderboard on BOTH rank and points. A stale cache drifts on
 *      exactly these, because new completions move people.
 *   3. The 'today' shape works, not just 'alltime'. They are separate rows in
 *      the cache and a refresh could populate one and not the other.
 *   4. The live branch still works: a call with a p_games filter bypasses the
 *      cache entirely, and that is what the leaderboard's per sport views use.
 *
 *   5. (Round 839) The board the page shows agrees with a freshly computed one.
 *   6. (Round 839) Every window the page asks for ANSWERS, first try, as the
 *      anonymous visitor it is asked by.
 *
 * ROUND 839, and why sections 2 and 5 take their truth from somewhere new. The
 * unfiltered all time BOARD now reads public.player_ranks too (it was a live
 * scan of every completion on every page load, 2.2 seconds against a 3 second
 * anonymous timeout). That would have turned section 2 into the cache compared
 * with itself, green whatever the cron job did. The fresh computation is now
 * the same function asked for EVERY game by name: a p_games list always takes
 * the live branch, and the list is read from game_denominators, the relation
 * the function joins, so the two answers cover the same games.
 * Section 6 is the outcome that actually broke: on 2026-10-01 the Today board
 * answered 57014 (statement timeout) on every load, the page drew that as an
 * empty board, and this harness was green because its rpc helper retries and
 * the all time call it leaned on still squeaked through.
 *
 * NEGATIVE CONTROLS, one per comparison, each must go red in its own section:
 *   LBCACHE_CONTROL=drift       section 2, the cached rank against live plus one,
 *                               which is what a stale cache looks like once
 *                               somebody overtakes somebody else.
 *   LBCACHE_CONTROL=boarddrift  section 5, the board against fresh plus one.
 *   LBCACHE_CONTROL=noanswer    section 6, asks for a function that is not there,
 *                               which is what any non 200 answer looks like.
 *
 * Run: node scripts/simLeaderboardCache.mjs   (needs the database)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.LBCACHE_CONTROL || '';
if (CONTROL && !['drift', 'boarddrift', 'noanswer'].includes(CONTROL)) {
  console.error(`LBCACHE_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const client = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
const URL_ = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
const KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];
const HEAD = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

/* Retried, for the reason Rounds 362 and 369 both learned: a fence that goes
   red at random teaches people to re-run it rather than read it. */
async function rpc(fn, body) {
  let last = '';
  for (let attempt = 0; attempt <= 2; attempt++) {
    if (attempt) await new Promise(r => setTimeout(r, 500 * attempt));
    try {
      const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: 'POST', headers: HEAD, body: JSON.stringify(body) });
      if (r.ok) return r.json();
      last = `${r.status} ${await r.text()}`;
      if (r.status === 400 || r.status === 401 || r.status === 403) break;
    } catch (e) { last = String(e); }
  }
  console.error(`the database refused ${fn}: ${last}`);
  process.exit(1);
}

/* One request, no retry, and the status handed back rather than acted on:
   section 6 is about whether a visitor's single call is answered. */
async function rpcOnce(fn, body) {
  const t = Date.now();
  try {
    const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: 'POST', headers: HEAD, body: JSON.stringify(body) });
    const text = await r.text();
    let rows = null;
    try { const j = JSON.parse(text); if (Array.isArray(j)) rows = j.length; } catch { /* not JSON, rows stays null */ }
    return { status: r.status, ms: Date.now() - t, rows, text: text.slice(0, 160) };
  } catch (e) {
    return { status: 0, ms: Date.now() - t, rows: null, text: String(e).slice(0, 160) };
  }
}

/* Every game the function can score, read from the relation it joins. Passing
   the whole list is the only way to ask the database for a fresh all time
   board now that the unfiltered call is served from the cache. */
const gamesRes = await fetch(`${URL_}/rest/v1/game_denominators?select=game`, { headers: HEAD });
if (!gamesRes.ok) { console.error(`the database refused game_denominators: ${gamesRes.status}`); process.exit(1); }
const ALL_GAMES = (await gamesRes.json()).map(r => r.game);
if (ALL_GAMES.length < 100) { console.error(`game_denominators lists ${ALL_GAMES.length} games, far too few to stand for the whole site`); process.exit(1); }

console.log('1) the cache is populated');
const board = await rpc('global_leaderboard', { p_period: 'alltime' });
const fresh = await rpc('global_leaderboard', { p_period: 'alltime', p_games: ALL_GAMES });
if (!Array.isArray(board) || board.length === 0) {
  fail('global_leaderboard returned nothing, so nothing below could be checked');
} else if (!Array.isArray(fresh) || fresh.length === 0) {
  fail(`the fresh computation over all ${ALL_GAMES.length} games returned nothing, so nothing below has a truth to compare against`);
} else {
  console.log(`   the board returns ${board.length} players, top is ${board[0].player_name} on ${board[0].total_points}`);
  console.log(`   the fresh computation over ${ALL_GAMES.length} games returns ${fresh.length}, top is ${fresh[0].player_name} on ${fresh[0].total_points}`);
}

console.log('2) the cached rank agrees with a freshly computed one');
{
  const sample = fresh.slice(0, 8);
  let checked = 0, wrong = 0;
  for (const row of sample) {
    const got = await rpc('global_rank', { p_player: row.player_name, p_period: 'alltime', p_games: null });
    const cached = Array.isArray(got) ? got[0] : null;
    if (!cached) { fail(`${row.player_name} is on the live leaderboard at rank ${row.rank} and the cache has no row for them at all`); continue; }
    checked += 1;
    const wantRank = CONTROL === 'drift' ? Number(row.rank) + 1 : Number(row.rank);
    const rankOk = Number(cached.rank) === wantRank;
    const ptsOk = Number(cached.total_points) === Number(row.total_points);
    if (!rankOk || !ptsOk) {
      wrong += 1;
      if (wrong <= 3) fail(`${row.player_name}: live says rank ${wantRank} on ${row.total_points} points, the cache says rank ${cached.rank} on ${cached.total_points}. A stale or broken refresh looks exactly like this.`);
    }
  }
  if (CONTROL === 'drift') console.log('   NEGATIVE CONTROL ON: comparing against the live rank plus one, section 2 must go red');
  console.log(`   ${checked - wrong} of ${checked} sampled players match the live leaderboard on rank and points`);
  if (checked < 5 && CONTROL !== 'drift') fail(`only ${checked} players could be compared, so this section is not really testing anything`);
}

console.log("3) the 'today' shape is populated too");
{
  const today = await rpc('global_leaderboard', { p_period: 'today' });
  if (!Array.isArray(today) || today.length === 0) {
    console.log('   nobody has played yet today, nothing to compare');
  } else {
    const first = today[0];
    const got = await rpc('global_rank', { p_player: first.player_name, p_period: 'today', p_games: null });
    const cached = Array.isArray(got) ? got[0] : null;
    console.log(`   today's leader ${first.player_name} on ${first.total_points}, cache says ${cached ? `rank ${cached.rank} on ${cached.total_points}` : 'NOTHING'}`);
    if (!cached) fail("the 'today' half of the cache is empty while the live board has players, so a refresh populated one period and not the other");
    else if (Number(cached.rank) !== Number(first.rank)) fail(`today's leader is rank ${first.rank} live and ${cached.rank} in the cache`);
  }
}

console.log('4) the live branch still works when a games filter is passed');
{
  /* A p_games call must bypass the cache entirely. If this ever returns the
     cached whole site rank instead, the per sport leaderboards are silently
     wrong. */
  const slugs = ['soccer-career'];
  const filtered = await rpc('global_leaderboard', { p_period: 'alltime', p_games: slugs });
  if (!Array.isArray(filtered) || filtered.length === 0) {
    console.log('   no players for the sampled game, skipped');
  } else {
    const who = filtered[0];
    const got = await rpc('global_rank', { p_player: who.player_name, p_period: 'alltime', p_games: slugs });
    const live = Array.isArray(got) ? got[0] : null;
    console.log(`   filtered to ${slugs[0]}: ${who.player_name} is rank ${who.rank} on the board, global_rank says ${live ? live.rank : 'NOTHING'}`);
    if (!live) fail('a global_rank call with a games filter returned nothing, so the live branch is broken');
    else if (Number(live.rank) !== Number(who.rank)) fail(`the filtered rank disagrees: board ${who.rank}, function ${live.rank}`);
  }
}

console.log('5) the board the page shows agrees with a freshly computed one');
{
  /* The same question as section 2, asked of the board itself: since Round 839
     the unfiltered all time board is the cache, so a refresh that stopped would
     freeze the page's top 100 and nothing else here would say so. */
  const byName = new Map(board.map(r => [r.player_name, r]));
  const sample = fresh.slice(0, 8);
  let checked = 0, wrong = 0;
  for (const row of sample) {
    const shown = byName.get(row.player_name);
    if (!shown) { fail(`${row.player_name} is rank ${row.rank} in a fresh computation and is not on the board the page shows at all`); continue; }
    checked += 1;
    const wantRank = CONTROL === 'boarddrift' ? Number(row.rank) + 1 : Number(row.rank);
    if (Number(shown.rank) !== wantRank || Number(shown.total_points) !== Number(row.total_points)) {
      wrong += 1;
      if (wrong <= 3) fail(`${row.player_name}: fresh says rank ${wantRank} on ${row.total_points} points, the board shows rank ${shown.rank} on ${shown.total_points}. A stopped refresh looks exactly like this.`);
    }
  }
  if (CONTROL === 'boarddrift') console.log('   NEGATIVE CONTROL ON: comparing against the fresh rank plus one, section 5 must go red');
  console.log(`   ${checked - wrong} of ${checked} sampled players match on rank and points`);
  if (checked < 5 && CONTROL !== 'boarddrift') fail(`only ${checked} players could be compared, so this section is not really testing anything`);
}

console.log('6) every window the page asks for answers, first try');
{
  /* The four tabs unfiltered and through one sport filter, each asked ONCE the
     way a visitor's browser asks. Anything but a 200 with a list is the page
     showing "That board did not load" (or, before Round 839, an empty board). */
  const fn = CONTROL === 'noanswer' ? 'global_leaderboard_not_there' : 'global_leaderboard';
  if (CONTROL === 'noanswer') console.log('   NEGATIVE CONTROL ON: asking for a function that does not exist, section 6 must go red');
  const sport = ALL_GAMES.filter(g => g.includes('grid'));
  const asks = [];
  for (const p of ['today', 'week', 'month', 'alltime']) asks.push([p, null, 'all sports']);
  for (const p of ['today', 'week', 'month', 'alltime']) asks.push([p, sport, `${sport.length} games`]);
  for (const [period, games, label] of asks) {
    const res = await rpcOnce(fn, { p_period: period, p_games: games });
    const ok = res.status === 200 && res.rows !== null;
    console.log(`   ${period.padEnd(7)} ${label.padEnd(10)} ${res.status} in ${res.ms} ms${ok ? `, ${res.rows} rows` : ''}`);
    if (!ok) fail(`${period} (${label}) was not answered: ${res.status} ${res.text}`);
  }
}

console.log('');
if (CONTROL) {
  const what = { drift: 'A drifting cache', boarddrift: 'A board that drifted from a fresh computation', noanswer: 'A window that was not answered' }[CONTROL];
  if (failures > 0) { console.log(`simLeaderboardCache control ${CONTROL}: green. ${what} was caught (${failures} finding${failures === 1 ? '' : 's'}).`); process.exit(0); }
  console.error(`simLeaderboardCache control ${CONTROL}: RED. The fault was planted and nothing noticed.`);
  process.exit(1);
}
if (failures > 0) { console.error(`simLeaderboardCache: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simLeaderboardCache: green. The cached ranking matches a freshly computed one.');
