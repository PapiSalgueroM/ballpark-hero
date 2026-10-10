/* Reviewer's differential test for Round 1221 (runner only, sent as an extra file).
   node .rc/x/review-run-diff.mjs <base root>     with the head checkout as cwd.
   Bundles src/lib/season/nfl.ts, season/core.ts and keyedRng.ts from BOTH trees and holds every exported
   function of the NFL number file to the same answer, the same number of draws and the same next draw,
   over inputs the builder's fleet never asks for. Independent of scripts/simUsSeasonCentre.mjs. */
import { build } from 'esbuild';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';

const BASE_ROOT = path.resolve(process.argv[2] ?? '');
const HEAD_ROOT = process.cwd();
const entry = [
  "export * as nfl from './src/lib/season/nfl.ts';",
  "export * as core from './src/lib/season/core.ts';",
  "export { keyedRng } from './src/lib/keyedRng.ts';",
].join('\n');
const mem = new Map();
globalThis.localStorage ??= { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: k => { mem.delete(k); }, clear: () => mem.clear() };
async function load(root, tag) {
  const out = path.join(os.tmpdir(), `rr-diff-${tag}-${process.pid}.mjs`);
  await build({
    stdin: { contents: entry, resolveDir: root, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out,
    absWorkingDir: root, logLevel: 'error', alias: { '@': './src' }, jsx: 'automatic',
    banner: { js: "import { createRequire as __rr } from 'node:module'; const require = __rr(import.meta.url);" },
  });
  return import(pathToFileURL(out).href);
}
const A = await load(BASE_ROOT, 'base');
const B = await load(HEAD_ROOT, 'head');

let checks = 0;
let diffs = 0;
const first = [];
const groups = {};
const js = v => { const s = JSON.stringify(v, (k, x) => (typeof x === 'number' && !Number.isFinite(x) ? `#${x}` : Object.is(x, -0) ? '#-0' : x === undefined ? '#undef' : typeof x === 'function' ? '#fn' : x)); return s === undefined ? '#undef' : s; };
function same(group, label, a, b) {
  checks += 1;
  groups[group] ??= { n: 0, bad: 0 };
  groups[group].n += 1;
  const ja = js(a); const jb = js(b);
  if (ja !== jb) { diffs += 1; groups[group].bad += 1; if (first.length < 25) first.push(`${group} ${label}: base ${ja.slice(0, 140)} | head ${jb.slice(0, 140)}`); }
}
/* the answer, how many draws it took, and the stream's next draw */
function run(M, key, fn) {
  const r = M.keyedRng(key);
  let n = 0;
  const rng = () => { n += 1; return r(); };
  let out;
  try { out = fn(rng); } catch (e) { out = `THROW ${String(e && e.message).slice(0, 80)}`; }
  return [out, n, r()];
}
const both = (group, label, key, fn) => same(group, label, run(A, key, rng => fn(A, rng)), run(B, key, rng => fn(B, rng)));

/* 1. the names */
same('names', 'season/nfl exports', Object.keys(A.nfl).sort(), Object.keys(B.nfl).sort());
same('names', 'season/core exports', Object.keys(A.core).sort(), Object.keys(B.core).sort());
same('names', 'NFL_SEASON keys and kinds', Object.entries(A.nfl.NFL_SEASON).map(([k, v]) => [k, typeof v]), Object.entries(B.nfl.NFL_SEASON).map(([k, v]) => [k, typeof v]));
same('names', 'NFL_SEASON.view keys and kinds', Object.entries(A.nfl.NFL_SEASON.view).map(([k, v]) => [k, typeof v]), Object.entries(B.nfl.NFL_SEASON.view).map(([k, v]) => [k, typeof v]));
same('names', 'NFL_SEASON data (functions left out)', JSON.parse(JSON.stringify(A.nfl.NFL_SEASON)), JSON.parse(JSON.stringify(B.nfl.NFL_SEASON)));

/* 2. the score, through the export and through the bind */
for (let e2 = -80; e2 <= 80; e2 += 1) for (const home of [true, false]) for (let k = 0; k < 60; k += 1) {
  const edge = e2 / 2;
  both('nflScore', `edge ${edge} home ${home} key ${k}`, `s|${e2}|${home}|${k}`, (M, rng) => M.nfl.nflScore(edge, home, rng));
  if (k < 12) both('bind.score', `edge ${edge} home ${home} key ${k}`, `b|${e2}|${home}|${k}`, (M, rng) => M.nfl.NFL_SEASON.score(edge, home, rng, undefined));
}
for (const edge of [NaN, Infinity, -Infinity, 1e9, -1e9, 0.1234567, -33.3]) for (const home of [true, false]) both('nflScore', `odd edge ${edge}`, `so|${edge}|${home}`, (M, rng) => M.nfl.nflScore(edge, home, rng));

/* 3. the scale */
for (let i = -400; i <= 2400; i += 1) same('strengthFor', `share ${i / 2000}`, A.nfl.NFL_SEASON.strengthFor(i / 2000), B.nfl.NFL_SEASON.strengthFor(i / 2000));
for (const v of [NaN, Infinity, -Infinity, 0, 1, 0.02, 0.98, 0.5]) same('strengthFor', `share ${v}`, A.nfl.NFL_SEASON.strengthFor(v), B.nfl.NFL_SEASON.strengthFor(v));

/* 4. the drive lists and their cost */
const POINTS = [-1, 3.5, NaN, ...Array.from({ length: 81 }, (_, i) => i)];
const FGS = [null, 0, 1, 2, 3, 4, 5, 6, 7];
for (const points of POINTS) for (let minTd = -1; minTd <= 10; minTd += 1) for (const fg of FGS) {
  same('nflDriveCost', `${points} ${minTd} ${fg}`, A.nfl.nflDriveCost(points, minTd, fg), B.nfl.nflDriveCost(points, minTd, fg));
  for (let k = 0; k < 5; k += 1) both('nflDrives', `${points} ${minTd} ${fg} key ${k}`, `d|${points}|${minTd}|${fg}|${k}`, (M, rng) => M.nfl.nflDrives(points, minTd, fg, rng));
}

/* 5. the clock: the label, and the object the viewer is handed */
for (let q = -12; q <= 260; q += 1) same('clock', `label ${q / 4}`, A.nfl.nflClockLabel(q / 4), B.nfl.nflClockLabel(q / 4));
for (const v of [NaN, Infinity, -Infinity]) same('clock', `label ${v}`, A.nfl.nflClockLabel(v), B.nfl.nflClockLabel(v));
same('clock', 'view.clock data', { ...A.nfl.NFL_SEASON.view.clock }, { ...B.nfl.NFL_SEASON.view.clock });
same('clock', 'view.clock key order', Object.keys(A.nfl.NFL_SEASON.view.clock), Object.keys(B.nfl.NFL_SEASON.view.clock));
for (let q = -4; q <= 250; q += 1) same('clock', `view.clock.label ${q / 4}`, A.nfl.NFL_SEASON.view.clock.label(q / 4), B.nfl.NFL_SEASON.view.clock.label(q / 4));

/* 6. the words */
const KINDS = ['td', 'fg', 'safety', 'td-pass', 'td-rush', 'td-rec', 'miss', 'int', 'sack', 'pick', 'ff', 'hot', 'goal', ''];
const PTS = [undefined, 0, 1, 2, 3, 6, 7, 8, 9];
const POS = ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K', '', 'P'];
for (const kind of KINDS) for (const side of ['us', 'them']) for (const pts of PTS) for (const mine of [undefined, true, false]) {
  const e = { min: 12, kind, side, ...(pts === undefined ? {} : { pts }), ...(mine === undefined ? {} : { mine }) };
  same('words', `default ${js(e)}`, A.nfl.nflEventWords(e, 'Kansas City Chiefs', 'Buffalo Bills'), B.nfl.nflEventWords(e, 'Kansas City Chiefs', 'Buffalo Bills'));
  for (const kicker of [false, true]) same('words', `kicker ${kicker} ${js(e)}`, A.nfl.nflEventWords(e, 'Chiefs', 'Bills', kicker), B.nfl.nflEventWords(e, 'Chiefs', 'Bills', kicker));
  for (const pos of POS) same('view.eventWords', `${pos} ${js(e)}`, A.nfl.NFL_SEASON.view.eventWords(e, 'Chiefs', 'Bills', pos), B.nfl.NFL_SEASON.view.eventWords(e, 'Chiefs', 'Bills', pos));
}
for (const [named, opp] of [[true, 'Bills'], [true, undefined], [false, undefined], [false, 'Bills']]) same('words', `help ${named} ${opp}`, A.nfl.NFL_SEASON.view.help(named, opp), B.nfl.NFL_SEASON.view.help(named, opp));

/* 7. the shuffle, from the core */
for (let n = 0; n <= 70; n += 1) for (let k = 0; k < 30; k += 1) both('shuffled', `n ${n} key ${k}`, `sh|${n}|${k}`, (M, rng) => M.core.shuffled(Array.from({ length: n }, (_, i) => i), rng));

/* 8. the other exported helpers of the number file, on keyed inputs (a throw must be the same throw) */
for (let k = 0; k < 4000; k += 1) {
  const g = A.keyedRng(`in|${k}`);
  const n = 1 + Math.floor(g() * 17);
  const scores = Array.from({ length: n }, () => Math.floor(g() * 46));
  const made = Math.floor(g() * 41);
  const tds = Array.from({ length: n }, () => Math.floor(g() * 5));
  both('nflKickerMakes', `case ${k}`, `km|${k}`, (M, rng) => M.nfl.nflKickerMakes(scores, made, rng));
  both('nflTouchdownDays', `case ${k}`, `td|${k}`, (M, rng) => M.nfl.nflTouchdownDays(scores, tds, rng));
  both('nflDealUnnamed', `case ${k}`, `du|${k}`, (M, rng) => M.nfl.nflDealUnnamed(n, rng));
  const list = Array.from({ length: n }, () => [Math.floor(g() * 32), g() < 0.5]);
  same('nflOrderProblems', `case ${k}`, A.nfl.nflOrderProblems(list), B.nfl.nflOrderProblems(list));
}

for (const [g, v] of Object.entries(groups)) console.log(`${v.bad ? 'FAIL' : 'ok  '} ${g}: ${v.n} comparisons, ${v.bad} differ`);
for (const f of first) console.log(`  DIFF ${f}`);
console.log(`review-run-diff: base ${BASE_ROOT} against head ${HEAD_ROOT}: ${checks} comparisons, ${diffs} differ`);
process.exit(diffs ? 1 : 0);
