/* Reviewer's shared helpers for Round 1227 (runner only). ROOT is the repo root the request runs from. */
import { build } from 'esbuild';
import { execSync } from 'node:child_process';
import { readFileSync, unlinkSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const ROOT = process.cwd();
const norm = s => s.replace(/\r\n/g, '\n');
const ENTRY = [
  "export { NFL_CAREER_SPORT } from './src/lib/nflCareerSport.ts';",
  "export { NBA_CAREER_SPORT } from './src/lib/nbaCareerSport.ts';",
  "export { MLB_CAREER_SPORT } from './src/lib/mlbCareerSport.ts';",
  "export { NHL_CAREER_SPORT } from './src/lib/nhlCareerSport.ts';",
  "export * as nfl from './src/lib/nflMyCareer.ts';",
  "export * as awards from './src/lib/careerAwards.ts';",
  "export * as lines from './src/lib/usCareerStatLine.ts';",
  "export * as drive from './src/test/helpers/usCareerDrive.ts';",
  "export { applyFaSigning } from './src/lib/usCareerFreeAgency.ts';",
  "export { answerSummerCard, startSummer } from './src/lib/usCareerSummer.ts';",
].join('\n');
const BUNDLE = {
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
};
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };

/** The engines of the tree as it stands on disk. */
export async function bundleHead(tag = 'head') {
  const out = path.join(os.tmpdir(), `rv-${process.pid}-${tag}.mjs`);
  await build({ ...BUNDLE, outfile: out });
  const mod = await import(pathToFileURL(out).href);
  try { unlinkSync(out); } catch { /* fine */ }
  return mod;
}
/** The engines with every src file that differs from `commit` read at that commit. */
export async function bundleAt(commit, tag = 'base') {
  const changed = execSync(`git diff --name-only ${commit} -- src`, { cwd: ROOT }).toString().split('\n').map(x => x.trim()).filter(Boolean);
  const served = new Set();
  const plugin = { name: 'rv-before', setup(b) {
    b.onLoad({ filter: /[.]tsx?$/ }, args => {
      const rel = path.relative(ROOT, args.path).replace(/\\/g, '/');
      if (!changed.includes(rel)) return undefined;
      let contents;
      try { contents = execSync(`git show ${commit}:${rel}`, { cwd: ROOT, maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }).toString(); } catch { return undefined; }
      served.add(rel);
      return { contents: norm(contents), loader: rel.endsWith('x') ? 'tsx' : 'ts' };
    });
  } };
  const out = path.join(os.tmpdir(), `rv-${process.pid}-${tag}.mjs`);
  await build({ ...BUNDLE, outfile: out, plugins: [plugin] });
  const mod = await import(pathToFileURL(out).href);
  try { unlinkSync(out); } catch { /* fine */ }
  return { mod, changed, served: [...served] };
}

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Run `fn` with Math.random replaced by a seeded stream, and put it back. */
export function seeded(seed, fn) {
  const keep = Math.random; const rnd = mulberry32(seed); Math.random = rnd;
  try { return fn(rnd); } finally { Math.random = keep; }
}
export const clone = x => JSON.parse(JSON.stringify(x));

/* The printed shape of a season line by NFL position, typed from src/lib/usCareerStatLine.ts (nflStatLine),
   and the season score of those parts typed from src/lib/careerAwards.ts (nflSeasonScore), a back's catches at
   8 yards. Typed here, never imported, so a wrong picker or printer cannot agree with itself. */
const N = String.raw`\d{1,3}(?:,\d{3})*`;
const H = String.raw`\d{1,3}(?:\.5)?`;
export const POS = ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K'];
export const ONE_PLACE = ['QB', 'RB', 'TE', 'K'];
const SHAPE = {
  QB: `(${N}) yds, (${N}) TD, (${N}) INT`,
  RB: `(${N}) rush yds, (${N}) TD, (${N}) rec`,
  WR: `(${N}) rec, (${N}) yds, (${N}) TD`,
  TE: `(${N}) rec, (${N}) yds, (${N}) TD`,
  LB: `(${N}) tackles?, (${H}) sacks?, (${N}) INT`,
  CB: `(${N}) INT, (${N}) pass(?:es)? defended, (${N}) tackles?`,
  EDGE: `(${H}) sacks?, (${N}) tackles?, (${N}) forced fumbles?`,
  K: `(${N}) of ${N} FG, long of (${N})`,
};
const SCORE = {
  QB: v => v[0] / 48 + v[1] * 2.4 - v[2],
  RB: v => (v[0] + v[2] * 8) / 16 + v[1] * 3,
  WR: v => v[1] / 14 + v[2] * 3,
  TE: v => v[1] / 14 + v[2] * 3 + 12,
  LB: v => v[0] / 1.15 + v[1] * 5 + v[2] * 9,
  CB: v => v[0] * 15 + v[1] * 3.2 + v[2] / 2,
  EDGE: v => v[0] * 8.5 + v[1] / 1.6 + v[2] * 6,
  K: v => v[0] * 3.4 + (v[1] - 45) * 1.6,
};
export const shapeOf = pos => new RegExp(`^${SHAPE[pos]}$`);
export const numbersOf = (pos, text) => { const m = shapeOf(pos).exec(text ?? ''); return m ? m.slice(1).map(x => Number(x.replace(/,/g, ''))) : null; };
export const printedScore = (pos, text) => { const v = numbersOf(pos, text); return v ? SCORE[pos](v) : null; };
export const readText = rel => norm(readFileSync(path.join(ROOT, rel), 'utf8'));
