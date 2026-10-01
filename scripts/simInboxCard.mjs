/* Round 771: actual retained inbox outcomes, paging, reply identity and quiet history.
   INBOX_CARD_CONTROL=truncated|unfiltered|uncued changes an asserted temporary copy. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.INBOX_CARD_CONTROL || '';
assert.ok(['', 'truncated', 'unfiltered', 'uncued'].includes(control), 'Unknown inbox card control');
const sourcePath = path.join(root, 'src/components/club-manager/InboxCard.tsx');
const source = await readFile(sourcePath, 'utf8');
let folder;
let copy;
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const changes = {
      truncated: ['const visible = filtered.slice(0, visibleLimit);', 'const visible = filtered.slice(0, 4);'],
      unfiltered: ["(view === 'all' || (view === 'pending' ? !m.resolved : !!m.resolved))", 'true'],
      uncued: ['cueId === m.id && styles.committed', 'false && styles.committed'],
    };
    const [anchor, replacement] = changes[control];
    assert.equal(source.split(anchor).length - 1, 1, 'Actual control binding must occur exactly once');
    let changed = source.replace(anchor, replacement);
    assert.notEqual(changed, source, 'Control must change the actual outcome binding');
    const cssImport = "from './InboxCard.module.css'";
    assert.equal(changed.split(cssImport).length - 1, 1, 'Copy must retain the real scoped CSS import');
    changed = changed.replace(cssImport, "from '@/components/club-manager/InboxCard.module.css'");
    await mkdir(path.join(root, '.sim-control'), { recursive: true });
    folder = await mkdtemp(path.join(root, '.sim-control/inbox-card-'));
    copy = path.join(folder, 'InboxCard.tsx');
    await writeFile(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/club-manager/InboxCard': copy });
  }
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/inboxCard.test.tsx', '--reporter=verbose'], { cwd: root, env, encoding: 'utf8', timeout: 120000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  const diagnostic = output.slice(-2500);
  process.stdout.write(control ? output.split('\n').filter(line => /[✓×]|FAIL |Tests\s|Test Files|Duration/.test(line)).join('\n') + '\n' + diagnostic + '\n' : output);
  assert.ok(!run.error, `${String(run.error)}\n${diagnostic}`);
  assert.match(output, /inboxCard\.test\.tsx/, 'Actual card tests must run');
  if (control) {
    assert.notEqual(run.status, 0, diagnostic);
    const expected = {
      truncated: { failures: 5, passes: 5, test: 'loads every retained message and sends the older original ID and option index', signal: /fixture-message-4/ },
      unfiltered: { failures: 5, passes: 5, test: 'shows pending and resolved views in retained order with independently bounded pages', signal: /fixture-message-5/ },
      uncued: { failures: 1, passes: 9, test: 'cues only an actual engine reply commit in place, then stays quiet after clones and view changes', signal: /Expected the element to have class:[\s\S]*committed/ },
    }[control];
    assert.ok(new RegExp(`Tests\\s+${expected.failures} failed.*${expected.passes} passed`).test(output), diagnostic);
    assert.ok(output.split('\n').some(line => line.includes('FAIL ') && line.includes(expected.test)), 'Intended outcome failure must occur');
    assert.ok(expected.signal.test(output), 'Control must fail a rendered assertion rather than module resolution');
    console.log(`simInboxCard ${control}: ${expected.failures} intended rendered failures, ${expected.passes} unaffected checks pass.`);
  } else {
    assert.equal(run.status, 0, diagnostic);
    assert.match(output, /Tests\s+10 passed/, diagnostic);
    console.log('simInboxCard: ten actual-card checks pass for eight retained messages, all views, search/reset, exact weeks/outcomes and original reply identity.');
  }
  assert.equal(await readFile(sourcePath, 'utf8'), source, 'Production card must remain unchanged');
  console.log('simInboxCard: actual engine replies, stable nodes/focus, no-op and restored-history quiet, owned timer cleanup and zero filter writes verified.');
  console.log('simInboxCard: production source unchanged; temporary control copies are cleaned.');
} finally {
  if (copy) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
}
