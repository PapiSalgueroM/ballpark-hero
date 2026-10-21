import type { ReactNode } from 'react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/* The actual page, hook, picker, search ranking, pitch and spinner run remotely.
 * Shell/SEO/ad wrappers are omitted. Auth/completion and Supabase's fluent HTTP
 * transport are IO fixtures. No game handler, hook state or player fact is injected.
 * jsdom events prove page ownership, not a native browser or physical keyboard. */
const io = vi.hoisted(() => ({
  rest: null as null | ((table: string, operations: [string, unknown[]][], signal?: AbortSignal) => Promise<unknown>),
  completions: [] as unknown[][],
  auth: { user: null, profile: null, refreshProfile: () => undefined },
}));
vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://flawuiqbvjobmkfkauhw.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'fixture-public-key',
  supabase: { from(table: string) {
    const operations: [string, unknown[]][] = [];
    let signal: AbortSignal | undefined;
    const builder: Record<string, unknown> = {
      then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
        if (!io.rest) throw new Error('Fixture transport was not initialized');
        return io.rest(table, operations, signal).then(resolve, reject);
      },
    };
    for (const method of ['select', 'ilike', 'eq', 'in', 'order', 'limit', 'abortSignal']) {
      builder[method] = (...args: unknown[]) => {
        if (method === 'abortSignal') signal = args[0] as AbortSignal;
        else operations.push([method, args]);
        return builder;
      };
    }
    return builder;
  } },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => io.auth }));
