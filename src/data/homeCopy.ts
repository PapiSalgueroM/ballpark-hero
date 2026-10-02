/**
 * Round 840: the home page's written copy, in ONE place.
 *
 * WHY. Since Round 257 index.html has carried a written page for crawlers that
 * do not run JavaScript: a descriptive h1 and a dozen sections saying what the
 * site is. React replaced all of it on mount, and Google indexes the page after
 * it renders, so the page the site is judged by (by Google, and by an ad
 * reviewer, who lands on the rendered page too) had no sentence saying what it
 * was beyond the hero line. Measured on the live site on 2026-10-01: 5,592
 * characters in the raw HTML, all of them gone after mount, and only 6 blocks of
 * 120 characters or more left, every one a tile blurb.
 *
 * So the words live here now and are drawn twice from this one copy:
 *   - the React home renders them below the game tiles
 *     (src/components/home/HomeAbout.tsx, placed by src/pages/Index.tsx), and
 *   - node scripts/genHomeCopy.mjs writes them into index.html between the
 *     home-copy markers, for crawlers that do not run JavaScript and for the
 *     404 fallback logic that reads that template.
 * scripts/simHomeCopy.mjs fails when the committed template block is not what
 * the generator would write from this file, and when a render of the home page
 * is missing any of it.
 *
 * RULES, the same ones the template block always had. Nothing here may be a
 * figure that goes stale: counts are FLOORS ("120+", "more than thirty"), and
 * simHomeCopy checks each one against the registry. Every link is a real route
 * in src/App.tsx. No dates, no results, nothing picked at random, nothing
 * computed from a clock: this is plain data.
 *
 * EDITING. Change the words here, then run node scripts/genHomeCopy.mjs and
 * commit index.html with it. Never hand edit the generated block.
 */

/** A link inside a line of copy. Always an internal route. */
export interface HomeCopyLink {
  readonly to: string;
  readonly text: string;
}

/** One piece of a line: plain words, or a link. */
export type HomeCopyPart = string | HomeCopyLink;

/** A paragraph or a list item: words and links in reading order. */
export type HomeCopyLine = readonly HomeCopyPart[];

export type HomeCopyBlock =
  | { readonly kind: 'p'; readonly parts: HomeCopyLine }
  | { readonly kind: 'list'; readonly items: readonly HomeCopyLine[] }
  /** a question in the questions section, a small heading of its own */
  | { readonly kind: 'question'; readonly text: string };

export interface HomeCopySection {
  readonly heading: string;
  readonly blocks: readonly HomeCopyBlock[];
}

export interface HomeCopy {
  /** The page's one h1, the name, exactly as a visitor sees it in both places:
      the template prints it over the copy and the app prints it in the title
      row (src/pages/Index.tsx). Nothing in either h1 is hidden, so a renderer
      reads what a person sees. What the site is, in words, sits right under it
      in the intro (and in the app's hero line). */
  readonly h1: string;
  /** the heading the app puts over the copy below the tiles; the template does
      not need it, because there the copy sits right under the h1 */
  readonly aboutHeading: string;
  readonly intro: HomeCopyLine;
  readonly sections: readonly HomeCopySection[];
  readonly closing: HomeCopyLine;
}

const a = (to: string, text: string): HomeCopyLink => ({ to, text });
const p = (...parts: HomeCopyPart[]): HomeCopyBlock => ({ kind: 'p', parts });
const list = (...items: HomeCopyLine[]): HomeCopyBlock => ({ kind: 'list', items });
const question = (text: string): HomeCopyBlock => ({ kind: 'question', text });

