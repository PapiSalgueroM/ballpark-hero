import { describe, expect, it } from 'vitest';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer } from '@/lib/nrlCareer';
import { nrlSeasonPlan } from '@/data/nrlManagerSeasons';
import { nrlFinalsRace, nrlLadder, type NrlManagerState, type NrlMatchResult, type NrlScoring } from '@/lib/nrlManager';

const tryScore: NrlScoring = { tries: 1, conversions: 0, penalties: 0, fieldGoals: 0, longFieldGoals: 0 };
const noScore: NrlScoring = { tries: 0, conversions: 0, penalties: 0, fieldGoals: 0, longFieldGoals: 0 };
const finish = (state: NrlManagerState, index: number, teams: readonly (readonly [string, string])[]) => ({
  ...state, round: state.round + 1, phase: 'finals' as const,
  results: [...state.results, ...teams.map(([homeId, awayId]): NrlMatchResult => {
    const choice = index % 3;
    index = Math.floor(index / 3);
    const homeScoring = choice === 0 ? tryScore : noScore;
    const awayScoring = choice === 1 ? tryScore : noScore;
    return { homeId, awayId, round: state.round, homeScoring, awayScoring,
      homeScore: homeScoring.tries * 4, awayScore: awayScoring.tries * 4, extraTime: choice === 2 };
  })],
});

describe('NRL Finals race', () => {
  it.each([[2026, 'broncos'], [2027, 'bears']] as const)(
    'keeps the %s verified closing-round points bounds and every firm label true',
    (year, club) => {
      const { draw, clubs } = nrlSeasonPlan(year);
      const open = createNrlCareer(club, 1, year);
      expect(nrlFinalsRace(open.season)).toBeNull();
      const labels = new Set<string>();
      let inspected = 0;
      for (const seed of [1, 2, 3]) {
        let current = createNrlCareer(club, seed, year);
        while (current.season.round < draw.length) current = reduceNrlCareer(current, { type: 'advance' });
        const raw = JSON.stringify(current);
        expect(readNrlCareerSave(raw)).toEqual(current);
        const finalRound = draw.at(-1)!;
        const ranks = new Map(clubs.map(team => [team.id, [] as number[]]));
        for (let variant = 0; variant < 3 ** finalRound.length; variant++) {
          nrlLadder(finish(current.season, variant, finalRound)).forEach((row, rank) => ranks.get(row.clubId)!.push(rank + 1));
        }
        const now = nrlLadder(current.season);
        for (const row of now) {
          const race = nrlFinalsRace({ ...current.season, clubId: row.clubId })!;
          const fixture = finalRound.find(pair => pair.includes(row.clubId));
          const opponentId = fixture?.find(id => id !== row.clubId) ?? null;
          const opponentRank = now.findIndex(other => other.clubId === opponentId) + 1;
          expect(race.remaining).toEqual([{ round: draw.length, opponentId, home: fixture ? fixture[0] === row.clubId : null,
            nearCut: opponentRank >= 7 && opponentRank <= 10 }]);
          expect(race.minimum).toBe(row.points + (fixture ? 0 : 2));
          expect(race.maximum).toBe(row.points + 2);
          const places = ranks.get(row.clubId)!;
          for (const [cut, status] of [[4, race.topFour], [8, race.topEight]] as const) {
            labels.add(status);
            if (status === 'secured') expect(Math.max(...places)).toBeLessThanOrEqual(cut);
            if (status === 'out') expect(Math.min(...places)).toBeGreaterThan(cut);
          }
          inspected++;
        }
        expect(JSON.stringify(current)).toBe(raw);
        expect(nrlFinalsRace(finish(current.season, 0, finalRound))).toBeNull();
      }
      expect(inspected).toBe(clubs.length * 3);
      expect([...labels].sort()).toEqual(['open', 'out', 'secured']);
    },
    25_000,
  );
});
