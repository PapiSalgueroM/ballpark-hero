/* Face Off rejects expired picks even when the redraw interval is delayed.
   FACEOFF_DEADLINE_CONTROL=expired removes the actual hook deadline guard
   in an owned temporary copy. Ten expired outcomes must fail while five
   early-scoring and ordinary-timeout baselines still pass. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(root, 'src/hooks/useFaceOff.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const control = process.env.FACEOFF_DEADLINE_CONTROL || '';
assert.ok(!control || control === 'expired', 'Unknown deadline control.');
const parent = path.join(root, '.sim-control');
fs.mkdirSync(parent, { recursive: true });
const dir = fs.mkdtempSync(path.join(parent, 'faceoff860-'));
const report = path.join(dir, 'result.json');
const title = name => `Face Off answer-time deadline ${name}`;
const expired = ['daily', 'unlimited'].flatMap(mode => [10000, 11000].map(ms => title(`rejects ${mode} correct input at ${ms}ms while interval callbacks are delayed`)));
for (const ms of [10000, 11000]) {
  expired.push(title(`rejects Player 1 at ${ms}ms and preserves Player 2 own early clock`));
  expired.push(title(`rejects Player 2 at ${ms}ms and preserves Player 1 early score`));
}
expired.push(title('settles both expired chairs once without changing their round'), title('settles an expired solo pick once even when click and timeout meet'));
try {
  const env = { ...process.env };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const guard = '    if (used >= SHOT_CLOCK) pick = null;';
    assert.equal(source.split(guard).length - 1, 1, 'The control must match one executable guard.');
    const changed = source.replace(guard, '');
    assert.notEqual(changed, source, 'The control must change the hook.');
    const copy = path.join(dir, 'useFaceOff.ts');
    fs.writeFileSync(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/hooks/useFaceOff': copy });
  }
  const result = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'src/test/faceOffDeadline.test.tsx', '--reporter=json', '--outputFile', report], { cwd: root, env, encoding: 'utf8', timeout: 120000 });
  if (result.error) throw result.error;
  assert.ok(fs.existsSync(report), 'Actual hook tests must produce a report.');
  const json = JSON.parse(fs.readFileSync(report, 'utf8'));
  assert.equal(json.numTotalTests, 15); assert.equal(json.numPendingTests, 0); assert.equal(Number(json.numUnhandledErrors ?? 0), 0);
  const failed = json.testResults.flatMap(file => file.assertionResults).filter(test => test.status === 'failed');
  if (!control) {
    assert.equal(result.status, 0, failed.map(test => test.fullName + ': ' + test.failureMessages[0]).join('\n'));
    assert.equal(json.numPassedTests, 15); assert.deepEqual(failed, []);
    console.log('Face Off deadline: 15/15 actual hook outcomes passed.');
    console.log('Face Off deadline: early correct/wrong daily and unlimited scoring passed.');
    console.log('Face Off deadline: ordinary timeout and next-round clock reset passed.');
    console.log('Face Off deadline: exact10s and delayed11s picks score zero in both solo modes.');
    console.log('Face Off deadline: each expired chair scores zero while the other early chair keeps its own score.');
    console.log('Face Off deadline: both expired chairs and coincident click/timeout settle once.');
  } else {
    assert.notEqual(result.status, 0);
    assert.deepEqual(failed.map(test => test.fullName).sort(), expired.sort());
    assert.equal(json.numPassedTests, 5);
    assert.ok(failed.every(test => test.failureMessages.some(message => /AssertionError/.test(message))));
    console.log('Face Off deadline control: removed guard caused exactly ten intended expired-input failures.');
    console.log('Face Off deadline control: all five independent early-score/ordinary-timeout baselines held.');
    console.log('Face Off deadline control: all15 tests ran with zero pending cases or unhandled errors.');
  }
} finally {
  for (const file of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, file));
  fs.rmdirSync(dir);
  assert.equal(fs.readFileSync(sourcePath, 'utf8'), source, 'The production hook must stay byte-identical.');
}
console.log('Face Off deadline cleanup: owned copies/reports removed; production hook bytes held.');
