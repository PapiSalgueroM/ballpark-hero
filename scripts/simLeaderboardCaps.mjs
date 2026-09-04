/**
 * Round 360: the World Leaderboard only counts games it has been told about,
 * and the list of those games cannot go stale without this failing.
 *
 * WHY THIS EXISTS. global_leaderboard() used to compute each game's
 * denominator from public.game_completions, which accepts anonymous INSERT
 * with WITH CHECK (true). Every input was client controlled, so posting one
 * row for a game key that does not exist made your score that key's maximum
 * and awarded the full 100 points, repeatably, on a board linked from every
 * page since Round 270. The fix inner joins the ranking to
 * public.game_score_caps, so a key absent from that table earns nothing.
 *
 * WHY THE FIX NEEDED A FENCE BEFORE IT COULD BE APPLIED. That inner join turns
 * a missing row into silent zero scoring, which is a quieter bug than the one
 * it replaces. The fix was written on 2026-08-26 and left unapplied; by
 * 2026-08-30 four shipped games (clue-auction, perfect-season-nhl,
 * stat-detective, who-am-i) could send a completion and were not on its list,
 * so applying it unchanged would have made all four earn zero forever with
 * nothing to say so. The draft's own comments describe its FIRST draft making
 * the identical mistake, which is the argument for a check rather than a
 * lesson: the list has to be derived and then verified, not remembered.
 *
 * THE COMPLEMENT TO simScoringCoverage. That harness proves every registry
 * game RECORDS a completion. This one proves everything that records is
 * ALLOWED TO SCORE. Registry, then records, then scores.
 *
 * What this holds, read only against the live database:
 *   1. Every game key the source can send has a row in game_score_caps.
 *   2. A key that is not in the table has no denominator, so the cheap attack
 *      earns nothing.
 *   3. Every denominator is at least 1, so no game divides by zero or hands
 *      out a free 100 points.
 *   4. Every key that already has recorded scores is covered, so applying the
 *      allowlist cannot silently delete points somebody really earned.
 *   5. game_score_caps refuses an anonymous write. The table is the authority
 *      the ranking trusts, so a public write policy on it would hand the
 *      attacker the allowlist itself.
 *
 * NEGATIVE CONTROL: CAPS_CONTROL=stalelist adds a fabricated game key to the
 * source derived list (refusing to run if that key somehow already exists) and
 * section 1 must go red. That is exactly the shape of the real failure: a game
 * ships, nobody adds it to the table, and it scores nothing.
 *
 * Run: node scripts/simLeaderboardCaps.mjs   (needs the database)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.CAPS_CONTROL || '';
if (CONTROL && CONTROL !== 'stalelist') {
  console.error(`CAPS_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/* The env vars Lovable injects point at a deleted project, so the URL and key
   are read from the file that hardcodes them on purpose. Same approach as
   simValueFreshness. */
const client = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
const URL_ = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
const KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];
const HEAD = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function rest(pathAndQuery) {
  /* ROUND 362: retry, for the same reason Round 359 put a retry in
     fetchAllRows. Section 4 keyset paginates and makes about 125 sequential
     requests, so it meets a transient far more often than any single call
     would, and the first draft exited on the first failure. That made the fence
     flaky, and a fence that goes red at random is worse than no fence: people
     learn to re-run it rather than read it. Two more attempts with a short
     backoff, then give up loudly, because a database that is genuinely down
     still has to surface. */
  let last = '';
  for (let attempt = 0; attempt <= 2; attempt++) {
    if (attempt) await new Promise(r => setTimeout(r, 400 * attempt));
    try {
      const r = await fetch(`${URL_}/rest/v1/${pathAndQuery}`, { headers: HEAD });
      if (r.ok) return r.json();
      last = `${r.status} ${await r.text()}`;
      /* A refusal is an answer, not a transient: do not retry it. */
      if (r.status === 401 || r.status === 403 || r.status === 400) break;
    } catch (e) {
      last = String(e);
    }
  }
  console.error(`the database refused ${pathAndQuery}: ${last}`);
  process.exit(1);
}

