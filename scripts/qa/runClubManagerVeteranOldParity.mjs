import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const root = fs.realpathSync(process.cwd());
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const git = bytes => crypto.createHash('sha1').update(Buffer.from('blob ' + bytes.length + '\0')).update(bytes).digest('hex');
const temp = fs.realpathSync(process.env.RUNNER_TEMP ?? '');
const requested = process.env.CM_VETERAN_PARITY_OUT;
const oldCorePath = process.env.CM_VETERAN_ORIGINAL_CORE;
const oldCalendarPath = process.env.CM_VETERAN_ORIGINAL_CALENDAR;
assert(requested && path.isAbsolute(requested) && oldCorePath && path.isAbsolute(oldCorePath)
  && oldCalendarPath && path.isAbsolute(oldCalendarPath), 'CM_VETERAN_PARITY_ABSOLUTE_INPUTS');
assert(process.env.RUNNER_TEMP && temp !== root && !temp.startsWith(root + path.sep));
const parent = fs.realpathSync(path.dirname(requested));
assert(parent === temp || parent.startsWith(temp + path.sep));
const out = path.join(parent, path.basename(requested));
assert(!fs.existsSync(out), 'CM_VETERAN_PARITY_FRESH_OUTPUT');
const runKey = process.env.GITHUB_RUN_ID + '-' + process.env.GITHUB_RUN_ATTEMPT + '-' + process.env.GITHUB_SHA;
assert(/^\d+-\d+-[a-f0-9]{40}$/.test(runKey), 'CM_VETERAN_PARITY_ACTUAL_RUN_ID');
for (const key of ['US_BOARD_CONTROL_ALIAS', 'US_BOARD_CONTROL_FILE', 'NO_DOUBLE_SWAP', 'CM_VETERAN_ROLLOVER_SNAPSHOT'])
  assert(!process.env[key], 'CM_VETERAN_PARITY_CLEAN_ALIAS_ENV:' + key);
