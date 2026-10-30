import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FORMATIONS, FREE_AGENT_MIN_FEE, autoPickXI, buildMarket, buyPlayer, freeAgentBlock,
  freeAgentTerms, loadCareer, promoteProspect, releaseBlock, releasePlayer, renewContract, renewalTerms,
  saveCareer, signFreeAgent, startCareer, startNextSeason, wageBill, worldRosterFor,
  worldYear, type CareerState, type CMPlayer, type FreeAgent,
} from '@/lib/clubManager';
import { projectedRoster } from '@/lib/clubManagerEras';
import {
  readWorldRoster, recordWorldRosterTransfer, worldRosterOwner, type WorldRosterRecord,
} from '@/lib/clubManagerWorldRoster';

function withRoll<T>(value: number, action: () => T): T {
  const random = vi.spyOn(Math, 'random').mockReturnValue(value);
  try { return action(); } finally { random.mockRestore(); }
}

function club(): CareerState {
  const base = withRoll(.6, () => startCareer('Everton'));
  const keepers = base.squad.filter(p => p.position === 'GK').slice(0, 2);
  const outfield = base.squad.filter(p => p.position !== 'GK').slice(0, 16);
  expect(keepers.length, 'CM_FA_SETUP_KEEPERS').toBe(2);
  expect(outfield.length, 'CM_FA_SETUP_SENIORS').toBe(16);
  const squad = [...keepers, ...outfield].map(p => ({ ...p, contractYears: 4 }));
  return {
    ...base, squad, xiIds: autoPickXI(squad, FORMATIONS[base.formationIndex]),
    budget: 9999, wageCap: 9999, transferWindow: 'summer',
  };
}

function acquired(veteran = false): { career: CareerState; player: CMPlayer; origin: string } {
  const base = club();
  const offer = buildMarket(base).find(p => {
    if (p.position === 'GK' || p.generated) return false;
    if (veteran) return p.age >= 35 && p.age <= 39;
    if (p.club !== 'Arsenal' || p.age < 20 || p.age > 26) return false;
    // Keep the existing canonical record eligible for the ledger's pruning rule.
    return [1, 2].every(years => projectedRoster(p.club, years, 'now', base.worldSeed)
      .some(future => future.n === p.name && future.p === p.position && future.a === p.age + years));
  });
  expect(offer, 'CM_FA_SETUP_CURRENT_MARKET_PLAYER').toBeDefined();
  const bought = withRoll(.6, () => buyPlayer(base, offer!));
  expect(bought, 'CM_FA_SETUP_REAL_PURCHASE').not.toBeNull();
  const original = bought!.squad.find(p => p.name === offer!.name)!;
  expect(original?.worldRosterKey, 'CM_FA_SETUP_CANONICAL_PURCHASE').toEqual(expect.any(String));
  const learned: CMPlayer['position'] = original.position === 'CM' ? 'RW' : 'CM';
  // Only this simulation fixture changes: no roster or factual player data is edited.
  const player: CMPlayer = {
    ...original, rating: 40, value: .2, wage: 80, contractYears: 1,
    potential: 86, academyGrad: true, secondaryPositions: [learned],
    seasonGoals: 7, seasonAssists: 4, apps: 12, seasonYellows: 3,
    seasonReds: 1, cleanSheets: 2, ratingSum: 90, releaseClause: .5,
  };
  const career = { ...bought!, squad: bought!.squad.map(p => p.id === player.id ? player : p) };
  expect(freeAgentBlock({ ...career, worldRoster: undefined, squad: career.squad.filter(p => p.id !== player.id),
    freeAgents: [{ name: player.name, position: player.position, age: player.age, rating: 40,
      value: .2, since: career.season - 1, reason: 'expired' }] }, {
    name: player.name, position: player.position, age: player.age, rating: 40,
    value: .2, since: career.season - 1, reason: 'expired',
  }), 'CM_FA_SETUP_OTHER_SIGNING_GATES').toBeNull();
  return { career, player, origin: offer!.club };
}

function record(career: CareerState, key: string): WorldRosterRecord {
  const rows = readWorldRoster(career)?.records.filter(r => r.key === key) ?? [];
  expect(rows, 'CM_FA_SETUP_ONE_CANONICAL_RECORD').toHaveLength(1);
  return rows[0];
}

function roundTrip(career: CareerState): CareerState {
  expect(saveCareer(career), 'CM_FA_SETUP_REAL_SAVE').toBe(true);
  const loaded = withRoll(.6, () => loadCareer());
  expect(loaded, 'CM_FA_SETUP_REAL_RELOAD').not.toBeNull();
  return loaded!;
}

