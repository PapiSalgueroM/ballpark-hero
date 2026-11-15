import { expect, it } from 'vitest';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';

const read = (state: NrlCareerState) => readNrlCareerSave(JSON.stringify(state));
const match = (state: NrlCareerState) => state.season.results.find(row => row.playerScoring)!;
const session = (state: NrlCareerState) => ({ year: state.season.year, round: state.season.round, tactic: state.season.tactic });
const finish = (state: NrlCareerState, latePenaltyApproach?: 'goal' | 'tap') => reduceNrlCareer(state,
  { type: 'finishMinute60', ...session(state), latePenaltyApproach });
const at60 = (state: NrlCareerState) => reduceNrlCareer(reduceNrlCareer(state, { type: 'startLive' }),
  { type: 'reachMinute60', ...session(state) });
const withTap = (state: NrlCareerState) => reduceNrlCareer(state, { type: 'setPenaltyTap', enabled: true, year: state.season.year,
  round: state.season.round, clubId: state.season.clubId });

it.each([
  [2026, 'storm', 14, 6, [16, 0], [18, 10], [22, 10]],
  [2026, 'storm', 24, 0, [30, 14], [44, 20], [42, 20]],
  [2027, 'bears', 27, 4, [26, 22], [26, 28], [26, 30]],
] as const)('holds the %i score at 60 and resolves a fresh late penalty for %s seed %i', (year, clubId, seed, points, mid, banked, tapped) => {
  const original = createNrlCareer(clubId, seed, year);
  const control = at60(original), earlyTap = at60(withTap(original));
  expect(read(control)).toEqual(control);
  expect(finish(control, 'goal')).toEqual(finish(control));
  expect(finish(earlyTap, 'tap')).toEqual(finish(earlyTap));
  const changedToTap = finish(read(control)!, 'tap');
  const changedToGoal = finish(read(earlyTap)!, 'goal');
  for (const [state, approach, resultPoints, final] of [
    [changedToTap, 'tap', points, tapped], [changedToGoal, 'goal', 2, banked],
  ] as const) {
    const row = match(state);
    expect(row.scorePeriods).toMatchObject({ at60: mid, regulation: final });
    expect(row.scorePeriods?.halfTime).toEqual(match(finish(control)).scorePeriods?.halfTime);
    expect(row.latePenalty).toEqual({ approach, points: resultPoints });
    expect(row.penaltyTap).toBeUndefined();
    expect(read(state)).toEqual(state);
    expect(finish(state, approach)).toBe(state);
  }
  expect(match(finish(control)).scorePeriods?.regulation).toEqual(banked);
  expect(match(finish(earlyTap)).scorePeriods?.regulation).toEqual(tapped);
});

it('keeps an actual early tap and gives an honest final-20 receipt when there is no late penalty', () => {
  const initial = at60(withTap(createNrlCareer('storm', 1)));
  const ordinary = match(finish(initial));
  const changed = finish(initial, 'goal');
  expect(match(changed)).toEqual({ ...ordinary, latePenalty: { approach: 'goal', points: 'none' } });
  expect(match(changed).penaltyTap).toBe(0);
  expect(read(changed)).toEqual(changed);
  const result = match(changed);
  const forged = { ...changed, season: { ...changed.season, results: changed.season.results.map(row => row === result
    ? { ...row, latePenalty: { approach: 'goal', points: 2 } as const } : row) } };
  expect(read(forged)).toBeNull();
});

it('replays the committed final-20 approach through a golden-point checkpoint', () => {
  const initial = at60(createNrlCareer('storm', 35));
  const direct = finish(initial, 'tap');
  expect(match(finish(initial)).scorePeriods?.regulation).toEqual([18, 22]);
  expect(match(direct).scorePeriods).toMatchObject({ at60: [10, 22], regulation: [22, 22] });
  const paused = reduceNrlCareer(initial, { type: 'finishMinute60', ...session(initial), latePenaltyApproach: 'tap', pauseForGoldenPoint: true });
  expect(paused.season.live?.goldenPoint).toMatchObject({ score: 22, finish: { latePenaltyApproach: 'tap' } });
  const resumed = reduceNrlCareer(read(paused)!, { type: 'settleGoldenPoint', approach: 'standard', year: 2026, clubId: 'storm', round: 1 });
  expect(resumed).toEqual(direct);
  expect(read(resumed)).toEqual(resumed);
});

it('leaves the finals decision unchanged and refuses a late regular-season switch there', () => {
  let career = createNrlCareer('storm', 14);
  while (career.season.round < 30) career = reduceNrlCareer(career, { type: 'advance' });
  const late = at60(career);
  expect(late.season.phase).toBe('finals');
  expect(late.season.live?.minute60).toBeDefined();
  expect(finish(late, 'tap')).toBe(late);
  expect(finish(late)).not.toBe(late);
  expect(read(finish(late))).toEqual(finish(late));
});
