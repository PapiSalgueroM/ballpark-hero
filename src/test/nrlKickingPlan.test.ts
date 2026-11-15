import { describe, expect, it } from 'vitest';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { nrlNextRound, type NrlKickingPlan } from '@/lib/nrlManager';

const reload = (state: NrlCareerState) => readNrlCareerSave(JSON.stringify(state));
const advance = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'advance' });
const startLive = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'startLive' });
const select = (state: NrlCareerState, plan: NrlKickingPlan, round = state.season.round) => {
  const { year, clubId } = state.season;
  return reduceNrlCareer(state, { type: 'setKickingPlan', year, clubId, round, plan });
};
const managedMatch = (state: NrlCareerState) => state.season.results.find(result => result.playerScoring)!;

describe('NRL last-tackle kicking', () => {
  it.each(['territory', 'contest'] as const)('keeps %s through each match path and clears it after the fixture', plan => {
    const start = createNrlCareer('storm', 14);
    const selected = select(start, plan);
    expect(selected.season.kickingPlan).toBe(plan);
    expect(select(selected, 'mixed')).toEqual(start);
    expect(advance(select(selected, 'mixed'))).toEqual(advance(start));
    expect(reload(selected)).toEqual(selected);

    const quick = advance(selected);
    const result = managedMatch(quick);
    expect(result.kickingPlan).toBe(plan);
    expect(quick.season.kickingPlan).toBeUndefined();
    expect(reload(quick)).toEqual(quick);
    expect(quick.season.results.filter(row => !row.playerScoring)).toEqual(advance(start).season.results.filter(row => !row.playerScoring));

    const live = startLive(selected);
    const { year, round, tactic } = selected.season;
    expect(select(live, 'mixed')).toBe(live);
    expect(reload(live)).toEqual(live);
    expect(reduceNrlCareer(live, { type: 'finishLive', year, round, tactic })).toEqual(quick);

    const late = reduceNrlCareer(live, { type: 'reachMinute60', year, round, tactic });
    expect(reload(late)).toEqual(late);
    const final = reduceNrlCareer(late, { type: 'finishMinute60', year, round, tactic });
    const { scorePeriods, ...played } = managedMatch(final);
    const { at60, ...samePeriods } = scorePeriods!;
    expect({ ...played, scorePeriods: samePeriods }).toEqual(result);
    expect(at60).toBeDefined();
    expect(reload(final)).toEqual(final);

    const spoofed = { ...quick, season: { ...quick.season, results: quick.season.results.map(row =>
      row === result ? { ...row, kickingPlan: 'mixed' } : row) } } as NrlCareerState;
    expect(reload(spoofed)).toBeNull();
  });

  it('rejects stale decisions and byes', () => {
    const bye = createNrlCareer('panthers', 1);
    expect(nrlNextRound(bye.season).clubStatus).toBe('bye');
    expect(select(bye, 'territory')).toBe(bye);
    const start = createNrlCareer('storm', 1);
    expect(select(start, 'contest', start.season.round + 1)).toBe(start);
  });

  it('varies both sides’ try threat with meaningful but bounded effects over the same fixture draws', () => {
    const samples = 160;
    const totals = [0, 0, 0];
    for (let seed = 1; seed <= samples; seed++) {
      const start = createNrlCareer('storm', seed);
      const scores = [select(start, 'territory'), start, select(start, 'contest')].map(startLive);
      for (const side of ['homeScoring', 'awayScoring'] as const) {
        const tries = scores.map(state => state.season.live![side].tries);
        expect(tries[0]).toBeLessThanOrEqual(tries[1]);
        expect(tries[1]).toBeLessThanOrEqual(tries[2]);
        tries.forEach((value, index) => { totals[index] += value; });
      }
    }
    for (const difference of [totals[1] - totals[0], totals[2] - totals[1]]) {
      expect(difference / samples).toBeGreaterThan(0.25);
      expect(difference / samples).toBeLessThan(0.65);
    }
  });
});
