import { afterEach, expect, it, vi } from 'vitest';

// A separate file gives the SDK a fresh browser, including its cached storage probe.
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });

it('restores a stored auth session and leaves game saves unchanged', async () => {
  vi.stubGlobal('BroadcastChannel', undefined);
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('No network in this test'))));
  const key = 'sb-flawuiqbvjobmkfkauhw-auth-token';
  const session = {
    access_token: 'test-access-token', refresh_token: 'test-refresh-token', token_type: 'bearer',
    expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: 'storage-fixture', aud: 'authenticated', created_at: new Date().toISOString() },
  };
  localStorage.setItem(key, JSON.stringify(session));
  localStorage.setItem('storage-test-game-save', '{"season":8}');
  const { supabase } = await import('./client');
  try {
    const result = await supabase.auth.getSession();
    expect(result.error).toBeNull();
    expect(result.data.session?.access_token).toBe(session.access_token);
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual(session);
    expect(localStorage.getItem('storage-test-game-save')).toBe('{"season":8}');
    expect(fetch).not.toHaveBeenCalled();
  } finally {
    supabase.auth.stopAutoRefresh();
  }
});
