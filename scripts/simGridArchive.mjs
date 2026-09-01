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
const KNOWN_CONTROLS = ['badanswer', 'dedupe'];
if (CONTROL && !KNOWN_CONTROLS.includes(CONTROL)) {
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
  /* CBB is the one whose board is NOT a function of the seed alone. Its school
     pool is derived from the data at runtime, so a board rebuilt against a
     different pool is a different board. The archive records the pool it
     published against and section 1 rebuilds from that; section 5 separately
     checks the recorded pool against the live one and reports drift. */
  { key: 'cbb', lib: 'src/lib/cbbGrid.ts', fetch: 'fetchCbbGridData', derivesPool: true },
];

const ENTRY = path.join(os.tmpdir(), 'archEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'arch.bundle.mjs');
const rel = r => (path.join(ROOT, r)).replaceAll('\\', '/');
const importLines = SPORTS.map(s => `const ${s.key} = await import('${rel(s.lib)}');`).join('\n');
const libLines = SPORTS.map(s => s.derivesPool
  ? `  ${s.key}: { build: ${s.key}.buildCbbGridPuzzle, fetchData: ${s.key}.${s.fetch}, matches: ${s.key}.playerMatchesCell, pool: ${s.key}.eligibleSchools },`
  : `  ${s.key}: { build: ${s.key}.buildGridPuzzle, fetchData: ${s.key}.${s.fetch}, matches: ${s.key}.playerMatchesCell },`).join('\n');
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
  /* ROUND 369: retry the whole pull, for the third time this lesson has come
     up. The grid libs already retry each PAGE (Round 358), but a pull is ten to
     forty pages, so the chance of one exhausting its retries is much higher
     than for a single page, and this harness went red twice on a pool that
     loaded fine seconds later. A fence that fails at random teaches people to
     re-run it rather than read it, which is worse than not having it. Round 362
     put the same retry in simLeaderboardCaps. */
  let d = null;
  for (let attempt = 0; attempt <= 2 && !d; attempt++) {
    if (attempt) await new Promise(r => setTimeout(r, 800 * attempt));
    d = await libs[s.key].fetchData();
  }
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
      const real = rebuild(s.key, b.date);
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

/* Rebuild a board exactly as it was published: seed alone for the franchise
   grids, seed plus the RECORDED school pool for CBB. Using the recorded pool is
   the point, not a shortcut: it is what makes an already published board
   checkable at all once its inputs can move. Section 5 is what stops that
   becoming a way to hide drift. */
function rebuild(sportKey, date) {
  const sport = SPORTS.find(x => x.key === sportKey);
  if (!sport.derivesPool) return libs[sportKey].build(dateSeed(date));
  const recorded = (archive.sports[sportKey].schoolPool || []).map(id => ({ kind: 'school', id, label: id }));
  return libs[sportKey].build(dateSeed(date), recorded);
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
    const real = rebuild(s.key, b.date);
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
    const real = rebuild(s.key, b.date);
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

console.log('5) a recorded school pool still matches the live one');
{
  /* Only CBB carries a pool, and its absence on the franchise grids is
     meaningful rather than an oversight: those boards are seed-only, so there
     is nothing to record. A pool that has drifted does not corrupt the archive,
     because section 1 rebuilds from what was recorded, but it does mean the
     LIVE game would now serve a different board for those dates, and a reader
     comparing the two would be right to call the archive wrong. So report it. */
  let checked = 0;
  for (const s of present) {
    const recorded = archive.sports[s.key].schoolPool;
    if (!recorded) continue;
    checked += 1;
    const live = libs[s.key].pool(pools[s.key]).map(x => x.id);
    const gone = recorded.filter(x => !live.includes(x));
    const added = live.filter(x => !recorded.includes(x));
    console.log(`   ${s.key}  recorded ${recorded.length} schools, live ${live.length}, ${gone.length} gone, ${added.length} newly eligible`);
    /* A school leaving is what can change a published board, because the pool
       is indexed positionally. A school arriving changes future boards only. */
    for (const g of gone.slice(0, 3)) {
      fail(`${s.key}: "${g}" was in the published pool and is no longer eligible, so the live game no longer serves the boards this archive shows`);
    }
  }
  if (checked === 0) console.log('   no sport records a pool, nothing to check');
}

console.log('6) every cell survives prerendering and reaches a crawler');
{
  /* THIS SECTION READS THE SNAPSHOT, NOT THE JSON, which is the whole point.
     Every other section here proves the archive DATA is right. This one proves
     the data reached the page a crawler is served, because the prerenderer
     reconstructs the body rather than copying it, and until Round 370 its
     document global dedupe silently deleted any repeated table cell: 21 of 126
     labels and 70 of 126 counts were missing from /nba-grid/archive, with no
     visible gap to notice.
     Walked in DOCUMENT ORDER: a label whose count is present somewhere else on
     the page is not good enough, because every cell sharing that count matches
     the same single paragraph. That distinction is exactly what a first attempt
     at measuring this got wrong. */
  const stripP = /<p>(.*?)<\/p>/gs;
  const escHtml = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  for (const s of present) {
    const sport = archive.sports[s.key];
    const file = path.join(ROOT, 'public', sport.game.replace(/^\//, ''), 'archive', 'index.html');
    if (!fs.existsSync(file)) { fail(`${s.key}: no prerendered snapshot at ${file}, so nothing was served to a crawler`); continue; }
    const doc = fs.readFileSync(file, 'utf8');
    let paras = [...doc.matchAll(stripP)].map(m => m[1]);
    if (CONTROL === 'dedupe') {
      /* Reproduce the pre Round 371 prerenderer: one document global Set, so
         the second and later occurrence of any identical paragraph is dropped.
         That is exactly what deleted 70 counts and 21 labels from
         /nba-grid/archive. */
      const before = paras.length;
      const seenP = new Set();
      paras = paras.filter(x => (seenP.has(x) ? false : (seenP.add(x), true)));
      if (paras.length >= before) { console.error('control cannot run: nothing repeated to dedupe'); process.exit(1); }
    }
    const cells = sport.boards.flatMap(b => b.cells);
    const wanted = new Map();
    for (const c of cells) wanted.set(escHtml(`${c.row} and ${c.col}`), String(c.total));
    /* COUNT OCCURRENCES, NOT DISTINCT VALUES. A first version compared the 126
       cells against the number of distinct labels present and reported 21
       "missing" on a page that was in fact complete: crossings legitimately
       repeat across boards, so NBA has 126 cells but only 105 distinct labels.
       What matters is that each CELL has a label paragraph of its own, which is
       an occurrence count. That is the third measuring error this bug provoked,
       after testing substring presence instead of per cell presence and after
       forgetting that an ampersand is escaped in the output. The subject is
       slippery; count the thing you actually mean. */
    let intact = 0, noCount = 0, labelOccurrences = 0;
    for (let i = 0; i < paras.length; i++) {
      const lbl = paras[i];
      if (!wanted.has(lbl)) continue;
      labelOccurrences += 1;
      if (paras[i + 1] === wanted.get(lbl)) intact += 1; else noCount += 1;
    }
    const missingLabels = cells.length - labelOccurrences;
    console.log(`   ${s.key}  ${intact} of ${cells.length} cells intact, ${noCount} missing their count, ${missingLabels} cells with no label paragraph`);
    if (noCount > 0) fail(`${s.key}: ${noCount} crossings reach a crawler with no answer count, though the page promises one for every cell`);
    if (missingLabels > 0) fail(`${s.key}: ${missingLabels} crossing labels never reached the snapshot, so their answers appear under the wrong heading`);
  }
}

console.log('');
if (CONTROL === 'dedupe') {
  if (failures > 0) { console.log(`simGridArchive control (dedupe): green. The old document global dedupe was caught (${failures} finding${failures === 1 ? '' : 's'}).`); process.exit(0); }
  console.error('simGridArchive control (dedupe): RED. Repeated cells were dropped and section 6 did not notice.');
  process.exit(1);
}
if (CONTROL === 'badanswer') {
  if (failures > 0) { console.log(`simGridArchive control: green. The planted wrong answer was caught (${failures} finding).`); process.exit(0); }
  console.error('simGridArchive control: RED. A published answer the game would reject went unnoticed.');
  process.exit(1);
}
if (failures > 0) { console.error(`simGridArchive: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simGridArchive: green. Every board is the real board and every answer would be accepted in the game.');
