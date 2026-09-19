import type { GameContentMap } from './types';

// Baseball game guides. Casual human tone, no em dashes anywhere.
export const BASEBALL_CONTENT: GameContentMap = {
  '/perfect-season-mlb': {
    intro: [
      "The wheel spins across a century of baseball and stops on a real team season, maybe the 1927 Yankees, maybe a club nobody remembers. You draft one player, then spin again.",
      "Eleven picks later you own a lineup stitched from every era, and the sim makes you sweat all 162 games. Going 158-4 hurts more than going 120-42. That is the point.",
    ],
    headings: {
      howToPlay: "How to play 162-0 MLB Perfect Season, a free baseball draft simulation",
      rules: "162-0 MLB Perfect Season rules: rerolls, modes and lineup slots",
      example: "162-0 MLB Perfect Season walkthrough: an all era dream lineup",
      tips: "162-0 MLB Perfect Season tips for rerolls, the DH slot and Hard mode",
      faq: "162-0 MLB Perfect Season FAQ: perfect runs and daily mode",
    },
    howToPlaySections: [
      {
        heading: "Spinning the wheel for a real team season",
        items: [
          "Spin the wheel. It stops on a real team season from 1901 onward.",
        ],
      },
      {
        heading: "Drafting one player into an open lineup slot",
        items: [
          "Draft one player into an open slot. Ratings run 40 to 99, built from real stats that year.",
        ],
        subsections: [
          {
            heading: "Filling all eleven lineup slots",
            items: [
              "Repeat until all 11 slots are filled: eight fielders, a DH, a starting pitcher and a relief ace.",
            ],
          },
        ],
      },
      {
        heading: "Using a reroll when a spin misses",
        items: [
          "Hate a spin? Use a reroll, you get 2 per run.",
        ],
      },
      {
        heading: "Watching the season simulate game by game",
        items: [
          "When the lineup is full, the season simulates win by win. Skip ahead any time.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Eleven slots, one draft, no repeat names",
        items: [
          "11 lineup slots, one draft per spin, no player name used twice.",
        ],
      },
      {
        heading: "Two rerolls and the full season length",
        items: [
          "2 rerolls per run, and every season is a full 162 games.",
        ],
      },
      {
        heading: "Classic, Hard and Daily modes explained",
        items: [
          "Three modes: Classic shows ratings, Hard hides them until the season ends, Daily gives everyone the same wheel and one attempt per day.",
        ],
        subsections: [
          {
            heading: "The daily's theme and its midnight reset",
            items: [
              "The daily has a theme limiting which team seasons the wheel can hit, and it resets at midnight Eastern.",
            ],
          },
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Drafting Lou Gehrig, Bob Gibson and Ken Griffey Jr.",
        paragraphs: [
          "Your first spin lands on the 1927 Yankees, so Lou Gehrig locks in at first base. Later stops bring Bob Gibson off the 1968 Cardinals, then Ken Griffey Jr. from the 1997 Mariners for center field.",
        ],
      },
      {
        heading: "58 straight wins before two August losses",
        paragraphs: [
          "The finished squad rates 93 overall. You start 58-0 and plan the parade. Then two losses land in the same August week and the board reads 157-5. A juggernaut, not a legend.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Saving rerolls for the endgame",
        items: [
          "Save rerolls for the endgame. Early spins always offer someone useful, but one stubborn open slot late can strand you.",
        ],
      },
      {
        heading: "Filling the DH slot last",
        items: [
          "Fill DH last. Any qualified bat is eligible there, the perfect parking spot for a monster whose position is taken.",
        ],
      },
      {
        heading: "Reading stat lines in Hard mode",
        items: [
          "In Hard mode, read the stat lines. A tiny ERA or a 40 homer season says plenty while ratings are hidden.",
        ],
      },
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
    headings: {
      howToPlay: "How to play MLB Career Path, a free guess the baseball player game",
      rules: "MLB Career Path rules for clues, points and hard mode",
      example: "MLB Career Path walkthrough: naming Mike Trout from the draft clue",
      tips: "MLB Career Path tips for draft year, teams and free guesses",
      faq: "MLB Career Path FAQ: clue order, hard mode and daily play",
    },
    howToPlaySections: [
      {
        heading: "Reading the opening position clue",
        items: [
          "Read the opening clue. You always start with the player's position.",
        ],
      },
      {
        heading: "Typing a free guess at any time",
        items: [
          "Type a guess whenever you have a hunch. Wrong guesses cost nothing, so swing freely.",
        ],
      },
      {
        heading: "Revealing clues from draft details to awards",
        items: [
          "Stuck? Reveal the next clue: draft details, first team, career teams one at a time, then stats and awards.",
        ],
        subsections: [
          {
            heading: "Banking points at your current clue level",
            items: [
              "Guess correctly to bank the points shown for your current clue level.",
            ],
          },
        ],
      },
      {
        heading: "Choosing Daily or Unlimited mode",
        items: [
          "Play the daily or switch to Unlimited for random players.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Scoring 1000 on the opening clue",
        items: [
          "A correct guess on the opening clue scores 1000 points.",
        ],
      },
      {
        heading: "What each reveal costs you",
        items: [
          "Each of the first five reveals costs 150 points, stepping you down to 250. The sixth and final reveal still leaves 100 on the table.",
        ],
        subsections: [
          {
            heading: "Wrong guesses staying free and unlimited",
            items: [
              "Wrong guesses are free and unlimited. Only reveals cost points.",
            ],
          },
        ],
      },
      {
        heading: "Last names counting as a correct answer",
        items: [
          "Typing just the last name counts as a correct answer.",
        ],
      },
      {
        heading: "Hard mode and the midnight reset",
        items: [
          "Hard mode hides the two easiest clues. The daily resets at midnight Eastern.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Naming Mike Trout off the draft clue",
        paragraphs: [
          "The position says center field, which narrows nothing. The draft clue shows a 2009 first round pick, then the first team: the Angels. A certain kind of fan types Mike Trout right there and banks 700 points.",
        ],
      },
      {
        heading: "Seeing the stats clue worth far less",
        paragraphs: [
          "The stats clue would have made it obvious anyway, but at 400. That gap is the whole game.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Draft year plus first team as the killer combo",
        items: [
          "Draft year plus first team is the killer combo. Most players are solvable right there at 700.",
        ],
      },
      {
        heading: "Reading an early journeyman stop as a fingerprint",
        items: [
          "Career teams appear one at a time, and an early journeyman stop is often the best fingerprint.",
        ],
      },
      {
        heading: "Never skipping the free swing",
        items: [
          "Never skip the free swing. A wild guess at 1000 costs you nothing.",
        ],
      },
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
    headings: {
      howToPlay: "How to play MLB Higher or Lower, a free daily home run trivia game",
      rules: "MLB Higher or Lower rules for rounds, streaks and ties",
      example: "MLB Higher or Lower walkthrough: Griffey, Ruth and an exact tie",
      tips: "MLB Higher or Lower tips for eras, tiers and streaks",
      faq: "MLB Higher or Lower FAQ: the player pool, scoring and ties",
    },
    howToPlaySections: [
      {
        heading: "Reading two players with no totals shown",
        items: [
          "Each round shows two players with their era and seasons played, but no totals.",
        ],
      },
      {
        heading: "Tapping the player with more home runs",
        items: [
          "Tap the one you think finished with more career home runs.",
        ],
      },
      {
        heading: "Watching the reveal and the next pair load",
        items: [
          "The real numbers flash, your score updates, and the next pair rolls in.",
        ],
      },
      {
        heading: "Surviving all ten rounds",
        items: [
          "Survive all 10 rounds, then share your score.",
        ],
        subsections: [
          {
            heading: "Choosing Daily or Unlimited pairs",
            items: [
              "Play Daily for the same 10 pairs as everyone else, or Unlimited for random pairs.",
            ],
          },
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Ten rounds worth ten points each",
        items: [
          "10 rounds per game and 10 points for every correct answer.",
        ],
      },
      {
        heading: "Stacking bonus points on a streak",
        items: [
          "Streaks pay extra: the second straight correct adds 5 bonus points, the third adds 10, and so on. A perfect 10 for 10 scores exactly 325.",
        ],
      },
      {
        heading: "Exact ties counting either way",
        items: [
          "Exact ties count as correct no matter which side you pick.",
        ],
      },
      {
        heading: "Hard mode and the midnight flip",
        items: [
          "Hard mode builds close-gap pairs and only runs in Unlimited. The daily flips at midnight Eastern.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Griffey over Thome and Ruth over Sosa",
        paragraphs: [
          "Round one deals Ken Griffey Jr. against Jim Thome. Feels close. You back Junior and the reveal reads 630 to 612. A few rounds later Babe Ruth lands opposite Sammy Sosa and you cruise, 714 beats 609.",
        ],
      },
      {
        heading: "Splitting an exact tie at 521 homers",
        paragraphs: [
          "Then it gets mean: Ted Williams against Willie McCovey. Both men finished on exactly 521, so either tap scores. You close at 8 for 10 with the streak bonus padding the total.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Weighing seasons played against era",
        items: [
          "Seasons played matter as much as era. A 22 year career from the 1950s can out-homer a short modern peak.",
        ],
      },
      {
        heading: "Learning who cleared 600 home runs",
        items: [
          "Learn the tiers. Knowing who cleared 600 and who stalled in the 500s decides the coin flip rounds.",
        ],
      },
      {
        heading: "Protecting your streak in the late rounds",
        items: [
          "Protect your streak late. The bonus grows with every consecutive answer, so the last rounds are worth the most thought.",
        ],
      },
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
    headings: {
      howToPlay: "How to play MLB Franchise Grid, a free daily baseball guessing game",
      rules: "MLB Franchise Grid rules for guesses, milestones and franchises",
      example: "MLB Franchise Grid walkthrough: Babe Ruth and Harmon Killebrew",
      tips: "MLB Franchise Grid tips for journeymen and famous names",
      faq: "MLB Franchise Grid FAQ: franchises, validation and difficulty",
    },
    howToPlaySections: [
      {
        heading: "Reading franchise and milestone labels",
        items: [
          "Read the row and column labels: franchises like the Yankees or Cardinals, plus career milestones like 2,000 hits.",
        ],
      },
      {
        heading: "Tapping a cell and typing a name",
        items: [
          "Tap any empty cell, type a player name, and pick them from the list.",
        ],
        subsections: [
          {
            heading: "Locking in a cell that matches both labels",
            items: [
              "If the career matches both the row and the column, the cell locks in.",
            ],
          },
        ],
      },
      {
        heading: "What a missed guess costs you",
        items: [
          "Miss and you burn one of your 9 guesses. Correct answers never cost a guess.",
        ],
      },
      {
        heading: "Filling all nine cells before guesses run out",
        items: [
          "Fill all 9 cells before the guesses run out.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Nine guesses for the whole grid",
        items: [
          "You get 9 wrong guesses for the whole grid, and each player can only be used once.",
        ],
      },
      {
        heading: "What counts as a milestone",
        items: [
          "Milestones are 2,000 or more hits, 300 or more home runs, and 2,000 or more games played.",
        ],
      },
      {
        heading: "Franchise history across relocations",
        items: [
          "Franchise history counts across relocations, so a Brooklyn Dodger counts for the Dodgers.",
        ],
      },
      {
        heading: "Why active stars will not validate",
        items: [
          "Active stars will not validate, the pool ends at 2019.",
        ],
        subsections: [
          {
            heading: "Daily, easy, normal and hard modes",
            items: [
              "Daily gives everyone the same grid and saves your board until midnight Eastern. Unlimited deals random grids in easy, normal or hard.",
            ],
          },
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Saving Babe Ruth for a harder cell",
        paragraphs: [
          "Your grid crosses a Yankees row with a Red Sox column, and Babe Ruth is the reflex. He works, but a name that big might fit other cells, so you hold him until nothing else fits.",
        ],
      },
      {
        heading: "Locking Jim Thome and Harmon Killebrew",
        paragraphs: [
          "Then Cleveland meets 300 home runs. Jim Thome, lock. The last cell, Twins plus 2,000 games played, eats two guesses before Harmon Killebrew completes the nine.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Why journeymen beat superstars",
        items: [
          "Journeymen beat superstars. A well-traveled veteran with 2,500 hits covers strange franchise pairings that one-club icons never will.",
        ],
      },
      {
        heading: "Targeting stars from the 80s through 2000s",
        items: [
          "With the pool capped at 2019, stars of the 80s, 90s and 2000s are the sweet spot.",
        ],
      },
      {
        heading: "Spending famous names only when needed",
        items: [
          "Spend famous names only where nothing else works. Each player plays once per grid.",
        ],
      },
    ],
    faqs: [
      { q: "Do relocated franchises count?", a: "Yes, franchise identity survives every move. Boston, Milwaukee and Atlanta Braves all count as one franchise." },
      { q: "Why will a current star not validate?", a: "The pool is careers that wrapped by 2019, so you never waste guesses on players whose numbers are still growing." },
      { q: "Is the daily grid harder than unlimited?", a: "The daily always uses the normal mix, one milestone plus five franchises. Unlimited lets you pick easy with two milestones, normal, or hard with franchises only." },
    ],
  },

  '/mlb-gauntlet-draft': {
    intro: [
      "The draft mode, baseball style: eleven picks, one per spot on the lineup card, five real players a pick from a genuine star to a bargain, and you keep exactly one.",
      "Then October begins. Your finished lineup runs five knockout rounds against ever stronger invented opposition, rated 74 up to 97, with extra innings when the game is level.",
      "The run is decided entirely by the lineup you drafted: the same lineup always runs the same postseason, so every pick is the game.",
    ],
    headings: {
      howToPlay: "How to play Gauntlet Draft: MLB, a free daily lineup draft game",
      rules: "Gauntlet Draft: MLB rules for cards, ratings and the knockout",
      example: "Gauntlet Draft: MLB walkthrough: an 89 rated lineup runs October",
      tips: "Gauntlet Draft: MLB tips for pitching cards and the DH spot",
      faq: "Gauntlet Draft: MLB FAQ: daily drafts, opponents and abbreviations",
    },
    howToPlaySections: [
      {
        heading: "Choosing the daily gauntlet or unlimited",
        items: [
          "Pick the daily gauntlet (the same five card choices for everyone today) or unlimited for a fresh draft.",
        ],
      },
      {
        heading: "Reading five cards for each lineup spot",
        items: [
          "For each spot, catcher through closer, read the five cards, star to bargain, and tap the one you keep.",
        ],
        subsections: [
          {
            heading: "Why a catcher can turn up at DH",
            items: [
              "The spots follow real baseball. The corner outfield cards take either corner, center field does not, and the designated hitter card takes any position player at all, so a catcher turning up as your DH is correct rather than a glitch.",
            ],
          },
        ],
      },
      {
        heading: "Watching the postseason start on its own",
        items: [
          "After the eleventh pick the postseason starts on its own: five rounds, one game each, revealed one at a time.",
        ],
      },
      {
        heading: "Scoring points for each round survived",
        items: [
          "Survive a round for 16 points; win the Series for exactly 100.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Real players off real 2026 rosters",
        items: [
          "Every card is a real player off a real 2026 roster, 30 clubs and 13 players each, the same data MLB Front Office plays. Every opponent club is invented on purpose.",
        ],
      },
      {
        heading: "How ratings come from real production",
        items: [
          "Ratings are derived from real production, not opinion: hitters from their 2025 OPS percentile, pitchers from a fielding independent percentile, closers with a save load nudged up a little.",
        ],
      },
      {
        heading: "A star and a bargain in every spot",
        items: [
          "The five cards per spot are spread across the pool's rating range, so a star and a bargain are always both on the table.",
        ],
        subsections: [
          {
            heading: "No player dealt twice in one draft",
            items: [
              "No player is dealt twice in one draft.",
            ],
          },
        ],
      },
      {
        heading: "A deterministic knockout built on the rating gap",
        items: [
          "The knockout is deterministic in your lineup: scoring comes from the rating gap, level games go to extra innings, and replaying the same lineup replays the same October.",
        ],
      },
      {
        heading: "Climbing opposition ratings through October",
        items: [
          "Opposition ratings climb 74, 81, 87, 92, 97. A bargain lineup usually goes out in the first two rounds, an elite one reaches the Series, and even a perfect draft takes the title about one run in four.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Picking the highest rated shortstop card",
        paragraphs: [
          "The shortstop spot deals a 94 next to an 88, an 84, a 79 and a 71. Nothing costs anything, so the 94 is the pick unless you are collecting one club.",
        ],
      },
      {
        heading: "Running an 89 rated lineup through October",
        paragraphs: [
          "Your finished lineup rates 89. The Wild Card is comfortable, the Division Series goes to extra innings, the Championship Series is a shutout win, and the Pennant ends the run. Three rounds survived, 48 points, and the card you would take back is the 71 you shrugged at in right field.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Weighing pitching cards as heavily as bats",
        items: [
          "The pitching cards move the rating as much as the bats do. A 96 starter next to a 70 is the single biggest swing on the card.",
        ],
      },
      {
        heading: "Why the DH spot often hides the best card",
        items: [
          "The designated hitter spot is dealt last and can hand you anybody, so it is often where the best remaining card of the whole draft turns up.",
        ],
      },
      {
        heading: "Watching the running rating as you build",
        items: [
          "Titles need a lineup in the mid nineties. Watch the running rating under the cards as you fill the order.",
        ],
      },
    ],
    faqs: [
      { q: "Is the daily draft the same for everyone?", a: "Yes. One shared set of five card choices per Eastern Time date, so daily scores compare fairly." },
      { q: "Are the opponents real teams?", a: "No, and that is deliberate: every opponent is an invented club, so no real logo or name is borrowed. The players you draft are real, off real 2026 rosters." },
      { q: "Why does the card say LAD instead of the club's full name?", a: "The abbreviation is what the roster data itself carries, and it keeps the page light. Any baseball fan reads it at a glance." },
      { q: "Is this the same game as the soccer Gauntlet Draft?", a: "Same engine, baseball's own roster data, lineup card and postseason ladder. Eleven picks, the same depth as the soccer XI, because a lineup card is nine plus the arms that decide a modern game." },
    ],
  },

  '/mlb-connect-4': {
    intro: [
      "Connect 4 with a baseball brain. Every column and row carries a category, and claiming a cell means naming a player who fits both at once.",
      "It is built for two, red against blue on one screen, first to four in a row. Playing both sides solo works fine as practice.",
    ],
    headings: {
      howToPlay: "How to play MLB Connect 4, a free two player baseball trivia game",
      rules: "MLB Connect 4 rules for the board, answers and rejected calls",
      example: "MLB Connect 4 walkthrough: Cooperstown Row to Cal Ripken Jr.",
      tips: "MLB Connect 4 tips for blocking, columns and obscure names",
      faq: "MLB Connect 4 FAQ: solo play, the checker and active players",
    },
    howToPlaySections: [
      {
        heading: "Picking a column as red goes first",
        items: [
          "Red goes first. Pick a column and your piece targets the lowest empty cell, classic Connect 4 gravity.",
        ],
      },
      {
        heading: "Naming a player who fits both labels",
        items: [
          "Name a player who matches both the column heading and the landing row.",
        ],
        subsections: [
          {
            heading: "What a valid answer or a miss does",
            items: [
              "A valid answer drops your piece and ends your turn. A miss keeps your turn, so try again.",
            ],
          },
        ],
      },
      {
        heading: "Skipping your turn when you are stuck",
        items: [
          "Out of ideas? Hit skip and hand the turn over.",
        ],
      },
      {
        heading: "Winning with four in a row",
        items: [
          "Four in a row, across, down or diagonal, wins. A full board is a draw.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "A six by seven board of unique names",
        items: [
          "The board is 6 rows by 7 columns, and each player name can only be used once per game.",
        ],
      },
      {
        heading: "Answering with any era, active or retired",
        items: [
          "Answers come from any era. Suggestions show retired legends, but you can type any current star and submit.",
        ],
      },
      {
        heading: "What happens when the checker cannot verify",
        items: [
          "An AI validator checks every answer. If it cannot verify one, nothing is placed and you just try again, no penalty.",
        ],
      },
      {
        heading: "Six themed boards dealt at random",
        items: [
          "Six themed boards rotate, from October Legends to Cooperstown Row, dealt at random each new game.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Stan Musial and George Brett on Cooperstown Row",
        paragraphs: [
          "On the Cooperstown Row board, blue drops into the MVP Winner column and lands on the Cardinals row: Stan Musial, easy money. Red answers with George Brett where 3,000 hits meets the Royals.",
        ],
      },
      {
        heading: "Cal Ripken Jr. wins it at the Orioles cell",
        paragraphs: [
          "A few turns later blue needs one cell to finish, where Only One MLB Team crosses the Orioles. Cal Ripken Jr. ends it, four in a row.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Playing the board over showing off trivia",
        items: [
          "Play the board, not the trivia. Blocking three in a row beats showing off a deep cut.",
        ],
      },
      {
        heading: "Fighting for the center columns",
        items: [
          "Fight for the center columns, they touch the most winning lines.",
        ],
      },
      {
        heading: "Banking obscure answers for later",
        items: [
          "Bank your obscure answers. A used name is gone for both teams, so do not spend a rare fit on a throwaway cell.",
        ],
      },
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
    headings: {
      howToPlay: "How to play MLB Conquest, a free daily territory takeover game",
      rules: "MLB Conquest rules for scoring, empires and extra innings",
      example: "MLB Conquest walkthrough: the Blue Jays claw back to October",
      tips: "MLB Conquest tips for calling games and reading standings",
      faq: "MLB Conquest FAQ: the Daily Challenge, landless teams and playoffs",
    },
    howToPlaySections: [
      {
        heading: "Picking a team from all thirty clubs",
        items: [
          "Pick your team from all 30 clubs and watch the map carve itself up.",
        ],
      },
      {
        heading: "Calling your game before each round plays",
        items: [
          "Each round pairs the whole league into games. Before it plays, call your team's game. The card shows each side's win odds.",
        ],
        subsections: [
          {
            heading: "Watching winners annex the losers' land",
            items: [
              "Play the round. Winners annex everything the losers held, and the map redraws in one swing.",
            ],
          },
        ],
      },
      {
        heading: "Surviving fourteen rounds to reach the playoffs",
        items: [
          "Survive 14 rounds. The top 8 empires by territory make the playoffs, record breaking ties.",
        ],
      },
      {
        heading: "Winning three rounds to rule the map",
        items: [
          "Win the Division Round, the Pennant Round and the Imperial World Series to rule the map.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Fourteen rounds into an eight team bracket",
        items: [
          "14 regular rounds, then an 8 team knockout bracket.",
        ],
      },
      {
        heading: "How points are scored across a season",
        items: [
          "Scoring: 25 points per correct call, 3 per territory held at the end, 200 for the crown, 50 for making the playoffs.",
        ],
      },
      {
        heading: "A landless team can still reclaim it all",
        items: [
          "Wiped-out teams keep playing, and one win takes back a whole empire.",
        ],
      },
      {
        heading: "Extra innings settled by a single run",
        items: [
          "Extra-inning games are decided by a single run, and there are no ties, ever.",
        ],
      },
      {
        heading: "The Daily Challenge and Free Play modes",
        items: [
          "The Daily Challenge deals every player the same date-seeded season: same starting map, same fixtures, same results. One scored run per day with streaks. Free Play is unlimited and fully random.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "The Blue Jays annexing a whole empire",
        paragraphs: [
          "You ride the Blue Jays, landless at first pitch. Round 1 pairs Toronto with a fat empire, you call the upset, and it hits: the Jays annex the whole thing.",
        ],
      },
      {
        heading: "Clawing back into the eighth seed",
        paragraphs: [
          "By round 9 you hold a chunk of the continent, then lose every acre to a one-run heartbreaker in extras. You claw back in round 12, sneak into the eighth seed, and October gets interesting.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Calling games with the odds, not your heart",
        items: [
          "Call games with the odds, not your heart. The percentages come from real team ratings.",
        ],
      },
      {
        heading: "Why landless is one good night away",
        items: [
          "Do not panic when you get wiped. Landless is one good night from owning a coastline.",
        ],
      },
      {
        heading: "Checking standings in the last rounds",
        items: [
          "Check standings late. Seeding goes by territories, so the last rounds are about protecting your count.",
        ],
      },
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
    headings: {
      howToPlay: "How to play MLB My Career, a free baseball career simulation game",
      rules: "MLB My Career rules for aging, money and the press",
      example: "MLB My Career walkthrough: from draft day to a Hall of Famer verdict",
      tips: "MLB My Career tips for durability, training and surgery",
      faq: "MLB My Career FAQ: verdicts, free agency and the Bank",
    },
    howToPlaySections: [
      {
        heading: "Creating your player and picking an archetype",
        items: [
          "Create your player: name, one of 11 positions (SP, RP, C, 1B, 2B, 3B, SS, LF, CF, RF, DH), and one of 33 archetypes, from Flamethrower to The Framer to Pure Masher.",
        ],
      },
      {
        heading: "Choosing today's league or the 2004 throwback",
        items: [
          "Pick your league: today's MLB, or the 2004 throwback with the Expos in Montreal, the Anaheim Angels, the Florida Marlins and the Devil Rays.",
        ],
        subsections: [
          {
            heading: "Building your look and spending in seven aisles",
            items: [
              "Build your look, then spend the money in 7 aisles including a shady one that only appears once you have something to hide.",
            ],
          },
        ],
      },
      {
        heading: "Managing the Bank between seasons",
        items: [
          "Open the Bank between seasons. Savings pays 2.5% a season and never loses, five things you can put money into each have a price that moves every season whether you look or not (a fund, flats back home, two shares and a coin that halves as often as it doubles), the statement keeps your last 12 moves, and the card school in the clubhouse is one sitting a season on odds that are printed before you sit in.",
        ],
        subsections: [
          {
            heading: "Reading the News box and the rival's card",
            items: [
              "Read the News box. The paper writes up every season in your own position's stat, the SocialGram shows followers read off your fanbase with three fan comments under the latest post, and the rival's card keeps the head to head against the player drafted the same year as you.",
            ],
          },
          {
            heading: "Collecting badges in the Trophy Case",
            items: [
              "Collect badges in the Trophy Case: 26 of them, from a first ring and Rookie of the Year to 500 home runs, 3,000 strikeouts and $100M to your name, each lit the moment the facts of your career say so.",
            ],
          },
        ],
      },
      {
        heading: "Entering the draft and playing full seasons",
        items: [
          "Enter the draft, land on a real club, and play seasons for full stat lines: average, homers and RBI, or wins, ERA and strikeouts.",
        ],
        subsections: [
          {
            heading: "Climbing the lineup card from the bench",
            items: [
              "Check the lineup card. Top ten picks play from Opening Day; everyone else fights the veteran in spring, with bench bats and long-relief arms waiting on spot starts until the job flips. Relievers climb their own bullpen ladder instead.",
            ],
          },
          {
            heading: "Handling offseason events",
            items: [
              "Handle the offseason event: winter training, surgery calls, trade rumors.",
            ],
          },
        ],
      },
      {
        heading: "Hitting the open market and closing your career",
        items: [
          "When team control ends, hit the open market for real: competing offers from named clubs with their own money, length and roster quality, and one push for more on any of them.",
          "Stack awards and rings, fight aging, and retire to a verdict.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Starting at 21 with six years of control",
        items: [
          "You start at 21 in 2026 with 6 years of team control before free agency. The throwback starts in 2004 instead, inside a sealed 30 team league verified against the real season, with 2004 sized contracts.",
        ],
      },
      {
        heading: "Tracking morale, fanbase and health",
        items: [
          "Three meters run your life: morale, fanbase and health. Low health means shortened seasons.",
        ],
      },
      {
        heading: "How real playing time gets decided",
        items: [
          "The lineup card is real: a bench season is about half the games, a spot starter gets a dozen turns, springs have memory both ways, and signing with a stacked contender can cost a mid player the everyday job.",
        ],
        subsections: [
          {
            heading: "What the press asks after each season",
            items: [
              "The press reads your actual season: a ring puts you on the podium, missing October badly puts you in the scrum, a bench year brings the role question. Three answers each time, safe, honest or fiery, and fiery gambles your fanbase for real.",
            ],
          },
        ],
      },
      {
        heading: "Growing to your potential, then aging",
        items: [
          "Players grow toward their potential through age 26 and decline from 32 on, faster after 37.",
        ],
        subsections: [
          {
            heading: "Retiring at 42 or walking away at season 6",
            items: [
              "Retirement hits at 42, after 21 seasons, or when your rating collapses. You can walk away after season 6.",
            ],
          },
        ],
      },
      {
        heading: "The Bank's rules on fees, floors and card odds",
        items: [
          "Money has rules of its own. There is a 1% fee on both sides of every trade and a $100k floor in the account that cannot be invested away; a season that leaves you under the floor is covered out of savings first, then by a forced sale of holdings at whatever the price is that day. Cards win 42% of hands and a win pays 1.15x the stake, the most you can stake is $50k or 4% of your cash, and once you are $500k down for your career the guys stop dealing you in for good. Keep sitting in while you are losing and somebody at home notices, which costs morale and fanbase.",
        ],
        subsections: [
          {
            heading: "What the fans nag your position for",
            items: [
              "The fans nag you for the thing your position is judged on and never the other way round: a starter hears go deeper into games, a closer hears shut the door, a catcher hears more pop from behind the plate. No arm is ever asked for home runs, no bat is ever asked for an ERA, and the three spots with no speed in them are never asked to run.",
            ],
          },
          {
            heading: "Saving one career automatically",
            items: [
              "One career at a time, saved automatically in your browser.",
            ],
          },
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Drafting a Slugging Shortstop at 12th overall",
        paragraphs: [
          "You build a Slugging Shortstop who goes 12th overall. Year two brings the breakout, year five a ring. When control ends, the hometown club offers a discount while the market whispers bigger money elsewhere.",
        ],
      },
      {
        heading: "Chasing the money to a Hall of Famer verdict",
        paragraphs: [
          "You chase the money, the new fanbase starts cold, and the decline grinds. At 38 you retire with 430 homers, a ring and five All-Star nods. Verdict: Hall of Famer.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Why durability wins careers",
        items: [
          "Durability wins careers. Steadier archetypes stay on the field while flashy builds collect injury notes.",
        ],
      },
      {
        heading: "Spending winter training while you are young",
        items: [
          "Spend winter training on your ceiling while young. From 32 it quietly turns into maintenance, so bank gains early.",
        ],
      },
      {
        heading: "Taking the elbow surgery as a pitcher",
        items: [
          "Pitchers, take the elbow surgery. Playing through a bad MRI turns every start into a gamble.",
        ],
      },
    ],
    faqs: [
      { q: "What decides the legacy verdict?", a: "One score from rings, MVPs or Cy Youngs, All-Star nods, seasons and stats. Reach 500 and Cooperstown calls. At 900 you are inner circle, first ballot." },
      { q: "Can I change teams?", a: "Yes. Low morale can trigger trade rumors where you ask out, and when the contract expires you get a real market: named clubs bidding with their own money, years and roster quality, plus your own club's re-sign number. You can push any offer for more once, and your own club never walks away." },
      { q: "Is the player real?", a: "No, the prospect is fictional on purpose. The 30 teams are real, the career is yours." },
      { q: "Why am I on the bench?", a: "Because the veteran is better, for now. Late picks usually open as bench bats or long-relief arms behind an incumbent whose level tracks the roster. Grow your rating and you take the job in spring. Relievers never sit; the bullpen ladder is about whether you become the closer, which is your archetype's fight." },
      { q: "Can I start in a different era?", a: "Yes. The create screen has a 2004 throwback: the league in the Expos' last Montreal summer, with the Anaheim Angels, the Florida Marlins, the Tampa Bay Devil Rays and the Oakland Athletics. An era career never meets a franchise identity that did not exist then." },
      { q: "What is in the Bank?", a: "Four tabs. Account holds your cash, a savings account that pays 2.5% a season, and a statement of your last 12 moves. Market is five prices that move every season, each with its own risk word and a read on whether it is cheap or dear against what it usually goes for. Cards is the clubhouse card school, one sitting a season, on odds the screen prints before you play. Shop is the 7 aisles. It is the same engine Soccer Career's phone runs on, in dollars." },
      { q: "Who is my rival?", a: "A generated player drafted the same year at your position. He plays his own seasons on the same scale you do, can win a ring before you and retire before you, and the head to head is kept for good. He is fictional, like your own player, so no real player's career is being simulated." },
      { q: "How do I earn badges?", a: "By doing the thing. Each of the 26 badges is a test on the facts of your career, checked every time you open the case: a ring, an MVP or a Cy Young, 500 home runs, 300 wins, a million dollars to your name. The single season badges sit under the real records because the sim's own ceilings do: 50 home runs against the record 73, a .330 average when nobody has hit .400 since Ted Williams' .406 in 1941, and 50 stolen bases against the record 130. The strikeout badge is the real 3,000 club, and the career record there is Nolan Ryan's 5,714." },
    ],
  },

  '/mlb-front-office': {
    intro: [
      "Running a front office sounds fun until the payroll page loads. This is a full GM sim of the real 30 team league, every player rated off real 2025 stats.",
      "The problems are real: a tax line that will not move, aging veterans, scouts who lie, and 29 rivals that never stop churning.",
    ],
    headings: {
      howToPlay: "How to play MLB Front Office, a free MLB general manager simulation",
      rules: "MLB Front Office rules for the tax line, trades and trust",
      example: "MLB Front Office walkthrough: a division title, then a scouting miss",
      tips: "MLB Front Office tips for payroll, age and October depth",
      faq: "MLB Front Office FAQ: contracts, the tax line and trades",
    },
    howToPlaySections: [
      {
        heading: "Inheriting a franchise's lineup and bullpen",
        items: [
          "Choose a franchise and inherit its actual lineup, rotation and bullpen.",
        ],
      },
      {
        heading: "Reading the ownership mandate each offseason",
        items: [
          "Read the ownership mandate: a stacked roster is told to win the World Series, a mid one to make October, a thin one to hit an honest win number. It resets every offseason.",
        ],
        subsections: [
          {
            heading: "Working trades, free agents and DFAs",
            items: [
              "Work the roster: DFA dead weight, sign free agents, and take trades to the phone, where the other GM counters with pick demands and lesser returns instead of a flat yes or no.",
            ],
          },
        ],
      },
      {
        heading: "Playing the season in weekly stretches",
        items: [
          "Play the 162 in stretches: each round simulates about a week and a half of baseball, 27 rounds total, with a live read on whether you are on pace.",
        ],
      },
      {
        heading: "Making October and seeding the bracket",
        items: [
          "Make October. Division winners seed 1 to 3, three wild cards follow, and the top two seeds skip the Wild Card round.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "The tax line and its hard cap",
        items: [
          "The tax line starts at 244 million, matching the real 2026 threshold, and it is a hard cap, rising 3 percent a season.",
        ],
      },
      {
        heading: "How the playoff format is seeded",
        items: [
          "Playoffs use the real format: best-of-3 Wild Card, best-of-5 Division Series, best-of-7 LCS and World Series.",
        ],
      },
      {
        heading: "What trades weigh most",
        items: [
          "Trades weigh rating, age and position, with premiums on aces, shortstops and catchers.",
        ],
        subsections: [
          {
            heading: "Draft picks and scouting error",
            items: [
              "You hold 2 picks a year, and scout grades carry error. True ratings show only after you pick.",
            ],
          },
        ],
      },
      {
        heading: "Injuries and automatic franchise saves",
        items: [
          "Injuries cost one to four rounds on the IL, and your franchise saves automatically.",
        ],
      },
      {
        heading: "Designating a player and the dead money",
        items: [
          "A DFA is not free. Half the man's salary stays on this season's payroll as dead money, a quarter lands on next season's if he had years left, and you cannot sign him back until the offseason.",
        ],
      },
      {
        heading: "Trust upstairs and getting fired",
        items: [
          "Trust upstairs runs 0 to 100: beat the mandate and it climbs, miss it and it falls, a ring fixes almost anything, and at zero you are fired and the save ends.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Trading an aging ace for a young shortstop",
        paragraphs: [
          "You take a club 8 million under the line. A DFA clears a bloated deal, the savings sign a 79 rated reliever, and your aging ace becomes a 26 year old shortstop.",
        ],
      },
      {
        heading: "Winning the division, losing the LCS in six",
        paragraphs: [
          "You win the division, take the bye, and still lose the LCS in six. Next spring your 84 grade pick arrives as an 80. Scouts, man.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Treating payroll room as a roster spot",
        items: [
          "Payroll room is a roster spot. One dumped albatross often buys two useful arms.",
        ],
      },
      {
        heading: "Why age drives value",
        items: [
          "Age drives value. A decent 24 year old can outpull a 33 year old star, so sell veterans early.",
        ],
      },
      {
        heading: "Spending on lineup first, then pitching",
        items: [
          "The sim weighs your lineup most, then rotation, then bullpen. Spend in that order.",
        ],
      },
      {
        heading: "Building for repeat October trips",
        items: [
          "October is a variance machine, so build for repeat trips, not one all-in year.",
        ],
      },
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
    headings: {
      howToPlay: "How to play Missing Nine, a free daily World Series lineup game",
      rules: "Missing Nine rules for guesses, scoring and hard mode",
      example: "Missing Nine walkthrough: Kirk Gibson's card and Mickey Hatcher's answer",
      tips: "Missing Nine tips for reading lineups and positions",
      faq: "Missing Nine FAQ: verified lineups, games and last names",
    },
    howToPlaySections: [
      {
        heading: "Reading the series, score and venue card",
        items: [
          "Read the card: the series, the year, the final score, the venue and the team.",
        ],
      },
      {
        heading: "Studying the blank's spot and position",
        items: [
          "Study the order. The blank shows its spot in the lineup and its fielding position.",
        ],
      },
      {
        heading: "Typing the missing starter's name",
        items: [
          "Type the missing starter. Full name or just the surname both count.",
        ],
        subsections: [
          {
            heading: "Unlocking hints after two misses",
            items: [
              "Your first two misses each unlock a hint: the player's nationality, then the first letter of the surname.",
            ],
          },
        ],
      },
      {
        heading: "Solving it or waiting for tomorrow",
        items: [
          "Solve it or run dry, then come back tomorrow for a new lineup.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "How points drop with each guess",
        items: [
          "First guess scores 100 points, second 70, third 40. Giving up scores zero.",
        ],
      },
      {
        heading: "Three guesses per lineup",
        items: [
          "3 guesses per lineup, no more.",
        ],
      },
      {
        heading: "Lineups verified against the real box score",
        items: [
          "Every lineup is a real World Series starting nine verified against the box score, and the reveal includes a verified fact about the player.",
        ],
      },
      {
        heading: "Hard mode hiding hints until the reveal",
        items: [
          "Hard mode hides hints, name suggestions and fielding positions until the reveal.",
        ],
        subsections: [
          {
            heading: "Daily and Unlimited lineup modes",
            items: [
              "The daily gives everyone the same blank and resets at midnight Eastern. Unlimited deals random lineups.",
            ],
          },
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Wanting Kirk Gibson on the 1988 Dodgers card",
        paragraphs: [
          "Picture the 1988 Game 1 Dodgers card. The blank sits third, left field, and every bone in you wants Kirk Gibson. That is the trap: Gibson never started that night, his walk-off homer came as a pinch hitter.",
        ],
      },
      {
        heading: "Naming Mickey Hatcher on the first guess",
        paragraphs: [
          "The real answer is Mickey Hatcher, who homered in the first inning and got erased by history anyway. Landing that on the first guess is a 100 point flex.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Trusting who played nine innings, not highlights",
        items: [
          "Think about who the manager trusted for nine innings, not who made the highlight reel.",
        ],
      },
      {
        heading: "Reading the nine spot in a no DH game",
        items: [
          "In National League park games with no DH, a blank in the nine-hole is usually the starting pitcher.",
        ],
      },
      {
        heading: "Using catcher as the sharpest position hint",
        items: [
          "Use the position hard. A blank at catcher narrows a whole roster to two names fast.",
        ],
      },
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
    headings: {
      howToPlay: "How to play MLB Connections, a free daily baseball grouping puzzle",
      rules: "MLB Connections rules for groups, lives and the daily puzzle",
      example: "MLB Connections walkthrough: a Yankees overlap and a purple finish",
      tips: "MLB Connections tips for reading themes and the leftovers",
      faq: "MLB Connections FAQ: group size, colors and running out of lives",
    },
    howToPlaySections: [
      {
        heading: "Scanning twenty names for a theme",
        items: [
          "Scan all 20 names and hunt for a theme you trust.",
        ],
      },
      {
        heading: "Selecting five players and submitting",
        items: [
          "Tap exactly 5 players to select them, then hit submit.",
        ],
        subsections: [
          {
            heading: "What a correct or wrong five does",
            items: [
              "A correct five locks in with its theme and color. A wrong five costs a life.",
            ],
          },
        ],
      },
      {
        heading: "Reading the four difficulty colors",
        items: [
          "Colors grade the difficulty: yellow is the gentle one, then green, blue, and purple for the group built to hurt.",
        ],
      },
      {
        heading: "Clearing all four groups before your lives end",
        items: [
          "Find all four groups before your 4 lives run out.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Four groups of five players each",
        items: [
          "Each puzzle holds exactly 4 groups of 5, and every player belongs to exactly one group.",
        ],
      },
      {
        heading: "Four lives, spent only on wrong guesses",
        items: [
          "You get 4 lives, and only a wrong submission costs one.",
        ],
      },
      {
        heading: "What happens when your lives run out",
        items: [
          "Run out of lives and the remaining groups reveal themselves.",
        ],
      },
      {
        heading: "The daily puzzle and Unlimited mode",
        items: [
          "The daily puzzle is the same for everyone and flips at midnight Eastern. Unlimited deals random puzzles from the pool.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Spotting the overlap in the Yankees group",
        paragraphs: [
          "You spot five obvious Yankees and nearly submit, then notice one of them also fits a cluster of 500 homer guys. That overlap is the whole puzzle. So you chase the safest read first, and it locks in yellow.",
        ],
      },
      {
        heading: "Working backward to solve purple last",
        paragraphs: [
          "A life dies on the Yankees trap later, but the miss exposes the decoy. You work the leftovers backward and purple falls last, two lives to spare.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Never submitting the first theme you see",
        items: [
          "Never submit the first theme you see. These puzzles are built so a name or two straddles two believable groups.",
        ],
      },
      {
        heading: "Clearing the leftovers when themes tangle",
        items: [
          "Work from the leftovers. When three themes feel tangled, find the five that fit nowhere else and clear them first.",
        ],
      },
      {
        heading: "Shuffling names for free before submitting",
        items: [
          "Selecting and deselecting is free. Shuffle names between candidate groups until only one arrangement makes sense.",
        ],
      },
    ],
    faqs: [
      { q: "Why five per group instead of four?", a: "This version scales the format up to 20 players in four groups of 5. Bigger groups leave more room for overlap bait." },
      { q: "What do the colors mean?", a: "Difficulty. Yellow is the easiest connection, green and blue sit in the middle, and purple is the sneakiest, usually hiding behind a decoy theme." },
      { q: "What happens when I run out of lives?", a: "The unsolved groups reveal themselves so you can see what you missed, and the daily locks until a new puzzle arrives the next day." },
    ],
  },
};
