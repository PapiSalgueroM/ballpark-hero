import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useHigherLower } from '@/hooks/useHigherLower';
import { higherLowerPlayers } from '@/data/higherLowerPlayers';
import { consumeRestoredFinish } from '@/lib/restoredFinish';
import type { HigherLowerStatKey } from '@/types/higherLower';

const fixture = vi.hoisted(() => ({ record: vi.fn(), refresh: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: fixture.refresh }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: fixture.record, getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

type Game = ReturnType<typeof useHigherLower>;
const stats: HigherLowerStatKey[] = ['appearances', 'goals', 'internationalCaps'];
const choice = (g: Game, correct: boolean) => stats.find(s => (g.currentPlayer.stats[s] >= g.nextPlayer.stats[s]) === correct)!;

function mixedOpeningPair() {
  const first = higherLowerPlayers.find(a => higherLowerPlayers.some(b => b !== a &&
    stats.some(s => a.stats[s] >= b.stats[s]) && stats.some(s => a.stats[s] < b.stats[s])))!;
  const eligible = higherLowerPlayers.filter(b => b !== first && stats.some(s => first.stats[s] >= b.stats[s]));
  const second = eligible.find(b => stats.some(s => first.stats[s] < b.stats[s]))!;
  vi.mocked(Math.random).mockReturnValueOnce((higherLowerPlayers.indexOf(first) + .5) / higherLowerPlayers.length)
    .mockReturnValueOnce((eligible.indexOf(second) + .5) / eligible.length);
  return { first, second };
}

function trackReveals() {
  const original = globalThis.setTimeout, originalClear = globalThis.clearTimeout;
  const live = new Set<ReturnType<typeof setTimeout>>(), callbacks: (() => void)[] = [];
  let fired = 0;
  vi.spyOn(globalThis, 'setTimeout').mockImplementation(((cb: () => void, ms: number, ...args: unknown[]) => {
    if (ms !== 3000) return original(cb, ms, ...args);
    callbacks.push(cb);
    let handle: ReturnType<typeof setTimeout>;
    handle = original(() => { live.delete(handle); fired++; cb(); }, ms, ...args);
    live.add(handle);
    return handle;
  }) as typeof setTimeout);
  vi.spyOn(globalThis, 'clearTimeout').mockImplementation(((handle: ReturnType<typeof setTimeout>) => {
    live.delete(handle); originalClear(handle);
  }) as typeof clearTimeout);
  return { live, callbacks, fired: () => fired };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(Math, 'random').mockReturnValue(.01234);
  localStorage.clear(); fixture.record.mockReset(); consumeRestoredFinish('higher-lower');
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('Actual soccer Higher or Lower reveal ownership', () => {
  it('preserves normal three-second pair shifts RNG streak best and once completion', () => {
    const view = renderHook(useHigherLower);
    expect(vi.mocked(Math.random).mock.calls.length).toBe(4);
    for (let i = 0; i < 3; i++) {
      const { currentPlayer, nextPlayer } = view.result.current;
      expect(higherLowerPlayers).toContain(currentPlayer); expect(higherLowerPlayers).toContain(nextPlayer);
      const draws = vi.mocked(Math.random).mock.calls.length;
      act(() => view.result.current.chooseStat(choice(view.result.current, true)));
      act(() => vi.advanceTimersByTime(2999));
      expect(view.result.current.revealedStats).toBe(true); expect(view.result.current.streak).toBe(i);
      expect(view.result.current.currentPlayer).toBe(currentPlayer);
      act(() => vi.advanceTimersByTime(1));
      expect(view.result.current.currentPlayer).toBe(nextPlayer);
      expect(view.result.current.nextPlayer).not.toBe(nextPlayer);
      expect(higherLowerPlayers).toContain(view.result.current.nextPlayer);
      expect(stats.some(s => nextPlayer.stats[s] >= view.result.current.nextPlayer.stats[s])).toBe(true);
      expect(view.result.current.streak).toBe(i + 1); expect(view.result.current.bestStreak).toBe(i + 1);
      expect(view.result.current.revealedStats).toBe(false); expect(view.result.current.lastChoice).toBeNull();
      expect(vi.mocked(Math.random).mock.calls.length).toBe(draws + 3);
    }
    expect(fixture.record).not.toHaveBeenCalled();
    act(() => view.result.current.giveUp()); view.rerender(); act(() => view.result.current.giveUp());
    expect(fixture.record.mock.calls).toEqual([['/higher-lower', 300, null, 0]]);
    act(() => view.result.current.resetGame());
    expect(view.result.current.bestStreak).toBe(3); expect(view.result.current.streak).toBe(0);
    act(() => view.result.current.chooseStat(choice(view.result.current, true)));
    act(() => vi.advanceTimersByTime(3000)); act(() => view.result.current.giveUp());
    expect(fixture.record.mock.calls).toEqual([['/higher-lower', 300, null, 0], ['/higher-lower', 100, null, 0]]);
    expect(localStorage.length).toBe(0);
  });

  it.each([true, false])('keeps a fresh run quiet after an abandoned %s pick Give up and Play again', correct => {
    const pair = mixedOpeningPair(), view = renderHook(useHigherLower);
    expect(view.result.current.currentPlayer).toBe(pair.first); expect(view.result.current.nextPlayer).toBe(pair.second);
    const stat = choice(view.result.current, correct); expect(stat).toBeDefined();
    act(() => view.result.current.chooseStat(stat));
    expect(view.result.current.lastChoice).toEqual({ stat, correct });
    act(() => vi.advanceTimersByTime(1000)); act(() => view.result.current.giveUp());
    expect(fixture.record.mock.calls).toEqual([['/higher-lower', 0, null, 0]]);
    act(() => view.result.current.resetGame());
    const current = view.result.current.currentPlayer, next = view.result.current.nextPlayer;
    const draws = vi.mocked(Math.random).mock.calls.length;
    act(() => vi.advanceTimersByTime(2000));
    expect(view.result.current.gameStatus).toBe('playing'); expect(view.result.current.streak).toBe(0);
    expect(view.result.current.bestStreak).toBe(0); expect(view.result.current.currentPlayer).toBe(current);
    expect(view.result.current.nextPlayer).toBe(next); expect(view.result.current.lastChoice).toBeNull();
    expect(view.result.current.revealedStats).toBe(false); expect(vi.mocked(Math.random).mock.calls.length).toBe(draws);
    expect(fixture.record).toHaveBeenCalledTimes(1);
  });

  it('clears actual reveal handles on Give up reset and unmount', () => {
    const timers = trackReveals(), view = renderHook(useHigherLower);
    act(() => view.result.current.chooseStat(choice(view.result.current, true)));
    expect(timers.live.size).toBe(1); act(() => view.result.current.giveUp()); expect(timers.live.size).toBe(0);
    act(() => view.result.current.resetGame()); act(() => view.result.current.chooseStat(choice(view.result.current, true)));
    expect(timers.live.size).toBe(1); act(() => view.result.current.resetGame()); expect(timers.live.size).toBe(0);
    act(() => view.result.current.chooseStat(choice(view.result.current, true)));
    expect(timers.live.size).toBe(1); view.unmount(); expect(timers.live.size).toBe(0);
    const draws = vi.mocked(Math.random).mock.calls.length;
    act(() => vi.advanceTimersByTime(3000)); expect(timers.fired()).toBe(0);
    expect(vi.mocked(Math.random).mock.calls.length).toBe(draws); expect(fixture.record).toHaveBeenCalledTimes(1);
  });

  it('rejects delivered obsolete correct and wrong callbacks while the new reveal keeps its full three seconds', () => {
    const timers = trackReveals(); mixedOpeningPair(); const view = renderHook(useHigherLower);
    act(() => view.result.current.chooseStat(choice(view.result.current, false))); act(() => view.result.current.resetGame());
    act(() => view.result.current.chooseStat(choice(view.result.current, true))); act(() => view.result.current.resetGame());
    act(() => view.result.current.chooseStat(choice(view.result.current, true)));
    const current = view.result.current.currentPlayer, next = view.result.current.nextPlayer, accepted = view.result.current.lastChoice;
    act(() => { timers.callbacks[0](); timers.callbacks[1](); });
    expect(view.result.current.gameStatus).toBe('playing'); expect(view.result.current.streak).toBe(0);
    expect(view.result.current.currentPlayer).toBe(current); expect(view.result.current.nextPlayer).toBe(next);
    expect(view.result.current.revealedStats).toBe(true); expect(view.result.current.lastChoice).toBe(accepted);
    expect(timers.live.size).toBe(1); view.rerender();
    act(() => vi.advanceTimersByTime(2999)); expect(view.result.current.revealedStats).toBe(true);
    act(() => vi.advanceTimersByTime(1)); expect(view.result.current.streak).toBe(1);
    expect(view.result.current.currentPlayer).toBe(next); expect(timers.fired()).toBe(1);
    expect(fixture.record).not.toHaveBeenCalled();
  });

  it('retains an ordinary wrong result after exactly three seconds with its original pair and zero score', () => {
    const pair = mixedOpeningPair(), view = renderHook(useHigherLower), stat = choice(view.result.current, false);
    expect(stat).toBeDefined(); act(() => view.result.current.chooseStat(stat));
    act(() => vi.advanceTimersByTime(2999)); expect(view.result.current.gameStatus).toBe('playing');
    act(() => vi.advanceTimersByTime(1)); expect(view.result.current.gameStatus).toBe('lost');
    expect(view.result.current.currentPlayer).toBe(pair.first); expect(view.result.current.nextPlayer).toBe(pair.second);
    expect(view.result.current.lastChoice).toEqual({ stat, correct: false }); expect(view.result.current.revealedStats).toBe(true);
    expect(fixture.record.mock.calls).toEqual([['/higher-lower', 0, null, 0]]);
  });
});
