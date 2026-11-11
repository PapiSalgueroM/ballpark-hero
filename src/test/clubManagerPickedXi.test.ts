import { beforeAll, describe, expect, it } from 'vitest';
import { isAvailable, matchFacts, matchStrengthNow, playNextEntry, startCareer, type CareerState } from '@/lib/clubManager';
import { simToWeek } from '@/lib/clubManagerCalendar';
import { dailyHotSeat, handoverState, replayHotSeat, withSeed } from '@/lib/managerHotSeat';

let career: CareerState;
let replacement: string;
let expected: (string | null)[];

beforeAll(() => {
  career = withSeed(3, () => startCareer('Arsenal'));
  for (const seed of [20, 21, 22]) {
    const match = withSeed(seed, () => playNextEntry(career, { skipHalftime: true }));
    expect(match.kind).toBe('match');
    career = match.state;
  }
  const player = (id: string | null) => career.squad.find(p => p.id === id)!;
  const picked = career.xiIds.map(player);
  expect(career.resultLog?.at(-1)).toMatchObject({ opp: 'Chelsea', score: '3-1' });
  expect(picked[2]).toMatchObject({ name: 'Gabriel', suspendedMatches: 1 });
  expect(picked[3].name).toBe('Piero Hincapié');
  expect(picked[8].name).toBe('Bukayo Saka');
  expect(picked.filter(p => !isAvailable(p)).map(p => p.name)).toEqual(['Gabriel']);
  const reserve = career.squad.find(p => p.name === 'Ezri Konsa')!;
  expect(isAvailable(reserve)).toBe(true);
  expect(career.xiIds).not.toContain(reserve.id);
  replacement = reserve.id;
  expected = [...career.xiIds];
  expected[2] = replacement;
});

it('preserves a saved Hot Seat Daily through its original press answer and result', () => {
  const press = { t: 'press', i: 0 } as const;
  const match = { t: 'match', m: 'balanced', talk: null } as const;
  const replay = replayHotSeat(dailyHotSeat('2026-11-08'), [press, match, press, match, match, press, match, match]);
  expect(replay.setup.club).toBe('Hoffenheim');
  expect(replay.log.map(({ opponent, myGoals, oppGoals }) => [opponent, myGoals, oppGoals])).toEqual([
    ['Gladbach', 1, 3], ['Freiburg', 0, 1], ['RB Leipzig', 0, 2],
    ['Schalke 04', 2, 0], ['Bayer Leverkusen', 0, 3],
  ]);
  expect(replay.verdict).toMatchObject({ kind: 'sacked', points: 3, target: 4 });
  expect(handoverState(replay)).not.toHaveProperty('lineupRules');
});

describe('Club Manager fills the vacant XI slot', () => {
  it('keeps the other selected players in their places when live play kicks off', () => {
    const kickoff = withSeed(23, () => playNextEntry(career));
    expect(kickoff.kind).toBe('halftime');
    expect(kickoff.live?.opponent).toBe('Thun');
    expect(kickoff.live?.startXi).toEqual(expected);
    expect(kickoff.state.xiIds).toEqual(career.xiIds);
    expect(kickoff.state.resultLog).toEqual(career.resultLog);
  });

  it('reads the same strength and odds as explicitly selecting the reserve', () => {
    const selected = { ...career, xiIds: expected };
    expect(matchStrengthNow(career)).toBe(matchStrengthNow(selected));
    expect(matchFacts(career)).toEqual(matchFacts(selected));
  });

  it('credits the reserve with a start through Quick Sim and the calendar', () => {
    const quick = withSeed(23, () => playNextEntry(career, { skipHalftime: true }));
    const calendar = withSeed(23, () => simToWeek(career, career.week + 1));
    expect(quick.kind).toBe('match');
    expect(calendar.lastReport).toEqual(quick.report);
    for (const state of [quick.state, calendar.state]) {
      expect(state.squad.find(p => p.id === replacement)?.lastTen?.at(-1)).toBe(1);
      expect(state.xiIds).toEqual(career.xiIds);
    }
  });
});
