import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';

const io = vi.hoisted(() => ({ from: vi.fn(), invoke: vi.fn(), record: vi.fn(), toast: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: io.from, functions: { invoke: io.invoke } } }));
vi.mock('@/lib/completions', () => ({ recordCompletion: io.record, getCurrentPlayerName: () => 'Grid Timer Fixture Guest' }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('sonner', () => ({ toast: { error: io.toast, success: vi.fn() } }));
import { useSoccerGrid } from '@/hooks/useSoccerGrid';
import { getTodayET } from '@/lib/dateUtils';
import type { SoccerGridTimerMode } from '@/lib/soccerGridDifficulty';

const TITLES = {
  idle750: 'an idle 40 second game starts at 40 before its first tick',
  idleModes: 'every timed mode starts at its selected duration after a long idle',
  immediate: 'an immediate first answer starts the ordinary countdown',
  refresh: 'a refreshed timed game resumes its original saved epoch',
  unlimited: 'Unlimited never starts a clock after idle or guesses',
  retry: 'unverified retries keep the first submission epoch',
  deadline: 'timer expiry records once and rejects a pending late main answer',
} as const;
type Key = keyof typeof TITLES;
type Reply = { data?: Record<string, unknown>; error?: unknown; count?: number };
type Gate = { name: string; settled: boolean; promise: Promise<Reply>; resolve: (reply: Reply) => void };
const NOW = Date.parse('2026-10-17T12:00:00.000Z');
const RETRY = "Couldn't verify that answer, please try again.";
const UNVERIFIED: Reply = { data: { valid: false, unverified: true }, error: null };
const raw = { version: 1, caseTitles: Object.values(TITLES), cases: {} as Record<string, unknown> };
let requests: Record<string, unknown>[];
let deferred: Gate[];
let pending: Promise<void>[];
let unexpected: string[];
let draws: number[];
let clockSteps: { from: number; by: number; to: number }[];
let replies: Record<'validator' | 'count' | 'insert', (Reply | Gate)[]>;
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const settingsKey = () => `soccer-grid-settings-${getTodayET()}`;
const dailyKey = () => `soccer-grid-daily-${getTodayET()}`;
const timerKey = () => `soccer-grid-timer-started-${getTodayET()}`;
const expiredKey = () => `soccer-grid-timer-expired-${getTodayET()}`;
function gate(name: string): Gate {
  let resolve!: (reply: Reply) => void;
  const promise = new Promise<Reply>(yes => { resolve = yes; });
  const entry = { name, settled: false, promise, resolve: (reply: Reply) => { entry.settled = true; resolve(reply); } };
  deferred.push(entry); return entry;
}
function dispatch(kind: keyof typeof replies, details: Record<string, unknown>): Promise<Reply> {
  const next = replies[kind].shift();
  requests.push(copy({ kind, ...details, deferred: next && 'promise' in next ? next.name : null }));
  if (!next) { unexpected.push(`No declared ${kind} response`); return Promise.reject(new Error(`No declared ${kind} response`)); }
  return 'promise' in next ? next.promise : Promise.resolve(next);
}
function installTransport() {
  io.invoke.mockImplementation((name, options) => dispatch('validator', { name, body: options.body }));
  io.from.mockImplementation((table: string) => {
    if (table === 'soccer_grid_puzzles') return { select: (columns: string) => ({ order: (column: string, options: unknown) => {
      requests.push(copy({ kind: 'puzzles', table, columns, column, options }));
      return Promise.resolve({ data: [], error: null });
    } }) };
    if (table !== 'soccer_grid_selections') { unexpected.push(`Unexpected table ${table}`); throw new Error(`Unexpected table ${table}`); }
    return {
      select: (columns: string, options: unknown) => {
        const filters: [string, unknown][] = [];
        const query = { eq: (column: string, value: unknown) => { filters.push([column, value]); return query; },
          then: (yes: (reply: Reply) => unknown, no: (error: unknown) => unknown) => dispatch('count', { table, columns, options, filters }).then(yes, no) };
        return query;
      },
      insert: (body: unknown) => dispatch('insert', { table, body }),
    };
  });
}
type View = ReturnType<typeof renderHook<ReturnType<typeof useSoccerGrid>, unknown>>;
function state(view: View) {
  const current = view.result.current;
  return copy({ puzzle: current.puzzle, activeCell: current.activeCell, validating: current.validating,
    gameStatus: current.gameStatus, guessesLeft: current.guessesLeft, correctCount: current.correctCount, rarityScore: current.rarityScore,
    isLoading: current.isLoading, isLoadingPool: current.isLoadingPool, checkingDown: current.checkingDown,
    cells: current.cells, mainCells: current.mainCells, settings: current.settings, settingsLoaded: current.settingsLoaded,
    timeLeft: current.timeLeft, timeUp: current.timeUp, overtimeActive: current.overtimeActive, isOvertime: current.isOvertime,
    overtimeCells: current.overtimeCells, overtimeCorrectCount: current.overtimeCorrectCount,
    storage: Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])),
    session: Object.fromEntries(Object.keys(sessionStorage).sort().map(key => [key, sessionStorage.getItem(key)])),
    dailyJSON: localStorage.getItem(dailyKey()), timerStartedJSON: localStorage.getItem(timerKey()), timerExpiredJSON: localStorage.getItem(expiredKey()),
    recordings: io.record.mock.calls, toasts: io.toast.mock.calls });
}
type Moment = { label: string; at: number; state: ReturnType<typeof state> };
function moment(view: View, moments: Moment[], label: string) {
  const value = state(view); moments.push({ label, at: Date.now(), state: value }); return value;
}
async function flush() { await act(async () => { for (let i = 0; i < 16; i++) await Promise.resolve(); }); }
async function advance(by: number) {
  const from = Date.now(); await act(async () => { vi.advanceTimersByTime(by); }); clockSteps.push({ from, by, to: Date.now() });
}
async function ready(mode: SoccerGridTimerMode = 40) {
  localStorage.setItem(settingsKey(), JSON.stringify({ difficulty: 'easy', timerMode: mode }));
  const view = renderHook(() => useSoccerGrid()); await flush();
  expect(view.result.current.isLoading).toBe(false); expect(view.result.current.isLoadingPool).toBe(false);
  expect(view.result.current.puzzle.rows).toHaveLength(3); expect(view.result.current.puzzle.cols).toHaveLength(3); return view;
}
function begin(view: View, cell: number, playerName: string, reply: Reply | Gate) {
  replies.validator.push(reply); act(() => view.result.current.setActiveCell(cell));
  let request!: Promise<void>; act(() => { request = view.result.current.submitGuess(playerName); }); pending.push(request); return request;
}
function valid(view: View, cell: number, name: string) {
  replies.count.push({ count: 9 }, { count: 1 }); replies.insert.push({ data: null, error: null });
  return begin(view, cell, name, { data: { valid: true, fullName: name }, error: null });
}
async function settle(entry: Gate, request: Promise<void>, reply: Reply = UNVERIFIED) {
  await act(async () => { entry.resolve(reply); await request; });
}
async function drain() {
  await act(async () => { for (const entry of deferred) if (!entry.settled) entry.resolve(UNVERIFIED); await Promise.all(pending); });
}
function retain(key: Key, moments: Moment[]) {
  raw.cases[key] = copy({ title: TITLES[key], moments, requests, deferred: deferred.map(({ name, settled }) => ({ name, settled })), unexpected, draws, clockSteps });
}
function clean() { expect(unexpected).toEqual([]); expect(deferred.every(entry => entry.settled)).toBe(true); }
beforeEach(async () => {
  await act(async () => undefined); vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] }); vi.setSystemTime(NOW);
  localStorage.clear(); sessionStorage.clear(); requests = []; deferred = []; pending = []; unexpected = []; draws = []; clockSteps = [];
  replies = { validator: [], count: [], insert: [] }; installTransport();
  vi.spyOn(Math, 'random').mockImplementation(() => { draws.push(0.25); return 0.25; });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });
afterAll(() => {
  const destination = process.env.SC_GRID_INITIAL_TIMER_RAW; if (!destination) return;
  if (!isAbsolute(destination)) throw new Error('SC_GRID_INITIAL_TIMER_RAW must be absolute');
  mkdirSync(dirname(destination), { recursive: true }); writeFileSync(destination, JSON.stringify(raw, null, 2) + '\n', { flag: 'wx' });
});

describe('Soccer Grid starts its clock at the first submission', () => {
  it(TITLES.idle750, async () => {
    const moments: Moment[] = []; let started!: ReturnType<typeof state>; let beforeTick!: ReturnType<typeof state>; let ticked!: ReturnType<typeof state>;
    try {
      const view = await ready(); moment(view, moments, 'ready'); await advance(750); moment(view, moments, 'idle-before-first-guess');
      const held = gate('first-validator'); const request = begin(view, 0, 'Grid Timer First', held); started = moment(view, moments, 'first-submission');
      await advance(999); beforeTick = moment(view, moments, 'before-first-tick'); await advance(1); ticked = moment(view, moments, 'first-tick');
      await settle(held, request); moment(view, moments, 'unverified-released');
    } finally { await drain(); retain('idle750', moments); }
    clean(); expect(started.timeLeft === 40, 'GRID_INITIAL_TIMER_IDLE_FIRST_TICK').toBe(true);
    expect(started.timerStartedJSON).toBe(String(NOW + 750)); expect(started.validating).toBe(true);
    expect(beforeTick.timeLeft).toBe(40); expect(ticked.timeLeft).toBe(39); expect(started.guessesLeft).toBe(15);
  });
  it(TITLES.idleModes, async () => {
    const moments: Moment[] = []; const observed: { mode: number; first: number | null; beforeTick: number | null; tick: number | null; epoch: string | null; expectedEpoch: number }[] = [];
    try {
      for (const mode of [40, 60, 90] as const) {
        localStorage.clear(); sessionStorage.clear(); const view = await ready(mode); moment(view, moments, `${mode}-ready`); await advance(3500);
        const expectedEpoch = Date.now(); const held = gate(`${mode}-validator`); const request = begin(view, 0, `Grid Timer ${mode}`, held);
        const first = moment(view, moments, `${mode}-first-submission`); await advance(999); const beforeTick = moment(view, moments, `${mode}-before-first-tick`);
        await advance(1); const tick = moment(view, moments, `${mode}-first-tick`); await settle(held, request); moment(view, moments, `${mode}-released`);
        observed.push({ mode, first: first.timeLeft, beforeTick: beforeTick.timeLeft, tick: tick.timeLeft, epoch: first.timerStartedJSON, expectedEpoch }); view.unmount();
      }
    } finally { await drain(); retain('idleModes', moments); }
    clean(); expect(observed.every(row => row.first === row.mode), 'GRID_INITIAL_TIMER_LONG_IDLE_MODES').toBe(true);
    expect(observed).toHaveLength(3); for (const row of observed) { expect(row.beforeTick).toBe(row.mode); expect(row.tick).toBe(row.mode - 1); expect(row.epoch).toBe(String(row.expectedEpoch)); }
  });
  it(TITLES.immediate, async () => {
    const moments: Moment[] = []; let first!: ReturnType<typeof state>; let tick!: ReturnType<typeof state>;
    try {
      const view = await ready(); moment(view, moments, 'ready'); const request = valid(view, 0, 'Grid Timer Immediate'); await act(async () => { await request; });
      first = moment(view, moments, 'first-answer'); await advance(1000); tick = moment(view, moments, 'first-tick');
    } finally { await drain(); retain('immediate', moments); }
    clean(); expect(first.timeLeft).toBe(40); expect(first.timerStartedJSON).toBe(String(NOW)); expect(first.correctCount).toBe(1);
    expect(first.rarityScore).toBe(20); expect(first.guessesLeft).toBe(14); expect(first.recordings).toEqual([]); expect(tick.timeLeft).toBe(39);
  });
  it(TITLES.refresh, async () => {
    const moments: Moment[] = []; let before!: ReturnType<typeof state>; let restored!: ReturnType<typeof state>; let tick!: ReturnType<typeof state>;
    try {
      const view = await ready(); const request = valid(view, 0, 'Grid Timer Refresh'); await act(async () => { await request; }); await advance(12500);
      before = moment(view, moments, 'before-refresh'); view.unmount(); await advance(2500);
      const next = await ready(); restored = moment(next, moments, 'refreshed'); await advance(1000); tick = moment(next, moments, 'refreshed-tick');
    } finally { await drain(); retain('refresh', moments); }
    clean(); expect(before.timeLeft).toBe(28); expect(restored.timeLeft).toBe(25); expect(tick.timeLeft).toBe(24);
    expect(restored.timerStartedJSON).toBe(String(NOW)); expect(restored.dailyJSON).toBe(before.dailyJSON); expect(restored.correctCount).toBe(1); expect(restored.recordings).toEqual([]);
  });
  it(TITLES.unlimited, async () => {
    const moments: Moment[] = []; let first!: ReturnType<typeof state>; let later!: ReturnType<typeof state>;
    try {
      const view = await ready(0); moment(view, moments, 'ready'); await advance(3500); const request = valid(view, 0, 'Grid Timer Unlimited');
      await act(async () => { await request; }); first = moment(view, moments, 'first-answer'); await advance(120000); later = moment(view, moments, 'later');
    } finally { await drain(); retain('unlimited', moments); }
    clean(); for (const value of [first, later]) { expect(value.timeLeft).toBeNull(); expect(value.timerStartedJSON).toBeNull(); expect(value.timerExpiredJSON).toBeNull(); expect(value.timeUp).toBe(false); expect(value.gameStatus).toBe('playing'); expect(value.correctCount).toBe(1); expect(value.recordings).toEqual([]); }
  });
  it(TITLES.retry, async () => {
    const moments: Moment[] = []; let first!: ReturnType<typeof state>; let retrying!: ReturnType<typeof state>; let released!: ReturnType<typeof state>;
    try {
      const view = await ready(); const firstGate = gate('first-unverified'); const firstRequest = begin(view, 0, 'Grid Timer Retry', firstGate);
      await settle(firstGate, firstRequest); first = moment(view, moments, 'first-unverified-released'); await advance(2100);
      const retryGate = gate('retry-unverified'); const retryRequest = begin(view, 0, 'Grid Timer Retry', retryGate); retrying = moment(view, moments, 'retry-pending');
      await advance(900); await settle(retryGate, retryRequest); released = moment(view, moments, 'retry-released');
    } finally { await drain(); retain('retry', moments); }
    clean(); expect(first.timeLeft).toBe(40); expect(retrying.timeLeft).toBe(38); expect(released.timeLeft).toBe(37);
    for (const value of [first, retrying, released]) { expect(value.timerStartedJSON).toBe(String(NOW)); expect(value.guessesLeft).toBe(15); expect(value.correctCount).toBe(0); expect(value.recordings).toEqual([]); }
    expect(released.dailyJSON).toBe(first.dailyJSON); expect(released.toasts).toEqual([[RETRY], [RETRY]]); expect(released.validating).toBe(false); expect(released.activeCell).toBeNull();
  });
  it(TITLES.deadline, async () => {
    const moments: Moment[] = []; let completed!: ReturnType<typeof state>; let released!: ReturnType<typeof state>; let restored!: ReturnType<typeof state>;
    try {
      const view = await ready(); const first = valid(view, 0, 'Grid Timer Counted'); await act(async () => { await first; }); await advance(39000); moment(view, moments, 'one-second-left');
      const held = gate('late-validator'); const request = begin(view, 1, 'Grid Timer Late', held); moment(view, moments, 'late-answer-pending'); await advance(1000);
      completed = moment(view, moments, 'completed-main'); await settle(held, request, { data: { valid: true, fullName: 'Grid Timer Late' }, error: null });
      released = moment(view, moments, 'late-answer-released'); view.unmount(); const next = await ready(); restored = moment(next, moments, 'expired-refresh');
    } finally { await drain(); retain('deadline', moments); }
    clean(); expect(completed.timeLeft).toBe(0); expect(completed.timeUp).toBe(true); expect(completed.gameStatus).toBe('complete');
    expect(completed.recordings).toEqual([['/soccer-grid', 100, 'Grid Timer Fixture Guest', 0]]);
    for (const value of [released, restored]) { expect(value.dailyJSON).toBe(completed.dailyJSON); expect(value.mainCells).toEqual(completed.mainCells); expect(value.correctCount).toBe(1); expect(value.rarityScore).toBe(20); expect(value.recordings).toEqual(completed.recordings); expect(value.gameStatus).toBe('complete'); expect(value.timerStartedJSON).toBe(String(NOW)); expect(value.timerExpiredJSON).toBe('1'); }
    expect(released.validating).toBe(false); expect(released.activeCell).toBeNull(); expect(requests.filter(row => row.kind === 'count')).toHaveLength(2); expect(requests.filter(row => row.kind === 'insert')).toHaveLength(1);
  });
});
