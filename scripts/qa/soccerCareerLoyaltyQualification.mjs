import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';

const ROOT = process.cwd(), BASE = '12c1b2cd001f9309a31a887e5c432ca63c373852';
const META = path.join(ROOT, 'qa/soccer-career-loyalty-v2.1');
const OUT = path.join(ROOT, 'loyalty-artifacts/proof');
const MANIFEST_PIN = '3ea2b473d7ac00ee36bfff7b5c67a7d9276d82d3abc0bae721947095f8dd88f0';
const TESTS = ['src/test/soccerCareerLoyalty.test.ts', 'src/test/soccerCareerLoyalty.engine.test.ts', 'src/test/soccerCareerLoyalty.review.test.tsx'];
const INDEPENDENT = 'keeps cash and absent legacy ledgers neutral';
const sha = body => createHash('sha256').update(body).digest('hex');
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value, null, 2));
};
assert(process.env.CI === '1' && process.env.SIM_NETWORK === 'offline', 'Remote offline qualification only');
fs.mkdirSync(OUT, { recursive: true });
const manifestBody = fs.readFileSync(path.join(META, 'SOURCE-READY.json'));
assert.equal(sha(manifestBody), MANIFEST_PIN, 'Selected source manifest');
const manifest = JSON.parse(manifestBody), faults = json(path.join(META, 'SOURCE-FAULTS.json')).controls;
assert.equal(manifest.sourceRef, BASE); assert.equal(faults.length, 10);
assert.equal(sha(fs.readFileSync(path.join(META, 'SOURCE-FAULTS.json'))), manifest.receipts.faultManifestSha256);
for (const file of manifest.files) assert.equal(sha(fs.readFileSync(path.join(ROOT, file.path))), file.sha256, 'Selected body: ' + file.path);
for (const file of ['package.json', 'package-lock.json']) {
  assert.equal(sha(fs.readFileSync(path.join(ROOT, file))), sha(execFileSync('git', ['show', BASE + ':' + file], { cwd: ROOT })), 'Dependency source held: ' + file);
}
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter(Boolean);
const sourceHashes = () => Object.fromEntries(tracked.map(file => [file, sha(fs.readFileSync(path.join(ROOT, file)))]));
const sourceBefore = sourceHashes();
write(path.join(OUT, 'source-before.json'), sourceBefore);
write(path.join(OUT, 'dependencies.json'), { node: process.version, lock: sourceBefore['package-lock.json'], package: sourceBefore['package.json'], vitest: json(path.join(ROOT, 'node_modules/vitest/package.json')).version });
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-loyalty-proof-'));
const baseline = path.join(temp, 'baseline'), controlled = path.join(temp, 'controlled');
function exportTree(ref, target) {
  fs.mkdirSync(target);
  const archive = execFileSync('git', ['archive', '--format=tar', ref], { cwd: ROOT, maxBuffer: 256 * 1024 * 1024 });
  const unpack = spawnSync('tar', ['-xf', '-', '-C', target], { input: archive });
  assert.equal(unpack.status, 0, 'Export exact tree: ' + ref);
  fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(target, 'node_modules'), 'dir');
}
const offline = { ...process.env, NODE_OPTIONS: '--require=' + path.join(ROOT, 'scripts/lib/offlineTransport.cjs') };
const summary = { base: BASE, sourceManifest: MANIFEST_PIN, baseline: null, fixed: null, controls: [], complete: false };
function run(label, cwd, args, extra = {}) {
  const result = spawnSync(process.execPath, args, { cwd, env: { ...offline, ...extra }, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  write(path.join(OUT, label + '.log'), (result.stdout || '') + (result.stderr || ''));
  write(path.join(OUT, label + '-exit.json'), { status: result.status, signal: result.signal, error: result.error?.message });
  assert(!result.error && !result.signal && Number.isInteger(result.status), 'Process completed: ' + label);
  return result.status;
}
function cases(report) {
  assert(Array.isArray(report.testResults) && report.testResults.length > 0);
  assert(report.testResults.every(file => Array.isArray(file.assertionResults) && file.assertionResults.length > 0), 'Every file reaches assertions');
  return report.testResults.flatMap(file => file.assertionResults).filter(row => ['passed', 'failed'].includes(row.status));
}
function assertionFailure(row) {
  const text = (row.failureMessages || []).join('\n');
  assert(/AssertionError|expected .*to |to (?:be|equal|deeply)/i.test(text), 'Owned assertion: ' + row.fullName);
  assert(!/ReferenceError:|TypeError:|SyntaxError:|Failed to resolve import|Cannot find module|Test timed out/.test(text), 'No method/setup error: ' + row.fullName);
}
function noInfrastructure(report, output) {
  const plain = output.replace(/\u001b\[[0-9;]*m/g, '');
  assert(Array.isArray(report.testResults) && report.testResults.length > 0);
  assert(report.testResults.every(file => typeof file.message === 'string' && file.message === ''), 'No suite/setup/afterAll diagnostics');
  assert(!/Unhandled Errors|Unhandled Rejection|Uncaught Exception|Unhandled Source Error|Vitest caught \d+ unhandled|unhandled errors during test collection|Failed Suites|^\s*Errors\s+\d+\s+errors?\b|Some tests are still running when generating the JSON report/im.test(plain), 'No unhandled or collection diagnostics');
  assert(/^\s*Test Files\s+/m.test(plain) && /^\s*Tests\s+/m.test(plain) && /JSON report written to /.test(plain), 'Actual completed CLI and JSON reporter output');
  const assertions = report.testResults.flatMap(file => file.assertionResults || []);
  assert.equal(assertions.length, report.numTotalTests, 'Every collected test has a retained assertion record');
}
function diagnosticControls(result) {
  const original = JSON.stringify(result.report), log = result.log;
  const changed = JSON.parse(original);
  changed.testResults[0].message = 'Owned diagnostic control: afterAll failure';
  write(path.join(OUT, 'diagnostic-suite-report.json'), changed);
  assert.notEqual(sha(JSON.stringify(changed)), sha(original));
  assert.throws(() => noInfrastructure(changed, log), /No suite\/setup\/afterAll diagnostics/);
  const badLog = log + '\nUnhandled Errors\nVitest caught 1 unhandled error during the test run.\nUnhandled Rejection\nError: Owned diagnostic control\n     Errors  1 error\n';
  write(path.join(OUT, 'diagnostic-unhandled.log'), badLog);
  assert.notEqual(sha(badLog), sha(log));
  assert.throws(() => noInfrastructure(result.report, badLog), /No unhandled or collection diagnostics/);
  assert.equal(JSON.stringify(result.report), original);
  noInfrastructure(result.report, log);
  const controls = [
    { name: 'suite-message', changed: sha(JSON.stringify(changed)), original: sha(original), rejected: true },
    { name: 'unhandled-cli', changed: sha(badLog), original: sha(log), rejected: true },
  ];
  write(path.join(OUT, 'diagnostic-controls.json'), { controls, actualAssertionRowsHeld: result.report.numTotalTests, independentOriginalAccepted: true });
  return controls;
}
function unit(label, cwd, pattern) {
  const reportFile = path.join(OUT, label + '.json');
  const args = [path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', ...TESTS,
    '--maxWorkers=1', '--no-file-parallelism', '--reporter=verbose', '--reporter=json', '--outputFile.json=' + reportFile];
  if (pattern) args.push('--testNamePattern', pattern);
  const status = run(label, cwd, args), report = json(reportFile);
  const log = fs.readFileSync(path.join(OUT, label + '.log'), 'utf8');
  noInfrastructure(report, log);
  return { status, report, rows: cases(report), log };
}
const escape = text => text.replace(/[.*+?^\x24{}()|[\]\\]/g, '\\$&');
function green(result, count) {
  assert.equal(result.status, 0); assert.equal(result.rows.length, count);
  assert(result.rows.every(row => row.status === 'passed')); assert.equal(result.report.numFailedTests, 0);
}
function preservation(label, override, explicitOutput = true) {
  const out = path.join(OUT, label);
  const before = fs.existsSync(path.join(ROOT, '.sim-artifacts')) ? fs.readdirSync(path.join(ROOT, '.sim-artifacts')) : [];
  const env = {};
  if (explicitOutput) env.SC_LOYALTY_ARTIFACTS = out;
  else { env.SC_LOYALTY_ARTIFACTS = ''; env.SC_LOYALTY_ENGINE_CANDIDATE = ''; env.SC_LOYALTY_MODULE_CANDIDATE = ''; }
  if (override) env.SC_LOYALTY_ENGINE_CANDIDATE = override;
  const status = run(label, ROOT, ['scripts/simSoccerCareerLoyalty.mjs'], env);
  if (!explicitOutput) {
    const fresh = fs.readdirSync(path.join(ROOT, '.sim-artifacts')).filter(name => !before.includes(name) && name.startsWith('soccer-loyalty-'));
    assert.equal(fresh.length, 1, 'One ordinary default output folder');
    fs.cpSync(path.join(ROOT, '.sim-artifacts', fresh[0]), out, { recursive: true });
  }
  const report = json(path.join(out, 'report.json'));
  assert.equal(report.sourceHeld, true); assert.deepEqual(report.boot.candidate, report.boot.original);
  return { status, report, out };
}
function preserved(result) {
  assert.equal(result.status, 0); assert.equal(result.report.complete, true);
  assert.equal(result.report.cases.length, 60); assert.deepEqual(result.report.requests, []);
  assert(result.report.cases.every(row => row.completeDataEqual && row.savedBytesEqual && row.drawsEqual && row.nextDrawEqual));
}
try {
  exportTree(BASE, baseline);
  for (const file of ['src/lib/soccerCareerLoyalty.ts', ...TESTS]) {
    const target = path.join(baseline, file);
    assert(!fs.existsSync(target), 'Baseline adds only new module/test: ' + file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(ROOT, file), target);
  }
  assert.equal(run('baseline-types', baseline, [path.join(ROOT, 'node_modules/typescript/bin/tsc'), '--noEmit', '-p', 'tsconfig.app.json']), 0);
  const red = unit('baseline', baseline);
  assert.equal(red.status, 1); assert.equal(red.rows.length, 39);
  const passed = red.rows.filter(row => row.status === 'passed'), failed = red.rows.filter(row => row.status === 'failed');
  assert.equal(passed.length, 18); assert.equal(failed.length, 21);
  assert.equal(failed.filter(row => row.fullName.startsWith('actual Soccer Career loyalty integration ')).length, 17);
  assert.equal(failed.filter(row => row.fullName.startsWith('actual loyalty contract review ')).length, 4);
  assert.equal(passed.filter(row => row.fullName.startsWith('actual loyalty contract review ')).length, 1);
  for (const row of failed) assertionFailure(row);
  summary.baseline = { total: 39, passed: 18, failed: 21, causeQualified: true, failedNames: failed.map(row => row.fullName) };
  write(path.join(OUT, 'baseline-qualified.json'), summary.baseline);
  summary.diagnosticControls = diagnosticControls(red);
  assert.equal(run('fixed-types', ROOT, ['node_modules/typescript/bin/tsc', '--noEmit', '-p', 'tsconfig.app.json']), 0);
  green(unit('fixed', ROOT), 39);
  preserved(preservation('default-preservation'));
  summary.fixed = { cases: 39, defaultPairs: 60 };
  exportTree('HEAD', controlled);
  for (const fault of faults) {
    const target = path.join(controlled, fault.file), original = fs.readFileSync(target, 'utf8');
    assert.equal(original.split(fault.from).length - 1, 1, 'Unique physical anchor: ' + fault.name);
    const mutated = original.replace(fault.from, fault.to);
    assert.notEqual(sha(mutated), sha(original));
    write(path.join(OUT, 'controls', fault.name, path.basename(fault.file)), mutated);
    write(path.join(OUT, 'controls', fault.name, 'mutation.json'), { ...fault, offset: original.indexOf(fault.from), originalSha256: sha(original), mutatedSha256: sha(mutated) });
    fs.writeFileSync(target, mutated);
    let observation;
    try {
      if (fault.harness) {
        const bad = preservation('control-' + fault.name, target);
        assert.equal(bad.status, 1); assert.equal(bad.report.complete, false);
        assert.equal(bad.report.failure.name, 'AssertionError');
        const witnesses = fs.readdirSync(bad.out).filter(name => name !== 'report.json' && name.endsWith('.json')).map(name => json(path.join(bad.out, name)));
        assert(witnesses.length > 0);
        assert(witnesses.some(row => row.candidate.draws !== row.original.draws && row.candidate.nextDraw !== row.original.nextDraw), 'Real shared-stream fault observed');
        green(unit('control-' + fault.name + '-independent', controlled, escape(INDEPENDENT)), 1);
        observation = { actualPreservationFailure: bad.report.failure, witnessCount: witnesses.length, independentPass: 1 };
      } else {
        const result = unit('control-' + fault.name, controlled, escape(fault.test) + '|' + escape(INDEPENDENT));
        assert.equal(result.status, 1); assert.equal(result.rows.length, 2);
        const bad = result.rows.filter(row => row.status === 'failed'), good = result.rows.filter(row => row.status === 'passed');
        assert.equal(bad.length, 1); assert.equal(good.length, 1);
        assert(bad[0].fullName.endsWith(fault.test)); assert(good[0].fullName.endsWith(INDEPENDENT));
        assertionFailure(bad[0]);
        observation = { mappedFailure: bad[0].fullName, independentPass: good[0].fullName };
      }
    } finally {
      fs.writeFileSync(target, original);
      assert.equal(sha(fs.readFileSync(target)), sha(original), 'Restore copied source: ' + fault.name);
    }
    if (fault.harness) preserved(preservation('restored-' + fault.name, target));
    else green(unit('restored-' + fault.name, controlled, escape(fault.test) + '|' + escape(INDEPENDENT)), 2);
    summary.controls.push({ name: fault.name, ...observation, restored: true });
    write(path.join(OUT, 'controls-summary.json'), summary.controls);
  }
  assert.equal(summary.controls.length, 10);
  preserved(preservation('ordinary-default', null, false));
  summary.complete = true;
  console.log('Loyalty: actual old-app baseline39,18pass/21owned failures; fixed39green.');
  console.log('Loyalty: 60actual default career/save/state/RNG pairs held.');
  console.log('Loyalty: all10physical faults rejected with independent healthy cases and source restoration.');
  console.log('Loyalty: ordinary no-special-env default completed60pairs.');
} finally {
  const after = sourceHashes();
  write(path.join(OUT, 'source-after.json'), after);
  summary.sourceHeld = JSON.stringify(after) === JSON.stringify(sourceBefore);
  write(path.join(OUT, 'summary.json'), summary);
  assert.deepEqual(after, sourceBefore, 'Canonical tracked sources held');
  assert.equal(path.dirname(temp), path.resolve(os.tmpdir()));
  assert(path.basename(temp).startsWith('sc-loyalty-proof-'));
  fs.rmSync(temp, { recursive: true, force: true });
}
