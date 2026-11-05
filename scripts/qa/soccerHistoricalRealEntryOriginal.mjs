import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const arg = name => { const i = args.indexOf(name); assert(i >= 0 && args[i + 1], 'Missing ' + name); return args[i + 1]; };
const out = path.resolve(arg('--out')), specPath = path.resolve(arg('--spec')), childExit = Number(arg('--exit-code'));
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const plain = value => JSON.parse(JSON.stringify(value));
const strip = value => String(value).replace(/\x1b\[[0-9;]*m/g, '');
const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const write = (name, value) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const receipt = name => {
  const file = path.join(out, 'transport', name);
  assert(fs.existsSync(file), 'Missing actual offline receipt ' + name);
  assert.equal(fs.statSync(file).size, 0, 'Offline transport attempted ' + name);
};
function pins() {
  for (const [file, wanted] of Object.entries({ ...spec.sourcePins, [spec.test.path]: spec.test.blob }))
    assert.equal(execFileSync('git', ['hash-object', '--', file], { encoding: 'utf8' }).trim(), wanted, 'Source pin ' + file);
  const testBytes = fs.readFileSync(spec.test.path);
  assert.equal(testBytes.length, spec.test.bytes);
  assert.equal(digest(testBytes), spec.test.sha256);
}
function validate(result, nativeExit) {
  const suites = result.testResults;
  assert.equal(suites?.length, 1, 'SC_ENTRY_FILE_CENSUS');
  const actual = suites.flatMap(s => s.assertionResults ?? []);
  assert.equal(actual.length, 5, 'SC_ENTRY_CASE_CENSUS');
  assert.equal(new Set(actual.map(c => c.fullName)).size, 5, 'SC_ENTRY_CASE_CENSUS');
  assert.deepEqual(actual.map(c => c.fullName).sort(), spec.cases.map(c => c.fullName).sort(), 'SC_ENTRY_CASE_CENSUS');
  assert.equal(nativeExit, 1); assert.equal(result.success, false);
  assert.equal(result.numTotalTests, 5); assert.equal(result.numPassedTests, 2); assert.equal(result.numFailedTests, 3);
  for (const key of ['numPendingTests', 'numTodoTests']) assert.equal(result[key] ?? 0, 0, key);
  for (const key of ['numRuntimeErrorTestSuites', 'numRuntimeErrorTests', 'numUnhandledErrors'])
    if (result[key] !== undefined) assert.equal(result[key], 0, key);
  if (result.unhandledErrors !== undefined) assert.deepEqual(result.unhandledErrors, []);
  for (const wanted of spec.cases) {
    const found = actual.find(c => c.fullName === wanted.fullName);
    assert.equal(found.status, wanted.ownership === 'owned' ? 'failed' : 'passed', wanted.fullName);
    const failures = found.failureMessages ?? [];
    if (wanted.ownership === 'owned') {
      assert.equal(failures.length, 1, wanted.fullName);
      const message = strip(failures[0]).trim();
      assert(/^AssertionError:/.test(message), message);
      assert(message.includes(wanted.marker), message);
      assert(!/\b(TypeError|ReferenceError|SyntaxError|UnhandledRejection|uncaught)\b/i.test(message), message);
    } else assert.deepEqual(failures, []);
  }
  return actual.map(c => ({ fullName: c.fullName, status: c.status, failureMessages: c.failureMessages ?? [] }));
}

assert.equal(spec.schema, 1);
assert.equal(spec.parent, '484595fd4f7b07d24066e2de7bae5486483ae284');
assert.equal(spec.cases.length, 5);
assert.equal(spec.cases.filter(c => c.ownership === 'owned').length, 3);
assert.equal(spec.cases.filter(c => c.ownership === 'held').length, 2);
pins();
assert.equal(execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], { encoding: 'utf8' }), '', 'Clean original checkout');
const types = json(path.join(out, 'types-passed.json'));
assert.deepEqual(types, { command: 'node_modules/.bin/tsc --noEmit -p tsconfig.app.json', exit: 0 });
for (const name of ['types.log', 'vitest.log', 'reader.log']) receipt(name);
const logs = ['vitest.stdout.log', 'vitest.stderr.log'].map(name => fs.readFileSync(path.join(out, name), 'utf8')).join('\n');
assert(!/Unhandled Errors|Vitest caught|UnhandledRejection|uncaught exception|unhandled rejection/i.test(strip(logs)), 'Actual Vitest runtime diagnostics');
const report = json(path.join(out, 'vitest.json'));
const actual = validate(report, childExit), raw = {};
for (const wanted of spec.cases) {
  const file = path.join(out, 'evidence', wanted.file), bytes = fs.readFileSync(file), envelope = JSON.parse(bytes);
  assert(Array.isArray(envelope.importDraws), 'Complete module tape');
  assert(envelope.importDraws.every(n => Number.isFinite(n) && n >= 0 && n < 1));
  assert(envelope.value && typeof envelope.value === 'object', 'Complete RAW ' + wanted.file);
  raw[wanted.file] = { sha256: digest(bytes), bytes: bytes.length, envelope };
}
const all = Object.values(raw);
for (const row of all) assert.deepEqual(row.envelope.importDraws, all[0].envelope.importDraws, 'Same import tape across cases');
for (const file of ['entry.json', 'continuity.json', 'phone-card.json']) {
  const value = raw[file].envelope.value, ui = value.ui;
  assert(ui?.state && ui.bytes && Array.isArray(ui.args) && ui.args.length === 13, 'Actual original UI input ' + file);
  assert.equal(ui.state.era, '2005-09'); assert.equal(ui.state.seasons[0].year, 2005);
  assert(!has(ui.state, 'historicalArrivals'), 'No injected future marker ' + file);
  assert(Array.isArray(value.uiDraws) && value.uiDraws.length > 0 && Array.isArray(value.mainDraws) && value.mainDraws.length > 0, 'Complete UI/action tapes');
}
for (const frame of raw['entry.json'].envelope.value.frames) {
  assert(frame.state && typeof frame.saved === 'string' && frame.saved.length > 0, 'Complete actual engine frame');
  assert(!has(frame.state, 'historicalArrivals'), 'Original feature is absent');
}
assert.equal(raw['entry.json'].envelope.value.state.seasons.at(-1).year, 2009);
assert.equal(raw['continuity.json'].envelope.value.load2015.state.seasons.at(-1).year, 2015);
assert.equal(raw['continuity.json'].envelope.value.poolRow.club, 'PSG');
const legacy = raw['legacy.json'].envelope.value;
assert(!has(legacy.initial, 'historicalArrivals') && !has(legacy.run.state, 'historicalArrivals'));
assert.deepEqual(legacy.afterFuture.historicalArrivals, legacy.opaque);
assert.equal(raw['newer-ui.json'].envelope.value.ui.state.era, '2025');
assert(!has(raw['newer-ui.json'].envelope.value.ui.state, 'historicalArrivals'));

