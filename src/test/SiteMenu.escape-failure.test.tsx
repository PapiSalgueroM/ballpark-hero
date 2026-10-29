import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const failedPanel = vi.hoisted(() => ({ requests: 0 }));

vi.mock('@/components/layout/SiteMenuPanel', async () => {
  failedPanel.requests += 1;
  throw new Error('SITE_MENU_ESCAPE_TEST_PANEL_IMPORT_FAILURE');
});

import { SiteMenu } from '@/components/layout/SiteMenu';

afterEach(() => {
  cleanup();
  vi.doUnmock('@/components/layout/SiteMenuPanel');
});

it('dismisses an honest menu load failure with Escape from the trigger and each fallback control, without an automatic retry', async () => {
  render(<MemoryRouter initialEntries={['/soccer']}><SiteMenu /></MemoryRouter>);
  const trigger = screen.getByRole('button', { name: 'Open site menu' });

  const failed = async () => {
    trigger.focus();
    fireEvent.click(trigger);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent, 'SITE_MENU_ESCAPE_HONEST_FAILURE').toBe('Menu could not load. Use Search Games, or refresh to try again.');
    expect(failedPanel.requests, 'SITE_MENU_ESCAPE_ONE_FAILED_IMPORT').toBe(1);
    expect(trigger.hasAttribute('aria-busy'), 'SITE_MENU_ESCAPE_FAILURE_NOT_BUSY').toBe(false);
    expect(screen.queryByRole('dialog', { name: 'Menu' }), 'SITE_MENU_ESCAPE_FAILURE_NOT_DIALOG').toBeNull();
    return screen.getByRole('region', { name: 'Site menu loading' });
  };
  const closed = async (marker: string) => {
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Site menu loading' }), marker).toBeNull());
    expect(screen.queryByRole('alert'), marker + '_NO_ALERT').toBeNull();
    expect(trigger.getAttribute('aria-expanded'), marker + '_STATE').toBe('false');
    expect(document.activeElement, marker + '_FOCUS').toBe(trigger);
    expect(failedPanel.requests, marker + '_NO_RETRY').toBe(1);
    expect(screen.queryByRole('dialog', { name: 'Menu' }), marker + '_NO_DIALOG').toBeNull();
  };

  const first = await failed();
  fireEvent.keyDown(trigger, { key: 'ArrowDown', code: 'ArrowDown' });
  expect(screen.queryByRole('region', { name: 'Site menu loading' }), 'SITE_MENU_FAILURE_NON_ESCAPE_PRESERVED').toBe(first);
  fireEvent.keyDown(trigger, { key: 'Escape', code: 'Escape' });
  await closed('SITE_MENU_FAILURE_ESCAPE_TRIGGER_CLOSED');

  const second = await failed();
  const cancel = within(second).getByRole('button', { name: 'Cancel' });
  cancel.focus();
  fireEvent.keyDown(cancel, { key: 'Escape', code: 'Escape' });
  await closed('SITE_MENU_FAILURE_ESCAPE_CANCEL_CLOSED');

  const third = await failed();
  const search = within(third).getByRole('link', { name: 'Search Games' });
  expect(search.getAttribute('href'), 'SITE_MENU_FAILURE_ESCAPE_SEARCH_TARGET').toBe('/search');
  search.focus();
  fireEvent.keyDown(search, { key: 'Escape', code: 'Escape' });
  await closed('SITE_MENU_FAILURE_ESCAPE_SEARCH_CLOSED');

  const fourth = await failed();
  fireEvent.click(within(fourth).getByRole('button', { name: 'Cancel' }));
  await closed('SITE_MENU_FAILURE_CANCEL_PRESERVED');
});
