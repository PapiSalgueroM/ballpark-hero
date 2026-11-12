import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useFootballGrid } from '@/hooks/useFootballGrid';
import { normalizeGridName } from '@/lib/gridEngine';
import { positionGroup } from '@/lib/nflGrid';

const oldLabel = 'Adrian Peterson (2007-2020)';
const currentLabel = 'Adrian Peterson (2007-2021)';
const { rarityKeys, insert } = vi.hoisted(() => ({ rarityKeys: [] as string[], insert: vi.fn() }));

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => {} }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => {
        let playerName = '';
        const request = {
          eq(column: string, value: string) {
            if (column === 'player_name') playerName = value;
            return request;
          },
          then(resolve: (result: { count: number }) => void) {
            if (playerName) rarityKeys.push(playerName);
            resolve({ count: playerName ? 2 : 8 });
          },
        };
        return request;
      },
      insert,
    }),
  },
}));
vi.mock('@/lib/nflGrid', async importOriginal => {
  const real = await importOriginal<typeof import('@/lib/nflGrid')>();
  return {
    ...real,
    fetchNflGridData: async () => {
      const player = {
        name: currentLabel,
        franchises: new Set(['ARI', 'DET', 'MIN', 'SEA', 'TEN', 'WAS']),
        groups: new Set([positionGroup('RB')]),
        draftRound: 1, draftPick: 7, undrafted: false,
        pass4k: 0, rush1k: 8, rec1k: 0, sbWins: 0,
      };
      return { players: [player], byNormalizedName: new Map([[normalizeGridName(player.name), [player]]]) };
    },
  };
});

beforeEach(() => {
  localStorage.clear();
  rarityKeys.length = 0;
  insert.mockReset();
  vi.useFakeTimers({ toFake: ['Date'] });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it('accepts Peterson for Tennessee and Seattle and uses his existing rarity key', async () => {
  vi.setSystemTime(new Date('2026-11-05T16:00:00Z'));
  const { result } = renderHook(useFootballGrid);
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.puzzle.id).toBe('grid-20261105');
  expect(result.current.puzzle.engine.rows[1].id).toBe('TEN');
  expect(result.current.puzzle.engine.cols[2].id).toBe('SEA');
  act(() => result.current.setActiveCell(5));
  await act(() => result.current.submitGuess(currentLabel));

  expect(result.current.cells[5]).toMatchObject({ status: 'correct', playerName: currentLabel });
  expect(rarityKeys).toEqual([oldLabel.toLowerCase()]);
  expect(insert).toHaveBeenCalledExactlyOnceWith({
    puzzle_id: 'grid-20261105', cell_index: 5, player_name: oldLabel.toLowerCase(),
  });
});

it('restores the old label and refuses the same player in another eligible cell', async () => {
  vi.setSystemTime(new Date('2026-09-22T16:00:00Z'));
  const storageKey = 'football-grid-daily-2026-09-22';
  const saved = JSON.stringify({
    v: 1, date: '2026-09-22', puzzleIndex: 0, puzzleId: 'grid-20260922', gameStatus: 'playing',
    guesses: [{ t: 'ok', cellIndex: 2, playerName: oldLabel, rarity: 41 }],
  });
  localStorage.setItem(storageKey, saved);
  const { result } = renderHook(useFootballGrid);
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.cells[2]).toMatchObject({ status: 'correct', playerName: oldLabel, rarity: 41 });
  expect(result.current.puzzle.engine.rows[1].id).toBe('DET');
  expect(result.current.puzzle.engine.cols[2].id).toBe('MIN');
  act(() => result.current.setActiveCell(5));
  await act(() => result.current.submitGuess(currentLabel));

  expect(result.current.correctCount).toBe(1);
  expect(result.current.guessesLeft).toBe(14);
  expect(localStorage.getItem(storageKey)).toBe(saved);
  expect(insert).not.toHaveBeenCalled();
});
