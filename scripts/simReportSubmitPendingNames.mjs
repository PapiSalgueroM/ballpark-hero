import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { BASE, FORM_FILES, FORM_ALIASES, LABELS, LABEL_HUNKS, TITLES, ARM_FAULTS, TEST_SHA256,
  LEGACY_BRIDGE, hash, changeLabel, readPlan, sourceForArm } from './qa/reportSubmitPendingNames1433.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
assert(require.cache[require.resolve('./lib/offlineTransport.cjs')], 'Ordinary offline preload must be active');
assert.equal(process.env.SIM_NETWORK, 'offline', 'Ordinary offline transport mode must be active');
const modeEnvAbsent = !Object.hasOwn(process.env, 'REPORT_PENDING_NAMES_MODE');
const outEnvAbsent = !Object.hasOwn(process.env, 'REPORT_PENDING_NAMES_OUT');
const MODE = process.env.REPORT_PENDING_NAMES_MODE || 'fixed';
const plan = readPlan(ROOT, MODE);
const evidenceRoot = process.env.REPORT_PENDING_NAMES_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'report-submit-pending-names-evidence-'));
assert(path.isAbsolute(evidenceRoot) && path.resolve(evidenceRoot) !== ROOT && !path.resolve(evidenceRoot).startsWith(ROOT + path.sep), 'Evidence must be absolute and outside checkout');
const OUT = path.join(evidenceRoot, 'unit');
assert(!fs.existsSync(OUT), 'Fresh unit evidence directory'); fs.mkdirSync(OUT, { recursive: true });
const TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'report-submit-pending-names-modules-'));
const TEST = 'src/test/reportSubmitPendingNames.test.tsx';
const OLD = 'scripts/simReportDraftLifecycle.mjs';
const CURRENT = ['src/test/reportDraftLifecycle.test.tsx', 'src/test/reportDetails.test.tsx', 'src/test/reportContext.test.ts'];
const OLD_SHA = 'fb90e2764e7949f28dc3a938145e9a9ee147f3147d9974d043d8fd1703dbbd59';
const FROZEN = { [TEST]: TEST_SHA256,
  [CURRENT[0]]: 'ca6774ec49cdf7fe4d64aff59deebab94bc43f9925833c4f7a9d8a631dca3255',
  [CURRENT[1]]: '83efff246dabc5294e77c75064f9735d9a9e581e5cbc92201b8267ff0293fda0',
  [CURRENT[2]]: '80f5bd81af3508708920c676b20b7022344c4b473cdb585eb42da25fb594bec3',
  'src/hooks/useReportDraftLifecycle.ts': '3dc1871d8af5678e4c6271e33010fa4662c6b7fc3e38843a225a218d79f5565f' };
