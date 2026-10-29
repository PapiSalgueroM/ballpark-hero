/* Round 1553: which soccer Connections board is dealt on a day, and does the Round 1553 migration rewrite it?

   Saved daily guesses find a solved group by its category text (src/hooks/useConnections.ts), so a board whose
   labels change on the day it is dealt loses that day's solved groups on screen. Run this with the lead's read only
   export of connections_puzzles (puzzle_id, sort_order, groups_json) before applying
   supabase/migrations/20261022130000_round_1553_connections_truth.sql, and apply on a day it says is clear:

     node scripts/qa/connectionsDealtDay1553.mjs <export.json> 2026-10-23 [more dates]

   It deals exactly as the game does: dailyIndex(date, pool size) over the rows in sort_order, after the same
   isValidPuzzle filter. It reads only the export file and the repo; it never reaches the network. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const [exportPath, ...dates] = process.argv.slice(2);
if (!exportPath || !dates.length) { console.error('usage: node scripts/qa/connectionsDealtDay1553.mjs <export.json> <YYYY-MM-DD> [...]'); process.exit(2); }
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'dealt1553-'));
const ENTRY = path.join(TMP, 'entry.mjs');
fs.writeFileSync(ENTRY, `export { dailyIndex } from '${ROOT.replaceAll('\\', '/')}/src/lib/dateUtils.ts';`);
await build({ entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: path.join(TMP, 'b.mjs'), logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const { dailyIndex } = await import(pathToFileURL(path.join(TMP, 'b.mjs')).href);

const groupsOf = raw => { const v = typeof raw === 'string' ? JSON.parse(raw) : raw; return Array.isArray(v) ? v : (v?.groups ?? []); };
const valid = g => { const all = g.flatMap(x => x.players ?? []); return g.length === 4 && g.every(x => (x.players ?? []).length === 4) && new Set(all).size === 16; };
const pool = JSON.parse(fs.readFileSync(exportPath, 'utf8'))
  .sort((a, b) => a.sort_order - b.sort_order)
  .filter(r => valid(groupsOf(r.groups_json)));
/* Round 1565: CONN_MIGRATION=<path> asks the same of another migration, such as
   supabase/migrations/20261029120000_round_1565_connections_live.sql, whose rows include crafted-* and cx-* boards */
const MIGRATION = process.env.CONN_MIGRATION ?? 'supabase/migrations/20261022130000_round_1553_connections_truth.sql';
const migration = fs.readFileSync(path.resolve(ROOT, MIGRATION), 'utf8');
const touched = new Set([...migration.matchAll(/^\s*\('([a-z]+-[0-9][0-9-]*)', /gm)].map(m => m[1]));
if (!touched.size) { console.error(`${MIGRATION} names no rows`); process.exit(2); }
let clash = 0;
for (const d of dates) {
  const id = pool[dailyIndex(d, pool.length)]?.puzzle_id;
  const hit = touched.has(id);
  if (hit) clash += 1;
  console.log(`${d}: ${id} of ${pool.length} boards, ${hit ? `REWRITTEN by ${path.basename(MIGRATION)}: do not apply that day` : 'not touched: clear to apply'}`);
}
process.exit(clash ? 1 : 0);
