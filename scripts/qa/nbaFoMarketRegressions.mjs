import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const arg = name => process.argv[process.argv.indexOf(name) + 1];
for (const key of ['--out', '--spec']) assert(process.argv.includes(key), key + ' is required');
const ROOT = process.cwd(), out = path.resolve(arg('--out')), specFile = path.resolve(arg('--spec'));
assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Isolated offline CI only');
assert.equal(process.env.GIT_NO_LAZY_FETCH, '1', 'Native Git cannot fetch historical objects during offline commands');
assert(out !== ROOT && !out.startsWith(ROOT + path.sep), 'Evidence outside source');
assert.equal(process.env.NODE_OPTIONS, '--require=' + path.join(ROOT, 'scripts/lib/offlineTransport.cjs'), 'Existing offline preload only');
const git = (...args) => execFileSync('git', args, { maxBuffer: 32 * 1024 * 1024 });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const blob = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const specBytes = fs.readFileSync(specFile), spec = JSON.parse(specBytes);
assert.equal(spec.schema, 1);
assert.equal(spec.candidate, 'dd7273e4835a8048fc7745e5fe8bdf4de571c9d5');
assert.equal(spec.candidateTree, 'e92145c08b3ce3091077818d4c9802c5b7805ea7');
assert.equal(spec.sourceBase, '9a2d7527686f878397a7d4bff722d605fa5ce3cd');
assert.equal(process.env.NBA_FO_QA_PARENT, spec.candidate);
assert.equal(git('rev-parse', 'HEAD^').toString().trim(), spec.candidate, 'Candidate is the immediate QA parent');
assert.equal(git('rev-parse', 'HEAD^^{tree}').toString().trim(), spec.candidateTree);
assert.equal(git('status', '--porcelain=v1', '--untracked-files=all').toString(), '', 'Initially clean source');
assert.deepEqual(git('diff', '--name-only', 'HEAD^', 'HEAD').toString().trim().split('\n').sort(), [
  '.github/workflows/nba-fo-market-regressions-20261104.yml',
  'scripts/qa/nbaFoMarketRegressions.json', 'scripts/qa/nbaFoMarketRegressions.mjs',
].sort(), 'Temporary QA commit changes only its runner, spec and workflow');
assert.deepEqual(spec.counts, { legacyCases: 198, newNbaCases: 3, totalCases: 201, totalFiles: 16, harnesses: 14 });
assert.equal(spec.legacy198.bytes, 56476);
assert.equal(spec.legacy198.sha256, '85273b629f815f6696c2e4b3bbee2a8ef6fc9cebc98e56d2544f50472f67e9d7');
assert.equal(spec.files.length, 16); assert.equal(spec.harnesses.length, 14); assert.equal(spec.cases.length, 201);
const files = spec.files.map(row => row.path), harnesses = [
  'simFoHub', 'simFoLazyDesk', 'simFoRatingOrder', 'simFrontOfficeRoster', 'simFrontOfficeCuts',
  'simFrontOfficeSaveRecovery', 'simFrontOfficeSchedule', 'simNbaGmDesk', 'simNbaRotation',
  'simNbaRotationUi', 'simNbaRotationReset', 'simNbaRatingEvidence', 'simGmDesk', 'simGmDeskHost',
].map(name => 'scripts/' + name + '.mjs');
assert.deepEqual(spec.harnesses.map(row => row.path), harnesses, 'Exactly the fourteen existing normal harnesses in serial order');
for (const row of [...spec.files, ...spec.harnesses, ...spec.sourcePins]) {
  const bytes = fs.readFileSync(row.path); assert.equal(bytes.length, row.bytes, row.path + ' bytes'); assert.equal(blob(bytes), row.blob, row.path + ' fresh candidate blob');
}
assert.equal(blob(fs.readFileSync('src/components/nba-front-office/NbaFrontOfficeBoard.tsx')), '00e4f0e0b4e9b1972876bb3a99cde40482c6569b');
assert.equal(blob(fs.readFileSync('src/test/nbaFrontOfficeMarketAccess.test.tsx')), '8987f39786d523be495e1bacf3b7731e5c16bc57');
for (const key of spec.forbiddenEnv) assert.equal(process.env[key], undefined, key + ' must remain absent; use held normal seeds, limits, sources and modes');
assert.equal(spec.history.required.length, 1);
const historical = 'cf3679e78076fb6f84a49106481de15d36c22348';
const h = spec.history.required[0]; assert.equal(h.commit, historical);
assert.equal(h.tree, '671db8fb5e53f065766a5ef72fbe6f6682e1550f'); assert.equal(h.count, 1350); assert.equal(h.totalBytes, 21114074); assert.equal(h.files.length, h.count);
assert.equal(git('rev-parse', 'cf3679e7^{commit}').toString().trim(), historical, 'Exact bounded normal Schedule history dependency');
const treeRows = git('ls-tree', '-r', '--long', '--full-tree', historical, 'src').toString().trimEnd().split('\n').map(line => {
  const m = /^[0-7]{6} blob ([a-f0-9]{40})\s+([0-9]+)\t(.+)$/.exec(line); assert(m, 'Exact historical source blob entry'); return { path: m[3], blob: m[1], bytes: Number(m[2]) };
});
assert.deepEqual(treeRows, h.files, 'Exact normal Schedule historical source inventory');
const localChecks = execFileSync('git', ['cat-file', '--batch-check'], { input: h.files.map(row => row.blob).join('\n') + '\n', maxBuffer: 1024 * 1024 }).toString().trimEnd().split('\n');
assert.deepEqual(localChecks, h.files.map(row => row.blob + ' blob ' + row.bytes), 'All historical bodies prehydrated; lazy fetch disabled');
const hydration = JSON.parse(fs.readFileSync(path.join(out, 'history/prehydration.json')));
assert.equal(hydration.status, 'prehydrated-exact-normal-schedule-source'); assert.equal(hydration.commit, historical); assert.equal(hydration.tree, h.tree);
assert.equal(hydration.nativeExit, 0); assert.equal(hydration.count, h.count); assert.equal(hydration.totalBytes, h.totalBytes);
assert.deepEqual(hydration.files.map(({ sha256, ...row }) => row), h.files);
for (const row of hydration.files) assert.match(row.sha256, /^[a-f0-9]{64}$/);
for (const file of ['fetch.log', 'fetch-command.json', 'read.log', 'read-commands.json', 'actual-src-tree.txt', 'requested-src.txt']) assert(fs.existsSync(path.join(out, 'history', file)), 'Retained actual history evidence ' + file);
const fetchReceipt = JSON.parse(fs.readFileSync(path.join(out, 'history/fetch-command.json')));
assert.deepEqual(fetchReceipt, { command: ['git', 'fetch', '--no-tags', '--depth=1', '--filter=blob:none', 'origin', historical], exit: 0 });
const types = JSON.parse(fs.readFileSync(path.join(out, 'types-passed.json')));
assert.deepEqual(types, { command: 'node_modules/.bin/tsc --noEmit -p tsconfig.app.json', exit: 0 }, 'Actual proper application types pass first');
assert(fs.existsSync(path.join(out, 'logs/types.log')));
const emptyReceipt = file => { assert(file && fs.existsSync(file), 'Existing offline receipt'); assert.equal(fs.statSync(file).size, 0, file + ' has zero blocked attempts'); };
emptyReceipt(path.join(out, 'transport/types.log')); emptyReceipt(process.env.SIM_OFFLINE_RECEIPT);
const proof = path.join(out, 'candidate-regressions'); assert(!fs.existsSync(proof), 'Fresh regression evidence'); fs.mkdirSync(proof);
fs.writeFileSync(path.join(proof, 'spec.json'), specBytes, { flag: 'wx' });
const tracked = git('ls-files', '-z').toString().split('\0').filter(Boolean).sort();
const inventory = () => Object.fromEntries(tracked.map(file => [file, sha(fs.readFileSync(file))]));
const before = inventory(); write(path.join(proof, 'source-before.json'), before);
const held = () => {
  assert.deepEqual(inventory(), before, 'Every tracked source and lock byte remains held');
  assert(fs.readFileSync(specFile).equals(specBytes), 'Frozen census spec held');
  assert.equal(git('status', '--porcelain=v1', '--untracked-files=all').toString(), '', 'Clean source after actual command');
  emptyReceipt(process.env.SIM_OFFLINE_RECEIPT);
};
const ANSI = /\u001b\[[0-9;]*m/g;
const noRuntimeOutput = log => assert(!/Unhandled\s+(?:Error|Errors|Rejection|Rejections)|Vitest caught [1-9]|uncaughtException|unhandledRejection|SIM_OFFLINE_BLOCK/i.test(log.replace(ANSI, '')), 'No unhandled runtime or offline errors in actual output');
const ordered = rows => rows.slice().sort((a, b) => { const x = a.file + '\0' + a.name, y = b.file + '\0' + b.name; return x < y ? -1 : x > y ? 1 : 0; });
const expected = ordered(spec.cases.map(row => ({ file: row.file, name: row.name })));
assert.equal(new Set(expected.map(row => row.file + '\0' + row.name)).size, 201);
assert.deepEqual([...new Set(expected.map(row => row.file))].sort(), files.slice().sort());
function validateCensus(result) {
  assert.equal(result.success, true, 'Actual Vitest overall success');
  assert.equal(result.numTotalTests, 201); assert.equal(result.numPassedTests, 201); assert.equal(result.numFailedTests, 0);
  assert.equal(result.numPendingTests, 0); assert.equal(result.numTodoTests, 0);
  assert.equal(result.numFailedTestSuites, 0); assert.equal(result.numPendingTestSuites, 0);
  for (const key of ['numRuntimeErrors', 'numUnhandledErrors']) if (result[key] !== undefined) assert.equal(result[key], 0, key);
  if (result.unhandledErrors !== undefined) assert.deepEqual(result.unhandledErrors, []);
  assert.equal(result.testResults.length, 16);
  const rows = result.testResults.flatMap(file => {
    assert.equal(file.status, 'passed'); assert(!file.message && !file.failureMessage, 'No file-level setup failure');
    return file.assertionResults.map(row => {
      assert.equal(row.status, 'passed'); assert.deepEqual(row.failureMessages, [], 'Every existing business assertion passes');
      return { file: path.relative(ROOT, file.name).split(path.sep).join('/'), name: row.fullName };
    });
  });
  assert.equal(rows.length, 201, 'NBA_FO_REGRESSION_EXACT_CENSUS');
  assert.equal(new Set(rows.map(row => row.file + '\0' + row.name)).size, 201, 'NBA_FO_REGRESSION_EXACT_CENSUS');
  assert.deepEqual(ordered(rows), expected, 'NBA_FO_REGRESSION_EXACT_CENSUS');
  return ordered(rows);
}
const results = [], report = { status: 'incomplete', candidate: spec.candidate, candidateTree: spec.candidateTree, types, units: null, omissionControl: null, harnesses: results, history: spec.history, scope: spec.scope };
function runActual(name, args, folder, timeout, extraEnv = {}) {
  fs.mkdirSync(folder, { recursive: true }); const receipt = path.join(folder, 'transport.log'); fs.writeFileSync(receipt, '', { flag: 'wx' });
  emptyReceipt(receipt); held();
  const command = [process.execPath, ...args], child = spawnSync(command[0], command.slice(1), {
    cwd: ROOT, env: { ...process.env, ...extraEnv, SIM_OFFLINE_RECEIPT: receipt, FORCE_COLOR: '0', NO_COLOR: '1' },
    encoding: 'utf8', timeout, maxBuffer: 64 * 1024 * 1024,
  });
  const log = (child.stdout || '') + '\n' + (child.stderr || ''); fs.writeFileSync(path.join(folder, 'stdout.log'), child.stdout || '', { flag: 'wx' }); fs.writeFileSync(path.join(folder, 'stderr.log'), child.stderr || '', { flag: 'wx' });
  const native = { name, command, exit: child.status, signal: child.signal, error: child.error ? String(child.error) : null };
  write(path.join(folder, 'native-command.json'), native);
  emptyReceipt(receipt); held(); assert(!child.error && child.signal === null, name + ' completes natively'); assert.equal(child.status, 0, name + ' actual native exit'); noRuntimeOutput(log);
  return { native, log };
}
let failure;
try {
  const unitDir = path.join(proof, 'units'), unitJSON = path.join(unitDir, 'vitest.json');
  const unitsRun = runActual('selected201', ['node_modules/vitest/vitest.mjs', 'run', ...files, '--maxWorkers=1', '--no-file-parallelism', '--reporter=default', '--reporter=json', '--outputFile=' + unitJSON], unitDir, 900000);
  const actualBytes = fs.readFileSync(unitJSON), actual = JSON.parse(actualBytes), rows = validateCensus(actual);
  write(path.join(unitDir, 'census.json'), rows);
  report.units = { ...unitsRun.native, files: 16, cases: 201, passed: 201, failed: 0, pending: 0, todo: 0, reportSHA256: sha(actualBytes), exactCensus: true };
  const omitted = structuredClone(actual), atFile = omitted.testResults.findIndex(file => file.assertionResults.length > 0), atCase = 0;
  const removed = omitted.testResults[atFile].assertionResults.splice(atCase, 1)[0];
  assert.equal(actual.testResults[atFile].assertionResults.length - omitted.testResults[atFile].assertionResults.length, 1, 'Copy omits exactly one actual assertion result');
  let rejected; try { validateCensus(omitted); } catch (error) { rejected = error; }
  assert(rejected instanceof assert.AssertionError, 'Actual-result omission reaches the same census validator'); assert.match(rejected.message, /^NBA_FO_REGRESSION_EXACT_CENSUS/);
  const restored = structuredClone(omitted); restored.testResults[atFile].assertionResults.splice(atCase, 0, structuredClone(removed)); assert.deepEqual(restored, actual, 'Copied actual-result whole inverse');
  assert.equal(JSON.stringify(restored), JSON.stringify(actual), 'Copied actual-result complete JSON serialization inverse');
  assert.deepEqual(validateCensus(restored), rows); write(path.join(unitDir, 'omission-control.json'), omitted);
  report.omissionControl = { changed: true, removed: { file: path.relative(ROOT, actual.testResults[atFile].name).split(path.sep).join('/'), name: removed.fullName }, actualSHA256: sha(actualBytes), copySHA256: sha(fs.readFileSync(path.join(unitDir, 'omission-control.json'))), actualValueSHA256: sha(JSON.stringify(actual)), restoredValueSHA256: sha(JSON.stringify(restored)), ownedFailure: { name: rejected.name, message: rejected.message }, wholeInverseExact: true, scope: 'Copied actual Vitest result only. Existing tests, App, runtime measurements and assertions are never replaced or mocked.' };
  write(path.join(unitDir, 'omission-admission.json'), report.omissionControl);
  for (const row of spec.harnesses) {
    const name = path.basename(row.path, '.mjs'), folder = path.join(proof, 'sims', name), result = runActual(name, [row.path], folder, 1200000), clean = result.log.replace(ANSI, '');
    assert(row.normalClosing.length > 0); for (const pattern of row.normalClosing) assert.match(clean, new RegExp(pattern, 'm'), name + ' actual normal closing output');
    results.push({ ...result.native, closingOutput: row.normalClosing, offlineBytes: fs.statSync(path.join(folder, 'transport.log')).size, sourceHeld: true }); write(path.join(folder, 'admission.json'), results.at(-1));
  }
  assert.equal(results.length, 14);
} catch (error) { failure = error; }
finally {
  const after = inventory(); write(path.join(proof, 'source-after.json'), after);
  report.sourceAfter = after; report.sourceBefore = before;
  try { held(); emptyReceipt(path.join(out, 'transport/types.log')); } catch (error) { failure ??= error; }
  report.status = failure ? 'failed' : 'admitted-selected201-and14-normal-harnesses'; report.sourceHeld = JSON.stringify(before) === JSON.stringify(after); report.lockHeld = report.sourceHeld;
  report.failure = failure ? String(failure.stack || failure) : null; write(path.join(proof, 'admission.json'), report);
}
if (failure) throw failure;
console.log('nbaFoMarketRegressions: exact201 existing-plus-frozen-NBA cases passed across16 files; copied actual-result census omission rejected and restored;14 serial existing normal harnesses passed with native0, closing outputs and empty offline receipts; all tracked source and lock bytes held.');
