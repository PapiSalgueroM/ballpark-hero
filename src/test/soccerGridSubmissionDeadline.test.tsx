import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';
import type { SoccerGridPuzzle } from '@/types/soccerGrid';

const io = vi.hoisted(() => ({
  from: vi.fn(), invoke: vi.fn(), record: vi.fn(), toast: vi.fn(),
  puzzle: {
    id: 'generated-submission-deadline',
    rows: ['Generated Row A', 'Generated Row B', 'Generated Row C'].map(label => ({ label, type: 'misc' as const })),
    cols: ['Generated Column A', 'Generated Column B', 'Generated Column C'].map(label => ({ label, type: 'misc' as const })),
  } as SoccerGridPuzzle,
}));
vi.mock('@/data/soccerGridPuzzles', () => ({ soccerGridPuzzles: [io.puzzle] }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: io.from, functions: { invoke: io.invoke } } }));
vi.mock('@/lib/completions', () => ({ recordCompletion: io.record, getCurrentPlayerName: () => 'Submission Fixture Guest' }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('sonner', () => ({ toast: { error: io.toast, success: vi.fn() } }));
import { useSoccerGrid } from '@/hooks/useSoccerGrid';
import { getTodayET } from '@/lib/dateUtils';

const TITLES = {
  entry: 'GRID_SUBMISSION_ENTRY refuses a new submission after the real deadline without a timer tick',
  validator: 'GRID_SUBMISSION_VALIDATOR expires a late valid reply before any new rarity or selection work',
  rarity: 'GRID_SUBMISSION_RARITY expires after a deferred rarity reply before starting a selection write',
  insert: 'GRID_SUBMISSION_INSERT refuses local settlement after an already-started write completes late',
  wrong: 'GRID_SUBMISSION_WRONG never burns a guess for a late invalid reply while the interval is stale',
  exact: 'GRID_SUBMISSION_EXACT treats the exact epoch deadline as expired before a new request',
  before: 'GRID_SUBMISSION_BEFORE accepts a response that settles one millisecond before the deadline',
  clocks: 'GRID_SUBMISSION_CLOCKS preserves untimed play and the idle first-submission epoch',
  overtime: 'GRID_SUBMISSION_OVERTIME keeps genuine overtime outcomes separate from the main result',
  unverified: 'GRID_SUBMISSION_UNVERIFIED preserves late unverified feedback and the completed main result',
} as const;
type Key = keyof typeof TITLES;
type Reply = { data?: Record<string, unknown> | null; error?: unknown; count?: number };
type Gate = { name: string; settled: boolean; promise: Promise<Reply>; resolve: (reply: Reply) => void };
type View = ReturnType<typeof renderHook<ReturnType<typeof useSoccerGrid>, unknown>>;
const NOW = Date.parse('2026-11-05T17:00:00.000Z');
const EXHAUSTED = 'Answer checking has used up its allowance for today. This guess was not counted; your board is saved, come back tomorrow.';
const raw = { version: 1, scope: 'Real hook and shared daily engine, fictional puzzle and fully mocked transport. Stale-clock cases change Date without advancing timer callbacks.', caseTitles: Object.values(TITLES), cases: {} as Record<string, unknown> };
let requests: Record<string, unknown>[];
let gates: Gate[];
let unexpected: string[];
let clockSteps: Record<string, unknown>[];
let replies: Record<'validator' | 'count' | 'insert', (Reply | Gate)[]>;
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const dailyKey = () => 'soccer-grid-daily-' + getTodayET();
const epochKey = () => 'soccer-grid-timer-started-' + getTodayET();
const expiredKey = () => 'soccer-grid-timer-expired-' + getTodayET();
function gate(name: string): Gate {
  let resolve!: (reply: Reply) => void;
  const promise = new Promise<Reply>(yes => { resolve = yes; });
  const result: Gate = { name, settled: false, promise, resolve: reply => { result.settled = true; resolve(reply); } };
  gates.push(result); return result;
}
function dispatch(kind: keyof typeof replies, details: Record<string, unknown>): Promise<Reply> {
  const next = replies[kind].shift();
  requests.push(copy({ kind, at: Date.now(), ...details, gate: next && 'promise' in next ? next.name : null }));
  if (!next) { unexpected.push('Undeclared ' + kind + ' response'); return Promise.reject(new Error('Undeclared mocked transport')); }
  return 'promise' in next ? next.promise : Promise.resolve(next);
}
function installTransport() {
  io.invoke.mockImplementation((name, options) => dispatch('validator', { name, body: options.body }));
  io.from.mockImplementation((table: string) => {
    if (table === 'soccer_grid_puzzles') return { select: (columns: string) => ({ order: (column: string, options: unknown) => {
      requests.push(copy({ kind: 'puzzles', at: Date.now(), table, columns, column, options }));
      return Promise.resolve({ data: [], error: null });
    } }) };
    if (table !== 'soccer_grid_selections') { unexpected.push('Unexpected table ' + table); throw new Error('Unexpected mocked table'); }
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
function state(view: View) {
  const value = view.result.current;
  return copy({
    main: { cells: value.mainCells, correctCount: value.correctCount, rarityScore: value.rarityScore, guessesLeft: value.guessesLeft, dailyJSON: localStorage.getItem(dailyKey()) },
    gameStatus: value.gameStatus, timeLeft: value.timeLeft, timeUp: value.timeUp,
    timerStartedJSON: localStorage.getItem(epochKey()), timerExpiredJSON: localStorage.getItem(expiredKey()),
    validating: value.validating, activeCell: value.activeCell, checkingDown: value.checkingDown,
    overtimeCells: value.overtimeCells, overtimeCorrectCount: value.overtimeCorrectCount, isOvertime: value.isOvertime,
    recordings: io.record.mock.calls, toasts: io.toast.mock.calls,
    storage: Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])),
  });
}
type Moment = { label: string; at: number; state: ReturnType<typeof state> };
function moment(view: View, moments: Moment[], label: string) {
  const observed = state(view); moments.push({ label, at: Date.now(), state: observed }); return observed;
}
async function flush() { await act(async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); }); }
async function advance(milliseconds: number) {
  const from = Date.now(); await act(async () => { vi.advanceTimersByTime(milliseconds); });
  clockSteps.push({ kind: 'advance-intervals', from, to: Date.now(), milliseconds });
}
function jump(at: number) {
  const from = Date.now(); vi.setSystemTime(at);
  clockSteps.push({ kind: 'set-system-time-only', from, to: Date.now(), timerCallbacksAdvanced: false });
}
function queueValid(name: string) {
  replies.validator.push({ data: { valid: true, fullName: name }, error: null });
  replies.count.push({ count: 9 }, { count: 1 });
  replies.insert.push({ data: null, error: null });
}
function begin(view: View, cell: number, name: string) {
  act(() => view.result.current.setActiveCell(cell));
  let pending!: Promise<void>;
  act(() => { pending = view.result.current.submitGuess(name); }); return pending;
}
async function submit(view: View, cell: number, name: string) {
  const pending = begin(view, cell, name); await act(async () => { await pending; });
}
async function open() {
  const view = renderHook(() => useSoccerGrid()); await flush();
  expect(view.result.current.isLoading, 'GRID_SUBMISSION_SETUP daily loaded').toBe(false);
  expect(view.result.current.isLoadingPool, 'GRID_SUBMISSION_SETUP mocked fetch settled').toBe(false);
  expect(view.result.current.puzzle.id, 'GRID_SUBMISSION_SETUP fictional board selected').toBe(io.puzzle.id);
  return view;
}
async function ready() {
  const view = await open(); act(() => view.result.current.setTimerMode(40));
  queueValid('Generated First'); await submit(view, 0, 'Generated First');
  expect(view.result.current.correctCount, 'GRID_SUBMISSION_SETUP first answer accepted').toBe(1);
  expect(view.result.current.rarityScore, 'GRID_SUBMISSION_SETUP original rarity').toBe(20);
  expect(localStorage.getItem(epochKey()), 'GRID_SUBMISSION_SETUP first submission epoch').toBe(String(NOW));
  expect(io.record, 'GRID_SUBMISSION_SETUP main still playing').not.toHaveBeenCalled();
  return view;
}
function stale(view: View, moments: Moment[], at = NOW + 40_001) {
  jump(at);
  const value = moment(view, moments, 'past-deadline-without-tick');
  expect(value.timeLeft, 'GRID_SUBMISSION_SETUP displayed interval remains one second').toBe(1);
  expect(value.gameStatus, 'GRID_SUBMISSION_SETUP interval status is still playing').toBe('playing');
  expect(value.timeUp, 'GRID_SUBMISSION_SETUP no expiry callback has fired').toBe(false);
  expect(value.timerExpiredJSON, 'GRID_SUBMISSION_SETUP expiry is not yet persisted').toBeNull();
  return value;
}
function retain(key: Key, moments: Moment[]) {
  raw.cases[key] = copy({ title: TITLES[key], moments, requests, clockSteps, gates: gates.map(({ name, settled }) => ({ name, settled })), unexpected });
  expect(unexpected, 'GRID_SUBMISSION_SETUP only declared mock transport used').toEqual([]);
  expect(gates.every(item => item.settled), 'GRID_SUBMISSION_SETUP all deferred replies released').toBe(true);
}
async function reload(view: View, moments: Moment[]) {
  view.unmount(); const restored = await open(); moment(restored, moments, 'literal-remount'); return restored;
}
function ended(view: View, before: ReturnType<typeof state>, marker: string) {
  const value = state(view);
  expect(value.gameStatus === 'complete' && value.timeUp && value.timerExpiredJSON === '1', marker + ' real deadline settles without waiting for a timer tick').toBe(true);
  expect(value.main, marker + ' exact committed main result held').toEqual(before.main);
  expect(value.timerStartedJSON, marker + ' original epoch held').toBe(String(NOW));
  expect(value.recordings, marker + ' completion exactly once').toEqual([['/soccer-grid', 100, 'Submission Fixture Guest', 0]]);
}

