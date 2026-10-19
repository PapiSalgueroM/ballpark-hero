/* Round1434: exact comparison compatibility. Complete prior entry follows unchanged. */
async function runApostropheCompatibility1434() {
  return (await import('./qa/gridApostropheCompatibility1434.mjs')).dispatchHistorical1434(import.meta.url);
}
if (await runApostropheCompatibility1434()) process.exit(process.exitCode ?? 0);
/* Round1432: exact historical default compatibility. Original body follows unchanged. */
if (await (await import('./qa/gridSearchCompatibility1432.mjs')).dispatchHistorical1432(import.meta.url)) {
  process.exit(0);
}
/* Round1430: actual Search blur ownership, with original evidence required first. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
assert(require.cache[require.resolve('./lib/offlineTransport.cjs')], 'Ordinary offline preload must be active');
const MODE = process.env.SOCCER_GRID_BLUR_MODE || 'fixed';
assert(['baseline', 'fixed'].includes(MODE));
const evidenceRoot = process.env.SOCCER_GRID_BLUR_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'soccer-grid-blur-evidence-'));
assert(path.isAbsolute(evidenceRoot) && path.relative(ROOT, evidenceRoot).split(path.sep).includes('..'));
const OUT = path.join(evidenceRoot, 'unit'); assert(!fs.existsSync(OUT)); fs.mkdirSync(OUT, { recursive: true });
const BASE = '2077ffbe9214fcf5e8ba8df727e0c44a2430121f';
const productFile = 'src/components/soccer-grid/SoccerGridSearch.tsx', testFile = 'src/test/soccerGridBlurOwnership.test.tsx';
const inheritedFile = 'src/test/soccerGridSearchDiscovery.test.tsx';
const ALIAS = '@/components/soccer-grid/SoccerGridSearch';
const TEST_SHA = '0a729c297dfd40fca179de9d7876ff53387602702f95ba49c5398c94602a8ba3';
const ORIGINAL_SHA = '5c6f26caebb97853faf481691ee82b1e82f59f145a65b1fcee2d6dfc05a5e6e0';
const PROPOSED_SHA = 'fc4aa832904388a6363bb47e7a0f07cfb121f96d4a0cd2a8177665dd02f0d34e';
const INHERITED_SHA = '410176fc8d41f755a63b6d6bdc0c310e3056e8c50ad50bb5f7f8ff5599ccdb52';
const ORIGINAL_ADMISSION = {"scope":"full-original-units-browser-native-pixels","head":"e44896c3954a1956916e87a9bd516d69da8a2fd8","originalSourceSha256":"5c6f26caebb97853faf481691ee82b1e82f59f145a65b1fcee2d6dfc05a5e6e0","testSha256":"0a729c297dfd40fca179de9d7876ff53387602702f95ba49c5398c94602a8ba3","commonSha256":"50d0c9682986ee79f26a68c9c02016f70644bf37372eb3a641fe040f83758214","featureSha256":"c47397698f2f70efd5867d3fe8112c481ba46a0d903aafc36faabac8595c0875","pixelSha256":"7b6b70882e215b5470fe28c22cb7b046e4913b105c2cb8b9d75312d0e5a48b3b","fullAdmissionSha256":"073612c582f1066d39e9cd6aaa49df515a24a8efe9303de92e2f406d4aef41bb"};
const hash = value => createHash('sha256').update(value).digest('hex');
const git = args => execFileSync('git', args, { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 });
const tracked = git(['ls-files', '-z']), status = git(['status', '--porcelain=v1', '--untracked-files=all']);
const source = Object.fromEntries(tracked.toString('utf8').split('\0').filter(Boolean).map(file => [file, hash(fs.readFileSync(path.join(ROOT, file)))]));
assert.equal(hash(fs.readFileSync(path.join(ROOT, testFile))), TEST_SHA, 'The eight-case body is frozen');
assert.equal(hash(fs.readFileSync(path.join(ROOT, inheritedFile))), INHERITED_SHA, 'The inherited sixteen-case body is unchanged');
const original = git(['show', BASE + ':' + productFile]).toString('utf8'); assert.equal(hash(original), ORIGINAL_SHA);
const actual = fs.readFileSync(path.join(ROOT, productFile), 'utf8');
fs.writeFileSync(path.join(OUT, 'original-SoccerGridSearch.tsx'), original);
const heldFiles = [productFile, inheritedFile, 'src/test/playerSearchIdentity.test.ts', 'src/test/playerSearchLocal.test.ts',
  'src/pages/SoccerGrid.tsx', 'src/hooks/useSoccerGrid.ts', 'src/hooks/useDailyPuzzle.ts', 'src/lib/fetchCareerPlayers.ts',
  'src/lib/fetchAllRows.ts', 'src/lib/fetchSoccerGridPuzzles.ts', 'src/lib/soccerGridDifficulty.ts', 'src/types/soccerGrid.ts',
  'src/lib/playerSearch.ts', 'src/lib/nameFold.ts', 'src/lib/smartSearch.ts', 'src/components/soccer-grid/SoccerGridBoard.tsx',
  'src/lib/gridRarity.ts', 'scripts/simSoccerGridSearchDiscovery.mjs', 'scripts/lib/offlineTransport.cjs', 'vitest.config.ts'];
const boundSource = heldFiles.map(file => {
  const before = git(['show', BASE + ':' + file]), body = fs.readFileSync(path.join(ROOT, file));
  if (file !== productFile || MODE === 'baseline') assert(body.equals(before), 'Whole stacked source held: ' + file);
  return { file, originalSha256: hash(before), actualSha256: hash(body) };
});
const names = ['Fixture Álex One', 'Fixture Øren Two', 'Fixture Plain Three'];
const titles = ['keeps the refocused canonical menu beyond the old blur deadline', 'gives a newer final blur its own full150ms grace',
  'cancels the owned pending blur timeout on actual unmount', 'keeps uninterrupted blur open at149ms and closed at150ms',
  'keeps pointer selection canonical and exactly once', 'keeps keyboard selection canonical and exactly once',
  'keeps trimmed title-cased manual submission', 'reopens matching suggestions after an expired blur without editing'];
const declared = titles.map(title => 'Soccer Grid blur ownership ' + title);
const purposes = ['A refocused menu must survive the old blur deadline', 'A newer blur must keep its own full150ms grace', 'Unmount must cancel the owned pending blur timeout'];
const runtimeAliases = { 'react/jsx-dev-runtime': require.resolve('react/jsx-dev-runtime'), 'react/jsx-runtime': require.resolve('react/jsx-runtime'),
  react: require.resolve('react'), 'lucide-react': require.resolve('lucide-react') };
const summary = { version: 1, mode: MODE, status: 'failed', productQualified: false, fixedUnitProofPassed: false,
  scope: 'Actual Search focus, blur,150ms deadlines, actual unmount and callbacks. Fake timers and fictional names; no physical browser, backend or product-admission claim.',
  testSha256: TEST_SHA, inheritedTestSha256: INHERITED_SHA, originalAdmission: ORIGINAL_ADMISSION, boundSource,
  actualProductSha256: hash(actual), reviewedPlan: null, wholeInverse: null, arms: [], controls: [], modules: [], inherited: null };
let TEMP;

function once(body, before, after) {
  assert.equal(body.split(before).length, 2, 'One exact executable source anchor');
  const changed = body.replace(before, after); assert.notEqual(changed, body, 'Executable mutation changes its body'); return changed;
}
function refuse(body, before, after) {
  const altered = before.replace(/\S/, '#'); assert.notEqual(altered, before);
  for (const candidate of [body.replace(before, ''), body.replace(before, altered), body + '\n' + before]) {
    assert.throws(() => once(candidate, before, after), /One exact executable source anchor/, 'Missing/altered/duplicate anchor refused');
  }
}
const oldFocus = '          onFocus={() => query.length >= 2 && setShowDropdown(true)}';
const newFocus = '          onFocus={() => {\n            if (blurTimer.current !== null) clearTimeout(blurTimer.current);\n            blurTimer.current = null;\n            if (query.length >= 2) setShowDropdown(true);\n          }}';
const cleanupEffect = '  useEffect(() => () => {\n    if (blurTimer.current !== null) clearTimeout(blurTimer.current);\n  }, []);';
const focusWithoutCancel = '          onFocus={() => {\n            blurTimer.current = null;\n            if (query.length >= 2) setShowDropdown(true);\n          }}';
const cleanupWithoutCancel = '  useEffect(() => () => {\n    void blurTimer.current;\n  }, []);';
const hunks = [
  { name: 'owned timer reference', original: '  const listRef = useRef<HTMLUListElement>(null);', fixed: '  const listRef = useRef<HTMLUListElement>(null);\n  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);' },
  { name: 'unmount cancellation', original: '  useEffect(() => {\n    if (!disabled) inputRef.current?.focus();\n  }, [disabled]);', fixed: cleanupEffect + '\n\n  useEffect(() => {\n    if (!disabled) inputRef.current?.focus();\n  }, [disabled]);' },
  { name: 'refocus cancellation', original: oldFocus, fixed: newFocus },
  { name: 'same150ms deadline with owned handle', original: '          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}', fixed: '          onBlur={() => {\n            blurTimer.current = setTimeout(() => {\n              blurTimer.current = null;\n              setShowDropdown(false);\n            }, 150);\n          }}' },
];
function moduleCopy(name, body) {
  assert(!/^import .+ from ['"]\./m.test(body), 'No unresolved relative import in external Search');
  const file = name + '.tsx'; fs.writeFileSync(path.join(OUT, file), body); fs.writeFileSync(path.join(TEMP, file), body);
  summary.modules.push({ name, sourceFile: file, sourceSha256: hash(body) }); return { [ALIAS]: path.join(TEMP, file) };
}
function control(name, before, after) {
  refuse(actual, before, after); const changed = once(actual, before, after), recovered = once(changed, after, before);
  assert.equal(recovered, actual, 'Control inverse restores the entire actual Search');
  summary.controls.push({ name, fixedSha256: hash(actual), changedSha256: hash(changed), recoveredSha256: hash(recovered), mutations: [{ before, after }], refusals: ['missing', 'altered', 'duplicate'] });
  const changedAlias = moduleCopy(name, changed); moduleCopy(name + '-restored', recovered); return changedAlias;
}
function childRun(name, file, count, faults, swaps, bare, traceEnv) {
  const dir = path.join(OUT, name); fs.mkdirSync(dir);
  const receipt = path.join(dir, 'transport.transport'), rawFile = path.join(dir, 'vitest.json');
  const env = { ...process.env, SIM_OFFLINE_RECEIPT: receipt, [traceEnv]: dir };
  if (bare) delete env.NO_DOUBLE_SWAP; else env.NO_DOUBLE_SWAP = JSON.stringify({ ...runtimeAliases, ...swaps });
  const started = Date.now();
  const child = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', file, '--maxWorkers=1', '--no-file-parallelism', '--reporter=json', '--outputFile=' + rawFile],
    { cwd: ROOT, env, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 240000 });
  fs.writeFileSync(path.join(dir, 'stdout.log'), child.stdout || ''); fs.writeFileSync(path.join(dir, 'stderr.log'), child.stderr || '');
  fs.writeFileSync(path.join(dir, 'process.json'), JSON.stringify({ status: child.status, signal: child.signal, error: child.error ? String(child.error) : null,
    elapsedMs: Date.now() - started, timeoutMs: 240000, bare, noDoubleSwapPresent: Object.hasOwn(env, 'NO_DOUBLE_SWAP'), swaps: bare ? null : JSON.parse(env.NO_DOUBLE_SWAP) }, null, 2) + '\n');
  assert.ifError(child.error); assert.equal(child.signal, null); assert.equal(child.status, faults.length ? 1 : 0);
  assert(!/Unhandled\s+(?:Errors?|Rejections?)|Uncaught\s+Exceptions?/i.test((child.stdout || '') + (child.stderr || '')), 'No unhandled output credit');
  const result = JSON.parse(fs.readFileSync(rawFile, 'utf8'));
  assert.equal(result.success, faults.length === 0); assert.equal(result.testResults.length, 1); assert.equal(result.numTotalTests, count);
  assert.equal(result.numPassedTests, count - faults.length); assert.equal(result.numFailedTests, faults.length); assert.equal(result.numPendingTests, 0); assert.equal(result.numTodoTests, 0); assert.equal(result.numRuntimeErrorTestSuites || 0, 0);
  if (result.numUnhandledErrors !== undefined) assert.equal(result.numUnhandledErrors, 0); if (result.unhandledErrors !== undefined) assert.deepEqual(result.unhandledErrors, []);
  const cases = result.testResults.flatMap(suite => suite.assertionResults);
  assert.equal(cases.length, count); for (const row of cases) assert(['passed', 'failed'].includes(row.status));
  assert.equal(fs.existsSync(receipt) ? fs.readFileSync(receipt, 'utf8') : '', '', 'Child transport absent or empty');
  return { dir, cases, result };
}
function expectedCase(index, fault) {
  const phases = [], snap = (phase, elapsed, query, focused, visibleNames, timers = 0, selected = [], mounted = true) => {
    phases.push({ phase, elapsed, timers, mounted, query, focused, visibleNames, selected });
  };
  snap('mounted', 0, '', true, []); snap('list-open', 0, 'Fixture', true, names);
  if (index === 0) {
    snap('second-highlight', 0, 'Fixture', true, names); snap('blur-a', 0, 'Fixture', false, names, 1); snap('before-refocus', 50, 'Fixture', false, names, 1);
    snap('refocused', 50, 'Fixture', true, names, fault ? 1 : 0); snap('old-deadline', 150, 'Fixture', true, fault ? [] : names);
    if (!fault) snap('submitted', 150, '', true, [], 0, [names[1]]);
  } else if (index === 1) {
    snap('blur-a', 0, 'Fixture', false, names, 1); snap('before-refocus', 50, 'Fixture', false, names, 1); snap('refocused', 50, 'Fixture', true, names, fault ? 1 : 0);
    snap('before-new-blur', 100, 'Fixture', true, names, fault ? 1 : 0); snap('blur-b', 100, 'Fixture', false, names, fault ? 2 : 1);
    snap('old-deadline', 150, 'Fixture', false, fault ? [] : names, 1);
    if (!fault) { snap('new-deadline-minus-one', 249, 'Fixture', false, names, 1); snap('new-deadline', 250, 'Fixture', false, []); }
  } else if (index === 2) {
    snap('pending-blur', 0, 'Fixture', false, names, 1); snap('unmounted', 0, null, false, [], fault ? 1 : 0, [], false);
  } else if (index === 3) {
    snap('final-blur', 0, 'Fixture', false, names, 1); snap('deadline-minus-one', 149, 'Fixture', false, names, 1); snap('deadline', 150, 'Fixture', false, []);
  } else if (index === 4) snap('pointer-selected', 0, '', true, [], 0, [names[0]]);
  else if (index === 5) { snap('second-highlight', 0, 'Fixture', true, names); snap('submitted', 0, '', true, [], 0, [names[1]]); }
  else if (index === 6) { snap('manual-query', 0, '  fictional missing  ', true, []); snap('submitted', 0, '', true, [], 0, ['Fictional Missing']); }
  else { snap('final-blur', 0, 'Fixture', false, names, 1); snap('expired', 150, 'Fixture', false, []); snap('refocused-after-expiry', 150, 'Fixture', true, names); }
  const { phase, ...final } = phases.at(-1); return { phases, final };
}
function run(name, faults = [], swaps = {}, bare = false) {
  const { dir, cases } = childRun(name, testFile, 8, faults, swaps, bare, 'SOCCER_GRID_BLUR_TRACE_DIR');
  assert.deepEqual(cases.map(row => row.fullName).sort(), [...declared].sort());
  const failures = cases.filter(row => row.status === 'failed'); assert.deepEqual(failures.map(row => row.fullName).sort(), faults.map(index => declared[index]).sort());
  for (const row of cases) {
    if (row.status === 'passed') { assert.deepEqual(row.failureMessages, []); continue; }
    const index = declared.indexOf(row.fullName); assert([0, 1, 2].includes(index)); assert.equal(row.failureMessages.length, 1);
    const message = row.failureMessages[0]; assert(message.startsWith('AssertionError: ' + purposes[index] + ':'), 'Only the exact frozen purpose assertion earns fault credit');
    assert(!/TestingLibraryElementError|Test timed out|Cannot find module|Failed to resolve import|Transform failed|ReferenceError|SyntaxError|TypeError/.test(message));
    const marker = index === 0 ? "    expect(visibleNames(), 'A refocused menu must survive the old blur deadline').toEqual(names);" : index === 1 ? "    expect(visibleNames(), 'A newer blur must keep its own full150ms grace').toEqual(names);" : "    expect(vi.getTimerCount(), 'Unmount must cancel the owned pending blur timeout').toBe(0); expect(selected).not.toHaveBeenCalled();";
    const lines = fs.readFileSync(path.join(ROOT, testFile), 'utf8').split('\n').map((line, offset) => ({ line, number: offset + 1 })).filter(item => item.line === marker);
    assert.equal(lines.length, 1); assert(message.includes(testFile + ':' + lines[0].number + ':'), 'Exact frozen purpose source line');
  }
  const traceBytes = fs.readFileSync(path.join(dir, 'trace.json')), trace = JSON.parse(traceBytes);
  assert.equal(trace.version, 1); assert.deepEqual(trace.cases.map(row => row.name).sort(), [...titles].sort());
  const expectedStores = JSON.stringify([[['blur-held-local', '{"held":true}']], [['blur-held-session', 'held']]]);
  for (let index = 0; index < titles.length; index++) {
    const rows = trace.cases.filter(row => row.name === titles[index]); assert.equal(rows.length, 1); const row = rows[0], expected = expectedCase(index, faults.includes(index));
    assert.deepEqual(row.setup, { phase: 'fixture-storage-setup', setupTimersBefore: index === 0 ? 2 : 4, setupTimersAfter: 0, hadLocalNonempty: index !== 0, hadSessionNonempty: index !== 0 }, 'Only documented pre-mount storage-event timers are drained');
    assert.deepEqual(row.phases, expected.phases, 'Every actual deadline/focus/callback/timer phase'); assert.deepEqual(row.final, expected.final);
    assert.equal(row.pendingBeforeCleanup, expected.final.timers); assert.equal(row.pendingAfterCleanup, 0);
    assert.equal(row.beforeStores, expectedStores); assert.equal(row.afterStores, expectedStores);
  }
  summary.arms.push({ name, bare, passed: 8 - faults.length, failed: faults.length, pending: 0, faults, failures: failures.map(row => ({ name: row.fullName, messages: row.failureMessages })), traceSha256: hash(traceBytes) });
  console.log(name + ':8 actual cases,' + faults.length + ' precise intended faults,0 cleanup timers.'); return trace;
}
function inherited() {
  const { dir, cases } = childRun('inherited-discovery', inheritedFile, 16, [], {}, true, 'SOCCER_GRID_SEARCH_TRACE_DIR');
  const oldTitles = [...['fixture alex one', 'fixture oren two', '  fixture   plain three  '].map(query => 'shows the canonical name for ' + JSON.stringify(query)),
    'shows a matching pool arriving under an unchanged focused query', 'shows the actual parent career pool arriving after its focused query',
    'selects canonical accented spelling and retains visible-menu Escape recovery', 'keeps ordinary case-insensitive canonical selection',
    'keeps the eight-result cap and bounded arrow selection', 'keeps trimmed title-cased manual entry when no suggestion exists',
    'keeps disabled input and form submission inert', 'keeps further query editing as recovery after late pool delivery',
    'keeps actual parent unverified selection free of a counted guess', 'keeps the raw one-character query gate', 'keeps all-whitespace queries empty and unable to submit',
    'keeps Escape before held pool delivery closed', 'keeps completed150ms blur before held pool delivery closed'];
  assert.deepEqual(cases.map(row => row.fullName).sort(), oldTitles.map(title => 'Soccer Grid search discovery ' + title).sort());
  for (const row of cases) { assert.equal(row.status, 'passed'); assert.deepEqual(row.failureMessages, []); }
  const bytes = fs.readFileSync(path.join(dir, 'trace.json')), trace = JSON.parse(bytes); assert.equal(trace.version, 1); assert.deepEqual(trace.cases.map(row => row.name).sort(), [...oldTitles].sort());
  for (const row of trace.cases) { assert.equal(row.pendingBeforeCleanup, 0); assert.equal(row.pendingAfterCleanup, 0); }
  summary.inherited = { name: 'inherited-discovery', testSha256: INHERITED_SHA, passed: 16, failed: 0, pending: 0, traceSha256: hash(bytes), currentSource: true, historicalSource: false };
  console.log('Inherited discovery:16 actual current-source cases passed,0failed,0pending.');
}

try {
  let proposed = original;
  for (const hunk of hunks) { refuse(proposed, hunk.original, hunk.fixed); proposed = once(proposed, hunk.original, hunk.fixed); }
  assert.equal(hash(proposed), PROPOSED_SHA, 'Exact reviewed external four-hunk proposal');
  let reversed = proposed; for (const hunk of [...hunks].reverse()) { refuse(reversed, hunk.fixed, hunk.original); reversed = once(reversed, hunk.fixed, hunk.original); }
  assert.equal(reversed, original, 'Whole proposed source inverse');
  summary.reviewedPlan = { status: 'SOURCE-PLAN-ONLY', originalSha256: hash(original), proposedSha256: hash(proposed), recoveredSha256: hash(reversed), hunks, refusals: ['missing', 'altered', 'duplicate'] };
  if (MODE === 'baseline') {
    assert.equal(actual, original, 'Baseline whole stacked Search held');
    summary.wholeInverse = { originalSha256: hash(original), fixedSha256: hash(actual), recoveredSha256: hash(actual), hunks: [] };
    const normal = run('normal', [0, 1, 2]), bare = run('bare', [0, 1, 2], {}, true); assert.deepEqual(normal, bare, 'Normal and alias-free original traces match');
  } else {
    assert(ORIGINAL_ADMISSION, 'Fixed qualification refused until complete actual original admission');
    assert.equal(ORIGINAL_ADMISSION.scope, 'full-original-units-browser-native-pixels');
    assert(/^[0-9a-f]{40}$/.test(ORIGINAL_ADMISSION.head)); assert.equal(ORIGINAL_ADMISSION.originalSourceSha256, ORIGINAL_SHA); assert.equal(ORIGINAL_ADMISSION.testSha256, TEST_SHA);
    for (const field of ['commonSha256', 'featureSha256', 'pixelSha256']) assert(/^[0-9a-f]{64}$/.test(ORIGINAL_ADMISSION[field]), 'Actual admitted receipt ' + field);
    assert.equal(actual, proposed, 'Only the exact reviewed four UI hunks differ');
    summary.wholeInverse = { originalSha256: hash(original), fixedSha256: hash(actual), recoveredSha256: hash(reversed), hunks };
    fs.writeFileSync(path.join(OUT, 'fixed-SoccerGridSearch.tsx'), actual); fs.writeFileSync(path.join(OUT, 'inverse-SoccerGridSearch.tsx'), reversed);
    TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'soccer-grid-blur-modules-')); assert(path.relative(ROOT, TEMP).split(path.sep).includes('..'));
    const normal = run('normal'), bare = run('bare', [], {}, true); assert.deepEqual(normal, bare, 'Normal and alias-free current traces match');
    run('original', [0, 1, 2], moduleCopy('whole-original', reversed));
    run('focus-control', [0, 1], control('focus-control', newFocus, focusWithoutCancel));
    run('unmount-control', [2], control('unmount-control', cleanupEffect, cleanupWithoutCancel));
    fs.rmSync(TEMP, { recursive: true, force: true }); assert(!fs.existsSync(TEMP), 'Copied modules removed before actual restored run');
    const restored = run('restored', [], {}, true); assert.deepEqual(restored, normal, 'Actual restored traces equal normal after copied modules removed');
    summary.fixedUnitProofPassed = true;
  }
  inherited(); summary.status = 'passed';
} finally {
  if (TEMP && fs.existsSync(TEMP)) fs.rmSync(TEMP, { recursive: true, force: true }); assert(!TEMP || !fs.existsSync(TEMP), 'Temporary modules removed');
  assert(tracked.equals(git(['ls-files', '-z'])), 'Tracked membership held');
  for (const [file, sha256] of Object.entries(source)) assert.equal(hash(fs.readFileSync(path.join(ROOT, file))), sha256, 'Tracked source held: ' + file);
  assert.equal(hash(fs.readFileSync(path.join(ROOT, testFile))), TEST_SHA); assert.equal(hash(fs.readFileSync(path.join(ROOT, inheritedFile))), INHERITED_SHA);
  assert(status.equals(git(['status', '--porcelain=v1', '--untracked-files=all'])), 'Status held');
  summary.sourceHeld = true; summary.temporaryModulesRemoved = true;
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
}
console.log(JSON.stringify({ kind: 'SOCCER_GRID_BLUR_RESULT', mode: MODE, evidenceRoot,
  modeEnvAbsent: !Object.hasOwn(process.env, 'SOCCER_GRID_BLUR_MODE'), outEnvAbsent: !Object.hasOwn(process.env, 'SOCCER_GRID_BLUR_OUT'),
  summarySha256: hash(fs.readFileSync(path.join(OUT, 'summary.json'))), sourceHeld: summary.sourceHeld, temporaryModulesRemoved: summary.temporaryModulesRemoved, productQualified: false }));
