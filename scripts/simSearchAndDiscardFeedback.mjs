/* Round 793: actual page, original duel helpers and original completion hook.
   SEARCH_DISCARD_CONTROL mutates one asserted copied binding, never live files. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pagePath = path.join(root, 'src/pages/SearchAndDiscard.tsx');
const control = process.env.SEARCH_DISCARD_CONTROL || '';
const retained = 'retains all22 slot nodes';
const focused = 'focuses a non-first chosen offer';
const cpu = 'keeps the exact CPU delay';
const cleanup = 'cancels pending CPU work';
const controls = {
  remount: { test: retained, edits: [
    ['const renderSquad = (side: 0 | 1, label: string) => (', 'const SquadColumn = ({ side, label }: { side: 0 | 1; label: string }) => ('],
    ["{renderSquad(0, 'Manager A')}", '<SquadColumn side={0} label="Manager A" />'],
    ["{renderSquad(1, mode === 'cpu' ? 'The CPU' : 'Manager B')}", '<SquadColumn side={1} label={mode === \'cpu\' ? \'The CPU\' : \'Manager B\'} />'],
  ] },
  kept: { test: retained, edits: [['committed?.side === side && committed.slot === i && feedback.kept', 'false && feedback.kept']] },
  discarded: { test: retained, edits: [['committed?.discarded.includes(p.name) ? feedback.discarded : undefined', 'false ? feedback.discarded : undefined']] },
  cpucue: { test: cpu, edits: [['setCommitted({ side: state.turn, slot: slotIndex, discarded: offer.filter(p => p !== keep).map(p => p.name) });', 'setCommitted(null);']] },
  selection: { test: retained, edits: [['setKeepPick(keepPick === player ? null : player);', "setCommitted({ side: state!.turn, slot: emptySlots(state!, state!.turn)[0], discarded: [] }); setKeepPick(keepPick === player ? null : player);"]] },
  clear: { test: retained, edits: [['const timer = setTimeout(() => setCommitted(null), 500);', 'const timer = setTimeout(() => setCommitted(null), 500000);']] },
  focus: { test: focused, edits: [['target?.focus({ preventScroll: true });', 'void target;']] },
  scroll: { test: 'scrolls only the chosen squad column', edits: [['column.scrollTop += cell.bottom - box.bottom + 4;', 'void column.scrollTop;']] },
  repeat: { test: focused, edits: [["if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();", 'void event;']] },
  dialogfocus: { test: cpu, edits: [["if ((request === 'search' || request === 'result') && active && active !== document.body && !playArea.current?.contains(active) && phase !== 'setup') return;", 'void active;']] },
  duplicate: { test: 'refuses a repeated same-frame keep', edits: [['acceptedState.current === state || ', '']] },
  cleanup: { test: cleanup, edits: [['return () => clearTimeout(t);', 'return () => {};']] },
};
assert.ok(!control || Object.hasOwn(controls, control), 'Unknown Search and Discard control');
const preservedPaths = [pagePath, path.join(root, 'src/pages/SearchAndDiscard.module.css'), ...[
  'src/lib/searchDiscard.ts', 'src/lib/squadDeal.ts', 'src/hooks/useGameCompletion.ts',
  'src/components/game/ResultScreen.tsx', 'src/components/game/GameShell.tsx',
].map(file => path.join(root, file))];
const preserved = await Promise.all(preservedPaths.map(file => readFile(file)));
const page = preserved[0].toString('utf8');
let folder, copy;
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', DEBUG_PRINT_LIMIT: '1200' };
  delete env.NO_DOUBLE_SWAP;
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/searchAndDiscardFeedback.test.tsx', '--reporter=verbose', '--testTimeout=60000'];
  if (control) {
    const spec = controls[control];
    let changed = page;
    for (const [anchor, replacement] of [...spec.edits, ["import feedback from './SearchAndDiscard.module.css';", "import feedback from '@/pages/SearchAndDiscard.module.css';"]]) {
      assert.equal(changed.split(anchor).length - 1, 1, 'Each control anchor must occur exactly once');
      const before = changed;
      changed = changed.replace(anchor, replacement);
      assert.notEqual(changed, before, 'Every copied mutation must actually change code');
    }
    await mkdir(path.join(root, '.sim-control'), { recursive: true });
    folder = await mkdtemp(path.join(root, '.sim-control/search-discard-'));
    copy = path.join(folder, 'SearchAndDiscard.tsx');
    await writeFile(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/pages/SearchAndDiscard': copy });
    const independent = control === 'cleanup' ? 'preserves the complete pass duel' : cleanup;
    args.push('--testNamePattern', `${spec.test}|${independent}`);
  }
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 180000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  process.stdout.write(output);
  assert.ok(!run.error, String(run.error));
  assert.match(output, /searchAndDiscardFeedback\.test\.tsx/, 'Actual page outcomes must run');
  assert.doesNotMatch(output, /Failed to resolve import|Cannot find module|Failed to load url|No test files found|Unhandled Errors|Test timed out|RPC timeout/, 'Resolver, collection and timeout failures earn no credit');
  if (control) {
    assert.notEqual(run.status, 0, 'Copied defect must fail its intended outcome');
    assert.match(output, /Tests\s+1 failed.*1 passed.*6 skipped/, 'One intended failure plus one independent pass must run');
    assert.match(output, new RegExp(`FAIL[^\\n]*${controls[control].test}`), 'Intended outcome must appear in the actual failure report');
    assert.match(output, /AssertionError|expected .* to|Expected element with focus:/i, 'A real outcome assertion must fail');
    console.log(`simSearchAndDiscardFeedback ${control}: asserted copied binding changed; intended outcome failed and independent baseline passed.`);
  } else {
    assert.equal(run.status, 0, output.slice(-6500));
    assert.match(output, /8 passed/);
    console.log('simSearchAndDiscardFeedback: eight actual page/helper/hook outcomes passed, including both complete duel modes.');
  }
  for (let index = 0; index < preservedPaths.length; index += 1) assert.deepEqual(await readFile(preservedPaths[index]), preserved[index], 'Page, styles, original helpers and shared completion/result/shell bytes must stay unchanged');
  console.log('simSearchAndDiscardFeedback: exact offers, all22 stable slot nodes, season totals, full share and one original completion are exercised.');
  console.log('simSearchAndDiscardFeedback: finite committed cues, quiet selection/clones, native focus and owned-column scroll are exercised.');
  console.log('simSearchAndDiscardFeedback: copied controls never edit live game files; pixel fit and reduced motion require the independent native matrix.');
} finally {
  if (copy) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
}
