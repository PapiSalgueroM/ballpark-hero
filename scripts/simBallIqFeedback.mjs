/* Round 863: actual Ball IQ Board, daily hook, saves and completion outcomes. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const board = 'src/components/ball-iq/BallIqBoard.tsx';
const css = 'src/components/ball-iq/BallIqFeedback.module.css';
const baseline = 'matches the original twelve-question score save share and once-only completion';
const correct = 'announces a correct submitted answer and reveals the actual answer';
const wrong = 'reveals the actual correct answer after a miss without adding correct credit';
const progress = 'counts submitted answers immediately and keeps progress stable on Next';
const focus = 'focuses the exact enabled Next action after answers and ignores held activation keys';
const quiet = 'restores an answered daily quietly without replacing external focus';
const lifetime = 'keeps cue and element identity through clones then settles without erasing the outcome';
const visual = 'binds readable answer text and finite reduced-motion rules to actual feedback';
const controls = {
  correct: { anchor: 'const correct = current.chosen === current.clue.answer;', replacement: 'const correct = false;', test: correct },
  answer: { anchor: '<strong>{current.clue.answer}</strong>', replacement: '<strong>{current.chosen}</strong>', test: wrong },
  tally: { anchor: 'questions.filter(q => q.chosen !== null).length', replacement: 'index', test: progress },
  bar: { anchor: "q.chosen !== null\n                ? q.chosen === q.clue.answer", replacement: 'i < index\n                ? q.chosen === q.clue.answer', test: progress },
  focus: { anchor: 'nextRef.current?.focus({ preventScroll: true });', replacement: 'void nextRef.current;', test: focus },
  repeat: { anchor: "if (event.repeat && (event.key === 'Enter' || event.key === ' '))", replacement: "if (false && event.repeat && (event.key === 'Enter' || event.key === ' '))", test: focus },
  quiet: { anchor: 'const request = pendingAnswer.current;', replacement: 'const request = pendingAnswer.current ?? (current?.chosen ? { index, id: current.clue.clueId, chosen: current.chosen, opener: document.activeElement } : null);', test: quiet },
  settle: { anchor: 'window.setTimeout(() => setCue(null), 600)', replacement: 'window.setTimeout(() => {}, 600)', test: lifetime },
  cleanup: { anchor: 'return () => window.clearTimeout(timer);', replacement: 'return () => {};', test: 'cancels its owned answer emphasis timer on unmount' },
  duplicate: { anchor: "if (!current || status !== 'answering' || pendingAnswer.current) return;", replacement: "if (!current || status !== 'answering') return;", test: 'keeps the first accepted answer locked through synchronous duplicate input' },
  names: { anchor: '${styles.option} ${styles.fullText} ${cls}', replacement: '${styles.option} ${cls}', test: visual },
  finite: { css: true, anchor: 'animation: answerReveal 420ms ease-out 1;', replacement: 'animation: answerReveal 420ms ease-out infinite;', test: visual },
  reduced: { css: true, anchor: '.reveal { animation: none; }', replacement: '.reveal { animation: answerReveal 420ms ease-out 1; }', test: visual },
};
const control = process.env.BALL_IQ_FEEDBACK_CONTROL || '';
assert.ok(!control || control in controls, 'Known Ball IQ feedback control');
const holdSource = bytes => ({ bytes, source: bytes.toString('utf8').replaceAll('\r\n', '\n') });
const held = await Promise.all([board, css, 'src/hooks/useBallIq.ts', 'src/lib/fetchQuizBoard.ts', 'src/lib/dateUtils.ts', 'src/hooks/useGameCompletion.ts', 'src/test/noDoubleRecord.test.tsx'].map(async file => [file, holdSource(await readFile(path.join(root, file)))]));
let folder;
const owned = [];
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  folder = await mkdtemp(path.join(root, '.sim-control/ball-iq-feedback-'));
  const env = { ...process.env, FORCE_COLOR: '0', DEBUG_PRINT_LIMIT: '1000' };
  delete env.NO_DOUBLE_SWAP; delete env.BALL_IQ_FEEDBACK_CSS;
  const reportFile = path.join(folder, 'report.json'); owned.push(reportFile);
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/ballIqFeedback.test.tsx', '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'];
  if (control) {
    const spec = controls[control], file = spec.css ? css : board;
    const source = held.find(([name]) => name === file)[1].source;
    assert.equal(source.split(spec.anchor).length - 1, 1, 'Actual control must bind exactly once');
    let changed = source.replace(spec.anchor, spec.replacement); assert.notEqual(changed, source);
    const copy = path.join(folder, path.basename(file));
    if (spec.css) env.BALL_IQ_FEEDBACK_CSS = copy;
    else {
      const cssImport = "from './BallIqFeedback.module.css'";
      assert.equal(changed.split(cssImport).length - 1, 1);
      changed = changed.replace(cssImport, "from '@/components/ball-iq/BallIqFeedback.module.css'");
      env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/ball-iq/BallIqBoard': copy });
    }
    await writeFile(copy, changed); owned.push(copy);
    args.push('--testNamePattern', `${spec.test}|${baseline}`);
  }
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  assert.ok(!run.error && !run.signal, 'Runner must finish normally');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|STACK_TRACE_ERROR|\bRPC\b|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed/);
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  const rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, 11);
  if (control) {
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, 1); assert.equal(report.numPassedTests, 1); assert.equal(report.numPendingTests, 9);
    const target = rows.find(row => row.title === controls[control].test);
    assert.equal(target?.status, 'failed'); assert.equal(rows.find(row => row.title === baseline)?.status, 'passed');
    assert.match(target.failureMessages.join('\n'), /AssertionError:|expect\(element\)|Expected element with focus|TestingLibraryElementError: Unable to find an element with the text:/);
    console.log(`simBallIqFeedback ${control}: actual executable binding changes one owned source copy.`);
    console.log(`simBallIqFeedback ${control}: one intended assertion fails, original twelve-question score/save/share/completion baseline passes, nine explicit skips.`);
    console.log(`BALL_IQ_CONTROL: ${JSON.stringify({ control, intended: target.title, messages: target.failureMessages })}`);
  } else {
    if (run.status !== 0) process.stdout.write(output);
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, 11); assert.equal(report.numPendingTests, 0);
    console.log('simBallIqFeedback: eleven actual Board/hook outcomes pass, none skipped.');
    console.log('simBallIqFeedback: original twelve questions, IQ106 mixed result, exact picks/index/share and once-only completion held.');
    console.log('simBallIqFeedback: answers immediately update tally/bar and reveal the actual answer; enabled Next receives owned focus.');
    console.log('simBallIqFeedback: first submitted answer locks, held keys stay quiet, restored answers/clones do not replay feedback.');
    console.log('simBallIqFeedback: 420ms emphasis,600ms ownership, unmount cleanup and static reduced-motion declarations hold.');
    console.log('simBallIqFeedback: complete perfect run pays1600 once and reload remains quiet.');
  }
} finally {
  for (const file of owned) await rm(file, { force: true });
  if (folder) await rmdir(folder);
  for (const [file, { bytes }] of held) {
    const currentBytes = await readFile(path.join(root, file));
    assert.deepEqual(currentBytes, bytes, 'Original Board, CSS, hook, dataset read, date, completion and existing recording test bytes held');
  }
}
console.log('simBallIqFeedback: normalized control reads, original bytes held, only owned temporary files cleaned.');
