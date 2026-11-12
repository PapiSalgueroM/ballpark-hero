import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const create = vi.hoisted(() => vi.fn());
vi.mock('@supabase/supabase-js', () => ({ createClient: create }));

const key = 'sb-flawuiqbvjobmkfkauhw-auth-token';
const player = { user: { id: 'fixture-user', email: 'player@example.invalid' } } as Session;
const home = window.location.href;
const storageDescriptors = (['localStorage', 'sessionStorage'] as const).map(name =>
  [name, Object.getOwnPropertyDescriptor(window, name)!] as const);

function fixture(initial: Session | null = null) {
  const calls: string[] = [];
  let listener: ((event: AuthChangeEvent, session: Session | null) => void) | undefined;
  const notify = (event: AuthChangeEvent, session: Session | null) => listener?.(event, session);
  const unsubscribe = vi.fn();
  const onAuthStateChange = vi.fn((callback: typeof listener) => {
    calls.push('listen');
    listener = callback;
    return { data: { subscription: { unsubscribe } } };
  });
  const getSession = vi.fn(async () => {
    calls.push('read session');
    return { data: { session: initial } };
  });
  const signInWithPassword = vi.fn(async () => {
    notify('SIGNED_IN', player);
    return { data: { session: player }, error: null };
  });
  const from = vi.fn(() => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
  }));
  create.mockReturnValue({ auth: { onAuthStateChange, getSession, signInWithPassword }, from });
  return { calls, notify, unsubscribe, onAuthStateChange, getSession, signInWithPassword };
}

async function mount(path = '/soccer-career', { storageNotice = true, creator = false } = {}) {
  window.history.replaceState(null, '', path);
  const { HelmetProvider } = await import('react-helmet-async');
  const { AuthProvider, useAuth } = await import('@/contexts/AuthContext');
  const { StorageNotice } = await import('@/components/StorageNotice');
  const Creator = creator ? (await import('@/pages/SoccerCareerEntry')).default : null;
  function State() {
    const { loading, user } = useAuth();
    return <span>{loading ? 'Opening account' : user?.email ?? 'Guest ready'}</span>;
  }
  const view = render(<HelmetProvider><MemoryRouter initialEntries={['/soccer-career']}>
    <AuthProvider>
      {storageNotice && <StorageNotice />}
      {Creator && <Creator />}
      <State />
    </AuthProvider>
  </MemoryRouter></HelmetProvider>);
  await act(async () => {});
  return view;
}

beforeEach(() => { vi.resetModules(); create.mockReset(); });
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  for (const [name, descriptor] of storageDescriptors) Object.defineProperty(window, name, descriptor);
  localStorage.clear();
  window.history.replaceState(null, '', home);
});

