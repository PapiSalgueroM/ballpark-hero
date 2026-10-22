import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { sha, OLD_CSS_SHA, prepareCopies } from './matrix1447-copies.candidate.mjs';
import { styleProof, styleControls } from './matrix1447-styles.candidate.mjs';

const configPath = path.resolve(process.argv[2]);
const configBody = fs.readFileSync(configPath), config = JSON.parse(configBody);
const inputPins = new Map([[configPath, sha(configBody)]]);
const ROOT = path.resolve(config.repository), OUT = path.join(ROOT, config.outputName), DIST = path.join(ROOT, 'dist');
const FAMILY = ['original', 'radix', 'academy'], ARMS = ['green', 'old', 'restored'];
const counts = { original: 9, radix: 12, academy: 3 };
const hex = (value, length) => assert(new RegExp('^[a-f0-9]{' + length + '}$').test(value || ''), 'MATRIX_BINDING');
hex(config.greenSource, 40); assert.equal(process.env.GITHUB_SHA, config.greenSource, 'MATRIX_ACTUAL_CI_SOURCE');
assert(/^consent-dialog1447-matrix-[a-z0-9-]+$/.test(config.outputName), 'MATRIX_OUTPUT_NAME');
assert.equal(path.dirname(OUT), ROOT); assert(!fs.existsSync(OUT), 'MATRIX_FRESH_OUTPUT');
const pinned = (file, expected) => { hex(expected, 64); const body = fs.readFileSync(file); assert.equal(sha(body), expected, 'MATRIX_PIN: ' + file); return body; };
const input = reference => {
  const file = path.resolve(reference.file), body = pinned(file, reference.sha256);
  if (inputPins.has(file)) assert.equal(inputPins.get(file), reference.sha256, 'MATRIX_INPUT_REBIND_REFUSED');
  inputPins.set(file, reference.sha256); return body;
};
const methodFiles = ['runConsentDialogMatrix1447.candidate.mjs', 'matrix1447-copies.candidate.mjs', 'matrix1447-styles.candidate.mjs'];
assert.deepEqual(Object.keys(config.methodPins).sort(), [...methodFiles].sort(), 'MATRIX_METHOD_BINDINGS');
for (const name of methodFiles) input({ file: fileURLToPath(new URL(name, import.meta.url)), sha256: config.methodPins[name] });
const error = value => ({ name: value.name, message: value.message, stack: value.stack });
const sourceManifest = input(config.sourceManifest).toString();
const sourceRows = sourceManifest.trimEnd().split('\n').map(line => {
  const match = /^([a-f0-9]{64})  (?:\.\/)?(.+)$/.exec(line); assert(match, 'MATRIX_SOURCE_MANIFEST');
  assert(!path.isAbsolute(match[2]) && !match[2].split('/').includes('..') && !/[\\:]/.test(match[2]), 'MATRIX_SOURCE_PATH');
  return { file: match[2], sha256: match[1] };
});
assert.equal(sourceRows.length, config.sourceManifest.rows); assert.equal(new Set(sourceRows.map(row => row.file)).size, sourceRows.length);
const sourceHold = () => sourceRows.map(row => { const body = pinned(path.join(ROOT, row.file), row.sha256); return { ...row, bytes: body.length }; });
for (const family of FAMILY) {
  const driver = config.drivers[family];
  assert(sourceRows.some(row => row.file === driver.path && row.sha256 === driver.sha256), 'MATRIX_DRIVER_IN_REAL_SOURCE_MANIFEST');
}
assert(sourceRows.some(row => row.file === 'scripts/lib/playwrightLoader.mjs' && row.sha256 === config.loaderSha256), 'MATRIX_LOADER_SOURCE_PIN');
function inventory(directory, relative = '') {
  const rows = [];
  for (const name of fs.readdirSync(path.join(directory, relative)).sort()) {
    const child = relative ? relative + '/' + name : name, full = path.join(directory, child), stat = fs.lstatSync(full);
    if (stat.isDirectory()) rows.push(...inventory(directory, child));
    else { assert(stat.isFile() && !stat.isSymbolicLink(), 'MATRIX_REGULAR_FILE'); const body = fs.readFileSync(full); rows.push({ file: child, bytes: body.length, sha256: sha(body) }); }
  }
  return rows;
}
const localStyleLinks = html => {
  const readable = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<script\b[\s\S]*?<\/script\s*>/gi, '');
  return [...readable.matchAll(/<link\b[^>]*>/gi)].flatMap(([tag]) => {
    const rel = /\brel\s*=\s*["']([^"']+)["']/i.exec(tag), href = /\bhref\s*=\s*["']([^"']+)["']/i.exec(tag);
    return rel?.[1].toLowerCase() === 'stylesheet' && href?.[1].startsWith('/assets/') ? [href[1]] : [];
  });
};
const styles = localStyleLinks(fs.readFileSync(path.join(DIST, 'index.html'), 'utf8'));
assert.equal(styles.length, 1, 'MATRIX_ONE_ACTUAL_APP_STYLESHEET');
const cssPath = styles[0], cssURL = new URL(cssPath, 'http://127.0.0.1:4173');
assert.equal(cssURL.origin, 'http://127.0.0.1:4173'); assert(!cssURL.search && !cssURL.hash); assert(/^\/assets\/[A-Za-z0-9_-]+\.css$/.test(cssPath));
const greenCss = fs.readFileSync(path.join(DIST, '.' + cssPath)), greenCssSha = sha(greenCss), oldCss = input(config.oldCss);
assert.equal(sha(oldCss), OLD_CSS_SHA); assert.notEqual(greenCssSha, OLD_CSS_SHA, 'MATRIX_EFFECTIVE_OLD_CSS');
const baseline = {};
for (const family of FAMILY) {
  const binding = config.baselines[family]; hex(binding.source, 40); hex(binding.driverSha256, 64);
  assert(Number.isSafeInteger(binding.run) && binding.run > 0 && Number.isSafeInteger(binding.artifact) && binding.artifact > 0, 'MATRIX_BASELINE_TUPLE');
  const admission = JSON.parse(input(binding.admission)), raw = JSON.parse(input(binding.report));
  input(binding.originalAdmission);
  assert.equal(admission.normalizedFromSha256, binding.originalAdmission.sha256, 'MATRIX_NATIVE_ADMISSION_RECEIPT');
  assert.equal(admission.complete, true); assert.equal(admission.source, binding.source); assert.equal(admission.run, binding.run);
  assert.equal(admission.artifact, binding.artifact); assert.equal(admission.driverSha256, binding.driverSha256);
  assert.equal(admission.reportSha256, binding.report.sha256); assert.equal(admission.allManifestsAndSourceHoldsAdmitted, true);
  assert.equal(raw.source, binding.source); assert.equal(raw.complete, true); assert.equal(raw.cases.length, counts[family]);
  assert(raw.cases.every(row => row.foundation.status === 'PASS' && row.complete === true)); assert.deepEqual(raw.errors, []);
  assert.equal(config.drivers[family].sha256, binding.driverSha256);
  baseline[family] = raw;
}
assert.equal(baseline.original.status, 'ORIGINAL_GAPS_OBSERVED');
assert.equal(baseline.radix.status, 'PASS'); assert.equal(baseline.radix.healthy, true);
assert(['PASS', 'BASELINE_FAILURES_OBSERVED'].includes(baseline.academy.status));
const causes = (raw, family) => raw.cases.flatMap(row => row.actions.filter(action => action.status === (family === 'original' ? 'OBSERVED_FAILURE' : 'FAILED_ACTION')).map(action => {
  const marker = action.ownedAssertion?.message || '', cause = marker.startsWith('CONSENT_DIALOG1447_FIXED_BANNER_INTERCEPTION:') || marker.startsWith('ACADEMY1447_FIXED_BANNER_INTERCEPTION:') ? 'direct-cookie' : marker.startsWith('CONSENT_DIALOG1447_PENDING_SHELL_CLIPPING:') ? 'pending-shell-clipping' : null;
  assert(cause && action.ownedAssertion.name === 'AssertionError' && action.error.name === 'TimeoutError', 'MATRIX_ADMITTED_OWNED_CAUSE');
  return { caseId: row.id, label: action.label, phase: action.phase, cause };
})).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
const expectedOld = { original: causes(baseline.original, 'original'), academy: causes(baseline.academy, 'academy') };
assert(expectedOld.original.length > 0); assert.equal(baseline.academy.healthy, expectedOld.academy.length === 0);
fs.mkdirSync(OUT);
const write = (name, value) => fs.writeFileSync(path.join(OUT, name), typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value, null, 2) + '\n');
const report = { version: 1, source: config.greenSource, newProofMethod: true, complete: false, status: 'RUNNING', plannedContexts: 72,
  arms: [], errors: [], styles: [], styleControls: [], holds: {}, serverExits: [], requiredRootCompiledDifferenceReview: true, applicationQualified: false };
