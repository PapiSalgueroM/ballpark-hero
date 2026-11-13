import { afterEach, expect, it, vi } from 'vitest';
import { FORMATIONS, oppRosterFor, playNextEntry, startCareer } from '@/lib/clubManager';

afterEach(() => vi.restoreAllMocks());

function openingMatch(club: string) {
  let seed = 101;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  });
  const result = playNextEntry(startCareer(club, 'now'));
  if (result.kind !== 'halftime') throw new Error(`Expected an opening match for ${club}`);
  const { live, state } = result;
  const formation = FORMATIONS[live.oppFormationIndex!];
  const xi = live.oppXi!;
  const bench = live.oppBench!;
  const roster = oppRosterFor(state, live.opponent);
  return { live, formation, xi, bench, roster };
}

it.each([
  ['Chelsea', 'Fulham', '4-3-3'],
  ['Tottenham Hotspur', 'Manchester United', '3-5-2'],
  ['Arsenal', 'Coventry City', '4-4-2'],
])('picks a compatible opponent XI for %s', (club, opponent, expectedFormation) => {
  const { live, formation, xi, bench, roster } = openingMatch(club);

  expect(live.opponent).toBe(opponent);
  expect(formation.name).toBe(expectedFormation);
  expect(xi).toHaveLength(11);
  expect(bench).toHaveLength(7);
  expect(xi.every((player, index) => formation.slots[index].allowed.includes(player.p))).toBe(true);
  expect(new Set([...xi, ...bench].map(player => player.n)).size).toBe(18);
  expect([...xi, ...bench].every(player => roster.some(member => member.n === player.n && member.p === player.p))).toBe(true);
});

it('keeps a playable opponent XI when the roster has a position gap', () => {
  const { live, formation, xi, bench } = openingMatch('Real Madrid');

  expect(live.opponent).toBe('Sevilla');
  expect(formation.name).toBe('4-3-3');
  expect(xi).toHaveLength(11);
  expect(xi.filter(player => player.p === 'GK')).toHaveLength(1);
  expect(new Set([...xi, ...bench].map(player => player.n)).size).toBe(xi.length + bench.length);
});
