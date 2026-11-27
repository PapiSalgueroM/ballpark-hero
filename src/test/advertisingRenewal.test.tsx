// @vitest-environment-options {"url":"https://douknowball.com/"}
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { publicAdCanonical } from './fixtures/publicAdSlot';

const key = 'cookie-consent-v2';
const day = 86400000;
const now = Date.UTC(2026, 10, 27, 10);
const ad = 'script[src*="adsbygoogle.js"]';
const ga = 'script[src*="gtag/js"][src*="dukbGaLayer"]';
const choice = (advertising: boolean, analytics: boolean, age: number, confirmationAge?: number) => ({
  version: 2, advertising, analytics, analyticsOptIn: 1, updatedAt: now - age * day,
  ...(confirmationAge !== undefined && { advertisingConfirmedAt: now - confirmationAge * day }),
});
beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(now);
  history.replaceState({}, '', '/');
  publicAdCanonical('/');
  localStorage.clear();
});
afterEach(() => {
  cleanup(); vi.useRealTimers(); vi.unstubAllGlobals();
  document.head.querySelectorAll('script,link[rel="canonical"]').forEach(node => node.remove());
  for (const name of ['gtag', 'dataLayer', 'dukbGaLayer', 'adsbygoogle']) Reflect.deleteProperty(window, name);
});
async function mount(country: string, saved?: ReturnType<typeof choice> | 'accepted' | 'essential') {
  if (typeof saved === 'string') localStorage.setItem('cookie-consent', saved);
  else if (saved) localStorage.setItem(key, JSON.stringify(saved));
  vi.stubGlobal('fetch', async () => new Response('h=douknowball.com\nloc=' + country + '\n', { headers: { 'Content-Type': 'text/plain' } }));
  const { CookieConsent } = await import('@/components/CookieConsent');
  const { PublicFooterAd } = await import('@/components/ads/PublicFooterAd');
  const preferences = await import('@/lib/consentPreferences');
  await act(async () => { render(<BrowserRouter><CookieConsent inline /><PublicFooterAd /></BrowserRouter>); });
  return preferences;
}
it.each(['DE', 'GB', 'CH', 'XX'])('renews a previous yes exactly for advertising in %s', async country => {
  const previous = choice(true, true, 170);
  const consent = await mount(country, previous);
  expect(document.querySelector(ad)).toBeNull();
  expect(document.querySelector(ga)).not.toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Allow advertising' }));
  expect(JSON.parse(localStorage.getItem(key)!)).toMatchObject({ advertisingConfirmedAt: now, updatedAt: previous.updatedAt, analyticsOptIn: 1 });
  expect(consent.getEffectiveConsent()).toEqual({ advertising: true, analytics: true });
  expect(document.querySelectorAll(ad)).toHaveLength(1);
  expect(document.querySelectorAll(ga)).toHaveLength(1);
  vi.setSystemTime(now + 10 * day);
  expect(consent.getEffectiveConsent()).toEqual({ advertising: true, analytics: false });
  vi.setSystemTime(now + 30 * day - 1);
  expect(consent.consentPrompt()).toBeNull();
  vi.setSystemTime(now + 30 * day);
  expect(consent.getEffectiveConsent()).toEqual({ advertising: false, analytics: false });
  expect(consent.consentPrompt()).toBe('renew');
});
it.each([
  ['AU', choice(true, true, 181), true], ['US', 'accepted', true], ['US', undefined, true],
  ['AU', choice(false, true, 188), false], ['US', choice(false, false, 230), false], ['AU', 'essential', false],
] as const)('sustains the regional default or an existing refusal in %s', async (country, saved, ads) => {
  const consent = await mount(country, saved);
  expect(consent.getEffectiveConsent()).toEqual({ advertising: ads, analytics: false });
  expect(document.querySelectorAll(ad)).toHaveLength(ads ? 1 : 0);
  expect(document.querySelector(ga)).toBeNull();
  expect(screen.queryByRole('region', { name: 'Cookie choices' })).toBeNull();
});
it('keeps renewal out of saved games and query URLs, then presents it on returning to a public screen', async () => {
  const slots = document.createElement('div');
  slots.id = 'soccer-career-slots';
  document.body.append(slots);
  const consent = await mount('DE', choice(true, false, 31, 31));
  expect(consent.getEffectiveConsent().advertising).toBe(false);
  expect(screen.queryByRole('region', { name: 'Cookie choices' })).toBeNull();
  act(() => { history.pushState({}, '', '/?test=1'); window.dispatchEvent(new PopStateEvent('popstate')); slots.remove(); });
  expect(screen.queryByRole('region', { name: 'Cookie choices' })).toBeNull();
  act(() => { history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')); });
  fireEvent.click(await screen.findByRole('button', { name: 'Keep advertising off' }));
  expect(document.querySelector(ad)).toBeNull();
  vi.setSystemTime(now + 180 * day - 1);
  expect(consent.consentPrompt()).toBeNull();
  vi.setSystemTime(now + 180 * day);
  expect(consent.consentPrompt()).toBe('choices');
  expect(consent.getEffectiveConsent().advertising).toBe(false);
});
it('lets the visitor renew advertising without adding analytics to an old bundled choice', async () => {
  const consent = await mount('DE', 'accepted');
  fireEvent.click(await screen.findByRole('button', { name: 'Allow advertising' }));
  await waitFor(() => expect(document.querySelectorAll(ad)).toHaveLength(1));
  expect(consent.getEffectiveConsent()).toEqual({ advertising: true, analytics: false });
  expect(document.querySelector(ga)).toBeNull();
  expect(localStorage.getItem('cookie-consent')).toBeNull();
});
it('preserves an independently granted analytics clock when GPC withdraws an old ad grant', async () => {
  const previous = choice(true, true, 179);
  Object.defineProperty(navigator, 'globalPrivacyControl', { configurable: true, value: true });
  try {
    const consent = await mount('US', previous);
    expect(consent.getEffectiveConsent()).toEqual({ advertising: false, analytics: true });
    expect(screen.queryByRole('region', { name: 'Cookie choices' })).toBeNull();
    expect(JSON.parse(localStorage.getItem(key)!)).toMatchObject({ advertising: false, updatedAt: previous.updatedAt });
    vi.setSystemTime(now + day);
    expect(consent.getEffectiveConsent()).toEqual({ advertising: false, analytics: false });
  } finally { Reflect.deleteProperty(navigator, 'globalPrivacyControl'); }
});
it('rejects a future ad timestamp while preserving independently granted analytics', async () => {
  const consent = await mount('DE', choice(true, true, 2, -1));
  expect(consent.getEffectiveConsent()).toEqual({ advertising: false, analytics: true });
  expect(screen.getByRole('button', { name: 'Allow advertising' })).toBeVisible();
  expect(document.querySelector(ad)).toBeNull();
});
