/* Remote-only actual Board, autocomplete and daily-engine proof over fictional
   facts. TLS_EXPECT_RED=1 qualifies only three missing local-name assertions.
   TLS_CONTROL=missing removes the real fixed prop from a temporary Board copy.
   Raw reports and actual source copies are retained when an output root is set. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert(process.env.CI, 'Local search proof runs remotely only');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/test/transferPathLocalSearch.test.tsx';
const BOARD = path.join(ROOT, 'src/components/transfer-path/TransferPathBoard.tsx');
const CONTROL = process.env.TLS_CONTROL || '';
const EXPECT_RED = process.env.TLS_EXPECT_RED === '1';
assert(['', 'missing'].includes(CONTROL), 'Unknown TLS_CONTROL');
assert(!(CONTROL && EXPECT_RED), 'Baseline and fixed-source control are separate arms');
const PROP = 'localNames={allNames}';
const OWNED = [
  'local search: offers a canonical graph name after a fulfilled search error',
  'local search: offers a canonical graph name after a rejected search',
  'local search: offers a canonical graph name after settled empty results',
];
const PRESERVED = [
  'preservation: a healthy remote identity is listed once with its metadata',
  'preservation: an unknown typed name cannot be submitted as a player',
  'preservation: minChars still waits for two characters before searching',
  'preservation: normalized start played and longer-path target names stay excluded',
  'preservation: a listed nonteammate is rejected by the actual graph',
  'preservation: a normal selected win keeps all synchronous daily writes',
];
const SETUP_ERROR = /Unhandled (?:Errors?|Rejection)|Uncaught Exception|Failed to load|Failed to resolve import|Cannot find module|Module not found|ERR_MODULE_NOT_FOUND|SyntaxError|ReferenceError|TypeError/i;
const sha = text => createHash('sha256').update(text).digest('hex');
const original = fs.readFileSync(BOARD, 'utf8');
const testSource = fs.readFileSync(path.join(ROOT, TEST), 'utf8');
const arm = CONTROL || (EXPECT_RED ? 'baseline-red' : 'normal');
const retained = process.env.TRANSFER_PATH_LOCAL_SEARCH_OUT
  ? path.join(path.resolve(process.env.TRANSFER_PATH_LOCAL_SEARCH_OUT), 'units', arm)
  : null;
if (retained) {
  fs.mkdirSync(retained, { recursive: true });
  fs.writeFileSync(path.join(retained, 'TransferPathBoard.before.tsx'), original);
}
fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
const tmp = fs.mkdtempSync(path.join(ROOT, 'dist/.tls-proof-'));
try {
  const env = { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' };
  delete env.TRANSFER_PATH_BOARD;
  let changedSource = null;
  if (CONTROL) {
    assert.equal(original.split(PROP).length - 1, 1, 'Unique actual Board local-name prop required');
    changedSource = original.replace(PROP, '');
    assert.notEqual(changedSource, original, 'The control must change the actual Board');
    assert(!changedSource.includes(PROP), 'The actual local-name prop must be removed');
    const copy = path.join(tmp, 'TransferPathBoard.control.tsx');
    fs.writeFileSync(copy, changedSource);
    if (retained) fs.writeFileSync(path.join(retained, 'TransferPathBoard.control.tsx'), changedSource);
    env.TRANSFER_PATH_BOARD = copy.replaceAll('\\', '/');
    console.log('NEGATIVE CONTROL ON: missing; one unique actual Board prop removed.');
  }
  const reportFile = path.join(tmp, 'unit.json');
  const runner = path.join(ROOT, 'node_modules/vitest/vitest.mjs');
  assert(fs.existsSync(runner), 'Install this checkout locked dependencies remotely first');
  const result = spawnSync(process.execPath, [runner, 'run', TEST, '--maxWorkers=1', '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`], {
    cwd: ROOT, encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024,
  });
  const output = (result.stdout || '') + (result.stderr || '');
  if (retained) {
    fs.writeFileSync(path.join(retained, 'output.log'), output);
    if (fs.existsSync(reportFile)) fs.copyFileSync(reportFile, path.join(retained, 'unit.json'));
    fs.writeFileSync(path.join(retained, 'source.json'), JSON.stringify({
      arm, testFile: TEST, exitCode: result.status, processError: result.error?.message || null,
      boardBeforeSha256: sha(original), boardAfterSha256: sha(fs.readFileSync(BOARD, 'utf8')),
      testBeforeSha256: sha(testSource), testAfterSha256: sha(fs.readFileSync(path.join(ROOT, TEST), 'utf8')),
      controlAnchors: CONTROL ? [PROP] : [], changedSourceSha256: changedSource === null ? null : sha(changedSource),
    }, null, 2) + '\n');
  }
  assert(!result.error && result.status !== null, 'The actual unit process must finish');
  assert(!SETUP_ERROR.test(output), 'Raw setup or unhandled errors cannot earn proof credit');
  assert(fs.existsSync(reportFile), 'The actual unit file must write its report');
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  assert.equal(report.testResults.length, 1, 'Only the owned actual unit file may run');
  const file = report.testResults[0];
  assert(file.name.replaceAll('\\', '/').endsWith('/' + TEST) && !file.message, 'The actual unit file must load without a file error');
  const cases = file.assertionResults;
  assert.deepEqual(cases.map(test => test.title).sort(), [...OWNED, ...PRESERVED].sort(), 'Every exact owned and preservation case must run');
  const owned = cases.filter(test => OWNED.includes(test.title));
  const preserved = cases.filter(test => PRESERVED.includes(test.title));
  assert(preserved.every(test => test.status === 'passed'), 'All six preservation cases must pass');
  assert.equal(report.numPendingTests, 0, 'No pending test may earn proof credit');
  let verdict;
  if (CONTROL || EXPECT_RED) {
    assert.notEqual(result.status, 0, 'The actual baseline or controlled Board must fail its unit process');
    assert.equal(report.numFailedTests, 3, 'Exactly three missing local-name assertions must fail');
    assert.equal(report.numPassedTests, 6, 'All six preservation cases must remain green');
    const cause = /^AssertionError:.*expected \[\] to have a length of 1 but got \+0/s;
    assert(owned.every(test => test.status === 'failed' && test.failureMessages.length > 0 && test.failureMessages.every(message => cause.test(message))), 'Every owned failure must be the exact missing-option assertion');
    verdict = `simTransferPathLocalSearch ${CONTROL ? 'control missing' : 'expected baseline red'}: green. Exactly 3 missing-option failures; 6 preservation passes.`;
  } else {
    assert.equal(result.status, 0, 'Actual local-name selection wiring must pass');
    assert.equal(report.numFailedTests, 0);
    assert.equal(report.numPassedTests, 9);
    assert(cases.every(test => test.status === 'passed'), 'No skipped or failed case may earn normal credit');
    verdict = 'simTransferPathLocalSearch: green. Three settled-search fallback selections and six actual preservation cases passed.';
  }
  assert.equal(fs.readFileSync(BOARD, 'utf8'), original, 'The actual product Board source must stay held');
  assert.equal(fs.readFileSync(path.join(ROOT, TEST), 'utf8'), testSource, 'The actual proof test source must stay held');
  console.log(`Actual unit file: ${file.name}; ${cases.length} exact cases reported.`);
  console.log(`Owned search cases: ${owned.map(test => `${test.title}=${test.status}`).join('; ')}.`);
  console.log(`Preservation: ${preserved.length} actual cases passed; graph refusals, exclusions and synchronous writes checked.`);
  console.log(`Actual runner exit: ${result.status}; file message empty; raw setup and unhandled markers absent.`);
  console.log(`Actual source held: Board sha256=${sha(original)}; test sha256=${sha(testSource)}.`);
  console.log(verdict);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
