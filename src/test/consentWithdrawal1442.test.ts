import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canReloadAfterWithdrawal, getEffectiveConsent, migrateConsentPreferences, saveConsentPreferences } from '@/lib/consentPreferences';
import { holdPendingSave, safeLocalStorage } from '@/lib/safeStorage';

const KEY = 'cookie-consent-v2';
const oldGrant = () => JSON.stringify({ version: 2, advertising: true, analytics: true, updatedAt: Date.now() });
beforeEach(() => { safeLocalStorage.clear(); localStorage.clear(); });
afterEach(() => { vi.restoreAllMocks(); safeLocalStorage.clear(); localStorage.clear(); });

describe('withdrawal cannot reload into a durable old grant or discard a held save', () => {
  // Break caught: safe seam readback is mistaken for durable deletion proof.
  it('stays in the page if a refused write and removal leave a durable advertising grant', () => {
    localStorage.setItem(KEY, oldGrant());
    const remove = Storage.prototype.removeItem;
    const write = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function(this: Storage, key: string) {
      if (key === KEY) throw new DOMException('Fixture removal refused', 'SecurityError');
      remove.call(this, key);
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function(this: Storage, key: string, value: string) {
      if (key === KEY) throw new DOMException('Fixture quota', 'QuotaExceededError');
      write.call(this, key, value);
    });
    saveConsentPreferences({ advertising: false, analytics: false });
    expect(getEffectiveConsent().advertising).toBe(false);
    expect(JSON.parse(localStorage.getItem(KEY)!).advertising).toBe(true);
    expect(canReloadAfterWithdrawal({ advertising: true, analytics: false })).toBe(false);
  });

  it('can refresh into pending when removal succeeds but a full store refuses the new denied record', () => {
    localStorage.setItem(KEY, oldGrant());
    const write = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function(this: Storage, key: string, value: string) {
      if (key === KEY) throw new DOMException('Fixture quota', 'QuotaExceededError');
      write.call(this, key, value);
    });
    saveConsentPreferences({ advertising: false, analytics: false });
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(getEffectiveConsent().advertising).toBe(false);
    expect(canReloadAfterWithdrawal({ advertising: true, analytics: false })).toBe(true);
  });

  // Break caught: a privacy refresh throws away a game still waiting for storage.
  it('holds refresh while a pending game save is still refused', () => {
    saveConsentPreferences({ advertising: false, analytics: false });
    const release = holdPendingSave(() => false);
    try { expect(canReloadAfterWithdrawal({ advertising: true, analytics: false })).toBe(false); }
    finally { release(); }
  });

  it('retries a pending game save before allowing the safe refresh', () => {
    saveConsentPreferences({ advertising: false, analytics: false });
    const retry = vi.fn(() => true);
    const release = holdPendingSave(retry);
    try {
      expect(canReloadAfterWithdrawal({ advertising: true, analytics: false })).toBe(true);
      expect(retry).toHaveBeenCalledTimes(1);
    } finally { release(); }
  });

  it('never saves an analytics permission while analytics is paused', () => {
    const saved = saveConsentPreferences({ advertising: false, analytics: true });
    expect(saved.analytics).toBe(false);
    expect(JSON.parse(safeLocalStorage.getItem(KEY)!).analytics).toBe(false);
  });

  it('does not mirror the new purpose decision back into the legacy bundled grant', () => {
    localStorage.setItem('cookie-consent', 'accepted');
    saveConsentPreferences({ advertising: true, analytics: false });
    expect(localStorage.getItem('cookie-consent')).toBeNull();
    expect(JSON.parse(localStorage.getItem(KEY)!)).toMatchObject({ version: 2, advertising: true, analytics: false });
  });
  it('treats an old tab essential decision as withdrawal of a newer advertising grant', () => {
    localStorage.setItem(KEY, oldGrant());
    localStorage.setItem('cookie-consent', 'essential');
    migrateConsentPreferences();
    expect(getEffectiveConsent().advertising).toBe(false);
    expect(JSON.parse(localStorage.getItem(KEY)!)).toMatchObject({ advertising: false, analytics: false });
  });

  it('holds refresh when all game progress is only in blocked visit storage', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
    try {
      Object.defineProperty(window, 'localStorage', { configurable: true, get: () => { throw new DOMException('Fixture blocked', 'SecurityError'); } });
      vi.resetModules();
      const seam = await import('@/lib/safeStorage');
      const preferences = await import('@/lib/consentPreferences');
      seam.safeLocalStorage.setItem('fixture-game-save', 'unsaved visit progress');
      preferences.saveConsentPreferences({ advertising: false, analytics: false });
      expect(preferences.canReloadAfterWithdrawal({ advertising: true, analytics: false })).toBe(false);
      expect(seam.safeLocalStorage.getItem('fixture-game-save')).toBe('unsaved visit progress');
    } finally {
      if (descriptor) Object.defineProperty(window, 'localStorage', descriptor);
      vi.resetModules();
    }
  });});