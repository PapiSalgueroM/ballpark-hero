/* Round 766: actual Mystery Box Board retains settled values, controls and placement identity.
   MYSTERY_BOX_MOTION_CONTROL=unreveal|uncue|unplaced|wrongslot|notitle|restorecue
   changes asserted temporary copies only. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.MYSTERY_BOX_MOTION_CONTROL || '';
const controls = {
  unreveal: { failed: 2, passed: 8, changes: [['className={motion.drawn}', 'className=""']] },
  uncue: { failed: 2, passed: 8, changes: [['highlight && <span', 'false && <span']] },
  unplaced: { failed: 1, passed: 9, changes: [["p && placedSlot === i ? motion.placed : ''", "false ? motion.placed : ''"]] },
  wrongslot: { failed: 2, passed: 8, changes: [['onClick={() => place(i)}', 'onClick={() => place((i + 1) % 11)}']] },
  notitle: { failed: 2, passed: 8, changes: [['title={p.name}', '']] },
  restorecue: { failed: 2, passed: 8, changes: [['if (packIndex !== previous.current.packIndex)', 'if (true)'], ['packIndex > previous.current.packIndex && added >= 0', 'added >= 0']] },
};
assert.ok(!control || control in controls, 'Unknown Mystery Box motion control');
const sourcePath = path.join(root, 'src/components/mystery-box/MysteryBoxBoard.tsx');
const original = await readFile(sourcePath, 'utf8');
let folder, copy;
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    let changed = original;
    for (const [anchor, replacement] of controls[control].changes) {
      assert.equal(changed.split(anchor).length - 1, 1, 'Control must alter its actual binding exactly once');
      changed = changed.replace(anchor, replacement);
    }
    assert.notEqual(changed, original, 'Control must change actual code');
    const css = "'./MysteryBoxMotion.module.css'";
    assert.equal(changed.split(css).length - 1, 1, 'Copied Board must retain the actual stylesheet');
    await mkdir(path.join(root, '.sim-control'), { recursive: true });
    folder = await mkdtemp(path.join(root, '.sim-control/mystery-box-'));
    copy = path.join(folder, 'MysteryBoxBoard.tsx');
    await writeFile(copy, changed.replace(css, "'@/components/mystery-box/MysteryBoxMotion.module.css'"));
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/mystery-box/MysteryBoxBoard': copy });
  }
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/mysteryBoxMotion.test.tsx', '--reporter=verbose'], { cwd: root, env, encoding: 'utf8', timeout: 120000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  process.stdout.write(output);
  assert.ok(!run.error, String(run.error));
  assert.match(output, /mysteryBoxMotion\.test\.tsx/, 'Actual Board tests must execute');
  if (control) {
    assert.notEqual(run.status, 0, 'Changed production copy must fail actual outcomes');
    assert.match(output, new RegExp(`${controls[control].failed} failed.*${controls[control].passed} passed`), output.slice(-6000));
    console.log(`simMysteryBoxMotion ${control}: ${controls[control].failed} intended Board checks rejected the changed copy; ${controls[control].passed} unaffected checks passed.`);
  } else {
    assert.equal(run.status, 0, output.slice(-6000));
    assert.match(output, /10 passed/);
    console.log('simMysteryBoxMotion: ten actual Board checks passed for settled card values/tiers, exact slot callbacks, stable controls, committed placement, quiet restoration and unchanged sharing.');
  }
  assert.equal(await readFile(sourcePath, 'utf8'), original, 'Controls must leave production source unchanged');
} finally {
  if (copy) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
}
