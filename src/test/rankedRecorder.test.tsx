/**
 * Round 645: a finish outside the daily is a play, never a record.
 *
 * useGameCompletion takes a ranked flag. True is the recorder every game has
 * had since Round 300 (the scored row, the streak, the signed in save). False
 * routes to recordUnrankedPlay, which writes a play and nothing ranked, and
 * it is what a game with a daily and a free mode under one slug passes for
 * its Unlimited, free play, new season or versus finishes.
 *
 * The first block renders the REAL hook with both doors mocked and counts
 * which one opens. The second plays three REAL hooks, one per shape the
 * audit found: F1 Driver (the seven guess hooks that record gameState
 * whatever its mode), NASCAR Chain (the three chains) and HOF or Bust (the
 * six recorders that used to AND the mode into their done flag), each
 * through Unlimited and through the daily.
 *
 * scripts/simRankedRecorder.mjs runs this file and carries the negative
 * control: RANKED_CONTROL=hookignores points COMPLETION_HOOK at a copy of
 * the hook that records every finish as ranked, and every Unlimited case
 * here must go red while the daily ones stay green.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';

vi.mock('@/lib/completions', () => ({
  recordCompletion: vi.fn(),
  recordUnrankedPlay: vi.fn(),
  getCurrentPlayerName: () => 'Tester',
}));
vi.mock('@/lib/badges', () => ({
  getNewlyEarnedBadges: () => Promise.resolve([]),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }),
}));
vi.mock('sonner', () => ({ toast: { success: () => undefined } }));
/* The three real hooks import the client for their validators and vote
   tables; none of that is under test, so every chain resolves to nothing.
   HOF or Bust fires its vote insert with a bare .then(), no callback, so
   the thenable hands back a real promise whether or not one is passed. */
vi.mock('@/integrations/supabase/client', () => {
  const chain = (): unknown => new Proxy(() => undefined, {
    get: (_t, key) => {
      if (key === 'then') return (resolve?: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve);
      return () => chain();
    },
    apply: () => chain(),
  });
  return {
    SUPABASE_URL: 'https://stub.invalid',
    SUPABASE_PUBLISHABLE_KEY: 'stub-anon-key',
    supabase: { from: () => chain(), rpc: () => chain(), functions: { invoke: async () => ({ data: null, error: null }) }, auth: { getSession: async () => ({ data: { session: null } }) } },
  };
});

import { recordCompletion, recordUnrankedPlay } from '@/lib/completions';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useF1Driver } from '@/hooks/useF1Driver';
import { useNascarChain } from '@/hooks/useNascarChain';
import { useHofOrBust } from '@/hooks/useHofOrBust';
import { markRestoredFinish } from '@/lib/restoredFinish';

const ranked = () => vi.mocked(recordCompletion).mock.calls.map(c => String(c[0]));
const plays = () => vi.mocked(recordUnrankedPlay).mock.calls.map(c => String(c[0]));

beforeEach(() => {
  vi.mocked(recordCompletion).mockClear();
  vi.mocked(recordUnrankedPlay).mockClear();
  localStorage.clear();
});
afterEach(() => cleanup());

