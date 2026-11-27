// @vitest-environment-options {"url":"https://douknowball.com/"}
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GA_MEASUREMENT_ID, loadAnalytics, stopRevokedServices } from '@/lib/consentedScripts';

const consent = vi.hoisted(() => ({ analytics: false, advertising: false }));
vi.mock('@/lib/consentPreferences', async (original) => ({
  ...await original<typeof import('@/lib/consentPreferences')>(),
  ANALYTICS_READY: true,
  getEffectiveConsent: () => ({ ...consent }),
}));

const tag = () => document.querySelector<HTMLScriptElement>('script[src^="https://www.googletagmanager.com/gtag/js"]');
const commands = () => (window.dukbGaLayer ?? []).map(cmd => Array.from(cmd as ArrayLike<unknown>));
const events = () => commands().filter(([name]) => name === 'event').map(cmd => cmd[2]);
function visit(url: string) {
  window.history.pushState(null, '', url);
  loadAnalytics();
}

beforeEach(() => {
  consent.analytics = false;
  consent.advertising = false;
  stopRevokedServices({ analytics: true, advertising: false }, consent);
  for (const key of ['gtag', 'dataLayer', 'dukbGaLayer', '__DUKB_CONSENT_DEFAULTED__', 'ga-disable-' + GA_MEASUREMENT_ID]) Reflect.deleteProperty(window, key);
  document.title = 'PRIVATE-DISPLAY-NAME';
  Object.defineProperty(document, 'referrer', { configurable: true, value: 'https://example.org/PRIVATE-REFERRER' });
});

describe('consented GA4 public pageviews', () => {
  it('waits for a separate analytics choice and counts genuine visits once, including return visits', () => {
    consent.advertising = true;
    visit('/?utm_source=PRIVATE-CAMPAIGN');
    expect(tag()).toBeNull();
    expect(window.dataLayer).toBeUndefined();
    consent.analytics = true;
    consent.advertising = false;
    loadAnalytics();
    const script = tag();
    expect(script?.src).toBe('https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID + '&l=dukbGaLayer');
    expect(script?.referrerPolicy).toBe('no-referrer');
    visit('/soccer-career?slot=PRIVATE-SLOT#PRIVATE-HASH');
    expect(events()).toEqual([]);
    script!.dispatchEvent(new Event('load'));
    loadAnalytics();
    visit('/soccer-career/?slot=PRIVATE-OTHER');
    visit('/');
    expect(tag()).toBe(script);
    expect(events()).toEqual([
      { page_location: 'https://douknowball.com/', page_title: 'DoUKnowBall', page_referrer: '', send_to: GA_MEASUREMENT_ID },
      { page_location: 'https://douknowball.com/soccer-career', page_title: expect.any(String), page_referrer: '', send_to: GA_MEASUREMENT_ID },
      { page_location: 'https://douknowball.com/', page_title: 'DoUKnowBall', page_referrer: '', send_to: GA_MEASUREMENT_ID },
    ]);
    expect(commands().filter(([cmd]) => cmd === 'config')).toHaveLength(3);
    for (const cmd of commands().filter(([cmd]) => cmd === 'config')) {
      expect(cmd[2]).toMatchObject({ send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
    }
    expect(commands().filter(([cmd]) => cmd === 'js')).toHaveLength(1);
    expect(JSON.stringify(commands())).not.toContain('PRIVATE-');
    expect(window.dataLayer).toBeUndefined();
    expect(window.gtag).toBeUndefined();
    expect(commands()[0]).toEqual(['consent', 'default', expect.objectContaining({ ad_storage: 'denied', analytics_storage: 'denied' })]);
    expect(commands()[1]).toEqual(['consent', 'update', { analytics_storage: 'granted' }]);
  });

  it('keeps opted-in preview, local and prerendered pages free of analytics', () => {
    consent.analytics = true;
    window.history.replaceState(null, '', '/college-grid');
    try {
      for (const origin of ['https://ballpark-hero.lovable.app', 'http://localhost:4173']) {
        vi.stubGlobal('location', new URL('/college-grid', origin));
        loadAnalytics();
        expect(tag()).toBeNull();
        expect(commands()).toEqual([]);
      }
    } finally {
      vi.unstubAllGlobals();
    }
    Reflect.set(window, '__DUKB_PRERENDER__', true);
    try {
      loadAnalytics();
      expect(tag()).toBeNull();
      expect(commands()).toEqual([]);
    } finally {
      Reflect.deleteProperty(window, '__DUKB_PRERENDER__');
    }
  });

  it('can be called during server rendering without browser globals', () => {
    consent.analytics = true;
    try {
      for (const name of ['location', 'document', 'window']) vi.stubGlobal(name, undefined);
      expect(() => loadAnalytics()).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('excludes private, unknown and callback URLs before and after a public visit', () => {
    consent.analytics = true;
    const privateUrls = ['/auth', '/admin/reports', '/profile', '/reset-password', '/not-a-real-page', '/?code=PRIVATE-CODE', '/#access_token=PRIVATE-TOKEN'];
    for (const url of privateUrls) visit(url);
    expect(tag()).toBeNull();
    visit('/college-grid');
    tag()!.dispatchEvent(new Event('load'));
    for (const url of privateUrls) {
      visit(url);
      expect(Reflect.get(window, 'ga-disable-' + GA_MEASUREMENT_ID)).toBe(true);
      expect(events()).toHaveLength(1);
    }
    visit('/college-grid');
    expect(events()).toHaveLength(2);
    expect(Reflect.get(window, 'ga-disable-' + GA_MEASUREMENT_ID)).toBe(false);
    expect(JSON.stringify(commands())).not.toContain('PRIVATE-');
  });

  it('drops buffered views when a private route or withdrawal interrupts tag loading', () => {
    consent.analytics = true;
    visit('/');
    const script = tag()!;
    visit('/profile');
    script.dispatchEvent(new Event('load'));
    expect(events()).toEqual([]);
    visit('/build-your-xi');
    expect(events()).toHaveLength(1);
    expect(commands().filter(([cmd]) => cmd === 'js')).toHaveLength(1);
    consent.analytics = false;
    stopRevokedServices({ analytics: true, advertising: false }, consent);
    expect(tag()).toBeNull();
    expect(Reflect.get(window, 'ga-disable-' + GA_MEASUREMENT_ID)).toBe(true);
    expect(commands().at(-1)).toEqual(['consent', 'update', { analytics_storage: 'denied' }]);
    visit('/soccer-career');
    script.dispatchEvent(new Event('load'));
    expect(events()).toHaveLength(1);
  });
});
