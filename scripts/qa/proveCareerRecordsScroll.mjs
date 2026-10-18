// Remote-only outcome proof for navigation inside the actual career record book.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';

const BASE = '85a13119a18a8cbabdfabeedae3324a33b707f77';
const PAGE = 'src/components/soccer-career/CareerRecordsSheet.tsx', TEST = 'src/test/careerRecordsScroll.test.tsx';
const SELF = 'scripts/qa/proveCareerRecordsScroll.mjs', WORKFLOW = '.github/workflows/career-records-scroll.yml';
const BROWSER = 'scripts/qa/playCareerRecordsScroll.mjs', LIB = 'src/lib/soccerCareerRecords.ts', SIM = 'scripts/simSoccerCareerRecords.mjs';
const TEST_SHA = 'f7cccbe1de6efc4af5dbdd0800a57def1a71f8cad065bc2c38da4fc158320a61';
const ORIGINAL_SHA = '5c5745c6da5933b630f26c5775d235321169770ccf864681616b52f6a72bf455';
const RESET = '    if (body.current) body.current.scrollTop = 0;\n';
const SPANS = [
  ['  const panel = useRef<HTMLDivElement>(null);', '  const panel = useRef<HTMLDivElement>(null);\n  const body = useRef<HTMLDivElement>(null);'],
  ['  useEffect(() => { panel.current?.focus({ preventScroll: true }); }, [screen, selected]);',
    '  useEffect(() => {\n' + RESET + '    panel.current?.focus({ preventScroll: true });\n  }, [screen, selected]);'],
  ['<div className="min-h-0 overflow-y-auto p-4 space-y-3">', '<div ref={body} className="min-h-0 overflow-y-auto p-4 space-y-3">'],
];
const KEYS = ['listToDetail', 'detailToList', 'exits'];
const TITLES = ['opening a long club spell starts the record pane at the top', 'Back from a scrolled club spell starts club history at the top',
  'record book Close Escape and unrelated career state stay healthy'];
const CAUSES = ['RECORDS_SCROLL_LONG_DETAIL_STARTS_AT_TOP', 'RECORDS_SCROLL_BACK_STARTS_AT_TOP'];
const RELATED = { 'src/test/soccerCareerRecords.test.tsx': 12, 'src/test/routeErrorHeldSave.test.tsx': 3,
  'src/test/safeStorage.test.ts': 40, 'src/test/freshBuildOptionalChunk.test.ts': 6,
  'src/test/freshBuildBlockedStorage.test.ts': 11, 'src/test/freshBuildReloadWait.test.ts': 8 };
const LIB_CONTROLS = [
  ['academy counted', ".filter(r => r.season.type === 'playing')", '.filter(() => true)', 'counts only saved senior club stats'],
  ['loan merged', ' || stint.parent !== parent', '', 'separates a loan from a permanent spell'],
  ['short rating season', 'r.season.apps >= minApps', 'r.season.apps >= 1', 'uses actual records, keeps ties earliest'],
];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const git = args => execFileSync('git', args, { maxBuffer: 64 * 1024 * 1024 });
const require = createRequire(import.meta.url), mode = process.argv[2], out = process.env.CAREER_RECORD_SCROLL_OUT;
const setupFault = /Unhandled Errors|Unhandled Rejection|Uncaught Exception|Failed to load|Failed to resolve import|Transform failed|Cannot find module|No test files found|SIM_OFFLINE_BLOCK|TypeError:|ReferenceError:|SyntaxError:/i;
function once(body, from, to) { assert.equal(body.split(from).length, 2, 'Unique executable source anchor'); const changed = body.replace(from, to); assert.notEqual(changed, body); return changed; }
assert(['baseline', 'fixed'].includes(mode), 'Use baseline or fixed');
assert(['1', 'true'].includes(process.env.CI) && process.env.SIM_NETWORK === 'offline', 'Remote offline CI only');
assert(process.env.NODE_OPTIONS?.includes('offlineTransport.cjs') && require.cache[require.resolve('../lib/offlineTransport.cjs')], 'Actual inherited offline preload');
assert(out && path.isAbsolute(out), 'CAREER_RECORD_SCROLL_OUT is absolute');
fs.mkdirSync(out, { recursive: true }); assert(!fs.existsSync(path.join(out, 'report.json')), 'Fresh owned report path');
const write = (name, value) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const report = { version: 1, mode, base: BASE, head: git(['rev-parse', 'HEAD']).toString().trim(), status: 'running', qualified: false, arms: [], related: [], records: [],
  limits: 'Real record sheet, record helper, career fixture and pending-save registry. Unit offsets are assigned on the actual jsdom pane, which has no geometry or clipping. Served browser evidence is separate. No actual joined release or publication claim.' };
