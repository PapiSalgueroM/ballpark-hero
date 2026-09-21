export interface HofPlayer {
  id: string;
  sport: 'soccer' | 'nfl' | 'nba' | 'baseball' | 'hockey';
  anonymizedStats: string[];
  hints: string[];
  answer: string;
  verdict: 'hof' | 'borderline' | 'bust';
  funFact: string;
}

/**
 * Hall of Fame or Bust, the stat lines.
 *
 * ROUND 661, 2026-09-19, NOT FINISHED. Twenty of these twenty six entries
 * carried at least one false number. Several were somebody else's totals
 * outright: Jordan was shown with Kobe's 33,643 points, Ortiz with Jeter's
 * 3,465 hits and with Sammy Sosa's 609 home runs. The numbers below were
 * rewritten to fix that.
 *
 * THERE IS NO FENCE BEHIND THIS FILE YET. An earlier draft of this comment
 * said the pairs were recorded in scripts/data/triviaFactsVerified2026-09.json
 * and that scripts/simTriviaFacts.mjs held the file to them. Neither file
 * exists. Both are owed, on the shape of scripts/simSportsFacts.mjs, and until
 * they do nothing stops the next edit here putting a wrong number back. Treat
 * the numbers below as corrected but unpinned.
 *
 * Two rules that came out of the round and should survive it:
 *   1. A player who is still playing gets a floor ('43,000+ career points'),
 *      never an exact total. An exact total for an active man is a fact with
 *      an expiry date, and this file has no build step to refresh it.
 *   2. Anything that could not be two-sourced was cut rather than guessed.
 *      That is why some lines are shorter than they were. The one entry left
 *      untouched for want of sources is nhl-3, flagged in the round report.
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
    anonymizedStats: ['672 goals for one club', '4 Champions League trophies', '8 Ballon d\'Or awards', '1 World Cup'],
    hints: ['Left-footed forward', 'Played in Spain for over a decade', 'Argentinian'],
    answer: 'Lionel Messi',
    verdict: 'hof',
    funFact: 'The most decorated player in football history with 45+ senior trophies.',
  },
  {
    id: 'soc-2',
    sport: 'soccer',
    anonymizedStats: ['228 goals for one English club, a club record', '5 league titles in three countries', '1 Champions League', 'World Cup winner in 1998'],
    hints: ['Known for incredible speed', 'French international', 'Won trophies in France, Spain and England'],
    answer: 'Thierry Henry',
    verdict: 'hof',
    funFact: 'Arsenal\'s all-time leading scorer and an invincible.',
  },
  {
    id: 'soc-3',
    sport: 'soccer',
    anonymizedStats: ['18 goals in 722 games for one club', '9 La Liga titles', '3 Champions League trophies', '15 seasons at the same club'],
    hints: ['Defensive midfielder', 'Spanish international', 'Spent 15 years at one club in Spain before a move to MLS'],
    answer: 'Sergio Busquets',
    verdict: 'borderline',
    funFact: 'The invisible metronome, you don\'t notice him until he\'s gone.',
  },
  {
    id: 'soc-4',
    sport: 'soccer',
    anonymizedStats: ['158 goals for one English club', '150 Premier League goals', '1 Premier League title', '0 Champions League trophies'],
    hints: ['English striker', 'Known for pace and finishing', 'Played in England and Spain'],
    answer: 'Michael Owen',
    verdict: 'bust',
    funFact: 'Won the Ballon d\'Or at 22 but injuries derailed his career trajectory.',
  },
  {
    id: 'soc-5',
    sport: 'soccer',
    anonymizedStats: ['900+ career goals', '5 Champions League trophies', '5 Ballon d\'Or awards', 'League titles in more than one country'],
    hints: ['Portuguese forward', 'Played top-flight football in four countries after leaving Portugal', 'Iconic header and free-kick taker'],
    answer: 'Cristiano Ronaldo',
    verdict: 'hof',
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
    funFact: 'The 199th overall pick became the greatest winner in NFL history.',
  },
  {
    id: 'nfl-2',
    sport: 'nfl',
    anonymizedStats: ['14,918 career rushing yards', '126 total touchdowns', '4x first-team All-Pro', '1 MVP award'],
    hints: ['Running back who also returned kicks', 'Played in the 2000s and 2010s', 'Spent most of career in Minnesota'],
    answer: 'Adrian Peterson',
    verdict: 'hof',
    funFact: 'Rushed for 2,097 yards in 2012, just 8 shy of the all-time record.',
  },
  {
    id: 'nfl-3',
    sport: 'nfl',
    anonymizedStats: ['4,083 career passing yards', '18 touchdowns', '23 interceptions', '3 NFL seasons'],
    hints: ['First overall draft pick', 'Played his college ball in the SEC', 'Career cut short by poor play and injuries'],
    answer: 'JaMarcus Russell',
    verdict: 'bust',
    funFact: 'Considered one of the biggest draft busts in NFL history, out of the league by age 25.',
  },
  {
    id: 'nfl-4',
    sport: 'nfl',
    anonymizedStats: ['71,940 career passing yards', '539 touchdowns', '2 Super Bowl wins', '5 MVP awards'],
    hints: ['Son of an NFL quarterback', 'Played for 2 teams in his career', 'Known for audibles at the line'],
    answer: 'Peyton Manning',
    verdict: 'hof',
    funFact: 'Retired with the most passing touchdowns in NFL history at the time.',
  },
  {
    id: 'nfl-5',
    sport: 'nfl',
    anonymizedStats: ['22,895 career receiving yards', '197 receiving touchdowns', '13x Pro Bowl', 'Played 20 NFL seasons'],
    hints: ['Wide receiver known for celebrations', 'Spent prime years in San Francisco', 'Set the all-time TD record'],
    answer: 'Jerry Rice',
    verdict: 'hof',
    funFact: 'His records are considered virtually unbreakable in modern football.',
  },

  // ── NBA ──
  {
    id: 'nba-1',
    sport: 'nba',
    anonymizedStats: ['32,292 career points', '6 NBA championships', '5 MVP awards', '10 scoring titles'],
    hints: ['Shooting guard', 'Played in the 1990s dynasty', 'Won two three-peats'],
    answer: 'Michael Jordan',
    verdict: 'hof',
    funFact: 'Perfect 6-0 in NBA Finals, never lost a championship series.',
  },
  {
    id: 'nba-2',
    sport: 'nba',
    anonymizedStats: ['22,000+ career points', '6,000+ career assists', '9 All-Star selections', '0 NBA championships'],
    hints: ['Point guard from the 2010s', 'Known for deep three-pointers', 'Played in the Pacific Northwest'],
    answer: 'Damian Lillard',
    verdict: 'borderline',
    funFact: 'Famous for multiple series-ending buzzer-beaters in the playoffs.',
  },
  {
    id: 'nba-3',
    sport: 'nba',
    anonymizedStats: ['9,247 career points', '4,494 rebounds', '8 seasons played', '#1 overall pick'],
    hints: ['Center from China', 'Massive marketing draw', 'Injuries ended career early'],
    answer: 'Yao Ming',
    verdict: 'borderline',
    funFact: 'Inducted into the Hall of Fame largely for his cultural impact on basketball globally.',
  },
  {
    id: 'nba-4',
    sport: 'nba',
    anonymizedStats: ['43,000+ career points', '4 NBA championships', '4 Finals MVPs', '20+ All-Star selections'],
    hints: ['Forward who entered the draft from high school', 'Won titles with three different franchises', 'Born in Akron, Ohio'],
    answer: 'LeBron James',
    verdict: 'hof',
    funFact: 'The NBA\'s all-time leading scorer, surpassing Kareem Abdul-Jabbar.',
  },
  {
    id: 'nba-5',
    sport: 'nba',
    anonymizedStats: ['840 career points', '656 rebounds', '3 seasons played', '#1 overall pick'],
    hints: ['Big man drafted in 2007', 'Struggled to stay healthy', 'Played for Portland'],
    answer: 'Greg Oden',
    verdict: 'bust',
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
    funFact: 'The all-time home run king has never been inducted into the Hall of Fame.',
  },
  {
    id: 'mlb-2',
    sport: 'baseball',
    anonymizedStats: ['2,472 career hits', '541 home runs', '1,768 RBIs', '20 seasons played'],
    hints: ['Dominican designated hitter', 'Played in the AL East', 'Known as "Big Papi"'],
    answer: 'David Ortiz',
    verdict: 'hof',
    funFact: 'Inducted on his first ballot despite being a designated hitter for most of his career.',
  },
  {
    id: 'mlb-3',
    sport: 'baseball',
    anonymizedStats: ['4,256 career hits', '.303 batting average', '3 batting titles', '17 All-Star selections'],
    hints: ['Switch hitter who played 24 seasons', 'Managed after playing', 'Removed from baseball\'s ineligible list in 2025'],
    answer: 'Pete Rose',
    verdict: 'borderline',
    funFact: 'Baseball\'s all-time hits leader was banned in 1989 for betting on games he managed. MLB removed him from the ineligible list in 2025, after his death, and he is not in the Hall of Fame.',
  },
  {
    id: 'mlb-4',
    sport: 'baseball',
    anonymizedStats: ['42 career wins', '3.51 ERA', '#2 overall draft pick', '5 MLB seasons'],
    hints: ['Pitcher drafted in 2001', 'Highly touted prospect', 'Never lived up to expectations'],
    answer: 'Mark Prior',
    verdict: 'bust',
    funFact: 'Was considered a can\'t-miss prospect but injuries destroyed a promising career.',
  },
  {
    id: 'mlb-5',
    sport: 'baseball',
    anonymizedStats: ['696 career home runs', '2,086 RBIs', '3 MVP awards', '14 All-Star selections'],
    hints: ['Shortstop turned third baseman', 'Played for 3 AL teams', 'Career overshadowed by PED suspension'],
    answer: 'Alex Rodriguez',
    verdict: 'borderline',
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
    funFact: 'Holds or shares 61 NHL records, and his number 99 is retired league-wide.',
  },
  {
    id: 'nhl-2',
    sport: 'hockey',
    anonymizedStats: ['766 career goals', '1,155 career assists', '1,921 career points', '1,733 games played'],
    hints: ['Right wing with a famous mullet', 'Czech-born player', 'Played mostly in Pittsburgh'],
    answer: 'Jaromir Jagr',
    verdict: 'hof',
    funFact: 'Played professionally until age 49 across multiple leagues worldwide.',
  },
  {
    id: 'nhl-3',
    sport: 'hockey',
    anonymizedStats: ['44 career goals', '65 career points', '#1 overall pick', '3 NHL seasons'],
    hints: ['Russian forward drafted in 2012', 'Played for a struggling expansion-era team', 'Returned to the KHL'],
    answer: 'Nail Yakupov',
    verdict: 'bust',
    funFact: 'The top pick ahead of a stacked 2012 draft class, never found his NHL footing.',
  },
  {
    id: 'nhl-4',
    sport: 'hockey',
    anonymizedStats: ['801 career goals', '1,850 career points', '4 Stanley Cups', '6 Hart Trophies'],
    hints: ['Right wing from Canada', 'Played 26 NHL seasons', 'Known as "Mr. Hockey"'],
    answer: 'Gordie Howe',
    verdict: 'hof',
    funFact: 'Played in the NHL across five different decades, from the 1940s to the 1980s.',
  },
  {
    id: 'nhl-5',
    sport: 'hockey',
    anonymizedStats: ['650+ career goals', '1,100+ career assists', '3 Stanley Cups', '2 Conn Smythe Trophies'],
    hints: ['Center from Canada', 'Wore #87', 'Drafted first overall in 2005'],
    answer: 'Sidney Crosby',
    verdict: 'hof',
    funFact: 'Won back-to-back Stanley Cups and is considered the best player of his generation.',
  },
];

export default hofPlayers;
