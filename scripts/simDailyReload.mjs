/* Daily reload harness: a finished daily survives a refresh and cannot be
   played again.

   Round 428. An audit found daily games where a finished daily was
   destroyed by a page refresh, the same daily was then replayable with the
   answer known, and every replay recorded a second completion and paid the
   score again (game_completions row, local totals, and for a signed in
   player user_scores.total_points; only daily_completions dedupes). Eleven
   of twelve investigated routes were confirmed plus four sibling hooks;
   /nba-stat-line was already right and is the positive control.

   The test is src/test/dailyReload.test.tsx. It discovers one driver per
   route from src/test/dailyReload/<slug>.driver.tsx (contract in
   src/test/dailyReload/driver.ts), mounts the REAL page or hook with the
   real useGameCompletion, the real restoredFinish handshake and jsdom's
   real localStorage, and runs five assertions per row: one dated record
   after the finish; a byte identical finished outcome after unmount and
   remount; every replay path refused with the record unchanged and no
   replay control offered; recordCompletion called exactly once across all
   of that; and a fresh daily, nothing thrown, nothing recorded, when the
   key holds each of the six wreckage forms scripts/sweepSaves.mjs writes.

   This wrapper refuses to pass unless vitest names the test file and prints
   the passed summary, prints one line per route, and then runs the two
   negative controls (house rule: prove the check can fail):
     DAILY_RELOAD_CONTROL=clear   drops every prefixed key between the
                                  unmount and the remount; assertion (2)
                                  must then FAIL on every row, with (1)
                                  still green so the red is the restore and
                                  not a load error
     DAILY_RELOAD_CONTROL=silent  makes markRestoredFinish a no-op;
                                  assertion (4) must then FAIL on every row
                                  whose restore depends on the mark (a
                                  handler restore) and stay green on every
                                  initializer row and on nba-stat-line,
                                  which sets its own already-played flag in
                                  the same batch. A probe test proves the
                                  stub fired even on a day with no mark
                                  dependent rows.
   Round 645 part three added seven rows that never locked (the NASCAR,
   Tennis and Combat chains, Pro Football Timeline, Pack Battle, Rarity
   Round) and a sixth assertion for the dailies that used to save only at the
   end (Buzzer Beater, Free Kick: a run walked away from on shot four was
   dealt again from shot one with every spray already seen; the chains, Pack
   Battle and Rarity Round the same way): settle part of the run, unmount,
   remount, and the board must be on the same step with the same score and
   count, record nothing on the way back, record exactly once when the rest
   is played, and end on the card step (1) ended on, since the driver plays
   the same moves split by the reload. A row opts in by exporting playSome
   and progress (see src/test/dailyReload/driver.ts). Its controls:
     DAILY_RELOAD_CONTROL=midrun  drops every prefixed key between the part
                                  played unmount and the remount; assertion
                                  (6) must then FAIL on every row that has it
                                  and every other assertion stay green
   and three that take a piece out of the CODE rather than the storage
   (src/test/dailyReload/mocks.ts), each counted per row so a red is proved
   to be the control's:
     nolock    one game's record is never read (DAILY_RELOAD_NOLOCK_SLUG,
               default football-timeline): (2) must FAIL on that row alone
               and every other row stay green
     nosave    the arcade engine's per shot save writes nothing: (6) must
               FAIL on every row it hit, (1) to (5) stay green, and every
               row it did not hit stay green
     restream  the arcade spray stream restarts from the top on a resume:
               (6) must FAIL on every row it hit (the split run ends on a
               different card), everything else green
   A seventh assertion covers the window between a step being decided and
   it landing (a ball in the air, a card turning over, an answer on its
   reveal): take one step, refresh before it lands, and the reloaded board
   must read exactly what one landed step reads. A row opts in with oneStep
   and interruptStep. Rows: Buzzer Beater, Free Kick, Pack Battle, Rarity
   Round, and the Soccer Career wall shot drill, the third game on the arcade
   engine, which banks into a career rather than recording (`records: false`,
   so assertion 4 requires no completion at all). Its control is a copy of
   the real Free Kick board with the per kick save moved to where the ball
   lands, the drills' Round 468 shape:
     landing   (7) must FAIL on free-kick alone, everything else green
   Round 645 part three fix: the fix pass gave assertion 6 to Minefield,
   Player Stock Market, Sports Millionaire, the Gauntlet draft, Sports Bingo
   and the tackle and glove save drills (the midrun control reaches every one
   of them), and assertion 7 to Sports Millionaire and the two new drill rows.
   Two more controls take the decided-step save out of a copy of the real
   module (DAILY_LOCK_SWAP in vitest.config.ts) so the step is filed where it
   lands again:
     lockin    (7) must FAIL on sports-millionaire alone
     drillland (7) must FAIL on the three drill rows alone
   (the landing control's leftover dist/.daily-reload-control folder is
   removed once these have run.)
   Then the source backstop: for every row that depends on the mark, the
   restoring file is read as code (comments and string contents stripped)
   and must call markRestoredFinish with the slug ahead of the finished
   state set in the same function; the same checker is then run on a copy
   with the call removed and must go red, or the check is dead.

   Run: node scripts/simDailyReload.mjs          (all rows)
        ONLY=nba-stat-line node scripts/simDailyReload.mjs
*/
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/test/dailyReload.test.tsx';
const ONLY = process.env.ONLY || '';
const ASSERTIONS = [1, 2, 3, 4, 5];

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };

/* vitest lives in this tree's node_modules, or in the main tree's when this
   runs from a worktree nested inside it: walk up, as node's own resolution
   does (the same rule scripts/simNoDoubleRecord.mjs follows). */
function findVitest() {
  for (let dir = ROOT; ; dir = path.dirname(dir)) {
    const p = path.join(dir, 'node_modules', 'vitest', 'vitest.mjs');
    if (fs.existsSync(p)) return p;
    if (path.dirname(dir) === dir) return null;
  }
}
const VITEST = findVitest();
if (!VITEST) abort('vitest is not installed anywhere above this tree, nothing can run');