vi.mock('@/lib/completions', () => ({ recordCompletion: (...args: unknown[]) => io.completions.push(args), getCurrentPlayerName: () => 'Fixture Guest' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/components/game/GameShell', () => ({ GameShell: ({ title, headerExtra, children }: { title: string; headerExtra?: ReactNode; children: ReactNode }) => <main><h1>{title}</h1>{headerExtra}{children}</main> }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
import LineupBuilder from '@/pages/LineupBuilder';

const CAUSE = 'XI_QUERY_OWNERSHIP';
const OLD = 'Fixture Harbor Defender', NEXT = 'Fixture Harbor Review', PRIMARY = 'Fixture Harbor Striker';
const FRESH = 'Fresh quarry', EPOCH = Date.UTC(2026, 9, 18, 12);
const VALID_HISTORY = [{ primary_position: 'Centre-Back', secondary_positions: ['ST'] }];
const definitions = [
  ['valid', 'a reroll keeps the newer query when abandoned valid history finishes'],
  ['refused', 'a reroll keeps the newer query when abandoned refused history finishes'],
  ['network', 'a reroll keeps the newer query when abandoned history fails'],
  ['timeout', 'a reroll keeps the newer query when abandoned history times out'],
  ['sameText', 'a reroll keeps an explicitly retyped identical query'],
  ['newPending', 'abandoned history cannot clear the newer pending player name'],
  ['samePending', 'abandoned history cannot clear an identical newer pending player name'],
  ['primary', 'the current local club acceptance still clears its query'],
  ['currentRefused', 'the current refused history still clears its query'],
  ['remote', 'the current remote acceptance still clears its query'],
  ['unverified', 'the current unverified reply still clears its query'],
  ['cancelledRemote', 'a cancelled validator settles before a later reroll query'],
] as const;
type Key = typeof definitions[number][0];
type Outcome = 'valid' | 'refused' | 'network' | 'timeout';
type Gate = { kind: 'history' | 'validator'; name: string; settled: boolean; outcome: string | null; resolve: (body: unknown) => void; reject: (reason: unknown) => void };
type Row = Record<string, unknown> & { key: Key; title: string; moments: unknown[] };
const cases: Record<string, Row> = {};
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
let gates: Gate[], requests: Record<string, unknown>[], trace: Record<string, unknown>[], draws: { at: number; value: number }[];
let unexpected: string[], consoleErrors: string[], clockSteps: number[], rng: number, remoteRows: boolean;
let activeRow: Row | undefined;

function stores() {
  const one = (storage: Storage) => Object.fromEntries(Array.from({ length: storage.length }, (_, index) => {
    const key = storage.key(index)!; return [key, storage.getItem(key)] as const;
  }).sort(([a], [b]) => a.localeCompare(b)));
  return { local: one(localStorage), session: one(sessionStorage) };
}
function snapshot(label: string) {
  const input = document.querySelector<HTMLInputElement>('input[role="combobox"]');
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('button')];
  return { label, at: performance.now(), html: document.body.innerHTML,
    input: input ? { value: input.value, disabled: input.disabled, placeholder: input.placeholder } : null,
    focus: document.activeElement?.outerHTML ?? null,
    progress: [...document.querySelectorAll('span')].map(node => node.textContent?.trim()).filter(text => /^\d+\/11$/.test(text ?? '')),
    pitch: buttons.filter(button => /^(GK|LB|CB|RB|LM|CM|RM|ST)$/.test(button.firstElementChild?.textContent?.trim() ?? '')).map(button => ({ text: button.textContent?.trim(), disabled: button.disabled, selected: button.className.includes('ring-primary') })),
    errors: [...document.querySelectorAll('.text-destructive')].map(node => node.textContent?.trim()),
    formation: Boolean(document.querySelector('h2')?.textContent?.includes('Choose Your Formation')),
    reviewing: Boolean([...document.querySelectorAll('h2')].find(node => node.textContent?.includes('Starting XI'))),
    result: Boolean([...document.querySelectorAll('button')].find(node => node.textContent?.includes('Play Again'))),
    stores: stores(), requests: copy(requests), trace: copy(trace), draws: copy(draws), completions: copy(io.completions) };
}
function retain(label: string) { const value = snapshot(label); activeRow!.moments.push(value); return value; }
async function flush() { await act(async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); }); }
async function advance(ms: number) { clockSteps.push(ms); await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }
function response(body: unknown): Response { return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }); }
function hold(kind: Gate['kind'], name: string, signal?: AbortSignal) {
  return new Promise<Response>((resolve, reject) => {
    const gate: Gate = { kind, name, settled: false, outcome: null,
      resolve(body) { if (gate.settled) throw new Error('Fixture gate already settled'); gate.settled = true; gate.outcome = 'response'; trace.push({ action: 'release', kind, name, at: performance.now(), body: copy(body) }); resolve(response(body)); },
      reject(reason) { if (gate.settled) throw new Error('Fixture gate already settled'); gate.settled = true; gate.outcome = reason instanceof DOMException ? reason.name : 'network'; trace.push({ action: 'reject', kind, name, at: performance.now(), error: String(reason) }); reject(reason); },
    };
    gates.push(gate);
    const abort = () => { if (!gate.settled) gate.reject(new DOMException('Fixture request aborted', 'AbortError')); };
    if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, { once: true });
  });
}
function installTransport() {
  io.rest = async (table, operations, signal) => {
    requests.push({ kind: 'search', table, operations: copy(operations), signalAtCall: signal?.aborted ?? null, at: performance.now() });
    if (table !== 'player_market_values') { unexpected.push('Unexpected fluent table ' + table); return { data: [], error: { message: 'Unexpected fixture table' } }; }
    const clubFilter = operations.find(([method, args]) => method === 'in' && args[0] === 'club');
    if (!clubFilter || !Array.isArray(clubFilter[1][1])) { unexpected.push('Expected actual scoped club filter'); return { data: [], error: null }; }
    const club = String(clubFilter[1][1][0]);
    const rows = [OLD, NEXT, PRIMARY].map((name, index) => ({ player_name: name, name_folded: name.toLowerCase(), person_key: 'fictional-' + index,
      club, nationality: 'Fixture Nation', position: remoteRows ? 'Fixture Unknown' : index === 0 ? 'Centre-Back' : 'Centre-Forward', market_value_usd: 1_200_000 + index * 100_000, age: 27, year: 2026 }));
    requests[requests.length - 1].response = copy(rows);
    return { data: signal?.aborted ? [] : rows, error: null };
  };
  vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input), method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    const kind = url.includes('/rest/v1/player_verified_positions?') ? 'history' : url.endsWith('/functions/v1/validate-player') ? 'validator' : 'unexpected';
    requests.push({ kind, url, method, body, signalAtCall: init?.signal?.aborted ?? null, at: performance.now() });
    if (kind === 'unexpected') { unexpected.push(url); return Promise.reject(new Error('Unexpected fixture fetch')); }
    const name = kind === 'history' ? new URL(url).searchParams.get('player_name')! : body.playerName;
    return hold(kind, name, init?.signal ?? undefined);
  }));
}
function field() { return screen.getByRole('combobox') as HTMLInputElement; }
async function chooseSlot() { fireEvent.click(screen.getAllByRole('button', { name: /^ST$/ })[0]); await flush(); }
async function type(value: string) { fireEvent.change(field(), { target: { value } }); await advance(210); }
async function pick(name: string) {
  await type(name);
  const option = screen.getAllByRole('option').find(button => button.textContent?.includes(name));
  expect(option, 'The actual scoped autocomplete must offer the fictional row').toBeDefined();
  fireEvent.click(option!); await flush();
}
async function open() {
  render(<LineupBuilder />); await flush();
  fireEvent.click(screen.getByRole('button', { name: /^4-4-2/ })); await flush();
  await chooseSlot(); retain('opened');
  expect(field().placeholder).toBe('Search a Real Madrid player...');
}
async function reroll() {
  trace.push({ action: 'reroll', at: performance.now() }); rng = 0.1; fireEvent.click(screen.getByRole('button', { name: /^Reroll: get a different team$/ })); await flush(); rng = 0.5;
  retain('rerolled'); await advance(3100); await chooseSlot();
  expect(field().placeholder).toBe('Search a Tottenham player...');
  expect(field().disabled).toBe(false); retain('new-slot');
}
async function release(gate: Gate, body: unknown) { await act(async () => { gate.resolve(body); }); await flush(); }
async function settleOld(gate: Gate, outcome: Outcome) {
  if (outcome === 'timeout') await advance(700);
  else if (outcome === 'network') { await act(async () => { gate.reject(new TypeError('Fixture history unavailable')); }); await flush(); }
  else await release(gate, outcome === 'valid' ? VALID_HISTORY : []);
  expect(gate.settled).toBe(true);
}
async function finishAccepted() {
  await advance(3100); await chooseSlot(); expect(field().value).toBe('');
  expect(retain('accepted-next-slot').progress).toEqual(['1/11']);
}
async function run(key: Key, body: () => Promise<boolean | void>, fault = false) {
  const title = definitions.find(([id]) => id === key)![1];
  activeRow = { key, title, moments: [], initialStores: stores(), boundary: 'Actual page and game components; only declared wrappers and external IO are fixtures.' };
  let owns: boolean | void;
  try { await open(); owns = await body(); }
  finally {
    await act(async () => { for (const gate of gates) if (!gate.settled) gate.resolve(gate.kind === 'history' ? [] : { unverified: true, reason: 'Fixture cleanup' }); });
    await flush(); retain('settled-before-cleanup'); cleanup(); await flush();
    Object.assign(activeRow, { finalStores: stores(), requests: copy(requests), gates: gates.map(({ kind, name, settled, outcome }) => ({ kind, name, settled, outcome })),
      trace: copy(trace), draws: copy(draws), unexpected: [...unexpected], consoleErrors: [...consoleErrors], completions: copy(io.completions), clockSteps: [...clockSteps], cleanupHTML: document.body.innerHTML });
    cases[key] = copy(activeRow); activeRow = undefined;
  }
  const row = cases[key];
  expect(row.finalStores).toEqual(row.initialStores); expect(row.unexpected).toEqual([]); expect(row.consoleErrors).toEqual([]); expect(row.completions).toEqual([]);
  expect((row.gates as { settled: boolean }[]).every(gate => gate.settled)).toBe(true);
  const opened = row.moments[0] as ReturnType<typeof snapshot>;
  expect(opened.pitch).toHaveLength(11); expect(opened.progress).toEqual(['0/11']);
  expect(opened.draws.length).toBeGreaterThan(0); expect(opened.draws.every(draw => draw.value === 0.5)).toBe(true);
  expect((row.draws as typeof draws).slice(opened.draws.length)).toEqual((row.trace as typeof trace).filter(event => event.action === 'reroll').map(event => ({ at: event.at, value: 0.1 })));
  expect(row.cleanupHTML).toBe('');
  if (fault) expect(owns === true, CAUSE).toBe(true);
}

