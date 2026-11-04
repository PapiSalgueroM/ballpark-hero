import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = process.cwd(), out = path.resolve(process.argv[2] || '');
assert(process.argv[2] && out !== root && !out.startsWith(root + path.sep), 'Fresh evidence directory outside source');
assert(!fs.existsSync(out), 'Control output must not contain older evidence');
assert.equal(process.env.SIM_NETWORK, 'offline');
assert(process.env.NODE_OPTIONS?.includes(path.join(root, 'scripts/lib/offlineTransport.cjs')), 'Use the existing Node offline preload');
const spec = JSON.parse(fs.readFileSync(process.argv[3] || fileURLToPath(new URL('./cmRetrainingPauseUnsafeControl.json', import.meta.url)), 'utf8'));
const sha = b => createHash('sha256').update(b).digest('hex');
const blob = b => createHash('sha1').update('blob ' + b.length + '\0').update(b).digest('hex');
const git = (...args) => execFileSync('git', args, { maxBuffer: 12 * 1024 * 1024 });
assert.equal(git('status', '--porcelain=v1', '--untracked-files=all').toString(), '', 'Clean source');
const saved = new Map(spec.files.map(f => [f.path, fs.readFileSync(f.path)]));
const checkSource = () => {
  for (const f of spec.files) {
    const bytes = fs.readFileSync(f.path);
    assert(bytes.equals(saved.get(f.path)), f.path + ' exact fixed bytes');
    assert.equal(blob(bytes), f.safeGit); assert.equal(sha(bytes), f.safeSha256);
  }
  for (const h of spec.holds) assert.equal(blob(fs.readFileSync(h.path)), h.git, h.path + ' held');
};
checkSource(); fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'control-map.json'), JSON.stringify(spec, null, 2) + '\n');
function run(name, unsafe) {
  const dir = path.join(out, name), raw = path.join(dir, 'cm'); fs.mkdirSync(raw, { recursive: true });
  const receipt = path.join(dir, 'transport.log'); fs.writeFileSync(receipt, '');
  const child = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', spec.test.path,
    '--maxWorkers=1', '--no-file-parallelism', '--reporter=default', '--reporter=json',
    '--outputFile=' + path.join(dir, 'units.json')], {
    env: { ...process.env, [spec.test.rawEnv]: raw, SIM_OFFLINE_RECEIPT: receipt },
    encoding: 'utf8', timeout: 600000, maxBuffer: 32 * 1024 * 1024,
  });
  const log = (child.stdout || '') + '\n' + (child.stderr || '');
  fs.writeFileSync(path.join(dir, 'units.log'), log);
  fs.writeFileSync(path.join(dir, 'native-exit.json'), JSON.stringify({ status: child.status,
    signal: child.signal, error: child.error ? String(child.error) : null }) + '\n');
  assert(!child.error && child.signal === null, name + ' completed natively');
  assert.equal(child.status, unsafe ? 1 : 0, name + ' native exit');
  assert.equal(fs.statSync(receipt).size, 0, name + ' empty offline receipt');
  assert(!/Unhandled\s+(?:Error|Rejection)|Vitest caught [1-9]|uncaughtException|unhandledRejection/i.test(log), name + ' no unhandled runtime error');
  const report = JSON.parse(fs.readFileSync(path.join(dir, 'units.json'), 'utf8'));
  assert.equal(report.testResults.length, 1, name + ' exact one test file');
  const rows = report.testResults.flatMap(r => r.assertionResults);
  assert.deepEqual(rows.map(r => r.fullName).sort(), [...spec.test.fullNames].sort(), name + ' exact five names');
  assert.equal(report.numPendingTests, 0); assert.equal(report.numTodoTests, 0);
  assert.equal(report.numPassedTests, unsafe ? 4 : 5); assert.equal(report.numFailedTests, unsafe ? 1 : 0);
  if (typeof report.numRuntimeErrors === 'number') assert.equal(report.numRuntimeErrors, 0, name + ' reporter runtime errors');
  for (const row of rows) {
    const fails = unsafe && row.fullName === spec.test.failedName;
    assert.equal(row.status, fails ? 'failed' : 'passed', row.fullName);
    if (fails) {
      const message = row.failureMessages.join('\n');
      assert(message.includes('AssertionError') && message.includes(spec.test.marker), name + ' exact controlled assertion');
    }
  }
  assert.deepEqual(fs.readdirSync(raw).sort(), [...spec.test.rawFiles].sort(), name + ' five RAW files emitted');
  const hashes = spec.test.rawFiles.map(file => {
    const bytes = fs.readFileSync(path.join(raw, file)), value = JSON.parse(bytes);
    assert.equal(value.case, path.basename(file, '.json')); assert(value.observations && typeof value.observations === 'object');
    return { file, sha256: sha(bytes) };
  });
  const ordinary = JSON.parse(fs.readFileSync(path.join(raw, 'ordinary.json'), 'utf8')).observations;
  const scalars = ordinary.scalarCourses;
  assert.deepEqual(scalars.map(row => row.value), spec.test.scalarValues, name + ' both scalar premises');
  for (const row of scalars) {
    assert.equal(row.wrote, true); assert.equal(row.scalarReadDraws, 0); assert.equal(row.afterRead, row.scalarBytes);
    const loaded = row.loadedScalar?.squad.find(p => p.id === row.input.squad.find(p => p.retraining === row.value)?.id);
    assert.equal(loaded?.retraining, row.value, name + ' real reader preserves scalar');
    if (unsafe) {
      const cause = "TypeError: Cannot use 'in' operator to search for 'paused' in " + row.value;
      assert.equal(row.tickError, cause, 'Actual unsafe tick in-operator TypeError');
      assert.equal(row.renderError, cause, 'Actual unsafe render in-operator TypeError');
      assert.equal(row.run, null); assert.equal(row.renderedRows, 0);
    } else {
      assert.equal(row.tickError, null); assert.equal(row.renderError, null);
      assert(row.run && row.run.state); assert.equal(row.renderedRows, 1);
    }
  }
  const admission = { name, nativeExit: child.status, passed: report.numPassedTests, failed: report.numFailedTests,
    runtimeErrors: report.numRuntimeErrors ?? 'UNKNOWN', raw: hashes,
    controlledCause: unsafe ? 'Both scalar tick/render in-operator TypeErrors and exact named AssertionError' : null };
  fs.writeFileSync(path.join(dir, 'admission.json'), JSON.stringify(admission, null, 2) + '\n');
  return admission;
}
let healthy, unsafe, failure;
try {
  healthy = run('healthy', false);
  const changed = spec.files.map(f => {
    const text = saved.get(f.path).toString('utf8');
    assert.equal(text.split(f.safeLiteral).length, 2, f.path + ' unique safe literal');
    const bytes = Buffer.from(text.replace(f.safeLiteral, f.unsafeLiteral));
    assert(!bytes.equals(saved.get(f.path)), f.path + ' physical control changes bytes');
    assert.equal(blob(bytes), f.unsafeGit); assert.equal(sha(bytes), f.unsafeSha256);
    assert.equal(bytes.toString('utf8').replace(f.unsafeLiteral, f.safeLiteral), text, f.path + ' whole inverse');
    return [f.path, bytes];
  });
  for (const [file, bytes] of changed) fs.writeFileSync(file, bytes);
  for (const f of spec.files) assert.equal(blob(fs.readFileSync(f.path)), f.unsafeGit, f.path + ' actual beta source');
  unsafe = run('unsafe-beta', true);
} catch (error) { failure = error; }
finally {
  for (const [file, bytes] of saved) fs.writeFileSync(file, bytes);
  checkSource();
  fs.writeFileSync(path.join(out, 'source-restoration.json'), JSON.stringify(spec.files.map(f => ({
    path: f.path, git: blob(fs.readFileSync(f.path)), sha256: sha(fs.readFileSync(f.path)), exactFixedBytes: true,
  })), null, 2) + '\n');
}
const restored = run('restored', false);
checkSource();
assert.equal(git('status', '--porcelain=v1', '--untracked-files=all').toString(), '');
git('diff', '--exit-code', 'HEAD');
if (healthy) assert.deepEqual(restored.raw, healthy.raw, 'All five restored RAW byte hashes, including full ordinary states/tapes');
if (failure) throw failure;
assert(healthy && unsafe);
const admission = { status: 'qualified', healthy: healthy.passed, unsafeOwnedFailures: unsafe.failed,
  restored: restored.passed, allRawByteEqualAfterRestore: true, exactSourceRestored: true,
  scope: spec.scope };
fs.writeFileSync(path.join(out, 'admission.json'), JSON.stringify(admission, null, 2) + '\n');
console.log(JSON.stringify(admission));
