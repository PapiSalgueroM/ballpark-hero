import { expect, it } from 'vitest';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';
import { nrlHoldableReserves, nrlMinute60Interchange } from '@/lib/nrlManager';
import { nrlScorePoints } from '@/lib/nrlPlayerScoring';

const matchFor = ({ season }: NrlCareerState) =>
  season.results.find(row => row.homeId === season.clubId || row.awayId === season.clubId)!;

function pause(year: 2026 | 2027, clubId: string, seed: number) {
  const initial = createNrlCareer(clubId, seed, year);
  const reserveId = nrlHoldableReserves(initial.season)[0].id;
  const half = reduceNrlCareer(initial, { type: 'startLive', hold: { year, round: 1, reserveId } });
  const at60 = reduceNrlCareer(half, { type: 'reachMinute60', year, round: 1, tactic: 'balanced' });
  return { half, at60, reserveId };
}

it.each([
  [2026, 'broncos', 690, [12, 12], [12, 14], [14, 14], 2],
  [2027, 'bears', 217, [24, 24], [24, 24], [24, 25], 1],
] as const)('applies only a real late kick outcome in %i', (year, clubId, seed, score60, standardAt80, calledAt80, scored) => {
  const { at60, reserveId } = pause(year, clubId, seed);
  const bytes = JSON.stringify(at60);
  const restored = readNrlCareerSave(bytes)!;
  expect(restored).toEqual(at60);
  const finish = { type: 'finishMinute60', year, round: 1, tactic: 'balanced', reserveId } as const;
  const ordinary = reduceNrlCareer(restored, finish);
  const called = reduceNrlCareer(restored, { ...finish, fieldGoalPlan: true });
  const baselineMatch = matchFor(ordinary);
  const match = matchFor(called);
  expect(match.scorePeriods?.at60).toEqual(score60);
  expect(match.scorePeriods?.halfTime).toEqual(baselineMatch.scorePeriods?.halfTime);
  expect(baselineMatch.scorePeriods?.regulation).toEqual(standardAt80);
  expect(match.scorePeriods?.regulation).toEqual(calledAt80);
  expect(match.minute60FieldGoal).toBe(scored);
  expect(match.minute60Interchange?.reserveId).toBe(reserveId);
  expect(match.benchUsed).toEqual(baselineMatch.benchUsed);
  const fieldGoals = match.playerScoring!.lines.map(row => scored === 1 ? row.fieldGoals : row.longFieldGoals).reduce((a, b) => a + b, 0);
  expect(fieldGoals).toBeGreaterThanOrEqual(1);
  expect(match.playerScoring!.lines.reduce((sum, row) => sum + nrlScorePoints(row), 0))
    .toBe(match.homeId === clubId ? match.homeScore : match.awayScore);
  expect(called.season.results.filter(row => row !== match)).toEqual(ordinary.season.results.filter(row => row !== baselineMatch));
  expect(readNrlCareerSave(JSON.stringify(called))).toEqual(called);
  const bad = { ...called, season: { ...called.season, results: called.season.results.map(row =>
    row === match ? { ...row, minute60FieldGoal: 3 } : row) } };
  expect(readNrlCareerSave(JSON.stringify(bad))).toBeNull();
  expect(JSON.stringify(restored)).toBe(bytes);
});

it.each([
  [20, 10, 10],
  [68, 34, 28],
] as const)('records no kick for seed %i even if the late try trade-off changed the score', (seed, ordinaryPoints, calledPoints) => {
  const { at60, reserveId } = pause(2026, 'broncos', seed);
  const finish = { type: 'finishMinute60', year: 2026, round: 1, tactic: 'balanced', reserveId } as const;
  const ordinary = matchFor(reduceNrlCareer(at60, finish));
  const called = matchFor(reduceNrlCareer(at60, { ...finish, fieldGoalPlan: true }));
  expect(called.minute60FieldGoal).toBe(0);
  expect(called.scorePeriods?.halfTime).toEqual(ordinary.scorePeriods?.halfTime);
  expect(called.scorePeriods?.at60).toEqual(ordinary.scorePeriods?.at60);
  expect(ordinary.scorePeriods?.regulation[0]).toBe(ordinaryPoints);
  expect(called.scorePeriods?.regulation[0]).toBe(calledPoints);
  expect(called.scorePeriods?.regulation[1]).toBe(ordinary.scorePeriods?.regulation[1]);
});

it('refuses a forged choice when ahead and preserves the saved pause', () => {
  const { half, at60 } = pause(2026, 'broncos', 1);
  const finish = { type: 'finishMinute60', year: 2026, round: 1, tactic: 'balanced' } as const;
  expect(reduceNrlCareer(half, { ...finish, fieldGoalPlan: true })).toBe(half);
  expect(reduceNrlCareer(at60, { ...finish, fieldGoalPlan: true })).toBe(at60);
  const baseline = reduceNrlCareer(at60, finish);
  expect(matchFor(baseline).minute60FieldGoal).toBeUndefined();
  const late = nrlMinute60Interchange(at60.season)!;
  expect(late.reserveId).toBeTruthy();
  expect(readNrlCareerSave(JSON.stringify(baseline))).toEqual(baseline);
});
