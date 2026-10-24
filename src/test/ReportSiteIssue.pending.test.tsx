import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import ReportSiteIssue from '@/components/game/ReportSiteIssue';

const formLoad = vi.hoisted(() => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  return { gate, release, entered: vi.fn() };
});
const delivery = vi.hoisted(() => ({ invoke: vi.fn(), insert: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: delivery.invoke },
    from: () => ({ insert: delivery.insert }),
  },
}));
vi.mock('@/components/game/ReportSiteIssueForm', async importOriginal => {
  formLoad.entered();
  await formLoad.gate;
  return importOriginal<typeof import('@/components/game/ReportSiteIssueForm')>();
});

afterEach(() => {
  cleanup();
  formLoad.release();
  vi.restoreAllMocks();
});

it('waits for the actual footer form chunk before opening a report dialog', async () => {
  render(<ReportSiteIssue />);
  const trigger = screen.getByRole('button', { name: 'Report a problem' });
  trigger.focus();
  fireEvent.click(trigger);

  expect(screen.queryAllByRole('dialog').length, 'REPORT_FORM_FIRST_LOAD_WAITS_FOR_CHUNK').toBe(0);
  expect(trigger.getAttribute('aria-busy'), 'REPORT_FORM_FIRST_LOAD_IS_PENDING').toBe('true');
  expect(screen.getByRole('status').textContent, 'REPORT_FORM_FIRST_LOAD_COPY').toBe('Loading report form...');
  expect(document.activeElement === trigger, 'REPORT_FORM_PENDING_TRIGGER_FOCUS').toBe(true);
  await waitFor(() => expect(formLoad.entered).toHaveBeenCalledTimes(1));

  await act(async () => { formLoad.release(); });
  const dialog = await screen.findByRole('dialog', { name: 'Report a problem' });
  expect(dialog, 'REPORT_FORM_REAL_DIALOG_AFTER_CHUNK').toBeVisible();
  expect(screen.getByRole('textbox', { name: 'Describe the problem' })).toHaveValue('');
  expect(screen.getByRole('button', { name: 'Send report' })).toBeDisabled();
  expect(delivery.invoke, 'REPORT_FORM_OPEN_DOES_NOT_SEND').not.toHaveBeenCalled();
  expect(delivery.insert, 'REPORT_FORM_OPEN_DOES_NOT_INSERT').not.toHaveBeenCalled();
});