const active = path.join(temp, 'cm-veteran-rollover-parity-' + runKey);
assert(!fs.existsSync(active) && !active.startsWith(root + path.sep) && !active.startsWith(out + path.sep));
fs.mkdirSync(out); fs.mkdirSync(active);
fs.symlinkSync(path.join(root, 'node_modules'), path.join(active, 'node_modules'), 'dir');
const testFile = 'src/test/clubManagerVeteranOldParity.test.ts';
const inputs = [
  ['src/lib/clubManager.ts', 1239425, 'c7ee964763ae197adaf9bd8ce49a02a4f1b89c62cf2dacca55e2f87ae375053a'],
  ['src/lib/clubManagerCalendar.ts', 57102, '7cdbc2e31172db5974f0753551133c61ae291662f5bd8e4b14f043d2267baf83'],
  ['src/lib/clubManagerVeteranLedger.ts', 4600, '80f991a38069f29dd1fecc22a9cb9c0e3bb4945a33208fae1de8413fc6aefb17'],
  ['src/lib/clubManagerVeteranRetirement.ts', 4168, 'cdaecb5ecd28187da8a1c62526c6b165289e76e37d30a01cba2ce7c4a16577ed'],
  [testFile, 7806, 'cd687fbfc4ccd85990528e36e471833dffd65b492eb8e12b15d9b325baa800a6'],
];
const originals = [
  ['core', oldCorePath, 1240569, '05de3cfca8d978e6117979fb29b82b2ece7b9fb6ee1f2ce3c051e379e36de86e', 'a505743537b383bc7885bb81f5a72c11e154b566'],
  ['calendar', oldCalendarPath, 56974, 'ee7a0ad2086ea52d10ef30f3fc02a4479132899eb30cbab815753cad3b4d6f6b', '3653027149d6a1bef4194e0bece4fb5783c1c1e2'],
];
const before = new Map();
for (const [file, bytes, hash] of inputs) {
  const absolute = path.join(root, file), body = fs.readFileSync(absolute);
  assert.equal(body.length, bytes, file); assert.equal(sha(body), hash, file); before.set(absolute, body);
}
for (const [, absolute, bytes, hash, blob] of originals) {
  const body = fs.readFileSync(absolute);
  assert.equal(body.length, bytes); assert.equal(sha(body), hash); assert.equal(git(body), blob);
  before.set(absolute, body);
}
const config = path.join(root, 'vitest.config.ts'), configBody = fs.readFileSync(config);
assert.equal(git(configBody), 'ed2a9dc677f77dfe95c061064eeff5782b856864');
const transportFile = path.join(root, 'scripts/lib/offlineTransport.cjs'), transportBody = fs.readFileSync(transportFile);
assert.equal(sha(transportBody), 'e60ff1534307e449ccef598e3b7470dcba58681b82cea4005cec7319f14f9221');
before.set(config, configBody); before.set(transportFile, transportBody);
const write = (file, value) => fs.writeFileSync(path.join(out, file), value, { flag: 'wx' });
const json = (file, value) => write(file, JSON.stringify(value, null, 2) + '\n');
const copies = new Map();
function copy(file, bytes) {
  const body = Buffer.from(bytes), absolute = path.join(active, file);
  fs.writeFileSync(absolute, body, { flag: 'wx' }); write(file, body);
  assert(fs.readFileSync(absolute).equals(body)); assert(fs.readFileSync(path.join(out, file)).equals(body));
  copies.set(file, body); return absolute;
}
const oldCore = fs.readFileSync(oldCorePath), oldCalendar = fs.readFileSync(oldCalendarPath);
const frozenCore = copy('original-core.ts', oldCore), frozenCalendar = copy('original-calendar.ts', oldCalendar);
const anchor = '  if (pr.lines.length) state.aiHeadlines = [...pr.lines, ...state.aiHeadlines].slice(0, 8);\n  return snapshotWorldRosterClub(state, state.clubName);';
const text = oldCore.toString('utf8'), count = (body, span) => body.split(span).length - 1;
assert.equal(count(text, anchor), 1); assert.equal(text.indexOf(anchor), 1216741);
const controlRecipes = [
  ['extra-rollover-draw', '  Math.random();\n', '8305eda3315e5c0ab098bed9880d32f5a62a70b7003f1a86abf220766e9de26e', 'CM_VETERAN_OLD_PARITY_ALL_RNG_DRAWS'],
  ['changed-rollover-budget', '  state.budget += 1;\n', '7454704d6a8b3aa2263c374cd122e0814f83d4761239ce11ea483763cc5fafb9', 'CM_VETERAN_OLD_PARITY_FULL_STATE'],
];
const mutants = controlRecipes.map(([id, insert, changedHash, marker]) => {
  const replacement = anchor.replace('  return snapshotWorldRosterClub(state, state.clubName);',
    insert + '  return snapshotWorldRosterClub(state, state.clubName);');
  const changed = text.replace(anchor, replacement);
  assert.equal(sha(Buffer.from(changed)), changedHash); assert.notEqual(changed, text);
  assert.equal(count(changed, replacement), 1); assert.equal(changed.replace(replacement, anchor), text);
  return { id, marker, before: anchor, after: replacement, position: 1216741, sourceSha256: sha(oldCore),
    changedSha256: changedHash, inverseSha256: sha(oldCore), file: copy(id + '.ts', changed) };
});
const restoredCore = copy('restored-core.ts', oldCore);
function holds() {
  assert.deepEqual(fs.readdirSync(active).sort(), [...copies.keys(), 'node_modules'].sort());
  assert(fs.lstatSync(path.join(active, 'node_modules')).isSymbolicLink());
  assert.equal(fs.realpathSync(path.join(active, 'node_modules')), fs.realpathSync(path.join(root, 'node_modules')));
  for (const [name, body] of copies) for (const file of [path.join(active, name), path.join(out, name)]) {
    assert(fs.lstatSync(file).isFile() && !fs.lstatSync(file).isSymbolicLink());
    assert(fs.readFileSync(file).equals(body), 'CM_VETERAN_PARITY_COPY_HOLD:' + file);
  }
  for (const [file, body] of before) assert(fs.readFileSync(file).equals(body), 'CM_VETERAN_PARITY_INPUT_HOLD:' + file);
  return { active, copies: [...copies].map(([name, body]) => ({ name, bytes: body.length, sha256: sha(body), gitBlob: git(body) })),
    sourceInputs: [...before].map(([file, body]) => ({ file, bytes: body.length, sha256: sha(body), gitBlob: git(body) })),
    dependencyLinkTarget: fs.realpathSync(path.join(active, 'node_modules')) };
}
json('copies.before.json', holds());
json('source-control-recipes.json', mutants.map(({ file, ...rest }) => ({ ...rest, activeCopy: file })));
const expected = [
  'seed1457101 age39 covered absent ledger',
  'seed1457101 age39 expiring future ledger',
  'seed1457101 age41 covered actual declined ledger',
  'seed1457101 age41 expiring null ledger',
  'seed1457919 age39 covered malformed ledger',
  'seed1457919 age39 expiring actual declined ledger',
  'seed1457919 age41 covered future ledger',
  'seed1457919 age41 expiring absent ledger',
];
const stages = ['actual initialized career', 'actual certified owned input', 'actual complete review result',
  'declared no-agreement review input', 'actual calendar before rollover', 'actual complete rollover 1',
  'actual calendar after rollover 1', 'actual complete rollover 2', 'actual calendar after rollover 2'];
