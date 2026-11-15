import { describe, expect, it } from 'vitest';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { nrlNextRound } from '@/lib/nrlManager';

const reload = (state: NrlCareerState) => readNrlCareerSave(JSON.stringify(state));
const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const tap = (state: NrlCareerState, enabled = true) => {
  const { year, clubId, round } = state.season;
  return reduceNrlCareer(state, { type: 'setPenaltyTap', enabled, year, clubId, round });
};
const match = (state: NrlCareerState) => state.season.results.find(result => result.playerScoring)!;

describe('NRL penalty approach', () => {
  it.each([
    [2026, 'storm', 1, 0], [2026, 'storm', 2, 'none'], [2026, 'storm', 14, 6], [2026, 'storm', 27, 4],
    [2027, 'bears', 1, 'none'], [2027, 'bears', 4, 0], [2027, 'bears', 17, 6], [2027, 'bears', 27, 4],
  ] as const)(
    'settles the same kickable penalty choice in %i for %s, seed %i',
    (year, club, seed, points) => {
      const start = createNrlCareer(club, seed, year);
      const standard = advance(start), selected = tap(start), settled = advance(selected);
      expect(selected.season.penaltyTap).toBe(true);
      expect(tap(selected, false)).toEqual(start);
      expect(settled.season.penaltyTap).toBeUndefined();
      expect(reload(selected)).toEqual(selected);
      expect(reload(settled)).toEqual(settled);
      const result = match(settled), control = match(standard);
      expect(result.penaltyTap).toBe(points);
      const side = result.homeId === club ? 0 : 1;
      expect(result.scorePeriods!.regulation[side] - control.scorePeriods!.regulation[side]).toBe(points === 'none' ? 0 : points - 2);
      expect(result.scorePeriods!.regulation[1 - side]).toBe(control.scorePeriods!.regulation[1 - side]);
      expect(settled.season.results.filter(row => !row.playerScoring)).toEqual(standard.season.results.filter(row => !row.playerScoring));
      const live = reduceNrlCareer(selected, { type: 'startLive' });
      const { round, tactic } = selected.season;
      expect(tap(live, false)).toBe(live);
      expect(reload(live)).toEqual(live);
      expect(reduceNrlCareer(live, { type: 'finishLive', year, round, tactic })).toEqual(settled);
      const late = reduceNrlCareer(live, { type: 'reachMinute60', year, round, tactic });
      expect(reload(late)).toEqual(late);
      const final = reduceNrlCareer(late, { type: 'finishMinute60', year, round, tactic });
      const { scorePeriods, ...played } = match(final);
      const { at60, ...samePeriods } = scorePeriods!;
      expect({ ...played, scorePeriods: samePeriods }).toEqual(result);
      expect(at60).toBeDefined();
      expect(reload(final)).toEqual(final);
      const spoof = points === 'none' ? 6 : 'none';
      expect(reload({ ...settled, season: { ...settled.season, results: settled.season.results.map(row =>
        row === result ? { ...row, penaltyTap: spoof } : row) } })).toBeNull();
    },
  );

  it('keeps byes and stale selections outside the penalty choice', () => {
    const bye = createNrlCareer('panthers', 1);
    expect(nrlNextRound(bye.season).clubStatus).toBe('bye');
    expect(tap(bye)).toBe(bye);
    const career = createNrlCareer('storm', 1);
    const { clubId, year, round } = career.season;
    expect(reduceNrlCareer(career, { type: 'setPenaltyTap', clubId, year, round: round + 1, enabled: true })).toBe(career);
  });
});
