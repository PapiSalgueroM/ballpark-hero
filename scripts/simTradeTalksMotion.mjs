/* Round 751: negotiation replies animate without changing deals or actions.
   Control removes the newest-reply binding in an asserted temporary copy. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.TRADE_TALKS_MOTION_CONTROL || '';
assert.ok(['', 'unreply'].includes(control), 'Unknown trade talks motion control');
let folder;
let copy;
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };
  if (control) {
    const source = await readFile(path.join(root, 'src/components/front-office-shared/TradeTalksCard.tsx'), 'utf8');
    const anchor = 'i === talks.log.length - 1 && motion.reply';
    assert.equal(source.split(anchor).length - 1, 1, 'Reply control anchor must occur once');
    const cssImport = "'./TradeTalksMotion.module.css'";
    assert.equal(source.split(cssImport).length - 1, 1, 'Control CSS import must occur once');
    const changed = source.replace(anchor, 'false && motion.reply');
    assert.notEqual(changed, source, 'Reply control must change the source');
    const base = path.join(root, '.sim-control');
    await mkdir(base, { recursive: true });
    folder = await mkdtemp(path.join(base, 'trade-motion-'));
    copy = path.join(folder, 'TradeTalksCard.tsx');
    await writeFile(copy, changed.replace(cssImport, "'@/components/front-office-shared/TradeTalksMotion.module.css'"));
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/front-office-shared/TradeTalksCard': copy });
  }
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/tradeTalksMotion.test.tsx', '--reporter=verbose'], { cwd: root, env, encoding: 'utf8', timeout: 120000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  const diagnostic = output.slice(-6000);
  process.stdout.write(output);
  assert.ok(!run.error, String(run.error));
  assert.match(output, /tradeTalksMotion\.test\.tsx/, 'The actual card tests must run');
  if (control) {
    assert.notEqual(run.status, 0, diagnostic);
    assert.match(output, /4 failed.*2 passed/, diagnostic);
    assert.match(output, /reveals appended replies without replaying old lines or replacing focused controls/, diagnostic);
    assert.match(output, /Expected the element to have class:[\s\S]*reply/, diagnostic);
    console.log('simTradeTalksMotion control: four reply checks rejected the removed binding; both phase-transition callback and focus checks stayed green.');
  } else {
    assert.equal(run.status, 0, diagnostic);
    assert.match(output, /6 passed/, diagnostic);
    console.log('simTradeTalksMotion: six actual-card engine-text, appended-reply, immediate-action, focus and one-shot checks passed.');
  }
} finally {
  if (copy) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
}
