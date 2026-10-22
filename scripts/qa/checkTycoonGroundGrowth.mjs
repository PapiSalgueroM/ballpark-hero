/* Remote finite page proof. The child retains actual state, pixels and copied faults.
   Round 1531: this was scripts/simTycoonGroundGrowth.mjs, so runAllSims discovered it and ran it red every time: the
   walk needs a built dist (it serves dist/assets CSS), Chromium, and the template font cache that only
   `node scripts/qa/tycoonGroundGrowth1094.mjs --prefetch-assets-only` writes, which fetches Google Fonts and so can
   never run under the suite's offline transport. It lives beside its walk now and its workflow
   (.github/workflows/tycoon-ground-growth.yml) runs the build, the prefetch and then this, in that order.
   A missing input fails here first, by name, instead of as an ENOENT deep in the walk. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
assert(process.env.CI, 'Run this verification only in remote CI');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.join(root, 'tycoon-ground-growth-artifacts');
const distCss = path.join(root, 'dist/assets');
assert(fs.existsSync(distCss) && fs.readdirSync(distCss).some(file => file.endsWith('.css')), 'No built CSS in dist/assets: run npm run build (or vite build) first');
assert(fs.existsSync(path.join(out, 'asset-cache/manifest.json')), 'No font cache: run node scripts/qa/tycoonGroundGrowth1094.mjs --prefetch-assets-only first (it needs the network, so not under the offline transport)');
fs.mkdirSync(out, { recursive: true });
const run = spawnSync(process.execPath, ['scripts/qa/tycoonGroundGrowth1094.mjs'], { cwd: root, env: process.env, encoding: 'utf8', timeout: 1_140_000, maxBuffer: 32 * 1024 * 1024 });
fs.writeFileSync(path.join(out, 'native-stdout.log'), run.stdout || '');
fs.writeFileSync(path.join(out, 'native-stderr.log'), run.stderr || '');
fs.writeFileSync(path.join(out, 'native-process.json'), JSON.stringify({ status: run.status, signal: run.signal, error: run.error ? { name: run.error.name, message: run.error.message } : null }, null, 2));
assert.equal(run.error, undefined); assert.equal(run.signal, null); assert.equal(run.status, 0, run.stderr);
const report = JSON.parse(fs.readFileSync(path.join(out, 'native/report.json'), 'utf8'));
assert.equal(report.complete, true); assert.equal(report.cases.length, 4); assert.equal(report.controls.length, 4);
const initialization = report.oracleInitialization;
const epochDraws = report.epochDraws; assert(Number.isInteger(epochDraws) && epochDraws >= 1, 'The walk read the epoch draw count from source');
assert.equal(initialization.complete, true); assert.equal(initialization.draws.length, epochDraws);
assert(initialization.draws.every(draw => draw.caller === draw.expectedCaller));
assert.equal(initialization.emitted.actualCode, initialization.emitted.expectedCode);
assert.equal(initialization.source.sha256, report.sourceBefore[initialization.source.path]);
assert.deepEqual(report.oracleInitializationControls.map(row => [row.name, row.assertion, row.receipt.draws.length]), [
  ['extra-draw', `Only ${epochDraws} entity-ID epoch initialization draws`, epochDraws + 1],
  ['wrong-caller', 'Initialization draw must originate at the exact emitted epoch call', 1],
]);
assert(report.oracleInitializationControls.every(row => row.complete && row.receipt.complete === false && row.receipt.error.name === 'AssertionError' && row.receipt.error.message.includes(row.assertion) && row.receipt.error.stack.includes('AssertionError')));
assert(report.cases.every(row => row.complete && row.stages.length === 5));
assert(report.controls.every(row => row.complete && row.failures.length === 1 && row.failures[0].assertion === row.expectedAssertion));
assert.equal(report.clockControl.name, 'extra-clock-millisecond'); assert.equal(report.clockControl.complete, true);
assert.equal(report.clockControl.assertion, 'Declared 128ms clock advance'); assert.equal(report.clockControl.error.name, 'AssertionError');
assert(report.clockControl.error.message.includes(report.clockControl.assertion) && report.clockControl.error.stack.includes('AssertionError'));
assert.equal(report.clockControl.clocks.actual.performance, 129); assert.equal(report.clockControl.clocks.baseline.performance, 128);
assert.equal(report.clockControl.clocks.actual.now - report.clockControl.clocks.baseline.now, 1);
assert.equal(report.mounts.count, 45); assert.equal(report.mounts.regularCount, 44); assert.equal(report.mounts.setupCount, 1); assert.equal(report.mounts.screenshots, 70);
assert.deepEqual(report.errors, []); assert.deepEqual(report.sourceAfter, report.sourceBefore);
assert.deepEqual(report.buildAfter, report.buildBefore); assert.deepEqual(report.cacheAfter, report.cacheBefore);
assert(/^(checked|skipped): /.test(report.commitScope ?? ''), 'The walk says whether it checked the PR183 commit scope');
console.log(`PR183 commit scope ${report.commitScope}.`);
console.log('Ground growth: four reduced-motion page journeys passed with paired original pages.');
console.log('First purchase, row boundary, maximum, attendance and unrelated upgrade retain actual geometry and pixels.');
console.log('Four exclusive copied faults caused their sole mapped AssertionError beside healthy baselines.');
console.log('Full state, save, callback, storage, RNG, transport and fixed-clock evidence retained.');
console.log('Original source, build and actual template font cache stayed byte-identical.');
