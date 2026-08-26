/**
 * Round 258: the real sports calendar behind the ticker.
 *
 * Owner ask, in his words: "For the ticker I want real life events going on."
 * Fair. The strip has always been about this site (fresh dailies, game counts,
 * your own save) and never about the sport the visitor actually came here for.
 *
 * THE THREE RULES THIS FILE LIVES BY, and they are the reason it is a repo
 * file rather than a database table. A table is invisible in a diff; here the
 * claim and the two sources that back it sit on the same lines, so nothing
 * can land without being checkable by anybody reading the commit.
 *
 *   1. NOTHING IS INVENTED. Every entry is a scheduled fact, checked against
 *      TWO INDEPENDENT sources before it went in, both recorded on the entry.
 *      No results, no predictions, no "who will win". Where the sources
 *      disagreed, the disputed part was dropped rather than picked: the
 *      Champions League draw is a good example, because UEFA's own draw page
 *      says Monaco and the club explainers say Nyon, so this file states the
 *      date the two agree on and says nothing about where.
 *   2. IT FAILS CLOSED AND IT FAILS QUIET. An event whose end date has passed
 *      is never shown, and when nothing is in the window the ticker simply
 *      says nothing about real sport. A stale calendar therefore goes silent
 *      rather than wrong, which is the only acceptable way for a hand kept
 *      file to age.
 *   3. IT NEVER REACHES A SNAPSHOT. Prerendered pages sit on disk for weeks,
 *      so "in nine days" written into one would be a lie by the time anybody
 *      read it. The ticker marks these lines data-no-prerender and the
 *      prerenderer strips them, which simPrerender then checks by looking for
 *      the titles below in the shipped files.
 *
 * KEEPING IT CURRENT: add entries when you ship, remove nothing (past ones
 * are already invisible and they are the record of what was checked).
 * scripts/simSportsCalendar.mjs enforces the shape, the two source rule, the
 * link targets and the honesty rules above.
 */

export interface SportsEvent {
  /** Stable id. Never reused, never renamed. */
  id: string;
  /** ISO date the event happens or starts, in YYYY-MM-DD. */
  start: string;
  /** ISO date it finishes. Equal to start for a single day event. */
  end: string;
  emoji: string;
  /**
   * What the strip says, with no date in it: the date is worked out from the
   * reader's own clock at render time, so this line can never go stale in a
   * different way from the one above. Statement of fact only.
   */
  title: string;
  /** A real route on this site, checked by the harness against App.tsx. */
  to: string;
  /** The two independent sources this entry was verified against. */
  sources: [string, string];
}

/* Checked 2026-08-21. Every date below was read off both listed sources and
   they agreed on it. */
