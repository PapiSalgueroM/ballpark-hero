import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { BASE, PRODUCT, TEST_FILE, TEST_SHA, ORIGINAL_SHA, FIXED_SHA, HUNK, TITLES, PURPOSE, PURPOSE_LINE,
  FAULTS, RESULT_KIND, DEFAULT_PREFIX, hash, git, changePriority, readPlan, sourceForArm, trackedSnapshot,
  assertSnapshot, roleTestCopy, ROLE_TESTS, evidenceTree } from './qa/gridExactNamePriority1435.mjs';
import { ENTRIES, PREFIX, recoverEntry, assertSupportPrefixes, assertKnownSource, entryFor,
  RESULT_KIND as COMPAT_KIND, DEFAULT_PREFIX as COMPAT_PREFIX } from './qa/gridExactNameCompatibility1435.mjs';

async function main() {
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), require = createRequire(import.meta.url);
assert(require.cache[require.resolve('./lib/offlineTransport.cjs')], 'Ordinary offline preload must be active');
assert.equal(process.env.SIM_NETWORK, 'offline');
const modeEnvAbsent = !Object.hasOwn(process.env, 'SOCCER_GRID_EXACT_NAME_MODE'), outEnvAbsent = !Object.hasOwn(process.env, 'SOCCER_GRID_EXACT_NAME_OUT');
const MODE = process.env.SOCCER_GRID_EXACT_NAME_MODE || 'fixed', plan = readPlan(ROOT, MODE);
const evidenceRoot = process.env.SOCCER_GRID_EXACT_NAME_OUT || fs.mkdtempSync(path.join(os.tmpdir(), DEFAULT_PREFIX));
assert(path.isAbsolute(evidenceRoot) && path.relative(ROOT, evidenceRoot).split(path.sep).includes('..'), 'Evidence stays outside the source checkout');
const OUT = path.join(evidenceRoot, 'unit'); assert(!fs.existsSync(OUT)); fs.mkdirSync(OUT, { recursive: true });
const before = trackedSnapshot(ROOT), declared = TITLES.map(title => 'Soccer Grid exact name priority ' + title);
assert.equal(hash(fs.readFileSync(path.join(ROOT, TEST_FILE))), TEST_SHA);
const testSource = fs.readFileSync(path.join(ROOT, TEST_FILE), 'utf8');
assert.equal(testSource.split('\n')[PURPOSE_LINE - 1].trim(), 'expect(selected.mock.calls.map(call => call[0]), PURPOSE).toEqual(spec.expected);');
const summary = { version: 1, status: 'failed', mode: MODE, productQualified: false, fixedUnitProofPassed: false,
  scope: 'Actual exact-name callbacks/current38 and four complete unchanged historical defaults. Native route/AX is separate.',
  actualProductSha256: hash(plan.actual), testSha256: TEST_SHA, originalAdmission: plan.originalAdmission,
  wholeInverse: { originalSha256: ORIGINAL_SHA, fixedSha256: FIXED_SHA, recoveredSha256: hash(changePriority(plan.fixed, 'inverse')), hunk: HUNK },
  arms: [], modules: [], sourceRefusals: [], current38: null, historicalDefaults: null, historical1434: null, sourceHeld: false, temporaryModulesRemoved: false };
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const save = () => write(path.join(OUT, 'summary.json'), summary); save();
let TEMP;
function child(cwd, args, env, dir, timeout = 120000, target) {
  fs.mkdirSync(dir); const transport = path.join(dir, 'transport.transport'); fs.writeFileSync(transport, '', { flag: 'wx' });
  const actualEnv = { ...env, SIM_OFFLINE_RECEIPT: transport }, started = Date.now();
  const result = spawnSync(process.execPath, args, { cwd, env: actualEnv, encoding: 'utf8', timeout, maxBuffer: 64 * 1024 * 1024 });
  fs.writeFileSync(path.join(dir, 'stdout.log'), result.stdout || ''); fs.writeFileSync(path.join(dir, 'stderr.log'), result.stderr || '');
  write(path.join(dir, 'process.json'), { status: result.status, signal: result.signal, error: result.error ? String(result.error) : null,
    args, timeoutMs: timeout, elapsedMs: Date.now() - started, noDoubleSwapPresent: Object.hasOwn(actualEnv, 'NO_DOUBLE_SWAP'),
    oldModeEnvAbsent: !Object.hasOwn(actualEnv, 'GRID_SEARCH_A11Y_MODE'), oldOutEnvAbsent: !Object.hasOwn(actualEnv, 'GRID_SEARCH_A11Y_OUT') });
  if (target) {
    const file = path.join(dir, 'process.json'), record = JSON.parse(fs.readFileSync(file));
    record.modeEnvAbsent = !Object.hasOwn(actualEnv, target.modeKey); record.outEnvAbsent = !Object.hasOwn(actualEnv, target.outKey); write(file, record);
  }
  assert.ifError(result.error); assert.equal(result.signal, null); assert.equal(fs.readFileSync(transport, 'utf8'), '');
  assert(!/Unhandled\s+(?:Errors?|Rejections?)|Uncaught\s+Exceptions?/i.test((result.stdout || '') + (result.stderr || '')));
  return result;
}
function raw(dir, count, faults, names) {
  const file = path.join(dir, 'vitest.json'), report = JSON.parse(fs.readFileSync(file)), rows = report.testResults.flatMap(suite => suite.assertionResults);
  assert.equal(report.numTotalTests, count); assert.equal(report.numPassedTests, count - faults.length); assert.equal(report.numFailedTests, faults.length);
  for (const key of ['numPendingTests', 'numTodoTests']) assert.equal(report[key], 0);
  assert.equal(report.numRuntimeErrorTestSuites || 0, 0); if (report.numUnhandledErrors !== undefined) assert.equal(report.numUnhandledErrors, 0);
  if (report.unhandledErrors !== undefined) assert.deepEqual(report.unhandledErrors, []);
  assert.equal(rows.length, count); assert.deepEqual(rows.map(row => row.fullName).sort(), [...names].sort());
  assert.deepEqual(rows.filter(row => row.status === 'failed').map(row => row.fullName).sort(), faults.map(i => names[i]).sort());
  for (const row of rows) { assert(['passed', 'failed'].includes(row.status)); if (row.status === 'passed') assert.deepEqual(row.failureMessages, []); }
  assert.equal(report.success, faults.length === 0); return { report, rows, sha256: hash(fs.readFileSync(file)) };
}
const runtimeAliases = { 'react/jsx-dev-runtime': require.resolve('react/jsx-dev-runtime'), 'react/jsx-runtime': require.resolve('react/jsx-runtime'),
  react: require.resolve('react'), 'lucide-react': require.resolve('lucide-react') };
