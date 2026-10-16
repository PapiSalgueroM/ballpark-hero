/* Actual mounted-page creation proof. Frozen tests and exact original page, no browser simulation. */
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert(process.env.CI === '1' && process.env.SIM_NETWORK === 'offline', 'Remote offline CI required');
assert(process.env.SAFARI_REPORT_PHASE === 'fixed', 'Only the declared fixed qualification invokes this method');
assert(process.env.SAFARI_REPORT_OUT && path.isAbsolute(process.env.SAFARI_REPORT_OUT), 'Absolute runner output required');
const BASELINE_RAW = process.env.SC_CREATION_BASELINE_RAW_SHA256;
assert(/^[a-f0-9]{64}$/.test(BASELINE_RAW || ''), 'Root must supply the retained actual baseline raw SHA before fixed qualification');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(process.env.SAFARI_REPORT_OUT, 'creation-proof');
assert(!fs.existsSync(OUT), 'Never overwrite original proof evidence'); fs.mkdirSync(OUT, { recursive: true });
const BASE = '1823478805186fcd037d5f6b3145513a273aa4fb';
const PAGE = 'src/pages/SoccerCareer.tsx', TEST = 'src/test/soccerCareerCreationRoll.test.tsx';
const SELF = 'scripts/qa/proveSoccerCreation1388.mjs';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(path.join(ROOT, file));
const json = (file, value) => fs.writeFileSync(path.join(OUT, file), JSON.stringify(value, null, 2) + '\n');
function git(args) {
  const child = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', timeout: 30000, maxBuffer: 64 * 1024 * 1024 });
  assert(!child.error && !child.signal && child.status === 0, 'Actual source Git operation: ' + args.join(' ')); return child.stdout;
}
const HEAD = git(['rev-parse', 'HEAD']).trim();
const fixed = read(PAGE), original = Buffer.from(git(['show', BASE + ':' + PAGE]));
const tracked = () => Object.fromEntries(git(['ls-files', '-z']).split('\0').filter(Boolean).sort().map(file => [file, sha(read(file))]));
const before = tracked(); json('tracked-before.json', before);
const report = { head: HEAD, base: BASE, baselineRawSha256: BASELINE_RAW, phase: 'fixed', arms: [], inverse: [], sourceHeld: false, qualified: false };
const checkpoint = () => json('report.json', report);
const rawKeys = ['fresh-start', 'settled-position-change', 'in-flight-position-change', 'new-position-start'];
const targets = [
  { title: 'creation roll stale settled: changing position requires a new roll before Begin Career',
    cause: 'creation roll settled position leaves Begin Career enabled without a usable preview' },
  { title: 'creation roll stale in-flight: a previous position roll cannot publish after the switch',
    cause: 'creation roll in-flight position publishes an abandoned preview' },
];
const preserved = [
  'creation roll preservation: a fresh settled roll starts and saves the displayed player',
  'creation roll preservation: a new position reroll starts with its displayed stats',
];
const reset = `  const rollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  // A roll belongs to the position it was made for. Keep the form itself mounted.
  useEffect(() => {
    setRolledOvr(null);
    setRolledPot(null);
    setIsRolling(false);
    setAcademyClub(null);
    return () => {
      if (rollTimer.current !== null) clearInterval(rollTimer.current);
      rollTimer.current = null;
    };
  }, [position]);
`;
const spans = [
  { label: 'position-local roll state and interval cleanup', current: reset, original: '' },
  { label: 'completed interval releases its owned handle', current: '        clearInterval(interval);\n        rollTimer.current = null;', original: '        clearInterval(interval);' },
  { label: 'active interval records its owned handle', current: '    }, 60);\n    rollTimer.current = interval;', original: '    }, 60);' },
  { label: 'Begin availability agrees with actual parent preview', current: '      <Button onClick={onBegin} disabled={!isFormValid || saving || rolledOvr === null || !previewStats}', original: '      <Button onClick={onBegin} disabled={!isFormValid || saving || rolledOvr === null}' },
];
function receipt(file) { const bytes = fs.readFileSync(file); return { file: path.relative(OUT, file).replaceAll('\\', '/'), bytes: bytes.length, sha256: sha(bytes) }; }
function run(arm) {
  const folder = path.join(OUT, arm); fs.mkdirSync(folder);
  const unitFile = path.join(folder, 'units.json'), rawFile = path.join(folder, 'raw.json');
  const env = { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1', SC_CREATION_ROLL_RAW: rawFile };
  const child = spawnSync(process.execPath, [path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', TEST,
    '--maxWorkers=1', '--reporter=verbose', '--reporter=json', '--outputFile.json=' + unitFile],
  { cwd: ROOT, env, encoding: 'utf8', timeout: 240000, maxBuffer: 64 * 1024 * 1024 });
  const stdout = child.stdout || '', stderr = child.stderr || '';
  fs.writeFileSync(path.join(folder, 'stdout.log'), stdout); fs.writeFileSync(path.join(folder, 'stderr.log'), stderr);
  const row = { arm, exit: child.status, signal: child.signal, error: child.error?.message || null, qualified: false };
  report.arms.push(row); checkpoint(); process.stdout.write(stdout); process.stderr.write(stderr);
  assert(!child.error && !child.signal && child.status !== null, 'The actual test runner must complete: ' + arm);
  assert(!/Unhandled Errors?|Unhandled Rejection|Uncaught Exception|TypeError:|ReferenceError:|SyntaxError:|Failed to (?:load|resolve import)|Cannot find module|ERR_MODULE_NOT_FOUND|SIM_OFFLINE_BLOCK/i.test(stdout + stderr), 'Setup and transport faults cannot qualify');
  const result = JSON.parse(fs.readFileSync(unitFile));
  assert.equal(result.testResults.length, 1); const file = result.testResults[0]; assert(!file.message);
  assert(file.name.replaceAll('\\', '/').endsWith('/' + TEST));
  const cases = file.assertionResults, expected = arm === 'original' ? targets : [], failed = cases.filter(test => test.status === 'failed');
  assert.deepEqual(cases.map(test => test.title).sort(), [...targets.map(test => test.title), ...preserved].sort());
  assert(cases.every(test => ['passed', 'failed'].includes(test.status))); assert.equal(cases.length, 4);
  assert.deepEqual(failed.map(test => test.title).sort(), expected.map(test => test.title).sort());
  for (const test of failed) {
    const cause = targets.find(target => target.title === test.title).cause;
    assert.equal(test.failureMessages.length, 1);
    assert(test.failureMessages[0].startsWith('AssertionError: ' + cause) && test.failureMessages[0].includes('expected false to be true'), 'Exact per-case stale-position Boolean cause');
  }
  assert.equal(result.numTotalTests, 4); assert.equal(result.numPendingTests, 0); assert.equal(result.numTodoTests, 0);
  assert.equal(result.numFailedTests, expected.length); assert.equal(result.numPassedTests, 4 - expected.length);
  assert.equal(result.success, expected.length === 0); assert.equal(child.status, expected.length ? 1 : 0);
  const rawBytes = fs.readFileSync(rawFile), raw = JSON.parse(rawBytes);
  assert.deepEqual(Object.keys(raw).sort(), [...rawKeys].sort(), 'All four complete actual observations must exist');
  for (const value of Object.values(raw)) assert(value.before?.storage && value.afterPress?.storage || value.before?.storage && value.after?.storage, 'Physical before and after stores');
  for (const key of ['fresh-start', 'new-position-start']) assert(raw[key].saved && Array.isArray(raw[key].before.draws) && Array.isArray(raw[key].after.draws));
  row.completed = cases.length; row.passed = result.numPassedTests; row.exactFaults = result.numFailedTests;
  row.raw = receipt(rawFile); row.units = receipt(unitFile); row.qualified = true; checkpoint();
  console.log(`Creation ${arm}:4 completed;${row.passed} passed;${row.exactFaults} precise stale-position faults;4 full observations.`);
  return { raw, bytes: rawBytes };
}
checkpoint();
try {
  assert.equal(git(['status', '--porcelain', '--untracked-files=no']), '', 'Qualification source must start committed and clean');
  assert.equal(fixed.toString('utf8'), git(['show', HEAD + ':' + PAGE]), 'Actual current page belongs to this HEAD');
  assert.equal(sha(read(TEST)), '8c0b6861fcbb635e5189f9cbbad7a4a4d44ffbdb1f91d51aa6c0661072802806', 'Frozen four cases must remain exact');
  assert.deepEqual(read(TEST), Buffer.from(git(['show', BASE + ':' + TEST])));
  git(['diff', '--exit-code', BASE, HEAD, '--', 'src', 'scripts', 'public', 'package.json', 'package-lock.json', 'bun.lock', ':!' + PAGE, ':!' + SELF, ':!scripts/qa/proveWebkitOffline1388.mjs']);
  assert.notDeepEqual(fixed, original, 'Original control changes the actual product page');
  let inverse = fixed.toString('utf8');
  for (const span of spans) {
    assert.equal(inverse.split(span.current).length, 2, 'Unique restricted inverse anchor: ' + span.label);
    const offset = inverse.indexOf(span.current);
    inverse = inverse.slice(0, offset) + span.original + inverse.slice(offset + span.current.length);
    report.inverse.push({ label: span.label, current: span.current, original: span.original, offset });
  }
  assert.equal(inverse, original.toString('utf8'), 'Four restricted changes reconstruct the exact corrected-guard baseline whole page');
  let forward = inverse;
  for (const span of [...report.inverse].reverse()) {
    assert.equal(forward.slice(span.offset, span.offset + span.original.length), span.original, 'Exact inverse position held during reconstruction');
    forward = forward.slice(0, span.offset) + span.current + forward.slice(span.offset + span.original.length);
  }
  assert.equal(forward, fixed.toString('utf8'), 'Whole current page reconstructs in the forward direction');
  fs.writeFileSync(path.join(OUT, 'page.current.tsx'), fixed); fs.writeFileSync(path.join(OUT, 'page.original.tsx'), original);
  fs.writeFileSync(path.join(OUT, 'page.inverse.tsx'), inverse); fs.writeFileSync(path.join(OUT, 'product.diff'), git(['diff', '--no-ext-diff', BASE, HEAD, '--', PAGE]));
  report.source = { current: sha(fixed), original: sha(original), inverse: sha(inverse), test: sha(read(TEST)), appBindings: Object.fromEntries(Object.entries(before).filter(([file]) => file.startsWith('src/'))) }; checkpoint();
  const normal = run('normal'); let control;
  try { fs.writeFileSync(path.join(ROOT, PAGE), original); control = run('original'); }
  finally { fs.writeFileSync(path.join(ROOT, PAGE), fixed); }
  assert.deepEqual(read(PAGE), fixed, 'Actual fixed page fully restored before the third arm');
  const restored = run('restored');
  assert.deepEqual(restored.bytes, normal.bytes, 'All four normal/restored raw observations are byte exact');
  for (const key of ['fresh-start', 'new-position-start']) {
    assert.deepEqual(control.raw[key], normal.raw[key], 'Complete preserved-case source/control state and RNG: ' + key);
    assert.deepEqual(restored.raw[key], normal.raw[key]);
  }
  assert.equal(sha(control.bytes), BASELINE_RAW, 'Exact original raw bytes equal the root-retained actual corrected-guard baseline');
  report.comparisons = { rawByteRestoration: true, preservedWholeCasesAcrossAllArms: 2, originalMatchesRetainedBaselineRaw: true };
} catch (error) { report.error = error?.stack || String(error); throw error; }
finally {
  fs.writeFileSync(path.join(ROOT, PAGE), fixed);
  const after = tracked(); json('tracked-after.json', after); report.sourceHeld = JSON.stringify(after) === JSON.stringify(before); checkpoint();
  assert.deepEqual(after, before, 'Complete tracked source, frozen tests, Engine/Save, public and package bytes held');
}
assert.equal(report.arms.length, 3); assert(report.arms.every(arm => arm.qualified) && report.sourceHeld);
report.qualified = true; checkpoint();
console.log('Creation fixed proof:4 current passes;2 exact original faults+2 preserves;4 restored passes;12 full observations;source and actual baseline raw held.');
