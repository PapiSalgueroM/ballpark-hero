import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import type { GrandPrixCareer, GrandPrixAction, GrandPrixOrder } from '@/lib/grandPrixBoss';

type Engine = typeof import('@/lib/grandPrixBoss');
type Policy = 'aware' | 'unsuitable' | 'invested';
const ENGINE_PATH = process.env.GP_BOSS_ENGINE_FILE
  ? path.resolve(process.env.GP_BOSS_ENGINE_FILE)
  : path.resolve(process.cwd(), 'src/lib/grandPrixBoss.ts');
const FIXTURE_PATH = path.resolve(process.cwd(), 'src/test/fixtures/grandPrixBossV5Starter.json');
const sha = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
let engine: Engine;
let admittedStates = 0;
beforeAll(async () => { engine = await import(/* @vite-ignore */ pathToFileURL(ENGINE_PATH).href) as Engine; });
function admit(state: GrandPrixCareer, label: string): GrandPrixCareer {
  const before = JSON.stringify(state);
  const result = engine.validateSavedCareer(state);
  expect(JSON.stringify(state), 'GP_STARTER_READER_MUST_HOLD_INPUT:' + label).toBe(before);
  expect(result.ok, 'GP_STARTER_READER_REFUSED:' + label).toBe(true);
  if (result.ok === false) throw new Error('Unreachable refused valid measurement state');
  admittedStates += 1;
  return result.state;
}
const own = (state: GrandPrixCareer) => state.drivers.filter(driver => driver.contract?.teamId === state.teamId);
function move(state: GrandPrixCareer, action: Record<string, unknown>) {
  state = admit(state, 'before ' + action.type);
  const prior = JSON.stringify(state);
  const result = engine.applyAction(state, { ...action, expectedRevision: state.revision } as GrandPrixAction);
  expect(JSON.stringify(state), 'GP_STARTER_ACTION_MUST_HOLD_INPUT:' + action.type).toBe(prior);
  expect(result.ok, 'GP_STARTER_REAL_ACTION_REFUSED:' + action.type).toBe(true);
  if (result.ok === false) throw new Error('Unreachable refused legal cohort action');
  return { state: admit(result.state, 'after ' + action.type), receipt: result.receipt };
}
function race(state: GrandPrixCareer, policy: Policy) {
  state = admit(state, 'generated or continued round');
  const purchases: { area: string; quoted: number; charged: number; cashBefore: number; cashAfter: number }[] = [];
  if (policy === 'invested') {
    const track = state.calendar[state.round];
    const preferred: ('power' | 'aero')[] = track.powerWeight >= track.aeroWeight ? ['power', 'aero'] : ['aero', 'power'];
    const area = preferred.find(key => state.upgradeCosts[key] !== null && state.upgradeCosts[key]! <= state.cash - state.reserved);
    if (area) {
      const quoted = state.upgradeCosts[area]!;
      const cashBefore = state.cash;
      const bought = move(state, { type: 'upgrade', area });
      state = bought.state;
      expect(bought.receipt.cost, 'GP_STARTER_PURCHASE_MUST_USE_THE_REAL_PUBLIC_QUOTE').toBe(quoted);
      expect(cashBefore - state.cash).toBe(quoted);
      purchases.push({ area, quoted, charged: bought.receipt.cost!, cashBefore, cashAfter: state.cash });
    }
  }
  state = move(state, { type: 'qualify' }).state;
  state = move(state, { type: 'startRace', setups: own(state).map(driver => ({
    driverId: driver.id, pace: policy === 'unsuitable' ? 'push' : 'balanced',
    compound: policy === 'unsuitable' ? 'soft' : state.race!.weather === 'wet' ? 'wet' : 'medium',
  })) }).state;
  const decisions: { lap: number; weather: string; orders: GrandPrixOrder[] }[] = [];
  while (state.phase === 'race') {
    const orders: GrandPrixOrder[] = own(state).map(driver => {
      const entry = state.race!.entries.find(row => row.driverId === driver.id)!;
      let pitTo: GrandPrixOrder['pitTo'];
      if (policy !== 'unsuitable' && state.race!.lap > 0 && entry.status === 'running') {
        if (state.race!.weather === 'wet' && entry.compound !== 'wet') pitTo = 'wet';
        else if (state.race!.weather === 'dry' && entry.compound === 'wet') pitTo = 'medium';
        else if (entry.tyreWear > 58) pitTo = state.race!.weather === 'wet' ? 'wet' : 'hard';
      }
      return { driverId: driver.id, pace: policy === 'unsuitable' ? 'push' : 'balanced', ...(pitTo ? { pitTo } : {}) };
    });
    decisions.push({ lap: state.race!.lap, weather: state.race!.weather, orders });
    state = move(state, { type: 'raceInterval', orders }).state;
  }
  const result = state.results[state.results.length - 1]!;
  const rows = result.classification.filter(row => row.teamId === state.teamId);
  expect(rows).toHaveLength(2);
  return { state, observation: {
    round: state.round, roundId: result.roundId, points: rows.reduce((sum, row) => sum + row.points, 0),
    meanPosition: rows.reduce((sum, row) => sum + row.position, 0) / 2,
    finished: rows.filter(row => row.status === 'finished').length,
    retired: rows.filter(row => row.status === 'retired').length,
    cash: state.cash, reserved: state.reserved, teamPrize: result.teamPrize, operatingCost: result.operatingCost,
    purchases, decisions, classification: result.classification,
    ownedEntries: state.race!.entries.filter(entry => rows.some(row => row.driverId === entry.driverId)),
  } };
}
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
function stats(values: number[]) {
  expect(values.length > 0 && values.every(Number.isFinite), 'GP_STARTER_OBSERVATIONS_MUST_BE_PRESENT_FINITE_NUMBERS').toBe(true);
  const sorted = [...values].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.floor((sorted.length - 1) * p)];
  return { n: values.length, mean: mean(values), p10: q(.1), p50: q(.5), p90: q(.9) };
}
function measure() {
  const natural = [];
  for (let seed = 1; seed <= 256; seed += 1) {
    const initial = admit(engine.createCareer(seed), 'natural initial');
    natural.push({ seed, teamId: initial.teamId, ownedDriverIds: own(initial).map(driver => driver.id),
      aware: race(initial, 'aware').observation, unsuitable: race(initial, 'unsuitable').observation });
  }
  const seasons = [];
  for (let seed = 10_001; seed <= 10_032; seed += 1) {
    for (const policy of ['aware', 'unsuitable', 'invested'] as Policy[]) {
      let state = admit(engine.createCareer(seed), 'season initial');
      const rounds = [];
      const initialCash = state.cash;
      for (let round = 0; round < 12; round += 1) {
        expect(state.round).toBe(round);
        const played = race(state, policy);
        state = played.state; rounds.push(played.observation);
        if (round < 11) state = move(state, { type: 'continue' }).state;
      }
      expect(state.phase).toBe('seasonReview');
      expect(state.results).toHaveLength(12);
      const spend = rounds.flatMap(row => row.purchases).reduce((sum, row) => sum + row.charged, 0);
      expect(state.cash, 'GP_STARTER_WHOLE_SEASON_CASH_MUST_RECONCILE').toBe(initialCash - spend + rounds.reduce((sum, row) => sum + row.teamPrize - row.operatingCost, 0));
      seasons.push({ seed, policy, points: state.constructorStandings.find(row => row.teamId === state.teamId)!.points,
        cash: state.cash, reserved: state.reserved, upgradeSpend: spend,
        upgradeCount: rounds.flatMap(row => row.purchases).length,
        constructorPosition: state.constructorStandings.findIndex(row => row.teamId === state.teamId) + 1,
        rounds, finalState: state });
    }
  }
  expect(natural).toHaveLength(256);
  expect(seasons).toHaveLength(96);
  const paired = Array.from({ length: 32 }, (_, index) => {
    const seed = 10_001 + index;
    const rows = seasons.filter(row => row.seed === seed);
    expect(rows).toHaveLength(3);
    const aware = rows.find(row => row.policy === 'aware')!;
    const unsuitable = rows.find(row => row.policy === 'unsuitable')!;
    const invested = rows.find(row => row.policy === 'invested')!;
    return { seed, aware: aware.points, unsuitable: unsuitable.points, invested: invested.points,
      strategyGain: aware.points - unsuitable.points, investmentGain: invested.points - aware.points };
  });
  const summary = {
    sourceSha256: sha(fs.readFileSync(ENGINE_PATH)), fixtureSha256: sha(fs.readFileSync(FIXTURE_PATH)),
    counts: { naturalPairs: 256, seasons: 96, seasonRaces: 1152, totalRaces: 1664, admittedStates },
    naturalScoringFraction: natural.filter(row => row.aware.points > 0).length / 256,
    naturalAwarePoints: stats(natural.map(row => row.aware.points)),
    naturalStrategyGain: stats(natural.map(row => row.aware.points - row.unsuitable.points)),
    seasonAwarePoints: stats(paired.map(row => row.aware)),
    seasonStrategyGain: stats(paired.map(row => row.strategyGain)),
    seasonInvestmentGain: stats(paired.map(row => row.investmentGain)),
    policies: Object.fromEntries((['aware', 'unsuitable', 'invested'] as Policy[]).map(policy => {
      const rows = seasons.filter(row => row.policy === policy);
      return [policy, { points: stats(rows.map(row => row.points)), cash: stats(rows.map(row => row.cash)),
        reserve: stats(rows.map(row => row.reserved)), constructorPosition: stats(rows.map(row => row.constructorPosition)),
        upgradeSpend: stats(rows.map(row => row.upgradeSpend)), upgradeCount: stats(rows.map(row => row.upgradeCount)),
        finished: stats(rows.map(row => row.rounds.reduce((sum, round) => sum + round.finished, 0))),
        retired: stats(rows.map(row => row.rounds.reduce((sum, round) => sum + round.retired, 0))) }];
    })),
  };
  const base = process.env.GP_BOSS_BALANCE_OUT || os.tmpdir();
  fs.mkdirSync(base, { recursive: true });
  const out = fs.mkdtempSync(path.join(base, 'dukb-grand-prix-starter-'));
  fs.writeFileSync(path.join(out, 'all-pairs.json'), JSON.stringify({ natural, seasons, paired }) + '\n', { flag: 'wx' });
  fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(summary, null, 2) + '\n', { flag: 'wx' });
  console.log('GP_STARTER_COHORT: ' + JSON.stringify(summary));
  console.log('Grand Prix Boss starter evidence: ' + out);
  return summary;
}
let measured: ReturnType<typeof measure> | null = null;
const cohort = () => measured ?? (measured = measure());

