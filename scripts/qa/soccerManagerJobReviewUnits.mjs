import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';

const hash = value => createHash('sha256').update(value).digest('hex');
const out = path.resolve(process.env.SC_MANAGER_REVIEW_RELEASE_OUT || 'manager-review-release-artifacts/units');
const baselinePath = 'qa/sc-manager-job-review-v1/legacy-unit-identities.json.gz';
const compressed = fs.readFileSync(baselinePath);
assert.equal(hash(compressed), '7683dcf0c68363481fce260efe3f005ef1337de74dbbf95cf5ca2851e435d0b8');
const plain = gunzipSync(compressed);
assert.equal(hash(plain), 'b0d9533796d410e68d1fe4bb62200d16e9f3a96e1963207c822f63bb693e76be');
const baseline = JSON.parse(plain);
assert.equal(baseline.rows.length, 9755);
assert.equal(baseline.rows.filter(row => row.status === 'passed').length, 9697);
assert.equal(baseline.rows.filter(row => row.status === 'skipped').length, 58);
const reportPath = path.join(out, 'full-units.json'), cliPath = path.join(out, 'full-units.log');
const reportRaw = fs.readFileSync(reportPath), cliRaw = fs.readFileSync(cliPath);
const report = JSON.parse(reportRaw), cli = cliRaw.toString('utf8');
const normalizeFile = file => file.replaceAll('\\', '/').replace(/^.*?\/ballpark-hero\/ballpark-hero\//, '');
const countMap = rows => {
  const result = new Map();
  for (const row of rows) {
    const key = JSON.stringify([row.file, row.name, row.status]);
    result.set(key, (result.get(key) || 0) + 1);
  }
  return result;
};
const baselineCounts = countMap(baseline.rows);
const oldFiles = new Set(baseline.rows.map(row => row.file));
function classify(value, log) {
  assert.equal(value.numFailedTests, 0, 'NO_FAILED_CASES');
  assert.equal(value.numPendingTests, 58, 'UNCHANGED_SKIPS');
  assert.equal(value.numTodoTests || 0, 0, 'NO_NEW_TODO');
  assert.equal(value.success, true, 'ACTUAL_REPORT_SUCCESS');
  assert.equal(value.numFailedTestSuites, 0, 'NO_FAILED_TEST_SUITES');
  const rows = [];
  for (const suite of value.testResults) {
    assert(['passed', 'skipped'].includes(suite.status), 'NO_FAILED_FILES');
    assert.equal(suite.message || '', '', 'NO_SUITE_SETUP_ERRORS');
    for (const row of suite.assertionResults) {
      assert(['passed', 'skipped'].includes(row.status), 'ACTUAL_CASE_STATUS');
      assert.equal(row.failureMessages.length, 0, 'NO_CASE_FAILURE_MESSAGES');
      rows.push({file: normalizeFile(suite.name), name: row.fullName, status: row.status});
    }
  }
  assert.equal(rows.length, value.numTotalTests, 'ACTUAL_ROW_TOTAL');
  assert.equal(rows.filter(row => row.status === 'passed').length, value.numPassedTests, 'ACTUAL_PASS_TOTAL');
  const counts = countMap(rows);
  for (const [key, count] of baselineCounts) assert.equal(counts.get(key), count, 'OLD_CASE_IDENTITY_STATUS: ' + key);
  const added = rows.filter(row => !oldFiles.has(row.file));
  assert.equal(added.length, 28, 'ALL_FROZEN_NEW_CASES_COLLECTED');
  assert(added.length > 0, 'NEW_FEATURE_CASES_COLLECTED');
  assert(added.every(row => /ManagerJobReview/i.test(row.file) && row.status === 'passed'), 'ONLY_OWNED_NEW_PASS_CASES');
  assert.equal(rows.length, baseline.rows.length + added.length, 'NO_EXTRA_OLD_CASES');
  const clean = log.replace(/\x1b\[[0-9;]*m/g, '');
  assert(!/Unhandled (?:Errors?|Rejections?|Exceptions?)|Failed Suites|Vitest caught \d+ unhandled errors?|\bErrors\s+\d+\s+errors?\b|No test files found/i.test(clean), 'NO_OUT_OF_ROW_INFRASTRUCTURE');
  const files = clean.match(/\bTest Files[^\n]*\((\d+)\)/g) || [];
  const tests = clean.match(/\bTests[^\n]*\((\d+)\)/g) || [];
  assert.equal(files.length, 1, 'ACTUAL_CLI_FILE_CLOSING');
  assert.equal(tests.length, 1, 'ACTUAL_CLI_TEST_CLOSING');
  assert.equal(Number(files[0].match(/\((\d+)\)/)[1]), value.testResults.length, 'ACTUAL_CLI_FILE_TOTAL');
  assert.equal(Number(tests[0].match(/\((\d+)\)/)[1]), rows.length, 'ACTUAL_CLI_CASE_TOTAL');
  assert.equal((clean.match(/JSON report written to /g) || []).length, 1, 'ACTUAL_JSON_WRITTEN');
  return {total: rows.length, passed: value.numPassedTests, oldRows: baseline.rows.length, unchangedSkipped: 58, added: added.length, files: value.testResults.length};
}
const actual = classify(report, cli), controls = [];
for (const kind of ['truncated-cli', 'new-skip', 'missing-old-case', 'failed-file', 'failed-suites-cli', 'caught-unhandled-cli', 'errors-cli']) {
  const copied = structuredClone(report); let log = cli, expected;
  if (kind === 'truncated-cli') { log = ''; expected = 'ACTUAL_CLI_FILE_CLOSING'; }
  if (kind === 'failed-file') { copied.testResults[0].status = 'failed'; expected = 'NO_FAILED_FILES'; }
  if (kind === 'failed-suites-cli') { log += '\n\x1b[31mFailed Suites 1\x1b[0m\n'; expected = 'NO_OUT_OF_ROW_INFRASTRUCTURE'; }
  if (kind === 'caught-unhandled-cli') { log += '\nVitest caught 1 unhandled error during the test run.\n'; expected = 'NO_OUT_OF_ROW_INFRASTRUCTURE'; }
  if (kind === 'errors-cli') { log += '\nErrors 1 errors\n'; expected = 'NO_OUT_OF_ROW_INFRASTRUCTURE'; }
  if (kind === 'new-skip') {
    const row = copied.testResults.flatMap(suite => suite.assertionResults).find(row => row.status === 'passed');
    row.status = 'skipped'; copied.numPendingTests += 1; copied.numPassedTests -= 1; expected = 'UNCHANGED_SKIPS';
  }
  if (kind === 'missing-old-case') {
    const suite = copied.testResults.find(suite => oldFiles.has(normalizeFile(suite.name)) && suite.assertionResults.some(row => row.status === 'passed'));
    const row = suite.assertionResults.find(row => row.status === 'passed');
    row.fullName += ' COPIED_MISSING_ORIGINAL'; expected = 'OLD_CASE_IDENTITY_STATUS';
  }
  const copiedRaw = Buffer.from(JSON.stringify(copied)), copiedLog = Buffer.from(log);
  assert(JSON.stringify(copied) !== JSON.stringify(report) || log !== cli, 'COPIED_CONTROL_CHANGED_SEMANTICALLY');
  assert(hash(copiedRaw) !== hash(reportRaw) || hash(copiedLog) !== hash(cliRaw), 'COPIED_CONTROL_CHANGED');
  let caught;
  try { classify(copied, log); } catch (error) { caught = error; }
  assert(caught && caught.message.includes(expected), 'INTENDED_COPIED_CONTROL_REJECTION: ' + kind);
  const dir = path.join(out, 'copied-diagnostics', kind); fs.mkdirSync(dir, {recursive: true});
  fs.writeFileSync(path.join(dir, 'full-units.json'), copiedRaw); fs.writeFileSync(path.join(dir, 'full-units.log'), copiedLog);
  assert.deepEqual(classify(JSON.parse(reportRaw), cliRaw.toString('utf8')), actual, 'ACTUAL_ORIGINAL_READMITTED');
  controls.push({kind, scope: 'COPIED_DIAGNOSTIC_ONLY', changed: true, specificRejection: caught.message, originalReadmitted: true, reportSha256: hash(copiedRaw), cliSha256: hash(copiedLog)});
}
assert.equal(hash(fs.readFileSync(reportPath)), hash(reportRaw), 'ACTUAL_REPORT_HELD');
assert.equal(hash(fs.readFileSync(cliPath)), hash(cliRaw), 'ACTUAL_CLI_HELD');
fs.writeFileSync(path.join(out, 'UNIT-ADMISSION.json'), JSON.stringify({status: 'FULL_CURRENT_SUITE_ADMITTED', baselineSource: baseline.sourceHead, baselineRawReportSha256: baseline.rawReportSha256, actual, controls, rawReportSha256: hash(reportRaw), cliSha256: hash(cliRaw), limit: 'Prior identity/status comparison plus fresh current full execution; baseline reference is not a new execution of the clean parent.'}, null, 2));
process.stdout.write('Current full suite and unchanged legacy identity/status multiset admitted.\n');
