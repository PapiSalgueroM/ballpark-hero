import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import type { CarArea, GrandPrixCareer, GrandPrixOrder } from '@/lib/grandPrixBoss';

type Focus = 'balanced' | 'pace' | 'consistency' | 'tyreCare' | 'wet';
type Driver = GrandPrixCareer['drivers'][number] & { focus?: Focus };
type Team = GrandPrixCareer['teams'][number] & { baselineCar?: Record<CarArea, number> };
type Replacement = { departingDriverId: string; rookie: Driver; signingFee: number };
type Plan = NonNullable<GrandPrixCareer['nextSeasonPlan']> & { seatReplacements?: Replacement[]; totalReplacementFee?: number };
type Career = Omit<GrandPrixCareer, 'drivers' | 'teams' | 'nextSeasonPlan'> & { drivers: Driver[]; teams: Team[]; nextSeasonPlan: Plan | null };
type Receipt = { revision: number; cost?: number; sponsor?: number; renewalFee?: number; replacementFee?: number; cashDelta?: number };
type Api = {
  createCareer(seed: number): Career;
  applyAction(state: Career, action: Record<string, unknown>): { ok: true; state: Career; receipt: Receipt } | { ok: false; reason: string };
  validateSavedCareer(raw: unknown): { ok: true; state: Career } | { ok: false; reason: string };
};
const ENGINE_PATH = process.env.GP_BOSS_ENGINE_FILE ? path.resolve(process.env.GP_BOSS_ENGINE_FILE) : path.resolve(process.cwd(), 'src/lib/grandPrixBoss.ts');
let engine: Api;
beforeAll(async () => { engine = await import(/* @vite-ignore */ pathToFileURL(ENGINE_PATH).href) as Api; });
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const skills = ['pace', 'consistency', 'tyreCare', 'wet'] as const;
const areas: CarArea[] = ['power', 'aero', 'reliability'];
const own = (state: Career) => state.drivers.filter(driver => driver.contract?.teamId === state.teamId);
const team = (state: Career) => state.teams.find(held => held.id === state.teamId)!;
function read(raw: Career): Career {
  const before = JSON.stringify(raw), result = engine.validateSavedCareer(raw);
  expect(JSON.stringify(raw), 'GP_LIFECYCLE_READER_MUST_HOLD_RAW').toBe(before);
  expect(result.ok, 'GP_LIFECYCLE_REAL_FIXTURE_MUST_LOAD').toBe(true);
  if (result.ok === false) throw new Error('Unreachable refused real lifecycle fixture');
  return result.state;
}
function move(state: Career, action: Record<string, unknown>) {
  const before = JSON.stringify(state), result = engine.applyAction(state, { ...action, expectedRevision: state.revision });
  expect(JSON.stringify(state), 'GP_LIFECYCLE_ACTION_MUST_HOLD_PRIOR').toBe(before);
  expect(result.ok, action.type === 'setDriverFocus' ? 'GP_FOCUS_ACTION_MISSING' : 'GP_LIFECYCLE_LEGAL_ACTION_REFUSED:' + action.type).toBe(true);
  if (result.ok === false) throw new Error('Unreachable refused lifecycle action');
  expect(result.state.revision).toBe(state.revision + 1); expect(result.receipt.revision).toBe(result.state.revision);
  read(result.state);
  return result;
}
function stripLegacyMetadata(raw: Career) {
  for (const driver of raw.drivers) delete driver.focus;
  for (const held of raw.teams) delete held.baselineCar;
  delete (raw as Partial<Career>).marketOffers;
  delete (raw as Partial<Career>).nextSeasonPlan;
}
function lab(change: (state: Career) => void = () => {}) {
  const raw = clone(engine.createCareer(291));
  for (const driver of own(raw)) {
    driver.age = 25; driver.potential = 80;
    driver.skills = { pace: 60, consistency: 60, tyreCare: 60, wet: 60 };
    driver.contract!.years = 2;
  }
  change(raw);
  stripLegacyMetadata(raw);
  return read(raw);
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
function review(initial: Career) {
  let state = initial;
  while (state.phase !== 'seasonReview') {
    state = race(state);
    if (state.phase === 'raceResult') state = move(state, { type: 'continue' }).state;
  }
  expect(state.results).toHaveLength(12);
  expect(state.nextSeasonPlan?.affordable, 'GP_LIFECYCLE_REAL_PLAN_MUST_BE_FUNDED').toBe(true);
  return state;
}
const next = (state: Career) => move(state, { type: 'startNextSeason' });
function replacements(state: Career) {
  const plan = state.nextSeasonPlan;
  expect(Array.isArray(plan?.seatReplacements), 'GP_RETIREMENT_PLAN_MISSING').toBe(true);
  expect(typeof plan!.totalReplacementFee, 'GP_REPLACEMENT_TOTAL_MISSING').toBe('number');
  return { plan: plan!, rows: plan!.seatReplacements! };
}
function retiringLab() {
  return lab(state => {
    for (const driver of own(state)) { driver.age = 39; driver.contract!.years = 1; }
    state.drivers.find(driver => driver.contract === null)!.age = 39;
    const foreign = state.drivers.find(driver => driver.contract && driver.contract.teamId !== state.teamId)!;
    foreign.age = 39; foreign.contract!.years = 1;
  });
}
function refuse(state: Career, action: Record<string, unknown>, reason: string, marker: string) {
  const before = JSON.stringify(state);
  expect(engine.applyAction(state, { expectedRevision: state.revision, ...action }), marker).toEqual({ ok: false, reason });
  expect(JSON.stringify(state)).toBe(before);
}

describe('Grand Prix Boss lifecycle C', { timeout: 180000 }, () => {
  it('GP_LIFECYCLE_METADATA: exposes saved focuses and original baselines without moving the initial world', () => {
    const state = engine.createCareer(291);
    expect(state.drivers.every(driver => driver.focus === 'balanced'), 'GP_LIFECYCLE_FOCUS_METADATA_MISSING').toBe(true);
    expect(state.drivers).toHaveLength(26); expect(state.teams).toHaveLength(10);
    for (const held of state.teams) {
      expect(held.baselineCar, 'GP_LIFECYCLE_BASELINE_METADATA_MISSING').toEqual(held.car);
      expect(held.baselineCar).not.toBe(held.car);
    }
    expect(state.phase).toBe('preRace'); expect(state.season).toBe(1); expect(state.round).toBe(0);
    expect(state.cash).toBe(12_000_000); expect(state.results).toEqual([]); read(state);
  });

  it('GP_LIFECYCLE_FOCUS: saves a free owned focus change through the existing action door', () => {
    const state = engine.createCareer(291), id = own(state)[0].id;
    const changed = move(state, { type: 'setDriverFocus', driverId: id, focus: 'pace' });
    expect(changed.receipt).toEqual({ type: 'setDriverFocus', revision: state.revision + 1 });
    expect(changed.state.drivers.find(driver => driver.id === id)!.focus).toBe('pace');
    const projected = clone(changed.state); projected.revision = state.revision;
    projected.drivers.find(driver => driver.id === id)!.focus = 'balanced';
    expect(projected).toEqual(state);
    expect(read(clone(changed.state))).toEqual(changed.state);
    refuse(changed.state, { type: 'setDriverFocus', driverId: id, focus: 'pace' }, 'invalid', 'GP_FOCUS_SAME_VALUE_MUST_REFUSE');
    refuse(changed.state, { type: 'setDriverFocus', driverId: id, focus: 'wet', expectedRevision: state.revision }, 'stale', 'GP_FOCUS_STALE_MUST_REFUSE');
  });

  it('GP_LIFECYCLE_FOCUS_WINDOWS: refuses foreign malformed and active-round requests but permits review', () => {
    const state = engine.createCareer(291), id = own(state)[0].id;
    const foreignId = state.drivers.find(driver => driver.contract?.teamId !== state.teamId)!.id;
    refuse(state, { type: 'setDriverFocus', driverId: foreignId, focus: 'pace' }, 'invalid', 'GP_FOCUS_FOREIGN_MUST_REFUSE');
    refuse(state, { type: 'setDriverFocus', driverId: 'missing-driver', focus: 'pace' }, 'invalid', 'GP_FOCUS_MISSING_DRIVER_MUST_REFUSE');
    for (const focus of [null, 3, 'unknown']) refuse(state, { type: 'setDriverFocus', driverId: id, focus }, 'invalid', 'GP_FOCUS_BAD_VALUE_MUST_REFUSE');
    const grid = move(state, { type: 'qualify' }).state;
    refuse(grid, { type: 'setDriverFocus', driverId: id, focus: 'wet' }, 'phase', 'GP_FOCUS_PHASE_GUARD_MISSING');
    const roundTwo = move(race(state), { type: 'continue' }).state;
    refuse(roundTwo, { type: 'setDriverFocus', driverId: id, focus: 'wet' }, 'phase', 'GP_FOCUS_MIDSEASON_MUST_REFUSE');
    const complete = review(state);
    const edited = move(complete, { type: 'setDriverFocus', driverId: id, focus: 'consistency' }).state;
    expect(edited.drivers.find(driver => driver.id === id)!.focus).toBe('consistency');
    expect(edited.cash).toBe(complete.cash); expect(edited.results).toEqual(complete.results);
  });

  it('GP_LIFECYCLE_YOUTH: a focused next-age26 year differs from balanced growth on the same world', () => {
    let state = lab(raw => { own(raw)[0].contract!.years = 1; }), [balanced, focused] = own(state);
    state = move(state, { type: 'setDriverFocus', driverId: focused.id, focus: 'pace' }).state;
    const completed = review(state);
    expect(completed.nextSeasonPlan!.automaticRenewals).toContainEqual({ driverId: balanced.id, wagePerRace: 160_000, signingFee: 320_000 });
    const advanced = next(completed).state;
    const first = advanced.drivers.find(driver => driver.id === balanced.id)!, second = advanced.drivers.find(driver => driver.id === focused.id)!;
    expect(first.age, 'GP_YOUTH_AGE_MISSING').toBe(26); expect(second.age).toBe(26);
    expect(first.contract!.wagePerRace, 'GP_YOUTH_RENEWAL_MUST_KEEP_PRE_GROWTH_QUOTE').toBe(160_000);
    expect(first.skills).toEqual({ pace: 61, consistency: 61, tyreCare: 61, wet: 61 });
    expect(second.skills).toEqual({ pace: 63, consistency: 60, tyreCare: 60, wet: 60 });
    expect(second.focus).toBe('pace'); expect(completed.drivers.find(driver => driver.id === focused.id)!.skills.pace).toBe(60);
  });

  it('GP_LIFECYCLE_PEAK: next-age27 uses one weakest or selected skill with stable ties', () => {
    let state = lab(raw => { for (const driver of own(raw)) { driver.age = 26; driver.skills = { pace: 60, consistency: 60, tyreCare: 70, wet: 70 }; } });
    const [balanced, focused] = own(state);
    state = move(state, { type: 'setDriverFocus', driverId: focused.id, focus: 'wet' }).state;
    const advanced = next(review(state)).state;
    expect(advanced.drivers.find(driver => driver.id === balanced.id)!.skills).toEqual({ pace: 61, consistency: 60, tyreCare: 70, wet: 70 });
    expect(advanced.drivers.find(driver => driver.id === focused.id)!.skills).toEqual({ pace: 60, consistency: 60, tyreCare: 70, wet: 71 });
    expect(own(advanced).every(driver => driver.age === 27)).toBe(true);
  });

  it('GP_LIFECYCLE_VETERAN: next-age33 loses pace unless a pace focus preserves it', () => {
    let state = lab(raw => { for (const driver of own(raw)) driver.age = 32; });
    const [balanced, focused] = own(state);
    state = move(state, { type: 'setDriverFocus', driverId: focused.id, focus: 'pace' }).state;
    const advanced = next(review(state)).state;
    expect(advanced.drivers.find(driver => driver.id === balanced.id)!.skills).toEqual({ pace: 59, consistency: 60, tyreCare: 60, wet: 60 });
    expect(advanced.drivers.find(driver => driver.id === focused.id)!.skills).toEqual({ pace: 60, consistency: 60, tyreCare: 60, wet: 60 });
    expect(own(advanced).every(driver => driver.age === 33)).toBe(true);
  });

  it('GP_LIFECYCLE_POTENTIAL: grows only below potential and keeps older above-potential skills', () => {
    let state = lab(raw => {
      const [first, second] = own(raw); first.potential = 65; second.potential = 65;
      first.skills = { pace: 90, consistency: 64, tyreCare: 64, wet: 64 };
      second.skills = { pace: 64, consistency: 64, tyreCare: 64, wet: 64 };
    });
    const [balanced, focused] = own(state);
    state = move(state, { type: 'setDriverFocus', driverId: focused.id, focus: 'pace' }).state;
    const advanced = next(review(state)).state;
    expect(advanced.drivers.find(driver => driver.id === balanced.id)!.skills).toEqual({ pace: 90, consistency: 65, tyreCare: 65, wet: 65 });
    expect(advanced.drivers.find(driver => driver.id === focused.id)!.skills).toEqual({ pace: 65, consistency: 64, tyreCare: 64, wet: 64 });
    for (const driver of advanced.drivers) for (const skill of skills) expect(Number.isInteger(driver.skills[skill]) && driver.skills[skill] >= 0 && driver.skills[skill] <= 100).toBe(true);
  });

  it('GP_LIFECYCLE_ONCE: age development cash and history settle once and survive reload', () => {
    const completed = review(lab()), id = own(completed)[0].id, before = JSON.stringify(completed);
    const advanced = next(completed).state;
    expect(advanced.drivers.find(driver => driver.id === id)!.age, 'GP_LIFECYCLE_AGE_NOT_SETTLED').toBe(26);
    expect(JSON.stringify(completed)).toBe(before);
    const loaded = read(clone(advanced)); expect(loaded).toEqual(advanced);
    refuse(loaded, { type: 'startNextSeason', expectedRevision: completed.revision }, 'stale', 'GP_LIFECYCLE_OLD_REVISION_REPLAY');
    refuse(loaded, { type: 'startNextSeason' }, 'phase', 'GP_LIFECYCLE_DUPLICATE_YEAR');
    expect(read(clone(loaded))).toEqual(advanced);
  });

  it('GP_LIFECYCLE_RETIRE: quotes two retiring seats once and preserves their actual archived identities', () => {
    const completed = review(retiringLab()), { plan, rows } = replacements(completed);
    const old = own(completed), oldIds = old.map(driver => driver.id), oldSnapshot = JSON.stringify(completed);
    expect(rows).toHaveLength(2); expect(rows.map(row => row.departingDriverId).sort()).toEqual(oldIds.slice().sort());
    expect(plan.automaticRenewals).toEqual([]);
    const total = rows.reduce((sum, row) => sum + row.signingFee, 0);
    expect(plan.totalReplacementFee).toBe(total); expect(plan.totalRenewalFee).toBe(0);
    for (const row of rows) {
      expect(row.rookie.age >= 18 && row.rookie.age <= 21).toBe(true); expect(row.rookie.focus).toBe('balanced');
      expect(row.rookie.id.length).toBeLessThanOrEqual(128);
      const wage = Math.round((70_000 + row.rookie.skills.pace * 1_500) / 1_000) * 1_000;
      expect(row.rookie.contract).toEqual({ teamId: completed.teamId, years: 1, startsSeason: completed.season + 1, wagePerRace: wage });
      expect(row.signingFee).toBe(wage * 2);
    }
    const reserve = rows.reduce((sum, row) => sum + row.rookie.contract!.wagePerRace, 0) * 12 + completed.calendar.reduce((sum, track) => sum + track.entryCost, 0);
    expect(plan.nextReserved).toBe(reserve); expect(plan.cashAfter).toBe(completed.cash + plan.sponsor - total);
    const result = next(completed), advanced = result.state;
    expect(JSON.stringify(completed)).toBe(oldSnapshot);
    expect(result.receipt).toEqual({ type: 'startNextSeason', sponsor: plan.sponsor, renewalFee: 0, replacementFee: total, cashDelta: plan.cashAfter - completed.cash, revision: completed.revision + 1 });
    expect(advanced.cash).toBe(plan.cashAfter); expect(advanced.reserved).toBe(reserve);
    for (const row of rows) expect(advanced.drivers.find(driver => driver.id === row.rookie.id)).toEqual(row.rookie);
    expect(advanced.drivers).toHaveLength(26); expect(new Set(advanced.drivers.map(driver => driver.id)).size).toBe(26);
    expect(advanced.drivers.filter(driver => driver.contract)).toHaveLength(20); expect(own(advanced)).toHaveLength(2);
    const retiredIds = completed.drivers.filter(driver => driver.age + 1 >= 40 && (!driver.contract || driver.contract.years === 1)).map(driver => driver.id);
    expect(retiredIds.length).toBeGreaterThanOrEqual(4);
    for (const id of retiredIds) expect(advanced.drivers.some(driver => driver.id === id)).toBe(false);
    expect(new Set(advanced.driverStandings.map(row => row.driverId))).toEqual(new Set(advanced.drivers.map(driver => driver.id)));
    const archived = advanced.history[0];
    expect(archived.team.drivers.map(driver => driver.driverId).sort()).toEqual(oldIds.slice().sort());
    expect(archived.races.every(held => held.drivers.every(driver => oldIds.includes(driver.driverId)))).toBe(true);
    expect(read(clone(advanced)).history).toEqual(advanced.history);
  });

  it('GP_LIFECYCLE_PAID: honors old multi-year and future prepaid terms beyond the old age ceiling', () => {
    let completed = review(lab());
    const raw = clone(completed), [first, second] = own(raw);
    first.age = 50; first.contract!.years = 3;
    second.age = 50; second.contract!.years = 1; second.contract!.startsSeason = raw.season + 1;
    stripLegacyMetadata(raw); completed = read(raw);
    const plan = completed.nextSeasonPlan!, advanced = next(completed).state;
    const retainedFirst = advanced.drivers.find(driver => driver.id === first.id)!, retainedSecond = advanced.drivers.find(driver => driver.id === second.id)!;
    expect(retainedFirst, 'GP_PAID_MULTIYEAR_DRIVER_MUST_REMAIN').toBeDefined();
    expect(retainedSecond, 'GP_PAID_FUTURE_DRIVER_MUST_REMAIN').toBeDefined();
    expect(retainedFirst.age, 'GP_PAID_OLD_CONTRACT_AGE_NOT_ADVANCED').toBe(51); expect(retainedSecond.age).toBe(51);
    expect(retainedFirst.contract).toEqual({ ...first.contract, years: 2 }); expect(retainedSecond.contract).toEqual(second.contract);
    expect(replacements(completed).rows).toEqual([]); expect(plan.totalRenewalFee).toBe(0); expect(plan.totalReplacementFee).toBe(0);
    expect(advanced.cash).toBe(plan.cashAfter); expect(read(clone(advanced))).toEqual(advanced);
  });

  it('GP_LIFECYCLE_MARKET: removes retirement review offers while allowing a below40 current-year hire', () => {
    const initial = lab(raw => { own(raw)[0].age = 39; own(raw)[0].contract!.years = 1; raw.drivers.find(driver => driver.contract === null)!.age = 39; });
    const availableId = initial.drivers.find(driver => driver.contract === null)!.id, outgoingId = own(initial)[0].id;
    expect(initial.marketOffers.some(offer => offer.incomingDriverId === availableId)).toBe(true);
    const completed = review(initial);
    expect(completed.marketOffers.some(offer => offer.incomingDriverId === availableId), 'GP_RETIRING_FREE_AGENT_OFFER_MUST_BE_ABSENT').toBe(false);
    expect(completed.marketOffers.some(offer => offer.incomingDriverId === outgoingId && offer.outgoingDriverId === outgoingId)).toBe(false);
    refuse(completed, { type: 'renewDriver', driverId: outgoingId }, 'invalid', 'GP_RETIRING_RENEWAL_MUST_REFUSE');
    const preserved = clone(completed), future = own(preserved)[0]; future.contract!.startsSeason = preserved.season + 1;
    stripLegacyMetadata(preserved); const paid = read(preserved);
    expect(paid.drivers.find(driver => driver.id === future.id)!.contract).toEqual(future.contract);
  });

  it('GP_LIFECYCLE_CARRY: archives the paid old car then carries a positive part rather than all progress', () => {
    let state = engine.createCareer(291); const baseline = clone(team(state).car);
    state = move(state, { type: 'upgrade', area: 'power' }).state;
    state = move(state, { type: 'upgrade', area: 'power' }).state;
    const completed = review(state), full = clone(team(completed).car), advanced = next(completed).state;
    expect(full.power).toBeGreaterThan(baseline.power);
    expect(team(advanced).car.power, 'GP_PARTIAL_CARRY_MISSING').toBeLessThan(full.power);
    expect(team(advanced).car.power).toBeGreaterThan(baseline.power);
    expect(team(advanced).baselineCar).toEqual(baseline);
    expect(advanced.history[0].finalCar).toEqual(full);
    expect(completed.teams.find(held => held.id === completed.teamId)!.car).toEqual(full);
    expect(advanced.cash).toBe(completed.nextSeasonPlan!.cashAfter);
  });

  it('GP_LIFECYCLE_AI: foreign investment changes real qualifying clocks without charging owned cash', () => {
    const completed = review(lab()), advanced = next(completed).state;
    const before = completed.teams.filter(held => held.id !== completed.teamId);
    const after = advanced.teams.filter(held => held.id !== advanced.teamId);
    const sum = (teams: Team[]) => teams.reduce((total, held) => total + areas.reduce((n, area) => n + held.car[area], 0), 0);
    expect(sum(after), 'GP_AI_CAR_INVESTMENT_MISSING').toBeGreaterThan(sum(before));
    expect(advanced.cash).toBe(completed.nextSeasonPlan!.cashAfter);
    const counterfactual = clone(advanced);
    for (const held of counterfactual.teams) if (held.id !== counterfactual.teamId) held.car = clone(before.find(prior => prior.id === held.id)!.car);
    const admitted = read(counterfactual);
    const actualGrid = move(advanced, { type: 'qualify' }).state.race!.grid;
    const oldGrid = move(admitted, { type: 'qualify' }).state.race!.grid;
    const foreignIds = new Set(advanced.drivers.filter(driver => driver.contract && driver.contract.teamId !== advanced.teamId).map(driver => driver.id));
    const clock = (grid: typeof actualGrid) => grid.filter(row => foreignIds.has(row.driverId)).reduce((total, row) => total + row.timeMs, 0);
    expect(clock(actualGrid), 'GP_AI_INVESTMENT_MUST_REACH_ACTUAL_CLOCK').toBeLessThan(clock(oldGrid));
    for (const held of advanced.teams) for (const area of areas) expect(Number.isInteger(held.car[area]) && held.car[area] >= 0 && held.car[area] <= 100).toBe(true);
  });

  it('GP_LIFECYCLE_SAVE: normalizes only the complete old metadata boundary and preserves every old field', () => {
    const raw = clone(engine.createCareer(291)); stripLegacyMetadata(raw);
    const before = JSON.stringify(raw), loaded = read(raw);
    expect(loaded.drivers.every(driver => driver.focus === 'balanced'), 'GP_LEGACY_LIFECYCLE_NORMALIZATION_MISSING').toBe(true);
    const projected = clone(loaded); stripLegacyMetadata(projected);
    expect(projected).toEqual(raw); expect(JSON.stringify(raw)).toBe(before);
    const malformed: Career[] = [];
    const missingHistory = clone(loaded); delete (missingHistory as Partial<Career>).history; malformed.push(missingHistory);
    const missingTotals = clone(loaded); delete (missingTotals as Partial<Career>).careerTotals; malformed.push(missingTotals);
    const missingLedger = clone(loaded); delete (missingLedger as Partial<Career>).history; delete (missingLedger as Partial<Career>).careerTotals; malformed.push(missingLedger);
    const oneMissing = clone(loaded); delete oneMissing.drivers[0].focus; malformed.push(oneMissing);
    const oneBaselineMissing = clone(loaded); delete oneBaselineMissing.teams[0].baselineCar; malformed.push(oneBaselineMissing);
    const badFocus = clone(loaded); (badFocus.drivers[0] as unknown as { focus: unknown }).focus = 'unknown'; malformed.push(badFocus);
    const badCar = clone(loaded); badCar.teams[0].baselineCar!.power = 101; malformed.push(badCar);
    const giftedFloor = clone(loaded); giftedFloor.teams[0].baselineCar!.power = giftedFloor.teams[0].car.power + 1; malformed.push(giftedFloor);
    const forgedOldQuote = clone(raw); forgedOldQuote.marketOffers = clone(loaded.marketOffers); forgedOldQuote.marketOffers[0].totalFee += 1; malformed.push(forgedOldQuote);
    for (const copied of malformed) {
      const bytes = JSON.stringify(copied);
      expect(engine.validateSavedCareer(copied), 'GP_BAD_LIFECYCLE_SAVE_ACCEPTED').toEqual({ ok: false, reason: 'invalid' });
      expect(JSON.stringify(copied)).toBe(bytes);
    }
    expect(read(clone(loaded))).toEqual(loaded);
  });

  it('GP_LIFECYCLE_PLAN: reloads the same rookie transaction and refuses forged supplied prices or people', () => {
    const completed = review(retiringLab()), { plan } = replacements(completed);
    const focused = move(completed, { type: 'setDriverFocus', driverId: own(completed)[0].id, focus: 'pace' }).state;
    expect(focused.nextSeasonPlan, 'GP_REVIEW_FOCUS_MUST_NOT_REROLL_ROOKIES').toEqual(plan);
    const reloaded = read(clone(completed)); expect(reloaded.nextSeasonPlan).toEqual(plan);
    const a = next(completed), b = next(reloaded);
    expect(b).toEqual(a); expect(a.state.history).toHaveLength(1);
    const variants: Career[] = [];
    const badId = clone(completed); badId.nextSeasonPlan!.seatReplacements![0].rookie.id += '-forged'; variants.push(badId);
    const badSkill = clone(completed); badSkill.nextSeasonPlan!.seatReplacements![0].rookie.skills.pace += 1; variants.push(badSkill);
    const badWage = clone(completed); badWage.nextSeasonPlan!.seatReplacements![0].rookie.contract!.wagePerRace += 1_000; variants.push(badWage);
    const badFee = clone(completed); badFee.nextSeasonPlan!.seatReplacements![0].signingFee += 1; variants.push(badFee);
    const badTotal = clone(completed); badTotal.nextSeasonPlan!.totalReplacementFee! += 1; variants.push(badTotal);
    const badCash = clone(completed); badCash.nextSeasonPlan!.cashAfter += 1; variants.push(badCash);
    const badReserve = clone(completed); badReserve.nextSeasonPlan!.nextReserved -= 1; variants.push(badReserve);
    const partial = clone(completed); delete partial.nextSeasonPlan!.seatReplacements; variants.push(partial);
    for (const copied of variants) {
      const bytes = JSON.stringify(copied);
      expect(engine.validateSavedCareer(copied), 'GP_FORGED_RETIREMENT_PLAN_ACCEPTED').toEqual({ ok: false, reason: 'invalid' });
      expect(JSON.stringify(copied)).toBe(bytes);
      const committed = engine.applyAction(copied, { type: 'startNextSeason', expectedRevision: copied.revision });
      expect(committed.ok, 'GP_ROLLOVER_MUST_RECOMPUTE_PLAN').toBe(true);
      if (committed.ok === false) throw new Error('Unreachable refused canonical action');
      expect(committed).toEqual(a);
    }
  });
});
