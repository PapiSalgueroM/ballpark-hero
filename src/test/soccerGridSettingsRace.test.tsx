import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

const io = vi.hoisted(() => ({ from: vi.fn(), invoke: vi.fn(), record: vi.fn(), toast: vi.fn(), refresh: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: io.from, functions: { invoke: io.invoke } },
  SUPABASE_URL: 'https://fixture.invalid', SUPABASE_PUBLISHABLE_KEY: 'fixture-public-key',
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: io.refresh }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: io.record, getCurrentPlayerName: () => 'Grid Settings Guest', getLocalTodayCount: () => 0 }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('sonner', () => ({ toast: { error: io.toast, success: vi.fn() } }));
import SoccerGrid from '@/pages/SoccerGrid';
import { loadGameContent } from '@/data/gameContent/loader';
import { getTodayET } from '@/lib/dateUtils';
import { classifyPuzzleDifficulty, filterPoolByDifficulty } from '@/lib/soccerGridDifficulty';
import type { SoccerGridPuzzle } from '@/types/soccerGrid';

const TITLES = {
  pendingValidator: 'the first validator check keeps both settings groups locked',
  pendingRarity: 'the first rarity check keeps both settings groups locked',
  pendingInsert: 'the first selection write keeps both settings groups locked',
  preplay: 'pre-play difficulty and timer choices still select the requested puzzle',
  unverified: 'an unverified first answer releases settings without spending a guess',
  valid: 'an ordinary first valid answer keeps its board and complete daily save',
  wrong: 'an ordinary first wrong answer spends one guess and keeps its board',
} as const;
type Key = keyof typeof TITLES;
type Kind = 'validator' | 'count' | 'insert';
type Reply = { data?: Record<string, unknown> | null; error?: unknown; count?: number };
type Gate = { name: string; settled: boolean; promise: Promise<Reply>; resolve: (value: Reply) => void };
const NOW = Date.parse('2026-10-17T12:00:00.000Z');
const originalScrollIntoView = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
const NAME = 'Grid Settings Fixture';
const RETRY = "Couldn't verify that answer, please try again.";
const POOL: SoccerGridPuzzle[] = (['Easy', 'Hard'] as const).flatMap((tier) => Array.from({ length: 20 }, (_, i) => ({
  id: `settings-fixture-${tier.toLowerCase()}-${i}`,
  rows: Array.from({ length: 3 }, (_, row) => ({ label: `Fixture ${tier} ${i} Row ${row}`, type: tier === 'Easy' ? 'club' as const : 'award' as const })),
  cols: Array.from({ length: 3 }, (_, col) => ({ label: `Fixture ${tier} ${i} Column ${col}`, type: tier === 'Easy' ? 'league' as const : 'world_cup' as const })),
})));
const raw = { version: 1, caseTitles: Object.values(TITLES), cases: {} as Record<string, unknown> };
let requests: Record<string, unknown>[];
let deferred: Gate[];
let unexpected: string[];
let draws: number[];
let replies: Record<Kind, (Reply | Gate)[]>;
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const settingsKey = () => `soccer-grid-settings-${getTodayET()}`;
const dailyKey = () => `soccer-grid-daily-${getTodayET()}`;
function gate(name: string): Gate {
  let resolve!: (value: Reply) => void;
  const promise = new Promise<Reply>(yes => { resolve = yes; });
  const entry = { name, settled: false, promise, resolve: (value: Reply) => { entry.settled = true; resolve(value); } };
  deferred.push(entry); return entry;
}
function dispatch(kind: Kind, details: Record<string, unknown>) {
  const next = replies[kind].shift();
  requests.push(copy({ kind, ...details, deferred: next && 'promise' in next ? next.name : null }));
  if (!next) { unexpected.push(`No declared ${kind} reply`); return Promise.reject(new Error(`No declared ${kind} reply`)); }
  return 'promise' in next ? next.promise : Promise.resolve(next);
}
function installTransport() {
  io.invoke.mockImplementation((name, options) => dispatch('validator', { name, body: options.body }));
  io.from.mockImplementation((table: string) => {
    if (table === 'soccer_grid_puzzles') return { select: (columns: string) => ({ order: (column: string, options: unknown) => {
      requests.push(copy({ kind: 'puzzles', table, columns, column, options }));
      return Promise.resolve({ data: POOL.map(p => ({ puzzle_id: p.id, rows_json: p.rows, cols_json: p.cols })), error: null });
    } }) };
    if (table === 'career_players') return { select: (columns: string) => ({ order: (column: string, options: unknown) => {
      requests.push(copy({ kind: 'career-players', table, columns, column, options }));
      return Promise.resolve({ data: [{ id: 'settings-fixture-player', player_name: NAME, nationality: 'Fixture Nation', position: 'CM' }], error: null });
    } }) };
    if (table === 'career_seasons') return { select: (columns: string) => {
      const orders: unknown[] = [];
      const query = { order: (column: string, options: unknown) => { orders.push({ column, options }); return query; }, range: (from: number, to: number) => {
        requests.push(copy({ kind: 'career-seasons', table, columns, orders, from, to }));
        return Promise.resolve({ data: [{ player_id: 'settings-fixture-player', season: 'Fixture season', club: 'Fixture Club', goals: 0, assists: 0, appearances: 1, market_value: 1, sort_order: 0 }], error: null });
      } }; return query;
    } };
    if (table !== 'soccer_grid_selections') { unexpected.push(`Unexpected table ${table}`); throw new Error(`Unexpected table ${table}`); }
    return {
      select: (columns: string, options: unknown) => {
        const filters: [string, unknown][] = [];
        const query = { eq: (column: string, value: unknown) => { filters.push([column, value]); return query; },
          then: (yes: (value: Reply) => unknown, no: (error: unknown) => unknown) => dispatch('count', { table, columns, options, filters }).then(yes, no) };
        return query;
      },
      insert: (body: unknown) => dispatch('insert', { table, body }),
    };
  });
}
async function flush() { await act(async () => { for (let i = 0; i < 16; i++) await Promise.resolve(); }); }
function puzzleOnPage() {
  const found = POOL.filter(p => screen.queryAllByText(p.rows[0].label).length > 0);
  expect(found).toHaveLength(1); return found[0];
}
function buttons() {
  return { difficulty: ['Easy', 'Normal', 'Hard'].map(name => screen.getByRole('button', { name }) as HTMLButtonElement),
    timer: ['Unlimited', '90s', '60s', '40s'].map(name => screen.getByRole('button', { name }) as HTMLButtonElement) };
}
function snapshot(label: string) {
  const puzzle = puzzleOnPage();
  return copy({ label, at: Date.now(), puzzle, html: document.body.innerHTML,
    cells: Array.from(document.querySelectorAll<HTMLButtonElement>('[data-grid-cell-status]'), cell => ({ status: cell.dataset.gridCellStatus, text: cell.textContent, disabled: cell.disabled })),
    settingsJSON: localStorage.getItem(settingsKey()), dailyJSON: localStorage.getItem(dailyKey()),
    storage: Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])),
    recordings: io.record.mock.calls, toasts: io.toast.mock.calls,
    controls: Array.from(document.querySelectorAll<HTMLButtonElement>('button')).map(button => ({ text: button.textContent, disabled: button.disabled })),
    activeElement: document.activeElement?.outerHTML ?? null,
  });
}
type Moment = ReturnType<typeof snapshot>;
function retain(key: Key, moments: Moment[], extra: Record<string, unknown> = {}) {
  raw.cases[key] = copy({ title: TITLES[key], moments, requests, deferred: deferred.map(({ name, settled }) => ({ name, settled })), unexpected, draws, ...extra });
  expect(unexpected).toEqual([]); expect(deferred.every(entry => entry.settled)).toBe(true);
  expect(Object.values(replies).every(queue => queue.length === 0)).toBe(true);
}
async function ready() {
  render(<HelmetProvider><MemoryRouter initialEntries={['/soccer-grid']}><SoccerGrid /></MemoryRouter></HelmetProvider>);
  await flush(); expect(classifyPuzzleDifficulty(puzzleOnPage())).toBe('easy');
  expect(document.querySelectorAll('[data-grid-cell-status]')).toHaveLength(9);
  expect(buttons().difficulty).toHaveLength(3); expect(buttons().timer).toHaveLength(4);
}
async function submit() {
  fireEvent.click(document.querySelectorAll<HTMLButtonElement>('[data-grid-cell-status]')[0]);
  const input = screen.getByRole('combobox', { name: 'Search for a player' });
  fireEvent.change(input, { target: { value: NAME } });
  fireEvent.submit(input.closest('form')!); await flush();
}
function queueValid(held?: Kind) {
  const stop = held ? gate(`held-${held}`) : null;
  replies.validator.push(held === 'validator' ? stop! : { data: { valid: true, fullName: NAME }, error: null });
  replies.count.push(held === 'count' ? stop! : { count: 9 }, { count: 1 });
  replies.insert.push(held === 'insert' ? stop! : { data: null, error: null });
  return stop;
}
beforeAll(async () => { await act(async () => undefined); await loadGameContent('/soccer-grid'); });
beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] }); vi.setSystemTime(NOW);
  localStorage.clear(); sessionStorage.clear(); localStorage.setItem('cookie-consent', 'essential'); localStorage.setItem('sg-rules-seen', '1');
  localStorage.setItem(settingsKey(), JSON.stringify({ difficulty: 'easy', timerMode: 40 }));
  requests = []; deferred = []; unexpected = []; draws = []; replies = { validator: [], count: [], insert: [] }; installTransport();
  vi.spyOn(Math, 'random').mockImplementation(() => { draws.push(0.25); return 0.25; });
  vi.stubGlobal('fetch', vi.fn((url: unknown) => { unexpected.push(`Unexpected fetch ${String(url)}`); return Promise.reject(new Error('Unexpected external fetch')); }));
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, writable: true, value: vi.fn() });
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
  if (originalScrollIntoView) Object.defineProperty(Element.prototype, 'scrollIntoView', originalScrollIntoView);
  else delete (Element.prototype as Partial<Element>).scrollIntoView;
});
afterAll(() => {
  const out = process.env.SC_GRID_SETTINGS_RAW;
  if (out) { if (!isAbsolute(out)) throw new Error('SC_GRID_SETTINGS_RAW must be absolute'); mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, JSON.stringify(raw, null, 2) + '\n', { flag: 'wx' }); }
});

