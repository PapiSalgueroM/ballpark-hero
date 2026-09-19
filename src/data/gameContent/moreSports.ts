import type { GameContentMap } from './types';

// F1, tennis, golf, NASCAR and combat sports game guides. Casual human tone, no em dashes anywhere.
export const MORE_SPORTS_CONTENT: GameContentMap = {
  '/f1-driver': {
    intro: [
      "Somewhere in Formula 1 history sits a driver, and the game knows exactly who. Guess The F1 Driver hides one of 20 grand prix greats behind six clues that unlock one at a time.",
      "The first clue is a single word, a vibe. The rest get concrete: race wins, world titles, teams, nationality, and one famous career moment. Solve it on clue one for 1000 points; limp to clue six and you're playing for 100.",
    ],
    headings: {
      howToPlay: "How to play Guess The F1 Driver, a free Formula 1 guessing game",
      rules: "Guess The F1 Driver rules for clues, guesses and scoring",
      example: "Guess The F1 Driver walkthrough: from a vibe word to Hamilton",
      tips: "Guess The F1 Driver tips for clues, hints and guesses",
      faq: "Guess The F1 Driver FAQ: guesses, hints and signing in",
    },
    howToPlaySections: [
      {
        heading: "Choosing Daily Challenge or Unlimited mode",
        items: [
          "Choose Daily Challenge for the shared mystery driver, or Unlimited for random drivers on repeat.",
        ],
      },
      {
        heading: "Reading the one word vibe clue",
        items: [
          "Read the one-word vibe and see if a name jumps out.",
        ],
      },
      {
        heading: "Searching for a driver to guess",
        items: [
          "Search and pick a driver to guess. A surname or a HAM style shorthand resolves to the right person.",
        ],
        subsections: [
          {
            heading: "How each miss reveals a new clue",
            items: [
              "Every wrong guess reveals the next clue, so a miss always buys information.",
            ],
          },
        ],
      },
      {
        heading: "Using the hint button to see ahead",
        items: [
          "The hint button unlocks the next clue without risking a guess, though it lowers your score tier just like a miss.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Six clues and a pool of 20 drivers",
        items: [
          "Six clues per driver, and the answer pool holds 20 drivers.",
        ],
      },
      {
        heading: "Scoring from 1000 points down to 100",
        items: [
          "Scoring by clue: 1000, 800, 600, 400, 200, then 100 points.",
        ],
      },
      {
        heading: "Why six wrong guesses ends it",
        items: [
          "A wrong guess while the sixth clue is showing ends the game, so six misses is the cap.",
        ],
      },
      {
        heading: "Giving up and the daily driver",
        items: [
          "Giving up reveals the driver and scores 0. The daily driver changes every day.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "A first guess at Michael Schumacher",
        paragraphs: [
          "Imagine the vibe word is Dominant. That fits a handful of drivers, so you take a swing at Michael Schumacher. Wrong, and the next clue slides out: 105 race wins, the all-time record.",
        ],
      },
      {
        heading: "Landing on Lewis Hamilton for 800 points",
        paragraphs: [
          "Only one driver owns that number. You type Lewis Hamilton on clue two and bank 800 points.",
        ],
      },
      {
        heading: "What waiting for the title clue would pay",
        paragraphs: [
          "Waiting for the championship clue to confirm the seven titles would have paid 600. Confidence is worth 200 points here.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Browsing the autocomplete for ideas",
        items: [
          "The autocomplete list only contains drivers who can actually be the answer, so browsing it is a legitimate move.",
        ],
      },
      {
        heading: "Why hints are safer than a miss",
        items: [
          "Hints never end your game, but wrong guesses can. Once all six clues are out, guess like it's match point.",
        ],
      },
      {
        heading: "Practicing the pool in Unlimited mode",
        items: [
          "Unlimited recycles the same pool, so a few practice runs teach you every possible answer.",
        ],
      },
    ],
    faqs: [
      {
        q: "How many guesses do I get?",
        a: "Up to six. Once the sixth clue is out, one more miss ends the round.",
      },
      {
        q: "Does the hint button cost points?",
        a: "Indirectly. It reveals the next clue, dropping your potential score to that tier, exactly as a wrong guess would.",
      },
      {
        q: "Do I need an account?",
        a: "No. Signing in is optional and only matters for saved stats and leaderboards.",
      },
    ],
  },

  '/f1-higher-lower': {
    intro: [
      "Two drivers, one question: who won more Grands Prix? Simple, until the pairings leave the obvious names behind.",
      "The pool is every driver in F1 history with at least 8 career wins, 42 of them, from the 1950s through 2025. Points systems changed too much across eras to compare fairly, so the game runs on race wins, a stat that travels.",
    ],
    headings: {
      howToPlay: "How to play F1 Higher or Lower, a daily Formula 1 trivia game",
      rules: "F1 Higher or Lower rules for rounds, streaks and ties",
      example: "F1 Higher or Lower walkthrough: Prost, Senna and Fangio's math",
      tips: "F1 Higher or Lower tips for reading seasons and eras",
      faq: "F1 Higher or Lower FAQ: wins, points and daily matchups",
    },
    howToPlaySections: [
      {
        heading: "Picking Daily or Unlimited matchups",
        items: [
          "Pick Daily for today's shared matchups or Unlimited for endless random pairs.",
        ],
      },
      {
        heading: "Reading both driver cards",
        items: [
          "Read both cards: each shows the seasons raced, title count, and teams.",
        ],
      },
      {
        heading: "Tapping the driver with more wins",
        items: [
          "Tap the driver you think won more Grands Prix.",
        ],
      },
      {
        heading: "Watching the real totals flash up",
        items: [
          "The real totals flash up, then the next pair rolls in after a couple of seconds.",
        ],
        subsections: [
          {
            heading: "Stringing wins together for a streak bonus",
            items: [
              "String correct answers together to grow the streak bonus.",
            ],
          },
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Ten rounds worth ten points each",
        items: [
          "10 rounds per game, 10 points per correct answer.",
        ],
      },
      {
        heading: "How the streak bonus climbs to 325",
        items: [
          "Streaks pay rising bonuses: the second straight correct adds 5 points, the third adds 10, and so on. A perfect 10 for 10 run maxes out at 325.",
        ],
      },
      {
        heading: "Why an exact tie still counts",
        items: [
          "Exact ties count as correct no matter which driver you picked.",
        ],
      },
      {
        heading: "Hard mode's close win totals",
        items: [
          "Hard mode, Unlimited only, deliberately pairs drivers with close win totals.",
        ],
      },
      {
        heading: "The daily matchups and midnight reset",
        items: [
          "The daily is the same 10 matchups for everyone and flips at midnight Eastern.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Prost and Senna agree with the titles",
        paragraphs: [
          "Say round one hands you Alain Prost against Ayrton Senna. Titles say 4 against 3, and the wins agree: Prost 51, Senna 41.",
        ],
      },
      {
        heading: "Fangio's short seasons still cash in",
        paragraphs: [
          "Round five is nastier: Juan Manuel Fangio, five-time champion, against David Coulthard, zero titles. But 1950s seasons were short. Fangio sits on 24 wins, Coulthard on 13, so the legend still cashes.",
        ],
      },
      {
        heading: "Closing at 155 on a six round streak",
        paragraphs: [
          "You close 8 of 10 with a six-round streak in the middle and post 155. The streak did the heavy lifting.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Why titles can lie about win totals",
        items: [
          "Titles lie. Stirling Moss won 16 races and no championship, while Fangio turned 24 wins into 5 titles.",
        ],
      },
      {
        heading: "Watching the seasons raced on the card",
        items: [
          "Watch the seasons on the card. Long modern careers usually mean big win counts.",
        ],
      },
      {
        heading: "Relaxing on an identical feeling pair",
        items: [
          "When two drivers feel identical, relax: a dead heat pays either way.",
        ],
      },
      {
        heading: "Using Hard mode to study the numbers",
        items: [
          "Use Hard mode as a study tool. Small gaps teach you the actual numbers fast.",
        ],
      },
    ],
    faqs: [
      {
        q: "Why compare wins instead of points?",
        a: "Points systems changed massively across eras. A 1950s win paid around 8 points against 25 today, which would make every older driver an automatic low answer.",
      },
      {
        q: "What if both drivers have the same win total?",
        a: "The round counts as correct whichever side you tapped.",
      },
      {
        q: "Is my daily progress saved?",
        a: "Yes, finished rounds hold for the day. A new set of pairs arrives at midnight Eastern.",
      },
    ],
  },

  '/f1-constructor': {
    intro: [
      "This time the mystery isn't a driver, it's a whole team. Guess The Constructor hides one of 31 Formula 1 constructors behind six clues, from the giants of the modern grid to names that vanished decades ago.",
      "Clues arrive in a fixed order: a one-word vibe, the team's country, its era, its championship haul, its livery, and finally a famous driver. Every extra clue cuts your payout.",
    ],
    headings: {
      howToPlay: "How to play Guess The Constructor, a free F1 team guessing game",
      rules: "Guess The Constructor rules for clues and scoring tiers",
      example: "Guess The Constructor walkthrough: Iconic, Italy and Ferrari",
      tips: "Guess The Constructor tips for reading country and livery clues",
      faq: "Guess The Constructor FAQ: dead teams and the daily driver link",
    },
    howToPlaySections: [
      {
        heading: "Choosing Daily Challenge or Unlimited teams",
        items: [
          "Pick Daily Challenge for the shared team of the day or Unlimited for random constructors.",
        ],
      },
      {
        heading: "Starting from the vibe word clue",
        items: [
          "Start from the vibe word and guess whenever a team feels right.",
        ],
      },
      {
        heading: "How each wrong guess unlocks a clue",
        items: [
          "Each wrong guess unlocks the next clue in the sequence.",
        ],
        subsections: [
          {
            heading: "Taking a hint without risking a miss",
            items: [
              "Take a hint to see the next clue without risking a miss; the score tier drops just the same.",
            ],
          },
        ],
      },
      {
        heading: "Naming the constructor before six clues",
        items: [
          "Name the constructor before the six clues run out.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "A pool of 31 constructors and six clues",
        items: [
          "The pool holds 31 constructors and each puzzle has 6 clues.",
        ],
      },
      {
        heading: "Points from 1000 down to 100",
        items: [
          "Points by clue: 1000, 800, 600, 400, 200, 100.",
        ],
      },
      {
        heading: "What a final wrong guess costs you",
        items: [
          "A wrong guess with all six clues showing ends the round. Giving up scores 0.",
        ],
      },
      {
        heading: "The daily team and the daily driver",
        items: [
          "The daily constructor is picked independently of the daily driver, so the two F1 games never mirror each other.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Waiting out the Iconic clue",
        paragraphs: [
          "Suppose clue one reads Iconic. Half the grid thinks that's them, so you wait. Clue two says Italy, and now it's a short list.",
        ],
      },
      {
        heading: "Ferrari confirmed for 800 points",
        paragraphs: [
          "Iconic plus Italy has one obvious owner. Ferrari on clue two banks 800 points.",
        ],
      },
      {
        heading: "What the 16 title clue would confirm",
        paragraphs: [
          "Holding out for the championship clue, a count of 16 titles, would have confirmed it at 600. Some clues are worth skipping.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Why Britain alone will not save you",
        items: [
          "Country is the power clue, but Britain won't save you: McLaren, Williams, Lotus and more are all UK based.",
        ],
      },
      {
        heading: "Learning the giants' championship counts",
        items: [
          "Learn the championship counts of the giants. Numbers like 16 and 9 are fingerprints.",
        ],
      },
      {
        heading: "Guessing before the livery clue lands",
        items: [
          "The livery clue almost always gives it away. If you have any read at all, guess before it appears.",
        ],
      },
      {
        heading: "Not anchoring on the current grid",
        items: [
          "Defunct teams are in here too, so don't anchor on the current grid.",
        ],
      },
    ],
    faqs: [
      {
        q: "Are dead teams fair game?",
        a: "Yes. The 31-team pool mixes the current grid with historic constructors like Lotus, Brabham and Tyrrell.",
      },
      {
        q: "Is the daily team related to the daily driver?",
        a: "No. The two dailies are chosen separately, so solving one gives you no edge on the other.",
      },
    ],
  },

  '/perfect-lineup-f1': {
    intro: [
      "Perfect Lineup: F1 hands you five empty driver seats and a catch: three of them come with a constraint. Maybe a seat only accepts Ferrari drivers, or drivers from the 1990s, or Finns.",
      "You fill the seats from a pool of 41 drivers across eras, each rated up to 99, then hit Simulate. The game grades your squad on pace and chemistry and turns it into a season result you can share.",
    ],
    headings: {
      howToPlay: "How to play Perfect Lineup: F1 and build a five driver squad",
      rules: "Perfect Lineup: F1 rules for slots, chemistry and grades",
      example: "Perfect Lineup: F1 walkthrough: five legends and one grade jump",
      tips: "Perfect Lineup: F1 tips for constraints and chemistry links",
      faq: "Perfect Lineup: F1 FAQ: squares, duplicate drivers and slots",
    },
    howToPlaySections: [
      {
        heading: "Checking which slots carry constraints",
        items: [
          "Check which of the five slots carry constraints: a team, era, or country tag.",
        ],
      },
      {
        heading: "Searching the eligible driver pool",
        items: [
          "Tap a slot and search. The picker only lists eligible drivers, highest rated first.",
        ],
      },
      {
        heading: "Chasing links while you pick",
        items: [
          "Chase links while you pick: drivers sharing a team, country, or era boost chemistry.",
        ],
      },
      {
        heading: "Simulating once all five seats are filled",
        items: [
          "Clear and swap picks freely, then hit Simulate once all five seats are filled.",
        ],
        subsections: [
          {
            heading: "Sharing the result or rolling new constraints",
            items: [
              "Share the result, or roll new constraints with New Lineup.",
            ],
          },
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Five slots and three constraints",
        items: [
          "Five slots, 3 of them constrained. Every constraint is guaranteed at least 4 eligible drivers.",
        ],
      },
      {
        heading: "How squad rating and chemistry combine",
        items: [
          "Squad rating is 80 percent average driver rating plus 20 percent chemistry.",
        ],
      },
      {
        heading: "The grade bands from A+ to D",
        items: [
          "Grades: A+ at a rating of 92 or better, A at 84, B at 74, C at 62, D below.",
        ],
      },
      {
        heading: "Daily constraints versus New Lineup",
        items: [
          "Daily mode gives everyone the same constraints once a day; New Lineup rolls random ones anytime.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Star hunting under Ferrari and Finland",
        paragraphs: [
          "Say your constraints are Ferrari, Finland and the 1990s. You go star hunting: Michael Schumacher, Kimi Raikkonen, Ayrton Senna, then Lewis Hamilton and Max Verstappen in the free seats. Average rating: just over 97.",
        ],
      },
      {
        heading: "A B grade from five great names",
        paragraphs: [
          "The sim returns a B. Five all-time greats, almost no connections: only the Schumacher and Raikkonen overlap registers, and chemistry lands at 27.",
        ],
      },
      {
        heading: "Swapping in Hakkinen for an A grade",
        paragraphs: [
          "Swap Senna for Mika Hakkinen and it flips: two Finns, two Ferrari drivers, a shared era. Chemistry 40, rating 85, grade A. Lesser name, better team.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Why rating still leads the formula",
        items: [
          "Ratings are 80 percent of the formula, so never tank quality for one link. Find picks that do both jobs.",
        ],
      },
      {
        heading: "Filling constrained slots before free ones",
        items: [
          "Fill the constrained slots first, then patch chemistry with the free seats.",
        ],
      },
      {
        heading: "Why era overlaps are the cheapest links",
        items: [
          "Era overlaps are the cheapest links: same-decade drivers connect even when teams and countries don't.",
        ],
      },
      {
        heading: "Rebuilding a daily squad with Edit Lineup",
        items: [
          "In daily mode, Edit Lineup lets you rebuild and simulate again.",
        ],
      },
    ],
    faqs: [
      {
        q: "What do the colored squares in my shared result mean?",
        a: "One square per slot: green for a driver rated 88 or higher, yellow for 75 to 87, black below that.",
      },
      {
        q: "Can two slots use the same driver?",
        a: "No. Once a driver is seated, they disappear from the other slots' pickers.",
      },
    ],
  },

  '/guess-tennis-player': {
    intro: [
      "A mystery tennis player is hiding behind six clues, and they could come from either tour. Men's legends, women's legends, everyone is in the same deck.",
      "Clues unlock in a set order: a one-word vibe, nationality and era, tour, Grand Slam count, slam details, and a famous moment. The sooner you commit, the more you score.",
    ],
    headings: {
      howToPlay: "How to play Guess The Player, a free tennis guessing game",
      rules: "Guess The Player rules for clues, tours and scoring",
      example: "Guess The Player walkthrough: closing in on Serena Williams",
      tips: "Guess The Player tips for the tour clue and slam counts",
      faq: "Guess The Player FAQ: ATP, WTA and loading the player list",
    },
    howToPlaySections: [
      {
        heading: "Choosing the daily puzzle or Unlimited",
        items: [
          "Choose the daily puzzle, shared by everyone that day, or Unlimited for random legends.",
        ],
      },
      {
        heading: "Taking an early swing at the vibe word",
        items: [
          "Read the vibe word and take an early swing if you're feeling brave.",
        ],
      },
      {
        heading: "How each wrong guess reveals a clue",
        items: [
          "Each wrong guess reveals the next clue in the sequence.",
        ],
        subsections: [
          {
            heading: "Taking a hint without spending a guess",
            items: [
              "The hint button unlocks the next clue without spending a guess; the score tier drops either way.",
            ],
          },
        ],
      },
      {
        heading: "Typing a name from the suggestions",
        items: [
          "Type the player's name and pick from the suggestions to lock it in.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Six clues and the scoring tiers",
        items: [
          "6 clues maximum, with scoring tiers of 1000, 800, 600, 400, 200 and 100 points.",
        ],
      },
      {
        heading: "Why the sixth clue ends the round",
        items: [
          "A wrong guess while the sixth clue is showing ends the game.",
        ],
      },
      {
        heading: "Giving up and revealing the player",
        items: [
          "Giving up ends the round at 0 and reveals the player.",
        ],
      },
      {
        heading: "Accepting common short names",
        items: [
          "Common names work: the game accepts well known short versions of a name.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "An American star with too many candidates",
        paragraphs: [
          "Suppose clue two describes an American who ruled across the 2000s and 2010s. Too many candidates, so you pass. Clue three says WTA, and clue four lands the hammer: 23 Grand Slam singles titles.",
        ],
      },
      {
        heading: "Serena Williams confirmed at 23 titles",
        paragraphs: [
          "Only one player in history owns exactly 23. You type Serena Williams on clue four and take 400 points.",
        ],
      },
      {
        heading: "What a sharper era read would have paid",
        paragraphs: [
          "A sharper read on the era hint might have gotten you there a clue earlier for 600. That's the game inside the game.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "How the tour clue halves the field",
        items: [
          "The tour clue instantly halves the field. Torn between a man and a woman? Wait for it.",
        ],
      },
      {
        heading: "Slam counts as fingerprints",
        items: [
          "Slam counts are fingerprints at the top: 24, 23, 22 and 20 each point at one or two legends.",
        ],
      },
      {
        heading: "Skimming the suggestion list for ideas",
        items: [
          "The suggestion list doubles as a roster of possible answers. Skim it when you're lost.",
        ],
      },
      {
        heading: "Why era knowledge beats forehands",
        items: [
          "Early clues reward era knowledge. Knowing who peaked when beats knowing forehands.",
        ],
      },
    ],
    faqs: [
      {
        q: "Are ATP and WTA players both included?",
        a: "Yes. The pool mixes men's and women's greats, and the tour clue tells you which side you're on.",
      },
      {
        q: "Can the same player show up twice in Unlimited?",
        a: "Yes. Unlimited picks are random each round, so repeats can happen in a long session.",
      },
      {
        q: "Why does the game load before I can start?",
        a: "Puzzles come from the site's own tennis database, so the player list downloads first. If it fails, a retry link appears.",
      },
    ],
  },

  '/tennis-chain': {
    intro: [
      "Every tennis great has lost to somebody. Tennis Chain turns that into a game: start from a legend, name a player who beat them at a Grand Slam, then someone who beat that player, for as long as your memory holds.",
      "There's no timer and no guess meter. Just one rule: every answer must be a real Grand Slam defeat of your current player, and one mistake ends the run.",
    ],
    headings: {
      howToPlay: "How to play Tennis Chain, a free Grand Slam connection game",
      rules: "Tennis Chain rules for links, points and badges",
      example: "Tennis Chain walkthrough: from Federer to a broken link",
      tips: "Tennis Chain tips for finals and big career hubs",
      faq: "Tennis Chain FAQ: defeats, accounts and connection errors",
    },
    howToPlaySections: [
      {
        heading: "Picking Daily Challenge or Unlimited",
        items: [
          "Pick Daily Challenge, where everyone starts from the same player, or Unlimited for a random starter.",
        ],
      },
      {
        heading: "Thinking of a Grand Slam winner",
        items: [
          "Think of anyone who beat the current player at a major.",
        ],
      },
      {
        heading: "Searching and submitting a name",
        items: [
          "Search the name and submit. The game verifies the matchup before the link counts.",
        ],
        subsections: [
          {
            heading: "How a verified defeat joins the chain",
            items: [
              "Each verified defeat adds the winner to your chain, and they become the new current player.",
            ],
          },
        ],
      },
      {
        heading: "Playing on until you miss or cash out",
        items: [
          "Keep going until you miss, repeat a player, or cash out with Give Up.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Every verified link is worth 100 points",
        items: [
          "Every verified link is worth 100 points.",
        ],
      },
      {
        heading: "How the multiplier grows the chain",
        items: [
          "Your total is multiplied by 1.5 once the chain reaches 5 links and by 2 at 10.",
        ],
      },
      {
        heading: "What ends a run instantly",
        items: [
          "Naming a player already used in the chain ends the run, and so does one wrong answer.",
        ],
      },
      {
        heading: "Badges at 3, 5 and 10 links",
        items: [
          "Badges land at 3 links (Club Player), 5 (Pro Circuit) and 10 (Grand Slam Champion).",
        ],
      },
      {
        heading: "Retrying after a connection problem",
        items: [
          "If the checker hits a connection problem, nothing is lost; just retry.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Starting the chain at Roger Federer",
        paragraphs: [
          "Say you start on Roger Federer. Rafael Nadal beat him at Roland Garros more than once: link one. Nadal to Novak Djokovic is just as easy. Link two.",
        ],
      },
      {
        heading: "Wawrinka earns the Club Player badge",
        paragraphs: [
          "From Djokovic you remember Stan Wawrinka's 2015 French Open final win. Link three, 300 points, and the Club Player badge is yours.",
        ],
      },
      {
        heading: "Where the chain finally breaks",
        paragraphs: [
          "Then you blank on who ever beat Wawrinka at a slam, toss out a name you can't back up, and the run ends at 300.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Thinking of Grand Slam finals first",
        items: [
          "Think finals first. Title matches are the defeats everyone remembers.",
        ],
      },
      {
        heading: "Only chaining into losses you can picture",
        items: [
          "Don't chain into a player whose losses you can't picture. You have to escape everyone you name.",
        ],
      },
      {
        heading: "Saving your big hubs for later",
        items: [
          "Save the big hubs, players with famous losses across eras, for when you're stuck.",
        ],
      },
    ],
    faqs: [
      {
        q: "Does the win have to be a final?",
        a: "No. Any victory over your current player at a Grand Slam counts, first round included.",
      },
      {
        q: "Do I need an account for the leaderboard?",
        a: "No account needed. You just type a nickname when you save your score.",
      },
      {
        q: "The game couldn't verify my answer. Did I lose?",
        a: "No. That message means a connection hiccup, not a wrong answer. Your chain stays alive and you can resubmit.",
      },
    ],
  },

  '/tennis-higher-lower': {
    intro: [
      "Serena or Federer: who won more Grand Slam singles titles? This game asks that kind of question 10 times, and it mixes both tours in one pool on purpose, because cross-tour matchups are where the arguments live.",
      "The pool holds 44 champions, from the pioneers of the 1920s to active stars, with title counts frozen through the 2026 Australian Open.",
    ],
    headings: {
      howToPlay: "How to play Tennis Higher or Lower, a daily Grand Slam trivia game",
      rules: "Tennis Higher or Lower rules for rounds, ties and streaks",
      example: "Tennis Higher or Lower walkthrough: Serena, Federer and a tie",
      tips: "Tennis Higher or Lower tips for tie clusters and eras",
      faq: "Tennis Higher or Lower FAQ: cross tour picks and title counts",
    },
    howToPlaySections: [
      {
        heading: "Choosing Daily or Unlimited matchups",
        items: [
          "Choose Daily for the shared matchups or Unlimited for random ones.",
        ],
      },
      {
        heading: "Reading each player's title years and tour",
        items: [
          "Read both cards: each shows the years of the player's first and last major and their tour.",
        ],
      },
      {
        heading: "Tapping the player with more Grand Slams",
        items: [
          "Tap the player you think won more Grand Slam singles titles.",
        ],
      },
      {
        heading: "Watching the real numbers reveal",
        items: [
          "Watch the real numbers reveal, then roll into the next round.",
        ],
        subsections: [
          {
            heading: "Chaining correct picks into a streak",
            items: [
              "Chain correct answers to build the streak bonus.",
            ],
          },
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Ten rounds and ten points a pick",
        items: [
          "10 rounds, 10 points per correct pick.",
        ],
      },
      {
        heading: "How the streak bonus reaches 325",
        items: [
          "Streaks add 5 extra points on the second straight correct answer, 10 on the third, and so on. A flawless game is worth 325.",
        ],
      },
      {
        heading: "Why slam count ties still score",
        items: [
          "Ties are common with slam counts and score as correct for either pick.",
        ],
      },
      {
        heading: "Hard mode's close matchups",
        items: [
          "Hard mode, Unlimited only, serves up deliberately close matchups.",
        ],
      },
      {
        heading: "The daily flip at midnight Eastern",
        items: [
          "The daily flips at midnight Eastern and your progress holds for the day.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Serena Williams edges Roger Federer",
        paragraphs: [
          "Round one: Serena Williams against Roger Federer. Two icons, one number each, 23 against 20. Serena takes it.",
        ],
      },
      {
        heading: "Evert and Navratilova end in a tie",
        paragraphs: [
          "Later you draw Chris Evert against Martina Navratilova and freeze. Then you remember it doesn't matter: both won 18, and a tie pays either way.",
        ],
      },
      {
        heading: "One miss on an old timer costs a perfect run",
        paragraphs: [
          "You finish 9 of 10 with one bad miss on an old-timer, a reminder that the early greats in this pool won a lot.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Learning the slam count clusters",
        items: [
          "Learn the tie clusters: 24, 22, 18 and 8 all have multiple owners.",
        ],
      },
      {
        heading: "Respecting the sport's early legends",
        items: [
          "Respect the ancients. Margaret Court's 24 and Helen Wills' 19 outrank almost everyone modern.",
        ],
      },
      {
        heading: "Reading the year range as an era anchor",
        items: [
          "The year range on the card is your era anchor. A long title window usually means a big count.",
        ],
      },
    ],
    faqs: [
      {
        q: "Are men and women really compared head to head?",
        a: "Yes. The axis is total Grand Slam singles titles, so Serena against Federer is a fair and intended matchup.",
      },
      {
        q: "How current are the title counts?",
        a: "They're locked in through the 2026 Australian Open, so results after that may not be reflected yet.",
      },
    ],
  },

  '/guess-the-golfer': {
    intro: [
      "One major champion is hiding behind six clues, and the first is already on the table: the years they were winning majors. From there it's on you.",
      "Wrong guesses unlock the rest in a fixed order: nationality, career major count, which of the four majors they won, initials, then first name. Scoring rewards the brave: a first-clue solve pays 600, and every extra clue costs 100.",
    ],
    headings: {
      howToPlay: "How to play Guess The Golfer, a free major champion guessing game",
      rules: "Guess The Golfer rules for guesses, scoring and the pool",
      example: "Guess The Golfer walkthrough: Gary Player and South Africa",
      tips: "Guess The Golfer tips for year spans and nationality clues",
      faq: "Guess The Golfer FAQ: women's champions and old timers",
    },
    howToPlaySections: [
      {
        heading: "Picking Daily or Unlimited champions",
        items: [
          "Pick Daily, the same golfer for everyone, or Unlimited for a fresh champion every round.",
        ],
      },
      {
        heading: "Studying the opening year span clue",
        items: [
          "Study the opening clue: the span between their first and last major win.",
        ],
      },
      {
        heading: "Typing letters to see name suggestions",
        items: [
          "Type at least two letters to see name suggestions, then tap one to guess.",
        ],
        subsections: [
          {
            heading: "How every miss unlocks the next clue",
            items: [
              "Every miss unlocks the next clue in the sequence.",
            ],
          },
        ],
      },
      {
        heading: "Solving before the sixth wrong guess",
        items: [
          "Solve it before your sixth wrong guess or the round ends.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Six wrong guesses ends the round",
        items: [
          "Six wrong guesses end the round.",
        ],
      },
      {
        heading: "Scoring from 600 down to 100",
        items: [
          "Score starts at 600 for a first-clue solve and drops 100 per extra clue, bottoming out at 100.",
        ],
      },
      {
        heading: "The 55 golfer answer pool",
        items: [
          "Answers come from a famous 55-golfer slice: champions with 4 or more majors from any era, plus anyone who won a major in 1980 or later.",
        ],
      },
      {
        heading: "A wider 61 champion search list",
        items: [
          "The search list is wider, covering all 61 men's champions with at least 2 career majors.",
        ],
      },
      {
        heading: "The daily golfer and the midnight reset",
        items: [
          "The daily golfer resets at midnight Eastern, and your progress is saved for the day.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Missing on Arnold Palmer's year span",
        paragraphs: [
          "Say the first clue reads: won majors between 1959 and 1978. That's a long reign, so you gamble on Arnold Palmer. Miss; his wins sit between 1958 and 1964.",
        ],
      },
      {
        heading: "Gary Player confirmed for 500 points",
        paragraphs: [
          "Clue two says South Africa, and the long window suddenly makes sense. Gary Player, nine majors across two decades. You take 500 points on clue two.",
        ],
      },
      {
        heading: "Trading a 600 point flex for certainty",
        paragraphs: [
          "Calling the era cold would have been a 600-point flex, but 500 with certainty beats 0 with style.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Memorizing the marquee year spans",
        items: [
          "Memorize the marquee year spans: 1962 to 1986 is Nicklaus, 1997 to 2019 is Tiger.",
        ],
      },
      {
        heading: "How nationality slices the pool",
        items: [
          "Any nationality that isn't United States slices the pool down to a handful of names.",
        ],
      },
      {
        heading: "Spending wrong guesses on real hypotheses",
        items: [
          "Wrong guesses are your only currency, so spend them on real hypotheses, not shrugs.",
        ],
      },
      {
        heading: "Why the initials clue is a gift",
        items: [
          "If you're still alive at the initials clue, the answer is basically gift wrapped. Never lose from there.",
        ],
      },
    ],
    faqs: [
      {
        q: "Are women's major champions in the pool?",
        a: "Not currently. The game draws from men's major champions with at least two career majors.",
      },
      {
        q: "Can an old-timer still show up?",
        a: "Yes. Anyone with four or more majors qualifies whatever their era, so a Harry Vardon day is possible.",
      },
    ],
  },

  '/golf-higher-lower': {
    intro: [
      "Golf's major-count arguments, settled 10 rounds at a time. Two champions appear side by side and you pick the one with more career majors.",
      "The pool runs the entire history of championship golf: 61 players, everyone with at least 2 majors, from Old Tom Morris in the 1860s to Scottie Scheffler.",
    ],
    headings: {
      howToPlay: "How to play Golf Higher or Lower, a daily major championship trivia game",
      rules: "Golf Higher or Lower rules for rounds, ties and streak bonuses",
      example: "Golf Higher or Lower walkthrough: Nicklaus, Woods and Hagen",
      tips: "Golf Higher or Lower tips for reading eras and win years",
      faq: "Golf Higher or Lower FAQ: the four majors and Hard mode",
    },
    howToPlaySections: [
      {
        heading: "Choosing Daily or Unlimited pairs",
        items: [
          "Choose Daily for the shared matchups or Unlimited for random pairs.",
        ],
      },
      {
        heading: "Reading each golfer's country and win years",
        items: [
          "Each card shows the golfer's country and the years of their first and last major win.",
        ],
      },
      {
        heading: "Tapping the golfer with more majors",
        items: [
          "Tap the golfer you believe won more majors.",
        ],
      },
      {
        heading: "Watching the real counts reveal",
        items: [
          "The real counts reveal, points land, and the next pair appears.",
        ],
        subsections: [
          {
            heading: "Stacking correct picks for streak bonuses",
            items: [
              "Stack correct answers for streak bonuses.",
            ],
          },
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Ten rounds and a growing streak bonus",
        items: [
          "10 rounds, 10 points per correct answer, plus a streak bonus growing by 5 with each straight correct after the first. A perfect game is 325.",
        ],
      },
      {
        heading: "Why exact ties always score",
        items: [
          "Exact ties score as correct on either side.",
        ],
      },
      {
        heading: "Hard mode's close major counts",
        items: [
          "Hard mode lives in Unlimited only and pairs golfers with close major counts.",
        ],
      },
      {
        heading: "New matchups at midnight Eastern",
        items: [
          "New daily matchups arrive at midnight Eastern.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Nicklaus edges Tiger Woods",
        paragraphs: [
          "Round one gives you Jack Nicklaus against Tiger Woods, the two biggest names in the sport, and the counts land 18 to 15 for Jack.",
        ],
      },
      {
        heading: "Hagen's majors dwarf Mickelson's",
        paragraphs: [
          "Later it's Walter Hagen against Phil Mickelson. Recency pulls you toward Phil, but Hagen's 11 majors dwarf Phil's 6. That's the trap this game sets over and over.",
        ],
      },
      {
        heading: "Trusting eras over instinct to close 7 of 10",
        paragraphs: [
          "You stop trusting instinct, start trusting eras, and grind out 7 of 10.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Memorizing the podium of major counts",
        items: [
          "Memorize the podium: Nicklaus 18, Woods 15, Hagen 11.",
        ],
      },
      {
        heading: "Trusting old champions over modern ones",
        items: [
          "Early century champions stack majors quietly. When in doubt between eras, old often beats modern.",
        ],
      },
      {
        heading: "Spotting the bigger legend in a crowded club",
        items: [
          "The two-major club is crowded and coin-flip rounds happen. Use the win years on the card to spot the bigger legend.",
        ],
      },
      {
        heading: "Treating ties as free points",
        items: [
          "Ties pay both ways, so identical-feeling pairs are free points, not landmines.",
        ],
      },
    ],
    faqs: [
      {
        q: "Which tournaments count as majors here?",
        a: "Career wins across the four men's majors: the Masters, the PGA Championship, The Open and the U.S. Open.",
      },
      {
        q: "Is Hard mode scored differently?",
        a: "No, same rounds and points. It only changes the matchups, pairing golfers with nearly equal counts.",
      },
    ],
  },

  '/afl-higher-lower': {
    intro: [
      "Footy's goal kicking arguments, settled 10 rounds at a time. Two VFL/AFL greats appear side by side and you pick the one who kicked more career goals.",
      "The pool is 60 retired legends, everyone from Gordon Coventry in the 1920s to Buddy Franklin, and only retired players make the list so no total ever moves under you.",
    ],
    headings: {
      howToPlay: "How to play AFL Higher or Lower, a free footy goal kicking trivia game",
      rules: "AFL Higher or Lower rules for rounds, streaks and hard mode",
      example: "AFL Higher or Lower walkthrough: Lockett, Coventry and career totals",
      tips: "AFL Higher or Lower tips for picking the higher goal kicker",
      faq: "AFL Higher or Lower FAQ: goal totals and the retired player pool",
    },
    howToPlaySections: [
      {
        heading: "Choosing Daily or Unlimited mode",
        items: ["Choose Daily for the shared matchups or Unlimited for random pairs."],
      },
      {
        heading: "Reading each player's card",
        items: ["Each card shows the player's clubs and the years of their career."],
      },
      {
        heading: "Picking the higher career goal kicker",
        items: [
          "Tap the player you believe kicked more career goals.",
          "The real counts reveal, points land, and the next pair appears.",
        ],
      },
      {
        heading: "Stacking a streak bonus",
        items: ["Stack correct answers for streak bonuses."],
      },
    ],
    ruleSections: [
      {
        heading: "Scoring ten rounds and a growing streak bonus",
        items: ["10 rounds, 10 points per correct answer, plus a streak bonus growing by 5 with each straight correct after the first. A perfect game is 325."],
      },
      {
        heading: "How exact ties score",
        items: ["Exact ties score as correct on either side, and this pool has real ones: Wayne Carey and Peter Hudson both finished on 727."],
      },
      {
        heading: "Hard mode in Unlimited",
        items: ["Hard mode lives in Unlimited only and pairs players with close goal counts."],
      },
      {
        heading: "New matchups at midnight",
        items: ["New daily matchups arrive at midnight Eastern."],
      },
    ],
    exampleSections: [
      {
        heading: "Tony Lockett against Matthew Lloyd",
        paragraphs: ["Round one gives you Tony Lockett against Matthew Lloyd, and the counts land 1,360 to 926 for Plugger, the only man in history past 1,300."],
      },
      {
        heading: "Gordon Coventry against Jack Riewoldt",
        paragraphs: ["Later it's Gordon Coventry against Jack Riewoldt. Recency pulls you toward Jack, but Coventry kicked 1,299 before World War Two. That's the trap this game sets over and over."],
      },
      {
        heading: "Trusting eras over recency",
        paragraphs: ["You stop trusting recency, start trusting eras, and grind out 7 of 10."],
      },
    ],
    tipSections: [
      {
        heading: "Memorizing the career goal podium",
        items: ["Memorize the podium: Lockett 1,360, Coventry 1,299, Dunstall 1,254."],
        subsections: [
          {
            heading: "The exclusive 1,000 goal club",
            items: ["Only five men have ever kicked 1,000: those three plus Doug Wade and Gary Ablett Sr, with Buddy Franklin's 1,066 among them."],
          },
        ],
      },
      {
        heading: "Weighing eras against each other",
        items: ["Full forwards from the high scoring 80s stack huge numbers. A key forward from the 2010s on the same games usually sits lower."],
      },
      {
        heading: "Trusting ties as free points",
        items: ["Ties pay both ways, so identical-feeling pairs are free points, not landmines."],
      },
    ],
    faqs: [
      {
        q: 'Where do the goal totals come from?',
        a: 'Career VFL/AFL regular season and finals goals as carried by the all time leading goalkicker records, cross-checked before shipping. Only retired players are included so the numbers are final.',
      },
      {
        q: 'Why is a current star not in the pool?',
        a: 'Active players are left out on purpose. Their totals move every week, and this site does not ship numbers that quietly go wrong.',
      },
    ],
  },
  '/guess-nascar-driver': {
    intro: [
      "There's a Cup Series driver on the other side of the screen, and you get six clues to figure out who. It could be a modern playoff regular or a legend from the golden eras of stock car racing.",
      "Clues unlock in a fixed order and get more specific as they go: the years the driver was winning, how many championships they took, what they were driving in a title year, and then three actual races they won, named and dated.",
    ],
    headings: {
      howToPlay: "How to play Guess The Driver, a free daily NASCAR trivia game",
      rules: "Guess The Driver rules for clues, scoring and the pool",
      example: "Guess The Driver walkthrough: eras, titles and Richard Petty",
      tips: "Guess The Driver tips for narrowing down a Cup Series legend",
      faq: "Guess The Driver FAQ: clues, the driver pool and giving up",
    },
    howToPlaySections: [
      {
        heading: "Choosing Daily or Unlimited to begin",
        items: ["Pick Daily Challenge to chase the same driver as everyone else, or Unlimited to keep the puzzles coming."],
      },
      {
        heading: "Reading the opening era clue",
        items: ["Read the era clue first and guess whenever conviction strikes."],
      },
      {
        heading: "Guessing wrong reveals the next clue",
        items: ["Every wrong guess reveals the next clue automatically."],
      },
      {
        heading: "Using a hint without losing your guess",
        items: ["Hints unlock the next clue without spending a guess, though the score tier drops the same either way."],
      },
      {
        heading: "Picking a name from the suggestion list",
        items: ["Pick a name from the suggestion list to submit your guess."],
      },
    ],
    ruleSections: [
      {
        heading: "Scoring by which clue you solve on",
        items: ["6 clues per driver, scored 1000, 800, 600, 400, 200 and 100 by the clue you solve on."],
      },
      {
        heading: "What ends a round on the last clue",
        items: ["A wrong guess while clue six is showing ends the round."],
      },
      {
        heading: "Giving up and scoring zero",
        items: ["Give Up reveals the driver and scores 0."],
      },
      {
        heading: "Daily and Unlimited sharing one pool",
        items: ["Daily and Unlimited both pull from the same 59 driver pool."],
      },
      {
        heading: "Every clue built from a real result",
        items: ["Every clue is a fact from a real race result or a real championship season. Nothing about a driver is invented, and where our race records are thin the clue says \"on record\" instead of claiming a career total."],
      },
    ],
    exampleSections: [
      {
        heading: "Landing in the sport's second golden era",
        paragraphs: ["Clue one says the driver has race wins on record between 1970 and 1984, so you are in the sport's second golden era and you hold your fire."],
      },
      {
        heading: "Narrowing it down on championships",
        paragraphs: ["Clue two says seven Cup Series championships. Only three drivers in history have seven, and one of them raced far later, so you are down to two."],
      },
      {
        heading: "Settling it on the manufacturer",
        paragraphs: ["Clue three says a title year came driving a Plymouth, which settles it: Richard Petty, guessed on clue three for 600 points. The 1973 Daytona 500 was waiting in clue four, and you didn't need it."],
      },
    ],
    tipSections: [
      {
        heading: "Letting championship counts narrow the field",
        items: ["Championship counts cluster at the top, so seven titles narrows it to a very short list before you have seen a single race."],
      },
      {
        heading: "Using the era clue to split generations",
        items: ["The era clue splits the generations cleanly. Use it to rule out most of the field before the race names arrive."],
      },
      {
        heading: "Reading the manufacturer for the decade",
        items: ["The manufacturer in a title year dates a driver closely: Plymouth and Oldsmobile belong to one era, Toyota to another."],
        subsections: [
          {
            heading: "Letting a named race close it out",
            items: ["The named races are the giveaway. If you know who won a particular Daytona 500 or Southern 500, the round is over on that clue."],
          },
        ],
      },
      {
        heading: "Letting the list jog a stuck memory",
        items: ["If a name is stuck on the tip of your tongue, scroll the suggestion list; seeing it usually unlocks it."],
      },
    ],
    faqs: [
      {
        q: "Do I have to type the exact full name?",
        a: "Start typing and pick from the suggestion list, which submits the full name for you. Typing it yourself works too, and a suffix like Jr is optional.",
      },
      {
        q: "Where do the clues come from?",
        a: "Real race results and the full list of Cup Series champions, both held in our own database. A clue never totals up a career, because our race records have gaps in the early decades and mix in exhibition races, so each one names a single race in a single year instead.",
      },
      {
        q: "Why isn't every famous driver in here?",
        a: "A driver only makes the pool if our records hold enough real wins to build six honest clues, which is 59 of them today. Padding the rest out with made up detail would be worse than leaving them out.",
      },
      {
        q: "What happens if I give up?",
        a: "The driver is revealed and the round scores 0. In Unlimited you can start another one right away.",
      },
    ],
  },

  '/nascar-chain': {
    intro: [
      "Winning a Cup championship means somebody else didn't. NASCAR Chain runs on that: you get a driver, and you name someone who beat them to a Cup Series title. Then someone who beat that driver to one, and on and on.",
      "It's a memory test of championship seasons more than raw trivia, and one wrong link ends the whole run.",
    ],
    headings: {
      howToPlay: "How to play NASCAR Chain, a free Cup Series championship game",
      rules: "NASCAR Chain rules for links, badges and scoring",
      example: "NASCAR Chain walkthrough: Earnhardt Jr. to a broken run",
      tips: "NASCAR Chain tips for remembering championship seasons",
      faq: "NASCAR Chain FAQ: verified links, badges and the leaderboard",
    },
    howToPlaySections: [
      {
        heading: "Choosing Daily or Unlimited to start",
        items: ["Choose Daily Challenge, same starting driver for everyone, or Unlimited for a random start."],
      },
      {
        heading: "Thinking of a driver who beat the champion",
        items: ["Think of a champion who won the Cup while your current driver was chasing it."],
      },
      {
        heading: "Searching a name for the game to verify",
        items: ["Search the name; the game verifies the connection before it counts."],
        subsections: [
          {
            heading: "What happens once a link is verified",
            items: ["Each verified answer joins the chain and becomes your new current driver."],
          },
        ],
      },
      {
        heading: "Saving your score with a nickname",
        items: ["Run it as far as you can, then save your score with a nickname to hit the top 10 board."],
      },
    ],
    ruleSections: [
      {
        heading: "Scoring points with chain multipliers",
        items: ["Each verified link is worth 100 points, with your total multiplied by 1.5 at a chain of 5 and by 2 at 10."],
      },
      {
        heading: "What instantly ends a run",
        items: ["Repeating a driver already in the chain ends the run instantly, and so does a wrong answer."],
      },
      {
        heading: "Earning badges along the chain",
        items: ["Badges: Pit Crew at 3 links, Cup Contender at 5, NASCAR Legend at 10."],
      },
      {
        heading: "Connection problems asking for a retry",
        items: ["Connection problems never kill a run; unverified answers just ask for a retry."],
      },
    ],
    exampleSections: [
      {
        heading: "Starting from Dale Earnhardt Jr.",
        paragraphs: ["Suppose you start on Dale Earnhardt Jr., a superstar who never lifted the Cup. Plenty of drivers beat him to titles, so you open with Jimmie Johnson. Verified, link one."],
      },
      {
        heading: "Chaining through Kyle Busch and Joey Logano",
        paragraphs: ["From Johnson you name Kyle Busch, the 2015 champion. Link two. From Busch you go Joey Logano, the 2018 title. Link three, 300 points, Pit Crew badge."],
      },
      {
        heading: "Blanking on an older era",
        paragraphs: ["Then you blank on the older eras, gamble, and it's over at 300. Steer toward seasons you actually remember."],
      },
    ],
    tipSections: [
      {
        heading: "Anchoring on a championship season",
        items: ["Anchor on seasons. Picture the champion celebrating and who finished behind them."],
      },
      {
        heading: "Steering into the playoff era",
        items: ["The playoff era is fresh memory for most fans, so steer chains toward the 2000s and 2010s."],
      },
      {
        heading: "Saving a rare driver for later",
        items: ["Every driver is single use, so don't spend an obvious champion early if a rarer name also works."],
      },
      {
        heading: "Placing the season before you type",
        items: ["No clock runs, so place the season before you type."],
      },
    ],
    faqs: [
      {
        q: "What counts as beating someone to the title?",
        a: "Winning the Cup championship in a season your current driver competed in. Season rivals, not fender to fender finishes.",
      },
      {
        q: "Do I need an account to post a score?",
        a: "No. The leaderboard just asks for a nickname after your run ends.",
      },
      {
        q: "My answer wouldn't verify. Is my chain dead?",
        a: "No. A connection problem just means retry; nothing is lost.",
      },
    ],
  },

  '/fight-promoter': {
    intro: [
      "Fight Promoter is a free boxing matchmaking sim. You book the room, decide who fights whom, set the ticket price and pay the purses. Everything else in the building is somebody else's problem.",
      "There are two ways to fill a room and they pull against each other. Put a known fighter in with somebody who cannot live with him and the house is full on the name, the fight is over early and nobody remembers it. Make the fight people actually want and it costs you both purses, and half the time your biggest draw walks out beaten and worth far less next time.",
      "So the money says feed him and your name says make the fight. Measured in the game's own engine, a mismatch takes about 13 percent more at the door tonight and costs you six points of reputation across a career. Every fighter in it is invented.",
    ],
    headings: {
      howToPlay: "How to play Fight Promoter, a free boxing matchmaking sim",
      rules: "Fight Promoter rules for purses, names and the room",
      example: "Fight Promoter walkthrough: from a leisure centre to the arena",
      tips: "Fight Promoter tips for pricing tickets and protecting your draw",
      faq: "Fight Promoter FAQ: fighters, purses and your promotion's name",
    },
    howToPlaySections: [
      {
        heading: "Naming your promotion",
        items: ["Name the promotion. You start with 0.12m, a name worth 5 out of 100 and ten fighters who will take your calls."],
      },
      {
        heading: "Picking a room for the show",
        items: ["Pick a room. Six of them, from a 1,200 seat leisure centre up to a 78,000 seat national stadium, and each one wants a bigger name before it will have you."],
        subsections: [
          {
            heading: "Setting the ticket price",
            items: ["Set the ticket price. Too high and you have paid for an empty room, too low and you have given the night away."],
          },
        ],
      },
      {
        heading: "Building the card at matching weights",
        items: ["Build the card: pick a fighter, then pick who goes in with him. Both have to make the same weight."],
      },
      {
        heading: "Weighing the appeal before committing",
        items: ["Read the appeal number before you commit. Names sell tickets and a fight nobody can call sells tickets, and they are rarely the same match."],
      },
      {
        heading: "Reading the room after the show",
        items: ["Put the show on, then read the room. A one sided beating earns you nothing at all."],
      },
    ],
    ruleSections: [
      {
        heading: "Paying purses and covering the room",
        items: [
          "Fighters take the greater of their guarantee or 58 percent of the door, so a big night is never a windfall and a room that does not fill still owes the guarantee.",
          "The room costs its hire fee whether anybody turns up or not.",
        ],
      },
      {
        heading: "Growing your name on bigger buildings",
        items: [
          "Your name is what opens bigger buildings: 12 for the town hall, 26 for the ballroom, 45 for the arena, 68 for the dome and 86 for the stadium.",
          "Your name grows on the quality of the fights and nothing else. A full house watching a mismatch is worth almost nothing.",
        ],
        subsections: [
          {
            heading: "Judging quality by how close a fight was",
            items: ["Quality is judged mostly on how close the fight was, counted in rounds won. A knockout in a one sided fight does not rescue it."],
          },
        ],
      },
      {
        heading: "Protecting a record and losing your card",
        items: [
          "A loss costs a fighter far more drawing power than a win builds. That is why protecting a record is tempting.",
          "Fighters leave a promotion nobody rates, and they take the top of your card with them. A promotion people want to be on replaces its weakest name with somebody better.",
        ],
      },
      {
        heading: "Retirement, going broke and no betting",
        items: [
          "Nobody fights forever. They leave at 82 damage or at 39, and nobody carrying 80 damage gets matched at all.",
          "Go below zero after a show and you are out of the business.",
          "There is no betting anywhere in this game.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Filling a leisure centre on a name",
        paragraphs: ["Show one is a leisure centre. You put your best man in with a journeyman, the room is two thirds full on his name, and you clear a few thousand. Your name moves almost nothing."],
      },
      {
        heading: "Making the fight instead of feeding him",
        paragraphs: ["Four shows later you are still in the leisure centre, because feeding him has not earned you a booking anywhere bigger. So you make the fight: your draw against the best man at his weight."],
      },
      {
        heading: "A close loss that grows your name",
        paragraphs: ["He loses a close one. His drawing power halves overnight and the next card is worth less. But the fight was the best thing anyone in that room had seen, your name jumps, and the town hall takes your call."],
      },
      {
        heading: "Reaching the arena twenty shows on",
        paragraphs: ["Twenty shows on you are in the arena with fighters who would not have returned your calls at the start, and you are making the same decision again with more money on it."],
      },
    ],
    tipSections: [
      {
        heading: "Feeding somebody in the early shows",
        items: ["Early on you have to feed somebody, because you cannot afford a real fight and a bad night closes you."],
      },
      {
        heading: "Watching the projected house move",
        items: ["The ticket price has a best answer and it is not the highest one. Watch the projected house move as you drag it."],
      },
      {
        heading: "Matching close fighters and spending your draw",
        items: [
          "Two men at the same weight with ratings within about ten points is the fight worth making.",
          "Your draw is an asset with a record attached. Spend it deliberately, not by accident.",
        ],
      },
      {
        heading: "Why a damaged veteran still sells",
        items: ["A damaged veteran still sells. That is exactly why he is still on your books."],
      },
    ],
    faqs: [
      { q: "Why did a sold out show still lose money?", a: "The guarantees and the room. Fighters take the greater of their guarantee or 58 percent of the door, so a small house against big guarantees loses whatever the room looked like." },
      { q: "Why is my name not growing?", a: "Your name grows on the quality of the fights, judged mostly on how close they were. If you are feeding your draw soft opponents, you are selling tickets and building nothing." },
      { q: "Where did my best fighter go?", a: "He left for somebody bigger. Fighters walk out on a promotion nobody rates, and the better he is, the more likely he is the one who goes." },
      { q: "Are the fighters real?", a: "No. Every fighter is generated. No real boxer is matched, paid, beaten or promoted anywhere in this game, and no real venue is named." },
      { q: "Is this the same as Fight Career and Fight Gym?", a: "Same fighters and the same bouts, a third chair. In the career you take the damage, in the gym you answer for it, and here you sell tickets on it." },
    ],
  },
  '/fight-gym': {
    intro: [
      "Fight Gym is a free boxing management sim. You open a room with two young fighters nobody else wanted and enough money for a few weeks, and you decide what happens to everyone who walks through the door after that.",
      "It runs on the same fighters and the same fights as Fight Career, with one difference that changes everything: the damage lands on somebody else and the money lands on you. A hurt fighter still sells tickets. Nothing stops you putting him in again except what it does to him, and to your name.",
      "Every fighter in it is invented, including the champions and the kids the scout brings you.",
    ],
    headings: {
      howToPlay: "How to play Fight Gym, a free boxing management sim",
      rules: "Fight Gym rules for reputation, damage and your roster",
      example: "Fight Gym walkthrough: from two teenagers to two world titles",
      tips: "Fight Gym tips for timing a fighter's exit",
      faq: "Fight Gym FAQ: reputation, retirement and betting",
    },
    howToPlaySections: [
      {
        heading: "Naming your gym",
        items: ["Name the gym. You start with 0.6m, two fighters and a name worth 8 out of 100."],
      },
      {
        heading: "Signing, training or booking each week",
        items: ["Each week you can sign somebody, put a fighter through a training block for 0.035m, or find one of them a fight."],
      },
      {
        heading: "Picking three offers and three looks",
        items: ["A fight comes with three offers. Pick the night, then pick three looks the same way you would in a career."],
        subsections: [
          {
            heading: "Taking your cut of every purse",
            items: ["You take between 20 and 35 percent of every purse. The better your name, the bigger the cut."],
          },
        ],
      },
      {
        heading: "Paying the weekly bills",
        items: ["The bills arrive every week: 0.012m plus 0.009m for each fighter on the books."],
      },
      {
        heading: "Letting a fighter go before the money runs out",
        items: [
          "Let a fighter go when you think he has had enough, or keep cashing him.",
          "Run out of money and the doors close for good.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Your name setting the whole economy",
        items: ["Your name is the whole economy. It sets your cut of a purse and it sets the quality of the fighters who walk in, which runs from about 38 at the bottom to about 72 at the top."],
      },
      {
        heading: "Building reputation slower than losing it",
        items: ["Reputation is hard to build and easy to lose. Gains shrink as you climb, losses do not."],
        subsections: [
          {
            heading: "Charging the decision, not the outcome",
            items: ["Putting a fighter in carrying 55 damage costs you reputation, and 70 costs you more, whatever the result. That is charged on the decision, not the outcome."],
          },
        ],
      },
      {
        heading: "The cost of letting a wrecked man go",
        items: ["Letting a wrecked man go costs you too. There is no clean exit from a fighter you ruined."],
      },
      {
        heading: "Damage that never heals",
        items: [
          "Damage never heals, and it takes a fighter's chin down fastest.",
          "A fighter is finished at 39, or at 34 if he is already carrying 58 damage, or at 82 damage whatever his age.",
        ],
      },
      {
        heading: "A faded name, a roster cap and no betting",
        items: [
          "A fighter's purse reflects his record as well as his current form, so a faded name keeps earning long after he should have stopped. That is the trap the whole game is built around.",
          "You can carry at most six fighters.",
          "There is no betting anywhere in this game. Purses are contracts.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Week one with two teenagers",
        paragraphs: ["Week one you have two teenagers and 0.6m. You sign a third for 0.09m because the scout likes him, then start finding six rounders for all three."],
      },
      {
        heading: "Week forty and real prospects walking in",
        paragraphs: ["By week 40 your name is up near 40, the cut is better and real prospects are walking in. One of your out-boxers is ranked 6 and the purses have stopped being small."],
      },
      {
        heading: "Week seventy's costly decision",
        paragraphs: ["Week 70 and your best fighter is carrying 58 damage. He is also the biggest name you have, and the offer on the table is the best money the gym has ever seen. You take it, the crowd sees a hurt man get stopped, and your name drops further than the purse was worth."],
      },
      {
        heading: "Closing the gym at week 160",
        paragraphs: ["You close at week 160 with two world titles, eleven fighters through the door, three of whom got out clean and two who did not. The verdict says Respected, and you know exactly which night cost you Great."],
      },
    ],
    tipSections: [
      {
        heading: "Signing early before the bills arrive",
        items: ["Sign early. An empty gym has no way to earn and the bills do not wait."],
      },
      {
        heading: "Watching the damage number over the record",
        items: [
          "Watch the damage number harder than the record. It is the only thing you cannot undo.",
          "A training block is cheap next to a signing fee. Build the man you have before replacing him.",
        ],
      },
      {
        heading: "The pay off that costs more than it earns",
        items: ["The temptation is real and it is measurable: keeping a hurt fighter genuinely pays better in the short run. It just costs you more than it pays."],
      },
      {
        heading: "Letting a man go before 70 damage",
        items: ["Let a man go at around 50 damage rather than 70. The reputation hit for releasing a wrecked fighter is far worse than the purses you gave up."],
      },
    ],
    faqs: [
      { q: "Is this the same game as Fight Career?", a: "Same fighters, same fights, opposite chair. In the career the damage is yours. Here it belongs to somebody who works for you, and you are the one deciding whether he goes out again." },
      { q: "Why did my name drop when I did not lose?", a: "Putting a visibly hurt fighter in costs reputation whatever happens. It is charged on the decision, because that is the part you control." },
      { q: "Can I keep a fighter forever?", a: "No. Everyone finishes, at 39, or at 34 carrying heavy damage, or at 82 damage whenever that arrives." },
      { q: "Are the fighters real?", a: "No. Every fighter, prospect and champion is generated. No real boxer is signed, trained, damaged or retired anywhere in this game." },
      { q: "Does the game have betting?", a: "No. There is no wagering of any kind. Your income is a cut of the purse." },
    ],
  },
  '/fight-career': {
    intro: [
      "Fight Career is a free boxing career sim. You turn professional as a nobody, take one fight at a time, and try to be world champion before your body decides otherwise. Every fighter in it is invented, including the ones you beat, so nothing here is a real person's record being rewritten.",
      "The decision that runs the whole game is which fight you take. Three come in every time: a tune up that is safe and pays almost nothing, an even fight, and a step up that pays well, ranks you fast and can take years off the end of you. Damage never heals. It comes off your chin first, and it decides when you are finished.",
      "Then there is the night itself. Four styles beat each other in a circle, so there is always an answer to the man in front of you, and he adjusts to whatever you keep doing. Give him the same look three times and he will punish it.",
    ],
    headings: {
      howToPlay: "How to play Fight Career, a free boxing career sim",
      rules: "Fight Career rules for styles, damage and the ranking climb",
      example: "Fight Career walkthrough: an unranked welterweight to Modern Great",
      tips: "Fight Career tips for style matchups and managing damage",
      faq: "Fight Career FAQ: damage, title shots and betting",
    },
    howToPlaySections: [
      {
        heading: "Creating your fighter's weight class and style",
        items: ["Make your fighter: a name, one of 8 weight classes from flyweight to heavyweight, and one of 4 styles."],
      },
      {
        heading: "Reading the three fight offers",
        items: ["Read the three offers. Each one names the opponent, his style, the purse and how far a win moves you up the rankings."],
      },
      {
        heading: "Spending six weeks of camp",
        items: ["Spend 6 weeks of camp across conditioning, power, defence and speed before every fight."],
      },
      {
        heading: "Picking three looks for fight night",
        items: ["Pick three looks for the night. They cycle through the rounds, so three different ones is a plan and one repeated is a gift."],
      },
      {
        heading: "Watching it live before the final verdict",
        items: ["Watch it round by round, or turn that off and take the decision straight away."],
        subsections: [
          {
            heading: "What ends a career and reads the verdict",
            items: ["Keep going until the damage, the years or a run of defeats ends it, then read the verdict on your career."],
          },
        ],
      },
    ],
    ruleSections: [
      {
        heading: "The circle of styles beating each other",
        items: ["Pressure beats an out-boxer, boxing beats a swarmer, countering beats a slugger, and brawling beats a counter-puncher. It closes into a circle, so no look is simply the best one."],
      },
      {
        heading: "An opponent who adjusts to your looks",
        items: ["Your opponent does not stand still. A fighter with real ring IQ will switch into whatever punishes the look you used last round, so repeating yourself is the worst thing you can do."],
      },
      {
        heading: "Damage that never heals",
        items: [
          "Damage is permanent and cumulative. It never heals, it takes your chin down fastest, and at 82 you are done whatever your age says.",
          "You are also finished at 41, or at 35 if you are already carrying 58 damage, or after three straight defeats once you have dropped out of the top 12.",
        ],
      },
      {
        heading: "Camp growth against a hidden ceiling",
        items: ["Camp growth runs against a hidden ceiling. Every fighter has one, camp moves you toward it and never past it, and the closer you get the less each camp is worth."],
        subsections: [
          {
            heading: "Why padding a record stalls out",
            items: ["Beating a man well below your level does not move you once you are inside the top 10. Padding a record stalls on purpose."],
          },
        ],
      },
      {
        heading: "Reaching number one for a world title",
        items: [
          "Reach number one and every offer on the table is for a world title, whichever road got you there.",
          "A world champion is drawn from the top of the sport in absolute terms, not from a notch above you, so the belt does not get easier because you did.",
          "There is no betting anywhere in this game. Purses and offers are contracts, not wagers.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Starting as an unranked welterweight",
        paragraphs: ["You start as a 21 year old welterweight out-boxer, unranked, and take the tune up. The purse is small and the win moves you one place, but you come out of it almost unmarked."],
      },
      {
        heading: "Learning the circle at number eleven",
        paragraphs: ["Three even fights later you are ranked 11 and you have learned the circle: the swarmer in front of you gets boxed, and when he starts switching you give him something else instead of the same jab for ten rounds."],
      },
      {
        heading: "Winning the title at number one",
        paragraphs: ["At number one you get three title offers. You take the middle one, put the champion down in the eighth, and win a decision you will feel for the rest of your life. Damage 44, and it is not coming back off."],
      },
      {
        heading: "Retiring a Modern Great",
        paragraphs: ["Four defences later you are 31 with 71 damage, the chin is gone and a challenger you would have beaten at 26 stops you in five. You retire with a title, four defences and a verdict that says Modern Great."],
      },
    ],
    tipSections: [
      {
        heading: "Taking the safe fights early",
        items: ["Take the safe fights early. You are trying to reach a title shot with a chin, not to prove something at 22."],
      },
      {
        heading: "Never repeating the same look twice",
        items: ["Never give the same look twice in a row against anyone who can think. Three different looks beat one good one."],
        subsections: [
          {
            heading: "Reading the damage bar over the record",
            items: ["Watch the damage bar more than the record. A 20-0 fighter carrying 70 damage is closer to the end than a 16-4 who stayed sharp."],
          },
        ],
      },
      {
        heading: "Spreading or piling your camp",
        items: ["Spread your camp when you need to last, and pile it into one area when you need an edge in a fight you should lose."],
      },
      {
        heading: "Why who you beat outweighs how many",
        items: ["Who you beat is worth far more than how many you beat. A long unbeaten run against nobody scores worse than a hard career against contenders."],
      },
    ],
    faqs: [
      { q: "Are the fighters real?", a: "No. Every fighter in the game is generated, including your opponents and the champions. No real boxer is simulated, ranked, aged or beaten anywhere in it." },
      { q: "Can I heal the damage?", a: "No, and that is the point of the game. Damage is permanent, it takes your chin first, and it is the price of every hard fight you took to get where you are." },
      { q: "Why will he not fight me for the title?", a: "Beating opponents well below your level stops moving you once you are in the top 10. You need real wins to reach number one, and once you are there every offer is for the belt." },
      { q: "Is there a daily?", a: "Yes. Fight Night is one three round bout per day, the same fighter and the same opponent for everybody, scored out of 100 on whether you won, how many rounds you took, whether you finished him, how little you took back and how well you read his style." },
      { q: "Does the game have betting?", a: "No. There is no wagering of any kind in it. The purse is what you are paid to fight." },
    ],
  },
  '/ufc': {
    intro: [
      "You get eight guesses to name a mystery UFC fighter, and every guess talks back. Each attempt lights up a row of stats showing exactly how close you landed.",
      "Green means you matched the mystery fighter's stat, yellow means close, red means off target, and little arrows tell you whether the real number sits higher or lower. It's deduction, not luck.",
    ],
    headings: {
      howToPlay: "How to play UFC Guesser, a free daily MMA guessing game",
      rules: "UFC Guesser rules for guesses, colors and the fighter pool",
      example: "UFC Guesser walkthrough: from Conor McGregor to Khabib Nurmagomedov",
      tips: "UFC Guesser tips for narrowing down a mystery fighter",
      faq: "UFC Guesser FAQ: stats, ages, the fighter pool and more",
    },
    howToPlaySections: [
      {
        heading: "Choosing Daily or Unlimited mode",
        items: ["Pick Daily for the fighter everyone is chasing today, or Unlimited for a random one each game."],
      },
      {
        heading: "Submitting your opening probe",
        items: ["Search any fighter and submit them as your opening probe."],
      },
      {
        heading: "Reading every stat in the row",
        items: ["Read the row: years active, weight class, nationality, age, wins, losses, draws, knockouts and submissions."],
      },
      {
        heading: "Following the arrows higher or lower",
        items: ["Follow the arrows on numeric stats to aim your next guess higher or lower."],
      },
      {
        heading: "Closing the net within eight guesses",
        items: ["Close the net within 8 guesses, or use Give Up to see the answer."],
      },
    ],
    ruleSections: [
      {
        heading: "Eight guesses in both modes",
        items: ["8 guesses maximum, in both Daily and Unlimited."],
      },
      {
        heading: "What a yellow, close call means",
        items: ["Yellow means close: one weight class off, same continent, within 2 years on age or career length, 3 wins, 2 losses, 1 draw, 3 knockouts or 2 submissions."],
      },
      {
        heading: "Saving progress until midnight",
        items: ["Daily progress is saved through the day and a new fighter arrives at midnight Eastern."],
      },
      {
        heading: "Spanning all nine weight divisions",
        items: ["The pool spans all nine weight divisions, strawweight to heavyweight, women's stars included."],
      },
    ],
    exampleSections: [
      {
        heading: "Opening with Conor McGregor",
        paragraphs: ["Suppose the mystery fighter is Khabib Nurmagomedov and you open with Conor McGregor. Weight class comes back green at lightweight, age and career length green, nationality yellow for the right continent, and the record cells glow red with arrows demanding more wins, fewer losses and more submissions."],
      },
      {
        heading: "Narrowing to a European lightweight",
        paragraphs: ["So you're hunting a European lightweight from McGregor's era with a spotless record and a pile of submissions."],
      },
      {
        heading: "Solving it as Khabib Nurmagomedov",
        paragraphs: ["An undefeated Russian grappler fits every cell. Khabib in two guesses."],
      },
    ],
    tipSections: [
      {
        heading: "Opening with a fighter you know well",
        items: ["Open with a fighter you know inside out so you can interpret every cell."],
        subsections: [
          {
            heading: "Using the weight class arrow as a filter",
            items: ["The weight class arrow is the fastest filter in the game; two guesses can pin the division."],
          },
        ],
      },
      {
        heading: "Reading a red loss cell pointing to zero",
        items: ["A red loss cell pointing down toward zero screams elite champion."],
      },
    ],
    faqs: [
      {
        q: "How is a fighter's age worked out?",
        a: "From their date of birth, on the day you play, so it is always their age today. Years active runs from their first UFC fight to their latest one.",
      },
      {
        q: "Are women fighters in the pool?",
        a: "Yes. Amanda Nunes is in there, so don't assume the answer is a man.",
      },
      {
        q: "If I close the tab mid-puzzle, do I lose my guesses?",
        a: "No. Progress is stored on your device for the day; the puzzle resets at midnight Eastern.",
      },
    ],
  },

  '/ufc-chain': {
    intro: [
      "Fight fans keep receipts. Combat Chain is those receipts turned into a game: name a fighter who beat your current fighter, then a fighter who beat them, building the longest chain of real results you can.",
      "Wins are checked against the game's own record book, and one wrong answer ends the run. No timer, just you and the history of the sport.",
    ],
    headings: {
      howToPlay: "How to play Combat Chain, a free MMA fight result game",
      rules: "Combat Chain rules for scoring, badges and Weight Class mode",
      example: "Combat Chain walkthrough: McGregor, Poirier and an unbeaten wall",
      tips: "Combat Chain tips for title fights and undefeated legends",
      faq: "Combat Chain FAQ: verified wins, modes and the leaderboard",
    },
    howToPlaySections: [
      {
        heading: "Picking a mode to start the chain",
        items: ["Pick a mode: Daily (same start for everyone), Unlimited, Weight Class (one division only), or Hall of Fame (legends only)."],
      },
      {
        heading: "Recalling who beat your current fighter",
        items: ["Recall who has actually beaten your current fighter."],
      },
      {
        heading: "Submitting a name for a verified defeat",
        items: ["Submit a name. A verified defeat adds the winner to your chain and hands them the spotlight."],
      },
      {
        heading: "Repeating until you miss or bank it",
        items: ["Repeat until you miss, reuse a fighter, or bank your score with Give Up."],
      },
      {
        heading: "Saving your run for the leaderboard",
        items: ["Save your run with a nickname to enter the top 10 leaderboard."],
      },
    ],
    ruleSections: [
      {
        heading: "Scoring points and a title fight bonus",
        items: ["Each correct link scores 100 points, plus a 50 point bonus when the win came in a championship fight."],
      },
      {
        heading: "Multiplying the total as the chain grows",
        items: ["The total multiplies by 1.5 at a chain of 5 and by 2 at 10."],
      },
      {
        heading: "What a wrong answer reveals",
        items: ["A wrong answer ends the run and reveals a fighter who would have worked."],
      },
      {
        heading: "Weight Class mode's eight divisions",
        items: ["Weight Class mode offers 8 divisions, flyweight through heavyweight."],
        subsections: [
          {
            heading: "Earning badges along the chain",
            items: ["Badges: On A Roll at 3 links, Contender at 5, Champion at 10, GOAT at 15."],
          },
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Starting on Conor McGregor",
        paragraphs: ["Say you start on Conor McGregor. Dustin Poirier stopped him in 2021, so that's a clean first link: 100 points."],
      },
      {
        heading: "Chaining to Khabib Nurmagomedov",
        paragraphs: ["Who beat Poirier? Khabib Nurmagomedov submitted him in a title fight, and championship wins pay extra: 150 more for 250 total."],
      },
      {
        heading: "Hitting an unbeaten legend's dead end",
        paragraphs: ["Now the problem: Khabib retired undefeated, so nobody in the book has beaten him. You cash out at 250. Chaining into an unbeaten legend is a beautiful dead end."],
      },
    ],
    tipSections: [
      {
        heading: "Preferring the championship answer",
        items: ["Title fight wins pay 50 extra, so prefer the championship answer when you have options."],
      },
      {
        heading: "Watching for an undefeated wall",
        items: ["Watch for undefeated walls. A fighter with zero losses ends your chain on the spot."],
      },
      {
        heading: "Saving a well connected name",
        items: ["Fighters are single use per run; don't burn a well connected name early."],
      },
    ],
    faqs: [
      {
        q: "My answer really did beat that fighter. Why didn't it count?",
        a: "The game checks its own built-in fight database, not the whole internet. A bout missing from the book won't verify even if it happened.",
      },
      {
        q: "What's different about Hall of Fame mode?",
        a: "Your starter and every answer must be one of the game's flagged legends, so valid links get much scarcer.",
      },
      {
        q: "How do I get on the leaderboard?",
        a: "Finish a run and enter a nickname. Chains rank by length, with score breaking ties.",
      },
    ],
  },
};
