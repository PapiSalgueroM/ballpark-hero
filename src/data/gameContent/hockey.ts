import type { GameContentMap } from './types';

// Hockey game guides. Casual human tone, no em dashes anywhere.
export const HOCKEY_CONTENT: GameContentMap = {
  '/perfect-season-nhl': {
    intro: [
      "The wheel owns your draft. Every spin lands on a real NHL franchise and one decade of its history, and you take exactly one player before it moves on.",
      "Fill six slots from a century of hockey, then the sim plays the 82 game season. Anything short of 82-0 stings.",
    ],
    howToPlay: [
      "Pick a mode: Classic, Hard (ratings hidden) or Daily (one shared attempt).",
      "Spin the wheel. It stops on a franchise and era, like the 1980s Oilers.",
      "Draft one player from that squad into an open slot. Skaters rate 40 to 99 off real career scoring; goalies rate on draft pedigree.",
      "Repeat until you have a center, both wings, two defensemen and a goalie.",
      "Use your 2 rerolls if a squad gives you nothing.",
      "Let the sim run all 82 games and hand down your record.",
    ],
    rules: [
      "6 lineup slots, with the goalie weighted heaviest in your team overall.",
      "One player per spin, no player in two slots, and 2 rerolls per run.",
      "The season is 82 simulated games; a higher overall wins more, but perfection also needs luck.",
      "Daily mode allows one attempt per day with a rotating theme and resets at midnight Eastern.",
    ],
    example: [
      "Say the first spin lands on the 1980s Oilers and you grab a 99 rated center. Two spins later a thin squad costs a reroll, and you settle for an 85 defenseman.",
      "You finish at 93 overall. The sim rips off 38 straight, drops game 39, and closes 80-2. The result card calls that a division winner. You wanted the banner.",
    ],
    tips: [
      "Never settle in net. A weak goalie sinks five good skaters.",
      "Spend rerolls late, when only a slot or two remains open.",
      "Players listed at F or W can cover several forward slots, which keeps early spins flexible.",
      "In Hard mode, trust eras: dead puck 2000s scorers get a quiet ratings boost, while inflated 1980s numbers get trimmed.",
    ],
    faqs: [
      {
        q: "How realistic is an actual 82-0 run?",
        a: "Nearly impossible on purpose. Even a lineup full of 99s is capped below a 99 percent win chance per game, so most runs drop one somewhere.",
      },
      {
        q: "What does Hard mode change?",
        a: "Ratings show as question marks until the season ends. You draft on names, eras and gut.",
      },
      {
        q: "Can I replay the Daily?",
        a: "No. One attempt, the same wheel for everyone, and your result locks until the next puzzle at midnight Eastern.",
      },
    ],
  },

  '/puck-detective': {
    intro: [
      "Somewhere on a current NHL roster hides the mystery player, and you get 8 guesses to name him.",
      "Every guess is a real player, and every guess talks back: five chips compare team, position, nationality, age and jersey number against the secret answer. Solve the shared daily puzzle, or grind win streaks in unlimited mode.",
    ],
    howToPlay: [
      "Type an NHL player and pick him from the suggestions.",
      "Read the chips. A green check means an exact match, a gray X means no match.",
      "Position can show a yellow dash: right group (forward, defense or goalie), wrong spot.",
      "Arrows on age and jersey point toward the mystery player: up means his number is higher than your guess.",
      "Keep narrowing and land the exact player within 8 guesses.",
    ],
    rules: [
      "8 guesses per puzzle, in both daily and unlimited.",
      "Five clues per guess: team, position, nationality, age and jersey number.",
      "Team and nationality are exact or nothing; only position has a close tier.",
      "Unlimited mode tracks your current and best win streak, with Easy, Normal and Hard pools.",
      "The daily player is the same for everyone and changes at midnight Eastern.",
    ],
    example: [
      "Say you open with Sidney Crosby. The team chip stays gray, position flashes yellow, Canada goes green, the age arrow points down and the jersey arrow points up.",
      "Translation: a younger Canadian forward who is not a center and wears a bigger number than 87. Two probing winger guesses later, the whole row turns green on guess five.",
    ],
    tips: [
      "Open with a player you know cold. The information matters more than the guess itself.",
      "Bracket the numbers: one older guess and one younger guess pin the age range fast.",
      "A green country is nice, but a gray one is bigger; it deletes whole nations from the pool.",
      "Yellow on position means stay in the group. Swap center for winger before abandoning forwards.",
    ],
    faqs: [
      {
        q: "Does the team chip ever show yellow for a rival?",
        a: "No. Team is exact or gray. Only the position chip has a close tier.",
      },
      {
        q: "What do the difficulty tiers change?",
        a: "Unlimited only. Easy draws skaters with 250 or more career points, Hard draws players under 75 points plus goalies, and Normal uses the full pool. The daily always uses everyone.",
      },
      {
        q: "I closed the tab mid puzzle. Did I lose my guesses?",
        a: "No. Daily progress saves in your browser, so you can finish any time before the reset.",
      },
    ],
  },

  '/hockey-grid': {
    intro: [
      "Nine cells, nine chances to prove your hockey memory runs deeper than last season.",
      "Every row and column is a franchise or a career milestone, and each cell wants a player who satisfies both. If you have played a team grid before, this is the NHL one, built on a full all-era career database.",
    ],
    howToPlay: [
      "Look at where a row meets a column, like Bruins plus Canadiens, or Oilers plus 500+ Career Points.",
      "Tap the cell and type a player whose career fits both.",
      "A correct pick locks the cell in green. A miss burns one of your 9 guesses.",
      "Each player name can only be used once per board.",
      "Fill all 9 cells before the misses run out.",
    ],
    rules: [
      "You get 9 guesses, and only wrong answers spend one; correct answers are free.",
      "Categories come from a pool of 16 franchises plus three milestones: 500+ career points, 300+ career goals and 1000+ games played.",
      "The daily grid mixes one milestone with five franchises, and everyone gets the same board until midnight Eastern.",
      "Unlimited mode adds difficulty tiers: Easy runs two milestone lines, Hard goes all franchises.",
    ],
    example: [
      "Imagine rows of Maple Leafs, Oilers and Bruins against columns of Red Wings, Canadiens and 500+ Career Points. Oilers plus 500 points is a layup: Jari Kurri.",
      "Maple Leafs plus Red Wings takes a traveler like Larry Murphy, and Bruins plus Canadiens rewards remembering that Mark Recchi wore both sweaters. You burn one guess on a hunch who never actually played in Detroit, then close it out 9 for 9.",
    ],
    tips: [
      "Franchise pair cells love journeymen. Think late career trades, not one club legends.",
      "Milestone cells are your safety valve; every franchise in the pool has plenty of 500 point scorers.",
      "There is no rarity bonus, so play the safest name you know.",
      "Answers check instantly against the career database, and any era counts, from Original Six days to last season.",
    ],
    faqs: [
      {
        q: "Do correct answers use up guesses?",
        a: "No. Only misses, unknown names and repeated names cost one of the 9.",
      },
      {
        q: "Which players are eligible?",
        a: "Anyone in the all-era NHL career database, thousands of skaters across every decade, not just current rosters.",
      },
      {
        q: "Does the daily grid have difficulty settings?",
        a: "No. Tiers only apply to unlimited grids. The daily is one shared board for everybody.",
      },
    ],
  },

  '/hockey-career': {
    intro: [
      "One mystery player, a stack of clues and a score that shrinks every time you peek.",
      "Career Path opens with just the position. From there you choose: swing early for the full 1000 points, or buy clues about country, draft, teams, stats and awards until the answer is staring at you.",
    ],
    howToPlay: [
      "Start with a single clue: the position.",
      "Guess by typing a name whenever you like; wrong guesses cost nothing.",
      "Or reveal the next clue. Each reveal knocks 150 points off your potential score.",
      "Clues arrive in order: country, draft, teams (one more team per reveal), career stats, then awards.",
      "Land the name for the remaining points, or give up to see the answer.",
    ],
    rules: [
      "Scoring starts at 1000, drops 150 per revealed clue and never goes below 100.",
      "There are up to 6 reveals beyond the starting position clue.",
      "Wrong guesses are unlimited and free, and a last name alone counts.",
      "The daily player is shared worldwide, saves in your browser and flips at midnight Eastern; unlimited deals random players.",
      "Hard mode hides the two easiest clues from the board without touching the scoring.",
    ],
    example: [
      "Say the position reads center. Too thin, so you reveal country: Canada. Still huge, so you buy the draft clue: first overall, 2015.",
      "That is Connor McDavid and you know it. Two reveals spent means 700 points on the table, and typing McDavid banks all of them.",
    ],
    tips: [
      "The draft clue is the loudest tell. A famous year and pick can end the game on the spot.",
      "Guess constantly. Wrong answers are free, reveals are not.",
      "Teams appear in career order, so the first club revealed is where it all started.",
      "The 100 point floor means you should never quit; a fully revealed win still pays something.",
    ],
    faqs: [
      {
        q: "Do wrong guesses lower my score?",
        a: "No. Only clue reveals cost points. Fire away between reveals.",
      },
      {
        q: "Do I need the full name?",
        a: "No. The last name works, so typing Crosby matches Sidney Crosby.",
      },
      {
        q: "What exactly does Hard mode hide?",
        a: "The position and country clues stay off the board. Scoring is identical; you just work with less.",
      },
    ],
  },

  '/hockey-higher-lower': {
    intro: [
      "Two players side by side, one question: who ended up with more career points?",
      "Ten quick rounds, a streak bonus that snowballs, and a daily set of matchups the whole site sweats together. It sounds easy until a pure sniper meets a quiet playmaker.",
    ],
    howToPlay: [
      "Look at the two players: name, position, country and teams.",
      "Tap the one you think has more career points, meaning goals plus assists.",
      "Both totals flash up for a couple of seconds, then the next pair skates in.",
      "Correct picks pay 10 points each, and streaks pay extra on top.",
      "Ten rounds, then share your score.",
    ],
    rules: [
      "10 rounds per game and 10 points per correct answer.",
      "The streak bonus grows: your second straight correct adds 5, the third adds 10, and so on.",
      "A perfect 10 with an unbroken streak scores exactly 325.",
      "Dead ties count as correct no matter which side you pick.",
      "Daily serves the same 10 matchups to everyone until midnight Eastern; Hard mode, unlimited only, builds close-gap pairs.",
    ],
    example: [
      "Round one, say it is Jaromir Jagr against Brett Hull. Hull's 741 goals scream at you, but points is the stat, and Jagr's 1921 buries Hull's 1391.",
      "You ride that logic to six straight before a coin flip pair snaps the run. Final: 8 of 10 with a fat streak bonus, plus one matchup you will argue about all day.",
    ],
    tips: [
      "Points means goals plus assists. Playmakers sneak past pure goal scorers.",
      "Longevity wins these. Twenty seasons of good usually beats eight seasons of great.",
      "Watch positions: an offensive defenseman can out-point a checking forward, but forwards win most pairs.",
      "Guard a live streak. The bonus grows every round it survives, so the late rounds are worth the most.",
    ],
    faqs: [
      {
        q: "Is it goals or points?",
        a: "Career points, meaning goals and assists combined.",
      },
      {
        q: "What is the maximum score?",
        a: "325. That is all 10 correct with the streak never breaking: 100 in base points plus 225 in bonus.",
      },
      {
        q: "What does Hard mode do?",
        a: "Unlimited only. It pairs players with close career totals, so the gimmes disappear.",
      },
    ],
  },

  '/nhl-connections': {
    intro: [
      "Twenty NHL players, four hidden groups and just enough overlap to wreck your confidence.",
      "Each group of five shares a connection, maybe a franchise, maybe a career milestone. Find all four on 4 lives, then come back tomorrow and do it again.",
    ],
    howToPlay: [
      "Study the board of 20 names.",
      "Select exactly 5 players you believe share a connection and submit.",
      "A correct five locks in with its color and theme. A wrong five costs one of your 4 lives.",
      "Colors rank difficulty: yellow easiest, then green, blue and purple.",
      "Clear all four groups before the lives run out.",
    ],
    rules: [
      "The board is always 20 players forming exactly four groups of 5.",
      "You have 4 lives, every wrong submission costs one, and there are no partial hints.",
      "Losing the last life reveals the remaining groups so you can see what got you.",
      "The daily puzzle is identical for everyone and rolls over at midnight Eastern; unlimited mode deals random boards from the pool.",
    ],
    example: [
      "Say you spot five Penguins right away: Crosby, Malkin, Lemieux, Jagr and Fleury. Feels automatic, except the purple group on this imagined board is 1,000 point scorers, and Jagr fits both worlds.",
      "The safe play is solving the scorers first and letting elimination sort Jagr out. That is the whole game in one decision.",
    ],
    tips: [
      "Submit the group where you can name all five, not the one with three locks and two hopes.",
      "Assume the overlap is intentional. The player who fits two themes is the trap.",
      "Think about purple early. Spotting the sneaky link protects your easy groups.",
      "When two groups fight over one name, solve the other group first and let elimination decide.",
    ],
    faqs: [
      {
        q: "Groups of five, not four?",
        a: "Yes. Five players per group and 20 on the board, a little bigger and meaner than the puzzle that inspired it.",
      },
      {
        q: "Do I get a warning when I am one player off?",
        a: "No. Any wrong five costs a life, no matter how close it was.",
      },
      {
        q: "What happens at zero lives?",
        a: "The unsolved groups reveal themselves, your daily result locks for the day, and a fresh board arrives tomorrow.",
      },
    ],
  },

  '/conquest-nhl': {
    intro: [
      "Every patch of the US map starts loyal to its nearest NHL arena, and none of it is safe.",
      "This is imperialism rules on ice: win a game, annex the loser's entire empire. Lose everything and you keep playing, because one win takes it all back. Five clubs even start with nothing.",
    ],
    howToPlay: [
      "Pick your team from all 32.",
      "Each round, call the winner of your featured game before it plays. Correct calls pay 25 score.",
      "Watch the whole league's results redraw the map; every loser hands over every territory it owned.",
      "Survive 16 rounds. The top 8 empires seed a playoff.",
      "Win the Quarterfinals, Semifinals and the Imperial Cup Final to rule the map.",
    ],
    rules: [
      "16 regular rounds, and every game transfers the loser's entire empire to the winner.",
      "Toronto, Ottawa, Edmonton, Vancouver and Buffalo start landless as the invaders.",
      "Playoff seeding takes the 8 biggest empires, with win-loss record breaking ties.",
      "Final score: 3 per territory held, 25 per correct call, 50 for making the playoffs, 200 for winning it all.",
      "Winners score 2 to 7 goals, overtime games finish one goal apart, and ties do not exist.",
      "The Daily Challenge deals every player the same date-seeded season: same starting map, same fixtures, same results. One scored run per day with streaks. Free Play is unlimited and fully random.",
    ],
    example: [
      "Say you ride the Avalanche. Round 3 they lose a coin flip and the whole empire vanishes in one night. Round 5 they win, and because that opponent had been hoarding, you inherit more land than you lost.",
      "Meanwhile Edmonton, landless since round 1, finally wins in round 9 and swallows an empire whole. That is the invader life: nothing to lose, everything to take.",
    ],
    tips: [
      "Call favorites. Upsets pay the same 25, and the percentages shown come from team strength plus home ice.",
      "Never quit on a wiped-out team. The format is built for comebacks.",
      "Check the standings: territories decide seeding first, so a fat empire matters more than a pretty record.",
      "Playoff games transfer land too, so the eventual champion usually ends up owning most of the map.",
    ],
    faqs: [
      {
        q: "How does the Daily Challenge work?",
        a: "Everyone on the planet gets the same season today: identical starting map, identical fixtures, identical results. Your score comes from which empire you back and how well you call the games, so comparing scores is a fair fight. One scored run per day, streaks build if you show up daily, and a fresh map drops at midnight Eastern. Free Play stays unlimited.",
      },
      {
        q: "My team got erased in round 2. Is my run over?",
        a: "No. Wiped-out clubs keep their full schedule, and beating any landowner hands you everything they hold.",
      },
      {
        q: "Why do five teams start with nothing?",
        a: "Territories go to the nearest NHL arena, and those five clubs lose that geography, so they open as invaders.",
      },
      {
        q: "Can the season end before round 16?",
        a: "Yes. If one club paints the entire map, total conquest ends the season immediately.",
      },
    ],
  },

  '/nhl-my-career': {
    intro: [
      "You start as a name on a draft board and end, if it all breaks right, with a call from the Hall in Toronto.",
      "Your player is fictional. The league is real: 32 NHL teams, real trophies, a whole career of season stat lines in between.",
      "You build your player's actual face before the draft, and there is a dirty side waiting whenever you want it. An envelope on the bench with a bounty in it, a twelve year contract whose tail years everyone knows you will never play, a doctor in Europe with a suitcase, and a man who pays for the starting goalie an hour before anyone announces it. Every dirty choice raises a hidden league meter, and at the top of it is an indefinite suspension that costs you a full season."
    ],
    howToPlay: [
      "Create your player: name, one of 5 positions (C, LW, RW, D, G), and one of 17 archetypes, from Generational Talent to The Agitator to The Workhorse in net.",
      "Pick your league: today's NHL, or the 2006-07 throwback with the Thrashers in Atlanta and the Coyotes in Phoenix, before Vegas or Seattle existed.",
      "Build your look, then spend the money in 7 aisles including a shady one that only appears once you have something to hide.",
      "Open the Bank between seasons. Savings pays 2.5% a season and never loses, five things you can put money into each have a price that moves every season whether you look or not (a fund, flats back home, two shares and a coin that halves as often as it doubles), the statement keeps your last 12 moves, and the card school at the back of the plane is one sitting a season on odds that are printed before you sit in.",
      "Read the News box. The paper writes up every season in your own position's stat, the SocialGram shows followers read off your fanbase with three fan comments under the latest post, and the rival's card keeps the head to head against the player drafted the same year as you.",
      "Collect badges in the Trophy Case: 23 of them, from a first Cup and the Calder to 500 goals, a 50 goal season and $100M to your name, each lit the moment the facts of your career say so.",
      "Get drafted by a real club; your slot reflects your starting ability.",
      "Check the lineup. Top ten skaters step straight in; everyone else fights the incumbent in camp every fall. Goalies always apprentice first, because no rookie walks into a number one crease.",
      "Play each season: skaters post goals, assists and points, goalies post wins and save percentage.",
      "Face one big offseason decision each year: training, trade requests, media noise.",
      "When the deal expires, hit July 1 for real: competing offers from named clubs with their own money, length and roster quality, and one push for more on any of them.",
      "Age, decline, retire, then read the legacy verdict.",
    ],
    rules: [
      "Careers start in 2026 at age 18 or 19 and last up to 22 seasons. The throwback starts in 2006 instead, inside a sealed 30 team league verified against the real season, with 2006 sized contracts.",
      "You improve toward your potential through age 25; decline starts at 31 for skaters, 34 for goalies.",
      "The lineup is real: fourth-line seasons run on half the ice time, a backup goalie gets twenty-odd starts, camps have memory both ways, and signing with a stacked Cup contender can cost a mid player his spot.",
      "The press reads your actual season: lift the Cup and you take the podium, miss badly and you face the scrum, sit down the lineup and the role question finds you. Three answers each time, safe, honest or fiery, and fiery gambles your fanbase for real.",
      "Retirement hits at 40 for skaters, 41 for goalies, or earlier if your rating collapses; you can walk away after 6 seasons.",
      "The legacy score weighs Cups, majors (Hart, Norris or Vezina), Conn Smythes, All-Star nods, seasons and production; 500 or more means the Hall of Fame.",
      "Money has rules of its own. There is a 1% fee on both sides of every trade and a $100k floor in the account that cannot be invested away; a season that leaves you under the floor is covered out of savings first, then by a forced sale of holdings at whatever the price is that day. Cards win 42% of hands and a win pays 1.15x the stake, the most you can stake is $50k or 4% of your cash, and once you are $500k down for your career the boys stop dealing you in for good. Keep sitting in while you are losing and somebody at home notices, which costs morale and fanbase.",
      "The fans nag you for the thing your position is judged on and never the other way round: a center hears more points, a winger hears bury more chances, the man on the blue line hears move the puck and keep it out, and a goalie only ever hears make the saves.",
      "One career saves automatically in your browser; a new one replaces it.",
    ],
    example: [
      "Say your Sniper winger goes 23rd overall to a rebuilding club. Year one is 24 goals and silence. At 23 you erupt for 47 with an All-Star nod, but the losing wrecks your morale, so you force a trade to a contender.",
      "At 27 you win the Cup. The legs go at 33, you switch to maintenance summers, grab two more years and retire at 38: one Cup, six All-Star nods, a franchise icon verdict. The Hall says not quite.",
    ],
    tips: [
      "Durability is baked into the archetype. Power forwards break down; two-way types last.",
      "Skills coach summers add rating while you are young; from 31 on they quietly become body maintenance.",
      "Morale feeds the stat engine, so playing miserable costs real production.",
      "In free agency the rebuild pays the most and the contender pays the least. The roster number on each offer is the exact quality your next seasons run on, so the choice is money against playoff springs.",
    ],
    faqs: [
      {
        q: "Am I playing as a real NHL player?",
        a: "No. You are a fictional prospect dropped into the real league.",
      },
      {
        q: "What is the highest verdict?",
        a: "900 or more reads as Rushmore of the sport. The Hall of Fame line sits at 500.",
      },
      {
        q: "Can a goalie reach the Hall?",
        a: "Yes. Wins, Vezinas and Cups carry goalie legacies.",
      },
      {
        q: "Why am I the backup goalie?",
        a: "Because that is how goalies come up: nobody hands a rookie the crease, top pick or not. You open behind the veteran, take your twenty-odd starts, and win the number one job in camp when your level passes his. Skaters fight the same fight for top-line minutes; a fourth-line year is half the ice time and it wears on you.",
      },
      {
        q: "Can I start in a different era?",
        a: "Yes. The create screen has a 2006-07 throwback: the 30 team league with the Atlanta Thrashers and the Phoenix Coyotes, before Vegas, Seattle or Utah existed. An era career never meets a franchise that did not exist then.",
      },
      {
        q: "What is in the Bank?",
        a: "Four tabs. Account holds your cash, a savings account that pays 2.5% a season, and a statement of your last 12 moves. Market is five prices that move every season, each with its own risk word and a read on whether it is cheap or dear against what it usually goes for. Cards is the card school at the back of the plane, one sitting a season, on odds the screen prints before you play. Shop is the 7 aisles. It is the same engine Soccer Career's phone runs on, in dollars.",
      },
      {
        q: "Who is my rival?",
        a: "A generated player drafted the same year at your position. He plays his own seasons on the same scale you do, can lift a Cup before you and retire before you, and the head to head is kept for good. He is fictional, like your own player, so no real player's career is being simulated.",
      },
      {
        q: "How do I earn badges?",
        a: "By doing the thing. Each of the 23 badges is a test on the facts of your career, checked every time you open the case: a Cup, a major, 500 goals, 1,000 points, a million dollars to your name. The single season badges sit under the real records and say so: 50 goals against Wayne Gretzky's 92 in 1981-82, 100 points against his 215 in 1985-86, and a 40 win season against the 48 that Martin Brodeur and Braden Holtby share.",
      },
    ],
  },

  '/nhl-front-office': {
    intro: [
      "Running an NHL club is a math problem with feelings, and now the math is yours.",
      "You get a real 2026-27 roster rated off real 2025-26 stats, a hard cap, a points race and the actual divisional bracket. Contracts and trades in the sim are fictional; the hockey logic is not.",
    ],
    howToPlay: [
      "Pick any of the 32 clubs and inherit its actual roster.",
      "Read the ownership mandate: a contender is told to win the Cup, a bubble club to make the bracket, a rebuild to hit an honest win number. It resets every offseason from where the roster really stands.",
      "Shape it: waive players, sign free agents, and work the phone on trades, where the other GM counters with pick demands and lesser returns instead of a flat yes or no.",
      "Sim the season in 20 rounds of roughly four games each, with a live read on whether you are on pace.",
      "Qualify for the playoffs: top three per division plus two wild cards per conference.",
      "Win four best-of-7 rounds to lift the Stanley Cup, then draft and go again, as long as ownership keeps you.",
    ],
    rules: [
      "The hard cap starts at 104M and rises about 9 percent a season; every move must fit.",
      "Points are real: 2 for a win, 1 for an overtime loss, and roughly a quarter of losses go to overtime.",
      "Rosters run between 8 and 15 players, floor and ceiling both enforced.",
      "Trades are player for player plus an optional pick, and the AI prices age, rating and position before saying yes.",
      "At the draft you make 2 picks, and scouting grades carry error; the true rating appears only after you commit.",
      "Trust upstairs runs 0 to 100: beat the mandate and it climbs, miss it and it falls, a Cup fixes almost anything, and at zero you are fired and the save ends.",
    ],
    example: [
      "Say you take Buffalo. You waive a fading winger, sign a 79 rated defenseman, then package your third line center plus a pick for a younger blueliner. The AI takes the deal because the value clears its price.",
      "The season becomes a wild card sweat decided by overtime loser points. You sneak in, stun a division winner, then die in the division final. At the draft an 88 grade center turns out to be an 84.",
    ],
    tips: [
      "Overtime loser points decide races. A team hovering around .500 can still make the bracket on them.",
      "Strength math: the top six forwards carry half your rating, the top four defensemen 30 percent, the starting goalie 20.",
      "Players 23 and under develop toward their potential every offseason. Hoard them.",
    ],
    faqs: [
      {
        q: "Why does the AI keep rejecting my trades?",
        a: "It wants a premium. Centers cost the most, age tanks value fast, and adding a pick often flips a no into a yes.",
      },
      {
        q: "Can I get fired?",
        a: "Yes. Ownership grades the mandate every season and tracks trust from 0 to 100. Missing the bracket with a Cup-or-bust roster costs real trust, and at zero the save ends and you take another chair.",
      },
      {
        q: "How long can one franchise run?",
        a: "As long as ownership keeps you. Seasons chain through the draft and offseason, the game autosaves in your browser, and your Cup count carries over.",
      },
    ],
  },

  '/nhl-connect-4': {
    intro: [
      "Connect 4 grew a hockey brain. The gravity is the same and four in a row still wins, but every cell must be earned by naming a real NHL player.",
      "Grab a friend for pass and play, pick a column, and answer the trivia question waiting on the row where your piece lands.",
    ],
    howToPlay: [
      "Red and blue take turns on one device.",
      "Pick a column. Your piece falls to the lowest open row.",
      "Name a player matching both labels, like Canadiens plus Hall of Famer.",
      "A verified answer claims the cell. A miss costs nothing, so retry or hit Skip.",
      "Connect four of your color in any direction to win; a full board is a draw.",
    ],
    rules: [
      "The board is 7 columns by 6 rows, dealt from a set of themed boards: Original Six matchups, trophies, birth countries, goalies.",
      "Every player name can be used exactly once per game.",
      "Wrong answers never cost your turn; only Skip passes it.",
      "Franchise history survives relocation: Nordiques answers count for the Avalanche, Whalers for the Hurricanes, Thrashers for the Jets.",
      "An AI referee checks each answer, and when it cannot verify one, nothing is placed and you simply try again.",
    ],
    example: [
      "Say the Original Six board comes up. Red opens in the Canadiens column and lands on the Hall of Famer row: Patrick Roy, easy money. Blue answers Penguins plus 500+ Career Goals with Mario Lemieux.",
      "Ten moves later red needs one diagonal cell, and the landing row is Hart Trophy under the Rangers column. Mark Messier, the 1992 Hart winner as a Ranger, ends it.",
    ],
    tips: [
      "Think one row ahead. The stack height decides which row your answer must satisfy, so a column's question changes with every drop.",
      "Ration your universal legends. A name that answers many cells is gone for the whole game once played.",
      "Goalies are missing from the suggestion list; type the full name and press Enter.",
      "Block like it is real Connect 4. Sometimes the right move is claiming a cell just to deny the row.",
    ],
    faqs: [
      {
        q: "Is there a computer opponent?",
        a: "No. It is pass and play for two people, or you can run both colors and battle yourself.",
      },
      {
        q: "What happens if the referee cannot verify my answer?",
        a: "It fails safe. No piece is placed, no turn is lost, and you can try the same cell again.",
      },
    ],
  },

  '/perfect-lineup-nhl': {
    intro: [
      "Three forwards, two defensemen, a goalie. Easy, except the game names the terms before you pick a single player.",
      "Half your slots arrive locked to a franchise or a decade, and the dream line gets built around them from a pool of all-time greats. Then the sim grades the whole thing.",
    ],
    howToPlay: [
      "Read your six slots: LW, C, RW, two D and a G. Three carry a constraint tag like Oilers or 1990s.",
      "Tap a slot and pick from the eligible legends; the list only shows players who fit the position and the tag.",
      "No player fills two slots, and picks sharing a team or era build chemistry.",
      "Fill all six and hit Simulate.",
      "Share the scoreline and grade, or tweak the lineup and run it back.",
    ],
    rules: [
      "6 slots, and exactly 3 of them are constrained to a franchise or an era.",
      "Your final rating is 80 percent talent, 20 percent chemistry.",
      "Chemistry counts picks who share a team or era with at least one other pick.",
      "Grades: A+ at 92 or better, A at 84, B at 74, C at 62, D below that.",
      "Daily constraints refresh every day, and unlimited mode rerolls random ones whenever you want.",
    ],
    example: [
      "Say the daily locks the center slot to the Oilers, the right wing to the 1990s and one defense slot to the Avalanche. Gretzky takes the middle, Jagr the wing, Cale Makar the blue line.",
      "Now the chemistry play: Paul Coffey doubles up with Gretzky on team and era, and Patrick Roy links to Makar through the Avalanche tag. The sim spits out a 5-0 and an A.",
    ],
    tips: [
      "Fill the constrained slots first. Their lists are short, and a flexible star wasted early can block them.",
      "Stack a dynasty core. Two or three picks from one team and era move the chemistry needle fast.",
      "Do not chase chemistry into bad ratings; talent is most of the math.",
      "In unlimited, reroll until constraints overlap. An Oilers slot next to a 1980s slot is a gift.",
    ],
    faqs: [
      {
        q: "Is the daily lineup the same for everyone?",
        a: "Yes, everyone works with the same constraint set each day. Unlimited rolls are random.",
      },
      {
        q: "Can I redo my daily after simulating?",
        a: "Yes. Edit the lineup and simulate again as often as you like.",
      },
      {
        q: "Who is in the player pool?",
        a: "A curated set of NHL greats from Gordie Howe to Connor McDavid, each tagged with one position, franchise and era.",
      },
    ],
  },
};
