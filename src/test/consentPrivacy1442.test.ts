import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadAdSense, loadAnalytics, sanitizedAnalyticsUrl, stopRevokedServices } from '@/lib/consentedScripts';
import { safeLocalStorage } from '@/lib/safeStorage';

const gpcDescriptor = Object.getOwnPropertyDescriptor(window.navigator, 'globalPrivacyControl');
const originalPath = `${location.pathname}${location.search}${location.hash}`;
const grantBoth = () => safeLocalStorage.setItem('cookie-consent-v2', JSON.stringify({
  version: 2, advertising: true, analytics: true, updatedAt: Date.now(),
}));

beforeEach(() => {
  safeLocalStorage.clear();
  localStorage.clear();
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  for (const name of ['adsbygoogle', 'dataLayer', 'gtag', '__DUKB_CONSENT_DEFAULTED__', 'ga-disable-G-KZQK2G68YC']) Reflect.deleteProperty(window, name);
  history.replaceState({}, '', '/footle');
  Object.defineProperty(navigator, 'globalPrivacyControl', { configurable: true, value: false });
});
afterEach(() => {
  safeLocalStorage.clear();
  localStorage.clear();
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  for (const name of ['adsbygoogle', 'dataLayer', 'gtag', '__DUKB_CONSENT_DEFAULTED__', 'ga-disable-G-KZQK2G68YC']) Reflect.deleteProperty(window, name);
  for (const name of ['_ga', '__gads', 'fixture-essential']) document.cookie = `${name}=; Max-Age=0; path=/`;
  history.replaceState({}, '', originalPath);
  if (gpcDescriptor) Object.defineProperty(navigator, 'globalPrivacyControl', gpcDescriptor);
  else Reflect.deleteProperty(navigator, 'globalPrivacyControl');
});

describe('the privacy-safe paused analytics release', () => {
  // Break caught: a durable old grant overrides Global Privacy Control.
  it('refuses advertising under GPC even when the saved record grants both purposes', () => {
    grantBoth();
    Object.defineProperty(navigator, 'globalPrivacyControl', { configurable: true, value: true });
    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-dukb-manual-ad', '');
    wrapper.innerHTML = '<ins class="adsbygoogle" data-ad-slot="fixture"></ins>';
    document.body.appendChild(wrapper);
    expect(loadAdSense()).toBe(false);
    expect(document.querySelector('script[src*="adsbygoogle.js"]')).toBeNull();
    expect(window.dataLayer).toBeUndefined();
  });

  for (const path of ['/footle', '/sign-the-player', '/reset-password', '/admin/login', '/admin/reports', '/profile', '/account', '/auth']) {
    // Break caught: unverified enhanced collection is enabled by a stale opt-in.
    it(`keeps analytics paused on ${path} despite an old affirmative record`, () => {
      grantBoth();
      history.replaceState({}, '', `${path}?token=private-token#private-fragment`);
      loadAnalytics();
      expect(document.querySelector('script[src*="googletagmanager.com/gtag/js"]')).toBeNull();
      expect(window.dataLayer).toBeUndefined();
      expect(window.gtag).toBeUndefined();
    });
  }

  // These helpers protect the dormant config too; enabling analytics needs a new review.
  for (const fixture of [
    { input: 'https://example.org/footle?email=private%40example.com#secret', expected: 'https://example.org/footle' },
    { input: 'https://name:secret@example.org/from?reset=private-referrer#confidential', expected: 'https://example.org/from' },
    { input: 'javascript:alert(1)', expected: '' },
  ]) {
    it(`removes private URL components from ${fixture.expected || 'unsupported URLs'}`, () => {
      expect(sanitizedAnalyticsUrl(fixture.input)).toBe(fixture.expected);
    });
  }

  it('removes visible optional cookies and old GA code while preserving essential state', () => {
    document.cookie = '_ga=old-analytics; path=/';
    document.cookie = '__gads=old-advertising; path=/';
    document.cookie = 'fixture-essential=keep; path=/';
    localStorage.setItem('fixture-game-save', 'keep this save');
    const script = document.createElement('script');
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-KZQK2G68YC';
    document.head.appendChild(script);
    window.dataLayer = [];
    window.gtag = (...args: unknown[]) => { window.dataLayer!.push(args); };
    stopRevokedServices({ advertising: true, analytics: true }, { advertising: false, analytics: false });
    expect(document.cookie).not.toMatch(/(?:^|;\s*)(?:_ga|__gads)=/);
    expect(document.cookie).toContain('fixture-essential=keep');
    expect(localStorage.getItem('fixture-game-save')).toBe('keep this save');
    expect(document.querySelector('script[src*="googletagmanager.com/gtag/js"]')).toBeNull();
    expect(Reflect.get(window, 'ga-disable-G-KZQK2G68YC')).toBe(true);
    const commands = window.dataLayer!.map(item => Array.from(item as ArrayLike<unknown>));
    expect(commands[commands.length - 1]).toEqual(['consent', 'update', {
      ad_storage: 'denied', analytics_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
    }]);
  });
  it('does not crash optional-service cleanup when the browser denies cookie access', () => {
    const descriptor = Object.getOwnPropertyDescriptor(document, 'cookie');
    try {
      Object.defineProperty(document, 'cookie', {
        configurable: true,
        get: () => { throw new DOMException('Fixture cookie access denied', 'SecurityError'); },
        set: () => { throw new DOMException('Fixture cookie write denied', 'SecurityError'); },
      });
      expect(() => stopRevokedServices({ advertising: true, analytics: true }, { advertising: false, analytics: false })).not.toThrow();
    } finally {
      if (descriptor) Object.defineProperty(document, 'cookie', descriptor);
      else Reflect.deleteProperty(document, 'cookie');
    }
  });});