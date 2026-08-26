export interface GameDef {
  path: string;
  label: string;
  emoji: string;
  description: string;
  daily?: boolean;
  isNew?: boolean;
  /** Shown in the Dynasty & Career Sims showcase at the top of the home page. */
  featured?: boolean;
}

/**
 * Every category title, as a type.
 *
 * ROUND 268, AND THIS IS NOT DECORATION. The College Games Hub filtered this
 * registry for the titles 'College Football' and 'College Basketball'. Neither
 * has ever existed: the category is called 'College Sports'. The filter matched
 * nothing, so /college shipped to the live site reading "All 0 college football
 * and college basketball games in one place" with not one game under it, and it
 * stayed that way long enough that Round 266 added a footer link to it and sent
 * the whole site's crawl budget at an empty page.
 *
 * Nothing caught it because nothing could. It is not a type error against
 * `title: string`, it is not a crash, it is not a dead link, and the link
 * harness counted the page's outbound links across the whole document, where
 * the navbar and footer alone clear its floor twice over.
 *
 * So the titles are a union now. Filtering for a title that does not exist is
 * a compile error, and adding a category without listing its title here is
 * also a compile error, which is the trade: the union cannot drift out of sync
 * with the array, because the array will not build until it matches.
 */
export type CategoryTitle =
  | 'Soccer'
  | 'Pro Football'
  | 'College Sports'
  | 'Pro Basketball'
  | 'Baseball'
  | 'Hockey'
  | 'Formula 1'
  | 'Tennis'
  | 'Golf'
  | 'Aussie Rules'
  | 'NASCAR'
  | 'Combat Sports'
  | 'World & Olympic Games';