let server;
const ownedChild = (command, args, env, log, timeout) => {
  const fd = fs.openSync(log, 'w'), child = spawn(command, args, { cwd: ROOT, env, stdio: ['ignore', fd, fd] });
  let finished = false, spawnError, killTimer;
  const timer = timeout ? setTimeout(() => stop(), timeout) : null;
  const stop = () => {
    if (finished) return;
    child.kill('SIGTERM');
    if (!killTimer) killTimer = setTimeout(() => child.kill('SIGKILL'), 5000);
  };
  const done = new Promise(resolve => {
    child.once('error', value => { spawnError = error(value); });
    child.once('close', (code, signal) => {
      finished = true; clearTimeout(timer); clearTimeout(killTimer);
      let cleanupError; try { fs.closeSync(fd); } catch (value) { cleanupError = error(value); }
      resolve({ code, signal, ...(spawnError ? { spawnError } : {}), ...(cleanupError ? { cleanupError } : {}) });
    });
  });
  return { child, done, stop, get finished() { return finished; } };
};
const closeServer = async () => {
  if (!server) return;
  const owned = server; server = undefined;
  const alreadyFinished = owned.finished || owned.child.exitCode !== null || owned.child.signalCode !== null;
  const receipt = { arm: owned.arm, plannedClose: !alreadyFinished, alreadyFinished, complete: false };
  report.serverExits.push(receipt);
  try {
    if (!alreadyFinished) owned.stop();
    const actual = await owned.done; receipt.actual = actual;
    assert.equal(alreadyFinished, false, 'MATRIX_SERVER_UNEXPECTED_EARLY_EXIT');
    assert(!actual.spawnError && !actual.cleanupError, 'MATRIX_SERVER_PROCESS_CLEANUP');
    assert((actual.code === 0 && actual.signal === null) || (actual.code === null && actual.signal === 'SIGTERM'), 'MATRIX_SERVER_CLOSE_OUTCOME');
    receipt.complete = true;
  } catch (value) { receipt.error = error(value); throw value; }
};
const execute = (args, env, log, timeout = 360000) => new Promise(resolve => {
  ownedChild(process.execPath, args, env, log, timeout).done.then(resolve);
});
const ready = () => new Promise((resolve, reject) => {
  const req = http.get('http://127.0.0.1:4173/', res => { res.resume(); res.once('end', () => res.statusCode === 200 ? resolve() : reject(new Error('MATRIX_SERVER_HTTP'))); });
  req.setTimeout(2000, () => req.destroy(new Error('MATRIX_SERVER_TIMEOUT'))); req.once('error', reject);
});
const common = (raw, family) => {
  assert.equal(raw.phase, { original: 'original', radix: 'preservation-baseline', academy: 'academy-baseline' }[family]);
  assert.equal(raw.source, config.greenSource); assert.equal(raw.complete, true); assert.deepEqual(raw.errors, []);
  assert.equal(raw.actualContexts, counts[family]); assert.equal(raw.actualCompleteCases, counts[family]); assert.equal(raw.cases.length, counts[family]); assert.deepEqual(raw.unclassifiedCases, []);
  assert.deepEqual(raw.cases.map(row => row.id), baseline[family].cases.map(row => row.id), 'MATRIX_EXACT_BASELINE_CASES');
  for (let i = 0; i < raw.cases.length; i++) {
    const actionShape = row => row.actions.map(action => [action.phase, action.label]);
    assert.deepEqual(actionShape(raw.cases[i]), actionShape(baseline[family].cases[i]), 'MATRIX_EXACT_BASELINE_ACTIONS');
  }
  assert.equal(raw.holds.unchanged, true); assert.deepEqual(raw.holds.before, raw.holds.after); assert.deepEqual(raw.holds.distBefore, raw.holds.distAfter);
  assert.equal(raw.transportPredicateControls.length, 6); assert(raw.transportPredicateControls.every(row => row.networkAttempted === false && row.beforeSha256 !== row.afterSha256 && row.error.name === 'AssertionError'));
  assert.equal(raw.fontControls.length, counts[family] * 2); assert(raw.fontControls.every(row => row.beforeSha256 !== row.afterSha256 && row.absenceRejectedDespiteCheckTrue && row.networkAttempted === false));
  for (const row of raw.cases) {
    assert(row.complete && row.foundation.status === 'PASS' && !row.observerOverflow && row.bannerLeg.status === 'PASS' && row.bannerLeg.trustedReject);
    for (const key of ['blocked', 'pageErrors', 'consoleErrors']) assert.deepEqual(row[key], []);
    for (const key of ['error', 'finalError', 'closeError', 'collectionError', 'responseError']) assert(!row[key]);
    assert(row.actions.some(action => action.phase === 'answered' && action.status === 'PASS' && action.trustedClick));
    assert(row.cssResponses.length > 0);
  }
  const owned = causes(raw, family);
  const bannerCount = owned.filter(row => row.cause === 'direct-cookie').length;
  const clippingCount = owned.filter(row => row.cause === 'pending-shell-clipping').length;
  const controls = (rows, count, flag) => {
    assert.equal(rows.length, count);
    assert(rows.every(row => row.beforeSha256 !== row.afterSha256 && row[flag] === true && row.networkAttempted === false));
  };
  controls(raw.classificationControls || [], bannerCount * 5, 'classificationRefused');
  controls(raw.pendingShellClippingControls || [], clippingCount * 24, 'classificationRefused');
  if (family !== 'original') {
    const passes = raw.cases.flatMap(row => row.actions).filter(action => action.status === 'PASS').length;
    controls(raw.primaryGeometryControls, passes * 10, 'geometryRefused');
    assert(raw.primaryGeometryControls.every(row => row.error.name === 'AssertionError' && row.error.message.startsWith('RADIX1447_PRIMARY_')));
  }
};
try {
  const preload = path.join(ROOT, 'scripts/lib/offlineTransport.cjs');
  assert.equal((process.env.NODE_OPTIONS || '').trim().split(/\s+/)[0], '--require=' + preload);
  pinned(preload, config.offlineGuardSha256); report.holds.sourceBefore = sourceHold(); report.holds.distBefore = inventory(DIST);
  assert(process.env.FREE_KICK_FONT_CACHE, 'MATRIX_FONT_CACHE');
  report.holds.fontCacheBefore = inventory(process.env.FREE_KICK_FONT_CACHE);
  const copies = prepareCopies(ROOT, OUT, config.drivers); report.copies = copies.derivations; report.loader = copies.loader;
  assert.equal(copies.loader.sha256, config.loaderSha256);
  const proofInputs = inventory(path.join(OUT, 'qa')).map(row => ({ ...row, file: 'qa/' + row.file })).concat(inventory(path.join(OUT, 'lib')).map(row => ({ ...row, file: 'lib/' + row.file })));
  report.holds.proofCopiesBefore = proofInputs;
  const host = path.join(OUT, 'hostLikeServer.mjs'); fs.writeFileSync(host, input(config.serverCandidate));
  write('green-root.css', greenCss); write('admitted-old-root.css', oldCss); write('old-expectations.json', expectedOld);
  report.css = { path: cssPath, greenSha256: greenCssSha, oldSha256: OLD_CSS_SHA, sourceChangeReviewRequired: true };
  const diffFd = fs.openSync(path.join(OUT, 'compiled-css.patch'), 'w'), diffErr = fs.openSync(path.join(OUT, 'compiled-css-diff.log'), 'w');
  const diff = spawn('diff', ['-u', '--label', 'admitted-original.css', path.join(OUT, 'admitted-old-root.css'), '--label', 'green.css', path.join(OUT, 'green-root.css')], { stdio: ['ignore', diffFd, diffErr] });
  const diffExit = await new Promise(resolve => { diff.once('error', reject => resolve(null)); diff.once('close', code => resolve(code)); });
  fs.closeSync(diffFd); fs.closeSync(diffErr); assert.equal(diffExit, 1, 'MATRIX_COMPILED_DIFFERENCE_PRESENT');
  for (const arm of ARMS) {
    const armRow = { arm, families: [], complete: false }; report.arms.push(armRow);
    const capturedCss = [];
    const serverLog = path.join(OUT, arm + '-server.jsonl');
    const env = { ...process.env, NODE_OPTIONS: '--require=' + preload, MATRIX_ARM: arm, MATRIX_CSS_PATH: cssPath,
      MATRIX_GREEN_CSS_SHA256: greenCssSha, MATRIX_OLD_CSS_FILE: path.join(OUT, 'admitted-old-root.css'), MATRIX_SERVER_LOG: serverLog };
    server = ownedChild(process.execPath, [host, DIST, '4173'], env, path.join(OUT, arm + '-server.log'), 1200000); server.arm = arm;
    try {
      let started = false;
      for (let attempt = 0; attempt < 5; attempt++) { assert(!server.finished, 'MATRIX_OWN_SERVER_EXITED'); try { await ready(); started = true; break; } catch { await new Promise(resolve => setTimeout(resolve, 1000)); } }
      assert(started, 'MATRIX_SERVER_READY');
      for (const family of FAMILY) {
        const driverOut = path.join(OUT, arm + '-' + family), transport = path.join(OUT, arm + '-' + family + '.transport'); fs.writeFileSync(transport, '');
        const actual = await execute([copies.copies[arm][family]], { ...env, BASE: 'http://127.0.0.1:4173', SOURCE_SHA: config.greenSource, CONSENT_DIALOG_OUT: driverOut, SIM_OFFLINE_RECEIPT: transport }, path.join(OUT, arm + '-' + family + '.log'));
        const result = { family, driverExit: actual, complete: false }; armRow.families.push(result);
        try {
          assert(!actual.spawnError && !actual.signal); assert.equal(fs.statSync(transport).size, 0);
          const raw = JSON.parse(fs.readFileSync(path.join(driverOut, 'report.json'))); common(raw, family);
          if (arm === 'old' && family !== 'radix') {
            const expected = expectedOld[family]; assert.deepEqual(causes(raw, family), expected);
            assert.equal(actual.code, expected.length ? 1 : family === 'original' ? 2 : 0);
            assert.equal(raw.status, family === 'original' ? 'ORIGINAL_GAPS_OBSERVED' : expected.length ? 'BASELINE_FAILURES_OBSERVED' : 'PASS');
          } else {
            assert(raw.cases.every(row => row.status === 'PASS' && row.actions.every(action => action.status === 'PASS' && action.trustedClick)));
            assert.equal(actual.code, family === 'original' ? 2 : 0);
            assert.equal(raw.status, family === 'original' ? 'NO_REPRODUCTION' : 'PASS');
          }
          assert.equal(raw.exit, actual.code);
          for (const row of raw.cases) {
            if (arm !== 'old') {
              const observations = [{ phase: 'foundation', detail: row.foundation.detail }, ...row.actions.filter(action => action.phase.startsWith('pending')).map(action => ({ phase: action.phase + ':' + action.label, detail: family === 'original' ? action.before : action.deliveredClick?.primarySnapshot }))];
              for (const observed of observations) {
                assert(observed.detail, 'MATRIX_ACTUAL_PENDING_STYLE_OBSERVATION');
                report.styles.push({ arm, family, caseId: row.id, phase: observed.phase, proof: styleProof(observed.detail) });
                report.styleControls.push(...styleControls(observed.detail, arm + ':' + row.id + ':' + observed.phase));
              }
            }
            for (const css of row.cssResponses) {
              const body = fs.readFileSync(path.join(driverOut, css.file)); assert.equal(sha(body), css.sha256);
              const distBody = fs.readFileSync(path.join(DIST, '.' + css.path)), expected = arm === 'old' && css.path === cssPath ? OLD_CSS_SHA : sha(distBody);
              assert.equal(css.sha256, expected, 'MATRIX_ACTUAL_CSS_RESPONSE');
              capturedCss.push(JSON.stringify(['GET', css.path, css.sha256]));
            }
            const appResponses = row.cssResponses.filter(css => css.path === cssPath); assert(appResponses.length > 0, 'MATRIX_ACTUAL_APP_CSS_REQUIRED');
            if (arm === 'old') { assert.equal(row.counterfactualCssResponses.length, appResponses.length); assert(row.counterfactualCssResponses.every(value => value.path === cssPath && value.greenInventorySha256 === greenCssSha && value.servedSha256 === OLD_CSS_SHA && value.oldSha256 === OLD_CSS_SHA)); }
          }
          result.contexts = raw.actualContexts; result.reportSha256 = sha(fs.readFileSync(path.join(driverOut, 'report.json'))); result.complete = true;
        } catch (value) { result.error = error(value); report.errors.push({ arm, family, ...error(value) }); }
      }
    } finally { await closeServer(); }
    const requests = fs.readFileSync(serverLog, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
    for (const request of requests) {
      assert(['GET', 'HEAD'].includes(request.method)); assert.equal(request.status, 200);
      const expected = arm === 'old' && request.path === cssPath ? OLD_CSS_SHA : sha(fs.readFileSync(path.join(DIST, request.sourceFile)));
      assert.equal(request.sha256, expected, 'MATRIX_ONLY_APP_CSS_DIFFERENCE');
      assert.equal(request.overridden, arm === 'old' && request.path === cssPath);
    }
    const rootCssResponses = requests.filter(row => row.path === cssPath); assert(rootCssResponses.length > 0);
    const servedCss = requests.filter(row => row.path.endsWith('.css'));
    assert.deepEqual(servedCss.map(row => JSON.stringify([row.method, row.path, row.sha256])).sort(), capturedCss.sort(), 'MATRIX_EVERY_ACTUAL_CSS_RESPONSE_RECONCILED');
    const serverControls = JSON.parse(fs.readFileSync(serverLog + '.controls.json'));
    assert.equal(serverControls.complete, true); assert.equal(serverControls.arm, arm);
    assert.equal(serverControls.greenSha256, greenCssSha); assert.equal(serverControls.oldSha256, OLD_CSS_SHA);
    assert.deepEqual(serverControls.controls.map(row => row.name), ['method', 'path', 'query', 'file', 'green-body']);
    assert(serverControls.controls.every(row => row.beforeSha256 !== row.afterSha256 && row.rejected && row.networkAttempted === false && row.error.name === 'AssertionError' && row.error.message.startsWith('MATRIX_CSS_REQUEST')));
    armRow.serverRequests = requests.length; armRow.actualAppCssResponses = rootCssResponses.length;
    armRow.overrideResponses = requests.filter(row => row.overridden).length;
    armRow.complete = armRow.families.length === 3 && armRow.families.every(row => row.complete);
    write('matrix-report.json', report);
  }
} catch (value) { report.errors.push(error(value)); }
finally {
  try { await closeServer(); } catch (value) { report.errors.push(error(value)); }
  try {
    report.holds.sourceAfter = sourceHold(); report.holds.distAfter = inventory(DIST);
    assert.deepEqual(report.holds.sourceAfter, report.holds.sourceBefore); assert.deepEqual(report.holds.distAfter, report.holds.distBefore);
    report.holds.fontCacheAfter = inventory(process.env.FREE_KICK_FONT_CACHE); assert.deepEqual(report.holds.fontCacheAfter, report.holds.fontCacheBefore);
    const copiesAfter = inventory(path.join(OUT, 'qa')).map(row => ({ ...row, file: 'qa/' + row.file })).concat(inventory(path.join(OUT, 'lib')).map(row => ({ ...row, file: 'lib/' + row.file })));
    assert.deepEqual(copiesAfter, report.holds.proofCopiesBefore);
    assert.equal(sha(fs.readFileSync(path.join(OUT, 'green-root.css'))), greenCssSha); assert.equal(sha(fs.readFileSync(path.join(OUT, 'admitted-old-root.css'))), OLD_CSS_SHA);
    assert.equal(sha(fs.readFileSync(path.join(OUT, 'hostLikeServer.mjs'))), config.serverCandidate.sha256);
    report.holds.inputPins = [...inputPins].map(([file, sha256]) => { const body = pinned(file, sha256); return { file, sha256, bytes: body.length }; });
    report.holds.unchanged = true;
  } catch (value) { report.errors.push(error(value)); }
  report.actualContexts = report.arms.flatMap(arm => arm.families).reduce((sum, family) => sum + (family.contexts || 0), 0);
  report.complete = report.errors.length === 0 && report.holds.unchanged === true && report.arms.length === 3 && report.arms.every(arm => arm.complete) && report.actualContexts === 72 && report.serverExits.length === 3 && report.serverExits.every(row => row.complete);
  report.status = report.complete ? 'MATRIX_OUTCOMES_READY_FOR_ROOT_COMPILED_DIFF_REVIEW' : 'FAILED_OR_INCOMPLETE';
  write('matrix-report.json', report);
  const files = inventory(OUT).filter(row => row.file !== 'evidence.sha256');
  write('evidence.sha256', files.map(row => row.sha256 + '  ' + row.file).join('\n') + '\n');
}
console.log('CONSENT_DIALOG1447_MATRIX ' + JSON.stringify({ status: report.status, complete: report.complete, actualContexts: report.actualContexts, compiledDifferenceReviewOwed: true }));
process.exitCode = report.complete ? 0 : 1;
