/* Round 763: committed draft picks reveal without changing either roster.
   DRAFT_ROSTER_MOTION_CONTROL=unpick or notitle uses asserted source copies. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.DRAFT_ROSTER_MOTION_CONTROL || '';
assert.ok(['', 'unpick', 'notitle'].includes(control), 'Unknown draft roster control');
const sourcePath = path.join(root, 'src/components/fantasy-draft/DraftRoster.tsx');
const original = await readFile(sourcePath, 'utf8');
let folder, copy;
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const anchor = control === 'unpick' ? 'isLastPick && motion.pick' : 'title={p.name}';
    assert.equal(original.split(anchor).length - 1, 1, 'Control must change the actual binding once');
    const changed = original.replace(anchor, control === 'unpick' ? 'false && motion.pick' : '');
    assert.notEqual(changed, original);
    const css = "'./DraftRosterMotion.module.css'";
    assert.equal(changed.split(css).length - 1, 1);
    const base = path.join(root, '.sim-control');
    await mkdir(base, { recursive: true });
    folder = await mkdtemp(path.join(base, 'draft-roster-'));
    copy = path.join(folder, 'DraftRoster.tsx');
    await writeFile(copy, changed.replace(css, "'@/components/fantasy-draft/DraftRosterMotion.module.css'"));
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/fantasy-draft/DraftRoster': copy });
  }
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/draftRosterMotion.test.tsx', '--reporter=verbose'], { cwd: root, env, encoding: 'utf8', timeout: 120000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  process.stdout.write(output);
  assert.ok(!run.error, String(run.error));
  assert.match(output, /draftRosterMotion\.test\.tsx/);
  if (control) {
    assert.notEqual(run.status, 0);
    assert.match(output, control === 'unpick' ? /2 failed.*2 passed/ : /3 failed.*1 passed/);
    assert.match(output, control === 'unpick' ? /Expected the element to have class/ : /Unable to find an element with the title/);
    console.log(`simDraftRosterMotion ${control}: actual binding removal failed the intended outcomes and left unrelated checks green.`);
  } else {
    assert.equal(run.status, 0);
    assert.match(output, /4 passed/);
    console.log('simDraftRosterMotion: four actual roster tests passed for committed picks, empty/full slots, exact values and stable accessible names.');
  }
  assert.equal(await readFile(sourcePath, 'utf8'), original, 'Production source must remain untouched');
} finally {
  if (copy) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
}
