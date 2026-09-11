/**
 * Round 532: the NBA playoff format, season by season, plus the draft
 * lottery's own history, as a reference page that would be worth reading if
 * NBA Front Office did not exist.
 *
 * The same pattern Round 520 built for the Champions League and Round 522
 * built for the NFL. The 2026-08-30 AdSense recovery addendum asks for
 * "playoff system explainers" plural; this is the third.
 *
 * WHAT WAS VERIFIED. Every format change below was checked against Wikipedia
 * (the NBA playoffs overview page, the relevant season or playoffs page, or
 * the draft lottery page) and against at least one second, independent
 * publisher: NBA.com's own play-in and lottery history pieces and its press
 * releases, ESPN's seeding and lottery coverage, two FanSided history pieces,
 * TickPick's format explainer, Land of Basketball's 1954 bracket and a Sports
 * Illustrated piece on lottery upsets, all read on NBA_PLAYOFF_VERIFIED_ON.
 * Fetches of Basketball Reference's lottery history (403), Wikipedia's 1985
 * NBA draft lottery page (404) and two CBC realignment stories (403) were
 * blocked, so none of them appears as a source; nothing here rests on a page
 * that could not actually be read.
 *
 * WHAT WAS LEFT OUT FOR HAVING ONE READING. Wikipedia says a division winner
 * was guaranteed a top three seed in 2004-05 and 2005-06 and that the floor
 * moved to fourth after two 60 win teams met in the 2006 second round; no
 * second publisher this page could open says either, so the period states
 * only what ESPN and NBA.com confirm: division winners were protected, and
 * the floor was a top four seed by the time the rule was dropped in 2015.
 * The 1973 wild card note, the 1961 division semifinal length, the year the
 * lottery pool reached 14 teams, the 2027 lottery's exact percentage odds and
 * how many of its picks are drawn each had a single reading and are not
 * stated.
 *
 * ONE DISAGREEMENT, RECORDED RATHER THAN HIDDEN. NBA.com's lottery history
 * says the rule limiting the lottery to the first three picks was "changed in
 * 1986"; Wikipedia says the lottery decided only the first three picks
 * "starting from 1987". Both can be true if the rule was adopted in one year
 * and first used the next, and this file does not pick: it says the change
 * came after the first lottery or two.
 */

export const NBA_PLAYOFF_VERIFIED_ON = '2026-09-11';

export interface NbaPlayoffSource {
  id: string;
  publisher: string;
  title: string;
  url: string;
}

