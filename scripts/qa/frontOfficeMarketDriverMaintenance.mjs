import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const ROOT = process.cwd(), out = path.resolve(process.argv[2] || '');
assert(process.argv.length === 6, 'OUT FILE-PINS HUNKS PRIOR173 are required');
assert(out !== ROOT && !out.startsWith(ROOT + path.sep) && !fs.existsSync(out), 'Fresh evidence outside source');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const blob = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const git = (...args) => execFileSync('git', args, { maxBuffer: 12 * 1024 * 1024 });
const BOARD = 'src/components/front-office/FrontOfficeBoard.tsx', BASE = 'a4d6eaa2cb0d57b8bcbb301fd35f757b60bf0a41';
assert.equal(process.env.SIM_NETWORK, 'offline');
assert(process.env.NODE_OPTIONS?.includes(path.join(ROOT, 'scripts/lib/offlineTransport.cjs')));
assert.equal(git('status', '--porcelain=v1', '--untracked-files=all').toString(), '');
const inputs = process.argv.slice(3).map(file => ({ file, bytes: fs.readFileSync(file) }));
for (const [i, digest] of [
  '6b9ad0095b0d7233208c6ba2612271fc0ee87d8d4c923f2746dcfca7f26943a8',
  '0350b8cd0c4e22a0cc0781b0378cc087913021e4dd648aa3ee373febd43e38ee',
  'bafb6d13ed3edf77dd9979d0f3e442b60ecaed83af561fe588470eae04f05e6e',
].entries()) assert.equal(sha(inputs[i].bytes), digest, 'Exact frozen input ' + i);
const pins = JSON.parse(inputs[0].bytes), hunks = JSON.parse(inputs[1].bytes), prior = JSON.parse(inputs[2].bytes);
const SEASON = 'src/components/front-office-shared/FrontOfficeSeasonClose.test.tsx';
assert.equal(prior.Files.length, 14); assert.equal(prior.Cases.length, 173);
assert.equal(prior.ExpectedPassed, 154); assert.equal(prior.ExpectedFailed, 19);
const files = [...prior.Files, SEASON]; assert.equal(new Set(files).size, 15);
const tests = new Map(files.map(file => [file, fs.readFileSync(file)]));
const originals = new Map(files.map(file => [file, git('show', BASE + ':' + file)]));
const board = fs.readFileSync(BOARD), oldBoard = git('show', BASE + ':' + BOARD);
assert.equal(blob(board), '3cb96db1e53a9211d2dc3dfd3cdb19a6e27b1f76');
assert.equal(blob(oldBoard), '62894f3be7302ebf0ed71dbd7d4cb4ae2cfe2b33');
assert(!board.equals(oldBoard)); assert.equal(hunks.sourceBase, BASE); assert.equal(hunks.files.length, 4); assert.equal(pins.length, 8);
let sites = 0;
for (const file of files) {
  const item = hunks.files.find(row => row.path === file);
  if (!item) { assert(tests.get(file).equals(originals.get(file)), file + ' untouched test'); continue; }
  assert(!tests.get(file).equals(originals.get(file)), file + ' actual omission control changes source');
  for (const kind of ['original', 'successor']) {
    const pin = pins.find(row => row.Path === file && row.Kind === kind), bytes = kind === 'original' ? originals.get(file) : tests.get(file);
    assert(pin); assert.equal(bytes.length, pin.Bytes); assert.equal(sha(bytes), pin.SHA256); assert.equal(blob(bytes), pin.GitBlobSHA1);
  }
  assert.equal(blob(originals.get(file)), item.originalBlob);
  let forward = originals.get(file).toString('utf8'), inverse = tests.get(file).toString('utf8');
  for (const edit of item.edits) {
    assert.equal(forward.split(edit.before).length - 1, edit.count); assert.equal(inverse.split(edit.after).length - 1, edit.count);
    assert.notEqual(edit.before, edit.after); forward = forward.split(edit.before).join(edit.after); inverse = inverse.split(edit.after).join(edit.before); sites += edit.count;
  }
  assert.equal(forward, tests.get(file).toString('utf8')); assert.equal(inverse, originals.get(file).toString('utf8'));
}
assert.equal(sites, 5); assert.equal(blob(originals.get(SEASON)), '22b4c92137b412fec816a104f49d39ff2e59bd8c');
const signature = messages => (messages ?? []).map(message => message.replace(/\u001b\[[0-9;]*m/g, '').split(/\n\s+at\s/)[0].trim());
const sort = rows => rows.sort((a, b) => (a.file + '\0' + a.name).localeCompare(b.file + '\0' + b.name));
const expectedPrior = sort(prior.Cases.map(row => ({ file: row.file, name: row.name, status: row.status, failureSignatures: signature(row.failureMessages) })));
const seasonFailures = [
  'NFL Front Office: the season closes once plays the next season after the draft: the record refuses only the closed one',
  'NFL Front Office, full rosters: the season closes once plays the next season after the draft: the record refuses only the closed one',
].sort();
fs.mkdirSync(out, { recursive: true });
for (let i = 0; i < inputs.length; i++) fs.writeFileSync(path.join(out, ['file-pins.json', 'driver-hunks.json', 'prior173.json'][i]), inputs[i].bytes);
const results = []; let expected198;
function install(source, testSources) { fs.writeFileSync(BOARD, source); for (const [file, bytes] of testSources) fs.writeFileSync(file, bytes); }
function run(name, legacy, source, testSources) {
  const dir = path.join(out, name); fs.mkdirSync(dir); const receipt = path.join(dir, 'transport.log'); fs.writeFileSync(receipt, '');
  const p = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', ...files,
    '--maxWorkers=1', '--no-file-parallelism', '--reporter=default', '--reporter=json', '--outputFile=' + path.join(dir, 'units.json')],
    { env: { ...process.env, SIM_OFFLINE_RECEIPT: receipt }, encoding: 'utf8', timeout: 600000, maxBuffer: 32 * 1024 * 1024 });
  const log = (p.stdout || '') + '\n' + (p.stderr || ''); fs.writeFileSync(path.join(dir, 'units.log'), log);
  fs.writeFileSync(path.join(dir, 'native-exit.json'), JSON.stringify({ status: p.status, signal: p.signal, error: p.error ? String(p.error) : null }) + '\n');
  assert(!p.error && p.signal === null); assert.equal(p.status, legacy ? 1 : 0, name + ' explicit native exit');
  assert.equal(fs.statSync(receipt).size, 0); assert(!/Unhandled\s+(?:Error|Rejection)|Vitest caught [1-9]|uncaughtException|unhandledRejection/i.test(log));
  const units = JSON.parse(fs.readFileSync(path.join(dir, 'units.json'), 'utf8'));
  assert.equal(units.testResults.length, 15); assert.equal(units.numTotalTests, 198);
  assert.equal(units.numPassedTests, legacy ? 177 : 198); assert.equal(units.numFailedTests, legacy ? 21 : 0);
  assert.equal(units.numPendingTests, 0); assert.equal(units.numTodoTests, 0);
  if (typeof units.numRuntimeErrors === 'number') assert.equal(units.numRuntimeErrors, 0);
  const rows = sort(units.testResults.flatMap(file => file.assertionResults.map(row => ({
    file: path.relative(ROOT, file.name).split(path.sep).join('/'), name: row.fullName, status: row.status, failureSignatures: signature(row.failureMessages),
  }))));
  assert.equal(rows.length, 198); assert.equal(new Set(rows.map(row => row.file + '\0' + row.name)).size, 198);
  assert.deepEqual([...new Set(rows.map(row => row.file))].sort(), [...files].sort());
  assert(rows.every(row => ['passed', 'failed'].includes(row.status))); assert(rows.filter(row => row.status === 'passed').every(row => row.failureSignatures.length === 0));
  if (legacy) {
    assert.deepEqual(rows.filter(row => row.file !== SEASON), expectedPrior, 'Entire original prior173 status/assertion parity');
    const season = rows.filter(row => row.file === SEASON); assert.equal(season.length, 25);
    assert.equal(season.filter(row => row.status === 'passed').length, 23);
    assert.deepEqual(season.filter(row => row.status === 'failed').map(row => row.name).sort(), seasonFailures);
    for (const row of season.filter(row => row.status === 'failed')) {
      assert.equal(row.failureSignatures.length, 1);
      assert.equal(row.failureSignatures[0], "AssertionError: expected 'draft' to be 'hub' // Object.is equality");
    }
    assert(rows.filter(row => row.status === 'failed').every(row => row.failureSignatures.every(message => message.startsWith('AssertionError:'))));
    expected198 = rows.map(row => ({ file: row.file, name: row.name }));
    fs.writeFileSync(path.join(out, 'expected198.json'), JSON.stringify({ originalBoard: blob(source), originalDriverPins: hunks.files.map(row => ({ path: row.path, blob: row.originalBlob })), cases: rows }, null, 2) + '\n');
  } else {
    assert(expected198, 'Actual immutable-original census observed first');
    assert.deepEqual(rows.map(row => ({ file: row.file, name: row.name })), expected198, 'Same full198 case census');
    assert(rows.every(row => row.status === 'passed' && row.failureSignatures.length === 0), 'Any downstream assertion remains a failure');
  }
  assert(fs.readFileSync(BOARD).equals(source)); for (const [file, bytes] of testSources) assert(fs.readFileSync(file).equals(bytes), file + ' arm held');
  fs.writeFileSync(path.join(dir, 'outcomes.json'), JSON.stringify(rows, null, 2) + '\n');
  results.push({ name, nativeExit: p.status, passed: units.numPassedTests, failed: units.numFailedTests, cases: 198, files: 15 });
}
try {
  install(oldBoard, originals); run('omitted-drivers-original-app', true, oldBoard, originals);
  install(board, tests); run('corrected-fixed', false, board, tests);
  install(oldBoard, tests); run('corrected-original-app', false, oldBoard, tests);
  install(board, tests); run('corrected-restored', false, board, tests);
} finally { install(board, tests); assert(fs.readFileSync(BOARD).equals(board)); for (const [file, bytes] of tests) assert(fs.readFileSync(file).equals(bytes)); }
for (const input of inputs) assert(fs.readFileSync(input.file).equals(input.bytes));
git('diff', '--exit-code', 'HEAD'); assert.equal(git('status', '--porcelain=v1', '--untracked-files=all').toString(), '');
const admission = { status: 'selected-driver-maintenance-qualified', results, applicationRestored: true, testsRestored: true,
  scope: 'Fifteen selected existing files only. Immutable-original omission control first, then identical198 cases pass on corrected fixed/original/restored arms. Existing assertions, digests, seeds and limits unchanged. No product behavior, build, browser, full-fleet or unrelated historical failure waiver.' };
fs.writeFileSync(path.join(out, 'admission.json'), JSON.stringify(admission, null, 2) + '\n'); console.log(JSON.stringify(admission));
