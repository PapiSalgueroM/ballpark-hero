import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { careerPlayers } from '@/data/careerPlayers';
import fallbackPuzzles, { type TransferPathPuzzle } from '@/data/transferPathPuzzles';
import { useTransferPath } from '@/hooks/useTransferPath';
import { getTodayET } from '@/lib/dateUtils';

const salahToIbrahimovic = fallbackPuzzles.find(puzzle => puzzle.id === 'tp-14')!;
const goalkeeperNames = ['Alisson', 'Alisson Becker'] as const;
const io = vi.hoisted(() => ({
  puzzle: null as TransferPathPuzzle | null,
  omit: '',
  only: [] as string[],
  conflict: false,
}));
vi.mock('@/lib/fetchCareerPlayers', () => ({
  fetchCareerPlayers: async () => {
    if (io.conflict) return [...careerPlayers, { name: 'ALISSON', nationality: 'Testland', position: 'CM', career: [] }];
    if (io.only.length) return careerPlayers.filter(player => io.only.includes(player.name));
    return io.omit ? careerPlayers.filter(player => player.name !== io.omit) : [];
  },
}));
vi.mock('@/lib/fetchTransferPathPuzzles', () => ({
  fetchTransferPathPuzzles: async () => io.puzzle ? [io.puzzle] : [],
}));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));

const saved = () => localStorage.getItem(`transfer-path-daily-${getTodayET()}`);

async function mount() {
  const game = renderHook(() => useTransferPath());
  await waitFor(() => expect(game.result.current.isLoading || game.result.current.isLoadingPool).toBe(false));
  await waitFor(() => expect(game.result.current.puzzle.id).toBe(io.puzzle?.id));
  return game;
}

beforeEach(() => {
  io.puzzle = salahToIbrahimovic;
  io.omit = '';
  io.only = [];
  io.conflict = false;
  localStorage.clear();
});

describe('Transfer Path verified keeper identity', () => {
  it.each([[goalkeeperNames[0], goalkeeperNames[1]], [goalkeeperNames[1], goalkeeperNames[0]]])(
    'preserves a stored %s link and refuses %s as a second player', async (first, alternate) => {
      const game = await mount();
      act(() => expect(game.result.current.addPlayer(first)).toEqual({ ok: true, club: 'Roma' }));
      const before = saved();
      expect(JSON.parse(before!).guesses).toEqual([{ t: 'step', player: first, club: 'Roma' }]);
      game.unmount();

      const resumed = await mount();
      expect(resumed.result.current.getPlayerAliasNames(first)).toEqual([alternate]);
      act(() => expect(resumed.result.current.addPlayer(alternate)).toEqual({ ok: false, club: null, reason: 'duplicate' }));
      expect(resumed.result.current.chain).toEqual(['Mohamed Salah', first]);
      expect(saved()).toBe(before);
    },
  );

  it.each([[goalkeeperNames[0], goalkeeperNames[1]], [goalkeeperNames[1], goalkeeperNames[0]]])(
    'finishes on the stored endpoint %s when %s was selected', async (target, alternate) => {
      io.puzzle = { ...salahToIbrahimovic, id: 'fixture-keeper-endpoint', playerB: target, minSteps: 1 };
      const game = await mount();
      act(() => expect(game.result.current.addPlayer(alternate)).toEqual({ ok: true, club: 'Roma' }));
      expect(game.result.current).toMatchObject({ status: 'won', score: 1000, chain: ['Mohamed Salah', target] });
      const completed = saved();
      expect(JSON.parse(completed!).guesses).toEqual([{ t: 'step', player: target, club: 'Roma' }, { t: 'won' }]);
      game.unmount();

      const resumed = await mount();
      expect(resumed.result.current).toMatchObject({ status: 'won', score: 1000, chain: ['Mohamed Salah', target] });
      expect(saved()).toBe(completed);
    },
  );

  it('counts the same More Help doors in the archived Alisson Becker to Oyarzabal puzzle with either pool shape', async () => {
    io.puzzle = {
      id: 'tpa-762', playerA: 'Alisson Becker', playerB: 'Mikel Oyarzabal', minSteps: 2,
      hint: 'One middle man does it. He was at Liverpool with Alisson Becker and at Real Sociedad with Mikel Oyarzabal.',
    };
    io.omit = 'Alisson';
    const comparison = await mount();
    const singleKeeper = comparison.result.current.moreHelp?.doors;
    expect(singleKeeper?.total).toBeGreaterThan(0);
    comparison.unmount();

    io.omit = '';
    const game = await mount();
    expect(game.result.current.moreHelp?.doors).toEqual(singleKeeper);
  });

  it('does not give a move hint that walks back through a played goalkeeper under his other name', async () => {
    io.puzzle = { id: 'tpa-762', playerA: 'Alisson Becker', playerB: 'Mikel Oyarzabal', minSteps: 3, hint: 'Use Liverpool to start.' };
    io.only = ['Francesco Totti', 'Alisson', 'Alisson Becker', 'Alexis Mac Allister', 'Alexander Isak', 'Mikel Oyarzabal'];
    const game = await mount();
    act(() => expect(game.result.current.addPlayer('Francesco Totti')).toEqual({ ok: true, club: 'Roma' }));
    expect(game.result.current).toMatchObject({
      chain: ['Alisson Becker', 'Francesco Totti'], stranded: true, moreHelp: null,
    });
  });

  it('cannot give an unknown differently-cased row the verified keeper’s endpoint', async () => {
    io.puzzle = { ...salahToIbrahimovic, id: 'fixture-keeper-endpoint', playerB: 'Alisson Becker', minSteps: 1 };
    io.conflict = true;
    const game = await mount();
    expect(game.result.current.getPlayerAliasNames('Alisson Becker')).toEqual([]);
    act(() => expect(game.result.current.addPlayer('ALISSON')).toEqual({ ok: false, club: null }));
    expect(game.result.current.chain).toEqual(['Mohamed Salah']);
    expect(saved()).toBeNull();
  });

  it('leaves the Active rule and exact eligibility in force for the archived Alisson to Valverde puzzle', async () => {
    const active = { minSteps: 3, hint: 'Archived Active hint.' };
    io.puzzle = { id: 'tpa-619', playerA: 'Alisson', playerB: 'Federico Valverde', minSteps: 2, hint: 'Archived hint.', active };
    const game = await mount();
    act(() => game.result.current.setRule('active'));
    expect(game.result.current).toMatchObject({ rule: 'active', activeRule: 'active', optimal: 3, hint: active.hint });
    game.unmount();

    io.puzzle = { ...io.puzzle, playerA: 'Mohamed Salah' };
    const other = await mount();
    act(() => other.result.current.setRule('active'));
    act(() => expect(other.result.current.addPlayer('Alisson Becker')).toEqual({ ok: false, club: null, reason: 'unverified-active' }));
    expect(saved()).toBeNull();
    act(() => expect(other.result.current.addPlayer('Alisson')).toEqual({ ok: true, club: 'Roma' }));
    expect(other.result.current.chain).toEqual(['Mohamed Salah', 'Alisson']);
    expect(JSON.parse(saved()!).guesses).toEqual([{ t: 'step', player: 'Alisson', club: 'Roma', rule: 'active' }]);
  });
});
