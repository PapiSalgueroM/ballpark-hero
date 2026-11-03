/* Rendered keeper reach. DRILL_KEEPER_REACH_CONTROL=stretch restores the old
   arm stretch in a source copy and must exit 1 with three assertion failures.
   SIM_DRILL_KEEPER_ARTIFACTS retains each run's source copy, raw logs and JSON. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const component = path.join(root, 'src/components/soccer-career/DrillPlayers.tsx');
const test = 'src/test/drillKeeperReach.test.tsx';
const control = process.env.DRILL_KEEPER_REACH_CONTROL || '';
assert(!control || control === 'stretch', 'Unknown DRILL_KEEPER_REACH_CONTROL');
const base = process.env.SIM_DRILL_KEEPER_ARTIFACTS ? path.resolve(process.env.SIM_DRILL_KEEPER_ARTIFACTS) : os.tmpdir();
fs.mkdirSync(base, { recursive: true });
const output = fs.mkdtempSync(path.join(base, 'drill-keeper-reach-'));
const source = fs.readFileSync(component, 'utf8');
const env = { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' };
delete env.US_BOARD_CONTROL_ALIAS;
delete env.US_BOARD_CONTROL_FILE;

if (control) {
  const before = 'const chest = { x: hands.x - direction.x * reach, y: hands.y - direction.y * reach };';
  const after = 'const chest = { x: glove.x - direction.x * reach, y: glove.y - direction.y * reach };';
  assert.equal(source.split(before).length - 1, 1, 'Stretch control needs one executed chest anchor');
  const changed = source.replace(before, after);
  assert.notEqual(changed, source, 'Stretch control must change source');
  const copy = path.join(output, 'DrillPlayers.stretch.tsx');
  fs.writeFileSync(copy, changed);
  env.US_BOARD_CONTROL_ALIAS = '@/components/soccer-career/DrillPlayers';
  env.US_BOARD_CONTROL_FILE = copy;
}

const vitest = path.join(path.dirname(createRequire(path.join(root, 'package.json')).resolve('vitest/package.json')), 'vitest.mjs');
const reportFile = path.join(output, 'vitest.json');
const run = spawnSync(process.execPath, [vitest, 'run', test, '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`], {
  cwd: root, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
});
fs.writeFileSync(path.join(output, 'stdout.log'), run.stdout || '');
fs.writeFileSync(path.join(output, 'stderr.log'), run.stderr || '');
process.stdout.write(run.stdout || '');
process.stderr.write(run.stderr || '');
assert.equal(fs.readFileSync(component, 'utf8'), source, 'Actual component source must remain unchanged');
assert.ifError(run.error);
assert(fs.existsSync(reportFile), 'Vitest must write its actual outcomes');
const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
assert(Array.isArray(report.testResults) && report.testResults.length === 1, 'Exactly one actual geometry test file is required');
const rows = report.testResults[0].assertionResults || [];
const passed = rows.filter(row => row.status === 'passed').length;
const failed = rows.filter(row => row.status === 'failed');
const raw = (run.stdout || '') + (run.stderr || '');
const runtimeCounts = {
  numUnhandledErrors: report.numUnhandledErrors === undefined ? null : report.numUnhandledErrors,
  numRuntimeErrorTestSuites: report.numRuntimeErrorTestSuites === undefined ? null : report.numRuntimeErrorTestSuites,
};
const detectedRuntimeError = Object.values(runtimeCounts).some(value => typeof value === 'number' && value > 0) || /Unhandled (?:Errors?|Rejection)|Vitest caught \d+ unhandled/.test(raw);
const expected = rows.length === 6 && !detectedRuntimeError && (control
  ? run.status === 1 && passed === 3 && failed.length === 3 && failed.every(row => row.title.startsWith('keeps both arms in proportion through a ') && row.failureMessages.some(message => /AssertionError/.test(message)))
  : run.status === 0 && passed === 6 && failed.length === 0);
const summary = {
  control, rawExit: run.status, passed, failed: failed.map(row => row.title), runtimeCounts, detectedRuntimeError,
  rawErrors: report.errors === undefined ? null : report.errors,
  rawUnhandledErrors: report.unhandledErrors === undefined ? null : report.unhandledErrors,
  expected,
  sourceSha256: createHash('sha256').update(source).digest('hex'),
};
fs.writeFileSync(path.join(output, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
console.log(`simDrillKeeperReach: ${passed}/6 passed, ${failed.length}/6 failed, detectedRuntimeError=${detectedRuntimeError}, runtimeCounts=${JSON.stringify(runtimeCounts)}, expected=${expected}, rawExit=${run.status}. Evidence: ${output}`);
process.exit(expected ? run.status : 1);
