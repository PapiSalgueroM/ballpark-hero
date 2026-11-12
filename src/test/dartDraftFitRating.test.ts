import { afterEach, expect, it, vi } from 'vitest';
import { simulateSeries, squadRating } from '@/lib/dartDraft';
import type { Player } from '@/types/game';

const winger: Player = {
  name: 'Fixture winger',
  position: 'LW',
  nationality: 'Brazil',
  club: 'Fixture FC',
  league: 'Premier League',
  age: 24,
  marketValue: 1,
  goals: 0,
  assists: 0,
  kitNumber: 0,
  difficulty: 'easy',
};

afterEach(() => vi.restoreAllMocks());

it('applies the eight-point penalty to the right slot in the XI', () => {
  expect(squadRating([null, winger])).toBe(62);
  expect(squadRating([null, winger], [false, true])).toBe(54);
});

it('keeps chemistry for real players and fixed ratings for fillers', () => {
  const linked = Array.from({ length: 4 }, (_, index) => ({ ...winger, name: `Fixture player ${index}` }));
  expect(squadRating(linked)).toBe(64);
  expect(squadRating(linked, [false, true, false, false])).toBe(62);

  const trialist = { ...winger, name: 'Fixture trialist', fixedOverall: 40 };
  expect(squadRating([trialist], [true])).toBe(40);
  expect(squadRating([...linked.slice(0, 3), trialist])).toBe(57);
});

it('uses the same penalized XI rating for the three-leg showdown', () => {
  const machine = [{ ...winger, name: 'Machine winger' }];
  const rolls = vi.spyOn(Math, 'random').mockReturnValue(0.99).mockReturnValueOnce(0.22);
  const normal = simulateSeries([winger], machine);
  expect(normal.legs.map(leg => leg.userGoals)).toEqual([1, 0, 0]);

  rolls.mockClear().mockReturnValueOnce(0.22);
  const outOfPosition = simulateSeries([winger], machine, [true]);
  expect(outOfPosition.legs.map(leg => leg.userGoals)).toEqual([0, 0, 0]);
  expect(outOfPosition.legs.map(leg => leg.aiGoals)).toEqual([0, 0, 0]);
});
