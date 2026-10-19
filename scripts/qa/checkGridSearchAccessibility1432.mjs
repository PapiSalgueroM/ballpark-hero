import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { BASE, PRODUCT, TEST_FILE, TEST_SHA, ORIGINAL_SHA, FIXED_SHA, ORIGINAL_ADMISSION, TITLES, PURPOSES,
  ORIGINAL_FAULTS, CONTROLS, OLD_ENTRIES, ENTRY_PREFIX, ROLE_TESTS, hash, git, once, refuse, readPlan, sourceForArm,
  roleTestCopy, oldBody, assertEntryPrefixes, trackedSnapshot, assertSnapshot } from './gridSearchAccessibility1432.mjs';
import { assertOriginalAdmission, evidenceTree } from './gridSearchCompatibility1432.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), require = createRequire(import.meta.url);
assert(require.cache[require.resolve('../lib/offlineTransport.cjs')], 'Ordinary offline preload must be active');
assert.equal(process.env.SIM_NETWORK, 'offline');
const MODE = process.env.GRID_SEARCH_A11Y_MODE || 'fixed'; assert(['baseline', 'fixed'].includes(MODE));
const evidenceRoot = process.env.GRID_SEARCH_A11Y_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'grid-search-accessibility-evidence-'));
assert(path.isAbsolute(evidenceRoot) && path.relative(ROOT, evidenceRoot).split(path.sep).includes('..'));
const OUT = path.join(evidenceRoot, 'unit'); assert(!fs.existsSync(OUT)); fs.mkdirSync(OUT, { recursive: true });
const plan = readPlan(ROOT, MODE), before = trackedSnapshot(ROOT);
for (const arm of ['normal', 'whole-original', ...CONTROLS.map(row => row.name), 'restored']) sourceForArm(plan.original, arm);
assert.equal(hash(fs.readFileSync(path.join(ROOT, TEST_FILE))), TEST_SHA); assertEntryPrefixes(ROOT);
if (MODE === 'fixed') assertOriginalAdmission();
const runtimeAliases = { 'react/jsx-dev-runtime': require.resolve('react/jsx-dev-runtime'), 'react/jsx-runtime': require.resolve('react/jsx-runtime'),
  react: require.resolve('react'), 'lucide-react': require.resolve('lucide-react') };
const declared = TITLES.map(title => 'Soccer Grid search accessibility ' + title);
const summary = { version: 1, status: 'failed', mode: MODE, productQualified: false, fixedUnitProofPassed: false,
  scope: 'Actual current Search DOM semantics, actual current24 selector-only replay and explicitly historical old defaults. Native AX is separate.',
  actualProductSha256: hash(plan.actual), testSha256: TEST_SHA, originalAdmission: ORIGINAL_ADMISSION,
  wholeInverse: { originalSha256: ORIGINAL_SHA, fixedSha256: hash(plan.actual), recoveredSha256: ORIGINAL_SHA, hunks: MODE === 'fixed' ? plan.hunks : [] },
  reviewedPlan: { originalSha256: ORIGINAL_SHA, fixedSha256: FIXED_SHA, hunks: plan.hunks, refusals: ['missing', 'altered', 'duplicate'] },
  arms: [], controls: [], modules: [], restoredSource: null, current24: null, compatibility: [], refusalControls: [], sourceHeld: false, temporaryModulesRemoved: false };
