/**
 * Round 533: the MLB postseason format, season by season, as a reference page
 * that would be worth reading if MLB Front Office did not exist.
 *
 * The fourth reference explainer, same pattern as Round 520 (Champions League),
 * Round 522 (NFL playoffs) and Round 532 (NBA playoffs). The 2026-08-30 AdSense
 * recovery addendum asks for league and playoff format explainers plural, and
 * the readiness verdict after Round 520 said not to request another review
 * until more than one competition is covered. Baseball is the fourth.
 *
 * WHAT WAS VERIFIED. Every format change below was checked against Wikipedia
 * (the postseason overview, the World Series page, the wild card page, the
 * League Championship Series page, and the 1981 and 2022 season pages) and
 * against at least one independent publisher that could actually be read on
 * MLB_POSTSEASON_VERIFIED_ON: Baseball Almanac's year by year postseason
 * charts and its World Series index, MLB.com's own postseason format FAQ,
 * ESPN's wild card explainer, and CBS Sports' report of the 2020 agreement.
 *
 * WHAT COULD NOT BE READ, AND SO IS NOT CITED. Seven fetches were blocked or
 * came back as something other than the page asked for: four MLB.com pages
 * (the postseason format glossary entry, the wild card and Division Series
 * history pages, and the "complete history of postseason formats" article, all
 * 406), Baseball Reference's postseason index (403), the Hall of Fame's World
 * Series history page (404), and one ESPN explainer that answered with the
 * news hub rather than the article. None of them appears below. Nothing here
 * rests on a source that was not actually read.
 *
 * WHAT WAS LEFT OUT FOR HAVING ONE READING. Three details were seen in one
 * publisher only and are deliberately absent: the length of the extra 1981
 * strike round (Wikipedia says best of five; Baseball Almanac confirms the
 * round existed but the reading did not give its length, so the note below
 * says "an extra round" and no more); the 1995 to 2011 rule that a wild card
 * could not meet its own division winner in the Division Series (ESPN only);
 * and the count of twelve clubs per league in 1969 (Wikipedia only, so the
 * period says "split into East and West divisions" and nothing about club
 * counts).
 *
 * THE TWO UNPLAYED YEARS. 1904 (the Giants refused to play the American
 * League champion) and 1994 (the players' strike cancelled the postseason)
 * are recorded here as facts inside the period they fall in, and the Record
 * Books' World Series table (src/lib/records.ts) leaves the same two rows
 * out on purpose. The two must stay consistent; the harness holds this file
 * to naming both years.
 */

export const MLB_POSTSEASON_VERIFIED_ON = '2026-09-11';

export interface MlbPostseasonSource {
  id: string;
  publisher: string;
  title: string;
  url: string;
}

export const MLB_POSTSEASON_SOURCES: MlbPostseasonSource[] = [
  { id: 'wpost', publisher: 'Wikipedia', title: 'Major League Baseball postseason', url: 'https://en.wikipedia.org/wiki/Major_League_Baseball_postseason' },
  { id: 'wpws', publisher: 'Wikipedia', title: 'World Series', url: 'https://en.wikipedia.org/wiki/World_Series' },
  { id: 'wpwc', publisher: 'Wikipedia', title: 'Major League Baseball wild card', url: 'https://en.wikipedia.org/wiki/Major_League_Baseball_wild_card' },
  { id: 'wplcs', publisher: 'Wikipedia', title: 'League Championship Series', url: 'https://en.wikipedia.org/wiki/League_Championship_Series' },
  { id: 'wp1981', publisher: 'Wikipedia', title: '1981 Major League Baseball season', url: 'https://en.wikipedia.org/wiki/1981_Major_League_Baseball_season' },
  { id: 'wp2022', publisher: 'Wikipedia', title: '2022 Major League Baseball postseason', url: 'https://en.wikipedia.org/wiki/2022_Major_League_Baseball_postseason' },
  { id: 'almanacpost', publisher: 'Baseball Almanac', title: 'MLB Postseason Playoffs 1969 to 2025', url: 'https://www.baseball-almanac.com/ws/postseason.shtml' },
  { id: 'almanacws', publisher: 'Baseball Almanac', title: 'World Series history, year by year', url: 'https://www.baseball-almanac.com/ws/wsmenu.shtml' },
  { id: 'mlbfaq', publisher: 'MLB.com', title: "MLB's postseason format, explained", url: 'https://www.mlb.com/news/mlb-playoff-format-faq' },
  { id: 'espnwc', publisher: 'ESPN', title: 'How does MLB wild card work? Format, history, stats', url: 'https://www.espn.com/mlb/story/_/id/46358337/mlb-wild-card-format-history-records-facts-stats' },
  { id: 'cbs2020', publisher: 'CBS Sports', title: 'MLB expands playoffs to 16 teams for shortened 2020 season, adds best-of-three Wild Card Series', url: 'https://www.cbssports.com/mlb/news/mlb-expands-playoffs-to-16-teams-for-shortened-2020-season-adds-best-of-three-wild-card-series/' },
];

