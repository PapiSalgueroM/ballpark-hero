import fs from 'node:fs';
import path from 'node:path';
import { computeAccessibleName } from 'dom-accessibility-api';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ReportSiteIssue from '@/components/game/ReportSiteIssue';
import ReportQuestion from '@/components/game/ReportQuestion';

const delivery = vi.hoisted(() => ({ invoke: vi.fn(), insert: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  functions: { invoke: delivery.invoke },
  from: (table: string) => { expect(table).toBe('question_reports'); return { insert: delivery.insert }; },
} }));

type Relay = { data: { ok: boolean } | null; error: { message: string } | null };
type Insert = { error: { message: string } | null };
const accepted: Relay = { data: { ok: true }, error: null };
const rejected: Relay = { data: null, error: { message: 'Fixture relay unavailable' } };
const views = [
  { surface: 'footer report', label: 'Send report', gameType: 'site', source: 'footer-report-button', success: 'Got it, thank you!', page: () => <ReportSiteIssue /> },
  { surface: 'game report', label: 'Submit Report', gameType: 'perfect-season-nba', source: 'game-report-button', success: 'Thanks for reporting!', page: () => <ReportQuestion gameType="perfect-season-nba" gameContext={{ phase: 'fixture', criterion: 'pending-name' }} /> },
];
const stores = () => [localStorage, sessionStorage].map(storage => Array.from({ length: storage.length }, (_, i) => storage.key(i)!).sort().map(key => [key, storage.getItem(key)]));
const plain = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const cases: Record<string, unknown>[] = [];
let current: Record<string, unknown>;
let beforeStores: ReturnType<typeof stores>;
let pending: (() => void)[];
let inFlight = 0;
let submit: HTMLButtonElement | null;

const held = <T,>(value: T) => {
  let finish!: (value: T) => void;
  let settled = false;
  let started = false;
  const promise = new Promise<T>(resolve => { finish = resolve; });
  const resolve = (next = value) => { if (!settled) { settled = true; if (started) inFlight -= 1; finish(next); } };
  pending.push(() => resolve());
  return { begin: () => { expect(started).toBe(false); started = true; if (!settled) inFlight += 1; return promise; }, resolve };
};
const snapshot = () => ({
  dialog: document.querySelector('[role="dialog"]') !== null,
  submit: submit && { connected: submit.isConnected, disabled: submit.disabled, text: submit.textContent, accessibleName: computeAccessibleName(submit), ariaLabel: submit.getAttribute('aria-label'), spinnerCount: submit.querySelectorAll('svg.animate-spin').length },
  details: document.querySelector('textarea')?.value ?? null,
  selectedKinds: [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button.rounded-full.bg-primary')].map(button => button.textContent),
  relay: plain(delivery.invoke.mock.calls), inserts: plain(delivery.insert.mock.calls),
  pendingIO: inFlight, timers: vi.getTimerCount(), stores: stores(),
});
const mark = (phase: string) => (current.phases as unknown[]).push({ phase, state: snapshot() });
const flush = async (ms = 0) => { await act(async () => { vi.advanceTimersByTime(ms); }); };
const drain = async () => { await act(async () => { pending.forEach(resolve => resolve()); }); };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  vi.setSystemTime(new Date('2026-10-18T14:00:00.000Z'));
  window.history.replaceState({}, '', '/perfect-season-nba');
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('report-pending-held-save', '{"career":"held"}');
  sessionStorage.setItem('report-pending-held-session', 'held');
  vi.runOnlyPendingTimers();
  expect(vi.getTimerCount()).toBe(0);
  beforeStores = stores(); pending = []; inFlight = 0; submit = null;
  delivery.invoke.mockReset().mockResolvedValue(accepted);
  delivery.insert.mockReset().mockResolvedValue({ error: null });
  current = { name: expect.getState().currentTestName, phases: [], beforeStores };
});
afterEach(async () => {
  await drain();
  current.beforeCleanup = snapshot();
  cleanup(); await flush(50);
  current.afterCleanup = snapshot();
  current.afterStores = stores();
  cases.push(current);
  try {
    expect(inFlight).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(stores()).toEqual(beforeStores);
  } finally {
    const directory = process.env.REPORT_PENDING_NAMES_TRACE_DIR;
    if (directory) { fs.mkdirSync(directory, { recursive: true }); fs.writeFileSync(path.join(directory, 'trace.json'), JSON.stringify({ version: 1, scope: 'report-submit-pending-names', cases }, null, 2)); }
    vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks();
  }
});

