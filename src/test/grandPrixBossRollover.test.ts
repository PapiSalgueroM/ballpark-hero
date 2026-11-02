import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import type { CarArea, GrandPrixCareer, GrandPrixOrder } from '@/lib/grandPrixBoss';

type DriverSnapshot = { driverId: string; name: string; points: number; wins: number; podiums: number; races: number; finishes: number };
type Summary = {
  season: number; rounds: number;
  driverChampion: { driverId: string; name: string; teamId: string; points: number; wins: number; podiums: number };
  constructorChampion: { teamId: string; name: string; points: number; wins: number; podiums: number };
  team: { teamId: string; name: string; position: number; points: number; wins: number; podiums: number; drivers: DriverSnapshot[] };
  races: { roundId: string; trackName: string; points: number; teamPrize: number; operatingCost: number;
    drivers: { driverId: string; name: string; position: number; status: string; points: number }[] }[];
  roundsBothDriversFinished: number; endCash: number; finalCar: Record<CarArea, number>;
};
type Totals = { archivedSeasons: number; driverTitles: number; constructorTitles: number; sinceSeason: number; earlierSeasonsUnknown: boolean };
type Career = GrandPrixCareer & { history?: Summary[]; careerTotals?: Totals };
type Receipt = { revision: number; cost?: number; sponsor?: number; renewalFee?: number; cashDelta?: number };
type Api = {
  createCareer(seed: number): Career;
  applyAction(state: Career, action: Record<string, unknown>): { ok: true; state: Career; receipt: Receipt } | { ok: false; reason: string };
  validateSavedCareer(raw: unknown): { ok: true; state: Career } | { ok: false; reason: string };
};
const ENGINE_PATH = process.env.GP_BOSS_ENGINE_FILE ? path.resolve(process.env.GP_BOSS_ENGINE_FILE) : path.resolve(process.cwd(), 'src/lib/grandPrixBoss.ts');
let engine: Api;
beforeAll(async () => { engine = await import(/* @vite-ignore */ pathToFileURL(ENGINE_PATH).href) as Api; });
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const own = (state: Career) => state.drivers.filter(driver => driver.contract?.teamId === state.teamId);
const car = (state: Career) => state.teams.find(team => team.id === state.teamId)!.car;
function read(raw: Career): Career {
  const before = JSON.stringify(raw), loaded = engine.validateSavedCareer(raw);
  expect(JSON.stringify(raw), 'GP_ROLLOVER_READER_MUST_HOLD_RAW_INPUT').toBe(before);
  expect(loaded.ok, 'GP_ROLLOVER_REAL_FIXTURE_MUST_LOAD').toBe(true);
  if (loaded.ok === false) throw new Error('Unreachable refused real fixture');
  return loaded.state;
}
function move(state: Career, action: Record<string, unknown>) {
  const before = JSON.stringify(state);
  const result = engine.applyAction(state, { ...action, expectedRevision: state.revision });
  expect(JSON.stringify(state), 'GP_ROLLOVER_ACTION_MUST_NOT_MUTATE_PRIOR_STATE').toBe(before);
  expect(result.ok, action.type === 'startNextSeason' ? 'GP_NEXT_SEASON_ACTION_MISSING: atomic rollover is not implemented' : 'GP_ROLLOVER_FIXTURE_ACTION_REFUSED:' + action.type).toBe(true);
  if (result.ok === false) throw new Error('Unreachable refused legal rollover fixture');
  expect(result.state.revision).toBe(state.revision + 1);
  expect(result.receipt.revision).toBe(result.state.revision);
  read(result.state);
  return result;
}
const next = (state: Career) => move(state, { type: 'startNextSeason' });
function stripQuotes(raw: Career) {
  delete (raw as Partial<Career>).marketOffers;
  delete (raw as Partial<Career>).nextSeasonPlan;
}
function book(state: Career) {
  expect(Array.isArray(state.history), 'GP_HISTORY_LEDGER_MISSING: bounded season snapshots are not implemented').toBe(true);
  expect(state.careerTotals && typeof state.careerTotals === 'object', 'GP_HISTORY_LEDGER_MISSING: tracked lifetime totals are not implemented').toBeTruthy();
  return { history: state.history!, totals: state.careerTotals! };
}
function fixture(years = 1, cash = 12_000_000) {
  const raw = clone(engine.createCareer(291));
  const [first, second] = own(raw);
  first.contract!.years = years; second.contract!.years = 2;
  for (const driver of [first, second]) { driver.skills.pace = 60; driver.potential = Math.max(driver.potential, 60); }
  const available = raw.drivers.find(driver => driver.contract === null)!;
  available.skills.pace = 70; available.potential = Math.max(available.potential, 70);
  raw.cash = cash; stripQuotes(raw);
  return { state: read(raw), firstId: first.id, secondId: second.id, availableId: available.id };
}
function race(state: Career) {
  state = move(state, { type: 'qualify' }).state;
  state = move(state, { type: 'startRace', setups: own(state).map(driver => ({ driverId: driver.id, pace: 'balanced', compound: state.race!.weather === 'wet' ? 'wet' : 'medium' })) }).state;
  while (state.phase === 'race') {
    const orders: GrandPrixOrder[] = own(state).map(driver => {
      const entry = state.race!.entries.find(row => row.driverId === driver.id)!;
      let pitTo: GrandPrixOrder['pitTo'];
      if (state.race!.lap > 0 && entry.status === 'running') {
        if (state.race!.weather === 'wet' && entry.compound !== 'wet') pitTo = 'wet';
        else if (state.race!.weather === 'dry' && entry.compound === 'wet') pitTo = 'medium';
        else if (entry.tyreWear > 58) pitTo = state.race!.weather === 'wet' ? 'wet' : 'hard';
      }
      return { driverId: driver.id, pace: 'balanced', ...(pitTo ? { pitTo } : {}) };
    });
    state = move(state, { type: 'raceInterval', orders }).state;
  }
  return state;
}
function review(state: Career) {
  expect(state.phase).toBe('preRace'); expect(state.round).toBe(0);
  for (let round = 0; round < 12; round += 1) {
    state = race(state);
    if (round < 11) state = move(state, { type: 'continue' }).state;
  }
  expect(state.phase).toBe('seasonReview'); expect(state.results).toHaveLength(12);
  return read(state);
}
function strong() {
  const f = fixture(1, 1_000_000_000), raw = clone(f.state);
  for (const driver of own(raw)) {
    driver.skills = { pace: 100, consistency: 100, tyreCare: 100, wet: 100 };
    driver.potential = 100; driver.age = 20;
  }
  stripQuotes(raw);
  let state = read(raw);
  for (const area of ['power', 'aero', 'reliability'] as CarArea[]) {
    while (car(state)[area] < 100) {
      const quote = state.upgradeCosts[area];
      expect(quote).not.toBeNull();
      const bought = move(state, { type: 'upgrade', area });
      expect(bought.receipt.cost).toBe(quote); state = bought.state;
    }
  }
  return state;
}
function championTeam(state: Career, driverId: string) {
  const row = state.results.flatMap(result => result.classification).find(row => row.driverId === driverId);
  expect(row, 'GP_ROLLOVER_CHAMPION_MUST_HAVE_AN_ACTUAL_COMPLETED_CLASSIFICATION').toBeDefined();
  return row!.teamId;
}
function snapshot(state: Career) {
  const driver = state.driverStandings[0], team = state.constructorStandings[0];
  const owned = state.constructorStandings.find(row => row.teamId === state.teamId)!;
  return {
    season: state.season, rounds: 12,
    driverChampion: { ...driver, name: state.drivers.find(row => row.id === driver.driverId)!.name, teamId: championTeam(state, driver.driverId) },
    constructorChampion: { ...team, name: state.teams.find(row => row.id === team.teamId)!.name },
    team: { ...owned, name: state.teams.find(row => row.id === state.teamId)!.name,
      position: state.constructorStandings.findIndex(row => row.teamId === state.teamId) + 1 },
    endCash: state.cash, finalCar: clone(car(state)),
  };
}

