// Remote-only proof of first-submission timer synchronization on the actual Grid hook.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';

const BASE = 'cba9081632e5755adbbf732ac2b9a7978b835238';
const HOOK = 'src/hooks/useSoccerGrid.ts', TEST = 'src/test/soccerGridInitialTimer.test.tsx';
const SELF = 'scripts/qa/proveSoccerGridInitialTimer.mjs', WORKFLOW = '.github/workflows/soccer-grid-initial-timer.yml';
const BROWSER = 'scripts/qa/playSoccerGridInitialTimer.mjs';
const TEST_SHA = '4897cad5298aaf8b96747b4de1b2dc8f15563c97b1d37e8a166fa4b455d04a97';
const ORIGINAL_SHA = '6940e46da1b9b9984ec85309ed01c502a24e54c6c80d5c4a79aa23a03363a2ca';
const CANDIDATE_SHA = '512e2f0fc013799f20c10b0b68e1fc39da71fcd5d0b2890c753e22f315455291';
const OLD = '    const now = Date.now();\n    saveTimerStartedAt(todayStr, now);\n';
const ADDED = '    const now = Date.now();\n    setNowTick(now);\n    saveTimerStartedAt(todayStr, now);\n';
const KEYS = ['idle750', 'idleModes', 'immediate', 'refresh', 'unlimited', 'retry', 'deadline'];
const TITLES = ['an idle 40 second game starts at 40 before its first tick', 'every timed mode starts at its selected duration after a long idle',
  'an immediate first answer starts the ordinary countdown', 'a refreshed timed game resumes its original saved epoch',
  'Unlimited never starts a clock after idle or guesses', 'unverified retries keep the first submission epoch', 'timer expiry records once and rejects a pending late main answer'];
const CAUSES = ['GRID_INITIAL_TIMER_IDLE_FIRST_TICK', 'GRID_INITIAL_TIMER_LONG_IDLE_MODES'];
const RELATED = { 'src/test/soccerGridDeadline.test.tsx': 12, 'src/test/soccerGridSettingsRace.test.tsx': 7,
  'src/hooks/useDailyPuzzleIdentity.test.ts': 7, 'src/hooks/useGameCompletion.test.ts': 4 };
const NOW = Date.parse('2026-10-17T12:00:00.000Z'), RETRY = "Couldn't verify that answer, please try again.";
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const git = args => execFileSync('git', args, { maxBuffer: 64 * 1024 * 1024 });
const require = createRequire(import.meta.url), mode = process.argv[2], out = process.env.GRID_INITIAL_TIMER_OUT;
const setupFault = /Unhandled Errors|Unhandled Rejection|Uncaught Exception|Failed to load|Failed to resolve import|Transform failed|Cannot find module|No test files found|SIM_OFFLINE_BLOCK|TypeError:|ReferenceError:|SyntaxError:/i;
const write = (name, value) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
function once(body, from, to) { assert.equal(body.split(from).length, 2, 'Unique executable timer source anchor'); return body.replace(from, to); }
assert(['baseline', 'fixed'].includes(mode), 'Use baseline or fixed');
assert(['1', 'true'].includes(process.env.CI) && process.env.SIM_NETWORK === 'offline', 'Remote offline CI only');
assert(process.env.NODE_OPTIONS?.includes('offlineTransport.cjs') && require.cache[require.resolve('../lib/offlineTransport.cjs')], 'Actual inherited offline preload');
assert(out && path.isAbsolute(out), 'GRID_INITIAL_TIMER_OUT is absolute');
fs.mkdirSync(out, { recursive: true }); assert(!fs.existsSync(path.join(out, 'report.json')), 'Fresh owned report path');
const report = { version: 1, mode, base: BASE, head: git(['rev-parse', 'HEAD']).toString().trim(), status: 'running', qualified: false, arms: [], related: [],
  limits: 'Actual Grid/Daily/completion hooks with declared external IO and controlled clock. Original and sync-removed arms use identical hook bytes and the same mechanism. No served timer label, live database, real player data or publication claim.' };
