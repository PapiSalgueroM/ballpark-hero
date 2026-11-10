import { act, cleanup, fireEvent, render, within, type RenderResult } from '@testing-library/react';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';
import FantasyDraft from '@/pages/FantasyDraft';
import type { DraftPlayer } from '@/components/fantasy-draft/PlayerPool';

type PoolReply = {
  data: DraftPlayer[] | null;
  error: { message: string; details: string; hint: string; code: string } | null;
  count: null;
  status: number;
  statusText: string;
};
type CriteriaReply = { data: { criteria: string } | null; error: null };
type TransportRow = {
  id: number;
  kind: 'criteria' | 'players';
  startedAt: number;
  calls: { method: string; args: unknown[]; at: number }[];
  consumedAt: number | null;
  settledAt: number | null;
  response: CriteriaReply | PoolReply | null;
};
type Action = {
  name: string;
  kind: string;
  startedAt: number;
  endedAt: number | null;
  drawsBefore: number;
  drawsAfter: number | null;
  requestsBefore: number;
  requestsAfter: number | null;
  details: Record<string, unknown>;
};
type CaseKey = 'normalUser' | 'normalAi' | 'errorUser' | 'errorAi' | 'nullUser' | 'nullAi' | 'emptyUser' | 'emptyAi';
type EmptyPoolResponse = 'resolved-null' | 'resolved-empty';
type CasePacket = {
  key: CaseKey;
  title: string;
  seat: 'user' | 'ai';
  firstPoolResponse: 'success' | 'resolved-error' | EmptyPoolResponse;
  frames: Frame[];
  complete: boolean;
  error: { name: string; message: string } | null;
};

const remote = vi.hoisted(() => ({
  requests: [] as TransportRow[],
  pending: new Map<number, (reply: CriteriaReply | PoolReply) => void>(),
  unexpected: [] as { at: number; method: string; args: unknown[] }[],
  draws: [] as { at: number; value: number }[],
  randomValue: 0.1,
  completions: [] as unknown[][],
  toast: [] as unknown[],
}));
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
function refused(method: string, args: unknown[]): never {
  remote.unexpected.push({ at: Date.now(), method, args: clone(args) });
  throw new Error('Unexpected bounded fictional transport ' + method);
}
function issue(kind: TransportRow['kind'], method: string, args: unknown[]) {
  const row: TransportRow = {
    id: remote.requests.length, kind, startedAt: Date.now(),
    calls: [{ method, args: clone(args), at: Date.now() }],
    consumedAt: null, settledAt: null, response: null,
  };
  remote.requests.push(row);
  return row;
}
function waitForResponse(row: TransportRow) {
  if (row.consumedAt !== null) return refused('duplicate-query-terminal', [row.id]);
  row.consumedAt = Date.now();
  return new Promise<CriteriaReply | PoolReply>(resolve => { remote.pending.set(row.id, resolve); });
}
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => {
        if (args.length !== 1 || args[0] !== 'fantasy-draft-daily') return refused('invoke', args);
        const row = issue('criteria', 'invoke', args);
        return waitForResponse(row);
      },
    },
    from: (...args: unknown[]) => {
      if (args.length !== 1 || args[0] !== 'fantasy_draft_players') return refused('from', args);
      const row = issue('players', 'from', args);
      return {
        select: (...selectArgs: unknown[]) => {
          row.calls.push({ method: 'select', args: clone(selectArgs), at: Date.now() });
          if (selectArgs.length !== 1 || selectArgs[0] !== 'id, name, position, nationality, market_value_millions, dominant_foot, age') {
            return refused('select', selectArgs);
          }
          return {
            order: (...orderArgs: unknown[]) => {
              row.calls.push({ method: 'order', args: clone(orderArgs), at: Date.now() });
              if (orderArgs.length !== 1 || orderArgs[0] !== 'name') return refused('order', orderArgs);
              return waitForResponse(row);
            },
          };
        },
      };
    },
  },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: (value: unknown) => remote.toast.push(clone(value)) }) }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameHelp', () => ({ GameHelp: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/lib/completions', () => ({
  recordCompletion: (...args: unknown[]) => { remote.completions.push(clone(args)); },
  getCurrentPlayerName: () => 'Fixture Manager',
}));

