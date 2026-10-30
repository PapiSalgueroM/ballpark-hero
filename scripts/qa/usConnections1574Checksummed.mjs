/* Round 1574: the checksummed, all or nothing form of the round's migration, written from the lead's read only
   export of nhl_connections_puzzles (Rounds 1553, 1558 and 1567 applied theirs this way).

   The export is the JSON of
     select puzzle_id, sort_order, groups_json, md5(groups_json::text) as h from public.nhl_connections_puzzles order by sort_order;
   (h is Postgres's own hash of the stored text; Round 1565's scripts/lib/pgJsonbText.mjs computes the same from a
   public REST read, which is how the lead's 2026-10-29 export got its h).

     node scripts/qa/usConnections1574Checksummed.mjs nhl=<export.json> <out.sql>

   For every row the migration (supabase/migrations/20261030150000_round_1574_nhl_connections_tables.sql) rewrites:
   a row already holding the new board is left out; a row holding its exported board goes in with its exported hash;
   a row holding anything else (drifted) STOPS the script (exit 1, named) unless the lead, having looked at it,
   lists it in ACCEPT_DRIFTED=<id,id>. A row missing from the export stops it too. The SQL checks its own payload's
   md5 before anything, rewrites each row only while md5(groups_json::text) still equals the exported hash, and
   raises (so nothing is applied) unless every row was rewritten or already current. A second run is a no-op.
   The writers are scripts/lib/connectionsMigration.mjs (one engine for every Connections round). Reads only the
   export and the repo. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checksummedSql as lift, classify } from '../lib/connectionsMigration.mjs';
import { plan, TABLE } from './usConnections1574Migration.mjs';

export const WRITER = 'scripts/qa/usConnections1574Checksummed.mjs';
/** The SQL for a payload of { t, id, h, n } rows. Exported for the rehearsal. */
export const checksummedSql = payloadRows => lift({ round: '1574', writer: WRITER, tables: { nhl: TABLE }, payloadRows });
/** The payload from an export: { rows, already, drifted, missing }. */
export const payloadFrom = (exports, acceptDrifted = []) => classify({ plan: { nhl: plan() }, exports, acceptDrifted });

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [src, outFile] = process.argv.slice(2);
  if (!src || !outFile) { console.error('usage: node scripts/qa/usConnections1574Checksummed.mjs nhl=<export.json> <out.sql>'); process.exit(2); }
  const exports = {};
  for (const part of src.split(',')) { const [s, f] = part.split('='); exports[s] = JSON.parse(fs.readFileSync(f, 'utf8')); }
  if (!exports.nhl) { console.error('this round rewrites nhl_connections_puzzles only: pass nhl=<export.json>'); process.exit(2); }
  const accept = (process.env.ACCEPT_DRIFTED ?? '').split(',').filter(Boolean);
  const r = payloadFrom(exports, accept);
  console.log(`rows to rewrite ${r.rows.length}; already current ${r.already.length}; drifted ${r.drifted.length}${r.drifted.length ? ` (${r.drifted.join(', ')})` : ''}; missing ${r.missing.length}${r.missing.length ? ` (${r.missing.join(', ')})` : ''}`);
  const stop = r.missing.length || r.drifted.some(x => !accept.includes(x.split(':')[1]));
  if (stop) { console.error('STOP: a row is missing or drifted. Look at it in the export; list a drifted row in ACCEPT_DRIFTED only if overwriting it with the new board is right.'); process.exit(1); }
  fs.writeFileSync(outFile, checksummedSql(r.rows));
  console.log(`wrote ${outFile}`);
}
