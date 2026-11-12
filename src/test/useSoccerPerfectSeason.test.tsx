import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recordCompletion } from '@/lib/completions';
import { useSoccerPerfectSeason } from '@/hooks/useSoccerPerfectSeason';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn() }));
vi.mock('@/lib/dateUtils', () => ({ getTodayET: () => '2026-11-12' }));

describe('Soccer Perfect Season saves', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('resumes both modes and records only the first live finish after restoring a partial season', () => {
    const first = renderHook(() => useSoccerPerfectSeason());
    act(() => first.result.current.startDaily());
    act(() => first.result.current.reroll());
    while (first.result.current.view?.best) {
      const choice = first.result.current.view.best;
      act(() => first.result.current.choosePlayer(choice.playerId, choice.slot));
    }
    act(() => first.result.current.revealNext());
    const daily = first.result.current.run;
    expect(first.result.current.view?.record.wins).toBe(1);

    act(() => first.result.current.startUnlimited());
    const unlimited = first.result.current.run;
    expect(unlimited?.seed).not.toBe(daily?.seed);
    first.unmount();

    const restored = renderHook(() => useSoccerPerfectSeason());
    act(() => restored.result.current.resumeUnlimited());
    expect(restored.result.current.run).toEqual(unlimited);
    act(() => restored.result.current.resumeDaily());
    expect(restored.result.current.run).toEqual(daily);
    expect(restored.result.current.view?.record.wins).toBe(1);
    expect(recordCompletion).toHaveBeenCalledTimes(0);

    act(() => restored.result.current.finishSeason());
    act(() => restored.result.current.finishSeason());
    expect(restored.result.current.view?.record).toMatchObject({ wins: 38, points: 114, perfect: true });
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/soccer-perfect-season', 100);
    restored.unmount();

    const finished = renderHook(() => useSoccerPerfectSeason());
    act(() => finished.result.current.startDaily());
    expect(finished.result.current.view?.record.wins).toBe(38);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('keeps a newer draft from another mounted copy when an older copy acts', () => {
    const first = renderHook(() => useSoccerPerfectSeason());
    act(() => first.result.current.startDaily());
    const second = renderHook(() => useSoccerPerfectSeason());
    act(() => second.result.current.resumeDaily());

    const pick = first.result.current.view!.best!;
    act(() => first.result.current.choosePlayer(pick.playerId, pick.slot));
    act(() => second.result.current.reroll());
    expect(second.result.current.run).toEqual(first.result.current.run);
    expect(second.result.current.view?.picks[pick.slot]?.playerId).toBe(pick.playerId);
    expect(second.result.current.view?.rerollsLeft).toBe(2);

    act(() => second.result.current.reroll());
    expect(second.result.current.view?.turn).toBe(1);
    expect(second.result.current.view?.rerollsLeft).toBe(1);
  });

  it('reuses a result that a second mounted copy has already finished', () => {
    const first = renderHook(() => useSoccerPerfectSeason());
    act(() => first.result.current.startDaily());
    while (first.result.current.view?.best) {
      const choice = first.result.current.view.best;
      act(() => first.result.current.choosePlayer(choice.playerId, choice.slot));
    }
    const second = renderHook(() => useSoccerPerfectSeason());
    act(() => second.result.current.resumeDaily());
    act(() => first.result.current.finishSeason());
    act(() => second.result.current.revealNext());
    expect(second.result.current.run).toEqual(first.result.current.run);
    expect(second.result.current.view?.finished).toBe(true);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });
});
