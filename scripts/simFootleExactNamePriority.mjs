import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { PRODUCT, BASE, TEST_FILE, TEST_SHA, OLD_TEST, OLD_CLI, ORIGINAL_SHA, FIXED_SHA, HUNK, TITLES, PURPOSE, PURPOSE_LINE,
  FAULTS, RESULT_KIND, DEFAULT_PREFIX, OLD_CONTROLS, hash, git, readPlan, sourceForArm, changePriority, snapshot, evidenceTree } from './qa/footleExactName1436.mjs';

async function main() {
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), require = createRequire(import.meta.url);
assert(require.cache[require.resolve('./lib/offlineTransport.cjs')], 'Ordinary offline preload must be active');
assert.equal(process.env.SIM_NETWORK, 'offline');
assert(process.env.SIM_OFFLINE_RECEIPT && fs.existsSync(process.env.SIM_OFFLINE_RECEIPT), 'Present caller transport receipt');
assert.equal(fs.readFileSync(process.env.SIM_OFFLINE_RECEIPT, 'utf8'), '');
const modeEnvAbsent = !Object.hasOwn(process.env, 'FOOTLE_EXACT_MODE'), outEnvAbsent = !Object.hasOwn(process.env, 'FOOTLE_EXACT_OUT');
const MODE = process.env.FOOTLE_EXACT_MODE || 'fixed', plan = readPlan(ROOT, MODE);
const evidenceRoot = process.env.FOOTLE_EXACT_OUT || fs.mkdtempSync(path.join(os.tmpdir(), DEFAULT_PREFIX));
assert(path.isAbsolute(evidenceRoot) && path.relative(ROOT, evidenceRoot).split(path.sep).includes('..'), 'Fresh evidence outside source checkout');
const OUT = path.join(evidenceRoot, 'unit'); assert(!fs.existsSync(OUT)); fs.mkdirSync(OUT, { recursive: true });
const relative = file => path.relative(evidenceRoot, file).split(path.sep).join('/');
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const before = snapshot(ROOT), beforeFile = path.join(OUT, 'source.before.json'); write(beforeFile, before);
const oldTestSource = fs.readFileSync(path.join(ROOT, OLD_TEST), 'utf8'), oldCliSource = fs.readFileSync(path.join(ROOT, OLD_CLI), 'utf8');
assert.equal(hash(oldTestSource), '0f7b2c5174ece46050fcbfe2379029262a2b6ed9a2ec6ebbcc859c306ec82f2f');
assert.equal(hash(oldCliSource), '32dfdeacf9d108707fd317d43906d80e08b14f36127c9b91bae128053404bacd');
assert.equal(hash(fs.readFileSync(path.join(ROOT, TEST_FILE))), TEST_SHA);
assert.equal(fs.readFileSync(path.join(ROOT, TEST_FILE), 'utf8').split('\n')[PURPOSE_LINE - 1].trim(),
  'expect(game.selected.mock.calls.map(call => call[0].name), PURPOSE).toEqual([expected.name]);');
const summary = { version: 1, status: 'failed', mode: MODE, productQualified: false, fixedUnitProofPassed: false,
  scope: 'Actual focused Footle component cases plus unchanged current old885 methods and separately retained direct raw replays. Native full-game acceptance is separate.',
  actualProductSha256: plan.actualSha256, testSha256: TEST_SHA, originalAdmission: plan.originalAdmission,
  wholeInverse: { originalSha256: ORIGINAL_SHA, fixedSha256: FIXED_SHA, recoveredSha256: hash(changePriority(plan.fixed, 'inverse')), hunk: HUNK },
  arms: [], modules: [], sourceRefusals: [], oldCli: null, oldReplay: null,
  sourceBeforeFile: relative(beforeFile), sourceAfterFile: 'unit/source.after.json', sourceHeld: false, temporaryModulesRemoved: false };
