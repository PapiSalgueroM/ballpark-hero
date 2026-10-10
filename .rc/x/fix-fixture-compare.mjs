/* Fixer's proof for finding 13 (never committed): the fixture taken again records its inputs and NOT ONE recorded game,
   digest, kept season or fleet number differs from the fixture it replaces. Usage: node fix-fixture-compare.mjs <old> <new> */
import fs from 'node:fs';

const [oldPath, newPath] = process.argv.slice(2);
const a = JSON.parse(fs.readFileSync(oldPath, 'utf8'));
const b = JSON.parse(fs.readFileSync(newPath, 'utf8'));
const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
const rows = [
  ['sets (digests, season counts and every kept season)', same(a.sets, b.sets)],
  ['fleet', same(a.fleet, b.fleet)],
  ['what', a.what === b.what],
  ['commit', a.commit === b.commit],
];
for (const [name, ok] of rows) console.log(`${ok ? 'SAME' : 'DIFFERS'}: ${name}`);
console.log(`keys before: ${Object.keys(a).join(', ')}`);
console.log(`keys after:  ${Object.keys(b).join(', ')}`);
console.log(`inputs recorded after: ${Object.keys(b.inputs ?? {}).length}`);
for (const [rel, hash] of Object.entries(b.inputs ?? {})) console.log(`  ${rel} ${String(hash).slice(0, 12)}`);
const sets = Object.keys(b.sets).map(k => `${k}:${b.sets[k].seasons}:${String(b.sets[k].digest).slice(0, 12)}`).join(' ');
console.log(`sets after: ${sets}`);
const bad = rows.filter(r => !r[1]).length;
console.log(`fix-fixture-compare: ${bad} of ${rows.length} parts differ`);
process.exit(bad ? 1 : 0);
