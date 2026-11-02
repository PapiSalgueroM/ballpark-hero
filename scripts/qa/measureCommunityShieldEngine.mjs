import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const FIXTURE = 'scripts/data/careerLeagueWorldSaves1100.json';
const PINS = {
  'src/lib/soccerCareerEngine.ts': '8d4f9285901d86225954a9e7e2c86abde1649da6a511d0eac9a06dd81eabdc4c',
  'src/lib/soccerCareerExtraCups.ts': '6562fef7c5f067ffa9a4fdf335a918a0d20bda908f0156308f3b705d378f2406',
  [FIXTURE]: '1c2ac7441402ad6db4916c844181b869a3550726c7e0afed4cce194f5e6ca8ef',
};
const SKILLS = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes'];
const STATS = ['apps', 'goals', 'assists', 'cleanSheets', 'rating'];
const CLOCK = Date.parse('2026-10-31T12:00:00Z');
const clone = value => JSON.parse(JSON.stringify(value));
const json = value => JSON.stringify(value);
const sha = body => createHash('sha256').update(body).digest('hex');
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const relative = file => path.relative(ROOT, file).split(path.sep).join('/');

function lab(input, fields) {
  const value = clone(input), before = json(input);
  const changes = Object.entries(fields).map(([key, after]) => ({
    key, beforePresent: Object.hasOwn(value, key), before: Object.hasOwn(value, key) ? clone(value[key]) : null, after: clone(after),
  }));
  for (const change of changes) value[change.key] = clone(change.after);
  const inverse = clone(value);
  for (const change of [...changes].reverse()) {
    if (change.beforePresent) inverse[change.key] = clone(change.before);
    else delete inverse[change.key];
  }
  assert.equal(json(inverse), before, 'QA field lab must inverse the complete input');
  return { value, changes, originalSha256: sha(Buffer.from(before)), changedSha256: sha(Buffer.from(json(value))), inverseSha256: sha(Buffer.from(json(inverse))) };
}

