import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import ReportQuestion from '@/components/game/ReportQuestion';

const delivery = vi.hoisted(() => ({ invoke: vi.fn(), insert: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: delivery.invoke },
    from: () => ({ insert: delivery.insert }),
  },
}));

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('question report: hands off to the real form once and preserves its draft and visible trigger across reopen', async () => {
  render(<ReportQuestion gameType="soccer-grid" />);
  const initial = screen.getByRole('button', { name: 'Report a problem' });
  initial.focus();
  await act(async () => {
    fireEvent.click(initial);
    const actual = await import('@/components/game/ReportQuestionForm');
    expect(typeof actual.default, 'REPORT_QUESTION_FORM_HANDOFF_REAL_MODULE_FOUNDATION').toBe('function');
    await Promise.resolve();
  });
  expect(screen.queryAllByRole('dialog').length, 'REPORT_QUESTION_FORM_INITIAL_ACTIVATION_OPENS_REAL_DIALOG').toBe(1);
  const dialog = screen.getByRole('dialog', { name: 'Report a problem' });
  const current = screen.getByTitle('Report a problem');
  expect(current.tagName, 'REPORT_QUESTION_FORM_LOADED_TRIGGER_FOUNDATION').toBe('BUTTON');
  expect(current !== initial && current.isConnected && !initial.isConnected, 'REPORT_QUESTION_FORM_ONE_INITIAL_HANDOFF').toBe(true);

  fireEvent.click(screen.getByRole('button', { name: 'Bug' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Describe the problem' }), { target: { value: 'Keep these unsent fixture details.' } });
  fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
  await waitFor(() => expect(screen.queryAllByRole('dialog').length, 'REPORT_QUESTION_FORM_ESCAPE_CLOSES_REAL_FORM').toBe(0));
  await waitFor(() => expect(document.activeElement === current, 'REPORT_QUESTION_FORM_ESCAPE_CURRENT_TRIGGER_FOCUS').toBe(true));

  fireEvent.click(current);
  await screen.findByRole('dialog', { name: 'Report a problem' });
  expect(screen.getByTitle('Report a problem') === current, 'REPORT_QUESTION_FORM_LOADED_TRIGGER_STAYS_MOUNTED').toBe(true);
  expect(screen.getByRole('textbox', { name: 'Describe the problem' })).toHaveValue('Keep these unsent fixture details.');
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  await waitFor(() => expect(screen.queryAllByRole('dialog').length, 'REPORT_QUESTION_FORM_CLOSE_CONTROL_CLOSES').toBe(0));
  await waitFor(() => expect(document.activeElement === current, 'REPORT_QUESTION_FORM_CLOSE_CURRENT_TRIGGER_FOCUS').toBe(true));
  expect(delivery.invoke, 'REPORT_QUESTION_FORM_DRAFT_REOPEN_DOES_NOT_SEND').not.toHaveBeenCalled();
  expect(delivery.insert, 'REPORT_QUESTION_FORM_DRAFT_REOPEN_DOES_NOT_INSERT').not.toHaveBeenCalled();
});

it('question report: opens only once under StrictMode and stays closed after a draft rerender', async () => {
  render(<StrictMode><ReportQuestion gameType="soccer-grid" /></StrictMode>);
  fireEvent.click(screen.getByRole('button', { name: 'Report a problem' }));
  const dialog = await screen.findByRole('dialog', { name: 'Report a problem' });
  expect(screen.queryAllByRole('dialog').length, 'REPORT_QUESTION_FORM_STRICT_ONE_DIALOG').toBe(1);
  const current = screen.getByTitle('Report a problem');
  fireEvent.change(screen.getByRole('textbox', { name: 'Describe the problem' }), { target: { value: 'StrictMode fixture draft.' } });
  expect(screen.getByRole('textbox', { name: 'Describe the problem' })).toHaveValue('StrictMode fixture draft.');
  await act(async () => {
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
    await Promise.resolve();
  });
  expect(screen.queryAllByRole('dialog').length, 'REPORT_QUESTION_FORM_STRICT_CLOSE_STAYS_CLOSED').toBe(0);
  await waitFor(() => expect(document.activeElement === current, 'REPORT_QUESTION_FORM_STRICT_CURRENT_TRIGGER_FOCUS').toBe(true));
  expect(delivery.invoke, 'REPORT_QUESTION_FORM_STRICT_DOES_NOT_SEND').not.toHaveBeenCalled();
  expect(delivery.insert, 'REPORT_QUESTION_FORM_STRICT_DOES_NOT_INSERT').not.toHaveBeenCalled();
});

it('question report: unmounts a pending activation without a late dialog or report delivery', async () => {
  const view = render(<ReportQuestion gameType="soccer-grid" />);
  const trigger = screen.getByRole('button', { name: 'Report a problem' });
  fireEvent.click(trigger);
  expect(trigger.getAttribute('aria-busy'), 'REPORT_QUESTION_FORM_UNMOUNT_PENDING_FOUNDATION').toBe('true');
  view.unmount();
  await act(async () => {
    const actual = await import('@/components/game/ReportQuestionForm');
    expect(typeof actual.default, 'REPORT_QUESTION_FORM_UNMOUNT_REAL_MODULE_FOUNDATION').toBe('function');
    await Promise.resolve();
  });
  expect(screen.queryAllByRole('dialog').length, 'REPORT_QUESTION_FORM_UNMOUNT_NO_LATE_DIALOG').toBe(0);
  expect(delivery.invoke, 'REPORT_QUESTION_FORM_UNMOUNT_DOES_NOT_SEND').not.toHaveBeenCalled();
  expect(delivery.insert, 'REPORT_QUESTION_FORM_UNMOUNT_DOES_NOT_INSERT').not.toHaveBeenCalled();
});