export const NBA_PLAYOFF_SOURCES: NbaPlayoffSource[] = [
  { id: 'wpoverview', publisher: 'Wikipedia', title: 'NBA playoffs', url: 'https://en.wikipedia.org/wiki/NBA_playoffs' },
  { id: 'wp1946', publisher: 'Wikipedia', title: '1946-47 BAA season', url: 'https://en.wikipedia.org/wiki/1946%E2%80%9347_BAA_season' },
  { id: 'wp1950', publisher: 'Wikipedia', title: '1950 NBA playoffs', url: 'https://en.wikipedia.org/wiki/1950_NBA_playoffs' },
  { id: 'wp1954', publisher: 'Wikipedia', title: '1954 NBA playoffs', url: 'https://en.wikipedia.org/wiki/1954_NBA_playoffs' },
  { id: 'wp1966', publisher: 'Wikipedia', title: '1966-67 NBA season', url: 'https://en.wikipedia.org/wiki/1966%E2%80%9367_NBA_season' },
  { id: 'wp1970', publisher: 'Wikipedia', title: '1970-71 NBA season', url: 'https://en.wikipedia.org/wiki/1970%E2%80%9371_NBA_season' },
  { id: 'wp1974', publisher: 'Wikipedia', title: '1974-75 NBA season', url: 'https://en.wikipedia.org/wiki/1974%E2%80%9375_NBA_season' },
  { id: 'wp1976', publisher: 'Wikipedia', title: '1976-77 NBA season', url: 'https://en.wikipedia.org/wiki/1976%E2%80%9377_NBA_season' },
  { id: 'wp1983', publisher: 'Wikipedia', title: '1983-84 NBA season', url: 'https://en.wikipedia.org/wiki/1983%E2%80%9384_NBA_season' },
  { id: 'wp2002', publisher: 'Wikipedia', title: '2002-03 NBA season', url: 'https://en.wikipedia.org/wiki/2002%E2%80%9303_NBA_season' },
  { id: 'wp2004', publisher: 'Wikipedia', title: '2004-05 NBA season', url: 'https://en.wikipedia.org/wiki/2004%E2%80%9305_NBA_season' },
  { id: 'wp2015', publisher: 'Wikipedia', title: '2015-16 NBA season', url: 'https://en.wikipedia.org/wiki/2015%E2%80%9316_NBA_season' },
  { id: 'wpbubble', publisher: 'Wikipedia', title: '2020 NBA Bubble', url: 'https://en.wikipedia.org/wiki/2020_NBA_Bubble' },
  { id: 'wp2020', publisher: 'Wikipedia', title: '2020-21 NBA season', url: 'https://en.wikipedia.org/wiki/2020%E2%80%9321_NBA_season' },
  { id: 'wplottery', publisher: 'Wikipedia', title: 'NBA draft lottery', url: 'https://en.wikipedia.org/wiki/NBA_draft_lottery' },
  { id: 'fansidedreform', publisher: 'FanSided', title: 'Throwback Thursday: The history of NBA playoff reformatting', url: 'https://fansided.com/2017/10/12/nba-playoff-reform-adam-silver-history/' },
  { id: 'fansidedseries', publisher: 'FanSided', title: 'How many games are in the NBA playoffs? Explaining the history of best-of-seven series', url: 'https://fansided.com/posts/how-many-games-are-in-the-nba-playoffs-explaining-the-history-of-best-of-seven-series-01hq66dn3900' },
  { id: 'tickpick', publisher: 'TickPick', title: 'The Evolution of NBA Playoff Format and Structure', url: 'https://www.tickpick.com/blog/the-evolution-of-nba-playoff-format-and-structure/' },
  { id: 'lob1954', publisher: 'Land of Basketball', title: '1953-54 NBA playoffs brackets', url: 'https://www.landofbasketball.com/yearbyyear/1953_1954_playoffs_brackets.htm' },
  { id: 'nbaplayin', publisher: 'NBA.com', title: 'Play-In Tournament history', url: 'https://www.nba.com/news/play-in-tournament-history' },
  { id: 'nbaprplayin', publisher: 'NBA.com', title: 'NBA Board of Governors approves Play-In Tournament for 2021-22 season', url: 'https://pr.nba.com/nba-board-of-governors-play-in-roster-rules-2021-22-season' },
  { id: 'nbaprseeding', publisher: 'NBA.com', title: 'NBA to seed conference playoff teams by record', url: 'https://pr.nba.com/nba-playoff-seeding-changes' },
  { id: 'nbalotterychanges', publisher: 'NBA.com', title: 'A history of the NBA Draft Lottery and its changes over time', url: 'https://www.nba.com/news/nba-draft-lottery-changes-over-the-years' },
  { id: 'nbalotteryexplainer', publisher: 'NBA.com', title: 'NBA Draft Lottery explainer', url: 'https://www.nba.com/news/nba-draft-lottery-explainer' },
  { id: 'nba2017lottery', publisher: 'NBA.com', title: 'NBA Board of Governors approves changes to draft lottery system', url: 'https://www.nba.com/article/2017/09/28/nba-board-governors-approves-changes-draft-lottery-system' },
  { id: 'nba2026lottery', publisher: 'NBA.com', title: 'NBA Board of Governors approves new Draft Lottery system to address tanking', url: 'https://www.nba.com/news/nba-board-governors-approve-new-draft-lottery-system' },
  { id: 'espnplayin', publisher: 'ESPN', title: 'Sources: NBA board of governors expected to vote to make play-in tournament permanent', url: 'https://www.espn.com/nba/story/_/id/34227968/sources-nba-board-governors-expected-vote-make-play-tournament-permanent' },
  { id: 'espnseeding', publisher: 'ESPN', title: 'Board of Governors unanimously approve changes to playoff seeding', url: 'https://www.espn.com/nba/story/_/id/13611671/nba-seed-playoff-teams-conference-record' },
  { id: 'espnlottery', publisher: 'ESPN', title: 'NBA draft lottery 101: Date, time, odds, format, history', url: 'https://www.espn.com/nba/story/_/id/44921796/nba-draft-lottery-format-history-key-facts' },
  { id: 'espnlottery2026', publisher: 'ESPN', title: "NBA's BOG votes to expand lottery, addresses tanking problem", url: 'https://www.espn.com/nba/story/_/id/48903380/sources-nba-bog-votes-expand-lottery-disincentivizes-tanking' },
  { id: 'si2014', publisher: 'Sports Illustrated', title: 'Beating the NBA Draft Lottery Odds', url: 'https://www.si.com/nba/2014/05/18/beating-draft-lottery-odds' },
];