function candidateMenu(index, legacy) {
  const supers = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(letter => 'Aster ' + letter + ' Fixture Target');
  if (index === 0) return legacy ? supers : ['Fixture Target', ...supers.slice(0, 7)];
  if (index === 1) return legacy ? supers : ['Fixture Tárget', ...supers.slice(0, 7)];
  if (index === 2) return legacy ? ['Aster A Fixture Target', 'Fixture Tárget', 'Aster B Fixture Target', 'Fixture Target', 'Aster C Fixture Target'] : ['Fixture Tárget', 'Fixture Target', 'Aster A Fixture Target', 'Aster B Fixture Target', 'Aster C Fixture Target'];
  if (index === 3) return Array.from({ length: 8 }, (_, i) => 'Fixture Pool ' + i);
  if (index === 4) return ['Fixture Existing', 'Fixture Existing Extra'];
  if (index === 7) return ['Fixture Escape'];
  return [];
}
function validateTrace(trace, legacy) {
  assert.equal(trace.version, 1); assert.deepEqual(trace.cases.map(row => row.name), TITLES);
  const queries = ['Fixture Target', 'fixture target', 'fixture target', 'Fixture Pool', 'Fixture Existing', '  fictional missing  ', 'F', 'Fixture Escape'];
  const expectedCallbacks = ['Fixture Target', 'Fixture Tárget', 'Fixture Target', 'Fixture Pool 6', 'Fixture Existing', 'Fictional Missing', null, 'Fixture Escape'];
  for (const [index, row] of trace.cases.entries()) {
    const actualName = legacy && index < 2 ? 'Aster A Fixture Target' : legacy && index === 2 ? 'Fixture Tárget' : expectedCallbacks[index];
    const callbacks = actualName === null ? [] : [actualName];
    const phases = index === 6 ? ['pre-mount-storage-setup', 'canonical-anchor-available', 'candidate-query', 'raw-one-character', 'all-whitespace'] : index === 7 ? ['pre-mount-storage-setup', 'canonical-anchor-available', 'candidate-query', 'after-escape', 'after-expired-blur', 'after-refocus', 'before-enter-submit', 'after-enter-submit'] : ['pre-mount-storage-setup', 'canonical-anchor-available', 'candidate-query', 'before-enter-submit', 'after-enter-submit'];
    assert.deepEqual(row.phases.map(value => value.phase), phases);
    const setup = row.phases[0]; assert.equal(typeof setup.hadLocal, 'boolean'); assert.equal(typeof setup.hadSession, 'boolean');
    assert.equal(setup.setupTimersBefore, 2 + Number(setup.hadLocal) + Number(setup.hadSession)); assert.equal(setup.setupTimersAfter, 0);
    assert.equal(row.pendingBeforeCleanup, 0); assert.equal(row.pendingAfterCleanup, 0); assert.equal(row.beforeStores, row.afterStores); assert.equal(row.randomCalls, 0);
    const state = (value, names, selected, query, calls, focused = true) => {
      assert.equal(value.query, query); assert.equal(value.focused, focused); assert.deepEqual(value.callbacks, calls);
      assert.equal(value.timers, 0); assert.equal(value.stores, row.beforeStores); assert.equal(value.randomCalls, 0);
      assert.equal(value.input.role, 'combobox'); assert.equal(value.input.disabled, false); assert.equal(value.input.expanded, String(names.length > 0));
      if (!names.length) { assert.equal(value.list, null); assert.equal(value.input.controls, null); assert.equal(value.input.active, null); }
      else { assert(names.length <= 8); assert.equal(value.list.role, 'listbox'); assert.deepEqual(value.list.options.map(option => option.name), names);
        assert.equal(value.input.controls, value.list.id); assert.equal(value.input.active, value.list.options[selected].id);
        assert.equal(new Set(value.list.options.map(option => option.id)).size, names.length);
        for (const [i, option] of value.list.options.entries()) { assert.equal(option.role, 'option'); assert.equal(option.selected, String(i === selected)); }
      }
    };
    state(row.phases[1].state, ['Fixture Anchor'], 0, 'Fixture Anchor', []);
    state(row.phases[2].state, candidateMenu(index, legacy), 0, queries[index], []);
    for (const phase of row.phases.slice(3)) {
      if (phase.phase === 'raw-one-character') state(phase.state, [], 0, 'F', []);
      else if (phase.phase === 'all-whitespace') state(phase.state, [], 0, '  ', []);
      else if (phase.phase === 'after-escape') state(phase.state, [], 0, queries[index], []);
      else if (phase.phase === 'after-expired-blur') state(phase.state, [], 0, queries[index], [], false);
      else if (phase.phase === 'after-refocus') state(phase.state, ['Fixture Escape'], 0, queries[index], []);
      else if (phase.phase === 'before-enter-submit') state(phase.state, candidateMenu(index, legacy), index === 2 ? 1 : index === 3 ? 6 : 0, queries[index], []);
      else { assert.equal(phase.phase, 'after-enter-submit'); state(phase.state, [], 0, '', callbacks); }
    }
    state(row.final, [], 0, index === 6 ? '  ' : '', callbacks);
  }
}
function run(name, faults, source, bare = false) {
  const dir = path.join(OUT, name), env = { ...process.env, SOCCER_GRID_EXACT_NAME_TRACE_DIR: dir };
  const aliases = {};
  if (source !== undefined) {
    assert(!/^import .+ from ['"]\./m.test(source)); const file = name + '-Search.tsx';
    fs.writeFileSync(path.join(OUT, file), source); fs.writeFileSync(path.join(TEMP, file), source);
    aliases['@/components/soccer-grid/SoccerGridSearch'] = path.join(TEMP, file); summary.modules.push({ name, file, sha256: hash(source) });
  }
  if (bare) delete env.NO_DOUBLE_SWAP; else env.NO_DOUBLE_SWAP = JSON.stringify({ ...runtimeAliases, ...aliases });
  const result = child(ROOT, ['node_modules/vitest/vitest.mjs', 'run', TEST_FILE, '--maxWorkers=1', '--no-file-parallelism', '--reporter=json', '--outputFile=' + path.join(dir, 'vitest.json')], env, dir);
  assert.equal(result.status, faults.length ? 1 : 0); const checked = raw(dir, 8, faults, declared);
  for (const row of checked.rows.filter(row => row.status === 'failed')) {
    assert.equal(row.failureMessages.length, 1); const message = row.failureMessages[0];
    assert(message.startsWith('AssertionError: ' + PURPOSE + ':'), 'Only the actual stable exact-name callback equality is an intended fault');
    assert(message.includes(TEST_FILE + ':' + PURPOSE_LINE + ':'), 'Frozen callback purpose source');
    assert(!/TestingLibraryElementError|Test timed out|Cannot find module|Failed to resolve import|Transform failed|ReferenceError|SyntaxError|TypeError/.test(message));
  }
  const traceFile = path.join(dir, 'trace.json'), trace = JSON.parse(fs.readFileSync(traceFile));
  validateTrace(trace, hash(source === undefined ? plan.actual : source) === ORIGINAL_SHA);
  summary.arms.push({ name, bare, faults, passed: 8 - faults.length, failed: faults.length, pending: 0, rawSha256: checked.sha256,
    traceSha256: hash(fs.readFileSync(traceFile)), sourceSha256: source === undefined ? hash(plan.actual) : hash(source),
    failures: checked.rows.filter(row => row.status === 'failed').map(row => ({ name: row.fullName, messages: row.failureMessages })) }); save();
  console.log(name + ':8 actual Search cases,' + faults.length + ' precise callback faults,0 pending cleanup.'); return trace;
}
function sourceRefusals() {
  for (const direction of ['forward', 'inverse']) {
    const body = direction === 'forward' ? plan.original : plan.fixed, anchor = direction === 'forward' ? HUNK.original : HUNK.fixed;
    const altered = anchor.replace('normalizedQuery', 'ALTERED_NORMALIZED_QUERY'); assert.notEqual(altered, anchor);
    for (const [kind, changed] of [['missing', body.replace(anchor, '')], ['altered', body.replace(anchor, altered)], ['duplicate', body + anchor], ['unrelated', body + '\n']]) {
      assert.notEqual(changed, body); assert.throws(() => changePriority(changed, direction), kind === 'unrelated' ? /Exact whole exact-priority input/ : /Exactly one exact-priority source hunk/);
      summary.sourceRefusals.push({ direction, kind, changedSha256: hash(changed), rejected: true });
    }
  }
  assertSupportPrefixes(ROOT); assertKnownSource(plan.actual);
  for (const spec of ENTRIES) {
    const body = fs.readFileSync(path.join(ROOT, spec.entry)), old = recoverEntry(ROOT, spec.entry);
    for (const [kind, changed] of [['missing', old], ['altered', Buffer.concat([Buffer.from(PREFIX.replace('Round1435', 'Altered1435')), old])],
      ['duplicate', Buffer.concat([Buffer.from(PREFIX), body])], ['unrelated', Buffer.concat([body, Buffer.from('\n')])]]) {
      assert(!changed.equals(body)); assert.throws(() => recoverEntry(ROOT, spec.entry, changed), /Exact unique Round1435 prefix and complete prior entry body/);
      summary.sourceRefusals.push({ entry: spec.entry, kind, changedSha256: hash(changed), rejected: true, sourcePredicateOnly: true });
    }
  }
  const unknown = plan.actual + '\n'; assert.notEqual(unknown, plan.actual);
  assert.throws(() => assertKnownSource(unknown), /Only the two exact priority source bodies are supported/);
  summary.sourceRefusals.push({ kind: 'unknown-product', changedSha256: hash(unknown), rejected: true, sourcePredicateOnly: true });
  const unknownCaller = 'scripts/simUnknownExactName1435.mjs'; assert.notEqual(unknownCaller, ENTRIES[0].entry);
  assert.throws(() => entryFor(unknownCaller), /Only four exact entry points/);
  summary.sourceRefusals.push({ kind: 'unknown-caller', changedSha256: hash(unknownCaller), rejected: true, sourcePredicateOnly: true });
}
function ordinaryOldDefaults() {
  const top = path.join(evidenceRoot, 'historical-defaults'); fs.mkdirSync(top);
  const records = [];
  for (const spec of ENTRIES) {
    const entryRoot = path.join(top, spec.name); fs.mkdirSync(entryRoot);
    const processDir = path.join(entryRoot, 'process'), packet = path.join(entryRoot, 'evidence');
    const prior = fs.readdirSync(os.tmpdir()).filter(name => name.startsWith(COMPAT_PREFIX));
    const priorTrees = prior.map(name => ({ name, files: evidenceTree(path.join(os.tmpdir(), name)) })); write(path.join(entryRoot, 'prior-packets.before.json'), priorTrees);
    const env = { ...process.env }; delete env[spec.modeKey]; delete env[spec.outKey]; delete env.NO_DOUBLE_SWAP;
    let result, childError, fresh, tree;
    try { result = child(ROOT, [spec.entry], env, processDir, 2850000, spec); }
    catch (error) { childError = error; }
    finally {
      fresh = fs.readdirSync(os.tmpdir()).filter(name => name.startsWith(COMPAT_PREFIX) && !prior.includes(name));
      write(path.join(entryRoot, 'fresh-packets.json'), { prefix: COMPAT_PREFIX, prior, fresh });
      if (fresh.length === 1) {
        const actual = fs.realpathSync(path.join(os.tmpdir(), fresh[0])); assert.equal(path.dirname(actual), fs.realpathSync(os.tmpdir()));
        tree = evidenceTree(actual); fs.cpSync(actual, packet, { recursive: true, force: false, errorOnExist: true });
        assert.deepEqual(evidenceTree(packet), tree); assert.deepEqual(evidenceTree(actual), tree); write(path.join(entryRoot, 'copied-tree.json'), tree);
      }
    }
    const priorAfter = prior.map(name => ({ name, files: evidenceTree(path.join(os.tmpdir(), name)) })); write(path.join(entryRoot, 'prior-packets.after.json'), priorAfter); assert.deepEqual(priorAfter, priorTrees, 'Whole prior direct-default packets held');
    if (childError) throw childError;
    assert.equal(result.status, 0); assert.equal(fresh.length, 1); assert(tree);
    const lines = result.stdout.split(/\r?\n/).filter(line => line.startsWith('{"kind":"' + COMPAT_KIND + '",')); assert.equal(lines.length, 1);
    const metadata = JSON.parse(lines[0]), actual = fs.realpathSync(metadata.evidenceRoot);
    assert.equal(path.basename(actual), fresh[0]); assert.equal(path.dirname(actual), fs.realpathSync(os.tmpdir()));
    assert.equal(metadata.status, 'passed'); assert.equal(metadata.name, spec.name); assert.equal(metadata.entry, spec.entry);
    assert.equal(metadata.historical, true); assert.equal(metadata.currentSource, false); assert.equal(metadata.ordinaryDefault, true);
    assert.equal(metadata.actualSourceSha256, hash(plan.actual)); assert.equal(metadata.sourceSha256, ORIGINAL_SHA);
    assert.equal(metadata.modeEnvAbsent, true); assert.equal(metadata.outEnvAbsent, true); assert.equal(metadata.cases, spec.cases);
    assert.equal(metadata.sourceHeld, true); assert.equal(metadata.removed, true); assert.equal(metadata.productQualified, false);
    const receiptFile = path.join(packet, 'receipt.json'); assert.equal(hash(fs.readFileSync(receiptFile)), metadata.receiptSha256);
    const receipt = JSON.parse(fs.readFileSync(receiptFile)); assert.equal(receipt.status, 'passed'); assert.equal(receipt.name, spec.name);
    assert.equal(receipt.entry, spec.entry); assert.equal(receipt.cases, spec.cases); assert.equal(receipt.sourceSha256, ORIGINAL_SHA);
    assert.equal(receipt.actualSourceSha256, hash(plan.actual)); assert.equal(receipt.ordinaryDefault, true);
    assert.equal(receipt.modeEnvAbsent, true); assert.equal(receipt.outEnvAbsent, true); assert.equal(receipt.sourceHeld, true); assert.equal(receipt.removed, true);
    const target = JSON.parse(fs.readFileSync(path.join(packet, 'target/process.json')));
    assert.equal(target.status, 0); assert.equal(target.signal, null); assert.equal(target.error, null); assert.deepEqual(target.args, [spec.entry]);
    assert.equal(target.timeoutMs, 2700000); assert.equal(target.modeEnvAbsent, true); assert.equal(target.outEnvAbsent, true);
    assert.deepEqual(target, receipt.process); assert.equal(fs.readFileSync(path.join(packet, 'target/transport.transport'), 'utf8'), '');
    assert.equal(hash(fs.readFileSync(path.join(packet, 'source.zip'))), receipt.archiveSha256);
    const historical = path.join(packet, 'target/evidence'), oldReceipt = spec.name === 'apostrophe' ? 'unit/summary.json' : 'receipt.json';
    assert.equal(hash(fs.readFileSync(path.join(historical, oldReceipt))), spec.name === 'apostrophe' ? receipt.metadata.summarySha256 : receipt.metadata.receiptSha256);
    assert.equal(receipt.rawReports.reduce((sum, row) => sum + row.cases, 0), spec.cases);
    if (spec.name === 'apostrophe') {
      const old = JSON.parse(fs.readFileSync(path.join(historical, 'unit/summary.json')));
      assert.equal(old.status, 'passed'); assert.equal(old.actualProductSha256, ORIGINAL_SHA); assert.equal(old.fixedUnitProofPassed, true);
      assert.deepEqual(old.arms.map(row => row.name), ['normal', 'bare', 'removed-fold', 'restored']);
      assert.deepEqual(old.arms.map(row => row.failed), [0, 0, 2, 0]);
      assert.equal(old.current32.passed, 32); assert.equal(old.historicalDefaults.cases, 600); assert.equal(old.historicalDefaults.entries.length, 3);
    }
    const record = { name: spec.name, entry: spec.entry, status: 'passed', historical: true, currentSource: false,
      sourceSha256: ORIGINAL_SHA, actualSourceSha256: hash(plan.actual), modeEnvAbsent: true, outEnvAbsent: true, cases: spec.cases,
      metadata, copiedDirectory: path.relative(evidenceRoot, packet).split(path.sep).join('/'), copiedFiles: tree.length,
      processFile: path.relative(evidenceRoot, path.join(processDir, 'process.json')).split(path.sep).join('/'), sourceHeld: true, removed: true };
    records.push(record); write(path.join(entryRoot, 'summary.json'), record);
    console.log('Historical default:' + spec.name + ',' + spec.cases + ' actual old raw cases, complete copied packet, no current-source credit.');
  }
  summary.historicalDefaults = { status: 'passed', historical: true, currentSource: false, cases: 1256, entries: records };
  assert.equal(records.reduce((sum, row) => sum + row.cases, 0), 1256);
  summary.historical1434 = records[0]; save(); return path.join(top, 'apostrophe/evidence/target/evidence');
}
function current38(historical) {
  const top = path.join(evidenceRoot, 'current38'); fs.mkdirSync(top);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'grid-exact-name-current1435-')), copied = path.join(temp, 'source'); let registered = false;
  const specs = [...ROLE_TESTS, { name: 'accessibility8', file: 'src/test/soccerGridSearchAccessibility.test.tsx', sha256: '6c7a7b2deabaf8dc08f7b03310fca77a2d5c376dee3f94cbd96d97aa6fe4407d', count: 8, traceEnv: 'GRID_SEARCH_A11Y_TRACE_DIR' }, { name: 'apostrophe6', file: 'src/test/soccerGridApostropheSearch.test.tsx', sha256: 'a7265faffaaeacc166824368a5dc686abc2f514a9df61308fa7925f430f1f6b9', count: 6, traceEnv: 'SOCCER_GRID_APOSTROPHE_TRACE_DIR' }];
  const record = { status: 'failed', currentSource: true, historicalSource: false, actualProductSha256: hash(plan.actual), cases: 38, passed: 0, failed: 0, pending: 0, tests: [], sourceHeld: false, removed: false };
  try {
    git(ROOT, ['worktree', 'add', '--detach', copied, git(ROOT, ['rev-parse', 'HEAD']).toString('utf8').trim()]); registered = true;
    fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(copied, 'node_modules'), 'dir');
    assert.equal(fs.readFileSync(path.join(copied, PRODUCT), 'utf8'), plan.actual);
    for (const spec of specs) {
      const original = git(ROOT, ['show', BASE + ':' + spec.file]).toString('utf8'); assert.equal(hash(original), spec.sha256);
      const adapted = ['accessibility8', 'apostrophe6'].includes(spec.name) ? { body: original, originalSha256: hash(original), copiedSha256: hash(original), recoveredSha256: hash(original), adapters: [] } : roleTestCopy(original, spec, 'combobox');
      fs.writeFileSync(path.join(copied, spec.file), adapted.body);
      for (const [name, body] of [['original', original], ['copied', adapted.body], ['recovered', original]]) fs.writeFileSync(path.join(top, spec.name + '-' + name + '.tsx'), body);
      record.tests.push({ ...spec, ...adapted, body: undefined });
    }
    const held = trackedSnapshot(copied), originals = new Map(before.files.map(row => [row.file, row.sha256]));
    assert(held.members.equals(before.members)); assert.deepEqual(held.files.filter(row => row.sha256 !== originals.get(row.file)).map(row => row.file).sort(), ROLE_TESTS.map(row => row.file).sort());
    write(path.join(top, 'source.before.json'), held.files); fs.writeFileSync(path.join(top, 'members.before'), held.members); fs.writeFileSync(path.join(top, 'status.before'), held.status);
    for (const spec of specs) {
      const dir = path.join(top, spec.name), env = { ...process.env, NODE_OPTIONS: '--require=' + path.join(copied, 'scripts/lib/offlineTransport.cjs'), [spec.traceEnv]: dir }; delete env.NO_DOUBLE_SWAP;
      const result = child(copied, ['node_modules/vitest/vitest.mjs', 'run', spec.file, '--maxWorkers=1', '--no-file-parallelism', '--reporter=json', '--outputFile=' + path.join(dir, 'vitest.json')], env, dir); assert.equal(result.status, 0);
      const prefix = spec.name === 'apostrophe6' ? 'unit/normal' : 'current32/' + spec.name;
      const oldRaw = JSON.parse(fs.readFileSync(path.join(historical, prefix, 'vitest.json'))), names = oldRaw.testResults.flatMap(suite => suite.assertionResults).map(row => row.fullName);
      const checked = raw(dir, spec.count, [], names), trace = JSON.parse(fs.readFileSync(path.join(dir, 'trace.json')));
      assert.deepEqual(trace, JSON.parse(fs.readFileSync(path.join(historical, prefix, 'trace.json'))), 'Complete frozen healthy traces on actual current source');
      for (const row of trace.cases) { assert.equal(row.pendingAfterCleanup, 0); if (row.beforeStores !== undefined) assert.equal(row.beforeStores, row.afterStores); }
      const entry = record.tests.find(row => row.name === spec.name); entry.rawSha256 = checked.sha256; entry.traceSha256 = hash(fs.readFileSync(path.join(dir, 'trace.json'))); entry.passed = spec.count; record.passed += spec.count;
    }
    assertSnapshot(copied, held); const after = trackedSnapshot(copied);
    write(path.join(top, 'source.after.json'), after.files); fs.writeFileSync(path.join(top, 'members.after'), after.members); fs.writeFileSync(path.join(top, 'status.after'), after.status);
    record.sourceHeld = true; record.status = 'passed';
  } finally { if (registered) git(ROOT, ['worktree', 'remove', '--force', copied]); assert(!fs.existsSync(copied)); fs.rmdirSync(temp); record.removed = true; write(path.join(top, 'summary.json'), record); }
  assert.equal(record.passed, 38); summary.current38 = record; save(); console.log('Current38: actual Search,7 exact existing role adapters, complete healthy traces and source held.');
}

