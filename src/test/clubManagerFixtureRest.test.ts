import { afterEach, expect, it, vi } from 'vitest';
import { playNextEntry, startCareer, type CalendarEntry } from '@/lib/clubManager';
import { daysBetween, entryDatesOf } from '@/lib/clubManagerCalendar';
import { keyedRng } from '@/lib/keyedRng';

afterEach(() => vi.restoreAllMocks());

it('gives the same team more fitness for seven days than for a cup or European turnaround', () => {
  const random = vi.spyOn(Math, 'random').mockImplementation(keyedRng('everton-turnaround'));
  const club = startCareer('Everton');
  const [first] = club.calendar;
  expect(first.type).toBe('league');
  const legs = (next: CalendarEntry) => {
    random.mockImplementation(keyedRng('same-fixture'));
    const state = { ...club, calendar: [first, next, ...club.calendar.slice(2)], squad: club.squad.map(p => ({ ...p, fitness: 65 })) };
    const dates = entryDatesOf(state);
    const result = playNextEntry(state, { skipHalftime: true });
    expect(result.kind).toBe('match');
    return { gap: daysBetween(dates[0], dates[1]), players: result.state.squad.map(p => p.fitness) };
  };
  const weekend = legs({ type: 'league', round: 1 });
  expect(weekend.gap).toBe(7);
  for (const next of [{ type: 'cup', round: 0, cupRound: 'R16' }, { type: 'uclGroup', round: 0 }] as CalendarEntry[]) {
    const compressed = legs(next);
    expect(compressed.gap).toBe(4);
    const gap = weekend.players.map((fit, i) => fit - compressed.players[i]);
    expect(gap.every(delta => delta > 0)).toBe(true);

  }
});
