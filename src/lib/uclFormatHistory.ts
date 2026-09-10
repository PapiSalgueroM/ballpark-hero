/**
 * Round 520: the Champions League's format, season by season, as a reference
 * page that would be worth reading if Club Manager did not exist.
 *
 * WHY THIS FILE EXISTS. The owner's 2026-08-30 AdSense recovery addendum asks
 * for a real reference layer ("Champions League format history", "historical
 * competition structures") and for a Club Manager player to be able to reach
 * "league rules, competition history and format explanations". The engine
 * already encodes the pieces it plays (eraUclHasR16, uclLegsFor and
 * uclAwayGoalsApply in src/lib/clubManager.ts), each verified in its own
 * round. This file is the whole timeline those pieces sit inside.
 *
 * WHAT WAS VERIFIED, EXACTLY. Every format CHANGE below, and the first season
 * of the shape it opened, was checked against two publishers on
 * UCL_FORMAT_VERIFIED_ON: Wikipedia's page for that season against RSSSF's
 * results archive for the same season, an independent publisher whose pages
 * show every tie and both its legs, with UEFA's own pages for the 2024 format
 * and the away goals rule. Where a shape ran for several seasons, the seasons
 * in between rest on the same sources saying when the shape changed next
 * (UEFA on the 2003-04 shape being unchanged until 2024, Wikipedia's 1997-98
 * page on "the previous four" groups) plus the season pages cited on the row.
 * That is a claim about periods and their boundaries, not a separate check of
 * all 72 seasons, and the page says so in those words. The sources are listed
 * by id in UCL_FORMAT_SOURCES and printed on the page. Nothing here is typed
 * from memory, and a detail with one source only was left out rather than
 * shipped: the round by round phase in of away goals inside the European Cup
 * in the late 1960s, and the year penalty shoot outs replaced the coin toss,
 * are both single source and both absent.
 *
 * THE ENGINE RULE. This module is pure data and imports nothing from the
 * engine, so the reference page stays a reading page (the Round 520 review
 * measured the alternative at 1.2 MB of JavaScript). What the game plays is
 * computed by src/lib/uclFormatHistoryEngine.ts, written to
 * src/data/uclEngineShapes.json by scripts/genUclEngineShapes.mjs, and held
 * fresh by scripts/simUclFormatHistory.mjs section 3, which recomputes it from
 * the engine on every run. The years the engine keys on (2003 to 2023 for the
 * round of 16, 2020 as the last away goals season, 1955 for two legged ties)
 * are typed here AND exported from the engine, on purpose: this file must not
 * evaluate an engine value at module scope (the import cycle rule in
 * CLAUDE.md), so the same harness holds the two equal.
 */

/** The day every row below was checked against both of its sources. */
export const UCL_FORMAT_VERIFIED_ON = '2026-09-10';

export interface UclFormatSource {
  id: string;
  publisher: string;
  title: string;
  url: string;
}

/** Every source the timeline cites, so the page can print them and the
 *  harness can check that each period rests on two publishers. */
