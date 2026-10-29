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
  vi.restoreAllMocks();
  vi.doUnmock('@/components/layout/SiteMenuPanel');
});

function launchers(fallbackHidden = false, hostHidden = true) {
  return <MemoryRouter initialEntries={['/soccer']}>
    <div data-testid="fallback" hidden={fallbackHidden}><SiteMenu /></div>
    <div data-testid="host" data-site-menu-host="" hidden={hostHidden}><SiteMenu /></div>
  </MemoryRouter>;
}

it('returns pending import Escape focus to the arrived host and never opens a late Sheet', async () => {
  const rendered = render(launchers());
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  expect(delayedPanel.requests, 'MENU_HOST_PENDING_COLD').toBe(0);
  const fallback = within(screen.getByTestId('fallback')).getByRole('button', { name: 'Open site menu' }) as HTMLButtonElement;
  const host = screen.getByTestId('host').querySelector('button') as HTMLButtonElement;
  vi.spyOn(fallback, 'getClientRects').mockReturnValue([{ x: 0, y: 0, width: 44, height: 44, top: 0, right: 44, bottom: 44, left: 0 }] as unknown as DOMRectList);
  vi.spyOn(host, 'getClientRects').mockReturnValue([] as unknown as DOMRectList);
  fallback.focus();
  fireEvent.click(fallback);
  const region = await screen.findByRole('region', { name: 'Site menu loading' });
  expect(within(region).getByRole('status').textContent, 'MENU_HOST_PENDING_ACTUAL_LOADING').toContain('Loading menu...');
  await waitFor(() => expect(delayedPanel.requests, 'MENU_HOST_PENDING_REAL_FACTORY').toBe(1));
  rendered.rerender(launchers(true, false));
  vi.mocked(fallback.getClientRects).mockReturnValue([] as unknown as DOMRectList);
  vi.mocked(host.getClientRects).mockReturnValue([{ x: 0, y: 0, width: 44, height: 44, top: 0, right: 44, bottom: 44, left: 0 }] as unknown as DOMRectList);
  expect(screen.getAllByRole('button', { name: 'Open site menu' }), 'MENU_HOST_PENDING_ONE_VISIBLE_LAUNCHER').toEqual([host]);
  expect(region.closest('[hidden]') === null, 'MENU_HOST_PENDING_MESSAGE_SURVIVES_HOST').toBe(true);
  const cancel = within(region).getByRole('button', { name: 'Cancel' });
  cancel.focus();
  fireEvent.keyDown(cancel, { key: 'Escape', code: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('region', { name: 'Site menu loading' }), 'MENU_HOST_PENDING_CLOSED').toBeNull());
  expect(document.activeElement, 'MENU_HOST_PENDING_VISIBLE_FOCUS_RETURN').toBe(host);
  expect(fallback.getAttribute('aria-expanded'), 'MENU_HOST_PENDING_OLD_CLOSED').toBe('false');
  expect(host.getAttribute('aria-expanded'), 'MENU_HOST_PENDING_NEW_CLOSED').toBe('false');
  await act(async () => { delayedPanel.release(); await delayedPanel.loaded; });
  expect(screen.queryByRole('dialog', { name: 'Menu' }), 'MENU_HOST_PENDING_NO_LATE_SHEET').toBeNull();
  expect(document.activeElement, 'MENU_HOST_PENDING_FOCUS_HELD').toBe(host);
});
