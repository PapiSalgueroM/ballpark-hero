/* Round 755: extension replies reveal after the engine resolves a push.
   Control removes the response binding in an asserted temporary copy. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.EXTENSION_RESPONSE_MOTION_CONTROL || '';
assert.ok(['', 'unreply'].includes(control), 'Unknown extension response motion control');
let folder;
let copy;
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const source = await readFile(path.join(root, 'src/components/us-career/ExtensionCard.tsx'), 'utf8');
    const anchor = 'talk.pushed && motion.reply';
    assert.equal(source.split(anchor).length - 1, 1, 'Response control anchor must occur once');
    const cssImport = "'./ExtensionMotion.module.css'";
    assert.equal(source.split(cssImport).length - 1, 1, 'Control CSS import must occur once');
    const changed = source.replace(anchor, 'false && motion.reply');
    assert.notEqual(changed, source, 'Response control must change the source');
    const base = path.join(root, '.sim-control');
    await mkdir(base, { recursive: true });
    folder = await mkdtemp(path.join(base, 'extension-motion-'));
    copy = path.join(folder, 'ExtensionCard.tsx');
    await writeFile(copy, changed.replace(cssImport, "'@/components/us-career/ExtensionMotion.module.css'"));
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/us-career/ExtensionCard': copy });
  }
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/extensionResponseMotion.test.tsx', '--reporter=verbose'], { cwd: root, env, encoding: 'utf8', timeout: 120000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  const diagnostic = output.slice(-6000);
  process.stdout.write(output);
  assert.ok(!run.error, String(run.error));
  assert.match(output, /extensionResponseMotion\.test\.tsx/, 'The actual extension card tests must run');
  if (control) {
    assert.notEqual(run.status, 0, diagnostic);
    assert.match(output, /3 failed.*2 passed/, diagnostic);
    assert.match(output, /reveals the exact 'improved' engine reply without replacing remaining controls/, diagnostic);
    assert.match(output, /reveals the exact 'held' engine reply without replacing remaining controls/, diagnostic);
    assert.match(output, /reveals the exact 'pulled' engine reply without replacing remaining controls/, diagnostic);
    assert.match(output, /Expected the element to have class:[\s\S]*reply/, diagnostic);
    console.log('simExtensionResponseMotion unreply control: all three real-engine response checks rejected the removed binding; both opening-state checks stayed green.');
  } else {
    assert.equal(run.status, 0, diagnostic);
    assert.match(output, /5 passed/, diagnostic);
    console.log('simExtensionResponseMotion: five actual-card opening, engine-response, exact-terms, one-use-push, callback, stable-node and focus checks passed.');
  }
} finally {
  if (copy) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
}
