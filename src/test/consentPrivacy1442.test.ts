import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadAdSense, loadAnalytics } from '@/lib/consentedScripts';
import { safeLocalStorage } from '@/lib/safeStorage';

const gpcDescriptor = Object.getOwnPropertyDescriptor(window.navigator, 'globalPrivacyControl');
const referrerDescriptor = Object.getOwnPropertyDescriptor(document, 'referrer');
const originalPath = `${location.pathname}${location.search}${location.hash}`;

function grantBoth() {
  safeLocalStorage.setItem('cookie-consent-v2', JSON.stringify({
    version: 2, advertising: true, analytics: true, updatedAt: Date.now(),
  }));
}

beforeEach(() => {
  safeLocalStorage.clear();
  localStorage.clear();
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  Reflect.deleteProperty(window, 'adsbygoogle');
  Reflect.deleteProperty(window, 'dataLayer');
  Reflect.deleteProperty(window, 'gtag');
  history.replaceState({}, '', '/footle');
  Object.defineProperty(navigator, 'globalPrivacyControl', { configurable: true, value: false });
});

afterEach(() => {
  safeLocalStorage.clear();
  localStorage.clear();
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  Reflect.deleteProperty(window, 'adsbygoogle');
  Reflect.deleteProperty(window, 'dataLayer');
  Reflect.deleteProperty(window, 'gtag');
  history.replaceState({}, '', originalPath);
  if (gpcDescriptor) Object.defineProperty(navigator, 'globalPrivacyControl', gpcDescriptor);
  else Reflect.deleteProperty(navigator, 'globalPrivacyControl');
  if (referrerDescriptor) Object.defineProperty(document, 'referrer', referrerDescriptor);
  else Reflect.deleteProperty(document, 'referrer');
});

describe('consent privacy boundaries', () => {
  // Break caught: an old stored advertising grant overrides the browser's signal.
  it('honors GPC for advertising while a separate analytics opt-in still works', () => {
    grantBoth();
    Object.defineProperty(navigator, 'globalPrivacyControl', { configurable: true, value: true });
    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-dukb-manual-ad', '');
    wrapper.innerHTML = '<ins class="adsbygoogle" data-ad-slot="fixture"></ins>';
    document.body.appendChild(wrapper);
    expect(loadAdSense()).toBe(false);
    expect(document.querySelector('script[src*="adsbygoogle.js"]')).toBeNull();
    loadAnalytics();
    expect(document.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]')).toHaveLength(1);
  });

  // Break caught: config or manual events disclose tokens in query/hash/referrer.
  it('uses only origin and pathname for analytics location and referrer', () => {
    grantBoth();
    history.replaceState({}, '', '/footle?email=private%40example.com&token=secret#private-answer');
    Object.defineProperty(document, 'referrer', {
      configurable: true,
      value: 'https://example.org/from?reset=private-referrer#confidential',
    });
    loadAnalytics();
    const commands = (window.dataLayer ?? []).map(item => Array.from(item as ArrayLike<unknown>));
    const config = commands.find(command => command[0] === 'config');
    expect(config).toBeDefined();
    expect(config?.[2]).toMatchObject({
      page_location: `${location.origin}/footle`,
      page_referrer: 'https://example.org/from',
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
    expect(JSON.stringify(commands)).not.toMatch(/private%40|private@example|secret|private-answer|private-referrer|confidential/);
  });

  for (const path of ['/reset-password', '/admin/login', '/admin/reports', '/profile', '/account', '/auth']) {
    // Break caught: an account or token-bearing screen starts analytics anyway.
    it(`suppresses analytics on ${path} even with an existing opt-in`, () => {
      grantBoth();
      history.replaceState({}, '', `${path}?token=private-token#private-fragment`);
      loadAnalytics();
      expect(document.querySelector('script[src*="googletagmanager.com/gtag/js"]')).toBeNull();
      expect(window.dataLayer).toBeUndefined();
    });
  }

  it('does not treat an ordinary game name as an account route', () => {
    grantBoth();
    history.replaceState({}, '', '/sign-the-player');
    loadAnalytics();
    expect(document.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]')).toHaveLength(1);
  });
});