let names, before, initialHook, activeHook;
const tracked = () => git(['ls-files', '-z']).toString().split('\0').filter(Boolean).sort();
const sourceMap = () => { assert.deepEqual(tracked(), names, 'Whole tracked membership held'); return Object.fromEntries(names.map(file => [file, sha(fs.readFileSync(file))])); };
const expectedMap = () => ({ ...before, [HOOK]: sha(activeHook) });
function setHook(bytes) { fs.writeFileSync(HOOK, bytes); activeHook = bytes; assert(fs.readFileSync(HOOK).equals(bytes)); }
function noTransport(file) { assert(!fs.existsSync(file) || fs.statSync(file).size === 0, 'Ordinary child transport is empty'); }
function observations(raw, faults) {
  assert.equal(raw.version, 1); assert.deepEqual(raw.caseTitles, TITLES); assert.deepEqual(Object.keys(raw.cases), KEYS);
  const counts = [[1, 1, 0, 0], [3, 3, 0, 0], [1, 1, 2, 1], [2, 1, 2, 1], [1, 1, 2, 1], [1, 2, 0, 0], [2, 2, 2, 1]];
  for (const [index, key] of KEYS.entries()) {
    const row = raw.cases[key]; assert.equal(row.title, TITLES[index]); assert.deepEqual(row.unexpected, []);
    assert(Array.isArray(row.draws) && row.draws.every(draw => draw === 0.25)); assert(row.deferred.every(gate => gate.settled === true));
    assert.deepEqual(['puzzles', 'validator', 'count', 'insert'].map(kind => row.requests.filter(request => request.kind === kind).length), counts[index]);
    assert(row.requests.every(request => ['puzzles', 'validator', 'count', 'insert'].includes(request.kind)));
    for (const step of row.clockSteps) assert.equal(step.to - step.from, step.by);
    for (const moment of row.moments) {
      const state = moment.state; assert.equal(typeof moment.at, 'number'); assert.equal(state.cells.length, 9); assert.equal(state.mainCells.length, 9);
      assert.equal(state.puzzle.rows.length, 3); assert.equal(state.puzzle.cols.length, 3); assert.equal(state.isLoading, false); assert.equal(state.isLoadingPool, false);
      assert.equal(state.storage['soccer-grid-daily-2026-10-17'] ?? null, state.dailyJSON);
      assert.equal(state.storage['soccer-grid-timer-started-2026-10-17'] ?? null, state.timerStartedJSON);
      assert.equal(state.storage['soccer-grid-timer-expired-2026-10-17'] ?? null, state.timerExpiredJSON);
      assert.deepEqual(JSON.parse(state.storage['soccer-grid-settings-2026-10-17']), state.settings);
    }
  }
  const rows = raw.cases, find = (row, label) => { const selected = row.moments.filter(moment => moment.label === label); assert.equal(selected.length, 1); return selected[0]; };
  const idle = rows.idle750, first = find(idle, 'first-submission'), beforeTick = find(idle, 'before-first-tick'), tick = find(idle, 'first-tick');
  assert.equal(first.at, NOW + 750); assert.equal(first.state.timerStartedJSON, String(first.at)); assert.equal(first.state.validating, true);
  assert.equal(first.state.timeLeft, faults ? 41 : 40); assert.equal(beforeTick.state.timeLeft, faults ? 41 : 40); assert.equal(tick.state.timeLeft, 39);
  assert.equal(beforeTick.at - first.at, 999); assert.equal(tick.at - first.at, 1000); assert.equal(first.state.guessesLeft, 15); assert.equal(first.state.correctCount, 0);
  for (const limit of [40, 60, 90]) {
    const row = rows.idleModes, start = find(row, `${limit}-first-submission`), prior = find(row, `${limit}-before-first-tick`), after = find(row, `${limit}-first-tick`);
    assert.equal(start.at - find(row, `${limit}-ready`).at, 3500); assert.equal(start.state.settings.timerMode, limit);
    assert.equal(start.state.timerStartedJSON, String(start.at)); assert.equal(start.state.timeLeft, limit + (faults ? 4 : 0));
    assert.equal(prior.state.timeLeft, limit + (faults ? 4 : 0)); assert.equal(after.state.timeLeft, limit - 1); assert.equal(after.at - start.at, 1000);
  }
  const immediate = find(rows.immediate, 'first-answer').state;
  assert.deepEqual([immediate.timeLeft, immediate.timerStartedJSON, immediate.correctCount, immediate.rarityScore, immediate.guessesLeft, immediate.recordings], [40, String(NOW), 1, 20, 14, []]);
  assert.equal(find(rows.immediate, 'first-tick').state.timeLeft, 39);
  const refresh = rows.refresh.moments.map(moment => moment.state);
  assert.deepEqual(refresh.map(state => state.timeLeft), [28, 25, 24]); assert(refresh.every(state => state.timerStartedJSON === String(NOW)));
  assert.equal(refresh[1].dailyJSON, refresh[0].dailyJSON); assert.equal(refresh[1].correctCount, 1); assert.deepEqual(refresh[1].recordings, []);
  for (const moment of rows.unlimited.moments) { const state = moment.state; assert.deepEqual([state.timeLeft, state.timerStartedJSON, state.timerExpiredJSON, state.timeUp, state.gameStatus, state.recordings], [null, null, null, false, 'playing', []]); }
  const retry = rows.retry.moments.map(moment => moment.state); assert.deepEqual(retry.map(state => state.timeLeft), [40, 38, 37]);
  for (const state of retry) assert.deepEqual([state.timerStartedJSON, state.guessesLeft, state.correctCount, state.recordings], [String(NOW), 15, 0, []]);
  assert.equal(retry[2].dailyJSON, retry[0].dailyJSON); assert.deepEqual(retry[2].toasts, [[RETRY], [RETRY]]); assert.equal(retry[2].validating, false); assert.equal(retry[2].activeCell, null);
  const done = find(rows.deadline, 'completed-main').state, released = find(rows.deadline, 'late-answer-released').state, restored = find(rows.deadline, 'expired-refresh').state;
  assert.deepEqual([done.timeLeft, done.timeUp, done.gameStatus, done.recordings], [0, true, 'complete', [['/soccer-grid', 100, 'Grid Timer Fixture Guest', 0]]]);
  for (const state of [released, restored]) { assert.equal(state.dailyJSON, done.dailyJSON); assert.deepEqual(state.mainCells, done.mainCells); assert.deepEqual(state.recordings, done.recordings);
    assert.deepEqual([state.correctCount, state.rarityScore, state.gameStatus, state.timerStartedJSON, state.timerExpiredJSON], [1, 20, 'complete', String(NOW), '1']); }
  assert.equal(released.validating, false); assert.equal(released.activeCell, null);
}
try {
  assert.equal(report.head, process.env.GITHUB_SHA); git(['merge-base', '--is-ancestor', BASE, report.head]);
  assert.equal(git(['status', '--porcelain', '--untracked-files=normal', '--', '.', ':!docs']).toString(), '', 'Clean committed source');
  const allowed = new Set([TEST, SELF, WORKFLOW, BROWSER, ...(mode === 'fixed' ? [HOOK] : [])]);
  const changed = git(['diff', '--name-only', BASE, report.head, '--', '.', ':!docs']).toString().trim().split('\n').filter(Boolean);
  assert(changed.every(file => allowed.has(file)), 'Only declared source leaves: ' + changed); for (const file of [TEST, SELF, WORKFLOW]) assert(changed.includes(file));
  assert.equal(sha(fs.readFileSync(TEST)), TEST_SHA); for (const file of [TEST, SELF, WORKFLOW]) assert(fs.readFileSync(file).equals(git(['show', report.head + ':' + file])));
  const original = git(['show', BASE + ':' + HOOK]); assert.equal(sha(original), ORIGINAL_SHA);
  const candidate = Buffer.from(once(original.toString(), OLD, ADDED)); assert.equal(sha(candidate), CANDIDATE_SHA);
  const removed = Buffer.from(once(candidate.toString(), ADDED, OLD)); assert(removed.equals(original), 'Whole single-line control inverse'); assert(!removed.equals(candidate));
  initialHook = fs.readFileSync(HOOK); activeHook = initialHook; assert(initialHook.equals(mode === 'baseline' ? original : candidate));
  for (const file of Object.keys(RELATED)) assert(fs.readFileSync(file).equals(git(['show', BASE + ':' + file])), 'Unchanged related test: ' + file);
  for (const [label, body] of [['original', original], ['candidate', candidate], ['sync-removed', removed]]) fs.writeFileSync(path.join(out, label + '-hook.ts'), body, { flag: 'wx' });
  fs.copyFileSync(TEST, path.join(out, 'frozen-test.tsx'), fs.constants.COPYFILE_EXCL);
  names = tracked(); before = sourceMap(); write('source-before.json', before);
  write('source-bindings.json', { base: BASE, head: report.head, mode, changed, test: { file: TEST, sha256: TEST_SHA }, hook: HOOK,
    originalSha256: ORIGINAL_SHA, candidateSha256: CANDIDATE_SHA, removedSha256: sha(removed), spans: [[OLD, ADDED]], wholeInverseExact: true,
    related: Object.fromEntries(Object.entries(RELATED).map(([file, count]) => [file, { count, sha256: sha(fs.readFileSync(file)) }])) });
  function child(label, args, env) {
    assert.deepEqual(sourceMap(), expectedMap(), label + ' complete source before'); const dir = path.join(out, label); fs.mkdirSync(dir);
    const result = spawnSync(process.execPath, args(path.join(dir, 'vitest.json')), { encoding: 'utf8', timeout: 300000, maxBuffer: 64 * 1024 * 1024,
      env: { ...env, SIM_OFFLINE_RECEIPT: path.join(dir, 'units.transport') } });
    fs.writeFileSync(path.join(dir, 'stdout.log'), result.stdout || '', { flag: 'wx' }); fs.writeFileSync(path.join(dir, 'stderr.log'), result.stderr || '', { flag: 'wx' });
    write(label + '/process.json', { exit: result.status, signal: result.signal, error: result.error ? { name: result.error.name, message: result.error.message } : null,
      args: args(path.join(dir, 'vitest.json')), expectedHookSha256: sha(activeHook) });
    const after = sourceMap(); write(label + '/source-after.json', after); assert.deepEqual(after, expectedMap(), label + ' complete source after');
    assert(!result.error && !result.signal && result.status !== null); assert(!setupFault.test((result.stdout || '') + (result.stderr || '')), label + ' no setup/unhandled/transport fault');
    noTransport(path.join(dir, 'units.transport')); return { dir, result, units: JSON.parse(fs.readFileSync(path.join(dir, 'vitest.json'))) };
  }
  const options = target => ['--maxWorkers=1', '--minWorkers=1', '--reporter=default', '--reporter=json', '--outputFile=' + target];
  function arm(label, faults) {
    const record = { label, status: 'unqualified', expectedHookSha256: sha(activeHook) }; report.arms.push(record);
    const rawFile = path.join(out, label, 'observations.json');
    const { result, units } = child(label, target => ['node_modules/vitest/vitest.mjs', 'run', TEST, ...options(target)], { ...process.env, SC_GRID_INITIAL_TIMER_RAW: rawFile });
    const rows = units.testResults.flatMap(suite => suite.assertionResults); assert.equal(units.testResults.length, 1); assert(units.testResults[0].name.replaceAll('\\', '/').endsWith('/' + TEST));
    assert.equal(result.status, faults ? 1 : 0); assert.equal(units.success, !faults); assert.equal(units.numTotalTests, 7); assert.equal(units.numPassedTests, faults ? 5 : 7); assert.equal(units.numFailedTests, faults ? 2 : 0);
    assert.equal(units.numPendingTests, 0); assert.equal(units.numTodoTests, 0); assert.deepEqual(rows.map(row => row.title), TITLES); if (units.unhandledErrors !== undefined) assert.deepEqual(units.unhandledErrors, []);
    for (const [i, row] of rows.entries()) { assert.equal(row.status, faults && i < 2 ? 'failed' : 'passed'); if (faults && i < 2) { assert.equal(row.failureMessages.length, 1); assert(row.failureMessages[0].includes(CAUSES[i])); assert(/expected false to be true/i.test(row.failureMessages[0])); } else assert.deepEqual(row.failureMessages, []); }
    const bytes = fs.readFileSync(rawFile), raw = JSON.parse(bytes); observations(raw, faults);
    Object.assign(record, { status: 'qualified', exit: result.status, passed: units.numPassedTests, failed: units.numFailedTests, rawBytes: bytes.length, rawSha256: sha(bytes), sourceHeld: true });
    write(label + '/qualification.json', record); return { bytes, raw };
  }
  function related(label) {
    const env = { ...process.env }; delete env.SC_GRID_INITIAL_TIMER_RAW; delete env.SC_GRID_SETTINGS_RAW; delete env.SC_GRID_DEADLINE_RAW;
    const { result, units } = child(label, target => ['node_modules/vitest/vitest.mjs', 'run', ...Object.keys(RELATED), ...options(target)], env);
    const rows = units.testResults.flatMap(suite => suite.assertionResults); assert.equal(result.status, 0); assert.equal(units.success, true); assert.equal(units.testResults.length, 4);
    assert.deepEqual([units.numTotalTests, units.numPassedTests, units.numFailedTests, units.numPendingTests, units.numTodoTests], [30, 30, 0, 0, 0]); if (units.unhandledErrors !== undefined) assert.deepEqual(units.unhandledErrors, []);
    const seen = new Set(); for (const suite of units.testResults) { const file = Object.keys(RELATED).find(file => suite.name.replaceAll('\\', '/').endsWith('/' + file)); assert(file && !seen.has(file)); seen.add(file); assert.equal(suite.assertionResults.length, RELATED[file]); }
    assert.equal(rows.length, 30); assert(rows.every(row => row.status === 'passed' && row.failureMessages.length === 0)); report.related.push({ label, status: 'qualified', counts: Object.values(RELATED), passed: 30, sourceHeld: true });
  }
  if (mode === 'baseline') { arm('baseline', true); related('related-baseline'); }
  else {
    const baseline = process.env.GRID_INITIAL_TIMER_BASELINE_RAW_SHA256; assert(/^[0-9a-f]{64}$/.test(baseline || ''), 'Actual separately qualified baseline raw SHA is mandatory');
    const normal = arm('normal', false); related('related-normal');
    try { for (const [label, body] of [['original', original], ['sync-removed', removed]]) { setHook(body); const control = arm(label, true);
      assert.equal(sha(control.bytes), baseline, label + ' complete raw equals actual baseline'); for (const key of KEYS.slice(2)) assert.deepEqual(control.raw.cases[key], normal.raw.cases[key], label + ' whole healthy case: ' + key); }
    } finally { setHook(initialHook); assert.deepEqual(sourceMap(), before, 'Complete candidate restored after controls'); }
    const restored = arm('restored', false); assert(restored.bytes.equals(normal.bytes), 'Whole normal/restored raw bytes equal'); related('related-restored');
    report.baselineRawSha256 = baseline; report.healthyCasesHeld = KEYS.slice(2); report.normalRestoredBytesEqual = true;
  }
  report.status = 'passed'; report.qualified = true;
} catch (error) { report.status = 'failed'; report.qualified = false; report.error = { name: error.name, message: error.message, stack: error.stack }; process.exitCode = 1; }
finally {
  if (before) { try { if (initialHook) setHook(initialHook); const after = sourceMap(); write('source-after.json', after); assert.deepEqual(after, before); report.sourceHeld = true; }
    catch (error) { report.status = 'failed'; report.qualified = false; report.sourceHeld = false; report.sourceError = error.message; process.exitCode = 1; } }
  write('report.json', report); console.log(`Grid initial timer ${mode}: ${report.status}; ${report.arms.length} arm(s), ${report.related.length} related run(s); qualified=${report.qualified}`);
}
