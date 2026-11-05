import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';

const args = process.argv.slice(2);
const arg = key => {
  const at = args.indexOf(key);
  assert(at >= 0 && args[at + 1] !== undefined, 'missing ' + key);
  return args[at + 1];
};
const out = path.resolve(arg('--out'));
const spec = JSON.parse(fs.readFileSync(path.resolve(arg('--spec')), 'utf8'));
const nativeExit = Number(arg('--exit-code'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const blob = bytes => createHash('sha1').update(Buffer.from('blob ' + bytes.length + '\0')).update(bytes).digest('hex');
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const strip = value => value.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');
assert.equal(spec.status, 'ORIGINAL_ONLY_SOURCE_BOUND', 'unbound source-only packet cannot execute');
assert(/^[0-9a-f]{40}$/.test(spec.original.commit));
assert(/^[0-9a-f]{40}$/.test(spec.original.tree));
assert.equal(spec.original.role, 'PRE_K_UNPUBLISHED_UI_PREREQUISITE_NOT_LIVE');
assert(/^[0-9a-f]{64}$/.test(spec.prerequisite.candidateIndependentAdmissionSHA256), 'current UI candidate must be independently admitted before this original runs');
assert(Array.isArray(spec.sourcePins) && spec.sourcePins.length > 0);
for (const row of [...spec.sourcePins, ...spec.helperPins]) {
  const bytes = fs.readFileSync(path.resolve(row.path));
  assert.equal(blob(bytes), row.gitBlob, 'whole source ' + row.path);
  if (row.sha256) assert.equal(sha(bytes), row.sha256);
}
const types = json(path.join(out, 'types-passed.json'));
assert.equal(types.command, 'node_modules/.bin/tsc --noEmit -p tsconfig.app.json');
assert.equal(types.exit, 0, 'proper types must precede actual cases');
for (const name of ['types', 'vitest', 'reader']) assert.equal(fs.statSync(path.join(out, 'transport', name + '.log')).size, 0, 'silent transport ' + name);
const stdout = fs.readFileSync(path.join(out, 'logs/vitest.stdout.log'), 'utf8');
const stderr = fs.readFileSync(path.join(out, 'logs/vitest.stderr.log'), 'utf8');
assert(!/\b(?:Unhandled Errors?|Uncaught Exception|unhandled rejection)\b/i.test(strip(stdout + '\n' + stderr)));
const reportBytes = fs.readFileSync(path.join(out, 'vitest.json'));
const report = JSON.parse(reportBytes.toString('utf8'));
function census(value) {
  assert.equal(value.success, false);
  assert.equal(value.numTotalTests, 6);
  assert.equal(value.numPassedTests, 4);
  assert.equal(value.numFailedTests, 2);
  assert.equal(value.numPendingTests, 0);
  assert.equal(value.numTodoTests, 0);
  for (const key of ['numRuntimeErrorTestSuites', 'numRuntimeErrorTests', 'numRuntimeErrors', 'numUnhandledErrors']) {
    if (value[key] !== undefined) assert.equal(value[key], 0, key);
  }
  if (value.unhandledErrors !== undefined) assert.deepEqual(value.unhandledErrors, []);
  assert.equal(value.testResults.length, 1);
  const actual = value.testResults.flatMap(suite => suite.assertionResults.map(row => ({ ...row, file: path.relative(process.cwd(), suite.name).replaceAll('\\', '/') })));
  assert.deepEqual(actual.map(row => [row.file, row.fullName]), spec.cases.map(row => [spec.futureWorkflow.testPath, row.fullName]), 'K_LEAGUE_ORIGINAL_CENSUS');
  for (let i = 0; i < actual.length; i += 1) {
    const row = actual[i], wanted = spec.cases[i];
    assert.equal(row.status, wanted.original, 'exact case ownership ' + wanted.id);
    if (wanted.original === 'passed') assert.deepEqual(row.failureMessages, []);
    else {
      assert(row.failureMessages.length > 0);
      for (const text of row.failureMessages) {
        const message = strip(text).trim();
        assert(/^AssertionError\b/.test(message), 'only a business AssertionError is owned');
        assert(message.includes(wanted.marker), 'exact owned marker');
        assert(!/\b(?:TypeError|SyntaxError|ReferenceError|Cannot find module|Failed to resolve import)\b/.test(message), 'setup is never owned');
      }
    }
  }
  return actual;
}
assert.equal(nativeExit, 1, 'actual original native Vitest1');
const actual = census(report);
const copied = structuredClone(report), originalReport = JSON.stringify(copied);
const removed = copied.testResults[0].assertionResults.splice(0, 1)[0];
assert.notEqual(JSON.stringify(copied), originalReport);
let censusControl;
try { census(copied); } catch (error) {
  assert.equal(error.name, 'AssertionError'); assert(String(error.message).includes('K_LEAGUE_ORIGINAL_CENSUS'));
  censusControl = { name: error.name, message: error.message };
}
assert(censusControl, 'actual report omission must fail the same census');
copied.testResults[0].assertionResults.splice(0, 0, removed);
assert.equal(JSON.stringify(copied), originalReport);
census(copied);

function requireTape(value, ordinal) {
  assert.equal(value.seed, 8800 + ordinal);
  assert.equal(value.incomplete, false);
  assert(Array.isArray(value.importDraws) && Array.isArray(value.draws));
  const run = (seed, draws) => {
    let state = seed >>> 0;
    const states = [state];
    for (const number of draws) {
      assert(Number.isFinite(number) && number >= 0 && number < 1);
      state ^= state << 13; state >>>= 0;
      state ^= state >>> 17; state >>>= 0;
      state ^= state << 5; state >>>= 0;
      assert.equal(number, state / 4294967296, 'K_LEAGUE_ORIGINAL_COMPLETE_TAPE');
      states.push(state);
    }
    return states;
  };
  run(1, value.importDraws);
  const states = run(value.seed, value.draws);
  assert(Array.isArray(value.frames) && value.frames.length > 0);
  let previous = 0;
  for (const frame of value.frames) {
    assert(Number.isSafeInteger(frame.globalAt) && frame.globalAt >= previous && frame.globalAt <= value.draws.length, 'K_LEAGUE_ORIGINAL_COMPLETE_TAPE');
    assert.equal(frame.rngState, states[frame.globalAt], 'K_LEAGUE_ORIGINAL_COMPLETE_TAPE');
    previous = frame.globalAt;
    assert.equal(frame.clock, '2026-11-05T12:00:00.000Z');
    assert.equal(typeof frame.dom, 'string'); assert.equal(typeof frame.text, 'string');
    assert(frame.storage && typeof frame.storage.local === 'object' && typeof frame.storage.session === 'object');
    if (frame.raw === null) assert.equal(frame.saved, null);
    else { assert.equal(typeof frame.raw, 'string'); assert.deepEqual(JSON.parse(frame.raw), frame.saved); }
  }
  assert.equal(previous, value.draws.length, 'K_LEAGUE_ORIGINAL_COMPLETE_TAPE');
  assert.deepEqual(value.fetches, []);
}
const closing = json(path.join(out, 'raw/closing.json'));
assert.equal(closing.schema, 'K_LEAGUE_ORIGINAL_RAW_CLOSING_V1');
assert.equal(closing.rows.length, 6);
const values = [];
const pins = [];
let imports = null;
for (let i = 0; i < spec.cases.length; i += 1) {
  const wanted = spec.cases[i];
  const stored = fs.readFileSync(path.join(out, wanted.raw));
  assert(stored.length > 0 && stored.length <= spec.limits.storedPerCaseMaxBytes);
  const bytes = gunzipSync(stored, { maxOutputLength: spec.limits.decodedPerCaseMaxBytes });
  assert(bytes.length > 0 && bytes.length <= spec.limits.decodedPerCaseMaxBytes);
  const value = JSON.parse(bytes.toString('utf8'));
  assert.equal(value.schema, 'K_LEAGUE_ORIGINAL_FULL_RAW_V1');
  requireTape(value, i + 1);
  if (imports === null) imports = value.importDraws; else assert.deepEqual(value.importDraws, imports);
  const pin = { file: wanted.id + '.json', bytes: bytes.length, sha256: sha(bytes), storedFile: wanted.id + '.json.gz', storedBytes: stored.length, storedSHA256: sha(stored) };
  assert.deepEqual(closing.rows[i], pin, 'exact full closing/body authority');
  values.push(value); pins.push({ ...pin, frames: value.frames.length, globalDraws: value.draws.length, importDraws: value.importDraws.length });
}
const tapeCopy = structuredClone(values[2]), tapeOriginal = JSON.stringify(tapeCopy);
assert(tapeCopy.draws.length > 0);
const lastDraw = tapeCopy.draws.pop();
assert.notEqual(JSON.stringify(tapeCopy), tapeOriginal);
let tapeControl;
try { requireTape(tapeCopy, 3); } catch (error) {
  assert.equal(error.name, 'AssertionError'); assert(String(error.message).includes('K_LEAGUE_ORIGINAL_COMPLETE_TAPE'));
  tapeControl = { name: error.name, message: error.message };
}
assert(tapeControl, 'actual full tape omission must fail the same validator');
tapeCopy.draws.push(lastDraw);
assert.equal(JSON.stringify(tapeCopy), tapeOriginal);
requireTape(tapeCopy, 3);
assert.deepEqual(values[0].value.korean, spec.oldSCRows);
assert.equal(values[0].value.defs.length, 27);
assert.equal(values[0].value.defs.reduce((sum, row) => sum + row.league.clubs.length, 0), 454);
assert.equal(values[2].value.children.length, 2);
for (const child of values[2].value.children) {
  assert.equal(child.pending.jobHunt.open.club, 'Arsenal');
  assert.deepEqual(child.round.second.customClub, child.pending.customClub);
  assert.deepEqual(child.round.second.squad, child.pending.squad);
  assert.deepEqual(child.round.second.jobHunt, child.pending.jobHunt);
  assert.equal(child.saveLeague.id, 'premier');
}
assert.equal(Object.keys(values[3].value.full).length, 27);
assert.deepEqual(values[3].value.cleanSparse, values[3].value.sparse);
assert.deepEqual(values[3].value.cleanFull, values[3].value.sparse);
assert.deepEqual(values[3].value.before, values[3].value.after);
assert(values[3].value.copies.every(row => row.output === null));
assert.deepEqual(values[4].value, { hasCountry: false, hasLeague: false }, 'actual original missing CM path');
assert.deepEqual(values[5].value.added.filter(row => row.rows.length !== 1).map(row => row.name), spec.newSCNames, 'actual original missing eight SC rows');
const result = { schema: 'K_LEAGUE_SHARED_ORIGINAL_ADMISSION_V1', status: 'ORIGINAL_ADMITTED_4_HELD_2_BUSINESS_ABSENCE',
  original: spec.original, nativeExit, cases: actual.map(row => ({ fullName: row.fullName, status: row.status, failureMessages: row.failureMessages })),
  rawPins: pins, controls: { censusControl, tapeControl }, inputs: { specSHA256: sha(fs.readFileSync(path.resolve(arg('--spec')))), vitestSHA256: sha(reportBytes) },
  limits: spec.limits, scope: spec.scope };
fs.writeFileSync(path.join(out, 'ORIGINAL-ADMITTED.json'), JSON.stringify(result, null, 2) + '\n');
console.log('K League original: 4 held, 2 owned business absences, 6 complete RAW, effective census/tape controls');