export const UCL_FORMAT_SOURCES: UclFormatSource[] = [
  { id: 'wp5556', publisher: 'Wikipedia', title: '1955-56 European Cup', url: 'https://en.wikipedia.org/wiki/1955%E2%80%9356_European_Cup' },
  { id: 'rs5556', publisher: 'RSSSF', title: 'European Champions Cup 1955-56', url: 'https://www.rsssf.org/ec/ec195556.html' },
  { id: 'wp1957', publisher: 'Wikipedia', title: '1957 European Cup final', url: 'https://en.wikipedia.org/wiki/1957_European_Cup_final' },
  { id: 'rs5657', publisher: 'RSSSF', title: 'European Champions Cup 1956-57', url: 'https://www.rsssf.org/ec/ec195657.html' },
  { id: 'wplist', publisher: 'Wikipedia', title: 'List of European Cup and UEFA Champions League finals', url: 'https://en.wikipedia.org/wiki/List_of_European_Cup_and_UEFA_Champions_League_finals' },
  { id: 'rs6465', publisher: 'RSSSF', title: 'European Champions Cup 1964-65', url: 'https://www.rsssf.org/ec/ec196465.html' },
  { id: 'wp1974', publisher: 'Wikipedia', title: '1974 European Cup final', url: 'https://en.wikipedia.org/wiki/1974_European_Cup_final' },
  { id: 'rs7374', publisher: 'RSSSF', title: 'European Champions Cup 1973-74', url: 'https://www.rsssf.org/ec/ec197374.html' },
  { id: 'rs8384', publisher: 'RSSSF', title: 'European Champions Cup 1983-84', url: 'https://www.rsssf.org/ec/ec198384.html' },
  { id: 'wpucl', publisher: 'Wikipedia', title: 'UEFA Champions League', url: 'https://en.wikipedia.org/wiki/UEFA_Champions_League' },
  { id: 'smglossary', publisher: 'Sportmonks', title: 'Champions League glossary entry', url: 'https://www.sportmonks.com/glossary/champions-league/' },
  { id: 'wp9192', publisher: 'Wikipedia', title: '1991-92 European Cup', url: 'https://en.wikipedia.org/wiki/1991%E2%80%9392_European_Cup' },
  { id: 'rs9192', publisher: 'RSSSF', title: 'European Champions Cup 1991-92', url: 'https://www.rsssf.org/ec/ec199192.html' },
  { id: 'wp9293', publisher: 'Wikipedia', title: '1992-93 UEFA Champions League', url: 'https://en.wikipedia.org/wiki/1992%E2%80%9393_UEFA_Champions_League' },
  { id: 'rs9293', publisher: 'RSSSF', title: 'Champions League 1992-93', url: 'https://www.rsssf.org/ec/ec199293.html' },
  { id: 'wp9394', publisher: 'Wikipedia', title: '1993-94 UEFA Champions League', url: 'https://en.wikipedia.org/wiki/1993%E2%80%9394_UEFA_Champions_League' },
  { id: 'rs9394', publisher: 'RSSSF', title: 'Champions League 1993-94', url: 'https://www.rsssf.org/ec/ec199394.html' },
  { id: 'wp9495', publisher: 'Wikipedia', title: '1994-95 UEFA Champions League', url: 'https://en.wikipedia.org/wiki/1994%E2%80%9395_UEFA_Champions_League' },
  { id: 'rs9495', publisher: 'RSSSF', title: 'Champions League 1994-95', url: 'https://www.rsssf.org/ec/ec199495.html' },
  { id: 'wp9596', publisher: 'Wikipedia', title: '1995-96 UEFA Champions League', url: 'https://en.wikipedia.org/wiki/1995%E2%80%9396_UEFA_Champions_League' },
  { id: 'rs9596', publisher: 'RSSSF', title: 'Champions League 1995-96', url: 'https://www.rsssf.org/ec/ec199596.html' },
  { id: 'wp9697', publisher: 'Wikipedia', title: '1996-97 UEFA Champions League', url: 'https://en.wikipedia.org/wiki/1996%E2%80%9397_UEFA_Champions_League' },
  { id: 'rs9697', publisher: 'RSSSF', title: 'Champions League 1996-97', url: 'https://www.rsssf.org/ec/ec199697.html' },
  { id: 'wp9798', publisher: 'Wikipedia', title: '1997-98 UEFA Champions League', url: 'https://en.wikipedia.org/wiki/1997%E2%80%9398_UEFA_Champions_League' },
  { id: 'rs9798', publisher: 'RSSSF', title: 'Champions League 1997-98', url: 'https://www.rsssf.org/ec/ec199798.html' },
  { id: 'wp9899', publisher: 'Wikipedia', title: '1998-99 UEFA Champions League', url: 'https://en.wikipedia.org/wiki/1998%E2%80%9399_UEFA_Champions_League' },
  { id: 'rs9899', publisher: 'RSSSF', title: 'Champions League 1998-99', url: 'https://www.rsssf.org/ec/ec199899.html' },
  { id: 'wp9900', publisher: 'Wikipedia', title: '1999-2000 UEFA Champions League', url: 'https://en.wikipedia.org/wiki/1999%E2%80%932000_UEFA_Champions_League' },
  { id: 'rs9900', publisher: 'RSSSF', title: 'Champions League 1999-2000', url: 'https://www.rsssf.org/ec/ec199900.html' },
  { id: 'rs0001', publisher: 'RSSSF', title: 'Champions League 2000-01', url: 'https://www.rsssf.org/ec/ec200001.html' },
  { id: 'rs0102', publisher: 'RSSSF', title: 'Champions League 2001-02', url: 'https://www.rsssf.org/ec/ec200102.html' },
  { id: 'rs0203', publisher: 'RSSSF', title: 'Champions League 2002-03', url: 'https://www.rsssf.org/ec/ec200203.html' },
  { id: 'wp0304', publisher: 'Wikipedia', title: '2003-04 UEFA Champions League', url: 'https://en.wikipedia.org/wiki/2003%E2%80%9304_UEFA_Champions_League' },
  { id: 'rs0304', publisher: 'RSSSF', title: 'Champions League 2003-04', url: 'https://www.rsssf.org/ec/ec200304.html' },
  { id: 'wp1920', publisher: 'Wikipedia', title: '2019-20 UEFA Champions League', url: 'https://en.wikipedia.org/wiki/2019%E2%80%9320_UEFA_Champions_League' },
  { id: 'rs1920', publisher: 'RSSSF', title: 'Champions League 2019-20', url: 'https://www.rsssf.org/ec/ec201920.html' },
  { id: 'uefaaway', publisher: 'UEFA', title: 'Do away goals count double in the Champions League?', url: 'https://www.uefa.com/uefachampionsleague/news/027d-17172d2190e2-03070c1a3001-1000--do-away-goals-count-double-in-the-champions-league-europa/' },
  { id: 'wpaway', publisher: 'Wikipedia', title: 'Away goals rule', url: 'https://en.wikipedia.org/wiki/Away_goals_rule' },
  { id: 'uefanew', publisher: 'UEFA', title: 'New format for Champions League post-2024: everything you need to know', url: 'https://www.uefa.com/uefachampionsleague/news/0268-12157d69ce2d-9f011c70f6fa-1000--new-format-for-champions-league-post-2024-everything-you-ne/' },
];