export type MlbPostseasonFieldSize = 2 | 4 | 8 | 10 | 12 | 16;

export interface MlbPostseasonPeriod {
  id: string;
  /** First season this shape was used, inclusive. */
  from: number;
  /** Last season, inclusive; null while it is current. */
  to: number | null;
  title: string;
  /** Total clubs that qualify across both leagues. */
  fieldSize: MlbPostseasonFieldSize;
  /** How the field breaks down and what rounds it plays, one or two sentences. */
  qualifying: string;
  notes: string[];
  /** Ids into MLB_POSTSEASON_SOURCES. At least two distinct publishers per period. */
  sources: string[];
}

/** The two seasons with a pennant race and no World Series. Both must be
 *  named in the notes of the period they fall in, and the Record Books'
 *  World Series table leaves the same two rows empty. */
export const MLB_UNPLAYED_SEASONS = [1904, 1994];

export const MLB_POSTSEASON_PERIODS: MlbPostseasonPeriod[] = [
  {
    id: 'world-series-only',
    from: 1903,
    to: 1968,
    title: 'Two pennant winners, one series',
    fieldSize: 2,
    qualifying: 'The American League pennant winner met the National League pennant winner in the World Series, and that was the whole postseason. Each pennant went to the club that finished first in its league over the regular season.',
    notes: [
      'The first modern World Series in 1903 was best of nine, and Boston beat Pittsburgh five games to three. It was best of nine again in 1919, 1920 and 1921, and best of seven in every other year it was played.',
      'There was no series in 1904. The National League champion New York Giants, under owner John T. Brush, refused to play the American League champion, which the Giants regarded as an inferior league. From 1905 the series was played every year until 1994.',
    ],
    sources: ['wpws', 'wpost', 'almanacws'],
  },
  {
    id: 'lcs-five',
    from: 1969,
    to: 1984,
    title: 'Divisions, and a series for the pennant',
    fieldSize: 4,
    qualifying: 'Each league split into an East and a West division. The two division winners in each league met in a best of five League Championship Series for the pennant, and the two pennant winners went to the World Series as before.',
    notes: [
      'For the first time a club could finish with the best record in its league and not reach the World Series, because the pennant was now decided by a short series rather than by the standings.',
      'The 1981 season was the odd one out. A midseason strike split the year in half, and the winners of each half in each division met in an extra round before the League Championship Series, so eight clubs played that October instead of four. The shape went back to four clubs in 1982.',
    ],
    sources: ['wplcs', 'wpost', 'almanacpost', 'wp1981'],
  },
  {
    id: 'lcs-seven',
    from: 1985,
    to: 1993,
    title: 'The LCS goes to best of seven',
    fieldSize: 4,
    qualifying: 'The same four clubs, two division winners per league, but the League Championship Series was lengthened from best of five to best of seven, the same length as the World Series.',
    notes: [
      'The two extra possible games were the whole change: no new round, no new qualifiers. A pennant now took four wins rather than three.',
    ],
    sources: ['wplcs', 'wpost', 'almanacpost'],
  },
  {
    id: 'wild-card-eight',
    from: 1994,
    to: 2011,
    title: 'Three divisions and a wild card',
    fieldSize: 8,
    qualifying: 'Each league realigned into East, Central and West divisions. The three division winners and one wild card, the best record among the clubs that did not win a division, gave four clubs per league. A new best of five Division Series came before the League Championship Series.',
    notes: [
      'The format was adopted for 1994, but the players\' strike that August cancelled that year\'s entire postseason, including the World Series, so it was first played on the field in 1995. 1994 is the second year since 1903 with no series, after 1904.',
      'The wild card was the first route into October for a club that had not won anything during the regular season, and it changed what a September pennant race looked like for the clubs sitting second.',
    ],
    sources: ['wpwc', 'wpost', 'espnwc', 'almanacpost'],
  },
  {
    id: 'wild-card-game',
    from: 2012,
    to: 2019,
    title: 'A second wild card and a one game playoff',
    fieldSize: 10,
    qualifying: 'A second wild card in each league, and the two wild cards met in a single Wild Card Game after the regular season. The winner went on to face the top seed in the best of five Division Series; the three division winners waited for that round.',
    notes: [
      'The single game was the point of it: winning a division now meant skipping a one game playoff, where under the old format a wild card with a strong record was in exactly the same place as a division winner.',
    ],
    sources: ['wpwc', 'wpost', 'espnwc', 'mlbfaq', 'almanacpost'],
  },
  {
    id: 'sixteen-2020',
    from: 2020,
    to: 2020,
    title: 'Sixteen clubs, one season only',
    fieldSize: 16,
    qualifying: 'The shortened pandemic season sent eight clubs per league to October: the three division winners, the three second place clubs, and the two best remaining records. There were no byes. Every club started in a best of three Wild Card Series, with all three games at the higher seed\'s park, before the usual Division Series.',
    notes: [
      'Agreed between the league and the players on July 23, 2020, with the shortened season about to start, and never used again. It is the only time more than twelve clubs have played in an MLB postseason.',
    ],
    sources: ['wpwc', 'wpost', 'espnwc', 'cbs2020'],
  },
  {
    id: 'wild-card-game-return',
    from: 2021,
    to: 2021,
    title: 'Back to ten and the Wild Card Game',
    fieldSize: 10,
    qualifying: 'The 2012 shape returned for one more season: three division winners and two wild cards per league, with the two wild cards playing a single game for a place in the Division Series.',
    notes: [
      'This was the last single game playoff in the format. The twelve club bracket that followed in 2022 replaced it with a short series.',
    ],
    sources: ['wpost', 'mlbfaq'],
  },
  {
    id: 'twelve-teams',
    from: 2022,
    to: null,
    title: 'Twelve clubs, byes for the top two',
    fieldSize: 12,
    qualifying: 'Six clubs per league: three division winners seeded 1 to 3 by record, and three wild cards seeded 4 to 6. The top two division winners skip straight to the Division Series. Seeds 3 to 6 play best of three Wild Card Series, 3 against 6 and 4 against 5, every game hosted by the higher seed. There is no reseeding: the 1 seed meets the winner of 4 against 5 and the 2 seed meets the winner of 3 against 6. Then best of five Division Series, best of seven League Championship Series and a best of seven World Series.',
    notes: [
      'A third wild card in each league, so the bracket has twelve clubs rather than ten, and the Wild Card Game became a short series for the first time outside 2020.',
      'The third division winner does not get a bye. Winning a weak division puts a club into the Wild Card Series as the 3 seed, at home, rather than into the Division Series.',
    ],
    sources: ['wpwc', 'wp2022', 'mlbfaq', 'espnwc'],
  },
];

