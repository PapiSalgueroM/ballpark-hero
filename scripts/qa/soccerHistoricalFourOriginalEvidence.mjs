import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';

const arg = key => { const at = process.argv.indexOf(key); assert(at >= 0 && process.argv[at + 1], key); return process.argv[at + 1]; };
const out = path.resolve(arg('--out')), specPath = path.resolve(arg('--spec')), native = Number(arg('--exit-code'));
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8')), raw = path.join(out, 'raw');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const gitBlob = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const read = file => JSON.parse(fs.readFileSync(path.join(out, file), 'utf8'));
const write = (file, value) => fs.writeFileSync(path.join(out, file), JSON.stringify(value, null, 2) + '\n');
assert.equal(native, 1, 'SC4_ORIGINAL_NATIVE_EXIT');
assert.match(spec.parent, /^[a-f0-9]{40}$/, 'SC4_BOUND_ACTUAL_LIVE_PARENT');
assert.match(spec.tree, /^[a-f0-9]{40}$/, 'SC4_BOUND_ACTUAL_LIVE_TREE');
assert.equal(execFileSync('git', ['rev-parse', 'HEAD^'], { encoding: 'utf8' }).trim(), spec.parent);
assert.equal(execFileSync('git', ['rev-parse', 'HEAD^^{tree}'], { encoding: 'utf8' }).trim(), spec.tree);
for (const [file, pin] of Object.entries(spec.sourcePins)) {
  assert.match(pin, /^[a-f0-9]{40}$/, 'SC4_SOURCE_BINDING');
  assert.equal(gitBlob(fs.readFileSync(file)), pin, 'SC4_SOURCE_PIN ' + file);
}
assert.equal(gitBlob(fs.readFileSync(spec.test.path)), spec.test.sha, 'SC4_TEST_SOURCE');
assert.equal(gitBlob(fs.readFileSync(spec.reader.path)), spec.reader.blob, 'SC4_READER_SOURCE');
const types = read('types-passed.json');
assert.equal(types.command, 'node_modules/.bin/tsc --noEmit -p tsconfig.app.json');
assert.equal(types.exit, 0, 'SC4_PROPER_APP_TYPES');
for (const file of ['transport/types.log', 'transport/vitest.log'])
  assert.equal(fs.readFileSync(path.join(out, file)).length, 0, 'SC4_SILENT_OFFLINE ' + file);
