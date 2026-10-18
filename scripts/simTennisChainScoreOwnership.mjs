/* Round1427: actual Tennis Chain score ownership regression proof. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
assert(require.cache[require.resolve('./lib/offlineTransport.cjs')], 'Ordinary offline preload must be active');
const MODE = process.env.TENNIS_SCORE_MODE || 'fixed';
assert(['baseline', 'fixed'].includes(MODE), 'TENNIS_SCORE_MODE must be baseline or fixed');
const evidenceRoot = process.env.TENNIS_SCORE_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'tennis-score-evidence-'));
assert(path.isAbsolute(evidenceRoot) && path.relative(ROOT, evidenceRoot).split(path.sep).includes('..'), 'Evidence is absolute and outside checkout');
const OUT = path.join(evidenceRoot, 'unit'); assert(!fs.existsSync(OUT), 'Fresh unit evidence'); fs.mkdirSync(OUT);
const BASE = '775564305e9da84dab59f2b9fe246d044a3cc8e9';
const productFile = 'src/components/tennis-chain/TennisChainBoard.tsx', testFile = 'src/test/tennisChainScoreOwnership.test.tsx';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const lf = text => text.replace(/\r\n/g, '\n');
const git = args => execFileSync('git', args, { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 });
const tracked = git(['ls-files', '-z']), status = git(['status', '--porcelain=v1', '--untracked-files=all']);
const source = Object.fromEntries(tracked.toString().split('\0').filter(Boolean).map(file => [file, hash(fs.readFileSync(path.join(ROOT, file)))]));
const testHash = hash(fs.readFileSync(path.join(ROOT, testFile)));
assert.equal(testHash, 'ea570467ba22bc996b97d9fb235d216d6adf810337192cf75eb25e1926e6ad46', 'Frozen eleven-case original test body');
const originalBytes = git(['show', BASE + ':' + productFile]), original = lf(originalBytes.toString('utf8'));
const originalSha = '9ea1b5317bdb018adaa4bf95c1c62c62b72f0959faee661d277fe51077440835';
const ORIGINAL_ADMISSION = {"scope":"full-original-units-browser-native-pixels","head":"8822b4594ba576b96d0ef5a898a56835c9cbf18f","originalSourceSha256":"9ea1b5317bdb018adaa4bf95c1c62c62b72f0959faee661d277fe51077440835","testSha256":"ea570467ba22bc996b97d9fb235d216d6adf810337192cf75eb25e1926e6ad46","commonSha256":"18592453c2182c398af8a3b95e9126c04df3109b3fc9170c28d2084191ea4c12","featureSha256":"00168c1237cf554906a0c079d77638204063dcd2dd3af873ff4a4d086e4c0031","pixelSha256":"f5f9c0e4d558171dcabfd7c67fae5fee9bfdab1f64de43cbd29f341b7162b36b"};
assert.equal(hash(original), originalSha, 'Whole main775 original Board');
fs.writeFileSync(path.join(OUT, 'original-TennisChainBoard.tsx'), originalBytes);
const boundSource = [];
for (const file of ['src/hooks/useTennisChain.ts', 'src/components/tennis-chain/TennisChainSearch.tsx', 'src/components/tennis-chain/TennisChainTimeline.tsx',
  'src/components/game/PlayerAutocomplete.tsx', 'src/lib/playerSearch.ts', 'src/lib/nameFold.ts', 'src/lib/smartSearch.ts', 'src/types/tennisChain.ts',
  'src/pages/TennisChain.tsx', 'src/hooks/useGameCompletion.ts', 'src/lib/completions.ts', 'src/contexts/AuthContext.tsx', 'src/test/setup.ts', 'vitest.config.ts']) {
  const bytes = git(['show', BASE + ':' + file]); assert(fs.readFileSync(path.join(ROOT, file)).equals(bytes), 'Unchanged actual source ' + file);
  boundSource.push({ file, sha256: hash(bytes) });
}
const titles = [
  'keeps the new round unsaved after an old insert completion',
  'keeps the new round unsaved after an old rank completion',
  ...['insert', 'rank'].flatMap(boundary => ['success', 'error'].map(outcome => 'keeps a current save pending across old ' + boundary + ' ' + outcome)),
  'ordinary current saves retain exact rows and the existing rank-error fallback',
  'a current insert failure keeps its nickname and allows the exact current retry',
  'a pending current save rejects a second submission without a duplicate row',
  'reset without a pending save starts a normal editable unsaved round',
  'an old save finishing during play does not pre-submit the next finished round',
];
const declared = titles.map(name => 'Tennis Chain score ownership ' + name);
const reactAliases = { 'react/jsx-dev-runtime': require.resolve('react/jsx-dev-runtime'), 'react/jsx-runtime': require.resolve('react/jsx-runtime'), react: require.resolve('react') };
const fixedAliases = { ...reactAliases, 'lucide-react': require.resolve('lucide-react') };
const summary = { version: MODE === 'baseline' ? 1 : 2, mode: MODE, productQualified: false, fixedUnitQualified: false, status: 'failed',
  scope: 'Actual Board and actual hook with frozen fictional IO tests. Unit proof only; actual built browser/native/pixel admission remains separate. No captured insert or successful rank read cancellation.',
  expected: { cases: 11, originalFaults: 6, healthyCases: 5 }, testSha256: testHash, originalSha256: originalSha, originalAdmission: ORIGINAL_ADMISSION, boundSource, arms: [], sourceRefusals: [], copies: [] };
const save = () => fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
save();

function once(text, before, after, label) {
  assert.notEqual(before, after, label + ': mutation must change executable text');
  assert.equal(text.split(before).length - 1, 1, 'Exactly one Tennis score source hunk: ' + label);
  const changed = text.replace(before, after); assert.notEqual(changed, text, label + ': effective mutation'); return changed;
}
// Six exact product hunks bind the whole-source inverse.
const hunks = [
  { name: 'ref import', before: "import { useState, useEffect } from 'react';", after: "import { useState, useEffect, useRef } from 'react';" },
  { name: 'round revision', before: "  const [saving, setSaving] = useState(false);\n", after: "  const [saving, setSaving] = useState(false);\n  const roundRevision = useRef(0);\n" },
  { name: 'captured revision', before: "    if (!gameState || !nickname.trim() || saving) return;\n    setSaving(true);", after: "    if (!gameState || !nickname.trim() || saving) return;\n    const saveRevision = roundRevision.current;\n    setSaving(true);" },
  { name: 'rank owner', before: "      setPlayerRank((count ?? 0) + 1);\n      setScoreSubmitted(true);", after: "      if (saveRevision === roundRevision.current) {\n        setPlayerRank((count ?? 0) + 1);\n        setScoreSubmitted(true);\n      }" },
  { name: 'busy owner', before: "    setSaving(false);\n  };", after: "    if (saveRevision === roundRevision.current) setSaving(false);\n  };" },
  { name: 'reset ownership', before: "  const handleReset = () => {\n    setScoreSubmitted(false);", after: "  const handleReset = () => {\n    roundRevision.current += 1;\n    setSaving(false);\n    setScoreSubmitted(false);" },
];
function forward(text) {
  let changed = lf(text); for (const hunk of hunks) changed = once(changed, hunk.before, hunk.after, hunk.name + ' forward');
  return changed;
}
const proposedFixed = forward(original);
function inverse(text) {
  let changed = lf(text); for (const hunk of [...hunks].reverse()) changed = once(changed, hunk.after, hunk.before, hunk.name + ' inverse');
  assert.equal(hash(changed), originalSha, 'Whole main775 Board inverse SHA'); assert.equal(changed, original, 'Whole original Board inverse bytes'); return changed;
}
function refuse(label, input, action, pattern) {
  assert.notEqual(input, proposedFixed, label + ': refusal fixture changed');
  assert.throws(() => action(input), pattern, label + ': effective source refusal');
  summary.sourceRefusals.push({ label, inputSha256: hash(input), refused: true });
}
function checkAnchors() {
  assert.equal(inverse(proposedFixed), original); assert.equal(forward(inverse(proposedFixed)), proposedFixed, 'Whole fixed forward reconstruction');
  assert.equal(inverse(proposedFixed.replace(/\n/g, '\r\n')), original, 'CRLF whole original inverse');
  for (const hunk of hunks) {
    for (const [kind, replacement] of [['missing', ''], ['altered', hunk.after.slice(0, -1) + 'X'], ['duplicated', hunk.after + hunk.after]]) {
      const input = once(proposedFixed, hunk.after, replacement, hunk.name + ' ' + kind);
      refuse(hunk.name + ' ' + kind, input, inverse, /Exactly one Tennis score source hunk/);
    }
  }
  refuse('unrelated appended executable source', proposedFixed + '\nvoid 0;\n', inverse, /Whole main775 Board inverse SHA/);
}
const rankAnchor = '      if (saveRevision === roundRevision.current) {', rankNeutral = '      if (true) {';
const busyAnchor = '    if (saveRevision === roundRevision.current) setSaving(false);\n  };', busyNeutral = '    setSaving(false);\n  };';
function control(text, anchor, neutral, name) {
  const changed = once(text, anchor, neutral, name + ' executable control');
  assert.equal(once(changed, neutral, anchor, name + ' control inverse'), text, name + ': whole fixed source restored');
  for (const [kind, replacement] of [['missing', ''], ['altered', anchor.slice(0, -1) + 'X'], ['duplicated', anchor + anchor]]) {
    const input = once(text, anchor, replacement, name + ' ' + kind);
    refuse(name + ' control ' + kind, input, source => once(source, anchor, neutral, name), /Exactly one Tennis score source hunk/);
  }
  return changed;
}
const controlDir = path.join(OUT, 'control-sources'), controlFiles = [];
function removeControls() {
  for (const file of controlFiles) { assert.equal(path.dirname(file), controlDir, 'Only exact external working copies may be removed'); if (fs.existsSync(file)) fs.unlinkSync(file); }
  if (fs.existsSync(controlDir)) { assert.deepEqual(fs.readdirSync(controlDir), [], 'External control directory contains only owned working copies'); fs.rmdirSync(controlDir); }
}
function externalCopy(name, text) {
  assert(path.relative(ROOT, controlDir).split(path.sep).includes('..'), 'Control source outside checkout');
  if (!fs.existsSync(controlDir)) fs.mkdirSync(controlDir);
  const imports = [["from './TennisChainSearch'", "from '@/components/tennis-chain/TennisChainSearch'"], ["from './TennisChainTimeline'", "from '@/components/tennis-chain/TennisChainTimeline'"]];
  assert.equal((text.match(/from ['"]\.\//g) || []).length, 2, 'Exactly two actual relative Board imports');
  let rebound = text; for (const [before, after] of imports) rebound = once(rebound, before, after, name + ' copied import');
  let restored = rebound; for (const [before, after] of [...imports].reverse()) restored = once(restored, after, before, name + ' copied import inverse');
  assert.equal(restored, text, name + ': complete copied source inverse');
  const file = path.join(controlDir, name + '.tsx'); fs.writeFileSync(file, rebound, { flag: 'wx' }); controlFiles.push(file);
  const retained = path.join(OUT, 'source-evidence'); fs.mkdirSync(retained, { recursive: true });
  fs.writeFileSync(path.join(retained, name + '-source.tsx'), text, { flag: 'wx' }); fs.writeFileSync(path.join(retained, name + '-rebound.tsx'), rebound, { flag: 'wx' });
  summary.copies.push({ name, sourceSha256: hash(text), reboundSha256: hash(rebound), restoredSha256: hash(restored), relativeImports: 2 }); return file;
}
const oldRow = { nickname: 'Fixture Alpha', score: 100, chain_length: 1, mode: 'unlimited' };
const currentRow = { nickname: 'Fixture Beta', score: 0, chain_length: 0, mode: 'unlimited' };
function expectedTrace(index, flavor, pendingIndices) {
  let insertedRows = [oldRow], rankLengths = [1], completionScores = [100, 0], nickname = 'Fixture Beta', rank = null, finalScore = 'Final Score: 0';
  if (index >= 2 && index <= 5) { insertedRows = [oldRow, currentRow]; rankLengths = index === 3 ? [0] : [1, 0]; nickname = null; rank = 'You ranked #7 today!'; }
  if (index === 6) { insertedRows = [oldRow, currentRow]; rankLengths = [1, 0]; nickname = null; rank = 'You ranked #1 today!'; }
  if (index === 7) { insertedRows = [oldRow, oldRow]; completionScores = [100]; nickname = null; rank = 'You ranked #7 today!'; finalScore = 'Final Score: 100'; }
  if (index === 8) { completionScores = [100]; nickname = null; rank = 'You ranked #7 today!'; finalScore = 'Final Score: 100'; }
  if (index === 9) { insertedRows = []; rankLengths = []; }
  if (flavor === 'original' && index <= 5) {
    insertedRows = [oldRow]; rankLengths = index === 3 ? [] : [1]; nickname = index === 3 ? 'Fixture Beta' : null;
    rank = index === 3 ? null : index === 5 ? 'You ranked #1 today!' : 'You ranked #7 today!';
  }
  if (flavor === 'rank' && index < 2) { nickname = null; rank = 'You ranked #7 today!'; }
  return { name: titles[index], pendingBeforeCleanup: pendingIndices.includes(index) ? 1 : 0, pendingAfterCleanup: 0, insertedRows, rankLengths, completionScores, nickname, rank, finalScore };
}
function run(name, { bare = false, flavor = 'fixed', failures = [], pendingIndices = [], copy = null } = {}) {
  const dir = path.join(OUT, name); fs.mkdirSync(dir);
  const receipt = path.join(dir, 'transport.transport'), raw = path.join(dir, 'vitest.json');
  const env = { ...process.env, SIM_OFFLINE_RECEIPT: receipt, TENNIS_SCORE_TRACE_DIR: dir };
  if (bare) delete env.NO_DOUBLE_SWAP;
  else { const aliases = MODE === 'baseline' ? { ...reactAliases } : { ...fixedAliases }; if (copy) aliases['@/components/tennis-chain/TennisChainBoard'] = copy;
    assert.deepEqual(Object.keys(aliases), [...Object.keys(MODE === 'baseline' ? reactAliases : fixedAliases), ...(copy ? ['@/components/tennis-chain/TennisChainBoard'] : [])], 'Installed aliases precede exact Board alias'); env.NO_DOUBLE_SWAP = JSON.stringify(aliases); }
  const child = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', testFile, '--maxWorkers=1', '--no-file-parallelism', '--reporter=json', '--outputFile=' + raw],
    { cwd: ROOT, env, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 240000 });
  fs.writeFileSync(path.join(dir, 'stdout.log'), child.stdout || ''); fs.writeFileSync(path.join(dir, 'stderr.log'), child.stderr || '');
  fs.writeFileSync(path.join(dir, 'exit-code.json'), JSON.stringify({ status: child.status, signal: child.signal, error: child.error ? String(child.error) : null }) + '\n');
  assert.ifError(child.error); assert.equal(child.signal, null, name + ': no signal'); assert.equal(child.status, failures.length ? 1 : 0, name + ': exact completed child exit');
  assert(!/Unhandled\s+(?:Errors?|Rejections?)|Uncaught\s+Exceptions?/i.test((child.stdout || '') + (child.stderr || '')), name + ': no unhandled errors');
  const value = JSON.parse(fs.readFileSync(raw, 'utf8'));
  assert.equal(value.success, failures.length === 0); assert.equal(value.testResults.length, 1); assert.equal(value.numTotalTests, 11); assert.equal(value.numPassedTests, 11 - failures.length); assert.equal(value.numFailedTests, failures.length);
  assert.equal(value.numPendingTests, 0); assert.equal(value.numTodoTests, 0); assert.equal(value.numRuntimeErrorTestSuites || 0, 0); assert.equal(value.numPendingTestSuites || 0, 0);
  if (value.numUnhandledErrors !== undefined) assert.equal(value.numUnhandledErrors, 0); if (value.unhandledErrors !== undefined) assert.deepEqual(value.unhandledErrors, []);
  const suite = value.testResults[0]; assert(suite.name.replace(/\\/g, '/').endsWith('/' + testFile)); assert.equal(suite.status, failures.length ? 'failed' : 'passed');
  const cases = suite.assertionResults; assert.equal(cases.length, 11); assert.deepEqual(cases.map(row => row.fullName).sort(), [...declared].sort(), name + ': eleven exact raw titles');
  const failed = cases.filter(row => row.status === 'failed'); assert.deepEqual(failed.map(row => row.fullName).sort(), failures.map(index => declared[index]).sort(), name + ': exact effective failure set');
  for (const row of cases) {
    assert(['passed', 'failed'].includes(row.status), name + ': no unfinished case');
    if (row.status === 'passed') { assert.deepEqual(row.failureMessages, []); continue; }
    const index = declared.indexOf(row.fullName);
    const purpose = flavor === 'busy' ? 'An older save must not release the current round pending save' : flavor === 'rank' || index < 2 ? 'The new round must keep its own unsaved score form' : 'Reset must release the older round save busy state';
    assert.equal(row.failureMessages.length, 1); assert(row.failureMessages[0].startsWith('AssertionError: ' + purpose + ':'), name + ': exact leading purpose assertion');
    assert(!/TestingLibraryElementError|Test timed out|Cannot find module|Failed to resolve import|Transform failed|ReferenceError|SyntaxError|TypeError/.test(row.failureMessages[0]), name + ': no setup or preparation failure credit');
  }
  const trace = JSON.parse(fs.readFileSync(path.join(dir, 'trace.json'), 'utf8')); assert.equal(trace.version, 1);
  assert.deepEqual(trace.cases.map(row => row.name).sort(), [...titles].sort(), name + ': all exact outcome traces');
  for (let index = 0; index < titles.length; index++) { const rows = trace.cases.filter(row => row.name === titles[index]); assert.equal(rows.length, 1); assert.deepEqual(rows[0], expectedTrace(index, flavor, pendingIndices), name + ': exact rows, ranks, final UI and cleanup ' + index); }
  assert.equal(fs.existsSync(receipt) ? fs.readFileSync(receipt, 'utf8') : '', '', name + ': empty child ordinary transport receipt');
  summary.arms.push({ name, bare, passed: 11 - failures.length, failed: failures.length, pending: 0, failures: failed.map(row => ({ name: row.fullName, messages: row.failureMessages })),
    expectedPendingBeforeIndices: pendingIndices, traceSha256: hash(JSON.stringify(trace)) }); save();
  console.log(name + ':11 finished,' + failures.length + ' exact purpose faults,' + (11 - failures.length) + ' healthy,0 IO after cleanup.'); return trace;
}

let armsComplete = false;
try {
  if (MODE === 'baseline') {
    assert(fs.readFileSync(path.join(ROOT, productFile)).equals(originalBytes), 'Baseline accepts only the whole original main775 Board');
    const normal = run('normal', { flavor: 'original', failures: [0, 1, 2, 3, 4, 5] });
    const bare = run('bare', { bare: true, flavor: 'original', failures: [0, 1, 2, 3, 4, 5] }); assert.deepEqual(bare, normal, 'Original normal/bare exact trace parity');
    assert.deepEqual(summary.arms.map(arm => arm.name), ['normal', 'bare']);
  } else {
    assert(ORIGINAL_ADMISSION, 'Fixed qualification refused until full actual original unit/browser/native/pixel admission');
    assert.equal(ORIGINAL_ADMISSION.scope, 'full-original-units-browser-native-pixels'); assert(/^[0-9a-f]{40}$/.test(ORIGINAL_ADMISSION.head));
    assert.equal(ORIGINAL_ADMISSION.originalSourceSha256, originalSha); assert.equal(ORIGINAL_ADMISSION.testSha256, testHash);
    for (const field of ['commonSha256', 'featureSha256', 'pixelSha256']) assert(/^[0-9a-f]{64}$/.test(ORIGINAL_ADMISSION[field]), 'Actual admitted receipt ' + field);
    assert.equal(lf(fs.readFileSync(path.join(ROOT, productFile), 'utf8')), proposedFixed, 'Fixed mode accepts only the exact six-hunk proposed Board');
    checkAnchors(); summary.fixedSha256 = hash(proposedFixed);
    const evidence = path.join(OUT, 'source-evidence'); fs.mkdirSync(evidence); fs.writeFileSync(path.join(evidence, 'fixed-TennisChainBoard.tsx'), proposedFixed, { flag: 'wx' });
    fs.writeFileSync(path.join(evidence, 'original-inverse-TennisChainBoard.tsx'), inverse(proposedFixed), { flag: 'wx' });
    const normal = run('normal'); const bare = run('bare', { bare: true }); assert.deepEqual(bare, normal, 'Fixed installed/bare exact trace parity');
    const originalCopy = externalCopy('whole-original', original); run('whole-original', { copy: originalCopy, flavor: 'original', failures: [0, 1, 2, 3, 4, 5] });
    const rankCopy = externalCopy('rank-owner-neutral', control(proposedFixed, rankAnchor, rankNeutral, 'rank owner'));
    run('rank-owner-neutral', { copy: rankCopy, flavor: 'rank', failures: [0, 1, 2, 4, 5], pendingIndices: [2, 4, 5] });
    const busyCopy = externalCopy('busy-owner-neutral', control(proposedFixed, busyAnchor, busyNeutral, 'busy owner'));
    run('busy-owner-neutral', { copy: busyCopy, flavor: 'busy', failures: [2, 3, 4, 5], pendingIndices: [2, 3, 4, 5] });
    removeControls(); assert(!fs.existsSync(controlDir), 'Disposable source removed before restored actual runtime');
    const restored = run('restored'); assert.deepEqual(restored, normal, 'Restored actual fixed eleven-case trace parity');
    assert.deepEqual(summary.arms.map(arm => arm.name), ['normal', 'bare', 'whole-original', 'rank-owner-neutral', 'busy-owner-neutral', 'restored']);
  }
  armsComplete = true;
} finally {
  try {
    removeControls(); assert(!fs.existsSync(controlDir), 'No disposable control source survives');
    assert(tracked.equals(git(['ls-files', '-z'])), 'Tracked source membership held');
    for (const [file, sha256] of Object.entries(source)) assert.equal(hash(fs.readFileSync(path.join(ROOT, file))), sha256, 'Tracked bytes held: ' + file);
    assert.equal(hash(fs.readFileSync(path.join(ROOT, testFile))), testHash, 'Frozen original test bytes held');
    assert(status.equals(git(['status', '--porcelain=v1', '--untracked-files=all'])), 'Tracked/untracked status held');
    summary.sourceHeld = true; summary.controlsRemovedBeforeRestored = MODE === 'fixed' && armsComplete;
    summary.fixedUnitQualified = MODE === 'fixed' && armsComplete; if (armsComplete) summary.status = 'passed';
  } finally { save(); }
}
console.log(JSON.stringify({ kind: 'TENNIS_SCORE_RESULT', mode: MODE, evidenceRoot,
  modeEnvAbsent: !Object.hasOwn(process.env, 'TENNIS_SCORE_MODE'), outEnvAbsent: !Object.hasOwn(process.env, 'TENNIS_SCORE_OUT'),
  summarySha256: hash(fs.readFileSync(path.join(OUT, 'summary.json'))), sourceHeld: summary.sourceHeld,
  controlsRemoved: summary.controlsRemovedBeforeRestored, productQualified: false }));
