import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { BASE, PRODUCT, ORIGINAL_SHA, FIXED_SHA, hash, git, changePriority, readPlan, trackedSnapshot, assertSnapshot, evidenceTree } from './gridExactNamePriority1435.mjs';

export const PREFIX = "/* Round1435: exact-name priority compatibility. Complete prior entry follows unchanged. */\nasync function runExactNameCompatibility1435() {\n  return (await import('./qa/gridExactNameCompatibility1435.mjs')).dispatchHistorical1435(import.meta.url);\n}\nif (await runExactNameCompatibility1435()) process.exit(process.exitCode ?? 0);\n";
export const RESULT_KIND = 'GRID_EXACT_NAME_COMPATIBILITY_RESULT';
export const DEFAULT_PREFIX = 'grid-exact-name-compatibility1435-';
export const ENTRIES = [
  { name: 'apostrophe', entry: 'scripts/simSoccerGridApostropheSearch.mjs', modeKey: 'SOCCER_GRID_APOSTROPHE_MODE', outKey: 'SOCCER_GRID_APOSTROPHE_OUT',
    oldPrefix: 'grid-apostrophe-search-evidence-', oldKind: 'SOCCER_GRID_APOSTROPHE_RESULT', cases: 656 },
  { name: 'accessibility', entry: 'scripts/simSoccerGridSearchAccessibility.mjs', modeKey: 'GRID_SEARCH_A11Y_MODE', outKey: 'GRID_SEARCH_A11Y_OUT',
    oldPrefix: 'grid-apostrophe-compatibility1434-', oldKind: 'GRID_APOSTROPHE_COMPATIBILITY_RESULT', cases: 344 },
  { name: 'blur', entry: 'scripts/simSoccerGridBlurOwnership.mjs', modeKey: 'SOCCER_GRID_BLUR_MODE', outKey: 'SOCCER_GRID_BLUR_OUT',
    oldPrefix: 'grid-apostrophe-compatibility1434-', oldKind: 'GRID_APOSTROPHE_COMPATIBILITY_RESULT', cases: 64 },
  { name: 'discovery', entry: 'scripts/simSoccerGridSearchDiscovery.mjs', modeKey: 'SOCCER_GRID_SEARCH_MODE', outKey: 'SOCCER_GRID_SEARCH_OUT',
    oldPrefix: 'grid-apostrophe-compatibility1434-', oldKind: 'GRID_APOSTROPHE_COMPATIBILITY_RESULT', cases: 192 },
];
export function entryFor(relative) {
  const spec = ENTRIES.find(row => row.entry === relative);
  assert(spec, 'Only four exact entry points'); return spec;
}
export function recoverEntry(root, file, body = fs.readFileSync(path.join(root, file))) {
  assert(ENTRIES.some(row => row.entry === file));
  const old = git(root, ['show', BASE + ':' + file]), expected = Buffer.concat([Buffer.from(PREFIX), old]);
  assert(body.equals(expected), 'Exact unique Round1435 prefix and complete prior entry body: ' + file);
  const recovered = body.subarray(Buffer.byteLength(PREFIX)); assert(recovered.equals(old), 'Entire prior entry inverse');
  return recovered;
}
export function assertSupportPrefixes(root) { for (const spec of ENTRIES) recoverEntry(root, spec.entry); }
export function assertKnownSource(body) {
  assert([ORIGINAL_SHA, FIXED_SHA].includes(hash(body)), 'Only the two exact priority source bodies are supported');
}
function write(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n'); }
function rawInventory(packet) {
  const rows = [];
  for (const item of evidenceTree(packet).filter(row => row.file.endsWith('.json'))) {
    const value = JSON.parse(fs.readFileSync(path.join(packet, item.file))); if (!Number.isInteger(value.numTotalTests)) continue;
    const cases = value.testResults.flatMap(suite => suite.assertionResults);
    assert.equal(value.numPendingTests, 0); assert.equal(value.numTodoTests, 0); assert.equal(value.numRuntimeErrorTestSuites || 0, 0);
    if (value.numUnhandledErrors !== undefined) assert.equal(value.numUnhandledErrors, 0); if (value.unhandledErrors !== undefined) assert.deepEqual(value.unhandledErrors, []);
    assert.equal(cases.length, value.numTotalTests); assert(cases.every(row => ['passed', 'failed'].includes(row.status)));
    assert.equal(cases.filter(row => row.status === 'passed').length, value.numPassedTests); assert.equal(cases.filter(row => row.status === 'failed').length, value.numFailedTests);
    rows.push({ file: item.file, cases: value.numTotalTests, passed: value.numPassedTests, failed: value.numFailedTests, sha256: item.sha256 });
  }
  return rows;
}
export async function dispatchHistorical1435(entryUrl) {
  const file = fileURLToPath(entryUrl), root = path.resolve(path.dirname(file), '..'), relative = path.relative(root, file).split(path.sep).join('/');
  const spec = entryFor(relative);
  const actual = fs.readFileSync(path.join(root, PRODUCT), 'utf8'), actualSha256 = hash(actual);
  const hasMode = Object.hasOwn(process.env, spec.modeKey), hasOut = Object.hasOwn(process.env, spec.outKey), explicit = hasMode || hasOut;
  if (explicit) return false;
  const require = createRequire(entryUrl); assert(require.cache[require.resolve('./lib/offlineTransport.cjs')], 'Ordinary offline preload must be active');
  assert.equal(process.env.SIM_NETWORK, 'offline');
  const outer = process.env.SIM_OFFLINE_RECEIPT; assert(outer && fs.existsSync(outer)); assert.equal(fs.readFileSync(outer, 'utf8'), '');
  assertKnownSource(actual); assertSupportPrefixes(root);
  const plan = readPlan(root, actualSha256 === FIXED_SHA ? 'fixed' : 'baseline');
  const recovered = actualSha256 === FIXED_SHA ? changePriority(actual, 'inverse') : actual; assert.equal(recovered, plan.original);
  const before = trackedSnapshot(root), parentHead = git(root, ['rev-parse', 'HEAD']).toString('utf8').trim();
  const evidenceRoot = fs.mkdtempSync(path.join(os.tmpdir(), DEFAULT_PREFIX)), copied = path.join(evidenceRoot, 'source');
  const record = { version: 1, status: 'failed', name: spec.name, entry: spec.entry, historical: true, currentSource: false,
    ordinaryDefault: !explicit, modeEnvAbsent: !hasMode, outEnvAbsent: !hasOut, sourceSha256: ORIGINAL_SHA, actualSourceSha256: actualSha256,
    parentHead, cases: spec.cases, prefix: PREFIX, entries: [], sourceHeld: false, removed: false };
  const save = () => write(path.join(evidenceRoot, 'receipt.json'), record); let registered = false; save();
  try {
    git(root, ['worktree', 'add', '--detach', copied, parentHead]); registered = true;
    fs.symlinkSync(path.join(root, 'node_modules'), path.join(copied, 'node_modules'), 'dir');
    for (const item of ENTRIES) {
      const old = recoverEntry(root, item.entry); fs.writeFileSync(path.join(copied, item.entry), old);
      fs.writeFileSync(path.join(evidenceRoot, path.basename(item.entry) + '.old'), old);
      record.entries.push({ entry: item.entry, actualSha256: hash(fs.readFileSync(path.join(root, item.entry))), originalSha256: hash(old), recoveredSha256: hash(old) });
    }
    fs.writeFileSync(path.join(copied, PRODUCT), recovered); fs.writeFileSync(path.join(evidenceRoot, 'historical-Search.tsx'), recovered);
    const first = trackedSnapshot(copied), main = new Map(before.files.map(row => [row.file, row.sha256])); assert(first.members.equals(before.members));
    const differences = first.files.filter(row => row.sha256 !== main.get(row.file)).map(row => row.file).sort();
    assert.deepEqual(differences, [...ENTRIES.map(row => row.entry), ...(actualSha256 === FIXED_SHA ? [PRODUCT] : [])].sort(), 'Only four exact prefix inverses and optional single priority differ');
    for (const helper of ['scripts/qa/checkGridSearchAccessibility1432.mjs', 'scripts/qa/gridSearchAccessibility1432.mjs', 'scripts/qa/gridSearchCompatibility1432.mjs', 'scripts/qa/gridApostropheSearch1434.mjs', 'scripts/qa/gridApostropheCompatibility1434.mjs'])
      assert(fs.readFileSync(path.join(copied, helper)).equals(git(root, ['show', BASE + ':' + helper])), 'Entire old helper body held');
    git(copied, ['add', '--', ...differences]);
    git(copied, ['-c', 'user.name=Round1435 offline proof', '-c', 'user.email=round1435@invalid', '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null',
      'commit', '--no-verify', '-m', 'Round1435 exact historical entry and exact-name inverses']);
    const historicalHead = git(copied, ['rev-parse', 'HEAD']).toString('utf8').trim();
    assert.deepEqual(git(root, ['diff', '--name-only', parentHead, historicalHead]).toString('utf8').trim().split('\n').filter(Boolean).sort(), differences);
    assert.equal(git(copied, ['show', historicalHead + ':' + PRODUCT]).toString('utf8'), recovered);
    for (const item of ENTRIES) assert(git(copied, ['show', historicalHead + ':' + item.entry]).equals(recoverEntry(root, item.entry)));
    record.historicalHead = historicalHead; record.allowedDifference = differences;
    fs.writeFileSync(path.join(evidenceRoot, 'exact-source.diff'), git(root, ['diff', parentHead, historicalHead]));
    git(copied, ['archive', '--format=zip', '--output=' + path.join(evidenceRoot, 'source.zip'), historicalHead]); record.archiveSha256 = hash(fs.readFileSync(path.join(evidenceRoot, 'source.zip')));
    const held = trackedSnapshot(copied); assert.equal(held.status.length, 0, 'Historical physical source and archive HEAD agree');
    write(path.join(evidenceRoot, 'source.before.json'), held.files); fs.writeFileSync(path.join(evidenceRoot, 'members.before'), held.members); fs.writeFileSync(path.join(evidenceRoot, 'status.before'), held.status); save();
    const target = path.join(evidenceRoot, 'target'); fs.mkdirSync(target);
    const transport = path.join(target, 'transport.transport'); fs.writeFileSync(transport, '', { flag: 'wx' });
    const env = { ...process.env, NODE_OPTIONS: '--require=' + path.join(copied, 'scripts/lib/offlineTransport.cjs'), SIM_OFFLINE_RECEIPT: transport }; delete env.NO_DOUBLE_SWAP; delete env[spec.modeKey]; delete env[spec.outKey];
    const prior = fs.readdirSync(os.tmpdir()).filter(name => name.startsWith(spec.oldPrefix)), started = Date.now();
    const priorTrees = prior.map(name => ({ name, files: evidenceTree(path.join(os.tmpdir(), name)) })); write(path.join(target, 'prior-packets.before.json'), priorTrees);
    const result = spawnSync(process.execPath, [spec.entry], { cwd: copied, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 2700000 });
    fs.writeFileSync(path.join(target, 'stdout.log'), result.stdout || ''); fs.writeFileSync(path.join(target, 'stderr.log'), result.stderr || '');
    record.process = { status: result.status, signal: result.signal, error: result.error ? String(result.error) : null, args: [spec.entry], timeoutMs: 2700000,
      elapsedMs: Date.now() - started, modeEnvAbsent: !Object.hasOwn(env, spec.modeKey), outEnvAbsent: !Object.hasOwn(env, spec.outKey) };
    write(path.join(target, 'process.json'), record.process);
    const fresh = fs.readdirSync(os.tmpdir()).filter(name => name.startsWith(spec.oldPrefix) && !prior.includes(name)); write(path.join(target, 'fresh-packets.json'), { prefix: spec.oldPrefix, prior, fresh });
    const lines = (result.stdout || '').split(/\r?\n/).filter(line => line.startsWith('{"kind":"' + spec.oldKind + '",'));
    const metadata = lines.length === 1 ? JSON.parse(lines[0]) : null;
    const actualPacket = metadata?.evidenceRoot || (fresh.length === 1 ? path.join(os.tmpdir(), fresh[0]) : null);
    if (actualPacket && fs.existsSync(actualPacket)) {
      const actualRoot = fs.realpathSync(actualPacket); assert.equal(path.dirname(actualRoot), fs.realpathSync(os.tmpdir())); assert.deepEqual(fresh, [path.basename(actualRoot)]);
      const tree = evidenceTree(actualRoot); fs.cpSync(actualRoot, path.join(target, 'evidence'), { recursive: true, force: false, errorOnExist: true });
      assert.deepEqual(evidenceTree(path.join(target, 'evidence')), tree); assert.deepEqual(evidenceTree(actualRoot), tree); write(path.join(target, 'copied-tree.json'), tree); record.copiedFiles = tree.length;
    }
    const priorAfter = prior.map(name => ({ name, files: evidenceTree(path.join(os.tmpdir(), name)) })); write(path.join(target, 'prior-packets.after.json'), priorAfter); assert.deepEqual(priorAfter, priorTrees, 'Whole prior requested packets held');
    assert.ifError(result.error); assert.equal(result.signal, null); assert.equal(fs.readFileSync(transport, 'utf8'), '');
    assert(!/Unhandled\s+(?:Errors?|Rejections?)|Uncaught\s+Exceptions?/i.test((result.stdout || '') + (result.stderr || '')));
    assert.equal(result.status, 0); assert.equal(lines.length, 1); assert(metadata);
    assert.equal(metadata.modeEnvAbsent, !hasMode); assert.equal(metadata.outEnvAbsent, !hasOut); assert.equal(metadata.sourceHeld, true); assert.equal(metadata.productQualified, false);
    if (spec.name === 'apostrophe') { assert.equal(metadata.mode, 'fixed'); assert.equal(metadata.temporaryModulesRemoved, true); }
    else { assert.equal(metadata.entry, spec.entry); assert.equal(metadata.historical, true); assert.equal(metadata.removed, true); assert.equal(metadata.actualSourceSha256, ORIGINAL_SHA); }
    const packet = path.join(target, 'evidence'), receipt = spec.name === 'apostrophe' ? 'unit/summary.json' : 'receipt.json';
    assert.equal(hash(fs.readFileSync(path.join(packet, receipt))), spec.name === 'apostrophe' ? metadata.summarySha256 : metadata.receiptSha256);
    const rawReports = rawInventory(packet); assert.equal(rawReports.reduce((sum, row) => sum + row.cases, 0), spec.cases, 'Complete requested unchanged old default raw census');
    record.metadata = metadata; record.rawReports = rawReports; record.status = 'passed';
    assertSnapshot(copied, held); const after = trackedSnapshot(copied); write(path.join(evidenceRoot, 'source.after.json'), after.files);
    fs.writeFileSync(path.join(evidenceRoot, 'members.after'), after.members); fs.writeFileSync(path.join(evidenceRoot, 'status.after'), after.status);
    process.stdout.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
  } finally {
    if (registered) git(root, ['worktree', 'remove', '--force', copied]); assert(!fs.existsSync(copied));
    assertSnapshot(root, before); assert.equal(git(root, ['rev-parse', 'HEAD']).toString('utf8').trim(), parentHead); assert.equal(fs.readFileSync(outer, 'utf8'), '');
    record.removed = true; record.sourceHeld = true; save();
  }
  assert.equal(record.status, 'passed');
  console.log('Exact1435 compatibility:' + spec.name + ',complete prior method and actual historical packet,source held.');
  console.log('Entry/product inverses and clean detached HEAD held; no current-source outcome credit.');
  console.log(JSON.stringify({ kind: RESULT_KIND, status: record.status, name: spec.name, entry: spec.entry, evidenceRoot,
    historical: true, currentSource: false, ordinaryDefault: !explicit, actualSourceSha256: actualSha256, sourceSha256: ORIGINAL_SHA,
    modeEnvAbsent: !hasMode, outEnvAbsent: !hasOut, cases: spec.cases, receiptSha256: hash(fs.readFileSync(path.join(evidenceRoot, 'receipt.json'))),
    sourceHeld: true, removed: true, productQualified: false }));
  return true;
}
