import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
let CookieConsent: typeof import('@/components/CookieConsent').CookieConsent;
let getEffectiveConsent: typeof import('@/lib/consentPreferences').getEffectiveConsent;
let openConsentChoices: typeof import('@/lib/consentPreferences').openConsentChoices;
let holdPendingSave: typeof import('@/lib/safeStorage').holdPendingSave;
let safeLocalStorage: Storage;
let loadAdSense: typeof import('@/lib/consentedScripts').loadAdSense;

const KEY = 'cookie-consent-v2';
const gpcDescriptor = Object.getOwnPropertyDescriptor(navigator, 'globalPrivacyControl');
const value = (advertising: boolean) => JSON.stringify({ version: 2, advertising, analytics: false, updatedAt: Date.now() });
let release: (() => void) | undefined;
beforeEach(async () => {
  vi.resetModules();
  const seam = await import('@/lib/safeStorage');
  const preferences = await import('@/lib/consentPreferences');
  ({ CookieConsent } = await import('@/components/CookieConsent'));
  ({ loadAdSense } = await import('@/lib/consentedScripts'));
  ({ getEffectiveConsent, openConsentChoices } = preferences);
  ({ holdPendingSave, safeLocalStorage } = seam);
  safeLocalStorage.clear(); localStorage.clear();
  Object.defineProperty(navigator, 'globalPrivacyControl', { configurable: true, value: false });
  release = holdPendingSave(() => false);
});
afterEach(() => {
  cleanup(); release?.(); vi.restoreAllMocks(); vi.useRealTimers();
  safeLocalStorage.clear(); localStorage.clear();
  document.querySelectorAll('script[src*="adsbygoogle.js"], script[src*="googletagmanager.com/gtag/js"], [data-dukb-manual-ad]').forEach(el => el.remove());
  for (const key of ['adsbygoogle', 'gtag', 'dataLayer', '__DUKB_CONSENT_DEFAULTED__', 'ga-disable-G-KZQK2G68YC']) Reflect.deleteProperty(window, key);
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
  it('keeps a held Reject all unchecked and cannot re-grant advertising on Save choices', () => {
    localStorage.setItem(KEY, value(true));
    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-dukb-manual-ad', '');
    wrapper.innerHTML = '<ins class="adsbygoogle" data-ad-slot="fixture"></ins>';
    document.body.appendChild(wrapper);
    mount();
    expect(document.querySelector('script[src*="adsbygoogle.js"]')).not.toBeNull();
    act(() => openConsentChoices());
    expect(screen.getByRole('checkbox', { name: 'Advertising' })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));
    expect(screen.getByRole('checkbox', { name: 'Advertising' })).not.toBeChecked();
    expect(screen.getByRole('status')).toHaveTextContent(/refresh/i);
    fireEvent.click(screen.getByRole('button', { name: 'Save choices' }));
    expect(JSON.parse(localStorage.getItem(KEY)!).advertising).toBe(false);
    expect(getEffectiveConsent().advertising).toBe(false);
    expect(loadAdSense()).toBe(false);
    expect(document.querySelector('script[src*="adsbygoogle.js"]')).toBeNull();
    wrapper.remove();
  });

  it('keeps withdrawal latched across a routine component remount in the same page', () => {
    localStorage.setItem(KEY, value(true));
    const first = mount();
    act(() => openConsentChoices());
    fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));
    expect(getEffectiveConsent().advertising).toBe(false);
    first.unmount();
    // A later external choice cannot reactivate code in this held document.
    localStorage.setItem(KEY, value(true));
    mount();
    expect(getEffectiveConsent().advertising).toBe(false);
    expect(screen.getByRole('checkbox', { name: 'Advertising' })).not.toBeChecked();
    expect(screen.getByRole('status')).toHaveTextContent(/refresh/i);
    act(() => openConsentChoices());
    expect(screen.getByRole('checkbox', { name: 'Advertising' })).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Save choices' }));
    expect(JSON.parse(localStorage.getItem(KEY)!).advertising).toBe(false);
  });
});