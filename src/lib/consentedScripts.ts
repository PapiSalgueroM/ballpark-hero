import { getEffectiveConsent, type ConsentPurposes } from '@/lib/consentPreferences';
export { CONSENT_CHANGED_EVENT } from '@/lib/consentPreferences';

export const ADSENSE_CLIENT = 'ca-pub-2929318086316376';
export const GA_MEASUREMENT_ID = 'G-KZQK2G68YC';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __DUKB_CONSENT_DEFAULTED__?: boolean;
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
    analytics_storage: purposes.analytics ? 'granted' : 'denied',
    ad_user_data: 'denied', ad_personalization: 'denied',
  });
}

export function loadAdSense(): boolean {
  try {
    if (!getEffectiveConsent().advertising) return false;
    if (document.querySelector('meta[name="robots"][content*="noindex"]')) return false;
    if (!document.querySelector('[data-dukb-manual-ad] ins.adsbygoogle[data-ad-slot]')) return false;
    updateGoogleConsent(getEffectiveConsent());
    if (document.querySelector('script[src*="adsbygoogle.js"]')) return true;
    const w = window as Window & { adsbygoogle?: unknown[] & { requestNonPersonalizedAds?: number } };
    w.adsbygoogle = w.adsbygoogle || [];
    w.adsbygoogle.requestNonPersonalizedAds = 1;
    const s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    document.head.appendChild(s);
    return true;
  } catch { return false; }
}

// Analytics stays paused until collection settings and a new implementation are reviewed.
export function loadAnalytics(): void {}

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
  const hadGoogle = !!window.gtag || !!window.dataLayer;
  if (revoked.analytics) {
    if (hadGoogle || document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) {
      Reflect.set(window, `ga-disable-${GA_MEASUREMENT_ID}`, true);
    }
    document.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]').forEach(el => el.remove());
  }
  if (hadGoogle) updateGoogleConsent(next);
  if (revoked.advertising) {
    document.querySelectorAll('[data-dukb-manual-ad] iframe, script[src*="adsbygoogle.js"]').forEach(el => el.remove());
    const queue = Reflect.get(window, 'adsbygoogle');
    if (Array.isArray(queue)) queue.length = 0;
  }
  clearPurposeCookies(revoked);
}

export function loadConsentedScripts(): void {
  loadAdSense();
  loadAnalytics();
}