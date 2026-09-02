import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const profileRow: {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  streak_state: unknown;
  created_at: string;
  updated_at: string;
} = {
  id: 'profile-1',
  user_id: 'user-1',
  username: null,
  display_name: null,
  avatar_url: null,
  streak_state: {},
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
};

const maybeSingle = vi.fn(async () => ({ data: profileRow, error: null }));
const eq = vi.fn(() => ({ maybeSingle }));
const select = vi.fn(() => ({ eq }));
const upsert = vi.fn(async () => ({ error: null }));
const unsubscribe = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({ select, upsert })),
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe } } })),
      getSession: vi.fn(async () => ({
        data: { session: { user: { id: 'user-1' }, access_token: 'token' } },
      })),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import {
  restoreStreakStateFromProfile,
  type StreakState,
} from '@/lib/streaks';
import { useStreaks } from '@/hooks/useStreaks';

const localState: StreakState = {
  version: 1,
  global: { current: 1, longest: 3, lastDate: '2026-09-02' },
  perGame: {
    'soccer-grid': { current: 1, longest: 2, lastDate: '2026-09-02' },
  },
  loginDates: ['2026-09-02'],
  totalPlays: 4,
  totalPoints: 320,
};

const remoteState: StreakState = {
  version: 1,
  global: { current: 5, longest: 5, lastDate: '2026-09-01' },
  perGame: {
    'soccer-grid': { current: 4, longest: 4, lastDate: '2026-09-01' },
    footle: { current: 2, longest: 3, lastDate: '2026-09-01' },
  },
  loginDates: ['2026-08-31', '2026-09-01'],
  totalPlays: 18,
  totalPoints: 1400,
};

function ProfileName() {
  const { profile } = useAuth();
  return <p>{profile?.display_name ?? 'loading'}</p>;
}

function CurrentStreak() {
  const { globalCurrentStreak } = useStreaks();
  return <p>streak {globalCurrentStreak}</p>;
}

describe('account progress migration', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('dukb-guest-handle', 'IcyPoacher-42');
    localStorage.setItem('dukb-streaks-v1', JSON.stringify(localState));
    profileRow.display_name = null;
    profileRow.username = null;
    profileRow.streak_state = {};
    maybeSingle.mockClear();
    upsert.mockReset();
    upsert.mockResolvedValue({ error: null });
  });

  it('installs the saved profile streak locally and announces the restore', () => {
    const restored = vi.fn();
    window.addEventListener('dukb-streaks-restored', restored);

    const saved = restoreStreakStateFromProfile(remoteState);

    expect(saved).toEqual({
      ...remoteState,
      loginDates: ['2026-08-31', '2026-09-01', '2026-09-02'],
    });
    expect(JSON.parse(localStorage.getItem('dukb-streaks-v1') ?? 'null')).toEqual(saved);
    expect(restored).toHaveBeenCalledTimes(1);
    window.removeEventListener('dukb-streaks-restored', restored);
  });

  it('moves the guest handle and local streak into a newly loaded blank account profile', async () => {
    await act(async () => {
      render(<AuthProvider><ProfileName /></AuthProvider>);
    });

    expect(await screen.findByText('IcyPoacher-42')).toBeInTheDocument();
    await waitFor(() => expect(upsert).toHaveBeenCalled());
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        display_name: 'IcyPoacher-42',
        streak_state: localState,
      }),
      { onConflict: 'user_id' },
    );
  });

  it('keeps an existing account name and restores its saved streak on this device', async () => {
    profileRow.display_name = 'Captain42';
    profileRow.streak_state = remoteState;

    await act(async () => {
      render(
        <AuthProvider>
          <ProfileName />
          <CurrentStreak />
        </AuthProvider>,
      );
    });

    expect(await screen.findByText('Captain42')).toBeInTheDocument();
    expect(await screen.findByText('streak 5')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('dukb-streaks-v1') ?? 'null')).toEqual({
      ...remoteState,
      loginDates: ['2026-08-31', '2026-09-01', '2026-09-02'],
    });
    expect(upsert).not.toHaveBeenCalled();
  });

  it('leaves local progress playable when the profile backup is offline', async () => {
    upsert.mockResolvedValueOnce({ error: new Error('offline') });

    await act(async () => {
      render(<AuthProvider><CurrentStreak /></AuthProvider>);
    });

    await waitFor(() => expect(upsert).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('streak 1')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('dukb-streaks-v1') ?? 'null')).toEqual(localState);
  });
});