export type UclStage = 'knockout' | 'groups' | 'leaguePhase';

export interface UclFormatPeriod {
  id: string;
  /** Starting year of the first season this shape was used, inclusive. */
  from: number;
  /** Starting year of the last season, inclusive; null while it is current. */
  to: number | null;
  /** What the competition was called for the whole period. */
  name: string;
  /** The row's headline. */
  title: string;
  stage: UclStage;
  /** Groups in the first group stage; 0 for a knockout or a league phase. */
  groups: number;
  secondGroupStage: boolean;
  /** A knockout round of 16 clubs after the group or league stage. */
  roundOf16: boolean;
  /** Legs per knockout tie after the group stage and before the final; null
   *  where the groups fed the final directly. */
  koLegs: 1 | 2 | null;
  /** Who was in the competition proper. */
  entrants: string;
  /** How a club got from the first stage to the final, one sentence. */
  path: string;
  /** Verified colour: the first final under the shape, the odd seasons. */
  notes: string[];
  /** Ids into UCL_FORMAT_SOURCES. At least two publishers per period. */
  sources: string[];
}

export const UCL_FORMAT_PERIODS: UclFormatPeriod[] = [
  {
    id: 'european-cup',
    from: 1955,
    to: 1990,
    name: 'European Cup',
    title: 'Straight knockout, home and away',
    stage: 'knockout',
    groups: 0,
    secondGroupStage: false,
    roundOf16: false,
    koLegs: 2,
    entrants: 'Sixteen invited clubs in the first season, then the champions of each national league.',
    path: 'Every round before the final was a two legged tie decided on aggregate, and the final was one match at a venue fixed in advance.',
    notes: [
      'The first edition, 1955-56, was won by Real Madrid, 4-3 against Reims at the Parc des Princes in Paris.',
      'Three times in this era the final landed on a finalist\'s own ground: Real Madrid won at the Bernabeu in 1957, Inter won at San Siro in 1965, and Roma lost to Liverpool on penalties at the Stadio Olimpico in 1984.',
      'The 1974 final is the only one ever replayed: Bayern Munich and Atletico Madrid drew 1-1 after extra time in Brussels, and Bayern won the replay 4-0 two days later at the same ground.',
    ],
    sources: ['wp5556', 'rs5556', 'wp1957', 'rs5657', 'wplist', 'rs6465', 'rs8384', 'wp1974', 'rs7374', 'wpucl', 'smglossary', 'wp9192'],
  },
  {
    id: 'first-groups',
    from: 1991,
    to: 1991,
    name: 'European Cup',
    title: 'The first group stage',
    stage: 'groups',
    groups: 2,
    secondGroupStage: false,
    roundOf16: false,
    koLegs: null,
    entrants: 'Thirty two clubs entered the first round; eight survived two knockout rounds.',
    path: 'The eight survivors were split into two groups of four, played home and away, and the two group winners met in the final with no semi-finals.',
    notes: [
      'Barcelona beat Sampdoria 1-0 after extra time at Wembley, the first final reached through a group.',
    ],
    sources: ['wp9192', 'rs9192'],
  },
  {
    id: 'renamed',
    from: 1992,
    to: 1992,
    name: 'Champions League',
    title: 'Renamed, same shape',
    stage: 'groups',
    groups: 2,
    secondGroupStage: false,
    roundOf16: false,
    koLegs: null,
    entrants: 'Eight clubs in two groups of four after the knockout rounds.',
    path: 'The two group winners went straight to the final again.',
    notes: [
      'The Champions League name arrived this season, at first only for the group stage. Marseille beat Milan 1-0 in Munich.',
    ],
    sources: ['wp9293', 'rs9293', 'smglossary'],
  },
  {
    id: 'one-leg-semis',
    from: 1993,
    to: 1993,
    name: 'Champions League',
    title: 'Semi-finals return, as single matches',
    stage: 'groups',
    groups: 2,
    secondGroupStage: false,
    roundOf16: false,
    koLegs: 1,
    entrants: 'Eight clubs in two groups of four after the knockout rounds.',
    path: 'The top two of each group went to one off semi-finals, each hosted by a group winner, and the winners met in the final.',
    notes: [
      'Milan beat Barcelona 4-0 in Athens.',
    ],
    sources: ['wp9394', 'rs9394'],
  },
  {
    id: 'four-groups',
    from: 1994,
    to: 1996,
    name: 'Champions League',
    title: 'Sixteen clubs, four groups, quarter-finals',
    stage: 'groups',
    groups: 4,
    secondGroupStage: false,
    roundOf16: false,
    koLegs: 2,
    entrants: 'Sixteen clubs in the group stage.',
    path: 'Four groups of four, the top two of each into two legged quarter-finals and semi-finals, then a one match final.',
    notes: [
      'Ajax beat Milan 1-0 in Vienna in the first season of this shape, 1994-95, and the shape held for three seasons.',
    ],
    sources: ['wp9495', 'rs9495', 'wp9596', 'rs9596', 'wp9697', 'rs9697', 'wp9798'],
  },
  {
    id: 'six-groups',
    from: 1997,
    to: 1998,
    name: 'Champions League',
    title: 'Twenty four clubs, six groups, runners-up let in',
    stage: 'groups',
    groups: 6,
    secondGroupStage: false,
    roundOf16: false,
    koLegs: 2,
    entrants: 'Twenty four clubs in the group stage, including the runners-up of eight domestic leagues for the first time.',
    path: 'Six groups of four; the six winners and the two best runners-up went to the quarter-finals.',
    notes: [
      'This is where the champions only competition ended, and the name stopped being literally true.',
      'Real Madrid beat Juventus 1-0 in Amsterdam in 1998, and Manchester United came from a goal down in stoppage time to beat Bayern Munich 2-1 in Barcelona in 1999.',
    ],
    sources: ['wp9798', 'rs9798', 'wp9899', 'rs9899'],
  },
  {
    id: 'two-group-stages',
    from: 1999,
    to: 2002,
    name: 'Champions League',
    title: 'Thirty two clubs and a second group stage',
    stage: 'groups',
    groups: 8,
    secondGroupStage: true,
    roundOf16: false,
    koLegs: 2,
    entrants: 'Thirty two clubs in the first group stage, with up to four from the strongest leagues.',
    path: 'Eight groups of four, the top two into a second group stage of four groups of four, and the top two of those into the quarter-finals.',
    notes: [
      'Third placed clubs from the first stage dropped into the UEFA Cup.',
      'Real Madrid beat Valencia 3-0 in Paris in the first season of this format, and the double group stage ran for four seasons.',
    ],
    sources: ['wp9900', 'rs9900', 'rs0001', 'rs0102', 'rs0203', 'wp0304'],
  },
  {
    id: 'eight-groups-r16',
    from: 2003,
    to: 2023,
    name: 'Champions League',
    title: 'Thirty two clubs, eight groups, a round of 16',
    stage: 'groups',
    groups: 8,
    secondGroupStage: false,
    roundOf16: true,
    koLegs: 2,
    entrants: 'Thirty two clubs in the group stage.',
    path: 'Eight groups of four, the top two into a round of 16, then two legged quarter-finals and semi-finals and a one match final.',
    notes: [
      'Porto beat Monaco 3-0 in Gelsenkirchen in the first season of this shape, and it lasted 21 seasons.',
      'The 2019-20 season finished as a one city tournament in Lisbon: single match quarter-finals and semi-finals behind closed doors, and Bayern Munich beat Paris Saint-Germain 1-0 in the final.',
      'Away goals stopped counting double from 2021-22, so a tie level after two legs now goes to extra time and then penalties.',
    ],
    sources: ['wp0304', 'rs0304', 'uefanew', 'wpucl', 'wp1920', 'rs1920', 'uefaaway', 'wpaway'],
  },
  {
    id: 'league-phase',
    from: 2024,
    to: null,
    name: 'Champions League',
    title: 'Thirty six clubs in one league table',
    stage: 'leaguePhase',
    groups: 0,
    secondGroupStage: false,
    roundOf16: true,
    koLegs: 2,
    entrants: 'Thirty six clubs.',
    path: 'One table: each club plays eight different opponents, four at home and four away. The top eight go straight to the round of 16, ninth to 24th play a two legged knockout play-off for the other eight places, and 25th and below are out, with no drop into the Europa League.',
    notes: [
      'UEFA calls it the league phase. From the play-offs to the semi-finals the ties are two legged, and the final is still one match at a venue picked well in advance.',
    ],
    sources: ['uefanew', 'wpucl', 'smglossary'],
  },
];

