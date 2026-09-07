/**
 * Round 495 harness: a daily is recorded AS IT GOES, and the record replays
 * the exact run.
 *
 * THE BUG. src/hooks/useDailyPuzzle.ts addGuess closed over the `guesses`
 * state array and rebuilt [...guesses, guess] from it. A handler that adds
 * more than one guess in a single tick therefore had every call build from
 * the SAME base, so only the last survived, and the synchronous write went
 * out from that same stale array. useTransferPath's addPlayer adds up to
 * three (the step, the target's own step when the new name also links to the
 * target, then the win) and useCareerGame's giveHint adds four in a forEach.
 *
 * Measured on the live site on 2026-09-06. The Transfer Path daily was
 * Antoine Griezmann to Moises Caicedo, optimal 2. Two names typed, the second
 * of which also linked to the target, so the chain auto closed at three
 * steps. The board said "Your path: 1 step" and paid 1000. The stored record
 * held one step and the win: the second name and the auto added target were
 * both gone. The true chain was three steps and is worth 900. The score card
 * and the shared score were both wrong, on every Transfer Path daily win.
 *
 * WHY A HARNESS AND NOT JUST THE FIX. This is the house rule from Round 468,
 * a daily is recorded as it goes rather than only when it ends, and nothing
 * was checking it. tsc cannot see a stale closure and neither can a render
 * sweep: the board LOOKED right, it was the record and the score that lied.
 * The suite drives the REAL hooks and reads jsdom's real localStorage, so it
 * measures the record a player's browser would actually hold.
 *
 * The oracle is the game's own scoring rule, 1000 less 100 per step past the
 * optimum: the suite plays a chain whose length it knows and requires the
 * paid score to be what that chain is worth, rather than trusting the board.
 *
 * Section 1 of the suite carries no game at all (three addGuess calls in one
 * tick, then a loop of four), so it holds for a daily written tomorrow, which
 * is the point: a check written for the two known callers cannot find the
 * third.
 *
 * NEGATIVE CONTROL: this script writes src/hooks/__control_useDailyPuzzle.ts,
 * a copy of the engine with the three pre 495 lines put back (the closure
 * reads in the guard and the append, and the deps array that memoized the
 * stale callback), and points the suite at it through the alias in
 * vitest.config.ts. ALL THREE sections must go red on it. Every rewrite
 * asserts the text it replaces is present first, because a control that
 * rewrites an absent string changes nothing and leaves green meaning "the
 * control did not fire".
 *
 * Run: node scripts/simDailyRecord.mjs
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/test/dailyRecord.test.tsx';
const ENGINE = path.join(ROOT, 'src/hooks/useDailyPuzzle.ts');
const CONTROL = path.join(ROOT, 'src/hooks/__control_useDailyPuzzle.ts');

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dailyrecord-'));
const cleanup = () => {
  try { fs.rmSync(CONTROL, { force: true }); } catch { /* best effort */ }
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ }
};
process.on('exit', cleanup);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { cleanup(); process.exit(1); });

/* The three lines Round 495 changed, and what stood there before. Verbatim,
   and each one asserted present before it is replaced. */
const REWRITES = [
  {
    what: 'the status guard',
    now: `      if (statusRef.current !== 'playing' || puzzle == null) return;`,
    before: `      if (gameStatus !== 'playing' || puzzle == null) return;`,
  },
  {
    what: 'the append',
    now: `      const newGuesses = [...guessesRef.current, guess];`,
    before: `      const newGuesses = [...guesses, guess];`,
  },
  {
    what: 'the deps array',
    now: `    [puzzle, puzzleIndex, isWon, isLost, maxGuesses, storageKey, todayStr],`,
    before: `    [guesses, gameStatus, puzzle, puzzleIndex, isWon, isLost, maxGuesses, storageKey, todayStr],`,
  },
];

