import { describe, expect, it } from 'vitest';
import type { MlbSeasonLine } from '@/lib/mlbMyCareer';
import type { NhlSeasonLine } from '@/lib/nhlMyCareer';
import { mlbSeasonReview, nhlSeasonReview } from '@/lib/usCareerSeasonReview';

const season = { year: 2025, team: 'BOS', age: 25, ovr: 82, games: 40, teamResult: 'Season complete', awards: [], salary: 5 };
const stat = (review: ReturnType<typeof mlbSeasonReview>, label: string) =>
  review.regularValues.find(row => row.label === label);

describe('saved career opportunity rates', () => {
  it('uses hockey points and goalie wins per season appearance', () => {
    const player: NhlSeasonLine = { ...season, goals: 12, assists: 17, points: 29 };
    expect(stat(nhlSeasonReview(player, 'D'), 'Points per game')?.numeric).toEqual({ raw: 29 / 40, digits: 2 });
    expect(stat(nhlSeasonReview(player, 'G'), 'Wins per 100 appearances')).toBeUndefined();

    const goalie: NhlSeasonLine = { ...season, wins: 26, svpct: 0.912, tandemStarts: 49 };
    expect(stat(nhlSeasonReview(goalie, 'G'), 'Wins per 100 appearances')?.value).toBe('65.0');
    expect(stat(nhlSeasonReview(goalie, 'G'), 'Points per game')).toBeUndefined();
  });

  it('separates baseball starts, relief appearances and hitting games', () => {
    const pitcher: MlbSeasonLine = { ...season, games: 25, so: 150, saves: 8 };
    expect(stat(mlbSeasonReview(pitcher, 'SP'), 'Strikeouts per start')?.value).toBe('6.00');
    expect(stat(mlbSeasonReview(pitcher, 'RP'), 'Strikeouts per appearance')?.value).toBe('6.00');
    expect(stat(mlbSeasonReview(pitcher, 'RP'), 'Saves per 100 appearances')?.value).toBe('32.0');
    expect(stat(mlbSeasonReview(pitcher, 'SP'), 'Saves per 100 appearances')).toBeUndefined();

    const hitter: MlbSeasonLine = { ...season, games: 100, doubles: 22 };
    expect(stat(mlbSeasonReview(hitter, 'CF'), 'Doubles per 100 games')?.value).toBe('22.0');
  });

  it('retains real zeroes and skips rates with missing or impossible counts', () => {
    expect(stat(nhlSeasonReview({ ...season, games: 55, points: 0 }, 'LW'), 'Points per game')?.value).toBe('0.00');
    expect(stat(nhlSeasonReview({ ...season, games: 40, wins: 42 }, 'G'), 'Wins per 100 appearances')).toBeUndefined();
    expect(stat(mlbSeasonReview({ ...season, games: 0, so: 20 }, 'SP'), 'Strikeouts per start')).toBeUndefined();
    expect(stat(mlbSeasonReview({ ...season, games: 20, so: Number.NaN }, 'RP'), 'Strikeouts per appearance')).toBeUndefined();
    expect(stat(mlbSeasonReview({ ...season }, 'DH'), 'Doubles per 100 games')).toBeUndefined();
  });
});
