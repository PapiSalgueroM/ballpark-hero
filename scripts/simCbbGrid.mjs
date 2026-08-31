/**
 * Round 363: every College Basketball Grid board is solvable, and the school
 * pool it draws from is true of the data rather than remembered.
 *
 * The failure that matters in a grid is not a crash, it is a CELL NOBODY CAN
 * ANSWER. It looks fine on screen, it passes every build, and the only symptom
 * is a player staring at a square that has no correct answer. So this harness
 * recomputes the whole thing from the live table and refuses to take the
 * engine's word for anything.
 *
 * What it holds:
 *   1. The pool loads and is the size the table really is.
 *   2. Every school the engine deems eligible really does clear the floor on
 *      every achievement, recounted here independently of eligibleSchools().
 *   3. Every cell of every board generated for a fortnight of dates has at
 *      least CBB_MIN_PER_CELL real answers. This is the check that matters.
 *   4. The same seed and pool always produce the same board, which is what lets
 *      a board be republished later.
 *   5. The boards are not all the same: across the fortnight the generator uses
 *      a spread of schools and reaches every achievement.
 *
 * NEGATIVE CONTROL: CBBGRID_CONTROL=nofloor rebuilds the pool with the
 * eligibility floor set to zero, which lets thin schools in, and section 3 must
 * go red. That proves section 3 would notice an unanswerable cell rather than
 * passing because every board happens to be easy.
 *
 * Run: node scripts/simCbbGrid.mjs   (needs the database)
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.CBBGRID_CONTROL || '';
if (CONTROL && CONTROL !== 'nofloor') {
  console.error(`CBBGRID_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const ENTRY = path.join(os.tmpdir(), 'cbbGridEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'cbbGrid.bundle.mjs');
const rel = r => path.join(ROOT, r).replaceAll('\\', '/');
/* Dynamic imports, not `export * from`. A static import is hoisted above the
   localStorage shim, and the Supabase client reads localStorage at module
   scope, so the bundle throws before the first line of this harness runs. That
   is also why simGridArchive imports dynamically. */
fs.writeFileSync(ENTRY, [
  'globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };',
  `const g = await import('${rel('src/lib/cbbGrid.ts')}');`,
  `const d = await import('${rel('src/lib/dateUtils.ts')}');`,
  'export const fetchCbbGridData = g.fetchCbbGridData;',
  'export const eligibleSchools = g.eligibleSchools;',
  'export const buildCbbGridPuzzle = g.buildCbbGridPuzzle;',
  'export const playerMatchesCell = g.playerMatchesCell;',
  'export const CBB_ACHIEVEMENTS = g.CBB_ACHIEVEMENTS;',
  'export const CBB_MIN_PER_CELL = g.CBB_MIN_PER_CELL;',
  'export const dateSeed = d.dateSeed;',
].join('\n'));
execSync(`"${path.join(ROOT, 'node_modules', '.bin', 'esbuild')}" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`);
const lib = await import(pathToFileURL(BUNDLE).href);

console.log('1) the pool loads');
const data = await lib.fetchCbbGridData();
if (!data) {
  console.log('CBB GRID DATA UNREACHABLE. NOTHING WAS CHECKED.');
  console.error('simCbbGrid: the player data did not load, which is itself worth investigating');
  process.exit(1);
}
console.log(`   ${data.players.length} players indexed, ${data.byNormalizedName.size} unique names`);
if (data.players.length < 30000) fail(`only ${data.players.length} players loaded, which is far below the table's real size`);

const FLOOR = lib.CBB_MIN_PER_CELL;
const schools = lib.eligibleSchools(data, CONTROL === 'nofloor' ? 0 : FLOOR);
if (CONTROL === 'nofloor') {
  console.log(`   NEGATIVE CONTROL ON: eligibility floor dropped to 0, pool is ${schools.length} schools instead of the usual, section 3 must go red`);
}