function expired(waitOneSeason = false) {
  const fixture = acquired();
  const key = fixture.player.worldRosterKey!;
  const first = withRoll(.6, () => startNextSeason(fixture.career));
  expect(first.season, 'CM_FA_SETUP_GENUINE_SUMMER').toBe(fixture.career.season + 1);
  expect(first.squad.some(p => p.name === fixture.player.name), 'CM_FA_SETUP_LEFT_SQUAD').toBe(false);
  expect(first.retiredNames, 'CM_FA_SETUP_NOT_RETIRED').not.toContain(fixture.player.name);
  const firstRecord = record(first, key);
  expect(firstRecord.status, 'CM_FA_SETUP_RELEASED_STATUS').toBe('released');
  expect(firstRecord.owner, 'CM_FA_SETUP_NO_CLUB_OWNER').toBeNull();
  expect(firstRecord.player.age, 'CM_FA_SETUP_ONE_BIRTHDAY').toBe(fixture.player.age + 1);
  expect(firstRecord.player).toMatchObject({
    id: fixture.player.id, potential: 86, academyGrad: true,
    secondaryPositions: fixture.player.secondaryPositions,
    seasonGoals: 0, seasonAssists: 0, apps: 0, seasonYellows: 0,
    seasonReds: 0, cleanSheets: 0, ratingSum: 0,
  });
  let career = roundTrip(first);
  expect(record(career, key).player, 'CM_FA_SETUP_SAVED_CANONICAL_PROFILE').toEqual(firstRecord.player);
  if (waitOneSeason) career = roundTrip(withRoll(.6, () => startNextSeason(career)));
  const rows = (career.freeAgents ?? []).filter(f => f.name === fixture.player.name);
  expect(rows, 'CM_FA_SETUP_EXPIRED_POOL_RECORD').toHaveLength(1);
  const fa = rows[0];
  expect(fa).toMatchObject({ reason: 'expired', fromMyClub: true, since: first.season });
  expect(career.squad.length, 'CM_FA_SETUP_ROOM_TO_RETURN').toBeLessThan(30);
  expect(worldRosterOwner(career, key), 'CM_FA_SETUP_RELEASED_OWNER_AFTER_RELOAD').toBeNull();
  expect(buildMarket(career).some(p => p.name === fa.name), 'CM_FA_SETUP_NOT_OWNED_MARKET_STOCK').toBe(false);
  expect(worldRosterFor(career, fixture.origin).some(p => p.worldRosterKey === key),
    'CM_FA_SETUP_NO_SELLER_RESURRECTION').toBe(false);
  return { ...fixture, career: { ...career, transferWindow: null }, fa, profile: record(career, key).player };
}

function renewalControl(career: CareerState, profile: CMPlayer) {
  // The counterfactual uses the same aged person and the existing paid-renewal action.
  const control = { ...career, squad: [...career.squad, structuredClone(profile)] };
  const quote = renewalTerms(profile);
  const renewed = renewContract(control, profile.id);
  expect(renewed, 'CM_FA_SETUP_REAL_RENEWAL_CONTROL').not.toBeNull();
  const player = renewed!.squad.find(p => p.id === profile.id)!;
  expect(player.wage).toBe(quote.wage);
  expect(renewed!.budget).toBe(Number((control.budget - quote.fee).toFixed(1)));
  expect(quote.fee, 'CM_FA_SETUP_RENEWAL_EXCEEDS_EXISTING_MINIMUM').toBeGreaterThan(FREE_AGENT_MIN_FEE);
  return { quote, state: renewed!, player };
}

