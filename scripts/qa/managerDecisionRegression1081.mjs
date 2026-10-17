import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert(process.env.CI, 'Decision regression recording runs only in remote CI');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'manager-appeal-isolation-artifacts/decision-regressions');
const HARNESS = 'scripts/simClubManagerDecisions.mjs';
const DESK = 'src/lib/clubManagerDecisions.ts';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/fixtures/managerAppealIsolation1081/manifest.json')));
assert.equal(digest(fs.readFileSync(path.join(ROOT, HARNESS))), manifest.unchangedSource[HARNESS], 'Original assertions and fixtures are exact');
fs.mkdirSync(OUT, { recursive: true });
function sourceHashes(root) {
  const files = {};
  const walk = relative => {
    for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
      const file = `${relative}/${entry.name}`;
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile()) files[file] = digest(fs.readFileSync(path.join(root, file)));
    }
  };
  walk('src'); return files;
}
const report = { complete: false, sourceBefore: sourceHashes(ROOT), runs: [],
  originalVerificationBefore: Object.fromEntries([HARNESS, 'scripts/lib/seedRandom.mjs'].map(file => [file, digest(fs.readFileSync(path.join(ROOT, file)))])),
  scope: 'All original semantic assertions, declared nine-career prefix, and independently healthy current/frozen runs' };
