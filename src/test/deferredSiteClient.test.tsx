import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { recordActivity, recordCompletion } from '@/lib/completions';

const loader = vi.hoisted(() => vi.fn());
vi.mock('@/integrations/supabase/loadClient', () => ({ loadSupabase: loader }));

function deferred() {
  let open!: (client: unknown) => void;
  const promise = new Promise(resolve => { open = resolve; });
  loader.mockReturnValue(promise);
  return open;
}

const session = {
  user: { id: 'local-test-user', email: 'player@example.invalid' },
} as Session;

function AuthProbe() {
  const auth = useAuth();
  return <>
    <button type="button" onClick={() => void auth.signIn('player@example.invalid', 'local-test-password')}>Sign in</button>
    <span>{auth.loading ? 'Opening account' : auth.user?.email ?? 'Guest player'}</span>
  </>;
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  loader.mockReset();
});

describe('deferred site client', () => {
  it('renders the shell while loading, then subscribes before reading and applying the session', async () => {
    const open = deferred();
    const order: string[] = [];
    const unsubscribe = vi.fn();
    let notify!: (event: AuthChangeEvent, next: Session | null) => void;
    const signInWithPassword = vi.fn(async () => {
      notify('SIGNED_IN', session);
      return { error: null };
    });
    const getSession = vi.fn(async () => {
      order.push('session');
      return { data: { session: null } };
    });
    const view = render(<AuthProvider><AuthProbe /></AuthProvider>);
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeVisible();
    expect(screen.getByText('Opening account')).toBeVisible();
    expect(getSession).not.toHaveBeenCalled();

    await act(async () => open({
      auth: {
        onAuthStateChange: (listener: typeof notify) => {
          order.push('listener');
          notify = listener;
          return { data: { subscription: { unsubscribe } } };
        },
        getSession,
        signInWithPassword,
      },
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
    }));
    expect(screen.getByText('Guest player')).toBeVisible();
    expect(order).toEqual(['listener', 'session']);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await screen.findByText('player@example.invalid');
    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'player@example.invalid', password: 'local-test-password' });
    view.unmount();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it('keeps the activity insert separate and saves one authenticated completion after the client arrives', async () => {
    const open = deferred();
    const insert = vi.fn(async () => ({ error: null }));
    const rpc = vi.fn(async () => ({ error: null }));
    const getSession = vi.fn(async () => ({ data: { session } }));
    recordActivity('/club-manager', 5, 'Fixture');
    recordCompletion('/nba-my-career', 42, 'Fixture', 3);
    expect(insert).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();

    open({
      from: (table: string) => table === 'profiles' ? { upsert: async () => ({ error: null }) } : { insert },
      auth: { getSession },
      rpc,
    });
    await waitFor(() => expect(rpc).toHaveBeenCalledExactlyOnceWith('record_auth_completion', {
      p_game_slug: 'nba-my-career', p_score: 42, p_correct: 3,
    }));
    expect(insert.mock.calls).toEqual([
      [{ game: 'club-manager', score: 5, player_name: 'Fixture' }],
      [{ game: 'nba-my-career', score: 42, player_name: 'Fixture' }],
    ]);
    expect(getSession).toHaveBeenCalledOnce();
  });
});
