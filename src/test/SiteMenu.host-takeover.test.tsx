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

function rects(visible: boolean) {
  return (visible ? [{ x: 0, y: 0, width: 44, height: 44, top: 0, right: 44, bottom: 44, left: 0 }] : []) as unknown as DOMRectList;
}

function openSheets() {
  return screen.queryAllByRole('dialog', { hidden: true })
    .filter(sheet => sheet.getAttribute('data-state') === 'open');
}

it('opens only one real Sheet when the arrived host takes over a pending fallback', async () => {
  const rendered = render(launchers());
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  expect(delayedPanel.requests, 'MENU_HOST_TAKEOVER_COLD').toBe(0);
  const fallback = within(screen.getByTestId('fallback')).getByRole('button', { name: 'Open site menu' }) as HTMLButtonElement;
  const host = screen.getByTestId('host').querySelector('button') as HTMLButtonElement;
  vi.spyOn(fallback, 'getClientRects').mockReturnValue(rects(true));
  vi.spyOn(host, 'getClientRects').mockReturnValue(rects(false));
  fallback.focus();
  fireEvent.click(fallback);
  const pending = await screen.findByRole('region', { name: 'Site menu loading' });
  expect(within(pending).getByRole('status').textContent, 'MENU_HOST_TAKEOVER_REAL_PENDING').toContain('Loading menu...');
  await waitFor(() => expect(delayedPanel.requests, 'MENU_HOST_TAKEOVER_REAL_FACTORY').toBe(1));
  rendered.rerender(launchers(true, false));
  vi.mocked(fallback.getClientRects).mockReturnValue(rects(false));
  vi.mocked(host.getClientRects).mockReturnValue(rects(true));
  expect(screen.getAllByRole('button', { name: 'Open site menu' }), 'MENU_HOST_TAKEOVER_ONE_VISIBLE_TRIGGER').toEqual([host]);
  fireEvent.click(host);
  expect(host.getAttribute('aria-expanded'), 'MENU_HOST_TAKEOVER_HOST_ACTIVATED').toBe('true');
  await act(async () => {
    delayedPanel.release();
    await delayedPanel.loaded;
    await Promise.resolve();
    await Promise.resolve();
  });
  await waitFor(() => expect(openSheets().length, 'MENU_HOST_TAKEOVER_REAL_SHEET_FOUNDATION').toBeGreaterThanOrEqual(1));
  const sheets = openSheets();
  expect(sheets.every(sheet => sheet.querySelector('a[href="/soccer"]')?.textContent === 'Soccer'),
    'MENU_HOST_TAKEOVER_ACTUAL_PANEL_LINK').toBe(true);
  expect(sheets.length, 'MENU_HOST_TAKEOVER_SINGLE_SHEET').toBe(1);
  expect(fallback.getAttribute('aria-expanded'), 'MENU_HOST_TAKEOVER_PREVIOUS_OWNER_CLOSED').toBe('false');
  expect(host.getAttribute('aria-expanded'), 'MENU_HOST_TAKEOVER_NEW_OWNER_STILL_OPEN').toBe('true');
  fireEvent.keyDown(sheets[0], { key: 'Escape', code: 'Escape' });
  await waitFor(() => expect(openSheets().length).toBe(0));
  await waitFor(() => expect(document.activeElement, 'MENU_HOST_TAKEOVER_VISIBLE_FOCUS_RETURN').toBe(host));
});
