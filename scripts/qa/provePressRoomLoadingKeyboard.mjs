// Remote-only proof of keyboard access to the actual pending Press Room.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';

const BASE = 'cc6605203b00b06ed994cf321fff5eea3060f708';
const PAGE = 'src/components/soccer-career/PressRoomTile.tsx', TEST = 'src/test/pressRoomLoadingKeyboard.test.tsx';
const SELF = 'scripts/qa/provePressRoomLoadingKeyboard.mjs', WORKFLOW = '.github/workflows/press-room-loading-keyboard.yml';
const BROWSER = 'scripts/qa/playPressRoomLoadingKeyboard.mjs';
const TEST_SHA = '2413829ed438e3c3a496500607ac54741b0ee508e4196e6293b1247ce23d044e';
const ORIGINAL_SHA = '39b584d461e6a242973f55749652c09bb829dd92184ccba1a3f2e8b5632b54f9';
const CANDIDATE_SHA = '731e8bcd2ab5805942b5a29d22f0f48a5a1deb99819a56216aa04faa5991424b';
const OLD = '<div role="dialog" aria-label="Opening the press room" className=';
const ADDED = '<div role="dialog" aria-modal="true" aria-label="Opening the press room" tabIndex={-1} ref={focusDialogOnMount} onKeyDown={escapeCloses(close)} className=';
const KEYS = ['pendingFocus', 'pendingEscape', 'pendingBack', 'loadedRoom'];
const TITLES = ['opening a pending press room focuses its loading dialog', 'Escape from the pending press room closes and stays closed after import',
  'Back closes a pending press room without changing the career or pending save', 'the actual loaded press room keeps Escape and Back exits healthy'];
const CAUSES = ['PRESS_PENDING_FOCUS_AND_MODAL', 'PRESS_PENDING_ESCAPE_CLOSE'];
const RELATED = { 'src/test/soccerPressRoomFailure.test.tsx': 5, 'src/test/soccerPressRoomUi.test.tsx': 13,
  'src/test/soccerPressRoomReadAsAbsent.test.tsx': 19, 'src/test/soccerPressSettlementOrder.test.ts': 2,
  'src/lib/soccerCareerPress.test.ts': 78, 'src/test/routeErrorHeldSave.test.tsx': 3, 'src/test/safeStorage.test.ts': 40,
  'src/test/freshBuildOptionalChunk.test.ts': 6, 'src/test/freshBuildBlockedStorage.test.ts': 11, 'src/test/freshBuildReloadWait.test.ts': 8 };
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const git = args => execFileSync('git', args, { maxBuffer: 64 * 1024 * 1024 });
const require = createRequire(import.meta.url), mode = process.argv[2], out = process.env.PRESS_LOADING_KEYBOARD_OUT;
const setupFault = /Unhandled Errors|Unhandled Rejection|Uncaught Exception|Failed to load|Failed to resolve import|Transform failed|Cannot find module|No test files found|SIM_OFFLINE_BLOCK|TypeError:|ReferenceError:|SyntaxError:/i;
const write = (name, value) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
function once(body, from, to) { assert.equal(body.split(from).length, 2, 'Unique executable loading source anchor'); const changed = body.replace(from, to); assert.notEqual(changed, body); return changed; }
assert(['baseline', 'fixed'].includes(mode), 'Use baseline or fixed');
assert(['1', 'true'].includes(process.env.CI) && process.env.SIM_NETWORK === 'offline', 'Remote offline CI only');
assert(process.env.NODE_OPTIONS?.includes('offlineTransport.cjs') && require.cache[require.resolve('../lib/offlineTransport.cjs')], 'Actual inherited offline preload');
assert(out && path.isAbsolute(out), 'PRESS_LOADING_KEYBOARD_OUT is absolute');
fs.mkdirSync(out, { recursive: true }); assert(!fs.existsSync(path.join(out, 'report.json')), 'Fresh owned report path');
const report = { version: 1, mode, base: BASE, head: git(['rev-parse', 'HEAD']).toString().trim(), status: 'running', qualified: false, arms: [], related: [],
  limits: 'Actual optional tile, real Press Room and pending-save registry with declared deferred module IO. Pending DOM and focus changes are retained explicitly; logical preservation is compared separately. No focus trap, provider, physical device, current joined release or publication claim.' };
