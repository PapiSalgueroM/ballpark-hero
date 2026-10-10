// Round 1214 mutations, run on a GitHub runner only (sent as .rc/x/mut1214.mjs, never committed).
// Each breaks ONE rule in a source or data file; the vitest must then go red. A mutation whose anchor
// is not in the file exactly once REFUSES to run (exit 3), so a red always means the test fired.
import fs from 'node:fs';

const CURVE = 'scripts/lib/cmValueCurve.mjs';
const AGES = 'scripts/lib/cmAges.mjs';
const DOOR = 'src/lib/cmAgeRead.ts';
const text = (file, find, put) => ({ file, find, put });
const json = (file, edit) => ({ file, edit });

const MUTATIONS = {
  /* both limits read the world's own top */
  halftop: text(CURVE, 'const halfWay = Math.max(0, Math.floor((top - level) / 2));', 'const halfWay = Math.max(0, Math.floor((RATING_CEIL - level) / 2));'),
  clamptop: text(CURVE, 'return Math.max(RATING_FLOOR, Math.min(top, level + agePoints(level, age, top)));', 'return Math.max(RATING_FLOOR, Math.min(RATING_CEIL, level + agePoints(level, age, top)));'),
  /* a young man never gains points */
  youthgain: text(CURVE, 'const halfWay = Math.max(0, Math.floor((top - level) / 2));', 'const halfWay = Math.floor((top - level) / 2);'),
  /* the age points are added AFTER the stretch (the Round 1102 order put them under it) */
  pointsfirst: text(CURVE, '  return { level, age, rating: ageRead(level, age, top) };', '  return { level, age, rating: stretch ? stretch(ageRead(valueRating, age, RATING_CEIL)) : ageRead(level, age, top) };'),
  /* a past season is rated at the file age plus the shift */
  noshift: text(CURVE, '  const age = fileAge + ageShift;', '  const age = fileAge;'),
  shiftzero: text(AGES, 'export const ERA_RATING_AGE_SHIFT = 1;', 'export const ERA_RATING_AGE_SHIFT = 0;'),
  /* levelFrom is total */
  nototal: text(CURVE, '    if (ageRead(level, age, top) >= rating) return level;\n  }\n  return top;', '    if (ageRead(level, age, top) === rating) return level;\n  }\n  return undefined;'),
  /* the value curve and the one argument call do not move */
  curve: text(CURVE, 'const r = Math.round(-13.106 + 12.851 * Math.log10(usd));', 'const r = Math.round(-13.106 + 12.9 * Math.log10(usd));'),
  oneargthrows: text(CURVE, '  if (rest.length === 0) return valueRatingOf(usd);', "  if (rest.length === 0) throw new Error('rateFrom: the age must be given');"),
  veteran: text(CURVE, '33: 3, 34: 4,', '33: 4, 34: 4,'),
  /* a thin ledger row is left out; the libraries stay pure */
  thinread: text(AGES, '    if (x?.thin) continue;\n', ''),
  impure: text(AGES, "/** The day every 2026 squad's ages are for. */", "import fs from 'node:fs';\n/** The day every 2026 squad's ages are for. */"),
  /* the door is the script's own function and nothing shipped imports it */
  doorcopy: text(DOOR, 'export const ageRead: (level: number, age: number, top?: number) => number = scriptAgeRead;', 'export const ageRead: (level: number, age: number, top?: number) => number = (level, age, top = 94) => scriptAgeRead(level, age, top);'),
  imported: text('src/lib/utils.ts', 'export function cn(', "import '@/lib/cmAgeRead';\nexport function cn("),
  /* the ledgers */
  ledgerkind: json('scripts/data/cmBirthDates2026.json', (doc) => {
    const row = doc.rows.find(r => r.name === 'Mohamed Salah');
    const before = row.sources.length;
    row.sources = row.sources.filter(s => s.family === 'stats');
    return before === 3 && row.sources.length === 2;
  }),
  ledgerdate: json('scripts/data/cmBirthDates2026.json', (doc) => {
    const row = doc.rows.find(r => r.name === 'Michael Kayode');
    if (row.born !== '2004-07-10') return false;
    row.born = '2004-07-11';
    return true;
  }),
  tablerole: json('scripts/data/finalTables2025.json', (doc) => {
    const s = doc.leagues.laliga.sources.find(x => /tntsports/.test(x.url));
    if (!s || s.role !== 'table') return false;
    s.role = 'detail';
    return true;
  }),
  tablerow: json('scripts/data/finalTables2025.json', (doc) => {
    const rows = doc.leagues.premier.rows;
    if (rows[0].club !== 'Arsenal' || rows[1].club !== 'Manchester City') return false;
    [rows[0].club, rows[1].club] = [rows[1].club, rows[0].club];
    return true;
  }),
  basisline: json('scripts/data/cmAgesBasis2026.json', (doc) => {
    const e = doc.clubs.Liverpool[0];
    if (e[3] !== 'born' || e.length !== 6) return false;
    doc.clubs.Liverpool[0] = [e[0], e[1], e[2], 'moved', e[5]];
    return true;
  }),
  basisvalue: json('scripts/data/cmAgesBasis2026.json', (doc) => {
    const e = doc.clubs.Liverpool[0];
    if (!Number.isInteger(e[e.length - 1])) return false;
    e[e.length - 1] += 1;
    return true;
  }),
};

const id = process.argv[2];
if (id === '--list') { console.log(Object.keys(MUTATIONS).join(' ')); process.exit(0); }
const m = MUTATIONS[id];
if (!m) { console.log(`MUTATION ${id} ABORTED: no such mutation`); process.exit(3); }
const src = fs.readFileSync(m.file, 'utf8');
if (m.edit) {
  const doc = JSON.parse(src);
  if (!m.edit(doc)) { console.log(`MUTATION ${id} ABORTED: ${m.file} does not hold what the mutation changes`); process.exit(3); }
  fs.writeFileSync(m.file, JSON.stringify(doc));
} else {
  const hits = src.split(m.find).length - 1;
  if (hits !== 1) { console.log(`MUTATION ${id} ABORTED: the anchor is in ${m.file} ${hits} times, not once`); process.exit(3); }
  fs.writeFileSync(m.file, src.replace(m.find, () => m.put));
}
console.log(`MUTATION ${id} APPLIED to ${m.file}`);
