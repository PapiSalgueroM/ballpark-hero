import { ANALYTICS_READY, getEffectiveConsent, type ConsentPurposes } from '@/lib/consentPreferences';
import { ALL_GAMES } from '@/data/gameRegistry';
import { HUB_NAV } from '@/lib/sportHubNav';
import { EDITORIAL_RAIL_ROUTES } from '@/components/ads/editorialRailRoutes';
import { isPublicAdDocument } from '@/components/ads/publicAdEligibility';
import { normalizeRoutePath } from '@/lib/routePath';
export { CONSENT_CHANGED_EVENT } from '@/lib/consentPreferences';

export const ADSENSE_CLIENT = 'ca-pub-2929318086316376';
export const GA_MEASUREMENT_ID = 'G-KZQK2G68YC';

declare global {
  interface Window {
    dataLayer?: unknown[];
    dukbGaLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __DUKB_CONSENT_DEFAULTED__?: boolean;
    __DUKB_HOST_ANALYTICS_DEFAULT__?: unknown;
  }
}

function updateGoogleConsent(purposes: ConsentPurposes): void {
  const hadTag = !!window.gtag;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  if (!hadTag || !window.__DUKB_CONSENT_DEFAULTED__) {
    window.gtag('consent', 'default', {
      ad_storage: 'denied', analytics_storage: 'denied',
      ad_user_data: 'denied', ad_personalization: 'denied',
    });
    window.__DUKB_CONSENT_DEFAULTED__ = true;
  }
  window.gtag('consent', 'update', {
    ad_storage: purposes.advertising ? 'granted' : 'denied',
    analytics_storage: 'denied',
    ad_user_data: 'denied', ad_personalization: 'denied',
  });
}

type AdSenseQueue = unknown[] & { requestNonPersonalizedAds?: number; pauseAdRequests?: number };
const AD_LOADER = 'script[src*="adsbygoogle.js"]';
export function getAdSenseScript(): HTMLScriptElement | null {
  return document.querySelector<HTMLScriptElement>(AD_LOADER);
}

const PUBLIC_AD_SLOT = [
  '[data-public-footer-ad] [data-dukb-manual-ad="public-footer"]',
  '[data-ad-rail="left"] [data-dukb-manual-ad="left-rail"]',
  '[data-ad-rail="right"] [data-dukb-manual-ad="right-rail"]',
].map(placement => placement + ' ins.adsbygoogle[data-ad-slot="7540487748"]').join(',');

export function loadAdSense(requestedSlot?: HTMLModElement | null): boolean {
  try {
    if (!getEffectiveConsent().advertising) return false;
    if (!isPublicAdDocument()) return false;
    const slot = requestedSlot === undefined ? document.querySelector(PUBLIC_AD_SLOT) : requestedSlot;
    if (!slot?.isConnected || !slot.matches(PUBLIC_AD_SLOT)) return false;
    if (window.innerWidth < (slot.closest('[data-ad-rail]') ? 1280 : 320)) return false;
    return startAdSense();
  } catch { return false; }
}

function startAdSense(): boolean {
  if (getAdSenseScript()) return true;
  updateGoogleConsent(getEffectiveConsent());
  const w = window as Window & { adsbygoogle?: AdSenseQueue };
  w.adsbygoogle = w.adsbygoogle || [];
  w.adsbygoogle.requestNonPersonalizedAds = 1;
  if (w.adsbygoogle.pauseAdRequests === 1) w.adsbygoogle.pauseAdRequests = 0;
  const s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.dataset.dukbAdLoading = '';
  s.onload = () => {
    delete s.dataset.dukbAdLoading;
    s.onload = s.onerror = null;
  };
  s.onerror = () => {
    if (s.isConnected) document.documentElement.setAttribute('data-dukb-ad-load-failed', '');
    s.onload = s.onerror = null;
    s.remove();
  };
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
  document.head.appendChild(s);
  return true;
}

type AnalyticsPage = { page_location: string; page_title: string; page_referrer: string };
// The host reads window.dataLayer for its optional click tracking.
// Send GA4 consent and events only to the Google tag's named queue.
function analyticsCommand(..._args: unknown[]): void {
  // gtag.js consumes the arguments object from its command function.
  // eslint-disable-next-line prefer-rest-params
  (window.dukbGaLayer ??= []).push(arguments);
}
let analyticsScript: HTMLScriptElement | null = null;
let tagReady = false;
let configured = false;
let lastLocation = '';
let pendingViews: AnalyticsPage[] = [];

function publicAnalyticsPage(): AnalyticsPage | null {
  if (location.origin !== 'https://douknowball.com' || Reflect.get(window, '__DUKB_PRERENDER__')) return null;
  // Recovery and OAuth redirects can arrive on Home or a game.
  for (const part of [location.search, location.hash.slice(1)]) {
    for (const [key, value] of new URLSearchParams(part)) {
      if (/^(?:code|state|error|error_code|error_description|token|token_hash|access_token|refresh_token|id_token|provider_token|provider_refresh_token)$/i.test(key)
        || (key === 'type' && value === 'recovery')) return null;
    }
  }
  const path = normalizeRoutePath(location.pathname);
  const title = path === '/' ? 'DoUKnowBall'
    : ALL_GAMES.find(game => game.path === path)?.label ?? HUB_NAV.find(hub => hub.route === path)?.h1
      ?? EDITORIAL_RAIL_ROUTES.find(route => route === path)?.slice(1).replace(/[-/]/g, ' ');
  return title ? { page_location: location.origin + path, page_title: title, page_referrer: '' } : null;
}

