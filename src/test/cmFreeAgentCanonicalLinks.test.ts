import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SAVE_KEY, ensureAllEraRosters, freeAgentBlock, freeAgentTerms, loadCareer, recoverPooledReleases,
  refreshWorldRoster, saveCareer, signFreeAgent, startNextSeason, summerFreeAgents,
  wageBill, worldYear, type CareerState, type CMPlayer,
} from '@/lib/clubManager';
import { worldRosterView } from '@/lib/clubManagerWorldRoster';
import collisionSave from './fixtures/cmCanonicalLinks/collision.career.json?raw';
import recoverySave from './fixtures/cmCanonicalLinks/recovery.career.json?raw';

const KEY_A = '["now","Arsenal","QA Join Identity","CM",2006,0]';
const KEY_B = '["now","Liverpool","QA Join Identity","CM",2006,1]';
const RECOVERED_KEY = '["now","Everton","Jarrad Branthwaite","CB",2003,0]';

function roll<T>(action: () => T): T {
  const random = vi.spyOn(Math, 'random').mockReturnValue(.6);
  try { return action(); } finally { random.mockRestore(); }
}

function load(raw: string): CareerState {
  localStorage.setItem(SAVE_KEY, raw);
  const career = roll(() => loadCareer());
  expect(career, 'CM_FA_JOIN_SETUP_PUBLIC_LOAD').not.toBeNull();
  return career!;
}

function reload(career: CareerState): CareerState {
  expect(saveCareer(career), 'CM_FA_JOIN_SETUP_PUBLIC_SAVE').toBe(true);
  const raw = localStorage.getItem(SAVE_KEY);
  expect(raw, 'CM_FA_JOIN_SETUP_SAVED_BODY').toEqual(expect.any(String));
  return load(raw!);
}

function records(career: CareerState) {
  const view = worldRosterView(refreshWorldRoster(career));
  expect(view, 'CM_FA_JOIN_SETUP_READABLE_CANONICAL_LEDGER').not.toBeNull();
  return view!.records;
}

function canonical(career: CareerState, key: string) {
  const matching = records(career).filter(row => row.key === key);
  expect(matching, 'CM_FA_JOIN_SETUP_ONE_EXACT_KEY').toHaveLength(1);
  return matching[0];
}

function durable(player: CMPlayer) {
  return {
    id: player.id, name: player.name, position: player.position,
    potential: player.potential, role: player.role,
    secondaryPositions: player.secondaryPositions, academyGrad: player.academyGrad,
    generated: player.generated, nation: player.nation,
  };
}

