/* Fixed/original/restored proof over the frozen saved-deals component regression. */
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert(process.env.CI === '1' && process.env.SIM_NETWORK === 'offline', 'Remote offline CI required');
assert((process.env.NODE_OPTIONS || '').includes('offlineTransport.cjs'), 'Actual children retain the offline preload');
assert(process.env.MSDL_OUT && path.isAbsolute(process.env.MSDL_OUT), 'Absolute MSDL_OUT required');
assert(/^[a-f0-9]{64}$/.test(process.env.MSDL_BASELINE_RAW_SHA256 || ''), 'Actual qualified baseline raw SHA256 required');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BASELINE = '5eb5e035832d81a84c2dc02727fdd096de44952d', SOURCE_BASE = '6465d9aeac1bc10f37d08fcb1a41b7521a886a1a';
const TEST = 'src/test/managerSavedDealsPaging.test.tsx', COMPONENT = 'src/components/club-manager/TransferScreen.tsx';
const BASE_HELPER = 'scripts/qa/proveManagerSavedDealsPaging.mjs', SELF = 'scripts/qa/proveManagerSavedDealsPagingFixed.mjs';
const BROWSER = 'scripts/qa/playManagerSavedDealsPaging.mjs';
const TEST_SHA = 'f8f4538bf3220a9189c13455fa54c6dd06bc32db028aa010a8463725b50f44b4';
const BASE_HELPER_SHA = '9f46bc36c8762f117c312992bd6951306237ef93c0f41c190c4050d3d063b14b';
const FAULTS = {
  'all retained own deals are reachable in newest-first pages': 'The next page must expose retained own deals beyond fifty',
  'fee pages sort the complete retained list and reset safely': 'The next fee page must expose the remaining retained deals',
};
const PRESERVES = ['all clubs keeps the existing first fifty newest saved deals', 'small own histories keep counterparties loan flags and saved gross fees', 'empty single and fifty-row histories keep their boundary states', 'browsing keeps career ledger feedback callbacks and random stream unchanged'];
const RAW_KEYS = ['ownPages', 'feePages', 'allFirstFifty', 'smallOwn', 'boundaries', 'readOnly'];
const RAW_TITLES = Object.fromEntries(RAW_KEYS.map((key, index) => [key, [...Object.keys(FAULTS), ...PRESERVES][index]]));
const SETUP = /Unhandled Errors?|Unhandled Rejection|Uncaught Exception|TypeError:|ReferenceError:|SyntaxError:|Failed to (?:load|resolve import)|Cannot find module|ERR_MODULE_NOT_FOUND|SIM_OFFLINE_BLOCK/i;
const OUT = path.join(process.env.MSDL_OUT, 'fixed-proof');
assert(!fs.existsSync(OUT), 'Never overwrite retained proof evidence'); fs.mkdirSync(OUT, { recursive: true });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(path.join(ROOT, file));
const write = (file, value) => fs.writeFileSync(path.join(OUT, file), JSON.stringify(value, null, 2) + '\n');
function git(args) {
  const child = spawnSync('git', args, { cwd: ROOT, timeout: 30000, maxBuffer: 32 * 1024 * 1024 });
  assert(!child.error && !child.signal && child.status === 0, 'Actual Git operation: ' + args.join(' ')); return child.stdout;
}
const HEAD = git(['rev-parse', 'HEAD']).toString().trim();
const tracked = () => Object.fromEntries(git(['ls-files', '-z']).toString().split('\0').filter(Boolean).sort().map(file => [file, sha(read(file))]));
const before = tracked(), fixedBytes = read(COMPONENT); write('tracked.before.json', before);
const report = { head: HEAD, baseline: BASELINE, originalSource: SOURCE_BASE, baselineRawSha256: process.env.MSDL_BASELINE_RAW_SHA256,
  status: 'running', qualified: false, sourceHeld: false, runs: [],
  limits: ['Prepared fictional saved rows, not natural transfer frequency or recovered lost history.',
    'This component proof does not build, drive a browser or establish live publication.',
    'Raw JSON does not independently preserve undefined fields or JavaScript reference identity.'] };
