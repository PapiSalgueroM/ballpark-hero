import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.TRANSFER_PATH_CLUB_SEASONS_CONTROL || '';
assert(['', 'missing'].includes(control), 'Unknown membership control');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'transfer-path-club-seasons-'));
try {
  const reportFile = path.join(dir, 'vitest.json');
  const tests = ['src/hooks/useTransferPathClubSeasons.test.ts'];
  if (!control) tests.push('src/test/transferPathClubSeasons.test.ts');
  const result = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', ...tests, '--maxWorkers=1', '--reporter=default', '--reporter=json', `--outputFile.json=${reportFile}`], {
    cwd: root, encoding: 'utf8', env: { ...process.env, CI: '1', NO_COLOR: '1' }, maxBuffer: 16 * 1024 * 1024,
  });
  const output = (result.stdout || '') + (result.stderr || '');
  console.log('1) Actual hook, both pool sources and both permitted rules');
  assert(fs.existsSync(reportFile), `Vitest did not produce a report: ${output}`);
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  const cases = report.testResults.flatMap(file => file.assertionResults);
  if (control) {
    assert(output.includes('TRANSFER_PATH_MEMBERSHIP_CONTROL removed=2'), 'Control did not remove both actual memberships');
    assert.equal(report.numFailedTests, 5);
    assert.equal(report.numPassedTests, 1);
    assert(cases.filter(c => c.status === 'failed').every(c => c.failureMessages.some(m => m.includes('Real Madrid') && m.includes('ok'))));
    console.log('2) Removed both actual verified memberships, old refusal returned in all five acceptance/save cases');
    console.log('3) Liverpool history still passed; no import or setup failure counted');
    console.log('simTransferPathClubSeasons control missing: green. The reported refusal is detected.');
  } else {
    console.log(output);
    assert.equal(result.status, 0);
    assert.equal(report.numFailedTests, 0);
    assert.equal(report.numPassedTests, 11);
    console.log('2) Separate membership data, identity guards, historical links and active eligibility passed');
    console.log('3) Derived puzzle minima, unchanged puzzle identities and daily reload passed');
    console.log('simTransferPathClubSeasons: green. 11 real outcome cases passed.');
  }
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
