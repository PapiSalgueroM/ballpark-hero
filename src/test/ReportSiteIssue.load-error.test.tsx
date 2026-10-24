import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import ReportSiteIssue from '@/components/game/ReportSiteIssue';

const delivery = vi.hoisted(() => ({ invoke: vi.fn(), insert: vi.fn() }));
const onlineDescriptor = Object.getOwnPropertyDescriptor(navigator, 'onLine');
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: delivery.invoke },
    from: () => ({ insert: delivery.insert }),
  },
}));
vi.mock('@/components/game/ReportSiteIssueForm', () => {
  throw new Error('Failed to fetch dynamically imported module: report-form-test-fixture');
});

afterEach(() => {
  cleanup();
  if (onlineDescriptor) Object.defineProperty(navigator, 'onLine', onlineDescriptor);
  else Reflect.deleteProperty(navigator, 'onLine');
  vi.restoreAllMocks();
});

it('shows a truthful load error and preserves the page when explicit refresh is refused', async () => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
  render(<ReportSiteIssue />);
  const trigger = screen.getByRole('button', { name: 'Report a problem' });
  trigger.focus();
  fireEvent.click(trigger);
  const alert = await screen.findByRole('alert');
  expect(alert.textContent, 'REPORT_FORM_ACTUAL_LOAD_ERROR').toBe('The report form could not load. Refresh the page to try again.');
  expect(screen.queryAllByRole('dialog').length, 'REPORT_FORM_LOAD_ERROR_NO_DIALOG').toBe(0);
  fireEvent.click(screen.getByRole('button', { name: 'Refresh page' }));
  expect(screen.getByRole('alert').textContent, 'REPORT_FORM_REFRESH_REFUSAL_IS_VISIBLE').toBe('The page could not refresh. Check your connection and any waiting save, then try again.');

  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryAllByRole('alert').length, 'REPORT_FORM_ERROR_CANCEL_CLEARS_FALLBACK').toBe(0);
  expect(document.activeElement === trigger, 'REPORT_FORM_ERROR_CANCEL_FOCUS').toBe(true);
  fireEvent.click(trigger);
  await screen.findByRole('alert');
  fireEvent.keyDown(trigger, { key: 'Escape', code: 'Escape' });
  await waitFor(() => expect(screen.queryAllByRole('alert').length, 'REPORT_FORM_ERROR_ESCAPE_CLEARS_FALLBACK').toBe(0));
  expect(document.activeElement === trigger, 'REPORT_FORM_ERROR_ESCAPE_FOCUS').toBe(true);
  expect(delivery.invoke, 'REPORT_FORM_LOAD_ERROR_DOES_NOT_SEND').not.toHaveBeenCalled();
  expect(delivery.insert, 'REPORT_FORM_LOAD_ERROR_DOES_NOT_INSERT').not.toHaveBeenCalled();
});
