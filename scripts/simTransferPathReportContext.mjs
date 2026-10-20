import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { BOARD_FILE, BOARD_ALIAS, TEST_FILE, TEST_SHA256, TITLES, UNIT_ARMS, FAULT_TITLES,
  GENERIC_REFUSAL, NATIONAL_INSTRUCTION, hash, forward, inverse, replaceOnce, readPlan, sourceForArm } from './qa/transferPathReportContext1439.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
assert(require.cache[require.resolve('./lib/offlineTransport.cjs')], 'Ordinary offline preload required');
assert.equal(process.env.SIM_NETWORK, 'offline');
assert(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === '--units-stage'), 'Only ordinary default or units-stage');
assert(!process.env.NO_DOUBLE_SWAP, 'No inherited test alias');
const modeEnvAbsent = !Object.hasOwn(process.env, 'TRANSFER_PATH_CONTEXT_MODE');
const outEnvAbsent = !Object.hasOwn(process.env, 'TRANSFER_PATH_CONTEXT_OUT');
const MODE = modeEnvAbsent ? 'fixed' : process.env.TRANSFER_PATH_CONTEXT_MODE;
const plan = readPlan(ROOT, MODE);
const evidenceRoot = outEnvAbsent ? fs.mkdtempSync(path.join(os.tmpdir(), 'transfer-path-context-evidence-')) : process.env.TRANSFER_PATH_CONTEXT_OUT;
assert(typeof evidenceRoot === 'string' && path.isAbsolute(evidenceRoot), 'Absolute evidence root');
assert(path.resolve(evidenceRoot) !== ROOT && !path.resolve(evidenceRoot).startsWith(ROOT + path.sep), 'Evidence outside checkout');
const OUT = path.join(evidenceRoot, 'unit'); assert(!fs.existsSync(OUT), 'Fresh unit packet'); fs.mkdirSync(OUT, { recursive: true });
const TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'transfer-path-context-modules-'));
const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n'); };
function git(args) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  assert.ifError(result.error); assert.equal(result.status, 0); return result.stdout;
}
function sourceState() {
  const names = git(['ls-files', '-z', '--cached', '--others', '--exclude-standard']).split('\0').filter(Boolean).sort();
  assert.equal(new Set(names).size, names.length);
  return { files: Object.fromEntries(names.map(name => [name, hash(fs.readFileSync(path.join(ROOT, name)))])), status: git(['status', '--porcelain=v1', '--untracked-files=all']) };
}
const before = sourceState(); write(path.join(OUT, 'source-before.json'), before);
assert.equal(before.files[TEST_FILE], TEST_SHA256);
const summary = { version: 1, scope: 'transfer-path-report-context', mode: MODE, status: 'running',
  sourceSha256: plan.actualSha256, physicalSourceSha256: plan.physicalSourceSha256,
  originalSha256: plan.originalSha256, fixedSha256: plan.fixedSha256, wholeInverse: plan.wholeInverse,
  testSha256: TEST_SHA256, originalAdmission: plan.originalAdmission, arms: [], modules: [], refusals: [],
  sourceHeld: false, temporaryModulesRemoved: false, productQualified: false, historicalExecutions: 0 };
