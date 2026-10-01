/* Actual editable ranking and original daily-hook outcomes, with asserted copies. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const board = 'src/pages/RankEm.tsx', css = 'src/pages/RankEmOrder.module.css';
const baseline = 'holds the original helper and daily-hook 1000 600 and zero score save baseline';
const quiet = 'keeps five picks editable and quiet until an exact corrected perfect order is locked';
const nodes = 'swaps removes and undoes without replacing original choices or fixed rung nodes';
const bounds = 'keeps incomplete disabled duplicate and boundary edits out of the actual daily action';
const double = 'allows only one same-frame unlimited lock and never books draft or unlimited edits';
const focus = 'hands focus to enabled neighbors lock and result and guards owned held keys';
const visual = 'keeps complete names targets and finite reduced-motion styles bound to the actual page';
const lifetime = 'reveals only an actual committed result and retains clone identity through finite cleanup';
const controls = {
  autosubmit: { edits: [['setPicks(order);', 'if (order.length === 5) act({ order: [...order] }); setPicks(order);']], test: quiet },
  movement: { edits: [['[order[from], order[to]] = [order[to], order[from]];', 'void order;']], test: nodes },
  bounds: { edits: [['if (from < 0 || to < 0 || to >= order.length) return;', 'if (from < 0) return;'], ['disabled={!name || i === 0}', 'disabled={!name}']], test: bounds },
  doublelock: { edits: [['if (submitted || pendingLock.current || order.length !== 5', 'if (submitted || order.length !== 5']], test: double },
  focus: { edits: [['target.focus({ preventScroll: true });', 'void target;']], test: focus },
  visibility: { edits: [['if (fallback instanceof HTMLElement) fallback.focus({ preventScroll: true });', 'void fallback;']], test: focus },
  draftfallback: { edits: [[', ...moveRefs.current.values()', '']], test: focus },
  height: { css: true, edits: [['max-height: 200px;', 'max-height: 240px;']], test: visual },
  ladder: { edits: [['mb-4 ${styles.ladder}', 'mb-4']], test: visual },
  names: { edits: [['min-w-0 flex-1 text-sm font-semibold text-foreground ${styles.fullText}', 'min-w-0 flex-1 text-sm font-semibold text-foreground truncate']], test: visual },
  reduced: { css: true, edits: [['animation: none;', 'animation: orderReveal 420ms ease-out 1;']], test: visual },
  finite: { css: true, edits: [['animation: orderReveal 420ms ease-out 1;', 'animation: orderReveal 420ms ease-out infinite;']], test: visual },
  committed: { edits: [['setCommitted(true);', 'setCommitted(false);']], test: lifetime },
  repeat: { edits: [["if (event.repeat && (event.key === 'Enter'", "if (false && event.repeat && (event.key === 'Enter'"]], test: focus },
  settle: { edits: [['window.setTimeout(() => setCommitted(false), 600)', 'window.setTimeout(() => {}, 600)']], test: lifetime },
};
const control = process.env.RANK_ORDER_CONTROL || '';
assert.ok(!control || control in controls, 'Known Rank order control');
const verifyBytes = [];
for (const file of [board, css, 'src/hooks/useDailyPuzzle.ts', 'src/lib/orderTheList.ts', 'src/lib/dateUtils.ts', 'src/hooks/useGameCompletion.ts']) {
  const bytes = await readFile(path.join(root, file));
  verifyBytes.push(() => readFile(path.join(root, file)).then(current => assert.deepEqual(current, bytes, 'Original game, helper, data, date and completion bytes held')));
}
let folder;
const owned = [];
try {
  await mkdir(path.join(root, '.sim-control'), { recursive: true });
  folder = await mkdtemp(path.join(root, '.sim-control/rank-order-'));
  const env = { ...process.env, FORCE_COLOR: '0', DEBUG_PRINT_LIMIT: '1200' }; delete env.NO_DOUBLE_SWAP; delete env.RANK_ORDER_CSS;
  const reportFile = path.join(folder, 'report.json'); owned.push(reportFile);
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/rankEmOrder.test.tsx', '--reporter=verbose', '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'];
  if (control) {
    const spec = controls[control];
    const source = (await readFile(path.join(root, spec.css ? css : board), 'utf8')).replace(/\r\n/g, '\n');
    let changed = source;
    for (const [anchor, replacement] of spec.edits) { assert.equal(changed.split(anchor).length - 1, 1, 'Actual mutation anchor must occur exactly once'); changed = changed.replace(anchor, replacement); }
    assert.notEqual(changed, source);
    const copy = path.join(folder, spec.css ? 'RankEmOrder.module.css' : 'RankEm.tsx');
    if (spec.css) env.RANK_ORDER_CSS = copy;
    else {
      const importAnchor = "from './RankEmOrder.module.css'"; assert.equal(changed.split(importAnchor).length - 1, 1);
      changed = changed.replace(importAnchor, "from '@/pages/RankEmOrder.module.css'");
      env.NO_DOUBLE_SWAP = JSON.stringify({ '@/pages/RankEm': copy });
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
  assert.equal(rows.length, 10, 'All ten actual outcomes must collect');
  if (control) {
    assert.equal(run.status, 1); assert.equal(report.numFailedTests, 1); assert.equal(report.numPassedTests, 1); assert.equal(report.numPendingTests, 8);
    const intended = rows.filter(row => row.title === controls[control].test); assert.equal(intended.length, 1); assert.equal(intended[0].status, 'failed');
    const messages = intended[0].failureMessages.join('\n');
    assert.match(messages, /AssertionError:|expect\(element\)\.(?:not\.)?(?:toHaveFocus|toHaveClass|toHaveAttribute)|Expected element with focus/, 'Intended row must fail its actual assertion');
    assert.equal(rows.find(row => row.title === baseline)?.status, 'passed', 'Independent original helper/daily-save/completion outcome stays green');
    console.log(`simRankEmOrder ${control}: one intended assertion fails, independent original ranking outcome passes, eight cases explicitly skipped.`);
    console.log('RANK_ORDER_RECEIPT: ' + JSON.stringify({ control, failed: 1, independentPassed: 1, skipped: 8, intended: intended[0].title, messages }));
  } else {
    assert.equal(run.status, 0); assert.equal(report.numPassedTests, 10); assert.equal(report.numFailedTests, 0); assert.equal(report.numPendingTests, 0);
    console.log('simRankEmOrder: ten actual Page/hook outcomes pass.');
    console.log('simRankEmOrder: original helper1000/600/0, exact daily v/date/puzzleIndex/order/status and original share.');
    console.log('simRankEmOrder: quiet editable draft, one lock/completion, strict choices/rungs and finite/static feedback verified.');
  }
} finally {
  for (const file of owned) await rm(file, { force: true });
  if (folder) await rmdir(folder);
  for (const verify of verifyBytes) await verify();
}
console.log('simRankEmOrder: source bytes held, owned copies and report cleaned.');
