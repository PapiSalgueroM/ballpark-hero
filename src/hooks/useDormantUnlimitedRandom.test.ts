import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));
vi.mock('@/hooks/useDailyPuzzle', () => ({
  useDailyPuzzle: (options: { puzzles: unknown[] }) => ({
    puzzle: options.puzzles[0],
    puzzleIndex: 0,
    guesses: [],
    addGuess: vi.fn(),
    gameStatus: 'playing',
    isLoading: false,
    reset: vi.fn(),
    todayStr: '2026-09-02',
  }),
}));

import { useBaseballCareer } from '@/hooks/useBaseballCareer';
import { useHockeyCareer } from '@/hooks/useHockeyCareer';
import { useNbaCareer } from '@/hooks/useNbaCareer';
import { useOlympics } from '@/hooks/useOlympics';
import { useUfcGame } from '@/hooks/useUfcGame';
import { baseballCareerPuzzles } from '@/data/baseballCareerPlayers';
import { hockeyCareerPuzzles } from '@/data/hockeyCareerPlayers';
import { nbaCareerPuzzles } from '@/data/nbaCareerPlayers';
import { olympicAthletes } from '@/data/olympicsAthletes';
import { uniqueUfcFighters } from '@/data/ufcFighters';

const SAMPLE = 0.37;
const cases: Array<{
  name: string;
  useHook: () => any;
  pool: readonly unknown[];
  selected: (value: any) => unknown;
}> = [
  { name: 'baseball career', useHook: useBaseballCareer, pool: baseballCareerPuzzles, selected: value => value.puzzle },
  { name: 'hockey career', useHook: useHockeyCareer, pool: hockeyCareerPuzzles, selected: value => value.puzzle },
  { name: 'NBA career', useHook: useNbaCareer, pool: nbaCareerPuzzles, selected: value => value.puzzle },
  { name: 'Olympics', useHook: useOlympics, pool: olympicAthletes, selected: value => value.athlete },
  { name: 'UFC', useHook: useUfcGame, pool: uniqueUfcFighters, selected: value => value.targetFighter },
];

describe('daily games with dormant Unlimited state', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it.each(cases)('$name waits for the first Unlimited entry and keeps that exact selection', ({ useHook, pool, selected }) => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(SAMPLE);
    const rendered = renderHook(() => useHook());

    expect(random).not.toHaveBeenCalled();

    act(() => rendered.result.current.switchMode('unlimited'));
    expect(random).toHaveBeenCalledTimes(1);
    expect(selected(rendered.result.current)).toBe(pool[Math.floor(SAMPLE * pool.length)]);

    act(() => rendered.result.current.switchMode('daily'));
    act(() => rendered.result.current.switchMode('unlimited'));
    expect(random).toHaveBeenCalledTimes(1);
    expect(selected(rendered.result.current)).toBe(pool[Math.floor(SAMPLE * pool.length)]);

    act(() => rendered.result.current.resetGame());
    expect(random).toHaveBeenCalledTimes(2);
    expect(selected(rendered.result.current)).toBe(pool[Math.floor(SAMPLE * pool.length)]);
  });
});
