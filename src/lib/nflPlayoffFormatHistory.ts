/**
 * NFL championship formats, with the separate AFL field excluded before 1970.
 * Verified against official league, team and Hall of Fame publications.
 * Source-to-claim notes: docs/adsense/nfl-guide-correction-2026-09-15.md.
 */

export const NFL_PLAYOFF_VERIFIED_ON = '2026-09-15';

export interface NflPlayoffSource {
  id: string;
  publisher: string;
  title: string;
  url: string;
}

export const NFL_PLAYOFF_SOURCES: NflPlayoffSource[] = [
  { id: 'bears', publisher: 'Chicago Bears', title: 'History of how NFL playoffs have expanded', url: 'https://www.chicagobears.com/news/history-of-how-nfl-playoffs-have-expanded' },
  { id: 'hofbirth', publisher: 'Pro Football Hall of Fame', title: 'Moments in NFL History: Birth of NFL playoffs', url: 'https://www.profootballhof.com/news/moments-in-nfl-history-birth-of-nfl-playoffs' },
  { id: 'hof1960s', publisher: 'Pro Football Hall of Fame', title: 'Playoff Results: 1960s', url: 'https://www.profootballhof.com/news/playoff-results-1960s' },
  { id: 'hof1980s', publisher: 'Pro Football Hall of Fame', title: 'Playoff Results: 1980s', url: 'https://www.profootballhof.com/news/playoff-results-1980s' },
  { id: 'hofwildcards', publisher: 'Pro Football Hall of Fame', title: 'Wild Card Golden Nuggets', url: 'https://www.profootballhof.com/news/wild-card-golden-nuggets' },
  { id: 'hof1990s', publisher: 'Pro Football Hall of Fame', title: 'Playoff Results: 1990s', url: 'https://www.profootballhof.com/news/playoff-results-1990s' },
  { id: 'nfl2020', publisher: 'NFL', title: 'Owners approve expanding postseason to 14 teams', url: 'https://www.nfl.com/news/owners-approve-expanding-postseason-to-14-teams-0ap3000001107961' },
  { id: 'hofot', publisher: 'Pro Football Hall of Fame', title: 'The NFL goes into overtime', url: 'https://www.profootballhof.com/news/the-nfl-goes-into-overtime' },
  { id: 'colts1958', publisher: 'Indianapolis Colts', title: 'The Greatest Game Ever Played: 1958 NFL Championship', url: 'https://www.colts.com/video/the-greatest-game-ever-played-1958-nfl-championship-colts-vs-giants-20143371' },
  { id: 'nfl2012', publisher: 'NFL', title: 'Owners vote to adopt playoff OT rules in regular season', url: 'https://www.nfl.com/news/owners-vote-to-adopt-playoff-ot-rules-in-regular-season-09000d5d827ecefd' },
  { id: 'titansot', publisher: 'Tennessee Titans', title: '2025 Media Guide: overtime history', url: 'https://static.www.nfl.com/image/upload/league/apps/league-site/media-guides/2025/TEN.pdf' },
  { id: 'nflrules', publisher: 'NFL', title: '2026 Official Playing Rules: Rule 16, overtime procedures', url: 'https://static.www.nfl.com/image/upload/fl_attachment/league/tqivdkzt9mu6wdgsh1ku.pdf' },
  { id: 'eagles2025', publisher: 'Philadelphia Eagles', title: 'New rules for the 2025 NFL season, explained by Eagles Assistant GM Jon Ferrari', url: 'https://www.philadelphiaeagles.com/news/new-rules-for-the-2025-nfl-season-explained-by-eagles-assistant-gm-jon-ferrari' },
];

export type NflPlayoffFieldSize = 2 | 4 | 8 | 10 | 12 | 14 | 16;

