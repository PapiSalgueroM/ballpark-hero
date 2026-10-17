/* Test-only reproduction of retained saved deals hidden beyond the first page. */
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert(process.env.CI === '1' && process.env.SIM_NETWORK === 'offline', 'Remote offline CI required');
assert((process.env.NODE_OPTIONS || '').includes('offlineTransport.cjs'), 'Child runtimes retain the offline preload');
assert(process.env.MSDL_OUT && path.isAbsolute(process.env.MSDL_OUT), 'Absolute MSDL_OUT required');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BASE = '6465d9aeac1bc10f37d08fcb1a41b7521a886a1a';
const TEST = 'src/test/managerSavedDealsPaging.test.tsx', OLD = 'src/test/managerOwnTransferLog.test.tsx';
const SELF = 'scripts/qa/proveManagerSavedDealsPaging.mjs', COMPONENT = 'src/components/club-manager/TransferScreen.tsx';
const TEST_SHA = '88260fb103c2ea09111fcead25096d76fca76db82acbafa3be6e42c7185741f7';
const FAULTS = {
  'all retained own deals are reachable in newest-first pages': 'The next page must expose retained own deals beyond fifty',
  'fee pages sort the complete retained list and reset safely': 'The next fee page must expose the remaining retained deals',
};
const PRESERVES = ['all clubs keeps the existing first fifty newest saved deals', 'small own histories keep counterparties loan flags and saved gross fees', 'empty single and fifty-row histories keep their boundary states', 'browsing keeps career ledger feedback callbacks and random stream unchanged'];
const RAW_KEYS = ['ownPages', 'feePages', 'allFirstFifty', 'smallOwn', 'boundaries', 'readOnly'];
const RAW_TITLES = Object.fromEntries(RAW_KEYS.map((key, index) => [key, [...Object.keys(FAULTS), ...PRESERVES][index]]));
const SETUP = /Unhandled Errors?|Unhandled Rejection|Uncaught Exception|TypeError:|ReferenceError:|SyntaxError:|Failed to (?:load|resolve import)|Cannot find module|ERR_MODULE_NOT_FOUND|SIM_OFFLINE_BLOCK/i;
const OUT = path.join(process.env.MSDL_OUT, 'baseline-proof');
assert(!fs.existsSync(OUT), 'Never overwrite prior proof evidence'); fs.mkdirSync(OUT, { recursive: true });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(path.join(ROOT, file));
const write = (file, value) => fs.writeFileSync(path.join(OUT, file), JSON.stringify(value, null, 2) + '\n');
function git(args) {
  const child = spawnSync('git', args, { cwd: ROOT, timeout: 30000, maxBuffer: 32 * 1024 * 1024 });
  assert(!child.error && !child.signal && child.status === 0, 'Actual Git source read: ' + args.join(' ')); return child.stdout;
}
const HEAD = git(['rev-parse', 'HEAD']).toString().trim();
const tracked = () => Object.fromEntries(git(['ls-files', '-z']).toString().split('\0').filter(Boolean).sort().map(file => [file, sha(read(file))]));
const before = tracked(); write('tracked.before.json', before);
const report = { head: HEAD, base: BASE, status: 'running', qualified: false, sourceHeld: false, runs: [],
  scope: 'Original-source UI reproduction only; retained saved rows, no recovered history, build, browser or live claim',
  limits: ['Prepared fictional TransferNews rows exercise the actual component, not natural transfer frequency.',
    'JSON receipts cannot independently retain undefined properties or JavaScript reference identity.'] };