const UNDER25 = 'Under 25s: Every player must be 25 or younger';
const VETERAN = 'Fixture Veteran FWD';
const NOW = new Date('2026-11-06T12:00:00.000Z');
const ERROR_REPLY: PoolReply = {
  data: null,
  error: { message: 'Fictional player pool temporarily unavailable', details: '', hint: '', code: 'FIXTURE_POOL_UNAVAILABLE' },
  count: null, status: 503, statusText: 'Service Unavailable',
};
function fixture(): DraftPlayer[] {
  const young = ([['GK', 4, 10], ['DEF', 8, 20], ['MID', 6, 30], ['FWD', 8, 40]] as const)
    .flatMap(([position, count, value]) => Array.from({ length: count }, (_, index) => ({
      id: 'fixture-' + position + '-' + index,
      name: 'Fixture ' + position + ' ' + String(index).padStart(2, '0'),
      position, nationality: 'Fixture Country', dominant_foot: 'Right',
      market_value_millions: value, age: 24,
    })));
  return [...young, {
    id: 'fixture-veteran', name: VETERAN, position: 'FWD',
    nationality: 'Fixture Country', dominant_foot: 'Right', market_value_millions: 900, age: 40,
  }];
}
const raw = {
  version: 1,
  scope: 'Unit clock and RNG instrumentation. Actual FantasyDraft Page, PlayerPool, DraftRoster, criteria, shortlist and ratings. Only external transport, auth, toast, completion and non-game shell boundaries are mocked. Every pool row is expressly fictional.',
  criteria: UNDER25,
  fixture: [] as DraftPlayer[],
  cases: [] as CasePacket[],
};
let view: RenderResult | null = null;
let packet: CasePacket | null = null;
let journal: Action[] = [];
let storageOps: unknown[] = [];
let failures: { kind: string; message: string }[] = [];
let pool: DraftPlayer[] = [];
let originalGetItem: Storage['getItem'];
let inspectTimers: () => unknown;
let closed = false;
const flush = async () => { await act(async () => {}); };
const pendingResponses = () => remote.requests.filter(row => row.consumedAt !== null && row.settledAt === null).length;

