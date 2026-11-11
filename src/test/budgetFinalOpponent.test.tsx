import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useBudgetBuilder } from '@/hooks/useBudgetBuilder';
import { recordCompletion } from '@/lib/completions';
import { simulateSeries } from '@/lib/dartDraft';
import { FORMATIONS } from '@/lib/squadDeal';
import type { Player } from '@/types/game';

vi.mock('@/lib/squadDeal', async original => ({
  ...await original<typeof import('@/lib/squadDeal')>(),
  fetchSquadPool: async (_era: string, year: number) => year === 2015 ? historic : [...xi, serieAKeeper],
}));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null }) }));

const xi: Player[] = FORMATIONS[0].slots.map((slot, index) => ({
  name: `Fixture player ${index}`, club: 'Fixture Club', nationality: 'Fixture Nation', league: 'Other',
  position: slot.allowed[0], age: 25, marketValue: 40, goals: 0, assists: 0, kitNumber: null, difficulty: 'easy',
}));
const serieAKeeper: Player = { ...xi[0], name: 'Fixture Serie A keeper', league: 'Serie A', marketValue: 15 };
const historic = xi.map(p => ({ ...p, name: `2015 ${p.name}`, marketValue: 10 }));
const rng = (seed: number) => () => {
  seed = seed * 16807 % 2147483647;
  return (seed - 1) / 2147483646;
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

it('keeps the Money XI and seeded Final when only the shopping filter changes', async () => {
  const { result } = renderHook(useBudgetBuilder);
  await waitFor(() => expect(result.current.loading).toBe(false));
  const opponent = result.current.moneyXi;
  expect(opponent).not.toContain(null);
  for (const [index, player] of xi.entries()) {
    act(() => result.current.setActiveSlot(index));
    act(() => result.current.sign(player));
  }
  const squad = result.current.squad;
  const random = vi.spyOn(Math, 'random').mockImplementation(rng(41));
  const worldFinal = simulateSeries(xi, opponent);

  act(() => result.current.setTopic('seriea'));
  act(() => result.current.setActiveSlot(0));
  expect(result.current.candidates).toEqual([serieAKeeper]);
  expect(result.current.squad).toBe(squad);
  expect(result.current.moneyXi).toEqual(opponent);

  random.mockImplementation(rng(41));
  act(() => result.current.playFinal());
  expect(result.current.series).toEqual(worldFinal);
  expect(recordCompletion).toHaveBeenCalledTimes(1);
});

it('builds a different Money XI from the selected historical market', async () => {
  const { result } = renderHook(useBudgetBuilder);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.moneyXi.every(p => p && xi.includes(p))).toBe(true);
  act(() => result.current.setTopic('seriea'));
  act(() => result.current.setEra('y2015'));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.moneyXi.every(p => p && historic.includes(p))).toBe(true);
  expect(result.current.pool).toBe(historic);
});
