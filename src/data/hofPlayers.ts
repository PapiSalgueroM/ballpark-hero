export interface HofPlayer {
  id: string;
  sport: 'soccer' | 'nfl' | 'nba' | 'baseball' | 'hockey';
  anonymizedStats: string[];
  hints: string[];
  answer: string;
  verdict: 'hof' | 'borderline' | 'bust';
  /**
   * The real Hall of Fame record, which is a fact, kept apart from the
   * verdict, which is the game's own call. A year means he went into that
   * hall that year; a null year means he is not in it (as of the date its
   * record entry carries). null means no hall fits the card: soccer has no
   * single Hall of Fame, so the reveal says the call is all ours.
   */
  hall: { name: string; year: number | null } | null;
  funFact: string;
}

/**
 * Hall of Fame or Bust, the stat lines.
 *
 * Round 661 (2026-09-28). At least eighteen of these twenty five entries
 * carried a false line, several of them somebody else's totals: Jordan was shown
 * with Kobe's 33,643 points, Ortiz with Jeter's 3,465 hits and Sammy Sosa's
 * 609 home runs, Howe with no Stanley Cups and Yakupov with half his goals.
 *
 * Every line below, stats, hints and fun fact, is pinned word for word to
 * scripts/data/triviaFactsVerified2026-09.json, where each one carries two
 * sources on two hosts (an official one where the sport has one, or the
 * reason it could not), and scripts/simTriviaFacts.mjs fails if the two ever
 * disagree. Change a line here and the fence goes red until the record holds
 * the new text and its sources.
 *
 * Three rules that came out of the round:
 *   1. A career total for a player who is still playing is a floor ('43,000+
 *      career points'). Any other count on his card (titles, awards, a
 *      World Cup) carries the date it was checked, its asOf in the record,
 *      because it is a fact with an expiry date and this file has no build
 *      step to refresh it. The fence fails on a count that has neither.
 *   2. A line that could not be two-sourced was rewritten to one that could,
 *      never shipped on one source.
 *   3. The verdict is the game's own call on the career, and the reveal says
 *      so ('Our call'). Whether he is really in a Hall of Fame is the hall
 *      field, a sourced fact shown beside it. A player who is really in one
 *      is never called a bust or borderline: Michael Owen was a bust here
 *      until the Round 661 fix, while he has been in the National Football
 *      Museum Hall of Fame since 2014, and the reveal used to say "Official
 *      verdict: Hall of Fame" for Brady, LeBron and Crosby, none of whom is
 *      in.
 *
 * The array length is load bearing: useHofOrBust picks with
 * getDateSeed() % hofPlayers.length, so adding or removing an entry moves
 * every player's daily. Edit entries in place.
 */
