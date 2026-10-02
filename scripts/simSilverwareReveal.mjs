/* Round 866: an earned reveal stays readable until the actual Next action.
   SILVERWARE_REVEAL_CONTROL=auto|repeat|focus|all exercises isolated defects. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hook = 'src/hooks/useSilverwareSort.ts';
const page = 'src/pages/SilverwareSort.tsx';
const test = 'src/test/silverwareReveal.test.tsx';
const control = process.env.SILVERWARE_REVEAL_CONTROL || '';
assert.ok(['', 'auto', 'repeat', 'focus', 'all'].includes(control), 'Unknown reveal control.');
const heldPaths = [hook, page, test];
const verifyHeld = [];
for (const file of heldPaths) {
  const bytes = fs.readFileSync(path.join(root, file));
  verifyHeld.push(() => assert.deepEqual(fs.readFileSync(path.join(root, file)), bytes, `${file} must remain byte-identical.`));
}
const readSource = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const parent = path.join(root, '.sim-control');
fs.mkdirSync(parent, { recursive: true });
const folder = fs.mkdtempSync(path.join(parent, 'silverware-reveal866-'));
const report = path.join(folder, 'report.json');
const title = text => `Silverware deliberate reveal ${text}`;
const controls = {
  auto: {
    file: hook, anchor: '    pendingResults.current = next;',
    replacement: '    pendingResults.current = next;\n    window.setTimeout(() => { setResults(next); resetBoardState(); }, 3400);',
    targets: [
      title('keeps the daily result readable beyond ten seconds until a deliberate advance'),
      title('keeps the unlimited result readable beyond ten seconds until a deliberate advance'),
      title('saves and books the final daily immediately while its reveal remains readable'),
      title('shows earned rungs and points, focuses manual Next and names the final result action'),
    ],
  },
  repeat: {
    file: hook, anchor: '    pendingResults.current = null;\n    setResults(next);',
    replacement: '    setResults(next);',
    targets: [title('ignores a repeated advance without erasing the next board arrangement')],
  },
  focus: {
    file: page, anchor: '    if (revealed) advanceButton.current?.focus({ preventScroll: true });',
    replacement: '    if (revealed) void advanceButton.current;',
    targets: [title('shows earned rungs and points, focuses manual Next and names the final result action')],
  },
};

function run(kind = '') {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  if (kind) {
    const chosen = controls[kind], source = readSource(chosen.file);
    assert.equal(source.split(chosen.anchor).length - 1, 1, 'Actual control anchor must occur exactly once.');
    const changed = source.replace(chosen.anchor, chosen.replacement);
    assert.notEqual(changed, source, 'The control must change executable source.');
    const copy = path.join(folder, path.basename(chosen.file));
    fs.writeFileSync(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ ['@/' + chosen.file.replace(/^src\//, '').replace(/\.tsx?$/, '')]: copy });
  }
  const result = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', test, '--reporter=json', '--outputFile', report], { cwd: root, env, encoding: 'utf8', timeout: 120000 });
  assert.ok(!result.error, String(result.error));
  assert.ok(fs.existsSync(report), 'The actual game suite must produce a report.');
  const json = JSON.parse(fs.readFileSync(report, 'utf8'));
  assert.equal(json.numTotalTests, 10);
  assert.equal(json.numPendingTests, 0);
  assert.equal(Number(json.numUnhandledErrors ?? 0), 0);
  const failed = json.testResults.flatMap(file => file.assertionResults).filter(row => row.status === 'failed');
  if (!kind) {
    assert.equal(result.status, 0, failed.map(row => `${row.fullName}: ${row.failureMessages[0]}`).join('\n'));
    assert.equal(json.numPassedTests, 10);
    console.log('Silverware reveal: 10/10 actual-hook/page cases passed: manual progression, scores, locked greens, daily booking, reload, mode/replay isolation, midnight and focused Next.');
    console.log('Silverware reveal: daily and Unlimited boards stayed readable beyond ten seconds, then advanced through the actual player action.');
    console.log('Silverware reveal: wrong first/final tries retained locked greens and earned scores; repeated Next did not erase the next arrangement.');
    console.log('Silverware reveal: final daily saved/booked immediately, restored once and retained its dealt date across midnight.');
    console.log('Silverware reveal: mode/replay cleared pending results; actual page announced earned points and focused Next/See results.');
  } else {
    assert.notEqual(result.status, 0);
    assert.deepEqual(failed.map(row => row.fullName).sort(), [...controls[kind].targets].sort(), 'Only the intended outcome assertions may fail.');
    assert.equal(json.numPassedTests, 10 - controls[kind].targets.length);
    assert.ok(failed.every(row => row.failureMessages.some(message => /AssertionError|expect\(|toBeInTheDocument|toHaveFocus/.test(message)) && !row.failureMessages.some(message => /timed out|STACK_TRACE_ERROR|Failed to resolve|Cannot find module/.test(message))), failed.map(row => row.failureMessages[0]).join('\n'));
    console.log(`Silverware control ${kind}: ${failed.length} intended outcome assertions rejected; ${json.numPassedTests} independent baselines passed, all10 ran with zero pending/unhandled.`);
    console.log(`Silverware control ${kind}: unique executable anchor changed in an isolated copy, leaving production source intact.`);
    failed.forEach(row => console.log(`Silverware control ${kind}: rejected ${row.fullName}.`));
  }
  fs.rmSync(report, { force: true });
}
try {
  if (!control || control === 'all') run();
  if (control === 'all') for (const kind of Object.keys(controls)) run(kind);
  else if (control) run(control);
} finally {
  fs.rmSync(folder, { recursive: true, force: true });
  verifyHeld.forEach(check => check());
}
console.log('Silverware reveal cleanup: owned temporary folder removed; production bytes preserved.');