function flushPageViews(): void {
  for (const page of pendingViews) {
    if (!configured) analyticsCommand('js', new Date());
    analyticsCommand('config', GA_MEASUREMENT_ID, {
      ...page, send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false,
      ignore_referrer: true, ...(configured ? { update: true } : {}),
    });
    configured = true;
    analyticsCommand('event', 'page_view', { ...page, send_to: GA_MEASUREMENT_ID });
  }
  pendingViews = [];
}

export function loadAnalytics(): void {
  if (!ANALYTICS_READY || typeof window === 'undefined' || typeof document === 'undefined') return;
  const consent = getEffectiveConsent();
  const page = consent.analytics ? publicAnalyticsPage() : null;
  if (!page) {
    lastLocation = '';
    pendingViews = [];
    if (analyticsScript) Reflect.set(window, `ga-disable-${GA_MEASUREMENT_ID}`, true);
    return;
  }
  if (page.page_location === lastLocation) return;
  lastLocation = page.page_location;
  pendingViews.push(page);
  Reflect.set(window, `ga-disable-${GA_MEASUREMENT_ID}`, false);
  if (tagReady) {
    flushPageViews();
    return;
  }
  if (analyticsScript) return;
  analyticsCommand('consent', 'default', {
    analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
  });
  analyticsCommand('consent', 'update', { analytics_storage: 'granted' });
  const script = document.createElement('script');
  analyticsScript = script;
  script.async = true;
  script.referrerPolicy = 'no-referrer';
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}&l=dukbGaLayer`;
  script.onload = () => {
    if (script !== analyticsScript) return;
    tagReady = true;
    if (!getEffectiveConsent().analytics || !publicAnalyticsPage()) {
      loadAnalytics();
      return;
    }
    flushPageViews();
  };
  script.onerror = () => {
    if (script !== analyticsScript) return;
    script.remove();
    analyticsScript = null;
    pendingViews = [];
    lastLocation = '';
  };
  document.head.appendChild(script);
}

function clearPurposeCookies(purposes: ConsentPurposes): void {
  try {
  const names = document.cookie.split(';').map(part => part.trim().split('=')[0]).filter(Boolean);
  const domains = ['', location.hostname, `.${location.hostname}`];
  if (location.hostname === 'douknowball.com' || location.hostname.endsWith('.douknowball.com')) {
    domains.push('douknowball.com', '.douknowball.com');
  }
  const paths = new Set(['/']);
  const segments = location.pathname.split('/').filter(Boolean);
  for (let i = 1; i <= segments.length; i += 1) paths.add('/' + segments.slice(0, i).join('/'));
  for (const name of names) {
    const analytics = /^_ga(?:_|$)|^_gid$|^_gat(?:_|$)/.test(name);
    const advertising = /^__gads$|^__gpi$|^__eoi$|^_gcl_/.test(name);
    if (!(purposes.analytics && analytics) && !(purposes.advertising && advertising)) continue;
    for (const domain of new Set(domains)) for (const path of paths) {
      document.cookie = `${name}=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}${domain ? `; domain=${domain}` : ''}`;
    }
  }
  } catch { /* Cookie access may be blocked; core games and withdrawal remain usable. */ }
}

export function stopRevokedServices(revoked: ConsentPurposes, next = getEffectiveConsent()): void {
  const queue = window.dataLayer;
  const hostDefault = window.__DUKB_HOST_ANALYTICS_DEFAULT__;
  const hostOnly = hostDefault && queue?.length === 1 && queue[0] === hostDefault;
  const hadGoogle = !!window.gtag || (!!queue && !hostOnly);
  if (revoked.analytics) {
    analyticsScript = null;
    tagReady = false;
    configured = false;
    lastLocation = '';
    pendingViews = [];
    if (hadGoogle || document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) {
      Reflect.set(window, `ga-disable-${GA_MEASUREMENT_ID}`, true);
    }
    if (window.dukbGaLayer) analyticsCommand('consent', 'update', { analytics_storage: 'denied' });
    document.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]').forEach(el => el.remove());
  }
  if (hadGoogle) updateGoogleConsent(next);
  if (revoked.advertising) {
    document.querySelectorAll('[data-dukb-manual-ad] iframe, script[src*="adsbygoogle.js"]').forEach(el => el.remove());
    const queue = Reflect.get(window, 'adsbygoogle');
    if (Array.isArray(queue)) {
      (queue as AdSenseQueue).pauseAdRequests = 1;
      queue.length = 0;
    }
  }
  clearPurposeCookies(revoked);
}

export function loadConsentedScripts(): void {
  loadAdSense();
  loadAnalytics();
}
