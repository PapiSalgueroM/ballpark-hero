import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CookieConsent } from '@/components/CookieConsent';
import { getEffectiveConsent, openConsentChoices } from '@/lib/consentPreferences';
import { holdPendingSave, safeLocalStorage } from '@/lib/safeStorage';

const KEY = 'cookie-consent-v2';
const gpcDescriptor = Object.getOwnPropertyDescriptor(navigator, 'globalPrivacyControl');
const value = (advertising: boolean) => JSON.stringify({ version: 2, advertising, analytics: false, updatedAt: Date.now() });
let release: (() => void) | undefined;
beforeEach(() => {
  safeLocalStorage.clear(); localStorage.clear();
  Object.defineProperty(navigator, 'globalPrivacyControl', { configurable: true, value: false });
  release = holdPendingSave(() => false);
});
afterEach(() => {
  cleanup(); release?.(); vi.restoreAllMocks(); vi.useRealTimers();
  safeLocalStorage.clear(); localStorage.clear();
  if (gpcDescriptor) Object.defineProperty(navigator, 'globalPrivacyControl', gpcDescriptor);
  else Reflect.deleteProperty(navigator, 'globalPrivacyControl');
});
const mount = () => render(<MemoryRouter><CookieConsent /></MemoryRouter>);

describe('consent synchronization cannot resurrect an old permission', () => {
  it('replaces a full-store kept grant with the latest other-tab durable denial', () => {
    localStorage.setItem(KEY, value(true));
    const write = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function(this: Storage, key: string, data: string) {
      if (key === KEY) throw new DOMException('Fixture quota', 'QuotaExceededError');
      write.call(this, key, data);
    });
    safeLocalStorage.setItem(KEY, value(true));
    safeLocalStorage.setItem('fixture-held-save', 'keep this pending save');
    mount();
    const denied = value(false);
    write.call(localStorage, KEY, denied);
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: denied })));
    expect(getEffectiveConsent().advertising).toBe(false);
    expect(safeLocalStorage.getItem('fixture-held-save')).toBe('keep this pending save');
    expect(screen.getByRole('status')).toHaveTextContent(/refresh/i);
  });

  it('persists the browser GPC denial so turning the signal off does not restore an old grant', () => {
    localStorage.setItem(KEY, value(true));
    Object.defineProperty(navigator, 'globalPrivacyControl', { configurable: true, value: true });
    mount();
    expect(JSON.parse(localStorage.getItem(KEY)!).advertising).toBe(false);
    Object.defineProperty(navigator, 'globalPrivacyControl', { configurable: true, value: false });
    act(() => window.dispatchEvent(new Event('focus')));
    expect(getEffectiveConsent().advertising).toBe(false);
  });

  it('clears draft optional toggles when the displayed choice expires', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-21T12:00:00Z'));
    localStorage.setItem(KEY, value(true));
    mount();
    act(() => openConsentChoices());
    expect(screen.getByRole('checkbox', { name: 'Advertising' })).toBeChecked();
    vi.setSystemTime(new Date('2027-04-20T12:00:01Z'));
    fireEvent(window, new Event('focus'));
    expect(screen.getByRole('checkbox', { name: 'Advertising' })).not.toBeChecked();
    expect(getEffectiveConsent().advertising).toBe(false);
  });
});