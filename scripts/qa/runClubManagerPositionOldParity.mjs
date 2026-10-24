import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const root = fs.realpathSync(process.cwd());
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const blob = value => crypto.createHash('sha1').update(Buffer.from('blob ' + value.length + '\0')).update(value).digest('hex');
const originalPath = process.env.CM_POSITION_ORIGINAL_SOURCE;
const requestedOut = process.env.CM_POSITION_PARITY_OUT;
assert(originalPath && path.isAbsolute(originalPath), 'CM_POSITION_ORIGINAL_SOURCE_REQUIRED');
assert(requestedOut && path.isAbsolute(requestedOut), 'CM_POSITION_PARITY_OUT_REQUIRED');
assert(process.env.RUNNER_TEMP, 'CM_POSITION_RUNNER_TEMP_REQUIRED');
const parent = fs.realpathSync(path.dirname(requestedOut));
const temp = fs.realpathSync(process.env.RUNNER_TEMP);
assert(parent === temp || parent.startsWith(temp + path.sep), 'CM_POSITION_FRESH_OUTPUT_IN_RUNNER_TEMP');
const out = path.join(parent, path.basename(requestedOut));
assert(!fs.existsSync(out), 'CM_POSITION_OUTPUT_MUST_BE_FRESH');
for (const key of ['US_BOARD_CONTROL_ALIAS', 'US_BOARD_CONTROL_FILE', 'NO_DOUBLE_SWAP', 'CM_POSITION_PARITY_SNAPSHOT'])
  assert(!process.env[key], 'CM_POSITION_ALIAS_ENV_MUST_BE_CLEAN:' + key);
fs.mkdirSync(out);
const testFile = 'src/test/clubManagerPositionOldParity.test.ts';
const inputs = [
  ['src/lib/clubManager.ts', 1243757, 'eeb271dce618de6e1894f3a5432aa728cab8f98cadd31b79b0e4f50150d0d0b4'],
  ['src/lib/clubManagerPositions.ts', 3861, 'ba6a2ab6f4a220439dec9373ba3655c7a962abaa640cc8f47c206644df0407a7'],
  [testFile, 9855, '590c31f4339f8fc5a0c340a9df6da4592670eef3d06c345996cba97b529b2613'],
];
for (const [file, bytes, sha] of inputs) {
  const body = fs.readFileSync(path.join(root, file));
  assert.equal(body.length, bytes, 'CM_POSITION_INPUT_BYTES:' + file);
  assert.equal(hash(body), sha, 'CM_POSITION_INPUT_HASH:' + file);
}
const config = fs.readFileSync(path.join(root, 'vitest.config.ts'));
assert.equal(blob(config), 'ed2a9dc677f77dfe95c061064eeff5782b856864', 'CM_POSITION_ACTUAL_CONFIG_HELD');
const transportFile = path.join(root, 'scripts/lib/offlineTransport.cjs');
const transportBody = fs.readFileSync(transportFile);
assert.equal(blob(transportBody), '0fda542a2649fe5da937c6976fd0f5b6073e74b6', 'CM_POSITION_ACTUAL_TRANSPORT_HELD');
const original = fs.readFileSync(originalPath);
assert.equal(original.length, 1240569, 'CM_POSITION_FROZEN_ORIGINAL_BYTES');
assert.equal(hash(original), '05de3cfca8d978e6117979fb29b82b2ece7b9fb6ee1f2ce3c051e379e36de86e', 'CM_POSITION_FROZEN_ORIGINAL_HASH');
assert.equal(blob(original), 'a505743537b383bc7885bb81f5a72c11e154b566', 'CM_POSITION_FROZEN_ORIGINAL_GIT_BLOB');
const before = new Map([...inputs.map(([file]) => [path.join(root, file), fs.readFileSync(path.join(root, file))]),
  [path.join(root, 'vitest.config.ts'), config], [transportFile, transportBody], [originalPath, original]]);
