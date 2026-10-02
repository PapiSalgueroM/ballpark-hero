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
 * ROUND 839 REVIEW: THE RECHECK. Sections 2, 3 and 5 compare a cache that is
 * up to five minutes old (cron refresh-player-ranks, every 5 minutes on the
 * UTC clock, 5 s median and 26 s worst over the 288 runs of 2026-09-30 to
 * 2026-10-01) with an answer computed now. A sampled player who scored inside
 * those five minutes disagrees on healthy code. Measured on production over
 * the 7 days to 2026-10-01: the all time top 10 played in 43 of 2,016 five
 * minute windows (2.1 percent), so roughly one run in fifty went red for
 * nothing, and a fence that goes red at random teaches people to rerun it
 * rather than read it. So a disagreement on the first read is not a finding
 * yet: the harness waits for the next refresh to land (the next 5 minute mark
 * on the database's own clock, read from the Date header, plus 40 s) and
 * reads both sides again. Only a disagreement that survives a refresh fails.
 * That keeps the fence able to see what it is for: a stopped or failing
 * refresh cannot clear between the two reads, so it fails both. What it
 * costs is up to 5 m 40 s of waiting, and only on a run that disagreed.
 * What it does not fix: a stopped job is only visible here once a sampled
 * top player (or today's leader) moves, which on 2026-10-01 meant hours, not
 * minutes (the top 10 logged 5 plays in the 24 hours before). Comparing all
 * 100 rows would see it sooner, but the top 100 played in 36 percent of five
 * minute windows, so even with the recheck that comparison would be a coin
 * toss on busy evenings. The age of the cache is not readable anonymously.
 *
 * NEGATIVE CONTROLS, one per comparison, each must go red in its own section:
 *   LBCACHE_CONTROL=drift       section 2, the cached rank against live plus one,
 *                               which is what a stale cache looks like once
 *                               somebody overtakes somebody else.
 *   LBCACHE_CONTROL=boarddrift  section 5, the board against fresh plus one.
 *   LBCACHE_CONTROL=noanswer    section 6, asks for functions that are not
 *                               there, which is what any non 200 answer looks like.
 * Both drift controls go through the recheck and must still fail after it, which
 * is what proves the recheck forgives a passing play and not a frozen cache.
 *   LBCACHE_CONTROL=transient   the other half of that proof, and the one that is
 *                               red on the harness as it was before the review:
 *                               section 5's drift is planted on the FIRST read
 *                               only, and the run must end with no failures and
 *                               the recheck saying it cleared it.
 * A control skips the wait itself (a planted drift does not need a refresh to
 * survive or clear); LBCACHE_RECHECK_WAIT_MS sets the wait by hand for any run.
 *
 * Run: node scripts/simLeaderboardCache.mjs   (needs the database)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.LBCACHE_CONTROL || '';
if (CONTROL && !['drift', 'boarddrift', 'noanswer', 'transient'].includes(CONTROL)) {
  console.error(`LBCACHE_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}
const WAIT_OVERRIDE = process.env.LBCACHE_RECHECK_WAIT_MS;
if (WAIT_OVERRIDE !== undefined && !/^\d+$/.test(WAIT_OVERRIDE)) {
  console.error(`LBCACHE_RECHECK_WAIT_MS=${WAIT_OVERRIDE} is not a number of milliseconds`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const client = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
const URL_ = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
const KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];
const HEAD = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

/* The database's clock, from the last answer's Date header, so the wait for the
   next refresh does not depend on this machine's clock being right. */
let serverClock = { at: 0, local: 0 };
const noteClock = r => {
  const d = Date.parse(r.headers.get('date') || '');
  if (Number.isFinite(d)) serverClock = { at: d, local: Date.now() };
};
const serverNow = () => (serverClock.at ? serverClock.at + (Date.now() - serverClock.local) : Date.now());

/* Retried, for the reason Rounds 362 and 369 both learned: a fence that goes
   red at random teaches people to re-run it rather than read it. */
async function rpc(fn, body) {
  let last = '';
  for (let attempt = 0; attempt <= 2; attempt++) {
    if (attempt) await new Promise(r => setTimeout(r, 500 * attempt));
    try {
      const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: 'POST', headers: HEAD, body: JSON.stringify(body) });
      noteClock(r);
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

/* The sport filters exactly as the page builds them (SPORT_OPTIONS in
   src/pages/Leaderboard.tsx: one per registry category, its games' paths
   without the slash). Bundled the way genSearchKeywords.mjs does it, with
   esbuild found by walk-up so a worktree can run this too, and a per process
   file name so two runs at once cannot read each other's bundle. */
function pageSportFilters() {
  const tag = `dukbLbCache${process.pid}`;
  const entry = path.join(os.tmpdir(), `${tag}Entry.mjs`);
  const bundle = path.join(os.tmpdir(), `${tag}.bundle.mjs`);
  fs.writeFileSync(entry, `export { CATEGORIES } from '${ROOT.replaceAll('\\', '/')}/src/data/gameRegistry.ts';\n`);
  let esbuild = path.join(ROOT, 'node_modules', '.bin', 'esbuild');
  for (let dir = ROOT, i = 0; i < 6; i += 1) {
    const candidate = path.join(dir, 'node_modules', '.bin', 'esbuild');
    if (fs.existsSync(candidate)) { esbuild = candidate; break; }
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  execSync(`"${esbuild}" "${entry}" --bundle --format=esm --platform=node --outfile="${bundle}" --log-level=error`, { stdio: 'inherit' });
  return import(pathToFileURL(bundle).href).then(({ CATEGORIES }) => {
    for (const f of [entry, bundle]) { try { fs.unlinkSync(f); } catch { /* already gone */ } }
    return CATEGORIES.filter(c => c.games.length > 0).map(c => ({ title: c.title, slugs: c.games.map(g => g.path.replace(/^\//, '')) }));
  });
}

/* Every game the function can score, read from the relation it joins. Passing
   the whole list is the only way to ask the database for a fresh all time
   board now that the unfiltered call is served from the cache. */
const gamesRes = await fetch(`${URL_}/rest/v1/game_denominators?select=game`, { headers: HEAD });
if (!gamesRes.ok) { console.error(`the database refused game_denominators: ${gamesRes.status}`); process.exit(1); }
noteClock(gamesRes);
const ALL_GAMES = (await gamesRes.json()).map(r => r.game);
if (ALL_GAMES.length < 100) { console.error(`game_denominators lists ${ALL_GAMES.length} games, far too few to stand for the whole site`); process.exit(1); }

const readBoards = async () => ({
  board: await rpc('global_leaderboard', { p_period: 'alltime' }),
  fresh: await rpc('global_leaderboard', { p_period: 'alltime', p_games: ALL_GAMES }),
});

console.log('1) the cache is populated');
let { board, fresh } = await readBoards();
if (!Array.isArray(board) || board.length === 0) {
  fail('global_leaderboard returned nothing, so nothing below could be checked');
} else if (!Array.isArray(fresh) || fresh.length === 0) {
  fail(`the fresh computation over all ${ALL_GAMES.length} games returned nothing, so nothing below has a truth to compare against`);
} else {
  console.log(`   the board returns ${board.length} players, top is ${board[0].player_name} on ${board[0].total_points}`);
  console.log(`   the fresh computation over ${ALL_GAMES.length} games returns ${fresh.length}, top is ${fresh[0].player_name} on ${fresh[0].total_points}`);
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

/* Sections 2, 3 and 5: the cache against a fresh computation. Returns what
   disagreed rather than failing, so a disagreement can be read again after
   the next refresh (see THE RECHECK in the header). */
async function cacheAgainstFresh(boardNow, freshNow, pass) {
  const found = [];
  const say = m => console.log(pass === 1 ? m : m.replace(/^ {3}/, '   (after the refresh) '));

  say('2) the cached rank agrees with a freshly computed one');
  {
    const sample = Array.isArray(freshNow) ? freshNow.slice(0, 8) : [];
    let checked = 0, wrong = 0;
    for (const row of sample) {
      const got = await rpc('global_rank', { p_player: row.player_name, p_period: 'alltime', p_games: null });
      const cached = Array.isArray(got) ? got[0] : null;
      if (!cached) { found.push(`${row.player_name} is on the live leaderboard at rank ${row.rank} and the cache has no row for them at all`); continue; }
      checked += 1;
      const wantRank = CONTROL === 'drift' ? Number(row.rank) + 1 : Number(row.rank);
      const rankOk = Number(cached.rank) === wantRank;
      const ptsOk = Number(cached.total_points) === Number(row.total_points);
      if (!rankOk || !ptsOk) {
        wrong += 1;
        if (wrong <= 3) found.push(`${row.player_name}: live says rank ${wantRank} on ${row.total_points} points, the cache says rank ${cached.rank} on ${cached.total_points}. A stale or broken refresh looks exactly like this.`);
      }
    }
    if (CONTROL === 'drift') say('   NEGATIVE CONTROL ON: comparing against the live rank plus one, section 2 must go red');
    say(`   ${checked - wrong} of ${checked} sampled players match the live leaderboard on rank and points`);
    if (checked < 5 && CONTROL !== 'drift') found.push(`only ${checked} players could be compared, so section 2 is not really testing anything`);
  }

  say("3) the 'today' shape is populated too");
  {
    const today = await rpc('global_leaderboard', { p_period: 'today' });
    if (!Array.isArray(today) || today.length === 0) {
      say('   nobody has played yet today, nothing to compare');
    } else {
      const first = today[0];
      const got = await rpc('global_rank', { p_player: first.player_name, p_period: 'today', p_games: null });
      const cached = Array.isArray(got) ? got[0] : null;
      say(`   today's leader ${first.player_name} on ${first.total_points}, cache says ${cached ? `rank ${cached.rank} on ${cached.total_points}` : 'NOTHING'}`);
      if (!cached) found.push("the 'today' half of the cache is empty while the live board has players, so a refresh populated one period and not the other");
      else if (Number(cached.rank) !== Number(first.rank)) found.push(`today's leader is rank ${first.rank} live and ${cached.rank} in the cache`);
    }
  }

  say('5) the board the page shows agrees with a freshly computed one');
  {
    /* The same question as section 2, asked of the board itself: since Round 839
       the unfiltered all time board is the cache, so a refresh that stopped would
       freeze the page's top 100 and nothing else here would say so. */
    const byName = new Map((Array.isArray(boardNow) ? boardNow : []).map(r => [r.player_name, r]));
    const sample = Array.isArray(freshNow) ? freshNow.slice(0, 8) : [];
    let checked = 0, wrong = 0;
    for (const row of sample) {
      const shown = byName.get(row.player_name);
      if (!shown) { found.push(`${row.player_name} is rank ${row.rank} in a fresh computation and is not on the board the page shows at all`); continue; }
      checked += 1;
      const planted = CONTROL === 'boarddrift' || (CONTROL === 'transient' && pass === 1);
      const wantRank = planted ? Number(row.rank) + 1 : Number(row.rank);
      if (Number(shown.rank) !== wantRank || Number(shown.total_points) !== Number(row.total_points)) {
        wrong += 1;
        if (wrong <= 3) found.push(`${row.player_name}: fresh says rank ${wantRank} on ${row.total_points} points, the board shows rank ${shown.rank} on ${shown.total_points}. A stopped refresh looks exactly like this.`);
      }
    }
    if (CONTROL === 'boarddrift') say('   NEGATIVE CONTROL ON: comparing against the fresh rank plus one, section 5 must go red');
    if (CONTROL === 'transient' && pass === 1) say('   CONTROL ON: the fresh rank plus one on this first read only, the recheck must clear it');
    say(`   ${checked - wrong} of ${checked} sampled players match on rank and points`);
    if (checked < 5 && CONTROL !== 'boarddrift') found.push(`only ${checked} players could be compared, so section 5 is not really testing anything`);
  }
  return found;
}

let clearedByRecheck = false;
{
  let found = await cacheAgainstFresh(board, fresh, 1);
  if (found.length > 0) {
    for (const m of found) console.log(`   first read disagreed: ${m}`);
    const boundary = Math.ceil(serverNow() / 300_000) * 300_000;
    const natural = Math.max(0, boundary + 40_000 - serverNow());
    const wait = WAIT_OVERRIDE !== undefined ? Number(WAIT_OVERRIDE) : (CONTROL ? 0 : natural);
    console.log(`   the cache refreshes every five minutes, so a play inside that window disagrees on healthy code. Reading again after the next refresh lands: waiting ${Math.round(wait / 1000)} s${CONTROL && WAIT_OVERRIDE === undefined ? ' (a control skips the wait: its drift is planted, not a play)' : ''}`);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    ({ board, fresh } = await readBoards());
    found = await cacheAgainstFresh(board, fresh, 2);
    if (found.length === 0) {
      clearedByRecheck = true;
      console.log('   every disagreement cleared once the cache refreshed: they were plays inside the five minute window, not a stale cache');
    }
  }
  for (const m of found) fail(m);
}

console.log('6) every window the page asks for answers, first try');
{
  /* The four tabs unfiltered and through the largest sport filter the page
     offers, each asked ONCE the way a visitor's browser asks, for both calls a
     window waits on: the board and the rank card (the page asks them together,
     so a window draws when the slower one answers). Anything but a 200 with a
     list is the page showing "That board did not load" or "Your world rank did
     not load". Before the review this used every slug containing "grid", which
     is no filter the page sends; the largest real one (Soccer, 36 games on
     2026-10-01) is also the slowest: its all time board measured 0.74 to 1.25 s
     and its all time rank 1.14 to 1.36 s, against the 3 second timeout. */
  const sports = await pageSportFilters();
  if (sports.length < 5) fail(`the registry gave ${sports.length} sport filters, far too few to be the page's list`);
  const widest = [...sports].sort((a, b) => b.slugs.length - a.slugs.length)[0];
  const asks = [];
  for (const p of ['today', 'week', 'month', 'alltime']) asks.push([p, null, 'all sports']);
  if (widest) for (const p of ['today', 'week', 'month', 'alltime']) asks.push([p, widest.slugs, `${widest.title} (${widest.slugs.length})`]);
  const fns = CONTROL === 'noanswer'
    ? [['board', 'global_leaderboard_not_there'], ['rank', 'global_rank_not_there']]
    : [['board', 'global_leaderboard'], ['rank', 'global_rank']];
  if (CONTROL === 'noanswer') console.log('   NEGATIVE CONTROL ON: asking for functions that do not exist, section 6 must go red');
  for (const [period, games, label] of asks) {
    for (const [kind, fn] of fns) {
      const body = kind === 'rank' ? { p_player: 'Guest', p_period: period, p_games: games } : { p_period: period, p_games: games };
      const res = await rpcOnce(fn, body);
      const ok = res.status === 200 && res.rows !== null;
      console.log(`   ${kind.padEnd(5)} ${period.padEnd(7)} ${label.padEnd(14)} ${res.status} in ${res.ms} ms${ok ? `, ${res.rows} rows` : ''}`);
      if (!ok) fail(`${kind} ${period} (${label}) was not answered: ${res.status} ${res.text}`);
    }
  }
}

console.log('');
if (CONTROL === 'transient') {
  /* The opposite proof: before the review a first read that disagreed was a
     failure on the spot, so this control was red on the old harness. */
  if (clearedByRecheck && failures === 0) { console.log('simLeaderboardCache control transient: green. A disagreement the next read did not repeat was forgiven, and only that.'); process.exit(0); }
  console.error(`simLeaderboardCache control transient: RED. ${clearedByRecheck ? `${failures} other failure${failures === 1 ? '' : 's'} in the run` : 'the planted first read disagreement was never cleared by the recheck'}.`);
  process.exit(1);
}
if (CONTROL) {
  const what = { drift: 'A drifting cache', boarddrift: 'A board that drifted from a fresh computation', noanswer: 'A window that was not answered' }[CONTROL];
  if (failures > 0) { console.log(`simLeaderboardCache control ${CONTROL}: green. ${what} was caught (${failures} finding${failures === 1 ? '' : 's'}).`); process.exit(0); }
  console.error(`simLeaderboardCache control ${CONTROL}: RED. The fault was planted and nothing noticed.`);
  process.exit(1);
}
if (failures > 0) { console.error(`simLeaderboardCache: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simLeaderboardCache: green. The cached ranking matches a freshly computed one.');
