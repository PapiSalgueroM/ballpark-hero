/* Review mutation (never committed, runner only): node mut1600.mjs <name> edits one source file in place and
   proves its anchor first (exit 3 when the anchor is not there exactly once, so a mutation that changes nothing
   can never read as a harness that missed it). The request line restores with git checkout -- src scripts. */
import fs from 'node:fs';

const MUTS = {
  /* 2026 load skips the age read for a man under 24 (the "never mark a boy down" slip) */
  youth: ['src/data/clubManagerWorldRosters.ts', /const r = ageRead\(b\.r, b\.a\);/, 'const r = b.a < 24 ? b.r : ageRead(b.r, b.a);'],
  /* 2026 load drops the level beside the shown rating */
  nolv: ['src/data/clubManagerWorldRosters.ts', /return r === b\.r \? b : \{ \.\.\.b, r, lv: b\.r \};/, 'return r === b.r ? b : { ...b, r };'],
  /* the real free agents are read with age inside the curve 1 view as well */
  faview: ['src/lib/clubManager.ts', /CM_REAL_FREE_AGENTS_CURVE === CM_AGE_CURVE && cmWorldTag\(\) === '' \? ageRead/, "CM_REAL_FREE_AGENTS_CURVE === CM_AGE_CURVE ? ageRead"],
  /* Deadline Day's end of day stretch forgets its date (runs on the live world) */
  endday: ['src/lib/deadlineDay.ts', /(export function endDay\(prev: DeadlineRun\): DeadlineRun \{\r?\n  if \(prev\.grade\) return prev;\r?\n  return onStaticWorldOn\()prev\.setup\.daily(, \(\) => \{)/, '$1undefined$2'],
  /* Deadline Day's bid stretch forgets its date */
  bid: ['src/lib/deadlineDay.ts', /(if \(!\(amt > 0\) \|\| amt > prev\.state\.budget\) return prev;\r?\n  return onStaticWorldOn\()prev\.setup\.daily(, \(\) => \{)/, '$1undefined$2'],
  /* Round 1102's order: the points under the stretch */
  pointsfirst: ['src/lib/clubManagerEras.ts', /const shown = readInWorld\(b\.r, b\.a, world\)\.rating;/, 'const shown = eraUpliftRating(eraId, readInWorld(b.r, b.a, { ageShift: ERA_RATING_AGE_SHIFT }).rating);'],
  /* the past seasons do not read age */
  noeraread: ['src/lib/clubManagerEras.ts', /const PAST_SEASONS_READ_AGE = true;/, 'const PAST_SEASONS_READ_AGE = false;'],
  /* the past season read forgets the January to August shift */
  noshift: ['src/lib/clubManagerEras.ts', /top: eraTop\(eraId\), ageShift: ERA_RATING_AGE_SHIFT \}/, 'top: eraTop(eraId), ageShift: 0 }'],
};
const name = process.argv[2];
const m = MUTS[name];
if (!m) { console.log(`mut1600: unknown mutation ${name}`); process.exit(3); }
const [file, re, to] = m;
const src = fs.readFileSync(file, 'utf8');
const hits = src.match(new RegExp(re.source, 'g')) ?? [];
if (hits.length !== 1) { console.log(`mut1600: ${name} ABORTED, anchor found ${hits.length} times in ${file}`); process.exit(3); }
const next = src.replace(re, to);
if (next === src) { console.log(`mut1600: ${name} ABORTED, nothing changed`); process.exit(3); }
fs.writeFileSync(file, next);
console.log(`mut1600: ${name} APPLIED to ${file}`);
