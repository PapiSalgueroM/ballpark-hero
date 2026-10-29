/* Round 1558: which Baseball, NFL and NHL Connections board is dealt on a day, and does the Round 1558 migration
   rewrite it?

   A saved daily guess keeps the groups it solved as they were saved (the sport hooks: useBaseballConnections,
   useNflConnections, useNhlConnections), so on the day a rewritten board is dealt, a guess saved before the
   change keeps showing the OLD group, false member and all, counts it toward 4/4 and strands the new members as
   tiles (the round's review played it on a runner). Run this with the lead's read only exports of the three tables (puzzle_id, sort_order,
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
/* DEALT_MIGRATION (Round 1567): the same check for a later round's migration of these three tables
   (scripts/qa/connectionsDealtDay1567.mjs sets it), so one script deals for every round */
const MIGRATION_FILE = process.env.DEALT_MIGRATION ?? 'supabase/migrations/20261022180000_round_1558_us_connections_truth.sql';
const ROUND = (MIGRATION_FILE.match(/round_(\d+)/) ?? [])[1] ?? '1558';
const migration = fs.readFileSync(path.join(ROOT, MIGRATION_FILE), 'utf8');
const touched = new Set([...migration.matchAll(/^\s*\('((?:bconn|nflconn|nhlconn)-[0-9]+)', /gm)].map(x => x[1]));
/* DEALT_LABELS_ONLY_SAFE=1 (Round 1567, set by its wrapper): a board whose every known old value holds the same five
   players in each group as the new board, and only a label changed ("Played for the Steelers" to "Played for the
   Steelers (as of 2025)"), cannot strand a tile: a guess saved earlier that day keeps the old label on its solved
   group. That is safe only because the hooks match a saved group to the board by its label OR its five names
   (src/lib/connectionsSolvedMatch.ts, added by Round 1567's fix); under the code before it, which matched by label
   alone, a LOST board showed that group twice, old and new label with the same five names (review-run-1567 finding
   1). So the code release carrying that matcher must be live before the migration lands. Such a board is reported
   RELABELLED and does not make the day unsafe. With exports, the
   live row is what is compared with the new board; with "file", the base file's board (the migration's first old
   value for the row). */
const LABELS_ONLY_SAFE = process.env.DEALT_LABELS_ONLY_SAFE === '1';
const sets = g => g.map(x => [...(x.players ?? [])].sort().join('|')).join('/');
const migRows = new Map();
for (const x of migration.matchAll(/^\s*\('((?:bconn|nflconn|nhlconn)-[0-9]+)', '((?:[^']|'')*)', '((?:[^']|'')*)'\)/gm)) {
  const [old, next] = [x[2], x[3]].map(j => JSON.parse(j.replace(/''/g, "'")));
  if (!migRows.has(x[1])) migRows.set(x[1], { next, olds: [] });
  migRows.get(x[1]).olds.push(old);
}
const relabelOnly = (id, groups) => {
  if (!LABELS_ONLY_SAFE || !migRows.has(id)) return false;
  const r = migRows.get(id);
  return sets(source === 'file' ? r.olds[0] : groups) === sets(r.next);
};

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
    const row = pool[m.dailyIndex(d, pool.length)];
    const id = row?.puzzle_id;
    const relabel = touched.has(id) && relabelOnly(id, row.groups);
    const hit = touched.has(id) && !relabel;
    if (hit) clash += 1;
    line.push(`${s} ${id} of ${pool.length}${hit ? ' REWRITTEN' : relabel ? ' RELABELLED' : ''}`);
  }
  const bad = line.some(x => x.endsWith('REWRITTEN'));
  console.log(`${d}: ${line.join('; ')}: ${bad ? `a board the ${ROUND} migration rewrites is dealt: not this day` : 'clear'}`);
}
process.exit(clash ? 1 : 0);
