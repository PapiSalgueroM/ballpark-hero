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
  // doUnmock is deliberately not hoisted, unlike unmock.
  vi.doUnmock('@/components/layout/SiteMenuPanel');
});

// Added after production v1. This is a loader-boundary test, not an original RED claim.
it('cancels a pending real panel import without a late dialog, then reopens the actual healthy panel', async () => {
  render(<MemoryRouter initialEntries={['/soccer']}><SiteMenu /></MemoryRouter>);
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  expect(delayedPanel.requests, 'SITE_MENU_COLD_PANEL_NOT_IMPORTED').toBe(0);
  const trigger = screen.getByRole('button', { name: 'Open site menu' });
  trigger.focus();
  fireEvent.click(trigger);
  const loading = await screen.findByRole('region', { name: 'Site menu loading' });
  expect(within(loading).getByRole('status'), 'SITE_MENU_DELAY_PENDING_STATUS').toHaveTextContent('Loading menu...');
  expect(trigger, 'SITE_MENU_DELAY_BUSY').toHaveAttribute('aria-busy', 'true');
  expect(screen.queryByRole('dialog', { name: 'Menu' }), 'SITE_MENU_DELAY_NO_EARLY_DIALOG').not.toBeInTheDocument();
  await waitFor(() => expect(delayedPanel.requests, 'SITE_MENU_DELAY_FACTORY_ENTERED').toBe(1));

  fireEvent.click(within(loading).getByRole('button', { name: 'Cancel' }));
  await waitFor(() => expect(screen.queryByRole('region', { name: 'Site menu loading' }),
    'SITE_MENU_DELAY_CANCEL_REMOVES_LOADING').not.toBeInTheDocument());
  expect(trigger, 'SITE_MENU_DELAY_CANCEL_FOCUS').toHaveFocus();
  expect(trigger, 'SITE_MENU_DELAY_CANCEL_CLOSED').toHaveAttribute('aria-expanded', 'false');

  await act(async () => {
    delayedPanel.release();
    await delayedPanel.loaded;
  });
  expect(screen.queryByRole('dialog', { name: 'Menu' }), 'SITE_MENU_DELAY_NO_LATE_DIALOG').not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Site menu loading' }), 'SITE_MENU_DELAY_NO_LATE_LOADING').not.toBeInTheDocument();
  expect(trigger, 'SITE_MENU_DELAY_STAYS_CLOSED').toHaveAttribute('aria-expanded', 'false');
  expect(trigger, 'SITE_MENU_DELAY_FOCUS_HELD').toHaveFocus();

  fireEvent.click(trigger);
  const dialog = await screen.findByRole('dialog', { name: 'Menu' });
  expect(dialog, 'SITE_MENU_DELAY_REAL_PANEL_RECOVERY').toBeVisible();
  expect(within(dialog).getByText('Find games, sports and site links.')).toBeVisible();
  expect(within(dialog).getByRole('link', { name: 'Soccer' }), 'SITE_MENU_DELAY_ACTUAL_SPORT_LINK')
    .toHaveAttribute('href', '/soccer');
  expect(within(dialog).getByRole('button', { name: 'Close' }), 'SITE_MENU_DELAY_ACTUAL_SHEET_CLOSE').toBeVisible();
});
