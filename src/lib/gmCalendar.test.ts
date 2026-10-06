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
  calendarHalts, offseasonSteps, gmMonthGrid, monthsOf, deadlinePeriod, periodOn, nextStep, phaseById, runSimPlan, isWikipediaSource,
  type GmSport, type GmLeagueYearDef, type GmHostHalt,
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

  it('every phase is two sourced (Wikipedia aside) or listed as partial', () => {
    for (const sport of SPORTS) {
      for (const p of GM_LEAGUE_YEARS[sport].phases) {
        if (p.sources.filter(s => !s.startsWith('Wikipedia')).length < 2) expect(GM_CALENDAR_PARTIAL).toContain(`${sport}.${p.id}`);
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
    const bad = withPhase(GM_LEAGUE_YEARS.nfl, 'resign', { thin: undefined });
    expect(validateLeagueYear(bad).some(p => p.includes('no thin note'))).toBe(true);
  });
  it('Wikipedia never counts as one of the two sources', () => {
    const lottery = phaseById(gmLeagueYear('nba'), 'lottery')!;
    expect(lottery.sources.filter(isWikipediaSource)).toHaveLength(1);
    const bad = withPhase(GM_LEAGUE_YEARS.nba, 'lottery', { sources: lottery.sources.filter(s => s.startsWith('nba.com') || isWikipediaSource(s)) });
    expect(validateLeagueYear(bad).some(p => p.includes('lottery has 1 source(s) other than Wikipedia'))).toBe(true);
    const span = { ...GM_LEAGUE_YEARS.nfl, regularSources: GM_LEAGUE_YEARS.nfl.regularSources.filter(s => !s.startsWith('ESPN')) };
    expect(validateLeagueYear(span).some(p => p.includes('regular season span has 1 source(s) other than Wikipedia'))).toBe(true);
  });
  it('a decision phase that does not stop the sim fails', () => {
    const bad = withPhase(GM_LEAGUE_YEARS.nba, 'deadline', { halts: false });
    expect(validateLeagueYear(bad).some(p => p.includes('deadline needs a decision'))).toBe(true);
  });
  it('a phase with no source that is not marked estimate fails', () => {
    const bad = withPhase(GM_LEAGUE_YEARS.nba, 'resign', { estimate: undefined });
    expect(validateLeagueYear(bad).some(p => p.includes('not marked estimate'))).toBe(true);
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

  it.each(SPORTS)('%s stops for the re-sign window, the draft, free agency, cut down day, the deadline and the season end', sport => {
    const kinds = calendarHalts(gmLeagueYear(sport)).map(h => h.kind).sort();
    expect(kinds).toEqual(['cutDown', 'deadline', 'draft', 'freeAgency', 'resign', 'seasonOver']);
  });

  it('a tap on the deadline day itself says it stopped for the deadline', () => {
    const year = gmLeagueYear('nba');
    const plan = planSimToDay(year, { y: 2027, m: 2, d: 1 }, { y: 2027, m: 2, d: 11 })!;
    expect(dateKey(plan.stopAt)).toBe(20270211);
    expect(plan.halt?.kind).toBe('deadline');
  });

  it('a stop that comes up mid run ends the run on that period, and holds the next run until it is dealt with', () => {
    const year = gmLeagueYear('nba');
    const plan = planSimToDay(year, { y: 2026, m: 10, d: 19 }, { y: 2027, m: 1, d: 31 })!;
    expect(plan.periods.length).toBeGreaterThan(6);
    const hurt: GmHostHalt = { kind: 'injury', date: year.periods[5].start, label: 'Your starter is hurt' };
    const run = runSimPlan(year, plan, 0, (n, p) => ({ state: n + 1, halt: p.index === 6 ? hurt : null }));
    expect(run.played).toEqual([1, 2, 3, 4, 5, 6]);
    expect(run.state).toBe(6);
    expect(run.halt?.kind).toBe('injury');
    expect(dateKey(run.stopAt)).toBe(dateKey(year.periods[5].end));
    const held = planSimToDay(year, run.stopAt, { y: 2027, m: 1, d: 31 }, [hurt])!;
    expect(held.periods).toEqual([]);
    expect(held.halt?.kind).toBe('injury');
    const next = planSimToDay(year, run.stopAt, { y: 2027, m: 1, d: 31 }, [])!;
    expect(next.periods[0]).toBe(7);
  });

  it('a stop raised on the plan\'s own stop day reports the plan\'s stop, so the deadline is not skipped', () => {
    const year = gmLeagueYear('mlb');
    const plan = planSimToDay(year, { y: 2026, m: 7, d: 28 }, { y: 2026, m: 8, d: 10 })!;
    expect(plan.halt?.kind).toBe('deadline');
    const last = plan.periods[plan.periods.length - 1];
    expect(dateKey(year.periods[last - 1].end)).toBe(20260803);
    const hurt: GmHostHalt = { kind: 'injury', date: { y: 2026, m: 8, d: 2 }, label: 'Your starter is hurt' };
    const run = runSimPlan(year, plan, 0, (n, p) => ({ state: n + 1, halt: p.index === last ? hurt : null }));
    expect(run.halt?.kind).toBe('deadline');
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
  it('the deadline period is the last period played when the walk stops for the deadline', () => {
    const measured: Record<GmSport, number> = { nfl: 8, nba: 13, mlb: 19, nhl: 15 };
    for (const sport of SPORTS) {
      const year = gmLeagueYear(sport);
      let at = addDays(year.first, -1);
      const played: number[] = [];
      for (let guard = 0; guard < 50; guard++) {
        const plan = planSimToDay(year, at, year.last)!;
        played.push(...plan.periods);
        at = plan.stopAt;
        if (plan.halt?.kind === 'deadline') break;
      }
      expect(Math.max(0, ...played)).toBe(deadlinePeriod(year));
      expect(deadlinePeriod(year)).toBe(measured[sport]);
    }
  });
  it('the grid outlines a host stop on its day', () => {
    const year = gmLeagueYear('nba');
    const hurt: GmHostHalt = { kind: 'injury', date: { y: 2026, m: 11, d: 14 }, label: 'Your starter is hurt' };
    const nov = gmMonthGrid(year, 2026, 11, { y: 2026, m: 11, d: 1 }, [hurt]);
    expect(nov.find(c => c && c.date.d === 14)?.halt?.kind).toBe('injury');
    expect(nov.find(c => c && c.date.d === 15)?.halt).toBeNull();
  });
  it('the next step on the second day of a phase is that phase', () => {
    const year = gmLeagueYear('nfl');
    expect(nextStep(year, { y: 2026, m: 4, d: 24 })?.phase.id).toBe('draft');
    expect(nextStep(year, { y: 2026, m: 8, d: 20 })?.phase.id).toBe('camp');
    expect(phaseById(year, 'lottery')).toBeNull();
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
