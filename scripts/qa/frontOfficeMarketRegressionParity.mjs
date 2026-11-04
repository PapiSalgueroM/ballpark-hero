import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const ROOT = process.cwd(), out = path.resolve(process.argv[2] || ''), manifest = path.resolve(process.argv[3] || '');
const BOARD = 'src/components/front-office/FrontOfficeBoard.tsx', BASE = 'a4d6eaa2cb0d57b8bcbb301fd35f757b60bf0a41';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const blob = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const git = (...args) => execFileSync('git', args, { maxBuffer: 8 * 1024 * 1024 });
assert(process.argv[2] && process.argv[3] && out !== ROOT && !out.startsWith(ROOT + path.sep), 'Explicit fresh evidence outside source');
assert(!fs.existsSync(out)); assert.equal(process.env.SIM_NETWORK, 'offline');
assert(process.env.NODE_OPTIONS?.includes(path.join(ROOT, 'scripts/lib/offlineTransport.cjs')), 'Offline preload held');
assert.equal(git('status', '--porcelain=v1', '--untracked-files=all').toString(), '');
const manifestBytes = fs.readFileSync(manifest);
assert.equal(sha(manifestBytes), 'bafb6d13ed3edf77dd9979d0f3e442b60ecaed83af561fe588470eae04f05e6e', 'Frozen actual failure manifest');
const spec = JSON.parse(manifestBytes);
assert.equal(spec.Files.length, 14); assert.equal(new Set(spec.Files).size, 14);
assert.equal(spec.Cases.length, 173); assert.equal(spec.ExpectedPassed, 154); assert.equal(spec.ExpectedFailed, 19);
const failedFiles = {
  'src/components/front-office/FrontOfficeOnePress.test.tsx': 8,
  'src/components/front-office/FrontOfficeTagDepth.test.tsx': 2,
  'src/components/front-office-shared/FrontOfficeGmCareer.test.tsx': 9,
};
const signature = messages => (messages ?? []).map(message => message.replace(/\u001b\[[0-9;]*m/g, '').split(/\n\s+at\s/)[0].trim());
const order = rows => rows.sort((a, b) => (a.file + '\0' + a.name).localeCompare(b.file + '\0' + b.name));
function validate(rows, label) {
  assert.equal(rows.length, 173); assert.equal(new Set(rows.map(row => row.file + '\0' + row.name)).size, 173);
  assert.deepEqual([...new Set(rows.map(row => row.file))].sort(), [...spec.Files].sort());
  assert.equal(rows.filter(row => row.status === 'passed').length, 154, label + ' passing census');
  const failures = rows.filter(row => row.status === 'failed'); assert.equal(failures.length, 19);
  assert.deepEqual(Object.fromEntries(Object.keys(failedFiles).map(file => [file, failures.filter(row => row.file === file).length])), failedFiles);
  for (const row of rows) {
    assert(['passed', 'failed'].includes(row.status), label + ' no skipped credit');
    if (row.status === 'passed') { assert.deepEqual(row.failureSignatures, []); continue; }
    assert(Object.hasOwn(failedFiles, row.file), label + ' exact known failure membership');
    assert.equal(row.failureSignatures.length, 1); const message = row.failureSignatures[0];
    assert(message.startsWith('AssertionError:'), label + ' assertion failure only');
    assert(!/TypeError|ReferenceError|SyntaxError|Cannot find module/.test(message));
    if (row.file.includes('TagDepth')) assert(/^AssertionError: pick 2: no button for .+: expected undefined to be truthy$/.test(message), label + ' known pick-two refusal');
    else assert(message.includes("'draft'") && message.includes("'hub'"), label + ' known draft/hub assertion');
  }
}
const expected = order(spec.Cases.map(row => ({ file: row.file, name: row.name, status: row.status, failureSignatures: signature(row.failureMessages) })));
validate(expected, 'frozen manifest');
const saved = fs.readFileSync(BOARD), original = git('show', BASE + ':' + BOARD);
assert.equal(blob(saved), '3cb96db1e53a9211d2dc3dfd3cdb19a6e27b1f76');
assert.equal(blob(original), '62894f3be7302ebf0ed71dbd7d4cb4ae2cfe2b33'); assert(!saved.equals(original));
const testBytes = new Map(spec.Files.map(file => [file, fs.readFileSync(file)]));
fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, 'expected.json'), manifestBytes);
const results = [];
function run(name, source) {
  assert(fs.readFileSync(BOARD).equals(source), name + ' exact application arm');
  const dir = path.join(out, name); fs.mkdirSync(dir);
  const receipt = path.join(dir, 'transport.log'); fs.writeFileSync(receipt, '');
  const p = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', ...spec.Files,
    '--maxWorkers=1', '--no-file-parallelism', '--reporter=default', '--reporter=json', '--outputFile=' + path.join(dir, 'units.json')],
    { env: { ...process.env, SIM_OFFLINE_RECEIPT: receipt }, encoding: 'utf8', timeout: 600000, maxBuffer: 24 * 1024 * 1024 });
  const log = (p.stdout || '') + '\n' + (p.stderr || ''); fs.writeFileSync(path.join(dir, 'units.log'), log);
  fs.writeFileSync(path.join(dir, 'native-exit.json'), JSON.stringify({ status: p.status, signal: p.signal, error: p.error ? String(p.error) : null }) + '\n');
  assert(!p.error && p.signal === null, name + ' completed'); assert.equal(p.status, 1, name + ' suite remains failing');
  assert.equal(fs.statSync(receipt).size, 0); assert(!/Unhandled\s+(?:Error|Rejection)|Vitest caught [1-9]|uncaughtException|unhandledRejection/i.test(log));
  const units = JSON.parse(fs.readFileSync(path.join(dir, 'units.json'), 'utf8'));
  assert.equal(units.testResults.length, 14); assert.equal(units.numTotalTests, 173);
  assert.equal(units.numPassedTests, 154); assert.equal(units.numFailedTests, 19);
  assert.equal(units.numPendingTests, 0); assert.equal(units.numTodoTests, 0);
  if (typeof units.numRuntimeErrors === 'number') assert.equal(units.numRuntimeErrors, 0);
  const rows = order(units.testResults.flatMap(file => file.assertionResults.map(row => ({
    file: path.relative(ROOT, file.name).split(path.sep).join('/'), name: row.fullName,
    status: row.status, failureSignatures: signature(row.failureMessages),
  }))));
  validate(rows, name); assert.deepEqual(rows, expected, name + ' entire census/status/assertion-content parity');
  fs.writeFileSync(path.join(dir, 'outcomes.json'), JSON.stringify(rows, null, 2) + '\n');
  assert(fs.readFileSync(BOARD).equals(source)); for (const [file, bytes] of testBytes) assert(fs.readFileSync(file).equals(bytes), file + ' unchanged');
  results.push({ name, nativeExit: 1, passed: 154, unresolvedFailures: 19, files: 14 });
}
try {
  run('fixed', saved); fs.writeFileSync(BOARD, original); run('whole-original', original);
  fs.writeFileSync(BOARD, saved); run('restored', saved);
} finally { fs.writeFileSync(BOARD, saved); assert(fs.readFileSync(BOARD).equals(saved), 'Full fixed board restored'); }
for (const [file, bytes] of testBytes) assert(fs.readFileSync(file).equals(bytes), file + ' held');
assert(fs.readFileSync(manifest).equals(manifestBytes)); git('diff', '--exit-code', 'HEAD');
assert.equal(git('status', '--porcelain=v1', '--untracked-files=all').toString(), '');
const admission = { status: 'parity-established-with-unresolved-failures', results, expectedManifestSHA256: sha(manifestBytes),
  applicationRestored: true, testsHeld: true, scope: 'Fourteen selected existing files only. All three actual arms retain 154 passes and the same 19 assertion failures. Those failures remain unresolved and unwaived. No green-suite, full-fleet, build, browser or release claim.' };
fs.writeFileSync(path.join(out, 'admission.json'), JSON.stringify(admission, null, 2) + '\n'); console.log(JSON.stringify(admission));