const save = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
save();
function run(name, root, seed, control) {
  const env = { ...process.env, SIM_OFFLINE_RECEIPT: path.join(OUT, `${name}.transport.log`) };
  delete env.SIM_SEED; delete env.CM_DECISIONS_CONTROL;
  if (seed !== undefined) env.SIM_SEED = String(seed);
  if (control) env.CM_DECISIONS_CONTROL = control;
  const child = spawnSync(process.execPath, [path.join(root, HARNESS)], { cwd: root, env, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 120000 });
  fs.writeFileSync(path.join(OUT, `${name}.stdout.log`), child.stdout || '');
  fs.writeFileSync(path.join(OUT, `${name}.stderr.log`), child.stderr || '');
  const row = { name, seed: seed ?? null, seedEnvironment: seed === undefined ? 'truly unset, original filename initialization' : 'explicit', control: control ?? null,
    exit: child.status, signal: child.signal, error: child.error?.message, stdoutSha256: digest(child.stdout || ''), stderrSha256: digest(child.stderr || ''),
    failures: (child.stdout || '').split('\n').filter(line => line.startsWith('FAIL ')) };
  report.runs.push(row); save();
  assert(!child.error && !child.signal && Number.isInteger(child.status), 'Actual original harness finishes');
  assert(!/SyntaxError|ReferenceError|TypeError|ERR_MODULE_NOT_FOUND|SIM_OFFLINE_BLOCK/.test(child.stderr || ''), 'Runtime/setup errors do not count as assertion evidence');
  assert(!fs.existsSync(env.SIM_OFFLINE_RECEIPT) || fs.statSync(env.SIM_OFFLINE_RECEIPT).size === 0, 'No blocked transport');
  assert((child.stdout || '').includes(`simClubManagerDecisions${control ? ` (control ${control})` : ''}: ${row.failures.length} findings`), 'Complete original terminal verdict');
  return row;
}
function healthyStatus(row) {
  assert.equal(row.exit, 0, 'Every declared current and frozen run must satisfy all original assertions');
  assert.deepEqual(row.failures, []); return 'passed';
}
function pairedStatus(current, historical) {
  return { current: healthyStatus(current), historical: healthyStatus(historical) };
}
function retainedObservation(row) {
  const stdout = fs.readFileSync(path.join(OUT, `${row.name}.stdout.log`), 'utf8');
  const stderr = fs.readFileSync(path.join(OUT, `${row.name}.stderr.log`), 'utf8');
  return { ...row, stdoutSha256: digest(stdout), stderrSha256: digest(stderr),
    failures: stdout.split('\n').filter(line => line.startsWith('FAIL ')) };
}
function compareHeldObservation(actual, held) {
  assert.deepEqual({ ...actual, stdoutSha256: held.stdoutSha256 }, held, 'Complete held observation metadata is unchanged');
  assert.equal(actual.stdoutSha256, held.stdoutSha256, 'Complete held stdout is byte-identical to its healthy observation');
  return 'passed';
}
const baseline = fs.mkdtempSync(path.join(ROOT, '.manager-decision-baseline-1081-'));
try {
  fs.cpSync(path.join(ROOT, 'src'), path.join(baseline, 'src'), { recursive: true });
  fs.mkdirSync(path.join(baseline, 'scripts/lib'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, HARNESS), path.join(baseline, HARNESS));
  fs.copyFileSync(path.join(ROOT, 'scripts/lib/seedRandom.mjs'), path.join(baseline, 'scripts/lib/seedRandom.mjs'));
  report.copiedVerification = Object.fromEntries(Object.keys(report.originalVerificationBefore).map(file => [file, digest(fs.readFileSync(path.join(baseline, file)))]));
  assert.deepEqual(report.copiedVerification, report.originalVerificationBefore, 'Copied original harness and initialization stream are byte-exact');
  const historical = fs.readFileSync(path.join(ROOT, manifest.frozenSource));
  assert.equal(digest(historical), manifest.sha256);
  fs.writeFileSync(path.join(baseline, DESK), historical);
  report.baselineSource = sourceHashes(baseline);
  for (const [file, hash] of Object.entries(report.sourceBefore)) assert.equal(report.baselineSource[file], file === DESK ? manifest.sha256 : hash, `Baseline differs only at frozen decisions: ${file}`);
  assert.deepEqual(Object.keys(report.baselineSource), Object.keys(report.sourceBefore));
  const currentDefault = run('current-default', ROOT), historicalDefault = run('historical-default', baseline);
  const samples = [];
  for (const seed of [1, 2, 3, 4]) {
    samples.push({ seed, current: run(`current-seed-${seed}`, ROOT, seed), historical: run(`historical-seed-${seed}`, baseline, seed) });
  }
  const defaults = pairedStatus(currentDefault, historicalDefault);
  report.currentDefault = defaults.current; report.historicalDefault = defaults.historical;
  report.defaultLimitation = report.currentDefault !== 'passed';
  report.samples = samples.map(pair => ({ seed: pair.seed, ...pairedStatus(pair.current, pair.historical) }));
  assert.equal(samples[0].current.exit, 0, 'Seed 1 remains a genuinely healthy original assertion baseline');
  assert.equal(samples[0].historical.exit, 0, 'Frozen seed 1 is independently healthy');
  assert.equal(report.runs.length, 10, 'All ten declared normal runs completed before the control');
  const healthy = samples[0].current;
  const observedFile = path.join(OUT, `${healthy.name}.stdout.log`);
  const observed = fs.readFileSync(observedFile, 'utf8');
  const heldRow = structuredClone(retainedObservation(healthy));
  assert.deepEqual(heldRow, healthy, 'Physical healthy output matches its complete retained row');
  assert.equal(compareHeldObservation(retainedObservation(healthy), heldRow), 'passed');
  const observation = '5. declining is main:';
  assert.equal(observed.split(observation).length - 1, 1, 'Unique observed output control anchor');
  const corrupted = observed.replace(observation, '5. declining is Main:');
  assert.notEqual(corrupted, observed); assert.notEqual(digest(corrupted), digest(observed));
  assert.deepEqual(corrupted.split('\n').filter(line => line.startsWith('FAIL ')), healthy.failures);
  fs.writeFileSync(path.join(OUT, 'comparator-control-before.stdout.log'), observed);
  fs.writeFileSync(path.join(OUT, 'comparator-control-held.json'), JSON.stringify(heldRow, null, 2));
  let mismatch, corruptedRow;
  try {
    fs.writeFileSync(observedFile, corrupted);
    fs.writeFileSync(path.join(OUT, 'comparator-control-fault.stdout.log'), fs.readFileSync(observedFile));
    corruptedRow = retainedObservation(healthy);
    try { compareHeldObservation(corruptedRow, heldRow); } catch (error) { mismatch = error; }
  } finally {
    fs.writeFileSync(observedFile, observed);
    fs.writeFileSync(path.join(OUT, 'comparator-control-restored.stdout.log'), fs.readFileSync(observedFile));
  }
  assert.equal(mismatch?.name, 'AssertionError');
  assert(mismatch.message.startsWith('Complete held stdout is byte-identical to its healthy observation'));
  assert.equal(mismatch.actual, digest(corrupted)); assert.equal(mismatch.expected, heldRow.stdoutSha256);
  const restoredRow = retainedObservation(healthy);
  assert.equal(compareHeldObservation(restoredRow, heldRow), 'passed');
  report.comparatorControl = { baseline: healthy.name, beforeSha256: digest(observed), faultSha256: digest(corrupted),
    restoredSha256: restoredRow.stdoutSha256, heldRow, corruptedRow,
    error: { name: mismatch.name, message: mismatch.message }, effective: true, restoredComparisonPassed: true,
    scope: 'Healthy retained observation integrity, no gameplay/source mutation or current/frozen output equality' };
  const from = '    const next = won ? 0 : p.suspendedMatches + APPEAL_LOSS_EXTRA;';
  const to = '    const next = won ? 0 : p.suspendedMatches;';
  const current = fs.readFileSync(path.join(ROOT, DESK), 'utf8').replaceAll('\r\n', '\n');
  assert.equal(current.split(from).length - 1, 1, 'Unique original loss control anchor');
  const original = fs.readFileSync(path.join(ROOT, HARNESS), 'utf8');
  assert(original.includes(`desk = swap(desk, '${from}', '${to}', 'clubManagerDecisions.ts');`), 'Original harness applies this exact copied mutation');
  const copied = current.replace(from, to); assert.notEqual(copied, current);
  fs.writeFileSync(path.join(OUT, 'freeloss-reconstructed-source.ts'), copied);
  const control = run('current-seed-1-freeloss', ROOT, 1, 'freeloss');
  assert.equal(control.exit, 1); assert(control.failures.some(line => line.startsWith('FAIL [3]')), 'Original lost-ban assertion rejects its executable copied fault');
  assert(control.failures.every(line => line.startsWith('FAIL [3]')), 'Only the intended original control section may fail');
  report.lossControl = { copiedSourceSha256: digest(copied), mappedSection: 3, healthyBaseline: 'current-seed-1',
    limit: 'Reconstructed exact original mutation retained; original harness removes its temporary emitted bundle' };
  report.complete = true; save();
  console.log(`Default current: ${report.currentDefault}; frozen historical: ${report.historicalDefault}.`);
  console.log(`All declared paired seeds retained: ${report.samples.map(pair => `${pair.seed}=${pair.current}`).join(', ')}. All ten normal runs passed; current and frozen outputs remain independently retained.`);
  console.log('Original loss control fired in section 3 beside a healthy seed-1 baseline.');
} catch (error) {
  report.error = { name: error.name, message: error.message, stack: error.stack }; save(); throw error;
} finally {
  try {
    report.sourceAfter = sourceHashes(ROOT);
    report.originalVerificationAfter = Object.fromEntries(Object.keys(report.originalVerificationBefore).map(file => [file, digest(fs.readFileSync(path.join(ROOT, file)))]));
    assert.deepEqual(report.sourceAfter, report.sourceBefore, 'Actual sources stay held');
    assert.deepEqual(report.originalVerificationAfter, report.originalVerificationBefore, 'Original assertion and stream source holds');
    report.finalHoldsPassed = true;
  } catch (error) {
    report.complete = false; report.finalHoldsPassed = false;
    report.finalHoldError = { name: error.name, message: error.message }; throw error;
  } finally {
    fs.rmSync(baseline, { recursive: true, force: true }); save();
  }
}
