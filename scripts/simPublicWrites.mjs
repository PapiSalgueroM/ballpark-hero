/**
 * Round 361: the public write surface stays bounded.
 *
 * WHY THIS EXISTS. This site is deliberately guest first: anyone can play
 * without an account, so a number of tables accept anonymous INSERT. That
 * openness is not a defect and this harness does not object to it. What matters
 * is the subset the site READS BACK and shows to other visitors as a fact: the
 * "N% of players picked this" rarity lines, the Community Vote donut, the poll
 * percentages on the home page, the chain leaderboards. A forged row in one of
 * those changes a number a stranger believes.
 *
 * Round 361 bounded exactly those tables. This harness exists because three of
 * the four losses that audit found were bounds THE REPO BELIEVES ARE IN FORCE
 * AND THE LIVE DATABASE DOES NOT HAVE: a committed migration declares a bounded
 * insert policy, and live carries WITH CHECK (true) instead. A constraint
 * restored once can be dropped again, and nothing would say so.
 *
 * It probes BEHAVIOUR with the anonymous key rather than reading the catalog,
 * because behaviour is what an attacker meets and because the anon key cannot
 * read pg_constraint anyway.
 *
 * What it holds:
 *   1. Every table bounded in Round 361 rejects an out of range row with a
 *      CHECK VIOLATION SPECIFICALLY (Postgres 23514). The specificity is the
 *      whole point: 42501 would mean RLS refused it and a plain 400 could mean
 *      a malformed request, and neither of those proves a constraint exists.
 *   2. cbb_daily and nascar_daily refuse an anonymous insert outright. These
 *      hold the ANSWER to the daily puzzle, not a score, so the fix there was
 *      to remove the write, not to bound it.
 *   3. The probe can tell the two apart: a table with no insert policy at all
 *      answers 42501, not 23514. Without this, section 1 could be passing on
 *      the wrong rejection and look identical.
 *
 * NEGATIVE CONTROL: PUBWRITES_CONTROL=unbounded adds cbb_scores to section 1.
 * That table is deliberately left open (nothing in the site reads it, so a
 * forged row reaches no screen) and therefore carries no constraint, so the
 * probe is ACCEPTED and section 1 must go red. That proves the probe detects
 * the absence of a bound rather than passing because it never really fired.
 * The control writes one row and prints the exact statement to remove it.
 *
 * TWO HONEST LIMITS.
 *   - Every probe here is designed to be REJECTED, so a green run writes
 *     nothing. Only the control writes, and only to a table nothing reads.
 *   - This cannot compare the repo's migrations against live policy, because
 *     the anon key cannot read the catalogs. That comparison needs the Supabase
 *     MCP and stays a manual step, recorded in
 *     docs/security/WRITE-SURFACE-EVIDENCE.md.
 *
 * Run: node scripts/simPublicWrites.mjs   (needs the network)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.PUBWRITES_CONTROL || '';
if (CONTROL && CONTROL !== 'unbounded') {
  console.error(`PUBWRITES_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const client = fs.readFileSync(path.join(ROOT, 'src', 'integrations', 'supabase', 'client.ts'), 'utf8');
const URL_ = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1];
const KEY = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)[1];

async function post(table, row) {
  const r = await fetch(`${URL_}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  });
  let code = '';
  if (!r.ok) {
    try { code = (JSON.parse(await r.text()) || {}).code || ''; } catch { code = ''; }
  }
  return { status: r.status, ok: r.ok, code };
}

/* Every row below breaks exactly one bound and is otherwise valid, so a 23514
   can only mean the bound under test. The chain probes send a real mode for
   that reason: a null mode would also trip the constraint and the pass would
   be telling us about the wrong half. */
