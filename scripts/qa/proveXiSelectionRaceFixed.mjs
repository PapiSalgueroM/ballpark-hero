/* Remote paired qualification of the actual XI hook. Fictional deferred transport,
 * not a browser, live database or physical-device root-cause claim. */
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Remote offline CI only');
assert(process.env.XI_SELECTION_RACE_PHASE === 'fixed', 'Fixed qualification only');
assert(process.env.XI_RACE_OUT && path.isAbsolute(process.env.XI_RACE_OUT), 'Absolute XI_RACE_OUT required');
const BASELINE_RAW = process.env.XI_RACE_BASELINE_RAW_SHA256;
assert(/^[a-f0-9]{64}$/.test(BASELINE_RAW || ''), 'Supply the physically qualified original baseline raw SHA');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(process.env.XI_RACE_OUT, 'fixed-proof');
const BASE = 'b1520a9e9d21148b74487079a5847cd907dbedf0';
const HOOK = 'src/hooks/useLineupBuilder.ts', TEST = 'src/test/xiSelectionHistoryRace.test.tsx';
const SELF = 'scripts/qa/proveXiSelectionRaceFixed.mjs', PLAY = 'scripts/qa/playXiPendingHistory.mjs';
const TEST_SHA = 'f4695edf40dbd2017015219cab791156c133bb679f7e330de40aabf970a9549d';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(path.join(ROOT, file));
function git(args) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', timeout: 30000, maxBuffer: 64 * 1024 * 1024 });
  assert(!result.error && !result.signal && result.status === 0, 'Actual source Git read: ' + args.join(' '));
  return result.stdout;
}
assert(!fs.existsSync(path.join(OUT, 'report.json')), 'Never overwrite prior qualification evidence');
fs.mkdirSync(OUT, { recursive: true });
const json = (file, value) => fs.writeFileSync(path.join(OUT, file), JSON.stringify(value, null, 2) + '\n');
const receipt = file => { const bytes = fs.readFileSync(file); return { file: path.relative(OUT, file).replaceAll('\\', '/'), bytes: bytes.length, sha256: sha(bytes) }; };
const HEAD = git(['rev-parse', 'HEAD']).trim();
const tracked = () => Object.fromEntries(git(['ls-files', '-z']).split('\0').filter(Boolean).sort().map(file => [file, sha(read(file))]));
const before = tracked(), fixed = read(HOOK), original = Buffer.from(git(['show', BASE + ':' + HOOK]));
const report = { head: HEAD, base: BASE, phase: 'fixed', baselineRawSha256: BASELINE_RAW,
  scope: 'Actual-hook prepared deferred-history unit qualification only', arms: [], inverse: [], sourceHeld: false, qualified: false };
