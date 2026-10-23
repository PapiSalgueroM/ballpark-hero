/**
 * Round 1532 (brief-1532 1.6): the writer the twelve frozen stadium histories never
 * had. scripts/data/allPlayersValueBaseline.json `cases[*].watchedHash` and
 * `awayHash` are what simAllPlayersValue `empty` and simTycoonSetPiece's ignored
 * offer check compare against; a round that changes the match on purpose (the
 * scoring law, the bonuses in seconds) moves them, and they are retaken BY THEIR
 * LEGS: the base tree must reproduce every committed hash first, then the head's
 * are printed, and only --write writes them.
 *
 * Each history is recomputed exactly as simAllPlayersValue's emptyIdentity does:
 * `steps` ticks of the case's initial state on its own seeded stream, the dt list
 * cycled, edge 0, every tick result hashed in order; and 40 away matchdays on a
 * fresh stream of the same seed, hashed.
 *
 *   node scripts/retakeTycoonHistories.mjs --root <base tree>   exit 0 only when that
 *        tree reproduces every committed hash (the leg that proves the recipe)
 *   node scripts/retakeTycoonHistories.mjs                       this tree: prints
 *        which of the twelve differ; exit 1 when any does
 *   node scripts/retakeTycoonHistories.mjs --write --note <why>  writes this tree's
 *        hashes into the cases (nothing else in the file) with the note
 * Its name does not start with sim, so runAllSims skips it.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = name => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : undefined; };
const TREE = path.resolve(arg('--root') ?? ROOT);
const WRITE = process.argv.includes('--write');
const FILE = path.join(ROOT, 'scripts/data/allPlayersValueBaseline.json');
const raw = fs.readFileSync(FILE, 'utf8');
const baseline = JSON.parse(raw);
if (baseline.cases.length !== 12) { console.error('the frozen corpus must hold twelve cases'); process.exit(2); }
const hash = text => createHash('sha256').update(text).digest('hex');
function rng(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'retake-histories-'));
const out = path.join(tmp, 'tycoon.mjs');
await build({ entryPoints: [path.join(TREE, 'src/lib/stadiumTycoon.ts')], outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'error', alias: { '@': path.join(TREE, 'src') } });
const T = await import(pathToFileURL(out).href);

const now = baseline.cases.map(row => {
  let s = structuredClone(row.initial);
  const roll = rng(row.seed);
  const sum = createHash('sha256');
  for (let i = 0; i < baseline.steps; i += 1) {
    const result = T.tick(s, baseline.dt[i % baseline.dt.length], roll, 0);
    s = result.state;
    sum.update(JSON.stringify(result));
  }
  return { seed: row.seed, watchedHash: sum.digest('hex'), awayHash: hash(JSON.stringify(T.playAwayMatchdays(structuredClone(row.initial), 40, rng(row.seed), 0))) };
});
fs.rmSync(tmp, { recursive: true, force: true });

let differ = 0;
for (const [i, row] of baseline.cases.entries()) {
  const w = now[i].watchedHash === row.watchedHash; const a = now[i].awayHash === row.awayHash;
  if (!w || !a) differ += 1;
  console.log(`  seed ${row.seed}: watched ${w ? 'same' : 'DIFFERS'}, away ${a ? 'same' : 'DIFFERS'}`);
}
console.log(`${TREE === ROOT ? 'this tree' : TREE}: ${12 - differ} of 12 histories reproduce the committed hashes, ${differ} differ`);
if (!WRITE) process.exit(differ ? 1 : 0);
if (TREE !== ROOT) { console.error('--write takes this tree only'); process.exit(2); }
const note = arg('--note');
if (!note) { console.error('--write needs --note saying the round, the base sha and why'); process.exit(2); }
/* Rewrite only the two hash strings of each case, in place, so nothing else in the
   file moves (not its key order, not its number formatting). */
let text = raw;
for (const [i, row] of baseline.cases.entries()) {
  for (const key of ['watchedHash', 'awayHash']) {
    const from = `"${key}": "${row[key]}"`; const alt = `"${key}":"${row[key]}"`;
    const use = text.includes(from) ? from : alt;
    if (text.split(use).length !== 2) { console.error(`case ${i} ${key} is not in the file exactly once`); process.exit(2); }
    text = text.replace(use, use.replace(row[key], now[i][key]));
  }
}
const eol = text.includes('\r\n') ? '\r\n' : '\n';
const indent = text.startsWith('{' + eol + '  ') ? 2 : text.startsWith('{' + eol + ' ') ? 1 : 0;
let rewritten;
if ('casesRetaken' in baseline) {
  const old = `"casesRetaken": ${JSON.stringify(baseline.casesRetaken)}`;
  if (text.split(old).length !== 2) { console.error('the casesRetaken note is not in the file exactly once'); process.exit(2); }
  rewritten = text.replace(old, () => `"casesRetaken": ${JSON.stringify(note)}`);
} else {
  rewritten = text.trimEnd().replace(/\}$/, () => `,${eol}${' '.repeat(indent)}"casesRetaken": ${JSON.stringify(note)}${eol}}`) + (text.endsWith(eol) ? eol : '');
}
if (JSON.parse(rewritten).casesRetaken !== note) { console.error('the rewritten file does not carry the note'); process.exit(2); }
fs.writeFileSync(FILE, rewritten);
if (process.env.RC_OUT) fs.copyFileSync(FILE, path.join(process.env.RC_OUT, 'allPlayersValueBaseline.json'));
console.log(`wrote the twelve histories of this tree into ${path.relative(ROOT, FILE)} (${differ} changed)`);
