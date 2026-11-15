import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CalendarScreen } from '@/components/club-manager/CalendarScreen';
import { playNextEntry, resumeMatch, startCareer, type CareerState } from '@/lib/clubManager';
import { seasonDays, shortDate } from '@/lib/clubManagerCalendar';
import { keyedRng } from '@/lib/keyedRng';

const play = (s: CareerState) => playNextEntry(s, { skipHalftime: true, noCoach: true });
const setup = () => startCareer('Manchester City', 'now', undefined, undefined, undefined, null, { inSeasonRatings: true });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function inspect(career: CareerState, week: number, onSimTo: (week: number) => void) {
  const view = render(<CalendarScreen career={career} onSimTo={onSimTo} onSetTraining={vi.fn()} />);
  const date = seasonDays(career).entryDates[week];
  for (let month = 0; month < 12; month++) {
    const hit = within(view.getByTestId('cm-calendar-grid')).getAllByRole('button')
      .find(button => button.getAttribute('aria-label')?.startsWith(shortDate(date) + ':'));
    if (hit) {
      fireEvent.click(hit);
      return view.getByTestId('cm-calendar-day');
    }
    fireEvent.click(view.getByRole('button', { name: 'Previous month' }));
  }
  throw new Error('fixture missing from the calendar');
}

describe('saved Club Manager league OVR results', () => {
  it('keeps the exact changes and unchanged matches on their own date after advances and reload', () => {
    vi.spyOn(Math, 'random').mockImplementation(keyedRng('calendar-league-ratings'));
    let career = setup();
    let changedWeek = -1, unchangedWeek = -1;
    for (let i = 0; i < 15; i++) {
      const old = new Map(career.squad.map(p => [p.id, p.rating]));
      const settled = play(career);
      career = settled.state;
      if (settled.report?.competition !== 'league') continue;
      const result = career.resultLog!.at(-1)!;
      const entry = career.calendar[result.week];
      const receipt = career.leagueRatingResults?.results[entry.round];
      expect(receipt).toMatchObject(result);
      const expected = career.squad.flatMap(p => {
        const prior = old.get(p.id);
        return prior !== undefined && prior !== p.rating ? [{ id: p.id, name: p.name, before: prior, after: p.rating }] : [];
      });
      expect(receipt?.ratingChanges.filter(p => !p.onLoan)).toEqual(expected);
      if (expected.length && changedWeek === -1) changedWeek = result.week;
      else if (!receipt?.ratingChanges.length && unchangedWeek === -1) unchangedWeek = result.week;
      if (changedWeek !== -1 && unchangedWeek !== -1 && i > 6) break;
    }
    expect(changedWeek).toBeGreaterThanOrEqual(0);
    expect(unchangedWeek).toBeGreaterThanOrEqual(0);
    const restored = JSON.parse(JSON.stringify(career)) as CareerState;
    /* Cup entries can age a league result out of the mixed result log. Its compact review still has the score. */
    restored.resultLog = restored.resultLog?.filter(r => r.week !== changedWeek);
    const before = JSON.stringify(restored);
    const onSimTo = vi.fn();
    const changed = inspect(restored, changedWeek, onSimTo);
    const round = restored.calendar[changedWeek].round;
    const actual = restored.leagueRatingResults!.results[round]!;
    expect(changed).toHaveTextContent(actual.score);
    for (const move of actual.ratingChanges) expect(changed).toHaveTextContent(move.name + ' ' + move.before + ' to ' + move.after);
    expect(JSON.stringify(restored)).toBe(before);
    expect(onSimTo).not.toHaveBeenCalled();

    cleanup();
    expect(inspect(restored, unchangedWeek, onSimTo)).toHaveTextContent('No squad OVR changes this match.');
    cleanup();
    const legacy = { ...restored, resultLog: career.resultLog, leagueRatingResults: undefined };
    expect(inspect(legacy, unchangedWeek, onSimTo)).toHaveTextContent('Squad OVR review was not recorded.');
    expect(onSimTo).not.toHaveBeenCalled();

    const stale = JSON.parse(before) as CareerState;
    stale.leagueRatingResults!.results[round]!.opp = 'An unrelated opponent';
    expect([...seasonDays(stale).entryDays.values()].some(day => day.weekIdx === changedWeek && day.ratingChanges !== undefined)).toBe(false);
  }, 30000);

  it('records a league fixture once at live settlement and leaves no-book runs record-free', () => {
    vi.spyOn(Math, 'random').mockImplementation(keyedRng('calendar-live-ratings'));
    let career = setup();
    while (career.calendar[career.week].type !== 'league') career = play(career).state;
    const kickoff = playNextEntry(career);
    expect(kickoff.kind).toBe('halftime');
    expect(kickoff.state.leagueRatingResults).toBeUndefined();
    const finished = resumeMatch(JSON.parse(JSON.stringify(kickoff.state)));
    expect(finished.kind).toBe('match');
    expect(Object.values(finished.state.leagueRatingResults?.results ?? {})).toHaveLength(1);
    const live = finished.state.resultLog!.at(-1)!;
    expect(finished.state.leagueRatingResults?.results[career.calendar[live.week].round]?.score).toBe(live.score);
    const noBook = playNextEntry({ ...career, leagueBook: undefined }, { skipHalftime: true, noCoach: true, noBook: true });
    expect(noBook.state.leagueRatingResults).toBeUndefined();
  }, 30000);
});