function refusal(name, action, mutation = null) {
  let caught = null; try { action(); } catch (error) { caught = { name: error.name, message: error.message }; }
  const record = { name, caught, expected: true, mutation };
  write(path.join(OUT, 'refusals', name + '.json'), record);
  assert(caught, `Effective refusal ${name}`); summary.refusals.push({ name, receiptSha256: hash(JSON.stringify(record, null, 2) + '\n') });
}
function rawCases(raw, expectedFaults) {
  assert.equal(raw.numTotalTests, 14); assert.equal(raw.numPassedTests, 14 - expectedFaults.length);
  assert.equal(raw.numFailedTests, expectedFaults.length); assert.equal(raw.numPendingTests, 0); assert.equal(raw.numTodoTests, 0);
  assert.equal(raw.numRuntimeErrorTestSuites || 0, 0); assert.equal(raw.numUnhandledErrors || 0, 0);
  if (raw.unhandledErrors !== undefined) assert.deepEqual(raw.unhandledErrors, []);
  assert.equal(raw.testResults.length, 1);
  const cases = raw.testResults[0].assertionResults;
  assert.equal(cases.length, 14); assert.deepEqual(cases.map(row => row.title), TITLES);
  assert(cases.every(row => ['passed', 'failed'].includes(row.status)));
  const failed = cases.filter(row => row.status === 'failed');
  assert.deepEqual(failed.map(row => row.title), expectedFaults);
  for (const row of failed) {
    assert(row.failureMessages.length > 0);
    assert(row.failureMessages.every(text => text.includes(TITLES.indexOf(row.title) < 9 ? 'TP_CONTEXT_RESET' : 'TP_CONTEXT_COPY')), 'Only exact purpose assertion failures');
  }
  return cases;
}
function traceCases(trace, expectedFaults) {
  assert.equal(trace.version, 1); assert.equal(trace.cases.length, 14);
  assert.deepEqual(trace.cases.map(row => row.title), TITLES);
  for (const [index, row] of trace.cases.entries()) {
    assert.deepEqual(row.cleanup, { mountedNodes: 0, subscriptions: 0 });
    assert(row.snapshots.length > 0); assert.equal(row.snapshots[row.snapshots.length - 1].phase, 'before-cleanup');
    for (const shot of row.snapshots) {
      assert.equal(shot.report.gameType, 'transfer-path');
      assert.deepEqual(Object.keys(shot.report.gameContext).sort(), ['puzzleId', 'playerA', 'playerB', 'rule', 'chain', 'lastRejected', 'lastNoMatch', 'poolSize'].sort());
      assert.equal(shot.report.gameContext.poolSize, 6);
      assert.equal(shot.report.gameContext.puzzleId, shot.identity.id);
      assert.equal(shot.report.gameContext.playerA, shot.identity.playerA);
      assert.equal(shot.report.gameContext.playerB, shot.identity.playerB);
      assert.equal(shot.report.gameContext.rule, shot.identity.activeRule);
      assert(Array.isArray(shot.report.gameContext.chain)); assert(shot.report.gameContext.chain.every(name => typeof name === 'string'));
    }
    if (index < 9) {
      const observed = row.snapshots.find(shot => shot.phase === 'after-identity-change'); assert(observed, 'Actual reset observation exists');
      const value = observed.report.gameContext;
      if (expectedFaults.includes(row.title)) assert.deepEqual(value.lastRejected, { name: 'Fixture Rejected One', after: 'Fixture Origin' });
      else assert.deepEqual({ lastRejected: value.lastRejected, lastNoMatch: value.lastNoMatch, error: observed.error }, { lastRejected: null, lastNoMatch: null, error: null });
    }
    if (index === 12) {
      const observed = row.snapshots.find(shot => shot.phase === 'generic-records-copy'); assert(observed);
      assert.equal(observed.error, expectedFaults.includes(row.title) ? 'Fixture Rejected One was never at the same club as Fixture Origin in the same season' : GENERIC_REFUSAL);
    }
    if (index === 13) {
      const observed = row.snapshots.find(shot => shot.phase === 'rule-instructions'); assert(observed);
      assert.equal(observed.instructions.includes(NATIONAL_INSTRUCTION), !expectedFaults.includes(row.title));
    }
  }
}
function runArm(arm) {
  const directory = path.join(OUT, arm); fs.mkdirSync(directory, { recursive: true });
  const module = sourceForArm(plan, arm), moduleSha256 = hash(module), actualImport = arm === 'normal';
  const kept = path.join(OUT, 'modules', arm + '.tsx'); fs.mkdirSync(path.dirname(kept), { recursive: true }); fs.writeFileSync(kept, module);
  const temporary = path.join(TEMP, arm + '.tsx'); fs.writeFileSync(temporary, module); assert.equal(hash(fs.readFileSync(temporary)), moduleSha256);
  summary.modules.push({ arm, file: path.relative(evidenceRoot, kept), moduleSha256, actualImport,
    actualSourceEqual: module === plan.actualSource, wholeInverseHeld: inverse(plan.fixedSource) === plan.originalSource });
  const report = path.join(directory, 'vitest.json'), trace = path.join(directory, 'trace.json'), transport = path.join(directory, 'transport.transport');
  fs.writeFileSync(transport, '');
  const env = { ...process.env, TRANSFER_PATH_CONTEXT_TRACE: trace, SIM_OFFLINE_RECEIPT: transport };
  delete env.NO_DOUBLE_SWAP;
  if (!actualImport) env.NO_DOUBLE_SWAP = JSON.stringify({ [BOARD_ALIAS]: temporary });
  const args = ['node_modules/vitest/vitest.mjs', 'run', TEST_FILE, '--maxWorkers=1', '--no-file-parallelism', '--reporter=json', '--outputFile=' + report];
  const result = spawnSync(process.execPath, args, { cwd: ROOT, env, encoding: 'utf8', timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
  fs.writeFileSync(path.join(directory, 'stdout.log'), result.stdout || ''); fs.writeFileSync(path.join(directory, 'stderr.log'), result.stderr || '');
  const processReceipt = { executable: process.execPath, args, cwd: ROOT, boardAlias: actualImport ? null : { [BOARD_ALIAS]: temporary },
    moduleSha256, testSha256: TEST_SHA256, timeout: 180000, exitCode: result.status, signal: result.signal,
    error: result.error ? { name: result.error.name, message: result.error.message, code: result.error.code } : null,
    stdoutSha256: hash(result.stdout || ''), stderrSha256: hash(result.stderr || ''), transportBytes: fs.statSync(transport).size };
  write(path.join(directory, 'process.json'), processReceipt);
  assert.ifError(result.error); assert.equal(result.signal, null); assert.equal(processReceipt.transportBytes, 0);
  assert(!/Unhandled\s+(?:Errors?|Rejections?)|Uncaught\s+Exceptions?|SIM_OFFLINE_BLOCK/i.test((result.stdout || '') + (result.stderr || '')), 'No setup, unhandled or blocked transport credit');
  const expected = FAULT_TITLES[MODE === 'baseline' ? 'baseline' : arm]; assert.equal(result.status, expected.length ? 1 : 0);
  const raw = JSON.parse(fs.readFileSync(report, 'utf8')); rawCases(raw, expected);
  const observed = JSON.parse(fs.readFileSync(trace, 'utf8')); traceCases(observed, expected);
  const mutated = structuredClone(raw); mutated.numTotalTests = 15;
  refusal('raw-count-' + arm, () => rawCases(mutated, expected), { before: raw.numTotalTests, after: mutated.numTotalTests });
  const noCleanup = structuredClone(observed); noCleanup.cases[0].cleanup.subscriptions = 1;
  refusal('trace-cleanup-' + arm, () => traceCases(noCleanup, expected), { case: TITLES[0], subscriptions: 1 });
  const entry = { arm, cases: 14, passed: 14 - expected.length, failed: expected.length, faultTitles: expected,
    moduleSha256, actualImport, reportSha256: hash(fs.readFileSync(report)), traceSha256: hash(fs.readFileSync(trace)),
    processSha256: hash(fs.readFileSync(path.join(directory, 'process.json'))), transportBytes: 0 };
  summary.arms.push(entry); return observed;
}
let failure;
try {
  refusal('unknown-mode', () => readPlan(ROOT, 'unknown'));
  refusal('unknown-arm', () => sourceForArm(plan, 'unknown'));
  refusal('original-source-drift', () => forward(plan.originalSource + '\n'), { beforeSha256: hash(plan.originalSource), afterSha256: hash(plan.originalSource + '\n') });
  refusal('fixed-source-drift', () => inverse(plan.fixedSource + '\n'), { beforeSha256: hash(plan.fixedSource), afterSha256: hash(plan.fixedSource + '\n') });
  refusal('missing-literal-anchor', () => replaceOnce(plan.originalSource, '__missing_executable_anchor__', 'changed'));
  refusal('ineffective-literal-change', () => replaceOnce(plan.originalSource, 'same', 'same'));
  refusal('missing-fixed-admission', () => sourceForArm({ ...plan, mode: 'fixed', originalAdmission: null }, 'normal'));
  let normal;
  for (const arm of UNIT_ARMS[MODE]) {
    const observed = runArm(arm);
    if (arm === 'normal') normal = observed;
    if (arm === 'restored') assert.deepEqual(observed, normal, 'Complete actually executed restored trace equals normal');
  }
  summary.status = 'passed';
} catch (error) { failure = error; summary.status = 'failed'; summary.failure = { name: error.name, message: error.message, stack: error.stack }; }
finally {
  fs.rmSync(TEMP, { recursive: true, force: true }); summary.temporaryModulesRemoved = !fs.existsSync(TEMP);
  const after = sourceState(); write(path.join(OUT, 'source-after.json'), after);
  try { assert(summary.temporaryModulesRemoved); assert.deepEqual(after, before, 'Complete source bytes, membership and status held'); summary.sourceHeld = true; }
  catch (error) { failure ??= error; summary.status = 'failed'; summary.holdFailure = { name: error.name, message: error.message, stack: error.stack }; }
  write(path.join(OUT, 'summary.json'), summary);
}
if (failure) throw failure;
console.log(JSON.stringify({ kind: 'transfer-path-context-result', mode: MODE, evidenceRoot, modeEnvAbsent, outEnvAbsent,
  summarySha256: hash(fs.readFileSync(path.join(OUT, 'summary.json'))), sourceHeld: summary.sourceHeld,
  temporaryModulesRemoved: summary.temporaryModulesRemoved, historicalExecutions: 0, productQualified: false }));
