/* Round 768: rendered Fantasy Draft targeting preserves the original shortlist.
   DRAFT_POOL_CONTROL=unfilter changes an asserted temporary component copy. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.DRAFT_POOL_CONTROL || '';
assert.ok(['', 'unfilter'].includes(control), 'Unknown draft pool control');
const sourcePath = path.join(root, 'src/components/fantasy-draft/PlayerPool.tsx');
const source = await readFile(sourcePath, 'utf8');
let folder;
let copy;
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const anchor = '(!country || p.nationality === country) && (!foot || p.dominant_foot === foot)';
    assert.equal(source.split(anchor).length - 1, 1, 'Actual combined targeting binding must occur once');
    const changed = source.replace(anchor, 'true');
    assert.notEqual(changed, source, 'Control must change the real filter');
    await mkdir(path.join(root, '.sim-control'), { recursive: true });
    folder = await mkdtemp(path.join(root, '.sim-control/draft-pool-'));
    copy = path.join(folder, 'PlayerPool.tsx');
    await writeFile(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/fantasy-draft/PlayerPool': copy });
  }
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/draftPoolFilters.test.tsx', '--reporter=verbose'], { cwd: root, env, encoding: 'utf8', timeout: 120000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  const diagnostic = output.slice(-2500);
  if (control) {
    process.stdout.write(output.split('\n').filter(line => /[✓×]|FAIL |Tests\s|Test Files|Duration/.test(line)).join('\n') + '\n');
    process.stdout.write(diagnostic + '\n');
  } else process.stdout.write(output);
  assert.ok(!run.error, `${String(run.error)}\n${diagnostic}`);
  assert.match(output, /draftPoolFilters\.test\.tsx/, 'Actual component tests must run');
  if (control) {
    assert.notEqual(run.status, 0, diagnostic);
    assert.match(output, /Tests\s+1 failed.*6 passed/, diagnostic);
    assert.ok(output.split('\n').some(line => line.includes('FAIL ') && line.includes('combines country, foot, position and name before the shortlist and resets every selector')), 'Intended combined-filter failure must occur');
    assert.match(output, /Showing 10 of 16 available players/, 'The control must fail the actual targeted count');
    console.log('simDraftPoolFilters unfilter: combined targeting fails its rendered outcome, while six default, disabled, focus, empty, label and mutation checks still pass.');
  } else {
    assert.equal(run.status, 0, diagnostic);
    assert.match(output, /Tests\s+7 passed/, diagnostic);
    console.log('simDraftPoolFilters: seven rendered checks pass for country/foot/position/name targeting, counts/reset, original10/20 policy, exact identity and disabled choices.');
  }
  assert.equal(await readFile(sourcePath, 'utf8'), source, 'Production component must remain unchanged');
  console.log('simDraftPoolFilters: no filtering selections, save writes, random draws or input mutation; production source unchanged.');
} finally {
  if (copy) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
}