function stored(area: Storage) {
  return Object.fromEntries(Object.keys(area).sort().map(key => [key, originalGetItem.call(area, key)]));
}
function storage() {
  return { local: stored(localStorage), session: stored(sessionStorage) };
}
function areaName(area: Storage) {
  if (area === localStorage) return 'local';
  if (area === sessionStorage) return 'session';
  throw new Error('Unexpected Storage area');
}
function monitorStorage() {
  originalGetItem = Storage.prototype.getItem;
  const set = Storage.prototype.setItem, remove = Storage.prototype.removeItem;
  const clear = Storage.prototype.clear, keyAt = Storage.prototype.key;
  const record = (area: Storage, method: string, args: unknown[], result: unknown, before: ReturnType<typeof storage>) => {
    storageOps.push({ at: Date.now(), area: areaName(area), method, args, result, before, after: storage() });
  };
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key) {
    const before = storage(), result = originalGetItem.call(this, key);
    record(this, 'getItem', [key], result, before);
    return result;
  });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
    const before = storage(); set.call(this, key, value);
    record(this, 'setItem', [key, value], null, before);
  });
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function (this: Storage, key) {
    const before = storage(); remove.call(this, key);
    record(this, 'removeItem', [key], null, before);
  });
  vi.spyOn(Storage.prototype, 'clear').mockImplementation(function (this: Storage) {
    const before = storage(); clear.call(this);
    record(this, 'clear', [], null, before);
  });
  vi.spyOn(Storage.prototype, 'key').mockImplementation(function (this: Storage, index) {
    const before = storage(), result = keyAt.call(this, index);
    record(this, 'key', [index], result, before);
    return result;
  });
}
function buttonValue(button: HTMLButtonElement | null) {
  return button ? { present: true, text: button.textContent, disabled: button.disabled, html: button.outerHTML } : {
    present: false, text: null, disabled: null, html: null,
  };
}
function roster(side: 'Your XI' | 'AI XI') {
  if (!view) return null;
  const heading = within(view.container).queryByText(side, { exact: true });
  if (!heading) return null;
  const root = heading.parentElement!.parentElement!;
  return {
    html: root.outerHTML,
    slots: [...root.querySelectorAll<HTMLElement>('[data-draft-slot]')].map(slot => {
      const name = slot.querySelector('[title]')?.getAttribute('title') ?? null;
      const player = name ? pool.find(row => row.name === name) ?? null : null;
      return {
        index: slot.getAttribute('data-draft-slot'), pick: slot.getAttribute('data-draft-pick'),
        name, fixturePlayer: player ? { ...player } : null, html: slot.outerHTML, text: slot.textContent,
      };
    }),
  };
}
function observePage() {
  if (!view) return null;
  const q = within(view.container);
  const userTurn = q.queryByText('Your Pick', { exact: true });
  const aiTurn = q.queryByText('AI is picking...', { exact: true });
  const badge = userTurn ?? aiTurn;
  const pick = /Round (\d+) • Pick (\d+)\/(\d+)/.exec(badge?.textContent ?? '');
  const criterion = q.queryByText(UNDER25, { exact: true });
  const poolHeading = q.queryByRole('heading', { name: 'Player Pool' });
  const poolRoot = poolHeading?.parentElement?.parentElement ?? null;
  const query = poolRoot ? within(poolRoot) : null;
  const search = q.queryByRole('textbox', { name: 'Search players' }) as HTMLInputElement | null;
  const retry = q.queryAllByRole('button', { name: /retry|try again/i }) as HTMLButtonElement[];
  return {
    html: view.container.innerHTML, text: view.container.textContent,
    turn: userTurn ? 'user' : aiTurn ? 'ai' : null,
    turnHTML: badge?.outerHTML ?? null, turnText: badge?.textContent ?? null,
    round: pick ? Number(pick[1]) : null, pick: pick ? Number(pick[2]) : null, total: pick ? Number(pick[3]) : null,
    criterion: criterion?.textContent ?? null,
    criterionHTML: criterion?.outerHTML ?? null,
    start: buttonValue(q.queryByRole('button', { name: 'Start Draft' }) as HTMLButtonElement | null),
    retry: retry.map(button => buttonValue(button)),
    allButtons: [...view.container.querySelectorAll('button')].map(button => buttonValue(button)),
    formation: ['Your formation', 'AI formation'].map(name => {
      const element = q.queryByRole('status', { name });
      return { name, text: element?.textContent ?? null, html: element?.outerHTML ?? null };
    }),
    ruleStatus: q.queryByRole('status', { name: 'Daily rule' })?.outerHTML ?? null,
    rosters: { human: roster('Your XI'), ai: roster('AI XI') },
    pool: poolRoot ? {
      html: poolRoot.outerHTML, text: poolRoot.textContent,
      search: search ? { value: search.value, html: search.outerHTML } : null,
      status: query?.queryByRole('status')?.textContent ?? null,
      rows: [...poolRoot.querySelectorAll('button')].filter(button => button.querySelector('p')).map(button => {
        const name = button.querySelector('p')?.textContent ?? null;
        const player = name ? pool.find(row => row.name === name) ?? null : null;
        return {
          name, fixturePlayer: player ? { ...player } : null, disabled: button.disabled,
          title: button.getAttribute('title'), html: button.outerHTML, text: button.textContent,
        };
      }),
    } : null,
    verdicts: ['Your draft wins the season!', 'Dead level after 38 games', 'The AI drafted better', 'Draft Complete!']
      .filter(text => q.queryByText(text, { exact: true }) !== null),
  };
}
function capture(label: string): Frame {
  if (!packet) throw new Error('Capture without a case');
  const frame = {
    label, at: Date.now(), page: observePage(), storage: storage(),
    storageOps: clone(storageOps), draws: clone(remote.draws), transport: clone(remote.requests),
    pendingResponses: pendingResponses(), unexpectedTransport: clone(remote.unexpected),
    clock: { now: Date.now(), fakeTimers: vi.getTimerCount(), observations: clone(inspectTimers()) },
    actions: clone(journal), completions: clone(remote.completions), toast: clone(remote.toast),
    failures: clone(failures),
  };
  packet.frames.push(frame);
  return frame;
}
type Frame = {
  label: string;
  at: number;
  page: ReturnType<typeof observePage>;
  storage: ReturnType<typeof storage>;
  storageOps: unknown[];
  draws: { at: number; value: number }[];
  transport: TransportRow[];
  pendingResponses: number;
  unexpectedTransport: { at: number; method: string; args: unknown[] }[];
  clock: { now: number; fakeTimers: number; observations: unknown };
  actions: Action[];
  completions: unknown[][];
  toast: unknown[];
  failures: { kind: string; message: string }[];
};

