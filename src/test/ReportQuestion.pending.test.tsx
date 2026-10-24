import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import ReportQuestion from '@/components/game/ReportQuestion';

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
vi.mock('@/components/game/ReportQuestionForm', async importOriginal => {
  formLoad.entered();
  await formLoad.gate;
  return importOriginal<typeof import('@/components/game/ReportQuestionForm')>();
});

afterEach(() => {
  cleanup();
  formLoad.release();
  vi.restoreAllMocks();
});

it('question report: waits for the actual question form chunk before opening a report dialog', async () => {
  render(<ReportQuestion gameType="soccer-grid" />);
  const trigger = screen.getByRole('button', { name: 'Report a problem' });
  trigger.focus();
  fireEvent.click(trigger);

  expect(screen.queryAllByRole('dialog').length, 'REPORT_QUESTION_FORM_FIRST_LOAD_WAITS_FOR_CHUNK').toBe(0);
  expect(trigger.getAttribute('aria-busy'), 'REPORT_QUESTION_FORM_FIRST_LOAD_IS_PENDING').toBe('true');
  expect(screen.getByRole('status').textContent, 'REPORT_QUESTION_FORM_FIRST_LOAD_COPY').toBe('Loading report form...');
  expect(document.activeElement === trigger, 'REPORT_QUESTION_FORM_PENDING_TRIGGER_FOCUS').toBe(true);
  await waitFor(() => expect(formLoad.entered).toHaveBeenCalledTimes(1));

  await act(async () => { formLoad.release(); });
  const dialog = await screen.findByRole('dialog', { name: 'Report a problem' });
  expect(dialog, 'REPORT_QUESTION_FORM_REAL_DIALOG_AFTER_CHUNK').toBeVisible();
  expect(screen.getByRole('textbox', { name: 'Describe the problem' })).toHaveValue('');
  expect(screen.getByRole('button', { name: 'Submit Report' })).toBeDisabled();
  expect(delivery.invoke, 'REPORT_QUESTION_FORM_OPEN_DOES_NOT_SEND').not.toHaveBeenCalled();
  expect(delivery.insert, 'REPORT_QUESTION_FORM_OPEN_DOES_NOT_INSERT').not.toHaveBeenCalled();
});
