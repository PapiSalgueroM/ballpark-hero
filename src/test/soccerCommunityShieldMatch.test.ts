import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SeasonRecord } from '@/lib/soccerCareerEngine';
import { playCommunityShield, communityShieldSeasonStats, readCommunityShield, countCommunityShields,
  type CommunityShieldOpeningInput, type CommunityShieldResult } from '@/lib/soccerCareerExtraCups';

// Retained synthetic equal:1 and equal:6 inputs from pure probe 41537301012.
// These are simulated fixtures, not real scores, club strengths or qualification history.
function input(seed: number): CommunityShieldOpeningInput {
  return {
    qualification: { version: 1, competition: 'community-shield', status: 'ready', qualifyingYear: 2026, eventYear: 2027, seed,
      leagueWinner: 'Arsenal', cupWinner: 'Newcastle',
      entrants: [{ club: 'Arsenal', via: 'league-winner' }, { club: 'Newcastle', via: 'fa-cup-winner' }],
      proof: { league: { kind: 'league-world-close', year: 2026 }, cup: { kind: 'phone-world', year: 2026 } } },
    eventYear: 2027, playerName: 'Shield pure probe', club: 'Arsenal', position: 'ST', overall: 80,
    selectionChance: 1, unavailableReason: null, teamStrengths: [4, 4],
  };
}
function play(value: CommunityShieldOpeningInput): CommunityShieldResult {
  const result = playCommunityShield(value);
  expect(result, 'actual valid play fixture must produce a result').not.toBeNull();
  return result!;
}
function annual() { return { apps: 30, goals: 10, assists: 5, cleanSheets: 0, rating: 7.2 }; }
function saved(result: CommunityShieldResult): SeasonRecord {
  return { type: 'playing', year: 2027, club: result.player.club,
    ...communityShieldSeasonStats(annual(), result), extraCups: [result] } as SeasonRecord;
}
function team(result: CommunityShieldResult) {
  return { entrants: result.entrants, minutes: result.minutes, score: result.score, decidedBy: result.decidedBy,
    penalties: result.penalties, winner: result.winner };
}
afterEach(() => { vi.restoreAllMocks(); });

describe('Community Shield actual pure match', () => {
  it('SC_SHIELD_MATCH_NORMAL: retains the observed normal result and merges the played contribution once', () => {
    const value = input(1), result = play(value);
    expect(result, 'SC_SHIELD_MATCH_NORMAL: retained actual normal witness').toMatchObject({
      minutes: 90, score: [2, 1], decidedBy: 'normal-time', winner: 'Arsenal',
      player: { selected: true, apps: 1, goals: 1, assists: 0, cleanSheets: 0, rating: 7.7, title: true },
    });
    expect(result.penalties).toBeUndefined();
    expect(play(input(1)), 'same actual pure input must reproduce the full result').toEqual(result);
    const base = annual(), before = JSON.stringify(base), row = saved(result), raw = JSON.stringify(row);
    expect(communityShieldSeasonStats(base, result)).toEqual({ apps: 31, goals: 11, assists: 5, cleanSheets: 0, rating: 7.2 });
    expect(readCommunityShield(row)).toEqual(result); expect(countCommunityShields([row])).toBe(1);
    expect(JSON.stringify(row)).toBe(raw); expect(JSON.stringify(base)).toBe(before);
  });

  it('SC_SHIELD_MATCH_PENS: retains actual sudden-death kicks separately from match goals and contribution', () => {
    const result = play(input(6));
    expect(result, 'SC_SHIELD_MATCH_PENS: retained actual direct-penalties witness').toMatchObject({
      minutes: 90, score: [1, 1], decidedBy: 'penalties', penalties: [8, 9], winner: 'Newcastle',
      player: { selected: true, apps: 1, goals: 0, assists: 0, cleanSheets: 0, rating: 6.7, title: false },
    });
    const row = saved(result), raw = JSON.stringify(row);
    expect(communityShieldSeasonStats(annual(), result)).toEqual({ apps: 31, goals: 10, assists: 5, cleanSheets: 0, rating: 7.2 });
    expect(readCommunityShield(row)).toEqual(result); expect(countCommunityShields([row])).toBe(0);
    expect(JSON.stringify(row)).toBe(raw);
  });

  it('SC_SHIELD_MATCH_INDEPENDENCE: keeps the same team outcome when player context changes', () => {
    const held = team(play(input(1)));
    for (const patch of [
      { playerName: 'Another simulated player' }, { position: 'GK' }, { position: 'CM' },
      { club: 'Newcastle' }, { overall: 45 }, { selectionChance: 0 },
      { unavailableReason: 'unresolved-rehab' as const },
    ]) {
      const result = play({ ...input(1), ...patch });
      expect(team(result), 'SC_SHIELD_MATCH_INDEPENDENCE: player context cannot change the team match').toEqual(held);
    }
  });

  it('SC_SHIELD_MATCH_KEEPER: gives a selected goalkeeper no goals and no clean sheet after conceding', () => {
    const result = play({ ...input(1), position: 'GK' });
    expect(result.player, 'SC_SHIELD_MATCH_KEEPER: selected goalkeeper contribution follows the actual role').toMatchObject({
      selected: true, apps: 1, goals: 0, cleanSheets: 0, title: true,
    });
    expect(result.score).toEqual([2, 1]);
    expect(result.player.assists).toBeLessThanOrEqual(2);
    expect(readCommunityShield(saved(result))).toEqual(result);
  });

  it('SC_SHIELD_MATCH_AVAILABILITY: records unknown availability bench and nonentrant outcomes without appearances', () => {
    for (const patch of [
      { unavailableReason: 'unresolved-rehab' as const, availability: 'unknown', reason: 'unresolved-rehab' },
      { unavailableReason: 'pending-generic-suspension' as const, availability: 'unknown', reason: 'pending-generic-suspension' },
      { selectionChance: 0, availability: 'available', reason: undefined },
      { club: 'Shield simulation town', availability: 'unavailable', reason: 'not-entrant' },
    ]) {
      const { availability, reason, ...playing } = patch;
      const result = play({ ...input(1), ...playing });
      expect(result.player, 'SC_SHIELD_MATCH_AVAILABILITY: unavailable or unselected players cannot gain a contribution').toMatchObject({
        availability, selected: false, apps: 0, goals: 0, assists: 0, cleanSheets: 0, rating: null, title: false,
      });
      expect(result.player.reason).toBe(reason);
      const base = annual(), before = JSON.stringify(base);
      expect(communityShieldSeasonStats(base, result)).toEqual(base);
      expect(readCommunityShield(saved(result))).toEqual(result);
      expect(JSON.stringify(base)).toBe(before);
    }
  });

  it('SC_SHIELD_MATCH_GLOBAL: leaves the global random stream and all actual input fields untouched', () => {
    for (const seed of [1, 6]) {
      const value = input(seed), before = JSON.stringify(value);
      const random = vi.spyOn(Math, 'random');
      const result = playCommunityShield(value);
      const globalDraws = random.mock.calls.length;
      random.mockRestore();
      expect(globalDraws, 'SC_SHIELD_MATCH_GLOBAL: keyed opening simulation cannot consume the annual global stream').toBe(0);
      expect(result, 'actual valid play fixture must produce a result').not.toBeNull();
      expect(JSON.stringify(value)).toBe(before);
      expect(readCommunityShield(saved(result!))).toEqual(result);
    }
  });
});