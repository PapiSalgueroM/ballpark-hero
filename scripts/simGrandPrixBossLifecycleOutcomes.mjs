import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

assert.equal(process.env.CI, '1');
assert.equal(process.env.SIM_NETWORK, 'offline');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = value => createHash('sha256').update(value).digest('hex');
const inputs = ['src/lib/grandPrixBoss.ts', 'src/lib/keyedRng.ts', 'package.json', 'package-lock.json', 'scripts/simGrandPrixBossLifecycleOutcomes.mjs'];
const held = new Map(inputs.map(file => [file, fs.readFileSync(path.join(ROOT, file))]));
const originalBytes = held.get(inputs[0]), original = originalBytes.toString('utf8');
for (const anchor of ['const CAR_CARRY = 0.7;', 'const AI_INVESTMENT = 2;']) {
  const code = original.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\n)\s*\/\/[^\n]*/g, '$1');
  assert.equal(code.split(anchor).length - 1, 1, 'One adopted executed coefficient');
  assert.equal(original.split(anchor).length - 1, 1, 'One complete adopted coefficient');
}
const outBase = path.resolve(process.env.GP_BOSS_LIFECYCLE_OUTCOMES_OUT || path.join(ROOT, 'tmp'));
fs.mkdirSync(outBase, { recursive: true });
const OUT = fs.mkdtempSync(path.join(outBase, 'dukb-grand-prix-lifecycle-outcomes-'));
const writeJson = (file, value) => fs.writeFileSync(path.join(OUT, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const sourceReceipts = () => [...held].map(([file, bytes]) => ({ file, bytes: bytes.length, sha256: sha(bytes) }));
writeJson('source-before.json', sourceReceipts());
const definitions = [
  { id: 'partial-ai', label: '70percent carry and +2 weakest-area AI', policies: ['aware-no-spend', 'aware-quoted-upgrades'], edits: [] },
  { id: 'full-no-ai', label: 'Full carry, no AI car investment', policies: ['aware-quoted-upgrades'], edits: [['const CAR_CARRY = 0.7;', 'const CAR_CARRY = 1;'], ['const AI_INVESTMENT = 2;', 'const AI_INVESTMENT = 0;']] },
  { id: 'partial-no-ai', label: '70percent carry, no AI car investment', policies: ['aware-quoted-upgrades'], edits: [['const AI_INVESTMENT = 2;', 'const AI_INVESTMENT = 0;']] },
];
const seeds = Array.from({ length: 32 }, (_, index) => index + 10_001);
const areas = ['power', 'aero', 'reliability'], skillKeys = ['pace', 'consistency', 'tyreCare', 'wet'];
const clone = value => JSON.parse(JSON.stringify(value));
const mine = state => state.drivers.filter(driver => driver.contract?.teamId === state.teamId);
const ownTeam = state => state.teams.find(team => team.id === state.teamId);
const records = [], arms = [], copiedHolds = new Map(), firstSeasons = new Map(), initialWorlds = new Map();
let admittedStates = 0, transitions = 0;
const journal = fs.openSync(path.join(OUT, 'transitions.jsonl'), 'wx');
writeJson('settings.json', {
  scope: 'Permanent lifecycle outcome guard. Real joined startup and real physical source interventions.',
  measuredProvenance: { run: 41456890041, summarySha256: 'e50d6a9eadbc3525d60bf470e3b6505b3baf5e55c93429ee0d3c450d274f3f77',
    observed: { investmentGain: 158.503125, aiPressure: 49.334375, carryCurb: 154.725, year10TeamTitleFraction: .15625 } },
  thresholds: { investmentGainMin: 100, aiPressureMin: 25, carryCurbMin: 100, year10TeamTitleMin: .05, year10TeamTitleMax: .50 },
  seeds, seasonsPerCareer: 10, arms: definitions,
  upgradePolicy: 'At most one affordable power/aero purchase per race, track greater weight first, authoritative engine quote only.',
  pairing: 'Common world seeds and external keyed streams. No startup substitutions. The actual source must start team4 with drivers8/9 and wages180k/120k.',
  stateEvidence: 'Reader before/after every action, action/receipt/state hashes and money. Actual initial/review/rollover worlds and every race classification, clock, decision and quoted purchase remain raw.',
  controls: 'Five independent guard refusals substitute complete real played source/policy outcome cohorts. No edited outcome scalars or extra simulated careers.'
});
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
    for (const [before, after] of definition.edits) {
      const code = changed.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\n)\s*\/\/[^\n]*/g, '$1');
      assert.equal(code.split(before).length - 1, 1); assert.equal(changed.split(before).length - 1, 1);
      const offset = changed.indexOf(before); changed = changed.slice(0, offset) + after + changed.slice(offset + before.length);
      mutations.push({ before, after, offset });
    }
    if (definition.edits.length) assert.notEqual(sha(changed), sha(originalBytes)); else assert.equal(sha(changed), sha(originalBytes), 'Healthy physical source is byte-identical');
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
      for (const policy of definition.policies) {
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
    const byPolicy = Object.fromEntries(definition.policies.map(policy => {
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
    console.log(definition.id + ': ' + seeds.length * definition.policies.length + ' complete ten-season careers; invested mean points ' + byPolicy['aware-quoted-upgrades'].overall.points.mean);
  }
  assert.equal(records.length, 1280); assert.equal(records.reduce((sum, row) => sum + row.rounds.length, 0), 15360);
  const observations = records.map((row, recordIndex) => ({
    recordIndex, recordSha256: sha(JSON.stringify(row)), arm: row.arm, seed: row.seed, policy: row.policy, year: row.year,
    points: row.points, constructorTitle: row.constructorTitle,
  }));
  const select = (arm, policy) => {
    const rows = observations.filter(row => row.arm === arm && row.policy === policy);
    assert.equal(rows.length, 320, 'One complete measured seed/year cohort');
    const expected = seeds.flatMap(seed => Array.from({ length: 10 }, (_, index) => seed + '|' + (index + 1))).sort();
    assert.deepEqual(rows.map(row => row.seed + '|' + row.year).sort(), expected);
    for (const row of rows) {
      assert(Number.isInteger(row.points) && row.points >= 0 && row.points <= 516);
      assert.equal(typeof row.constructorTitle, 'boolean');
    }
    return rows;
  };
  const data = {
    candidateSpend: select('partial-ai', 'aware-quoted-upgrades'),
    candidateNoSpend: select('partial-ai', 'aware-no-spend'),
    partialNoAi: select('partial-no-ai', 'aware-quoted-upgrades'),
    fullNoAi: select('full-no-ai', 'aware-quoted-upgrades'),
  };
  const pairDifference = (left, right) => {
    assert.equal(left.length, 320); assert.equal(right.length, 320);
    const table = new Map(right.map(row => [row.seed + '|' + row.year, row])); assert.equal(table.size, 320);
    return stats(left.map(row => {
      const paired = table.get(row.seed + '|' + row.year); assert(paired, 'Actual common seed/year counterpart');
      return row.points - paired.points;
    }));
  };
  const titleFraction = rows => {
    const year10 = rows.filter(row => row.year === 10);
    assert.equal(year10.length, 32); assert.equal(new Set(year10.map(row => row.seed)).size, 32);
    return year10.filter(row => row.constructorTitle).length / year10.length;
  };
  const guards = [
    { id: 'investment-benefit', marker: 'GP_LIFECYCLE_OUTCOME_INVESTMENT', measure: input => pairDifference(input.candidateSpend, input.candidateNoSpend).mean,
      check: value => value >= 100, threshold: '>=100 paired mean season points' },
    { id: 'ai-pressure', marker: 'GP_LIFECYCLE_OUTCOME_AI', measure: input => pairDifference(input.partialNoAi, input.candidateSpend).mean,
      check: value => value >= 25, threshold: '>=25 paired mean season points' },
    { id: 'carry-curb', marker: 'GP_LIFECYCLE_OUTCOME_CARRY', measure: input => pairDifference(input.fullNoAi, input.partialNoAi).mean,
      check: value => value >= 100, threshold: '>=100 paired mean season points' },
    { id: 'reachable-title', marker: 'GP_LIFECYCLE_OUTCOME_TITLE_LOW', measure: input => titleFraction(input.candidateSpend),
      check: value => value >= .05, threshold: '>=0.05 year10 constructor title fraction' },
    { id: 'nonautomatic-title', marker: 'GP_LIFECYCLE_OUTCOME_TITLE_HIGH', measure: input => titleFraction(input.candidateSpend),
      check: value => value <= .50, threshold: '<=0.50 year10 constructor title fraction' },
  ];
  const runGuard = (guard, input) => {
    const value = guard.measure(input);
    assert(Number.isFinite(value), 'Finite observed guard value');
    assert(guard.check(value), guard.marker + ': observed ' + value + ', required ' + guard.threshold);
    return value;
  };
  writeJson('all-pairs.json', { records, observations });
  writeJson('guard-data.json', { dataSha256: sha(JSON.stringify(data)), data,
    measurementsBeforeAssertions: guards.map(guard => ({ id: guard.id, marker: guard.marker, threshold: guard.threshold, value: guard.measure(data) })) });
  const healthy = guards.map(guard => ({ id: guard.id, marker: guard.marker, threshold: guard.threshold, value: runGuard(guard, data), passed: true }));
  const dataHash = sha(JSON.stringify(data));
  const substitutions = [
    { id: 'investment-benefit', replacement: { candidateSpend: data.candidateNoSpend }, source: 'Actual candidate no-spend career rows' },
    { id: 'ai-pressure', replacement: { candidateSpend: data.partialNoAi }, source: 'Actual partial/no-AI invested career rows' },
    { id: 'carry-curb', replacement: { partialNoAi: data.fullNoAi }, source: 'Actual full/no-AI invested career rows' },
    { id: 'reachable-title', replacement: { candidateSpend: data.candidateNoSpend }, source: 'Actual candidate no-spend year10 rows' },
    { id: 'nonautomatic-title', replacement: { candidateSpend: data.fullNoAi }, source: 'Actual full/no-AI year10 rows' },
  ];
  const controls = substitutions.map(control => {
    const guard = guards.find(row => row.id === control.id); assert(guard);
    const changed = { ...data, ...control.replacement }, changedHash = sha(JSON.stringify(changed));
    assert.notEqual(changedHash, dataHash, 'Control replaces actual complete played cohort');
    let ownedError;
    assert.throws(() => runGuard(guard, changed), error => {
      ownedError = { name: error.name, message: error.message, stack: error.stack };
      return error instanceof assert.AssertionError && error.message.includes(guard.marker);
    }, guard.id + ': exact owned refusal');
    assert(ownedError);
    return { id: control.id, marker: guard.marker, source: control.source, originalSha256: dataHash, changedSha256: changedHash,
      observedControlValue: guard.measure(changed), ownedError };
  });
  assert.equal(healthy.length, 5); assert.equal(controls.length, 5);
  writeJson('guard-outcomes.json', { dataHash, data, healthy, controls });
  const summary = {
    scope: 'Lifecycle long-run outcome guard only. Five healthy outcomes and five effective independently owned real-cohort refusals.',
    careers: 128, seasons: records.length, races: 15360, admittedStates, transitions, source: sourceReceipts(), seeds,
    arms, healthy, controls, executedGuardOutcomes: 10, simulatedCohorts: 4,
    pairedStats: {
      investment: pairDifference(data.candidateSpend, data.candidateNoSpend),
      aiPressure: pairDifference(data.partialNoAi, data.candidateSpend),
      carryCurb: pairDifference(data.fullNoAi, data.partialNoAi),
    },
  };
  writeJson('summary.json', summary);
  console.log('Lifecycle outcomes: 128 complete careers, 1280 seasons, 15360 races, ' + admittedStates + ' admitted states, five healthy guards and five exact owned real-cohort refusals.');
} finally {
  fs.closeSync(journal);
  for (const [file, bytes] of held) assert(fs.readFileSync(path.join(ROOT, file)).equals(bytes), 'Actual input changed: ' + file);
  for (const [file, bytes] of copiedHolds) assert(fs.readFileSync(file).equals(bytes), 'Physical source copy changed: ' + file);
  writeJson('source-after.json', sourceReceipts());
  console.log('Lifecycle outcome evidence: ' + OUT);
}
