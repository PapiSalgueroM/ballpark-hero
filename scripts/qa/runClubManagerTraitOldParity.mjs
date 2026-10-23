import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const root = fs.realpathSync(process.cwd());
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const blob = value => crypto.createHash('sha1').update(Buffer.from('blob ' + value.length + '\0')).update(value).digest('hex');
const originalPath = process.env.CM_STYLE_ORIGINAL_SOURCE;
const requestedOut = process.env.CM_STYLE_PARITY_OUT;
assert(originalPath && path.isAbsolute(originalPath), 'CM_STYLE_ORIGINAL_SOURCE_REQUIRED');
assert(requestedOut && path.isAbsolute(requestedOut), 'CM_STYLE_PARITY_OUT_REQUIRED');
assert(process.env.RUNNER_TEMP, 'CM_STYLE_RUNNER_TEMP_REQUIRED');
const parent = fs.realpathSync(path.dirname(requestedOut));
const temp = fs.realpathSync(process.env.RUNNER_TEMP);
assert(parent === temp || parent.startsWith(temp + path.sep), 'CM_STYLE_FRESH_OUTPUT_IN_RUNNER_TEMP');
const out = path.join(parent, path.basename(requestedOut));
assert(!fs.existsSync(out), 'CM_STYLE_OUTPUT_MUST_BE_FRESH');
for (const key of ['US_BOARD_CONTROL_ALIAS', 'US_BOARD_CONTROL_FILE', 'NO_DOUBLE_SWAP', 'CM_STYLE_PARITY_SNAPSHOT'])
  assert(!process.env[key], 'CM_STYLE_ALIAS_ENV_MUST_BE_CLEAN:' + key);
fs.mkdirSync(out);
const testFile = 'src/test/clubManagerTraitOldParity.test.ts';
const inputs = [
  ['src/lib/clubManager.ts', 1242762, 'abae93ec4a9db43242098c5a233164288e0b733b9f09f657c672f7ba1bae21c5'],
  [testFile, 6098, '384242306f55ceeaff77e9003f0b0c40829c82584e2378eb0b81a56376aa2d24'],
];
for (const [file, bytes, sha] of inputs) {
  const body = fs.readFileSync(path.join(root, file));
  assert.equal(body.length, bytes, 'CM_STYLE_INPUT_BYTES:' + file);
  assert.equal(hash(body), sha, 'CM_STYLE_INPUT_HASH:' + file);
}
const config = fs.readFileSync(path.join(root, 'vitest.config.ts'));
assert.equal(blob(config), 'ed2a9dc677f77dfe95c061064eeff5782b856864', 'CM_STYLE_ACTUAL_CONFIG_HELD');
const transportFile = path.join(root, 'scripts/lib/offlineTransport.cjs');
const transportBody = fs.readFileSync(transportFile);
assert.equal(blob(transportBody), '0fda542a2649fe5da937c6976fd0f5b6073e74b6', 'CM_STYLE_ACTUAL_TRANSPORT_HELD');
const original = fs.readFileSync(originalPath);
assert.equal(original.length, 1240569, 'CM_STYLE_FROZEN_ORIGINAL_BYTES');
assert.equal(hash(original), '05de3cfca8d978e6117979fb29b82b2ece7b9fb6ee1f2ce3c051e379e36de86e', 'CM_STYLE_FROZEN_ORIGINAL_HASH');
assert.equal(blob(original), 'a505743537b383bc7885bb81f5a72c11e154b566', 'CM_STYLE_FROZEN_ORIGINAL_GIT_BLOB');
const before = new Map([...inputs.map(([file]) => [path.join(root, file), fs.readFileSync(path.join(root, file))]),
  [path.join(root, 'vitest.config.ts'), config], [transportFile, transportBody], [originalPath, original]]);