let TEMP;
const save = () => fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2) + '\n'); save();
function child(cwd, args, env, dir, timeout = 120000) {
  fs.mkdirSync(dir); const transport = path.join(dir, 'transport.transport'); fs.writeFileSync(transport, '', { flag: 'wx' });
  const actualEnv = { ...env, SIM_OFFLINE_RECEIPT: transport }, started = Date.now();
  const value = spawnSync(process.execPath, args, { cwd, env: actualEnv, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout });
  fs.writeFileSync(path.join(dir, 'stdout.log'), value.stdout || ''); fs.writeFileSync(path.join(dir, 'stderr.log'), value.stderr || '');
  const processRecord = { status: value.status, signal: value.signal, error: value.error ? String(value.error) : null, elapsedMs: Date.now() - started,
    timeoutMs: timeout, args, modeEnvAbsent: !Object.hasOwn(actualEnv, 'GRID_SEARCH_A11Y_MODE'), outEnvAbsent: !Object.hasOwn(actualEnv, 'GRID_SEARCH_A11Y_OUT'),
    noDoubleSwapPresent: Object.hasOwn(actualEnv, 'NO_DOUBLE_SWAP') };
  fs.writeFileSync(path.join(dir, 'process.json'), JSON.stringify(processRecord, null, 2) + '\n');
  assert.ifError(value.error); assert.equal(value.signal, null); assert.equal(fs.readFileSync(transport, 'utf8'), '');
  assert(!/Unhandled\s+(?:Errors?|Rejections?)|Uncaught\s+Exceptions?/i.test((value.stdout || '') + (value.stderr || '')));
  return { ...value, processRecord };
}
function raw(dir, count, faults, names) {
  const file = path.join(dir, 'vitest.json'), value = JSON.parse(fs.readFileSync(file)), rows = value.testResults.flatMap(suite => suite.assertionResults);
  assert.equal(value.numTotalTests, count); assert.equal(value.numPassedTests, count - faults.length); assert.equal(value.numFailedTests, faults.length);
  assert.equal(value.numPendingTests, 0); assert.equal(value.numTodoTests, 0); assert.equal(value.numRuntimeErrorTestSuites || 0, 0);
  if (value.numUnhandledErrors !== undefined) assert.equal(value.numUnhandledErrors, 0); if (value.unhandledErrors !== undefined) assert.deepEqual(value.unhandledErrors, []);
  assert.equal(rows.length, count); assert.deepEqual(rows.map(row => row.fullName).sort(), [...names].sort());
  assert.deepEqual(rows.filter(row => row.status === 'failed').map(row => row.fullName).sort(), faults.map(index => names[index]).sort());
  for (const row of rows) { assert(['passed', 'failed'].includes(row.status)); if (row.status === 'passed') assert.deepEqual(row.failureMessages, []); }
  assert.equal(value.success, faults.length === 0); return { value, rows, rawSha256: hash(fs.readFileSync(file)) };
}
function run(name, faults, swaps = {}, bare = false) {
  const dir = path.join(OUT, name), env = { ...process.env, GRID_SEARCH_A11Y_TRACE_DIR: dir };
  if (bare) delete env.NO_DOUBLE_SWAP; else env.NO_DOUBLE_SWAP = JSON.stringify({ ...runtimeAliases, ...swaps });
  const result = child(ROOT, ['node_modules/vitest/vitest.mjs', 'run', TEST_FILE, '--maxWorkers=1', '--no-file-parallelism', '--reporter=json', '--outputFile=' + path.join(dir, 'vitest.json')], env, dir);
  assert.equal(result.status, faults.length ? 1 : 0); const checked = raw(dir, 8, faults, declared);
  for (const row of checked.rows.filter(row => row.status === 'failed')) {
    const index = declared.indexOf(row.fullName); assert(PURPOSES[index]); assert.equal(row.failureMessages.length, 1);
    const message = row.failureMessages[0]; assert(message.startsWith('AssertionError: ' + PURPOSES[index] + ':'), 'Only exact semantic purpose faults');
    assert(!/TestingLibraryElementError|Test timed out|Cannot find module|Failed to resolve import|Transform failed|ReferenceError|SyntaxError|TypeError/.test(message));
    const lines = fs.readFileSync(path.join(ROOT, TEST_FILE), 'utf8').split('\n').map((line, i) => ({ line, number: i + 1 })).filter(item => item.line.includes("'" + PURPOSES[index] + "'"));
    assert.equal(lines.length, 1); assert(message.includes(TEST_FILE + ':' + lines[0].number + ':'), 'Frozen intended assertion source');
  }
  const traceBytes = fs.readFileSync(path.join(dir, 'trace.json')), trace = JSON.parse(traceBytes);
  assert.equal(trace.version, 1); assert.deepEqual(trace.cases.map(row => row.name).sort(), [...TITLES].sort());
  for (const row of trace.cases) { assert.equal(row.pendingAfterCleanup, 0); assert.equal(row.beforeStores, row.afterStores); assert.equal(row.final.timers, row.pendingBeforeCleanup); }
  summary.arms.push({ name, bare, faults, passed: 8 - faults.length, failed: faults.length, pending: 0, rawSha256: checked.rawSha256, traceSha256: hash(traceBytes),
    failures: checked.rows.filter(row => row.status === 'failed').map(row => ({ name: row.fullName, messages: row.failureMessages })) }); save();
  console.log(name + ':8 actual semantic cases,' + faults.length + ' exact purpose faults,0 pending after cleanup.'); return trace;
}
function moduleCopy(name, body) {
  assert(!/^import .+ from ['"]\./m.test(body));
  const file = name + '-Search.tsx'; fs.writeFileSync(path.join(OUT, file), body); fs.writeFileSync(path.join(TEMP, file), body);
  summary.modules.push({ name, file, sha256: hash(body) }); return { '@/components/soccer-grid/SoccerGridSearch': path.join(TEMP, file) };
}
function defaults() {
  const top = path.join(evidenceRoot, 'compatibility'); fs.mkdirSync(top);
  for (const [i, file] of OLD_ENTRIES.entries()) {
    const name = i === 0 ? 'blur' : 'discovery', dir = path.join(top, name), env = { ...process.env };
    for (const key of [i === 0 ? 'SOCCER_GRID_BLUR_MODE' : 'SOCCER_GRID_SEARCH_MODE', i === 0 ? 'SOCCER_GRID_BLUR_OUT' : 'SOCCER_GRID_SEARCH_OUT']) delete env[key];
    const result = child(ROOT, [file], env, dir, 660000); assert.equal(result.status, 0);
    const lines = result.stdout.split(/\r?\n/).filter(line => line.startsWith('{"kind":"GRID_SEARCH_HISTORICAL_COMPATIBILITY_RESULT",'));
    assert.equal(lines.length, 1); const metadata = JSON.parse(lines[0]); assert.equal(metadata.status, 'passed'); assert.equal(metadata.entry, file);
    assert.equal(metadata.actualSourceSha256, hash(plan.actual)); assert.equal(metadata.historical, true); assert.equal(metadata.currentAccessibilitySource, false);
    assert.equal(metadata.modeEnvAbsent, true); assert.equal(metadata.outEnvAbsent, true); assert.equal(metadata.sourceHeld, true); assert.equal(metadata.worktreeRemoved, true);
    const actual = fs.realpathSync(metadata.evidenceRoot); assert.equal(path.dirname(actual), fs.realpathSync(os.tmpdir())); assert(path.basename(actual).startsWith('grid-search-compatibility1432-'));
    const copied = path.join(dir, 'evidence'), tree = evidenceTree(actual); fs.cpSync(actual, copied, { recursive: true, force: false, errorOnExist: true });
    assert.deepEqual(evidenceTree(copied), tree); assert.deepEqual(evidenceTree(actual), tree);
    assert.equal(hash(fs.readFileSync(path.join(copied, 'receipt.json'))), metadata.receiptSha256);
    fs.writeFileSync(path.join(dir, 'copied-tree.json'), JSON.stringify(tree, null, 2) + '\n');
    fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify(metadata, null, 2) + '\n');
    summary.compatibility.push({ entry: file, name, historical: true, currentAccessibilitySource: false, modeEnvAbsent: true, outEnvAbsent: true,
      sourceSha256: hash(plan.actual), metadata, copied: 'compatibility/' + name + '/evidence', copiedFiles: tree.length }); save();
    console.log('Historical ' + name + ' actual ordinary default packet copied completely, source and original methods held.');
  }
}
function current24() {
  const top = path.join(evidenceRoot, 'current-behavior'); fs.mkdirSync(top);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'grid-search-current1432-')), copied = path.join(temp, 'source'); let registered = false;
  const record = { status: 'failed', currentSource: true, historicalSource: false, actualProductSha256: hash(plan.actual), cases: 24, passed: 0, failed: 0, pending: 0, tests: [], removed: false, sourceHeld: false };
  try {
    git(ROOT, ['worktree', 'add', '--detach', copied, git(ROOT, ['rev-parse', 'HEAD']).toString('utf8').trim()]); registered = true;
    fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(copied, 'node_modules'), 'dir');
    assert.equal(fs.readFileSync(path.join(copied, PRODUCT), 'utf8'), plan.actual);
    for (const spec of ROLE_TESTS) {
      const original = git(ROOT, ['show', BASE + ':' + spec.file]).toString('utf8'), adapted = roleTestCopy(original, spec, MODE === 'baseline' ? 'textbox' : 'combobox');
      fs.writeFileSync(path.join(copied, spec.file), adapted.body);
      fs.writeFileSync(path.join(top, spec.name + '-original.tsx'), original); fs.writeFileSync(path.join(top, spec.name + '-copied.tsx'), adapted.body);
      fs.writeFileSync(path.join(top, spec.name + '-recovered.tsx'), original); record.tests.push({ ...spec, ...adapted, body: undefined });
    }
    const snapshot = trackedSnapshot(copied); fs.writeFileSync(path.join(top, 'source.before.json'), JSON.stringify(snapshot.files, null, 2) + '\n');
    fs.writeFileSync(path.join(top, 'members.before'), snapshot.members); fs.writeFileSync(path.join(top, 'status.before'), snapshot.status);
    const main = new Map(before.files.map(row => [row.file, row.sha256])), differences = snapshot.files.filter(row => row.sha256 !== main.get(row.file)).map(row => row.file);
    assert.deepEqual(differences.sort(), MODE === 'fixed' ? ROLE_TESTS.map(row => row.file).sort() : [], 'Only seven role selectors in two copied tests differ'); record.allowedDifference = differences;
    for (const spec of ROLE_TESTS) {
      const dir = path.join(top, spec.name), env = { ...process.env, NODE_OPTIONS: '--require=' + path.join(copied, 'scripts/lib/offlineTransport.cjs'), [spec.traceEnv]: dir }; delete env.NO_DOUBLE_SWAP;
      const result = child(copied, ['node_modules/vitest/vitest.mjs', 'run', spec.file, '--maxWorkers=1', '--no-file-parallelism', '--reporter=json', '--outputFile=' + path.join(dir, 'vitest.json')], env, dir); assert.equal(result.status, 0);
      const legacy = JSON.parse(fs.readFileSync(path.join(evidenceRoot, 'compatibility', spec.name === 'blur8' ? 'blur' : 'discovery', 'evidence/target/evidence/unit/normal/vitest.json')));
      const names = legacy.testResults.flatMap(suite => suite.assertionResults).map(row => row.fullName), checked = raw(dir, spec.count, [], names);
      const traceFile = path.join(dir, 'trace.json'), trace = JSON.parse(fs.readFileSync(traceFile));
      const historical = JSON.parse(fs.readFileSync(path.join(evidenceRoot, 'compatibility', spec.name === 'blur8' ? 'blur' : 'discovery', 'evidence/target/evidence/unit/normal/trace.json')));
      assert.deepEqual(trace, historical, 'All frozen actual healthy behavior traces retained through role-selector-only copies');
      for (const row of trace.cases) { assert.equal(row.pendingAfterCleanup, 0); if (row.beforeStores !== undefined) assert.equal(row.beforeStores, row.afterStores); }
      const entry = record.tests.find(row => row.name === spec.name); entry.rawSha256 = checked.rawSha256; entry.traceSha256 = hash(fs.readFileSync(traceFile)); entry.passed = spec.count; record.passed += spec.count;
      console.log('Actual current ' + spec.name + ':' + spec.count + ' healthy cases and complete traces held, only role selectors adapted.');
    }
    assertSnapshot(copied, snapshot); const after = trackedSnapshot(copied);
    fs.writeFileSync(path.join(top, 'source.after.json'), JSON.stringify(after.files, null, 2) + '\n'); fs.writeFileSync(path.join(top, 'members.after'), after.members); fs.writeFileSync(path.join(top, 'status.after'), after.status);
    record.status = 'passed'; record.sourceHeld = true;
  } finally {
    if (registered) git(ROOT, ['worktree', 'remove', '--force', copied]); assert(!fs.existsSync(copied)); fs.rmdirSync(temp); record.removed = true;
    fs.writeFileSync(path.join(top, 'summary.json'), JSON.stringify(record, null, 2) + '\n');
  }
  assert.equal(record.status, 'passed'); assert.equal(record.passed, 24); summary.current24 = record; save();
}
function refusalControls() {
  const top = path.join(evidenceRoot, 'refusal-controls'); fs.mkdirSync(top);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'grid-search-refusals1432-')), copied = path.join(temp, 'source'); let registered = false;
  try {
    git(ROOT, ['worktree', 'add', '--detach', copied, git(ROOT, ['rev-parse', 'HEAD']).toString('utf8').trim()]); registered = true;
    fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(copied, 'node_modules'), 'dir');
    for (const [index, file] of OLD_ENTRIES.entries()) {
      const name = index === 0 ? 'blur' : 'discovery', modeKey = index === 0 ? 'SOCCER_GRID_BLUR_MODE' : 'SOCCER_GRID_SEARCH_MODE';
      const outKey = index === 0 ? 'SOCCER_GRID_BLUR_OUT' : 'SOCCER_GRID_SEARCH_OUT';
      for (const flavor of ['explicit-baseline', 'invalid-mode', 'invalid-out', 'unknown-source']) {
        for (const entry of OLD_ENTRIES) fs.writeFileSync(path.join(copied, entry), Buffer.concat([entry === file ? Buffer.from(ENTRY_PREFIX) : Buffer.alloc(0), oldBody(ROOT, entry)]));
        const body = flavor === 'unknown-source' ? plan.actual + '\n/* Exact unknown whole-source refusal control. */\n' : plan.actual;
        assert.equal(body === plan.actual, flavor !== 'unknown-source'); fs.writeFileSync(path.join(copied, PRODUCT), body);
        const dir = path.join(top, name + '-' + flavor), env = { ...process.env, NODE_OPTIONS: '--require=' + path.join(copied, 'scripts/lib/offlineTransport.cjs') };
        delete env[modeKey]; delete env[outKey];
        if (flavor === 'explicit-baseline') { env[modeKey] = 'baseline'; env[outKey] = path.join(dir, 'old-explicit-evidence'); }
        if (flavor === 'invalid-mode') env[modeKey] = 'not-a-mode'; if (flavor === 'invalid-out') env[outKey] = 'relative-output-is-invalid';
        const held = trackedSnapshot(copied), result = child(copied, [file], env, dir, 30000); assert.equal(result.status, 1);
        assert(/AssertionError/.test(result.stderr)); assert(!result.stdout.includes('GRID_SEARCH_HISTORICAL_COMPATIBILITY_RESULT'));
        if (flavor === 'explicit-baseline' || flavor === 'unknown-source') assert(result.stderr.includes('source held') || result.stderr.includes('Only the exact reviewed'), 'Exact old whole-source guard refuses unsupported body');
        if (flavor === 'invalid-mode') assert(result.stderr.includes("['baseline', 'fixed'].includes(MODE)"));
        if (flavor === 'invalid-out') assert(result.stderr.includes('path.isAbsolute(evidenceRoot)'));
        assertSnapshot(copied, held);
        const record = { name: name + '-' + flavor, status: 'refused', processStatus: result.status, sourceSha256: hash(body), historicalDispatchOccurred: false, ordinaryOfflinePreload: true };
        summary.refusalControls.push(record); fs.writeFileSync(path.join(dir, 'receipt.json'), JSON.stringify(record, null, 2) + '\n'); save();
      }
    }
    for (const flavor of ['missing', 'altered', 'duplicate']) {
      for (const entry of OLD_ENTRIES) fs.writeFileSync(path.join(copied, entry), Buffer.concat([Buffer.from(ENTRY_PREFIX), oldBody(ROOT, entry)]));
      fs.writeFileSync(path.join(copied, PRODUCT), plan.actual);
      const body = oldBody(ROOT, OLD_ENTRIES[0]), prefix = flavor === 'missing' ? '' : flavor === 'duplicate' ? ENTRY_PREFIX + ENTRY_PREFIX : ENTRY_PREFIX.replace('historical default', 'altered default');
      fs.writeFileSync(path.join(copied, OLD_ENTRIES[0]), Buffer.concat([Buffer.from(prefix), body]));
      const dir = path.join(top, 'prefix-' + flavor), env = { ...process.env, NODE_OPTIONS: '--require=' + path.join(copied, 'scripts/lib/offlineTransport.cjs') };
      const program = "import {assertEntryPrefixes} from './scripts/qa/gridSearchAccessibility1432.mjs'; assertEntryPrefixes(process.cwd());";
      const held = trackedSnapshot(copied), result = child(copied, ['--input-type=module', '-e', program], env, dir, 30000);
      assert.equal(result.status, 1); assert(result.stderr.includes('Only exact prefix precedes complete unchanged old entry')); assertSnapshot(copied, held);
      summary.refusalControls.push({ name: 'prefix-' + flavor, status: 'refused', processStatus: 1, sourcePredicateOnly: true }); save();
    }
    console.log('Compatibility refusals:8 actual baseline/invalid/unknown entry guards and3 exact prefix controls refused without app-case credit.');
  } finally { if (registered) git(ROOT, ['worktree', 'remove', '--force', copied]); assert(!fs.existsSync(copied)); fs.rmdirSync(temp); }
}