const checkpoint = () => json('report.json', report);
json('tracked.before.json', before); checkpoint();
const TARGET = 'history race missing: a late history cannot replace the latest enabled-picker selection';
const CAUSE = 'XI_SELECTION_RACE_OWNERSHIP: late history replaced the most recent pick accepted by the enabled picker';
const PRESERVED = [
  'history race preservation: a matching-primary club pick stays local and immediate',
  'history race preservation: valid history still admits the originally selected player',
  'history race preservation: refused history releases the picker for a valid retry',
  'history race preservation: an unverified nation pick releases the picker and retry can succeed',
  'history race preservation: reroll abandons a pending history without publishing into its new team',
  'history race preservation: reset abandons a pending history without repopulating the formation',
  'history race preservation: the existing next-door history wait stays busy and settles normally',
];
const KEYS = ['overlap', 'primary', 'valid-history', 'refused-retry', 'unverified-retry', 'reroll', 'reset', 'next-door'];
const WHOLE = ['primary', 'unverified-retry', 'next-door'];
const DURING = ['valid-history', 'refused-retry', 'reroll', 'reset'];
const spans = [
  { label: 'wrong-position history owns the busy flag',
    current: '      if (!positionCheck.ok) {\n        setIsValidating(true);\n        played = await verifiedSecondaries(playerName.trim(), primary);',
    original: '      if (!positionCheck.ok) {\n        played = await verifiedSecondaries(playerName.trim(), primary);' },
  { label: 'final position refusal releases the busy flag',
    current: "      if (!positionCheck.ok) {\n        setIsValidating(false);\n        setValidationError(positionCheck.reason ?? 'That player does not fit this position.');",
    original: "      if (!positionCheck.ok) {\n        setValidationError(positionCheck.reason ?? 'That player does not fit this position.');" },
];
const owner = value => value.hook.filledSlots.find(([index]) => index === 9)?.[1].playerName;
function run(arm) {
  const folder = path.join(OUT, arm); fs.mkdirSync(folder, { recursive: true });
  const unitsFile = path.join(folder, 'units.json'), rawFile = path.join(folder, 'raw.json');
  const child = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', TEST, '--maxWorkers=1', '--minWorkers=1', '--reporter=verbose', '--reporter=json', '--outputFile.json=' + unitsFile],
    { cwd: ROOT, env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1', XI_RACE_RAW: rawFile }, encoding: 'utf8', timeout: 180000, maxBuffer: 64 * 1024 * 1024 });
  const stdout = child.stdout || '', stderr = child.stderr || '';
  fs.writeFileSync(path.join(folder, 'stdout.log'), stdout); fs.writeFileSync(path.join(folder, 'stderr.log'), stderr);
  const row = { arm, exit: child.status, signal: child.signal, error: child.error?.message || null, stdoutSha256: sha(stdout), stderrSha256: sha(stderr), qualified: false };
  report.arms.push(row); checkpoint(); process.stdout.write(stdout); process.stderr.write(stderr);
  assert(!child.error && !child.signal && child.status !== null, 'Actual runner must complete: ' + arm);
  assert(!/Unhandled Errors?|Unhandled Rejection|Uncaught Exception|TypeError:|ReferenceError:|SyntaxError:|Failed to (?:load|resolve import)|Cannot find module|ERR_MODULE_NOT_FOUND|SIM_OFFLINE_BLOCK/i.test(stdout + stderr), 'Setup faults cannot qualify');
  const units = JSON.parse(fs.readFileSync(unitsFile)); assert.equal(units.testResults.length, 1);
  const file = units.testResults[0]; assert(!file.message); assert(file.name.replaceAll('\\', '/').endsWith('/' + TEST));
  const cases = file.assertionResults, failed = cases.filter(test => test.status === 'failed'), isOriginal = arm === 'original';
  assert.equal(cases.length, 8); assert.deepEqual(cases.map(test => test.title).sort(), [TARGET, ...PRESERVED].sort());
  assert(cases.every(test => ['passed', 'failed'].includes(test.status)));
  assert.deepEqual(failed.map(test => test.title), isOriginal ? [TARGET] : []);
  if (isOriginal) {
    assert.equal(failed[0].failureMessages.length, 1);
    assert(failed[0].failureMessages[0].startsWith('AssertionError: ' + CAUSE) && failed[0].failureMessages[0].includes('expected false to be true'), 'Only the exact ownership Boolean fault qualifies');
  }
  assert.equal(units.numTotalTests, 8); assert.equal(units.numPendingTests, 0); assert.equal(units.numTodoTests, 0);
  assert.equal(units.numFailedTests, isOriginal ? 1 : 0); assert.equal(units.numPassedTests, isOriginal ? 7 : 8);
  assert.equal(units.success, !isOriginal); assert.equal(child.status, isOriginal ? 1 : 0);
  const bytes = fs.readFileSync(rawFile), raw = JSON.parse(bytes).observations;
  assert.deepEqual(Object.keys(raw).sort(), [...KEYS].sort());
  let snapshots = 0;
  for (const [id, value] of Object.entries(raw)) for (const [key, snapshot] of Object.entries(value)) {
    if (!snapshot || !Object.hasOwn(snapshot, 'hook')) continue;
    snapshots++; assert(Array.isArray(snapshot.hook.filledSlots) && Array.isArray(snapshot.hook.filledSlotsArray) && Array.isArray(snapshot.draws) && Array.isArray(snapshot.trace));
    assert.deepEqual(snapshot.stores, value.before.stores, 'Complete storage bytes held: ' + id + '/' + key);
    assert(snapshot.draws.every(draw => draw === 0.5));
    assert(snapshot.trace.filter(action => action.action === 'actual transport request').every(action => ['history', 'validator'].includes(action.kind)), 'Declared transport only');
  }
  assert.equal(snapshots, 28);
  const overlap = raw.overlap;
  assert.equal(overlap.before.hook.currentTeam.name, 'Real Madrid'); assert.equal(overlap.before.hook.selectedPositionIndex, 9);
  assert.equal(overlap.duringHistory.hook.isValidating, !isOriginal); assert.equal(overlap.retryEnabled, isOriginal);
  assert.equal(owner(overlap.afterRetry), isOriginal ? 'Fixture Harbor Striker' : undefined);
  assert.equal(overlap.afterRetry.hook.filledCount, isOriginal ? 1 : 0);
  assert.equal(owner(overlap.afterHistory), 'Fixture Harbor Defender'); assert.equal(overlap.afterHistory.hook.filledCount, 1);
  assert.equal(overlap.expectedOwner, isOriginal ? 'Fixture Harbor Striker' : 'Fixture Harbor Defender');
  assert.deepEqual(overlap.afterHistory.hook.filledSlots[0][1].pick.played, ['ST']);
  const submits = overlap.afterHistory.trace.filter(action => action.action === 'actual submitPlayer');
  assert.deepEqual(submits.map(action => action.name), isOriginal ? ['Fixture Harbor Defender', 'Fixture Harbor Striker'] : ['Fixture Harbor Defender']);
  assert.equal(overlap.afterHistory.hook.isValidating, false);
  row.completed = 8; row.passed = units.numPassedTests; row.exactFaults = units.numFailedTests; row.snapshots = snapshots;
  row.raw = receipt(rawFile); row.units = receipt(unitsFile); row.qualified = true; checkpoint();
  console.log(`XI history ${arm}:8 completed;${row.passed} passed;${row.exactFaults} exact ownership faults;28 complete snapshots.`);
  return { raw, bytes };
}
try {
  assert.equal(git(['status', '--porcelain', '--untracked-files=no']), '', 'Actual qualification source starts committed and clean');
  git(['merge-base', '--is-ancestor', BASE, HEAD]);
  assert.deepEqual(fixed, Buffer.from(git(['show', HEAD + ':' + HOOK])));
  assert.deepEqual(read(SELF), Buffer.from(git(['show', HEAD + ':' + SELF])), 'Actual fixed method belongs to this HEAD');
  assert.equal(sha(read(TEST)), TEST_SHA); assert.deepEqual(read(TEST), Buffer.from(git(['show', BASE + ':' + TEST])));
  git(['diff', '--exit-code', BASE, HEAD, '--', 'src', 'scripts', 'public', 'package.json', 'package-lock.json', 'bun.lock', 'bun.lockb', ':!' + HOOK, ':!' + SELF, ':!' + PLAY]);
  assert.notDeepEqual(fixed, original, 'The actual product hook must change for the original control');
  let inverse = fixed.toString('utf8');
  for (const span of spans) {
    assert.equal(inverse.split(span.current).length, 2, 'Unique own inverse span: ' + span.label);
    const offset = inverse.indexOf(span.current); inverse = inverse.slice(0, offset) + span.original + inverse.slice(offset + span.current.length);
    report.inverse.push({ ...span, offset });
  }
  assert.equal(inverse, original.toString('utf8'), 'Two own additions reconstruct the complete exact baseline hook');
  let forward = inverse;
  for (const span of [...report.inverse].reverse()) {
    assert.equal(forward.slice(span.offset, span.offset + span.original.length), span.original);
    forward = forward.slice(0, span.offset) + span.current + forward.slice(span.offset + span.original.length);
  }
  assert.equal(forward, fixed.toString('utf8'), 'Complete forward hook restoration');
  fs.writeFileSync(path.join(OUT, 'hook.current.ts'), fixed); fs.writeFileSync(path.join(OUT, 'hook.original.ts'), original); fs.writeFileSync(path.join(OUT, 'hook.inverse.ts'), inverse);
  fs.writeFileSync(path.join(OUT, 'product.diff'), git(['diff', '--no-ext-diff', BASE, HEAD, '--', HOOK]));
  report.source = { current: sha(fixed), original: sha(original), inverse: sha(inverse), test: sha(read(TEST)), appBindings: Object.fromEntries(Object.entries(before).filter(([file]) => file.startsWith('src/'))) }; checkpoint();
  const normal = run('normal'); let control;
  try { fs.writeFileSync(path.join(ROOT, HOOK), original); control = run('original'); }
  finally { fs.writeFileSync(path.join(ROOT, HOOK), fixed); }
  assert.deepEqual(read(HOOK), fixed, 'Actual fixed hook restored before third arm');
  const restored = run('restored'); assert.deepEqual(restored.bytes, normal.bytes, 'All normal/restored raw bytes equal');
  for (const key of WHOLE) {
    assert.deepEqual(control.raw[key], normal.raw[key], 'Whole preserved state/draw/trace row: ' + key);
    assert.deepEqual(restored.raw[key], normal.raw[key]);
  }
  for (const key of DURING) {
    const current = structuredClone(normal.raw[key]), old = structuredClone(control.raw[key]);
    assert.equal(current.during.hook.isValidating, true); assert.equal(old.during.hook.isValidating, false);
    delete current.during.hook.isValidating; delete old.during.hook.isValidating;
    assert.deepEqual(old, current, 'Only the declared during-history busy flag changes: ' + key);
  }
  assert.equal(sha(control.bytes), BASELINE_RAW, 'Actual original raw matches the physically retained baseline');
  report.comparisons = { rawByteRestoration: true, originalMatchesRetainedBaselineRaw: true, wholePreservedCases: WHOLE,
    onlyDuringBusyFlagCases: DURING, snapshotsPerArm: 28, totalSnapshots: 84, overlappingSelectionOwnershipQualified: true };
} catch (error) { report.error = error?.stack || String(error); throw error; }
finally {
  fs.writeFileSync(path.join(ROOT, HOOK), fixed);
  const after = tracked(); json('tracked.after.json', after); report.sourceHeld = JSON.stringify(after) === JSON.stringify(before); checkpoint();
  assert.deepEqual(after, before, 'Complete tracked app/test/helper/public/package bytes held');
}
assert.equal(report.arms.length, 3); assert(report.arms.every(arm => arm.qualified) && report.sourceHeld);
report.qualified = true; checkpoint();
console.log('XI fixed unit proof:8 current passes;1 exact original overwrite fault+7 preserves;8 restored passes;84 complete snapshots;source and actual baseline raw held.');
console.log('Prepared actual-hook proof only. No browser, live database or physical-device root-cause qualification.');