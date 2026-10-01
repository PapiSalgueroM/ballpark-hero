/* Round 772: actual shared lineup dialog focus and unchanged chosen identity.
   LINEUP_FOCUS_CONTROL=unfocus|nofallback changes asserted temporary copies only. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.LINEUP_FOCUS_CONTROL || '';
const controls = {
  unfocus: { failed: 5, passed: 1, anchor: 'target.focus({ preventScroll: true })', replacement: 'void target' },
  nofallback: { failed: 2, passed: 4, anchor: 'opener?.trigger.isConnected ? opener.trigger : opener?.slot', replacement: 'opener?.trigger' },
};
assert.ok(!control || control in controls, 'Unknown lineup focus control');
const sourcePath = path.join(root, 'src/components/perfect-lineup/GenericLineupBoard.tsx');
const original = await readFile(sourcePath, 'utf8');
let folder;
let copy;
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const { anchor, replacement } = controls[control];
    assert.equal(original.split(anchor).length - 1, 1, 'Control must alter exactly one actual focus binding');
    const changed = original.replace(anchor, replacement);
    assert.notEqual(changed, original, 'Control must change actual code');
    await mkdir(path.join(root, '.sim-control'), { recursive: true });
    folder = await mkdtemp(path.join(root, '.sim-control/lineup-focus-'));
    copy = path.join(folder, 'GenericLineupBoard.tsx');
    await writeFile(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/perfect-lineup/GenericLineupBoard': copy });
  }
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/lineupPickerFocus.test.tsx', '--reporter=verbose'], {
    cwd: root, env, encoding: 'utf8', timeout: 120000,
  });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  process.stdout.write(output);
  assert.ok(!run.error, String(run.error));
  assert.match(output, /lineupPickerFocus\.test\.tsx/, 'Actual dialog tests must execute');
  if (control) {
    assert.notEqual(run.status, 0, 'Changed focus behavior must fail actual dialog outcomes');
    const expected = controls[control];
    assert.match(output, new RegExp(`${expected.failed} failed.*${expected.passed} passed`), output.slice(-5000));
    console.log(`simLineupPickerFocus ${control}: ${expected.failed} intended focus checks rejected the changed copy; ${expected.passed} unchanged checks passed.`);
  } else {
    assert.equal(run.status, 0, output.slice(-5000));
    assert.match(output, /6 passed/);
    console.log('simLineupPickerFocus: six actual dialog checks passed for exact opener return, stable selected-slot fallback, Escape, repeat opens and unchanged chosen identity.');
  }
  assert.equal(await readFile(sourcePath, 'utf8'), original, 'Controls must leave shared production source unchanged');
} finally {
  if (copy) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
}
