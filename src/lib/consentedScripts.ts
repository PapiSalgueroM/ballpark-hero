/**
 * Round 285: the two third party scripts that only ever load after Accept.
 *
 * index.html carries the analytics half for page loads that already have
 * consent stored, because the template cannot import anything. AdSense stays
 * here and loads on demand only when the page contains a deliberate ad slot.
 * This keeps account, reset, fallback, and other no-slot screens free of ad
 * requests while the global meta tag still verifies the publisher account.
 *
 * Neither function does anything when its script is already on the page, so
 * calling them twice is harmless.
 */
export const ADSENSE_CLIENT = 'ca-pub-2929318086316376';
export const GA_MEASUREMENT_ID = 'G-KZQK2G68YC';
export const CONSENT_CHANGED_EVENT = 'dukb-consent-changed';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function loadAdSense(): boolean {
  try {
    if (document.querySelector('meta[name="robots"][content*="noindex"]')) return false;
    if (!document.querySelector('[data-dukb-manual-ad] ins.adsbygoogle[data-ad-slot]')) return false;
    if (document.querySelector('script[src*="adsbygoogle.js"]')) return true;
    /* Round 304: non personalized ads only, declared before the script
       loads. This keeps ad requests consistent with the privacy pages. */
    const w = window as Window & { adsbygoogle?: unknown[] & { requestNonPersonalizedAds?: number } };
    w.adsbygoogle = w.adsbygoogle || [];
    w.adsbygoogle.requestNonPersonalizedAds = 1;
    const s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    document.head.appendChild(s);
    return true;
  } catch {
    // DOM blocked: ads simply stay off this session
    return false;
  }
}

export function loadAnalytics(): void {
  try {
    if (document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID);
    const g = document.createElement('script');
    g.async = true;
    g.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(g);
  } catch {
    // DOM blocked: analytics simply stays off this session
  }
}

/** Everything that waits on Accept, in one call. */
export function loadConsentedScripts(): void {
  loadAdSense();
  loadAnalytics();
}
