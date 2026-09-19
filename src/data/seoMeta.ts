/**
 * Round 642: the search result title and meta description for every game in
 * src/data/gameRegistry.ts, keyed by the game's path.
 *
 * This lives in its own module, not on GameDef, for page weight. The registry
 * sits in the entry chunk every page loads, and these 127 titles and
 * descriptions measured about 28 KB there (7.5 KB gzipped), leaving
 * /soccer-career 8 KB under its weight ceiling. Every page needs exactly one
 * entry, so src/components/seo/PageSeo.tsx loads this with a dynamic import
 * into its own small chunk, renders the page's own props until it lands, and
 * reads it from a module level cache after that. The prerenderer waits for
 * the head to settle, so the saved pages a crawler reads carry this text.
 *
 * The rules (scripts/simSeoTitles.mjs fences all of them): the title is
 * written WITHOUT " | DoUKnowBall", which PageSeo adds, and carries the game's
 * label exactly once plus a sport or league word and the kind of game, and
 * aims for 46 characters so the brand still fits in 60 (PageSeo drops the
 * brand from a longer one). The description is 120 to 158
 * characters, says "free" and the sport, and states nothing the game's guide
 * or page does not. No dashes, and no hyphen outside the label.
 */
export interface SeoMeta {
  title: string;
  description: string;
}

