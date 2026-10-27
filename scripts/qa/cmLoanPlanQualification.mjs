/* Remote-only qualification. Every original, mutation and actual child result is retained. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

assert(process.env.CI, 'Remote CI only');
const ROOT = process.cwd(), OUT = path.resolve(process.env.CM_LOAN_PLAN_ARTIFACTS || '');
assert(process.env.CM_LOAN_PLAN_ARTIFACTS);
fs.mkdirSync(OUT, { recursive: true });
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/qa/cmLoanPlanSource.json'), 'utf8'));
const hash = value => createHash('sha256').update(value).digest('hex');
const mode = process.argv[2] || 'methods';
const put = (file, value) => fs.writeFileSync(path.join(OUT, file), JSON.stringify(value, null, 2));
function execute(cwd, name, command, args, offline = true, expected = 0, extra = {}) {
  const env = { ...process.env, ...extra, CI: '1', SIM_NETWORK: 'offline' };
  env.NODE_OPTIONS = offline ? '--require=' + path.join(cwd, 'scripts/lib/offlineTransport.cjs') : '';
  const child = spawnSync(command, args, { cwd, env, encoding: 'utf8', timeout: 600000,
    maxBuffer: 128 * 1024 * 1024, windowsHide: true });
  fs.writeFileSync(path.join(OUT, name + '.stdout'), child.stdout || '');
  fs.writeFileSync(path.join(OUT, name + '.stderr'), child.stderr || '');
  fs.writeFileSync(path.join(OUT, name + '.log'), (child.stdout || '') + '\n' + (child.stderr || ''));
  put(name + '.exit.json', { exit: child.status, signal: child.signal, error: child.error?.message, expected });
  console.log(name + ': actual exit ' + child.status);
  assert(!child.error && !child.signal, name + ': child must actually finish');
  assert.equal(child.status, expected, name + ': actual exit');
  return (child.stdout || '') + '\n' + (child.stderr || '');
}
function git(args) {
  const child = spawnSync('git', args, { cwd: ROOT, encoding: null, maxBuffer: 512 * 1024 * 1024 });
  assert.equal(child.status, 0, 'git read completes: ' + args[0]);
  return child.stdout;
}
function tracked() {
  return Object.fromEntries(git(['ls-files', '-z']).toString('utf8').split('\0').filter(Boolean)
    .map(file => [file, { bytes: fs.statSync(path.join(ROOT, file)).size,
      sha256: hash(fs.readFileSync(path.join(ROOT, file))) }]));
}
function rows(file, logFile) {
  assert(fs.existsSync(file), 'Actual Vitest JSON exists');
  assert(fs.existsSync(logFile), 'Actual default-reporter CLI log exists');
  const result = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert(Array.isArray(result.testResults) && result.testResults.length > 0, 'Actual suites are collected');
  for (const suite of result.testResults) {
    assert.equal(typeof suite.message, 'string', 'Observed Vitest suite diagnostic field is present');
    assert.equal(suite.message.trim(), '', 'No suite collection/setup/teardown diagnostic earns credit');
  }
  const cli = fs.readFileSync(logFile, 'utf8').replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '');
  assert(!/Unhandled Errors?\b|Vitest caught [1-9]\d* unhandled errors?|\bUnhandled Rejection\b|\bUncaught Exception\b|\bFailed Suites\b/i.test(cli)
    && !/^\s*Errors\s+[1-9]\d*\s+errors?\b/im.test(cli), 'No default-reporter unhandled diagnostic earns credit');
  return result.testResults.flatMap(suite => (suite.assertionResults ?? []).map(test => ({
    title: test.title, status: test.status, failure: (test.failureMessages ?? []).join('\n'),
  })));
}
function diagnosticControls(jsonFile, logFile) {
  const originalJSON = fs.readFileSync(jsonFile), originalLog = fs.readFileSync(logFile);
  const source = JSON.parse(originalJSON.toString('utf8')), expectedRows = rows(jsonFile, logFile);
  const assertions = value => value.testResults.map(suite => suite.assertionResults);
  const controls = [
    { name: 'suite-message', cause: 'No suite collection/setup/teardown diagnostic earns credit',
      report: (() => {
        const copy = JSON.parse(originalJSON.toString('utf8'));
        copy.testResults[0].message = 'QA copied report: afterAll diagnostic without changing assertion results';
        return Buffer.from(JSON.stringify(copy, null, 2));
      })(), log: originalLog },
    { name: 'unhandled-cli', cause: 'No default-reporter unhandled diagnostic earns credit',
      report: originalJSON, log: Buffer.concat([originalLog, Buffer.from(
        '\nUnhandled Errors\nVitest caught 1 unhandled error during the test run\nErrors  1 error\n')]) },
    { name: 'failed-suites-cli', cause: 'No default-reporter unhandled diagnostic earns credit',
      report: originalJSON, log: Buffer.concat([originalLog, Buffer.from(
        '\nFailed Suites 1\nQA copied nested afterAll suite failure\n')]) },
  ];
  const outcomes = [];
  for (const control of controls) {
    const prefix = path.join(OUT, 'diagnostic-' + control.name);
    const changedJSON = prefix + '.changed.json', changedLog = prefix + '.changed.log';
    const restoredJSON = prefix + '.restored.json', restoredLog = prefix + '.restored.log';
    fs.writeFileSync(changedJSON, control.report); fs.writeFileSync(changedLog, control.log);
    fs.writeFileSync(restoredJSON, originalJSON); fs.writeFileSync(restoredLog, originalLog);
    assert.deepEqual(assertions(JSON.parse(control.report.toString('utf8'))), assertions(source),
      'Copied diagnostic leaves every actual assertion row unchanged');
    assert(hash(control.report) !== hash(originalJSON) || hash(control.log) !== hash(originalLog),
      'Copied diagnostic physically changes a classifier input');
    const classify = (report, log) => {
      try { return { status: 0, records: rows(report, log) }; }
      catch (error) { return { status: 1, reason: error.message }; }
    };
    const normal = classify(jsonFile, logFile), changed = classify(changedJSON, changedLog);
    const restored = classify(restoredJSON, restoredLog);
    const outcome = { name: control.name, classifierStatuses: [normal.status, changed.status, restored.status],
      changedReason: changed.reason, before: { report: hash(originalJSON), log: hash(originalLog) },
      changed: { report: hash(control.report), log: hash(control.log) },
      restored: { report: hash(fs.readFileSync(restoredJSON)), log: hash(fs.readFileSync(restoredLog)) },
      assertionRowsHeld: true,
      limit: 'Copied diagnostic classification control; not an observed application unhandled error' };
    outcomes.push(outcome); put('diagnostic-controls.json', outcomes);
    assert.deepEqual(outcome.classifierStatuses, [0, 1, 0], 'Diagnostic classifier normal/fault/restored');
    assert(changed.reason.includes(control.cause), 'Copied fault is rejected by the intended diagnostic guard');
    assert.deepEqual(normal.records, expectedRows); assert.deepEqual(restored.records, expectedRows);
    assert.equal(hash(fs.readFileSync(jsonFile)), hash(originalJSON), 'Actual report held');
    assert.equal(hash(fs.readFileSync(logFile)), hash(originalLog), 'Actual CLI held');
  }
  return outcomes;
}
const allFiles = meta.tests.map(t => t.path);
function test(cwd, name, files, pattern, exit = 0) {
  const output = path.join(OUT, name + '.json');
  const args = ['run', 'test', '--', '--run', ...files, '--maxWorkers=1', '--no-file-parallelism',
    '--reporter=default', '--reporter=json', '--outputFile=' + output];
  if (pattern) args.push('--testNamePattern=' + pattern);
  execute(cwd, name, 'npm', args, true, exit);
  return rows(output, path.join(OUT, name + '.log'));
}
function baselineCases(records, base) {
  assert.equal(records.length, 21);
  const location = fs.readFileSync(path.join(base, 'src/test/clubManagerLoanPlanIntegration.test.ts'), 'utf8')
    .split('\n').findIndex(line => line.includes('expect(fixed.career.loanPlanHistory).toHaveLength(1)')) + 1;
  assert(location > 0);
  for (const expected of meta.baseline) {
    const actual = records.find(row => row.title === expected.title);
    assert(actual, 'Actual baseline case collected: ' + expected.title);
    assert.equal(actual.status, expected.status, expected.title);
    if (actual.status === 'failed') {
      assert(!/Failed to resolve import|Cannot find module|does not provide an export|SyntaxError|ReferenceError|is not a function/.test(actual.failure));
      if (expected.cause === 'missing Loan plan tile') {
        assert(/Unable to find role=["']button["'] and name [^\n]*Loan plan/.test(actual.failure), 'Exact missing tile failure');
      } else {
        assert(/Target cannot be null|expected undefined|Cannot read properties of undefined/.test(actual.failure), 'Missing closeout value');
        assert(actual.failure.includes('clubManagerLoanPlanIntegration.test.ts:' + location + ':'), 'Exact intended assertion location');
      }
    }
  }
  assert.equal(records.filter(row => row.status === 'failed').length, 13);
  assert.equal(records.filter(row => row.status === 'passed').length, 8);
}
function fixedCases(records) {
  assert.equal(records.length, 33);
  for (const source of meta.tests) for (const title of source.sourceCaseNames)
    assert.equal(records.find(row => row.title === title)?.status, 'passed', 'Actual fixed case: ' + title);
}
const escaped = value => value.replace(/[$.*+?^{}()|[\]\\]/g, '\\$&');
if (mode === 'final') {
  const before = JSON.parse(fs.readFileSync(path.join(OUT, 'tracked-before.json'), 'utf8'));
  const generated = path.join(ROOT, 'scripts/data/lastmod.json');
  if (hash(fs.readFileSync(generated)) !== before['scripts/data/lastmod.json'].sha256)
    fs.copyFileSync(generated, path.join(OUT, 'generated-lastmod.json'));
  fs.writeFileSync(generated, git(['show', 'HEAD:scripts/data/lastmod.json']));
  const after = tracked(); put('tracked-after.json', after);
  for (const [file, state] of Object.entries(before)) if (!file.startsWith('public/'))
    assert.deepEqual(after[file], state, 'Every tracked non-generated body is held: ' + file);
  execute(ROOT, 'tracked-source-held', 'git', ['diff', '--exit-code', 'HEAD', '--', 'src', 'scripts', '.github/workflows', 'package.json', 'package-lock.json'], false);
  console.log('Loan plan final source holds: PASS. Public generation remains separately retained.');
  process.exit(0);
}
assert.equal(mode, 'methods');
put('tracked-before.json', tracked());
fs.writeFileSync(path.join(OUT, 'source-head.txt'), git(['rev-parse', 'HEAD']));
fs.writeFileSync(path.join(OUT, 'source-tree.txt'), git(['rev-parse', 'HEAD^{tree}']));
fs.writeFileSync(path.join(OUT, 'source.tar'), git(['archive', '--format=tar', 'HEAD']));
fs.writeFileSync(path.join(OUT, 'original-I.tar'), git(['archive', '--format=tar', meta.foundation]));
for (const file of meta.fixed) assert.equal(hash(fs.readFileSync(path.join(ROOT, file.path))), file.sha256, 'Selected body: ' + file.path);
const allowed = new Set([...meta.fixed.map(file => file.path), 'scripts/qa/cmLoanPlanQualification.mjs',
  'scripts/qa/cmLoanPlanSource.json', 'scripts/qa/playCmLoanPlanCard.mjs', '.github/workflows/cm-loan-plan.yml', 'docs/PROJECT-STATE.md']);
const changed = git(['diff', '--name-only', meta.foundation, 'HEAD']).toString('utf8').trim().split('\n').filter(Boolean);
assert(changed.every(file => allowed.has(file)), 'Only the declared isolated I source/QA/append-doc paths differ');
if (changed.includes('docs/PROJECT-STATE.md')) assert(fs.readFileSync(path.join(ROOT, 'docs/PROJECT-STATE.md'), 'utf8')
  .startsWith(git(['show', meta.foundation + ':docs/PROJECT-STATE.md']).toString('utf8')), 'Original doc prefix is held');
const BASE = path.join(process.env.RUNNER_TEMP || OUT, 'cm-loan-plan-original');
assert(!fs.existsSync(BASE), 'Fresh original extraction path');
fs.mkdirSync(BASE, { recursive: true });
execute(ROOT, 'extract-original', 'tar', ['-xf', path.join(OUT, 'original-I.tar'), '-C', BASE], false);
for (const file of meta.originals) assert.equal(hash(fs.readFileSync(path.join(BASE, file.path))), file.sha256, 'Exact I original body');
assert.equal(hash(fs.readFileSync(path.join(BASE, 'package-lock.json'))), hash(fs.readFileSync(path.join(ROOT, 'package-lock.json'))));
execute(BASE, 'original-install', 'npm', ['ci'], false);
execute(BASE, 'original-types', path.join(BASE, 'node_modules/.bin/tsc'), ['--noEmit', '-p', 'tsconfig.app.json']);
execute(ROOT, 'fixed-types', path.join(ROOT, 'node_modules/.bin/tsc'), ['--noEmit', '-p', 'tsconfig.app.json']);
const engine = path.join(BASE, 'src/lib/clubManager.ts'), originalEngine = fs.readFileSync(engine);
const bridge = '\n\nexport function loanPlanHostClubs(career: CareerState): string[] { return buyerPool(career); }\n';
assert(!originalEngine.toString('utf8').includes('export function loanPlanHostClubs'));
const common = meta.fixed.filter(file => file.originalBlob === null), copied = [];
const originalPaths = git(['ls-tree', '-rz', '--name-only', meta.foundation]).toString('utf8').split('\0').filter(Boolean);
const originalBefore = Object.fromEntries(originalPaths.map(file => [file, hash(fs.readFileSync(path.join(BASE, file)))]));
put('original-all-bodies-before.json', originalBefore);
try {
  for (const file of common) {
    const destination = path.resolve(BASE, file.path);
    assert(destination.startsWith(path.resolve(BASE) + path.sep), 'Copied QA path stays in its own baseline');
    assert(!fs.existsSync(destination), 'No original body is overwritten by common QA input');
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(ROOT, file.path), destination);
    copied.push(file.path);
  }
  fs.writeFileSync(engine, Buffer.concat([originalEngine, Buffer.from(bridge)]));
  fs.writeFileSync(path.join(OUT, 'baseline-reader-bridge.ts.txt'), bridge);
  fs.copyFileSync(engine, path.join(OUT, 'baseline-engine-bridged.ts'));
  put('baseline-reader-bridge.json', { original: hash(originalEngine), changed: hash(fs.readFileSync(engine)),
    scope: 'Read-only access to existing buyerPool for common observers; all old business-action/consumer bodies stay exact' });
  baselineCases(test(BASE, 'original-cases', meta.tests.filter(t => !t.path.endsWith('clubManagerLoanDevelopment.test.ts')).map(t => t.path), null, 1), BASE);
  diagnosticControls(path.join(OUT, 'original-cases.json'), path.join(OUT, 'original-cases.log'));
  put('original-qualified-red.json', { status: 'PASS', assertions: 21, intendedRed: 13, preservations: 8,
    limit: 'Old app consumers and annual seam only; new helper semantics are not claimed absent' });
} finally {
  fs.writeFileSync(engine, originalEngine);
  for (const file of copied) if (fs.existsSync(path.join(BASE, file))) fs.unlinkSync(path.join(BASE, file));
  assert.equal(hash(fs.readFileSync(engine)), hash(originalEngine), 'Whole original engine restored');
  const originalAfter = Object.fromEntries(originalPaths.map(file => [file, hash(fs.readFileSync(path.join(BASE, file)))]));
  put('original-all-bodies-after.json', originalAfter);
  assert.deepEqual(originalAfter, originalBefore, 'Every original tracked body is restored, not only the engine');
  put('baseline-restored.json', { engine: hash(fs.readFileSync(engine)), original: hash(originalEngine), commonRemoved: copied });
}
fixedCases(test(ROOT, 'fixed-cases', allFiles));
const regression = test(ROOT, 'existing-focused-cases', meta.regressionUnits);
assert(regression.length > 0 && regression.every(row => row.status === 'passed'));
const controls = [];
for (const control of meta.controls) {
  const file = path.join(ROOT, control.file), original = fs.readFileSync(file), text = original.toString('utf8');
  assert.equal(text.split(control.from).length - 1, 1, 'Unique physical fault: ' + control.name);
  const changed = text.replace(control.from, () => control.to);
  assert.notEqual(hash(changed), hash(original));
  fs.writeFileSync(path.join(OUT, control.name + '.original.txt'), original);
  fs.writeFileSync(path.join(OUT, control.name + '.changed.txt'), changed);
  let actual;
  try {
    fs.writeFileSync(file, changed);
    actual = test(ROOT, 'control-' + control.name, allFiles, '^.*(' + escaped(control.target) + '|' + escaped(meta.independent) + ')$', 1);
    const executed = actual.filter(row => ['passed', 'failed'].includes(row.status));
    assert.equal(executed.length, 2, 'One targeted assertion and one independent preservation');
    assert.equal(executed.find(row => row.title === control.target)?.status, 'failed');
    assert.equal(executed.find(row => row.title === meta.independent)?.status, 'passed');
    assert(!/SyntaxError|ReferenceError|Failed to resolve import|Cannot find module|is not a function/.test(executed.find(row => row.title === control.target).failure));
  } finally {
    fs.writeFileSync(file, original);
    const restored = hash(fs.readFileSync(file));
    controls.push({ name: control.name, before: hash(original), changed: hash(changed), restored, actual });
    put('source-controls.json', controls);
    assert.equal(restored, hash(original), 'Fault restoration is exact');
  }
}
const parity = path.join(ROOT, 'scripts/qa/cmLoanPlanParity.mjs');
execute(BASE, 'pair-baseline', process.execPath, [parity], true, 0, { CM_LOAN_PLAN_OUT: path.join(OUT, 'pairs'), CM_LOAN_PLAN_PHASE: 'baseline' });
execute(ROOT, 'pair-fixed', process.execPath, [parity], true, 0, { CM_LOAN_PLAN_OUT: path.join(OUT, 'pairs'), CM_LOAN_PLAN_PHASE: 'fixed' });
execute(ROOT, 'pair-compare', process.execPath, [parity], true, 0, {
  CM_LOAN_PLAN_OUT: path.join(OUT, 'pairs'), CM_LOAN_PLAN_PHASE: 'compare',
  CM_LOAN_PLAN_BASELINE: path.join(OUT, 'pairs/baseline.json'), CM_LOAN_PLAN_FIXED: path.join(OUT, 'pairs/fixed.json'),
});
for (const harness of meta.regressionHarnesses) {
  const output = execute(ROOT, harness, process.execPath, ['scripts/runAllSims.mjs'], true, 0, { ONLY: harness });
  assert(output.includes('All 1 harnesses green.') && !/(^|\s)(SKIP|EMPTY)(\s|$)/m.test(output), 'Actual complete existing harness closing output');
}
assert.deepEqual(tracked(), JSON.parse(fs.readFileSync(path.join(OUT, 'tracked-before.json'), 'utf8')), 'Every tracked body is restored before build');
put('methods-qualified.json', { status: 'PASS', original: '13 exact missing-consumer assertions and8preservations',
  fixed: 33, sourceControls: controls.length, copiedDiagnosticControls: 3, existingCases: regression.length, pairs: 12, copiedPairControls: 4,
  limit: 'No build, cap, pixel, joined-target or full-suite acceptance from this methods receipt' });
console.log('Loan plan methods: actual original RED, fixed33,9sourcecontrols, paired outcomes and existing focused regressions passed.');
