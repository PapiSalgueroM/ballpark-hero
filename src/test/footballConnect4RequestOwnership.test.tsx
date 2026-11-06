import { act, cleanup, fireEvent, render, renderHook, within, type RenderResult } from '@testing-library/react';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';
import { useFootballConnect4 } from '@/hooks/useFootballConnect4';
import FootballConnect4 from '@/pages/FootballConnect4';
import { FOOTBALL_CONNECT4_BOARDS } from '@/types/footballConnect4';
import { getTodayET } from '@/lib/dateUtils';
import { consumeRestoredFinish } from '@/lib/restoredFinish';

const io = vi.hoisted(() => ({
  current: null as ReturnType<typeof import('@/hooks/useFootballConnect4').useFootballConnect4> | null,
  draws: [] as number[], search: [] as unknown[], completion: vi.fn(),
  searchRows: [] as Record<string, unknown>[],
}));
vi.mock('@/hooks/useFootballConnect4', async original => {
  const actual = await original<typeof import('@/hooks/useFootballConnect4')>();
  return { ...actual, useFootballConnect4: () => { const value = actual.useFootballConnect4(); io.current = value; return value; } };
});
vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://fixture.invalid', SUPABASE_PUBLISHABLE_KEY: 'fictional-public-key',
  supabase: { from: (table: string) => {
    if (table !== 'player_market_values') throw Error('Unexpected search fixture table: ' + table);
    const calls: unknown[] = [];
    const query: any = {
      then: (yes: (value: unknown) => unknown, no?: (error: unknown) => unknown) => {
        io.search.push({ table, calls: [...calls] });
        return Promise.resolve({ data: io.searchRows.map(row => ({ ...row })), error: null }).then(yes, no);
      },
    };
    for (const method of ['select', 'ilike', 'order', 'limit', 'abortSignal']) query[method] = (...args: unknown[]) => {
      calls.push({ method, args: args.map(value => value instanceof AbortSignal ? { aborted: value.aborted } : value) }); return query;
    };
    return query;
  } },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: io.completion, getCurrentPlayerName: () => 'Fixture Manager' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/components/game/GameShell', () => ({ GameShell: ({ children, headerExtra }: { children: React.ReactNode; headerExtra?: React.ReactNode }) => <div>{headerExtra}{children}</div> }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/ResultScreen', () => ({ ResultScreen: () => null }));