export const SEO_META: Record<string, SeoMeta> = {
  '/budget-builder': {
    title: '$1B Budget Builder: Soccer Squad Building Game',
    description: 'You get $1 billion and real market values. Pick a formation, sign eleven soccer players and see what rating your money actually bought. Free, no sign up.',
  },
  '/rebuild': {
    title: 'Rebuild Challenge: Soccer Club Management Game',
    description: 'Take over a real club, spin the wheel for each shirt, keep the player or sell him and answer to the board. Free soccer rebuild game for up to four players.',
  },
  '/dart-draft': {
    title: 'Dart Draft: Throw Darts, Draft a Soccer XI',
    description: 'Call a position, throw a timed dart at a real world map and draft a real footballer from the country you hit. Eleven throws build your XI. Free soccer game.',
  },
  '/career-ladder': {
    title: 'Career Ladder: Guess the Soccer Player Quiz',
    description: "A mystery footballer's career appears one club at a time, earliest first. Name him before the ladder runs out. Free daily soccer quiz plus unlimited play.",
  },
  '/who-am-i': {
    title: 'Who Am I? Guess the Secret Soccer Player Game',
    description: 'Name any footballer and get a similarity score from 0 to 100 against the secret player, with clues on club, nation, position, age and value. Free soccer game.',
  },
  '/club-manager': {
    title: 'Club Manager: Free Football Management Game',
    description: 'Manage any of 330 real clubs across 20 leagues, today or in a real past season. Transfers, tactics, the board and the sack race. Free soccer management sim.',
  },
  '/soccer-conquest': {
    title: 'Soccer Conquest: Europe Imperialism Map Game',
    description: "96 clubs from the top five leagues share one map of Europe, and every winner annexes the loser's whole empire until one club rules. Free soccer map game.",
  },
  '/stadium-tycoon': {
    title: 'Stadium Tycoon: Free Idle Soccer Club Game',
    description: 'Grow a tiny football club into an empire with live toy matches, ten divisions and a staff payroll. It keeps earning while you are away. Free idle soccer game.',
  },
  '/wonderkid-factory': {
    title: 'Wonderkid Factory: Idle Soccer Academy Game',
    description: 'Scout generated kids, coach them toward hidden ceilings and sell each one at the perfect moment. A free idle football academy game with no real players.',
  },
  '/world-xi': {
    title: 'World XI: International Soccer Squad Quiz',
    description: 'Pick a formation, spin in 11 random countries and name a real footballer from each nation who fits the slot. Optional timer. Free soccer trivia game.',
  },
  '/player-bingo': {
    title: 'Player Bingo: Football Trivia Bingo Game',
    description: 'Real footballers appear one at a time, name only. Tap the square each one fits and complete a line on the 5x5 board before three strikes. Free soccer bingo.',
  },
  '/sports-bingo': {
    title: 'Sports Bingo: Soccer Pack Opening Bingo Game',
    description: 'Open timed packs of real players and mark every square on your soccer bingo card they satisfy before the pack closes. Daily, unlimited or race a CPU. Free.',
  },
  '/alphabet-sprint': {
    title: 'Alphabet Sprint: Timed Soccer Player Name Quiz',
    description: 'A letter drops and you name a footballer whose surname starts with it before the clock runs out. Streak bonuses, no repeats. Free soccer trivia against time.',
  },
  '/clue-auction': {
    title: 'Clue Auction: Mystery Soccer Player Game',
    description: 'A secret footballer, a bank of 100 points and clues for sale. Buy what you need, guess when you dare and keep whatever is left. Free soccer guessing game.',
  },
  '/rarity-round': {
    title: 'Rarity Round: Rarest Answer Wins Soccer Quiz',
    description: 'Name a valid soccer answer nobody else would think of, because the obvious one scores worst. Five rounds, real data, plus a Crowd Says mode. Free and daily.',
  },
  '/missing-xi': {
    title: 'Missing XI: Guess the Missing Soccer Player',
    description: 'A famous real starting lineup with one player blanked out. Name the missing man in three guesses. Free daily soccer puzzle plus an unlimited archive.',
  },
  '/sign-the-player': {
    title: 'Sign the Player: Soccer Transfer Auction Game',
    description: 'Outbid two AI moguls with a billion pounds each for real footballers, fill your XI, then let a simulated mini league settle it. Free soccer auction game.',
  },
  '/footle': {
    title: 'Footle: Daily Soccer Player Guessing Game',
    description: 'Guess the mystery soccer player in eight tries. Colored tiles and arrows compare every guess on club, age, number and more. Free daily football puzzle.',
  },
  '/career': {
    title: 'Career Quiz: Guess the Soccer Player by Clubs',
    description: "A footballer's whole career sits there season by season with the boxes covered. Reveal as few clubs and stats as you can and name him. Free soccer quiz.",
  },
  '/higher-lower': {
    title: 'Higher or Lower: Soccer Career Stats Game',
    description: "Your player's stats are face up and the challenger's are hidden. Pick appearances, goals or caps where yours wins and keep the streak going. Free soccer game.",
  },
  '/connections': {
    title: 'Connections: Soccer Player Grouping Puzzle',
    description: 'Sixteen soccer players, four hidden groups of four. Sort every name into its secret category before your lives run out. A free football trivia puzzle.',
  },
  '/build-your-xi': {
    title: 'Build Your XI: Soccer Lineup Builder Game',
    description: 'A slot machine gives each position a random club or country. Name a player who fits each slot, then an AI grades your XI and a season plays out. Free soccer.',
  },
  '/football-connect-4': {
    title: 'Connect 4: Soccer Trivia Grid Game',
    description: 'Classic four in a row where every disc costs a soccer answer. Name a player who fits the column and the row to claim the cell. Free two player trivia game.',
  },
  '/free-kick': {
    title: 'Free Kick: Bend It Past the Wall Soccer Game',
    description: 'Aim, bend and time your power over ten free kicks, past a growing wall and a keeper who reads you. Daily and unlimited. A free soccer skill game to play.',
  },
  '/soccer-grid': {
    title: 'Soccer Grid: Daily Football Player Grid Puzzle',
    description: 'Fill the daily 3x3 board with players who match both the row and the column. Rarity scores reward picks nobody else made. Free soccer trivia grid game.',
  },
  '/world-cup-bracket': {
    title: '2026 Bracket: World Cup Soccer Predictor',
    description: 'Build your 2026 World Cup bracket, every group and knockout round plus the awards, then score it against how the tournament really went. Free soccer game.',
  },
  '/soccer-career': {
    title: 'Soccer Career: Free Football Career Simulator',
    description: 'Start at 16 in a youth academy and live a whole soccer career: transfers, trophies, feuds, scandals and a legacy verdict. A free football life sim game.',
  },
  '/fantasy-draft': {
    title: 'Fantasy Draft: Soccer XI Draft Against the AI',
    description: "Take turns with an AI rival drafting from one player pool under the day's squad rule, then a season is simulated and votes pick the winner. Free soccer draft.",
  },
  '/transfer-path': {
    title: 'Transfer Path: Connect Soccer Players Puzzle',
    description: 'Link two footballers through real teammates, where every step needs the same club in the same season. Six degrees of separation for soccer, free and daily.',
  },
  '/squad-deal': {
    title: 'Squad Deal: Blind Box Soccer Squad Builder',
    description: "Every position is a wall of mystery boxes. Claim one blind, dodge the banker's offers, then simulate your soccer squad and see the grade. Free team builder.",
  },
  '/search-and-discard': {
    title: 'Search and Discard: Soccer Squad Duel Game',
    description: 'Two managers share one pool of real footballers. Search three, keep one, bin the rest for good, then a simulated season settles it. Free soccer duel vs CPU.',
  },
  '/gauntlet-draft': {
    title: 'Gauntlet Draft: Soccer Draft and Knockout Cup',
    description: 'Pick your XI from five real players per slot, then survive a five round knockout cup against stronger and stronger teams. Free daily soccer draft game.',
  },
  '/player-stock-market': {
    title: 'Player Stock Market: Soccer Investing Game',
    description: 'Buy an XI in a real past season from anonymous stat cards, then roll the years forward and watch the real market values move. Free soccer stats game.',
  },
  '/perfect-season-nfl': {
    title: '17-0 Perfect Season: NFL Football Draft Sim',
    description: 'Spin real pro football team seasons from 1999 to 2024, draft a cross era offense and simulate a 17 game season. Can you go unbeaten? Free NFL game.',
  },
  '/front-office': {
    title: 'NFL Front Office: Football GM Simulator',
    description: 'Take over any of the 32 teams with real rosters and run it all: the cap, free agency, trades and the draft. Chase a dynasty in this free NFL GM sim.',
  },
  '/nfl-my-career': {
    title: 'NFL My Career: Football Career Simulator',
    description: 'Create a prospect, get drafted by a real NFL team and live a whole career of stat lines, contracts, injuries and rings. Free pro football life sim.',
  },
  '/football-grid': {
    title: 'NFL Grid: Daily Pro Football Trivia Grid',
    description: 'Name a player for each cell of the daily 3x3 NFL grid who fits both the row and the column. Rarity scores reward deep cuts. Free football trivia.',
  },
  '/nfl-career': {
    title: 'NFL Career Path: Guess the Football Player',
    description: 'One mystery NFL player, six career clues from draft round to team history. Guess early for a bigger score. Free daily pro football trivia game.',
  },
  '/nfl-higher-lower': {
    title: 'NFL Higher or Lower: Football Stats Game',
    description: 'Two NFL stars, one career stat. Pick who has the bigger number across touchdowns, receptions, rushing yards and more. Free daily football trivia.',
  },
  '/nfl-connections': {
    title: 'NFL Connections: Football Grouping Puzzle',
    description: 'Twenty NFL players hide four groups of five: a franchise, a college, a draft slot or a milestone. Find them before you run out. Free daily football puzzle.',
  },
  '/nfl-connect-4': {
    title: 'NFL Connect 4: Football Trivia Grid Game',
    description: 'Four in a row, but every piece costs an NFL answer. Name a player who matches the column and the row where it lands to claim the cell. Free football trivia.',
  },
  '/missing-eleven': {
    title: 'Missing Eleven: Super Bowl Lineup NFL Quiz',
    description: 'A real Super Bowl starting lineup, offense or defense, with one name blanked out. Three guesses to name who started. Free daily NFL football quiz.',
  },
  '/conquest': {
    title: 'NFL Conquest: Football Imperialism Map Game',
    description: "America split into 32 NFL empires. Every winner annexes the loser's whole territory until one team rules the map. Free football strategy game.",
  },
  '/nfl-gauntlet-draft': {
    title: 'Gauntlet Draft: NFL Offense Draft Challenge',
    description: 'Draft a seven man NFL offense, one slot at a time from five real players, then survive a five round knockout cup. Free daily football draft game.',
  },
  '/college-grid': {
    title: 'College Grid: Daily College Football Trivia',
    description: 'A daily 3x3 college football grid. Name a player who fits the school and the column, from positions to Heisman winners and draft picks. Free CFB trivia.',
  },
  '/guess-the-college': {
    title: 'Guess The College: D1 College Sports Quiz',
    description: 'One Division 1 school hides behind a stack of clues, from a single vibe word down to the school colors. Guess early to score big. Free college sports trivia.',
  },
  '/guess-cbb-team': {
    title: 'Guess The CBB Program: College Basketball Quiz',
    description: 'One college basketball program hides behind six locked clues, from blue bloods to mid majors. Solve it early for more points. Free daily CBB trivia.',
  },
  '/cbb-grid': {
    title: 'College Basketball Grid: Daily CBB Trivia',
    description: 'Fill the 3x3 college basketball grid with players who match the school and the career achievement. New board daily plus unlimited mode. Free CBB trivia.',
  },
  '/cfb-higher-lower': {
    title: 'CFB Higher or Lower: College Football QB Quiz',
    description: 'Two quarterbacks, one question: who threw for more passing yards in college? Not the pros, college. Free daily college football trivia game.',
  },
  '/cfb-dynasty': {
    title: 'CFB Dynasty: College Football Program Sim',
    description: 'Run a real college football program: NIL recruiting, the transfer portal, conference title races and the 12 team Playoff, across unlimited seasons. Free.',
  },
  '/cbb-dynasty': {
    title: 'CBB Dynasty: College Basketball Program Sim',
    description: 'Run a real college hoops program: NIL recruiting, one and done freshmen, the portal, conference tournaments and a 32 team March. Free college basketball sim.',
  },
  '/buzzer-beater': {
    title: 'Buzzer Beater: Basketball Jump Shot Game',
    description: 'Set the arc, fade off the closeout and time the strength bar over ten jump shots, backing up each time. Daily and unlimited. A free basketball shooting game.',
  },
  '/perfect-season-nba': {
    title: '82-0 Perfect Season: NBA Basketball Draft Sim',
    description: 'Every spin lands on a real NBA team season. Draft a cross era starting five plus a sixth man, then simulate 82 games. Can you go unbeaten? Free basketball.',
  },
  '/stat-detective': {
    title: 'Stat Detective: Guess the NBA Player Quiz',
    description: 'A real NBA season with the name scrubbed off: the decade, the position and the per 36 line. Name the player in eight guesses. Free basketball trivia game.',
  },
  '/nba-stat-line': {
    title: 'NBA Stat Line: Basketball Stats Puzzle Game',
    description: 'Match a target per 36 NBA stat line by blending five real player seasons, weighted by minutes. Daily shared target plus unlimited. Free basketball puzzle.',
  },
  '/nba-starting-5': {
    title: 'NBA Starting 5: Basketball Lineup Builder',
    description: 'Spin a stat challenge, then build a starting five with each pick from a random NBA franchise. Your memory of who played where is the game. Free basketball.',
  },
  '/nba-connect-4': {
    title: 'NBA Connect 4: Basketball Trivia Grid Game',
    description: 'The classic 7 by 6 board, but every cell costs an NBA answer. Name a player who fits the row and the column to drop your piece. Free basketball trivia.',
  },
  '/nba-chain': {
    title: 'NBA Chain: Basketball Teammate Chain Game',
    description: 'Start from one NBA star, name a teammate, then a teammate of his, and keep the chain going. One wrong link ends the run. Free basketball trivia game.',
  },
  '/nba-higher-lower': {
    title: 'NBA Higher or Lower: Basketball Points Quiz',
    description: 'Two NBA legends, one question: who scored more career points? The pool is the top 80 scorers ever, so no easy outs. Free daily basketball trivia.',
  },
  '/nba-grid': {
    title: 'NBA Franchise Grid: Daily Basketball Trivia',
    description: 'Fill the 3x3 NBA grid with players whose careers match the row and the column, from franchises to milestones. Daily board plus unlimited. Free basketball.',
  },
  '/nba-connections': {
    title: 'NBA Connections: Basketball Grouping Puzzle',
    description: 'Twenty NBA players hide four groups of five tied by a franchise, a milestone, a birth country or a draft slot. Find them all. Free daily basketball puzzle.',
  },
  '/nba-career': {
    title: 'NBA Career Path: Guess the Basketball Player',
    description: 'A mystery NBA player hides behind a stack of clues, starting with just a position. Every clue makes it easier and pays less. Free daily basketball trivia.',
  },
  '/missing-five': {
    title: 'Missing Five: NBA Finals Starting Lineup Quiz',
    description: 'A real starting five from a famous NBA Finals night with one name blanked out. Can you remember who actually started? Free daily basketball quiz.',
  },
  '/perfect-lineup-nba': {
    title: 'Perfect Lineup: NBA Starting Five Puzzle',
    description: 'Build an NBA starting five where three slots demand a player from a random franchise or decade, then simulate the game and share it. Free basketball puzzle.',
  },
  '/conquest-nba': {
    title: 'NBA Conquest: Basketball Imperialism Map Game',
    description: "Pick a team, inherit the land around its arena and try to own the country. Every NBA winner annexes the loser's whole empire. Free basketball strategy game.",
  },
  '/nba-front-office': {
    title: 'NBA Front Office: Basketball GM Simulator',
    description: 'Run a real NBA franchise: the cap sheet, waivers, trades the AI weighs, the play in and best of seven series, drafts and dynasties. A free basketball GM sim.',
  },
  '/nba-my-career': {
    title: 'NBA My Career: Basketball Career Simulator',
    description: 'Create a prospect, land on a real NBA team and live a whole career: stat lines, contracts, trade demands, rings and a legacy verdict. Free basketball sim.',
  },
  '/nba-gauntlet-draft': {
    title: 'Gauntlet Draft: NBA Starting Five Draft Game',
    description: 'Draft an NBA starting five one slot at a time from five real players, then survive a five round knockout cup. Free daily basketball draft game.',
  },
  '/perfect-season-mlb': {
    title: '162-0 Perfect Season: MLB Baseball Draft Sim',
    description: 'Spin across a century of baseball, draft a cross era lineup from real team seasons and simulate all 162 games. Can you go unbeaten? Free MLB game.',
  },
  '/baseball-career': {
    title: 'Career Path: Guess the MLB Baseball Player',
    description: 'One mystery baseball player, six clues from position and draft to teams, stats and awards. The sooner you guess, the more you score. Free daily MLB trivia.',
  },
  '/mlb-higher-lower': {
    title: 'MLB Higher or Lower: Home Run Baseball Quiz',
    description: 'Two legends side by side: who hit more career home runs? Finished careers only, Ruth through Ortiz, so every number is final. Free daily MLB baseball quiz.',
  },
  '/mlb-grid': {
    title: 'MLB Franchise Grid: Daily Baseball Trivia',
    description: 'Nine cells, nine legends. Fill the 3x3 MLB grid with players whose careers match both the row and the column. Daily board plus unlimited. Free baseball.',
  },
  '/mlb-connect-4': {
    title: 'MLB Connect 4: Baseball Trivia Grid Game',
    description: 'Four in a row with a baseball brain. Every row and column is a category, and claiming a cell means naming an MLB player who fits both. Free trivia for two.',
  },
  '/mlb-gauntlet-draft': {
    title: 'Gauntlet Draft: MLB Lineup Card Draft Game',
    description: 'Fill an MLB lineup card one spot at a time from five real players, then survive a five round October against stronger teams. Free daily baseball draft.',
  },
  '/conquest-mlb': {
    title: 'MLB Conquest: Baseball Imperialism Map Game',
    description: "Every territory starts with its nearest MLB park, and every winner annexes the loser's whole empire. Two clubs start with nothing. Free baseball map game.",
  },
  '/mlb-my-career': {
    title: 'MLB My Career: Baseball Career Simulator',
    description: 'Create a prospect, join a real MLB team and live a full career of stat lines, contracts, injuries and rings, then see if Cooperstown calls. Free baseball sim.',
  },
  '/mlb-front-office': {
    title: 'MLB Front Office: Baseball GM Simulator',
    description: 'Run a real MLB franchise: payroll under the tax line, trades the AI weighs, a 162 game season and October, drafts and dynasties. A free baseball GM sim.',
  },
  '/missing-nine': {
    title: 'Missing Nine: World Series Lineup MLB Quiz',
    description: 'A real World Series starting nine in batting order with one name blanked out. Can you remember who actually started? Free daily baseball quiz.',
  },
  '/baseball-connections': {
    title: 'Connections: MLB Baseball Grouping Puzzle',
    description: 'Twenty baseball players hide four groups of five tied by a franchise, an award or a country. Find every group before you run out. Free daily MLB puzzle.',
  },
  '/perfect-season-nhl': {
    title: '82-0 Perfect Season: NHL Hockey Draft Sim',
    description: 'Every spin lands on a real NHL franchise and decade. Fill six slots from a century of hockey, then the sim plays 82 games. Can you go unbeaten? Free.',
  },
  '/puck-detective': {
    title: 'Puck Detective: Guess the NHL Player Game',
    description: 'Name the mystery NHL skater in eight guesses. Every guess compares team, position, nationality, age and jersey number. Free daily hockey guessing game.',
  },
  '/hockey-grid': {
    title: 'NHL Franchise Grid: Daily Hockey Trivia',
    description: 'Every row and column is an NHL franchise or a career milestone, and each cell wants a player who fits both. Daily 3x3 board plus unlimited. Free hockey.',
  },
  '/hockey-career': {
    title: 'Career Path: Guess the NHL Hockey Player',
    description: 'One mystery hockey player and a stack of clues on country, draft, teams, stats and awards. Swing early for the full score. Free daily NHL trivia game.',
  },
  '/hockey-higher-lower': {
    title: 'Higher / Lower: NHL Hockey Career Points Quiz',
    description: 'Two hockey players side by side: who finished with more career points? Ten quick rounds and a streak bonus that snowballs. Free daily NHL trivia game.',
  },
  '/nhl-connections': {
    title: 'NHL Connections: Hockey Grouping Puzzle',
    description: 'Twenty NHL players, four hidden groups of five sharing a franchise or a career milestone. Find all four on four lives. Free daily hockey puzzle.',
  },
  '/conquest-nhl': {
    title: 'NHL Conquest: Hockey Imperialism Map Game',
    description: "Every patch of the map starts loyal to its nearest NHL arena. Win and you annex the loser's whole empire, and five clubs start with nothing. Free hockey game.",
  },
  '/nhl-my-career': {
    title: 'NHL My Career: Hockey Career Simulator',
    description: 'Create a prospect, join a real NHL team and live a full career of stat lines, contracts, injuries and rings, then see if the Hall calls. Free hockey life sim.',
  },
  '/nhl-front-office': {
    title: 'NHL Front Office: Hockey GM Simulator',
    description: 'Run a real NHL franchise: a hard cap, waivers, trades the AI weighs, a points race and four best of seven rounds to the Cup. Free hockey GM sim game.',
  },
  '/nhl-connect-4': {
    title: 'NHL Connect 4: Hockey Trivia Grid Game',
    description: 'Four in a row, hockey style. Pick a column and name a real NHL player who fits the row where your piece lands to claim it. Free pass and play trivia.',
  },
  '/perfect-lineup-nhl': {
    title: 'Perfect Lineup: NHL Hockey Dream Line Game',
    description: 'Build an NHL dream line of three forwards, two defensemen and a goalie where slots demand a random team or era, then simulate. Free hockey puzzle game.',
  },
  '/f1-driver': {
    title: 'Guess The F1 Driver: Formula 1 Trivia Game',
    description: 'A mystery Formula 1 great hides behind six clues: race wins, titles, teams, nationality and a famous moment. Solve it early to score big. Free daily F1 quiz.',
  },
  '/f1-higher-lower': {
    title: 'F1 Higher or Lower: Formula 1 Race Wins Quiz',
    description: 'Two drivers, one question: who won more Grands Prix? The pool is every F1 driver with at least 8 wins, from the 1950s on. Free daily Formula 1 trivia.',
  },
  '/f1-constructor': {
    title: 'Guess The Constructor: F1 Team Trivia Quiz',
    description: 'A mystery Formula 1 team hides behind six clues: its country, era, titles, livery and a famous driver. Every clue cuts your score. Free daily F1 quiz.',
  },
  '/perfect-lineup-f1': {
    title: 'Perfect Lineup: F1 Dream Driver Squad Game',
    description: 'Fill five F1 driver seats where three come with a team, era or country rule, then simulate a season and share your result. Free Formula 1 puzzle game.',
  },
  '/guess-tennis-player': {
    title: 'Guess The Player: ATP and WTA Tennis Quiz',
    description: 'A mystery tennis player from either tour hides behind six clues, from a vibe word to Grand Slam details. Commit early for a bigger score. Free daily trivia.',
  },
  '/tennis-chain': {
    title: 'Tennis Chain: Grand Slam Defeats Trivia Game',
    description: 'Start from a tennis legend and name a player who beat them at a Grand Slam, then who beat that player. One mistake ends the run. Free tennis trivia game.',
  },
  '/tennis-higher-lower': {
    title: 'Tennis Higher or Lower: Grand Slam Titles Quiz',
    description: 'Who won more Grand Slam singles titles? Ten rounds of legends from both tours in one pool, from the 1920s to today. Free daily tennis trivia game.',
  },
  '/guess-the-golfer': {
    title: 'Guess The Golfer: Daily Golf Majors Quiz',
    description: 'A mystery major champion hides behind six clues, starting with the years they won. Every extra clue costs points. Free daily golf trivia plus unlimited.',
  },
  '/golf-higher-lower': {
    title: 'Golf Higher or Lower: Major Championships Quiz',
    description: 'Two golf champions side by side: who won more majors? The pool runs from Old Tom Morris to Scottie Scheffler. Free daily golf trivia, ten rounds a go.',
  },
  '/afl-higher-lower': {
    title: 'AFL Higher or Lower: Aussie Rules Goals Quiz',
    description: 'Two VFL and AFL greats side by side: who kicked more career goals? Sixty retired legends, so no total ever moves. Free daily Aussie rules footy trivia.',
  },
  '/guess-nascar-driver': {
    title: 'Guess The Driver: NASCAR Cup Series Quiz',
    description: 'A mystery NASCAR Cup Series driver hides behind six clues, from winning years and titles to three real race wins. Free daily stock car racing trivia.',
  },
  '/nascar-chain': {
    title: 'NASCAR Chain: Cup Series Champions Trivia',
    description: 'Name a driver who beat the current one to a NASCAR Cup Series title, then who beat that driver, and keep going. One wrong link ends it. Free racing trivia.',
  },
  '/fight-career': {
    title: 'Fight Career: Boxing Career Simulator Game',
    description: 'Turn pro as a nobody, pick your fights, run your camps and climb to a world title before the damage catches up. Free boxing career sim, invented fighters.',
  },
  '/fight-promoter': {
    title: 'Fight Promoter: Boxing Promotion Sim Game',
    description: 'Book the room, make the fights, set the ticket price and pay the purses. Selling tonight and building your name pull apart. Free boxing matchmaking sim.',
  },
  '/fight-gym': {
    title: 'Fight Gym: Boxing Gym Management Sim',
    description: 'Sign fighters nobody wanted, find them the right nights and decide when a man has had enough. The money is yours, the damage is his. Free boxing gym sim.',
  },
  '/ufc': {
    title: 'UFC Guesser: Guess the MMA Fighter Game',
    description: 'Eight guesses to name a mystery UFC fighter. Every guess lights up green, yellow or red with arrows on each stat. Deduction, not luck. Free MMA trivia game.',
  },
  '/ufc-chain': {
    title: 'Combat Chain: MMA Fighter Chain Trivia Game',
    description: 'Name a fighter who beat your current fighter, then one who beat them, and build the longest chain of real MMA results. One miss ends it. Free fight trivia.',
  },
  '/rank-em': {
    title: "Rank 'Em: Sports Stats Ranking Quiz",
    description: 'One career stat, five greats, one shot at the right order, most to fewest. A new daily ranking across the NBA, NHL and MLB plus unlimited. Free sports quiz.',
  },
  '/teammates': {
    title: 'Teammates or Not? NFL, NBA and Soccer Quiz',
    description: 'Two athletes from the NFL, NBA or soccer. Did they ever wear the same shirt? Call it yes or no and learn which careers crossed. Free sports trivia game.',
  },
  '/olympics': {
    title: 'The Medal Games: Guess the Olympic Athlete',
    description: 'A mystery Olympic athlete from the Summer or Winter Games hides behind a stack of clues, starting with the sport. Guess early. Free daily sports trivia.',
  },
  '/guess-the-year': {
    title: 'Guess The Year: Sports History Trivia Game',
    description: 'Six things happened across the sports world in one year. Each clue is a different sport, so guess the year as early as you can. Free daily sports trivia.',
  },
  '/guess-the-nation': {
    title: 'Guess The Nation: World Sports Trivia Quiz',
    description: "A mystery country's sporting story told in clues: medal counts, famous moments, even flag colors. Early solves pay best. Free daily world sports trivia.",
  },
  '/hof-or-bust': {
    title: 'Hall of Fame or Bust? Sports Stats Quiz',
    description: 'An anonymous career stat line from a real player. Vote Hall of Famer or bust, then see the name and how everyone else called it. Free sports trivia game.',
  },
  '/champ-or-not': {
    title: 'Champ or Not: True or False Sports Champions',
    description: 'Ten claims about champions across the NFL, NBA, MLB, NHL, college, soccer and footy. True or false, ten seconds each. Spot the fakes. Free daily sports quiz.',
  },
  '/whod-they-beat': {
    title: "Who'd They Beat? Sports Finals Runner Up Quiz",
    description: 'We name the champion and the year across the NFL, NBA, MLB, NHL and WNBA. You pick who they beat in the final from four real options. Free daily sports quiz.',
  },
  '/silverware-sort': {
    title: 'Silverware Sort: Sports Titles Ranking Quiz',
    description: 'Five teams from one competition, one question: who has more titles? Stack them in order across the NFL, NBA, MLB, NHL, college and soccer. Free sports quiz.',
  },
  '/hall-of-champions': {
    title: 'Hall of Champions: Idle Sports Museum Game',
    description: 'Build a museum out of real championship history, from Super Bowl I to this year. Admission keeps paying while you are away. A free idle sports game.',
  },
  '/idle-arena': {
    title: 'Idle Arena: Free Sports Clicker Game',
    description: 'Tap to score, sign a squad of eight archetypes that scores for you and lift trophies that make every run stronger. Free idle sports clicker, no sign up.',
  },
  '/face-off': {
    title: 'Face Off: Sports Stats Duel Against a Rival',
    description: 'Two athletes, one stat, ten seconds. Tap who has more before the rival does, over ten rounds across ten sports, plus a daily duel. Free sports trivia game.',
  },
  '/score-predictor': {
    title: 'Score Predictor: Famous Sports Scores Quiz',
    description: 'Call the exact final score of a famous match from the teams, the competition, the date and a hint. Soccer, NFL and NBA classics. Free sports trivia game.',
  },
  '/list-quiz': {
    title: 'Name Them All: Sports Champions List Quiz',
    description: 'Pick a list and empty your brain: Super Bowl MVPs, F1 world champions, Masters winners and more, all real history. Free sports list quizzes, no sign up.',
  },
  '/minefield': {
    title: 'Minefield: Spot the Fakes Sports Trivia',
    description: 'One category, a board of names. Click everyone who belongs and dodge the plausible fakes planted among them. Two lives a board. Free daily sports trivia.',
  },
  '/sports-millionaire': {
    title: 'Sports Millionaire: Money Ladder Trivia Quiz',
    description: 'Fifteen questions built from real football data, three lifelines and a pretend million at the top of the money ladder. One wrong step drops you. Free.',
  },
  '/quiz-board': {
    title: 'Sports Quiz Board: Daily Sports Trivia Game',
    description: 'Five categories, five money rows, twenty five clues. Pick a value, answer the clue, and a wrong answer costs you the full amount. Free daily sports trivia.',
  },
  '/ball-iq': {
    title: 'Ball Knowledge IQ: Sports Trivia IQ Test',
    description: 'Twelve sports questions ramping from layups to deep cuts, with the hard ones worth the most. Get your Ball Knowledge IQ and settle it. Free daily quiz.',
  },
  '/emoji-guess': {
    title: 'Emoji Guess: Soccer Emoji Riddle Quiz',
    description: 'Five football riddles a day told entirely in emoji: players, clubs, managers and iconic moments. Three guesses each and a hint after a miss. Free soccer quiz.',
  },
  '/mystery-box': {
    title: 'Mystery Box: Soccer Pack Opening Squad Game',
    description: 'Open fifteen packs of real footballers, keep or bin each one and build the best XI your luck allows. Same packs for everyone daily. Free soccer squad game.',
  },
};