async function main() {
  assert.equal(process.env.CI, '1');
  assert.equal(process.env.SIM_NETWORK, 'offline');
  assert(process.env.SC_SHIELD_ENGINE_OUT, 'SC_SHIELD_ENGINE_OUT must name a fresh workspace/tmp output');
  const out = path.resolve(process.env.SC_SHIELD_ENGINE_OUT);
  assert(out.startsWith(path.resolve(ROOT, 'tmp') + path.sep));
  assert(!fs.existsSync(out) || fs.readdirSync(out).length === 0, 'Output must be fresh');
  fs.mkdirSync(out, { recursive: true });
  fs.mkdirSync(path.join(out, 'cases'));
  fs.mkdirSync(path.join(out, 'closes'));
  fs.mkdirSync(path.join(out, 'interruptions'));
  const held = new Map(), cases = [], interrupted = [], sourceHolds = [], storageOperations = [];
  const index = [];
  let primary = null, summary = null, api = null;
  const secondary = [];
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const storageValues = new Map();
  const storage = {
    getItem(key) { storageOperations.push({ op: 'get', key: String(key) }); return storageValues.get(String(key)) ?? null; },
    setItem(key, value) { storageOperations.push({ op: 'set', key: String(key), bytes: Buffer.byteLength(String(value)) }); storageValues.set(String(key), String(value)); },
    removeItem(key) { storageOperations.push({ op: 'remove', key: String(key) }); storageValues.delete(String(key)); },
    clear() { storageValues.clear(); },
    key(i) { return [...storageValues.keys()][i] ?? null; },
    get length() { return storageValues.size; },
  };
  function hold(file) {
    const full = path.resolve(ROOT, file);
    assert(full.startsWith(ROOT + path.sep), 'Held input leaves workspace');
    if (!held.has(full)) held.set(full, Buffer.from(fs.readFileSync(full)));
  }
  function run(seed, label, input, action) {
    const working = clone(input), before = clone(working), draws = [];
    let state = seed >>> 0;
    const random = Math.random, now = Date.now, startStorage = storageOperations.length;
    storageValues.clear();
    storageOperations.push({ op: 'context-reset', label, seed });
    Math.random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; const v = state / 4294967296; draws.push(v); return v; };
    Date.now = () => CLOCK;
    let output;
    try {
      output = action(working);
      const result = { label, seed, clock: CLOCK, before, after: clone(output), inputAfter: clone(working), draws, finalLcgState: state,
        storageOperations: clone(storageOperations.slice(startStorage)) };
      assert.equal(api.save.isSoccerCareerSave(result.after), true, 'Actual action output must remain core-admitted: ' + label);
      return result;
    } catch (error) {
      try {
        write(path.join(out, 'failed-action-' + label.replace(/[^a-zA-Z0-9-]/g, '-') + '.json'), {
          label, seed, clock: CLOCK, before, after: output === undefined ? null : clone(output),
          inputAfter: clone(working), draws, finalLcgState: state,
          error: { name: error.name, message: error.message, stack: error.stack },
        });
      } catch (retentionError) { secondary.push({ name: retentionError.name, message: retentionError.message }); }
      throw error;
    } finally { Math.random = random; Date.now = now; }
  }
  function oldRow(row) {
    const value = clone(row);
    delete value.extraCups;
    for (const key of STATS) delete value[key];
    return value;
  }
  function verifyPair(record) {
    const pair = record.pair;
    if (!pair) return;
    const present = pair.present.after, absent = pair.absent.after;
    const row = present.seasons[present.seasons.length - 1], annual = absent.seasons[absent.seasons.length - 1];
    assert.deepEqual(pair.present.draws, pair.absent.draws, 'SC_ENGINE_PAIR_TAPE');
    assert.equal(pair.present.finalLcgState, pair.absent.finalLcgState, 'SC_ENGINE_PAIR_TAPE');
    assert.equal(present.phase, absent.phase, 'SC_ENGINE_PAIR_ANNUAL');
    assert.deepEqual(present.phone, absent.phone, 'SC_ENGINE_PAIR_ANNUAL');
    assert.deepEqual(present.leagueWorld, absent.leagueWorld, 'SC_ENGINE_PAIR_ANNUAL');
    if (present.phase === 'rehab_choice' && absent.phase === 'rehab_choice' && row.injurySevere === true && annual.injurySevere === true) {
      for (const [output, input] of [[present, pair.present.before], [absent, pair.absent.before]]) {
        assert.deepEqual(output.extraCupQualification, input.extraCupQualification, 'SC_ENGINE_PAIR_ANNUAL');
        assert.equal(Object.hasOwn(output, 'extraCupQualification'), Object.hasOwn(input, 'extraCupQualification'), 'SC_ENGINE_PAIR_ANNUAL');
      }
    } else assert.deepEqual(present.extraCupQualification, absent.extraCupQualification, 'SC_ENGINE_PAIR_ANNUAL');
    assert.deepEqual(present.seasons.slice(0, -1), absent.seasons.slice(0, -1), 'SC_ENGINE_PAIR_ANNUAL');
    assert.deepEqual(oldRow(row), oldRow(annual), 'SC_ENGINE_PAIR_ANNUAL');
    const match = api.extra.readCommunityShield(row);
    assert.equal(api.extra.readCommunityShield(annual), null, 'SC_ENGINE_PAIR_STATS');
    if (row.extraCups !== undefined) assert.notEqual(match, null, 'SC_ENGINE_PAIR_STATS');
    const p = match?.player ?? { apps: 0, goals: 0, assists: 0, cleanSheets: 0, rating: null };
    const expected = {
      apps: annual.apps + p.apps, goals: annual.goals + p.goals, assists: annual.assists + p.assists,
      cleanSheets: annual.cleanSheets + p.cleanSheets,
      rating: p.apps ? Math.round((annual.rating * annual.apps + p.rating) / (annual.apps + 1) * 10) / 10 : annual.rating,
    };
    for (const key of STATS) assert.equal(row[key], expected[key], 'SC_ENGINE_PAIR_STATS');
    if (match) {
      assert.deepEqual(match.qualification, pair.input.extraCupQualification, 'SC_ENGINE_PAIR_STATS');
      assert.equal(match.eventYear, row.year, 'SC_ENGINE_PAIR_STATS');
      const statsBefore = json(row);
      assert.deepEqual(api.extra.readCommunityShield(clone(row)), match, 'SC_ENGINE_PAIR_STATS');
      assert.equal(json(row), statsBefore, 'SC_ENGINE_PAIR_STATS');
    }
  }
  function verifyInterrupted(record) {
    const before = record.action.before, after = record.action.after, row = after.seasons[after.seasons.length - 1];
    const expected = record.id === 'ban' ? { club: 'BANNED', type: 'playing' }
      : record.id === 'prison' ? { club: 'PRISON', type: 'playing' } : { club: before.currentClub, type: 'retired' };
    assert.equal(row.club, expected.club, 'SC_ENGINE_INTERRUPTED');
    assert.equal(row.type, expected.type, 'SC_ENGINE_INTERRUPTED');
    for (const field of ['apps', 'goals', 'assists', 'cleanSheets']) assert.equal(row[field], 0, 'SC_ENGINE_INTERRUPTED');
    assert.equal(api.extra.readCommunityShield(row), null, 'SC_ENGINE_INTERRUPTED');
    assert.equal(api.extra.countCommunityShields(after.seasons), api.extra.countCommunityShields(before.seasons), 'SC_ENGINE_INTERRUPTED');
    if (record.id === 'ban') assert.equal(after.matchFixBanned, 1, 'SC_ENGINE_INTERRUPTED');
    if (record.id === 'prison') assert.equal(after.prisonSeasons, 0, 'SC_ENGINE_INTERRUPTED');
    if (record.id === 'age45') {
      assert.equal(after.age, 45, 'SC_ENGINE_INTERRUPTED');
      assert.equal(after.retired, true, 'SC_ENGINE_INTERRUPTED');
      assert.equal(after.phase, 'retirement_ceremony', 'SC_ENGINE_INTERRUPTED');
    }
  }
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: storage });
    for (const file of [...Object.keys(PINS), 'package.json', 'package-lock.json', 'tsconfig.json', 'tsconfig.app.json', fileURLToPath(import.meta.url)]) hold(file);
    for (const [file, expected] of Object.entries(PINS)) assert.equal(sha(held.get(path.resolve(ROOT, file))), expected, 'Actual source/fixture pin: ' + file);
    const entry = path.join(out, 'entry.mjs');
    fs.writeFileSync(entry, [
      ['engine', 'src/lib/soccerCareerEngine.ts'], ['world', 'src/lib/soccerCareerLeagueWorld.ts'],
      ['extra', 'src/lib/soccerCareerExtraCups.ts'], ['cup', 'src/lib/soccerCareerCup.ts'], ['save', 'src/lib/soccerCareerSave.ts'],
    ].map(([name, file]) => 'export * as ' + name + ' from ' + JSON.stringify(path.resolve(ROOT, file)) + ';').join('\n') + '\n', { flag: 'wx' });
    hold(entry);
    const built = await build({ absWorkingDir: ROOT, entryPoints: [entry], outfile: path.join(out, 'actual-engine.mjs'),
      bundle: true, format: 'esm', platform: 'node', target: 'es2022', alias: { '@': path.join(ROOT, 'src') },
      tsconfig: path.join(ROOT, 'tsconfig.app.json'), write: false, metafile: true, logLevel: 'silent' });
    assert.equal(built.outputFiles.length, 1);
    for (const file of Object.keys(built.metafile.inputs)) {
      const full = path.resolve(ROOT, file), rel = relative(full);
      assert(full === entry || rel.startsWith('src/') || rel.startsWith('node_modules/'), 'Only actual source/dependency or retained entry may be bundled');
      hold(full);
    }
    const executable = Buffer.from(built.outputFiles[0].contents);
    fs.writeFileSync(path.join(out, 'actual-engine.mjs'), executable, { flag: 'wx' });
    write(path.join(out, 'metafile.json'), built.metafile);
    write(path.join(out, 'compiled-inputs.json'), { entry: { file: 'entry.mjs', sha256: sha(fs.readFileSync(entry)) },
      executable: { file: 'actual-engine.mjs', bytes: executable.length, sha256: sha(executable) },
      inputs: [...held].map(([file, body]) => ({ file: relative(file), bytes: body.length, sha256: sha(body) })) });
    api = await import(pathToFileURL(path.join(out, 'actual-engine.mjs')).href);
    for (const [ns, name] of [['engine', 'advanceProSeason'], ['engine', 'repairCareer'], ['engine', 'calcOverall'],
      ['world', 'leagueWorldForYear'], ['extra', 'readCommunityShield'], ['extra', 'countCommunityShields'],
      ['cup', 'readCupRun'], ['save', 'isSoccerCareerSave']]) assert.equal(typeof api[ns]?.[name], 'function', 'Actual API required: ' + ns + '.' + name);
    const saved = JSON.parse(held.get(path.resolve(ROOT, FIXTURE)).toString('utf8'));
    const original = saved.saves.find(record => record.id === 'ere')?.state;
    assert(original, 'Actual captured ere fixture required');
    const clubs = api.engine.FALLBACK_CLUBS;
    const same = (a, b) => api.world.clubKeyOf(a) === api.world.clubKeyOf(b);
    const profiles = [
      { id: 'arsenal', club: clubs.find(c => same(c.name, 'Arsenal')), league: 'Premier League' },
      { id: 'norwich', club: clubs.find(c => same(c.name, 'Norwich City')), league: 'Championship' },
    ];
    const qualifyingYear = original.seasons[original.seasons.length - 1].year + 1;
    const foundationWorld = api.world.leagueWorldForYear(clone(original), clubs, qualifyingYear);
    for (const profile of profiles) {
      assert(profile.club && profile.club.country === 'England' && profile.club.league === profile.league, 'Actual club-table foundation: ' + profile.id);
      assert(foundationWorld?.leagues[profile.league]?.some(name => same(name, profile.club.name)), 'Actual world membership foundation: ' + profile.id);
    }
    write(path.join(out, 'foundations.json'), { fixture: FIXTURE, fixtureState: original, qualifyingYear,
      foundationWorld, profiles: profiles.map(p => ({ id: p.id, club: p.club, skillLab: 85, originalPotentialHeld: original.potential })),
      storageBoundary: 'Empty in-memory Node compatibility context only, no persistence claim.', annualClock: CLOCK,
      annualRandom: { kind: 'LCG', a: 1664525, c: 1013904223, modulus: 4294967296, seeds: '0..63 per profile' } });
    for (const profile of profiles) for (let seed = 0; seed < 64; seed++) {
      const id = profile.id + ':' + seed;
      const fields = { playerName: 'Shield annual witness', phase: 'playing',
        currentClub: profile.club.name, currentClubCountry: profile.club.country, currentClubTier: profile.club.tier,
        currentClubColor: profile.club.color, currentLeague: profile.club.league,
        ...Object.fromEntries(SKILLS.map(key => [key, 85])) };
      const skillCopy = { ...clone(original), ...fields };
      fields.overall = api.engine.calcOverall(skillCopy, skillCopy.position);
      const profileLab = lab(original, fields);
      const prepared = run(seed, id + ':repair', profileLab.value, value => api.engine.repairCareer(value));
      const closed = run(seed, id + ':close', prepared.after, value => api.engine.advanceProSeason(value, clubs));
      const row = closed.after.seasons[closed.after.seasons.length - 1];
      const receipt = closed.after.extraCupQualification;
      const validCupRun = api.cup.readCupRun(row);
      const record = { id, profile: profile.id, seed, profileLab, prepared, closed,
        observed: { year: row.year, phase: closed.after.phase, type: row.type, club: row.club,
          ownLeague: row.leagueWorld?.league ?? null, leagueTitle: row.leagueTitle, domesticCup: row.domesticCup,
          faCupRunValid: validCupRun?.cup === 'FA Cup', severe: row.injurySevere === true,
          receiptStatus: receipt?.status ?? 'absent', receipt: clone(receipt ?? null) }, pair: null };
      write(path.join(out, 'closes', profile.id + '-' + String(seed).padStart(2, '0') + '.json'), record);
      if (receipt?.status === 'ready') {
        const representedName = receipt.entrants.some(e => same(e.club, profile.club.name)) ? profile.club.name : receipt.entrants[0].club;
        const represented = clubs.find(c => same(c.name, representedName));
        assert(represented, 'Actual supplied qualifier club is required, never invent a binding');
        const openingLab = lab(closed.after, { phase: 'playing', currentClub: represented.name,
          currentClubCountry: represented.country, currentClubTier: represented.tier, currentClubColor: represented.color, currentLeague: represented.league });
        const absent = clone(openingLab.value);
        delete absent.extraCupQualification;
        record.pair = { context: 'Labelled after-window club/consumer-phase lab, not a played offer or loan.', input: openingLab.value, lab: openingLab,
          present: run(seed, id + ':opening-present', openingLab.value, value => api.engine.advanceProSeason(value, clubs)),
          absent: run(seed, id + ':opening-absent', absent, value => api.engine.advanceProSeason(value, clubs)) };
      }
      cases.push(record);
      const file = 'cases/' + profile.id + '-' + String(seed).padStart(2, '0') + '.json';
      write(path.join(out, file), record);
      verifyPair(record);
      if (seed % 16 === 15) console.log('Observed ' + profile.id + ' fixed close seeds0..' + seed);
      const last = record.pair?.present.after.seasons.at(-1);
      const match = last ? api.extra.readCommunityShield(last) : null;
      index.push({ id, file, ...record.observed, receipt: undefined, pairAttempted: !!record.pair,
        openingPhase: record.pair?.present.after.phase ?? null, openingSevere: last?.injurySevere === true,
        openingMatch: match ? { eventYear: match.eventYear, seed: match.seed, entrants: match.entrants, score: match.score,
          penalties: match.penalties ?? null, winner: match.winner, player: match.player } : null });
    }
    assert.equal(cases.length, 128, 'Fixed two-profile64seed cohort must be complete');
    write(path.join(out, 'index.json'), index);
    const branchFoundation = cases.find(record => record.pair);
    assert(branchFoundation, 'SC_ENGINE_BRANCH_FOUNDATION: no actual ready opening context was observed');
    for (const [id, fields] of [['ban', { matchFixBanned: 2 }], ['prison', { prisonSeasons: 1 }], ['age45', { age: 44, retired: false }]]) {
      const changed = lab(branchFoundation.pair.input, fields);
      const record = { id, foundationId: branchFoundation.id, context: 'Explicit interruption field lab on a captured ready opening context.',
        lab: changed, action: run(64, 'interruption:' + id, changed.value, value => api.engine.advanceProSeason(value, clubs)) };
      interrupted.push(record);
      write(path.join(out, 'interruptions', id + '.json'), record);
      verifyInterrupted(record);
    }
    const controls = [];
    const controlPair = cases.find(record => record.pair);
    for (const control of [
      { id: 'tape', marker: 'SC_ENGINE_PAIR_TAPE', base: controlPair,
        change: value => { value.pair.present.draws.push(0.125); }, verify: verifyPair },
      { id: 'old-field', marker: 'SC_ENGINE_PAIR_ANNUAL', base: controlPair,
        change: value => { value.pair.present.after.seasons.at(-1).yellowCards += 1; }, verify: verifyPair },
      { id: 'stats', marker: 'SC_ENGINE_PAIR_STATS', base: controlPair,
        change: value => { value.pair.present.after.seasons.at(-1).apps += 1; }, verify: verifyPair },
      { id: 'interruption', marker: 'SC_ENGINE_INTERRUPTED', base: interrupted[0],
        change: value => { value.action.after.seasons.at(-1).apps = 1; }, verify: verifyInterrupted },
    ]) {
      const base = clone(control.base), changed = clone(base);
      control.change(changed);
      const originalSha256 = sha(Buffer.from(json(base))), changedSha256 = sha(Buffer.from(json(changed)));
      assert.notEqual(originalSha256, changedSha256, 'Observation mutation must change data');
      let refusal = null;
      try { control.verify(changed); } catch (error) { refusal = error; }
      assert(refusal instanceof assert.AssertionError && refusal.message.startsWith(control.marker), 'Observation control must own its named guard: ' + control.id);
      const restored = clone(base); control.verify(restored);
      assert.equal(sha(Buffer.from(json(restored))), originalSha256, 'Observation restore must be exact');
      write(path.join(out, 'control-' + control.id + '.json'), { id: control.id, marker: control.marker, originalSha256, changedSha256,
        restoredSha256: sha(Buffer.from(json(restored))), refusal: { name: refusal.name, message: refusal.message } });
      controls.push({ id: control.id, marker: control.marker, changed: true, ownedRefusal: true, restored: true });
    }
    const candidates = {
      selected: index.filter(r => r.openingMatch?.player.selected).map(r => r.id),
      directPenalties: index.filter(r => r.openingMatch?.penalties).map(r => r.id),
      selectedBeforeSevere: index.filter(r => r.openingSevere && r.openingMatch?.player.selected).map(r => r.id),
      ownEnglishDouble: cases.filter(r => r.observed.ownLeague === 'Premier League' && r.observed.leagueTitle && r.observed.domesticCup
        && r.observed.faCupRunValid && r.closed.after.extraCupQualification?.status === 'ready').map(r => r.id),
      lowerFaWinner: cases.filter(r => r.observed.ownLeague === 'Championship' && r.observed.domesticCup
        && r.observed.faCupRunValid && r.closed.after.extraCupQualification?.status === 'ready').map(r => r.id),
    };
    const histogram = values => values.reduce((counts, value) => { counts[String(value)] = (counts[String(value)] ?? 0) + 1; return counts; }, {});
    summary = { schemaVersion: 1, scope: 'Descriptive actual annual integration, not full feature or balance readiness.',
      profiles: profiles.map(p => ({ id: p.id, club: p.club.name, league: p.league, skillLab: 85 })),
      closeAttempts: cases.length, preparedCalls: cases.length, openingPairs: cases.filter(r => r.pair).length,
      openingAdvanceCalls: cases.filter(r => r.pair).length * 2, interruptionCalls: interrupted.length,
      annualSeeds: { first: 0, last: 63, countPerProfile: 64 }, receiptStatuses: histogram(index.map(r => r.receiptStatus)),
      closingPhases: histogram(index.map(r => r.phase)), openingPhases: histogram(index.filter(r => r.pairAttempted).map(r => r.openingPhase)),
      candidates, missingWitnesses: Object.entries(candidates).filter(([, ids]) => ids.length === 0).map(([id]) => id),
      interrupted: interrupted.map(r => ({ id: r.id, phase: r.action.after.phase, row: r.action.after.seasons.at(-1) })),
      observationControls: controls, noRateMargin: true, readiness: 'UNASSESSED',
      qaGlobals: { annualLcg: true, fixedClock: CLOCK, storage: 'empty in-memory boundary, no persistence proof' } };
  } catch (error) { primary = error; }
  finally {
    try {
      for (const [file, expected] of held) {
        const actual = fs.readFileSync(file);
        assert.deepEqual(actual, expected, 'Held input changed: ' + relative(file));
        sourceHolds.push({ file: relative(file), bytes: actual.length, sha256: sha(actual) });
      }
      write(path.join(out, 'source-holds.json'), sourceHolds);
    } catch (error) { secondary.push({ name: error.name, message: error.message }); }
    try { write(path.join(out, 'storage-operations.json'), storageOperations); }
    catch (error) { secondary.push({ name: error.name, message: error.message }); }
    try {
      if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor);
      else delete globalThis.localStorage;
    } catch (error) { secondary.push({ name: error.name, message: error.message }); }
    try {
      if (!fs.existsSync(path.join(out, 'index.json'))) write(path.join(out, 'partial-index.json'), index);
      if (summary) write(path.join(out, 'summary.json'), { ...summary, producerCompleted: !primary && secondary.length === 0 });
      write(path.join(out, 'receipt.json'), { producerCompleted: !primary && secondary.length === 0, closeRecords: cases.length,
        openingPairs: cases.filter(r => r.pair).length, interruptionRecords: interrupted.length,
        primary: primary ? { name: primary.name, message: primary.message, stack: primary.stack } : null, secondary });
    } catch (error) { secondary.push({ name: error.name, message: error.message }); }
  }
  if (primary) throw primary;
  assert.equal(secondary.length, 0, 'Engine probe input/output hold failed');
  console.log('SC_SHIELD_ENGINE_PROBE: ' + cases.length + ' fixed close observations, ' + summary.openingPairs
    + ' paired openings, ' + interrupted.length + ' actual interruption branches; missing witnesses=' + JSON.stringify(summary.missingWitnesses) + '. Descriptive only.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
