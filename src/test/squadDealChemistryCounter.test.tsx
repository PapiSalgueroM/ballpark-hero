import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useSquadDeal } from '@/hooks/useSquadDeal';
import { bankerChemistryCounter, fetchSquadPool, FORMATIONS, ratingFor, simulateSquad, squadDealScore } from '@/lib/squadDeal';
import type { Player, Position } from '@/types/game';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));
vi.mock('@/lib/squadDeal', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/squadDeal')>(),
  fetchSquadPool: vi.fn(),
}));

const make = (name: string, position: Position, marketValue: number, club = name, nationality = name): Player => ({
  name, position, marketValue, club, nationality, league: 'Premier League', goals: 0, assists: 0,
  kitNumber: null, age: 23, difficulty: 'easy',
});
const goalkeeper = make('Picked goalkeeper', 'GK', 40, 'Linked FC', 'Wales');
const original = make('Original offer', 'RB', 40);
const chemistry = make('Chemistry offer', 'RB', 30, goalkeeper.club, goalkeeper.nationality);
const slot = FORMATIONS[0].slots[1];

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  localStorage.clear();
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); localStorage.clear(); });

it('uses scored club and nationality links for a lower-rated replacement', () => {
  const wrongPosition = make('Centre forward', 'ST', 33, goalkeeper.club, goalkeeper.nationality);
  const tooLow = make('Much lower rating', 'RB', 2, goalkeeper.club, goalkeeper.nationality);
  const notATradeoff = make('Higher rating', 'RB', 100, goalkeeper.club, goalkeeper.nationality);
  const fromBox = { ...chemistry, name: 'Closed case' };
  const offeredBefore = { ...chemistry, name: 'Earlier offer' };
  const alreadyPicked = { ...chemistry, name: goalkeeper.name };
  const clubOnly = make('Club only', 'RB', 40, goalkeeper.club);
  const pool = [wrongPosition, tooLow, notATradeoff, fromBox, offeredBefore, alreadyPicked, clubOnly, chemistry];
  const unavailable = new Set([fromBox.name, offeredBefore.name]);
  expect(bankerChemistryCounter(pool, slot, [goalkeeper], original, unavailable, 'current')).toBe(chemistry);
  expect(ratingFor(chemistry, 'current')).toBeLessThan(ratingFor(original, 'current'));
  expect(squadDealScore([goalkeeper, original])).toEqual({ rating: 67, chemistry: 0 });
  expect(squadDealScore([goalkeeper, chemistry])).toEqual({ rating: 85, chemistry: 100 });
  expect(simulateSquad([goalkeeper, chemistry])).toMatchObject({ rating: 85, chemistry: 100, grade: 'A+' });
  expect(bankerChemistryCounter([chemistry], slot, [], original, new Set(), 'current')).toBeNull();
  expect(bankerChemistryCounter([wrongPosition, tooLow], slot, [goalkeeper], original, new Set(), 'current')).toBeNull();

  const regularLegend = { ...original, marketValue: 204 };
  const linkedLegend = { ...chemistry, marketValue: 182 };
  expect(bankerChemistryCounter([linkedLegend], slot, [goalkeeper], regularLegend, new Set(), 'legends')).toBe(linkedLegend);
});

const footballers = [
  goalkeeper,
  ...Array.from({ length: 11 }, (_, i) => make(`Goalkeeper ${i}`, 'GK', 40, goalkeeper.club, goalkeeper.nationality)),
  ...Array.from({ length: 20 }, (_, i) => make(`Fullback ${i}`, 'RB', 40, i >= 8 ? goalkeeper.club : `Club ${i}`, i >= 8 ? goalkeeper.nationality : `Nation ${i}`)),
  ...Array.from({ length: 12 }, (_, i) => make(`Left back ${i}`, 'LB', 40, goalkeeper.club, goalkeeper.nationality)),
];

const fullPool = [...footballers, ...(['CB', 'CM', 'RW', 'ST', 'LW'] as const).flatMap(position =>
  Array.from({ length: 16 }, (_, i) => make(`${position} ${i}`, position, 40)))];

const advanceOffer = (get: () => ReturnType<typeof useSquadDeal>, target: number) => {
  act(() => get().selectSlot(target));
  act(() => get().pickBox(0));
  for (let i = 1; i <= get().opensThisRound; i++) act(() => get().toggleSelect(i));
  act(() => get().reveal());
  act(() => get().requestOffer());
  act(() => { vi.advanceTimersByTime(1100); });
  expect(get().offer).not.toBeNull();
};

