/**
 * Round 953 harness: the clue guessers and the chains end on the shared result
 * moment, each board hands it its own facts, and the moment plays once.
 *
 * WHAT IT CHECKS. It runs three vitest files and reads every test's own result
 * from vitest's JSON report:
 *   src/test/guessFinishMoment.test.tsx
 *   - the real F1 driver board: a live win shows the board's points in the
 *     pill, rains the confetti and keeps the answer line; every hint step (0 to
 *     5 hints) shows exactly the score the board saved; a live loss is quiet; a
 *     reloaded daily, and a daily reopened from the menu after a live
 *     unlimited game, show settled with the same facts and no confetti;
 *   - useLiveFinish on its own: the menu forgets the game, so a live finish
 *     reopened under the same key stays settled, and a different game that
 *     arrives already finished stays settled;
 *   - the chain bands, read off each game's own badge table as a threshold at
 *     every length 0 to 25, and ChainFinishMoment drawing the facts it is given.
 *   src/test/guessFinishClueBoards.test.tsx
 *   - CBB program, F1 constructor, tennis player and NASCAR driver, each MOUNTED
 *     and played: a win after a miss shows the board's own "pts" line and the
 *     score it filed; a loss after a miss shows 0, the 0 it filed; a daily plays
 *     live and comes back settled on a reload with the same pill.
 *   src/test/guessFinishChainBoards.test.tsx
 *   - Tennis, NASCAR and Combat Chain, each MOUNTED (validator and leaderboard
 *     stubbed) and played: a give up on the starting name is a loss at 0, a
 *     wrong link after two is close at 2, a run to the first badge is a win
 *     under that badge; the pill is checked against the links the test added
 *     and the timeline the board drew, the Final Score against the score filed.
 * The baseline must be exactly 30 passing tests, so a test deleted or skipped
 * cannot leave the run green.
 *
 * CONTROLS. Each writes a broken copy of one source into a temp folder
 * (asserting first that its anchor is there exactly once and that the copy
 * differs; a board copy has its ./ imports pointed at its own folder by @/),
 * swaps it in through vitest.config.ts's NO_DOUBLE_SWAP alias, and passes only
 * if exactly the named tests go red and every other stays green. src is never
 * written.
 *   unkeyed        the live flag forgets which game it watched (any play counts)
 *   noclear        the menu never forgets the game it watched
 *   alwayslive     every finish plays, restored or not
 *   bands          a one link chain is called a loss
 *   chainoffbyone  NASCAR Chain hands the moment chain.length, not the links
 *   cbbscore       CBB program hands the moment the points still available
 *   boardlive      tennis player hands the moment live={true}
 *
 * MEASURED (2026-10-05, worktree r953 at 21f50321, a shared busy machine):
 * baseline 30 of 30 green; unkeyed turned 1 test red, noclear 1, alwayslive 8
 * (the F1 reload and menu tests, both hook tests, the four boards' reloads),
 * bands 1, chainoffbyone 3 (all three NASCAR Chain tests), cbbscore 1 (the CBB
 * loss), boardlive 1 (the tennis player reload), each exactly its named set.
 * Nothing here is random, so one run is the whole distribution; the timeouts
 * are wide because the gate machine is often busy.
 *
 * Run: node scripts/simGuessFinish.mjs   (GUESS_FINISH_CONTROL=<name> runs one control only)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TESTS = ['src/test/guessFinishMoment.test.tsx', 'src/test/guessFinishClueBoards.test.tsx', 'src/test/guessFinishChainBoards.test.tsx'];
const MOMENT = 'src/components/guess-finish/GuessFinish.tsx';
const EXPECTED_TESTS = 30;
const ONLY_CONTROL = process.env.GUESS_FINISH_CONTROL || '';

const CLUE = ['CBB Program', 'F1 Constructor', 'Tennis Player', 'NASCAR Driver'];
const CHAIN = ['Tennis Chain', 'NASCAR Chain', 'Combat Chain'];
const T = {
  liveWin: 'plays a live win with the points the board scored',
  ladder: 'walks every clue',
  liveLoss: 'plays a live loss quietly',
  reload: 'shows a reloaded daily settled',
  menu: 'keeps an old daily settled when it is reopened from the menu',
  hookMenu: 'forgets the game at the menu',
  hookKeyed: 'keeps a different game that arrives already finished settled',
  bands: "follows each game's own badge bands",
  chainShow: 'shows the chain length, the badge the game earned',
  ...Object.fromEntries(CLUE.flatMap(b => [
    [`${b}/win`, `${b}: a live win after a miss`], [`${b}/loss`, `${b}: a live loss after a miss`], [`${b}/reload`, `${b}: a daily plays live once`],
  ])),
  ...Object.fromEntries(CHAIN.flatMap(b => [
    [`${b}/giveup`, `${b}: giving up on the starting name`], [`${b}/close`, `${b}: a wrong link after two`], [`${b}/badge`, `${b}: a run to the first badge`],
  ])),
};
/* file: the source the control breaks; alias: the module id the tests import
   it by. A board copy lives in a temp folder, so its ./ imports are rewritten
   to the @/ path of the folder it came from. */