export interface NflPlayoffPeriod {
  id: string;
  /** First season this shape was used, inclusive. */
  from: number;
  /** Last season, inclusive; null while it is current. */
  to: number | null;
  title: string;
  /** Scheduled NFL championship field; excludes extra tied-leader playoffs and the separate AFL before 1970. */
  fieldSize: NflPlayoffFieldSize;
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
    to: 1966,
    title: 'Two winners meet for the NFL title',
    fieldSize: 2,
    qualifying: 'The Eastern and Western division winners, later conference winners, meet in the NFL Championship Game. Tied leaders can require an extra playoff first.',
    notes: [
      'The 1932 Bears and Portsmouth Spartans had already played a tiebreaker to decide the title. In 1933 the NFL created Eastern and Western divisions and an annual championship game between their winners.',
      'This was not a promise of only one postseason game: a tie at the top could add a playoff, as it did for the Bears and Packers in 1941 and Green Bay and Baltimore in 1965.',
      'The AFL ran its own championship from 1960. After the 1966 season, the NFL and AFL champions first met in the game now called Super Bowl I. The two-team figure here counts the NFL title game, not the separate AFL field.',
    ],
    sources: ['bears', 'hofbirth', 'hof1960s', 'hofot'],
  },
  {
    id: 'four-division-winners',
    from: 1967,
    to: 1969,
    title: 'Four division winners, two NFL rounds',
    fieldSize: 4,
    qualifying: 'The Capitol, Century, Central and Coastal division champions enter two conference championship games; those winners meet for the NFL title.',
    notes: [
      'The NFL now had a scheduled four-team bracket, three seasons before the full merger. Winning a division earned a place in the conference championship rather than a direct place in the NFL title game.',
      'The NFL champion then faced the separately decided AFL champion in the Super Bowl. These four places describe the NFL bracket only; the leagues kept separate playoffs through 1969.',
    ],
    sources: ['bears', 'hof1960s'],
  },
  {
    id: 'merger-eight',
    from: 1970,
    to: 1977,
    title: 'The merger: eight teams',
    fieldSize: 8,
    qualifying: 'Three division winners plus one wild card in each of the AFC and NFC, with all eight entering the divisional round.',
    notes: [
      'The AFL and NFL completed their merger for the 1970 season. The combined league had two conferences, each with three divisions and a place for its best non-division winner.',
      'Each conference played two divisional games and a conference championship, then sent its champion to the Super Bowl. The merger enlarged an NFL bracket that had already begun in 1967.',
    ],
    sources: ['bears', 'hofwildcards', 'hof1990s'],
  },
  {
    id: 'ten-teams',
    from: 1978,
    to: 1981,
    title: 'A second wild card: ten teams',
    fieldSize: 10,
    qualifying: 'Three division winners plus two wild cards in each conference; the wild cards play each other before the three division winners join in the divisional round.',
    notes: [
      'A non-division winner now had to win an extra round to reach the Super Bowl. The three division winners in each conference skipped the opening wild card game.',
      'The ten-team format continued after 1981, with a one-season exception in 1982 shown below.',
    ],
    sources: ['bears', 'hofwildcards', 'hof1980s'],
  },
  {
    id: 'strike-tournament',
    from: 1982,
    to: 1982,
    title: 'The strike exception: sixteen teams',
    fieldSize: 16,
    qualifying: 'The top eight teams in each conference qualify by record, seeded 1 through 8, instead of using the usual division-winner and wild-card places.',
    notes: [
      'A players strike cut the regular season to nine games. The NFL used a sixteen-team Super Bowl tournament for this season only, with no first round byes.',
      'Each conference began with four first round games. A team had to win three conference rounds and the Super Bowl to take the title.',
    ],
    sources: ['bears', 'hof1980s'],
  },
  {
    id: 'ten-teams-restored',
    from: 1983,
    to: 1989,
    title: 'Back to ten teams',
    fieldSize: 10,
    qualifying: 'Three division winners and two wild cards per conference return. The two wild cards meet first; the division winners wait for the divisional round.',
    notes: [
      'The temporary sixteen-team tournament ended. This return to ten is why the playoff field did not grow in a straight line.',
    ],
    sources: ['bears', 'hof1980s'],
  },
  {
    id: 'twelve-teams',
    from: 1990,
    to: 2001,
    title: 'A third wild card: twelve teams',
    fieldSize: 12,
    qualifying: 'Three division winners plus three wild cards in each conference. Only the top two seeds in each conference receive first round byes.',
    notes: [
      'The third division winner no longer skipped the opening round: seed 3 hosted seed 6, while seed 4 hosted seed 5. Adding a wild card also made the best two division records more valuable.',
    ],
    sources: ['bears', 'hof1990s'],
  },
  {
    id: 'realignment',
    from: 2002,
    to: 2019,
    title: 'Realigned to eight divisions, same twelve teams',
    fieldSize: 12,
    qualifying: 'Four division winners plus two wild cards in each conference, with the top two seeds still receiving first round byes.',
    notes: [
      'The league grew to 32 teams and reorganized into eight divisions of four. Each conference exchanged one wild-card place for a fourth division-winner place, keeping its six playoff spots.',
    ],
    sources: ['bears', 'hofwildcards'],
  },
  {
    id: 'fourteen-teams',
    from: 2020,
    to: null,
    title: 'A third wild card returns: fourteen teams',
    fieldSize: 14,
    qualifying: 'Four division winners plus three wild cards in each conference; only the top seed in each conference gets a first round bye.',
    notes: [
      'The bye went from the top two seeds to just seed 1. Wild card weekend pairs seed 2 with 7, seed 3 with 6, and seed 4 with 5 in each conference.',
    ],
    sources: ['bears', 'nfl2020'],
  },
];

/** Milestones distinguish the first overtime game from later changes to the rule. */
export const NFL_OVERTIME = {
  firstDecidedBy: 1958,
  secondRuleChange: 2010,
  regularSeasonModified: 2012,
  thirdRuleChange: 2022,
  regularSeasonBoth: 2025,
  text: 'The 1958 NFL Championship Game was the first NFL playoff game decided in overtime: Baltimore beat the New York Giants under sudden death, when the first score won. In 2010 the postseason changed to modified sudden death: an opening field goal gave the opponent a chance to respond, while an opening touchdown could still win. That format extended to regular season games in 2012. Since 2022, playoff overtime gives both teams an opportunity to possess the ball even after an opening touchdown. A safety scored by the kicking team on the opening possession ends the game; a defensive touchdown can also end it. Playoff periods last 15 minutes and continue as needed to decide a winner. The 2025 regular season adopted the opportunity after an opening touchdown too, but kept its single 10-minute period, which can expire before a reply and can end in a tie.',
  sources: ['hofot', 'colts1958', 'nfl2012', 'titansot', 'nflrules', 'eagles2025'],
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
