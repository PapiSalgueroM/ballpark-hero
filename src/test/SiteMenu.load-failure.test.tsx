import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const failedPanel = vi.hoisted(() => ({ requests: 0 }));

vi.mock('@/components/layout/SiteMenuPanel', async () => {
  failedPanel.requests += 1;
  throw new Error('SITE_MENU_TEST_MODULE_LOAD_FAILURE');
});

import { SiteMenu } from '@/components/layout/SiteMenu';

afterEach(() => {
  cleanup();
  vi.doUnmock('@/components/layout/SiteMenuPanel');
});

// Added after production v1. Only the module-load boundary throws; the launcher/router are real.
it('shows truthful load failure with Search and Cancel, returns focus and never opens a dialog', async () => {
  render(<MemoryRouter initialEntries={['/soccer']}><SiteMenu /></MemoryRouter>);
  const trigger = screen.getByRole('button', { name: 'Open site menu' });
  trigger.focus();
  fireEvent.click(trigger);
  const alert = await screen.findByRole('alert');
  expect(alert, 'SITE_MENU_IMPORT_FAILURE_DISCLOSED')
    .toHaveTextContent('Menu could not load. Use Search Games, or refresh to try again.');
  const region = screen.getByRole('region', { name: 'Site menu loading' });
  expect(within(region).getByRole('link', { name: 'Search Games' }), 'SITE_MENU_IMPORT_FAILURE_SEARCH_EXIT')
    .toHaveAttribute('href', '/search');
  expect(screen.queryByRole('dialog', { name: 'Menu' }), 'SITE_MENU_IMPORT_FAILURE_NO_DIALOG').not.toBeInTheDocument();
  expect(trigger, 'SITE_MENU_IMPORT_FAILURE_NOT_BUSY').not.toHaveAttribute('aria-busy');
  expect(failedPanel.requests, 'SITE_MENU_IMPORT_FAILURE_BOUNDARY_USED').toBe(1);

  fireEvent.click(within(region).getByRole('button', { name: 'Cancel' }));
  await waitFor(() => expect(screen.queryByRole('alert'), 'SITE_MENU_IMPORT_FAILURE_CANCELLED').not.toBeInTheDocument());
  expect(trigger, 'SITE_MENU_IMPORT_FAILURE_FOCUS_RETURN').toHaveFocus();
  expect(trigger, 'SITE_MENU_IMPORT_FAILURE_CLOSED').toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('dialog', { name: 'Menu' }), 'SITE_MENU_IMPORT_FAILURE_STAYS_NONMODAL').not.toBeInTheDocument();

  fireEvent.click(trigger);
  await screen.findByRole('alert');
  expect(failedPanel.requests, 'SITE_MENU_IMPORT_FAILURE_NO_AUTOMATIC_RETRY').toBe(1);
  expect(screen.queryByRole('dialog', { name: 'Menu' }), 'SITE_MENU_IMPORT_FAILURE_REOPEN_NO_DIALOG').not.toBeInTheDocument();
});
