import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CookieConsent } from './CookieConsent';
import { CONSENT_CHANGED_EVENT } from '@/lib/consentedScripts';

const vendorScripts = () => document.querySelectorAll('script[src*="adsbygoogle.js"], script[src*="googletagmanager.com/gtag/js"]');
const show = () => render(<MemoryRouter><CookieConsent /></MemoryRouter>);

beforeEach(() => { localStorage.clear(); });
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vendorScripts().forEach(script => script.remove());
  document.querySelector('[data-dukb-manual-ad]')?.remove();
  delete window.dataLayer;
  delete window.gtag;
  localStorage.clear();
});

describe('cookie choices with unavailable storage', () => {
  it('shows usable choices when reading consent throws', () => {
    const denied = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage blocked', 'SecurityError');
    });
    show();
    expect(screen.getByRole('region', { name: 'Cookie choices' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Essential only' })).toBeEnabled();
    expect(denied).toHaveBeenCalled();
    expect(vendorScripts()).toHaveLength(0);
  });

  it('does not accept or load vendors when saving consent fails, and allows a retry', () => {
    const changed = vi.fn();
    window.addEventListener(CONSENT_CHANGED_EVENT, changed);
    const slot = document.createElement('div');
    slot.dataset.dukbManualAd = '';
    slot.innerHTML = '<ins class="adsbygoogle" data-ad-slot="test"></ins>';
    document.body.appendChild(slot);
    const denied = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage full', 'QuotaExceededError');
    });
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    expect(denied).toHaveBeenCalledWith('cookie-consent', 'accepted');
    expect(screen.getByRole('alert')).toHaveTextContent('Ads and analytics stay off');
    expect(screen.getByRole('region', { name: 'Cookie choices' })).toBeVisible();
    expect(localStorage.getItem('cookie-consent')).toBeNull();
    expect(changed).not.toHaveBeenCalled();
    expect(vendorScripts()).toHaveLength(0);
    denied.mockRestore();
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    expect(localStorage.getItem('cookie-consent')).toBe('accepted');
    expect(screen.queryByRole('region', { name: 'Cookie choices' })).toBeNull();
    expect(changed).toHaveBeenCalledTimes(1);
    expect(vendorScripts()).toHaveLength(2);
    window.removeEventListener(CONSENT_CHANGED_EVENT, changed);
  });

  it('lets essential-only dismiss for this visit even when the preference cannot persist', () => {
    const denied = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage blocked', 'SecurityError');
    });
    const view = show();
    fireEvent.click(screen.getByRole('button', { name: 'Essential only' }));
    expect(denied).toHaveBeenCalledWith('cookie-consent', 'essential');
    expect(screen.queryByRole('region', { name: 'Cookie choices' })).toBeNull();
    expect(document.body.dataset.consentPending).toBeUndefined();
    expect(vendorScripts()).toHaveLength(0);
    view.unmount();
    show();
    expect(screen.getByRole('region', { name: 'Cookie choices' })).toBeVisible();
  });

  it('persists essential-only on a healthy browser without loading vendors', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Essential only' }));
    expect(localStorage.getItem('cookie-consent')).toBe('essential');
    expect(vendorScripts()).toHaveLength(0);
    expect(screen.queryByRole('region', { name: 'Cookie choices' })).toBeNull();
  });

  it.each(['accepted', 'essential'])('does not prompt again for a stored %s choice', choice => {
    localStorage.setItem('cookie-consent', choice);
    show();
    expect(screen.queryByRole('region', { name: 'Cookie choices' })).toBeNull();
  });
});
