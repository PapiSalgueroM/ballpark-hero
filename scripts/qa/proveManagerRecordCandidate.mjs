/* Remote-only paired proof. The product patch is temporary and always restored. */
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Remote offline CI required');
const BASE = '7f71523406172cdf4374bfa718607d5ccfccd4f6';
const OUT = process.env.CM_RECORD_CANDIDATE_OUT;
assert(OUT && path.isAbsolute(OUT), 'Absolute evidence directory required');
const CORE = 'src/lib/clubManager.ts';
const TEST = 'src/test/clubManagerRecordBoundary.test.ts';
const PATCH = 'scripts/fixtures/managerRecordCandidate/safe-trim.patch';
const IDS = ['legacy300', 'legacy350', 'legacy299', 'stored', 'null', 'higher', 'tie'];
const FAULTS = [
  ['legacy300 preserves the oldest nine-goal game with zero missed', 'RECORD_BOUNDARY_LEGACY300'],
  ['legacy350 preserves the oldest nine-goal game with fifty missed', 'RECORD_BOUNDARY_LEGACY350'],
];
const sha = value => createHash('sha256').update(value).digest('hex');
const execute = (command, args) => spawnSync(command, args, { encoding: 'utf8', timeout: 300000,
  maxBuffer: 64 * 1024 * 1024, env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' } });
const git = args => { const result = execute('git', args); assert.equal(result.status, 0, result.stderr); return result.stdout; };
const original = fs.readFileSync(CORE);
assert.equal(original.toString('utf8'), git(['show', `${BASE}:${CORE}`]), 'Exact current I1343 core');
assert.equal(sha(original), '95447e360a13af2f0ab378058cea5fead1cb15eaf593df9a1b775eaea5c84ff5');
const heldFiles = [CORE, TEST, PATCH, 'src/lib/clubManagerRecords.ts', 'src/lib/saveFence.ts',
  'scripts/qa/proveManagerRecordCandidate.mjs', 'package.json', 'package-lock.json', 'bun.lock'];
const held = heldFiles.map(file => ({ file, bytes: fs.readFileSync(file) }));
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'original-core.ts'), original);
const receipt = { base: BASE, head: git(['rev-parse', 'HEAD']).trim(), purpose: 'Unapplied product candidate, test-only proof',
  sources: held.map(row => ({ file: row.file, bytes: row.bytes.length, sha256: sha(row.bytes) })), arms: {} };
