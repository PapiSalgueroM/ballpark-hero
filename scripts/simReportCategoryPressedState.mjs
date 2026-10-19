import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { BASE, FORM_FILES, FORM_ALIASES, CATEGORY_NAMES, CATEGORY_HUNKS, TITLES, ARM_FAULTS, TEST_SHA256,
  hash, changeCategory, invertCategory, assertOriginalAdmission, assertActualSources, assertEvidenceRoot, readPlan, sourceForArm } from './qa/reportCategoryPressedState1437.mjs';
import { OLD_ENTRIES, manifest, compatibilityPlan, assertHistoricalCaller, assertHistoricalForms, assertCompatibilityRefusals } from './qa/reportCategoryCompatibility1437.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), require = createRequire(import.meta.url);
assert(require.cache[require.resolve('./lib/offlineTransport.cjs')], 'Ordinary offline preload required'); assert.equal(process.env.SIM_NETWORK, 'offline');
const modeEnvAbsent = !Object.hasOwn(process.env, 'REPORT_CATEGORY_MODE'), outEnvAbsent = !Object.hasOwn(process.env, 'REPORT_CATEGORY_OUT');
const MODE = modeEnvAbsent ? 'fixed' : process.env.REPORT_CATEGORY_MODE; assert(['baseline', 'fixed'].includes(MODE), 'Known category mode, no empty/default alias');
const plan = readPlan(ROOT, MODE);
const evidenceRoot = outEnvAbsent ? fs.mkdtempSync(path.join(os.tmpdir(), 'report-category-evidence-')) : process.env.REPORT_CATEGORY_OUT;
assertEvidenceRoot(ROOT, evidenceRoot);
const OUT = path.join(evidenceRoot, 'unit'); assert(!fs.existsSync(OUT), 'Fresh complete unit packet'); fs.mkdirSync(OUT, { recursive: true });
const TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'report-category-modules-')), TEST = 'src/test/reportCategoryPressedState.test.tsx';
const CURRENT = ['src/test/reportDraftLifecycle.test.tsx', 'src/test/reportSubmitPendingNames.test.tsx', 'src/test/reportDetails.test.tsx', 'src/test/reportContext.test.ts'];
const FROZEN = { [TEST]: TEST_SHA256,
  [CURRENT[0]]: 'ca6774ec49cdf7fe4d64aff59deebab94bc43f9925833c4f7a9d8a631dca3255',
  [CURRENT[1]]: 'd8c33e52c1b7ce7b17381ca063e4dc68cf4ef15bbb053f10b9f23591c798386f',
  [CURRENT[2]]: '83efff246dabc5294e77c75064f9735d9a9e581e5cbc92201b8267ff0293fda0',
  [CURRENT[3]]: '80f5bd81af3508708920c676b20b7022344c4b473cdb585eb42da25fb594bec3',
  'src/hooks/useReportDraftLifecycle.ts': '3dc1871d8af5678e4c6271e33010fa4662c6b7fc3e38843a225a218d79f5565f',
  'scripts/qa/reportSubmitPendingNames1433.mjs': '8d74e843f16a4a8c3e715c702fdcb6454abe72edf169f8743feef6d38fbe76ed' };
