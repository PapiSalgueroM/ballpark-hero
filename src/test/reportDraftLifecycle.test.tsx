import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ReportQuestion from '@/components/game/ReportQuestion';
import ReportSiteIssue from '@/components/game/ReportSiteIssue';

const delivery = vi.hoisted(() => ({ invoke: vi.fn(), insert: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: delivery.invoke }, from: (table: string) => { expect(table).toBe('question_reports'); return { insert: delivery.insert }; } } }));

type RelayResult = { data: { ok: boolean } | null; error: { message: string } | null };
type InsertResult = { error: { message: string } | null };
const accepted: RelayResult = { data: { ok: true }, error: null };
const rejected: RelayResult = { data: null, error: { message: 'Fixture relay unavailable' } };
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
};
const stores = () => JSON.stringify([localStorage, sessionStorage].map(storage => (
  Array.from({ length: storage.length }, (_, i) => storage.key(i)!).sort().map(key => [key, storage.getItem(key)])
)));
let heldStores = '';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  vi.setSystemTime(new Date('2026-10-18T14:00:00.000Z'));
  window.history.replaceState({}, '', '/player-bingo');
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('report-draft-held-save', '{"career":"held"}');
  sessionStorage.setItem('report-draft-held-session', 'held');
  heldStores = stores();
  delivery.invoke.mockReset().mockResolvedValue(accepted);
  delivery.insert.mockReset().mockResolvedValue({ error: null });
});
afterEach(() => {
  cleanup();
  expect(stores(), 'Report draft handling must not change browser stores').toBe(heldStores);
  vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks();
});

