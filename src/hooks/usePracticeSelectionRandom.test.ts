import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));
vi.mock('@/hooks/useDailyPuzzle', () => ({
  useDailyPuzzle: (options: { puzzles: unknown[]; supabasePuzzle?: unknown }) => ({
    puzzle: options.supabasePuzzle ?? options.puzzles[0],
    puzzleIndex: 0,
    guesses: [],
    addGuess: vi.fn(),
    gameStatus: 'playing',
    isLoading: false,
    reset: vi.fn(),
    todayStr: '2026-09-02',
  }),
}));
vi.mock('@/lib/fetchFootlePlayerPool', () => ({ fetchFootlePlayerPool: vi.fn(() => new Promise(() => {})) }));
vi.mock('@/lib/fetchCareerPlayers', () => ({ fetchCareerPlayers: vi.fn(() => new Promise(() => {})) }));

import { useGame } from '@/hooks/useGame';
import { useCareerGame } from '@/hooks/useCareerGame';
import { players } from '@/data/players';
import { careerPlayers } from '@/data/careerPlayers';

const SAMPLE = 0.37;
const footleEasy = players.filter(player => player.difficulty === 'easy');

const cases = [
  { name: 'Footle', useHook: useGame, pool: footleEasy },
  { name: 'Career Path', useHook: useCareerGame, pool: careerPlayers },
] as const;

describe('practice target selection', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it.each(cases)('$name does not deal its hidden practice target until Unlimited is opened', ({ useHook, pool }) => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(SAMPLE);
    const rendered = renderHook(() => useHook());

    expect(random).not.toHaveBeenCalled();

    act(() => rendered.result.current.switchMode('unlimited'));
    expect(random).toHaveBeenCalledTimes(1);
    expect(rendered.result.current.targetPlayer).toBe(pool[Math.floor(SAMPLE * pool.length)]);

    act(() => rendered.result.current.switchMode('daily'));
    act(() => rendered.result.current.switchMode('unlimited'));
    expect(random).toHaveBeenCalledTimes(1);
    expect(rendered.result.current.targetPlayer).toBe(pool[Math.floor(SAMPLE * pool.length)]);

    act(() => rendered.result.current.resetGame());
    expect(random).toHaveBeenCalledTimes(2);
    expect(rendered.result.current.targetPlayer).toBe(pool[Math.floor(SAMPLE * pool.length)]);
  });
});
