import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

vi.mock('@/lib/consentedScripts', () => ({
  loadConsentedScripts: vi.fn(), stopRevokedServices: vi.fn(), publisherWaitingForRegion: () => false, pausePublisherForRegion: vi.fn(),
}));

const gpc = Object.getOwnPropertyDescriptor(navigator, 'globalPrivacyControl');
beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
  Object.defineProperty(navigator, 'globalPrivacyControl', { configurable: true, value: false });
});
afterEach(() => {
  cleanup();
  if (gpc) Object.defineProperty(navigator, 'globalPrivacyControl', gpc);
  else Reflect.deleteProperty(navigator, 'globalPrivacyControl');
});

async function mount() {
  const consent = await import('@/lib/consentPreferences');
  const { CookieConsent } = await import('@/components/CookieConsent');
  render(<MemoryRouter><CookieConsent /></MemoryRouter>);
  return consent;
}
const checkbox = (name: string) => screen.getByRole('checkbox', { name });
const choose = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

it.each([false, true])('renews an older saved ad grant with analytics unchecked (old analytics=%s)', async oldAnalytics => {
  localStorage.setItem('cookie-consent-v2', JSON.stringify({
    version: 2, advertising: true, analytics: oldAnalytics, updatedAt: Date.now(),
  }));
  const consent = await mount();
  expect(consent.getEffectiveConsent()).toEqual({ advertising: false, analytics: false });
  act(() => consent.openConsentChoices());
  expect(checkbox('Advertising')).not.toBeChecked();
  expect(checkbox('Google Analytics')).not.toBeChecked();
  fireEvent.click(checkbox('Advertising'));
  choose('Save choices');
  expect(consent.getEffectiveConsent()).toEqual({ advertising: true, analytics: false });
});

it.each([
  ['Advertising', true, false],
  ['Google Analytics', false, true],
] as const)('saves and reopens an independent %s choice', async (name, advertising, analytics) => {
  const consent = await mount();
  expect(checkbox('Advertising')).not.toBeChecked();
  expect(checkbox('Google Analytics')).not.toBeChecked();
  fireEvent.click(checkbox(name));
  choose('Save choices');
  expect(consent.readConsentPreferences()).toMatchObject({ advertising, analytics });
  expect(consent.getEffectiveConsent()).toEqual({ advertising, analytics });
  act(() => consent.openConsentChoices());
  expect(checkbox(name)).toBeChecked();
  fireEvent.click(checkbox(name));
  choose('Cancel');
  expect(consent.getEffectiveConsent()).toEqual({ advertising, analytics });
});

it('keeps advertising off under GPC when the visitor accepts all', async () => {
  Object.defineProperty(navigator, 'globalPrivacyControl', { configurable: true, value: true });
  const consent = await mount();
  expect(screen.queryByRole('region', { name: 'Cookie choices' })).toBeNull();
  act(() => consent.openConsentChoices());
  expect(checkbox('Advertising')).toBeDisabled();
  expect(checkbox('Google Analytics')).toBeEnabled();
  choose('Accept all');
  expect(consent.readConsentPreferences()).toMatchObject({ advertising: false, analytics: true });
});

it('does not upgrade an old analytics choice when GPC withdraws advertising on load', async () => {
  localStorage.setItem('cookie-consent-v2', JSON.stringify({
    version: 2, advertising: true, analytics: true, updatedAt: Date.now(),
  }));
  Object.defineProperty(navigator, 'globalPrivacyControl', { configurable: true, value: true });
  const consent = await mount();
  expect(consent.getEffectiveConsent()).toEqual({ advertising: false, analytics: false });
  expect(JSON.parse(localStorage.getItem('cookie-consent-v2')!)).not.toHaveProperty('analyticsOptIn', 1);
});

it('withdraws analytics independently while a game save holds the refresh', async () => {
  const consent = await mount();
  const { holdPendingSave } = await import('@/lib/safeStorage');
  const release = holdPendingSave(() => false);
  try {
    choose('Accept all');
    expect(consent.getEffectiveConsent()).toEqual({ advertising: true, analytics: true });
    act(() => consent.openConsentChoices());
    fireEvent.click(checkbox('Google Analytics'));
    choose('Save choices');
    expect(consent.getEffectiveConsent()).toEqual({ advertising: true, analytics: false });
    expect(consent.readConsentPreferences()).toMatchObject({ advertising: true, analytics: false });
    expect(checkbox('Google Analytics')).not.toBeChecked();
    expect(checkbox('Google Analytics')).toBeDisabled();
    choose('Reject all');
    expect(consent.getEffectiveConsent()).toEqual({ advertising: false, analytics: false });
  } finally { release(); }
});