const surfaces = [
  { name: 'game report', page: () => <ReportQuestion gameType="player-bingo" gameContext={{ phase: 'playing', criterion: 'fixture-1' }} />, success: 'Thanks for reporting!', gameType: 'player-bingo', source: 'game-report-button' },
  { name: 'footer report', page: () => <ReportSiteIssue />, success: 'Got it, thank you!', gameType: 'site', source: 'footer-report-button' },
];
type View = ReturnType<typeof render>;
const sendControl = (view: View) => {
  const button = view.getByRole('dialog').querySelector<HTMLButtonElement>('button.w-full');
  expect(button, 'The actual report form must expose its send control').not.toBeNull();
  return button!;
};
const edit = (view: View, text: string) => fireEvent.change(view.getByRole('textbox'), { target: { value: text } });
const category = (view: View, name: string) => fireEvent.click(view.getByRole('button', { name }));
const send = async (view: View) => { await act(async () => { fireEvent.click(sendControl(view)); }); };
const advance = async (ms: number) => { await act(async () => { vi.advanceTimersByTime(ms); }); };
const close = async (view: View) => {
  await act(async () => { fireEvent.click(view.getByRole('button', { name: 'Close' })); });
  await advance(50);
  expect(view.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(view.getByRole('button', { name: 'Report a problem' }));
};
const reopen = (view: View) => {
  fireEvent.click(view.getByRole('button', { name: 'Report a problem' }));
  expect(view.getByRole('dialog')).toBeInTheDocument();
};
const draft = (view: View, text: string, kind: string) => {
  expect(view.queryByRole('textbox'), 'The current report draft must remain visible').not.toBeNull();
  expect(view.getByRole('textbox')).toHaveValue(text);
  expect(view.getByRole('button', { name: kind })).toHaveClass('bg-primary');
};
const busy = async (view: View) => {
  expect(sendControl(view)).toBeDisabled();
  await send(view);
  expect(delivery.invoke).toHaveBeenCalledTimes(1);
};
const captured = (surface: typeof surfaces[number], description: string, index = 0) => {
  const body = delivery.invoke.mock.calls[index][1].body;
  expect(delivery.invoke.mock.calls[index][0]).toBe('report-relay');
  expect(body).toMatchObject({ game_type: surface.gameType, description, game_context: { path: '/player-bingo', source: surface.source, submittedAt: new Date().toISOString() } });
  expect(body.game_context.diagnostics).toHaveProperty('browser');
  if (surface.gameType !== 'site') expect(body.game_context).toMatchObject({ phase: 'playing', criterion: 'fixture-1' });
  return JSON.parse(JSON.stringify(body));
};

for (const surface of surfaces) {
  describe(`${surface.name} draft lifecycle`, () => {
    const open = () => {
      const view = render(surface.page());
      const trigger = view.getByRole('button', { name: 'Report a problem' });
      trigger.focus(); fireEvent.click(trigger);
      category(view, 'Bug'); edit(view, '  Submitted details  ');
      return view;
    };

    it('keeps a details-only edit after an older relay succeeds', async () => {
      const relay = deferred<RelayResult>(); delivery.invoke.mockReturnValueOnce(relay.promise);
      const view = open(); await send(view); const payload = captured(surface, 'Bug: Submitted details');
      edit(view, 'New unsent details'); await busy(view);
      await act(async () => { relay.resolve(accepted); });
      draft(view, 'New unsent details', 'Bug');
      await advance(1500); draft(view, 'New unsent details', 'Bug');
      expect(sendControl(view)).toBeEnabled(); expect(delivery.insert).not.toHaveBeenCalled();
      expect(delivery.invoke.mock.calls[0][1].body).toEqual(payload);
    });

    it('keeps a category-only edit after an older relay succeeds', async () => {
      const relay = deferred<RelayResult>(); delivery.invoke.mockReturnValueOnce(relay.promise);
      const view = open(); await send(view); captured(surface, 'Bug: Submitted details');
      category(view, 'Idea'); await busy(view);
      await act(async () => { relay.resolve(accepted); });
      draft(view, '  Submitted details  ', 'Idea');
      await advance(1500); draft(view, '  Submitted details  ', 'Idea');
      expect(sendControl(view)).toBeEnabled(); expect(delivery.insert).not.toHaveBeenCalled();
    });

    it('keeps a reopened pending draft without any edit after its older relay succeeds', async () => {
      const relay = deferred<RelayResult>(); delivery.invoke.mockReturnValueOnce(relay.promise);
      const view = open(); await send(view); captured(surface, 'Bug: Submitted details');
      await close(view); reopen(view); draft(view, '  Submitted details  ', 'Bug'); await busy(view);
      await act(async () => { relay.resolve(accepted); });
      draft(view, '  Submitted details  ', 'Bug');
      await advance(1500); draft(view, '  Submitted details  ', 'Bug');
      expect(sendControl(view)).toBeEnabled(); expect(delivery.insert).not.toHaveBeenCalled();
    });

    it('keeps a reopened edited draft after the captured direct fallback succeeds', async () => {
      const insert = deferred<InsertResult>();
      delivery.invoke.mockResolvedValueOnce(rejected); delivery.insert.mockReturnValueOnce(insert.promise);
      const view = open(); await send(view); const payload = captured(surface, 'Bug: Submitted details');
      expect(delivery.insert).toHaveBeenCalledExactlyOnceWith(payload);
      await close(view); reopen(view); edit(view, 'New fallback draft'); category(view, 'Idea'); await busy(view);
      await act(async () => { insert.resolve({ error: null }); });
      draft(view, 'New fallback draft', 'Idea');
      await advance(1500); draft(view, 'New fallback draft', 'Idea');
      expect(sendControl(view)).toBeEnabled(); expect(delivery.insert).toHaveBeenCalledExactlyOnceWith(payload);
    });

    it('keeps a new opening and draft when the older success timer expires', async () => {
      const view = open(); await send(view); captured(surface, 'Bug: Submitted details');
      expect(view.getByText(surface.success)).toBeInTheDocument(); await advance(500);
      await close(view); reopen(view);
      expect(view.queryByRole('textbox'), 'A reopened report session must show its draft form').not.toBeNull();
      edit(view, 'Draft after delivered report'); category(view, 'Idea');
      await advance(1000); draft(view, 'Draft after delivered report', 'Idea');
      expect(sendControl(view)).toBeEnabled(); expect(delivery.invoke).toHaveBeenCalledTimes(1);
    });

    it('keeps a newer session free of the older error and sends its current retry', async () => {
      const relay = deferred<RelayResult>(); const insert = deferred<InsertResult>();
      delivery.invoke.mockReturnValueOnce(relay.promise); delivery.insert.mockReturnValueOnce(insert.promise);
      const view = open(); await send(view); const payload = captured(surface, 'Bug: Submitted details');
      await close(view); reopen(view); edit(view, 'Current retry details'); category(view, 'Idea'); await busy(view);
      await act(async () => { relay.resolve(rejected); });
      expect(delivery.insert).toHaveBeenCalledExactlyOnceWith(payload); expect(sendControl(view)).toBeDisabled();
      await act(async () => { insert.resolve({ error: { message: 'Fixture insert unavailable' } }); });
      draft(view, 'Current retry details', 'Idea');
      expect(view.queryByText('Something went wrong. Try again.'), 'An older request must not put an error on the current session').toBeNull();
      expect(sendControl(view)).toBeEnabled(); await send(view);
      captured(surface, 'Idea: Current retry details', 1);
      expect(delivery.invoke).toHaveBeenCalledTimes(2); expect(delivery.insert).toHaveBeenCalledTimes(1);
      expect(view.getByText(surface.success)).toBeInTheDocument();
    });

    it('closes an unchanged successful draft at 1500ms and restores blank form and focus', async () => {
      const view = open(); await send(view); captured(surface, 'Bug: Submitted details');
      expect(view.getByText(surface.success)).toBeInTheDocument();
      await advance(1499); expect(view.getByRole('dialog')).toBeInTheDocument(); expect(view.getByText(surface.success)).toBeInTheDocument();
      await advance(1); expect(view.queryByRole('dialog')).toBeNull(); await advance(50);
      expect(document.activeElement).toBe(view.getByRole('button', { name: 'Report a problem' }));
      reopen(view); expect(view.getByRole('textbox')).toHaveValue(''); expect(sendControl(view)).toBeDisabled();
      expect(view.getByRole('button', { name: 'Bug' })).not.toHaveClass('bg-primary');
      expect(delivery.invoke).toHaveBeenCalledTimes(1); expect(delivery.insert).not.toHaveBeenCalled();
    });
  });
}
