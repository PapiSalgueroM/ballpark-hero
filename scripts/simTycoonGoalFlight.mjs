/* Actual Chromium component outcome proof and effective copied-source controls. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert(process.env.CI && process.env.GITHUB_ACTIONS, 'Goal flight verification runs only in remote GitHub Actions');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'tycoon-goal-flight-artifacts');
const DRIVER = 'scripts/qa/tycoonGoalFlight1087.mjs';
const PRODUCT = 'src/components/tycoon/TycoonPitch.tsx';
const BASE = '5b70b05f6df7b15f64b8c5ddf1f4b7d0c7cd4c7f';
fs.mkdirSync(path.join(OUT, 'copies'), { recursive: true });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const original = fs.readFileSync(path.join(ROOT, PRODUCT), 'utf8');
const hold = Object.fromEntries([PRODUCT, DRIVER, 'scripts/simTycoonGoalFlight.mjs', 'scripts/simTycoonPitch.mjs', 'scripts/simTycoonPitchRunner.mjs', 'src/test/tycoonPitch.test.tsx', 'src/lib/stadiumTycoon.ts', 'src/lib/leagueCore.ts', 'src/hooks/useStadiumTycoon.ts', 'package.json', 'package-lock.json'].map(file => [file, hash(fs.readFileSync(path.join(ROOT, file)))]));
const report = { complete: false, normalCases: 8, controls: [], runs: [], sourceBefore: hold, scope: 'Finite actual React component and unchanged-engine fixtures. The pinned old component remains a deliberately failing historical physical-flight reference.' };
const save = () => fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(report, null, 2));
function replaceOnce(text, from, to) {
  assert.equal(text.split(from).length - 1, 1, `Copied fault anchor is unique: ${from}`);
  const result = text.replace(from, to); assert.notEqual(result, text); return result;
}
function run(arm, component) {
  const args = [DRIVER, '--arm', arm]; if (component) args.push('--component', component);
  const r = spawnSync(process.execPath, args, { cwd: ROOT, env: process.env, encoding: 'utf8', timeout: 180000, maxBuffer: 20 * 1024 * 1024 });
  fs.writeFileSync(path.join(OUT, `${arm}.stdout.log`), r.stdout || ''); fs.writeFileSync(path.join(OUT, `${arm}.stderr.log`), r.stderr || '');
  const entry = { arm, status: r.status, signal: r.signal, error: r.error ? String(r.error) : null, stdoutHash: hash(r.stdout || ''), stderrHash: hash(r.stderr || '') };
  report.runs.push(entry); save();
  assert.equal(r.signal, null); assert.equal(r.error, undefined);
  const result = JSON.parse(fs.readFileSync(path.join(OUT, 'native', arm, 'report.json'), 'utf8'));
  entry.reportHash = hash(fs.readFileSync(path.join(OUT, 'native', arm, 'report.json')));
  assert.equal(result.complete, true, `${arm} completes every declared scenario`);
  assert.equal(result.runtimeError, undefined); assert.equal(result.sourceHoldError, undefined);
  assert.equal(result.cases.length, arm === 'normal' ? 8 : 2);
  assert.deepEqual(result.forwarded, []); assert.deepEqual(result.sockets, []);
  assert(result.cases.every(row => row.checks.filter(c => c.name.startsWith('baseline:')).every(c => c.pass)), `${arm} keeps all independent engine, save, RNG, geometry, input and queue baseline assertions`);
  assert.deepEqual(result.sourceBefore, result.sourceAfter); assert.deepEqual(result.buildBefore, result.buildAfter); assert.deepEqual(result.assetsBefore, result.assetsAfter);
  if (arm === 'normal') { assert.equal(r.status, 0); assert.deepEqual(result.failures, []); }
  else { assert.equal(r.status, 1); assert(result.failures.length > 0); assert(result.failures.every(f => f.type === 'AssertionError')); }
  return result;
}
try {
  const normal = run('normal');
  report.normalReportHash = report.runs[0].reportHash;
  const faults = [
    { name: 'no-restart', from: "key={replay ? `ball-${replay.id}` : 'ball-play'}", to: "key='ball-play'", allowed: ['flight:origin', 'flight:travel'], required: 'flight:origin' },
    { name: 'endpoint-only', from: 'animation: stShot 0.7s ease-in both;', to: 'animation: none;', allowed: ['flight:origin', 'flight:travel', 'flight:duration'], required: 'flight:travel' },
    { name: 'wrong-side', from: "const ball = ballAt === 'for' ? { x: 97, y: lane } : ballAt === 'against' ? { x: 3, y: lane } : idle;", to: "const ball = ballAt === 'for' ? { x: 3, y: lane } : ballAt === 'against' ? { x: 97, y: lane } : idle;", allowed: ['flight:travel', 'flight:destination', 'landing:immediate'], required: 'flight:destination' },
    { name: 'reduced-motion', from: 'const replay = reduce ? null : head;', to: 'const replay = head;', allowed: ['reduced:no-flight'], required: 'reduced:no-flight' },
  ];
  for (const fault of faults) {
    const changed = replaceOnce(original, fault.from, fault.to), file = path.join(OUT, 'copies', `${fault.name}.tsx`);
    fs.writeFileSync(file, changed);
    const row = { ...fault, originalHash: hash(original), copiedHash: hash(changed), path: path.relative(ROOT, file).replaceAll('\\', '/'), assertionFailures: [] };
    report.controls.push(row); save();
    assert.notEqual(row.originalHash, row.copiedHash); assert.equal(replaceOnce(changed, fault.to, fault.from), original, 'Exact reversal restores the complete original source');
    const result = run(fault.name, file); row.assertionFailures = result.failures;
    assert(result.failures.some(f => f.name === fault.required), `${fault.name} rejects its mapped actual outcome`);
    assert(result.failures.every(f => fault.allowed.includes(f.name)), `${fault.name} has only mapped assertion failures`);
    assert.deepEqual(result.engine, normal.engine, 'Fault never changes the independent engine fixture environment');
    assert.equal(hash(fs.readFileSync(path.join(OUT, 'native', fault.name, 'fixture.json'))), hash(fs.readFileSync(path.join(OUT, 'native', 'normal', 'fixture.json'))), 'Fault preserves the complete independently generated fixture');
    row.proved = true; save();
  }
  const historical = execFileSync('git', ['show', `${BASE}:${PRODUCT}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1024 * 1024 });
  const file = path.join(OUT, 'copies', 'historical.tsx'); fs.writeFileSync(file, historical);
  report.historical = { commit: BASE, originalBlob: execFileSync('git', ['rev-parse', `${BASE}:${PRODUCT}`], { cwd: ROOT, encoding: 'utf8' }).trim(), sha256: hash(historical), path: path.relative(ROOT, file).replaceAll('\\', '/') };
  const result = run('historical', file);
  assert(result.failures.some(f => f.name === 'flight:origin'), 'Pinned original component reproduces the physical replay-origin gap');
  assert(result.failures.every(f => f.name.startsWith('flight:')), 'Pinned original fails only the new physical-flight checks');
  assert.equal(hash(fs.readFileSync(path.join(OUT, 'native', 'historical', 'fixture.json'))), hash(fs.readFileSync(path.join(OUT, 'native', 'normal', 'fixture.json'))), 'Historical component shares the complete unchanged engine fixture');
  report.historical.assertionFailures = result.failures; report.historical.expectedFailureProved = true;
  report.complete = true;
} catch (error) { report.error = { name: error.name, message: error.message, stack: error.stack }; }
finally {
  report.sourceAfter = Object.fromEntries(Object.keys(hold).map(file => [file, hash(fs.readFileSync(path.join(ROOT, file)))]));
  try { assert.deepEqual(report.sourceAfter, hold); } catch (error) { report.complete = false; report.sourceHoldError = { name: error.name, message: error.message }; }
  save();
}
console.log(`simTycoonGoalFlight: ${report.complete ? 'PASS' : 'FAIL'}, ${report.controls.filter(c => c.proved).length}/4 effective copied controls; historical expected failure=${Boolean(report.historical?.expectedFailureProved)}.`);
process.exitCode = report.complete ? 0 : 1;
