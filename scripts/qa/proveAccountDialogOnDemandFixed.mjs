/* Fixed auth presentation proof. Original unit evidence and same-tools served costs stay separate. */
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
assert(process.env.CI === '1' && process.env.SIM_NETWORK === 'offline', 'Remote offline CI required');
assert((process.env.NODE_OPTIONS || '').includes('offlineTransport.cjs'), 'Actual children retain the offline preload');
assert(process.env.ACCOUNT_DIALOG_OUT && path.isAbsolute(process.env.ACCOUNT_DIALOG_OUT), 'Absolute ACCOUNT_DIALOG_OUT required');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), OUT = process.env.ACCOUNT_DIALOG_OUT;
const BASELINE = process.env.ACCOUNT_DIALOG_BASELINE_REF;
assert.match(BASELINE || '', /^[0-9a-f]{40}$/, 'Actual newly qualified original-app source required');
const TEST = 'src/test/accountDialogOnDemand.test.tsx', OLD = 'src/test/authModalFocus.test.tsx';
const BASE_PROOF = 'scripts/qa/proveAccountDialogOnDemand.mjs', SELF = 'scripts/qa/proveAccountDialogOnDemandFixed.mjs', BROWSER = 'scripts/qa/playAccountDialogOnDemand.mjs';
const TEST_SHA = 'f01fc74252c2f4604c60a1695702dea8bddc3b42f3c0968cbe56a4b7655460b0', BASE_PROOF_SHA = '333e708502af0bc94b0e0a15239341bdbe228fce25b0e6313fef2c6396dddf8e';
const TEST_ORIGINAL_SHA = 'c0987c82018208d94fba1b71c0973a6efd28436114fde5743865ad2a38876315';
const TEST_METHOD_SPANS = [{"from":"import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';","to":"import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';"},{"from":"  await screen.findByRole('heading', { name: heading });","to":"  await waitFor(() => within(screen.getByRole('dialog')).getByRole('heading', { name: heading }));"}];
const PRODUCTS = ['src/components/layout/Header.tsx', 'src/pages/Index.tsx', 'src/components/game/GameNavbar.tsx', 'src/components/auth/AuthModal.tsx', 'src/components/auth/AccountDialogOnDemand.tsx'];
const FAULTS = {
  'Header leaves the account dialog unevaluated until Log In': 'Closed Header must not initialize AuthModal',
  'Home leaves the account dialog unevaluated until Make a free one': 'Closed Home must not initialize AuthModal',
  'Game navbar leaves the account dialog unevaluated until Track stats': 'Closed game navbar must not initialize AuthModal',
};
const PRESERVES = ['Header preserves requested tabs fields and the latest opener across reopening', 'Home opens the real signup form and keeps validation and Close usable', 'Game navbar keeps signup Escape navigation and saved bytes unchanged'];
const KEYS = ['headerDeferred', 'homeDeferred', 'navbarDeferred', 'headerLifetime', 'homeForm', 'navbarNavigation'], TITLES = [...Object.keys(FAULTS), ...PRESERVES];
const SETUP = /Unhandled Errors?|Unhandled Rejection|Uncaught Exception|TypeError:|ReferenceError:|SyntaxError:|TestingLibraryElementError|Failed to (?:load|resolve import)|Cannot find module|ERR_MODULE_NOT_FOUND|SIM_OFFLINE_BLOCK/i;
const sha = bytes => createHash('sha256').update(bytes).digest('hex'), read = file => fs.readFileSync(path.join(ROOT, file));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
function git(args) { const run = spawnSync('git', args, { cwd: ROOT, timeout: 30000, maxBuffer: 64 * 1024 * 1024 }); assert(!run.error && !run.signal && run.status === 0, 'Actual Git operation: ' + args.join(' ')); return run.stdout; }
function physical(folder, receipt) { assert(receipt && typeof receipt.file === 'string' && !path.isAbsolute(receipt.file), 'Relative physical receipt required'); const file = path.resolve(folder, receipt.file); assert(file.startsWith(path.resolve(folder) + path.sep), 'Receipt stays within its actual arm'); const bytes = fs.readFileSync(file); assert.equal(bytes.length, receipt.bytes); assert.equal(sha(bytes), receipt.sha256); return bytes; }
function compareBrowser() {
  const reports = Object.fromEntries(['original', 'fixed'].map(variant => { const folder = path.join(OUT, variant, 'browser'); return [variant, { folder, report: JSON.parse(fs.readFileSync(path.join(folder, 'report.json'))) }]; }));
  for (const [variant, arm] of Object.entries(reports)) {
    const report = arm.report; assert.equal(report.variant, variant); assert.equal(report.status, 'passed'); assert.equal(report.qualified, true); assert.equal(report.sourceHeld, true); assert.equal(report.distHeld, true); assert.deepEqual(report.errors, []); assert.equal(report.boot.length, 3); assert.equal(report.journeys.length, variant === 'original' ? 0 : 9);
    assert(report.authHolder && report.authHolder.rawBytes > 0 && report.authHolder.gzipBytes > 0);
    assert.deepEqual(report.boot.map(row => [row.id, row.route]), [['boot-club-manager', '/club-manager'], ['boot-hot-seat', '/manager-hot-seat'], ['boot-deadline-day', '/deadline-day']]);
    const holderBody = physical(arm.folder, report.authHolder.bodyReceipt), holderGzip = physical(arm.folder, report.authHolder.gzipReceipt); assert.equal(sha(holderBody), report.authHolder.sha256); assert.equal(holderBody.length, report.authHolder.rawBytes); assert.equal(holderGzip.length, report.authHolder.gzipBytes); assert.deepEqual(gunzipSync(holderGzip), holderBody);
    for (const row of [...report.boot, ...report.journeys]) { const { rawReceipt, ...observed } = row; assert.deepEqual(JSON.parse(physical(arm.folder, rawReceipt)), observed, 'Actual complete physical case equals the report row');
      assert.equal(row.controlledFailures.length, row.id === 'offline-retry' ? 1 : 0, 'Only the one declared offline case injects a cold request failure');
      for (const js of row.js) { assert.equal(js.status, 200); const body = physical(arm.folder, js.bodyReceipt), gzip = physical(arm.folder, js.gzipReceipt); assert.equal(body.length, js.rawBytes); assert.equal(gzip.length, js.gzipBytes); assert.equal(sha(body), js.bodySha256); assert.equal(js.bodySha256, js.diskSha256); assert.deepEqual(gunzipSync(gzip), body); }
    }
    for (const row of report.boot) { assert.equal(row.status, 'passed'); assert.equal(row.authFetchedBeforeOpen, variant === 'original'); assert.deepEqual(row.storesAfter, row.storesBefore); assert(row.js.length > 0);
      assert.equal(row.js.some(js => js.file === report.authHolder.file), variant === 'original', 'Actual owned auth holder membership matches the boot requests');
    }
    for (const row of report.journeys) { assert.equal(row.status, 'passed'); physical(arm.folder, row.rawReceipt); assert(row.screenshots.length > 0); for (const shot of row.screenshots) physical(arm.folder, shot); }
  }
  const expectedJourneys = ['header-320', 'header-1440', 'home-320', 'home-1440', 'navbar-320', 'navbar-1440', 'pending-cancel', 'pending-complete', 'offline-retry'];
  assert.deepEqual(reports.fixed.report.journeys.map(row => row.id).sort(), expectedJourneys.sort());
  const rows = reports.original.report.boot.map(original => { const matches = reports.fixed.report.boot.filter(row => row.id === original.id && row.route === original.route); assert.equal(matches.length, 1); const fixed = matches[0]; const sum = row => row.js.reduce((total, js) => total + js.gzipBytes, 0), originalGzipBytes = sum(original), fixedGzipBytes = sum(fixed); assert(fixedGzipBytes < originalGzipBytes, 'Every actual served boot downloads fewer gzipped JavaScript bytes: ' + original.route); return { id: original.id, route: original.route, originalGzipBytes, fixedGzipBytes, savedGzipBytes: originalGzipBytes - fixedGzipBytes, originalJs: original.js, fixedJs: fixed.js }; });
  const fixedReport = reports.fixed.report, healthy = fixedReport.journeys.find(row => row.id === 'navbar-320'), cold = fixedReport.coldAccountAssets;
  const ownedJs = row => row.requests.filter(item => item.owned && new URL(item.url).origin === fixedReport.base && new URL(item.url).pathname.endsWith('.js'));
  assert.deepEqual(healthy.jsRequestedBeforeOpen, [...new Set(healthy.jsRequestedBeforeOpen)].sort());
  const coldUrls = [...new Set(ownedJs(healthy).map(item => item.url))].filter(url => !healthy.jsRequestedBeforeOpen.includes(url)).sort(); assert(coldUrls.length > 0 && coldUrls.includes(fixedReport.authHolder.url));
  const coldFiles = coldUrls.map(url => { const file = healthy.js.find(item => item.url === url); assert(file && file.status === 200); physical(reports.fixed.folder, file.bodyReceipt); physical(reports.fixed.folder, file.gzipReceipt); return file; });
  assert.deepEqual(cold, { healthyCaseId: healthy.id, healthyRawReceipt: healthy.rawReceipt, jsRequestedBeforeOpen: healthy.jsRequestedBeforeOpen, urls: coldUrls, files: coldFiles });
  const offline = fixedReport.journeys.find(row => row.id === 'offline-retry'); assert.deepEqual(offline.coldAccountAssets, cold);
  const failedCold = offline.failures.filter(item => item.owned); assert(failedCold.length >= 1);
  assert.equal(offline.browserOfflineBeforeInjection, true); assert.equal(offline.controlledFailures.length, 1);
  const injected = offline.controlledFailures[0]; assert.equal(injected.action, 'deliberate cold-chunk abort'); assert.equal(injected.errorCode, 'internetdisconnected');
  assert.equal(injected.healthyCaseId, healthy.id); assert.deepEqual(injected.healthyRawReceipt, healthy.rawReceipt); assert(coldUrls.includes(injected.url));
  assert(Number.isInteger(injected.requestIndex) && injected.requestIndex >= 0); assert.equal(offline.requests[injected.requestIndex].url, injected.url); assert.equal(offline.requests[injected.requestIndex].owned, true);
  assert(failedCold.some(failure => failure.url === injected.url), 'The independently bound declared abort physically failed its actual request');
  for (const failure of failedCold) { assert(coldUrls.includes(failure.url), 'Every offline fault belongs to the separately observed healthy cold path'); assert.match(failure.error, /ERR_INTERNET_DISCONNECTED|ERR_FAILED|NS_ERROR_OFFLINE/i); }
  const weightsLog = fs.readFileSync(path.join(OUT, 'fixed', 'weights.log'), 'utf8'); assert.equal(fs.readFileSync(path.join(OUT, 'fixed', 'weights-exit.txt'), 'utf8').trim(), '0'); assert.equal((weightsLog.match(/^\s+(\/\S*)\s+\d+K gz over\s+\d+ files \(budget \d+K, \d+\.\d+K to the tenth\)$/gm) || []).length, 14); assert(!/^\s*FAIL:/m.test(weightsLog)); assert.match(weightsLog, /^sweepWeight: green\. Every page is inside its budget, and the budgets came down this round\.$/m);
  write(path.join(OUT, 'served-cost-comparison.json'), { status: 'complete', rows, scope: 'Same-installed-tools actual three-route boot requests. Original has no interactive-browser qualification; fixed has nine declared journeys. Full unchanged caps remain a separate mandatory verdict.' });
  console.log('All3 actual served boot costs are lower;owned auth holder deferred;9 fixed journeys and physical response receipts held.');
}
if (process.argv[2] === 'compare-browser') { compareBrowser(); process.exit(0); }
assert.equal(process.argv.length, 2, 'Only unit proof or compare-browser is supported');
for (const key of ['ACCOUNT_DIALOG_BASELINE_RAW_SHA256', 'ACCOUNT_DIALOG_PRODUCT_PATCH_SHA256']) assert.match(process.env[key] || '', /^[0-9a-f]{64}$/, 'Actual reviewed physical pin required: ' + key);
const folder = path.join(OUT, 'fixed-proof'); assert(!fs.existsSync(folder), 'Never overwrite prior evidence'); fs.mkdirSync(folder, { recursive: true });
const checkpoint = () => write(path.join(folder, 'report.json'), report), tracked = () => Object.fromEntries(git(['ls-files', '-z']).toString().split('\0').filter(Boolean).sort().map(file => [file, sha(read(file))]));
const before = tracked(), report = { status: 'running', qualified: false, head: git(['rev-parse', 'HEAD']).toString().trim(), baseline: BASELINE, runs: [], sourceHeld: false, scope: 'Three arms with six isolated single-case Vitest children each. Each child filters five declarations; aggregates retain actual selected observations and physical provenance. Served costs/browser/full budgets are separate actual workflow measurements.' }; write(path.join(folder, 'tracked.before.json'), before); checkpoint();
const receipt = file => { const bytes = fs.readFileSync(file); return { file: path.relative(folder, file).replaceAll('\\', '/'), bytes: bytes.length, sha256: sha(bytes) }; };
function runArm(name, original) {
  const arm = path.join(folder, name); fs.mkdirSync(arm);
  const row = { name, execution: 'six isolated Vitest processes, one selected case each', qualified: false, children: [] };
  report.runs.push(row); checkpoint();
  const aggregate = { version: 1, caseTitles: TITLES, cases: {} };
  const armSource = () => Object.fromEntries(Object.keys(before).map(file => [file, fs.existsSync(path.join(ROOT, file)) ? sha(read(file)) : null]));
  const expectedSource = { ...before };
  if (original) { for (const file of PRODUCTS.slice(0, -1)) expectedSource[file] = sha(git(['show', BASELINE + ':' + file])); expectedSource[PRODUCTS.at(-1)] = null; }
  assert.deepEqual(armSource(), expectedSource, 'Exact candidate or original whole source before isolated children');
  const sourceFile = path.join(arm, 'source.before.json'); write(sourceFile, expectedSource); row.source = receipt(sourceFile);
  const tool = { node: process.execPath, nodeVersion: process.version, vitestEntry: 'node_modules/vitest/vitest.mjs', vitestSha256: sha(read('node_modules/vitest/vitest.mjs')) };
  row.tools = tool; checkpoint();
  for (const [index, title] of TITLES.entries()) {
    assert.deepEqual(armSource(), expectedSource, 'Same complete candidate or original source throughout the arm: ' + name);
    assert.equal(sha(read(tool.vitestEntry)), tool.vitestSha256, 'Same actual Vitest entry throughout the arm');
    const key = KEYS[index], selected = path.join(arm, String(index + 1).padStart(2, '0') + '-' + key);
    fs.mkdirSync(selected);
    const unitFile = path.join(selected, 'units.json'), rawFile = path.join(selected, 'raw.json'), transport = path.join(selected, 'units.transport');
    const pattern = '^' + title.replace(/[.*+?^$()|[\]{}\\]/g, '\\$&') + '$';
    const cause = original ? FAULTS[title] : undefined;
    const args = ['node_modules/vitest/vitest.mjs', 'run', TEST, '--testNamePattern=' + pattern, '--maxWorkers=1', '--minWorkers=1', '--reporter=verbose', '--reporter=json', '--outputFile.json=' + unitFile];
    const child = spawnSync(process.execPath, args, { cwd: ROOT, env: { ...process.env, ACCOUNT_DIALOG_RAW: rawFile, SIM_OFFLINE_RECEIPT: transport, FORCE_COLOR: '0', NO_COLOR: '1' }, encoding: 'utf8', timeout: 120000, maxBuffer: 64 * 1024 * 1024 });
    for (const [file, body] of [['stdout.log', child.stdout], ['stderr.log', child.stderr]]) fs.writeFileSync(path.join(selected, file), body || '');
    const observed = { key, title, pattern, args, node: process.execPath, exit: child.status, error: child.error?.message || null, signal: child.signal, qualified: false,
      stdout: receipt(path.join(selected, 'stdout.log')), stderr: receipt(path.join(selected, 'stderr.log')) };
    row.children.push(observed);
    if (fs.existsSync(unitFile)) observed.units = receipt(unitFile); if (fs.existsSync(rawFile)) observed.raw = receipt(rawFile); checkpoint();
    process.stdout.write(child.stdout || ''); process.stderr.write(child.stderr || '');
    try {
    assert(!child.error && !child.signal && child.status === (cause ? 1 : 0), 'Actual isolated completed case: ' + name + '/' + title);
    assert(!SETUP.test((child.stdout || '') + (child.stderr || '')), 'Setup and transport errors never qualify');
    assert(!fs.existsSync(transport) || fs.readFileSync(transport).length === 0);
    const units = JSON.parse(fs.readFileSync(unitFile));
    assert.equal(units.success, !cause); assert.equal(units.numTotalTests, 6); assert.equal(units.numFailedTests, cause ? 1 : 0);
    assert.equal(units.numPassedTests, cause ? 0 : 1); assert.equal(units.numPendingTests, 5); assert.equal(units.numTodoTests, 0); assert.equal(units.testResults.length, 1);
    const suite = units.testResults[0]; assert.equal(path.resolve(suite.name), path.join(ROOT, TEST)); assert.equal(suite.status, cause ? 'failed' : 'passed');
    assert(!suite.message); assert.equal(suite.assertionResults.length, 6); assert.deepEqual(suite.assertionResults.map(item => item.title).sort(), [...TITLES].sort());
    for (const item of suite.assertionResults) {
      if (item.title !== title) { assert.equal(item.status, 'skipped', 'Exactly the other five frozen declarations are filtered'); assert.deepEqual(item.failureMessages, []); continue; }
      assert.equal(item.status, cause ? 'failed' : 'passed');
      if (!cause) { assert.deepEqual(item.failureMessages, []); continue; }
      assert.equal(item.failureMessages.length, 1); assert(item.failureMessages[0].includes(cause)); assert.match(item.failureMessages[0], /AssertionError/);
      assert.match(item.failureMessages[0], /expected false to be true/); assert(!SETUP.test(item.failureMessages[0]));
    }
    const raw = JSON.parse(fs.readFileSync(rawFile)); assert.equal(raw.version, 1); assert.deepEqual(raw.caseTitles, TITLES); assert.deepEqual(Object.keys(raw.cases), [key], 'Only the actually executed selected case emits an observation');
    const value = raw.cases[key]; assert.equal(value.title, title); assert.deepEqual(Object.keys(value.backend).sort(), ['from', 'resetPasswordForEmail', 'rpc', 'signIn', 'signOut', 'signUp']);
    assert(Object.values(value.backend).every(count => count === 0)); assert.deepEqual(index < 3 ? value.closed.stores : value.after, value.before);
    aggregate.cases[key] = value; observed.completion = { selected: 1, pending: 5, passed: cause ? 0 : 1, preciseBooleanFaults: cause ? 1 : 0, cause: cause || null };
    observed.qualified = true;
    } catch (error) { observed.validationError = error?.stack || String(error); }
    assert.equal(sha(read(tool.vitestEntry)), tool.vitestSha256); assert.deepEqual(armSource(), expectedSource, 'No source mixing across physical child observations');
    checkpoint();
  }
  assert.equal(row.children.length, 6); row.validatedChildren = row.children.filter(child => child.qualified).length; checkpoint();
  assert(row.children.every(child => child.qualified), 'All six actual isolated cases must qualify before any aggregate or next source arm');
  assert.deepEqual(Object.keys(aggregate.cases), KEYS);
  const rawFile = path.join(arm, 'raw.json'); write(rawFile, aggregate); row.raw = receipt(rawFile);
  row.aggregate = { origin: 'Selected case objects from the six retained single-case raw files, in frozen KEY order; not one six-case Vitest process',
    children: row.children.map(child => ({ key: child.key, title: child.title, raw: child.raw })), completed: 6, passed: original ? 3 : 6, preciseBooleanFaults: original ? 3 : 0 };
  checkpoint();
  const bytes = fs.readFileSync(rawFile), raw = JSON.parse(bytes); assert.equal(raw.version, 1); assert.deepEqual(raw.caseTitles, TITLES); assert.deepEqual(Object.keys(raw.cases).sort(), [...KEYS].sort());
  for (const [index, key] of KEYS.entries()) { const value = raw.cases[key]; assert.equal(value.title, TITLES[index]); assert.deepEqual(Object.keys(value.backend).sort(), ['from', 'resetPasswordForEmail', 'rpc', 'signIn', 'signOut', 'signUp']); assert(Object.values(value.backend).every(count => count === 0)); assert.deepEqual(index < 3 ? value.closed.stores : value.after, value.before); }
  for (const [index, key] of KEYS.slice(0, 3).entries()) { const value = raw.cases[key]; assert.equal(value.initial.dialogPresent, false); for (const count of ['factoryEvaluations', 'realImports', 'mounts']) { assert.equal(value.initial[count], original ? 1 : 0); assert.equal(value.opened[count], 1); assert.equal(value.closed[count], 1); } assert.equal(value.initial.unmounts, 0); assert.equal(value.closed.unmounts, 0); assert.equal(value.closed.dialogPresent, false); assert.equal(value.closed.openerFocused, true); assert.equal(value.opened.form.focusInside, true); assert.equal(value.opened.form.heading, index === 0 ? 'Welcome Back!' : 'Join DoUKnowBall'); for (const stores of [value.initial.stores, value.opened.form.stores]) assert.deepEqual(stores, value.before); }
  row.qualified = true; checkpoint(); return { bytes, raw };
}

