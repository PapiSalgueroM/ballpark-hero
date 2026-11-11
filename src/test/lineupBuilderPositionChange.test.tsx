import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useLineupBuilder } from '@/hooks/useLineupBuilder';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {}, SUPABASE_URL: 'http://127.0.0.1:1', SUPABASE_PUBLISHABLE_KEY: 'fixture' }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));
vi.mock('@/data/lineupTeams', async importOriginal => {
  const real = await importOriginal<typeof import('@/data/lineupTeams')>();
  return { ...real, getRandomTeamAssignments: () => real.clubs.slice(0, 11).map(name => ({ name, isNation: false })) };
});

afterEach(() => vi.unstubAllGlobals());

it.each(['history', 'validator'] as const)('drops the old %s pick when a different pitch slot is selected', async pendingCheck => {
  let release!: (body: unknown) => void;
  const pending = new Promise(resolve => { release = body => resolve({ ok: true, json: async () => body }); });
  const request = vi.fn((_url: string, _options?: RequestInit) => pending);
  vi.stubGlobal('fetch', request);
  const { result } = renderHook(() => useLineupBuilder());
  act(() => result.current.selectFormation('4-3-3'));
  const club = result.current.currentTeam!.name;
  act(() => result.current.selectPosition(1));

  let oldPick!: Promise<void>;
  act(() => {
    oldPick = result.current.submitPlayer('Fixture Fullback', {
      rawPosition: pendingCheck === 'history' ? 'Right-Back' : 'Left-Back',
      club: pendingCheck === 'history' ? club : 'Fixture Other Club',
    });
  });
  try {
    expect(result.current.isValidating).toBe(true);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toContain(pendingCheck === 'history' ? 'player_verified_positions' : 'validate-player');
    act(() => result.current.selectPosition(1));
    expect(result.current.isValidating).toBe(true);

    act(() => result.current.selectPosition(0));
    expect(result.current.selectedPositionIndex).toBe(0);
    expect(result.current.isValidating).toBe(false);
    expect(result.current.currentTeam?.name).toBe(club);
    expect(result.current.filledSlots.size).toBe(0);
    if (pendingCheck === 'validator') expect(request.mock.calls[0][1]?.signal?.aborted).toBe(true);

    await act(async () => {
      await result.current.submitPlayer('Fixture Keeper', { rawPosition: 'Goalkeeper', club });
    });
  } finally {
    await act(async () => {
      release(pendingCheck === 'history' ? [] : { valid: true });
      await oldPick;
    });
  }
  expect(result.current.filledSlots.size).toBe(1);
  expect(result.current.filledSlots.get(0)?.playerName).toBe('Fixture Keeper');
  expect(result.current.filledSlots.has(1)).toBe(false);
  expect(result.current.validationError).toBeNull();
});