function runVitest(extraEnv) {
  const r = spawnSync(
    process.execPath,
    [VITEST, 'run', TEST, '--reporter=verbose'],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ...extraEnv, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' }, maxBuffer: 64 * 1024 * 1024 },
  );
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

/* One parse for every run: the row descriptions the test prints, the
   per assertion marks from the verbose reporter, the two top level tests,
   and the summary line. */
function parse(out) {
  const rows = new Map();
  const top = {};
  for (const raw of out.split('\n')) {
    const line = raw.replace(/\r$/, '');
    let m = line.match(/^DAILY_RELOAD_ROW (\{.*\})\s*$/);
    if (m) {
      const info = JSON.parse(m[1]);
      rows.set(info.slug, { info, marks: {} });
      continue;
    }
    m = line.match(/^\s*([✓×↓])\s+\S*dailyReload\.test\.tsx > daily reload > (.+?) > \((\d)\)/);
    if (m) {
      if (!rows.has(m[2])) rows.set(m[2], { info: null, marks: {} });
      rows.get(m[2]).marks[Number(m[3])] = m[1];
      continue;
    }
    m = line.match(/^\s*([✓×↓])\s+\S*dailyReload\.test\.tsx > daily reload > (discovers drivers|markRestoredFinish is live|silent control: markRestoredFinish is a no-op)\b/);
    if (m) top[m[2]] = m[1];
  }
  const summaryLine = out.match(/Tests\s+(.+)/);
  const summary = summaryLine ? summaryLine[1].trim() : null;
  const passed = summary ? summary.match(/(\d+) passed/) : null;
  const failed = summary ? summary.match(/(\d+) failed/) : null;
  return {
    named: out.includes('dailyReload.test.tsx'),
    rows,
    top,
    summary,
    passed: passed ? Number(passed[1]) : 0,
    failed: failed ? Number(failed[1]) : 0,
  };
}

/* A row that resumes a part played run (playSome and progress exported)
   carries assertion 6 as well, and one that can be refreshed with a step
   decided but not landed (oneStep and interruptStep) carries 7; every other
   row has the five. */
const assertionsOf = row => [
  ...ASSERTIONS,
  ...(row.info && row.info.resumes ? [6] : []),
  ...(row.info && row.info.interrupts ? [7] : []),
];
const marksOf = row => assertionsOf(row).map(n => row.marks[n] || '?').join('');
const redOnes = row => assertionsOf(row).filter(n => row.marks[n] !== '✓').map(n => `(${n})`).join(' ');
const describe = info => `${info.restoreStyle} restore${info.usesRestoreMark ? ', mark dependent' : info.restoreStyle === 'handler' ? ', no mark needed' : ''}, ${info.payloadShape} payload${info.resumes ? ', resumes mid run' : ''}${info.interrupts ? ', keeps a step refreshed in flight' : ''}${info.records === false ? ', banks instead of recording' : ''}`;
const detailLines = out => out.split('\n').filter(l => /AssertionError|Error:|expected|×/.test(l)).slice(0, 14).map(l => '    ' + l.trim()).join('\n');

/* ------------------------------------------------------------ 1) the run */
console.log(`1) The real routes, rendered: a finished daily survives a refresh and refuses a replay${ONLY ? ` (ONLY=${ONLY})` : ''}`);
const main = runVitest({ DAILY_RELOAD_CONTROL: '' });
const parsed = parse(main.out);
if (!parsed.named) abort('vitest did not report on the test file at all, so nothing was checked:\n' + main.out.slice(-2000));
console.log(`   vitest exit ${main.code}, ${parsed.summary || 'no summary line'}`);
if (parsed.top['discovers drivers'] !== '✓') fail('the driver discovery test is not green (a malformed driver file, or ONLY names no row):\n' + detailLines(main.out));
if (parsed.top['markRestoredFinish is live'] !== '✓') fail('the restoredFinish handshake is not live in the normal run');
const rowList = [...parsed.rows.values()].filter(r => r.info);
if (rowList.length === 0) fail('no driver rows ran, so nothing was checked (add src/test/dailyReload/<slug>.driver.tsx)');
for (const row of rowList) {
  const allGreen = assertionsOf(row).every(n => row.marks[n] === '✓');
  console.log(`   ${row.info.slug}: ${allGreen ? 'green' : 'RED ' + redOnes(row)}  [${marksOf(row)}]  ${describe(row.info)}`);
  if (!allGreen) fail(`${row.info.slug} is red on ${redOnes(row)}`);
}
for (const [slug, row] of parsed.rows) if (!row.info) fail(`marks appeared for "${slug}" but the test printed no row description for it`);
const resumeRows = rowList.filter(r => r.info.resumes);
console.log(`   ${resumeRows.length} row(s) resume a part played run: ${resumeRows.map(r => r.info.slug).join(', ') || 'none'}`);
const interruptRows = rowList.filter(r => r.info.interrupts);
console.log(`   ${interruptRows.length} row(s) keep a step refreshed before it landed: ${interruptRows.map(r => r.info.slug).join(', ') || 'none'}`);
const expectedTests = rowList.reduce((n, row) => n + assertionsOf(row).length, 0) + 2;
if (main.code !== 0 || parsed.failed > 0 || parsed.passed !== expectedTests) {
  fail(`expected ${expectedTests} passed and none failed, vitest says: ${parsed.summary || 'nothing'}`);
  console.error(detailLines(main.out));
}

/* --------------------------------------------- 2) control: keys dropped */
console.log('2) NEGATIVE CONTROL clear: every prefixed key is dropped between the unmount and the remount, (2) must fail on every row');
{
  const run = runVitest({ DAILY_RELOAD_CONTROL: 'clear' });
  const p = parse(run.out);
  if (!p.named) abort('control cannot run: vitest did not report on the test file:\n' + run.out.slice(-2000));
  const rows = [...p.rows.values()].filter(r => r.info);
  if (rows.length !== rowList.length) fail(`control clear ran ${rows.length} row(s), the normal run ${rowList.length}`);
  let flipped = 0;
  for (const row of rows) {
    const finished = row.marks[1] === '✓';
    const restoreRed = row.marks[2] === '×';
    const dropped = new RegExp(`^DAILY_RELOAD_CLEAR ${row.info.slug} dropped ([1-9]\\d*) key`, 'm').test(run.out);
    console.log(`   ${row.info.slug}: [${marksOf(row)}] ${finished && restoreRed && dropped ? 'restore went red with the key gone, as designed' : 'DID NOT FLIP'}`);
    if (!finished) fail(`control clear: ${row.info.slug} did not even finish (1), so its red is a load error and not the check`);
    if (!dropped) fail(`control clear: ${row.info.slug} had no key to drop, the control changed nothing`);
    if (!restoreRed) fail(`control clear: ${row.info.slug} still restored with its key gone; the restore does not depend on storage, so a refresh is not what the test measures`);
    if (finished && restoreRed && dropped) flipped += 1;
  }
  console.log(`   ${flipped} of ${rows.length} row(s) flipped`);
}

/* ---------------------------------------- 3) control: the mark silenced */
console.log('3) NEGATIVE CONTROL silent: markRestoredFinish is a no-op, (4) must fail on every mark dependent row and stay green on every other');
{
  const run = runVitest({ DAILY_RELOAD_CONTROL: 'silent' });
  const p = parse(run.out);
  if (!p.named) abort('control cannot run: vitest did not report on the test file:\n' + run.out.slice(-2000));
  if (p.top['silent control: markRestoredFinish is a no-op'] !== '✓') fail('control silent: the probe says the stub did not swallow the mark, the control did not fire');
  else console.log('   probe: the stub swallowed a mark and the real handshake could not consume it, the control is live');
  const rows = [...p.rows.values()].filter(r => r.info);
  if (rows.length !== rowList.length) fail(`control silent ran ${rows.length} row(s), the normal run ${rowList.length}`);
  let flipped = 0;
  let held = 0;
  for (const row of rows) {
    const want = row.info.usesRestoreMark ? '×' : '✓';
    const got = row.marks[4] || '?';
    const restoredFine = [1, 2, 3].every(n => row.marks[n] === '✓');
    const asDesigned = got === want && restoredFine;
    const verdict = row.info.usesRestoreMark
      ? (got === '×' ? 'recorded again without the mark, as designed' : 'DID NOT FLIP')
      : (got === '✓' ? 'stayed green without the mark, as designed' : 'WENT RED without depending on the mark');
    console.log(`   ${row.info.slug}: [${marksOf(row)}] ${verdict}`);
    if (!restoredFine) fail(`control silent: ${row.info.slug} is red on ${[1, 2, 3].filter(n => row.marks[n] !== '✓').map(n => `(${n})`).join(' ')}; silencing the mark must only change whether the completion records`);
    if (got !== want) fail(`control silent: ${row.info.slug} (4) is ${got}, expected ${want} for a ${describe(row.info)}`);
    if (asDesigned) { if (row.info.usesRestoreMark) flipped += 1; else held += 1; }
  }
  const dependent = rows.filter(r => r.info.usesRestoreMark).length;
  console.log(`   ${flipped} of ${dependent} mark dependent row(s) flipped, ${held} of ${rows.length - dependent} other row(s) held`);
  if (dependent === 0) console.log('   no mark dependent rows today; the probe alone proves the stub, and the first Group A or Group C row will be the first to flip here');
}

/* ------------------------------------ 4) control: the mid run save dropped */
console.log('4) NEGATIVE CONTROL midrun: the part played record is dropped between the unmount and the remount, (6) must fail on every resuming row and everything else stay green');
{
  const run = runVitest({ DAILY_RELOAD_CONTROL: 'midrun' });
  const p = parse(run.out);
  if (!p.named) abort('control cannot run: vitest did not report on the test file:\n' + run.out.slice(-2000));
  const rows = [...p.rows.values()].filter(r => r.info);
  if (rows.length !== rowList.length) fail(`control midrun ran ${rows.length} row(s), the normal run ${rowList.length}`);
  let flipped = 0;
  let held = 0;
  for (const row of rows) {
    const others = ASSERTIONS.every(n => row.marks[n] === '✓');
    if (row.info.resumes) {
      const dropped = new RegExp(`^DAILY_RELOAD_MIDRUN ${row.info.slug} dropped ([1-9]\\d*) key`, 'm').test(run.out);
      const resumeRed = row.marks[6] === '×';
      const asDesigned = others && dropped && resumeRed;
      console.log(`   ${row.info.slug}: [${marksOf(row)}] ${asDesigned ? 'resume went red with the record gone, as designed' : 'DID NOT FLIP'}`);
      if (!others) fail(`control midrun: ${row.info.slug} is red on ${ASSERTIONS.filter(n => row.marks[n] !== '✓').map(n => `(${n})`).join(' ')}; dropping the mid run record must only change whether the run resumes`);
      if (!dropped) fail(`control midrun: ${row.info.slug} had no part played record to drop, the control changed nothing`);
      if (!resumeRed) fail(`control midrun: ${row.info.slug} still resumed with its record gone; the resume does not depend on storage, so a refresh is not what assertion 6 measures`);
      if (asDesigned) flipped += 1;
    } else {
      console.log(`   ${row.info.slug}: [${marksOf(row)}] ${others ? 'held, no mid run save to drop' : 'WENT RED without a mid run save'}`);
      if (!others) fail(`control midrun: ${row.info.slug} is red on ${redOnes(row)} with nothing dropped`);
      else held += 1;
    }
  }
  const resuming = rows.filter(r => r.info.resumes).length;
  console.log(`   ${flipped} of ${resuming} resuming row(s) flipped, ${held} of ${rows.length - resuming} other row(s) held`);
  if (resuming === 0) fail('no row resumes a part played run, so assertion 6 and this control checked nothing (the arcade rows export playSome and progress)');
}

/* --------------------- 5) code controls: a piece of the lock taken out */
/* Round 645 part three. The storage controls above prove each restore reads
   storage; these take one piece out of the real code path instead (mocks.ts)
   and count, per row, every time it changed something (DAILY_RELOAD_HITS).
   A row the control hit must go red on exactly the assertion that piece
   exists for, with the ones it cannot touch still green; a row it never hit
   must stay green throughout, so a red elsewhere is a real leak between
   rows rather than the control. A control that hit nothing changed nothing
   and fails the section. */
const CODE_CONTROLS = [
  {
    name: 'nolock',
    what: `one game's record is never read (${process.env.DAILY_RELOAD_NOLOCK_SLUG || 'football-timeline'}), (2) must fail on that row alone`,
    mustRed: [2],
    mustGreen: [1, 5],
    onlyRow: process.env.DAILY_RELOAD_NOLOCK_SLUG || 'football-timeline',
  },
  {
    name: 'nosave',
    what: "the arcade engine's per shot save writes nothing, (6) and (7) must fail on every row it hit",
    mustRed: [6, 7],
    mustGreen: [1, 2, 3, 4, 5],
  },
  {
    name: 'restream',
    what: 'the arcade spray stream restarts from the top on a resume, (6) must fail on every row it hit',
    mustRed: [6],
    mustGreen: [1, 2, 3, 4, 5],
  },
];
const hitsOf = out => {
  const hits = new Map();
  for (const m of out.matchAll(/DAILY_RELOAD_HITS (\S+) (\d+)/g)) hits.set(m[1], Number(m[2]));
  return hits;
};
let codeControlsRun = 0;
for (const ctl of CODE_CONTROLS) {
  console.log(`5.${codeControlsRun + 1}) NEGATIVE CONTROL ${ctl.name}: ${ctl.what}, and every row it did not hit stays green`);
  codeControlsRun += 1;
  if (ctl.onlyRow && ONLY && ONLY !== ctl.onlyRow) { console.log(`   skipped: ONLY=${ONLY} does not include ${ctl.onlyRow}`); continue; }
  const run = runVitest({ DAILY_RELOAD_CONTROL: ctl.name });
  const p = parse(run.out);
  if (!p.named) abort(`control ${ctl.name} cannot run: vitest did not report on the test file:\n` + run.out.slice(-2000));
  const hits = hitsOf(run.out);
  const rows = [...p.rows.values()].filter(r => r.info);
  if (rows.length !== rowList.length) fail(`control ${ctl.name} ran ${rows.length} row(s), the normal run ${rowList.length}`);
  let flipped = 0;
  let held = 0;
  for (const row of rows) {
    const n = hits.get(row.info.slug);
    if (n === undefined) { fail(`control ${ctl.name}: ${row.info.slug} printed no hit count, so nothing says whether the control touched it`); continue; }
    if (n > 0) {
      const wanted = ctl.mustRed.filter(a => assertionsOf(row).includes(a));
      const red = wanted.length > 0 && wanted.every(a => row.marks[a] === '×');
      const intact = ctl.mustGreen.every(a => row.marks[a] === '✓');
      console.log(`   ${row.info.slug}: [${marksOf(row)}] hit ${n} time(s), ${red && intact ? `went red on ${wanted.map(a => `(${a})`).join(' ')} as designed` : 'DID NOT FLIP AS DESIGNED'}`);
      if (wanted.length === 0) fail(`control ${ctl.name}: ${row.info.slug} was hit but has none of ${ctl.mustRed.map(a => `(${a})`).join(' ')}, so nothing could see it`);
      else if (!red) fail(`control ${ctl.name}: ${row.info.slug} was hit ${n} time(s) and ${wanted.map(a => `(${a})`).join(' ')} stayed green, so the assertion does not see this piece of the lock`);
      if (!intact) fail(`control ${ctl.name}: ${row.info.slug} is also red on ${ctl.mustGreen.filter(a => row.marks[a] !== '✓').map(a => `(${a})`).join(' ')}, which this control cannot touch`);
      if (ctl.onlyRow && row.info.slug !== ctl.onlyRow) fail(`control ${ctl.name}: ${row.info.slug} was hit, but the control targets ${ctl.onlyRow} alone`);
      if (red && intact) flipped += 1;
    } else {
      const allGreen = assertionsOf(row).every(a => row.marks[a] === '✓');
      console.log(`   ${row.info.slug}: [${marksOf(row)}] ${allGreen ? 'not hit, held' : 'WENT RED without being hit'}`);
      if (!allGreen) fail(`control ${ctl.name}: ${row.info.slug} is red on ${redOnes(row)} though the control never touched it`);
      else held += 1;
    }
  }
  const hitRows = rows.filter(r => (hits.get(r.info.slug) ?? 0) > 0).length;
  console.log(`   ${flipped} of ${hitRows} hit row(s) flipped, ${held} of ${rows.length - hitRows} other row(s) held`);
  if (hitRows === 0) fail(`control ${ctl.name} hit no row at all, so it changed nothing and proved nothing`);
  if (ctl.onlyRow && !ONLY && !rows.some(r => r.info.slug === ctl.onlyRow)) fail(`control ${ctl.name}: no row named ${ctl.onlyRow}`);
}

/* ------------------ 5.4) control: the save moved to where the ball lands */
/* Assertion 7 exists for one regression, the shape the career drills had
   since Round 468: the step filed when its flight lands, so a refresh during
   the flight hands a seen outcome back. No storage or mock control can make
   that shape, so this one is a copy of the real Free Kick board with its per
   kick save moved into the landing callback, served through
   DAILY_RELOAD_FREEKICK_BOARD (src/test/dailyReload/mocks.ts). Under dist,
   inside the project root, one folder per run, as simScoreShown stages its
   copies. It refuses to run unless both anchors are found exactly once and
   the copy differs from the board. */
console.log('5.4) NEGATIVE CONTROL landing: a copy of the Free Kick board that files each kick when the ball lands, (7) must fail on free-kick alone and every other row stay green');
if (ONLY && ONLY !== 'free-kick') console.log(`   skipped: ONLY=${ONLY} does not include free-kick`);
else {
  const boardFile = path.join(ROOT, 'src/components/free-kick/FreeKickBoard.tsx');
  const board = fs.readFileSync(boardFile, 'utf8').split('\r\n').join('\n');
  const SAVE = "    if (mode === 'daily') {\n      writeArcadeProgress(";
  const LAND = '    launch(() => {\n      setScore(s => s + r.points);\n';
  const once = (hay, needle) => hay.split(needle).length - 1 === 1;
  if (!once(board, SAVE) || !once(board, LAND)) abort(`control landing cannot run: FreeKickBoard.tsx no longer holds the per kick save (${once(board, SAVE)}) and the landing callback (${once(board, LAND)}) exactly once each`);
  const start = board.indexOf(SAVE);
  const end = board.indexOf('\n    }\n', start) + '\n    }\n'.length;
  const block = board.slice(start, end);
  if (!/writeArcadeProgress\(/.test(block) || block.split('\n').length > 12) abort('control landing cannot run: could not cut the per kick save out as one block');
  const moved = board.slice(0, start) + board.slice(end);
  const copySrc = moved.replace(LAND, '    launch(() => {\n' + block.split('\n').map(l => (l ? '  ' + l : l)).join('\n') + '      setScore(s => s + r.points);\n');
  if (copySrc === board || copySrc.split('writeArcadeProgress(').length !== board.split('writeArcadeProgress(').length) abort('control landing cannot run: the copy is the board, or lost or doubled the save');
  fs.mkdirSync(path.join(ROOT, 'dist', '.daily-reload-control'), { recursive: true });
  const dir = fs.mkdtempSync(path.join(ROOT, 'dist', '.daily-reload-control', 'landing-'));
  const copy = path.join(dir, 'FreeKickBoard.control.tsx');
  fs.writeFileSync(copy, copySrc);
  try {
    const run = runVitest({ DAILY_RELOAD_CONTROL: 'landing', DAILY_RELOAD_FREEKICK_BOARD: copy.replaceAll('\\', '/') });
    const p = parse(run.out);
    if (!p.named) abort('control landing cannot run: vitest did not report on the test file:\n' + run.out.slice(-2000));
    if (!/DAILY_RELOAD_BOARD_SWAP free-kick /.test(run.out)) fail('control landing: the test never loaded the copy, so it changed nothing');
    else console.log('   the copy was loaded in place of the real board');
    const rows = [...p.rows.values()].filter(r => r.info);
    if (rows.length !== rowList.length) fail(`control landing ran ${rows.length} row(s), the normal run ${rowList.length}`);
    let held = 0;
    for (const row of rows) {
      if (row.info.slug === 'free-kick') {
        const red = row.marks[7] === '×';
        const intact = [1, 2, 3, 4, 5, 6].every(a => row.marks[a] === '✓');
        console.log(`   free-kick: [${marksOf(row)}] ${red && intact ? 'went red on (7) alone, as designed' : 'DID NOT FLIP AS DESIGNED'}`);
        if (!row.info.interrupts) fail('control landing: the free-kick row carries no assertion 7');
        else if (!red) fail('control landing: free-kick stayed green on (7) with its save moved to the landing, so assertion 7 does not see the flight window');
        if (!intact) fail(`control landing: free-kick is also red on ${[1, 2, 3, 4, 5, 6].filter(a => row.marks[a] !== '✓').map(a => `(${a})`).join(' ')}, which moving the save cannot touch`);
      } else {
        const allGreen = assertionsOf(row).every(a => row.marks[a] === '✓');
        if (!allGreen) fail(`control landing: ${row.info.slug} is red on ${redOnes(row)} though only the Free Kick board was swapped`);
        else held += 1;
      }
    }
    console.log(`   ${held} of ${rows.length - 1} other row(s) held`);
    if (!rows.some(r => r.info.slug === 'free-kick')) fail('control landing: no free-kick row ran');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/* ------------- 5.5) swap controls: a step filed where it lands again */
/* Round 645 part three fix. The fix pass gave assertion 7 to three more
   boards: Sports Millionaire (an answer is decided when it is locked in, and
   the reveal is a second and a half of suspense and a flash) and the tackle
   and glove save drills beside the wall shot. The landing control above can
   only move Free Kick's save; these two take the decided-step save out of a
   copy of the real module, served through the DAILY_LOCK_SWAP alias in
   vitest.config.ts (a copy under dist, as the landing control stages its
   own), so the step is filed only when it lands, the shape each had before.
   (7) must go red on exactly the rows the module serves, with (1) to (6)
   still green there, and every other row must stay green. Each refuses to run
   unless its anchor occurs exactly once, in the code, and the copy proves it
   was loaded. */
const SWAP_CONTROLS = [
  {
    name: 'lockin',
    what: 'Sports Millionaire files an answer only once its reveal has landed',
    rows: ['sports-millionaire'],
    module: '@/pages/SportsMillionaire',
    file: 'src/pages/SportsMillionaire.tsx',
    anchor: "    fileClimb(right && currentIndex + 1 < LADDER_SIZE\n      ? { at: currentIndex + 1, lifelines, swap: swapped, visible: null, crowd: null, outcome: null }\n      : { at: currentIndex, lifelines, swap: swapped, visible: shownVisible(), crowd: crowdPoll, outcome: right ? 'million' : 'wrong' });\n",
  },
  {
    name: 'drillland',
    what: 'the career drills file a round only once it has landed',
    rows: ['career-drill-wallshot', 'career-drill-tackle', 'career-drill-gloves'],
    module: '@/components/soccer-career/DrillBoard',
    file: 'src/components/soccer-career/DrillBoard.tsx',
    anchor: "    if (mode === 'daily' && !savedRef.current) {\n      const rec = { score: score + r.points, count: count + (won ? 1 : 0), banked: false, rounds: Math.min(ROUNDS_PER_RUN, idx + 1), draws: rngRef.current.draws, fouls: fouls + (foul ? 1 : 0) };\n      writeDailyRecord(meta.slug, todayStr, rec);\n      setRecord(rec);\n    }\n",
  },
];
const stripForAnchor = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
let swapControlsRun = 0;
for (const ctl of SWAP_CONTROLS) {
  swapControlsRun += 1;
  console.log(`5.5.${swapControlsRun}) NEGATIVE CONTROL ${ctl.name}: ${ctl.what}, (7) must fail on ${ctl.rows.join(', ')} alone and every other row stay green`);
  if (ONLY && !ctl.rows.includes(ONLY)) { console.log(`   skipped: ONLY=${ONLY} is not one of its rows`); continue; }
  const src = fs.readFileSync(path.join(ROOT, ctl.file), 'utf8').split('\r\n').join('\n');
  const n = src.split(ctl.anchor).length - 1;
  if (n !== 1 || stripForAnchor(src).split(ctl.anchor).length - 1 !== 1) abort(`control ${ctl.name} cannot run: ${ctl.file} holds its anchor ${n} time(s), or not once in the code`);
  fs.mkdirSync(path.join(ROOT, 'dist', '.daily-reload-control'), { recursive: true });
  const dir = fs.mkdtempSync(path.join(ROOT, 'dist', '.daily-reload-control', `${ctl.name}-`));
  const copy = path.join(dir, path.basename(ctl.file).replace(/\.(tsx?)$/, '.control.$1'));
  const copySrc = src.replace(ctl.anchor, '') + `\nconsole.log('DAILY_RELOAD_SWAP_LOADED ${ctl.name}');\n`;
  if (copySrc.includes(ctl.anchor)) abort(`control ${ctl.name} cannot run: the copy still holds its anchor`);
  fs.writeFileSync(copy, copySrc);
  try {
    const run = runVitest({ DAILY_RELOAD_CONTROL: ctl.name, DAILY_LOCK_SWAP: JSON.stringify({ [ctl.module]: copy.replaceAll('\\', '/') }) });
    const p = parse(run.out);
    if (!p.named) abort(`control ${ctl.name} cannot run: vitest did not report on the test file:\n` + run.out.slice(-2000));
    if (!run.out.includes(`DAILY_RELOAD_SWAP_LOADED ${ctl.name}`)) fail(`control ${ctl.name}: the test never loaded the copy, so it changed nothing`);
    else console.log('   the copy was loaded in place of the real module');
    const rows = [...p.rows.values()].filter(r => r.info);
    if (rows.length !== rowList.length) fail(`control ${ctl.name} ran ${rows.length} row(s), the normal run ${rowList.length}`);
    let flipped = 0;
    let held = 0;
    for (const row of rows) {
      if (ctl.rows.includes(row.info.slug)) {
        const red = row.marks[7] === '×';
        const intact = [1, 2, 3, 4, 5, 6].every(a => row.marks[a] === '✓');
        console.log(`   ${row.info.slug}: [${marksOf(row)}] ${red && intact ? 'went red on (7) alone, as designed' : 'DID NOT FLIP AS DESIGNED'}`);
        if (!row.info.interrupts) fail(`control ${ctl.name}: ${row.info.slug} carries no assertion 7`);
        else if (!red) fail(`control ${ctl.name}: ${row.info.slug} stayed green on (7) with its step filed where it lands, so assertion 7 does not see the window`);
        if (!intact) fail(`control ${ctl.name}: ${row.info.slug} is also red on ${[1, 2, 3, 4, 5, 6].filter(a => row.marks[a] !== '✓').map(a => `(${a})`).join(' ')}, which moving the save cannot touch`);
        if (red && intact) flipped += 1;
      } else {
        const allGreen = assertionsOf(row).every(a => row.marks[a] === '✓');
        if (!allGreen) fail(`control ${ctl.name}: ${row.info.slug} is red on ${redOnes(row)} though only ${ctl.module} was swapped`);
        else held += 1;
      }
    }
    const targets = rows.filter(r => ctl.rows.includes(r.info.slug)).length;
    console.log(`   ${flipped} of ${targets} target row(s) flipped, ${held} of ${rows.length - targets} other row(s) held`);
    if (targets !== ctl.rows.length && !ONLY) fail(`control ${ctl.name}: expected rows ${ctl.rows.join(', ')}, ran ${targets} of them`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
try { fs.rmdirSync(path.join(ROOT, 'dist', '.daily-reload-control')); } catch { /* not empty or already gone */ }

/* ------------------------------------------- 6) the source backstop */
console.log('6) Source backstop: every mark dependent restore names markRestoredFinish(<slug>) ahead of its finished state set, as code');
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
/* Same length as the input, so an index found in the blanked text is valid
   in the comment stripped text it came from. */
function blankStrings(src) {
  let out = '';
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === "'" || c === '"' || c === '`') {
      out += c;
      i += 1;
      while (i < src.length && src[i] !== c) {
        if (src[i] === '\\' && i + 1 < src.length) { out += '  '; i += 2; continue; }
        out += src[i] === '\n' ? '\n' : ' ';
        i += 1;
      }
      if (i < src.length) { out += c; i += 1; }
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function markBeforeSet(code, slug, setter, binding = null) {
  const blanked = blankStrings(code);
  const setterBlanked = blankStrings(setter);
  const calls = [...blanked.matchAll(/\bmarkRestoredFinish\s*\(/g)];
  if (calls.length === 0) return { ok: false, why: 'no markRestoredFinish( call in the code (comments and strings excluded)' };
  const problems = [];
  for (const m of calls) {
    const open = m.index + m[0].length - 1;
    let depth = 0;
    let close = -1;
    for (let i = open; i < blanked.length; i += 1) {
      if (blanked[i] === '(') depth += 1;
      else if (blanked[i] === ')') { depth -= 1; if (depth === 0) { close = i; break; } }
    }
    if (close < 0) { problems.push('an unclosed markRestoredFinish('); continue; }
    const arg = code.slice(open + 1, close).trim();
    let resolved = null;
    const literal = arg.match(/^(['"`])(.*)\1$/);
    if (literal) resolved = literal[2];
    else if (/^[A-Za-z_$][\w$]*$/.test(arg)) {
      const def = code.match(new RegExp(`\\b${arg}\\s*=\\s*(['"\`])([^'"\`]+)\\1`));
      if (def) resolved = def[2];
      else if (binding) {
        /* A shared hook marks with its own parameter (useDailyPuzzle's
           markRestoredFinish(gameSlug)) and the page that calls it binds
           that name. The binding file must hand exactly one literal to the
           name and import the hook the mark lives in, so a page that binds
           it to another slug, or to two, or never calls the hook, is red. */
        const bound = [...new Set([...binding.code.matchAll(new RegExp(`\\b${arg}\\s*:\\s*(['"\`])([^'"\`]+)\\1`, 'g'))].map(x => x[2]))];
        if (bound.length === 1 && binding.importsRestore) resolved = bound[0];
      }
    }
    if (resolved !== slug) { problems.push(`markRestoredFinish(${arg}) does not resolve to '${slug}' (a literal, an identifier assigned that literal in the same file, or a parameter the driver's slugBoundIn file binds to exactly that literal while importing the restore module)`); continue; }
    const after = blanked.slice(close);
    const at = after.indexOf(setterBlanked);
    if (at < 0) { problems.push(`no ${setter} after markRestoredFinish(${arg})`); continue; }
    const between = after.slice(0, at);
    if (/\breturn\b/.test(between)) { problems.push(`a return sits between markRestoredFinish(${arg}) and ${setter}`); continue; }
    if (/\bfunction\b|=>\s*\{/.test(between)) { problems.push(`a new function starts between markRestoredFinish(${arg}) and ${setter}`); continue; }
    return { ok: true, gap: at, arg };
  }
  return { ok: false, why: problems.join('; ') };
}
{
  const dependent = rowList.filter(r => r.info.usesRestoreMark);
  if (dependent.length === 0) console.log('   no mark dependent rows today, nothing to read (this section starts working the day a handler restore row lands)');
  for (const row of dependent) {
    const { slug, restoreFile, finishedSetter, slugBoundIn } = row.info;
    if (!restoreFile || !finishedSetter) { fail(`${slug}: the driver names no restoreFile or finishedSetter, the backstop cannot read it`); continue; }
    const file = path.join(ROOT, restoreFile);
    if (!fs.existsSync(file)) { fail(`${slug}: ${restoreFile} does not exist`); continue; }
    const code = stripComments(fs.readFileSync(file, 'utf8').split('\r\n').join('\n'));
    let binding = null;
    if (slugBoundIn) {
      const boundFile = path.join(ROOT, slugBoundIn);
      if (!fs.existsSync(boundFile)) { fail(`${slug}: ${slugBoundIn} does not exist`); continue; }
      const restoreModule = path.basename(restoreFile).replace(/\.[cm]?[jt]sx?$/, '');
      const boundCode = stripComments(fs.readFileSync(boundFile, 'utf8').split('\r\n').join('\n'));
      binding = {
        file: slugBoundIn,
        code: boundCode,
        importsRestore: new RegExp(`from\\s*['"][^'"]*\\/${escapeRe(restoreModule)}['"]`).test(boundCode),
      };
    }
    const real = markBeforeSet(code, slug, finishedSetter, binding);
    if (!real.ok) { fail(`${slug}: ${restoreFile}: ${real.why}`); continue; }
    /* The inline negative: the same checker on a copy without the call
       must go red, or green above means "did not look". */
    const removed = code.replace(/\bmarkRestoredFinish\s*\([^)]*\)\s*;?/, '');
    if (removed === code) { fail(`${slug}: the backstop negative could not remove the mark call it just found`); continue; }
    const without = markBeforeSet(removed, slug, finishedSetter, binding);
    if (without.ok) { fail(`${slug}: the backstop stays green with the mark call removed, the check is dead`); continue; }
    /* The binding negative: the same binding file with its literal pointed
       at another slug must go red too, or the binding check did not look. */
    if (binding) {
      const pointed = binding.code.replace(new RegExp(`(\\b${real.arg}\\s*:\\s*)(['"\`])${escapeRe(slug)}\\2`), `$1$2not-${slug}$2`);
      if (pointed === binding.code) { fail(`${slug}: the binding negative could not move the literal it just found in ${slugBoundIn}`); continue; }
      const elsewhere = markBeforeSet(code, slug, finishedSetter, { ...binding, code: pointed });
      if (elsewhere.ok) { fail(`${slug}: the backstop stays green with ${slugBoundIn} binding ${real.arg} to another slug, the binding check is dead`); continue; }
    }
    console.log(`   ${slug}: ${restoreFile} marks '${slug}' ${real.gap} chars ahead of ${finishedSetter}${binding ? ` (as ${real.arg}, bound by ${slugBoundIn})` : ''}; red without the call${binding ? ', red with the binding pointed elsewhere' : ''}`);
  }
}

console.log('7) Every file that files a daily record reads the clock ONCE, pinned at mount');
{
  /* Round 428 part two, the defect this section exists for. A route dealt its
     puzzle from the date at mount and then called the clock AGAIN at write
     time. A session that crossed midnight ET therefore filed the old day's
     finished game under the NEW day's key, and the new day opened already
     finished with yesterday's board on screen: the player lost the day. It hit
     nine routes at once because they were each written from the same shape.
     Sections 1 to 4 cannot see it, because every one of their assertions runs
     inside a single pinned day.
     The rule that catches the next one: a file that writes a daily record must
     read the clock exactly once, and that read must be a mount pin. Which files
     those are is DERIVED from the source (anything writing a `<slug>-daily-`
     record), not from a list somebody remembered to update, so a game added
     tomorrow is checked the day it ships. */
  const CLOCK = /\b(getTodayET|getDailyDateET|getPollDayET)\s*\(\s*\)/g;
  const PIN = /\buseRef\s*\(\s*(getTodayET|getDailyDateET|getPollDayET|getTodayStr)\s*\(\s*\)\s*\)\s*\.current\b/;
  /* Round 645 part three, second fix: or the pin kept in the ref itself and
     taken again when a daily is dealt, so a Daily pressed after midnight
     deals, reads and files the new day (Minefield and Sports Millionaire,
     whose deal read the live clock while their record read the pin). Such a
     file may read the clock only INTO that ref: once to declare it and once
     per `<ref>.current = getTodayET()`. Any other read is the Round 428
     defect. Where a re-pin may sit (at a deal, never at a write) is behaviour,
     and src/test/dailyLockEdges.test.tsx [day-rekey] holds it. */
  const REF_PIN = /\bconst\s+(\w+)\s*=\s*useRef\s*\(\s*(getTodayET|getDailyDateET|getPollDayET|getTodayStr)\s*\(\s*\)\s*\)\s*;/;
  const repins = (code, ref) => (code.match(new RegExp(`\\b${ref}\\.current\\s*=\\s*(getTodayET|getDailyDateET|getPollDayET)\\s*\\(\\s*\\)`, 'g')) || []).length;
  /* Round 645 part three: the two arcade writers, the chain writer and the
     Pack Battle writer are wrappers over writeDailyRecord in src/lib, so the
     file that calls them is the file whose clock read matters. */
  const WRITES_A_DAILY = /\b(writeDailyRecord|saveDailyRecord|saveDailyResult|saveDailyBingo|saveDailyBingoProgress|saveDailyRun|saveDailyDraft|saveDailyProgress|saveDailyAttempt|writeArcadeRun|writeArcadeProgress|writeChainDaily|writePackDaily)\s*\(/;
  const roots = ['src/hooks', 'src/pages', 'src/components'];
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [p] : []);
  });
  const suspects = [];
  for (const root of roots) {
    const abs = path.join(ROOT, root);
    if (!fs.existsSync(abs)) continue;
    for (const file of walk(abs)) {
      const raw = fs.readFileSync(file, 'utf8');
      const code = blankStrings(stripComments(raw));
      if (!WRITES_A_DAILY.test(code)) continue;
      suspects.push({ rel: path.relative(ROOT, file).replaceAll('\\', '/'), code });
    }
  }
  if (suspects.length < 10) fail(`only ${suspects.length} file(s) write a daily record, which is too few to be the real set, so this section did not check anything`);
  let pinned = 0;
  let refPinned = 0;
  const allowedReads = code => {
    const ref = code.match(REF_PIN);
    return ref ? 1 + repins(code, ref[1]) : 1;
  };
  for (const { rel, code } of suspects) {
    const reads = code.match(CLOCK) || [];
    /* A file may read the clock through a local wrapper (useGuessTheNation's
       getTodayStr), so the pin is what is required, not the callee's name. */
    if (!PIN.test(code) && !REF_PIN.test(code)) {
      fail(`${rel} writes a daily record but never pins the day at mount (useRef(getTodayET()).current), so a session crossing midnight ET files the old day under the new date`);
      continue;
    }
    const allowed = allowedReads(code);
    if (reads.length > allowed) {
      fail(`${rel} reads the clock ${reads.length} times; a daily route reads it once, into the mount pin${allowed > 1 ? ` (and ${allowed - 1} time(s) more, into that pin, where it deals a daily)` : ''}, or the deal and the record can name different days`);
      continue;
    }
    pinned += 1;
    if (allowed > 1) refPinned += 1;
  }
  console.log(`   ${suspects.length} file(s) write a daily record, ${pinned} of them read the clock only into their pin (${refPinned} take the pin again where a daily is dealt)`);
  if (refPinned === 0) fail('no file takes its pin again where a daily is dealt, so the re-pin rule above checked nothing (Minefield and Sports Millionaire should)');
  /* The negative: a copy of one real file with a second clock read added back
     must go red, or green above means the check did not look. */
  const victim = suspects.find(s => PIN.test(s.code));
  if (!victim) fail('the section 7 negative has no pinned file to work from');
  else {
    const regressed = victim.code.replace(/\bwriteDailyRecord\s*\(([^,]+),\s*todayStr\b/, '$&_UNPINNED').replace('todayStr_UNPINNED', 'getTodayET()');
    const changed = regressed !== victim.code;
    const reReads = (regressed.match(CLOCK) || []).length;
    if (!changed) console.log('   (negative skipped: the sample file does not pass todayStr to writeDailyRecord, so nothing to unpin)');
    else if (reReads > 1) console.log(`   negative: ${victim.rel} with one write unpinned reads the clock ${reReads} times, which this section rejects`);
    else fail('the section 7 negative unpinned a write and the check stayed green, so it is dead');
  }
  /* The re-pin negative: a copy of a file that takes its pin again, with one
     write handed the clock instead of the pin, must go red too, or the extra
     reads the re-pin rule allows would hide the defect this section is for. */
  const repinned = suspects.find(s => !PIN.test(s.code) && REF_PIN.test(s.code) && allowedReads(s.code) > 1);
  if (!repinned) fail('the section 7 re-pin negative has no file that takes its pin again to work from');
  else {
    const ref = repinned.code.match(REF_PIN)[1];
    const write = new RegExp(`(${WRITES_A_DAILY.source.replace(/\\\($/, '')}\\s*\\(\\s*)${ref}\\.current\\b`);
    const regressed = repinned.code.replace(write, '$1getTodayET()');
    if (regressed === repinned.code) fail(`the section 7 re-pin negative found no write in ${repinned.rel} that is handed ${ref}.current`);
    else {
      const reReads = (regressed.match(CLOCK) || []).length;
      if (reReads > allowedReads(regressed)) console.log(`   re-pin negative: ${repinned.rel} with one write handed the clock reads it ${reReads} times against ${allowedReads(regressed)} allowed, which this section rejects`);
      else fail('the section 7 re-pin negative handed a write the clock and the check stayed green, so the re-pin allowance hides the defect');
    }
  }
}

if (failures > 0) {
  console.error(`\nsimDailyReload: ${failures} failure(s)`);
  process.exit(1);
}
console.log(`\nsimDailyReload: all green (${rowList.length} row(s), all ${4 + CODE_CONTROLS.length + 1 + SWAP_CONTROLS.length} controls fired)`);
