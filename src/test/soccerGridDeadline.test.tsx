import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';

const io = vi.hoisted(() => ({ from: vi.fn(), invoke: vi.fn(), record: vi.fn(), toast: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: io.from, functions: { invoke: io.invoke } } }));
vi.mock('@/lib/completions', () => ({ recordCompletion: io.record, getCurrentPlayerName: () => 'Grid Fixture Guest' }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('sonner', () => ({ toast: { error: io.toast, success: vi.fn() } }));
import { useSoccerGrid } from '@/hooks/useSoccerGrid';
import { getTodayET } from '@/lib/dateUtils';

const TITLES = {
  lateValidator: 'late validator success cannot change the completed main result',
  lateRarity: 'late rarity success cannot change the completed main result',
  lateInsert: 'late selection-write success cannot change the completed main result',
  lateWrong: 'late wrong verdict cannot change the completed main result',
  lateUnverified: 'late unverified verdict preserves the completed main result',
  timelyValid: 'timely valid answers still update the main board and save',
  timelyWrong: 'timely wrong answers still consume one main guess',
  timelyUnverified: 'timely unverified answers remain a no-penalty retry',
  exhausted: 'exhausted checking still preserves the guess budget',
  rejected: 'rejected validation still preserves the guess budget',
  overtimeValid: 'genuine Overtime success stays separate from the frozen main result',
  overtimeWrong: 'genuine Overtime wrong answers remain unlimited and unscored',
} as const;
type Key = keyof typeof TITLES;
type Reply = { data?: Record<string, unknown>; error?: unknown; count?: number };
type Gate = { name: string; settled: boolean; promise: Promise<Reply>; resolve: (reply: Reply) => void; reject: (error: Error) => void };
const NOW = Date.parse('2026-10-17T12:00:00.000Z');
const VALID = (name: string): Reply => ({ data: { valid: true, fullName: name }, error: null });
const RETRY = "Couldn't verify that answer, please try again.";
const EXHAUSTED = 'Answer checking has used up its allowance for today. This guess was not counted; your board is saved, come back tomorrow.';
const raw = { version: 1, caseTitles: Object.values(TITLES), cases: {} as Record<string, unknown> };
let requests: Record<string, unknown>[];
let deferred: Gate[];
let unexpected: string[];
let replies: Record<'validator' | 'count' | 'insert', (Reply | Gate)[]>;

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const dailyKey = () => `soccer-grid-daily-${getTodayET()}`;
function gate(name: string): Gate {
  let resolve!: (reply: Reply) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<Reply>((yes, no) => { resolve = yes; reject = no; });
  const entry: Gate = { name, settled: false, promise, resolve: (reply) => { entry.settled = true; resolve(reply); }, reject: (error) => { entry.settled = true; reject(error); } };
  deferred.push(entry);
  return entry;
}
function dispatch(kind: keyof typeof replies, details: Record<string, unknown>): Promise<Reply> {
  const next = replies[kind].shift();
  requests.push(copy({ kind, ...details, deferred: next && 'promise' in next ? next.name : null }));
  if (!next) {
    unexpected.push(`No declared ${kind} response`);
    return Promise.reject(new Error(`No declared ${kind} response`));
  }
  return 'promise' in next ? next.promise : Promise.resolve(next);
}
function installTransport() {
  io.invoke.mockImplementation((name, options) => dispatch('validator', { name, body: options.body }));
  io.from.mockImplementation((table: string) => {
    if (table === 'soccer_grid_puzzles') return { select: (columns: string) => ({ order: (column: string, options: unknown) => {
      requests.push(copy({ kind: 'puzzles', table, columns, column, options }));
      return Promise.resolve({ data: [], error: null });
    } }) };
    if (table !== 'soccer_grid_selections') {
      unexpected.push(`Unexpected table ${table}`);
      throw new Error(`Unexpected table ${table}`);
    }
    return {
      select: (columns: string, options: unknown) => {
        const filters: [string, unknown][] = [];
        const query = {
          eq: (column: string, value: unknown) => { filters.push([column, value]); return query; },
          then: (yes: (reply: Reply) => unknown, no: (error: unknown) => unknown) => dispatch('count', { table, columns, options, filters }).then(yes, no),
        };
        return query;
      },
      insert: (body: unknown) => dispatch('insert', { table, body }),
    };
  });
}
type View = ReturnType<typeof renderHook<ReturnType<typeof useSoccerGrid>, unknown>>;
function state(view: View) {
  const current = view.result.current;
  const storage = Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]));
  return copy({
    main: { cells: current.mainCells, correctCount: current.correctCount, rarityScore: current.rarityScore, guessesLeft: current.guessesLeft, dailyJSON: localStorage.getItem(dailyKey()) },
    recordings: io.record.mock.calls, toasts: io.toast.mock.calls, storage,
    gameStatus: current.gameStatus, timeUp: current.timeUp, timeLeft: current.timeLeft,
    validating: current.validating, activeCell: current.activeCell, checkingDown: current.checkingDown,
    settings: current.settings, cells: current.cells, overtimeCells: current.overtimeCells,
    overtimeCorrectCount: current.overtimeCorrectCount, isOvertime: current.isOvertime, overtimeActive: current.overtimeActive,
  });
}
type Moment = { label: string; at: number; state: ReturnType<typeof state> };
function moment(view: View, moments: Moment[], label: string) {
  const observed = state(view);
  moments.push({ label, at: Date.now(), state: observed });
  return observed;
}
async function flush() { await act(async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); }); }
function begin(view: View, cell: number, name: string) {
  act(() => view.result.current.setActiveCell(cell));
  let pending!: Promise<void>;
  act(() => { pending = view.result.current.submitGuess(name); });
  return pending;
}
async function complete(view: View, cell: number, name: string) {
  const pending = begin(view, cell, name);
  await act(async () => { await pending; });
}
function queueValid(name: string) {
  replies.validator.push(VALID(name));
  replies.count.push({ count: 9 }, { count: 1 });
  replies.insert.push({ data: null, error: null });
}
async function ready() {
  const view = renderHook(() => useSoccerGrid());
  await flush();
  expect(view.result.current.isLoading).toBe(false);
  expect(view.result.current.isLoadingPool).toBe(false);
  act(() => view.result.current.setTimerMode(40));
  queueValid('Grid Fixture First');
  await complete(view, 0, 'Grid Fixture First');
  expect(view.result.current.correctCount).toBe(1);
  expect(view.result.current.rarityScore).toBe(20);
  expect(io.record).not.toHaveBeenCalled();
  return view;
}
async function expire(view: View, moments: Moment[]) {
  await act(async () => { vi.advanceTimersByTime(40_000); });
  const completed = moment(view, moments, 'completed-main');
  expect(completed.gameStatus).toBe('complete');
  expect(completed.timeUp).toBe(true);
  expect(completed.recordings).toEqual([['/soccer-grid', 100, 'Grid Fixture Guest', 0]]);
  return completed;
}
function overtime(view: View, moments: Moment[]) {
  act(() => view.result.current.startOvertime());
  const entered = moment(view, moments, 'overtime-entered');
  expect(entered.isOvertime).toBe(true);
}
function retain(key: Key, moments: Moment[]) {
  raw.cases[key] = copy({ title: TITLES[key], moments, requests, deferred: deferred.map(({ name, settled }) => ({ name, settled })), unexpected });
  expect(unexpected).toEqual([]);
  expect(deferred.every(entry => entry.settled)).toBe(true);
}
function released(view: View) {
  expect(view.result.current.validating).toBe(false);
  expect(view.result.current.activeCell).toBeNull();
}
beforeEach(async () => {
  await act(async () => undefined);
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(NOW);
  localStorage.clear();
  requests = []; deferred = []; unexpected = [];
  replies = { validator: [], count: [], insert: [] };
  vi.clearAllMocks();
  installTransport();
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
afterAll(() => {
  const destination = process.env.SC_GRID_DEADLINE_RAW;
  if (!destination) return;
  if (!isAbsolute(destination)) throw new Error('SC_GRID_DEADLINE_RAW must be absolute');
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, JSON.stringify(raw, null, 2) + '\n', { flag: 'wx' });
});

describe('Soccer Grid keeps a committed timed result frozen', () => {
  for (const [key, boundary, cause] of [
    ['lateValidator', 'validator', 'The main result must stay frozen after late validator success'],
    ['lateRarity', 'count', 'The main result must stay frozen after late rarity success'],
    ['lateInsert', 'insert', 'The main result must stay frozen after late selection-write success'],
    ['lateWrong', 'wrong', 'The main result must stay frozen after a late wrong verdict'],
  ] as const) {
    it(TITLES[key], async () => {
      const view = await ready(); const moments: Moment[] = [];
      moment(view, moments, 'ready');
      await act(async () => { vi.advanceTimersByTime(39_000); });
      moment(view, moments, 'before-pending');
      const held = gate(`${boundary}-reply`);
      replies.validator.push(boundary === 'validator' || boundary === 'wrong' ? held : VALID('Grid Fixture Late'));
      replies.count.push(boundary === 'count' ? held : { count: 19 }, { count: 0 });
      replies.insert.push(boundary === 'insert' ? held : { data: null, error: null });
      const pending = begin(view, 1, 'Grid Fixture Late');
      await flush();
      moment(view, moments, 'pending');
      expect(view.result.current.validating).toBe(true);
      expect(requests.some(request => request.deferred === held.name)).toBe(true);
      await act(async () => { vi.advanceTimersByTime(1_000); });
      const completed = moment(view, moments, 'completed-main');
      expect(completed.gameStatus).toBe('complete');
      expect(completed.recordings).toEqual([['/soccer-grid', 100, 'Grid Fixture Guest', 0]]);
      overtime(view, moments);
      await act(async () => {
        held.resolve(boundary === 'wrong' ? { data: { valid: false } } : boundary === 'validator' ? VALID('Grid Fixture Late') : boundary === 'count' ? { count: 19 } : { data: null, error: null });
        await pending;
      });
      const settled = moment(view, moments, 'settled-main');
      retain(key, moments);
      expect(same(settled.main, completed.main) && same(settled.recordings, completed.recordings), cause).toBe(true);
      expect(settled.overtimeCells).toEqual([]);
      released(view);
    });
  }

  it(TITLES.lateUnverified, async () => {
    const view = await ready(); const moments: Moment[] = []; moment(view, moments, 'ready');
    const held = gate('late-unverified'); replies.validator.push(held);
    const pending = begin(view, 1, 'Grid Fixture Retry'); await flush(); moment(view, moments, 'pending');
    const completed = await expire(view, moments); overtime(view, moments);
    await act(async () => { held.resolve({ data: { valid: false, unverified: true, exhausted: true } }); await pending; });
    const settled = moment(view, moments, 'settled-main'); retain('lateUnverified', moments);
    expect(settled.main).toEqual(completed.main); expect(settled.recordings).toEqual(completed.recordings);
    expect(settled.toasts).toEqual([[EXHAUSTED]]); expect(settled.checkingDown).toBe(true); released(view);
  });

  it(TITLES.timelyValid, async () => {
    const view = await ready(); const moments: Moment[] = []; moment(view, moments, 'ready');
    queueValid('Grid Fixture Second'); await complete(view, 1, 'Grid Fixture Second');
    const settled = moment(view, moments, 'settled-main'); retain('timelyValid', moments);
    expect(settled.main.correctCount).toBe(2); expect(settled.main.rarityScore).toBe(20); expect(settled.main.guessesLeft).toBe(13);
    expect(JSON.parse(settled.main.dailyJSON!).guesses).toEqual([
      { t: 'ok', cellIndex: 0, playerName: 'Grid Fixture First', rarity: 20 },
      { t: 'ok', cellIndex: 1, playerName: 'Grid Fixture Second', rarity: 20 },
    ]);
    expect(settled.recordings).toEqual([]); expect(settled.main.cells[1].playerName).toBe('Grid Fixture Second'); released(view);
  });

  it(TITLES.timelyWrong, async () => {
    const view = await ready(); const moments: Moment[] = []; const before = moment(view, moments, 'ready');
    replies.validator.push({ data: { valid: false } }); await complete(view, 1, 'Grid Fixture Wrong');
    const wrong = moment(view, moments, 'settled-main');
    await act(async () => { vi.advanceTimersByTime(1_500); });
    const cleared = moment(view, moments, 'wrong-flash-cleared'); retain('timelyWrong', moments);
    expect(wrong.main.correctCount).toBe(1); expect(wrong.main.rarityScore).toBe(before.main.rarityScore); expect(wrong.main.guessesLeft).toBe(13);
    expect(JSON.parse(wrong.main.dailyJSON!).guesses.at(-1)).toEqual({ t: 'x' });
    expect(wrong.main.cells[1].status).toBe('wrong'); expect(cleared.main.cells[1].status).toBe('empty'); expect(wrong.recordings).toEqual([]); released(view);
  });

  for (const [key, response, message, down] of [
    ['timelyUnverified', { data: { valid: false, unverified: true } }, RETRY, false],
    ['exhausted', { data: { valid: false, unverified: true, exhausted: true } }, EXHAUSTED, true],
    ['rejected', null, null, false],
  ] as const) {
    it(TITLES[key], async () => {
      const view = await ready(); const moments: Moment[] = []; const before = moment(view, moments, 'ready');
      const held = gate(`${key}-reply`); replies.validator.push(held);
      const pending = begin(view, 1, 'Grid Fixture Retry'); await flush(); moment(view, moments, 'pending');
      await act(async () => { if (response) held.resolve(response); else held.reject(new Error('Declared offline fixture')); await pending; });
      const settled = moment(view, moments, 'settled-main'); retain(key, moments);
      expect(settled.main).toEqual(before.main); expect(settled.recordings).toEqual([]); expect(settled.checkingDown).toBe(down);
      expect(settled.toasts).toEqual(message ? [[message]] : []); released(view);
    });
  }

  it(TITLES.overtimeValid, async () => {
    const view = await ready(); const moments: Moment[] = []; moment(view, moments, 'ready');
    const completed = await expire(view, moments); overtime(view, moments);
    queueValid('Grid Fixture Overtime'); await complete(view, 1, 'Grid Fixture Overtime');
    const settled = moment(view, moments, 'settled-overtime'); retain('overtimeValid', moments);
    expect(settled.main).toEqual(completed.main); expect(settled.recordings).toEqual(completed.recordings);
    expect(settled.overtimeCells).toEqual([{ cellIndex: 1, playerName: 'Grid Fixture Overtime', rarity: 20 }]);
    expect(settled.cells[1].playerName).toBe('Grid Fixture Overtime'); expect(settled.overtimeCorrectCount).toBe(1);
    expect(JSON.parse(settled.storage[`soccer-grid-overtime-${getTodayET()}`]!)).toEqual(settled.overtimeCells); released(view);
  });

  it(TITLES.overtimeWrong, async () => {
    const view = await ready(); const moments: Moment[] = []; moment(view, moments, 'ready');
    const completed = await expire(view, moments); overtime(view, moments);
    for (let attempt = 0; attempt < 16; attempt++) {
      replies.validator.push({ data: { valid: false } }); await complete(view, 1, `Grid Fixture Wrong ${attempt}`);
      moment(view, moments, `wrong-${attempt}`);
      await act(async () => { vi.advanceTimersByTime(1_500); });
    }
    const settled = moment(view, moments, 'settled-overtime'); retain('overtimeWrong', moments);
    expect(settled.main).toEqual(completed.main); expect(settled.recordings).toEqual(completed.recordings);
    expect(settled.overtimeCells).toEqual([]); expect(settled.isOvertime).toBe(true);
    expect(requests.filter(request => request.kind === 'validator')).toHaveLength(17); released(view);
  });
});
