import { act, cleanup, fireEvent, render, within, type RenderResult } from '@testing-library/react';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';
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
type Wire = {
  url: string; payload: unknown; fetch: ReturnType<typeof deferred<Response>>; body: ReturnType<typeof deferred<unknown>>;
  headers: boolean; settled: boolean; rejected: boolean; status: number | null; jsonCalls: number; responseBody: unknown; transportError: string | null; signal?: AbortSignal | null;
};
let wires: Wire[] = [], view: RenderResult | null = null, activeCase = '';
const TITLES = {
  daily: 'C4_CANCEL_DAILY cancels a pending daily move and keeps a newer page request owned',
  unlimited: 'C4_CANCEL_UNLIMITED refuses a valid old chip after the actual pending Cancel',
  invalid: 'C4_CANCEL_INVALID keeps a cancelled invalid reply out of page feedback',
  network: 'C4_CANCEL_NETWORK keeps a cancelled transport failure out of page feedback',
  idle: 'C4_CANCEL_IDLE preserves a selection-only Cancel without a request',
  progress: 'C4_CANCEL_PROGRESS keeps real daily and Unlimited progress after a current refusal and Cancel',
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
      status: w.status, jsonCalls: w.jsonCalls, responseBody: w.responseBody, transportError: w.transportError, hasSignal: !!w.signal, signalAborted: w.signal?.aborted ?? false })),
    search: io.search, completions: io.completion.mock.calls,
    page: view ? { input: input?.value ?? null, inputDisabled: input?.disabled ?? null,
      cancelDisabled: view.container.querySelector<HTMLButtonElement>('button[title="Cancel"]')?.disabled ?? null,
      focusedInput: !!input && input === document.activeElement,
      html: view.container.innerHTML, text: view.container.textContent } : null,
  });
  (raw.cases[activeCase] ??= { title: TITLES[activeCase as Key], frames: [] }).frames.push(value);
  return value;
}
async function mountPage(mode: 'daily' | 'unlimited' = 'daily') {
  view = render(<FootballConnect4 />); await flush();
  expect(current().isLoading, TITLES[activeCase as Key] + ' real daily load finishes').toBe(false);
  if (mode === 'unlimited') {
    fireEvent.click(within(view.container).getByRole('button', { name: '∞ Unlimited' })); await flush();
  }
}
function select(col = 0) {
  fireEvent.click(within(view!.container).getByRole('button', { name: current().boardConfig.columnAttributes[col] }));
}
async function cancel() {
  const button = within(view!.container).getByTitle('Cancel') as HTMLButtonElement;
  expect(button.disabled, TITLES[activeCase as Key] + ' actual Cancel is enabled').toBe(false);
  fireEvent.click(button); await flush();
}
function progress() {
  const h = current();
  return clone({ mode: h.mode, boardConfig: h.boardConfig, board: h.board, currentTurn: h.currentTurn,
    phase: h.phase, winner: h.winner, isDraw: h.isDraw, usedPlayers: [...h.usedPlayers].sort(), isLoading: h.isLoading,
    storage: storage(), draws: io.draws, completions: io.completion.mock.calls });
}
function headers(index: number, status = 200) {
  const w = wires[index]; if (w.headers || w.rejected) return;
  w.headers = true; w.status = status;
  w.fetch.resolve({ ok: status >= 200 && status < 300, status, json: () => { w.jsonCalls += 1; return w.body.promise; } } as Response);
}
async function finish(index: number, body: unknown, status = 200) {
  await act(async () => { headers(index, status); wires[index].settled = true; wires[index].responseBody = clone(body); wires[index].body.resolve(body); }); await flush();
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
  expect(option, TITLES[activeCase as Key] + ' real search offers fictional entity').toBeDefined();
  fireEvent.pointerDown(option!); await flush();
}

