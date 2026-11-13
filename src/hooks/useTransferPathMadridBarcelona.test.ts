import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { careerPlayers } from '@/data/careerPlayers';
import type { TransferPathPuzzle } from '@/data/transferPathPuzzles';
import { useTransferPath } from '@/hooks/useTransferPath';
import { fetchCareerPlayers } from '@/lib/fetchCareerPlayers';
import { fetchTransferPathPuzzles } from '@/lib/fetchTransferPathPuzzles';
import { clubSeasonsOf, shareClub } from '@/lib/transferPathGraph';
import { playersUnderRule } from '@/lib/transferPathModes';

vi.mock('@/lib/fetchCareerPlayers', () => ({ fetchCareerPlayers: vi.fn() }));
vi.mock('@/lib/fetchTransferPathPuzzles', () => ({ fetchTransferPathPuzzles: vi.fn() }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));

const trent = 'Trent Alexander-Arnold';
const mbappe = 'Kylian Mbappé';
const rashford = 'Marcus Rashford';
const lewandowski = 'Robert Lewandowski';
const madridHint = 'Two middle men at least. The first was at Liverpool with Trent Alexander-Arnold; the last was at Galatasaray with Victor Osimhen.';
const madridPuzzle: TransferPathPuzzle = {
  id: 'tpa-770', playerA: trent, playerB: 'Victor Osimhen', minSteps: 3, hint: madridHint,
  europe: { minSteps: 3, hint: madridHint }, active: null,
};

beforeEach(() => localStorage.clear());

async function opened(puzzle: TransferPathPuzzle, fetched: boolean) {
  vi.mocked(fetchCareerPlayers).mockResolvedValue(fetched ? structuredClone(careerPlayers) : []);
  vi.mocked(fetchTransferPathPuzzles).mockResolvedValue([puzzle]);
  const { result } = renderHook(useTransferPath);
  await waitFor(() => expect(result.current.isLoadingPool).toBe(false));
  await waitFor(() => expect(result.current.chain).toEqual([puzzle.playerA]));
  return result;
}

describe('Transfer Path verified 2025-26 teammates', () => {
  it.each([
    ['classic', true], ['europe', true], ['classic', false], ['europe', false],
  ] as const)('accepts Mbappé after Trent in tpa-770 under %s (fetched pool: %s)', async (rule, fetched) => {
    const original = JSON.stringify(careerPlayers);
    const result = await opened(madridPuzzle, fetched);
    act(() => result.current.setRule(rule));
    expect(result.current.optimal).toBe(3);
    expect(result.current.hint).toBe(madridHint);
    act(() => expect(result.current.addPlayer(mbappe)).toEqual({ ok: true, club: 'Real Madrid' }));
    expect(result.current.chain).toEqual([trent, mbappe]);
    expect(result.current.connections).toEqual([null, 'Real Madrid']);
    expect(JSON.stringify(careerPlayers)).toBe(original);
  });

  it.each([true, false])('accepts Rashford after Lewandowski in the verified Active pool (fetched: %s)', async (fetched) => {
    const hint = 'Direct link. They were at Barcelona together.';
    const result = await opened({
      id: 'fixture-barcelona-active', playerA: lewandowski, playerB: rashford,
      minSteps: 1, hint, active: { minSteps: 1, hint }, europe: { minSteps: 1, hint },
    }, fetched);
    act(() => result.current.setRule('active'));
    expect(result.current.activeRule).toBe('active');
    act(() => expect(result.current.addPlayer(rashford)).toEqual({ ok: true, club: 'Barcelona' }));
    expect(result.current.connections).toEqual([null, 'Barcelona']);
    expect(result.current.status).toBe('won');
    expect(result.current.score).toBe(1000);
  });

  it('holds historical and verified-Active boundaries and requires anchored identities', () => {
    const original = careerPlayers.find(player => player.name === trent)!;
    for (const pool of [
      careerPlayers.map(player => player.name === trent ? { ...player, nationality: 'France' } : player),
      careerPlayers.map(player => player.name === trent ? { ...player, position: 'CB' } : player),
      careerPlayers.map(player => player.name === trent ? { ...player, career: player.career.slice(0, -1) } : player),
      [...careerPlayers, original],
    ]) {
      expect(shareClub(clubSeasonsOf(pool, 'classic'), trent, mbappe)).toBeNull();
    }
    const classic = clubSeasonsOf(careerPlayers, 'classic');
    expect(shareClub(classic, 'Cristiano Ronaldo', mbappe)).toBeNull();
    const active = playersUnderRule(careerPlayers, 'active');
    expect(active.some(player => player.name === trent)).toBe(false);
    expect(shareClub(clubSeasonsOf(active, 'active'), trent, mbappe)).toBeNull();
  });
});
