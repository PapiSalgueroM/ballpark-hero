import { describe, expect, it } from 'vitest';
import { buildCalendar, fixtureFor, playNextEntry, startCareer, type CalendarEntry } from '@/lib/clubManager';
import { dateKey, dateOfEntries } from '@/lib/clubManagerCalendar';

const isFinal = (entry: CalendarEntry) => entry.type === 'uclKo' && entry.uclRound === 'F';

describe('Club Manager Champions League final', () => {
  it('schedules one final after the league and all semifinal legs', () => {
    for (const size of [10, 12, 14, 15, 16, 18, 20, 22, 24, 30]) {
      for (const r16 of [false, true]) {
        for (const twoLegs of [false, true]) {
          for (const cup of [false, true]) {
            const calendar = buildCalendar(size, r16, twoLegs, cup);
            const label = size + ' clubs, ' + JSON.stringify({ r16, twoLegs, cup });
            const league = calendar.filter(entry => entry.type === 'league');
            const count = 2 * (size + size % 2 - 1);
            expect(league.map(entry => entry.round), label).toEqual(Array.from({ length: count }, (_, index) => index));
            expect(calendar.filter(isFinal), label).toEqual([{ type: 'uclKo', round: 0, uclRound: 'F' }]);
            expect(calendar.at(-1), label).toMatchObject({ type: 'uclKo', uclRound: 'F' });
            expect(calendar.filter(entry => entry.type === 'uclGroup'), label).toHaveLength(6);
            expect(calendar.filter(entry => entry.type === 'cup'), label).toHaveLength(cup ? 4 : 0);
            expect(calendar.filter(entry => entry.type === 'window'), label).toHaveLength(1);
            expect(calendar.filter(entry => entry.type === 'uclKo' && entry.uclRound === 'SF'), label).toHaveLength(twoLegs ? 2 : 1);
          }
        }
      }
    }
  });

  it('keeps the standard league dates and gives the final a later day', () => {
    const calendar = buildCalendar(20, true, true);
    const final = calendar.find(isFinal)!;
    const leagueDates = (entries: CalendarEntry[]) => {
      const dates = dateOfEntries(2026, entries);
      return dates.filter((_, index) => entries[index].type === 'league');
    };
    const oldOrder = calendar.filter(entry => !isFinal(entry));
    oldOrder.splice(oldOrder.findIndex(entry => entry.type === 'league' && entry.round === 35) + 1, 0, final);
    expect(leagueDates(calendar)).toEqual(leagueDates(oldOrder));
    const dates = dateOfEntries(2026, calendar);
    const finalDate = dateKey(dates[calendar.findIndex(isFinal)]);
    expect(finalDate > dateKey(leagueDates(calendar).at(-1)!)).toBe(true);
  });

  it('keeps the final pending after the last league result and plays it once', () => {
    const state = startCareer('Arsenal');
    const lastLeague = state.calendar.filter(entry => entry.type === 'league').at(-1)!;
    state.week = state.calendar.indexOf(lastLeague);
    state.uclKoRound = 'F';
    state.uclDraw.F = 'Real Madrid';

    const league = playNextEntry(state, { skipHalftime: true });
    expect(league.kind).toBe('match');
    const final = league.state.calendar[league.state.week];
    expect(final).toMatchObject({ type: 'uclKo', uclRound: 'F' });
    expect(fixtureFor(league.state, final)).toMatchObject({
      competition: 'uclKo', opponent: 'Real Madrid', extraTime: true,
    });

    const played = playNextEntry(league.state, { skipHalftime: true });
    expect(played.kind).toBe('match');
    expect(played.state.week).toBe(played.state.calendar.length);
    expect(playNextEntry(played.state, { skipHalftime: true }).kind).toBe('seasonOver');
  });
});
