/* Rendered Driver Board, real hint hook and shared Dialog over declared fictional data. */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.F1_DRIVER_HINT_CONTROL || '';
const independent = 'holds independent original six payouts';
const controls = {
  tier: { test: 'advertises original next payout from clue 1', edits: [['POINTS_BY_CLUE[revealedClues] ?? 0', 'POINTS_BY_CLUE[revealedClues - 1] ?? 0']] },
  count: { test: 'counts mixed misses and hints', edits: [['hint{hintsUsed > 1 ? \'s\' : \'\'} used</p>', 'hint{hintsUsed > 1 ? \'s\' : \'\'} used (-{hintsUsed * 100} pts)</p>']] },
  max: { test: 'hides the max clue hint', edits: [['const canHint = revealedClues < MAX_CLUES;', 'const canHint = revealedClues <= MAX_CLUES;']] },
  focus: { test: 'shows an actual tier worked example', help: true, edits: [['onCloseAutoFocus={event => { event.preventDefault(); opener.current?.focus({ preventScroll: true }); }} ', '']] },
  target: { test: 'shows an actual tier worked example', help: true, edits: [['inline-flex min-h-[44px] items-center', 'inline-flex items-center']] },
  example: { test: 'shows an actual tier worked example', help: true, edits: [['worth {POINTS_BY_CLUE[1]} points.', 'worth 100 points.']] },
  labels: { test: 'labels the original authored clue strings', edits: [['Clue {i + 1}', "{['Vibe', 'Era & Nationality', 'Teams', 'Race Wins', 'Championships', 'Famous Moment'][i]}"]] },
};
assert.ok(!control || Object.hasOwn(controls, control));
const boardFile = 'src/components/f1-driver/F1DriverBoard.tsx', helpFile = 'src/components/f1-driver/F1DriverHowToPlay.tsx';
const held = [boardFile, helpFile, 'src/components/f1-driver/F1DriverFeedback.module.css', 'src/hooks/useF1Driver.ts', 'src/types/f1Driver.ts', 'src/data/f1Drivers.ts', 'src/components/f1-driver/F1DriverSearch.tsx', 'src/lib/dailyRecord.ts', 'src/hooks/useGameCompletion.ts', 'src/lib/completions.ts', 'src/components/game/ShareButtons.tsx', 'src/components/ui/dialog.tsx'];
const verify = [];
for (const file of held) { const bytes = await readFile(path.join(root, file)); verify.push(() => readFile(path.join(root, file)).then(current => assert.deepEqual(current, bytes, 'Only owned disposable copies change'))); }
const board = (await readFile(path.join(root, boardFile), 'utf8')).replace(/\r\n/g, '\n');
const help = (await readFile(path.join(root, helpFile), 'utf8')).replace(/\r\n/g, '\n');
let folder; const created = [];
try {
  const env = { ...process.env, FORCE_COLOR: '0', DEBUG_PRINT_LIMIT: '1500' }; delete env.NO_DOUBLE_SWAP;
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/f1DriverHintPoints.test.tsx', '--reporter=verbose', '--testTimeout=60000', '--maxWorkers=1', '--no-file-parallelism'];
  if (control) {
    const spec = controls[control]; let changed = spec.help ? help : board;
    for (const [anchor, replacement] of spec.edits) { assert.equal(changed.split(anchor).length - 1, 1, 'Unique actual binding'); const prior = changed; changed = changed.replace(anchor, replacement); assert.notEqual(changed, prior); }
    await mkdir(path.join(root, '.sim-control'), { recursive: true }); folder = await mkdtemp(path.join(root, '.sim-control/f1-driver-hint-'));
    const copy = path.join(folder, spec.help ? 'F1DriverHowToPlay.tsx' : 'F1DriverBoard.tsx');
    if (!spec.help) for (const name of ['F1DriverSearch', 'F1DriverHowToPlay', 'F1DriverFeedback.module.css']) { const anchor = `from './${name}'`; assert.equal(changed.split(anchor).length - 1, 1); changed = changed.replace(anchor, `from '@/components/f1-driver/${name}'`); }
    await writeFile(copy, changed); created.push(copy);
    env.NO_DOUBLE_SWAP = JSON.stringify({ [spec.help ? '@/components/f1-driver/F1DriverHowToPlay' : '@/components/f1-driver/F1DriverBoard']: copy });
    if (spec.help) {
      let boundBoard = board;
      for (const name of ['F1DriverSearch', 'F1DriverHowToPlay', 'F1DriverFeedback.module.css']) { const anchor = `from './${name}'`; assert.equal(boundBoard.split(anchor).length - 1, 1); boundBoard = boundBoard.replace(anchor, `from '@/components/f1-driver/${name}'`); }
      const boardCopy = path.join(folder, 'F1DriverBoard.tsx'); await writeFile(boardCopy, boundBoard); created.push(boardCopy);
      env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/f1-driver/F1DriverBoard': boardCopy, '@/components/f1-driver/F1DriverHowToPlay': copy });
    }
    args.push('--testNamePattern', spec.test + '|' + independent);
  }
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 180000 });
  const output = (run.stdout || '') + '\n' + (run.stderr || ''); process.stdout.write(output);
  assert.ok(!run.error, String(run.error)); assert.equal(run.signal, null, 'Terminated runner earns no credit');
  assert.match(output, /f1DriverHintPoints\.test\.tsx/); assert.doesNotMatch(output, /Failed to resolve import|Cannot find module|Failed to load url|No test files found|Unhandled Errors|Test timed out|RPC timeout/);
  if (control) { assert.equal(run.status, 1); assert.match(output, /Tests\s+1 failed.*1 passed.*8 skipped/); assert.match(output, new RegExp('FAIL[^\n]*' + controls[control].test)); assert.match(output, /AssertionError|expected .* to|expect\((?:element|received)\)\.to|Expected element with focus:/i); console.log(`simF1DriverHintPoints ${control}: unique binding changed; one intended assertion fails and independent original six-payout outcome passes.`); }
  else { assert.equal(run.status, 0, output.slice(-5000)); assert.match(output, /10 passed/); console.log('simF1DriverHintPoints: ten actual Board/hook/Dialog outcomes passed.'); }
  console.log('simF1DriverHintPoints: five next payouts, mixed miss/hints, honest counts and max-clue hiding exercised.');
  console.log('simF1DriverHintPoints: all original payouts, exact daily fields, full share cards and once completion held.');
  console.log('simF1DriverHintPoints: fictional actual-tier help example,44px opener and preventScroll return focus exercised.');
  console.log('simF1DriverHintPoints: original authored clue strings/order retained under truthful neutral clue labels.');
  console.log('simF1DriverHintPoints: hook/data/feedback CSS/Search/shared Dialog/save/completion/share bytes held.');
} finally { for (const file of created) await rm(file, { force: true }); if (folder) await rmdir(folder); for (const check of verify) await check(); }
