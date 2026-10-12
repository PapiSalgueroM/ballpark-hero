/* Remote-only actual hook and useDailyPuzzle proof over synthetic career facts.
   TPW_EXPECT_RED=1 qualifies the original terminal-prefix render crash.
   TPW_CONTROL=recovery|recorder mutates an actual fixed hook copy. Neither a
   setup error nor an unrelated failing assertion can earn fault credit. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

assert(process.env.CI, 'Interrupted win proof runs remotely only');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/hooks/useTransferPathWinRecovery.test.ts';
const HOOK = path.join(ROOT, 'src/hooks/useTransferPath.ts');
const CONTROL = process.env.TPW_CONTROL || '';
const EXPECT_RED = process.env.TPW_EXPECT_RED === '1';
assert(['', 'recovery', 'recorder'].includes(CONTROL), 'Unknown TPW_CONTROL');
assert(!(CONTROL && EXPECT_RED), 'Expected baseline red and source controls are separate arms');
const VIEW_WIN = "rawDailyStatus === 'won' || recoveredDailyWin";
const RAW_COMPLETE = "const isComplete = rawDailyStatus === 'won' || dailyGaveUp;";
const RAW_RECORDER = "useGameCompletion('transfer-path', isComplete, rawDailyStatus === 'won' ? dailyScore : 0, rawDailyStatus === 'won' ? 1 : 0);";
const OWNED = [
  'interrupted win: reloads an actual quota-interrupted target prefix',
  'interrupted win: adopts an actual accepted target prefix from another tab',
];
const PRESERVED = [
  'preservation: healthy auto-target wins keep all three synchronous writes',
  'preservation: healthy direct wins keep the target and won writes',
  'preservation: an unfinished daily restores its head and live guidance',
  'preservation: surrendered dailies restore a loss and zero score',
  'preservation: completed raw-won dailies restore their original finish',
  'preservation: Unlimited wins and resets leave the daily untouched',
  'preservation: delayed same-index id rebinding clears the old unfinished chain',
];
const SETUP_ERROR = /Unhandled (?:Errors?|Rejection)|Uncaught Exception|Failed to load|Failed to resolve import|Cannot find module|Module not found|ERR_MODULE_NOT_FOUND|SyntaxError|ReferenceError|TypeError/i;
const hash = text => createHash('sha256').update(text).digest('hex');
const original = fs.readFileSync(HOOK, 'utf8');
const testSource = fs.readFileSync(path.join(ROOT, TEST), 'utf8');
const arm = CONTROL || (EXPECT_RED ? 'baseline-red' : 'normal');
const retained = process.env.TRANSFER_PATH_WIN_OUT
  ? path.join(path.resolve(process.env.TRANSFER_PATH_WIN_OUT), 'units', arm)
  : null;
if (retained) {
  fs.mkdirSync(retained, { recursive: true });
  fs.writeFileSync(path.join(retained, 'useTransferPath.before.ts'), original);
}
fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
const tmp = fs.mkdtempSync(path.join(ROOT, 'dist/.tpw-proof-'));
try {
  const env = { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' };
  delete env.TRANSFER_PATH_HOOK;
  let changedSource = null;
  let controlAnchors = [];
  if (CONTROL) {
    const anchors = CONTROL === 'recovery' ? [VIEW_WIN] : [RAW_COMPLETE, RAW_RECORDER];
    for (const anchor of anchors) assert.equal(original.split(anchor).length - 1, 1, `Unique actual fixed hook anchor required: ${anchor}`);
    let changed = CONTROL === 'recovery'
      ? original.replace(VIEW_WIN, "rawDailyStatus === 'won'")
      : original.replace(RAW_COMPLETE, "const isComplete = dailyStatus === 'won' || dailyGaveUp;")
        .replace(RAW_RECORDER, "useGameCompletion('transfer-path', isComplete, dailyStatus === 'won' ? dailyScore : 0, dailyStatus === 'won' ? 1 : 0);");
    assert.notEqual(changed, original, 'The source control must change the actual hook');
    for (const anchor of anchors) assert(!changed.includes(anchor), 'Each actual control anchor must be removed');
    changedSource = changed;
    controlAnchors = anchors;
    const copy = path.join(tmp, 'useTransferPath.control.ts');
    fs.writeFileSync(copy, changed);
    if (retained) fs.writeFileSync(path.join(retained, 'useTransferPath.control.ts'), changed);
    env.TRANSFER_PATH_HOOK = copy.replaceAll('\\', '/');
    console.log(`NEGATIVE CONTROL ON: ${CONTROL}; ${anchors.length} unique actual anchors rewritten.`);
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
      hookBeforeSha256: hash(original), hookAfterSha256: hash(fs.readFileSync(HOOK, 'utf8')),
      testBeforeSha256: hash(testSource), testAfterSha256: hash(fs.readFileSync(path.join(ROOT, TEST), 'utf8')),
      controlAnchors, changedSourceSha256: changedSource === null ? null : hash(changedSource),
    }, null, 2) + '\n');
  }
  assert(!result.error && result.status !== null, 'The actual test process must finish');
  assert(!SETUP_ERROR.test(output), 'Raw setup or unhandled errors cannot earn proof credit');
  assert(fs.existsSync(reportFile), 'The actual unit file must write a report');
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  assert.equal(report.testResults.length, 1, 'Only the owned actual unit file may run');
  const file = report.testResults[0];
  assert(file.name.replaceAll('\\', '/').endsWith('/' + TEST) && !file.message, 'The actual unit file must load without a file error');
  const cases = file.assertionResults;
  assert.deepEqual(cases.map(test => test.title).sort(), [...OWNED, ...PRESERVED].sort(), 'Every exact owned and preservation case must run');
  const owned = cases.filter(test => OWNED.includes(test.title));
  const preserved = cases.filter(test => PRESERVED.includes(test.title));
  assert(preserved.every(test => test.status === 'passed'), 'All seven preservation cases must pass');
  assert.equal(report.numPendingTests, 0, 'No pending test may earn proof credit');
  let verdict;
  if (CONTROL || EXPECT_RED) {
    assert.notEqual(result.status, 0, 'The actual baseline or faulted hook must fail its test process');
    assert.equal(report.numFailedTests, 2, 'Exactly the two interrupted-win assertions may fail');
    assert.equal(report.numPassedTests, 7, 'The seven preservation cases must remain green');
    const cause = CONTROL === 'recorder'
      ? /^AssertionError:.*recovered view must keep completion arguments raw: false, 0, 0.*expected false to be true/s
      : /^AssertionError:.*interrupted win should restore the won view.*expected 'route-error' to be 'won'/s;
    assert(owned.every(test => test.status === 'failed' && test.failureMessages.length > 0 && test.failureMessages.every(message => cause.test(message))), 'Every owned failure must be its exact causal view or recorder assertion');
    verdict = `simTransferPathWinRecovery ${CONTROL ? `control ${CONTROL}` : 'expected baseline red'}: green. Exactly 2 owned failures; 7 preservation passes.`;
  } else {
    assert.equal(result.status, 0, 'The actual route recovery must pass');
    assert.equal(report.numFailedTests, 0);
    assert.equal(report.numPassedTests, 9);
    assert(cases.every(test => test.status === 'passed'), 'No failed or skipped case may earn normal credit');
    verdict = 'simTransferPathWinRecovery: green. Actual quota prefix reload and adoption recovered; healthy writes and original completion arguments held.';
  }
  assert.equal(fs.readFileSync(HOOK, 'utf8'), original, 'The actual product hook source must stay held');
  assert.equal(fs.readFileSync(path.join(ROOT, TEST), 'utf8'), testSource, 'The actual proof test source must stay held');
  console.log(`Actual unit file: ${file.name}; ${cases.length} exact cases reported.`);
  console.log(`Owned recovery cases: ${owned.map(test => `${test.title}=${test.status}`).join('; ')}.`);
  console.log(`Preservation: ${preserved.length} actual cases passed; healthy direct and auto-target write sequences checked.`);
  console.log(`Actual runner exit: ${result.status}; file message empty; raw setup and unhandled markers absent.`);
  console.log(`Actual source held: hook sha256=${hash(original)}; test sha256=${hash(testSource)}.`);
  console.log(verdict);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
