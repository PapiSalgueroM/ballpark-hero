/* Round 774: actual Quiz Board clue access, focus and committed answer outcomes.
   QUIZ_BOARD_CONTROL=tile|score|focus|skip|quiet|cleanup mutates asserted component copies. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'src/components/quiz-board/QuizBoard.tsx');
const control = process.env.QUIZ_BOARD_CONTROL || '';
const controls = {
  tile: {
    anchor: "feedback?.clueId === t.clue.clueId ? (t.correct ? motion.correct : motion.wrong) : ''", replacement: "''", count: 1,
    failure: /cues the committed correct and wrong tiles and exact score/,
  },
  score: {
    anchor: 'feedback ? (feedback.correct ? motion.scoreCorrect : motion.scoreWrong) : undefined', replacement: 'undefined', count: 1,
    failure: /cues the committed correct and wrong tiles and exact score/,
  },
  focus: {
    anchor: 'target?.focus({ preventScroll: true });', replacement: '', count: 1,
    failure: /opens the exact labeled clue and closes for free to its original mounted opener/,
  },
  skip: {
    anchor: 'onOpenChange={open => { if (!open) closeTile(); }}', replacement: 'onOpenChange={() => {}}', count: 1,
    failure: /uses Escape as a free skip and restores the second exact opener/,
  },
  quiet: {
    anchor: 'feedback?.clueId === t.clue.clueId ?', replacement: 't.answered ?', count: 2,
    failure: /restores partial results and exact score quietly/,
  },
  cleanup: {
    anchor: 'return () => clearTimeout(timer);', replacement: 'return () => {};', count: 1,
    failure: /keeps active clones on the same tile and settles without replay, writes or retained timers/,
  },
};
assert.ok(!control || control in controls, 'Unknown Quiz Board control');
const original = await readFile(source, 'utf8');
let folder;
let copy;
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', DEBUG_PRINT_LIMIT: '1800' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const spec = controls[control];
    assert.equal(original.split(spec.anchor).length - 1, spec.count, 'Control must alter the exact live binding count');
    let changed = original.replaceAll(spec.anchor, spec.replacement);
    assert.notEqual(changed, original, 'Control must change actual code');
    const dependency = "'./QuizBoard.module.css'";
    assert.equal(changed.split(dependency).length - 1, 1, 'Copied component must resolve its real scoped CSS');
    changed = changed.replace(dependency, "'@/components/quiz-board/QuizBoard.module.css'");
    await mkdir(path.join(root, '.sim-control'), { recursive: true });
    folder = await mkdtemp(path.join(root, '.sim-control/quiz-board-'));
    copy = path.join(folder, 'QuizBoard.tsx');
    await writeFile(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/quiz-board/QuizBoard': copy });
  }
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/quizBoardAccess.test.tsx', '--reporter=verbose'], {
    cwd: root, env, encoding: 'utf8', timeout: 120000,
  });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  process.stdout.write(output);
  assert.ok(!run.error, String(run.error));
  assert.match(output, /quizBoardAccess\.test\.tsx/, 'Actual rendered tests must execute');
  if (control) {
    assert.notEqual(run.status, 0, 'Changed Quiz Board behavior must fail an outcome');
    assert.match(output, /Tests\s+\d+ failed.*\d+ passed/, 'Intended failures and unchanged green outcomes must both be reported');
    assert.match(output, new RegExp('FAIL[^\\n]*' + controls[control].failure.source), 'The intended outcome must appear in the failure report');
    assert.match(output, /AssertionError|TestingLibraryElementError|expect\(element\)|expected .* to/i, 'A real assertion must fail');
    assert.doesNotMatch(output, /Failed to resolve import|Cannot find module|No test files found/);
    console.log(`simQuizBoardAccess ${control}: the asserted copy failed its intended outcome while unchanged checks stayed green.`);
  } else {
    assert.equal(run.status, 0, output.slice(-6000));
    assert.match(output, /8 passed/);
    console.log('simQuizBoardAccess: eight actual hook/Board outcomes passed, including clue access, native focus, free skips, exact saved scores, settled feedback and restored completion truth.');
  }
  assert.equal(await readFile(source, 'utf8'), original, 'Controls must preserve shared production source');
} finally {
  if (copy) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
}
