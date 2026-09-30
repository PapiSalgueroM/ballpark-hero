/**
 * Round 354 harness, extended in Rounds 358, 369, 370 and 653: the archive says
 * only what the game would agree with, and what the page says about the
 * archive is true.
 *
 * The page publishes past boards and the players who solve them, so the
 * failure that matters is not a crash, it is a page that is CONFIDENTLY WRONG:
 * a board that was never served on that date, a player the game would reject,
 * a count that is off, a name printed twice, or copy that describes an archive
 * the file does not hold. All of those are invisible to a build and obvious to
 * a reader who knows the sport.
 *
 * What this holds, checked against each game's own code and live data rather
 * than against the file that produced the page:
 *    1. Every archived board is the board that date's seed really produces.
 *    2. Every listed answer satisfies its crossing, and every published count is
 *       the number of DISTINCT PLAYERS, by the source's own id, that satisfy it.
 *       Round 653: ncaa_player_stats holds 1,600 players twice, and a count of
 *       rows ran high by exactly those.
 *    3. No board is dated after the day the file was generated for.
 *    4. Every cell clears a floor, so the page is content and not a stub.
 *    5. A recorded school pool still matches the live one.
 *    6. Every cell reaches the saved page with its label and its count.
 *    7. Round 653: the newest board is no more than 3 days older than the day
 *       the file says it was generated for. Measured against the file's own
 *       claim and never the machine clock, so it cannot start failing because
 *       time passed; keeping the claim current is the release step
 *       (npm run archive:grids, docs/SHIP-PIPELINE.md). It prints how old the
 *       newest board is today, as information only.
 *    8. Round 653: no cell lists the same player twice (Bradley Beal twice at
 *       Florida), nor two namesakes that read as one man twice.
 *    9. Round 653: no listed name is malformed ("_ Eldredge" went out as a
 *       Hofstra guard).
 *   10. Round 653: the saved page's copy states the range and the board counts
 *       the data really holds. It used to say "the last 14" of a file that had
 *       stopped a month earlier.
 *   11. Round 653: no h2 on the saved page carries an ISO date, and every board
 *       has its "grid answers for <Month D, YYYY>" heading.
 *
 * Sections 6, 10 and 11 read the prerendered snapshot in public/, so they are
 * only meaningful after npm run build:seo has baked the current data.
 *
 * NEGATIVE CONTROLS, one per section it proves, each refusing to run if it
 * cannot plant what it describes, and each green only when its own section
 * goes red and no other section moves:
 *   ARCHIVE_CONTROL=badanswer  one answer swapped for a player who does not fit (2)
 *   ARCHIVE_CONTROL=dedupe     the pre Round 371 prerenderer's paragraph dedupe (6)
 *   ARCHIVE_CONTROL=stale      the file's generatedFor moved 4 days past its newest board (7)
 *   ARCHIVE_CONTROL=repeat     a cell's second name replaced by its first (8)
 *   ARCHIVE_CONTROL=malformed  a real valid player with a placeholder name listed (9)
 *   ARCHIVE_CONTROL=copyrange  the saved copy's newest date moved back a day (10)
 *   ARCHIVE_CONTROL=isoh2      one saved board heading written with its ISO date (11)
 *
 * Run: node scripts/simGridArchive.mjs   (needs the database, reads only)
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { addDays, longDate, malformedName } from './lib/gridArchiveRules.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.ARCHIVE_CONTROL || '';
const CONTROLS = { badanswer: 2, dedupe: 6, stale: 7, repeat: 8, malformed: 9, copyrange: 10, isoh2: 11 };
if (CONTROL && !(CONTROL in CONTROLS)) {
  console.error(`ARCHIVE_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(CONTROLS).join(', ')})`);
  process.exit(1);
}
const cannotRun = m => { console.error(`simGridArchive control (${CONTROL}) cannot run: ${m}`); process.exit(1); };

const failures = {};
let section = 0;
const fail = m => { failures[section] = (failures[section] || 0) + 1; console.error('  FAIL: ' + m); };
const MIN_PER_CELL = 3;
const FRESH_DAYS = 3;

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

/* Load every sport's live pool up front, with the source's ids, so an
   unreachable database is one clear message rather than several half checks.
   ROUND 369: the whole pull is retried, because a pull is ten to forty pages
   and one exhausting its per page retries is a transient, not a finding. */
