import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

/* Round 825 review. Since this round Build Your XI reads the verified
   position history for a pick the plain rule takes only as next door (a
   right back at left back), because role fit charges next door and the
   history may cover the slot. Two things that read must not do: leave the
   pick un-busy while it runs (the search box stayed live and the spinner
   off, so a second pick could be sent into the same slot), and hold the pick
   forever when the table is slow. Every request here is a stub: no database. */

vi.mock('@/integrations/supabase/client', () => ({ supabase: {}, SUPABASE_URL: 'http://stub', SUPABASE_PUBLISHABLE_KEY: 'stub' }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));
vi.mock('@/lib/localLineupEval', () => ({ localEvaluateSoccerXI: vi.fn() }));
vi.mock('@/data/lineupTeams', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/data/lineupTeams')>();
  return { ...real, getRandomTeamAssignments: () => real.clubs.slice(0, 11).map((name) => ({ name, isNation: false })) };
});

import { HISTORY_WAIT_MS, useLineupBuilder } from '@/hooks/useLineupBuilder';

const TRENT = { rawPosition: 'Right-Back', position: 'RB' as const, club: 'Real Madrid', nationality: 'England', value: 90_000_000, age: 27 };
type Pending = { url: string; resolve: (v: unknown) => void };

function stubFetch(history: 'hold' | 'hang') {
  const pending: Pending[] = [];
  const calls: string[] = [];
  vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
    calls.push(String(url));
    if (String(url).includes('player_verified_positions')) {
      return new Promise((resolve, reject) => {
        if (history === 'hold') pending.push({ url: String(url), resolve });
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      });
    }
    return Promise.resolve({ ok: true, json: async () => ({ valid: true }) });
  }));
  return { pending, calls };
}

describe('Build Your XI: the history read for a next door pick', () => {
  beforeEach(() => { vi.useRealTimers(); });
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  it('is busy while the history is read, and the pick lands once it answers', async () => {
    const { pending, calls } = stubFetch('hold');
    const { result } = renderHook(() => useLineupBuilder());
    act(() => result.current.selectFormation('4-3-3'));
    act(() => result.current.selectPosition(1)); // LB
    let done: Promise<void> | undefined;
    act(() => { done = result.current.submitPlayer('Trent Alexander-Arnold', TRENT); });
    await waitFor(() => expect(pending.length).toBe(1));
    expect(result.current.isValidating).toBe(true);
    await act(async () => {
      pending[0].resolve({ ok: true, json: async () => [] });
      await done;
    });
    expect(calls.some((u) => u.includes('validate-player'))).toBe(true);
    expect(result.current.filledSlots.get(1)?.playerName).toBe('Trent Alexander-Arnold');
    expect(result.current.filledSlots.get(1)?.pick?.played).toBeUndefined();
    expect(result.current.isValidating).toBe(false);
  });

  it('gives up on a table that never answers, and the plain rule takes the pick', async () => {
    vi.useFakeTimers();
    const { calls } = stubFetch('hang');
    const { result } = renderHook(() => useLineupBuilder());
    act(() => result.current.selectFormation('4-3-3'));
    act(() => result.current.selectPosition(1)); // LB
    let done: Promise<void> | undefined;
    act(() => { done = result.current.submitPlayer('Trent Alexander-Arnold', TRENT); });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(HISTORY_WAIT_MS + 50);
      await done;
    });
    expect(calls.filter((u) => u.includes('player_verified_positions')).length).toBe(1);
    expect(calls.some((u) => u.includes('validate-player'))).toBe(true);
    expect(result.current.filledSlots.get(1)?.playerName).toBe('Trent Alexander-Arnold');
    expect(result.current.isValidating).toBe(false);
  });

  it('a pick in his own position reads nothing', async () => {
    const { calls } = stubFetch('hold');
    const { result } = renderHook(() => useLineupBuilder());
    act(() => result.current.selectFormation('4-3-3'));
    act(() => result.current.selectPosition(4)); // RB
    await act(async () => { await result.current.submitPlayer('Trent Alexander-Arnold', TRENT); });
    expect(calls.some((u) => u.includes('player_verified_positions'))).toBe(false);
    expect(result.current.filledSlots.get(4)?.playerName).toBe('Trent Alexander-Arnold');
  });
});
