export interface GameDef {
  path: string;
  label: string;
  emoji: string;
  description: string;
  daily?: boolean;
  isNew?: boolean;
}

export interface GameCategory {
  title: string;
  emoji: string;
  games: GameDef[];
}

export const CATEGORIES: GameCategory[] = [
  {
    title: 'Soccer',
    emoji: '⚽',
    games: [
      // retired 2026-07-06 per owner review: "too simple". Page/route kept for direct links; uncomment to revive.
      // { path: '/higher-lower-transfers', label: 'Transfer Market', emoji: '📈', description: 'Higher or lower on real market values', isNew: true },
      // Darts, Stadium Draft, Blind Rank and Start Bench Cut deleted 2026-07-15
      // per owner review (broken/low-effort). Pages, routes and libs removed entirely.
      { path: '/overrated-underrated', label: 'Overrated or Underrated', emoji: '🔥', description: 'Ten players, ten verdicts. See if the crowd agrees with you', daily: true, isNew: true },
      { path: '/tier-list', label: 'Tier List', emoji: '🗂️', description: 'Rank eight players S to D, then face the crowd', daily: true, isNew: true },
      { path: '/budget-builder', label: '€1B Budget Builder', emoji: '💷', description: 'One billion euros, real values, eleven slots. Spend it well', isNew: true },
      { path: '/rebuild', label: 'Rebuild Challenge', emoji: '🔧', description: 'Inherit a real club and €100M. Sell, sign, hit the target', isNew: true },
      { path: '/grade-transfer', label: 'Grade the Transfer', emoji: '📋', description: 'Grade five real moves A to F, then see how they aged', daily: true, isNew: true },
      { path: '/dart-draft', label: 'Dart Draft', emoji: '🎯', description: 'Throw timed darts at a real world map: hit a country, draft its players', isNew: true },
      { path: '/career-ladder', label: 'Career Ladder', emoji: '🪜', description: 'Guess the player, one career stop at a time', isNew: true },
      { path: '/who-am-i', label: 'Who Am I?', emoji: '🕵️', description: 'Hunt the secret player with similarity scores', isNew: true },
      { path: '/club-manager', label: 'Club Manager', emoji: '💼', description: 'Run a real club: tactics, transfers, trophies and the sack race', isNew: true },
      { path: '/world-xi', label: 'World XI', emoji: '🌍', description: 'Pick a formation, fill 11 random countries', isNew: true },
      { path: '/player-bingo', label: 'Player Bingo', emoji: '🎱', description: 'Complete a line on a 5x5 board before 3 strikes', isNew: true },
      { path: '/alphabet-sprint', label: 'Alphabet Sprint', emoji: '⚡', description: 'Name a player per letter against the clock', isNew: true },
      { path: '/clue-auction', label: 'Clue Auction', emoji: '💰', description: 'Buy clues, save points, name the secret player', isNew: true },
      // Revived 2026-07-15. Retired 2026-07-06 as "you guess one guy and you're
      // done" — root cause found: scoreRound was INVERTED for rarity mode, so
      // naming the most famous player in the pool scored a perfect 0 and the
      // winning strategy was the opposite of the premise. Fixed, plus the board
      // reveal (what the rarest answer actually was) is now shown after every
      // round, which is Pointless's real payoff and was missing entirely.
      { path: '/rarity-round', label: 'Rarity Round', emoji: '💎', description: 'Name the answer nobody else would. Rarest wins', daily: true, isNew: true },
      { path: '/missing-xi', label: 'Missing XI', emoji: '🧩', description: 'Name the missing player from a famous real lineup', daily: true, isNew: true },
      { path: '/sign-the-player', label: 'Sign the Player', emoji: '🔨', description: 'The box2box auction: outbid two AI moguls, £1B each, then sim the showdown', isNew: true },
      { path: '/footle', label: 'Footle', emoji: '🎯', description: 'Guess the soccer player from stats' },
      { path: '/career', label: 'Career Quiz', emoji: '📜', description: 'Guess from career history' },
      { path: '/higher-lower', label: 'Higher or Lower', emoji: '📊', description: 'Compare all-time career stats' },
      { path: '/connections', label: 'Connections', emoji: '🔗', description: 'Find groups of 4 connected players' },
      { path: '/build-your-xi', label: 'Build Your XI', emoji: '⚽', description: 'Create a lineup, get AI rated' },
      { path: '/perfect-lineup', label: 'Perfect Lineup', emoji: '⚽', description: 'Build an XI under random league & country constraints, then simulate', daily: true, isNew: true },
      { path: '/football-connect-4', label: 'Connect 4', emoji: '🔴', description: 'Soccer trivia meets Connect 4' },
      // deleted 2026-07-08 per owner review: buggy (hint x3 -> blank screen) and too few possible puzzles for a rare event. Route kept for direct links; uncomment to revive.
      // { path: '/world-cup', label: 'World Cup', emoji: '🏆', description: 'Guess the World Cup legend', daily: true },
      { path: '/guess-soccer-club', label: 'Guess The Club', emoji: '🏟️', description: 'Identify the mystery football club', daily: true, isNew: true },
      { path: '/soccer-grid', label: 'Soccer Grid', emoji: '⚽', description: '3×3 grid puzzle with rarity scores', daily: true, isNew: true },
      { path: '/world-cup-bracket', label: '2026 Bracket', emoji: '🌍', description: 'Predict every World Cup 2026 match', isNew: true },
      { path: '/soccer-career', label: 'Soccer Career', emoji: '⚽', description: 'Build your career from youth academy to legend. BitLife meets football.', isNew: true },
      { path: '/fantasy-draft', label: 'Fantasy Draft', emoji: '🧑‍💼', description: 'Draft your ultimate XI against an AI opponent', isNew: true },
      // deleted 2026-07-08 per owner review: too easy/boring. Route kept for direct links; uncomment to revive.
      // { path: '/shirt-number', label: 'Shirt Number', emoji: '👕', description: 'Guess the kit number a player wears', daily: true, isNew: true },
      { path: '/transfer-path', label: 'Transfer Path', emoji: '🔄', description: 'Connect two players through shared clubs', daily: true, isNew: true },
      { path: '/guess-transfer-value', label: 'Guess The Value', emoji: '💰', description: 'Guess a player’s transfer market value', daily: true, isNew: true },
      // moved from the retired Game Shows tab 2026-07-08 (owner: game-show games belong in their sport)
      { path: '/squad-deal', label: 'Squad Deal', emoji: '🏟️', description: 'Build an XI, Deal or No Deal style', isNew: true },
      { path: '/deal-or-no-deal', label: 'Deal or No Deal', emoji: '💼', description: 'Bank or gamble against the Banker', isNew: true },
      // deleted 2026-07-08 per owner review: "discard this". Route kept for direct links; uncomment to revive.
      // { path: '/pack-battle', label: 'Pack Battle', emoji: '🃏', description: 'Call higher or lower before each card flips. One miss busts the pack', daily: true, isNew: true },
    ],
  },
  {
    title: 'Pro Football',
    emoji: '🏈',
    games: [
      { path: '/perfect-season-nfl', label: '17-0 Perfect Season', emoji: '🏆', description: 'Draft an offense across eras, run the table', isNew: true },
      { path: '/football-grid', label: 'Pro Football Grid', emoji: '🏈', description: '3×3 grid puzzle with rarity scores', daily: true },
      // retired 2026-07-08 per owner review: "too easy and boring... unless ur going to add to it, discard it". Route kept for direct links; uncomment to revive.
      // { path: '/football-timeline', label: 'Timeline', emoji: '📅', description: 'Order players by draft year', daily: true },
      { path: '/football-draft', label: 'Draft Guesser', emoji: '🎰', description: 'Guess the draft round', daily: true },
      { path: '/nfl-career', label: 'NFL Career Path', emoji: '🏈', description: 'Guess the NFL player from clues', daily: true },
      // retired 2026-07-08 per owner review: "like 40 teams to choose from... get rid of this game". Route kept for direct links; uncomment to revive.
      // { path: '/guess-nfl-team', label: 'Guess The Team', emoji: '🏈', description: 'Identify the NFL franchise', daily: true, isNew: true },
      { path: '/conquest', label: 'NFL Conquest', emoji: '🗺️', description: '32 teams, 50 states. One champion.', daily: true },
    ],
  },
  {
    // 2026-07-08: College Football + College Basketball merged into one
    // College Sports tab per owner review ("just put the two together").
    title: 'College Sports',
    emoji: '🎓',
    games: [
      { path: '/college-grid', label: 'College Grid', emoji: '🎓', description: 'College football 3×3 grid puzzle', daily: true },
      { path: '/guess-the-college', label: 'Guess The College', emoji: '🏫', description: 'Guess the D1 school from clues', daily: true },
      { path: '/guess-cbb-team', label: 'Guess The CBB Program', emoji: '🏀', description: 'Guess the college basketball program', daily: true, isNew: true },
    ],
  },
  {
    title: 'Pro Basketball',
    emoji: '🏀',
    games: [
      { path: '/perfect-season-nba', label: '82-0 Perfect Season', emoji: '🏆', description: 'Spin team seasons, draft a six man rotation', isNew: true },
      { path: '/stat-detective', label: 'Stat Detective', emoji: '🔎', description: 'Name the player behind the mystery stat line', isNew: true },
      { path: '/nba-starting-5', label: 'NBA Starting 5', emoji: '🏀', description: 'Build a lineup with stat challenges' },
      { path: '/nba-connect-4', label: 'NBA Connect 4', emoji: '🏀', description: 'NBA trivia meets Connect 4' },
      { path: '/nba-chain', label: 'NBA Chain', emoji: '🔗', description: 'Build a chain of connected players' },
      { path: '/perfect-lineup-nba', label: 'Perfect Lineup: NBA', emoji: '🏀', description: 'Build a starting 5 under random team & era constraints, then simulate', daily: true, isNew: true },
      { path: '/conquest-nba', label: 'NBA Conquest', emoji: '🗺️', description: '30 teams, 50 states. One champion.', daily: true, isNew: true },
    ],
  },
  {
    title: 'Baseball',
    emoji: '⚾',
    games: [
      { path: '/perfect-season-mlb', label: '162-0 Perfect Season', emoji: '🏆', description: 'Spin, draft across eras, chase perfection', isNew: true },
      { path: '/baseball-career', label: 'Career Path', emoji: '⚾', description: 'Guess the baseball player', daily: true },
      { path: '/baseball-connections', label: 'Connections', emoji: '⚾', description: 'Group baseball players', daily: true },
    ],
  },
  {
    title: 'Hockey',
    emoji: '🏒',
    games: [
      { path: '/perfect-season-nhl', label: '82-0 Perfect Season', emoji: '🏆', description: 'Spin franchises and eras, chase 82-0', isNew: true },
      { path: '/puck-detective', label: 'Puck Detective', emoji: '🏒', description: 'Guess the mystery NHL player with attribute clues', daily: true, isNew: true },
      { path: '/hockey-grid', label: 'NHL Franchise Grid', emoji: '🥅', description: '3x3 grid with NHL franchises and career milestones', daily: true, isNew: true },
      { path: '/hockey-career', label: 'Career Path', emoji: '🏒', description: 'Guess the hockey player', daily: true },
      { path: '/hockey-higher-lower', label: 'Higher / Lower', emoji: '🏒', description: 'Compare career points', daily: true },
      { path: '/perfect-lineup-nhl', label: 'Perfect Lineup: NHL', emoji: '🏒', description: 'Build a dream line under random team & era constraints, then simulate', daily: true, isNew: true },
    ],
  },
  {
    title: 'Formula 1',
    emoji: '🏎️',
    games: [
      { path: '/f1-driver', label: 'Guess The F1 Driver', emoji: '🏎️', description: 'Guess the mystery F1 driver from clues', daily: true, isNew: true },
      { path: '/f1-constructor', label: 'Guess The Constructor', emoji: '🏗️', description: 'Guess the mystery F1 team from clues', daily: true, isNew: true },
      { path: '/perfect-lineup-f1', label: 'Perfect Lineup: F1', emoji: '🏎️', description: 'Build a 5-driver dream squad under random team/era/country constraints', daily: true, isNew: true },
    ],
  },
  {
    title: 'Tennis',
    emoji: '🎾',
    games: [
      { path: '/guess-tennis-player', label: 'Guess The Player', emoji: '🎾', description: 'Guess the mystery tennis player from clues', daily: true, isNew: true },
      { path: '/tennis-chain', label: 'Tennis Chain', emoji: '🔗', description: 'Build a chain of Grand Slam defeats', isNew: true },
    ],
  },
  {
    title: 'Golf',
    emoji: '🏌️',
    games: [],
  },
  {
    title: 'NASCAR',
    emoji: '🏁',
    games: [
      { path: '/guess-nascar-driver', label: 'Guess The Driver', emoji: '🏁', description: 'Guess the mystery NASCAR driver from clues', daily: true, isNew: true },
      { path: '/nascar-chain', label: 'NASCAR Chain', emoji: '🔗', description: 'Build a chain of Cup champions', isNew: true },
    ],
  },
  {
    title: 'Combat Sports',
    emoji: '🥊',
    games: [
      { path: '/ufc', label: 'UFC Guesser', emoji: '🥊', description: 'Guess the UFC fighter' },
      { path: '/ufc-chain', label: 'Combat Chain', emoji: '🔗', description: 'Build a chain of fighters who beat each other', isNew: true },
    ],
  },
  {
    title: 'World & Olympic Games',
    emoji: '🌍',
    games: [
      { path: '/teammates', label: 'Teammates or Not?', emoji: '🤝', description: 'Were they ever teammates?', isNew: true },
      { path: '/olympics', label: 'The Medal Games', emoji: '🏅', description: 'Guess the mystery athlete from clues', daily: true, isNew: true },
      { path: '/guess-the-year', label: 'Guess The Year', emoji: '📅', description: 'What year did these happen?', daily: true, isNew: true },
      { path: '/guess-the-nation', label: 'Guess The Nation', emoji: '🌍', description: 'Identify the mystery sporting nation', daily: true, isNew: true },
      { path: '/hof-or-bust', label: 'Hall of Fame or Bust?', emoji: '🏆', description: 'Is this player a legend or a letdown?', daily: true, isNew: true },
      { path: '/score-predictor', label: 'Score Predictor', emoji: '📊', description: 'Predict the final score of famous matches', daily: true, isNew: true },
      // moved from the retired Game Shows tab 2026-07-08 (owner: game-show games belong with their sport; these two span all sports)
      { path: '/list-quiz', label: 'Name Them All', emoji: '📝', description: 'How many champions can you name?', isNew: true },
      { path: '/minefield', label: 'Minefield', emoji: '💣', description: 'Click everyone who belongs. Some tiles explode', daily: true, isNew: true },
      { path: '/sports-millionaire', label: 'Sports Millionaire', emoji: '💰', description: 'Climb a 15-question money ladder with lifelines', daily: true, isNew: true },
      { path: '/jeopardy', label: 'Sports Jeopardy', emoji: '🎓', description: 'Five categories, $200 to $1000. Wrong answers cost you', daily: true, isNew: true },
      { path: '/ball-iq', label: 'Ball Knowledge IQ', emoji: '🧠', description: 'Twelve questions, getting harder. Do you actually know ball?', daily: true, isNew: true },
      { path: '/emoji-guess', label: 'Emoji Guess', emoji: '🤔', description: 'Five football riddles told entirely in emoji', daily: true, isNew: true },
    ],
  },
  // Game Shows category removed 2026-07-08 per owner review — its games now
  // live inside their sports (Squad Deal + Deal or No Deal → Soccer,
  // Name Them All + Sports Millionaire → World & Olympic Games).
];

export const VISIBLE_CATEGORIES = CATEGORIES.filter(c => c.games.length > 0);
export const ALL_GAMES = CATEGORIES.flatMap(c => c.games);
export const TOTAL_GAMES = ALL_GAMES.length;
