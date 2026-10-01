/* Actual remaining Higher or Lower hooks and asserted reveal ownership copies. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const names = ['Afl', 'Cfb', 'F1', 'Golf', 'Hockey', 'Nba', 'Nfl', 'Tennis'];
const hooks = names.map(name => `src/hooks/use${name}HL.ts`);
const daily = 'holds original whole-game Daily325 exact saves once booking and quiet restore';
const unlimited = 'holds original whole-game Unlimited325 player objects RNG and no daily booking';
const mode = 'cancels abandoned mode reveal without scoring or skipping a fresh run';
const hard = 'cancels previous reveal before Hard replaces its pairs and score';
const unmount = 'clears the exact owned reveal at unmount with no late callback work';
const stale = 'rejects a delivered obsolete callback without clearing a newer accepted reveal';
const duration = 'retains original2000ms and one owned timer through quiet rerenders';
const controls = {
  mode: { edits: name => [[`const switchMode = useCallback((m: ${name}HLMode) => {\n    cancelReveal();`, `const switchMode = useCallback((m: ${name}HLMode) => {`]], test: mode },
  hard: { edits: () => [['const toggleHard = useCallback(() => {\n    cancelReveal();', 'const toggleHard = useCallback(() => {']], test: hard },
  unmount: { edits: () => [['useEffect(() => cancelReveal, [cancelReveal]);', 'useEffect(() => () => {}, [cancelReveal]);']], test: unmount },
  clear: { edits: () => [['if (revealTimer.current !== null) clearTimeout(revealTimer.current);', 'void revealTimer.current;']], test: mode },
  stale: { edits: () => [['if (version !== revealVersion.current) return;', 'void version;']], test: stale },
  duration: { edits: () => [['}, 2000);', '}, 1000);']], test: duration },
  save: { edits: () => [["if (mode === 'daily') addDailyAction({ t: 'result', correct });", 'void addDailyAction;']], test: daily, baseline: unlimited },
};
const control = process.env.HL_REVEAL_CONTROL || '';
assert.ok(!control || control in controls, 'Known Higher or Lower reveal control');
const held = [];
for (const file of [...hooks, 'src/data/aflGoalKickers.ts', 'src/data/cfbHLPlayers.ts', 'src/data/f1HLDrivers.ts', 'src/data/golfLegends.ts', 'src/data/hockeyHLPlayers.ts', 'src/data/nbaHLPlayers.ts', 'src/data/nflHLCategories.ts', 'src/data/tennisHLPlayers.ts', 'src/hooks/useDailyPuzzle.ts', 'src/hooks/useGameCompletion.ts', 'src/lib/higherLowerScore.ts', 'src/lib/dateUtils.ts', 'src/lib/firstDraw.ts', 'src/lib/restoredFinish.ts', 'src/hooks/useMlbHL.ts']) {
  const bytes = await readFile(path.join(root, file));
  held.push(() => readFile(path.join(root, file)).then(current => assert.deepEqual(current, bytes, 'Actual hook and original shared baseline bytes held')));
}
let folder;
const owned = [];
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  folder = await mkdtemp(path.join(root, '.sim-control/hl-reveal-'));
  const env = { ...process.env, FORCE_COLOR: '0' }; delete env.NO_DOUBLE_SWAP;
  const reportFile = path.join(folder, 'report.json'); owned.push(reportFile);
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/higherLowerReveal.test.tsx', '--reporter=verbose', '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'];
  if (control) {
    const spec = controls[control], swaps = {};
    for (const [i, hook] of hooks.entries()) {
      const source = (await readFile(path.join(root, hook), 'utf8')).replace(/\r\n/g, '\n');
      let changed = source;
      for (const [anchor, replacement] of spec.edits(names[i])) {
        assert.equal(changed.split(anchor).length - 1, 1, 'Executable mutation anchor occurs exactly once in each actual hook');
        changed = changed.replace(anchor, replacement);
      }
      assert.notEqual(changed, source, 'Each copied hook is effectively changed');
      const copy = path.join(folder, `use${names[i]}HL.ts`); await writeFile(copy, changed); owned.push(copy);
      swaps[`@/hooks/use${names[i]}HL`] = copy;
    }
    env.NO_DOUBLE_SWAP = JSON.stringify(swaps);
    args.push('--testNamePattern', spec.test + '|' + (spec.baseline || daily));
  }
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024 });
  const output = (run.stdout || '') + '\n' + (run.stderr || ''); process.stdout.write(output);
  assert.ok(!run.error && !run.signal, 'Runner finishes normally');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|STACK_TRACE_ERROR|\bRPC\b|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed/, 'No runner fault earns outcome credit');
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  const rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, 72, 'All nine actual cases for all eight hooks collect');
  if (control) {
    const spec = controls[control], messages = {};
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, 8); assert.equal(report.numPassedTests, 8); assert.equal(report.numPendingTests, 56);
    for (const name of names) {
      const group = rows.filter(row => row.ancestorTitles.includes(name + ' Higher or Lower reveal ownership'));
      assert.equal(group.length, 9, 'Every hook contributes exactly its original nine cases');
      const intended = group.filter(row => row.title === spec.test);
      assert.equal(intended.length, 1); assert.equal(intended[0].status, 'failed');
      messages[name] = intended[0].failureMessages.join('\n');
      assert.match(messages[name], /AssertionError:/, 'Each intended row fails its actual outcome assertion');
      assert.equal(group.find(row => row.title === (spec.baseline || daily))?.status, 'passed', 'Each independent original whole-game scoring and save outcome stays green');
      assert.equal(group.filter(row => row.status === 'failed').length, 1); assert.equal(group.filter(row => row.status === 'passed').length, 1);
    }
    console.log(`simHigherLowerReveal ${control}: eight intended assertions fail, eight original whole-game baselines pass, 56 cases explicitly skipped.`);
    console.log('HL_REVEAL_RECEIPT: ' + JSON.stringify({ control, intended: spec.test, failed: 8, independentPassed: 8, skipped: 56, messages }));
  } else {
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, 72); assert.equal(report.numFailedTests, 0); assert.equal(report.numPendingTests, 0);
    console.log('simHigherLowerReveal: 72 actual hook outcomes pass across eight original authored pools.');
    console.log('simHigherLowerReveal: original Daily and Unlimited325, player identity, RNG calls, exact saves, once booking and quiet restore.');
    console.log('simHigherLowerReveal: canceled mode, Hard and unmount reveals, stale delivery and original2000ms ownership.');
  }
} finally {
  for (const file of owned) await rm(file, { force: true });
  if (folder) await rmdir(folder);
  for (const verify of held) await verify();
}
console.log('simHigherLowerReveal: 23 source inputs held, owned copies and report cleaned.');