beforeEach(async () => {
  await flush(); vi.clearAllMocks(); localStorage.clear(); localStorage.setItem('c4-unrelated', 'held');
  consumeRestoredFinish('football-connect-4'); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-06T12:00:00Z'));
  io.draws = []; io.search = []; io.current = null; wires = []; view = null; activeCase = '';
  io.searchRows = ['Fixture Request A', 'Fixture Fresh B'].map((name, index) => ({
    player_name: name, name_folded: name.toLowerCase(), person_key: 'fixture-person-' + index,
    club: 'Fixture Club', nationality: 'England', position: 'FWD', market_value_usd: 1000000, year: 2026, age: 24,
  }));
  vi.spyOn(Math, 'random').mockImplementation(() => { io.draws.push(0); return 0; });
  vi.stubGlobal('fetch', vi.fn((url: string | URL | Request, init?: RequestInit) => {
    if (String(url) !== 'https://fixture.invalid/functions/v1/football-connect4-validate') throw Error('Unexpected validator fixture URL: ' + String(url));
    const w: Wire = { url: String(url), payload: JSON.parse(String(init?.body)), fetch: deferred<Response>(), body: deferred<unknown>(),
      headers: false, settled: false, rejected: false, status: null, jsonCalls: 0, responseBody: null, transportError: null, signal: init?.signal };
    wires.push(w); return w.fetch.promise;
  }));
  raw.boardCatalog = clone(FOOTBALL_CONNECT4_BOARDS);
});
afterEach(async () => {
  await act(async () => {
    for (const w of wires) if (!w.settled && !w.rejected) {
      if (!w.headers) { w.headers = true; w.status = 200; w.fetch.resolve({ ok: true, status: 200, json: () => w.body.promise } as Response); }
      w.settled = true; w.responseBody = { valid: false, unverified: true, reason: 'Fixture teardown retry.' }; w.body.resolve(w.responseBody);
    }
  });
  if (io.current && activeCase) capture('teardown-settled');
  cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear();
});
afterAll(() => {
  const destination = process.env.C4_CANCEL_OWNER_RAW; if (!destination) return;
  if (!isAbsolute(destination)) throw Error('C4_CANCEL_OWNER_RAW must be absolute');
  mkdirSync(dirname(destination), { recursive: true }); writeFileSync(destination, JSON.stringify(raw, null, 2) + '\n', { flag: 'wx' });
});

