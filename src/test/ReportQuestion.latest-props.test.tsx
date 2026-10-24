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
  supabase: { functions: { invoke: delivery.invoke }, from: () => ({ insert: delivery.insert }) },
}));
vi.mock('@/components/game/ReportQuestionForm', async importOriginal => {
  formLoad.entered();
  await formLoad.gate;
  return importOriginal<typeof import('@/components/game/ReportQuestionForm')>();
});

afterEach(() => { cleanup(); formLoad.release(); vi.restoreAllMocks(); });

it('question report: uses the latest game, context and reason list after a held import', async () => {
  delivery.invoke.mockResolvedValue({ data: { ok: true }, error: null });
  const view = render(<ReportQuestion gameType="initial-fixture" gameContext={{ fixture: 'before-load' }} kinds={['Initial reason']} />);
  fireEvent.click(screen.getByRole('button', { name: 'Report a problem' }));
  expect(screen.queryAllByRole('dialog').length, 'REPORT_QUESTION_FORM_PROPS_PENDING_FOUNDATION').toBe(0);
  await waitFor(() => expect(formLoad.entered).toHaveBeenCalledTimes(1));
  view.rerender(<ReportQuestion gameType="latest-fixture" gameContext={{ fixture: 'after-load' }} kinds={['Current reason']} />);
  await act(async () => { formLoad.release(); });
  await screen.findByRole('dialog', { name: 'Report a problem' });
  expect(screen.queryAllByRole('button', { name: 'Initial reason' }).length, 'REPORT_QUESTION_FORM_NO_STALE_REASONS').toBe(0);
  fireEvent.click(screen.getByRole('button', { name: 'Current reason' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Describe the problem' }), { target: { value: 'Latest question fixture details.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Submit Report' }));
  await waitFor(() => expect(delivery.invoke).toHaveBeenCalledTimes(1));
  expect(delivery.invoke.mock.calls[0][0]).toBe('report-relay');
  const body = delivery.invoke.mock.calls[0][1].body;
  expect(body.game_type, 'REPORT_QUESTION_FORM_LATEST_GAME').toBe('latest-fixture');
  expect(body.game_context.fixture, 'REPORT_QUESTION_FORM_LATEST_CONTEXT').toBe('after-load');
  expect(body.game_context.source).toBe('game-report-button');
  expect(body.description, 'REPORT_QUESTION_FORM_LATEST_REASON').toBe('Current reason: Latest question fixture details.');
  expect(delivery.insert, 'REPORT_QUESTION_FORM_NO_DUPLICATE_INSERT').not.toHaveBeenCalled();
});
