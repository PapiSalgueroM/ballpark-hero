/* Remote normal-outcome qualification of the two composed urgent report fixes.
 * Historical original controls stay qualified at their own heads, not rerun here. */
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert(process.env.CI === '1' && process.env.SIM_NETWORK === 'offline', 'Remote offline CI required');
assert(process.env.URGENT_REPORT_OUT && path.isAbsolute(process.env.URGENT_REPORT_OUT), 'Absolute URGENT_REPORT_OUT required');
assert((process.env.NODE_OPTIONS || '').includes('offlineTransport.cjs'), 'Actual child processes retain the offline preload');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(process.env.URGENT_REPORT_OUT, 'urgent-composition');
assert(!fs.existsSync(OUT), 'Never overwrite prior composition evidence');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'e814c2def671e07bd6163462dff8ab1230be2000';
const SC = '93730ed2cc9debc3548462bc1dddc4f01968ac78';
const XI = 'ddffe5afa37b0926f87db6c3ef3b110b8d42580e';
const MERGE_SC = '75fa70867ce0842308b6c77f4b5e1c840b1c6c3a';
const MERGE_XI = 'ba0cd578ec123a26df691858f4b7eed22c1ea5f4';
const PAGE = 'src/pages/SoccerCareer.tsx', HOOK = 'src/hooks/useLineupBuilder.ts';
const SC_TEST = 'src/test/soccerCareerCreationRoll.test.tsx', XI_TEST = 'src/test/xiSelectionHistoryRace.test.tsx';
const SELF = 'scripts/qa/proveUrgentReportComposition.mjs', ADAPTER = 'scripts/qa/playUrgentXiSelection.mjs';
const OLD_XI_PLAY = 'scripts/qa/playBuildYourXiSelection1388.mjs';
const ADAPTER_SHA = 'ccb7162909a450c13126e13a0ce32ecc27377a9e953876725027cb36e5568d70';
const sha = value => createHash('sha256').update(value).digest('hex');
const read = file => fs.readFileSync(path.join(ROOT, file));
const json = (file, value) => fs.writeFileSync(path.join(OUT, file), JSON.stringify(value, null, 2) + '\n');
function git(args) {
  const child = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', timeout: 30000, maxBuffer: 64 * 1024 * 1024 });
  assert(!child.error && !child.signal && child.status === 0, 'Actual Git source read: ' + args.join(' '));
  return child.stdout;
}
const HEAD = git(['rev-parse', 'HEAD']).trim();
const tracked = () => Object.fromEntries(git(['ls-files', '-z']).split('\0').filter(Boolean).sort().map(file => [file, sha(read(file))]));
const before = tracked();
json('tracked.before.json', before);
const report = { head: HEAD, base: BASE, creationRef: SC, selectionRef: XI, scope: 'Composed current-source outcomes only',
  historicalOriginalControls: 'Previously qualified separately; this method makes no fresh original-control claim.',
  children: [], sourceHeld: false, qualified: false };
