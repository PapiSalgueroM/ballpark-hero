import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sessionKey = 'sb-flawuiqbvjobmkfkauhw-auth-token';
const storedSession = () => ({
  access_token: 'test-access-token', refresh_token: 'test-refresh-token', token_type: 'bearer',
  expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: { id: 'storage-fixture', aud: 'authenticated', created_at: new Date().toISOString() },
});
let stopRefresh: (() => void) | undefined;

beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
  vi.stubGlobal('BroadcastChannel', undefined);
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('No network in this test'))));
});

afterEach(() => {
  stopRefresh?.();
  stopRefresh = undefined;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

async function loadSession() {
  const { supabase } = await import('./client');
  stopRefresh = () => supabase.auth.stopAutoRefresh();
  return supabase.auth.getSession();
}

describe('auth startup storage', () => {
  it('starts signed out when the localStorage getter is denied', async () => {
    const denied = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Storage blocked', 'SecurityError');
    });
    await expect(loadSession()).resolves.toMatchObject({ data: { session: null }, error: null });
    expect(denied).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('starts signed out when storage cannot be written', async () => {
    localStorage.setItem(sessionKey, JSON.stringify(storedSession()));
    const denied = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage full', 'QuotaExceededError');
    });
    await expect(loadSession()).resolves.toMatchObject({ data: { session: null }, error: null });
    expect(denied).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
