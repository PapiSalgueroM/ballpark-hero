import type { GameContentMap } from './types';

// Baseball game guides. Casual human tone, no em dashes anywhere.
export const BASEBALL_CONTENT: GameContentMap = {
  '/perfect-season-mlb': {
    intro: [
      "The wheel spins across a century of baseball and stops on a real team season, maybe the 1927 Yankees, maybe a club nobody remembers. You draft one player, then spin again.",
      "Eleven picks later you own a lineup stitched from every era, and the sim makes you sweat all 162 games. Going 158-4 hurts more than going 120-42. That is the point.",
    ],
    howToPlay: [
      "Spin the wheel. It stops on a real team season from 1901 onward.",
      "Draft one player into an open slot. Ratings run 40 to 99, built from real stats that year.",
      "Repeat until all 11 slots are filled: eight fielders, a DH, a starting pitcher and a relief ace.",
      "Hate a spin? Use a reroll, you get 2 per run.",
      "When the lineup is full, the season simulates win by win. Skip ahead any time.",
    ],
    rules: [
      "11 lineup slots, one draft per spin, no player name used twice.",
      "2 rerolls per run, and every season is a full 162 games.",
      "Three modes: Classic shows ratings, Hard hides them until the season ends, Daily gives everyone the same wheel and one attempt per day.",
      "The daily has a theme limiting which team seasons the wheel can hit, and it resets at midnight Eastern.",
    ],
    example: [
      "Your first spin lands on the 1927 Yankees, so Lou Gehrig locks in at first base. Later stops bring Bob Gibson off the 1968 Cardinals, then Ken Griffey Jr. from the 1997 Mariners for center field.",
      "The finished squad rates 93 overall. You start 58-0 and plan the parade. Then two losses land in the same August week and the board reads 157-5. A juggernaut, not a legend.",
    ],
    tips: [
      "Save rerolls for the endgame. Early spins always offer someone useful, but one stubborn open slot late can strand you.",
      "Fill DH last. Any qualified bat is eligible there, the perfect parking spot for a monster whose position is taken.",
      "In Hard mode, read the stat lines. A tiny ERA or a 40 homer season says plenty while ratings are hidden.",
    ],
    faqs: [
      { q: "Is 162-0 actually possible?", a: "Yes, but rare by design. Even a lineup of all-time greats drops a coin flip night now and then, which is why a perfect run is worth bragging about." },
      { q: "How does daily mode work?", a: "Everyone spins the same wheel under the same theme, one attempt per day, locked until midnight Eastern. Classic and Hard stay unlimited." },
    ],
  },

  '/baseball-career': {
    intro: [
      "One mystery player, six clues, and a score that shrinks every time you peek. Career Path starts you with nothing but a position and dares you to name the player before the easy clues arrive.",
      "The ladder runs from draft info through teams, stats and awards. Diehards nail it in two clues. The rest of us wait for the trophy case.",
    ],
    howToPlay: [
      "Read the opening clue. You always start with the player's position.",
      "Type a guess whenever you have a hunch. Wrong guesses cost nothing, so swing freely.",
      "Stuck? Reveal the next clue: draft details, first team, career teams one at a time, then stats and awards.",
      "Guess correctly to bank the points shown for your current clue level.",
      "Play the daily or switch to Unlimited for random players.",
    ],
    rules: [
      "A correct guess on the opening clue scores 1000 points.",
      "Each of the first five reveals costs 150 points, stepping you down to 250. The sixth and final reveal still leaves 100 on the table.",
      "Wrong guesses are free and unlimited. Only reveals cost points.",
      "Typing just the last name counts as a correct answer.",
      "Hard mode hides the two easiest clues. The daily resets at midnight Eastern.",
    ],
    example: [
      "The position says center field, which narrows nothing. The draft clue shows a 2009 first round pick, then the first team: the Angels. A certain kind of fan types Mike Trout right there and banks 700 points.",
      "The stats clue would have made it obvious anyway, but at 400. That gap is the whole game.",
    ],
    tips: [
      "Draft year plus first team is the killer combo. Most players are solvable right there at 700.",
      "Career teams appear one at a time, and an early journeyman stop is often the best fingerprint.",
      "Never skip the free swing. A wild guess at 1000 costs you nothing.",
    ],
    faqs: [
      { q: "What do the clues reveal, in order?", a: "Position, then draft details, first MLB team, career teams added one by one, career stats, and finally awards." },
      { q: "Does hard mode change the scoring?", a: "No. It only hides the two easiest clue rows, so you are working from the first team onward while the points stay the same." },
      { q: "Is there a new player every day?", a: "Yes. The daily serves everyone the same player and flips at midnight Eastern. Unlimited deals random players all day." },
    ],
  },

  '/mlb-higher-lower': {
    intro: [
      "Two legends side by side, one question: who hit more career home runs? Easy, right up until Frank Robinson is staring at Mark McGwire and the real gap is three homers.",
      "The pool is finished careers only, Ruth through Ortiz, so every number is final. No active stars with totals still moving.",
    ],
    howToPlay: [
      "Each round shows two players with their era and seasons played, but no totals.",
      "Tap the one you think finished with more career home runs.",
      "The real numbers flash, your score updates, and the next pair rolls in.",
      "Survive all 10 rounds, then share your score.",
      "Play Daily for the same 10 pairs as everyone else, or Unlimited for random pairs.",
    ],
    rules: [
      "10 rounds per game and 10 points for every correct answer.",
      "Streaks pay extra: the second straight correct adds 5 bonus points, the third adds 10, and so on. A perfect 10 for 10 scores exactly 325.",
      "Exact ties count as correct no matter which side you pick.",
      "Hard mode builds close-gap pairs and only runs in Unlimited. The daily flips at midnight Eastern.",
    ],
    example: [
      "Round one deals Ken Griffey Jr. against Jim Thome. Feels close. You back Junior and the reveal reads 630 to 612. A few rounds later Babe Ruth lands opposite Sammy Sosa and you cruise, 714 beats 609.",
      "Then it gets mean: Ted Williams against Willie McCovey. Both men finished on exactly 521, so either tap scores. You close at 8 for 10 with the streak bonus padding the total.",
    ],
    tips: [
      "Seasons played matter as much as era. A 22 year career from the 1950s can out-homer a short modern peak.",
      "Learn the tiers. Knowing who cleared 600 and who stalled in the 500s decides the coin flip rounds.",
      "Protect your streak late. The bonus grows with every consecutive answer, so the last rounds are worth the most thought.",
    ],
    faqs: [
      { q: "Why are there no active players?", a: "Career totals only make sense once the career is over, so the pool sticks to finished careers and every total is the real final number." },
      { q: "What is the highest possible score?", a: "325. That is 100 points for going 10 for 10 plus 225 in streak bonuses for never missing." },
      { q: "What happens on an exact tie?", a: "You get credit either way. Ted Williams, Willie McCovey and Frank Thomas all retired on 521 home runs, so it really does come up." },
    ],
  },

  '/mlb-grid': {
    intro: [
      "Nine cells, nine legends. Every cell crosses two categories, and you need a player whose career checks both boxes. Think of it as an MLB team grid tuned for the legends era.",
      "The whole answer pool finished playing by 2019, so this is a history test, not a current-roster quiz.",
    ],
    howToPlay: [
      "Read the row and column labels: franchises like the Yankees or Cardinals, plus career milestones like 2,000 hits.",
      "Tap any empty cell, type a player name, and pick them from the list.",
      "If the career matches both the row and the column, the cell locks in.",
      "Miss and you burn one of your 9 guesses. Correct answers never cost a guess.",
      "Fill all 9 cells before the guesses run out.",
    ],
    rules: [
      "You get 9 wrong guesses for the whole grid, and each player can only be used once.",
      "Milestones are 2,000 or more hits, 300 or more home runs, and 2,000 or more games played.",
      "Franchise history counts across relocations, so a Brooklyn Dodger counts for the Dodgers.",
      "Active stars will not validate, the pool ends at 2019.",
      "Daily gives everyone the same grid and saves your board until midnight Eastern. Unlimited deals random grids in easy, normal or hard.",
    ],
    example: [
      "Your grid crosses a Yankees row with a Red Sox column, and Babe Ruth is the reflex. He works, but a name that big might fit other cells, so you hold him until nothing else fits.",
      "Then Cleveland meets 300 home runs. Jim Thome, lock. The last cell, Twins plus 2,000 games played, eats two guesses before Harmon Killebrew completes the nine.",
    ],
    tips: [
      "Journeymen beat superstars. A well-traveled veteran with 2,500 hits covers strange franchise pairings that one-club icons never will.",
      "With the pool capped at 2019, stars of the 80s, 90s and 2000s are the sweet spot.",
      "Spend famous names only where nothing else works. Each player plays once per grid.",
    ],
    faqs: [
      { q: "Do relocated franchises count?", a: "Yes, franchise identity survives every move. Boston, Milwaukee and Atlanta Braves all count as one franchise." },
      { q: "Why will a current star not validate?", a: "The pool is careers that wrapped by 2019, so you never waste guesses on players whose numbers are still growing." },
      { q: "Is the daily grid harder than unlimited?", a: "The daily always uses the normal mix, one milestone plus five franchises. Unlimited lets you pick easy with two milestones, normal, or hard with franchises only." },
    ],
  },

  '/mlb-connect-4': {
    intro: [
      "Connect 4 with a baseball brain. Every column and row carries a category, and claiming a cell means naming a player who fits both at once.",
      "It is built for two, red against blue on one screen, first to four in a row. Playing both sides solo works fine as practice.",
    ],
    howToPlay: [
      "Red goes first. Pick a column and your piece targets the lowest empty cell, classic Connect 4 gravity.",
      "Name a player who matches both the column heading and the landing row.",
      "A valid answer drops your piece and ends your turn. A miss keeps your turn, so try again.",
      "Out of ideas? Hit skip and hand the turn over.",
      "Four in a row, across, down or diagonal, wins. A full board is a draw.",
    ],
    rules: [
      "The board is 6 rows by 7 columns, and each player name can only be used once per game.",
      "Answers come from any era. Suggestions show retired legends, but you can type any current star and submit.",
      "An AI validator checks every answer. If it cannot verify one, nothing is placed and you just try again, no penalty.",
      "Six themed boards rotate, from October Legends to Cooperstown Row, dealt at random each new game.",
    ],
    example: [
      "On the Cooperstown Row board, blue drops into the MVP Winner column and lands on the Cardinals row: Stan Musial, easy money. Red answers with George Brett where 3,000 hits meets the Royals.",
      "A few turns later blue needs one cell to finish, where Only One MLB Team crosses the Orioles. Cal Ripken Jr. ends it, four in a row.",
    ],
    tips: [
      "Play the board, not the trivia. Blocking three in a row beats showing off a deep cut.",
      "Fight for the center columns, they touch the most winning lines.",
      "Bank your obscure answers. A used name is gone for both teams, so do not spend a rare fit on a throwaway cell.",
    ],
    faqs: [
      { q: "Do I need a second player?", a: "It shines as a pass and play duel on one device, but solo you can control both sides." },
      { q: "What if the checker rejects a right answer?", a: "It says so, places nothing, and lets you retry without losing your turn. Try the full name and submit again." },
      { q: "Can I answer with active players?", a: "Yes, any era counts. The autocomplete only suggests retired legends, so type a current player's full name and press enter." },
    ],
  },

  '/conquest-mlb': {
    intro: [
      "The imperialism format comes to the ballpark. Every territory starts out belonging to its nearest MLB park, and when two clubs meet, the winner takes everything the loser owns.",
      "Two clubs start with nothing. Toronto invades from across the border and San Diego gets boxed out by the California carve-up. One win hands either of them an entire empire.",
    ],
    howToPlay: [
      "Pick your team from all 30 clubs and watch the map carve itself up.",
      "Each round pairs the whole league into games. Before it plays, call your team's game. The card shows each side's win odds.",
      "Play the round. Winners annex everything the losers held, and the map redraws in one swing.",
      "Survive 14 rounds. The top 8 empires by territory make the playoffs, record breaking ties.",
      "Win the Division Round, the Pennant Round and the Imperial World Series to rule the map.",
    ],
    rules: [
      "14 regular rounds, then an 8 team knockout bracket.",
      "Scoring: 25 points per correct call, 3 per territory held at the end, 200 for the crown, 50 for making the playoffs.",
      "Wiped-out teams keep playing, and one win takes back a whole empire.",
      "Extra-inning games are decided by a single run, and there are no ties, ever.",
      "The Daily Challenge deals every player the same date-seeded season: same starting map, same fixtures, same results. One scored run per day with streaks. Free Play is unlimited and fully random.",
    ],
    example: [
      "You ride the Blue Jays, landless at first pitch. Round 1 pairs Toronto with a fat empire, you call the upset, and it hits: the Jays annex the whole thing.",
      "By round 9 you hold a chunk of the continent, then lose every acre to a one-run heartbreaker in extras. You claw back in round 12, sneak into the eighth seed, and October gets interesting.",
    ],
    tips: [
      "Call games with the odds, not your heart. The percentages come from real team ratings.",
      "Do not panic when you get wiped. Landless is one good night from owning a coastline.",
      "Check standings late. Seeding goes by territories, so the last rounds are about protecting your count.",
    ],
    faqs: [
      {
        q: "How does the Daily Challenge work?",
        a: "Everyone on the planet gets the same season today: identical starting map, identical fixtures, identical results. Your score comes from which empire you back and how well you call the games, so comparing scores is a fair fight. One scored run per day, streaks build if you show up daily, and a fresh map drops at midnight Eastern. Free Play stays unlimited.",
      },
      { q: "Why do the Blue Jays and Padres start with no land?", a: "The map splits by nearest park. Toronto sits outside the border and San Diego loses the California split, so both open as invaders." },
      { q: "Can the season end early?", a: "Yes. If any club annexes the entire map before round 14, total conquest crowns them immediately." },
      { q: "How do the playoffs work?", a: "The top 8 empires seed a knockout: Division Round, Pennant Round, then the Imperial World Series. Territories decide seeding, record breaks ties." },
    ],
  },

  '/mlb-my-career': {
    intro: [
      "Draft day, age 21, one made-up prospect: you. My Career drops a fictional player into the real 30 team league to live every season from draft hype to farewell tour.",
      "Your archetype shapes the ride. A Flamethrower touches triple digits while his elbow prays nightly. A Crafty Lefty ages forever. A Masher is 45 homers or bust.",
      "You build your player's actual face before the draft, and there is a dirty side waiting whenever you want it. A camera in center field and a trash can behind the dugout, something on the glove that adds 300 rpm, a clinic in Florida that ships in unmarked boxes, tipping pitches to a man who likes first innings. Every dirty choice raises a hidden commissioner meter, and this is the sport that hands out lifetime bans."
    ],
    howToPlay: [
      "Create your player: name, one of 11 positions (SP, RP, C, 1B, 2B, 3B, SS, LF, CF, RF, DH), and one of 33 archetypes, from Flamethrower to The Framer to Pure Masher.",
      "Pick your league: today's MLB, or the 2004 throwback with the Expos in Montreal, the Anaheim Angels, the Florida Marlins and the Devil Rays.",
      "Build your look, then spend the money in 7 aisles including a shady one that only appears once you have something to hide.",
      "Enter the draft, land on a real club, and play seasons for full stat lines: average, homers and RBI, or wins, ERA and strikeouts.",
      "Check the lineup card. Top ten picks play from Opening Day; everyone else fights the veteran in spring, with bench bats and long-relief arms waiting on spot starts until the job flips. Relievers climb their own bullpen ladder instead.",
      "Handle the offseason event: winter training, surgery calls, trade rumors.",
      "When team control ends, hit the open market for real: competing offers from named clubs with their own money, length and roster quality, and one push for more on any of them.",
      "Stack awards and rings, fight aging, and retire to a verdict.",
    ],
    rules: [
      "You start at 21 in 2026 with 6 years of team control before free agency. The throwback starts in 2004 instead, inside a sealed 30 team league verified against the real season, with 2004 sized contracts.",
      "Three meters run your life: morale, fanbase and health. Low health means shortened seasons.",
      "The lineup card is real: a bench season is about half the games, a spot starter gets a dozen turns, springs have memory both ways, and signing with a stacked contender can cost a mid player the everyday job.",
      "Players grow toward their potential through age 26 and decline from 32 on, faster after 37.",
      "Retirement hits at 42, after 21 seasons, or when your rating collapses. You can walk away after season 6.",
      "One career at a time, saved automatically in your browser.",
    ],
    example: [
      "You build a Slugging Shortstop who goes 12th overall. Year two brings the breakout, year five a ring. When control ends, the hometown club offers a discount while the market whispers bigger money elsewhere.",
      "You chase the money, the new fanbase starts cold, and the decline grinds. At 38 you retire with 430 homers, a ring and five All-Star nods. Verdict: Hall of Famer.",
    ],
    tips: [
      "Durability wins careers. Steadier archetypes stay on the field while flashy builds collect injury notes.",
      "Spend winter training on your ceiling while young. From 32 it quietly turns into maintenance, so bank gains early.",
      "Pitchers, take the elbow surgery. Playing through a bad MRI turns every start into a gamble.",
    ],
    faqs: [
      { q: "What decides the legacy verdict?", a: "One score from rings, MVPs or Cy Youngs, All-Star nods, seasons and stats. Reach 500 and Cooperstown calls. At 900 you are inner circle, first ballot." },
      { q: "Can I change teams?", a: "Yes. Low morale can trigger trade rumors where you ask out, and when the contract expires you get a real market: named clubs bidding with their own money, years and roster quality, plus your own club's re-sign number. You can push any offer for more once, and your own club never walks away." },
      { q: "Is the player real?", a: "No, the prospect is fictional on purpose. The 30 teams are real, the career is yours." },
      { q: "Why am I on the bench?", a: "Because the veteran is better, for now. Late picks usually open as bench bats or long-relief arms behind an incumbent whose level tracks the roster. Grow your rating and you take the job in spring. Relievers never sit; the bullpen ladder is about whether you become the closer, which is your archetype's fight." },
      { q: "Can I start in a different era?", a: "Yes. The create screen has a 2004 throwback: the league in the Expos' last Montreal summer, with the Anaheim Angels, the Florida Marlins, the Tampa Bay Devil Rays and the Oakland Athletics. An era career never meets a franchise identity that did not exist then." },
    ],
  },

  '/mlb-front-office': {
    intro: [
      "Running a front office sounds fun until the payroll page loads. This is a full GM sim of the real 30 team league, every player rated off real 2025 stats.",
      "The problems are real: a tax line that will not move, aging veterans, scouts who lie, and 29 rivals that never stop churning.",
    ],
    howToPlay: [
      "Choose a franchise and inherit its actual lineup, rotation and bullpen.",
      "Read the ownership mandate: a stacked roster is told to win the World Series, a mid one to make October, a thin one to hit an honest win number. It resets every offseason.",
      "Work the roster: DFA dead weight, sign free agents, and pitch trades with a pick sweetener when needed.",
      "Play the 162 in stretches: each round simulates about a week and a half of baseball, 27 rounds total, with a live read on whether you are on pace.",
      "Make October. Division winners seed 1 to 3, three wild cards follow, and the top two seeds skip the Wild Card round.",
    ],
    rules: [
      "The tax line starts at 244 million, matching the real 2026 threshold, and it is a hard cap, rising 3 percent a season.",
      "Playoffs use the real format: best-of-3 Wild Card, best-of-5 Division Series, best-of-7 LCS and World Series.",
      "Trades weigh rating, age and position, with premiums on aces, shortstops and catchers.",
      "You hold 2 picks a year, and scout grades carry error. True ratings show only after you pick.",
      "Injuries cost one to four rounds on the IL, and your franchise saves automatically.",
      "Trust upstairs runs 0 to 100: beat the mandate and it climbs, miss it and it falls, a ring fixes almost anything, and at zero you are fired and the save ends.",
    ],
    example: [
      "You take a club 8 million under the line. A DFA clears a bloated deal, the savings sign a 79 rated reliever, and your aging ace becomes a 26 year old shortstop.",
      "You win the division, take the bye, and still lose the LCS in six. Next spring your 84 grade pick arrives as an 80. Scouts, man.",
    ],
    tips: [
      "Payroll room is a roster spot. One dumped albatross often buys two useful arms.",
      "Age drives value. A decent 24 year old can outpull a 33 year old star, so sell veterans early.",
      "The sim weighs your lineup most, then rotation, then bullpen. Spend in that order.",
      "October is a variance machine, so build for repeat trips, not one all-in year.",
    ],
    faqs: [
      { q: "Are the contracts real?", a: "Rosters and ratings come from real data, but every salary, contract and transaction in the sim is fictional." },
      { q: "Can I go over the tax line?", a: "No. Moves that break the line do not go through. That squeeze is most of the job." },
      { q: "Why did my trade get rejected?", a: "The AI wants a premium on rating, age and position. Add one of your 2 picks, or offer someone younger." },
      { q: "Can I get fired?", a: "Yes. Ownership grades the mandate every season and tracks trust from 0 to 100. A 70 win season on a win-the-World-Series payroll costs real trust, and at zero the save ends and you take another job." },
    ],
  },

  '/missing-nine': {
    intro: [
      "A real World Series starting nine sits in front of you, in batting order, one name blanked out. You know this game, you watched it or grew up hearing about it. So who actually started?",
      "That word, actually, is the trap. Memory promotes the heroes and forgets the starters, and the most famous moment of the night often came off the bench.",
    ],
    howToPlay: [
      "Read the card: the series, the year, the final score, the venue and the team.",
      "Study the order. The blank shows its spot in the lineup and its fielding position.",
      "Type the missing starter. Full name or just the surname both count.",
      "Your first two misses each unlock a hint: the player's nationality, then the first letter of the surname.",
      "Solve it or run dry, then come back tomorrow for a new lineup.",
    ],
    rules: [
      "First guess scores 100 points, second 70, third 40. Giving up scores zero.",
      "3 guesses per lineup, no more.",
      "Every lineup is a real World Series starting nine verified against the box score, and the reveal includes a verified fact about the player.",
      "Hard mode hides hints, name suggestions and fielding positions until the reveal.",
      "The daily gives everyone the same blank and resets at midnight Eastern. Unlimited deals random lineups.",
    ],
    example: [
      "Picture the 1988 Game 1 Dodgers card. The blank sits third, left field, and every bone in you wants Kirk Gibson. That is the trap: Gibson never started that night, his walk-off homer came as a pinch hitter.",
      "The real answer is Mickey Hatcher, who homered in the first inning and got erased by history anyway. Landing that on the first guess is a 100 point flex.",
    ],
    tips: [
      "Think about who the manager trusted for nine innings, not who made the highlight reel.",
      "In National League park games with no DH, a blank in the nine-hole is usually the starting pitcher.",
      "Use the position hard. A blank at catcher narrows a whole roster to two names fast.",
    ],
    faqs: [
      { q: "Are these lineups accurate?", a: "Yes. Every batting order was checked against the official box score for that exact game, traps included." },
      { q: "Which games are in the pool?", a: "Famous World Series nights from both dugouts, including 1986 Game 6, 1988 Game 1, 2001 Game 7, 2013 Game 6 and 2016 Game 7." },
      { q: "Does the last name alone count?", a: "Yes. Just the surname works, no sweating full spellings." },
    ],
  },

  '/baseball-connections': {
    intro: [
      "Twenty players, four hidden groups, one wall of trouble. Connections hands you a grid of names and asks what secretly ties them together: a franchise, an award, a country.",
      "The twist is size. Groups run five deep instead of four, which means more cover for the traps and a better feeling when one locks in.",
    ],
    howToPlay: [
      "Scan all 20 names and hunt for a theme you trust.",
      "Tap exactly 5 players to select them, then hit submit.",
      "A correct five locks in with its theme and color. A wrong five costs a life.",
      "Colors grade the difficulty: yellow is the gentle one, then green, blue, and purple for the group built to hurt.",
      "Find all four groups before your 4 lives run out.",
    ],
    rules: [
      "Each puzzle holds exactly 4 groups of 5, and every player belongs to exactly one group.",
      "You get 4 lives, and only a wrong submission costs one.",
      "Run out of lives and the remaining groups reveal themselves.",
      "The daily puzzle is the same for everyone and flips at midnight Eastern. Unlimited deals random puzzles from the pool.",
    ],
    example: [
      "You spot five obvious Yankees and nearly submit, then notice one of them also fits a cluster of 500 homer guys. That overlap is the whole puzzle. So you chase the safest read first, and it locks in yellow.",
      "A life dies on the Yankees trap later, but the miss exposes the decoy. You work the leftovers backward and purple falls last, two lives to spare.",
    ],
    tips: [
      "Never submit the first theme you see. These puzzles are built so a name or two straddles two believable groups.",
      "Work from the leftovers. When three themes feel tangled, find the five that fit nowhere else and clear them first.",
      "Selecting and deselecting is free. Shuffle names between candidate groups until only one arrangement makes sense.",
    ],
    faqs: [
      { q: "Why five per group instead of four?", a: "This version scales the format up to 20 players in four groups of 5. Bigger groups leave more room for overlap bait." },
      { q: "What do the colors mean?", a: "Difficulty. Yellow is the easiest connection, green and blue sit in the middle, and purple is the sneakiest, usually hiding behind a decoy theme." },
      { q: "What happens when I run out of lives?", a: "The unsolved groups reveal themselves so you can see what you missed, and the daily locks until a new puzzle arrives the next day." },
    ],
  },
};
