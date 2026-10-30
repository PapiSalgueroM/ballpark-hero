/* Round 1574: the US Connections table rows in the repo, as data.

   Baseball, NFL and NHL Connections deal their daily from the live tables (baseball_connections_puzzles,
   nfl_connections_puzzles, nhl_connections_puzzles), which hold more rows than the shipped files in src/data. The
   rows past the files live here, one file per sport, written once from the lead's read only export by
   scripts/qa/usConnectionsTableImport.mjs init and changed after that only by a round's decisions:

     scripts/data/<sport>ConnectionsTable-2026-10.json
       { about, table, exportedAt, exportFile, fingerprint,
         rows: [{ puzzle_id, sort_order, exportedH, exported, board }] }

   `exported` is the row's groups exactly as the export held them, `board` the groups after the rounds that decided
   it (equal to `exported` until a round changes it), `exportedH` Postgres's md5(groups_json::text) from the export.
   Nothing under src reads these files: they are what the harness (scripts/simUsConnectionsFacts.mjs) holds to the
   record and what a round's migration is written from. Reads files only; never the network or the clock.

   TABLE_RANGE says which table rows the harness holds to every section, per sport: 'all', or [first id, last id].
   A sport not in it is held only in report mode (US_CONN_TABLES). Round 1574 holds NHL; Rounds 1580 to 1582 add
   NFL and baseball. */
import fs from 'node:fs';
import path from 'node:path';
import { escapeDashes } from './connectionsMigration.mjs';

export const TABLE_RANGE = { nhl: 'all' };
export const TABLE_SPORTS = { baseball: 'baseball_connections_puzzles', nfl: 'nfl_connections_puzzles', nhl: 'nhl_connections_puzzles' };

export const tableFile = (root, sport) => path.join(root, 'scripts', 'data', `${sport}ConnectionsTable-2026-10.json`);

/** The sport's table file, or null when none was written. */
export function tableDoc(root, sport) {
  const f = tableFile(root, sport);
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
}

/** Whether an id is in a range: 'all', or [first, last] compared by the number after the last dash. */
export function inRange(range, id) {
  if (!range) return false;
  if (range === 'all') return true;
  const n = s => Number(String(s).match(/(\d+)$/)?.[1] ?? NaN);
  return n(id) >= n(range[0]) && n(id) <= n(range[1]);
}

/** The table rows (all of them, or only those in a range). */
export function tableRows(root, sport, range = 'all') {
  return (tableDoc(root, sport)?.rows ?? []).filter(r => inRange(range, r.puzzle_id));
}

/** The boards as the harness reads them: [{ id, groups }] from each row's `board`. */
export function tableBoards(root, sport, range = 'all') {
  return tableRows(root, sport, range).map(r => ({ id: r.puzzle_id, groups: r.board.map(g => ({ ...g, players: [...g.players] })) }));
}

/** The file's text: one row per block, one group per line, so a decision shows as the lines it changed. */
export function tableText(doc) {
  const head = Object.entries(doc).filter(([k]) => k !== 'rows').map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`).join(',\n');
  const groups = gs => `[\n${gs.map(g => `   ${JSON.stringify(g)}`).join(',\n')}]`;
  const rows = doc.rows.map(r => `{"puzzle_id":${JSON.stringify(r.puzzle_id)},"sort_order":${r.sort_order},"exportedH":${JSON.stringify(r.exportedH)},\n  "exported":${groups(r.exported)},\n  "board":${groups(r.board)}}`).join(',\n');
  const text = `{${head},\n"rows":[\n${rows}\n]}\n`;
  JSON.parse(text);
  return escapeDashes(text);
}

export function writeTableDoc(root, sport, doc) {
  fs.writeFileSync(tableFile(root, sport), tableText(doc));
}
