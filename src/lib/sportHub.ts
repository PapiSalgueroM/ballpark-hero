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
  /* ROUND 357: the cornerstone fields.
     The hubs were the thinnest indexable pages on the site and the most
     similar to one another, because the comment above this list says the copy
     is kept alike on purpose so a new hub is obviously a copy of an existing
     one. That is good for tone and it is exactly how six pages end up reading
     as one template. These four carry what only this sport can say, and
     simHubDepth measures both the depth and the difference so it cannot drift
     back. Optional so a new hub can ship before its copy is written, and the
     fence will say so. */
  /** one paragraph on what this section is and how its games differ */
  whyHere?: string;
  /** a few games with a real reason to pick each, for somebody who cannot tell similar ones apart */
  startHere?: { path: string; label: string; why: string }[];
  /** context about the sport itself, useful even if no game existed here */
  reference?: string;
  /** questions a visitor to THIS section would really ask */
  hubFaqs?: { q: string; a: string }[];

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
    whyHere:
      'The thing worth sorting these by is the clock, because a soccer game here can be one guess or a whole career. Footle, Career Quiz and Missing XI are one answer puzzles: a stat line, a career history, a famous lineup with a gap in it. Soccer Grid puts every answer where two conditions meet, so one name has to satisfy both at once. Transfer Path is the one where the season matters, since two players only link through a club they actually shared at the same time, and Connections buries four groups of four in a pile of names. Then the money games: $1B Budget Builder hands you a billion and eleven slots, Sign the Player drops you into a blind auction against two rivals, Player Stock Market buys you in at real past valuations and then runs a real year at you, and Fantasy Draft, Gauntlet Draft and Dart Draft each build you a squad one pick at a time, with a different catch on how the pick gets made. Soccer Career and Club Manager are not puzzles at all, they are evenings, while Stadium Tycoon and Wonderkid Factory tick along on their own whether you are watching or not.',
    startHere: [
      { path: '/career-ladder', label: 'Career Ladder', why: 'The gentlest way into the guess the player games. You get his clubs one at a time in order, so you can reason your way there instead of staring at a stat line. Pick Who Am I? instead if you would rather be told how warm you are, and Footle if numbers are how your brain works.' },
      { path: '/club-manager', label: 'Club Manager', why: 'The full management job: a real club in a real league, today or in a real past season. Rebuild Challenge scratches the same itch in a fraction of the time, an inherited squad you pull apart and put back together on a budget, where the deals do not always go your way. Soccer Career is the other side of the touchline, where you are the player rather than the boss.' },
      { path: '/budget-builder', label: '$1B Budget Builder', why: 'A billion, eleven slots, real market values, no opponent. Choose this over Squad Deal if you want the maths rather than the luck of mystery boxes, and over Fantasy Draft if you would rather not have an AI taking your first choice off the board.' },
      { path: '/soccer-grid', label: 'Soccer Grid', why: 'The 3x3 board: nine cells, each one sitting where two conditions meet, so one name has to satisfy both. Every correct answer also comes back with a rarity score, the share of players who named the same man, so getting a cell right and getting under 5 percent of the room are two separate small wins. It rewards knowing the awkward overlaps rather than the obvious names, so it is the right pick once the single answer puzzles start feeling too easy.' },
    ],
    reference:
      'Almost everything in this section runs on the transfer market, so it is worth knowing how that actually works. European clubs register new signings during two windows, a long one across the summer and a short one in January, and the main exception is a player already out of contract, who can generally be signed and registered outside them. That exception traces back to the Bosman ruling in 1995, which established freedom of movement for out-of-contract players inside the EU, and the principle that an expired contract means a move without a fee was carried into the transfer regulations that followed. It is why a club would rather sell someone with a year left than lose him for nothing. The fee is also only half the cost: it goes to the selling club as a one-time cost rather than a recurring one, often spread across instalments over several years, while wages are paid every week for the length of the deal and often add up to more. And the published numbers are estimates. Fees frequently go undisclosed and add-ons sit inside the headline figure. Neymar\'s 222 million euro move from Barcelona to Paris Saint-Germain in 2017 is the one everybody quotes, and as of August 2026 nobody had gone past it.',
    hubFaqs: [
      { q: 'Do I need to follow more than the Premier League?', a: 'No, but the further you look the more of this opens up. The guessing games lean on players who moved around the big European leagues, so if the Premier League is your limit you will still recognise most of them. Club Manager is the one that rewards breadth, since it reaches a long way past the big five and you can sit in whichever league you actually watch. If a puzzle throws up a name you have never heard of, there is another one along in a second.' },
      { q: 'How up to date are the players and the values?', a: 'Squads and valuations come from real data that gets refreshed in batches rather than live, so in the days after a big move a player can still be sitting at his old club. The historical games are out of date on purpose: Club Manager lets you start in a real past season, and Player Stock Market buys you in at that year\'s real prices, which is the whole point of it.' },
      { q: 'I have five minutes. Which one?', a: 'Alphabet Sprint, one player per letter against the clock, is the fastest thing in here. Footle is a single player from a stat line. Rarity Round is the strange one: you still have to name a real, valid answer, it will not let you submit a name that does not fit the category, but you are scored on how famous that pick is inside the category\'s pool and famous is bad, so the obvious name is the one that hurts you. There is a Crowd Says mode that flips the whole thing and rewards the most famous answer you can find.' },
      { q: 'Which of these is worth a whole evening?', a: 'Soccer Career if you want to be the player, from a boyhood club through the money and the bad decisions to retirement. Club Manager if you want the dugout instead, with negotiations, board objectives and the sack race hanging over you. Stadium Tycoon and Wonderkid Factory are the idle ones, they keep ticking while you are doing something else, so they suit a second tab better than an hour of full attention.' },
    ],
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
    whyHere:
      'Four things go on in here. Some games hand you numbers and want the name back: /stat-detective scrubs the name off a real per 36 season, /nba-career sells you clues at 150 points a go, and /missing-five blanks one starter out of a genuine Finals box score. Some are boards you earn a square at a time, like the nine cells of /nba-grid or the twenty names of /nba-connections. Some make you build a lineup under awkward rules, which is /nba-starting-5 pinning a random franchise on every slot and /perfect-season-nba spinning a wheel for the team and season you draft from, six deep, a starting five plus a sixth man who can be anyone. And some run for years: /nba-front-office gives you a cap sheet and 29 rivals, while /nba-my-career takes an invented rookie from draft night to the rafters.',
    startHere: [
      { path: '/nba-career', label: 'NBA Career Path', why: 'The softest landing in the section. Clues come out one at a time and you choose when to stop collecting and commit, so it plays as a nerve game as much as a knowledge one: guess early and keep your score, or trade some of it away for another piece. It suits anyone who can hear a position, a draft slot and a couple of NBA stops and start crossing names off a list. /stat-detective runs the same idea with the money taken out: it opens colder, and its clues cost you nothing.' },
      { path: '/stat-detective', label: 'Stat Detective', why: 'For people who actually read box scores. You open with a decade, a position and a per 36 line, and you get eight guesses to put a name to the season. Extra clues turn up as the misses pile up and none of them cost you a thing, so the only pressure on you is the guess count. It suits the kind of reader who sees a shape in a stat line rather than a row of numbers.' },
      { path: '/nba-grid', label: 'NBA Franchise Grid', why: 'The two minute daily. Nine cells, nine guesses, so a single miss ends any perfect board. The rows and columns mix franchises a career touched with milestones like 10,000 points or 5,000 rebounds, so it is not only who played where, it is who piled up the counting stats. Take /nba-connections instead if you would rather sort twenty names into hidden groups than dig up one player per square.' },
      { path: '/nba-front-office', label: 'NBA Front Office', why: 'The one that eats an evening. Fifteen roster spots, a cap sheet that punishes you, trades the AI weighs on age and rating, and a season that dumps you in the play-in if you finish 7th to 10th, then asks for four best-of-seven rounds. Go to /nba-my-career instead if you would rather live one player\'s whole career than run the whole building.' },
    ],
    reference:
      'Basketball\'s record book has hard start dates, and a lot of the sport\'s arguments trace back to them. The NBA adopted the 24 second shot clock for the 1954-55 season, which is the line between the modern game and the stalling contests before it. Steals, blocks and the split between offensive and defensive rebounds only became official statistics in 1973-74, and individual turnovers waited until 1977-78, which is why Bill Russell and Wilt Chamberlain carry no official career block totals despite both being remembered as dominant shot blockers. The three point line came in for 1979-80, originally as a one year trial. And the 82 game season only started in 1967-68, the year expansion took the league to twelve teams. So compare eras all you like, but for some whole careers the numbers people want were simply never written down.',
    hubFaqs: [
      { q: 'Why do so many of these games use per 36 minute numbers instead of per game averages?', a: 'Because the historical season records store totals and minutes rather than game counts, so a per 36 rate is exact where a per game average would be an estimate. It also puts eras on one scale, since the 1960s were played at a much higher pace and per game numbers from then flatter everybody. /stat-detective and /nba-stat-line both work in per 36 for that reason.' },
      { q: 'Why will some games not let me pick seasons from the 1960s?', a: 'Because the stat being asked for did not exist yet. Steals and blocks were not official until 1973-74 and the three point line arrived in 1979-80, so when a target in /nba-stat-line includes one of those, older seasons have no honest number to contribute and sit out. Targets without them open the pool back to 1951-52.' },
      { q: 'How much of this is real data and how much is invented?', a: 'The players, the seasons and the careers are real. Missing Five checks every lineup against the box score of that exact game, and NBA Grid and NBA Connections verify answers against career records. The long sims are where invention starts: your player in NBA My Career is fictional by design, and NBA Front Office wraps invented contract and salary numbers around real players, alongside generated ones filling out the market.' },
      { q: 'Which of these have a daily puzzle?', a: 'Plenty of them. /nba-grid, /nba-connections, /missing-five, /nba-higher-lower and /nba-stat-line serve everyone the same board once a day, and /perfect-season-nba, /perfect-lineup-nba, /nba-career and /conquest-nba have daily modes too. They all roll over at midnight Eastern. The rest, /nba-connect-4 and /nba-chain included, you can just keep playing.' },
    ],
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
    whyHere:
      'Eleven games, and they mostly split by how much of your evening they want. The quick ones are guessing games with different tempers: Puck Detective hides a player off a current roster and answers each of your eight guesses with five chips, Career Path gives you a position and then charges points for every clue you buy, Higher / Lower asks only who finished with more career points. NHL Franchise Grid and NHL Connections test breadth instead, nine cells against twenty names. The long ones simulate: NHL Front Office is a real 2026-27 roster under a hard cap, NHL My Career follows one fictional player for up to twenty two seasons, NHL Conquest turns a season of results into a land grab. 82-0 Perfect Season and Perfect Lineup: NHL draft then simulate, and NHL Connect 4 needs a second person.',
    startHere: [
      { path: '/puck-detective', label: 'Puck Detective', why: 'Pick this if you watch the league right now. The answer is always somebody on a current roster, and every guess comes back with five chips (team, position, nationality, age, jersey number), so you narrow instead of fishing. Career Path is the same idea for people whose hockey is older than this season.' },
      { path: '/hockey-career', label: 'Career Path', why: 'The all-time version of the same puzzle. You open with nothing but a position and buy clues one at a time (country, draft, teams, stats, awards), each one shaving your score, so it rewards recognising a draft slot rather than knowing depth charts. Wrong guesses are free here, which Puck Detective\'s eight guess limit is not.' },
      { path: '/perfect-lineup-nhl', label: 'Perfect Lineup: NHL', why: 'Five minutes, and no season to sit through. Three of your six slots arrive locked to a franchise or a decade, you fill them from the all-time pool, and one simulated game hands back a letter grade. 82-0 Perfect Season is the longer cousin: a wheel decides your options for you and the sim plays all 82 games.' },
      { path: '/nhl-front-office', label: 'NHL Front Office', why: 'The one that eats an evening. Real 2026-27 rosters, a hard cap every move has to fit under, the loser point in the standings, a divisional bracket, and an owner who fires you for missing the mandate. Choose it over NHL My Career if you would rather build the roster than be a player on it.' },
    ],
    reference:
      'Two things about the NHL trip up people arriving from other sports. First, not every game hands out the same number of points. A win is worth two whether it comes in regulation, overtime or a shootout, and the team that loses in overtime or a shootout still keeps one, so a game settled inside sixty minutes is worth two points in total and one that goes past it is worth three. That is why the table is read in points rather than in wins and losses, and why losing late still feels like collecting something. Second, the playoffs drop the shootout entirely. Postseason overtime is 5-on-5 sudden death in full twenty minute periods, repeated until somebody scores, and sixteen teams play four best-of-seven rounds, sixteen wins in all, for the Stanley Cup, which is not remade each year for the new champion the way other North American trophies are but handed on with the winners\' names engraved on its bands.',
    hubFaqs: [
      { q: 'Which of these use this season\'s players and which go all the way back?', a: 'Puck Detective picks from current NHL rosters, and NHL Front Office starts you on the real 2026-27 rosters. Career Path, NHL Franchise Grid, Higher / Lower and Perfect Lineup: NHL pull from an all-era career database instead, so a 1970s winger turns up as readily as anyone playing tonight.' },
      { q: 'Are goalies actually in these, or is it skaters only?', a: 'Goalies are in. 82-0 Perfect Season gives them their own slot and weights it heaviest of the six, Perfect Lineup: NHL has a G slot, and NHL My Career lets you play one, with wins and save percentage instead of points, usually opening as the backup, though come in rated two clear of the incumbent and the crease is yours out of camp. In Puck Detective goalies sit in the standard pool and turn up in the daily puzzle like anybody else; the Easy, Normal and Hard tiers only change practice play, where Easy leaves goalies out and Hard is thick with them. NHL Connect 4 has a goalies board, but goalies are missing from the name suggestions, so type the full name and press Enter.' },
      { q: 'Do relocated franchises count as the same club?', a: 'In NHL Connect 4 yes, and the rules say so outright: Nordiques answers count for the Avalanche, Whalers for the Hurricanes, Thrashers for the Jets. NHL My Career goes the other way with its 2006-07 throwback, a sealed thirty team league where the Thrashers are still in Atlanta and the Coyotes are still in Phoenix, and where you never meet a club that did not exist yet.' },
      { q: 'What is the difference between 82-0 Perfect Season and Perfect Lineup: NHL?', a: 'Who sets your limits, and how long the sim runs. Perfect Season spins a wheel that lands on a franchise and a decade, you take one player from whatever it gives you, and then it plays all 82 games hunting a perfect record. Perfect Lineup locks three of your six slots to a team or an era up front, lets you choose freely from the all-time pool, weights the result 80 percent talent and 20 percent chemistry, and grades a single game.' },
    ],
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
    whyHere:
      'Three of these run long. NFL Front Office is the desk job: every club in the league, a hard cap, trade partners who hang up on you, an owner who fires you when the mandate slips. NFL My Career runs the same league from the locker room, eight positions, and an envelope that gets passed down the row in a meeting: put your money in and the heat starts climbing toward league security and a file with your name on it. 17-0 Perfect Season drafts one cross era offense off a wheel of real team seasons and simulates whether it runs the table. The other seven are short: NFL Grid, NFL Connections, NFL Connect 4, NFL Career Path and NFL Higher or Lower are recall in five different shapes, Missing Eleven needs ninety seconds to make you doubt a game you watched live, and NFL Conquest plays a season as a land grab.',
    startHere: [
      { path: '/front-office', label: 'NFL Front Office', why: 'The GM chair, and the open ended one: it runs for as many seasons as ownership lets you keep the job. Real rosters against a hard cap, trades where the other side counters or hangs up, draft grades that lie to you. NFL My Career is the same league from a player\'s seat, and 17-0 Perfect Season is one team drafted for one run.' },
      { path: '/nfl-my-career', label: 'NFL My Career', why: 'Pick this if the roster spreadsheet is the boring part. You create a prospect, a real team drafts you, and each season hands you one decision: the surgery or the season, the money or the contender, your cash in the envelope or telling the coach it stops today. Front Office asks how you build a team. This asks what you do at 28 when the knee starts talking.' },
      { path: '/football-grid', label: 'NFL Grid', why: 'The five minute daily. Every cell has to satisfy its row and its column at the same time, so Packers crossed with Super Bowl winner needs a man who did both, and the rarity score means a forgotten journeyman beats an obvious Hall of Famer. NFL Connections points the same knowledge at grouping, NFL Connect 4 turns it into a two player board.' },
      { path: '/missing-eleven', label: 'Missing Eleven', why: 'The quickest one and the meanest. A genuine Super Bowl starting lineup with one name blanked, three guesses, and the famous player you are about to type was very often watching the kickoff from the sideline. NFL Career Path feeds you clues about a hidden player. This gives you the rest of that lineup and makes you work backwards.' },
    ],
    reference:
      'Pro football\'s structure points at parity. Thirty two teams sit in two conferences, the AFC and the NFC, split into four divisions of four, and every club works under the same hard salary cap. The regular season grew from 16 games to 17 in 2021 and is still the shortest of the major American leagues, which is why one loss matters here in a way it cannot across 82 or 162. The postseason is the only one of those leagues that is single elimination the whole way through: 14 teams since the 2020 season, seven per conference, and only the top seed in each gets the opening weekend off. Which is why 1972 still carries the weight it does. Don Shula\'s Dolphins went unbeaten and won Super Bowl VII, and running the table is the thing pro football measures itself against every autumn a team starts hot.',
    hubFaqs: [
      { q: 'Which one is the proper franchise mode?', a: 'NFL Front Office. You take one club and run it for as many seasons as ownership lets you: cap sheet, cuts, free agency, trade calls that get countered or hung up on, and a 40 prospect draft class where the scouting grade can be off by four points either way. It saves in your browser after every move, and yes, you can get fired. If you want the same league from a player\'s seat, that is NFL My Career.' },
      { q: 'Is there a daily puzzle here, or is it all endless?', a: 'Both. Six of the ten deal one shared puzzle a day that resets at midnight Eastern: NFL Grid, NFL Career Path, NFL Connections, NFL Higher or Lower, Missing Eleven and NFL Conquest. Everybody gets the same blanked Super Bowl lineup and the same starting map that day, which is the point of it. Some of those also carry a second mode for when one puzzle is not enough, and where it exists the button sits right on the board, so there is nothing to go hunting for. The rest run as long as you keep playing.' },
      { q: 'I have only really watched since about 2010. Am I going to be lost?', a: 'Not on most of them. NFL Higher or Lower only uses careers that started in 2000 or later, NFL Front Office is the modern league rather than a history test, and the 17-0 Perfect Season wheel starts at 1999. Some of the others reach a long way further back, and those are the ones where you actually pick something up.' },
      { q: 'Why are there no team logos, helmets or player photos?', a: 'Because all of that is licensed and this is an independent fan project with no connection to the league. The real players, their stats and the Super Bowl starting lineups are real and checked. What is invented is invented on purpose: Front Office\'s draft prospects are generated and run against a wall of real names so they stay made up, and the player at the centre of My Career never existed either. The badges are simply not here, and nothing on the page pretends otherwise.' },
    ],
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
    whyHere:
      'Three shapes and an outlier. Straight recall: MLB Higher or Lower is one question on a loop (which legend hit more career home runs), Career Path walks a mystery player\'s card down a clue ladder until you can name him, and Missing Nine hands you a famous World Series order with a hole in it and lets the gap do the work. Puzzles that make you hold two facts at once: MLB Franchise Grid wants a name that answers both of a square\'s headings at the same time, Connections wants the thread running through a set of names, MLB Connect 4 buries trivia under the discs. Then the sims, where one sitting is a season or a life: MLB Front Office runs a club down to the tax line, MLB My Career runs one player you create, and 162-0 Perfect Season drafts across eras. The outlier is MLB Conquest, a daily of its own shape: you pick a club, call its game each round, and the simulated results across all 30 redraw a 58-territory map where the winner annexes the loser\'s whole empire. Toronto and San Diego start with no land at all.',
    startHere: [
      { path: '/baseball-career', label: 'Career Path', why: 'Start here if you want the guessing kind. It reads you the back of a baseball card a line at a time, the clubs he passed through, the numbers he put up, the trophies on the shelf, until one of them tips it and the name lands. A wrong guess does not move the ladder and does not dock you, so an early stab costs you nothing and the rest of the card is still ahead of you. Missing Nine, the other guessing game, expects you to already know a specific famous team.' },
      { path: '/missing-nine', label: 'Missing Nine', why: 'For the fan who remembers teams rather than individual careers. You get a real World Series batting order with one starter blanked out, so the names around the hole are your clue and knowing the roster does the heavy lifting.' },
      { path: '/mlb-grid', label: 'MLB Franchise Grid', why: 'Take this over Connections if you like the crossword shape. Every square sits where a row heading meets a column heading and only a name that answers both will do, which quietly makes the odd corner of a career worth more than the biggest name you know. Connections is the opposite job: you are handed the names and have to work out what already links them.' },
      { path: '/mlb-front-office', label: 'MLB Front Office', why: 'The long one to pick if you would rather run the club than be the player: real 2026 rosters, payroll against the tax line, deadline trades, October, then doing it again next year. MLB My Career is its mirror image, one player you create from draft day, and 162-0 Perfect Season is neither, a draft across eras chasing an unbeaten season no real team has ever had.' },
    ],
    reference:
      'Baseball still has no game clock. A pitch clock arrived in 2023 and pulled that season\'s average nine inning game down to roughly two hours 40 minutes, but nothing counts down to zero, so a team in front has no clock to run out. The infield is fixed by rule, 90 feet between bases and the pitching rubber 60 feet 6 inches from home, a distance the National League set in 1893 and nobody has moved since. Past the infield the rule book only sets a floor: any field built after June 1, 1958 has to reach at least 325 feet down each foul line and 400 feet to center, with older parks exempt and waivers handed out since. No exact shape is prescribed, which is why the left field wall at Fenway Park, the Green Monster, stands about 37 feet tall barely 310 feet down the line. The season runs 162 games, the length the American League adopted in 1961 and the National League in 1962.',
    hubFaqs: [
      { q: 'Which of these reset every day?', a: 'Six of the ten. Career Path, MLB Higher or Lower, MLB Franchise Grid, MLB Conquest, Missing Nine and Connections all serve a new puzzle each day. 162-0 Perfect Season, MLB Connect 4, MLB My Career and MLB Front Office are not on a clock, so you start those whenever you want.' },
      { q: 'Do I need to know old baseball for these?', a: 'For some of them, yes. MLB Higher or Lower and MLB Franchise Grid pull from the whole history of the sport, so the answer is often somebody who retired before you were born. Missing Nine is narrower and a lot more recent: its lineups come from World Series games between 1986 and 2016, and a few of the names in the 2016 ones are still active. If you only follow the current game, start with MLB Front Office, which runs on real 2026 rosters, or MLB My Career, where the player is one you invent.' },
      { q: 'What is the actual difference between MLB Front Office and MLB My Career?', a: 'Scope. Front Office is the whole club: payroll against the tax line, trades, a playoff run, then building the next one. My Career is one person. You name him, give him one of 11 positions from starting pitcher to designated hitter, and steer him through the crossroads from the draft toward Cooperstown.' },
      { q: 'Are the players real?', a: 'In the guessing games, yes. Real players, real career stops, nothing made up to fill a gap, and no words put in anybody\'s mouth. In MLB My Career the player is yours, created at the start, so that story belongs to you rather than to somebody who actually lived it.' },
    ],
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
    whyHere:
      'Four of these take a couple of minutes and two of them will eat an evening. /college-grid wants a football player who fits a row and a column at once, Alabama plus Heisman winner, that sort of thing, so the deep bench beats the obvious name. /guess-the-college and /guess-cbb-team both drip clues out one at a time and your score drops as they arrive, but they are not asking the same thing: the college one is about the school itself, the feel of a place and its history across everything it does, while the basketball one never leaves the court. /cfb-higher-lower is the quick one, two quarterbacks and a single number. The sims sit at the far end: /cfb-dynasty runs a football program through NIL, the portal and the 12 team Playoff, while /cbb-dynasty does a basketball one through one and dones and a March bracket.',
    startHere: [
      { path: '/cfb-higher-lower', label: 'CFB Higher or Lower', why: 'Start here if you follow college football loosely rather than closely. It is two quarterbacks and one question, which one threw for more career college yards, and the answers are counterintuitive often enough that guessing on reputation gets you burned. Quickest thing in the section.' },
      { path: '/guess-the-college', label: 'Guess The College', why: 'Clues arrive one at a time and you can guess whenever you like, so the score rewards nerve. It is about the school itself rather than any one team, which makes it the one to pick if you know campuses better than you know any single sport. Guess early and it is worth more, wait and you are trading points for certainty.' },
      { path: '/guess-cbb-team', label: 'Guess The CBB Program', why: 'Same clue by clue shape as Guess The College, but it never leaves college basketball, so everything you are handed points at a program rather than at a campus. Pick this one over its sibling if your knowledge is specifically hoops.' },
      { path: '/cfb-dynasty', label: 'CFB Dynasty', why: 'The long one. You run a football program through recruiting, NIL money, the transfer portal and the 12 team Playoff, across seasons. Its twin /cbb-dynasty is the same idea on a basketball calendar with one and dones and a March bracket, so pick by which sport you actually sit down and watch.' },
    ],
    reference:
      'Almost everything that makes college sports confusing right now arrived in the last few years. The NCAA transfer portal opened on October 15, 2018, and the NCAA\'s interim name, image and likeness policy took effect on July 1, 2021. A judge gave final approval to the House v. NCAA settlement on June 6, 2025, and schools could begin paying athletes directly from July 1, 2025. The map moved too: in 2024 the Pac-12 lost ten members to the Big Ten, Big 12 and ACC, leaving Oregon State and Washington State, and the league then rebuilt around them, relaunching on July 1, 2026 with nine full members including Boise State, San Diego State and Gonzaga. Football\'s playoff went from four teams to twelve for the 2024 season, with first round games hosted by the higher seed rather than at a neutral bowl site. Basketball\'s bracket held at 68 teams from 2011 through 2026, and then the NCAA approved a jump to 76 for the 2027 tournament, with a 12 game Opening Round cutting the field back to the usual 64. If a program you remember looks nothing like the one playing now, that is most of the reason why.',
    hubFaqs: [
      { q: 'Guess The College and Guess The CBB Program look like the same game. Which one do I want?', a: 'They share the format, clues released one at a time until you guess, but not the subject. Guess The College is about the school itself, the character of a place and its history across everything it does rather than one sport. Guess The CBB Program stays inside college basketball from the first clue to the last. Know campuses, start with the first. Know hoops, start with the second.' },
      { q: 'Do I need to know who is actually on rosters this season?', a: 'No. College Grid and CFB Higher or Lower run on career and program history, not this week\'s depth chart, and the guess games are about schools rather than current players. Given how fast rosters turn over now, a game built on current names would be stale in a month anyway.' },
      { q: 'How long do CFB Dynasty and CBB Dynasty take, and do they save?', a: 'They are the long ones. A single season of recruiting, portal moves and postseason is a proper sit down, and a dynasty is many seasons. Both save your progress in your browser, so you can close the tab mid rebuild and come back to it. The other four games in this section are daily and take a few minutes.' },
      { q: 'Do I need an account for any of this?', a: 'No. Every game on this page plays signed out and free, including both dynasty sims. An account only exists if you want streaks and leaderboard placings to follow you around, and nothing is locked behind it.' },
    ],
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
