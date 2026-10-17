/* Original-source account dialog loading reproduction. Runtime belongs to offline CI. */
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert(process.env.CI === '1' && process.env.SIM_NETWORK === 'offline', 'Remote offline CI required');
assert((process.env.NODE_OPTIONS || '').includes('offlineTransport.cjs'), 'Actual child runtimes keep the offline preload');
assert(process.env.ACCOUNT_DIALOG_OUT && path.isAbsolute(process.env.ACCOUNT_DIALOG_OUT), 'Absolute ACCOUNT_DIALOG_OUT required');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BASE = 'b31c9894ac27283a9b650bf32b53e558b7148834';
const TEST = 'src/test/accountDialogOnDemand.test.tsx', SELF = 'scripts/qa/proveAccountDialogOnDemand.mjs', OLD = 'src/test/authModalFocus.test.tsx';
const TEST_SHA = 'c0987c82018208d94fba1b71c0973a6efd28436114fde5743865ad2a38876315';
const FAULTS = {
  'Header leaves the account dialog unevaluated until Log In': 'Closed Header must not initialize AuthModal',
  'Home leaves the account dialog unevaluated until Make a free one': 'Closed Home must not initialize AuthModal',
  'Game navbar leaves the account dialog unevaluated until Track stats': 'Closed game navbar must not initialize AuthModal',
};
const PRESERVES = ['Header preserves requested tabs fields and the latest opener across reopening', 'Home opens the real signup form and keeps validation and Close usable', 'Game navbar keeps signup Escape navigation and saved bytes unchanged'];
const RAW_KEYS = ['headerDeferred', 'homeDeferred', 'navbarDeferred', 'headerLifetime', 'homeForm', 'navbarNavigation'];
const TITLES = [...Object.keys(FAULTS), ...PRESERVES];
const SETUP = /Unhandled Errors?|Unhandled Rejection|Uncaught Exception|TypeError:|ReferenceError:|SyntaxError:|TestingLibraryElementError|Failed to (?:load|resolve import)|Cannot find module|ERR_MODULE_NOT_FOUND|SIM_OFFLINE_BLOCK/i;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(path.join(ROOT, file));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
function git(args) {
  const run = spawnSync('git', args, { cwd: ROOT, timeout: 30000, maxBuffer: 32 * 1024 * 1024 });
  assert(!run.error && !run.signal && run.status === 0, 'Actual Git source read: ' + args.join(' ')); return run.stdout;
}
function weights() {
  const folder = process.env.ACCOUNT_DIALOG_OUT, text = fs.readFileSync(path.join(folder, 'weights.log'), 'utf8');
  const code = read('scripts/sweepWeight.mjs').toString().replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const block = code.match(/const BUDGETS\s*=\s*\[([\s\S]*?)\];/); assert(block, 'Actual unchanged budget array exists');
  const budgets = Object.fromEntries([...block[1].matchAll(/\['([^']+)',\s*(\d+)\]/g)].map(m => [m[1], Number(m[2])]));
  assert.equal(Object.keys(budgets).length, 14); assert.deepEqual(read('scripts/sweepWeight.mjs'), git(['show', BASE + ':scripts/sweepWeight.mjs']));
  const rows = [...text.matchAll(/^\s+(\/\S*)\s+(\d+)K gz over\s+(\d+) files \(budget (\d+)K, (\d+\.\d+)K to the tenth\)$/gm)].map(m => ({ route: m[1], measuredRoundedK: Number(m[2]), files: Number(m[3]), budgetK: Number(m[4]), measuredK: Number(m[5]) }));
  assert.equal(rows.length, 14); assert.equal(new Set(rows.map(row => row.route)).size, 14);
  for (const row of rows) { assert.equal(row.budgetK, budgets[row.route]); assert(row.files > 0 && row.measuredK > 0, 'Actual emitted JavaScript was measured'); }
  const failed = rows.filter(row => row.measuredRoundedK > row.budgetK), expected = ['/club-manager', '/deadline-day', '/manager-hot-seat'];
  assert.deepEqual(failed.map(row => row.route).sort(), expected);
  const failures = [...text.matchAll(/^\s*FAIL:\s*(.*)$/gm)].map(m => m[1]); assert.equal(failures.length, 3);
  for (const row of failed) assert(failures.includes(`${row.route}: ${row.measuredRoundedK}K of gzipped JavaScript against a budget of ${row.budgetK}K`));
  assert.equal(fs.readFileSync(path.join(folder, 'weights-exit.txt'), 'utf8').trim(), '1');
  assert.equal((text.match(/^sweepWeight: 3 failures\s*$/gm) || []).length, 1); assert(!/Unhandled|TypeError:|ReferenceError:|SyntaxError:|cannot tell|DID NOT FIRE/i.test(text));
  for (const number of [2, 3, 4]) assert(new RegExp('^' + number + '\\)', 'm').test(text), 'Every existing weight section ran');
  write(path.join(folder, 'weights-baseline-classification.json'), { status: 'original-baseline-three-known-cap-failures', ready: false, originalExit: 1, budgetsUnchanged: true, rows, failures,
    scope: 'Original source measurement only. Three red caps remain red; no repair, cap waiver, paired saving or release qualification.' });
  console.log('Original baseline weights:14 actual rows,exactly3 known cap failures retained;NOT READY.');
}
if (process.argv[2] === 'weights') { weights(); process.exit(0); }
assert.equal(process.argv.length, 2, 'Only the baseline or weights subcommand is supported');
const OUT = path.join(process.env.ACCOUNT_DIALOG_OUT, 'baseline-proof');
assert(!fs.existsSync(OUT), 'Never overwrite prior proof'); fs.mkdirSync(OUT, { recursive: true });
const tracked = () => Object.fromEntries(git(['ls-files', '-z']).toString().split('\0').filter(Boolean).sort().map(file => [file, sha(read(file))]));
const before = tracked(); write(path.join(OUT, 'tracked.before.json'), before);
const report = { status: 'running', qualified: false, head: git(['rev-parse', 'HEAD']).toString().trim(), base: BASE, sourceHeld: false,
  scope: 'Original-app six-case loading reproduction only. No product fix, served-browser, saving measurement or live claim.',
  limits: ['The focused mounted-consumer regression observes actual modules and forms with declared auth/provider fixtures.', 'JSON cannot retain function identity, undefined properties or DOM object identity; those remain actual in-process assertions.'] };
const checkpoint = () => write(path.join(OUT, 'report.json'), report);
const receipt = file => { const bytes = fs.readFileSync(file); return { file: path.relative(OUT, file).replaceAll('\\', '/'), bytes: bytes.length, sha256: sha(bytes) }; };
checkpoint();
try {
  assert.equal(git(['status', '--porcelain', '--untracked-files=no']).toString(), '', 'Committed source starts clean');
  git(['merge-base', '--is-ancestor', BASE, report.head]);
  git(['diff', '--exit-code', BASE, report.head, '--', 'src', 'scripts', 'public', 'index.html', 'package.json', 'package-lock.json', 'bun.lock', 'bun.lockb', ':!' + TEST, ':!' + SELF, ':!' + OLD]);
  assert.equal(sha(read(TEST)), TEST_SHA, 'Frozen six-case behavioral source');
  const focusAwait = "  await screen.findByRole('textbox', { name: 'Email' });\n", focusSource = read(OLD).toString();
  assert.equal(focusSource.split(focusAwait).length - 1, 1, 'Exactly one existing real-form readiness await');
  assert.equal(focusSource.replace(focusAwait, ''), git(['show', BASE + ':' + OLD]).toString(), 'Every old focus title/assertion/control method byte is held');
  for (const file of [TEST, SELF, OLD]) assert.deepEqual(read(file), git(['show', report.head + ':' + file]), 'Exact committed method body: ' + file);
  fs.copyFileSync(path.join(ROOT, TEST), path.join(OUT, 'accountDialogOnDemand.test.tsx'));
  report.bindings = Object.fromEntries([TEST, SELF, OLD, 'src/components/layout/Header.tsx', 'src/pages/Index.tsx', 'src/components/game/GameNavbar.tsx', 'src/components/auth/AuthModal.tsx'].map(file => [file, { sha256: sha(read(file)), bytes: read(file).length }])); checkpoint();
  const unitFile = path.join(OUT, 'units.json'), rawFile = path.join(OUT, 'raw.json'), transport = path.join(OUT, 'units.transport');
  const run = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', TEST, '--maxWorkers=1', '--minWorkers=1', '--reporter=verbose', '--reporter=json', '--outputFile.json=' + unitFile], {
    cwd: ROOT, env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1', ACCOUNT_DIALOG_RAW: rawFile, SIM_OFFLINE_RECEIPT: transport }, encoding: 'utf8', timeout: 600000, maxBuffer: 64 * 1024 * 1024 });
  for (const [name, text] of [['stdout.log', run.stdout], ['stderr.log', run.stderr]]) fs.writeFileSync(path.join(OUT, name), text || '');
  report.child = { exit: run.status, signal: run.signal, error: run.error?.message || null, stdout: receipt(path.join(OUT, 'stdout.log')), stderr: receipt(path.join(OUT, 'stderr.log')) };
  if (fs.existsSync(unitFile)) report.child.units = receipt(unitFile); if (fs.existsSync(rawFile)) report.child.raw = receipt(rawFile); checkpoint();
  process.stdout.write(run.stdout || ''); process.stderr.write(run.stderr || '');
  assert(!run.error && !run.signal && run.status === 1, 'Actual completed expected-red unit process'); assert(!SETUP.test((run.stdout || '') + (run.stderr || '')), 'Setup and transport failures never qualify');
  assert(!fs.existsSync(transport) || fs.readFileSync(transport).length === 0, 'No blocked ordinary external attempt');
  const units = JSON.parse(fs.readFileSync(unitFile)); assert.equal(units.success, false); assert.equal(units.numTotalTests, 6); assert.equal(units.numFailedTests, 3); assert.equal(units.numPassedTests, 3);
  assert.equal(units.numPendingTests, 0); assert.equal(units.numTodoTests, 0); assert.equal(units.testResults.length, 1);
  const suite = units.testResults[0]; assert.equal(path.resolve(suite.name), path.join(ROOT, TEST)); assert.equal(suite.status, 'failed'); assert(!suite.message); assert.equal(suite.assertionResults.length, 6);
  assert.deepEqual(suite.assertionResults.map(item => item.title).sort(), [...Object.keys(FAULTS), ...PRESERVES].sort());
  for (const item of suite.assertionResults) {
    const cause = FAULTS[item.title]; assert.equal(item.status, cause ? 'failed' : 'passed');
    if (!cause) { assert.deepEqual(item.failureMessages, []); continue; }
    assert.equal(item.failureMessages.length, 1); const message = item.failureMessages[0]; assert(message.includes(cause));
    assert.match(message, /AssertionError/); assert.match(message, /expected false to be true/); assert(!SETUP.test(message));
  }
  const raw = JSON.parse(fs.readFileSync(rawFile)); assert.equal(raw.version, 1); assert.deepEqual(raw.caseTitles, TITLES); assert.deepEqual(Object.keys(raw.cases).sort(), [...RAW_KEYS].sort());
  for (const [index, key] of RAW_KEYS.entries()) {
    const row = raw.cases[key]; assert(row && typeof row === 'object', 'Actual completed raw case: ' + key); assert.equal(row.title, TITLES[index]);
    assert.deepEqual(Object.keys(row.backend).sort(), ['from', 'resetPasswordForEmail', 'rpc', 'signIn', 'signOut', 'signUp']);
    assert(Object.values(row.backend).every(value => value === 0), 'Every captured auth and backend call stays unused: ' + key);
    assert(Object.keys(row.before.local).length > 0 && Object.keys(row.before.session).length > 0, 'Opaque game and session bytes exist');
  }
  for (const [index, key] of RAW_KEYS.slice(0, 3).entries()) {
    const row = raw.cases[key], heading = index === 0 ? 'Welcome Back!' : 'Join DoUKnowBall';
    assert.equal(row.consumer, ['header', 'home', 'navbar'][index]); assert.equal(row.initial.dialogPresent, false);
    for (const stage of [row.initial, row.opened, row.closed]) {
      for (const count of ['factoryEvaluations', 'realImports', 'mounts']) assert.equal(stage[count], 1, 'Original actual module and instance: ' + key);
      assert.equal(stage.unmounts, 0); assert(stage.renders >= 1);
    }
    assert.equal(row.opened.form.heading, heading); assert.equal(row.opened.form.focusInside, true);
    assert.equal(row.opened.form.email, ''); assert.equal(row.opened.form.password, ''); assert.equal(row.opened.form.ageConfirmed, index === 0 ? null : false);
    assert.equal(row.closed.dialogPresent, false); assert.equal(row.closed.openerFocused, true);
    for (const stored of [row.initial.stores, row.opened.form.stores, row.closed.stores]) assert.deepEqual(stored, row.before, 'Every actual target saved byte is held');
    assert.equal(row.opened.form.address, row.initial.address);
  }
  const lifetime = raw.cases.headerLifetime; assert.deepEqual(lifetime.after, lifetime.before); assert.deepEqual(lifetime.beforeFinalClose, { mounts: 1, unmounts: 0, realImports: 1 });
  assert(lifetime.latestOpenerFocused && lifetime.loginConnected && lifetime.signupConnected);
  for (const stage of [lifetime.first, lifetime.second, lifetime.third, lifetime.fourth]) { assert.equal(stage.email, 'fixture@example.invalid'); assert.equal(stage.password, 'held-password'); assert.equal(stage.focusInside, true); assert.deepEqual(stage.stores, lifetime.before); }
  assert.equal(lifetime.fourth.ageConfirmed, true);
  const home = raw.cases.homeForm; assert.deepEqual(home.after, home.before); assert.equal(home.openerFocused, true);
  assert.deepEqual(home.validation, { emailInvalid: 'true', passwordInvalid: 'true', emailMessage: 'Email is required', passwordMessage: 'Password is required' });
  assert.equal(home.opened.heading, 'Join DoUKnowBall'); assert.equal(home.login.heading, 'Welcome Back!');
  const navbar = raw.cases.navbarNavigation; assert.deepEqual(navbar.after, navbar.before); assert.deepEqual(navbar.afterEscape.stores, navbar.before);
  assert.equal(navbar.initialAddress, '/club-manager?fixture=kept#round'); assert.equal(navbar.afterEscape.address, navbar.initialAddress); assert.equal(navbar.afterEscape.openerFocused, true); assert.equal(navbar.afterBack, '/soccer');
  report.cases = suite.assertionResults.map(item => ({ title: item.title, status: item.status, cause: FAULTS[item.title] || null })); report.raw = receipt(rawFile);
} catch (error) { report.error = error?.stack || String(error); checkpoint(); throw error; }
finally {
  const after = tracked(); write(path.join(OUT, 'tracked.after.json'), after); report.sourceHeld = JSON.stringify(before) === JSON.stringify(after); checkpoint();
  assert.deepEqual(after, before, 'Every tracked source body is held through the actual original-app test');
}
assert(report.sourceHeld && report.cases.length === 6); report.status = 'complete'; report.qualified = true; checkpoint(); write(path.join(OUT, 'summary.json'), report);
console.log('Account dialog baseline:6 completed,3 precise closed-consumer factory faults,3 preserves;original source held.');
