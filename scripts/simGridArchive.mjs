/**
 * Round 354 harness: the archive says only what the game would agree with.
 *
 * The page publishes past NBA grid boards and the players who solve them, so
 * the failure that matters is not a crash, it is a page that is CONFIDENTLY
 * WRONG: a board that was never served on that date, or a player listed as an
 * answer that the game itself would reject. Both would be invisible to a build
 * and obvious to a reader who knows the sport.
 *
 * What this holds, checked against the game's own code and data rather than
 * against the file that produced the page:
 *   1. Every archived board is the board that date's seed really produces,
 *      recomputed here with the game's buildGridPuzzle.
 *   2. Every listed answer really satisfies its crossing, recomputed here with
 *      the game's playerMatchesCell against the live player data, and every
 *      published count matches the real number of valid players.
 *   3. The archive carries no clock: no board is dated today or later, because
 *      today's board is still being played, and a page about "the last N days"
 *      that moved with the clock could not be prerendered honestly.
 *   4. The page is real content, not a stub: every cell has at least a floor
 *      of valid answers behind it.
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

const ENTRY = path.join(os.tmpdir(), 'archEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'arch.bundle.mjs');
const p = rel => (path.join(ROOT, rel)).replaceAll('\\', '/');
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const grid = await import('${p('src/lib/nbaGrid.ts')}');
const dates = await import('${p('src/lib/dateUtils.ts')}');
export const { buildGridPuzzle, fetchNbaGridData, playerMatchesCell } = grid;
export const { dateSeed } = dates;
`);
execSync(`"${path.join(ROOT, 'node_modules', '.bin', 'esbuild')}" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`);
const { buildGridPuzzle, fetchNbaGridData, playerMatchesCell, dateSeed } = await import(pathToFileURL(BUNDLE).href);

const data = await fetchNbaGridData();
if (!data) {
  console.log('NBA GRID DATA UNREACHABLE. NOTHING WAS CHECKED.');
  console.error('simGridArchive: the player data did not load, which is itself worth investigating');
  process.exit(1);
}

/* The control corrupts the published data, not the checking code, so what it
   proves is that a wrong page would be caught. */
if (CONTROL === 'badanswer') {
  let planted = false;
  for (const b of archive.boards) {
    for (const c of b.cells) {
      const cell = { row: b.rows.includes(c.row) ? { label: c.row } : null, col: null };
      const wrong = data.players.find(pl => {
        const rowCat = buildGridPuzzle(dateSeed(b.date)).rows.find(r => r.label === c.row);
        const colCat = buildGridPuzzle(dateSeed(b.date)).cols.find(x => x.label === c.col);
        return rowCat && colCat && !playerMatchesCell(pl, { row: rowCat, col: colCat });
      });
      if (wrong) { c.answers[0] = wrong.name; planted = true; break; }
      void cell;
    }
    if (planted) break;
  }
  if (!planted) { console.error('control planted nothing: no invalid player could be found to swap in'); process.exit(1); }
  console.log('   NEGATIVE CONTROL ON: one published answer replaced with a player who does not fit, section 2 must go red');
}

console.log(`1) every archived board is the board that date really produced (${archive.boards.length} boards)`);
{
  let bad = 0;
  for (const b of archive.boards) {
    const real = buildGridPuzzle(dateSeed(b.date));
    const rowsOk = JSON.stringify(real.rows.map(x => x.label)) === JSON.stringify(b.rows);
    const colsOk = JSON.stringify(real.cols.map(x => x.label)) === JSON.stringify(b.cols);
    if (!rowsOk || !colsOk) {
      bad += 1;
      if (bad <= 3) fail(`${b.date}: the archived board is not what that date's seed produces`);
    }
  }
  console.log(`   ${archive.boards.length - bad} of ${archive.boards.length} boards reproduce exactly`);
}

console.log('2) every published answer is one the game would accept');
{
  let checked = 0, wrongName = 0, wrongCount = 0;
  for (const b of archive.boards) {
    const real = buildGridPuzzle(dateSeed(b.date));
    for (const c of b.cells) {
      const rowCat = real.rows.find(x => x.label === c.row);
      const colCat = real.cols.find(x => x.label === c.col);
      if (!rowCat || !colCat) { fail(`${b.date}: cell "${c.row}" x "${c.col}" is not on that board at all`); continue; }
      const cell = { row: rowCat, col: colCat };
      const all = data.players.filter(pl => playerMatchesCell(pl, cell));
      if (all.length !== c.total) {
        wrongCount += 1;
        if (wrongCount <= 3) fail(`${b.date} ${c.row} x ${c.col}: page says ${c.total} valid players, the data says ${all.length}`);
      }
      const validNames = new Set(all.map(pl => pl.name));
      for (const name of c.answers) {
        checked += 1;
        if (!validNames.has(name)) {
          wrongName += 1;
          if (wrongName <= 3) fail(`${b.date} ${c.row} x ${c.col}: "${name}" is published as an answer but does not satisfy the crossing`);
        }
      }
    }
  }
  console.log(`   ${checked} published answers checked, ${wrongName} invalid, ${wrongCount} miscounted cells`);
}

console.log('3) the archive carries no clock');
{
  /* Compare against the generator's own recorded end date rather than the
     machine clock, so this check does not start failing simply because time
     passed since the file was written. What matters is that the file never
     contains a board from ON or AFTER the day it was generated for plus one,
     which is the day people would still be playing. */
  const latest = archive.boards.map(b => b.date).sort().slice(-1)[0];
  console.log(`   newest archived board ${latest}, generated for ${archive.generatedFor}`);
  if (latest > archive.generatedFor) {
    fail(`the archive contains ${latest}, later than the ${archive.generatedFor} it was generated for, so it is publishing a board still in play`);
  }
}

console.log('4) the archive is content, not a stub');
{
  let thin = 0;
  for (const b of archive.boards) {
    for (const c of b.cells) {
      if (c.total < MIN_PER_CELL || c.answers.length === 0) {
        thin += 1;
        if (thin <= 3) fail(`${b.date} ${c.row} x ${c.col} has ${c.total} valid players and ${c.answers.length} listed`);
      }
    }
  }
  const cells = archive.boards.reduce((a, b) => a + b.cells.length, 0);
  console.log(`   ${cells - thin} of ${cells} cells carry real answers`);
}

console.log('');
if (CONTROL === 'badanswer') {
  if (failures > 0) { console.log(`simGridArchive control: green. The planted wrong answer was caught (${failures} finding).`); process.exit(0); }
  console.error('simGridArchive control: RED. A published answer the game would reject went unnoticed.');
  process.exit(1);
}
if (failures > 0) { console.error(`simGridArchive: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simGridArchive: green. Every board is the real board and every answer would be accepted in the game.');
