/* Round 749: real grid feedback keeps cell identity and game behavior.
   Control removes both correct glow bindings in asserted temporary copies. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.GRID_CELL_MOTION_CONTROL || '';
assert.ok(['', 'unglow'].includes(control), 'Unknown grid cell motion control');
let folder;
const copies = [];
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };
  if (control) {
    const base = path.join(root, '.sim-control');
    await mkdir(base, { recursive: true });
    folder = await mkdtemp(path.join(base, 'grid-motion-'));
    const aliases = {};
    for (const [module, filename] of [
      ['@/components/football-grid/GridBoard', 'GridBoard.tsx'],
      ['@/components/soccer-grid/SoccerGridBoard', 'SoccerGridBoard.tsx'],
    ]) {
      const source = await readFile(path.join(root, 'src', module.slice(2) + '.tsx'), 'utf8');
      const anchor = "cell.status === 'correct' && motion.correct";
      assert.equal(source.split(anchor).length - 1, 1, `${module} control anchor must occur once`);
      const changed = source.replace(anchor, 'false && motion.correct');
      assert.notEqual(changed, source, `${module} control must change the binding`);
      const copy = path.join(folder, filename);
      copies.push(copy);
      await writeFile(copy, changed);
      aliases[module] = copy;
    }
    env.NO_DOUBLE_SWAP = JSON.stringify(aliases);
  }
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/gridCellMotion.test.tsx'], { cwd: root, env, encoding: 'utf8', timeout: 120000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  const diagnostic = output.slice(-5000);
  assert.ok(!run.error, String(run.error));
  assert.match(output, /gridCellMotion\.test\.tsx/, 'The actual board tests must run');
  process.stdout.write(output);
  if (control) {
    assert.notEqual(run.status, 0, diagnostic);
    assert.match(output, /2 failed.*6 passed/, diagnostic);
    for (const board of ['football', 'soccer']) {
      assert.match(output, new RegExp(`${board}.*changes feedback without replacing the focused button or accepting a locked cell`), diagnostic);
    }
    assert.match(output, /Expected the element to have class:[\s\S]*correct/, diagnostic);
    console.log('simGridCellMotion control: both transition checks rejected missing correct glows; six board invariant checks stayed green.');
  } else {
    assert.equal(run.status, 0, diagnostic);
    assert.match(output, /8 passed/, diagnostic);
    console.log('simGridCellMotion: eight real-board feedback, focus, callback, empty-retry and rarity checks passed.');
  }
} finally {
  for (const copy of copies) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
}