const checkpoint = () => write('report.json', report);
function receipt(file) { const bytes = fs.readFileSync(file); return { file: path.relative(OUT, file).replaceAll('\\', '/'), bytes: bytes.length, sha256: sha(bytes) }; }
function run(name, test) {
  const unitFile = path.join(OUT, name + '.json'), rawFile = path.join(OUT, 'raw.json'), transport = path.join(OUT, name + '.transport');
  const child = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', test, '--maxWorkers=1', '--minWorkers=1',
    '--reporter=verbose', '--reporter=json', '--outputFile.json=' + unitFile], { cwd: ROOT,
    env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1', SIM_OFFLINE_RECEIPT: transport, MSDL_RAW: name === 'paging' ? rawFile : '' },
    encoding: 'utf8', timeout: 600000, maxBuffer: 64 * 1024 * 1024 });
  fs.writeFileSync(path.join(OUT, name + '.stdout.log'), child.stdout || ''); fs.writeFileSync(path.join(OUT, name + '.stderr.log'), child.stderr || '');
  const row = { name, test, exit: child.status, signal: child.signal, error: child.error?.message || null, qualified: false,
    stdout: receipt(path.join(OUT, name + '.stdout.log')), stderr: receipt(path.join(OUT, name + '.stderr.log')) };
  report.runs.push(row); if (fs.existsSync(unitFile)) row.units = receipt(unitFile);
  if (name === 'paging' && fs.existsSync(rawFile)) row.raw = receipt(rawFile); checkpoint();
  process.stdout.write(child.stdout || ''); process.stderr.write(child.stderr || '');
  assert(!child.error && !child.signal && child.status !== null && fs.existsSync(unitFile), 'Actual completed unit child: ' + name);
  assert(!SETUP.test((child.stdout || '') + (child.stderr || '')), 'Setup and transport errors never qualify: ' + name);
  assert(!fs.existsSync(transport) || fs.readFileSync(transport).length === 0, 'No blocked ordinary external attempt: ' + name);
  const units = JSON.parse(fs.readFileSync(unitFile)); assert.equal(units.testResults.length, 1);
  const suite = units.testResults[0]; assert(suite.name.replaceAll('\\', '/').endsWith('/' + test) && !suite.message, 'Only the exact unit file loads without setup faults');
  assert.equal(units.numPendingTests, 0); assert.equal(units.numTodoTests, 0);
  assert(suite.assertionResults.every(item => ['passed', 'failed'].includes(item.status)), 'No skipped cases');
  return { row, units, suite };
}
checkpoint();
try {
  assert.equal(git(['status', '--porcelain', '--untracked-files=no']).toString(), '', 'Committed source starts clean');
  git(['merge-base', '--is-ancestor', BASE, HEAD]);
  git(['diff', '--exit-code', BASE, HEAD, '--', 'src', 'scripts', 'public', 'package.json', 'package-lock.json', 'bun.lock', 'bun.lockb', ':!' + TEST, ':!' + SELF]);
  assert.equal(sha(read(TEST)), TEST_SHA, 'Frozen six-case regression');
  for (const file of [COMPONENT, OLD]) assert.deepEqual(read(file), git(['show', BASE + ':' + file]), 'Exact original source: ' + file);
  assert.deepEqual(read(SELF), git(['show', HEAD + ':' + SELF]), 'Actual helper is committed at HEAD');
  fs.copyFileSync(path.join(ROOT, TEST), path.join(OUT, 'managerSavedDealsPaging.test.tsx'));
  fs.copyFileSync(path.join(ROOT, COMPONENT), path.join(OUT, 'TransferScreen.original.tsx'));
  report.bindings = { component: { file: COMPONENT, sha256: sha(read(COMPONENT)) }, test: { file: TEST, sha256: TEST_SHA },
    oldTest: { file: OLD, sha256: sha(read(OLD)) }, helper: { file: SELF, sha256: sha(read(SELF)) } }; checkpoint();
  const paging = run('paging', TEST);
  assert.equal(paging.row.exit, 1); assert.equal(paging.units.success, false); assert.equal(paging.suite.status, 'failed');
  assert.equal(paging.units.numTotalTests, 6); assert.equal(paging.units.numFailedTests, 2); assert.equal(paging.units.numPassedTests, 4);
  assert.equal(paging.suite.assertionResults.length, 6);
  const rawFile = path.join(OUT, 'raw.json'); assert(fs.existsSync(rawFile), 'Complete raw evidence is retained before the two target assertions');
  const raw = JSON.parse(fs.readFileSync(rawFile)); assert.equal(raw.version, 1); assert.deepEqual(raw.caseTitles, RAW_TITLES);
  assert.deepEqual(Object.keys(raw.cases).sort(), [...RAW_KEYS].sort());
  for (const key of RAW_KEYS) assert(raw.cases[key] && typeof raw.cases[key] === 'object', 'Every completed raw case retained: ' + key);
  for (const key of ['ownPages', 'feePages']) {
    const evidence = raw.cases[key]; assert.deepEqual(evidence.fixture, { retained: 80, own: 61, noise: 19 });
    assert.equal(evidence.initial.names.length, 50); assert.equal(evidence.initial.next.present, false); assert.deepEqual(evidence.pages, []);
    assert.equal(evidence.careerAfter, evidence.careerBefore); assert.deepEqual(evidence.actionCalls, []); assert.deepEqual(evidence.draws, []);
  }
  assert.equal(raw.cases.readOnly.careerAfter, raw.cases.readOnly.careerBefore, 'Complete captured career bytes held during preserved browsing');
  assert.deepEqual(raw.cases.readOnly.actionCalls, []); assert.deepEqual(raw.cases.readOnly.clearCalls, [[]]); assert.deepEqual(raw.cases.readOnly.draws, []);
  paging.row.rawCases = RAW_KEYS;
  assert.deepEqual(paging.suite.assertionResults.map(item => item.title).sort(), [...Object.keys(FAULTS), ...PRESERVES].sort());
  for (const item of paging.suite.assertionResults) {
    const cause = FAULTS[item.title]; assert.equal(item.status, cause ? 'failed' : 'passed');
    if (!cause) { assert.deepEqual(item.failureMessages, []); continue; }
    assert.equal(item.failureMessages.length, 1); const failure = item.failureMessages[0];
    assert(failure.startsWith('AssertionError: ' + cause), 'Exact missing-pagination assertion cause');
    assert(failure.includes('expected false to be true') && failure.includes('Object.is equality'), 'Only the precise Boolean missing-Next outcome qualifies');
  }
  paging.row.completed = 6; paging.row.faults = Object.keys(FAULTS); paging.row.passed = 4; paging.row.qualified = true; checkpoint();
  const old = run('old-own-history', OLD);
  assert.equal(old.row.exit, 0); assert.equal(old.units.success, true); assert.equal(old.suite.status, 'passed');
  assert.equal(old.units.numTotalTests, 10); assert.equal(old.units.numFailedTests, 0); assert.equal(old.units.numPassedTests, 10);
  assert.equal(old.suite.assertionResults.length, 10); assert(old.suite.assertionResults.every(item => item.status === 'passed' && item.failureMessages.length === 0));
  old.row.completed = 10; old.row.passed = 10; old.row.qualified = true; checkpoint();
} catch (error) { report.error = error?.stack || String(error); checkpoint(); throw error; }
finally {
  const after = tracked(); write('tracked.after.json', after); report.sourceHeld = JSON.stringify(before) === JSON.stringify(after); checkpoint();
  assert.deepEqual(after, before, 'Complete tracked source held through both actual unit runs');
}
assert(report.runs.length === 2 && report.runs.every(row => row.qualified) && report.sourceHeld);
report.status = 'complete'; report.qualified = true; checkpoint(); write('summary.json', report);
console.log('Saved deals paging baseline:6 completed,2 precise missing-Next faults,4 preserves;old10 green;original source held.');
