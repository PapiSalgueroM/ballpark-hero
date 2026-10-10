// Is a retaken board recording the committed one, apart from the stamp? node cmprec2.mjs <committed> <retaken>
// Exits 0 when everything but header.recordedFrom is byte equal, 1 otherwise. Prints what differs.
import { readFileSync } from 'node:fs';

const [a, b] = process.argv.slice(2).map(f => JSON.parse(readFileSync(f, 'utf8')));
const headerKeys = new Set([...Object.keys(a.header ?? {}), ...Object.keys(b.header ?? {})]);
const headerDiff = [...headerKeys].filter(k => JSON.stringify(a.header?.[k]) !== JSON.stringify(b.header?.[k]));
console.log(`header fields that differ: ${headerDiff.join(', ') || 'none'}`);
for (const k of headerDiff) console.log(`  ${k}: ${JSON.stringify(a.header?.[k])} -> ${JSON.stringify(b.header?.[k])}`);
let bad = headerDiff.filter(k => k !== 'recordedFrom').length;
const tops = new Set([...Object.keys(a), ...Object.keys(b)]);
for (const k of tops) {
  if (k === 'header') continue;
  if (k !== 'sports') { const same = JSON.stringify(a[k]) === JSON.stringify(b[k]); console.log(`${k}: ${same ? 'byte equal' : 'DIFFERS'}`); if (!same) bad += 1; continue; }
  const sports = new Set([...Object.keys(a.sports ?? {}), ...Object.keys(b.sports ?? {})]);
  for (const s of sports) {
    const same = JSON.stringify(a.sports?.[s]) === JSON.stringify(b.sports?.[s]);
    console.log(`sports/${s}: ${same ? 'byte equal' : 'DIFFERS'} (${JSON.stringify(a.sports?.[s] ?? null).length} bytes committed, ${JSON.stringify(b.sports?.[s] ?? null).length} retaken)`);
    if (!same) bad += 1;
  }
}
console.log(bad ? `cmprec2: ${bad} parts differ beyond the stamp` : 'cmprec2: the retaken recording is the committed one apart from header.recordedFrom');
process.exit(bad ? 1 : 0);
