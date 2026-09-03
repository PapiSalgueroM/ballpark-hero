import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type ProfileRow = {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  streak_state: {
    version: 1;
    global: { current: number; longest: number; lastDate: string | null };
    perGame: Record<string, never>;
    loginDates: string[];
    totalPlays: number;
    totalPoints: number;
  };
  created_at: string;
  updated_at: string;
};

type ProfileResult = { data: ProfileRow; error: null };

function deferred<T>() {
  let resolve = (_value: T) => undefined;
  const promise = new Promise<T>((pass) => { resolve = pass; });
  return { promise, resolve };
}

function profileResult(displayName: string | null, username: string | null = null): ProfileResult {
  return {
    data: {
      id: 'profile-a',
      user_id: 'user-a',
      username,
      display_name: displayName,
      avatar_url: null,
      streak_state: {
        version: 1,
        global: { current: 2, longest: 4, lastDate: '2026-09-01' },
        perGame: {},
        loginDates: ['2026-09-01'],
        totalPlays: 7,
        totalPoints: 320,
      },
      created_at: '2026-08-01T00:00:00.000Z',
      updated_at: '2026-09-02T00:00:00.000Z',
    },
    error: null,
  };
}

const fixtures = vi.hoisted(() => ({
  profileRead: vi.fn(),
  profileUpsert: vi.fn(),
  profileConditionalUpdate: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table !== 'profiles') throw new Error(`Unexpected table: ${table}`);
      const update = (payload: Record<string, unknown>) => {
        const equality: Record<string, unknown> = {};
        const nullFields = new Set<string>();
        const query = {
          eq: vi.fn((field: string, value: unknown) => {
            equality[field] = value;
            return query;
          }),
          is: vi.fn((field: string, value: unknown) => {
            if (value === null) nullFields.add(field);
            return query;
          }),
          select: vi.fn(() => query),
          maybeSingle: vi.fn(() => fixtures.profileConditionalUpdate(
            payload,
            equality,
            nullFields,
          )),
        };
        return query;
      };
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle: fixtures.profileRead })),
        })),
        update: vi.fn(update),
        upsert: fixtures.profileUpsert,
      };
    }),
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      getSession: vi.fn(async () => ({
        data: { session: { user: { id: 'user-a' }, access_token: 'token-a' } },
      })),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { getStreakState } from '@/lib/streaks';

function ProfileHarness() {
  const { user, profile, refreshProfile, updateProfile } = useAuth();
  return (
    <>
      <p data-testid="auth-user">{user?.id ?? 'none'}</p>
      <p data-testid="profile-name">{profile?.display_name ?? 'none'}</p>
      <button disabled={!user} onClick={() => { void refreshProfile(); }}>Refresh profile</button>
      <button
        disabled={!user}
        onClick={() => { void updateProfile({ display_name: 'Real Name' }); }}
      >
        Save real name
      </button>
    </>
  );
}

