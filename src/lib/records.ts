import { supabase } from '@/integrations/supabase/client';

/**
 * The Record Books (/records, Round 238): the audited champion tables as
 * a readable reference. Rounds 232 to 236 verified every one of these
 * season by season (two sources each, wrong scrapes rebuilt, shifted
 * columns repaired, stripped titles honestly vacant), so the site can
 * stand behind a public year-by-year page. Columns are shown only where
 * the data behind them is verified and reasonably filled; a blank cell
 * means the record was never scraped, never that we guessed.
 *
 * simRecords.mjs fences the page contract; simListQuizSources.mjs and
 * simChampOrNot.mjs fence the tables themselves.
 */

export interface RecordRow {
  year: number;
  champion: string;
  /** extra cells, keyed by column key below; missing keys render blank */
  extra: Record<string, string>;
}

/** Round 649: the words a section's own page (/records/<slug>) is built from.
 *  Wording only. Every number on that page is counted from recordBooks.json. */
export interface RecordWords {
  /** the plural a searcher types, in mid sentence casing: "Super Bowl winners" */
  many: string;
  /** the singular: "Super Bowl winner" */
  one: string;
  /** the leaders heading: "Most Super Bowl titles" */
  most: string;
  /** what one row counts as, singular and plural */
  unit: [string, string];
  /** who wins it, singular and plural */
  who: [string, string];
  /** the search result title from the first season the rows cover, under 60 characters with the brand
   *  on the end. Round 649 review: a title may not claim more than the rows hold, so it names the span. */
  seoTitle: (first: number) => string;
  /** the meta description around the span the rows cover, 120 to 160 characters once filled */
  seoDescription: (first: number, latest: number) => string;
}

/** Round 649: the format explainers, one list shared by /records and the section pages. */
export interface FormatPage {
  path: string;
  label: string;
  /** the line that follows the link */
  blurb: string;
}

export const FORMAT_PAGES: FormatPage[] = [
  { path: '/champions-league-format-history', label: 'Champions League format history', blurb: 'every shape the European Cup and the Champions League have taken since 1955, season by season, each checked against two sources.' },
  { path: '/nfl-playoff-format-history', label: 'NFL playoff format history', blurb: 'how the field, seeding and overtime rules changed.' },
  { path: '/nba-playoff-format-history', label: 'NBA playoff format history', blurb: 'the playoff bracket, play-in and draft lottery through the years.' },
  { path: '/mlb-postseason-format-history', label: 'MLB postseason format history', blurb: 'the changing postseason field, series lengths and years without a World Series.' },
  { path: '/nhl-playoff-format-history', label: 'NHL playoff format history', blurb: 'the playoff bracket through the years, including seasons that broke the pattern.' },
];

/** Round 649: the sourcing paragraph, shared by /records and every section page. */
export const RECORD_SOURCING =
  'Each table was verified against at least two independent sources, and the checks run on every build: winner lists are audited answer by answer, split titles and vacated seasons are pinned so they can never quietly change, and a blank cell means the detail was never verified rather than papered over. Spot something that looks wrong anyway? The Report a bug button below lands straight in our inbox.';

export interface RecordSection {
  key: string;
  /** Round 649: the section's own page lives at /records/<slug>. This is the one
   *  source: scripts/genSitemap.mjs reads the slugs from here, while App.tsx and
   *  src/lib/pageSchema.ts carry literal copies (their harnesses parse literals),
   *  and scripts/simRecordPages.mjs fails if either copy disagrees. */
  slug: string;
  words: RecordWords;
  /** Round 649: the format explainer for this sport, when one exists */
  format?: { path: string; heading: string };
  emoji: string;
  title: string;
  /** one short factual paragraph under the heading. Round 649 review: no counts in
   *  here (who won how many is computed from the rows on the page), and a "since"
   *  year must be the first year the rows hold; simRecordPages check 10 fails on both. */
  blurb: string;
  /** label of the first column (Year or Season) */
  yearLabel: string;
  /** label of the second column; Champion unless the table is of people (Round 291: Medallist) */
  championLabel?: string;
  /** extra columns after Champion, in order: [key, label] */
  columns: [string, string][];
  /** honest footnote rendered under the table, when the history needs one; the same
   *  no counts rule as the blurb applies */
  note?: string;
  /** routes of games that play on this history */
  play: { path: string; label: string }[];
  fetch: () => Promise<RecordRow[]>;
}

