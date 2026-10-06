/* Round 1014: runs the full season's two vitest files (src/test/aussieRulesLeague.test.ts, the
   engine and the hook, and src/test/aussieRulesLeagueBoard.test.tsx, the board and the page) so
   runAllSims covers them. No other harness runs them.

   AUSSIE_LEAGUE_BOARD_CONTROL=<name> copies the board or the hook with one asserted statement
   changed (the anchor must occur exactly once and the copy must differ), swaps the copy in
   through NO_DOUBLE_SWAP (vitest.config.ts), and runs only the test that binds it plus one
   independent engine test. A control passes only when that test fails on a real assertion and
   the independent test passes. Never reads or writes the live database. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/* Run from a git worktree, node_modules sits in the main checkout (resolved by walk-up). */
const vitestBin = [root, path.resolve(root, '../../..')].map(dir => path.join(dir, 'node_modules/vitest/vitest.mjs')).find(file => existsSync(file));
assert.ok(vitestBin, 'vitest must be installed');
const BOARD = 'src/components/aussie-rules-manager/AussieRulesLeagueBoard.tsx', HOOK = 'src/hooks/useAussieRulesLeague.ts';
const FILES = ['src/test/aussieRulesLeague.test.ts', 'src/test/aussieRulesLeagueBoard.test.tsx'];
const TOTAL = 15;
const independent = 'starts 18 fixed clubs of 36 generated players with unique names and a readable save';
const controls = {
  /* The hub after the flag (review fix #6/#11): a stale panel from the match hid the premiership. */
  afterflag: { file: BOARD, anchor: 'const panel = view.moment === moment ? view.panel : null;', replacement: 'const panel = view.panel;', test: 'shows the premiership on the hub when you wrap up the season from the match panel' },
  /* The switching read: the board must say what the opponent really played, not its usual style. */
  lastquarter: { file: BOARD, anchor: 'opponentPlays(state.seed, state.season, { ...match, quarter: match.quarter - 1 }, clubOf(state, other)!.style)', replacement: 'clubOf(state, other)!.style', test: 'shows the read before a quarter and what the opponent really played after it' },
  refusal: { file: BOARD, anchor: 'if (reason) { setRefusal(reason); return; }', replacement: 'if (reason) { return; }', test: 'refuses a draft pick that would leave your list short of rucks, and says why' },
  completion: { file: HOOK, anchor: "useGameCompletion(SLUG, state?.phase === 'seasonOver', undefined);", replacement: "useGameCompletion(SLUG, state?.phase === 'summer', undefined);", test: 'records one completion for each finished season and stays quiet when a finished season is restored' },
};
const control = process.env.AUSSIE_LEAGUE_BOARD_CONTROL || '';
assert.ok(!control || control in controls, `unknown control ${control}`);
const started = Date.now();
let folder;
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', DEBUG_PRINT_LIMIT: '1200' };
  delete env.NO_DOUBLE_SWAP;
  /* Whole seasons play inside some tests: a loaded machine must not turn a timeout into a red. */
  const args = [vitestBin, 'run', ...FILES, '--reporter=verbose', '--testTimeout=120000'];
  if (control) {
    const spec = controls[control];
    const source = (await readFile(path.join(root, spec.file), 'utf8')).replace(/\r\n/g, '\n');
    assert.equal(source.split(spec.anchor).length - 1, 1, `control ${control}: the anchor must occur exactly once in ${spec.file}`);
    const changed = source.replace(spec.anchor, spec.replacement)
      .replace("'./AussieRulesManagerBoard.module.css'", "'@/components/aussie-rules-manager/AussieRulesManagerBoard.module.css'")
      .replace("'./AussieRulesLeagueBoard.module.css'", "'@/components/aussie-rules-manager/AussieRulesLeagueBoard.module.css'");
    assert.notEqual(source.replace(spec.anchor, spec.replacement), source, `control ${control} must change the code`);
    await mkdir(path.join(root, '.sim-control'), { recursive: true });
    folder = await mkdtemp(path.join(root, '.sim-control/aussie-league-board-'));
    const copy = path.join(folder, path.basename(spec.file));
    await writeFile(copy, changed);
    const id = '@/' + spec.file.replace(/^src\//, '').replace(/\.tsx?$/, '');
    env.NO_DOUBLE_SWAP = JSON.stringify({ [id]: copy });
    args.push('-t', `${spec.test}|${independent}`);
  }
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 600000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`, tail = output.slice(-2500);
  process.stdout.write(output);
  assert.ok(!run.error, `${String(run.error)}\n${tail}`);
  for (const file of FILES) assert.ok(output.includes(path.basename(file)), `${file} must execute`);
  assert.doesNotMatch(output, /Failed to resolve|Cannot find module|Unhandled Errors/, 'a resolver failure cannot earn credit');
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (control) {
    const spec = controls[control];
    assert.notEqual(run.status, 0, tail);
    assert.match(output, new RegExp(`Tests\\s+1 failed.*1 passed.*${TOTAL - 2} skipped`), tail);
    assert.ok(output.split('\n').some(line => line.includes('FAIL ') && line.includes(spec.test)), 'the named test must fail');
    assert.ok(!output.split('\n').some(line => line.includes('FAIL ') && line.includes(independent)), 'the independent engine test must pass');
    assert.match(output, /AssertionError|expect\(/, 'a real assertion must fail, not a crash');
    console.log(`simAussieRulesLeagueBoard ${control}: RED as intended, "${spec.test}" fails and the independent engine test passes (${seconds} s)`);
  } else {
    assert.equal(run.status, 0, tail);
    assert.match(output, new RegExp(`Tests\\s+${TOTAL} passed`), tail);
    console.log(`simAussieRulesLeagueBoard: all ${TOTAL} engine, hook, board and page tests passed (${seconds} s)`);
  }
} finally {
  if (folder) await rm(folder, { recursive: true, force: true });
}
