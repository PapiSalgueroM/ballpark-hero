import type { GameContentMap } from './types';

// World, Olympic and game-show style guides. Casual human tone, no em dashes anywhere.
export const WORLD_CONTENT: GameContentMap = {
  '/rank-em': {
    intro: [
      "One stat, five players, one shot at the right order. Rank 'Em names a career stat, gives you five greats who sit near the top of it, and asks you to place them most to fewest.",
      "Every round is built from verified career totals in the site's database, with no ties anywhere. The order is the order.",
      "There's a daily ranking everyone shares, plus an unlimited mode.",
    ],
    headings: {
      howToPlay: "How to play Rank 'Em, a free NBA, NHL and MLB stat ranking game",
      rules: "Rank 'Em rules for scoring, the daily round and unlimited mode",
      example: "Rank 'Em walkthrough: ranking five MLB home run kings",
      tips: "Rank 'Em tips for ordering five career stat leaders",
      faq: "Rank 'Em FAQ: stats, sports and scoring",
    },
    howToPlaySections: [
      {
        heading: "Reading the sport and stat in the header",
        items: [
          "Check the header for the sport and the stat, like NBA career assists or MLB career home runs.",
        ],
      },
      {
        heading: "Tapping the five names most to fewest",
        items: [
          "Tap the five names in order, starting with the player you think has the most.",
        ],
      },
      {
        heading: "Undoing your last tap before the fifth pick",
        items: [
          "Changed your mind? Hit Undo last any time before your fifth pick.",
        ],
      },
      {
        heading: "Submitting automatically on your fifth pick",
        items: [
          "Your ranking submits automatically the moment the fifth player lands.",
        ],
      },
      {
        heading: "Seeing the true order and the real numbers",
        items: [
          "The reveal shows the true order with each player's real career number beside it.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "One submission locks in the daily attempt",
        items: [
          "You get exactly 1 submission per round, so the daily is one attempt per day.",
        ],
      },
      {
        heading: "Scoring extra points for a perfect board",
        items: [
          "Scoring is 200 points for each player in the exact right slot, 1,000 for a perfect 5 for 5.",
        ],
      },
      {
        heading: "One daily round shared by everyone",
        items: [
          "The daily round is the same for everyone and flips at midnight Eastern Time.",
        ],
        subsections: [
          {
            heading: "Switching to unlimited for random rounds",
            items: [
              "Unlimited mode deals random rounds from the same NBA, NHL and MLB pool.",
            ],
          },
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Locking Bonds first and Mays fifth",
        paragraphs: [
          "Say the stat is MLB career home runs and the names are Barry Bonds, Hank Aaron, Babe Ruth, Albert Pujols and Willie Mays. Bonds at 762 feels safe on top, and Mays slots fifth at 660.",
        ],
      },
      {
        heading: "Ruth and Aaron flipped in the middle",
        paragraphs: [
          "The middle is the trap. Aaron hit 755, Ruth 714 and Pujols 703, so flipping Ruth above Aaron costs you two slots and leaves you at 3 of 5 for 600 points.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Locking the first and fifth spots first",
        items: [
          "Lock in the two ends first. First and fifth are usually the spots you actually know.",
        ],
      },
      {
        heading: "Valuing a long grinding career",
        items: [
          "Career totals reward longevity. A 20-year grinder often out-counts a shorter, brighter prime.",
        ],
      },
      {
        heading: "Weighing era for three pointers and steals",
        items: [
          "Think era. Stats like three-pointers and stolen bases skew hard toward certain decades.",
        ],
      },
      {
        heading: "Using undo since nothing locks in early",
        items: [
          "Use undo freely. Nothing counts until the fifth tap.",
        ],
      },
    ],
    faqs: [
      {
        q: "Where do the numbers come from?",
        a: "Every ranking uses career totals from the site's stats database, and all five values are always distinct, so there is one clean right order.",
      },
      {
        q: "Which sports show up?",
        a: "The NBA, NHL and MLB, with stats like points, assists, rebounds, blocks, goals, home runs, hits and stolen bases.",
      },
      {
        q: "Is there partial credit?",
        a: "Yes. Each player placed in the exact right position earns 200 points, even if the rest of your board is chaos.",
      },
    ],
  },

  '/teammates': {
    intro: [
      "Two names, one question: did these guys ever wear the same shirt? Teammates or Not flashes a pair of athletes from the NFL, NBA or soccer and you call it, yes or no.",
      "It sounds easy until you hit the pairs whose careers brushed past each other by a season. That one year in a strange uniform is exactly what this game lives on.",
    ],
    headings: {
      howToPlay: "Teammates or Not? Here's how to play this NFL, NBA and soccer game",
      rules: "Teammates or Not? rules for rounds, scoring and difficulty",
      example: "Teammates or Not? walkthrough: Kobe and Shaq, Brady and Manning",
      tips: "Teammates or Not? tips for spotting real career overlaps",
      faq: "Teammates or Not? FAQ: sports covered and question pools",
    },
    howToPlaySections: [
      {
        heading: "Checking the two players and the sport badge",
        items: [
          "Look at the two players and the sport badge above them.",
        ],
      },
      {
        heading: "Deciding if they shared a team ever",
        items: [
          "Decide whether they were ever on the same team at any point in their careers.",
        ],
      },
      {
        heading: "Tapping yes or no to lock it in",
        items: [
          "Tap YES or NO to lock in your answer.",
        ],
      },
      {
        heading: "Reading the fun fact behind the pair",
        items: [
          "Read the fun fact that explains the real story behind the pair.",
        ],
        subsections: [
          {
            heading: "Finishing all ten questions for your score",
            items: [
              "Hit Next Question and keep going until all 10 are done, then see your score.",
            ],
          },
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Ten questions split easy, medium and hard",
        items: [
          "Each round is 10 questions: 3 easy, 3 medium and 4 hard, drawn fresh from a bigger pool.",
        ],
      },
      {
        heading: "Scoring one point per correct call",
        items: [
          "Every correct call is worth 1 point, so a perfect round is 10 out of 10.",
        ],
      },
      {
        heading: "Playing with no clock and a give up button",
        items: [
          "There's no timer, and a give up button ends the round early if you want out.",
        ],
      },
      {
        heading: "Reshuffling a new set with play again",
        items: [
          "Play again reshuffles a brand new set of pairs, as many rounds as you like.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Kobe and Shaq, then Brady and Manning",
        paragraphs: [
          "Imagine the board serves up Kobe Bryant and Shaquille O'Neal. Easy yes, they won three straight titles together on the Lakers. Next comes Tom Brady and Peyton Manning. They defined a rivalry for years but never shared a locker room, so that's a no.",
        ],
      },
      {
        heading: "The sneaky pairs about exact timing",
        paragraphs: [
          "The hard ones are sneakier, the pairs where you have to remember exactly when someone left. Finish 7 of 10 and you're doing better than most.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Checking timelines over team rosters",
        items: [
          "Timelines beat team lists. Two legends at the same club in different decades were never teammates.",
        ],
      },
      {
        heading: "Watching for weird late career moves",
        items: [
          "Remember the weird late-career moves. Stars finishing on random rosters create the best traps.",
        ],
      },
      {
        heading: "Questioning an obvious no before tapping",
        items: [
          "Don't rush the obvious no. If a pair feels impossible, ask yourself why the game picked it.",
        ],
      },
    ],
    faqs: [
      {
        q: "Are the questions the same every round?",
        a: "No. Each round pulls a fresh mix from the question pool, always 3 easy, 3 medium and 4 hard, so replays stay interesting.",
      },
      {
        q: "Which sports are covered?",
        a: "Pairs come from the NFL, the NBA and soccer, and each question shows a sport badge so you know which world you're in.",
      },
      {
        q: "Is this a daily puzzle?",
        a: "No, it's endless. You can play as many 10-question rounds as you want, whenever you want.",
      },
    ],
  },

  '/olympics': {
    intro: [
      "A mystery athlete from the Games is hiding behind a stack of clues, and your job is to name them before the clues run out. The Medal Games starts you with just their sport.",
      "Every clue you reveal makes the answer easier and your score smaller, so the game is a staring contest between confidence and greed.",
      "The pool covers Summer and Winter athletes, sprinters to figure skaters.",
    ],
    headings: {
      howToPlay: "How to play The Medal Games, a free Olympics guessing game",
      rules: "The Medal Games rules for clues, scoring and daily mode",
      example: "The Medal Games walkthrough: swimming clues to Phelps",
      tips: "The Medal Games tips for reading clues before you guess",
      faq: "The Medal Games FAQ: clue order and Winter athletes",
    },
    howToPlaySections: [
      {
        heading: "Starting from the athlete's sport",
        items: [
          "Start with clue one, the athlete's sport, and see if a name jumps out.",
        ],
      },
      {
        heading: "Typing a guess with name suggestions",
        items: [
          "Type a guess any time. Suggestions appear once you've typed a couple of letters, and last names count.",
        ],
      },
      {
        heading: "Revealing country, year, host city and more",
        items: [
          "Stuck? Hit Next Clue to reveal country, then the Games year and host city, achievement, career context, medal haul, and finally the athlete's initials.",
        ],
      },
      {
        heading: "Guessing again for free after a miss",
        items: [
          "Wrong guesses cost nothing, so fire away and guess again.",
        ],
      },
      {
        heading: "Giving up to reveal the athlete",
        items: [
          "Give up if you're done, which reveals the athlete and scores zero.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Seven clue levels paying less each time",
        items: [
          "There are 7 clue levels. Solving on clue 1 scores 1,000, then 850, 700, 550, 400, 250 and 100.",
        ],
      },
      {
        heading: "Only clues cost you points",
        items: [
          "Points only drop when you reveal clues. Wrong guesses are free retries.",
        ],
        subsections: [
          {
            heading: "Giving up ending the run at zero",
            items: [
              "Giving up ends the run at 0 and shows the answer.",
            ],
          },
        ],
      },
      {
        heading: "One daily athlete, unlimited after that",
        items: [
          "The daily athlete is the same for everyone, and unlimited mode deals random athletes forever.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Swimming, USA, then Beijing 2008",
        paragraphs: [
          "Suppose clue one says Swimming. That's a big pool, no pun intended, so you reveal the country: USA. Still wide. Clue three says the 2008 Games in Beijing, and now your brain is screaming one name.",
        ],
      },
      {
        heading: "Typing Phelps for 700 points",
        paragraphs: [
          "You type Phelps, and last names count, so that's the win. Three clues used means 700 points.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Guessing early from sport and country",
        items: [
          "Sport plus country solves half the puzzles for big names, so always take a swing before clue three.",
        ],
      },
      {
        heading: "Dating the athlete's peak from the host city",
        items: [
          "The Games year and host city date the athlete's peak. Work out the era before guessing blind.",
        ],
      },
      {
        heading: "Trying every suspect since guesses are free",
        items: [
          "Because wrong guesses are free, list your suspects and try them all.",
        ],
      },
      {
        heading: "Saving give up for a true dead end",
        items: [
          "Save give up for genuine dead ends. Even clue seven pays 100.",
        ],
      },
    ],
    faqs: [
      {
        q: "Do wrong guesses lower my score?",
        a: "No. Your score only depends on how many clues you've revealed when you finally get it right. Guess as often as you like.",
      },
      {
        q: "Does it include Winter Olympians?",
        a: "Yes. The athlete pool mixes Summer and Winter stars, so expect skiers, skaters and snowboarders alongside the sprinters and swimmers.",
      },
      {
        q: "What's the difference between daily and unlimited?",
        a: "Daily gives everyone the same athlete. Unlimited serves random athletes back to back.",
      },
    ],
  },

  '/guess-the-year': {
    intro: [
      "Six things happened across the sports world, all in the same year, and you have to figure out which year it was. Guess The Year opens with one clue and lets you climb from there.",
      "Each clue is a different sport, so a World Cup memory can rescue you when the hockey clue means nothing. The earlier you nail it, the bigger the score.",
    ],
    headings: {
      howToPlay: "How to play Guess The Year, a free daily sports trivia game",
      rules: "Guess The Year rules for clues, scoring and the answer range",
      example: "Guess The Year walkthrough: McGwire and the 1998 World Cup",
      tips: "Guess The Year tips for narrowing the decade fast",
      faq: "Guess The Year FAQ: clue count and answer range",
    },
    howToPlaySections: [
      {
        heading: "Reading the first sports moment clue",
        items: [
          "Read the first clue describing a famous sports moment.",
        ],
      },
      {
        heading: "Setting the year with single and double arrows",
        items: [
          "Set your year with the arrow buttons. Single arrows move 1 year, doubles jump 10.",
        ],
      },
      {
        heading: "Hitting guess when you're ready",
        items: [
          "Hit the guess button when you're ready to commit.",
        ],
      },
      {
        heading: "Unlocking the next clue on a wrong guess",
        items: [
          "A wrong guess automatically reveals the next clue, so every miss buys more information.",
        ],
      },
      {
        heading: "Revealing a clue early or giving up",
        items: [
          "You can also reveal the next clue voluntarily, or give up to see the answer.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Six clues paying less with every reveal",
        items: [
          "There are 6 clues per puzzle. Solving on clue 1 scores 1,000 points, then 800, 600, 400, 200 and 100.",
        ],
      },
      {
        heading: "Dropping a tier on every wrong guess",
        items: [
          "Every wrong guess reveals the next clue and drops you a scoring tier.",
        ],
        subsections: [
          {
            heading: "Ending the run at zero after six misses",
            items: [
              "The run ends after 6 wrong guesses, or immediately if you give up, both scoring 0.",
            ],
          },
        ],
      },
      {
        heading: "Answers between 1972 and 2026 daily",
        items: [
          "Answers range from 1972 to 2026, and a fresh puzzle arrives every day.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "A home run record and a home World Cup",
        paragraphs: [
          "Picture this: clue one says a first baseman shattered a 37-year-old single-season home run record. You're thinking late 90s, so you guess 1997. Wrong, and clue two reveals the host nation won the World Cup on home soil.",
        ],
      },
      {
        heading: "Landing on 1998 on the second clue",
        paragraphs: [
          "France at home, McGwire chasing Maris. That's 1998, and getting it on the second clue banks 800 points. Miss again and the year would still be gettable, just cheaper.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Triangulating the decade across sports",
        items: [
          "Triangulate across sports. One clue narrows the decade, another pins the exact year.",
        ],
      },
      {
        heading: "Jumping ten years before fine tuning",
        items: [
          "Use the 10-year jump buttons to get in the neighborhood before fine-tuning.",
        ],
      },
      {
        heading: "Reading direction from a near miss guess",
        items: [
          "A near-miss guess isn't wasted. The clue it unlocks usually tells you which direction to move.",
        ],
      },
      {
        heading: "Anchoring on sure World Cup and Olympic years",
        items: [
          "Anchor on world events you're sure of, like World Cups and Olympics, which only land in certain years.",
        ],
      },
    ],
    faqs: [
      {
        q: "Are all six clues really from the same year?",
        a: "Yes. Every clue in a puzzle describes something from that one year, across the NFL, NBA, MLB, NHL, soccer, college sports and more.",
      },
      {
        q: "What years can the answer be?",
        a: "Anywhere from 1972 to 2026. The picker won't let you guess outside that range.",
      },
      {
        q: "Should I guess early or reveal clues first?",
        a: "Guess. A wrong guess reveals the next clue anyway, so a smart early swing costs the same as skipping and might land 1,000.",
      },
    ],
  },

  '/guess-the-nation': {
    intro: [
      "Somewhere on the map is a country with a sporting story, and you're guessing it from the resume alone. Guess The Nation starts with a single vibe word and drips out clues until only one flag fits.",
      "It plays like a detective case: population, medal counts, famous moments, even flag colors. Early solves pay best.",
    ],
    headings: {
      howToPlay: "How to play Guess The Nation, a free countries sports trivia game",
      rules: "Guess The Nation rules for clues, scoring and streaks",
      example: "Guess The Nation walkthrough: sprinting clues to Jamaica",
      tips: "Guess The Nation tips for reading the vibe word",
      faq: "Guess The Nation FAQ: clue order and difficulty modes",
    },
    howToPlaySections: [
      {
        heading: "Picking daily, unlimited or a continent filter",
        items: [
          "Pick a mode: Daily Challenge, Unlimited, Summer or Winter focus, or filter by continent.",
        ],
      },
      {
        heading: "Choosing easy nations or the full hard pool",
        items: [
          "Choose Easy for famous sporting nations or Hard for the full pool.",
        ],
      },
      {
        heading: "Reading the vibe word before you search",
        items: [
          "Read the vibe word, then search and submit a country when you have a hunch.",
        ],
      },
      {
        heading: "Revealing clues from a miss or a hint",
        items: [
          "Each wrong guess reveals the next clue. The hint button reveals one too, if you'd rather not burn a guess.",
        ],
      },
      {
        heading: "Playing until you name it or give up",
        items: [
          "Keep going until you name it, run out of clues, or give up.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Twelve clue slots ending in the name",
        items: [
          "There are 12 clue slots and the final one is the country's name itself, worth 0.",
        ],
      },
      {
        heading: "Paying less with every clue you reveal",
        items: [
          "Scoring starts at 1,200 on clue 1, then 1,100, 1,000, 850, 700, 550, 400, 250, 150, 100, 50 and 0.",
        ],
      },
      {
        heading: "Building a streak with badges as you win",
        items: [
          "Consecutive wins build a streak with badges at 3, 5, 10 and 15 wins. A miss or a give up resets it.",
        ],
        subsections: [
          {
            heading: "Giving up to reveal the answer",
            items: [
              "Give up any time to reveal the answer and score 0.",
            ],
          },
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Sprint, the Caribbean and a track heavy medal count",
        paragraphs: [
          "Say the vibe word is Sprint. Bold guessers type Jamaica immediately for 1,200. You play it safer, revealing the region, the Caribbean, then a medal count won almost entirely on the track.",
        ],
      },
      {
        heading: "Committing to Jamaica on the third clue",
        paragraphs: [
          "You commit to Jamaica on clue 3 for 1,000 points. The famous moment clue would have name-dropped a certain 100m world record in Beijing, but you didn't need it.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Eliminating continents from one sharp word",
        items: [
          "The vibe word is sharper than it looks. One word can eliminate four continents.",
        ],
      },
      {
        heading: "Reading a big winter haul as a tell",
        items: [
          "Medal totals are the biggest tell. A huge winter haul points north fast.",
        ],
      },
      {
        heading: "Narrowing by population and continent",
        items: [
          "Population plus continent narrows brutally. Big country, small medal count is its own clue.",
        ],
      },
      {
        heading: "Saving guesses for real suspects",
        items: [
          "Weak hunch? Use the hint button instead of guessing, and save guesses for real suspects.",
        ],
      },
    ],
    faqs: [
      {
        q: "What do the clues cover?",
        a: "In order: vibe word, region, population, Games attended, total medals, best sport, famous moment, winter history, gold medals, flag colors, country size, then the name itself.",
      },
      {
        q: "What's the difference between Easy and Hard?",
        a: "Easy draws only from well-known sporting nations. Hard opens the entire pool.",
      },
      {
        q: "How do streak badges work?",
        a: "Win back to back to climb from Bronze Medalist at 3 straight to Silver at 5, Gold at 10 and All Time Great at 15. One miss resets you.",
      },
    ],
  },

  '/hof-or-bust': {
    intro: [
      "No name, no face, just a career stat line. Hall of Fame or Bust shows you the anonymized numbers of a real player and asks for a verdict: legend or letdown?",
      "After you vote, the name drops, the verdict lands, and you see how the community called it. Stats can flatter, and this game is built on that.",
    ],
    headings: {
      howToPlay: "Hall of Fame or Bust? Here's how to play this blind stats game",
      rules: "Hall of Fame or Bust? rules for hints, scoring and verdicts",
      example: "Hall of Fame or Bust? walkthrough: 894 goals and a hidden bust",
      tips: "Hall of Fame or Bust? tips for reading a blind stat line",
      faq: "Hall of Fame or Bust? FAQ: verdicts, votes and sports",
    },
    howToPlaySections: [
      {
        heading: "Reading the anonymized career stats",
        items: [
          "Read the anonymized career stats for the mystery player. The sport is shown, the name isn't.",
        ],
      },
      {
        heading: "Revealing up to three hints",
        items: [
          "If you're torn, reveal a hint. There are up to 3 per player.",
        ],
      },
      {
        heading: "Voting once you've made up your mind",
        items: [
          "Vote Hall of Fame or Bust when you've made up your mind.",
        ],
      },
      {
        heading: "Seeing the player, verdict and vote split",
        items: [
          "The reveal shows the player, the official verdict, a fun fact and the community vote split.",
        ],
      },
      {
        heading: "Moving from the daily player to unlimited",
        items: [
          "Finish the daily player, then keep going in unlimited mode.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Losing points for every hint you use",
        items: [
          "A correct vote scores 1,000 points minus 100 for each hint you used. A wrong vote scores 0.",
        ],
        subsections: [
          {
            heading: "Capping hints at three a player",
            items: [
              "You can reveal up to 3 hints per player, each costing 100 points off a win.",
            ],
          },
        ],
      },
      {
        heading: "Three verdicts, with Borderline counting either way",
        items: [
          "Verdicts are Hall of Fame, Bust, or Borderline, and on a Borderline player either vote counts as correct.",
        ],
      },
      {
        heading: "One shared player a day, then unlimited",
        items: [
          "One shared mystery player per day, with unlimited mode serving more after that.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "894 goals and four rings, an easy call",
        paragraphs: [
          "Imagine the card reads: 894 career goals, 4 championship rings, played into his 30s. No hints needed, numbers like that belong to one hockey player ever, and Hall of Fame is a free 1,000 points.",
        ],
      },
      {
        heading: "Big stats, no titles, a correct Bust vote",
        paragraphs: [
          "The next card is murkier: big counting stats, zero titles, one MVP-ish season. You burn two hints, vote Bust, and you're right for 800. The community split says 61 percent agreed.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Weighing trophies over raw totals",
        items: [
          "Trophies and awards separate legends from compilers faster than raw totals.",
        ],
      },
      {
        heading: "Noticing what the stat line leaves out",
        items: [
          "Notice what the stat line leaves out. No titles listed usually means there aren't any.",
        ],
      },
      {
        heading: "Guessing from the numbers before a hint",
        items: [
          "Hints cost 100 each, so guess from the numbers first and spend hints only when stuck.",
        ],
      },
      {
        heading: "Remembering a Bust is about the hype",
        items: [
          "Busts here mean careers that fell short of the hype, and hype is exactly what the stat line hides.",
        ],
      },
    ],
    faqs: [
      {
        q: "What counts as a Bust?",
        a: "The site's verdict measures a career against its expectations. A player can be decent and still be a Bust if the hype said all-time great.",
      },
      {
        q: "Are the community votes real?",
        a: "Yes. Every vote cast on a player is stored, and the percentages you see after voting are the actual tallies.",
      },
      {
        q: "Which sports appear?",
        a: "Soccer, NFL, NBA, baseball and hockey, with the sport badge always visible so you can judge the numbers in context.",
      },
    ],
  },

  '/score-predictor': {
    intro: [
      "You remember who won. But do you remember the score? Score Predictor pulls up a famous match, gives you the teams, the competition, the date and a hint, and asks for the exact final score.",
      "It's a memory test disguised as a prediction game, and the difference between glory and 50 points is usually one goal you forgot about.",
    ],
    headings: {
      howToPlay: "How to play Score Predictor, a free soccer, NFL and NBA trivia game",
      rules: "Score Predictor rules for scoring bands and accuracy",
      example: "Score Predictor walkthrough: Brazil versus Germany, 2014",
      tips: "Score Predictor tips for calibrating by sport",
      faq: "Score Predictor FAQ: sports covered and scoring bands",
    },
    howToPlaySections: [
      {
        heading: "Reading the match card and the hint",
        items: [
          "Read the match card: both teams, the competition, the date and a hint about the drama.",
        ],
      },
      {
        heading: "Typing a predicted score for each team",
        items: [
          "Type your predicted score for each team.",
        ],
      },
      {
        heading: "Locking in one prediction per match",
        items: [
          "Hit Lock In Prediction. One prediction per match, no edits.",
        ],
      },
      {
        heading: "Seeing the real score and a fun fact",
        items: [
          "The real score is revealed with a fun fact about the game.",
        ],
      },
      {
        heading: "Switching from the daily match to unlimited",
        items: [
          "Play the daily match, then switch to unlimited for more.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Scoring the most for an exact score",
        items: [
          "Exact score scores 1,000 points.",
        ],
        subsections: [
          {
            heading: "Staying close scores a shrinking bonus",
            items: [
              "Right result with both team scores within 1 scores 700, within 2 scores 400.",
            ],
          },
        ],
      },
      {
        heading: "Paying least for a wrong result",
        items: [
          "Right result but way off on the numbers scores 200, and the wrong result scores 50.",
        ],
      },
      {
        heading: "One daily match plus an unlimited archive",
        items: [
          "One featured match per day, plus an unlimited mode with the whole archive of soccer, NFL and NBA classics.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Predicting a big Germany win",
        paragraphs: [
          "Suppose the card shows Brazil against Germany, World Cup semifinal, 2014. You remember Germany humiliated the hosts, so you lock in 1-5.",
        ],
      },
      {
        heading: "Landing in the smallest right result tier",
        paragraphs: [
          "The reveal says 1-7. You called the winner and Brazil's goal exactly, but being 2 off on Germany's tally drops you out of the 700 tier and out of the 400 tier too, since both scores need to be close. Right result, 200 points, and a fun fact about the strangest half in World Cup history.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Calibrating goals and points by sport",
        items: [
          "Calibrate by sport. Soccer classics live between 0 and 4 goals, NBA finals scores sit in the 80s to 110s.",
        ],
      },
      {
        heading: "Expecting tight scores in famous upsets",
        items: [
          "Famous upsets are usually tight. Blowouts are famous precisely because they're rare.",
        ],
      },
      {
        heading: "Reading the hint for the shape of the score",
        items: [
          "The hint often nods at the drama, like a comeback or a shootout, which hints at the shape of the score.",
        ],
      },
      {
        heading: "Nailing the winner before the numbers",
        items: [
          "Nail the winner first. That alone is the difference between 200 and 50.",
        ],
      },
    ],
    faqs: [
      {
        q: "Can I change my prediction after locking in?",
        a: "No. One lock-in per match is the whole tension of the game, so make it count.",
      },
      {
        q: "What sports are included?",
        a: "Legendary matches from soccer, the NFL and the NBA, from World Cup finals to Super Bowls to NBA closeouts.",
      },
      {
        q: "How close do I need to be for big points?",
        a: "Exact is 1,000. If you pick the right result, being within 1 goal or point on both teams pays 700, and within 2 pays 400.",
      },
    ],
  },

  '/list-quiz': {
    intro: [
      "Pick a list, empty your brain into the box. Name Them All is the classic recall quiz: every Super Bowl MVP, every F1 world champion, every Masters winner, and you versus the blanks.",
      "There are 28 lists across a dozen sports, from Heisman winners to VFL/AFL and NRL premiers, all built from the site's records database, so the answer key is real history.",
    ],
    headings: {
      howToPlay: "How to play Name Them All, a free sports recall quiz",
      rules: "Name Them All rules for timers, tiers and guessing",
      example: "Name Them All walkthrough: Super Bowl MVPs on the clock",
      tips: "Name Them All tips for beating the clock",
      faq: "Name Them All FAQ: lists, tiers and spelling",
    },
    howToPlaySections: [
      {
        heading: "Choosing a list from the menu",
        items: [
          "Choose a list from the menu, anything from Heisman winners to Stanley Cup champions.",
        ],
      },
      {
        heading: "Picking Relaxed or the timed sprint",
        items: [
          "Pick Relaxed for no clock, or the timed mode for a 3:00 sprint.",
        ],
      },
      {
        heading: "Typing names for a green flash",
        items: [
          "Type names into the box. Correct answers flash green and fill in on the board.",
        ],
      },
      {
        heading: "Reading yellow repeats and red misses",
        items: [
          "Repeats flash yellow, misses flash red, and neither costs you anything.",
        ],
      },
      {
        heading: "Giving up to reveal what's missing",
        items: [
          "Give up any time to reveal what you missed, then retry or grab another list.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Playing with a clock or without one",
        items: [
          "Timed mode gives you exactly 180 seconds. Relaxed mode has no timer at all.",
        ],
      },
      {
        heading: "Typing at least three letters or a surname",
        items: [
          "Guesses need at least 3 letters, and surnames or team nicknames count when they're unique to one answer.",
        ],
      },
      {
        heading: "Earning Gold, Silver and Bronze tiers",
        items: [
          "Finishing 100 percent of a list earns Gold, 80 percent or better earns Silver, and 60 percent or better earns Bronze.",
        ],
        subsections: [
          {
            heading: "Guessing for free with no limit",
            items: [
              "Wrong guesses are free. There's no penalty and no guess limit.",
            ],
          },
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Naming quarterbacks first by surname",
        paragraphs: [
          "Say you open Super Bowl MVPs on the 3:00 clock. You hammer out the quarterbacks first, montana, brady, mahomes, all accepted as surnames, and the board starts filling green.",
        ],
      },
      {
        heading: "Stalling at seventy two percent for Bronze",
        paragraphs: [
          "Around 40 seconds left you stall, dig up a defender or two, then time hits zero at 72 percent. Bronze tier, and the red misses show exactly what to remember for the Silver run.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Dumping the easy names first",
        items: [
          "Dump the easy names first and save the digging for the back half of the clock.",
        ],
      },
      {
        heading: "Typing fast surnames over full names",
        items: [
          "Type surnames. They're faster, and the game only asks for full names when two answers share one.",
        ],
      },
      {
        heading: "Working through the list by decade",
        items: [
          "Work by decade. Walking through the years surfaces names that free recall won't.",
        ],
      },
      {
        heading: "Spelling out a shared surname in full",
        items: [
          "If a name flashes red, try the full version. Shared surnames need spelling out.",
        ],
      },
    ],
    faqs: [
      {
        q: "Does spelling need to be perfect?",
        a: "Accents, punctuation and capitals are all forgiven, so suarez works for Suárez. The letters themselves still need to be right.",
      },
      {
        q: "Is there a daily list?",
        a: "No. All 28 lists are open all the time, and you can retry any of them as often as you like.",
      },
      {
        q: "What are the tiers?",
        a: "Gold means you named the entire list, Silver is 80 percent or more, Bronze is 60 percent or more. Below that you just get encouragement.",
      },
    ],
  },

  '/champ-or-not': {
    intro: [
      "Champ or Not deals ten claims about champions, one at a time, and every single one sounds right. The Bulls in 1994? The Islanders in 1982? Leicester in 2016? Two of those happened. Your job is knowing which.",
      "Every claim is built from real title history across ten competitions: the Super Bowl, the NBA, the World Series, the Stanley Cup, the WNBA, college football and college hoops, the English title, the VFL/AFL flag and the NRL premiership. The fakes are the cruelest kind: a real champion of that competition, dropped into a year they did not win.",
    ],
    headings: {
      howToPlay: "How to play Champ or Not, a free true or false champions game",
      rules: "Champ or Not rules for claims, years and hard mode",
      example: "Champ or Not walkthrough: the 1994 Bulls and the 1982 Islanders",
      tips: "Champ or Not tips for placing an era before you tap",
      faq: "Champ or Not FAQ: leagues covered and split titles",
    },
    howToPlaySections: [
      {
        heading: "Reading the team, title and year",
        items: [
          "Read the claim: a team, a title, a year.",
        ],
      },
      {
        heading: "Tapping CHAMP or NOT",
        items: [
          "Tap CHAMP if it really happened, or NOT if it did not.",
        ],
      },
      {
        heading: "Seeing the real winner on a fake claim",
        items: [
          "The reveal tells you straight away, and if the claim was fake it names the team that really won that year.",
        ],
      },
      {
        heading: "Ten daily claims worth one point each",
        items: [
          "Ten claims per day, one point per correct call, and everyone in the world gets the same ten.",
        ],
      },
      {
        heading: "Toggling Hard mode in unlimited sets",
        items: [
          "Unlimited mode deals fresh sets as long as you want to keep calling, and its Hard toggle makes every fake a team that really won a nearby season.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Every team named is a real champion",
        items: [
          "Every team named is a genuine champion of that competition at some point in history. The lie, when there is one, is only ever the year.",
        ],
      },
      {
        heading: "Tightening fakes to three seasons in Hard mode",
        items: [
          "Hard mode (Unlimited only) tightens the fakes: the wrong team still won for real, within about three seasons of the year on the card.",
        ],
      },
      {
        heading: "Counting a shared college football crown as true",
        items: [
          "Split titles count as true: if two schools share a college football crown, a claim about either one is a real claim.",
        ],
      },
      {
        heading: "One shared daily set that locks in",
        items: [
          "The daily set is the same for everyone and locks in your result for the day once you finish.",
        ],
        subsections: [
          {
            heading: "One tap per claim, no lifelines",
            items: [
              "No hints, no lifelines, no second guesses. One tap per claim.",
            ],
          },
        ],
      },
    ],
    exampleSections: [
      {
        heading: "The 1994 Bulls claim is actually false",
        paragraphs: [
          "The card says: The Chicago Bulls won the 1994 NBA Finals. It smells right, the Bulls won everything in the 90s, but 1994 is the baseball year: Houston won it. You tap NOT and the reveal confirms it, one point.",
        ],
      },
      {
        heading: "The 1982 Islanders mid dynasty claim",
        paragraphs: [
          "Next card: The New York Islanders won the Stanley Cup in 1982. That is the middle of the four in a row, so you tap CHAMP. Another point, eight claims to go.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Placing the era before you tap",
        items: [
          "Work out the era first. Most fakes die the moment you remember who owned that stretch of years.",
        ],
      },
      {
        heading: "Watching for gaps inside a dynasty",
        items: [
          "Dynasty gaps are the trap: the Bulls did not win in 1994 or 1995, and the Lakers missed 1990 to 1999 entirely.",
        ],
      },
      {
        heading: "Learning the correct year from a miss",
        items: [
          "The reveal names the real winner on every fake, so even a wrong call teaches you the year for next time.",
        ],
      },
      {
        heading: "Asking if this exact year is a title year",
        items: [
          "Champions repeat. If you know the team has a pile of titles, the question is only whether THIS year is one of them.",
        ],
      },
    ],
    faqs: [
      {
        q: "Are the wrong answers made up?",
        a: "No. A false claim names a real winner of that same competition, just attached to a year they did not win. Every team you see genuinely lifted that trophy at some point.",
      },
      {
        q: "What about seasons with two champions?",
        a: "College football split its crown a few times, and those years count both schools as true champions. A claim about either one is a real claim, never a trick.",
      },
      {
        q: "Where does the history come from?",
        a: "The same records database behind Name Them All, checked season by season against the official record books before any game was allowed to read it.",
      },
    ],
  },

  '/whod-they-beat': {
    intro: [
      "History has a short memory and it only keeps one name per year. Who'd They Beat? is about the other name: the team that made the final, shook hands, and watched the confetti fall on somebody else.",
      "We give you the champion and the year, across five competitions: the Super Bowl, the NBA Finals, the World Series, the Stanley Cup and the WNBA Finals. You pick who they beat from four options, and every single option is a real beaten finalist from that competition's record books.",
    ],
    headings: {
      howToPlay: "How to play Who'd They Beat?, a free finals trivia game",
      rules: "Who'd They Beat? rules for options and daily scoring",
      example: "Who'd They Beat? walkthrough: the 1994 Rockets and the 1942 Leafs",
      tips: "Who'd They Beat? tips for placing the era and league",
      faq: "Who'd They Beat? FAQ: leagues covered and the data",
    },
    howToPlaySections: [
      {
        heading: "Reading the champion and the year",
        items: [
          "Read the final: a champion and a year.",
        ],
      },
      {
        heading: "Picking the loser from four options",
        items: [
          "Pick which of the four teams lost to them.",
        ],
      },
      {
        heading: "Seeing the answer and the series result",
        items: [
          "The reveal names the answer and the series result straight away.",
        ],
      },
      {
        heading: "Ten daily finals across five leagues",
        items: [
          "Ten finals per day, two from each competition, one point per correct pick.",
        ],
        subsections: [
          {
            heading: "Switching to unlimited after the daily set",
            items: [
              "The daily set is the same for everyone. Unlimited mode keeps dealing.",
            ],
          },
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Every option is a real finals loser",
        items: [
          "Every option is a genuine finals loser from that same competition. No invented teams, ever.",
        ],
      },
      {
        heading: "Mixing in runners up from other years",
        items: [
          "The wrong options are real runners up from other years, which is what makes the near misses cruel: the 1995 Magic show up as an option for the 1994 question.",
        ],
      },
      {
        heading: "One pick per final, no second chances",
        items: [
          "One pick per final, no second chances, and the daily locks your result once you finish.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "The 1994 Rockets against the Knicks",
        paragraphs: [
          'The card asks: "The Houston Rockets won the 1994 NBA Finals. Who did they beat?" You remember the Knicks going to seven, pick New York, and the reveal confirms it, series 4-3.',
        ],
      },
      {
        heading: "The 1942 Maple Leafs comeback final",
        paragraphs: [
          "Next card is hockey: the 1942 Maple Leafs. If you know the only final ever won from three games down, you know Detroit was on the wrong end of it.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Placing the era before the league",
        items: [
          "Work out the era first, then the conference or league. Half the wrong options die on geography.",
        ],
      },
      {
        heading: "Trusting dynasty years as the easy calls",
        items: [
          "Dynasty years are the easy ones: everyone knows who kept losing to the Bulls. The 40s and 50s are where scores are made.",
        ],
      },
      {
        heading: "Picking up who beat whom as you go",
        items: [
          "The reveal teaches the series result too, which quietly makes you better at Champ or Not.",
        ],
      },
      {
        heading: "Choosing the option closest to the exact year",
        items: [
          "The trap options are usually from a year or two away. If two answers feel right, pick the one that fits the exact year.",
        ],
      },
    ],
    faqs: [
      {
        q: "Are the wrong answers made up?",
        a: "No. Every option genuinely lost a final in that competition at some point. The game is picking the right year's runner up, not spotting a fake team.",
      },
      {
        q: "Where does the data come from?",
        a: "The same audited record books behind our Record Books page: every finals loser was verified against independent lists and known history before this game was allowed to ask about it.",
      },
      {
        q: "Why these five competitions?",
        a: "They are the ones where our records carry every beaten finalist, all the way back: 121 World Series, 110 Stanley Cup Finals, 80 NBA Finals, 60 Super Bowls and every WNBA Finals since 1997.",
      },
    ],
  },

  '/silverware-sort': {
    intro: [
      "Every fan can name the most decorated club in their league. Silverware Sort asks the harder question: can you put five of them in order? The gap between knowing the Yankees lead baseball and knowing whether the Dodgers or the Red Sox come next is where this game lives.",
      "Five teams from one competition, a shuffled pile, and a ladder with the most titles at the top. Every count is counted straight out of the same audited record books the rest of the site runs on, across the Super Bowl, the NBA, the World Series, the Stanley Cup, college football and hoops, the English title, the AFL and the NRL.",
    ],
    headings: {
      howToPlay: "How to play Silverware Sort, a free daily sports ranking trivia game",
      rules: "Silverware Sort rules for ties, tries and the reveal",
      example: "Silverware Sort walkthrough: a World Series board and an AFL board",
      tips: "Silverware Sort tips for ranking title counts fast",
      faq: "Silverware Sort FAQ: era names, ties and the WNBA",
    },
    howToPlaySections: [
      {
        heading: "Reading the board's one competition and five teams",
        items: [
          "Read the board: one competition, five teams, one right order.",
        ],
      },
      {
        heading: "Building the ladder from most titles to fewest",
        items: [
          "Tap teams into the ladder, most titles at the top, fewest at the bottom.",
        ],
      },
      {
        heading: "Submitting for a green lock and a second try",
        items: [
          "Submit. Rungs you placed right lock in green, and you get a second try at the rest.",
        ],
      },
      {
        heading: "Scoring one point per rung across three boards",
        items: [
          "One point per correct rung on your final answer, fifteen points across the day's three boards.",
        ],
      },
      {
        heading: "Choosing the daily boards or unlimited mode",
        items: [
          "The daily boards are the same for everyone. Unlimited mode keeps dealing fresh ones.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Never facing a tied board",
        items: [
          "No two teams on a board are ever tied. Every board has exactly one right order, so a miss is a miss on the record, never on a coin flip.",
        ],
        subsections: [
          {
            heading: "Counting titles under the names our Record Books use",
            items: [
              "Counts follow the names as our Record Books and Name Them All write them: South Melbourne's flags and Sydney's flags are separate stacks.",
            ],
          },
        ],
      },
      {
        heading: "Two tries before a board locks in",
        items: [
          "Two tries per board. The first submit locks your greens; the second is final.",
        ],
      },
      {
        heading: "Revealing every team's real count",
        items: [
          "The reveal always shows every team's real count, so you leave each board knowing the actual cabinet.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "A World Series board topped by the Yankees",
        paragraphs: [
          'A World Series board deals the Yankees, the Cardinals, the Dodgers, the Cubs and the Marlins. The top is a gift: 27 Yankees titles, then the Cardinals on 11. The bottom half is the game: Dodgers, then Cubs, then the Marlins with 2.',
        ],
      },
      {
        heading: "An AFL board where three clubs tie on flags",
        paragraphs: [
          "An AFL board will never hand you Essendon, Carlton and Collingwood together: all three sit on 16 flags, and tied teams never share a board. Same reason a Super Bowl board never deals the Steelers next to the Patriots.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Anchoring the top and bottom rungs first",
        items: [
          "Anchor the ends first. The most decorated team and the clear minnow are usually easy; the middle rungs are where points die.",
        ],
      },
      {
        heading: "Watching for era name changes",
        items: [
          "Watch for era names. Eastern Suburbs and the Sydney Roosters are the same club but separate stacks here, and old-name entries usually carry the smaller count.",
        ],
      },
      {
        heading: "Treating a first miss as information",
        items: [
          "A first-try miss is information: your greens lock, so the second try is a smaller puzzle. Count what is left before you tap.",
        ],
      },
      {
        heading: "Reading the Record Books page for practice",
        items: [
          "Reading the Record Books page once a week is basically training camp for this game.",
        ],
      },
    ],
    faqs: [
      {
        q: "What happens if two teams have the same number of titles?",
        a: "They will never appear on the same board. The board builder only picks five teams with strictly different counts, so the right order is always a fact, never a tiebreak we invented.",
      },
      {
        q: "Where do the counts come from?",
        a: "Counted row by row from the same audited champion tables behind our Record Books page, the ones verified season by season against the official record. No count on a board is typed in by hand.",
      },
      {
        q: "Why is the WNBA not in this game?",
        a: "Its history is real but young: there are not yet five different title counts to build an honest board from. The moment there are, it qualifies automatically.",
      },
    ],
  },

  '/hall-of-champions': {
    intro: [
      "Most idle games have you clicking a number until it goes up. This one has you building a museum, and every single thing you hang on the wall actually happened. Acquire Super Bowl I and the plaque tells you which team won it, who they beat and by how much. Acquire the 1985 Bears and it is the 1985 Bears, because the exhibit list is read straight out of our audited record books.",
      "Visitors pay admission every second, admission money buys more history, and more history brings more visitors. Ten wings, hundreds of real champions from the nineteenth century to this year, and the hall keeps earning while your phone is in your pocket.",
    ],
    headings: {
      howToPlay: "How to play Hall of Champions, a free idle sports trivia museum game",
      rules: "Hall of Champions rules for plaques, away time and rededicating",
      example: "Hall of Champions walkthrough: opening and completing the Super Bowl wing",
      tips: "Hall of Champions tips for faster wings and better timing",
      faq: "Hall of Champions FAQ: real championships, away earnings and rededicating",
    },
    howToPlaySections: [
      {
        heading: "Acquiring champions oldest first in each wing",
        items: [
          "Acquire champions one at a time, oldest first in each wing. Each costs more and earns more than the last.",
        ],
      },
      {
        heading: "Opening wings and doubling their income",
        items: [
          "Every ten exhibits in a wing doubles that wing's income.",
          "Open new wings when the money allows, from the Super Bowl through to the NRL and the AFL.",
        ],
      },
      {
        heading: "Tapping the anniversary banner for triple admissions",
        items: [
          "Tap the anniversary banner when it lights up: admissions triple for a few seconds.",
        ],
      },
      {
        heading: "Spending on tours, the network, the shop and the vault",
        items: [
          "Spend on tours, the curator's network, the gift shop and the archive vault to raise everything at once.",
        ],
      },
      {
        heading: "Rededicating for permanent renown stars",
        items: [
          "Rededicate once the hall is big enough to trade every exhibit for permanent renown stars.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Every exhibit coming from checked champion tables",
        items: [
          "Nothing in this museum is invented. Every year, team and result comes from the same checked champion tables our quiz games and Record Books run on.",
        ],
      },
      {
        heading: "Earning while you are away at half speed",
        items: [
          "The hall earns while you are away, at half speed, capped at eight hours. The gift shop raises that rate.",
        ],
      },
      {
        heading: "Plaques from finishing a wing",
        items: [
          "Finishing a wing hangs a plaque worth a permanent income bonus, and a plaque survives every rededication.",
        ],
        subsections: [
          {
            heading: "What a rededication clears and keeps",
            items: [
              "Rededicating clears the exhibits, the funds, the wings and the upgrades. Renown stars and plaques are the only things that carry over, and they carry over forever.",
            ],
          },
        ],
      },
      {
        heading: "Honest prices with no hidden fees",
        items: [
          "The price quoted on a button is the price charged. No hidden fees, no fake discounts.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Opening the Super Bowl wing for ten coins",
        paragraphs: [
          "Your first purchase is the oldest Super Bowl on the books, for ten coins. Ten Super Bowls later that wing pays double, and the money starts arriving fast enough to open the WNBA wing next door.",
        ],
      },
      {
        heading: "A permanent plaque once that wing fills up",
        paragraphs: [
          "Sixty Super Bowls in, the wing is complete and its plaque is permanent: a quarter more admissions across the whole museum, forever, even after you rededicate and start the walls again.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Going wide before going deep, then watching milestones",
        items: [
          "Wide beats deep early. Opening a new wing is usually worth more than the next expensive exhibit in your best one.",
          "Watch the milestone counter on each buy button. Being two exhibits away from doubling a wing is the best money in the game.",
        ],
      },
      {
        heading: "Timing the anniversary tap after a buying run",
        items: [
          "Save the anniversary tap for right after a big acquisition run, when your per second number is at its highest.",
        ],
      },
      {
        heading: "Choosing the gift shop for long time away",
        items: [
          "The gift shop only pays if you actually leave. If you play in long sittings, tours and the network are worth more.",
        ],
      },
      {
        heading: "Waiting for the first rededication",
        items: [
          "Do not rush the first rededication. Stars are paid per twenty exhibits, so one late rededication beats two early ones.",
        ],
      },
    ],
    faqs: [
      {
        q: "Are the championships real?",
        a: "Every one. The exhibit list is fetched from the same audited tables behind our Record Books page, which were checked season by season against the official record. If a season was never played, it is not in the museum either.",
      },
      {
        q: "Does it keep going when I close the tab?",
        a: "Yes, at half speed for up to eight hours, and the gift shop upgrade raises that rate. You get a note on the door when you come back telling you exactly what the hall took while you were out.",
      },
      {
        q: "What is the point of rededicating?",
        a: "Renown. You trade a full museum for permanent stars, one per twenty exhibits, each worth ten percent more admissions for the rest of the save. Completed wings keep their plaques too, so a second run through the same history is far faster than the first.",
      },
      {
        q: "Do I lose progress if I stop playing?",
        a: "No. The save lives on your device and nothing decays. Come back in a month and the hall is exactly as you left it, plus eight hours of admissions.",
      },
    ],
  },

  '/minefield': {
    intro: [
      "The board looks friendly: one category, a wall of names, most of them belong. Some of them are mines. Minefield asks you to click everyone who truly fits while dodging the plausible fakes planted among them.",
      "You know Leicester won the Premier League. You think Newcastle did too. Boom.",
    ],
    headings: {
      howToPlay: "How to play Minefield, a free daily sports trivia clicking game",
      rules: "Minefield rules for lives, points and mine counts",
      example: "Minefield walkthrough: a Premier League board and a wrong click",
      tips: "Minefield tips for banking points and dodging mines",
      faq: "Minefield FAQ: lives, mine counts and the daily board",
    },
    howToPlaySections: [
      {
        heading: "Reading the category and its hint",
        items: [
          "Read the category and its hint, like Premier League champions or the MLB 500 home run club.",
        ],
      },
      {
        heading: "Clicking tiles that belong to the category",
        items: [
          "Click every tile you believe belongs. Correct picks turn green.",
        ],
      },
      {
        heading: "Losing a life on a mine",
        items: [
          "Click a mine and it explodes, costing one of your 2 lives on that board.",
        ],
      },
      {
        heading: "Clearing the board for a bonus",
        items: [
          "Find all the correct tiles to clear the board and bank a bonus.",
        ],
      },
      {
        heading: "Playing three boards and sharing your score",
        items: [
          "Play 3 boards per run, then see your final score and share it.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Two lives per board",
        items: [
          "Each board has 2 lives. Two mine hits end that board, but the run continues to the next one.",
        ],
      },
      {
        heading: "Scoring correct tiles and the clear bonus",
        items: [
          "Every correct tile is worth 10 points, and clearing a full board adds a 30 point bonus.",
        ],
      },
      {
        heading: "How big a board can get",
        items: [
          "Boards hold 12 to 16 tiles, with 4 to 6 mines hidden among them.",
        ],
        subsections: [
          {
            heading: "Daily boards versus unlimited mode",
            items: [
              "The daily run is identical for everyone and flips at midnight Eastern Time. Unlimited deals random boards.",
            ],
          },
        ],
      },
    ],
    exampleSections: [
      {
        heading: "A Premier League board with the easy bankers",
        paragraphs: [
          "Imagine the category is Premier League champions. You click the bankers: Manchester United, Arsenal, Chelsea, Manchester City. Then Blackburn Rovers and Leicester City, both real champions, both green.",
        ],
      },
      {
        heading: "A wrong click on Newcastle United",
        paragraphs: [
          "Feeling smart, you click Newcastle United. Boom, never won the Premier League itself. One life left, and the remaining tiles suddenly look a lot more suspicious.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Banking the certain tiles first",
        items: [
          "Bank the certainties first. Every green is 10 points you keep even if the board later explodes.",
        ],
      },
      {
        heading: "Reading the hint line for era limits",
        items: [
          "Read the hint line, since era limits change everything about who counts.",
        ],
      },
      {
        heading: "Spotting mines among the nearly men",
        items: [
          "Mines are nearly-men: famous finalists, runners-up and almost-dynasties. If a name feels like it should have won, that feeling is the trap.",
        ],
      },
      {
        heading: "Slowing down on your last life",
        items: [
          "Down to one life? Slow down and count the board. The found counter tells you how many real ones remain.",
        ],
      },
    ],
    faqs: [
      {
        q: "What happens when I run out of lives?",
        a: "That board ends and is revealed, but you keep your points and the run moves on. Only that board's 30 point clear bonus is lost.",
      },
      {
        q: "How many mines are on a board?",
        a: "Between 4 and 6, hidden among 12 to 16 tiles. The board shows a running count of how many mines are still out there.",
      },
      {
        q: "Is the daily the same for everyone?",
        a: "Yes, everyone gets the same 3 boards in the same order each day, which makes scores properly comparable.",
      },
    ],
  },

  '/sports-millionaire': {
    intro: [
      "Fifteen questions stand between you and a million pretend dollars. Sports Millionaire is a climb-the-ladder quiz in the classic TV style: each answer raises the stakes, and one wrong step sends you tumbling.",
      "The money is entirely pretend, no prizes and no cash, but the sweat on question 12 is real. Questions are generated from a live database of footballers.",
    ],
    headings: {
      howToPlay: "How to play Sports Millionaire, a free fifteen question money ladder quiz",
      rules: "Sports Millionaire rules for the ladder, havens and lifelines",
      example: "Sports Millionaire walkthrough: a safe haven and a big gamble",
      tips: "Sports Millionaire tips for lifelines, havens and reading the crowd",
      faq: "Sports Millionaire FAQ: real money, questions and lifelines",
    },
    howToPlaySections: [
      {
        heading: "Answering multiple choice questions easiest first",
        items: [
          "Answer multiple-choice questions one at a time, four options each, easiest first.",
        ],
      },
      {
        heading: "Climbing the money ladder with each right answer",
        items: [
          "Each correct answer climbs the money ladder toward the top.",
        ],
      },
      {
        heading: "Using the three lifelines",
        items: [
          "Use your lifelines: 50:50 removes two wrong options, Ask the Crowd shows a poll, Swap Question trades in the current question.",
        ],
      },
      {
        heading: "Walking away with what you have banked",
        items: [
          "Before locking in, you can walk away and keep everything you've banked.",
        ],
      },
      {
        heading: "Dropping back to your last safe haven",
        items: [
          "Answer wrong and you drop to the last safe haven you passed.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "How far the ladder climbs in dollars",
        items: [
          "The ladder runs 15 questions, from $100 up to $1,000,000, all in play money.",
        ],
      },
      {
        heading: "Where the two safe havens sit",
        items: [
          "Questions 5 and 10 are safe havens worth $1,000 and $32,000. A wrong answer drops you to the last haven you cleared, or $0 if you haven't reached one.",
        ],
        subsections: [
          {
            heading: "Using each lifeline once a run",
            items: [
              "Each of the 3 lifelines can be used exactly once per run.",
            ],
          },
        ],
      },
      {
        heading: "Daily ladders versus unlimited ladders",
        items: [
          "The daily ladder is the same 15 questions for everyone. Unlimited builds a fresh random ladder every run.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Clearing the second safe haven with a lifeline",
        paragraphs: [
          "Picture gliding to question 9 on football basics. Question 10 for $32,000 is a shirt-number deep cut, so you burn the 50:50, guess right, and lock the haven.",
        ],
      },
      {
        heading: "Gambling past a safe haven and falling back",
        paragraphs: [
          "At question 11 you gamble for $64,000, miss, and fall back to $32,000. That banked haven is the difference between a war story and a wipeout.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Treating the safe havens as finish lines",
        items: [
          "Treat questions 5 and 10 like finish lines. Clear them, then gamble freely.",
        ],
      },
      {
        heading: "Saving Swap Question for the late rungs",
        items: [
          "Save Swap Question for the late rungs, where every question is brutal.",
        ],
      },
      {
        heading: "Reading the crowd's confidence",
        items: [
          "The crowd is confident on easy questions and shaky on hard ones. Trust a landslide, doubt a coin flip.",
        ],
      },
      {
        heading: "Walking away as a real strategy",
        items: [
          "Walking away is a real strategy. A banked $16,000 beats a proud $1,000.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is any of the money real?",
        a: "No. The dollars are a score with a dollar sign on them. Nothing is wagered, nothing is paid out, it's bragging rights only.",
      },
      {
        q: "Where do the questions come from?",
        a: "They're generated from a live football database: clubs, nationalities, positions, market value comparisons and shirt numbers.",
      },
      {
        q: "What exactly do the lifelines do?",
        a: "50:50 hides two wrong answers, Ask the Crowd shows a simulated audience poll, and Swap Question deals a new question at the same difficulty. One use each per run.",
      },
    ],
  },

  '/quiz-board': {
    intro: [
      "Five categories, five money rows, twenty-five clues, and a scoreboard that goes down as well as up. Sports Quiz Board is the game where the wrong answer doesn't just miss, it costs you the tile's full value.",
      "The dollars are pure scorekeeping, nothing real changes hands. The pain of blowing a $1,000 clue, though, is real.",
    ],
    headings: {
      howToPlay: "How to play Sports Quiz Board, a free daily sports trivia board game",
      rules: "Sports Quiz Board rules for scoring, negatives and answer matching",
      example: "Sports Quiz Board walkthrough: an easy clue and a costly miss",
      tips: "Sports Quiz Board tips for sweeping rows and beating the deep cuts",
      faq: "Sports Quiz Board FAQ: negative scores, saving and answer matching",
    },
    howToPlaySections: [
      {
        heading: "Picking any tile in any order",
        items: [
          "Pick any tile on the board, in any order you like.",
        ],
      },
      {
        heading: "Reading the clue and typing an answer",
        items: [
          "Read the clue and type your answer in the box.",
        ],
      },
      {
        heading: "Scoring right and wrong answers",
        items: [
          "Correct answers add the tile's value to your score. Wrong answers subtract it.",
        ],
      },
      {
        heading: "Deferring a clue for free",
        items: [
          "Not sure? Close the clue and come back later, deferring is free.",
        ],
      },
      {
        heading: "Finishing all the tiles and sharing your grid",
        items: [
          "Answer all 25 tiles to finish the board and share your result grid.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Five categories and their rising tile values",
        items: [
          "The board is 5 categories with clues at $200, $400, $600, $800 and $1,000 each, 25 tiles total.",
        ],
      },
      {
        heading: "Going negative on a wrong answer",
        items: [
          "Wrong answers subtract the full tile value, and your score can go negative.",
        ],
      },
      {
        heading: "The same board for everyone each day",
        items: [
          "Everyone gets the same board each day, and your progress saves so you can finish later.",
        ],
        subsections: [
          {
            heading: "How forgiving the answer matching is",
            items: [
              "Answer matching is forgiving: surnames of 4 or more letters count, and accents and punctuation are ignored.",
            ],
          },
        ],
      },
    ],
    exampleSections: [
      {
        heading: "An easy Ballon d'Or clue in the top row",
        paragraphs: [
          "Say you open a $200 tile in a Ballon d'Or category and it asks for a very recent winner. Easy money. Emboldened, you jump straight to the $1,000 in the same column and meet a winner from decades before you were born.",
        ],
      },
      {
        heading: "A costly miss in the deepest tile",
        paragraphs: [
          "You type a surname, it's wrong, and $1,000 evaporates. The lesson sticks: the big tiles reach way back in time, and they're priced that way for a reason.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Sweeping the cheap rows for a cushion",
        items: [
          "Sweep the $200 and $400 rows first to build a cushion before touching the deep cuts.",
        ],
      },
      {
        heading: "Using the clock free deferral",
        items: [
          "There's no timer. Close a hard clue, let it stew, and circle back.",
        ],
      },
      {
        heading: "Typing surnames instead of full names",
        items: [
          "Type surnames. Full names are only needed when a surname alone is ambiguous.",
        ],
      },
      {
        heading: "Respecting the priciest row",
        items: [
          "Respect the $1,000 row. High value means old and obscure, and a miss stings double.",
        ],
      },
    ],
    faqs: [
      {
        q: "Can my score really go negative?",
        a: "Yes. Every wrong answer subtracts the tile's value, so a reckless board can finish below zero.",
      },
      {
        q: "Do I have to finish in one sitting?",
        a: "No. The day's board and your answers are saved in your browser, so you can leave and pick it up later the same day.",
      },
      {
        q: "How strict is the answer box?",
        a: "Pretty relaxed. Capitals, accents and punctuation don't matter, and a surname works when it's 4 or more letters and points to one answer.",
      },
    ],
  },

  '/ball-iq': {
    intro: [
      "Twelve questions, ramping from layups to half-court heaves, and at the end a number that claims to measure your sports brain. Ball Knowledge IQ is the daily settle-the-argument machine.",
      "The catch is the weighting. The hard questions at the end are worth the most, so a hot start means nothing if you faceplant on the deep cuts.",
    ],
    headings: {
      howToPlay: "How to play Ball Knowledge IQ, a free twelve question sports quiz",
      rules: "Ball Knowledge IQ rules for weighting, ranks and the daily set",
      example: "Ball Knowledge IQ walkthrough: a hot start and a rough finish",
      tips: "Ball Knowledge IQ tips for the back half and eliminating options",
      faq: "Ball Knowledge IQ FAQ: the highest score, weighting and daily play",
    },
    howToPlaySections: [
      {
        heading: "Answering twelve multiple choice questions",
        items: [
          "Answer 12 multiple-choice questions, four options each.",
        ],
      },
      {
        heading: "Grading each pick instantly",
        items: [
          "Each pick is graded instantly, green for right, red for wrong, then move on.",
        ],
      },
      {
        heading: "Escalating from recent to decades old",
        items: [
          "The questions escalate: recent, famous stuff early, decades-old deep cuts late.",
        ],
      },
      {
        heading: "Finishing for an IQ score and rank",
        items: [
          "Finish all 12 to get your IQ score and your rank.",
        ],
      },
      {
        heading: "Sharing your squares to challenge a friend",
        items: [
          "Copy the share squares and challenge someone who claims they know ball.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "The fixed ramp of twelve questions",
        items: [
          "The 12 questions follow a fixed ramp: 3 easy, 3 medium, then pairs at rising weights up to the two hardest at the end.",
        ],
      },
      {
        heading: "Why the hardest questions move your IQ most",
        items: [
          "Your IQ runs from 55 to 160 and is weighted by question value, so the hard ones move it most.",
        ],
        subsections: [
          {
            heading: "The six IQ ranks from casual to certified",
            items: [
              "Ranks: 145 and up is Certified ball knower, 125 is Knows ball, 105 is Solid ball knowledge, 85 is Casual, 70 is Knows of ball, and below that, Does not know ball.",
            ],
          },
        ],
      },
      {
        heading: "The same twelve questions every day",
        items: [
          "Everyone gets the same 12 questions each day, and progress saves for the day.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Cruising through the first nine questions",
        paragraphs: [
          "Imagine you cruise through the first nine, recent champions and famous MVPs, no sweat. Then the last two questions ask about winners from long before your time, and you miss both.",
        ],
      },
      {
        heading: "Missing the two heaviest questions at the end",
        paragraphs: [
          "Ten of twelve sounds elite, but those were the two heaviest questions on the test. You land around 128, Knows ball. The gap to Certified lives in the deep end.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Budgeting your focus for the back half",
        items: [
          "Budget your focus for the back half. The final questions swing your IQ more than the first six combined.",
        ],
      },
      {
        heading: "Eliminating wrong options by detail",
        items: [
          "Wrong options come from the same category and era as the answer, so eliminate by detail, not by vibe.",
        ],
      },
      {
        heading: "Shaking off an early red answer",
        items: [
          "A red early answer changes nothing about the questions ahead, so shake it off.",
        ],
      },
    ],
    faqs: [
      {
        q: "What is the highest possible IQ?",
        a: "160, which needs a perfect 12 for 12. An all-wrong day scores the floor of 55.",
      },
      {
        q: "Why did missing an easy one barely move my score?",
        a: "Scoring is weighted by difficulty. Early questions carry small weights, the final pair the biggest, so the deep cuts decide the number.",
      },
      {
        q: "Is it the same test for everyone?",
        a: "Yes, same 12 questions in the same order for everyone each day, which is exactly what makes the share squares worth arguing over.",
      },
    ],
  },

  '/emoji-guess': {
    intro: [
      "Can you read football in emoji? Emoji Guess serves five riddles a day, each one a player, club, manager or iconic moment told entirely in little pictures.",
      "Some solve themselves at a glance. Others sit there smugly until the hint arrives and you groan out loud. Five puzzles, three guesses each, and a colored grid to prove how you did.",
    ],
    headings: {
      howToPlay: "How to play Emoji Guess, a free daily football emoji trivia game",
      rules: "Emoji Guess rules for scoring, hints and the daily reset",
      example: "Emoji Guess walkthrough: a goat emoji and a cherry emoji",
      tips: "Emoji Guess tips for reading categories and catching puns",
      faq: "Emoji Guess FAQ: accepted answers, scoring and other sports",
    },
    howToPlaySections: [
      {
        heading: "Reading the emoji string and its category",
        items: [
          "Look at the emoji string and the category label above it.",
        ],
      },
      {
        heading: "Typing a forgiving surname answer",
        items: [
          "Type your answer. Surnames are fine and spelling is forgiving on accents.",
        ],
      },
      {
        heading: "Unlocking a hint after a miss",
        items: [
          "Miss once and a written hint appears under the emoji.",
        ],
      },
      {
        heading: "Getting three guesses per puzzle",
        items: [
          "You get 3 guesses per puzzle before the answer is revealed.",
        ],
      },
      {
        heading: "Clearing five puzzles and sharing your grid",
        items: [
          "Clear all 5 puzzles, then share your grid of green, yellow, orange and red squares.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Five puzzles at rising difficulty",
        items: [
          "Each day serves 5 puzzles: 2 easy, 2 medium and 1 hard, the same set for everyone.",
        ],
      },
      {
        heading: "How the tiered scoring works",
        items: [
          "Scoring per puzzle: 100 points on the first guess, 60 on the second, 30 on the third, 0 for a miss. A perfect day is 500.",
        ],
        subsections: [
          {
            heading: "What the hint actually costs you",
            items: [
              "The hint appears after your first wrong guess, at no extra cost beyond the tier you already dropped.",
            ],
          },
        ],
      },
      {
        heading: "When the daily set resets",
        items: [
          "The set flips at midnight Eastern Time, and your progress saves for the day.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Solving a goat next to an Argentina flag",
        paragraphs: [
          "Suppose puzzle one is a goat next to an Argentina flag, category Player. You type Messi, first try, 100 points. Puzzle two is a single cherry with the category Club, and you sit there blank.",
        ],
      },
      {
        heading: "Cracking a single cherry after a hint",
        paragraphs: [
          "One wrong guess later the hint mentions England's south coast, and it clicks: Bournemouth, the Cherries, 60 points. That's the game in miniature, instant glory or a slow, hint-assisted crawl.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Reading the category label before the emoji",
        items: [
          "Read the category label first. The same emoji means different things for a club than for a moment.",
        ],
      },
      {
        heading: "Thinking about crests for club puzzles",
        items: [
          "Club puzzles usually run on nicknames and badges, so think about what's on the crest.",
        ],
      },
      {
        heading: "Saying the emoji out loud for puns",
        items: [
          "Say the emoji out loud. Half these riddles are puns that only work in your ears.",
        ],
      },
      {
        heading: "Guessing on your last try rather than waiting",
        items: [
          "Down to your last guess, wait for nothing. A 30 beats a zero and keeps the grid respectable.",
        ],
      },
    ],
    faqs: [
      {
        q: "What answers are accepted?",
        a: "The full name, common aliases, or a surname on its own. Accents, capitals and punctuation are ignored, so mbappe works fine.",
      },
      {
        q: "Do wrong guesses cost points?",
        a: "Only by dropping you a tier. First-guess solves score 100, second 60, third 30, and three misses score 0 for that puzzle.",
      },
      {
        q: "Is it only football?",
        a: "Yes, this one is all football: players, clubs, managers and famous moments from the game.",
      },
    ],
  },

  '/mystery-box': {
    intro: [
      "Your squad is sitting inside fifteen sealed packs. Mystery Box reveals real footballers one at a time, and you either slot them into your 4-3-3 or bin them and pray the next pack is kinder.",
      "Everyone opens the same packs each day, so luck is no excuse. The gap between your rating and your mate's is pure decision-making.",
    ],
    headings: {
      howToPlay: "How to play Mystery Box, a free football pack opening XI builder",
      rules: "Mystery Box rules for bins, pack odds and empty slots",
      example: "Mystery Box walkthrough: an early superstar and a fringe keeper",
      tips: "Mystery Box tips for bins, scarce slots and safe picks",
      faq: "Mystery Box FAQ: pack order, replays and a good rating",
    },
    howToPlaySections: [
      {
        heading: "Opening packs one at a time",
        items: [
          "Open packs one at a time, 15 in total.",
        ],
      },
      {
        heading: "Reading a pack's player and tier",
        items: [
          "Each pack reveals a real player with his club, position, rating and market value, plus a tier from fringe to superstar.",
        ],
      },
      {
        heading: "Keeping a player in a compatible slot",
        items: [
          "Keep him by tapping a highlighted compatible slot in your 4-3-3.",
        ],
      },
      {
        heading: "Binning a player if you can afford it",
        items: [
          "Or bin him, if you can afford to.",
        ],
      },
      {
        heading: "Sharing your final rating and best pull",
        items: [
          "After pack 15, your final XI rating and best pull are ready to share.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "How many bins you can actually afford",
        items: [
          "You open 15 packs to fill 11 slots, which means you can only afford 4 bins all run.",
        ],
      },
      {
        heading: "The pack odds behind each tier",
        items: [
          "Pack odds per tier: superstar 3 percent, star 9, quality 22, squad player 41, fringe 25.",
        ],
        subsections: [
          {
            heading: "Why an empty slot costs you so much",
            items: [
              "Your rating averages all 11 slots, and an empty slot counts as a 45, below even the weakest real player.",
            ],
          },
        ],
      },
      {
        heading: "One saved run per day",
        items: [
          "One run per day, the same sequence for everyone, saved as you go.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Keeping an early superstar winger",
        paragraphs: [
          "Imagine pack 2 pops a superstar winger. Instant keep at right wing. Packs 3 through 7 are squad-level bodies, and you bin two chasing better, leaving 2 bins for the rest of the run.",
        ],
      },
      {
        heading: "Settling for a fringe goalkeeper pick",
        paragraphs: [
          "Then pack 9 is a fringe goalkeeper. Keeping him feels bad, but there's one goalkeeper slot and no guarantee anything better is coming. You keep him and finish with a full XI in the low 70s.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Counting your bins before you spend them",
        items: [
          "Count your bins. Spend all 4 early and every remaining pack becomes a forced keep.",
        ],
      },
      {
        heading: "Guarding the scarcest slots on the pitch",
        items: [
          "Guard the scarce spots. There's one goalkeeper slot and one striker slot, but three central midfield slots.",
        ],
      },
      {
        heading: "Filling a hole with a fringe body",
        items: [
          "A fringe body still beats a hole. Empty slots score 45, lower than any real player.",
        ],
      },
      {
        heading: "Not betting solid players on a superstar pull",
        items: [
          "Superstars are a 3 percent event. Don't bin solid players betting on one.",
        ],
      },
    ],
    faqs: [
      {
        q: "Are the packs random for each player?",
        a: "No, the sequence is fixed for the day. Everyone opens the same 15 players in the same order, only the decisions differ.",
      },
      {
        q: "Can I replay if my run goes badly?",
        a: "No, it's one run per day. Decisions save as you go, and a fresh sequence arrives tomorrow.",
      },
      {
        q: "What counts as a good rating?",
        a: "Most finished squads land in the 60s or 70s. Higher usually means you landed a superstar and filled all 11 slots.",
      },
    ],
  },
  '/idle-arena': {
    intro: [
      "This is the idle game the word usually means. Tap a ball and a number goes up. Spend the number on a squad and it goes up on its own. Spend what the squad makes on a bigger squad, and by the time you look up the number has more letters after it than you expected. There is no end and no losing, just a curve that keeps steepening.",
      "Nobody in the arena is real. The squad is eight archetypes, a Ball Boy, a Sunday Striker, a Point Guard, a Slugger, a Sniper, a Quarterback, an Ace and a Champion, so there is no stat to check and nothing to argue about. That is on purpose: our other three idle games give you a museum, a club or an academy to run, and this one is built on nothing but the number.",
    ],
    headings: {
      howToPlay: "How to play Idle Arena, a free tap and build idle sports game",
      rules: "Idle Arena rules for pricing, trophies and time away",
      example: "Idle Arena walkthrough: building a squad and lifting a trophy",
      tips: "Idle Arena tips for pricing, upgrades and time away",
      faq: "Idle Arena FAQ: the endgame, time away and real players",
    },
    howToPlaySections: [
      {
        heading: "Tapping the ball to score points",
        items: [
          "Tap the ball. Every tap scores a point, more once you own the tap upgrades.",
        ],
      },
      {
        heading: "Signing a squad that scores every second",
        items: [
          "Sign a squad. Each archetype scores every second, from 0.4 a second for a Ball Boy up to 176,000 a second for a Champion.",
        ],
      },
      {
        heading: "Speeding up buys with the toggle",
        items: [
          "Switch the buy toggle to x10 or max when the points are coming faster than you can spend them.",
        ],
        subsections: [
          {
            heading: "Unlocking a whole line's bonus",
            items: [
              "Own five of an archetype and its own upgrade appears. Buy it and that whole line scores double.",
            ],
          },
        ],
      },
      {
        heading: "Lifting the trophy for a permanent boost",
        items: [
          "Earn a million in one run and the trophy box lights up. Lift it, the run resets, and every trophy you hold is +5% on everything from then on.",
        ],
      },
      {
        heading: "Earning points while you are away",
        items: [
          "Walk away whenever you like. The squad keeps scoring at half speed for up to eight hours, whether you closed the tab or left it sitting there, and the door tells you what it made when you come back.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Your first archetype costing nothing",
        items: [
          "Your first Ball Boy is free, so something is always scoring, even for somebody who never taps at all.",
        ],
      },
      {
        heading: "Costs climbing with every signing",
        items: [
          "Every archetype you sign costs 15% more than the last one of its kind. A Ball Boy costs 15, the tenth one costs 53, the hundredth costs about 15 million.",
        ],
      },
      {
        heading: "How trophies are priced by points earned",
        items: [
          "Trophies are paid on points earned in one run, not on points in hand. One trophy at a million, two at four million, three at nine million: the square root of the millions, rounded down.",
        ],
        subsections: [
          {
            heading: "What survives a trophy lift",
            items: [
              "Lifting the trophy clears the points, the squad and the upgrades. Trophies, badges and the all time total are the only things that carry over, and they carry over forever.",
            ],
          },
        ],
      },
      {
        heading: "Earning badges from tapping and trophies",
        items: [
          "Ten badges, each worth a permanent +1% on everything. They are earned by tapping, by squad size, by points and by trophies, and they survive every lift.",
        ],
      },
      {
        heading: "Away time running at a slower pace",
        items: [
          "Time away runs at half speed and stops after eight hours. That is the same eight hours whether the tab was shut or just sitting in a background window, because being there is what matters, not the tab being open.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Building toward your first bigger archetype",
        paragraphs: [
          "You tap eighteen times and sign a second Ball Boy. Two of them make 0.8 a second, which pays for a third in about twenty five seconds, and the three of them save toward a Sunday Striker at 100. Ten minutes in, the squad makes more in a second than your first minute of tapping did.",
        ],
      },
      {
        heading: "Reaching the trophy and lifting it",
        paragraphs: [
          "Fifteen or twenty minutes of steady buying gets a run past a million, which is the first trophy. Lift it and the arena empties, but every tap and every archetype now scores 5% more, so the second run reaches the same million faster than the first did, and the third faster still.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Comparing rate against price before buying",
        items: [
          "Read the rate against the price, not the price alone. A new archetype pays back slower than the tier below it at first, but the tier below has been getting 15% dearer with every signing, so the moment always comes when the bigger name is the better buy.",
        ],
      },
      {
        heading: "Reaching the upgrade point for a whole line",
        items: [
          "Five of anything is the magic number. That archetype's upgrade doubles the whole line, so buy to five before you spread out.",
        ],
      },
      {
        heading: "Turning taps into squad power",
        items: [
          "Muscle Memory turns taps into a share of the squad's rate. Once the squad is scoring thousands a second, it is the best tap upgrade on the board.",
        ],
      },
      {
        heading: "Timing the lift and an overnight run",
        items: [
          "Do not lift at exactly one trophy. Four million pays two, nine million pays three, and the run you are in already has the squad built.",
          "Leave it running before bed. Eight hours at half speed is four hours of income you did not have to be there for.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is there an end to Idle Arena?",
        a: "No. The number keeps growing and the trophies keep stacking. The formatter goes up through K, M, B, T and onward, and the eighth archetype is only the last one we have named so far.",
      },
      {
        q: "Does it keep going when I close the tab?",
        a: "Yes, at half speed for up to eight hours. Leaving the tab open in the background is the same deal, because a hidden tab stops running properly anyway. The catch up is worked out from the time your last session saved, so switching phones will not carry it over, but reopening the same browser will.",
      },
      {
        q: "Why are there no real players in it?",
        a: "Because a clicker does not need them, and the ones that use real names tend to get the numbers wrong. Our other idle games, Hall of Champions, Stadium Tycoon and Wonderkid Factory, give you something to manage. This one is just the curve.",
      },
      {
        q: "Where is the save kept?",
        a: "In your browser, on this device, with no account. It is written every five seconds and again when you leave the page. Clearing site data clears the arena.",
      },
    ],
  },
  '/face-off': {
    intro: [
      "Higher or Lower with somebody in the other chair. Two athletes, one career stat, and ten seconds to tap the one with the bigger number. A rival answers every round too, at its own speed, with its own hit rate, and after ten rounds the scoreboard says who knows ball.",
      "The pairs come from every corner of the site: soccer goals, NBA points, home runs, six different NFL stats, NHL points, college passing yards, F1 wins, Grand Slams, golf majors and VFL/AFL goals, never the same sport twice in a row. Every number is a career total that is already on the site in a Higher or Lower game, so nothing was made up for the duel.",
    ],
    headings: {
      howToPlay: "How to play Face Off, a free head to head sports stat trivia duel",
      rules: "Face Off rules for scoring, rivals and passing the phone",
      example: "Face Off walkthrough: a tied round and a late buzzer win",
      tips: "Face Off tips for speed, deep pools and picking a rival",
      faq: "Face Off FAQ: the rivals, the daily duel and two player mode",
    },
    howToPlaySections: [
      {
        heading: "Choosing the daily duel, unlimited or pass the phone",
        items: [
          "Pick the daily duel, which is the same ten pairs against The Pro for everyone, Unlimited, where you choose your rival, or Pass the phone, where the rival is whoever is sitting next to you.",
        ],
      },
      {
        heading: "Tapping the athlete with the bigger number",
        items: [
          "Read the stat and the two names, then tap the athlete with the bigger number.",
        ],
      },
      {
        heading: "Racing the ten second clock",
        items: [
          "Watch the bar. Ten seconds a round, and a right answer scores 100 plus 10 for every whole second you had left.",
        ],
      },
      {
        heading: "Reading the reveal after each round",
        items: [
          "The reveal shows both numbers, what the rival picked and how long it took.",
        ],
      },
      {
        heading: "Winning after ten rounds or sudden death",
        items: [
          "After ten rounds the higher total wins. Level on points and it goes to sudden death, up to three extra rounds.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Why a guess always beats no answer",
        items: [
          "Wrong scores nothing. Out of time scores nothing. There is no penalty beyond that, so a guess at the buzzer is always better than no answer.",
        ],
      },
      {
        heading: "Facing the same rival performance as everyone",
        items: [
          "The rival is dealt its answers with the pairs, so in the daily duel everyone faces exactly the same rival performance. Beating a friend's score is beating them on the same ten questions.",
        ],
      },
      {
        heading: "Three rivals with three different speeds",
        items: [
          "Three rivals. The Rookie takes 3 to 8 seconds and guesses the close ones. The Pro takes 2 to 6 and is sharp on the obvious pairs. The Legend answers inside 5 seconds and almost never misses a wide gap.",
        ],
        subsections: [
          {
            heading: "How close a pair is allowed to be",
            items: [
              "No pair is a tie and no pair is a gimme: the bigger number is always at least 4% more than the smaller and never more than 4 times it.",
            ],
          },
        ],
      },
      {
        heading: "No repeats within one duel",
        items: [
          "No athlete appears twice in one duel, and the daily can only be played once. Unlimited never runs out.",
        ],
      },
      {
        heading: "Passing the phone between two players",
        items: [
          "Pass the phone is two people on one device. Player 1 answers, the pair is hidden while the phone changes hands, Player 2 presses ready to start their own ten seconds, and both picks are revealed together. It is a game between the two of you and it is not booked to your record against the rivals.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Matching The Pro on career points",
        paragraphs: [
          "Round one: who has more career NBA points, Kareem Abdul-Jabbar or Kobe Bryant. You tap Kareem with six seconds left, which is right, 160 points. The Pro took 3.4 seconds and got it too, 160 points. All square.",
        ],
      },
      {
        heading: "Missing together and closing out the lead",
        paragraphs: [
          "Round four is Formula 1 wins and you hesitate, then miss. The Pro misses too, so the round is 0 to 0 and the lead never changes hands. Round nine you tap Gordon Coventry at the buzzer, right with one second left, 110 points. Ten rounds later you have won by 30, because you were right as often and a shade faster.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Treating speed as the second stat",
        items: [
          "Speed is the second stat. Two people who both know the answer are separated by the clock, and a second is ten points.",
        ],
      },
      {
        heading: "Not freezing on the close calls",
        items: [
          "Do not freeze on the close ones. A wrong answer costs nothing more than a late one, and the rival is guessing those too.",
        ],
      },
      {
        heading: "Learning the deep ends of each pool",
        items: [
          "Learn the deep ends of each pool. The wide gaps are free points; the duel is decided on the pairs where both names are legends.",
        ],
      },
      {
        heading: "Trying the daily match before the Rookie",
        items: [
          "Play the daily first. It is against The Pro every day, so your score means the same thing tomorrow and to everyone else.",
          "Start Unlimited against The Rookie and move up when you are winning three in a row. The Legend is there to be beaten, not to be your first game.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is the rival a real person?",
        a: "No. The Rookie, The Pro and The Legend are three settings for how fast and how often the computer gets it right, tuned so a decent fan beats the Rookie most of the time and loses to the Legend most of the time. Nobody is playing against you live.",
      },
      {
        q: "Is the daily duel the same for everyone?",
        a: "Yes. The ten pairs, the order, and the rival's answers and times are all dealt from the date, so anyone playing today faces exactly the same duel. It rolls over at midnight Eastern like the rest of our dailies.",
      },
      {
        q: "Where do the numbers come from?",
        a: "From the same pools our Higher or Lower games use, one per sport. Nothing was added for this game, so if a number is right there it is right here, and if you spot one that is wrong the report button at the bottom of the page reaches us.",
      },
      {
        q: "Can two people play?",
        a: "Yes. Pass the phone deals the same ten pairs to both of you, one at a time. Player 1 picks, hands the phone over, Player 2 picks on their own clock, and the reveal shows both. Nobody can see the other pick before their own, because the cards stay hidden during the handoff.",
      },
      {
        q: "What happens on a tie?",
        a: "Level on points after ten rounds and you play sudden death, one pair at a time, until somebody leads. If it is still level after three extra rounds it goes down as a draw.",
      },
    ],
  },
};
