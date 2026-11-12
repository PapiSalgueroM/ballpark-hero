import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { ComponentType, ReactNode } from 'react';
import NbaGrid from '@/pages/NbaGrid';
import MlbGrid from '@/pages/MlbGrid';
import HockeyGrid from '@/pages/HockeyGrid';
import { buildGridPuzzle as nbaPuzzle } from '@/lib/nbaGrid';
import { buildGridPuzzle as mlbPuzzle } from '@/lib/mlbGrid';
import { buildGridPuzzle as hockeyPuzzle } from '@/lib/hockeyGrid';
import { dateSeed } from '@/lib/dateUtils';
import { normalizeName } from '@/lib/playerSearch';

const io = vi.hoisted(() => ({ selected: '', record: vi.fn() }));
vi.mock('@/components/game/GameShell', () => ({
  GameShell: ({ headerExtra, children }: { headerExtra: ReactNode; children: ReactNode }) => <section>{headerExtra}{children}</section>,
}));
vi.mock('@/components/game/GridBoardSkeleton', () => ({ GridBoardSkeleton: () => null }));
vi.mock('@/components/game/ResultScreen', () => ({ ResultScreen: ({ headline }: { headline: string }) => <h2>{headline}</h2> }));
vi.mock('@/components/game/HowToPlayPopover', () => ({ HowToPlayPopover: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/game/PlayerAutocomplete', () => ({
  PlayerAutocomplete: ({ onSelect }: { onSelect: (player: { name: string; rawName: string }) => void }) => (
    <button type="button" onClick={() => onSelect({ name: io.selected, rawName: io.selected })}>Submit fixture player</button>
  ),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: io.record, getCurrentPlayerName: () => 'Grid Fixture Guest' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

const names = Array.from({ length: 11 }, (_, index) => `Grid Fixture ${String.fromCharCode(65 + index)}`);
function pool(franchises: { id: string }[]) {
  const players = names.map(name => ({
    name, franchises: new Set(franchises.map(({ id }) => id)),
    points: 15000, rebounds: 6000, assists: 5000, goals: 500, hits: 2500, hrs: 400, games: 2500,
  }));
  return { players, byNormalizedName: new Map(players.map(player => [normalizeName(player.name), [player]])) };
}
vi.mock('@/lib/nbaGrid', async importOriginal => {
  const real = await importOriginal<typeof import('@/lib/nbaGrid')>();
  return { ...real, fetchNbaGridData: async () => pool(real.FRANCHISE_POOL) };
});
vi.mock('@/lib/mlbGrid', async importOriginal => {
  const real = await importOriginal<typeof import('@/lib/mlbGrid')>();
  return { ...real, fetchMlbGridData: async () => pool(real.FRANCHISE_POOL) };
});
vi.mock('@/lib/hockeyGrid', async importOriginal => {
  const real = await importOriginal<typeof import('@/lib/hockeyGrid')>();
  return { ...real, fetchHockeyGridData: async () => pool(real.FRANCHISE_POOL) };
});

const DATE = '2026-10-17';
const TOMORROW = '2026-10-18';
const seven = Object.fromEntries(names.slice(0, 7).map((playerName, index) => [index, { playerName }]));
const cases = [
  { slug: 'nba-grid', Board: NbaGrid, puzzle: nbaPuzzle },
  { slug: 'mlb-grid', Board: MlbGrid, puzzle: mlbPuzzle },
  { slug: 'hockey-grid', Board: HockeyGrid, puzzle: hockeyPuzzle },
];

async function mount(Board: ComponentType) {
  const view = render(<MemoryRouter><Board /></MemoryRouter>);
  const controls = within(view.container);
  await waitFor(() => expect(view.container.querySelectorAll('button[aria-label]').length).toBeGreaterThanOrEqual(9));
  return { view, controls };
}
type Grid = Awaited<ReturnType<typeof mount>>;
function openSquare(grid: Grid, board: ReturnType<typeof nbaPuzzle>, index: number) {
  const row = board.rows[Math.floor(index / 3)];
  const column = board.cols[index % 3];
  fireEvent.click(grid.controls.getByRole('button', { name: `Answer for ${row.label} and ${column.label}` }));
}

function submit(grid: Grid, playerName: string) {
  io.selected = playerName;
  fireEvent.click(grid.controls.getByRole('button', { name: 'Submit fixture player' }));
}

function choose(grid: Grid, board: ReturnType<typeof nbaPuzzle>, index: number, playerName: string) {
  openSquare(grid, board, index);
  submit(grid, playerName);
}
const button = (grid: Grid, name: RegExp) => fireEvent.click(grid.controls.getByRole('button', { name }));

beforeEach(() => {
  localStorage.clear();
  io.record.mockClear();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(DATE + 'T12:00:00Z'));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

for (const { slug, Board, puzzle } of cases) {
  const key = `${slug}-daily-${DATE}`;
  const read = () => localStorage.getItem(key)!;
  const saved = () => JSON.parse(read());
  const seed = (wrong = 0) => localStorage.setItem(key, JSON.stringify({ date: DATE, cells: seven, wrong }));
  const board = puzzle(dateSeed(DATE));
  const complete = () => expect(io.record).toHaveBeenCalledExactlyOnceWith('/' + slug, 900, 'Grid Fixture Guest', 0);

  describe(slug + ' Daily board ownership', () => {
    it('preserves a distinct square before the storage event arrives', async () => {
      seed();
      const first = await mount(Board), stale = await mount(Board);
      openSquare(stale, board, 8);
      choose(first, board, 7, names[7]);
      submit(stale, names[8]);

      expect(saved()).toEqual({
        date: DATE, cells: { ...seven, 7: { playerName: names[7] }, 8: { playerName: names[8] } }, wrong: 0,
      });
      expect(stale.controls.getByText('Grid Complete!')).toBeTruthy();
      complete();
    });

    it('takes over a finished Daily without a duplicate completion', async () => {
      seed();
      const first = await mount(Board), stale = await mount(Board);
      choose(first, board, 7, names[7]);
      choose(first, board, 8, names[8]);
      const finished = read();
      choose(stale, board, 7, names[9]);
      if (!stale.controls.queryByText('Grid Complete!')) choose(stale, board, 8, names[10]);

      expect(read()).toBe(finished);
      expect(stale.controls.getByText('Grid Complete!')).toBeTruthy();
      complete();
      first.view.unmount();
      stale.view.unmount();
      const restored = await mount(Board);
      expect(restored.controls.getByText('Grid Complete!')).toBeTruthy();
      expect(read()).toBe(finished);
      complete();
    });

    it.each(['before', 'after'] as const)('never writes on a mode-only return %s the storage event', async (order) => {
      seed();
      const first = await mount(Board), stale = await mount(Board);
      button(stale, /Unlimited/);
      choose(first, board, 7, names[7]);
      choose(first, board, 8, names[8]);
      const finished = read();
      const writes = vi.spyOn(Storage.prototype, 'setItem');
      const deliverStorageEvent = () => act(() => window.dispatchEvent(new StorageEvent('storage', {
        key, newValue: finished, storageArea: localStorage,
      })));
      if (order === 'after') deliverStorageEvent();
      expect(stale.controls.queryByText('Grid Complete!')).toBeNull();
      button(stale, /Daily/);

      expect(stale.controls.getByText('Grid Complete!')).toBeTruthy();
      if (order === 'before') deliverStorageEvent();
      expect(read()).toBe(finished);
      expect(writes.mock.calls.filter(([written]) => written === key)).toEqual([]);
      complete();
    });

    it('keeps the first correct player on an already filled square', async () => {
      seed();
      const first = await mount(Board), stale = await mount(Board);
      choose(first, board, 7, names[7]);
      const firstSave = read();
      choose(stale, board, 7, names[9]);

      expect(read()).toBe(firstSave);
      expect(saved().wrong).toBe(0);
      expect(Object.keys(saved().cells)).toHaveLength(8);
      expect(stale.controls.getByText(names[7])).toBeTruthy();
      expect(io.record).not.toHaveBeenCalled();
    });

    it('closes a picker for a square filled by a peer storage notification', async () => {
      seed();
      const first = await mount(Board), stale = await mount(Board);
      openSquare(stale, board, 7);
      choose(first, board, 7, names[7]);
      const firstSave = read();
      act(() => window.dispatchEvent(new StorageEvent('storage', {
        key, newValue: firstSave, storageArea: localStorage,
      })));

      expect(stale.controls.getByText(names[7])).toBeTruthy();
      expect(stale.controls.queryByRole('button', { name: 'Submit fixture player' })).toBeNull();
      expect(read()).toBe(firstSave);
      expect(io.record).not.toHaveBeenCalled();
    });

    it('keeps the one-use player rule when a distinct square has an older picker', async () => {
      seed();
      const first = await mount(Board), stale = await mount(Board);
      openSquare(stale, board, 8);
      choose(first, board, 7, names[7]);
      submit(stale, names[7]);

      expect(saved()).toEqual({
        date: DATE, cells: { ...seven, 7: { playerName: names[7] } }, wrong: 1,
      });
      choose(stale, board, 8, names[8]);
      expect(saved().wrong).toBe(1);
      expect(stale.controls.getByText('Grid Complete!')).toBeTruthy();
      complete();
    });

    it('spends the latest remaining wrong guesses across tabs exactly once', async () => {
      seed(7);
      const first = await mount(Board), stale = await mount(Board);
      choose(first, board, 7, 'Not in the fixture key');
      expect(saved().wrong).toBe(8);
      choose(stale, board, 8, 'Not in the fixture key');
      const lost = read();
      expect(saved()).toEqual({ date: DATE, cells: seven, wrong: 9 });
      expect(stale.controls.getByText('Out of Guesses')).toBeTruthy();
      choose(first, board, 8, names[8]);

      expect(read()).toBe(lost);
      expect(first.controls.getByText('Out of Guesses')).toBeTruthy();
      expect(io.record).toHaveBeenCalledExactlyOnceWith('/' + slug, 700, 'Grid Fixture Guest', 0);
    });

    it('preserves a legacy save in Unlimited and keeps Daily on its Eastern date', async () => {
      vi.setSystemTime(new Date(TOMORROW + 'T03:59:59Z'));
      localStorage.setItem(key, JSON.stringify({ date: DATE, cells: seven }));
      const initial = read();
      const first = await mount(Board);
      button(first, /Unlimited/);
      io.selected = names[9];
      fireEvent.click(first.controls.getAllByRole('button', { name: /^Answer for / })[0]);
      fireEvent.click(first.controls.getByRole('button', { name: 'Submit fixture player' }));
      expect(read()).toBe(initial);
      expect(io.record).not.toHaveBeenCalled();

      vi.setSystemTime(new Date(TOMORROW + 'T04:00:00Z'));
      button(first, /Daily/);
      choose(first, board, 7, names[7]);
      const previousDay = read();
      expect(previousDay).toBe(JSON.stringify({
        date: DATE, cells: { ...seven, 7: { playerName: names[7] } }, wrong: 0,
      }));
      const tomorrowKey = `${slug}-daily-${TOMORROW}`;
      expect(localStorage.getItem(tomorrowKey)).toBeNull();
      first.view.unmount();

      const tomorrow = await mount(Board);
      choose(tomorrow, puzzle(dateSeed(TOMORROW)), 0, names[10]);
      expect(localStorage.getItem(tomorrowKey)).toBe(JSON.stringify({
        date: TOMORROW, cells: { 0: { playerName: names[10] } }, wrong: 0,
      }));
      expect(read()).toBe(previousDay);
      expect(io.record).not.toHaveBeenCalled();
    });
  });
}
