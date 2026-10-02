/* Round 764: actual Soccer Career legacy drill feedback and bank outcomes.
   Controls remove asserted JSX bindings from an isolated source copy.

   Round 913: the drills moved out of TrainingPanel into the shared training
   ground, so each binding is now read where it lives: the shot and marker
   bindings in the zone drill, the result and bank bindings in TrainingGround.
   Both files import only through "@/", so the copy needs no import rewriting,
   and vitest is found by walk up, so this runs from a worktree too. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vitest = path.join(path.dirname(createRequire(import.meta.url).resolve('vitest/package.json')), 'vitest.mjs');
const control = process.env.TRAINING_FEEDBACK_CONTROL || '';
assert.ok(['', 'unshot', 'unmarker', 'unresult', 'unbank'].includes(control), 'Unknown training feedback control');
const ZONE = { module: '@/components/career/drills/ZonePickDrill', file: 'src/components/career/drills/ZonePickDrill.tsx' };
const GROUND = { module: '@/components/career/TrainingGround', file: 'src/components/career/TrainingGround.tsx' };
const bindings = {
  unshot: [ZONE, ['gkLast.saved ? feedback.success : feedback.miss', 'lastPen.outcome === "made" ? feedback.success : feedback.miss']],
  unmarker: [ZONE, ['className={feedback.marker}']],
  unresult: [GROUND, ['${feedback.result}']],
  unbank: [GROUND, ['${feedback.banked}']],
};
const target = control ? bindings[control][0] : ZONE;
const sourcePath = path.join(root, target.file);
const original = await readFile(sourcePath, 'utf8');
let folder;
let copy;
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', DEBUG_PRINT_LIMIT: '2500' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    let changed = original;
    for (const anchor of bindings[control][1]) {
      assert.equal(changed.split(anchor).length - 1, control === 'unmarker' ? 4 : 1, 'Control must remove the exact live bindings');
      changed = changed.replaceAll(anchor, control === 'unshot' ? '""' : '');
    }
    assert.notEqual(changed, original, 'Control must actually change the component');
    const base = path.join(root, '.sim-control');
    await mkdir(base, { recursive: true });
    folder = await mkdtemp(path.join(base, 'training-feedback-'));
    copy = path.join(folder, path.basename(target.file));
    await writeFile(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ [target.module]: copy });
  }
  const run = spawnSync(process.execPath, [vitest, 'run', 'src/test/trainingFeedbackMotion.test.tsx', '--reporter=verbose'], { cwd: root, env, encoding: 'utf8', timeout: 240000 });
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