async function rows(
  table: string,
  yearCol: string,
  champCol: string,
  extraCols: Record<string, string>,
  filter?: (q: unknown) => unknown,
): Promise<RecordRow[]> {
  const cols = [yearCol, champCol, ...Object.values(extraCols)].join(', ');
  let q: unknown = supabase.from(table as never).select(cols);
  if (filter) q = filter(q);
  const { data, error } = await (q as { limit: (n: number) => PromiseLike<{ data: unknown; error: unknown }> }).limit(5000);
  if (error || !Array.isArray(data)) throw new Error(`${table} unavailable`);
  const out: RecordRow[] = [];
  for (const r of data as Record<string, unknown>[]) {
    const year = r[yearCol];
    const champion = r[champCol];
    if (typeof year !== 'number' || typeof champion !== 'string' || !champion.trim()) continue;
    const extra: Record<string, string> = {};
    for (const [key, col] of Object.entries(extraCols)) {
      const v = r[col];
      if (typeof v === 'string' && v.trim()) extra[key] = v.trim();
      else if (typeof v === 'number' && Number.isFinite(v)) extra[key] = String(v);
    }
    out.push({ year, champion, extra });
  }
  out.sort((a, b) => b.year - a.year || a.champion.localeCompare(b.champion));
  return out;
}

