import type { ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));

import { useMlbConnect4 } from '@/hooks/useMlbConnect4';
import { useNbaConnect4 } from '@/hooks/useNbaConnect4';
import { useNflConnect4 } from '@/hooks/useNflConnect4';
import { useNhlConnect4 } from '@/hooks/useNhlConnect4';
import { curatedBoards as mlbBoards } from '@/data/mlbConnect4Boards';
import { curatedBoards as nbaBoards } from '@/data/nbaConnect4Boards';
import { curatedBoards as nflBoards } from '@/data/nflConnect4Boards';
import { curatedBoards as nhlBoards } from '@/data/nhlConnect4Boards';

const SAMPLE = 0.37;
const cases = [
  { name: 'MLB', useHook: useMlbConnect4, boards: mlbBoards },
  { name: 'NBA', useHook: useNbaConnect4, boards: nbaBoards },
  { name: 'NFL', useHook: useNflConnect4, boards: nflBoards },
  { name: 'NHL', useHook: useNhlConnect4, boards: nhlBoards },
] as const;

function renderWithoutCommit<T>(useHook: () => T): T {
  let value: T | undefined;
  function Probe(): ReactNode {
    value = useHook();
    return null;
  }
  renderToString(<Probe />);
  return value as T;
}

describe('Connect 4 first board selection', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each(cases)('$name waits until commit, then deals the exact sampled board', async ({ useHook, boards }) => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(SAMPLE);

    const preCommit = renderWithoutCommit(useHook);
    expect(random).not.toHaveBeenCalled();
    expect(preCommit.isReady).toBe(false);
    expect(preCommit.board).toBe(boards[0]);

    const rendered = renderHook(() => useHook());
    await waitFor(() => expect(rendered.result.current.isReady).toBe(true));
    expect(random).toHaveBeenCalledTimes(1);
    expect(rendered.result.current.board).toBe(boards[Math.floor(SAMPLE * boards.length)]);

    act(() => rendered.result.current.resetGame());
    expect(random).toHaveBeenCalledTimes(2);
    expect(rendered.result.current.board).toBe(boards[Math.floor(SAMPLE * boards.length)]);
  });
});