const runtimeAliases = { 'react/jsx-dev-runtime': require.resolve('react/jsx-dev-runtime'), 'react/jsx-runtime': require.resolve('react/jsx-runtime'),
  react: require.resolve('react'), 'lucide-react': require.resolve('lucide-react') };
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2));
const clean = value => value.replace(/\u001b\[[0-9;]*m/g, '');
const noUnhandled = text => assert(!/Unhandled\s+(?:Errors?|Rejections?)|Uncaught\s+Exceptions?|SIM_OFFLINE_BLOCK/i.test(text), 'No unhandled error or blocked IO credit');
const readGit = (ref, file) => {
  const result = spawnSync('git', ['show', `${ref}:${file}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  assert.ifError(result.error); assert.equal(result.status, 0, `Read exact Git source ${file}`); return result.stdout;
};
const sourceState = () => {
  const listed = spawnSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  assert.ifError(listed.error); assert.equal(listed.status, 0);
  const names = listed.stdout.split('\0').filter(Boolean).sort(); assert.equal(new Set(names).size, names.length);
  const status = spawnSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  assert.ifError(status.error); assert.equal(status.status, 0);
  return { files: Object.fromEntries(names.map(file => [file, hash(fs.readFileSync(path.join(ROOT, file)))])), status: status.stdout };
};
const before = sourceState(); write(path.join(OUT, 'source-before.json'), before);
for (const [file, expected] of Object.entries(FROZEN)) assert.equal(before.files[file], expected, `Frozen source ${file}`);
const summary = { version: 1, status: 'running', mode: MODE, originalAdmission: plan.originalAdmission, forms: {
  originalSha256: plan.originalSha256, fixedSha256: plan.fixedSha256, actualSha256: plan.actualSha256, wholeInverse: plan.wholeInverse },
  frozenTestSha256: TEST_SHA256, modeEnvAbsent, outEnvAbsent, arms: [], controls: [], modules: [], refusals: [], current: null, legacy: null,
  productQualified: false };

function rawCases(result, total, passed, failed, files) {
  assert.equal(result.numTotalTests, total); assert.equal(result.numPassedTests, passed); assert.equal(result.numFailedTests, failed);
  assert.equal(result.numPendingTests, 0); assert.equal(result.numTodoTests, 0); assert.equal(result.testResults.length, files);
  assert.equal(result.numRuntimeErrorTestSuites || 0, 0); assert.equal(result.numUnhandledErrors || 0, 0);
  if (result.unhandledErrors !== undefined) assert.deepEqual(result.unhandledErrors, []);
  const cases = result.testResults.flatMap(file => file.assertionResults);
  assert.equal(cases.length, total); assert.equal(cases.filter(test => test.status === 'passed').length, passed);
  assert.equal(cases.filter(test => test.status === 'failed').length, failed);
  assert(cases.every(test => ['passed', 'failed'].includes(test.status)), 'Only completed raw cases');
  return cases;
}
function child(directory, args, env, timeout) {
  fs.mkdirSync(directory, { recursive: true });
  const receipt = path.join(directory, 'transport.transport'); fs.writeFileSync(receipt, '');
  const result = spawnSync(process.execPath, args, { cwd: ROOT, env: { ...env, SIM_OFFLINE_RECEIPT: receipt }, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout });
  fs.writeFileSync(path.join(directory, 'stdout.log'), result.stdout || ''); fs.writeFileSync(path.join(directory, 'stderr.log'), result.stderr || '');
  write(path.join(directory, 'process.json'), { executable: process.execPath, args, cwd: ROOT, timeout, exitCode: result.status, signal: result.signal,
    error: result.error ? { name: result.error.name, message: result.error.message, code: result.error.code } : null,
    stdoutSha256: hash(result.stdout || ''), stderrSha256: hash(result.stderr || ''), transportBytes: fs.statSync(receipt).size });
  assert.ifError(result.error); assert.equal(result.signal, null); assert.equal(fs.statSync(receipt).size, 0);
  noUnhandled((result.stdout || '') + (result.stderr || '')); return result;
}
function vitest(name, tests, passed, failed, aliases = {}, bare = false) {
  const directory = path.join(OUT, name); const report = path.join(directory, 'vitest.json');
  const env = { ...process.env, REPORT_PENDING_NAMES_TRACE_DIR: directory };
  if (bare) delete env.NO_DOUBLE_SWAP; else env.NO_DOUBLE_SWAP = JSON.stringify({ ...runtimeAliases, ...aliases });
  const args = ['node_modules/vitest/vitest.mjs', 'run', ...tests, '--maxWorkers=1', '--no-file-parallelism', '--reporter=json', '--outputFile=' + report];
  const result = child(directory, args, env, 120000); assert.equal(result.status, failed ? 1 : 0, `${name}: exact expected exit`);
  const raw = JSON.parse(fs.readFileSync(report, 'utf8'));
  return { directory, cases: rawCases(raw, passed + failed, passed, failed, tests.length), result: raw };
}
function validateTrace(trace, faults) {
  assert.equal(trace.version, 1); assert.equal(trace.scope, 'report-submit-pending-names'); assert.deepEqual(trace.cases.map(row => row.name), TITLES);
  for (const [index, row] of trace.cases.entries()) {
    const label = LABELS[index < 3 ? 0 : 1]; const idle = index % 3 === 0; const fallback = index % 3 === 2;
    assert.deepEqual(row.beforeStores, [[['report-pending-held-save', '{"career":"held"}']], [['report-pending-held-session', 'held']]]);
    assert.deepEqual(row.afterStores, row.beforeStores);
    for (const phase of [...row.phases, { state: row.beforeCleanup }, { state: row.afterCleanup }]) assert.deepEqual(phase.state.stores, row.beforeStores);
    assert.equal(row.beforeCleanup.pendingIO, 0); assert.equal(row.afterCleanup.pendingIO, 0); assert.equal(row.afterCleanup.timers, 0); assert.equal(row.afterCleanup.dialog, false);
    if (idle) {
      assert.deepEqual(row.phases.map(value => value.phase), ['idle-empty', 'idle-filled', 'idle-whitespace']);
      for (const [i, phase] of row.phases.entries()) { assert.equal(phase.state.submit.accessibleName, label); assert.equal(phase.state.submit.disabled, i !== 1); assert.equal(phase.state.pendingIO, 0); assert.deepEqual(phase.state.relay, []); assert.deepEqual(phase.state.inserts, []); }
    } else {
      assert.deepEqual(row.phases.map(value => value.phase), ['ready', fallback ? 'pending-fallback' : 'pending-relay', 'delivery-settled']);
      const [ready, pending, settled] = row.phases.map(value => value.state);
      assert.equal(ready.submit.accessibleName, label); assert.equal(ready.submit.disabled, false); assert.equal(ready.pendingIO, 0);
      assert.equal(pending.submit.accessibleName, faults.includes(index) ? '' : label); assert.equal(pending.submit.disabled, true);
      assert.equal(pending.submit.connected, true); assert.equal(pending.submit.text, ''); assert.equal(pending.submit.spinnerCount, 1); assert.equal(pending.pendingIO, 1);
      assert.equal(pending.details, '  Fictional pending report details  '); assert.deepEqual(pending.selectedKinds, ['Bug']);
      assert.equal(pending.relay.length, 1); assert.equal(pending.relay[0][0], 'report-relay'); assert.equal(pending.relay[0].length, 2);
      const payload = pending.relay[0][1].body; assert.deepEqual(Object.keys(payload).sort(), ['description', 'game_context', 'game_type']);
      assert.equal(payload.description, 'Bug: Fictional pending report details'); assert.equal(payload.game_type, index < 3 ? 'site' : 'perfect-season-nba');
      assert.equal(payload.game_context.path, '/perfect-season-nba'); assert.equal(payload.game_context.submittedAt, '2026-10-18T14:00:00.000Z');
      assert.equal(payload.game_context.source, index < 3 ? 'footer-report-button' : 'game-report-button');
      if (index >= 3) { assert.equal(payload.game_context.phase, 'fixture'); assert.equal(payload.game_context.criterion, 'pending-name'); }
      assert(payload.game_context.diagnostics.browser); assert.deepEqual(pending.inserts, fallback ? [[payload]] : []);
      assert.equal(settled.dialog, true); assert.equal(settled.details, null); assert.equal(settled.pendingIO, 0);
      assert.deepEqual(settled.relay, pending.relay); assert.deepEqual(settled.inserts, pending.inserts);
    }
  }
}
function runArm(name, faults, aliases = {}, bare = false) {
  const run = vitest(name, [TEST], 6 - faults.length, faults.length, aliases, bare);
  assert.deepEqual(run.cases.map(test => test.fullName), TITLES);
  const failures = run.cases.filter(test => test.status === 'failed'); assert.deepEqual(failures.map(test => test.fullName), faults.map(index => TITLES[index]));
  for (const test of failures) {
    assert.equal(test.failureMessages.length, 1); const message = clean(test.failureMessages[0]);
    const index = TITLES.indexOf(test.fullName); const label = LABELS[index < 3 ? 0 : 1];
    const leading = message.split(/\n\s*❯ /u)[0].trimEnd();
    assert.equal(leading, `Error: expect(element).toHaveAccessibleName()\n\nExpected element to have accessible name:\n  ${label}\nReceived:`, `${name}: only the exact computed-name matcher fault`);
    assert.match(message, /src\/test\/reportSubmitPendingNames\.test\.tsx:127:[0-9]+/);
    assert(!/TestingLibraryElementError|Test timed out|Cannot find module|Failed to resolve import|Transform failed|ReferenceError|SyntaxError|TypeError/.test(message));
  }
  const traceFile = path.join(run.directory, 'trace.json'); const trace = JSON.parse(fs.readFileSync(traceFile, 'utf8')); validateTrace(trace, faults);
  summary.arms.push({ name, passed: 6 - faults.length, failed: faults.length, cases: 6, faultIndices: faults, bare, noDoubleSwap: !bare,
    traceSha256: hash(fs.readFileSync(traceFile)), reportSha256: hash(fs.readFileSync(path.join(run.directory, 'vitest.json'))), failures: failures.map(test => ({ name: test.fullName, messages: test.failureMessages })) });
  return trace;
}
function aliasesFor(name, bodies) {
  const aliases = {};
  for (const [index, file] of FORM_FILES.entries()) {
    if (name !== 'restored' && bodies[file] === plan.actualForms[file]) continue;
    const filename = name + '-' + path.basename(file); const copy = path.join(TEMP, filename);
    fs.writeFileSync(copy, bodies[file]); fs.writeFileSync(path.join(OUT, filename), bodies[file]); aliases[FORM_ALIASES[index]] = copy;
    summary.modules.push({ arm: name, source: file, file: filename, sha256: hash(bodies[file]) });
  }
  summary.controls.push({ arm: name, sourceSha256: Object.fromEntries(FORM_FILES.map(file => [file, hash(bodies[file])])), actualChangedFiles: FORM_FILES.filter(file => bodies[file] !== plan.actualForms[file]) });
  return aliases;
}
function refusals() {
  for (const hunk of LABEL_HUNKS) for (const direction of ['forward', 'inverse']) {
    const source = direction === 'forward' ? plan.originalForms[hunk.file] : plan.fixedForms[hunk.file];
    const anchor = direction === 'forward' ? hunk.original : hunk.fixed;
    for (const [kind, changed] of [['missing', source.replace(anchor, '')], ['altered', source.replace(anchor, anchor.replace('handleSubmit', 'alteredSubmit'))], ['duplicated', source + anchor], ['unrelated', source + '\n']]) {
      assert.notEqual(changed, source); assert.throws(() => changeLabel(changed, hunk, direction), kind === 'unrelated' ? /whole .* input source/ : /exactly one .* label anchor/);
      summary.refusals.push({ file: hunk.file, direction, kind, changedSha256: hash(changed), refused: true });
    }
  }
}
function inverseOldMethod(source) {
  assert.equal(source.split(LEGACY_BRIDGE.fixed).length, 2, 'One exact two-label legacy bridge');
  const recovered = source.replace(LEGACY_BRIDGE.fixed, LEGACY_BRIDGE.original); assert.notEqual(recovered, source);
  assert.equal(hash(recovered), OLD_SHA, 'Whole old method inverse'); assert.equal(recovered, readGit(BASE, OLD), 'Entire admitted old method held'); return recovered;
}
function oldDefault() {
  const directory = path.join(OUT, 'legacy'); const oldSource = fs.readFileSync(path.join(ROOT, OLD), 'utf8');
  const recovered = inverseOldMethod(oldSource); fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'recovered-old-method.mjs'), recovered);
  for (const [kind, changed] of [['missing', oldSource.replace(LEGACY_BRIDGE.fixed, '')], ['altered', oldSource.replace(LEGACY_BRIDGE.fixed, LEGACY_BRIDGE.fixed.replace('const admitted', 'const changed'))], ['duplicated', oldSource + LEGACY_BRIDGE.fixed], ['unrelated', oldSource + '\n']]) {
    assert.notEqual(changed, oldSource); assert.throws(() => inverseOldMethod(changed)); summary.refusals.push({ file: OLD, kind, changedSha256: hash(changed), refused: true });
  }
  const prefix = 'report-draft-evidence-'; const priorNames = fs.readdirSync(os.tmpdir()).filter(name => name.startsWith(prefix));
  const env = { ...process.env }; delete env.REPORT_DRAFT_MODE; delete env.REPORT_DRAFT_OUT;
  const result = child(directory, [OLD], env, 660000); assert.equal(result.status, 0);
  const fresh = fs.readdirSync(os.tmpdir()).filter(name => name.startsWith(prefix) && !priorNames.includes(name)); assert.equal(fresh.length, 1, 'One actual fresh old-default packet');
  const actual = path.join(os.tmpdir(), fresh[0]); const copied = path.join(directory, 'evidence'); fs.cpSync(actual, copied, { recursive: true, errorOnExist: true });
  const old = JSON.parse(fs.readFileSync(path.join(copied, 'unit/summary.json'), 'utf8'));
  assert.equal(old.mode, 'fixed'); assert.equal(old.sourceHeld, true); assert.equal(old.temporaryModulesRemoved, true);
  const arms = ['normal', 'bare', 'original', 'completion-owner', 'timer-owner', 'restored']; const failed = [0, 0, 12, 10, 2, 0];
  assert.deepEqual(old.cases.map(row => row.name), arms);
  for (const [index, arm] of arms.entries()) {
    const raw = JSON.parse(fs.readFileSync(path.join(copied, 'unit', arm + '.json'), 'utf8')); const rows = rawCases(raw, 14, 14 - failed[index], failed[index], 1);
    assert.equal(old.cases[index].passed, 14 - failed[index]); assert.equal(old.cases[index].failed, failed[index]); assert.equal(old.cases[index].pending, 0);
    assert.deepEqual(rows.filter(row => row.status === 'failed').map(row => ({ name: row.fullName, messages: row.failureMessages })), old.cases[index].failures);
    noUnhandled(fs.readFileSync(path.join(copied, 'unit', arm + '.log'), 'utf8'));
    const historicalReceipt = path.join(copied, 'unit', arm + '.transport'); if (fs.existsSync(historicalReceipt)) assert.equal(fs.statSync(historicalReceipt).size, 0);
  }
  assert.equal(old.formInverses.length, 2);
  for (const entry of old.formInverses) {
    const original = readGit('775564305e9da84dab59f2b9fe246d044a3cc8e9', entry.file);
    assert.equal(fs.readFileSync(path.join(copied, 'unit', entry.recoveredFile), 'utf8'), original);
    assert.equal(entry.recoveredSha256, hash(original)); assert.equal(entry.fixedSha256, plan.actualSha256[entry.file]); assert.equal(entry.forwardSha256, plan.actualSha256[entry.file]);
  }
  const manifest = root => fs.readdirSync(root, { recursive: true, withFileTypes: true }).filter(entry => entry.isFile()).map(entry => {
    const full = path.join(entry.parentPath, entry.name); return { file: path.relative(root, full), bytes: fs.statSync(full).size, sha256: hash(fs.readFileSync(full)) }; }).sort((a, b) => a.file.localeCompare(b.file));
  const actualTree = manifest(actual); assert.deepEqual(manifest(copied), actualTree, 'Complete old default physical packet copied'); write(path.join(directory, 'copied-tree.json'), actualTree);
  summary.legacy = { cases: 84, modeEnvAbsent: true, outEnvAbsent: true, actualDirectory: actual, copiedDirectory: path.relative(evidenceRoot, copied),
    files: actualTree.length, sourceHeld: true, temporaryModulesRemoved: true, actualCurrentForms: true, methodInverse: { actualSha256: hash(oldSource), originalSha256: OLD_SHA, recoveredSha256: hash(recovered), hunk: LEGACY_BRIDGE },
    historicalTransportContract: 'Immutable old child receipts are absent or empty; outer1433 receipt is mandatory and empty.' };
}

let failure;
try {
  refusals();
  if (MODE === 'baseline') { runArm('normal', ARM_FAULTS.baseline); runArm('bare', ARM_FAULTS.baseline, {}, true); }
  else {
    const normal = runArm('normal', []); assert.deepEqual(runArm('bare', [], {}, true), normal, 'Bare complete trace equality');
    for (const name of ['whole-original', 'footer-omission', 'game-omission']) runArm(name, ARM_FAULTS[name], aliasesFor(name, sourceForArm(plan, name)));
    assert.deepEqual(runArm('restored', [], aliasesFor('restored', sourceForArm(plan, 'restored'))), normal, 'Actually executed recovered sources have full normal traces');
  }
  const current = vitest('current', CURRENT, 38, 0); assert.deepEqual(current.result.testResults.map(file => path.basename(file.name)).sort(), CURRENT.map(file => path.basename(file)).sort());
  summary.current = { cases: 38, passed: 38, failed: 0, files: CURRENT, sourceSha256: plan.actualSha256, currentSource: true, reportSha256: hash(fs.readFileSync(path.join(current.directory, 'vitest.json'))) };
  oldDefault(); summary.status = 'passed';
} catch (error) { failure = error; summary.status = 'failed'; summary.failure = { name: error.name, message: error.message, stack: error.stack }; }
finally {
  fs.rmSync(TEMP, { recursive: true, force: true }); assert(!fs.existsSync(TEMP), 'All disposable form copies removed');
  const after = sourceState(); write(path.join(OUT, 'source-after.json'), after); assert.deepEqual(after, before, 'Every source byte, membership and Git status held');
  summary.sourceBefore = before.files; summary.sourceAfter = after.files; summary.sourceHeld = true; summary.temporaryModulesRemoved = true;
  write(path.join(OUT, 'summary.json'), summary);
}
if (failure) throw failure;
console.log(`Pending-name component proof: ${summary.arms.length} complete arms, ${summary.arms.reduce((sum, arm) => sum + arm.cases, 0)} actual cases, ${summary.arms.reduce((sum, arm) => sum + arm.failed, 0)} precise intended faults.`);
console.log('Current report regressions: all 38 actual cases passed on the current two forms.');
console.log('Complete old default: all 84 cases and effective controls completed with both old mode/output variables absent.');
console.log(`Source and cleanup: all ${Object.keys(before.files).length} file bodies, membership and Git status held; all disposable form modules removed.`);
console.log(JSON.stringify({ kind: 'report-submit-pending-names-result', mode: MODE, evidenceRoot, modeEnvAbsent, outEnvAbsent,
  summarySha256: hash(fs.readFileSync(path.join(OUT, 'summary.json'))), sourceHeld: true, temporaryModulesRemoved: true, productQualified: false }));
