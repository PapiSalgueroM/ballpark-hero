/**
 * Round 1142 review: a guest handle the browser will not keep is one handle
 * for the visit, not a new one on every call.
 *
 * What was measured on the built site with storage full and no handle stored
 * yet: every game page rendered for ever (about five thousand refused writes
 * of dukb-guest-handle a second) and a link changed the address without the
 * next page ever being drawn. getGuestHandle minted a new random name each
 * time its write was refused, useGameNavbarStats reads it on every render and
 * lists it as an effect dependency, and that effect sets state.
 */
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const KEY = 'dukb-guest-handle';
const POOL_SHAPE = /^[A-Z][a-z]+[A-Z][a-z]+-\d{2}$/;
function quota(): never {
  throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
}
function denied(): never {
  throw new DOMException('Access is denied for this document.', 'SecurityError');
}
const load = async () => { vi.resetModules(); return import('@/lib/completions'); };

beforeEach(() => { window.localStorage.clear(); });
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.doUnmock('@/contexts/AuthContext');
  vi.doUnmock('@/integrations/supabase/client');
});

describe('getGuestHandle when the handle cannot be stored', () => {
  it('storage full, nothing stored: the same handle every call, and one refused write, not one a call', async () => {
    const writes = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(quota);
    const { getGuestHandle } = await load();
    const first = getGuestHandle();
    expect(first).toMatch(POOL_SHAPE);
    for (let i = 0; i < 50; i += 1) expect(getGuestHandle()).toBe(first);
    expect(writes.mock.calls.filter(c => c[0] === KEY)).toHaveLength(1);
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it('storage full with a legacy handle stored: one new handle for the visit, never the legacy one', async () => {
    window.localStorage.setItem(KEY, 'Baller-1234');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(quota);
    const { getGuestHandle } = await load();
    const first = getGuestHandle();
    expect(first).not.toBe('Baller-1234');
    expect(first).toMatch(POOL_SHAPE);
    for (let i = 0; i < 50; i += 1) expect(getGuestHandle()).toBe(first);
  });

  it('storage that cannot be read at all: the same handle every call', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(denied);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(denied);
    const { getGuestHandle } = await load();
    const first = getGuestHandle();
    for (let i = 0; i < 50; i += 1) expect(getGuestHandle()).toBe(first);
  });

  it('a handle already stored still wins, full or not', async () => {
    window.localStorage.setItem(KEY, 'IcyKeeper-42');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(quota);
    const { getGuestHandle } = await load();
    expect(getGuestHandle()).toBe('IcyKeeper-42');
  });

  it('ordinary storage is exactly as before: minted once, stored, and a cleared key mints a new one', async () => {
    const { getGuestHandle } = await load();
    const first = getGuestHandle();
    expect(window.localStorage.getItem(KEY)).toBe(first);
    expect(getGuestHandle()).toBe(first);
    const seen = new Set<string>();
    for (let i = 0; i < 40; i += 1) { window.localStorage.removeItem(KEY); seen.add(getGuestHandle()); }
    /* forty mints from a pool of about 150,000 names: a visit handle held in
       memory would make this exactly one */
    expect(seen.size).toBeGreaterThan(20);
  });
});

describe('the navbar stats hook with storage full', () => {
  it('settles: it does not render for ever on a handle that changes every render', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(quota);
    vi.resetModules();
    vi.doMock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, loading: false }) }));
    vi.doMock('@/integrations/supabase/client', () => ({ supabase: {} }));
    const { useGameNavbarStats } = await import('@/hooks/useGameNavbarStats');
    let renders = 0;
    function Probe() {
      renders += 1;
      /* fail in a second instead of hanging until the test times out */
      if (renders > 200) throw new Error('useGameNavbarStats is rendering for ever');
      const stats = useGameNavbarStats();
      return <p>{stats.gamesPlayedToday}</p>;
    }
    await act(async () => { render(<Probe />); });
    const afterMount = renders;
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 60)); });
    /* measured before the fix: the count climbs without end (React stops it at
       its own update depth limit in a test, the browser never does) */
    expect(afterMount).toBeLessThan(10);
    expect(renders).toBe(afterMount);
  });
});
