/* Round 1583: the NBA Connections file board migration, and its checksummed all or nothing form, run for real in an
   embedded Postgres (PGlite), never against the live project. A thin script over the shared engine
   scripts/lib/connectionsRehearsal.mjs (Round 1574's rehearsal, lifted: its checks, its controls and its judge,
   pointed at this round's plan; its header says what each check proves).

   supabase/migrations/20261031120000_round_1583_nba_connections_dated.sql (the guarded form) and the SQL that
   scripts/qa/nbaConnections1583Migration.mjs checksummed writes from an export (the form production gets) both run
   here word for word, on a table built as the live one stood at the lead's 2026-10-29 export: the base file's boards
   for nbaconn-001 to 004 (the export held exactly those: compare mode) and the table file's exported boards for
   nbaconn-005 to 020 (scripts/data/nbaConnectionsTable-2026-10.json), in sort_order, plus one row past them that the
   game never deals (three groups).

   This round's shape: 0 holds the migration to its generator (4 boards), every new board the file's at ROUND_FILES
   and every old value the base file's board; A also proves nbaconn-005 to 020 untouched; G dumps only the four rows
   this round decided (the table rows past the file are Round 1586's); H deals through
   src/lib/fetchNbaConnectionsPuzzles.ts.

   PGlite is not a dependency of this repo on purpose. Install it anywhere and say where:
     npm install --prefix /tmp/pgl @electric-sql/pglite
     PGLITE_DIR=/tmp/pgl node scripts/qa/rehearseNbaConnections1583.mjs
   Negative controls, each must exit 1 and say which check caught it:
     REHEARSE_CONTROL=noguard  the guard stripped from the guarded form: B overwrites the drifted row
     REHEARSE_CONTROL=drift    one tile of nbaconn-002's new board changed in the migration only: check 0
     REHEARSE_CONTROL=tamper   the payload checksum test stripped from the checksummed form: D lands a wrong board
     REHEARSE_CONTROL=nohash   the per row hash test stripped from the checksummed form: E overwrites the late drift
     REHEARSE_CONTROL=dupname  one rewritten board carries a repeated name after A: the pool shrinks and H names the
                               first date whose board moved
   A control that cannot find what it changes exits 2 (ABORTED). Not named sim*: the suite runner must not pick up
   a script that needs a package the repo does not carry. */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rehearse } from '../lib/connectionsRehearsal.mjs';
import { tableDoc } from '../lib/usConnectionsTables.mjs';
import { BASE, ROUND_FILES, MIGRATION, TABLE, boardsAt, checksummedSql, migrationText, payloadFrom, plan } from './nbaConnections1583Migration.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/* the base file's boards (nbaconn-001 to 004), then the table file's exported boards (nbaconn-005 to 020) */
async function load() {
  const p = await plan();
  const baseBoards = await boardsAt(BASE);
  const roundBoards = new Map((await boardsAt(ROUND_FILES)).map(b => [b.id, b.groups]));
  const doc = tableDoc(ROOT, 'nba');
  const baseById = new Map(baseBoards.map(b => [b.id, b.groups]));
  return {
    plan: p,
    newBoard: id => roundBoards.get(id),
    oldBoard: id => baseById.get(id),
    seed: [...baseBoards.map((b, i) => ({ id: b.id, groups: b.groups, order: i + 1 })), ...doc.rows.map(r => ({ id: r.puzzle_id, groups: r.exported, order: r.sort_order }))],
    past: baseBoards[0].groups.slice(0, 3),
  };
}

await rehearse({
  name: 'rehearseNbaConnections1583', round: '1583', sport: 'nba', table: TABLE, migration: MIGRATION, guardTmp: 'r1583_nba', n: 4,
  driftId: 'nbaconn-002', mark: { from: 'Victor Wembanyama', to: 'Victor Wembanyamaa' },
  load, migrationText, payloadFrom, checksummedSql,
  keepLive: (id, planned) => planned.has(id),
  fetcher: { file: 'src/lib/fetchNbaConnectionsPuzzles.ts', name: 'fetchNbaConnectionsPuzzles' },
  copy: {
    zero: 'the file', newIs: `the file's at ${ROUND_FILES}`, oldIs: "the base file's board",
    newSummary: 'the decided file', oldSummary: "the base file's", writer: 'scripts/qa/nbaConnections1583Migration.mjs',
    liveHeading: 'the four rows after A', liveWhat: 'rows',
    green: 'green. Both forms land the 4 NBA file boards in place, a drifted row is left alone or stops the step, a tampered payload is refused, the rows after pass the strict harness, and every date deals the same board.',
  },
});
