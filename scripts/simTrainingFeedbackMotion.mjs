/* Round 764: actual Soccer Career legacy drill feedback and bank outcomes.
   Controls remove asserted JSX bindings from an isolated source copy. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.TRAINING_FEEDBACK_CONTROL || '';
assert.ok(['', 'unshot', 'unmarker', 'unresult', 'unbank'].includes(control), 'Unknown training feedback control');
const bindings = {
  unshot: ['gkLast.saved ? feedback.success : feedback.miss', 'lastPen.result === "GOAL!" ? feedback.success : feedback.miss'],
  unmarker: ['className={feedback.marker}'],
  unresult: ['${feedback.result}'],
  unbank: ['${feedback.banked}'],
};
const sourcePath = path.join(root, 'src/components/soccer-career/TrainingPanel.tsx');
const original = await readFile(sourcePath, 'utf8');
let folder;
let copy;
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', DEBUG_PRINT_LIMIT: '2500' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    let changed = original;
    for (const anchor of bindings[control]) {
      assert.equal(changed.split(anchor).length - 1, control === 'unmarker' ? 4 : 1, 'Control must remove the exact live bindings');
      changed = changed.replaceAll(anchor, control === 'unshot' ? '""' : '');
    }
    assert.notEqual(changed, original, 'Control must actually change the component');
    for (const [anchor, replacement] of [
      ['"./DrillBoard"', '"@/components/soccer-career/DrillBoard"'],
      ['"./TrainingFeedback.module.css"', '"@/components/soccer-career/TrainingFeedback.module.css"'],
    ]) {
      assert.equal(changed.split(anchor).length - 1, 1, 'Relative import must be rewritten once for the copy');
      changed = changed.replace(anchor, replacement);
    }
    const base = path.join(root, '.sim-control');
    await mkdir(base, { recursive: true });
    folder = await mkdtemp(path.join(base, 'training-feedback-'));
    copy = path.join(folder, 'TrainingPanel.tsx');
    await writeFile(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/soccer-career/TrainingPanel': copy });
  }
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/trainingFeedbackMotion.test.tsx', '--reporter=verbose'], { cwd: root, env, encoding: 'utf8', timeout: 120000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  const diagnostic = output.slice(-6000);
  process.stdout.write(output);
  assert.ok(!run.error, String(run.error));
  assert.match(output, /trainingFeedbackMotion\.test\.tsx/, 'The actual training panel tests must run');
  if (control) {
    assert.notEqual(run.status, 0, diagnostic);
    const shots = control === 'unshot' || control === 'unmarker';
    assert.match(output, shots ? /5 failed.*7 passed/ : /6 failed.*6 passed/, diagnostic);
    assert.match(output, /Expected the element to have class/, diagnostic);
    assert.match(output, shots ? /reveals the exact 'goal' penalty/ : /reveals the exact 'Cone Slalom' 60 result/, diagnostic);
    const effect = control === 'unshot' ? 'success|miss' : control === 'unmarker' ? 'marker' : control === 'unresult' ? 'result' : 'banked';
    assert.match(output, new RegExp(`Expected the element to have class:[\\s\\S]*(${effect})`), diagnostic);
    console.log(`simTrainingFeedbackMotion ${control}: ${shots ? 'five shot/keeper' : 'six exact-session'} outcomes rejected the removed binding; ${shots ? 'seven' : 'six'} unrelated checks remained green.`);
  } else {
    assert.equal(run.status, 0, diagnostic);
    assert.match(output, /12 passed/, diagnostic);
    console.log('simTrainingFeedbackMotion: twelve actual-panel menu, penalty, keeper timing, marker, exact-score/tier, stable-node/focus and one-bank outcomes passed.');
  }
  assert.equal(await readFile(sourcePath, 'utf8'), original, 'The production source must remain untouched');
} finally {
  if (copy) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
}