async function action(name: string, kind: string, run: () => Promise<Record<string, unknown>> | Record<string, unknown>) {
  const item: Action = {
    name, kind, startedAt: Date.now(), endedAt: null,
    drawsBefore: remote.draws.length, drawsAfter: null,
    requestsBefore: remote.requests.length, requestsAfter: null, details: {},
  };
  journal.push(item);
  try { item.details = await run(); }
  finally {
    await flush(); item.endedAt = Date.now();
    item.drawsAfter = remote.draws.length; item.requestsAfter = remote.requests.length;
  }
}
async function click(name: string, buttonName: string | RegExp) {
  await action(name, 'public-button', () => {
    const matches = view ? within(view.container).queryAllByRole('button', { name: buttonName }) as HTMLButtonElement[] : [];
    const chosen = matches.length === 1 ? matches[0] : null;
    const clicked = chosen !== null && !chosen.disabled;
    const detail = { pattern: String(buttonName), matches: matches.map(button => buttonValue(button)), clicked };
    if (clicked) fireEvent.click(chosen);
    return detail;
  });
}
async function choose(name: string, playerName: string) {
  await action(name, 'public-player-pick', () => {
    const search = view ? within(view.container).queryByRole('textbox', { name: 'Search players' }) as HTMLInputElement | null : null;
    if (search) fireEvent.change(search, { target: { value: playerName } });
    const heading = view ? within(view.container).queryByRole('heading', { name: 'Player Pool' }) : null;
    const root = heading?.parentElement?.parentElement ?? null;
    const names = root ? within(root).queryAllByText(playerName, { exact: true, selector: 'p' }) : [];
    const chosen = names.length === 1 ? names[0].closest('button') : null;
    const clicked = chosen !== null && !chosen.disabled;
    const detail = { playerName, searchPresent: search !== null, matches: names.map(element => element.outerHTML), button: buttonValue(chosen), clicked };
    if (clicked) fireEvent.click(chosen);
    return detail;
  });
}
async function deliver(name: string, kind: TransportRow['kind'], ordinal: number, reply: CriteriaReply | PoolReply) {
  await action(name, 'controlled-response', async () => {
    const row = remote.requests.filter(request => request.kind === kind)[ordinal];
    const resolve = row ? remote.pending.get(row.id) : undefined;
    const delivered = !!row && !!resolve && row.settledAt === null;
    if (delivered && row && resolve) {
      row.response = clone(reply); row.settledAt = Date.now(); remote.pending.delete(row.id);
      await act(async () => { resolve!(clone(reply)); });
    }
    return { kind, ordinal, response: clone(reply), delivered, requestId: row?.id ?? null };
  });
}
async function tick(name: string, milliseconds: number) {
  await action(name, 'unit-clock', async () => {
    const before = Date.now();
    await act(async () => { vi.advanceTimersByTime(milliseconds); });
    return { milliseconds, before, after: Date.now() };
  });
}
function progress(frame: Frame) {
  const page = frame.page;
  const picked = (side: 'human' | 'ai') => page?.rosters[side]?.slots.filter(slot => slot.name !== null).map(slot => slot.name) ?? [];
  return { turn: page?.turn ?? null, round: page?.round ?? null, pick: page?.pick ?? null, total: page?.total ?? null, human: picked('human'), ai: picked('ai') };
}
async function closeCase() {
  if (closed || !packet) return;
  capture('before-teardown');
  await action('cleanup', 'harness-cleanup', async () => {
    cleanup(); view = null; await flush();
    return { mounted: false };
  });
  capture('after-teardown'); closed = true;
}
async function runCase(key: CaseKey, title: string, seat: 'user' | 'ai', failFirst: boolean | EmptyPoolResponse) {
  remote.randomValue = seat === 'user' ? 0.1 : 0.9;
  const empty = typeof failFirst === 'string' ? failFirst : null;
  packet = { key, title, seat, firstPoolResponse: empty ?? (failFirst ? 'resolved-error' : 'success'), frames: [], complete: false, error: null };
  raw.cases.push(packet);
  let beforeStart!: Frame, afterStart!: Frame, recoveryStart!: Frame, recovered!: Frame, final!: Frame;
  try {
    capture('before-mount');
    await action('mount', 'harness-mount', async () => { view = render(<FantasyDraft />); await flush(); return { mounted: true }; });
    capture('criterion-pending');
    await deliver('settle-criterion', 'criteria', 0, { data: { criteria: UNDER25 }, error: null });
    beforeStart = capture('criterion-ready');
    await click('start-draft', 'Start Draft');
    afterStart = capture('first-pool-pending');
    const success: PoolReply = { data: pool.map(row => ({ ...row })), error: null, count: null, status: 200, statusText: 'OK' };
    const reply = empty ? { ...success, data: empty === 'resolved-null' ? null : [] } : failFirst ? ERROR_REPLY : success;
    await deliver('settle-first-pool', 'players', 0, reply);
    recoveryStart = capture(empty ? 'first-pool-' + empty : failFirst ? 'first-pool-error' : 'first-pool-success');
    if (failFirst) {
      await tick('service-recovered-without-user-retry', 4000);
      capture('error-after-service-wait');
      await click('retry-player-pool', /retry|try again/i);
      capture('retry-pending');
      await click('duplicate-retry-opportunity', /retry|try again/i);
      capture('duplicate-retry-pending');
      await deliver('settle-retry-pool', 'players', 1, success);
      recovered = capture('retry-pool-settled');
    } else recovered = recoveryStart;
    if (seat === 'ai') {
      await tick('initial-ai-before-deadline', 1999);
      capture('initial-ai-before-deadline');
      await tick('initial-ai-deadline', 1);
      capture('initial-ai-picked');
    }
    await choose('over-age-pick-opportunity', VETERAN);
    capture('over-age-refused');
    await choose('first-human-pick', 'Fixture FWD 00');
    capture('first-human-picked');
    if (seat === 'ai') {
      await choose('second-human-pick', 'Fixture FWD 01');
      capture('second-human-picked');
    }
    await tick('next-ai-before-deadline', 1999);
    capture('next-ai-before-deadline');
    await tick('next-ai-deadline', 1);
    capture('next-ai-picked');
    await tick('snake-ai-before-deadline', 1999);
    capture('snake-ai-before-deadline');
    await tick('snake-ai-deadline', 1);
    final = capture('legal-progress-complete');
    packet.complete = true;
    return { beforeStart, afterStart, recoveryStart, recovered, final };
  } catch (error) {
    packet.error = { name: error instanceof Error ? error.name : typeof error, message: error instanceof Error ? error.message : String(error) };
    throw error;
  } finally { await closeCase(); }
}
function expectedProgress(seat: 'user' | 'ai') {
  return seat === 'user'
    ? { turn: 'user', round: 2, pick: 4, total: 22, human: ['Fixture FWD 00'], ai: ['Fixture FWD 01', 'Fixture FWD 02'] }
    : { turn: 'user', round: 3, pick: 6, total: 22, human: ['Fixture FWD 00', 'Fixture FWD 01'], ai: ['Fixture FWD 05', 'Fixture MID 00', 'Fixture MID 01'] };
}
function assertPreservedRun(result: Awaited<ReturnType<typeof runCase>>, seat: 'user' | 'ai', failFirst: boolean) {
  const { beforeStart, afterStart, recoveryStart, recovered, final } = result;
  expect(final.page?.criterion).toBe(UNDER25);
  expect(final.completions).toEqual([]);
  expect(final.page?.verdicts).toEqual([]);
  expect(final.unexpectedTransport).toEqual([]);
  expect(final.failures).toEqual([]);
  expect(final.pendingResponses).toBe(0);
  expect(final.storage).toEqual({ local: { 'fd-pool-unrelated': 'held' }, session: { 'fd-pool-session': 'held' } });
  expect(afterStart.draws.length - beforeStart.draws.length).toBe(1);
  expect(afterStart.draws.slice(beforeStart.draws.length).map(draw => draw.value)).toEqual([seat === 'user' ? 0.1 : 0.9]);
  expect(recovered.draws).toEqual(recoveryStart.draws);
  expect(recovered.transport.filter(row => row.kind === 'criteria')).toHaveLength(1);
  expect(recovered.transport.filter(row => row.kind === 'players')).toHaveLength(failFirst ? 2 : 1);
  expect(final.transport.every(row => row.settledAt !== null)).toBe(true);
  expect(final.page?.rosters.human?.slots.filter(slot => slot.name !== null).every(slot => slot.fixturePlayer?.age === 24)).toBe(true);
  expect(final.page?.rosters.ai?.slots.filter(slot => slot.name !== null).every(slot => slot.fixturePlayer?.age === 24)).toBe(true);
  const refusedPick = final.actions.find(item => item.name === 'over-age-pick-opportunity');
  expect(refusedPick?.details.clicked).toBe(false);
  expect((refusedPick?.details.button as ReturnType<typeof buttonValue>).disabled).toBe(true);
  const frame = (label: string) => packet!.frames.find(item => item.label === label)!;
  expect(progress(frame('next-ai-before-deadline'))).toEqual(progress(frame(seat === 'ai' ? 'second-human-picked' : 'first-human-picked')));
  expect(progress(frame('snake-ai-before-deadline'))).toEqual(progress(frame('next-ai-picked')));
  if (seat === 'ai') {
    expect(progress(frame('initial-ai-before-deadline'))).toEqual({ turn: 'ai', round: 1, pick: 1, total: 22, human: [], ai: [] });
  }
  if (failFirst) {
    expect(progress(recoveryStart)).toEqual(progress(afterStart));
    expect(progress(recovered)).toEqual(progress(afterStart));
    expect(recovered.storage).toEqual(afterStart.storage);
    expect(recovered.page?.criterion).toBe(afterStart.page?.criterion);
    expect(recoveryStart.page?.retry.filter(button => button.disabled === false)).toHaveLength(1);
    const waited = frame('error-after-service-wait');
    expect(progress(waited)).toEqual(progress(recoveryStart));
    expect(waited.transport.filter(row => row.kind === 'players')).toHaveLength(1);
    expect(waited.draws).toEqual(recoveryStart.draws);
    expect(final.actions.find(item => item.name === 'retry-player-pool')?.details.clicked).toBe(true);
    expect(final.actions.find(item => item.name === 'duplicate-retry-opportunity')?.details.clicked).toBe(false);
    expect(frame('duplicate-retry-pending').transport.filter(row => row.kind === 'players')).toHaveLength(2);
  }
  const last = packet!.frames[packet!.frames.length - 1]!;
  expect(last.label).toBe('after-teardown');
  expect(last.page).toBeNull();
  expect(last.pendingResponses).toBe(0);
  expect(last.clock.fakeTimers).toBe(0);
  expect(last.failures).toEqual([]);
}