export const HOME_COPY: HomeCopy = {
  h1: 'DoUKnowBall',
  aboutHeading: 'About DoUKnowBall',
  intro: [
    '120+ free sports games in the browser: sports trivia, daily quizzes, grid puzzles and career sims. Every game plays without an account, nothing to download or install. New games and content ship almost every week, and the daily quizzes and puzzles reset for everyone at the same time, so you and everyone else get the same board.',
  ],
  sections: [
    {
      heading: 'Free sports career sims and soccer management games',
      blocks: [
        p('Play a whole career out season by season: contracts, transfers, injuries, international call-ups, the lot.'),
        list(
          [a('/soccer-career', 'Soccer Career'), ', the biggest one here: start at 16 and play until you hang them up'],
          [a('/club-manager', 'Club Manager'), ', run a club through a season of real fixtures'],
          [a('/nba-my-career', 'NBA My Career'), ' and ', a('/nfl-my-career', 'NFL My Career'), ', draft night to the rafters'],
          [a('/stadium-tycoon', 'Stadium Tycoon'), ', ', a('/hall-of-champions', 'Hall of Champions'), ' and ', a('/wonderkid-factory', 'Wonderkid Factory'), ', the idle ones, the last an academy where you grow made up kids and sell at the right moment'],
          [a('/build-your-xi', 'Build Your XI'), ', pick a lineup and get it rated'],
        ),
      ],
    },
    {
      heading: 'Daily sports puzzles and grid games',
      blocks: [
        p('The front page leads with one daily puzzle picked for everybody, a different one every day, and the rest of the daily boards sit in a row beside it. A few to start with:'),
        list(
          [a('/soccer-grid', 'Soccer Grid'), ', a three by three of clubs and countries'],
          [a('/college-grid', 'College Grid'), ', the same idea for college football'],
          [a('/transfer-path', 'Transfer Path'), ', get from one player to another through real moves'],
          [a('/minefield', 'Minefield'), ', name as many as you dare before you hit a wrong one'],
          [a('/silverware-sort', 'Silverware Sort'), ', stack five teams by titles won'],
          [a('/champ-or-not', 'Champ or Not'), ' and ', a('/whod-they-beat', "Who'd They Beat?")],
        ),
      ],
    },
    {
      heading: 'Sports history: every champion by year',
      blocks: [
        p(
          'The champion tables our quizzes run on are open to read in ',
          a('/records', 'The Record Books'),
          ': champions and award winners, year by year, checked against the official record before anything was allowed to serve it. Where history is odd we keep it odd, so seasons that were never played are missing on purpose and stripped titles stay vacant with a note saying why.',
        ),
      ],
    },
    {
      heading: 'Browse sports games by sport',
      blocks: [
        list(
          [a('/soccer', 'Soccer games'), ', the deepest section here by a distance'],
          [a('/pro-basketball', 'Basketball games'), ', grids, career paths and the front office'],
          [a('/pro-football', 'Football games'), ', rarity scored grids and a full GM job'],
          [a('/baseball', 'Baseball games'), ', franchise grids and a career to Cooperstown'],
          [a('/hockey', 'Hockey games'), ', franchise grids and a hard cap sim'],
          [a('/college', 'College games'), ', CFB and CBB puzzles and two dynasty sims'],
        ),
      ],
    },
    {
      heading: 'Sports trivia leaderboard and record books',
      blocks: [
        list(
          [a('/leaderboard', 'World Leaderboard'), ', total points across every game'],
          [a('/records', 'The Record Books'), ', every champion year by year'],
        ),
      ],
    },
    {
      heading: 'GM simulator games: front offices and dynasties',
      blocks: [
        p("If you would rather build the team than be on it, four front office sims put you in the general manager's chair. Build a roster, negotiate trades, draft prospects and try to meet your owner's expectations over several seasons."),
        list(
          [a('/nba-front-office', 'NBA Front Office'), ' and ', a('/nhl-front-office', 'NHL Front Office'), ', manage contracts, make trades and build a playoff team'],
          [a('/mlb-front-office', 'MLB Front Office'), ', manage payroll against the tax line, trade players and chase a title'],
          [a('/front-office', 'NFL Front Office'), ', the pro football one: real rosters, the cap, trades and the draft'],
          [a('/cfb-dynasty', 'CFB Dynasty'), ' and ', a('/cbb-dynasty', 'CBB Dynasty'), ', recruit high school and portal players, manage NIL and build a winning program'],
        ),
      ],
    },
    {
      heading: 'Sports trivia quizzes',
      blocks: [
        list(
          [a('/sports-millionaire', 'Sports Millionaire'), ', fifteen questions and three lifelines'],
          [a('/quiz-board', 'Sports Quiz Board'), ', five categories from two hundred to a thousand, and a wrong answer costs you'],
          [a('/ball-iq', 'Ball IQ'), ', a scored test of how well you actually read the game'],
          [a('/who-am-i', 'Who Am I?'), ', clues drip out one at a time and the fewer you need the better'],
          [a('/guess-the-year', 'Guess The Year'), ' and ', a('/teammates', 'Teammates')],
          [a('/rank-em', "Rank 'Em"), ', put five in the right order with no second chances'],
          [a('/player-bingo', 'Player Bingo'), ', fill a line on a five by five board before three strikes'],
        ),
      ],
    },
    {
      heading: 'Every sport we cover, from soccer to F1, tennis, golf and UFC',
      blocks: [
        p('Soccer is the deepest section by a distance, with more than thirty games of its own, and the other twelve sections below all carry their own puzzles rather than a reskin of the soccer ones. Where a sport has a hub page it is linked here; where it does not, the game itself is.'),
        list(
          [a('/soccer', 'Soccer'), ', grids, transfer chains, career and management sims'],
          [a('/pro-football', 'Pro football'), ' and ', a('/college', 'college sports'), ', rarity scored grids, a GM job and two dynasty sims'],
          [a('/pro-basketball', 'Pro basketball'), ', ', a('/baseball', 'baseball'), ' and ', a('/hockey', 'hockey'), ', franchise grids, career paths and front offices'],
          ['Formula 1: ', a('/f1-driver', 'Guess the Driver'), ', ', a('/f1-constructor', 'Constructor'), ' and ', a('/f1-higher-lower', 'Higher or Lower')],
          ['Tennis: ', a('/guess-tennis-player', 'Guess the Player'), ', ', a('/tennis-chain', 'Tennis Chain'), ' and ', a('/tennis-higher-lower', 'Higher or Lower')],
          ['Golf: ', a('/guess-the-golfer', 'Guess the Golfer'), ' and ', a('/golf-higher-lower', 'Higher or Lower')],
          ['Aussie rules: ', a('/aussie-rules-manager', 'Aussie Rules Manager'), ', a fictional club season, and ', a('/afl-higher-lower', 'AFL Higher or Lower')],
          ['NASCAR: ', a('/guess-nascar-driver', 'Guess the Driver'), ' and ', a('/nascar-chain', 'NASCAR Chain')],
          ['Combat sports: ', a('/ufc', 'UFC quiz'), ' and ', a('/ufc-chain', 'UFC Chain')],
          ['World and Olympic games: ', a('/olympics', 'Olympics'), ', ', a('/world-cup-bracket', 'World Cup Bracket'), ' and ', a('/guess-the-nation', 'Guess the Nation')],
        ),
      ],
    },
    {
      heading: 'Sports trivia games: questions people ask before they start',
      blocks: [
        question('Are these sports games free to play?'),
        p('Yes, all of them. There is nothing to unlock, no energy meter and no premium tier. Advertising can help cover hosting costs.'),
        question('Do I need an account to play?'),
        p(
          'No. Everything plays signed out, your progress is kept in your own browser, and you appear on the ',
          a('/leaderboard', 'world leaderboard'),
          ' without signing up for anything. An optional account keeps your scores on your profile. Career saves stay in this browser.',
        ),
        question('Can I play on my phone?'),
        p('Yes. It is a website, not an app, so there is nothing to install and nothing to update. Every game is built to be played with a thumb first.'),
        question('When do the daily sports puzzles reset?'),
        p('At the same moment for everyone, so the board you get is the board everybody else gets that day. The career and management sims are not daily at all: they are long saves you come back to.'),
        question('Where do the sports records and champion lists come from?'),
        p(
          'The champion tables are read out of ',
          a('/records', 'The Record Books'),
          ', checked against the official record before anything is allowed to use them. Seasons that were never played are missing on purpose and stripped titles stay vacant with a note saying why, because a quiz built on tidied up history teaches you the wrong thing.',
        ),
      ],
    },
  ],
  closing: [
    a('/whats-new', 'See what shipped recently'), ' · ',
    a('/about', 'About this site'), ' · ',
    a('/contact', 'Contact'), ' · ',
    a('/privacy', 'Privacy'), ' · ',
    a('/terms', 'Terms'),
  ],
};
