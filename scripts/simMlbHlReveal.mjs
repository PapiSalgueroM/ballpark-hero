/* Actual MLB hook reveals, exact original saves and asserted timer copies. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hook = 'src/hooks/useMlbHL.ts';
const daily = 'holds original ten-round daily 325 exact saves once completion and quiet restore';
const unlimited = 'holds original ten-round Unlimited 325 pairs and no daily save or completion';
const mode = 'cancels an abandoned Unlimited reveal before a fresh mode run can score or skip';
const hard = 'cancels the previous Unlimited reveal before Hard resets its pairs and score';
const unmount = 'clears the exact owned reveal on unmount without executing late callback work';
const stale = 'rejects a delivered obsolete callback without clearing the newer accepted reveal';
const duration = 'retains the original 2000ms reveal and one timer through quiet rerenders';
const ties = 'preserves either-side correctness for an actual tied career home-run pair';
const controls = {
  mode: { edits: [["const switchMode = useCallback((m: MlbHLMode) => {\n    cancelReveal();", "const switchMode = useCallback((m: MlbHLMode) => {"]], test: mode },
  hard: { edits: [['const toggleHard = useCallback(() => {\n    cancelReveal();', 'const toggleHard = useCallback(() => {']], test: hard },
  unmount: { edits: [['useEffect(() => cancelReveal, [cancelReveal]);', 'useEffect(() => () => {}, [cancelReveal]);']], test: unmount },
  clear: { edits: [['if (revealTimer.current !== null) clearTimeout(revealTimer.current);', 'void revealTimer.current;']], test: mode },
  stale: { edits: [['if (version !== revealVersion.current) return;', 'void version;']], test: stale },
  duration: { edits: [['}, 2000);', '}, 1000);']], test: duration },
  ties: { edits: [["const correct = tie || (choice === 'left'", "const correct = (choice === 'left'"]], test: ties },
  save: { edits: [["if (mode === 'daily') addDailyAction({ t: 'result', correct });", 'void addDailyAction;']], test: daily, baseline: unlimited },
};
const control = process.env.MLB_REVEAL_CONTROL || '';
assert.ok(!control || control in controls, 'Known MLB reveal control');
const held = [];
for (const file of [hook, 'src/hooks/useDailyPuzzle.ts', 'src/hooks/useGameCompletion.ts', 'src/data/mlbHLPlayers.ts', 'src/lib/higherLowerScore.ts', 'src/lib/dateUtils.ts', 'src/lib/restoredFinish.ts']) {
  const bytes = await readFile(path.join(root, file));
  held.push(() => readFile(path.join(root, file)).then(current => assert.deepEqual(current, bytes, 'Actual MLB and shared baseline bytes held')));
}
let folder;
const owned = [];
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  folder = await mkdtemp(path.join(root, '.sim-control/mlb-reveal-'));
  const env = { ...process.env, FORCE_COLOR: '0' }; delete env.NO_DOUBLE_SWAP;
  const reportFile = path.join(folder, 'report.json'); owned.push(reportFile);
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/mlbHlReveal.test.tsx', '--reporter=verbose', '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'];
  if (control) {
    const spec = controls[control];
    const source = (await readFile(path.join(root, hook), 'utf8')).replace(/\r\n/g, '\n');
    let changed = source;
    for (const [anchor, replacement] of spec.edits) {
      assert.equal(changed.split(anchor).length - 1, 1, 'Executable mutation anchor occurs exactly once');
      changed = changed.replace(anchor, replacement);
    }
    assert.notEqual(changed, source);
    const copy = path.join(folder, 'useMlbHL.ts'); await writeFile(copy, changed); owned.push(copy);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/hooks/useMlbHL': copy });
    args.push('--testNamePattern', spec.test + '|' + (spec.baseline || daily));
  }
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024 });
  const output = (run.stdout || '') + '\n' + (run.stderr || ''); process.stdout.write(output);
  assert.ok(!run.error && !run.signal, 'Runner finishes normally');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|STACK_TRACE_ERROR|\bRPC\b|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed/, 'No runner fault earns outcome credit');
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  const rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, 10, 'All ten actual cases collect');
  if (control) {
    const spec = controls[control];
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, 1); assert.equal(report.numPassedTests, 1); assert.equal(report.numPendingTests, 8);
    const intended = rows.filter(row => row.title === spec.test);
    assert.equal(intended.length, 1); assert.equal(intended[0].status, 'failed');
    const messages = intended[0].failureMessages.join('\n');
    assert.match(messages, /AssertionError:/, 'Intended row fails its actual outcome assertion');
    assert.equal(rows.find(row => row.title === (spec.baseline || daily))?.status, 'passed', 'Independent original scoring and save outcome stays green');
    console.log(`simMlbHlReveal ${control}: one intended assertion fails, one original ten-round baseline passes, eight cases explicitly skipped.`);
    console.log('MLB_REVEAL_RECEIPT: ' + JSON.stringify({ control, intended: spec.test, failed: 1, independentPassed: 1, skipped: 8, messages }));
  } else {
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, 10); assert.equal(report.numFailedTests, 0); assert.equal(report.numPendingTests, 0);
    console.log('simMlbHlReveal: ten actual hook outcomes pass.');
    console.log('simMlbHlReveal: original Daily and Unlimited325, exact immediate save, once booking and quiet restore.');
    console.log('simMlbHlReveal: canceled mode, Hard and unmount reveals, stale callback, original2000ms and actual ties.');
  }
} finally {
  for (const file of owned) await rm(file, { force: true });
  if (folder) await rmdir(folder);
  for (const verify of held) await verify();
}
console.log('simMlbHlReveal: source bytes held, owned copies and report cleaned.');