export const SPORTS_EVENTS: SportsEvent[] = [
  {
    id: 'ucl-2627-league-phase-draw',
    start: '2026-08-27',
    end: '2026-08-27',
    emoji: '🏆',
    title: 'Champions League league phase draw',
    to: '/club-manager',
    sources: [
      'https://www.uefa.com/uefachampionsleague/news/02a6-20d57cfcd03e-407c22a7f465-1000--2026-27-champions-league-teams-dates-draws-format-final/',
      'https://www.mancity.com/news/mens/uefa-champions-league-2026-27-explainer-63919465',
    ],
  },
  {
    id: 'us-open-tennis-2026-main-draw',
    start: '2026-08-30',
    end: '2026-09-13',
    emoji: '🎾',
    title: 'US Open main draw at Flushing Meadows',
    to: '/guess-tennis-player',
    sources: [
      'https://www.tennismajors.com/us-open-news/us-open-2026-dates-schedule-full-calendar-858738.html',
      'https://www.nbcmiami.com/news/sports/tennis/us-open-2026-guide-how-to-watch-ticket-prices-full-schedule/3849030/',
    ],
  },
  {
    id: 'fiba-womens-world-cup-2026',
    start: '2026-09-04',
    end: '2026-09-13',
    emoji: '🏀',
    title: "FIBA Women's Basketball World Cup in Berlin",
    to: '/olympics',
    sources: [
      'https://en.wikipedia.org/wiki/2026_FIBA_Women%27s_Basketball_World_Cup',
      'https://www.eventim.de/campaign/en/fwbwc2026',
    ],
  },
  {
    id: 'f1-italian-gp-2026',
    start: '2026-09-06',
    end: '2026-09-06',
    emoji: '🏎️',
    title: 'Italian Grand Prix at Monza',
    to: '/perfect-lineup-f1',
    sources: [
      'https://www.formula1.com/en/racing/2026/italy',
      'https://www.monzanet.it/en/calendario-2026-formula-1-a-monza-dal-4-al-6-settembre/',
    ],
  },
  {
    id: 'ucl-2627-matchday-1',
    start: '2026-09-08',
    end: '2026-09-10',
    emoji: '⚽',
    title: 'Champions League league phase matchday 1',
    to: '/soccer-career',
    sources: [
      'https://www.uefa.com/uefachampionsleague/news/02a6-20d57cfcd03e-407c22a7f465-1000--2026-27-champions-league-teams-dates-draws-format-final/',
      'https://www.mancity.com/news/mens/uefa-champions-league-2026-27-explainer-63919465',
    ],
  },
  {
    id: 'nfl-2026-kickoff',
    start: '2026-09-09',
    end: '2026-09-09',
    emoji: '🏈',
    title: 'NFL season opener, New England at Seattle',
    to: '/nfl-my-career',
    sources: [
      'https://media.nfl.com/news-and-releases/2026-nfl-regular-season-to-kick-off-wednesday--sept--9-in-seattl',
      'https://en.wikipedia.org/wiki/2026_NFL_season',
    ],
  },
  {
    id: 'mlb-2026-wild-card',
    start: '2026-09-29',
    end: '2026-10-01',
    emoji: '⚾',
    title: 'MLB Wild Card Series',
    to: '/mlb-my-career',
    sources: [
      'https://www.mlb.com/news/2026-mlb-playoff-and-world-series-schedule',
      'https://www.cbssports.com/mlb/news/2026-mlb-playoff-schedule-bracket/',
    ],
  },
  {
    id: 'mlb-2026-world-series-g1',
    start: '2026-10-23',
    end: '2026-10-23',
    emoji: '⚾',
    title: 'World Series Game 1',
    to: '/champ-or-not',
    sources: [
      'https://www.mlb.com/news/2026-mlb-playoff-and-world-series-schedule',
      'https://www.cbssports.com/mlb/news/2026-mlb-playoff-schedule-bracket/',
    ],
  },
];

/** Local calendar date as YYYY-MM-DD, in the reader's own timezone. */
function todayKey(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Whole days from today to an ISO date, both read as local calendar days. */
function daysUntil(iso: string, now: Date): number {
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86400000);
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * The phrase the strip uses for when. Worked out from the reader's own clock,
 * so it is right in every timezone without this file claiming to know one.
 * Deliberately says nothing about a time of day, because the calendar holds
 * dates and only dates: "tonight" would be a detail nobody checked.
 */
export function whenPhrase(ev: SportsEvent, now: Date): string {
  const toStart = daysUntil(ev.start, now);
  const toEnd = daysUntil(ev.end, now);
  if (toStart <= 0 && toEnd >= 0) return toStart === 0 ? 'today' : 'on now';
  if (toStart === 1) return 'tomorrow';
  /* A weekday name only inside five days. At six or seven it stops being
     helpful: "Thursday" said on a Friday could be either Thursday, and the
     reader has to do arithmetic to find out which. A count never can be. */
  if (toStart <= 5) {
    const [y, m, d] = ev.start.split('-').map(Number);
    return WEEKDAYS[new Date(y, m - 1, d).getDay()];
  }
  return `in ${toStart} days`;
}

/**
 * Events worth putting in front of somebody right now: running, or starting
 * within `horizon` days. Sorted soonest first. Returns an empty list when the
 * calendar has run dry, which is the whole point: silence beats a stale date.
 */
export function upcomingEvents(now: Date, horizon = 21, limit = 3): SportsEvent[] {
  const today = todayKey(now);
  return SPORTS_EVENTS
    .filter(ev => ev.end >= today && daysUntil(ev.start, now) <= horizon)
    .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0))
    .slice(0, limit);
}
