/* Round 767: MVP previews retain both committed rosters and winner feedback is finite.
   DRAFT_WINNER_CONTROL=mutate|unreveal uses asserted source copies. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.DRAFT_WINNER_CONTROL || '';
assert.ok(['', 'mutate', 'unreveal'].includes(control), 'Unknown draft winner control');
const sourcePath = path.join(root, 'src/components/fantasy-draft/VoteWinner.tsx');
const original = await readFile(sourcePath, 'utf8');
let folder, copy;
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const anchor = control === 'mutate' ? 'const topPlayers = [...winningTeam]' : ', motion.winner';
    assert.equal(original.split(anchor).length - 1, 1, 'Control must change the actual binding once');
    const changed = original.replace(anchor, control === 'mutate' ? 'const topPlayers = winningTeam' : '');
    assert.notEqual(changed, original);
    const css = "'./DraftWinnerMotion.module.css'";
    assert.equal(changed.split(css).length - 1, 1);
    await mkdir(path.join(root, '.sim-control'), { recursive: true });
    folder = await mkdtemp(path.join(root, '.sim-control/draft-winner-'));
    copy = path.join(folder, 'VoteWinner.tsx');
    await writeFile(copy, changed.replace(css, "'@/components/fantasy-draft/DraftWinnerMotion.module.css'"));
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/fantasy-draft/VoteWinner': copy });
  }
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/draftWinnerFeedback.test.tsx', '--reporter=verbose'], { cwd: root, env, encoding: 'utf8', timeout: 120000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  process.stdout.write(output);
  assert.ok(!run.error, String(run.error));
  assert.match(output, /draftWinnerFeedback\.test\.tsx/);
  if (control) {
    assert.notEqual(run.status, 0);
    assert.match(output, /3 failed.*2 passed/);
    assert.match(output, control === 'mutate' ? /Cannot assign to read only property/ : /Expected the element to have class/);
    console.log(`simDraftWinnerFeedback ${control}: actual mutation failed three intended outcomes with two unrelated checks still green.`);
  } else {
    assert.equal(run.status, 0);
    assert.match(output, /5 passed/);
    console.log('simDraftWinnerFeedback: five actual voting tests passed for immutable rosters, exact MVP sharing, stable controls and committed feedback.');
  }
  assert.equal(await readFile(sourcePath, 'utf8'), original, 'Production source must remain untouched');
} finally {
  if (copy) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
}
