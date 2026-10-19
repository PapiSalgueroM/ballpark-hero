import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { BASE, PRODUCT, ORIGINAL_SHA, FIXED_SHA, TEST_SHA, ORIGINAL_ADMISSION, OLD_ENTRIES,
  hash, git, once, sourceForArm, sourcePlan, oldBody, assertEntryPrefixes, trackedSnapshot, assertSnapshot } from './gridSearchAccessibility1432.mjs';

const require = createRequire(import.meta.url);
export function assertOriginalAdmission() {
  assert(ORIGINAL_ADMISSION, 'Fixed accessibility refused until full actual original admission');
  assert.equal(ORIGINAL_ADMISSION.scope, 'full-original-grid-search-accessibility');
  assert.equal(ORIGINAL_ADMISSION.originalSourceSha256, ORIGINAL_SHA);
  assert.equal(ORIGINAL_ADMISSION.testSha256, TEST_SHA);
  assert(/^[0-9a-f]{40}$/.test(ORIGINAL_ADMISSION.head));
  for (const key of ['commonSha256', 'featureSha256', 'pixelSha256', 'fullAdmissionSha256']) assert(/^[0-9a-f]{64}$/.test(ORIGINAL_ADMISSION[key]), 'Actual original receipt ' + key);
}
export function evidenceTree(root) {
  const rows = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else { assert(entry.isFile(), 'Evidence contains regular files only'); const bytes = fs.readFileSync(full);
        rows.push({ file: path.relative(root, full).split(path.sep).join('/'), bytes: bytes.length, sha256: hash(bytes) }); }
    }
  }
  walk(root); return rows;
}
function oldDefault(root, file, evidence, name, sourceSha256) {
  const isBlur = file === OLD_ENTRIES[0], modeKey = isBlur ? 'SOCCER_GRID_BLUR_MODE' : 'SOCCER_GRID_SEARCH_MODE';
  const outKey = isBlur ? 'SOCCER_GRID_BLUR_OUT' : 'SOCCER_GRID_SEARCH_OUT';
  const prefix = isBlur ? 'soccer-grid-blur-evidence-' : 'soccer-grid-search-evidence-';
  const kind = isBlur ? 'SOCCER_GRID_BLUR_RESULT' : 'SOCCER_GRID_SEARCH_RESULT';
  const prior = fs.readdirSync(os.tmpdir()).filter(item => item.startsWith(prefix)).sort();
  const dir = path.join(evidence, name); fs.mkdirSync(dir);
  const receipt = path.join(dir, 'transport.transport'); fs.writeFileSync(receipt, '', { flag: 'wx' });
  const env = { ...process.env, NODE_OPTIONS: '--require=' + path.join(root, 'scripts/lib/offlineTransport.cjs'), SIM_OFFLINE_RECEIPT: receipt };
  delete env[modeKey]; delete env[outKey];
  assert(!Object.hasOwn(env, modeKey) && !Object.hasOwn(env, outKey));
  const before = trackedSnapshot(root), started = Date.now();
  const child = spawnSync(process.execPath, [file], { cwd: root, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 300000 });
  fs.writeFileSync(path.join(dir, 'stdout.log'), child.stdout || ''); fs.writeFileSync(path.join(dir, 'stderr.log'), child.stderr || '');
  const processRecord = { status: child.status, signal: child.signal, error: child.error ? String(child.error) : null, elapsedMs: Date.now() - started, timeoutMs: 300000,
    command: [process.execPath, file], modeEnvAbsent: !Object.hasOwn(env, modeKey), outEnvAbsent: !Object.hasOwn(env, outKey), sourceSha256 };
  fs.writeFileSync(path.join(dir, 'process.json'), JSON.stringify(processRecord, null, 2) + '\n');
  const lines = (child.stdout || '').split(/\r?\n/).filter(line => line.startsWith('{"kind":"' + kind + '",'));
  let metadata, copied;
  if (lines.length === 1) {
    metadata = JSON.parse(lines[0]); const actual = fs.realpathSync(metadata.evidenceRoot);
    assert.equal(path.dirname(actual), fs.realpathSync(os.tmpdir())); assert(path.basename(actual).startsWith(prefix));
    const fresh = fs.readdirSync(os.tmpdir()).filter(item => item.startsWith(prefix) && !prior.includes(item));
    assert.deepEqual(fresh, [path.basename(actual)], 'Exactly one fresh actual old default packet');
    const files = evidenceTree(actual); copied = path.join(dir, 'evidence'); fs.cpSync(actual, copied, { recursive: true, errorOnExist: true, force: false });
    assert.deepEqual(evidenceTree(copied), files); assert.deepEqual(evidenceTree(actual), files);
    fs.writeFileSync(path.join(dir, 'copied-tree.json'), JSON.stringify(files, null, 2) + '\n');
  }
  assertSnapshot(root, before);
  assert.ifError(child.error); assert.equal(child.signal, null); assert.equal(child.status, 0);
  assert.equal(lines.length, 1); assert.equal(metadata.kind, kind); assert.equal(metadata.mode, 'fixed');
  assert.equal(metadata.modeEnvAbsent, true); assert.equal(metadata.outEnvAbsent, true); assert.equal(metadata.sourceHeld, true); assert.equal(metadata.temporaryModulesRemoved, true); assert.equal(metadata.productQualified, false);
  const summaryFile = path.join(copied, 'unit/summary.json'), summary = JSON.parse(fs.readFileSync(summaryFile));
  assert.equal(hash(fs.readFileSync(summaryFile)), metadata.summarySha256); assert.equal(summary.status, 'passed'); assert.equal(summary.fixedUnitProofPassed, true);
  assert.equal(summary.actualProductSha256 ?? summary.wholeInverse.fixedSha256, sourceSha256);
  assert.equal(fs.readFileSync(receipt, 'utf8'), '');
  assert(!/Unhandled\s+(?:Errors?|Rejections?)|Uncaught\s+Exceptions?/i.test((child.stdout || '') + (child.stderr || '')));
  fs.writeFileSync(path.join(dir, 'receipt.json'), JSON.stringify({ status: 'passed', scope: 'Actual MODE/OUT-absent old default on exact historical source only',
    historical: true, currentAccessibilitySource: false, sourceSha256, metadata, process: processRecord, summarySha256: metadata.summarySha256 }, null, 2) + '\n');
  console.log('Historical ' + (isBlur ? '1430' : '1429') + ' actual default: complete frozen unit/control packet, mode/out absent, source held.');
  console.log((child.stdout || '').trim());
  return { metadata, summary, copied, receipt: path.relative(evidence, path.join(dir, 'receipt.json')).split(path.sep).join('/') };
}

