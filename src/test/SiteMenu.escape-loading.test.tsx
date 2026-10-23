import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const delayedPanel = vi.hoisted(() => {
  let release!: () => void;
  let markLoaded!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const loaded = new Promise<void>(resolve => { markLoaded = resolve; });
  return { gate, loaded, release, markLoaded, requests: 0 };
});

vi.mock('@/components/layout/SiteMenuPanel', async importOriginal => {
  delayedPanel.requests += 1;
  await delayedPanel.gate;
  const actual = await importOriginal<typeof import('@/components/layout/SiteMenuPanel')>();
  delayedPanel.markLoaded();
  return actual;
});

import { SiteMenu } from '@/components/layout/SiteMenu';

afterEach(() => {
  delayedPanel.release();
  cleanup();
  vi.doUnmock('@/components/layout/SiteMenuPanel');
});

it('dismisses a pending real menu import with Escape from the trigger, without a late dialog', async () => {
  render(<MemoryRouter initialEntries={['/soccer']}><SiteMenu /></MemoryRouter>);
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  expect(delayedPanel.requests, 'SITE_MENU_ESCAPE_COLD_PANEL_NOT_IMPORTED').toBe(0);
  const trigger = screen.getByRole('button', { name: 'Open site menu' });

  const pending = async () => {
    trigger.focus();
    fireEvent.click(trigger);
    const region = await screen.findByRole('region', { name: 'Site menu loading' });
    expect(within(region).getByRole('status').textContent, 'SITE_MENU_ESCAPE_PENDING_STATUS').toContain('Loading menu...');
    expect(trigger.getAttribute('aria-busy'), 'SITE_MENU_ESCAPE_PENDING_BUSY').toBe('true');
    expect(screen.queryByRole('dialog', { name: 'Menu' }), 'SITE_MENU_ESCAPE_NO_EARLY_DIALOG').toBeNull();
    await waitFor(() => expect(delayedPanel.requests, 'SITE_MENU_ESCAPE_REAL_FACTORY_PENDING').toBe(1));
    return region;
  };
  const closed = async (marker: string) => {
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Site menu loading' }), marker).toBeNull());
    expect(trigger.getAttribute('aria-expanded'), marker + '_STATE').toBe('false');
    expect(document.activeElement, marker + '_FOCUS').toBe(trigger);
    expect(screen.queryByRole('dialog', { name: 'Menu' }), marker + '_NO_DIALOG').toBeNull();
  };

  const first = await pending();
  fireEvent.keyDown(trigger, { key: 'ArrowDown', code: 'ArrowDown' });
  expect(screen.queryByRole('region', { name: 'Site menu loading' }), 'SITE_MENU_LOADING_NON_ESCAPE_PRESERVED').toBe(first);
  fireEvent.keyDown(trigger, { key: 'Escape', code: 'Escape' });
  await closed('SITE_MENU_LOADING_ESCAPE_TRIGGER_CLOSED');

  await act(async () => {
    delayedPanel.release();
    await delayedPanel.loaded;
  });
  expect(screen.queryByRole('region', { name: 'Site menu loading' }), 'SITE_MENU_LOADING_ESCAPE_NO_LATE_REGION').toBeNull();
  expect(screen.queryByRole('dialog', { name: 'Menu' }), 'SITE_MENU_LOADING_ESCAPE_NO_LATE_DIALOG').toBeNull();
  expect(trigger.getAttribute('aria-expanded'), 'SITE_MENU_LOADING_ESCAPE_STAYS_CLOSED').toBe('false');
  expect(document.activeElement, 'SITE_MENU_LOADING_ESCAPE_FOCUS_HELD').toBe(trigger);

  fireEvent.click(trigger);
  const dialog = await screen.findByRole('dialog', { name: 'Menu' });
  expect(within(dialog).getByText('Find games, sports and site links.').textContent, 'SITE_MENU_LOADING_ESCAPE_HEALTHY_REAL_PANEL').toBe('Find games, sports and site links.');
  expect(within(dialog).getByRole('link', { name: 'Soccer' }).getAttribute('href'), 'SITE_MENU_LOADING_ESCAPE_HEALTHY_REAL_LINK').toBe('/soccer');
  expect(within(dialog).getByRole('button', { name: 'Close' }), 'SITE_MENU_LOADING_ESCAPE_HEALTHY_REAL_SHEET').toBeDefined();
});
