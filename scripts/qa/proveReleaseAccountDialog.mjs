/* Current-release account loading proof. Historical original-source receipts stay historical. */
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
const BASE = '67ec99568cb67c0d1bf287bef2629b6d35def549';
const SELF = 'scripts/qa/proveReleaseAccountDialog.mjs', WORKFLOW = '.github/workflows/release-account-dialog.yml';
const TEST = 'src/test/accountDialogOnDemand.test.tsx', OLD = 'src/test/authModalFocus.test.tsx', BROWSER = 'scripts/qa/playAccountDialogFocusReturn.mjs';
const TEST_SHA = 'f01fc74252c2f4604c60a1695702dea8bddc3b42f3c0968cbe56a4b7655460b0', BROWSER_SHA = '7afd8c7abd8d776762e52a9af18d652403a2c23f624bdd33e03e9ca5c3c20f8b';
const PATCH_SHA = '12b7af2a081790bbeac7a7e2ad7ce178f8ab9a2035e6a87e41fbd01661d44181';
const QUALIFIED = '27088bc0a618e650858cd6c588eb6d3f763a6e04';
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
function git(args) { const run = spawnSync('git', ['-c', 'core.autocrlf=false', ...args], { cwd: ROOT, timeout: 30000, maxBuffer: 64 * 1024 * 1024 }); assert(!run.error && !run.signal && run.status === 0, 'Actual Git operation: ' + args.join(' ')); return run.stdout; }
function physical(folder, receipt) { assert(receipt && typeof receipt.file === 'string' && !path.isAbsolute(receipt.file), 'Relative physical receipt required'); const file = path.resolve(folder, receipt.file); assert(file.startsWith(path.resolve(folder) + path.sep), 'Receipt stays within its actual arm'); const bytes = fs.readFileSync(file); assert.equal(bytes.length, receipt.bytes); assert.equal(sha(bytes), receipt.sha256); return bytes; }
const tracked = () => Object.fromEntries(git(['ls-files', '-z']).toString().split('\0').filter(Boolean).sort().map(file => [file, fs.existsSync(path.join(ROOT, file)) ? sha(read(file)) : null]));
function admission() {
  const head = git(['rev-parse', 'HEAD']).toString().trim(); assert.equal(git(['status', '--porcelain', '--untracked-files=no']).toString(), '', 'Committed clean source'); git(['merge-base', '--is-ancestor', BASE, head]);
  const changed = git(['diff', '--name-only', BASE, head, '--', 'src', 'scripts', 'public', 'index.html', 'package.json', 'package-lock.json', 'bun.lock', 'bun.lockb']).toString().trim().split('\n').filter(Boolean).sort();
  assert.deepEqual(changed, [...PRODUCTS, TEST, BROWSER, SELF].sort(), 'Only the five products and three new QA leaves differ from actual I');
  git(['diff', '--exit-code', BASE, head, '--', '.github/workflows', ':!' + WORKFLOW]);
  assert.equal(sha(read(TEST)), TEST_SHA); assert.equal(sha(read(BROWSER)), BROWSER_SHA);
  for (const file of [...PRODUCTS, TEST, BROWSER, SELF]) assert.deepEqual(read(file), git(['show', head + ':' + file]), 'Exact committed source: ' + file);
  assert.deepEqual(read(OLD), git(['show', BASE + ':' + OLD]), 'Original I focus test remains persistently unchanged');
  const patch = git(['diff', '--binary', '--full-index', BASE, head, '--', ...PRODUCTS]); assert.equal(patch.length, 7555); assert.equal(sha(patch), PATCH_SHA, 'Exact already-qualified product patch, applied to actual I');
  return { head, base: BASE, productPatch: { bytes: patch.length, sha256: sha(patch) }, testSha256: TEST_SHA, browserSha256: BROWSER_SHA, patch };
}
function receipt(folder, file) { const bytes = fs.readFileSync(file); return { file: path.relative(folder, file).replaceAll('\\', '/'), bytes: bytes.length, sha256: sha(bytes) }; }
function child(folder, name, args, extra = {}, expectedExit = 0) {
  const transport = path.join(folder, name + '.transport');
  const run = spawnSync(process.execPath, args, { cwd: ROOT, env: { ...process.env, ...extra, SIM_OFFLINE_RECEIPT: transport, NO_COLOR: '1', FORCE_COLOR: '0' }, encoding: 'utf8', timeout: 300000, maxBuffer: 64 * 1024 * 1024 });
  fs.writeFileSync(path.join(folder, name + '.stdout.log'), run.stdout || ''); fs.writeFileSync(path.join(folder, name + '.stderr.log'), run.stderr || '');
  const row = { name, args, exit: run.status, signal: run.signal, error: run.error?.message || null, stdout: receipt(folder, path.join(folder, name + '.stdout.log')), stderr: receipt(folder, path.join(folder, name + '.stderr.log')) };
  write(path.join(folder, name + '.child.json'), row);
  process.stdout.write(run.stdout || ''); process.stderr.write(run.stderr || '');
  assert(!run.error && !run.signal && run.status === expectedExit, 'Actual child completed: ' + name);
  assert(!fs.existsSync(transport) || fs.readFileSync(transport).length === 0, 'No ordinary child transport intent');
  return { row, output: (run.stdout || '') + (run.stderr || '') };
}
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
function unitProof() {
  const binding = admission(), folder = path.join(OUT, 'proof'); assert(!fs.existsSync(folder), 'Never overwrite proof'); fs.mkdirSync(folder, { recursive: true });
  const before = tracked(), candidate = Object.fromEntries(PRODUCTS.map(file => [file, read(file)]));
  const report = { status: 'running', qualified: false, ready: false, head: binding.head, base: BASE, execution: 'Three ordinary six-case Vitest processes, no selected or skipped declarations', arms: [], sourceHeld: false, limits: ['Actual current I source with only the declared five-file product inverse; no historical073 raw is reused as a current result.', 'Declared auth/provider fixtures avoid backend submission; JSON cannot retain undefined or reference identity.'] };
  const checkpoint = () => write(path.join(folder, 'report.json'), report); write(path.join(folder, 'tracked.before.json'), before); fs.writeFileSync(path.join(folder, 'product.patch'), binding.patch); report.productPatch = receipt(folder, path.join(folder, 'product.patch')); checkpoint();
  const originalSource = { ...before }; for (const file of PRODUCTS.slice(0, -1)) originalSource[file] = sha(git(['show', BASE + ':' + file])); originalSource[PRODUCTS.at(-1)] = null;
  function arm(name, original) {
    const dir = path.join(folder, name); fs.mkdirSync(dir); const expected = original ? originalSource : before; assert.deepEqual(tracked(), expected, 'Whole exact source before ' + name); write(path.join(dir, 'source.before.json'), expected);
    const unitFile = path.join(dir, 'units.json'), rawFile = path.join(dir, 'raw.json'); const row = { name, qualified: false }; report.arms.push(row); checkpoint();
    const result = child(dir, 'units', ['node_modules/vitest/vitest.mjs', 'run', TEST, '--maxWorkers=1', '--minWorkers=1', '--reporter=verbose', '--reporter=json', '--outputFile.json=' + unitFile], { ACCOUNT_DIALOG_RAW: rawFile }, original ? 1 : 0);
    Object.assign(row, result.row); if (fs.existsSync(unitFile)) row.units = receipt(dir, unitFile); if (fs.existsSync(rawFile)) row.raw = receipt(dir, rawFile); checkpoint();
    assert(!SETUP.test(result.output), 'Setup/import/transport errors cannot qualify'); const units = JSON.parse(fs.readFileSync(unitFile)), rawBytes = fs.readFileSync(rawFile), raw = JSON.parse(rawBytes);
    assert.equal(units.success, !original); assert.equal(units.numTotalTests, 6); assert.equal(units.numPassedTests, original ? 3 : 6); assert.equal(units.numFailedTests, original ? 3 : 0); assert.equal(units.numPendingTests, 0); assert.equal(units.numTodoTests, 0); assert.equal(units.testResults.length, 1);
    const suite = units.testResults[0]; assert.equal(path.resolve(suite.name), path.join(ROOT, TEST)); assert.equal(suite.status, original ? 'failed' : 'passed'); assert(!suite.message); assert.equal(suite.assertionResults.length, 6); assert.deepEqual(suite.assertionResults.map(item => item.title).sort(), [...TITLES].sort());
    for (const item of suite.assertionResults) { const cause = original && FAULTS[item.title]; assert.equal(item.status, cause ? 'failed' : 'passed'); if (!cause) assert.deepEqual(item.failureMessages, []); else { assert.equal(item.failureMessages.length, 1); assert(item.failureMessages[0].includes(cause)); assert.match(item.failureMessages[0], /AssertionError/); assert.match(item.failureMessages[0], /expected false to be true/); assert(!SETUP.test(item.failureMessages[0])); } }
    assert.equal(raw.version, 1); assert.deepEqual(raw.caseTitles, TITLES); assert.deepEqual(Object.keys(raw.cases), KEYS);
    for (const [index, key] of KEYS.entries()) { const value = raw.cases[key]; assert(value); assert.equal(value.title, TITLES[index]); assert.deepEqual(Object.keys(value.backend).sort(), ['from', 'resetPasswordForEmail', 'rpc', 'signIn', 'signOut', 'signUp']); assert(Object.values(value.backend).every(count => count === 0)); assert.deepEqual(index < 3 ? value.closed.stores : value.after, value.before); }
    for (const [index, key] of KEYS.slice(0, 3).entries()) { const value = raw.cases[key]; assert.equal(value.initial.dialogPresent, false); for (const count of ['factoryEvaluations', 'realImports', 'mounts']) { assert.equal(value.initial[count], original ? 1 : 0); assert.equal(value.opened[count], 1); assert.equal(value.closed[count], 1); } assert.equal(value.initial.unmounts, 0); assert.equal(value.closed.unmounts, 0); assert.equal(value.closed.dialogPresent, false); assert.equal(value.closed.openerFocused, true); assert.equal(value.opened.form.focusInside, true); assert.equal(value.opened.form.heading, index === 0 ? 'Welcome Back!' : 'Join DoUKnowBall'); for (const stores of [value.initial.stores, value.opened.form.stores]) assert.deepEqual(stores, value.before); }
    assert.deepEqual(tracked(), expected, 'Whole exact source after ' + name); write(path.join(dir, 'source.after.json'), tracked()); row.qualified = true; row.completed = 6; row.passed = original ? 3 : 6; row.preciseBooleanFaults = original ? 3 : 0; checkpoint(); return { raw, bytes: rawBytes };
  }
  let normal, original, restored;
  try { normal = arm('normal', false); const patchFile = path.join(folder, 'product.patch'); git(['apply', '--reverse', '--check', patchFile]); git(['apply', '--reverse', patchFile]); assert.deepEqual(tracked(), originalSource, 'Effective five-product inverse and all other source held'); original = arm('original', true); }
  catch (error) { report.error = error?.stack || String(error); checkpoint(); throw error; }
  finally { for (const [file, bytes] of Object.entries(candidate)) fs.writeFileSync(path.join(ROOT, file), bytes); assert.deepEqual(tracked(), before, 'Complete candidate restored even on failed original'); write(path.join(folder, 'tracked.after-original.json'), tracked()); report.sourceHeld = true; checkpoint(); }
  try { restored = arm('restored', false); assert.deepEqual(restored.bytes, normal.bytes, 'Complete normal/restored raw bytes held'); for (const key of KEYS.slice(3)) assert.deepEqual(normal.raw.cases[key], original.raw.cases[key], 'Whole original preservation outcome held: ' + key); assert.deepEqual(tracked(), before); report.status = 'complete'; report.qualified = true; report.completeRawRestored = true; report.preservedCases = 3; checkpoint(); write(path.join(folder, 'summary.json'), report); }
  catch (error) { report.error = error?.stack || String(error); checkpoint(); throw error; }
  console.log('Current release account proof:6 normal,3 exact eager faults+3 preserves on actual67ec,6 restored;complete normal/restored raw and full source held.');
}
function authChecks() {
  admission(); const dir = path.join(OUT, 'auth-checks'); assert(!fs.existsSync(dir)); fs.mkdirSync(dir); const original = read(OLD), before = tracked();
  const anchor = "  const dialog = await screen.findByRole('dialog');", inserted = "  await screen.findByRole('textbox', { name: 'Email' });\n";
  assert.equal(original.toString().split(anchor).length, 2); const observed = Buffer.from(original.toString().replace(anchor, inserted + anchor)); assert.notDeepEqual(observed, original); assert.deepEqual(Buffer.from(observed.toString().replace(inserted, '')), original); assert.deepEqual(observed, git(['show', QUALIFIED + ':' + OLD]), 'Exact previously qualified one-line readiness observer');
  fs.writeFileSync(path.join(dir, 'test.original.tsx'), original); fs.writeFileSync(path.join(dir, 'test.observed.tsx'), observed); write(path.join(dir, 'source.before.json'), before);
  const report = { status: 'running', qualified: false, observer: { path: OLD, original: receipt(dir, path.join(dir, 'test.original.tsx')), observed: receipt(dir, path.join(dir, 'test.observed.tsx')), qualifiedRef: QUALIFIED, originalRef: BASE, exactOneSpanInverse: true }, controls: [], sourceHeld: false, scope: 'Unchanged eight titles/assertions/controls/timeouts; only one temporary real-form readiness await, then exact source restoration.' }; const checkpoint = () => write(path.join(dir, 'report.json'), report); checkpoint();
  try { fs.writeFileSync(path.join(ROOT, OLD), observed); const during = { ...before, [OLD]: sha(observed) }; assert.deepEqual(tracked(), during); write(path.join(dir, 'source.during.json'), during);
    for (const control of ['', 'nofocus', 'accountonly']) { const name = control || 'normal'; const result = child(dir, name, ['scripts/simAuthModalFocus.mjs'], { AUTH_MODAL_FOCUS_CONTROL: control }); const expected = control === 'nofocus' ? 'six exact-opener cases rejected removed focus return' : control === 'accountonly' ? 'guest scoring disclosure rejected the account-only copy' : 'eight real-dialog checks passed'; assert(result.output.includes(expected)); assert(!/Unhandled Errors?|Unhandled Rejection|Uncaught Exception|SIM_OFFLINE_BLOCK/i.test(result.output)); report.controls.push({ ...result.row, qualified: true }); assert.deepEqual(tracked(), during); checkpoint(); }
    report.status = 'complete'; report.qualified = true;
  } catch (error) { report.error = error?.stack || String(error); checkpoint(); throw error; }
  finally { fs.writeFileSync(path.join(ROOT, OLD), original); assert.deepEqual(tracked(), before, 'All current I source restored after temporary observer'); write(path.join(dir, 'source.after.json'), tracked()); report.sourceHeld = true; checkpoint(); }
  console.log('Eight existing auth cases and both effective controls passed with the declared one-line temporary observer;whole current I test restored.');
}
function weights(variant) {
  assert(['original', 'fixed'].includes(variant)); const dir = path.join(OUT, variant), text = fs.readFileSync(path.join(dir, 'weights.log'), 'utf8'), exit = fs.readFileSync(path.join(dir, 'weights-exit.txt'), 'utf8').trim();
  const source = read('scripts/sweepWeight.mjs'); assert.deepEqual(source, git(['show', BASE + ':scripts/sweepWeight.mjs']), 'Current I weight source and limits held');
  const code = source.toString().replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''), block = code.match(/const BUDGETS\s*=\s*\[([\s\S]*?)\];/); assert(block);
  const budgets = Object.fromEntries([...block[1].matchAll(/\['([^']+)',\s*(\d+)\]/g)].map(row => [row[1], Number(row[2])])); assert.equal(Object.keys(budgets).length, 14);
  const rows = [...text.matchAll(/^\s+(\/\S*)\s+(\d+)K gz over\s+(\d+) files \(budget (\d+)K, (\d+\.\d+)K to the tenth\)$/gm)]; assert.equal(rows.length, 14); assert.equal(new Set(rows.map(row => row[1])).size, 14);
  for (const row of rows) { assert.equal(Number(row[4]), budgets[row[1]]); assert(Number(row[3]) > 0 && Number(row[5]) > 0); }
  const failures = [...text.matchAll(/^\s*FAIL:\s*(.*)$/gm)].map(row => row[1]), exceeding = rows.filter(row => Number(row[2]) > Number(row[4])).map(row => row[1]).sort(); assert.equal(failures.length, exceeding.length);
  for (const row of rows.filter(row => exceeding.includes(row[1]))) assert(failures.includes(`${row[1]}: ${row[2]}K of gzipped JavaScript against a budget of ${row[4]}K`));
  assert(!/Unhandled|TypeError:|ReferenceError:|SyntaxError:|cannot tell|DID NOT FIRE/i.test(text)); for (const number of [2, 3, 4]) assert(new RegExp('^' + number + '\\)', 'm').test(text), 'Every existing weight section ran');
  if (exit === '0') { assert.equal(failures.length, 0); assert.match(text, /^sweepWeight: green\. Every page is inside its budget, and the budgets came down this round\.$/m); }
  else { assert.equal(variant, 'original', 'Fixed candidate must pass every unchanged cap'); assert.equal(exit, '1'); assert.deepEqual(exceeding, ['/club-manager', '/deadline-day', '/manager-hot-seat']); assert.equal((text.match(/^sweepWeight: 3 failures\s*$/gm) || []).length, 1); }
  write(path.join(dir, 'weight-verdict.json'), { variant, exit: Number(exit), routeCount: 14, rows: rows.map(row => ({ route: row[1], roundedK: Number(row[2]), files: Number(row[3]), budgetK: Number(row[4]), tenthK: Number(row[5]) })), failures: exceeding, knownOriginalThreeRed: exit === '1', fixedAllGreen: variant === 'fixed' && exit === '0', scope: 'Actual full current-source sweep. Original red rows stay explicitly red, not a current-release qualification or cap waiver.' }); console.log(variant + ':actual14 route limits classified;original reds stay recorded and fixed must pass all14.');
}
const mode = process.argv[2] || 'units';
if (mode === 'compare-browser') compareBrowser();
else if (mode === 'weights') { assert.equal(process.argv.length, 4); weights(process.argv[3]); }
else if (mode === 'admission') { const binding = admission(); const { patch, ...json } = binding; write(path.join(OUT, 'source-admission.json'), json); console.log('Exact actual67ec source and qualified five-file patch bound.'); }
else if (mode === 'auth-checks') authChecks();
else { assert.equal(mode, 'units'); assert.equal(process.argv.length, 2); unitProof(); }
