// Reviewer mutations for Round 1214 (the run lens). Each one is a small plausible slip in the core
// rule or the data path that the builder's own twenty did not try. Runs on the runner only, against
// the checkout it stands in; the request line restores the tree in the same command.
// Exit 3: the anchor is not in the file exactly once, so the mutation did not apply (never a red).
import fs from 'node:fs';

const CURVE = 'scripts/lib/cmValueCurve.mjs';
const AGES = 'scripts/lib/cmAges.mjs';
const BASIS = 'scripts/data/cmAgesBasis2026.json';
const TABLES = 'scripts/data/finalTables2025.json';
const BIRTHS = 'scripts/data/cmBirthDates2026.json';

const swap = (file, from, to) => () => {
  const src = fs.readFileSync(file, 'utf8');
  const n = src.split(from).length - 1;
  if (n !== 1) { console.log(`REV MUTATION REFUSED: the anchor is in ${file} ${n} time(s), wanted exactly 1`); process.exit(3); }
  fs.writeFileSync(file, src.replace(from, () => to));
};
const json = (file, edit) => () => {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const said = edit(data);
  if (!said) { console.log(`REV MUTATION REFUSED: the data in ${file} is not the shape the mutation expects`); process.exit(3); }
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  console.log(`   ${said}`);
};
const swapRows = (id, i, j) => data => {
  const rows = data.leagues?.[id]?.rows;
  if (!rows || !rows[i] || !rows[j] || !rows[i].club || !rows[j].club || rows[i].club === rows[j].club) return null;
  const a = { ...rows[i] };
  const b = { ...rows[j] };
  rows[i] = { ...b, pos: a.pos };
  rows[j] = { ...a, pos: b.pos };
  return `${id}: place ${a.pos} is now ${rows[i].club} and place ${b.pos} is now ${rows[j].club}`;
};

const MUTATIONS = {
  // a birthday ON 1 August counts as not yet had (off by one at the edge of the day the ages are for)
  ageedge: swap(AGES, 'if (m < bm || (m === bm && day < bd)) age -= 1;', 'if (m < bm || (m === bm && day <= bd)) age -= 1;'),
  // the half distance rounds up where the rule rounds down
  halfround: swap(CURVE, 'const halfWay = Math.max(0, Math.floor((top - level) / 2));', 'const halfWay = Math.max(0, Math.ceil((top - level) / 2));'),
  // the club filter dropped: a birth date is matched by name alone (the namesake bug)
  nameonly: swap(AGES, "const mine = cands.filter(c => c.clubs.has(row.club) || (row.tableClub && c.clubs.has(row.tableClub)));", 'const mine = cands;'),
  // the window ledger's joined club dropped from the join
  dropto: swap(AGES, "add(x.name, x.born, [x.to, dbToEngine[x.db]], 'the window ledger of missing players');", "add(x.name, x.born, [dbToEngine[x.db]], 'the window ledger of missing players');"),
  // the window ledger's table club dropped from the join
  dropdb: swap(AGES, "add(x.name, x.born, [x.to, dbToEngine[x.db]], 'the window ledger of missing players');", "add(x.name, x.born, [x.to], 'the window ledger of missing players');"),
  // the namesake guard fires a year early (exactly two years apart is refused)
  namesakeedge: swap(AGES, 'if (Math.abs(age - table.age) > NAMESAKE_YEARS) {', 'if (Math.abs(age - table.age) >= NAMESAKE_YEARS) {'),
  // the namesake guard never fires
  namesakeoff: swap(AGES, 'if (Math.abs(age - table.age) > NAMESAKE_YEARS) {', 'if (false) {'),
  // a 2025 bulk row is moved one year where the rule moves it two (a stale constant)
  yeardrop: swap(AGES, "return { age: age + (2026 - year) + 1, basis: 'moved' };", "return { age: age + 1, basis: 'moved' };"),
  // levelFrom starts one level up (off by one at the floor)
  levelfloor: swap(CURVE, 'for (let level = RATING_FLOOR; level < top; level += 1) {', 'for (let level = RATING_FLOOR + 1; level < top; level += 1) {'),
  // levelFrom wants a read strictly over the rating (off by one in the comparison)
  levelstrict: swap(CURVE, 'if (ageRead(level, age, top) >= rating) return level;', 'if (ageRead(level, age, top) > rating) return level;'),
  // the floor clamp dropped from the read
  floorclamp: swap(CURVE, 'return Math.max(RATING_FLOOR, Math.min(top, level + agePoints(level, age, top)));', 'return Math.min(top, level + agePoints(level, age, top));'),
  // a 23 year old gives nothing back (off by one at the youth edge)
  youthedge: swap(CURVE, 'if (age < YOUTH_FROM) {', 'if (age < YOUTH_FROM - 1) {'),
  // DATA: one moved man's table age in the basis file a year up
  basisage: json(BASIS, data => {
    const e = data.clubs?.['AC Milan']?.[0];
    if (!e || e[3] !== 'moved') return null;
    e[0] += 1;
    return `AC Milan man 1: table age now ${e[0]}`;
  }),
  // DATA: one bulk row of the birth date ledger holds a table age a year up
  ledgertable: json(BIRTHS, data => {
    const r = data.rows?.find(x => x.table && Number.isInteger(x.table.id) && x.table.id < 167000);
    if (!r) return null;
    r.table.age += 1;
    return `${r.name}: table age now ${r.table.age}`;
  }),
  // DATA: the top two of a league the game ships no table for, swapped in the fold
  tableswapunshipped: json(TABLES, swapRows('championship', 2, 3)),
  // DATA: two places under the ten the game ships, swapped in the fold of a league it does ship
  tableswapdeep: json(TABLES, swapRows('premier', 13, 14)),
};

const id = process.argv[2];
if (!MUTATIONS[id]) { console.log(`REV MUTATION REFUSED: no mutation named ${id}`); process.exit(3); }
MUTATIONS[id]();
console.log(`REV MUTATION ${id} APPLIED`);
