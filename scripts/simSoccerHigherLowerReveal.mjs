/* Actual soccer hook reveals and copied timer-ownership controls. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hook = 'src/hooks/useHigherLower.ts';
const baseline = 'preserves normal three-second pair shifts RNG streak best and once completion';
const controls = {
  clear: { anchor: 'if (revealTimer.current !== null) clearTimeout(revealTimer.current);', replacement: 'void revealTimer.current;', count: 1,
    test: 'clears actual reveal handles on Give up reset and unmount' },
  stale: { anchor: 'if (version !== revealVersion.current) return;', replacement: 'void version;', count: 2,
    test: 'rejects delivered obsolete correct and wrong callbacks while the new reveal keeps its full three seconds' },
};
const control = process.env.SOCCER_REVEAL_CONTROL || '';
assert.ok(!control || control in controls, 'Known soccer reveal control');
const files = [hook, 'src/data/higherLowerPlayers.ts', 'src/types/higherLower.ts', 'src/lib/firstDraw.ts', 'src/hooks/useGameCompletion.ts', 'src/lib/restoredFinish.ts'];
const held = await Promise.all(files.map(async file => [file, await readFile(path.join(root, file))]));
let folder;
const owned = [];
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  folder = await mkdtemp(path.join(root, '.sim-control/soccer-reveal-'));
  const env = { ...process.env, FORCE_COLOR: '0' }; delete env.NO_DOUBLE_SWAP; delete env.COMPLETION_HOOK;
  const reportFile = path.join(folder, 'report.json'); owned.push(reportFile);
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/soccerHigherLowerReveal.test.tsx', '--reporter=verbose', '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'];
  if (control) {
    const spec = controls[control];
    const source = (await readFile(path.join(root, hook), 'utf8')).replace(/\r\n/g, '\n');
    assert.equal(source.split(spec.anchor).length - 1, spec.count, 'Executable mutation anchor count is exact');
    const changed = source.replaceAll(spec.anchor, spec.replacement); assert.notEqual(changed, source);
    const copy = path.join(folder, 'useHigherLower.ts'); await writeFile(copy, changed); owned.push(copy);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/hooks/useHigherLower': copy });
    args.push('--testNamePattern', spec.test + '|' + baseline);
  }
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024 });
  const output = (run.stdout || '') + '\n' + (run.stderr || ''); process.stdout.write(output);
  assert.ok(!run.error && !run.signal, 'Runner finishes normally');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|STACK_TRACE_ERROR|\bRPC\b|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed/, 'No runner fault earns outcome credit');
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  const rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, 6, 'All six actual cases collect');
  if (control) {
    const spec = controls[control];
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, 1); assert.equal(report.numPassedTests, 1); assert.equal(report.numPendingTests, 4);
    const intended = rows.filter(row => row.title === spec.test);
    assert.equal(intended.length, 1); assert.equal(intended[0].status, 'failed');
    const messages = intended[0].failureMessages.join('\n');
    assert.match(messages, /AssertionError:/, 'Intended row fails its actual outcome assertion');
    assert.equal(rows.find(row => row.title === baseline)?.status, 'passed', 'Independent normal scoring and RNG outcome stays green');
    console.log(`simSoccerHigherLowerReveal ${control}: one intended assertion fails, one original three-second baseline passes, four cases explicitly skipped.`);
    console.log('SOCCER_REVEAL_RECEIPT: ' + JSON.stringify({ control, intended: spec.test, failed: 1, independentPassed: 1, skipped: 4, messages }));
  } else {
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, 6); assert.equal(report.numFailedTests, 0); assert.equal(report.numPendingTests, 0);
    console.log('simSoccerHigherLowerReveal: six actual hook outcomes pass.');
    console.log('simSoccerHigherLowerReveal: original three-second pair shifts, RNG, streak best and exact once completion.');
    console.log('simSoccerHigherLowerReveal: correct and wrong restart isolation, canceled handles and obsolete delivery.');
  }
} finally {
  for (const file of owned) await rm(file, { force: true });
  if (folder) await rmdir(folder);
  for (const [file, bytes] of held) assert.deepEqual(await readFile(path.join(root, file)), bytes, 'Actual hook/data/helper bytes held');
}
console.log('simSoccerHigherLowerReveal: source bytes held, owned copies and report cleaned.');
