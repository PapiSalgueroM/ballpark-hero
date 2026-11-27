// @vitest-environment-options {"url":"https://douknowball.com/"}
import { StrictMode, createElement } from 'react';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AdBanner from '@/components/ads/AdBanner';
import { PublicFooterAd } from '@/components/ads/PublicFooterAd';
import { loadAdSense } from '@/lib/consentedScripts';
import { saveConsentPreferences } from '@/lib/consentPreferences';
import { mountPublicFooterSlot, publicAdCanonical } from './fixtures/publicAdSlot';
import manifest from '../../public/manifest.json';

const slot = () => document.querySelector('[data-public-footer-ad] ins.adsbygoogle');
const tags = () => document.querySelectorAll('script[src*="adsbygoogle.js"]');
const originalMedia = window.matchMedia;
const defaultConsent = { advertising: true, analytics: false };

beforeEach(() => {
  vi.spyOn(window, 'matchMedia').mockImplementation(query => ({ ...originalMedia(query), matches: true }));
  saveConsentPreferences(defaultConsent);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  history.replaceState({}, '', '/');
  localStorage.clear();
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('data-dukb-ad-load-failed');
  for (const name of ['adsbygoogle', 'gtag', 'dataLayer', '__DUKB_CONSENT_DEFAULTED__']) Reflect.deleteProperty(window, name);
});

it('leaves legacy game placements empty and refuses a misplaced display unit', () => {
  publicAdCanonical();
  render(createElement(AdBanner, { slot: '7540487748', format: 'horizontal' }));
  expect(document.querySelector('[data-dukb-manual-ad],ins,iframe')).toBeNull();
  const misplaced = mountPublicFooterSlot();
  misplaced.closest('[data-public-footer-ad]')!.removeAttribute('data-public-footer-ad');
  expect(loadAdSense(misplaced)).toBe(false);
  expect(tags()).toHaveLength(0);
});

it.each([manifest.start_url, ...manifest.shortcuts.map(shortcut => shortcut.url)])(
  'loads one publisher tag on the installed app launch %s', async address => {
    history.replaceState({}, '', address);
    publicAdCanonical();
    render(<BrowserRouter><PublicFooterAd /></BrowserRouter>);
    await waitFor(() => expect(slot()).toBeInTheDocument());
    expect(tags()).toHaveLength(1);
    act(() => { tags()[0].dispatchEvent(new Event('load')); });
    expect(window.adsbygoogle).toHaveLength(1);
    expect(location.pathname + location.search).toBe(address);
  },
);

it.each(['/privacy', '/reset-password', '/admin/login', '/unknown-area', '/footle?slot=1', '/footle#shared',
  '/footle?source=pwa', '/soccer-career?source=pwa&slot=1', '/soccer-career?source=pwa#saves',
  '/club-manager?view=saves&source=pwa', '/?source=pwa&q=secret', '/?source=pwa&source=pwa'])(
  'refuses even a mounted approved slot on %s', address => {
    history.replaceState({}, '', address);
    publicAdCanonical(location.pathname);
    expect(loadAdSense(mountPublicFooterSlot())).toBe(false);
    expect(tags()).toHaveLength(0);
  },
);

it('rejects a stale canonical, prerender and noindex before starting the tag', () => {
  history.replaceState({}, '', '/footle/');
  const canonical = publicAdCanonical('/');
  const display = mountPublicFooterSlot();
  expect(loadAdSense(display)).toBe(false);
  canonical.href = 'https://douknowball.com/footle';
  const robots = document.createElement('meta');
  robots.name = 'robots';
  robots.content = 'NOINDEX';
  document.head.appendChild(robots);
  expect(loadAdSense(display)).toBe(false);
  robots.remove();
  Reflect.set(window, '__DUKB_PRERENDER__', true);
  try { expect(loadAdSense(display)).toBe(false); }
  finally { Reflect.deleteProperty(window, '__DUKB_PRERENDER__'); }
  expect(tags()).toHaveLength(0);
  expect(loadAdSense(display)).toBe(true);
  expect(tags()).toHaveLength(1);
});

it('requests each mounted footer once, hides it on an in-page save screen and reuses the publisher tag on return', async () => {
  history.replaceState({}, '', '/club-manager/');
  publicAdCanonical('/club-manager');
  const view = render(<StrictMode><BrowserRouter><PublicFooterAd /></BrowserRouter></StrictMode>);
  await waitFor(() => expect(slot()).toBeInTheDocument());
  const firstTag = tags()[0];
  expect(firstTag).toBeDefined();
  act(() => { firstTag.dispatchEvent(new Event('load')); });
  expect(window.adsbygoogle).toHaveLength(1);
  view.rerender(<StrictMode><BrowserRouter><PublicFooterAd /></BrowserRouter></StrictMode>);
  expect(window.adsbygoogle).toHaveLength(1);
  const saveScreen = document.createElement('div');
  saveScreen.dataset.testid = 'cm-slots';
  await act(async () => { document.body.appendChild(saveScreen); });
  expect(slot()).toBeNull();
  expect(window.adsbygoogle).toHaveLength(1);
  await act(async () => { saveScreen.remove(); });
  await waitFor(() => expect(slot()).toBeInTheDocument());
  expect(window.adsbygoogle).toHaveLength(2);
  expect(tags()).toHaveLength(1);
  expect(tags()[0]).toBe(firstTag);
});

