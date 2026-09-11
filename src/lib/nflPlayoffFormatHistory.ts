/**
 * Round 522: the NFL playoff format, season by season, as a reference page
 * that would be worth reading if NFL Front Office did not exist.
 *
 * The same pattern Round 520 built for the Champions League. The 2026-08-30
 * AdSense recovery addendum asks for "league format explainers" and "playoff
 * system explainers" plural, and the readiness verdict written after Round
 * 520 said not to request another review until more than one competition is
 * covered. This is the second.
 *
 * WHAT WAS VERIFIED. Every format change below was checked against Wikipedia
 * (the relevant season page, or the NFL playoffs overview page) against a
 * second, independent source: a search aggregation that itself surfaces the
 * Chicago Bears' own team site history piece and Sportscasting's explainer,
 * both agreeing with Wikipedia's numbers, on UCL_FORMAT_VERIFIED_ON below.
 * Two Pro Football Reference and two NFL.com fetches were attempted and
 * blocked (403 and 404), so neither appears as a source; nothing here rests
 * on a source that could not actually be read. Where a detail only had one
 * reading, it was left out: the exact date the AFL-NFL merger was agreed
 * (1966) versus when it took full competitive effect (1970) is well known,
 * but this file only claims the 1970 season, which is when the playoff field
 * this page describes actually changed.
 *
 * THE OVERTIME RULE'S OWN HISTORY HAD A SMALL DISCREPANCY, RECORDED RATHER
 * THAN HIDDEN. Wikipedia's NFL playoffs page and a second source (a football
 * rules history page cited below) agree that sudden death was adopted for
 * DIVISIONAL playoff tiebreakers in the early 1940s (one source says 1940,
 * the other 1941) and extended to the championship game in 1946, but that no
 * postseason game actually reached and was decided by it until the 1958
 * championship. This file states the adoption year as "the early 1940s"
 * rather than picking one source's exact year, and states 1958 as the first
 * postseason game actually decided by it, which is what both sources agree on
 * word for word.
 */

export const NFL_PLAYOFF_VERIFIED_ON = '2026-09-10';

export interface NflPlayoffSource {
  id: string;
  publisher: string;
  title: string;
  url: string;
}

export const NFL_PLAYOFF_SOURCES: NflPlayoffSource[] = [
  { id: 'wpoverview', publisher: 'Wikipedia', title: 'NFL playoffs', url: 'https://en.wikipedia.org/wiki/NFL_playoffs' },
  { id: 'wp1970', publisher: 'Wikipedia', title: '1970 NFL season', url: 'https://en.wikipedia.org/wiki/1970_NFL_season' },
  { id: 'wp1978', publisher: 'Wikipedia', title: '1978 NFL season', url: 'https://en.wikipedia.org/wiki/1978_NFL_season' },
  { id: 'wp1990', publisher: 'Wikipedia', title: '1990 NFL season', url: 'https://en.wikipedia.org/wiki/1990_NFL_season' },
  { id: 'wp2002', publisher: 'Wikipedia', title: '2002 NFL season', url: 'https://en.wikipedia.org/wiki/2002_NFL_season' },
  { id: 'wp2020', publisher: 'Wikipedia', title: '2020 NFL season', url: 'https://en.wikipedia.org/wiki/2020_NFL_season' },
  { id: 'bears', publisher: 'Chicago Bears', title: 'History of how NFL playoffs have expanded', url: 'https://www.chicagobears.com/news/history-of-how-nfl-playoffs-have-expanded' },
  { id: 'sportscasting', publisher: 'Sportscasting', title: 'Why Are There More Teams in the NFL Playoffs?', url: 'https://www.sportscasting.com/news/why-are-there-more-teams-in-the-nfl-playoffs/' },
  { id: 'wp1958', publisher: 'Wikipedia', title: '1958 NFL Championship Game', url: 'https://en.wikipedia.org/wiki/1958_NFL_Championship_Game' },
  { id: 'wpovertime', publisher: 'Wikipedia', title: 'Overtime (sports)', url: 'https://en.wikipedia.org/wiki/Overtime_(sports)' },
  { id: 'quirky', publisher: 'Quirky Research', title: 'When overtime wasn’t sudden death', url: 'https://www.quirkyresearch.com/football-lists/when-overtime-wasnt-sudden-death/' },
];

export type NflPlayoffFieldSize = 4 | 8 | 10 | 12 | 14;

export interface NflPlayoffPeriod {
  id: string;
  /** First season this shape was used, inclusive. */
  from: number;
  /** Last season, inclusive; null while it is current. */
  to: number | null;
  title: string;
  /** Total teams that qualify across both conferences (0 before conferences existed). */
  fieldSize: NflPlayoffFieldSize | 0;
  /** How the field breaks down, one sentence. */
  qualifying: string;
  notes: string[];
  /** Ids into NFL_PLAYOFF_SOURCES. At least two distinct publishers per period. */
  sources: string[];
}

