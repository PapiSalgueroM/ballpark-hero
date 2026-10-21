/* Keep the complete1428 predicate on its exact PR341 Builder, separate from current15 regressions. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const root = process.cwd(), out = process.env.APPEARANCE_CONTRAST_OUT, require = createRequire(import.meta.url);
assert(require.cache[require.resolve('../lib/offlineTransport.cjs')]); assert.equal(process.env.SIM_NETWORK, 'offline');
assert(out && path.isAbsolute(out) && path.relative(root, out).split(path.sep).includes('..'));
const outerTransport = process.env.SIM_OFFLINE_RECEIPT;
assert(outerTransport && fs.existsSync(outerTransport) && fs.statSync(outerTransport).size === 0, 'Caller creates empty outer receipt');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const git = args => execFileSync('git', args, { cwd: root, maxBuffer: 64 * 1024 * 1024 });
const base = '62d7c8b3338809a1aec3d0aaa6b5c373ac9f581a', file = 'src/components/soccer-career/AppearanceBuilder.tsx';
const original = git(['show', base + ':' + file]).toString('utf8');
assert.equal(hash(original), '94a22773c5075085f47e032f4cb7b9e3d5baf733a70a18cf63265c2523625e05');
const current = fs.readFileSync(file, 'utf8'), unit = JSON.parse(fs.readFileSync(path.join(out, 'unit/summary.json'), 'utf8'));
assert.equal(unit.status, 'passed'); assert.equal(unit.sourceHeld, true); assert.equal(unit.currentScroll.passed, 15);
const inverse = unit.wholeInverse; assert.equal(inverse.fixedSha256, hash(current)); assert.equal(inverse.originalSha256, hash(original));
let recovered = current;
for (const hunk of [...inverse.hunks].reverse()) {
  assert.notEqual(hunk.fixed, hunk.original); assert.equal(recovered.split(hunk.fixed).length, 2, 'One historical ink inverse anchor');
  const changed = recovered.replace(hunk.fixed, hunk.original); assert.notEqual(changed, recovered); recovered = changed;
}
assert.equal(recovered, original, 'Complete historical Builder, no predicate waiver'); assert.equal(hash(recovered), inverse.recoveredSha256);
assert.equal(inverse.hunks.length, current === original ? 0 : 4);
const tracked = git(['ls-files', '-z']), status = git(['status', '--porcelain=v1', '--untracked-files=all']);
const sources = tracked.toString('utf8').split('\0').filter(Boolean).map(name => ({ file: name, sha256: hash(fs.readFileSync(name)) }));
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'appearance-scroll-historical1431-')), copied = path.join(temp, 'source');
const evidence = path.join(out, 'historical-scroll'); assert(!fs.existsSync(evidence)); fs.mkdirSync(evidence);
const receipt = { status: 'failed', scope: 'Unchanged full1428 predicate on exact PR341 Builder only. Current15 regressions run separately.',
  base, currentSha256: hash(current), historicalSha256: hash(recovered), wholeInverse: inverse, sourceHeld: false, removed: false };
const save = () => fs.writeFileSync(path.join(out, 'historical-scroll-replay.json'), JSON.stringify(receipt, null, 2) + '\n');
let registered = false;
let variantSource, variantStatus, variantTracked;
const snapshot = directory => sources.map(row => ({ file: row.file, sha256: hash(fs.readFileSync(path.join(directory, row.file))) }));
const variantGit = args => execFileSync('git', args, { cwd: copied, maxBuffer: 64 * 1024 * 1024 });
try {
  git(['worktree', 'add', '--detach', copied, git(['rev-parse', 'HEAD']).toString('utf8').trim()]); registered = true;
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(copied, 'node_modules'), 'dir');
  fs.writeFileSync(path.join(copied, file), recovered);
  variantTracked = variantGit(['ls-files', '-z']); assert(variantTracked.equals(tracked));
  variantStatus = variantGit(['status', '--porcelain=v1', '--untracked-files=all']);
  assert.equal(variantStatus.toString('utf8'), current === recovered ? '' : ' M ' + file + '\n', 'Only the historical Builder differs');
  variantSource = snapshot(copied);
  for (let i = 0; i < variantSource.length; i++) assert.equal(variantSource[i].sha256, variantSource[i].file === file ? hash(recovered) : sources[i].sha256);
  fs.writeFileSync(path.join(evidence, 'variant-source.before.json'), JSON.stringify(variantSource, null, 2) + '\n');
  fs.writeFileSync(path.join(evidence, 'variant-members.before'), variantTracked);
  fs.writeFileSync(path.join(evidence, 'variant-status.before'), variantStatus);
  fs.writeFileSync(path.join(evidence, 'historical-AppearanceBuilder.tsx'), recovered);
  const sim = 'scripts/simAppearanceCategoryScroll.mjs', test = 'src/test/appearanceCategoryScroll.test.tsx';
  for (const held of [sim, test, 'src/components/soccer-career/PlayerAvatar.tsx', 'src/lib/soccerCareerAppearance.ts',
    'src/lib/careerAppearanceCopy.ts', 'src/lib/soccerBoots.ts', 'vitest.config.ts', 'scripts/lib/offlineTransport.cjs']) {
    assert(fs.readFileSync(path.join(copied, held)).equals(git(['show', base + ':' + held])), 'Entire historical source held: ' + held);
  }
  const env = { ...process.env, NODE_OPTIONS: '--require=' + path.join(copied, 'scripts/lib/offlineTransport.cjs'),
    APPEARANCE_SCROLL_MODE: 'fixed', APPEARANCE_SCROLL_OUT: evidence, SIM_OFFLINE_RECEIPT: path.join(out, 'historical-scroll-child.transport') };
  delete env.NO_DOUBLE_SWAP;
  fs.writeFileSync(env.SIM_OFFLINE_RECEIPT, '', { flag: 'wx' });
  const child = spawnSync(process.execPath, [sim], { cwd: copied, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 600000 });
  fs.writeFileSync(path.join(out, 'historical-scroll-stdout.log'), child.stdout || '');
  fs.writeFileSync(path.join(out, 'historical-scroll-stderr.log'), child.stderr || '');
  receipt.child = { status: child.status, signal: child.signal, error: child.error ? String(child.error) : null }; save();
  assert.ifError(child.error); assert.equal(child.signal, null); assert.equal(child.status, 0);
  assert(!/Unhandled\s+(?:Errors?|Rejections?)|Uncaught\s+Exceptions?/i.test((child.stdout || '') + (child.stderr || '')));
  const actual = JSON.parse(fs.readFileSync(path.join(evidence, 'unit/summary.json'), 'utf8'));
  assert.equal(actual.mode, 'fixed'); assert.equal(actual.sourceHeld, true); assert.equal(actual.temporaryModulesRemoved, true);
  assert.deepEqual(actual.cases.map(arm => arm.name), ['normal', 'bare', 'original', 'removed-category-key', 'restored']);
  assert.deepEqual(actual.cases.map(arm => [arm.passed, arm.failed, arm.pending]), [[15, 0, 0], [15, 0, 0], [10, 5, 0], [10, 5, 0], [15, 0, 0]]);
  assert.equal(actual.controls.length, 1);
  const transport = path.join(out, 'historical-scroll-child.transport'); assert(fs.existsSync(transport) && fs.statSync(transport).size === 0);
  receipt.summarySha256 = hash(fs.readFileSync(path.join(evidence, 'unit/summary.json'))); receipt.status = 'passed';
} finally {
  try {
  if (variantSource) {
    const after = snapshot(copied), afterTracked = variantGit(['ls-files', '-z']), afterStatus = variantGit(['status', '--porcelain=v1', '--untracked-files=all']);
    fs.writeFileSync(path.join(evidence, 'variant-source.after.json'), JSON.stringify(after, null, 2) + '\n');
    fs.writeFileSync(path.join(evidence, 'variant-members.after'), afterTracked);
    fs.writeFileSync(path.join(evidence, 'variant-status.after'), afterStatus);
    assert.deepEqual(after, variantSource); assert(afterTracked.equals(variantTracked)); assert(afterStatus.equals(variantStatus));
    receipt.variantSource = { members: after.length, beforeSha256: hash(fs.readFileSync(path.join(evidence, 'variant-source.before.json'))),
      afterSha256: hash(fs.readFileSync(path.join(evidence, 'variant-source.after.json'))), allowedDifference: current === recovered ? [] : [file], held: true };
  }
  } catch (error) {
    receipt.status = 'failed'; receipt.variantHoldError = String(error?.stack || error); throw error;
  } finally {
  if (registered) git(['worktree', 'remove', '--force', copied]);
  assert(!fs.existsSync(copied)); fs.rmdirSync(temp); receipt.removed = true;
  assert(tracked.equals(git(['ls-files', '-z']))); assert(status.equals(git(['status', '--porcelain=v1', '--untracked-files=all'])));
  for (const row of sources) assert.equal(hash(fs.readFileSync(row.file)), row.sha256, row.file);
  assert.equal(fs.statSync(outerTransport).size, 0);
  receipt.sourceHeld = true; save();
  }
}
console.log('Historical1428: unchanged five-arm75-case predicate and key control on exact PR341 Builder. Current15 cases have separate current-source credit.');