beforeAll(async () => { await act(async () => { await Promise.resolve(); }); });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'performance', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] }); vi.setSystemTime(EPOCH);
  gates = []; requests = []; trace = []; draws = []; unexpected = []; consoleErrors = []; clockSteps = []; rng = 0.5; remoteRows = false; io.completions.length = 0;
  localStorage.clear(); sessionStorage.clear(); localStorage.setItem('lineup-rules-seen', '1'); localStorage.setItem('xi-query-sentinel', 'local-held'); sessionStorage.setItem('xi-query-sentinel', 'session-held');
  vi.spyOn(Math, 'random').mockImplementation(() => { draws.push({ at: performance.now(), value: rng }); return rng; });
  vi.spyOn(console, 'error').mockImplementation((...args) => consoleErrors.push(args.map(String).join(' ')));
  installTransport();
});
afterEach(() => { cleanup(); io.rest = null; vi.unstubAllGlobals(); vi.useRealTimers(); vi.restoreAllMocks(); });
afterAll(() => {
  if (!process.env.XI_QUERY_RAW) return;
  if (!path.isAbsolute(process.env.XI_QUERY_RAW)) throw new Error('XI_QUERY_RAW must be absolute');
  mkdirSync(path.dirname(process.env.XI_QUERY_RAW), { recursive: true });
  writeFileSync(process.env.XI_QUERY_RAW, JSON.stringify({ version: 1, caseTitles: definitions.map(([, title]) => title), cases }, null, 2) + '\n', { flag: 'wx' });
});