export async function dispatchHistorical1432(entryUrl) {
  const file = fileURLToPath(entryUrl), root = path.resolve(path.dirname(file), '..');
  const relative = path.relative(root, file).split(path.sep).join('/'); assert(OLD_ENTRIES.includes(relative));
  const isBlur = relative === OLD_ENTRIES[0], modeKey = isBlur ? 'SOCCER_GRID_BLUR_MODE' : 'SOCCER_GRID_SEARCH_MODE', outKey = isBlur ? 'SOCCER_GRID_BLUR_OUT' : 'SOCCER_GRID_SEARCH_OUT';
  if (Object.hasOwn(process.env, modeKey) || Object.hasOwn(process.env, outKey)) return false;
  assert(require.cache[require.resolve('../lib/offlineTransport.cjs')], 'Ordinary offline preload must be active before historical dispatch');
  assert.equal(process.env.SIM_NETWORK, 'offline');
  const outerTransport = process.env.SIM_OFFLINE_RECEIPT;
  assert(outerTransport && fs.existsSync(outerTransport), 'Present ordinary outer transport receipt');
  assert.equal(fs.readFileSync(outerTransport, 'utf8'), '');
  const actual = fs.readFileSync(path.join(root, PRODUCT), 'utf8'), actualSha256 = hash(actual);
  if (![ORIGINAL_SHA, FIXED_SHA].includes(actualSha256)) return false;
  assertEntryPrefixes(root);
  const old = git(root, ['show', BASE + ':' + PRODUCT]).toString('utf8'); assert.equal(hash(old), ORIGINAL_SHA);
  if (actualSha256 === FIXED_SHA) { assertOriginalAdmission(); assert.equal(actual, sourceForArm(old, 'normal')); }
  let inverse = actual;
  if (actualSha256 === FIXED_SHA) for (const hunk of [...sourcePlan().hunks].reverse()) inverse = once(inverse, hunk.fixed, hunk.original);
  assert.equal(inverse, old, 'Whole semantic inverse before historical dispatch');
  const mainBefore = trackedSnapshot(root), evidence = fs.mkdtempSync(path.join(os.tmpdir(), 'grid-search-compatibility1432-'));
  const copied = path.join(evidence, 'source'), receiptFile = path.join(evidence, 'receipt.json');
  const record = { version: 1, status: 'failed', entry: relative, actualSourceSha256: actualSha256, historicalSourceSha256: ORIGINAL_SHA,
    modeEnvAbsent: true, outEnvAbsent: true, ordinaryOfflinePreload: true, historical: true, currentAccessibilitySource: false, worktreeRemoved: false, sourceHeld: false, phases: [] };
  const save = () => fs.writeFileSync(receiptFile, JSON.stringify(record, null, 2) + '\n'); save();
  let registered = false;
  try {
    git(root, ['worktree', 'add', '--detach', copied, git(root, ['rev-parse', 'HEAD']).toString('utf8').trim()]); registered = true;
    fs.symlinkSync(path.join(root, 'node_modules'), path.join(copied, 'node_modules'), 'dir');
    for (const entry of OLD_ENTRIES) { const body = oldBody(root, entry); fs.writeFileSync(path.join(evidence, path.basename(entry) + '.old'), body); fs.writeFileSync(path.join(copied, entry), body); }
    fs.writeFileSync(path.join(copied, PRODUCT), inverse); fs.writeFileSync(path.join(evidence, 'historical-fc4-Search.tsx'), inverse);
    const first = trackedSnapshot(copied); assert(first.members.equals(mainBefore.members), 'Whole historical tracked membership');
    const originals = new Map(mainBefore.files.map(row => [row.file, row.sha256])), differences = [];
    for (const row of first.files) { assert(originals.has(row.file)); if (row.sha256 !== originals.get(row.file)) differences.push(row.file); }
    assert.deepEqual(differences.sort(), [...OLD_ENTRIES, ...(actualSha256 === FIXED_SHA ? [PRODUCT] : [])].sort(), 'Only exact two entry prefixes and semantic inverse differ');
    record.allowedDifference = differences;
    fs.writeFileSync(path.join(evidence, 'source-fc4.before.json'), JSON.stringify(first.files, null, 2) + '\n');
    fs.writeFileSync(path.join(evidence, 'members-fc4.before'), first.members); fs.writeFileSync(path.join(evidence, 'status-fc4.before'), first.status);
    const blur = oldDefault(copied, OLD_ENTRIES[0], evidence, isBlur ? 'target' : 'support-blur', ORIGINAL_SHA);
    assertSnapshot(copied, first); record.phases.push({ name: 'fc4-blur-default', summarySha256: blur.metadata.summarySha256, receipt: blur.receipt }); save();
    const firstAfter = trackedSnapshot(copied); fs.writeFileSync(path.join(evidence, 'source-fc4.after.json'), JSON.stringify(firstAfter.files, null, 2) + '\n');
    fs.writeFileSync(path.join(evidence, 'members-fc4.after'), firstAfter.members); fs.writeFileSync(path.join(evidence, 'status-fc4.after'), firstAfter.status);
    if (!isBlur) {
      const blurInverse = blur.summary.wholeInverse; assert.equal(blurInverse.fixedSha256, ORIGINAL_SHA);
      let discovery = inverse;
      for (const hunk of [...blurInverse.hunks].reverse()) discovery = once(discovery, hunk.fixed, hunk.original);
      assert.equal(hash(discovery), '5c6f26caebb97853faf481691ee82b1e82f59f145a65b1fcee2d6dfc05a5e6e0');
      assert.equal(discovery, git(root, ['show', '2077ffbe9214fcf5e8ba8df727e0c44a2430121f:' + PRODUCT]).toString('utf8'));
      fs.writeFileSync(path.join(copied, PRODUCT), discovery); fs.writeFileSync(path.join(evidence, 'historical-5c6-Search.tsx'), discovery);
      const second = trackedSnapshot(copied); fs.writeFileSync(path.join(evidence, 'source-5c6.before.json'), JSON.stringify(second.files, null, 2) + '\n');
      fs.writeFileSync(path.join(evidence, 'members-5c6.before'), second.members); fs.writeFileSync(path.join(evidence, 'status-5c6.before'), second.status);
      const result = oldDefault(copied, OLD_ENTRIES[1], evidence, 'target', hash(discovery));
      assertSnapshot(copied, second); record.phases.push({ name: '5c6-discovery-default', summarySha256: result.metadata.summarySha256, receipt: result.receipt });
      const secondAfter = trackedSnapshot(copied); fs.writeFileSync(path.join(evidence, 'source-5c6.after.json'), JSON.stringify(secondAfter.files, null, 2) + '\n');
      fs.writeFileSync(path.join(evidence, 'members-5c6.after'), secondAfter.members); fs.writeFileSync(path.join(evidence, 'status-5c6.after'), secondAfter.status);
    }
    record.status = 'passed'; save();
  } finally {
    if (registered) git(root, ['worktree', 'remove', '--force', copied]);
    assert(!fs.existsSync(copied)); record.worktreeRemoved = true;
    assertSnapshot(root, mainBefore); record.sourceHeld = true; save();
    assert.equal(fs.readFileSync(outerTransport, 'utf8'), '');
  }
  assert.equal(record.status, 'passed');
  console.log('Historical compatibility only: exact old entry bodies and Search restored, new current semantics are proved separately.');
  console.log('Historical default cleanup: external source removed, caller tracked source and membership held.');
  console.log(JSON.stringify({ kind: 'GRID_SEARCH_HISTORICAL_COMPATIBILITY_RESULT', status: record.status, entry: relative, evidenceRoot: evidence,
    actualSourceSha256, historical: true, currentAccessibilitySource: false, modeEnvAbsent: true, outEnvAbsent: true,
    receiptSha256: hash(fs.readFileSync(receiptFile)), sourceHeld: record.sourceHeld, worktreeRemoved: record.worktreeRemoved, productQualified: false }));
  return true;
}
