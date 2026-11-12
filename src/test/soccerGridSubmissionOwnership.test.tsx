import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';

const fixture = vi.hoisted(() => ({
  puzzle: {
    id: 'generated-submission-ownership',
    rows: Array.from({ length: 3 }, (_, i) => ({ label: 'Generated Row ' + i, type: 'club' as const })),
    cols: Array.from({ length: 3 }, (_, i) => ({ label: 'Generated Column ' + i, type: 'club' as const })),
  },
  from: vi.fn(), invoke: vi.fn(), record: vi.fn(), toast: vi.fn(),
}));
vi.mock('@/data/soccerGridPuzzles', () => ({ soccerGridPuzzles: [fixture.puzzle] }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: fixture.from, functions: { invoke: fixture.invoke } } }));
vi.mock('@/lib/completions', () => ({ recordCompletion: fixture.record, getCurrentPlayerName: () => 'Generated Grid Guest' }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('sonner', () => ({ toast: { error: fixture.toast, success: vi.fn() } }));
import { useSoccerGrid } from '@/hooks/useSoccerGrid';
import { getTodayET } from '@/lib/dateUtils';

const TITLES = {
  validator: 'SG_OWNERSHIP_VALIDATOR ignores a pending success for a cell another tab filled',
  rarity: 'SG_OWNERSHIP_RARITY ignores a success whose rarity read waited while another tab filled its cell',
  insert: 'SG_OWNERSHIP_INSERT does not append a duplicate after an already initiated write resolves',
  wrong: 'SG_OWNERSHIP_WRONG does not burn a guess or flash a filled cell after a late invalid verdict',
  batch: 'SG_OWNERSHIP_BATCH reads adopted progress before React renders the storage event',
  rules: 'SG_OWNERSHIP_RULES refuses an old callback after settings change in the same batch',
  valid: 'SG_OWNERSHIP_PRESERVE_VALID keeps an ordinary untimed success and its complete save',
  invalid: 'SG_OWNERSHIP_PRESERVE_WRONG keeps ordinary wrong-guess cost and flash cleanup',
  retry: 'SG_OWNERSHIP_PRESERVE_RETRY keeps an unverified answer free',
  exhausted: 'SG_OWNERSHIP_PRESERVE_EXHAUSTED keeps exhausted checking free',
  rejected: 'SG_OWNERSHIP_PRESERVE_REJECTED keeps a rejected validator free',
  ninth: 'SG_OWNERSHIP_PRESERVE_NINTH commits a genuinely distinct ninth cell and records 900 once',
  overtimeValid: 'SG_OWNERSHIP_PRESERVE_OVERTIME_VALID keeps a genuine Overtime success separate',
  overtimeWrong: 'SG_OWNERSHIP_PRESERVE_OVERTIME_WRONG keeps repeated Overtime misses unlimited',
} as const;
type Key = keyof typeof TITLES;
type Kind = 'validator' | 'count' | 'insert';
type Reply = { data?: Record<string, unknown>; error?: unknown; count?: number };
type Gate = { name: string; settled: boolean; promise: Promise<Reply>; resolve: (reply: Reply) => void; reject: (error: Error) => void };
type View = ReturnType<typeof renderHook<ReturnType<typeof useSoccerGrid>, unknown>>;
const NOW = Date.parse('2026-11-05T17:00:00Z');
const VALID = (name: string): Reply => ({ data: { valid: true, fullName: name }, error: null });
const RETRY = "Couldn't verify that answer, please try again.";
const EXHAUSTED = 'Answer checking has used up its allowance for today. This guess was not counted; your board is saved, come back tomorrow.';
const raw = { version: 1, fixture: fixture.puzzle, caseTitles: Object.values(TITLES), cases: {} as Record<string, unknown> };
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const dailyKey = () => 'soccer-grid-daily-' + getTodayET();
const ownerName = (cell: number) => 'Generated Owner ' + cell;
const ownerActions = () => Array.from({ length: 8 }, (_, cellIndex) => ({ t: 'ok', cellIndex, playerName: ownerName(cellIndex), rarity: 20 }));
let requests: Record<string, unknown>[], unexpected: string[], draws: number[], deferred: Gate[];
let replies: Record<Kind, (Reply | Gate)[]>;

function gate(name: string): Gate {
  let resolve!: (reply: Reply) => void, reject!: (error: Error) => void;
  const promise = new Promise<Reply>((yes, no) => { resolve = yes; reject = no; });
  const entry: Gate = { name, settled: false, promise, resolve: reply => { entry.settled = true; resolve(reply); }, reject: error => { entry.settled = true; reject(error); } };
  deferred.push(entry); return entry;
}
function dispatch(kind: Kind, details: Record<string, unknown>): Promise<Reply> {
  const next = replies[kind].shift();
  const request: Record<string, unknown> = copy({ kind, ...details, deferred: next && 'promise' in next ? next.name : null });
  requests.push(request);
  if (!next) { unexpected.push('No declared ' + kind + ' response'); return Promise.reject(new Error('No declared ' + kind + ' response')); }
  return ('promise' in next ? next.promise : Promise.resolve(next)).then(
    reply => { request.reply = copy(reply); return reply; },
    error => { request.error = String(error); throw error; },
  );
}
function installTransport() {
  fixture.invoke.mockImplementation((name, options) => dispatch('validator', { name, body: options.body }));
  fixture.from.mockImplementation((table: string) => {
    if (table === 'soccer_grid_puzzles') return { select: (columns: string) => ({ order: (column: string, options: unknown) => {
      requests.push(copy({ kind: 'puzzles', table, columns, column, options }));
      return Promise.resolve({ data: [], error: null });
    } }) };
    if (table !== 'soccer_grid_selections') { unexpected.push('Unexpected table ' + table); throw new Error('Unexpected table ' + table); }
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
  const c = view.result.current;
  return copy({
    puzzle: c.puzzle, main: { cells: c.mainCells, correctCount: c.correctCount, guessesLeft: c.guessesLeft, rarityScore: c.rarityScore, dailyJSON: localStorage.getItem(dailyKey()) },
    cells: c.cells, gameStatus: c.gameStatus, activeCell: c.activeCell, validating: c.validating, checkingDown: c.checkingDown,
    settings: c.settings, settingsLoaded: c.settingsLoaded, timeLeft: c.timeLeft, timeUp: c.timeUp,
    isLoading: c.isLoading, isLoadingPool: c.isLoadingPool,
    overtimeActive: c.overtimeActive, isOvertime: c.isOvertime, overtimeCells: c.overtimeCells, overtimeCorrectCount: c.overtimeCorrectCount,
    storage: Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])),
    recordings: fixture.record.mock.calls, toasts: fixture.toast.mock.calls,
  });
}
type Frame = { label: string; at: number; states: ReturnType<typeof state>[] };
function frame(views: View[], frames: Frame[], label: string) {
  const states = views.map(state); frames.push({ label, at: Date.now(), states }); return states;
}
async function flush() { await act(async () => { for (let i = 0; i < 16; i++) await Promise.resolve(); }); }
async function ready() {
  const view = renderHook(() => useSoccerGrid()); await flush();
  expect(view.result.current.isLoading || view.result.current.isLoadingPool, 'SG_OWNERSHIP_SETUP actual hook loaded').toBe(false);
  expect(view.result.current.settings.timerMode, 'SG_OWNERSHIP_SETUP untimed main round').toBe(0);
  return view;
}
function begin(view: View, cell: number, name: string) {
  act(() => view.result.current.setActiveCell(cell));
  let pending!: Promise<void>; act(() => { pending = view.result.current.submitGuess(name); }); return pending;
}
async function complete(view: View, cell: number, name: string) { const pending = begin(view, cell, name); await act(async () => { await pending; }); }
function queueValid(name: string) { replies.validator.push(VALID(name)); replies.count.push({ count: 9 }, { count: 1 }); replies.insert.push({ data: null, error: null }); }
function writeCount() { return requests.filter(request => request.kind === 'insert').length; }
function storageEvent() {
  act(() => { window.dispatchEvent(new StorageEvent('storage', { key: dailyKey(), newValue: localStorage.getItem(dailyKey()), storageArea: localStorage })); });
}
async function adoptEight(a: View, b: View, frames: Frame[]) {
  for (let cell = 0; cell < 8; cell++) { queueValid(ownerName(cell)); await complete(a, cell, ownerName(cell)); }
  const saved = localStorage.getItem(dailyKey());
  expect(JSON.parse(saved!), 'SG_OWNERSHIP_SETUP eight genuine saved successes').toEqual({
    v: 1, date: getTodayET(), puzzleIndex: 0, puzzleId: fixture.puzzle.id, guesses: ownerActions(), gameStatus: 'playing',
  });
  expect(b.result.current.correctCount, 'SG_OWNERSHIP_SETUP other hook has not received storage event').toBe(0);
  frame([a, b], frames, 'eight-committed-before-storage-event');
  storageEvent(); await flush();
  expect(b.result.current.correctCount, 'SG_OWNERSHIP_SETUP actual storage adoption happened before release').toBe(8);
  expect(b.result.current.mainCells.filter(cell => cell.status === 'correct').map(cell => cell.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  expect(b.result.current.gameStatus).toBe('playing'); expect(b.result.current.validating).toBe(true);
  expect(fixture.record).not.toHaveBeenCalled();
  return { saved, adopted: frame([a, b], frames, 'storage-adopted-eight-before-release')[1] };
}
function retain(key: Key, frames: Frame[]) {
  raw.cases[key] = copy({ title: TITLES[key], frames, requests, draws, deferred: deferred.map(({ name, settled }) => ({ name, settled })), unexpected,
    unusedReplies: { validator: replies.validator.length, count: replies.count.length, insert: replies.insert.length } });
  expect(unexpected, 'SG_OWNERSHIP_SETUP no undeclared transport').toEqual([]);
  expect(deferred.every(entry => entry.settled), 'SG_OWNERSHIP_SETUP all actual gates settled').toBe(true);
}
function released(view: View) { expect(view.result.current.validating).toBe(false); expect(view.result.current.activeCell).toBeNull(); }
async function loseUntimed(view: View, frames: Frame[]) {
  for (let i = 0; i < 15; i++) {
    replies.validator.push({ data: { valid: false } }); await complete(view, 0, 'Generated Miss ' + i);
    await act(async () => { vi.advanceTimersByTime(1500); });
  }
  expect(view.result.current.gameStatus).toBe('complete'); expect(view.result.current.guessesLeft).toBe(0);
  expect(fixture.record.mock.calls).toEqual([['/soccer-grid', 0, 'Generated Grid Guest', 0]]);
  return frame([view], frames, 'untimed-main-lost')[0];
}
beforeEach(async () => {
  // Pay React's one-time async flush initialization before recording random draws.
  await act(async () => {});
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] }); vi.setSystemTime(NOW);
  localStorage.clear(); sessionStorage.clear(); vi.clearAllMocks();
  requests = []; unexpected = []; draws = []; deferred = []; replies = { validator: [], count: [], insert: [] };
  vi.spyOn(Math, 'random').mockImplementation(() => { draws.push(0.37); return 0.37; }); installTransport();
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.restoreAllMocks(); vi.useRealTimers(); });
afterAll(() => {
  const destination = process.env.SC_GRID_OWNERSHIP_RAW;
  if (!destination) return;
  if (!isAbsolute(destination)) throw new Error('SC_GRID_OWNERSHIP_RAW must be absolute');
  mkdirSync(dirname(destination), { recursive: true }); writeFileSync(destination, JSON.stringify(raw, null, 2) + '\n', { flag: 'wx' });
});

