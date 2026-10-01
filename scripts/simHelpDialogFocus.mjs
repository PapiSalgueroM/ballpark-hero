/* Round 759: real rules dialogs return focus on all existing close paths.
   HELP_DIALOG_FOCUS_CONTROL=unreturn removes the actual focus binding in a copy. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.HELP_DIALOG_FOCUS_CONTROL || '';
assert.ok(['', 'unreturn'].includes(control), 'Unknown help focus control');
const sourcePath = path.join(root, 'src/components/game/HowToPlayPopover.tsx');
const original = await readFile(sourcePath, 'utf8');
let folder, copy;
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const anchor = 'triggerRef.current?.focus();';
    assert.equal(original.split(anchor).length - 1, 1, 'Control must change the actual focus call once');
    const changed = original.replace(anchor, 'void triggerRef.current;');
    assert.notEqual(changed, original);
    const base = path.join(root, '.sim-control');
    await mkdir(base, { recursive: true });
    folder = await mkdtemp(path.join(base, 'help-focus-'));
    copy = path.join(folder, 'HowToPlayPopover.tsx');
    await writeFile(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/game/HowToPlayPopover': copy });
  }
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/helpDialogFocus.test.tsx', '--reporter=verbose'], { cwd: root, env, encoding: 'utf8', timeout: 120000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  process.stdout.write(output);
  assert.ok(!run.error, String(run.error));
  assert.match(output, /helpDialogFocus\.test\.tsx/);
  if (control) {
    assert.notEqual(run.status, 0);
    assert.match(output, /5 failed.*1 passed/);
    assert.match(output, /Expected element with focus/);
    console.log('simHelpDialogFocus: five focus checks rejected the removed binding; controlled content and callbacks still passed.');
  } else {
    assert.equal(run.status, 0);
    assert.match(output, /6 passed/);
    console.log('simHelpDialogFocus: six real-dialog checks passed for close paths, trigger identity, controlled callbacks and content.');
  }
  assert.equal(await readFile(sourcePath, 'utf8'), original, 'Production source must remain untouched');
} finally {
  if (copy) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
}