const composition = { head: HEAD, base: BASE, merges: [], sources: [], adapter: null, appFencePassed: false };
const checkpoint = () => { json('report.json', report); json('source-composition.json', composition); };
const receipt = file => { const bytes = fs.readFileSync(file); return { file: path.relative(OUT, file).replaceAll('\\', '/'), bytes: bytes.length, sha256: sha(bytes) }; };
const FAULTS = /Unhandled Errors?|Unhandled Rejection|Uncaught Exception|TypeError:|ReferenceError:|SyntaxError:|Failed to (?:load|resolve import)|Cannot find module|ERR_MODULE_NOT_FOUND|SIM_OFFLINE_BLOCK/i;
const SC_TITLES = [
  'creation roll preservation: a fresh settled roll starts and saves the displayed player',
  'creation roll stale settled: changing position requires a new roll before Begin Career',
  'creation roll stale in-flight: a previous position roll cannot publish after the switch',
  'creation roll preservation: a new position reroll starts with its displayed stats',
];
const XI_TITLES = [
  'history race missing: a late history cannot replace the latest enabled-picker selection',
  'history race preservation: a matching-primary club pick stays local and immediate',
  'history race preservation: valid history still admits the originally selected player',
  'history race preservation: refused history releases the picker for a valid retry',
  'history race preservation: an unverified nation pick releases the picker and retry can succeed',
  'history race preservation: reroll abandons a pending history without publishing into its new team',
  'history race preservation: reset abandons a pending history without repopulating the formation',
  'history race preservation: the existing next-door history wait stays busy and settles normally',
];
const RELATED = {
  'src/test/lineupBuilderHistoryRead.test.tsx': 3,
  'src/test/lineupValidatorClient.test.tsx': 55,
  'src/test/playerAutocompleteInteraction.test.tsx': 8,
  'src/test/playerAutocompleteStale.test.tsx': 15,
  'src/test/playerAutocompleteTouchScroll.test.tsx': 20,
};
function bind(file, ref) {
  const actual = read(file), expected = Buffer.from(git(['show', ref + ':' + file]));
  assert.deepEqual(actual, expected, 'Complete source held at qualified reference: ' + file);
  const target = path.join(OUT, 'source', file);
  fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, actual);
  composition.sources.push({ file, ref, bytes: actual.length, sha256: sha(actual), gitBlob: git(['rev-parse', ref + ':' + file]).trim() });
}
function run(name, files, total, titles, rawEnv) {
  const folder = path.join(OUT, name); fs.mkdirSync(folder);
  const unitsFile = path.join(folder, 'units.json'), rawFile = path.join(folder, 'raw.json'), transport = path.join(folder, 'transport.txt');
  const env = { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1', SIM_OFFLINE_RECEIPT: transport };
  delete env.SC_CREATION_ROLL_RAW; delete env.XI_RACE_RAW;
  if (rawEnv) env[rawEnv] = rawFile;
  const child = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', ...files,
    '--maxWorkers=1', '--minWorkers=1', '--reporter=verbose', '--reporter=json', '--outputFile.json=' + unitsFile],
  { cwd: ROOT, env, encoding: 'utf8', timeout: 300000, maxBuffer: 64 * 1024 * 1024 });
  const stdout = child.stdout || '', stderr = child.stderr || '';
  fs.writeFileSync(path.join(folder, 'stdout.log'), stdout); fs.writeFileSync(path.join(folder, 'stderr.log'), stderr);
  const row = { name, exit: child.status, signal: child.signal, error: child.error?.message || null,
    stdout: receipt(path.join(folder, 'stdout.log')), stderr: receipt(path.join(folder, 'stderr.log')), qualified: false };
  report.children.push(row); checkpoint(); process.stdout.write(stdout); process.stderr.write(stderr);
  assert(!child.error && !child.signal && child.status !== null, 'Actual test process completed: ' + name);
  assert(!FAULTS.test(stdout + stderr), 'No setup, unhandled or transport faults: ' + name);
  assert(!fs.existsSync(transport) || fs.readFileSync(transport).length === 0, 'No blocked external attempt: ' + name);
  const units = JSON.parse(fs.readFileSync(unitsFile));
  assert.equal(child.status, 0); assert.equal(units.success, true);
  assert.equal(units.numTotalTests, total); assert.equal(units.numPassedTests, total);
  assert.equal(units.numFailedTests, 0); assert.equal(units.numPendingTests, 0); assert.equal(units.numTodoTests, 0);
  assert.equal(units.testResults.length, files.length);
  const actual = {};
  for (const file of units.testResults) {
    assert(!file.message); assert.equal(file.status, 'passed');
    const relative = path.relative(ROOT, file.name).replaceAll('\\', '/');
    assert(files.includes(relative) && !Object.hasOwn(actual, relative), 'Exact unique loaded test file');
    actual[relative] = file.assertionResults.length;
    assert(file.assertionResults.every(test => test.status === 'passed' && test.failureMessages.length === 0));
    if (titles) assert.deepEqual(file.assertionResults.map(test => test.title).sort(), [...titles].sort(), 'Exact frozen test titles');
  }
  assert.deepEqual(actual, files.length === 1 ? { [files[0]]: total } : RELATED);
  row.completed = total; row.files = actual; row.units = receipt(unitsFile);
  if (rawEnv) row.raw = receipt(rawFile);
  row.qualified = true; checkpoint();
  console.log('Composed ' + name + ':' + total + ' exact current cases passed.');
  return { row, bytes: rawEnv ? fs.readFileSync(rawFile) : null };
}
checkpoint();
try {
  assert.equal(git(['status', '--porcelain', '--untracked-files=no']), '', 'Committed source starts clean');
  assert.deepEqual(read(SELF), Buffer.from(git(['show', HEAD + ':' + SELF])), 'Actual helper belongs to HEAD');
  git(['merge-base', '--is-ancestor', SC, HEAD]); git(['merge-base', '--is-ancestor', XI, HEAD]);
  git(['merge-base', '--is-ancestor', MERGE_SC, HEAD]); git(['merge-base', '--is-ancestor', MERGE_XI, HEAD]);
  for (const [merge, parents] of [[MERGE_SC, [BASE, SC]], [MERGE_XI, [MERGE_SC, XI]]]) {
    const actual = git(['show', '-s', '--format=%P', merge]).trim().split(' ');
    assert.deepEqual(actual, parents, 'Actual ordered two-parent feature merge');
    composition.merges.push({ merge, parents: actual });
  }
  const leaves = [PAGE, HOOK, SC_TEST, XI_TEST];
  git(['diff', '--exit-code', BASE, HEAD, '--', 'src', 'public', 'package.json', 'package-lock.json', 'bun.lock', 'bun.lockb', ...leaves.map(file => ':!' + file)]);
  const delta = git(['diff', '--name-only', BASE, HEAD, '--', 'src', 'public', 'package.json', 'package-lock.json', 'bun.lock', 'bun.lockb']).trim().split('\n').filter(Boolean).sort();
  assert.deepEqual(delta, [...leaves].sort(), 'Only the four reviewed app/test leaves differ from published main');
  for (const file of [PAGE, SC_TEST, 'scripts/lib/offlineTransport.cjs',
    'scripts/qa/playSoccerCreation1388.mjs', OLD_XI_PLAY, 'scripts/qa/proveSoccerCreation1388.mjs',
    'scripts/qa/proveWebkitOffline1388.mjs', '.github/workflows/safari-interaction-reports.yml']) bind(file, SC);
  for (const file of [HOOK, XI_TEST, 'scripts/qa/playXiPendingHistory.mjs', 'scripts/qa/proveXiSelectionRace.mjs',
    'scripts/qa/proveXiSelectionRaceFixed.mjs', '.github/workflows/xi-selection-race.yml']) bind(file, XI);
  composition.appFencePassed = true;
  const spans = [
    {
      label: 'explicit committed hook binding after the published reference',
      before: "const PUBLISHED = 'ae14cf973b9053a7f1cd4f520b416aee804f65c9';",
      after: "const PUBLISHED = 'ae14cf973b9053a7f1cd4f520b416aee804f65c9';\nconst HOOK = 'src/hooks/useLineupBuilder.ts', HOOK_REF = process.env.XI_SELECTION_HOOK_SOURCE_REF;\nassert(HOOK_REF && /^[a-f0-9]{40}$/.test(HOOK_REF), 'Explicit full committed XI_SELECTION_HOOK_SOURCE_REF required');",
    },
    {
      label: 'real committed ancestor and truthful report metadata',
      before: "const report = { status: 'running', head: git(['rev-parse', 'HEAD']).trim(), publishedApp: PUBLISHED,",
      after: "assert.equal(git(['rev-parse', '--verify', HOOK_REF + '^{commit}']).trim(), HOOK_REF, 'Actual committed hook reference');\ngit(['merge-base', '--is-ancestor', HOOK_REF, 'HEAD']);\nconst report = { status: 'running', head: git(['rev-parse', 'HEAD']).trim(), publishedApp: PUBLISHED, actualHookSourceRef: HOOK_REF,",
    },
    {
      label: 'only the hook uses the new committed reference',
      before: "  const original = git(['show', PUBLISHED + ':' + file]);\n  assert.equal(normalized(bytes.toString('utf8')), normalized(original), 'Published picker source differs: ' + file);\n  write('source/' + file, bytes); report.sources.push({ file, bytes: bytes.length, sha256: sha(bytes), publishedGitBlob: git(['rev-parse', PUBLISHED + ':' + file]).trim() });",
      after: "  const ref = file === HOOK ? HOOK_REF : PUBLISHED;\n  const original = git(['show', ref + ':' + file]);\n  assert.equal(normalized(bytes.toString('utf8')), normalized(original), 'Exact committed picker source differs: ' + file);\n  write('source/' + file, bytes); report.sources.push({ file, ref, bytes: bytes.length, sha256: sha(bytes), gitBlob: git(['rev-parse', ref + ':' + file]).trim() });",
    },
  ];
  const old = read(OLD_XI_PLAY).toString('utf8'), adapter = read(ADAPTER);
  let derived = old;
  for (const span of spans) {
    assert.notEqual(span.before, span.after);
    assert.equal(derived.split(span.before).length, 2, 'Unique exact adapter derivation: ' + span.label);
    derived = derived.replace(span.before, span.after);
  }
  assert.equal(derived, adapter.toString('utf8'), 'Entire adapter differs by exactly the three reviewed source-binding spans');
  assert.equal(sha(adapter), ADAPTER_SHA, 'Reviewed adapter bytes stay exact');
  const published = 'ae14cf973b9053a7f1cd4f520b416aee804f65c9';
  const normalize = text => text.replaceAll('\r\n', '\n');
  const oldHook = git(['show', published + ':' + HOOK]);
  assert.notEqual(normalize(read(HOOK).toString('utf8')), normalize(oldHook), 'Old published hook pin changes the actual composed hook');
  assert.throws(() => assert.equal(normalize(read(HOOK).toString('utf8')), normalize(oldHook), 'Published picker source differs: ' + HOOK),
    error => error.code === 'ERR_ASSERTION' && error.message.includes('Published picker source differs: ' + HOOK),
    'Effective source-comparison control: the unchanged old hook pin rejects this composed hook');
  composition.adapter = { file: ADAPTER, sha256: sha(adapter), bytes: adapter.length, original: OLD_XI_PLAY, originalRef: SC,
    spans, wholeDerivationEqual: true, oldPublishedHookRef: published, oldHookSha256: sha(oldHook), oldHookPinRejected: true,
    limit: 'Effective source-comparison control only, not an actual served browser control.' };
  fs.writeFileSync(path.join(OUT, 'adapter.derived.mjs'), derived); checkpoint();
  const creation = run('creation', [SC_TEST], 4, SC_TITLES, 'SC_CREATION_ROLL_RAW');
  assert.equal(creation.bytes.length, 33249);
  assert.equal(sha(creation.bytes), '7a6b96bd6027dc81d7b14e9c6306eb30db7d6170f97251a5eb2fff8db4fcd152', 'Exact qualified creation normal raw bytes');
  const scRaw = JSON.parse(creation.bytes), scKeys = ['fresh-start', 'settled-position-change', 'in-flight-position-change', 'new-position-start'];
  assert.deepEqual(Object.keys(scRaw).sort(), [...scKeys].sort());
  for (const value of Object.values(scRaw)) assert(value.before?.storage && (value.afterPress?.storage || value.after?.storage), 'Complete creation before/after stores');
  for (const key of ['fresh-start', 'new-position-start']) assert(scRaw[key].saved && Array.isArray(scRaw[key].before.draws) && Array.isArray(scRaw[key].after.draws));
  const selection = run('selection', [XI_TEST], 8, XI_TITLES, 'XI_RACE_RAW');
  assert.equal(selection.bytes.length, 113820);
  assert.equal(sha(selection.bytes), '44035a4cc3fbf2d2d6bb4fb5993c075962a64626165243e03dccf2838accfc96', 'Exact qualified XI normal raw bytes');
  const xiRaw = JSON.parse(selection.bytes).observations;
  const xiKeys = ['overlap', 'primary', 'valid-history', 'refused-retry', 'unverified-retry', 'reroll', 'reset', 'next-door'];
  assert.deepEqual(Object.keys(xiRaw).sort(), [...xiKeys].sort());
  let snapshots = 0;
  for (const [id, value] of Object.entries(xiRaw)) for (const [key, snapshot] of Object.entries(value)) {
    if (!snapshot || !Object.hasOwn(snapshot, 'hook')) continue;
    snapshots++;
    assert(Array.isArray(snapshot.hook.filledSlots) && Array.isArray(snapshot.hook.filledSlotsArray) && Array.isArray(snapshot.draws) && Array.isArray(snapshot.trace));
    assert.deepEqual(snapshot.stores, value.before.stores, 'Full XI storage held: ' + id + '/' + key);
    assert(snapshot.draws.every(draw => draw === 0.5));
    assert(snapshot.trace.filter(action => action.action === 'actual transport request').every(action => ['history', 'validator'].includes(action.kind)));
  }
  assert.equal(snapshots, 28);
  const overlap = xiRaw.overlap;
  const owner = value => value.hook.filledSlots.find(([index]) => index === 9)?.[1].playerName;
  assert.equal(overlap.before.hook.currentTeam.name, 'Real Madrid'); assert.equal(overlap.before.hook.selectedPositionIndex, 9);
  assert.equal(overlap.duringHistory.hook.isValidating, true); assert.equal(overlap.retryEnabled, false);
  assert.equal(owner(overlap.afterRetry), undefined); assert.equal(overlap.afterRetry.hook.filledCount, 0);
  assert.equal(owner(overlap.afterHistory), 'Fixture Harbor Defender'); assert.equal(overlap.afterHistory.hook.filledCount, 1);
  assert.equal(overlap.expectedOwner, 'Fixture Harbor Defender');
  assert.deepEqual(overlap.afterHistory.hook.filledSlots[0][1].pick.played, ['ST']);
  assert.deepEqual(overlap.afterHistory.trace.filter(action => action.action === 'actual submitPlayer').map(action => action.name), ['Fixture Harbor Defender']);
  assert.equal(overlap.afterHistory.hook.isValidating, false);
  report.raw = { creation: { ...creation.row.raw, matchesQualifiedNormal: true, observations: 4 },
    selection: { ...selection.row.raw, matchesQualifiedNormal: true, observations: 8, snapshots } };
  run('related', Object.keys(RELATED), 101);
} catch (error) {
  report.error = error?.stack || String(error); checkpoint(); throw error;
} finally {
  const after = tracked(); json('tracked.after.json', after);
  report.sourceHeld = JSON.stringify(after) === JSON.stringify(before); checkpoint();
  assert.deepEqual(after, before, 'Complete tracked source and historical methods held');
}
assert.equal(report.children.length, 3); assert(report.children.every(row => row.qualified));
assert(report.raw.creation.matchesQualifiedNormal && report.raw.selection.matchesQualifiedNormal && report.sourceHeld && composition.appFencePassed);
report.qualified = true; checkpoint(); json('summary.json', report);
console.log('Urgent composition:4 creation+8 XI+101 related passes;32 full observations;exact qualified raw bytes and composed source held.');
