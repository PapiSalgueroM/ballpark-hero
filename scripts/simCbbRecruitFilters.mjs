/* Round 758: actual CBB recruiting filters over generated saved prospects.
   CBB_RECRUIT_FILTER_CONTROL=unfilter or resave changes asserted copies only. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.CBB_RECRUIT_FILTER_CONTROL || '';
assert.ok(['', 'unfilter', 'resave'].includes(control), 'Unknown CBB recruiting filter control');
const sourcePath = path.join(root, 'src/components/cbb-dynasty/CbbDynastyBoard.tsx');
const source = await readFile(sourcePath, 'utf8');
let folder;
const copies = [];
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const anchor = control === 'unfilter'
      ? 'const matchesFilters = (r: CbbRecruit) => (!positionFilter || r.pos === positionFilter) && (!starFilter || r.stars >= Number(starFilter));'
      : 'onChange={e => setPositionFilter(e.target.value)}';
    const replacement = control === 'unfilter'
      ? 'const matchesFilters = () => true;'
      : "onChange={e => { setPositionFilter(e.target.value); persist(st, 'recruit', recruits, portal); }}";
    assert.equal(source.split(anchor).length - 1, 1, 'Actual recruiting control anchor must occur once');
    const changed = source.replace(anchor, replacement);
    assert.notEqual(changed, source, 'Control must change the actual recruiting Board');
    const base = path.join(root, '.sim-control');
    await mkdir(base, { recursive: true });
    folder = await mkdtemp(path.join(base, 'cbb-recruit-'));
    const copy = path.join(folder, 'CbbDynastyBoard.tsx');
    copies.push(copy);
    await writeFile(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/cbb-dynasty/CbbDynastyBoard': copy });
  }
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/cbbRecruitFilters.test.tsx', '--reporter=verbose'], { cwd: root, env, encoding: 'utf8', timeout: 120000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  const diagnostic = output.slice(-2500);
  process.stdout.write(output);
  assert.ok(!run.error, `${String(run.error)}\n${diagnostic}`);
  assert.match(output, /cbbRecruitFilters\.test\.tsx/, 'The actual CBB recruiting tests must run');
  if (control) {
    assert.notEqual(run.status, 0, diagnostic);
    if (control === 'unfilter') {
      assert.match(output, /Tests\s+5 failed.*2 passed/, diagnostic);
      assert.match(output, /combines position and inclusive star threshold across both boards in source order/, diagnostic);
      assert.match(output, /Showing 3 of 5 high school recruits/, diagnostic);
      assert.match(output, /Showing 5 of 5 high school recruits/, diagnostic);
    } else {
      assert.match(output, /Tests\s+1 failed.*6 passed/, diagnostic);
      assert.match(output, /does not save, regenerate, mutate pools or expose hidden ability while filtering/, diagnostic);
      assert.match(output, /Recruiting filters must make zero save writes/, diagnostic);
    }
    assert.equal(await readFile(sourcePath, 'utf8'), source, 'Control must leave production source unchanged');
    console.log(`simCbbRecruitFilters ${control}: the asserted copy produced the expected rendered outcome failures; production source stayed unchanged.`);
  } else {
    assert.equal(run.status, 0, diagnostic);
    assert.match(output, /Tests\s+7 passed/, diagnostic);
    console.log('simCbbRecruitFilters: seven actual-Board combination, order, reset, empty, no-write, hidden-ability, signing-ID and NIL checks passed.');
  }
} finally {
  for (const copy of copies) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
}
