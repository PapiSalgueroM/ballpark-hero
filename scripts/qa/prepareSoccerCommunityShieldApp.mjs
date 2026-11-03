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
  'src/lib/soccerCareerEngine.ts': '8d4f9285901d86225954a9e7e2c86abde1649da6a511d0eac9a06dd81eabdc4c',
  'src/lib/soccerCareerExtraCups.ts': '6562fef7c5f067ffa9a4fdf335a918a0d20bda908f0156308f3b705d378f2406',
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
const storage = { getItem(key) { storageOperations.push({ op: 'get', key }); return null; }, setItem(key) { storageOperations.push({ op: 'set', key }); }, removeItem(key) { storageOperations.push({ op: 'remove', key }); } };
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
    ['league', 'src/lib/soccerCareerLeague.ts'],
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
  for (const [namespace, method] of [['save', 'isSoccerCareerSave'], ['save', 'serializeSoccerCareerSave'], ['save', 'parseSoccerCareerSave'], ['extra', 'readCommunityShield'], ['extra', 'communityShieldPlayerSide'], ['extra', 'countCommunityShields'], ['extra', 'communityShieldWinningSeasons'], ['engine', 'getCareerTotals'], ['competitions', 'savedSeasonCompetitions'], ['calendar', 'cupCalendar'], ['world', 'readLeagueWorldSeason'], ['league', 'readLeagueFinish']]) assert.equal(typeof api[namespace]?.[method], 'function', namespace + '.' + method);
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
    write(id + '.lab.json', { scope: id === 'bench' ? 'Explicit saved-result bench/zero-club-app lab, not a naturally observed annual branch.' : 'Actual captured result with only playing consumer-phase lab, not a UI-played season.', sourceId, edits, completeInverse: true });
    const oracle = { id, sourceId, label: row.year + '/' + String(row.year + 1).slice(-2) + ' · ' + row.club, playerName: state.playerName, club: row.club, year: row.year,
      score: match.score, playerScore: [shield.matches[0].goalsFor, shield.matches[0].goalsAgainst], opponent: shield.matches[0].opponent,
      result: shield.result, note: shield.matches[0].note, selected: match.player.selected, playerTitle: match.player.title,
      shieldCount: api.extra.countCommunityShields(state.seasons), totals: api.engine.getCareerTotals(state.seasons), apps: row.apps, leagueApps: row.leagueApps,
      collectiveLeagueAvailable: api.world.readLeagueWorldSeason(row) !== null, serializedSha256: sha(Buffer.from(serialized)), serializedBytes: Buffer.byteLength(serialized), seasonsSha256: sha(Buffer.from(JSON.stringify(state.seasons))) };
    write(id + '.expected.json', oracle);
    prepared.push({ id, saveFile: id + '.save.txt', stateFile: id + '.state.json', labFile: id + '.lab.json', oracleFile: id + '.expected.json', originalFile: 'original-' + sourceId + '.json', oracle });
  }
  manifest = { schema: 1, scope: 'Three actual App save fixtures, two actual annual outcomes plus labelled playing and bench field labs. No naturally observed bench, penalty or full UI career claim.', prepared, capturedSource: captured.source, sourceInputs: receipts(), browserClocksAndRandom: 'Native and unmodified. No engine advance runs in this preparation.' };
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
console.log('SC_SHIELD_APP_PREP: two admitted captured outcomes and one explicit zero-app bench lab, exact inverses and three codec round trips.');
