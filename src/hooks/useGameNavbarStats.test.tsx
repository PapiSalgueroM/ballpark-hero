import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve = (_value: T) => undefined;
  let reject = (_reason: unknown) => undefined;
  const promise = new Promise<T>((pass, fail) => {
    resolve = pass;
    reject = fail;
  });
  return { promise, resolve, reject };
}

type RankResult = { data: Array<{ total_points: number; rank: number }> };
type PlayedResult = { data: Array<{ game: string }> };
type Requests = Record<string, {
  rank: Deferred<RankResult>;
  played: Deferred<PlayedResult>;
}>;

const fixtures = vi.hoisted(() => ({
  userId: 'account-a',
  playerName: 'Alpha',
  localCounts: { 'account-a': 3, 'account-b': 1 } as Record<string, number>,
  requests: {} as Requests,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: fixtures.userId }, profile: null }),
}));

vi.mock('@/hooks/usePlayerName', () => ({
  usePlayerName: () => fixtures.playerName,
}));

vi.mock('@/lib/completions', () => ({
  getLocalTodayCount: () => fixtures.localCounts[fixtures.userId] ?? 0,
}));

vi.mock('@/lib/streaks', () => ({
  getGlobalCurrentStreak: () => 4,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn((_name: string, args: { p_player: string }) => (
      fixtures.requests[args.p_player].rank.promise
    )),
    from: vi.fn(() => ({
      select: vi.fn(() => {
        let player = '';
        const query = {
          eq: vi.fn((field: string, value: string) => {
            if (field === 'player_name') {
              player = value;
              return query;
            }
            return fixtures.requests[player].played.promise;
          }),
        };
        return query;
      }),
    })),
  },
}));

import { supabase } from '@/integrations/supabase/client';
import { useGameNavbarStats } from '@/hooks/useGameNavbarStats';

function requestPair() {
  return {
    rank: deferred<RankResult>(),
    played: deferred<PlayedResult>(),
  };
}

describe('useGameNavbarStats identity changes', () => {
  beforeEach(() => {
    fixtures.userId = 'account-a';
    fixtures.playerName = 'Alpha';
    fixtures.requests = { Alpha: requestPair(), Beta: requestPair() };
    vi.mocked(supabase.rpc).mockClear();
    vi.spyOn(console, 'debug').mockImplementation(() => undefined);
  });

  it('hides the previous account stats while the replacement account request is pending or fails', async () => {
    const rendered = renderHook(() => useGameNavbarStats());

    await act(async () => {
      fixtures.requests.Alpha.rank.resolve({ data: [{ total_points: 80, rank: 6 }] });
      fixtures.requests.Alpha.played.resolve({ data: [{ game: 'footle' }, { game: 'soccer-grid' }] });
    });
    await waitFor(() => expect(rendered.result.current.totalPointsToday).toBe(80));
    expect(rendered.result.current.dailyRank).toBe(6);

    fixtures.userId = 'account-b';
    fixtures.playerName = 'Beta';
    rendered.rerender();

    expect(rendered.result.current.totalPointsToday).toBe(0);
    expect(rendered.result.current.dailyRank).toBeNull();
    expect(rendered.result.current.gamesPlayedToday).toBe(1);

    await act(async () => {
      fixtures.requests.Beta.played.resolve({ data: [] });
      fixtures.requests.Beta.rank.reject(new Error('offline'));
    });
    await waitFor(() => expect(rendered.result.current.loading).toBe(false));
    expect(rendered.result.current.totalPointsToday).toBe(0);
    expect(rendered.result.current.dailyRank).toBeNull();
    expect(rendered.result.current.gamesPlayedToday).toBe(1);
  });

  it('starts the new account request immediately and ignores the old response when it arrives last', async () => {
    const rendered = renderHook(() => useGameNavbarStats());
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalledTimes(1));

    fixtures.userId = 'account-b';
    fixtures.playerName = 'Beta';
    rendered.rerender();
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalledTimes(2));

    await act(async () => {
      fixtures.requests.Beta.rank.resolve({ data: [{ total_points: 25, rank: 2 }] });
      fixtures.requests.Beta.played.resolve({ data: [{ game: 'player-bingo' }] });
    });
    await waitFor(() => expect(rendered.result.current.totalPointsToday).toBe(25));
    expect(rendered.result.current.dailyRank).toBe(2);

    await act(async () => {
      fixtures.requests.Alpha.rank.resolve({ data: [{ total_points: 999, rank: 1 }] });
      fixtures.requests.Alpha.played.resolve({ data: [
        { game: 'footle' },
        { game: 'soccer-grid' },
        { game: 'transfer-path' },
      ] });
    });

    expect(rendered.result.current.totalPointsToday).toBe(25);
    expect(rendered.result.current.dailyRank).toBe(2);
    expect(rendered.result.current.gamesPlayedToday).toBe(1);
  });
});