function uniqueReturn(career: CareerState, original: CMPlayer, origin: string) {
  const people = career.squad.filter(p => p.name === original.name);
  expect(people).toHaveLength(1);
  expect(new Set(career.squad.map(p => p.id)).size).toBe(career.squad.length);
  expect((career.freeAgents ?? []).some(f => f.name === original.name)).toBe(false);
  expect(worldRosterOwner(career, original.worldRosterKey!)).toBe(career.clubName);
  expect(record(career, original.worldRosterKey!).status).toBe('owned');
  expect(worldRosterFor(career, origin).some(p => p.worldRosterKey === original.worldRosterKey)).toBe(false);
  expect(worldRosterFor(career, career.clubName).filter(p => p.worldRosterKey === original.worldRosterKey)).toHaveLength(1);
  return people[0];
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('Club Manager free-agent continuity', () => {
  it('recovers a naturally expired player in the arrival season without a cheaper contract', () => {
    const { career, player, origin, fa, profile } = expired();
    const control = renewalControl(career, profile);
    expect(freeAgentBlock(career, fa), 'CM_FA_EXPIRY_RECOVERY').toBeNull();
    const signed = signFreeAgent(career, fa.name);
    expect(signed, 'CM_FA_EXPIRY_RECOVERY').not.toBeNull();
    const returned = uniqueReturn(signed!, player, origin);
    expect(returned.wage, 'CM_FA_RENEWAL_WAGE').toBe(control.player.wage);
    expect(signed!.budget, 'CM_FA_RENEWAL_FEE').toBe(control.state.budget);
    expect(returned.contractYears).toBe(freeAgentTerms(fa).years);
    expect(returned.releaseClause).toBeUndefined();
    const loaded = roundTrip(signed!);
    expect(uniqueReturn(loaded, player, origin).id, 'CM_FA_CANONICAL_IDENTITY').toBe(player.id);
    expect(loaded.budget).toBe(signed!.budget);
  });

  it('restores a later free-agent signing with the same identity and durable development', () => {
    const { career, player, origin, fa } = expired(true);
    expect(freeAgentBlock(career, fa), 'CM_FA_SETUP_LATER_SIGNABLE').toBeNull();
    const signed = signFreeAgent(career, fa.name);
    expect(signed, 'CM_FA_SETUP_LATER_REAL_SIGNING').not.toBeNull();
    const returned = signed!.squad.find(p => p.name === player.name)!;
    expect(returned.id, 'CM_FA_CANONICAL_IDENTITY').toBe(player.id);
    expect(returned.worldRosterKey, 'CM_FA_CANONICAL_IDENTITY').toBe(player.worldRosterKey);
    expect(returned.potential, 'CM_FA_CANONICAL_DEVELOPMENT').toBe(86);
    expect(returned.academyGrad, 'CM_FA_CANONICAL_DEVELOPMENT').toBe(true);
    expect(returned.secondaryPositions, 'CM_FA_CANONICAL_DEVELOPMENT').toEqual(player.secondaryPositions);
    expect(returned.age).toBe(fa.age);
    expect(returned.rating).toBe(fa.rating);
    expect(returned).toMatchObject({ seasonGoals: 0, seasonAssists: 0, apps: 0 });
    const loaded = roundTrip(signed!);
    expect(uniqueReturn(loaded, player, origin)).toMatchObject({
      id: player.id, potential: 86, academyGrad: true, secondaryPositions: player.secondaryPositions,
    });
    expect(loaded.budget).toBe(signed!.budget);
  });

  it('uses renewal wage and fee floors when an expired player returns', () => {
    const { career, player, fa, profile } = expired(true);
    const control = renewalControl(career, profile);
    expect(freeAgentBlock(career, fa), 'CM_FA_SETUP_FINANCIAL_RETURN_SIGNABLE').toBeNull();
    const signed = signFreeAgent(career, fa.name);
    expect(signed, 'CM_FA_SETUP_FINANCIAL_REAL_SIGNING').not.toBeNull();
    const returned = signed!.squad.find(p => p.name === player.name)!;
    expect(returned.wage, 'CM_FA_RENEWAL_WAGE').toBe(control.player.wage);
    expect(signed!.budget, 'CM_FA_RENEWAL_FEE').toBe(control.state.budget);
    expect(returned.contractYears).toBe(freeAgentTerms(fa).years);
    const capped = { ...career, wageCap: wageBill(career) + control.player.wage! - 1 };
    expect(freeAgentBlock(capped, fa), 'CM_FA_RENEWAL_CAP').toBe('overCap');
    expect(signFreeAgent(capped, fa.name), 'CM_FA_RENEWAL_CAP').toBeNull();
    expect(capped.budget).toBe(career.budget);
    const poor = { ...career, budget: control.quote.fee - .1 };
    const poorBudget = poor.budget;
    expect(freeAgentBlock(poor, fa), 'CM_FA_RENEWAL_FEE_GATE').toBe('cantAfford');
    expect(signFreeAgent(poor, fa.name), 'CM_FA_RENEWAL_FEE_GATE').toBeNull();
    expect(poor.budget).toBe(poorBudget);
  });

  it('keeps a promoted academy identity after expiry and reload', () => {
    const intake = withRoll(.6, () => startNextSeason(club()));
    const prospect = intake.academy?.prospects.find(p => p.source === 'Academy');
    expect(prospect, 'CM_FA_SETUP_GENUINE_ACADEMY_INTAKE').toBeDefined();
    const promoted = withRoll(.6, () => promoteProspect(intake, prospect!.id));
    expect(promoted, 'CM_FA_SETUP_REAL_ACADEMY_PROMOTION').not.toBeNull();
    const graduate = promoted!.squad.find(p => p.name === prospect!.name)!;
    expect(graduate).toMatchObject({ academyGrad: true, potential: prospect!.potential });
    const learned: CMPlayer['position'] = graduate.position === 'CM' ? 'RW' : 'CM';
    const player = { ...graduate, contractYears: 1, secondaryPositions: [learned] };
    const prepared = { ...promoted!, squad: promoted!.squad.map(p => p.id === player.id ? player : p) };
    // The existing canonical writer registers the actual promotion, not a guessed baked identity.
    const owned = recordWorldRosterTransfer(prepared, {
      player, from: prepared.clubName + ' academy', to: prepared.clubName,
      kind: 'permanent', since: prepared.season - 1,
    });
    const held = owned.squad.find(p => p.id === player.id)!;
    expect(held.worldRosterKey, 'CM_FA_SETUP_ACADEMY_CANONICAL_KEY').toEqual(expect.any(String));
    expect(record(owned, held.worldRosterKey!).status, 'CM_FA_SETUP_HEALTHY_OWNED_ACADEMY').toBe('owned');
    const loadedOwned = roundTrip(owned);
    expect(record(loadedOwned, held.worldRosterKey!).player,
      'CM_FA_SETUP_OWNED_ACADEMY_SURVIVES_SAVE').toEqual(record(owned, held.worldRosterKey!).player);
    const next = withRoll(.6, () => startNextSeason(loadedOwned));
    expect(next.squad.some(p => p.id === held.id), 'CM_FA_SETUP_ACADEMY_DEAL_EXPIRED').toBe(false);
    expect(next.retiredNames, 'CM_FA_SETUP_ACADEMY_NOT_RETIRED').not.toContain(held.name);
    const pool = next.freeAgents?.filter(f => f.name === held.name) ?? [];
    expect(pool, 'CM_FA_SETUP_ACADEMY_IN_FREE_AGENCY').toHaveLength(1);
    expect(pool[0]).toMatchObject({ reason: 'expired', fromMyClub: true, since: next.season });
    const loaded = roundTrip(next);
    expect(loaded.freeAgents?.filter(f => f.name === held.name), 'CM_FA_SETUP_ACADEMY_POOL_SAVED').toHaveLength(1);
    const released = readWorldRoster(loaded)?.records.filter(r => r.key === held.worldRosterKey) ?? [];
    expect(released, 'CM_FA_ACADEMY_CANONICAL_RETENTION').toHaveLength(1);
    expect(released[0]).toMatchObject({ status: 'released', owner: null });
    expect(released[0].player).toMatchObject({
      id: held.id, potential: held.potential, academyGrad: true, secondaryPositions: [learned],
    });
    const signed = signFreeAgent({ ...loaded, transferWindow: null }, held.name);
    expect(signed, 'CM_FA_EXPIRY_RECOVERY').not.toBeNull();
    expect(signed!.squad.find(p => p.name === held.name)).toMatchObject({
      id: held.id, worldRosterKey: held.worldRosterKey,
      potential: held.potential, academyGrad: true, secondaryPositions: [learned],
    });
  });

  it('keeps manual release embargoes and ordinary signing limits', () => {
    const { career, player } = acquired();
    expect(releaseBlock(career, player), 'CM_FA_SETUP_MANUAL_RELEASE_ALLOWED').toBeNull();
    const released = releasePlayer(career, player.id);
    expect(released, 'CM_FA_SETUP_REAL_MANUAL_RELEASE').not.toBeNull();
    const fa = released!.freeAgents!.find(f => f.name === player.name)!;
    expect(fa).toMatchObject({ reason: 'released', fromMyClub: true, since: career.season });
    expect(freeAgentBlock(released!, fa)).toBe('releasedByYou');
    const loaded = roundTrip(released!);
    expect(signFreeAgent(loaded, fa.name)).toBeNull();
    expect(loaded.budget).toBe(released!.budget);
    expect(loaded.severance).toEqual(released!.severance);
    expect(loaded.squad.some(p => p.name === player.name)).toBe(false);
    const stranger: FreeAgent = { name: 'Eligibility Fixture', position: 'CM', age: 27,
      rating: 40, value: .2, wage: 20, generated: true, since: career.season, reason: 'unattached' };
    const open = { ...career, freeAgents: [stranger], transferWindow: null };
    const terms = freeAgentTerms(stranger);
    expect(freeAgentBlock(open, stranger), 'CM_FA_SETUP_STRANGER_SIGNABLE').toBeNull();
    const overCap = { ...open, wageCap: wageBill(open) + terms.wage - 1 };
    expect(freeAgentBlock(overCap, stranger)).toBe('overCap');
    expect(signFreeAgent(overCap, stranger.name)).toBeNull();
    const poor = { ...open, budget: terms.fee - .1 };
    expect(freeAgentBlock(poor, stranger)).toBe('cantAfford');
    expect(signFreeAgent(poor, stranger.name)).toBeNull();
    const star = { ...stranger, rating: 99 };
    const tooStrong = { ...open, freeAgents: [star] };
    expect(freeAgentBlock(tooStrong, star)).toBe('notInterested');
    expect(signFreeAgent(tooStrong, star.name)).toBeNull();
  });

  it('keeps summer retirement terminal instead of listing the player as free', () => {
    const { career, player } = acquired(true);
    // A real summer with zero rolls takes the existing positive retirement branch.
    const retired = withRoll(0, () => startNextSeason(career));
    expect(retired.retiredLastSummer?.some(p => p.name === player.name), 'CM_FA_SETUP_ACTUAL_RETIREMENT').toBe(true);
    expect(retired.squad.some(p => p.name === player.name)).toBe(false);
    expect(retired.freeAgents?.some(f => f.name === player.name)).toBe(false);
    expect(retired.retiredNames).toContain(player.name);
    expect(record(retired, player.worldRosterKey!).status).toBe('retired');
    const loaded = roundTrip(retired);
    expect(loaded.retiredNames).toContain(player.name);
    expect(buildMarket(loaded).some(p => p.name === player.name)).toBe(false);
    expect(signFreeAgent(loaded, player.name)).toBeNull();
    expect(loaded.budget).toBe(retired.budget);
  });

  it('loads legacy thin free agents without guessing an ambiguous world identity', () => {
    const base = club();
    const fa: FreeAgent = { name: 'Legacy Continuity Fixture', position: 'CM', age: 27,
      rating: 40, value: .2, generated: true, since: base.season - 1, reason: 'expired', fromMyClub: true };
    const history = (origin: string, id: string, potential: number): WorldRosterRecord => {
      const birthYear = worldYear(base) - fa.age;
      const key = JSON.stringify(['now', origin, fa.name, fa.position, birthYear, 0]);
      return {
        key, origin: { club: origin, name: fa.name, position: fa.position, birthYear, since: 0 },
        owner: null, status: 'released', year: worldYear(base),
        player: { id, name: fa.name, position: fa.position, age: fa.age, rating: fa.rating,
          value: fa.value, generated: true, worldRosterKey: key, potential,
          fitness: 100, morale: 70, injuryWeeks: 0, suspendedMatches: 0,
          isYouth: false, seasonGoals: 0, seasonAssists: 0 },
      };
    };
    const records = [history('Arsenal', 'legacy-one', 81), history('Liverpool', 'legacy-two', 89)];
    const legacy: CareerState = { ...base, freeAgents: [fa], transferWindow: null,
      worldRoster: { version: 1, eraId: 'now', records } };
    const loaded = roundTrip(legacy);
    expect(readWorldRoster(loaded)?.records.filter(r => r.player.name === fa.name)).toHaveLength(2);
    expect(loaded.freeAgents?.find(f => f.name === fa.name)).toMatchObject(fa);
    expect(freeAgentBlock(loaded, fa), 'CM_FA_SETUP_LEGACY_SIGNABLE').toBeNull();
    const terms = freeAgentTerms(fa);
    const signed = signFreeAgent(loaded, fa.name);
    expect(signed).not.toBeNull();
    const added = signed!.squad.filter(p => p.name === fa.name);
    expect(added).toHaveLength(1);
    expect(['legacy-one', 'legacy-two']).not.toContain(added[0].id);
    expect(added[0].worldRosterKey).toBeUndefined();
    expect([81, 89]).not.toContain(added[0].potential);
    expect(readWorldRoster(signed!)?.records.filter(r => r.player.name === fa.name && r.status === 'owned')).toHaveLength(0);
    expect(signed!.freeAgents?.some(f => f.name === fa.name)).toBe(false);
    expect(signed!.budget).toBe(Number((loaded.budget - terms.fee).toFixed(1)));
  });
});