let names, before, initialPage, activePage;
const tracked = () => git(['ls-files', '-z']).toString().split('\0').filter(Boolean).sort();
const sourceMap = () => { assert.deepEqual(tracked(), names, 'Whole tracked membership held'); return Object.fromEntries(names.map(file => [file, sha(fs.readFileSync(file))])); };
const expectedMap = () => ({ ...before, [PAGE]: sha(activePage) });
function setPage(bytes) { fs.writeFileSync(PAGE, bytes); activePage = bytes; assert(fs.readFileSync(PAGE).equals(bytes)); }
function noTransport(file) { assert(!fs.existsSync(file) || fs.statSync(file).size === 0, 'Ordinary child transport is empty'); }
function observations(raw, label) {
  assert.equal(raw.version, 1); assert.deepEqual(raw.caseTitles, TITLES); assert.deepEqual(Object.keys(raw.cases), KEYS);
  const old = ['baseline', 'original'].includes(label), focused = !old && label !== 'focus-removed';
  const modal = !old && label !== 'modal-removed', escaped = focused && label !== 'escape-removed';
  const labels = [
    ['mounted', 'import-pending', 'import-loaded', 'actual-room', 'loaded-back', 'finished', 'final-before-cleanup'],
    ['mounted', 'import-pending', 'pending-escape', 'late-import-resolved', ...(!escaped ? ['original-room-after-unhandled-escape', 'original-back-recovery'] : []), 'reopened-real-room', 'reopened-back', 'finished', 'final-before-cleanup'],
    ['mounted', 'import-pending', 'pending-back', 'late-import-resolved', 'finished', 'final-before-cleanup'],
    ['mounted', 'import-pending', 'import-loaded', 'actual-room', 'loaded-escape', 'loaded-reopened', 'loaded-back', 'finished', 'final-before-cleanup'],
  ];
  for (const [index, key] of KEYS.entries()) {
    const row = raw.cases[key]; assert.equal(row.title, TITLES[index]);
    assert.equal(row.initial.phase, 'playing'); assert.equal(row.initial.age, 25); assert.equal(row.initial.currentClub, 'Press Fixture Town');
    assert.deepEqual(row.initial.events, ['Unsaved fictional career change']); assert.deepEqual(row.latest, row.initial);
    assert.deepEqual(row.persistedBefore, { ...row.initial, events: ['Earlier fictional career save'] });
    assert.equal(row.storesBefore.local['press-loading-keyboard-career'], JSON.stringify(row.persistedBefore));
    assert.equal(row.storesBefore.local['press-keyboard-sentinel'], 'local held'); assert.equal(row.storesBefore.session['press-keyboard-sentinel'], 'session held');
    assert.deepEqual([row.importCalls, row.gate, row.realModuleLoaded, row.mounts, row.unmounts, row.cleanupStarted, row.cleanupUnmounts], [1, 'resolved', true, 1, 0, true, 1]);
    assert.deepEqual(row.patches, []); assert.deepEqual(row.draws, []); assert.deepEqual(row.console, []);
    assert.deepEqual(row.saveAttempts, [row.initial, row.initial]);
    assert.deepEqual(row.saveChecks, [{ label: 'mounted', before: true, result: false, after: true }, { label: 'finished', before: true, result: false, after: true }]);
    assert.deepEqual(row.snapshots.map(snapshot => snapshot.label), labels[index]);
    for (const snapshot of row.snapshots) {
      assert.deepEqual(snapshot.state, row.initial); assert.deepEqual(snapshot.local, row.storesBefore.local); assert.deepEqual(snapshot.session, row.storesBefore.session);
      assert.deepEqual([snapshot.parentMounted, snapshot.pendingSave, snapshot.parentMounts, snapshot.parentUnmounts], [true, true, 1, 0]);
      assert.deepEqual(snapshot.patches, []); assert.deepEqual(snapshot.draws, []); assert.equal(typeof snapshot.html, 'string'); assert.equal(typeof snapshot.focus, 'string');
      assert.equal(snapshot.importCalls, snapshot.label === 'mounted' ? 0 : 1);
      assert(['pending', 'resolved'].includes(snapshot.gate));
    }
    const pending = row.snapshots.find(snapshot => snapshot.label === 'import-pending'); assert.equal(pending.gate, 'pending');
    assert(pending.html.includes('Opening the press room...')); assert(pending.html.includes('Your fictional career remains open'));
    assert.equal(row.snapshots.at(-1).gate, 'resolved'); assert.equal(row.snapshots.at(-1).focus.includes('data-press-room-open'), true);
  }
  assert.deepEqual(raw.cases.pendingFocus.outcome, { focusedInside: focused, modal: modal ? 'true' : null, tabIndex: old ? null : '-1', gatePending: true });
  assert.deepEqual(raw.cases.pendingFocus.keyEvents, []);
  assert.deepEqual(raw.cases.pendingEscape.outcome, { closedWhilePending: escaped, focusReturned: escaped || !focused, gatePending: true, stayedClosed: escaped, recoveryBackUsed: !escaped, reopenedRealRoom: true });
  assert.equal(raw.cases.pendingEscape.keyEvents.length, 1); const pendingKey = raw.cases.pendingEscape.keyEvents[0];
  assert.deepEqual([pendingKey.label, pendingKey.key, pendingKey.prevented, pendingKey.dispatchResult], ['pending-escape', 'Escape', false, true]);
  const pendingFocus = raw.cases.pendingEscape.snapshots.find(snapshot => snapshot.label === 'import-pending').focus;
  assert.equal(pendingKey.target, pendingFocus); assert.equal(pendingKey.target.includes('aria-label="Opening the press room"'), focused);
  assert.deepEqual(raw.cases.pendingBack.outcome, { closedWhilePending: true, focusReturned: true, gatePending: true, stayedClosed: true });
  assert.deepEqual(raw.cases.pendingBack.keyEvents, []);
  assert.deepEqual(raw.cases.loadedRoom.outcome, { focusedInRoom: true, escapeFocusReturned: true, backFocusReturned: true });
  assert.equal(raw.cases.loadedRoom.keyEvents.length, 1); const loadedKey = raw.cases.loadedRoom.keyEvents[0];
  assert.deepEqual([loadedKey.label, loadedKey.key, loadedKey.prevented, loadedKey.dispatchResult], ['loaded-escape', 'Escape', true, false]);
}
function logicalHealthy(row) {
  return { ...row, snapshots: row.snapshots.map(snapshot => snapshot.label === 'import-pending' ? { ...snapshot, html: null, focus: null } : snapshot) };
}
try {
  assert.equal(report.head, process.env.GITHUB_SHA); git(['merge-base', '--is-ancestor', BASE, report.head]);
  assert.equal(git(['status', '--porcelain', '--untracked-files=normal', '--', '.', ':!docs']).toString(), '', 'Clean committed source');
  const allowed = new Set([TEST, SELF, WORKFLOW, BROWSER, ...(mode === 'fixed' ? [PAGE] : [])]);
  const changed = git(['diff', '--name-only', BASE, report.head, '--', '.', ':!docs']).toString().trim().split('\n').filter(Boolean);
  assert(changed.every(file => allowed.has(file)), 'Only declared source leaves: ' + changed); for (const file of [TEST, SELF, WORKFLOW]) assert(changed.includes(file));
  assert.equal(sha(fs.readFileSync(TEST)), TEST_SHA); for (const file of [TEST, SELF, WORKFLOW]) assert(fs.readFileSync(file).equals(git(['show', report.head + ':' + file])));
  const original = git(['show', BASE + ':' + PAGE]); assert.equal(sha(original), ORIGINAL_SHA);
  const candidate = Buffer.from(once(original.toString(), OLD, ADDED)); assert.equal(sha(candidate), CANDIDATE_SHA);
  assert(Buffer.from(once(candidate.toString(), ADDED, OLD)).equals(original), 'Whole one-span product inverse');
  const controls = [
    ['focus-removed', ' ref={focusDialogOnMount}', [0, 1]],
    ['escape-removed', ' onKeyDown={escapeCloses(close)}', [1]],
    ['modal-removed', ' aria-modal="true"', [0]],
  ].map(([label, operand, faults]) => { const line = once(ADDED, operand, ''); const body = Buffer.from(once(candidate.toString(), ADDED, line));
    assert.notEqual(sha(body), CANDIDATE_SHA); assert.equal(once(body.toString(), line, ADDED), candidate.toString(), 'Whole attribute control inverse'); return { label, body, faults, old: ADDED, changed: line }; });
  initialPage = fs.readFileSync(PAGE); activePage = initialPage; assert(initialPage.equals(mode === 'baseline' ? original : candidate));
  for (const file of Object.keys(RELATED)) assert(fs.readFileSync(file).equals(git(['show', BASE + ':' + file])), 'Unchanged related test: ' + file);
  for (const [label, body] of [['original', original], ['candidate', candidate], ...controls.map(control => [control.label, control.body])]) fs.writeFileSync(path.join(out, label + '-PressRoomTile.tsx'), body, { flag: 'wx' });
  fs.copyFileSync(TEST, path.join(out, 'frozen-test.tsx'), fs.constants.COPYFILE_EXCL);
  names = tracked(); before = sourceMap(); write('source-before.json', before);
  write('source-bindings.json', { base: BASE, head: report.head, mode, changed, test: { file: TEST, sha256: TEST_SHA }, page: PAGE,
    originalSha256: ORIGINAL_SHA, candidateSha256: CANDIDATE_SHA, spans: [[OLD, ADDED]], wholeInverseExact: true,
    controls: controls.map(control => ({ label: control.label, sha256: sha(control.body), faults: control.faults, spans: [[control.old, control.changed]], wholeInverseExact: true })),
    related: Object.fromEntries(Object.entries(RELATED).map(([file, count]) => [file, { count, sha256: sha(fs.readFileSync(file)) }])) });
  function child(label, args, env) {
    assert.deepEqual(sourceMap(), expectedMap(), label + ' complete source before'); const dir = path.join(out, label); fs.mkdirSync(dir);
    const result = spawnSync(process.execPath, args(path.join(dir, 'vitest.json')), { encoding: 'utf8', timeout: 300000, maxBuffer: 64 * 1024 * 1024,
      env: { ...env, SIM_OFFLINE_RECEIPT: path.join(dir, 'units.transport') } });
    fs.writeFileSync(path.join(dir, 'stdout.log'), result.stdout || '', { flag: 'wx' }); fs.writeFileSync(path.join(dir, 'stderr.log'), result.stderr || '', { flag: 'wx' });
    write(label + '/process.json', { exit: result.status, signal: result.signal, error: result.error ? { name: result.error.name, message: result.error.message } : null,
      args: args(path.join(dir, 'vitest.json')), expectedPageSha256: sha(activePage) });
    const after = sourceMap(); write(label + '/source-after.json', after); assert.deepEqual(after, expectedMap(), label + ' complete source after');
    assert(!result.error && !result.signal && result.status !== null); assert(!setupFault.test((result.stdout || '') + (result.stderr || '')), label + ' no setup/unhandled/transport fault');
    noTransport(path.join(dir, 'units.transport')); return { result, units: JSON.parse(fs.readFileSync(path.join(dir, 'vitest.json'))) };
  }
  const options = target => ['--maxWorkers=1', '--minWorkers=1', '--reporter=default', '--reporter=json', '--outputFile=' + target];
  function arm(label, faults) {
    const record = { label, status: 'unqualified', expectedPageSha256: sha(activePage), expectedFaultIndices: faults }; report.arms.push(record);
    const rawFile = path.join(out, label, 'observations.json');
    const { result, units } = child(label, target => ['node_modules/vitest/vitest.mjs', 'run', TEST, ...options(target)], { ...process.env, PRESS_LOADING_KEYBOARD_RAW: rawFile });
    const rows = units.testResults.flatMap(suite => suite.assertionResults); assert.equal(units.testResults.length, 1); assert(units.testResults[0].name.replaceAll('\\', '/').endsWith('/' + TEST));
    assert.equal(result.status, faults.length ? 1 : 0); assert.equal(units.success, faults.length === 0);
    assert.deepEqual([units.numTotalTests, units.numPassedTests, units.numFailedTests, units.numPendingTests, units.numTodoTests], [4, 4 - faults.length, faults.length, 0, 0]);
    assert.deepEqual(rows.map(row => row.title), TITLES); if (units.unhandledErrors !== undefined) assert.deepEqual(units.unhandledErrors, []);
    for (const [i, row] of rows.entries()) { assert.equal(row.status, faults.includes(i) ? 'failed' : 'passed'); if (faults.includes(i)) { assert.equal(row.failureMessages.length, 1); assert(row.failureMessages[0].includes(CAUSES[i])); assert(/expected false to be true/i.test(row.failureMessages[0])); } else assert.deepEqual(row.failureMessages, []); }
    const bytes = fs.readFileSync(rawFile), raw = JSON.parse(bytes); observations(raw, label);
    Object.assign(record, { status: 'qualified', exit: result.status, passed: units.numPassedTests, failed: units.numFailedTests, rawBytes: bytes.length, rawSha256: sha(bytes), sourceHeld: true });
    write(label + '/qualification.json', record); return { bytes, raw };
  }
  function related(label) {
    const env = { ...process.env }; delete env.PRESS_LOADING_KEYBOARD_RAW; delete env.PRESS_ROOM_FAILURE_RAW;
    const { result, units } = child(label, target => ['node_modules/vitest/vitest.mjs', 'run', ...Object.keys(RELATED), ...options(target)], env);
    const rows = units.testResults.flatMap(suite => suite.assertionResults); assert.equal(result.status, 0); assert.equal(units.success, true); assert.equal(units.testResults.length, 10);
    assert.deepEqual([units.numTotalTests, units.numPassedTests, units.numFailedTests, units.numPendingTests, units.numTodoTests], [185, 185, 0, 0, 0]); if (units.unhandledErrors !== undefined) assert.deepEqual(units.unhandledErrors, []);
    const seen = new Set(); for (const suite of units.testResults) { const file = Object.keys(RELATED).find(file => suite.name.replaceAll('\\', '/').endsWith('/' + file)); assert(file && !seen.has(file)); seen.add(file); assert.equal(suite.assertionResults.length, RELATED[file]); }
    assert.equal(rows.length, 185); assert(rows.every(row => row.status === 'passed' && row.failureMessages.length === 0)); report.related.push({ label, status: 'qualified', counts: Object.values(RELATED), passed: 185, sourceHeld: true });
  }
  if (mode === 'baseline') arm('baseline', [0, 1]);
  else {
    const baseline = process.env.PRESS_LOADING_KEYBOARD_BASELINE_RAW_SHA256; assert(/^[a-f0-9]{64}$/.test(baseline || ''), 'Actual separately qualified original raw SHA required');
    const normal = arm('normal', []); related('related-normal');
    try {
      setPage(original); const old = arm('original', [0, 1]); assert.equal(sha(old.bytes), baseline, 'Complete original raw equals the actual qualified baseline');
      for (const key of KEYS.slice(2)) assert.deepEqual(logicalHealthy(old.raw.cases[key]), logicalHealthy(normal.raw.cases[key]), 'Whole declared healthy logical case: ' + key);
      for (const control of controls) { setPage(control.body); const observed = arm(control.label, control.faults);
        for (const key of KEYS.slice(2)) assert.deepEqual(logicalHealthy(observed.raw.cases[key]), logicalHealthy(normal.raw.cases[key]), control.label + ' whole declared healthy logical case: ' + key); }
    } finally { setPage(initialPage); assert.deepEqual(sourceMap(), before, 'Complete candidate restored after controls'); }
    const restored = arm('restored', []); assert(restored.bytes.equals(normal.bytes), 'Whole normal/restored raw bytes equal'); related('related-restored');
    report.baselineRawSha256 = baseline; report.healthyLogicalCasesHeld = KEYS.slice(2); report.healthyProjection = 'Only snapshots[label=import-pending].html and .focus are removed in the two healthy rows; every other complete field is compared.'; report.normalRestoredBytesEqual = true;
  }
  report.status = 'passed'; report.qualified = true;
} catch (error) { report.status = 'failed'; report.qualified = false; report.error = { name: error.name, message: error.message, stack: error.stack }; process.exitCode = 1; }
finally {
  if (before) { try { if (initialPage) setPage(initialPage); const after = sourceMap(); write('source-after.json', after); assert.deepEqual(after, before); report.sourceHeld = true; }
    catch (error) { report.status = 'failed'; report.qualified = false; report.sourceHeld = false; report.sourceError = error.message; process.exitCode = 1; } }
  write('report.json', report); console.log(`Press loading keyboard ${mode}: ${report.status}; ${report.arms.length} arm(s), ${report.related.length} related run(s); qualified=${report.qualified}`);
}
