/* Round 1574: write (or check) the guarded migration for the NHL Connections rows past the shipped file.

   The rows are the table file scripts/data/nhlConnectionsTable-2026-10.json at the round's own data commit
   (ROUND_FILES), written from the lead's read only export of 2026-10-29: each row's `exported` board is what the live
   row held then, its `board` what the round decided (scripts/data/nhlConnectionsVerified-2026-10.json,
   tableDecisions). A row is in the migration when the two differ; it is rewritten only while it still holds the
   exported board (the 1558 guard, written by scripts/lib/connectionsMigration.mjs, the one engine 1567's writers
   were lifted into).

     node scripts/qa/usConnections1574Migration.mjs write    rewrites the migration file
     node scripts/qa/usConnections1574Migration.mjs check    exit 1 unless the committed file is what write gives

   It reads git (the table file at ROUND_FILES) and the repo; never the network. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { guardedBlockSql, same } from '../lib/connectionsMigration.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
/* the round's data commit: the table file has not changed since it on the round's branch. Merge the branch, never
   squash it, or the commit is lost. A later edit of the NHL table file is that round's own migration. fix-1574 moved
   it from 202ea80f9 to the review fix's last board commit (Matthews, McDavid and Taylor Hall off 011, 012 and 018). */
export const ROUND_FILES = process.env.R1574_ROUND_FILES ?? '6084fb666151e74a23edf3ac54d96656a6615c87';
export const MIGRATION = 'supabase/migrations/20261030150000_round_1574_nhl_connections_tables.sql';
export const TABLE = 'nhl_connections_puzzles';
const TABLE_FILE = 'scripts/data/nhlConnectionsTable-2026-10.json';
const FILE = 'src/data/nhlConnectionsPuzzles.ts';

/** The table file at a commit (rev) or in the tree (null). */
export function tableAt(rev) {
  const text = rev ? execFileSync('git', ['show', `${rev}:${TABLE_FILE}`], { cwd: ROOT, maxBuffer: 1 << 26, encoding: 'utf8' }) : fs.readFileSync(path.join(ROOT, TABLE_FILE), 'utf8');
  return JSON.parse(text);
}

/** Every rewritten row: [{ id, olds: [exported], next: board }], in sort_order. */
export function plan(rev = ROUND_FILES) {
  const doc = tableAt(rev);
  const fileText = fs.readFileSync(path.join(ROOT, FILE), 'utf8');
  const out = [];
  for (const r of [...doc.rows].sort((a, b) => a.sort_order - b.sort_order)) {
    if (!/^nhlconn-\d+$/.test(r.puzzle_id)) throw new Error(`${r.puzzle_id} is not an NHL Connections id`);
    if (fileText.includes(`'${r.puzzle_id}'`)) throw new Error(`${r.puzzle_id} is a file board: the file's rows are Round 1567's migration, never this one`);
    if (same(r.exported, r.board)) continue;
    out.push({ id: r.puzzle_id, olds: [r.exported], next: r.board });
  }
  return out;
}

const HEADER = rows => `-- Round 1574 (2026-10-30): NHL Connections, the rows past the shipped file decided in place.
--
-- UNAPPLIED. Written for review; the lead applies it at a release, away from midnight ET and never beside a gate
-- on live tables, after Round 1567's migration (round_1567_us_connections_gray). Never rehearsed
-- on production (BEGIN ... ROLLBACK still takes the locks): it is rehearsed in PGlite
-- (scripts/qa/rehearseUsConnections1574.mjs). Written by scripts/qa/usConnections1574Migration.mjs from
-- scripts/data/nhlConnectionsTable-2026-10.json at ${ROUND_FILES}; never edit it by hand.
--
-- What it does: rewrites, IN PLACE, the ${rows} rows of nhl_connections_puzzles past the file
-- (nhlconn-005 to nhlconn-020) whose boards this round decided. Same puzzle_id, same sort_order, same row count,
-- same order and colours of the four groups, so dailyIndex deals the same board on the same day and nothing
-- reshuffles. Only groups_json changes. Rows nhlconn-001 to 004 (the file's) are not touched.
--
-- Why: no round had read these rows. On them a player met two right answers (Steven Stamkos, a Predator since
-- 2024-25, under "Won the Rocket Richard Trophy" beside "Played for the Predators"; Steve Yzerman's 65 goals
-- beside "Scored 60 goals in a season"; 23 such pairs), men still playing one season from a group beside them
-- (32), and groups no record holds (captaincy, Cup winning goals, the Triple Gold Club, a national roster, Cup
-- Final starts). Every group is now one the league's record decides, every member stands on two hosts
-- (scripts/data/nhlConnectionsVerified-2026-10.json), and every club group is dated "(as of 2025-26)".
--
-- The guard: a row is rewritten only while it still holds the board the lead exported on 2026-10-29 (jsonb
-- equality). A row that holds anything else is left alone and named in a NOTICE, never overwritten blind.
--
-- A saved daily guess keeps the groups it solved as they were saved, so apply on a day this rewrites no dealt
-- board: node scripts/qa/connectionsDealtDay1574.mjs nhl=<export> <YYYY-MM-DD> +40
-- To apply a drifted table as one checksummed, all or nothing step, see scripts/qa/usConnections1574Checksummed.mjs.
--
-- A re-run after a good apply is a no-op (no row still holds its exported board).
`;

export function migrationText(rev = ROUND_FILES) {
  const p = plan(rev);
  return HEADER(p.length) + guardedBlockSql({ round: '1574', table: TABLE, tmp: 'r1574_nhl', rows: p });
}

const step = process.argv[2];
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]) && (step === 'write' || step === 'check')) {
  const text = migrationText();
  const file = path.join(ROOT, MIGRATION);
  if (step === 'write') {
    fs.writeFileSync(file, text);
    console.log(`wrote ${MIGRATION}: nhl ${plan().length} boards`);
  } else {
    const have = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : '';
    if (have !== text) { console.error(`${MIGRATION} is not what the table file at ${ROUND_FILES} gives: run write`); process.exit(1); }
    console.log(`${MIGRATION} matches the table file at ${ROUND_FILES} (${plan().length} boards)`);
    if (!same(tableAt(null).rows, tableAt(ROUND_FILES).rows)) console.log(`note: the table file has changed since ${ROUND_FILES}; the migration stays the round's, and the change is a later round's to migrate`);
  }
}