const expected = [
  'records six actual no-custom charged weeks with complete states and all draw values',
  'records an actual no-custom kickoff, second half and settled match without field stripping',
  'records an old unmarked live save, raw reload and settlement even with a later custom career shape',
  'records unmarked first and second half recuts with actual shape, formation and duty changes',
];
const results = [];
const write = (file, value) => fs.writeFileSync(path.join(out, file), value, { flag: 'wx' });
function run(label, copyPath) {
  const reportPath = path.join(out, label + '.report.json');
  const snapshotPath = path.join(out, label + '.snapshots.json');
  const transport = path.join(out, label + '.transport');
  write(label + '.transport', '');
  const env = { ...process.env, CM_POSITION_PARITY_SNAPSHOT: snapshotPath, SIM_NETWORK: 'offline',
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
  assert(!child.error && !child.signal, 'CM_POSITION_PARITY_REAL_PROCESS:' + label);
  assert.equal(child.status, 0, 'CM_POSITION_PARITY_PROBE_GREEN:' + label);
  assert.equal(fs.statSync(transport).size, 0, 'CM_POSITION_PARITY_OFFLINE:' + label);
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  assert.equal(report.success, true);
  for (const [key, value] of Object.entries({ numTotalTests: 4, numPassedTests: 4, numFailedTests: 0, numPendingTests: 0, numTodoTests: 0 }))
    assert.equal(report[key], value, 'CM_POSITION_PARITY_REPORT:' + label + ':' + key);
  assert.equal(report.testResults.length, 1);
  const suite = report.testResults[0];
  assert.equal(path.resolve(suite.name), path.resolve(root, testFile));
  assert.equal(suite.status, 'passed');
  assert.equal(suite.assertionResults.length, 4);
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
  assert.equal(snapshots.length, 4);
  assert.deepEqual(snapshots.map(row => row.title), ['no-custom charged weeks', 'no-custom actual match', 'old unmarked live', 'old unmarked recuts']);
  for (const row of snapshots) {
    assert(row.frames.length > 1 && row.draws.length > 0);
    assert(row.draws.every(value => typeof value === 'number' && Number.isFinite(value)));
    assert(row.frames.every(frame => typeof frame.stage === 'string' && typeof frame.serialized === 'string'));
  }
  results.push({ label, exit: child.status, cases: 4, runtimeCountersAbsentUnknown: unknown,
    snapshotSha256: hash(fs.readFileSync(snapshotPath)), copiedEngine: copyPath ? hash(fs.readFileSync(copyPath)) : null });
  return snapshots;
}
function equal(actual, old) {
  assert.equal(actual.length, old.length, 'CM_POSITION_OLD_PARITY_CASE_COUNT');
  for (let i = 0; i < actual.length; i++) {
    assert.equal(actual[i].title, old[i].title, 'CM_POSITION_OLD_PARITY_CASE_IDENTITY');
    assert.deepEqual(actual[i].draws, old[i].draws, 'CM_POSITION_OLD_PARITY_ALL_RNG_DRAWS');
    assert.deepEqual(actual[i].frames, old[i].frames, 'CM_POSITION_OLD_PARITY_FULL_STATE');
  }
}
const runKey = process.env.GITHUB_RUN_ID + '-' + process.env.GITHUB_RUN_ATTEMPT;
assert(/^\d+-\d+$/.test(runKey), 'CM_POSITION_PARITY_ACTUAL_RUN_ID_REQUIRED');
const copyRoot = path.join(root, '.sim-control', 'cm-position-old-parity-' + runKey);
assert(!fs.existsSync(copyRoot), 'CM_POSITION_PARITY_COPIES_MUST_BE_FRESH');
fs.mkdirSync(copyRoot, { recursive: true });
const copies = new Map();
function physicalCopy(name, bytes) {
  const target = path.join(copyRoot, name);
  fs.writeFileSync(target, bytes, { flag: 'wx' });
  write(name, bytes);
  assert(fs.readFileSync(target).equals(Buffer.from(bytes)), 'CM_POSITION_PARITY_PHYSICAL_COPY_READBACK:' + name);
  assert(fs.readFileSync(path.join(out, name)).equals(Buffer.from(bytes)), 'CM_POSITION_PARITY_EVIDENCE_COPY_READBACK:' + name);
  copies.set(name, Buffer.from(bytes));
  return target;
}
const oldCopy = physicalCopy('original-engine.ts', original);
const originalText = original.toString('utf8');
const anchor = "  runIntlBreaks(state);\n  return { state, kind: 'match', report };\n}\n\n/** Preview of the next thing";
const occurrences = (text, part) => text.split(part).length - 1;
assert.equal(occurrences(originalText, anchor), 1, 'CM_POSITION_CONTROL_ORIGINAL_ANCHOR');
try {
  const current = run('candidate', null);
  const baseline = run('frozen-original', oldCopy);
  equal(current, baseline);
  const controls = [];
  for (const [id, insertion, marker] of [
    ['extra-resume-draw', '  Math.random();\n', 'CM_POSITION_OLD_PARITY_ALL_RNG_DRAWS'],
    ['changed-resume-budget', '  state.budget += 1;\n', 'CM_POSITION_OLD_PARITY_FULL_STATE'],
  ]) {
    const after = anchor.replace("  return { state, kind: 'match', report };", insertion + "  return { state, kind: 'match', report };");
    const changed = originalText.replace(anchor, after);
    assert.notEqual(hash(Buffer.from(changed)), hash(original), 'CM_POSITION_CONTROL_CHANGED');
    assert.equal(occurrences(changed, after), 1, 'CM_POSITION_CONTROL_INVERSE_ANCHOR');
    assert.equal(changed.replace(after, anchor), originalText, 'CM_POSITION_CONTROL_WHOLE_INVERSE');
    const file = id + '.ts';
    const witness = run(id, physicalCopy(file, changed));
    let caught = null;
    try { equal(current, witness); } catch (error) { caught = error; }
    assert(caught instanceof assert.AssertionError && caught.message.includes(marker), 'CM_POSITION_CONTROL_OWNED_COMPARATOR:' + id);
    controls.push({ id, sourceSha256: hash(original), changedSha256: hash(Buffer.from(changed)),
      wholeInverseSha256: hash(original), ownedAssertionMarker: marker, actualMessage: caught.message });
  }
  write('parity.json', JSON.stringify({ status: 'ACTUAL_OLD_ENGINE_PARITY_AND_TWO_EFFECTIVE_CONTROLS_PASS',
    scope: 'Four declared no-custom/old-unmarked-live/recut paths only, no exhaustive engine or balance qualification',
    sourceInputs: inputs, originalSha256: hash(original), runs: results, controls, applicationQualified: false }, null, 2) + '\n');
} finally {
  for (const [name, bytes] of copies) {
    assert(fs.readFileSync(path.join(copyRoot, name)).equals(bytes), 'CM_POSITION_PARITY_PHYSICAL_COPY_END_HOLD:' + name);
    assert(fs.readFileSync(path.join(out, name)).equals(bytes), 'CM_POSITION_PARITY_EVIDENCE_COPY_END_HOLD:' + name);
  }
  assert.deepEqual(fs.readdirSync(copyRoot).sort(), [...copies.keys()].sort(), 'CM_POSITION_PARITY_COPY_MEMBERS_END_HOLD');
  write('copy-holds.json', JSON.stringify({ directory: copyRoot, copies: [...copies].map(([name, bytes]) =>
    ({ name, bytes: bytes.length, sha256: hash(bytes), gitBlob: blob(bytes) })), allEqual: true }) + '\n');
  for (const [file, bytes] of before)
    assert(fs.readFileSync(file).equals(bytes), 'CM_POSITION_PARITY_INPUT_HOLD:' + file);
  write('input-holds.json', JSON.stringify({ files: [...before].map(([file, bytes]) => ({ file, sha256: hash(bytes) })), allEqual: true }) + '\n');
}
