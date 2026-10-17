// Remote-only original-app proof. The actual hook runs in Vitest with external work stubbed by the frozen test.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BASE = '8293c758f4284d21baaa2320383cfd5cb5bd4944';
const SELF = 'scripts/qa/proveNbaEvaluationResetBaseline.mjs';
const TEST = 'src/test/nbaLineupEvaluationReset.test.tsx';
const WORKFLOW = '.github/workflows/nba-evaluation-reset.yml';
const HOOK = 'src/hooks/useNbaLineup.ts';
const TEST_SHA = '48dcb9348257a902df2083addfeda5b2206065270f70d0032b2528a80ebaed67';
const HOOK_SHA = '23dd0e8ed4f0c2dc609e71dbfce2ec1536a42b4aabd7e82c77985f555aaae85b';
const OUT = process.env.NBA_EVALUATION_OUT;
assert(['1', 'true'].includes(process.env.CI) && process.env.SIM_NETWORK === 'offline', 'Remote CI and offline mode are mandatory');
assert(process.env.NODE_OPTIONS?.includes('scripts/lib/offlineTransport.cjs'), 'The inherited offline preload is mandatory');
assert(OUT && path.isAbsolute(OUT), 'NBA_EVALUATION_OUT must be absolute');
assert(/^[0-9a-f]{64}$/.test(TEST_SHA), 'The frozen test source pin must be finalized');
fs.mkdirSync(path.join(OUT, 'raw'), { recursive: true });
const sha = value => createHash('sha256').update(value).digest('hex');
const read = file => fs.readFileSync(path.join(ROOT, file));
const git = args => execFileSync('git', args, { cwd: ROOT });
const write = (file, value) => fs.writeFileSync(path.join(OUT, file), JSON.stringify(value, null, 2) + '\n');
const tracked = () => Object.fromEntries(git(['ls-files', '-z']).toString().split('\0').filter(Boolean).sort().map(file => [file, sha(read(file))]));
const faults = [
  ['resetSuccess', 'reset keeps a late NBA verdict out and releases evaluation busy', 'Starting over must keep the abandoned NBA five from becoming a result'],
  ['resetJson', 'reset keeps a late NBA JSON verdict out', 'A reset NBA game must ignore the previous held JSON verdict'],
  ['nonOkFallback', 'reset drops a non-ok NBA fallback already being judged', 'A reset NBA game must ignore its abandoned non-ok fallback'],
  ['thrownFallback', 'reset drops a thrown NBA fallback already being judged', 'A reset NBA game must ignore its abandoned network fallback'],
  ['rejectedFallback', 'an abandoned NBA fallback rejection cannot set a new-game error', 'An abandoned NBA judge rejection must not set the new game error'],
  ['replacement', 'an old NBA evaluation cannot clear or overwrite the next game', 'An abandoned NBA evaluation must leave the next game busy and verdict alone'],
  ['unmount', 'unmount ignores a late NBA request error without judging it', 'An unmounted NBA game must not start the offline judge after its request fails'],
];
const preserves = [
  ['remote', 'ordinary NBA remote success posts the chosen five and records once'],
  ['nonOk', 'ordinary NBA non-ok replies still finish with the offline judge'],
  ['thrown', 'ordinary NBA thrown requests still finish with the offline judge'],
  ['malformed', 'ordinary malformed NBA replies still finish with the offline judge'],
  ['nestedError', 'ordinary NBA local failures keep the existing retry error'],
];
const expected = [...faults, ...preserves];
const related = [
  ['src/test/playerSearchIdentity.test.ts', 29],
  ['src/test/playerSearchLocal.test.ts', 8],
  ['src/hooks/useGameCompletion.test.ts', 4],
];
const setupError = /Unhandled Errors|Unhandled Rejection|Uncaught Exception|Failed to load|Cannot find module|No test files found|SIM_OFFLINE_BLOCK/i;
const resultPath = path.join(OUT, 'baseline-classification.json');
assert(!fs.existsSync(resultPath), 'Refuse prior proof report overwrite');
const report = { status: 'running', ready: false, base: BASE, head: git(['rev-parse', 'HEAD']).toString().trim(), test: TEST, testSha256: TEST_SHA, hookSha256: HOOK_SHA, completed: 0 };
write('baseline-classification.json', report);
let before;
function child(label, files, raw) {
  const args = [path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', ...files, '--maxWorkers=1', '--minWorkers=1', '--reporter=default', '--reporter=json', '--outputFile=' + path.join(OUT, label + '.vitest.json')];
  const env = { ...process.env, SIM_OFFLINE_RECEIPT: path.join(OUT, label + '.transport') };
  if (raw) env.NBA_EVALUATION_RAW = path.join(OUT, 'raw/observations.json');
  const result = spawnSync(process.execPath, args, { cwd: ROOT, env, encoding: 'utf8', timeout: 300_000, maxBuffer: 64 * 1024 * 1024 });
  fs.writeFileSync(path.join(OUT, label + '.stdout.log'), result.stdout ?? '');
  fs.writeFileSync(path.join(OUT, label + '.stderr.log'), result.stderr ?? '');
  write(label + '.exit.json', { args, exitCode: result.status, signal: result.signal, error: result.error ? { name: result.error.name, message: result.error.message, code: result.error.code } : null });
  assert(!result.error && !result.signal && result.status !== null, label + ' must actually complete');
  const log = (result.stdout ?? '') + '\n' + (result.stderr ?? '');
  assert(!setupError.test(log), label + ' has no setup, transport or unhandled error');
  assert(!fs.existsSync(env.SIM_OFFLINE_RECEIPT) || fs.statSync(env.SIM_OFFLINE_RECEIPT).size === 0, label + ' has no ordinary transport denials');
  return { exit: result.status, result: JSON.parse(fs.readFileSync(path.join(OUT, label + '.vitest.json'), 'utf8')) };
}
function rowsOf(result) { return result.testResults.flatMap(suite => suite.assertionResults); }
function checkFaults(result) {
  const rows = rowsOf(result), failed = rows.filter(row => row.status === 'failed');
  assert.equal(result.success, false); assert.equal(result.testResults.length, 1);
  assert(result.testResults[0].name.replaceAll('\\', '/').endsWith('/' + TEST));
  assert.equal(result.numTotalTests, 12); assert.equal(result.numFailedTests, 7); assert.equal(result.numPassedTests, 5);
  assert.equal(result.numPendingTests, 0); assert.equal(result.numTodoTests, 0); assert.equal(rows.length, 12);
  assert.deepEqual(failed.map(row => row.title), faults.map(row => row[1]));
  assert.deepEqual(rows.filter(row => row.status === 'passed').map(row => row.title), preserves.map(row => row[1]));
  failed.forEach((row, index) => {
    assert(row.failureMessages.length > 0);
    for (const message of row.failureMessages) {
      const text = message.replace(/\x1b\[[0-9;]*m/g, '');
      assert(text.includes('AssertionError') && text.includes(faults[index][2]) && text.includes('expected false to be true'), 'Exact owned Boolean cause: ' + row.title);
    }
  });
}
function checkRaw(raw) {
  assert.equal(raw.version, 1); assert.deepEqual(raw.caseTitles, expected.map(row => row[1]));
  assert.deepEqual(Object.keys(raw.cases), expected.map(row => row[0]));
  for (const [key, title] of expected) {
    const row = raw.cases[key]; assert.equal(row.title, title);
    assert(Array.isArray(row.deferred) && row.deferred.length > 0 && row.deferred.every(gate => typeof gate.label === 'string' && gate.settled === true), 'Every declared promise settled: ' + key);
    assert.deepEqual(row.unexpected, [], 'No undeclared fixture action: ' + key);
    assert(Array.isArray(row.requests) && row.requests.length > 0, 'Actual public hook requests retained: ' + key);
    assert(row.moments && Object.keys(row.moments).length > 0, 'Actual state observations retained: ' + key);
  }
}
try {
  git(['merge-base', '--is-ancestor', BASE, 'HEAD']);
  git(['diff', '--exit-code', BASE, 'HEAD', '--', '.', ':!docs', ':!' + TEST, ':!' + SELF, ':!' + WORKFLOW]);
  git(['diff', '--exit-code', 'HEAD', '--', '.']);
  const original = git(['show', BASE + ':' + HOOK]);
  assert.equal(sha(original), HOOK_SHA); assert.deepEqual(read(HOOK), original, 'Original production hook is whole base829');
  assert.equal(sha(read(TEST)), TEST_SHA);
  fs.writeFileSync(path.join(OUT, 'original-hook.ts'), original); fs.writeFileSync(path.join(OUT, 'frozen-test.tsx'), read(TEST));
  before = tracked(); write('proof-source-before.json', before);
  const inventory = JSON.parse(fs.readFileSync(path.join(OUT, 'dependencies-before.json'), 'utf8'));
  const lock = JSON.parse(read('package-lock.json'));
  assert.equal(inventory.packages.length, 521);
  for (const item of inventory.packages) assert.equal(item.version, lock.packages[item.directory]?.version, 'Actual installed version matches lock: ' + item.directory);
  for (const item of inventory.packageFiles) assert.equal(sha(read(item.file)), item.sha256, 'Package source bytes held');
  const old = child('related', related.map(row => row[0])); assert.equal(old.exit, 0); assert.equal(old.result.success, true);
  assert.equal(old.result.testResults.length, 3); assert.equal(old.result.numTotalTests, 41); assert.equal(old.result.numPassedTests, 41);
  assert.equal(old.result.numFailedTests, 0); assert.equal(old.result.numPendingTests, 0); assert.equal(old.result.numTodoTests, 0);
  for (const [file, count] of related) {
    const suites = old.result.testResults.filter(suite => suite.name.replaceAll('\\', '/').endsWith('/' + file));
    assert.equal(suites.length, 1); assert.equal(suites[0].assertionResults.length, count); assert(suites[0].assertionResults.every(row => row.status === 'passed'));
  }
  const owned = child('baseline', [TEST], true); assert.equal(owned.exit, 1); checkFaults(owned.result);
  const rawBytes = fs.readFileSync(path.join(OUT, 'raw/observations.json')), raw = JSON.parse(rawBytes); checkRaw(raw);
  const controls = [];
  for (const name of ['wrong-cause', 'unsettled-gate', 'unexpected-work', 'wrong-title']) {
    const changedResult = structuredClone(owned.result), changedRaw = structuredClone(raw);
    if (name === 'wrong-cause') rowsOf(changedResult).find(row => row.status === 'failed').failureMessages = ['AssertionError: unrelated fixture: expected false to be true'];
    if (name === 'unsettled-gate') changedRaw.cases.resetSuccess.deferred[0].settled = false;
    if (name === 'unexpected-work') changedRaw.cases.resetSuccess.unexpected.push('changed-receipt-only');
    if (name === 'wrong-title') changedRaw.cases.resetSuccess.title = 'changed-receipt-only';
    const changedSha256 = sha(JSON.stringify({ result: changedResult, raw: changedRaw }));
    assert.notEqual(changedSha256, sha(JSON.stringify({ result: owned.result, raw })));
    assert.throws(() => { checkFaults(changedResult); checkRaw(changedRaw); }, assert.AssertionError);
    controls.push({ name, changedSha256, rejected: true });
  }
  Object.assign(report, { status: 'qualified-original-counterexamples', completed: 12, preciseFaults: faults, preserves, relatedPassed: 41, raw: { file: 'raw/observations.json', bytes: rawBytes.length, sha256: sha(rawBytes) }, receiptControls: controls, limits: 'Original base829 hook with twelve actual-hook cases and forty-one related offline cases. No new production guard, build, dist, browser, live DB, full suite, joined I or publication claim.' });
} catch (error) { Object.assign(report, { status: 'failed', error: { name: error.name, message: error.message } }); throw error; }
finally {
  try { const after = tracked(); write('proof-source-after.json', after); if (before) assert.deepEqual(after, before, 'Every tracked source body held'); }
  catch (error) { Object.assign(report, { status: 'failed', sourceHoldError: error.message }); throw error; }
  finally { write('baseline-classification.json', report); }
}
console.log('PASS exact seven NBA ownership faults, five preserves, twelve settled observations, forty-one related cases and four changed receipt rejection controls.');