it('withdraws a countered offer once while preserving the held case and elimination sequence', async () => {
  vi.mocked(fetchSquadPool).mockResolvedValue(footballers);
  vi.spyOn(Math, 'random').mockReturnValue(0.8);
  const { result } = renderHook(useSquadDeal);
  await act(async () => { await result.current.startDraft(); });
  const latest = () => result.current;
  advanceOffer(latest, 0);
  expect(latest().canCounterForChemistry).toBe(false);
  act(() => latest().acceptDeal());
  advanceOffer(latest, 1);
  expect(latest().canCounterForChemistry).toBe(true);
  const regular = latest().offer!;
  const squad = latest().squad;
  const cases = latest().candidates;
  const revealed = latest().eliminated;
  const kept = latest().keptIdx;
  act(() => { latest().counterForChemistry(); latest().counterForChemistry(); });
  const counter = latest().offer!;
  expect(counter.name).not.toBe(regular.name);
  expect(latest().canCounterForChemistry).toBe(false);
  expect(latest().counterChemistry).toEqual({ withdrawnName: regular.name, before: 0, after: 100 });
  expect(latest().candidates).toBe(cases);
  expect(latest().squad).toBe(squad);
  expect(latest().eliminated).toBe(revealed);
  expect(latest().keptIdx).toBe(kept);
  expect(cases).not.toContain(counter);
  act(() => latest().rejectDeal());
  expect(latest().offer).toBeNull();
  expect(latest().counterChemistry).toBeNull();
  expect(latest().slotPhase).toBe('selecting');
  expect(latest().keptIdx).toBe(kept);
  expect(latest().eliminated).toBe(revealed);
  for (let i = 4; i <= 6; i++) act(() => latest().toggleSelect(i));
  act(() => latest().reveal());
  act(() => latest().requestOffer());
  act(() => { vi.advanceTimersByTime(1100); });
  expect(latest().offer?.name).not.toBe(regular.name);
  expect(latest().offer?.name).not.toBe(counter.name);
  expect(latest().canCounterForChemistry).toBe(false);
  act(() => latest().acceptDeal());
  expect(latest().squad[1]).not.toBeNull();
});

it('accepts the replacement into a complete XI and settles the real score and local board', async () => {
  vi.mocked(fetchSquadPool).mockResolvedValue(fullPool);
  let draws = 0;
  vi.spyOn(Math, 'random').mockImplementation(() => draws++ % 7 / 7);
  const { result } = renderHook(useSquadDeal);
  await act(async () => { await result.current.startDraft(); });
  const latest = () => result.current;
  vi.mocked(Math.random).mockReturnValue(0.8);
  advanceOffer(latest, 0);
  act(() => latest().acceptDeal());
  advanceOffer(latest, 1);
  const original = latest().offer!;
  const fetches = vi.mocked(fetchSquadPool).mock.calls.length;
  const randomCalls = vi.mocked(Math.random).mock.calls.length;
  act(() => latest().counterForChemistry());
  expect(vi.mocked(fetchSquadPool)).toHaveBeenCalledTimes(fetches);
  expect(vi.mocked(Math.random)).toHaveBeenCalledTimes(randomCalls);
  const replacement = latest().offer!;
  expect(replacement.name).not.toBe(original.name);
  act(() => latest().acceptDeal());
  expect(latest().squad[1]).toBe(replacement);
  for (let position = 2; position < FORMATIONS[0].slots.length; position++) {
    advanceOffer(latest, position);
    expect(latest().canCounterForChemistry).toBe(false);
    act(() => latest().acceptDeal());
  }
  expect(latest().allFilled).toBe(true);
  act(() => latest().goToExtras());
  vi.mocked(Math.random).mockImplementation(() => draws++ % 7 / 7);
  for (let n = 0; n < 8 && !latest().allExtrasChosen; n++) {
    act(() => latest().pickExtraCase(0));
    act(() => latest().extraBankerCall());
    act(() => latest().acceptExtraDeal());
  }
  expect(latest().allExtrasChosen).toBe(true);

  const squad = latest().squad.filter((p): p is Player => !!p);
  const extras = Object.values(latest().extrasChosen);
  const accepted = squadDealScore(squad, extras);
  expect(accepted.chemistry).toBeGreaterThan(squadDealScore(squad.map((p, i) => i === 1 ? original : p), extras).chemistry);
  expect(accepted.rating).toBeGreaterThan(squadDealScore(squad.map((p, i) => i === 1 ? original : p), extras).rating);
  act(() => latest().simulate());
  expect(latest().result).toMatchObject(accepted);
  expect(latest().leaderboard).toHaveLength(1);
  expect(latest().leaderboard[0].score).toBe(accepted.rating);
  expect(useGameCompletion).toHaveBeenLastCalledWith('squad-deal', true, accepted.rating, 0);
});