try {
  fs.writeFileSync(path.join(OUT, 'original-Search.tsx'), plan.original); fs.writeFileSync(path.join(OUT, 'proposed-fixed-Search.tsx'), plan.fixed); sourceRefusals();
  const normal = run('normal', MODE === 'baseline' ? FAULTS : []);
  assert.deepEqual(run('bare', MODE === 'baseline' ? FAULTS : [], undefined, true), normal, 'Complete ordinary normal/bare trace equality');
  if (MODE === 'fixed') {
    TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'grid-exact-name-modules1435-'));
    const removed = sourceForArm(plan, 'removed-priority'); assert.equal(removed, plan.original); run('removed-priority', FAULTS, removed);
    const restored = changePriority(removed, 'forward'); assert.equal(restored, plan.actual);
    assert.deepEqual(run('restored', [], restored), normal, 'Actually executed full recovered source has normal traces');
    fs.rmSync(TEMP, { recursive: true, force: true }); assert(!fs.existsSync(TEMP)); summary.fixedUnitProofPassed = true;
  }
  current38(ordinaryOldDefaults()); summary.status = 'passed';
} finally {
  if (TEMP && fs.existsSync(TEMP)) fs.rmSync(TEMP, { recursive: true, force: true }); assert(!TEMP || !fs.existsSync(TEMP));
  assertSnapshot(ROOT, before); summary.sourceHeld = true; summary.temporaryModulesRemoved = true; save();
}
console.log('Source and cleanup: complete tracked membership/status/body holds, exact priority inverses and changed-source refusals passed.');
console.log(JSON.stringify({ kind: RESULT_KIND, mode: MODE, evidenceRoot, modeEnvAbsent, outEnvAbsent,
  summarySha256: hash(fs.readFileSync(path.join(OUT, 'summary.json'))), sourceHeld: summary.sourceHeld,
  temporaryModulesRemoved: summary.temporaryModulesRemoved, productQualified: false }));
}
await main();
