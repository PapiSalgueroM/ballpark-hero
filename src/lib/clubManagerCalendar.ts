/**
 * Round 466: the calendar you can click.
 *
 * His words (docs/TWEAKS-2026-08-28.md): "Calendar: click any day and sim to
 * it (keep the four fast forwards), bigger emojis, match days name the
 * opponent, transfer window open and close clearly marked."
 *
 * This module holds the PURE parts of the Club Manager calendar, so the
 * screen stays a function of the save and a harness can measure all of it
 * without a browser:
 *
 *  - the date maths (moved here from CalendarScreen, where Round 158 wrote
 *    it): Gregorian helpers with no Date object, the season kickoff, and the
 *    date of every calendar entry;
 *  - what a day holds: a match with its opponent, venue and competition, the
 *    day a transfer window opens, deadline day, a training day or a rest day;
 *  - where the two windows sit on the grid, derived from the engine's own
 *    rule (a window spans a fixed number of MY match weeks, see
 *    WINDOW_MATCH_WEEKS) and, once a window has run, from the results the
 *    save actually recorded;
 *  - the sim to a day rule, and the one loop that both a tap on a day and
 *    the four fast forwards go through. The loop calls the engine's own
 *    playNextEntry, entry by entry, and never re-implements a week of it.
 *
 * Nothing here mutates a save. Every function takes the state and returns a
 * new one or a plain description.
 */
import {
  playNextEntry, fixtureFor, entryInvolvesMe, careerLeagueOf, CUP_LABELS, UCL_LABELS,
} from '@/lib/clubManager';
import type { CareerState, CalendarEntry, Competition, FormResult, MatchWeekReport } from '@/lib/clubManager';
import { CM_BASE_YEAR } from '@/lib/clubManagerEras';

/* ================================================================== */
/* Dates                                                              */
/* ================================================================== */

export interface CalDate { y: number; m: number; d: number; }

/** Day of week, 0 Sunday, for a Gregorian date. Sakamoto's method. */
export function dayOfWeek(y: number, m: number, d: number): number {
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  const yy = m < 3 ? y - 1 : y;
  return (yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) + t[m - 1] + d) % 7;
}

