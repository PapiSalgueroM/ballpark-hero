import { describe, expect, it } from 'vitest';
import { createNrlCareer, readNrlCareerSave, reduceNrlCareer, type NrlCareerState } from '@/lib/nrlCareer';

const start = (seed: number) => createNrlCareer('storm', seed);
const live = (seed: number) => reduceNrlCareer(start(seed), { type: 'startLive' });
const advance = { type: 'advance' } as const;
const finish = { type: 'finishLive', year: 2026, round: 1, tactic: 'balanced' } as const;
const playRegulation = { ...finish, pauseForGoldenPoint: true } as const;
const settle = { type: 'settleGoldenPoint', year: 2026, round: 1, clubId: 'storm', approach: 'standard' } as const;
const read = (state: NrlCareerState) => readNrlCareerSave(JSON.stringify(state));
const match = (state: NrlCareerState) => state.season.results.find(result => result.playerScoring)!;

const atMinute60 = (state: NrlCareerState) => reduceNrlCareer(state, { ...finish, type: 'reachMinute60' });
const finishFrom60 = { ...finish, type: 'finishMinute60' } as const;

describe('NRL Live golden point', () => {
  it.each([29, 88, 202])('keeps standard settlement game state identical to Quick Sim for seed %i', seed => {
    const started = live(seed);
    const paused = reduceNrlCareer(started, playRegulation);
    const checkpoint = paused.season.live?.goldenPoint;
    const quick = reduceNrlCareer(start(seed), advance);
    expect(checkpoint?.score).toBe(match(quick).scorePeriods!.regulation[0]);
    expect(paused).toEqual({ ...started, season: { ...started.season, live: { ...started.season.live, goldenPoint: checkpoint } } });
    expect(read(paused)).toEqual(paused);
    expect(reduceNrlCareer(paused, finish)).toBe(paused);
    expect(reduceNrlCareer(paused, advance)).toBe(paused);
    expect(reduceNrlCareer(paused, { ...settle, round: 2 })).toBe(paused);
    expect(reduceNrlCareer(paused, { ...settle, clubId: 'bears' })).toBe(paused);
    const finished = reduceNrlCareer(read(paused)!, settle);
    expect(match(finished).phaseScoring?.regulation).toEqual(checkpoint?.regulation);
    expect(JSON.stringify(finished)).toBe(JSON.stringify(quick));
    expect(reduceNrlCareer(finished, settle)).toBe(finished);
  });

  it('also pauses and replays a match played through 60 minutes', () => {
    const started = atMinute60(live(29));
    const expected = reduceNrlCareer(started, finishFrom60);
    const paused = reduceNrlCareer(started, { ...finishFrom60, pauseForGoldenPoint: true });
    expect(paused.season.live?.goldenPoint?.score).toBe(match(expected).scorePeriods!.regulation[0]);
    expect(reduceNrlCareer(read(paused)!, settle)).toEqual(expected);
    expect(reduceNrlCareer(paused, { ...finish, type: 'reachMinute60' })).toBe(paused);
    expect(reduceNrlCareer(paused, finishFrom60)).toBe(paused);
  });

  it('uses the actual halftime decision to identify a tie and rejects contradictory saved checkpoints', () => {
    const started = live(2);
    expect(reduceNrlCareer(started, playRegulation)).toEqual(reduceNrlCareer(started, finish));
    const paused = reduceNrlCareer(started, { ...playRegulation, tactic: 'attack' });
    const { season } = paused;
    const checkpoint = season.live!.goldenPoint!;
    expect(checkpoint.finish.tactic).toBe('attack');
    expect(read(paused)).toEqual(paused);
    const corrupt = (goldenPoint: typeof checkpoint) => read({ ...paused, season: { ...season, live: { ...season.live!, goldenPoint } } });
    expect(corrupt({ ...checkpoint, score: checkpoint.score + 2 })).toBeNull();
    expect(corrupt({ ...checkpoint, finish: { ...checkpoint.finish, round: 2 } })).toBeNull();
    expect(corrupt({ ...checkpoint, finish: { ...checkpoint.finish, tactic: 'balanced' } })).toBeNull();
    expect(reduceNrlCareer(paused, settle)).toEqual(reduceNrlCareer(started, { ...finish, tactic: 'attack' }));
  });

  it.each(['middle', 'wideRight'] as const)('replays the %s attack plan chosen only at 60 minutes', attackPlan => {
    const started = atMinute60(live(29));
    const throughRegulation = { ...finishFrom60, attackPlan } as const;
    const paused = reduceNrlCareer(started, { ...throughRegulation, pauseForGoldenPoint: true });
    expect(paused.season.live?.goldenPoint?.finish.attackPlan).toBe(attackPlan);
    const expected = reduceNrlCareer(started, throughRegulation);
    const restored = read(paused)!;
    expect(restored).toEqual(paused);
    expect(reduceNrlCareer(restored, settle)).toEqual(expected);
  });

  it.each([
    [208, 'chase', 'draw', 'win'],
    [274, 'protect', 'win', 'draw'],
    [559, 'protect', 'loss', 'draw'],
  ] as const)('changes only golden point for seed %i and approach %s', (seed, approach, usualOutcome, chosenOutcome) => {
    const paused = reduceNrlCareer(live(seed), playRegulation);
    const standard = reduceNrlCareer(paused, settle);
    const chosen = reduceNrlCareer(paused, { ...settle, approach });
    const expected = match(standard);
    const played = match(chosen);
    const clubOutcome = (result: typeof played) => result.homeScore === result.awayScore ? 'draw'
      : (result.homeScore > result.awayScore ? result.homeId : result.awayId) === 'storm' ? 'win' : 'loss';
    expect(clubOutcome(expected)).toBe(usualOutcome);
    expect(clubOutcome(played)).toBe(chosenOutcome);
    expect(played.scorePeriods).toEqual(expected.scorePeriods);
    expect(chosen.season.results.filter(row => !row.playerScoring)).toEqual(standard.season.results.filter(row => !row.playerScoring));
    expect(played.goldenPointApproach).toBe(approach);
    expect(read(chosen)).toEqual(chosen);
  });

  it('settles a tied final normally without a regular-season checkpoint or approach', () => {
    let season = start(14);
    for (let round = 1; round < 30; round++) season = reduceNrlCareer(season, advance);
    const started = reduceNrlCareer(season, { type: 'startLive' });
    const action = { ...finish, round: 30 };
    const expected = reduceNrlCareer(started, action);
    const final = expected.season.results.slice(season.season.results.length).find(row => row.playerScoring)!;
    expect(final.scorePeriods?.regulation).toEqual([6, 6]);
    expect([final.homeScore, final.awayScore]).toEqual([7, 6]);
    expect(final.goldenPointApproach).toBeUndefined();
    expect(reduceNrlCareer(started, { ...action, pauseForGoldenPoint: true })).toEqual(expected);
  });

  it.each([1, 2])('settles an untied match immediately for seed %i', seed => {
    const started = live(seed);
    const result = reduceNrlCareer(started, playRegulation);
    expect(result).toEqual(reduceNrlCareer(started, finish));
    expect(result.season.live).toBeUndefined();
    expect(match(result).extraTime).toBe(false);
  });
});