const BOUNDED = [
  { table: 'ufc_chain_scores', why: 'score far above chain_length * 300',
    row: { nickname: 'sim-probe', chain_length: 5, score: 999999, mode: 'daily' } },
  { table: 'tennis_chain_scores', why: 'score far above chain_length * 200',
    row: { nickname: 'sim-probe', chain_length: 5, score: 999999, mode: 'daily' } },
  { table: 'nascar_chain_scores', why: 'score far above chain_length * 200',
    row: { nickname: 'sim-probe', chain_length: 5, score: 999999, mode: 'daily' } },
  { table: 'soccer_grid_selections', why: 'cell_index outside the nine cells of a 3x3 board',
    row: { puzzle_id: 'sim-probe', cell_index: 99, player_name: 'Sim Probe' } },
  { table: 'college_grid_selections', why: 'cell_index outside the nine cells of a 3x3 board',
    row: { puzzle_id: 'sim-probe', cell_index: 99, player_name: 'Sim Probe' } },
  { table: 'football_grid_selections', why: 'cell_index outside the nine cells of a 3x3 board',
    row: { puzzle_id: 'sim-probe', cell_index: 99, player_name: 'Sim Probe' } },
  { table: 'hof_votes', why: 'player_id that is not one of the five sport prefixes',
    row: { player_id: 'sim-probe-not-a-player', vote: 'hof' } },
  { table: 'poll_votes', why: 'choice outside a, b, c, d',
    row: { poll_key: 'sim-probe', choice: 'z' } },
];

if (CONTROL === 'unbounded') {
  BOUNDED.push({
    table: 'cbb_scores', why: 'CONTROL: this table is deliberately unbounded, so the probe should be accepted',
    row: { puzzle_date: '2001-01-01', clues_used: 999, score: -999999, guessed: false, mode: 'sim-probe' },
  });
  console.log('   NEGATIVE CONTROL ON: cbb_scores added to section 1, and it has no constraint, so section 1 must go red');
}

console.log('1) every table bounded in Round 361 rejects an out of range row with a check violation');
for (const p of BOUNDED) {
  const r = await post(p.table, p.row);
  const verdict = r.ok ? 'ACCEPTED' : `${r.status} ${r.code || '(no code)'}`;
  console.log(`   ${p.table.padEnd(26)} ${verdict.padEnd(14)} ${p.why}`);
  if (r.ok) {
    fail(`${p.table} ACCEPTED a row that breaks its bound, so the constraint is missing. A row tagged sim-probe now needs deleting.`);
  } else if (r.code !== '23514') {
    fail(`${p.table} rejected the row with ${r.code || r.status} rather than a check violation (23514), so something other than the constraint refused it and the bound is unproven`);
  }
}

console.log('2) the daily answer tables refuse an anonymous write outright');
for (const t of ['cbb_daily', 'nascar_daily']) {
  /* A far past date on purpose: if this ever DOES get written, it must not be a
     date any player will be served. */
  const r = await post(t, { puzzle_date: '1999-01-01' });
  console.log(`   ${t.padEnd(26)} ${r.ok ? 'ACCEPTED' : `${r.status} ${r.code || '(no code)'}`}`);
  if (r.ok) {
    fail(`${t} accepted an anonymous insert, so a stranger can choose the daily puzzle. Delete the 1999-01-01 row.`);
  } else if (r.code === '23514') {
    fail(`${t} answered with a check violation, which means the write is still allowed and merely constrained. The fix was to remove the write.`);
  }
}

console.log('3) the probe can tell a constraint refusal from an RLS refusal');
{
  /* game_score_caps has public read and no insert policy at all, so it must
     answer 42501. If this came back 23514 the whole of section 1 would be
     meaningless, because it could be reading RLS refusals as proof of bounds. */
  const r = await post('game_score_caps', { game: 'sim-probe', max_score: 1 });
  console.log(`   game_score_caps            ${r.ok ? 'ACCEPTED' : `${r.status} ${r.code || '(no code)'}`} (expected an RLS refusal, not 23514)`);
  if (r.ok) fail('game_score_caps accepted an anonymous insert, which is the Round 360 allowlist itself being writable');
  else if (r.code === '23514') fail('an RLS refusal came back as a check violation, so section 1 cannot distinguish the two and proves nothing');
}

console.log('');
if (CONTROL === 'unbounded') {
  console.log('   CLEANUP for the control row, run as service role:');
  console.log("   delete from public.cbb_scores where mode = 'sim-probe';");
  if (failures > 0) { console.log(`simPublicWrites control: green. The unbounded table was caught (${failures} finding${failures === 1 ? '' : 's'}).`); process.exit(0); }
  console.error('simPublicWrites control: RED. A table with no constraint passed as if it had one.');
  process.exit(1);
}
if (failures > 0) { console.error(`simPublicWrites: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simPublicWrites: green. Every bounded table refused its probe with a check violation, and the daily answer tables refused the write entirely.');
