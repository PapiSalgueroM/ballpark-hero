/* Remote finite page proof. The child retains actual state, pixels and copied faults. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
assert(process.env.CI, 'Run this verification only in remote CI');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'tycoon-ground-growth-artifacts');
fs.mkdirSync(out, { recursive: true });
const run = spawnSync(process.execPath, ['scripts/qa/tycoonGroundGrowth1094.mjs'], { cwd: root, env: process.env, encoding: 'utf8', timeout: 1_140_000, maxBuffer: 32 * 1024 * 1024 });
fs.writeFileSync(path.join(out, 'native-stdout.log'), run.stdout || '');
fs.writeFileSync(path.join(out, 'native-stderr.log'), run.stderr || '');
fs.writeFileSync(path.join(out, 'native-process.json'), JSON.stringify({ status: run.status, signal: run.signal, error: run.error ? { name: run.error.name, message: run.error.message } : null }, null, 2));
assert.equal(run.error, undefined); assert.equal(run.signal, null); assert.equal(run.status, 0, run.stderr);
const report = JSON.parse(fs.readFileSync(path.join(out, 'native/report.json'), 'utf8'));
assert.equal(report.complete, true); assert.equal(report.cases.length, 4); assert.equal(report.controls.length, 4);
const initialization = report.oracleInitialization;
assert.equal(initialization.complete, true); assert.equal(initialization.draws.length, 2);
assert(initialization.draws.every(draw => draw.caller === draw.expectedCaller));
assert.equal(initialization.emitted.actualCode, initialization.emitted.expectedCode);
assert.equal(initialization.source.sha256, report.sourceBefore[initialization.source.path]);
assert.deepEqual(report.oracleInitializationControls.map(row => [row.name, row.assertion, row.receipt.draws.length]), [
  ['extra-draw', 'Only two entity-ID epoch initialization draws', 3],
  ['wrong-caller', 'Initialization draw must originate at the exact emitted epoch call', 1],
]);
assert(report.oracleInitializationControls.every(row => row.complete && row.receipt.complete === false && row.receipt.error.name === 'AssertionError' && row.receipt.error.message.includes(row.assertion) && row.receipt.error.stack.includes('AssertionError')));
assert(report.cases.every(row => row.complete && row.stages.length === 5));
assert(report.controls.every(row => row.complete && row.failures.length === 1 && row.failures[0].assertion === row.expectedAssertion));
assert.equal(report.mounts.count, 44); assert.equal(report.mounts.screenshots, 70);
assert.deepEqual(report.errors, []); assert.deepEqual(report.sourceAfter, report.sourceBefore);
assert.deepEqual(report.buildAfter, report.buildBefore); assert.deepEqual(report.cacheAfter, report.cacheBefore);
console.log('Ground growth: four reduced-motion page journeys passed with paired original pages.');
console.log('First purchase, row boundary, maximum, attendance and unrelated upgrade retain actual geometry and pixels.');
console.log('Four exclusive copied faults caused their sole mapped AssertionError beside healthy baselines.');
console.log('Full state, save, callback, storage, RNG, transport and fixed-clock evidence retained.');
console.log('Original source, build and actual template font cache stayed byte-identical.');
