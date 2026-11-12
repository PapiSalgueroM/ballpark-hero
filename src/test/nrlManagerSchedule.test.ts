import { expect, it } from 'vitest';
import { NRL_SEASONS } from '@/data/nrlManager2026';

const seasons = [
  { year: 2026, clubCount: 17, repeatPairs: 68 },
  { year: 2027, clubCount: 18, repeatPairs: 63 },
] as const;

it.each(seasons)('has a balanced original $year draw', ({ year, clubCount, repeatPairs }) => {
  const { clubs, draw } = NRL_SEASONS[year];
  const clubIds = new Set(clubs.map(({ id }) => id));
  expect(clubs).toHaveLength(clubCount);
  expect(clubIds.size).toBe(clubCount);
  expect(clubIds.has('bears')).toBe(year === 2027);
  expect(draw).toHaveLength(27);

  const fixtures = draw.flat();
  expect(fixtures).toHaveLength(clubCount * 12);
  expect(new Set(fixtures.map(game => game.join('/'))).size).toBe(fixtures.length);

  const playedPairs = new Map<string, number>();
  let priorByes = new Set<string>();
  let priorPairs = new Set<string>();
  for (const round of draw) {
    const participants = new Set(round.flat());
    expect(participants.size).toBe(2 * round.length);
    for (const id of participants) expect(clubIds.has(id)).toBe(true);

    const byes = new Set([...clubIds].filter(id => !participants.has(id)));
    for (const id of byes) expect(priorByes.has(id)).toBe(false);
    priorByes = byes;

    const roundPairs = new Set(round.map(game => [...game].sort().join('/')));
    for (const pair of roundPairs) {
      expect(priorPairs.has(pair)).toBe(false);
      playedPairs.set(pair, (playedPairs.get(pair) ?? 0) + 1);
    }
    priorPairs = roundPairs;
  }

  expect(playedPairs.size).toBe(clubCount * (clubCount - 1) / 2);
  expect([...playedPairs.values()].filter(count => count === 2)).toHaveLength(repeatPairs);

  for (const id of clubIds) {
    expect(fixtures.filter(([home]) => home === id)).toHaveLength(12);
    expect(fixtures.filter(([, away]) => away === id)).toHaveLength(12);
    expect(draw.filter(round => round.every(game => !game.includes(id)))).toHaveLength(3);
  }
});
