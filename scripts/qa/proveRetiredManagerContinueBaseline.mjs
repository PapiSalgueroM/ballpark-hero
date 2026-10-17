/* Test-only original-source proof for the retired Manager Continue label. */
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert(process.env.CI === '1' && process.env.SIM_NETWORK === 'offline', 'Remote offline CI required');
assert((process.env.NODE_OPTIONS || '').includes('offlineTransport.cjs'), 'Actual child runtimes retain the offline preload');
assert(process.env.RETIRED_MANAGER_CONTINUE_OUT && path.isAbsolute(process.env.RETIRED_MANAGER_CONTINUE_OUT), 'Absolute RETIRED_MANAGER_CONTINUE_OUT required');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BASE = 'd8aaa4cb654e1b59f783625e63b73ce85adf2681';
const TEST = 'src/test/retiredManagerContinue.test.tsx';
const SELF = 'scripts/qa/proveRetiredManagerContinueBaseline.mjs';
const TEST_SHA = 'e3e005eacd784b3601575109f0e4ffff9b1dd8bec56faf57490966142047b2bf';
const CAUSE = 'The actual retirement object must replace the legacy season or sacked label';
const TITLES = {
  targetMidSeason: 'target: an actual mid-season retirement says retired in metadata and the mounted Continue row',
  targetOutOfWork: 'target: an actual out-of-work retirement takes precedence over sacked in metadata and the mounted Continue row',
  preserveLegacy: 'preserve: legacy active and sacked Club Manager saves keep their existing labels',
  preserveInvalid: 'preserve: invalid Club Manager retirement markers keep the legacy fallback',
  preserveOtherGames: 'preserve: all other 20 games ignore an object retirement marker and keep strict boolean endings',
  preserveCorruptOwn: 'preserve: corrupt saves and inherited fields stay unusable without changing storage',
};
const TARGETS = ['targetMidSeason', 'targetOutOfWork'];
const KEYS = Object.keys(TITLES);
const CONTROLS = ['continuekey', 'continuefield', 'continueguard', 'continuecold'];
const SETUP = /Unhandled Errors?|Unhandled Rejection|Uncaught Exception|TypeError:|ReferenceError:|SyntaxError:|Failed to (?:load|resolve import)|Cannot find module|ERR_MODULE_NOT_FOUND|SIM_OFFLINE_BLOCK/i;
const OUT = path.join(process.env.RETIRED_MANAGER_CONTINUE_OUT, 'baseline-proof');
assert(!fs.existsSync(OUT), 'Never overwrite prior proof evidence');
fs.mkdirSync(OUT, { recursive: true });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(path.join(ROOT, file));
const write = (file, value) => fs.writeFileSync(path.join(OUT, file), JSON.stringify(value, null, 2) + '\n');
function git(args) {
  const child = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', timeout: 30000, maxBuffer: 32 * 1024 * 1024 });
  assert(!child.error && !child.signal && child.status === 0, 'Actual Git source read: ' + args.join(' '));
  return child.stdout;
}
const HEAD = git(['rev-parse', 'HEAD']).trim();
const tracked = () => Object.fromEntries(git(['ls-files', '-z']).split('\0').filter(Boolean).sort().map(file => [file, sha(read(file))]));
const before = tracked(); write('tracked.before.json', before);
const report = { head: HEAD, base: BASE, scope: 'Original-source reproduction only, no product fix or browser claim',
  test: { file: TEST, sha256: sha(read(TEST)) }, status: 'running', unit: null, homeFront: [], sourceHeld: false, qualified: false,
  limits: ['The prepared targets use actual startCareer and retireCareer, not natural match play.',
    'Full JSON states and storage bytes are retained. Undefined keys and reference identity are not representable in these JSON receipts.',
    'The test seeds constructor draws and the generated-ID clock. It does not record a complete draw trace or claim zero framework RNG.'] };