/** The lengths of the rounds, and the two years with no series at all,
 *  verified against Wikipedia and Baseball Almanac, which agree word for
 *  word on every year named here. */
export const MLB_SERIES_LENGTHS = {
  bestOfNineYears: [1903, 1919, 1920, 1921],
  unplayed: MLB_UNPLAYED_SEASONS,
  lcsBestOfFive: { from: 1969, to: 1984 },
  lcsBestOfSevenFrom: 1985,
  divisionSeriesPermanentFrom: 1995,
  text: 'The World Series has been best of seven in every year it was played except four: 1903, 1919, 1920 and 1921 were best of nine, so the winner needed five games rather than four. Boston won the first one five games to three. Two years since 1903 had no series at all. In 1904 the Giants refused to play the American League champion, and the series has been played every year since 1905 with one exception. In 1994 the players\' strike cancelled the postseason outright, the first October without a World Series in ninety years. The League Championship Series was best of five from its first year in 1969 through 1984 and has been best of seven since 1985. The Division Series has been best of five since it became a permanent round in 1995; the one off 1981 round is described above. The Wild Card Series introduced for good in 2022 is best of three, played entirely at the higher seed\'s park.',
  sources: ['wpws', 'wpost', 'almanacws', 'wplcs', 'almanacpost'],
};

export function sourceById(id: string): MlbPostseasonSource | undefined {
  return MLB_POSTSEASON_SOURCES.find(s => s.id === id);
}

export function seasonRange(p: Pick<MlbPostseasonPeriod, 'from' | 'to'>): string {
  if (p.to === null) return `${p.from} onward`;
  if (p.to === p.from) return `${p.from}`;
  return `${p.from} to ${p.to}`;
}

export function periodFor(year: number): MlbPostseasonPeriod {
  return MLB_POSTSEASON_PERIODS.find(p => year >= p.from && (p.to === null || year <= p.to)) ?? MLB_POSTSEASON_PERIODS[MLB_POSTSEASON_PERIODS.length - 1];
}
