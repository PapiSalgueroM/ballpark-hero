/**
 * Round 285: the two third party scripts that only ever load after Accept.
 *
 * index.html carries an inline copy of exactly this for every page load that
 * already has consent stored, because the template cannot import anything.
 * This module is the copy the banner calls the moment somebody accepts, so
 * ads and analytics start in the same session rather than on the next one.
 * simAdsense checks the ids here against index.html so the two copies cannot
 * drift, and checks that index.html never loads either script outside its
 * consent branch.
 *
 * Neither function does anything when its script is already on the page, so
 * calling them twice is harmless.
 */
export const ADSENSE_CLIENT = 'ca-pub-2929318086316376';
export const GA_MEASUREMENT_ID = 'G-KZQK2G68YC';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function loadAdSense(): void {
  try {
    if (document.querySelector('script[src*="adsbygoogle.js"]')) return;
    /* Round 304: non personalized ads only, declared before the script
       loads. This is what lets the privacy pages promise no ad
       personalization from us without a certified consent platform, and
       index.html's inline copy sets the same flag. */
    const w = window as Window & { adsbygoogle?: unknown[] & { requestNonPersonalizedAds?: number } };
    w.adsbygoogle = w.adsbygoogle || [];
    w.adsbygoogle.requestNonPersonalizedAds = 1;
    const s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    document.head.appendChild(s);
  } catch {
    // DOM blocked: ads simply stay off this session
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