describe('Grand Prix Boss atomic next season and history', { timeout: 240000 }, () => {
  it('GP_ROLLOVER_COMMIT: pays one quoted sponsor and renewal transaction while entering year two', () => {
    const ended = review(fixture().state), plan = ended.nextSeasonPlan!;
    expect(plan).toMatchObject({ nextSeason: 2, sponsor: 12_000_000, totalRenewalFee: 320_000, nextReserved: 6_360_000, cashAfter: ended.cash + 11_680_000, affordable: true });
    const advanced = next(ended), state = advanced.state;
    expect(state).toMatchObject({ careerId: ended.careerId, seed: ended.seed, teamId: ended.teamId, season: 2, round: 0, phase: 'preRace', race: null, results: [], cash: plan.cashAfter, reserved: plan.nextReserved });
    expect(advanced.receipt).toMatchObject({ sponsor: 12_000_000, renewalFee: 320_000, cashDelta: 11_680_000 });
    expect(book(state).totals).toMatchObject({ archivedSeasons: 1, sinceSeason: 1, earlierSeasonsUnknown: false });
  });

  it('GP_ROLLOVER_CONTRACTS: renews expiry once and decrements active remaining terms once', () => {
    const f = fixture(), ended = review(f.state), advanced = next(ended).state;
    const first = advanced.drivers.find(row => row.id === f.firstId)!, second = advanced.drivers.find(row => row.id === f.secondId)!;
    expect(first.contract).toEqual({ teamId: ended.teamId, years: 1, startsSeason: 2, wagePerRace: 160_000 });
    expect(second.contract).toEqual({ teamId: ended.teamId, years: 1, startsSeason: 1, wagePerRace: 120_000 });
    expect(advanced.drivers.map(row => row.id)).toEqual(ended.drivers.map(row => row.id));
    expect(advanced.drivers.filter(row => row.contract)).toHaveLength(20);
    for (const team of advanced.teams) expect(advanced.drivers.filter(row => row.contract?.teamId === team.id)).toHaveLength(2);
    for (const old of ended.drivers.filter(row => row.contract && row.contract.teamId !== ended.teamId)) {
      const current = advanced.drivers.find(row => row.id === old.id)!;
      if (old.contract!.years > 1) expect(current.contract).toMatchObject({ years: old.contract!.years - 1, wagePerRace: old.contract!.wagePerRace });
      else expect(current.contract).toMatchObject({ years: 1, startsSeason: 2 });
    }
  });

  it('GP_ROLLOVER_PREPAID: review signings and explicit renewals keep their paid one-year deals', () => {
    const f = fixture(); let ended = review(f.state);
    ended = move(ended, { type: 'renewDriver', driverId: f.firstId }).state;
    ended = move(ended, { type: 'signDriver', outgoingDriverId: f.secondId, incomingDriverId: f.availableId }).state;
    expect(ended.nextSeasonPlan).toMatchObject({ totalRenewalFee: 0, nextReserved: 7_020_000 });
    const state = next(ended).state;
    expect(state.cash).toBe(ended.cash + 12_000_000);
    expect(state.drivers.find(row => row.id === f.firstId)!.contract).toMatchObject({ years: 1, startsSeason: 2, wagePerRace: 160_000 });
    expect(state.drivers.find(row => row.id === f.availableId)!.contract).toMatchObject({ years: 1, startsSeason: 2, wagePerRace: 175_000 });
    expect(state.drivers.find(row => row.id === f.secondId)!.contract).toBeNull();
  });

  it('GP_ROLLOVER_CHAMPIONS: snapshots actual title credit before a review replacement changes the seats', () => {
    let ended = review(strong());
    expect(ended.constructorStandings[0]).toMatchObject({ teamId: ended.teamId, points: 516, wins: 12, podiums: 24 });
    const oldIds = [...new Set(ended.results.flatMap(result => result.classification.filter(row => row.teamId === ended.teamId).map(row => row.driverId)))];
    const champ = ended.driverStandings[0].driverId, incoming = ended.drivers.find(row => row.contract === null)!;
    ended = move(ended, { type: 'signDriver', outgoingDriverId: champ, incomingDriverId: incoming.id }).state;
    const held = snapshot(ended);
    const advanced = next(ended).state, { history, totals } = book(advanced), row = history[0];
    expect(history).toHaveLength(1); expect(row).toMatchObject(held);
    expect(row.team.drivers.map(driver => driver.driverId).sort()).toEqual(oldIds.sort());
    expect(row.team.drivers.some(driver => driver.driverId === incoming.id)).toBe(false);
    expect(row.roundsBothDriversFinished).toBe(12);
    expect(row.races).toHaveLength(12);
    expect(row.races.reduce((sum, race) => sum + race.points, 0)).toBe(516);
    expect(row.finalCar).toEqual(held.finalCar); expect(row.finalCar).not.toBe(car(advanced));
    expect(totals).toEqual({ archivedSeasons: 1, driverTitles: 1, constructorTitles: 1, sinceSeason: 1, earlierSeasonsUnknown: false });
  });

  it('GP_ROLLOVER_CALENDAR: makes twelve new deterministic rounds and keeps paid progress', () => {
    let state = fixture(2, 100_000_000).state;
    const initialPower = car(state).power, target = Math.min(100, initialPower + 20);
    while (car(state).power < target) state = move(state, { type: 'upgrade', area: 'power' }).state;
    const ended = review(state), first = next(ended).state, second = next(clone(ended)).state;
    expect(first).toEqual(second);
    expect(first.calendar).toHaveLength(12);
    expect(first.calendar.map(row => row.id)).toEqual(Array.from({ length: 12 }, (_, index) => `gp-season-2-round-${index}`));
    expect(first.calendar.some(row => ended.calendar.some(old => old.id === row.id))).toBe(false);
    for (let index = 0; index < 12; index += 1) expect(first.calendar[index]).toMatchObject({ name: ended.calendar[index].name, laps: ended.calendar[index].laps, entryCost: ended.calendar[index].entryCost, powerWeight: ended.calendar[index].powerWeight, aeroWeight: ended.calendar[index].aeroWeight });
    expect(first.driverStandings).toHaveLength(26); expect(first.constructorStandings).toHaveLength(10);
    for (const row of [...first.driverStandings, ...first.constructorStandings]) expect(row).toMatchObject({ points: 0, wins: 0, podiums: 0 });
    expect(car(first).power).toBeGreaterThan(initialPower);
    expect(book(first).history[0].finalCar).toEqual(car(ended));
  });

  it('GP_ROLLOVER_YEAR_TWO: the next actual race charges the new contracts and exact commitments', () => {
    const ended = review(fixture().state), yearTwo = next(ended).state, completed = race(yearTwo);
    expect(completed.results).toHaveLength(1);
    expect(completed.results[0].roundId).toBe('gp-season-2-round-0');
    expect(completed.results[0].operatingCost).toBe(530_000);
    expect(completed.reserved).toBe(5_830_000);
    expect(completed.cash).toBe(yearTwo.cash + completed.results[0].teamPrize - 530_000);
    expect(book(completed).history).toEqual(book(yearTwo).history);
  });

  it('GP_ROLLOVER_TAIL: fourteen played seasons retain twelve immutable snapshots and older title totals', () => {
    let state = strong(), driverTitles = 0, constructorTitles = 0;
    const witnesses: ReturnType<typeof snapshot>[] = [];
    let firstReturned: Summary | null = null, firstBytes = '';
    for (let season = 1; season <= 14; season += 1) {
      const ended = review(state), held = snapshot(ended);
      witnesses.push(held);
      if (held.driverChampion.teamId === ended.teamId) driverTitles += 1;
      if (held.constructorChampion.teamId === ended.teamId) constructorTitles += 1;
      state = next(ended).state;
      const ledger = book(state);
      expect(ledger.totals).toEqual({ archivedSeasons: season, driverTitles, constructorTitles, sinceSeason: 1, earlierSeasonsUnknown: false });
      expect(ledger.history.map(row => row.season)).toEqual(Array.from({ length: Math.min(season, 12) }, (_, index) => Math.max(1, season - 11) + index));
      if (season === 1) { firstReturned = ledger.history[0]; firstBytes = JSON.stringify(firstReturned); }
      expect(JSON.stringify(firstReturned)).toBe(firstBytes);
      expect(state.drivers.filter(row => row.contract)).toHaveLength(20);
      expect(own(state)).toHaveLength(2);
    }
    expect(book(state).history.map(row => row.season)).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
    for (const row of book(state).history) expect(row).toMatchObject(witnesses[row.season - 1]);
    expect(state.season).toBe(15);
    expect(book(state).totals.archivedSeasons).toBe(14);
  });

  it('GP_ROLLOVER_REPLAY: old revision and repeated rollover never pay or archive twice', () => {
    const ended = review(fixture().state), action = { type: 'startNextSeason', expectedRevision: ended.revision };
    const state = next(ended).state, bytes = JSON.stringify(state);
    expect(engine.applyAction(state, action)).toEqual({ ok: false, reason: 'stale' });
    expect(engine.applyAction(state, { ...action, expectedRevision: state.revision })).toEqual({ ok: false, reason: 'phase' });
    expect(JSON.stringify(state)).toBe(bytes);
    expect(book(state).history).toHaveLength(1);
    const restored = read(clone(state));
    expect(restored).toEqual(state); expect(restored.cash).toBe(state.cash);
  });

  it('GP_ROLLOVER_PHASE: current qualifying race and intermediate result cannot collect a new year', () => {
    const state = fixture().state, grid = move(state, { type: 'qualify' }).state;
    const active = move(grid, { type: 'startRace', setups: own(grid).map(driver => ({ driverId: driver.id, pace: 'balanced', compound: 'medium' })) }).state;
    const result = race(state);
    for (const current of [state, grid, active, result]) {
      const before = JSON.stringify(current);
      expect(engine.applyAction(current, { type: 'startNextSeason', expectedRevision: current.revision }), 'GP_ROLLOVER_PHASE_GUARD_MISSING').toEqual({ ok: false, reason: 'phase' });
      expect(JSON.stringify(current)).toBe(before);
    }
  });

  it('GP_ROLLOVER_FUNDS: exactly funded next-year commitments pass and one euro short refuses', () => {
    const f = fixture(2, 50_000_000), raw = clone(f.state);
    own(raw)[1].contract!.wagePerRace = 1_000_000; raw.reserved = 17_160_000; stripQuotes(raw);
    const ended = review(read(raw)), short = clone(ended);
    short.cash = 5_159_999; stripQuotes(short);
    const unfunded = read(short), bytes = JSON.stringify(unfunded);
    expect(unfunded.nextSeasonPlan).toMatchObject({ totalRenewalFee: 0, nextReserved: 17_160_000, cashAfter: 17_159_999, affordable: false });
    expect(engine.applyAction(unfunded, { type: 'startNextSeason', expectedRevision: unfunded.revision }), 'GP_ROLLOVER_FUNDS_GUARD_MISSING').toEqual({ ok: false, reason: 'funds' });
    expect(JSON.stringify(unfunded)).toBe(bytes);
    const exact = clone(ended); exact.cash = 5_160_000; stripQuotes(exact);
    const state = next(read(exact)).state;
    expect(state.cash).toBe(17_160_000); expect(state.reserved).toBe(17_160_000);
    const grid = move(state, { type: 'qualify' }).state;
    expect(grid.phase).toBe('grid');
  });

  it('GP_ROLLOVER_LEGACY: missing history starts known tracking without inventing earlier seasons', () => {
    // Synthetic older A shape, not a claim that fourteen seasons were played.
    const raw = clone(fixture().state);
    raw.season = 14; stripQuotes(raw);
    delete raw.history; delete raw.careerTotals;
    const bytes = JSON.stringify(raw), loaded = read(raw), ledger = book(loaded);
    expect(JSON.stringify(raw)).toBe(bytes);
    expect(ledger.history).toEqual([]);
    expect(ledger.totals).toEqual({ archivedSeasons: 0, driverTitles: 0, constructorTitles: 0, sinceSeason: 14, earlierSeasonsUnknown: true });
    expect(loaded).toMatchObject({ seed: raw.seed, careerId: raw.careerId, teamId: raw.teamId, cash: raw.cash, reserved: raw.reserved, season: 14 });
    expect(loaded.drivers.map(driver => driver.contract)).toEqual(raw.drivers.map(driver => driver.contract));
    const advanced = next(review(loaded)).state;
    expect(book(advanced).history.map(row => row.season)).toEqual([14]);
    expect(book(advanced).totals).toMatchObject({ archivedSeasons: 1, sinceSeason: 14, earlierSeasonsUnknown: true });
  });

  it('GP_ROLLOVER_BAD_LEDGER: malformed or partial present history is preserved and refused', () => {
    const fresh = clone(fixture().state);
    fresh.history = []; delete fresh.careerTotals;
    const before = JSON.stringify(fresh);
    expect(engine.validateSavedCareer(fresh), 'GP_ROLLOVER_INVALID_LEDGER_ACCEPTED').toEqual({ ok: false, reason: 'invalid' });
    expect(JSON.stringify(fresh)).toBe(before);
    let state = next(review(fixture().state)).state;
    state = next(review(state)).state;
    const duplicate = clone(state); duplicate.history![1].season = duplicate.history![0].season;
    const reversed = clone(state); reversed.history!.reverse();
    const omitted = clone(state); omitted.history!.shift();
    const future = clone(state); future.history![1].season = state.season;
    const totals = clone(state); totals.careerTotals!.archivedSeasons += 1;
    const titles = clone(state); titles.careerTotals!.constructorTitles += 1;
    const coverage = clone(state); coverage.careerTotals!.earlierSeasonsUnknown = true;
    const money = clone(state); money.history![0].endCash = -1;
    const points = clone(state); points.history![0].races[0].points += 1;
    const name = clone(state); name.history![0].driverChampion.name = '';
    for (const raw of [duplicate, reversed, omitted, future, totals, titles, coverage, money, points, name]) {
      const bytes = JSON.stringify(raw);
      expect(engine.validateSavedCareer(raw), 'GP_ROLLOVER_INVALID_LEDGER_ACCEPTED').toEqual({ ok: false, reason: 'invalid' });
      expect(JSON.stringify(raw)).toBe(bytes);
    }
  });

  it('GP_ROLLOVER_ARCHIVED_IDENTITIES: snapshots survive a synthetic active-roster replacement', () => {
    const first = next(review(strong())).state, old = book(first).history[0], raw = clone(first);
    const oldId = old.driverChampion.driverId, replacementId = 'gp-fixture-next-driver';
    const active = raw.drivers.find(driver => driver.id === oldId)!;
    expect(active).toBeDefined(); active.id = replacementId; active.name = 'Fixture newcomer';
    raw.driverStandings.find(row => row.driverId === oldId)!.driverId = replacementId;
    stripQuotes(raw);
    const bytes = JSON.stringify(old), loaded = read(raw);
    expect(loaded.drivers.some(driver => driver.id === oldId)).toBe(false);
    expect(book(loaded).history[0]).toEqual(old);
    expect(JSON.stringify(old)).toBe(bytes);
    expect(book(loaded).history[0].driverChampion.driverId).toBe(oldId);
  });
});