const checkpoint = () => write('report.json', report);
const receipt = file => { const bytes = fs.readFileSync(file); return { file: path.relative(OUT, file).replaceAll('\\', '/'), bytes: bytes.length, sha256: sha(bytes) }; };
function run(name, args, env, timeout) {
  const transport = path.join(OUT, name + '.transport');
  const child = spawnSync(process.execPath, args, { cwd: ROOT, env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1',
    ...env, SIM_OFFLINE_RECEIPT: transport }, encoding: 'utf8', timeout, maxBuffer: 64 * 1024 * 1024 });
  fs.writeFileSync(path.join(OUT, name + '.stdout.log'), child.stdout || '');
  fs.writeFileSync(path.join(OUT, name + '.stderr.log'), child.stderr || '');
  const row = { name, exit: child.status, signal: child.signal, error: child.error?.message || null,
    stdout: receipt(path.join(OUT, name + '.stdout.log')), stderr: receipt(path.join(OUT, name + '.stderr.log')), qualified: false };
  if (name === 'units') report.unit = row; else report.homeFront.push(row);
  checkpoint(); process.stdout.write(child.stdout || ''); process.stderr.write(child.stderr || '');
  assert(!child.error && !child.signal && child.status !== null, 'Actual child must complete: ' + name);
  const output = (child.stdout || '') + (child.stderr || '');
  assert(!SETUP.test(output), 'Setup or transport faults never qualify: ' + name);
  assert(!fs.existsSync(transport) || fs.readFileSync(transport).length === 0, 'No blocked external attempt: ' + name);
  return { row, stdout: child.stdout || '', stderr: child.stderr || '', output };
}
let metadataObservations = 0;
function held(row) {
  assert(row && typeof row === 'object', 'Complete metadata observation'); metadataObservations++;
  assert.equal(row.error, null); assert.deepEqual(row.descriptorAfter, row.descriptorBefore);
  assert.deepEqual(row.storageAfter, row.storageBefore, 'Full metadata storage bytes held');
}
checkpoint();
try {
  assert.equal(git(['status', '--porcelain', '--untracked-files=no']), '', 'Committed source begins clean');
  git(['merge-base', '--is-ancestor', BASE, HEAD]);
  git(['diff', '--exit-code', BASE, HEAD, '--', 'src', 'scripts', 'public', 'package.json', 'package-lock.json', 'bun.lock', 'bun.lockb', ':!' + TEST, ':!' + SELF]);
  assert.equal(sha(read(TEST)), TEST_SHA, 'Frozen six-case regression bytes');
  assert.deepEqual(read(SELF), Buffer.from(git(['show', HEAD + ':' + SELF])), 'Actual helper is committed at HEAD');
  report.sourceFence = { base: BASE, roots: ['src', 'scripts', 'public', 'package.json', 'package-lock.json', 'bun.lock', 'bun.lockb'],
    onlyExceptions: [TEST, SELF], originalAppHeld: true, simHomeFrontSha256: sha(read('scripts/simHomeFront.mjs')) }; checkpoint();
  const unitFile = path.join(OUT, 'unit.json'), rawFile = path.join(OUT, 'raw.json');
  const unit = run('units', ['node_modules/vitest/vitest.mjs', 'run', TEST, '--maxWorkers=1', '--minWorkers=1',
    '--reporter=verbose', '--reporter=json', '--outputFile.json=' + unitFile],
  { HOME_FRONT_CONTROL: '', RETIRED_MANAGER_CONTINUE_RAW: rawFile }, 300000);
  assert(fs.existsSync(unitFile) && fs.existsSync(rawFile), 'Completed physical unit report and six-case raw receipt');
  unit.row.units = receipt(unitFile); unit.row.raw = receipt(rawFile); checkpoint();
  const units = JSON.parse(fs.readFileSync(unitFile)), raw = JSON.parse(fs.readFileSync(rawFile));
  assert.equal(units.success, false); assert.equal(units.testResults.length, 1);
  assert.equal(units.numTotalTests, 6); assert.equal(units.numFailedTests, 2); assert.equal(units.numPassedTests, 4);
  assert.equal(units.numPendingTests, 0); assert.equal(units.numTodoTests, 0); assert.equal(unit.row.exit, 1);
  const file = units.testResults[0];
  assert(file.name.replaceAll('\\', '/').endsWith('/' + TEST) && !file.message, 'Only the exact unit file loads without setup error');
  assert.equal(file.status, 'failed'); assert.equal(file.assertionResults.length, 6);
  assert.deepEqual(file.assertionResults.map(test => test.title).sort(), Object.values(TITLES).sort(), 'All six exact test titles complete');
  const failures = file.assertionResults.filter(test => test.status === 'failed');
  assert.deepEqual(failures.map(test => test.title).sort(), TARGETS.map(key => TITLES[key]).sort(), 'Only two actual metadata targets may fail');
  for (const test of file.assertionResults) {
    assert(['passed', 'failed'].includes(test.status), 'No skipped or pending case');
    if (test.status === 'passed') assert.deepEqual(test.failureMessages, []);
  }
  assert.equal(raw.version, 1); assert.deepEqual(raw.caseKeys, KEYS); assert.deepEqual(raw.caseTitles, TITLES);
  assert.deepEqual(Object.keys(raw.cases).sort(), [...KEYS].sort());
  for (const key of KEYS) assert(raw.cases[key] !== null, 'Every complete raw case is retained: ' + key);
  report.targets = [];
  for (const key of TARGETS) {
    const row = raw.cases[key], sacked = key === 'targetOutOfWork';
    const input = JSON.parse(row.inputBefore), retired = JSON.parse(row.raw), legacy = input.clubName + ', ' + (sacked ? 'sacked' : 'season ' + input.season);
    assert.deepEqual(row.setup, { club: 'Everton', era: 'now', seed: 1392, generatedIdClock: 0, sacked });
    assert.equal(row.inputAfter, row.inputBefore, 'Entire actual retirement input held');
    assert.equal(row.retiredAfterRender, row.raw, 'Entire actual retired state held through render');
    assert(retired.retired && typeof retired.retired === 'object' && !Array.isArray(retired.retired));
    assert.equal(retired.retired.when, sacked ? 'outOfWork' : 'midSeason'); assert.equal(retired.sacked, sacked);
    assert.deepEqual(row.retirement, retired.retired); assert.equal(row.retainedSacked, sacked);
    assert.deepEqual(row.expected, { line: input.clubName + ', retired', when: sacked ? 'outOfWork' : 'midSeason' });
    held(row.metadata); assert.equal(row.metadata.raw, row.raw); assert.equal(row.metadata.line, legacy);
    assert.deepEqual(row.storageAfterRender, row.storageBeforeRender, 'Complete render storage held');
    const saveKey = row.metadata.descriptorBefore.saveKey;
    assert.equal(row.storageBeforeRender.local[saveKey], row.raw); assert.equal(row.storageAfterRender.local[saveKey], row.raw);
    assert.equal(row.storageBeforeRender.local['retired-manager-continue-unrelated'], '{"keep":"unchanged"}');
    assert.equal(row.storageBeforeRender.session['retired-manager-continue-session'], 'opaque session bytes');
    assert.equal(row.cards.length, 1); const card = row.cards[0];
    assert.deepEqual([card.path, card.href, card.line], ['/club-manager', '/club-manager', legacy], 'Mounted row agrees with actual original metadata');
    assert.equal(typeof card.html, 'string'); assert(row.dom.container.includes(card.html) && row.dom.document.includes(row.dom.container), 'Complete mounted target DOM retained');
    assert(row.stageDescriptor && row.stageDescriptor.path === '/club-manager');
    const failure = failures.find(test => test.title === TITLES[key]);
    assert.equal(failure.failureMessages.length, 1, 'One precise first assertion failure');
    const message = failure.failureMessages[0];
    assert(message.startsWith('AssertionError: ' + CAUSE), 'Exact assertion kind and cause, not an arbitrary runtime failure');
    assert(message.includes("expected '" + legacy + "' to be '" + row.expected.line + "'"), 'Exact first metadata actual and expected values');
    assert(message.includes('Object.is equality'), 'Actual strict label equality assertion');
    report.targets.push({ key, actual: legacy, desired: row.expected.line, when: retired.retired.when,
      failureKind: 'AssertionError', cause: CAUSE, rawBytes: Buffer.byteLength(row.raw), inputHeld: true, storageHeld: true, mountedLine: card.line });
  }
  assert.equal(raw.cases.preserveLegacy.length, 2);
  assert.equal(raw.cases.preserveInvalid.length, 20);
  for (const row of [...raw.cases.preserveLegacy, ...raw.cases.preserveInvalid]) { held(row.observation); assert.equal(row.observation.line, row.expected); }
  const other = raw.cases.preserveOtherGames;
  assert.equal(other.length, 20); assert.equal(new Set(other.map(row => row.path)).size, 20); assert(other.every(row => row.path !== '/club-manager'));
  for (const row of other) {
    for (const observation of [row.plain, row.objectMarker, row.nullMarker]) held(observation);
    assert.equal(row.objectMarker.line, row.plain.line); assert.equal(row.nullMarker.line, row.plain.line);
    for (const ending of row.ending) { held(ending.observation); assert.equal(ending.observation.line, ending.value === true ? row.expectedEnded : row.plain.line); }
  }
  const corrupt = raw.cases.preserveCorruptOwn; assert.equal(corrupt.unusable.length, 8);
  for (const row of corrupt.unusable) { held(row); assert.equal(row.line, null); }
  for (const row of [corrupt.named, corrupt.inherited]) { held(row); assert.equal(row.line, 'Fixture FC, season 3'); }
  assert.deepEqual(corrupt.prototypeRestored, { retired: null, sacked: null });
  unit.row.completed = 6; unit.row.failed = 2; unit.row.passed = 4; unit.row.metadataObservations = metadataObservations; unit.row.qualified = true; checkpoint();
  const normal = run('home-front-normal', ['scripts/simHomeFront.mjs'], { HOME_FRONT_CONTROL: '', RETIRED_MANAGER_CONTINUE_RAW: '' }, 600000);
  assert.equal(normal.row.exit, 0, 'Existing normal home front must pass before any controls');
  assert(!/^\s*FAIL \[/m.test(normal.output));
  assert(normal.stdout.trimEnd().endsWith('simHomeFront: green. The home front shows real games, real saves and a sport you can tell apart without colour.'));
  const sections = [...normal.stdout.matchAll(/^([1-8])\) /gm)].map(match => Number(match[1]));
  assert.deepEqual(sections, [1, 2, 3, 4, 5, 6, 7, 8], 'All eight original sections reach their actual output');
  const measured = normal.stdout.split('\n').filter(line => /games, every key|engine built saves and/.test(line));
  assert.equal(measured.length, 2, 'Actual existing save and engine counts printed');
  normal.row.sections = sections; normal.row.measuredSaveCounts = measured; normal.row.qualified = true; checkpoint();
  for (const control of CONTROLS) {
    const observed = run('home-front-' + control, ['scripts/simHomeFront.mjs'], { HOME_FRONT_CONTROL: control, RETIRED_MANAGER_CONTINUE_RAW: '' }, 600000);
    assert.equal(observed.row.exit, 0, 'Original harness self-qualifies effective negative controls');
    assert.equal(observed.stdout.split('NEGATIVE CONTROL ' + control + ' ON:').length, 2, 'Exactly one effective actual-source control rewrite');
    const faults = [...observed.output.matchAll(/^\s*FAIL \[(\d+)\]: (.+)$/gm)].map(match => ({ section: Number(match[1]), message: match[2] }));
    assert(faults.length > 0 && faults.every(fault => fault.section === 7), 'Only actual Continue section may turn red');
    assert(observed.stdout.trimEnd().endsWith('simHomeFront control ' + control + ': green. Section 7 went red and nothing else did.'));
    observed.row.control = control; observed.row.faults = faults; observed.row.qualified = true; checkpoint();
  }
} catch (error) { report.error = error?.stack || String(error); checkpoint(); throw error; }
finally {
  const after = tracked(); write('tracked.after.json', after); report.sourceHeld = JSON.stringify(after) === JSON.stringify(before); checkpoint();
  assert.deepEqual(after, before, 'Complete source and original harness held');
}
assert(report.unit?.qualified && report.homeFront.length === 5 && report.homeFront.every(row => row.qualified) && report.sourceHeld);
report.status = 'complete'; report.qualified = true; checkpoint(); write('summary.json', report);
console.log('Retired Manager baseline:6 completed,2 precise metadata faults,4 preserves;all six raw cases retained;existing home front healthy and4 effective Continue controls.');
