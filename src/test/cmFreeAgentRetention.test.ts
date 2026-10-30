import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FORMATIONS, autoPickXI, buildMarket, buyPlayer, decayFreeAgents, freeAgentBlock,
  freeAgentTerms, loadCareer, releasePlayer, saveCareer, signFreeAgent,
  startCareer, startNextSeason, type CareerState, type CMPlayer,
} from '@/lib/clubManager';
import { projectedRoster } from '@/lib/clubManagerEras';
import { readWorldRoster, worldRosterOwner } from '@/lib/clubManagerWorldRoster';

function roll<T>(value: number, action: () => T): T {
  const random = vi.spyOn(Math, 'random').mockReturnValue(value);
  try { return action(); } finally { random.mockRestore(); }
}

function reload(career: CareerState): CareerState {
  expect(saveCareer(career), 'CM_FA_RETENTION_SETUP_SAVE').toBe(true);
  const loaded = roll(.6, () => loadCareer());
  expect(loaded, 'CM_FA_RETENTION_SETUP_RELOAD').not.toBeNull();
  return loaded!;
}

function canonical(career: CareerState, key: string) {
  const rows = readWorldRoster(career)?.records.filter(r => r.key === key) ?? [];
  expect(rows, 'CM_FA_RETENTION_SETUP_ONE_CANONICAL_RECORD').toHaveLength(1);
  return rows[0];
}

