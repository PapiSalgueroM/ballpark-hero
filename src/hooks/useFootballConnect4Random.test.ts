import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));

import { useFootballConnect4 } from '@/hooks/useFootballConnect4';
import { FOOTBALL_CONNECT4_BOARDS } from '@/types/footballConnect4';

const RANDOM_SAMPLE = 0.37;

describe('Soccer Connect 4 unlimited board selection', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('waits for the unlimited click before drawing an unlimited board', async () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(RANDOM_SAMPLE);
    const rendered = renderHook(() => useFootballConnect4());

    await waitFor(() => expect(rendered.result.current.isLoading).toBe(false));
    expect(random).not.toHaveBeenCalled();

    act(() => rendered.result.current.switchMode('unlimited'));
    expect(random).toHaveBeenCalledTimes(1);
    expect(rendered.result.current.boardConfig).toBe(
      FOOTBALL_CONNECT4_BOARDS[Math.floor(RANDOM_SAMPLE * FOOTBALL_CONNECT4_BOARDS.length)],
    );

    act(() => rendered.result.current.switchMode('daily'));
    act(() => rendered.result.current.switchMode('unlimited'));
    expect(random).toHaveBeenCalledTimes(2);
    expect(rendered.result.current.boardConfig).toBe(
      FOOTBALL_CONNECT4_BOARDS[Math.floor(RANDOM_SAMPLE * FOOTBALL_CONNECT4_BOARDS.length)],
    );
  });
});