describe('Build Your XI query ownership', () => {
  for (const outcome of ['valid', 'refused', 'network', 'timeout'] as const) it(definitions.find(([key]) => key === outcome)![1], async () => {
    await run(outcome, async () => {
      await pick(OLD); const old = gates[0]; expect(old.kind).toBe('history'); expect(field().value).toBe(OLD); expect(field().disabled).toBe(true); retain('old-pending');
      await reroll(); await type(FRESH); const newer = retain('new-query'); expect(newer.input?.value).toBe(FRESH);
      await settleOld(old, outcome); const after = retain('obsolete-settled');
      expect(after.progress).toEqual(['0/11']); expect(after.errors).toEqual([]); expect(after.input?.disabled).toBe(false);
      expect(gates).toHaveLength(1); return after.input?.value === FRESH;
    }, true);
  });
  it(definitions[4][1], async () => {
    await run('sameText', async () => {
      await pick(OLD); const old = gates[0]; retain('old-pending'); await reroll();
      await type(''); await type(OLD); const newer = retain('same-text-retyped'); expect(newer.input?.value).toBe(OLD);
      await settleOld(old, 'valid'); const after = retain('obsolete-settled'); expect(after.progress).toEqual(['0/11']); expect(after.errors).toEqual([]);
      expect(gates).toHaveLength(1); return after.input?.value === OLD;
    }, true);
  });
  for (const [key, name] of [['newPending', NEXT], ['samePending', OLD]] as const) it(definitions.find(([id]) => id === key)![1], async () => {
    await run(key, async () => {
      await pick(OLD); const old = gates[0]; retain('old-pending'); await reroll(); remoteRows = true;
      await pick(name); const current = gates[1]; expect(current.kind).toBe('validator'); expect(field().value).toBe(name); expect(field().disabled).toBe(true); retain('current-pending');
      expect(requests.filter(request => request.kind === 'validator').map(request => request.body)).toEqual([{ playerName: name, teamName: 'Tottenham', isNation: false, position: 'ST' }]);
      await settleOld(old, 'valid'); const middle = retain('obsolete-settled-during-current');
      expect(middle.progress).toEqual(['0/11']); expect(middle.input?.disabled).toBe(true); expect(middle.errors).toEqual([]); expect(current.settled).toBe(false);
      const owns = middle.input?.value === name;
      await release(current, { valid: true, fullName: name }); await finishAccepted(); expect(gates).toHaveLength(2); return owns;
    }, true);
  });
  it(definitions[7][1], async () => {
    await run('primary', async () => { await pick(PRIMARY); expect(gates).toHaveLength(0); await finishAccepted(); });
  });
  it(definitions[8][1], async () => {
    await run('currentRefused', async () => {
      await pick(OLD); retain('current-pending'); await release(gates[0], []); const after = retain('refused');
      expect(after.input?.value).toBe(''); expect(after.input?.disabled).toBe(false); expect(after.progress).toEqual(['0/11']); expect(after.errors.some(text => text?.includes('slot needs'))).toBe(true); expect(gates).toHaveLength(1);
    });
  });
  it(definitions[9][1], async () => {
    await run('remote', async () => { remoteRows = true; await pick(NEXT); retain('current-pending'); expect(requests.filter(request => request.kind === 'validator').map(request => request.body)).toEqual([{ playerName: NEXT, teamName: 'Real Madrid', isNation: false, position: 'ST' }]); await release(gates[0], { valid: true, fullName: NEXT }); await finishAccepted(); expect(gates).toHaveLength(1); });
  });
  it(definitions[10][1], async () => {
    await run('unverified', async () => {
      remoteRows = true; await pick(NEXT); retain('current-pending'); await release(gates[0], { unverified: true, reason: 'Fixture verification unavailable' }); const after = retain('unverified');
      expect(after.input?.value).toBe(''); expect(after.input?.disabled).toBe(false); expect(after.progress).toEqual(['0/11']); expect(after.errors).toEqual(['Fixture verification unavailable']); expect(gates).toHaveLength(1);
    });
  });
  it(definitions[11][1], async () => {
    await run('cancelledRemote', async () => {
      remoteRows = true; await pick(NEXT); const old = gates[0]; expect(old.kind).toBe('validator'); retain('old-pending');
      await reroll(); expect(old.settled).toBe(true); expect(old.outcome).toBe('AbortError'); await type(FRESH); await flush(); const after = retain('new-query-after-cancel');
      expect(after.input?.value).toBe(FRESH); expect(after.input?.disabled).toBe(false); expect(after.progress).toEqual(['0/11']); expect(after.errors).toEqual([]); expect(gates).toHaveLength(1);
    });
  });
});
