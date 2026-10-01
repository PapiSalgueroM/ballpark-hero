/* Round 750: compact content retains full names, rarity and Board behavior.
   GRID_CELL_LAYOUT_CONTROL=notitle removes full-name titles in copies only. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.GRID_CELL_LAYOUT_CONTROL || '';
assert.ok(['', 'notitle'].includes(control), 'Unknown grid cell layout control');
let folder;
const copies = [];
const originals = [];
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const base = path.join(root, '.sim-control');
    await mkdir(base, { recursive: true });
    folder = await mkdtemp(path.join(base, 'grid-layout-'));
    const aliases = {};
    for (const module of ['@/components/football-grid/GridBoard', '@/components/soccer-grid/SoccerGridBoard']) {
      const sourcePath = path.join(root, 'src', module.slice(2) + '.tsx');
      const source = await readFile(sourcePath, 'utf8');
      const anchor = 'title={cell.playerName}';
      assert.equal(source.split(anchor).length - 1, 1, `${module} full-name title anchor must occur once`);
      const changed = source.replace(anchor, '');
      assert.notEqual(changed, source, 'Control must change rendered full-name access');
      const copy = path.join(folder, path.basename(sourcePath));
      copies.push(copy);
      originals.push({ sourcePath, source });
      await writeFile(copy, changed);
      aliases[module] = copy;
    }
    env.NO_DOUBLE_SWAP = JSON.stringify(aliases);
  }
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/gridCellLayout.test.tsx'], { cwd: root, env, encoding: 'utf8', timeout: 120000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  const diagnostic = output.slice(-2500);
  assert.ok(!run.error, `${String(run.error)}\n${diagnostic}`);
  assert.match(output, /gridCellLayout\.test\.tsx/, 'The actual Board layout tests must run');
  if (control) {
    assert.notEqual(run.status, 0, diagnostic);
    assert.match(output, /Tests\s+4 failed/, diagnostic);
    assert.match(output, /Unable to find an element with the title: LongFirstname AnotherMiddleName LongFamilyName/, diagnostic);
    for (const { sourcePath, source } of originals) assert.equal(await readFile(sourcePath, 'utf8'), source, 'Control must leave production source unchanged');
    console.log('simGridCellLayout control: full-name title removed from two asserted Board copies.');
    console.log('All four real-board checks rejected the missing full-name access.');
    console.log('Expected title-query failures confirmed the actual rendered defect.');
    console.log('Production source stayed unchanged; owned temporary copies were cleaned.');
  } else {
    assert.equal(run.status, 0, diagnostic);
    assert.match(output, /Tests\s+4 passed/, diagnostic);
    console.log('simGridCellLayout: four rendered Board content checks passed.');
    console.log('Complete accessible names and full-name titles survived compact visual wrapping.');
    console.log('Every rarity tier and original feedback class remained present.');
    console.log('Button identity, focus and callbacks were preserved; locked cells rejected clicks.');
  }
} finally {
  for (const copy of copies) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
}
