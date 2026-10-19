/* Replay the unchanged1429 predicate on its exact Search, separately from current UI tests. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const root = process.cwd(), out = process.env.SOCCER_GRID_BLUR_OUT;
const require = createRequire(import.meta.url);
assert(require.cache[require.resolve('../lib/offlineTransport.cjs')]);
assert.equal(process.env.SIM_NETWORK, 'offline');
assert(out && path.isAbsolute(out) && path.relative(root, out).split(path.sep).includes('..'));
const hash = body => createHash('sha256').update(body).digest('hex');
const git = args => execFileSync('git', args, { cwd: root, maxBuffer: 64 * 1024 * 1024 });
const file = 'src/components/soccer-grid/SoccerGridSearch.tsx';
const base = '2077ffbe9214fcf5e8ba8df727e0c44a2430121f';
const original = git(['show', base + ':' + file]).toString('utf8');
assert.equal(hash(original), '5c6f26caebb97853faf481691ee82b1e82f59f145a65b1fcee2d6dfc05a5e6e0');
const current = fs.readFileSync(file, 'utf8'), summary = JSON.parse(fs.readFileSync(path.join(out, 'unit/summary.json')));
assert.equal(summary.status, 'passed'); assert.equal(summary.sourceHeld, true);
const inverse = summary.wholeInverse;
assert.equal(inverse.fixedSha256, hash(current)); assert.equal(inverse.originalSha256, hash(original));
let recovered = current;
for (const hunk of [...inverse.hunks].reverse()) {
  assert.notEqual(hunk.original, hunk.fixed);
  assert.equal(recovered.split(hunk.fixed).length, 2, 'One current inverse executable anchor');
  const changed = recovered.replace(hunk.fixed, hunk.original); assert.notEqual(changed, recovered); recovered = changed;
}
assert.equal(recovered, original); assert.equal(inverse.recoveredSha256, hash(recovered));
const beforeStatus = git(['status', '--porcelain=v1', '--untracked-files=all']);
const tracked = git(['ls-files', '-z']);
const sources = tracked.toString('utf8').split('\0').filter(Boolean).map(name => ({ file: name, sha256: hash(fs.readFileSync(name)) }));
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'grid-discovery-historical1430-'));
const copied = path.join(temp, 'source'), evidence = path.join(out, 'historical-discovery');
assert(!fs.existsSync(evidence)); fs.mkdirSync(evidence);
const receipt = { status: 'failed', scope: 'Historical1429 predicate and all controls on exact2077 Search. Current Search16 cases run separately.',
  currentSha256: hash(current), historicalSha256: hash(recovered), wholeInverse: inverse, sourceHeld: false, removed: false };
const save = () => fs.writeFileSync(path.join(out, 'historical-replay.json'), JSON.stringify(receipt, null, 2) + '\n');
let registered = false;
try {
  git(['worktree', 'add', '--detach', copied, git(['rev-parse', 'HEAD']).toString('utf8').trim()]); registered = true;
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(copied, 'node_modules'), 'dir');
  fs.writeFileSync(path.join(copied, file), recovered);
  const sim = 'scripts/simSoccerGridSearchDiscovery.mjs';
  assert(fs.readFileSync(path.join(copied, sim)).equals(git(['show', base + ':' + sim])), 'Entire inherited sim is unchanged');
  assert(fs.readFileSync(path.join(copied, 'src/test/soccerGridSearchDiscovery.test.tsx')).equals(git(['show', base + ':src/test/soccerGridSearchDiscovery.test.tsx'])));
  const child = spawnSync(process.execPath, [sim], { cwd: copied, env: { ...process.env, NODE_OPTIONS: '--require=' + path.join(copied, 'scripts/lib/offlineTransport.cjs'),
    SOCCER_GRID_SEARCH_MODE: 'fixed', SOCCER_GRID_SEARCH_OUT: evidence, SIM_OFFLINE_RECEIPT: path.join(out, 'historical-child.transport') },
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 600000 });
  fs.writeFileSync(path.join(out, 'historical-stdout.log'), child.stdout || ''); fs.writeFileSync(path.join(out, 'historical-stderr.log'), child.stderr || '');
  receipt.child = { status: child.status, signal: child.signal, error: child.error ? String(child.error) : null }; save();
  assert.ifError(child.error); assert.equal(child.signal, null); assert.equal(child.status, 0);
  const actual = JSON.parse(fs.readFileSync(path.join(evidence, 'unit/summary.json')));
  assert.equal(actual.status, 'passed'); assert.equal(actual.fixedUnitProofPassed, true); assert.equal(actual.sourceHeld, true); assert.equal(actual.temporaryModulesRemoved, true);
  assert.deepEqual(actual.arms.map(arm => arm.failed), [0, 0, 5, 3, 2, 1, 1, 0]);
  receipt.summarySha256 = hash(fs.readFileSync(path.join(evidence, 'unit/summary.json'))); receipt.status = 'passed';
} finally {
  if (registered) git(['worktree', 'remove', '--force', copied]);
  assert.equal(fs.existsSync(copied), false); fs.rmdirSync(temp); receipt.removed = true;
  assert(tracked.equals(git(['ls-files', '-z']))); assert(beforeStatus.equals(git(['status', '--porcelain=v1', '--untracked-files=all'])));
  for (const row of sources) assert.equal(hash(fs.readFileSync(row.file)), row.sha256, row.file);
  receipt.sourceHeld = true; save();
}
console.log('Historical1429 full predicate:8x16 outcomes, complete controls and exact source restored. Current UI proof is separately attributed.');
