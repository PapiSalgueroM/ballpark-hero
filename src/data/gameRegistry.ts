export interface GameDef {
  path: string;
  label: string;
  emoji: string;
  description: string;
  daily?: boolean;
  /**
   * The day the game shipped, YYYY-MM-DD: the day its page first landed in
   * git, which scripts/simNewBadge.mjs checks against git. The NEW badge is
   * derived from this by src/lib/newBadge.ts. Round 447 replaced the isNew
   * flag with it after 111 of 131 entries had worn the flag, some since
   * February: "u call like everything new".
   */
  addedOn?: string;
  /** Shown in the Dynasty & Career Sims showcase at the top of the home page. */
  featured?: boolean;
  /**
   * Round 642: the search result title for this game's page, WITHOUT the
   * " | DoUKnowBall" suffix, which PageSeo adds (and drops again only when the
   * whole thing would run past 60 characters). It carries the label exactly
   * once plus the words a searcher types: the sport or league and the kind of
   * game. When set, PageSeo uses it instead of the title the page passes.
   * scripts/simSeoTitles.mjs fences the rules.
   */
  seoTitle?: string;
  /**
   * Round 642: the meta description for this game's page, 120 to 158
   * characters, plain words about what the game is and how it plays, with
   * "free" and the sport in it. When set, PageSeo uses it instead of the
   * description the page passes.
   */
  seoDescription?: string;
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
      { path: '/budget-builder', label: '$1B Budget Builder', emoji: '💵', description: 'One billion dollars, real values, eleven slots. Spend it well', addedOn: '2026-07-21',
        seoTitle: '$1B Budget Builder: Soccer Squad Building Game',
        seoDescription: 'You get $1 billion and real market values. Pick a formation, sign eleven soccer players and see what rating your money actually bought. Free, no sign up.' },
      { path: '/rebuild', label: 'Rebuild Challenge', emoji: '🔧', description: 'Inherit a real club. Open the envelopes, spin for a shirt, keep him or sell him, answer to the board', addedOn: '2026-07-21',
        seoTitle: 'Rebuild Challenge: Soccer Club Management Game',
        seoDescription: 'Take over a real club, spin the wheel for each shirt, keep the player or sell him and answer to the board. Free soccer rebuild game for up to four players.' },
      // deleted 2026-08-05 per owner review: "dosent even load and it's just like their tier list game... please delete it".
      // { path: '/grade-transfer', label: 'Grade the Transfer', emoji: '📋', description: 'Grade five real moves A to F, then see how they aged', daily: true, isNew: true },
      { path: '/dart-draft', label: 'Dart Draft', emoji: '🎯', description: 'Throw timed darts at a real world map: hit a country, draft its players', addedOn: '2026-07-10',
        seoTitle: 'Dart Draft: Throw Darts, Draft a Soccer XI',
        seoDescription: 'Call a position, throw a timed dart at a real world map and draft a real footballer from the country you hit. Eleven throws build your XI. Free soccer game.' },
      { path: '/career-ladder', label: 'Career Ladder', emoji: '🪜', description: 'Guess the player, one career stop at a time', addedOn: '2026-07-01',
        seoTitle: 'Career Ladder: Guess the Soccer Player Quiz',
        seoDescription: "A mystery footballer's career appears one club at a time, earliest first. Name him before the ladder runs out. Free daily soccer quiz plus unlimited play." },
      { path: '/who-am-i', label: 'Who Am I?', emoji: '🕵️', description: 'Hunt the secret player with similarity scores', addedOn: '2026-07-02',
        seoTitle: 'Who Am I? Guess the Secret Soccer Player Game',
        seoDescription: 'Name any footballer and get a similarity score from 0 to 100 against the secret player, with clues on club, nation, position, age and value. Free soccer game.' },
      { path: '/club-manager', label: 'Club Manager', emoji: '💼', description: 'Manage any of 330 real clubs across 20 leagues, today or in a real past season: negotiations, board objectives, trophies and the sack race', addedOn: '2026-07-09', featured: true,
        seoTitle: 'Club Manager: Free Football Management Game',
        seoDescription: 'Manage any of 330 real clubs across 20 leagues, today or in a real past season. Transfers, tactics, the board and the sack race. Free soccer management sim.' },
      { path: '/soccer-conquest', label: 'Soccer Conquest', emoji: '🗺️', description: 'Imperialism across the top five leagues: 96 clubs on one map of Europe, winners annex whole empires until one club rules the continent', daily: true, addedOn: '2026-09-05',
        seoTitle: 'Soccer Conquest: Europe Imperialism Map Game',
        seoDescription: "96 clubs from the top five leagues share one map of Europe, and every winner annexes the loser's whole empire until one club rules. Free soccer map game." },
      { path: '/stadium-tycoon', label: 'Stadium Tycoon', emoji: '🏟️', description: 'Idle empire: grow a tiny club through live toy matches, ten divisions, reputation stars and a legacy boardroom', addedOn: '2026-08-17',
        seoTitle: 'Stadium Tycoon: Free Idle Soccer Club Game',
        seoDescription: 'Grow a tiny football club into an empire with live toy matches, ten divisions and a staff payroll. It keeps earning while you are away. Free idle soccer game.' },
      { path: '/wonderkid-factory', label: 'Wonderkid Factory', emoji: '🔭', description: 'Idle academy: scout generated kids, grow them toward hidden ceilings and sell at the perfect moment', addedOn: '2026-08-21',
        seoTitle: 'Wonderkid Factory: Idle Soccer Academy Game',
        seoDescription: 'Scout generated kids, coach them toward hidden ceilings and sell each one at the perfect moment. A free idle football academy game with no real players.' },
      { path: '/world-xi', label: 'World XI', emoji: '🌍', description: 'Pick a formation, fill 11 random countries', addedOn: '2026-07-02',
        seoTitle: 'World XI: International Soccer Squad Quiz',
        seoDescription: 'Pick a formation, spin in 11 random countries and name a real footballer from each nation who fits the slot. Optional timer. Free soccer trivia game.' },
      { path: '/player-bingo', label: 'Player Bingo', emoji: '🎱', description: 'Complete a line on a 5x5 board before 3 strikes', addedOn: '2026-07-02',
        seoTitle: 'Player Bingo: Football Trivia Bingo Game',
        seoDescription: 'Real footballers appear one at a time, name only. Tap the square each one fits and complete a line on the 5x5 board before three strikes. Free soccer bingo.' },
      { path: '/sports-bingo', label: 'Sports Bingo', emoji: '🎫', description: 'Open packs of real players on a timer, mark the squares they satisfy', daily: true, addedOn: '2026-08-29',
        seoTitle: 'Sports Bingo: Soccer Pack Opening Bingo Game',
        seoDescription: 'Open timed packs of real players and mark every square on your soccer bingo card they satisfy before the pack closes. Daily, unlimited or race a CPU. Free.' },
      { path: '/alphabet-sprint', label: 'Alphabet Sprint', emoji: '⚡', description: 'Name a player per letter against the clock', addedOn: '2026-07-02',
        seoTitle: 'Alphabet Sprint: Timed Soccer Player Name Quiz',
        seoDescription: 'A letter drops and you name a footballer whose surname starts with it before the clock runs out. Streak bonuses, no repeats. Free soccer trivia against time.' },
      { path: '/clue-auction', label: 'Clue Auction', emoji: '💰', description: 'Buy clues, save points, name the secret player', addedOn: '2026-07-02',
        seoTitle: 'Clue Auction: Mystery Soccer Player Game',
        seoDescription: 'A secret footballer, a bank of 100 points and clues for sale. Buy what you need, guess when you dare and keep whatever is left. Free soccer guessing game.' },
      // Revived 2026-07-15. Retired 2026-07-06 as "you guess one guy and you're
      // done", root cause found: scoreRound was INVERTED for rarity mode, so
      // naming the most famous player in the pool scored a perfect 0 and the
      // winning strategy was the opposite of the premise. Fixed, plus the board
      // reveal (what the rarest answer actually was) is now shown after every
      // round, which is the real payoff of a rarity game and was missing entirely.
      // Overrated or Underrated and Tier List deleted 2026-08-28 per owner
      // review: "two buttons, no game feel" and "same reasoning, and only one
      // list ever playable". Routes redirect (/face-off and home), pages,
      // hooks, components and pool fetch removed, crowd vote tables left in
      // the database for the desktop lane's backend audit to drop or keep.
      { path: '/rarity-round', label: 'Rarity Round', emoji: '💎', description: 'Name the answer nobody else would. Rarest wins', daily: true, addedOn: '2026-07-03',
        seoTitle: 'Rarity Round: Rarest Answer Wins Soccer Quiz',
        seoDescription: 'Name a valid soccer answer nobody else would think of, because the obvious one scores worst. Five rounds, real data, plus a Crowd Says mode. Free and daily.' },
      { path: '/missing-xi', label: 'Missing XI', emoji: '🧩', description: 'Name the missing player from a famous real lineup', daily: true, addedOn: '2026-07-03',
        seoTitle: 'Missing XI: Guess the Missing Soccer Player',
        seoDescription: 'A famous real starting lineup with one player blanked out. Name the missing man in three guesses. Free daily soccer puzzle plus an unlimited archive.' },
      { path: '/sign-the-player', label: 'Sign the Player', emoji: '🔨', description: 'A blind auction: outbid two AI moguls, £1B each, then sim the showdown', addedOn: '2026-07-03',
        seoTitle: 'Sign the Player: Soccer Transfer Auction Game',
        seoDescription: 'Outbid two AI moguls with a billion pounds each for real footballers, fill your XI, then let a simulated mini league settle it. Free soccer auction game.' },
      { path: '/footle', label: 'Footle', emoji: '🎯', description: 'Guess the soccer player from stats', addedOn: '2025-01-01',
        seoTitle: 'Footle: Daily Soccer Player Guessing Game',
        seoDescription: 'Guess the mystery soccer player in eight tries. Colored tiles and arrows compare every guess on club, age, number and more. Free daily football puzzle.' },
      { path: '/career', label: 'Career Quiz', emoji: '📜', description: 'Guess from career history', addedOn: '2026-02-09',
        seoTitle: 'Career Quiz: Guess the Soccer Player by Clubs',
        seoDescription: "A footballer's whole career sits there season by season with the boxes covered. Reveal as few clubs and stats as you can and name him. Free soccer quiz." },
      { path: '/higher-lower', label: 'Higher or Lower', emoji: '📊', description: 'Compare all-time career stats', addedOn: '2026-02-09',
        seoTitle: 'Higher or Lower: Soccer Career Stats Game',
        seoDescription: "Your player's stats are face up and the challenger's are hidden. Pick appearances, goals or caps where yours wins and keep the streak going. Free soccer game." },
      { path: '/connections', label: 'Connections', emoji: '🔗', description: 'Find groups of 4 connected players', addedOn: '2026-02-09',
        seoTitle: 'Connections: Soccer Player Grouping Puzzle',
        seoDescription: 'Sixteen soccer players, four hidden groups of four. Sort every name into its secret category before your lives run out. A free football trivia puzzle.' },
      { path: '/build-your-xi', label: 'Build Your XI', emoji: '⚽', description: 'Create a lineup, get AI rated', addedOn: '2026-02-09',
        seoTitle: 'Build Your XI: Soccer Lineup Builder Game',
        seoDescription: 'A slot machine hands every position a random club or country. Name a player who fits each slot, then an AI grades the lineup and plays a season. Free soccer.' },
      // deleted 2026-08-05 per owner review: "Delete perfect lineup."
      // { path: '/perfect-lineup', label: 'Perfect Lineup', emoji: '⚽', description: 'Build an XI under random league & country constraints, then simulate', daily: true, isNew: true },
      { path: '/football-connect-4', label: 'Connect 4', emoji: '🔴', description: 'Soccer trivia meets Connect 4', addedOn: '2026-02-10',
        seoTitle: 'Connect 4: Soccer Trivia Grid Game',
        seoDescription: 'Classic four in a row where every disc costs a soccer answer. Name a player who fits the column and the row to claim the cell. Free two player trivia game.' },
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
      { path: '/free-kick', label: 'Free Kick', emoji: '🥅', description: 'Aim it, bend it, beat the wall and the keeper', daily: true, addedOn: '2026-09-04',
        seoTitle: 'Free Kick: Bend It Past the Wall Soccer Game',
        seoDescription: 'Aim, bend and time your power over ten free kicks, past a growing wall and a keeper who reads you. Daily and unlimited. A free soccer skill game to play.' },
      { path: '/soccer-grid', label: 'Soccer Grid', emoji: '⚽', description: '3×3 grid puzzle with rarity scores', daily: true, addedOn: '2026-03-08',
        seoTitle: 'Soccer Grid: Daily Football Player Grid Puzzle',
        seoDescription: 'Fill the daily 3x3 board with players who match both the row and the column. Rarity scores reward picks nobody else made. Free soccer trivia grid game.' },
      { path: '/world-cup-bracket', label: '2026 Bracket', emoji: '🌍', description: 'Build the 2026 bracket and score it against how the World Cup really went', addedOn: '2026-03-28',
        seoTitle: '2026 Bracket: World Cup Soccer Predictor',
        seoDescription: 'Build your 2026 World Cup bracket, every group and knockout round plus the awards, then score it against how the tournament really went. Free soccer game.' },
      { path: '/soccer-career', label: 'Soccer Career', emoji: '⚽', description: 'Create your look, sign for your boyhood club, get rich, get shady, retire a legend.', addedOn: '2026-03-28', featured: true,
        seoTitle: 'Soccer Career: Free Football Career Simulator',
        seoDescription: 'Start at 16 in a youth academy and live a whole soccer career: transfers, trophies, feuds, scandals and a legacy verdict. A free football life sim game.' },
      { path: '/fantasy-draft', label: 'Fantasy Draft', emoji: '🧑‍💼', description: 'Draft your ultimate XI against an AI opponent', addedOn: '2026-03-09',
        seoTitle: 'Fantasy Draft: Soccer XI Draft Against the AI',
        seoDescription: "Take turns with an AI rival drafting from one player pool under the day's squad rule, then a season is simulated and votes pick the winner. Free soccer draft." },
      // deleted 2026-07-08 per owner review: too easy/boring. Route kept for direct links; uncomment to revive.
      // { path: '/shirt-number', label: 'Shirt Number', emoji: '👕', description: 'Guess the kit number a player wears', daily: true, isNew: true },
      { path: '/transfer-path', label: 'Transfer Path', emoji: '🔄', description: 'Connect two players through shared clubs', daily: true, addedOn: '2026-04-10',
        seoTitle: 'Transfer Path: Connect Soccer Players Puzzle',
        seoDescription: 'Link two footballers through real teammates, where every step needs the same club in the same season. Six degrees of separation for soccer, free and daily.' },
      // deleted 2026-08-05 per owner review: "Guess the value [doesn't] even load and I would say u should delete it."
      // { path: '/guess-transfer-value', label: 'Guess The Value', emoji: '💰', description: 'Guess a player's transfer market value', daily: true, isNew: true },
      // moved from the retired Game Shows tab 2026-07-08 (owner: game-show games belong in their sport)
      { path: '/squad-deal', label: 'Squad Deal', emoji: '🏟️', description: 'Build an XI out of mystery boxes', addedOn: '2026-06-23',
        seoTitle: 'Squad Deal: Blind Box Soccer Squad Builder',
        seoDescription: "Every position is a wall of mystery boxes. Claim one blind, dodge the banker's offers, then simulate your soccer squad and see the grade. Free team builder." },
      { path: '/search-and-discard', label: 'Search and Discard', emoji: '🔎', description: 'The squad duel: keep one, bin two, settle it in a season', addedOn: '2026-08-29',
        seoTitle: 'Search and Discard: Soccer Squad Duel Game',
        seoDescription: 'Two managers share one pool of real footballers. Search three, keep one, bin the rest for good, then a simulated season settles it. Free soccer duel vs CPU.' },
      { path: '/gauntlet-draft', label: 'Gauntlet Draft', emoji: '⚔️', description: 'Pick your XI five cards at a time, then survive a five round cup', daily: true, addedOn: '2026-08-29',
        seoTitle: 'Gauntlet Draft: Soccer Draft and Knockout Cup',
        seoDescription: 'Pick your XI from five real players per slot, then survive a five round knockout cup against stronger and stronger teams. Free daily soccer draft game.' },
      { path: '/player-stock-market', label: 'Player Stock Market', emoji: '📈', description: 'Open a past season, buy an XI on stats alone, then roll the years forward', daily: true, addedOn: '2026-07-22',
        seoTitle: 'Player Stock Market: Soccer Investing Game',
        seoDescription: 'Buy an XI in a real past season from anonymous stat cards, then roll the years forward and watch the real market values move. Free soccer stats game.' },
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
      { path: '/perfect-season-nfl', label: '17-0 Perfect Season', emoji: '🏆', description: 'Draft an offense across eras, run the table', addedOn: '2026-07-01',
        seoTitle: '17-0 Perfect Season: NFL Football Draft Sim',
        seoDescription: 'Spin real pro football team seasons from 1999 to 2024, draft a cross era offense and simulate a 17 game season. Can you go unbeaten? Free NFL game.' },
      { path: '/front-office', label: 'NFL Front Office', emoji: '🏢', description: 'Full GM sim with real rosters: cap, trades, drafts, dynasties', addedOn: '2026-08-11', featured: true,
        seoTitle: 'NFL Front Office: Football GM Simulator',
        seoDescription: 'Take over any of the 32 teams with real rosters and run it all: the cap, free agency, trades and the draft. Chase a dynasty in this free NFL GM sim.' },
      { path: '/nfl-my-career', label: 'NFL My Career', emoji: '🌟', description: 'Draft night to Canton. 8 positions, 100+ crossroads, and a very tempting envelope', addedOn: '2026-08-11', featured: true,
        seoTitle: 'NFL My Career: Football Career Simulator',
        seoDescription: 'Create a prospect, get drafted by a real NFL team and live a whole career of stat lines, contracts, injuries and rings. Free pro football life sim.' },
      { path: '/football-grid', label: 'NFL Grid', emoji: '🏈', description: '3×3 grid puzzle with rarity scores', daily: true, addedOn: '2026-03-08',
        seoTitle: 'NFL Grid: Daily Pro Football Trivia Grid',
        seoDescription: 'Name a player for each cell of the daily 3x3 NFL grid who fits both the row and the column. Rarity scores reward deep cuts. Free football trivia.' },
      // retired 2026-07-08 per owner review: "too easy and boring... unless ur going to add to it, discard it". Route kept for direct links; uncomment to revive.
      // { path: '/football-timeline', label: 'Timeline', emoji: '📅', description: 'Order players by draft year', daily: true },
      // deleted 2026-08-05 per owner review: "Draft guessed is boring and I say delete it."
      // { path: '/football-draft', label: 'Draft Guesser', emoji: '🎰', description: 'Guess the draft round', daily: true },
      { path: '/nfl-career', label: 'NFL Career Path', emoji: '🏈', description: 'Guess the NFL player from clues', daily: true, addedOn: '2026-02-09',
        seoTitle: 'NFL Career Path: Guess the Football Player',
        seoDescription: 'One mystery NFL player, six career clues from draft round to team history. Guess early for a bigger score. Free daily pro football trivia game.' },
      { path: '/nfl-higher-lower', label: 'NFL Higher or Lower', emoji: '📊', description: 'Which star scored more career touchdowns?', daily: true, addedOn: '2026-03-08',
        seoTitle: 'NFL Higher or Lower: Football Stats Game',
        seoDescription: 'Two NFL stars, one career stat. Pick who has the bigger number across touchdowns, receptions, rushing yards and more. Free daily football trivia.' },
      { path: '/nfl-connections', label: 'NFL Connections', emoji: '🧩', description: 'Group 20 players into four hidden connections', daily: true, addedOn: '2026-03-08',
        seoTitle: 'NFL Connections: Football Grouping Puzzle',
        seoDescription: 'Twenty NFL players hide four groups of five: a franchise, a college, a draft slot or a milestone. Find them before you run out. Free daily football puzzle.' },
      { path: '/nfl-connect-4', label: 'NFL Connect 4', emoji: '🏈', description: 'Football trivia meets Connect 4', addedOn: '2026-02-10',
        seoTitle: 'NFL Connect 4: Football Trivia Grid Game',
        seoDescription: 'Four in a row, but every piece costs an NFL answer. Name a player who matches the column and the row where it lands to claim the cell. Free football trivia.' },
      { path: '/missing-eleven', label: 'Missing Eleven', emoji: '🕵️', description: 'Name the missing starter from a famous Super Bowl offense', daily: true, addedOn: '2026-07-22',
        seoTitle: 'Missing Eleven: Super Bowl Lineup NFL Quiz',
        seoDescription: 'A real Super Bowl starting lineup, offense or defense, with one name blanked out. Three guesses to name who started. Free daily NFL football quiz.' },
      // retired 2026-07-08 per owner review: "like 40 teams to choose from... get rid of this game". Route kept for direct links; uncomment to revive.
      // { path: '/guess-nfl-team', label: 'Guess The Team', emoji: '🏈', description: 'Identify the NFL franchise', daily: true, isNew: true },
      { path: '/conquest', label: 'NFL Conquest', emoji: '🗺️', description: 'The imperialism map: winners annex whole empires until one team rules America', daily: true, addedOn: '2026-03-14',
        seoTitle: 'NFL Conquest: Football Imperialism Map Game',
        seoDescription: "America split into 32 NFL empires. Every winner annexes the loser's whole territory until one team rules the map. Free football strategy game." },
      { path: '/nfl-gauntlet-draft', label: 'Gauntlet Draft: NFL', emoji: '⚔️', description: 'Pick your offense five cards at a time, then survive a five round cup', daily: true, addedOn: '2026-09-10',
        seoTitle: 'Gauntlet Draft: NFL Offense Draft Challenge',
        seoDescription: 'Draft a seven man NFL offense, one slot at a time from five real players, then survive a five round knockout cup. Free daily football draft game.' },
    ],
  },
  {
    // 2026-07-08: College Football + College Basketball merged into one
    // College Sports tab per owner review ("just put the two together").
    title: 'College Sports',
    emoji: '🎓',
    games: [
      { path: '/college-grid', label: 'College Grid', emoji: '🎓', description: 'College football 3×3 grid puzzle', daily: true, addedOn: '2026-03-08',
        seoTitle: 'College Grid: Daily College Football Trivia',
        seoDescription: 'A daily 3x3 college football grid. Name a player who fits the school and the column, from positions to Heisman winners and draft picks. Free CFB trivia.' },
      { path: '/guess-the-college', label: 'Guess The College', emoji: '🏫', description: 'Guess the D1 school from clues', daily: true, addedOn: '2026-03-08',
        seoTitle: 'Guess The College: D1 College Sports Quiz',
        seoDescription: 'One Division 1 school hides behind a stack of clues, from a single vibe word down to the school colors. Guess early to score big. Free college sports trivia.' },
      { path: '/guess-cbb-team', label: 'Guess The CBB Program', emoji: '🏀', description: 'Guess the college basketball program', daily: true, addedOn: '2026-03-09',
        seoTitle: 'Guess The CBB Program: College Basketball Quiz',
        seoDescription: 'One college basketball program hides behind six locked clues, from blue bloods to mid majors. Solve it early for more points. Free daily CBB trivia.' },
      { path: '/cbb-grid', label: 'College Basketball Grid', emoji: '🔲', description: 'Fill the 3×3 with players who match the school and the achievement', daily: true, addedOn: '2026-07-03',
        seoTitle: 'College Basketball Grid: Daily CBB Trivia',
        seoDescription: 'Fill the 3x3 college basketball grid with players who match the school and the career achievement. New board daily plus unlimited mode. Free CBB trivia.' },
      { path: '/cfb-higher-lower', label: 'CFB Higher or Lower', emoji: '📊', description: 'Which QB threw for more college yards?', daily: true, addedOn: '2026-03-08',
        seoTitle: 'CFB Higher or Lower: College Football QB Quiz',
        seoDescription: 'Two quarterbacks, one question: who threw for more passing yards in college? Not the pros, college. Free daily college football trivia game.' },
      { path: '/cfb-dynasty', label: 'CFB Dynasty', emoji: '🏟️', description: 'Full program sim: NIL recruiting, the portal, the 12-team Playoff, dynasties', addedOn: '2026-08-11', featured: true,
        seoTitle: 'CFB Dynasty: College Football Program Sim',
        seoDescription: 'Run a real college football program: NIL recruiting, the transfer portal, conference title races and the 12 team Playoff, across unlimited seasons. Free.' },
      { path: '/cbb-dynasty', label: 'CBB Dynasty', emoji: '🏀', description: 'College hoops sim: one-and-dones, conference tournaments, 32-team March, Cinderella', addedOn: '2026-08-11', featured: true,
        seoTitle: 'CBB Dynasty: College Basketball Program Sim',
        seoDescription: 'Run a real college hoops program: NIL recruiting, one and done freshmen, the portal, conference tournaments and a 32 team March. Free college basketball sim.' },
    ],
  },
  {
    title: 'Pro Basketball',
    emoji: '🏀',
    games: [
      { path: '/buzzer-beater', label: 'Buzzer Beater', emoji: '🏀', description: 'Pick the arc, beat the hand, drop ten jump shots', daily: true, addedOn: '2026-09-04',
        seoTitle: 'Buzzer Beater: Basketball Jump Shot Game',
        seoDescription: 'Set the arc, fade off the closeout and time the strength bar over ten jump shots, backing up each time. Daily and unlimited. A free basketball shooting game.' },
      { path: '/perfect-season-nba', label: '82-0 Perfect Season', emoji: '🏆', description: 'Spin team seasons, draft a six man rotation', addedOn: '2026-07-01',
        seoTitle: '82-0 Perfect Season: NBA Basketball Draft Sim',
        seoDescription: 'Every spin lands on a real NBA team season. Draft a cross era starting five plus a sixth man, then simulate 82 games. Can you go unbeaten? Free basketball.' },
      { path: '/stat-detective', label: 'Stat Detective', emoji: '🔎', description: 'Name the player behind the mystery stat line', addedOn: '2026-07-02',
        seoTitle: 'Stat Detective: Guess the NBA Player Quiz',
        seoDescription: 'A real NBA season with the name scrubbed off: the decade, the position and the per 36 line. Name the player in eight guesses. Free basketball trivia game.' },
      { path: '/nba-stat-line', label: 'NBA Stat Line', emoji: '📊', description: 'Blend five real seasons into a target per 36 line', daily: true, addedOn: '2026-08-29',
        seoTitle: 'NBA Stat Line: Basketball Stats Puzzle Game',
        seoDescription: 'Match a target per 36 NBA stat line by blending five real player seasons, weighted by minutes. Daily shared target plus unlimited. Free basketball puzzle.' },
      { path: '/nba-starting-5', label: 'NBA Starting 5', emoji: '🏀', description: 'Build a lineup with stat challenges', addedOn: '2026-02-09',
        seoTitle: 'NBA Starting 5: Basketball Lineup Builder',
        seoDescription: 'Spin a stat challenge, then build a starting five with each pick from a random NBA franchise. Your memory of who played where is the game. Free basketball.' },
      { path: '/nba-connect-4', label: 'NBA Connect 4', emoji: '🏀', description: 'NBA trivia meets Connect 4', addedOn: '2026-02-10',
        seoTitle: 'NBA Connect 4: Basketball Trivia Grid Game',
        seoDescription: 'The classic 7 by 6 board, but every cell costs an NBA answer. Name a player who fits the row and the column to drop your piece. Free basketball trivia.' },
      { path: '/nba-chain', label: 'NBA Chain', emoji: '🔗', description: 'Build a chain of connected players', addedOn: '2026-02-10',
        seoTitle: 'NBA Chain: Basketball Teammate Chain Game',
        seoDescription: 'Start from one NBA star, name a teammate, then a teammate of his, and keep the chain going. One wrong link ends the run. Free basketball trivia game.' },
      { path: '/nba-higher-lower', label: 'NBA Higher or Lower', emoji: '📊', description: 'Which legend scored more career points?', daily: true, addedOn: '2026-03-08',
        seoTitle: 'NBA Higher or Lower: Basketball Points Quiz',
        seoDescription: 'Two NBA legends, one question: who scored more career points? The pool is the top 80 scorers ever, so no easy outs. Free daily basketball trivia.' },
      { path: '/nba-grid', label: 'NBA Franchise Grid', emoji: '🔲', description: 'Fill the 3×3 with players who match both teams', daily: true, addedOn: '2026-07-03',
        seoTitle: 'NBA Franchise Grid: Daily Basketball Trivia',
        seoDescription: 'Fill the 3x3 NBA grid with players whose careers match the row and the column, from franchises to milestones. Daily board plus unlimited. Free basketball.' },
      { path: '/nba-connections', label: 'NBA Connections', emoji: '🧩', description: 'Group 20 players into four hidden connections', daily: true, addedOn: '2026-03-08',
        seoTitle: 'NBA Connections: Basketball Grouping Puzzle',
        seoDescription: 'Twenty NBA players hide four groups of five tied by a franchise, a milestone, a birth country or a draft slot. Find them all. Free daily basketball puzzle.' },
      { path: '/nba-career', label: 'NBA Career Path', emoji: '📜', description: 'Guess the NBA player from progressive clues', daily: true, addedOn: '2026-03-08',
        seoTitle: 'NBA Career Path: Guess the Basketball Player',
        seoDescription: 'A mystery NBA player hides behind a stack of clues, starting with just a position. Every clue makes it easier and pays less. Free daily basketball trivia.' },
      { path: '/missing-five', label: 'Missing Five', emoji: '🕵️', description: 'Name the missing starter from a famous real lineup', daily: true, addedOn: '2026-07-22',
        seoTitle: 'Missing Five: NBA Finals Starting Lineup Quiz',
        seoDescription: 'A real starting five from a famous NBA Finals night with one name blanked out. Can you remember who actually started? Free daily basketball quiz.' },
      { path: '/perfect-lineup-nba', label: 'Perfect Lineup: NBA', emoji: '🏀', description: 'Build a starting 5 under random team & era constraints, then simulate', daily: true, addedOn: '2026-06-14',
        seoTitle: 'Perfect Lineup: NBA Starting Five Puzzle',
        seoDescription: 'Build an NBA starting five where three slots demand a player from a random franchise or decade, then simulate the game and share it. Free basketball puzzle.' },
      { path: '/conquest-nba', label: 'NBA Conquest', emoji: '🗺️', description: 'Imperialism mode: winners annex whole empires until one team rules the map', daily: true, addedOn: '2026-03-14',
        seoTitle: 'NBA Conquest: Basketball Imperialism Map Game',
        seoDescription: "Pick a team, inherit the land around its arena and try to own the country. Every NBA winner annexes the loser's whole empire. Free basketball strategy game." },
      { path: '/nba-front-office', label: 'NBA Front Office', emoji: '🏢', description: 'Full GM sim: cap, trades, the play-in, best-of-7 wars, dynasties', addedOn: '2026-08-11', featured: true,
        seoTitle: 'NBA Front Office: Basketball GM Simulator',
        seoDescription: 'Run a real NBA franchise: the cap sheet, waivers, trades the AI weighs, the play in and best of seven series, drafts and dynasties. A free basketball GM sim.' },
      { path: '/nba-my-career', label: 'NBA My Career', emoji: '🌟', description: 'Draft night to the rafters. 5 positions, 100+ crossroads, and one very tempting phone call', addedOn: '2026-08-11', featured: true,
        seoTitle: 'NBA My Career: Basketball Career Simulator',
        seoDescription: 'Create a prospect, land on a real NBA team and live a whole career: stat lines, contracts, trade demands, rings and a legacy verdict. Free basketball sim.' },
      { path: '/nba-gauntlet-draft', label: 'Gauntlet Draft: NBA', emoji: '⚔️', description: 'Pick your five, five cards at a time, then survive a five round cup', daily: true, addedOn: '2026-09-10',
        seoTitle: 'Gauntlet Draft: NBA Starting Five Draft Game',
        seoDescription: 'Draft an NBA starting five one slot at a time from five real players, then survive a five round knockout cup. Free daily basketball draft game.' },
    ],
  },
  {
    title: 'Baseball',
    emoji: '⚾',
    games: [
      { path: '/perfect-season-mlb', label: '162-0 Perfect Season', emoji: '🏆', description: 'Spin, draft across eras, chase perfection', addedOn: '2026-07-01',
        seoTitle: '162-0 Perfect Season: MLB Baseball Draft Sim',
        seoDescription: 'Spin across a century of baseball, draft a cross era lineup from real team seasons and simulate all 162 games. Can you go unbeaten? Free MLB game.' },
      { path: '/baseball-career', label: 'Career Path', emoji: '⚾', description: 'Guess the baseball player', daily: true, addedOn: '2026-03-08',
        seoTitle: 'Career Path: Guess the MLB Baseball Player',
        seoDescription: 'One mystery baseball player, six clues from position and draft to teams, stats and awards. The sooner you guess, the more you score. Free daily MLB trivia.' },
      { path: '/mlb-higher-lower', label: 'MLB Higher or Lower', emoji: '📊', description: 'Which legend hit more career home runs?', daily: true, addedOn: '2026-03-08',
        seoTitle: 'MLB Higher or Lower: Home Run Baseball Quiz',
        seoDescription: 'Two legends side by side: who hit more career home runs? Finished careers only, Ruth through Ortiz, so every number is final. Free daily MLB baseball quiz.' },
      { path: '/mlb-grid', label: 'MLB Franchise Grid', emoji: '🔲', description: 'Fill the 3×3 with legends who match both teams', daily: true, addedOn: '2026-07-03',
        seoTitle: 'MLB Franchise Grid: Daily Baseball Trivia',
        seoDescription: 'Nine cells, nine legends. Fill the 3x3 MLB grid with players whose careers match both the row and the column. Daily board plus unlimited. Free baseball.' },
      { path: '/mlb-connect-4', label: 'MLB Connect 4', emoji: '⚾', description: 'Baseball trivia meets Connect 4', addedOn: '2026-02-10',
        seoTitle: 'MLB Connect 4: Baseball Trivia Grid Game',
        seoDescription: 'Four in a row with a baseball brain. Every row and column is a category, and claiming a cell means naming an MLB player who fits both. Free trivia for two.' },
      { path: '/mlb-gauntlet-draft', label: 'Gauntlet Draft: MLB', emoji: '⚾', description: 'Fill the lineup card five cards at a time, then survive October', daily: true, addedOn: '2026-09-11',
        seoTitle: 'Gauntlet Draft: MLB Lineup Card Draft Game',
        seoDescription: 'Fill an MLB lineup card one spot at a time from five real players, then survive a five round October against stronger teams. Free daily baseball draft.' },
      { path: '/conquest-mlb', label: 'MLB Conquest', emoji: '🗺️', description: 'Imperialism at the ballpark: winners annex whole empires, two invaders start landless', daily: true, addedOn: '2026-08-11',
        seoTitle: 'MLB Conquest: Baseball Imperialism Map Game',
        seoDescription: "Every territory starts with its nearest MLB park, and every winner annexes the loser's whole empire. Two clubs start with nothing. Free baseball map game." },
      { path: '/mlb-my-career', label: 'MLB My Career', emoji: '🌟', description: 'Draft day to Cooperstown. 11 positions, 100+ crossroads, and a camera in center field', addedOn: '2026-08-11', featured: true,
        seoTitle: 'MLB My Career: Baseball Career Simulator',
        seoDescription: 'Create a prospect, join a real MLB team and live a full career of stat lines, contracts, injuries and rings, then see if Cooperstown calls. Free baseball sim.' },
      { path: '/mlb-front-office', label: 'MLB Front Office', emoji: '🏢', description: 'Full GM sim with real 2026 rosters: the tax line, trades, October, dynasties', addedOn: '2026-08-11', featured: true,
        seoTitle: 'MLB Front Office: Baseball GM Simulator',
        seoDescription: 'Run a real MLB franchise: payroll under the tax line, trades the AI weighs, a 162 game season and October, drafts and dynasties. A free baseball GM sim.' },
      { path: '/missing-nine', label: 'Missing Nine', emoji: '🕵️', description: 'Name the missing starter from a famous World Series batting order', daily: true, addedOn: '2026-07-22',
        seoTitle: 'Missing Nine: World Series Lineup MLB Quiz',
        seoDescription: 'A real World Series starting nine in batting order with one name blanked out. Can you remember who actually started? Free daily baseball quiz.' },
      { path: '/baseball-connections', label: 'Connections', emoji: '⚾', description: 'Group baseball players', daily: true, addedOn: '2026-03-08',
        seoTitle: 'Connections: MLB Baseball Grouping Puzzle',
        seoDescription: 'Twenty baseball players hide four groups of five tied by a franchise, an award or a country. Find every group before you run out. Free daily MLB puzzle.' },
    ],
  },
  {
    title: 'Hockey',
    emoji: '🏒',
    games: [
      { path: '/perfect-season-nhl', label: '82-0 Perfect Season', emoji: '🏆', description: 'Spin franchises and eras, chase 82-0', addedOn: '2026-07-01',
        seoTitle: '82-0 Perfect Season: NHL Hockey Draft Sim',
        seoDescription: 'Every spin lands on a real NHL franchise and decade. Fill six slots from a century of hockey, then the sim plays 82 games. Can you go unbeaten? Free.' },
      { path: '/puck-detective', label: 'Puck Detective', emoji: '🏒', description: 'Guess the mystery NHL player with attribute clues', daily: true, addedOn: '2026-07-03',
        seoTitle: 'Puck Detective: Guess the NHL Player Game',
        seoDescription: 'Name the mystery NHL skater in eight guesses. Every guess compares team, position, nationality, age and jersey number. Free daily hockey guessing game.' },
      { path: '/hockey-grid', label: 'NHL Franchise Grid', emoji: '🥅', description: '3x3 grid with NHL franchises and career milestones', daily: true, addedOn: '2026-07-03',
        seoTitle: 'NHL Franchise Grid: Daily Hockey Trivia',
        seoDescription: 'Every row and column is an NHL franchise or a career milestone, and each cell wants a player who fits both. Daily 3x3 board plus unlimited. Free hockey.' },
      { path: '/hockey-career', label: 'Career Path', emoji: '🏒', description: 'Guess the hockey player', daily: true, addedOn: '2026-03-08',
        seoTitle: 'Career Path: Guess the NHL Hockey Player',
        seoDescription: 'One mystery hockey player and a stack of clues on country, draft, teams, stats and awards. Swing early for the full score. Free daily NHL trivia game.' },
      { path: '/hockey-higher-lower', label: 'Higher / Lower', emoji: '🏒', description: 'Compare career points', daily: true, addedOn: '2026-03-08',
        seoTitle: 'Higher / Lower: NHL Hockey Career Points Quiz',
        seoDescription: 'Two hockey players side by side: who finished with more career points? Ten quick rounds and a streak bonus that snowballs. Free daily NHL trivia game.' },
      { path: '/nhl-connections', label: 'NHL Connections', emoji: '🧩', description: 'Group 20 players into four hidden connections', daily: true, addedOn: '2026-03-08',
        seoTitle: 'NHL Connections: Hockey Grouping Puzzle',
        seoDescription: 'Twenty NHL players, four hidden groups of five sharing a franchise or a career milestone. Find all four on four lives. Free daily hockey puzzle.' },
      { path: '/conquest-nhl', label: 'NHL Conquest', emoji: '🗺️', description: 'Imperialism on ice: winners annex whole empires, five invaders start landless', daily: true, addedOn: '2026-08-11',
        seoTitle: 'NHL Conquest: Hockey Imperialism Map Game',
        seoDescription: "Every patch of the map starts loyal to its nearest NHL arena. Win and you annex the loser's whole empire, and five clubs start with nothing. Free hockey game." },
      { path: '/nhl-my-career', label: 'NHL My Career', emoji: '🌟', description: 'Draft day to the rafters. 5 positions, 100+ crossroads, and an envelope on the bench', addedOn: '2026-08-11', featured: true,
        seoTitle: 'NHL My Career: Hockey Career Simulator',
        seoDescription: 'Create a prospect, join a real NHL team and live a full career of stat lines, contracts, injuries and rings, then see if the Hall calls. Free hockey life sim.' },
      { path: '/nhl-front-office', label: 'NHL Front Office', emoji: '🏢', description: 'Full GM sim with real 2026-27 rosters: hard cap, OT points, the bracket, the Cup', addedOn: '2026-08-11', featured: true,
        seoTitle: 'NHL Front Office: Hockey GM Simulator',
        seoDescription: 'Run a real NHL franchise: a hard cap, waivers, trades the AI weighs, a points race and four best of seven rounds to the Cup. Free hockey GM sim game.' },
      { path: '/nhl-connect-4', label: 'NHL Connect 4', emoji: '🏒', description: 'Hockey trivia meets Connect 4', addedOn: '2026-02-10',
        seoTitle: 'NHL Connect 4: Hockey Trivia Grid Game',
        seoDescription: 'Four in a row, hockey style. Pick a column and name a real NHL player who fits the row where your piece lands to claim it. Free pass and play trivia.' },
      { path: '/perfect-lineup-nhl', label: 'Perfect Lineup: NHL', emoji: '🏒', description: 'Build a dream line under random team & era constraints, then simulate', daily: true, addedOn: '2026-06-14',
        seoTitle: 'Perfect Lineup: NHL Hockey Dream Line Game',
        seoDescription: 'Build an NHL dream line of three forwards, two defensemen and a goalie where slots demand a random team or era, then simulate. Free hockey puzzle game.' },
    ],
  },
  {
    title: 'Formula 1',
    emoji: '🏎️',
    games: [
      { path: '/f1-driver', label: 'Guess The F1 Driver', emoji: '🏎️', description: 'Guess the mystery F1 driver from clues', daily: true, addedOn: '2026-03-09',
        seoTitle: 'Guess The F1 Driver: Formula 1 Trivia Game',
        seoDescription: 'A mystery Formula 1 great hides behind six clues: race wins, titles, teams, nationality and a famous moment. Solve it early to score big. Free daily F1 quiz.' },
      { path: '/f1-higher-lower', label: 'F1 Higher or Lower', emoji: '📊', description: 'Which driver won more Grands Prix?', daily: true, addedOn: '2026-03-08',
        seoTitle: 'F1 Higher or Lower: Formula 1 Race Wins Quiz',
        seoDescription: 'Two drivers, one question: who won more Grands Prix? The pool is every F1 driver with at least 8 wins, from the 1950s on. Free daily Formula 1 trivia.' },
      { path: '/f1-constructor', label: 'Guess The Constructor', emoji: '🏗️', description: 'Guess the mystery F1 team from clues', daily: true, addedOn: '2026-03-09',
        seoTitle: 'Guess The Constructor: F1 Team Trivia Quiz',
        seoDescription: 'A mystery Formula 1 team hides behind six clues: its country, era, titles, livery and a famous driver. Every clue cuts your score. Free daily F1 quiz.' },
      { path: '/perfect-lineup-f1', label: 'Perfect Lineup: F1', emoji: '🏎️', description: 'Build a 5-driver dream squad under random team/era/country constraints', daily: true, addedOn: '2026-06-14',
        seoTitle: 'Perfect Lineup: F1 Dream Driver Squad Game',
        seoDescription: 'Fill five F1 driver seats where three come with a team, era or country rule, then simulate a season and share your result. Free Formula 1 puzzle game.' },
    ],
  },
  {
    title: 'Tennis',
    emoji: '🎾',
    games: [
      { path: '/guess-tennis-player', label: 'Guess The Player', emoji: '🎾', description: 'Guess the mystery tennis player from clues', daily: true, addedOn: '2026-03-09',
        seoTitle: 'Guess The Player: ATP and WTA Tennis Quiz',
        seoDescription: 'A mystery tennis player from either tour hides behind six clues, from a vibe word to Grand Slam details. Commit early for a bigger score. Free daily trivia.' },
      { path: '/tennis-chain', label: 'Tennis Chain', emoji: '🔗', description: 'Build a chain of Grand Slam defeats', addedOn: '2026-03-09',
        seoTitle: 'Tennis Chain: Grand Slam Defeats Trivia Game',
        seoDescription: 'Start from a tennis legend and name a player who beat them at a Grand Slam, then who beat that player. One mistake ends the run. Free tennis trivia game.' },
      { path: '/tennis-higher-lower', label: 'Tennis Higher or Lower', emoji: '📊', description: 'Which legend won more Grand Slam titles?', daily: true, addedOn: '2026-03-08',
        seoTitle: 'Tennis Higher or Lower: Grand Slam Titles Quiz',
        seoDescription: 'Who won more Grand Slam singles titles? Ten rounds of legends from both tours in one pool, from the 1920s to today. Free daily tennis trivia game.' },
    ],
  },
  {
    title: 'Golf',
    emoji: '🏌️',
    games: [
      { path: '/guess-the-golfer', label: 'Guess The Golfer', emoji: '⛳', description: 'A mystery major champion, six clues, fewer is better', daily: true, addedOn: '2026-08-04',
        seoTitle: 'Guess The Golfer: Daily Golf Majors Quiz',
        seoDescription: 'A mystery major champion hides behind six clues, starting with the years they won. Every extra clue costs points. Free daily golf trivia plus unlimited.' },
      { path: '/golf-higher-lower', label: 'Golf Higher or Lower', emoji: '📊', description: 'Which legend won more majors?', daily: true, addedOn: '2026-03-08',
        seoTitle: 'Golf Higher or Lower: Major Championships Quiz',
        seoDescription: 'Two golf champions side by side: who won more majors? The pool runs from Old Tom Morris to Scottie Scheffler. Free daily golf trivia, ten rounds a go.' },
    ],
  },
  {
    title: 'Aussie Rules',
    emoji: '🏉',
    games: [
      { path: '/afl-higher-lower', label: 'AFL Higher or Lower', emoji: '📊', description: 'Which legend kicked more career goals?', daily: true, addedOn: '2026-03-08',
        seoTitle: 'AFL Higher or Lower: Aussie Rules Goals Quiz',
        seoDescription: 'Two VFL and AFL greats side by side: who kicked more career goals? Sixty retired legends, so no total ever moves. Free daily Aussie rules footy trivia.' },
    ],
  },
  {
    title: 'NASCAR',
    emoji: '🏁',
    games: [
      { path: '/guess-nascar-driver', label: 'Guess The Driver', emoji: '🏁', description: 'Guess the mystery NASCAR driver from clues', daily: true, addedOn: '2026-03-09',
        seoTitle: 'Guess The Driver: NASCAR Cup Series Quiz',
        seoDescription: 'A mystery NASCAR Cup Series driver hides behind six clues, from winning years and titles to three real race wins. Free daily stock car racing trivia.' },
      { path: '/nascar-chain', label: 'NASCAR Chain', emoji: '🔗', description: 'Build a chain of Cup champions', addedOn: '2026-03-09',
        seoTitle: 'NASCAR Chain: Cup Series Champions Trivia',
        seoDescription: 'Name a driver who beat the current one to a NASCAR Cup Series title, then who beat that driver, and keep going. One wrong link ends it. Free racing trivia.' },
    ],
  },
  {
    title: 'Combat Sports',
    emoji: '🥊',
    games: [
      { path: '/fight-career', label: 'Fight Career', emoji: '👊', description: 'Turn pro, pick your fights and climb to a world title. The damage never heals.', addedOn: '2026-09-16',
        seoTitle: 'Fight Career: Boxing Career Simulator Game',
        seoDescription: 'Turn pro as a nobody, pick your fights, run your camps and climb to a world title before the damage catches up. Free boxing career sim, invented fighters.' },
      { path: '/fight-promoter', label: 'Fight Promoter', emoji: '🎟️', description: 'Book the room, make the fights, pay the purses. Selling tonight and building a name pull against each other.', addedOn: '2026-09-16',
        seoTitle: 'Fight Promoter: Boxing Promotion Sim Game',
        seoDescription: 'Book the room, make the fights, set the ticket price and pay the purses. Selling tonight and building your name pull apart. Free boxing matchmaking sim.' },
      { path: '/fight-gym', label: 'Fight Gym', emoji: '🥊', description: 'Sign fighters, pick their nights, take your cut, and decide when a man is finished.', addedOn: '2026-09-16',
        seoTitle: 'Fight Gym: Boxing Gym Management Sim',
        seoDescription: 'Sign fighters nobody wanted, find them the right nights and decide when a man has had enough. The money is yours, the damage is his. Free boxing gym sim.' },
      { path: '/ufc', label: 'UFC Guesser', emoji: '🥊', description: 'Guess the UFC fighter', addedOn: '2026-02-10',
        seoTitle: 'UFC Guesser: Guess the MMA Fighter Game',
        seoDescription: 'Eight guesses to name a mystery UFC fighter. Every guess lights up green, yellow or red with arrows on each stat. Deduction, not luck. Free MMA trivia game.' },
      { path: '/ufc-chain', label: 'Combat Chain', emoji: '🔗', description: 'Build a chain of fighters who beat each other', addedOn: '2026-03-09',
        seoTitle: 'Combat Chain: MMA Fighter Chain Trivia Game',
        seoDescription: 'Name a fighter who beat your current fighter, then one who beat them, and build the longest chain of real MMA results. One miss ends it. Free fight trivia.' },
    ],
  },
  {
    title: 'World & Olympic Games',
    emoji: '🌍',
    games: [
      { path: '/rank-em', label: "Rank 'Em", emoji: '📊', description: 'Put five players in order by a career stat, most to fewest', daily: true, addedOn: '2026-08-04',
        seoTitle: "Rank 'Em: Sports Stats Ranking Quiz",
        seoDescription: 'One career stat, five greats, one shot at the right order, most to fewest. A new daily ranking across the NBA, NHL and MLB plus unlimited. Free sports quiz.' },
      { path: '/teammates', label: 'Teammates or Not?', emoji: '🤝', description: 'Were they ever teammates?', addedOn: '2026-03-08',
        seoTitle: 'Teammates or Not? NFL, NBA and Soccer Quiz',
        seoDescription: 'Two athletes from the NFL, NBA or soccer. Did they ever wear the same shirt? Call it yes or no and learn which careers crossed. Free sports trivia game.' },
      { path: '/olympics', label: 'The Medal Games', emoji: '🏅', description: 'Guess the mystery athlete from clues', daily: true, addedOn: '2026-03-08',
        seoTitle: 'The Medal Games: Guess the Olympic Athlete',
        seoDescription: 'A mystery Olympic athlete from the Summer or Winter Games hides behind a stack of clues, starting with the sport. Guess early. Free daily sports trivia.' },
      { path: '/guess-the-year', label: 'Guess The Year', emoji: '📅', description: 'What year did these happen?', daily: true, addedOn: '2026-03-09',
        seoTitle: 'Guess The Year: Sports History Trivia Game',
        seoDescription: 'Six things happened across the sports world in one year. Each clue is a different sport, so guess the year as early as you can. Free daily sports trivia.' },
      { path: '/guess-the-nation', label: 'Guess The Nation', emoji: '🌍', description: 'Identify the mystery sporting nation', daily: true, addedOn: '2026-03-09',
        seoTitle: 'Guess The Nation: World Sports Trivia Quiz',
        seoDescription: "A mystery country's sporting story told in clues: medal counts, famous moments, even flag colors. Early solves pay best. Free daily world sports trivia." },
      { path: '/hof-or-bust', label: 'Hall of Fame or Bust?', emoji: '🏆', description: 'Is this player a legend or a letdown?', daily: true, addedOn: '2026-04-10',
        seoTitle: 'Hall of Fame or Bust? Sports Stats Quiz',
        seoDescription: 'An anonymous career stat line from a real player. Vote Hall of Famer or bust, then see the name and how everyone else called it. Free sports trivia game.' },
      { path: '/champ-or-not', label: 'Champ or Not', emoji: '🏆', description: 'Ten title claims, true or false. Spot the fakes', daily: true, addedOn: '2026-08-21',
        seoTitle: 'Champ or Not: True or False Sports Champions',
        seoDescription: 'Ten claims about champions across the NFL, NBA, MLB, NHL, college, soccer and footy. True or false, ten seconds each. Spot the fakes. Free daily sports quiz.' },
      { path: '/whod-they-beat', label: "Who'd They Beat?", emoji: '🥈', description: 'The champ is given. Name the team they beat in the finals', daily: true, addedOn: '2026-08-21',
        seoTitle: "Who'd They Beat? Sports Finals Runner Up Quiz",
        seoDescription: 'We name the champion and the year across the NFL, NBA, MLB, NHL and WNBA. You pick who they beat in the final from four real options. Free daily sports quiz.' },
      { path: '/silverware-sort', label: 'Silverware Sort', emoji: '🥇', description: 'Stack five teams in order by real title counts', daily: true, addedOn: '2026-08-21',
        seoTitle: 'Silverware Sort: Sports Titles Ranking Quiz',
        seoDescription: 'Five teams from one competition, one question: who has more titles? Stack them in order across the NFL, NBA, MLB, NHL, college and soccer. Free sports quiz.' },
      { path: '/hall-of-champions', label: 'Hall of Champions', emoji: '🏛️', description: 'Idle museum: buy real championships, fill ten wings, earn while you are away', addedOn: '2026-08-21',
        seoTitle: 'Hall of Champions: Idle Sports Museum Game',
        seoDescription: 'Build a museum out of real championship history, from Super Bowl I to this year. Admission keeps paying while you are away. A free idle sports game.' },
      { path: '/idle-arena', label: 'Idle Arena', emoji: '👆', description: 'Tap to score, sign a squad that scores for you, lift trophies, earn while you are away', addedOn: '2026-08-25',
        seoTitle: 'Idle Arena: Free Sports Clicker Game',
        seoDescription: 'Tap to score, sign a squad of eight archetypes that scores for you and lift trophies that make every run stronger. Free idle sports clicker, no sign up.' },
      { path: '/face-off', label: 'Face Off', emoji: '⚡', description: 'Two names, one stat, ten seconds. Beat the rival across ten sports', daily: true, addedOn: '2026-08-25',
        seoTitle: 'Face Off: Sports Stats Duel Against a Rival',
        seoDescription: 'Two athletes, one stat, ten seconds. Tap who has more before the rival does, over ten rounds across ten sports, plus a daily duel. Free sports trivia game.' },
      { path: '/score-predictor', label: 'Score Predictor', emoji: '📊', description: 'Predict the final score of famous matches', daily: true, addedOn: '2026-04-10',
        seoTitle: 'Score Predictor: Famous Sports Scores Quiz',
        seoDescription: 'Call the exact final score of a famous match from the teams, the competition, the date and a hint. Soccer, NFL and NBA classics. Free sports trivia game.' },
      // moved from the retired Game Shows tab 2026-07-08 (owner: game-show games belong with their sport; these two span all sports)
      { path: '/list-quiz', label: 'Name Them All', emoji: '📝', description: 'How many champions can you name?', addedOn: '2026-07-01',
        seoTitle: 'Name Them All: Sports Champions List Quiz',
        seoDescription: 'Pick a list and empty your brain: Super Bowl MVPs, F1 world champions, Masters winners and more, all real history. Free sports list quizzes, no sign up.' },
      { path: '/minefield', label: 'Minefield', emoji: '💣', description: 'Click everyone who belongs. Some tiles explode', daily: true, addedOn: '2026-07-10',
        seoTitle: 'Minefield: Spot the Fakes Sports Trivia',
        seoDescription: 'One category, a board of names. Click everyone who belongs and dodge the plausible fakes planted among them. Two lives a board. Free daily sports trivia.' },
      { path: '/sports-millionaire', label: 'Sports Millionaire', emoji: '💰', description: 'Climb a 15-question money ladder with lifelines', daily: true, addedOn: '2026-07-06',
        seoTitle: 'Sports Millionaire: Money Ladder Trivia Quiz',
        seoDescription: 'Fifteen questions built from real football data, three lifelines and a pretend million at the top of the money ladder. One wrong step drops you. Free.' },
      { path: '/quiz-board', label: 'Sports Quiz Board', emoji: '🎓', description: 'Five categories, $200 to $1000. Wrong answers cost you', daily: true, addedOn: '2026-07-21',
        seoTitle: 'Sports Quiz Board: Daily Sports Trivia Game',
        seoDescription: 'Five categories, five money rows, twenty five clues. Pick a value, answer the clue, and a wrong answer costs you the full amount. Free daily sports trivia.' },
      { path: '/ball-iq', label: 'Ball Knowledge IQ', emoji: '🧠', description: 'Twelve questions, getting harder. Do you actually know ball?', daily: true, addedOn: '2026-07-21',
        seoTitle: 'Ball Knowledge IQ: Sports Trivia IQ Test',
        seoDescription: 'Twelve sports questions ramping from layups to deep cuts, with the hard ones worth the most. Get your Ball Knowledge IQ and settle it. Free daily quiz.' },
      { path: '/emoji-guess', label: 'Emoji Guess', emoji: '🤔', description: 'Five football riddles told entirely in emoji', daily: true, addedOn: '2026-07-21',
        seoTitle: 'Emoji Guess: Soccer Emoji Riddle Quiz',
        seoDescription: 'Five football riddles a day told entirely in emoji: players, clubs, managers and iconic moments. Three guesses each and a hint after a miss. Free soccer quiz.' },
      { path: '/mystery-box', label: 'Mystery Box', emoji: '📦', description: 'Open 15 packs, keep or bin, build the best XI your luck allows', daily: true, addedOn: '2026-07-21',
        seoTitle: 'Mystery Box: Soccer Pack Opening Squad Game',
        seoDescription: 'Open fifteen packs of real footballers, keep or bin each one and build the best XI your luck allows. Same packs for everyone daily. Free soccer squad game.' },
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
export const GAME_COUNT_LABEL = `${Math.floor(TOTAL_GAMES / 10) * 10}+`;
