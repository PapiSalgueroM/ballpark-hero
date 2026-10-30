/* Round 1574: the NHL Connections table migration, and its checksummed all or nothing form, run for real in an
   embedded Postgres (PGlite), never against the live project. Since Round 1583 a thin script over the shared engine
   scripts/lib/connectionsRehearsal.mjs (its checks, controls and judge were lifted out of this file word for word;
   its header says what each check proves).

   supabase/migrations/20261030150000_round_1574_nhl_connections_tables.sql (the guarded form) and the SQL that
   scripts/qa/usConnections1574Checksummed.mjs writes from the lead's export (the form production gets) both run
   here word for word, on a table built as the live one stood at the lead's 2026-10-29 export: the shipped file's
   boards for nhlconn-001 to 004 and the table file's exported boards for nhlconn-005 to 020, in sort_order, plus
   one row past them that the game never deals (three groups).

   This round's shape: 0 holds the migration to its generator and the table file at the round's data commit (16
   boards, every new board the table file's board and every old value the exported board); G dumps every nhlconn
   row after A; H deals through src/lib/fetchNhlConnectionsPuzzles.ts.

   PGlite is not a dependency of this repo on purpose. Install it anywhere and say where:
     npm install --prefix /tmp/pgl @electric-sql/pglite
     PGLITE_DIR=/tmp/pgl node scripts/qa/rehearseUsConnections1574.mjs
   Negative controls, each must exit 1 and say which check caught it:
     REHEARSE_CONTROL=noguard  the guard stripped from the guarded form: B overwrites the drifted row
     REHEARSE_CONTROL=drift    one tile of nhlconn-009's new board changed in the migration only: check 0
     REHEARSE_CONTROL=tamper   the payload checksum test stripped from the checksummed form: D lands a wrong board
     REHEARSE_CONTROL=nohash   the per row hash test stripped from the checksummed form: E overwrites the late drift
     REHEARSE_CONTROL=dupname  one rewritten board carries a repeated name after A: the pool shrinks and H names the
                               first date whose board moved
   A control that cannot find what it changes exits 2 (ABORTED). Not named sim*: the suite runner must not pick up
   a script that needs a package the repo does not carry. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { rehearse } from '../lib/connectionsRehearsal.mjs';
import { plan, tableAt, migrationText, MIGRATION, ROUND_FILES, TABLE } from './usConnections1574Migration.mjs';
import { checksummedSql, payloadFrom } from './usConnections1574Checksummed.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const R = ROOT.split(path.sep).join('/');

/* the shipped file's boards (nhlconn-001 to 004), as the live table holds them once Round 1567 is applied, then the
   table file's exported boards (nhlconn-005 to 020) */
async function load() {
  const p = plan();
  const doc = tableAt(ROUND_FILES);
  const byId = new Map(doc.rows.map(r => [r.puzzle_id, r]));
  const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'r1574reh-'));
  fs.writeFileSync(path.join(TMP, 'f.mjs'), `export { nhlConnectionsPuzzles as b } from '${R}/src/data/nhlConnectionsPuzzles.ts';`);
  await build({ entryPoints: [path.join(TMP, 'f.mjs')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(TMP, 'fo.mjs'), logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
  const fileBoards = (await import(pathToFileURL(path.join(TMP, 'fo.mjs')).href)).b.map(b => ({ id: b.id, groups: b.groups.map(g => ({ theme: g.theme, players: [...g.players], difficulty: g.difficulty })) }));
  return {
    plan: p,
    newBoard: id => byId.get(id)?.board,
    oldBoard: id => byId.get(id)?.exported,
    seed: [...fileBoards.map((b, i) => ({ id: b.id, groups: b.groups, order: i + 1 })), ...doc.rows.map(r => ({ id: r.puzzle_id, groups: r.exported, order: r.sort_order }))],
    past: fileBoards[0].groups.slice(0, 3),
  };
}

await rehearse({
  name: 'rehearseUsConnections1574', round: '1574', sport: 'nhl', table: TABLE, migration: MIGRATION, guardTmp: 'r1574_nhl', n: 16,
  driftId: 'nhlconn-009', mark: { from: 'Bobby Orr', to: 'Bobby Orrr' },
  load, migrationText, payloadFrom, checksummedSql,
  keepLive: id => /^nhlconn-\d+$/.test(id),
  fetcher: { file: 'src/lib/fetchNhlConnectionsPuzzles.ts', name: 'fetchNhlConnectionsPuzzles' },
  copy: {
    zero: 'the table file', newIs: "the table file's board", oldIs: 'the exported board',
    newSummary: 'the table file', oldSummary: "the export's", writer: 'scripts/qa/usConnections1574Migration.mjs',
    liveHeading: 'the table after A', liveWhat: 'table',
    green: 'green. Both forms land the 16 NHL table boards in place, a drifted row is left alone or stops the step, a tampered payload is refused, the table after passes the strict harness, and every date deals the same board.',
  },
});
