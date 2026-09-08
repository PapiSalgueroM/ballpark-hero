import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear(); });

it('finishes auth startup when session reads are denied but writes work', async () => {
  vi.stubGlobal('BroadcastChannel', undefined);
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('No network in this test'))));
  const original = Storage.prototype.getItem;
  const denied = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (key) {
    if (key === 'sb-flawuiqbvjobmkfkauhw-auth-token') {
      throw new DOMException('Storage blocked', 'SecurityError');
    }
    return original.call(this, key);
  });
  const { AuthProvider, useAuth } = await import('@/contexts/AuthContext');
  const { supabase } = await import('./client');
  const State = () => {
    const { loading, user } = useAuth();
    return <p>{loading ? 'Checking session' : user ? 'Signed in' : 'Ready to play as guest'}</p>;
  };
  try {
    render(<AuthProvider><State /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('Ready to play as guest')).toBeVisible());
    expect(denied).toHaveBeenCalledWith('sb-flawuiqbvjobmkfkauhw-auth-token');
    expect(fetch).not.toHaveBeenCalled();
  } finally {
    supabase.auth.stopAutoRefresh();
  }
});
