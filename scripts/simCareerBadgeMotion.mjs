/* Round 756: rendered career badge feedback uses the real earnedBadges evaluator.
   CAREER_BADGE_MOTION_CONTROL accepts unearned, unicon, locked or notitle, copies only. */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const control = process.env.CAREER_BADGE_MOTION_CONTROL || '';
assert.ok(['', 'unearned', 'unicon', 'locked', 'notitle'].includes(control), 'Unknown career badge motion control');
const sourcePath = path.join(root, 'src/components/us-career/SocialPanel.tsx');
const source = await readFile(sourcePath, 'utf8');
let folder;
const copies = [];
try {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP;
  if (control) {
    const changes = control === 'unearned' ? [['on && motion.earned', 'false && motion.earned']]
      : control === 'unicon' ? [['on && motion.icon', 'false && motion.icon']]
      : control === 'locked' ? [['on && motion.earned', 'motion.earned'], ['on && motion.icon', 'motion.icon']]
      : [['title={b.label}', '']];
    let changed = source;
    for (const [anchor, replacement] of changes) {
      assert.equal(changed.split(anchor).length - 1, 1, `BadgeGrid ${anchor} binding must occur once`);
      const next = changed.replace(anchor, replacement);
      assert.notEqual(next, changed, 'Control must change the actual BadgeGrid binding');
      changed = next;
    }
    const base = path.join(root, '.sim-control');
    await mkdir(base, { recursive: true });
    folder = await mkdtemp(path.join(base, 'career-badge-'));
    const copy = path.join(folder, 'SocialPanel.tsx');
    copies.push(copy);
    await writeFile(copy, changed);
    env.NO_DOUBLE_SWAP = JSON.stringify({ '@/components/us-career/SocialPanel': copy });
  }
  const run = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', 'src/test/careerBadgeMotion.test.tsx', '--reporter=verbose'], { cwd: root, env, encoding: 'utf8', timeout: 120000 });
  const output = `${run.stdout || ''}\n${run.stderr || ''}`;
  const diagnostic = output.slice(-2500);
  process.stdout.write(control ? output.slice(-6000) : output);
  assert.ok(!run.error, `${String(run.error)}\n${diagnostic}`);
  assert.match(output, /careerBadgeMotion\.test\.tsx/, 'The actual rendered badge tests must run');
  if (control) {
    assert.notEqual(run.status, 0, diagnostic);
    if (control === 'notitle') {
      assert.match(output, /Tests\s+1 failed.*5 passed/, diagnostic);
      assert.match(output, /retains the complete label in DOM and title for earned and locked badges/, diagnostic);
      assert.match(output, /Unable to find an element with the title: Fixture first step/, diagnostic);
    } else if (control === 'locked') {
      assert.match(output, /Tests\s+4 failed.*2 passed/, diagnostic);
      assert.match(output, /keeps all locked cards quiet with their original labels and requirements/, diagnostic);
      assert.match(output, /Expected the element not to have class:[\s\S]*earned/, diagnostic);
    } else {
      assert.match(output, /Tests\s+2 failed.*4 passed/, diagnostic);
      assert.match(output, /binds finite feedback only to the real evaluator earned results/, diagnostic);
      assert.match(output, /unlocks in place and preserves card and icon identity through cloned props/, diagnostic);
      assert.match(output, new RegExp(`Expected the element to have class:[\\s\\S]*${control === 'unearned' ? 'earned' : 'icon'}`), diagnostic);
    }
    assert.equal(await readFile(sourcePath, 'utf8'), source, 'Control must leave production source unchanged');
    console.log(`simCareerBadgeMotion ${control}: the asserted temporary binding change produced the expected rendered failures; production source stayed unchanged.`);
  } else {
    assert.equal(run.status, 0, diagnostic);
    assert.match(output, /Tests\s+6 passed/, diagnostic);
    console.log('simCareerBadgeMotion: six rendered evaluator, locked, earned, unlock, stable-node, previous-career and full-label checks passed.');
  }
} finally {
  for (const copy of copies) await rm(copy, { force: true });
  if (folder) await rmdir(folder);
}
