/* Round 760: real shared-map selection, keyboard and current-owner outcomes.
   Controls replace one asserted binding in their own temporary source copy. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.CONQUEST_REGION_DETAILS_CONTROL || '';
assert.ok(['', 'hoveronly', 'nokeyboard', 'staleowner'].includes(control), 'Unknown conquest region details control');
const mutations = {
  hoveronly: ['setSelected(regionId);', 'setHovered(regionId);'],
  nokeyboard: ["if (event.key === 'Enter' || event.key === ' ') {", 'if (false) {'],
  staleowner: ['const selectedOwner = selected ? owners[selected] ?? null : null;', 'const selectedOwner = useMemo(() => selected ? owners[selected] ?? null : null, [selected]);'],
};
let folder;
let copy;
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const source = await readFile(path.join(root, 'src/components/conquest/ConquestRegionMap.tsx'), 'utf8');
    const [anchor, replacement] = mutations[control];
    assert.equal(source.split(anchor).length - 1, 1, 'The control binding must occur exactly once');
    const changed = source.replace(anchor, replacement);
    assert.notEqual(changed, source, 'The control must actually change the map');
    const base = path.join(root, '.sim-control');
    await mkdir(base, { recursive: true });
    folder = await mkdtemp(path.join(base, 'conquest-details-'));
    copy = path.join(folder, 'ConquestRegionMap.tsx');
    await writeFile(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/conquest/ConquestRegionMap': copy });
  }
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/conquestRegionDetails.test.tsx', '--reporter=verbose'], { cwd: root, env, encoding: 'utf8', timeout: 120000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  const diagnostic = output.slice(-6500);
  process.stdout.write(output);
  assert.ok(!run.error, String(run.error));
  assert.match(output, /conquestRegionDetails\.test\.tsx/, 'The actual shared-map tests must run');
  if (control) {
    assert.notEqual(run.status, 0, diagnostic);
    if (control === 'hoveronly') {
      assert.match(output, /8 failed.*1 passed/, diagnostic);
      assert.match(output, /keeps a tapped selection open after pointer exit and independent hover/, diagnostic);
      assert.match(output, /Unable to find an accessible element with the role "region"/, diagnostic);
      console.log('simConquestRegionDetails hoveronly control: all eight selection-dependent outcomes rejected temporary hover; initial hover remained green.');
    } else if (control === 'nokeyboard') {
      assert.match(output, /2 failed.*7 passed/, diagnostic);
      assert.match(output, /opens details with the Enter keyboard action/, diagnostic);
      assert.match(output, /expected false to be true/, diagnostic);
      console.log('simConquestRegionDetails nokeyboard control: Enter and Space both rejected the removed handler; all seven pointer and data outcomes stayed green.');
    } else {
      assert.match(output, /2 failed.*7 passed/, diagnostic);
      assert.match(output, /updates the selected owner, empire count and invincibility/, diagnostic);
      assert.match(output, /Expected element to have text content:[\s\S]*Birch Foxes/, diagnostic);
      console.log('simConquestRegionDetails staleowner control: both current-owner transitions rejected the stale owner; seven other map outcomes stayed green.');
    }
  } else {
    assert.equal(run.status, 0, diagnostic);
    assert.match(output, /9 passed/, diagnostic);
    console.log('simConquestRegionDetails: nine actual shared-map hover, persistent-selection, keyboard, focus, live-owner, power-up and retained-layer checks passed.');
  }
} finally {
  if (copy) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
}