const expected = [
  'records six actual no-style charged weeks with complete states and all draw values',
  'records an actual no-style kickoff, second half and settled match without field stripping',
  'records an old unmarked live save, raw reload and settlement even with a later learned style',
];
const results = [];
const write = (file, value) => fs.writeFileSync(path.join(out, file), value, { flag: 'wx' });
function run(label, copyPath) {
  const reportPath = path.join(out, label + '.report.json');
  const snapshotPath = path.join(out, label + '.snapshots.json');
  const transport = path.join(out, label + '.transport');
  write(label + '.transport', '');
  const env = { ...process.env, CM_STYLE_PARITY_SNAPSHOT: snapshotPath, SIM_NETWORK: 'offline',
    SIM_OFFLINE_RECEIPT: transport, TZ: 'UTC', NODE_OPTIONS: '--require=' + transportFile };
  if (copyPath) {
    env.US_BOARD_CONTROL_ALIAS = '@/lib/clubManager';
    env.US_BOARD_CONTROL_FILE = copyPath;
  } else {
    delete env.US_BOARD_CONTROL_ALIAS; delete env.US_BOARD_CONTROL_FILE;
  }
  const child = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run',
    testFile, '--maxWorkers=1', '--no-file-parallelism', '--reporter=json', '--outputFile=' + reportPath],
    { cwd: root, env, encoding: 'utf8', timeout: 300000, maxBuffer: 16 * 1024 * 1024 });
  write(label + '.stdout.log', child.stdout ?? '');
  write(label + '.stderr.log', child.stderr ?? '');
  write(label + '.exit.json', JSON.stringify({ status: child.status, signal: child.signal, error: child.error ? String(child.error) : null }) + '\n');
  assert(!child.error && !child.signal, 'CM_STYLE_PARITY_REAL_PROCESS:' + label);
  assert.equal(child.status, 0, 'CM_STYLE_PARITY_PROBE_GREEN:' + label);
  assert.equal(fs.statSync(transport).size, 0, 'CM_STYLE_PARITY_OFFLINE:' + label);
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  assert.equal(report.success, true);
  for (const [key, value] of Object.entries({ numTotalTests: 3, numPassedTests: 3, numFailedTests: 0, numPendingTests: 0, numTodoTests: 0 }))
    assert.equal(report[key], value, 'CM_STYLE_PARITY_REPORT:' + label + ':' + key);
  assert.equal(report.testResults.length, 1);
  const suite = report.testResults[0];
  assert.equal(path.resolve(suite.name), path.resolve(root, testFile));
  assert.equal(suite.status, 'passed');
  assert.equal(suite.assertionResults.length, 3);
  assert.deepEqual(suite.assertionResults.map(row => row.title), expected);
  if ('message' in suite) assert.equal(suite.message, '');
  for (const row of suite.assertionResults) {
    assert.equal(row.status, 'passed'); assert.deepEqual(row.failureMessages, []);
  }
  const unknown = [];
  for (const key of ['numRuntimeErrorTestSuites', 'numUnhandledErrors']) {
    if (key in report) assert.equal(report[key], 0); else unknown.push(key);
  }
  if ('unhandledErrors' in report) assert.deepEqual(report.unhandledErrors, []);
  assert.doesNotMatch((child.stdout ?? '') + (child.stderr ?? ''), /Unhandled\s+(?:Errors?|Rejections?)|Uncaught\s+Exceptions?/i);
  const snapshots = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  assert.equal(snapshots.length, 3);
  assert.deepEqual(snapshots.map(row => row.title), ['no-style charged weeks', 'no-style actual match', 'old unmarked live']);
  for (const row of snapshots) {
    assert(row.frames.length > 1 && row.draws.length > 0);
    assert(row.draws.every(value => typeof value === 'number' && Number.isFinite(value)));
    assert(row.frames.every(frame => typeof frame.stage === 'string' && typeof frame.serialized === 'string'));
  }
  results.push({ label, exit: child.status, cases: 3, runtimeCountersAbsentUnknown: unknown,
    snapshotSha256: hash(fs.readFileSync(snapshotPath)), copiedEngine: copyPath ? hash(fs.readFileSync(copyPath)) : null });
  return snapshots;
}
function equal(actual, old) {
  assert.equal(actual.length, old.length, 'CM_STYLE_OLD_PARITY_CASE_COUNT');
  for (let i = 0; i < actual.length; i++) {
    assert.equal(actual[i].title, old[i].title, 'CM_STYLE_OLD_PARITY_CASE_IDENTITY');
    assert.deepEqual(actual[i].draws, old[i].draws, 'CM_STYLE_OLD_PARITY_ALL_RNG_DRAWS');
    assert.deepEqual(actual[i].frames, old[i].frames, 'CM_STYLE_OLD_PARITY_FULL_STATE');
  }
}
const oldCopy = path.join(out, 'original-engine.ts');
write('original-engine.ts', original);
const originalText = original.toString('utf8');
const anchor = "  runIntlBreaks(state);\n  return { state, kind: 'match', report };\n}\n\n/** Preview of the next thing";
const occurrences = (text, part) => text.split(part).length - 1;
assert.equal(occurrences(originalText, anchor), 1, 'CM_STYLE_CONTROL_ORIGINAL_ANCHOR');
try {
  const current = run('candidate', null);
  const baseline = run('frozen-original', oldCopy);
  equal(current, baseline);
  const controls = [];
  for (const [id, insertion, marker] of [
    ['extra-resume-draw', '  Math.random();\n', 'CM_STYLE_OLD_PARITY_ALL_RNG_DRAWS'],
    ['changed-resume-budget', '  state.budget += 1;\n', 'CM_STYLE_OLD_PARITY_FULL_STATE'],
  ]) {
    const after = anchor.replace("  return { state, kind: 'match', report };", insertion + "  return { state, kind: 'match', report };");
    const changed = originalText.replace(anchor, after);
    assert.notEqual(hash(Buffer.from(changed)), hash(original), 'CM_STYLE_CONTROL_CHANGED');
    assert.equal(occurrences(changed, after), 1, 'CM_STYLE_CONTROL_INVERSE_ANCHOR');
    assert.equal(changed.replace(after, anchor), originalText, 'CM_STYLE_CONTROL_WHOLE_INVERSE');
    const file = id + '.ts'; write(file, changed);
    const witness = run(id, path.join(out, file));
    let caught = null;
    try { equal(current, witness); } catch (error) { caught = error; }
    assert(caught instanceof assert.AssertionError && caught.message.includes(marker), 'CM_STYLE_CONTROL_OWNED_COMPARATOR:' + id);
    controls.push({ id, sourceSha256: hash(original), changedSha256: hash(Buffer.from(changed)),
      wholeInverseSha256: hash(original), ownedAssertionMarker: marker, actualMessage: caught.message });
  }
  write('parity.json', JSON.stringify({ status: 'ACTUAL_OLD_ENGINE_PARITY_AND_TWO_EFFECTIVE_CONTROLS_PASS',
    scope: 'Three declared no-style/old-unmarked-live paths only, no full-engine or balance qualification',
    sourceInputs: inputs, originalSha256: hash(original), runs: results, controls, applicationQualified: false }, null, 2) + '\n');
} finally {
  for (const [file, bytes] of before)
    assert(fs.readFileSync(file).equals(bytes), 'CM_STYLE_PARITY_INPUT_HOLD:' + file);
  write('input-holds.json', JSON.stringify({ files: [...before].map(([file, bytes]) => ({ file, sha256: hash(bytes) })), allEqual: true }) + '\n');
}