vi.mock('@/components/football-connect4/FootballConnect4HowToPlay', () => ({ FootballConnect4HowToPlay: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));

function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
type SubmitTask = ReturnType<ReturnType<typeof useFootballConnect4>['submitPlayer']>;
type Wire = {
  url: string; payload: unknown; fetch: ReturnType<typeof deferred<Response>>; body: ReturnType<typeof deferred<unknown>>;
  headers: boolean; settled: boolean; rejected: boolean; status: number | null; jsonCalls: number; signal?: AbortSignal | null;
};
let wires: Wire[] = [], pending: SubmitTask[] = [], view: RenderResult | null = null, activeCase = '';
const TITLES = {
  reset: 'C4_OWNER_RESET discards an old valid response after an identical Unlimited re-deal',
  daily: 'C4_OWNER_DAILY refuses a hidden daily move after switching to Unlimited',
  refusal: 'C4_OWNER_REFUSAL keeps an abandoned response out of the new round feedback',
  newer: 'C4_OWNER_NEWER an old finally cannot unlock a newer request',
  page: 'C4_OWNER_PAGE preserves fresh input and focus after the old page continuation resumes',
  duplicate: 'C4_OWNER_DUPLICATE submits one validation and one daily move for one pending origin',
  valid: 'C4_PRESERVE_VALID keeps the current daily canonical move and turn',
  invalid: 'C4_PRESERVE_INVALID refuses and retries a current invalid answer',
  unverified: 'C4_PRESERVE_UNVERIFIED refuses and retries a current unverified answer',
  contradictory: 'C4_PRESERVE_CONTRADICTORY refuses and retries a contradictory verdict',
  busy: 'C4_PRESERVE_BUSY refuses and retries a current HTTP429',
  network: 'C4_PRESERVE_NETWORK refuses and retries a current transport failure',
} as const;
type Key = keyof typeof TITLES;
const raw = { version: 1, unitClock: '2026-11-06T12:00:00Z', scope: 'Actual Soccer Connect4 hook, daily persistence/replay, baked board catalog, random-board generator and page/autocomplete/board components. Only validator/search transport and non-game external shell/auth/completion boundaries are mocked. All submitted names and search records are fictional.',
  boardCatalog: [] as unknown[], cases: {} as Record<string, { title: string; frames: unknown[] }> };
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const flush = async () => { await act(async () => {}); };
const current = () => { if (!io.current) throw Error('C4 fixture hook not mounted'); return io.current; };
const dailyKey = () => 'football-connect4-daily-' + getTodayET();
const storage = () => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]));
const log = () => { const value = localStorage.getItem(dailyKey()); return value ? JSON.parse(value).guesses as unknown[] : []; };
const filled = () => current().board.flatMap(row => row.filter(Boolean));
function capture(label: string) {
  const h = current(), input = view?.container.querySelector<HTMLInputElement>('input[role="combobox"]');
  const value = clone({
    label, state: { mode: h.mode, boardConfig: h.boardConfig, board: h.board, currentTurn: h.currentTurn,
      phase: h.phase, winner: h.winner, isDraw: h.isDraw, selectedColumn: h.selectedColumn, targetRow: h.targetRow,
      isValidating: h.isValidating, validationError: h.validationError, usedPlayers: [...h.usedPlayers].sort(), isLoading: h.isLoading },
    storage: storage(), dailyLog: log(), draws: io.draws,
    transport: wires.map(w => ({ url: w.url, payload: w.payload, headers: w.headers, settled: w.settled, rejected: w.rejected,
      status: w.status, jsonCalls: w.jsonCalls, hasSignal: !!w.signal, signalAborted: w.signal?.aborted ?? false })),
    search: io.search, completions: io.completion.mock.calls,
    page: view ? { input: input?.value ?? null, focusedInput: !!input && input === document.activeElement,
      html: view.container.innerHTML, text: view.container.textContent } : null,
  });
  (raw.cases[activeCase] ??= { title: TITLES[activeCase as Key], frames: [] }).frames.push(value);
  return value;
}
async function mountHook() {
  renderHook(() => useFootballConnect4()); await flush();
  expect(current().isLoading, activeCase + ' real daily load finishes').toBe(false);
}
function select(col = 0) { act(() => current().selectColumn(col)); }
function begin(name = 'Fixture Request A') {
  let task!: SubmitTask; act(() => { task = current().submitPlayer(name); }); pending.push(task); return task;
}
function headers(index: number, status = 200) {
  const w = wires[index]; if (w.headers || w.rejected) return;
  w.headers = true; w.status = status;
  w.fetch.resolve({ ok: status >= 200 && status < 300, status, json: () => { w.jsonCalls += 1; return w.body.promise; } } as Response);
}
async function finish(index: number, body: unknown, task?: SubmitTask, status = 200) {
  await act(async () => { headers(index, status); wires[index].settled = true; wires[index].body.resolve(body); if (task) await task; });
}
function expectEmpty(id: string) {
  const h = current();
  expect({ cells: filled().length, turn: h.currentTurn, phase: h.phase, winner: h.winner, draw: h.isDraw, used: [...h.usedPlayers] }, id)
    .toEqual({ cells: 0, turn: 'blue', phase: 'playing', winner: null, draw: false, used: [] });
}
function expectOne(name: string, col: number, id: string) {
  expect(filled(), id + ' exactly one blue chip').toEqual([{ team: 'blue', playerName: name }]);
  expect(current().board[5][col], id + ' lowest empty row retained').toEqual({ team: 'blue', playerName: name });
  expect(current().currentTurn, id + ' passes turn once').toBe('red');
  expect(current().isValidating, id + ' owns its completed busy state').toBe(false);
}
async function pageSelect(name: string) {
  const input = within(view!.container).getByRole('combobox');
  fireEvent.change(input, { target: { value: name } });
  await act(async () => { vi.advanceTimersByTime(200); }); await flush();
  const option = [...view!.container.querySelectorAll<HTMLButtonElement>('button[role="option"]')].find(e => e.textContent?.includes(name));
  expect(option, TITLES.page + ' real search offers fictional entity').toBeDefined();
  fireEvent.pointerDown(option!); await flush();
}

