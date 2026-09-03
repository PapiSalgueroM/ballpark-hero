/**
 * A finish restored from storage is not a new finish.
 *
 * Round 399. useGameCompletion used to record a completion whenever
 * isComplete was true and a per mount ref said it had not yet, so a game
 * that came back finished from localStorage was recorded again on every
 * visit: another anonymous row, and for a signed in player the score added
 * to their points again. Measured 2026-09-01: half of all signed in saves
 * outside the two big sims were repeats of a same day save, a retired Soccer
 * Career legacy re-paid on every reload.
 *
 * The rules now: the hook records only a transition it witnessed, isComplete
 * going from false to true while mounted, and a finish that useDailyPuzzle
 * restores in an effect after mount is announced through
 * src/lib/restoredFinish.ts and consumed before anything is recorded.
 * Mounting already complete records nothing; a restored finish records
 * nothing; a witnessed finish records once; a reset and a new finish record
 * again.
 *
 * scripts/simCompletionOnce.mjs runs this file and carries the negative
 * controls: COMPLETION_HOOK points the test at a copy of the hook with one
 * rule removed, and that rule's case must then fail.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/lib/completions', () => ({
  recordCompletion: vi.fn(),
  getCurrentPlayerName: () => 'Tester',
}));
vi.mock('@/lib/badges', () => ({
  getNewlyEarnedBadges: () => Promise.resolve([]),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }),
}));
vi.mock('sonner', () => ({ toast: { success: () => undefined } }));
import { recordCompletion } from '@/lib/completions';
import { markRestoredFinish } from '@/lib/restoredFinish';

const hookPath = process.env.COMPLETION_HOOK;
const { useGameCompletion } = hookPath
  ? await import(/* @vite-ignore */ hookPath)
  : await import('@/hooks/useGameCompletion');

beforeEach(() => {
  vi.mocked(recordCompletion).mockClear();
});

describe('useGameCompletion records a finish once, when it happens', () => {
  it('records nothing for a game that mounts already finished', () => {
    const { rerender } = renderHook(({ done }) => useGameCompletion('footle', done, 400), { initialProps: { done: true } });
    rerender({ done: true });
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('records a finish it witnessed exactly once', () => {
    const { rerender } = renderHook(({ done }) => useGameCompletion('footle', done, 400), { initialProps: { done: false } });
    rerender({ done: true });
    rerender({ done: true });
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    expect(recordCompletion).toHaveBeenCalledWith('/footle', 400, undefined, 0);
  });

  it('records nothing for a finish the daily puzzle hook restored after mount, and a later real finish once', () => {
    const { rerender } = renderHook(({ done }) => useGameCompletion('footle', done, 400), { initialProps: { done: false } });
    markRestoredFinish('footle');
    rerender({ done: true });
    expect(recordCompletion).not.toHaveBeenCalled();
    rerender({ done: false });
    rerender({ done: true });
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('records again after a reset and a new finish', () => {
    const { rerender } = renderHook(({ done }) => useGameCompletion('footle', done, 400), { initialProps: { done: false } });
    rerender({ done: true });
    rerender({ done: false });
    rerender({ done: true });
    expect(recordCompletion).toHaveBeenCalledTimes(2);
  });
});