export const RECORD_SECTIONS: RecordSection[] = [
  {
    key: 'sb', emoji: '🏈', title: 'Super Bowl Champions',
    slug: 'super-bowl-winners',
    words: {
      many: 'Super Bowl winners', one: 'Super Bowl winner', most: 'Most Super Bowl titles',
      unit: ['title', 'titles'], who: ['team', 'teams'],
      seoTitle: f => `Super Bowl Winners by Year Since ${f} | DoUKnowBall`,
      seoDescription: (f, l) => `Every Super Bowl winner from ${f} to ${l}, with the runner-up, final score, MVP, stadium and host city, plus the most titles over those years.`,
    },
    format: { path: '/nfl-playoff-format-history', heading: 'How the NFL playoffs work' },
    blurb: 'Every Super Bowl by the year it was played, with the final score, the MVP, the stadium as it was named that day and the host city as it was that day too: Miami until the Gardens incorporated, Stanford for XIX, Las Vegas for LVIII.',
    yearLabel: 'Year',
    columns: [['runnerUp', 'Runner-up'], ['score', 'Score'], ['mvp', 'MVP'], ['venue', 'Venue'], ['city', 'City']],
    play: [
      { path: '/champ-or-not', label: 'Champ or Not' },
      { path: '/whod-they-beat', label: "Who'd They Beat?" },
      { path: '/list-quiz', label: 'Name Them All' },
    ],
    fetch: async () => {
      const base = await rows('super_bowls', 'year', 'winner', { runnerUp: 'loser', mvp: 'mvp', venue: 'venue', city: 'city', st: 'state', ws: 'winner_score', ls: 'loser_score' });
      return base.map(r => {
        const { ws, ls, city, st, ...rest } = r.extra;
        const extra: Record<string, string> = { ...rest };
        if (ws && ls) extra.score = `${ws}-${ls}`;
        /* city and state ship as separate verified columns and join here,
           so Glendale reads as Glendale, AZ and nobody pictures the
           wrong one */
        if (city && st) extra.city = `${city}, ${st}`;
        return { ...r, extra };
      });
    },
  },
  {
    key: 'nba', emoji: '🏀', title: 'NBA Champions',
    slug: 'nba-champions',
    words: {
      many: 'NBA champions', one: 'NBA champion', most: 'Most NBA titles',
      unit: ['title', 'titles'], who: ['team', 'teams'],
      seoTitle: f => `NBA Champions by Year Since ${f} | DoUKnowBall`,
      seoDescription: (f, l) => `Every NBA champion from ${f} to ${l}, the BAA years included, with the beaten finalist, the series score and the Finals MVP, plus the most titles in that span.`,
    },
    format: { path: '/nba-playoff-format-history', heading: 'How the NBA playoffs work' },
    blurb: 'Every Finals back to the 1947 BAA with the beaten finalist, the series winner first, and every Finals MVP since the award began in 1969.',
    yearLabel: 'Year',
    columns: [['runnerUp', 'Runner-up'], ['series', 'Series'], ['mvp', 'Finals MVP']],
    play: [
      { path: '/champ-or-not', label: 'Champ or Not' },
      { path: '/whod-they-beat', label: "Who'd They Beat?" },
      { path: '/list-quiz', label: 'Name Them All' },
    ],
    fetch: () => rows('nba_finals', 'year', 'winner', { runnerUp: 'loser', series: 'series_result', mvp: 'finals_mvp' }),
  },
  {
    key: 'ws', emoji: '⚾', title: 'World Series Champions',
    slug: 'world-series-winners',
    words: {
      many: 'World Series winners', one: 'World Series winner', most: 'Most World Series titles',
      unit: ['title', 'titles'], who: ['team', 'teams'],
      seoTitle: f => `World Series Winners by Year Since ${f} | DoUKnowBall`,
      seoDescription: (f, l) => `Every World Series winner from ${f} to ${l}, with the beaten pennant winner and the series score, plus the teams with the most titles in that span.`,
    },
    format: { path: '/mlb-postseason-format-history', heading: 'How the MLB postseason works' },
    blurb: 'Every World Series since 1903 with the beaten pennant winner. There was no series in 1904 or 1994, and the early best-of-nine years read as they were played.',
    yearLabel: 'Year',
    columns: [['runnerUp', 'Runner-up'], ['series', 'Series']],
    play: [
      { path: '/champ-or-not', label: 'Champ or Not' },
      { path: '/whod-they-beat', label: "Who'd They Beat?" },
      { path: '/list-quiz', label: 'Name Them All' },
    ],
    fetch: () => rows('world_series_v2', 'year', 'winner', { runnerUp: 'loser', series: 'series_result' }),
  },
  {
    key: 'cup', emoji: '🏒', title: 'Stanley Cup Champions',
    slug: 'stanley-cup-winners',
    words: {
      many: 'Stanley Cup winners', one: 'Stanley Cup winner', most: 'Most Stanley Cup wins',
      unit: ['Cup', 'Cups'], who: ['team', 'teams'],
      seoTitle: f => `Stanley Cup Winners by Year Since ${f} | DoUKnowBall`,
      seoDescription: (f, l) => `Every Stanley Cup winner from ${f} to ${l}, with the beaten finalist and the series score, plus the teams that lifted the Cup most often in that span.`,
    },
    format: { path: '/nhl-playoff-format-history', heading: 'How the NHL playoffs work' },
    blurb: 'Cup winners since 1915 with the beaten finalist, PCHA and WCHL challengers included. The 1919 final was abandoned for the flu pandemic and 2005 was lost to the lockout, so neither year appears.',
    yearLabel: 'Year',
    columns: [['runnerUp', 'Runner-up'], ['series', 'Series']],
    play: [
      { path: '/champ-or-not', label: 'Champ or Not' },
      { path: '/whod-they-beat', label: "Who'd They Beat?" },
      { path: '/list-quiz', label: 'Name Them All' },
    ],
    fetch: () => rows('stanley_cup_finals_v2', 'year', 'winner', { runnerUp: 'loser', series: 'series_result' }),
  },
  {
    key: 'wnba', emoji: '🏀', title: 'WNBA Champions',
    slug: 'wnba-champions',
    words: {
      many: 'WNBA champions', one: 'WNBA champion', most: 'Most WNBA titles',
      unit: ['title', 'titles'], who: ['team', 'teams'],
      seoTitle: f => `WNBA Champions by Year Since ${f} | DoUKnowBall`,
      seoDescription: (f, l) => `Every WNBA champion from ${f} to ${l}, with the beaten finalist, the series score and the Finals MVP, plus the most titles in that span.`,
    },
    blurb: 'Every WNBA Finals since the league began in 1997, with the beaten finalist and every Finals MVP from Cynthia Cooper on.',
    yearLabel: 'Year',
    columns: [['runnerUp', 'Runner-up'], ['series', 'Series'], ['mvp', 'Finals MVP']],
    play: [
      { path: '/champ-or-not', label: 'Champ or Not' },
      { path: '/whod-they-beat', label: "Who'd They Beat?" },
      { path: '/list-quiz', label: 'Name Them All' },
    ],
    fetch: () => rows('wnba_finals', 'year', 'winner', { runnerUp: 'loser', series: 'series_result', mvp: 'finals_mvp' }),
  },
  {
    key: 'cfb', emoji: '🏈', title: 'College Football National Champions',
    slug: 'college-football-national-champions',
    words: {
      many: 'college football national champions', one: 'college football national champion', most: 'Most college football national titles',
      unit: ['title', 'titles'], who: ['school', 'schools'],
      seoTitle: f => `College Football Champions by Year Since ${f} | DoUKnowBall`,
      seoDescription: (f, l) => `Every college football national champion from ${f} to ${l}, split titles included, with the selector, the result and the coach, plus the most titles since.`,
    },
    blurb: 'National champions by season since 1981. Years where the polls split carry a row per selector, because both titles are real.',
    yearLabel: 'Season',
    columns: [['selector', 'Selector'], ['record', 'Result'], ['coach', 'Coach']],
    play: [
      { path: '/college-grid', label: 'College Grid' },
      { path: '/champ-or-not', label: 'Champ or Not' },
      { path: '/list-quiz', label: 'Name Them All' },
    ],
    fetch: () => rows('cfb_national_champions', 'year', 'champion', { selector: 'selector', record: 'record', coach: 'coach' }),
  },
  {
    key: 'cbb', emoji: '🏀', title: "Men's NCAA Basketball Champions",
    slug: 'ncaa-basketball-champions',
    words: {
      many: "men's NCAA basketball champions", one: "men's NCAA basketball champion", most: "Most men's NCAA basketball titles",
      unit: ['title', 'titles'], who: ['school', 'schools'],
      seoTitle: f => `Men's NCAA Basketball Champions Since ${f} | DoUKnowBall`,
      seoDescription: (f, l) => `Every men's NCAA basketball champion from ${f} to ${l}, with the beaten finalist and the final score, plus the schools with the most titles in that span.`,
    },
    blurb: "Every men's national title game since 1939 with the beaten finalist and the final score. The 2020 tournament was cancelled, so no year is missing by accident.",
    yearLabel: 'Year',
    columns: [['runnerUp', 'Runner-up'], ['score', 'Score']],
    play: [
      { path: '/champ-or-not', label: 'Champ or Not' },
      { path: '/list-quiz', label: 'Name Them All' },
    ],
    fetch: () => rows('ncaa_basketball_champions', 'year', 'champion', { runnerUp: 'runner_up', score: 'score' },
      q => (q as { eq: (c: string, v: string) => unknown }).eq('division', "Men's D1")),
  },
  {
    key: 'epl', emoji: '⚽', title: 'English Champions',
    slug: 'english-football-champions',
    words: {
      many: 'English football champions', one: 'English football champion', most: 'Most English league titles',
      unit: ['title', 'titles'], who: ['club', 'clubs'],
      seoTitle: f => `English Football Champions by Year Since ${f} | DoUKnowBall`,
      seoDescription: (f, l) => `Every champion of the English top flight from ${f} to ${l}, decade by decade, plus the clubs with the most league titles across those seasons.`,
    },
    format: { path: '/champions-league-format-history', heading: 'How the Champions League works' },
    blurb: 'Champions of the English top flight, by the year the season finished.',
    yearLabel: 'Year',
    columns: [],
    play: [
      { path: '/champ-or-not', label: 'Champ or Not' },
      { path: '/list-quiz', label: 'Name Them All' },
    ],
    fetch: () => rows('soccer_league_champions', 'year', 'champion', {},
      q => (q as { ilike: (c: string, v: string) => unknown }).ilike('league', '%premier%')),
  },
  {
    key: 'afl', emoji: '🏉', title: 'VFL/AFL Premiers',
    slug: 'afl-premiers',
    words: {
      many: 'VFL/AFL premiers', one: 'VFL/AFL premier', most: 'Most VFL/AFL premierships',
      unit: ['premiership', 'premierships'], who: ['club', 'clubs'],
      seoTitle: f => `AFL and VFL Premiers by Year Since ${f} | DoUKnowBall`,
      seoDescription: (f, l) => `Every VFL and AFL premier from ${f} to ${l}, listed decade by decade, plus the clubs with the most premierships across those seasons.`,
    },
    blurb: 'Every VFL and AFL premiership since 1897.',
    yearLabel: 'Year',
    columns: [],
    play: [
      { path: '/afl-higher-lower', label: 'AFL Higher or Lower' },
      { path: '/champ-or-not', label: 'Champ or Not' },
      { path: '/list-quiz', label: 'Name Them All' },
    ],
    fetch: () => rows('afl_premiers', 'year', 'premier', {}),
  },
  {
    key: 'brownlow', emoji: '🏅', title: 'Brownlow Medallists',
    slug: 'brownlow-medal-winners',
    words: {
      many: 'Brownlow Medal winners', one: 'Brownlow Medal winner', most: 'Most Brownlow Medals',
      unit: ['medal', 'medals'], who: ['player', 'players'],
      seoTitle: f => `Brownlow Medal Winners by Year Since ${f} | DoUKnowBall`,
      seoDescription: (f, l) => `Every Brownlow Medal winner from ${f} to ${l} with the club and the votes, tied counts included, plus the players who won it more than once in that span.`,
    },
    blurb: "The VFL/AFL's fairest and best, as voted by the field umpires, every year since 1924. No medal was awarded from 1942 to 1945.",
    yearLabel: 'Year',
    championLabel: 'Medallist',
    columns: [['club', 'Club'], ['votes', 'Votes']],
    note: 'Where a count ended level, every medallist from that year is listed, including the 1930 count settled retrospectively in 1989 and the 2012 medal reallocated in 2016. Older club names appear where the table has them: Footscray, South Melbourne, the Brisbane Bears of 1996.',
    play: [
      { path: '/list-quiz', label: 'Name Them All' },
      { path: '/champ-or-not', label: 'Champ or Not' },
      { path: '/afl-higher-lower', label: 'AFL Higher or Lower' },
    ],
    /* afl_brownlow: built Round 291. 112 medals, 91 players, 1924 to 2025, two-source
       verified 2026-08-25 against afl.com.au/brownlow-medal/history and afltables.com
       (whose index had two vote counts wrong, 1935 and 1958, settled by its own detail
       pages). simListQuizSources ratchets the table at exactly 112 rows. */
    fetch: () => rows('afl_brownlow', 'year', 'winner', { club: 'club', votes: 'votes' }),
  },
  {
    key: 'dallym', emoji: '🏉', title: 'Dally M Medallists',
    slug: 'dally-m-medal-winners',
    words: {
      many: 'Dally M Medal winners', one: 'Dally M Medal winner', most: 'Most Dally M Medals',
      unit: ['medal', 'medals'], who: ['player', 'players'],
      seoTitle: f => `Dally M Medal Winners by Year Since ${f} | DoUKnowBall`,
      seoDescription: (f, l) => `Every Dally M Medal winner from ${f} to ${l}, shared medals included, plus the players who won rugby league's player of the year more than once since.`,
    },
    blurb: "Rugby league's player of the year since 1979, judged match by match through the season.",
    yearLabel: 'Year',
    championLabel: 'Medallist',
    columns: [],
    note: 'No medal is shown for 1997, when the game was split between two competitions and none was awarded, or for 2003, when the awards night was called off. 2014 and 2016 were shared and list both winners.',
    play: [
      { path: '/list-quiz', label: 'Name Them All' },
      { path: '/champ-or-not', label: 'Champ or Not' },
    ],
    /* nrl_dally_m: built Round 291. 47 medals, 34 players, 1979 to 2025, two-source verified
       2026-08-25 against rugbyleagueproject.org and topendsports.com, which agree on every
       year. Winners only: the club was available from one source and is not shipped on one. */
    fetch: () => rows('nrl_dally_m', 'year', 'winner', {}),
  },
  {
    key: 'nrl', emoji: '🏉', title: 'NRL/NSWRL Premiers',
    slug: 'nrl-premiers',
    words: {
      many: 'NRL/NSWRL premiers', one: 'NRL/NSWRL premier', most: 'Most NRL/NSWRL premierships',
      unit: ['premiership', 'premierships'], who: ['club', 'clubs'],
      seoTitle: f => `NRL and NSWRL Premiers by Year Since ${f} | DoUKnowBall`,
      seoDescription: (f, l) => `Every NRL and NSWRL premier from ${f} to ${l}, with the competition each title was won in, plus the clubs with the most premierships in that span.`,
    },
    blurb: 'Every top grade rugby league premiership since 1908. 1997 lists both premiers because the game split that year, Newcastle in the ARL and Brisbane in Super League.',
    yearLabel: 'Year',
    columns: [['competition', 'Competition']],
    note: 'No premiership is shown for 2007 or 2009. Melbourne’s titles from those seasons were stripped for salary cap breaches and remain vacant in the official record, so they stay vacant here too.',
    play: [
      { path: '/champ-or-not', label: 'Champ or Not' },
      { path: '/list-quiz', label: 'Name Them All' },
    ],
    fetch: () => rows('nrl_premiers', 'year', 'premier', { competition: 'competition' }),
  },
];
