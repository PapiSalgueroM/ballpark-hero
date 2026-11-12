import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useRebuild } from '@/hooks/useRebuild';
import { fetchClubSquad, fetchMarketRows, fetchRebuildClubs, type RebuildClub } from '@/lib/fetchRebuild';
import { REBUILD_SAVE_KEY } from '@/lib/rebuildSave';
import type { Player, Position } from '@/types/game';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));
vi.mock('@/lib/fetchRebuild', () => ({
  fetchClubSquad: vi.fn(),
  fetchMarketRows: vi.fn(),
  fetchRebuildClubs: vi.fn(),
  marketFromRows: () => [],
}));

const positions: Position[] = [
  'GK', 'GK', 'RB', 'LB', 'CB', 'CB', 'CB', 'LB', 'RB',
  'CM', 'CM', 'CDM', 'CAM', 'CM', 'LW', 'ST', 'RW', 'ST',
];
const club: RebuildClub = { club: 'Real Madrid', squadSize: positions.length, squadValueM: 300, tier: 'elite' };
const squad: Player[] = positions.map((position, index) => ({
  name: 'Squad player ' + index, position, club: club.club, nationality: 'Spain', league: 'La Liga',
  goals: 0, assists: 0, kitNumber: index + 1, age: 25, marketValue: 15, difficulty: 'easy',
}));

beforeEach(() => {
  localStorage.clear();
  vi.mocked(fetchRebuildClubs).mockReset().mockResolvedValue([club]);
  vi.mocked(fetchClubSquad).mockReset().mockResolvedValue(squad);
  vi.mocked(fetchMarketRows).mockReset().mockResolvedValue([{
    player_name: 'Market player', position: 'Centre-Forward', age: 25, nationality: 'Spain',
    club: 'Barcelona', market_value_usd: 20_000_000, goals: 0, assists: 0,
  }]);
});

it('holds an in-progress save through a squad outage and restores the same window on retry', async () => {
  const first = renderHook(useRebuild);
  await waitFor(() => expect(first.result.current.loading).toBe(false));
  act(() => first.result.current.chooseClub(club));
  await waitFor(() => expect(first.result.current.phase).toBe('envelopes'));
  act(() => first.result.current.pickFinance(0));
  const save = localStorage.getItem(REBUILD_SAVE_KEY);
  expect(save).toContain('"k":"finance"');
  first.unmount();

  vi.mocked(fetchClubSquad).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
  const reopened = renderHook(useRebuild);
  await waitFor(() => expect(fetchClubSquad).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(reopened.result.current.loading).toBe(false));
  expect(localStorage.getItem(REBUILD_SAVE_KEY)).toBe(save);
  expect(reopened.result.current.loadFailed).toBe(true);

  act(() => reopened.result.current.retryLoading());
  await waitFor(() => expect(reopened.result.current.loadFailed).toBe(true));
  expect(localStorage.getItem(REBUILD_SAVE_KEY)).toBe(save);

  act(() => reopened.result.current.retryLoading());
  await waitFor(() => expect(reopened.result.current.phase).toBe('envelopes'));
  expect(reopened.result.current.loadFailed).toBe(false);
  expect(localStorage.getItem(REBUILD_SAVE_KEY)).toBe(save);
});