const runtimeAliases = { 'react/jsx-dev-runtime': require.resolve('react/jsx-dev-runtime'), 'react/jsx-runtime': require.resolve('react/jsx-runtime'), react: require.resolve('react'), 'lucide-react': require.resolve('lucide-react') };
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2));
const clean = value => value.replace(/\u001b\[[0-9;]*m/g, '');
const noUnhandled = value => assert(!/Unhandled\s+(?:Errors?|Rejections?)|Uncaught\s+Exceptions?|SIM_OFFLINE_BLOCK/i.test(value), 'No unhandled, setup or blocked IO credit');
const git = args => { const read = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }); assert.ifError(read.error); assert.equal(read.status, 0); return read.stdout; };
const sourceState = () => {
  const names = git(['ls-files', '-z', '--cached', '--others', '--exclude-standard']).split('\0').filter(Boolean).sort(); assert.equal(new Set(names).size, names.length);
  return { files: Object.fromEntries(names.map(file => [file, hash(fs.readFileSync(path.join(ROOT, file)))])), status: git(['status', '--porcelain=v1', '--untracked-files=all']) };
};
const before = sourceState(); write(path.join(OUT, 'source-before.json'), before);
for (const [file, expected] of Object.entries(FROZEN)) assert.equal(before.files[file], expected, `Complete frozen source ${file}`);
const compatibility = compatibilityPlan(ROOT);
const summary = { version: 1, scope: 'report-category-pressed-state', status: 'running', base: BASE, mode: MODE, modeEnvAbsent, outEnvAbsent, originalAdmission: plan.originalAdmission,
  forms: { actualSha256: plan.actualSha256, originalSha256: plan.originalSha256, fixedSha256: plan.fixedSha256, wholeInverse: plan.wholeInverse },
  frozenTestSha256: TEST_SHA256, arms: [], modules: [], controls: [], refusals: [], current: null, historical: [], compatibility: { methodInverses: compatibility.methodInverses, formInverses: compatibility.formInverses }, productQualified: false };