function acquired(lastPlayingYear = false) {
  const initial = roll(.6, () => startCareer('Everton'));
  const squad = [...initial.squad.filter(p => p.position === 'GK').slice(0, 2),
    ...initial.squad.filter(p => p.position !== 'GK').slice(0, 16)]
    .map(p => ({ ...p, contractYears: 4 }));
  expect(squad, 'CM_FA_RETENTION_SETUP_LEGAL_SQUAD').toHaveLength(18);
  const base = { ...initial, squad, xiIds: autoPickXI(squad, FORMATIONS[initial.formationIndex]),
    budget: 9999, wageCap: 9999, transferWindow: 'summer' as const };
  const offer = buildMarket(base).find(p => {
    if (p.position === 'GK' || p.generated) return false;
    if (lastPlayingYear) return p.age === 40;
    return p.club === 'Arsenal' && p.age >= 20 && p.age <= 24
      && [1, 2, 3].every(years => projectedRoster(p.club, years, 'now', base.worldSeed)
        .some(future => future.n === p.name && future.p === p.position && future.a === p.age + years));
  });
  expect(offer, 'CM_FA_RETENTION_SETUP_ACTUAL_MARKET_PLAYER').toBeDefined();
  const bought = roll(.6, () => buyPlayer(base, offer!));
  expect(bought, 'CM_FA_RETENTION_SETUP_ACTUAL_PURCHASE').not.toBeNull();
  const actual = bought!.squad.find(p => p.name === offer!.name)!;
  expect(actual?.worldRosterKey, 'CM_FA_RETENTION_SETUP_PURCHASED_IDENTITY').toEqual(expect.any(String));
  const learned: CMPlayer['position'] = actual.position === 'CM' ? 'RW' : 'CM';
  // QA-only simulated development, never a change to source football data.
  const player: CMPlayer = { ...actual, contractYears: 1, wage: 80, value: .2,
    rating: lastPlayingYear ? 90 : 40, potential: lastPlayingYear ? 99 : 86,
    secondaryPositions: [learned], seasonGoals: 7, seasonAssists: 4, apps: 12 };
  const career = { ...bought!, squad: bought!.squad.map(p => p.id === player.id ? player : p) };
  const next = reload(roll(lastPlayingYear ? .999 : .6, () => startNextSeason(career)));
  const profile = canonical(next, player.worldRosterKey!);
  expect(profile).toMatchObject({ status: 'released', owner: null });
  expect(profile.player).toMatchObject({ id: player.id, name: player.name, age: player.age + 1 });
  expect(next.squad.some(p => p.id === player.id), 'CM_FA_RETENTION_SETUP_ACTUAL_EXPIRY').toBe(false);
  const pool = next.freeAgents?.filter(f => f.worldRosterKey === player.worldRosterKey) ?? [];
  expect(pool, 'CM_FA_RETENTION_SETUP_FIRST_LIVE_POOL_ENTRY').toHaveLength(1);
  expect(pool[0]).toMatchObject({ reason: 'expired', fromMyClub: true, since: next.season });
  return { career, player, next, fa: pool[0], key: player.worldRosterKey! };
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('Club Manager long free-agent retention', () => {
  it('keeps a living naturally expired player available after the third summer and reload', () => {
    const { player, next, fa, key } = acquired();
    const second = reload(roll(.6, () => startNextSeason(next)));
    expect(second.freeAgents?.filter(f => f.worldRosterKey === key),
      'CM_FA_RETENTION_SETUP_SECOND_SUMMER_STILL_LISTED').toHaveLength(1);
    const third = reload(roll(.6, () => startNextSeason(second)));
    const profile = canonical(third, key);
    expect(profile).toMatchObject({ status: 'released', owner: null });
    expect(profile.player).toMatchObject({ id: player.id, age: player.age + 3,
      potential: 86, secondaryPositions: player.secondaryPositions });
    expect(third.retiredNames, 'CM_FA_RETENTION_SETUP_YOUNG_PLAYER_ALIVE').not.toContain(player.name);
    expect(third.squad.some(p => p.id === player.id), 'CM_FA_RETENTION_SETUP_NOT_ALREADY_SIGNED').toBe(false);
    const rows = third.freeAgents?.filter(f => f.worldRosterKey === key) ?? [];
    expect(rows, 'CM_FA_LONG_RETENTION').toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: player.name, since: fa.since, reason: 'expired',
      fromMyClub: true, age: player.age + 3 });
    const open = { ...third, transferWindow: null };
    expect(freeAgentBlock(open, rows[0]), 'CM_FA_LONG_RETENTION_SIGNABLE').toBeNull();
    const terms = freeAgentTerms(rows[0], open);
    const signed = signFreeAgent(open, player.name);
    expect(signed, 'CM_FA_LONG_RETENTION_REAL_RETURN').not.toBeNull();
    const returned = signed!.squad.filter(p => p.worldRosterKey === key);
    expect(returned).toHaveLength(1);
    expect(returned[0]).toMatchObject({ id: player.id, name: player.name, potential: 86,
      secondaryPositions: player.secondaryPositions, rating: rows[0].rating, age: rows[0].age,
      seasonGoals: 0, seasonAssists: 0, apps: 0 });
    expect(new Set(signed!.squad.map(p => p.id)).size).toBe(signed!.squad.length);
    expect(signed!.freeAgents?.some(f => f.worldRosterKey === key)).toBe(false);
    expect(worldRosterOwner(signed!, key)).toBe(signed!.clubName);
    expect(signed!.budget).toBe(Number((open.budget - terms.fee).toFixed(1)));
    expect(canonical(reload(signed!), key)).toMatchObject({ status: 'owned', owner: signed!.clubName });
  });

  it('removes canonical retirees and preserves ordinary pool expiry and manual release guards', () => {
    const { career, player, next, fa, key } = acquired(true);
    expect(canonical(next, key).player.age, 'CM_FA_RETIREMENT_SETUP_LAST_LIVING_YEAR').toBe(41);
    const retired = reload(roll(.999, () => startNextSeason(next)));
    const profile = canonical(retired, key);
    expect(profile, 'CM_FA_RETIREMENT_SETUP_ACTUAL_PRIVATE_AGING').toMatchObject({ status: 'retired', owner: null });
    expect(profile.player.age).toBe(42);
    expect(retired.freeAgents?.some(f => f.worldRosterKey === key), 'CM_FA_RETIREMENT_POOL_CLEANUP').toBe(false);
    expect(freeAgentBlock(retired, fa)).toBe('notInPool');
    expect(signFreeAgent(retired, player.name)).toBeNull();
    const journeyman = career.freeAgents?.find(f => f.reason === 'unattached' && f.generated);
    expect(journeyman, 'CM_FA_RETENTION_SETUP_ORDINARY_JOURNEYMAN').toBeDefined();
    const aged = decayFreeAgents([journeyman!], journeyman!.since + 1, new Set());
    expect(aged).toHaveLength(1);
    expect(aged[0].age).toBe(journeyman!.age + 1);
    expect(decayFreeAgents(aged, journeyman!.since + 2, new Set())).toEqual([]);
    const released = releasePlayer(career, player.id);
    expect(released, 'CM_FA_RETENTION_SETUP_ACTUAL_MANUAL_RELEASE').not.toBeNull();
    const savedRelease = reload(released!);
    const manual = savedRelease.freeAgents!.find(f => f.name === player.name)!;
    expect(manual).toMatchObject({ reason: 'released', fromMyClub: true });
    expect(freeAgentBlock(savedRelease, manual)).toBe('releasedByYou');
    expect(signFreeAgent(savedRelease, player.name)).toBeNull();
  });
});
