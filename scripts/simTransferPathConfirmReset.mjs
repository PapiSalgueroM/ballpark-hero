/* Remote-only actual Board, hook and GiveUpButton proof over fictional pools.
   TPC_EXPECT_RED=1 qualifies three stale confirmation assertions on baseline.
   TPC_CONTROL=missing removes only the actual fixed Board key in a copy. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert(process.env.CI, 'Confirmation reset proof runs remotely only');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/test/transferPathConfirmReset.test.tsx';
const BOARD = path.join(ROOT, 'src/components/transfer-path/TransferPathBoard.tsx');
const CONTROL = process.env.TPC_CONTROL || '';
const EXPECT_RED = process.env.TPC_EXPECT_RED === '1';
assert(['', 'missing'].includes(CONTROL), 'Unknown TPC_CONTROL');
assert(!(CONTROL && EXPECT_RED), 'Baseline and fixed-source control are separate arms');
const KEY = 'key={`${mode}:${puzzle.id}:${activeRule}:${unlimitedIndex}`}';
const OWNED = [
  'confirm reset: clears pending daily confirmation after an actual rule change',
  'confirm reset: clears pending Unlimited confirmation when a rule change replaces the pair',
  'confirm reset: clears pending Unlimited confirmation when a rule change keeps the pair',
];
const PRESERVED = [
  'preservation: same-rule noops and blocked daily rules keep confirmation armed',
  'preservation: Keep playing cancels without changing the daily',
  'preservation: a fresh confirmed daily surrender writes one real give action',
  'preservation: a started daily disables rule changes and keeps its confirmation',
  'preservation: ordinary surrender and win Next transitions unmount confirmation',
  'preservation: healthy wins keep synchronous writes and exact restored bytes',
];
const SETUP_ERROR = /Unhandled (?:Errors?|Rejection)|Uncaught Exception|Failed to load|Failed to resolve import|Cannot find module|Module not found|ERR_MODULE_NOT_FOUND|SyntaxError|ReferenceError|TypeError/i;
const sha = text => createHash('sha256').update(text).digest('hex');
const original = fs.readFileSync(BOARD, 'utf8');
const testSource = fs.readFileSync(path.join(ROOT, TEST), 'utf8');
const arm = CONTROL || (EXPECT_RED ? 'baseline-red' : 'normal');
const retained = process.env.TRANSFER_PATH_CONFIRM_RESET_OUT
  ? path.join(path.resolve(process.env.TRANSFER_PATH_CONFIRM_RESET_OUT), 'units', arm)
  : null;
if (retained) {
  fs.mkdirSync(retained, { recursive: true });
  fs.writeFileSync(path.join(retained, 'TransferPathBoard.before.tsx'), original);
}
fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
const tmp = fs.mkdtempSync(path.join(ROOT, 'dist/.tpc-proof-'));
try {
  const env = { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' };
  delete env.TRANSFER_PATH_BOARD;
  let changedSource = null;
  if (CONTROL) {
    assert.equal(original.split(KEY).length - 1, 1, 'Unique actual Board round key required');
    changedSource = original.replace(KEY, '');
    assert.notEqual(changedSource, original, 'The control must change the actual Board');
    assert(!changedSource.includes(KEY), 'The actual round key must be removed');
    const copy = path.join(tmp, 'TransferPathBoard.control.tsx');
    fs.writeFileSync(copy, changedSource);
    if (retained) fs.writeFileSync(path.join(retained, 'TransferPathBoard.control.tsx'), changedSource);
    env.TRANSFER_PATH_BOARD = copy.replaceAll('\\', '/');
    console.log('NEGATIVE CONTROL ON: missing; one unique actual Board round key removed.');
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
      controlAnchors: CONTROL ? [KEY] : [], changedSourceSha256: changedSource === null ? null : sha(changedSource),
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
    assert.equal(report.numFailedTests, 3, 'Exactly three stale confirmation assertions must fail');
    assert.equal(report.numPassedTests, 6, 'All six preservation cases must remain green');
    const cause = /^AssertionError:.*to have a length of \+0 but got 1/s;
    assert(owned.every(test => test.status === 'failed' && test.failureMessages.length > 0 && test.failureMessages.every(message => cause.test(message))), 'Every owned failure must be the exact stale confirmation assertion');
    verdict = `simTransferPathConfirmReset ${CONTROL ? 'control missing' : 'expected baseline red'}: green. Exactly 3 stale confirmation failures; 6 preservation passes.`;
  } else {
    assert.equal(result.status, 0, 'Actual confirmation round identity must pass');
    assert.equal(report.numFailedTests, 0);
    assert.equal(report.numPassedTests, 9);
    assert(cases.every(test => test.status === 'passed'), 'No skipped or failed case may earn normal credit');
    verdict = 'simTransferPathConfirmReset: green. Three actual rule changes reset confirmation; six preservation cases passed.';
  }
  assert.equal(fs.readFileSync(BOARD, 'utf8'), original, 'The actual product Board source must stay held');
  assert.equal(fs.readFileSync(path.join(ROOT, TEST), 'utf8'), testSource, 'The actual proof test source must stay held');
  console.log(`Actual unit file: ${file.name}; ${cases.length} exact cases reported.`);
  console.log(`Owned reset cases: ${owned.map(test => `${test.title}=${test.status}`).join('; ')}.`);
  console.log(`Preservation: ${preserved.length} actual cases passed; cancellation, rule locks, real surrender and healthy writes checked.`);
  console.log(`Actual runner exit: ${result.status}; file message empty; raw setup and unhandled markers absent.`);
  console.log(`Actual source held: Board sha256=${sha(original)}; test sha256=${sha(testSource)}.`);
  console.log(verdict);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
