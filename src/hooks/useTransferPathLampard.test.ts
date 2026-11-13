import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { careerPlayers } from '@/data/careerPlayers';
import { fetchCareerPlayers } from '@/lib/fetchCareerPlayers';
import { useTransferPath } from '@/hooks/useTransferPath';

const hint = 'One middle man does it. He was at Chelsea with Frank Lampard and at Barcelona with Lionel Messi.';
vi.mock('@/lib/fetchTransferPathPuzzles', () => ({
  fetchTransferPathPuzzles: async () => [{
    id: 'tp-6', playerA: 'Frank Lampard', playerB: 'Lionel Messi', minSteps: 2, hint,
    europe: { minSteps: 2, hint },
  }],
}));
vi.mock('@/lib/fetchCareerPlayers', () => ({ fetchCareerPlayers: vi.fn() }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));

const lampard = careerPlayers.find(player => player.name === 'Frank Lampard')!;
const villa = careerPlayers.find(player => player.name === 'David Villa')!;
const messi = careerPlayers.find(player => player.name === 'Lionel Messi')!;
const deco = careerPlayers.find(player => player.name === 'Deco')!;
const fetched = [lampard, villa, messi, deco];

beforeEach(() => localStorage.clear());

async function opened(players = fetched) {
  vi.mocked(fetchCareerPlayers).mockResolvedValue(players);
  const view = renderHook(useTransferPath);
  await waitFor(() => expect(view.result.current.isLoadingPool).toBe(false));
  await waitFor(() => expect(view.result.current.isLoading).toBe(false));
  expect(view.result.current.chain).toEqual(['Frank Lampard']);
  return view.result;
}

describe('Transfer Path verified 2015 New York stint', () => {
  it.each([['fetched', fetched], ['fallback', []]] as const)(
    'accepts the exact two-step Everyday solution from the %s pool without changing the stored minimum',
    async (_, players) => {
      const source = JSON.stringify(careerPlayers);
      const result = await opened([...players]);
      expect(result.current.optimal).toBe(2);
      expect(result.current.hint).toBe(hint);
      act(() => expect(result.current.addPlayer('David Villa')).toEqual({ ok: true, club: 'New York City FC' }));
      expect(result.current.chain).toEqual(['Frank Lampard', 'David Villa', 'Lionel Messi']);
      expect(result.current.connections).toEqual([null, 'New York City FC', 'Barcelona']);
      expect(result.current.status).toBe('won');
      expect(result.current.score).toBe(1000);
      expect(result.current.getPlayerClubs('Frank Lampard')).toEqual(new Set(['Chelsea', 'New York City FC']));
      expect(JSON.stringify(careerPlayers)).toBe(source);
    },
  );

  it('provides the same corrected link in reveal and refuses the MLS edge under Europe only', async () => {
    const result = await opened([lampard, villa, messi]);
    act(() => result.current.giveUp());
    expect(result.current.revealPath).toEqual([
      { player: 'Frank Lampard', club: null },
      { player: 'David Villa', club: 'New York City FC' },
      { player: 'Lionel Messi', club: 'Barcelona' },
    ]);

    localStorage.clear();
    const europe = await opened();
    act(() => europe.current.setRule('europe'));
    act(() => expect(europe.current.addPlayer('David Villa')).toEqual({ ok: false, club: null, reason: 'outside-europe' }));
    act(() => expect(europe.current.addPlayer('Deco')).toEqual({ ok: true, club: 'Chelsea' }));
    expect(europe.current.score).toBe(1000);
  });

  it.each([
    ['wrong nationality', [{ ...lampard, nationality: 'Spain' }, villa, messi]],
    ['wrong position', [{ ...lampard, position: 'ST' }, villa, messi]],
    ['missing Chelsea anchor', [{ ...lampard, career: lampard.career.slice(0, -1) }, villa, messi]],
    ['ambiguous identity', [lampard, { ...lampard, nationality: 'Spain' }, villa, messi]],
  ])('keeps the refusal with %s', async (_, players) => {
    const result = await opened(players);
    act(() => expect(result.current.addPlayer('David Villa')).toEqual({ ok: false, club: null }));
  });
});