describe('Club Manager canonical free-agent links', () => {
  beforeAll(async () => { await ensureAllEraRosters(); });
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-30T12:00:00.000Z'));
  });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); localStorage.clear(); });

  it('ages a keyed expired player through its own canonical record when a namesake exists', () => {
    // Frozen QA fiction: actual public transfer, natural expiry and distinct public release.
    const career = load(collisionSave), input = JSON.stringify(career);
    expect(career).toMatchObject({ clubName: 'Everton', season: 2, freeAgencyV2: true });
    expect(worldYear(career), 'CM_FA_JOIN_SETUP_CURRENT_YEAR').toBe(2027);
    const a = canonical(career, KEY_A), b = canonical(career, KEY_B);
    expect(a).toMatchObject({ status: 'released', owner: null });
    expect(b).toMatchObject({ status: 'released', owner: null });
    expect(a.player).toMatchObject({ id: 'qa-join-A-5100', potential: 86, role: 'star', secondaryPositions: ['RW'] });
    expect(b.player).toMatchObject({ id: 'qa-join-B-5100', potential: 92, secondaryPositions: ['LW'] });
    expect(records(career).filter(row => row.origin.name === a.origin.name
      && row.origin.birthYear === a.origin.birthYear && row.player.position === a.player.position)
      .map(row => row.key).sort(), 'CM_FA_JOIN_SETUP_DISTINCT_TUPLE_KEYS').toEqual([KEY_A, KEY_B].sort());
    const pool = career.freeAgents!.filter(row => row.name === a.player.name);
    expect(pool, 'CM_FA_JOIN_SETUP_SINGLE_EXPLICIT_POOL_IDENTITY').toHaveLength(1);
    expect(pool[0]).toMatchObject({ worldRosterKey: KEY_A, age: 21, reason: 'expired', fromMyClub: true });
    expect(career.squad.some(player => player.name === a.player.name)).toBe(false);

    const broken = { ...pool[0], worldRosterKey: 'qa-invalid-explicit-key' };
    const invalid = { ...career, freeAgents: [broken] }, invalidBefore = JSON.stringify(invalid);
    expect(freeAgentBlock(invalid, broken), 'CM_FA_JOIN_SETUP_INVALID_KEY_STILL_REFUSED').toBe('notInPool');
    expect(signFreeAgent(invalid, broken.name), 'CM_FA_JOIN_SETUP_INVALID_KEY_NO_FALLBACK').toBeNull();
    expect(JSON.stringify(invalid)).toBe(invalidBefore);
    const manual = { ...pool[0], reason: 'released' as const };
    expect(freeAgentBlock({ ...career, freeAgents: [manual] }, manual),
      'CM_FA_JOIN_SETUP_MANUAL_RELEASE_STILL_REFUSED').toBe('releasedByYou');

    // A public next-year canonical forecast is the independent aging control.
    // It is not substituted for the actual summer or the later gameplay action.
    const forecast = canonical({ ...career, season: career.season + 1 }, KEY_A);
    expect(forecast).toMatchObject({ status: 'released', owner: null });
    expect(forecast.player, 'CM_FA_JOIN_SETUP_ADMITTED_CANONICAL_FORECAST').toMatchObject({ age: 22, rating: 47, value: .7 });
    expect(durable(forecast.player)).toEqual(durable(a.player));
    const summer = roll(() => summerFreeAgents(career));
    expect(JSON.stringify(career), 'CM_FA_JOIN_SETUP_PURE_SUMMER_INPUT').toBe(input);
    const aged = summer.pool.filter(row => row.worldRosterKey === KEY_A);
    expect(aged, 'CM_FA_JOIN_SETUP_KEYED_PLAYER_STILL_AVAILABLE').toHaveLength(1);
    expect(summer.retired.some(row => row.name === a.player.name)).toBe(false);
    expect({ age: aged[0].age, rating: aged[0].rating, value: aged[0].value },
      'CM_FA_JOIN_KEYED_SUMMER').toEqual({ age: forecast.player.age, rating: forecast.player.rating, value: forecast.player.value });

    const next = reload(roll(() => startNextSeason(career)));
    expect(next.season).toBe(career.season + 1);
    const returning = next.freeAgents!.filter(row => row.worldRosterKey === KEY_A);
    expect(returning).toHaveLength(1);
    expect(returning[0]).toMatchObject({ age: forecast.player.age, rating: forecast.player.rating, value: forecast.player.value });
    expect(durable(canonical(next, KEY_A).player)).toEqual(durable(a.player));
    expect(freeAgentBlock(next, returning[0]), 'CM_FA_JOIN_SETUP_RETURN_ALLOWED').toBeNull();
    const quote = freeAgentTerms(returning[0], next), beforeSigning = JSON.stringify(next);
    const signed = signFreeAgent(next, returning[0].name);
    expect(signed).not.toBeNull();
    expect(JSON.stringify(next), 'CM_FA_JOIN_SIGNING_INPUT_HELD').toBe(beforeSigning);
    const owned = signed!.squad.filter(player => player.worldRosterKey === KEY_A);
    expect(owned).toHaveLength(1);
    expect(durable(owned[0])).toEqual(durable(a.player));
    expect(owned[0].id).not.toBe(b.player.id);
    expect(owned[0]).toMatchObject({ rating: forecast.player.rating, age: forecast.player.age, value: forecast.player.value, wage: quote.wage, contractYears: quote.years });
    expect(signed!.budget).toBe(Number((next.budget - quote.fee).toFixed(1)));
    expect(wageBill(signed!)).toBe(wageBill(next) + quote.wage);
    expect(signed!.freeAgents!.some(row => row.name === owned[0].name)).toBe(false);
    expect(canonical(signed!, KEY_A)).toMatchObject({ owner: signed!.clubName, status: 'owned' });
    const stored = reload(signed!);
    expect(stored.squad.filter(player => player.worldRosterKey === KEY_A)).toHaveLength(1);
    expect(durable(stored.squad.find(player => player.worldRosterKey === KEY_A)!)).toEqual(durable(a.player));
    expect(stored.budget).toBe(signed!.budget);
    expect(signFreeAgent(stored, a.player.name), 'CM_FA_JOIN_NO_DUPLICATE_RETURN').toBeNull();
  });

  it('recovers an old-save release with its known key across reload and the next summer', () => {
    // Exact public-loaded Everton save from the admitted immutable legacy corpus.
    const career = load(recoverySave), input = JSON.stringify(career);
    expect(career).toMatchObject({ clubName: 'Everton', eraId: 'now', season: 5 });
    expect(career.freeAgencyV2, 'CM_FA_JOIN_SETUP_LEGACY_MIGRATION_NOT_RUN').not.toBe(true);
    const held = canonical(career, RECOVERED_KEY);
    expect(held).toMatchObject({ owner: null, status: 'released' });
    expect(held.player).toMatchObject({ name: 'Jarrad Branthwaite', position: 'CB', age: 27 });
    expect(records(career).filter(row => row.player.name === held.player.name
      && row.player.position === held.player.position && row.player.age === held.player.age),
    'CM_FA_JOIN_SETUP_UNIQUE_EXISTING_IDENTITY').toHaveLength(1);
    expect(career.squad.some(player => player.name === held.player.name)).toBe(false);
    expect((career.loanedOut ?? []).some(row => row.player.name === held.player.name)).toBe(false);
    expect(career.freeAgents!.some(row => row.name === held.player.name)).toBe(false);
    expect(career.retiredNames ?? []).not.toContain(held.player.name);
    const recovered = recoverPooledReleases(career);
    expect(JSON.stringify(career), 'CM_FA_JOIN_SETUP_PURE_RECOVERY_INPUT').toBe(input);
    expect(recovered.freeAgencyV2).toBe(true);
    expect(recoverPooledReleases(recovered), 'CM_FA_JOIN_SETUP_RECOVERY_IDEMPOTENT').toEqual(recovered);
    expect(recovered.squad).toEqual(career.squad);
    expect(recovered.budget).toBe(career.budget);
    for (const row of career.freeAgents!) expect(recovered.freeAgents!.find(value => value.name === row.name)).toEqual(row);
    const available = recovered.freeAgents!.filter(row => row.name === held.player.name);
    expect(available, 'CM_FA_JOIN_SETUP_PUBLIC_RECOVERY_ADDS_KNOWN_PLAYER').toHaveLength(1);
    expect(available[0]).toMatchObject({ position: held.player.position, age: held.player.age, rating: held.player.rating, value: held.player.value, reason: 'expired', fromMyClub: true });
    const stored = reload(recovered);
    const restored = stored.freeAgents!.filter(row => row.name === held.player.name);
    expect(restored, 'CM_FA_JOIN_SETUP_RECOVERED_PLAYER_RELOADS').toHaveLength(1);
    expect(durable(canonical(stored, RECOVERED_KEY).player)).toEqual(durable(held.player));
    expect(restored[0].worldRosterKey, 'CM_FA_JOIN_RECOVERY_KEY').toBe(RECOVERED_KEY);

    expect(recoverPooledReleases(stored)).toEqual(stored);
    const forecast = canonical({ ...stored, season: stored.season + 1 }, RECOVERED_KEY);
    expect(forecast).toMatchObject({ owner: null, status: 'released' });
    const next = reload(roll(() => startNextSeason(stored)));
    const future = next.freeAgents!.filter(row => row.worldRosterKey === RECOVERED_KEY);
    expect(future).toHaveLength(1);
    expect(future[0]).toMatchObject({ name: held.player.name, position: held.player.position, age: forecast.player.age, rating: forecast.player.rating, value: forecast.player.value });
    expect(durable(canonical(next, RECOVERED_KEY).player)).toEqual(durable(held.player));
    expect(recoverPooledReleases(next)).toEqual(next);
    expect(next.squad.some(player => player.worldRosterKey === RECOVERED_KEY)).toBe(false);
  });
});
