/**
 * Round 354 harness, extended in Round 358: the archive says only what the
 * game would agree with, for all three franchise grids.
 *
 * The page publishes past boards and the players who solve them, so the
 * failure that matters is not a crash, it is a page that is CONFIDENTLY WRONG:
 * a board that was never served on that date, or a player listed as an answer
 * that the game itself would reject. Both would be invisible to a build and
 * obvious to a reader who knows the sport.
 *
 * What this holds, per sport, checked against each game's own code and live
 * data rather than against the file that produced the page:
 *   1. Every archived board is the board that date's seed really produces,
 *      recomputed here with that game's buildGridPuzzle.
 *   2. Every listed answer really satisfies its crossing, recomputed with that
 *      game's playerMatchesCell against its live player data, and every
 *      published count matches the real number of valid players.
 *   3. The archive carries no clock: no board is dated later than the day the
 *      file was generated for, because that day's board is still being played.
 *   4. The page is real content, not a stub: every cell clears a floor.
 *
 * NEGATIVE CONTROL: ARCHIVE_CONTROL=badanswer swaps one published answer for a
 * player who does not satisfy that crossing (asserting it found a real player
 * to swap in) and section 2 must go red.
 *
 * Run: node scripts/simGridArchive.mjs   (needs the database)
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.ARCHIVE_CONTROL || '';
if (CONTROL && CONTROL !== 'badanswer') {
  console.error(`ARCHIVE_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const MIN_PER_CELL = 3;

const archive = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'data', 'gridArchive.json'), 'utf8'));
const SPORTS = [
  { key: 'nba', lib: 'src/lib/nbaGrid.ts', fetch: 'fetchNbaGridData' },
  { key: 'mlb', lib: 'src/lib/mlbGrid.ts', fetch: 'fetchMlbGridData' },
  { key: 'nhl', lib: 'src/lib/hockeyGrid.ts', fetch: 'fetchHockeyGridData' },
];

const ENTRY = path.join(os.tmpdir(), 'archEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'arch.bundle.mjs');
const rel = r => (path.join(ROOT, r)).replaceAll('\\', '/');
const importLines = SPORTS.map(s => `const ${s.key} = await import('${rel(s.lib)}');`).join('\n');
const libLines = SPORTS.map(s => `  ${s.key}: { build: ${s.key}.buildGridPuzzle, fetchData: ${s.key}.${s.fetch}, matches: ${s.key}.playerMatchesCell },`).join('\n');
fs.writeFileSync(ENTRY, [
  'globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };',
  importLines,
  `const dateLib = await import('${rel('src/lib/dateUtils.ts')}');`,
  'export const libs = {',
  libLines,
  '};',
  'export const dateSeed = dateLib.dateSeed;',
].join('\n'));
execSync(`"${path.join(ROOT, 'node_modules', '.bin', 'esbuild')}" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`);
const { libs, dateSeed } = await import(pathToFileURL(BUNDLE).href);

/* Load every sport's live pool up front, so an unreachable database is one
   clear message rather than three half checks. */
const pools = {};
for (const s of SPORTS) {
  const d = await libs[s.key].fetchData();
  if (!d) {
    console.log(`${s.key.toUpperCase()} GRID DATA UNREACHABLE. NOTHING WAS CHECKED.`);
    console.error('simGridArchive: the player data did not load, which is itself worth investigating');
    process.exit(1);
  }
  pools[s.key] = d;
}

/* The control corrupts the published data, not the checking code, so what it
   proves is that a wrong page would be caught. */
if (CONTROL === 'badanswer') {
  let planted = false;
  for (const s of SPORTS) {
    const sport = archive.sports[s.key];
    if (!sport || planted) continue;
    for (const b of sport.boards) {
      const real = libs[s.key].build(dateSeed(b.date));
      for (const c of b.cells) {
        const rowCat = real.rows.find(x => x.label === c.row);
        const colCat = real.cols.find(x => x.label === c.col);
        if (!rowCat || !colCat) continue;
        const wrong = pools[s.key].players.find(pl => !libs[s.key].matches(pl, { row: rowCat, col: colCat }));
        if (wrong) { c.answers[0] = wrong.name; planted = true; break; }
      }
      if (planted) break;
    }
  }
  if (!planted) { console.error('control planted nothing: no invalid player could be found to swap in'); process.exit(1); }
  console.log('   NEGATIVE CONTROL ON: one published answer replaced with a player who does not fit, section 2 must go red');
}

