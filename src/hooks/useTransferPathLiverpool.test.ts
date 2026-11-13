import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { careerPlayers } from '@/data/careerPlayers';
import { useTransferPath } from '@/hooks/useTransferPath';
import { fetchCareerPlayers } from '@/lib/fetchCareerPlayers';
import { clubSeasonsOf, shareClub } from '@/lib/transferPathGraph';
import type { CareerPlayer } from '@/types/career';

const hint = 'Two middle men at least. The first was at Real Sociedad with Mikel Oyarzabal; the last was at Liverpool with Trent Alexander-Arnold.';
vi.mock('@/lib/fetchTransferPathPuzzles', () => ({
  fetchTransferPathPuzzles: async () => [{
    id: 'tpa-771', playerA: 'Mikel Oyarzabal', playerB: 'Trent Alexander-Arnold', minSteps: 3, hint,
    active: null, europe: { minSteps: 3, hint },
  }],
}));
vi.mock('@/lib/fetchCareerPlayers', () => ({ fetchCareerPlayers: vi.fn() }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));

const isak = careerPlayers.find(player => player.name === 'Alexander Isak')!;
const vanDijk = careerPlayers.find(player => player.name === 'Virgil van Dijk')!;
const fetched = careerPlayers.filter(player => [
  'Alexander Isak', 'Virgil van Dijk', 'Mikel Oyarzabal', 'Trent Alexander-Arnold',
].includes(player.name));

beforeEach(() => localStorage.clear());

async function opened(players: CareerPlayer[]) {
  vi.mocked(fetchCareerPlayers).mockResolvedValue(players);
  const view = renderHook(useTransferPath);
  await waitFor(() => expect(view.result.current.isLoadingPool).toBe(false));
  await waitFor(() => expect(view.result.current.isLoading).toBe(false));
  expect(view.result.current.chain).toEqual(['Mikel Oyarzabal']);
  return view.result;
}

describe('Transfer Path verified Liverpool 2025-26 membership', () => {
  it.each([['fetched', 'classic', fetched], ['fallback', 'europe', []]] as const)(
    'accepts the reported solution with the %s pool under %s',
    async (_, rule, players) => {
      const source = JSON.stringify(careerPlayers);
      const result = await opened([...players]);
      act(() => result.current.setRule(rule));
      expect(result.current.optimal).toBe(3);
      expect(result.current.hint).toBe(hint);
      act(() => expect(result.current.addPlayer(isak.name)).toEqual({ ok: true, club: 'Real Sociedad' }));
      act(() => expect(result.current.addPlayer(vanDijk.name)).toEqual({ ok: true, club: 'Liverpool' }));
      expect(result.current.chain).toEqual(['Mikel Oyarzabal', isak.name, vanDijk.name, 'Trent Alexander-Arnold']);
      expect(result.current.connections).toEqual([null, 'Real Sociedad', 'Liverpool', 'Liverpool']);
      expect(result.current.status).toBe('won');
      expect(result.current.score).toBe(1000);
      expect(JSON.stringify(careerPlayers)).toBe(source);
    },
  );

  it('keeps Active and ambiguous or unverified identities on their original graph', () => {
    for (const pool of [
      fetched, [...fetched, { ...isak, nationality: 'England' }],
      [vanDijk, { ...isak, nationality: 'England' }],
      [vanDijk, { ...isak, position: 'CB' }],
      [vanDijk, { ...isak, career: isak.career.filter(stint => stint.club !== 'Newcastle') }],
    ]) {
      expect(shareClub(clubSeasonsOf(pool, 'active'), isak.name, vanDijk.name)).toBeNull();
      if (pool !== fetched) expect(shareClub(clubSeasonsOf(pool, 'classic'), isak.name, vanDijk.name)).toBeNull();
    }
  });
});
