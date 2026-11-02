import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';

// The first engine is already qualified. Missing market behavior must fail an owned assertion.
const ENGINE_PATH = process.env.GP_BOSS_ENGINE_FILE
  ? path.resolve(process.env.GP_BOSS_ENGINE_FILE)
  : path.resolve(process.cwd(), 'src/lib/grandPrixBoss.ts');
type Driver = {
  id: string; name: string; age: number; potential: number;
  skills: { pace: number; consistency: number; tyreCare: number; wet: number };
  contract: null | { teamId: string; years: number; wagePerRace: number; startsSeason?: number };
};
type Offer = {
  outgoingDriverId: string; incomingDriverId: string; startsSeason: number; years: number;
  wagePerRace: number; signingFee: number; buyout: number; totalFee: number; reserveAfter: number; affordable: boolean;
};
type Classification = { driverId: string; teamId: string; position: number; status: 'finished' | 'retired'; points: number };
type Career = {
  version: number; worldKind: 'fictional'; seed: number; careerId: string; revision: number;
  season: number; round: number; phase: 'preRace' | 'grid' | 'race' | 'raceResult' | 'seasonReview';
  teamId: string; cash: number; reserved: number; drivers: Driver[];
  teams: { id: string; name: string; car: { power: number; aero: number; reliability: number } }[];
  calendar: { id: string; laps: number; entryCost: number }[];
  race: null | { lap: number; weather: 'wet' | 'dry'; grid: unknown[]; entries: { driverId: string; status: string; compound: string; tyreWear: number; elapsedMs: number; completedLaps: number }[] };
  results: { roundId: string; classification: Classification[]; teamPrize: number; operatingCost: number }[];
  driverStandings: { driverId: string; points: number }[];
  constructorStandings: { teamId: string; points: number }[];
  marketOffers?: Offer[]; nextSeasonPlan?: unknown;
};
type Transition = { ok: true; state: Career; receipt: { revision: number; cost?: number } } | { ok: false; reason: string };
type Api = {
  createCareer(seed: number): Career;
  applyAction(state: Career, action: Record<string, unknown>): Transition;
  validateSavedCareer(raw: unknown): { ok: true; state: Career } | { ok: false; reason: string };
};
let engine: Api;
beforeAll(async () => { engine = await import(/* @vite-ignore */ pathToFileURL(ENGINE_PATH).href) as Api; });
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
function own(state: Career) {
  const rows = state.drivers.filter(driver => driver.contract?.teamId === state.teamId);
  expect(rows, 'GP_MARKET_FIXTURE_MUST_HAVE_TWO_SEATS').toHaveLength(2);
  return rows;
}
function read(raw: unknown): Career {
  const before = JSON.stringify(raw);
  const result = engine.validateSavedCareer(raw);
  expect(JSON.stringify(raw), 'GP_MARKET_READER_MUST_NOT_MUTATE_INPUT').toBe(before);
  expect(result.ok, 'GP_MARKET_LEGAL_FIXTURE_MUST_LOAD:' + JSON.stringify(result)).toBe(true);
  if (!result.ok) throw new Error('Unreachable rejected legal fixture');
  return result.state;
}
function move(state: Career, action: Record<string, unknown>) {
  const before = JSON.stringify(state);
  const result = engine.applyAction(state, { ...action, expectedRevision: state.revision });
  expect(JSON.stringify(state), 'GP_MARKET_TRANSITION_MUST_HOLD_PRIOR_SAVE').toBe(before);
  expect(result.ok, 'GP_MARKET_ACTION_MUST_SUCCEED:' + action.type + ':' + JSON.stringify(result)).toBe(true);
  if (!result.ok) throw new Error('Unreachable refused legal market action');
  expect(result.state.revision).toBe(state.revision + 1);
  expect(result.receipt.revision).toBe(result.state.revision);
  read(result.state);
  return result;
}
function refused(state: Career, action: Record<string, unknown>, reason: string) {
  const before = JSON.stringify(state);
  expect(engine.applyAction(state, { ...action, expectedRevision: state.revision })).toEqual({ ok: false, reason });
  expect(JSON.stringify(state), 'GP_MARKET_REFUSAL_MUST_HOLD_ALL_BYTES').toBe(before);
}
function offers(state: Career) {
  expect(Array.isArray(state.marketOffers), 'GP_MARKET_QUOTE_MISSING: authoritative paid driver offers are not implemented').toBe(true);
  return state.marketOffers!;
}
function quote(state: Career, outgoingDriverId: string, incomingDriverId: string) {
  const found = offers(state).find(row => row.outgoingDriverId === outgoingDriverId && row.incomingDriverId === incomingDriverId);
  expect(found, 'GP_MARKET_REAL_IDS_MUST_HAVE_THEIR_DISPLAYED_OFFER').toBeDefined();
  return found!;
}
function fixture(years = 2, cash = 12_000_000) {
  const raw = clone(engine.createCareer(291));
  const [outgoing, retained] = own(raw);
  outgoing.contract!.years = years;
  retained.contract!.years = 2;
  retained.skills.pace = 60;
  retained.potential = Math.max(retained.potential, 60);
  outgoing.skills.pace = 60;
  outgoing.potential = Math.max(outgoing.potential, 60);
  const incoming = raw.drivers.find(driver => driver.contract === null)!;
  incoming.skills.pace = 70;
  incoming.potential = Math.max(incoming.potential, 70);
  raw.cash = cash;
  // Deliberately readable old v5 shape. The new reader derives quotes from these actual fixture terms.
  delete raw.marketOffers;
  delete raw.nextSeasonPlan;
  for (const driver of raw.drivers) if (driver.contract) delete driver.contract.startsSeason;
  const state = read(raw);
  return { state, outgoingId: outgoing.id, retainedId: retained.id, incomingId: incoming.id };
}
function race(state: Career) {
  state = move(state, { type: 'qualify' }).state;
  state = move(state, { type: 'startRace', setups: own(state).map(driver => ({
    driverId: driver.id, pace: 'balanced', compound: state.race!.weather === 'wet' ? 'wet' : 'medium',
  })) }).state;
  while (state.phase === 'race') {
    const orders = own(state).map(driver => {
      const entry = state.race!.entries.find(row => row.driverId === driver.id)!;
      let pitTo;
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
  for (let round = 0; round < 12; round += 1) {
    state = race(state);
    if (round < 11) state = move(state, { type: 'continue' }).state;
  }
  expect(state.phase).toBe('seasonReview');
  expect(state.results).toHaveLength(12);
  return read(state);
}
function signAction(outgoingDriverId: string, incomingDriverId: string) {
  return { type: 'signDriver', outgoingDriverId, incomingDriverId };
}

describe('Grand Prix Boss paid driver market', { timeout: 120000 }, () => {
  it('GP_MARKET_PUBLIC_QUOTES: shows exact one-season wages fees buyout and reserve before hiring', () => {
    const { state, outgoingId, incomingId } = fixture();
    expect(offers(state)).toHaveLength(12);
    expect(quote(state, outgoingId, incomingId)).toEqual({
      outgoingDriverId: outgoingId, incomingDriverId: incomingId, startsSeason: 1, years: 1,
      wagePerRace: 175_000, signingFee: 350_000, buyout: 2_160_000, totalFee: 2_510_000,
      reserveAfter: 6_540_000, affordable: true,
    });
    for (const offer of offers(state)) {
      expect(own(state).some(driver => driver.id === offer.outgoingDriverId)).toBe(true);
      expect(state.drivers.find(driver => driver.id === offer.incomingDriverId)?.contract).toBeNull();
      for (const key of ['wagePerRace', 'signingFee', 'buyout', 'totalFee', 'reserveAfter'] as const) expect(Number.isSafeInteger(offer[key]) && offer[key] >= 0).toBe(true);
    }
  });

  it('GP_MARKET_SIGN: replaces one exclusive seat and charges the displayed deal once', () => {
    const { state, outgoingId, retainedId, incomingId } = fixture();
    quote(state, outgoingId, incomingId);
    const next = move(state, signAction(outgoingId, incomingId));
    expect(next.receipt.cost).toBe(2_510_000);
    expect(next.state.cash).toBe(9_490_000);
    expect(next.state.reserved).toBe(6_540_000);
    expect(next.state.drivers.map(driver => driver.id)).toEqual(state.drivers.map(driver => driver.id));
    expect(next.state.drivers.find(driver => driver.id === outgoingId)!.contract).toBeNull();
    expect(next.state.drivers.find(driver => driver.id === incomingId)!.contract).toEqual({ teamId: state.teamId, years: 1, startsSeason: 1, wagePerRace: 175_000 });
    expect(next.state.drivers.find(driver => driver.id === retainedId)).toEqual(state.drivers.find(driver => driver.id === retainedId));
    expect(next.state.drivers.filter(driver => driver.contract)).toHaveLength(20);
    expect(next.state.drivers.filter(driver => !driver.contract)).toHaveLength(6);
  });

  it('GP_MARKET_NEW_WAGES: actual new wages determine remaining reserve and the next settlement', () => {
    const { state, outgoingId, incomingId } = fixture();
    quote(state, outgoingId, incomingId);
    const signed = move(state, signAction(outgoingId, incomingId)).state;
    const finished = race(signed);
    expect(finished.results[0].operatingCost).toBe(545_000);
    expect(finished.reserved).toBe(5_995_000);
    expect(finished.cash).toBe(9_490_000 + finished.results[0].teamPrize - 545_000);
    expect(finished.results[0].classification.some(row => row.driverId === outgoingId)).toBe(false);
    expect(finished.results[0].classification.some(row => row.driverId === incomingId && row.teamId === state.teamId)).toBe(true);
  });

  it('GP_MARKET_BUYOUT: prices actual unserved seasons and does not erase a future-start deal', () => {
    for (const [years, buyout] of [[1, 1_080_000], [2, 2_160_000], [3, 3_240_000]]) {
      const { state, outgoingId, incomingId } = fixture(years);
      expect(quote(state, outgoingId, incomingId).buyout).toBe(buyout);
    }
    const { state, outgoingId, incomingId } = fixture(1);
    const ended = review(state);
    expect(quote(ended, outgoingId, incomingId).buyout).toBe(0);
    const signed = move(ended, signAction(outgoingId, incomingId)).state;
    const otherFree = signed.drivers.find(driver => driver.contract === null && driver.id !== outgoingId)!;
    expect(quote(signed, incomingId, otherFree.id).buyout).toBe(1_050_000);
  });

  it('GP_MARKET_FUNDS: exact committed-money boundary passes and one euro short holds the old save', () => {
    const exact = fixture(2, 9_050_000);
    expect(quote(exact.state, exact.outgoingId, exact.incomingId).affordable).toBe(true);
    const signed = move(exact.state, signAction(exact.outgoingId, exact.incomingId)).state;
    expect(signed.cash).toBe(6_540_000);
    expect(signed.reserved).toBe(6_540_000);
    const short = fixture(2, 9_049_999);
    expect(quote(short.state, short.outgoingId, short.incomingId).affordable).toBe(false);
    refused(short.state, signAction(short.outgoingId, short.incomingId), 'funds');

    // A rich legacy deal is genuinely paid for twelve races before review affordability is tested.
    const rich = fixture(1, 50_000_000);
    const raw = clone(rich.state);
    own(raw)[1].contract!.wagePerRace = 1_000_000;
    raw.reserved = 17_160_000;
    delete raw.marketOffers;
    delete raw.nextSeasonPlan;
    const played = review(read(raw));
    const atBoundary = clone(played);
    atBoundary.cash = 5_450_000;
    delete atBoundary.marketOffers;
    delete atBoundary.nextSeasonPlan;
    const reviewExact = read(atBoundary);
    expect(reviewExact.reserved).toBe(0);
    expect(quote(reviewExact, rich.outgoingId, rich.incomingId)).toMatchObject({
      totalFee: 350_000, reserveAfter: 17_100_000, affordable: true,
    });
    const signedReview = move(reviewExact, signAction(rich.outgoingId, rich.incomingId)).state;
    expect(signedReview.cash).toBe(5_100_000);
    expect(signedReview.reserved).toBe(0);
    expect(signedReview.nextSeasonPlan).toMatchObject({
      sponsor: 12_000_000, totalRenewalFee: 0, nextReserved: 17_100_000, cashAfter: 17_100_000, affordable: true,
    });
    const belowBoundary = clone(atBoundary);
    belowBoundary.cash -= 1;
    const reviewShort = read(belowBoundary);
    expect(quote(reviewShort, rich.outgoingId, rich.incomingId).affordable).toBe(false);
    refused(reviewShort, signAction(rich.outgoingId, rich.incomingId), 'funds');
  });

  it('GP_MARKET_REROUND: review hiring starts next season and preserves actual settled employers', () => {
    const { state, outgoingId, incomingId, retainedId } = fixture(1);
    const raw = clone(state);
    own(raw)[1].contract!.years = 1;
    delete raw.marketOffers;
    delete raw.nextSeasonPlan;
    const ended = review(read(raw));
    expect(quote(ended, outgoingId, incomingId)).toMatchObject({
      startsSeason: 2, totalFee: 350_000, reserveAfter: 7_020_000, affordable: true,
    });
    const settled = JSON.stringify({ results: ended.results, race: ended.race, drivers: ended.driverStandings, teams: ended.constructorStandings });
    const signed = move(ended, signAction(outgoingId, incomingId)).state;
    expect(signed.drivers.find(driver => driver.id === incomingId)!.contract).toMatchObject({ years: 1, startsSeason: 2, wagePerRace: 175_000 });
    expect(signed.reserved).toBe(0);
    expect(signed.nextSeasonPlan).toMatchObject({
      sponsor: 12_000_000, totalRenewalFee: 320_000, nextReserved: 7_020_000,
      cashAfter: signed.cash + 12_000_000 - 320_000, affordable: true,
      automaticRenewals: [expect.objectContaining({ driverId: retainedId, wagePerRace: 160_000, signingFee: 320_000 })],
    });
    expect(JSON.stringify({ results: signed.results, race: signed.race, drivers: signed.driverStandings, teams: signed.constructorStandings })).toBe(settled);
    expect(read(clone(signed))).toEqual(signed);
  });

  it('GP_MARKET_RENEW: renews an expiring seat for next year and refuses another renewal fee', () => {
    const { state, outgoingId } = fixture(1);
    const ended = review(state);
    expect(quote(ended, outgoingId, outgoingId)).toMatchObject({ years: 1, startsSeason: 2, wagePerRace: 160_000, signingFee: 320_000, buyout: 0, totalFee: 320_000 });
    const renewed = move(ended, { type: 'renewDriver', driverId: outgoingId });
    expect(renewed.state.cash).toBe(ended.cash - 320_000);
    expect(renewed.state.drivers.find(driver => driver.id === outgoingId)!.contract).toEqual({ teamId: state.teamId, years: 1, startsSeason: 2, wagePerRace: 160_000 });
    refused(renewed.state, { type: 'renewDriver', driverId: outgoingId }, 'invalid');
  });

  it('GP_MARKET_EXCLUSIVITY: foreign duplicate missing and nonowned identities cannot take a seat', () => {
    const { state, outgoingId, incomingId } = fixture();
    quote(state, outgoingId, incomingId);
    const foreign = state.drivers.find(driver => driver.contract && driver.contract.teamId !== state.teamId)!;
    for (const action of [signAction(outgoingId, foreign.id), signAction(outgoingId, outgoingId), signAction(incomingId, outgoingId), signAction(outgoingId, 'missing-driver'), { type: 'signDriver', outgoingDriverId: outgoingId }]) refused(state, action, 'invalid');
    expect(own(state)).toHaveLength(2);
  });

  it('GP_MARKET_WINDOWS: later rounds grids races and intermediate results refuse market phase', () => {
    const { state, outgoingId, incomingId } = fixture();
    const grid = move(state, { type: 'qualify' }).state;
    const active = move(grid, { type: 'startRace', setups: own(grid).map(driver => ({ driverId: driver.id, pace: 'balanced', compound: 'medium' })) }).state;
    const ended = race(state);
    const later = move(ended, { type: 'continue' }).state;
    for (const closed of [grid, active, ended, later]) {
      refused(closed, signAction(outgoingId, incomingId), 'phase');
      expect(offers(closed)).toEqual([]);
    }
  });

  it('GP_MARKET_REPLAY: stale repeats refuse and returning a driver to market creates no cash', () => {
    const { state, outgoingId, incomingId } = fixture();
    quote(state, outgoingId, incomingId);
    const action = { ...signAction(outgoingId, incomingId), expectedRevision: state.revision };
    const signed = move(state, signAction(outgoingId, incomingId)).state;
    const before = JSON.stringify(signed);
    expect(engine.applyAction(signed, action)).toEqual({ ok: false, reason: 'stale' });
    expect(JSON.stringify(signed)).toBe(before);
    const returnQuote = quote(signed, incomingId, outgoingId);
    expect(returnQuote.totalFee).toBe(1_370_000);
    const returned = move(signed, signAction(incomingId, outgoingId)).state;
    expect(returned.cash).toBe(8_120_000);
    expect(returned.cash).toBeLessThan(state.cash);
    expect(returned.drivers.filter(driver => driver.contract)).toHaveLength(20);
    expect(own(returned)).toHaveLength(2);
  });

  it('GP_MARKET_SAVE: derives old fields and rejects hostile saved quotes and contract timing', () => {
    const { state, outgoingId, incomingId } = fixture();
    const shown = quote(state, outgoingId, incomingId);
    const signed = move(state, signAction(outgoingId, incomingId)).state;
    expect(read(clone(signed))).toEqual(signed);
    const legacy = clone(state);
    delete legacy.marketOffers;
    delete legacy.nextSeasonPlan;
    for (const driver of legacy.drivers) if (driver.contract) delete driver.contract.startsSeason;
    const legacyTerms = legacy.drivers.filter(driver => driver.contract).map(driver => ({
      driverId: driver.id, years: driver.contract!.years, wagePerRace: driver.contract!.wagePerRace,
    }));
    const loadedLegacy = read(legacy);
    expect(loadedLegacy.drivers.filter(driver => driver.contract).map(driver => ({
      driverId: driver.id, years: driver.contract!.years, wagePerRace: driver.contract!.wagePerRace,
    })), 'GP_MARKET_LEGACY_TERMS_MUST_NOT_BE_REPRICED').toEqual(legacyTerms);
    for (const driver of loadedLegacy.drivers) if (driver.contract) {
      expect(driver.contract.startsSeason, 'GP_MARKET_ABSENT_LEGACY_TIMING_MUST_NORMALIZE_TO_ACTIVE_CURRENT_SEASON').toBe(legacy.season);
    }
    expect(quote(loadedLegacy, outgoingId, incomingId)).toEqual(shown);
    const cheap = clone(state);
    cheap.marketOffers![0].totalFee = 0;
    const stale = clone(state);
    stale.marketOffers![0].wagePerRace += 1_000;
    const timing = clone(signed);
    timing.drivers.find(driver => driver.id === incomingId)!.contract!.startsSeason = 0;
    const future = clone(signed);
    future.drivers.find(driver => driver.id === incomingId)!.contract!.startsSeason = 2;
    const emptySeat = clone(signed);
    emptySeat.drivers.find(driver => driver.id === incomingId)!.contract = null;
    const malformedTiming = [null, '1', 1.5].map(value => {
      const raw = clone(signed);
      raw.drivers.find(driver => driver.id === incomingId)!.contract!.startsSeason = value as unknown as number;
      return raw;
    });
    for (const raw of [cheap, stale, timing, future, emptySeat, ...malformedTiming]) {
      const before = JSON.stringify(raw);
      expect(engine.validateSavedCareer(raw)).toEqual({ ok: false, reason: 'invalid' });
      expect(JSON.stringify(raw)).toBe(before);
    }
    const reviewFixture = fixture(1);
    const ended = review(reviewFixture.state);
    expect(ended.nextSeasonPlan).toMatchObject({ nextSeason: 2, sponsor: 12_000_000, totalRenewalFee: 320_000 });
    const cheapPlan = clone(ended);
    (cheapPlan.nextSeasonPlan as Record<string, unknown>).totalRenewalFee = 0;
    const shortReserve = clone(ended);
    (shortReserve.nextSeasonPlan as Record<string, unknown>).nextReserved = -1;
    const freeCash = clone(ended);
    (freeCash.nextSeasonPlan as Record<string, unknown>).cashAfter = ended.cash + 24_000_000;
    const emptyPlan = clone(ended);
    emptyPlan.nextSeasonPlan = null;
    const earlyPlan = clone(state);
    earlyPlan.nextSeasonPlan = clone(ended.nextSeasonPlan);
    for (const raw of [cheapPlan, shortReserve, freeCash, emptyPlan, earlyPlan]) {
      const before = JSON.stringify(raw);
      expect(engine.validateSavedCareer(raw), 'GP_MARKET_STORED_PLAN_MUST_MATCH_ACTUAL_OBLIGATIONS').toEqual({ ok: false, reason: 'invalid' });
      expect(JSON.stringify(raw)).toBe(before);
    }
  });

  it('GP_MARKET_HOLDS: no market action preserves the actual qualified seed-one race outcome', () => {
    const finished = race(engine.createCareer(1));
    // Literal result captured from admitted run 41400272528 measurement, natural seed 1 aware arm.
    expect(finished.results[0].classification.map(row => row.driverId)).toEqual([0, 2, 4, 3, 1, 5, 7, 6, 8, 9, 10, 13, 11, 14, 15, 16, 17, 18, 19, 12].map(index => 'gp-driver-' + index));
    expect(finished.results[0].classification.map(row => row.points)).toEqual([25, 18, 15, 12, 10, 8, 6, 4, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(finished.results[0].classification.map(row => row.status)).toEqual([...Array(19).fill('finished'), 'retired']);
    expect(finished.results[0].operatingCost).toBe(550_000);
    expect(finished.results[0].teamPrize).toBe(50_000);
    expect(finished.cash).toBe(11_500_000);
    expect(finished.reserved).toBe(6_050_000);
    const entries = finished.race!.entries;
    expect(entries.find(row => row.driverId === 'gp-driver-13')).toMatchObject({ elapsedMs: 2_764_942, completedLaps: 40, status: 'finished' });
    expect(entries.find(row => row.driverId === 'gp-driver-12')).toMatchObject({ elapsedMs: 2_720_047, completedLaps: 39, status: 'retired' });
  });
});