const copied = plain(report), beforeCopy = JSON.stringify(copied);
copied.testResults[0].assertionResults.pop();
assert.notEqual(JSON.stringify(copied), beforeCopy, 'Actual omission changed result');
let owned = null;
try { validate(copied, childExit); } catch (error) {
  assert.equal(error.name, 'AssertionError'); assert(error.message.includes('SC_ENTRY_CASE_CENSUS'));
  owned = { name: error.name, message: error.message };
}
assert(owned, 'Copied actual-result omission must fail its census');
copied.testResults[0].assertionResults = plain(report.testResults[0].assertionResults);
assert.equal(JSON.stringify(copied), beforeCopy, 'Copied omission whole inverse');
write('copied-actual-omission-control.json', { changed: true, owned, wholeInverseExact: true, actualReportHeld: true });
pins();
for (const name of ['types.log', 'vitest.log', 'reader.log']) receipt(name);
write('original-admitted.json', { status: 'original-first-3-owned-2-held', parent: spec.parent, tests: actual,
  raw: Object.fromEntries(Object.entries(raw).map(([name, row]) => [name, { bytes: row.bytes, sha256: row.sha256 }])),
  completeLegacyAndNewerUiReferenceFiles: ['legacy.json', 'newer-ui.json'], copiedActualOmissionOwned: true,
  sourceAndOfflinePinsHeld: true, limits: spec.limits });
console.log('SC_REAL_ENTRY_ORIGINAL_ADMITTED 5 cases, 3 owned AssertionErrors, 2 held passes, 5 complete RAW');
