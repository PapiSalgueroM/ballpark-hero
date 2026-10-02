import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CookieConsent } from '@/components/CookieConsent';
import { RulesGate } from '@/components/game/RulesGate';

const consent = vi.hoisted(() => ({ load: vi.fn(), changed: vi.fn() }));
vi.mock('@/lib/consentedScripts', () => ({
  CONSENT_CHANGED_EVENT: 'dukb-consent-changed',
  loadConsentedScripts: consent.load,
}));

function renderGate() {
  return render(<MemoryRouter initialEntries={['/face-off']}>
    <CookieConsent />
    <button>Fixture game action</button>
    <RulesGate title="Fixture rules">
      <p>Fixture instructions.</p><p>Fixture worked example.</p>
    </RulesGate>
  </MemoryRouter>);
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  window.addEventListener('dukb-consent-changed', consent.changed);
});
afterEach(() => {
  cleanup();
  window.removeEventListener('dukb-consent-changed', consent.changed);
});

describe('RulesGate shares one pending cookie region and restores its help control', () => {
  for (const choice of ['Essential only', 'Accept'] as const) {
    it(`${choice} is reachable within first-entry rules and preserves its consent gate`, async () => {
      renderGate();
      const dialog = await screen.findByRole('dialog');
      const region = await screen.findByRole('region', { name: 'Cookie choices' });
      const button = within(region).getByRole('button', { name: choice });
      act(() => button.focus());
      expect(button).toHaveFocus();
      expect(dialog).toContainElement(region);
      expect(screen.getAllByRole('button', { name: 'Accept' })).toHaveLength(1);
      expect(screen.getAllByRole('button', { name: 'Essential only' })).toHaveLength(1);
      expect(localStorage.getItem('cookie-consent')).toBeNull();
      expect(consent.load).not.toHaveBeenCalled();
      fireEvent.click(button);
      await waitFor(() => expect(screen.queryByRole('region', { name: 'Cookie choices' })).toBeNull());
      expect(localStorage.getItem('cookie-consent')).toBe(choice === 'Accept' ? 'accepted' : 'essential');
      expect(consent.changed).toHaveBeenCalledTimes(1);
      expect(consent.load).toHaveBeenCalledTimes(choice === 'Accept' ? 1 : 0);
      expect(screen.getByRole('dialog')).toBe(dialog);
      expect(dialog).toHaveTextContent('Fixture instructions.Fixture worked example.');
      expect(localStorage.getItem('rules-gate-seen:/face-off')).toBe('1');
    });
  }

  it('restores one bottom banner when rules close without a cookie decision', async () => {
    renderGate();
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(dialog).toContainElement(screen.getByRole('region', { name: 'Cookie choices' })));
    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const region = await screen.findByRole('region', { name: 'Cookie choices' });
    expect(region.parentElement).toBe(document.body);
    expect(region).toHaveClass('fixed', 'bottom-0');
    const button = within(region).getByRole('button', { name: 'Essential only' });
    act(() => button.focus());
    expect(button).toHaveFocus();
    expect(screen.getAllByRole('button', { name: 'Essential only' })).toHaveLength(1);
    expect(localStorage.getItem('cookie-consent')).toBeNull();
    expect(consent.load).not.toHaveBeenCalled();
  });

  it('puts newly pending storage choices back into the same open rules', async () => {
    localStorage.setItem('cookie-consent', 'essential');
    renderGate();
    const dialog = await screen.findByRole('dialog');
    expect(screen.queryByRole('region', { name: 'Cookie choices' })).toBeNull();
    act(() => {
      localStorage.removeItem('cookie-consent');
      window.dispatchEvent(new StorageEvent('storage', { key: 'cookie-consent', oldValue: 'essential', newValue: null }));
    });
    const region = await screen.findByRole('region', { name: 'Cookie choices' });
    await waitFor(() => expect(dialog).toContainElement(region));
    const accept = within(region).getByRole('button', { name: 'Accept' });
    act(() => accept.focus());
    expect(accept).toHaveFocus();
    expect(consent.load).not.toHaveBeenCalled();
    expect(consent.changed).not.toHaveBeenCalled();
  });

  for (const close of ['Escape', 'Close', "Let's Play!"]) {
    it(`returns to the exact manually opened help control after ${close}`, async () => {
      localStorage.setItem('cookie-consent', 'essential');
      localStorage.setItem('rules-gate-seen:/face-off', '1');
      renderGate();
      const opener = screen.getByRole('button', { name: 'How to play' });
      expect(screen.queryByRole('dialog')).toBeNull();
      opener.focus();
      fireEvent.click(opener);
      const dialog = await screen.findByRole('dialog');
      if (close === 'Escape') fireEvent.keyDown(dialog, { key: 'Escape' });
      else fireEvent.click(screen.getByRole('button', { name: close }));
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      await waitFor(() => expect(opener).toHaveFocus());
      expect(screen.getByRole('button', { name: 'How to play' })).toBe(opener);
      expect(consent.load).not.toHaveBeenCalled();
    });
  }

  it('retains the normal modal trap while answered consent keeps its banner absent', async () => {
    localStorage.setItem('cookie-consent', 'essential');
    renderGate();
    const dialog = await screen.findByRole('dialog');
    act(() => screen.getByRole('button', { name: 'Fixture game action', hidden: true }).focus());
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    expect(screen.queryByRole('region', { name: 'Cookie choices' })).toBeNull();
    expect(consent.load).not.toHaveBeenCalled();
  });

  it('preserves first-entry instructions and the existing seen-per-route behavior', async () => {
    localStorage.setItem('cookie-consent', 'essential');
    const first = renderGate();
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Fixture instructions.Fixture worked example.');
    expect(localStorage.getItem('rules-gate-seen:/face-off')).toBe('1');
    fireEvent.click(screen.getByRole('button', { name: "Let's Play!" }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    first.unmount();
    renderGate();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'How to play' })).toBeVisible();
    expect(localStorage.getItem('cookie-consent')).toBe('essential');
    expect(consent.load).not.toHaveBeenCalled();
  });
});
