import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFootballGrid } from '@/hooks/useFootballGrid';

const io = vi.hoisted(() => ({ count: vi.fn(), insert: vi.fn(), record: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => {
        const query = { eq: () => query, then: (resolve: (value: unknown) => void, reject: (error: unknown) => void) => io.count().then(resolve, reject) };
        return query;
      },
      insert: io.insert,
    }),
  },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: io.record, getCurrentPlayerName: () => 'Grid Fixture Guest' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/lib/nflGrid', async importOriginal => {
  const real = await importOriginal<typeof import('@/lib/nflGrid')>();
  const { normalizeGridName } = await import('@/lib/gridEngine');
  const players = [
    { name: 'Aaron Pierce', teams: ['BAL', 'NYG'], pos: 'TE' },
    { name: 'Anthony Wright', teams: ['BAL', 'CIN', 'DAL', 'NYG', 'PIT'], pos: 'QB' },
    { name: 'Adam Schreiber', teams: ['ATL', 'MIN', 'NO', 'NYG', 'NYJ', 'PHI', 'SEA'], pos: 'OL' },
    { name: 'Frank Walker', teams: ['BAL', 'DAL', 'GB', 'MIN', 'NYG'], pos: 'CB' },
  ].map(({ name, teams, pos }) => ({
    name, franchises: new Set(teams), groups: new Set([real.positionGroup(pos)]),
    draftRound: null, draftPick: null, undrafted: false, pass4k: 0, rush1k: 0, rec1k: 0, sbWins: 0,
  }));
  return { ...real, fetchNflGridData: async () => ({
    players, byNormalizedName: new Map(players.map(player => [normalizeGridName(player.name), [player]])),
  }) };
});

const DATE = '2026-10-17';
const SAVE_KEY = 'football-grid-daily-' + DATE;
const PUZZLE_ID = 'grid-20261017';
const FIRST = 'Aaron Pierce';
const PENDING = 'Anthony Wright';
const NINTH = 'Adam Schreiber';
const firstSeven = ['Abram Elam', 'Alohi Gilman', 'Ahmad Dixon', 'Alex Ellis', 'Allen Reisner', 'Ben Ellefson', 'Al Dixon'];
const answer = (cellIndex: number, playerName: string, rarity: number) => ({ t: 'ok', cellIndex, playerName, rarity });
const selection = (cell_index: number, player: string) => ({ puzzle_id: PUZZLE_ID, cell_index, player_name: player.toLowerCase() });

function defer() {
  let release!: () => void;
  let fail!: (error: Error) => void;
  const promise = new Promise((resolve, reject) => {
    release = () => resolve({ count: 0 });
    fail = reject;
  });
  return { promise, release, fail };
}
type GridView = ReturnType<typeof renderHook<ReturnType<typeof useFootballGrid>, unknown>>;
function start(view: GridView, index: number, name: string) {
  act(() => view.result.current.setActiveCell(index));
  let pending!: Promise<void>;
  act(() => { pending = view.result.current.submitGuess(name); });
  return pending;
}
async function submit(view: GridView, index: number, name: string) {
  const pending = start(view, index, name);
  await act(async () => { await pending; });
}
function deliverSave() {
  window.dispatchEvent(new StorageEvent('storage', { key: SAVE_KEY, newValue: localStorage.getItem(SAVE_KEY), storageArea: localStorage }));
}
function assertEight(view: GridView, save: string | null) {
  const current = view.result.current;
  expect(current.gameStatus).toBe('playing');
  expect(current.correctCount).toBe(8);
  expect(current.guessesLeft).toBe(7);
  expect(current.cells[7]).toMatchObject({ status: 'correct', playerName: FIRST });
  expect(current.cells[8].status).toBe('empty');
  expect(localStorage.getItem(SAVE_KEY)).toBe(save);
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(DATE + 'T12:00:00Z'));
  io.record.mockReset();
  io.count.mockReset().mockResolvedValue({ count: 0 });
  io.insert.mockReset().mockResolvedValue({ error: null });
  localStorage.setItem(SAVE_KEY, JSON.stringify({
    v: 1, date: DATE, puzzleIndex: 0, puzzleId: PUZZLE_ID, gameStatus: 'playing',
    guesses: firstSeven.map((name, index) => answer(index, name, 20)),
  }));
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

async function openGrids() {
  const first = renderHook(useFootballGrid);
  const second = renderHook(useFootballGrid);
  await waitFor(() => {
    for (const { result } of [first, second]) {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.puzzle.id).toBe(PUZZLE_ID);
      expect(result.current.correctCount).toBe(7);
    }
  });
  return { first, second };
}

