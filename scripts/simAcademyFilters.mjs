/* Round 746: rendered filters and unchanged signing rules. Control removes
   filtering in an asserted temporary copy and must fail six outcome tests. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.ACADEMY_FILTER_CONTROL || '';
assert.ok(['', 'unfilter'].includes(control), 'Unknown Academy filter control');
let folder;
let copy;
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };
  if (control) {
    const source = await readFile(path.join(root, 'src/components/club-manager/AcademyScreen.tsx'), 'utf8');
    const anchor = '.filter(p => (!positionFilter || p.position === positionFilter) && (!ageFilter || p.age === Number(ageFilter)))';
    assert.equal(source.split(anchor).length - 1, 1, 'Control anchor must occur once');
    const base = path.join(root, '.sim-control');
    await mkdir(base, { recursive: true });
    folder = await mkdtemp(path.join(base, 'academy-'));
    copy = path.join(folder, 'AcademyScreen.tsx');
    await writeFile(copy, source.replace(anchor, '.filter(() => true)'));
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/club-manager/AcademyScreen': copy });
  }
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/academyFilters.test.tsx'], { cwd: root, env, encoding: 'utf8', timeout: 120000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  const diagnostic = output.slice(-2500);
  assert.ok(!run.error, String(run.error));
  assert.match(output, /academyFilters\.test\.tsx/, 'The actual component tests must run');
  if (control) {
    assert.notEqual(run.status, 0, diagnostic);
    assert.match(output, /6 failed.*1 passed/, diagnostic);
    assert.match(output, /AssertionError|expected/i, diagnostic);
    console.log('simAcademyFilters control: six rendered outcome checks rejected ignored selections; the empty intake check stayed green.');
  } else {
    assert.equal(run.status, 0, diagnostic);
    assert.match(output, /7 passed/, diagnostic);
    console.log('simAcademyFilters: seven rendered combination, reset, callback and signing-rule checks passed.');
  }
} finally {
  if (copy) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
}
