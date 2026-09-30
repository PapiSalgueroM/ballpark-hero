/* Round 748: settled result feedback must preserve payloads and action timing.
   ARCADE_FEEDBACK_CONTROL=points or autonext mutates an asserted copy only. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, copyFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.ARCADE_FEEDBACK_CONTROL || '';
assert.ok(['', 'points', 'autonext'].includes(control), 'Unknown arcade feedback control');
const sourcePath = path.join(root, 'src/components/arcade/ArcadeShotFeedback.tsx');
const source = await readFile(sourcePath, 'utf8');
let folder;
let copy;
let cssCopy;
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const anchor = control === 'points' ? '{points} points.' : '<div data-arcade-feedback';
    const replacement = control === 'points'
      ? '{points + 1} points.'
      : '<div onAnimationEnd={e => e.currentTarget.querySelector("button")?.click()} data-arcade-feedback';
    assert.equal(source.split(anchor).length - 1, 1, 'Control anchor must occur once');
    const changed = source.replace(anchor, replacement);
    assert.notEqual(changed, source, 'Control must change the component');
    const base = path.join(root, '.sim-control');
    await mkdir(base, { recursive: true });
    folder = await mkdtemp(path.join(base, 'arcade-feedback-'));
    copy = path.join(folder, 'ArcadeShotFeedback.tsx');
    cssCopy = path.join(folder, 'ArcadeShotFeedback.module.css');
    await writeFile(copy, changed);
    await copyFile(path.join(root, 'src/components/arcade/ArcadeShotFeedback.module.css'), cssCopy);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/arcade/ArcadeShotFeedback': copy });
  }
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/arcadeShotFeedback.test.tsx'], { cwd: root, env, encoding: 'utf8', timeout: 120000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  const diagnostic = output.slice(-2500);
  assert.ok(!run.error, `${String(run.error)}\n${diagnostic}`);
  assert.match(output, /arcadeShotFeedback\.test\.tsx/, 'The actual board tests must run');
  if (control) {
    assert.notEqual(run.status, 0, diagnostic);
    assert.match(output, control === 'points' ? /Tests\s+4 failed\s*\|\s*6 passed/ : /Tests\s+2 failed\s*\|\s*8 passed/, diagnostic);
    assert.match(output, /Unable to find an element with the text: 173 points\./, diagnostic);
    assert.match(output, /Unable to find an element with the text: 241 points\./, diagnostic);
    console.log(`simArcadeShotFeedback control ${control}: unique source anchor changed in an isolated copy.`);
    console.log(control === 'points' ? 'Four displayed-payload and consecutive-result checks rejected altered point text.' : 'Two immediate-result checks rejected animation-driven advancement.');
    console.log(control === 'points' ? 'Six unaffected checks stayed green.' : 'Eight unaffected checks stayed green.');
  } else {
    assert.equal(run.status, 0, diagnostic);
    assert.match(output, /Tests\s+10 passed/, diagnostic);
    console.log('simArcadeShotFeedback: ten checks passed on the actual arcade boards and shared feedback.');
    console.log('Original success/miss payloads, angle explanations and enabled Next actions verified.');
    console.log('Consecutive results remounted; animation events preserved scores and flight fallback settled.');
    console.log('Daily completion and save waited for See the run and happened once.');
  }
  assert.equal(await readFile(sourcePath, 'utf8'), source, 'Production source must remain unchanged');
  if (control) console.log('Both games failed on their exact missing point payloads; production source stayed unchanged.');
} finally {
  if (copy) await rm(copy, { force: true });
  if (cssCopy) await rm(cssCopy, { force: true });
  if (folder) await rmdir(folder);
}