export const NFL_PLAYOFF_PERIODS: NflPlayoffPeriod[] = [
  {
    id: 'championship-game',
    from: 1933,
    to: 1969,
    title: 'One title game, no bracket',
    fieldSize: 0,
    qualifying: 'The winner of each conference (later each division) met once, for the championship. No other postseason games existed.',
    notes: [
      'The NFL split into an Eastern and a Western conference in 1933 specifically to set up a title game between them, the first time the champion was decided on the field rather than by regular season record alone.',
      'The American Football League ran its own separate championship from 1960; the two leagues agreed to merge in 1966 and first played a combined championship game, the one later known as Super Bowl I, after the 1966 season, while remaining separate leagues through the 1969 season.',
    ],
    sources: ['wpoverview', 'bears'],
  },
  {
    id: 'merger-eight',
    from: 1970,
    to: 1977,
    title: 'The merger: eight teams',
    fieldSize: 8,
    qualifying: 'Three division winners plus one wild card (the best remaining record) in each of the AFC and the NFC.',
    notes: [
      'The 1970 season was the first after the AFL and NFL fully merged into one league of two conferences, and the first with a guaranteed multi-game bracket rather than a single title game.',
    ],
    sources: ['wp1970', 'wpoverview', 'bears'],
  },
  {
    id: 'ten-teams',
    from: 1978,
    to: 1989,
    title: 'A second wild card: ten teams',
    fieldSize: 10,
    qualifying: 'Three division winners plus two wild cards in each conference; the two wild cards play each other in a new wild card round before the round of eight.',
    notes: [
      'This season also grew the regular season from 14 games to 16, where it stayed until 2021.',
    ],
    sources: ['wp1978', 'bears', 'sportscasting'],
  },
  {
    id: 'twelve-teams',
    from: 1990,
    to: 2001,
    title: 'A third wild card: twelve teams',
    fieldSize: 12,
    qualifying: 'Three division winners plus three wild cards in each conference.',
    notes: [
      'Driven by complaints that a strong record was missing the playoffs under the ten team field: in four of the five seasons before this one, at least one 10-6 team stayed home.',
    ],
    sources: ['wp1990', 'bears', 'sportscasting'],
  },
  {
    id: 'realignment',
    from: 2002,
    to: 2019,
    title: 'Realigned to eight divisions, same twelve teams',
    fieldSize: 12,
    qualifying: 'Four division winners plus two wild cards in each conference, the same twelve team total under a new division map.',
    notes: [
      'The league expanded to 32 teams and regrouped from six divisions into eight, four per conference, four teams each. The playoff field size did not change, only how a division winner is decided.',
    ],
    sources: ['wp2002', 'wpoverview', 'bears'],
  },
  {
    id: 'fourteen-teams',
    from: 2020,
    to: null,
    title: 'A third wild card returns: fourteen teams',
    fieldSize: 14,
    qualifying: 'Four division winners plus three wild cards in each conference; only the top seed in each conference gets a first round bye.',
    notes: [
      'The last time the field grew (1990) every division winner got a bye; from this season only the #1 seed does, so three of the four winners play in the opening wild card round.',
    ],
    sources: ['wp2020', 'bears', 'sportscasting'],
  },
];

/** The postseason overtime rule's own small history, verified against two
 *  independent sources that agree on the shape and differ by one year on
 *  when the divisional rule was first adopted. */
export const NFL_OVERTIME = {
  /** The decade the divisional-round rule was adopted; sources give 1940 or
   *  1941, so this is deliberately not a single year. */
  divisionalRuleAdopted: 'the early 1940s',
  championshipRuleAdopted: 1946,
  firstDecidedBy: 1958,
  secondRuleChange: 2010,
  thirdRuleChange: 2022,
  text: 'Sudden death overtime, first score wins, was the rule for divisional playoff tiebreakers from the early 1940s and was extended to the championship game in 1946, but no postseason game actually reached overtime and was decided by it until 1958: the Baltimore Colts beat the New York Giants in the NFL Championship Game, still called the Greatest Game Ever Played, on a one yard touchdown run eight minutes and fifteen seconds into extra time. The pure sudden death rule held until 2010, when the NFL changed postseason overtime so a field goal alone on the first possession does not end the game, only a touchdown or a second score does; the regular season adopted the same rule in 2012. In 2022 the postseason rule changed again, to guarantee both teams at least one possession in overtime regardless of how the first one ends, unless it ends in a safety; the regular season adopted that rule in 2025.',
  sources: ['wpoverview', 'wp1958', 'wpovertime', 'quirky'],
};

export function sourceById(id: string): NflPlayoffSource | undefined {
  return NFL_PLAYOFF_SOURCES.find(s => s.id === id);
}

export function seasonRange(p: Pick<NflPlayoffPeriod, 'from' | 'to'>): string {
  if (p.to === null) return `${p.from} onward`;
  if (p.to === p.from) return `${p.from}`;
  return `${p.from} to ${p.to}`;
}

export function periodFor(year: number): NflPlayoffPeriod {
  return NFL_PLAYOFF_PERIODS.find(p => year >= p.from && (p.to === null || year <= p.to)) ?? NFL_PLAYOFF_PERIODS[NFL_PLAYOFF_PERIODS.length - 1];
}
