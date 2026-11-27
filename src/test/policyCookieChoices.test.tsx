import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { afterEach, describe, expect, it } from 'vitest';
import CookiePolicy from '@/pages/CookiePolicy';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import { CookieConsent } from '@/components/CookieConsent';
import { CONSENT_KEY, CONSENT_MAX_AGE_MS } from '@/lib/consentPreferences';

const loader = 'script[src*="adsbygoogle.js"], script[src*="googletagmanager.com"]';
const gpc = Object.getOwnPropertyDescriptor(navigator, 'globalPrivacyControl');

afterEach(() => {
  cleanup();
  localStorage.clear();
  if (gpc) Object.defineProperty(navigator, 'globalPrivacyControl', gpc);
  else Reflect.deleteProperty(navigator, 'globalPrivacyControl');
});

describe.each([['Privacy Policy', PrivacyPolicy], ['Cookie Policy', CookiePolicy]] as const)('%s choices', (heading, Page) => {
  it('explains regional ad renewal in the live page and its saved public HTML', () => {
    render(<HelmetProvider><MemoryRouter><Page /></MemoryRouter></HelmetProvider>);
    const route = heading === 'Privacy Policy' ? 'privacy' : 'cookie-policy';
    const html = readFileSync(`public/${route}/index.html`, 'utf8');
    const snapshot = new DOMParser().parseFromString(html, 'text/html').querySelector('#dukb-snapshot');
    expect(snapshot).not.toBeNull();
    expect(snapshot?.textContent).toContain('Where we ask first, advertising permission lasts 30 days and we remember a refusal for 180 days. Google Analytics has its own 180-day choice.');
    for (const el of [screen.getByRole('main'), snapshot!]) {
      const text = el.textContent?.replace(/\s+/g, ' ');
      expect(text).toMatch(/EEA\), the UK and Switzerland, Advertising stays off until you allow it/);
      expect(text).toMatch(/ask first if we cannot confirm your region/);
      expect(text).toMatch(/allow Advertising, we ask again every 30 days. Ads pause until you confirm/);
      expect(text).toMatch(/confirm that older choice once/);
      expect(text).toMatch(/remember your refusal for 180 days/);
      expect(text).toMatch(/US and Australia, Advertising starts on unless you turn it off/);
      expect(text).toMatch(/keep your saved opt-out/);
      expect(text).toMatch(/Global Privacy Control signal from your browser keeps Advertising off/);
      expect(text).toMatch(/Renewing Advertising leaves your Google Analytics choice and its 180-day period unchanged/);
    }
  });

  it.each([false, true])('opens and cancels without changing the saved Advertising choice (%s)', async advertising => {
    Object.defineProperty(navigator, 'globalPrivacyControl', { configurable: true, value: false });
    const original = JSON.stringify({
      version: 2, advertising, analytics: false, updatedAt: Date.now() - CONSENT_MAX_AGE_MS + 60_000,
      ...(advertising ? { advertisingConfirmedAt: Date.now() } : {}),
    });
    localStorage.setItem(CONSENT_KEY, original);
    render(<HelmetProvider><MemoryRouter><Page /><CookieConsent /></MemoryRouter></HelmetProvider>);
    expect(screen.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
    expect(screen.getByText(/Google may not show an ad on every visit/)).toBeVisible();
    expect(screen.queryByRole('region', { name: 'Cookie choices' })).toBeNull();
    const button = screen.getByRole('button', { name: 'Open Cookie choices' });
    button.focus();
    fireEvent.click(button);
    const panel = screen.getByRole('region', { name: 'Cookie choices' });
    await waitFor(() => expect(panel).toHaveFocus());
    const toggle = within(panel).getByRole('checkbox', { name: 'Advertising' }) as HTMLInputElement;
    expect(toggle.checked).toBe(advertising);
    expect(localStorage.getItem(CONSENT_KEY)).toBe(original);
    fireEvent.click(toggle);
    expect(toggle.checked).toBe(!advertising);
    expect(localStorage.getItem(CONSENT_KEY)).toBe(original);
    fireEvent.click(within(panel).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('region', { name: 'Cookie choices' })).toBeNull();
    expect(button).toHaveFocus();
    expect(localStorage.getItem(CONSENT_KEY)).toBe(original);
    expect(document.querySelector(loader)).toBeNull();
  });
});
