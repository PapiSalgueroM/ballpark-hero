import { describe, expect, it } from 'vitest';
import { CLUB_WORLD_CUP_2025_GROUPS, simulateClubWorldCup2025 } from './soccerClubWorldCup';

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
});
