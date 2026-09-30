/* Round 753: new chain links reveal without changing their names or scoring.
   Controls remove one binding from asserted temporary timeline copies. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.CHAIN_TIMELINE_MOTION_CONTROL || '';
assert.ok(['', 'unreveal', 'unconnect'].includes(control), 'Unknown chain timeline motion control');
const modules = [
  'components/ufc-chain/ChainTimeline',
  'components/tennis-chain/TennisChainTimeline',
  'components/nascar-chain/NascarChainTimeline',
];
let folder;
const copies = [];
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const anchor = control === 'unreveal'
      ? "index > 0 && index === chain.length - 1 ? motion.latest : ''"
      : "index === chain.length - 2 ? motion.connection : ''";
    const replacement = control === 'unreveal' ? "false ? motion.latest : ''" : "false ? motion.connection : ''";
    const base = path.join(root, '.sim-control');
    await mkdir(base, { recursive: true });
    folder = await mkdtemp(path.join(base, 'chain-motion-'));
    const swaps = {};
    for (const module of modules) {
      const source = await readFile(path.join(root, `src/${module}.tsx`), 'utf8');
      assert.equal(source.split(anchor).length - 1, 1, `${module} control anchor must occur once`);
      const changed = source.replace(anchor, replacement);
      assert.notEqual(changed, source, `${module} control must change the source`);
      const copy = path.join(folder, `${path.basename(module)}.tsx`);
      await writeFile(copy, changed);
      copies.push(copy);
      swaps[`@/${module}`] = copy;
    }
    env.NO_DOUBLE_SWAP = JSON.stringify(swaps);
  }
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/chainTimelineMotion.test.tsx', '--reporter=verbose'], { cwd: root, env, encoding: 'utf8', timeout: 120000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  const diagnostic = output.slice(-6000);
  process.stdout.write(output);
  assert.ok(!run.error, String(run.error));
  assert.match(output, /chainTimelineMotion\.test\.tsx/, 'The actual timeline tests must run');
  if (control) {
    assert.notEqual(run.status, 0, diagnostic);
    assert.match(output, /3 failed.*12 passed/, diagnostic);
    assert.match(output, /reveals only the appended link and connection while retaining earlier nodes/, diagnostic);
    assert.match(output, new RegExp(`Expected the element to have class:[\\s\\S]*${control === 'unreveal' ? 'latest' : 'connection'}`), diagnostic);
    console.log(`simChainTimelineMotion ${control} control: all three actual timeline transition checks rejected the removed binding; twelve content, seed and scoring checks stayed green.`);
  } else {
    assert.equal(run.status, 0, diagnostic);
    assert.match(output, /15 passed/, diagnostic);
    console.log('simChainTimelineMotion: fifteen actual-timeline empty, seed, append, stable-node, name, connection, bonus, ended-color and multiplier checks passed.');
  }
} finally {
  for (const copy of copies) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
}
