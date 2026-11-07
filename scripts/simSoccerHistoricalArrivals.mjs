import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-soccer-real-entry-'));
const names = [
  'the actual 2005 creation path admits Neymar once at Santos in 2009',
  'all four entries survive complete reload and later era club changes',
  'SportsFeed keeps the sourced entry separate from the persistent career world club',
  'legacy unmarked APIs and opaque future save versions keep their complete state and draw path',
  'the authentic original version1 save keeps Neymar only and its original source card',
  'the actual newer era creation UI keeps its unmarked saved default',
  'the actual 2010 UI admits only the three supported future entries',
  'the actual 2015 UI admits only the two supported future entries',
];
function validate(report) {
  const cases = report.testResults?.flatMap(suite => suite.assertionResults ?? []) ?? [];
  assert.equal(cases.length, 8, 'SC_REAL_ENTRY_CASE_CENSUS');
  assert.deepEqual(cases.map(item => item.title).sort(), names.slice().sort(), 'SC_REAL_ENTRY_CASE_NAMES');
  assert.equal(report.success, true);
  assert.equal(report.numTotalTests, 8);
  assert.equal(report.numPassedTests, 8);
  assert.equal(report.numFailedTests, 0);
  assert(cases.every(item => item.status === 'passed' && item.failureMessages.length === 0));
  assert.equal(report.numPendingTests ?? 0, 0);
  assert.equal(report.numTodoTests ?? 0, 0);
  for (const key of ['numRuntimeErrorTestSuites', 'numRuntimeErrorTests', 'numUnhandledErrors'])
    assert.equal(report[key] ?? 0, 0, key);
  assert.deepEqual(report.unhandledErrors ?? [], []);
}
try {
  const reportFile = path.join(out, 'vitest.json');
  const result = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run',
    'src/test/soccerHistoricalRealEntry.test.tsx', '--maxWorkers=1', '--minWorkers=1',
    '--reporter=json', '--outputFile=' + reportFile], {
    cwd: root, env: process.env, encoding: 'utf8', timeout: 180000,
  });
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  if (result.error || result.signal) throw result.error ?? new Error('Vitest stopped: ' + result.signal);
  assert.equal(result.status, 0, 'Actual historical entry outcomes');
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  validate(report);
  const changed = JSON.parse(JSON.stringify(report)), before = JSON.stringify(changed);
  const removed = changed.testResults[0].assertionResults.pop();
  assert.notEqual(JSON.stringify(changed), before, 'Copied actual omission changed the report');
  assert.throws(() => validate(changed), /SC_REAL_ENTRY_CASE_CENSUS/);
  changed.testResults[0].assertionResults.push(removed);
  assert.equal(JSON.stringify(changed), before, 'Whole copied report restored');
  console.log('simSoccerHistoricalArrivals: 8 UI, save and phone outcomes green; missing-case control caught');
} finally {
  fs.rmSync(out, { recursive: true, force: true });
}