beforeEach(async () => {
  await flush();
  cleanup(); localStorage.clear(); sessionStorage.clear();
  vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(NOW);
  view = null; packet = null; journal = []; storageOps = []; failures = []; closed = false;
  pool = fixture(); raw.fixture = pool.map(row => ({ ...row }));
  remote.requests = []; remote.pending = new Map(); remote.unexpected = []; remote.draws = [];
  remote.completions = []; remote.toast = []; remote.randomValue = 0.1;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    const value = remote.randomValue; remote.draws.push({ at: Date.now(), value }); return value;
  });
  const scheduled = vi.spyOn(window, 'setTimeout'), cleared = vi.spyOn(window, 'clearTimeout');
  inspectTimers = () => ({
    scheduled: scheduled.mock.calls.map((args, index) => ({
      handlerType: typeof args[0], delay: args[1] ?? 0, arguments: clone(args.slice(2)),
      resultType: scheduled.mock.results[index]?.type ?? null,
      id: typeof scheduled.mock.results[index]?.value === 'number' ? scheduled.mock.results[index].value as number : String(scheduled.mock.results[index]?.value),
    })),
    cleared: cleared.mock.calls.map(args => ({ id: args[0] ?? null })),
  });
  monitorStorage();
  localStorage.setItem('fd-pool-unrelated', 'held');
  sessionStorage.setItem('fd-pool-session', 'held');
  window.addEventListener('error', onWindowError);
  window.addEventListener('unhandledrejection', onWindowRejection);
});
function onWindowError(event: ErrorEvent) { failures.push({ kind: 'window-error', message: event.message }); }
function onWindowRejection(event: PromiseRejectionEvent) {
  failures.push({ kind: 'unhandled-rejection', message: event.reason instanceof Error ? event.reason.message : String(event.reason) });
}
afterEach(async () => {
  await closeCase();
  window.removeEventListener('error', onWindowError);
  window.removeEventListener('unhandledrejection', onWindowRejection);
  vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks();
  localStorage.clear(); sessionStorage.clear();
});
afterAll(() => {
  const destination = process.env.FD_POOL_RECOVERY_RAW;
  if (!destination) return;
  if (!isAbsolute(destination)) throw new Error('FD_POOL_RECOVERY_RAW must be absolute');
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, JSON.stringify(raw) + '\n', { flag: 'wx' });
});