describe('Soccer Connect4 pending Cancel ownership', () => {
  it(TITLES.idle, async () => {
    activeCase = 'idle'; await mountPage(); const before = progress(); select(); capture('idle-selection-before-cancel');
    await cancel(); const cancelled = capture('idle-selection-after-cancel');
    expect(progress(), TITLES.idle + ' selecting and cancelling does not mutate full game progress').toEqual(before);
    expect([cancelled.state.selectedColumn, cancelled.state.targetRow, cancelled.state.validationError, cancelled.state.isValidating], TITLES.idle + ' existing idle cleanup').toEqual([null, null, null, false]);
    expect(wires, TITLES.idle + ' Cancel does not create a validator').toHaveLength(0);
    select(1); capture('idle-next-selection'); expect([current().selectedColumn, current().targetRow], TITLES.idle + ' next choice stays available').toEqual([1, 5]);
    expectEmpty(TITLES.idle);
  });

  it(TITLES.progress, async () => {
    activeCase = 'progress'; await mountPage();
    let dailyProgress: ReturnType<typeof progress> | null = null;
    for (const mode of ['daily', 'unlimited'] as const) {
      if (mode === 'unlimited') { fireEvent.click(within(view!.container).getByRole('button', { name: '∞ Unlimited' })); await flush(); }
      select(); await pageSelect('Fixture Request A'); await finish(wires.length - 1, { valid: true, fullName: 'Fixture Request A' }); capture(mode + '-current-move');
      expectOne('Fixture Request A', 0, TITLES.progress + ' ' + mode);
      const before = progress(); if (mode === 'daily') dailyProgress = before;
      select(1); await pageSelect('Fixture Fresh B'); await finish(wires.length - 1, { valid: false, reason: 'Fixture current refusal.' }); capture(mode + '-current-refusal');
      expect(current().validationError, TITLES.progress + ' current refusal still appears').toBe('Fixture current refusal.');
      expect(current().isValidating, TITLES.progress + ' settled refusal releases busy').toBe(false);
      await cancel(); const cancelled = capture(mode + '-after-settled-cancel');
      expect(progress(), TITLES.progress + ' ' + mode + ' Cancel keeps actual prior move turn used names storage and draws').toEqual(before);
      expect([cancelled.state.selectedColumn, cancelled.state.targetRow, cancelled.state.validationError, cancelled.state.isValidating], TITLES.progress + ' ' + mode + ' clears settled selection and error').toEqual([null, null, null, false]);
    }
    const draws = [...io.draws]; fireEvent.click(within(view!.container).getByRole('button', { name: '📅 Daily' })); await flush(); capture('progress-return-to-daily');
    expect(progress(), TITLES.progress + ' return restores exact daily progress with the ordinary Unlimited draw retained').toEqual({ ...dailyProgress!, draws });
    expect(log(), TITLES.progress + ' only actual daily move is saved').toEqual([{ t: 'move', col: 0, row: 5, team: 'blue', playerName: 'Fixture Request A' }]);
    expect(wires, TITLES.progress + ' actual valid and invalid requests in both modes').toHaveLength(4);
    expect(io.completion, TITLES.progress + ' no incomplete round recorded').not.toHaveBeenCalled();
  });
  it(TITLES.daily, async () => {
    activeCase = 'daily'; await mountPage(); const before = progress(); select(); await pageSelect('Fixture Request A');
    await act(async () => { headers(0); }); capture('daily-old-body-pending');
    await cancel(); const cancelled = capture('daily-after-cancel');
    const unlocked = !cancelled.state.isValidating; let admitted = false;
    let heldAfterOld: ReturnType<typeof progress> | null = null;
    let oldDuringNew: ReturnType<typeof capture> | null = null;
    let reopened: HTMLInputElement | null = null;
    if (unlocked) {
      select(1); await pageSelect('Fixture Fresh B'); admitted = wires.length === 2; capture('daily-new-request-attempt');
      await finish(0, { valid: true, fullName: 'Fixture Cancelled A' });
      oldDuringNew = capture(admitted ? 'daily-old-valid-during-new-request' : 'daily-old-valid-after-blocked-new-request');
      heldAfterOld = progress();
      if (admitted) {
        await finish(1, { valid: true, fullName: 'Fixture Fresh B' }); capture('daily-new-response-settled');
        select(2); reopened = within(view!.container).getByRole('combobox') as HTMLInputElement; capture('daily-next-selection-clean');
      }
    } else {
      await finish(0, { valid: true, fullName: 'Fixture Cancelled A' }); capture('daily-original-cannot-enter-new-request');
    }
    expect(cancelled.state.isValidating, TITLES.daily + ' Cancel releases busy before the old reply').toBe(false);
    expect([cancelled.state.selectedColumn, cancelled.state.targetRow, cancelled.state.validationError], TITLES.daily + ' Cancel clears only transient selection and feedback').toEqual([null, null, null]);
    expect(admitted, TITLES.daily + ' the released board starts one real newer validator').toBe(true);
    expect(heldAfterOld, TITLES.daily + ' old daily result leaves full game progress and storage held while B is pending').toEqual(before);
    expect(oldDuringNew!.state.isValidating, TITLES.daily + ' old finally cannot unlock B').toBe(true);
    expect([oldDuringNew!.state.selectedColumn, oldDuringNew!.state.targetRow], TITLES.daily + ' B keeps its fresh target').toEqual([1, 5]);
    expect(oldDuringNew!.page?.input, TITLES.daily + ' old page continuation cannot clear B input').toBe('Fixture Fresh B');
    expectOne('Fixture Fresh B', 1, TITLES.daily);
    expect(log(), TITLES.daily + ' just the current B move is persisted').toEqual([{ t: 'move', col: 1, row: 5, team: 'blue', playerName: 'Fixture Fresh B' }]);
    expect(reopened!.value, TITLES.daily + ' current B still cleans the next input').toBe('');
    expect(io.draws, TITLES.daily + ' Cancel and both replies add no draw').toEqual(before.draws);
    expect(io.completion, TITLES.daily + ' no false completion').not.toHaveBeenCalled();
  });

  it(TITLES.unlimited, async () => {
    activeCase = 'unlimited'; await mountPage('unlimited'); const before = progress(); select(); await pageSelect('Fixture Request A');
    capture('unlimited-old-fetch-pending'); await cancel(); const cancelled = capture('unlimited-after-cancel');
    await finish(0, { valid: true, fullName: 'Fixture Cancelled A' }); const settled = capture('unlimited-old-valid-settled');
    expect(cancelled.state.isValidating, TITLES.unlimited + ' Cancel immediately releases the board').toBe(false);
    expect(progress(), TITLES.unlimited + ' late valid reply cannot place a chip or change full game progress').toEqual(before);
    expect([settled.state.selectedColumn, settled.state.targetRow, settled.state.validationError], TITLES.unlimited + ' cancelled selection stays closed').toEqual([null, null, null]);
    expectEmpty(TITLES.unlimited); expect(wires, TITLES.unlimited + ' no replacement request is invented').toHaveLength(1);
  });

  for (const key of ['invalid', 'network'] as const) it(TITLES[key], async () => {
    activeCase = key; await mountPage(key === 'network' ? 'unlimited' : 'daily'); const before = progress();
    select(); await pageSelect('Fixture Request A');
    if (key === 'invalid') await act(async () => { headers(0); });
    capture(key + '-old-request-pending'); await cancel(); const cancelled = capture(key + '-after-cancel');
    if (key === 'network') {
      await act(async () => { wires[0].rejected = true; wires[0].transportError = 'Fixture cancelled transport unavailable'; wires[0].fetch.reject(Error(wires[0].transportError)); }); await flush();
    } else await finish(0, { valid: false, reason: 'Fixture cancelled answer does not fit.' });
    const settled = capture(key + '-old-refusal-settled');
    expect(cancelled.state.isValidating, TITLES[key] + ' Cancel immediately releases the board').toBe(false);
    expect(settled.state.validationError, TITLES[key] + ' abandoned reply cannot restore an error').toBeNull();
    expect([settled.state.selectedColumn, settled.state.targetRow], TITLES[key] + ' abandoned reply cannot reopen selection').toEqual([null, null]);
    expect(progress(), TITLES[key] + ' full board progress storage and draw tape held').toEqual(before);
    expectEmpty(TITLES[key]); expect(wires, TITLES[key] + ' no extra validation').toHaveLength(1);
  });

});
