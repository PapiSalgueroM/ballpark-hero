/**
 * Round 1045: one scoring law (DESIGN 1045 section 9.4).
 *
 * src/lib/season/law.ts restates Club Manager's scoring law so the Season
 * Centre never pulls clubManager.ts into /soccer-career. A restatement is a
 * copy, and a copy drifts, so this harness holds the two together:
 *
 *  1. Constants. clubManager.ts, read with its comments and strings stripped
 *     (a guard reads code, never prose), must still score with
 *     clamp(1.25 + edge * 0.055 + boost, 0.12, 4.2) in simScore, cap its
 *     Poisson at 7, and give simAiMatch's home and away sides 0.2 and -0.08.
 *     law.ts's LAW must carry the same seven numbers.
 *  2. Behaviour. clubManager.ts's own `poisson` body (cut from the file,
 *     Math.random swapped for a counted generator) and law.ts's poissonDraw
 *     (bundled from the file) are fed the same stream over 10,000 lambdas
 *     spread over the law's whole range: the same goals, the same number of
 *     draws, every time. goalLambda against the clamp formula over 2,000
 *     edges and both venues: equal to 1e-12.
 *
 * Control SEASON_LAW_CONTROL=perpoint rewrites 0.055 in law.ts as it is
 * bundled (the file on disk is never written; the control refuses to run if
 * the needle is missing) and must turn sections 1 and 2 red.
 *
 * Green is the closing "simSeasonLaw: N checks, 0 failed" line and exit 0.
 *
 * Measured 2026-10-07: 14 checks, 0 failed, exit 0; the control fails 2
 * (LAW.perPoint and goalLambda), exit 1.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const require = createRequire(path.join(ROOT, 'package.json'));
const esbuild = require('esbuild');
const CONTROL = process.env.SEASON_LAW_CONTROL ?? '';
if (CONTROL && CONTROL !== 'perpoint') throw new Error(`unknown SEASON_LAW_CONTROL ${CONTROL}`);

let checks = 0, failed = 0;
const check = (ok, label) => { checks += 1; if (!ok) { failed += 1; console.log(`FAIL ${label}`); } else console.log(`ok   ${label}`); };

/** Comments and string contents removed, line breaks kept. */
function stripCode(src) {
  let out = '';
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { while (i < src.length && src[i] !== '\n') i += 1; out += '\n'; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') out += '\n'; i += 1; } i += 1; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; out += q; i += 1;
      while (i < src.length && src[i] !== q) { if (src[i] === '\\') i += 1; i += 1; }
      out += q; continue;
    }
    out += c;
  }
  return out;
}

const cmSrc = stripCode(fs.readFileSync(path.join(ROOT, 'src/lib/clubManager.ts'), 'utf8'));
let lawSrc = fs.readFileSync(path.join(ROOT, 'src/lib/season/law.ts'), 'utf8');
if (CONTROL === 'perpoint') {
  if (!lawSrc.includes('perPoint: 0.055,')) throw new Error('control refused: law.ts has no "perPoint: 0.055,"');
  lawSrc = lawSrc.replace('perPoint: 0.055,', 'perPoint: 0.056,');
  console.log('CONTROL perpoint: law.ts perPoint rewritten to 0.056 in the bundle only');
}
const lawCode = stripCode(lawSrc);

/* ─── 1. Constants ─── */
const fnBody = (src, name) => {
  const at = src.indexOf(`function ${name}(`);
  if (at < 0) return null;
  let depth = 0, i = src.indexOf('{', at);
  const start = i;
  for (; i < src.length; i += 1) { if (src[i] === '{') depth += 1; else if (src[i] === '}') { depth -= 1; if (depth === 0) break; } }
  return src.slice(start, i + 1);
};
const simScore = fnBody(cmSrc, 'simScore');
const poissonCm = fnBody(cmSrc, 'poisson');
const aiMatch = fnBody(cmSrc, 'simAiMatch');
check(!!simScore && /clamp\(1\.25 \+ \(sA - sB\) \* 0\.055 \+ boostA, 0\.12, 4\.2\)/.test(simScore), 'clubManager simScore scores with clamp(1.25 + edge * 0.055 + boost, 0.12, 4.2)');
check(!!poissonCm && /Math\.min\(k - 1, 7\)/.test(poissonCm) && /p \*= Math\.random\(\)/.test(poissonCm), 'clubManager poisson is the Knuth loop capped at 7');
check(!!aiMatch && /0\.2, -0\.08/.test(aiMatch), 'clubManager simAiMatch gives home 0.2 and away -0.08');
const lawNums = {};
for (const k of ['base', 'perPoint', 'min', 'max', 'cap', 'home', 'away']) {
  const m = lawCode.match(new RegExp(`${k}: (-?[0-9.]+),`));
  lawNums[k] = m ? Number(m[1]) : NaN;
}
const want = { base: 1.25, perPoint: 0.055, min: 0.12, max: 4.2, cap: 7, home: 0.2, away: -0.08 };
for (const [k, v] of Object.entries(want)) check(lawNums[k] === v, `law.ts LAW.${k} is ${v} (read ${lawNums[k]})`);
check(!/\bimport\b/.test(lawCode), 'law.ts imports nothing');

/* ─── 2. Behaviour ─── */
const built = esbuild.transformSync(lawSrc, { loader: 'ts', format: 'cjs' }).code;
const mod = { exports: {} };
new Function('module', 'exports', built)(mod, mod.exports);
const { goalLambda, poissonDraw, LAW } = mod.exports;
const counted = seed => { let a = seed >>> 0, n = 0; const f = () => { n += 1; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; f.count = () => n; return f; };
let same = 0, sameCalls = 0;
const N = 10000;
for (let i = 0; i < N; i += 1) {
  const lambda = 0.12 + (4.2 - 0.12) * (i / (N - 1));
  const g1 = counted(i * 2654435761);
  const g2 = counted(i * 2654435761);
  const fakeMath = Object.assign(Object.create(Math), { random: g1 });
  const cm = new Function('Math', `return function poisson(lambda) ${poissonCm}`)(fakeMath)(lambda);
  const mine = poissonDraw(lambda, g2);
  if (cm === mine) same += 1;
  if (g1.count() === g2.count()) sameCalls += 1;
}
check(same === N, `poissonDraw equals clubManager's poisson on ${same} of ${N} lambdas`);
check(sameCalls === N, `the same number of draws on ${sameCalls} of ${N}`);
const clampCm = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
let lam = 0;
for (let i = 0; i < 2000; i += 1) {
  const edge = -40 + (80 * i) / 1999;
  for (const [venue, boost] of [[LAW.home, 0.2], [LAW.away, -0.08]]) {
    if (Math.abs(goalLambda(edge, venue) - clampCm(1.25 + edge * 0.055 + boost, 0.12, 4.2)) < 1e-12) lam += 1;
  }
}
check(lam === 4000, `goalLambda equals the clamp formula on ${lam} of 4000 edges and venues`);

console.log(`simSeasonLaw: ${checks} checks, ${failed} failed${CONTROL ? ` (control ${CONTROL})` : ''}`);
process.exit(failed ? 1 : 0);