describe('NFL Grid settles pending answers against the current board', () => {
  it.each(['rarity', 'selection insert', 'rejected selection insert'])('drops a duplicate cell after a pending %s', async boundary => {
    const { first, second } = await openGrids();
    const held = defer();
    const beforeWrite = boundary === 'rarity';
    const request = beforeWrite ? io.count : io.insert;
    request.mockImplementationOnce(() => held.promise);

    const pending = start(second, 7, PENDING);
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    await submit(first, 7, FIRST);
    const save = localStorage.getItem(SAVE_KEY);
    expect(JSON.parse(save!).guesses.at(-1)).toEqual(answer(7, FIRST, 101));

    await act(async () => {
      deliverSave();
      if (boundary === 'rejected selection insert') held.fail(new Error('Fixture selection write failure'));
      else held.release();
      await pending;
    });

    assertEight(second, save);
    expect(second.result.current.validating).toBe(false);
    expect(second.result.current.activeCell).toBeNull();
    expect(io.record).not.toHaveBeenCalled();
    expect(io.insert.mock.calls).toEqual(beforeWrite
      ? [[selection(7, FIRST)]]
      : [[selection(7, PENDING)], [selection(7, FIRST)]]);
  });

  it('adopts a newer persisted save before writing when the storage event is delayed', async () => {
    const { first, second } = await openGrids();
    const held = defer();
    io.count.mockImplementationOnce(() => held.promise);
    const pending = start(second, 7, PENDING);
    await waitFor(() => expect(io.count).toHaveBeenCalledTimes(1));
    await submit(first, 7, FIRST);
    const save = localStorage.getItem(SAVE_KEY);
    expect(second.result.current.correctCount).toBe(7);

    await act(async () => { held.release(); await pending; });

    assertEight(second, save);
    expect(io.insert).toHaveBeenCalledExactlyOnceWith(selection(7, FIRST));
    expect(io.record).not.toHaveBeenCalled();
  });

  it('drops a pending player already used in a different square', async () => {
    const { first, second } = await openGrids();
    const player = 'Frank Walker';
    const held = defer();
    io.count.mockImplementationOnce(() => held.promise);
    const pending = start(second, 8, player);
    await waitFor(() => expect(io.count).toHaveBeenCalledTimes(1));
    await submit(first, 7, player);
    const save = localStorage.getItem(SAVE_KEY);
    await act(async () => { deliverSave(); held.release(); await pending; });

    expect(second.result.current.gameStatus).toBe('playing');
    expect(second.result.current.cells[7]).toMatchObject({ status: 'correct', playerName: player });
    expect(second.result.current.cells[8].status).toBe('empty');
    expect(localStorage.getItem(SAVE_KEY)).toBe(save);
    expect(io.insert).toHaveBeenCalledExactlyOnceWith(selection(7, player));
    expect(io.record).not.toHaveBeenCalled();
  });

  it('lets a pending valid answer fill a different empty cell after adoption', async () => {
    const { first, second } = await openGrids();
    const held = defer();
    io.count.mockImplementationOnce(() => held.promise);
    const pending = start(second, 8, NINTH);
    await waitFor(() => expect(io.count).toHaveBeenCalledTimes(1));
    await submit(first, 7, FIRST);
    await act(async () => { deliverSave(); held.release(); await pending; });

    const saved = JSON.parse(localStorage.getItem(SAVE_KEY)!);
    expect(saved.gameStatus).toBe('won');
    expect(saved.guesses.slice(-2)).toEqual([answer(7, FIRST, 101), answer(8, NINTH, 101)]);
    expect(second.result.current.cells.every(cell => cell.status === 'correct')).toBe(true);
    expect(second.result.current.guessesLeft).toBe(6);
    expect(io.record).toHaveBeenCalledExactlyOnceWith('/football-grid', 900, 'Grid Fixture Guest', 0);
    expect(io.insert.mock.calls).toEqual([[selection(7, FIRST)], [selection(8, NINTH)]]);
  });

  it('keeps the local correct answer when a current selection write fails', async () => {
    const { first } = await openGrids();
    io.insert.mockRejectedValueOnce(new Error('Fixture selection write failure'));
    await submit(first, 7, FIRST);

    expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).guesses.at(-1)).toEqual(answer(7, FIRST, 50));
    expect(first.result.current.guessesLeft).toBe(7);
    expect(io.insert).toHaveBeenCalledExactlyOnceWith(selection(7, FIRST));
    expect(io.record).not.toHaveBeenCalled();
  });

  it('still charges one attempt for a wrong answer with no rarity request', async () => {
    const { first } = await openGrids();
    await submit(first, 8, FIRST);

    expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).guesses.at(-1)).toEqual({ t: 'x' });
    expect(first.result.current.guessesLeft).toBe(7);
    expect(first.result.current.cells[8].status).toBe('wrong');
    expect(io.count).not.toHaveBeenCalled();
    expect(io.insert).not.toHaveBeenCalled();
    expect(io.record).not.toHaveBeenCalled();
  });
});
