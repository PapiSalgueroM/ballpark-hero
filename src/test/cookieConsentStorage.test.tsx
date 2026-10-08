/**
 * Round 1142: the cookie banner in a browser that will not store its answer.
 * Before this round "Essential only" threw an uncaught quota error when
 * storage was full and the banner stayed up for good, and with storage
 * blocked there was no app to show a banner at all. Both choices have to
 * work in both cases, the answer has to hold for the visit, and nothing to do
 * with analytics may load unless Accept was pressed.
 */
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const NAMES = ['localStorage', 'sessionStorage'] as const;
const original = new Map<string, PropertyDescriptor | undefined>();
const ANALYTICS = 'script[src*="googletagmanager.com/gtag/js"]';

function denied(): never {
  throw new DOMException("Failed to read the 'localStorage' property from 'Window': Access is denied for this document.", 'SecurityError');
}
function quota(): never {
  throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
}
type Failure = 'blocked' | 'full';
function breakStorage(kind: Failure) {
  if (kind === 'blocked') for (const name of NAMES) Object.defineProperty(window, name, { configurable: true, get: denied });
  else vi.spyOn(Storage.prototype, 'setItem').mockImplementation(quota);
}
/* The seam decides as it loads, so the banner is imported fresh each time,
   after storage has been broken, the way a real page load meets it. */
async function mountBanner() {
  vi.resetModules();
  const seam = await import('@/lib/safeStorage');
  const { CookieConsent } = await import('@/components/CookieConsent');
  const view = render(<MemoryRouter><CookieConsent /></MemoryRouter>);
  return { seam, view, CookieConsent };
}
const banner = () => screen.queryByRole('region', { name: 'Cookie choices' });

beforeEach(() => {
  for (const name of NAMES) original.set(name, Object.getOwnPropertyDescriptor(window, name));
  window.localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  for (const name of NAMES) {
    const d = original.get(name);
    if (d) Object.defineProperty(window, name, d); else delete (window as unknown as Record<string, unknown>)[name];
  }
  document.querySelectorAll(ANALYTICS).forEach(el => el.remove());
  document.querySelectorAll('script[src*="adsbygoogle.js"]').forEach(el => el.remove());
  delete (window as unknown as Record<string, unknown>).adsbygoogle;
  delete window.dataLayer;
  delete window.gtag;
});

describe.each(['blocked', 'full'] as const)('the cookie banner with storage %s', kind => {
  it('Essential only: the banner leaves, the answer holds for the visit, and no analytics load', async () => {
    breakStorage(kind);
    const { seam, view, CookieConsent } = await mountBanner();
    /* blocked is known from the first read; full is only known once a write was refused */
    expect(seam.getStorageTrouble()).toBe(kind === 'blocked' ? 'blocked' : null);
    expect(banner()).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Essential only' }));
    expect(banner()).toBeNull();
    expect(seam.getStorageTrouble()).toBe(kind);
    expect(seam.safeLocalStorage.getItem('cookie-consent')).toBe('essential');
    expect(document.querySelector(ANALYTICS)).toBeNull();
    /* a later mount in the same visit (the banner asks again only when no answer is held) */
    view.unmount();
    render(<MemoryRouter><CookieConsent /></MemoryRouter>);
    expect(banner()).toBeNull();
  });

  it('Accept: the banner leaves, the answer holds for the visit, and analytics start', async () => {
    breakStorage(kind);
    const { seam, view, CookieConsent } = await mountBanner();
    expect(document.querySelector(ANALYTICS)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    expect(banner()).toBeNull();
    expect(seam.safeLocalStorage.getItem('cookie-consent')).toBe('accepted');
    expect(document.querySelector(ANALYTICS)).not.toBeNull();
    view.unmount();
    render(<MemoryRouter><CookieConsent /></MemoryRouter>);
    expect(banner()).toBeNull();
  });
});

describe('the cookie banner, the cases around those two', () => {
  it('storage that fills up after the page loaded: Essential only still dismisses and nothing loads', async () => {
    const { seam, view, CookieConsent } = await mountBanner();
    expect(seam.getStorageTrouble()).toBeNull();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(quota);
    fireEvent.click(screen.getByRole('button', { name: 'Essential only' }));
    expect(banner()).toBeNull();
    expect(document.querySelector(ANALYTICS)).toBeNull();
    /* the seam heard the refusal: the answer is held for the visit and the banner does not ask again */
    expect(seam.getStorageTrouble()).toBe('full');
    expect(seam.safeLocalStorage.getItem('cookie-consent')).toBe('essential');
    view.unmount();
    render(<MemoryRouter><CookieConsent /></MemoryRouter>);
    expect(banner()).toBeNull();
  });

  it('storage full with an answer already stored: the banner does not ask again', async () => {
    window.localStorage.setItem('cookie-consent', 'essential');
    breakStorage('full');
    await mountBanner();
    expect(banner()).toBeNull();
  });

  it('a browser that stores normally: the answer goes to the real storage, exactly as before', async () => {
    const { seam } = await mountBanner();
    fireEvent.click(screen.getByRole('button', { name: 'Essential only' }));
    expect(banner()).toBeNull();
    expect(window.localStorage.getItem('cookie-consent')).toBe('essential');
    expect(seam.getStorageTrouble()).toBeNull();
  });
});

/* Review finding: the ad slot's own read of the answer had no test. Put back
   on the bare localStorage it reads nothing with storage full (the answer
   lives only in the seam there), so Accept would never have shown an ad slot
   that visit, and every gate stayed green. */
describe.each(['blocked', 'full'] as const)('the ad slot with storage %s', kind => {
  const slot = () => document.querySelector('[data-dukb-manual-ad] ins.adsbygoogle');
  async function mountBannerAndSlot() {
    const mounted = await mountBanner();
    const { default: AdSlot } = await import('@/components/ads/AdBanner');
    /* Built with createElement and the one production slot id, on purpose:
       scripts/simAdsense.mjs counts every JSX use of the ad component in src
       as a caller on the site and pins both the count and the slot id, and a
       test is not a caller. */
    const adSlot = () => createElement(AdSlot, { slot: '7540487748' });
    return { ...mounted, adSlot };
  }

  it('Accept: a slot already on the page appears, and so does one mounted later in the visit', async () => {
    breakStorage(kind);
    const { adSlot } = await mountBannerAndSlot();
    const first = render(adSlot());
    expect(slot()).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    expect(slot()).not.toBeNull();
    /* the next page of the visit: a fresh mount, with no consent event to hear */
    first.unmount();
    expect(slot()).toBeNull();
    render(adSlot());
    expect(slot()).not.toBeNull();
  });

  it('Essential only: no slot, now or on a later mount', async () => {
    breakStorage(kind);
    const { adSlot } = await mountBannerAndSlot();
    const first = render(adSlot());
    fireEvent.click(screen.getByRole('button', { name: 'Essential only' }));
    expect(slot()).toBeNull();
    first.unmount();
    render(adSlot());
    expect(slot()).toBeNull();
    expect(document.querySelector('script[src*="adsbygoogle.js"]')).toBeNull();
  });
});
