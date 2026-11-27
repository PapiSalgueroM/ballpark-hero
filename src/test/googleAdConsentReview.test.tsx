import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { CookieConsent } from '@/components/CookieConsent';
import { CONSENT_KEY, openConsentChoices } from '@/lib/consentPreferences';

type Readiness = { CONSENT_DATA_READY: () => void };
const review = () => screen.queryByRole('button', { name: 'Review Google’s European ad consent' });
function open(advertising = true) {
  localStorage.setItem(CONSENT_KEY, JSON.stringify({ version: 2, advertising, analytics: false, updatedAt: Date.now() }));
  render(<MemoryRouter><CookieConsent /></MemoryRouter>);
  act(() => openConsentChoices());
}
function cmp(result: { gdprApplies?: boolean; cmpLoaded?: boolean; cmpStatus?: string }) {
  const ready: Readiness[] = [];
  const show = vi.fn();
  vi.stubGlobal('googlefc', { callbackQueue: ready, showRevocationMessage: show });
  const ping = vi.fn((_command, _version, callback) => callback(result));
  vi.stubGlobal('__tcfapi', ping);
  return { ready, show, ping };
}
afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, 'globalPrivacyControl');
});

it('reopens the applicable provider message only on request and preserves the saved site decision', () => {
  const provider = cmp({ gdprApplies: true, cmpLoaded: true, cmpStatus: 'loaded' });
  open();
  const saved = localStorage.getItem(CONSENT_KEY);
  expect(review()).toBeNull();
  act(() => provider.ready[0].CONSENT_DATA_READY());
  expect(provider.ping).toHaveBeenCalledWith('ping', 2, expect.any(Function));
  expect(provider.show).not.toHaveBeenCalled();
  fireEvent.click(review()!);
  expect(provider.show).toHaveBeenCalledOnce();
  expect(localStorage.getItem(CONSENT_KEY)).toBe(saved);
  expect(document.querySelector('script[src*="googlesyndication"],script[src*="googletagmanager"]')).toBeNull();
});

it.each([
  { gdprApplies: false, cmpLoaded: true, cmpStatus: 'loaded' },
  { gdprApplies: undefined, cmpLoaded: true, cmpStatus: 'loaded' },
  { gdprApplies: true, cmpLoaded: false, cmpStatus: 'stub' },
  { gdprApplies: true, cmpLoaded: true, cmpStatus: 'error' },
])('keeps site choices usable without a confirmed applicable CMP: %j', result => {
  const provider = cmp(result);
  open();
  act(() => provider.ready[0].CONSENT_DATA_READY());
  expect(review()).toBeNull();
  expect(screen.getByRole('button', { name: 'Reject all' })).toBeVisible();
});

it.each(['reject', 'GPC'] as const)('never asks a CMP for regional status after %s', denial => {
  const provider = cmp({ gdprApplies: true, cmpLoaded: true, cmpStatus: 'loaded' });
  if (denial === 'GPC') Object.defineProperty(navigator, 'globalPrivacyControl', { value: true, configurable: true });
  open(denial !== 'reject');
  expect(provider.ready).toHaveLength(0);
  expect(review()).toBeNull();
});

it('handles an absent provider and a readiness callback that arrives after closing', () => {
  open();
  expect(review()).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  const provider = cmp({ gdprApplies: true, cmpLoaded: true, cmpStatus: 'loaded' });
  act(() => openConsentChoices());
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  act(() => provider.ready[0].CONSENT_DATA_READY());
  expect(provider.ping).not.toHaveBeenCalled();
  expect(provider.show).not.toHaveBeenCalled();
});

it('keeps the site controls available if the provider fails to open its message', () => {
  const provider = cmp({ gdprApplies: true, cmpLoaded: true, cmpStatus: 'loaded' });
  provider.show.mockImplementation(() => { throw new Error('Provider unavailable'); });
  open();
  act(() => provider.ready[0].CONSENT_DATA_READY());
  fireEvent.click(review()!);
  expect(screen.getByRole('status')).toHaveTextContent('You can still turn off Advertising here.');
  expect(screen.getByRole('button', { name: 'Reject all' })).toBeVisible();
});
