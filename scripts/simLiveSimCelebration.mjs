/* Actual pitch poses and clock ownership. Controls mutate disposable copies. */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceFile = path.join(root, 'src/components/club-manager/LiveSimMotion.tsx');
const sourceBytes = await readFile(sourceFile);
const source = sourceBytes.toString().replace(/\r\n/g, '\n');
const control = process.env.LIVE_CELEBRATION_CONTROL || '';
const baseline = 'keeps original goal, save and miss destinations without mutation or random draws';
const controls = {
  missing: { anchor: "event.kind === 'goal' && flight === 1 ? smooth(resolve / .55) : 0", replacement: '0', test: 'raises only the scorer and two nearest outfield teammates after net contact' },
  figure: { anchor: "data-cm-actor-pose={celebrate ? 'celebrate' : dive ? 'dive' : kick ? 'strike' : 'stand'}", replacement: "data-cm-actor-pose={dive ? 'dive' : kick ? 'strike' : 'stand'}", test: 'draws raised arms on the actual scorer figure' },
  expiry: { anchor: 'clock - action.event.at <= 1.05', replacement: 'clock - action.event.at <= 100', test: 'freezes with the viewer clock and expires at the existing action boundary' },
  reduced: { anchor: 'reduced ? 1.05 : clock - action.event.at', replacement: 'clock - action.event.at', test: 'uses a static raised-arm finish under reduced motion' },
};
assert.ok(!control || Object.hasOwn(controls, control), 'Known celebration control');
await mkdir(path.join(root, '.sim-control'), { recursive: true });
const folder = await mkdtemp(path.join(root, '.sim-control/live-celebration-'));
const reportPath = path.join(folder, 'result.json');
const owned = [reportPath];
try {
  const env = { ...process.env, FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/liveSimCelebration.test.tsx', '--maxWorkers=1', '--no-file-parallelism', '--reporter=json', '--outputFile.json=' + reportPath];
  if (control) {
    const spec = controls[control];
    assert.equal(source.split(spec.anchor).length - 1, 1, 'Unique executable mutation');
    const changed = source.replace(spec.anchor, spec.replacement);
    assert.notEqual(changed, source);
    const copy = path.join(folder, 'LiveSimMotion.tsx');
    owned.push(copy);
    await writeFile(copy, changed.replace("'./LiveSimMotion.css'", "'@/components/club-manager/LiveSimMotion.css'"));
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/club-manager/LiveSimMotion': copy });
    args.push('--testNamePattern', spec.test + '|' + baseline);
  }
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1024 * 1024 });
  const output = (run.stdout || '') + (run.stderr || '');
  process.stdout.write(output);
  assert.ok(!run.error && !run.signal, 'Normal test termination');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed/);
  const report = JSON.parse(await readFile(reportPath, 'utf8'));
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  const rows = report.testResults.flatMap(suite => suite.assertionResults);
  assert.equal(rows.length, 5);
  if (control) {
    assert.equal(run.status, 1);
    assert.equal(report.numFailedTests, 1);
    assert.equal(report.numPassedTests, 1);
    assert.equal(rows.find(row => row.title === baseline)?.status, 'passed');
    const failed = rows.find(row => row.title === controls[control].test);
    assert.equal(failed?.status, 'failed');
    assert.match(failed.failureMessages.join('\n'), /AssertionError:|Error: expect\(/);
    console.log(`simLiveSimCelebration: ${control} changed source, intended assertion failed, independent destinations stayed green.`);
  } else {
    assert.equal(run.status, 0);
    assert.equal(report.numPassedTests, 5);
    console.log('simLiveSimCelebration: 5 outcome checks passed, correct side, net-first, real figure, freeze/expiry and reduced motion.');
  }
} finally {
  for (const file of owned) await rm(file, { force: true });
  await rmdir(folder);
  assert.deepEqual(await readFile(sourceFile), sourceBytes, 'Product source held');
}