const summary = { source: process.env.GITHUB_SHA, runId: process.env.GITHUB_RUN_ID,
  attempt: process.env.GITHUB_RUN_ATTEMPT, complete: false, runs: [], controls: [], errors: [],
  scope: 'Eight declared no-agreement fictional-fixture rollover paths only',
  normalFunctional40RequiredSeparately: true, applicationQualified: false, exhaustiveEngineParity: false,
  buildBrowserCapsQualified: false, balanceQualified: false };
function run(label, engine) {
  json(label + '.copies.before.json', holds());
  const transport = path.join(out, label + '.transport'), snapshot = path.join(out, label + '.snapshots.json');
  write(label + '.transport', '');
  const env = { ...process.env, CM_VETERAN_ROLLOVER_SNAPSHOT: snapshot, SIM_NETWORK: 'offline',
    SIM_OFFLINE_RECEIPT: transport, NODE_OPTIONS: '--require=' + transportFile, TZ: 'UTC' };
  if (engine) env.NO_DOUBLE_SWAP = JSON.stringify({ '@/lib/clubManager': engine, '@/lib/clubManagerCalendar': frozenCalendar });
  const child = spawnSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', testFile,
    '--maxWorkers=1', '--no-file-parallelism', '--reporter=default', '--reporter=json',
    '--outputFile=' + path.join(out, label + '.report.json')],
    { cwd: root, env, encoding: 'utf8', timeout: 600000, maxBuffer: 16 * 1024 * 1024 });
  write(label + '.stdout.log', child.stdout ?? ''); write(label + '.stderr.log', child.stderr ?? '');
  json(label + '.exit.json', { status: child.status, signal: child.signal, error: child.error ? String(child.error) : null, pid: child.pid });
  assert(!child.error && !child.signal && Number.isInteger(child.pid) && child.pid > 0, 'CM_VETERAN_PARITY_REAL_PROCESS:' + label);
  assert.equal(child.status, 0, 'CM_VETERAN_PARITY_PROBE_MUST_PASS:' + label);
  assert.equal(fs.statSync(transport).size, 0);
  const report = JSON.parse(fs.readFileSync(path.join(out, label + '.report.json'), 'utf8'));
  assert.equal(report.success, true); assert.equal(report.testResults.length, 1);
  for (const [key, value] of Object.entries({ numTotalTests: 8, numPassedTests: 8, numFailedTests: 0, numPendingTests: 0, numTodoTests: 0 }))
    assert.equal(report[key], value, 'CM_VETERAN_PARITY_EXACT_CASES:' + key);
  const suite = report.testResults[0];
  assert.equal(path.resolve(suite.name), path.join(root, testFile)); assert.equal(suite.status, 'passed');
  if ('message' in suite) assert.equal(suite.message, '');
  assert.equal(suite.assertionResults.length, 8);
  assert.deepEqual(suite.assertionResults.map(row => row.title), expected.map(title => 'records complete states and all draws: ' + title));
  for (const row of suite.assertionResults) {
    assert.equal(row.fullName, 'Frozen old whole-engine veteran rollover compatibility ' + row.title);
    assert.equal(row.status, 'passed'); assert.deepEqual(row.failureMessages, []);
  }
  const unknown = [];
  for (const key of ['numRuntimeErrorTestSuites', 'numUnhandledErrors']) {
    if (key in report) assert.equal(report[key], 0); else unknown.push(key);
  }
  if ('unhandledErrors' in report) assert.deepEqual(report.unhandledErrors, []);
  assert.doesNotMatch((child.stdout ?? '') + (child.stderr ?? ''),
    /Unhandled\s+(?:Errors?|Rejections?)|Uncaught\s+Exceptions?|Failed to resolve import|Cannot find (?:module|package)|No test files found/i);
  const rows = JSON.parse(fs.readFileSync(snapshot, 'utf8'));
  assert.equal(rows.length, 8); assert.deepEqual(rows.map(row => row.title), expected);
  for (const row of rows) {
    assert.deepEqual(row.frames.map(frame => frame.stage), stages);
    assert(row.draws.length > 0 && row.draws.every(value => Number.isFinite(value) && value >= 0 && value < 1));
    for (const frame of row.frames) { assert.equal(typeof frame.serialized, 'string'); JSON.parse(frame.serialized); }
  }
  json(label + '.copies.after.json', holds());
  summary.runs.push({ label, pid: child.pid, exit: child.status, cases: 8, snapshotSha256: sha(fs.readFileSync(snapshot)),
    copiedCoreSha256: engine ? sha(fs.readFileSync(engine)) : null, copiedCalendarSha256: engine ? sha(oldCalendar) : null,
    runtimeCountersAbsentUnknown: unknown });
  return rows;
}
function identities(actual, old) {
  assert.equal(actual.length, old.length, 'CM_VETERAN_OLD_PARITY_CASE_COUNT');
  assert.deepEqual(actual.map(row => row.title), old.map(row => row.title), 'CM_VETERAN_OLD_PARITY_CASE_IDENTITY');
}
function sameTapes(actual, old) {
  identities(actual, old);
  for (let i = 0; i < actual.length; i++)
    assert.deepEqual(actual[i].draws, old[i].draws, 'CM_VETERAN_OLD_PARITY_ALL_RNG_DRAWS:' + actual[i].title);
}
function sameFrames(actual, old) {
  identities(actual, old);
  for (let i = 0; i < actual.length; i++)
    assert.deepEqual(actual[i].frames, old[i].frames, 'CM_VETERAN_OLD_PARITY_FULL_STATE:' + actual[i].title);
}
let failure = null;
try {
  const actual = run('candidate', null), old = run('frozen-original', frozenCore);
  sameTapes(actual, old); sameFrames(actual, old);
  for (const mutant of mutants) {
    const changed = run(mutant.id, mutant.file);
    let caught = null;
    try { if (mutant.id === 'extra-rollover-draw') sameTapes(actual, changed); else sameFrames(actual, changed); }
    catch (error) { caught = error; }
    assert(caught instanceof assert.AssertionError && caught.message.includes(mutant.marker),
      'CM_VETERAN_PARITY_EFFECTIVE_OWNED_COMPARATOR:' + mutant.id);
    summary.controls.push({ id: mutant.id, sourceSha256: mutant.sourceSha256, changedSha256: mutant.changedSha256,
      inverseSha256: mutant.inverseSha256, ownedMarker: mutant.marker, actualNativeAssertion: caught.message });
  }
  const restored = run('restored-original', restoredCore);
  sameTapes(actual, restored); sameFrames(actual, restored);
  assert.equal(summary.runs.length, 5); assert.equal(new Set(summary.runs.map(row => row.pid)).size, 5);
  assert.equal(summary.controls.length, 2); summary.complete = true;
} catch (error) { failure = error; summary.errors.push(String(error?.stack ?? error)); }
try { json('copies.after.json', holds()); }
catch (error) { summary.complete = false; summary.errors.push(String(error?.stack ?? error)); failure ??= error; }
json('parity.json', summary);
if (failure) throw failure;
