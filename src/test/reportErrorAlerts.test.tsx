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
const rejected: Relay = { data: null, error: { message: 'Fictional relay unavailable' } };
const insertFailure: Insert = { error: { message: 'Fictional fallback unavailable' } };
const ERROR = 'Something went wrong. Try again.';
const views = [
  { surface: 'footer report', label: 'Send report', gameType: 'site', source: 'footer-report-button', success: 'Got it, thank you!', page: () => <ReportSiteIssue /> },
  { surface: 'game report', label: 'Submit Report', gameType: 'perfect-season-nba', source: 'game-report-button', success: 'Thanks for reporting!', page: () => <ReportQuestion gameType="perfect-season-nba" gameContext={{ phase: 'fixture', criterion: 'report-error-alert' }} /> },
];
const stores = () => [localStorage, sessionStorage].map(storage => Array.from({ length: storage.length }, (_, i) => storage.key(i)!).sort().map(key => [key, storage.getItem(key)]));
const plain = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const cases: Record<string, unknown>[] = [];
let current: Record<string, unknown>;
let heldStores: ReturnType<typeof stores>;
let pending: (() => void)[];
let inFlight = 0;
let identities: WeakMap<Element, number>;
let nextIdentity = 0;
let purposeError: unknown;
const identity = (element: Element | null) => {
  if (!element) return null;
  if (!identities.has(element)) identities.set(element, ++nextIdentity);
  return identities.get(element)!;
};
const held = <T,>(value: T) => {
  let finish!: (next: T) => void;
  let started = false, settled = false;
  const promise = new Promise<T>(resolve => { finish = resolve; });
  const resolve = (next = value) => { if (!settled) { settled = true; if (started) inFlight -= 1; finish(next); } };
  pending.push(() => resolve());
  return { begin: () => { expect(started).toBe(false); started = true; if (!settled) inFlight += 1; return promise; }, resolve };
};
const categories = () => [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button.rounded-full')];
const errorNode = () => [...document.querySelectorAll<HTMLParagraphElement>('[role="dialog"] p')].find(node => node.textContent === ERROR) ?? null;
const snapshot = () => {
  const dialog = document.querySelector('[role="dialog"]'), submit = dialog?.querySelector<HTMLButtonElement>('button.w-full'), error = errorNode();
  return {
    dialog: !!dialog, details: dialog?.querySelector('textarea')?.value ?? null,
    categories: categories().map(button => ({ text: button.textContent, pressed: button.getAttribute('aria-pressed'), visual: button.classList.contains('bg-primary'), identity: identity(button), disabled: button.disabled })),
    error: error ? { text: error.textContent, tag: error.tagName, role: error.getAttribute('role'), identity: identity(error), connected: error.isConnected, className: error.className } : null,
    alerts: dialog?.querySelectorAll('[role="alert"]').length ?? 0, statuses: dialog?.querySelectorAll('[role="status"]').length ?? 0,
    submit: submit ? { identity: identity(submit), name: computeAccessibleName(submit), disabled: submit.disabled, spinnerCount: submit.querySelectorAll('svg.animate-spin').length } : null,
    focus: { tag: document.activeElement?.tagName ?? null, name: document.activeElement ? computeAccessibleName(document.activeElement) : null, identity: identity(document.activeElement) },
    relay: plain(delivery.invoke.mock.calls), inserts: plain(delivery.insert.mock.calls), pendingIO: inFlight, timers: vi.getTimerCount(), stores: stores(),
  };
};
const mark = (phase: string) => (current.phases as unknown[]).push({ phase, state: snapshot() });
const flush = async (ms = 0) => { await act(async () => { vi.advanceTimersByTime(ms); }); };
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] }); vi.setSystemTime(new Date('2026-10-19T14:00:00.000Z'));
  window.history.replaceState({}, '', '/perfect-season-nba'); localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('report-error-held-save', '{"career":"held"}'); sessionStorage.setItem('report-error-held-session', 'held');
  vi.runOnlyPendingTimers(); expect(vi.getTimerCount()).toBe(0);
  heldStores = stores(); pending = []; inFlight = 0; identities = new WeakMap(); nextIdentity = 0; purposeError = undefined;
  delivery.invoke.mockReset().mockResolvedValue(accepted); delivery.insert.mockReset().mockResolvedValue({ error: null });
  current = { name: expect.getState().currentTestName, phases: [], beforeStores: heldStores, purposeObservations: [] };
});
afterEach(async () => {
  await act(async () => { pending.forEach(resolve => resolve()); }); current.beforeCleanup = snapshot(); cleanup(); await flush(50);
  current.afterCleanup = snapshot(); current.afterStores = stores(); cases.push(current);
  try { expect(inFlight).toBe(0); expect(vi.getTimerCount()).toBe(0); expect(stores()).toEqual(heldStores); }
  finally {
    const directory = process.env.REPORT_ERROR_TRACE_DIR;
    if (directory) { fs.mkdirSync(directory, { recursive: true }); fs.writeFileSync(path.join(directory, 'trace.json'), JSON.stringify({ version: 1, scope: 'report-error-alerts', unitClock: '2026-10-19T14:00:00.000Z with owned timer advancement', nativeKeyboardCredit: false, cases }, null, 2)); }
    vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks();
  }
});
for (const surface of views) describe(`${surface.surface} error alerts`, () => {
  const open = async () => {
    const view = render(surface.page()), trigger = view.getByRole('button', { name: 'Report a problem' });
    identity(trigger); trigger.focus(); fireEvent.click(trigger); await flush();
    expect(errorNode()).toBeNull(); expect(view.queryByRole('alert')).toBeNull(); mark('initial'); return { view, trigger };
  };
  const submit = () => {
    const button = document.querySelector<HTMLButtonElement>('[role="dialog"] button.w-full');
    expect(button).not.toBeNull(); expect(button).toHaveAccessibleName(surface.label); return button!;
  };
  const edit = (text: string) => fireEvent.change(document.querySelector('textarea')!, { target: { value: text } });
  const select = (name: string) => {
    const button = categories().find(value => value.textContent === name)!; expect(button).toBeDefined();
    button.focus(); fireEvent.click(button); expect(button).toHaveClass('bg-primary'); expect(button).toHaveAttribute('aria-pressed', 'true'); return button;
  };
  const purpose = (view: ReturnType<typeof render>) => {
    const node = view.getByText(ERROR); expect(node.tagName).toBe('P'); expect(node).toBeVisible(); expect(node.isConnected).toBe(true);
    expect(node.className).toBe('text-xs text-destructive'); expect(node.textContent).toBe(ERROR);
    (current.purposeObservations as unknown[]).push({ text: node.textContent, tag: node.tagName, role: node.getAttribute('role'), identity: identity(node), alertCount: view.queryAllByRole('alert').length });
    try {
      expect(node.getAttribute('role'), 'The current failed report paragraph must expose native alert role').toBe('alert');
      expect(view.queryAllByRole('alert'), 'Only that actual visible error paragraph is an alert').toEqual([node]);
    } catch (error) { purposeError ??= error; }
    return node;
  };
  const captured = (description: string, index = 0) => {
    const call = delivery.invoke.mock.calls[index]; expect(call[0]).toBe('report-relay');
    expect(call[1].body).toMatchObject({ game_type: surface.gameType, description, game_context: { path: '/perfect-season-nba', submittedAt: new Date().toISOString(), source: surface.source } });
    expect(Object.keys(call[1].body).sort()).toEqual(['description', 'game_context', 'game_type']);
    expect(call[1].body.game_context.diagnostics).toHaveProperty('browser');
    if (surface.gameType !== 'site') expect(call[1].body.game_context).toMatchObject({ phase: 'fixture', criterion: 'report-error-alert' });
    return plain(call[1].body);
  };
  const closeReopen = async (trigger: HTMLElement) => {
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' }); await flush(50);
    expect(document.querySelector('[role="dialog"]')).toBeNull(); expect(document.activeElement).toBe(trigger); mark('closed');
    fireEvent.click(trigger); await flush(); expect(document.querySelector('[role="dialog"]')).not.toBeNull(); expect(errorNode()).toBeNull(); mark('reopened');
  };
  const successReset = async (view: ReturnType<typeof render>, trigger: HTMLElement) => {
    expect(view.getByText(surface.success)).toBeInTheDocument(); expect(errorNode()).toBeNull(); expect(view.queryByRole('alert')).toBeNull(); mark('success');
    await flush(1499); expect(view.getByRole('dialog')).toBeInTheDocument(); mark('success-1499');
    await flush(1); await flush(50); expect(document.querySelector('[role="dialog"]')).toBeNull(); expect(document.activeElement).toBe(trigger); mark('reset-closed');
    fireEvent.click(trigger); await flush(); expect(document.querySelector('textarea')).toHaveValue(''); expect(submit()).toBeDisabled(); expect(errorNode()).toBeNull();
    expect(categories().filter(button => button.classList.contains('bg-primary'))).toHaveLength(0); mark('reset-reopened');
  };
  it('keeps a successful optional-category draft free of error alerts through reset', async () => {
    const { view, trigger } = await open(); expect(submit()).toBeDisabled(); edit('  Fictional optional report  '); mark('optional-ready');
    await act(async () => { fireEvent.click(submit()); }); captured('Fictional optional report');
    expect(delivery.invoke).toHaveBeenCalledTimes(1); expect(delivery.insert).not.toHaveBeenCalled(); await successReset(view, trigger);
  });
  it('exposes the current async failure while no-op choice holds and editing enables retry', async () => {
    const relay = held(rejected), fallback = held(insertFailure); delivery.invoke.mockImplementationOnce(relay.begin); delivery.insert.mockImplementationOnce(fallback.begin);
    const { view, trigger } = await open(); select('Bug'); edit('  Fictional current report  '); const action = submit();
    await act(async () => { fireEvent.click(action); }); const payload = captured('Bug: Fictional current report'); expect(action).toBeDisabled(); expect(errorNode()).toBeNull(); mark('pending-relay');
    await act(async () => { relay.resolve(); }); expect(delivery.insert).toHaveBeenCalledExactlyOnceWith(payload); expect(inFlight).toBe(1); expect(errorNode()).toBeNull(); mark('pending-fallback');
    await act(async () => { fallback.resolve(); }); expect(submit()).toBe(action); expect(action).toBeEnabled(); expect(document.querySelector('textarea')).toHaveValue('  Fictional current report  ');
    const node = purpose(view); mark('current-error'); select('Bug'); expect(errorNode()).toBe(node); expect(purpose(view)).toBe(node); mark('same-error-after-repeat');
    select('Idea'); edit('Fictional revised report'); expect(errorNode()).toBeNull(); expect(view.queryByRole('alert')).toBeNull(); expect(submit()).toBeEnabled(); mark('edited-error-cleared');
    await act(async () => { fireEvent.click(submit()); }); captured('Idea: Fictional revised report', 1);
    expect(delivery.invoke).toHaveBeenCalledTimes(2); expect(delivery.insert).toHaveBeenCalledTimes(1); expect(delivery.invoke.mock.calls[0][1].body).toEqual(payload);
    await successReset(view, trigger); if (purposeError) throw purposeError;
  });
  it('ignores stale failure then exposes the newer failure before close reopen and retry', async () => {
    const relay = held(rejected), fallback = held(insertFailure); delivery.invoke.mockImplementationOnce(relay.begin); delivery.insert.mockImplementationOnce(fallback.begin);
    const { view, trigger } = await open(); select('Bug'); edit('Fictional captured report');
    await act(async () => { fireEvent.click(submit()); }); const oldPayload = captured('Bug: Fictional captured report'); mark('older-pending');
    select('Idea'); edit('Fictional newer report'); await closeReopen(trigger); expect(document.querySelector('textarea')).toHaveValue('Fictional newer report'); expect(submit()).toBeDisabled(); mark('newer-reopened-pending');
    await act(async () => { relay.resolve(); }); expect(delivery.insert).toHaveBeenCalledExactlyOnceWith(oldPayload); mark('older-fallback');
    await act(async () => { fallback.resolve(); }); expect(errorNode()).toBeNull(); expect(submit()).toBeEnabled(); expect(document.querySelector('textarea')).toHaveValue('Fictional newer report'); mark('stale-failure-ignored');
    delivery.invoke.mockResolvedValueOnce(rejected); delivery.insert.mockResolvedValueOnce(insertFailure);
    await act(async () => { fireEvent.click(submit()); }); const newerPayload = captured('Idea: Fictional newer report', 1); expect(delivery.insert.mock.calls[1][0]).toEqual(newerPayload);
    const node = purpose(view); mark('newer-current-error'); select('Idea'); expect(errorNode()).toBe(node); expect(purpose(view)).toBe(node); mark('same-newer-error-after-repeat');
    await closeReopen(trigger); expect(errorNode()).toBeNull(); expect(document.querySelector('textarea')).toHaveValue('Fictional newer report'); expect(submit()).toBeEnabled(); mark('reopened-error-cleared');
    await act(async () => { fireEvent.click(submit()); }); captured('Idea: Fictional newer report', 2);
    expect(delivery.invoke).toHaveBeenCalledTimes(3); expect(delivery.insert).toHaveBeenCalledTimes(2); expect(delivery.invoke.mock.calls[0][1].body).toEqual(oldPayload);
    await successReset(view, trigger); if (purposeError) throw purposeError;
  });
});
