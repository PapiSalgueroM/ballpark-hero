import { describe, expect, it } from 'vitest';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { createNrlSeason, nrlLadder, reduceNrlSeason, type NrlManagerState } from '@/lib/nrlManager';
import { nrlScorePoints } from '@/lib/nrlPlayerScoring';

const start = (seed: number) => createNrlCareer('storm', seed);
const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const read = (state: NrlCareerState) => readNrlCareerSave(JSON.stringify(state));
const managed = ({ results, clubId }: NrlManagerState) => results.find(result => result.homeId === clubId || result.awayId === clubId)!;

describe('NRL regular-season golden point receipt', () => {
  it.each([
    [29, 1, 'fieldGoals', 1],
    [202, 2, 'fieldGoals', 1],
    [222, 2, 'tries', 4],
    [274, 2, 'penalties', 2],
    [1175, 1, 'longFieldGoals', 2],
  ])('shows the deciding period and score in seed %i', (seed, period, score, points) => {
    const state = advance(start(seed));
    const match = managed(state.season);
    expect(match.extraTime).toBe(true);
    expect(Math.abs(match.homeScore - match.awayScore)).toBe(points);
    expect(match.goldenPoint).toEqual({ period, score });
    const ownScore = match.homeId === state.season.clubId ? match.homeScore : match.awayScore;
    expect(match.playerScoring!.lines.reduce((total, line) => total + nrlScorePoints(line), 0)).toBe(ownScore);
    expect(JSON.stringify(read(state)) === JSON.stringify(state)).toBe(true);
    expect(state.season.results.filter(result => result.goldenPoint).length).toBe(1);
  });

  it('records a scoreless two-period draw without changing its score or ladder credit', () => {
    const state = advance(start(88));
    const match = managed(state.season);
    expect(match.homeScore).toBe(match.awayScore);
    expect(match.extraTime).toBe(true);
    expect(match.goldenPoint).toBe('draw');
    expect(nrlLadder(state.season).find(row => row.clubId === state.season.clubId)).toMatchObject({ draws: 1, wins: 0, points: 1 });
    expect(JSON.stringify(read(state)) === JSON.stringify(state)).toBe(true);
  });

  it('settles the same receipt with Quick or Live Keep and captures the actual changed Live tie', () => {
    const chosen = start(202);
    const pending = read(reduceNrlCareer(chosen, { type: 'startLive' }))!;
    const finish = { type: 'finishLive', year: 2026, round: 1, tactic: 'balanced' } as const;
    const finished = reduceNrlCareer(pending, finish);
    expect(JSON.stringify(finished)).toBe(JSON.stringify(advance(chosen)));
    expect(managed(finished.season).goldenPoint).toEqual({ period: 2, score: 'fieldGoals' });
    expect(reduceNrlCareer(finished, finish) === finished).toBe(true);

    const tactical = reduceNrlCareer(start(2), { type: 'startLive' });
    const switched = reduceNrlCareer(tactical, { ...finish, tactic: 'attack' });
    expect(managed(switched.season).goldenPoint).toEqual({ period: 1, score: 'fieldGoals' });
    expect(managed(advance(start(2)).season).goldenPoint).toBeUndefined();
  });

  it('continues legacy, unplayed and untied results without a new field', () => {
    const legacy = createNrlSeason('storm', 2);
    const raw = reduceNrlSeason(legacy, { type: 'advance' });
    expect(managed(raw).extraTime).toBe(true);
    expect(managed(raw).goldenPoint).toBeUndefined();

    const imported = readNrlCareerSave(JSON.stringify(legacy))!;
    expect(managed(advance(imported).season).goldenPoint).toBeUndefined();

    const modern = start(29);
    const { kickerId, ...season } = modern.season;
    const older = read({ ...modern, season })!;
    expect(managed(advance(older).season).extraTime).toBe(true);
    expect(managed(advance(older).season).goldenPoint).toBeUndefined();

    expect(managed(advance(start(1)).season).extraTime).toBe(false);
    expect(managed(advance(start(1)).season).goldenPoint).toBeUndefined();
  });

  it('accepts a pre-existing tie with no receipt and rejects malformed or contradictory receipts', () => {
    const state = advance(start(29));
    const result = managed(state.season);
    const replace = (goldenPoint: unknown) => readNrlCareerSave(JSON.stringify({
      ...state, season: { ...state.season, results: state.season.results.map(match =>
        match === result ? { ...match, goldenPoint } : match) },
    }));
    expect(replace(undefined)).not.toBeNull();
    expect(replace('draw') === null).toBe(true);
    expect(replace({ period: 0, score: 'fieldGoals' }) === null).toBe(true);
    expect(replace({ period: 1, score: 'conversions' }) === null).toBe(true);
    expect(replace({ period: 1, score: 'tries' }) === null).toBe(true);
  });
});
