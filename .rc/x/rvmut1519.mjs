// Reviewer mutation applier for Round 1519. Usage: node rvmut1519.mjs <id>
// Edits src/lib/soccerCareerEngine.ts in the runner's checkout only; the caller restores it.
import fs from 'node:fs';
const FILE = 'src/lib/soccerCareerEngine.ts';
const M = {
  // stale constant: the after career phases lose manager and owner
  nomgrowner: ['"retired", "manager_season", "pundit_season", "owner_season"];', '"retired", "pundit_season"];'],
  noowner: ['"pundit_season", "owner_season"];', '"pundit_season"];'],
  // dropped filter: a legacy no longer backs a retirement
  nolegacy: ['s.retired = !!(s.legacy || s.postRetirementChoice', 's.retired = !!(s.postRetirementChoice'],
  // dropped filter: a retired season row no longer backs a retirement
  norow: ['      || s.seasons?.some(row => row?.type === "retired"));', '      );'],
  // swapped arguments: ceremony and retired screen swapped
  swap: ['s.phase = s.postRetirementChoice ? "retired" : "retirement_ceremony";', 's.phase = s.postRetirementChoice ? "retirement_ceremony" : "retired";'],
  // off by one: the 33 line
  age33: ['return s.overall < 50 && s.age >= 33 ?', 'return s.overall < 50 && s.age > 33 ?'],
  // off by one: the 50 line
  ovr50: ['return s.overall < 50 && s.age >= 33 ?', 'return s.overall <= 50 && s.age >= 33 ?'],
  // dropped branch: a youth career with a stray post phase goes to playing
  noyouth: ['=== "youth" ? "youth" : "playing";', '=== "youth" ? "playing" : "playing";'],
  // dropped line: the lost legacy rescue
  nolegacyrescue: ['  if (s.retired && s.phase === "retirement_ceremony" && !s.legacy) s.legacy = calculateLegacy(s);\n', ''],
  // dismissSummary reconciles but still hops to the retired screen
  hop: ['  if (s.retired && reconcileRetirement(s)) return s;', '  if (s.retired && reconcileRetirement(s)) { s.phase = "retired"; return s; }'],
  // the flagless guard dropped
  noflagguard: ['  if (typeof s.retired !== "boolean") return false;\n', ''],
  // a stray flag is believed: clearing a stray flag never happens
  believe: ['    if (!s.retired && post) s.phase =', '    if (false) s.phase ='],
};
const id = process.argv[2];
const pair = M[id];
if (!pair) { console.log(`ABORT: no mutation ${id}`); process.exit(2); }
const src = fs.readFileSync(FILE, 'utf8');
const n = src.split(pair[0]).length - 1;
if (n !== 1) { console.log(`ABORT: mutation ${id} target found ${n} times, not once`); process.exit(2); }
fs.writeFileSync(FILE, src.replace(pair[0], () => pair[1]));
console.log(`MUTATED ${id}`);