describe('Soccer Grid first-check settings ownership', () => {
  for (const [key, boundary, cause] of [
    ['pendingValidator', 'validator', 'validator'], ['pendingRarity', 'count', 'rarity'], ['pendingInsert', 'insert', 'insert'],
  ] as const) it(TITLES[key], async () => {
    await ready(); const before = snapshot('ready'); const stop = queueValid(boundary)!;
    await submit(); const pending = snapshot('pending');
    expect(screen.getByRole('combobox', { name: 'Search for a player' })).toBeDisabled();
    expect(deferred).toHaveLength(1); expect(stop.settled).toBe(false);
    const heldButtons = buttons(); const disabled = { difficulty: heldButtons.difficulty.map(button => button.disabled), timer: heldButtons.timer.map(button => button.disabled) };
    fireEvent.click(heldButtons.difficulty[2]); await flush(); fireEvent.click(buttons().timer[0]); await flush();
    const attempted = snapshot('after-settings-attempts');
    await act(async () => { stop.resolve(boundary === 'validator' ? { data: { valid: true, fullName: NAME }, error: null } : boundary === 'count' ? { count: 9 } : { data: null, error: null }); });
    await flush(); const settled = snapshot('settled'); retain(key, [before, pending, attempted, settled], { disabled });
    expect(disabled.difficulty.every(Boolean) && JSON.parse(attempted.settingsJSON!).difficulty === JSON.parse(before.settingsJSON!).difficulty && attempted.puzzle.id === before.puzzle.id, `GRID_SETTINGS_RACE_${cause}_difficulty`).toBe(true);
    expect(disabled.timer.every(Boolean) && attempted.settingsJSON === before.settingsJSON, `GRID_SETTINGS_RACE_${cause}_timer`).toBe(true);
    const saved = JSON.parse(settled.dailyJSON!); expect(saved.puzzleId).toBe(before.puzzle.id); expect(saved.guesses).toEqual([{ t: 'ok', cellIndex: 0, playerName: NAME, rarity: 20 }]);
    expect(settled.cells[0]).toMatchObject({ status: 'correct', disabled: true }); expect(settled.recordings).toEqual([]); expect(settled.toasts).toEqual([]);
  });
  it(TITLES.preplay, async () => {
    await ready(); const before = snapshot('ready');
    fireEvent.click(buttons().difficulty[2]); await flush(); fireEvent.click(screen.getByRole('button', { name: '90s' })); await flush();
    const settled = snapshot('settings-chosen'); retain('preplay', [before, settled]);
    expect(classifyPuzzleDifficulty(settled.puzzle)).toBe('hard'); expect(settled.puzzle.id).not.toBe(before.puzzle.id);
    expect(JSON.parse(settled.settingsJSON!)).toEqual({ difficulty: 'hard', timerMode: 90 });
    expect(settled.dailyJSON).toBeNull(); expect(settled.cells.every(cell => cell.status === 'empty')).toBe(true); expect(settled.recordings).toEqual([]);
    expect(filterPoolByDifficulty(POOL, 'easy')).toHaveLength(20); expect(filterPoolByDifficulty(POOL, 'hard')).toHaveLength(20);
  });
  it(TITLES.unverified, async () => {
    await ready(); const before = snapshot('ready'); const stop = gate('held-unverified'); replies.validator.push(stop);
    await submit(); await act(async () => { stop.resolve({ data: { valid: false, unverified: true }, error: null }); }); await flush();
    const released = snapshot('unverified-released'); const available = buttons(); expect(available.difficulty.every(button => !button.disabled)).toBe(true); expect(available.timer.every(button => !button.disabled)).toBe(true);
    fireEvent.click(available.difficulty[2]); await flush(); fireEvent.click(screen.getByRole('button', { name: '60s' })); await flush();
    const settled = snapshot('settings-chosen'); retain('unverified', [before, released, settled]);
    expect(released.dailyJSON).toBeNull(); expect(released.cells.every(cell => cell.status === 'empty')).toBe(true); expect(released.toasts).toEqual([[RETRY]]);
    expect(JSON.parse(settled.settingsJSON!)).toEqual({ difficulty: 'hard', timerMode: 60 }); expect(classifyPuzzleDifficulty(settled.puzzle)).toBe('hard'); expect(settled.recordings).toEqual([]);
  });
  it(TITLES.valid, async () => {
    await ready(); const before = snapshot('ready'); queueValid(); await submit(); const settled = snapshot('valid-settled'); retain('valid', [before, settled]);
    expect(settled.puzzle).toEqual(before.puzzle); expect(settled.settingsJSON).toBe(before.settingsJSON);
    expect(JSON.parse(settled.dailyJSON!)).toEqual({ v: 1, date: getTodayET(), puzzleIndex: 0, puzzleId: before.puzzle.id, guesses: [{ t: 'ok', cellIndex: 0, playerName: NAME, rarity: 20 }], gameStatus: 'playing' });
    expect(settled.cells[0]).toMatchObject({ status: 'correct', disabled: true }); expect(settled.cells.slice(1).every(cell => cell.status === 'empty')).toBe(true);
    expect(screen.queryByRole('button', { name: 'Hard' })).toBeNull(); expect(settled.recordings).toEqual([]); expect(settled.toasts).toEqual([]);
  });
  it(TITLES.wrong, async () => {
    await ready(); const before = snapshot('ready'); replies.validator.push({ data: { valid: false, unverified: false }, error: null }); await submit();
    const settled = snapshot('wrong-settled'); await act(async () => { vi.advanceTimersByTime(1500); }); const cleared = snapshot('wrong-flash-cleared'); retain('wrong', [before, settled, cleared]);
    expect(settled.puzzle).toEqual(before.puzzle); expect(settled.settingsJSON).toBe(before.settingsJSON);
    expect(JSON.parse(settled.dailyJSON!)).toEqual({ v: 1, date: getTodayET(), puzzleIndex: 0, puzzleId: before.puzzle.id, guesses: [{ t: 'x' }], gameStatus: 'playing' });
    expect(settled.cells[0]).toMatchObject({ status: 'wrong', disabled: false }); expect(cleared.cells.every(cell => cell.status === 'empty')).toBe(true);
    expect(screen.queryByRole('button', { name: 'Hard' })).toBeNull(); expect(settled.recordings).toEqual([]); expect(settled.toasts).toEqual([]);
  });
});
