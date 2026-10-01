/* Round 775: actual constructor Board and unchanged real-hook outcomes.
   CONSTRUCTOR_FEEDBACK_CONTROL=wrong|silent|timer changes asserted source copies. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.CONSTRUCTOR_FEEDBACK_CONTROL || '';
const controls = {
  wrong: { anchor: "gameState.gameStatus === 'won' ? 'correct' : 'wrong'", replacement: "'wrong'", failed: 2, passed: 5, name: 'never reports a committed winning guess as wrong' },
  silent: { anchor: 'gameState.guesses.length > prior.guesses.length', replacement: 'false', failed: 4, passed: 3, name: 'reacts to each actual wrong guess once' },
  timer: { anchor: 'return () => window.clearTimeout(timer);', replacement: 'return () => {};', failed: 1, passed: 6, name: 'clears reactions on reset and unmount' },
};
assert.ok(!control || control in controls, 'Unknown constructor feedback control');
const sourcePath = path.join(root, 'src/components/f1-constructor/F1ConstructorBoard.tsx');
const original = await readFile(sourcePath, 'utf8');
let folder;
let copy;
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const { anchor, replacement } = controls[control];
    assert.equal(original.split(anchor).length - 1, 1, 'Change exactly one real outcome or cleanup binding');
    const cssImport = "from './ConstructorFeedback.module.css'";
    assert.equal(original.split(cssImport).length - 1, 1);
    let changed = original.replace(anchor, replacement).replace(cssImport, "from '@/components/f1-constructor/ConstructorFeedback.module.css'");
    for (const component of ['F1ConstructorSearch', 'F1ConstructorHowToPlay']) {
      const relative = `from './${component}'`;
      assert.equal(original.split(relative).length - 1, 1, 'Resolve exactly one original relative component import');
      changed = changed.replace(relative, `from '@/components/f1-constructor/${component}'`);
    }
    assert.notEqual(changed, original, 'Control must change actual code');
    await mkdir(path.join(root, '.sim-control'), { recursive: true });
    folder = await mkdtemp(path.join(root, '.sim-control/constructor-feedback-'));
    copy = path.join(folder, 'F1ConstructorBoard.tsx');
    await writeFile(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/f1-constructor/F1ConstructorBoard': copy });
  }
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/constructorFeedback.test.tsx', '--reporter=verbose'], {
    cwd: root, env, encoding: 'utf8', timeout: 120000,
  });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  process.stdout.write(output);
  assert.ok(!run.error, String(run.error));
  assert.match(output, /constructorFeedback\.test\.tsx/, 'Actual board tests must execute');
  if (control) {
    const expected = controls[control];
    assert.notEqual(run.status, 0, 'Changed production binding must fail actual outcomes');
    assert.match(output, new RegExp(`${expected.failed} failed.*${expected.passed} passed`));
    assert.ok(output.includes(`FAIL  src/test/constructorFeedback.test.tsx > constructor committed guess feedback > ${expected.name}`), 'Intended rendered outcome must fail');
    console.log(`simConstructorFeedback ${control}: ${expected.failed} intended checks reject the changed binding; ${expected.passed} unchanged checks pass.`);
  } else {
    assert.equal(run.status, 0, output.slice(-5000));
    assert.match(output, /7 passed/);
    console.log('simConstructorFeedback: seven actual Board/real-hook checks pass. Winning guesses never report wrong; exact clues, scores, restore and reset remain intact.');
  }
  assert.equal(await readFile(sourcePath, 'utf8'), original, 'Production source must remain unchanged');
  console.log('simConstructorFeedback: asserted copied controls preserve production source and original hook, matcher, data and daily storage.');
} finally {
  if (copy) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
}
