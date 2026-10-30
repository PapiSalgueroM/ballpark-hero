/* Review probe (never committed, runner only, repo root): the brief's R1 asks for the whole 2026 population to be
   proven as the proposal measured it (proposals-cm-veteran-ratings.md Part 2). Reads the engine's own world
   (eraRosters('now')) for the main squads file's clubs and prints the age band table, the veteran counts and the
   rows the read changes, beside the proposal's numbers. Exit 1 when a mean is off by more than 0.01 or a count
   differs. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const ROOT = process.cwd();
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'popprobe-'));
const out = path.join(TMP, 'e.cjs');
await build({
  stdin: { contents: "export * as eras from '@/lib/clubManagerEras'; export * as ro from '@/data/clubManagerRosters'; export * as cm from '@/lib/clubManager';", resolveDir: ROOT, loader: 'ts' },
  bundle: true, format: 'cjs', platform: 'node', outfile: out, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
});
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { eras, ro, cm } = createRequire(import.meta.url)(out);
await cm.ensureAllEraRosters();
const world = eras.eraRosters('now');
const rows = [];
for (const club of Object.keys(ro.CM_ROSTERS)) for (const b of world[club] ?? []) rows.push({ age: b.a, level: b.lv ?? b.r, shown: b.r, n: b.n });
console.log(`main file men in the engine's world: ${rows.length} (proposal 4,401)`);
const WANT = [[14, 20, 327, 74.63, 70.09], [21, 23, 924, 74.55, 72.70], [24, 29, 2322, 74.62, 74.62], [30, 32, 554, 72.93, 74.52], [33, 35, 230, 70.94, 74.66], [36, 99, 44, 68.64, 75.48]];
let bad = 0;
const mean = xs => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);
for (const [lo, hi, n, before, after] of WANT) {
  const band = rows.filter(r => r.age >= lo && r.age <= hi);
  const mb = mean(band.map(r => r.level)), ma = mean(band.map(r => r.shown));
  const ok = band.length === n && Math.abs(mb - before) <= 0.01 && Math.abs(ma - after) <= 0.01;
  if (!ok) bad += 1;
  console.log(`  ${lo} to ${hi}: ${band.length} men (want ${n}), level mean ${mb.toFixed(2)} (want ${before}), shown ${ma.toFixed(2)} (want ${after}) ${ok ? 'ok' : 'OFF'}`);
}
const vets = rows.filter(r => r.age >= 30);
const cnt = (xs, f) => xs.filter(f).length;
const top100 = [...rows].sort((a, b) => b.shown - a.shown || a.n.localeCompare(b.n)).slice(0, 100);
const lines = [
  ['veterans (30 plus)', vets.length, 828],
  ['veteran mean level', +mean(vets.map(r => r.level)).toFixed(2), 72.15],
  ['veteran mean shown', +mean(vets.map(r => r.shown)).toFixed(2), 74.61],
  ['veterans shown 75 plus', cnt(vets, r => r.shown >= 75), 394],
  ['veterans shown 80 plus', cnt(vets, r => r.shown >= 80), 118],
  ['veterans shown 85 plus', cnt(vets, r => r.shown >= 85), 17],
  ['veterans in the top 100 (ties by name)', cnt(top100, r => r.age >= 30), 7],
  ['nobody past 94', cnt(rows, r => r.shown > 94), 0],
];
for (const [what, got, want] of lines) { const ok = got === want; if (!ok) bad += 1; console.log(`  ${what}: ${got} (proposal ${want}) ${ok ? 'ok' : 'OFF'}`); }
console.log(`  rows the read changes: ${cnt(rows, r => r.shown !== r.level)} of ${rows.length} (Round 1214's notes: 2,078 on its ages)`);
console.log(`popProbe: ${bad} lines off the proposal`);
process.exit(bad ? 1 : 0);