const stdout = fs.readFileSync(path.join(out, 'logs/vitest.stdout'), 'utf8');
const stderr = fs.readFileSync(path.join(out, 'logs/vitest.stderr'), 'utf8');
assert.ok(!/Unhandled Errors|Vitest caught|uncaughtException|unhandledRejection/.test(stdout + stderr), 'SC4_NO_RUNTIME_ERRORS');
const report = read('vitest.json');
function validateReport(value) {
  assert.equal(value.success, false, 'SC4_ORIGINAL_REPORT_STATUS');
  assert.equal(value.numTotalTests, 5, 'SC4_CASE_CENSUS');
  assert.equal(value.numFailedTests, 4, 'SC4_CASE_CENSUS');
  assert.equal(value.numPassedTests, 1, 'SC4_CASE_CENSUS');
  for (const field of ['numPendingTests', 'numTodoTests', 'numRuntimeErrors', 'numRuntimeErrorTestSuites', 'numUnhandledErrors'])
    if (value[field] !== undefined) assert.equal(value[field], 0, 'SC4_RUNTIME_CENSUS ' + field);
  if (value.unhandledErrors !== undefined) assert.deepEqual(value.unhandledErrors, [], 'SC4_RUNTIME_CENSUS');
  assert.equal(value.testResults.length, 1, 'SC4_CASE_CENSUS');
  const cases = value.testResults[0].assertionResults;
  assert.deepEqual(cases.map(c => c.fullName), spec.cases.map(c => c.fullName), 'SC4_CASE_CENSUS');
  cases.forEach((actual, index) => {
    const wanted = spec.cases[index];
    assert.equal(actual.status, wanted.ownership === 'owned' ? 'failed' : 'passed', 'SC4_OWNED_HELD_CASE ' + index);
    if (wanted.ownership === 'owned') {
      assert(actual.failureMessages.length, 'SC4_BUSINESS_ASSERTION');
      for (const message of actual.failureMessages) {
        assert.match(message, /^AssertionError:/, 'SC4_BUSINESS_ASSERTION');
        assert(message.includes(wanted.marker), 'SC4_OWNED_MARKER ' + wanted.marker);
        assert.ok(!/TypeError:|ReferenceError:|SyntaxError:|Cannot find module|Unsupported actual public phase|SC4_INPUT_MEASUREMENT_GAP/.test(message), 'SC4_NO_SETUP_OWNERSHIP');
      }
    }
  });
}
validateReport(report);
const closing = read('raw/closing.json'), run = read('raw/run.json');
assert.equal(closing.setupFailure, null, 'SC4_NO_SETUP_FAILURE');
assert.equal(closing.schema, 'gzip-full-literal-json-v1');
assert.equal(run.status, 'FULL_ACTUAL_ORIGINAL_INPUTS_BEFORE_ABSENCE_ASSERTIONS');
assert.equal(run.sameWholeRepeatedProjection, true, 'SC4_HEALTHY_REPLAY');
assert.equal(run.privateForkTapeCaptured, false);
assert.equal(run.originalInputKind, 'ACTUAL_CURRENT_V1_UI');
assert.deepEqual(run.expectedCaseFiles, spec.cases.map(c => c.file));
assert(run.attempts.length > 0 && run.attempts.length <= spec.measureSeeds.length, 'SC4_MEASURED_ATTEMPT_CENSUS');
assert.deepEqual(run.attempts.map(a => a.seed), spec.measureSeeds.slice(0, run.attempts.length), 'SC4_MEASURED_ATTEMPT_CENSUS');
assert(run.attempts.slice(0, -1).every(a => a.reached === false));
assert.equal(run.attempts.at(-1).reached, true);
assert.equal(run.selectedSeed, run.attempts.at(-1).seed);
assert.equal(closing.selectedSeed, run.selectedSeed);
assert.deepEqual(closing.attempts, run.attempts);
const wantedFiles = ['actual-original-ui-input.json', ...run.attempts.map(a => 'attempt-' + a.seed + '.json'),
  'healthy-repeated-original.json', ...spec.cases.map(c => c.file)].sort();
