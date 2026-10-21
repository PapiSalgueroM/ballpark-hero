import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadAdSense, loadAnalytics, loadConsentedScripts } from '@/lib/consentedScripts';
import { safeLocalStorage } from '@/lib/safeStorage';

const KEY = 'cookie-consent-v2';
const MAX_AGE = 180 * 24 * 60 * 60 * 1000;
const adScripts = () => document.querySelectorAll('script[src*="adsbygoogle.js"]');
const analyticsScripts = () => document.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]');

function record(advertising: boolean, analytics: boolean, updatedAt = Date.now()) {
  return JSON.stringify({ version: 2, advertising, analytics, updatedAt });
}

function deliberateSlot() {
  const wrapper = document.createElement('div');
  wrapper.setAttribute('data-dukb-manual-ad', '');
  const slot = document.createElement('ins');
  slot.className = 'adsbygoogle';
  slot.setAttribute('data-ad-slot', 'fixture-slot');
  wrapper.appendChild(slot);
  document.body.appendChild(wrapper);
}

beforeEach(() => {
  safeLocalStorage.clear();
  localStorage.clear();
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  Reflect.deleteProperty(window, 'adsbygoogle');
  Reflect.deleteProperty(window, 'dataLayer');
  Reflect.deleteProperty(window, 'gtag');
});

afterEach(() => {
  safeLocalStorage.clear();
  localStorage.clear();
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  Reflect.deleteProperty(window, 'adsbygoogle');
  Reflect.deleteProperty(window, 'dataLayer');
  Reflect.deleteProperty(window, 'gtag');
});

