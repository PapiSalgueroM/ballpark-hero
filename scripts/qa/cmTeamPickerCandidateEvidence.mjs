import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gunzipSync, gzipSync } from 'node:zlib';

const argv = process.argv.slice(2);
const get = name => {
  const i = argv.indexOf(name);
  assert(i >= 0 && argv[i + 1] !== undefined, 'missing ' + name);
  return argv[i + 1];
};
const out = path.resolve(get('--out'));
const specPath = path.resolve(get('--spec'));
const arm = get('--arm');
assert(['fixed', 'eager-wire', 'restored', 'compare'].includes(arm), 'literal candidate arm');
const exit = arm === 'compare' ? null : Number(get('--exit-code'));
const original = path.resolve(get('--original'));
const eager = arm === 'eager-wire';
const wanted = { success: !eager, passed: eager ? 4 : 5, failed: eager ? 1 : 0, native: eager ? 1 : 0, initialTeamBodies: eager ? 1 : 0 };
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const root = process.cwd();
const dist = path.resolve(root, 'dist');
const sha = value => createHash('sha256').update(value).digest('hex');
const gitBlob = bytes => createHash('sha1').update(Buffer.from('blob ' + bytes.length + '\0')).update(bytes).digest('hex');
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const filePin = file => { const bytes = fs.readFileSync(file); return { bytes: bytes.length, sha256: sha(bytes), gitBlob: gitBlob(bytes) }; };
const U = { $type: 'undefined' };
assert.equal(spec.status, 'CANDIDATE_THREE_ARM');
for (const value of [spec.candidate.commit, spec.candidate.tree, spec.candidate.pageBlob, spec.candidate.leafBlob, spec.fault.pageBlob]) assert(/^[a-f0-9]{40}$/.test(value), 'unbound candidate source');
for (const value of [spec.original.zipSHA256, spec.original.admissionSHA256, spec.original.independentAdmissionSHA256]) assert(/^[a-f0-9]{64}$/.test(value), 'unbound admitted original');
assert(/^\d+$/.test(spec.original.artifact), 'unbound original artifact');
const reference = json(path.join(original, 'reference-auth.json'));
assert.equal(reference.artifact, spec.original.artifact);
assert.equal(reference.bytes, spec.original.zipBytes);
assert.equal(reference.sha256, spec.original.zipSHA256);
const originalAdmissionBytes = fs.readFileSync(path.join(original, 'ORIGINAL-ADMITTED.json'));
assert.equal(sha(originalAdmissionBytes), spec.original.admissionSHA256);
const originalAdmission = JSON.parse(originalAdmissionBytes.toString('utf8'));
assert.equal(originalAdmission.status, 'ADMITTED_ORIGINAL_FOUR_HELD_ONE_EXECUTABLE_OWNED');
assert.equal(originalAdmission.completeRawCount, 5);
assert.equal(originalAdmission.sourceProof.helperPins.find(row => row.path === spec.testFile)?.gitBlob, spec.frozen.test);
assert.equal(originalAdmission.sourceProof.helperPins.find(row => row.path === 'scripts/qa/cmTeamPickerOriginalProbe.mjs')?.gitBlob, spec.frozen.probe);
assert.equal(spec.fault.operations.length, 2, 'one source wire mechanism, two frozen spans');
assert.notEqual(spec.candidate.pageBlob, spec.fault.pageBlob);
for (const op of spec.fault.operations) assert(op.before && op.after && op.before !== op.after && op.count === 1);
const originalRaws = new Map();
for (const row of originalAdmission.rawPins) {
  const stored = fs.readFileSync(path.join(original, row.file));
  const decoded = gunzipSync(stored);
  assert.equal(stored.length, row.storedBytes); assert.equal(sha(stored), row.storedSHA256);
  assert.equal(decoded.length, row.decodedBytes); assert.equal(sha(decoded), row.decodedSHA256);
  originalRaws.set(path.basename(row.file), { stored, decoded, value: JSON.parse(decoded.toString('utf8')), pin: row });
}
assert.equal(originalRaws.size, 5);
assert.equal(spec.base.commit, '3b14650d360b010b25b525de33a5f32f33de2798');
assert.equal(spec.base.tree, 'd9278a7b5f58395509f6ab937f918c1c2ef31127');
const pagePin = eager ? spec.fault.pageBlob : spec.candidate.pageBlob;
const effectiveSources = [...spec.sourcePins, { path: spec.candidate.pagePath, gitBlob: pagePin }, { path: spec.candidate.leafPath, gitBlob: spec.candidate.leafBlob }];
for (const row of [...effectiveSources, ...spec.helperPins]) {
  const actual = filePin(path.resolve(root, row.path));
  assert.equal(actual.gitBlob, row.gitBlob, 'exact input source ' + row.path);
  if (row.sha256) assert.equal(actual.sha256, row.sha256, 'exact input SHA ' + row.path);
}
if (arm === 'compare') {
  const reports = new Map(), rawBytes = new Map(), bodyRows = new Map();
  for (const name of ['fixed', 'eager-wire', 'restored']) {
    const folder = path.join(out, 'replay', name);
    const admittedBytes = fs.readFileSync(path.join(folder, 'ARM-ADMITTED.json'));
    const admitted = JSON.parse(admittedBytes.toString('utf8'));
    assert.equal(admitted.status, 'ADMITTED_CANDIDATE_ARM');
    assert.equal(admitted.arm, name);
    reports.set(name, { bytes: admittedBytes.length, sha256: sha(admittedBytes), admitted });
    const records = new Map();
    for (const row of admitted.rawPins) {
      const stored = fs.readFileSync(path.join(folder, row.file)), decoded = gunzipSync(stored);
      assert.equal(sha(stored), row.storedSHA256); assert.equal(sha(decoded), row.decodedSHA256);
      records.set(path.basename(row.file), { stored, decoded, value: JSON.parse(decoded.toString('utf8')) });
    }
    rawBytes.set(name, records);
    const ledger = fs.readFileSync(path.join(folder, 'dist-after.sha256'));
    bodyRows.set(name, ledger);
    assert.equal(sha(ledger), admitted.distLedgerSHA256);
  }
  const sameHeld = (actual, expected, label) => {
    for (const row of spec.cases.slice(0, 4)) {
      const got = actual.get(row.raw), want = expected.get(row.raw);
      assert(got && want);
      assert(got.stored.equals(want.stored), 'CM_TEAM_PICKER_HELD_GZIP ' + label + ' ' + row.raw);
      assert(got.decoded.equals(want.decoded), 'CM_TEAM_PICKER_HELD_RAW ' + label + ' ' + row.raw);
    }
  };
  sameHeld(rawBytes.get('fixed'), originalRaws, 'admitted-original/fixed');
  sameHeld(rawBytes.get('eager-wire'), rawBytes.get('fixed'), 'fixed/eager-wire');
  sameHeld(rawBytes.get('restored'), rawBytes.get('fixed'), 'fixed/restored');
  const first = spec.cases[0].raw;
  const real = rawBytes.get('fixed').get(first), copied = JSON.parse(real.decoded.toString('utf8'));
  assert(copied.draws.length > 0, 'authentic nonempty business tape for control');
  const removed = copied.draws.pop();
  const changed = Buffer.from(JSON.stringify(copied), 'utf8');
  assert(!changed.equals(real.decoded), 'copied actual draw omission changed bytes');
  const fakeRecords = new Map(rawBytes.get('fixed'));
  fakeRecords.set(first, { ...real, decoded: changed, stored: real.stored });
  let owned = null;
  try { sameHeld(fakeRecords, rawBytes.get('fixed'), 'copied-control'); } catch (error) {
    assert.equal(error.name, 'AssertionError');
    assert(String(error.message).includes('CM_TEAM_PICKER_HELD_RAW'));
    owned = { name: error.name, message: error.message };
  }
  assert(owned, 'same complete RAW validator rejects authentic draw omission');
  copied.draws.push(removed);
  assert(Buffer.from(JSON.stringify(copied), 'utf8').equals(real.decoded), 'copied full RAW inverse');
  const fixedRows = bodyRows.get('fixed').toString('utf8').trim().split('\n').map(line => line.replace(/ \*?dist\//, ' '));
  const restoredRows = bodyRows.get('restored').toString('utf8').trim().split('\n').map(line => line.replace(/ \*?dist\//, ' '));
  assert.deepEqual(restoredRows, fixedRows, 'complete restored per-file dist identity');
  const fixedSource = fs.readFileSync(path.join(out, 'source-before.sha256'));
  const finalSource = fs.readFileSync(path.join(out, 'source-after.sha256'));
  assert(fixedSource.equals(finalSource), 'complete final source identity');
  const final = {
    status: 'ADMITTED_THREE_ARM_COLD_BOUNDARY_AND_HELD_UI', arms: Object.fromEntries(reports),
    original: spec.original, candidate: spec.candidate,
    fourBusinessRecordsWholeExact: true,
    eagerMechanisms: 1, physicalSourceFault: spec.fault,
    copiedActualTapeControl: { changed: true, owned, wholeInverse: true },
    restoredCompleteDistHeld: true, finalFullSourceHeld: true,
    byteComparison: {
      original: originalAdmission.bodyProbe,
      fixed: reports.get('fixed').admitted.bodyProbe,
      eager: reports.get('eager-wire').admitted.bodyProbe,
      restored: reports.get('restored').admitted.bodyProbe,
      initialGzipDelta: reports.get('fixed').admitted.bodyProbe.initialGzipBytes - originalAdmission.bodyProbe.initialGzipBytes,
      settledGzipDelta: reports.get('fixed').admitted.bodyProbe.settledGzipBytes - originalAdmission.bodyProbe.settledGzipBytes,
      allGzipDelta: reports.get('fixed').admitted.bodyProbe.allGzipBytes - originalAdmission.bodyProbe.allGzipBytes,
      arbitrarySavingsThreshold: null, savingsBenefitNotAutomaticallyAdmitted: true,
    },
    limits: 'Full fifth natural HTTP recordings and complete difference receipts remain retained. No false real-time whole-byte equality, private-fork, native visual, public or new-league claim.',
  };
  const closingBytes = Buffer.from(JSON.stringify(final, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(out, 'FINAL-CANDIDATE-ADMITTED.json'), closingBytes);
  const mapLedger = file => Object.fromEntries(fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map(line => {
    const match = line.match(/^([a-f0-9]{64}) [ *](.*)$/); assert(match, 'full source ledger line'); return [match[2], match[1]];
  }));
  const distBefore = reports.get('fixed').admitted.completeDist.map(row => ({ file: row.path, bytes: row.bytes, sha256: row.sha256 })).sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0);
  const compiled = json(path.join(out, 'replay/fixed/build-proof.json'));
  const manifest = {
    schema: 'CM_TEAM_PICKER_NATIVE_SOURCE_DIST_V1', status: 'QUALIFIED_FIXED_BUILD_NATIVE_INPUT',
    product: { commit: spec.candidate.commit, tree: spec.candidate.tree },
    core: spec.candidate.commit,
    sourceBefore: mapLedger(path.join(out, 'source-before.sha256')),
    sourceAfter: mapLedger(path.join(out, 'source-after.sha256')),
    pins: [...spec.sourcePins, { path: spec.candidate.pagePath, gitBlob: spec.candidate.pageBlob }, { path: spec.candidate.leafPath, gitBlob: spec.candidate.leafBlob }, ...spec.helperPins],
    distBefore, distDigest: sha(Buffer.from(JSON.stringify(distBefore), 'utf8')),
    completedTar: compiled.tar,
    admissions: { original: spec.original.admissionSHA256, candidate: sha(closingBytes) },
    independentOriginalPeerSHA256: spec.original.independentAdmissionSHA256,
    limits: 'Actual candidate CI closing authority only; native activation separately binds Root-owned artifact and independent admissions. No fixtures, model bundle or natural save generated.',
  };
  fs.writeFileSync(path.join(out, 'native-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log('CM Team-picker candidate: fixed5, physical eager4held+samecoldowned, restored5; full four-business RAW and restored output held.');
  process.exit(0);
}

const types = json(path.join(out, 'types-passed.json'));
assert.equal(types.command, 'node_modules/.bin/tsc --noEmit -p tsconfig.app.json');
assert.equal(types.exit, 0, 'proper types before cases');
const build = json(path.join(out, 'build-passed.json'));
assert.equal(build.command, 'npm run build');
assert.equal(build.exit, 0, 'actual fresh unchanged-original build');
assert.equal(fs.readFileSync(path.join(out, 'built/probe.exit'), 'utf8').trim(), '0', 'actual probe native0');
for (const name of ['types', 'probe', 'vitest', 'reader']) {
  assert.equal(fs.statSync(path.join(out, 'transport', name + '.log')).size, 0, 'silent offline ' + name);
}
const streams = {
  stdout: fs.readFileSync(path.join(out, 'logs/vitest.stdout.log'), 'utf8'),
  stderr: fs.readFileSync(path.join(out, 'logs/vitest.stderr.log'), 'utf8'),
};
const strip = text => text.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');
assert(!/\b(?:Unhandled Errors?|Uncaught Exception|unhandled rejection)\b/i.test(strip(streams.stdout + '\n' + streams.stderr)), 'no unhandled runtime output');
const reportBytes = fs.readFileSync(path.join(out, 'vitest.json'));
const report = JSON.parse(reportBytes.toString('utf8'));
function census(value) {
  assert.equal(value.success, wanted.success, 'arm overall JSON success');
  assert.equal(value.numTotalTests, 5);
  assert.equal(value.numPassedTests, wanted.passed);
  assert.equal(value.numFailedTests, wanted.failed);
  assert.equal(value.numPendingTests, 0);
  assert.equal(value.numTodoTests, 0);
  for (const name of ['numRuntimeErrorTestSuites', 'numRuntimeErrorTests', 'numRuntimeErrors', 'numUnhandledErrors']) {
    if (value[name] !== undefined) assert.equal(value[name], 0, name);
  }
  if (value.unhandledErrors !== undefined) assert.deepEqual(value.unhandledErrors, []);
  assert.equal(value.testResults.length, 1);
  const results = value.testResults.flatMap(row => row.assertionResults.map(test => ({ ...test, file: path.relative(root, row.name).replaceAll('\\', '/') })));
  assert.deepEqual(results.map(row => [row.file, row.fullName]), spec.cases.map(row => [spec.testFile, row.fullName]), 'CM_TEAM_PICKER_CASE_CENSUS');
  for (let i = 0; i < results.length; i += 1) {
    const row = results[i];
    const expected = i === 4 && eager ? 'failed' : 'passed';
    assert.equal(row.status, expected);
    if (expected === 'passed') assert.deepEqual(row.failureMessages, []);
    else {
      assert(row.failureMessages.length > 0);
      for (const message of row.failureMessages) {
        const actual = strip(message).trim();
        assert(/^AssertionError\b/.test(actual), 'owned AssertionError only');
        assert(actual.includes('CM_TEAM_PICKER_COLD_DELIVERY'));
        assert(!/\b(?:TypeError|SyntaxError|ReferenceError|Cannot find module|Failed to resolve import)\b/.test(actual), 'no setup ownership');
      }
    }
  }
  return results;
}
assert.equal(exit, wanted.native, 'actual native arm exit');
const results = census(report);
const clone = structuredClone(report), whole = JSON.stringify(clone);
const removed = clone.testResults[0].assertionResults.splice(0, 1)[0];
assert.notEqual(JSON.stringify(clone), whole);
let omission = null;
try { census(clone); } catch (error) {
  assert.equal(error.name, 'AssertionError');
  assert(String(error.message).includes('CM_TEAM_PICKER_CASE_CENSUS'));
  omission = { name: error.name, message: error.message };
}
assert(omission, 'actual copied omission fires exact census validator');
clone.testResults[0].assertionResults.splice(0, 0, removed);
assert.equal(JSON.stringify(clone), whole);
census(clone);
const rawPins = [];
let importTape = null;
const raws = new Map();
for (const wanted of spec.cases) {
  const file = path.join(out, 'raw', wanted.raw);
  const stored = fs.readFileSync(file), bytes = gunzipSync(stored), value = JSON.parse(bytes.toString('utf8'));
  assert(stored.length > 0 && stored.length <= spec.limits.maxStoredPerRaw);
  assert(bytes.length > 0 && bytes.length <= spec.limits.maxDecodedPerRaw);
  assert(Array.isArray(value.importDraws));
  assert(Array.isArray(value.draws));
  for (const draw of [...value.importDraws, ...value.draws]) assert(Number.isFinite(draw) && draw >= 0 && draw < 1);
  if (importTape === null) importTape = value.importDraws; else assert.deepEqual(value.importDraws, importTape);
  assert.equal(value.seed, wanted.seedOrdinal);
  assert(Array.isArray(value.frames) && value.frames.length > 0);
  assert.deepEqual(value.fetches, []);
  assert.notEqual(value.value?.incomplete, true, 'no partial case capture');
  let last = 0;
  for (const frame of value.frames) {
    assert(Number.isSafeInteger(frame.globalAt) && frame.globalAt >= last && frame.globalAt <= value.draws.length);
    last = frame.globalAt;
    assert(Number.isSafeInteger(frame.rngState) && frame.rngState >= 0 && frame.rngState <= 0xffffffff);
    assert.equal(typeof frame.dom, 'string');
    assert.equal(typeof frame.text, 'string');
    assert.equal(typeof frame.storage.local, 'object');
    assert.equal(typeof frame.storage.session, 'object');
    if (frame.raw === null) assert.equal(frame.saved, null);
    else assert.deepEqual(JSON.parse(frame.raw), frame.saved, 'complete literal saved-frame parse');
  }
  const pin = {
    file: 'raw/' + wanted.raw, storedBytes: stored.length, storedSHA256: sha(stored),
    decodedBytes: bytes.length, decodedSHA256: sha(bytes), frames: value.frames.length,
    importDraws: value.importDraws.length, actionDraws: value.draws.length,
  };
  rawPins.push(pin); raws.set(wanted.id, value);
}
assert.equal(raws.get('current').value.grids.length, 27);
assert.equal(raws.get('current').value.grids.reduce((sum, row) => sum + row.names.length, 0), 454);
assert.deepEqual(raws.get('current').value.saved.managers.at(-1), [null, U, U], 'real Manager null emitted');
assert.deepEqual(raws.get('current').value.saved.calls.filter(row => row.name === 'confirmClub').at(-1).args, ['now', U, U, null, U], 'real page converts null to undefined positionally');
assert.equal(raws.get('historical-fixtures').value.historic.length, 4);
assert.equal(raws.get('custom-manager').value.children.length, 2);
const built = path.join(out, 'built');
const probeBytes = fs.readFileSync(path.join(built, 'report.json'));
const probe = JSON.parse(probeBytes.toString('utf8'));
assert.equal(probe.status, 'MEASURED_ACTUAL_UI_AND_BODIES');
assert.equal(probe.window.goto, 'load');
assert.equal(probe.window.afterLoadWaitMs, 1500);
assert.equal(probe.window.device, 'iPhone 13');
assert.equal(probe.teamBodies.length, 1);
assert.equal(probe.initialTeamBodies.length, wanted.initialTeamBodies, 'actual initial executable body arm policy');
assert.equal(probe.errors.length, 0);
assert(probe.teamRows.length > 0 && probe.frames.length >= 6);
assert.deepEqual(probe.bodyControl, {
  changed: true, owned: probe.bodyControl.owned, wholeInverse: true, actualReceiptHeld: true,
});
assert.equal(probe.bodyControl.owned.name, 'AssertionError');
assert(probe.bodyControl.owned.message.includes('CM_TEAM_PICKER_BODY_RECEIPT'));
assert.equal(probe.warmNewJsRequests.length, 0, 'warm Team revisit does not transfer another JS body');
const assetPins = [];
for (const body of probe.responses) {
  const retained = fs.readFileSync(path.join(built, body.file));
  const compiled = fs.readFileSync(path.join(dist, body.path));
  assert(retained.equals(compiled), 'actual response/completed body equality');
  assert.equal(retained.length, body.bytes);
  assert.equal(sha(retained), body.sha256);
  assert.equal(gzipSync(retained).length, body.gzipBytes);
  assert.equal(body.status, 200);
  assert.equal(body.teamImplementation, body.path.endsWith('.js') && /["']data-cm-board-wants["']\s*:/.test(retained.toString('utf8')), 'actual executable property shape');
  assert(/^[a-zA-Z0-9_./-]+$/.test(body.path) && !body.path.split('/').includes('..'));
  assert(/^bodies\/[a-f0-9]{64}\.(?:js|css)$/.test(body.file));
  assetPins.push({ path: body.path, bytes: body.bytes, sha256: body.sha256, gzipBytes: body.gzipBytes, requestId: body.id });
}
const requestIds = new Set(probe.requests.map(row => row.id));
for (const body of probe.responses) assert(requestIds.has(body.id));
const digestSet = rows => [...new Map(rows.map(row => [row.path, row])).values()];
assert.equal(probe.initialGzipBytes, digestSet(probe.initialFiles).reduce((sum, row) => sum + row.gzipBytes, 0));
assert.equal(probe.settledGzipBytes, digestSet(probe.settledFiles).reduce((sum, row) => sum + row.gzipBytes, 0));
assert.equal(probe.allGzipBytes, digestSet(probe.allFiles).reduce((sum, row) => sum + row.gzipBytes, 0));
assert.deepEqual(raws.get('cold-delivery').value, probe, 'complete actual built receipt used by owned assertion');
const html = fs.readFileSync(path.join(built, probe.routeHtml.file));
assert.equal(html.length, probe.routeHtml.bytes);
assert.equal(sha(html), probe.routeHtml.sha256);
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : [{ path: path.relative(dist, full).replaceAll('\\', '/'), ...filePin(full) }];
});
const completeDist = walk(dist).sort((a, b) => a.path.localeCompare(b.path));
const heldComparisons = [];
for (const row of spec.cases.slice(0, 4)) {
  const actual = fs.readFileSync(path.join(out, 'raw', row.raw));
  const old = originalRaws.get(row.raw);
  assert(actual.equals(old.stored), 'CM_TEAM_PICKER_HELD_GZIP admitted-original/' + arm + ' ' + row.raw);
  assert(gunzipSync(actual).equals(old.decoded), 'CM_TEAM_PICKER_HELD_RAW admitted-original/' + arm + ' ' + row.raw);
  heldComparisons.push({ file: row.raw, storedExact: true, decodedExact: true });
}
const coldCurrent = raws.get('cold-delivery'), coldOld = originalRaws.get('cold-delivery.json.gz').value;
for (const key of ['importDraws', 'seed', 'draws', 'fetches']) assert.deepEqual(coldCurrent[key], coldOld[key], 'complete fifth headless envelope ' + key);
assert.equal(coldCurrent.frames.length, coldOld.frames.length);
for (let i = 0; i < coldCurrent.frames.length; i += 1) {
  assert.deepEqual(Object.keys(coldCurrent.frames[i]), Object.keys(coldOld.frames[i]));
  for (const key of Object.keys(coldCurrent.frames[i])) {
    if (key !== 'value') assert.deepEqual(coldCurrent.frames[i][key], coldOld.frames[i][key], 'fifth headless frame field ' + key);
  }
}
const oldProbe = coldOld.value;
assert.deepEqual(probe.teamRows, oldProbe.teamRows, 'complete actual Team rendered rows');
for (const frame of probe.frames) {
  assert.equal(frame.value.local['dukb-club-manager-save'], undefined, 'no invented or changed probe game save');
  assert.equal(new URL(frame.value.url).pathname, '/club-manager');
}
const differences = [];
const allDiffs = (before, after, at = '$') => {
  if (JSON.stringify(before) === JSON.stringify(after)) return;
  if (before && after && typeof before === 'object' && typeof after === 'object' && Array.isArray(before) === Array.isArray(after)) {
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
    for (const key of keys) allDiffs(before[key], after[key], at + '/' + key);
  } else differences.push({ path: at, before: before === undefined ? { $type: 'undefined' } : before, after: after === undefined ? { $type: 'undefined' } : after });
};
allDiffs(oldProbe, probe);
const differenceBytes = Buffer.from(JSON.stringify({ role: 'Complete natural HTTP observation differences, not a stripped replacement RAW', differences }), 'utf8');
const differenceGzip = gzipSync(differenceBytes);
fs.writeFileSync(path.join(out, 'natural-http-differences.json.gz'), differenceGzip);
const sourcePage = fs.readFileSync(spec.candidate.pagePath);
assert.equal(gitBlob(sourcePage), pagePin);
if (eager) {
  let inverted = sourcePage.toString('utf8');
  for (let i = spec.fault.operations.length - 1; i >= 0; i -= 1) {
    const op = spec.fault.operations[i];
    assert.equal(inverted.split(op.after).length - 1, op.count, 'exact fault inverse span');
    inverted = inverted.split(op.after).join(op.before);
  }
  assert.equal(gitBlob(Buffer.from(inverted, 'utf8')), spec.candidate.pageBlob, 'whole physical eager fault inverse');
}
const distLedgerBytes = fs.readFileSync(path.join(out, 'dist-after.sha256'));

const admission = {
  status: 'ADMITTED_CANDIDATE_ARM', arm,
  base: spec.base, caseStatuses: results.map(row => ({ name: row.fullName, status: row.status, failureMessages: row.failureMessages })),
  report: { bytes: reportBytes.length, sha256: sha(reportBytes) },
  rawPins, completeRawCount: rawPins.length, moduleImportTape: importTape,
  bodyProbe: { bytes: probeBytes.length, sha256: sha(probeBytes), actualAssets: assetPins, initialGzipBytes: probe.initialGzipBytes, settledGzipBytes: probe.settledGzipBytes, allGzipBytes: probe.allGzipBytes, insideWindowTeamBodies: probe.insideWindowTeamBodies, initialTeamBodies: probe.initialTeamBodies },
  sourceProof: { inheritedPins: effectiveSources, helperPins: spec.helperPins, original: spec.original, candidate: spec.candidate, freshArmBuildNative0: true, actualPageBlob: pagePin, wholePhysicalFaultInverse: eager },
  copiedCensusControl: { changed: true, owned: omission, wholeInverse: true, actualReportBytesHeld: sha(fs.readFileSync(path.join(out, 'vitest.json'))) === sha(reportBytes) },
  completeDist, distLedgerSHA256: sha(distLedgerBytes), heldComparisons,
  naturalHttpWholeDifferences: { file: 'natural-http-differences.json.gz', count: differences.length, storedBytes: differenceGzip.length, storedSHA256: sha(differenceGzip), decodedBytes: differenceBytes.length, decodedSHA256: sha(differenceBytes), wholeOriginalAndCurrentRetained: true },
  limits: spec.limits,
  scope: 'Actual candidate arm only, unchanged5test statements. No automatic savings, private-fork, complete-suite, native visual, public or new-league claim. Outer workflow owns complete source/index/all-status/lock/build-reader/cap holds.',
};
fs.writeFileSync(path.join(out, 'ARM-ADMITTED.json'), JSON.stringify(admission, null, 2) + '\n');
console.log('CM Team-picker candidate arm admitted: ' + arm + '; complete RAW/bodies and all natural HTTP differences retained.');
