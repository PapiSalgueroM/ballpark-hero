import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const page = 'src/pages/ListQuiz.tsx', css = 'src/pages/ListQuizFeedback.module.css';
const baseline = 'matches original full-list score share and one completion baseline';
const hit = 'announces actual hits while keeping original answer nodes and focus';
const focus = 'focuses accepted starts and final action without taking connected external focus';
const expiry = 'expires at original 180 seconds and reveals only missed answers';
const lifetime = 'retries and changes lists without leaking prior feedback or timers';
const visual = 'binds full names 44px controls and finite static styles';
const controls = {
  hit: { anchor: "flash === 'hit' && hitIndex === i && feedback.hit,", replacement: 'false && feedback.hit,', test: hit },
  message: { anchor: 'Found: {answers[hitIndex]}', replacement: 'Found: a different answer', test: hit },
  reveal: { anchor: 'revealing && !found[i] && feedback.reveal,', replacement: 'false && feedback.reveal,', test: expiry },
  focus: { anchor: 'if (canFocus) inputRef.current?.focus({ preventScroll: true });', replacement: 'if (canFocus) void inputRef.current;', test: focus },
  finalfocus: { anchor: 'if (canFocus) doneActionRef.current?.focus({ preventScroll: true });', replacement: 'if (canFocus) void doneActionRef.current;', test: focus },
  external: { anchor: 'const canFocus = active === document.body || !(active instanceof HTMLElement) || !active.isConnected || active === origin;', replacement: 'const canFocus = true;', test: focus },
  repeat: { anchor: "if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();", replacement: 'void event;', test: focus },
  settle: { anchor: 'setTimeout(() => setRevealing(false), 600)', replacement: 'setTimeout(() => {}, 600)', test: expiry },
  cleanup: { anchor: 'if (revealTimer.current) clearTimeout(revealTimer.current);\n  }, []);', replacement: 'void revealTimer.current;\n  }, []);', test: lifetime },
  names: { anchor: '                      feedback.fullName,', replacement: "                      'truncate',", test: visual },
  targets: { css: true, anchor: 'min-height: 44px;', replacement: 'min-height: 22px;', test: visual },
  finite: { css: true, anchor: 'animation: answerFound 420ms ease-out 1;', replacement: 'animation: answerFound 420ms ease-out infinite;', test: visual },
  reduced: { css: true, anchor: 'animation: none;', replacement: 'animation: answerReveal 360ms ease-out 1;', test: visual },
};
const control = process.env.LIST_QUIZ_CONTROL || '';
assert.ok(!control || control in controls, 'Known ListQuiz feedback control');
const verifyBytes = [];
for (const file of [page, css, 'src/lib/listQuiz.ts', 'src/components/game/ResultScreen.tsx', 'src/components/game/ShareButtons.tsx', 'src/lib/completions.ts']) {
  const bytes = await readFile(path.join(root, file));
  verifyBytes.push(() => readFile(path.join(root, file)).then(current => assert.deepEqual(current, bytes, 'Original page, styles, helpers and result/completion bytes remain held')));
}
let folder;
const owned = [];
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  folder = await mkdtemp(path.join(root, '.sim-control/list-feedback-'));
  const env = { ...process.env, FORCE_COLOR: '0', DEBUG_PRINT_LIMIT: '1200' }; delete env.NO_DOUBLE_SWAP; delete env.LIST_QUIZ_CSS;
  const reportFile = path.join(folder, 'report.json'); owned.push(reportFile);
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/listQuizFeedback.test.tsx', '--reporter=verbose', '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'];
  if (control) {
    const spec = controls[control];
    const source = (await readFile(path.join(root, spec.css ? css : page), 'utf8')).replace(/\r\n/g, '\n');
    assert.equal(source.split(spec.anchor).length - 1, 1, 'Control must change exactly one actual binding');
    let changed = source.replace(spec.anchor, spec.replacement); assert.notEqual(changed, source);
    const copy = path.join(folder, spec.css ? 'ListQuizFeedback.module.css' : 'ListQuiz.tsx');
    if (spec.css) env.LIST_QUIZ_CSS = copy;
    else {
      const importAnchor = "from './ListQuizFeedback.module.css'"; assert.equal(changed.split(importAnchor).length - 1, 1);
      changed = changed.replace(importAnchor, "from '@/pages/ListQuizFeedback.module.css'");
      env.NO_DOUBLE_SWAP = JSON.stringify({ '@/pages/ListQuiz': copy });
    }
    await writeFile(copy, changed); owned.push(copy); args.push('--testNamePattern', spec.test + '|' + baseline);
  }
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024 });
  const output = (run.stdout || '') + '\n' + (run.stderr || ''); process.stdout.write(output);
  assert.ok(!run.error && !run.signal, 'Runner must finish normally');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|STACK_TRACE_ERROR|\bRPC\b|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed/, 'Runner failures earn no credit');
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  const rows = report.testResults.flatMap(file => file.assertionResults); assert.equal(rows.length, 9, 'All nine real Page/helper outcomes collect');
  if (control) {
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, 1); assert.equal(report.numPassedTests, 1); assert.equal(report.numPendingTests, 7);
    const intended = rows.filter(row => row.title === controls[control].test); assert.equal(intended.length, 1); assert.equal(intended[0].status, 'failed');
    const messages = intended[0].failureMessages.join('\n'); assert.match(messages, /AssertionError:|expect\(element\)\.(?:toHaveFocus|toHaveClass|toHaveTextContent)|Expected element with focus/);
    assert.equal(rows.find(row => row.title === baseline)?.status, 'passed', 'Independent full-list score/share/completion stays green');
    console.log('LIST_FEEDBACK_RECEIPT: ' + JSON.stringify({ control, changed: true, failed: 1, independentPassed: 1, skipped: 7, intended: intended[0].title, messages }));
  } else {
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, 9); assert.equal(report.numFailedTests, 0); assert.equal(report.numPendingTests, 0);
    console.log('simListQuizFeedback: nine actual Page/helper outcomes pass.');
    console.log('simListQuizFeedback: exact full-list share, original count score and once-only ResultScreen completion verified.');
    console.log('simListQuizFeedback: unchanged aliases, tiers, 180-second expiry and fallback remain covered.');
    console.log('simListQuizFeedback: stable answer nodes, accepted focus, finite cues and static reduced motion remain bound.');
  }
} finally {
  for (const file of owned) await rm(file, { force: true });
  if (folder) await rmdir(folder);
  for (const verify of verifyBytes) await verify();
}
console.log('simListQuizFeedback: original bytes held and all owned copies/report cleaned.');
