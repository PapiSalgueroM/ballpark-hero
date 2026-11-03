import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
assert.equal(process.env.CI, '1');
assert.equal(process.env.SIM_NETWORK, 'offline');
assert(process.env.SC_SHIELD_APP_PREP, 'Explicit fresh preparation output required');
const out = path.resolve(process.env.SC_SHIELD_APP_PREP);
assert(out.startsWith(path.join(root, 'tmp') + path.sep));
assert(!fs.existsSync(out) || fs.readdirSync(out).length === 0);
fs.mkdirSync(out, { recursive: true });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const clone = value => structuredClone(value);
const write = (name, value) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const pins = {
  'src/lib/soccerCareerEngine.ts': 'f009782c9f7a384881692239c47af266a834eaa1104ce86662ab53ec67756788',
  'src/lib/soccerCareerExtraCups.ts': 'bc3c8b79f2e910a2ff730f216e1aaa7fb532139d663b45e956d43c9a92539934',
  'src/lib/season/soccer.ts': '2ca1ff73bc5f93b623205554d70e5fa01ed6cdbfb1b379e7475ed4969921f4ee',
  'scripts/qa/fixtures/soccerCommunityShield.opening-inputs.json': '6ea34c166d9262c5113ee2c743455df608926d8d29ebf4ea5a37c31ba3fc8ddf',
  'src/lib/soccerSeasonCompetitions.ts': '4444fb465c145c1fcc5638306668680e515a7df439295a0baee7bef70f22f7a1',
  'src/lib/soccerSeasonCalendar.ts': '2ab91ed87ac3646d4881a762652e5073be1cf182c55049cc1ab0a11a92a769fe',
  'scripts/lib/cmValueCurve.mjs': 'e9fa4cf1961c47493ed8e1b8f718507efdf3746743fe819b8f32128bccf14692',
  'scripts/lib/cmAges.mjs': 'c91917407edc170f6402f721d4592ed78a06ba200c12e2b6a4f286c3ac3602c9',
  'scripts/qa/fixtures/soccerCommunityShield.captured.json': '4c9cfeda29071c493c998671dd1ff37730ecee6616c8355f82b8668fc639aa09',
};
const held = new Map();
const hold = file => {
  const absolute = path.resolve(root, file);
  assert(absolute.startsWith(root + path.sep));
  if (!held.has(absolute)) held.set(absolute, fs.readFileSync(absolute));
};
const receipts = () => [...held].map(([file, bytes]) => ({ file: path.relative(root, file).split(path.sep).join('/'), bytes: bytes.length, sha256: sha(bytes) }));
let primary = null, manifest = null;
const secondary = [], storageOperations = [];
const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const storageValues = new Map();
const storage = { getItem(key) { storageOperations.push({ op: 'get', key: String(key) }); return storageValues.get(String(key)) ?? null; },
  setItem(key, value) { storageOperations.push({ op: 'set', key: String(key), bytes: Buffer.byteLength(String(value)) }); storageValues.set(String(key), String(value)); },
  removeItem(key) { storageOperations.push({ op: 'remove', key: String(key) }); storageValues.delete(String(key)); } };
