import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSoccerGrid } from '@/hooks/useSoccerGrid';
import { getTodayET } from '@/lib/dateUtils';

const io = vi.hoisted(() => ({ from: vi.fn(), validate: vi.fn(), selectPlayer: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: io.from, functions: { invoke: io.validate } },
}));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));

const puzzleRows = ['normal', 'hard'].flatMap(tier => Array.from({ length: 20 }, (_, index) => ({
  puzzle_id: tier + '-' + index,
  rows_json: [0, 1, 2].map(row => ({
    label: tier + ' row ' + row,
    type: tier === 'hard' || row === 0 ? 'award' : 'club',
  })),
  cols_json: [0, 1, 2].map(col => ({ label: tier + ' column ' + col, type: 'position' })),
})));

const dailyKey = () => 'soccer-grid-daily-' + getTodayET();
const settingsKey = () => 'soccer-grid-settings-' + getTodayET();
const timerKey = () => 'soccer-grid-timer-started-' + getTodayET();

function holdAnswer() {
  let release!: (value: unknown) => void;
  const response = new Promise(resolve => { release = resolve; });
  io.validate.mockReturnValueOnce(response);
  return release;
}

async function openGrid() {
  const view = renderHook(() => useSoccerGrid());
  await waitFor(() => expect(view.result.current.isLoadingPool).toBe(false));
  return view;
}

function chooseCell(view: Awaited<ReturnType<typeof openGrid>>) {
  act(() => view.result.current.setActiveCell(0));
}

function submit(view: Awaited<ReturnType<typeof openGrid>>, name: string) {
  let pending!: Promise<void>;
  act(() => { pending = view.result.current.submitGuess(name); });
  return pending;
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  io.selectPlayer.mockResolvedValue({ error: null });
  io.from.mockImplementation(table => {
    if (table === 'soccer_grid_puzzles') return {
      select: () => ({ order: () => Promise.resolve({ data: puzzleRows, error: null }) }),
    };
    const count = Promise.resolve({ count: 1 });
    const query = { eq: () => query, then: count.then.bind(count) };
    return { select: () => query, insert: io.selectPlayer };
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Soccer Grid first counted guess owns the round across tabs', () => {
  it('restores the accepted board and timer after another tab changes tentative settings', async () => {
    const now = Date.now();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
    const first = await openGrid();
    const other = await openGrid();
    const puzzleId = first.result.current.puzzle.id;
    act(() => first.result.current.setTimerMode(90));
    chooseCell(first);
    const release = holdAnswer();
    const pending = submit(first, 'Cafu');
    const started = localStorage.getItem(timerKey());
    expect(started).not.toBeNull();
    act(() => other.result.current.setDifficulty('hard'));
    act(() => other.result.current.setTimerMode(40));
    expect(other.result.current.puzzle.id).not.toBe(puzzleId);
    expect(JSON.parse(localStorage.getItem(settingsKey())!)).toEqual({ difficulty: 'hard', timerMode: 40 });
    clock.mockReturnValue(now + 1000);
    chooseCell(other);
    const releaseOther = holdAnswer();
    const secondPending = submit(other, 'Andreas Brehme');
    expect(localStorage.getItem(timerKey())).toBe(String(now + 1000));
    await act(async () => {
      release({ data: { valid: true, fullName: 'Cafu' } });
      await pending;
    });
    await act(async () => {
      releaseOther({ data: { valid: false, unverified: true } });
      await secondPending;
    });
    const bytes = localStorage.getItem(dailyKey())!;
    expect(JSON.parse(bytes)).toMatchObject({
      puzzleId, guesses: [{ t: 'ok', cellIndex: 0, playerName: 'Cafu' }],
    });
    const refreshed = await openGrid();
    expect(refreshed.result.current.puzzle.id).toBe(puzzleId);
    expect(refreshed.result.current.cells[0].playerName).toBe('Cafu');
    expect(refreshed.result.current.settings).toEqual({ difficulty: 'normal', timerMode: 90 });
    expect(localStorage.getItem(timerKey())).toBe(started);
    expect(localStorage.getItem(dailyKey())).toBe(bytes);
  });

  it('recovers an older played board even when tentative settings were saved for another board', async () => {
    const original = await openGrid();
    const puzzleId = original.result.current.puzzle.id;
    act(() => original.result.current.setDifficulty('hard'));
    original.unmount();
    const bytes = JSON.stringify({
      v: 1, date: getTodayET(), puzzleIndex: 0, puzzleId,
      guesses: [{ t: 'ok', cellIndex: 0, playerName: 'Cafu', rarity: 100 }], gameStatus: 'playing',
    });
    localStorage.setItem(dailyKey(), bytes);
    const refreshed = await openGrid();
    expect(refreshed.result.current.puzzle.id).toBe(puzzleId);
    expect(refreshed.result.current.cells[0].playerName).toBe('Cafu');
    expect(localStorage.getItem(dailyKey())).toBe(bytes);
  });

  it('keeps the earlier accepted guess when a different board is still validating', async () => {
    const first = await openGrid();
    const stale = await openGrid();
    const puzzleId = first.result.current.puzzle.id;
    act(() => stale.result.current.setDifficulty('hard'));
    chooseCell(stale);
    const releaseStale = holdAnswer();
    const stalePending = submit(stale, 'Andreas Brehme');
    chooseCell(first);
    const releaseFirst = holdAnswer();
    const firstPending = submit(first, 'Cafu');
    await act(async () => {
      releaseFirst({ data: { valid: true, fullName: 'Cafu' } });
      await firstPending;
    });
    const bytes = localStorage.getItem(dailyKey())!;
    await act(async () => {
      releaseStale({ data: { valid: true, fullName: 'Andreas Brehme' } });
      await stalePending;
    });
    expect(localStorage.getItem(dailyKey())).toBe(bytes);
    expect(io.selectPlayer).toHaveBeenCalledTimes(1);
    expect(stale.result.current.puzzle.id).toBe(puzzleId);
    expect(stale.result.current.cells[0].playerName).toBe('Cafu');
  });
});
