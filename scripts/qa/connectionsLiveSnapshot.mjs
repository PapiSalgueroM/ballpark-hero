/* Round 1565: write scripts/data/connectionsLiveSnapshot.json, the fence's copy of the live
   connections_puzzles table (puzzle_id, sort_order and the md5 of each board), from the lead's read only export.

   The export is either the light one, one SELECT that returns no board at all:
     select puzzle_id, sort_order, md5(groups_json::text) as md5 from public.connections_puzzles order by sort_order;
   or a full one (puzzle_id, sort_order, groups_json), hashed here the way Postgres prints jsonb
   (scripts/lib/pgJsonbText.mjs; scripts/qa/rehearseConnections1565.mjs proves the two agree row for row).

     node scripts/qa/connectionsLiveSnapshot.mjs <export.json> "<when and how it was read>"

   simConnectionsFacts section 6 then fails while the shipped file and this snapshot disagree on any board or on the
   set and order of ids. It reads only the export file; it never reaches the network. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { boardMd5 } from '../lib/pgJsonbText.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const [exportPath, takenAt] = process.argv.slice(2);
if (!exportPath || !takenAt) {
  console.error('usage: node scripts/qa/connectionsLiveSnapshot.mjs <export.json> "<when and how it was read>"');
  process.exit(2);
}
const groupsOf = raw => { const v = typeof raw === 'string' ? JSON.parse(raw) : raw; return Array.isArray(v) ? v : (v?.groups ?? []); };
const rows = JSON.parse(fs.readFileSync(exportPath, 'utf8'))
  .map(r => ({ puzzle_id: r.puzzle_id, sort_order: Number(r.sort_order), md5: r.md5 ?? boardMd5(groupsOf(r.groups_json)) }))
  .sort((a, b) => a.sort_order - b.sort_order);
for (const r of rows) if (!/^[0-9a-f]{32}$/.test(r.md5) || !r.puzzle_id || !Number.isInteger(r.sort_order)) throw new Error('bad row ' + JSON.stringify(r));
if (new Set(rows.map(r => r.puzzle_id)).size !== rows.length) throw new Error('an id appears twice');
const out = {
  about: [
    'Round 1565: the live connections_puzzles table as the lead read it, one row per board: puzzle_id, sort_order and md5(groups_json::text).',
    'The game deals from that table; src/data/connectionsPuzzles.ts is the fallback and must be its copy, board for board and in the same order.',
    'scripts/simConnectionsFacts.mjs section 6 fails while the two disagree. The lead rewrites this file at each release\'s live pass with scripts/qa/connectionsLiveSnapshot.mjs.',
  ],
  takenAt,
  rows,
};
const target = path.join(ROOT, 'scripts/data/connectionsLiveSnapshot.json');
/* one row a line, so a release's diff names the boards that moved */
const text = '{\n'
  + `  "about": [\n${out.about.map(a => '    ' + JSON.stringify(a)).join(',\n')}\n  ],\n`
  + `  "takenAt": ${JSON.stringify(takenAt)},\n`
  + `  "rows": [\n${rows.map(r => '    ' + JSON.stringify(r)).join(',\n')}\n  ]\n}\n`;
JSON.parse(text);
fs.writeFileSync(target, text);
console.log(`wrote ${path.relative(ROOT, target)}: ${rows.length} rows, ${takenAt}`);
