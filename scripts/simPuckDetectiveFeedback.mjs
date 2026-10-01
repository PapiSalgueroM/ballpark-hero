/* Actual Puck Detective page, shared input, helpers, daily and completion outcomes.
   PUCK_DETECTIVE_CONTROL selects an asserted copied presentation defect. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'src/pages/PuckDetective.tsx');
const css = path.join(root, 'src/pages/PuckDetective.module.css');
const baseline = 'preserves real helper tiers, numeric directions, pool filtering and untouched boot outcomes';
const accepted = 'reveals exactly accepted original guesses with truthful attribute labels and stable older cards';
const quiet = 'keeps unknown and duplicate selections quiet without another saved guess';
const lifetime = 'keeps live clones stable and clears finite cues and owned timers without replay';
const motion = 'binds finite real cue declarations and static reduced motion to the accepted row';
const controls = {
  identity: { anchor: 'key={g.player.playerId}', replacement: 'key={`${g.player.playerId}-${i}`}', failure: accepted },
  commit: { anchor: 'setGuessCue({ mode, mysteryId: pending.mysteryId, playerId: pending.playerId, count: storedGuesses.length });', replacement: 'setGuessCue(null);', failure: accepted },
  unknown: { anchor: 'if (!match) return;', replacement: 'if (!match) { const last = storedGuesses.at(-1); if (last) setGuessCue({ mode, mysteryId: mystery.playerId, playerId: last.playerId, count: storedGuesses.length }); return; }', failure: quiet },
  duplicate: { anchor: "if (guessedIds.has(match.playerId)) { setQuery(''); return; }", replacement: '', failure: quiet },
  restore: { anchor: '? guessCue : null;', replacement: '? guessCue : mystery && storedGuesses.length ? { mode, mysteryId: mystery.playerId, playerId: storedGuesses[storedGuesses.length - 1].playerId, count: storedGuesses.length } : null;', failure: 'restores partial and finished original daily histories quietly without recording them again' },
  direction: { anchor: 'numericDescription(g.feedback.ageDirection, false)', replacement: 'numericDescription(g.feedback.jerseyDirection, false)', count: 2, failure: accepted },
  names: { anchor: 'styles.fullName', replacement: "'truncate'", failure: 'retains full guess text scoped wrapping and reachable owned control sizes' },
  targets: { anchor: 'min-h-[44px] ', replacement: '', count: 3, failure: 'retains full guess text scoped wrapping and reachable owned control sizes' },
  settle: { anchor: 'window.setTimeout(() => setGuessCue(null), 600)', replacement: 'window.setTimeout(() => {}, 600)', failure: lifetime },
  cleanup: { anchor: 'return () => window.clearTimeout(timer);', replacement: 'return () => {};', failure: lifetime },
  finite: { css: true, anchor: 'animation: guessReveal 420ms ease-out 1;', replacement: 'animation: guessReveal 420ms ease-out infinite;', failure: motion },
  reduced: { css: true, anchor: 'animation: none;', replacement: 'animation: guessReveal 420ms ease-out 1;', failure: motion },
};
const control = process.env.PUCK_DETECTIVE_CONTROL || '';
assert.ok(!control || control in controls, 'Known Puck Detective control');
const originals = new Map(await Promise.all([source, css].map(async file => [file, await readFile(file, 'utf8')])));
let folder;
const owned = [];
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', DEBUG_PRINT_LIMIT: '1200' };
  delete env.NO_DOUBLE_SWAP; delete env.PUCK_DETECTIVE_CSS;
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/puckDetectiveFeedback.test.tsx', '--reporter=verbose', '--testTimeout=30000', '--hookTimeout=30000'];
  if (control) {
    const spec = controls[control]; const file = spec.css ? css : source; const original = originals.get(file);
    assert.equal(original.split(spec.anchor).length - 1, spec.count ?? 1, 'Assert the exact live mutation count');
    let changed = original.replaceAll(spec.anchor, spec.replacement);
    assert.notEqual(changed, original, 'Copied control must alter the binding');
    await mkdir(path.join(root, '.sim-control'), { recursive: true });
    folder = await mkdtemp(path.join(root, '.sim-control/puck-detective-'));
    const copy = path.join(folder, spec.css ? 'PuckDetective.module.css' : 'PuckDetective.tsx');
    if (spec.css) env.PUCK_DETECTIVE_CSS = copy;
    else {
      const importAnchor = "from './PuckDetective.module.css'";
      assert.equal(changed.split(importAnchor).length - 1, 1);
      changed = changed.replace(importAnchor, "from '@/pages/PuckDetective.module.css'");
      env.NO_DOUBLE_SWAP = JSON.stringify({ '@/pages/PuckDetective': copy });
    }
    await writeFile(copy, changed); owned.push(copy);
    args.push('-t', `${spec.failure}|${baseline}`);
  }
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 180000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`; process.stdout.write(output);
  assert.ok(!run.error, String(run.error)); assert.match(output, /puckDetectiveFeedback\.test\.tsx/);
  if (control) {
    assert.notEqual(run.status, 0, 'Copied defect must fail its actual outcome');
    assert.match(output, /Tests\s+1 failed\s*\|\s*1 passed\s*\|\s*8 skipped/);
    assert.match(output, new RegExp('FAIL[^\\n]*' + controls[control].failure));
    assert.match(output, new RegExp('✓[^\\n]*' + baseline), 'Independent real helper, daily and completion baseline stays green');
    assert.match(output, /AssertionError|TestingLibraryElementError|expect\(element\)|expected .* to/i);
    assert.doesNotMatch(output, /Failed to resolve import|Cannot find module|No test files found|Test timed out/);
    console.log(`simPuckDetectiveFeedback ${control}: one intended outcome fails, one unchanged helper/storage/completion baseline passes.`);
  } else {
    assert.equal(run.status, 0, output.slice(-6000)); assert.match(output, /10 passed/);
    console.log('simPuckDetectiveFeedback: ten actual-page checks pass for accepted original IDs, stable history, exact clues, quiet state changes, finite cue lifetime and unchanged daily score/storage/streak/share/completion.');
  }
} finally {
  for (const file of owned) await rm(file, { force: true });
  if (folder) await rmdir(folder);
  for (const [file, original] of originals) assert.equal(await readFile(file, 'utf8'), original, 'Copied controls preserve production source bytes');
}
console.log('simPuckDetectiveFeedback: owned copies cleaned up, production page and module preserved.');
