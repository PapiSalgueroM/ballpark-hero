import type { ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));

import { useHigherLower } from '@/hooks/useHigherLower';
import { useNbaChain } from '@/hooks/useNbaChain';
import { useTeammates } from '@/hooks/useTeammates';
import { useConquest } from '@/hooks/useConquest';
import { useConquestNba } from '@/hooks/useConquestNba';
import { useFootballTimeline } from '@/hooks/useFootballTimeline';
import { higherLowerPlayers } from '@/data/higherLowerPlayers';
import { CHAIN_STARTERS } from '@/types/nbaChain';

const SAMPLE = 0.37;

function renderWithoutCommit<T>(useHook: () => T): T {
  let value: T | undefined;
  function Probe(): ReactNode {
    value = useHook();
    return null;
  }
  renderToString(<Probe />);
  return value as T;
}

describe('active game selection after commit', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('Higher or Lower keeps pre-commit render pure, then deals Pedri against Marcus Rashford', async () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(SAMPLE);
    const preCommit = renderWithoutCommit(useHigherLower);
    expect(random).not.toHaveBeenCalled();
    expect(preCommit.isReady).toBe(false);
    expect(preCommit.currentPlayer).toBe(higherLowerPlayers[0]);
    expect(preCommit.nextPlayer).toBe(higherLowerPlayers[1]);

    const rendered = renderHook(() => useHigherLower());
    await waitFor(() => expect(rendered.result.current.isReady).toBe(true));
    expect(rendered.result.current.currentPlayer.name).toBe('Pedri');
    expect(rendered.result.current.nextPlayer.name).toBe('Marcus Rashford');
    expect(random).toHaveBeenCalledTimes(2);
  });

  it('NBA Chain keeps pre-commit render pure, then starts with Dwyane Wade', async () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(SAMPLE);
    const preCommit = renderWithoutCommit(useNbaChain);
    expect(random).not.toHaveBeenCalled();
    expect(preCommit.isReady).toBe(false);
    expect(preCommit.chain[0].playerName).toBe(CHAIN_STARTERS[0]);

    const rendered = renderHook(() => useNbaChain());
    await waitFor(() => expect(rendered.result.current.isReady).toBe(true));
    expect(rendered.result.current.chain[0].playerName).toBe('Dwyane Wade');
    expect(random).toHaveBeenCalledTimes(1);
  });

  it('Teammates keeps pre-commit render pure, then deals Jimmy Butler and Stephen Curry', async () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(SAMPLE);
    const preCommit = renderWithoutCommit(useTeammates);
    expect(random).not.toHaveBeenCalled();
    expect(preCommit.isReady).toBe(false);

    const rendered = renderHook(() => useTeammates());
    await waitFor(() => expect(rendered.result.current.isReady).toBe(true));
    expect(rendered.result.current.currentPair?.player1).toBe('Jimmy Butler');
    expect(rendered.result.current.currentPair?.player2).toBe('Stephen Curry');
    const firstDealCalls = random.mock.calls.length;
    expect(firstDealCalls).toBeGreaterThan(0);

    act(() => rendered.result.current.resetGame());
    expect(random.mock.calls.length).toBeGreaterThan(firstDealCalls);
    expect(rendered.result.current.currentPair?.player1).toBe('Jimmy Butler');
    expect(rendered.result.current.currentPair?.player2).toBe('Stephen Curry');
  });

  it.each([
    { name: 'NFL', useHook: useConquest, expected: ['AL', 'MS', 'OK', 'SC', 'AR'] },
    { name: 'NBA', useHook: useConquestNba, expected: ['TX_S', 'CA_N'] },
  ])('$name Conquest places the exact sampled powerups only after commit', async ({ useHook, expected }) => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(SAMPLE);
    const preCommit = renderWithoutCommit(useHook);
    expect(random).not.toHaveBeenCalled();
    expect(preCommit.isReady).toBe(false);
    expect([...preCommit.powerupStates]).toEqual([]);

    const rendered = renderHook(() => useHook());
    await waitFor(() => expect(rendered.result.current.isReady).toBe(true));
    expect([...rendered.result.current.powerupStates]).toEqual(expected);
    const firstDealCalls = random.mock.calls.length;
    expect(firstDealCalls).toBeGreaterThan(0);

    act(() => rendered.result.current.reset());
    expect(random.mock.calls.length).toBeGreaterThan(firstDealCalls);
    expect([...rendered.result.current.powerupStates]).toEqual(expected);
  });

  it('Football Timeline uses one exact date-seeded scramble without Math.random', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(SAMPLE);
    const rendered = renderWithoutCommit(useFootballTimeline);

    expect(random).not.toHaveBeenCalled();
    expect(rendered.puzzle.id).toBe('tl-011');
    expect(rendered.order.map(player => player.name)).toEqual([
      'Bryce Young',
      'Drew Brees',
      'Russell Wilson',
      'Josh Allen',
      'Philip Rivers',
    ]);
  });
});