const checkpoint = () => write('report.json', report);
function receipt(file) { const bytes = fs.readFileSync(file); return { file: path.relative(OUT, file).replaceAll('\\', '/'), bytes: bytes.length, sha256: sha(bytes) }; }
function run(name) {
  const directory = path.join(OUT, name); fs.mkdirSync(directory);
  const unitFile = path.join(directory, 'units.json'), rawFile = path.join(directory, 'raw.json'), transport = path.join(directory, 'ordinary.transport');
  const child = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', TEST, '--maxWorkers=1', '--minWorkers=1',
    '--reporter=verbose', '--reporter=json', '--outputFile.json=' + unitFile], { cwd: ROOT,
    env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1', MSDL_RAW: rawFile, SIM_OFFLINE_RECEIPT: transport },
    encoding: 'utf8', timeout: 600000, maxBuffer: 64 * 1024 * 1024 });
  fs.writeFileSync(path.join(directory, 'stdout.log'), child.stdout || ''); fs.writeFileSync(path.join(directory, 'stderr.log'), child.stderr || '');
  const row = { name, exit: child.status, signal: child.signal, error: child.error?.message || null, qualified: false,
    componentSha256: sha(read(COMPONENT)), stdout: receipt(path.join(directory, 'stdout.log')), stderr: receipt(path.join(directory, 'stderr.log')) };
  report.runs.push(row); if (fs.existsSync(unitFile)) row.units = receipt(unitFile); if (fs.existsSync(rawFile)) row.raw = receipt(rawFile); checkpoint();
  process.stdout.write(child.stdout || ''); process.stderr.write(child.stderr || '');
  assert(!child.error && !child.signal && child.status !== null && fs.existsSync(unitFile) && fs.existsSync(rawFile), 'Completed child and both actual reports: ' + name);
  assert(!SETUP.test((child.stdout || '') + (child.stderr || '')), 'Setup and transport faults never qualify: ' + name);
  assert(!fs.existsSync(transport) || fs.readFileSync(transport).length === 0, 'No blocked ordinary external attempt: ' + name);
  const units = JSON.parse(fs.readFileSync(unitFile)), rawBytes = fs.readFileSync(rawFile), raw = JSON.parse(rawBytes);
  assert.equal(units.testResults.length, 1); const suite = units.testResults[0];
  assert(suite.name.replaceAll('\\', '/').endsWith('/' + TEST) && !suite.message, 'Only the exact frozen file loads without setup faults');
  assert.equal(units.numTotalTests, 6); assert.equal(units.numPendingTests, 0); assert.equal(units.numTodoTests, 0); assert.equal(suite.assertionResults.length, 6);
  assert.deepEqual(suite.assertionResults.map(item => item.title).sort(), [...Object.keys(FAULTS), ...PRESERVES].sort());
  const original = name === 'original';
  assert.equal(child.status, original ? 1 : 0); assert.equal(units.success, !original); assert.equal(suite.status, original ? 'failed' : 'passed');
  assert.equal(units.numFailedTests, original ? 2 : 0); assert.equal(units.numPassedTests, original ? 4 : 6);
  for (const item of suite.assertionResults) {
    const cause = original ? FAULTS[item.title] : null; assert.equal(item.status, cause ? 'failed' : 'passed');
    if (!cause) { assert.deepEqual(item.failureMessages, []); continue; }
    assert.equal(item.failureMessages.length, 1); const failure = item.failureMessages[0];
    assert(failure.startsWith('AssertionError: ' + cause) && failure.includes('expected false to be true') && failure.includes('Object.is equality'), 'Only the exact missing-Next Boolean cause qualifies');
  }
  assert.equal(raw.version, 1); assert.deepEqual(raw.caseTitles, RAW_TITLES); assert.deepEqual(Object.keys(raw.cases).sort(), [...RAW_KEYS].sort());
  for (const key of RAW_KEYS) assert(raw.cases[key] && typeof raw.cases[key] === 'object', 'Complete physical raw case: ' + key);
  for (const key of ['ownPages', 'feePages']) {
    const evidence = raw.cases[key]; assert.deepEqual(evidence.fixture, { retained: 80, own: 61, noise: 19 });
    assert.equal(evidence.initial.names.length, 50); assert.equal(evidence.initial.next.present, !original);
    assert.equal(evidence.careerAfter, evidence.careerBefore); assert.deepEqual(evidence.actionCalls, []); assert.deepEqual(evidence.draws, []);
    assert.equal(evidence.pages.length, original ? 0 : 3, 'Actual pager journeys complete in each fixed arm');
  }
  assert.equal(raw.cases.readOnly.careerAfter, raw.cases.readOnly.careerBefore);
  assert.deepEqual(raw.cases.readOnly.actionCalls, []); assert.equal(raw.cases.readOnly.clearCalls, 1); assert.deepEqual(raw.cases.readOnly.draws, []);
  row.completed = 6; row.failed = original ? 2 : 0; row.passed = original ? 4 : 6; row.rawCases = RAW_KEYS; row.qualified = true; checkpoint();
  return { raw, rawBytes, row };
}
checkpoint();
try {
  assert.equal(git(['status', '--porcelain', '--untracked-files=no']).toString(), '', 'Committed fixed source begins clean');
  git(['merge-base', '--is-ancestor', SOURCE_BASE, BASELINE]); git(['merge-base', '--is-ancestor', BASELINE, HEAD]);
  git(['diff', '--exit-code', BASELINE, HEAD, '--', 'src', 'scripts', 'public', 'package.json', 'package-lock.json', 'bun.lock', 'bun.lockb',
    ':!' + COMPONENT, ':!' + TEST, ':!' + BASE_HELPER, ':!' + SELF, ':!' + BROWSER]);
  for (const [file, expected] of [[TEST, TEST_SHA], [BASE_HELPER, BASE_HELPER_SHA]]) {
    assert.equal(sha(read(file)), expected, 'Qualified baseline leaf remains frozen: ' + file);
    assert.deepEqual(read(file), git(['show', BASELINE + ':' + file]), 'Actual qualified baseline bytes: ' + file);
  }
  assert.deepEqual(read(SELF), git(['show', HEAD + ':' + SELF]), 'Actual fixed helper is committed at HEAD');
  assert.deepEqual(fixedBytes, git(['show', HEAD + ':' + COMPONENT]), 'The actual starting component is the fixed committed source');
  const originalBytes = git(['show', SOURCE_BASE + ':' + COMPONENT]);
  assert.deepEqual(originalBytes, git(['show', BASELINE + ':' + COMPONENT]), 'Original source retains the qualified284 and296 composition');
  assert(!fixedBytes.equals(originalBytes), 'Actual product patch must change the component');
  fs.writeFileSync(path.join(OUT, 'TransferScreen.fixed.tsx'), fixedBytes); fs.writeFileSync(path.join(OUT, 'TransferScreen.original.tsx'), originalBytes);
  const patch = git(['diff', '--binary', '--no-ext-diff', '--src-prefix=a/', '--dst-prefix=b/', SOURCE_BASE, HEAD, '--', COMPONENT]);
  assert(patch.toString().startsWith(`diff --git a/${COMPONENT} b/${COMPONENT}\n`) && (patch.toString().match(/^diff --git /gm) || []).length === 1, 'The actual inverse contains only the one owned component');
  const patchFile = path.join(OUT, 'pager-product.patch'); fs.writeFileSync(patchFile, patch);
  report.bindings = { component: COMPONENT, fixedSha256: sha(fixedBytes), originalSha256: sha(originalBytes), patch: receipt(patchFile),
    testSha256: TEST_SHA, baselineHelperSha256: BASE_HELPER_SHA, helperSha256: sha(read(SELF)) }; checkpoint();
  const normal = run('normal');
  git(['apply', '--reverse', '--check', patchFile]); git(['apply', '--reverse', patchFile]);
  assert.deepEqual(read(COMPONENT), originalBytes, 'Only the pager diff is reversed to the actual composed6465 source');
  const original = run('original');
  assert.equal(sha(original.rawBytes), process.env.MSDL_BASELINE_RAW_SHA256, 'Original full raw bytes equal the actual qualified baseline artifact');
  for (const key of RAW_KEYS.slice(2)) assert.deepEqual(normal.raw.cases[key], original.raw.cases[key], 'Entire preservation case unchanged across the actual inverse: ' + key);
  fs.writeFileSync(path.join(ROOT, COMPONENT), fixedBytes);
  const restored = run('restored'); assert.deepEqual(restored.rawBytes, normal.rawBytes, 'Restored complete raw bytes equal normal');
  report.pairing = { originalEqualsActualBaseline: true, preservedCases: RAW_KEYS.slice(2), restoredEqualsNormalBytes: true }; checkpoint();
} catch (error) { report.error = error?.stack || String(error); checkpoint(); throw error; }
finally {
  fs.writeFileSync(path.join(ROOT, COMPONENT), fixedBytes);
  const after = tracked(); write('tracked.after.json', after); report.sourceHeld = JSON.stringify(after) === JSON.stringify(before); checkpoint();
  assert.deepEqual(after, before, 'Exact fixed component and all other tracked source restored even after failure');
}
assert(report.runs.length === 3 && report.runs.every(row => row.qualified) && report.pairing?.restoredEqualsNormalBytes && report.sourceHeld);
report.status = 'complete'; report.qualified = true; checkpoint(); write('summary.json', report);
console.log('Saved deals paging fixed:6 normal,2 precise original faults plus4 preserves,6 restored;original baseline raw exact;restored raw exact;source held.');
