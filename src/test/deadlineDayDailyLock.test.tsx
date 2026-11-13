import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDeadlineDay } from '@/hooks/useDeadlineDay';
import { recordCompletion } from '@/lib/completions';
import { openTalks } from '@/lib/deadlineDay';

vi.mock('@/lib/dateUtils', async original => ({
  ...await original<typeof import('@/lib/dateUtils')>(),
  getTodayET: () => '2026-11-12',
}));
vi.mock('@/lib/completions', () => ({
  recordCompletion: vi.fn(),
  getCurrentPlayerName: () => 'Fixture player',
}));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));

const key = 'deadline-day-daily-2026-11-12';
const bytes = () => localStorage.getItem(key);
type Hook = ReturnType<typeof useDeadlineDay>;

function begin(get: () => Hook) {
  act(() => get().startDaily());
  act(() => { vi.advanceTimersByTime(30); });
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.spyOn(Math, 'random').mockReturnValue(0.125);
  vi.mocked(recordCompletion).mockClear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('Deadline Day completed Daily ownership', () => {
  it.each(['legal offer opening', 'close window'] as const)('keeps the first saved result after a stale %s', action => {
    const first = renderHook(useDeadlineDay);
    const stale = renderHook(useDeadlineDay);
    begin(() => first.result.current);
    begin(() => stale.result.current);
    expect(first.result.current.run?.setup).toEqual(stale.result.current.run?.setup);
    expect(stale.result.current.phase).toBe('play');

    const oldRun = stale.result.current.run!;
    const target = oldRun.targets.findIndex((_, index) => openTalks(oldRun, index) !== oldRun);
    expect(target).toBeGreaterThanOrEqual(0);
    act(() => first.result.current.finish());
    const finished = bytes();
    expect(JSON.parse(finished!).done).toBe(true);
    expect(first.result.current.phase).toBe('done');
    expect(recordCompletion).toHaveBeenCalledTimes(1);

    if (action === 'legal offer opening') act(() => stale.result.current.callClub(target));
    else act(() => stale.result.current.finish());

    expect(bytes()).toBe(finished);
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/deadline-day', undefined, 'Fixture player', 0);
    expect(stale.result.current.phase).toBe('menu');
    expect(stale.result.current.dailyDone).toEqual(first.result.current.dailyDone);
    const reloaded = renderHook(useDeadlineDay);
    expect(reloaded.result.current.dailyDone).toEqual(first.result.current.dailyDone);
  });

  it('adopts a same-date lock on a stale menu before opening the desk', () => {
    const first = renderHook(useDeadlineDay);
    const stale = renderHook(useDeadlineDay);
    begin(() => first.result.current);
    act(() => first.result.current.finish());
    const finished = bytes();
    expect(stale.result.current.dailyDone).toBeNull();
    begin(() => stale.result.current);
    expect(stale.result.current.phase).toBe('menu');
    expect(stale.result.current.dailyDone).toEqual(first.result.current.dailyDone);
    expect(bytes()).toBe(finished);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('leaves Free Play resumable while the Daily is locked', () => {
    const daily = renderHook(useDeadlineDay);
    begin(() => daily.result.current);
    act(() => daily.result.current.finish());
    const finished = bytes();

    const free = renderHook(useDeadlineDay);
    act(() => free.result.current.startFree(daily.result.current.daily.club));
    act(() => { vi.advanceTimersByTime(30); });
    const run = free.result.current.run!;
    const target = run.targets.findIndex((_, index) => openTalks(run, index) !== run);
    expect(target).toBeGreaterThanOrEqual(0);
    act(() => free.result.current.callClub(target));
    const actions = [{ t: 'open', i: target }];
    expect(free.result.current.run?.actions).toEqual(actions);
    expect(bytes()).toBe(finished);

    const restored = renderHook(useDeadlineDay);
    act(() => restored.result.current.resumeFree());
    act(() => { vi.advanceTimersByTime(30); });
    expect(restored.result.current.run?.actions).toEqual(actions);
    expect(restored.result.current.dailyDone).toEqual(daily.result.current.dailyDone);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('still writes a legal partial Daily move and restores it from the menu', () => {
    const live = renderHook(useDeadlineDay);
    begin(() => live.result.current);
    const run = live.result.current.run!;
    const target = run.targets.findIndex((_, index) => openTalks(run, index) !== run);
    expect(target).toBeGreaterThanOrEqual(0);
    act(() => live.result.current.callClub(target));
    const partial = bytes();
    expect(JSON.parse(partial!).done).toBe(false);
    expect(live.result.current.run?.actions).toEqual([{ t: 'open', i: target }]);
    act(() => live.result.current.backToMenu());
    begin(() => live.result.current);
    expect(live.result.current.run?.actions).toEqual([{ t: 'open', i: target }]);
    expect(bytes()).toBe(partial);
    expect(recordCompletion).not.toHaveBeenCalled();
  });
});
