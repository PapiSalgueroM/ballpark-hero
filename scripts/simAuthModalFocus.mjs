/* Round 853: real account dialogs restore their opener and explain guest scores.
   AUTH_MODAL_FOCUS_CONTROL=nofocus or accountonly rejects the previous defects. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.AUTH_MODAL_FOCUS_CONTROL || '';
assert.ok(['', 'nofocus', 'accountonly'].includes(control), 'Unknown account dialog control');
const sourcePath = path.join(root, 'src/components/auth/AuthModal.tsx');
const original = await readFile(sourcePath, 'utf8');
let folder, copy;
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const anchors = {
      nofocus: ['opener.current.focus({ preventScroll: true });', 'void opener.current;'],
      accountonly: [
        "'Guests earn points, build streaks and appear on the leaderboard too. Create a free account for your profile and saved scores.'",
        '"First time here? It\'s free and takes 10 seconds. Streaks, points and world rank only count once you have an account."',
      ],
    };
    const [anchor, replacement] = anchors[control];
    assert.equal(original.split(anchor).length - 1, 1, 'Control must change the real binding or rendered copy once');
    const changed = original.replace(anchor, replacement);
    assert.notEqual(changed, original);
    const base = path.join(root, '.sim-control');
    await mkdir(base, { recursive: true });
    folder = await mkdtemp(path.join(base, 'auth-focus-'));
    copy = path.join(folder, 'AuthModal.tsx');
    await writeFile(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/auth/AuthModal': copy });
  }
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/authModalFocus.test.tsx', '--reporter=verbose'], { cwd: root, env, encoding: 'utf8', timeout: 120000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  process.stdout.write(output);
  assert.ok(!run.error, String(run.error));
  assert.match(output, /authModalFocus\.test\.tsx/);
  if (control === 'nofocus') {
    assert.notEqual(run.status, 0);
    assert.match(output, /6 failed.*2 passed/);
    assert.match(output, /Expected element with focus/);
    console.log('simAuthModalFocus: six exact-opener cases rejected removed focus return; form trap and guest copy still passed.');
  } else if (control === 'accountonly') {
    assert.notEqual(run.status, 0);
    assert.match(output, /1 failed.*7 passed/);
    assert.match(output, /only count once you have an account/);
    console.log('simAuthModalFocus: guest scoring disclosure rejected the account-only copy; seven focus and form cases still passed.');
  } else {
    assert.equal(run.status, 0);
    assert.match(output, /8 passed/);
    console.log('simAuthModalFocus: eight real-dialog checks passed for login, signup, close, Escape, exact opener, tab switch, form trap and guest disclosure.');
  }
  assert.equal(await readFile(sourcePath, 'utf8'), original, 'Production source must remain untouched');
} finally {
  if (copy) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
}
