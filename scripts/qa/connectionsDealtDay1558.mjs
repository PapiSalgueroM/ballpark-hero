/* Round 1558: which Baseball, NFL and NHL Connections board is dealt on a day, and does the Round 1558 migration
   rewrite it?

   Saved daily guesses find a solved group by its theme text (the sport hooks: useBaseballConnections,
   useNflConnections, useNhlConnections), so a board whose labels change on the day it is dealt loses that day's
   solved groups on screen. Run this with the lead's read only exports of the three tables (puzzle_id, sort_order,
   groups_json) before applying supabase/migrations/20261022180000_round_1558_us_connections_truth.sql, and apply
   on a day it says is clear for all three:

     node scripts/qa/connectionsDealtDay1558.mjs baseball=<export.json>,nfl=<export.json>,nhl=<export.json> 2026-10-27 [more dates]

   With "file" in place of the exports it deals from the shipped files instead, the pool the game falls back to
   when the table cannot be read: the code release should land on a day that pool deals no board this round
   changed (node scripts/qa/connectionsDealtDay1558.mjs file 2026-10-27 [more dates], or "file" plus a start date
   and a count: file 2026-10-27 +40).

   It deals exactly as the game does: dailyIndex(date, pool size) over the rows in sort_order, after the same
   validity filter (four groups of five, twenty different names). It reads only the exports and the repo; it never
   reaches the network. Exit 1 when any date deals a board the migration rewrites. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const [source, ...args] = process.argv.slice(2);
if (!source || !args.length) { console.error('usage: node scripts/qa/connectionsDealtDay1558.mjs <baseball=<f>,nfl=<f>,nhl=<f> | file> <YYYY-MM-DD> [... | +N]'); process.exit(2); }
const R = ROOT.split(path.sep).join('/');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'dealt1558-'));
fs.writeFileSync(path.join(TMP, 'entry.mjs'), `export { dailyIndex } from '${R}/src/lib/dateUtils.ts';
export { baseballConnectionsPuzzles } from '${R}/src/data/baseballConnectionsPuzzles.ts';
export { nflConnectionsPuzzles } from '${R}/src/data/nflConnectionsPuzzles.ts';
export { nhlConnectionsPuzzles } from '${R}/src/data/nhlConnectionsPuzzles.ts';`);
await build({ entryPoints: [path.join(TMP, 'entry.mjs')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(TMP, 'b.mjs'), logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const m = await import(pathToFileURL(path.join(TMP, 'b.mjs')).href);

/* the dates: a list, or a start date and +N days */
let dates = args;
if (args.length === 2 && /^\+\d+$/.test(args[1])) {
  const start = new Date(`${args[0]}T12:00:00Z`);
  dates = Array.from({ length: Number(args[1].slice(1)) }, (_, i) => new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10));
}

const groupsOf = raw => { const v = typeof raw === 'string' ? JSON.parse(raw) : raw; return Array.isArray(v) ? v : (v?.groups ?? []); };
const valid = g => { const all = g.flatMap(x => x.players ?? []); return g.length === 4 && g.every(x => (x.players ?? []).length === 5) && new Set(all).size === 20; };
const migration = fs.readFileSync(path.join(ROOT, 'supabase/migrations/20261022180000_round_1558_us_connections_truth.sql'), 'utf8');
const touched = new Set([...migration.matchAll(/^\s*\('((?:bconn|nflconn|nhlconn)-[0-9]+)', /gm)].map(x => x[1]));

const pools = {};
if (source === 'file') {
  pools.baseball = m.baseballConnectionsPuzzles.map(b => ({ puzzle_id: b.id, groups: b.groups }));
  pools.nfl = m.nflConnectionsPuzzles.map(b => ({ puzzle_id: b.id, groups: b.groups }));
  pools.nhl = m.nhlConnectionsPuzzles.map(b => ({ puzzle_id: b.id, groups: b.groups }));
} else {
  for (const part of source.split(',')) {
    const [s, f] = part.split('=');
    pools[s] = JSON.parse(fs.readFileSync(f, 'utf8')).sort((a, b) => a.sort_order - b.sort_order).map(r => ({ puzzle_id: r.puzzle_id, groups: groupsOf(r.groups_json) }));
  }
}
let clash = 0;
for (const d of dates) {
  const line = [];
  for (const [s, rows] of Object.entries(pools)) {
    const pool = rows.filter(r => valid(r.groups));
    const id = pool[m.dailyIndex(d, pool.length)]?.puzzle_id;
    const hit = touched.has(id);
    if (hit) clash += 1;
    line.push(`${s} ${id} of ${pool.length}${hit ? ' REWRITTEN' : ''}`);
  }
  const bad = line.some(x => x.endsWith('REWRITTEN'));
  console.log(`${d}: ${line.join('; ')}: ${bad ? 'a board the 1558 migration rewrites is dealt: not this day' : 'clear'}`);
}
process.exit(clash ? 1 : 0);
