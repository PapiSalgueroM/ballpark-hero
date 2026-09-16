import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CookieConsent } from '@/components/CookieConsent';
import AdBanner from '@/components/ads/AdBanner';
import { CONSENT_CHANGED_EVENT, isConsentStorageBlocked, loadAdSense, loadAnalytics, setConsentStorageBlocked } from '@/lib/consentedScripts';

const renderBanner = () => render(<MemoryRouter><CookieConsent /></MemoryRouter>);
const vendorScripts = () => document.querySelectorAll('script[src*="googlesyndication"],script[src*="googletagmanager"]');
const blockWrites = () => vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Blocked', 'SecurityError'); });

beforeEach(() => {
  localStorage.clear();
  setConsentStorageBlocked(false);
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Unexpected network request'); }));
});
afterEach(() => {
  cleanup();
  expect(fetch).not.toHaveBeenCalled();
  vendorScripts().forEach(node => node.remove());
  document.querySelectorAll('[data-test-slot]').forEach(node => node.remove());
  delete (window as unknown as { adsbygoogle?: unknown }).adsbygoogle;
  delete window.gtag;
  delete window.dataLayer;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  setConsentStorageBlocked(false);
});

describe('cookie storage recovery', () => {
  it('blocked read mounts the real banner with usable choices', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('Blocked', 'SecurityError'); });
    renderBanner();
    expect(screen.queryByRole('region', { name: 'Cookie choices' }), 'Blocked read must show the recovery banner').not.toBeNull();
    expect(screen.getByRole('region', { name: 'Cookie choices' })).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent('blocking saved choices');
    expect(screen.getByRole('button', { name: 'Accept' })).toBeEnabled();
    expect(isConsentStorageBlocked()).toBe(true);
    expect(vendorScripts()).toHaveLength(0);
  });

  it('failed Accept stays open and does not start optional scripts', () => {
    renderBanner();
    blockWrites();
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    expect(screen.getByRole('region', { name: 'Cookie choices' })).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent('blocked saving this choice');
    expect(localStorage.getItem('cookie-consent')).toBeNull();
    expect(isConsentStorageBlocked(), 'Failed Accept must keep optional loads blocked').toBe(true);
    expect(vendorScripts()).toHaveLength(0);
    expect(window.gtag).toBeUndefined();
  });

  it('failed Essential dismisses for this page and blocks stale accepted mounts and events', () => {
    renderBanner();
    localStorage.setItem('cookie-consent', 'accepted');
    blockWrites();
    fireEvent.click(screen.getByRole('button', { name: 'Essential only' }));
    expect(screen.queryByRole('region', { name: 'Cookie choices' }), 'Failed Essential must dismiss for this page').toBeNull();
    expect(localStorage.getItem('cookie-consent')).toBe('accepted');
    expect(isConsentStorageBlocked()).toBe(true);
    const ad = render(<AdBanner slot="1234567890" />);
    expect(ad.container.querySelector('ins'), 'A later ad mount must reject stale stored Accept').toBeNull();
    act(() => {
      window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
      window.dispatchEvent(new StorageEvent('storage', { key: 'cookie-consent', oldValue: null, newValue: 'accepted' }));
    });
    expect(ad.container.querySelector('ins'), 'Consent events must not revive an ad after storage failure').toBeNull();
    expect(vendorScripts()).toHaveLength(0);
  });

  it('blocked page prevents later direct ad and analytics loader calls', () => {
    renderBanner();
    blockWrites();
    fireEvent.click(screen.getByRole('button', { name: 'Essential only' }));
    const slot = document.createElement('div');
    slot.dataset.testSlot = '';
    slot.dataset.dukbManualAd = '';
    slot.innerHTML = '<ins class="adsbygoogle" data-ad-slot="1234567890"></ins>';
    document.body.appendChild(slot);
    expect(loadAdSense(), 'Blocked page must reject the ad loader').toBe(false);
    loadAnalytics();
    expect(vendorScripts(), 'Blocked page must reject the analytics loader').toHaveLength(0);
    expect(window.gtag).toBeUndefined();
  });

  it('successful explicit retry alone clears the block and starts analytics', () => {
    renderBanner();
    const write = blockWrites();
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    expect(isConsentStorageBlocked()).toBe(true);
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: 'cookie-consent', newValue: 'accepted' })));
    expect(isConsentStorageBlocked()).toBe(true);
    expect(screen.queryByRole('region', { name: 'Cookie choices' }), 'Cross-tab Accept cannot dismiss unresolved storage failure').not.toBeNull();
    expect(screen.getByRole('region', { name: 'Cookie choices' })).toBeVisible();
    expect(vendorScripts()).toHaveLength(0);
    write.mockRestore();
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    expect(localStorage.getItem('cookie-consent')).toBe('accepted');
    expect(isConsentStorageBlocked(), 'A successful explicit save must clear the page block').toBe(false);
    expect(screen.queryByRole('region', { name: 'Cookie choices' })).toBeNull();
    expect(document.querySelectorAll('script[src*="googletagmanager"]')).toHaveLength(1);
    expect(document.querySelectorAll('script[src*="googlesyndication"]')).toHaveLength(0);
  });

  it('normal Essential saves without scripts and cross-tab Accept still works', () => {
    renderBanner();
    fireEvent.click(screen.getByRole('button', { name: 'Essential only' }));
    expect(localStorage.getItem('cookie-consent')).toBe('essential');
    expect(screen.queryByRole('region', { name: 'Cookie choices' })).toBeNull();
    expect(vendorScripts()).toHaveLength(0);
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: 'cookie-consent', oldValue: 'essential', newValue: 'accepted' })));
    expect(document.querySelectorAll('script[src*="googletagmanager"]')).toHaveLength(1);
  });
});
