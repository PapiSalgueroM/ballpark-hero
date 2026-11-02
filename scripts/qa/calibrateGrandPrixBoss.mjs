import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

// Calibration evidence only. Choose any balance thresholds after reading these outcomes.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const expectedInputs = {
  'src/lib/grandPrixBoss.ts': 'ec793e9cacb47bf770d599b1677f76ac753d2cafde9c1f85e6bb0cf7dc7bc69b',
  'src/lib/keyedRng.ts': 'dc78803cd8f86fd73c70e26b36faf40915b4e6bbca7f6b0c4efffab28e9032ef',
  'package.json': 'acfe14626dea53cf5f9c5e0286b766a22237656b52aac4c888b080873ac90e31',
  'package-lock.json': 'c7e3867eabf0bfa03a8aa6a5e601b0050b937ed210d48c6bbd241019e3c9ea76',
};
const held = new Map(Object.keys(expectedInputs).map(file => [file, fs.readFileSync(path.join(ROOT, file))]));
for (const [file, bytes] of held) assert.equal(sha(bytes), expectedInputs[file], 'Wrong pinned calibration input: ' + file);
const base = process.env.GP_BOSS_CALIBRATION_OUT || os.tmpdir();
fs.mkdirSync(base, { recursive: true });
const OUT = fs.mkdtempSync(path.join(base, 'dukb-grand-prix-calibration-'));
const writeJson = (file, value) => fs.writeFileSync(path.join(OUT, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const originalBytes = held.get('src/lib/grandPrixBoss.ts');
const original = originalBytes.toString('utf8');
const definitions = [
  { id: 'baseline-team6', label: 'Unchanged v5, original team 6 and drivers 12/13', edits: [] },
  { id: 'ownership-team4', label: 'Different owned team and drivers: team 4, drivers 8/9, same user wages', edits: [
    ['const teamId = teams[6].id;', 'const teamId = teams[4].id;'],
    ['drivers[12].contract!.wagePerRace = 180_000;', 'drivers[8].contract!.wagePerRace = 180_000;'],
    ['drivers[13].contract!.wagePerRace = 120_000;', 'drivers[9].contract!.wagePerRace = 120_000;'],
  ] },
  { id: 'narrower-field-team6', label: 'Team 6 retained, car gaps 2 per team; generated driver pace follows car power', edits: [
    ['power: 86 - index * 3 + ri(-2, 2)', 'power: 86 - index * 2 + ri(-2, 2)'],
    ['aero: 84 - index * 3 + ri(-2, 2)', 'aero: 84 - index * 2 + ri(-2, 2)'],
  ] },
];
const naturalSeeds = Array.from({ length: 256 }, (_, index) => index + 1);
const seasonSeeds = Array.from({ length: 32 }, (_, index) => index + 10_001);
const policies = ['aware-no-spend', 'unsuitable-no-spend', 'aware-quoted-upgrades'];
writeJson('settings.json', {
  purpose: 'Measurement, no numerical readiness or winning-arm assertion', expectedInputs,
  naturalSeeds, seasonSeeds, policies,
  ownershipCaveat: 'Ownership arm has different owned drivers. Cross-arm comparisons share complete world seeds, not identical owned identities.',
  upgradePolicy: 'At most one affordable power/aero upgrade per round, choose current track greater weight first, use authoritative engine quote and real purchase.',
  sourceCopyEdits: definitions,
});
let admittedStates = 0;
const arms = [];
const copiedHolds = new Map();
const natural = [];
const seasons = [];
function stats(values) {
  assert(values.length > 0 && values.every(Number.isFinite), 'All observations must be finite and present');
  const sorted = [...values].sort((a, b) => a - b);
  const q = p => sorted[Math.floor((sorted.length - 1) * p)];
  return { n: values.length, mean: values.reduce((sum, value) => sum + value, 0) / values.length, p10: q(0.1), p50: q(0.5), p90: q(0.9) };
}
const driversFor = state => state.drivers.filter(driver => driver.contract?.teamId === state.teamId);
function armReader(engine, armId) {
  return (state, label) => {
    const read = engine.validateSavedCareer(state);
    assert.equal(read.ok, true, 'Reader refused ' + armId + ' ' + label + ': ' + JSON.stringify(read));
    admittedStates += 1;
    return read.state;
  };
}
function makeRunner(engine, armId) {
  const admit = armReader(engine, armId);
  function step(state, action) {
    state = admit(state, 'before ' + action.type);
    const transition = engine.applyAction(state, { ...action, expectedRevision: state.revision });
    assert.equal(transition.ok, true, 'Action refused ' + armId + ': ' + JSON.stringify({ action, transition }));
    return { state: admit(transition.state, 'after ' + action.type), receipt: transition.receipt };
  }
  function runRace(state, policy) {
    state = admit(state, 'round initial');
    assert.equal(state.phase, 'preRace');
    const purchases = [];
    if (policy === 'aware-quoted-upgrades') {
      const track = state.calendar[state.round];
      const preferred = track.powerWeight >= track.aeroWeight ? ['power', 'aero'] : ['aero', 'power'];
      const area = preferred.find(key => state.upgradeCosts[key] !== null && state.upgradeCosts[key] <= state.cash - state.reserved);
      if (area) {
        const quoted = state.upgradeCosts[area];
        const cashBefore = state.cash;
        const carBefore = { ...state.teams.find(team => team.id === state.teamId).car };
        const bought = step(state, { type: 'upgrade', area });
        state = bought.state;
        assert.equal(bought.receipt.cost, quoted, 'Actual purchase receipt must equal the public quote');
        assert.equal(cashBefore - state.cash, quoted, 'Actual purchase must charge exactly the quoted amount');
        purchases.push({ area, quoted, receipt: bought.receipt, cashBefore, cashAfter: state.cash, carBefore, carAfter: { ...state.teams.find(team => team.id === state.teamId).car } });
      }
    }
    state = step(state, { type: 'qualify' }).state;
    const unsuitable = policy === 'unsuitable-no-spend';
    const decisions = [{ lap: 0, weather: state.race.weather, setups: driversFor(state).map(driver => ({
      driverId: driver.id, pace: unsuitable ? 'push' : 'balanced',
      compound: unsuitable ? 'soft' : state.race.weather === 'wet' ? 'wet' : 'medium',
    })) }];
    state = step(state, { type: 'startRace', setups: decisions[0].setups }).state;
    while (state.phase === 'race') {
      const orders = driversFor(state).map(driver => {
        const entry = state.race.entries.find(row => row.driverId === driver.id);
        let pitTo;
        if (!unsuitable && state.race.lap > 0 && entry.status === 'running') {
          if (state.race.weather === 'wet' && entry.compound !== 'wet') pitTo = 'wet';
          else if (state.race.weather === 'dry' && entry.compound === 'wet') pitTo = 'medium';
          else if (entry.tyreWear > 58) pitTo = state.race.weather === 'wet' ? 'wet' : 'hard';
        }
        return { driverId: driver.id, pace: unsuitable ? 'push' : 'balanced', ...(pitTo ? { pitTo } : {}) };
      });
      decisions.push({ lap: state.race.lap, weather: state.race.weather, orders });
      state = step(state, { type: 'raceInterval', orders }).state;
    }
    assert(['raceResult', 'seasonReview'].includes(state.phase));
    const result = state.results.at(-1);
    const owned = result.classification.filter(row => row.teamId === state.teamId);
    const ids = new Set(owned.map(row => row.driverId));
    const entries = state.race.entries.filter(row => ids.has(row.driverId));
    assert.equal(owned.length, 2);
    assert.equal(entries.length, 2);
    return { state, observation: {
      round: state.round, roundId: result.roundId, points: owned.reduce((sum, row) => sum + row.points, 0),
      meanPosition: owned.reduce((sum, row) => sum + row.position, 0) / 2,
      finished: owned.filter(row => row.status === 'finished').length,
      retired: owned.filter(row => row.status === 'retired').length,
      completedLaps: entries.reduce((sum, row) => sum + row.completedLaps, 0),
      elapsedMs: entries.reduce((sum, row) => sum + row.elapsedMs, 0),
      cash: state.cash, reserved: state.reserved, available: state.cash - state.reserved,
      teamPrize: result.teamPrize, operatingCost: result.operatingCost,
      purchases, decisions, ownEntries: entries, classification: result.classification,
    } };
  }
  return { admit, step, runRace };
}
function naturalStats(rows, policy) {
  const observations = rows.map(row => row[policy]);
  return {
    points: stats(observations.map(row => row.points)),
    scoringRaceFraction: observations.filter(row => row.points > 0).length / observations.length,
    meanPosition: stats(observations.map(row => row.meanPosition)),
    completedLaps: stats(observations.map(row => row.completedLaps)),
    finishedCars: stats(observations.map(row => row.finished)),
    retiredCars: stats(observations.map(row => row.retired)),
    totalFinished: observations.reduce((sum, row) => sum + row.finished, 0),
    totalRetired: observations.reduce((sum, row) => sum + row.retired, 0),
    cash: stats(observations.map(row => row.cash)), reserve: stats(observations.map(row => row.reserved)),
  };
}
function seasonStats(rows) {
  return {
    points: stats(rows.map(row => row.points)),
    scoringSeasonFraction: rows.filter(row => row.points > 0).length / rows.length,
    scoringRaceFraction: rows.reduce((sum, row) => sum + row.rounds.filter(round => round.points > 0).length, 0) / (rows.length * 12),
    constructorPosition: stats(rows.map(row => row.constructorPosition)),
    meanRacePosition: stats(rows.map(row => row.meanRacePosition)),
    completedLaps: stats(rows.map(row => row.completedLaps)),
    finishedCars: stats(rows.map(row => row.finished)), retiredCars: stats(rows.map(row => row.retired)),
    cash: stats(rows.map(row => row.cash)), reserve: stats(rows.map(row => row.reserved)),
    available: stats(rows.map(row => row.cash - row.reserved)),
    upgradeCount: stats(rows.map(row => row.upgradeCount)), upgradeSpend: stats(rows.map(row => row.upgradeSpend)),
    finalPower: stats(rows.map(row => row.finalCar.power)), finalAero: stats(rows.map(row => row.finalCar.aero)),
    finalReliability: stats(rows.map(row => row.finalCar.reliability)),
  };
}
try {
  for (const definition of definitions) {
    const dir = path.join(OUT, definition.id);
    fs.mkdirSync(dir);
    let modified = original;
    const mutations = [];
    for (const [before, after] of definition.edits) {
      assert.equal(modified.split(before).length - 1, 1, 'Source intervention must match exactly once');
      assert.equal(modified.includes(after), false, 'Replacement must not already occur');
      const offset = modified.indexOf(before);
      modified = modified.replace(before, after);
      mutations.push({ before, after, offset });
    }
    let inverse = modified;
    for (const { before, after } of [...mutations].reverse()) {
      assert.equal(inverse.split(after).length - 1, 1, 'Inverse intervention must match exactly once');
      inverse = inverse.replace(after, before);
    }
    assert.equal(inverse, original, 'Whole inverse must reproduce exact original source');
    const bytes = Buffer.from(modified, 'utf8');
    if (definition.edits.length === 0) assert(bytes.equals(originalBytes), 'Baseline copy must be byte-identical');
    else assert.notEqual(sha(bytes), sha(originalBytes), 'Intervention must change copied source');
    const source = path.join(dir, 'grandPrixBoss.ts');
    fs.writeFileSync(source, bytes, { flag: 'wx' });
    copiedHolds.set(source, bytes);
    const modulePath = path.join(dir, 'engine.mjs');
    const bundled = await build({ absWorkingDir: ROOT, entryPoints: [source], outfile: modulePath,
      bundle: true, platform: 'node', format: 'esm', sourcemap: 'external', metafile: true, alias: { '@': path.join(ROOT, 'src') } });
    const inputPaths = Object.keys(bundled.metafile.inputs).map(file => path.resolve(ROOT, file)).sort();
    assert.deepEqual(inputPaths, [source, path.join(ROOT, 'src/lib/keyedRng.ts')].sort(), 'Bundle must include only copied engine and held real helper');
    writeJson(definition.id + '/bundle-inputs.json', bundled.metafile);
    const sourceEvidence = { id: definition.id, label: definition.label, sourceSha256: sha(bytes), sourceBytes: bytes.length,
      originalSha256: sha(originalBytes), mutations, wholeInverseSha256: sha(Buffer.from(inverse, 'utf8')),
      moduleSha256: sha(fs.readFileSync(modulePath)), moduleInputs: inputPaths,
    };
    writeJson(definition.id + '/source-evidence.json', sourceEvidence);
    const engine = await import(pathToFileURL(modulePath).href);
    for (const name of ['createCareer', 'applyAction', 'validateSavedCareer', 'seasonScore']) assert.equal(typeof engine[name], 'function');
    const runner = makeRunner(engine, definition.id);
    for (const seed of naturalSeeds) {
      const initial = runner.admit(engine.createCareer(seed), 'natural generated');
      const aware = runner.runRace(initial, 'aware-no-spend').observation;
      const unsuitable = runner.runRace(initial, 'unsuitable-no-spend').observation;
      natural.push({ arm: definition.id, seed, teamId: initial.teamId, ownedDriverIds: driversFor(initial).map(driver => driver.id),
        initialWorld: initial, aware, unsuitable });
    }
    for (const seed of seasonSeeds) {
      for (const policy of policies) {
        let state = runner.admit(engine.createCareer(seed), 'season generated');
        const initialCash = state.cash;
        const initialCar = { ...state.teams.find(team => team.id === state.teamId).car };
        const rounds = [];
        for (let round = 0; round < 12; round += 1) {
          assert.equal(state.round, round);
          const raced = runner.runRace(state, policy);
          state = raced.state;
          rounds.push(raced.observation);
          if (round < 11) state = runner.step(state, { type: 'continue' }).state;
        }
        state = runner.admit(state, 'complete season saved');
        assert.equal(state.phase, 'seasonReview');
        assert.equal(state.results.length, 12);
        const upgradeSpend = rounds.flatMap(round => round.purchases).reduce((sum, purchase) => sum + purchase.quoted, 0);
        assert.equal(state.cash, initialCash - upgradeSpend + rounds.reduce((sum, round) => sum + round.teamPrize - round.operatingCost, 0), 'Whole season cash must reconcile');
        const constructorPosition = state.constructorStandings.findIndex(row => row.teamId === state.teamId) + 1;
        assert(constructorPosition > 0);
        seasons.push({ arm: definition.id, seed, policy, teamId: state.teamId, ownedDriverIds: driversFor(state).map(driver => driver.id),
          points: state.constructorStandings[constructorPosition - 1].points, constructorPosition,
          meanRacePosition: rounds.reduce((sum, round) => sum + round.meanPosition, 0) / 12,
          completedLaps: rounds.reduce((sum, round) => sum + round.completedLaps, 0),
          finished: rounds.reduce((sum, round) => sum + round.finished, 0), retired: rounds.reduce((sum, round) => sum + round.retired, 0),
          cash: state.cash, reserved: state.reserved, upgradeCount: rounds.flatMap(round => round.purchases).length,
          upgradeSpend, initialCar, finalCar: { ...state.teams.find(team => team.id === state.teamId).car }, rounds, finalState: state,
        });
      }
    }
    const ownNatural = natural.filter(row => row.arm === definition.id);
    const ownSeasons = seasons.filter(row => row.arm === definition.id);
    const pairedSeasons = seasonSeeds.map(seed => {
      const records = Object.fromEntries(ownSeasons.filter(row => row.seed === seed).map(row => [row.policy, row]));
      const aware = records['aware-no-spend'], unsuitable = records['unsuitable-no-spend'], invested = records['aware-quoted-upgrades'];
      return { seed, strategyPointsGain: aware.points - unsuitable.points,
        strategyPositionGain: unsuitable.meanRacePosition - aware.meanRacePosition,
        strategyRetirementsAvoided: unsuitable.retired - aware.retired,
        investmentPointsGain: invested.points - aware.points,
        investmentPositionGain: aware.meanRacePosition - invested.meanRacePosition,
        investmentConstructorPositionGain: aware.constructorPosition - invested.constructorPosition,
        investmentCashDifference: invested.cash - aware.cash, investedUpgradeCount: invested.upgradeCount,
      };
    });
    arms.push({ ...sourceEvidence, natural: {
      aware: naturalStats(ownNatural, 'aware'), unsuitable: naturalStats(ownNatural, 'unsuitable'),
      pairedPointGain: stats(ownNatural.map(row => row.aware.points - row.unsuitable.points)),
      pairedPositionGain: stats(ownNatural.map(row => row.unsuitable.meanPosition - row.aware.meanPosition)),
      pairedLapsGain: stats(ownNatural.map(row => row.aware.completedLaps - row.unsuitable.completedLaps)),
    }, seasons: Object.fromEntries(policies.map(policy => [policy, seasonStats(ownSeasons.filter(row => row.policy === policy))])),
    pairedSeasons, pairedSeasonStats: Object.fromEntries(Object.keys(pairedSeasons[0]).filter(key => key !== 'seed').map(key => [key, stats(pairedSeasons.map(row => row[key]))])) });
    console.log('Completed calibration arm ' + definition.id + ': 256 natural pairs and 96 complete 12-race seasons.');
  }
  assert.equal(natural.length, 768);
  assert.equal(seasons.length, 288);
  writeJson('all-pairs.json', { natural, seasons });
  const summary = { version: 1, purpose: 'Measurement only; no numerical balance thresholds or selected product change',
    source: expectedInputs, naturalPairs: natural.length, completeSeasons: seasons.length,
    seasonRaces: seasons.reduce((sum, row) => sum + row.rounds.length, 0), admittedStates,
    seedLists: { natural: naturalSeeds, seasons: seasonSeeds }, arms,
  };
  writeJson('summary.json', summary);
  console.log(JSON.stringify(summary, null, 2));
  console.log('Grand Prix Boss calibration captured 768 natural pairs and 288 full seasons. Read actual outcomes before selecting balance changes.');
} finally {
  for (const [file, bytes] of held) assert(fs.readFileSync(path.join(ROOT, file)).equals(bytes), 'Actual source/package changed: ' + file);
  for (const [file, bytes] of copiedHolds) assert(fs.readFileSync(file).equals(bytes), 'Calibration copied source changed after compilation: ' + file);
  console.log('Grand Prix Boss calibration evidence: ' + OUT);
}
