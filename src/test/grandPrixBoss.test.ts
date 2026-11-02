import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

// A missing new product is an explicit owned baseline assertion. A variable import prevents
// the source transformer resolving a deliberately nonexistent module before that assertion.
const ENGINE_PATH = process.env.GP_BOSS_ENGINE_FILE
  ? path.resolve(process.env.GP_BOSS_ENGINE_FILE)
  : path.resolve(process.cwd(), 'src/lib/grandPrixBoss.ts');
const enginePresent = existsSync(ENGINE_PATH);

type CarArea = 'power' | 'aero' | 'reliability';
type Pace = 'conserve' | 'balanced' | 'push';
type Compound = 'soft' | 'medium' | 'hard' | 'wet';
type Driver = { id: string; name: string; contract: null | { teamId: string; years: number; wagePerRace: number } };
type Team = { id: string; name: string; car: Record<CarArea, number> };
type RaceEntry = { driverId: string; teamId: string; elapsedMs: number; completedLaps: number; compound: Compound; tyreWear: number; stops: number; status: 'running' | 'retired' | 'finished' };
type Classification = { driverId: string; teamId: string; position: number; status: 'finished' | 'retired'; points: number };
type Career = {
  version: number; worldKind: 'fictional'; careerId: string; seed: number; revision: number;
  season: number; round: number; phase: 'preRace' | 'grid' | 'race' | 'raceResult' | 'seasonReview';
  teamId: string; cash: number; reserved: number; upgradeCosts: Record<CarArea, number | null>;
  teams: Team[]; drivers: Driver[]; calendar: { id: string; name: string; laps: number; entryCost: number }[];
  race: null | { roundId: string; lap: number; weather: 'dry' | 'wet'; grid: { driverId: string; teamId: string; timeMs: number }[]; entries: RaceEntry[] };
  results: { roundId: string; classification: Classification[]; teamPrize: number; operatingCost: number }[];
  driverStandings: { driverId: string; points: number }[];
  constructorStandings: { teamId: string; points: number }[];
};
type Receipt = { type: string; revision: number; cost?: number; teamPrize?: number; operatingCost?: number };
type Transition = { ok: true; state: Career; receipt: Receipt } | { ok: false; reason: string };
type Api = {
  createCareer(seed: number): Career;
  applyAction(state: Career, action: Record<string, unknown>): Transition;
  validateSavedCareer(raw: unknown): { ok: true; state: Career } | { ok: false; reason: string };
  seasonScore(summary: { teamPoints: number; roundsBothDriversFinished: number; rounds: number }): number;
};
let engine: Api | null = null;
beforeAll(async () => {
  if (enginePresent) engine = await import(/* @vite-ignore */ pathToFileURL(ENGINE_PATH).href) as Api;
});
afterEach(() => { vi.restoreAllMocks(); });

it('GP_ENGINE_AVAILABLE: a new career can reach a complete first race', () => {
  expect(enginePresent, 'GP_ENGINE_MODULE_MISSING: first-race management engine is not implemented').toBe(true);
  for (const name of ['createCareer', 'applyAction', 'validateSavedCareer', 'seasonScore'] as const) {
    expect(typeof engine?.[name], 'GP_ENGINE_PUBLIC_BEHAVIOUR_MISSING:' + name).toBe('function');
  }
});

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
function ownDrivers(career: Career): Driver[] {
  const mine = career.drivers.filter(driver => driver.contract?.teamId === career.teamId);
  expect(mine, 'GP_FIXTURE_REQUIRES_TWO_DISTINCT_TEAM_DRIVERS').toHaveLength(2);
  return mine;
}
function move(career: Career, action: Record<string, unknown>) {
  const before = JSON.stringify(career);
  const result = engine!.applyAction(career, { ...action, expectedRevision: career.revision });
  expect(result.ok, 'GP_LEGAL_ACTION_MUST_SUCCEED:' + action.type + ':' + JSON.stringify(result)).toBe(true);
  expect(JSON.stringify(career), 'GP_TRANSITION_MUST_NOT_MUTATE_PRIOR_SAVE').toBe(before);
  if (result.ok === false) throw new Error('Unreachable refused legal action');
  expect(result.state.revision).toBe(career.revision + 1);
  expect(result.receipt.revision).toBe(result.state.revision);
  return result;
}
function onGrid(seed = 291) {
  return move(engine!.createCareer(seed), { type: 'qualify' }).state;
}
function racing(seed = 291) {
  const grid = onGrid(seed);
  return move(grid, {
    type: 'startRace',
    setups: ownDrivers(grid).map(driver => ({ driverId: driver.id, pace: 'balanced' as Pace, compound: 'medium' as Compound })),
  }).state;
}
function interval(career: Career) {
  return move(career, {
    type: 'raceInterval',
    orders: ownDrivers(career).map(driver => ({ driverId: driver.id, pace: 'balanced' as Pace })),
  });
}
function completed(seed = 291) {
  let state = racing(seed);
  let receipt: Receipt | undefined;
  for (const lap of [12, 26, 40]) {
    const result = interval(state);
    state = result.state; receipt = result.receipt;
    expect(state.race?.lap, 'GP_RACE_MUST_REACH_ITS_NEXT_HELD_DECISION_BOUNDARY').toBe(lap);
  }
  expect(state.phase).toBe('raceResult');
  return { state, receipt: receipt! };
}

