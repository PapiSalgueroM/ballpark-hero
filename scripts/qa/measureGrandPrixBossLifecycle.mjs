import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

assert.equal(process.env.CI, '1');
assert.equal(process.env.SIM_NETWORK, 'offline');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sha = value => createHash('sha256').update(value).digest('hex');
const inputs = ['src/lib/grandPrixBoss.ts', 'src/lib/keyedRng.ts', 'package.json', 'package-lock.json'];
const held = new Map(inputs.map(file => [file, fs.readFileSync(path.join(ROOT, file))]));
const originalBytes = held.get(inputs[0]), original = originalBytes.toString('utf8');
assert.equal(sha(originalBytes), '3a3e5652fbf43bfe13e9802521821378cc3221f7942f05f15b7242c98b1fea92', 'Exact candidate C source required');
const outBase = path.resolve(process.env.GP_BOSS_LIFECYCLE_MEASURE_OUT || os.tmpdir());
fs.mkdirSync(outBase, { recursive: true });
const OUT = fs.mkdtempSync(path.join(outBase, 'dukb-grand-prix-lifecycle-measure-'));
const writeJson = (file, value) => fs.writeFileSync(path.join(OUT, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const sourceReceipts = () => [...held].map(([file, bytes]) => ({ file, bytes: bytes.length, sha256: sha(bytes) }));
writeJson('source-before.json', sourceReceipts());
const startup = [
  ['const teamId = teams[6].id;', 'const teamId = teams[4].id;'],
  ['drivers[12].contract!.wagePerRace = 180_000;', 'drivers[8].contract!.wagePerRace = 180_000;'],
  ['drivers[13].contract!.wagePerRace = 120_000;', 'drivers[9].contract!.wagePerRace = 120_000;'],
];
const definitions = [
  { id: 'partial-ai', label: 'Candidate70percent carry and +2 weakest-area AI', edits: [] },
  { id: 'full-no-ai', label: 'Full carry, no AI car investment', edits: [['const CAR_CARRY = 0.7;', 'const CAR_CARRY = 1;'], ['const AI_INVESTMENT = 2;', 'const AI_INVESTMENT = 0;']] },
  { id: 'partial-no-ai', label: '70percent carry, no AI car investment', edits: [['const AI_INVESTMENT = 2;', 'const AI_INVESTMENT = 0;']] },
];
const seeds = Array.from({ length: 32 }, (_, index) => index + 10_001);
const policies = ['aware-no-spend', 'aware-quoted-upgrades'];
const areas = ['power', 'aero', 'reliability'], skillKeys = ['pace', 'consistency', 'tyreCare', 'wet'];
const clone = value => JSON.parse(JSON.stringify(value));
const mine = state => state.drivers.filter(driver => driver.contract?.teamId === state.teamId);
const ownTeam = state => state.teams.find(team => team.id === state.teamId);
const records = [], arms = [], copiedHolds = new Map(), firstSeasons = new Map(), initialWorlds = new Map();
let admittedStates = 0, transitions = 0;
const journal = fs.openSync(path.join(OUT, 'transitions.jsonl'), 'wx');
writeJson('settings.json', { scope: 'Candidate measurement only, no thresholds or coefficient adoption', seeds, policies, seasonsPerCareer: 10,
  commonStartup: startup, arms: definitions, upgradePolicy: 'At most one affordable power/aero purchase per race, track greater weight first, authoritative engine quote only.',
  pairing: 'Common full world seeds and external keyed streams. Every arm has exactly the same team4/driver8-9 allocation. Investment actions may differ with actual cash and carried car.',
  stateEvidence: 'Every admitted action retains full action/receipt and exact state SHA, money, phase and roster digest. Initial and complete review/rollover worlds are retained separately.' });
function stats(values) {
  assert(values.length && values.every(Number.isFinite));
  const sorted = values.slice().sort((a, b) => a - b), at = p => sorted[Math.floor((sorted.length - 1) * p)];
  return { n: values.length, mean: values.reduce((sum, n) => sum + n, 0) / values.length, p10: at(.1), p50: at(.5), p90: at(.9) };
}
function makeRunner(engine, arm, seed, policy) {
  const admit = (state, label) => {
    const bytes = JSON.stringify(state), loaded = engine.validateSavedCareer(state);
    assert.equal(JSON.stringify(state), bytes, 'Reader input held');
    assert.equal(loaded.ok, true, arm + ' refused ' + label + ': ' + JSON.stringify(loaded));
    admittedStates += 1;
    return loaded.state;
  };
  const step = (state, action) => {
    state = admit(state, 'before ' + action.type);
    const before = JSON.stringify(state), result = engine.applyAction(state, { ...action, expectedRevision: state.revision });
    assert.equal(JSON.stringify(state), before, 'Action input held');
    assert.equal(result.ok, true, JSON.stringify({ arm, seed, policy, action, result }));
    assert.equal(result.state.revision, state.revision + 1); assert.equal(result.receipt.revision, result.state.revision);
    const after = admit(result.state, 'after ' + action.type);
    fs.writeSync(journal, JSON.stringify({ arm, seed, policy, action: { ...action, expectedRevision: state.revision }, receipt: result.receipt,
      stateSha256: sha(JSON.stringify(after)), season: after.season, round: after.round, phase: after.phase, cash: after.cash, reserved: after.reserved,
      rosterSha256: sha(JSON.stringify(after.drivers)), revision: after.revision }) + '\n');
    transitions += 1;
    return { state: after, receipt: result.receipt };
  };
  function runRace(state) {
    assert.equal(state.phase, 'preRace');
    const purchases = [];
    if (policy === 'aware-quoted-upgrades') {
      const track = state.calendar[state.round], preferred = track.powerWeight >= track.aeroWeight ? ['power', 'aero'] : ['aero', 'power'];
      const area = preferred.find(key => state.upgradeCosts[key] !== null && state.upgradeCosts[key] <= state.cash - state.reserved);
      if (area) {
        const quote = state.upgradeCosts[area], before = state.cash, carBefore = clone(ownTeam(state).car);
        const bought = step(state, { type: 'upgrade', area }); state = bought.state;
        assert.equal(bought.receipt.cost, quote); assert.equal(before - state.cash, quote);
        purchases.push({ area, quote, receipt: bought.receipt, cashBefore: before, cashAfter: state.cash, carBefore, carAfter: clone(ownTeam(state).car) });
      }
    }
    const cashBefore = state.cash;
    state = step(state, { type: 'qualify' }).state;
    const grid = clone(state.race.grid), decisions = [];
    const setups = mine(state).map(driver => ({ driverId: driver.id, pace: 'balanced', compound: state.race.weather === 'wet' ? 'wet' : 'medium' }));
    decisions.push({ lap: 0, weather: state.race.weather, setups });
    state = step(state, { type: 'startRace', setups }).state;
    let settlement;
    while (state.phase === 'race') {
      const orders = mine(state).map(driver => {
        const entry = state.race.entries.find(row => row.driverId === driver.id);
        let pitTo;
        if (state.race.lap > 0 && entry.status === 'running') {
          if (state.race.weather === 'wet' && entry.compound !== 'wet') pitTo = 'wet';
          else if (state.race.weather === 'dry' && entry.compound === 'wet') pitTo = 'medium';
          else if (entry.tyreWear > 58) pitTo = state.race.weather === 'wet' ? 'wet' : 'hard';
        }
        return { driverId: driver.id, pace: 'balanced', ...(pitTo ? { pitTo } : {}) };
      });
      decisions.push({ lap: state.race.lap, weather: state.race.weather, orders });
      const moved = step(state, { type: 'raceInterval', orders }); state = moved.state; settlement = moved.receipt;
    }
    assert(['raceResult', 'seasonReview'].includes(state.phase));
    const result = state.results.at(-1), owned = result.classification.filter(row => row.teamId === state.teamId);
    assert.equal(owned.length, 2); assert.equal(state.cash, cashBefore + result.teamPrize - result.operatingCost);
    assert.equal(settlement.teamPrize, result.teamPrize); assert.equal(settlement.operatingCost, result.operatingCost);
    return { state, observation: { round: state.round, roundId: result.roundId, points: owned.reduce((sum, row) => sum + row.points, 0),
      meanPosition: owned.reduce((sum, row) => sum + row.position, 0) / 2, finished: owned.filter(row => row.status === 'finished').length,
      retired: owned.filter(row => row.status === 'retired').length, cash: state.cash, reserved: state.reserved,
      teamPrize: result.teamPrize, operatingCost: result.operatingCost, purchases, decisions, grid,
      entries: clone(state.race.entries), classification: clone(result.classification) } };
  }
  return { admit, step, runRace };
}
function seasonStats(rows) {
  return { points: stats(rows.map(row => row.points)), constructorPosition: stats(rows.map(row => row.constructorPosition)),
    scoringSeasonFraction: rows.filter(row => row.points > 0).length / rows.length,
    scoringRaceFraction: rows.reduce((sum, row) => sum + row.rounds.filter(round => round.points > 0).length, 0) / (rows.length * 12),
    meanRacePosition: stats(rows.map(row => row.meanPosition)), wins: stats(rows.map(row => row.wins)),
    driverTitleFraction: rows.filter(row => row.driverTitle).length / rows.length,
    constructorTitleFraction: rows.filter(row => row.constructorTitle).length / rows.length,
    endReviewCash: stats(rows.map(row => row.endReviewCash)), rolloverCash: stats(rows.map(row => row.rolloverCash)), reserve: stats(rows.map(row => row.nextReserved)),
    upgrades: stats(rows.map(row => row.upgrades)), upgradeSpend: stats(rows.map(row => row.upgradeSpend)),
    retirements: stats(rows.map(row => row.retiredDrivers.length)), finishedCars: stats(rows.map(row => row.finished)), retiredCars: stats(rows.map(row => row.raceRetired)),
    finalPower: stats(rows.map(row => row.finalCar.power)), nextPower: stats(rows.map(row => row.nextCar.power)),
    finalAero: stats(rows.map(row => row.finalCar.aero)), nextAero: stats(rows.map(row => row.nextCar.aero)),
    meanDriverAge: stats(rows.map(row => row.meanAge)), meanAiCar: stats(rows.map(row => row.meanAiCar)),
    meanSkills: Object.fromEntries(skillKeys.map(skill => [skill, stats(rows.map(row => row.meanSkills[skill]))])),
    ageBands: Object.fromEntries(['under27', 'peak27to32', 'veteran33plus'].map(band => [band, stats(rows.map(row => row.ageBands[band]))])) };
}
try {
  for (const definition of definitions) {
    const dir = path.join(OUT, definition.id); fs.mkdirSync(dir);
    let changed = original;
    const mutations = [];
    for (const [before, after] of [...startup, ...definition.edits]) {
      const code = changed.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\n)\s*\/\/[^\n]*/g, '$1');
      assert.equal(code.split(before).length - 1, 1); assert.equal(changed.split(before).length - 1, 1);
      const offset = changed.indexOf(before); changed = changed.slice(0, offset) + after + changed.slice(offset + before.length);
      mutations.push({ before, after, offset });
    }
    assert.notEqual(sha(changed), sha(originalBytes));
    let inverse = changed;
    for (const { before, after, offset } of mutations.slice().reverse()) inverse = inverse.slice(0, offset) + before + inverse.slice(offset + after.length);
    assert.equal(inverse, original);
    const source = path.join(dir, 'grandPrixBoss.ts'), bytes = Buffer.from(changed);
    fs.writeFileSync(source, bytes, { flag: 'wx' }); copiedHolds.set(source, bytes);
    const modulePath = path.join(dir, 'engine.mjs');
    const compiled = await build({ absWorkingDir: ROOT, entryPoints: [source], outfile: modulePath, bundle: true, platform: 'node', format: 'esm', metafile: true,
      sourcemap: 'external', alias: { '@': path.join(ROOT, 'src') } });
    const moduleInputs = Object.keys(compiled.metafile.inputs).map(file => path.resolve(ROOT, file)).sort();
    assert.deepEqual(moduleInputs, [source, path.join(ROOT, 'src/lib/keyedRng.ts')].sort());
    writeJson(definition.id + '/bundle-inputs.json', compiled.metafile);
    const evidence = { id: definition.id, label: definition.label, sourceSha256: sha(bytes), originalSha256: sha(originalBytes), mutations,
      wholeInverseSha256: sha(inverse), moduleSha256: sha(fs.readFileSync(modulePath)), moduleInputs };
    writeJson(definition.id + '/source-evidence.json', evidence);
    const engine = await import(pathToFileURL(modulePath).href);
    for (const door of ['createCareer', 'applyAction', 'validateSavedCareer', 'seasonScore']) assert.equal(typeof engine[door], 'function');
    for (const seed of seeds) {
      for (const policy of policies) {
        const runner = makeRunner(engine, definition.id, seed, policy);
        let state = runner.admit(engine.createCareer(seed), 'initial world');
        assert.equal(state.teamId, 'gp-team-4'); assert.deepEqual(mine(state).map(driver => driver.id), ['gp-driver-8', 'gp-driver-9']);
        assert.deepEqual(mine(state).map(driver => driver.contract.wagePerRace), [180_000, 120_000]);
        const initialKey = seed + '|' + policy;
        if (initialWorlds.has(initialKey)) assert.deepEqual(state, initialWorlds.get(initialKey), 'Common first world across interventions');
        else initialWorlds.set(initialKey, clone(state));
        writeJson(definition.id + '/initial-' + seed + '-' + policy + '.json', state);
        let cashLedger = state.cash;
        for (let year = 1; year <= 10; year += 1) {
          assert.equal(state.season, year); assert.equal(state.phase, 'preRace');
          const rounds = [];
          for (let round = 0; round < 12; round += 1) {
            assert.equal(state.round, round);
            const raced = runner.runRace(state); state = raced.state; rounds.push(raced.observation);
            cashLedger += raced.observation.teamPrize - raced.observation.operatingCost - raced.observation.purchases.reduce((sum, row) => sum + row.quote, 0);
            assert.equal(state.cash, cashLedger);
            if (round < 11) state = runner.step(state, { type: 'continue' }).state;
          }
          assert.equal(state.phase, 'seasonReview'); assert.equal(state.results.length, 12);
          if (year === 1) {
            if (firstSeasons.has(initialKey)) assert.deepEqual(state, firstSeasons.get(initialKey), 'Interventions cannot change a single first-season result or clock');
            else firstSeasons.set(initialKey, clone(state));
          }
          const review = clone(state), plan = clone(state.nextSeasonPlan), priorIds = new Set(state.drivers.map(driver => driver.id));
          assert.equal(plan.affordable, true, 'Record a real funding failure instead of shortening a career');
          const advanced = runner.step(state, { type: 'startNextSeason' }); state = advanced.state;
          assert.equal(advanced.receipt.sponsor, plan.sponsor); assert.equal(advanced.receipt.renewalFee, plan.totalRenewalFee); assert.equal(advanced.receipt.replacementFee, plan.totalReplacementFee);
          assert.equal(advanced.receipt.cashDelta, plan.cashAfter - review.cash);
          cashLedger += plan.sponsor - plan.totalRenewalFee - plan.totalReplacementFee;
          assert.equal(state.cash, cashLedger); assert.equal(state.cash, plan.cashAfter); assert.equal(state.reserved, plan.nextReserved);
          assert.equal(state.drivers.length, 26); assert.equal(new Set(state.drivers.map(driver => driver.id)).size, 26);
          assert.equal(state.drivers.filter(driver => driver.contract).length, 20);
          for (const heldTeam of state.teams) assert.equal(state.drivers.filter(driver => driver.contract?.teamId === heldTeam.id).length, 2);
          for (const driver of state.drivers) for (const skill of skillKeys) assert(Number.isInteger(driver.skills[skill]) && driver.skills[skill] >= 0 && driver.skills[skill] <= 100);
          for (const heldTeam of state.teams) for (const area of areas) assert(Number.isInteger(heldTeam.car[area]) && heldTeam.car[area] >= heldTeam.baselineCar[area] && heldTeam.car[area] <= 100);
          const currentIds = new Set(state.drivers.map(driver => driver.id)), retiredDrivers = review.drivers.filter(driver => !currentIds.has(driver.id));
          const rookies = state.drivers.filter(driver => !priorIds.has(driver.id)); assert.equal(rookies.length, retiredDrivers.length);
          for (const rookie of rookies) assert(rookie.age >= 18 && rookie.age <= 21);
          const archived = state.history.at(-1); assert.equal(archived.season, year);
          const constructor = review.constructorStandings.find(row => row.teamId === review.teamId);
          assert.equal(archived.team.points, constructor.points); assert.deepEqual(archived.finalCar, ownTeam(review).car);
          const upgrades = rounds.flatMap(round => round.purchases);
          const record = { arm: definition.id, seed, policy, year, points: archived.team.points, constructorPosition: archived.team.position,
            wins: archived.team.wins, driverTitle: archived.driverChampion.teamId === state.teamId, constructorTitle: archived.constructorChampion.teamId === state.teamId,
            driverChampion: archived.driverChampion, constructorChampion: archived.constructorChampion,
            meanPosition: rounds.reduce((sum, row) => sum + row.meanPosition, 0) / 12,
            finished: rounds.reduce((sum, row) => sum + row.finished, 0), raceRetired: rounds.reduce((sum, row) => sum + row.retired, 0),
            endReviewCash: review.cash, rolloverCash: state.cash, nextReserved: state.reserved, rolloverReceipt: advanced.receipt,
            upgrades: upgrades.length, upgradeSpend: upgrades.reduce((sum, row) => sum + row.quote, 0),
            finalCar: clone(ownTeam(review).car), nextCar: clone(ownTeam(state).car), retiredDrivers, rookies,
            meanAge: state.drivers.reduce((sum, driver) => sum + driver.age, 0) / 26,
            meanSkills: Object.fromEntries(skillKeys.map(skill => [skill, state.drivers.reduce((sum, driver) => sum + driver.skills[skill], 0) / 26])),
            ageBands: { under27: state.drivers.filter(driver => driver.age < 27).length, peak27to32: state.drivers.filter(driver => driver.age >= 27 && driver.age <= 32).length, veteran33plus: state.drivers.filter(driver => driver.age >= 33).length },
            meanAiCar: state.teams.filter(held => held.id !== state.teamId).reduce((sum, held) => sum + areas.reduce((n, area) => n + held.car[area], 0), 0) / 27,
            rounds };
          records.push(record);
          writeJson(definition.id + '/boundary-' + seed + '-' + policy + '-' + year + '.json', { review, plan, rolloverReceipt: advanced.receipt, advanced: state });
        }
      }
    }
    const rows = records.filter(row => row.arm === definition.id);
    const byPolicy = Object.fromEntries(policies.map(policy => {
      const selected = rows.filter(row => row.policy === policy);
      const careers = seeds.map(seed => {
        const career = selected.filter(row => row.seed === seed), champions = career.map(row => row.driverChampion.driverId), constructors = career.map(row => row.constructorChampion.teamId);
        const concentration = ids => { const counts = new Map(); for (const id of ids) counts.set(id, (counts.get(id) || 0) + 1); return Math.max(...counts.values()) / 10; };
        return { seed, points: career.reduce((sum, row) => sum + row.points, 0), driverTitles: career.filter(row => row.driverTitle).length,
          constructorTitles: career.filter(row => row.constructorTitle).length, uniqueDriverChampions: new Set(champions).size, uniqueConstructorChampions: new Set(constructors).size,
          championChanges: champions.slice(1).filter((id, i) => id !== champions[i]).length,
          driverTitleConcentration: concentration(champions), constructorTitleConcentration: concentration(constructors),
          retirements: career.reduce((sum, row) => sum + row.retiredDrivers.length, 0), finalCash: career.at(-1).rolloverCash, finalReserve: career.at(-1).nextReserved,
          meanPosition: career.reduce((sum, row) => sum + row.constructorPosition, 0) / 10 };
      });
      const careerStats = Object.fromEntries(Object.keys(careers[0]).filter(key => key !== 'seed').map(key => [key, stats(careers.map(row => row[key]))]));
      return [policy, { overall: seasonStats(selected), years: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i + 1, seasonStats(selected.filter(row => row.year === i + 1))])), careers, careerStats }];
    }));
    arms.push({ ...evidence, policies: byPolicy });
    console.log(definition.id + ': 64 complete ten-season careers, 640 seasons, 7680 races; first-year aware mean points ' + byPolicy['aware-no-spend'].years[1].points.mean + ', invested ' + byPolicy['aware-quoted-upgrades'].years[1].points.mean);
  }
  assert.equal(records.length, 1920); assert.equal(records.reduce((sum, row) => sum + row.rounds.length, 0), 23040);
  const paired = seeds.flatMap(seed => policies.flatMap(policy => Array.from({ length: 10 }, (_, i) => {
    const rows = Object.fromEntries(records.filter(row => row.seed === seed && row.policy === policy && row.year === i + 1).map(row => [row.arm, row]));
    assert.equal(Object.keys(rows).length, 3);
    return { seed, policy, year: i + 1, aiPointEffect: rows['partial-ai'].points - rows['partial-no-ai'].points,
      aiPositionEffect: rows['partial-no-ai'].constructorPosition - rows['partial-ai'].constructorPosition,
      carryPointEffect: rows['partial-no-ai'].points - rows['full-no-ai'].points,
      carryPositionEffect: rows['full-no-ai'].constructorPosition - rows['partial-no-ai'].constructorPosition,
      aiCashEffect: rows['partial-ai'].rolloverCash - rows['partial-no-ai'].rolloverCash,
      carryCashEffect: rows['partial-no-ai'].rolloverCash - rows['full-no-ai'].rolloverCash };
  })));
  writeJson('all-pairs.json', { records, paired });
  const summary = { scope: 'Candidate lifecycle measurement, no readiness threshold or coefficient adoption', seasons: records.length, races: 23040, careers: 192,
    admittedStates, transitions, source: sourceReceipts(), seeds, policies, commonStartup: startup, arms,
    pairedStats: Object.fromEntries(policies.map(policy => [policy, Object.fromEntries(['aiPointEffect', 'aiPositionEffect', 'carryPointEffect', 'carryPositionEffect', 'aiCashEffect', 'carryCashEffect'].map(key => [key, stats(paired.filter(row => row.policy === policy).map(row => row[key]))]))])) };
  writeJson('summary.json', summary);
  console.log('Lifecycle measurement: 192 complete careers, 1920 seasons, 23040 races, ' + admittedStates + ' admitted states and ' + transitions + ' exact transitions. Read distributions before adoption.');
} finally {
  fs.closeSync(journal);
  for (const [file, bytes] of held) assert(fs.readFileSync(path.join(ROOT, file)).equals(bytes), 'Actual input changed: ' + file);
  for (const [file, bytes] of copiedHolds) assert(fs.readFileSync(file).equals(bytes), 'Physical source copy changed: ' + file);
  writeJson('source-after.json', sourceReceipts());
  console.log('Lifecycle measurement evidence: ' + OUT);
}
