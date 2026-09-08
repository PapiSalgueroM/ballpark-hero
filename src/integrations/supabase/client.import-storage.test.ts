import { afterEach, expect, it, vi } from 'vitest';

let stopRefresh: (() => void) | undefined;
const sdkCopyMarker = '__DUKB_STORAGE_AUTH_SDK_COPY__';

afterEach(() => {
  stopRefresh?.();
  stopRefresh = undefined;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete (globalThis as typeof globalThis & Record<string, unknown>)[sdkCopyMarker];
  localStorage.clear();
});

it('imports the auth client when all localStorage reads are denied', async () => {
  vi.stubGlobal('BroadcastChannel', undefined);
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('No network in this test'))));
  const denied = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('Storage blocked', 'SecurityError');
  });

  const { supabase } = await import('./client');
  stopRefresh = () => supabase.auth.stopAutoRefresh();

  await expect(supabase.auth.getSession()).resolves.toMatchObject({ data: { session: null }, error: null });
  expect(denied).toHaveBeenCalled();
  if (process.env.STORAGE_EXPECT_AUTH_SDK_COPY === '1') {
    expect((globalThis as typeof globalThis & Record<string, unknown>)[sdkCopyMarker]).toBe(true);
  }
  expect(fetch).not.toHaveBeenCalled();
});
