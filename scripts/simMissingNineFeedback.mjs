import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.MISSING_NINE_FEEDBACK_CONTROL || '';
const independent = 'holds independent original payouts aliases hints saves shares and once completion';
const presentation = 'binds finite static-motion cues full names and owned44px actions';
const controls = {
  keys: { test: 'cues every accepted miss with stable rows and only newly unlocked hints', edits: [['<span key={shownFeedback.turn} aria-hidden', '<span key="candidate" aria-hidden'], [' && feedback.turn === actions.length', '']] },
  quiet: { test: 'clears old wrong feedback immediately on mode changes and new lineups', edits: [['} else if (!sameRun || actions !== before.actions) {', '} else if (false) {'], ['feedback?.mode === mode && feedback.puzzle === puzzle && feedback.turn === actions.length ? feedback : null', 'feedback']] },
  cleanup: { test: 'isolates Give up and cleans the owned timer on unmount', edits: [['return () => window.clearTimeout(timer);', 'return () => {};']] },
  hints: { test: 'keeps restored hints and finishes quiet without writing or booking again', edits: [["shownFeedback?.kind === 'miss' && (misses === 1 || (misses === 2 && i > 0)) && feedbackStyles.hint", 'feedbackStyles.hint']] },
  finite: { test: presentation, css: true, edits: [['nineMiss 420ms ease-out 1;', 'nineMiss 420ms ease-out infinite;']] },
  reduced: { test: presentation, css: true, edits: [['.miss, .found, .reply, .hint { animation: none; }', '.miss, .found, .reply, .hint { animation: nineMiss 420ms ease-out 1; }']] },
  names: { test: presentation, css: true, edits: [['overflow-wrap: anywhere;', 'overflow-wrap: normal;']] },
  targets: { test: presentation, css: true, edits: [['min-height: 44px;', 'min-height: 20px;']] },
};
assert.ok(!control || control in controls, 'Known Missing Nine feedback control');
const pageFile = 'src/pages/MissingNine.tsx', cssFile = 'src/pages/MissingNineFeedback.module.css';
const parity = [];
for (const file of [pageFile, cssFile, 'src/lib/missingNine.ts', 'src/hooks/useDailyPuzzle.ts', 'src/hooks/useGameCompletion.ts', 'src/lib/completions.ts', 'src/components/game/ResultScreen.tsx', 'src/components/game/ShareButtons.tsx']) {
  const raw = await readFile(path.join(root, file));
  parity.push(() => readFile(path.join(root, file)).then(current => assert.deepEqual(current, raw, 'Original bytes held ' + file)));
}
const page = (await readFile(path.join(root, pageFile), 'utf8')).replace(/\r\n/g, '\n');
const css = (await readFile(path.join(root, cssFile), 'utf8')).replace(/\r\n/g, '\n');
let folder;
const owned = [];
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  folder = await mkdtemp(path.join(root, '.sim-control/missing-nine-feedback-'));
  const reportFile = path.join(folder, 'report.json'); owned.push(reportFile);
  const env = { ...process.env, FORCE_COLOR: '0', DEBUG_PRINT_LIMIT: '1200' };
  delete env.NO_DOUBLE_SWAP; delete env.MISSING_NINE_FEEDBACK_CSS;
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/missingNineFeedback.test.tsx', '--reporter=verbose', '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'];
  if (control) {
    const spec = controls[control]; let changed = spec.css ? css : page;
    for (const [anchor, replacement] of spec.edits) { assert.equal(changed.split(anchor).length - 1, 1, 'Actual control binding is unique'); const before = changed; changed = changed.replace(anchor, replacement); assert.notEqual(changed, before, 'Actual copied mutation changes bytes'); }
    const copy = path.join(folder, 'MissingNine.tsx'); owned.push(copy);
    const code = spec.css ? page : changed;
    assert.equal(code.split("from './MissingNineFeedback.module.css'").length - 1, 1);
    await writeFile(copy, code.replace("from './MissingNineFeedback.module.css'", "from '@/pages/MissingNineFeedback.module.css'"));
    const swaps = { '@/pages/MissingNine': copy };
    if (spec.css) { const cssCopy = path.join(folder, 'MissingNineFeedback.module.css'); owned.push(cssCopy); await writeFile(cssCopy, changed); swaps['@/pages/MissingNineFeedback.module.css'] = cssCopy; env.MISSING_NINE_FEEDBACK_CSS = cssCopy; }
    env.NO_DOUBLE_SWAP = JSON.stringify(swaps); args.push('--testNamePattern', spec.test + '|' + independent);
  }
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 });
  const output = (run.stdout || '') + '\n' + (run.stderr || ''); process.stdout.write(output);
  assert.ok(!run.error && !run.signal, 'Real runner finishes normally');
  assert.doesNotMatch(output, /Unhandled (?:Error|Rejection)|Test timed out|Timeout calling|\bRPC\b|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed/, 'Runner faults earn no outcome credit');
  const report = JSON.parse(await readFile(reportFile, 'utf8')), rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(rows.length, 7); assert.equal(Number(report.numUnhandledErrors ?? 0), 0);
  if (control) {
    const intended = rows.find(row => row.title === controls[control].test);
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, 1); assert.equal(report.numPassedTests, 1); assert.equal(report.numPendingTests, 5); assert.equal(intended?.status, 'failed');
    assert.match(intended.failureMessages.join('\n'), /AssertionError:|Error: expect\((?:element|received)\)\./, 'Intended assertion fails');
    assert.equal(rows.find(row => row.title === independent)?.status, 'passed');
    console.log('MISSING_NINE_FEEDBACK_RECEIPT: ' + JSON.stringify({ control, intended: intended.title, failed: 1, independentPassed: 1, skipped: 5, message: intended.failureMessages.join('\n') }));
  } else { assert.equal(run.status, 0); assert.equal(report.numPassedTests, 7); assert.equal(report.numFailedTests, 0); assert.equal(report.numPendingTests, 0); console.log('simMissingNineFeedback: seven actual Page/helper outcomes pass.'); }
  console.log('simMissingNineFeedback: original100/70/40, aliases, hints, exact action saves/full shares and once daily completion.');
  console.log('simMissingNineFeedback: consecutive finite cues, stable rows, quiet modes/reset/restore and owned timer cleanup.');
  console.log('simMissingNineFeedback: static reduced motion, complete names and44px owned controls.');
} finally { for (const file of owned) await rm(file, { force: true }); if (folder) await rmdir(folder); for (const verify of parity) await verify(); }
console.log('simMissingNineFeedback: original bytes held and only owned disposable files cleaned.');
