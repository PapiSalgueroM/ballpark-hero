/* Round 752: real ownership text, hot-seat boundary and presentation identity.
   Control moves the warning boundary in an asserted temporary copy only. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, copyFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.OWNER_MANDATE_MOTION_CONTROL || '';
assert.ok(['', 'boundary'].includes(control), 'Unknown ownership motion control');
let folder;
const copies = [];
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const source = await readFile(path.join(root, 'src/components/front-office-shared/OwnerMandateCard.tsx'), 'utf8');
    const anchor = '{trust <= 25 && (';
    assert.equal(source.split(anchor).length - 1, 1, 'Control boundary must occur once');
    const changed = source.replace(anchor, '{trust <= 26 && (');
    assert.notEqual(changed, source, 'The control must change the real warning boundary');
    const base = path.join(root, '.sim-control');
    await mkdir(base, { recursive: true });
    folder = await mkdtemp(path.join(base, 'ownership-'));
    const componentCopy = path.join(folder, 'OwnerMandateCard.tsx');
    const cssCopy = path.join(folder, 'OwnerMandateCard.module.css');
    copies.push(componentCopy, cssCopy);
    await writeFile(componentCopy, changed);
    await copyFile(path.join(root, 'src/components/front-office-shared/OwnerMandateCard.module.css'), cssCopy);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/front-office-shared/OwnerMandateCard': componentCopy });
  }
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/ownerMandateMotion.test.tsx'], { cwd: root, env, encoding: 'utf8', timeout: 120000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  process.stdout.write(output);
  assert.ok(!run.error, String(run.error));
  assert.match(output, /ownerMandateMotion\.test\.tsx/, 'The actual card tests must run');
  if (control) {
    assert.notEqual(run.status, 0, output.slice(-3000));
    assert.match(output, /1 failed.*6 passed/, output.slice(-3000));
    assert.match(output, /preserves trust 26/, output);
    console.log('Control: the trust-26 outcome rejected an incorrect hot-seat warning; six unrelated checks stayed green.');
  } else {
    assert.equal(run.status, 0, output.slice(-3000));
    assert.match(output, /7 passed/, output);
    console.log('Seven actual ownership-card text, trust, boundary and stable-identity checks passed.');
  }
} finally {
  for (const copy of copies) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
}
