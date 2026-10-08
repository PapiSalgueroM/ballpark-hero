/**
 * Round 1142: src/integrations/supabase/client.ts under a browser that blocks
 * storage. That file read window.localStorage as it loaded, the read threw,
 * and the whole site died before React mounted. It is also the file CLAUDE.md
 * calls the easiest way to break everything, so this pins what must not move:
 * the project URL and the public key (by hash, so the key is not written out
 * in one more place). No network: fetch is stubbed and must never be called.
 */
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const PINNED_URL = 'https://flawuiqbvjobmkfkauhw.supabase.co';
const PINNED_KEY_SHA256 = 'f1db915615dc955658e9bae10042537e2a9e7fea7e508ff37bd33e792513bd9b';
const AUTH_KEY = 'sb-flawuiqbvjobmkfkauhw-auth-token';
const NAMES = ['localStorage', 'sessionStorage'] as const;
const original = new Map<string, PropertyDescriptor | undefined>();
let stop: (() => void) | undefined;

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
function denied(): never {
  throw new DOMException("Failed to read the 'localStorage' property from 'Window': Access is denied for this document.", 'SecurityError');
}
async function loadClient() {
  vi.resetModules();
  const mod = await import('@/integrations/supabase/client');
  stop = () => { void mod.supabase.auth.stopAutoRefresh(); };
  return mod;
}
function fixtureSession() {
  return {
    access_token: 'test-access-token', refresh_token: 'test-refresh-token', token_type: 'bearer',
    expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: 'storage-fixture', aud: 'authenticated', created_at: new Date().toISOString() },
  };
}

beforeEach(() => {
  for (const name of NAMES) original.set(name, Object.getOwnPropertyDescriptor(window, name));
  window.localStorage.clear();
  vi.stubGlobal('BroadcastChannel', undefined);
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('No network in this test'))));
});
afterEach(() => {
  stop?.();
  stop = undefined;
  vi.restoreAllMocks();
  for (const name of NAMES) {
    const d = original.get(name);
    if (d) Object.defineProperty(window, name, d); else delete (window as unknown as Record<string, unknown>)[name];
  }
  vi.unstubAllGlobals();
});

describe('the Supabase client when the browser blocks storage', () => {
  it('loads without throwing, with the pinned project URL and public key', async () => {
    for (const name of NAMES) Object.defineProperty(window, name, { configurable: true, get: denied });
    expect(() => window.localStorage).toThrow();
    const mod = await loadClient();
    expect(mod.SUPABASE_URL).toBe(PINNED_URL);
    expect(typeof mod.SUPABASE_PUBLISHABLE_KEY).toBe('string');
    expect(mod.SUPABASE_PUBLISHABLE_KEY).toHaveLength(208);
    expect(sha(mod.SUPABASE_PUBLISHABLE_KEY)).toBe(PINNED_KEY_SHA256);
    await expect(mod.supabase.auth.getSession()).resolves.toMatchObject({ data: { session: null }, error: null });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('pins the same two strings in a browser that stores normally, and restores a stored session', async () => {
    const session = fixtureSession();
    window.localStorage.setItem(AUTH_KEY, JSON.stringify(session));
    window.localStorage.setItem('storage-test-game-save', '{"season":8}');
    const mod = await loadClient();
    expect(mod.SUPABASE_URL).toBe(PINNED_URL);
    expect(sha(mod.SUPABASE_PUBLISHABLE_KEY)).toBe(PINNED_KEY_SHA256);
    const result = await mod.supabase.auth.getSession();
    expect(result.error).toBeNull();
    expect(result.data.session?.access_token).toBe(session.access_token);
    expect(JSON.parse(window.localStorage.getItem(AUTH_KEY) as string)).toEqual(session);
    expect(window.localStorage.getItem('storage-test-game-save')).toBe('{"season":8}');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('keeps a signed in player signed in when storage is full (reads still reach the stored session)', async () => {
    const session = fixtureSession();
    window.localStorage.setItem(AUTH_KEY, JSON.stringify(session));
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    });
    const mod = await loadClient();
    const result = await mod.supabase.auth.getSession();
    expect(result.error).toBeNull();
    expect(result.data.session?.access_token).toBe(session.access_token);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('the client file itself', () => {
  it('still pins the URL and key as literals and never reads an env var', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const text = fs.readFileSync(path.resolve(process.cwd(), 'src/integrations/supabase/client.ts'), 'utf8');
    const code = text.split(/\r?\n/).filter(line => !line.trim().startsWith('//')).join('\n');
    expect(code).toContain(`export const SUPABASE_URL = "${PINNED_URL}";`);
    expect(code).toMatch(/export const SUPABASE_PUBLISHABLE_KEY = "[^"]{208}";/);
    expect(code).not.toMatch(/import\.meta\.env|process\.env|VITE_SUPABASE/);
    expect(code).toContain('storage: safeLocalStorage,');
    expect(code).not.toMatch(/storage:\s*(window\.)?localStorage\b/);
  });
});

describe('the Supabase client when the browser refuses Web Locks as well', () => {
  /* What a real Chromium does with site data blocked: storage throws, and
     every navigator.locks.request rejects before its callback runs. The auth
     client locks around each session read, so before the stand in each page
     load threw three uncaught "The request was denied." errors. If the stand
     in stops working this test fails on the rejection, loudly. */
  const nav = window.navigator as Navigator & { locks?: unknown };
  let hadLocks: PropertyDescriptor | undefined;
  beforeEach(() => { hadLocks = Object.getOwnPropertyDescriptor(nav, 'locks'); });
  afterEach(() => {
    if (hadLocks) Object.defineProperty(nav, 'locks', hadLocks); else delete (nav as unknown as Record<string, unknown>).locks;
  });

  it('still answers getSession, signed out, with nothing thrown', async () => {
    for (const name of NAMES) Object.defineProperty(window, name, { configurable: true, get: denied });
    const refused = vi.fn(() => Promise.reject(new DOMException('The request was denied.', 'SecurityError')));
    Object.defineProperty(nav, 'locks', { configurable: true, value: { request: refused } });
    const mod = await loadClient();
    await expect(mod.supabase.auth.getSession()).resolves.toMatchObject({ data: { session: null }, error: null });
    /* the client really did go through the lock, and the browser really did refuse it */
    expect(refused).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