const save = () => write(path.join(OUT, 'summary.json'), summary); save();
const TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'footle-exact-modules1436-'));
const sourceDir = path.join(OUT, 'source-evidence'); fs.mkdirSync(sourceDir);
const simControlRoot = path.join(ROOT, '.sim-control'), hadSimControl = fs.existsSync(simControlRoot);
const oldControlBefore = hadSimControl ? evidenceTree(simControlRoot) : [];
const runtimeAliases = { 'react/jsx-dev-runtime': require.resolve('react/jsx-dev-runtime'), 'react/jsx-runtime': require.resolve('react/jsx-runtime'),
  react: require.resolve('react'), 'lucide-react': require.resolve('lucide-react') };
const oldTitles = [
 'visible Enter submits the highlighted Player once and restores search focus',
 'visible arrow keys preserve bounded selection and exact player identity',
 'pointer choice submits its exact Player once',
 'Escape followed by Enter cannot consume a hidden guess',
 'ArrowDown deliberately reopens canceled suggestions before selection',
 'ArrowUp deliberately reopens canceled suggestions before selection',
 'empty and one-character searches cannot submit any player',
 'unmatched queries stay invalid with arrows and Enter',
 'already guessed names are excluded without changing ranking',
 'matching remains ranked with a ten-result limit',
 'changing the query resets selection to a real current option',
 'combobox announces only visible results and its selected option'
];
const forbidden = /Unhandled\s+(?:Errors?|Rejections?)|Uncaught\s+Exceptions?|Test timed out|Failed to (?:resolve import|load)|Cannot find module|SyntaxError|Transform failed|SIM_OFFLINE_BLOCK/;
function child(args, env, dir, timeoutMs = 120000) {
  assert(!fs.existsSync(dir)); fs.mkdirSync(dir, { recursive: true });
  const receipt = path.join(dir, 'transport.transport'); fs.writeFileSync(receipt, '', { flag: 'wx' });
  const actualEnv = { ...env, SIM_OFFLINE_RECEIPT: receipt }, start = Date.now();
  const result = spawnSync(process.execPath, args, { cwd: ROOT, env: actualEnv, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024 });
  fs.writeFileSync(path.join(dir, 'stdout.log'), result.stdout || ''); fs.writeFileSync(path.join(dir, 'stderr.log'), result.stderr || '');
  write(path.join(dir, 'process.json'), { status: result.status, signal: result.signal, error: result.error ? String(result.error) : null,
    args, timeoutMs, elapsedMs: Date.now() - start, noDoubleSwapPresent: Object.hasOwn(actualEnv, 'NO_DOUBLE_SWAP'),
    oldControlEnvAbsent: !Object.hasOwn(actualEnv, 'PLAYER_SEARCH_KEYBOARD_CONTROL'),
    oldControl: actualEnv.PLAYER_SEARCH_KEYBOARD_CONTROL ?? null });
  assert.ifError(result.error); assert.equal(result.signal, null); assert.equal(fs.readFileSync(receipt, 'utf8'), '');
  assert(!forbidden.test((result.stdout || '') + (result.stderr || '')), 'No runtime, setup or transport diagnostics'); return result;
}
function raw(reportFile, count, faults, names) {
  const report = JSON.parse(fs.readFileSync(reportFile)), rows = report.testResults.flatMap(file => file.assertionResults);
  assert.equal(report.numTotalTests, count); assert.equal(report.numPassedTests, count - faults.length); assert.equal(report.numFailedTests, faults.length);
  assert.equal(report.numPendingTests, 0); assert.equal(report.numTodoTests, 0); assert.equal(report.numRuntimeErrorTestSuites ?? 0, 0);
  if (report.numUnhandledErrors !== undefined) assert.equal(report.numUnhandledErrors, 0);
  if (report.unhandledErrors !== undefined) assert.deepEqual(report.unhandledErrors, []);
  assert.equal(report.success, faults.length === 0); assert.equal(rows.length, count);
  assert.deepEqual(rows.map(row => row.fullName).sort(), [...names].sort());
  assert.deepEqual(rows.filter(row => row.status === 'failed').map(row => row.fullName).sort(), faults.map(index => names[index]).sort());
  for (const row of rows) { assert(['passed', 'failed'].includes(row.status)); if (row.status === 'passed') assert.deepEqual(row.failureMessages, []); else { assert.equal(row.failureMessages.length, 1); assert(!forbidden.test(row.failureMessages[0])); } }
  return { report, rows };
}
function moduleCopy(name, body, recovered) {
  assert.equal(typeof body, 'string'); assert(!/^import .+ from ['"]\./m.test(body));
  const sourceFile = path.join(sourceDir, name + '-source.tsx'), recoveredFile = path.join(sourceDir, name + '-recovered.tsx');
  fs.writeFileSync(sourceFile, body); fs.writeFileSync(recoveredFile, recovered);
  const consumedFile = path.join(TEMP, name + '.tsx'); fs.writeFileSync(consumedFile, body);
  summary.modules.push({ name, sourceFile: relative(sourceFile), sourceBodySha256: hash(body), recoveredFile: relative(recoveredFile),
    recoveredSha256: hash(recovered), consumedFile, actualTemporaryCopySha256: hash(fs.readFileSync(consumedFile)), executed: false });
  return { consumedFile, record: summary.modules.at(-1) };
}
function assertState(state, expectedNames, choice, query, callbacks, players, stores) {
  assert.equal(state.query, query); assert.equal(state.focused, true); assert.equal(state.stores, stores); assert.equal(state.timers, 0);
  assert.equal(state.input.role, 'combobox'); assert.equal(state.input.disabled, false); assert.equal(state.input.expanded, String(expectedNames.length > 0));
  assert.deepEqual(state.options.map(option => option.name), expectedNames); assert(expectedNames.length <= 10);
  assert.deepEqual(state.callbacks.map(call => call.player.name), callbacks);
  for (const call of state.callbacks) { assert(call.sourceIndex >= 0); assert.deepEqual(call.player, players[call.sourceIndex]); }
  if (!expectedNames.length) { assert.equal(state.input.controls, null); assert.equal(state.input.active, null); }
  else { assert.equal(typeof state.input.controls, 'string'); assert(state.input.controls); assert.equal(state.input.active, state.options[choice].id);
    assert.equal(new Set(state.options.map(option => option.id)).size, expectedNames.length);
    for (const [index, option] of state.options.entries()) { assert.equal(option.id, state.input.controls + '-option-' + index); assert.equal(option.role, 'option'); assert.equal(option.selected, String(index === choice)); assert.equal(option.textContent, option.name + 'Fixture Club · Other'); }
  }
}
function validateTrace(trace, legacy) {
  assert.equal(trace.version, 1); assert.deepEqual(trace.cases.map(row => row.name), TITLES);
  const supers = 'ABCDEFGHIJ'.split('').map(letter => 'Aster ' + letter + ' Fixture Target');
  const menus = [legacy ? supers : ['Fixture Target', ...supers.slice(0, 9)], legacy ? supers : ['Fixture Target', ...supers.slice(0, 9)],
    legacy ? supers : ['FIXTURE Target', 'Fixture  Target', ...supers.slice(0, 8)], 'ABCDEFGHIJ'.split('').map(letter => 'Alpha ' + letter + ' Fixture'), supers,
    ['Fixture Target', ...supers.slice(0, 9)], ['Fixture Target', ...supers.slice(0, 9)], []];
  const queries = ['Fixture Target', '  fIxTuRe \t tArGeT  ', 'fixture target', 'al', 'Fixture Target', 'Fixture Target', 'Fixture Target'];
  const names = [legacy ? supers[0] : 'Fixture Target', legacy ? supers[0] : 'Fixture Target', legacy ? supers[1] : 'Fixture  Target', 'Alpha I Fixture', supers[0], 'Fixture Target', 'Fixture Target'];
  for (const [index, row] of trace.cases.entries()) {
    assert.equal(row.beforeStores, row.afterStores); assert.equal(row.pendingBeforeCleanup, 0); assert.equal(row.pendingAfterCleanup, 0);
    const phases = index === 2 ? ['candidate', 'second-choice', 'before-enter', 'after-enter'] : index === 3 ? ['candidate', 'bounded-choice', 'before-enter', 'after-enter'] : index === 5 ? ['candidate', 'after-pointer'] : index === 6 ? ['candidate', 'after-escape', 'after-reopen', 'before-enter', 'after-enter'] : index === 7 ? ['query-""', 'query-"F"', 'query-"   "', 'query-"zzqxvv"'] : ['candidate', 'before-enter', 'after-enter'];
    assert.deepEqual(row.phases.map(phase => phase.phase), phases);
    for (const phase of row.phases) {
      if (index === 7) { const query = JSON.parse(phase.phase.slice(6)); assertState(phase.state, [], 0, query, [], row.players, row.beforeStores); }
      else if (['after-enter', 'after-pointer'].includes(phase.phase)) assertState(phase.state, [], 0, '', [names[index]], row.players, row.beforeStores);
      else if (phase.phase === 'after-escape') assertState(phase.state, [], 0, queries[index], [], row.players, row.beforeStores);
      else assertState(phase.state, menus[index], ['second-choice', 'before-enter'].includes(phase.phase) && index === 2 ? 1 : ['bounded-choice', 'before-enter'].includes(phase.phase) && index === 3 ? 8 : 0, queries[index], [], row.players, row.beforeStores);
    }
    assertState(row.final, [], 0, index === 7 ? 'zzqxvv' : '', index === 7 ? [] : [names[index]], row.players, row.beforeStores);
  }
}
function unitRun(name, source, bare, faults) {
  const dir = path.join(OUT, name), reportFile = path.join(dir, 'vitest.json'), env = { ...process.env, FOOTLE_EXACT_TRACE_DIR: dir, FORCE_COLOR: '0' };
  delete env.NO_DOUBLE_SWAP; delete env.PLAYER_SEARCH_KEYBOARD_CONTROL;
  let copy; if (source !== undefined) { copy = moduleCopy(name, source, plan.fixed); env.NO_DOUBLE_SWAP = JSON.stringify({ ...runtimeAliases, '@/components/game/PlayerSearch': copy.consumedFile }); }
  else if (!bare) env.NO_DOUBLE_SWAP = JSON.stringify(runtimeAliases);
  const run = child([path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', TEST_FILE, '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'], env, dir);
  assert.equal(run.status, faults.length ? 1 : 0);
  const { rows } = raw(reportFile, 8, faults, TITLES.map(title => 'Footle exact name priority ' + title));
  for (const index of faults) { const row = rows.find(row => row.title === TITLES[index]), message = row.failureMessages[0].replace(/\x1b\[[0-9;]*m/g, '');
    assert(message.startsWith('AssertionError: ' + PURPOSE), 'Only the declared callback assertion fails');
    assert(message.includes('footleExactNamePriority.test.tsx:' + PURPOSE_LINE + ':'), 'Frozen leading callback assertion frame'); }
  const traceFile = path.join(dir, 'trace.json'), trace = JSON.parse(fs.readFileSync(traceFile)); validateTrace(trace, faults.length > 0);
  if (copy) copy.record.executed = true;
  const row = { name, status: 'passed', cases: 8, passed: 8 - faults.length, failed: faults.length, pending: 0, bare,
    reportFile: relative(reportFile), traceFile: relative(traceFile), processFile: relative(path.join(dir, 'process.json')), sourceBodySha256: hash(source ?? plan.actual) };
  summary.arms.push(row); save(); return trace;
}
try {
  for (const direction of ['forward', 'inverse']) {
    const original = direction === 'forward' ? plan.original : plan.fixed, anchor = direction === 'forward' ? HUNK.original : HUNK.fixed;
    for (const [kind, body] of [['missing', original.replace(anchor, '')], ['altered', original.replace(anchor, anchor + ' ')], ['duplicate', original + '\n' + anchor], ['unknown-whole', '\n' + original]]) {
      assert.notEqual(body, original); assert.throws(() => changePriority(body, direction)); summary.sourceRefusals.push({ name: direction + '-' + kind, inputSha256: hash(body), rejected: true });
    }
  }
  assert.throws(() => sourceForArm(plan, 'unknown')); summary.sourceRefusals.push({ name: 'unknown-arm', rejected: true });
  assert.throws(() => sourceForArm({ ...plan, mode: 'fixed', originalAdmission: null }, 'normal')); summary.sourceRefusals.push({ name: 'unadmitted-fixed', rejected: true });
  assert.throws(() => readPlan(ROOT, 'invalid')); summary.sourceRefusals.push({ name: 'invalid-mode', rejected: true });
  const normal = unitRun('normal', undefined, false, MODE === 'baseline' ? FAULTS : []);
  assert.deepEqual(unitRun('bare', undefined, true, MODE === 'baseline' ? FAULTS : []), normal, 'Actual normal and absent-alias traces equal');
  if (MODE === 'fixed') { unitRun('removed-priority', sourceForArm(plan, 'removed-priority'), false, FAULTS);
    assert.deepEqual(unitRun('restored', sourceForArm(plan, 'restored'), false, []), normal, 'Executed whole-inverse restored module traces equal'); }
  const cliRows = [], replayRows = [];
  for (const [control, mutation] of Object.entries(OLD_CONTROLS)) {
    const faults = mutation?.[3] || [], env = { ...process.env, FORCE_COLOR: '0' }; delete env.NO_DOUBLE_SWAP; delete env.FOOTLE_EXACT_TRACE_DIR; delete env.PLAYER_SEARCH_KEYBOARD_CONTROL;
    if (control !== 'normal') env.PLAYER_SEARCH_KEYBOARD_CONTROL = control;
    const cliDir = path.join(OUT, 'old-cli', control), cli = child([path.join(ROOT, OLD_CLI)], env, cliDir, 150000); assert.equal(cli.status, 0);
    if (control === 'normal') assert(cli.stdout.includes('Footle search:12/12 actual-component cases pass, no skips or diagnostic faults.'));
    else { const lines = cli.stdout.split('\n').filter(line => line.startsWith('PLAYER_SEARCH_CONTROL: ')); assert.equal(lines.length, 1); const result = JSON.parse(lines[0].slice('PLAYER_SEARCH_CONTROL: '.length)); assert.equal(result.control, control); assert.deepEqual([...result.failed].sort(), faults.map(index => oldTitles[index]).sort()); assert.equal(result.messages.length, faults.length); }
    assert(cli.stdout.includes('Footle search: CRLF bindings proved, original bytes held and owned copies cleaned. Native and full-game acceptance are separate.'));
    cliRows.push({ control, status: 'passed', currentSource: true, historical: false, cases: 12, passed: 12 - faults.length, failed: faults.length, pending: 0,
      sourceBodySha256: hash(mutation ? plan.actual.replaceAll(mutation[0], mutation[1]) : plan.actual), methodFile: OLD_CLI, methodSha256: hash(oldCliSource), innerRawRetained: false, reportFile: null, traceFile: null,
      processFile: relative(path.join(cliDir, 'process.json')), stdoutFile: relative(path.join(cliDir, 'stdout.log')), stderrFile: relative(path.join(cliDir, 'stderr.log')), transportFile: relative(path.join(cliDir, 'transport.transport')) });
    const rawDir = path.join(OUT, 'old-replay', control), reportFile = path.join(rawDir, 'vitest.json'), replayEnv = { ...env }; delete replayEnv.PLAYER_SEARCH_KEYBOARD_CONTROL;
    let body = plan.actual, copy;
    if (mutation) { const [anchor, replacement, count] = mutation; assert.equal(body.split(anchor).length - 1, count); assert.equal(body.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '').split(anchor).length - 1, count);
      body = body.replaceAll(anchor, replacement); assert.notEqual(body, plan.actual); const recovered = body.replaceAll(replacement, anchor); assert.equal(recovered, plan.actual);
      copy = moduleCopy('old-' + control, body, recovered); replayEnv.NO_DOUBLE_SWAP = JSON.stringify({ ...runtimeAliases, '@/components/game/PlayerSearch': copy.consumedFile });
    }
    const result = child([path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', OLD_TEST, '--reporter=json', '--outputFile.json=' + reportFile, '--maxWorkers=1', '--no-file-parallelism'], replayEnv, rawDir);
    assert.equal(result.status, faults.length ? 1 : 0); const { rows } = raw(reportFile, 12, faults, oldTitles.map(title => 'Footle search keyboard choices ' + title));
    const frames = { hidden: { 3: 82 }, reopen: { 4: 94, 5: 94 }, active: { 11: 174 }, selected: { 11: 172 }, callback: { 0: 46, 1: 61, 2: 69, 4: 97, 5: 97, 8: 132, 9: 144, 10: 156 } };
    for (const index of faults) { const message = rows.find(row => row.title === oldTitles[index]).failureMessages[0].replace(/\x1b\[[0-9;]*m/g, '');
      assert(/^(?:AssertionError:|Error: expect\(element\)\.(?:toHaveTextContent|toHaveAttribute)\()/.test(message));
      assert(message.includes('playerSearchKeyboard.test.tsx:' + frames[control][index] + ':'), 'Exact existing assertion frame'); }
    if (copy) copy.record.executed = true;
    replayRows.push({ control, status: 'passed', currentSource: true, historical: false, cases: 12, passed: 12 - faults.length, failed: faults.length, pending: 0,
      sourceBodySha256: hash(body), testFile: OLD_TEST, testSha256: hash(oldTestSource), sourceFile: copy?.record.sourceFile ?? PRODUCT,
      recoveredFile: copy?.record.recoveredFile ?? null, reportFile: relative(reportFile), traceFile: null, processFile: relative(path.join(rawDir, 'process.json')) }); save();
  }
  summary.oldCli = cliRows;
  summary.oldReplay = replayRows;
  summary.fixedUnitProofPassed = MODE === 'fixed'; summary.status = 'passed';
} finally {
  fs.rmSync(TEMP, { recursive: true, force: true }); summary.temporaryModulesRemoved = !fs.existsSync(TEMP);
  const controlAfter = fs.existsSync(simControlRoot) ? evidenceTree(simControlRoot) : []; assert.deepEqual(controlAfter, oldControlBefore, 'Old CLI leaves no owned copy');
  if (!hadSimControl && fs.existsSync(simControlRoot)) fs.rmdirSync(simControlRoot);
  const after = snapshot(ROOT); write(path.join(OUT, 'source.after.json'), after); assert.deepEqual(after, before, 'Every tracked physical source body held');
  assert.equal(fs.readFileSync(process.env.SIM_OFFLINE_RECEIPT, 'utf8'), ''); summary.sourceHeld = true; save();
}
assert.equal(summary.status, 'passed'); assert(summary.sourceHeld && summary.temporaryModulesRemoved);
console.log(`Footle exact priority: ${summary.arms.length} actual eight-case arms completed with exact callback faults and no skips.`);
console.log('Footle exact priority: six unchanged old885 CLI executions completed; deleted inner reports receive no retained-raw credit.');
console.log('Footle exact priority: six separate twelve-case raw replays preserve keyboard, pointer, exclusions, ranking and accessibility controls.');
console.log('Footle exact priority: full source inverses, present-empty transports, tracked physical bytes and temporary cleanup held. Native full-game acceptance is separate.');
console.log(JSON.stringify({ kind: RESULT_KIND, mode: MODE, evidenceRoot, modeEnvAbsent, outEnvAbsent,
  summarySha256: hash(fs.readFileSync(path.join(OUT, 'summary.json'))), sourceHeld: true, temporaryModulesRemoved: true, productQualified: false }));
}
await main();