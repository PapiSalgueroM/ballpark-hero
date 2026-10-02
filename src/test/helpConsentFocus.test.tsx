import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CookieConsent } from '@/components/CookieConsent';
import { HowToPlayPopover } from '@/components/game/HowToPlayPopover';

const consent = vi.hoisted(() => ({ load: vi.fn(), changed: vi.fn() }));
vi.mock('@/lib/consentedScripts', () => ({
  CONSENT_CHANGED_EVENT: 'dukb-consent-changed',
  loadConsentedScripts: consent.load,
}));

function Fixture({ initialOpen = true }: { initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  return <MemoryRouter>
    <CookieConsent />
    <button>Fixture game action</button>
    <HowToPlayPopover title="Fixture rules" open={open} onOpenChange={setOpen}>
      <p>Fixture instructions.</p><p>Fixture worked example.</p>
    </HowToPlayPopover>
  </MemoryRouter>;
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

describe('pending cookie choices belong to the open help focus scope', () => {
  for (const choice of ['Essential only', 'Accept'] as const) {
    it(`${choice} receives focus inside initial rules and keeps its original consent behavior`, async () => {
      render(<Fixture />);
      const dialog = await screen.findByRole('dialog');
      const region = await screen.findByRole('region', { name: 'Cookie choices' });
      const button = within(region).getByRole('button', { name: choice });
      act(() => button.focus());
      expect(button).toHaveFocus();
      expect(dialog).toContainElement(region);
      expect(localStorage.getItem('cookie-consent')).toBeNull();
      expect(consent.load).not.toHaveBeenCalled();
      fireEvent.click(button);
      await waitFor(() => expect(screen.queryByRole('region', { name: 'Cookie choices' })).toBeNull());
      expect(localStorage.getItem('cookie-consent')).toBe(choice === 'Accept' ? 'accepted' : 'essential');
      expect(consent.changed).toHaveBeenCalledTimes(1);
      expect(consent.load).toHaveBeenCalledTimes(choice === 'Accept' ? 1 : 0);
      expect(screen.getByRole('dialog')).toBe(dialog);
      expect(dialog).toHaveTextContent('Fixture instructions.Fixture worked example.');
      fireEvent.click(screen.getByRole('button', { name: "Let's Play!" }));
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      await waitFor(() => expect(screen.getByRole('button', { name: 'How to play' })).toHaveFocus());
    });
  }

  it('keeps its single pending banner reachable when initial help is dismissed', async () => {
    render(<Fixture />);
    const dialog = await screen.findByRole('dialog');
    const first = await screen.findByRole('region', { name: 'Cookie choices' });
    expect(dialog).toContainElement(first);
    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const region = await screen.findByRole('region', { name: 'Cookie choices' });
    region.setAttribute('aria-hidden', 'true');
    await waitFor(() => expect(region).not.toHaveAttribute('aria-hidden'));
    const essential = within(region).getByRole('button', { name: 'Essential only' });
    act(() => essential.focus());
    expect(essential).toHaveFocus();
    expect(region.parentElement).toBe(document.body);
    expect(screen.getAllByRole('button', { name: 'Accept' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Essential only' })).toHaveLength(1);
    expect(document.body.dataset.consentPending).toBe('1');
    expect(localStorage.getItem('cookie-consent')).toBeNull();
    expect(consent.load).not.toHaveBeenCalled();
  });

  it('reuses the banner and its choices when help is reopened without a decision', async () => {
    render(<Fixture initialOpen={false} />);
    const banner = await screen.findByRole('region', { name: 'Cookie choices' });
    expect(banner.parentElement).toBe(document.body);
    fireEvent.click(screen.getByRole('button', { name: 'How to play' }));
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(dialog).toContainElement(screen.getByRole('region', { name: 'Cookie choices' })));
    const accept = screen.getByRole('button', { name: 'Accept' });
    act(() => accept.focus());
    expect(accept).toHaveFocus();
    expect(document.body.dataset.consentPending).toBeUndefined();
    expect(screen.getAllByRole('button', { name: 'Accept' })).toHaveLength(1);
    expect(localStorage.getItem('cookie-consent')).toBeNull();
    expect(consent.load).not.toHaveBeenCalled();
  });

  it('honors storage choices and restores pending choices within the same open rules', async () => {
    render(<Fixture />);
    const dialog = await screen.findByRole('dialog');
    await screen.findByRole('region', { name: 'Cookie choices' });
    act(() => {
      localStorage.setItem('cookie-consent', 'essential');
      window.dispatchEvent(new StorageEvent('storage', { key: 'cookie-consent', oldValue: null, newValue: 'essential' }));
    });
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Cookie choices' })).toBeNull());
    expect(screen.getByRole('dialog')).toBe(dialog);
    act(() => {
      localStorage.removeItem('cookie-consent');
      window.dispatchEvent(new StorageEvent('storage', { key: 'cookie-consent', oldValue: 'essential', newValue: null }));
    });
    const region = await screen.findByRole('region', { name: 'Cookie choices' });
    await waitFor(() => expect(dialog).toContainElement(region));
    const essential = within(region).getByRole('button', { name: 'Essential only' });
    act(() => essential.focus());
    expect(essential).toHaveFocus();
    expect(consent.load).not.toHaveBeenCalled();
    expect(consent.changed).not.toHaveBeenCalled();
  });

  it('preserves the normal modal trap and manual opener once consent is answered', async () => {
    localStorage.setItem('cookie-consent', 'essential');
    render(<Fixture initialOpen={false} />);
    const opener = screen.getByRole('button', { name: 'How to play' });
    opener.focus();
    fireEvent.click(opener);
    const dialog = await screen.findByRole('dialog');
    expect(screen.queryByRole('region', { name: 'Cookie choices' })).toBeNull();
    act(() => screen.getByRole('button', { name: 'Fixture game action', hidden: true }).focus());
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(opener).toHaveFocus());
    expect(localStorage.getItem('cookie-consent')).toBe('essential');
    expect(consent.load).not.toHaveBeenCalled();
  });

  it('keeps the original focused bottom banner on a page without open rules', async () => {
    render(<Fixture initialOpen={false} />);
    const region = await screen.findByRole('region', { name: 'Cookie choices' });
    expect(region.parentElement).toBe(document.body);
    expect(region).toHaveFocus();
    expect(region).toHaveClass('fixed', 'bottom-0');
    expect(document.body.dataset.consentPending).toBe('1');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(localStorage.getItem('cookie-consent')).toBeNull();
    expect(consent.load).not.toHaveBeenCalled();
  });
});
