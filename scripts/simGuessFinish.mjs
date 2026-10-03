/**
 * Round 953 harness: the clue guessers and the chains end on the shared result
 * moment, and the moment plays once.
 *
 * WHAT IT CHECKS. It runs src/test/guessFinishMoment.test.tsx, which mounts the
 * real F1 driver board (the five clue guessers share its end block through
 * src/components/guess-finish/GuessFinish.tsx) and the chain finish for all
 * three chains, and reads every test's own result from vitest's JSON report:
 *   - a live win shows the board's own points in the pill, rains the confetti
 *     and keeps the answer line; every hint step (0 to 5 hints) shows exactly
 *     the score the board saved, not just the two ends of the ladder;
 *   - a live loss is quiet: loss state, 0 points, no confetti;
 *   - a reloaded daily, and a finished daily reopened from the menu after a
 *     live unlimited game, show settled, with the same facts and no confetti;
 *   - a chain's state follows its game's own badge table at every length 0 to
 *     25 (badge is a win, one link or more is close, the seed alone a loss),
 *     and the pill, headline and reason are the ones the board gave.
 * The baseline must be exactly 7 passing tests, so a test deleted or skipped
 * cannot leave the run green.
 *
 * CONTROLS. Each writes a broken copy of GuessFinish.tsx into a temp folder
 * (asserting first that its anchor is there exactly once and that the copy
 * differs), swaps it in through vitest.config.ts's NO_DOUBLE_SWAP alias, and
 * passes only if exactly the named tests go red and every other stays green.
 * src is never written.
 *   unkeyed     the live flag forgets which game it watched (any play counts)
 *   alwayslive  every finish plays, restored or not
 *   bands       a one link chain is called a loss
 *
 * MEASURED (2026-10-03, worktree r953, a machine at 100% CPU): baseline 7 of 7
 * green; unkeyed turned 1 test red, alwayslive 2, bands 1, each exactly the
 * test it targets. Nothing here is random, so one run is the whole
 * distribution; the timeouts are wide because the gate machine is often busy.
 *
 * Run: node scripts/simGuessFinish.mjs   (GUESS_FINISH_CONTROL=<name> runs one control only)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/test/guessFinishMoment.test.tsx';
const SOURCE = 'src/components/guess-finish/GuessFinish.tsx';
const ONLY_CONTROL = process.env.GUESS_FINISH_CONTROL || '';

const T = {
  liveWin: 'plays a live win with the points the board scored',
  ladder: 'walks every clue',
  liveLoss: 'plays a live loss quietly',
  reload: 'shows a reloaded daily settled',
  menu: 'keeps an old daily settled when it is reopened from the menu',
  bands: "follows each game's own badge bands",
  chainShow: 'shows the chain length, the badge the game earned',
};
const CONTROLS = {
  unkeyed: { from: 'return finished && gameKey !== null && playedKey === gameKey;', to: 'return finished && gameKey !== null && playedKey !== null;', red: [T.menu] },
  alwayslive: { from: 'return finished && gameKey !== null && playedKey === gameKey;', to: 'return finished;', red: [T.reload, T.menu] },
  bands: { from: "return chainLength > 0 ? 'close' : 'loss';", to: "return chainLength > 1 ? 'close' : 'loss';", red: [T.bands] },
};

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/* vitest lives in this tree's node_modules, or the main tree's from a worktree. */
function vitestBin() {
  for (let dir = ROOT; ; dir = path.dirname(dir)) {
    const p = path.join(dir, 'node_modules', 'vitest', 'vitest.mjs');
    if (fs.existsSync(p)) return p;
    if (path.dirname(dir) === dir) throw new Error('vitest not found above ' + ROOT);
  }
}

function run(label, swap) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'guess-finish-'));
  const report = path.join(dir, 'report.json');
  const env = { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' };
  if (swap) {
    const copy = path.join(dir, 'GuessFinish.tsx');
    fs.writeFileSync(copy, swap);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/guess-finish/GuessFinish': copy });
  }
  const args = [vitestBin(), 'run', TEST, '--reporter=json', '--outputFile.json=' + report, '--maxWorkers=1', '--no-file-parallelism', '--testTimeout=60000'];
  const res = spawnSync(process.execPath, args, { cwd: ROOT, env, encoding: 'utf8', timeout: 600000, maxBuffer: 32 * 1024 * 1024 });
  let results = [];
  try {
    const json = JSON.parse(fs.readFileSync(report, 'utf8'));
    results = json.testResults.flatMap(f => f.assertionResults.map(a => ({ name: a.fullName || a.title, status: a.status })));
  } catch (e) {
    fail(`${label}: no vitest report (${res.error ? res.error.message : (res.stderr || '').slice(-400)})`);
  }
  fs.rmSync(dir, { recursive: true, force: true });
  return results;
}

const red = results => results.filter(r => r.status !== 'passed').map(r => r.name);
const matches = (name, key) => name.includes(key);

const source = fs.readFileSync(path.join(ROOT, SOURCE), 'utf8').replace(/\r\n/g, '\n');

if (!ONLY_CONTROL) {
  console.log('1) baseline: the real board and the chain finish, every test green');
  const base = run('baseline');
  const passed = base.filter(r => r.status === 'passed').length;
  console.log(`   ${passed} of ${base.length} tests passed`);
  if (base.length !== 7) fail(`expected exactly 7 tests, found ${base.length}; a test was added, removed or skipped, update this harness with it`);
  if (passed !== base.length) fail('red at baseline: ' + red(base).join(' | '));
  for (const key of Object.values(T)) if (!base.some(r => matches(r.name, key))) fail(`no test named like "${key}"`);
}

const names = ONLY_CONTROL ? [ONLY_CONTROL] : Object.keys(CONTROLS);
console.log(`2) controls: ${names.join(', ')}`);
for (const name of names) {
  const c = CONTROLS[name];
  if (!c) { fail(`unknown control ${name}`); continue; }
  const count = source.split(c.from).length - 1;
  if (count !== 1) { fail(`control ${name}: its anchor is in ${SOURCE} ${count} times, not once, so it would prove nothing`); continue; }
  const swapped = source.replace(c.from, c.to);
  if (swapped === source) { fail(`control ${name} changed nothing`); continue; }
  const got = red(run(name, swapped));
  const want = c.red;
  const missing = want.filter(k => !got.some(n => matches(n, k)));
  const extra = got.filter(n => !want.some(k => matches(n, k)));
  console.log(`   ${name.padEnd(11)} turned ${got.length} test(s) red`);
  if (missing.length) fail(`control ${name} did not turn red: ${missing.join(' | ')}`);
  if (extra.length) fail(`control ${name} also turned red: ${extra.join(' | ')}`);
}

if (failures) {
  console.error(`\nsimGuessFinish: ${failures} failure(s).`);
  process.exit(1);
}
console.log(`\nsimGuessFinish: green. ${ONLY_CONTROL ? `Control ${ONLY_CONTROL} turned exactly its own test red.` : 'The clue guessers and chains end on the shared moment with the board\'s own score, a finish plays once and a restored one stays settled, the chain bands hold at every length, and every control turned exactly its own test red.'}`);
