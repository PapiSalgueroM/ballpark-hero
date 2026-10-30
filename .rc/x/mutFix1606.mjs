// Round 1606 fixer: apply named mutations to the runner's checkout, refusing unless each anchor is there exactly
// once and the file changed. The request line restores the tree with git checkout in the same line.
import fs from 'node:fs';

const MUTS = {
  managedopen: ['src/lib/clubManager.ts', '  if ((state.careerStats?.clubsManaged ?? []).includes(club)) return null;\n', ''],
  partial: ['src/lib/clubManager.ts', 'const unsourced = state.season === 1 && years === 0 && !managedHere.has(club) && realDugoutPartial(', 'const unsourced = realDugoutPartial('],
  takeover: ['src/lib/clubManager.ts', 'const displacedReal = isRealChair(record[state.clubName]);', 'const displacedReal = false;'],
  offer: ['src/lib/clubManager.ts', 'const outReal = !!out && (', 'const outReal = false && ('],
  namesrow: ['src/data/clubManagerDugouts.ts', 'export const CM_DUGOUTS: RealDugoutTable = {};', "export const CM_DUGOUTS: RealDugoutTable = { now: { Arsenal: { name: 'Aaron Abara' } } };"],
  erasnojoin: ['src/lib/clubManagerEras.ts', 'for (const n of realDugoutNames(CM_DUGOUTS)) set.add(n);', '/* join dropped */'],
};
const names = process.argv.slice(2);
if (!names.length) { console.error('name at least one mutation'); process.exit(2); }
for (const name of names) {
  const m = MUTS[name];
  if (!m) { console.error(`unknown mutation ${name}`); process.exit(2); }
  const [file, from, to] = m;
  const text = fs.readFileSync(file, 'utf8');
  const count = text.split(from).length - 1;
  if (count !== 1) { console.error(`mutation ${name}: anchor found ${count} times in ${file}, refusing`); process.exit(2); }
  const out = text.replace(from, to);
  if (out === text) { console.error(`mutation ${name}: nothing changed, refusing`); process.exit(2); }
  fs.writeFileSync(file, out);
  console.log(`mutation ${name} applied to ${file}`);
}
