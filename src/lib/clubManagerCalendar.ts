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
  playNextEntry, fixtureFor, entryInvolvesMe, careerLeagueOf, leagueRulesOf, CUP_LABELS, UCL_LABELS,
  cupProgressRank, uclProgressRank, objectiveStatuses,
  /* Round 783: the mid season takeover an accepted application walks into. */
  startCareer, interimManagerName,
  /* Round 1229: the league book of the run-in, carried under the season you were in. */
  carryLeagueBook,
} from '@/lib/clubManager';
import type { CareerState, CalendarEntry, Competition, FormResult, MatchWeekReport, PlayerMessage } from '@/lib/clubManager';
import { CM_BASE_YEAR, DEFAULT_ERA_ID, eraById, isHistoricEra } from '@/lib/clubManagerEras';
import { closeOnJoiningNow, jobHuntOf, leavingLine } from '@/lib/clubManagerJobHunt';

/* ================================================================== */
/* Dates                                                              */
/* ================================================================== */

/* Round 946: the pure date helpers (CalDate, dayOfWeek, daysInMonth,
   addDays, dateKey, daysBetween, MONTH_NAMES, shortDate) live in
   src/lib/calDate.ts now, shared with the GM calendar. They are re-exported
   here unchanged, so every import from this module keeps working; the
   fixture scripts/data/calDateFixture946.json, recorded before the move,
   proves the calendar built on them did not move a day. */
import { addDays, dateKey, dayOfWeek, daysBetween, daysInMonth, shortDate } from '@/lib/calDate';
import type { CalDate } from '@/lib/calDate';
export { addDays, dateKey, dayOfWeek, daysBetween, daysInMonth, MONTH_NAMES, shortDate } from '@/lib/calDate';
export type { CalDate } from '@/lib/calDate';

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
 *
 * Round 1021: a season that really started late (see seasonPlanOf) passes
 * its plan, and only then does anything below change; with no plan every
 * date is the one this function always drew.
 */
export function dateOfEntries(worldYear: number, calendar: { type: string }[], plan?: SeasonPlan | null): CalDate[] {
  if (plan) return lateEntryDates(worldYear, calendar, plan);
  return drawEntries(seasonKickoff(worldYear), worldYear, calendar, NO_MIDWEEK_ROUNDS);
}

const NO_MIDWEEK_ROUNDS: ReadonlySet<number> = new Set();

/** The drawing rule above from a given opening Saturday, with the league
 *  rounds named in `midweek` played on the Wednesday after a Saturday. */