const candidate = Object.fromEntries(PRODUCTS.map(file => [file, read(file)])); let normal, original, restored;
try {
  assert.equal(git(['status', '--porcelain', '--untracked-files=no']).toString(), ''); git(['merge-base', '--is-ancestor', BASELINE, report.head]);
  git(['diff', '--exit-code', BASELINE, report.head, '--', 'src', 'scripts', 'public', 'index.html', 'package.json', 'package-lock.json', 'bun.lock', 'bun.lockb', ...[...PRODUCTS, SELF, BROWSER, TEST].map(file => ':!' + file)]);
  assert.equal(sha(read(TEST)), TEST_SHA, 'Exact current scoped-query test body');
  const testCurrent = read(TEST).toString('utf8'); let testOriginal = testCurrent;
  for (const span of TEST_METHOD_SPANS) { assert.notEqual(span.from, span.to); assert.equal(testOriginal.split(span.to).length - 1, 1, 'Each test method inverse is unique and effective'); testOriginal = testOriginal.replace(span.to, span.from); }
  assert.equal(sha(Buffer.from(testOriginal)), TEST_ORIGINAL_SHA); assert.deepEqual(Buffer.from(testOriginal), git(['show', BASELINE + ':' + TEST]), 'Whole test inverse exactly reconstructs the qualified original method');
  const testCurrentFile = path.join(folder, 'test.current.tsx'), testOriginalFile = path.join(folder, 'test.original.tsx'), testSpansFile = path.join(folder, 'test.method-spans.json');
  fs.writeFileSync(testCurrentFile, testCurrent); fs.writeFileSync(testOriginalFile, testOriginal); write(testSpansFile, TEST_METHOD_SPANS);
  report.testMethod = { current: receipt(testCurrentFile), original: receipt(testOriginalFile), spans: receipt(testSpansFile), originalRef: BASELINE, inverseReconstructsWholeOriginal: true,
    scope: 'Only the heading query is scoped to the accessible current dialog on every retry. Hidden defaults and the existing one-second timeout are unchanged; no cause or product conclusion is assigned from this experiment.' }; checkpoint();
  assert.equal(sha(read(BASE_PROOF)), BASE_PROOF_SHA); assert.deepEqual(read(BASE_PROOF), git(['show', BASELINE + ':' + BASE_PROOF])); assert.deepEqual(read(OLD), git(['show', BASELINE + ':' + OLD]));
  for (const file of [...PRODUCTS, SELF, BROWSER]) assert.deepEqual(read(file), git(['show', report.head + ':' + file]), 'Exact committed candidate body: ' + file);
  const patch = git(['diff', '--binary', '--full-index', BASELINE, report.head, '--', ...PRODUCTS]); assert(patch.length > 0); assert.equal(sha(patch), process.env.ACCOUNT_DIALOG_PRODUCT_PATCH_SHA256, 'Only the exact root-reviewed product patch is inverted'); const patchFile = path.join(folder, 'product.patch'); fs.writeFileSync(patchFile, patch); report.productPatch = receipt(patchFile); checkpoint();
  normal = runArm('normal', false); git(['apply', '--reverse', '--check', patchFile]); git(['apply', '--reverse', patchFile]);
  for (const file of PRODUCTS.slice(0, -1)) assert.deepEqual(read(file), git(['show', BASELINE + ':' + file]), 'Whole original owned file: ' + file); assert(!fs.existsSync(path.join(ROOT, PRODUCTS.at(-1))), 'Only the owned new boundary is removed for the original arm');
  original = runArm('original', true); assert.equal(sha(original.bytes), process.env.ACCOUNT_DIALOG_BASELINE_RAW_SHA256, 'Full original raw bytes match the physically qualified original baseline');
} catch (error) { report.error = error?.stack || String(error); checkpoint(); throw error; }
finally { for (const [file, bytes] of Object.entries(candidate)) fs.writeFileSync(path.join(ROOT, file), bytes); const after = tracked(); write(path.join(folder, 'tracked.after-original.json'), after); report.sourceHeld = JSON.stringify(after) === JSON.stringify(before); checkpoint(); assert.deepEqual(after, before, 'Exact complete candidate restored even after any failed original arm'); }
try {
  restored = runArm('restored', false); assert.deepEqual(restored.bytes, normal.bytes, 'Restored actual full raw bytes equal normal');
  for (const key of KEYS.slice(3)) assert.deepEqual(normal.raw.cases[key], original.raw.cases[key], 'Every complete original preservation outcome is held: ' + key);
  assert.deepEqual(tracked(), before, 'Every source body held after restored execution'); report.status = 'complete'; report.qualified = true; checkpoint(); write(path.join(folder, 'summary.json'), report);
} catch (error) { report.error = error?.stack || String(error); checkpoint(); throw error; }
console.log('Account dialog fixed proof:18 isolated Vitest children (6 normal,3 exact original faults+3 whole preserves,6 restored), each with5 filtered declarations;full original aggregate baseline and normal/restored aggregate raw bytes held.');
