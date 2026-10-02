import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFaceOff, type Mode } from '@/hooks/useFaceOff';
import { SHOT_CLOCK } from '@/lib/faceOff';

const clock = vi.hoisted(() => ({ now: 0 }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn() }));

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-01T16:00:00Z'));
  clock.now = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => clock.now);
  vi.spyOn(Math, 'random').mockReturnValue(0.42);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

function start(mode: Mode) {
  const view = renderHook(useFaceOff);
  act(() => view.result.current.start(mode, 'pro'));
  expect(view.result.current.current).not.toBeNull();
  expect(view.result.current.phase).toBe('playing');
  return view;
}
const expiry = [SHOT_CLOCK * 1000, (SHOT_CLOCK + 1) * 1000];

describe('Face Off answer-time deadline', () => {
  it.each(['daily', 'unlimited'] as Mode[])('preserves early correct %s scoring and one settlement', mode => {
    const view = start(mode), round = view.result.current.current!;
    clock.now = 2000;
    act(() => { view.result.current.pick(round.higher); view.result.current.pick(round.higher); });
    expect(view.result.current.results).toHaveLength(1);
    expect(view.result.current.lastResult).toMatchObject({ pick: round.higher, youCorrect: true, you: 180, secondsUsed: 2 });
    expect(view.result.current.lastResult?.rivalSeconds).toBe(round.rival.seconds);
    expect(view.result.current.lastResult?.rivalCorrect).toBe(round.rival.correct);
  });
  it.each(['daily', 'unlimited'] as Mode[])('preserves early wrong %s scoring', mode => {
    const view = start(mode), wrong = view.result.current.current!.higher === 'a' ? 'b' : 'a';
    clock.now = 2000;
    act(() => view.result.current.pick(wrong));
    expect(view.result.current.lastResult).toMatchObject({ pick: wrong, youCorrect: false, you: 0, secondsUsed: 2 });
  });
  it('preserves ordinary interval timeout and starts the next round with a new clock', () => {
    const view = start('unlimited');
    clock.now = expiry[0];
    act(() => vi.advanceTimersByTime(100));
    expect(view.result.current.lastResult).toMatchObject({ pick: null, youCorrect: false, you: 0, secondsUsed: SHOT_CLOCK });
    act(() => view.result.current.next());
    const round = view.result.current.current!;
    clock.now += 2000;
    act(() => view.result.current.pick(round.higher));
    expect(view.result.current.results).toHaveLength(2);
    expect(view.result.current.lastResult).toMatchObject({ you: 180, secondsUsed: 2 });
  });
  it.each((['daily', 'unlimited'] as Mode[]).flatMap(mode => expiry.map(ms => [mode, ms] as const)))('rejects %s correct input at %ims while interval callbacks are delayed', (mode, ms) => {
    const view = start(mode), round = view.result.current.current!;
    clock.now = ms;
    expect(view.result.current.elapsed).toBe(0);
    act(() => view.result.current.pick(round.higher));
    expect(view.result.current.phase).toBe('reveal');
    expect(view.result.current.lastResult).toMatchObject({ pick: null, youCorrect: false, you: 0, secondsUsed: SHOT_CLOCK });
  });
  it.each(expiry)('rejects Player 1 at %ims and preserves Player 2 own early clock', ms => {
    const view = start('versus'), right = view.result.current.current!.higher;
    clock.now = ms;
    act(() => view.result.current.pick(right));
    expect(view.result.current.phase).toBe('handoff');
    expect(view.result.current.results).toHaveLength(0);
    clock.now += 5000;
    act(() => view.result.current.ready());
    clock.now += 3000;
    act(() => view.result.current.pick(right));
    expect(view.result.current.lastResult).toMatchObject({ pick: null, youCorrect: false, you: 0, secondsUsed: SHOT_CLOCK, rivalPick: right, rivalCorrect: true, rival: 170, rivalSeconds: 3 });
  });
  it.each(expiry)('rejects Player 2 at %ims and preserves Player 1 early score', ms => {
    const view = start('versus'), right = view.result.current.current!.higher;
    clock.now = 2000;
    act(() => view.result.current.pick(right));
    clock.now += 5000;
    act(() => view.result.current.ready());
    clock.now += ms;
    act(() => view.result.current.pick(right));
    expect(view.result.current.lastResult).toMatchObject({ pick: right, youCorrect: true, you: 180, secondsUsed: 2, rivalPick: null, rivalCorrect: false, rival: 0, rivalSeconds: SHOT_CLOCK });
  });
  it('settles both expired chairs once without changing their round', () => {
    const view = start('versus'), round = view.result.current.current!;
    clock.now = expiry[1];
    act(() => view.result.current.pick(round.higher));
    act(() => view.result.current.ready());
    clock.now += expiry[1];
    act(() => { view.result.current.pick(round.higher); view.result.current.pick(round.higher); });
    expect(view.result.current.current).toBe(round);
    expect(view.result.current.results).toHaveLength(1);
    expect(view.result.current.lastResult).toMatchObject({ pick: null, youCorrect: false, you: 0, rivalPick: null, rivalCorrect: false, rival: 0 });
  });
  it('settles an expired solo pick once even when click and timeout meet', () => {
    const view = start('daily'), right = view.result.current.current!.higher;
    clock.now = expiry[1];
    act(() => { view.result.current.pick(right); vi.advanceTimersByTime(100); view.result.current.pick(right); });
    expect(view.result.current.results).toHaveLength(1);
    expect(view.result.current.lastResult).toMatchObject({ pick: null, youCorrect: false, you: 0 });
  });
});
