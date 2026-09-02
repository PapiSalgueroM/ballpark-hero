import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fixtures = vi.hoisted(() => {
  let resolveSignOut = () => undefined;
  const profileResult = {
    data: {
      id: 'profile-1',
      user_id: 'user-1',
      username: null,
      display_name: 'Captain42',
      avatar_url: null,
      streak_state: {},
      created_at: '2026-09-01T00:00:00.000Z',
      updated_at: '2026-09-01T00:00:00.000Z',
    },
    error: null,
  };
  return {
    authCallback: null as null | ((event: string, session: unknown) => void),
    signOutGate: () => new Promise<void>((resolve) => { resolveSignOut = resolve; }),
    resolveSignOut: () => resolveSignOut(),
    profileResult,
    profileRead: vi.fn(async () => profileResult),
  };
});

vi.mock('@/integrations/supabase/client', () => {
  return {
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: fixtures.profileRead,
          })),
        })),
        upsert: vi.fn(async () => ({ error: null })),
      })),
      auth: {
        onAuthStateChange: vi.fn((callback: (event: string, session: unknown) => void) => {
          fixtures.authCallback = callback;
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        }),
        getSession: vi.fn(async () => ({
          data: { session: { user: { id: 'user-1' }, access_token: 'token' } },
        })),
        signOut: vi.fn(() => fixtures.signOutGate()),
        signUp: vi.fn(),
        signInWithPassword: vi.fn(),
      },
    },
  };
});

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { usePlayerName } from '@/hooks/usePlayerName';

function IdentityButton() {
  const { profile, signOut } = useAuth();
  const playerName = usePlayerName(profile);
  return <button onClick={() => { void signOut(); }}>{playerName ?? 'loading'}</button>;
}

describe('sign-out identity transition', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('dukb-display-name', 'Captain42');
    localStorage.setItem('dukb-guest-handle', 'IcyPoacher-42');
    fixtures.authCallback = null;
    fixtures.profileRead.mockReset();
    fixtures.profileRead.mockResolvedValue(fixtures.profileResult);
  });

  it('switches back to the guest handle when the auth callback arrives before signOut resolves', async () => {
    render(<AuthProvider><IdentityButton /></AuthProvider>);
    const button = await screen.findByRole('button', { name: 'Captain42' });
    fireEvent.click(button);

    await act(async () => {
      fixtures.authCallback?.('SIGNED_OUT', null);
    });

    expect(await screen.findByRole('button', { name: 'IcyPoacher-42' })).toBeInTheDocument();
    await act(async () => {
      fixtures.resolveSignOut();
    });
  });

  it('ignores a signed-in profile read that resolves after the session signed out', async () => {
    let releaseProfile = (_value: typeof fixtures.profileResult) => undefined;
    const heldProfile = new Promise<typeof fixtures.profileResult>((resolve) => { releaseProfile = resolve; });
    fixtures.profileRead.mockReturnValueOnce(heldProfile);

    render(<AuthProvider><IdentityButton /></AuthProvider>);
    const button = await screen.findByRole('button', { name: 'Captain42' });
    fireEvent.click(button);
    await act(async () => {
      fixtures.authCallback?.('SIGNED_OUT', null);
      fixtures.resolveSignOut();
    });
    expect(await screen.findByRole('button', { name: 'IcyPoacher-42' })).toBeInTheDocument();

    await act(async () => {
      releaseProfile(fixtures.profileResult);
      await heldProfile;
    });

    expect(screen.getByRole('button', { name: 'IcyPoacher-42' })).toBeInTheDocument();
    expect(localStorage.getItem('dukb-display-name')).toBeNull();
  });
});
