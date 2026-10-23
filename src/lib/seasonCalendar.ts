import { getTodayET } from '@/lib/dateUtils';

/**
 * Round 1551: one calendar of the finals behind every audited champion table a
 * daily reads (Champ or Not, Silverware Sort, Who'd They Beat, the Hall of
 * Champions, the Rugby League Challenge). It does two jobs.
 *
 * 1. scripts/simSeasonDue.mjs reads it to know when a season's row is due. A
 *    final is over by `decidedBy` (month and day, ET, in the season's year plus
 *    `seasonOffset`), and 21 days after that the table must hold the season.
 *    `heldThrough` is the newest season the repo records the table as holding;
 *    the harness checks it against the migrations and the saved Record Books
 *    page, so the calendar cannot claim a row nobody wrote.
 * 2. Every daily picks rows by position, so a season that lands part way
 *    through a day would reshuffle that day's boards under people who already
 *    played. `countsFrom` holds a newly landed season out of the games until an
 *    ET date, so boards only ever change at a day boundary (the Career Ladder's
 *    "counts from" idea). The date has to be later than the day the rows land.
 *
 * The `decidedBy` dates are the latest a normal season's final is over: the
 * AFL Grand Final is the last Saturday of September, the NRL's the first
 * Sunday of October, the Brownlow and the Dally M are counted in grand final
 * week, the World Series can run into early November, and the college football
 * title game of season Y is played in January of Y + 1.
 */

export interface SeasonFinal {
  /** the competition key the games share (champOrNot.ts COMPETITIONS) */
  key: string;
  table: string;
  label: string;
  decidedBy: { month: number; day: number; seasonOffset?: number };
  /** the newest season this table is recorded as holding */
  heldThrough: number;
  /** a season held out of the games until this ET date (YYYY-MM-DD) */
  countsFrom?: Record<number, string>;
  /** the saved Record Books page for the table, public/records/<slug>/ */
  recordSlug: string;
}

/** Days after a final that its row must be in the table. */
export const SEASON_DUE_GRACE_DAYS = 21;

/** Round 1551 lands the 2026 Australian rows; they count from this ET date. */
const AU_2026_FROM = { 2026: '2026-11-01' };

export const SEASON_FINALS: SeasonFinal[] = [
  { key: 'sb', table: 'super_bowls', label: 'Super Bowl', decidedBy: { month: 2, day: 20 }, heldThrough: 2026, recordSlug: 'super-bowl-winners' },
  { key: 'nba', table: 'nba_finals', label: 'NBA Finals', decidedBy: { month: 6, day: 25 }, heldThrough: 2026, recordSlug: 'nba-champions' },
  { key: 'ws', table: 'world_series_v2', label: 'World Series', decidedBy: { month: 11, day: 5 }, heldThrough: 2025, recordSlug: 'world-series-winners' },
  { key: 'cup', table: 'stanley_cup_finals_v2', label: 'Stanley Cup Final', decidedBy: { month: 6, day: 30 }, heldThrough: 2026, recordSlug: 'stanley-cup-winners' },
  { key: 'wnba', table: 'wnba_finals', label: 'WNBA Finals', decidedBy: { month: 10, day: 31 }, heldThrough: 2025, recordSlug: 'wnba-champions' },
  { key: 'cfb', table: 'cfb_national_champions', label: 'college football title game', decidedBy: { month: 1, day: 25, seasonOffset: 1 }, heldThrough: 2025, recordSlug: 'college-football-national-champions' },
  { key: 'cbb', table: 'ncaa_basketball_champions', label: "men's NCAA tournament", decidedBy: { month: 4, day: 10 }, heldThrough: 2026, recordSlug: 'ncaa-basketball-champions' },
  { key: 'epl', table: 'soccer_league_champions', label: 'English top flight', decidedBy: { month: 5, day: 31 }, heldThrough: 2026, recordSlug: 'english-football-champions' },
  { key: 'afl', table: 'afl_premiers', label: 'AFL Grand Final', decidedBy: { month: 10, day: 5 }, heldThrough: 2026, countsFrom: AU_2026_FROM, recordSlug: 'afl-premiers' },
  { key: 'nrl', table: 'nrl_premiers', label: 'NRL Grand Final', decidedBy: { month: 10, day: 10 }, heldThrough: 2026, countsFrom: AU_2026_FROM, recordSlug: 'nrl-premiers' },
  { key: 'brownlow', table: 'afl_brownlow', label: 'Brownlow Medal count', decidedBy: { month: 10, day: 1 }, heldThrough: 2026, countsFrom: AU_2026_FROM, recordSlug: 'brownlow-medal-winners' },
  { key: 'dallym', table: 'nrl_dally_m', label: 'Dally M Medal', decidedBy: { month: 10, day: 5 }, heldThrough: 2026, countsFrom: AU_2026_FROM, recordSlug: 'dally-m-medal-winners' },
];

/** False while a landed season is still held out of the games. */
export function seasonCounts(table: string, year: number, today: string = getTodayET()): boolean {
  const from = SEASON_FINALS.find(f => f.table === table)?.countsFrom?.[year];
  return !from || today >= from;
}
