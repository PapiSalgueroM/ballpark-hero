import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StreakState } from '@/lib/streaks';

const fixtures = vi.hoisted(() => {
  const remote: StreakState = {
    version: 1,
    global: { current: 3, longest: 3, lastDate: '2026-09-01' },
    perGame: {
      footle: { current: 1, longest: 2, lastDate: '2026-09-01' },
    },
    loginDates: ['2026-09-01'],
    totalPlays: 11,
    totalPoints: 475,
  };
  return {
    remote,
    profileReads: vi.fn(),
    profileUpsert: vi.fn(async () => ({ error: new Error('offline') })),
    unsubscribe: vi.fn(),
  };
});

vi.mock('@/lib/badges', () => ({
  getNewlyEarnedBadges: () => Promise.resolve([]),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));

vi.mock('@/integrations/supabase/client', () => {
  const resolved = (value: unknown = { error: null }) => Promise.resolve(value);

  const countQuery: Record<string, unknown> = {};
  countQuery.eq = vi.fn(() => countQuery);
  countQuery.then = (resolve: (value: unknown) => unknown) => resolved({ count: 1, error: null }).then(resolve);

  const emptySingleQuery: Record<string, unknown> = {};
  emptySingleQuery.eq = vi.fn(() => emptySingleQuery);
  emptySingleQuery.single = vi.fn(async () => ({ data: null, error: null }));

  const profileQuery = {
    eq: vi.fn(() => ({
      maybeSingle: fixtures.profileReads.mockImplementation(async () => ({
        data: {
          id: 'profile-1',
          user_id: 'user-1',
          username: null,
          display_name: 'Tester',
          avatar_url: null,
          streak_state: fixtures.remote,
          created_at: '2026-09-01T00:00:00.000Z',
          updated_at: '2026-09-01T00:00:00.000Z',
        },
        error: null,
      })),
    })),
  };

  const table = (name: string) => {
    if (name === 'profiles') {
      return {
        select: vi.fn(() => profileQuery),
        upsert: fixtures.profileUpsert,
      };
    }
    if (name === 'daily_completions') {
      return {
        insert: vi.fn(() => resolved()),
        select: vi.fn(() => countQuery),
      };
    }
    if (name === 'user_scores' || name === 'user_best_scores') {
      return {
        insert: vi.fn(() => resolved()),
        update: vi.fn(() => emptySingleQuery),
        select: vi.fn(() => emptySingleQuery),
      };
    }
    return { insert: vi.fn(() => resolved()) };
  };

  return {
    supabase: {
      from: vi.fn(table),
      auth: {
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: fixtures.unsubscribe } } })),
        getSession: vi.fn(async () => ({
          data: { session: { user: { id: 'user-1' }, access_token: 'token' } },
        })),
        getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } } })),
        signUp: vi.fn(),
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
      },
    },
  };
});

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { getStreakState } from '@/lib/streaks';

function CompletionHarness({ complete }: { complete: boolean }) {
  const { user } = useAuth();
  useGameCompletion('footle', complete, 400, 5);
  return <p>{user ? 'ready' : 'waiting'}</p>;
}

