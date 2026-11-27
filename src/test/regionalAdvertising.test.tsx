// @vitest-environment-options {"url":"https://douknowball.com/soccer-career/"}
import { act, render, screen, waitFor, cleanup } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { allowsRegionalAds } from '@/lib/advertisingRegion';
import { CookieConsent } from '@/components/CookieConsent';
import { PublicFooterAd } from '@/components/ads/PublicFooterAd';
import { CONSENT_KEY, openConsentChoices } from '@/lib/consentPreferences';
import { publicAdCanonical } from './fixtures/publicAdSlot';

const host = 'douknowball.com';
const trace = (code: string) => 'h=' + host + '\nloc=' + code + '\n';
it.each(['IE', 'DE', 'GB', 'CH', 'NO', 'IS', 'LI', 'AX', 'GF', 'XX', 'T1', 'ZZ', 'EU', 'AA', ''])(
  'keeps advertising off without a choice for %s', code => expect(allowsRegionalAds(trace(code), host)).toBe(false)
);
it.each(['US','CA','AU','BR','NZ','JP','MX'])('recognizes a confirmed country outside the opt-in area: %s', code =>
  expect(allowsRegionalAds(trace(code), host)).toBe(true));
it('rejects ambiguous or mismatched responses', () => {
  for (const value of [trace('US') + 'loc=DE', trace('US') + 'h=elsewhere', '<html>US</html>', trace('US').replace(host, 'elsewhere')])
    expect(allowsRegionalAds(value, host)).toBe(false);
});

afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
it('loads a single tag on a direct public game in the US even without a manual display, and saves only a real choice', async () => {
  const request = vi.fn(async () => new Response(trace('US'), { headers: { 'content-type': 'text/plain' } }));
  vi.stubGlobal('fetch', request);
  vi.spyOn(window,'matchMedia').mockImplementation(query => ({
    matches: false, media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }));
  publicAdCanonical('/soccer-career');
  render(<BrowserRouter><CookieConsent inline /><PublicFooterAd /></BrowserRouter>);
  const tag = () => document.querySelectorAll('script[src*="adsbygoogle.js?client=ca-pub-2929318086316376"]');
  await waitFor(() => expect(tag()).toHaveLength(1));
  expect(request).toHaveBeenCalledTimes(1);
  expect(request).toHaveBeenCalledWith('/cdn-cgi/trace', expect.objectContaining({ credentials: 'omit', referrerPolicy: 'no-referrer' }));
  expect(document.querySelector('[data-public-footer-ad],script[src*=googletagmanager]')).toBeNull();
  expect(screen.queryByRole('region', { name: 'Cookie choices' })).toBeNull();
  expect(localStorage.getItem(CONSENT_KEY)).toBeNull();
  act(() => openConsentChoices());
  expect(screen.getByRole('checkbox', { name: 'Advertising' })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'Google Analytics' })).not.toBeChecked();
  expect(tag()).toHaveLength(1);
});