describe('AuthContext same-user profile races', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('dukb-guest-handle', 'IcyPoacher-42');
    fixtures.profileRead.mockReset();
    fixtures.profileUpsert.mockReset();
    fixtures.profileUpsert.mockResolvedValue({ error: null });
    fixtures.profileConditionalUpdate.mockReset();
    fixtures.profileConditionalUpdate.mockResolvedValue({ data: null, error: null });
  });

  it('does not let an older same-user read replace a newer refreshed profile', async () => {
    const olderRead = deferred<ProfileResult>();
    const newerRead = deferred<ProfileResult>();
    fixtures.profileRead
      .mockReturnValueOnce(olderRead.promise)
      .mockReturnValueOnce(newerRead.promise);

    render(<AuthProvider><ProfileHarness /></AuthProvider>);
    expect(await screen.findByTestId('auth-user')).toHaveTextContent('user-a');
    await waitFor(() => expect(fixtures.profileRead).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'Refresh profile' }));
    await waitFor(() => expect(fixtures.profileRead).toHaveBeenCalledTimes(2));

    await act(async () => {
      newerRead.resolve(profileResult('New Name'));
      await newerRead.promise;
    });
    await waitFor(() => expect(screen.getByTestId('profile-name')).toHaveTextContent('New Name'));
    expect(localStorage.getItem('dukb-display-name')).toBe('New Name');

    await act(async () => {
      olderRead.resolve(profileResult('Old Name'));
      await olderRead.promise;
    });

    expect(screen.getByTestId('profile-name')).toHaveTextContent('New Name');
    expect(localStorage.getItem('dukb-display-name')).toBe('New Name');
  });

  it('hydrates streaks from the newest completed same-user profile read', async () => {
    const olderRead = deferred<ProfileResult>();
    const newerRead = deferred<ProfileResult>();
    fixtures.profileRead
      .mockReturnValueOnce(olderRead.promise)
      .mockReturnValueOnce(newerRead.promise);

    render(<AuthProvider><ProfileHarness /></AuthProvider>);
    expect(await screen.findByTestId('auth-user')).toHaveTextContent('user-a');
    await waitFor(() => expect(fixtures.profileRead).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'Refresh profile' }));
    await waitFor(() => expect(fixtures.profileRead).toHaveBeenCalledTimes(2));

    const newerProfile = profileResult('New Name');
    newerProfile.data.streak_state = {
      ...newerProfile.data.streak_state,
      global: { current: 5, longest: 6, lastDate: '2026-09-02' },
      totalPlays: 15,
      totalPoints: 910,
    };
    await act(async () => {
      newerRead.resolve(newerProfile);
      await newerRead.promise;
    });
    await waitFor(() => expect(screen.getByTestId('profile-name')).toHaveTextContent('New Name'));

    await act(async () => {
      olderRead.resolve(profileResult('Old Name'));
      await olderRead.promise;
    });

    expect(getStreakState()).toMatchObject({
      global: { current: 5, longest: 6, lastDate: '2026-09-02' },
      totalPlays: 15,
      totalPoints: 910,
    });
  });

  it('refuses an older initial hydration while a newer same-user read is pending', async () => {
    const olderRead = deferred<ProfileResult>();
    const newerRead = deferred<ProfileResult>();
    fixtures.profileRead
      .mockReturnValueOnce(olderRead.promise)
      .mockReturnValueOnce(newerRead.promise);

    render(<AuthProvider><ProfileHarness /></AuthProvider>);
    expect(await screen.findByTestId('auth-user')).toHaveTextContent('user-a');
    await waitFor(() => expect(fixtures.profileRead).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'Refresh profile' }));
    await waitFor(() => expect(fixtures.profileRead).toHaveBeenCalledTimes(2));

    await act(async () => {
      olderRead.resolve(profileResult('Old Name'));
      await olderRead.promise;
    });

    expect(getStreakState()).toMatchObject({
      global: { current: 0, longest: 0, lastDate: null },
      totalPlays: 0,
      totalPoints: 0,
    });

    const newerProfile = profileResult('New Name');
    newerProfile.data.streak_state = {
      ...newerProfile.data.streak_state,
      global: { current: 5, longest: 6, lastDate: '2026-09-02' },
      totalPlays: 15,
      totalPoints: 910,
    };

    await act(async () => {
      newerRead.resolve(newerProfile);
      await newerRead.promise;
    });
    await waitFor(() => expect(screen.getByTestId('profile-name')).toHaveTextContent('New Name'));
    expect(getStreakState()).toMatchObject({
      global: { current: 0, longest: 0, lastDate: null },
      totalPlays: 0,
      totalPoints: 0,
    });
  });

  it('does not let a delayed generated default overwrite a real name saved concurrently', async () => {
    const initialRead = deferred<ProfileResult>();
    const generatedDefaultWrite = deferred<void>();
    let storedDisplayName: string | null = null;
    const storedUsername: string | null = null;

    fixtures.profileRead
      .mockReturnValueOnce(initialRead.promise)
      .mockImplementation(async () => profileResult(storedDisplayName));
    fixtures.profileUpsert.mockImplementation((rawPayload: unknown) => {
      const payload = rawPayload as { display_name?: string | null };
      if (payload.display_name === 'Real Name') storedDisplayName = 'Real Name';
      return Promise.resolve({ error: null });
    });
    fixtures.profileConditionalUpdate.mockImplementation(async (
      rawPayload: unknown,
      equality: Record<string, unknown>,
      nullFields: Set<string>,
    ) => {
      await generatedDefaultWrite.promise;
      const rowMatches = equality.user_id === 'user-a'
        && (!nullFields.has('display_name') || storedDisplayName === null)
        && (!nullFields.has('username') || storedUsername === null);
      if (!rowMatches) return { data: null, error: null };

      const payload = rawPayload as { display_name?: string | null };
      storedDisplayName = payload.display_name ?? storedDisplayName;
      return { data: profileResult(storedDisplayName).data, error: null };
    });

    render(<AuthProvider><ProfileHarness /></AuthProvider>);
    expect(await screen.findByTestId('auth-user')).toHaveTextContent('user-a');
    await waitFor(() => expect(fixtures.profileRead).toHaveBeenCalledTimes(1));

    await act(async () => {
      initialRead.resolve(profileResult(null));
      await initialRead.promise;
    });
    await waitFor(() => expect(fixtures.profileConditionalUpdate).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'Save real name' }));
    await waitFor(() => expect(screen.getByTestId('profile-name')).toHaveTextContent('Real Name'));
    expect(localStorage.getItem('dukb-display-name')).toBe('Real Name');

    await act(async () => {
      generatedDefaultWrite.resolve(undefined);
      await generatedDefaultWrite.promise;
    });

    expect(screen.getByTestId('profile-name')).toHaveTextContent('Real Name');
    expect(localStorage.getItem('dukb-display-name')).toBe('Real Name');

    fireEvent.click(screen.getByRole('button', { name: 'Refresh profile' }));
    await waitFor(() => expect(screen.getByTestId('profile-name')).toHaveTextContent('Real Name'));
  });
});