/** The away goals rule, which cut across several of the periods above. */
export const UCL_AWAY_GOALS = {
  /** The year UEFA introduced it, in the Cup Winners' Cup. */
  introduced: 1965,
  /** Starting year of the last season it applied. Typed here and exported
   *  from the engine as UCL_AWAY_GOALS_LAST_YEAR; the harness holds them equal. */
  lastSeason: 2020,
  text: 'UEFA first used the away goals rule in 1965, in the Cup Winners\' Cup, and for most of this competition\'s life a tie level on aggregate went to whichever side had scored more away from home. It was abolished in every UEFA club competition from 2021-22. A tie level after two legs now goes to extra time and then penalties, and a goal scored away in extra time counts the same as one at home.',
  sources: ['uefaaway', 'wpaway'],
};

export function sourceById(id: string): UclFormatSource | undefined {
  return UCL_FORMAT_SOURCES.find(s => s.id === id);
}

/** "1955-56" from 1955, and "1999-2000" across the turn of the century, which
 *  is how everybody writes that one. */
export function seasonOf(year: number): string {
  const next = year + 1;
  return next % 100 === 0 ? `${year}-${next}` : `${year}-${String(next % 100).padStart(2, '0')}`;
}

/** "1955-56 to 1990-91", "1991-92" for a single season, "2024-25 onward". */
export function seasonRange(p: Pick<UclFormatPeriod, 'from' | 'to'>): string {
  if (p.to === null) return `${seasonOf(p.from)} onward`;
  if (p.to === p.from) return seasonOf(p.from);
  return `${seasonOf(p.from)} to ${seasonOf(p.to)}`;
}

/** The period a season's starting year falls in. Years before the first
 *  season resolve to the first period, which is the honest answer for a
 *  competition that did not exist yet. */
export function periodFor(year: number): UclFormatPeriod {
  return UCL_FORMAT_PERIODS.find(p => year >= p.from && (p.to === null || year <= p.to)) ?? UCL_FORMAT_PERIODS[0];
}
