import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ReportQuestion from '@/components/game/ReportQuestion';
import ReportSiteIssue from '@/components/game/ReportSiteIssue';

const delivery = vi.hoisted(() => ({ invoke: vi.fn(), insert: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: delivery.invoke }, from: (table: string) => { expect(table).toBe('question_reports'); return { insert: delivery.insert }; } } }));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  vi.setSystemTime(new Date('2026-10-12T02:00:00.000Z'));
  window.history.replaceState({}, '', '/player-bingo');
  delivery.invoke.mockReset().mockResolvedValue({ data: { ok: true }, error: null });
  delivery.insert.mockReset().mockResolvedValue({ error: null });
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });

const surfaces = [
  { name: 'game report', page: () => <ReportQuestion gameType="player-bingo" gameContext={{ phase: 'playing', player: 'Fixture Player', criterion: 'fixture-1' }} />, submit: 'Submit Report', success: 'Thanks for reporting!', gameType: 'player-bingo', source: 'game-report-button' },
  { name: 'footer report', page: () => <ReportSiteIssue />, submit: 'Send report', success: 'Got it, thank you!', gameType: 'site', source: 'footer-report-button' },
];

for (const surface of surfaces) {
  describe(surface.name, () => {
    const open = () => {
      const view = render(surface.page());
      fireEvent.click(view.getByRole('button', { name: 'Report a problem' }));
      return view;
    };
    const send = async (view: ReturnType<typeof render>) => {
      await act(async () => { fireEvent.click(view.getByRole('button', { name: surface.submit })); });
    };

    it('cannot send a category without an actual typed description', async () => {
      const view = open(); fireEvent.click(view.getByRole('button', { name: 'Bug' }));
      expect(view.getByRole('button', { name: surface.submit })).toBeDisabled();
      await send(view);
      expect(delivery.invoke).not.toHaveBeenCalled(); expect(delivery.insert).not.toHaveBeenCalled();
    });

    it('rejects whitespace and permits short real details without an arbitrary length gate', async () => {
      const view = open(); fireEvent.change(view.getByRole('textbox'), { target: { value: '   \n ' } });
      expect(view.getByRole('button', { name: surface.submit })).toBeDisabled();
      fireEvent.change(view.getByRole('textbox'), { target: { value: ' Stuck ' } });
      expect(view.getByRole('button', { name: surface.submit })).toBeEnabled(); await send(view);
      expect(delivery.invoke).toHaveBeenCalledExactlyOnceWith('report-relay', { body: expect.objectContaining({ game_type: surface.gameType, description: 'Stuck' }) });
      expect(delivery.insert).not.toHaveBeenCalled(); expect(view.getByText(surface.success)).toBeInTheDocument();
    });

    it('sends trimmed details and shared diagnostics with the category', async () => {
      const view = open(); fireEvent.click(view.getByRole('button', { name: 'Bug' }));
      fireEvent.change(view.getByRole('textbox'), { target: { value: '  The tile rejected my player after I tapped it.  ' } }); await send(view);
      const payload = delivery.invoke.mock.calls[0][1].body;
      expect(payload).toMatchObject({ game_type: surface.gameType, description: 'Bug: The tile rejected my player after I tapped it.', game_context: { path: '/player-bingo', date: '2026-10-11', submittedAt: '2026-10-12T02:00:00.000Z', source: surface.source } });
      expect(payload.game_context.diagnostics).toHaveProperty('browser');
      if (surface.name === 'game report') expect(payload.game_context).toMatchObject({ phase: 'playing', player: 'Fixture Player', criterion: 'fixture-1' });
      expect(JSON.stringify(payload.game_context).length).toBeLessThan(1500);
    });

    it.each(['function error', 'negative response', 'thrown request'])('uses the same complete payload for direct fallback after %s', async failure => {
      if (failure === 'function error') delivery.invoke.mockResolvedValue({ data: null, error: { message: 'Fixture relay down' } });
      else if (failure === 'negative response') delivery.invoke.mockResolvedValue({ data: { ok: false }, error: null });
      else delivery.invoke.mockRejectedValue(new Error('Fixture relay unavailable'));
      const view = open(); fireEvent.change(view.getByRole('textbox'), { target: { value: 'The report route did not respond.' } }); await send(view);
      expect(delivery.insert).toHaveBeenCalledExactlyOnceWith(delivery.invoke.mock.calls[0][1].body);
      expect(view.getByText(surface.success)).toBeInTheDocument();
    });

    it('keeps typed details after both delivery paths fail, then allows a successful retry', async () => {
      delivery.invoke.mockRejectedValue(new Error('Fixture relay unavailable'));
      delivery.insert.mockResolvedValue({ error: { message: 'Fixture insert unavailable' } });
      const view = open(); fireEvent.change(view.getByRole('textbox'), { target: { value: 'My drafted player disappeared.' } }); await send(view);
      expect(view.queryByText(surface.success)).toBeNull();
      expect(view.getByText('Something went wrong. Try again.')).toBeInTheDocument();
      expect(view.getByRole('textbox')).toHaveValue('My drafted player disappeared.');
      delivery.invoke.mockResolvedValue({ data: { ok: true }, error: null }); await send(view);
      expect(delivery.invoke).toHaveBeenCalledTimes(2); expect(view.getByText(surface.success)).toBeInTheDocument();
    });

    it('keeps the send control disabled while the actual relay request is pending', async () => {
      let resolveRelay!: (value: unknown) => void;
      delivery.invoke.mockImplementation(() => new Promise(resolve => { resolveRelay = resolve; }));
      const view = open(); fireEvent.change(view.getByRole('textbox'), { target: { value: 'The board stopped responding.' } });
      const sendButton = view.getByRole('button', { name: surface.submit });
      await send(view);
      expect(delivery.invoke).toHaveBeenCalledTimes(1);
      expect(sendButton).toBeDisabled();
      await act(async () => { resolveRelay({ data: { ok: true }, error: null }); });
      expect(view.getByText(surface.success)).toBeInTheDocument();
    });
  });
}
