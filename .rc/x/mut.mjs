/* Review of Round 1301 (runner only, never committed): one named mutation of the tree it is run in.
   usage: node mut.mjs <name>     (from the repo root; restore with git checkout -- src scripts)
   Every string must be there exactly once, or it aborts with exit 2 and changes nothing. */
import { readFileSync, writeFileSync } from 'node:fs';

const MUTS = {
  // A: calibration 2 edited in place for the NHL (a save stamped 2 is read on the new marks).
  A: [['src/lib/nhlMyCareer.ts', '{ 1: NHL_LEGACY_V1, 2: NHL_LEGACY_V2, 3: NHL_LEGACY_V3 };', '{ 1: NHL_LEGACY_V1, 2: NHL_LEGACY_V3, 3: NHL_LEGACY_V3 };']],
  // B: a stale bound in the stamp's check (a stamp of 3 is dropped, so a career retired today reads calibration 1).
  B: [['src/lib/careerHallOfFame.ts', 'raw >= 1 && raw <= HALL_CALIBRATION ?', 'raw >= 1 && raw <= 2 ?']],
  // C: basketball's line follows calibration 2 only, the line as it stood before this round.
  C: [['src/lib/nbaMyCareer.ts', 'legacyRead(cal >= 2 ? nbaLegacyTableFor(c)', 'legacyRead(cal === 2 ? nbaLegacyTableFor(c)']],
  // D82: the engine plays 82 games again (the one number of Round 1226 put back), the marks of calibration 3 kept.
  D82: [['src/data/usSeasonLedgerNhl.ts', '{ year: 2026, games: 84, teams: 32,', '{ year: 2026, games: 82, teams: 32,'], ['src/data/usSeasonLedgerNhl.ts', 'from: 2026, games: 84,', 'from: 2026, games: 82,']],
  // D83: one game fewer (a stat move of 1.2 percent).
  D83: [['src/data/usSeasonLedgerNhl.ts', '{ year: 2026, games: 84, teams: 32,', '{ year: 2026, games: 83, teams: 32,'], ['src/data/usSeasonLedgerNhl.ts', 'from: 2026, games: 84,', 'from: 2026, games: 83,']],
  // D85: one game more.
  D85: [['src/data/usSeasonLedgerNhl.ts', '{ year: 2026, games: 84, teams: 32,', '{ year: 2026, games: 85, teams: 32,'], ['src/data/usSeasonLedgerNhl.ts', 'from: 2026, games: 84,', 'from: 2026, games: 85,']],
  // E: the stamp writes a stale literal (a career retiring today is stamped 2).
  E: [['src/lib/careerHallOfFame.ts', 'if (c.retired && c.hallCal === undefined) c.hallCal = HALL_CALIBRATION;', 'if (c.retired && c.hallCal === undefined) c.hallCal = 2 as HallCalibration;']],
  // F: two digits of one calibration 3 mark swapped in the table.
  F: [['src/lib/nhlMyCareer.ts', "{ stat: 'goals', from: 954, to: 1130, label: 'goals' }", "{ stat: 'goals', from: 945, to: 1130, label: 'goals' }"]],
  // G: baseball's calibration 3 pointed at the wrong table.
  G: [['src/lib/mlbMyCareer.ts', '2: MLB_LEGACY_V2, 3: MLB_LEGACY_V2 };', '2: MLB_LEGACY_V2, 3: MLB_LEGACY_V1 };']],
  // ERA: not a mutation of the rule, a MEASUREMENT: every career with no era named starts in the 2006-07 throwback, so the harness's own fleet plays that era.
  ERA: [['src/lib/nhlMyCareer.ts', 'return NHL_ERAS.find(e => e.id === id) ?? NHL_ERAS[0];', 'return NHL_ERAS.find(e => e.id === id) ?? NHL_ERAS[1];']],
  // H: an unstamped career still being played is read on calibration 2 (a stale literal in the default).
  H: [['src/lib/careerHallOfFame.ts', 'return c.retired ? 1 : HALL_CALIBRATION;', 'return c.retired ? 1 : 2;']],
};
const name = process.argv[2];
const edits = MUTS[name];
if (!edits) { console.error(`mut: ABORTED, no mutation named ${name}`); process.exit(2); }
const files = new Map();
for (const [file, was, now] of edits) {
  const src = files.get(file) ?? readFileSync(file, 'utf8');
  const n = src.split(was).length - 1;
  if (n !== 1) { console.error(`mut ${name}: ABORTED, "${was}" is in ${file} ${n} times, wanted exactly 1`); process.exit(2); }
  files.set(file, src.replace(was, now));
}
for (const [file, src] of files) writeFileSync(file, src);
console.log(`mut ${name}: ${edits.length} edits made in ${[...files.keys()].join(', ')}`);