export function daysInMonth(y: number, m: number): number {
  return [31, (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
}

export function addDays(date: CalDate, n: number): CalDate {
  let { y, m, d } = date;
  d += n;
  while (d > daysInMonth(y, m)) { d -= daysInMonth(y, m); m += 1; if (m > 12) { m = 1; y += 1; } }
  while (d < 1) { m -= 1; if (m < 1) { m = 12; y -= 1; } d += daysInMonth(y, m); }
  return { y, m, d };
}

/** A sortable integer for a date: 20260808 for 8 August 2026. */
export function dateKey(date: CalDate): number {
  return date.y * 10000 + date.m * 100 + date.d;
}

/** Whole days from a to b (negative when b is earlier). */
export function daysBetween(a: CalDate, b: CalDate): number {
  const toDays = (x: CalDate): number => {
    // Days since 1 January year 0 in the proleptic Gregorian calendar.
    const y = x.m <= 2 ? x.y - 1 : x.y;
    const era = Math.floor(y / 400);
    const yoe = y - era * 400;
    const doy = Math.floor((153 * (x.m + (x.m > 2 ? -3 : 9)) + 2) / 5) + x.d - 1;
    const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
    return era * 146097 + doe;
  };
  return toDays(b) - toDays(a);
}

/** The next Saturday strictly after a date. */
function saturdayAfter(date: CalDate): CalDate {
  const next = addDays(date, 1);
  const dow = dayOfWeek(next.y, next.m, next.d);
  return addDays(next, (6 - dow + 7) % 7);
}

/** The season's opening Saturday: the second Saturday of August, world year. */
export function seasonKickoff(worldYear: number): CalDate {
  const firstDow = dayOfWeek(worldYear, 8, 1);
  const firstSaturday = 1 + ((6 - firstDow + 7) % 7);
  return { y: worldYear, m: 8, d: firstSaturday + 7 };
}

/** The date of a calendar entry: one Saturday per engine week. */
export function dateOfWeek(worldYear: number, weekIdx: number): CalDate {
  return addDays(seasonKickoff(worldYear), weekIdx * 7);
}

/**
 * Round 158, the honest mapping: league rounds and the window take the
 * Saturdays, cup and European entries slot into the midweek, exactly like a
 * real season. Dates stay strictly in entry order.
 *
 * Round 466: the January window lands in January. The engine's window entry
 * sits 47 percent of the way through the league rounds, which the plain
 * Saturday count put on 12 to 25 December for an 18 or 20 club league while
 * every headline and screen calls it the January window. The window now
 * takes the first Saturday of the new year if the count would have put it
 * earlier (a winter break of one to three weeks on the grid, the way the
 * Bundesliga and La Liga really pause), and a league long enough to reach
 * January on its own (the 24 club Championship) is left where it was. The
 * engine's week index is untouched: this is where the week is DRAWN.
 */
export function dateOfEntries(worldYear: number, calendar: { type: string }[]): CalDate[] {
  const out: CalDate[] = [];
  let last = addDays(seasonKickoff(worldYear), -7);
  const newYear: CalDate = { y: worldYear + 1, m: 1, d: 1 };
  for (const entry of calendar) {
    if (entry.type === 'league' || entry.type === 'window') {
      let next = saturdayAfter(last);
      if (entry.type === 'window' && dateKey(next) < dateKey(newYear)) {
        // The first Saturday on or after 1 January.
        next = saturdayAfter(addDays(newYear, -1));
      }
      out.push(next);
      last = next;
    } else {
      // Midweek: the Wednesday after a Saturday, or a week on from another midweek.
      const wasSaturday = dayOfWeek(last.y, last.m, last.d) === 6;
      const next = addDays(last, wasSaturday ? 4 : 7);
      out.push(next);
      last = next;
    }
  }
  return out;
}

/** The real world year a save's current season runs in. */
export function worldYearOf(state: Pick<CareerState, 'startYear' | 'season'>): number {
  return (state.startYear ?? CM_BASE_YEAR) + state.season - 1;
}

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Sat 8 Aug". */
export function shortDate(date: CalDate): string {
  return `${DAY_NAMES[dayOfWeek(date.y, date.m, date.d)]} ${date.d} ${MONTH_NAMES[date.m - 1].slice(0, 3)}`;
}

/* ================================================================== */
/* Windows                                                            */
/* ================================================================== */

/**
 * How many of MY match weeks each window spans, mirroring the two literals
 * the engine writes into the save: startCareer and startNextSeason open the
 * summer with windowWeeksLeft 4, and playNextEntry opens January with 3.
 * The window shuts at the end of the last of those matches (playMyMatch
 * counts one down per match and closes the market at zero), so deadline
 * day on the grid is that match day. scripts/simClubManagerCalendar.mjs
 * reads a fresh save and a save at the window entry to hold these two
 * numbers to the engine's own.
 */
export const WINDOW_MATCH_WEEKS = { summer: 4, january: 3 } as const;

export type WindowKind = 'summer' | 'january';

export interface WindowSpan {
  kind: WindowKind;
  /** Calendar index the window opens on: 0 for summer, the window entry for January. */
  openWeek: number;
  /** Calendar index of deadline day (my last match of the window), null when the season cannot reach it. */
  deadlineWeek: number | null;
  /** Whether the save is inside this window right now. */
  live: boolean;
}

/**
 * Every calendar index that is, or was, a match of mine this season: the
 * result log for what has been played, the engine's own fixture resolution
 * for what is ahead. Sorted, no duplicates.
 */
export function myMatchWeeks(state: CareerState): number[] {
  const weeks = new Set<number>();
  for (const r of state.resultLog ?? []) {
    if (r.week < state.week) weeks.add(r.week);
  }
  for (let w = state.week; w < state.calendar.length; w++) {
    const entry = state.calendar[w];
    if (entry.type === 'window') continue;
    if (fixtureFor(state, entry)) weeks.add(w);
  }
  return [...weeks].sort((a, b) => a - b);
}

/** The n-th of my match weeks at or after `from`, or null. */
function nthMatchWeekFrom(matchWeeks: number[], from: number, n: number): number | null {
  const ahead = matchWeeks.filter(w => w >= from);
  return ahead.length >= n ? ahead[n - 1] : null;
}

/**
 * Where the two windows sit this season. A live window is read off the
 * save itself (windowWeeksLeft says how many of my matches remain, the
 * last of them is deadline day); a window that has run or is still ahead
 * is placed by the same rule on the match weeks the save knows about.
 */
export function windowSpans(state: CareerState): WindowSpan[] {
  const matchWeeks = myMatchWeeks(state);
  const windowEntry = state.calendar.findIndex(e => e.type === 'window');
  const spans: WindowSpan[] = [];
  const liveKind = state.transferWindow;
  const liveLeft = state.windowWeeksLeft ?? 0;

  const summerDeadline = liveKind === 'summer'
    ? nthMatchWeekFrom(matchWeeks, state.week, Math.max(1, liveLeft))
    : nthMatchWeekFrom(matchWeeks, 0, WINDOW_MATCH_WEEKS.summer);
  spans.push({ kind: 'summer', openWeek: 0, deadlineWeek: summerDeadline, live: liveKind === 'summer' });

  if (windowEntry >= 0) {
    const januaryDeadline = liveKind === 'january'
      ? nthMatchWeekFrom(matchWeeks, state.week, Math.max(1, liveLeft))
      : nthMatchWeekFrom(matchWeeks, windowEntry + 1, WINDOW_MATCH_WEEKS.january);
    spans.push({ kind: 'january', openWeek: windowEntry, deadlineWeek: januaryDeadline, live: liveKind === 'january' });
  }
  return spans;
}

/* ================================================================== */
/* What a day holds                                                   */
/* ================================================================== */

export type DayKind = 'match' | 'window' | 'training' | 'rest';

export interface CalendarDay {
  date: CalDate;
  key: number;
  /** Calendar entry index for a match or window day, null for the days between. */
  weekIdx: number | null;
  kind: DayKind;
  competition?: Competition;
  /** "Premier League · Round 3", straight from the engine. */
  compLabel?: string;
  /** The opponent's name; null when the draw has not been made yet. */
  opponent?: string | null;
  home?: boolean | null;
  /** A cup or European round ahead that my club reaches only by winning the
   *  one before: drawn faded, "if you get there", never counted as a match
   *  a sim to that day will play. */
  potential?: boolean;
  /** Once played. */
  res?: FormResult;
  score?: string;
  /** The window that opens on this day. */
  windowOpens?: WindowKind;
  /** The window this day is deadline day for. */
  deadline?: WindowKind;
  /** A window is open on this day (open day and deadline day included). */
  windowOpen: boolean;
  isToday: boolean;
  past: boolean;
}

export interface SeasonDays {
  worldYear: number;
  entryDates: CalDate[];
  /** The date of the next entry to play, the calendar's idea of today. */
  today: CalDate;
  seasonStart: CalDate;
  seasonEnd: CalDate;
  windows: WindowSpan[];
  /** Every match and window day, keyed by dateKey. */
  entryDays: Map<number, CalendarDay>;
}

/** The emoji a day kind wears on the grid. Bigger on screen than Round 158's. */
export function dayEmoji(day: CalendarDay): string {
  if (day.kind === 'window') return '\u{1F513}';
  if (day.kind === 'match') {
    if (day.competition === 'cup') return '\u{1F3C5}';
    if (day.competition === 'uclGroup' || day.competition === 'uclKo') return '⭐';
    return '⚽';
  }
  return '';
}

/**
 * A two or three letter tag for a club name, for the grid cell where the
 * full name cannot fit: one word takes its first three letters, two words
 * take the first letter of the first and two of the last (Manchester
 * United MUN, Manchester City MCI, Real Madrid RMA), three or more take
 * their initials (West Ham United WHU, Paris Saint-Germain PSG). Club
 * suffixes like FC and AFC are dropped first. The full name is one tap
 * away on the day strip and in the month list.
 */
export function clubTag(name: string): string {
  const words = name
    .replace(/^\d+\.?\s+/, '')
    .split(/[\s-]+/)
    .filter(w => w && !/^(fc|afc|cf|sc|ac|sv|ssc|us|as|rc|rcd|cd|ud|bk|if|fk|sk|club)$/i.test(w));
  const up = (s: string): string => s.toUpperCase();
  if (words.length === 0) return up(name.slice(0, 3));
  if (words.length === 1) return up(words[0].slice(0, 3));
  if (words.length === 2) return up(words[0][0] + words[1].slice(0, 2));
  return up(words.slice(0, 3).map(w => w[0]).join(''));
}

const ROUND_RANK: Record<'R16' | 'QF' | 'SF' | 'F', number> = { R16: 0, QF: 1, SF: 2, F: 3 };

/**
 * A knockout round ahead of the one my club is in, while it is still in the
 * competition: the engine does not count it as mine until the round before
 * is won (entryInvolvesMe), and the grid draws it as a maybe rather than
 * either inventing a fixture or leaving a blank where a final might be.
 */
export function potentialEntry(state: CareerState, entry: CalendarEntry): boolean {
  if (entry.type === 'cup' && entry.cupRound) {
    const cur = state.cupRound;
    return cur !== 'out' && cur !== 'won' && ROUND_RANK[entry.cupRound] > ROUND_RANK[cur];
  }
  if (entry.type === 'uclKo' && entry.uclRound) {
    if (!state.uclGroup) return false;
    const cur = state.uclKoRound;
    if (cur === 'out' || cur === 'won') return false;
    // Still in the groups: every knockout round is ahead.
    if (cur === null) return true;
    return ROUND_RANK[entry.uclRound] > ROUND_RANK[cur];
  }
  return false;
}

/** The competition label for an entry that involves me but has no fixture yet (a cup or European draw to come). */
function pendingLabel(state: CareerState, entry: CalendarEntry): string {
  const league = careerLeagueOf(state);
  if (entry.type === 'cup' && entry.cupRound) return `${league.cupName} · ${CUP_LABELS[entry.cupRound]}`;
  if (entry.type === 'uclKo' && entry.uclRound) return `Champions League · ${UCL_LABELS[entry.uclRound]}`;
  if (entry.type === 'uclGroup') return `Champions League · Group MD${entry.round + 1}`;
  return `${league.name} · Round ${entry.round + 1}`;
}

/**
 * Every match and window day of the season, resolved against the save:
 * played matches carry their result straight from the result log, matches
 * ahead carry the opponent the engine will actually put out (or "draw to
 * come" when the cup or Europe has not drawn yet), and an entry my club is
 * out of (a cup round after elimination, Europe when not in it) is not a
 * match day at all.
 */
export function seasonDays(state: CareerState): SeasonDays {
  const worldYear = worldYearOf(state);
  const entryDates = dateOfEntries(worldYear, state.calendar);
  const seasonStart = seasonKickoff(worldYear);
  const seasonEnd = entryDates[entryDates.length - 1] ?? seasonStart;
  const today = entryDates[Math.min(state.week, state.calendar.length - 1)] ?? seasonStart;
  const windows = windowSpans(state);
  const played = new Map<number, { res: FormResult; opp: string; comp: string; home: boolean | null; score: string; competition?: Competition }>();
  for (const r of state.resultLog ?? []) played.set(r.week, { res: r.res, opp: r.opp, comp: r.comp, home: r.home, score: r.score, competition: r.competition });

  const openDays = new Map<number, WindowKind>();
  const deadlineDays = new Map<number, WindowKind>();
  const openRanges: { from: number; to: number }[] = [];
  for (const w of windows) {
    const open = w.kind === 'summer' ? seasonStart : entryDates[w.openWeek];
    if (w.kind === 'january') openDays.set(dateKey(open), 'january');
    const close = w.deadlineWeek !== null ? entryDates[w.deadlineWeek] : null;
    if (close) deadlineDays.set(dateKey(close), w.kind);
    openRanges.push({ from: dateKey(open), to: close ? dateKey(close) : dateKey(open) });
  }
  const inWindow = (key: number): boolean => openRanges.some(r => key >= r.from && key <= r.to);

  const entryDays = new Map<number, CalendarDay>();
  state.calendar.forEach((entry, w) => {
    const date = entryDates[w];
    const key = dateKey(date);
    const isToday = w === state.week;
    const past = w < state.week;
    if (entry.type === 'window') {
      entryDays.set(key, { date, key, weekIdx: w, kind: 'window', windowOpens: 'january', windowOpen: true, isToday, past });
      return;
    }
    const p = played.get(w);
    if (p) {
      entryDays.set(key, {
        date, key, weekIdx: w, kind: 'match',
        competition: p.competition ?? entry.type,
        compLabel: p.comp, opponent: p.opp, home: p.home, res: p.res, score: p.score,
        deadline: deadlineDays.get(key), windowOpen: inWindow(key), isToday, past,
      });
      return;
    }
    if (past) return;
    if (!entryInvolvesMe(state, entry)) {
      if (!potentialEntry(state, entry)) return;
      entryDays.set(key, {
        date, key, weekIdx: w, kind: 'match', potential: true,
        competition: entry.type, compLabel: pendingLabel(state, entry), opponent: null, home: null,
        deadline: deadlineDays.get(key), windowOpen: inWindow(key), isToday, past,
      });
      return;
    }
    const fx = fixtureFor(state, entry);
    entryDays.set(key, {
      date, key, weekIdx: w, kind: 'match',
      competition: entry.type,
      compLabel: fx ? fx.compLabel : pendingLabel(state, entry),
      opponent: fx ? fx.opponent : null,
      home: fx ? fx.home : null,
      deadline: deadlineDays.get(key), windowOpen: inWindow(key), isToday, past,
    });
  });
  // A deadline day is always drawn, even when the day's match has been
  // dropped from the map (a cup exit after the count was made), so the
  // window's close never vanishes from the grid.
  for (const [key, kind] of deadlineDays) {
    const day = entryDays.get(key);
    if (day) day.deadline = kind;
  }
  return { worldYear, entryDates, today, seasonStart, seasonEnd, windows, entryDays };
}

/** Training days per policy, as day-of-week numbers (1 Mon .. 5 Fri). */
export const TRAIN_DAYS: Record<'light' | 'normal' | 'double', number[]> = {
  light: [2, 4],
  normal: [1, 3, 4],
  double: [1, 2, 3, 4, 5],
};

/**
 * One month of the grid: leading blanks for the weekday the month starts
 * on, then every day, each one a match, a window day, a training day or a
 * rest day. Seven columns, at most six rows.
 */
export function monthGrid(days: SeasonDays, y: number, m: number, intensity: 'light' | 'normal' | 'double'): (CalendarDay | null)[] {
  const cells: (CalendarDay | null)[] = [];
  const lead = dayOfWeek(y, m, 1);
  for (let i = 0; i < lead; i++) cells.push(null);
  const todayKey = dateKey(days.today);
  const startKey = dateKey(days.seasonStart);
  const endKey = dateKey(days.seasonEnd);
  const openRanges = days.windows.map(w => {
    const open = w.kind === 'summer' ? days.seasonStart : days.entryDates[w.openWeek];
    const close = w.deadlineWeek !== null ? days.entryDates[w.deadlineWeek] : open;
    return { from: dateKey(open), to: dateKey(close) };
  });
  for (let d = 1; d <= daysInMonth(y, m); d++) {
    const date = { y, m, d };
    const key = dateKey(date);
    const entry = days.entryDays.get(key);
    if (entry) { cells.push(entry); continue; }
    const dow = dayOfWeek(y, m, d);
    const inSeason = key >= startKey && key <= endKey;
    cells.push({
      date, key, weekIdx: null,
      kind: inSeason && TRAIN_DAYS[intensity].includes(dow) ? 'training' : 'rest',
      windowOpen: openRanges.some(r => key >= r.from && key <= r.to),
      isToday: key === todayKey,
      past: key < todayKey,
    });
  }
  return cells;
}

/* ================================================================== */
/* Sim to a day                                                       */
/* ================================================================== */

/**
 * The calendar index the save sits on after simming to `date`: one past the
 * last entry dated on or before it. Null when the day is not ahead of the
 * save (a past day, or a day before the next entry, where there is nothing
 * to play). A tap on a match day plays that match; a tap on a quiet day
 * plays everything up to it and stops.
 */
export function targetWeekForDate(entryDates: CalDate[], week: number, date: CalDate): number | null {
  const k = dateKey(date);
  let target = 0;
  for (let i = 0; i < entryDates.length; i++) {
    if (dateKey(entryDates[i]) <= k) target = i + 1;
  }
  return target > week ? target : null;
}

export type SimHalt = 'window' | 'seasonOver' | 'sacked' | 'approach' | null;

export interface SimRun {
  state: CareerState;
  /** The last match played in the run, so a fast forward has a payoff. */
  lastReport: MatchWeekReport | null;
  /** Why the run stopped short of the target, or null when it got there. */
  halt: SimHalt;
}

/**
 * The one loop. Plays the engine forward, one entry at a time through its
 * own playNextEntry, until the save's week reaches `targetWeek`, stopping
 * early for the things that need the manager: a transfer window opening,
 * the end of the season, the sack, or a club's approach landing (an offer
 * that quietly expires if it sits unanswered for five weeks). Every match in
 * the run is played in one shot with the current XI, as the fast forwards
 * always were. A tap on a day and every fast forward button go through
 * here, so the two can never drift.
 */
export function simToWeek(career: CareerState, targetWeek: number): SimRun {
  let state = career;
  let lastReport: MatchWeekReport | null = null;
  const target = Math.min(targetWeek, career.calendar.length);
  while (state.week < target) {
    const suitorBefore = state.approach?.club ?? null;
    const res = playNextEntry(state, { skipHalftime: true, untilWeek: target });
    state = res.state;
    if (res.kind === 'window') return { state, lastReport, halt: 'window' };
    if (res.kind === 'seasonOver') return { state, lastReport, halt: 'seasonOver' };
    if (res.kind === 'match' && res.report) lastReport = res.report;
    if (state.sacked) return { state, lastReport, halt: 'sacked' };
    if (state.approach && state.approach.club !== suitorBefore) return { state, lastReport, halt: 'approach' };
    if (res.kind === 'reached') break;
  }
  return { state, lastReport, halt: null };
}

/** A tap on a day: the date rule, then the loop. Null when the day has nothing to sim. */
export function simToDate(career: CareerState, date: CalDate): SimRun | null {
  const entryDates = dateOfEntries(worldYearOf(career), career.calendar);
  const target = targetWeekForDate(entryDates, career.week, date);
  return target === null ? null : simToWeek(career, target);
}

/**
 * The index just past the n-th thing ahead that involves me (a match or the
 * window), for the older "n games" fast forward. The season's end when
 * fewer than n remain.
 */
export function weekAfterMatches(state: CareerState, n: number): number {
  let seen = 0;
  for (let w = state.week; w < state.calendar.length; w++) {
    const entry = state.calendar[w];
    if (entry.type === 'window' || fixtureFor(state, entry)) {
      seen += 1;
      if (seen >= n) return w + 1;
    }
  }
  return state.calendar.length;
}

export interface FastForward {
  /** The day the button is a tap on. */
  date: CalDate;
  /** The week that tap sims to, by the same rule a tap uses. */
  week: number;
}

export interface FastForwards {
  nextMatch: FastForward | null;
  aboutAMonth: FastForward | null;
  toWindow: FastForward | null;
  restOfSeason: FastForward | null;
}

/**
 * The four fast forwards, each one expressed as a tap on a day so that the
 * button and the tap are the same thing: the next match day (or the window
 * entry when that comes first), the day four weeks from today, the day the
 * January window opens, and the last day of the season. Every target comes
 * from targetWeekForDate on that day; nothing here counts entries itself.
 */
export function fastForwardTargets(state: CareerState, days: SeasonDays): FastForwards {
  const { entryDates, today, seasonEnd } = days;
  const at = (date: CalDate): FastForward | null => {
    const week = targetWeekForDate(entryDates, state.week, date);
    return week === null ? null : { date, week };
  };
  let nextMatch: FastForward | null = null;
  for (let w = state.week; w < state.calendar.length; w++) {
    const entry = state.calendar[w];
    if (entry.type === 'window' || fixtureFor(state, entry)) { nextMatch = at(entryDates[w]); break; }
  }
  const monthOn = addDays(today, 28);
  const aboutAMonth = at(dateKey(monthOn) > dateKey(seasonEnd) ? seasonEnd : monthOn);
  const windowIdx = state.calendar.findIndex((e, i) => i >= state.week && e.type === 'window');
  const toWindow = windowIdx >= 0 ? at(entryDates[windowIdx]) : null;
  const restOfSeason = at(seasonEnd);
  return { nextMatch, aboutAMonth, toWindow, restOfSeason };
}

/**
 * Real Premier League window dates for the seasons the four eras start in,
 * two sources each, checked 2026-09-05. The grid never shows these: it
 * shows the engine's own deadline days (WINDOW_MATCH_WEEKS above). They
 * exist so scripts/simClubManagerCalendar.mjs can measure how far the
 * engine's derived days sit from the real ones and hold that gap.
 *
 *  2026-27: summer closed 23:00 BST Tuesday 1 September 2026 (premierleague.com,
 *           "Summer 2026 Transfer Deadline Day: Everything you need to know";
 *           Sky Sports, "Summer transfer window 2026 dates"); January opens
 *           Friday 1 January 2027 and closes 23:00 Monday 1 February 2027
 *           (Sports Mole, "When is the January 2027 transfer window?"; Sky
 *           Sports, same article as above).
 *  2015-16: summer closed 18:00 BST Tuesday 1 September 2015 (Wikipedia, List
 *           of English football transfers summer 2015; Bleacher Report,
 *           "Summer Transfer Window 2015: Full List of Deals Struck on
 *           Deadline Day"); January ran 1 January to Monday 1 February 2016
 *           (Wikipedia, winter 2015-16 list; Sports Illustrated, 1 February
 *           2016, "Imbula to Stoke headlines transfer deadline day").
 *  2010-11: summer closed 18:00 BST Tuesday 31 August 2010 (Wikipedia, summer
 *           2010 list; FourFourTwo, Van der Vaart's deadline day move, two
 *           hours before the window closed on 31 August 2010); January ran
 *           1 January to 23:00 Monday 31 January 2011 (Wikipedia, winter
 *           2010-11 list; Al Jazeera, 1 February 2011, "Torres and Carroll
 *           smash records", the record broken twice on the Monday).
 *  2005-06: summer closed Wednesday 31 August 2005 (Wikipedia, summer 2005
 *           list, whose final entries are Owen to Newcastle and Jenas to
 *           Tottenham on 31 August 2005; Sports Mole and soccermag date the
 *           Owen deal to 30 and 31 August 2005 as the window shut); January
 *           ran 1 January 2006 to 00:00 UTC on 1 February 2006 (Wikipedia,
 *           summer 2005 list's note on the re-opening; Bleacher Report, the
 *           January window's history, England's window 1 to 31 January).
 */
export const REAL_WINDOWS: Record<string, { summerClose: CalDate; januaryOpen: CalDate; januaryClose: CalDate }> = {
  now: { summerClose: { y: 2026, m: 9, d: 1 }, januaryOpen: { y: 2027, m: 1, d: 1 }, januaryClose: { y: 2027, m: 2, d: 1 } },
  era2015: { summerClose: { y: 2015, m: 9, d: 1 }, januaryOpen: { y: 2016, m: 1, d: 1 }, januaryClose: { y: 2016, m: 2, d: 1 } },
  era2010: { summerClose: { y: 2010, m: 8, d: 31 }, januaryOpen: { y: 2011, m: 1, d: 1 }, januaryClose: { y: 2011, m: 1, d: 31 } },
  era2005: { summerClose: { y: 2005, m: 8, d: 31 }, januaryOpen: { y: 2006, m: 1, d: 1 }, januaryClose: { y: 2006, m: 1, d: 31 } },
};
