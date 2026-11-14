import { describe, expect, it } from 'vitest';
import {
  deserialize, newFactory, salePrice, SENIOR_YEAR_SEC, seniorBirthdayPreview, serialize, squadEdge, tick,
  type Senior,
} from '@/lib/wonderkidFactory';

const season = (age: number, ageClock = 0, rating = 80) => {
  const state = newFactory(0, 7);
  state.deadlineIn = SENIOR_YEAR_SEC * 2;
  const player: Senior = { id: 'sr-veteran', name: 'Milan Parkes', nation: 'England', pos: 'MF', age, ageClock, rating, potential: 90 };
  state.firstTeam = [player];
  return { state, player };
};

describe('first team rating decline', () => {
  it('moves the rating and defensive edge before age 30, with no extra loss when the year ends', () => {
    const { state, player } = season(29);
    const edge = squadEdge(state);
    const openingQuote = seniorBirthdayPreview(state, player);
    tick(state, SENIOR_YEAR_SEC / 2);
    expect(player.age).toBe(29);
    expect(player.rating).toBeCloseTo(79.4, 8);
    expect(squadEdge(state)).toBeLessThan(edge);
    expect(seniorBirthdayPreview(state, player).rating).toBeCloseTo(openingQuote.rating, 8);
    expect(seniorBirthdayPreview(state, player).price).toBe(openingQuote.price);
    tick(state, SENIOR_YEAR_SEC / 2);
    expect(player.age).toBe(30);
    expect(player.rating).toBeCloseTo(78.8, 8);
    expect(salePrice(state, player)).toBe(openingQuote.price);
  });

  it('continues older saves from their current rating and keeps the forecast across save and reload', () => {
    const { state } = season(31, SENIOR_YEAR_SEC * 0.75);
    const restored = deserialize(serialize(state), state.lastSeen)!;
    const player = restored.firstTeam![0];
    expect(player.rating).toBe(80);
    const next = seniorBirthdayPreview(restored, player);
    expect(next.rating).toBeCloseTo(79.7, 8);
    expect(player.rating).toBe(80);
    tick(restored, SENIOR_YEAR_SEC / 4);
    expect(player.age).toBe(32);
    expect(player.rating).toBeCloseTo(next.rating, 8);
    expect(salePrice(restored, player)).toBe(next.price);
  });

  it('splits held and declining time, pauses away decay, respects the floor and retires at 34', () => {
    const { state, player } = season(28, SENIOR_YEAR_SEC * 0.75);
    tick(state, SENIOR_YEAR_SEC / 2);
    expect(player.age).toBe(29);
    expect(player.ageClock).toBe(SENIOR_YEAR_SEC / 4);
    expect(player.rating).toBeCloseTo(79.7, 8);
    tick(state, SENIOR_YEAR_SEC * 2, { offline: true });
    expect(player.age).toBe(29);
    expect(player.ageClock).toBe(SENIOR_YEAR_SEC / 4);
    expect(player.rating).toBeCloseTo(79.7, 8);
    const old = season(33, 0, 30.1);
    tick(old.state, SENIOR_YEAR_SEC / 2);
    expect(old.player.rating).toBe(30);
    const forecast = seniorBirthdayPreview(old.state, old.player);
    expect(forecast).toMatchObject({ age: 34, rating: 30, retiring: true, price: 0 });
    tick(old.state, SENIOR_YEAR_SEC / 2);
    expect(old.state.firstTeam).toHaveLength(0);
    expect(old.state.retired).toBe(1);
    expect(old.state.cash).toBe(0);
  });
});
