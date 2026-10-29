/* Reviewer mutations for Round 1571. node .rc/x/mut.mjs <id>; exits 2 when the anchor is missing. */
import fs from 'node:fs';

const MOD = 'src/lib/clubCareerAdditions.ts';
const LIB = 'src/lib/playerBingo.ts';
const id = process.argv[2];
const swap = (file, from, to) => {
  const src = fs.readFileSync(file, 'utf8');
  if (!src.includes(from)) { console.error(`mut ${id}: anchor not in ${file}: ${from}`); process.exit(2); }
  fs.writeFileSync(file, src.replace(from, to));
  console.log(`mut ${id}: ${file} edited`);
};
const M = {
  strictby: () => swap(MOD, 'return born >= a.by && born <= a.by + 1;', 'return born >= a.by && born <= a.by;'),
  loosenby: () => swap(MOD, 'return born >= a.by && born <= a.by + 1;', 'return born >= a.by - 1 && born <= a.by + 2;'),
  norole: () => swap(MOD, "  if (!role || role !== fns.role(a.pos)) return false;\n", ''),
  nonat: () => swap(MOD, "  if (!nat || nat !== fns.nat(a.nat)) return false;\n", ''),
  slashall: () => swap(MOD, "return value.split(' / ').map", "return value.split('/').map"),
  noalias: () => swap(MOD, 'out.add(rules.aliases[k] ?? k);', 'out.add(k);'),
  firstmatch: () => swap(MOD, 'if (matches.length !== 1) {', 'if (matches.length === 0) {'),
  swaporder: () => {
    const src = fs.readFileSync(LIB, 'utf8').replaceAll('\r\n', '\n');
    const lines = src.split('\n');
    const a = lines.findIndex(l => l.startsWith('    applyClubAdditions(clubHistory, pool,'));
    const r = lines.findIndex(l => l.startsWith('    for (const [name, set] of clubHistory) clubHistory.set(name, careerClubs('));
    if (a < 0 || r < 0 || r < a) { console.error(`mut ${id}: anchors not found (${a}, ${r})`); process.exit(2); }
    const ruleLine = lines.splice(r, 1)[0];
    lines.splice(a, 0, ruleLine);
    fs.writeFileSync(LIB, lines.join('\n'));
    console.log(`mut ${id}: ${LIB} edited (count rule moved above the apply call)`);
  },
};
if (!M[id]) { console.error(`mut: unknown id ${id}`); process.exit(2); }
M[id]();