describe('Soccer Grid main-round submission ownership', () => {
  for (const key of ['validator', 'rarity', 'insert', 'wrong'] as const) {
    it(TITLES[key], async () => {
      const a = await ready(), b = await ready(), frames: Frame[] = []; frame([a, b], frames, 'ready');
      const held = gate('pending-' + key), name = 'Generated Pending Alternate';
      replies.validator.push(key === 'validator' || key === 'wrong' ? held : VALID(name));
      if (key === 'rarity') replies.count.push(held);
      if (key === 'insert') { replies.count.push({ count: 9 }, { count: 1 }); replies.insert.push(held); }
      const pending = begin(b, 0, name); await flush();
      expect(requests.some(request => request.deferred === held.name), 'SG_OWNERSHIP_SETUP reached actual async boundary').toBe(true);
      frame([a, b], frames, 'pending-boundary');
      const { saved, adopted } = await adoptEight(a, b, frames), writes = writeCount();
      expect(writes, 'SG_OWNERSHIP_SETUP already initiated writes').toBe(key === 'insert' ? 9 : 8);
      if (key === 'validator') { replies.count.push({ count: 9 }, { count: 1 }); replies.insert.push({ data: null, error: null }); }
      if (key === 'rarity') { replies.count.push({ count: 1 }); replies.insert.push({ data: null, error: null }); }
      await act(async () => { held.resolve(key === 'wrong' ? { data: { valid: false } } : key === 'validator' ? VALID(name) : key === 'rarity' ? { count: 9 } : { data: null, error: null }); await pending; });
      const settled = frame([a, b], frames, 'pending-response-settled')[1]; retain(key, frames);
      expect({
        main: settled.main, gameStatus: settled.gameStatus, recordings: settled.recordings,
        writes: writeCount(), wrongCells: settled.cells.filter(cell => cell.status === 'wrong').length,
      }, TITLES[key]).toEqual({ main: adopted.main, gameStatus: 'playing', recordings: [], writes, wrongCells: 0 });
      expect(localStorage.getItem(dailyKey()), TITLES[key] + ' exact held daily bytes').toBe(saved);
      released(b);
    });
  }

  it(TITLES.batch, async () => {
    const a = await ready(), b = await ready(), frames: Frame[] = []; frame([a, b], frames, 'ready');
    const held = gate('same-batch-validator'), name = 'Generated Batched Alternate'; replies.validator.push(held);
    const pending = begin(b, 0, name); await flush(); frame([a, b], frames, 'pending-validator');
    for (let cell = 0; cell < 8; cell++) { queueValid(ownerName(cell)); await complete(a, cell, ownerName(cell)); }
    const saved = localStorage.getItem(dailyKey()), committed = state(a).main;
    expect(JSON.parse(saved!), 'SG_OWNERSHIP_SETUP eight ordinary actions before batched adoption').toEqual({
      v: 1, date: getTodayET(), puzzleIndex: 0, puzzleId: fixture.puzzle.id, guesses: ownerActions(), gameStatus: 'playing',
    });
    expect(b.result.current.correctCount, 'SG_OWNERSHIP_SETUP pending tab still shows its original board').toBe(0);
    expect(writeCount()).toBe(8); expect(fixture.record).not.toHaveBeenCalled();
    frame([a, b], frames, 'eight-committed-before-batch');
    replies.count.push({ count: 9 }, { count: 1 }); replies.insert.push({ data: null, error: null });
    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', { key: dailyKey(), newValue: saved, storageArea: localStorage }));
      expect(b.result.current.correctCount, 'SG_OWNERSHIP_SETUP release is before React renders adoption').toBe(0);
      frame([a, b], frames, 'storage-event-before-render-and-release');
      held.resolve(VALID(name)); await pending;
    });
    const settled = frame([a, b], frames, 'batch-settled')[1]; retain('batch', frames);
    expect({ main: settled.main, gameStatus: settled.gameStatus, recordings: settled.recordings, writes: writeCount() }, TITLES.batch)
      .toEqual({ main: committed, gameStatus: 'playing', recordings: [], writes: 8 });
    expect(localStorage.getItem(dailyKey()), TITLES.batch + ' exact held daily bytes').toBe(saved); released(b);
  });
  it(TITLES.rules, async () => {
    const view = await ready(), frames: Frame[] = []; const before = frame([view], frames, 'ready')[0];
    const held = gate('old-rule-validator'), name = 'Generated Old Rule'; replies.validator.push(held);
    const pending = begin(view, 0, name); await flush(); frame([view], frames, 'old-rule-pending');
    expect(view.result.current.settings).toEqual({ difficulty: 'normal', timerMode: 0 });
    replies.count.push({ count: 9 }, { count: 1 }); replies.insert.push({ data: null, error: null });
    await act(async () => {
      view.result.current.setTimerMode(40);
      expect(view.result.current.settings.timerMode, 'SG_OWNERSHIP_SETUP release is before React renders new rules').toBe(0);
      frame([view], frames, 'rule-change-before-render-and-release');
      held.resolve(VALID(name)); await pending;
    });
    const settled = frame([view], frames, 'new-rule-settled')[0]; retain('rules', frames);
    expect(settled.settings).toEqual({ difficulty: 'normal', timerMode: 40 });
    expect(JSON.parse(settled.storage['soccer-grid-settings-' + getTodayET()]!)).toEqual({ difficulty: 'normal', timerMode: 40 });
    expect({ main: settled.main, gameStatus: settled.gameStatus, recordings: settled.recordings, writes: writeCount() }, TITLES.rules)
      .toEqual({ main: before.main, gameStatus: 'playing', recordings: [], writes: 0 });
    released(view);
  });

  it(TITLES.valid, async () => {
    const view = await ready(), frames: Frame[] = []; frame([view], frames, 'ready');
    queueValid('Generated Timely'); await complete(view, 0, 'Generated Timely');
    const settled = frame([view], frames, 'valid-settled')[0]; retain('valid', frames);
    expect(JSON.parse(settled.main.dailyJSON!)).toEqual({ v: 1, date: getTodayET(), puzzleIndex: 0, puzzleId: fixture.puzzle.id, guesses: [{ t: 'ok', cellIndex: 0, playerName: 'Generated Timely', rarity: 20 }], gameStatus: 'playing' });
    expect([settled.main.correctCount, settled.main.guessesLeft, settled.main.rarityScore, writeCount()]).toEqual([1, 14, 20, 1]);
    expect(settled.gameStatus).toBe('playing'); expect(settled.timeLeft).toBeNull(); expect(settled.recordings).toEqual([]); released(view);
  });
  it(TITLES.invalid, async () => {
    const view = await ready(), frames: Frame[] = []; frame([view], frames, 'ready');
    replies.validator.push({ data: { valid: false } }); await complete(view, 0, 'Generated Wrong');
    const wrong = frame([view], frames, 'wrong-flash')[0];
    await act(async () => { vi.advanceTimersByTime(1500); });
    const cleared = frame([view], frames, 'flash-cleared')[0]; retain('invalid', frames);
    expect(JSON.parse(wrong.main.dailyJSON!).guesses).toEqual([{ t: 'x' }]);
    expect([wrong.main.correctCount, wrong.main.guessesLeft, writeCount()]).toEqual([0, 14, 0]);
    expect(wrong.cells[0]).toMatchObject({ status: 'wrong', playerName: 'Generated Wrong' }); expect(cleared.cells[0].status).toBe('empty');
    expect(cleared.recordings).toEqual([]); released(view);
  });
  for (const key of ['retry', 'exhausted', 'rejected'] as const) {
    it(TITLES[key], async () => {
      const view = await ready(), frames: Frame[] = []; const before = frame([view], frames, 'ready')[0];
      const held = gate('free-' + key); replies.validator.push(held); const pending = begin(view, 0, 'Generated Retry'); await flush();
      frame([view], frames, 'pending');
      await act(async () => { if (key === 'rejected') held.reject(new Error('Declared offline fixture')); else held.resolve({ data: { valid: false, unverified: true, ...(key === 'exhausted' ? { exhausted: true } : {}) } }); await pending; });
      const settled = frame([view], frames, 'free-settled')[0]; retain(key, frames);
      expect(settled.main).toEqual(before.main); expect(writeCount()).toBe(0); expect(settled.recordings).toEqual([]);
      expect(settled.checkingDown).toBe(key === 'exhausted'); expect(settled.toasts).toEqual([[key === 'exhausted' ? EXHAUSTED : RETRY]]);
      expect(settled.gameStatus).toBe('playing'); released(view);
    });
  }
  it(TITLES.ninth, async () => {
    const a = await ready(), b = await ready(), frames: Frame[] = []; frame([a, b], frames, 'ready');
    const held = gate('distinct-ninth'); replies.validator.push(held); const name = 'Generated Ninth';
    const pending = begin(b, 8, name); await flush(); await adoptEight(a, b, frames);
    replies.count.push({ count: 9 }, { count: 1 }); replies.insert.push({ data: null, error: null });
    await act(async () => { held.resolve(VALID(name)); await pending; });
    const won = frame([a, b], frames, 'distinct-ninth-won')[1]; storageEvent(); await flush();
    const followed = frame([a, b], frames, 'other-tab-follows-win'); retain('ninth', frames);
    expect(won.main.correctCount).toBe(9); expect(won.cells.filter(cell => cell.status === 'correct')).toHaveLength(9); expect(won.gameStatus).toBe('complete');
    expect(JSON.parse(won.main.dailyJSON!).guesses).toEqual([...ownerActions(), { t: 'ok', cellIndex: 8, playerName: name, rarity: 20 }]);
    expect(writeCount()).toBe(9); expect(followed.map(s => s.gameStatus)).toEqual(['complete', 'complete']);
    expect(fixture.record.mock.calls).toEqual([['/soccer-grid', 900, 'Generated Grid Guest', 0]]); released(b);
  });
  for (const key of ['overtimeValid', 'overtimeWrong'] as const) {
    it(TITLES[key], async () => {
      const view = await ready(), frames: Frame[] = []; frame([view], frames, 'ready'); const lost = await loseUntimed(view, frames);
      act(() => view.result.current.startOvertime()); frame([view], frames, 'overtime-entered');
      if (key === 'overtimeValid') { queueValid('Generated Overtime'); await complete(view, 0, 'Generated Overtime'); }
      else for (let i = 0; i < 16; i++) { replies.validator.push({ data: { valid: false } }); await complete(view, 0, 'Generated Overtime Miss ' + i); await act(async () => { vi.advanceTimersByTime(1500); }); }
      const settled = frame([view], frames, 'overtime-settled')[0]; retain(key, frames);
      expect(settled.main).toEqual(lost.main); expect(settled.recordings).toEqual(lost.recordings); expect(settled.isOvertime).toBe(true);
      expect(settled.overtimeCells).toEqual(key === 'overtimeValid' ? [{ cellIndex: 0, playerName: 'Generated Overtime', rarity: 20 }] : []);
      expect(writeCount()).toBe(key === 'overtimeValid' ? 1 : 0);
      expect(requests.filter(request => request.kind === 'validator')).toHaveLength(key === 'overtimeValid' ? 16 : 31); released(view);
    });
  }
});
