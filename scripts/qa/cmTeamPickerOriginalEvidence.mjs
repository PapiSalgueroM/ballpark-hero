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
const exit = Number(get('--exit-code'));
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const root = process.cwd();
const dist = path.resolve(root, 'dist');
const sha = value => createHash('sha256').update(value).digest('hex');
const gitBlob = bytes => createHash('sha1').update(Buffer.from('blob ' + bytes.length + '\0')).update(bytes).digest('hex');
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const filePin = file => { const bytes = fs.readFileSync(file); return { bytes: bytes.length, sha256: sha(bytes), gitBlob: gitBlob(bytes) }; };
const U = { $type: 'undefined' };
assert.equal(spec.status, 'ORIGINAL_ONLY_FRESH_BUILD');
assert.equal(spec.base.commit, '3b14650d360b010b25b525de33a5f32f33de2798');
assert.equal(spec.base.tree, 'd9278a7b5f58395509f6ab937f918c1c2ef31127');
for (const row of [...spec.sourcePins, ...spec.helperPins]) {
  const actual = filePin(path.resolve(root, row.path));
  assert.equal(actual.gitBlob, row.gitBlob, 'exact input source ' + row.path);
  if (row.sha256) assert.equal(actual.sha256, row.sha256, 'exact input SHA ' + row.path);
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
  assert.equal(value.success, false, 'original overall success false');
  assert.equal(value.numTotalTests, 5);
  assert.equal(value.numPassedTests, 4);
  assert.equal(value.numFailedTests, 1);
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
    const row = results[i], wanted = spec.cases[i];
    assert.equal(row.status, wanted.expected);
    if (wanted.expected === 'passed') assert.deepEqual(row.failureMessages, []);
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
assert.equal(exit, 1, 'original native Vitest1');
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
assert.equal(probe.initialTeamBodies.length, 1, 'actual original eager implementation was measured');
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
const admission = {
  status: 'ADMITTED_ORIGINAL_FOUR_HELD_ONE_EXECUTABLE_OWNED',
  base: spec.base, caseStatuses: results.map(row => ({ name: row.fullName, status: row.status, failureMessages: row.failureMessages })),
  report: { bytes: reportBytes.length, sha256: sha(reportBytes) },
  rawPins, completeRawCount: rawPins.length, moduleImportTape: importTape,
  bodyProbe: { bytes: probeBytes.length, sha256: sha(probeBytes), actualAssets: assetPins, initialGzipBytes: probe.initialGzipBytes, settledGzipBytes: probe.settledGzipBytes, allGzipBytes: probe.allGzipBytes, insideWindowTeamBodies: probe.insideWindowTeamBodies, initialTeamBodies: probe.initialTeamBodies },
  sourceProof: { inheritedPins: spec.sourcePins, helperPins: spec.helperPins, oldBuild: 'historical-only; not reused', freshOriginalBuildNative0: true },
  copiedCensusControl: { changed: true, owned: omission, wholeInverse: true, actualReportBytesHeld: sha(fs.readFileSync(path.join(out, 'vitest.json'))) === sha(reportBytes) },
  completeDist,
  limits: spec.limits,
  scope: 'Actual original behavior plus owned executable cold delivery only. No candidate, savings, private-fork, complete-suite, native visual or new-league claim. Outer workflow owns source/index/all-status/lock/build-reader/cap holds.',
};
fs.writeFileSync(path.join(out, 'ORIGINAL-ADMITTED.json'), JSON.stringify(admission, null, 2) + '\n');
console.log('CM Team-picker original admitted: 4 held, 1 actual executable cold-delivery AssertionError; complete RAW and bodies retained.');
