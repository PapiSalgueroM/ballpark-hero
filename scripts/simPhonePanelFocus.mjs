/* Actual Soccer Career phone, keyboard containment, return focus and exact callbacks.
   PHONE_PANEL_CONTROL=tab|return|navigation|visibility changes asserted source copies. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(root, 'src/components/soccer-career/PhonePanel.tsx');
const control = process.env.PHONE_PANEL_CONTROL || '';
const independent = 'retains the exact existing money callback and quiet focus after a refused action';
const controls = {
  tab: { changes: [["    if (event.key !== 'Tab') return;", '    return;']], test: 'contains both Tab boundaries and ShiftTab from the initially focused dialog', signal: /expected true to be false/ },
  return: { changes: [['if (dialog && !dialog.isConnected && openedFrom?.isConnected) openedFrom.focus({ preventScroll: true });', 'void openedFrom;']], test: 'closes once on Escape and returns the exact connected opener without scrolling', signal: /Expected element with focus/ },
  navigation: { changes: [['    target?.focus({ preventScroll: true });', '    void target;']], test: 'focuses stable Back controls and the original app tile across thread navigation', signal: /Expected element with focus/ },
  visibility: { changes: [
    ["el.tabIndex < 0 || el.matches(':disabled') || el.closest('[hidden], [inert]')", "el.tabIndex < 0 || el.closest('[hidden], [inert]')"],
    ["if (style.display === 'none' || style.visibility === 'hidden') return false;", 'void style;'],
  ], test: 'excludes disabled and hidden controls from the live Tab boundary', signal: /Expected element with focus/ },
};
assert.ok(!control || control in controls, 'Unknown phone focus control');
const original = await readFile(sourcePath, 'utf8'), source = original.replace(/\r\n/g, '\n');
let folder, copy;
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', DEBUG_PRINT_LIMIT: '1200' };
  delete env.NO_DOUBLE_SWAP;
  const args = [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/phonePanelFocus.test.tsx', '--reporter=verbose'];
  if (control) {
    let changed = source;
    for (const [anchor, replacement] of controls[control].changes) {
      assert.equal(changed.split(anchor).length - 1, 1, 'Each copied control must bind exactly one actual statement');
      changed = changed.replace(anchor, replacement);
    }
    assert.notEqual(changed, source, 'Control must change code');
    await mkdir(path.join(root, '.sim-control'), { recursive: true });
    folder = await mkdtemp(path.join(root, '.sim-control/phone-focus-'));
    copy = path.join(folder, 'PhonePanel.tsx'); await writeFile(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/soccer-career/PhonePanel': copy });
    args.push('-t', `${controls[control].test}|${independent}`);
  }
  const run = spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 120000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`, diagnostic = output.slice(-2500);
  process.stdout.write(output);
  assert.ok(!run.error, `${String(run.error)}\n${diagnostic}`);
  assert.match(output, /phonePanelFocus\.test\.tsx/, 'Actual panel suite must run');
  assert.doesNotMatch(output, /Failed to resolve|Cannot find module|Unhandled Errors/, 'Resolver and environment failures cannot earn control credit');
  if (control) {
    assert.notEqual(run.status, 0, diagnostic);
    assert.match(output, /Tests\s+1 failed.*1 passed.*10 skipped/, diagnostic);
    assert.ok(output.split('\n').some(line => line.includes('FAIL ') && line.includes(controls[control].test)), 'Named real outcome must fail');
    assert.match(output, controls[control].signal, diagnostic);
    console.log(`simPhonePanelFocus ${control}: the changed actual binding fails its intended focus outcome, an independent callback outcome passes, ten tests are explicitly skipped.`);
  } else {
    assert.equal(run.status, 0, diagnostic); assert.match(output, /Tests\s+12 passed/, diagnostic);
    console.log('simPhonePanelFocus: twelve actual-panel checks passed with real career, thread, contact and money helpers.');
  }
  assert.equal(await readFile(sourcePath, 'utf8'), original, 'Production source must remain byte-identical');
  console.log('simPhonePanelFocus: thirteen apps, original thread/contact indices and money callback are preserved.');
  console.log('simPhonePanelFocus: Tab endpoints, hidden/disabled controls, three close paths, StrictMode and quiet clones execute.');
  console.log('simPhonePanelFocus: navigation changes no career bytes, funds or saved records; owned source copies are cleaned.');
} finally {
  if (copy) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
}