try {
  fs.writeFileSync(path.join(OUT, 'original-Search.tsx'), plan.original);
  if (MODE === 'baseline') { const normal = run('normal', ORIGINAL_FAULTS), bare = run('bare', ORIGINAL_FAULTS, {}, true); assert.deepEqual(normal, bare); }
  else {
    fs.writeFileSync(path.join(OUT, 'fixed-Search.tsx'), plan.actual); fs.writeFileSync(path.join(OUT, 'inverse-Search.tsx'), plan.original);
    const normal = run('normal', []), bare = run('bare', [], {}, true); assert.deepEqual(normal, bare);
    TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'grid-search-a11y-modules-'));
    run('whole-original', ORIGINAL_FAULTS, moduleCopy('whole-original', plan.original));
    let inverseRestored;
    for (const control of CONTROLS) {
      refuse(plan.actual, control.before, control.after); const changed = once(plan.actual, control.before, control.after), restored = once(changed, control.after, control.before); assert.equal(restored, plan.actual);
      inverseRestored = restored;
      const swaps = moduleCopy(control.name, changed); moduleCopy(control.name + '-restored', restored);
      summary.controls.push({ name: control.name, fixedSha256: hash(plan.actual), changedSha256: hash(changed), recoveredSha256: hash(restored), mutations: [{ before: control.before, after: control.after }], refusals: ['missing', 'altered', 'duplicate'], faults: control.faults });
      run(control.name, control.faults, swaps);
    }
    assert.equal(inverseRestored, plan.actual, 'Whole inverse recovered fixed Search for actual restored execution');
    const restoredAlias = moduleCopy('inverse-restored', inverseRestored);
    summary.restoredSource = { file: 'inverse-restored-Search.tsx', sha256: hash(inverseRestored), scope: 'Exact full source recovered by inverting the final stale-active control, actually aliased in restored8.' };
    const restored = run('restored', [], restoredAlias); assert.deepEqual(restored, normal);
    fs.rmSync(TEMP, { recursive: true, force: true }); assert(!fs.existsSync(TEMP));
    summary.fixedUnitProofPassed = true;
  }
  defaults(); current24(); refusalControls(); summary.status = 'passed';
} finally {
  if (TEMP && fs.existsSync(TEMP)) fs.rmSync(TEMP, { recursive: true, force: true }); assert(!TEMP || !fs.existsSync(TEMP));
  assertSnapshot(ROOT, before); summary.sourceHeld = true; summary.temporaryModulesRemoved = true; save();
}
console.log(JSON.stringify({ kind: 'GRID_SEARCH_ACCESSIBILITY_RESULT', mode: MODE, evidenceRoot,
  modeEnvAbsent: !Object.hasOwn(process.env, 'GRID_SEARCH_A11Y_MODE'), outEnvAbsent: !Object.hasOwn(process.env, 'GRID_SEARCH_A11Y_OUT'),
  summarySha256: hash(fs.readFileSync(path.join(OUT, 'summary.json'))), sourceHeld: summary.sourceHeld, temporaryModulesRemoved: summary.temporaryModulesRemoved, productQualified: false }));