beforeEach(async () => {
  await act(async () => undefined);
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] }); vi.setSystemTime(NOW);
  localStorage.clear(); requests = []; gates = []; unexpected = []; clockSteps = [];
  replies = { validator: [], count: [], insert: [] }; vi.clearAllMocks(); installTransport();
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
afterAll(() => {
  const destination = process.env.SC_GRID_SUBMISSION_DEADLINE_RAW;
  if (!destination) return;
  if (!isAbsolute(destination)) throw new Error('SC_GRID_SUBMISSION_DEADLINE_RAW must be absolute');
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, JSON.stringify(raw, null, 2) + '\n', { flag: 'wx' });
});

describe('Soccer Grid real submission deadline', () => {
  it(TITLES.entry, async () => {
    const view = await ready(), moments: Moment[] = [];
    await advance(39_000); act(() => view.result.current.setActiveCell(1));
    const before = stale(view, moments); queueValid('Generated Too Late');
    let pending!: Promise<void>; act(() => { pending = view.result.current.submitGuess('Generated Too Late'); });
    await act(async () => { await pending; }); moment(view, moments, 'entry-returned');
    const settled = state(view), restored = await reload(view, moments); retain('entry', moments);
    expect(settled.gameStatus === 'complete' && settled.timeUp && settled.timerExpiredJSON === '1', 'GRID_SUBMISSION_ENTRY real deadline closes the main round').toBe(true);
    expect(settled.main, 'GRID_SUBMISSION_ENTRY main result held').toEqual(before.main);
    expect(requests.filter(item => item.kind === 'validator'), 'GRID_SUBMISSION_ENTRY no second validation request').toHaveLength(1);
    expect(requests.filter(item => item.kind === 'insert'), 'GRID_SUBMISSION_ENTRY no new selection write initiated').toHaveLength(1);
    expect(settled.recordings, 'GRID_SUBMISSION_ENTRY completion recorded before remount').toEqual([['/soccer-grid', 100, 'Submission Fixture Guest', 0]]);
    ended(restored, before, 'GRID_SUBMISSION_ENTRY');
  });

  it(TITLES.validator, async () => {
    const view = await ready(), moments: Moment[] = []; await advance(39_000);
    const held = gate('late-valid-validator'); replies.validator.push(held); replies.count.push({ count: 9 }, { count: 1 }); replies.insert.push({ data: null, error: null });
    const pending = begin(view, 1, 'Generated Late Valid'); await flush();
    expect(requests.some(item => item.gate === held.name) && view.result.current.validating, 'GRID_SUBMISSION_SETUP validator really pending').toBe(true);
    const before = stale(view, moments);
    await act(async () => { held.resolve({ data: { valid: true, fullName: 'Generated Late Valid' }, error: null }); await pending; });
    moment(view, moments, 'validator-settled'); const settled = state(view), restored = await reload(view, moments); retain('validator', moments);
    expect(settled.gameStatus === 'complete' && settled.timeUp && settled.timerExpiredJSON === '1', 'GRID_SUBMISSION_VALIDATOR expires at the response boundary').toBe(true);
    expect(settled.main, 'GRID_SUBMISSION_VALIDATOR late success adds no action').toEqual(before.main);
    expect(requests.filter(item => item.kind === 'count'), 'GRID_SUBMISSION_VALIDATOR no new rarity reads').toHaveLength(2);
    expect(requests.filter(item => item.kind === 'insert'), 'GRID_SUBMISSION_VALIDATOR no new selection write').toHaveLength(1);
    expect(settled.recordings, 'GRID_SUBMISSION_VALIDATOR completion recorded before remount').toEqual([['/soccer-grid', 100, 'Submission Fixture Guest', 0]]);
    ended(restored, before, 'GRID_SUBMISSION_VALIDATOR');
  });

  it(TITLES.rarity, async () => {
    const view = await ready(), moments: Moment[] = []; await advance(39_000);
    const held = gate('late-rarity-count'); replies.validator.push({ data: { valid: true, fullName: 'Generated Late Rarity' }, error: null });
    replies.count.push(held, { count: 1 }); replies.insert.push({ data: null, error: null });
    const pending = begin(view, 1, 'Generated Late Rarity'); await flush();
    expect(requests.some(item => item.gate === held.name), 'GRID_SUBMISSION_SETUP rarity really pending').toBe(true);
    const before = stale(view, moments);
    await act(async () => { held.resolve({ count: 9 }); await pending; });
    moment(view, moments, 'rarity-settled'); const settled = state(view), restored = await reload(view, moments); retain('rarity', moments);
    expect(settled.gameStatus === 'complete' && settled.timeUp && settled.timerExpiredJSON === '1', 'GRID_SUBMISSION_RARITY expires after the count await').toBe(true);
    expect(settled.main, 'GRID_SUBMISSION_RARITY main action ledger held').toEqual(before.main);
    expect(requests.filter(item => item.kind === 'insert'), 'GRID_SUBMISSION_RARITY no selection write initiated after deadline').toHaveLength(1);
    expect(settled.recordings, 'GRID_SUBMISSION_RARITY completion recorded before remount').toEqual([['/soccer-grid', 100, 'Submission Fixture Guest', 0]]);
    ended(restored, before, 'GRID_SUBMISSION_RARITY');
  });

  it(TITLES.insert, async () => {
    const view = await ready(), moments: Moment[] = []; await advance(39_000);
    const held = gate('already-started-insert'); replies.validator.push({ data: { valid: true, fullName: 'Generated Late Write' }, error: null });
    replies.count.push({ count: 9 }, { count: 1 }); replies.insert.push(held);
    const pending = begin(view, 1, 'Generated Late Write'); await flush();
    const initiated = requests.filter(item => item.kind === 'insert');
    expect(initiated, 'GRID_SUBMISSION_SETUP both writes initiated before clock jump').toHaveLength(2);
    expect(initiated[1].at, 'GRID_SUBMISSION_SETUP pending write started before deadline').toBe(NOW + 39_000);
    const before = stale(view, moments);
    await act(async () => { held.resolve({ data: null, error: null }); await pending; });
    moment(view, moments, 'insert-response-settled'); const settled = state(view), restored = await reload(view, moments); retain('insert', moments);
    expect(settled.gameStatus === 'complete' && settled.timeUp && settled.timerExpiredJSON === '1', 'GRID_SUBMISSION_INSERT expires after the already-started write').toBe(true);
    expect(settled.main, 'GRID_SUBMISSION_INSERT late response never appends locally').toEqual(before.main);
    expect(requests.filter(item => item.kind === 'insert'), 'GRID_SUBMISSION_INSERT no rollback or extra write claimed').toHaveLength(2);
    expect(settled.recordings, 'GRID_SUBMISSION_INSERT completion recorded before remount').toEqual([['/soccer-grid', 100, 'Submission Fixture Guest', 0]]);
    ended(restored, before, 'GRID_SUBMISSION_INSERT');
  });

  it(TITLES.wrong, async () => {
    const view = await ready(), moments: Moment[] = []; await advance(39_000);
    const held = gate('late-invalid-validator'); replies.validator.push(held);
    const pending = begin(view, 1, 'Generated Late Wrong'); await flush();
    expect(requests.some(item => item.gate === held.name) && view.result.current.validating, 'GRID_SUBMISSION_SETUP invalid validator really pending').toBe(true);
    const before = stale(view, moments);
    await act(async () => { held.resolve({ data: { valid: false }, error: null }); await pending; });
    moment(view, moments, 'invalid-settled'); const settled = state(view), restored = await reload(view, moments); retain('wrong', moments);
    expect(settled.gameStatus === 'complete' && settled.timeUp && settled.timerExpiredJSON === '1', 'GRID_SUBMISSION_WRONG real deadline closes before a wrong charge').toBe(true);
    expect(settled.main, 'GRID_SUBMISSION_WRONG no burned guess or wrong flash').toEqual(before.main);
    expect(requests.filter(item => item.kind === 'insert'), 'GRID_SUBMISSION_WRONG no extra write').toHaveLength(1);
    expect(settled.recordings, 'GRID_SUBMISSION_WRONG completion recorded before remount').toEqual([['/soccer-grid', 100, 'Submission Fixture Guest', 0]]);
    ended(restored, before, 'GRID_SUBMISSION_WRONG');
  });

  it(TITLES.exact, async () => {
    const view = await ready(), moments: Moment[] = [];
    await advance(39_000); act(() => view.result.current.setActiveCell(1));
    const before = stale(view, moments, NOW + 40_000); queueValid('Generated Exact Deadline');
    let pending!: Promise<void>; act(() => { pending = view.result.current.submitGuess('Generated Exact Deadline'); });
    await act(async () => { await pending; }); moment(view, moments, 'exact-entry-returned');
    const settled = state(view), restored = await reload(view, moments); retain('exact', moments);
    expect(settled.gameStatus === 'complete' && settled.timeUp && settled.timerExpiredJSON === '1', 'GRID_SUBMISSION_EXACT inclusive deadline is expired').toBe(true);
    expect(settled.main, 'GRID_SUBMISSION_EXACT exact boundary action refused').toEqual(before.main);
    expect(requests.filter(item => item.kind === 'validator'), 'GRID_SUBMISSION_EXACT no extra validation').toHaveLength(1);
    expect(requests.filter(item => item.kind === 'insert'), 'GRID_SUBMISSION_EXACT no extra write').toHaveLength(1);
    expect(settled.recordings, 'GRID_SUBMISSION_EXACT completion recorded before remount').toEqual([['/soccer-grid', 100, 'Submission Fixture Guest', 0]]);
    ended(restored, before, 'GRID_SUBMISSION_EXACT');
  });

  it(TITLES.before, async () => {
    const view = await ready(), moments: Moment[] = []; await advance(39_000);
    act(() => view.result.current.setActiveCell(1)); jump(NOW + 39_999); moment(view, moments, 'one-millisecond-before');
    queueValid('Generated Just Before');
    let pending!: Promise<void>; act(() => { pending = view.result.current.submitGuess('Generated Just Before'); });
    await act(async () => { await pending; }); const settled = moment(view, moments, 'timely-settled'); retain('before', moments);
    expect(settled.main.correctCount, 'GRID_SUBMISSION_BEFORE timely answer counted').toBe(2);
    expect(settled.main.guessesLeft, 'GRID_SUBMISSION_BEFORE exactly two correct submissions').toBe(13);
    expect(JSON.parse(settled.main.dailyJSON!).guesses, 'GRID_SUBMISSION_BEFORE exact timely ledger').toEqual([
      { t: 'ok', cellIndex: 0, playerName: 'Generated First', rarity: 20 },
      { t: 'ok', cellIndex: 1, playerName: 'Generated Just Before', rarity: 20 },
    ]);
    expect(settled.gameStatus, 'GRID_SUBMISSION_BEFORE not expired early').toBe('playing');
    expect(settled.timerExpiredJSON, 'GRID_SUBMISSION_BEFORE no early expiry marker').toBeNull();
    expect(settled.recordings, 'GRID_SUBMISSION_BEFORE no early completion').toEqual([]);
  });

  it(TITLES.clocks, async () => {
    const moments: Moment[] = [];
    const untimed = await open(); jump(NOW + 120_000); queueValid('Generated Untimed'); await submit(untimed, 0, 'Generated Untimed');
    const free = moment(untimed, moments, 'untimed-settled'); untimed.unmount();
    localStorage.clear(); jump(NOW); const timed = await open(); act(() => timed.result.current.setTimerMode(40));
    jump(NOW + 1_234); const idle = moment(timed, moments, 'idle-before-first-submission');
    queueValid('Generated Idle First'); await submit(timed, 0, 'Generated Idle First');
    const first = moment(timed, moments, 'idle-first-settled'); retain('clocks', moments);
    expect([free.timeLeft, free.timerStartedJSON, free.timerExpiredJSON], 'GRID_SUBMISSION_CLOCKS untimed has no clock writes').toEqual([null, null, null]);
    expect(free.main.correctCount, 'GRID_SUBMISSION_CLOCKS untimed success still works').toBe(1);
    expect(free.gameStatus, 'GRID_SUBMISSION_CLOCKS untimed remains playing').toBe('playing');
    expect([idle.timeLeft, idle.timerStartedJSON], 'GRID_SUBMISSION_CLOCKS idle has not started').toEqual([null, null]);
    expect(first.timerStartedJSON, 'GRID_SUBMISSION_CLOCKS epoch begins at the real first submission').toBe(String(NOW + 1_234));
    expect(first.timeLeft, 'GRID_SUBMISSION_CLOCKS full initial allowance preserved').toBe(40);
    expect(first.main.correctCount, 'GRID_SUBMISSION_CLOCKS timely first answer counted').toBe(1);
    expect(first.recordings, 'GRID_SUBMISSION_CLOCKS no premature completion').toEqual([]);
  });

  it(TITLES.overtime, async () => {
    const view = await ready(), moments: Moment[] = [];
    await advance(40_000); const completed = moment(view, moments, 'main-complete');
    act(() => view.result.current.startOvertime()); queueValid('Generated Overtime');
    await submit(view, 1, 'Generated Overtime'); moment(view, moments, 'overtime-valid');
    replies.validator.push({ data: { valid: false }, error: null }); await submit(view, 2, 'Generated Overtime Wrong');
    await advance(1_500); const settled = moment(view, moments, 'overtime-invalid-flash-cleared'); retain('overtime', moments);
    expect(settled.main, 'GRID_SUBMISSION_OVERTIME main result frozen').toEqual(completed.main);
    expect(settled.recordings, 'GRID_SUBMISSION_OVERTIME no second completion').toEqual(completed.recordings);
    expect(settled.overtimeCells, 'GRID_SUBMISSION_OVERTIME genuine correct choice retained').toEqual([{ cellIndex: 1, playerName: 'Generated Overtime', rarity: 20 }]);
    expect(settled.overtimeCorrectCount, 'GRID_SUBMISSION_OVERTIME wrong guess remains unscored').toBe(1);
    expect(settled.isOvertime, 'GRID_SUBMISSION_OVERTIME practice remains active').toBe(true);
  });

  it(TITLES.unverified, async () => {
    const view = await ready(), moments: Moment[] = []; await advance(39_000);
    const held = gate('unverified-after-committed-expiry'); replies.validator.push(held);
    const pending = begin(view, 1, 'Generated Retry'); await flush();
    expect(requests.some(item => item.gate === held.name) && view.result.current.validating, 'GRID_SUBMISSION_SETUP unverified validator really pending').toBe(true);
    await advance(1_000); const completed = moment(view, moments, 'main-complete-before-retry');
    await act(async () => { held.resolve({ data: { valid: false, unverified: true, exhausted: true }, error: null }); await pending; });
    const settled = moment(view, moments, 'late-unverified-settled'); retain('unverified', moments);
    expect(settled.main, 'GRID_SUBMISSION_UNVERIFIED main result frozen').toEqual(completed.main);
    expect(settled.recordings, 'GRID_SUBMISSION_UNVERIFIED once-only completion held').toEqual(completed.recordings);
    expect(settled.toasts, 'GRID_SUBMISSION_UNVERIFIED existing exhaustion feedback held').toEqual([[EXHAUSTED]]);
    expect(settled.checkingDown, 'GRID_SUBMISSION_UNVERIFIED existing checking status held').toBe(true);
    expect(settled.main.guessesLeft, 'GRID_SUBMISSION_UNVERIFIED retry costs no guess').toBe(14);
  });
});
