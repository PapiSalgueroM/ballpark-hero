import type { GameContentMap } from './types';

// Pro football game guides. Casual human tone, no em dashes anywhere.
export const FOOTBALL_CONTENT: GameContentMap = {
  '/perfect-season-nfl': {
    intro: [
      "Spin a wheel of real pro football team seasons from 1999 to 2024, draft one player wherever it lands, and build a cross-era offense the sim then runs through a 17 game season.",
      "The fun is the mash-up: a 2007 Randy Moss catching passes from a 2013 Peyton Manning, rated on what each actually did that exact year.",
    ],
    howToPlay: [
      "Pick a mode. Classic shows ratings, Hard hides them until the sim ends, Daily gives everyone the same wheel once a day.",
      "Spin. The wheel stops on a real team season and lists that squad's draftable players.",
      "Draft one player into an open slot. You fill 8: QB, RB, two receivers, tight end, flex, defense unit, head coach.",
      "Repeat until the roster is full. No name repeats, and you get 2 rerolls per run for dud squads.",
      "Watch the 17 game sim reveal, then share the result or run it back.",
    ],
    rules: [
      "The wheel spans 1999 through 2024. Decade Mode can pin Classic and Hard runs to the 2000s, 2010s, or 2020s.",
      "Ratings run 40 to 99, built from real per game stats with an era adjustment.",
      "Win 12 or more games to enter the playoffs: Wild Card, Divisional Round, Conference Championship, Super Bowl.",
      "Daily is one attempt that locks when the result lands. A fresh themed wheel arrives at midnight Eastern.",
    ],
    example: [
      "Your first spin lands on the 2007 Patriots, so you grab Randy Moss. Later the 2013 Broncos deliver Peyton Manning, and a reroll digs up an elite defense for the last slot.",
      "The finished 92 overall squad starts 9 and 0, drops one game by a field goal, and lands at 15-2. Division winner, playoff run, no banner. You spin again.",
    ],
    tips: [
      "Spend big on quarterback. That slot is weighted heaviest in your team overall.",
      "Do not punt on defense and coach. A bad sideline drags every Sunday down.",
      "Even a stacked draft goes 17-0 only about one time in ten, so treat 15 wins as a good day.",
    ],
    faqs: [
      {
        q: "What seasons can the wheel land on?",
        a: "Real team seasons from 1999 through 2024, with era-correct names like the San Diego Chargers.",
      },
      {
        q: "What happens after the regular season?",
        a: "Reach 12 wins and the sim plays four playoff rounds. Win them all for a banner and a Super Bowl MVP named from your roster.",
      },
      {
        q: "How is Hard mode different?",
        a: "Ratings show as question marks until the sim ends, so you draft on reputation alone.",
      },
    ],
  },

  '/front-office': {
    intro: [
      "Somebody has to make the hard calls, and here that somebody is you. Take over any of the 32 clubs and run it all: the cap, free agency, trades, the draft.",
      "The league moves around you: rivals sign players, stars get hurt in December, dynasties get built one contract at a time.",
    ],
    howToPlay: [
      "Pick a franchise. Its players carry fictional contracts against a 260 million dollar cap that rises 5 percent each season.",
      "Read the ownership mandate. A loaded roster is told to win the Super Bowl, a mid one to make the playoffs, a bare one to hit an honest win number. It resets every offseason from where your roster really stands.",
      "Shape the roster: cut bloated deals, sign free agents, and offer one for one trades, sweetened with a pick.",
      "Play week by week as scores, injuries, and rival moves roll in, with a live read on whether you are on pace for the mandate.",
      "After the Super Bowl, spend 3 picks on a 40 prospect class where scout grades can lie. Defensive picks boost your defense unit rather than adding a player.",
      "Run the offseason, where young players grow and veterans fade, then chase the next title. Seasons are unlimited, as long as ownership keeps you.",
    ],
    rules: [
      "The season runs 17 weeks: home and away against your division rivals plus 11 crossover games.",
      "Playoffs use the real 14 team format: 7 seeds per conference, byes for the 1 seeds, four knockout rounds.",
      "Trades are judged on rating, age, and position, with quarterbacks at a premium. The AI only accepts a clear win.",
      "Grades can miss by up to 4 points either way, injuries cost players 1 to 4 weeks, and rosters cannot drop below six players.",
      "Trust upstairs runs 0 to 100. Beating the mandate raises it, missing it drops it, a championship fixes almost anything, and at zero you are fired and the save ends. A fresh GM always survives one bad year, never three.",
    ],
    example: [
      "You inherit a 6-11 roster with no cap room, cut an aging receiver, and sign the best lineman available. When your quarterback goes down, you flip a backup and a pick for a veteran starter.",
      "You sneak in as a 7 seed, lose the Wild Card game, then watch a 90 grade tackle turn out an 84 while the round 3 receiver you almost skipped blooms into an 86. Two years on, you are the 1 seed.",
    ],
    tips: [
      "Build around the quarterback. Team strength leans on that slot more than anything else.",
      "Young players with hidden upside beat expensive 31 year olds, because decline starts there and never stops.",
      "If a trade gets rejected, do not sweeten it out of pride. Target a team that needs what you are selling.",
    ],
    faqs: [
      {
        q: "Are the players real?",
        a: "Yes, real 2025 rosters rated from real 2023 and 2024 production. Contracts, trades, and draft prospects are all fictional.",
      },
      {
        q: "Can I get fired?",
        a: "Yes. Ownership sets a mandate from your roster's honest strength, grades it every season, and tracks trust from 0 to 100. Miss badly enough for long enough and the seat goes, the save ends, and you take another front office.",
      },
      {
        q: "Does my franchise save?",
        a: "Automatically, in your browser, after every move. The abandon button wipes it for a fresh start.",
      },
    ],
  },

  '/nfl-my-career': {
    intro: [
      "Every draft night some kid hugs his mom and walks into an unwritten life. Here you get that life: create a fictional prospect, get drafted by a real team, and play a whole career one big decision at a time.",
      "Seasons produce realistic stat lines from your rating, health, and team. Between them comes one crossroads drawn from over a hundred of them: contracts, trade requests, surgeries, rookie hazing, a mural in your name, and a podcast invite the front office will hate.",
      "You build your player's actual face before the draft, and there is a dirty side waiting whenever you want it. Selling the injury report to an offshore book, a bounty pool in the meeting room, a clinic in Arizona running a program the league cannot test for yet. Every dirty choice raises a hidden league security meter, and at the top of it sits an indefinite suspension and a comeback from the minimum.",
    ],
    howToPlay: [
      "Create your player: name, one of 8 positions (QB, RB, WR, TE, LB, CB, EDGE, K), and an archetype like Cannon Arm, Island Corner, Speed Bender or Ice in December that sets ceiling and durability.",
      "Pick your league: today's NFL, or the 2005 throwback with the Raiders in Oakland, the Chargers in San Diego and the Rams in St. Louis.",
      "Build your look: skin tone, hair, beard, accessories and a signature celebration, or hit Surprise me.",
      "Enter the draft. Your hidden rating decides the slot, and a real team calls your name.",
      "Play each season with one tap: yards, touchdowns, awards, how far the team went.",
      "When the deal expires, work a real free agency window: competing offers from named teams with their own money, length and roster quality, and one push for more on any of them.",
      "Make the offseason call: train skills or body, fix the knee or play through it, take the envelope or report it.",
      "Spend the money in 7 aisles: home, rides, investments, body, flex, family, and a shady aisle that only appears once you have something to hide.",
      "Retire, or get forced out, and face the legacy verdict.",
    ],
    rules: [
      "You start at 22 on a 4 year rookie deal. Growth is slow and honest, 1 to 2 rating points a year through age 26 with a late bloomer chance after that, and the last few points above 88 are the hardest in the game.",
      "Every position has its own stat line, its own awards and its own aging curve. Running backs fall off at 28, corners at 30, quarterbacks at 34, kickers at 39. Defenders chase Defensive Player of the Year instead of MVP, and kickers chase neither.",
      "The league security meter runs 0 to 100 and cools 9 a year while you stay clean. Unexplained money keeps it warm. At 65 they open a file on you, at 90 you are suspended indefinitely, you lose the season, the money is seized, and you come back on a minimum deal if anyone calls.",
      "Decline starts at 31, or 28 for running backs, and it hits them harder.",
      "Injuries can erase 2 to 10 games a season and leave permanent wear on your health bar.",
      "Retirement is forced at rating 64, age 40, 34 for backs, or 19 seasons. You can walk away after 6, and progress saves automatically.",
      "The 2005 throwback is a sealed world: all 32 franchises exactly as they stood that season, verified against the real records, and every draft, trade and signing stays inside it. Contracts pay 2005 money, about a third of today's.",
    ],
    example: [
      "You make a Dual Threat quarterback and go 12th overall to a shaky roster. The leap comes at 25: 4,000 plus yards, an All-Pro nod, a run that dies in the Championship game. At contract time you take the discount.",
      "At 28 the knee starts talking. You play through it, lose four games, and demand a trade. The ring comes at 31, you retire at 35 with one MVP, and the verdict reads Hall of Famer.",
    ],
    tips: [
      "Running back careers are a sprint. Cash in early, because the cliff at 28 is real.",
      "Body work is boring and correct. Health protects games played, and games played protect everything else.",
      "MVPs move the legacy score most, rings close behind. Stat padding on bad teams only goes so far.",
      "In free agency the contender offers less and the rebuild offers more. The roster number on the card is the exact quality your next seasons run on, so you are choosing between money and January.",
    ],
    faqs: [
      {
        q: "Which positions can I play?",
        a: "Eight of them: QB, RB, WR, TE, LB, CB, EDGE and K, each with its own archetypes, stat line, awards and aging curve.",
      },
      {
        q: "Can I start in a different era?",
        a: "Yes. The create screen has a 2005 throwback: the league exactly as it stood that season, with the Raiders in Oakland, the Chargers in San Diego and the Rams in St. Louis. An era career never meets a franchise that did not exist yet, and the money is 2005 sized.",
      },
      {
        q: "How does free agency work?",
        a: "When your deal is up you get a window of real offers: your team's re-sign number plus named suitors, each with its own salary, length and roster quality. Contenders lowball because they can, rebuilds overpay because they must. You can push any offer for more once, but push a weak case and it can be pulled. Your own team never walks away, so you always have somewhere to sign.",
      },
      {
        q: "What decides the legacy verdict?",
        a: "Rings, MVPs, All-Pro nods, seasons played, and stat totals, on a scale from cup of coffee to inner circle immortal.",
      },
    ],
  },

  '/football-grid': {
    intro: [
      "The grid looks harmless: three rows, three columns, nine cells. Each row and column is a pro football criterion, a franchise, a position, a college, an award, and every cell needs a player who satisfies both. Then you learn that naming a Cowboys quarterback with 3 or more Pro Bowls is harder than it sounds.",
      "If daily team grids ever owned your mornings, this is that same itch with a twist: a rarity score that rewards deep cuts over obvious answers. Anyone can finish a grid with superstars. Finishing it with the forgotten third receiver from 2009 is the flex.",
      "A new puzzle drops at midnight Eastern, and everyone plays the same one.",
    ],
    howToPlay: [
      "Read the three row and three column criteria. A cell crossing Played for Packers with Won Super Bowl needs a player who did both.",
      "Tap a cell, start typing a name, and pick the player from the suggestions.",
      "Correct answers lock in green with a rarity percentage. Wrong ones flash red.",
      "Budget carefully: you get 15 guesses for all 9 cells, and every submission counts, so you can only afford 6 misses.",
      "Fill all nine cells to complete the grid, then share the emoji board and your rarity score.",
    ],
    rules: [
      "Every answer must match its row and its column at the same time.",
      "You get 15 total guesses, right or wrong. An unlimited guesses toggle exists for stress-free practice.",
      "Each correct pick shows what percent of players chose that same name for that cell. Your Rarity Score is the average across your correct cells, and lower is better.",
      "If answer checking is temporarily down, the guess does not count and you simply retry.",
      "One shared puzzle per day, with your progress saved if you leave and come back.",
    ],
    example: [
      "Take rows of Patriots, Cowboys, and Packers against columns of Quarterback, 3+ Pro Bowls, and Won Super Bowl. Most people type Tony Romo for the Cowboys quarterback cell and collect a fat common percentage. Quincy Carter earns the same green check at a fraction of the rarity.",
      "Patriots plus Won Super Bowl is a Tom Brady magnet, so you go Corey Dillon, who carried the 2004 champs, and score single digits. For Packers plus 3+ Pro Bowls, Aaron Rodgers is the obvious play, but Sterling Sharpe made five and almost nobody under 40 remembers.",
      "You close it 9 for 9 with two guesses to spare, and the nine percentages average out to 24. That number goes straight to the group chat.",
    ],
    tips: [
      "Scan the whole grid before guessing. Find the hardest crossing and save your flexible answers for it.",
      "Journeymen are gold. A four franchise veteran covers cells a one team legend never could.",
      "If a name misses, change angles. Do not spend a second guess on a teammate from the same hunch.",
      "Chasing rarity is fun, but 9 of 9 with boring answers always beats 7 of 9 with cool ones.",
    ],
    faqs: [
      {
        q: "How does the rarity score work?",
        a: "Every correct cell shows the percentage of players who picked that same name there, based on real picks on the same puzzle. Your score averages those numbers, so lower means rarer, and rarer is the brag.",
      },
      {
        q: "Do correct answers use up guesses too?",
        a: "Yes. The 15 guess budget counts every submission, so a perfect game spends 9 and leaves room for exactly 6 mistakes.",
      },
      {
        q: "What categories show up?",
        a: "Franchises, positions, colleges, draft pedigree like undrafted or top 10 pick, Pro Bowl counts, Super Bowl wins, and awards like MVP.",
      },
      {
        q: "What happens when I run out of guesses?",
        a: "The grid ends and you keep the cells you filled plus their rarity score. A fresh grid lands at midnight Eastern.",
      },
      {
        q: "Is this the same as the baseball grid?",
        a: "Same core idea, pointed at football history instead, with crowd sourced rarity built in and an unlimited mode for practice.",
      },
    ],
  },

  '/nfl-career': {
    intro: [
      "One mystery pro football player, six career clues, and a score that shrinks every time you need another hint. You start with nothing but a draft round and a year, and it becomes a staring contest with your own memory.",
      "The clue order is the difficulty curve. Draft info could be thousands of guys. The full team history should feel obvious, which is exactly why solving early feels so good.",
    ],
    howToPlay: [
      "Read clue one: the round and year the mystery player was drafted.",
      "Type a guess in the search box whenever you feel sure.",
      "Every wrong guess reveals the next clue, in a fixed order: draft, college, first team, career stat, team history, jersey numbers.",
      "Solve early for more points. A first clue solve scores 6, and each extra clue costs one.",
      "A wrong guess after the sixth clue ends the game and reveals the player.",
    ],
    rules: [
      "There are 6 clues and 6 guesses, one wrong answer per clue.",
      "Scoring runs from 6 points for a first clue solve down to 1 on the last.",
      "Daily serves everyone the same mystery player, fresh every day. Unlimited deals random players back to back.",
      "Hard mode hides the earliest clues once new ones arrive, so you cannot lean on the whole stack.",
    ],
    example: [
      "Clue one says Round 6, 2000. One sixth rounder from that class towers over the rest, but you wait for clue two anyway: Michigan. That settles it.",
      "You type Tom Brady and take 5 points for a two clue solve. In hindsight the first clue was enough, and the missing point will bother you all day.",
    ],
    tips: [
      "Draft position is loaded information. A first overall pick narrows to one name, and a famous late rounder often is the whole answer.",
      "Read the career stat clue as a style hint. It usually points at what made the player famous.",
      "Do not spray early guesses. Each miss costs a point, and the search will not let you repeat one.",
    ],
    faqs: [
      {
        q: "What if I am stuck on the last clue?",
        a: "Think as long as you like, give up to see the answer, or take one final swing. A wrong guess there ends at zero.",
      },
      {
        q: "Are the players current or retired?",
        a: "Both. The pool mixes active stars with legends, and the clue trail works the same either way.",
      },
      {
        q: "Does Hard mode change the scoring?",
        a: "No. It only hides the early clues from view once later ones arrive.",
      },
    ],
  },

  '/nfl-higher-lower': {
    intro: [
      "Two players, one stat, one tap. A pair of pros sit side by side under a question like who threw for more career yards, and your gut answers before your brain finishes the math.",
      "The category rotates every round: touchdowns, then receptions, then rushing yards. Ten rounds later you find out how well you really know the record book.",
    ],
    howToPlay: [
      "Read the stat question at the top. Rounds rotate through touchdowns scored, passing yards, passing touchdowns, rushing yards, receiving yards, and receptions.",
      "Check each player's position, teams, and final season, then tap the one with the bigger career number.",
      "Watch both totals reveal, then roll into the next round.",
      "Finish all 10 rounds and post your score.",
    ],
    rules: [
      "Each correct answer scores 10 points, and consecutive correct answers stack a growing streak bonus of 5 points per extra step.",
      "A perfect 10 for 10 with an unbroken streak maxes out at 325.",
      "Career numbers come from real play by play data, using careers that started in 2000 or later so every total is complete.",
      "Daily is the same 10 rounds for everyone, once per day. Unlimited is random, and its Hard toggle pairs the closest values. Rare exact ties count as correct either way.",
    ],
    example: [
      "Round one asks career touchdowns and shows LaDainian Tomlinson against Adrian Peterson. Feels close, but LT finished with 162 to Peterson's 126, and the wrong pick kills your streak at zero.",
      "You settle down, run off six straight, and the streak bonus starts doing real work. A coin flip finish lands right, and you close at 8 of 10, well past 100 points.",
    ],
    tips: [
      "Longevity beats peak. A very good 15 year player usually out-totals a legend who burned bright for 8.",
      "Match the player type to the stat. Volume receivers stack receptions, deep threats stack yards.",
      "Protect a live streak. When a round feels like a coin flip, slow down, because the bonus is where big scores live.",
    ],
    faqs: [
      {
        q: "What is Hard mode?",
        a: "An unlimited mode toggle that builds nothing but photo finishes, pairing players with the smallest gaps it can find.",
      },
      {
        q: "Why are older legends missing?",
        a: "The pool only uses careers starting in 2000 or later, where the play by play data is complete, so nobody's total is silently short.",
      },
      {
        q: "Can both answers be right?",
        a: "On an exact tie, yes, either pick scores. The game avoids building tie pairs, so it almost never comes up.",
      },
    ],
  },

  '/nfl-connections': {
    intro: [
      "Twenty pro football players sit in a grid, hiding four groups of five that share something: a franchise, a college, a draft slot, a milestone. Find all four groups before four wrong guesses find you.",
      "The cruelty is the overlap. That quarterback fits the LSU group and the number one picks group, but he only belongs to one.",
    ],
    howToPlay: [
      "Scan the 20 names for anything five of them share.",
      "Tap exactly 5 players and hit submit.",
      "A real group locks in with its theme and color. A miss costs one of your 4 lives.",
      "Solved groups leave the board, making the rest easier to read. Clear all four to win.",
    ],
    rules: [
      "Groups are five players each, and a submission must match exactly. Four right and one wrong is still wrong.",
      "You get 4 lives for the whole puzzle, and there is no one away hint.",
      "Colors mark difficulty: yellow is gentlest, then green, then blue, and purple is the trap.",
      "Lose all lives and the remaining groups reveal themselves. Daily is one shared puzzle with saved progress, and Unlimited pulls random ones.",
    ],
    example: [
      "You spot five players who all wore a Patriots uniform and lock the yellow group. Then an LSU group looks obvious, except six names fit, which means one of them belongs somewhere else.",
      "You guess wrong once, swap the receiver for the safety you forgot went to LSU, and it locks. From ten names the rest sorts itself, and you finish with 2 lives left.",
    ],
    tips: [
      "Count candidates before submitting. Six names fitting a theme means you have not found the real theme yet.",
      "Lock your surest group first, not the first one you noticed. Every solve removes noise.",
      "When two groups fight over one player, work out where the other four names in each group come from.",
    ],
    faqs: [
      {
        q: "How is this different from other connections games?",
        a: "It runs bigger: four groups of five instead of four, so 20 players on the board and more overlap traps.",
      },
      {
        q: "What themes show up?",
        a: "Shared franchises, colleges, draft slots, and career milestones like passing yard thresholds. The purple group leans on the sneakiest link.",
      },
      {
        q: "Do I lose progress if I close the tab?",
        a: "No. The daily puzzle saves as you go and picks up where you left off.",
      },
    ],
  },

  '/nfl-connect-4': {
    intro: [
      "It is Connect 4, the childhood classic, except every disc has a price: before a piece drops you must name a player matching both the column you picked and the row where it lands.",
      "You block lines and build threats like normal, while wondering if you can produce a Steelers Defensive Player of the Year on command. Sometimes the best square is a question you cannot answer.",
    ],
    howToPlay: [
      "Start a game. Each of the 6 curated boards, like Dynasties or Steel Curtain, mixes franchises with achievements.",
      "Pick a column. Gravity drops your piece to the lowest empty row, and that row's criterion is the one to satisfy.",
      "Name a player matching both. A verified answer claims the cell in your color.",
      "Red and blue alternate. Pass the device to a friend or play both sides.",
      "First to four in a row, any direction, wins. A full board is a draw.",
    ],
    rules: [
      "The board is 7 columns by 6 rows, with criteria like League MVP, 100+ Career Sacks, or Undrafted.",
      "Wrong answers place nothing and do not lose your turn. Rethink, try another name, or hit skip to pass.",
      "Every player can only be used once per game, by either side.",
      "Franchise history counts across relocations, so Oilers greats count for the Titans.",
    ],
    example: [
      "On the Field Generals board, red opens in the Super Bowl MVP column, lands on the Packers row, and claims it with Bart Starr. Blue answers on the Saints row with Drew Brees.",
      "Ten turns later red needs one cell on 40,000+ Career Passing Yards crossed with the Chargers, but Philip Rivers is already used. Red blanks and skips, and blue steals the lane with Dan Fouts.",
    ],
    tips: [
      "Look down before answering. What matters is the row your piece will actually land in.",
      "Save your universal players. A name that fits many cells is worth most late.",
      "Steer the game toward columns your opponent cannot answer. That is as good as a block.",
    ],
    faqs: [
      {
        q: "Is there a computer opponent?",
        a: "No, it is two players on one screen. Grab a friend, or play both colors as a trivia workout.",
      },
      {
        q: "Who checks the answers?",
        a: "An AI referee checks each name against both criteria before the piece drops. If it cannot verify right now, nothing is placed and you retry.",
      },
      {
        q: "Can I use players from any era?",
        a: "Yes. Suggestions cover 2002 to today, but you can type any older legend's full name directly.",
      },
    ],
  },

  '/missing-eleven': {
    intro: [
      "You remember the game, the score, maybe the halftime show. Missing Eleven bets you do not remember who started. It shows a real Super Bowl starting lineup, offense or defense, with one name blanked out, and gives you 3 guesses.",
      "Every lineup is verified against official starter tables, which is exactly why this hurts. The famous name you remember was often coming off the bench that night.",
    ],
    howToPlay: [
      "Read the card: which Super Bowl, the final score, and whose starting unit you are looking at.",
      "Find the blank among the 11 starters. The position shows, the name is the mystery.",
      "Type a guess. Suggestions search the whole league, and a last name alone works.",
      "Miss and you get a hint, miss again for another. The third miss ends it.",
    ],
    rules: [
      "You get 3 guesses, scoring 100 points on the first, 70 on the second, and 40 on the third.",
      "The first miss reveals the player's nationality, the second reveals the first letter of the last name.",
      "A surname on its own counts when it is at least 4 letters.",
      "Hard mode removes hints, suggestions, and position labels. Daily is one shared puzzle a day, and Unlimited deals random lineups.",
    ],
    example: [
      "The card reads Super Bowl LI, Patriots 34, Falcons 28 in overtime, with the blank at running back for New England. Your brain screams LeGarrette Blount, or maybe James White, who scored the overtime winner.",
      "Both wrong. The actual starter that night was Dion Lewis, and White came off the bench for his three touchdowns. You take 40 points on the final guess and stop trusting your memory.",
    ],
    tips: [
      "Think starter, not star. The trap is almost always a famous name who began the night on the sideline.",
      "Use the ten visible names to pin down the exact season, then run that year's depth chart in your head.",
      "On offense, watch for linemen and second receivers. On defense, safeties are where memory gets fuzzy.",
    ],
    faqs: [
      {
        q: "Are the lineups actually accurate?",
        a: "Yes. Each one was checked against official box score starters and cross verified. When the answer surprises you, that is the point.",
      },
      {
        q: "Is it always the offense?",
        a: "No. The pool includes starting defenses too, and the card tells you which side of the ball you have.",
      },
      {
        q: "Do I have to spell the full name?",
        a: "No. Spelling is forgiving, and a last name of 4 or more letters is accepted on its own.",
      },
    ],
  },

  '/conquest': {
    intro: [
      "Picture America painted in 32 team colors, every state owned by its nearest stadium. Now play a season where each result redraws the borders, because in this football conquest game every winner annexes the loser's entire empire. Part season sim, part sports battle map, all chaos.",
      "The headline mode is Imperialism, the format the internet fell in love with: empires balloon, collapse, and flip on one upset. Arcade mode keeps the original play by play battles, player steals, and power ups.",
      "You do not just watch. You pick a team, call their game each week, and ride your empire to the final map.",
    ],
    howToPlay: [
      "Pick your team in Imperialism mode. The map seeds every territory to the closest stadium, 56 regions covering the lower 48.",
      "Each week all 32 teams pair off, and you call the winner of your team's game, with records and win odds on the card.",
      "Play the week and watch the map redraw. Every winner absorbs everything the loser owned.",
      "Survive 18 weeks, and the top 8 empires by territory enter the playoffs: Quarterfinals, Semifinals, Imperial Championship.",
      "Playoff losers hand over their whole empire, so the bracket consolidates the map until one team rules America.",
    ],
    rules: [
      "Winner takes all, every game. A one point squeaker annexes as completely as a blowout, and overtime means no ties.",
      "Wiped out teams keep playing their schedule, and one win seizes their conqueror's entire empire. Comebacks are the soul of the format.",
      "If a team owns the whole map before week 18, the season ends on the spot.",
      "Playoff seeding is territory first, with season record breaking ties.",
      "Scoring: 3 points per state held at the end, 25 per correct call, 50 for making the playoffs, 200 if your team takes the crown.",
      "The Daily Challenge deals every player the same date-seeded season: same starting map, same fixtures, same results. One scored run per day with streaks. Free Play is unlimited and fully random.",
    ],
    example: [
      "You pick the Chiefs, who start with a slice of the middle of the map. Week 1 they beat the Broncos and the whole mountain empire flips red in an afternoon. By week 6 you stretch toward the Pacific, because your victims had already eaten their neighbors.",
      "Then week 9: a 3 point loss to the Bears hands your 20 state kingdom to Chicago, and your NFL imperialism map dream is suddenly a gray footnote. You still sit at 6 and 3. You just own nothing.",
      "One win the next week puts you back in business, because your new victim sat on 14 states. You claw to the 3 seed, win two playoff rounds, and drop the Imperial Championship to a juggernaut. Final tally: 41 states, 11 correct calls, playoff bonus banked. You immediately run it back.",
    ],
    tips: [
      "Do not panic when you get erased. One win against a fat empire is the fastest growth in the game.",
      "Respect close win odds when calling games. Those 25 point picks quietly decide your final score.",
      "Watch the standings, not just the colors. Record breaks playoff ties, so a hot streak matters late.",
      "Try Arcade when you want a slower burn: battles, player steals, and a 99 rated franchise legend power up.",
    ],
    faqs: [
      {
        q: "How does the Daily Challenge work?",
        a: "Everyone on the planet gets the same season today: identical starting map, identical fixtures, identical results. Your score comes from which empire you back and how well you call the games, so comparing scores is a fair fight. One scored run per day, streaks build if you show up daily, and a fresh map drops at midnight Eastern. Free Play stays unlimited.",
      },
      {
        q: "How does the imperialism format work?",
        a: "Every territory starts with its nearest stadium. Each winner annexes every state the loser owned, wiped out teams stay on the schedule and can reclaim an empire with one win, and after 18 weeks the top 8 empires play a knockout bracket.",
      },
      {
        q: "How many territories are on the map?",
        a: "56: the lower 48 with the crowded football states split, California and Florida in three pieces, Texas, Ohio, Pennsylvania, and New Jersey in two, so every franchise starts with a home region.",
      },
      {
        q: "Does margin of victory matter?",
        a: "Never. Winning by 1 and winning by 30 both take everything, which is why late upsets feel like earthquakes.",
      },
      {
        q: "What is Arcade mode?",
        a: "The original formula: a random team spins a compass direction and attacks the nearest enemy or grabs neutral land, battles play out with real player names and a box score, winners steal a player from the loser, and power ups sit on marked states. Last team standing wins.",
      },
      {
        q: "Can my team win after being wiped out?",
        a: "Yes. Getting erased costs land, not life. Win once to inherit an empire, and if you crack the top 8 by week 18 the title is still live.",
      },
    ],
  },
};