/** Run the suite once; one row per test plus the RECORD| lines it printed. */
function runSuite(env) {
  const out = path.join(tmp, `report-${Math.random().toString(36).slice(2)}.json`);
  const r = spawnSync(
    process.execPath,
    /* Two reporters on purpose: json is the machine readable verdict, and the
       default one is the only way the RECORD| measurement lines reach this
       process at all (json alone swallows them). */
    ['node_modules/vitest/vitest.mjs', 'run', TEST, '--reporter=json', `--outputFile.json=${out}`, '--reporter=default'],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ...env, CI: '1', NO_COLOR: '1' }, maxBuffer: 32 * 1024 * 1024 },
  );
  const raw = (r.stdout || '') + (r.stderr || '');
  if (!fs.existsSync(out)) {
    console.error(raw.slice(-3000));
    return null;
  }
  const report = JSON.parse(fs.readFileSync(out, 'utf8'));
  const rows = [];
  rows.notes = [...raw.matchAll(/RECORD\| (.+)/g)].map(m => m[1].trim());
  for (const file of report.testResults || []) {
    for (const a of file.assertionResults || []) {
      rows.push({ title: (a.title || a.fullName || '').trim(), status: a.status, messages: (a.failureMessages || []).join('\n') });
    }
  }
  return rows;
}

/** The one line out of a vitest failure that says what actually differed. */
function detail(messages) {
  const line = messages.split('\n').map(s => s.trim())
    .find(s => s && !s.startsWith('AssertionError:') && !s.startsWith('at ') && !s.startsWith('❯'));
  return (line || messages.split('\n')[0] || '').slice(0, 200);
}

const sectionOf = title => Number((title.match(/^\((\d)\)/) || [])[1] || 0);

console.log('Round 495: a daily is recorded as it goes, over the REAL hooks and real localStorage');
console.log(`   suite: ${TEST}`);

/* ------------------------------------------------------ A) the shipped code */
console.log('');
console.log('A) the shipped engine');
const live = runSuite({ DAILY_RECORD_CONTROL: '' });
if (!live) {
  console.error('  FAIL: the suite produced no report at all, so nothing here was measured');
  process.exit(1);
}
if (live.length !== 3) fail(`expected 3 sections, the suite reported ${live.length}`);
for (const row of live) {
  console.log(`   ${row.status === 'passed' ? 'pass' : 'FAIL'}  ${row.title}`);
  if (row.status !== 'passed') fail(`${row.title}: ${detail(row.messages)}`);
}
for (const n of live.notes) console.log('     ' + n);

/* The measurement that names the defect, read out of the suite's own log so
   the number in this output is one the run produced and not one written here. */
const scored = live.notes.find(n => n.startsWith('replayed from the record:'));
if (!scored) fail('the suite printed no replay line, so section 2 did not measure the record');
else if (!/score 900$/.test(scored)) fail(`the replayed score is not 900: ${scored}`);

/* ------------------------------------------------- B) the negative control */
console.log('');
console.log('B) NEGATIVE CONTROL stale: the pre 495 closure reads put back, all three sections must go RED');
{
  const engine = fs.readFileSync(ENGINE, 'utf8').split('\r\n').join('\n');
  let control = engine;
  for (const rw of REWRITES) {
    if (!control.includes(rw.now)) {
      fail(`the control cannot rewrite ${rw.what}: the line it replaces is not in ${path.relative(ROOT, ENGINE)}. The engine changed shape, so update REWRITES in this file rather than deleting the control.`);
      control = null;
      break;
    }
    control = control.split(rw.now).join(rw.before);
  }
  if (control === null) {
    console.error('  the control did not run');
  } else if (control === engine) {
    fail('the control rewrote nothing, so a green run above proves nothing');
  } else {
    fs.writeFileSync(CONTROL, control);
    console.log(`   wrote ${path.relative(ROOT, CONTROL)} with ${REWRITES.length} line(s) reverted: ${REWRITES.map(r => r.what).join(', ')}`);

    const ctl = runSuite({ DAILY_RECORD_CONTROL: 'stale' });
    if (!ctl) fail('the control run produced no report, so the control did not fire');
    else if (ctl.length !== live.length) fail(`the control ran ${ctl.length} section(s), the shipped run ${live.length}`);
    else {
      let flipped = 0;
      for (const row of ctl) {
        const red = row.status !== 'passed';
        console.log(`   ${red ? 'RED as designed' : 'DID NOT FLIP '}  ${row.title}`);
        if (red) { flipped += 1; console.log(`     -> ${detail(row.messages)}`); }
        else fail(`control stale: ${row.title} stayed green with the stale closure back, so section ${sectionOf(row.title)} does not measure the collapse`);
      }
      console.log(`   ${flipped} of ${ctl.length} section(s) flipped`);
    }
    fs.rmSync(CONTROL, { force: true });
  }
}

if (failures > 0) {
  console.error(`\nsimDailyRecord: ${failures} failure(s)`);
  process.exit(1);
}
console.log('\nsimDailyRecord: all green (3 sections, the control fired on every one)');
