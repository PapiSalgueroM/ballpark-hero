import type { GameContentMap } from './types';

// Hockey game guides. Casual human tone, no em dashes anywhere.
export const HOCKEY_CONTENT: GameContentMap = {
  '/perfect-season-nhl': {
    intro: [
      "The wheel owns your draft. Every spin lands on a real NHL franchise and one decade of its history, and you take exactly one player before it moves on.",
      "Fill six slots from a century of hockey, then the sim plays the 82 game season. 82-0 does happen, but it takes a stacked lineup and some luck, and every result prints your odds.",
    ],
    headings: {
      howToPlay: "How to play 82-0 NHL Perfect Season, a free hockey wheel and draft game",
      rules: "82-0 NHL Perfect Season rules: the wheel, the slots and the 82 games",
      example: "82-0 NHL Perfect Season walkthrough: a spin, a reroll and a near miss",
      tips: "82-0 NHL Perfect Season tips for building a run that stays perfect",
      faq: "82-0 NHL Perfect Season FAQ: rerolls, Hard mode and the Daily",
    },
    howToPlaySections: [
      {
        heading: "Choose Classic, Hard or Daily mode",
        items: [
          "Pick a mode: Classic, Hard (ratings hidden) or Daily (one shared attempt).",
        ],
      },
      {
        heading: "Spin for a franchise and its era",
        items: [
          "Spin the wheel. It stops on a franchise and era, like the 1980s Oilers.",
        ],
      },
      {
        heading: "Draft skaters and goalies into six slots",
        items: [
          "Draft one player from that squad into an open slot. Skaters rate 40 to 99 off real career scoring; goalies rate on draft pedigree.",
          "Repeat until you have a center, both wings, two defensemen and a goalie.",
        ],
        subsections: [
          {
            heading: "Use a reroll when a squad falls short",
            items: [
              "Use your 2 rerolls if a squad gives you nothing.",
            ],
          },
        ],
      },
      {
        heading: "Watch the sim play out all 82 games",
        items: [
          "Let the sim run all 82 games and hand down your record.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Six slots with the goalie weighted heaviest",
        items: [
          "6 lineup slots, with the goalie weighted heaviest in your team overall.",
        ],
      },
      {
        heading: "One player per spin and two rerolls",
        items: [
          "One player per spin, no player in two slots, and 2 rerolls per run.",
        ],
      },
      {
        heading: "Simulated games and the Daily attempt",
        items: [
          "The season is 82 simulated games; a higher overall wins more, but perfection also needs luck.",
          "Daily mode allows one attempt per day with a rotating theme and resets at midnight Eastern.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "An early spin lands the 1980s Oilers",
        paragraphs: [
          "Say the first spin lands on the 1980s Oilers and you grab a 99 rated center. Two spins later a thin squad costs a reroll, and you settle for an 85 defenseman.",
        ],
      },
      {
        heading: "A 93 overall falls one win short of perfect",
        paragraphs: [
          "You finish at 93 overall. The sim rips off 38 straight, drops game 39, and closes 80-2. The result card says so close, two bad nights, and reminds you that at 93 an 82-0 comes about one run in 19. You wanted the banner.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Never settle for a weak goalie",
        items: [
          "Never settle in net. A weak goalie sinks five good skaters.",
        ],
      },
      {
        heading: "Save rerolls for late and stay flexible",
        items: [
          "Spend rerolls late, when only a slot or two remains open.",
          "Players listed at F or W can cover several forward slots, which keeps early spins flexible.",
        ],
      },
      {
        heading: "Trust the eras when playing Hard mode",
        items: [
          "In Hard mode, trust eras: dead puck 2000s scorers get a quiet ratings boost, while inflated 1980s numbers get trimmed.",
        ],
      },
    ],
    faqs: [
      {
        q: "How realistic is an actual 82-0 run?",
        a: "It depends on your overall, and the goalie counts most. An 88 lineup goes 82-0 about one run in 3,900, a 90 about one run in 250 and a 93 about one run in 19. Most well drafted lineups land between 81 and 91, and the result card prints the odds for the lineup you actually drafted.",
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
    headings: {
      howToPlay: "How to play Puck Detective, a free NHL mystery player guessing game",
      rules: "Puck Detective rules: clues, chips and the daily mystery player",
      example: "Puck Detective walkthrough: reading the chips on an NHL guess",
      tips: "Puck Detective tips for narrowing the NHL mystery player fast",
      faq: "Puck Detective FAQ: difficulty tiers, saves and the daily reset",
    },
    howToPlaySections: [
      {
        heading: "Type a player and read the five chips",
        items: [
          "Type an NHL player and pick him from the suggestions.",
          "Read the chips. A green check means an exact match, a gray X means no match.",
        ],
      },
      {
        heading: "Watch position, age and jersey number clues",
        items: [
          "Position can show a yellow dash: right group (forward, defense or goalie), wrong spot.",
          "Arrows on age and jersey point toward the mystery player: up means his number is higher than your guess.",
        ],
      },
      {
        heading: "Narrow it down within eight guesses",
        items: [
          "Keep narrowing and land the exact player within 8 guesses.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Eight guesses and five clues each time",
        items: [
          "8 guesses per puzzle, in both daily and unlimited.",
          "Five clues per guess: team, position, nationality, age and jersey number.",
        ],
      },
      {
        heading: "Exact matches except for one close tier",
        items: [
          "Team and nationality are exact or nothing; only position has a close tier.",
        ],
      },
      {
        heading: "Unlimited mode tracks your streaks",
        items: [
          "Unlimited mode tracks your current and best win streak, with Easy, Normal and Hard pools.",
        ],
        subsections: [
          {
            heading: "The daily player resets at midnight",
            items: [
              "The daily player is the same for everyone and changes at midnight Eastern.",
            ],
          },
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Opening with Sidney Crosby",
        paragraphs: [
          "Say you open with Sidney Crosby. The team chip stays gray, position flashes yellow, Canada goes green, the age arrow points down and the jersey arrow points up.",
        ],
      },
      {
        heading: "Reading the arrows into a winger guess",
        paragraphs: [
          "Translation: a younger Canadian forward who is not a center and wears a bigger number than 87. Two probing winger guesses later, the whole row turns green on guess five.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Open with a name you know cold",
        items: [
          "Open with a player you know cold. The information matters more than the guess itself.",
        ],
      },
      {
        heading: "Bracket the age with two guesses",
        items: [
          "Bracket the numbers: one older guess and one younger guess pin the age range fast.",
        ],
      },
      {
        heading: "Read gray countries and yellow positions",
        items: [
          "A green country is nice, but a gray one is bigger; it deletes whole nations from the pool.",
          "Yellow on position means stay in the group. Swap center for winger before abandoning forwards.",
        ],
      },
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
    headings: {
      howToPlay: "How to play NHL Franchise Grid, a free hockey trivia grid game",
      rules: "NHL Franchise Grid rules: guesses, categories and the daily board",
      example: "NHL Franchise Grid walkthrough: nine cells and one hunch",
      tips: "NHL Franchise Grid tips for naming players under pressure",
      faq: "NHL Franchise Grid FAQ: guesses, eligible players and the daily grid",
    },
    howToPlaySections: [
      {
        heading: "Read where a row meets a column",
        items: [
          "Look at where a row meets a column, like Bruins plus Canadiens, or Oilers plus 500+ Career Points.",
        ],
      },
      {
        heading: "Type a player who fits both categories",
        items: [
          "Tap the cell and type a player whose career fits both.",
        ],
      },
      {
        heading: "Lock in green or burn a guess",
        items: [
          "A correct pick locks the cell in green. A miss burns one of your 9 guesses.",
        ],
        subsections: [
          {
            heading: "Use every player name only once",
            items: [
              "Each player name can only be used once per board.",
            ],
          },
        ],
      },
      {
        heading: "Fill all nine cells before you run out",
        items: [
          "Fill all 9 cells before the misses run out.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Nine guesses and only misses count",
        items: [
          "You get 9 guesses, and only wrong answers spend one; correct answers are free.",
        ],
      },
      {
        heading: "Franchises and career milestone categories",
        items: [
          "Categories come from a pool of 16 franchises plus three milestones: 500+ career points, 300+ career goals and 1000+ games played.",
        ],
      },
      {
        heading: "The daily board and unlimited tiers",
        items: [
          "The daily grid mixes one milestone with five franchises, and everyone gets the same board until midnight Eastern.",
          "Unlimited mode adds difficulty tiers: Easy runs two milestone lines, Hard goes all franchises.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Rows of Leafs, Oilers and Bruins",
        paragraphs: [
          "Imagine rows of Maple Leafs, Oilers and Bruins against columns of Red Wings, Canadiens and 500+ Career Points. Oilers plus 500 points is a layup: Jari Kurri.",
        ],
      },
      {
        heading: "Closing it out nine for nine",
        paragraphs: [
          "Maple Leafs plus Red Wings takes a traveler like Larry Murphy, and Bruins plus Canadiens rewards remembering that Mark Recchi wore both sweaters. You burn one guess on a hunch who never actually played in Detroit, then close it out 9 for 9.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Franchise cells reward late career trades",
        items: [
          "Franchise pair cells love journeymen. Think late career trades, not one club legends.",
        ],
      },
      {
        heading: "Milestone cells are your safety valve",
        items: [
          "Milestone cells are your safety valve; every franchise in the pool has plenty of 500 point scorers.",
          "There is no rarity bonus, so play the safest name you know.",
        ],
      },
      {
        heading: "Any era counts in the career database",
        items: [
          "Answers check instantly against the career database, and any era counts, from Original Six days to last season.",
        ],
      },
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
    headings: {
      howToPlay: "How to play NHL Career Path, a free mystery hockey player guessing game",
      rules: "NHL Career Path rules: scoring, clues and the daily hockey player",
      example: "NHL Career Path walkthrough: two clues to Connor McDavid",
      tips: "NHL Career Path tips for scoring big on the mystery hockey player",
      faq: "NHL Career Path FAQ: guesses, names and Hard mode",
    },
    howToPlaySections: [
      {
        heading: "Start from the position clue alone",
        items: [
          "Start with a single clue: the position.",
        ],
      },
      {
        heading: "Guess anytime for free",
        items: [
          "Guess by typing a name whenever you like; wrong guesses cost nothing.",
        ],
      },
      {
        heading: "Reveal clues at a cost to your score",
        items: [
          "Or reveal the next clue. Each reveal knocks 150 points off your potential score.",
        ],
        subsections: [
          {
            heading: "Clues arrive in a fixed order",
            items: [
              "Clues arrive in order: country, draft, teams (one more team per reveal), career stats, then awards.",
            ],
          },
        ],
      },
      {
        heading: "Land the name or give up to see it",
        items: [
          "Land the name for the remaining points, or give up to see the answer.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Scoring from 1000 down to a floor of 100",
        items: [
          "Scoring starts at 1000, drops 150 per revealed clue and never goes below 100.",
          "There are up to 6 reveals beyond the starting position clue.",
        ],
      },
      {
        heading: "Wrong guesses cost you nothing",
        items: [
          "Wrong guesses are unlimited and free, and a last name alone counts.",
        ],
      },
      {
        heading: "The daily player and Hard mode",
        items: [
          "The daily player is shared worldwide, saves in your browser and flips at midnight Eastern; unlimited deals random players.",
          "Hard mode hides the two easiest clues from the board without touching the scoring.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "A thin position clue points to a country",
        paragraphs: [
          "Say the position reads center. Too thin, so you reveal country: Canada. Still huge, so you buy the draft clue: first overall, 2015.",
        ],
      },
      {
        heading: "Two reveals spent, seven hundred banked",
        paragraphs: [
          "That is Connor McDavid and you know it. Two reveals spent means 700 points on the table, and typing McDavid banks all of them.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "The draft clue is the loudest tell",
        items: [
          "The draft clue is the loudest tell. A famous year and pick can end the game on the spot.",
        ],
      },
      {
        heading: "Guess constantly, reveal sparingly",
        items: [
          "Guess constantly. Wrong answers are free, reveals are not.",
        ],
      },
      {
        heading: "Teams reveal in career order",
        items: [
          "Teams appear in career order, so the first club revealed is where it all started.",
          "The 100 point floor means you should never quit; a fully revealed win still pays something.",
        ],
      },
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
    headings: {
      howToPlay: "How to play NHL Higher or Lower, a free hockey trivia comparison game",
      rules: "NHL Higher or Lower rules: scoring, streaks and the daily matchups",
      example: "NHL Higher or Lower walkthrough: Jagr's points against Hull's goals",
      tips: "NHL Higher or Lower tips for reading career point totals",
      faq: "NHL Higher or Lower FAQ: scoring, ties and Hard mode",
    },
    howToPlaySections: [
      {
        heading: "Compare two players side by side",
        items: [
          "Look at the two players: name, position, country and teams.",
        ],
      },
      {
        heading: "Pick the higher career point total",
        items: [
          "Tap the one you think has more career points, meaning goals plus assists.",
        ],
      },
      {
        heading: "Watch the totals reveal before the next pair",
        items: [
          "Both totals flash up for a couple of seconds, then the next pair skates in.",
        ],
        subsections: [
          {
            heading: "Score points and build a streak bonus",
            items: [
              "Correct picks pay 10 points each, and streaks pay extra on top.",
            ],
          },
        ],
      },
      {
        heading: "Finish ten rounds and share your score",
        items: [
          "Ten rounds, then share your score.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Ten rounds worth ten points each",
        items: [
          "10 rounds per game and 10 points per correct answer.",
        ],
      },
      {
        heading: "A growing streak bonus tops out at 325",
        items: [
          "The streak bonus grows: your second straight correct adds 5, the third adds 10, and so on.",
          "A perfect 10 with an unbroken streak scores exactly 325.",
        ],
      },
      {
        heading: "Ties count and the daily matchups reset",
        items: [
          "Dead ties count as correct no matter which side you pick.",
          "Daily serves the same 10 matchups to everyone until midnight Eastern; Hard mode, unlimited only, builds close-gap pairs.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Jagr's points beat Hull's goals",
        paragraphs: [
          "Round one, say it is Jaromir Jagr against Brett Hull. Hull's 741 goals scream at you, but points is the stat, and Jagr's 1921 buries Hull's 1391.",
        ],
      },
      {
        heading: "Six straight before a coin flip pair",
        paragraphs: [
          "You ride that logic to six straight before a coin flip pair snaps the run. Final: 8 of 10 with a fat streak bonus, plus one matchup you will argue about all day.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Points means goals plus assists",
        items: [
          "Points means goals plus assists. Playmakers sneak past pure goal scorers.",
        ],
      },
      {
        heading: "Longevity beats a short hot streak",
        items: [
          "Longevity wins these. Twenty seasons of good usually beats eight seasons of great.",
        ],
      },
      {
        heading: "Watch positions and guard your streak",
        items: [
          "Watch positions: an offensive defenseman can out-point a checking forward, but forwards win most pairs.",
          "Guard a live streak. The bonus grows every round it survives, so the late rounds are worth the most.",
        ],
      },
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
    headings: {
      howToPlay: "How to play NHL Connections, a free hockey grouping puzzle game",
      rules: "NHL Connections rules: groups, lives and the daily puzzle",
      example: "NHL Connections walkthrough: five Penguins and a hidden trap",
      tips: "NHL Connections tips for spotting the overlap trap",
      faq: "NHL Connections FAQ: group size, lives and the reset",
    },
    howToPlaySections: [
      {
        heading: "Study the board of twenty names",
        items: [
          "Study the board of 20 names.",
        ],
      },
      {
        heading: "Submit five players who share a link",
        items: [
          "Select exactly 5 players you believe share a connection and submit.",
        ],
      },
      {
        heading: "Lock in a group or lose a life",
        items: [
          "A correct five locks in with its color and theme. A wrong five costs one of your 4 lives.",
        ],
        subsections: [
          {
            heading: "Colors rank the four groups by difficulty",
            items: [
              "Colors rank difficulty: yellow easiest, then green, blue and purple.",
            ],
          },
        ],
      },
      {
        heading: "Clear every group before the lives run out",
        items: [
          "Clear all four groups before the lives run out.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Twenty players, four groups of five",
        items: [
          "The board is always 20 players forming exactly four groups of 5.",
        ],
      },
      {
        heading: "Four lives and no partial hints",
        items: [
          "You have 4 lives, every wrong submission costs one, and there are no partial hints.",
        ],
      },
      {
        heading: "A reveal at zero lives and the daily reset",
        items: [
          "Losing the last life reveals the remaining groups so you can see what got you.",
          "The daily puzzle is identical for everyone and rolls over at midnight Eastern; unlimited mode deals random boards from the pool.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Five Penguins look automatic",
        paragraphs: [
          "Say you spot five Penguins right away: Crosby, Malkin, Lemieux, Jagr and Fleury. Feels automatic, except the purple group on this imagined board is 1,000 point scorers, and Jagr fits both worlds.",
        ],
      },
      {
        heading: "Letting elimination settle the trap",
        paragraphs: [
          "The safe play is solving the scorers first and letting elimination sort Jagr out. That is the whole game in one decision.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Submit the group you can name in full",
        items: [
          "Submit the group where you can name all five, not the one with three locks and two hopes.",
        ],
      },
      {
        heading: "Assume the overlap is intentional",
        items: [
          "Assume the overlap is intentional. The player who fits two themes is the trap.",
          "Think about purple early. Spotting the sneaky link protects your easy groups.",
        ],
      },
      {
        heading: "Let elimination settle a shared name",
        items: [
          "When two groups fight over one name, solve the other group first and let elimination decide.",
        ],
      },
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
    headings: {
      howToPlay: "How to play NHL Conquest, a free hockey territory prediction game",
      rules: "NHL Conquest rules: scoring, seeding and the Daily Challenge",
      example: "NHL Conquest walkthrough: an empire lost and won back",
      tips: "NHL Conquest tips for picking winners and holding territory",
      faq: "NHL Conquest FAQ: the Daily Challenge, landless teams and the map",
    },
    howToPlaySections: [
      {
        heading: "Pick your team from all 32 clubs",
        items: [
          "Pick your team from all 32.",
        ],
      },
      {
        heading: "Call your featured game each round",
        items: [
          "Each round, call the winner of your featured game before it plays. Correct calls pay 25 score.",
        ],
      },
      {
        heading: "Watch every loser hand over its land",
        items: [
          "Watch the whole league's results redraw the map; every loser hands over every territory it owned.",
        ],
        subsections: [
          {
            heading: "Survive 16 rounds to seed a playoff",
            items: [
              "Survive 16 rounds. The top 8 empires seed a playoff.",
            ],
          },
        ],
      },
      {
        heading: "Win three rounds to lift the Imperial Cup",
        items: [
          "Win the Quarterfinals, Semifinals and the Imperial Cup Final to rule the map.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Every loss transfers the whole empire",
        items: [
          "16 regular rounds, and every game transfers the loser's entire empire to the winner.",
        ],
      },
      {
        heading: "Five clubs start landless as invaders",
        items: [
          "Toronto, Ottawa, Edmonton, Vancouver and Buffalo start landless as the invaders.",
        ],
      },
      {
        heading: "Seeding, scoring and how goals fall",
        items: [
          "Playoff seeding takes the 8 biggest empires, with win-loss record breaking ties.",
          "Final score: 3 per territory held, 25 per correct call, 50 for making the playoffs, 200 for winning it all.",
          "Winners score 2 to 7 goals, overtime games finish one goal apart, and ties do not exist.",
        ],
      },
      {
        heading: "The Daily Challenge and Free Play",
        items: [
          "The Daily Challenge deals every player the same date-seeded season: same starting map, same fixtures, same results. One scored run per day with streaks. Free Play is unlimited and fully random.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "An empire vanishes in one night",
        paragraphs: [
          "Say you ride the Avalanche. Round 3 they lose a coin flip and the whole empire vanishes in one night. Round 5 they win, and because that opponent had been hoarding, you inherit more land than you lost.",
        ],
      },
      {
        heading: "A landless team swallows an empire whole",
        paragraphs: [
          "Meanwhile Edmonton, landless since round 1, finally wins in round 9 and swallows an empire whole. That is the invader life: nothing to lose, everything to take.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Call favorites for the safest points",
        items: [
          "Call favorites. Upsets pay the same 25, and the percentages shown come from team strength plus home ice.",
        ],
      },
      {
        heading: "Never quit on a wiped out team",
        items: [
          "Never quit on a wiped-out team. The format is built for comebacks.",
        ],
      },
      {
        heading: "Territory decides seeding, even in the playoffs",
        items: [
          "Check the standings: territories decide seeding first, so a fat empire matters more than a pretty record.",
          "Playoff games transfer land too, so the eventual champion usually ends up owning most of the map.",
        ],
      },
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
    headings: {
      howToPlay: "How to play NHL My Career, a free hockey career simulation game",
      rules: "NHL My Career rules: aging, money and the legacy score",
      example: "NHL My Career walkthrough: a Sniper's road to the Cup",
      tips: "NHL My Career tips for durability, morale and free agency",
      faq: "NHL My Career FAQ: eras, badges and the rival player",
    },
    howToPlaySections: [
      {
        heading: "Create your player",
        items: [
          "Create your player: name, one of 5 positions (C, LW, RW, D, G), and one of 17 archetypes, from Generational Talent to The Agitator to The Workhorse in net.",
        ],
        subsections: [
          {
            heading: "Pick today's NHL or the old 2006 throwback",
            items: [
              "Pick your league: today's NHL, or the 2006-07 throwback with the Thrashers in Atlanta and the Coyotes in Phoenix, before Vegas or Seattle existed.",
            ],
          },
        ],
      },
      {
        heading: "Shop your look and work the Bank",
        items: [
          "Build your look, then spend the money in 7 aisles including a shady one that only appears once you have something to hide.",
          "Open the Bank between seasons. Savings pays 2.5% a season and never loses, five things you can put money into each have a price that moves every season whether you look or not (a fund, flats back home, two shares and a coin that halves as often as it doubles), the statement keeps your last 12 moves, and the card school at the back of the plane is one sitting a season on odds that are printed before you sit in.",
        ],
      },
      {
        heading: "Read the News box and chase badges",
        items: [
          "Read the News box. The paper writes up every season in your own position's stat, the SocialGram shows followers read off your fanbase with three fan comments under the latest post, and the rival's card keeps the head to head against the player drafted the same year as you.",
          "Collect badges in the Trophy Case: 23 of them, from a first Cup and the Calder to 500 goals, a 50 goal season and $100M to your name, each lit the moment the facts of your career say so.",
        ],
        subsections: [
          {
            heading: "Answer your phone on the hockey calendar",
            items: [
              "Answer your phone. Texts from your agent, the head coach, the GM, a teammate or your mom land on the beats of the hockey year: draft day, camp, the World Juniors while you are young enough to go, the All-Star break, the trade deadline, the playoffs if you get there, the offseason, and the summer before the last year of your deal. Every text says which beat and which year it came in on, and how you answer moves your karma, morale, fanbase or bank.",
            ],
          },
          {
            heading: "Make the call when your rival forces one",
            items: [
              "Some seasons your rival forces a decision instead of making a headline: a cheap shot after the whistle you can settle or shrug off, a debate show offering real money, a youth clinic his foundation wants you to co-host, an All-Star vote his club is buying ads for. Every button prints exactly what it moves, and a gamble prints its odds.",
            ],
          },
        ],
      },
      {
        heading: "Get drafted and win the lineup battle",
        items: [
          "Get drafted by a real club; your slot reflects your starting ability.",
          "Check the lineup. Top ten skaters step straight in; everyone else fights the incumbent in camp every fall. Goalies always apprentice first, because no rookie walks into a number one crease.",
        ],
      },
      {
        heading: "Play seasons, offseasons and free agency",
        items: [
          "Play each season: skaters post goals, assists and points, goalies post wins and save percentage.",
          "Face up to three offseason decisions each year, one card at a time: training, trade requests, media noise. Only the first card can move your rating, and a card you just saw rests for a while (press moments follow your season, so those can come right back).",
          "After a normal offseason choice, the result shows the actual changes. Expand it for any extra changes, then Continue opens the next card, or takes you back to your career after the last one, without applying the choice again.",
          "Open Career Log and pick a year to review its saved overview, regular season and postseason. Changes compare with the previous saved season; older missing values say Not recorded. Back to seasons returns to the year tiles, and Review seasons is available after retirement.",
          "When the deal expires, hit July 1 for real: competing offers from named clubs with their own money, length and roster quality, and one push for more on any of them.",
          "Age, decline, answer the retirement talk, then read the legacy verdict and wait on the Hall of Fame ballot.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Careers start young and can run long",
        items: [
          "Careers start in 2026 at age 18 or 19 and last up to 22 seasons. The throwback starts in 2006 instead, inside a sealed 30 team league verified against the real season, with 2006 sized contracts.",
          "You improve toward your potential through age 25; decline starts at 31 for skaters, 34 for goalies.",
        ],
      },
      {
        heading: "The lineup and the press are both real",
        items: [
          "The lineup is real: fourth-line seasons run on half the ice time, a backup goalie gets twenty-odd starts, camps have memory both ways, and signing with a stacked Cup contender can cost a mid player his spot.",
          "The press reads your actual season: lift the Cup and you take the podium, miss badly and you face the scrum, sit down the lineup and the role question finds you. Three answers each time, safe, honest or fiery, and fiery gambles your fanbase for real.",
        ],
      },
      {
        heading: "Your rival's choices and what they move",
        items: [
          "When your rival makes no headline in a season, there is a 45% chance he puts a choice in front of you instead, never both in one season, and each choice comes up once before any repeats. A button only moves what it prints: morale, fanbase, net worth, karma or the heat of the feud. Morale rides straight into next season's points or save percentage.",
        ],
      },
      {
        heading: "How the phone's calendar works",
        items: [
          "Texts only arrive on beats your season really had. No playoff texts in a year your club missed, World Juniors texts only in a season you start at 19 or younger, no contract year texts until one year is left on the deal, and draft day's text lands before you play a shift. One text a beat, up to three a season, fewer while old ones sit unanswered, and the same text never comes twice in a career.",
          "The season the game retires you (40 for skaters, 41 for goalies, 22 seasons, or a rating that collapses) sends nothing about a year you will not play: no summer skates, no new stick and skate deal, no extension talk.",
        ],
      },
      {
        heading: "Retirement and the legacy score",
        items: [
          "Retirement hits at 40 for skaters, 41 for goalies, or earlier if your rating collapses. Before that, from 31, slipping 8 points off your best (or down to 69) brings the talk: retire now, one more year, or a farewell season. You can walk away after 6 seasons.",
          "The legacy score weighs Cups, majors (Hart, Norris or Vezina), Conn Smythes, All-Star nods, seasons and production; 500 or more means the Hall of Fame.",
          "Hall of Fame voters weigh the hardware first (Cups, the major awards, All-Star years), then your seasons and your numbers, and a career total near the top of this game's books in a stat your position really piles up (goals, assists, points or a goalie's wins) earns a push of its own, up to 390 legacy points.",
          "Example: take a winger with ordinary numbers and one with the same hardware and more assists than 99 of 100 wingers this game has seen. The second scores at least 300 legacy points more, which can be the whole gap between a long wait and the Hall. A career you already retired keeps the ballot it was told.",
        ],
      },
      {
        heading: "Money has rules of its own",
        items: [
          "Money has rules of its own. There is a 1% fee on both sides of every trade and a $100k floor in the account that cannot be invested away; a season that leaves you under the floor is covered out of savings first, then by a forced sale of holdings at whatever the price is that day. Cards win 42% of hands and a win pays 1.15x the stake, the most you can stake is $50k or 4% of your cash, and once you are $500k down for your career the boys stop dealing you in for good. Keep sitting in while you are losing and somebody at home notices, which costs morale and fanbase.",
        ],
      },
      {
        heading: "What the fans nag you about, and your one save",
        items: [
          "The fans nag you for the thing your position is judged on and never the other way round: a center hears more points, a winger hears bury more chances, the man on the blue line hears move the puck and keep it out, and a goalie only ever hears make the saves.",
          "One career saves automatically in your browser; a new one replaces it.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Reading an actual capped change",
        paragraphs: [
          "Say Health is 98 before a recovery choice that adds 10. The 100 cap makes the result 98 to 100, so the card shows +2. Continue moves you on (to the next card, or back to your career after the last one) with Health still at 100.",
        ],
      },
      {
        heading: "A Sniper winger breaks out at 23",
        paragraphs: [
          "Say your Sniper winger goes 23rd overall to a rebuilding club. Year one is 24 goals and silence. At 23 you erupt for 47 with an All-Star nod, but the losing wrecks your morale, so you force a trade to a contender.",
        ],
      },
      {
        heading: "A Cup, then a Hall of Fame near miss",
        paragraphs: [
          "At 27 you win the Cup. The legs go at 33, you switch to maintenance summers, grab two more years and retire at 38: one Cup, six All-Star nods, a franchise icon verdict. The Hall says not quite.",
        ],
      },
      {
        heading: "Answering a cheap shot after the whistle",
        paragraphs: [
          "Your rival gets away with a cheap shot after the whistle, no call, and the card asks what you do about it. Settle it next game heats the feud and usually pays Morale +8, but it carries a 30% chance you are the one who gets the penalty (Morale -5, Fanbase -5, Net worth -$100k). Shrug it off on camera is Fanbase +5, Karma +5 and the feud cools. You pick say nothing and watch the tape: Morale +6, the feud heats up, and those six points ride into next season's line.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Durability comes from the archetype",
        items: [
          "Durability is baked into the archetype. Power forwards break down; two-way types last.",
        ],
      },
      {
        heading: "Skills coach summers change with age",
        items: [
          "Skills coach summers add rating while you are young; from 31 on they quietly become body maintenance.",
        ],
      },
      {
        heading: "Morale, money and the free agency choice",
        items: [
          "Morale feeds the stat engine, so playing miserable costs real production.",
          "In free agency the rebuild pays the most and the contender pays the least. The roster number on each offer is the exact quality your next seasons run on, so the choice is money against playoff springs.",
        ],
      },
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
      "You get a curated roster snapshot, original simulation ratings, a points race and a divisional bracket. New opening estimates use 2024-25 and 2025-26 regular-season inputs: offensive production for forwards, offense and usage proxies for defensemen, and save-rate proxies for goalies. Contracts, potential and future events are simulated.",
    ],
    headings: {
      howToPlay: "How to play NHL Front Office, a free hockey GM simulation game",
      rules: "NHL Front Office rules: the cap, trades and trust upstairs",
      example: "NHL Front Office walkthrough: a Buffalo rebuild on the phone",
      tips: "NHL Front Office tips for building a roster that keeps winning",
      faq: "NHL Front Office FAQ: trades, firing and how long a save lasts",
    },
    howToPlaySections: [
      {
        heading: "Pick a club and inherit its roster",
        items: [
          "Pick any of the 32 clubs from the roster snapshot. Read each opening estimate note: the e marker means limited evidence, and an unmeasured game prior means the model lacks a usable observation. These estimates do not measure every skill. Existing saves keep their grades and development.",
        ],
        subsections: [
          {
            heading: "Read the ownership mandate each offseason",
            items: [
              "Read the ownership mandate: a contender is told to win the Cup, a bubble club to make the bracket, a rebuild to hit an honest win number. It resets every offseason from where the roster really stands.",
            ],
          },
        ],
      },
      {
        heading: "Waive, sign and work the phone on trades",
        items: [
          "Shape it: waive players, sign free agents, and work the phone on trades, where the other GM counters with pick demands and lesser returns instead of a flat yes or no.",
        ],
      },
      {
        heading: "Hire a staff, settle contracts and build packages",
        items: [
          "Under the hub's own boxes sit four more: Staff, Re-sign desk, Draft picks and Trade desk. A new franchise opens with them switched on. An older save plays on exactly as it did until you open one of them.",
          "Staff: a head coach, a special teams assistant, a goalie coach, a scouting director and a head athletic therapist, each rated 1 to 10. Hire off a shortlist, pay off the man you do not want, and match or let go when another club comes in for a good one.",
          "Re-sign desk: every player whose deal runs out this summer gets a tile. Keep him at his ask, push once with your own number, or let him go. Anyone you leave open is settled by your staff's own rule when the summer starts, never by a coin flip.",
          "Trade desk: build a package of up to five pieces a side, players and picks, and keep paying part of a salary to make the money work. It shuts at the deadline.",
        ],
      },
      {
        heading: "Choose who contributes to your simulation rating",
        items: [
          "Open Roster and choose your simulation contributors: six healthy forwards, four healthy defensemen and one healthy goalie. If a group has fewer available players, use all of them. Uncheck a selected forward or defenseman before choosing his replacement.",
          "Stage your changes, then Apply contributors to save them. Use automatic goes back to the highest rated healthy players. These groups feed the rating model; they are not full lines, defensive pairs or ice time.",
        ],
      },
      {
        heading: "Sim the season and watch your pace",
        items: [
          "Sim the season in 20 rounds of roughly four games each, with a live read on whether you are on pace.",
        ],
      },
      {
        heading: "Qualify, then win the Stanley Cup",
        items: [
          "Qualify for the playoffs: top three per division plus two wild cards per conference.",
          "Win four best-of-7 rounds to lift the Stanley Cup, then draft and go again, as long as ownership keeps you.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "A hard cap that rises every season",
        items: [
          "The cap starts at 104M and rises about 9 percent a season in this simulation. Free-agent offers must fit your room, including dead money. The existing salary-matching trade rules can allow a club above the cap; this is a limit of the game's model. New-model future offers use one fixed rating curve; unexpired signed contracts keep their price.",
        ],
      },
      {
        heading: "Real points and a roster floor and ceiling",
        items: [
          "Points are real: 2 for a win, 1 for an overtime loss, and roughly a quarter of losses go to overtime.",
          "Rosters run between 8 and 15 players, floor and ceiling both enforced.",
        ],
      },
      {
        heading: "Trades and the draft carry real risk",
        items: [
          "Phone trades are player for player plus an optional pick, and the AI prices age, rating and position before saying yes. Bigger packages live on the Trade desk box.",
          "Each club starts with 2 simulation picks. Trades can leave you with fewer or more choices, and each selection spends one owned pick. With none left, finish the draft and offseason. Rivals get two batches of up to five eligible selections in this abbreviated draft. Scouting grades carry error; the true rating appears only after you commit. In new-model franchises, rival clubs follow the scouting order and choose an affordable contract against the next cap, keeping unavailable choices in the pool. A contract price depends on the underlying simulated ability, so it is not a scout-only knowledge model.",
        ],
      },
      {
        heading: "Waiving a player and the dead money",
        items: [
          "Waiving a man is not free. Half his salary stays on this season's cap as dead money, a quarter lands on next season's if he had years left, and you cannot sign him back until the offseason.",
        ],
      },
      {
        heading: "Trust upstairs runs from zero to 100",
        items: [
          "Trust upstairs runs 0 to 100: beat the mandate and it climbs, miss it and it falls, a Cup fixes almost anything, and at zero you are fired and the save ends.",
        ],
      },
      {
        heading: "Deadline day, restricted free agents and retained salary",
        items: [
          "The trade deadline falls after round 15 of 20. The break after round 15 is deadline day, your last chance to deal, and once round 16 is played every deal is shut, phone calls and packages alike, until the summer. The real one falls in early March. At the deadline clubs in a playoff place, or close to one, are buyers who pay up for veterans; clubs well out of it are sellers who want picks and young players.",
          "A draft pick signs an entry level deal, three seasons from 18 to 21. When it runs out, a player under 27 with fewer than seven seasons is a restricted free agent: a qualifying offer keeps his rights, and a rival with a roster spot may table an offer sheet you either match or let go for the picks it carries. Everyone else is unrestricted. The money is this game's own figures, not real contracts.",
          "Your club's picks now run three drafts deep, two rounds each in this game's short draft, and any of them can be traded. A club can keep paying up to half of a traded player's salary, carry three retained deals at a time, and one contract can be retained on twice.",
          "Staff effects are small and capped. The head coach adds rating points on attack and defense, the goalie coach on the goalies, and the special teams assistant counts at a fifth because this game has no power play of its own. A better scouting director misses by less on a prospect's grade, and the therapist shortens injuries. Ownership gives the staff 8M each summer for fees and pay offs; wages sit outside the cap.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "What a goalie change does in the model",
        paragraphs: [
          "For a fictional rating example, keep your forwards and defensemen unchanged and replace a healthy 80 rated goalie with a healthy 85 rated goalie. The goalie group has a 20 percent weight, so your simulation strength rises by one point. Apply commits that choice; it changes your odds, not a promised result.",
        ],
      },
      {
        heading: "A goalie coach, an RFA tender and a deadline buy",
        paragraphs: [
          "Open Staff and hire a level 7 goalie coach off the shortlist. Level 7 is two rating points on the goalie, and the goalie carries a fifth of your strength, so the club gets 0.4 stronger on every night. That is a nudge to your odds, not a promised result.",
          "Your 21 year old winger's entry deal runs out this summer, so he is a restricted free agent on the Re-sign desk. Tender him the qualifying offer and he stays a season at the money he earns now. If a rival has tabled an offer sheet, the tile says so: match it and he stays on the sheet's terms, or let him go and the picks on the sheet come to you.",
          "At round 14 you sit in a wild card place, which makes you a buyer. On the Trade desk you send a depth winger and a second rounder two drafts out to a club well out of it for its veteran center, keeping half the winger's salary so the cap works. Wait until round 16 is played and the box just reads Deadline passed.",
        ],
      },
      {
        heading: "Working the phone for a Buffalo blueliner",
        paragraphs: [
          "Say you take Buffalo. You waive a fading winger, sign a 79 rated defenseman, then package your third line center plus a pick for a younger blueliner. The AI takes the deal because the value clears its price.",
        ],
      },
      {
        heading: "A wild card sweat and a draft grade that slips",
        paragraphs: [
          "The season becomes a wild card sweat decided by overtime loser points. You sneak in, stun a division winner, then die in the division final. At the draft an 88 grade center turns out to be an 84.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Overtime loser points decide close races",
        items: [
          "Overtime loser points decide races. A team hovering around .500 can still make the bracket on them.",
        ],
      },
      {
        heading: "Strength math behind your team rating",
        items: [
          "Strength math: your selected forwards carry half your rating, your defensemen 30 percent and your goalie 20 percent. Automatic selection uses the top six healthy forwards, top four healthy defensemen and best healthy goalie. An empty group uses a rating of 62 in this game's model.",
          "If a selected player is injured or leaves your roster, the game keeps your other valid choices and fills the gap with the highest rated healthy option. A player who recovers needs to be selected again if you want him back in the group.",
        ],
      },
      {
        heading: "Hoard players who still have upside",
        items: [
          "Players 23 and under develop toward their potential every offseason. Hoard them.",
        ],
      },
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
      {
        q: "Do my contributor choices survive a reload?",
        a: "Yes, after Apply contributors they live in your existing franchise save. Unsaved changes are only a preview. Old saves use automatic selection, and Use automatic clears your manual choices. You cannot select an injured player, somebody from another club or the same player twice.",
      },
    ],
  },

  '/nhl-connect-4': {
    intro: [
      "Connect 4 grew a hockey brain. The gravity is the same and four in a row still wins, but every cell must be earned by naming a real NHL player.",
      "Grab a friend for pass and play, pick a column, and answer the trivia question waiting on the row where your piece lands.",
    ],
    headings: {
      howToPlay: "How to play NHL Connect 4, a free hockey trivia board game",
      rules: "NHL Connect 4 rules: boards, names and the AI referee",
      example: "NHL Connect 4 walkthrough: a diagonal win on a Hart Trophy",
      tips: "NHL Connect 4 tips for blocking and naming players fast",
      faq: "NHL Connect 4 FAQ: opponents, referees and missed answers",
    },
    howToPlaySections: [
      {
        heading: "Red and blue take turns",
        items: [
          "Red and blue take turns on one device.",
        ],
      },
      {
        heading: "Drop a piece into a column",
        items: [
          "Pick a column. Your piece falls to the lowest open row.",
        ],
      },
      {
        heading: "Name a player who fits both labels",
        items: [
          "Name a player matching both labels, like Canadiens plus Hall of Famer.",
        ],
        subsections: [
          {
            heading: "A miss costs nothing, so retry or skip",
            items: [
              "A verified answer claims the cell. A miss costs nothing, so retry or hit Skip.",
            ],
          },
        ],
      },
      {
        heading: "Connect four to win the board",
        items: [
          "Connect four of your color in any direction to win; a full board is a draw.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Seven columns, six rows and themed boards",
        items: [
          "The board is 7 columns by 6 rows, dealt from a set of themed boards: Original Six matchups, trophies, birth countries, goalies.",
        ],
      },
      {
        heading: "Every name works once, wrong answers are free",
        items: [
          "Every player name can be used exactly once per game.",
          "Wrong answers never cost your turn; only Skip passes it.",
        ],
      },
      {
        heading: "Relocated franchises and the AI referee",
        items: [
          "Franchise history survives relocation: Nordiques answers count for the Avalanche, Whalers for the Hurricanes, Thrashers for the Jets.",
          "An AI referee checks each answer, and when it cannot verify one, nothing is placed and you simply try again.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Red opens on a Hall of Famer",
        paragraphs: [
          "Say the Original Six board comes up. Red opens in the Canadiens column and lands on the Hall of Famer row: Patrick Roy, easy money. Blue answers Penguins plus 500+ Career Goals with Mario Lemieux.",
        ],
      },
      {
        heading: "Mark Messier closes it on a diagonal",
        paragraphs: [
          "Ten moves later red needs one diagonal cell, and the landing row is Hart Trophy under the Rangers column. Mark Messier, the 1992 Hart winner as a Ranger, ends it.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Think one stack height ahead",
        items: [
          "Think one row ahead. The stack height decides which row your answer must satisfy, so a column's question changes with every drop.",
        ],
      },
      {
        heading: "Ration your universal legends",
        items: [
          "Ration your universal legends. A name that answers many cells is gone for the whole game once played.",
        ],
      },
      {
        heading: "Type goalie names in full, and block often",
        items: [
          "Goalies are missing from the suggestion list; type the full name and press Enter.",
          "Block like it is real Connect 4. Sometimes the right move is claiming a cell just to deny the row.",
        ],
      },
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
    headings: {
      howToPlay: "How to play Perfect Lineup: NHL, a free dream line builder game",
      rules: "Perfect Lineup: NHL rules: slots, chemistry and grading",
      example: "Perfect Lineup: NHL walkthrough: an Oilers and Avalanche line",
      tips: "Perfect Lineup: NHL tips for filling constrained slots first",
      faq: "Perfect Lineup: NHL FAQ: daily resets, redos and the player pool",
    },
    howToPlaySections: [
      {
        heading: "Read your six slots and their constraints",
        items: [
          "Read your six slots: LW, C, RW, two D and a G. Three carry a constraint tag like Oilers or 1990s.",
        ],
      },
      {
        heading: "Pick from the eligible legends list",
        items: [
          "Tap a slot and pick from the eligible legends; the list only shows players who fit the position and the tag.",
        ],
      },
      {
        heading: "Build chemistry across team and era",
        items: [
          "No player fills two slots, and picks sharing a team or era build chemistry.",
        ],
        subsections: [
          {
            heading: "Fill every slot and hit Simulate",
            items: [
              "Fill all six and hit Simulate.",
            ],
          },
        ],
      },
      {
        heading: "Share your grade or run it back",
        items: [
          "Share the scoreline and grade, or tweak the lineup and run it back.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Six slots, three of them constrained",
        items: [
          "6 slots, and exactly 3 of them are constrained to a franchise or an era.",
        ],
      },
      {
        heading: "Rating weighs talent over chemistry",
        items: [
          "Your final rating is 80 percent talent, 20 percent chemistry.",
          "Chemistry counts picks who share a team or era with at least one other pick.",
        ],
      },
      {
        heading: "Grades from A+ down, and the daily reset",
        items: [
          "Grades: A+ at 92 or better, A at 84, B at 74, C at 62, D below that.",
          "Daily constraints refresh every day, and unlimited mode rerolls random ones whenever you want.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Gretzky, Jagr and Makar fill the constraints",
        paragraphs: [
          "Say the daily locks the center slot to the Oilers, the right wing to the 1990s and one defense slot to the Avalanche. Gretzky takes the middle, Jagr the wing, Cale Makar the blue line.",
        ],
      },
      {
        heading: "Chemistry links turn the lineup into an A",
        paragraphs: [
          "Now the chemistry play: Paul Coffey doubles up with Gretzky on team and era, and Patrick Roy links to Makar through the Avalanche tag. The sim spits out a 5-0 and an A.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Fill the constrained slots first",
        items: [
          "Fill the constrained slots first. Their lists are short, and a flexible star wasted early can block them.",
        ],
      },
      {
        heading: "Stack a dynasty core for chemistry",
        items: [
          "Stack a dynasty core. Two or three picks from one team and era move the chemistry needle fast.",
        ],
      },
      {
        heading: "Do not chase chemistry over talent",
        items: [
          "Do not chase chemistry into bad ratings; talent is most of the math.",
          "In unlimited, reroll until constraints overlap. An Oilers slot next to a 1980s slot is a gift.",
        ],
      },
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

  '/nhl-gauntlet-draft': {
    intro: [
      "The draft mode, hockey style: eleven picks, two forward lines, two defense pairs and a goalie, five real players a pick from a genuine star to a bargain, and you keep exactly one.",
      "Then the playoffs begin. Your finished lineup runs five knockout rounds against ever stronger invented opposition, rated 77 up to 98, with sudden death overtime when the game is level.",
      "The run is decided entirely by the lineup you drafted: the same eleven always runs the same playoffs, so every pick is the game.",
    ],
    headings: {
      howToPlay: "How to play Gauntlet Draft: NHL, a free daily hockey lineup draft game",
      rules: "Gauntlet Draft: NHL rules for cards, ratings and the playoffs",
      example: "Gauntlet Draft: NHL walkthrough: a 91 rated lineup chases the Cup",
      tips: "Gauntlet Draft: NHL tips for goalies, wings and the lineup rating",
      faq: "Gauntlet Draft: NHL FAQ: daily drafts, opponents and overtime",
    },
    howToPlaySections: [
      {
        heading: "Choosing the daily gauntlet or a fresh draft",
        items: [
          "Pick the daily gauntlet (the same five card choices for everyone today) or unlimited for a fresh draft.",
        ],
      },
      {
        heading: "Reading five cards for every spot in the lineup",
        items: [
          "For each spot, center, wingers, defense and goal, read the five cards, star to bargain, and tap the one you keep.",
        ],
        subsections: [
          {
            heading: "Why a center can fill a wing spot",
            items: [
              "A wing spot takes a winger or a center, because centers slide out to the wing all the time. A center spot only takes a center, and the defense and goalie spots only take their own.",
            ],
          },
        ],
      },
      {
        heading: "Watching the playoffs start on their own",
        items: [
          "After the eleventh pick the playoffs start on their own: five rounds, one game each, revealed one at a time.",
        ],
      },
      {
        heading: "Scoring points for every round survived",
        items: [
          "Survive a round for 16 points; lift the Cup for exactly 100.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Real players off real NHL rosters",
        items: [
          "Every card is a real player off a real 2026-27 roster, 32 clubs and 13 players each, the same data NHL Front Office plays. Every opponent club is invented on purpose.",
        ],
      },
      {
        heading: "How ratings come from real production",
        items: [
          "Ratings come from real 2025-26 production, not opinion: forwards and defensemen from their points per game against others at their position, goalies from save percentage and wins.",
        ],
        subsections: [
          {
            heading: "Why four goalies rated 68 sit out",
            items: [
              "The roster data gives anyone without a qualifying 2025-26 season a placeholder rating of 68 and does not say which 68s those are, so the four goalies rated 68 are left out of the deal rather than risk dealing a number their play never produced.",
            ],
          },
        ],
      },
      {
        heading: "A star and a bargain at every spot",
        items: [
          "The five cards per spot are spread across the pool's rating range, so a star and a bargain are always both on the table.",
        ],
        subsections: [
          {
            heading: "Nobody dealt twice in one draft",
            items: [
              "No player is dealt twice in one draft.",
            ],
          },
        ],
      },
      {
        heading: "A knockout decided by the rating gap",
        items: [
          "The knockout is deterministic in your lineup: scoring comes from the rating gap, a level game goes to sudden death overtime, and replaying the same eleven replays the same playoffs.",
        ],
        subsections: [
          {
            heading: "No shootouts in playoff hockey",
            items: [
              "There are no shootouts, because playoff hockey does not have them. Overtime goes on until somebody scores.",
            ],
          },
        ],
      },
      {
        heading: "Opposition ratings climbing toward the Cup Final",
        items: [
          "Opposition ratings climb 77, 84, 89, 94, 98. A bargain lineup usually goes out in the first two rounds, an elite one often reaches the Cup Final, and even a perfect draft lifts the Cup only about one run in seven.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Taking the best goalie card on offer",
        paragraphs: [
          "The goalie spot deals a 90 next to an 87, an 83, an 81 and a 70. Nothing costs anything, so the 90 is the pick unless you are collecting one club.",
        ],
      },
      {
        heading: "A 91 rated lineup runs the playoffs",
        paragraphs: [
          "Your finished lineup rates 91. The Qualifying Round is a 6-0 rout, the First Round a 4-0 shutout, the Second Round goes to overtime and you take it 3-2, and the Conference Final ends the run 4-2. Three rounds survived, 48 points, and the card you would take back is the 82 you settled for on the second defense pair.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Treating the goalie as one card in eleven",
        items: [
          "The goalie counts the same as any other card toward the rating, one eleventh of it, so a weak goalie hurts no more than a weak winger, and no less either.",
        ],
      },
      {
        heading: "Spotting centers in the wing picks",
        items: [
          "The wing picks can deal centers, and a center is often the best card in the pick, so do not skip past one in a wing spot.",
        ],
      },
      {
        heading: "Building toward a lineup in the mid nineties",
        items: [
          "The Cup only becomes a real chance once your lineup is in the mid nineties. Watch the running rating under the cards as you fill the lines.",
        ],
      },
    ],
    faqs: [
      { q: "Is the daily draft the same for everyone?", a: "Yes. One shared set of five card choices per Eastern Time date, so daily scores compare fairly." },
      { q: "Are the opponents real teams?", a: "No, and that is deliberate: every opponent is an invented club, so no real logo or name is borrowed. The players you draft are real, off real 2026-27 rosters." },
      { q: "Why does the card say EDM instead of the club's full name?", a: "The abbreviation is what the roster data itself carries, and it keeps the page light. Any hockey fan reads it at a glance." },
      { q: "Why does a tied game never go to a shootout?", a: "Because this is the playoffs, and the NHL settles playoff games with sudden death overtime, period after period, until somebody scores." },
      { q: "Is this the same game as the soccer Gauntlet Draft?", a: "Same engine, hockey's own roster data, lineup and playoff ladder. Eleven picks, the same depth as the soccer XI and the MLB lineup card." },
    ],
  },
};
