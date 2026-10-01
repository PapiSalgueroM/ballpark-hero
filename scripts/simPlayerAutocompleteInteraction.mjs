/* Round 754: actual option interaction outcomes, with asserted broken copies. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.AUTOCOMPLETE_INTERACTION_CONTROL || '';
assert.ok(['', 'pointeronly', 'unguard', 'enabledoptions'].includes(control), 'Unknown autocomplete interaction control');
let folder;
let copy;
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const source = (await readFile(path.join(root, 'src/components/game/PlayerAutocomplete.tsx'), 'utf8')).replace(/\r\n/g, '\n');
    let changed = source;
    const replace = (anchor, replacement, count = 1) => {
      assert.equal(changed.split(anchor).length - 1, count, 'The autocomplete control anchor must occur exactly as expected');
      changed = changed.replaceAll(anchor, replacement);
    };
    if (control === 'pointeronly') {
      replace('                onClick={e => {\n                  if (e.detail === 0) commitSelection(entity);\n                }}', '');
    } else if (control === 'unguard') {
      replace('      if (disabled) return;', '', 2);
    } else {
      replace('                role="option"\n                disabled={disabled}', '                role="option"');
    }
    assert.notEqual(changed, source, 'The autocomplete control must change the component');
    const base = path.join(root, '.sim-control');
    await mkdir(base, { recursive: true });
    folder = await mkdtemp(path.join(base, 'autocomplete-interaction-'));
    copy = path.join(folder, 'PlayerAutocomplete.tsx');
    await writeFile(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/game/PlayerAutocomplete': copy });
  }
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/playerAutocompleteInteraction.test.tsx', '--reporter=verbose'], { cwd: root, env, encoding: 'utf8', timeout: 120000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  process.stdout.write(output);
  const diagnostic = output.slice(-6000);
  assert.ok(!run.error, String(run.error));
  assert.match(output, /playerAutocompleteInteraction\.test\.tsx/, 'The actual autocomplete tests must run');
  if (control) {
    assert.notEqual(run.status, 0, diagnostic);
    assert.match(output, control === 'pointeronly' ? /selects exactly once from a native keyboard or assistive click/ : /disables existing options and rejects stale pointer and keyboard activation/, diagnostic);
    assert.match(output, control === 'pointeronly' ? /2 failed.*6 passed/ : control === 'unguard' ? /3 failed.*5 passed/ : /1 failed.*7 passed/, diagnostic);
    console.log(`simPlayerAutocompleteInteraction ${control} control: actual interaction checks rejected the changed component.`);
  } else {
    assert.equal(run.status, 0, diagnostic);
    assert.match(output, /8 passed/, diagnostic);
    console.log('simPlayerAutocompleteInteraction: eight actual-component pointer, keyboard, disabled, free-text, identity and filter checks passed.');
  }
} finally {
  if (copy) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
}