describe('completion refresh race', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-09-02T16:00:00.000Z'));
    localStorage.clear();
    fixtures.profileReads.mockClear();
    fixtures.profileUpsert.mockClear();
  });

  it('keeps the new local streak when both completion events refresh a stale profile and its backup fails', async () => {
    const savedEvent = vi.fn();
    window.addEventListener('game-completion-saved', savedEvent);
    const view = render(
      <AuthProvider>
        <CompletionHarness complete={false} />
      </AuthProvider>,
    );

    expect(await screen.findByText('ready')).toBeInTheDocument();
    await waitFor(() => expect(fixtures.profileReads).toHaveBeenCalledTimes(1));

    view.rerender(
      <AuthProvider>
        <CompletionHarness complete />
      </AuthProvider>,
    );

    await waitFor(() => expect(savedEvent).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(fixtures.profileReads).toHaveBeenCalledTimes(3));
    expect(fixtures.profileUpsert).toHaveBeenCalledTimes(1);
    expect(getStreakState()).toEqual({
      ...fixtures.remote,
      global: { current: 4, longest: 4, lastDate: '2026-09-02' },
      perGame: {
        footle: { current: 2, longest: 2, lastDate: '2026-09-02' },
      },
      loginDates: ['2026-09-01'],
      totalPlays: 12,
      totalPoints: 875,
    });
    window.removeEventListener('game-completion-saved', savedEvent);
    vi.useRealTimers();
  });

  it('waits for initial account hydration before adding and backing up a fast completion', async () => {
    let releaseInitial = (_value: { data: unknown; error: null }) => undefined;
    const heldInitial = new Promise<{ data: unknown; error: null }>((resolve) => { releaseInitial = resolve; });
    fixtures.profileReads.mockImplementationOnce(() => heldInitial);
    const savedEvent = vi.fn();
    window.addEventListener('game-completion-saved', savedEvent);

    const view = render(
      <AuthProvider>
        <CompletionHarness complete={false} />
      </AuthProvider>,
    );
    expect(await screen.findByText('ready')).toBeInTheDocument();

    view.rerender(
      <AuthProvider>
        <CompletionHarness complete />
      </AuthProvider>,
    );
    expect(getStreakState().totalPlays).toBe(0);

    await act(async () => {
      releaseInitial({
        data: {
          id: 'profile-1',
          user_id: 'user-1',
          username: null,
          display_name: 'Tester',
          avatar_url: null,
          streak_state: fixtures.remote,
          created_at: '2026-09-01T00:00:00.000Z',
          updated_at: '2026-09-01T00:00:00.000Z',
        },
        error: null,
      });
      await heldInitial;
    });

    await waitFor(() => expect(fixtures.profileUpsert).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(savedEvent).toHaveBeenCalledTimes(2));
    expect(getStreakState()).toEqual({
      ...fixtures.remote,
      global: { current: 4, longest: 4, lastDate: '2026-09-02' },
      perGame: {
        footle: { current: 2, longest: 2, lastDate: '2026-09-02' },
      },
      loginDates: ['2026-09-01'],
      totalPlays: 12,
      totalPoints: 875,
    });

    window.removeEventListener('game-completion-saved', savedEvent);
    vi.useRealTimers();
  });

  it('keeps a play local when the initial profile read fails without overwriting remote history', async () => {
    fixtures.profileReads.mockImplementationOnce(async () => ({
      data: null,
      error: new Error('offline'),
    }));
    const savedEvent = vi.fn();
    window.addEventListener('game-completion-saved', savedEvent);

    const view = render(
      <AuthProvider>
        <CompletionHarness complete={false} />
      </AuthProvider>,
    );
    expect(await screen.findByText('ready')).toBeInTheDocument();
    await waitFor(() => expect(fixtures.profileReads).toHaveBeenCalledTimes(1));

    view.rerender(
      <AuthProvider>
        <CompletionHarness complete />
      </AuthProvider>,
    );

    await waitFor(() => expect(savedEvent).toHaveBeenCalledTimes(2));
    expect(getStreakState().totalPlays).toBe(1);
    expect(getStreakState().totalPoints).toBe(400);
    expect(fixtures.profileUpsert).not.toHaveBeenCalled();

    window.removeEventListener('game-completion-saved', savedEvent);
    vi.useRealTimers();
  });

  it('refuses to replace a nonblank unsupported profile snapshot', async () => {
    fixtures.profileReads.mockImplementationOnce(async () => ({
      data: {
        id: 'profile-1',
        user_id: 'user-1',
        username: null,
        display_name: 'Tester',
        avatar_url: null,
        streak_state: { version: 2, totalPlays: 99 },
        created_at: '2026-09-01T00:00:00.000Z',
        updated_at: '2026-09-01T00:00:00.000Z',
      },
      error: null,
    }));
    const savedEvent = vi.fn();
    window.addEventListener('game-completion-saved', savedEvent);

    const view = render(
      <AuthProvider>
        <CompletionHarness complete={false} />
      </AuthProvider>,
    );
    expect(await screen.findByText('ready')).toBeInTheDocument();
    await waitFor(() => expect(fixtures.profileReads).toHaveBeenCalledTimes(1));

    view.rerender(
      <AuthProvider>
        <CompletionHarness complete />
      </AuthProvider>,
    );

    await waitFor(() => expect(savedEvent).toHaveBeenCalledTimes(2));
    expect(getStreakState().totalPlays).toBe(1);
    expect(getStreakState().totalPoints).toBe(400);
    expect(fixtures.profileUpsert).not.toHaveBeenCalled();

    window.removeEventListener('game-completion-saved', savedEvent);
    vi.useRealTimers();
  });
});
