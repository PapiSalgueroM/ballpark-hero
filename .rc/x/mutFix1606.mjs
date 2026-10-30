// Round 1606 fixer: apply one named mutation to the runner's checkout, refusing unless its anchor is there exactly
// once and the file changed. The request line restores the tree with git checkout in the same line.
import fs from 'node:fs';

const MUTS = {
  managedopen: ['src/lib/clubManager.ts', '  if ((state.careerStats?.clubsManaged ?? []).includes(club)) return null;\n', ''],
  partial: ['src/lib/clubManager.ts', '...(opening && realDugoutPartial(CM_DUGOUTS_PARTIAL, era, club)', '...(realDugoutPartial(CM_DUGOUTS_PARTIAL, era, club)'],
  namesjoinonly: ['scripts/simInventedNames.mjs', '&& !dugoutCovered.has(n)', ''],
};
const name = process.argv[2];
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