describe('guest game account startup', () => {
  it('keeps the actual creator and account opener usable before the first client request', async () => {
    const client = fixture();
    const view = await mount('/soccer-career', { creator: true });
    expect(screen.getByText('Guest ready')).toBeVisible();
    const name = screen.getByRole('textbox', { name: 'Player Name' });
    fireEvent.change(name, { target: { value: 'Guest Career' } });
    expect(name).toHaveValue('Guest Career');
    const account = screen.getByRole('button', { name: /track (your )?stats/i });
    expect(account).toBeEnabled();
    expect(create).not.toHaveBeenCalled();

    fireEvent.click(account);
    await screen.findByRole('dialog');
    expect(name).toHaveValue('Guest Career');
    expect(create).toHaveBeenCalledOnce();
    expect(client.calls).toEqual(['listen', 'read session']);

    fireEvent.click(screen.getByRole('button', { name: 'Sign in', exact: true }));
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'player@example.invalid' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'local-test-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In', exact: true }));
    await screen.findByText('player@example.invalid');
    expect(client.signInWithPassword).toHaveBeenCalledExactlyOnceWith({ email: 'player@example.invalid', password: 'local-test-password' });
    expect(name).toHaveValue('Guest Career');
    expect(client.onAuthStateChange).toHaveBeenCalledOnce();
    view.unmount();
    expect(client.unsubscribe).toHaveBeenCalledOnce();
  });

  it('attaches to an already imported client when the provider mounts', async () => {
    const client = fixture(player);
    await import('@/integrations/supabase/client');
    const view = await mount();
    await screen.findByText('player@example.invalid');
    expect(create).toHaveBeenCalledOnce();
    expect(client.calls).toEqual(['listen', 'read session']);
    view.unmount();
    expect(client.unsubscribe).toHaveBeenCalledOnce();
  });

  it('starts on a peer session write and ignores unrelated storage events', async () => {
    const client = fixture(player);
    const view = await mount();
    expect(screen.getByText('Guest ready')).toBeVisible();
    const signal = (event: StorageEventInit) => act(() => { window.dispatchEvent(new StorageEvent('storage', event)); });
    signal({ key: 'other-save', newValue: '{}' });
    signal({ key, newValue: null });
    expect(create).not.toHaveBeenCalled();

    localStorage.setItem(key, 'fixture session');
    signal({ key, newValue: 'fixture session', storageArea: localStorage });
    signal({ key, newValue: 'fixture session', storageArea: localStorage });
    await screen.findByText('player@example.invalid');
    expect(create).toHaveBeenCalledOnce();
    expect(client.calls).toEqual(['listen', 'read session']);
    view.unmount();
    expect(client.unsubscribe).toHaveBeenCalledOnce();
  });

  it.each([
    ['saved session', '/soccer-career', key],
    ['pending verifier', '/soccer-career', key + '-code-verifier'],
    ['PKCE return', '/soccer-career?code=fixture', key + '-code-verifier'],
    ['recovery hash on a game', '/soccer-career#access_token=fixture&type=recovery', null],
    ['OAuth error', '/soccer-career?error_description=expired', null],
    ['reset route', '/reset-password/', null],
    ['profile route', '/profile/player', null],
    ['admin route', '/admin/login', null],
  ] as const)('bootstraps eagerly for %s', async (reason, url, storedKey) => {
    const client = fixture(reason === 'saved session' ? player : null);
    if (storedKey) localStorage.setItem(storedKey, 'fixture');
    await mount(url);
    await waitFor(() => expect(client.getSession).toHaveBeenCalledOnce());
    expect(client.calls).toEqual(['listen', 'read session']);
    expect(create).toHaveBeenCalledOnce();
    const [projectUrl, , options] = create.mock.calls[0];
    expect(options.auth.storageKey).toBe(key);
    expect(key).toBe('sb-' + new URL(projectUrl).hostname.split('.')[0] + '-auth-token');
    if (reason === 'saved session') {
      expect(screen.getByText('player@example.invalid')).toBeVisible();
      expect(localStorage.getItem(key)).toBe('fixture');
    }
    if (reason === 'reset route') {
      window.history.replaceState(null, '', '/reset-password');
      act(() => client.notify('PASSWORD_RECOVERY', player));
      await screen.findByText('player@example.invalid');
    }
  });

  it('activates when storage fills after a guest starts playing', async () => {
    const client = fixture();
    await mount();
    expect(create).not.toHaveBeenCalled();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Storage full', 'QuotaExceededError'); });
    const { safeLocalStorage } = await import('@/lib/safeStorage');
    await act(async () => safeLocalStorage.setItem('another-save', 'kept for this visit'));
    await waitFor(() => expect(client.getSession).toHaveBeenCalledOnce());
    expect(safeLocalStorage.getItem('another-save')).toBe('kept for this visit');
    expect(client.calls).toEqual(['listen', 'read session']);
  });

  it.each(['unprobed', 'blocked', 'full'] as const)('bootstraps for %s storage', async state => {
    const client = fixture();
    if (state === 'blocked') vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Access denied', 'SecurityError');
    });
    if (state === 'full') vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage full', 'QuotaExceededError');
    });
    await mount('/soccer-career', { storageNotice: state !== 'unprobed' });
    await waitFor(() => expect(client.getSession).toHaveBeenCalledOnce());
    expect(client.calls).toEqual(['listen', 'read session']);
    if (state !== 'unprobed') expect(screen.getByRole('status')).toHaveAttribute('data-dukb-storage-notice', state);
  });
});
