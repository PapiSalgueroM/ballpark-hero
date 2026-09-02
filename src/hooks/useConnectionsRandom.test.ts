import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));
vi.mock('@/lib/fetchConnectionsPuzzles', () => ({ fetchConnectionsPuzzles: vi.fn(async () => []) }));
vi.mock('@/lib/fetchBaseballConnectionsPuzzles', () => ({ fetchBaseballConnectionsPuzzles: vi.fn(async () => []) }));
vi.mock('@/lib/fetchNbaConnectionsPuzzles', () => ({ fetchNbaConnectionsPuzzles: vi.fn(async () => []) }));
vi.mock('@/lib/fetchNflConnectionsPuzzles', () => ({ fetchNflConnectionsPuzzles: vi.fn(async () => []) }));
vi.mock('@/lib/fetchNhlConnectionsPuzzles', () => ({ fetchNhlConnectionsPuzzles: vi.fn(async () => []) }));

import { useConnections } from '@/hooks/useConnections';
import { useBaseballConnections } from '@/hooks/useBaseballConnections';
import { useNbaConnections } from '@/hooks/useNbaConnections';
import { useNflConnections } from '@/hooks/useNflConnections';
import { useNhlConnections } from '@/hooks/useNhlConnections';
import { connectionsPuzzles } from '@/data/connectionsPuzzles';
import { baseballConnectionsPuzzles } from '@/data/baseballConnectionsPuzzles';
import { nbaConnectionsPuzzles } from '@/data/nbaConnectionsPuzzles';
import { nflConnectionsPuzzles } from '@/data/nflConnectionsPuzzles';
import { nhlConnectionsPuzzles } from '@/data/nhlConnectionsPuzzles';

const RANDOM_SAMPLE = 0.37;

const cases = [
  { name: 'soccer', useHook: useConnections, pool: connectionsPuzzles },
  { name: 'baseball', useHook: useBaseballConnections, pool: baseballConnectionsPuzzles },
  { name: 'basketball', useHook: useNbaConnections, pool: nbaConnectionsPuzzles },
  { name: 'football', useHook: useNflConnections, pool: nflConnectionsPuzzles },
  { name: 'hockey', useHook: useNhlConnections, pool: nhlConnectionsPuzzles },
] as const;

describe('Connections unlimited puzzle selection', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(cases)('waits for the first unlimited click before drawing a $name puzzle', async ({ useHook, pool }) => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(RANDOM_SAMPLE);
    const rendered = renderHook(() => useHook());

    await waitFor(() => expect(rendered.result.current.isLoadingPool).toBe(false));
    expect(random).not.toHaveBeenCalled();

    act(() => rendered.result.current.switchMode('unlimited'));
    expect(random).toHaveBeenCalledTimes(1);
    expect(rendered.result.current.puzzle).toBe(pool[Math.floor(RANDOM_SAMPLE * pool.length)]);

    const firstUnlimitedPuzzle = rendered.result.current.puzzle;
    act(() => rendered.result.current.switchMode('daily'));
    act(() => rendered.result.current.switchMode('unlimited'));
    expect(random).toHaveBeenCalledTimes(1);
    expect(rendered.result.current.puzzle).toBe(firstUnlimitedPuzzle);
  });
});