export interface NbaPlayoffPeriod {
  id: string;
  /** First season this shape was used, inclusive, named by the year it started (1983 is 1983-84). */
  from: number;
  /** Last season, inclusive, same naming; null while it is current. */
  to: number | null;
  title: string;
  /** Total teams that qualify for the bracket (the play-in's extra four are not counted). */
  fieldSize: number;
  /** How the field breaks down, one sentence. */
  qualifying: string;
  notes: string[];
  /** Ids into NBA_PLAYOFF_SOURCES. At least two distinct publishers per period. */
  sources: string[];
}

/** The first season from which the field has only ever grown. Before this
 *  the league itself was shrinking, and the field shrank with it. */
export const NBA_FIELD_NEVER_SHRINKS_FROM = 1966;

export const NBA_PLAYOFF_PERIODS: NbaPlayoffPeriod[] = [
  {
    id: 'baa',
    from: 1946,
    to: 1947,
    title: 'The BAA: six of eleven',
    fieldSize: 6,
    qualifying: 'The top three in each of two divisions. The two division winners met straight away in a best of seven semifinal; the second and third place teams played best of three quarterfinals and a best of three semifinal to produce the other finalist.',
    notes: [
      'The Basketball Association of America opened with eleven teams and sent six of them to the postseason. Nothing about it was a bracket in the modern sense: the strongest two teams in the league could only meet in a semifinal, never in the Finals, because the format sent them at each other first.',
      'The Finals were best of seven from the very first season. Every other round was short.',
    ],
    sources: ['wpoverview', 'wp1946', 'tickpick', 'fansidedreform'],
  },
  {
    id: 'eight-1948',
    from: 1948,
    to: 1948,
    title: 'Eight teams, two short rounds',
    fieldSize: 8,
    qualifying: 'The top four in each division. Division semifinals and division finals were both best of three, then a best of seven Finals.',
    notes: [
      'The last BAA season before the league became the NBA. The field grew to eight, the first two rounds stayed short, and the Finals stayed best of seven.',
    ],
    sources: ['wpoverview', 'fansidedseries', 'fansidedreform'],
  },
  {
    id: 'twelve-1949',
    from: 1949,
    to: 1949,
    title: 'Three divisions, twelve teams, one bye',
    fieldSize: 12,
    qualifying: 'The top four in each of three divisions. Two best of three rounds inside each division produced three division champions; one of those drew a bye while the other two played a best of three for the second place in the Finals.',
    notes: [
      'The one season the league had three divisions, because the merger with the NBL left it with seventeen teams. Twelve of them made the playoffs, the biggest field the league would have until 1984.',
    ],
    sources: ['wpoverview', 'wp1950', 'fansidedreform'],
  },
  {
    id: 'eight-1950',
    from: 1950,
    to: 1952,
    title: 'Back to two divisions and eight teams',
    fieldSize: 8,
    qualifying: 'The top four in each of two divisions again. Division semifinals best of three, division finals now best of five, Finals best of seven.',
    notes: [
      'The league shrank after the merger season, and the playoffs went back to the BAA shape with one change: the division finals got longer.',
    ],
    sources: ['wpoverview', 'fansidedreform'],
  },
  {
    id: 'round-robin',
    from: 1953,
    to: 1953,
    title: 'The round robin year',
    fieldSize: 6,
    qualifying: 'The top three in each division played a double round robin, home and away against each other, to eliminate one team; the surviving two met in a best of three division final.',
    notes: [
      'The only round robin in NBA playoff history, tried once and dropped. Minneapolis and Syracuse came through it to a Finals that went seven games.',
    ],
    sources: ['wpoverview', 'wp1954', 'fansidedreform', 'lob1954'],
  },
  {
    id: 'six-bye',
    from: 1954,
    to: 1965,
    title: 'Six teams, a bye for first place',
    fieldSize: 6,
    qualifying: 'The top three in each division. First place sat out while second and third played a division semifinal, then met the winner in the division final.',
    notes: [
      'Twelve seasons of the same shape while the league was small enough that most of it made the playoffs, so the reward for a great regular season was rest rather than a weaker opponent.',
      'The rounds lengthened during this period: the division finals became best of five in 1955 and best of seven in 1958.',
    ],
    sources: ['wpoverview', 'fansidedreform', 'fansidedseries'],
  },
  {
    id: 'eight-1966',
    from: 1966,
    to: 1969,
    title: 'Expansion brings back eight',
    fieldSize: 8,
    qualifying: 'The top four in each division, no bye: first played fourth and second played third in the division semifinals.',
    notes: [
      'Expansion in 1966-67 let the league fill an eight team bracket again. A year later the division semifinals went to best of seven, and from the 1968 playoffs every series in the tournament was best of seven, a state that lapsed in 1975 and did not come back until 2003.',
    ],
    sources: ['wpoverview', 'wp1966', 'fansidedreform', 'fansidedseries'],
  },
  {
    id: 'conferences',
    from: 1970,
    to: 1973,
    title: 'Two conferences of two divisions',
    fieldSize: 8,
    qualifying: 'Four teams from each conference, drawn from the two divisions inside it, playing conference semifinals and conference finals before the Finals.',
    notes: [
      'The 1970-71 season was the first with an Eastern and a Western Conference, each split into two divisions, the structure the league still uses. The field stayed at eight, so the change was to how the bracket was organised rather than how many got in.',
    ],
    sources: ['wpoverview', 'wp1970', 'fansidedreform'],
  },
  {
    id: 'ten',
    from: 1974,
    to: 1975,
    title: 'A first round for the fourth and fifth seeds',
    fieldSize: 10,
    qualifying: 'Five teams per conference. A new best of three first round matched the fourth and fifth seeds, and the winner met the top seed while the top three seeds waited.',
    notes: [
      'The first time the NBA had a round that not every playoff team played, and the origin of the modern idea of a first round as a separate stage.',
    ],
    sources: ['wpoverview', 'wp1974', 'fansidedreform', 'fansidedseries'],
  },
  {
    id: 'twelve',
    from: 1976,
    to: 1982,
    title: 'Twelve after the ABA merger',
    fieldSize: 12,
    qualifying: 'Six teams per conference. The two division winners in each conference got a bye; the other four played a best of three first round.',
    notes: [
      'The season after the ABA merger, the field grew from ten to twelve and the byes went to the division winners. This is the last period in which a first round series was best of three.',
    ],
    sources: ['wpoverview', 'wp1976', 'fansidedreform'],
  },
  {
    id: 'sixteen',
    from: 1983,
    to: 2001,
    title: 'Sixteen teams, no byes, best of five first round',
    fieldSize: 16,
    qualifying: 'Eight teams per conference, everyone plays the first round. First round best of five, every later round best of seven.',
    notes: [
      'The 1984 playoffs were the first with sixteen teams, and the field has been sixteen ever since. Byes vanished with the expansion, and the first round grew from best of three to best of five in the same stroke.',
      'The first round stayed best of five for nineteen seasons, which is the one thing about this format a modern viewer would find strange.',
    ],
    sources: ['wpoverview', 'wp1983', 'fansidedreform', 'fansidedseries', 'tickpick'],
  },
  {
    id: 'best-of-seven',
    from: 2002,
    to: 2003,
    title: 'Every round best of seven',
    fieldSize: 16,
    qualifying: 'Eight per conference, all four rounds best of seven.',
    notes: [
      'The first round was extended to best of seven for the 2003 playoffs, which is why an NBA champion has needed sixteen wins every spring since.',
    ],
    sources: ['wpoverview', 'wp2002', 'fansidedreform', 'fansidedseries'],
  },
  {
    id: 'division-floor',
    from: 2004,
    to: 2014,
    title: 'Division winners protected in the seeding',
    fieldSize: 16,
    qualifying: 'Eight per conference: each division winner plus the best remaining records, with a division winner guaranteed a seed no lower than a fixed floor whatever its record. By the time the rule was dropped that floor was the fourth seed.',
    notes: [
      'The rule arrived with the 2004-05 season, the first with the league at thirty teams after Charlotte joined and the divisions were redrawn. It meant a weak division champion could sit above a stronger team in the bracket, and the seeding was adjusted during the period before being removed altogether.',
      'What the rule protected was the seed, not home court: the 2015 change notes that a division winner seeded above a team with a better record did not get home court against it.',
    ],
    sources: ['wpoverview', 'wp2004', 'fansidedreform', 'espnseeding', 'nbaprseeding'],
  },
  {
    id: 'by-record',
    from: 2015,
    to: 2019,
    title: 'Seeded by record alone',
    fieldSize: 16,
    qualifying: 'The eight best records in each conference, seeded one to eight by record, with no automatic berth and no protected seed for a division winner.',
    notes: [
      'Approved unanimously in September 2015 after a season in which 51 win Portland took the fourth seed in the West as a division champion with the sixth best record in the conference.',
      'The 2020 season was finished inside a bubble at Walt Disney World after the pandemic stopped it in March: twenty two teams were invited, each played eight seeding games, and if the ninth placed team in a conference finished within four games of eighth, the two played off for the eighth seed, with the ninth needing to win twice and the eighth once. Memphis forced that in the West and Portland won it. The sixteen team bracket that followed was unchanged.',
    ],
    sources: ['wp2015', 'espnseeding', 'nbaprseeding', 'wpbubble', 'nbaplayin'],
  },
  {
    id: 'play-in',
    from: 2020,
    to: null,
    title: 'The play-in tournament',
    fieldSize: 16,
    qualifying: 'The top six in each conference go straight in. Seventh through tenth play a play-in: seventh hosts eighth for the seventh seed, ninth hosts tenth with the loser out, then the loser of the first game hosts the winner of the second for the eighth seed.',
    notes: [
      'First staged in May 2021, and approved a season at a time for 2020-21 and 2021-22 before the Board of Governors made it permanent in July 2022.',
      'The bracket itself is still sixteen teams and four best of seven rounds. What changed is who the last two seeds are: the seventh and eighth placed teams now have to keep their place, and the ninth and tenth have a way in that did not exist before.',
    ],
    sources: ['wp2020', 'nbaplayin', 'nbaprplayin', 'espnplayin'],
  },
];

