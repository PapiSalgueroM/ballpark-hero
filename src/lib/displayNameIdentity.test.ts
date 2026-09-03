import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

type CompletionModule = typeof import('@/lib/completions');
let cacheDisplayName: CompletionModule['cacheDisplayName'];
let getCurrentPlayerName: CompletionModule['getCurrentPlayerName'];
let getStoredPlayerName: CompletionModule['getStoredPlayerName'];
let setDisplayNameStorageIdentity: CompletionModule['setDisplayNameStorageIdentity'];

describe('display name identity storage', () => {
  beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();
    localStorage.setItem('dukb-guest-handle', 'IcyPoacher-42');
    ({
      cacheDisplayName,
      getCurrentPlayerName,
      getStoredPlayerName,
      setDisplayNameStorageIdentity,
    } = await import('@/lib/completions'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps an offline returning account name without exposing it to another account or a guest', () => {
    cacheDisplayName('Alpha');
    setDisplayNameStorageIdentity('account-a');
    expect(getStoredPlayerName()).toBe('Alpha');

    setDisplayNameStorageIdentity('account-b');
    expect(getStoredPlayerName()).toBe('IcyPoacher-42');
    cacheDisplayName('Beta');

    setDisplayNameStorageIdentity(null);
    expect(getStoredPlayerName()).toBe('IcyPoacher-42');
    setDisplayNameStorageIdentity('account-a');
    expect(getStoredPlayerName()).toBe('Alpha');
    setDisplayNameStorageIdentity('account-b');
    expect(getStoredPlayerName()).toBe('Beta');
  });

  it('clears Account A from the active cache when archiving its name throws', () => {
    cacheDisplayName('Alpha');
    setDisplayNameStorageIdentity('account-a');

    const originalSetItem = Storage.prototype.setItem;
    let rejectedArchive = false;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function setItem(key, value) {
      if (key === 'dukb-display-name-scoped-v1:account-a' && !rejectedArchive) {
        rejectedArchive = true;
        throw new Error('quota');
      }
      return originalSetItem.call(this, key, value);
    });

    setDisplayNameStorageIdentity('account-b');
    expect(getStoredPlayerName()).toBe('IcyPoacher-42');
    cacheDisplayName('Beta');

    expect(localStorage.getItem('dukb-display-name-scoped-v1:account-a')).toBe('Alpha');
    expect(localStorage.getItem('dukb-display-name-scoped-v1:account-b')).toBe('Beta');
  });

  it('cannot file Account B under Account A when the identity marker write throws', () => {
    cacheDisplayName('Alpha');
    setDisplayNameStorageIdentity('account-a');

    const originalSetItem = Storage.prototype.setItem;
    let rejectedMarker = false;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function setItem(key, value) {
      if (
        key === 'dukb-display-name-identity-v1'
        && value === 'account-b'
        && !rejectedMarker
      ) {
        rejectedMarker = true;
        throw new Error('quota');
      }
      return originalSetItem.call(this, key, value);
    });

    setDisplayNameStorageIdentity('account-b');
    expect(getStoredPlayerName()).toBe('IcyPoacher-42');
    cacheDisplayName('Beta');

    expect(localStorage.getItem('dukb-display-name-scoped-v1:account-a')).toBe('Alpha');
    expect(localStorage.getItem('dukb-display-name-scoped-v1:account-b')).toBe('Beta');
  });

  it('keeps Account B scoped when every write of its identity marker fails', async () => {
    cacheDisplayName('Alpha');
    setDisplayNameStorageIdentity('account-a');

    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function setItem(key, value) {
      if (key === 'dukb-display-name-identity-v1' && value === 'account-b') {
        throw new Error('blocked');
      }
      return originalSetItem.call(this, key, value);
    });

    setDisplayNameStorageIdentity('account-b');
    expect(localStorage.getItem('dukb-display-name-identity-v1')).toBeNull();
    cacheDisplayName('Beta');

    expect(localStorage.getItem('dukb-display-name')).toBeNull();
    expect(localStorage.getItem('dukb-display-name-scoped-v1:account-a')).toBe('Alpha');
    expect(localStorage.getItem('dukb-display-name-scoped-v1:account-b')).toBe('Beta');

    vi.restoreAllMocks();
    vi.resetModules();
    const reloaded = await import('@/lib/completions');
    expect(reloaded.getStoredPlayerName()).toBe('IcyPoacher-42');

    reloaded.setDisplayNameStorageIdentity('account-b');
    expect(reloaded.getStoredPlayerName()).toBe('Beta');
  });

  it('does not expose an existing Account B scoped name when its marker cannot be persisted', async () => {
    cacheDisplayName('Alpha');
    setDisplayNameStorageIdentity('account-a');
    localStorage.setItem('dukb-display-name-scoped-v1:account-b', 'Beta Old');

    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function setItem(key, value) {
      if (key === 'dukb-display-name-identity-v1' && value === 'account-b') {
        throw new Error('blocked');
      }
      return originalSetItem.call(this, key, value);
    });

    setDisplayNameStorageIdentity('account-b');
    expect(localStorage.getItem('dukb-display-name-identity-v1')).toBeNull();
    expect(getStoredPlayerName()).toBe('Beta Old');
    expect(localStorage.getItem('dukb-display-name')).toBeNull();

    cacheDisplayName('Beta Fresh');
    expect(localStorage.getItem('dukb-display-name-scoped-v1:account-b')).toBe('Beta Fresh');
    expect(localStorage.getItem('dukb-display-name')).toBeNull();

    vi.restoreAllMocks();
    vi.resetModules();
    const reloaded = await import('@/lib/completions');
    expect(reloaded.getStoredPlayerName()).toBe('IcyPoacher-42');

    reloaded.setDisplayNameStorageIdentity('account-b');
    expect(reloaded.getStoredPlayerName()).toBe('Beta Fresh');
  });

  it('ignores Account A after its active name survives a persistent removal failure', async () => {
    cacheDisplayName('Alpha');
    setDisplayNameStorageIdentity('account-a');

    const originalRemoveItem = Storage.prototype.removeItem;
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function removeItem(key) {
      if (key === 'dukb-display-name') throw new Error('blocked');
      return originalRemoveItem.call(this, key);
    });

    setDisplayNameStorageIdentity('account-b');
    expect(localStorage.getItem('dukb-display-name')).toBe('Alpha');
    expect(getStoredPlayerName()).toBe('IcyPoacher-42');
    expect(getCurrentPlayerName()).toBe('IcyPoacher-42');

    vi.resetModules();
    const reloaded = await import('@/lib/completions');
    expect(reloaded.getStoredPlayerName()).toBe('IcyPoacher-42');
    expect(reloaded.getCurrentPlayerName()).toBe('IcyPoacher-42');

    reloaded.setDisplayNameStorageIdentity(null);
    expect(reloaded.getStoredPlayerName()).toBe('IcyPoacher-42');
  });

  it('keeps a delayed Account A cache write out of another tab active Account B slots', () => {
    setDisplayNameStorageIdentity('account-a');
    cacheDisplayName('Alpha');

    localStorage.setItem('dukb-display-name-identity-v1', 'account-b');
    localStorage.setItem('dukb-display-name', 'Beta');
    localStorage.setItem('dukb-display-name-scoped-v1:account-b', 'Beta');

    cacheDisplayName('Alpha Fresh');

    expect(localStorage.getItem('dukb-display-name')).toBe('Beta');
    expect(localStorage.getItem('dukb-display-name-scoped-v1:account-b')).toBe('Beta');
    expect(localStorage.getItem('dukb-display-name-scoped-v1:account-a')).toBe('Alpha Fresh');
  });
});
