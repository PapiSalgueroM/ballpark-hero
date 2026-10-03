/**
 * Round 946: the GM league year calendar.
 *
 * The four league years pass their own rules, each rule can fail (a deadline
 * after the season, phases out of order, a phase with one source and no
 * note), the sim to a day never runs past a stop on any day of the year, and
 * the date helpers Club Manager re-exports are the very same functions.
 * scripts/simGmCalendar.mjs carries the bigger walks and the fixture replay.
 */
import { describe, it, expect } from 'vitest';
import {
  GM_LEAGUE_YEARS, GM_PHASE_ORDER, GM_CALENDAR_PARTIAL, gmLeagueYear, validateLeagueYear, planSimToDay,
  calendarHalts, offseasonSteps, gmMonthGrid, monthsOf, deadlinePeriod, periodOn, type GmSport, type GmLeagueYearDef,
} from './gmCalendar';
import { addDays, dateKey, daysBetween } from './calDate';
import * as cmCal from './clubManagerCalendar';
import * as calDate from './calDate';

const SPORTS: GmSport[] = ['nfl', 'nba', 'mlb', 'nhl'];
const withPhase = (def: GmLeagueYearDef, id: string, patch: Record<string, unknown>): GmLeagueYearDef =>
  ({ ...def, phases: def.phases.map(p => (p.id === id ? { ...p, ...patch } : p)) });

describe('the four league years', () => {
  it.each(SPORTS)('%s keeps every rule', sport => {
    expect(validateLeagueYear(GM_LEAGUE_YEARS[sport])).toEqual([]);
  });

  it.each(SPORTS)('%s phases come in the league order', sport => {
    expect(GM_LEAGUE_YEARS[sport].phases.map(p => p.id)).toEqual(GM_PHASE_ORDER[sport]);
  });

  it('every phase is two sourced or listed as partial', () => {
    for (const sport of SPORTS) {
      for (const p of GM_LEAGUE_YEARS[sport].phases) {
        if (p.sources.length < 2) expect(GM_CALENDAR_PARTIAL).toContain(`${sport}.${p.id}`);
      }
    }
  });
});

describe('the rules can fail', () => {
  it('a deadline after the last regular season day fails', () => {
    const bad = withPhase(GM_LEAGUE_YEARS.nba, 'deadline', { start: '2027-04-12', end: '2027-04-12' });
    expect(validateLeagueYear(bad).some(p => p.includes('deadline'))).toBe(true);
  });
  it('a swapped draft and lottery fails the order', () => {
    const def = GM_LEAGUE_YEARS.nhl;
    const bad = { ...def, phases: [def.phases[1], def.phases[0], ...def.phases.slice(2)] };
    expect(validateLeagueYear(bad).some(p => p.includes("league's order"))).toBe(true);
  });
  it('a phase with one source and no note fails', () => {
    const bad = withPhase(GM_LEAGUE_YEARS.nfl, 'draft', { thin: undefined });
    expect(validateLeagueYear(bad).some(p => p.includes('no thin note'))).toBe(true);
  });
  it('a date that is not a day fails', () => {
    const bad = withPhase(GM_LEAGUE_YEARS.mlb, 'draft', { start: '2026-02-30' });
    expect(validateLeagueYear(bad).length).toBeGreaterThan(0);
  });
});

describe('sim to a day', () => {
  it.each(SPORTS)('%s never runs past a stop, from the first day to every day of the year', sport => {
    const year = gmLeagueYear(sport);
    const halts = calendarHalts(year);
    const span = daysBetween(year.first, year.last);
    let checked = 0;
    for (let i = 1; i <= span; i++) {
      const target = addDays(year.first, i);
      const plan = planSimToDay(year, year.first, target)!;
      const firstHalt = halts.find(h => dateKey(h.date) > dateKey(year.first) && dateKey(h.date) <= dateKey(target));
      expect(dateKey(plan.stopAt)).toBe(firstHalt ? dateKey(firstHalt.date) : dateKey(target));
      checked += 1;
    }
    expect(checked).toBe(span);
  });

  it('walking to the end stops on every calendar halt in turn and plays every period once', () => {
    for (const sport of SPORTS) {
      const year = gmLeagueYear(sport);
      let at = addDays(year.first, -1);
      const stops: number[] = [];
      const played: number[] = [];
      for (let guard = 0; guard < 50; guard++) {
        const plan = planSimToDay(year, at, year.last);
        if (!plan) break;
        played.push(...plan.periods);
        if (plan.halt) stops.push(dateKey(plan.halt.date));
        at = plan.stopAt;
      }
      expect(stops).toEqual(calendarHalts(year).map(h => dateKey(h.date)));
      expect(played).toEqual(year.periods.map(p => p.index));
    }
  });

  it('a host halt stops the run on its day', () => {
    const year = gmLeagueYear('nba');
    const hurt = { kind: 'injury' as const, date: { y: 2026, m: 11, d: 14 }, label: 'Your starter is hurt' };
    const plan = planSimToDay(year, { y: 2026, m: 10, d: 20 }, { y: 2026, m: 12, d: 25 }, [hurt])!;
    expect(plan.halt?.kind).toBe('injury');
    expect(dateKey(plan.stopAt)).toBe(20261114);
  });
});

describe('the grid and the steps', () => {
  it('every regular season day sits in one period, and the deadline period is before the deadline', () => {
    for (const sport of SPORTS) {
      const year = gmLeagueYear(sport);
      const days = daysBetween(year.regularStart, year.regularEnd) + 1;
      for (let i = 0; i < days; i++) expect(periodOn(year, addDays(year.regularStart, i))).not.toBeNull();
      const k = deadlinePeriod(year);
      expect(k).toBeGreaterThan(0);
      expect(k).toBeLessThan(year.periods.length);
    }
  });
  it('the offseason is steps, not one call, and the month grid marks them', () => {
    const year = gmLeagueYear('nba');
    expect(offseasonSteps(year).map(s => s.phase.id)).toEqual(['lottery', 'draft', 'resign', 'freeAgency', 'camp', 'cutDown']);
    const june = gmMonthGrid(year, 2026, 6, { y: 2026, m: 6, d: 1 });
    const marks = june.filter(c => c && c.starts.length).map(c => `${c!.date.d}:${c!.starts.join('+')}`);
    expect(marks).toEqual(['23:draft', '25:resign', '30:freeAgency']);
    expect(monthsOf(year).length).toBe(14);
  });
});

describe('the lift', () => {
  it('Club Manager re-exports the very same date helpers', () => {
    expect(cmCal.addDays).toBe(calDate.addDays);
    expect(cmCal.dayOfWeek).toBe(calDate.dayOfWeek);
    expect(cmCal.daysBetween).toBe(calDate.daysBetween);
    expect(cmCal.shortDate).toBe(calDate.shortDate);
    expect(cmCal.MONTH_NAMES).toBe(calDate.MONTH_NAMES);
  });
});