const present = SPORTS.filter(s => archive.sports[s.key]);
if (present.length !== SPORTS.length) {
  fail(`the archive file carries ${present.length} sports, expected ${SPORTS.length}`);
}

console.log('1) every archived board is the board that date really produced');
for (const s of present) {
  const boards = archive.sports[s.key].boards;
  let bad = 0;
  for (const b of boards) {
    const real = libs[s.key].build(dateSeed(b.date));
    const rowsOk = JSON.stringify(real.rows.map(x => x.label)) === JSON.stringify(b.rows);
    const colsOk = JSON.stringify(real.cols.map(x => x.label)) === JSON.stringify(b.cols);
    if (!rowsOk || !colsOk) {
      bad += 1;
      if (bad <= 3) fail(`${s.key} ${b.date}: the archived board is not what that date's seed produces`);
    }
  }
  console.log(`   ${s.key}  ${boards.length - bad} of ${boards.length} boards reproduce exactly`);
}

console.log('2) every published answer is one the game would accept');
for (const s of present) {
  const boards = archive.sports[s.key].boards;
  let checked = 0, wrongName = 0, wrongCount = 0;
  for (const b of boards) {
    const real = libs[s.key].build(dateSeed(b.date));
    for (const c of b.cells) {
      const rowCat = real.rows.find(x => x.label === c.row);
      const colCat = real.cols.find(x => x.label === c.col);
      if (!rowCat || !colCat) { fail(`${s.key} ${b.date}: cell "${c.row}" x "${c.col}" is not on that board at all`); continue; }
      const all = pools[s.key].players.filter(pl => libs[s.key].matches(pl, { row: rowCat, col: colCat }));
      if (all.length !== c.total) {
        wrongCount += 1;
        if (wrongCount <= 3) fail(`${s.key} ${b.date} ${c.row} x ${c.col}: page says ${c.total} valid players, the data says ${all.length}`);
      }
      const valid = new Set(all.map(pl => pl.name));
      for (const name of c.answers) {
        checked += 1;
        if (!valid.has(name)) {
          wrongName += 1;
          if (wrongName <= 3) fail(`${s.key} ${b.date} ${c.row} x ${c.col}: "${name}" is published as an answer but does not satisfy the crossing`);
        }
      }
    }
  }
  console.log(`   ${s.key}  ${checked} answers checked, ${wrongName} invalid, ${wrongCount} miscounted cells`);
}

console.log('3) the archive carries no clock');
for (const s of present) {
  /* Compared against the generator's own recorded end date rather than the
     machine clock, so this does not start failing simply because time passed
     since the file was written. */
  const latest = archive.sports[s.key].boards.map(b => b.date).sort().slice(-1)[0];
  console.log(`   ${s.key}  newest board ${latest}, generated for ${archive.generatedFor}`);
  if (latest > archive.generatedFor) {
    fail(`${s.key} contains ${latest}, later than the ${archive.generatedFor} it was generated for, so it is publishing a board still in play`);
  }
}

console.log('4) the archive is content, not a stub');
for (const s of present) {
  const boards = archive.sports[s.key].boards;
  let thin = 0, cells = 0;
  for (const b of boards) {
    for (const c of b.cells) {
      cells += 1;
      if (c.total < MIN_PER_CELL || c.answers.length === 0) {
        thin += 1;
        if (thin <= 3) fail(`${s.key} ${b.date} ${c.row} x ${c.col} has ${c.total} valid players and ${c.answers.length} listed`);
      }
    }
  }
  console.log(`   ${s.key}  ${cells - thin} of ${cells} cells carry real answers`);
}

console.log('');
if (CONTROL === 'badanswer') {
  if (failures > 0) { console.log(`simGridArchive control: green. The planted wrong answer was caught (${failures} finding).`); process.exit(0); }
  console.error('simGridArchive control: RED. A published answer the game would reject went unnoticed.');
  process.exit(1);
}
if (failures > 0) { console.error(`simGridArchive: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simGridArchive: green. Every board is the real board and every answer would be accepted in the game.');
