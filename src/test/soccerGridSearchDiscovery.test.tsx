import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import fs from 'node:fs';
import path from 'node:path';
import { SoccerGridSearch } from '@/components/soccer-grid/SoccerGridSearch';
import SoccerGrid from '@/pages/SoccerGrid';

const io = vi.hoisted(() => ({ players: vi.fn(), seasons: vi.fn(), puzzles: vi.fn(), invoke: vi.fn(), select: vi.fn(),
  tables: [] as { table: string; columns: string }[] }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  functions: { invoke: io.invoke },
  from: (table: string) => ({ select: (columns: string) => {
    io.tables.push({ table, columns });
    if (table === 'career_players') {
      expect(columns).toBe('id, player_name, nationality, position');
      return { order: (column: string, options: unknown) => { expect(column).toBe('player_name'); expect(options).toEqual({ ascending: true }); return io.players(); } };
    }
    if (table === 'soccer_grid_puzzles') {
      expect(columns).toBe('puzzle_id, rows_json, cols_json');
      return { order: (column: string, options: unknown) => { expect(column).toBe('sort_order'); expect(options).toEqual({ ascending: true }); return io.puzzles(); } };
    }
    expect(table).toBe('career_seasons');
    expect(columns).toBe('player_id, season, club, goals, assists, appearances, market_value, sort_order');
    const orders: string[] = [];
    const query = { order: (column: string, options: unknown) => { expect(options).toEqual({ ascending: true }); orders.push(column); return query; },
      range: (from: number, to: number) => { expect(orders).toEqual(['player_id', 'sort_order']); expect([from, to]).toEqual([0, 999]); return io.seasons(from, to); } };
    return query;
  } }),
} }));
// The actual page, board, search, grid hook, daily hook and career loader run.
// These seams remove unrelated outer UI and the guest account, not game state.
vi.mock('@/components/game/GameShell', () => ({ GameShell: ({ children, headerExtra }: { children: ReactNode; headerExtra: ReactNode }) => <main>{headerExtra}{children}</main> }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/HowToPlayPopover', () => ({ HowToPlayPopover: () => null }));
vi.mock('@/components/game/ResultScreen', () => ({ ResultScreen: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/FlagImg', () => ({ FlagImg: ({ name }: { name: string }) => <span>{name}</span> }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => {} }) }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

type Player = { name: string; nationality: string; position: string };
const names = ['Fixture Álex One', 'Fixture Øren Two', 'Fixture Plain Three', 'Fixture Late Four'];
const players: Player[] = names.map(name => ({ name, nationality: 'Fixture Nation', position: 'Fixture Position' }));
const seasonReply = { data: [{ player_id: 'fixture-player-0', season: 'Fixture Season', club: 'Fixture Club', goals: 0, assists: 0, appearances: 1, market_value: 0, sort_order: 0 }], error: null };
const pending = new Set<() => void>();
const deferredSeason = () => {
  let resolve!: (value: typeof seasonReply) => void;
  const promise = new Promise<typeof seasonReply>(done => { resolve = value => { pending.delete(drain); done(value); }; });
  const drain = () => resolve(seasonReply); pending.add(drain);
  return { promise, resolve: () => resolve(seasonReply) };
};
type View = ReturnType<typeof render>;
let view: View | null = null, heldStores = '';
const traces: unknown[] = [];
const scrollDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
const stores = () => JSON.stringify([localStorage, sessionStorage].map(storage => Array.from({ length: storage.length }, (_, i) => storage.key(i)!).sort().map(key => [key, storage.getItem(key)])));
const input = () => view!.getByRole('textbox', { name: 'Search for a player' }) as HTMLInputElement;
const visibleNames = () => Array.from(view!.container.querySelectorAll('form ul li > span:first-child'), node => node.textContent);
const query = (value: string) => fireEvent.change(input(), { target: { value } });
const formSubmit = async () => { await act(async () => { fireEvent.submit(input().closest('form')!); }); };
const leaf = (pool: Player[] = players, disabled = false) => {
  view = render(<SoccerGridSearch players={pool} onSelect={io.select} disabled={disabled} />);
  expect(document.activeElement).toBe(input()); heldStores = stores();
};
const rerender = (pool: Player[], disabled = false) => view!.rerender(<SoccerGridSearch players={pool} onSelect={io.select} disabled={disabled} />);
const shown = (name: string, purpose: string) => expect(visibleNames(), purpose).toContain(name);
const dailySave = () => {
  const keys = Object.keys(localStorage).filter(key => key.startsWith('soccer-grid-daily-'));
  expect(keys.length).toBeLessThanOrEqual(1); return keys.length ? JSON.parse(localStorage.getItem(keys[0])!) : null;
};
async function parent() {
  await act(async () => { view = render(<MemoryRouter initialEntries={['/soccer-grid']}><SoccerGrid /></MemoryRouter>); });
  expect(view!.container.querySelectorAll('[data-grid-cell-status]')).toHaveLength(9);
  expect(view!.getByText('Fixture Club 1', { exact: true })).toBeVisible(); expect(view!.getByText('Fixture Position 1', { exact: true })).toBeVisible();
  expect(io.players).toHaveBeenCalledTimes(1); expect(io.seasons).toHaveBeenCalledExactlyOnceWith(0, 999); expect(io.puzzles).toHaveBeenCalledTimes(1);
  await act(async () => { fireEvent.click(view!.container.querySelector('[data-grid-cell-status]')!); });
  expect(document.activeElement).toBe(input()); heldStores = stores();
}

beforeAll(() => {
  // JSDOM has no physical scroll. The built browser owns scroll/viewport proof.
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, writable: true, value: vi.fn() });
});
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-18T16:00:00Z')); vi.clearAllMocks(); io.tables.length = 0;
  io.players.mockReset().mockResolvedValue({ data: players.map((p, i) => ({ id: 'fixture-player-' + i, player_name: p.name, nationality: p.nationality, position: p.position })), error: null });
  io.seasons.mockReset().mockResolvedValue(seasonReply);
  io.puzzles.mockReset().mockResolvedValue({ data: [{ puzzle_id: 'fixture-grid-discovery', rows_json: [1, 2, 3].map(i => ({ label: 'Fixture Club ' + i, type: 'club' })), cols_json: [1, 2, 3].map(i => ({ label: 'Fixture Position ' + i, type: 'position' })) }], error: null });
  io.invoke.mockReset().mockResolvedValue({ data: { valid: false, unverified: true, reason: 'Synthetic no-penalty retry' }, error: null }); io.select.mockReset();
  localStorage.clear(); sessionStorage.clear(); localStorage.setItem('sg-rules-seen', '1'); localStorage.setItem('grid-search-held-save', '{"held":true}'); sessionStorage.setItem('grid-search-held-session', 'held'); heldStores = stores();
});
afterEach(async context => {
  const pendingBeforeCleanup = pending.size;
  await act(async () => { for (const drain of [...pending]) drain(); vi.runOnlyPendingTimers(); });
  traces.push({ name: context.task.name, pendingBeforeCleanup, pendingAfterCleanup: pending.size, query: view?.queryByRole('textbox', { name: 'Search for a player' })?.getAttribute('value') ?? null,
    visibleNames: view ? visibleNames() : [], selected: io.select.mock.calls.map(call => call[0]), tables: [...io.tables], invoked: io.invoke.mock.calls,
    focused: document.activeElement?.getAttribute('aria-label') === 'Search for a player' });
  cleanup(); view = null; expect(stores(), 'Search must preserve all local and session stored fields').toBe(heldStores); vi.useRealTimers();
});
afterAll(() => {
  if (scrollDescriptor) Object.defineProperty(Element.prototype, 'scrollIntoView', scrollDescriptor); else delete (Element.prototype as Partial<Element>).scrollIntoView;
  if (!process.env.SOCCER_GRID_SEARCH_TRACE_DIR) return;
  fs.mkdirSync(process.env.SOCCER_GRID_SEARCH_TRACE_DIR, { recursive: true });
  fs.writeFileSync(path.join(process.env.SOCCER_GRID_SEARCH_TRACE_DIR, 'trace.json'), JSON.stringify({ version: 1, scope: 'Actual Search and two actual parent/hook/Daily/career-loader integrations. Fictional external IO, finite fake Date/timers for150ms blur, no physical scroll or live data claim.', cases: traces }, null, 2) + '\n');
});

describe('Soccer Grid search discovery', () => {
  for (const [typed, canonical] of [['fixture alex one', names[0]], ['fixture oren two', names[1]], ['  fixture   plain three  ', names[2]]]) {
    it('shows the canonical name for ' + JSON.stringify(typed), () => {
      leaf(); query(typed); expect(input()).toHaveValue(typed);
      shown(canonical, 'Normalized queries must show the matching canonical name');
      expect(io.select).not.toHaveBeenCalled();
    });
  }
  it('shows a matching pool arriving under an unchanged focused query', () => {
    leaf([]); query('Fixture Late'); expect(visibleNames()).toEqual([]); rerender(players);
    expect(input()).toHaveValue('Fixture Late'); expect(document.activeElement).toBe(input());
    shown(names[3], 'Matching names must appear when the focused pool arrives');
  });
  it('shows the actual parent career pool arriving after its focused query', async () => {
    const held = deferredSeason(); io.seasons.mockReturnValueOnce(held.promise); await parent(); query('Fixture Late'); expect(visibleNames()).toEqual([]);
    await act(async () => { held.resolve(); }); expect(pending.size).toBe(0);
    expect(input()).toHaveValue('Fixture Late'); expect(document.activeElement).toBe(input());
    shown(names[3], 'The actual page must show its delivered pool for the focused query');
  });
  it('selects canonical accented spelling and retains visible-menu Escape recovery', async () => {
    leaf(); query(names[0]); expect(visibleNames()).toEqual([names[0]]); fireEvent.keyDown(input(), { key: 'Escape' }); expect(visibleNames()).toEqual([]);
    act(() => { input().blur(); vi.advanceTimersByTime(150); input().focus(); }); expect(visibleNames()).toEqual([names[0]]);
    await act(async () => { fireEvent.mouseDown(view!.getByText(names[0], { exact: true })); });
    expect(io.select).toHaveBeenCalledExactlyOnceWith(names[0]); expect(input()).toHaveValue(''); expect(visibleNames()).toEqual([]);
  });
  it('keeps ordinary case-insensitive canonical selection', async () => {
    leaf(); query('fIxTuRe PlAiN'); expect(visibleNames()).toEqual([names[2]]); await formSubmit(); expect(io.select).toHaveBeenCalledExactlyOnceWith(names[2]); expect(input()).toHaveValue('');
  });
  it('keeps the eight-result cap and bounded arrow selection', async () => {
    const pool = Array.from({ length: 10 }, (_, i) => ({ ...players[2], name: 'Fixture Cap ' + i })); leaf(pool); query('Fixture Cap'); expect(visibleNames()).toEqual(pool.slice(0, 8).map(p => p.name));
    for (let i = 0; i < 10; i++) fireEvent.keyDown(input(), { key: 'ArrowDown' }); fireEvent.keyDown(input(), { key: 'ArrowUp' });
    await formSubmit(); expect(io.select).toHaveBeenCalledExactlyOnceWith('Fixture Cap 6');
  });
  it('keeps trimmed title-cased manual entry when no suggestion exists', async () => {
    leaf(); query('  fixture missing entry  '); expect(visibleNames()).toEqual([]); expect(view!.getByRole('button', { name: 'Submit' })).toBeEnabled(); await formSubmit();
    expect(io.select).toHaveBeenCalledExactlyOnceWith('Fixture Missing Entry'); expect(input()).toHaveValue('');
  });
  it('keeps disabled input and form submission inert', async () => {
    leaf(); query(names[2]); rerender(players, true); expect(input()).toBeDisabled(); expect(view!.getByRole('button', { name: 'Submit' })).toBeDisabled(); await formSubmit();
    expect(io.select).not.toHaveBeenCalled(); expect(input()).toHaveValue(names[2]);
  });
  it('keeps further query editing as recovery after late pool delivery', () => {
    leaf([]); query('Fixture Late'); rerender(players); query('Fixture Late F'); expect(visibleNames()).toEqual([names[3]]); expect(io.select).not.toHaveBeenCalled();
  });
  it('keeps actual parent unverified selection free of a counted guess', async () => {
    await parent(); query(names[2]); expect(visibleNames()).toEqual([names[2]]); const before = dailySave(); await formSubmit();
    expect(io.invoke).toHaveBeenCalledExactlyOnceWith('soccer-grid-validate', { body: { playerName: names[2], rowAttribute: 'Fixture Club 1', colAttribute: 'Fixture Position 1' } });
    expect(before).toBeNull(); expect(dailySave()).toBeNull(); expect(view!.getByText('15')).toBeVisible(); expect(view!.queryByRole('textbox', { name: 'Search for a player' })).toBeNull();
    expect(io.tables.map(row => row.table)).toEqual(['soccer_grid_puzzles', 'career_players', 'career_seasons']);
  });
  it('keeps the raw one-character query gate', async () => {
    leaf(); query('F'); expect(visibleNames()).toEqual([]); expect(view!.getByRole('button', { name: 'Submit' })).toBeDisabled(); await formSubmit(); expect(io.select).not.toHaveBeenCalled(); expect(input()).toHaveValue('F');
  });
  it('keeps all-whitespace queries empty and unable to submit', async () => {
    leaf(); query('   '); expect(visibleNames()).toEqual([]); expect(view!.getByRole('button', { name: 'Submit' })).toBeDisabled(); await formSubmit(); expect(io.select).not.toHaveBeenCalled(); expect(input()).toHaveValue('   ');
  });
  it('keeps Escape before held pool delivery closed', () => {
    leaf([]); query('Fixture Late'); fireEvent.keyDown(input(), { key: 'Escape' }); rerender(players);
    expect(document.activeElement).toBe(input()); expect(input()).toHaveValue('Fixture Late'); expect(visibleNames()).toEqual([]); expect(io.select).not.toHaveBeenCalled();
  });
  it('keeps completed150ms blur before held pool delivery closed', () => {
    leaf([]); query('Fixture Late'); act(() => { input().blur(); vi.advanceTimersByTime(150); }); rerender(players);
    expect(document.activeElement).not.toBe(input()); expect(input()).toHaveValue('Fixture Late'); expect(visibleNames()).toEqual([]); expect(io.select).not.toHaveBeenCalled();
  });
});
