import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadCareer, SAVE_KEY, saveCareer, startCareer, startNextSeason } from '@/lib/clubManager';
import { nationStrength, runManagerSummer, runQualifying, simulateTournament, tournamentForYear } from '@/lib/soccerInternational';
import { saveFence } from '@/lib/saveFence';

function randomFor(seed: number): () => number {
  return () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
}

const job = (nation: string) => ({ nation, since: 1, played: 0, lastResult: null, lastYear: null, won: 0 });

describe('Club Manager national campaign', () => {
  beforeEach(() => {
    saveFence.release(SAVE_KEY);
    localStorage.clear();
  });
  afterEach(() => { vi.restoreAllMocks(); saveFence.release(SAVE_KEY); });

  it('gives a qualifying coach their actual campaign results and leaves the player selection path intact', () => {
    const random = vi.spyOn(Math, 'random').mockImplementation(randomFor(11));
    const strength = nationStrength('England');
    const tournament = runManagerSummer('England', 2028, 6)!;
    expect(tournament.qualified).toBe(true);
    expect(tournament.myResult).not.toBe('Not Selected');
    expect(tournament.managerFixtures.length).toBeGreaterThanOrEqual(3);
    expect(tournament.managerFixtures.filter(match => match.round.startsWith('Group'))).toHaveLength(3);
    expect(tournament.managerFixtures.every(match => match.home === 'England' || match.away === 'England')).toBe(true);
    expect(tournament.playerApps).toBe(0);
    expect(tournament.playerGoals).toBe(0);
    expect(nationStrength('England')).toBe(strength);
    const lastTie = tournament.bracket.filter(tie => tie.mine).at(-1);
    if (lastTie) {
      const last = tournament.managerFixtures.at(-1);
      expect(last).toMatchObject({ home: lastTie.home, away: lastTie.away, homeGoals: lastTie.homeGoals, awayGoals: lastTie.awayGoals });
    }

    random.mockImplementation(randomFor(11));
    const format = tournamentForYear('England', 2028)!;
    const qualifying = runQualifying('England', format, null);
    expect(qualifying.qualified).toBe(true);
    const playerOut = simulateTournament('England', format, 2028, qualifying, null, null);
    expect(playerOut.myResult).toBe('Not Selected');
    expect(playerOut.matches).toHaveLength(0);
  });

  it('runs a real-year save in the correct summer and keeps the most recent report across saves and seasons', () => {
    const random = vi.spyOn(Math, 'random').mockImplementation(randomFor(23));
    const before = { ...startCareer('Manchester City'), startYear: 2027, nationJob: job('England') };
    const first = startNextSeason(before);
    expect(first.nationCampaign).toMatchObject({ nation: 'England', year: 2028 });
    expect(first.nationCampaign?.name).toMatch(/Euro/i);
    expect(first.nationCampaign?.result).not.toBe('Not Selected');
    expect(saveCareer(first)).toBe(true);
    const loaded = loadCareer()!;
    expect(loaded.nationCampaign).toEqual(first.nationCampaign);
    const quietYear = startNextSeason(loaded, 'Arsenal');
    expect(quietYear.clubName).toBe('Arsenal');
    expect(quietYear.nationCampaign).toEqual(first.nationCampaign);

    random.mockImplementation(randomFor(23));
    const kickoffAfterWorldCup = { ...startCareer('Manchester City'), startYear: 2026, nationJob: job('England') };
    expect(startNextSeason(kickoffAfterWorldCup).nationCampaign).toBeUndefined();
  });

  it('keeps the failed qualifying campaign when that result costs the national job', () => {
    vi.spyOn(Math, 'random').mockImplementation(randomFor(17));
    const state = { ...startCareer('Manchester City'), startYear: 2029, nationJob: job('San Marino') };
    const next = startNextSeason(state);
    expect(next.nationJob).toBeNull();
    expect(next.nationCampaign).toMatchObject({ nation: 'San Marino', year: 2030, result: 'Did Not Qualify', groupTable: [], matches: [] });
    expect(next.nationCampaign?.qualifying.table.length).toBeGreaterThan(0);
    expect(next.clubName).toBe(state.clubName);
  });
});
