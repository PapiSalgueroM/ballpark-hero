import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';

const args = process.argv.slice(2);
const arg = key => { const at = args.indexOf(key); assert(at >= 0 && args[at + 1] !== undefined, 'missing ' + key); return args[at + 1]; };
const out = path.resolve(arg('--out'));
const ref = path.resolve(arg('--original'));
const specBytes = fs.readFileSync(path.resolve(arg('--spec')));
const spec = JSON.parse(specBytes.toString('utf8'));
const mode = arg('--mode');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const blob = bytes => createHash('sha1').update(Buffer.from('blob ' + bytes.length + '\0')).update(bytes).digest('hex');
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const strip = value => value.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');
assert.equal(spec.status, 'CANDIDATE_ACTUAL_GENERATED_SOURCE_BOUND', 'unbound source packet cannot execute');
assert(/^[0-9a-f]{40}$/.test(spec.candidate.commit) && /^[0-9a-f]{40}$/.test(spec.candidate.tree));
assert.equal(spec.original.independentAdmissionSHA256, 'e3b1f2cd0774464113b64e62ac07d6939faf8a1254dcb8e32d70cf577718858c');
assert.equal(spec.original.strictAdmissionSHA256, '675f478362c90f4980910361c7cf6f21137c0e909836e2e2b7ed71d47e216d07');
const originalValues = new Map();
for (const pin of spec.original.rawPins) {
  const stored = fs.readFileSync(path.join(ref, pin.file + '.json.gz'));
  assert.equal(stored.length, pin.storedBytes, 'K_LEAGUE_ORIGINAL_AUTH');
  assert.equal(sha(stored), pin.storedSHA256, 'K_LEAGUE_ORIGINAL_AUTH');
  const bytes = gunzipSync(stored, { maxOutputLength: spec.limits.decodedPerCaseMaxBytes });
  assert.equal(bytes.length, pin.bytes, 'K_LEAGUE_ORIGINAL_AUTH');
  assert.equal(sha(bytes), pin.sha256, 'K_LEAGUE_ORIGINAL_AUTH');
  const value = JSON.parse(bytes.toString('utf8'));
  assert.equal(value.schema, 'K_LEAGUE_ORIGINAL_FULL_RAW_V1');
  assert.equal(value.incomplete, false);
  originalValues.set(pin.file, value);
}
function xorshift(seed, draws, marker = 'K_LEAGUE_COMPLETE_TAPE') {
  assert(Array.isArray(draws), marker);
  let state = seed >>> 0;
  const states = [state];
  for (const value of draws) {
    assert(Number.isFinite(value) && value >= 0 && value < 1, marker);
    state ^= state << 13; state >>>= 0;
    state ^= state >>> 17; state >>>= 0;
    state ^= state << 5; state >>>= 0;
    assert.equal(value, state / 4294967296, marker);
    states.push(state);
  }
  return states;
}
function requireTape(value, row) {
  assert.equal(value.schema, row.group === 'cases' ? 'K_LEAGUE_CANDIDATE_FULL_RAW_V1' : 'K_LEAGUE_CANDIDATE_API_FULL_RAW_V1');
  assert.equal(value.seed, (row.group === 'cases' ? 8800 : 9700) + row.ordinal);
  assert.equal(value.incomplete, false, 'incomplete RAW is never owned business evidence');
  xorshift(1, value.importDraws);
  const states = xorshift(value.seed, value.draws);
  assert(Array.isArray(value.frames) && value.frames.length > 0, 'K_LEAGUE_COMPLETE_TAPE');
  let previous = 0;
  for (const frame of value.frames) {
    assert(Number.isSafeInteger(frame.globalAt) && frame.globalAt >= previous && frame.globalAt <= value.draws.length, 'K_LEAGUE_COMPLETE_TAPE');
    assert.equal(frame.rngState, states[frame.globalAt], 'K_LEAGUE_COMPLETE_TAPE');
    assert.equal(frame.clock, '2026-11-05T12:00:00.000Z');
    assert(frame.storage && typeof frame.storage.local === 'object' && typeof frame.storage.session === 'object');
    previous = frame.globalAt;
    if (row.group === 'cases') {
      assert.equal(typeof frame.dom, 'string'); assert.equal(typeof frame.text, 'string');
      if (frame.raw === null) assert.equal(frame.saved, null);
      else { assert.equal(typeof frame.raw, 'string'); assert.deepEqual(JSON.parse(frame.raw), frame.saved); }
    }
  }
  assert.equal(previous, value.draws.length, 'K_LEAGUE_COMPLETE_TAPE');
  if (row.group === 'cases') assert.deepEqual(value.fetches, []);
}
function requirePrefixes(value) {
  const base = originalValues.get('old-catalogues');
  assert.deepEqual(value.value.defs, base.value.defs, 'K_LEAGUE_OLD_PREFIX');
  assert.deepEqual(value.value.korean, spec.oldSCRows, 'K_LEAGUE_OLD_PREFIX');
  const actual = value.frames.find(frame => frame.label === 'complete original catalogues').value;
  assert.deepEqual(actual.leagues.slice(0, 27), base.frames[0].value.leagues, 'K_LEAGUE_OLD_PREFIX');
  assert.deepEqual(actual.nations.slice(0, base.frames[0].value.nations.length), base.frames[0].value.nations, 'K_LEAGUE_OLD_PREFIX');
  assert.deepEqual(actual.canonical.slice(0, base.frames[0].value.canonical.length), base.frames[0].value.canonical, 'K_LEAGUE_OLD_PREFIX');
  const oldNames = new Set(base.frames[0].value.leagues.flatMap(row => row.clubs));
  assert.deepEqual(actual.offers.filter(row => oldNames.has(row.name)), base.frames[0].value.offers, 'K_LEAGUE_OLD_PREFIX');
}
function requireReplay(replay, originalRound, capture, label) {
  const marker = 'K_LEAGUE_AUTHENTIC_REPLAY';
  const end = capture.frames.find(frame => frame.label === label + ' actual second load');
  assert(end, marker);
  assert.equal(replay.before.value.source.raw, originalRound.source.raw, marker);
  assert.deepEqual(replay.loaded, originalRound.loaded, marker);
  assert.equal(replay.warm.raw, originalRound.warm.raw, marker);
  assert.deepEqual(replay.second, originalRound.second, marker);
  assert.deepEqual(replay.after.storage, end.storage, marker);
  assert.equal(replay.replay.seed, originalRound.source.rngState, marker);
  assert.deepEqual(replay.replay.draws, capture.draws.slice(originalRound.source.globalAt, end.globalAt), marker);
  const states = xorshift(replay.replay.seed, replay.replay.draws, marker);
  assert.equal(replay.replay.state, states.at(-1), marker);
  assert.equal(replay.replay.state, end.rngState, marker);
  for (const frame of [replay.first, replay.warm, replay.after]) {
    const values = frame.value.replayDraws;
    assert(Array.isArray(values) && values.length <= replay.replay.draws.length, marker);
    assert.deepEqual(values, replay.replay.draws.slice(0, values.length), marker);
    assert.equal(frame.value.replayState, states[values.length], marker);
  }
}
function requireHeldReplays(values) {
  const custom = originalValues.get('old-custom-pending');
  assert.equal(values['old-custom-pending'].value.children.length, 2);
  for (const [i, child] of values['old-custom-pending'].value.children.entries()) {
    const base = custom.value.children[i];
    assert.equal(child.name, base.spec.name);
    assert.equal(child.inputRaw, base.round.source.raw);
    requireReplay(child.round, base.round, custom, base.spec.name);
    assert.equal(child.saveLeague.id, 'premier');
    assert.deepEqual(child.nationOffer, base.nationOffer);
    assert.equal(child.partial, false);
    assert.equal(child.activeKWorld, false);
    assert.equal(child.round.second.jobHunt.open.club, 'Arsenal');
  }
  const edit = originalValues.get('old-world-edits');
  const actual = values['old-world-edits'].value;
  requireReplay(actual.replay, edit.value.round, edit, 'authentic edited Celtic');
  for (const key of ['sparse', 'full', 'cleanSparse', 'cleanFull', 'before', 'after']) assert.deepEqual(actual[key], edit.value[key], 'K_LEAGUE_AUTHENTIC_EDITS');
  assert(actual.copies.every(row => row.output === null));
  assert.deepEqual(actual.before, actual.after);
  assert.equal(actual.validationDrawsBefore, actual.validationDrawsAfter);
  assert.equal(actual.drawsBefore, actual.scopedDrawsAfter);
}
function census(report, expected) {
  const marker = 'K_LEAGUE_CANDIDATE_CENSUS';
  assert.equal(report.numTotalTests, 10, marker);
  assert.equal(report.numPassedTests, 10 - Object.keys(expected).length, marker);
  assert.equal(report.numFailedTests, Object.keys(expected).length, marker);
  assert.equal(report.numPendingTests, 0, marker);
  assert.equal(report.numTodoTests, 0, marker);
  assert.equal(report.success, Object.keys(expected).length === 0, marker);
  for (const key of ['numRuntimeErrorTestSuites', 'numRuntimeErrorTests', 'numRuntimeErrors', 'numUnhandledErrors']) {
    if (report[key] !== undefined) assert.equal(report[key], 0, marker);
  }
  if (report.unhandledErrors !== undefined) assert.deepEqual(report.unhandledErrors, []);
  assert.equal(report.testResults.length, 2, marker);
  const actual = report.testResults.flatMap(suite => suite.assertionResults.map(row => ({ ...row, file: path.relative(process.cwd(), suite.name).replaceAll('\\', '/') })));
  assert.equal(actual.length, 10, marker);
  for (const file of spec.testFiles) {
    assert.deepEqual(actual.filter(row => row.file === file).map(row => row.fullName), spec.cases.filter(row => row.file === file).map(row => row.fullName), marker);
  }
  assert(actual.every(row => spec.cases.some(wanted => wanted.file === row.file && wanted.fullName === row.fullName)), marker);
  for (const wanted of spec.cases) {
    const rows = actual.filter(row => row.file === wanted.file && row.fullName === wanted.fullName);
    assert.equal(rows.length, 1, marker);
    const row = rows[0], owned = expected[wanted.id];
    assert.equal(row.status, owned ? 'failed' : 'passed', marker + ' ' + wanted.id);
    if (!owned) assert.deepEqual(row.failureMessages, []);
    else {
      assert(row.failureMessages.length > 0, marker);
      for (const raw of row.failureMessages) {
        const message = strip(raw).trim();
        assert(/^AssertionError\b/.test(message), 'only an owned business AssertionError qualifies');
        assert(owned.some(text => message.includes(text)), 'exact fault marker ' + wanted.id);
        assert(!/\b(?:TypeError|SyntaxError|ReferenceError|Cannot find module|Failed to resolve import)\b/.test(message), 'setup is never owned');
      }
    }
  }
  return actual;
}
function controlled(value, change, restore, validate, marker) {
  const copy = structuredClone(value), original = JSON.stringify(copy);
  const receipt = change(copy);
  assert.notEqual(JSON.stringify(copy), original, 'actual copied control changed data');
  let owned;
  try { validate(copy); } catch (error) {
    assert.equal(error.name, 'AssertionError'); assert(String(error.message).includes(marker));
    owned = { name: error.name, message: error.message };
  }
  assert(owned, 'copied actual guard must fail');
  restore(copy, receipt);
  assert.equal(JSON.stringify(copy), original, 'whole copied inverse');
  validate(copy);
  return { owned, changed: true, wholeInverse: true, scope: 'Guard logic only, not a physical App/network fault.' };
}
function readArm(directory, arm) {
  const expected = spec.arms[arm].expectedFailures;
  const report = json(path.join(directory, 'vitest.json'));
  const actual = census(report, expected);
  const types = json(path.join(directory, 'types-passed.json'));
  assert.equal(types.command, 'node_modules/.bin/tsc --noEmit -p tsconfig.app.json');
  assert.equal(types.exit, 0);
  for (const name of ['types', 'vitest', 'reader']) assert.equal(fs.statSync(path.join(directory, 'transport', name + '.log')).size, 0);
  const native = json(path.join(directory, 'native.json'));
  assert.equal(native.exit, Object.keys(expected).length ? 1 : 0);
  assert.equal(native.signal, null); assert.equal(native.error, null);
  const stdout = fs.readFileSync(path.join(directory, 'logs/vitest.stdout.log'), 'utf8');
  const stderr = fs.readFileSync(path.join(directory, 'logs/vitest.stderr.log'), 'utf8');
  assert(!/\b(?:Unhandled Errors?|Uncaught Exception|unhandled rejection)\b/i.test(strip(stdout + '\n' + stderr)));
  const values = {}, pins = [];
  for (const group of ['cases', 'api']) {
    const closing = json(path.join(directory, group, 'closing.json'));
    assert.equal(closing.schema, group === 'cases' ? 'K_LEAGUE_CANDIDATE_RAW_CLOSING_V1' : 'K_LEAGUE_CANDIDATE_API_RAW_CLOSING_V1');
    const rows = spec.cases.filter(row => row.group === group);
    assert.equal(closing.rows.length, rows.length);
    assert.deepEqual(fs.readdirSync(path.join(directory, group)).sort(), [...rows.map(row => row.raw), 'closing.json'].sort());
    for (const [index, row] of rows.entries()) {
      const stored = fs.readFileSync(path.join(directory, group, row.raw));
      assert(stored.length > 0 && stored.length <= spec.limits.storedPerCaseMaxBytes);
      const bytes = gunzipSync(stored, { maxOutputLength: spec.limits.decodedPerCaseMaxBytes });
      assert(bytes.length > 0);
      const value = JSON.parse(bytes.toString('utf8'));
      requireTape(value, row);
      const pin = { file: row.id + '.json', bytes: bytes.length, sha256: sha(bytes), storedFile: row.id + '.json.gz', storedBytes: stored.length, storedSHA256: sha(stored) };
      assert.deepEqual(closing.rows[index], pin);
      values[row.id] = value; pins.push({ ...pin, group, frames: value.frames.length, draws: value.draws.length, importDraws: value.importDraws.length });
    }
  }
  requirePrefixes(values['old-catalogues']);
  requireHeldReplays(values);
  return { actual, values, pins };
}
function requirePhysicalEffect(arm, values) {
  if (arm === 'membership') {
    assert.deepEqual(values['sc-population'].value.descriptor.clubs.map(row => row.name), spec.members.filter(name => name !== spec.faults.membership.club));
    assert.equal(values['membership-rosters'].value.definitions.clubs.length, 11);
  } else if (arm === 'pool') {
    const wrong = values['sc-population'].value.added.filter(row => row.rows.length !== 1).map(row => row.name);
    assert.deepEqual(wrong, [spec.faults.pool.club]);
  } else if (arm === 'access') {
    assert(values['membership-rosters'].value.playable.some(row => row.name === 'Gimcheon Sangmu'));
    assert(values['membership-rosters'].value.offers.some(row => row.name === 'Gimcheon Sangmu'));
    assert.equal(values['membership-rosters'].value.heldCareer.clubName, 'Gimcheon Sangmu');
    const blocked = values['prepared-manager-targets'].value.blocked.find(row => row.row.name === 'Gimcheon Sangmu');
    assert.equal(blocked.sameInput, false);
    assert.equal(blocked.result.managerState.club, 'Gimcheon Sangmu');
  } else if (arm === 'roster') {
    const bad = values['membership-rosters'].value.careers.flatMap(row => row.career.squad.filter(player => player.isYouth !== true && player.generated !== true));
    assert(bad.length > 0, 'physical wrong-fallback must actually admit an existing real player');
    assert(bad.some(player => player.name === spec.faults.roster.existingPoolPlayer && player.isYouth === false));
  }
}
if (mode === 'compare') {
  const records = {};
  for (const arm of Object.keys(spec.arms)) records[arm] = readArm(path.join(out, 'replay', arm), arm);
  for (const arm of Object.keys(spec.arms)) {
    const receipt = json(path.join(out, 'replay', arm, 'ARM-ADMITTED.json'));
    assert.equal(receipt.status, 'EXACT_CENSUS_FULL_RAW_AND_HELD_INPUTS_ADMITTED');
    assert.equal(receipt.arm, arm);
    assert.equal(receipt.specSHA256, sha(specBytes));
    assert.deepEqual(receipt.rawPins, records[arm].pins);
    assert.deepEqual(Object.keys(receipt.controls).sort(), ['census', 'mainTape', 'oldPrefix', 'replaySeed'].sort());
    for (const value of Object.values(receipt.controls)) {
      assert.equal(value.changed, true); assert.equal(value.wholeInverse, true);
      assert.equal(value.owned.name, 'AssertionError');
    }
  }
  for (const row of [...spec.sourcePins, ...spec.helperPins]) {
    const bytes = fs.readFileSync(path.resolve(row.path));
    assert.equal(blob(bytes), row.gitBlob, 'whole restored source ' + row.path);
    if (row.sha256) assert.equal(sha(bytes), row.sha256);
  }
  for (const row of spec.cases) {
    const a = fs.readFileSync(path.join(out, 'replay/fixed', row.group, row.raw));
    const b = fs.readFileSync(path.join(out, 'replay/restored', row.group, row.raw));
    assert(a.equals(b), 'full fixed/restored stored RAW ' + row.id);
    assert(gunzipSync(a).equals(gunzipSync(b)), 'full fixed/restored decoded RAW ' + row.id);
  }
  for (const arm of Object.keys(spec.faults)) requirePhysicalEffect(arm, records[arm].values);
  const result = { schema: 'K_LEAGUE_CANDIDATE_FINAL_V1', status: 'FIXED_FOUR_PHYSICAL_FAULTS_RESTORED_HEADLESS_ADMITTED',
    candidate: spec.candidate, original: spec.original,
    arms: Object.fromEntries(Object.entries(records).map(([arm, record]) => [arm, { cases: record.actual, rawPins: record.pins }])),
    fullFixedRestoredRAW: true, noBuildOrNativeOrPublicationCredit: true, scope: spec.scope };
  fs.writeFileSync(path.join(out, 'FINAL-ADMITTED.json'), JSON.stringify(result, null, 2) + '\n');
  console.log('K League outcomes: fixed10green, four effective physical controls, restored10green, all full RAW held');
} else {
  assert.equal(mode, 'arm');
  const arm = arg('--arm');
  assert(Object.prototype.hasOwnProperty.call(spec.arms, arm));
  const nativeExit = Number(arg('--exit-code'));
  assert.equal(nativeExit, Object.keys(spec.arms[arm].expectedFailures).length ? 1 : 0);
  for (const row of [...spec.sourcePins, ...spec.helperPins]) {
    const bytes = fs.readFileSync(path.resolve(row.path));
    const expected = spec.faults[arm]?.path === row.path ? spec.faults[arm].afterGitBlob : row.gitBlob;
    assert.equal(blob(bytes), expected, 'whole actual source ' + row.path);
    if (row.sha256 && expected === row.gitBlob) assert.equal(sha(bytes), row.sha256);
  }
  const record = readArm(out, arm);
  requirePhysicalEffect(arm, record.values);
  const controls = {};
  controls.census = controlled(json(path.join(out, 'vitest.json')), copy => copy.testResults[0].assertionResults.splice(0, 1)[0],
    (copy, removed) => copy.testResults[0].assertionResults.splice(0, 0, removed), copy => census(copy, spec.arms[arm].expectedFailures), 'K_LEAGUE_CANDIDATE_CENSUS');
  const tapeRow = spec.cases.find(row => row.id === 'membership-rosters');
  assert(record.values[tapeRow.id].draws.length > 0);
  controls.mainTape = controlled(record.values[tapeRow.id], copy => copy.draws.pop(), (copy, draw) => copy.draws.push(draw),
    copy => requireTape(copy, tapeRow), 'K_LEAGUE_COMPLETE_TAPE');
  const baseCustom = originalValues.get('old-custom-pending');
  controls.replaySeed = controlled(record.values['old-custom-pending'].value.children[0].round,
    copy => { const original = copy.replay.seed; copy.replay.seed = (original ^ 1) >>> 0; return original; },
    (copy, seed) => { copy.replay.seed = seed; },
    copy => requireReplay(copy, baseCustom.value.children[0].round, baseCustom, baseCustom.value.children[0].spec.name), 'K_LEAGUE_AUTHENTIC_REPLAY');
  controls.oldPrefix = controlled(record.values['old-catalogues'], copy => { const name = copy.value.defs[0].league.name; copy.value.defs[0].league.name += ' changed'; return name; },
    (copy, name) => { copy.value.defs[0].league.name = name; }, requirePrefixes, 'K_LEAGUE_OLD_PREFIX');
  fs.writeFileSync(path.join(out, 'ARM-ADMITTED.json'), JSON.stringify({ schema: 'K_LEAGUE_CANDIDATE_ARM_V1', arm,
    status: 'EXACT_CENSUS_FULL_RAW_AND_HELD_INPUTS_ADMITTED', nativeExit, cases: record.actual, rawPins: record.pins, controls,
    specSHA256: sha(specBytes), original: spec.original, scope: spec.scope }, null, 2) + '\n');
  console.log('K League actual arm admitted: ' + arm + ', ten complete case captures');
}
