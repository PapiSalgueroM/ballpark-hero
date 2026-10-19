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
const views = [
  { surface: 'footer report', label: 'Send report', gameType: 'site', source: 'footer-report-button', success: 'Got it, thank you!', names: ['Wrong answer', 'Wrong info', 'Bug', 'Idea', 'Other'], page: () => <ReportSiteIssue /> },
  { surface: 'game report', label: 'Submit Report', gameType: 'perfect-season-nba', source: 'game-report-button', success: 'Thanks for reporting!', names: ['Wrong answer', 'Wrong info', 'Bug', 'Idea', 'Duplicate question', 'Other'], page: () => <ReportQuestion gameType="perfect-season-nba" gameContext={{ phase: 'fixture', criterion: 'category-pressed' }} /> },
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
let initialButtons: HTMLButtonElement[];
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
const snapshot = () => {
  const dialog = document.querySelector('[role="dialog"]');
  const submit = dialog?.querySelector<HTMLButtonElement>('button.w-full');
  return {
    dialog: !!dialog,
    categories: categories().map(button => ({ text: button.textContent, name: computeAccessibleName(button), tag: button.tagName, roleAttribute: button.getAttribute('role'), pressed: button.getAttribute('aria-pressed'), visual: button.classList.contains('bg-primary'), identity: identity(button), initialIdentity: initialButtons.indexOf(button), connected: button.isConnected, disabled: button.disabled, focused: document.activeElement === button })),
    focus: { tag: document.activeElement?.tagName ?? null, name: document.activeElement ? computeAccessibleName(document.activeElement) : null, identity: identity(document.activeElement) },
    details: dialog?.querySelector('textarea')?.value ?? null,
    submit: submit ? { identity: identity(submit), name: computeAccessibleName(submit), disabled: submit.disabled, text: submit.textContent, spinnerCount: submit.querySelectorAll('svg.animate-spin').length } : null,
    status: dialog?.textContent?.includes('Something went wrong. Try again.') ? 'error' : submit ? submit.disabled && submit.querySelector('svg.animate-spin') ? 'loading' : 'idle' : dialog ? 'success' : 'closed',
    relay: plain(delivery.invoke.mock.calls), inserts: plain(delivery.insert.mock.calls), pendingIO: inFlight, timers: vi.getTimerCount(), stores: stores(),
  };
};
const mark = (phase: string) => (current.phases as unknown[]).push({ phase, state: snapshot() });
const flush = async (ms = 0) => { await act(async () => { vi.advanceTimersByTime(ms); }); };
const drain = async () => { await act(async () => { pending.forEach(resolve => resolve()); }); };
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  vi.setSystemTime(new Date('2026-10-19T14:00:00.000Z'));
  window.history.replaceState({}, '', '/perfect-season-nba');
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('report-category-held-save', '{"career":"held"}');
  sessionStorage.setItem('report-category-held-session', 'held');
  vi.runOnlyPendingTimers(); expect(vi.getTimerCount()).toBe(0);
  heldStores = stores(); pending = []; inFlight = 0; identities = new WeakMap(); nextIdentity = 0; initialButtons = []; purposeError = undefined;
  delivery.invoke.mockReset().mockResolvedValue(accepted); delivery.insert.mockReset().mockResolvedValue({ error: null });
  current = { name: expect.getState().currentTestName, phases: [], beforeStores: heldStores, purposeObservations: [] };
});
afterEach(async () => {
  await drain(); current.beforeCleanup = snapshot(); cleanup(); await flush(50);
  current.afterCleanup = snapshot(); current.afterStores = stores(); cases.push(current);
  try { expect(inFlight).toBe(0); expect(vi.getTimerCount()).toBe(0); expect(stores()).toEqual(heldStores); }
  finally {
    const directory = process.env.REPORT_CATEGORY_TRACE_DIR;
    if (directory) { fs.mkdirSync(directory, { recursive: true }); fs.writeFileSync(path.join(directory, 'trace.json'), JSON.stringify({ version: 1, scope: 'report-category-pressed-state', unitClock: '2026-10-19T14:00:00.000Z with owned timer advancement', nativeKeyboardCredit: false, cases }, null, 2)); }
    vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks();
  }
});
for (const surface of views) describe(`${surface.surface} category state`, () => {
  const open = async () => {
    const view = render(surface.page()); const trigger = view.getByRole('button', { name: 'Report a problem' });
    identity(trigger); trigger.focus(); fireEvent.click(trigger); await flush();
    initialButtons = categories(); expect(initialButtons.map(button => button.textContent)).toEqual(surface.names);
    initialButtons.forEach(identity); mark('initial'); return { view, trigger };
  };
  const submit = () => {
    const button = document.querySelector<HTMLButtonElement>('[role="dialog"] button.w-full');
    expect(button).not.toBeNull(); expect(button).toHaveAccessibleName(surface.label); return button!;
  };
  const edit = (text: string) => fireEvent.change(document.querySelector('textarea')!, { target: { value: text } });
  const select = (name: string) => {
    const button = categories().find(value => value.textContent === name)!;
    expect(button).toBeDefined(); button.focus(); fireEvent.click(button);
    expect(button.isConnected).toBe(true); expect(button).toHaveClass('bg-primary'); expect(document.activeElement).toBe(button);
    expect(categories().filter(value => value.classList.contains('bg-primary'))).toEqual([button]);
    return button;
  };
  const purpose = (name: string) => {
    const buttons = categories(), selected = buttons.find(button => button.textContent === name)!;
    expect(selected).toBeDefined(); expect(selected.isConnected).toBe(true); expect(selected).toHaveClass('bg-primary');
    expect(computeAccessibleName(selected)).toBe(name); expect(selected.tagName).toBe('BUTTON');
    const observation = { selected: name, actual: selected.getAttribute('aria-pressed'), values: buttons.map(button => ({ name: button.textContent, pressed: button.getAttribute('aria-pressed') })) };
    (current.purposeObservations as unknown[]).push(observation);
    try {
      expect(selected.getAttribute('aria-pressed'), 'The actual selected category must expose native pressed state').toBe('true');
      expect(buttons.map(button => button.getAttribute('aria-pressed')), 'Only the actual selected category may be pressed').toEqual(buttons.map(button => button === selected ? 'true' : 'false'));
    } catch (error) { purposeError ??= error; }
  };
  const captured = (description: string, index = 0) => {
    const call = delivery.invoke.mock.calls[index]; expect(call[0]).toBe('report-relay');
    expect(call[1].body).toMatchObject({ game_type: surface.gameType, description, game_context: { path: '/perfect-season-nba', submittedAt: new Date().toISOString(), source: surface.source } });
    expect(Object.keys(call[1].body).sort()).toEqual(['description', 'game_context', 'game_type']);
    expect(call[1].body.game_context.diagnostics).toHaveProperty('browser');
    if (surface.gameType !== 'site') expect(call[1].body.game_context).toMatchObject({ phase: 'fixture', criterion: 'category-pressed' });
    return plain(call[1].body);
  };
  const closeReopen = async (trigger: HTMLButtonElement) => {
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' }); await flush(50);
    expect(document.querySelector('[role="dialog"]')).toBeNull(); expect(document.activeElement).toBe(trigger); mark('closed');
    fireEvent.click(trigger); await flush(); expect(document.querySelector('[role="dialog"]')).not.toBeNull(); mark('reopened');
  };
  const successReset = async (view: ReturnType<typeof render>, trigger: HTMLButtonElement) => {
    expect(view.getByText(surface.success)).toBeInTheDocument(); mark('success');
    await flush(1499); expect(view.getByRole('dialog')).toBeInTheDocument(); mark('success-1499');
    await flush(1); await flush(50); expect(document.querySelector('[role="dialog"]')).toBeNull(); expect(document.activeElement).toBe(trigger); mark('reset-closed');
    fireEvent.click(trigger); await flush(); expect(document.querySelector('textarea')).toHaveValue(''); expect(submit()).toBeDisabled();
    expect(categories().filter(button => button.classList.contains('bg-primary'))).toHaveLength(0); mark('reset-reopened');
  };
  it('keeps the initial no-category draft optional through delivery and reset', async () => {
    const { view, trigger } = await open(); expect(categories().filter(button => button.classList.contains('bg-primary'))).toHaveLength(0);
    expect(submit()).toBeDisabled(); edit('  Fictional optional report  '); expect(submit()).toBeEnabled(); mark('optional-ready');
    await act(async () => { fireEvent.click(submit()); }); captured('Fictional optional report');
    expect(delivery.invoke).toHaveBeenCalledTimes(1); expect(delivery.insert).not.toHaveBeenCalled(); await successReset(view, trigger);
  });
  it('exposes selected category through switch repeat and reopen', async () => {
    const { trigger } = await open(); const bug = select('Bug'); mark('selected-bug'); purpose('Bug');
    expect(submit()).toBeDisabled(); fireEvent.click(submit()); expect(delivery.invoke).not.toHaveBeenCalled(); expect(delivery.insert).not.toHaveBeenCalled();
    const idea = select('Idea'); expect(bug).toBe(initialButtons[surface.names.indexOf('Bug')]); mark('switched-idea'); purpose('Idea');
    expect(select('Idea')).toBe(idea); mark('repeated-idea'); purpose('Idea');
    edit('Fictional retained draft'); await closeReopen(trigger); expect(document.querySelector('textarea')).toHaveValue('Fictional retained draft');
    expect(categories().map(button => button.textContent)).toEqual(surface.names); expect(categories().find(button => button.textContent === 'Idea')).toHaveClass('bg-primary'); purpose('Idea'); mark('retained-idea');
    expect(delivery.invoke).not.toHaveBeenCalled(); expect(delivery.insert).not.toHaveBeenCalled();
    if (purposeError) throw purposeError;
  });
  it('exposes newer category through captured pending failure retry and reset', async () => {
    const relay = held(accepted), insert = held<Insert>({ error: { message: 'Fictional insert unavailable' } });
    delivery.invoke.mockImplementationOnce(relay.begin); delivery.insert.mockImplementationOnce(insert.begin);
    const { view, trigger } = await open(); select('Bug'); mark('selected-bug'); purpose('Bug');
    edit('  Fictional captured report  '); const action = submit(); await act(async () => { fireEvent.click(action); });
    const payload = captured('Bug: Fictional captured report'); expect(action).toBeDisabled(); expect(inFlight).toBe(1); mark('pending-relay');
    select('Idea'); edit('Fictional newer draft'); purpose('Idea'); expect(submit()).toBe(action); expect(action).toBeDisabled(); mark('newer-pending');
    await act(async () => { relay.resolve(rejected); }); expect(delivery.insert).toHaveBeenCalledExactlyOnceWith(payload); expect(inFlight).toBe(1); mark('pending-fallback');
    await act(async () => { insert.resolve(); }); expect(document.querySelector('textarea')).toHaveValue('Fictional newer draft');
    expect(view.queryByText('Something went wrong. Try again.')).toBeNull(); expect(submit()).toBeEnabled(); purpose('Idea'); mark('older-failure-settled');
    delivery.invoke.mockResolvedValueOnce(rejected); delivery.insert.mockResolvedValueOnce({ error: { message: 'Fictional current insert unavailable' } });
    await act(async () => { fireEvent.click(submit()); }); const retryPayload = captured('Idea: Fictional newer draft', 1);
    expect(delivery.insert.mock.calls[1][0]).toEqual(retryPayload); expect(view.getByText('Something went wrong. Try again.')).toBeInTheDocument(); purpose('Idea'); mark('current-error');
    delivery.invoke.mockResolvedValueOnce(accepted); await act(async () => { fireEvent.click(submit()); }); captured('Idea: Fictional newer draft', 2);
    expect(delivery.invoke).toHaveBeenCalledTimes(3); expect(delivery.insert).toHaveBeenCalledTimes(2); expect(delivery.invoke.mock.calls[0][1].body).toEqual(payload);
    await successReset(view, trigger);
    if (purposeError) throw purposeError;
  });
});