assert.deepEqual(closing.records.map(r => r.file).sort(), wantedFiles, 'SC4_FULL_RAW_CENSUS');
assert.equal(new Set(closing.records.map(r => r.file)).size, wantedFiles.length);
assert.deepEqual(fs.readdirSync(raw).sort(), [...wantedFiles.map(f => f + '.gz'), 'closing.json', 'run.json'].sort(), 'SC4_PHYSICAL_RAW_CENSUS');
function census(value, pointer = '') {
  if (!value || typeof value !== 'object') return [];
  const result = [];
  if (Array.isArray(value.frames) && Array.isArray(value.mainDraws))
    result.push({ pointer, frames: value.frames.length, draws: value.mainDraws.length });
  for (const [key, child] of Object.entries(value))
    result.push(...census(child, pointer + '/' + key.replace(/~/g, '~0').replace(/\//g, '~1')));
  return result;
}
function validateBody(value, row) {
  assert.deepEqual(census(value), row.journeys, 'SC4_FULL_JOURNEY_CENSUS');
  function visit(v) {
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v.frames) && Array.isArray(v.mainDraws)) {
      assert(v.frames.length > 0 && v.frames.length <= spec.limits.maxActionsPerAttempt + 1, 'SC4_ACTION_BOUND');
      let last = 0;
      for (const f of v.frames) {
        assert.equal(typeof f.action, 'string');
        assert.equal(typeof f.saved, 'string');
        assert(f.saved.length > 0 && f.state && typeof f.state.playerName === 'string', 'SC4_COMPLETE_CODEC_FRAME');
        assert.equal(f.phase, f.state.phase);
        assert.equal(f.year, f.state.seasons.at(-1).year);
        assert(Number.isSafeInteger(f.mainRngState) && Number.isSafeInteger(f.drawsThrough));
        assert(f.drawsThrough >= last && f.drawsThrough <= v.mainDraws.length, 'SC4_GLOBAL_FRAME_CHECKPOINT');
        last = f.drawsThrough;
      }
      for (const d of v.mainDraws) assert.equal(typeof d.action, 'string'), assert(Number.isFinite(d.value) && d.value >= 0 && d.value < 1);
    }
    for (const child of Object.values(v)) visit(child);
  }
  visit(value);
}
function decode(stored, row) {
  assert.equal(stored.length, row.storedBytes, 'SC4_STORED_RAW_BYTES');
  assert.equal(sha(stored), row.storedSHA256, 'SC4_STORED_RAW_SHA');
  const literal = gunzipSync(stored, { maxOutputLength: spec.limits.decodedBytes });
  assert.equal(literal.length, row.bytes, 'SC4_DECODED_RAW_BYTES');
  assert.equal(sha(literal), row.sha256, 'SC4_DECODED_RAW_SHA');
  const value = JSON.parse(literal.toString('utf8'));
  validateBody(value, row);
  return { value, literal };
}
let decodedBytes = 0, storedBytes = 0;
const bodies = new Map(), buffers = new Map();
for (const row of closing.records) {
  assert.equal(row.storedFile, row.file + '.gz');
  assert(!row.file.includes('..') && !path.isAbsolute(row.file));
  const stored = fs.readFileSync(path.join(raw, row.storedFile)), decoded = decode(stored, row);
  bodies.set(row.file, decoded.value); buffers.set(row.file, stored);
  decodedBytes += row.bytes; storedBytes += row.storedBytes;
}
assert.equal(decodedBytes, closing.decodedBytes); assert.equal(storedBytes, closing.storedBytes);
assert(decodedBytes <= spec.limits.decodedBytes && storedBytes <= spec.limits.storedBytes, 'SC4_CAPTURE_BOUNDS');
const ui = bodies.get('actual-original-ui-input.json').ui;
assert.equal(ui.state.era, '2005-09'); assert.equal(ui.state.phase, 'youth');
assert.equal(ui.state.age, 16); assert.equal(ui.state.nationality, 'Spain'); assert.equal(ui.state.position, 'CM');
assert.equal(ui.state.historicalArrivals.version, 1, 'SC4_ACTUAL_ORIGINAL_V1_INPUT');
assert.deepEqual(ui.state.historicalArrivals.players, []);
const chosen = run.attempts.at(-1), healthy = bodies.get(chosen.file.file), repeated = bodies.get('healthy-repeated-original.json');
assert.equal(healthy.seed, run.selectedSeed); assert.equal(healthy.reached, true);
assert.equal(healthy.state.seasons.at(-1).year, 2019, 'SC4_HEALTHY_COMMITTED_YEAR');
const projection = value => ({ frames: value.frames, priorArrivalWrites: value.priorArrivalWrites,
  mainDraws: value.mainDraws, mainRngState: value.mainRngState, reached: value.reached });
assert.deepEqual(projection(healthy), projection(repeated), 'SC4_HEALTHY_REPEAT_FULL_CODEC_AND_TAPE');
for (const file of spec.cases.slice(0, 4).map(c => c.file))
  assert.deepEqual(bodies.get(file).healthyFile, chosen.file, 'SC4_SHARED_FULL_RAW_LINK');
const held = bodies.get('case-5-held-originals.json');
assert.equal(held.actualV1Input.raw, ui.bytes); assert.deepEqual(held.actualV1Input.state, ui.state);
assert.equal(held.actualV1Input.mainSeed, run.selectedSeed);
assert.deepEqual(projection(held.v1One), projection(held.v1Two), 'SC4_V1_HELD_FULL_PROJECTION');
assert.deepEqual(held.legacyOne, held.legacyTwo, 'SC4_UNMARKED_HELD_FULL_PROJECTION');
assert.deepEqual(held.opaqueOne, held.opaqueTwo, 'SC4_OPAQUE_HELD_FULL_PROJECTION');
assert.equal(Object.hasOwn(held.legacyOne.initial, 'historicalArrivals'), false);
assert.equal(held.opaque.version, 999); assert.deepEqual(held.opaqueOne.run.state.historicalArrivals, held.opaque);
assert.equal(Object.hasOwn(held.newer.state, 'historicalArrivals'), false);
assert.equal(held.newer.state.seasons.at(-1).year, 2025);
fs.mkdirSync(path.join(out, 'controls'), { recursive: true });
const controls = [];
function ownedControl(name, change, check, inverse, marker) {
  assert.equal(change(), true, name + ' changed actual copied data');
  let caught;
  try { check(); } catch (error) { caught = error; }
  assert(caught instanceof assert.AssertionError && caught.message.includes(marker), name + ' expected owned validator');
  assert.equal(inverse(), true, name + ' whole original inverse');
  const row = { name, changed: true, assertion: marker, wholeInverse: true };
  controls.push(row); write('controls/' + name + '.json', row);
}
const copyReport = structuredClone(report), reportText = JSON.stringify(copyReport);
let removedCase;
ownedControl('actual-case-omission', () => { removedCase = copyReport.testResults[0].assertionResults.pop(); return JSON.stringify(copyReport) !== reportText; },
  () => validateReport(copyReport), () => { copyReport.testResults[0].assertionResults.push(removedCase); return JSON.stringify(copyReport) === reportText; }, 'SC4_CASE_CENSUS');
const copiedJourney = structuredClone(healthy), journeyText = JSON.stringify(copiedJourney);
const journeyRow = closing.records.find(r => r.file === chosen.file.file);
let removedFrame;
ownedControl('actual-full-frame-omission', () => { removedFrame = copiedJourney.frames.pop(); return JSON.stringify(copiedJourney) !== journeyText; },
  () => validateBody(copiedJourney, journeyRow), () => { copiedJourney.frames.push(removedFrame); return JSON.stringify(copiedJourney) === journeyText; }, 'SC4_FULL_JOURNEY_CENSUS');
const bytes = Buffer.from(buffers.get(chosen.file.file)), bytesBefore = Buffer.from(bytes);
ownedControl('actual-stored-byte-corruption', () => { bytes[bytes.length - 1] ^= 1; return !bytes.equals(bytesBefore); },
  () => decode(bytes, journeyRow), () => { bytes[bytes.length - 1] ^= 1; return bytes.equals(bytesBefore); }, 'SC4_STORED_RAW_SHA');
write('original-input-authority.json', {
  status: 'ACTUAL_CURRENT_ORIGINAL_INPUTS_CAPTURED_FREEZE_AFTER_ARTIFACT_ADMISSION',
  parent: spec.parent, tree: spec.tree, qa: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  run: process.env.GITHUB_RUN_ID ?? null, selectedSeed: run.selectedSeed,
  inputSources: { v1: { raw: ui.bytes, state: ui.state, mainSeed: run.selectedSeed },
    legacy: { raw: held.legacyOne.initialBytes, state: held.legacyOne.initial, checkpoint: held.legacyOne.checkpoint },
    opaque: { raw: held.opaqueOne.initialBytes, state: held.opaqueOne.initial, checkpoint: held.opaqueOne.checkpoint },
    newer: { raw: held.newer.bytes, state: held.newer.state } },
  records: closing.records, scope: 'Actual original inputs/full projections. Artifact/run/job/ZIP authority still requires external independent admission before candidate use.',
});
write('admission.json', {
  status: 'ORIGINAL_FOUR_OWNED_ONE_HELD_INPUTS_ADMITTED_PENDING_WORKFLOW_FINAL_HOLDS',
  cases: 5, owned: 4, held: 1, nativeExit: native, properTypes: 0,
  selectedSeed: run.selectedSeed, attempts: run.attempts.map(a => ({ seed: a.seed, reached: a.reached })),
  rawFiles: closing.records.length, decodedBytes, storedBytes, controls, privateForkTapeCaptured: false,
  scope: 'Original measurement/business absences only. No v2 feature, candidate, native/build/public or completed population credit. Freeze retained actual old inputs before candidate outcomes.',
});
console.log('SC4 original: 4 owned business absences,1 held case; complete actual v1/UI/public-phase/codec/global captures and3 effective copied-data controls.');
