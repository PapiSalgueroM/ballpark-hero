// Probe: how close do the baseball share verdicts sit to shareVerdict's 30 and 10 percent lines?
// Light: bundles the data file, judges every tile against every share judged group on its board.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.argv[2];
const OUT = process.argv[3];
const R = ROOT.replaceAll('\\', '/');
const src = fs.readFileSync(path.join(ROOT, 'scripts/lib/usConnectionsCheck.mjs'), 'utf8');
const needle = 'function shareVerdict(share) {';
if (!src.includes(needle)) { console.error('needle missing'); process.exit(2); }
fs.writeFileSync(path.join(OUT, 'usc.mjs'), src.replace(needle, needle + ' (globalThis.__S ??= []).push(share);'));
const { makeUsChecker } = await import(pathToFileURL(path.join(OUT, 'usc.mjs')).href);

fs.writeFileSync(path.join(OUT, 'entry.mjs'), `export const baseball = (await import('${R}/src/data/baseballConnectionsPuzzles.ts')).baseballConnectionsPuzzles;\n`);
await build({ entryPoints: [path.join(OUT, 'entry.mjs')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(OUT, 'bundle.mjs'), logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const { baseball } = await import(pathToFileURL(path.join(OUT, 'bundle.mjs')).href);

// makeUsChecker reads scripts/data relative to ROOT
const { checker } = makeUsChecker(ROOT, 'baseball');
const rows = [];
for (const b of baseball) {
  const tiles = b.groups.flatMap(g => g.players);
  for (const g of b.groups) {
    const label = g.category ?? g.theme;
    const crit = checker.criterion(label);
    if (!crit) continue;
    for (const name of tiles) {
      globalThis.__S = [];
      const v = checker.fits(name, crit);
      if (!globalThis.__S.length) continue;
      const share = globalThis.__S[globalThis.__S.length - 1];
      if (share === null) continue;
      rows.push({ id: b.id, label, name, member: g.players.includes(name), share, v });
    }
  }
}
const pct = x => (100 * x).toFixed(1);
const mem = rows.filter(r => r.member), oth = rows.filter(r => !r.member);
console.log(`share judged pairs: ${rows.length} (members ${mem.length}, other tiles ${oth.length})`);
console.log(`groups judged by share: ${new Set(rows.map(r => r.id + '|' + r.label)).size}`);
const sortBy = (a, f) => [...a].sort((x, y) => f(x) - f(y));
console.log('members, lowest shares:');
for (const r of sortBy(mem, r => r.share).slice(0, 8)) console.log(`  ${pct(r.share)}%  v=${r.v}  ${r.id} "${r.label}" <- ${r.name}`);
console.log('other tiles, highest shares:');
for (const r of sortBy(oth, r => -r.share).slice(0, 12)) console.log(`  ${pct(r.share)}%  v=${r.v}  ${r.id} "${r.label}" <- ${r.name}`);
const below = sortBy(oth.filter(r => r.share < 0.1), r => -r.share);
console.log(`other tiles under 10 percent: ${below.length}; highest:`);
for (const r of below.slice(0, 5)) console.log(`  ${pct(r.share)}%  v=${r.v}  ${r.id} "${r.label}" <- ${r.name}`);
console.log(`other tiles in [5, 10): ${oth.filter(r => r.share >= 0.05 && r.share < 0.1).length}; in [10, 15): ${oth.filter(r => r.share >= 0.1 && r.share < 0.15).length}; in [10, 30): ${oth.filter(r => r.share >= 0.1 && r.share < 0.3).length}`);
console.log(`members in [30, 35): ${mem.filter(r => r.share >= 0.3 && r.share < 0.35).length}; under 30: ${mem.filter(r => r.share < 0.3).length}; under 10: ${mem.filter(r => r.share < 0.1).length}`);
const verdict = (s, hi, lo) => (s >= hi ? true : s < lo ? false : null);
for (const [hi, lo] of [[0.3, 0.1], [0.25, 0.1], [0.35, 0.1], [0.4, 0.1], [0.5, 0.1], [0.3, 0.05], [0.3, 0.15], [0.3, 0.2]]) {
  let memNotTrue = 0, memFalse = 0, othTrue = 0, othUnknown = 0;
  for (const r of mem) { const v = verdict(r.share, hi, lo); if (v !== true) memNotTrue += 1; if (v === false) memFalse += 1; }
  for (const r of oth) { const v = verdict(r.share, hi, lo); if (v === true) othTrue += 1; if (v === null) othUnknown += 1; }
  console.log(`lines ${pct(hi)} / ${pct(lo)}: members not fitting ${memNotTrue} (refuted ${memFalse}); other tiles fitting ${othTrue}, unknown ${othUnknown}`);
}
