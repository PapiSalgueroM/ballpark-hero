import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAflHL } from '@/hooks/useAflHL';
import { useCfbHL } from '@/hooks/useCfbHL';
import { useF1HL } from '@/hooks/useF1HL';
import { useGolfHL } from '@/hooks/useGolfHL';
import { useHockeyHL } from '@/hooks/useHockeyHL';
import { useNbaHL } from '@/hooks/useNbaHL';
import { useNflHL } from '@/hooks/useNflHL';
import { useTennisHL } from '@/hooks/useTennisHL';
import { higherLowerScore } from '@/lib/higherLowerScore';
import { consumeRestoredFinish } from '@/lib/restoredFinish';

const fixture = vi.hoisted(() => ({ record: vi.fn(), refresh: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: fixture.refresh }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: fixture.record, getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

type Game = ReturnType<typeof useAflHL> | ReturnType<typeof useCfbHL> | ReturnType<typeof useF1HL> | ReturnType<typeof useGolfHL> | ReturnType<typeof useHockeyHL> | ReturnType<typeof useNbaHL> | ReturnType<typeof useNflHL> | ReturnType<typeof useTennisHL>;
type Player = NonNullable<Game['currentPair']>[number];
const cases = [
  { name: 'Afl', slug: 'afl-higher-lower', storage: 'afl-hl', hook: useAflHL },
  { name: 'Cfb', slug: 'cfb-higher-lower', storage: 'cfb-hl', hook: useCfbHL },
  { name: 'F1', slug: 'f1-higher-lower', storage: 'f1-hl', hook: useF1HL },
  { name: 'Golf', slug: 'golf-higher-lower', storage: 'golf-hl', hook: useGolfHL },
  { name: 'Hockey', slug: 'hockey-higher-lower', storage: 'hockey-hl', hook: useHockeyHL },
  { name: 'Nba', slug: 'nba-higher-lower', storage: 'nba-hl', hook: useNbaHL },
  { name: 'Nfl', slug: 'nfl-higher-lower', storage: 'nfl-hl', hook: useNflHL },
  { name: 'Tennis', slug: 'tennis-higher-lower', storage: 'tennis-hl', hook: useTennisHL },
];
function stat(player: Player): number {
  if ('goals' in player) return player.goals;
  if ('careerPassYds' in player) return player.careerPassYds;
  if ('careerWins' in player) return player.careerWins;
  if ('majors' in player) return player.majors;
  if ('careerPoints' in player) return player.careerPoints;
  if ('slams' in player) return player.slams;
  if ('value' in player) return player.value;
  throw new Error('Unknown original authored stat');
}
const choose = (game: Game) => stat(game.currentPair![0]) > stat(game.currentPair![1]) ? 'left' as const : 'right' as const;
const resultPair = (result: Game['results'][number]): [Player, Player] => 'player1' in result ? [result.player1, result.player2] : [result.p1, result.p2];
const scores = [10, 25, 45, 70, 100, 135, 175, 220, 270, 325];
function trackReveals() {
  const original = globalThis.setTimeout, originalClear = globalThis.clearTimeout;
  const live = new Set<ReturnType<typeof setTimeout>>(), callbacks: (() => void)[] = [];
  let fired = 0;
  vi.spyOn(globalThis, 'setTimeout').mockImplementation(((callback: () => void, ms: number, ...args: unknown[]) => {
    if (ms !== 2000) return original(callback, ms, ...args);
    callbacks.push(callback);
    let handle: ReturnType<typeof setTimeout>;
    handle = original(() => { live.delete(handle); fired++; callback(); }, ms, ...args);
    live.add(handle); return handle;
  }) as typeof setTimeout);
  vi.spyOn(globalThis, 'clearTimeout').mockImplementation(((handle: ReturnType<typeof setTimeout>) => { live.delete(handle); originalClear(handle); }) as typeof clearTimeout);
  return { live, callbacks, fired: () => fired };
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-01T16:00:00Z'));
  vi.spyOn(Math, 'random').mockReturnValue(.01234); localStorage.clear(); fixture.record.mockReset();
  for (const row of cases) consumeRestoredFinish(row.slug);
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.restoreAllMocks(); vi.useRealTimers(); });

for (const row of cases) describe(row.name + ' Higher or Lower reveal ownership', () => {
  const key = row.storage + '-daily-2026-10-01';
  const draw = () => renderHook(() => row.hook());

  it('holds original whole-game Daily325 exact saves once booking and quiet restore', () => {
    const view = draw(); expect(view.result.current.isLoading).toBe(false);
    for (let i = 0; i < 10; i++) {
      const pair = view.result.current.currentPair!;
      act(() => view.result.current.makeGuess(choose(view.result.current)));
      expect(JSON.parse(localStorage.getItem(key)!)).toEqual({ v: 1, date: '2026-10-01', puzzleIndex: 0,
        guesses: Array.from({ length: i + 1 }, () => ({ t: 'result', correct: true })), gameStatus: i === 9 ? 'won' : 'playing' });
      expect(view.result.current.currentRound).toBe(i); expect(view.result.current.totalScore).toBe(i ? scores[i - 1] : 0);
      const accepted = resultPair(view.result.current.results[i]); expect(accepted[0]).toBe(pair[0]); expect(accepted[1]).toBe(pair[1]);
      expect(fixture.record).toHaveBeenCalledTimes(i === 9 ? 1 : 0);
      act(() => vi.advanceTimersByTime(2000));
      expect(view.result.current.currentRound).toBe(i + 1); expect(view.result.current.totalScore).toBe(scores[i]);
      expect(view.result.current.correctCount).toBe(i + 1); expect(view.result.current.streak).toBe(i + 1);
    }
    expect(view.result.current.gameStatus).toBe('complete'); expect(view.result.current.totalScore).toBe(higherLowerScore(view.result.current.results));
    expect(fixture.record.mock.calls).toEqual([['/' + row.slug, 325, null, 0]]);
    expect(vi.mocked(Math.random)).toHaveBeenCalledTimes(1);
    const raw = localStorage.getItem(key); act(() => view.result.current.makeGuess('left')); expect(localStorage.getItem(key)).toBe(raw);
    view.unmount(); const restored = draw();
    expect(restored.result.current.gameStatus).toBe('complete'); expect(restored.result.current.totalScore).toBe(325);
    expect(restored.result.current.results.map(r => r.correct)).toEqual(Array(10).fill(true)); expect(localStorage.getItem(key)).toBe(raw);
    act(() => restored.result.current.switchMode('unlimited')); act(() => restored.result.current.switchMode('daily'));
    expect(restored.result.current.totalScore).toBe(325); expect(fixture.record).toHaveBeenCalledTimes(1);
  });

  it('holds original whole-game Unlimited325 player objects RNG and no daily booking', () => {
    const view = draw(); act(() => view.result.current.switchMode('unlimited'));
    for (let i = 0; i < 10; i++) {
      const pair = view.result.current.currentPair!; act(() => view.result.current.makeGuess(choose(view.result.current)));
      expect(view.result.current.currentRound).toBe(i); expect(view.result.current.totalScore).toBe(i ? scores[i - 1] : 0);
      act(() => vi.advanceTimersByTime(2000)); const result = resultPair(view.result.current.results[i]);
      expect(result[0]).toBe(pair[0]); expect(result[1]).toBe(pair[1]); expect(view.result.current.totalScore).toBe(scores[i]);
      expect(view.result.current.currentRound).toBe(i + 1);
    }
    expect(view.result.current.gameStatus).toBe('complete'); expect(view.result.current.correctCount).toBe(10);
    expect(view.result.current.totalScore).toBe(higherLowerScore(view.result.current.results));
    expect(vi.mocked(Math.random)).toHaveBeenCalledTimes(2); expect(localStorage.getItem(key)).toBeNull(); expect(fixture.record).not.toHaveBeenCalled();
  });

  it('cancels abandoned mode reveal without scoring or skipping a fresh run', () => {
    const timers = trackReveals(), view = draw(); act(() => view.result.current.switchMode('unlimited'));
    act(() => view.result.current.makeGuess(choose(view.result.current))); expect(timers.live.size).toBe(1);
    act(() => view.result.current.switchMode('daily')); act(() => view.result.current.switchMode('unlimited'));
    const pair = view.result.current.currentPair!; expect(timers.live.size).toBe(0); act(() => vi.advanceTimersByTime(2000));
    expect(view.result.current.currentRound).toBe(0); expect(view.result.current.totalScore).toBe(0); expect(view.result.current.results).toEqual([]);
    expect(view.result.current.currentPair![0]).toBe(pair[0]); expect(view.result.current.currentPair![1]).toBe(pair[1]);
    expect(timers.fired()).toBe(0); expect(localStorage.getItem(key)).toBeNull(); expect(fixture.record).not.toHaveBeenCalled();
  });

  it('cancels previous reveal before Hard replaces its pairs and score', () => {
    const timers = trackReveals(), view = draw(); act(() => view.result.current.switchMode('unlimited'));
    act(() => view.result.current.makeGuess(choose(view.result.current))); act(() => view.result.current.toggleHard());
    expect(view.result.current.hard).toBe(true); expect(timers.live.size).toBe(0); const pair = view.result.current.currentPair!;
    act(() => vi.advanceTimersByTime(2000)); expect(view.result.current.currentRound).toBe(0); expect(view.result.current.totalScore).toBe(0);
    expect(view.result.current.results).toEqual([]); expect(view.result.current.currentPair![0]).toBe(pair[0]); expect(view.result.current.currentPair![1]).toBe(pair[1]);
    expect(timers.fired()).toBe(0); expect(fixture.record).not.toHaveBeenCalled();
  });

  it('keeps the new reveal visible for its own full two seconds after leaving daily', () => {
    const view = draw(); act(() => view.result.current.makeGuess(choose(view.result.current))); const raw = localStorage.getItem(key);
    act(() => vi.advanceTimersByTime(1000)); act(() => view.result.current.switchMode('unlimited')); act(() => view.result.current.makeGuess(choose(view.result.current)));
    act(() => vi.advanceTimersByTime(1000)); expect(view.result.current.showingResult).toBe(true); expect(view.result.current.results).toHaveLength(1);
    expect(view.result.current.currentRound).toBe(0); expect(view.result.current.totalScore).toBe(0);
    act(() => vi.advanceTimersByTime(1000)); expect(view.result.current.showingResult).toBe(false); expect(view.result.current.currentRound).toBe(1);
    expect(view.result.current.totalScore).toBe(10); expect(localStorage.getItem(key)).toBe(raw); expect(fixture.record).not.toHaveBeenCalled();
  });

  it('clears the exact owned reveal at unmount with no late callback work', () => {
    const timers = trackReveals(), view = draw(); act(() => view.result.current.switchMode('unlimited'));
    act(() => view.result.current.makeGuess(choose(view.result.current))); expect(timers.live.size).toBe(1); view.unmount();
    expect(timers.live.size).toBe(0); act(() => vi.advanceTimersByTime(2000)); expect(timers.fired()).toBe(0); expect(fixture.record).not.toHaveBeenCalled();
  });

  it('rejects a delivered obsolete callback without clearing a newer accepted reveal', () => {
    const timers = trackReveals(), view = draw(); act(() => view.result.current.switchMode('unlimited'));
    act(() => view.result.current.makeGuess(choose(view.result.current))); const obsolete = timers.callbacks[0];
    act(() => view.result.current.switchMode('unlimited')); act(() => view.result.current.makeGuess(choose(view.result.current)));
    const pair = view.result.current.currentPair!; act(() => obsolete());
    expect(view.result.current.showingResult).toBe(true); expect(view.result.current.currentRound).toBe(0); expect(view.result.current.totalScore).toBe(0);
    expect(view.result.current.results).toHaveLength(1); expect(view.result.current.currentPair![0]).toBe(pair[0]); expect(view.result.current.currentPair![1]).toBe(pair[1]);
    expect(timers.live.size).toBe(1); act(() => vi.advanceTimersByTime(2000)); expect(view.result.current.currentRound).toBe(1);
    expect(view.result.current.results).toHaveLength(1); expect(view.result.current.totalScore).toBe(10); expect(timers.fired()).toBe(1);
  });

  it('retains original2000ms and one owned timer through quiet rerenders', () => {
    const timers = trackReveals(), view = draw(); act(() => view.result.current.makeGuess(choose(view.result.current)));
    const handle = [...timers.live][0], pair = view.result.current.currentPair!; view.rerender(); view.rerender();
    expect([...timers.live]).toEqual([handle]); expect(view.result.current.currentPair![0]).toBe(pair[0]); expect(view.result.current.currentPair![1]).toBe(pair[1]);
    act(() => vi.advanceTimersByTime(1999)); expect(view.result.current.showingResult).toBe(true); expect(view.result.current.currentRound).toBe(0);
    act(() => vi.advanceTimersByTime(1)); expect(view.result.current.showingResult).toBe(false); expect(view.result.current.currentRound).toBe(1);
    expect(view.result.current.totalScore).toBe(10); expect(timers.fired()).toBe(1); expect(timers.live.size).toBe(0);
  });

  it('keeps accepted immediate daily save after reveal cancellation and quiet reload', () => {
    const timers = trackReveals(), view = draw(); act(() => view.result.current.makeGuess(choose(view.result.current)));
    const raw = localStorage.getItem(key)!; expect(JSON.parse(raw).guesses).toEqual([{ t: 'result', correct: true }]);
    act(() => view.result.current.switchMode('unlimited')); expect(timers.live.size).toBe(0); view.unmount();
    const restored = draw(); expect(restored.result.current.mode).toBe('daily'); expect(restored.result.current.currentRound).toBe(1);
    expect(restored.result.current.totalScore).toBe(10); expect(restored.result.current.showingResult).toBe(false);
    expect(localStorage.getItem(key)).toBe(raw); expect(timers.live.size).toBe(0); expect(fixture.record).not.toHaveBeenCalled();
  });
});
