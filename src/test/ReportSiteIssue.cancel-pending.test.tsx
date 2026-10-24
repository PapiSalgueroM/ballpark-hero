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

it('cancels held form loads with Cancel and Escape without a late dialog', async () => {
  render(<ReportSiteIssue />);
  const trigger = screen.getByRole('button', { name: 'Report a problem' });
  trigger.focus();
  fireEvent.click(trigger);
  await waitFor(() => expect(formLoad.entered).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryAllByRole('dialog').length, 'REPORT_FORM_CANCEL_PENDING_DIALOG').toBe(0);
  expect(document.activeElement === trigger, 'REPORT_FORM_CANCEL_PENDING_FOCUS').toBe(true);

  fireEvent.click(trigger);
  expect(trigger.getAttribute('aria-busy'), 'REPORT_FORM_ESCAPE_PENDING_FOUNDATION').toBe('true');
  fireEvent.keyDown(trigger, { key: 'Escape', code: 'Escape' });
  expect(screen.queryAllByRole('button', { name: 'Cancel' }).length, 'REPORT_FORM_ESCAPE_REMOVES_PENDING').toBe(0);
  expect(document.activeElement === trigger, 'REPORT_FORM_ESCAPE_PENDING_FOCUS').toBe(true);

  await act(async () => {
    formLoad.release();
    const actual = await import('@/components/game/ReportSiteIssueForm');
    expect(typeof actual.default, 'REPORT_FORM_CANCEL_REAL_MODULE_FOUNDATION').toBe('function');
    await Promise.resolve();
  });
  expect(screen.queryAllByRole('dialog').length, 'REPORT_FORM_CANCEL_NO_LATE_DIALOG').toBe(0);
  fireEvent.click(trigger);
  expect(await screen.findByRole('dialog', { name: 'Report a problem' })).toBeVisible();
  expect(delivery.invoke, 'REPORT_FORM_CANCEL_REOPEN_DOES_NOT_SEND').not.toHaveBeenCalled();
  expect(delivery.insert, 'REPORT_FORM_CANCEL_REOPEN_DOES_NOT_INSERT').not.toHaveBeenCalled();
});
