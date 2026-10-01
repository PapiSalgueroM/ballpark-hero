/* Round 776: actual staff decisions, pure previews, confirmation and committed feedback.
   STAFF_SCREEN_CONTROL=unconfirm|close|uncued|unfocus changes asserted source copies only. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.STAFF_SCREEN_CONTROL || '';
assert.ok(['', 'unconfirm', 'close', 'uncued', 'unfocus'].includes(control), 'Unknown staff screen control');
const sourcePath = path.join(root, 'src/components/club-manager/StaffScreen.tsx');
const original = await readFile(sourcePath, 'utf8');
const source = original.replace(/\r\n/g, '\n');
let folder;
let copy;
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const changes = {
      unconfirm: ['onClick={() => setConfirm({ post, personId: person.id })}', 'onClick={() => { setConfirm({ post, personId: person.id }); onSack(post); }}'],
      close: ['    callback();', '    callback();\n    setOpen(null);'],
      uncued: ["styles.committed)}>{cue.text}", "false && styles.committed)}>{cue.text}"],
      unfocus: ['posts.current[request.post]?.focus({ preventScroll: true });', 'void posts.current[request.post];'],
    };
    const [anchor, replacement] = changes[control];
    assert.equal(source.split(anchor).length - 1, 1, 'Actual outcome binding must occur exactly once');
    let changed = source.replace(anchor, replacement);
    assert.notEqual(changed, source, 'Control must change the real source binding');
    const cssImport = "from './StaffScreen.module.css'";
    assert.equal(changed.split(cssImport).length - 1, 1, 'Copy must retain the scoped stylesheet');
    changed = changed.replace(cssImport, "from '@/components/club-manager/StaffScreen.module.css'");
    await mkdir(path.join(root, '.sim-control'), { recursive: true });
    folder = await mkdtemp(path.join(root, '.sim-control/staff-screen-'));
    copy = path.join(folder, 'StaffScreen.tsx');
    await writeFile(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/club-manager/StaffScreen': copy });
  }
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/staffScreen.test.tsx', '--reporter=verbose'], { cwd: root, env, encoding: 'utf8', timeout: 120000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  const diagnostic = output.slice(-2500);
  process.stdout.write(control ? output.split('\n').filter(line => /[✓×]|FAIL |Tests\s|Test Files|Duration/.test(line)).join('\n') + '\n' + diagnostic + '\n' : output);
  assert.ok(!run.error, `${String(run.error)}\n${diagnostic}`);
  assert.match(output, /staffScreen\.test\.tsx/, 'Actual staff screen tests must run');
  if (control) {
    const expected = {
      unconfirm: { failures: 3, passes: 8, test: 'requires a separate payoff confirmation and shows the exact pure cost, payroll and lost effect', signal: /expected .*not.*called|expected.*spy.*called|onSack/ },
      close: { failures: 2, passes: 9, test: 'keeps a refused hire open with the same rows and focused original candidate button', signal: /toBeVisible|received value must be an HTMLElement/ },
      uncued: { failures: 2, passes: 9, test: 'commits the exact paid hire and focuses its stable post with finite clone-safe feedback', signal: /Expected the element to have class:[\s\S]*committed/ },
      unfocus: { failures: 5, passes: 6, test: 'commits the exact paid hire and focuses its stable post with finite clone-safe feedback', signal: /Expected element with focus/ },
    }[control];
    assert.notEqual(run.status, 0, diagnostic);
    assert.ok(new RegExp(`Tests\\s+${expected.failures} failed.*${expected.passes} passed`).test(output), diagnostic);
    assert.ok(output.split('\n').some(line => line.includes('FAIL ') && line.includes(expected.test)), 'Intended rendered failure must occur');
    assert.ok(expected.signal.test(output), 'Control must fail actual outcomes, not module resolution');
    console.log(`simStaffScreen ${control}: ${expected.failures} intended rendered failures, ${expected.passes} unaffected checks pass.`);
  } else {
    assert.equal(run.status, 0, diagnostic);
    assert.match(output, /Tests\s+11 passed/, diagnostic);
    console.log('simStaffScreen: eleven actual-screen checks pass for original generated staff, exact helper previews and paid/free hires.');
  }
  assert.equal(await readFile(sourcePath, 'utf8'), original, 'Production source bytes must remain unchanged');
  console.log('simStaffScreen: actual hire/sack/match/release effects, original IDs, budget/payroll/quota and second-tap cancellation verified.');
  console.log('simStaffScreen: rejected callbacks keep the shortlist, stable post/opener focus, quiet restored/cloned history and owned timer cleanup verified.');
  console.log('simStaffScreen: production source unchanged; owned temporary copies cleaned.');
} finally {
  if (copy) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
}

