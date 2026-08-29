/**
 * Round 270: one hub per sport, and one component to draw all of them.
 *
 * WHY. The site has 113 games and, until this round, exactly one page that
 * gathered any of them by sport, /college, which Round 268 found had been
 * shipping empty. Everything else lived on the home page or nowhere. That is
 * a problem in both directions. A person who wants hockey games has to scroll
 * a page holding thirteen sports, and a search engine has no page anywhere
 * that is ABOUT hockey games on this site, so there is nothing for a "free
 * hockey games" result to be. Round 266 measured the shape that causes: a
 * page Google discovers and then declines to index, because nothing on the
 * site argues it is worth having.
 *
 * The five biggest categories get a hub here, and /college folds into the
 * same machinery. That covers 81 of the 113 games. The small categories
 * (Formula 1, Tennis, Golf, NASCAR, Combat Sports, Aussie Rules: 14 games
 * between the six of them) deliberately get NOTHING. A hub over two games is
 * a thin page, and thin pages are the problem this is meant to solve, not a
 * way to score more of them. When one of those grows past a handful of games
 * it earns an entry here and nothing else has to change.
 *
 * HOW THE COPY WORKS, AND THE RULE IT FOLLOWS. Every count a hub prints is
 * computed from the game registry at render time. Not one number in this file
 * is typed in by hand, because Round 260 shipped two hand-typed counts to the
 * home page that were wrong the day they went live, and the standing rule
 * since then is that if a page renders a number, the page derives it. The
 * prose describes what the games ARE, which does not go stale, rather than
 * how many or how popular, which does.
 *
 * scripts/simHubs.mjs reads this file, so a hub added here is checked from
 * the moment it exists: it must link every game it claims to gather, and the
 * count it prints must match the registry.
 */
import type { CategoryTitle } from '@/data/gameRegistry';

export interface HubGroupCopy {
  heading: string;
  blurb: string;
}

export interface SportHub {
  /** the path it ships at, and the key everything else looks it up by */
  route: string;
  emoji: string;
  h1: string;
  /** registry categories it gathers, in display order */
  titles: CategoryTitle[];
  seoTitle: string;
  seoDescription: string;
  /** one sentence under the derived count line */
  intro: string;
  /** the deep sims group; null for a sport that has none */
  deep: HubGroupCopy | null;
  /** everything else */
  quick: HubGroupCopy;
  /** the bottom of page block */
  aboutTitle: string;
  about: string;
  howToPlay: string[];
}

/* One line each, kept together so the tone stays consistent and so a new hub
   is obviously a copy of an existing one rather than a new invention. */