/* The keys the CLIENT can send, read from source rather than from a list kept
   here, so a game added tomorrow is covered by this check the day it ships. */
/* ROUND 361 WIDENED THIS, AFTER IT MISSED A GAME AND THE MISS COST REAL POINTS.
   The first version matched useGameCompletion('literal' and
   recordCompletion('/literal' only. Five pages pass a `const SLUG` instead of an
   inline literal, three perfect lineup variants pass `config.gameId`, two calls
   are split across lines, and WorldCupPredictor uses double quotes. Every one of
   those was invisible. It did not matter while those games had recorded scores,
   because the caps table's other half is derived from the data, but nba-stat-line
   shipped in Round 352 with no scores yet, so it fell through BOTH halves: not a
   literal in source, and no rows in the table. When someone finally played it,
   their points silently counted for nothing. Section 4 is what caught it, by
   reading the completions table rather than the source, which is exactly why a
   check should never draw both its sides from the same place. */
const LITERAL = /useGameCompletion\(\s*['"]([a-z0-9-]+)['"]|recordCompletion\(\s*['"]\/([a-z0-9-]+)['"]/g;
const VIA_IDENT = /useGameCompletion\(\s*([A-Za-z_$][\w$]*)\s*[,)]/g;
const CONSTANT = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*(?::\s*[^=]+)?=\s*['"]([a-z0-9-]+)['"]/g;
const GAME_ID = /gameId:\s*['"]([a-z0-9-]+)['"]/g;
/* ROUND 429 WIDENED THIS AGAIN, after the same gap cost points a THIRD time.
   ResultScreen records on mount for any page that passes recordCompletionOnMount,
   under the key it derives from share.gamePath, so those pages call neither
   useGameCompletion nor recordCompletion and every pattern above walks past
   them. higher-lower-transfers (Round 421 addendum), then list-quiz and
   player-bingo (this round) were all found by section 4 or by hand, never by
   this section. A page that opts into the mount record is now read for its
   gamePath. */
const ON_MOUNT = /recordCompletionOnMount/;
const GAME_PATH = /gamePath:\s*['"]\/([a-z0-9-]+)['"]/g;

function sourceKeys() {
  const found = new Set();
  const walk = dir => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name)) {
        const src = fs.readFileSync(p, 'utf8');
        for (const m of src.matchAll(LITERAL)) found.add(m[1] || m[2]);
        for (const m of src.matchAll(GAME_ID)) found.add(m[1]);
        if (ON_MOUNT.test(src)) for (const m of src.matchAll(GAME_PATH)) found.add(m[1]);
        /* Resolve an identifier argument against the string constants declared
           in the same file. Deliberately file local: following an import would
           mean building a module graph, and every case in this repo is local. */
        const consts = new Map();
        for (const m of src.matchAll(CONSTANT)) consts.set(m[1], m[2]);
        for (const m of src.matchAll(VIA_IDENT)) {
          const v = consts.get(m[1]);
          if (v) found.add(v);
        }
      }
    }
  };
  walk(path.join(ROOT, 'src'));
  return found;
}

const keys = sourceKeys();
if (keys.size < 100) {
  console.error(`only ${keys.size} completion keys found in src, which means this harness stopped reading the source properly`);
  process.exit(1);
}

const FAKE = 'control-game-that-never-shipped';
if (CONTROL === 'stalelist') {
  if (keys.has(FAKE)) {
    console.error(`control cannot run: ${FAKE} is somehow a real key`);
    process.exit(1);
  }
  keys.add(FAKE);
  console.log(`   NEGATIVE CONTROL ON: ${FAKE} added to the source list, section 1 must go red`);
}

const caps = await rest('game_score_caps?select=game,max_score&limit=2000');
const capped = new Set(caps.map(c => c.game));
const denoms = await rest('game_denominators?select=game,max_score&limit=2000');

console.log('1) every key the source can send is allowlisted');
{
  const missing = [...keys].filter(k => !capped.has(k)).sort();
  console.log(`   ${keys.size} keys in source, ${capped.size} rows in game_score_caps, ${missing.length} uncovered`);
  for (const m of missing.slice(0, 10)) {
    fail(`"${m}" can record a completion but has no cap row, so every point earned in it is silently discarded`);
  }
  if (missing.length > 10) fail(`and ${missing.length - 10} more`);
}

console.log('2) a key that is not allowlisted earns nothing');
{
  const invented = denoms.filter(d => d.game === 'totally-made-up-game' || d.game === 'qa-test');
  console.log(`   denominators published: ${denoms.length}, for invented or test keys: ${invented.length}`);
  for (const i of invented) fail(`"${i.game}" has a denominator, so it can be scored against`);
}

console.log('3) every denominator is at least 1');
{
  const bad = denoms.filter(d => !(Number(d.max_score) >= 1));
  console.log(`   ${denoms.length - bad.length} of ${denoms.length} denominators are sane`);
  for (const b of bad.slice(0, 5)) fail(`"${b.game}" has denominator ${b.max_score}, which either divides by zero or hands out free points`);
}

console.log('4) nothing that already has scores was left out');
{
  /* Read the games that really carry scores straight from the completions
     table, so this cannot be satisfied by the same list it is checking.
     PostgREST silently truncates any select to 1,000 rows, which is the whole
     reason src/lib/fetchAllRows.ts exists, and the first draft of this section
     walked into it: it read 1,000 of 174,183 rows, saw 40 of the 122 games that
     really carry scores, and reported green. Keyset paginate on the game column
     instead, one request per distinct game, so the walk is exact and costs
     about as many small requests as there are games. */
  const played = new Set();
  let last = '';
  for (let guard = 0; guard < 600; guard++) {
    const rows = await rest(`game_completions?select=game&score=gt.0&game=gt.${encodeURIComponent(last)}&order=game.asc&limit=1`);
    if (!rows.length) break;
    played.add(rows[0].game);
    last = rows[0].game;
  }
  played.delete('qa-test');
  /* A truncated or refused walk must not read as "nothing orphaned". */
  if (played.size < 100) fail(`only ${played.size} scoring games were enumerated, which is too few to be the real set, so this section did not actually check anything`);
  const orphaned = [...played].filter(g => !capped.has(g)).sort();
  console.log(`   ${played.size} keys carry real scores, ${orphaned.length} of them uncovered`);
  for (const o of orphaned.slice(0, 10)) {
    fail(`"${o}" has recorded scores but no cap row, so points players really earned stopped counting`);
  }
}

console.log('5) the allowlist itself refuses an anonymous write');
{
  const r = await fetch(`${URL_}/rest/v1/game_score_caps`, {
    method: 'POST',
    headers: { ...HEAD, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ game: 'anon-write-probe', max_score: 1 }),
  });
  console.log(`   anonymous insert into game_score_caps answered ${r.status}`);
  if (r.ok) {
    fail('the anon key can write to game_score_caps, so an attacker can allowlist their own game key. A row named anon-write-probe now needs deleting by hand.');
  }
}

console.log('');
if (CONTROL === 'stalelist') {
  if (failures > 0) { console.log(`simLeaderboardCaps control: green. A shipped game missing from the allowlist was caught (${failures} finding${failures === 1 ? '' : 's'}).`); process.exit(0); }
  console.error('simLeaderboardCaps control: RED. A game that scores nothing went unnoticed.');
  process.exit(1);
}
if (failures > 0) { console.error(`simLeaderboardCaps: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simLeaderboardCaps: green. Every shipped game can score, nothing else can, and the allowlist is not writable.');