beforeEach(async () => {
  await flush(); vi.clearAllMocks(); localStorage.clear(); localStorage.setItem('c4-unrelated', 'held');
  consumeRestoredFinish('football-connect-4'); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-06T12:00:00Z'));
  io.draws = []; io.search = []; io.current = null; wires = []; pending = []; view = null; activeCase = '';
  io.searchRows = ['Fixture Request A', 'Fixture Fresh B'].map((name, index) => ({
    player_name: name, name_folded: name.toLowerCase(), person_key: 'fixture-person-' + index,
    club: 'Fixture Club', nationality: 'England', position: 'FWD', market_value_usd: 1000000, year: 2026, age: 24,
  }));
  vi.spyOn(Math, 'random').mockImplementation(() => { io.draws.push(0); return 0; });
  vi.stubGlobal('fetch', vi.fn((url: string | URL | Request, init?: RequestInit) => {
    if (String(url) !== 'https://fixture.invalid/functions/v1/football-connect4-validate') throw Error('Unexpected validator fixture URL: ' + String(url));
    const w: Wire = { url: String(url), payload: JSON.parse(String(init?.body)), fetch: deferred<Response>(), body: deferred<unknown>(),
      headers: false, settled: false, rejected: false, status: null, jsonCalls: 0, signal: init?.signal };
    wires.push(w); return w.fetch.promise;
  }));
  raw.boardCatalog = clone(FOOTBALL_CONNECT4_BOARDS);
});
afterEach(async () => {
  await act(async () => {
    for (const w of wires) if (!w.settled && !w.rejected) {
      if (!w.headers) { w.headers = true; w.status = 200; w.fetch.resolve({ ok: true, status: 200, json: () => w.body.promise } as Response); }
      w.settled = true; w.body.resolve({ valid: false, unverified: true, reason: 'Fixture teardown retry.' });
    }
    await Promise.allSettled(pending);
  });
  if (io.current && activeCase) capture('teardown-settled');
  cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear();
});
afterAll(() => {
  const destination = process.env.C4_REQUEST_OWNER_RAW; if (!destination) return;
  if (!isAbsolute(destination)) throw Error('C4_REQUEST_OWNER_RAW must be absolute');
  mkdirSync(dirname(destination), { recursive: true }); writeFileSync(destination, JSON.stringify(raw, null, 2) + '\n', { flag: 'wx' });
});