describe('Grand Prix Boss measured starting-team opportunity', { timeout: 240000 }, () => {
  it('GP_STARTER_OWNERSHIP: starts team four with its two published wage commitments', () => {
    const state = admit(engine.createCareer(1), 'starter allocation');
    expect(state.teamId, 'GP_STARTER_TEAM4_MISSING').toBe('gp-team-4');
    expect(own(state).map(driver => driver.id)).toEqual(['gp-driver-8', 'gp-driver-9']);
    expect(own(state).map(driver => driver.contract!.wagePerRace), 'GP_STARTER_PUBLISHED_WAGES_MUST_FOLLOW_OWNED_SEATS').toEqual([180_000, 120_000]);
    expect(state.cash).toBe(12_000_000);
    expect(state.reserved).toBe(6_600_000);
  });
  it('GP_STARTER_NATURAL_FREQUENCY: tyre-aware new teams regularly compete for actual points', () => {
    expect(cohort().naturalScoringFraction, 'GP_STARTER_NATURAL_SCORING_FREQUENCY_TOO_LOW').toBeGreaterThanOrEqual(.85);
  });
  it('GP_STARTER_NATURAL_STRATEGY: race calls make a measured difference in actual points', () => {
    expect(cohort().naturalStrategyGain.mean, 'GP_STARTER_NATURAL_STRATEGY_POINTS_TOO_WEAK').toBeGreaterThanOrEqual(1);
  });
  it('GP_STARTER_SEASON_POINTS: a careful full season earns meaningful championship points', () => {
    expect(cohort().seasonAwarePoints.mean, 'GP_STARTER_SEASON_POINTS_TOO_LOW').toBeGreaterThanOrEqual(20);
  });
  it('GP_STARTER_SEASON_STRATEGY: careful season calls beat the held unsuitable plan', () => {
    expect(cohort().seasonStrategyGain.mean, 'GP_STARTER_SEASON_STRATEGY_POINTS_TOO_WEAK').toBeGreaterThanOrEqual(10);
  });
  it('GP_STARTER_SEASON_INVESTMENT: real affordable upgrades improve full-season point returns', () => {
    expect(cohort().seasonInvestmentGain.mean, 'GP_STARTER_SEASON_INVESTMENT_POINTS_TOO_WEAK').toBeGreaterThanOrEqual(15);
  });
  it('GP_STARTER_OLD_SAVE: the captured team-six career loads unchanged and plays its held race', () => {
    const raw: GrandPrixCareer = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
    expect(sha(fs.readFileSync(FIXTURE_PATH))).toBe('cf3b484781dbff04df9033d0e1dfe239e6d9562f5cf026db2e4b1e233162a028');
    const before = JSON.stringify(raw);
    const loaded = admit(raw, 'actual v5 artifact save');
    const oldShape = JSON.parse(JSON.stringify(loaded));
    for (const key of ['marketOffers', 'nextSeasonPlan', 'history', 'careerTotals']) delete oldShape[key];
    for (const driver of oldShape.drivers) {
      delete driver.focus;
      const original = raw.drivers.find(row => row.id === driver.id)!;
      if (driver.contract && !Object.prototype.hasOwnProperty.call(original.contract, 'startsSeason')) delete driver.contract.startsSeason;
    }
    for (const team of oldShape.teams) delete team.baselineCar;
    expect(JSON.stringify(oldShape), 'GP_STARTER_NEW_DEFAULT_MUST_NOT_MIGRATE_EXISTING_TEAMS').toBe(before);
    expect(loaded.drivers.map(driver => driver.focus)).toEqual(Array(26).fill('balanced'));
    expect(loaded.drivers.filter(driver => driver.contract).map(driver => driver.contract!.startsSeason)).toEqual(Array(20).fill(raw.season));
    for (const team of loaded.teams) expect(team.baselineCar).toEqual(raw.teams.find(row => row.id === team.id)!.car);
    expect(loaded.history).toEqual([]);
    expect(loaded.careerTotals).toEqual({ archivedSeasons: 0, driverTitles: 0, constructorTitles: 0, sinceSeason: raw.season, earlierSeasonsUnknown: false });
    expect(loaded.nextSeasonPlan).toBeNull();
    expect(loaded.marketOffers.length).toBeGreaterThan(0);
    expect(engine.validateSavedCareer(loaded)).toEqual({ ok: true, state: loaded });
    expect(loaded.teamId).toBe('gp-team-6');
    expect(own(loaded).map(driver => driver.id)).toEqual(['gp-driver-12', 'gp-driver-13']);
    expect(own(loaded).map(driver => driver.contract!.wagePerRace)).toEqual([180_000, 120_000]);
    const finished = race(loaded, 'aware').state;
    expect(JSON.stringify(raw)).toBe(before);
    expect(finished.teamId).toBe('gp-team-6');
    expect(finished.results[0].classification.map(row => row.driverId)).toEqual([0, 2, 4, 3, 1, 5, 7, 6, 8, 9, 10, 13, 11, 14, 15, 16, 17, 18, 19, 12].map(index => 'gp-driver-' + index));
    expect(finished.results[0].classification.map(row => row.points)).toEqual([25, 18, 15, 12, 10, 8, 6, 4, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(finished.cash).toBe(11_500_000);
    expect(finished.reserved).toBe(6_050_000);
    expect(finished.race!.entries.find(row => row.driverId === 'gp-driver-13')).toMatchObject({ elapsedMs: 2_764_942, completedLaps: 40, status: 'finished' });
    expect(finished.race!.entries.find(row => row.driverId === 'gp-driver-12')).toMatchObject({ elapsedMs: 2_720_047, completedLaps: 39, status: 'retired' });
  });
});
