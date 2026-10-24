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

it('cancels an actually fulfilled form import before React publishes its queued form', async () => {
  render(<ReportSiteIssue />);
  const trigger = screen.getByRole('button', { name: 'Report a problem' });
  trigger.focus();
  fireEvent.click(trigger);
  expect(screen.queryAllByRole('dialog').length, 'REPORT_FORM_QUEUED_PENDING_FOUNDATION').toBe(0);
  const cancel = screen.getByRole('button', { name: 'Cancel' });
  await waitFor(() => expect(formLoad.entered).toHaveBeenCalledTimes(1));

  await act(async () => {
    formLoad.release();
    const actual = await import('@/components/game/ReportSiteIssueForm');
    expect(typeof actual.default, 'REPORT_FORM_QUEUED_REAL_MODULE_FOUNDATION').toBe('function');
    await Promise.resolve();
    expect(cancel.isConnected, 'REPORT_FORM_QUEUED_OLD_CANCEL_STILL_CONNECTED').toBe(true);
    fireEvent.click(cancel);
  });

  expect(screen.queryAllByRole('dialog').length, 'REPORT_FORM_CANCEL_QUEUED_SUCCESS').toBe(0);
  expect(screen.queryAllByRole('button', { name: 'Cancel' }).length).toBe(0);
  expect(document.activeElement === trigger, 'REPORT_FORM_QUEUED_CANCEL_FOCUS').toBe(true);
  expect(delivery.invoke, 'REPORT_FORM_QUEUED_CANCEL_DOES_NOT_SEND').not.toHaveBeenCalled();
  expect(delivery.insert, 'REPORT_FORM_QUEUED_CANCEL_DOES_NOT_INSERT').not.toHaveBeenCalled();
});