describe('the recorder, rendered', () => {
  it('a ranked finish records once and is no play', () => {
    const { rerender } = renderHook(({ done }) => useGameCompletion('footle', done, 400, 2, true), { initialProps: { done: false } });
    rerender({ done: true });
    rerender({ done: true });
    expect(ranked()).toEqual(['/footle']);
    expect(vi.mocked(recordCompletion).mock.calls[0]).toEqual(['/footle', 400, 'Tester', 2]);
    expect(plays()).toEqual([]);
  });

  it('a finish with the flag left off is ranked, as every single mode game expects', () => {
    const { rerender } = renderHook(({ done }) => useGameCompletion('footle', done, 400), { initialProps: { done: false } });
    rerender({ done: true });
    expect(ranked()).toEqual(['/footle']);
    expect(plays()).toEqual([]);
  });

  it('an unranked finish is one play and no record', () => {
    const { rerender } = renderHook(({ done }) => useGameCompletion('footle', done, 400, 2, false), { initialProps: { done: false } });
    rerender({ done: true });
    rerender({ done: true });
    expect(plays()).toEqual(['/footle']);
    expect(ranked()).toEqual([]);
  });

  it('a restored finish is nothing whichever way the flag points', () => {
    const { rerender } = renderHook(({ done, flag }) => useGameCompletion('footle', done, 400, 0, flag), { initialProps: { done: false, flag: false } });
    markRestoredFinish('footle');
    rerender({ done: true, flag: false });
    expect(plays()).toEqual([]);
    expect(ranked()).toEqual([]);
    rerender({ done: false, flag: true });
    markRestoredFinish('footle');
    rerender({ done: true, flag: true });
    expect(plays()).toEqual([]);
    expect(ranked()).toEqual([]);
  });

  it('the flag is read at the finish: a free run then a daily run in one mount', () => {
    const { rerender } = renderHook(({ done, flag }) => useGameCompletion('footle', done, 400, 0, flag), { initialProps: { done: false, flag: false } });
    rerender({ done: true, flag: false });
    rerender({ done: false, flag: true });
    rerender({ done: true, flag: true });
    expect(plays()).toEqual(['/footle']);
    expect(ranked()).toEqual(['/footle']);
  });
});

describe('three real hooks', () => {
  it('F1 Driver through Unlimited is one play and no record', () => {
    const { result } = renderHook(() => useF1Driver());
    act(() => result.current.startGame('unlimited'));
    expect(result.current.gameState?.mode).toBe('unlimited');
    act(() => result.current.giveUp());
    expect(result.current.gameState?.gameStatus).toBe('lost');
    expect(plays()).toEqual(['/f1-driver']);
    expect(ranked()).toEqual([]);
  });

  it('F1 Driver through the daily is one record and no play', () => {
    const { result } = renderHook(() => useF1Driver());
    act(() => result.current.startGame('daily'));
    expect(result.current.gameState?.mode).toBe('daily');
    const answer = result.current.gameState!.puzzle.driverName;
    act(() => result.current.makeGuess(answer));
    expect(result.current.gameState?.gameStatus).toBe('won');
    expect(ranked()).toEqual(['/f1-driver']);
    expect(vi.mocked(recordCompletion).mock.calls[0][1]).toBe(1000);
    expect(plays()).toEqual([]);
  });

  it('F1 Driver, Unlimited after the daily in one mount: one record, then one play', () => {
    const { result } = renderHook(() => useF1Driver());
    act(() => result.current.startGame('daily'));
    act(() => result.current.giveUp());
    expect(ranked()).toEqual(['/f1-driver']);
    act(() => result.current.resetGame());
    act(() => result.current.startGame('unlimited'));
    act(() => result.current.giveUp());
    expect(ranked()).toEqual(['/f1-driver']);
    expect(plays()).toEqual(['/f1-driver']);
  });

  it('NASCAR Chain through Unlimited is one play and no record', () => {
    const { result } = renderHook(() => useNascarChain());
    act(() => result.current.startGame('unlimited'));
    act(() => result.current.giveUp());
    expect(result.current.gameState?.gameStatus).toBe('ended');
    expect(plays()).toEqual(['/nascar-chain']);
    expect(ranked()).toEqual([]);
  });

  it('NASCAR Chain through the daily is one record and no play', () => {
    const { result } = renderHook(() => useNascarChain());
    act(() => result.current.startGame('daily'));
    act(() => result.current.giveUp());
    expect(ranked()).toEqual(['/nascar-chain']);
    expect(plays()).toEqual([]);
  });

  it('HOF or Bust: the daily vote is one record, the Unlimited vote after it is one play', () => {
    const { result } = renderHook(() => useHofOrBust());
    expect(result.current.mode).toBe('daily');
    act(() => result.current.vote('hof'));
    expect(ranked()).toEqual(['/hof-or-bust']);
    expect(plays()).toEqual([]);
    act(() => result.current.switchToUnlimited());
    expect(result.current.mode).toBe('unlimited');
    act(() => result.current.vote('bust'));
    expect(ranked()).toEqual(['/hof-or-bust']);
    expect(plays()).toEqual(['/hof-or-bust']);
  });
});