// Baseline skip count is declared. Once the intended module exists, every case below runs.
describe.skipIf(!enginePresent)('Grand Prix Boss first-race engine', { timeout: 120000 }, () => {
  it('GP_WORLD: creates ten fictional teams, twenty exclusive seats and twelve playable rounds', () => {
    const career = engine!.createCareer(291);
    expect(career).toMatchObject({ version: 1, worldKind: 'fictional', seed: 291, revision: 0, season: 1, round: 0, phase: 'preRace', race: null, results: [] });
    expect(career.teams).toHaveLength(10);
    expect(new Set(career.teams.map(team => team.id)).size).toBe(10);
    expect(career.drivers).toHaveLength(26);
    expect(new Set(career.drivers.map(driver => driver.id)).size).toBe(26);
    expect(career.drivers.filter(driver => driver.contract)).toHaveLength(20);
    expect(career.drivers.filter(driver => !driver.contract)).toHaveLength(6);
    for (const team of career.teams) expect(career.drivers.filter(driver => driver.contract?.teamId === team.id)).toHaveLength(2);
    expect(career.calendar).toHaveLength(12);
    expect(new Set(career.calendar.map(track => track.id)).size).toBe(12);
    expect(career.calendar.every(track => track.laps === 40 && Number.isInteger(track.entryCost) && track.entryCost > 0)).toBe(true);
    expect(Number.isInteger(career.cash) && Number.isInteger(career.reserved)).toBe(true);
    expect(career.reserved).toBeGreaterThan(0);
    expect(career.cash).toBeGreaterThan(career.reserved);
    ownDrivers(career);
  });

  it('GP_SEED: the same seed has the same complete world despite different clock and global random values', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.01);
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000);
    const first = engine!.createCareer(291);
    random.mockReturnValue(0.99); now.mockReturnValue(9_999_999);
    expect(engine!.createCareer(291)).toEqual(first);
    expect(engine!.createCareer(292)).not.toEqual(first);
  });

  it('GP_UPGRADE: improving one car area charges the quoted cost and keeps committed funds', () => {
    const career = engine!.createCareer(291), team = career.teams.find(row => row.id === career.teamId)!;
    const quote = career.upgradeCosts?.power;
    expect(Number.isInteger(quote) && quote! > 0, 'GP_UPGRADE_MUST_SHOW_AUTHORITATIVE_PRICE_BEFORE_PURCHASE').toBe(true);
    const next = move(career, { type: 'upgrade', area: 'power' });
    expect(next.receipt.cost, 'GP_UPGRADE_MUST_CHARGE_THE_DISPLAYED_PRICE').toBe(quote);
    expect(next.state.upgradeCosts.power, 'GP_UPGRADE_NEXT_PRICE_MUST_FOLLOW_THE_NEW_CAR').toBeGreaterThan(quote!);
    const car = next.state.teams.find(row => row.id === career.teamId)!.car;
    expect(next.receipt.cost, 'GP_UPGRADE_CANNOT_BE_FREE').toBeGreaterThan(0);
    expect(Number.isInteger(next.receipt.cost)).toBe(true);
    expect(next.state.cash).toBe(career.cash - next.receipt.cost!);
    expect(next.state.cash).toBeGreaterThanOrEqual(next.state.reserved);
    expect(car.power).toBeGreaterThan(team.car.power);
    expect(car.aero).toBe(team.car.aero);
    expect(car.reliability).toBe(team.car.reliability);
    expect(next.state.reserved).toBe(career.reserved);
    // A clearly constructed rich-team fixture reaches the car limit through real purchases.
    let funded = { ...clone(career), cash: 1_000_000_000 };
    for (let attempt = 0; attempt < 64 && funded.teams.find(row => row.id === funded.teamId)!.car.power < 100; attempt += 1) {
      funded = move(funded, { type: 'upgrade', area: 'power' }).state;
    }
    expect(funded.teams.find(row => row.id === funded.teamId)!.car.power).toBe(100);
    expect(funded.upgradeCosts.power, 'GP_UPGRADE_LIMIT_MUST_NOT_QUOTE_ANOTHER_PAID_IMPROVEMENT').toBeNull();
    const held = JSON.stringify(funded);
    expect(engine!.applyAction(funded, { type: 'upgrade', area: 'power', expectedRevision: funded.revision }).ok).toBe(false);
    expect(JSON.stringify(funded)).toBe(held);
  });

  it('GP_RESERVE: repeated upgrade attempts preserve the money needed to enter the first race', () => {
    let career = engine!.createCareer(291), successes = 0, stopped = false;
    for (let count = 0; count < 128 && !stopped; count += 1) {
      let bought = false;
      for (const area of ['power', 'aero', 'reliability'] as const) {
        const before = JSON.stringify(career);
        const result = engine!.applyAction(career, { type: 'upgrade', area, expectedRevision: career.revision });
        expect(JSON.stringify(career)).toBe(before);
        if (result.ok) { career = result.state; bought = true; successes += 1; }
      }
      stopped = !bought;
      expect(career.cash).toBeGreaterThanOrEqual(career.reserved);
    }
    expect(successes, 'GP_RESERVE_FIXTURE_MUST_ACTUALLY_SPEND_ON_UPGRADES').toBeGreaterThan(0);
    expect(stopped, 'GP_UPGRADES_MUST_HAVE_A_FINITE_COST_OR_CAR_LIMIT').toBe(true);
    const grid = move(career, { type: 'qualify' }).state;
    const race = move(grid, { type: 'startRace', setups: ownDrivers(grid).map(driver => ({ driverId: driver.id, pace: 'balanced', compound: 'medium' })) }).state;
    expect(race.phase, 'GP_VALID_NEW_TEAM_MUST_NEVER_BE_FINANCIALLY_LOCKED_OUT_OF_RACE_ONE').toBe('race');
  });

  it('GP_GRID: qualifying records twenty distinct contracted drivers without paying race money or points', () => {
    const career = engine!.createCareer(291), grid = move(career, { type: 'qualify' }).state;
    expect(grid.phase).toBe('grid');
    expect(grid.race!.grid).toHaveLength(20);
    expect(new Set(grid.race!.grid.map(row => row.driverId)).size).toBe(20);
    const entered = career.drivers.filter(driver => driver.contract).map(driver => driver.id).sort();
    expect(grid.race!.grid.map(row => row.driverId).sort()).toEqual(entered);
    expect(grid.race!.grid.every(row => Number.isFinite(row.timeMs) && row.timeMs > 0)).toBe(true);
    expect(grid.race!.grid.map(row => row.timeMs)).toEqual([...grid.race!.grid.map(row => row.timeMs)].sort((a, b) => a - b));
    expect(grid.cash).toBe(career.cash);
    expect(grid.results).toHaveLength(0);
    expect(grid.driverStandings.every(row => row.points === 0)).toBe(true);
    expect(grid.constructorStandings.every(row => row.points === 0)).toBe(true);
  });

  it('GP_SETUPS: duplicate or foreign driver orders refuse without changing the saved grid', () => {
    const grid = onGrid(), mine = ownDrivers(grid), foreign = grid.drivers.find(driver => driver.contract && driver.contract.teamId !== grid.teamId)!;
    for (const driverIds of [[mine[0].id, mine[0].id], [mine[0].id, foreign.id]]) {
      const before = JSON.stringify(grid);
      const result = engine!.applyAction(grid, { type: 'startRace', expectedRevision: grid.revision, setups: driverIds.map(driverId => ({ driverId, pace: 'balanced', compound: 'medium' })) });
      expect(result).toEqual({ ok: false, reason: 'invalid' });
      expect(JSON.stringify(grid)).toBe(before);
    }
    const race = racing();
    expect(race).toMatchObject({ phase: 'race', race: { lap: 0 } });
    expect(race.race!.entries).toHaveLength(20);
    expect(race.race!.entries.every(row => row.stops === 0 && row.status === 'running')).toBe(true);
  });

  it('GP_CLASSIFICATION: the first complete race reconciles every driver and constructor point', () => {
    const { state } = completed();
    expect(state.results).toHaveLength(1);
    const result = state.results[0], rows = result.classification;
    expect(result.roundId).toBe(state.calendar[0].id);
    expect(rows).toHaveLength(20);
    expect(new Set(rows.map(row => row.driverId)).size).toBe(20);
    expect(rows.map(row => row.position)).toEqual(Array.from({ length: 20 }, (_, index) => index + 1));
    const points = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
    for (const row of rows) {
      expect(row.points).toBe(row.status === 'finished' ? points[row.position - 1] ?? 0 : 0);
      expect(state.driverStandings.find(driver => driver.driverId === row.driverId)?.points).toBe(row.points);
    }
    for (const team of state.teams) {
      const earned = rows.filter(row => row.teamId === team.id).reduce((sum, row) => sum + row.points, 0);
      expect(state.constructorStandings.find(row => row.teamId === team.id)?.points).toBe(earned);
    }
  });

  it('GP_SETTLEMENT: a race pays its shown prize and deducts one entry cost and both drivers wages', () => {
    const start = racing();
    let beforeFinish = start;
    beforeFinish = interval(beforeFinish).state;
    beforeFinish = interval(beforeFinish).state;
    expect(beforeFinish.cash).toBe(start.cash);
    const result = interval(beforeFinish), final = result.state.results[0];
    const cost = start.calendar[0].entryCost + ownDrivers(start).reduce((sum, driver) => sum + driver.contract!.wagePerRace, 0);
    expect(final.operatingCost, 'GP_RACE_COST_MUST_INCLUDE_ACTUAL_SIGNED_WAGES').toBe(cost);
    expect(Number.isInteger(final.teamPrize) && final.teamPrize >= 0).toBe(true);
    expect(result.receipt.operatingCost).toBe(cost);
    expect(result.receipt.teamPrize).toBe(final.teamPrize);
    expect(result.state.cash).toBe(start.cash + final.teamPrize - cost);
    expect(result.state.reserved).toBe(start.reserved - cost);
  });

  it('GP_DUPLICATE: repeating a finished race action cannot pay or score it again', () => {
    let state = racing(); state = interval(state).state; state = interval(state).state;
    const action = { type: 'raceInterval', expectedRevision: state.revision, orders: ownDrivers(state).map(driver => ({ driverId: driver.id, pace: 'balanced' })) };
    const result = engine!.applyAction(state, action);
    expect(result.ok).toBe(true);
    if (result.ok === false) throw new Error('Unreachable refused final interval');
    const saved = JSON.stringify(result.state);
    expect(engine!.applyAction(result.state, action)).toEqual({ ok: false, reason: 'stale' });
    expect(JSON.stringify(result.state)).toBe(saved);
    const next = move(result.state, { type: 'continue' }).state;
    expect(next).toMatchObject({ round: 1, phase: 'preRace', race: null });
    expect(next.results).toEqual(result.state.results);
    expect(next.cash).toBe(result.state.cash);
    expect(next.constructorStandings).toEqual(result.state.constructorStandings);
  });

  it('GP_RESUME: a JSON save at a real decision boundary resumes the exact same race', () => {
    const boundary = interval(racing()).state;
    expect(boundary.race!.lap).toBe(12);
    const saved = clone(boundary), raw = JSON.stringify(saved);
    const restored = engine!.validateSavedCareer(saved);
    expect(restored.ok, 'GP_VALID_MID_RACE_SAVE_MUST_REOPEN').toBe(true);
    expect(JSON.stringify(saved)).toBe(raw);
    if (restored.ok === false) throw new Error('Unreachable refused valid save');
    expect(restored.state).toEqual(boundary);
    const uninterrupted = interval(interval(boundary).state).state;
    const resumed = interval(interval(restored.state).state).state;
    expect(resumed).toEqual(uninterrupted);
  });

  it('GP_INVALID_SAVE: future versions and malformed identities refuse while the raw input stays held', () => {
    const career = racing();
    const future = { ...clone(career), version: 2 };
    expect(engine!.validateSavedCareer(future)).toEqual({ ok: false, reason: 'unsupported' });
    const duplicate = clone(career); duplicate.drivers[0].id = duplicate.drivers[1].id;
    const foreign = clone(career); foreign.drivers.find(driver => driver.contract)!.contract!.teamId = 'missing-team';
    const brokenMoney = { ...clone(career), cash: Number.NaN };
    const grid = onGrid();
    // Keep twenty unique IDs and matching grid/entry rows, but substitute an unsigned driver.
    const freeAgentGrid = clone(grid), omittedId = ownDrivers(freeAgentGrid)[0].id;
    const freeAgentId = freeAgentGrid.drivers.find(driver => !driver.contract)!.id;
    for (const row of [...freeAgentGrid.race!.grid, ...freeAgentGrid.race!.entries]) {
      if (row.driverId === omittedId) row.driverId = freeAgentId;
    }
    // Every driver remains signed and each team still has two entrants, but two employers are false.
    const wrongOwners = clone(grid);
    const first = wrongOwners.race!.grid[0], second = wrongOwners.race!.grid.find(row => row.teamId !== first.teamId)!;
    const firstId = first.driverId, secondId = second.driverId, firstTeam = first.teamId, secondTeam = second.teamId;
    for (const row of [...wrongOwners.race!.grid, ...wrongOwners.race!.entries]) {
      if (row.driverId === firstId) row.teamId = secondTeam;
      else if (row.driverId === secondId) row.teamId = firstTeam;
    }
    const entryMismatch = clone(grid);
    entryMismatch.race!.entries[0].driverId = entryMismatch.drivers.find(driver => !driver.contract)!.id;
    const retiredQualifier = clone(grid); retiredQualifier.race!.entries[0].status = 'retired';
    const stoppedQualifier = clone(grid); stoppedQualifier.race!.entries[0].stops = 1;
    const behindInterval = interval(racing()).state;
    behindInterval.race!.entries.find(entry => entry.status === 'running')!.completedLaps = 0;
    for (const raw of [null, {}, duplicate, foreign, brokenMoney, freeAgentGrid, wrongOwners, entryMismatch, retiredQualifier, stoppedQualifier, behindInterval]) {
      const before = JSON.stringify(raw);
      expect(engine!.validateSavedCareer(raw)).toEqual({ ok: false, reason: 'invalid' });
      expect(JSON.stringify(raw)).toBe(before);
    }
  });

  it('GP_SCORE: zero, half and perfect twelve-round seasons earn the disclosed zero-to-one-hundred score', () => {
    expect(engine!.seasonScore({ teamPoints: 0, roundsBothDriversFinished: 0, rounds: 12 })).toBe(0);
    expect(engine!.seasonScore({ teamPoints: 258, roundsBothDriversFinished: 6, rounds: 12 })).toBe(50);
    expect(engine!.seasonScore({ teamPoints: 516, roundsBothDriversFinished: 12, rounds: 12 })).toBe(100);
  });
});