const CONTROLS = {
  unkeyed: { file: MOMENT, from: 'return finished && gameKey !== null && playedKey === gameKey;', to: 'return finished && gameKey !== null && playedKey !== null;', red: [T.hookKeyed] },
  noclear: { file: MOMENT, from: 'if (playedKey !== null) setPlayedKey(null);', to: '/* control: the menu never forgets */', red: [T.hookMenu] },
  alwayslive: { file: MOMENT, from: 'return finished && gameKey !== null && playedKey === gameKey;', to: 'return finished;', red: [T.reload, T.menu, T.hookMenu, T.hookKeyed, ...CLUE.map(b => T[`${b}/reload`])] },
  bands: { file: MOMENT, from: "return chainLength > 0 ? 'close' : 'loss';", to: "return chainLength > 1 ? 'close' : 'loss';", red: [T.bands] },
  chainoffbyone: { file: 'src/components/nascar-chain/NascarChainBoard.tsx', from: 'chainLength={chainLength}', to: 'chainLength={gameState.chain.length}', red: [T['NASCAR Chain/giveup'], T['NASCAR Chain/close'], T['NASCAR Chain/badge']] },
  cbbscore: { file: 'src/components/cbb-program/CbbProgramBoard.tsx', from: 'gamePath="/guess-cbb-team" score={score}', to: 'gamePath="/guess-cbb-team" score={pointsForCurrentClue}', red: [T['CBB Program/loss']] },
  boardlive: { file: 'src/components/tennis-player/TennisPlayerBoard.tsx', from: 'score={score} live={liveFinish}', to: 'score={score} live={true}', red: [T['Tennis Player/reload']] },
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

const aliasOf = file => '@/' + file.replace(/^src\//, '').replace(/\.tsx?$/, '');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n');
/* A copy outside its folder cannot reach its siblings by ./, so point them at the folder by alias. */
const relocate = (file, text) => text.replace(/from '\.\//g, `from '@/${path.posix.dirname(file).replace(/^src\//, '')}/`);

function run(label, swap) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'guess-finish-'));
  const report = path.join(dir, 'report.json');
  const env = { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' };
  if (swap) {
    const copy = path.join(dir, path.basename(swap.file));
    fs.writeFileSync(copy, swap.text);
    env.NO_DOUBLE_SWAP = JSON.stringify({ [aliasOf(swap.file)]: copy });
  }
  const args = [vitestBin(), 'run', ...TESTS, '--reporter=json', '--outputFile.json=' + report, '--maxWorkers=1', '--no-file-parallelism', '--testTimeout=60000'];
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

if (!ONLY_CONTROL) {
  console.log('1) baseline: the eight real boards, the hook and the chain finish, every test green');
  const base = run('baseline');
  const passed = base.filter(r => r.status === 'passed').length;
  console.log(`   ${passed} of ${base.length} tests passed`);
  if (base.length !== EXPECTED_TESTS) fail(`expected exactly ${EXPECTED_TESTS} tests, found ${base.length}; a test was added, removed or skipped, update this harness with it`);
  if (passed !== base.length) fail('red at baseline: ' + red(base).join(' | '));
  for (const key of Object.values(T)) if (!base.some(r => matches(r.name, key))) fail(`no test named like "${key}"`);
}

const names = ONLY_CONTROL ? [ONLY_CONTROL] : Object.keys(CONTROLS);
console.log(`2) controls: ${names.join(', ')}`);
for (const name of names) {
  const c = CONTROLS[name];
  if (!c) { fail(`unknown control ${name}`); continue; }
  const source = read(c.file);
  const count = source.split(c.from).length - 1;
  if (count !== 1) { fail(`control ${name}: its anchor is in ${c.file} ${count} times, not once, so it would prove nothing`); continue; }
  const swapped = source.replace(c.from, c.to);
  if (swapped === source) { fail(`control ${name} changed nothing`); continue; }
  const got = red(run(name, { file: c.file, text: relocate(c.file, swapped) }));
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