describe('each optional loader requires its own current affirmative purpose', () => {
  // Break caught: calling a loader directly bypasses the UI consent branch.
  it('refuses a deliberate ad slot when no choice has been made', () => {
    deliberateSlot();
    expect(loadAdSense()).toBe(false);
    expect(adScripts()).toHaveLength(0);
    expect(Reflect.get(window, 'adsbygoogle')).toBeUndefined();
  });

  it('does not create analytics globals or a script before a choice', () => {
    loadAnalytics();
    expect(analyticsScripts()).toHaveLength(0);
    expect(window.dataLayer).toBeUndefined();
    expect(window.gtag).toBeUndefined();
  });

  for (const fixture of [
    { advertising: false, analytics: false, wantAds: 0, wantAnalytics: 0 },
    { advertising: true, analytics: false, wantAds: 1, wantAnalytics: 0 },
    { advertising: false, analytics: true, wantAds: 0, wantAnalytics: 0 },
    { advertising: true, analytics: true, wantAds: 1, wantAnalytics: 0 },
  ]) {
    // Break caught: either purpose accidentally grants the other service.
    it(`honors advertising=${fixture.advertising}, analytics=${fixture.analytics} independently`, () => {
      safeLocalStorage.setItem(KEY, record(fixture.advertising, fixture.analytics));
      deliberateSlot();
      loadConsentedScripts();
      expect(adScripts()).toHaveLength(fixture.wantAds);
      expect(analyticsScripts()).toHaveLength(fixture.wantAnalytics);
      if (!fixture.advertising) {
        expect(window.dataLayer).toBeUndefined();
        expect(window.gtag).toBeUndefined();
      }
      const commands = (window.dataLayer ?? []).map(item => Array.from(item as ArrayLike<unknown>));
      expect(commands.filter(command => command[0] === 'config' || command[0] === 'event')).toHaveLength(0);
      if (fixture.wantAds === 0) expect(Reflect.get(window, 'adsbygoogle')).toBeUndefined();
    });
  }

  for (const legacy of ['accepted', 'essential']) {
    // Break caught: the old bundled grant is silently promoted to new purposes.
    it(`does not load either service from legacy ${legacy}`, () => {
      safeLocalStorage.setItem('cookie-consent', legacy);
      deliberateSlot();
      loadConsentedScripts();
      expect(adScripts()).toHaveLength(0);
      expect(analyticsScripts()).toHaveLength(0);
      expect(window.dataLayer).toBeUndefined();
    });
  }

  for (const fixture of [
    { name: 'broken JSON', value: '{' },
    { name: 'unknown version', value: JSON.stringify({ version: 3, advertising: true, analytics: true, updatedAt: Date.now() }) },
    { name: 'missing analytics', value: JSON.stringify({ version: 2, advertising: true, updatedAt: Date.now() }) },
    { name: 'missing advertising', value: JSON.stringify({ version: 2, analytics: true, updatedAt: Date.now() }) },
    { name: 'string advertising', value: JSON.stringify({ version: 2, advertising: 'true', analytics: true, updatedAt: Date.now() }) },
    { name: 'string analytics', value: JSON.stringify({ version: 2, advertising: true, analytics: 'true', updatedAt: Date.now() }) },
    { name: 'missing timestamp', value: JSON.stringify({ version: 2, advertising: true, analytics: true }) },
    { name: 'nonnumeric timestamp', value: JSON.stringify({ version: 2, advertising: true, analytics: true, updatedAt: 'today' }) },
    { name: 'future timestamp', value: record(true, true, Date.now() + 24 * 60 * 60 * 1000) },
    { name: 'expired choice', value: record(true, true, Date.now() - MAX_AGE - 1000) },
  ]) {
    // Break caught: malformed or stale affirmative fields become permission.
    it(`keeps both services off for ${fixture.name}`, () => {
      safeLocalStorage.setItem(KEY, fixture.value);
      deliberateSlot();
      loadConsentedScripts();
      expect(adScripts()).toHaveLength(0);
      expect(analyticsScripts()).toHaveLength(0);
      expect(window.dataLayer).toBeUndefined();
      expect(Reflect.get(window, 'adsbygoogle')).toBeUndefined();
    });
  }

  // Break caught: a previously loaded script bypasses the later denied gate.
  it('refuses another manual ad after advertising is withdrawn while analytics remains allowed', () => {
    safeLocalStorage.setItem(KEY, record(true, true));
    deliberateSlot();
    expect(loadAdSense()).toBe(true);
    expect(adScripts()).toHaveLength(1);
    safeLocalStorage.setItem(KEY, record(false, true));
    expect(loadAdSense()).toBe(false);
    expect(adScripts()).toHaveLength(1);
  });

  it('refuses another manual ad when the previously granted record expires', () => {
    safeLocalStorage.setItem(KEY, record(true, false));
    deliberateSlot();
    expect(loadAdSense()).toBe(true);
    safeLocalStorage.setItem(KEY, record(true, false, Date.now() - MAX_AGE - 1000));
    expect(loadAdSense()).toBe(false);
  });

  // Existing protection: granting ads never turns account/no-slot pages into ad pages.
  it('still refuses advertising without a deliberate slot', () => {
    safeLocalStorage.setItem(KEY, record(true, false));
    expect(loadAdSense()).toBe(false);
    expect(adScripts()).toHaveLength(0);
  });

  it('still refuses a deliberate slot on a noindex page', () => {
    safeLocalStorage.setItem(KEY, record(true, false));
    deliberateSlot();
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex, nofollow';
    document.head.appendChild(robots);
    expect(loadAdSense()).toBe(false);
    expect(adScripts()).toHaveLength(0);
  });

  it('keeps granted loaders idempotent and requests non-personalized ads', () => {
    safeLocalStorage.setItem(KEY, record(true, true));
    deliberateSlot();
    loadConsentedScripts();
    loadConsentedScripts();
    expect(adScripts()).toHaveLength(1);
    expect(analyticsScripts()).toHaveLength(0);
    expect(Reflect.get(Reflect.get(window, 'adsbygoogle'), 'requestNonPersonalizedAds')).toBe(1);
  });
});