function change(state, edits, keys, value, remove = false) {
  let target = state;
  for (const key of keys.slice(0, -1)) target = target[key];
  const key = keys.at(-1), beforePresent = Object.hasOwn(target, key);
  const row = { keys, beforePresent, before: beforePresent ? clone(target[key]) : null, afterPresent: !remove, after: remove ? null : clone(value) };
  if (remove) delete target[key]; else target[key] = clone(value);
  edits.push(row);
}
function inverse(state, edits) {
  const result = clone(state);
  for (const edit of [...edits].reverse()) {
    let target = result;
    for (const key of edit.keys.slice(0, -1)) target = target[key];
    if (edit.beforePresent) target[edit.keys.at(-1)] = clone(edit.before);
    else delete target[edit.keys.at(-1)];
  }
  return result;
}
try {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: storage });
  for (const file of [...Object.keys(pins), 'package.json', 'package-lock.json', 'tsconfig.app.json', 'src/lib/soccerCareerSave.ts', fileURLToPath(import.meta.url)]) hold(file);
  for (const [file, expected] of Object.entries(pins)) assert.equal(sha(held.get(path.join(root, file))), expected, 'Actual input pin: ' + file);
  const entry = path.join(out, 'entry.mjs');
  fs.writeFileSync(entry, [
    ['engine', 'src/lib/soccerCareerEngine.ts'], ['extra', 'src/lib/soccerCareerExtraCups.ts'],
    ['save', 'src/lib/soccerCareerSave.ts'], ['competitions', 'src/lib/soccerSeasonCompetitions.ts'],
    ['calendar', 'src/lib/soccerSeasonCalendar.ts'], ['world', 'src/lib/soccerCareerLeagueWorld.ts'],
    ['league', 'src/lib/soccerCareerLeague.ts'], ['binding', 'src/lib/season/soccer.ts'], ['season', 'src/lib/season/core.ts'],
  ].map(([name, file]) => 'export * as ' + name + ' from ' + JSON.stringify(path.join(root, file)) + ';').join('\n') + '\n', { flag: 'wx' });
  hold(entry);
  const compiled = await build({ absWorkingDir: root, entryPoints: [entry], outfile: path.join(out, 'actual-readers.mjs'), bundle: true,
    platform: 'node', format: 'esm', target: 'es2022', alias: { '@': path.join(root, 'src') }, tsconfig: path.join(root, 'tsconfig.app.json'), metafile: true, write: false, logLevel: 'silent' });
  write('metafile.json', compiled.metafile);
  assert.equal(compiled.outputFiles.length, 1);
  const executable = Buffer.from(compiled.outputFiles[0].contents);
  fs.writeFileSync(path.join(out, 'actual-readers.mjs'), executable, { flag: 'wx' });
  for (const file of Object.keys(compiled.metafile.inputs)) {
    const absolute = path.resolve(root, file), relative = path.relative(root, absolute).split(path.sep).join('/');
    assert(absolute === entry || relative.startsWith('src/') || relative.startsWith('node_modules/') || relative === 'scripts/lib/cmValueCurve.mjs' || relative === 'scripts/lib/cmAges.mjs', 'Unexpected compiled input: ' + relative);
    hold(absolute);
  }
  write('compiled-inputs.json', { executable: { file: 'actual-readers.mjs', bytes: executable.length, sha256: sha(executable) }, inputs: receipts() });
  const api = await import(pathToFileURL(path.join(out, 'actual-readers.mjs')).href);
  for (const [namespace, method] of [['save', 'isSoccerCareerSave'], ['save', 'serializeSoccerCareerSave'], ['save', 'parseSoccerCareerSave'], ['extra', 'readCommunityShield'], ['extra', 'communityShieldPlayerSide'], ['extra', 'countCommunityShields'], ['extra', 'communityShieldWinningSeasons'], ['engine', 'getCareerTotals'], ['competitions', 'savedSeasonCompetitions'], ['calendar', 'cupCalendar'], ['world', 'readLeagueWorldSeason'], ['league', 'readLeagueFinish'], ['engine', 'advanceProSeason'], ['extra', 'communityShieldAnnualStats'], ['extra', 'communityShieldSeasonStats'], ['binding', 'soccerSeasonKey'], ['binding', 'buildSoccerSeasonCtx'], ['season', 'deriveSeason']]) assert.equal(typeof api[namespace]?.[method], 'function', namespace + '.' + method);
  const captured = JSON.parse(held.get(path.join(root, 'scripts/qa/fixtures/soccerCommunityShield.captured.json')));
  assert.equal(captured.schema, 1);
  assert.equal(captured.source.artifact, 13187923327);
  assert.equal(captured.states.length, 2);
  const originals = {};
  for (const item of captured.states) {
    assert(['win', 'loss'].includes(item.id) && !Object.hasOwn(originals, item.id));
    assert.equal(item.encoding, 'gzip+hex');
    const compressed = Buffer.from(item.body, 'hex');
    assert.equal(compressed.length, item.compressedBytes); assert.equal(sha(compressed), item.compressedSha256);
    const bytes = gunzipSync(compressed);
    assert.equal(bytes.length, item.rawObjectFragmentBytes); assert.equal(sha(bytes), item.rawObjectFragmentSha256);
    fs.writeFileSync(path.join(out, 'original-' + item.id + '.json'), bytes, { flag: 'wx' });
    const state = JSON.parse(bytes);
    assert.equal(api.save.isSoccerCareerSave(state), true);
    assert.equal(state.phase, 'newspaper');
    assert.equal(state.seasons.at(-1).year, 2030);
    assert.deepEqual(state.pendingSummary, state.seasons.at(-1));
    const match = api.extra.readCommunityShield(state.seasons.at(-1));
    assert(match && match.player.selected && match.decidedBy === 'normal-time');
    assert.equal(match.player.title, item.id === 'win');
    assert.equal(match.seed, 4272396692);
    originals[item.id] = state;
  }
  const openingCarrier = JSON.parse(held.get(path.join(root, 'scripts/qa/fixtures/soccerCommunityShield.opening-inputs.json')));
  assert.equal(openingCarrier.schema, 1); assert.equal(openingCarrier.source.artifact, 13187923327);
  assert.equal(openingCarrier.encoding, 'gzip+hex'); assert.equal(openingCarrier.entries.length, 2);
  const packedInputs = Buffer.from(openingCarrier.body, 'hex'), inputBytes = gunzipSync(packedInputs);
  assert.equal(packedInputs.length, openingCarrier.compressed.bytes); assert.equal(sha(packedInputs), openingCarrier.compressed.sha256);
  assert.equal(inputBytes.length, openingCarrier.payload.bytes); assert.equal(sha(inputBytes), openingCarrier.payload.sha256);
  fs.writeFileSync(path.join(out, 'opening-inputs.json'), inputBytes, { flag: 'wx' });
  const openingInputs = JSON.parse(inputBytes);
  assert.deepEqual(openingInputs.map(item => item.id), ['win', 'loss']);
  const capturedOriginals = { ...originals }, captureRows = [];
  const five = row => Object.fromEntries(['apps', 'goals', 'assists', 'cleanSheets', 'rating'].map(key => [key, row[key]]));
  function advanceCaptured(meta, label, input) {
    const working = clone(input), before = clone(working), draws = [];
    const random = Math.random, now = Date.now, start = storageOperations.length;
    let lcg = meta.seed >>> 0, output, actionError = null;
    storageValues.clear(); storageOperations.push({ op: 'context-reset', label, seed: meta.seed });
    Math.random = () => { lcg = (Math.imul(lcg, 1664525) + 1013904223) >>> 0; const value = lcg / 4294967296; draws.push(value); return value; };
    Date.now = () => meta.clock;
    try { output = api.engine.advanceProSeason(working, api.engine.FALLBACK_CLUBS); }
    catch (error) { actionError = error; }
    finally { Math.random = random; Date.now = now; }
    const record = { label, seed: meta.seed, clock: meta.clock, before, after: output === undefined ? null : clone(output),
      inputAfter: clone(working), draws, finalLcgState: lcg, storageOperations: clone(storageOperations.slice(start)),
      error: actionError ? { name: actionError.name, message: actionError.message, stack: actionError.stack } : null };
    try { write('capture-' + label + '.json', record); }
    catch (error) { if (actionError) { secondary.push({ name: error.name, message: error.message }); throw actionError; } throw error; }
    if (actionError) throw actionError;
    captureRows.push({ label, draws: draws.length, drawsSha256: sha(Buffer.from(JSON.stringify(draws))), finalLcgState: lcg });
    // The retained artifact records complete JSON states, without live object aliases or undefined properties.
    const savedOutput = JSON.parse(JSON.stringify(output));
    assert.equal(api.save.isSoccerCareerSave(savedOutput), true, 'Actual captured advance remains core-admitted');
    assert.equal(draws.length, meta.drawCount); assert.equal(sha(Buffer.from(JSON.stringify(draws))), meta.drawsSha256);
    assert.equal(lcg, meta.finalLcgState); assert.deepEqual(JSON.parse(JSON.stringify(working)), before, 'Retained observed JSON input-after contract');
    return savedOutput;
  }
  for (const [index, item] of openingInputs.entries()) {
    const meta = openingCarrier.entries[index];
    assert.equal(meta.id, item.id); assert.equal(meta.seed, index); assert.equal(meta.clock, 1793448000000);
    assert.equal(meta.originalInputsHeld, true);
    const before = clone(item.before), absentInput = clone(before); delete absentInput.extraCupQualification;
    const present = advanceCaptured(meta, item.id + '-present', before);
    const absent = advanceCaptured(meta, item.id + '-absent', absentInput);
    assert.deepEqual(absent, item.expectedAbsent, 'Complete retained absent output: ' + item.id);
    const normalized = clone(present), row = present.seasons.at(-1), annual = absent.seasons.at(-1);
    assert(Object.hasOwn(row.extraCups[0], 'annualRating')); assert(Object.hasOwn(present.pendingSummary.extraCups[0], 'annualRating'));
    delete normalized.seasons.at(-1).extraCups[0].annualRating; delete normalized.pendingSummary.extraCups[0].annualRating;
    assert.deepEqual(normalized, capturedOriginals[item.id], 'Only the newly recorded mirrored annual grade changes old selected output');
    const match = api.extra.readCommunityShield(row); assert(match && match.player.apps === 1);
    assert.equal(match.annualRating, annual.rating);
    assert.deepEqual(api.extra.communityShieldAnnualStats(row), five(annual));
    assert.deepEqual(api.extra.communityShieldSeasonStats(annual, match), five(row));
    const key = api.binding.soccerSeasonKey(present.playerName, row);
    assert(key); assert.equal(key, api.binding.soccerSeasonKey(absent.playerName, annual));
    const plan = api.season.deriveSeason(api.binding.SOCCER, row, api.binding.buildSoccerSeasonCtx(present, api.engine.FALLBACK_CLUBS, row));
    assert(plan);
    assert.deepEqual(plan, api.season.deriveSeason(api.binding.SOCCER, annual, api.binding.buildSoccerSeasonCtx(absent, api.engine.FALLBACK_CLUBS, annual)));
    write('fresh-original-' + item.id + '.json', present);
    write('capture-' + item.id + '-agreement.json', { annual: five(annual), final: five(row), match, key, plan,
      completeOldAbsentHeld: true, completeOldSelectedHeldExceptMirroredAnnualRating: true });
    originals[item.id] = present;
  }
  assert.equal(captureRows.length, 4);
  write('capture-summary.json', { scope: 'Four replayed public advances from two retained exact inputs and tapes, no cohort or browser claim', completedCalls: 4, sourceTapesHeld: true, cases: captureRows });
  const prepared = [];
  for (const id of ['win', 'bench', 'loss']) {
    const sourceId = id === 'loss' ? 'loss' : 'win', original = originals[sourceId], state = clone(original), edits = [];
    change(state, edits, ['phase'], 'playing');
    if (id === 'bench') {
      const at = state.seasons.length - 1, row = state.seasons[at];
      for (const field of ['apps', 'leagueApps', 'goals', 'assists', 'cleanSheets', 'yellowCards', 'redCards', 'rating']) change(state, edits, ['seasons', at, field], 0);
      for (const field of ['leagueTitle', 'domesticCup', 'championsLeague', 'worldCup', 'ballonDor', 'continentalCup']) if (Object.hasOwn(row, field)) change(state, edits, ['seasons', at, field], false);
      change(state, edits, ['seasons', at, 'ballonDorRank'], null);
      for (const field of ['leagueFinish', 'leagueSize', 'clubCupTitle']) if (Object.hasOwn(row, field)) change(state, edits, ['seasons', at, field], null, true);
      if (row.derbies) change(state, edits, ['seasons', at, 'derbies'], row.derbies.map(derby => ({ ...derby, meetings: derby.meetings.map(meeting => ({ ...meeting, played: false, goals: 0 })) })));
      change(state, edits, ['seasons', at, 'extraCups', 0, 'annualRating'], 0);
      const player = row.extraCups[0].player;
      change(state, edits, ['seasons', at, 'extraCups', 0, 'player'], { ...player, selected: false, apps: 0, goals: 0, assists: 0, cleanSheets: 0, rating: null, title: false });
      change(state, edits, ['pendingSummary'], clone(state.seasons[at]));
      assert.deepEqual(row.leagueWorld, original.seasons.at(-1).leagueWorld, 'Collective recorded world is held');
      assert.equal(api.league.readLeagueFinish(row), null, 'No invented personal league finish');
      assert.notEqual(api.world.readLeagueWorldSeason(row), null, 'Actual collective league availability remains held');
    }
    assert.deepEqual(inverse(state, edits), original, 'Complete field-level lab inverse: ' + id);
    assert.equal(api.save.isSoccerCareerSave(state), true);
    const row = state.seasons.at(-1), match = api.extra.readCommunityShield(row);
    assert(match && api.extra.communityShieldPlayerSide(match) !== null);
    assert.deepEqual(match.score, api.extra.readCommunityShield(original.seasons.at(-1)).score);
    assert.deepEqual(match.qualification, api.extra.readCommunityShield(original.seasons.at(-1)).qualification);
    assert.equal(match.winner, api.extra.readCommunityShield(original.seasons.at(-1)).winner);
    assert.equal(match.player.title, id === 'win'); assert.equal(match.player.selected, id !== 'bench');
    const annual = api.extra.communityShieldAnnualStats(row); assert(annual);
    const leagueKey = api.binding.soccerSeasonKey(state.playerName, row);
    assert.equal(leagueKey === null, id === 'bench');
    if (id !== 'bench') assert(api.season.deriveSeason(api.binding.SOCCER, row, api.binding.buildSoccerSeasonCtx(state, api.engine.FALLBACK_CLUBS, row)));
    assert.equal(api.extra.countCommunityShields(state.seasons), id === 'win' ? 1 : 0);
    assert.equal(api.extra.communityShieldWinningSeasons(state.seasons).length, id === 'win' ? 1 : 0);
    const competitions = api.competitions.savedSeasonCompetitions(state, row), shield = competitions.find(item => item.id === 'shield');
    assert(shield && shield.matches.length === 1 && shield.matches[0].neutral === true);
    const opening = api.calendar.cupCalendar(competitions, 38).find(game => game.id === 'shield:0');
    assert(opening && opening.afterLeague === 0 && opening.previous === null);
    const serialized = api.save.serializeSoccerCareerSave(state);
    assert.deepEqual(api.save.parseSoccerCareerSave(serialized), state, 'Actual save codec round trip');
    fs.writeFileSync(path.join(out, id + '.save.txt'), serialized, { flag: 'wx' });
    write(id + '.state.json', state);
    write(id + '.lab.json', { scope: id === 'bench' ? 'Explicit saved-result bench/zero-club-app and zero-annual-grade lab on the freshly replayed outcome, not a naturally observed branch.' : 'Fresh actual public-advance capture from the exact retained input/tape, with only playing consumer-phase lab, not a UI-played season.', sourceId, edits, completeInverse: true });
    const oracle = { id, sourceId, label: row.year + '/' + String(row.year + 1).slice(-2) + ' · ' + row.club, playerName: state.playerName, club: row.club, year: row.year,
      score: match.score, playerScore: [shield.matches[0].goalsFor, shield.matches[0].goalsAgainst], opponent: shield.matches[0].opponent,
      result: shield.result, note: shield.matches[0].note, selected: match.player.selected, playerTitle: match.player.title,
      shieldCount: api.extra.countCommunityShields(state.seasons), totals: api.engine.getCareerTotals(state.seasons), apps: row.apps, leagueApps: row.leagueApps,
      collectiveLeagueAvailable: api.world.readLeagueWorldSeason(row) !== null, serializedSha256: sha(Buffer.from(serialized)), serializedBytes: Buffer.byteLength(serialized), seasonsSha256: sha(Buffer.from(JSON.stringify(state.seasons))) };
    write(id + '.expected.json', oracle);
    prepared.push({ id, saveFile: id + '.save.txt', stateFile: id + '.state.json', labFile: id + '.lab.json', oracleFile: id + '.expected.json', originalFile: 'fresh-original-' + sourceId + '.json', oldOriginalFile: 'original-' + sourceId + '.json', oracle });
  }
  manifest = { schema: 1, scope: 'Three App save fixtures from two fresh public-advance replays of retained exact annual inputs/tapes plus labelled playing and zero-app bench/grade field labs. No naturally observed bench, penalty or full UI career claim.', prepared, capturedSource: captured.source, openingSource: openingCarrier.source,
    capture: { completedCalls: captureRows.length, sourceTapesHeld: true, cases: captureRows }, sourceInputs: receipts(), browserClocksAndRandom: 'Native and unmodified. Four Node public advances use only the exact retained QA clock/tapes before browser launch.' };
  write('manifest.json', manifest);
} catch (error) { primary = error; }
finally {
  try { for (const [file, bytes] of held) assert.deepEqual(fs.readFileSync(file), bytes, 'Held actual source: ' + file); write('source-holds.json', receipts()); } catch (error) { secondary.push({ name: error.name, message: error.message }); }
  try { write('storage-operations.json', { scope: 'Empty Node import compatibility only, no persistence claim', operations: storageOperations }); } catch (error) { secondary.push({ name: error.name, message: error.message }); }
  try { if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor); else delete globalThis.localStorage; } catch (error) { secondary.push({ name: error.name, message: error.message }); }
  try { write('receipt.json', { completed: !primary && secondary.length === 0, prepared: manifest?.prepared.length ?? 0, primary: primary ? { name: primary.name, message: primary.message, stack: primary.stack } : null, secondary }); } catch (error) { secondary.push({ name: error.name, message: error.message }); }
}
if (primary) throw primary;
assert.equal(secondary.length, 0, 'Fixture preparation holds failed');
console.log('SC_SHIELD_APP_PREP: four exact retained-tape public advances, two fresh annual-proof outcomes and one explicit zero-app bench/grade lab; full old outputs, inverses and three codec round trips.');
