import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const output = path.resolve(process.env.MANAGER_CACHE_CONTROL_ARTIFACTS || path.join(root, 'manager-world-continuity-artifacts/cache-control'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const helper = 'src/lib/clubManagerWorldRoster.ts';
const heldFiles = [helper, 'src/lib/clubManagerWorldRoster.test.ts', 'src/lib/clubManager.ts', 'vitest.config.ts', 'package.json', 'package-lock.json', 'scripts/qa/managerRosterCacheControl.mjs'];
const hashes = () => Object.fromEntries(heldFiles.map(file => [file, sha(fs.readFileSync(path.join(root, file)))]));
const before = hashes(), originalBytes = fs.readFileSync(path.join(root, helper)), original = originalBytes.toString('utf8');
const from = 'let cached = packedRecordCache.get(raw);', to = 'let cached = undefined;';
assert.equal(original.split(from).length - 1, 1, 'One actual cache lookup is bypassed');
const fault = original.replace(from, to); assert.notEqual(fault, original);
assert.equal(fault.split(to).length - 1, 1, 'One complete cache control undo');
const undo = fault.replace(to, from); assert.equal(undo, original);
const parent = path.join(root, '.sim-control'); fs.mkdirSync(parent, { recursive: true });
const temporary = fs.mkdtempSync(path.join(parent, 'manager-cache-'));
fs.mkdirSync(output, { recursive: true });
const expectedFailure = 'decodes once per exact packed object and string while retaining complete reads and zero draws';
const runs = [];
try {
  for (const [name, source] of [['healthy', original], ['fault', fault], ['undo', undo]]) {
    const copy = path.join(temporary, `${name}.ts`), reportFile = path.join(output, `${name}-unit.json`);
    fs.writeFileSync(copy, source); fs.writeFileSync(path.join(output, `${name}-helper.ts`), source);
    const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/lib/clubManagerWorldRoster.test.ts',
      '--maxWorkers=1', '--minWorkers=1', '--reporter=default', '--reporter=json', `--outputFile=${reportFile}`], {
      cwd: root, env: { ...process.env, NO_DOUBLE_SWAP: JSON.stringify({ '@/lib/clubManagerWorldRoster': copy }) },
      encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024, windowsHide: true,
    });
    fs.writeFileSync(path.join(output, `${name}.log`), `${run.stdout ?? ''}\n${run.stderr ?? ''}`);
    assert.equal(run.error, undefined); assert.equal(run.signal, null);
    const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
    assert.equal(report.numTotalTests, 91, 'Every actual roster case is executed in each copied arm');
    assert.equal(report.numPendingTests, 0); assert.equal(report.numTodoTests ?? 0, 0);
    const assertions = report.testResults.flatMap(suite => suite.assertionResults);
    assert.equal(assertions.length, report.numTotalTests);
    const failures = assertions.filter(row => row.status !== 'passed');
    if (name === 'fault') {
      assert.equal(run.status, 1); assert.equal(report.success, false);
      assert.equal(report.numFailedTests, 1); assert.equal(failures.length, 1);
      assert.equal(failures[0].title, expectedFailure);
      assert(failures[0].failureMessages.some(message => /expected .* to be 1/.test(message)), 'The actual decode count assertion catches the bypass');
    } else {
      assert.equal(run.status, 0); assert.equal(report.success, true); assert.equal(report.numFailedTests, 0); assert.equal(failures.length, 0);
    }
    assert.equal(sha(fs.readFileSync(copy)), sha(source));
    runs.push({ name, status: run.status, total: report.numTotalTests, passed: report.numPassedTests, failed: report.numFailedTests,
      assertions: assertions.map(row => ({ name: row.fullName, title: row.title, status: row.status, failureMessages: row.failureMessages })),
      sourceSha256: sha(source), copiedSourceHeld: true });
  }
  assert.deepEqual(runs[0].assertions, runs[2].assertions, 'Full undo restores every named healthy result');
  assert.deepEqual(runs[0].assertions.map(row => row.name), runs[1].assertions.map(row => row.name), 'All unrelated actual cases remain present');
  assert.equal(runs[0].total, runs[1].total); assert.equal(runs[1].passed, runs[0].passed - 1);
  const after = hashes(); assert.deepEqual(after, before);
  fs.writeFileSync(path.join(output, 'receipt.json'), JSON.stringify({ scope: 'Actual roster suite against three copied helpers. Served app source is unchanged.',
    from, to, count: 1, effective: true, expectedFailure, sourceBefore: before, sourceAfter: after, runs }, null, 2));
  console.log(`PASS Manager cache control: ${runs[0].total} healthy named cases, exactly one decode-count failure, complete undo and all served source held`);
} finally {
  assert.equal(path.dirname(fs.realpathSync(temporary)), fs.realpathSync(parent));
  assert(path.basename(temporary).startsWith('manager-cache-'));
  fs.rmSync(temporary, { recursive: true, force: true });
}
