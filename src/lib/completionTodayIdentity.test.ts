import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fixtures = vi.hoisted(() => ({
  insert: vi.fn(async () => ({ error: null })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({ insert: fixtures.insert })),
  },
}));

import {
  getLocalTodayCount,
  recordActivity,
  setLocalCompletionStorageIdentity,
} from '@/lib/completions';

describe('local completion identity storage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-02T16:00:00.000Z'));
    localStorage.clear();
    localStorage.setItem('dukb-guest-handle', 'IcyPoacher-42');
    localStorage.setItem('dukb-local-completions', JSON.stringify({
      date: '2026-09-02',
      slugs: ['footle', 'soccer-grid'],
    }));
    fixtures.insert.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('adopts guest games into the first account without sharing them with another account', () => {
    setLocalCompletionStorageIdentity(null);
    expect(getLocalTodayCount()).toBe(2);

    setLocalCompletionStorageIdentity('account-a');
    expect(getLocalTodayCount()).toBe(2);
    recordActivity('/transfer-path');
    expect(getLocalTodayCount()).toBe(3);

    setLocalCompletionStorageIdentity('account-b');
    expect(getLocalTodayCount()).toBe(0);
    recordActivity('/player-bingo');
    expect(getLocalTodayCount()).toBe(1);

    setLocalCompletionStorageIdentity(null);
    expect(getLocalTodayCount()).toBe(2);
    setLocalCompletionStorageIdentity('account-a');
    expect(getLocalTodayCount()).toBe(3);
    setLocalCompletionStorageIdentity('account-b');
    expect(getLocalTodayCount()).toBe(1);
  });

  it('repairs a corrupt active payload from the current account copy', () => {
    setLocalCompletionStorageIdentity('account-a');
    recordActivity('/transfer-path');
    expect(getLocalTodayCount()).toBe(3);

    localStorage.setItem('dukb-local-completions', 'not-json');
    setLocalCompletionStorageIdentity('account-a');

    expect(getLocalTodayCount()).toBe(3);
  });

  it('never leaves the previous account payload visible if restoring the next one cannot be written', () => {
    setLocalCompletionStorageIdentity('account-a');
    recordActivity('/transfer-path');
    localStorage.setItem(
      'dukb-local-completions-scoped-v1:account-b',
      JSON.stringify({ date: '2026-09-02', slugs: ['player-bingo'] }),
    );

    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function setItem(key, value) {
      if (key === 'dukb-local-completions' && value.includes('player-bingo')) {
        throw new Error('quota');
      }
      return originalSetItem.call(this, key, value);
    });

    setLocalCompletionStorageIdentity('account-b');

    expect(getLocalTodayCount()).toBe(1);
    expect(localStorage.getItem('dukb-local-completions-identity-v1')).toBe('account-b');
  });

  it('clears Account A before an early archive failure can expose it to Account B', () => {
    setLocalCompletionStorageIdentity('account-a');
    recordActivity('/transfer-path');
    const accountABefore = localStorage.getItem('dukb-local-completions-scoped-v1:account-a');

    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function setItem(key, value) {
      if (key === 'dukb-local-completions-scoped-v1:account-a') {
        throw new Error('quota');
      }
      return originalSetItem.call(this, key, value);
    });

    setLocalCompletionStorageIdentity('account-b');

    expect(getLocalTodayCount()).toBe(0);
    expect(localStorage.getItem('dukb-local-completions-identity-v1')).toBeNull();
    recordActivity('/player-bingo');
    expect(getLocalTodayCount()).toBe(1);
    expect(localStorage.getItem('dukb-local-completions-scoped-v1:account-a')).toBe(accountABefore);
  });

  it('removes Account A ownership before the Account B marker write can fail', () => {
    setLocalCompletionStorageIdentity('account-a');
    recordActivity('/transfer-path');
    const accountABefore = localStorage.getItem('dukb-local-completions-scoped-v1:account-a');

    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function setItem(key, value) {
      if (key === 'dukb-local-completions-identity-v1' && value === 'account-b') {
        throw new Error('quota');
      }
      return originalSetItem.call(this, key, value);
    });

    setLocalCompletionStorageIdentity('account-b');

    expect(getLocalTodayCount()).toBe(0);
    expect(localStorage.getItem('dukb-local-completions-identity-v1')).toBeNull();
    recordActivity('/player-bingo');
    expect(getLocalTodayCount()).toBe(1);
    expect(localStorage.getItem('dukb-local-completions-scoped-v1:account-a')).toBe(accountABefore);
  });

  it('keeps Account B activity out of Account A when removing the old marker fails', () => {
    setLocalCompletionStorageIdentity('account-a');
    recordActivity('/transfer-path');
    const accountABefore = localStorage.getItem('dukb-local-completions-scoped-v1:account-a');

    const originalRemoveItem = Storage.prototype.removeItem;
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function removeItem(key) {
      if (key === 'dukb-local-completions-identity-v1') {
        throw new Error('storage blocked');
      }
      return originalRemoveItem.call(this, key);
    });

    setLocalCompletionStorageIdentity('account-b');

    expect(getLocalTodayCount()).toBe(0);
    expect(localStorage.getItem('dukb-local-completions-identity-v1')).toBe('account-a');
    recordActivity('/player-bingo');
    expect(getLocalTodayCount()).toBe(1);
    expect(localStorage.getItem('dukb-local-completions-scoped-v1:account-a')).toBe(accountABefore);
    expect(localStorage.getItem('dukb-local-completions-scoped-v1:account-b')).toContain('player-bingo');
  });

  it('rejects Account A active data when removing that payload stays blocked', () => {
    setLocalCompletionStorageIdentity('account-a');
    recordActivity('/transfer-path');
    const accountABefore = localStorage.getItem('dukb-local-completions-scoped-v1:account-a');

    const originalRemoveItem = Storage.prototype.removeItem;
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function removeItem(key) {
      if (key === 'dukb-local-completions') {
        throw new Error('storage blocked');
      }
      return originalRemoveItem.call(this, key);
    });

    setLocalCompletionStorageIdentity('account-b');

    expect(getLocalTodayCount()).toBe(0);
    recordActivity('/player-bingo');
    expect(getLocalTodayCount()).toBe(1);
    expect(localStorage.getItem('dukb-local-completions-scoped-v1:account-a')).toBe(accountABefore);
    expect(JSON.parse(localStorage.getItem('dukb-local-completions-scoped-v1:account-b') || '{}')).toEqual({
      date: '2026-09-02',
      slugs: ['player-bingo'],
    });
  });

  it('recovers Account B ownership after a reload with an Account A marker left behind', async () => {
    const accountA = JSON.stringify({ date: '2026-09-02', slugs: ['footle'] });
    const accountB = JSON.stringify({ date: '2026-09-02', slugs: ['player-bingo'] });
    localStorage.setItem('dukb-local-completions-identity-v1', 'account-a');
    localStorage.setItem('dukb-local-completions', accountB);
    localStorage.setItem('dukb-local-completions-scoped-v1:account-a', accountA);
    localStorage.setItem('dukb-local-completions-scoped-v1:account-b', accountB);

    vi.resetModules();
    const fresh = await import('@/lib/completions');
    fresh.setLocalCompletionStorageIdentity('account-b');
    fresh.recordActivity('/nba-grid');

    expect(localStorage.getItem('dukb-local-completions-scoped-v1:account-a')).toBe(accountA);
    expect(localStorage.getItem('dukb-local-completions-scoped-v1:account-b')).toContain('player-bingo');
    expect(localStorage.getItem('dukb-local-completions-scoped-v1:account-b')).toContain('nba-grid');
    expect(fresh.getLocalTodayCount()).toBe(2);
  });

  it('does not merge another tab active payload into this tab account', () => {
    setLocalCompletionStorageIdentity('account-a');
    const accountABefore = localStorage.getItem('dukb-local-completions-scoped-v1:account-a');
    const accountB = JSON.stringify({ date: '2026-09-02', slugs: ['player-bingo'] });

    /* Another tab has moved the shared slots to Account B. This tab has not
       received that auth event yet and must continue through A's scoped slot. */
    localStorage.setItem('dukb-local-completions-identity-v1', 'account-b');
    localStorage.setItem('dukb-local-completions', accountB);
    localStorage.setItem('dukb-local-completions-scoped-v1:account-b', accountB);

    recordActivity('/transfer-path');

    expect(localStorage.getItem('dukb-local-completions')).toBe(accountB);
    expect(localStorage.getItem('dukb-local-completions-scoped-v1:account-b')).toBe(accountB);
    expect(JSON.parse(localStorage.getItem('dukb-local-completions-scoped-v1:account-a') || '{}')).toEqual({
      date: '2026-09-02',
      slugs: ['footle', 'soccer-grid', 'transfer-path'],
    });
    expect(accountABefore).toContain('footle');
    expect(getLocalTodayCount()).toBe(3);
  });
});