describe('Soccer Connect4 pending request ownership', () => {
  it(TITLES.reset, async () => {
    activeCase = 'reset'; await mountHook(); act(() => current().switchMode('unlimited'));
    select(); const task = begin(); await act(async () => { headers(0); }); capture('old-json-body-pending');
    const config = clone(current().boardConfig), draws = [...io.draws]; act(() => current().switchMode('unlimited')); capture('same-config-fresh-round');
    await finish(0, { valid: true, fullName: 'Fixture Old Answer' }, task); capture('old-valid-settled');
    expect(current().boardConfig, TITLES.reset + ' same source board deliberately repeats').toEqual(config);
    expect(io.draws, TITLES.reset + ' ordinary reroll consumes exactly one existing draw').toEqual([...draws, 0]);
    expectEmpty(TITLES.reset); expect(current().validationError, TITLES.reset).toBeNull();
  });
  it(TITLES.daily, async () => {
    activeCase = 'daily'; await mountHook(); select(); const task = begin(), before = storage();
    act(() => current().switchMode('unlimited')); capture('unlimited-after-pending-daily');
    await finish(0, { valid: true, fullName: 'Fixture Daily Old' }, task); capture('old-daily-response-settled');
    expect(storage(), TITLES.daily + ' full daily storage held').toEqual(before);
    expect(log(), TITLES.daily + ' no hidden old daily action').toEqual([]); expectEmpty(TITLES.daily);
  });
  it(TITLES.refusal, async () => {
    activeCase = 'refusal'; await mountHook(); act(() => current().switchMode('unlimited')); select(); const task = begin();
    act(() => current().switchMode('unlimited')); capture('fresh-round-before-old-refusal');
    await finish(0, { valid: false, reason: 'Fixture refusal from the abandoned round.' }, task); capture('old-refusal-settled');
    expect(current().validationError, TITLES.refusal).toBeNull(); expectEmpty(TITLES.refusal);
  });
  it(TITLES.newer, async () => {
    activeCase = 'newer'; await mountHook(); act(() => current().switchMode('unlimited')); select(); const old = begin();
    act(() => current().switchMode('unlimited')); const unlocked = !current().isValidating; capture('new-round-unlocked-boundary');
    if (unlocked) {
      select(1); const next = begin('Fixture New Request'); capture('new-request-pending');
      await finish(0, { valid: true, fullName: 'Fixture Old Answer' }, old); capture('old-finally-during-new-request');
      expect(current().isValidating, TITLES.newer + ' old finally cannot clear newer busy state').toBe(true);
      expectEmpty(TITLES.newer); expect([current().selectedColumn, current().targetRow], TITLES.newer + ' fresh selection held').toEqual([1, 5]);
      await finish(1, { valid: true, fullName: 'Fixture New Answer' }, next); capture('new-own-response-settled');
      expectOne('Fixture New Answer', 1, TITLES.newer);
    } else { await finish(0, { valid: true, fullName: 'Fixture Old Answer' }, old); capture('original-cannot-enter-new-round'); }
    expect(unlocked, TITLES.newer + ' abandoned request must not lock a fresh round').toBe(true);
  });
  it(TITLES.page, async () => {
    activeCase = 'page'; view = render(<FootballConnect4 />); await flush();
    fireEvent.click(within(view.container).getByRole('button', { name: '∞ Unlimited' })); await flush();
    const first = current().boardConfig.columnAttributes[0];
    fireEvent.click(within(view.container).getByRole('button', { name: first })); await pageSelect('Fixture Request A');
    expect(wires.length, TITLES.page + ' real autocomplete initiates old validator once').toBe(1);
    fireEvent.click(within(view.container).getByRole('button', { name: '∞ Unlimited' })); await flush();
    const unlocked = !current().isValidating; capture('page-new-round-unlocked-boundary');
    if (unlocked) {
      const second = current().boardConfig.columnAttributes[1]; fireEvent.click(within(view.container).getByRole('button', { name: second }));
      const input = within(view.container).getByRole('combobox') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'Fixture Fresh B' } }); input.focus();
      await act(async () => { vi.advanceTimersByTime(200); }); await flush(); capture('fresh-page-input-before-old-callback');
      await finish(0, { valid: true, fullName: 'Fixture Old Answer' }); await flush(); capture('fresh-page-input-after-old-callback');
      expect(input.value, TITLES.page + ' old await continuation cannot clear fresh input').toBe('Fixture Fresh B');
      expect(document.activeElement, TITLES.page + ' fresh input keeps focus').toBe(input);
      expect([current().selectedColumn, current().targetRow], TITLES.page + ' old completion cannot clear fresh selection').toEqual([1, 5]);
      expectEmpty(TITLES.page);
    } else { await finish(0, { valid: true, fullName: 'Fixture Old Answer' }); await flush(); capture('original-page-cannot-enter-new-round'); }
    expect(unlocked, TITLES.page + ' fresh real page must be usable before old response returns').toBe(true);
  });
  it(TITLES.duplicate, async () => {
    activeCase = 'duplicate'; await mountHook(); select(); const h = current(); let first!: SubmitTask, second!: SubmitTask;
    // Both calls use the existing exported API before React commits its busy render.
    act(() => { first = h.submitPlayer('Fixture Same Origin'); second = h.submitPlayer('Fixture Same Origin'); }); pending.push(first, second); capture('same-origin-two-api-calls');
    await act(async () => { for (let i = 0; i < wires.length; i++) { headers(i); wires[i].settled = true; wires[i].body.resolve({ valid: true, fullName: 'Fixture Same Origin' }); } await Promise.all([first, second]); });
    capture('duplicate-api-responses-settled');
    expect(wires.length, TITLES.duplicate + ' one pending origin owns one request').toBe(1);
    expect(log(), TITLES.duplicate + ' one coherent persisted daily action').toHaveLength(1); expectOne('Fixture Same Origin', 0, TITLES.duplicate);
  });
  it(TITLES.valid, async () => {
    activeCase = 'valid'; await mountHook(); select(); const draws = [...io.draws], task = begin('Fixture Alias');
    await finish(0, { valid: true, fullName: 'Fixture Canonical' }, task); capture('current-canonical-valid');
    expectOne('Fixture Canonical', 0, TITLES.valid); expect([...current().usedPlayers], TITLES.valid).toEqual(['fixture canonical']);
    expect(log(), TITLES.valid).toEqual([{ t: 'move', col: 0, row: 5, team: 'blue', playerName: 'Fixture Canonical' }]);
    expect(io.draws, TITLES.valid + ' validation adds no random draw').toEqual(draws); expect(io.completion, TITLES.valid).not.toHaveBeenCalled();
  });
  for (const key of ['invalid', 'unverified', 'contradictory', 'busy', 'network'] as const) it(TITLES[key], async () => {
    activeCase = key; await mountHook(); select(); const before = storage(), draws = [...io.draws], task = begin('Fixture Retry');
    if (key === 'network') await act(async () => { wires[0].rejected = true; wires[0].fetch.reject(Error('Fixture transport unavailable')); await task; });
    else await finish(0, key === 'invalid' ? { valid: false, reason: 'Fixture invalid.' } : key === 'unverified' ? { valid: false, unverified: true, reason: 'Fixture retry.' } : key === 'contradictory' ? { valid: true, unverified: true, reason: 'Fixture retry.' } : { valid: false, error: 'Fixture busy.' }, task, key === 'busy' ? 429 : 200);
    capture('current-refusal-before-retry'); expectEmpty(TITLES[key]);
    expect(storage(), TITLES[key] + ' refusal does not persist a move').toEqual(before);
    expect(typeof current().validationError, TITLES[key]).toBe('string'); expect(current().validationError!.length, TITLES[key]).toBeGreaterThan(0);
    expect(current().isValidating, TITLES[key]).toBe(false); expect([current().selectedColumn, current().targetRow], TITLES[key]).toEqual([0, 5]);
    const retry = begin('Fixture Retry'); await finish(1, { valid: true, fullName: 'Fixture Retry' }, retry); capture('current-retry-valid');
    expectOne('Fixture Retry', 0, TITLES[key]); expect(log(), TITLES[key]).toHaveLength(1);
    expect(io.draws, TITLES[key] + ' refusal/retry do not consume random draws').toEqual(draws); expect(io.completion, TITLES[key]).not.toHaveBeenCalled();
  });
});
