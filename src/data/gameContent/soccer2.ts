import type { GameContentMap } from './types';

// Soccer game guides, batch 2. Casual human tone, no em dashes anywhere.
export const SOCCER_CONTENT_2: GameContentMap = {
  '/sign-the-player': {
    intro: [
      "Three bidders, one billion pounds each: you, The Sheikh, and Moneyball Mike. Twenty two players go under the hammer across two passes, eleven journeymen wait to fill the gaps, and a simulated mini league decides who spent it best.",
      "The auction runs the way a real room does: lots come up in a random position order at real list price, a contested lot turns into a live bidding war, an unwanted one decays until somebody snaps the bargain, and the most valuable player in the room headlines the final lot.",
    ],
    headings: {
      howToPlay: "How to play Sign the Player, a free online soccer auction game",
      rules: "Sign the Player rules: bidding, passes and the journeyman fill",
      example: "Sign the Player walkthrough: a striker war and a title race",
      tips: "Sign the Player tips for beating The Sheikh and Moneyball Mike",
      faq: "Sign the Player FAQ: bidding, passing and the showdown score",
    },
    howToPlaySections: [
      {
        heading: "Choosing your auction theme",
        items: [
          "Pick a theme: Current Stars, All-Time Legends, or World Cup 2026.",
        ],
      },
      {
        heading: "How the two bidding passes run",
        items: [
          "Pass one is a lot per position from the middle band in a random order; pass two is the elite band, with the single most valuable player held back to headline the close. Until a position has come up, the room shows the running order, never the names.",
        ],
      },
      {
        heading: "Bidding steps and winning a lot",
        items: [
          "Bid in steps of 5, 10, or 25 million, or pass. If you are the only one who wants him, you get him at the list price.",
        ],
      },
      {
        heading: "Filling the last empty chairs",
        items: [
          "When the last hammer falls, every open chair on every squad is filled from the journeyman list at a fee, so nobody plays the showdown a man short.",
        ],
      },
      {
        heading: "Simulating the showdown season",
        items: [
          "Once all three squads hit 11, the showdown simulates the league and crowns a champion.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "The auction pool and starting funds",
        items: [
          "Every bidder starts with 1 billion pounds. Twenty two auction lots cover the 11 positions twice, middle band then elite, and eleven journeymen fill whatever stays open at the end.",
        ],
      },
      {
        heading: "How a war or a lone bid sets the price",
        items: [
          "Two bidders or more on the same lot and it is a war, so it always finishes above list. Exactly one bidder and he takes him for the list price, not a penny over.",
        ],
        subsections: [
          {
            heading: "When nobody bids at list price",
            items: [
              "If nobody bids at list price, the price falls step by step; anyone can snap it mid fall, and a lot that reaches thirty percent of list is withdrawn unsold.",
            ],
          },
        ],
      },
      {
        heading: "Filling empty chairs after the auction",
        items: [
          "An end of auction fill costs just under half the player's list price, minimum 5 million.",
        ],
      },
      {
        heading: "The showdown format and your final score",
        items: [
          "The showdown is a double round robin, 4 matches per club, ranked by points then goal difference.",
          "Score is a place bonus (300, 150, or 50) plus 3 per point of squad rating plus 1 per 10 million left in the bank.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "A striker war during the first pass",
        paragraphs: [
          "A striker lot opens mid running order at his real list price. The Sheikh wants him, so you nudge the price once and let go; he wins the war at 240 million, and when the elite striker headlines the close he is too broke to fight you.",
        ],
      },
      {
        heading: "The showdown decides the title",
        paragraphs: [
          "The leftover striker goes to Mike, fee and all. The sim hands you the title on goal difference, and the unspent money pads your score.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Taxing The Sheikh's overpays",
        items: [
          "The Sheikh overpays, so tax him on lots you do not want, then step away.",
        ],
      },
      {
        heading: "Fighting Moneyball Mike for value",
        items: [
          "Moneyball Mike passes on superstars and hunts value, so fight him for the mid priced lots.",
        ],
      },
      {
        heading: "Why passing everything still costs you",
        items: [
          "Passing everything still costs you: the end of auction fill charges a fee for every open chair, and journeymen do not win showdowns.",
        ],
      },
    ],
    faqs: [
      {
        q: "Do I bid against real people?",
        a: "No, both rivals are AI moguls: The Sheikh pays over the odds, Moneyball Mike only spends where he sees value.",
      },
      {
        q: "What happens if I pass on everything?",
        a: "Your squad never has holes: missed positions get the leftover player, fee and all, so full passing buys the worst XI in the room.",
      },
      {
        q: "Is it a daily game?",
        a: "No. Every run builds a fresh 33 player pool for your chosen theme, so no two auctions repeat.",
      },
    ],
  },

  '/gauntlet-draft': {
    intro: [
      "Gauntlet Draft is the draft mode: a formation is drawn, each of its eleven slots deals you five real players from a genuine star to a bargain, and you keep exactly one per slot.",
      "Then the cup begins. Your finished XI runs five knockout rounds against ever stronger opposition, rated 70 up to 89, with extra time and penalties when the ninety minutes are level.",
      "The run is decided entirely by the squad you drafted: the same XI always runs the same gauntlet, so every pick is the game.",
    ],
    headings: {
      howToPlay: "How to play Gauntlet Draft: Soccer, a free online card draft game",
      rules: "Gauntlet Draft: Soccer rules for cards, the knockout and opposition ratings",
      example: "Gauntlet Draft: Soccer walkthrough of a striker pick and a four round run",
      tips: "Gauntlet Draft: Soccer tips for drafting a squad that lifts the trophy",
      faq: "Gauntlet Draft: Soccer FAQ on the daily draft, real players and replays",
    },
    howToPlaySections: [
      {
        heading: "Choosing daily or unlimited mode",
        items: [
          "Pick the daily gauntlet (the same five card choices for everyone today) or unlimited for a fresh draft.",
        ],
      },
      {
        heading: "Drafting one card per slot",
        items: [
          "For each slot, read the five cards, star to bargain, and tap the one you keep. Position families apply, so a winger card can cover either flank.",
        ],
      },
      {
        heading: "How the knockout starts on its own",
        items: [
          "After pick eleven the knockout starts on its own: five rounds, one match each, revealed one at a time.",
        ],
      },
      {
        heading: "Scoring survival points and the trophy",
        items: [
          "Survive a round for 16 points; lift the trophy for exactly 100.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Real players against invented opponents",
        items: [
          "Every card is a real player from the same verified market data the rest of the site uses; every opponent club is invented on purpose.",
        ],
      },
      {
        heading: "Card spread and no repeat picks",
        items: [
          "The five cards per slot are spread across the value bands, so a star and a bargain are always both on the table.",
        ],
        subsections: [
          {
            heading: "Never dealt the same player twice",
            items: [
              "No player is dealt twice in one draft.",
            ],
          },
        ],
      },
      {
        heading: "Why every replay stays deterministic",
        items: [
          "The knockout is deterministic in your XI: goals come from the rating gap, level games go to extra time and then penalties, and replaying the same squad replays the same cup.",
        ],
      },
      {
        heading: "Climbing opposition ratings by round",
        items: [
          "Opposition ratings climb 70, 76, 81, 85, 89. A bargain draft usually falls in the first two rounds, an elite one reaches the final as a slight underdog, and even a perfect draft lifts the trophy about one run in eight.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "A striker slot with five cards to choose",
        paragraphs: [
          "The draw hands you a 4-3-3 and the striker slot deals a 91 rated superstar next to an 84, a 79, a 74 and a 68. You pay nothing for any of them, so the 91 is the pick unless you are chasing a story.",
        ],
      },
      {
        heading: "Four rounds survived and one regret",
        paragraphs: [
          "Your finished XI rates 84. The Qualifier ends 3-0, the Last Sixteen 2-1, the Quarter Final needs penalties, and the Semi Final ends the run 1-2. Four rounds survived, 64 points, and the draft you would redo is the 74 you took at left back.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Why the keeper slot matters as much",
        items: [
          "The keeper card matters as much as the striker card: one weak slot drags the whole rating.",
        ],
      },
      {
        heading: "Bargain cards versus chasing the score",
        items: [
          "The bargain cards exist for flavor runs, not for winning. If the score is the goal, draft the biggest number that fits.",
        ],
      },
      {
        heading: "Watching your running rating climb",
        items: [
          "Champions need a squad in the high eighties. Check your running rating under the cards as you go.",
        ],
      },
    ],
    faqs: [
      { q: "Is the daily draft the same for everyone?", a: "Yes. One shared set of five card choices per Eastern Time date, so daily scores compare fairly." },
      { q: "Are the opponents real clubs?", a: "No, and that is deliberate: every gauntlet opponent is an invented club, so no real badge or name is borrowed. The players you draft are real." },
      { q: "Can the same squad get a different cup run?", a: "No. The run is computed from your finished XI, so the draft is the whole game and replaying the same eleven replays the same matches." },
    ],
  },
  '/footle': {
    intro: [
      "Footle gives you 8 guesses to name a mystery soccer player. Each guess is a real player, and colored tiles compare it to the answer across eight attributes, from club to kit number.",
      "You get eight goes at one mystery player and every guess comes back colour coded: arrows say whether the answer is older, scores more, or wears a higher number. Everyone gets the same new player every day.",
    ],
    headings: {
      howToPlay: "How to play Footle, a free daily soccer guessing game",
      rules: "Footle rules: guesses, yellow tiles and the difficulty tiers",
      example: "Footle walkthrough: from Bellingham to a Barcelona academy graduate",
      tips: "Footle tips for narrowing down the mystery player fast",
      faq: "Footle FAQ: daily resets, difficulty tiers and unlimited mode",
    },
    howToPlaySections: [
      {
        heading: "Typing a name from the suggestions",
        items: [
          "Type a player's name and pick him from the suggestions.",
        ],
      },
      {
        heading: "Reading the color coded tiles",
        items: [
          "Read the tiles: green is an exact match, yellow is close, white is a miss.",
        ],
      },
      {
        heading: "Following the up or down arrows",
        items: [
          "Follow the arrows: up means the answer's value is higher than your guess.",
        ],
      },
      {
        heading: "Narrowing by continent, league and position",
        items: [
          "Narrow by continent, league, and position group before sweating exact numbers.",
        ],
        subsections: [
          {
            heading: "Solving within your eight guesses",
            items: [
              "Get the name within 8 guesses and share your emoji grid.",
            ],
          },
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Eight guesses in every mode",
        items: [
          "You get 8 guesses in both daily and unlimited mode.",
        ],
      },
      {
        heading: "What counts as a close yellow tile",
        items: [
          "Yellow means close: same continent, same league, within 3 goals, assists, or kit number, within 2 years of age, within 5 million dollars of value, or the same position group.",
        ],
      },
      {
        heading: "Daily difficulty split and unlimited choice",
        items: [
          "The daily tier is shared: about 40 percent of days are Easy, 55 Hard, 5 Insane.",
          "In unlimited mode you choose Easy, Hard, or Insane, and the answer always comes from that tier.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Opening with a famous midfielder",
        paragraphs: [
          "Open with Jude Bellingham. Club comes back yellow, so the answer is La Liga but not Real Madrid. Position is green, a midfielder, and the age tile points down.",
        ],
      },
      {
        heading: "Zeroing in on a young La Liga midfielder",
        paragraphs: [
          "Young La Liga midfielders scream Barcelona. Pedri turns club green, kit number and goals steer the last step, and Gavi lights the board on guess three.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Starting on someone you know cold",
        items: [
          "Open with someone you know cold so the arrows mean something.",
        ],
      },
      {
        heading: "Category tiles before chasing the stats",
        items: [
          "Category tiles carve the pool faster than stats: continent, then league, then position group.",
        ],
      },
      {
        heading: "Why the kit number tile is sneaky useful",
        items: [
          "Kit number is sneaky useful. A yellow pins the shirt to within 3.",
        ],
      },
      {
        heading: "Probing with famous names on Insane",
        items: [
          "In unlimited Insane, still probe with famous names. Guessing stays open to the full pool.",
        ],
      },
    ],
    faqs: [
      {
        q: "When does the daily Footle reset?",
        a: "At midnight Eastern Time, everyone flips to the same new puzzle. Your finished result stays saved in your browser until then.",
      },
      {
        q: "What are the difficulty tiers?",
        a: "Easy is the 80 most valuable players in the world right now plus the all-time greats, Hard is squad players at big clubs, Insane is obscure pros from smaller leagues. A banner shows the daily tier before your first guess. Easy goes on market value rather than fame, so a teenager who has not made his name yet can still turn up there.",
      },
      {
        q: "Can I keep playing after the daily?",
        a: "Yes, unlimited mode deals endless rounds at any difficulty, and it never touches your daily result.",
      },
    ],
  },

  '/career': {
    intro: [
      "A player's whole career sits in front of you, season by season, with almost everything covered up. Work out who it is while revealing as few boxes as you can.",
      "Only the season years start visible. Club, appearances, goals, assists, and market value hide behind tappable boxes. It is a memory test for anyone who has watched a decade of transfer windows.",
    ],
    headings: {
      howToPlay: "How to play Career Quiz, a free soccer career reveal puzzle",
      rules: "Career Quiz rules: guesses, hints and the hidden columns",
      example: "Career Quiz walkthrough: from a Juventus box to naming Zlatan",
      tips: "Career Quiz tips for reading a career table fast",
      faq: "Career Quiz FAQ: daily puzzles, hints and unlimited tiers",
    },
    howToPlaySections: [
      {
        heading: "Tapping boxes to reveal the table",
        items: [
          "Tap any hidden box to reveal that cell of the career table.",
        ],
      },
      {
        heading: "Using Give Hint for four boxes at once",
        items: [
          "Press Give Hint to open 4 random boxes at once, as often as you like.",
        ],
      },
      {
        heading: "Typing a guess at any time",
        items: [
          "Guess by typing a name in the search bar, any time, even with zero boxes open.",
        ],
        subsections: [
          {
            heading: "Why revealing boxes is always free",
            items: [
              "Wrong guesses burn one of your 8 chances. Revealing boxes never does.",
            ],
          },
        ],
      },
      {
        heading: "What the game logs when you solve it",
        items: [
          "Solve it and the game logs both your guess count and your box count.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Eight guesses before the run ends",
        items: [
          "You get 8 guesses, and 8 wrong guesses ends the run.",
        ],
      },
      {
        heading: "Hints and the five hidden columns",
        items: [
          "Each hint opens exactly 4 random boxes.",
          "Five columns hide per season: club, appearances, goals, assists, and market value.",
        ],
      },
      {
        heading: "Daily puzzle versus unlimited difficulty tiers",
        items: [
          "The daily is shared by everyone. Unlimited mode adds Easy, Normal, and Hard tiers, splitting the pool by peak market value.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "A Juventus club box mid career",
        paragraphs: [
          "You open one club box mid career and get Juventus. Big list, so you open the market value cell on that row: star money, a player in his prime. One more club box near the top shows Ajax.",
        ],
      },
      {
        heading: "Naming Zlatan in one guess",
        paragraphs: [
          "Ajax to Juventus with superstar value narrows it fast. You type Zlatan Ibrahimovic and win in 1 guess with 3 boxes revealed, the kind of line worth sharing.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Why club boxes are the biggest tell",
        items: [
          "Club boxes are the biggest tell. A distinctive transfer route can solve it in two reveals.",
        ],
      },
      {
        heading: "Market value peaks and prime years",
        items: [
          "Market value peaks mark the prime years and split superstars from journeymen.",
        ],
      },
      {
        heading: "Reading goals and appearances by position",
        items: [
          "Goals in the twenties every season screams striker. Big appearances with few goals hints at defenders and keepers.",
        ],
      },
      {
        heading: "Taking your time with no clock running",
        items: [
          "No clock is running, so sit with the pattern before you spend a guess.",
        ],
      },
    ],
    faqs: [
      {
        q: "Do revealed boxes count against me?",
        a: "No, only wrong guesses spend your 8 chances. Boxes just appear in the final stat line, where fewer looks better.",
      },
      {
        q: "Is there a daily puzzle?",
        a: "Yes, one shared puzzle a day, plus unlimited practice with difficulty tiers you can replay forever.",
      },
      {
        q: "Can I guess with no boxes open?",
        a: "Yes, the search works from the first second. A zero box solve is the rarest flex in the game.",
      },
    ],
  },

  '/higher-lower': {
    intro: [
      "Most higher or lower games hide a number and make you call it. This one flips the table: your player's stats are face up, the challenger's are hidden, and you pick the battleground.",
      "Three career totals are in play: appearances, goals and international caps. Choose the one stat where your player beats the mystery opponent. One bad read ends the run.",
    ],
    headings: {
      howToPlay: "How to play Soccer Higher or Lower, a free career stats comparison game",
      rules: "Soccer Higher or Lower rules: ties, career totals and one wrong pick",
      example: "Soccer Higher or Lower walkthrough: Maldini's appearances start a streak",
      tips: "Soccer Higher or Lower tips for picking the safest career stat",
      faq: "Soccer Higher or Lower FAQ: ties, streaks and hidden opponents",
    },
    howToPlaySections: [
      {
        heading: "Studying your player's three stats",
        items: [
          "Study your player's three revealed career stats.",
        ],
      },
      {
        heading: "Picking the stat that beats the opponent",
        items: [
          "Tap the one stat where you think your player is at least as high as the hidden opponent.",
        ],
      },
      {
        heading: "Watching the reveal either way",
        items: [
          "The reveal shows both cards for a few seconds either way.",
        ],
        subsections: [
          {
            heading: "How a correct pick grows your streak",
            items: [
              "Correct picks grow your streak, and the opponent becomes your next player.",
            ],
          },
        ],
      },
      {
        heading: "What happens after a wrong pick",
        items: [
          "A wrong pick ends the game. Share the streak and go again.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Three career totals decide every matchup",
        items: [
          "All three stats are career totals.",
        ],
      },
      {
        heading: "Why a tie still counts as a win",
        items: [
          "Ties count for you: a pick is correct when your number is higher than or equal to the opponent's.",
        ],
      },
      {
        heading: "No lives, no timer, one wrong pick",
        items: [
          "One wrong pick ends the run. There are no lives and no timer.",
        ],
      },
      {
        heading: "Every matchup is winnable by design",
        items: [
          "Every matchup is winnable by design, with at least one stat where your player is not behind.",
          "International caps are senior full internationals, and a card says on the reveal when its number comes from one publisher rather than two.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Picking appearances for a defender",
        paragraphs: [
          "Your card is Paolo Maldini. Goals is a trap for a defender who played 25 years at the back, so you tap appearances, and 902 games holds up against almost anybody.",
        ],
      },
      {
        heading: "The streak climbs against a striker",
        paragraphs: [
          "The reveal shows a striker with a monster goal column and a short career. Streak to 7, and now you play as that striker, hunting his one strong column.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Why appearances reward long careers",
        items: [
          "Appearances reward longevity, so keepers and one club legends quietly dominate that column.",
        ],
      },
      {
        heading: "Remembering who might be hiding",
        items: [
          "Remember who might be hiding: the pool mixes recent names with retired icons carrying finished, giant totals.",
        ],
      },
      {
        heading: "Why a merely solid stat can be safest",
        items: [
          "Ties go to you, so a merely solid stat can still be the safest pick.",
        ],
      },
      {
        heading: "Chasing your best streak of the session",
        items: [
          "Your best streak of the session stays on screen. Chase it while the pool is fresh in your head.",
        ],
      },
    ],
    faqs: [
      {
        q: "How is this different from classic higher or lower?",
        a: "You pick the stat instead of calling a hidden number higher or lower. Choosing the battleground is the whole skill.",
      },
      {
        q: "Does a tie end my run?",
        a: "No, a level stat counts as a win and the streak continues.",
      },
      {
        q: "What is the score?",
        a: "The streak itself: 1 per correct pick, with your session best shown as the target to beat.",
      },
    ],
  },

  '/connections': {
    intro: [
      "Sixteen players, four secret groups, and a board built to trick you. Sort all 16 names into their hidden categories of four before your lives run out.",
      "The connections range from friendly, like a shared club, to evil, like a common shirt number or award. Each solved group shows a difficulty color, and purple is usually the trap.",
    ],
    headings: {
      howToPlay: "How to play Soccer Connections, a free football players grouping puzzle",
      rules: "Soccer Connections rules: lives, hints and the four difficulty colors",
      example: "Soccer Connections walkthrough: four AC Milan legends and one swap",
      tips: "Soccer Connections tips for spotting the trap player early",
      faq: "Soccer Connections FAQ: daily puzzles, hints and your win streak",
    },
    howToPlaySections: [
      {
        heading: "Tapping four players and submitting",
        items: [
          "Tap four players you think belong together and hit Submit.",
        ],
      },
      {
        heading: "Locking in a correct category",
        items: [
          "Correct sets lock in with their category name and color.",
        ],
      },
      {
        heading: "What a wrong guess costs you",
        items: [
          "Wrong sets cost one of your 4 lives. If 3 of the 4 were right, the game says you were one away.",
        ],
        subsections: [
          {
            heading: "Spending a hint on the easiest group",
            items: [
              "Spend a hint to reveal the category name of the easiest unsolved group.",
            ],
          },
        ],
      },
      {
        heading: "Finding all four groups to win",
        items: [
          "Find all four groups before the lives run out.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Sixteen players in four hidden groups",
        items: [
          "Always 16 players forming exactly 4 groups of 4.",
        ],
      },
      {
        heading: "Four lives and what a miss costs",
        items: [
          "You have 4 lives, and every wrong submission costs one.",
        ],
      },
      {
        heading: "Hints reveal names, and the difficulty colors",
        items: [
          "Up to 4 hints, and they reveal category names only, never players.",
          "Colors mark difficulty: green easy, yellow medium, blue hard, purple insane.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Locking in four AC Milan legends",
        paragraphs: [
          "You spot Kaka, Maldini, Van Basten, and Gullit and submit them as AC Milan players. Locked, green. Then four Ballon d'Or winners come back one away: someone belongs to a sneakier group.",
        ],
      },
      {
        heading: "Swapping one name to finish clean",
        paragraphs: [
          "Swap one name for Modric and it locks. The last eight should sort themselves, but you triple check anyway, because winning with all 4 lives intact is the real flex.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Never submitting your first idea",
        items: [
          "Never submit your first idea. Hunt the trap player who fits two categories.",
        ],
      },
      {
        heading: "Locking your surest group first",
        items: [
          "Lock your surest group first. Every solve shrinks the board.",
        ],
      },
      {
        heading: "What one away really means",
        items: [
          "One away means change exactly one player, not two.",
        ],
      },
      {
        heading: "Saving hints for the trickiest groups",
        items: [
          "Save hints for the last two groups, where the categories get strange.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is there a new puzzle every day?",
        a: "Yes, the shared daily changes at midnight Eastern Time, and unlimited mode serves more puzzles from the full pool whenever you want.",
      },
      {
        q: "Do hints cost a life?",
        a: "No, hints and lives are separate budgets of 4 each. A hint names a category; finding its four players is still on you.",
      },
      {
        q: "How does the streak work?",
        a: "Each solve adds 1, any loss resets it to zero, and it is stored in your browser between visits.",
      },
    ],
  },

  '/build-your-xi': {
    intro: [
      "Build Your XI hands you a formation, then a slot machine assigns a random club or country to every position. Your job is naming a player from that exact team who fits each slot.",
      "When the eleventh name lands, an AI referee grades the lineup and writes a short scouting report, then a season report plays a full year out with your XI: league finish, points, trophies and a top scorer. No two teams ever come out alike.",
    ],
    headings: {
      howToPlay: "How to play Build Your XI, a free soccer lineup builder game",
      rules: "Build Your XI rules: positions, duplicates and chemistry points",
      example: "Build Your XI walkthrough: a Liverpool heavy lineup gets rated",
      tips: "Build Your XI tips for a lineup that scores well with the AI",
      faq: "Build Your XI FAQ: rerolls, positions and the rating verdict",
    },
    howToPlaySections: [
      {
        heading: "Choosing one of six formations",
        items: [
          "Choose one of 6 formations: 4-3-3, 4-4-2, 3-5-2, 4-2-3-1, 3-4-3, or 5-3-2.",
        ],
      },
      {
        heading: "Spinning a club or country per slot",
        items: [
          "Tap a position. The spinner shows which club or national team that slot is locked to.",
        ],
      },
      {
        heading: "Typing a player who fits the slot",
        items: [
          "Type a player from that team who fits. The game verifies the answer before it counts.",
        ],
        subsections: [
          {
            heading: "Rerolling an assignment you hate",
            items: [
              "Hate an assignment? Reroll it for a different team.",
            ],
          },
        ],
      },
      {
        heading: "Submitting your finished XI for a rating",
        items: [
          "Fill all 11 slots, review your chemistry links, then submit for the AI rating.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Wrong answers cost nothing to retry",
        items: [
          "Wrong answers are rejected with a reason but cost nothing. Retry until a valid name lands.",
        ],
      },
      {
        heading: "Which nearby positions a slot accepts",
        items: [
          "A slot takes a player who plays there or right beside it: full backs and wing backs cover each other, wingers count on both flanks, CM covers CDM and CAM, strikers cover each other. A keeper only ever goes in goal.",
        ],
      },
      {
        heading: "No duplicate players in your lineup",
        items: [
          "No duplicate players across your XI.",
        ],
      },
      {
        heading: "Scoring chemistry and the offline backup judge",
        items: [
          "Chemistry: each pair sharing a club is worth 3 points, a league 2, a nationality 1, capped at 9 per player.",
          "If the AI judge is unreachable, a built in offline judge grades you instead, so a run never dead ends.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Alisson and Saka fill a Liverpool heavy XI",
        paragraphs: [
          "You take 4-3-3. Liverpool lands on the goalkeeper slot, so Alisson goes in. Arsenal on the right wing is Saka. Then the striker slot spins a national team, and you weigh Harry Kane against saving England for a harder slot.",
        ],
      },
      {
        heading: "A verdict that praises the spine",
        paragraphs: [
          "The finished XI leans Premier League, chemistry pays you for it, and the verdict praises the spine while roasting your left back. You run it back in a 3-5-2.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Rerolling thin assignments before typing",
        items: [
          "Reroll thin assignments before typing, knowing the spin can land somewhere worse.",
        ],
      },
      {
        heading: "Naming goalkeepers from small clubs",
        items: [
          "Small club on the wheel? Goalkeepers are easy to name, elite wingers are not.",
        ],
      },
      {
        heading: "Stacking one league for chemistry points",
        items: [
          "Stacking one league quietly adds chemistry points to the final screen.",
        ],
      },
      {
        heading: "Letting autocomplete fix a rejected spelling",
        items: [
          "If a right sounding name is rejected, let the search autocomplete the spelling for you.",
        ],
      },
    ],
    faqs: [
      {
        q: "Who checks my answers?",
        a: "An AI validator confirms the player really played for the assigned club or country. If the check cannot complete, you simply retry; it never fills a slot with a wrong answer.",
      },
      {
        q: "Can I reroll more than once?",
        a: "Yes, rerolls are unlimited, and each spin picks a team not already used in your lineup.",
      },
      {
        q: "Can I put a goalkeeper in midfield?",
        a: "No. The game checks each pick's own position against the slot before anything else, so a keeper is refused everywhere except goal and nobody else can take the goal. Nearby positions are fine: a centre back can shift to right back, a defensive mid can fill a CM slot.",
      },
      {
        q: "What does the rating look like?",
        a: "A rating headline, a short written analysis of your picks, and your chemistry line. Under it comes a season report: a squad rating out of 100, where you finish in a 20 team league, points, trophies and a top scorer, plus how your defence, midfield and attack compare. Every player is judged at his peak, so retired greats are not marked down for being retired.",
      },
    ],
  },

  '/football-connect-4': {
    intro: [
      "This is the Connect 4 you grew up with, except every square is earned with a soccer answer. Blue against Red on one board, four in a row wins.",
      "Each of the 7 columns and 6 rows carries an attribute. To claim a cell you name a player matching both, and gravity still applies: pieces fall to the lowest open row.",
    ],
    headings: {
      howToPlay: "How to play Soccer Connect 4, a free football trivia and four in a row game",
      rules: "Soccer Connect 4 rules: columns, rows and rejected answers",
      example: "Soccer Connect 4 walkthrough: Ronaldinho blocks a winning line",
      tips: "Soccer Connect 4 tips for choosing columns over trivia recall",
      faq: "Soccer Connect 4 FAQ: turns, rejected names and network errors",
    },
    howToPlaySections: [
      {
        heading: "Alternating turns as Blue or Red",
        items: [
          "Grab an opponent. Blue and Red alternate turns on the same device, Blue first.",
        ],
      },
      {
        heading: "Picking a column to drop your piece",
        items: [
          "Pick a column and the game highlights where your piece would drop.",
        ],
      },
      {
        heading: "Naming a player who fits both clues",
        items: [
          "Name a player fitting both the column attribute and the row attribute.",
        ],
        subsections: [
          {
            heading: "What a valid or rejected answer does",
            items: [
              "A valid answer claims the cell. A rejection lets you try another name or cancel.",
            ],
          },
        ],
      },
      {
        heading: "Winning with four in a row",
        items: [
          "Connect 4 of your color in any direction to win.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "A board of seven columns and six rows",
        items: [
          "The board is 7 columns by 6 rows.",
        ],
      },
      {
        heading: "Each name only works once per game",
        items: [
          "Each player name works once per game, for either side.",
        ],
      },
      {
        heading: "Skipping turns, draws and rejected answers",
        items: [
          "You can skip a turn, and a full board with no winner is a draw.",
          "Answers are AI verified. Rejections do not pass your turn, and network errors never count against you.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Blocking a line with Ronaldinho",
        paragraphs: [
          "The column says Played for Barcelona, the row says World Cup Winner, and the drop spot blocks Red's line. Ronaldinho verifies, and the threat dies.",
        ],
      },
      {
        heading: "Roberto Carlos keeps a diagonal alive",
        paragraphs: [
          "Red answers Brazilian plus Champions League Winner with Roberto Carlos to keep a diagonal alive. Every answer is also a tactical move, and knowing the name is only half the battle.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Playing the board before the trivia",
        items: [
          "Play the board first, trivia second. A brilliant answer in a useless column is wasted.",
        ],
      },
      {
        heading: "Why center columns matter most",
        items: [
          "Center columns touch the most lines of four, so spend your deepest knowledge there.",
        ],
      },
      {
        heading: "Tracking which names are already burned",
        items: [
          "Track burned names. Spending a do everything legend early starves your endgame.",
        ],
      },
      {
        heading: "When skipping beats a bad drop",
        items: [
          "Skipping beats dropping a piece that sets up your opponent.",
        ],
      },
    ],
    faqs: [
      {
        q: "Can I play solo?",
        a: "There is no AI opponent; it is built for two people sharing a screen. Playing both sides yourself works fine as practice.",
      },
      {
        q: "What is the daily mode?",
        a: "Everyone gets the same daily board, and your game in progress saves in your browser. Unlimited mode deals random boards for rematches.",
      },
      {
        q: "What if a correct player is rejected?",
        a: "The AI referee is strict and occasionally wrong. A rejection never ends your turn, so rephrase or pick someone else, and report the cell if a fair answer got robbed.",
      },
    ],
  },

  '/soccer-grid': {
    intro: [
      "Soccer Grid is the team grid idea rebuilt for football: a daily 3x3 board where every cell needs a player who satisfies its row and its column at once.",
      "Filling it is half the game. Every correct answer shows how many others picked the same name, and the flex is a low rarity score from picks nobody thought of.",
    ],
    headings: {
      howToPlay: "How to play Soccer Grid, a free daily soccer grid puzzle",
      rules: "Soccer Grid rules: guesses, timers and the rarity score",
      example: "Soccer Grid walkthrough: Benzema, then a nine for nine finish",
      tips: "Soccer Grid tips for keeping your rarity score low",
      faq: "Soccer Grid FAQ: daily resets, rare picks and Overtime",
    },
    howToPlaySections: [
      {
        heading: "Locking your tier and timer on guess one",
        items: [
          "Pick a difficulty tier and optional timer; your first guess locks both for the day.",
        ],
      },
      {
        heading: "Reading a cell's two requirements",
        items: [
          "Tap a cell to see its two requirements, like a club crossed with a nationality.",
        ],
      },
      {
        heading: "Submitting a player for a rarity score",
        items: [
          "Search a player and submit. Correct answers turn green with a rarity percentage.",
        ],
        subsections: [
          {
            heading: "Budgeting fifteen guesses across nine cells",
            items: [
              "Budget carefully: 15 guesses for 9 cells, and every submission spends one.",
            ],
          },
        ],
      },
      {
        heading: "Finishing and sharing the emoji board",
        items: [
          "Finish, or run out of guesses or clock, then share the emoji board.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Fifteen guesses and six allowed misses",
        items: [
          "15 guesses total, and correct answers consume guesses too, leaving room for 6 misses.",
        ],
      },
      {
        heading: "Choosing a timer from unlimited to forty seconds",
        items: [
          "Timers: Unlimited, 90, 60, or 40 seconds, starting on your first guess.",
        ],
      },
      {
        heading: "What easy and hard grids ask for",
        items: [
          "Easy grids lean on clubs, leagues, and positions. Hard brings awards plus Champions League and World Cup winners.",
        ],
      },
      {
        heading: "How rarity score is worked out",
        items: [
          "Rarity score is the average pick percentage across your correct cells. Lower is better.",
          "If the checker cannot verify an answer, you retry free with no guess burned.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Benzema solves Real Madrid and France",
        paragraphs: [
          "Real Madrid crossed with France makes Karim Benzema the obvious green, at 44 percent. For Barcelona and Brazil you skip Neymar and submit Rivaldo: 6 percent, beautiful.",
        ],
      },
      {
        heading: "Kaka finishes a nine for nine grid",
        paragraphs: [
          "The last corner wants a Champions League winner who played in Serie A. One miss, then Kaka clicks in: 9 for 9, rarity 19 percent.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Saving rare picks for the easy cells",
        items: [
          "Spend rare picks on the easy cells. Rarity is won where everyone answers.",
        ],
      },
      {
        heading: "Journeymen cover the weird crossings",
        items: [
          "Journeymen who hopped leagues and countries cover the weird crossings.",
        ],
      },
      {
        heading: "Planning all nine cells before a timer starts",
        items: [
          "On a timer, plan all nine cells before your first submission starts the clock.",
        ],
      },
      {
        heading: "What Overtime does to your score",
        items: [
          "Overtime lets you keep filling leftover cells with no effect on your recorded score.",
        ],
      },
    ],
    faqs: [
      {
        q: "When does a new grid come out?",
        a: "Every day at midnight Eastern Time, and everyone on your difficulty tier sees the same grid.",
      },
      {
        q: "What counts as a rare answer?",
        a: "Under 5 percent of the field is rare, 5 to 25 uncommon, over 25 standard. Your score averages the percentages across correct cells.",
      },
      {
        q: "Can I change settings mid puzzle?",
        a: "No, both lock at your first guess, so the clock cannot be dodged and the grid cannot be rerolled.",
      },
      {
        q: "What is Overtime?",
        a: "An optional period after the round ends: unlimited guesses on the leftover cells while your recorded score stays frozen.",
      },
    ],
  },

  '/world-cup-bracket': {
    intro: [
      "The 2026 World Cup has been played: Spain beat Argentina 1-0 after extra time in the final at MetLife Stadium on July 19. Build your bracket here anyway, then score it against what really happened, group by group and round by round, awards included.",
      "The 2026 World Cup runs 48 teams, 12 groups, and 104 matches, and this predictor lets you call all of it: every group game by exact score, every knockout winner, and the awards.",
      "The field is the real one, playoff winners included, and the format follows FIFA's: top two per group advance plus the 8 best third place teams into a round of 32.",
    ],
    headings: {
      howToPlay: "How to play World Cup 2026 Bracket, a free soccer predictor and bracket game",
      rules: "World Cup 2026 Bracket rules: groups, standings and the round of 32",
      example: "World Cup 2026 Bracket walkthrough: a Group J tiebreak and a Brazil upset",
      tips: "World Cup 2026 Bracket tips for filling a sharper bracket",
      faq: "World Cup 2026 Bracket FAQ: scoring, groups and the real result",
    },
    howToPlaySections: [
      {
        heading: "Locking in scores for every group match",
        items: [
          "Type exact scores for the 6 matches in each group. Standings update live.",
          "Watch the colors: green rows are through, yellow marks a possible best third.",
        ],
      },
      {
        heading: "Confirming your eight third place teams",
        items: [
          "Confirm your 8 third place qualifiers and generate the bracket.",
        ],
      },
      {
        heading: "Advancing picks through the knockout bracket",
        items: [
          "Pick winners from the round of 32 through the final, third place game included.",
        ],
      },
      {
        heading: "Naming the awards and reading your score",
        items: [
          "Call the Golden Boot, Golden Glove, and Golden Ball, then share it all.",
          "Read your score at the bottom: every qualifier, knockout team, the champion and each award checked against the real results, out of 166 points.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "How group matches and scoring work",
        items: [
          "12 groups of 4 make 72 group matches, and score inputs go up to 9 goals a side.",
        ],
      },
      {
        heading: "Ranking standings by points and goals",
        items: [
          "Standings use the real rules: 3 points a win, 1 a draw, then goal difference, then goals scored.",
        ],
      },
      {
        heading: "Which teams reach the round of 32",
        items: [
          "32 teams advance: 12 winners, 12 runners up, and your 8 chosen thirds.",
        ],
        subsections: [
          {
            heading: "Auto filling results with By Rank",
            items: [
              "By Rank auto fill uses real FIFA rankings: the higher ranked side wins 65 percent of sims, the underdog 20, and 15 percent draw.",
            ],
          },
        ],
      },
    ],
    exampleSections: [
      {
        heading: "A tiebreak battle in Group J",
        paragraphs: [
          "In Group J you hand Argentina three routine wins, then pencil an Austria and Algeria draw that leaves third place hanging on goal difference.",
        ],
      },
      {
        heading: "Brazil survives a semifinal collision",
        paragraphs: [
          "By the knockouts your France and Brazil picks collide in a semifinal, so somebody goes home early. You send Brazil through, save the bracket, and drop the link in the group chat.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Splitting hand picks from the auto tools",
        items: [
          "Fill groups you know by hand, and save the auto tools for matchups you have no read on.",
        ],
      },
      {
        heading: "Why third place slots swing brackets",
        items: [
          "Third place picks quietly decide brackets. A soft third in the right slot gifts your favorite an easy round of 32.",
        ],
      },
      {
        heading: "Pricing draws low and fixing one group",
        items: [
          "Draws are rarer than instinct says. The simulator prices them at 15 percent.",
          "Reset one group instead of wiping everything when you change your mind.",
        ],
      },
    ],
    faqs: [
      {
        q: "Do I need an account?",
        a: "Not to build a bracket; it stores in your browser as you go. Signing in is only for saving a bracket to a share link others can open.",
      },
      {
        q: "Are the groups real?",
        a: "Yes, the 12 groups are the 48 teams that played, playoff winners included, and the auto fill rankings are the FIFA list from just before the tournament.",
      },
      {
        q: "Is my bracket scored?",
        a: "Yes, since the tournament was played. The panel under the bracket checks your qualifiers, every knockout round, the champion and the three awards against the real 2026 results, out of 166 points. There is no pool and nothing is submitted anywhere.",
      },
    ],
  },

  '/soccer-conquest': {
    intro: [
      "The imperialism map format comes to football. Ninety six clubs from the Premier League, La Liga, Serie A, the Bundesliga and Ligue 1 sit on one map of Europe, every region starts in the hands of the nearest club of its own country, and when two clubs meet the winner takes everything the loser owns.",
      "Nothing here is typed. Club strength is real squad market value, so Real Madrid open as the giants and a promoted side like Le Mans opens as the long shot, which is exactly the club you want to be riding when the upset lands.",
    ],
    headings: {
      howToPlay: "How to play Soccer Conquest, a free online soccer strategy map game",
      rules: "Soccer Conquest rules: regions, scoring and the Daily Challenge",
      example: "Soccer Conquest walkthrough: Brentford topples Bayern Munich",
      tips: "Soccer Conquest tips for reading the odds and surviving wipeouts",
      faq: "Soccer Conquest FAQ: strength ratings, playoffs and daily runs",
    },
    howToPlaySections: [
      {
        heading: "Picking your club from all 96",
        items: [
          "Pick your club from all 96, grouped by league. The tile shows the squad value its strength comes from.",
        ],
      },
      {
        heading: "Calling each matchday's 48 games",
        items: [
          "Each matchday pairs the whole continent into 48 games. Before it plays, call your club's game. The card shows each side's win odds.",
        ],
      },
      {
        heading: "Playing the matchday and redrawing the map",
        items: [
          "Play the matchday. Winners annex everything the losers held, and the map redraws in one swing.",
        ],
      },
      {
        heading: "Surviving ten matchdays into the playoffs",
        items: [
          "Survive 10 matchdays. The top 8 empires by region make the playoffs, record breaking ties.",
        ],
        subsections: [
          {
            heading: "Winning the knockout to rule the map",
            items: [
              "Win the Quarter-finals, the Semi-finals and the Imperial Final to rule the map.",
            ],
          },
        ],
      },
    ],
    ruleSections: [
      {
        heading: "The matchday format and knockout bracket",
        items: [
          "10 regular matchdays, then an 8 club knockout bracket.",
        ],
      },
      {
        heading: "How the 154 regions are laid out",
        items: [
          "154 regions: 96 club home areas plus the countryside between them, which opens in the hands of the nearest club of the same country.",
        ],
      },
      {
        heading: "Scoring calls, regions and the crown",
        items: [
          "Scoring: 25 points per correct call, 3 per region held at the end, 200 for the crown, 50 for making the playoffs.",
        ],
      },
      {
        heading: "Wiped out clubs and level game penalties",
        items: [
          "Wiped out clubs keep playing, and one win takes back a whole empire.",
          "Level games go to penalties, so there are no draws, ever.",
        ],
      },
      {
        heading: "Squad value strength and the Daily Challenge",
        items: [
          "Strength is the 2026 squad market value on record, mapped onto the same 55 to 95 band the other conquest maps use. The value is the sum of the players the table holds for that club, so every tile says how many that is, and a club with only a handful on record is rated on those few and says partial data.",
        ],
        subsections: [
          {
            heading: "Daily Challenge versus Free Play",
            items: [
              "The Daily Challenge deals every player the same date seeded season: same opening map, same fixtures, same results. One scored run per day with streaks. Free Play is unlimited and fully random.",
            ],
          },
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Brentford calls an upset over Bayern Munich",
        paragraphs: [
          "You ride Brentford. Matchday 1 pairs you with Bayern Munich, the odds sit under fifty, you call the upset anyway and it lands on penalties: Bavaria is yours.",
        ],
      },
      {
        heading: "Falling to Lecce and clawing back from Genoa",
        paragraphs: [
          "By matchday 6 you hold a strip from west London to the Alps, then lose the lot to Lecce in ninety minutes. Matchday 8 you take an empire back off Genoa, sneak in as the eighth seed, and the bracket gets interesting.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Trusting the odds over your heart",
        items: [
          "Call games with the odds, not your heart. The percentages come from real squad values.",
        ],
      },
      {
        heading: "Bouncing back after getting wiped out",
        items: [
          "Landless is one good night from owning a coastline. Do not panic when you get wiped.",
        ],
      },
      {
        heading: "Watching seeding and beatable giants late",
        items: [
          "Check the standings late. Seeding goes by regions, so the last matchdays are about protecting your count.",
          "A big empire gets overextended and a landless club fights harder, so a giant on a losing run is beatable.",
        ],
      },
    ],
    faqs: [
      { q: "How does the Daily Challenge work?", a: "Everyone gets the same season today: identical opening map, identical fixtures, identical results. Your score comes from which club you back and how well you call its games. One scored run per day, streaks build if you show up daily, and a fresh map drops at midnight Eastern. Free Play stays unlimited." },
      { q: "Where do the strengths come from?", a: "From the 2026 squad market values on record for each club, summed and mapped onto a 55 to 95 band. Nothing is hand rated. Every tile says how many players the sum covers, and a promoted club with only a handful on record is rated on those few and says partial data." },
      { q: "Why is the map made of hexagons?", a: "It is a cartogram: every region is one hex, laid out so the five countries sit where they do in Europe. Most club home hexes are named after the real district the ground is in; where two clubs share a city, Milan and Rome, they split it north and south; the rest are named after the real countryside between them." },
      { q: "Can the season end early?", a: "Yes. If one club annexes every region before matchday 10, total conquest crowns it immediately." },
      { q: "How do the playoffs work?", a: "The top 8 empires seed a knockout: Quarter-finals, Semi-finals, then the Imperial Final. Regions decide seeding, record breaks ties." },
    ],
  },

  '/soccer-career': {
    intro: [
      "Every soccer career simulator promises the same fantasy: start as a nobody, retire as a legend. This one makes the middle the good part. You begin at 16 in a youth academy and live season by season through contracts, transfers, injuries, feuds, trophies, and increasingly questionable purchases, until the game hands down a legacy verdict.",
      "It is the most played game on DoUKnowBall, and it sits closer to a life sim than to a match engine. You never dribble anyone. You make decisions, and the sim turns them into a story that is different every run.",
      "Your save lives in your browser, one career at a time, so choices carry weight into the years that follow them.",
      "You build your player's actual face before kickoff: skin tone, hairstyle and colour, facial hair, a boot line, an accessory, and a signature celebration that gets described every time you score. That look follows you onto the Ballon d'Or stage and into your retirement send off.",
      "There is a dirty side too. Bent officials, betting syndicates, kickbacks, offshore accounts and laundering fronts all sit there waiting, each one heating up a hidden investigation meter. Take enough envelopes and the dawn raid comes, then the trial, then a season inside and a comeback from nothing.",
    ],
    headings: {
      howToPlay: "How to play Soccer Career, a free football career simulation game",
      rules: "Soccer Career rules: growth, legacy and the corruption meter",
      example: "Soccer Career walkthrough: a striker's rise to a Ballon d'Or revenge arc",
      tips: "Soccer Career tips for growing stats and building your legacy",
      faq: "Soccer Career FAQ: saves, the Ballon d'Or and corruption mode",
    },
    howToPlaySections: [
      {
        heading: "Creating your player and building your look",
        items: [
          "Create your player: name, one of 50 nationalities, one of 10 positions, and a starting era from the 1990s to the 2020s.",
          "Build your look in the appearance editor: 12 skin tones, 23 hairstyles, 16 hair colours, 14 beard styles, 16 accessories, 18 boot lines, and 19 signature celebrations, or hit Surprise me.",
        ],
      },
      {
        heading: "Rolling potential and customizing your build",
        items: [
          "Roll your starting potential, somewhere in the mid 50s to high 60s, and reroll as many times as you like. Rerolls are free and there is no limit on them.",
          "Open Customize your build to set your starting overall anywhere from 40 to 99, move points between the six attribute families, shape the specifics under each family, and set your height and weight.",
        ],
      },
      {
        heading: "Starting in the academy and turning pro",
        items: [
          "Begin in an academy matched to your nationality and talent. Pro contract offers arrive from age 17.",
        ],
      },
      {
        heading: "Advancing seasons through the training ground",
        items: [
          "Advance season by season through simulated stats, newspaper headlines, random events, and decisions.",
          "Open the training ground (the dumbbell button, bottom right) once a season. Your position picks a drill you actually play: keepers hold and drag a glove save dive, centre backs, full backs and defensive midfielders time a tackle on a moving ball, and everyone else times a wall shot through a gap that opens and closes. Today's ten rounds are the same for everyone at your position and count once; practice is unlimited and banks nothing.",
        ],
      },
      {
        heading: "Working transfer windows and the shop aisles",
        items: [
          "Work the transfer windows: stay, extend, request a move, or weigh rival offers and dream club pay cuts.",
          "Spend the money in 8 shop aisles: property, vehicles, investments, lifestyle, performance, flex, family, and a shady aisle that only appears once you have something to hide.",
        ],
        subsections: [
          {
            heading: "Retiring into management, punditry or ownership",
            items: [
              "Retire, on your terms or your body's, collect the legacy verdict, then carry on as a manager, pundit, or owner if you want.",
            ],
          },
        ],
      },
    ],
    ruleSections: [
      {
        heading: "How stats grow through your prime",
        items: [
          "Stats grow slowly and honestly: 1 to 3 points a year through the academy and your prime, less once you pass 86, and barely at all above 90. Reaching world class is a decade of work, not three good seasons.",
          "Growth fades once your hidden prime type (early, normal, late, or extended) ends, with decline turning brutal from 38.",
        ],
      },
      {
        heading: "Your boyhood club and retirement age",
        items: [
          "The club that raised you always offers you a first team deal when you turn pro, so you can spend a whole career at your boyhood club, and it can call you home again from 27.",
          "Retirement is suggested from age 30 once you drop 10 off your peak or hit 75 overall, forced below 50 overall at 33 or older, and automatic at 45.",
        ],
      },
      {
        heading: "The World Cup cycle and your legacy score",
        items: [
          "The World Cup comes every 4 years. Top nations qualify about 90 percent of the time, while a small nation mostly needs a world class you.",
          "Legacy runs 0 to 100: 90 is GOAT, 80 LEGEND, 70 GREAT, 60 SOLID PRO, and less is JOURNEYMAN. The verdict also knows the overall you started at, so climbing from 54 to 91 scores better than being handed 91 on the creation screen.",
        ],
      },
      {
        heading: "Starting overall and your growth ceiling",
        items: [
          "There is no cap on your starting overall, but a high start eats the room you had to grow into, and if you are already world class as a teenager you pick up far more injuries before you turn 24.",
          "Your ceiling is not welded shut. Two seasons in a row that are both elite and decorated, while you are already pressed against it, buy one point back at a time. 99 is the hard wall and nothing gets past it.",
        ],
        subsections: [
          {
            heading: "How a position drill trains your attributes",
            items: [
              "A position drill is ten rounds and its session score is wins times ten. 50 pays +1 to the drill's attribute with next season's growth (shooting for the wall shot, defending for the tackle, reflexes for the glove save) and 80 pays +2, capped at the room between your overall and your ceiling, so a drill never lifts you past it. It shares the one training session a season with the cone slalom, sprint burst, passing gates and penalty sessions.",
            ],
          },
        ],
      },
      {
        heading: "Physical stats, morale and integrity",
        items: [
          "Height and weight are real numbers, not decoration: a tall heavy player wins more in the air and is stronger, and is slower off the mark and less agile for it.",
          "Morale runs 0 to 100 and moves with events and choices, while scandals feed an integrity ledger worth minus 30 to plus 20 legacy points at the end.",
        ],
        subsections: [
          {
            heading: "A pay cut, an injury and a rival's Ballon d'Or",
            items: [
              "A statistically dominant season cannot be snubbed at the Ballon d'Or. Outscore the whole shortlist while winning a major and the trophy is yours, and any 45 goal or 55 goal involvement season finishes on the podium at worst.",
            ],
          },
          {
            heading: "Corruption heat and dirty money",
            items: [
              "Corruption heat runs 0 to 100 and cools 8 a year when you stay clean. Past 70 the financial crimes unit can raid you, and past 90 comes a conviction, seized money, and a season in prison that wrecks your stats.",
              "Unexplained money keeps generating heat every season until you wash it through a shady business or declare it and eat the tax.",
            ],
          },
        ],
      },
    ],
    exampleSections: [
      {
        heading: "A Nigerian striker breaks out as a teenager",
        paragraphs: [
          "Take a Nigerian striker rolled at 63, a Gifted start. Two academy years push him past 70, and at 18 a bidding war breaks out. He takes minutes over money, bags 20 league goals, and the papers crown him the next superstar.",
        ],
      },
      {
        heading: "A dream transfer and a torn hamstring",
        paragraphs: [
          "At 22 a dream club calls with a pay cut, and he signs anyway. A league title lands in year two, then a torn hamstring eats half a season, and a moral dilemma offers a shady shortcut back to fitness. He refuses, banking integrity, while the rival the game spawned at his debut, a preening Brazilian winger, lifts the Ballon d'Or. The snub becomes fuel.",
        ],
      },
      {
        heading: "A revenge arc ends in LEGEND tier retirement",
        paragraphs: [
          "The revenge arc peaks at 26: a Champions League, a World Cup semifinal carrying Nigeria, then the Ballon d'Or, where he thanks the rival from the stage. An extended prime runs to 36, the fortune buys his boyhood club, and he retires at 38 with a legacy of 84, LEGEND tier, one Champions League short of GOAT talk.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Rerolling your potential before you start",
        items: [
          "Reroll your potential to 62 or better. The gap between a Promising start and a Gifted one echoes for a decade.",
        ],
      },
      {
        heading: "Training sessions and steering growth events",
        items: [
          "The training ground is the dumbbell button, one session a season. The older sessions (cone slalom, sprint burst, passing gates, penalties or shot stopping) pay +1 at 50 and +2 at 80; the position drill pays the same but stops at your ceiling. Beyond that, growth follows your age curve, and you steer it through event choices, lifestyle purchases, and the social media detox, worth plus 2 to every stat next season.",
        ],
      },
      {
        heading: "Paying for a trainer and the recovery clinic",
        items: [
          "Money matters: a personal trainer adds a stat point per season, and the recovery clinic halves injury layoffs.",
        ],
      },
      {
        heading: "Weighing the doping risk, your agent and loyalty",
        items: [
          "The doping storyline boosts every stat but risks a 20 percent failed test each season it runs, and failing means a 1 season ban and a wrecked reputation.",
          "Your personality and your agent shape the whole run. The Showman grows followers 60 percent faster, The Professor earns brand trust, and super agent Zara Blackwood opens dream club doors for a 10 percent cut.",
          "Loyalty pays: a decade at one club is worth about as much legacy as two and a half league titles.",
        ],
      },
    ],
    faqs: [
      {
        q: "How do I save my career?",
        a: "Automatically, in your browser, after every decision. There is one career per browser, and starting fresh permanently deletes the old save. An optional account adds site stats and leaderboards, but the career lives on your device.",
      },
      {
        q: "How do I win the Ballon d'Or?",
        a: "Post the best season in the world and the voters have to give it to you. If you outscore every player on the shortlist and win a league, Champions League, or World Cup, you win it outright, and any season of 45 goals or 55 goal involvements finishes top 3 at worst. Trophies still decide the close years, and a second place finish becomes next season's fuel.",
      },
      {
        q: "What happens after retirement?",
        a: "Four paths: read your legacy breakdown and walk away, farm controversy as a TV pundit, chase trophies as a manager, or buy a lower league club and run it as owner.",
      },
      {
        q: "What is the highest legacy score?",
        a: "100, with GOAT starting at 90. Expect to need multiple Ballon d'Ors and Champions Leagues, a World Cup, huge totals, and a clean record, since one scandal can separate GOAT from LEGEND.",
      },
      {
        q: "Can I play for the club I came through as a youth player?",
        a: "Yes. The senior side of your academy club always puts a contract on the table when you turn pro, usually on slightly lower wages because they know you would sign for free. Staying gives you a popularity and morale boost and unlocks the homegrown legend storylines. From 27 they can also call you back for a homecoming transfer.",
      },
      {
        q: "What is corruption mode and can it end my career?",
        a: "It is the dirty half of the game and yes, it absolutely can. Taking envelopes from a betting syndicate, paying a referee's brother in law, buying Ballon d'Or votes, or laundering cash through your own nightclub all raise a hidden heat meter. Stay hot too long and you get raided, then convicted, then you serve a season in prison while your stats rot. There is always a way out: confess, take the tax amnesty, or just stop, and heat cools every clean season.",
      },
      {
        q: "Is this a football career sim game or a management game?",
        a: "A career sim first: you steer one player's life and story, not tactics. The manager and owner modes afterward add a taste of the other side.",
      },
    ],
  },

  '/fantasy-draft': {
    intro: [
      "You and an AI rival take turns raiding one player pool until you have each drafted a full XI. Then a season is simulated, both squads get dissected, and the community votes on who built better.",
      "The wrinkle is the daily criteria: one squad building rule per day, and it is enforced, not decorative. Picks that break it are blocked for you and the AI alike.",
    ],
    headings: {
      howToPlay: "How to play Fantasy Draft, a free online soccer draft game",
      rules: "Fantasy Draft rules: the shared pool, daily criteria and voting",
      example: "Fantasy Draft walkthrough: an Under 25s rule and a keeper steal",
      tips: "Fantasy Draft tips for outdrafting the AI rival",
      faq: "Fantasy Draft FAQ: criteria, voting and legal picks",
    },
    howToPlaySections: [
      {
        heading: "Reading today's squad building criteria",
        items: [
          "Read today's criteria first. It shapes the whole draft.",
        ],
      },
      {
        heading: "Drafting snake style against the AI",
        items: [
          "Draft snake style: 22 alternating picks, with a coin flip deciding who starts.",
        ],
      },
      {
        heading: "Covering every position on the pitch",
        items: [
          "Cover every position, goalkeeper included.",
        ],
      },
      {
        heading: "Simulating the season and voting on the winner",
        items: [
          "At 11 apiece, hit Simulate Season for the story of each team's year.",
          "Read the strengths and weaknesses report, then vote for the winner.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "One shared pool for both drafters",
        items: [
          "Both sides draft 11 players from one shared pool, so a taken player is gone for both.",
        ],
      },
      {
        heading: "The daily criteria's exact numbers",
        items: [
          "Rules come with exact numbers: Under 25s, a 1 billion pound squad cap, One Nation (max 3 per country), Bargain Hunt (60 million or less each), Wonderkids (outfielders 21 or under), or Galacticos (outfielders 80 million plus).",
        ],
      },
      {
        heading: "Blocked picks are relaxed automatically",
        items: [
          "Illegal picks are blocked with the reason shown, relaxing only when no legal option remains.",
        ],
        subsections: [
          {
            heading: "Signing in before you vote",
            items: [
              "Voting requires signing in, so nobody stuffs the ballot.",
            ],
          },
        ],
      },
    ],
    exampleSections: [
      {
        heading: "An Under 25s rule blocks your opening pick",
        paragraphs: [
          "The rule is Under 25s, so your 27 year old superstar opener dies on contact: blocked. Round one becomes a wonderkid land grab, and the AI, which leans expensive, snaps up the priciest young forward on the board.",
        ],
      },
      {
        heading: "Grabbing a keeper late while the AI stalls",
        paragraphs: [
          "You counter with a young keeper, because the AI leaves goalkeepers late. By pick 22 both rosters are packed with kids, and the vote breaks your way.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Drafting against what the AI values",
        items: [
          "Draft against the AI's taste: it chases market value, so grab the cheap positional glue it ignores.",
        ],
      },
      {
        heading: "Spreading money under a budget cap",
        items: [
          "Under a budget cap, one megastar eats a third of your money. Spread it.",
        ],
      },
      {
        heading: "Scarcity, speed and keeping a shortlist ready",
        items: [
          "Scarcity beats stardom mid draft. Two keepers left is a pick, not a luxury.",
          "The AI picks in about 2 seconds, so keep a shortlist ready for every position.",
        ],
      },
    ],
    faqs: [
      {
        q: "Who decides the winner?",
        a: "The community. After the season stories and analysis, players vote for the squad they rate higher, and the totals are shown. One vote per signed in account.",
      },
      {
        q: "Does the criteria change?",
        a: "Yes, a fresh rule arrives each day, spanning age caps, budget caps, price floors, and nationality limits. Both sides live under it.",
      },
      {
        q: "Can the AI cheat the rule?",
        a: "No, its picks pass the same legality check as yours. It relaxes for either side only when the pool has no legal option left, so every draft can finish.",
      },
    ],
  },

  '/transfer-path': {
    intro: [
      "Two players sit at opposite ends of a chain, and you link them through shared dressing rooms. It is six degrees of separation for football.",
      "The catch: teammates means actual teammates. Two stars who wore the same shirt years apart do not count. Every link needs the same club in the same season.",
    ],
    headings: {
      howToPlay: "How to play Transfer Path, a free daily soccer chain puzzle",
      rules: "Transfer Path rules: valid links, scoring and special rules",
      example: "Transfer Path walkthrough: Gerrard to Messi through Luis Suarez",
      tips: "Transfer Path tips for chaining teammates fast",
      faq: "Transfer Path FAQ: rejected links, hints and scoring",
    },
    howToPlaySections: [
      {
        heading: "Reading the start, target and optimal steps",
        items: [
          "Check the start player, the target, and the optimal step count on the card.",
        ],
      },
      {
        heading: "Typing teammates to build the chain",
        items: [
          "Type a player who was a club teammate of the start player. Real links join the chain with the shared club labeled.",
        ],
      },
      {
        heading: "Connecting to your chain's most recent name",
        items: [
          "Keep connecting to the most recent name in your chain.",
        ],
      },
      {
        heading: "Reaching the target and closing the chain",
        items: [
          "Reach the target to win. If a new player also links to the target, the chain closes automatically.",
        ],
      },
      {
        heading: "Taking a hint or giving up",
        items: [
          "Stuck? Take the hint, or give up to see a full working path.",
        ],
        subsections: [
          {
            heading: "Picking a special rule for a harder chain",
            items: [
              "Want it harder? Pick a special rule above the card: Active players only, or Europe only. The optimal on the card changes with the rule.",
            ],
          },
        ],
      },
    ],
    ruleSections: [
      {
        heading: "What counts as a valid club link",
        items: [
          "A valid link is the same club in the same season, not the same club ever.",
        ],
      },
      {
        heading: "Scoring from 1000 down to a floor of zero",
        items: [
          "Scoring starts at 1000 for the optimal path and drops 100 per extra step, with a floor of 0.",
        ],
      },
      {
        heading: "Free retries and the daily versus unlimited puzzle",
        items: [
          "Invalid names cost nothing. No attempt limit, no timer.",
          "One shared daily puzzle, plus unlimited practice puzzles.",
        ],
      },
      {
        heading: "How the special rules change your optimal",
        items: [
          "Active players only: every name in the chain, the start and the target included, is in our verified 2026 active-player records. Europe only: every club a link goes through is a European club. Each rule has its own optimal, worked out on the players that rule leaves in play.",
        ],
        subsections: [
          {
            heading: "When the harder rule reaches the daily puzzle",
            items: [
              "A special rule reaches the daily only when today's pair has a route under it; otherwise the daily plays the everyday rule and the rule waits for you in unlimited. The daily score still counts steps against the everyday optimal, so a rule is a harder road to the same finish line. Unlimited scores against the rule's own optimal.",
            ],
          },
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Gerrard to Messi through Luis Suarez",
        paragraphs: [
          "Say it is Steven Gerrard to Lionel Messi, optimal in 2 steps. Gerrard played with Luis Suarez at Liverpool, and Suarez spent years beside Messi at Barcelona, so you type Suarez and the chain autocompletes for the full 1000.",
        ],
      },
      {
        heading: "A longer chain still wins at a lower score",
        paragraphs: [
          "Wander through four or five names instead and you still win, just at 800 or 700. The share line shows your steps against the optimal.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Thinking in well traveled player hubs",
        items: [
          "Think in well traveled hubs: serial movers like Zlatan Ibrahimovic connect whole leagues by themselves.",
        ],
      },
      {
        heading: "Working backwards to meet in the middle",
        items: [
          "Work backwards from the target too. Meeting in the middle beats a blind march.",
        ],
      },
      {
        heading: "Matching eras and testing free hunches",
        items: [
          "Match eras before clubs. A clever link fails if the careers never overlapped there.",
          "Wrong attempts are free, so test hunches instead of agonizing.",
        ],
      },
    ],
    faqs: [
      {
        q: "Why was my link rejected when both played for the same club?",
        a: "Timing. Cristiano Ronaldo and Kylian Mbappe both wore Real Madrid white, but six years apart, so they never link.",
      },
      {
        q: "What happens if I give up?",
        a: "You see a real shortest path through the player pool, and a surrendered daily still counts as played for the day.",
      },
      {
        q: "How is it scored?",
        a: "1000 points for matching the optimal step count shown up front, minus 100 for each extra step your chain took.",
      },
      {
        q: "Why does a name get refused under a special rule when the two really were teammates?",
        a: "Because the rule removed it. With Active players on, anyone outside the verified 2026 active-player records is off the board. With Europe only enabled, a season shared at a club outside Europe does not count as a link. The refusal says which rule got in the way.",
      },
    ],
  },

  '/squad-deal': {
    intro: [
      "Squad Deal crosses building an XI with a blind box gamble. Every position is a wall of mystery boxes, you claim one blind, and a banker keeps ringing with tempting named alternatives.",
      "You never quite know what you are holding until it is too late, which is the point. The finished squad gets simulated, graded, and logged on a leaderboard saved to your device.",
    ],
    headings: {
      howToPlay: "How to play Squad Deal, a free online soccer box opening game",
      rules: "Squad Deal rules: box odds, chemistry and the letter grades",
      example: "Squad Deal walkthrough: a Traffic Cone and a Premier League B",
      tips: "Squad Deal tips for reading the banker's offers",
      faq: "Squad Deal FAQ: grading, extras and your leaderboard",
    },
    howToPlaySections: [
      {
        heading: "Setting up your theme, formation and modes",
        items: [
          "Set up: Current Stars or All-Time Legends, an optional theme like Premier League only, one of 9 formations, and whether meme players can lurk in the boxes.",
        ],
      },
      {
        heading: "Picking a hidden box for each position",
        items: [
          "Tap a position, face up to 10 hidden players, and keep one box sight unseen.",
        ],
      },
      {
        heading: "Opening rounds and the banker's offers",
        items: [
          "Open the rest in short rounds. Between rounds the banker offers a named player: accept to fill the slot or keep opening.",
        ],
      },
      {
        heading: "Finishing slots and simulating for a grade",
        items: [
          "Refuse everything and you finish the slot from the last unopened boxes.",
          "After the XI, play the 5 extras, then simulate for your grade.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "How boxes are seeded top to bottom",
        items: [
          "Boxes are seeded stars to scrubs: on a full board of 10, a couple come from the top of the pool and a couple from the bottom.",
        ],
      },
      {
        heading: "How the banker sweetens later rounds",
        items: [
          "Offers strengthen in later rounds, roughly 1 in 4 is a sweetener near the best player left, and the banker never repeats an offer.",
        ],
      },
      {
        heading: "Final rating and the letter grades",
        items: [
          "Final rating: players 82 percent, chemistry 18 percent, plus extras. Chemistry counts shared clubs and nationalities.",
        ],
        subsections: [
          {
            heading: "The grade cutoffs from A+ to D",
            items: [
              "Grades: 84 and up is A+, 76 is A, 66 is B, 55 is C, below that D.",
            ],
          },
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Declining the banker's mid 80s offer at striker",
        paragraphs: [
          "At striker you keep box 4. Two scrubs and a star flip out, the banker offers a solid mid 80s name, and you decline. Next round burns another elite option, and his follow up is weaker, because the field left in play got worse.",
        ],
      },
      {
        heading: "The Traffic Cone lands but chemistry saves the grade",
        paragraphs: [
          "You ride it to the end and out comes The Traffic Cone. Your all Premier League chemistry still drags the sim to a B, logged with formation and date.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Judging the banker against what remains",
        items: [
          "Judge the banker against what is left, not what is gone. His offer tracks the unopened average.",
        ],
      },
      {
        heading: "Taking early offers at thin positions",
        items: [
          "Take early offers at thin positions like goalkeeper. Deep positions can afford greed.",
        ],
      },
      {
        heading: "Legends mode safety and Meme mode chaos",
        items: [
          "In Legends mode every box holds an all time great, so gambling to the last box is far safer.",
          "Meme mode is chaos on purpose: a few joke players are secretly elite, most are Sunday league.",
        ],
      },
    ],
    faqs: [
      {
        q: "How does grading work?",
        a: "The sim averages your XI's ratings, blends chemistry, applies extras, and the letter falls out of the number: A+ needs 84, under 55 is a D.",
      },
      {
        q: "What are the extras?",
        a: "Five mini deal boards: Manager, Stadium, Fan Base, Transfer Budget, and Home Kit, each with 6 options carrying rating and chemistry modifiers. Keep a case, watch 3 flip, then deal, stay, or swap.",
      },
      {
        q: "Where does my score go?",
        a: "A leaderboard on your device logs each run's grade, rating, formation, and era. No account needed.",
      },
    ],
  },

  '/player-stock-market': {
    intro: [
      "The Player Stock Market is the anonymous portfolio game: the market opens in a real past season, hands you 200M, and asks you to fill the 4-3-3's eleven slots on nothing but the numbers.",
      "Every card is anonymous while you shop. You see the position, the age, and that season's matches, goals, assists and cards, plus the price, which is the player's real market value that year. Never a name, a country or a club, because knowing who a player is would be the whole answer.",
      "When the XI is full the years roll forward one at a time to the latest season, every holding moves as it really moved, and only then do the cards turn over. Every number on every screen is real market history.",
    ],
    headings: {
      howToPlay: "How to play Player Stock Market, a free soccer investing game",
      rules: "Player Stock Market rules: the wallet, scoring and missing rows",
      example: "Player Stock Market walkthrough: a cheap card outgrows a star",
      tips: "Player Stock Market tips for reading age over the name",
      faq: "Player Stock Market FAQ: real prices, seasons and going broke",
    },
    howToPlaySections: [
      {
        heading: "Choosing the daily market or an unlimited season",
        items: [
          "Pick the daily market (the same season and the same cards for everyone today) or unlimited, where you choose the season the market opens in, 2015 to 2022, or let it roll one.",
        ],
      },
      {
        heading: "Buying anonymous cards to fill your XI",
        items: [
          "Fill the XI position by position. Each slot deals four anonymous cards from the opening season, from an expensive bet to a cheap punt. Read the age, the matches and the output, then buy exactly one at its real price.",
        ],
      },
      {
        heading: "How the wallet reserves money for later slots",
        items: [
          "The wallet always reserves enough for the remaining slots' punts, so a run can never strand you.",
        ],
      },
      {
        heading: "Stepping through the seasons after your buys",
        items: [
          "After the eleventh buy, step through the seasons one at a time. Each step shows what every holding is worth that year against what it was, and says plainly when a player has no row for a year rather than making one up.",
        ],
        subsections: [
          {
            heading: "Reaching the reveal and your final score",
            items: [
              "At the end the reveal names all eleven, prices the portfolio at the latest season's real values, and scores the run.",
            ],
          },
        ],
      },
    ],
    ruleSections: [
      {
        heading: "The 200M wallet and real market prices",
        items: [
          "The wallet is 200M for the whole XI, and prices are real market values from the opening season.",
        ],
      },
      {
        heading: "Why every card's career reaches the latest season",
        items: [
          "Cards come only from careers the data tracks through to the latest season, stated here on purpose: you are choosing among players whose story the table can finish, and a value can still crater.",
        ],
      },
      {
        heading: "How each slot's four cards span the market",
        items: [
          "A slot's four cards always span the market: one from the top of that season's range, two from the middle, and a punt the wallet can always cover. They are dealt in a shuffled order, so the price band cannot be read off where a card sits.",
        ],
      },
      {
        heading: "Scoring your return between the worst and best XI",
        items: [
          "Scoring is the return on the whole 200M. What your eleven are worth at the end is placed between the worst and the best eleven that the same 200M could really have bought from the same cards, so 100 means you played the wallet perfectly and 0 means you could not have done worse with it.",
        ],
      },
      {
        heading: "Empty wallets and missing season rows",
        items: [
          "Money you never spend buys nothing. Sitting on the wallet is not a safe play, it is a low score, because the cash you kept could have been eleven careers instead.",
          "A season with no row for a player is shown as exactly that. Nothing is ever filled in between two real values.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Choosing a 21 year old over a 29 year old striker",
        paragraphs: [
          "The market opens in 2018, the striker slot. One card reads age 21, 34 matches, 14 goals, 6 assists, 24M. Another reads age 29, 41 matches, 22 goals, 5 assists, 60M. The kid costs less than half; you take the age and the rate.",
        ],
      },
      {
        heading: "The cheap card climbs past the expensive one",
        paragraphs: [
          "You step through 2019, 2020 and on, watching the 24M card climb past the 60M one, and the reveal says the kid became a superstar worth several times what you paid. The portfolio closes well over 200M and the score lands in the eighties.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Reading age as the loudest number",
        items: [
          "Age is the loudest number on the card. A 21 year old with real minutes is the market telling you where it is going; a 31 year old at 60M is a value with mostly one direction left.",
        ],
      },
      {
        heading: "Judging the rate, not the raw count",
        items: [
          "Read the rate, not the raw count. Ten goals in 20 matches beats fourteen in 40.",
        ],
      },
      {
        heading: "Spending the wallet on purpose",
        items: [
          "Spend the wallet, but spend it on purpose. A 60M splash is ten cheap seats later, and eleven punts is a portfolio that barely moves. The reserve rule keeps you solvent either way.",
        ],
      },
      {
        heading: "Keepers, defenders and guessing a name",
        items: [
          "Keepers and defenders show few goals, so age and matches are their story.",
          "Yes, a fan might guess who the 130M card is. The game is won on the cheap seats, where age and the rate are the only edge you have.",
        ],
      },
    ],
    faqs: [
      { q: "Are the numbers real?", a: "Yes, every price, stat and season value is a real row from the market value history the rest of the site runs on. Nothing is authored, and a season with no row says so." },
      { q: "Why can I never see the names while buying?", a: "That is the game. Knowing the name would be the answer; the format is investing on stats alone, and the reveal at the end names everyone." },
      { q: "Which seasons can the market open in?", a: "2015 to 2022. Earlier seasons do not carry enough players the data still tracks today to give real choice at every position, and a later start would be too short a story to roll through." },
      { q: "Can I go bankrupt mid draft?", a: "No. Every slot always deals a punt the wallet can cover, and the buy button reserves the future punts' prices before letting you splash." },
    ],
  },
  '/search-and-discard': {
    intro: [
      "Search and Discard is the squad building duel: two managers, one shared pool of real footballers, both filling the same 4-3-3. On your turn you search three players, keep exactly one, and the other two are discarded from the whole game.",
      "That discard is the heart of it. A striker you bin can never reach the other squad, so every search is two decisions at once: who makes your XI, and who you refuse to let make theirs.",
      "When both XIs are full, the arguing stops and a simulated 38 game season settles it, derbies included. Play the CPU or pass one screen between two people.",
    ],
    headings: {
      howToPlay: "How to play Search and Discard, a free soccer squad building duel",
      rules: "Search and Discard rules: positions, discards and season scoring",
      example: "Search and Discard walkthrough: a scarce keeper wins the duel",
      tips: "Search and Discard tips for guarding scarce positions",
      faq: "Search and Discard FAQ: multiplayer, ratings and repeat picks",
    },
    howToPlaySections: [
      {
        heading: "Picking the CPU or a second player",
        items: [
          "Pick your opponent: the CPU, or a second person on the same screen.",
        ],
      },
      {
        heading: "Seeing three real players on your turn",
        items: [
          "On your turn, three real players appear. At least one always fits an open slot in your 4-3-3.",
        ],
      },
      {
        heading: "Keeping one player and binning the rest",
        items: [
          "Tap the one you keep, then tap the slot he plays. The other two are binned for good, for both squads.",
        ],
      },
      {
        heading: "Alternating turns until the season decides",
        items: [
          "Eleven keeps each, alternating turns. Then both XIs play the same simulated season and the table decides.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Building an identical formation from one pool",
        items: [
          "Both managers build the identical 4-3-3 from one shared pool, real players and real market values throughout.",
        ],
      },
      {
        heading: "Which nearby positions each slot accepts",
        items: [
          "Position rules use the sitewide families: wingers cover both flanks, central mids cover the holding and attacking slots, a keeper is only ever a keeper.",
        ],
      },
      {
        heading: "Discarding a player out of the entire game",
        items: [
          "A discarded player is out of the entire game. He cannot be searched again by either side.",
        ],
      },
      {
        heading: "A deterministic settle decides the season",
        items: [
          "The settle is deterministic: the same two finished XIs always produce the same season, so the draft is the game.",
        ],
        subsections: [
          {
            heading: "How your season score is worked out",
            items: [
              "Season scoring: 36 league games against a spread of opposition plus two head to head derbies, 3 points a win, 1 a draw. Your season score is your points as a share of the 114 available.",
            ],
          },
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Taking the scarce keeper over the tempting winger",
        paragraphs: [
          "Your search deals an 89 rated winger, an 84 keeper and a 76 full back, with your goalkeeper slot still open. Keeping the winger is tempting, but keepers are scarce in a shrinking pool, so you take the 84 and bin the other two, and the 89 winger is gone from the duel entirely.",
        ],
      },
      {
        heading: "A four point season win between two full squads",
        paragraphs: [
          "Ten turns later both squads stand at 11. Yours rates 82, theirs 80, the derbies split, and your side edges the season by four points.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Guarding the scarcest positions early",
        items: [
          "Guard the scarce slots. Keepers and centre backs dry up fastest in a shared pool; a late empty GK slot is a disaster.",
        ],
      },
      {
        heading: "Binning with intent late in the draft",
        items: [
          "Bin with intent. When your slots are nearly full, the keep matters less than which star you deny the other side.",
        ],
      },
      {
        heading: "Why real market value drives the ratings",
        items: [
          "Ratings follow real market value with an age correction, so a famous veteran is often worth more than his price tag suggests.",
        ],
      },
    ],
    faqs: [
      { q: 'Can both squads end up with the same player?', a: 'No. A kept player is off the pool, and a discarded player is out of the whole game, so the two XIs never overlap.' },
      { q: 'Is the season a coin flip?', a: 'No. Win chances follow the rating gap game by game, and the same two squads always settle the same way. Better drafts win more, but a two point rating edge is an edge, not a guarantee.' },
      { q: 'Is there online multiplayer?', a: 'Not yet. Online rooms need real backend work, so today it is the CPU or two people passing one screen.' },
    ],
  },
  '/free-kick': {
    intro: [
      "Every other game here asks you a question. This one asks you to hit it. Ten free kicks, a wall that grows, and a keeper who leans one way before you strike.",
      "Aim across the goal, bend it with the inside or the outside, and stop the power bar where you dare. Smash it and it sprays. Roll it and he reaches it. The corners are the only safe place and they are the hardest to find.",
    ],
    headings: {
      howToPlay: "How to play Free Kick, a free online soccer shooting game",
      rules: "Free Kick rules: power, accuracy and how goals are scored",
      example: "Free Kick walkthrough: bending a shot past a four man wall",
      tips: "Free Kick tips for reading the keeper and the power bar",
      faq: "Free Kick FAQ: the daily run, aiming and missed corners",
    },
    howToPlaySections: [
      {
        heading: "Aiming with the keys or by dragging",
        items: [
          "Aim with the arrow keys, or drag the pitch with a finger or the mouse.",
        ],
      },
      {
        heading: "Bending the flight with Q and E",
        items: [
          "Q and E bend the flight. The slower you hit it, the more it bends.",
        ],
      },
      {
        heading: "Charging and releasing the power bar",
        items: [
          "Hold space, or hold the strike button, to charge. The power bar sweeps up and down and you get the number you let go on.",
        ],
      },
      {
        heading: "Ten kicks that get harder as you go",
        items: [
          "Ten kicks a run, each one further out than the last, with more defenders in the wall and a better keeper.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Trading power against accuracy",
        items: [
          "Power beats the keeper but costs accuracy, and the cost grows faster than the power does, so a full blooded strike misses far more than it scores.",
        ],
      },
      {
        heading: "Lifting the ball past the wall",
        items: [
          "The wall only blocks what stays low. Lift it and the wall is irrelevant, but the keeper is not.",
        ],
      },
      {
        heading: "How goals are scored by distance and corner",
        items: [
          "Goals pay by distance, by the size of the wall you beat and by how close to the corner you finished. A tap into the middle pays least.",
        ],
        subsections: [
          {
            heading: "Daily kicks versus unlimited practice",
            items: [
              "The daily deals the same ten kicks to everyone and keeps your score for the day. Unlimited deals fresh ones for ever.",
            ],
          },
        ],
      },
    ],
    exampleSections: [
      {
        heading: "An open penalty rewards a corner, not power",
        paragraphs: [
          "Kick one is a penalty with nobody in the wall. The temptation is to smash it; the points are in rolling it into a corner where the keeper is not.",
        ],
      },
      {
        heading: "Lifting and bending past a four man wall",
        paragraphs: [
          "Kick seven is twenty metres out with four in the wall and the keeper leaning right. Lift it over the wall, bend it back toward the left post, and take about two thirds power so the bend still has time to work.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Reading which way the keeper leans",
        items: [
          "Watch the keeper before you strike. He is already leaning, and the far side is the side he left you.",
        ],
      },
      {
        heading: "Why two thirds power is the best trade",
        items: [
          "Two thirds power is usually the best trade: enough to reach from distance, slow enough to bend and straight enough to land where you aimed.",
        ],
      },
      {
        heading: "Beating a big wall with height and width",
        items: [
          "Height beats the wall, width beats the keeper. From distance with a big wall you need both, which is why those kicks pay the most.",
        ],
      },
    ],
    faqs: [
      { q: 'Is the daily the same for everyone?', a: 'Yes. The ten kicks come from the date, so every player gets the same run, and your score is kept for the day.' },
      { q: 'Do I need a keyboard?', a: 'No. Drag the pitch to aim and let go to strike, which works the same on a phone.' },
      { q: 'Why did my perfect corner go wide?', a: 'Because of how hard you hit it. Power sprays the ball off the spot you picked, and near the post there is no room to spray into.' },
    ],
  },
};
