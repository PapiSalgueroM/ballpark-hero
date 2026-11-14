import { describe, expect, it, vi } from 'vitest';
import { CLUB_WORLD_CUP_2025_GROUPS, clubWorldCup2025Campaign, clubWorldCupAnnualStats, clubWorldCupSeasonStats, simulateClubWorldCup2025 } from './soccerClubWorldCup';

describe('Soccer Career 2025 Club World Cup', () => {
  it('holds the verified 32 clubs and completes the correct 63-match bracket', () => {
    const entrants = Object.values(CLUB_WORLD_CUP_2025_GROUPS).flat();
    expect(new Set(entrants).size).toBe(32);
    expect(CLUB_WORLD_CUP_2025_GROUPS.D).toEqual(['Flamengo', 'Esperance', 'Chelsea', 'LAFC']);
    expect(CLUB_WORLD_CUP_2025_GROUPS.C).toContain('Auckland City');
    expect(entrants).not.toContain('Auckland FC');
    const tournament = simulateClubWorldCup2025('career cup', () => 3);
    expect(tournament).toEqual(simulateClubWorldCup2025('career cup', () => 3));
    const { tables, matches, champion } = tournament;
    const stages = matches.map(match => match.stage);
    expect(stages.filter(stage => stage === 'Group')).toHaveLength(48);
    expect(stages.filter(stage => stage === 'Round of 16')).toHaveLength(8);
    expect(stages.filter(stage => stage === 'Quarterfinal')).toHaveLength(4);
    expect(stages.filter(stage => stage === 'Semifinal')).toHaveLength(2);
    const round16 = matches.filter(match => match.stage === 'Round of 16');
    expect(round16.map(match => [match.home, match.away])).toEqual([
      [tables.A[0].club, tables.B[1].club], [tables.C[0].club, tables.D[1].club],
      [tables.B[0].club, tables.A[1].club], [tables.D[0].club, tables.C[1].club],
      [tables.E[0].club, tables.F[1].club], [tables.G[0].club, tables.H[1].club],
      [tables.H[0].club, tables.G[1].club], [tables.F[0].club, tables.E[1].club],
    ]);
    expect(matches).toHaveLength(63);
    expect(matches.at(-1)).toMatchObject({ stage: 'Final', winner: champion });
    for (const table of Object.values(tables)) expect(table.map(row => row.played)).toEqual([3, 3, 3, 3]);
    for (const match of matches.filter(match => match.stage !== 'Group')) {
      expect([match.home, match.away]).toContain(match.winner);
      expect(Boolean(match.extraTime)).toBe(match.homeGoals === match.awayGoals);
      expect(Boolean(match.penalties)).toBe(match.homeGoals + (match.extraTime?.homeGoals ?? 0) === match.awayGoals + (match.extraTime?.awayGoals ?? 0));
    }
  });

  it('keeps the same neutral results independently of player availability and credits goals once', () => {
    const tier = () => 3;
    const seed = 'club campaign';
    const forma = { overall: 94, lastRating: 8, lastGoals: 30, position: 'ST', age: 26, isCaptain: false };
    const globalRandom = vi.spyOn(Math, 'random');
    try {
      const played = clubWorldCup2025Campaign('Chelsea', seed, tier, forma, 1)!;
      const absent = clubWorldCup2025Campaign('Chelsea', seed, tier, null, 1)!;
      expect(played.apps).toBe(played.matches.length);
      expect(absent.apps).toBe(0);
      expect(played.matches.map(({ player: _line, ...match }) => match)).toEqual(absent.matches);
      expect(played.goals).toBe(played.matches.reduce((sum, match) => sum + (match.player?.goals ?? 0), 0));
      for (const match of played.matches) {
        const goals = match.home === played.club ? match.homeGoals + (match.extraTime?.homeGoals ?? 0) : match.awayGoals + (match.extraTime?.awayGoals ?? 0);
        expect(match.player!.goals + match.player!.assists).toBeLessThanOrEqual(goals);
      }
      expect(clubWorldCup2025Campaign('Auckland FC', seed, tier, forma, 1)).toBeUndefined();
      const clubSeason = { apps: 40, goals: 30, assists: 8, cleanSheets: 0, rating: 7.5 };
      const closing = { year: 2024, club: 'Chelsea', ...clubWorldCupSeasonStats(clubSeason, played), clubWorldCup: { ...played, annualRating: clubSeason.rating } };
      expect(clubWorldCupAnnualStats(JSON.parse(JSON.stringify(closing)))).toEqual(clubSeason);
      expect(clubWorldCupAnnualStats({ ...closing, year: 2028 })).toBeNull();
      expect(clubWorldCupAnnualStats({ ...closing, clubWorldCup: { ...closing.clubWorldCup, goals: played.goals + 1 } })).toBeNull();
      expect(globalRandom).not.toHaveBeenCalled();
    } finally {
      globalRandom.mockRestore();
    }
  });
});