it.each(['filled', 'unfilled', 'consent during search'])('keeps Home search from repeating an auction after %s', async mode => {
  const canonical = publicAdCanonical('/');
  const search = document.createElement('main');
  document.body.append(search);
  if (mode === 'consent during search') {
    search.setAttribute('data-home-search-active', '');
    saveConsentPreferences({ advertising: false, analytics: false });
  }
  render(<BrowserRouter><PublicFooterAd /></BrowserRouter>);
  if (mode === 'consent during search') {
    act(() => { saveConsentPreferences(defaultConsent); });
    expect(slot()).toBeNull();
    expect(tags()).toHaveLength(0);
    await act(async () => { search.removeAttribute('data-home-search-active'); });
  }
  await waitFor(() => expect(slot()).toBeInTheDocument());
  act(() => { tags()[0].dispatchEvent(new Event('load')); });
  await act(async () => { slot()!.setAttribute('data-ad-status', mode === 'unfilled' ? 'unfilled' : 'filled'); });
  expect(window.adsbygoogle).toHaveLength(1);
  for (let i = 0; i < 2; i++) {
    await act(async () => { search.setAttribute('data-home-search-active', ''); });
    expect(slot()).toBeNull();
    await act(async () => { search.removeAttribute('data-home-search-active'); });
    expect(slot()).toBeNull();
    expect(window.adsbygoogle).toHaveLength(1);
  }
  await act(async () => {
    history.pushState({}, '', '/soccer');
    canonical.href = 'https://douknowball.com/soccer';
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await waitFor(() => expect(slot()).toBeInTheDocument());
  expect(window.adsbygoogle).toHaveLength(2);
  expect(tags()).toHaveLength(1);
});

it('keeps a slow-loading unit and a delayed fill, then labels it once', async () => {
  vi.useFakeTimers();
  publicAdCanonical();
  render(<BrowserRouter><PublicFooterAd /></BrowserRouter>);
  const pending = slot()!;
  expect(pending).toBeInTheDocument();
  act(() => { vi.advanceTimersByTime(12000); });
  expect(slot()).toBe(pending);
  expect(window.adsbygoogle).toHaveLength(0);
  act(() => { tags()[0].dispatchEvent(new Event('load')); vi.advanceTimersByTime(15000); });
  expect(slot()).toBe(pending);
  expect(window.adsbygoogle).toHaveLength(1);
  expect(document.body.textContent).not.toContain('Advertisement');
  await act(async () => { pending.setAttribute('data-ad-status', 'filled'); });
  expect(document.body.textContent).toContain('Advertisement');
  expect(window.adsbygoogle).toHaveLength(1);
});

it('collapses an explicitly unfilled unit', async () => {
  publicAdCanonical();
  render(<BrowserRouter><PublicFooterAd /></BrowserRouter>);
  act(() => { tags()[0].dispatchEvent(new Event('load')); });
  await act(async () => { slot()!.setAttribute('data-ad-status', 'unfilled'); });
  expect(slot()).toBeNull();
  expect(window.adsbygoogle).toHaveLength(1);
});

it('removes a blocked tag and pending slot and makes no second request on another eligible page', async () => {
  const canonical = publicAdCanonical();
  const append = vi.spyOn(document.head, 'appendChild');
  render(<BrowserRouter><PublicFooterAd /></BrowserRouter>);
  const failedTag = tags()[0];
  await act(async () => { failedTag.dispatchEvent(new Event('error')); });
  expect(tags()).toHaveLength(0);
  expect(slot()).toBeNull();
  await act(async () => {
    history.pushState({}, '', '/footle');
    canonical.href = 'https://douknowball.com/footle';
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  expect(slot()).toBeNull();
  expect(window.adsbygoogle).toHaveLength(0);
  const publisherRequests = append.mock.calls.filter(([node]) => node instanceof HTMLScriptElement && node.src.includes('adsbygoogle.js'));
  expect(publisherRequests).toHaveLength(1);
});

it('discards a pending unit when navigation leaves its route before the publisher loads', async () => {
  const canonical = publicAdCanonical();
  render(<BrowserRouter><PublicFooterAd /></BrowserRouter>);
  const pendingTag = tags()[0];
  await act(async () => {
    history.pushState({}, '', '/privacy');
    canonical.href = 'https://douknowball.com/privacy';
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  expect(slot()).toBeNull();
  act(() => { pendingTag.dispatchEvent(new Event('load')); });
  expect(window.adsbygoogle).toHaveLength(0);
  expect(tags()[0]).toBe(pendingTag);
});