console.log('2) every eligible school really clears the floor, recounted here');
{
  /* Counted from the raw player list rather than by calling eligibleSchools
     again, so this cannot agree with the engine merely by sharing its code. */
  let worst = Infinity, worstWhere = '';
  let bad = 0;
  for (const s of schools) {
    for (const a of lib.CBB_ACHIEVEMENTS) {
      const n = data.players.filter(p => p.schools.has(s.id) && lib.playerMatchesCell(p, { row: s, col: a })).length;
      if (n < worst) { worst = n; worstWhere = `${s.label} x ${a.label}`; }
      if (CONTROL !== 'nofloor' && n < FLOOR) {
        bad += 1;
        if (bad <= 3) fail(`${s.label} x ${a.label} has only ${n} qualifying players, below the floor of ${FLOOR}`);
      }
    }
  }
  console.log(`   ${schools.length} eligible schools, ${schools.length * lib.CBB_ACHIEVEMENTS.length} combinations, worst is ${worstWhere} at ${worst}`);
  if (schools.length < 40 && CONTROL !== 'nofloor') fail(`only ${schools.length} schools are eligible, which is too small a pool to be plausible`);
}

console.log('3) every cell of every board has real answers');
{
  const DAYS = 14;
  const base = Date.UTC(2026, 7, 1);
  let thin = 0, cells = 0, boards = 0;
  let minSeen = Infinity;
  for (let d = 0; d < DAYS; d++) {
    const dt = new Date(base + d * 86400000).toISOString().slice(0, 10);
    const puzzle = lib.buildCbbGridPuzzle(lib.dateSeed(dt), schools);
    if (!puzzle) { fail(`${dt}: no board could be built at all`); continue; }
    boards += 1;
    for (const row of puzzle.rows) {
      for (const col of puzzle.cols) {
        cells += 1;
        const n = data.players.filter(p => lib.playerMatchesCell(p, { row, col })).length;
        if (n < minSeen) minSeen = n;
        if (n < FLOOR) {
          thin += 1;
          if (thin <= 3) fail(`${dt}: "${row.label}" x "${col.label}" has ${n} valid players, below the floor of ${FLOOR}`);
        }
      }
    }
  }
  console.log(`   ${boards} boards, ${cells} cells, thinnest cell holds ${minSeen} answers, ${cells - thin} of ${cells} clear the floor`);
}

console.log('4) the same seed and pool always give the same board');
{
  const a = lib.buildCbbGridPuzzle(20260815, schools);
  const b = lib.buildCbbGridPuzzle(20260815, schools);
  const same = JSON.stringify(a) === JSON.stringify(b);
  console.log(`   two builds of the same seed are ${same ? 'identical' : 'DIFFERENT'}`);
  if (!same) fail('the same seed produced two different boards, so a board could never be republished');
}

console.log('5) the boards vary');
{
  const usedSchools = new Set(), usedAchievements = new Set();
  for (let d = 0; d < 30; d++) {
    const dt = new Date(Date.UTC(2026, 7, 1) + d * 86400000).toISOString().slice(0, 10);
    const p = lib.buildCbbGridPuzzle(lib.dateSeed(dt), schools);
    if (!p) continue;
    p.rows.forEach(r => usedSchools.add(r.id));
    p.cols.forEach(c => usedAchievements.add(c.id));
  }
  console.log(`   over 30 days: ${usedSchools.size} distinct schools, ${usedAchievements.size} of ${lib.CBB_ACHIEVEMENTS.length} achievements`);
  if (CONTROL !== 'nofloor') {
    if (usedSchools.size < 30) fail(`only ${usedSchools.size} distinct schools appeared in 30 days, so the board repeats itself`);
    if (usedAchievements.size < lib.CBB_ACHIEVEMENTS.length) fail(`${lib.CBB_ACHIEVEMENTS.length - usedAchievements.size} achievements never appeared in 30 days`);
  }
}

console.log('');
if (CONTROL === 'nofloor') {
  if (failures > 0) { console.log(`simCbbGrid control: green. Dropping the eligibility floor produced unanswerable cells and section 3 caught them (${failures} finding${failures === 1 ? '' : 's'}).`); process.exit(0); }
  console.error('simCbbGrid control: RED. The floor was removed and every board still passed, so section 3 proves nothing.');
  process.exit(1);
}
if (failures > 0) { console.error(`simCbbGrid: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simCbbGrid: green. Every board is solvable and the school pool is true of the data.');
