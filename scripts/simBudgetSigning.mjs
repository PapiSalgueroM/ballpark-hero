/* Round 779: real-hook signing previews and committed, finite feedback.
   BUDGET_SIGNING_CONTROL=refund|commit|object|focus|cancel|cleanup|motion changes asserted copies. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'src/components/budget-builder/BudgetBuilderBoard.tsx');
const control = process.env.BUDGET_SIGNING_CONTROL || '';
const controls = {
  refund: { anchor: 'remaining + (current?.marketValue ?? 0) - (choice?.marketValue ?? 0)', replacement: 'remaining - (choice?.marketValue ?? 0)', failure: 'uses the replacement refund at the exact budget boundary' },
  commit: { anchor: 'const committed = squad[request.slot] === request.after', replacement: 'const committed = true || squad[request.slot] === request.after', failure: 'keeps refused sign and release callbacks open and quiet' },
  object: { anchor: 'sign(choice);', replacement: 'sign({ ...choice });', failure: 'commits the original candidate once' },
  focus: { anchor: 'slots.current[request.slot]?.focus({ preventScroll: true });', replacement: '', failure: 'commits the original candidate once' },
  cancel: { anchor: 'previewOpener.current?.isConnected ? previewOpener.current : searchInput.current', replacement: 'previewOpener.current', failure: 'returns cancel focus to search when filtering removes' },
  cleanup: { anchor: 'return () => window.clearTimeout(timer);', replacement: 'return () => {};', failure: 'keeps cues finite, quiet on cloned rerenders' },
  motion: { anchor: 'className={styles.feedback}', replacement: 'className={undefined}', failure: 'keeps cues finite, quiet on cloned rerenders' },
};
assert.ok(!control || control in controls, 'Unknown Budget Builder signing control');
const original = await readFile(source, 'utf8');
let folder;
let copy;
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', DEBUG_PRINT_LIMIT: '1600' };
  delete env.NO_DOUBLE_SWAP;
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/budgetSigning.test.tsx', '--reporter=verbose', '--testTimeout=60000', '--hookTimeout=60000'];
  if (control) {
    const spec = controls[control];
    assert.equal(original.split(spec.anchor).length - 1, 1, 'Change exactly one live preview, outcome or cleanup binding');
    const cssImport = "from './BudgetBuilderBoard.module.css'";
    assert.equal(original.split(cssImport).length - 1, 1, 'Resolve the actual scoped stylesheet in the copy');
    const changed = original.replace(spec.anchor, spec.replacement).replace(cssImport, "from '@/components/budget-builder/BudgetBuilderBoard.module.css'");
    assert.notEqual(changed, original);
    await mkdir(path.join(root, '.sim-control'), { recursive: true });
    folder = await mkdtemp(path.join(root, '.sim-control/budget-signing-'));
    copy = path.join(folder, 'BudgetBuilderBoard.tsx'); await writeFile(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/budget-builder/BudgetBuilderBoard': copy });
    args.push('-t', `${spec.failure}|previews exact existing values without spending`);
  }
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 300000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  process.stdout.write(output);
  assert.ok(!run.error, String(run.error));
  assert.match(output, /budgetSigning\.test\.tsx/, 'Actual Board and unchanged hook tests must execute');
  if (control) {
    assert.notEqual(run.status, 0, 'Changed code must fail its measured outcome');
    assert.match(output, /Tests\s+\d+ failed.*\d+ passed/);
    assert.match(output, new RegExp('FAIL[^\\n]*' + controls[control].failure), 'The intended outcome must fail');
    assert.match(output, /✓[^\n]*previews exact existing values without spending/, 'The unchanged preview/cancel outcome must pass');
    assert.match(output, /AssertionError|TestingLibraryElementError|expect\(element\)|expected .* to/i);
    assert.doesNotMatch(output, /Failed to resolve import|Cannot find module|No test files found|Test timed out/);
    console.log(`simBudgetSigning ${control}: the asserted copy rejects its intended outcome while the independent preview/cancel case passes.`);
  } else {
    assert.equal(run.status, 0, output.slice(-6000)); assert.match(output, /9 passed/);
    console.log('simBudgetSigning: nine actual Board/real-hook checks pass for original-player identity, exact refund/budget/rating, no-op/cancel, top60, connected/fallback focus, finite cues and paired completed XI/score/share.');
  }
  assert.equal(await readFile(source, 'utf8'), original, 'Production source must stay unchanged');
  console.log('simBudgetSigning: copied controls preserve the existing hook, pool, economy, criteria and recorded outcomes.');
} finally {
  if (copy) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
}
