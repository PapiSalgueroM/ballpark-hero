/* Remote-only actual Board wiring proof. The unit hook and sports graph are
   fixtures. This holds surrender confirmation, the daily practice callback,
   rule delegation and UI resets, not actual scores, saves or sports data.
   TPS_CONTROL=hide|noop rewrites only a temporary committed-shape Board copy.
   Both controls require the fixed continuation anchors, three owned assertion
   failures, five preservation passes and no file, setup or unhandled errors. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

assert(process.env.CI, 'Surrender practice unit proof runs remotely only');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEST = 'src/test/transferPathSurrenderPractice.test.tsx';
const BOARD = path.join(ROOT, 'src/components/transfer-path/TransferPathBoard.tsx');
const CONTROL = process.env.TPS_CONTROL || '';
assert(['', 'hide', 'noop'].includes(CONTROL), 'Unknown TPS_CONTROL');
const HANDLER = "if (mode === 'daily') switchToUnlimited(); else nextPuzzle();";
const LABEL = "{mode === 'daily' ? 'Play Unlimited' : 'Next Puzzle'}";
const BUTTON_CLASS = 'className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"';
const OWNED = ['classic', 'active', 'europe'].map(rule => `daily surrender: enters practice under ${rule}`);
const PRESERVED = [
  'preservation: Keep playing cancels surrender without changing the board',
  'preservation: a building daily has guess controls and no practice exit',
  'preservation: an unlimited surrender advances with Next Puzzle and clears board state',
  'preservation: restored surrender state renders its reveal without guess controls',
  'preservation: the loading boundary exposes neither guesses nor continuation',
];
const SETUP_ERROR = /Unhandled (?:Errors?|Rejection)|Uncaught Exception|Failed to load|Failed to resolve import|Cannot find module|Module not found|ERR_MODULE_NOT_FOUND|SyntaxError|ReferenceError|TypeError/i;
fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
const tmp = fs.mkdtempSync(path.join(ROOT, 'dist/.tps-proof-'));
try {
  const env = { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' };
  if (CONTROL) {
    const original = fs.readFileSync(BOARD, 'utf8');
    for (const anchor of [HANDLER, LABEL, BUTTON_CLASS]) assert.equal(original.split(anchor).length - 1, 1, `Unique actual fixed Board anchor required: ${anchor}`);
    const anchor = CONTROL === 'hide' ? BUTTON_CLASS : HANDLER;
    const swap = CONTROL === 'hide' ? `hidden={mode === 'daily'} ${BUTTON_CLASS}` : "if (mode === 'daily') void 0; else nextPuzzle();";
    const changed = original.replace(anchor, swap);
    assert.notEqual(changed, original, 'The control must change actual source');
    const copy = path.join(tmp, 'TransferPathBoard.control.tsx');
    fs.writeFileSync(copy, changed);
    env.TRANSFER_PATH_BOARD = copy.replaceAll('\\', '/');
    console.log(`NEGATIVE CONTROL ON: ${CONTROL}, actual Board rewritten once`);
  }
  const reportFile = path.join(tmp, 'unit.json');
  const runner = path.join(ROOT, 'node_modules/vitest/vitest.mjs');
  assert(fs.existsSync(runner), 'Install this source checkout locked dependencies remotely first');
  const result = spawnSync(process.execPath, [runner, 'run', TEST, '--maxWorkers=1', '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`], {
    cwd: ROOT, encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024,
  });
  const output = (result.stdout || '') + (result.stderr || '');
  assert(!result.error && result.status !== null, 'The actual test process must finish');
  assert(!SETUP_ERROR.test(output), 'Setup or unhandled errors cannot earn control credit');
  assert(fs.existsSync(reportFile), 'The actual unit file must write a report');
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  assert.equal(report.testResults.length, 1, 'Only the owned actual unit file may run');
  const file = report.testResults[0];
  assert(file.name.replaceAll('\\', '/').endsWith('/' + TEST) && !file.message, 'The actual unit file must load without a file error');
  const cases = file.assertionResults;
  assert.deepEqual(cases.map(test => test.title).sort(), [...OWNED, ...PRESERVED].sort(), 'Every exact owned and preservation case must run');
  const owned = cases.filter(test => OWNED.includes(test.title));
  assert(cases.filter(test => PRESERVED.includes(test.title)).every(test => test.status === 'passed'), 'All five preservation cases must pass');
  let verdict;
  if (CONTROL) {
    assert.notEqual(result.status, 0, 'Faulted actual source must fail the test process');
    assert.equal(report.numFailedTests, 3, 'Only the three daily continuation assertions may fail');
    const cause = CONTROL === 'hide'
      ? /^AssertionError:.*expected \[\] to have a length of 1 but got \+0/s
      : /^AssertionError:.*(?:switchToUnlimited|spy).*called.*1.*0/s;
    assert(owned.every(test => test.status === 'failed' && test.failureMessages.length > 0 && test.failureMessages.every(message => cause.test(message))), 'Each owned case must fail its exact missing-button or missing-callback assertion');
    verdict = `simTransferPathSurrenderPractice control ${CONTROL}: green. Actual rewrite detected by exactly 3 owned assertions; 5 preservation cases passed.`;
  } else {
    assert.equal(result.status, 0, 'Actual Board wiring must pass');
    assert.equal(report.numFailedTests, 0);
    assert(cases.every(test => test.status === 'passed'), 'No skipped or failed case may earn normal credit');
    verdict = 'simTransferPathSurrenderPractice: green. 3 daily continuation cases and 5 preservation cases passed through the actual Board.';
  }
  console.log(`Actual unit file: ${file.name}; ${cases.length} exact cases reported.`);
  console.log(`Owned daily cases: ${owned.map(test => `${test.title}=${test.status}`).join('; ')}.`);
  console.log(`Preservation: ${cases.filter(test => PRESERVED.includes(test.title) && test.status === 'passed').length} actual cases passed.`);
  console.log(`Actual runner exit: ${result.status}; file message empty; raw setup and unhandled markers absent.`);
  console.log(verdict);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