describe('Fantasy Draft recovers its current round from a resolved player-pool error', () => {
  it('preserves ordinary user-first pool admission legal picks and the snake AI turns', async () => {
    const result = await runCase('normalUser', 'preserves ordinary user-first pool admission legal picks and the snake AI turns', 'user', false);
    expect(progress(result.final)).toEqual(expectedProgress('user'));
    assertPreservedRun(result, 'user', false);
  });
  it('preserves ordinary AI-first pool admission legal picks and the snake AI turns', async () => {
    const result = await runCase('normalAi', 'preserves ordinary AI-first pool admission legal picks and the snake AI turns', 'ai', false);
    expect(progress(result.final)).toEqual(expectedProgress('ai'));
    assertPreservedRun(result, 'ai', false);
  });
  it('recovers the user-first round through a public retry after a resolved pool error', async () => {
    const result = await runCase('errorUser', 'recovers the user-first round through a public retry after a resolved pool error', 'user', true);
    expect(progress(result.final), 'FD_POOL_USER_ERROR').toEqual(expectedProgress('user'));
    assertPreservedRun(result, 'user', true);
  });
  it('recovers the AI-first round through a public retry after a resolved pool error', async () => {
    const result = await runCase('errorAi', 'recovers the AI-first round through a public retry after a resolved pool error', 'ai', true);
    expect(progress(result.final), 'FD_POOL_AI_ERROR').toEqual(expectedProgress('ai'));
    assertPreservedRun(result, 'ai', true);
  });
});

