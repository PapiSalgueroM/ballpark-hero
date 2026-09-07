/* A Guess The Football Club clue does not contradict the row it came from.
 *
 * Round 492. The game shows `league_hint` verbatim as its second clue, and for
 * 36 of the 364 puzzles that clue was factually wrong: the club plays in a
 * SECOND division and the clue said "Compete in the top division in X".
 * Championship 24, 2. Bundesliga 7, Serie B 4, J2 League 1. A player narrowing
 * down on that clue was sent the wrong way by the game, and the row already
 * carried the right answer in its own `league` column.
 *
 * Four more showed a SQL escape to the player: "Compete in Germany''s second
 * division" is stored with TWO apostrophes, 37 characters where the correct
 * text is 36. A doubled apostrophe is how a literal is escaped inside SQL, and
 * it was written into the data instead of consumed by the parser.
 *
 * WHAT THIS HOLDS, against the live table:
 *   1. No second division league is described as a top division.
 *   2. No hint carries a doubled apostrophe, anywhere in the table, whatever
 *      the league. That is the general form: an escape that reached the data.
 *   3. Each second tier league has ONE phrasing, so the three variants that
 *      existed before do not creep back.
 *   4. Every puzzle still has both a league and a hint.
 *
 * THE TIER LIST IS EXPLICIT AND MUST STAY THAT WAY. It cannot be inferred from
 * the name: "Serie B" is a second division and "Serie A" is not, but "First
 * League" is a top flight in Bulgaria while "Primera B" is not in Chile. A rule
 * that guesses from the name is how this class of error is created rather than
 * caught.
 *
 * NEGATIVE CONTROLS, both fire on correct code, both by expecting the OLD
 * broken state rather than by writing anything to production:
 *   CLUB_HINTS_CONTROL=topdivision expects a second tier league to still be
 *     called a top division, so section 1 goes red.
 *   CLUB_HINTS_CONTROL=escapes expects a doubled apostrophe to still exist, so
 *     section 2 goes red.
 *
 * Run: node scripts/simGuessSoccerClubHints.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.CLUB_HINTS_CONTROL || '';
if (CONTROL && !['topdivision', 'escapes'].includes(CONTROL)) {
  console.error(`CLUB_HINTS_CONTROL=${CONTROL} is not a control this harness knows (topdivision, escapes)`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const client = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
const URL_ = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
const KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];
const HEAD = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function pageAll(qs, attempt = 0) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    let page = null;
    try {
      const res = await fetch(`${URL_}/rest/v1/${qs}`, { headers: { ...HEAD, Range: `${from}-${from + 999}` } });
      if (res.ok) page = await res.json();
    } catch { /* retried below */ }
    if (page === null) {
      if (attempt < 2) { await new Promise(r => setTimeout(r, 800)); return pageAll(qs, attempt + 1); }
      return null;
    }
    out.push(...page);
    if (page.length < 1000) break;
    if (from > 20000) break;
  }
  return out;
}

/* Second tiers, named one by one. See the header for why this is not inferred. */
const SECOND_TIER = new Set(['championship', '2. bundesliga', 'serie b', 'j2 league', 'ligue 2', 'segunda división']);

const rows = await pageAll('soccer_club_puzzles?select=puzzle_id,league,league_hint&order=id.asc');
if (!rows) { console.error('could not read soccer_club_puzzles'); process.exit(1); }
console.log(`   ${rows.length} puzzles read`);

console.log('1) no second division is described as a top division');
{
  const offenders = rows.filter(r =>
    SECOND_TIER.has(String(r.league || '').toLowerCase()) && /top division/i.test(String(r.league_hint || '')));
  const expectBroken = CONTROL === 'topdivision';
  if (!expectBroken) {
    for (const o of offenders.slice(0, 6)) {
      fail(`${o.league} is a second division and its clue says "${o.league_hint}"`);
    }
    if (offenders.length > 6) fail(`and ${offenders.length - 6} more`);
  } else if (offenders.length === 0) {
    fail('expected a second division still described as a top division, and there is none');
  }
  const inTier = rows.filter(r => SECOND_TIER.has(String(r.league || '').toLowerCase())).length;
  console.log(`   ${inTier} puzzles in a second tier league, ${offenders.length} of them called a top division`);
}

console.log('2) no clue carries an escape that leaked out of the SQL');
{
  const doubled = rows.filter(r => String(r.league_hint || '').includes("''"));
  const expectBroken = CONTROL === 'escapes';
  if (!expectBroken) {
    for (const d of doubled.slice(0, 5)) fail(`a clue shows a doubled apostrophe to the player: "${d.league_hint}"`);
  } else if (doubled.length === 0) {
    fail('expected a doubled apostrophe to still be stored, and there is none');
  }
  console.log(`   ${doubled.length} clues containing a doubled apostrophe`);
}

console.log('3) each second tier league has one phrasing');
{
  const byLeague = new Map();
  for (const r of rows) {
    const l = String(r.league || '').toLowerCase();
    if (!SECOND_TIER.has(l)) continue;
    if (!byLeague.has(l)) byLeague.set(l, new Set());
    byLeague.get(l).add(String(r.league_hint || ''));
  }
  let drifted = 0;
  for (const [l, set] of byLeague) {
    if (set.size > 1) { fail(`${l} has ${set.size} different clues: ${[...set].join('  /  ')}`); drifted++; }
  }
  console.log(`   ${byLeague.size} second tier leagues, ${drifted} with more than one phrasing`);
}

console.log('4) every puzzle still has a league and a clue');
{
  const missing = rows.filter(r => !r.league || !r.league_hint);
  for (const m of missing.slice(0, 5)) fail(`puzzle ${m.puzzle_id} is missing its league or its clue`);
  console.log(`   ${rows.length - missing.length}/${rows.length} complete`);
}

/* process.exitCode, not process.exit(). Calling process.exit() here raced an
   open keep-alive socket left by fetch and tripped a libuv assertion on Windows
   ("!(handle->flags & UV_HANDLE_CLOSING)"), which aborted the process and made
   a run whose every check had PASSED report a non-zero code. A harness that
   goes red for the way it exits is worse than no harness, because the runner
   judges by the exit code and not by the output. Setting the code and letting
   node close its own handles avoids it entirely. */
if (CONTROL) {
  console.log(`\nNEGATIVE CONTROL ${CONTROL} was on; ${failures} finding(s). A control run is expected to be red.`);
  process.exitCode = failures > 0 ? 0 : 1;
} else {
  console.log(failures === 0
    ? '\nsimGuessSoccerClubHints: green. No clue contradicts the row it came from.'
    : `\nsimGuessSoccerClubHints: ${failures} finding(s).`);
  process.exitCode = failures === 0 ? 0 : 1;
}