const hofPlayers: HofPlayer[] = [
  // ── SOCCER ──
  {
    id: 'soc-1',
    sport: 'soccer',
    anonymizedStats: ['672 goals for one club', '10 La Liga titles', '8 Ballon d\'Or awards', '1 World Cup'],
    hints: ['Won four Champions League titles with one club', 'Played in Spain for over a decade', 'Argentinian'],
    answer: 'Lionel Messi',
    verdict: 'hof',
    hall: null,
    funFact: 'Became the most decorated player in football history in 2023.',
  },
  {
    id: 'soc-2',
    sport: 'soccer',
    anonymizedStats: ['228 goals for one English club, a club record', '5 league titles in three countries', '4 Premier League Golden Boots', 'World Cup winner in 1998'],
    hints: ['Known for incredible speed', 'French international', 'Won trophies in France, Spain and England'],
    answer: 'Thierry Henry',
    verdict: 'hof',
    hall: { name: 'Premier League Hall of Fame', year: 2021 },
    funFact: 'Arsenal\'s all-time leading scorer and an invincible.',
  },
  {
    id: 'soc-3',
    sport: 'soccer',
    anonymizedStats: ['722 games for one club', '9 La Liga titles', '3 Champions League trophies', 'World Cup and Euro winner'],
    hints: ['Defensive midfielder', 'Spanish international', 'Moved to MLS in 2023 after his whole career at one Spanish club'],
    answer: 'Sergio Busquets',
    verdict: 'borderline',
    hall: null,
    funFact: 'Third on his club\'s all-time appearance list, behind Xavi and Messi.',
  },
  {
    id: 'soc-4',
    sport: 'soccer',
    anonymizedStats: ['158 goals for one English club', '150 Premier League goals', '1 Premier League title', '1 Ballon d\'Or'],
    hints: ['English striker', 'Known for pace and finishing', 'Played in England and Spain'],
    answer: 'Michael Owen',
    verdict: 'hof',
    hall: { name: 'National Football Museum Hall of Fame', year: 2014 },
    funFact: 'Won the Ballon d\'Or in 2001, but hamstring injuries dogged the rest of his career.',
  },
  {
    id: 'soc-5',
    sport: 'soccer',
    anonymizedStats: ['900+ career goals', '5 Champions League trophies', '5 Ballon d\'Or awards', 'League titles in more than one country'],
    hints: ['Portuguese forward', 'Played top-flight football in four countries after leaving Portugal', 'The first man to score at six World Cups'],
    answer: 'Cristiano Ronaldo',
    verdict: 'hof',
    hall: null,
    funFact: 'All-time top scorer in men\'s international football history.',
  },

  // ── NFL ──
  {
    id: 'nfl-1',
    sport: 'nfl',
    anonymizedStats: ['89,214 career passing yards', '649 passing touchdowns', '7 Super Bowl wins', '3 MVP awards'],
    hints: ['Quarterback drafted in the 6th round', 'Played until age 45', 'New England and Tampa Bay'],
    answer: 'Tom Brady',
    verdict: 'hof',
    hall: { name: 'Pro Football Hall of Fame', year: null },
    funFact: 'The 199th overall pick went on to win seven Super Bowls.',
  },
  {
    id: 'nfl-2',
    sport: 'nfl',
    anonymizedStats: ['14,918 career rushing yards', '126 total touchdowns', '4x first-team All-Pro', '1 MVP award'],
    hints: ['Running back who also returned kicks', 'Played in the 2000s and 2010s', 'Spent most of career in Minnesota'],
    answer: 'Adrian Peterson',
    verdict: 'hof',
    hall: { name: 'Pro Football Hall of Fame', year: null },
    funFact: 'Rushed for 2,097 yards in 2012, just 8 shy of the all-time record.',
  },
  {
    id: 'nfl-3',
    sport: 'nfl',
    anonymizedStats: ['4,083 career passing yards', '18 touchdowns', '23 interceptions', '3 NFL seasons'],
    hints: ['First overall draft pick', 'Played his college ball in the SEC', 'Released by his only NFL team after three seasons'],
    answer: 'JaMarcus Russell',
    verdict: 'bust',
    hall: { name: 'Pro Football Hall of Fame', year: null },
    funFact: 'Considered one of the biggest draft busts in NFL history, out of the league by age 25.',
  },
  {
    id: 'nfl-4',
    sport: 'nfl',
    anonymizedStats: ['71,940 career passing yards', '539 touchdowns', '2 Super Bowl wins', '5 MVP awards'],
    hints: ['Son of an NFL quarterback', 'Played for 2 teams in his career', 'Drafted first overall in 1998'],
    answer: 'Peyton Manning',
    verdict: 'hof',
    hall: { name: 'Pro Football Hall of Fame', year: 2021 },
    funFact: 'Retired with the most passing touchdowns in NFL history at the time.',
  },
  {
    id: 'nfl-5',
    sport: 'nfl',
    anonymizedStats: ['22,895 career receiving yards', '197 receiving touchdowns', '13x Pro Bowl', 'Played 20 NFL seasons'],
    hints: ['Wide receiver known for his work ethic', 'Spent prime years in San Francisco', 'Set the all-time TD record'],
    answer: 'Jerry Rice',
    verdict: 'hof',
    hall: { name: 'Pro Football Hall of Fame', year: 2010 },
    funFact: 'Still holds the NFL career records for receiving yards and total touchdowns.',
  },

  // ── NBA ──
  {
    id: 'nba-1',
    sport: 'nba',
    anonymizedStats: ['32,292 career points', '6 NBA championships', '5 MVP awards', '10 scoring titles'],
    hints: ['Shooting guard', 'Played in the 1990s dynasty', 'Won two three-peats'],
    answer: 'Michael Jordan',
    verdict: 'hof',
    hall: { name: 'Naismith Hall of Fame', year: 2009 },
    funFact: 'Perfect 6-0 in NBA Finals, never lost a championship series.',
  },
  {
    id: 'nba-2',
    sport: 'nba',
    anonymizedStats: ['22,000+ career points', '6,000+ career assists', '9+ All-Star selections', '1 Rookie of the Year award'],
    hints: ['Point guard from the 2010s', 'Known for deep three-pointers', 'Played in the Pacific Northwest'],
    answer: 'Damian Lillard',
    verdict: 'borderline',
    hall: { name: 'Naismith Hall of Fame', year: null },
    funFact: 'Famous for multiple series-ending buzzer-beaters in the playoffs.',
  },
  {
    id: 'nba-3',
    sport: 'nba',
    anonymizedStats: ['9,247 career points', '4,494 rebounds', '8 seasons played', '#1 overall pick'],
    hints: ['Center from China', 'Played his whole NBA career in Houston', 'Injuries ended career early'],
    answer: 'Yao Ming',
    verdict: 'hof',
    hall: { name: 'Naismith Hall of Fame', year: 2016 },
    funFact: 'Inducted into the Hall of Fame in 2016 after just eight NBA seasons.',
  },
  {
    id: 'nba-4',
    sport: 'nba',
    anonymizedStats: ['43,000+ career points', '4 NBA championships', '4 Finals MVPs', '20+ All-Star selections'],
    hints: ['Forward who entered the draft from high school', 'Won titles with three different franchises', 'Born in Akron, Ohio'],
    answer: 'LeBron James',
    verdict: 'hof',
    hall: { name: 'Naismith Hall of Fame', year: null },
    funFact: 'The NBA\'s all-time leading scorer, surpassing Kareem Abdul-Jabbar.',
  },
  {
    id: 'nba-5',
    sport: 'nba',
    anonymizedStats: ['840 career points', '656 rebounds', '3 seasons played', '#1 overall pick'],
    hints: ['Big man drafted in 2007', 'Struggled to stay healthy', 'Played for Portland'],
    answer: 'Greg Oden',
    verdict: 'bust',
    hall: { name: 'Naismith Hall of Fame', year: null },
    funFact: 'Drafted ahead of Kevin Durant, injuries made it one of the biggest what-ifs ever.',
  },

  // ── BASEBALL ──
  {
    id: 'mlb-1',
    sport: 'baseball',
    anonymizedStats: ['762 career home runs', '1,996 RBIs', '7 MVP awards', '14 All-Star selections'],
    hints: ['Left fielder', 'Career clouded by controversy', 'Played for Pittsburgh and San Francisco'],
    answer: 'Barry Bonds',
    verdict: 'borderline',
    hall: { name: 'Baseball Hall of Fame', year: null },
    funFact: 'The all-time home run king has never been inducted into the Hall of Fame.',
  },
  {
    id: 'mlb-2',
    sport: 'baseball',
    anonymizedStats: ['2,472 career hits', '541 home runs', '1,768 RBIs', '20 seasons played'],
    hints: ['Dominican designated hitter', 'Played in the AL East', 'Known as "Big Papi"'],
    answer: 'David Ortiz',
    verdict: 'hof',
    hall: { name: 'Baseball Hall of Fame', year: 2022 },
    funFact: 'Inducted on his first ballot despite being a designated hitter for most of his career.',
  },
  {
    id: 'mlb-3',
    sport: 'baseball',
    anonymizedStats: ['4,256 career hits', '.303 batting average', '3 batting titles', '17 All-Star selections'],
    hints: ['Switch hitter who played 24 seasons', 'Managed after playing', 'Removed from baseball\'s ineligible list in 2025'],
    answer: 'Pete Rose',
    verdict: 'borderline',
    hall: { name: 'Baseball Hall of Fame', year: null },
    funFact: 'Baseball\'s all-time hits leader was banned in 1989 for betting on games he managed. MLB removed him from the ineligible list in 2025, after his death, and he is not in the Hall of Fame.',
  },
  {
    id: 'mlb-4',
    sport: 'baseball',
    anonymizedStats: ['42 career wins', '3.51 ERA', '#2 overall draft pick', '5 MLB seasons'],
    hints: ['Pitcher drafted in 2001', 'Highly touted prospect', 'Never lived up to expectations'],
    answer: 'Mark Prior',
    verdict: 'bust',
    hall: { name: 'Baseball Hall of Fame', year: null },
    funFact: 'Was considered a can\'t-miss prospect but injuries destroyed a promising career.',
  },
  {
    id: 'mlb-5',
    sport: 'baseball',
    anonymizedStats: ['696 career home runs', '2,086 RBIs', '3 MVP awards', '14 All-Star selections'],
    hints: ['Shortstop turned third baseman', 'Played for 3 AL teams', 'Career overshadowed by PED suspension'],
    answer: 'Alex Rodriguez',
    verdict: 'borderline',
    hall: { name: 'Baseball Hall of Fame', year: null },
    funFact: 'One of the most talented players ever, but PED scandals may keep him out of Cooperstown.',
  },

  // ── HOCKEY ──
  {
    id: 'nhl-1',
    sport: 'hockey',
    anonymizedStats: ['894 career goals', '2,857 career points', '4 Stanley Cups', '9 Hart Trophies'],
    hints: ['Center from Canada', 'Known as "The Great One"', 'Played in the 1980s-90s'],
    answer: 'Wayne Gretzky',
    verdict: 'hof',
    hall: { name: 'Hockey Hall of Fame', year: 1999 },
    funFact: 'Scored 92 goals in 1981-82, still the NHL single-season record.',
  },
  {
    id: 'nhl-2',
    sport: 'hockey',
    anonymizedStats: ['766 career goals', '1,155 career assists', '1,921 career points', '1,733 games played'],
    hints: ['Right wing known for playmaking', 'Czech-born player', 'Spent his longest NHL stint in Pittsburgh'],
    answer: 'Jaromir Jagr',
    verdict: 'hof',
    hall: { name: 'Hockey Hall of Fame', year: null },
    funFact: 'Played professionally at age 53, for his hometown club in Kladno.',
  },
  {
    id: 'nhl-3',
    sport: 'hockey',
    anonymizedStats: ['62 career goals', '136 career points', '#1 overall pick', '6 NHL seasons'],
    hints: ['Russian forward drafted in 2012', 'Spent four seasons in Edmonton before moving on', 'Returned to the KHL'],
    answer: 'Nail Yakupov',
    verdict: 'bust',
    hall: { name: 'Hockey Hall of Fame', year: null },
    funFact: 'The top pick ahead of a stacked 2012 draft class, never found his NHL footing.',
  },
  {
    id: 'nhl-4',
    sport: 'hockey',
    anonymizedStats: ['801 career goals', '1,850 career points', '4 Stanley Cups', '6 Hart Trophies'],
    hints: ['Right wing from Canada', 'Played 26 NHL seasons', 'Known as "Mr. Hockey"'],
    answer: 'Gordie Howe',
    verdict: 'hof',
    hall: { name: 'Hockey Hall of Fame', year: 1972 },
    funFact: 'Played in the NHL across five different decades, from the 1940s to the 1980s.',
  },
  {
    id: 'nhl-5',
    sport: 'hockey',
    anonymizedStats: ['650+ career goals', '1,100+ career assists', '3 Stanley Cups', '2 Conn Smythe Trophies'],
    hints: ['Center from Canada', 'Wore #87', 'Drafted first overall in 2005'],
    answer: 'Sidney Crosby',
    verdict: 'hof',
    hall: { name: 'Hockey Hall of Fame', year: null },
    funFact: 'Won back-to-back Stanley Cups in 2016 and 2017, and the Conn Smythe both times.',
  },
];

export default hofPlayers;
