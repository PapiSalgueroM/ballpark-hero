/* Reviewer cm, Release AV: does a league phase draw hold every constraint, over N draws (default 2000)?
 * usage: node .rc/x/cmUclProbe.mjs [draws]
 * The constraints are counted here from the saved slate alone (clubs and fx), never from the library's own
 * cost function: 36 clubs, 144 matches, eight a club against eight different clubs, four at home, two from
 * every pot (one home, one away), one match a club a matchday, nobody of its own association, nobody more
 * than two of another. Fields: 36 clubs over associations sized like recent real fields. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const N = Number(process.argv[2] || 2000);
const ROOT = process.cwd();
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'rv-cm-ucl-'));
const entry = path.join(TMP, 'entry.mjs');
const P = f => JSON.stringify(path.join(ROOT, f).replaceAll('\\', '/'));
fs.writeFileSync(entry, `export * as ucl from ${P('src/lib/uclLeaguePhase.ts')};\nexport * as slate from ${P('src/lib/leagueSlate.ts')};\n`);
const out = path.join(TMP, 'ucl.bundle.mjs');
await build({ entryPoints: [entry], outfile: out, bundle: true, format: 'esm', platform: 'node', logLevel: 'error', absWorkingDir: ROOT, alias: { '@': path.join(ROOT, 'src') } });
const { ucl, slate: lib } = await import(pathToFileURL(out).href);

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/* association sizes, each sums to 36 */
const TEMPLATES = [
  [6, 5, 4, 4, 3, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1],
  [5, 5, 4, 4, 4, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1],
  [4, 4, 4, 4, 3, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1],
  [4, 4, 4, 4, 4, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];
TEMPLATES.forEach((t, i) => { if (t.reduce((a, b) => a + b, 0) !== 36) { console.error(`template ${i} is not 36`); process.exit(2); } });

const bad = []; const note = (seed, why) => { if (bad.length < 12) bad.push(`seed ${seed}: ${why}`); };
let legal = 0, fallback = 0, broke = 0, over = 0, costMismatch = 0, shapeBad = 0, nulls = 0, floorAbove = 0, nondet = 0, aboveFloor = 0;
const byTemplate = TEMPLATES.map(() => ({ n: 0, legal: 0, fallback: 0, breaks: 0, overCap: 0 }));
for (let k = 0; k < N; k += 1) {
  const seed = (0x1228 + k * 7919) >>> 0; const r = rng(seed ^ 0x5bd1e995);
  const ti = k % TEMPLATES.length; const sizes = TEMPLATES[ti];
  const field = []; const assoc = new Map(); const strength = new Map();
  sizes.forEach((n, a) => { for (let i = 0; i < n; i += 1) { const name = `Club ${String.fromCharCode(65 + a)}${i + 1}`; field.push(name); assoc.set(name, `A${a}`); /* big associations lean strong, as in the real pots */ strength.set(name, Math.round(60 + r() * 30 + (n >= 4 ? 4 : 0))); } });
  const holder = k % 3 === 0 ? field[Math.floor(r() * 36)] : null;
  const input = { field, holder, seed, strengthOf: c => strength.get(c), assocOf: c => assoc.get(c) };
  const s = ucl.drawUclLeaguePhase(input);
  const T = byTemplate[ti]; T.n += 1;
  if (!s) { nulls += 1; note(seed, 'null slate'); continue; }
  let ok = true; const why = [];
  if (s.clubs.length !== 36 || new Set(s.clubs).size !== 36 || s.clubs.some(c => !assoc.has(c))) { ok = false; why.push('clubs are not the 36'); }
  if (holder && s.clubs[0] !== holder) { ok = false; why.push('holder is not first of pot one'); }
  for (let p = 0; p < 3 && ok; p += 1) { /* pot p is never weaker than pot p+1, the holder aside */
    const lo = Math.min(...s.clubs.slice(p * 9, p * 9 + 9).filter(c => c !== holder).map(c => strength.get(c)));
    const hi = Math.max(...s.clubs.slice(p * 9 + 9, p * 9 + 18).map(c => strength.get(c)));
    if (lo < hi) { ok = false; why.push(`pot ${p + 1} holds a weaker club than pot ${p + 2}`); }
  }
  if (s.fx.length !== 144 || s.fx.some((c, i) => i > 0 && c <= s.fx[i - 1])) { ok = false; why.push(`fx ${s.fx.length}, or not rising`); }
  const home = Array(36).fill(0), away = Array(36).fill(0); const opp = Array.from({ length: 36 }, () => new Set());
  const potH = Array.from({ length: 36 }, () => [0, 0, 0, 0]), potA = Array.from({ length: 36 }, () => [0, 0, 0, 0]);
  const dayCount = Array.from({ length: 8 }, () => Array(36).fill(0)); const perDay = Array(8).fill(0);
  let myBreaks = 0; const seen = Array.from({ length: 36 }, () => new Map());
  for (const code of s.fx) {
    const d = Math.floor(code / 1296), h = Math.floor(code / 36) % 36, a = code % 36;
    if (d < 0 || d > 7 || h === a) { ok = false; why.push('a code out of shape'); continue; }
    home[h] += 1; away[a] += 1; opp[h].add(a); opp[a].add(h); potH[h][Math.floor(a / 9)] += 1; potA[a][Math.floor(h / 9)] += 1;
    dayCount[d][h] += 1; dayCount[d][a] += 1; perDay[d] += 1;
    const ah = assoc.get(s.clubs[h]), aa = assoc.get(s.clubs[a]);
    if (ah === aa) myBreaks += 1;
    else { seen[h].set(aa, (seen[h].get(aa) ?? 0) + 1); seen[a].set(ah, (seen[a].get(ah) ?? 0) + 1); }
  }
  let myOver = 0;
  for (let c = 0; c < 36; c += 1) {
    if (home[c] !== 4 || away[c] !== 4) { ok = false; why.push(`club ${c} home ${home[c]} away ${away[c]}`); }
    if (opp[c].size !== 8) { ok = false; why.push(`club ${c} meets ${opp[c].size} different clubs`); }
    if (potH[c].some(x => x !== 1) || potA[c].some(x => x !== 1)) { ok = false; why.push(`club ${c} pots home ${potH[c]} away ${potA[c]}`); }
    for (const n of seen[c].values()) myOver += Math.max(0, n - 2);
  }
  for (let d = 0; d < 8; d += 1) if (perDay[d] !== 18 || dayCount[d].some(x => x !== 1)) { ok = false; why.push(`matchday ${d} is not 18 matches, one a club`); }
  if (!ok) { shapeBad += 1; note(seed, why.slice(0, 3).join('; ')); }
  if (myBreaks !== s.breaks || myOver !== s.overCap) { costMismatch += 1; note(seed, `the slate says breaks ${s.breaks} overCap ${s.overCap}, counted ${myBreaks} and ${myOver}`); }
  const spec = { pots: [0, 1, 2, 3].map(p => Array.from({ length: 9 }, (_, i) => p * 9 + i)), assoc: s.clubs.map(c => Number(assoc.get(c).slice(1))), cap: 2 };
  const floor = lib.slateFloor(spec);
  if (floor.breaks > 0 || floor.overCap > 0) floorAbove += 1;
  if (myBreaks > floor.breaks || myOver > floor.overCap) { aboveFloor += 1; note(seed, `template ${ti}: breaks ${myBreaks} overCap ${myOver} over the counting floor ${floor.breaks}/${floor.overCap}${s.fallback ? ' (fallback)' : ''}`); }
  if (s.fallback) { fallback += 1; T.fallback += 1; }
  if (myBreaks > 0) { broke += 1; T.breaks += 1; }
  if (myOver > 0) { over += 1; T.overCap += 1; }
  if (ok && myBreaks === 0 && myOver === 0 && !s.fallback) { legal += 1; T.legal += 1; }
  if (k % 20 === 0 && JSON.stringify(ucl.drawUclLeaguePhase(input)) !== JSON.stringify(s)) { nondet += 1; note(seed, 'the same seed gave another slate'); }
}
byTemplate.forEach((t, i) => console.log(`template ${i} [${TEMPLATES[i].join(' ')}]: ${t.n} draws, ${t.legal} inside both rules, ${t.breaks} with a same association match, ${t.overCap} over the cap, ${t.fallback} fallback`));
if (bad.length) console.log(bad.map(b => `  ${b}`).join('\n'));
console.log(`fields whose counting floor is above zero: ${floorAbove}; draws above their counting floor: ${aboveFloor}; null ${nulls}; shape failures ${shapeBad}; cost mismatches ${costMismatch}; not the same slate twice ${nondet}`);
const hard = nulls + shapeBad + costMismatch + nondet;
const ok = hard === 0 && aboveFloor === 0;
console.log(`cmUclProbe: ${ok ? 'GREEN' : hard === 0 ? 'SOFT RED (rules relaxed above the floor)' : 'RED'}. ${N} draws: ${legal} inside both rules with no fallback, ${broke} with a same association match, ${over} over the cap, ${fallback} fallback.`);
process.exit(ok ? 0 : 1);
