import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StreakState } from '@/lib/streaks';

const fixtures = vi.hoisted(() => ({
  authCallback: null as null | ((event: string, session: unknown) => void),
  profileRead: vi.fn(),
  profileUpsert: vi.fn(async () => ({ error: null })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn((_column: string, userId: string) => ({
          maybeSingle: () => fixtures.profileRead(userId),
        })),
      })),
      upsert: fixtures.profileUpsert,
    })),
    auth: {
      onAuthStateChange: vi.fn((callback: (event: string, session: unknown) => void) => {
        fixtures.authCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
      getSession: vi.fn(async () => ({ data: { session: null } })),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { getStreakState } from '@/lib/streaks';

const guestState: StreakState = {
  version: 1,
  global: { current: 1, longest: 2, lastDate: '2026-09-01' },
  perGame: {},
  loginDates: ['2026-09-01'],
  totalPlays: 2,
  totalPoints: 50,
};

const accountAState: StreakState = {
  version: 1,
  global: { current: 9, longest: 12, lastDate: '2026-09-01' },
  perGame: {},
  loginDates: ['2026-08-31', '2026-09-01'],
  totalPlays: 90,
  totalPoints: 9000,
};

function profile(userId: string, streakState: unknown) {
  return {
    data: {
      id: `profile-${userId}`,
      user_id: userId,
      username: null,
      display_name: userId === 'user-a' ? 'Alpha' : 'Beta',
      avatar_url: null,
      streak_state: streakState,
      created_at: '2026-09-01T00:00:00.000Z',
      updated_at: '2026-09-01T00:00:00.000Z',
    },
    error: null,
  };
}

function IdentityState() {
  const { loading, user } = useAuth();
  return <p>{loading ? 'loading' : user?.id ?? 'guest'}</p>;
}

describe('account streak identity boundaries', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('dukb-streaks-v1', JSON.stringify(guestState));
    fixtures.authCallback = null;
    fixtures.profileRead.mockReset();
    fixtures.profileRead.mockImplementation(async (userId: string) => (
      userId === 'user-a' ? profile(userId, accountAState) : profile(userId, {})
    ));
    fixtures.profileUpsert.mockClear();
  });

  it('restores guest progress after account A and never uploads A progress into blank account B', async () => {
    render(<AuthProvider><IdentityState /></AuthProvider>);
    await waitFor(() => expect(document.body).toHaveTextContent('guest'));

    await act(async () => {
      fixtures.authCallback?.('SIGNED_IN', { user: { id: 'user-a' }, access_token: 'a' });
    });
    await waitFor(() => expect(getStreakState().totalPlays).toBe(90));

    await act(async () => {
      fixtures.authCallback?.('SIGNED_OUT', null);
    });
    expect(getStreakState()).toEqual(guestState);

    await act(async () => {
      fixtures.authCallback?.('SIGNED_IN', { user: { id: 'user-b' }, access_token: 'b' });
    });
    await waitFor(() => expect(fixtures.profileRead).toHaveBeenCalledWith('user-b'));
    await waitFor(() => expect(fixtures.profileUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-b',
        streak_state: guestState,
      }),
      { onConflict: 'user_id' },
    ));
    expect(getStreakState()).toEqual(guestState);
  });
});