function rawCases(raw, total, failed, files) {
  assert.equal(raw.numTotalTests, total); assert.equal(raw.numPassedTests, total - failed); assert.equal(raw.numFailedTests, failed); assert.equal(raw.numPendingTests, 0); assert.equal(raw.numTodoTests, 0); assert.equal(raw.testResults.length, files);
  assert.equal(raw.numRuntimeErrorTestSuites || 0, 0); assert.equal(raw.numUnhandledErrors || 0, 0); if (raw.unhandledErrors !== undefined) assert.deepEqual(raw.unhandledErrors, []);
  const cases = raw.testResults.flatMap(file => file.assertionResults); assert.equal(cases.length, total); assert(cases.every(test => ['passed', 'failed'].includes(test.status))); return cases;
}
function child(directory, args, env, timeout, deferHistoricalValidation = false) {
  if (deferHistoricalValidation) assert(args.length === 1 && OLD_ENTRIES.includes(args[0]), 'Only the owned historical default acquisition may defer process validation');
  fs.mkdirSync(directory, { recursive: true }); const receipt = path.join(directory, 'transport.transport'); fs.writeFileSync(receipt, '');
  const result = spawnSync(process.execPath, args, { cwd: ROOT, env: { ...env, SIM_OFFLINE_RECEIPT: receipt }, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024, timeout });
  fs.writeFileSync(path.join(directory, 'stdout.log'), result.stdout || ''); fs.writeFileSync(path.join(directory, 'stderr.log'), result.stderr || '');
  write(path.join(directory, 'process.json'), { executable: process.execPath, args, cwd: ROOT, timeout, exitCode: result.status, signal: result.signal, error: result.error ? { name: result.error.name, message: result.error.message, code: result.error.code } : null, stdoutSha256: hash(result.stdout || ''), stderrSha256: hash(result.stderr || ''), transportBytes: fs.statSync(receipt).size });
  if (!deferHistoricalValidation) { assert.ifError(result.error); assert.equal(result.signal, null); assert.equal(fs.statSync(receipt).size, 0); noUnhandled((result.stdout || '') + (result.stderr || '')); }
  return result;
}
function vitest(name, tests, failed, aliases = {}, bare = false) {
  const directory = path.join(OUT, name), report = path.join(directory, 'vitest.json'), env = { ...process.env, REPORT_CATEGORY_TRACE_DIR: directory };
  if (bare) delete env.NO_DOUBLE_SWAP; else env.NO_DOUBLE_SWAP = JSON.stringify({ ...runtimeAliases, ...aliases });
  const args = ['node_modules/vitest/vitest.mjs', 'run', ...tests, '--maxWorkers=1', '--no-file-parallelism', '--reporter=json', '--outputFile=' + report];
  const result = child(directory, args, env, 180000); assert.equal(result.status, failed ? 1 : 0, `${name}: precise expected process exit`);
  const raw = JSON.parse(fs.readFileSync(report, 'utf8')); return { directory, raw, cases: rawCases(raw, tests.length === 1 ? 6 : 44, failed, tests.length) };
}
function pressedValue(arm, surface, visual) {
  const omitted = MODE === 'baseline' || arm === 'whole-original' || arm === `${surface === 0 ? 'footer' : 'game'}-omission`;
  const inverted = arm === `${surface === 0 ? 'footer' : 'game'}-inverted`;
  return omitted ? null : String(inverted ? !visual : visual);
}
function validateTrace(trace, arm) {
  assert.equal(trace.version, 1); assert.equal(trace.scope, 'report-category-pressed-state'); assert.equal(trace.nativeKeyboardCredit, false);
  assert.equal(trace.unitClock, '2026-10-19T14:00:00.000Z with owned timer advancement');
  assert.deepEqual(trace.cases.map(row => row.name), TITLES.map(title => title.replace(' category state ', ' category state > ')));
  const phases = [
    ['initial', 'optional-ready', 'success', 'success-1499', 'reset-closed', 'reset-reopened'],
    ['initial', 'selected-bug', 'switched-idea', 'repeated-idea', 'closed', 'reopened', 'retained-idea'],
    ['initial', 'selected-bug', 'pending-relay', 'newer-pending', 'pending-fallback', 'older-failure-settled', 'current-error', 'success', 'success-1499', 'reset-closed', 'reset-reopened'],
  ];
  for (const [index, row] of trace.cases.entries()) {
    const surface = index < 3 ? 0 : 1, test = index % 3;
    assert.deepEqual(row.beforeStores, [[['report-category-held-save', '{"career":"held"}']], [['report-category-held-session', 'held']]]); assert.deepEqual(row.afterStores, row.beforeStores);
    assert.deepEqual(row.phases.map(value => value.phase), phases[test]);
    for (const phase of [...row.phases, { state: row.beforeCleanup }, { state: row.afterCleanup }]) {
      const state = phase.state; assert.deepEqual(state.stores, row.beforeStores);
      if (state.categories.length) {
        assert.deepEqual(state.categories.map(button => button.text), CATEGORY_NAMES[surface]);
        assert.deepEqual(state.categories.map(button => button.name), CATEGORY_NAMES[surface]);
        for (const button of state.categories) { assert.equal(button.tag, 'BUTTON'); assert.equal(button.roleAttribute, null); assert.equal(button.pressed, pressedValue(arm, surface, button.visual)); assert.equal(button.connected, true); assert.equal(button.disabled, false); }
        assert(state.categories.filter(button => button.visual).length <= 1);
      }
      if (state.submit) assert.equal(state.submit.name, surface === 0 ? 'Send report' : 'Submit Report');
    }
    const initial = row.phases[0].state; assert.equal(initial.categories.filter(button => button.visual).length, 0); assert.equal(initial.submit.disabled, true); assert.equal(initial.pendingIO, 0); assert.deepEqual(initial.relay, []); assert.deepEqual(initial.inserts, []);
    assert.deepEqual(initial.categories.map(button => button.initialIdentity), CATEGORY_NAMES[surface].map((_, i) => i));
    const observations = row.purposeObservations; assert.equal(observations.length, test === 0 ? 0 : 4);
    if (test !== 0) {
      assert.deepEqual(observations.map(value => value.selected), ['Bug', 'Idea', 'Idea', 'Idea']);
      for (const observation of observations) { assert.equal(observation.actual, pressedValue(arm, surface, true)); assert.deepEqual(observation.values, CATEGORY_NAMES[surface].map(name => ({ name, pressed: pressedValue(arm, surface, name === observation.selected) }))); }
      const selected = row.phases.find(value => value.phase === 'selected-bug').state; assert.equal(selected.categories.find(button => button.visual).text, 'Bug'); assert.equal(selected.categories.find(button => button.visual).focused, true);
      assert.deepEqual(selected.categories.map(button => button.identity), initial.categories.map(button => button.identity));
    }
    if (test === 1) {
      const switched = row.phases[2].state, repeated = row.phases[3].state;
      assert.deepEqual(switched, repeated, 'Repeating a current category preserves its complete identity, focus, draft, timer and IO state');
      assert.equal(row.beforeCleanup.relay.length, 0); assert.equal(row.beforeCleanup.inserts.length, 0); assert.equal(row.beforeCleanup.details, 'Fictional retained draft');
    } else {
      assert.equal(row.beforeCleanup.details, ''); assert.equal(row.beforeCleanup.relay.length, test === 0 ? 1 : 3); assert.equal(row.beforeCleanup.inserts.length, test === 0 ? 0 : 2);
      const first = row.beforeCleanup.relay[0]; assert.equal(first[0], 'report-relay'); assert.equal(first.length, 2);
      assert.equal(first[1].body.description, test === 0 ? 'Fictional optional report' : 'Bug: Fictional captured report');
      assert.equal(first[1].body.game_type, surface === 0 ? 'site' : 'perfect-season-nba'); assert.equal(first[1].body.game_context.source, surface === 0 ? 'footer-report-button' : 'game-report-button');
      assert.equal(first[1].body.game_context.path, '/perfect-season-nba'); assert.equal(first[1].body.game_context.submittedAt, '2026-10-19T14:00:00.000Z');
      if (test === 2) {
        const byPhase = Object.fromEntries(row.phases.map(value => [value.phase, value.state]));
        assert.equal(byPhase['pending-relay'].pendingIO, 1); assert.equal(byPhase['pending-relay'].submit.disabled, true); assert.equal(byPhase['pending-relay'].submit.spinnerCount, 1);
        assert.equal(byPhase['newer-pending'].details, 'Fictional newer draft'); assert.equal(byPhase['newer-pending'].submit.identity, byPhase['pending-relay'].submit.identity);
        assert.equal(byPhase['pending-fallback'].pendingIO, 1); assert.deepEqual(byPhase['pending-fallback'].inserts, [[first[1].body]]);
        assert.equal(byPhase['older-failure-settled'].status, 'idle'); assert.equal(byPhase['current-error'].status, 'error');
        assert.equal(row.beforeCleanup.relay[1][1].body.description, 'Idea: Fictional newer draft'); assert.deepEqual(row.beforeCleanup.relay[2], row.beforeCleanup.relay[1]);
        assert.deepEqual(row.beforeCleanup.inserts, [[first[1].body], [row.beforeCleanup.relay[1][1].body]]);
      }
    }
    assert.equal(row.beforeCleanup.pendingIO, 0); assert.equal(row.afterCleanup.pendingIO, 0); assert.equal(row.afterCleanup.timers, 0); assert.equal(row.afterCleanup.dialog, false); assert.deepEqual(row.afterCleanup.categories, []);
  }
}
function runArm(name, faults, aliases = {}, bare = false) {
  const run = vitest(name, [TEST], faults.length, aliases, bare); assert.deepEqual(run.cases.map(test => test.fullName), TITLES);
  const failures = run.cases.filter(test => test.status === 'failed'); assert.deepEqual(failures.map(test => test.fullName), faults.map(index => TITLES[index]));
  for (const test of failures) {
    assert.equal(test.failureMessages.length, 1); const message = clean(test.failureMessages[0]);
    assert(message.startsWith('AssertionError: The actual selected category must expose native pressed state:'), 'Only frozen leading selected-state purpose faults are accepted');
    assert(!/TestingLibraryElementError|Test timed out|Cannot find module|Failed to resolve import|Transform failed|ReferenceError|SyntaxError|TypeError/.test(message), 'No preparation or runtime error credit');
    assert.match(message, /src\/test\/reportCategoryPressedState\.test\.tsx:/);
  }
  const traceFile = path.join(run.directory, 'trace.json'), trace = JSON.parse(fs.readFileSync(traceFile, 'utf8')); validateTrace(trace, name);
  summary.arms.push({ name, cases: 6, passed: 6 - faults.length, failed: faults.length, faultIndices: faults, bare, noDoubleSwap: !bare, traceSha256: hash(fs.readFileSync(traceFile)), reportSha256: hash(fs.readFileSync(path.join(run.directory, 'vitest.json'))), failures: failures.map(test => ({ name: test.fullName, messages: test.failureMessages })) }); return trace;
}
function aliasesFor(name, bodies) {
  const aliases = {};
  for (const [index, file] of FORM_FILES.entries()) {
    if (name !== 'restored' && bodies[file] === plan.actualForms[file]) continue;
    const filename = name + '-' + path.basename(file), copy = path.join(TEMP, filename); fs.writeFileSync(copy, bodies[file]); fs.writeFileSync(path.join(OUT, filename), bodies[file]); aliases[FORM_ALIASES[index]] = copy;
    summary.modules.push({ arm: name, source: file, file: filename, sha256: hash(bodies[file]) });
  }
  summary.controls.push({ arm: name, sourceSha256: Object.fromEntries(FORM_FILES.map(file => [file, hash(bodies[file])])), actualChangedFiles: FORM_FILES.filter(file => bodies[file] !== plan.actualForms[file]) }); return aliases;
}
function retainRefusal(row, body) {
  const directory = path.join(OUT, 'refusals'); fs.mkdirSync(directory, { recursive: true });
  const stem = 'refusal-' + String(summary.refusals.length).padStart(2, '0');
  const relative = 'refusals/' + stem + (Array.isArray(body) ? '.json' : '.txt'), text = Array.isArray(body) ? JSON.stringify(body, null, 2) : body;
  fs.writeFileSync(path.join(OUT, relative), text); summary.refusals.push({ ...row, changedFile: relative, changedBytes: Buffer.byteLength(text), retainedSha256: hash(text) });
}
function refusals() {
  for (const hunk of CATEGORY_HUNKS) for (const direction of ['forward', 'inverse']) {
    const source = direction === 'forward' ? plan.originalForms[hunk.file] : plan.fixedForms[hunk.file], anchor = direction === 'forward' ? hunk.original : hunk.fixed;
    for (const [kind, changed] of [['missing', source.replace(anchor, '')], ['doubled', source + anchor], ['altered', source.replace(anchor, anchor.replace('key=', 'data-key='))], ['unrelated', source + '\n']]) {
      assert.notEqual(changed, source); assert.throws(() => changeCategory(changed, hunk, direction)); retainRefusal({ file: hunk.file, direction, kind, changedSha256: hash(changed), refused: true }, changed);
    }
    const fixed = plan.fixedForms[hunk.file], inverted = invertCategory(fixed, hunk); assert.notEqual(inverted, fixed);
    for (const [kind, changed] of [['missing-equality', fixed.replace('aria-pressed=', 'data-pressed=')], ['unrelated-inversion-source', fixed + '\n']]) { assert.notEqual(changed, fixed); assert.throws(() => invertCategory(changed, hunk)); retainRefusal({ file: hunk.file, kind, changedSha256: hash(changed), refused: true }, changed); }
  }
  for (const mode of ['', 'normal', 'unknown']) { assert.throws(() => readPlan(ROOT, mode)); summary.refusals.push({ kind: 'unknown-mode', value: mode, refused: true }); }
  for (const arm of ['', 'bare', 'unknown']) { assert.throws(() => sourceForArm(plan, arm)); summary.refusals.push({ kind: 'unknown-arm', value: arm, refused: true }); }
  for (const admission of [null, {}, { status: 'PASS', scope: 'wrong', productAdopted: false }]) { assert.throws(() => assertOriginalAdmission({ ...plan, originalAdmission: admission })); summary.refusals.push({ kind: 'admission', value: admission, refused: true }); }
  for (const file of FORM_FILES) { const changed = { ...plan.actualForms, [file]: plan.actualForms[file] + '\n' }; assert.notEqual(changed[file], plan.actualForms[file]); assert.throws(() => assertActualSources(plan, changed)); retainRefusal({ file, kind: 'actual-source-drift', changedSha256: hash(changed[file]), refused: true }, changed[file]); }
  for (const value of ['', '.', ROOT, path.join(ROOT, 'forbidden-evidence')]) { assert.throws(() => assertEvidenceRoot(ROOT, value)); summary.refusals.push({ kind: 'output-boundary', value, refused: true }); }
  assert.throws(() => assertEvidenceRoot(ROOT, evidenceRoot)); summary.refusals.push({ kind: 'output-reuse', refused: true });
  const entry = path.join(ROOT, OLD_ENTRIES[0]), argv = [process.execPath, entry];
  for (const key of ['REPORT_DRAFT_MODE', 'REPORT_DRAFT_OUT', 'REPORT_PENDING_NAMES_MODE', 'REPORT_PENDING_NAMES_OUT']) { const env = { [key]: 'drift' }; assert.throws(() => assertHistoricalCaller(ROOT, entry, argv, env)); summary.refusals.push({ kind: 'historical-env-drift', key, refused: true }); }
  assert.throws(() => assertHistoricalCaller(ROOT, path.join(ROOT, 'scripts/unknown.mjs'), argv, {})); summary.refusals.push({ kind: 'historical-unknown-caller', refused: true });
  assert.throws(() => assertHistoricalCaller(ROOT, entry, [process.execPath, path.join(ROOT, OLD_ENTRIES[1])], {})); summary.refusals.push({ kind: 'historical-indirect-caller', refused: true });
  assert.throws(() => assertHistoricalCaller(ROOT, entry, [...argv, '--unexpected'], {})); summary.refusals.push({ kind: 'historical-extra-argv', refused: true });
  for (const bodies of [[plan.originalForms[FORM_FILES[0]], plan.fixedForms[FORM_FILES[1]]], FORM_FILES.map(file => plan.actualForms[file] + '\n')]) { assert.throws(() => assertHistoricalForms(bodies)); retainRefusal({ kind: 'historical-whole-source-drift', changedSha256: bodies.map(hash), refused: true }, bodies); }
  for (const { changedSource, ...row } of assertCompatibilityRefusals(ROOT)) retainRefusal(row, changedSource);
  const tree = path.join(TEMP, 'manifest-control'); fs.mkdirSync(tree); fs.mkdirSync(path.join(tree, 'empty'));
  const body = 'owned manifest control1437\n'; fs.writeFileSync(path.join(tree, 'ordinary.txt'), body);
  const positive = manifest(tree); assert.deepEqual(positive, [{ file: 'empty', type: 'directory', bytes: 0, sha256: null }, { file: 'ordinary.txt', type: 'file', bytes: Buffer.byteLength(body), sha256: hash(body) }]);
  const link = path.join(tree, 'unexpected-link'); fs.symlinkSync('ordinary.txt', link); assert(fs.lstatSync(link).isSymbolicLink()); assert.equal(fs.readdirSync(tree).length, 3);
  assert.throws(() => manifest(tree), /Every complete-tree member must be an ordinary file or directory/); fs.unlinkSync(link); const recovered = manifest(tree); assert.deepEqual(recovered, positive);
  const controlFile = 'refusals/manifest-tree-control.json'; write(path.join(OUT, controlFile), { body, before: positive, mutation: { link: 'unexpected-link', target: 'ordinary.txt', symbolicLink: true, positiveEntryCount: 2, changedEntryCount: 3 }, after: recovered, refused: true, linkRemoved: !fs.existsSync(link) });
  summary.refusals.push({ kind: 'manifest-symbolic-link', refused: true, controlFile, controlSha256: hash(fs.readFileSync(path.join(OUT, controlFile))) });
  for (const [index, row] of summary.refusals.entries()) if (!row.changedFile) {
    const relative = 'refusals/input-' + String(index).padStart(2, '0') + '.json'; write(path.join(OUT, relative), row); row.inputFile = relative; row.inputSha256 = hash(fs.readFileSync(path.join(OUT, relative)));
  }
}
function historicalDefault(index) {
  const directory = path.join(OUT, 'historical', index === 0 ? 'draft1426' : 'pending1433'), env = { ...process.env };
  for (const key of ['REPORT_DRAFT_MODE', 'REPORT_DRAFT_OUT', 'REPORT_PENDING_NAMES_MODE', 'REPORT_PENDING_NAMES_OUT']) delete env[key];
  const owned = name => name.startsWith('report-category-historical-') && !name.startsWith('report-category-historical-tree-');
  const prior = new Set(fs.readdirSync(os.tmpdir()).filter(owned));
  const result = child(directory, [OLD_ENTRIES[index]], env, 1800000, true);
  const fresh = fs.readdirSync(os.tmpdir()).filter(name => owned(name) && !prior.has(name)), acquisitions = [];
  for (const name of fresh) {
    const actual = path.resolve(os.tmpdir(), name), copy = fresh.length === 1 ? path.join(directory, 'evidence') : path.join(directory, 'failed-evidence', name);
    const acquisition = { name, actual, copied: path.relative(directory, copy), acquired: false, originalRetained: true }; acquisitions.push(acquisition);
    try {
      assert.equal(path.dirname(actual), path.resolve(os.tmpdir())); assert(owned(path.basename(actual))); assert.equal(fs.realpathSync(actual), actual);
      const tree = manifest(actual); fs.mkdirSync(path.dirname(copy), { recursive: true }); fs.cpSync(actual, copy, { recursive: true, errorOnExist: true }); assert.deepEqual(manifest(copy), tree);
      const treeFile = fresh.length === 1 ? 'copied-tree.json' : 'copied-tree-' + name + '.json'; write(path.join(directory, treeFile), tree);
      acquisition.acquired = true; acquisition.treeFile = treeFile; acquisition.entries = tree.length;
      fs.rmSync(actual, { recursive: true, force: true }); assert(!fs.existsSync(actual)); acquisition.originalRetained = false;
    } catch (error) { acquisition.failure = { name: error.name, message: error.message, stack: error.stack }; }
  }
  write(path.join(directory, 'acquisition.json'), { prior: [...prior], fresh, acquisitions, processValidationDeferredUntilAcquisition: true });
  assert.ifError(result.error); assert.equal(result.signal, null); assert.equal(fs.statSync(path.join(directory, 'transport.transport')).size, 0); noUnhandled((result.stdout || '') + (result.stderr || '')); assert.equal(result.status, 0);
  assert.equal(acquisitions.length, 1); assert(acquisitions[0].acquired && !acquisitions[0].originalRetained, 'Complete actual wrapper acquired before validation');
  const rows = (result.stdout || '').trim().split('\n').filter(Boolean).map(line => { try { return JSON.parse(line); } catch { return null; } }).filter(row => row?.kind === 'report-category-historical-default');
  assert.equal(rows.length, 1); const metadata = rows[0]; assert.equal(metadata.status, 'passed'); assert.equal(metadata.entry, OLD_ENTRIES[index]); assert.equal(metadata.modeEnvAbsent, true); assert.equal(metadata.outEnvAbsent, true); assert.equal(metadata.historicalSourceReplay, true);
  assert.equal(metadata.evidenceRoot, acquisitions[0].actual); const copy = path.join(directory, acquisitions[0].copied), tree = manifest(copy);
  const value = JSON.parse(fs.readFileSync(path.join(copy, 'summary.json'), 'utf8')); assert.equal(hash(fs.readFileSync(path.join(copy, 'summary.json'))), metadata.summarySha256);
  assert.equal(value.status, 'passed'); assert.equal(value.current44Credit, false); assert.equal(value.actualCurrentCategoryProof, false); assert.equal(value.sourceHeld, true); assert.equal(value.childTreeRemoved, true); assert.equal(value.actualDefaultPacketsRemoved, true);
  assert.deepEqual(value.methodInverses, compatibility.methodInverses); assert.deepEqual(value.formInverses, compatibility.formInverses);
  summary.historical.push({ entry: OLD_ENTRIES[index], packet: path.relative(evidenceRoot, copy), actualDirectory: acquisitions[0].actual, wholeTreeFiles: tree.filter(row => row.type === 'file').length, wholeTreeEntries: tree.length, summarySha256: metadata.summarySha256, modeEnvAbsent: true, outEnvAbsent: true, historicalSourceReplay: true, actualCurrentCategoryProof: false, historical: value.historical, copiedActualPacketRemoved: true });
}
let failure;
try {
  refusals();
  if (MODE === 'baseline') { const normal = runArm('normal', ARM_FAULTS.baseline); assert.deepEqual(runArm('bare', ARM_FAULTS.baseline, {}, true), normal, 'Original normal/bare whole traces agree'); }
  else {
    const normal = runArm('normal', []); assert.deepEqual(runArm('bare', [], {}, true), normal, 'Fixed normal/bare whole traces agree');
    for (const name of ['whole-original', 'footer-omission', 'game-omission', 'footer-inverted', 'game-inverted']) runArm(name, ARM_FAULTS[name], aliasesFor(name, sourceForArm(plan, name)));
    assert.deepEqual(runArm('restored', [], aliasesFor('restored', sourceForArm(plan, 'restored'))), normal, 'Executed complete restored-source traces agree');
  }
  const current = vitest('current44', CURRENT, 0); assert.deepEqual(current.raw.testResults.map(file => path.basename(file.name)).sort(), CURRENT.map(file => path.basename(file)).sort());
  assert.deepEqual(current.raw.testResults.map(file => ({ file: path.basename(file.name), count: file.assertionResults.length })).sort((a, b) => a.file.localeCompare(b.file)), CURRENT.map((file, index) => ({ file: path.basename(file), count: [14, 6, 19, 5][index] })).sort((a, b) => a.file.localeCompare(b.file)));
  summary.current = { cases: 44, passed: 44, failed: 0, files: CURRENT, sourceSha256: plan.actualSha256, currentSource: true, sourceInverted: false, reportSha256: hash(fs.readFileSync(path.join(current.directory, 'vitest.json'))) };
  historicalDefault(0); historicalDefault(1); summary.historicalDisclosure = 'Separate exact historical replay: direct1426 84 cases;1433 36 six-case arms plus38 repeated historical regressions plus nested1426 84 repeated cases. None replaces actual-current44.'; summary.status = 'passed';
} catch (error) { failure = error; summary.status = 'failed'; summary.failure = { name: error.name, message: error.message, stack: error.stack }; }
finally {
  fs.rmSync(TEMP, { recursive: true, force: true }); assert(!fs.existsSync(TEMP), 'All disposable category modules removed');
  const after = sourceState(); write(path.join(OUT, 'source-after.json'), after); assert.deepEqual(after, before, 'Every actual source byte, membership and Git status held');
  summary.sourceBefore = before.files; summary.sourceAfter = after.files; summary.sourceHeld = true; summary.temporaryModulesRemoved = true; write(path.join(OUT, 'summary.json'), summary);
}
if (failure) throw failure;
console.log(JSON.stringify({ kind: 'report-category-pressed-state-result', mode: MODE, evidenceRoot, modeEnvAbsent, outEnvAbsent, summarySha256: hash(fs.readFileSync(path.join(OUT, 'summary.json'))), sourceHeld: true, temporaryModulesRemoved: true, actualCurrentCases: 44, historicalSourceReplay: true, productQualified: false }));
