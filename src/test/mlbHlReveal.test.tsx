import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMlbHL } from '@/hooks/useMlbHL';
import { mlbHLPlayers } from '@/data/mlbHLPlayers';
import { higherLowerScore } from '@/lib/higherLowerScore';
import { consumeRestoredFinish } from '@/lib/restoredFinish';

const fixture = vi.hoisted(() => ({ record: vi.fn(), refresh: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: fixture.refresh }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: fixture.record, getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

type Game = ReturnType<typeof useMlbHL>;
const key = 'mlb-hl-daily-2026-10-01';
const choose = (game: Game) => game.currentPair![0].careerHrs >= game.currentPair![1].careerHrs ? 'left' as const : 'right' as const;
const scores = [10, 25, 45, 70, 100, 135, 175, 220, 270, 325];

function trackReveals() {
  const original = globalThis.setTimeout;
  const originalClear = globalThis.clearTimeout;
  const live = new Set<ReturnType<typeof setTimeout>>();
  const callbacks: (() => void)[] = [];
  let fired = 0;
  vi.spyOn(globalThis, 'setTimeout').mockImplementation(((callback: () => void, ms: number, ...args: unknown[]) => {
    if (ms !== 2000) return original(callback, ms, ...args);
    callbacks.push(callback);
    let handle: ReturnType<typeof setTimeout>;
    handle = original(() => { live.delete(handle); fired++; callback(); }, ms, ...args);
    live.add(handle);
    return handle;
  }) as typeof setTimeout);
  vi.spyOn(globalThis, 'clearTimeout').mockImplementation(((handle: ReturnType<typeof setTimeout>) => {
    live.delete(handle);
    originalClear(handle);
  }) as typeof clearTimeout);
  return { live, callbacks, fired: () => fired };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-01T16:00:00Z'));
  vi.spyOn(Math, 'random').mockReturnValue(.01234);
  localStorage.clear();
  fixture.record.mockReset();
  consumeRestoredFinish('mlb-higher-lower');
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('Actual MLB Higher or Lower reveal ownership', () => {
  it('holds original ten-round daily 325 exact saves once completion and quiet restore', () => {
    const view = renderHook(useMlbHL);
    expect(view.result.current.isLoading).toBe(false);
    for (let i = 0; i < 10; i++) {
      const pair = view.result.current.currentPair!;
      expect(mlbHLPlayers).toContain(pair[0]); expect(mlbHLPlayers).toContain(pair[1]);
      act(() => view.result.current.makeGuess(choose(view.result.current)));
      expect(JSON.parse(localStorage.getItem(key)!)).toEqual({ v: 1, date: '2026-10-01', puzzleIndex: 0,
        guesses: Array.from({ length: i + 1 }, () => ({ t: 'result', correct: true })), gameStatus: i === 9 ? 'won' : 'playing' });
      expect(view.result.current.currentRound).toBe(i);
      expect(view.result.current.totalScore).toBe(i ? scores[i - 1] : 0);
      expect(view.result.current.results[i].player1).toBe(pair[0]); expect(view.result.current.results[i].player2).toBe(pair[1]);
      expect(fixture.record).toHaveBeenCalledTimes(i === 9 ? 1 : 0);
      act(() => vi.advanceTimersByTime(2000));
      expect(view.result.current.currentRound).toBe(i + 1);
      expect(view.result.current.totalScore).toBe(scores[i]);
      expect(view.result.current.correctCount).toBe(i + 1);
      expect(view.result.current.streak).toBe(i + 1);
    }
    expect(view.result.current.gameStatus).toBe('complete');
    expect(view.result.current.totalScore).toBe(higherLowerScore(view.result.current.results));
    expect(fixture.record.mock.calls).toEqual([['/mlb-higher-lower', 325, null, 0]]);
    const raw = localStorage.getItem(key);
    act(() => view.result.current.makeGuess('left'));
    expect(localStorage.getItem(key)).toBe(raw);
    view.unmount();
    const restored = renderHook(useMlbHL);
    expect(restored.result.current.gameStatus).toBe('complete'); expect(restored.result.current.totalScore).toBe(325);
    expect(restored.result.current.results.map(r => r.correct)).toEqual(Array(10).fill(true));
    expect(localStorage.getItem(key)).toBe(raw); expect(fixture.record).toHaveBeenCalledTimes(1);
    act(() => restored.result.current.switchMode('unlimited'));
    act(() => restored.result.current.switchMode('daily'));
    expect(restored.result.current.totalScore).toBe(325); expect(fixture.record).toHaveBeenCalledTimes(1);
  });

  it('holds original ten-round Unlimited 325 pairs and no daily save or completion', () => {
    const view = renderHook(useMlbHL);
    act(() => view.result.current.switchMode('unlimited'));
    for (let i = 0; i < 10; i++) {
      const pair = view.result.current.currentPair!;
      act(() => view.result.current.makeGuess(choose(view.result.current)));
      expect(view.result.current.currentRound).toBe(i);
      expect(view.result.current.totalScore).toBe(i ? scores[i - 1] : 0);
      act(() => vi.advanceTimersByTime(2000));
      expect(view.result.current.results[i].player1).toBe(pair[0]); expect(view.result.current.results[i].player2).toBe(pair[1]);
      expect(view.result.current.totalScore).toBe(scores[i]); expect(view.result.current.currentRound).toBe(i + 1);
    }
    expect(view.result.current.gameStatus).toBe('complete'); expect(view.result.current.correctCount).toBe(10);
    expect(view.result.current.totalScore).toBe(higherLowerScore(view.result.current.results));
    expect(localStorage.getItem(key)).toBeNull(); expect(fixture.record).not.toHaveBeenCalled();
  });

  it('cancels an abandoned Unlimited reveal before a fresh mode run can score or skip', () => {
    const timers = trackReveals(); const view = renderHook(useMlbHL);
    act(() => view.result.current.switchMode('unlimited'));
    act(() => view.result.current.makeGuess(choose(view.result.current)));
    expect(timers.live.size).toBe(1);
    act(() => view.result.current.switchMode('daily'));
    act(() => view.result.current.switchMode('unlimited'));
    const pair = view.result.current.currentPair;
    expect(timers.live.size).toBe(0);
    act(() => vi.advanceTimersByTime(2000));
    expect(view.result.current.currentRound).toBe(0); expect(view.result.current.results).toEqual([]);
    expect(view.result.current.totalScore).toBe(0); expect(view.result.current.currentPair).toBe(pair);
    expect(timers.fired()).toBe(0); expect(localStorage.getItem(key)).toBeNull(); expect(fixture.record).not.toHaveBeenCalled();
  });

  it('cancels the previous Unlimited reveal before Hard resets its pairs and score', () => {
    const timers = trackReveals(); const view = renderHook(useMlbHL);
    act(() => view.result.current.switchMode('unlimited'));
    act(() => view.result.current.makeGuess(choose(view.result.current)));
    act(() => view.result.current.toggleHard());
    expect(view.result.current.hard).toBe(true); expect(timers.live.size).toBe(0);
    const pair = view.result.current.currentPair;
    act(() => vi.advanceTimersByTime(2000));
    expect(view.result.current.currentRound).toBe(0); expect(view.result.current.results).toEqual([]);
    expect(view.result.current.totalScore).toBe(0); expect(view.result.current.currentPair).toBe(pair);
    expect(timers.fired()).toBe(0); expect(fixture.record).not.toHaveBeenCalled();
  });

  it('keeps a fresh Unlimited reveal visible for its own full two seconds after leaving daily', () => {
    const view = renderHook(useMlbHL);
    act(() => view.result.current.makeGuess(choose(view.result.current)));
    const raw = localStorage.getItem(key);
    act(() => vi.advanceTimersByTime(1000));
    act(() => view.result.current.switchMode('unlimited'));
    act(() => view.result.current.makeGuess(choose(view.result.current)));
    act(() => vi.advanceTimersByTime(1000));
    expect(view.result.current.showingResult).toBe(true); expect(view.result.current.results).toHaveLength(1);
    expect(view.result.current.currentRound).toBe(0); expect(view.result.current.totalScore).toBe(0);
    act(() => vi.advanceTimersByTime(1000));
    expect(view.result.current.showingResult).toBe(false); expect(view.result.current.currentRound).toBe(1);
    expect(view.result.current.totalScore).toBe(10); expect(localStorage.getItem(key)).toBe(raw);
    expect(fixture.record).not.toHaveBeenCalled();
  });

  it('clears the exact owned reveal on unmount without executing late callback work', () => {
    const timers = trackReveals(); const view = renderHook(useMlbHL);
    act(() => view.result.current.switchMode('unlimited'));
    act(() => view.result.current.makeGuess(choose(view.result.current)));
    expect(timers.live.size).toBe(1); view.unmount(); expect(timers.live.size).toBe(0);
    act(() => vi.advanceTimersByTime(2000));
    expect(timers.fired()).toBe(0); expect(fixture.record).not.toHaveBeenCalled();
  });

  it('rejects a delivered obsolete callback without clearing the newer accepted reveal', () => {
    const timers = trackReveals(); const view = renderHook(useMlbHL);
    act(() => view.result.current.switchMode('unlimited'));
    act(() => view.result.current.makeGuess(choose(view.result.current)));
    const obsolete = timers.callbacks[0];
    act(() => view.result.current.switchMode('unlimited'));
    act(() => view.result.current.makeGuess(choose(view.result.current)));
    const pair = view.result.current.currentPair;
    act(() => obsolete());
    expect(view.result.current.showingResult).toBe(true); expect(view.result.current.currentRound).toBe(0);
    expect(view.result.current.results).toHaveLength(1); expect(view.result.current.totalScore).toBe(0);
    expect(view.result.current.currentPair).toBe(pair); expect(timers.live.size).toBe(1);
    act(() => vi.advanceTimersByTime(2000));
    expect(view.result.current.currentRound).toBe(1); expect(view.result.current.results).toHaveLength(1);
    expect(view.result.current.totalScore).toBe(10); expect(timers.fired()).toBe(1);
  });

  it('retains the original 2000ms reveal and one timer through quiet rerenders', () => {
    const timers = trackReveals(); const view = renderHook(useMlbHL);
    act(() => view.result.current.makeGuess(choose(view.result.current)));
    const handle = [...timers.live][0]; const pair = view.result.current.currentPair;
    view.rerender(); view.rerender();
    expect([...timers.live]).toEqual([handle]); expect(view.result.current.currentPair).toBe(pair);
    act(() => vi.advanceTimersByTime(1999));
    expect(view.result.current.showingResult).toBe(true); expect(view.result.current.currentRound).toBe(0);
    act(() => vi.advanceTimersByTime(1));
    expect(view.result.current.showingResult).toBe(false); expect(view.result.current.currentRound).toBe(1);
    expect(view.result.current.totalScore).toBe(10); expect(timers.fired()).toBe(1); expect(timers.live.size).toBe(0);
  });

  it('preserves either-side correctness for an actual tied career home-run pair', () => {
    vi.mocked(Math.random).mockReturnValue(.00053);
    const view = renderHook(useMlbHL);
    act(() => view.result.current.switchMode('unlimited'));
    expect(view.result.current.currentPair?.map(p => [p.name, p.careerHrs])).toEqual([['Ernie Banks', 512], ['Eddie Mathews', 512]]);
    act(() => view.result.current.makeGuess('right'));
    expect(view.result.current.results[0].correct).toBe(true);
    act(() => vi.advanceTimersByTime(2000)); expect(view.result.current.totalScore).toBe(10);
    act(() => view.result.current.switchMode('unlimited'));
    act(() => view.result.current.makeGuess('left'));
    act(() => vi.advanceTimersByTime(2000)); expect(view.result.current.totalScore).toBe(10);
    expect(localStorage.getItem(key)).toBeNull(); expect(fixture.record).not.toHaveBeenCalled();
  });

  it('retains an accepted immediate daily save through canceled reveal and quiet reload', () => {
    const timers = trackReveals(); const view = renderHook(useMlbHL);
    act(() => view.result.current.makeGuess(choose(view.result.current)));
    const raw = localStorage.getItem(key)!; expect(JSON.parse(raw).guesses).toEqual([{ t: 'result', correct: true }]);
    act(() => view.result.current.switchMode('unlimited'));
    expect(timers.live.size).toBe(0); view.unmount();
    const restored = renderHook(useMlbHL);
    expect(restored.result.current.mode).toBe('daily'); expect(restored.result.current.currentRound).toBe(1);
    expect(restored.result.current.totalScore).toBe(10); expect(restored.result.current.showingResult).toBe(false);
    expect(localStorage.getItem(key)).toBe(raw); expect(timers.live.size).toBe(0); expect(fixture.record).not.toHaveBeenCalled();
  });
});