let names, before, initialPage, activePage;
const tracked = () => git(['ls-files', '-z']).toString().split('\0').filter(Boolean).sort();
const sourceMap = () => { assert.deepEqual(tracked(), names, 'Whole tracked membership held'); return Object.fromEntries(names.map(file => [file, sha(fs.readFileSync(file))])); };
const expectedMap = () => ({ ...before, [PAGE]: sha(activePage) });
function setPage(bytes) { fs.writeFileSync(PAGE, bytes); activePage = bytes; assert(fs.readFileSync(PAGE).equals(bytes)); }
function transport(file) { assert(!fs.existsSync(file) || fs.statSync(file).size === 0, 'Ordinary child transport is empty'); return { file, retained: fs.existsSync(file), bytes: fs.existsSync(file) ? fs.statSync(file).size : null }; }
function observations(raw, label) {
  assert.equal(raw.version, 1); assert.deepEqual(raw.caseTitles, TITLES); assert.deepEqual(Object.keys(raw.cases), KEYS);
  const old = ['baseline', 'original', 'reset-removed'].includes(label);
  const labels = [
    ['mounted', 'opened', 'club-list', 'assigned-list-offset', 'long-detail', 'final-close', 'finished'],
    ['mounted', 'opened', 'club-list', 'long-detail', 'assigned-detail-offset', 'back-to-clubs', 'final-close', 'finished'],
    ['mounted', 'opened', 'help', 'personal-bests', 'best-season', 'escape-back', 'escape-closed', 'opened', 'club-list', 'healthy-close', 'finished'],
  ];
  for (const [index, key] of KEYS.entries()) {
    const row = raw.cases[key]; assert.equal(row.title, TITLES[index]); assert.deepEqual(row.latest, row.initial);
    assert.deepEqual([row.initial.playerName, row.initial.phase, row.initial.age, row.initial.currentClub], ['Records Scroll Fixture', 'playing', 42, 'Fixture Valley']);
    assert.deepEqual(row.initial.events, ['Unsaved fictional career change']);
    assert.deepEqual(row.persistedBefore, { ...row.initial, events: ['Earlier fictional career save'] });
    assert.equal(row.storesBefore.local['career-record-scroll-fixture'], JSON.stringify(row.persistedBefore));
    assert.equal(row.storesBefore.local['record-scroll-sentinel'], 'local held'); assert.equal(row.storesBefore.session['record-scroll-sentinel'], 'session held');
    assert.deepEqual(row.initial.seasons.map(season => season.year), Array.from({ length: 25 }, (_, n) => 2020 + n));
    assert.deepEqual(row.initial.seasons.map(season => season.club), Array.from({ length: 25 }, (_, n) => n < 12 ? n % 2 === 0 ? 'Fixture Harbor' : 'Fixture Ridge' : 'Fixture Valley'));
    assert.deepEqual(row.book.stints.map(stint => stint.rows.length), [...Array(12).fill(1), 13]); assert.equal(row.book.rows.length, 25);
    assert.deepEqual(row.book.totals, { apps: 750, goals: 300, assists: 100, cleanSheets: 0 });
    assert.deepEqual([row.mounts, row.unmounts, row.cleanupStarted, row.cleanupUnmounts, row.pendingAfterCleanup], [1, 0, true, 1, false]);
    assert.deepEqual(row.draws, []); assert.deepEqual(row.console, []); assert.deepEqual(row.requests, []);
    assert.deepEqual(row.saveAttempts, [row.initial, row.initial]);
    assert.deepEqual(row.saveChecks, ['mounted', 'finished'].map(name => ({ label: name, before: true, result: false, after: true })));
    assert.deepEqual(row.snapshots.map(snapshot => snapshot.label), labels[index]);
    for (const snapshot of row.snapshots) {
      assert.deepEqual(snapshot.career, row.initial); assert.deepEqual(snapshot.local, row.storesBefore.local); assert.deepEqual(snapshot.session, row.storesBefore.session);
      assert.deepEqual([snapshot.parentMounted, snapshot.mounts, snapshot.unmounts, snapshot.pendingSave], [true, 1, 0, true]);
      assert.deepEqual(snapshot.window, [0, 0]); assert.deepEqual(snapshot.page, [0, 0]);
      assert.equal(snapshot.bodyOverflow, snapshot.paneId === null ? 'scroll' : 'hidden'); assert.equal(typeof snapshot.html, 'string'); assert.equal(typeof snapshot.focus, 'string');
      if (snapshot.paneId !== null) { assert([1, 2].includes(snapshot.paneId)); assert(snapshot.paneTop >= 0); assert.equal(snapshot.panelFocused, true); }
    }
    assert(row.snapshots.at(-1).focus.includes('Open record book'));
    assert.equal(row.actions.length, index === 2 ? 7 : index === 1 ? 5 : 4);
  }
  assert.deepEqual(raw.cases.listToDetail.outcome, { assigned: 480, observed: old ? 480 : 0, samePane: true, firstYear: '2032', rows: 13, panelFocused: true });
  assert.deepEqual(raw.cases.detailToList.outcome, { assigned: 640, observed: old ? 640 : 0, samePane: true, stints: 13, panelFocused: true });
  assert.deepEqual(raw.cases.exits.outcome, { closed: true, openerFocused: true, escapePrevented: [true, true] });
  assert.deepEqual(raw.cases.listToDetail.keyEvents, []); assert.deepEqual(raw.cases.detailToList.keyEvents, []);
  assert.equal(raw.cases.exits.keyEvents.length, 2); for (const event of raw.cases.exits.keyEvents) assert.deepEqual([event.key, event.prevented, event.dispatchResult], ['Escape', true, false]);
}
try {
  assert.equal(report.head, process.env.GITHUB_SHA); git(['merge-base', '--is-ancestor', BASE, report.head]);
  assert.equal(git(['status', '--porcelain', '--untracked-files=normal', '--', '.', ':!docs']).toString(), '', 'Clean committed source');
  const allowed = new Set([TEST, SELF, WORKFLOW, BROWSER, ...(mode === 'fixed' ? [PAGE] : [])]);
  const changed = git(['diff', '--name-only', BASE, report.head, '--', '.', ':!docs']).toString().trim().split('\n').filter(Boolean);
  assert(changed.every(file => allowed.has(file)), 'Only declared source leaves: ' + changed); for (const file of [TEST, SELF, WORKFLOW]) assert(changed.includes(file));
  assert.equal(sha(fs.readFileSync(TEST)), TEST_SHA); for (const file of [TEST, SELF, WORKFLOW]) assert(fs.readFileSync(file).equals(git(['show', report.head + ':' + file])));
  const original = git(['show', BASE + ':' + PAGE]); assert.equal(sha(original), ORIGINAL_SHA);
  let candidate, removed;
  if (mode === 'fixed') {
    candidate = Buffer.from(SPANS.reduce((body, [old, added]) => once(body, old, added), original.toString()));
    assert.equal(SPANS.toReversed().reduce((body, [old, added]) => once(body, added, old), candidate.toString()), original.toString(), 'Whole three-span product inverse');
    removed = Buffer.from(once(candidate.toString(), RESET, '')); assert(!removed.equals(original) && !removed.equals(candidate), 'Reset-only removal retains refs and multiline focus');
    assert.equal(once(removed.toString(), SPANS[1][1].replace(RESET, ''), SPANS[1][1]), candidate.toString(), 'Whole reset-control inverse');
  }
  initialPage = fs.readFileSync(PAGE); activePage = initialPage; assert(initialPage.equals(mode === 'baseline' ? original : candidate));
  for (const file of [...Object.keys(RELATED), LIB, SIM]) assert(fs.readFileSync(file).equals(git(['show', BASE + ':' + file])), 'Frozen existing method: ' + file);
  fs.writeFileSync(path.join(out, 'original-CareerRecordsSheet.tsx'), original, { flag: 'wx' });
  if (candidate) for (const [label, body] of [['candidate', candidate], ['reset-removed', removed]]) fs.writeFileSync(path.join(out, label + '-CareerRecordsSheet.tsx'), body, { flag: 'wx' });
  fs.copyFileSync(TEST, path.join(out, 'frozen-test.tsx'), fs.constants.COPYFILE_EXCL);
  names = tracked(); before = sourceMap(); write('source-before.json', before);
  write('source-bindings.json', { base: BASE, head: report.head, mode, changed, test: { file: TEST, sha256: TEST_SHA }, page: PAGE,
    originalSha256: ORIGINAL_SHA, candidateSha256: candidate ? sha(candidate) : null, spans: SPANS, wholeInverseExact: mode === 'fixed',
    removal: removed ? { sha256: sha(removed), span: [RESET, ''], wholeInverseExact: true, distinctFromOriginal: true } : null,
    related: Object.fromEntries(Object.entries(RELATED).map(([file, count]) => [file, { count, sha256: sha(fs.readFileSync(file)) }])),
    recordsMethod: { file: SIM, sha256: sha(fs.readFileSync(SIM)), library: LIB, librarySha256: sha(fs.readFileSync(LIB)) } });
  function child(label, args, env) {
    assert.deepEqual(sourceMap(), expectedMap(), label + ' complete source before'); const dir = path.join(out, label); fs.mkdirSync(dir);
    const result = spawnSync(process.execPath, args(path.join(dir, 'vitest.json')), { encoding: 'utf8', timeout: 300000, maxBuffer: 64 * 1024 * 1024,
      env: { ...env, SIM_OFFLINE_RECEIPT: path.join(dir, 'units.transport') } });
    fs.writeFileSync(path.join(dir, 'stdout.log'), result.stdout || '', { flag: 'wx' }); fs.writeFileSync(path.join(dir, 'stderr.log'), result.stderr || '', { flag: 'wx' });
    if (args(path.join(dir, 'vitest.json'))[0] === SIM && fs.existsSync('.tmp-fx/career-records-tests.json')) {
      fs.copyFileSync('.tmp-fx/career-records-tests.json', path.join(dir, 'vitest-final-control.json'), fs.constants.COPYFILE_EXCL);
    }
    write(label + '/process.json', { exit: result.status, signal: result.signal, error: result.error ? { name: result.error.name, message: result.error.message } : null,
      args: args(path.join(dir, 'vitest.json')), expectedPageSha256: sha(activePage) });
    const after = sourceMap(); write(label + '/source-after.json', after); assert.deepEqual(after, expectedMap(), label + ' complete source after');
    assert(!result.error && !result.signal && result.status !== null); assert(!setupFault.test((result.stdout || '') + (result.stderr || '')), label + ' no setup/unhandled/transport fault');
    const receipt = transport(path.join(dir, 'units.transport')); return { result, dir, receipt };
  }
  const options = target => ['--maxWorkers=1', '--minWorkers=1', '--reporter=default', '--reporter=json', '--outputFile=' + target];
  function arm(label, faults) {
    const record = { label, status: 'unqualified', expectedPageSha256: sha(activePage), expectedFaultIndices: faults }; report.arms.push(record);
    const rawFile = path.join(out, label, 'observations.json');
    const { result, dir, receipt } = child(label, target => ['node_modules/vitest/vitest.mjs', 'run', TEST, ...options(target)], { ...process.env, CAREER_RECORD_SCROLL_RAW: rawFile });
    const units = JSON.parse(fs.readFileSync(path.join(dir, 'vitest.json'))), rows = units.testResults.flatMap(suite => suite.assertionResults);
    assert.equal(units.testResults.length, 1); assert(units.testResults[0].name.replaceAll('\\', '/').endsWith('/' + TEST));
    assert.equal(result.status, faults.length ? 1 : 0); assert.equal(units.success, faults.length === 0);
    assert.deepEqual([units.numTotalTests, units.numPassedTests, units.numFailedTests, units.numPendingTests, units.numTodoTests], [3, 3 - faults.length, faults.length, 0, 0]);
    assert.deepEqual(rows.map(row => row.title), TITLES); if (units.unhandledErrors !== undefined) assert.deepEqual(units.unhandledErrors, []);
    for (const [index, row] of rows.entries()) { assert.equal(row.status, faults.includes(index) ? 'failed' : 'passed'); if (faults.includes(index)) {
      assert.equal(row.failureMessages.length, 1); assert(row.failureMessages[0].includes(CAUSES[index])); assert(/expected false to be true/i.test(row.failureMessages[0]));
    } else assert.deepEqual(row.failureMessages, []); }
    const bytes = fs.readFileSync(rawFile), raw = JSON.parse(bytes); observations(raw, label);
    Object.assign(record, { status: 'qualified', exit: result.status, passed: units.numPassedTests, failed: units.numFailedTests, rawBytes: bytes.length, rawSha256: sha(bytes), sourceHeld: true, transport: receipt });
    write(label + '/qualification.json', record); return { bytes, raw };
  }
  function related(label) {
    const env = { ...process.env }; delete env.CAREER_RECORD_SCROLL_RAW;
    const { result, dir } = child(label, target => ['node_modules/vitest/vitest.mjs', 'run', ...Object.keys(RELATED), ...options(target)], env);
    const units = JSON.parse(fs.readFileSync(path.join(dir, 'vitest.json'))), rows = units.testResults.flatMap(suite => suite.assertionResults);
    assert.equal(result.status, 0); assert.equal(units.success, true); assert.equal(units.testResults.length, 6);
    assert.deepEqual([units.numTotalTests, units.numPassedTests, units.numFailedTests, units.numPendingTests, units.numTodoTests], [80, 80, 0, 0, 0]); if (units.unhandledErrors !== undefined) assert.deepEqual(units.unhandledErrors, []);
    const seen = new Set(); for (const suite of units.testResults) { const file = Object.keys(RELATED).find(file => suite.name.replaceAll('\\', '/').endsWith('/' + file));
      assert(file && !seen.has(file)); seen.add(file); assert.equal(suite.assertionResults.length, RELATED[file]); }
    assert.equal(rows.length, 80); assert(rows.every(row => row.status === 'passed' && row.failureMessages.length === 0)); report.related.push({ label, status: 'qualified', passed: 80 });
  }
  function records(label) {
    const originalLib = fs.readFileSync(LIB, 'utf8'), copies = LIB_CONTROLS.map(([name, from, to, title]) => {
      const position = originalLib.indexOf(from), body = once(originalLib, from, to);
      assert.equal(body.slice(0, position) + from + body.slice(position + to.length), originalLib, name + ' whole positional library inverse');
      return { name, title, from, to, sha256: sha(body) };
    });
    const rawPath = '.tmp-fx/career-records-tests.json'; assert(!fs.existsSync(rawPath), 'Fresh existing sim raw path');
    const env = { ...process.env }; delete env.CAREER_RECORD_SCROLL_RAW;
    const { result, dir } = child(label, () => [SIM], env); assert.equal(result.status, 0);
    const terminal = 'simSoccerCareerRecords: 12 outcome checks green, three effective controls caught';
    assert.equal((result.stdout || '').split(terminal).length, 2); for (const control of copies) assert((result.stdout || '').includes('ok copied ' + control.name + ' defect fired in its required outcome check'));
    assert(!fs.existsSync('src/lib/__control_soccerCareerRecords.ts'), 'Existing harness removed its copied library');
    const final = JSON.parse(fs.readFileSync(rawPath)), assertions = final.testResults.flatMap(suite => suite.assertionResults);
    assert.equal(assertions.length, 12); assert(assertions.some(row => row.status === 'failed' && row.fullName.includes(copies.at(-1).title)));
    fs.unlinkSync(rawPath); write(label + '/controls.json', copies);
    report.records.push({ label, status: 'qualified', terminal, controls: copies, retention: 'Unchanged harness stdout/stderr retains all four runs. Its final copied-control JSON is retained separately; the historical harness overwrites the earlier three JSON files.' });
  }
  if (mode === 'baseline') arm('baseline', [0, 1]);
  else {
    const baseline = process.env.CAREER_RECORD_SCROLL_BASELINE_RAW_SHA256; assert(/^[a-f0-9]{64}$/.test(baseline || ''), 'Actual separately qualified original raw SHA required');
    const normal = arm('normal', []); related('related-normal'); records('records-normal');
    try {
      setPage(original); const old = arm('original', [0, 1]); assert.equal(sha(old.bytes), baseline, 'Complete original raw equals actual qualified baseline');
      assert.deepEqual(old.raw.cases.exits, normal.raw.cases.exits, 'Entire healthy row, without projection');
      setPage(removed); const control = arm('reset-removed', [0, 1]); assert.equal(sha(control.bytes), baseline, 'Reset removal has exactly the observed original behavior');
      assert.deepEqual(control.raw.cases.exits, normal.raw.cases.exits, 'Reset removal entire healthy row');
    } finally { setPage(initialPage); assert.deepEqual(sourceMap(), before, 'Complete candidate restored after controls'); }
    const restored = arm('restored', []); assert(restored.bytes.equals(normal.bytes), 'Whole normal/restored raw bytes equal'); related('related-restored'); records('records-restored');
    report.baselineRawSha256 = baseline; report.healthyWholeRowHeld = 'exits'; report.normalRestoredBytesEqual = true;
  }
  report.status = 'passed'; report.qualified = true;
} catch (error) { report.status = 'failed'; report.qualified = false; report.error = { name: error.name, message: error.message, stack: error.stack }; process.exitCode = 1; }
finally {
  if (before) { try { if (initialPage) setPage(initialPage); const after = sourceMap(); write('source-after.json', after); assert.deepEqual(after, before); report.sourceHeld = true; }
    catch (error) { report.status = 'failed'; report.qualified = false; report.sourceHeld = false; report.sourceError = error.message; process.exitCode = 1; } }
  write('report.json', report); console.log(`Career records scroll ${mode}: ${report.status}; ${report.arms.length} arm(s), ${report.related.length} related run(s), ${report.records.length} records sim(s); qualified=${report.qualified}`);
}