const pools = {};
for (const s of SPORTS) {
  let d = null;
  for (let attempt = 0; attempt <= 2 && !d; attempt++) {
    if (attempt) await new Promise(r => setTimeout(r, 800 * attempt));
    d = await libs[s.key].fetchData({ withIds: true });
  }
  if (!d) {
    console.log(`${s.key.toUpperCase()} GRID DATA UNREACHABLE. NOTHING WAS CHECKED.`);
    console.error('simGridArchive: the player data did not load, which is itself worth investigating');
    process.exit(1);
  }
  const noId = d.players.filter(pl => pl.id === undefined || pl.id === null || pl.id === '').length;
  if (noId) {
    console.error(`simGridArchive: ${noId} ${s.key} players came back with no id, so no count can be checked. NOTHING WAS CHECKED.`);
    process.exit(1);
  }
  pools[s.key] = d;
}

/* Rebuild a board exactly as it was published: seed alone for the franchise
   grids, seed plus the RECORDED school pool for CBB. Section 5 is what stops
   that becoming a way to hide drift. */
function rebuild(sportKey, date) {
  const sport = SPORTS.find(x => x.key === sportKey);
  if (!sport.derivesPool) return libs[sportKey].build(dateSeed(date));
  const recorded = (archive.sports[sportKey].schoolPool || []).map(id => ({ kind: 'school', id, label: id }));
  return libs[sportKey].build(dateSeed(date), recorded);
}

/* Every player the game would accept in a cell, from the game's own data. */
function validPlayers(sportKey, date, c) {
  const real = rebuild(sportKey, date);
  const rowCat = real?.rows.find(x => x.label === c.row);
  const colCat = real?.cols.find(x => x.label === c.col);
  if (!rowCat || !colCat) return null;
  return pools[sportKey].players.filter(pl => libs[sportKey].matches(pl, { row: rowCat, col: colCat }));
}

const present = SPORTS.filter(s => archive.sports[s.key]);
const allCells = () => present.flatMap(s => archive.sports[s.key].boards.flatMap(b => b.cells.map(c => ({ s, b, c }))));

/* ---------- controls that corrupt the published data ----------
   They corrupt the data, never the checking code, so what they prove is that
   a wrong page would be caught. Each one refuses to run if it cannot plant
   exactly the fault it names without also tripping another section. */
if (CONTROL === 'badanswer') {
  let planted = false;
  for (const { s, b, c } of allCells()) {
    const valid = validPlayers(s.key, b.date, c);
    if (!valid) continue;
    const validNames = new Set(valid.map(pl => pl.name));
    const wrong = pools[s.key].players.find(pl => !validNames.has(pl.name) && !malformedName(pl.name) && !c.answers.includes(pl.name));
    if (wrong) { c.answers[0] = wrong.name; planted = true; break; }
  }
  if (!planted) cannotRun('no invalid player could be found to swap in');
  console.log('   NEGATIVE CONTROL ON: one published answer replaced with a player who does not fit, section 2 must go red');
}
if (CONTROL === 'stale') {
  const before = archive.generatedFor;
  archive.generatedFor = addDays(before, FRESH_DAYS + 1);
  if (archive.generatedFor === before) cannotRun('generatedFor did not move');
  console.log(`   NEGATIVE CONTROL ON: the file now claims ${archive.generatedFor} while its newest boards stay where they were, section 7 must go red`);
}
if (CONTROL === 'repeat') {
  const hit = allCells().find(({ c }) => c.answers.length >= 2 && c.answers[0] !== c.answers[1]);
  if (!hit) cannotRun('no cell lists two different names');
  hit.c.answers[1] = hit.c.answers[0];
  console.log(`   NEGATIVE CONTROL ON: ${hit.s.key} ${hit.b.date} ${hit.c.row} x ${hit.c.col} lists ${hit.c.answers[0]} twice, section 8 must go red`);
}
if (CONTROL === 'malformed') {
  /* A REAL player the game accepts in that cell, so section 2 stays green and
     only the name rule can object. */
  let planted = null;
  for (const { s, b, c } of allCells()) {
    const bad = (validPlayers(s.key, b.date, c) ?? []).find(pl => malformedName(pl.name) && !c.answers.includes(pl.name));
    if (bad) { c.answers[c.answers.length - 1] = bad.name; planted = `${s.key} ${b.date} ${c.row} x ${c.col} now lists "${bad.name}"`; break; }
  }
  if (!planted) cannotRun('no published cell has a valid player with a malformed name to list');
  console.log(`   NEGATIVE CONTROL ON: ${planted}, section 9 must go red`);
}

if (present.length !== SPORTS.length) {
  section = 1;
  fail(`the archive file carries ${present.length} sports, expected ${SPORTS.length}`);
}