function drawEntries(kickoff: CalDate, worldYear: number, calendar: { type: string }[], midweek: ReadonlySet<number>): CalDate[] {
  const out: CalDate[] = [];
  let last = addDays(kickoff, -7);
  const newYear: CalDate = { y: worldYear + 1, m: 1, d: 1 };
  for (const [i, entry] of calendar.entries()) {
    if ((entry.type === 'league' && !midweek.has(i)) || entry.type === 'window') {
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

/* ---------- Round 1021: the season that started late ---------- */

/**
 * Every season here opens on the second Saturday of August (seasonKickoff).
 * 2020-21 did not: the pandemic pushed the end of 2019-20 into August, so
 * the big five opened between late August and mid September and the summer
 * window stayed open to 5 October. Each of those leagues carries its real
 * opening Saturday and deadline on its rules row (lateStart on the 2020 rows
 * of LEAGUE_RULES in clubManager.ts, with the sources), and a season keeps
 * those dates only in the world year they were played. So only an era2020
 * save's first season moves: its second (2021-22) opened in August as usual,
 * and no other era's league has the field.
 */

/** One save's late season: its league's opening Saturday and the real summer deadline. */
export interface SeasonPlan { kickoff: CalDate; summerClose: CalDate; }

/** The plan for the save's current season, or null for a season that opened on time. */
export function seasonPlanOf(state: Pick<CareerState, 'startYear' | 'season' | 'eraId' | 'clubName' | 'customClub'>): SeasonPlan | null {
  const late = leagueRulesOf(careerLeagueOf(state).id).lateStart;
  return late && late.kickoff.y === worldYearOf(state) ? { kickoff: late.kickoff, summerClose: late.summerClose } : null;
}

/** Every entry's date for the save's current season, late start included. */
export function entryDatesOf(state: Pick<CareerState, 'startYear' | 'season' | 'eraId' | 'clubName' | 'customClub' | 'calendar'>): CalDate[] {
  return dateOfEntries(worldYearOf(state), state.calendar, seasonPlanOf(state));
}

/** The opening Saturday of the save's current season. */
export function kickoffOf(state: Pick<CareerState, 'startYear' | 'season' | 'eraId' | 'clubName' | 'customClub'>): CalDate {
  return seasonPlanOf(state)?.kickoff ?? seasonKickoff(worldYearOf(state));
}

/**
 * A late season's dates. Drawn from the real opening Saturday, the January
 * window entry, which the engine puts after nearly half the league rounds,
 * would land weeks into January. The real leagues got through the autumn by
 * playing league rounds in midweek (football-data.co.uk's files: the big five
 * played 9 to 22 midweek league matches each in December 2020 alone), so the
 * same happens here: as many rounds as the window is late, the last ones
 * before it that qualify, move to the Wednesday between two Saturday rounds,
 * which brings the window back to the first Saturday of January. Each of
 * those rounds sits between two league rounds (or a league round and the
 * window), so it gains exactly one week and never meets a cup or European
 * night. The engine's mix of cup and European nights leaves few rounds that
 * qualify, so the last one before the window lands at the new year (30
 * December, or 6 January where the window is a week late) and the others
 * fall early: rounds 2 and 5 on 16 and 30
 * September for the Premier League and La Liga, 23 September and 7 October
 * for Serie A. That is earlier than the real squeeze, which came mostly in
 * December: in September 2020 football-data.co.uk has 6 such La Liga
 * matches, 4 Ligue 1 and 3 Serie A, and none at all in England or Germany
 * (Round 1021 review, recounted 2026-10-06), so the Premier League's two
 * September Wednesdays here have no real twin. Moving them later would
 * need a round that sits between two league rounds, and the engine's cup
 * and European nights leave none closer to December.
 * Where there are too few such rounds the window stays a week late:
 * Serie A and the Bundesliga, opening on 19 September, have one too few and
 * open January on the 9th (measured in scripts/simClubManagerCalendar.mjs).
 * The number of rounds is untouched; only the day they are drawn on.
 */
function lateEntryDates(worldYear: number, calendar: { type: string }[], plan: SeasonPlan): CalDate[] {
  const plain = drawEntries(plan.kickoff, worldYear, calendar, NO_MIDWEEK_ROUNDS);
  const windowIdx = calendar.findIndex(e => e.type === 'window');
  if (windowIdx < 0) return plain;
  const firstSaturday = saturdayAfter({ y: worldYear, m: 12, d: 31 });
  const late = Math.round(daysBetween(firstSaturday, plain[windowIdx]) / 7);
  if (late <= 0) return plain;
  const isLeague = (i: number) => calendar[i]?.type === 'league';
  const midweek = new Set<number>();
  for (let i = windowIdx - 1; i > 0 && midweek.size < late; i--) {
    const between = isLeague(i - 1) && (isLeague(i + 1) || i + 1 === windowIdx);
    if (isLeague(i) && between && !midweek.has(i + 1)) midweek.add(i);
  }
  return drawEntries(plan.kickoff, worldYear, calendar, midweek);
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

/**
 * Round 1021: a late season's summer window (see seasonPlanOf) is not four
 * matches long. It stays open to the real deadline, so on day one it spans
 * every match of mine drawn on or before that day: five to seven on a
 * September start, nine on Ligue 1's August one (Lille, measured). startCareer writes
 * this into windowWeeksLeft and keeps it on the save for the grid; null for
 * a season that opened on time, which keeps the engine's own four.
 */
export function lateSummerWindowWeeks(state: CareerState): number | null {
  const plan = seasonPlanOf(state);
  if (!plan) return null;
  const dates = entryDatesOf(state);
  const close = dateKey(plan.summerClose);
  return Math.max(1, myMatchWeeks(state).filter(w => dateKey(dates[w]) <= close).length);
}

/** How many of my matches this season's summer window spans. */
export function summerWindowWeeksOf(state: Pick<CareerState, 'season' | 'summerWindow'>): number {
  return state.summerWindow?.season === state.season ? state.summerWindow.matchWeeks : WINDOW_MATCH_WEEKS.summer;
}

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
    : nthMatchWeekFrom(matchWeeks, 0, summerWindowWeeksOf(state));
  spans.push({ kind: 'summer', openWeek: 0, deadlineWeek: summerDeadline, live: liveKind === 'summer' });

  if (windowEntry >= 0) {
    const januaryDeadline = liveKind === 'january'
      ? nthMatchWeekFrom(matchWeeks, state.week, Math.max(1, liveLeft))
      : nthMatchWeekFrom(matchWeeks, windowEntry + 1, WINDOW_MATCH_WEEKS.january);
    spans.push({ kind: 'january', openWeek: windowEntry, deadlineWeek: januaryDeadline, live: liveKind === 'january' });
  }
  return spans;
}

/** 1st, 2nd, 3rd, 4th, 11th, 22nd. */
function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th';
  return `${n}${suffix}`;
}

/**
 * The calendar strip's line for a day inside an open window: deadline day,
 * and which match of mine that is. Round 1021 review: the match is counted
 * off the very match weeks the deadline day is placed on (from kickoff for
 * the summer, from the window entry for January), so the number can never
 * contradict the date beside it. A 2020-21 save's summer deadline is its 5th
 * to 9th match, where every other season's is the 4th.
 */
export function windowOpenLine(state: CareerState, span: WindowSpan, entryDates: CalDate[]): string {
  const name = span.kind === 'summer' ? 'summer' : 'January';
  const deadline = span.deadlineWeek;
  if (deadline === null) return `The ${name} window is open.`;
  const from = span.kind === 'summer' ? 0 : span.openWeek + 1;
  const n = myMatchWeeks(state).filter(w => w >= from && w <= deadline).length;
  return `The ${name} window is open. Deadline day is ${shortDate(entryDates[deadline])}, your ${ordinal(n)} match ${span.kind === 'january' ? 'after it opens' : 'of the season'}.`;
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
  /** The calendar's idea of today: the date of the next entry that is mine
   *  (a match or the window), skipping a midweek the world plays without
   *  me, so the outline sits on the next thing that happens to my club. */
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
  const entryDates = entryDatesOf(state);
  const seasonStart = kickoffOf(state);
  const seasonEnd = entryDates[entryDates.length - 1] ?? seasonStart;
  let todayIdx = Math.min(state.week, state.calendar.length - 1);
  for (let w = state.week; w < state.calendar.length; w++) {
    const entry = state.calendar[w];
    if (entry.type === 'window' || fixtureFor(state, entry)) { todayIdx = w; break; }
  }
  const today = entryDates[todayIdx] ?? seasonStart;
  const todayKey = dateKey(today);
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
    const isToday = key === todayKey;
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
 * the run is played in one shot from the current XI, as the fast forwards
 * always were, and since Round 1072 the quick sim coach makes the changes. A tap on a day and every fast forward button go through
 * here, so the two can never drift.
 */
export function simToWeek(career: CareerState, targetWeek: number, opts?: { varReviews?: boolean }): SimRun {
  let state = career;
  let lastReport: MatchWeekReport | null = null;
  const target = Math.min(targetWeek, career.calendar.length);
  while (state.week < target) {
    const suitorBefore = state.approach?.club ?? null;
    const res = playNextEntry(state, { skipHalftime: true, untilWeek: target, ...(opts?.varReviews ? { varReviews: true } : {}) });
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
  const entryDates = entryDatesOf(career);
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
 * Real Premier League window dates for the seasons the five eras start in,
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
 *  2020-21 (Round 1021, read 2026-10-05): summer closed 23:00 BST Monday 5
 *           October 2020 in England (premierleague.com news 1725887; BBC
 *           Sport 53417773; Sky Sports 11927589, cited at the 2020 rules
 *           rows; the other four leagues' same day is THIN, see there).
 *           January closed 23:00 GMT Monday 1 February 2021: THIN, one
 *           publisher, BBC Sport's deadline day reports 55897363 and
 *           55894098, both published 1 February 2021. (Round 1021 review,
 *           2026-10-06: Maxifoot's winter 2020-21 English table, first cited
 *           here as a second source, dates its deadline deals, Minamino,
 *           Willock and Maitland-Niles, 2 February, so it does not confirm
 *           the day and is not counted.) The OPENING day of that January
 *           window is not sourced at all: nothing read for this round dates
 *           it, so the row uses 1 January, the day every other row opens on,
 *           as a measuring point only. The fence it feeds is ten days wide,
 *           so a day either way cannot change a verdict, and the January
 *           window's own day is pinned by section 6 of the harness anyway.
 */
export const REAL_WINDOWS: Record<string, { summerClose: CalDate; januaryOpen: CalDate; januaryClose: CalDate }> = {
  now: { summerClose: { y: 2026, m: 9, d: 1 }, januaryOpen: { y: 2027, m: 1, d: 1 }, januaryClose: { y: 2027, m: 2, d: 1 } },
  era2015: { summerClose: { y: 2015, m: 9, d: 1 }, januaryOpen: { y: 2016, m: 1, d: 1 }, januaryClose: { y: 2016, m: 2, d: 1 } },
  era2010: { summerClose: { y: 2010, m: 8, d: 31 }, januaryOpen: { y: 2011, m: 1, d: 1 }, januaryClose: { y: 2011, m: 1, d: 31 } },
  era2005: { summerClose: { y: 2005, m: 8, d: 31 }, januaryOpen: { y: 2006, m: 1, d: 1 }, januaryClose: { y: 2006, m: 1, d: 31 } },
  era2020: { summerClose: { y: 2020, m: 10, d: 5 }, januaryOpen: { y: 2021, m: 1, d: 1 }, januaryClose: { y: 2021, m: 2, d: 1 } },
};

/* ---------- Round 549: taking a club over mid season ---------- */

/**
 * A player asked for this on 2026-09-11: "add live start points to manager
 * career: take over a club mid season for example leicester in 15/16 midway
 * thru".
 *
 * WHAT IT IS AND WHAT IT IS HONESTLY NOT. The season is played forward before
 * you get the keys, by the engine, through the real match engine rather than a
 * lighter model, so the table, the form, the injuries, the fitness, the money,
 * the cup run and the European campaign are all genuine consequences of
 * matches that were actually played. What it is NOT is history. Club Manager's
 * fixture list is a per save shuffle over a synthetic calendar, so the real
 * 2015-16 run of results cannot be reproduced here and this does not pretend
 * to: a simulated Leicester will usually be mid table, and the copy says the
 * run-in was simulated rather than implying you are looking at the real one.
 * Inventing the real table instead would be typing history the repo cannot
 * two-source verify, which is the thing the data rules exist to stop.
 *
 * THE RUN-IN IS THE PREVIOUS MANAGER'S, NOT YOURS. That framing is what the
 * player asked for ("take over"), and it settles every awkward question on its
 * own: the results are the club's, the league position is what you inherit,
 * and none of it is charged to your record. So the handover clears the things
 * that belong to whoever had the job before you, listed one by one below,
 * rather than handing you a career that has already been half lived.
 */
export const MIDSEASON_ENTRY = {
  autumn: { fraction: 0.28, label: 'Autumn', blurb: 'A few months in. Enough table to read, most of the season still to play.' },
  newYear: { fraction: 0.5, label: 'New year', blurb: 'Halfway, with the January window about to open.' },
  runIn: { fraction: 0.72, label: 'The run-in', blurb: 'The last stretch, with the table nearly settled and everything to hold on to.' },
} as const;

export type MidSeasonEntry = keyof typeof MIDSEASON_ENTRY;

/**
 * Play `career` forward under the previous manager and hand it over.
 *
 * Every halt simToWeek can return is somebody else's problem during the run-in:
 * a transfer window is business the old manager did, an approach from another
 * club was made to him, and a sacking is precisely why the job is open. So the
 * loop rides through all of them and the handover tidies up after. The guard
 * and the no-progress break are there because a loop that calls a simulator
 * until a number goes up is exactly the shape that hangs a page.
 */
export function startMidSeason(career: CareerState, entry: MidSeasonEntry): CareerState {
  const total = career.calendar.length;
  if (!total) return career;
  /* Never the very end: a takeover with nothing left to play is not a game. */
  const target = Math.max(1, Math.min(total - 3, Math.round(total * MIDSEASON_ENTRY[entry].fraction)));
  const s = playRunIn(career, target);
  /* The handover. Everything cleared here belonged to the manager before you. */
  return {
    ...s,
    sacked: false,
    approach: null,
    pendingMove: null,
    wilderness: null,
    /* A new appointment gets a fresh mandate, not the opinion the board had
       formed of somebody else. Slightly warm, because they just hired you. */
    boardConfidence: 62,
    /* Your record starts now. The club's season is inherited; the manager's is
       not, so the progression is the day one one rather than a run of matches
       you did not pick a team for. */
    manager: career.manager,
    managerXp: career.managerXp,
    /* The inbox is the old manager's post. */
    inbox: career.inbox,
    /* Round 978: and so was the assistant's note on the last international
       break, so the break and any rest stay behind with it. */
    ...(s.intl ? { intl: { season: s.season, fired: [...s.intl.fired] } } : {}),
    midSeasonStart: entry,
    /* Round 633: what he had already banked, frozen here so the season score
       can subtract it. It is stamped rather than estimated later because an
       estimate computed from the player's own running totals rises as he
       LOSES, which pays a manager for defeats. These five numbers are read
       from the state he is handing over and never move again.
       Every call below is inside this function, never at module scope, so the
       clubManager cycle this file already lives with stays evaluation safe. */
    handover: handoverFrom(s),
  };
}

/**
 * The run-in under the previous manager, to `target`. Shared by the Round 549
 * takeover above and the Round 783 one below, so the two cannot drift apart.
 */
function playRunIn(career: CareerState, target: number): CareerState {
  /* Round 965: the weeks before the handover are the previous manager's, so
     they run without ours: no background point working the gate or the
     academy, no homeland in the market. Both callers put our manager and his
     own XP block back at the handover. */
  let s: CareerState = career.manager ? { ...career, manager: undefined, managerXp: undefined } : career;
  let guard = 0;
  while (s.week < target && guard < 400) {
    guard += 1;
    const before = s.week;
    const run = simToWeek(s, target);
    s = run.state;
    if (run.halt === 'seasonOver') break;
    if (s.week <= before) break;   /* no progress: stop rather than spin */
  }
  return s;
}

/* ---------- Round 783: walking into the job you applied for, today ---------- */

/**
 * The club that said yes to your application, joined now. This is the Round
 * 549 takeover run from inside a career rather than from the picker: the new
 * club's season is opened in THIS save's world (same world year, same
 * pyramid, this season's European field, see SeasonWorld) and played forward
 * under the manager before you to the same point of the season you are
 * leaving, then everything that is yours as a manager is carried across and
 * everything that was the old club's stays behind.
 *
 * What is honestly NOT carried: the table you were watching. The new club's
 * league to date is simulated, which includes your old club's results if it
 * shares the league, and the copy on the Manager panel says so. Keeping the
 * old table would have meant transplanting a club into a half played season
 * it never played, which is the limit the wilderness header already names.
 *
 * Yours and carried: the season number and world year, the career record and
 * the clubs managed, the trophies and the history, the created manager, the
 * XP, the national team job, the start options, the head to head, the
 * retired list, the save's league memberships. The club's and left behind:
 * the squad, the money, the facilities, the staff, the books, the sponsor,
 * the academy, the promises, the created club itself. Null when nothing is
 * waiting on you or the club is not in this world.
 */
export function joinClubNow(career: CareerState): CareerState | null {
  const hunt = jobHuntOf(career);
  const open = hunt.open;
  if (!open || open.status !== 'accepted' || career.sacked) return null;
  const club = open.club;
  const from = career.clubName;
  const eraId = career.eraId ?? DEFAULT_ERA_ID;
  const historic = isHistoricEra(eraId);
  const eraBase = historic ? eraById(eraId).startYear : CM_BASE_YEAR;
  const yearsOn = Math.max(0, (career.startYear ?? CM_BASE_YEAR) + career.season - 1 - eraBase);
  let fresh: CareerState;
  try {
    fresh = startCareer(club, eraId, undefined, career.manager, {
      yearsOn,
      uclField: career.uclField ?? null,
      keepLeagueOverrides: true,
    });
  } catch {
    return null;
  }
  if (fresh.clubName !== club) return null;
  /* Round 1021 review: fresh is a season one save, so in the 2020-21 era it
     is dealt that season's late summer window whatever year the career is
     in. Every later season opened in August with the usual four matches,
     so a join in one of those gets four, the same as everywhere else. */
  if (fresh.summerWindow && worldYearOf(fresh) !== worldYearOf(career)) {
    fresh.windowWeeksLeft = WINDOW_MATCH_WEEKS.summer;
    delete fresh.summerWindow;
  }
  /* The same point of the season, by share of the calendar: the two leagues
     need not be the same length. Never the very end, the Round 549 rule. */
  const total = fresh.calendar.length;
  const frac = career.calendar.length ? career.week / career.calendar.length : 0;
  const target = Math.max(1, Math.min(total - 3, Math.round(total * frac)));
  const s = playRunIn(fresh, target);
  const interim = interimManagerName(from, career.season, career.week);
  const reaction: PlayerMessage = {
    id: `msg-${career.season}-${s.week}-join783`,
    playerName: `The ${from} board`,
    from: `The ${from} board`,
    playerId: '',
    kind: 'jobApplication',
    text: leavingLine(from, club, 'now', interim),
    options: [],
    week: s.week,
    resolved: 'The door shut behind you.',
  };
  const managers = { ...(s.managers ?? {}) };
  delete managers[club];
  /* Your old club is in your new league: its dugout is the interim's now.
     Anywhere else it has left the record, which only ever describes the
     league you are in (Round 310). */
  if (s.leagueClubs.includes(from)) managers[from] = { name: interim, since: career.season };
  const managed = new Set(career.careerStats.clubsManaged ?? [from]);
  managed.add(club);
  const joined: CareerState = {
    ...s,
    sacked: false,
    approach: null,
    pendingMove: null,
    wilderness: null,
    live: undefined,
    teamTalk: null,
    pendingSummary: null,
    promisedStarts: [],
    /* A new appointment's mandate, the same opening the rollover gives a move. */
    boardConfidence: 62,
    season: career.season,
    /* Round 978: the new club's international block, played through the
       run-in in the fresh save's season one, carried onto this season's
       number so the breaks still to come are not lost with the move. The
       last break and any rest stay behind: their note was in the inbox
       this replaces, so nothing may ask a question nobody can answer. */
    ...(s.intl ? { intl: { season: career.season, fired: [...s.intl.fired] } } : {}),
    startYear: career.startYear,
    eraId: career.eraId,
    trophies: career.trophies,
    history: career.history,
    careerStats: { ...career.careerStats, clubsManaged: [...managed] },
    manager: career.manager,
    managerXp: career.managerXp,
    nationJob: career.nationJob,
    startOptions: career.startOptions,
    h2h: career.h2h,
    retiredNames: career.retiredNames,
    retiredLastSummer: career.retiredLastSummer,
    leagueOverrides: career.leagueOverrides,
    managers,
    inbox: [reaction],
    aiHeadlines: [
      `🧳 You have left ${from} for ${club} with the season still running. ${interim} takes charge at ${from} until the summer.`,
      ...s.aiHeadlines,
    ].slice(0, 8),
    jobHunt: closeOnJoiningNow(hunt, from, interim, career.season, s.week),
    /* Round 633's rule: what the manager before you had banked, frozen here
       so the season score reads only the games you pick a team for. */
    handover: handoverFrom(s),
  };
  /* The created club lived exactly as long as you managed it (Round 154). */
  delete joined.customClub;
  delete joined.customValues;
  delete joined.founderWageRoom;
  /* Round 1229: the run-in was played as a season one career, so its league book is stamped season 1.
     It is whole (every round of the new club's league so far is in it), so it takes this season's
     number here; left alone it would read as last season's from season two on and be dropped. */
  carryLeagueBook(s, joined);
  return joined;
}

/**
 * Round 633: the previous manager's season, as the score reads it.
 * `objectiveStatuses` grades against the board's targets, so an objective he
 * had already banked does not pay you a second time. The ticks are stamped
 * by ID rather than counted: a tick can come back off later (the youth
 * objective is recomputed from the current squad, and four of the five board
 * asks read the squad the same way), and the score subtracts only the stamped
 * ticks still on the card at the whistle, so a tick you inherited and then
 * lost is neither paid to you nor docked from you.
 */
function handoverFrom(s: CareerState) {
  const row = s.table.find(r => r.club === s.clubName);
  return {
    pts: row ? row.pts : 0,
    played: row ? row.w + row.d + row.l : 0,
    cupRank: cupProgressRank(s).rank,
    euroRank: uclProgressRank(s).rank,
    objectivesDone: objectiveStatuses(s).filter(o => o.status === 'done').map(o => o.objective.id),
    wonLeague: s.trophies.some(t => t.season === s.season && t.name === 'League Title'),
  };
}
