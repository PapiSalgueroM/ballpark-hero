/* Round787: actual Clue Auction page, helpers, bank and completion outcomes.
   CLUE_AUCTION_CONTROL=keyboard|blur|escape|focus|boundary|loss|motion|settle|cleanup changes asserted copies. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'src/pages/ClueAuction.tsx');
const control = process.env.CLUE_AUCTION_CONTROL || '';
const controls = {
  keyboard: { anchor: 'onClick={e => { if (e.detail === 0) submitGuess(p); }}', replacement: 'onClick={() => {}}', failure: 'retains the focused non-first suggestion and commits keyboard selection once' },
  blur: { anchor: 'if (!event.currentTarget.contains(event.relatedTarget)) setDropOpen(false);', replacement: 'setDropOpen(false);', failure: 'retains the focused non-first suggestion and commits keyboard selection once' },
  escape: { anchor: 'inputRef.current?.focus({ preventScroll: true });', replacement: '', failure: 'retains the focused non-first suggestion and commits keyboard selection once' },
  focus: { anchor: 'clueNodes.current.get(addedClue)?.focus({ preventScroll: true });', replacement: '', failure: 'reveals a bought clue at its exact cost, stable node and focus without duplicate purchases' },
  boundary: { anchor: 'c.price >= bank', replacement: 'c.price > bank', count: 2, failure: 'keeps the exact unaffordable boundary and final wrong bank floor with one loss cue' },
  loss: { anchor: "kind: phase === 'lost' ? 'lost' : 'wrong'", replacement: "kind: 'wrong'", failure: 'keeps the exact unaffordable boundary and final wrong bank floor with one loss cue' },
  motion: { anchor: 'feedback?.kind === phase && styles.resultCue', replacement: 'false && styles.resultCue', failure: 'preserves exact win score, actual completion storage and custom share text once per case' },
  settle: { anchor: 'window.setTimeout(() => setFeedback(null), 600)', replacement: 'window.setTimeout(() => {}, 600)', failure: 'keeps active clones on the same cue and settles without replay or retained timers' },
  cleanup: { anchor: 'return () => window.clearTimeout(timer);', replacement: 'return () => {};', failure: 'keeps active clones on the same cue and settles without replay or retained timers' },
};
assert.ok(!control || control in controls, 'Unknown Clue Auction control');
const original = await readFile(source, 'utf8');
let folder;
let copy;
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', DEBUG_PRINT_LIMIT: '1200' };
  delete env.NO_DOUBLE_SWAP;
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/clueAuctionFeedback.test.tsx', '--reporter=verbose', '--testTimeout=60000', '--hookTimeout=60000'];
  if (control) {
    const spec = controls[control];
    assert.equal(original.split(spec.anchor).length - 1, spec.count ?? 1, 'Change only the asserted live binding');
    const cssImport = "from './ClueAuction.module.css'";
    assert.equal(original.split(cssImport).length - 1, 1, 'Resolve the real scoped CSS from the copied page');
    const changed = original.replaceAll(spec.anchor, spec.replacement).replace(cssImport, "from '@/pages/ClueAuction.module.css'");
    assert.notEqual(changed, original);
    await mkdir(path.join(root, '.sim-control'), { recursive: true });
    folder = await mkdtemp(path.join(root, '.sim-control/clue-auction-'));
    copy = path.join(folder, 'ClueAuction.tsx'); await writeFile(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/pages/ClueAuction': copy });
    args.push('-t', `${spec.failure}|keeps the real clue values, exact prices and unavailable clue without spending on boot`);
  }
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 180000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  process.stdout.write(output);
  assert.ok(!run.error, String(run.error));
  assert.match(output, /clueAuctionFeedback\.test\.tsx/, 'Actual page and unchanged helpers must execute');
  if (control) {
    assert.notEqual(run.status, 0, 'Copied defect must fail its actual outcome');
    assert.match(output, /Tests\s+\d+ failed.*\d+ passed/);
    assert.match(output, new RegExp('FAIL[^\\n]*' + controls[control].failure), 'The intended outcome must fail');
    assert.match(output, /✓[^\n]*keeps the real clue values, exact prices and unavailable clue without spending on boot/, 'Independent unchanged bank/data/completion baseline must pass');
    assert.match(output, /AssertionError|TestingLibraryElementError|expect\(element\)|expected .* to/i);
    assert.doesNotMatch(output, /Failed to resolve import|Cannot find module|No test files found|Test timed out/);
    console.log(`simClueAuctionFeedback ${control}: asserted copied defect fails its intended outcome while the real boot/helper/bank baseline passes.`);
  } else {
    assert.equal(run.status, 0, output.slice(-6000)); assert.match(output, /9 passed/);
    console.log('simClueAuctionFeedback: nine actual-page checks pass for real reveal/cost math, native event routes, stable focus/cues, guarded bank floor, quiet resets and exact real completion/storage/share outcomes.');
  }
  assert.equal(await readFile(source, 'utf8'), original, 'Copied controls preserve production source');
  console.log('simClueAuctionFeedback: existing data helpers, secret selection, scoring, storage and completion remain the outcome baseline.');
} finally {
  if (copy) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
}