export interface NbaLotteryEra {
  id: string;
  /** The year of the first draft this rule applied to. */
  year: number;
  title: string;
  text: string;
  /** Ids into NBA_PLAYOFF_SOURCES. At least two distinct publishers per era. */
  sources: string[];
}

/** The draft lottery's own history. Each era is a rule for how the top of
 *  the draft order is decided, verified against two publishers. */
export const NBA_LOTTERY: { intro: string; eras: NbaLotteryEra[] } = {
  intro: 'The lottery exists because of the playoffs: once a team knows it is out, the only thing left to play for is the draft, and the league has spent sixty years trying to make losing on purpose not worth it. Every rule below is a different answer to that one problem.',
  eras: [
    {
      id: 'coin-flip',
      year: 1966,
      title: 'The coin flip',
      text: 'From 1966 through 1984 the worst team in each conference flipped a coin for the first overall pick, and the loser picked second. Every other team drafted in reverse order of record. It kept the two worst teams from being certain of the top pick, and did nothing about the incentive to be one of those two.',
      sources: ['wplottery', 'nbalotterychanges', 'espnlottery'],
    },
    {
      id: 'envelopes',
      year: 1985,
      title: 'Envelopes in a drum',
      text: 'In 1985 the seven teams that missed the playoffs each had an envelope in a hopper, every one with the same chance, and the order they were drawn was the draft order for the first seven picks. The Knicks came out first and took Patrick Ewing. After the first lottery or two the rule was changed so the draw decided only the first three picks, with the rest of the non-playoff teams drafting in reverse order of record.',
      sources: ['wplottery', 'nbalotterychanges', 'nbalotteryexplainer'],
    },
    {
      id: 'weighted',
      year: 1990,
      title: 'Weighted chances',
      text: 'From the 1990 lottery the draw was weighted. Eleven teams took part, and the worst record held eleven of the 66 chances, the second worst ten, down to a single chance for the best team that missed the playoffs. The draw still decided three picks, so the worst team could fall no lower than fourth.',
      sources: ['wplottery', 'nbalotterychanges', 'nbalotteryexplainer'],
    },
    {
      id: 'ping-pong',
      year: 1994,
      title: 'A thousand combinations',
      text: 'In 1993 Orlando, which had missed the playoffs at 41-41, won the first pick with one chance in 66, about 1.5 percent, the second year running it had won the lottery. From 1994 the draw used fourteen numbered balls and four number combinations: 1,001 are possible, 1,000 are assigned, and the worst team held 250 of them, a 25 percent chance of the first pick, up from 16.7 percent. The pool later grew to fourteen teams, where it stands.',
      sources: ['wplottery', 'nbalotterychanges', 'nbalotteryexplainer', 'espnlottery', 'si2014'],
    },
    {
      id: 'flattened',
      year: 2019,
      title: 'Three teams at fourteen percent',
      text: 'Approved in September 2017 and first used in 2019: the three worst records each hold 14 percent of the combinations for the first pick, down from 25, 19.9 and 15.6, and the draw decides four picks rather than three, so the worst team can fall as low as fifth. It was the league trying to make the bottom of the standings less worth reaching, without giving up on rewarding a bad season at all.',
      sources: ['wplottery', 'nba2017lottery', 'espnlottery'],
    },
    {
      id: 'three-two-one',
      year: 2027,
      title: 'The 3-2-1 lottery',
      text: 'Approved 29 to 1 on 28 May 2026 and in force from the 2027 draft: sixteen teams in the lottery rather than fourteen. Teams that miss both the playoffs and the play-in get three balls each, except the three worst records, which are labelled draft relegated, lose a ball and hold two apiece, with a promise of no worse than the twelfth pick. The ninth and tenth placed play-in teams get two balls, and the two teams that lose the seventh versus eighth play-in game get one. The three worst teams have gone from the best odds in the room to worse than the teams just above them, which is the whole point.',
      sources: ['wplottery', 'nba2026lottery', 'espnlottery2026'],
    },
  ],
};

export function sourceById(id: string): NbaPlayoffSource | undefined {
  return NBA_PLAYOFF_SOURCES.find(s => s.id === id);
}

/** "1983-84 to 2001-02", "2020-21 onward", "1948-49". */
export function seasonLabel(year: number): string {
  return `${year}-${String((year + 1) % 100).padStart(2, '0')}`;
}

export function seasonRange(p: Pick<NbaPlayoffPeriod, 'from' | 'to'>): string {
  if (p.to === null) return `${seasonLabel(p.from)} onward`;
  if (p.to === p.from) return seasonLabel(p.from);
  return `${seasonLabel(p.from)} to ${seasonLabel(p.to)}`;
}

export function periodFor(year: number): NbaPlayoffPeriod {
  return NBA_PLAYOFF_PERIODS.find(p => year >= p.from && (p.to === null || year <= p.to)) ?? NBA_PLAYOFF_PERIODS[NBA_PLAYOFF_PERIODS.length - 1];
}