section = 1;
console.log('1) every archived board is the board that date really produced');
for (const s of present) {
  const boards = archive.sports[s.key].boards;
  let bad = 0;
  for (const b of boards) {
    const real = rebuild(s.key, b.date);
    const rowsOk = real && JSON.stringify(real.rows.map(x => x.label)) === JSON.stringify(b.rows);
    const colsOk = real && JSON.stringify(real.cols.map(x => x.label)) === JSON.stringify(b.cols);
    if (!rowsOk || !colsOk) {
      bad += 1;
      if (bad <= 3) fail(`${s.key} ${b.date}: the archived board is not what that date's seed produces`);
    }
  }
  console.log(`   ${s.key}  ${boards.length - bad} of ${boards.length} boards reproduce exactly`);
}

section = 2;
console.log('2) every published answer is one the game would accept, and every count is of distinct players');
const cellValid = new Map();
for (const s of present) {
  const boards = archive.sports[s.key].boards;
  let checked = 0, wrongName = 0, wrongCount = 0;
  const rows = pools[s.key].players.length;
  const distinct = new Set(pools[s.key].players.map(pl => String(pl.id))).size;
  for (const b of boards) {
    for (const c of b.cells) {
      const all = validPlayers(s.key, b.date, c);
      if (!all) { fail(`${s.key} ${b.date}: cell "${c.row}" x "${c.col}" is not on that board at all`); continue; }
      cellValid.set(c, all);
      /* Counted by id, not by row: a player loaded twice is one player. */
      const players = new Set(all.map(pl => String(pl.id))).size;
      if (players !== c.total) {
        wrongCount += 1;
        if (wrongCount <= 3) fail(`${s.key} ${b.date} ${c.row} x ${c.col}: page says ${c.total} valid players, the data holds ${players} (${all.length} rows)`);
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
  console.log(`   ${s.key}  ${checked} answers checked, ${wrongName} invalid, ${wrongCount} miscounted cells (source ${rows} rows, ${distinct} distinct players)`);
}

section = 3;
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

section = 4;
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

section = 5;
console.log('5) a recorded school pool still matches the live one');
{
  /* Only CBB carries a pool. A pool that has drifted does not corrupt the
     archive, because section 1 rebuilds from what was recorded, but it does
     mean the LIVE game would now serve a different board for those dates. */
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

const decode = t => String(t).replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const snapshotOf = sport => {
  const file = path.join(ROOT, 'public', sport.game.replace(/^\//, ''), 'archive', 'index.html');
  return fs.existsSync(file) ? { file, doc: fs.readFileSync(file, 'utf8') } : { file, doc: null };
};

section = 6;
console.log('6) every cell survives prerendering and reaches a crawler');
{
  /* THIS SECTION READS THE SNAPSHOT, NOT THE JSON. Until Round 370 the
     prerenderer's document global dedupe silently deleted any repeated table
     cell: 21 of 126 labels and 70 of 126 counts were missing from
     /nba-grid/archive. Walked in DOCUMENT ORDER, and counting occurrences
     rather than distinct values, because crossings legitimately repeat across
     boards. */
  const stripP = /<p>(.*?)<\/p>/gs;
  const escHtml = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let controlFired = false;
  for (const s of present) {
    const sport = archive.sports[s.key];
    const { file, doc } = snapshotOf(sport);
    if (!doc) { fail(`${s.key}: no prerendered snapshot at ${file}, so nothing was served to a crawler`); continue; }
    let paras = [...doc.matchAll(stripP)].map(m => m[1]);
    if (CONTROL === 'dedupe') {
      /* Reproduce the pre Round 371 prerenderer: one document global Set, so
         the second and later occurrence of any identical paragraph is dropped. */
      const before = paras.length;
      const seenP = new Set();
      paras = paras.filter(x => (seenP.has(x) ? false : (seenP.add(x), true)));
      if (paras.length < before) controlFired = true;
    }
    const cells = sport.boards.flatMap(b => b.cells);
    const wanted = new Map();
    for (const c of cells) wanted.set(escHtml(`${c.row} and ${c.col}`), String(c.total));
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
  if (CONTROL === 'dedupe' && !controlFired) cannotRun('nothing repeated to dedupe');
}

section = 7;
console.log(`7) the newest board is within ${FRESH_DAYS} days of the day the file claims`);
{
  const claim = archive.generatedFor;
  const todayET = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(claim))) fail(`the file's generatedFor is "${claim}", not a date, so nothing it says about freshness can be checked`);
  else {
    const floor = addDays(claim, -FRESH_DAYS);
    for (const s of present) {
      const newest = archive.sports[s.key].boards.map(b => b.date).sort().slice(-1)[0];
      /* Information only: how far behind the clock the bake is. Asserting on
         it would turn this harness red on a schedule. */
      const behind = Math.round((Date.parse(todayET + 'T12:00:00Z') - Date.parse(newest + 'T12:00:00Z')) / 86400000);
      console.log(`   ${s.key}  newest board ${newest}, the file claims ${claim} (floor ${floor}); ${behind} days behind today in America/New_York`);
      if (!newest || newest < floor) fail(`${s.key}: the newest board is ${newest}, more than ${FRESH_DAYS} days before the ${claim} the file says it was generated for, so the archive stops short of its own claim`);
    }
  }
}

section = 8;
console.log('8) no cell lists the same player twice');
for (const s of present) {
  let repeats = 0;
  for (const b of archive.sports[s.key].boards) {
    for (const c of b.cells) {
      const seen = new Map();
      for (const n of c.answers) seen.set(n, (seen.get(n) || 0) + 1);
      for (const [n, times] of seen) {
        if (times < 2) continue;
        repeats += 1;
        const ids = new Set((cellValid.get(c) ?? []).filter(pl => pl.name === n).map(pl => String(pl.id)));
        if (repeats <= 3) {
          fail(ids.size < times
            ? `${s.key} ${b.date} ${c.row} x ${c.col}: "${n}" is listed ${times} times and is ${ids.size} player (id ${[...ids].join(', ') || 'unknown'})`
            : `${s.key} ${b.date} ${c.row} x ${c.col}: "${n}" is listed ${times} times for ${ids.size} namesakes, which reads as one man twice`);
        }
      }
    }
  }
  console.log(`   ${s.key}  ${repeats} cells list a name more than once`);
}

section = 9;
console.log('9) no listed name is malformed');
for (const s of present) {
  let bad = 0, names = 0;
  for (const b of archive.sports[s.key].boards) {
    for (const c of b.cells) {
      for (const n of c.answers) {
        names += 1;
        const why = malformedName(n);
        if (why) { bad += 1; if (bad <= 3) fail(`${s.key} ${b.date} ${c.row} x ${c.col}: "${n}" ${why}`); }
      }
    }
  }
  console.log(`   ${s.key}  ${names} names, ${bad} malformed`);
}

section = 10;
console.log('10) the saved copy states the range and the counts the data holds');
{
  const MONTH_DATE = '[A-Z][a-z]+ \\d{1,2}, \\d{4}';
  let controlFired = false;
  for (const s of present) {
    const sport = archive.sports[s.key];
    let { file, doc } = snapshotOf(sport);
    if (!doc) { fail(`${s.key}: no prerendered snapshot at ${file}`); continue; }
    const dates = sport.boards.map(b => b.date).sort();
    const oldest = longDate(dates[0]);
    const newest = longDate(dates[dates.length - 1]);
    if (CONTROL === 'copyrange' && !controlFired) {
      const was = `to ${newest}.`;
      const now = `to ${longDate(addDays(dates[dates.length - 1], -1))}.`;
      const i = doc.indexOf('These are the');
      const j = i < 0 ? -1 : doc.indexOf(was, i);
      if (j < 0) cannotRun(`the ${s.key} snapshot has no "These are the ... ${was}" sentence to move`);
      doc = doc.slice(0, j) + now + doc.slice(j + was.length);
      controlFired = true;
      console.log(`   NEGATIVE CONTROL ON: the ${s.key} copy now ends its range ${now.slice(3, -1)}, section 10 must go red`);
    }
    const texts = [...doc.matchAll(/<(p|h1|li)>([\s\S]*?)<\/\1>/g)].map(m => decode(m[2]));
    const sentence = texts.map(t => t.match(new RegExp(`These are the (\\d+) boards from (${MONTH_DATE}) to (${MONTH_DATE})\\.`))).find(Boolean);
    if (!sentence) { fail(`${s.key}: the saved page never says which boards it holds ("These are the N boards from ... to ...")`); continue; }
    const [, n, from, to] = sentence;
    if (Number(n) !== sport.boards.length) fail(`${s.key}: the copy says ${n} boards, the data holds ${sport.boards.length}`);
    if (from !== oldest || to !== newest) fail(`${s.key}: the copy says ${from} to ${to}, the data runs ${oldest} to ${newest}`);
    /* Any other range on the page, in either date shape, has to agree too. */
    let ranges = 0;
    for (const t of texts) {
      for (const m of t.matchAll(new RegExp(`from (${MONTH_DATE}|\\d{4}-\\d{2}-\\d{2}) to (${MONTH_DATE}|\\d{4}-\\d{2}-\\d{2})`, 'g'))) {
        ranges += 1;
        const a = /^\d{4}/.test(m[1]) ? longDate(m[1]) : m[1];
        const z = /^\d{4}/.test(m[2]) ? longDate(m[2]) : m[2];
        if (a !== oldest || z !== newest) fail(`${s.key}: the page says "${m[0]}", the data runs ${oldest} to ${newest}`);
      }
    }
    /* The board count the page states for each of the other archives. */
    let others = 0;
    for (const t of texts) {
      const m = t.match(/^(.+?) grid answers, (\d+) past boards/);
      if (!m) continue;
      const other = Object.values(archive.sports).find(x => x.label === m[1]);
      if (!other) { fail(`${s.key}: the page counts boards for "${m[1]}", which is not an archive`); continue; }
      others += 1;
      if (Number(m[2]) !== other.boards.length) fail(`${s.key}: the page says ${m[1]} has ${m[2]} past boards, its data holds ${other.boards.length}`);
    }
    if (others !== present.length - 1) fail(`${s.key}: the page states a board count for ${others} other archives, expected ${present.length - 1}`);
    console.log(`   ${s.key}  "${sentence[0]}" (${ranges} range${ranges === 1 ? '' : 's'} and ${others} other counts checked)`);
  }
  if (CONTROL === 'copyrange' && !controlFired) cannotRun('no snapshot to change');
}

section = 11;
console.log('11) every board heading is a written date, never an ISO one');
{
  let controlFired = false;
  for (const s of present) {
    const sport = archive.sports[s.key];
    let { file, doc } = snapshotOf(sport);
    if (!doc) { fail(`${s.key}: no prerendered snapshot at ${file}`); continue; }
    if (CONTROL === 'isoh2' && !controlFired) {
      const date = sport.boards[0].date;
      const was = `<h2>${sport.label} grid answers for ${longDate(date)}</h2>`;
      if (!doc.includes(was)) cannotRun(`the ${s.key} snapshot has no ${was} to rewrite`);
      doc = doc.replace(was, `<h2>${sport.label} grid answers for ${date}</h2>`);
      controlFired = true;
      console.log(`   NEGATIVE CONTROL ON: the ${s.key} heading for ${date} now carries the ISO date, section 11 must go red`);
    }
    const h2s = [...doc.matchAll(/<h2(?:\s[^>]*)?>([\s\S]*?)<\/h2>/g)].map(m => decode(m[1]));
    const iso = h2s.filter(t => /\d{4}-\d{2}-\d{2}/.test(t));
    for (const t of iso.slice(0, 3)) fail(`${s.key}: the heading "${t}" carries an ISO date`);
    const have = new Set(h2s);
    const missing = sport.boards.filter(b => !have.has(`${sport.label} grid answers for ${longDate(b.date)}`));
    for (const b of missing.slice(0, 3)) fail(`${s.key}: the board for ${b.date} has no "${sport.label} grid answers for ${longDate(b.date)}" heading`);
    console.log(`   ${s.key}  ${h2s.length} headings, ${iso.length} with an ISO date, ${sport.boards.length - missing.length} of ${sport.boards.length} boards under their written date`);
  }
  if (CONTROL === 'isoh2' && !controlFired) cannotRun('no snapshot to change');
}

console.log('');
const red = Object.keys(failures).map(Number).sort((a, b) => a - b);
const total = red.reduce((n, k) => n + failures[k], 0);
if (CONTROL) {
  const own = CONTROLS[CONTROL];
  const others = red.filter(k => k !== own);
  if (failures[own] > 0 && others.length === 0) {
    console.log(`simGridArchive control (${CONTROL}): green. Section ${own} caught it (${failures[own]} finding${failures[own] === 1 ? '' : 's'}) and no other section moved.`);
    process.exit(0);
  }
  if (!failures[own]) console.error(`simGridArchive control (${CONTROL}): RED. Section ${own} did not notice the planted fault.`);
  if (others.length) console.error(`simGridArchive control (${CONTROL}): RED. Section${others.length === 1 ? '' : 's'} ${others.join(', ')} also went red, so the control does not isolate section ${own} (a plain run must be green first).`);
  process.exit(1);
}
if (total > 0) { console.error(`simGridArchive: ${total} failure${total === 1 ? '' : 's'} in section${red.length === 1 ? '' : 's'} ${red.join(', ')}`); process.exit(1); }
console.log('simGridArchive: green. Every board is the real board, every answer would be accepted in the game, every count is of distinct players, and the page says what the data holds.');