describe('Fantasy Draft recovers its current round from an empty successful player-pool reply', () => {
  const cases = [
    ['nullUser', 'recovers the user-first round after a successful null player-pool reply', 'user', 'resolved-null', 'FD_POOL_EMPTY_NULL_USER'],
    ['nullAi', 'recovers the AI-first round after a successful null player-pool reply', 'ai', 'resolved-null', 'FD_POOL_EMPTY_NULL_AI'],
    ['emptyUser', 'recovers the user-first round after a successful empty player-pool reply', 'user', 'resolved-empty', 'FD_POOL_EMPTY_ARRAY_USER'],
    ['emptyAi', 'recovers the AI-first round after a successful empty player-pool reply', 'ai', 'resolved-empty', 'FD_POOL_EMPTY_ARRAY_AI'],
  ] as const;
  for (const [key, title, seat, empty, marker] of cases) {
    it(title, async () => {
      const result = await runCase(key, title, seat, empty);
      const retry = result.recoveryStart.page?.retry.filter(button => button.disabled === false)
        .map(button => button.text?.trim());
      expect({ retry, progress: progress(result.final) }, marker)
        .toEqual({ retry: ['Retry players'], progress: expectedProgress(seat) });
      assertPreservedRun(result, seat, true);

      const opening = { turn: seat, round: 1, pick: 1, total: 22, human: [], ai: [] };
      expect(progress(result.afterStart)).toEqual(opening);
      for (const label of ['retry-pending', 'duplicate-retry-pending']) {
        const frame = packet!.frames.find(item => item.label === label)!;
        expect(progress(frame)).toEqual(opening);
        expect(frame.page?.criterion).toBe(UNDER25);
        expect(frame.pendingResponses).toBe(1);
      }
      expect(progress(result.recovered)).toEqual(opening);
      expect(result.recovered.transport.filter(row => row.kind === 'players').map(row => row.response))
        .toEqual([
          { data: empty === 'resolved-null' ? null : [], error: null, count: null, status: 200, statusText: 'OK' },
          { data: pool, error: null, count: null, status: 200, statusText: 'OK' },
        ]);
    });
  }
});