export const SPORT_HUBS: SportHub[] = [
  {
    route: '/soccer',
    emoji: '⚽',
    h1: 'Soccer Games',
    titles: ['Soccer'],
    seoTitle: 'Free Soccer Games: Football Trivia, Puzzles and Career Sims | DoUKnowBall',
    seoDescription:
      'Every free soccer game on DoUKnowBall in one place: daily football trivia and quiz puzzles, grid games, transfer market games, and full career and club management sims. Every game plays without an account.',
    intro:
      'This is the biggest section on the site, and it runs on real players, real clubs and real transfer values.',
    deep: {
      heading: '⏳ The long games',
      blurb:
        'Sims you come back to. Soccer Career takes one player from a boyhood club to retirement and then into the dugout. Club Manager hands you any of hundreds of real clubs across twenty leagues, today or in a real past season, and lets the board decide how long you last.',
    },
    quick: {
      heading: '⏱️ Five minute soccer puzzles',
      blurb:
        'Grids, guessers, transfer trivia and squad builders. Short enough for a queue, and the daily ones give everybody the same board so you can argue about it afterwards.',
    },
    aboutTitle: 'Free Soccer Games on DoUKnowBall',
    about:
      'The soccer section gathers every football game on the site into one page: 3x3 club grids, progressive-clue player guessers, connection puzzles, transfer market games built on real market values, squad builders, and the two long sims that most people come back for. Everything runs in a browser, free, with no account and no download. Real players and real clubs throughout, which is why a guess that feels right usually is.',
    howToPlay: [
      'Short on time: start with the daily puzzles. Everyone gets the same board each day and a run takes a couple of minutes.',
      'Want something that lasts: Soccer Career and Club Manager both run for as many seasons as you can survive.',
      'Every game explains itself before you play, and the "?" button reopens the rules and a worked example at any point.',
    ],
  },
  {
    route: '/pro-basketball',
    emoji: '🏀',
    h1: 'Basketball Games',
    titles: ['Pro Basketball'],
    seoTitle: 'Free Basketball Games: NBA Trivia, Grids and GM Sims | DoUKnowBall',
    seoDescription:
      'Every free pro basketball game on DoUKnowBall in one place: daily NBA trivia, franchise grids, career-path guessers, connections, and full front office and my career sims. Every game plays without an account.',
    intro:
      'Franchise grids, career guessers and two long sims, all built on real players and real franchise history.',
    deep: {
      heading: '⏳ The long games',
      blurb:
        'One puts you in the front office with the cap, the trades and a best of seven to win. The other starts on draft night and asks what you do with a career.',
    },
    quick: {
      heading: '⏱️ Five minute basketball puzzles',
      blurb:
        'Grids, chains, connections and head to head stat calls. Most reset daily, so everybody plays the same board.',
    },
    aboutTitle: 'Free Basketball Games on DoUKnowBall',
    about:
      'The basketball section gathers every pro hoops game on the site into one page: the franchise grid, progressive-clue career paths, connection puzzles, stat line detective work, lineup builders and two long sims, one from the general manager\'s chair and one from the player\'s. All free in a browser, no account, no download, and all of it on real players.',
    howToPlay: [
      'Short on time: the daily puzzles reset every day and take a couple of minutes each.',
      'Want something deeper: the front office sim runs a full season with the cap and the trade deadline, and the career sim runs from the draft to the rafters.',
      'Every game explains itself before you play, and the "?" button reopens the rules at any point.',
    ],
  },
  {
    route: '/hockey',
    emoji: '🏒',
    h1: 'Hockey Games',
    titles: ['Hockey'],
    seoTitle: 'Free Hockey Games: NHL Trivia, Grids and GM Sims | DoUKnowBall',
    seoDescription:
      'Every free hockey game on DoUKnowBall in one place: daily NHL trivia, franchise grids, career-path guessers, connections, and full front office and my career sims. Every game plays without an account.',
    intro:
      'Grids, guessers and two long sims, all on real skaters and real franchise history.',
    deep: {
      heading: '⏳ The long games',
      blurb:
        'One is a general manager sim with a hard cap, the loser point and a bracket at the end of it. The other is one player, from draft day to the rafters.',
    },
    quick: {
      heading: '⏱️ Five minute hockey puzzles',
      blurb:
        'Franchise grids, attribute clues, connections and career point comparisons. Most reset daily.',
    },
    aboutTitle: 'Free Hockey Games on DoUKnowBall',
    about:
      'The hockey section gathers every game on the site into one page: the franchise grid, attribute-clue player hunts, connection puzzles, career point head to heads, a map game where winners annex whole territories, and two long sims. All free in a browser with no account and no download.',
    howToPlay: [
      'Short on time: the daily puzzles reset every day and take a couple of minutes each.',
      'Want something deeper: the front office sim runs a full season under a hard cap, and the career sim runs one player from the draft onward.',
      'Every game explains itself before you play, and the "?" button reopens the rules at any point.',
    ],
  },
  {
    route: '/pro-football',
    emoji: '🏈',
    h1: 'Football Games',
    titles: ['Pro Football'],
    seoTitle: 'Free Football Games: NFL Trivia, Grids and GM Sims | DoUKnowBall',
    seoDescription:
      'Every free pro football game on DoUKnowBall in one place: daily NFL trivia, grids with rarity scores, career-path guessers, connections, and full front office and my career sims. Every game plays without an account.',
    intro:
      'Grid puzzles with rarity scores, career guessers and two long sims, all on real players.',
    deep: {
      heading: '⏳ The long games',
      blurb:
        'One is the general manager job: the cap, the trades, the draft and a dynasty if you are good enough. The other runs one player from draft night toward Canton.',
    },
    quick: {
      heading: '⏱️ Five minute football puzzles',
      blurb:
        'The 3x3 grid scores you on how obscure your answers are, so the safe pick is rarely the best one. Most of these reset daily.',
    },
    aboutTitle: 'Free Football Games on DoUKnowBall',
    about:
      'The football section gathers every pro game on the site into one page: the 3x3 grid with rarity scoring, progressive-clue career paths, connection puzzles, touchdown head to heads, naming the missing starter from a famous Super Bowl offense, a map game where winners annex whole territories, and two long sims. Free in a browser, no account, no download.',
    howToPlay: [
      'Short on time: the daily puzzles reset every day and take a couple of minutes each.',
      'On the grid, a correct answer nobody else picked scores better than the obvious one.',
      'Every game explains itself before you play, and the "?" button reopens the rules at any point.',
    ],
  },
  {
    route: '/baseball',
    emoji: '⚾',
    h1: 'Baseball Games',
    titles: ['Baseball'],
    seoTitle: 'Free Baseball Games: MLB Trivia, Grids and GM Sims | DoUKnowBall',
    seoDescription:
      'Every free baseball game on DoUKnowBall in one place: daily MLB trivia, franchise grids, career-path guessers, connections, and full front office and my career sims. Every game plays without an account.',
    intro:
      'Franchise grids, career guessers and two long sims, all on real players and real franchise history.',
    deep: {
      heading: '⏳ The long games',
      blurb:
        'One is the front office: the tax line, the trade deadline and October. The other is one player from draft day toward Cooperstown.',
    },
    quick: {
      heading: '⏱️ Five minute baseball puzzles',
      blurb:
        'Franchise grids, career paths, home run head to heads, connections and naming the missing bat from a famous World Series order. Most reset daily.',
    },
    aboutTitle: 'Free Baseball Games on DoUKnowBall',
    about:
      'The baseball section gathers every game on the site into one page: the franchise grid, progressive-clue career paths, home run head to heads, connection puzzles, naming the missing starter from a famous World Series batting order, a map game where winners annex whole territories, and two long sims. Free in a browser, no account, no download.',
    howToPlay: [
      'Short on time: the daily puzzles reset every day and take a couple of minutes each.',
      'Want something deeper: the front office sim runs a full season to October, and the career sim runs one player from draft day onward.',
      'Every game explains itself before you play, and the "?" button reopens the rules at any point.',
    ],
  },
  {
    route: '/college',
    emoji: '🎓',
    h1: 'College Games Hub',
    titles: ['College Sports'],
    seoTitle: 'College Sports Games: CFB and CBB Trivia and Sims | DoUKnowBall',
    seoDescription:
      'Every college sports game on DoUKnowBall in one place: free college football trivia and college basketball grids, program guessers and full dynasty sims. Every game plays without an account.',
    intro: 'College football and college basketball, from a two minute grid to a whole dynasty.',
    deep: {
      heading: '🏟️ Run a program',
      blurb:
        'The long ones. You take a real school and live with the consequences for as many seasons as you last. Recruits and transfers are generated rather than real teenagers, which is deliberate: no invented player on this site is allowed to carry a real person\'s name.',
    },
    quick: {
      heading: '⏱️ Five minute college puzzles',
      blurb:
        'Grids, program guessers and stat calls. Short enough for a queue, and the daily ones give everybody the same board so you can argue about it afterwards.',
    },
    aboutTitle: 'College Sports Games on DoUKnowBall',
    about:
      'This hub gathers every college football and college basketball game on the site into one page: 3x3 grids, progressive-clue program guessers, head to head stat calls, and two full program sims that run recruiting, the transfer portal and a postseason bracket across as many seasons as you can survive. Everything here is free to play in a browser, with no account and no download.',
    howToPlay: [
      'Short on time: start with the daily puzzles. Everyone gets the same board each day, and a run takes a couple of minutes.',
      'Want something deeper: the two dynasty games put you in charge of a real program, from recruiting through the postseason, season after season.',
      'Every game explains itself before you play, and the "?" button reopens the rules and a worked example at any point.',
    ],
  },
];

export function hubFor(route: string): SportHub | null {
  return SPORT_HUBS.find(h => h.route === route) ?? null;
}