for (const surface of views) {
  describe(`${surface.surface} submit names`, () => {
    const open = async () => {
      const view = render(surface.page());
      const trigger = view.getByRole('button', { name: 'Report a problem' });
      trigger.focus(); fireEvent.click(trigger); await flush();
      const control = view.getByRole('dialog').querySelector<HTMLButtonElement>('button.w-full');
      expect(control).not.toBeNull(); submit = control!;
      return view;
    };
    const prepare = async () => {
      const view = await open();
      fireEvent.click(view.getByRole('button', { name: 'Bug' }));
      fireEvent.change(view.getByRole('textbox'), { target: { value: '  Fictional pending report details  ' } });
      expect(submit).toBeEnabled(); expect(submit).toHaveAccessibleName(surface.label);
      mark('ready'); return view;
    };
    const captured = () => {
      expect(delivery.invoke).toHaveBeenCalledTimes(1);
      expect(delivery.invoke.mock.calls[0][0]).toBe('report-relay');
      const payload = delivery.invoke.mock.calls[0][1].body;
      expect(payload).toMatchObject({ game_type: surface.gameType, description: 'Bug: Fictional pending report details', game_context: { path: '/perfect-season-nba', submittedAt: '2026-10-18T14:00:00.000Z', source: surface.source } });
      expect(payload.game_context.diagnostics).toHaveProperty('browser');
      if (surface.gameType !== 'site') expect(payload.game_context).toMatchObject({ phase: 'fixture', criterion: 'pending-name' });
      return plain(payload);
    };
    const pendingCase = async (boundary: 'relay' | 'fallback') => {
      const relay = held(accepted); const insert = boundary === 'fallback' ? held<Insert>({ error: null }) : null;
      delivery.invoke.mockImplementationOnce(relay.begin);
      if (insert) delivery.insert.mockImplementationOnce(insert.begin);
      const view = await prepare(); const originalButton = submit!;
      try {
        await act(async () => { fireEvent.click(originalButton); });
        const payload = captured();
        if (insert) { await act(async () => { relay.resolve(rejected); }); expect(delivery.insert).toHaveBeenCalledExactlyOnceWith(payload); }
        else expect(delivery.insert).not.toHaveBeenCalled();
        expect(submit).toBe(originalButton); expect(originalButton).toBeDisabled();
        expect(originalButton.isConnected).toBe(true);
        expect(originalButton.querySelectorAll('svg.animate-spin')).toHaveLength(1);
        fireEvent.click(originalButton);
        expect(delivery.invoke).toHaveBeenCalledTimes(1);
        mark(`pending-${boundary}`);
        expect(originalButton).toHaveAccessibleName(surface.label);
      } finally {
        await drain();
        expect(view.getByText(surface.success)).toBeInTheDocument();
        expect(delivery.invoke).toHaveBeenCalledTimes(1);
        if (insert) expect(delivery.insert).toHaveBeenCalledExactlyOnceWith(delivery.invoke.mock.calls[0][1].body);
        else expect(delivery.insert).not.toHaveBeenCalled();
        mark('delivery-settled');
      }
    };

    it('keeps the idle action named while empty and disabled', async () => {
      const view = await open();
      expect(submit).toHaveAccessibleName(surface.label); expect(submit).toBeDisabled(); mark('idle-empty');
      fireEvent.change(view.getByRole('textbox'), { target: { value: 'Ready' } });
      expect(submit).toHaveAccessibleName(surface.label); expect(submit).toBeEnabled(); mark('idle-filled');
      fireEvent.change(view.getByRole('textbox'), { target: { value: '   ' } });
      expect(submit).toHaveAccessibleName(surface.label); expect(submit).toBeDisabled(); mark('idle-whitespace');
      expect(delivery.invoke).not.toHaveBeenCalled(); expect(delivery.insert).not.toHaveBeenCalled();
    });
    it('keeps the action named while its captured relay is pending', () => pendingCase('relay'));
    it('keeps the action named while its captured direct fallback is pending', () => pendingCase('fallback'));
  });
}
