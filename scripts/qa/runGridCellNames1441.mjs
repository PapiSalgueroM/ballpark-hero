/* Remote grid cell name evidence after the unchanged common gates. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const root = process.cwd(), out = process.env.GRID_CELL_NAMES_OUT, mode = process.env.GRID_CELL_NAMES_MODE;
const PINS = { test: 'bff0d6ff1be6f8505da7acda918f08d60d34253215a4ba45e871064bc349825e', unit: '4e994e83515c344784d224433cfc8cc2879ec963ba7312b7dd12cd3d62e69f1f', browser: '278780c453095ffd2370f04ea10a3737d3d05e4b3b203896999e9797fdff21eb' };
const UNIT = 'scripts/simGridCellNames.mjs', TEST = 'src/test/gridCellNames.test.tsx', BROWSER = 'scripts/qa/playGridCellNames1441.mjs';
const LEGACY_PINS = [{"file":"scripts/simGridCellMotion.mjs","sha256":"f1078288d3672e879d9d09d728c6fbc91e3824fc6929db4a43e784fde1b171e2"},{"file":"scripts/simGridCellLayout.mjs","sha256":"b7aaa19a722581905b072ffa32fdc70434db0e6c5e7e227a48d037636726940b"},{"file":"scripts/playGridCellGeometry.mjs","sha256":"8c3b3b4071c43dd0a54c5aaaf0c8e691838f8496f3ad9fdb6878f630ce5e39ea"},{"file":"src/test/gridCellMotion.test.tsx","sha256":"3ba6624fb5bd5de167a774f5576a2691868033418a6bd5c35f3b533ec06c9b89"},{"file":"src/test/gridCellLayout.test.tsx","sha256":"9629074fb1fd4069eb9dc68a84985dc8236b764e891066837cbcf4465f7de21a"},{"file":"src/components/game/GridCellMotion.module.css","sha256":"11033c522f6d20d4ef4b47e13e4fc5e0695d361feda3557834d2de9936f02b77"},{"file":"src/components/game/GridCellLayout.module.css","sha256":"526c365faf8ab5d656c3bf573d6cf38d20b20841c56cc84658eb1fcb5585f1d6"},{"file":"scripts/sweepWeight.mjs","sha256":"21a8658ff9ce03eeaa0d3b48a7d5e308d49e5267f3ec4c688b13873bae65b7e7"}];
const arms = ['normal', 'whole-original', 'prefix-football', 'prefix-soccer', 'icons-football', 'icons-soccer', 'column-rotation-football', 'column-rotation-soccer', 'restored'];
const unitFaults = [0, 15, 10, 5, 8, 4, 10, 5, 0], browserFaults = [0, 42, 28, 14, 20, 10, 28, 14, 0];
const readers = ['simAdsense', 'simBrand', 'simHeadTags', 'simHiddenPages', 'simHubs', 'simIndexNow', 'simIndexing', 'simInternalLinks', 'simNoRivalNames', 'simPrerender', 'simPrerenderBoot', 'simRetiredRoutes', 'simSchema', 'simSitemap', 'simSnapshotAssets', 'simGuideHeadings', 'simSiteSearch'];
const caps = [['/', 244], ['/club-manager', 619], ['/soccer-career', 835], ['/stadium-tycoon', 303], ['/wonderkid-factory', 277], ['/minefield', 295], ['/footle', 354], ['/nfl-my-career', 491], ['/front-office', 374], ['/soccer-grid', 319], ['/leaderboard', 266], ['/manager-hot-seat', 636], ['/deadline-day', 646], ['/transfer-path', 379]];
const hash = value => createHash('sha256').update(value).digest('hex');
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const pin = file => { const body = fs.readFileSync(file); return { file, bytes: body.length, sha256: hash(body) }; };
const assertPin = row => { assert.deepEqual(pin(row.file), row, 'Actual full physical input pin'); };
const empty = file => { assert(fs.existsSync(file)); assert.equal(fs.statSync(file).size, 0, 'Present empty ordinary transport receipt'); };
const contained = (parent, file) => { const relative = path.relative(parent, file); return relative === '' || !relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative); };
assert.equal(process.platform, 'linux', 'This evidence runs only on the remote Linux runner');
assert.equal(process.argv.length, 2); assert(['baseline', 'fixed'].includes(mode));
assert(['1', 'true'].includes(process.env.CI)); assert.equal(process.env.SIM_NETWORK, 'offline');
assert(out && path.isAbsolute(out) && !contained(root, out));
for (const value of Object.values(PINS)) assert.match(value, /^[0-9a-f]{64}$/, 'All proof sources must be concretely reviewed and pinned');
const require = createRequire(path.join(root, 'package.json'));
assert(require.cache[require.resolve('./scripts/lib/offlineTransport.cjs')], 'Ordinary offline preload installed');
assert.equal(process.env.NODE_OPTIONS, '--require=' + path.join(root, 'scripts/lib/offlineTransport.cjs'));
empty(process.env.SIM_OFFLINE_RECEIPT);
for (const name of ['NO_DOUBLE_SWAP', 'GRID_CELL_NAMES_TRACE', 'GRID_CELL_NAMES_PLAN', 'GRID_CELL_NAMES_PLAN_SHA256', 'GRID_CELL_MOTION_CONTROL', 'GRID_CELL_LAYOUT_CONTROL', 'GRID_GEOMETRY_CONTROL']) assert(!Object.hasOwn(process.env, name), 'No inherited source or proof override: ' + name);
for (const [file, expected] of [[TEST, PINS.test], [UNIT, PINS.unit], [BROWSER, PINS.browser], ...LEGACY_PINS.map(row => [row.file, row.sha256])]) assert.equal(hash(fs.readFileSync(path.join(root, file))), expected, 'Exact reviewed source: ' + file);
const readProcess = file => { const text = fs.readFileSync(file, 'utf8'); const statuses = [...text.matchAll(/^status=(\d+)$/gm)]; assert.equal(statuses.length, 1); assert.equal(statuses[0][1], '0'); return { pin: pin(file), text }; };
const types = readProcess(path.join(out, 'types.process.txt')), build = readProcess(path.join(out, 'build.process.txt')), weights = readProcess(path.join(out, 'weights.process.txt'));
assert(types.text.includes('command=node_modules/.bin/tsc --noEmit -p tsconfig.app.json\n'));
assert(build.text.includes('command=npm run build\n'));
const readerRows = ['readers.tsv', 'extras-readers.tsv'].flatMap(file => fs.readFileSync(path.join(out, file), 'utf8').trim().split('\n').map(line => line.split('\t')));
assert.deepEqual(readerRows.map(row => row[0]), readers); assert(readerRows.every(row => row.length === 2 && row[1] === '0'));
const readerEvidence = readers.map(name => { const log = path.join(out, 'readers', name + '.log'), processFile = path.join(out, 'readers', name + '.process.txt'); const body = fs.readFileSync(log, 'utf8'); assert.equal(body.split('\n').filter(line => line === 'All 1 harnesses green.').length, 1); assert(!/SIM_OFFLINE_BLOCK|Unhandled\s+(Errors?|Rejections?)|SKIPPED, not run and not counted/.test(body)); empty(path.join(out, 'readers', name + '.transport')); readProcess(processFile); return { name, log: pin(log), process: pin(processFile) }; });
const observedCaps = fs.readFileSync(path.join(out, 'weights-observed.tsv'), 'utf8').trim().split('\n').map(line => { const [route, cap] = line.split('\t'); return [route, Number(cap)]; });
assert.deepEqual(observedCaps, caps); assert.equal(fs.readFileSync(path.join(out, 'weights-expected.tsv'), 'utf8'), fs.readFileSync(path.join(out, 'weights-observed.tsv'), 'utf8'));
assert(fs.readFileSync(path.join(out, 'weights.log'), 'utf8').split('\n').includes('sweepWeight: green. Every page is inside its budget, and the budgets came down this round.'));
assert(fs.readFileSync(path.join(root, 'scripts/sweepWeight.mjs')).equals(fs.readFileSync(path.join(out, 'original-sweepWeight.mjs'))));
const verifyManifest = file => { const rows = fs.readFileSync(file, 'utf8').trimEnd().split('\n'); assert(rows.length > 0); for (const row of rows) { const match = /^([0-9a-f]{64}) [ *](.+)$/.exec(row); assert(match, 'Complete hash manifest row'); const target = path.isAbsolute(match[2]) ? match[2] : path.join(root, match[2]); assert.equal(hash(fs.readFileSync(target)), match[1], 'Held member: ' + match[2]); } return rows.length; };
const sourceManifest = path.join(out, 'source-files.sha256'), distManifest = path.join(out, 'dist-files.sha256');
const sourceFiles = verifyManifest(sourceManifest), distFiles = verifyManifest(distManifest);
const commonFiles = ['head.txt', 'tree.txt', 'source.zip', 'source-boundary.log', 'source-files.sha256', 'dist-files.sha256', 'dist.zip', 'installed-input-manifests.sha256', 'dependencies-before.json', 'dependencies-after.json', 'weights-observed.tsv', 'weights-expected.tsv'];
const commonPins = commonFiles.map(file => pin(path.join(out, file)));
write(path.join(out, 'common-before-focused.json'), { status: 'passed', mode, head: fs.readFileSync(path.join(out, 'head.txt'), 'utf8').trim(), tree: fs.readFileSync(path.join(out, 'tree.txt'), 'utf8').trim(), types, build, weights, readers: readerEvidence, caps, sourceFiles, distFiles, pins: commonPins, scope: 'Full common admitted before focused dispatch. Final dependency/source/dist/transport holds remain required after this runner.' });
const inherited = [], invocations = [], defaults = [];
let completed = null;
function child(script, args, name, additions = {}) {
  const transport = path.join(out, name + '.transport'); fs.writeFileSync(transport, '', { flag: 'wx' });
  const env = { ...process.env, ...additions, SIM_OFFLINE_RECEIPT: transport, NO_COLOR: '1', FORCE_COLOR: '0' };
  delete env.GRID_CELL_NAMES_MODE; delete env.GRID_CELL_NAMES_OUT;
  const command = [path.join(root, script), ...args], started = new Date().toISOString();
  const result = spawnSync(process.execPath, command, { cwd: root, env, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024, timeout: 1200000 });
  const stdout = path.join(out, name + '.stdout.log'), stderr = path.join(out, name + '.stderr.log'); fs.writeFileSync(stdout, result.stdout || '', { flag: 'wx' }); fs.writeFileSync(stderr, result.stderr || '', { flag: 'wx' });
  const record = { name, executable: process.execPath, arguments: command, cwd: root, pid: result.pid, started, finished: new Date().toISOString(), status: result.status, signal: result.signal, error: result.error ? String(result.error) : null, source: pin(path.join(root, script)), stdout: pin(stdout), stderr: pin(stderr), transport: pin(transport), modeAbsent: !Object.hasOwn(env, 'GRID_CELL_NAMES_MODE'), outAbsent: !Object.hasOwn(env, 'GRID_CELL_NAMES_OUT') };
  const processFile = path.join(out, name + '.process.json'); write(processFile, record); invocations.push(pin(processFile));
  assert.ifError(result.error); assert.equal(result.signal, null); assert([0, 1].includes(result.status)); empty(transport);
  return { result, record, processFile };
}
function verifyUnit(directory, strictOriginalDefault = false) {
  const reportFile = path.join(directory, 'report.json'), report = json(reportFile), baseline = mode === 'baseline';
  assert.equal(report.status, strictOriginalDefault ? 'failed-purpose' : 'passed'); assert.equal(report.sourceStage, baseline ? 'original' : 'fixed');
  assert.equal(report.productQualified, false); assert.equal(report.testSha256, PINS.test); assert.equal(report.producerSha256, PINS.unit);
  assert.deepEqual(report.arms.map(arm => arm.arm), baseline ? ['normal'] : arms);
  assert.deepEqual(report.arms.map(arm => arm.failed), baseline ? [15] : unitFaults);
  assert.equal(report.totals.uniqueCases, 21); assert.equal(report.totals.caseExecutions, baseline ? 21 : 189); assert.equal(report.totals.healthyExecutions, baseline ? 6 : 132); assert.equal(report.totals.purposeFaults, baseline ? 15 : 57);
  assert.equal(report.cleanup.copiesRemoved, true); assert(Object.values(report.holds).every(value => value === true));
  const originalRoot = report.evidenceRoot, remap = file => contained(originalRoot, file) ? path.join(directory, path.relative(originalRoot, file)) : file;
  for (const arm of report.arms) {
    assert.equal(arm.cases, 21); const raw = json(remap(arm.vitest.file)), cases = raw.testResults.flatMap(row => row.assertionResults);
    assert.equal(cases.length, 21); assert.equal(raw.numPendingTests, 0); assert.equal(raw.numUnhandledErrors ?? 0, 0); assert.equal(cases.filter(row => row.status === 'failed').length, arm.failed); assert.equal(cases.filter(row => row.status === 'passed').length, arm.passed);
    for (const property of ['vitest', 'trace', 'process', 'stdout', 'stderr', 'transport']) { const wanted = arm[property]; const actual = pin(remap(wanted.file)); assert.equal(actual.bytes, wanted.bytes); assert.equal(actual.sha256, wanted.sha256); }
    assert.equal(arm.status, strictOriginalDefault ? 'failed-purpose' : 'passed');
  }
  if (strictOriginalDefault) { const failure = json(path.join(directory, 'failure.json')); assert.equal(failure.setupOrProtocolFailure, false); assert.equal(failure.actualCaseExecutions, 21); }
  return { reportFile, report, pin: pin(reportFile) };
}
function verifyBrowser(directory, strictOriginalDefault = false) {
  const reportFile = path.join(directory, 'report.json'), report = json(reportFile), baseline = mode === 'baseline';
  assert.equal(report.status, strictOriginalDefault ? 'failed-purpose' : 'passed'); assert.equal(report.productQualified, false); assert.equal(report.sourceStage, baseline ? 'original' : 'fixed');
  assert.equal(report.producer.sha256, PINS.browser); assert.deepEqual(report.arms.map(arm => arm.arm), baseline ? ['normal'] : arms);
  assert.deepEqual(report.armFaultVector, baseline ? [42] : browserFaults);
  assert.equal(report.caseCount, baseline ? 48 : 432); assert.equal(report.passedCount, baseline ? 6 : 276); assert.equal(report.expectedFaultCount, strictOriginalDefault ? 0 : baseline ? 42 : 156); assert.equal(report.unexpectedCount, strictOriginalDefault ? 42 : 0);
  for (const arm of report.arms) { assert.equal(arm.caseCount, 48); assert.equal(arm.caseCount, arm.passedCount + arm.expectedFaultCount + arm.unexpectedCount); }
  return { reportFile, report, pin: pin(reportFile) };
}
function census(directory) {
  const rows = []; const walk = relative => { for (const entry of fs.readdirSync(path.join(directory, relative), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) { const next = path.join(relative, entry.name), file = path.join(directory, next), stats = fs.lstatSync(file, { bigint: true }); assert(!stats.isSymbolicLink(), 'Evidence contains no symlink'); if (stats.isDirectory()) { rows.push({ relative: next, type: 'directory', mtimeNs: String(stats.mtimeNs) }); walk(next); } else { assert(stats.isFile()); rows.push({ relative: next, type: 'file', bytes: Number(stats.size), sha256: hash(fs.readFileSync(file)), mtimeNs: String(stats.mtimeNs) }); } } }; walk(''); return rows;
}
function retainDefault(run, kind) {
  const prefix = kind === 'unit' ? 'GRID_CELL_NAMES_STARTED ' : 'GRID_CELL_NAMES_BROWSER_STARTED ';
  const starts = (run.result.stdout || '').split('\n').filter(line => line.startsWith(prefix)); assert.equal(starts.length, 1, 'One actual child start record');
  const start = JSON.parse(starts[0].slice(prefix.length)); assert.equal(start.pid, run.record.pid); assert.equal(start.mode, 'fixed'); assert.equal(start.producerSha256, PINS[kind === 'unit' ? 'unit' : 'browser']); assert.deepEqual(start.defaultInvocation, { modeAbsent: true, outAbsent: true, noArguments: true });
  const original = path.resolve(start.evidenceRoot), tempRoot = path.resolve(os.tmpdir()); assert.equal(path.dirname(original), tempRoot); assert(path.basename(original).startsWith(kind === 'unit' ? 'grid-cell-names-evidence-' : 'grid-cell-names-browser-')); assert(!contained(root, original) && !contained(out, original));
  const before = census(original), retained = path.join(out, 'default-' + kind); assert(!fs.existsSync(retained)); fs.cpSync(original, retained, { recursive: true, force: false, errorOnExist: true, preserveTimestamps: true });
  const after = census(original), copied = census(retained); assert.deepEqual(after, before, 'Whole original default tree unchanged during copy');
  const logical = rows => rows.map(({ mtimeNs, ...row }) => row); assert.deepEqual(logical(copied), logical(before), 'Every actual default member/type/byte hash copied');
  const beforeFile = path.join(out, 'default-' + kind + '-before.json'), afterFile = path.join(out, 'default-' + kind + '-after.json'), copiedFile = path.join(out, 'default-' + kind + '-retained.json'); write(beforeFile, before); write(afterFile, after); write(copiedFile, copied);
  const checked = kind === 'unit' ? verifyUnit(retained, mode === 'baseline') : verifyBrowser(retained, mode === 'baseline');
  assert.deepEqual(checked.report.defaultInvocation, { modeAbsent: true, outAbsent: true, noArguments: true }); assert.equal(run.result.status, mode === 'baseline' ? 1 : 0);
  fs.rmSync(original, { recursive: true, force: false }); assert(!fs.existsSync(original), 'Only the exact owned child default root removed after full copy/readback');
  const record = { kind, start, original, retained, before: pin(beforeFile), after: pin(afterFile), retainedManifest: pin(copiedFile), files: copied.filter(row => row.type === 'file').length, directories: copied.filter(row => row.type === 'directory').length, allMembersBytesAndHashesCopied: true, originalUnchangedDuringCopy: true, cleanupConfirmed: true, expectedStrictOriginalRefusal: mode === 'baseline', report: checked.pin };
  defaults.push(record); write(path.join(out, 'default-' + kind + '-retention.json'), record); return checked;
}
try {
  const unitOut = path.join(out, 'explicit-unit'), unitRun = child(UNIT, ['--root', root, '--mode', mode, '--out', unitOut], 'unit-explicit'); assert.equal(unitRun.result.status, 0);
  const unit = verifyUnit(unitOut); assertPin(unit.report.sourcePlan);
  const browserOut = path.join(out, 'explicit-browser'), browserEnv = { GRID_CELL_NAMES_PLAN_SHA256: unit.report.sourcePlan.sha256 };
  const browserRun = child(BROWSER, ['--root', root, '--mode', mode, '--out', browserOut, '--plan', unit.report.sourcePlan.file], 'browser-explicit', browserEnv); assert.equal(browserRun.result.status, 0); const browser = verifyBrowser(browserOut);
  const defaultUnit = retainDefault(child(UNIT, [], 'unit-default'), 'unit');
  const defaultBrowser = retainDefault(child(BROWSER, [], 'browser-default', { ...browserEnv, GRID_CELL_NAMES_PLAN: unit.report.sourcePlan.file }), 'browser');
  for (const [script, variable, value, label, closing] of [
    ['scripts/simGridCellMotion.mjs', '', '', 'motion-normal', 'simGridCellMotion: eight real-board feedback, focus, callback, empty-retry and rarity checks passed.'],
    ['scripts/simGridCellMotion.mjs', 'GRID_CELL_MOTION_CONTROL', 'unglow', 'motion-control', 'simGridCellMotion control: both transition checks rejected missing correct glows; six board invariant checks stayed green.'],
    ['scripts/simGridCellLayout.mjs', '', '', 'layout-normal', 'Button identity, focus and callbacks were preserved; locked cells rejected clicks.'],
    ['scripts/simGridCellLayout.mjs', 'GRID_CELL_LAYOUT_CONTROL', 'notitle', 'layout-control', 'Production source stayed unchanged; owned temporary copies were cleaned.'],
    ['scripts/playGridCellGeometry.mjs', '', '', 'geometry-normal', 'playGridCellGeometry: 24 production Board viewport/motion combinations passed.'],
    ['scripts/playGridCellGeometry.mjs', 'GRID_GEOMETRY_CONTROL', 'unbound', 'geometry-control', 'Production source remained unchanged; all owned temporary fixture files were cleaned.'],
  ]) {
    const additions = variable ? { [variable]: value } : {}; if (script.includes('Geometry')) additions.GRID_GEOMETRY_ARTIFACTS = path.join(out, label + '-artifacts');
    const run = child(script, [], label, additions); assert.equal(run.result.status, 0); assert((run.result.stdout || '').split('\n').includes(closing), 'Actual inherited closing line: ' + label); inherited.push({ label, process: pin(run.processFile), closing });
  }
  const summary = { status: 'passed', mode, productQualified: false, unitExplicit: unit.pin, browserExplicit: browser.pin, unitDefault: defaultUnit.pin, browserDefault: defaultBrowser.pin, expectedStrictOriginalDefaults: mode === 'baseline', defaults, inherited, invocations, sourceFiles, distFiles, commonPins, limits: 'Actual components and fictional fixtures, original/fixed/source controls/defaults only. No full suite, live data/backend/report/email, spoken AT/WCAG, integration, merge, publication or AdSense qualification.' };
  write(path.join(out, 'focused-summary.json'), summary);
  completed = { status: 'passed', mode, productQualified: false, summary: pin(path.join(out, 'focused-summary.json')), unitExecutions: unit.report.totals.caseExecutions + defaultUnit.report.totals.caseExecutions, browserExecutions: browser.report.caseCount + defaultBrowser.report.caseCount, inheritedChecks: inherited.length, sourceFiles, distFiles };
} catch (error) {
  write(path.join(out, 'runner-failure.json'), { status: 'failed', mode, message: error.message, stack: error.stack, invocations, defaults, inherited, productQualified: false }); throw error;
} finally {
  assert.equal(verifyManifest(sourceManifest), sourceFiles); assert.equal(verifyManifest(distManifest), distFiles); commonPins.forEach(assertPin); empty(process.env.SIM_OFFLINE_RECEIPT);
  write(path.join(out, 'focused-final-holds.json'), { sourceFiles, distFiles, sourceHeld: true, distHeld: true, commonPinsHeld: true, ordinaryParentTransportEmpty: true, finalWorkflowInstalledInputHoldsStillRequired: true });
}
assert(completed);
console.log('GRID_CELL_NAMES_RUNNER_COMPLETE ' + JSON.stringify(completed));
