/* Actual five-puzzle Page/hook outcomes. Copies change owned presentation only. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const board = 'src/components/emoji-guess/EmojiGuessBoard.tsx';
const css = 'src/components/emoji-guess/EmojiGuessFeedback.module.css';
const baseline = 'matches the unchanged five-puzzle hook score save and share baseline';
const accepted = 'reveals an accepted miss and hint then announces the earned second-try score';
const failed = 'reveals the actual failed answer with zero points and only one final result announcement';
const focus = 'routes native actions to Next input and Share while owned repeated keys stay quiet';
const lifetime = 'retains current cue and nodes through clones then clears and cancels its owned timer';
const visual = 'keeps full answer text and real finite reduced-motion declarations bound to owned controls';
const guessCue = "kind: current.done ? current.solved ? 'solved' : 'failed' : 'miss'";
const nextCue = "kind: finished ? 'result' : 'next'";
const controls = {
  miss: { anchor: guessCue, replacement: "kind: current.done ? current.solved ? 'solved' : 'failed' : 'next'", test: accepted },
  solved: { anchor: guessCue, replacement: "kind: current.done ? current.solved ? 'failed' : 'failed' : 'miss'", test: accepted },
  failed: { anchor: guessCue, replacement: "kind: current.done ? current.solved ? 'solved' : 'solved' : 'miss'", test: failed },
  next: { anchor: nextCue, replacement: "kind: finished ? 'result' : 'result'", test: focus },
  result: { anchor: nextCue, replacement: "kind: finished ? 'next' : 'next'", test: failed },
  focus: { anchor: 'target.focus({ preventScroll: true });', replacement: 'void target;', test: focus },
  repeat: { anchor: "if (event.repeat && (event.key === 'Enter'", replacement: "if (false && event.repeat && (event.key === 'Enter'", test: focus },
  settle: { anchor: 'window.setTimeout(() => setCue(null), 600)', replacement: 'window.setTimeout(() => {}, 600)', test: lifetime },
  cleanup: { anchor: 'return () => window.clearTimeout(timer);', replacement: 'return () => {};', test: lifetime },
  names: { anchor: 'block text-sm font-bold ${styles.fullText}', replacement: 'block truncate text-sm font-bold', test: visual },
  targets: { css: true, anchor: 'min-height: 44px; min-width: 44px;', replacement: 'min-height: 22px; min-width: 22px;', test: visual },
  finite: { css: true, anchor: 'animation: solvedOutline 420ms ease-out 1;', replacement: 'animation: solvedOutline 420ms ease-out infinite;', test: visual },
  reduced: { css: true, anchor: 'animation: none;', replacement: 'animation: clueReveal 360ms ease-out 1;', test: visual },
};
const control = process.env.EMOJI_GUESS_CONTROL || '';
assert.ok(!control || control in controls, 'Known Emoji Guess control');
const verifyBytes = [];
for (const file of [board, css, 'src/pages/EmojiGuess.tsx', 'src/hooks/useEmojiGuess.ts', 'src/data/emojiPuzzles.ts', 'src/lib/dateUtils.ts', 'src/hooks/useGameCompletion.ts']) {
  const bytes = await readFile(path.join(root, file));
  verifyBytes.push(() => readFile(path.join(root, file)).then(current => assert.deepEqual(current, bytes, 'Original game, helper, data, date and completion bytes held')));
}
let folder;
const owned = [];
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  folder = await mkdtemp(path.join(root, '.sim-control/emoji-feedback-'));
  const env = { ...process.env, FORCE_COLOR: '0', DEBUG_PRINT_LIMIT: '1200' }; delete env.NO_DOUBLE_SWAP; delete env.EMOJI_GUESS_CSS;
  const reportFile = path.join(folder, 'report.json'); owned.push(reportFile);
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/emojiGuessFeedback.test.tsx', '--reporter=verbose', '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'];
  if (control) {
    const spec = controls[control];
    const source = (await readFile(path.join(root, spec.css ? css : board), 'utf8')).replace(/\r\n/g, '\n');
    assert.equal(source.split(spec.anchor).length - 1, 1, 'Actual mutation anchor must occur exactly once');
    let changed = source.replace(spec.anchor, spec.replacement); assert.notEqual(changed, source);
    const copy = path.join(folder, spec.css ? 'EmojiGuessFeedback.module.css' : 'EmojiGuessBoard.tsx');
    if (spec.css) env.EMOJI_GUESS_CSS = copy;
    else {
      const importAnchor = "from './EmojiGuessFeedback.module.css'"; assert.equal(changed.split(importAnchor).length - 1, 1);
      changed = changed.replace(importAnchor, "from '@/components/emoji-guess/EmojiGuessFeedback.module.css'");
      env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/emoji-guess/EmojiGuessBoard': copy });
    }
    await writeFile(copy, changed); owned.push(copy);
    args.push('--testNamePattern', spec.test + '|' + baseline);
  }
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024 });
  const output = (run.stdout || '') + '\n' + (run.stderr || ''); process.stdout.write(output);
  assert.ok(!run.error && !run.signal, 'Runner must finish normally');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|STACK_TRACE_ERROR|\bRPC\b|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed/, 'No runner failure earns outcome credit');
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  const rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, 9, 'All nine actual outcomes must collect');
  if (control) {
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, 1); assert.equal(report.numPassedTests, 1); assert.equal(report.numPendingTests, 7);
    const intended = rows.filter(row => row.title === controls[control].test); assert.equal(intended.length, 1); assert.equal(intended[0].status, 'failed');
    const messages = intended[0].failureMessages.join('\n');
    assert.match(messages, /AssertionError:|expect\(element\)\.(?:toHaveFocus|toHaveClass)|Expected element with focus/, 'Intended row must fail its actual assertion');
    assert.equal(rows.find(row => row.title === baseline)?.status, 'passed', 'Independent original hook/save/share/completion outcome stays green');
    console.log(`simEmojiGuessFeedback ${control}: one intended assertion fails, independent original five-puzzle outcome passes, seven cases explicitly skipped.`);
    console.log('EMOJI_RECEIPT: ' + JSON.stringify({ control, failed: 1, independentPassed: 1, skipped: 7, intended: intended[0].title, messages }));
  } else {
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, 9); assert.equal(report.numFailedTests, 0); assert.equal(report.numPendingTests, 0);
    console.log('simEmojiGuessFeedback: nine actual Page/hook outcomes pass.');
    console.log('simEmojiGuessFeedback: five puzzles, 290 points, four solved, exact saved guesses/index and original share text.');
    console.log('simEmojiGuessFeedback: once-only completion, quiet restore/no-op/clone, native focus guards and finite/static presentation verified.');
  }
} finally {
  for (const file of owned) await rm(file, { force: true });
  if (folder) await rmdir(folder);
  for (const verify of verifyBytes) await verify();
}
console.log('simEmojiGuessFeedback: source bytes held, owned copies and report cleaned.');