function record() { fs.writeFileSync(path.join(OUT, 'receipt.json'), JSON.stringify(receipt, null, 2)); }
function nonRecord(state) { const copy = structuredClone(state); delete copy.careerStats.highestScoring; return copy; }
function runArm(arm, baseline) {
  const dir = path.join(OUT, arm);
  assert(!fs.existsSync(dir), 'Do not overwrite proof arm'); fs.mkdirSync(dir);
  const resultFile = path.join(dir, 'unit.json');
  const child = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', TEST,
    '--maxWorkers=1', '--minWorkers=1', '--reporter=verbose', '--reporter=json', '--outputFile.json=' + resultFile],
  { encoding: 'utf8', timeout: 300000, maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, CM_RECORD_BOUNDARY_OUT: dir, FORCE_COLOR: '0', NO_COLOR: '1' } });
  const output = (child.stdout || '') + (child.stderr || '');
  fs.writeFileSync(path.join(dir, 'output.log'), output); process.stdout.write(output);
  fs.writeFileSync(path.join(dir, 'exit.json'), JSON.stringify({ exit: child.status, signal: child.signal, error: child.error?.message || null }));
  assert(!child.error && !child.signal && child.status !== null, 'Actual unit runner must complete');
  assert(!/TypeError:|ReferenceError:|SyntaxError:|ERR_MODULE_NOT_FOUND|Unhandled (?:Errors?|Rejection)|Uncaught Exception|Failed to load|Failed to resolve import|SIM_OFFLINE_BLOCK|RECORD_BOUNDARY_SETUP|RECORD_BOUNDARY_PRESERVATION/i.test(output), 'Setup/preservation faults cannot count as record faults');
  const report = JSON.parse(fs.readFileSync(resultFile));
  assert.equal(report.testResults.length, 1); assert.equal(report.numTotalTests, 6);
  assert.equal(report.numPendingTests, 0); assert.equal(report.numTodoTests, 0);
  const file = report.testResults[0];
  assert(file.name.replaceAll('\\', '/').endsWith('/' + TEST) && !file.message, 'Actual target file only');
  const cases = file.assertionResults;
  assert(cases.every(row => ['passed', 'failed'].includes(row.status)));
  const failed = cases.filter(row => row.status === 'failed');
  assert.deepEqual(failed.map(row => row.title).sort(), baseline ? FAULTS.map(row => row[0]).sort() : []);
  if (baseline) for (const row of failed) {
    const cause = FAULTS.find(fault => fault[0] === row.title)[1];
    assert.equal(row.failureMessages.length, 1);
    assert(row.failureMessages[0].startsWith('AssertionError: ' + cause + ':') && row.failureMessages[0].includes('expected false to be true'), 'Exact expected record assertion only');
  }
  assert.equal(child.status, baseline ? 1 : 0); assert.equal(report.success, !baseline);
  assert.equal(report.numFailedTests, baseline ? 2 : 0); assert.equal(report.numPassedTests, baseline ? 4 : 6);
  const raw = JSON.parse(fs.readFileSync(path.join(dir, 'raw-states.json')));
  assert.deepEqual(Object.keys(raw).sort(), [...IDS].sort());
  for (const id of IDS) {
    const row = raw[id];
    assert(!row.error && row.actual?.value && row.reference?.value && row.actualReload?.loaded && row.referenceReload?.loaded, id + ': complete observations');
    assert.equal(Object.keys(row.holds).length, 18); assert(Object.values(row.holds).every(value => value === true), id + ': all 18 public-state/save/RNG holds');
    assert.equal(row.correctRecord, !baseline || !['legacy300', 'legacy350'].includes(id));
    assert.equal(row.initializer.value.clubName, 'Everton');
    assert.equal(row.actual.value.kind, 'match'); assert.equal(row.reference.value.kind, 'match');
    assert(row.actual.draws.length > 0); assert.deepEqual(row.actual.draws, row.reference.draws);
    if (['legacy300', 'legacy350'].includes(id)) {
      const missed = id === 'legacy300' ? 0 : 50;
      assert.equal(row.before.h2h.length, 300); assert.equal(row.before.careerStats.played, 300 + missed);
      assert.equal(row.expectedRecord.opp, 'Prepared archive club 001'); assert.equal(row.expectedRecord.score, '5-4');
      for (const state of [row.actual.value.state, row.actualReload.loaded]) {
        if (baseline) { assert.notEqual(state.careerStats.highestScoring.opp, row.expectedRecord.opp); assert.equal(state.careerStats.highestScoring.missed, missed + 1); }
        else assert.deepEqual(state.careerStats.highestScoring, row.expectedRecord);
      }
    }
  }
  receipt.arms[arm] = { exit: child.status, passed: report.numPassedTests, failed: report.numFailedTests,
    coreSha256: sha(fs.readFileSync(CORE)), rawSha256: sha(fs.readFileSync(path.join(dir, 'raw-states.json'))) }; record();
  return raw;
}
try {
  record();
  const baseline = runArm('original', true);
  git(['apply', '--check', PATCH]); git(['apply', PATCH]);
  const candidate = fs.readFileSync(CORE);
  assert(!candidate.equals(original), 'Candidate must change source');
  assert.equal(sha(candidate), 'aecb02bb270db5c849e18d9e109472dae3934d4bfb64d30f10d484d5f9343656');
  fs.writeFileSync(path.join(OUT, 'candidate-core.ts'), candidate);
  fs.writeFileSync(path.join(OUT, 'candidate.diff'), git(['diff', '--', CORE]));
  const fixed = runArm('candidate', false);
  for (const id of IDS) {
    const a = baseline[id], b = fixed[id];
    for (const key of ['initializer', 'before', 'referenceBefore', 'seed', 'current', 'expectedRecord']) assert.deepEqual(a[key], b[key], id + ': cross-arm ' + key);
    assert.equal(a.attempts.length, b.attempts.length, id + ': same bounded search');
    for (const key of ['actual', 'reference']) {
      assert.deepEqual(a[key].draws, b[key].draws, id + ': exact consumed RNG ' + key);
      assert.deepEqual(nonRecord(a[key].value.state), nonRecord(b[key].value.state), id + ': whole non-record state ' + key);
      const av = structuredClone(a[key].value), bv = structuredClone(b[key].value); delete av.state; delete bv.state;
      assert.deepEqual(av, bv, id + ': complete non-state public result ' + key);
      assert.deepEqual(nonRecord(a[key + 'Reload'].loaded), nonRecord(b[key + 'Reload'].loaded), id + ': full reloaded non-record state ' + key);
    }
  }
  receipt.crossArm = 'All seven initializers, inputs, public outputs, full non-record match/reloaded states and consumed RNG streams match';
  assert.deepEqual(fs.readFileSync(TEST), held.find(row => row.file === TEST).bytes, 'Identical test bytes in both arms');
  receipt.qualified = true;
} finally {
  fs.writeFileSync(CORE, original);
  for (const row of held) assert.deepEqual(fs.readFileSync(row.file), row.bytes, 'Restored/held whole source: ' + row.file);
  receipt.restored = true; record();
}
console.log('Record candidate paired proof: exact original 2 faults/4 preserves, candidate 6 passes, seven full outcome/RNG pairs held, product source restored.');
