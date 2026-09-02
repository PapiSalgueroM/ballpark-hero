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

import { useAflHL } from '@/hooks/useAflHL';
import { useCfbHL } from '@/hooks/useCfbHL';
import { useF1HL } from '@/hooks/useF1HL';
import { useGolfHL } from '@/hooks/useGolfHL';
import { useHockeyHL } from '@/hooks/useHockeyHL';
import { useMlbHL } from '@/hooks/useMlbHL';
import { useNbaHL } from '@/hooks/useNbaHL';
import { useNflHL } from '@/hooks/useNflHL';
import { useTennisHL } from '@/hooks/useTennisHL';

const SAMPLE = 0.37;
const cases = [
  { name: 'AFL', useHook: useAflHL, expected: ['Brent Harvey', 'Brad Johnson'] },
  { name: 'college football', useHook: useCfbHL, expected: ['Tua Tagovailoa', 'Timmy Chang'] },
  { name: 'F1', useHook: useF1HL, expected: ['Oscar Piastri', 'Sebastian Vettel'] },
  { name: 'golf', useHook: useGolfHL, expected: ['Nick Price', 'John Henry Taylor'] },
  { name: 'hockey', useHook: useHockeyHL, expected: ['Patrick Kane', 'Gordie Howe'] },
  { name: 'MLB', useHook: useMlbHL, expected: ['Jason Giambi', 'Alex Rodriguez'] },
  { name: 'NBA', useHook: useNbaHL, expected: ['Clyde Drexler', 'Tony Parker'] },
  { name: 'NFL', useHook: useNflHL, expected: ['Justin Herbert', 'Philip Rivers'] },
  { name: 'tennis', useHook: useTennisHL, expected: ['Carlos Alcaraz', 'Kim Clijsters'] },
] as const;

function pairNames(pair: unknown): string[] {
  if (Array.isArray(pair)) return [pair[0].name, pair[1].name];
  const named = pair as { player1: { name: string }; player2: { name: string } };
  return [named.player1.name, named.player2.name];
}

describe('Higher or Lower unlimited pair selection', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it.each(cases)('$name keeps daily render pure and deals on every Unlimited entry', ({ useHook, expected }) => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(SAMPLE);
    const rendered = renderHook(() => useHook());

    expect(random).not.toHaveBeenCalled();

    act(() => rendered.result.current.switchMode('unlimited'));
    expect(random).toHaveBeenCalledTimes(1);
    expect(pairNames(rendered.result.current.currentPair)).toEqual(expected);

    act(() => rendered.result.current.switchMode('daily'));
    act(() => rendered.result.current.switchMode('unlimited'));
    expect(random).toHaveBeenCalledTimes(2);
    expect(pairNames(rendered.result.current.currentPair)).toEqual(expected);
  });
});
