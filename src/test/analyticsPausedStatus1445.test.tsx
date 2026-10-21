import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let CookieConsent: typeof import('@/components/CookieConsent').CookieConsent;
let openConsentChoices: typeof import('@/lib/consentPreferences').openConsentChoices;
let getEffectiveConsent: typeof import('@/lib/consentPreferences').getEffectiveConsent;
let loadAnalytics: typeof import('@/lib/consentedScripts').loadAnalytics;
let safeLocalStorage: Storage;
const key = 'cookie-consent-v2';
const gpcDescriptor = Object.getOwnPropertyDescriptor(navigator, 'globalPrivacyControl');

beforeEach(async () => {
  vi.resetModules();
  ({ safeLocalStorage } = await import('@/lib/safeStorage'));
  ({ CookieConsent } = await import('@/components/CookieConsent'));
  ({ openConsentChoices, getEffectiveConsent } = await import('@/lib/consentPreferences'));
  ({ loadAnalytics } = await import('@/lib/consentedScripts'));
  safeLocalStorage.clear(); localStorage.clear();
  Object.defineProperty(navigator, 'globalPrivacyControl', { configurable: true, value: false });
  for (const name of ['dataLayer', 'gtag', 'adsbygoogle', '__DUKB_CONSENT_DEFAULTED__']) Reflect.deleteProperty(window, name);
});
afterEach(() => {
  cleanup(); safeLocalStorage.clear(); localStorage.clear(); vi.restoreAllMocks();
  document.querySelectorAll('script[src*="googletagmanager.com"], script[src*="google-analytics.com"], script[src*="adsbygoogle.js"]').forEach(node => node.remove());
  for (const name of ['dataLayer', 'gtag', 'adsbygoogle', '__DUKB_CONSENT_DEFAULTED__']) Reflect.deleteProperty(window, name);
  if (gpcDescriptor) Object.defineProperty(navigator, 'globalPrivacyControl', gpcDescriptor);
  else Reflect.deleteProperty(navigator, 'globalPrivacyControl');
});

describe('Analytics paused status1445', () => {
  it('explains the pause without a dead control and preserves advertising, privacy and focus', async () => {
    const fetchCalls = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected transport in consent UI test'));
    render(<MemoryRouter>
      <button onClick={event => openConsentChoices(event.currentTarget)}>Open cookie choices</button>
      <CookieConsent />
    </MemoryRouter>);
    const region = screen.getByRole('region', { name: 'Cookie choices' });
    const advertising = within(region).getByRole('checkbox', { name: 'Advertising' });
    expect(advertising).toBeEnabled(); expect(advertising).not.toBeChecked();
    await waitFor(() => expect(region).toHaveFocus());
    expect(within(region).queryAllByRole('checkbox', { name: /Analytics/i }).length,
      'ANALYTICS_PAUSED_1445_DEAD_CONTROL').toBe(0);
    const explanation = within(region).getByText('Analytics is paused.', { exact: true }).closest('p')!;
    expect(explanation).toBeVisible();
    expect(explanation).toHaveTextContent('Google Analytics is off while we check its privacy settings.');
    expect(explanation).not.toHaveAttribute('role'); expect(explanation).not.toHaveAttribute('tabindex');
    expect(explanation.querySelector('input, button, [role="checkbox"], [role="button"], [tabindex]')).toBeNull();
    expect(within(region).getByRole('link', { name: 'Learn more' })).toHaveAttribute('href', '/privacy');
    expect(getEffectiveConsent()).toEqual({ advertising: false, analytics: false });

    fireEvent.click(advertising); expect(advertising).toBeChecked();
    fireEvent.click(within(region).getByRole('button', { name: 'Save choices' }));
    expect(screen.queryByRole('region', { name: 'Cookie choices' })).toBeNull();
    expect(JSON.parse(localStorage.getItem(key)!)).toMatchObject({ version: 2, advertising: true, analytics: false });
    expect(getEffectiveConsent()).toEqual({ advertising: true, analytics: false });
    loadAnalytics();
    expect(document.querySelector('script[src*="googletagmanager.com"], script[src*="google-analytics.com"]')).toBeNull();
    expect(window.dataLayer).toBeUndefined(); expect(window.gtag).toBeUndefined();

    const opener = screen.getByRole('button', { name: 'Open cookie choices' });
    act(() => opener.focus()); fireEvent.click(opener);
    const reopened = screen.getByRole('region', { name: 'Cookie choices' });
    await waitFor(() => expect(reopened).toHaveFocus());
    expect(within(reopened).getByRole('checkbox', { name: 'Advertising' })).toBeChecked();
    expect(within(reopened).queryByRole('checkbox', { name: /Analytics/i })).toBeNull();
    const before = localStorage.getItem(key);
    fireEvent.click(within(reopened).getByRole('button', { name: 'Cancel' }));
    expect(opener).toHaveFocus(); expect(localStorage.getItem(key)).toBe(before);
    expect(fetchCalls).not.toHaveBeenCalled();
  });
});
