/* Round 769: actual map filters, bounded viewport, drag and keyboard routing.
   CONQUEST_EXPLORE_CONTROL=owner|powerup|gate|sport|camera|drag|keyboard|capture|bounds|fit
   changes asserted temporary source copies, never the production tree. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mapModule = '@/components/conquest/ConquestRegionMap';
const viewModule = '@/lib/conquestMapView';
const controls = {
  owner: { module: mapModule, anchor: '(!ownerFilter || owner === ownerFilter)', replacement: 'true', fails: 'combines search, owner and availability' },
  powerup: { module: mapModule, anchor: "availability === 'powerup' && !owner && powerupStates?.has(region.id)", replacement: "availability === 'powerup' && powerupStates?.has(region.id)", fails: 'counts a power-up only on unclaimed land' },
  gate: { module: mapModule, anchor: 'exploring === sport.key && exploreEnabled', replacement: 'exploring === sport.key', fails: 'hands the camera back immediately' },
  sport: { module: mapModule, anchor: 'exploring === sport.key && exploreEnabled', replacement: 'exploring !== null && exploreEnabled', fails: 'hands the camera back immediately' },
  camera: { module: mapModule, anchor: "transform: isExploring ? 'none' : camera.transform", replacement: 'transform: camera.transform', fails: 'uses a bounded manual viewport' },
  drag: { module: mapModule, anchor: 'const suppress = suppressClick.current && event.detail > 0;', replacement: 'const suppress = false;', fails: 'suppresses the drag click only' },
  keyboard: { module: mapModule, anchor: 'const suppress = suppressClick.current && event.detail > 0;', replacement: 'const suppress = suppressClick.current;', fails: 'suppresses the drag click only' },
  capture: { module: mapModule, anchor: 'if (event.target === event.currentTarget) drag.current = null;', replacement: 'drag.current = null;', fails: 'suppresses the drag click only' },
  bounds: { module: viewModule, anchor: 'x: Math.max(0, Math.min(extent.width - extent.width / scale, view.x))', replacement: 'x: view.x', fails: 'bounds zoom and pan' },
  fit: { module: viewModule, anchor: 'x: -fit.tx / fit.scale', replacement: 'x: 0', fails: 'fits actual region bounds' },
};
const control = process.env.CONQUEST_EXPLORE_CONTROL || '';
assert.ok(!control || control in controls, 'Unknown Explore control');
const originals = new Map(await Promise.all([mapModule, viewModule].map(async module => {
  const source = path.join(root, 'src', module.slice(2) + (module === mapModule ? '.tsx' : '.ts'));
  return [source, await readFile(source, 'utf8')];
})));
let folder, copy;
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const spec = controls[control];
    const source = path.join(root, 'src', spec.module.slice(2) + (spec.module === mapModule ? '.tsx' : '.ts'));
    const original = originals.get(source);
    assert.equal(original.split(spec.anchor).length - 1, 1, 'Control must change exactly one actual code binding');
    const changed = original.replace(spec.anchor, spec.replacement);
    assert.notEqual(changed, original);
    await mkdir(path.join(root, '.sim-control'), { recursive: true });
    folder = await mkdtemp(path.join(root, '.sim-control/conquest-explore-'));
    copy = path.join(folder, path.basename(source));
    await writeFile(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ [spec.module]: copy });
  }
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/conquestExplore.test.tsx', '--reporter=verbose'], { cwd: root, env, encoding: 'utf8', timeout: 120000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  process.stdout.write(output);
  assert.ok(!run.error, String(run.error));
  assert.match(output, /conquestExplore\.test\.tsx/, 'Actual component and geometry tests must execute');
  if (control) {
    assert.notEqual(run.status, 0, 'Changed actual module must fail measured outcomes');
    const counts = output.match(/Tests\s+(\d+) failed\s*\|\s*(\d+) passed/);
    assert.ok(counts && Number(counts[1]) > 0 && Number(counts[2]) > 0, 'Control must fail actual outcomes and retain unaffected checks');
    assert.equal(Number(counts[1]) + Number(counts[2]), 10);
    assert.ok(output.split('\n').some(line => line.includes('FAIL') && line.includes(controls[control].fails)), 'Control must fail its intended actual outcome');
    console.log(`simConquestExplore ${control}: ${counts[1]} intended checks failed, ${counts[2]} unaffected checks passed.`);
  } else {
    assert.equal(run.status, 0, output.slice(-6000));
    assert.match(output, /Tests\s+10 passed/);
    console.log('simConquestExplore: ten actual map/helper checks passed for live combined filters, bounded fit/zoom/pan, retained regions, drag-versus-keyboard routing and immediate scene camera hand-back.');
  }
  for (const [source, original] of originals) assert.equal(await readFile(source, 'utf8'), original, 'Production modules must stay unchanged');
} finally {
  if (copy) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
}