export interface GameCategory {
  title: CategoryTitle;
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
      { path: '/rebuild', label: 'Rebuild Challenge', emoji: '🔧', description: 'Inherit a real club. Flip your fortune, commit your cuts, survive the board', isNew: true },
      // deleted 2026-08-05 per owner review: "dosent even load and it's just like their tier list game... please delete it".
      // { path: '/grade-transfer', label: 'Grade the Transfer', emoji: '📋', description: 'Grade five real moves A to F, then see how they aged', daily: true, isNew: true },
      { path: '/dart-draft', label: 'Dart Draft', emoji: '🎯', description: 'Throw timed darts at a real world map: hit a country, draft its players', isNew: true },
      { path: '/career-ladder', label: 'Career Ladder', emoji: '🪜', description: 'Guess the player, one career stop at a time', isNew: true },
      { path: '/who-am-i', label: 'Who Am I?', emoji: '🕵️', description: 'Hunt the secret player with similarity scores', isNew: true },
      { path: '/club-manager', label: 'Club Manager', emoji: '💼', description: 'Manage any of 330 real clubs across 20 leagues, today or in a real past season: negotiations, board objectives, trophies and the sack race', isNew: true, featured: true },
      { path: '/stadium-tycoon', label: 'Stadium Tycoon', emoji: '🏟️', description: 'Idle empire: grow a tiny club through live toy matches, ten divisions, reputation stars and a legacy boardroom', isNew: true },
      { path: '/wonderkid-factory', label: 'Wonderkid Factory', emoji: '🔭', description: 'Idle academy: scout generated kids, grow them toward hidden ceilings and sell at the perfect moment', isNew: true },
      { path: '/world-xi', label: 'World XI', emoji: '🌍', description: 'Pick a formation, fill 11 random countries', isNew: true },
      { path: '/player-bingo', label: 'Player Bingo', emoji: '🎱', description: 'Complete a line on a 5x5 board before 3 strikes', isNew: true },
      { path: '/alphabet-sprint', label: 'Alphabet Sprint', emoji: '⚡', description: 'Name a player per letter against the clock', isNew: true },
      { path: '/clue-auction', label: 'Clue Auction', emoji: '💰', description: 'Buy clues, save points, name the secret player', isNew: true },
      // Revived 2026-07-15. Retired 2026-07-06 as "you guess one guy and you're
      // done", root cause found: scoreRound was INVERTED for rarity mode, so
      // naming the most famous player in the pool scored a perfect 0 and the
      // winning strategy was the opposite of the premise. Fixed, plus the board
      // reveal (what the rarest answer actually was) is now shown after every
      // round, which is the real payoff of a rarity game and was missing entirely.
      { path: '/rarity-round', label: 'Rarity Round', emoji: '💎', description: 'Name the answer nobody else would. Rarest wins', daily: true, isNew: true },
      { path: '/missing-xi', label: 'Missing XI', emoji: '🧩', description: 'Name the missing player from a famous real lineup', daily: true, isNew: true },
      { path: '/sign-the-player', label: 'Sign the Player', emoji: '🔨', description: 'A blind auction: outbid two AI moguls, £1B each, then sim the showdown', isNew: true },
      { path: '/footle', label: 'Footle', emoji: '🎯', description: 'Guess the soccer player from stats' },
      { path: '/career', label: 'Career Quiz', emoji: '📜', description: 'Guess from career history' },
      { path: '/higher-lower', label: 'Higher or Lower', emoji: '📊', description: 'Compare all-time career stats' },
      { path: '/connections', label: 'Connections', emoji: '🔗', description: 'Find groups of 4 connected players' },
      { path: '/build-your-xi', label: 'Build Your XI', emoji: '⚽', description: 'Create a lineup, get AI rated' },
      // deleted 2026-08-05 per owner review: "Delete perfect lineup."
      // { path: '/perfect-lineup', label: 'Perfect Lineup', emoji: '⚽', description: 'Build an XI under random league & country constraints, then simulate', daily: true, isNew: true },
      { path: '/football-connect-4', label: 'Connect 4', emoji: '🔴', description: 'Soccer trivia meets Connect 4' },
      // Revived 2026-07-22. Was deleted 2026-07-08 as "buggy (hint x3 -> blank
      // screen) and too few possible puzzles for a rare event". The bug is
      // root-caused and fixed (useWorldCup.ts: the Answer clue was reachable
      // mid-game, and daily gated on MAX_CLUES=7 vs the real 6 for host-nation
      // puzzles, Beckenbauer/Kempes/Schillaci/Zidane/Klose/Neymar, 9 of 60).
      // The content objection is answered by relaunching UNLIMITED-FIRST (no
      // daily flag here, page defaults to unlimited): 60 puzzles is thin as a
      // headline daily but plenty as a replayable archive.
      // deleted 2026-08-05 per owner review: "Delete World Cup legends too."
      // { path: '/world-cup', label: 'World Cup Legends', emoji: '🏆', description: 'Guess the World Cup legend, clue by clue', isNew: true },
      // deleted 2026-08-05 per owner review: "Delete guess the club."
      // { path: '/guess-soccer-club', label: 'Guess The Club', emoji: '🏟️', description: 'Identify the mystery football club', daily: true, isNew: true },
      { path: '/soccer-grid', label: 'Soccer Grid', emoji: '⚽', description: '3×3 grid puzzle with rarity scores', daily: true, isNew: true },
      { path: '/world-cup-bracket', label: '2026 Bracket', emoji: '🌍', description: 'Predict every World Cup 2026 match', isNew: true },
      { path: '/soccer-career', label: 'Soccer Career', emoji: '⚽', description: 'Create your look, sign for your boyhood club, get rich, get shady, retire a legend.', isNew: true, featured: true },
      { path: '/fantasy-draft', label: 'Fantasy Draft', emoji: '🧑‍💼', description: 'Draft your ultimate XI against an AI opponent', isNew: true },
      // deleted 2026-07-08 per owner review: too easy/boring. Route kept for direct links; uncomment to revive.
      // { path: '/shirt-number', label: 'Shirt Number', emoji: '👕', description: 'Guess the kit number a player wears', daily: true, isNew: true },
      { path: '/transfer-path', label: 'Transfer Path', emoji: '🔄', description: 'Connect two players through shared clubs', daily: true, isNew: true },
      // deleted 2026-08-05 per owner review: "Guess the value [doesn't] even load and I would say u should delete it."
      // { path: '/guess-transfer-value', label: 'Guess The Value', emoji: '💰', description: 'Guess a player's transfer market value', daily: true, isNew: true },
      // moved from the retired Game Shows tab 2026-07-08 (owner: game-show games belong in their sport)
      { path: '/squad-deal', label: 'Squad Deal', emoji: '🏟️', description: 'Build an XI out of mystery boxes', isNew: true },
      { path: '/player-stock-market', label: 'Player Stock Market', emoji: '📈', description: 'Buy 3 players at real past values, then the market moves a real year', daily: true, isNew: true },
      // deleted 2026-08-05 per owner review: he asked for the standalone box
      // game to go and for Squad Deal to stay.
      // { path: '/deal-or-no-deal', label: 'Mystery Box', emoji: '💼', description: 'Bank or gamble against the Banker', isNew: true },
      // deleted 2026-07-08 per owner review: "discard this". Route kept for direct links; uncomment to revive.
      // { path: '/pack-battle', label: 'Pack Battle', emoji: '🃏', description: 'Call higher or lower before each card flips. One miss busts the pack', daily: true, isNew: true },
    ],
  },
  {
    title: 'Pro Football',
    emoji: '🏈',
    games: [
      { path: '/perfect-season-nfl', label: '17-0 Perfect Season', emoji: '🏆', description: 'Draft an offense across eras, run the table', isNew: true },
      { path: '/front-office', label: 'NFL Front Office', emoji: '🏢', description: 'Full GM sim with real rosters: cap, trades, drafts, dynasties', isNew: true, featured: true },
      { path: '/nfl-my-career', label: 'NFL My Career', emoji: '🌟', description: 'Draft night to Canton. 8 positions, 100+ crossroads, and a very tempting envelope', isNew: true, featured: true },
      { path: '/football-grid', label: 'Pro Football Grid', emoji: '🏈', description: '3×3 grid puzzle with rarity scores', daily: true },
      // retired 2026-07-08 per owner review: "too easy and boring... unless ur going to add to it, discard it". Route kept for direct links; uncomment to revive.
      // { path: '/football-timeline', label: 'Timeline', emoji: '📅', description: 'Order players by draft year', daily: true },
      // deleted 2026-08-05 per owner review: "Draft guessed is boring and I say delete it."
      // { path: '/football-draft', label: 'Draft Guesser', emoji: '🎰', description: 'Guess the draft round', daily: true },
      { path: '/nfl-career', label: 'NFL Career Path', emoji: '🏈', description: 'Guess the NFL player from clues', daily: true },
      { path: '/nfl-higher-lower', label: 'NFL Higher or Lower', emoji: '📊', description: 'Which star scored more career touchdowns?', daily: true, isNew: true },
      { path: '/nfl-connections', label: 'NFL Connections', emoji: '🧩', description: 'Group 20 players into four hidden connections', daily: true, isNew: true },
      { path: '/nfl-connect-4', label: 'NFL Connect 4', emoji: '🏈', description: 'Football trivia meets Connect 4', isNew: true },
      { path: '/missing-eleven', label: 'Missing Eleven', emoji: '🕵️', description: 'Name the missing starter from a famous Super Bowl offense', daily: true, isNew: true },
      // retired 2026-07-08 per owner review: "like 40 teams to choose from... get rid of this game". Route kept for direct links; uncomment to revive.
      // { path: '/guess-nfl-team', label: 'Guess The Team', emoji: '🏈', description: 'Identify the NFL franchise', daily: true, isNew: true },
      { path: '/conquest', label: 'NFL Conquest', emoji: '🗺️', description: 'The imperialism map: winners annex whole empires until one team rules America', daily: true, isNew: true },
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
      { path: '/cfb-higher-lower', label: 'CFB Higher or Lower', emoji: '📊', description: 'Which QB threw for more college yards?', daily: true, isNew: true },
      { path: '/cfb-dynasty', label: 'CFB Dynasty', emoji: '🏟️', description: 'Full program sim: NIL recruiting, the portal, the 12-team Playoff, dynasties', isNew: true, featured: true },
      { path: '/cbb-dynasty', label: 'CBB Dynasty', emoji: '🏀', description: 'College hoops sim: one-and-dones, conference tournaments, 32-team March, Cinderella', isNew: true, featured: true },
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
      { path: '/nba-higher-lower', label: 'NBA Higher or Lower', emoji: '📊', description: 'Which legend scored more career points?', daily: true, isNew: true },
      { path: '/nba-grid', label: 'NBA Franchise Grid', emoji: '🔲', description: 'Fill the 3×3 with players who match both teams', daily: true, isNew: true },
      { path: '/nba-connections', label: 'NBA Connections', emoji: '🧩', description: 'Group 20 players into four hidden connections', daily: true, isNew: true },
      { path: '/nba-career', label: 'NBA Career Path', emoji: '📜', description: 'Guess the NBA player from progressive clues', daily: true, isNew: true },
      { path: '/missing-five', label: 'Missing Five', emoji: '🕵️', description: 'Name the missing starter from a famous real lineup', daily: true, isNew: true },
      { path: '/perfect-lineup-nba', label: 'Perfect Lineup: NBA', emoji: '🏀', description: 'Build a starting 5 under random team & era constraints, then simulate', daily: true, isNew: true },
      { path: '/conquest-nba', label: 'NBA Conquest', emoji: '🗺️', description: 'Imperialism mode: winners annex whole empires until one team rules the map', daily: true, isNew: true },
      { path: '/nba-front-office', label: 'NBA Front Office', emoji: '🏢', description: 'Full GM sim: cap, trades, the play-in, best-of-7 wars, dynasties', isNew: true, featured: true },
      { path: '/nba-my-career', label: 'NBA My Career', emoji: '🌟', description: 'Draft night to the rafters. 5 positions, 100+ crossroads, and one very tempting phone call', isNew: true, featured: true },
    ],
  },
  {
    title: 'Baseball',
    emoji: '⚾',
    games: [
      { path: '/perfect-season-mlb', label: '162-0 Perfect Season', emoji: '🏆', description: 'Spin, draft across eras, chase perfection', isNew: true },
      { path: '/baseball-career', label: 'Career Path', emoji: '⚾', description: 'Guess the baseball player', daily: true },
      { path: '/mlb-higher-lower', label: 'MLB Higher or Lower', emoji: '📊', description: 'Which legend hit more career home runs?', daily: true, isNew: true },
      { path: '/mlb-grid', label: 'MLB Franchise Grid', emoji: '🔲', description: 'Fill the 3×3 with legends who match both teams', daily: true, isNew: true },
      { path: '/mlb-connect-4', label: 'MLB Connect 4', emoji: '⚾', description: 'Baseball trivia meets Connect 4', isNew: true },
      { path: '/conquest-mlb', label: 'MLB Conquest', emoji: '🗺️', description: 'Imperialism at the ballpark: winners annex whole empires, two invaders start landless', daily: true, isNew: true },
      { path: '/mlb-my-career', label: 'MLB My Career', emoji: '🌟', description: 'Draft day to Cooperstown. 11 positions, 100+ crossroads, and a camera in center field', isNew: true, featured: true },
      { path: '/mlb-front-office', label: 'MLB Front Office', emoji: '🏢', description: 'Full GM sim with real 2026 rosters: the tax line, trades, October, dynasties', isNew: true, featured: true },
      { path: '/missing-nine', label: 'Missing Nine', emoji: '🕵️', description: 'Name the missing starter from a famous World Series batting order', daily: true, isNew: true },
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
      { path: '/nhl-connections', label: 'NHL Connections', emoji: '🧩', description: 'Group 20 players into four hidden connections', daily: true, isNew: true },
      { path: '/conquest-nhl', label: 'NHL Conquest', emoji: '🗺️', description: 'Imperialism on ice: winners annex whole empires, five invaders start landless', daily: true, isNew: true },
      { path: '/nhl-my-career', label: 'NHL My Career', emoji: '🌟', description: 'Draft day to the rafters. 5 positions, 100+ crossroads, and an envelope on the bench', isNew: true, featured: true },
      { path: '/nhl-front-office', label: 'NHL Front Office', emoji: '🏢', description: 'Full GM sim with real 2026-27 rosters: hard cap, OT points, the bracket, the Cup', isNew: true, featured: true },
      { path: '/nhl-connect-4', label: 'NHL Connect 4', emoji: '🏒', description: 'Hockey trivia meets Connect 4', isNew: true },
      { path: '/perfect-lineup-nhl', label: 'Perfect Lineup: NHL', emoji: '🏒', description: 'Build a dream line under random team & era constraints, then simulate', daily: true, isNew: true },
    ],
  },
  {
    title: 'Formula 1',
    emoji: '🏎️',
    games: [
      { path: '/f1-driver', label: 'Guess The F1 Driver', emoji: '🏎️', description: 'Guess the mystery F1 driver from clues', daily: true, isNew: true },
      { path: '/f1-higher-lower', label: 'F1 Higher or Lower', emoji: '📊', description: 'Which driver won more Grands Prix?', daily: true, isNew: true },
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
      { path: '/tennis-higher-lower', label: 'Tennis Higher or Lower', emoji: '📊', description: 'Which legend won more Grand Slam titles?', daily: true, isNew: true },
    ],
  },
  {
    title: 'Golf',
    emoji: '🏌️',
    games: [
      { path: '/guess-the-golfer', label: 'Guess The Golfer', emoji: '⛳', description: 'A mystery major champion, six clues, fewer is better', daily: true, isNew: true },
      { path: '/golf-higher-lower', label: 'Golf Higher or Lower', emoji: '📊', description: 'Which legend won more majors?', daily: true, isNew: true },
    ],
  },
  {
    title: 'Aussie Rules',
    emoji: '🏉',
    games: [
      { path: '/afl-higher-lower', label: 'AFL Higher or Lower', emoji: '📊', description: 'Which legend kicked more career goals?', daily: true, isNew: true },
    ],
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
      { path: '/rank-em', label: "Rank 'Em", emoji: '📊', description: 'Put five players in order by a career stat, most to fewest', daily: true, isNew: true },
      { path: '/teammates', label: 'Teammates or Not?', emoji: '🤝', description: 'Were they ever teammates?', isNew: true },
      { path: '/olympics', label: 'The Medal Games', emoji: '🏅', description: 'Guess the mystery athlete from clues', daily: true, isNew: true },
      { path: '/guess-the-year', label: 'Guess The Year', emoji: '📅', description: 'What year did these happen?', daily: true, isNew: true },
      { path: '/guess-the-nation', label: 'Guess The Nation', emoji: '🌍', description: 'Identify the mystery sporting nation', daily: true, isNew: true },
      { path: '/hof-or-bust', label: 'Hall of Fame or Bust?', emoji: '🏆', description: 'Is this player a legend or a letdown?', daily: true, isNew: true },
      { path: '/champ-or-not', label: 'Champ or Not', emoji: '🏆', description: 'Ten title claims, true or false. Spot the fakes', daily: true, isNew: true },
      { path: '/whod-they-beat', label: "Who'd They Beat?", emoji: '🥈', description: 'The champ is given. Name the team they beat in the finals', daily: true, isNew: true },
      { path: '/silverware-sort', label: 'Silverware Sort', emoji: '🥇', description: 'Stack five teams in order by real title counts', daily: true, isNew: true },
      { path: '/hall-of-champions', label: 'Hall of Champions', emoji: '🏛️', description: 'Idle museum: buy real championships, fill ten wings, earn while you are away', isNew: true },
      { path: '/idle-arena', label: 'Idle Arena', emoji: '👆', description: 'Tap to score, sign a squad that scores for you, lift trophies, earn while you are away', isNew: true },
      { path: '/score-predictor', label: 'Score Predictor', emoji: '📊', description: 'Predict the final score of famous matches', daily: true, isNew: true },
      // moved from the retired Game Shows tab 2026-07-08 (owner: game-show games belong with their sport; these two span all sports)
      { path: '/list-quiz', label: 'Name Them All', emoji: '📝', description: 'How many champions can you name?', isNew: true },
      { path: '/minefield', label: 'Minefield', emoji: '💣', description: 'Click everyone who belongs. Some tiles explode', daily: true, isNew: true },
      { path: '/sports-millionaire', label: 'Sports Millionaire', emoji: '💰', description: 'Climb a 15-question money ladder with lifelines', daily: true, isNew: true },
      { path: '/jeopardy', label: 'Sports Quiz Board', emoji: '🎓', description: 'Five categories, $200 to $1000. Wrong answers cost you', daily: true, isNew: true },
      { path: '/ball-iq', label: 'Ball Knowledge IQ', emoji: '🧠', description: 'Twelve questions, getting harder. Do you actually know ball?', daily: true, isNew: true },
      { path: '/emoji-guess', label: 'Emoji Guess', emoji: '🤔', description: 'Five football riddles told entirely in emoji', daily: true, isNew: true },
      { path: '/mystery-box', label: 'Mystery Box', emoji: '📦', description: 'Open 15 packs, keep or bin, build the best XI your luck allows', daily: true, isNew: true },
    ],
  },
  // Game Shows category removed 2026-07-08 per owner review, its games now
  // live inside their sports (Squad Deal + the retired box game → Soccer,
  // Name Them All + Sports Millionaire → World & Olympic Games).
];

/**
 * The categories with these exact titles, in registry order.
 *
 * Round 268. Use this rather than filtering CATEGORIES by a string literal of
 * your own: the parameter is typed, so a title that does not exist will not
 * compile, which is the entire failure the College Games Hub shipped on. It
 * also never returns an empty array silently for a title that IS real, because
 * a real title always has its category.
 */
export function categoriesByTitle(...titles: CategoryTitle[]): GameCategory[] {
  return CATEGORIES.filter(c => titles.includes(c.title));
}

export const VISIBLE_CATEGORIES = CATEGORIES.filter(c => c.games.length > 0);
export const ALL_GAMES = CATEGORIES.flatMap(c => c.games);
/** The deep sims showcased at the top of the home page, in display order. */
export const FEATURED_GAMES = ALL_GAMES.filter(g => g.featured);
export const TOTAL_GAMES = ALL_GAMES.length;
