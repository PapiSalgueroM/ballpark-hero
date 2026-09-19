import type { GameContentMap } from './types';

// Soccer game guides, batch 1. Casual human tone, no em dashes anywhere.
export const SOCCER_CONTENT_1: GameContentMap = {
      '/budget-builder': {
    intro: [
      "Budget Builder gives you a huge pot of transfer money and one job: sign the best eleven the market allows. Prices are real market values, so every superstar you grab starves another position.",
      "The twist is the cap: always 62 percent of what the priciest possible XI would cost in your chosen market, so you can never just buy the best name for every slot.",
    ],
    howToPlay: [
      "Pick a market: Today's 2026 values, or the 2015 or 2007 market where the money and names change completely.",
      "Choose one of 9 formations. In the Today market you can also narrow the pool, say Premier League only.",
      "Tap a slot to shop that position. Only players you can currently afford are listed.",
      "Sign someone and their value leaves your budget. Release anyone for a full refund.",
      "Fill all eleven for your team rating, then play the Money XI final.",
    ],
    rules: [
      "The cap is 62 percent of the priciest possible XI for your era, formation and pool, rounded to the nearest 10 million, never below 100 million, and always shown on screen.",
      "Team rating is the average of your eleven ratings, on a ratings curve that tops out at 96.",
      "One board demand runs per day, worth 100 bonus score if the finished XI meets it. It never blocks a signing.",
      "Final score is rating times 10, plus 1 point per 20 million unspent, plus the demand bonus, plus 150 for a series win or 50 for a draw.",
    ],
    example: [
      "You take the Today market in a 4-3-3 and blow half the cap on the front line, Haaland through the middle. The defense budget looks grim, so you release a winger and bargain hunt for fullbacks.",
      "The XI rates 82, the daily demand wanted two players under 15 million, and your fullbacks tick it. You edge the Money XI 2 legs to 1 for the full haul.",
    ],
    tips: [
      "Strikers and wingers eat budgets. Cheap quality lives at fullback and in goal.",
      "Veterans are bargains: a 33 year old star costs a fraction of his prime price and still rates well.",
      "Check the board demand before spending. Demands like six nationalities are easier to build toward than to retrofit.",
    ],
    faqs: [
      {
        q: "Is the budget really a billion dollars?",
        a: "On the modern board, yes: exactly one billion, in dollars, which is the currency the real market values are recorded in. The best possible XI costs well past it, so the squeeze is real. Historic eras recompute their cap from their own smaller market, 62 percent of the priciest possible XI, so every era forces the same choices.",
      },
      {
        q: "What is the Money XI?",
        a: "The squad money would buy with no cap at all: the priciest available player in every slot. Your capped team faces it over three legs.",
      },
    ],
  },

  '/rebuild': {
    intro: [
      "Rebuild Challenge drops you into a real club's 2026 squad with a pot sized to the badge and a wheel that decides which shirt you judge next. Spin, keep or sell the man it lands on, and leave the place better than you found it.",
      "The target scales with the job: elite squads need a nudge, modest ones a renovation. Two envelopes land before the first spin, the board's and the finance department's, more arrive as the window goes on, punishment cards wait behind every missed demand, and two computer managers rebuild rival clubs beside you.",
      "Up to four can play on one phone: pass and play, against the CPU, or a mix. Each seat rebuilds its own club through the same window, then every finished XI plays one simulated season, with a table, records and trophies at the end.",
    ],
    headings: {
      howToPlay: "How to play Rebuild Challenge, a free online football rebuild game",
      rules: "Rebuild Challenge rules: seats, envelopes and the rebuild target",
      example: "Rebuild Challenge walkthrough: a modest club chasing Job Done",
      tips: "Rebuild Challenge tips for spins, sales and bidding wars",
      faq: "Rebuild Challenge FAQ: seats, saves and the finance envelopes",
    },
    howToPlaySections: [
      {
        heading: "Choosing your seats for solo or pass and play",
        items: [
          "Say who is playing: just you, or two to four seats on one phone. Seat one is you; tap any other seat to make it a friend (pass and play) or the CPU. The seats lock once the first club is picked.",
        ],
      },
      {
        heading: "Setting a market restriction before the draft",
        items: [
          "Pick a market restriction first: the open market, the top five leagues only, under 25s only, wonderkids only (21 and under) or the bargain bin (nobody over 30 million). It locks the moment you pick a club.",
        ],
        subsections: [
          {
            heading: "Drafting a real club and two opening envelopes",
            items: [
              "Pick a real club, tiered from elite down to modest (only clubs with a complete 2026 squad are offered, so the list moves with the data). At a fuller table each human picks in seat order, no club can be taken twice, and the CPU seats draw clubs from the same tier as the first pick. The board's envelope is open on the desk: its mood, its money and its demands. Then pick one of fifteen finance envelopes blind and live with it.",
            ],
          },
        ],
      },
      {
        heading: "Hiring a manager before the first spin",
        items: [
          "Hire a manager or keep the man you have for free. Each of the three candidates gets more out of one kind of player (the under 25s, the over 30s, the defence or the attack), and the number beside each name is what your XI reads with him in charge.",
        ],
      },
      {
        heading: "Spinning the wheel and deciding each shirt",
        items: [
          "SPIN. The wheel draws one of your eleven shirts in a hidden order, and every shirt comes up exactly once.",
          "Keep the man it landed on, or sell him at market value. Selling is final: the scouts bring three prices (a marquee, a solid buy and a cheap seat), promoting a fit from your own squad costs nothing, and a 40 overall is always there for the shirt if you cannot or will not pay.",
        ],
      },
      {
        heading: "Closing the window and kicking off the season",
        items: [
          "When all eleven shirts are settled, the final whistle brings the reckoning: on your own, the rivals' windows and the season sim follow at once. At a fuller table your window shuts, a hand over screen asks for the next player (or the CPU plays its whole window on the spot), and the season kicks off when the last window is shut.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Sharing a table of two to four seats",
        items: [
          "At a table of two to four, the windows run one at a time and every seat gets the same eleven spins. No two seats can hold the same club or end up with the same player: everyone at the table's own squad is off your market, and a man an earlier seat signed is gone by the time your list is dealt. The hand over screen shows the shut windows as numbers only, never a board, so nobody sees another seat's XI mid window.",
        ],
      },
      {
        heading: "Running the shared season once every window shuts",
        items: [
          "The shared season is every finished XI plus neutral clubs from the first pick's tier to make six, home and away on a real calendar, with the same goal model as the solo season. It hands out the title, the Golden Boot, the best defence and Rebuild of the year, and records each squad's biggest win, longest unbeaten run and top scorer. Every line is a simulated result or tally and nothing more.",
        ],
      },
      {
        heading: "Setting the pot from the club's tier and the board's mood",
        items: [
          "Pots scale with the club: 200 million at elite clubs, 140 at strong, 100 at mid, 65 at modest. The board's envelope then adds or takes up to 35 million depending on its mood (scaled to the club), sales add to it, and the manager's fee, war premiums and bad envelopes eat it.",
          "The board's mood runs from horrible to great. A great board drops one demand and tops the pot up. A horrible board cuts the pot and adds a fourth demand. Where a club's own money story is documented (Barcelona's sponsorship deal) the envelope says so; everywhere else the board speaks in general terms.",
        ],
        subsections: [
          {
            heading: "Running the wallet into a small overdraft",
            items: [
              "The wallet can run 60 million past zero. Finish in debt and settled shirts are force sold at random, each swapped for the cheapest fit going, until the books balance.",
            ],
          },
        ],
      },
      {
        heading: "Missing demands, punishment cards and new envelopes",
        items: [
          "Demands are things like three under 25s, two marquee buys, a clearout or money in the bank. They are judged on the window as you closed it, before the board's own clawback. Every miss draws a punishment card from a five card deck, without replacement: a forced sale of your best, a random exit, a 25 million clawback, a dressing room turn worth two rating points, and exactly one card that lets it go.",
          "Every second deal, another envelope arrives: from a 40 million TV windfall to a 25 million sponsor scandal, or a perk (a fresh scouts' list, 20 percent off your next signing, no bidding war on your next buy).",
        ],
      },
      {
        heading: "Bidding wars, the rebuild target and saving your run",
        items: [
          "Signing a star rated 72 or higher can spark a bidding war. The rival's hidden ceiling is 112 to 157 percent of value: outbid it or walk away, and a man you walk away from is gone from your market for good.",
          "The target is your starting rating plus 2 for elite clubs, 3 for strong, 5 for mid and 7 for modest. A manager's lift only lands on the players who fit him, so no hire covers the target on its own.",
          "The run is written to this phone after every move, not at the end, so a refresh or a locked screen comes back to the same window, and at a table to the same seats and the same seat's turn. One run at a time, on that phone only. Starting again clears it, and a save that cannot be read back exactly opens a fresh run rather than a half restored one.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Setting a modest club's target on a tight pot",
        paragraphs: [
          "A modest club with a 74 rated XI makes the target 81 on a 65 million pot. The board is in a plain mood, the finance envelope is a sell on clause worth 20 million, and you hire the youth coach for 5 million. The first spin lands on the 68 rated left back: an easy sale at 4 million, and the scouts' solid option is a 74 for 18 million.",
        ],
      },
      {
        heading: "Deciding whether to keep or sell the star striker",
        paragraphs: [
          "Three spins later the wheel finds your 84 rated striker. Keep him and the rating holds, sell him and 70 million funds two upgrades elsewhere. You keep him, finish 12 million in debt, and one forced sale later the XI still lands on 82. Job Done.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Reading the board's demands before you spin",
        items: [
          "Read the board's demands before the first spin. Three under 25s changes who the scouts' marquee should be, and so does the manager you hired.",
        ],
      },
      {
        heading: "Selling early to fund the late upgrades",
        items: [
          "Sell early, spend late. Money banked from the first spins buys real answers when the wheel finds your weakest shirts.",
        ],
      },
      {
        heading: "Treating the overdraft as a last resort, not a plan",
        items: [
          "The overdraft is a tool, not a plan. Two or three forced sales can undo a whole window's work.",
        ],
      },
      {
        heading: "Avoiding costly wars and thin squad gaps",
        items: [
          "Walk away from wars over players you only half want. Overpaying twice sinks rebuilds.",
          "A 40 overall in one shirt costs you about four rating points across the XI. Promote from the bench first if anyone fits.",
        ],
      },
    ],
    faqs: [
      {
        q: "What order does the wheel spin in?",
        a: "A seeded order fixed when you pick the club, hidden from you, every shirt exactly once. There is no re-spinning to reach your striker early.",
      },
      {
        q: "What is in the envelopes?",
        a: "The board's envelope carries its mood, a change to the pot and the demands. The finance envelope is one of fifteen you pick blind: best case is a 60 million takeover, worst is a 35 million clause nobody read, and three of them hold a perk instead of money. The deck order is seeded per run, so there is no re-rolling your luck.",
      },
      {
        q: "What happens if I miss a board demand?",
        a: "Each miss draws one punishment card from the five card deck, and cards do not go back. Only one of the five is merciful, so a second miss is drawing from four cards that all hurt.",
      },
      {
        q: "What do the grades mean?",
        a: "Target plus 3 or more is Legendary Rebuild, hitting it is Job Done, improving short of it is Some Progress. Level or worse, the game says so.",
      },
      {
        q: "Are the managers real people?",
        a: "No. The three candidates are generated, with a name, a style and a fee, because this game will not put a rating on a real manager it cannot back with a record. Real names as hire options are on the list for a later round, once there is documented data behind them.",
      },
      {
        q: "Who are the rival managers?",
        a: "Two computer personas who rebuild same tier clubs after your window closes, then face you in a simulated six team season, ten games each.",
      },
      {
        q: "Can I play with friends?",
        a: "Yes, on one phone. Pick two to four seats before the first club, make each extra seat a friend or the CPU, and pass the phone between windows. The CPU seat plays the same thinking policy the game's own test harness measures, so it reads the board, prices the scouts' bands and walks away from wars it cannot win. Online play across two phones is not built yet.",
      },
      {
        q: "Can I put the phone down in the middle of a window?",
        a: "Yes. Every move is saved to that phone as you make it, so a refresh, a locked screen or a closed tab comes back to the same window: the same club, the same money, the same settled shirts, the same demands, and at a table the same seats and whoever's turn it was. One run is kept at a time and it never leaves the phone, so starting again clears it and picking the game up on another device starts fresh.",
      },
    ],
  },

  '/dart-draft': {
    intro: [
      "Dart Draft turns squad building into a test of nerve. Call a position, throw a timed dart at a real world map, and draft one of the stuck country's actual players for that slot.",
      "Eleven throws build your XI. Gold ocean zones pay legends and wonderkids, red zones bite, plain water means a hopeless trialist, then you face The Machine.",
    ],
    headings: {
      howToPlay: "How to play Dart Draft, a free online football dart throwing game",
      rules: "Dart Draft rules: throws, accuracy points and the map zones",
      example: "Dart Draft walkthrough: a safe striker and a legend gamble",
      tips: "Dart Draft tips for picking countries and positions",
      faq: "Dart Draft FAQ: nations, positions and The Machine",
    },
    howToPlaySections: [
      {
        heading: "Picking Current Stars, World Cup or All Time mode",
        items: [
          "Pick a mode: Current Stars, World Cup 2026 where only qualified nations count, or All Time with legends.",
        ],
      },
      {
        heading: "Choosing which formation slot to throw for",
        items: [
          "Choose which of the 11 slots in your 4-3-3 to throw for.",
        ],
      },
      {
        heading: "Locking the sweeping line left to right and top to bottom",
        items: [
          "Lock the sweeping line twice, left to right then top to bottom. Tap or press space.",
        ],
      },
      {
        heading: "Hitting a country and picking a player at your position",
        items: [
          "Hit a country and pick from up to 8 of its best players at your position.",
        ],
      },
      {
        heading: "Filling all eleven and facing The Machine",
        items: [
          "Fill all eleven, then play The Machine over three legs.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Getting 11 throws with a faster sweeping crosshair",
        items: [
          "11 throws per game. The camera alternates between the world map and zoomed continent rounds, and the crosshair sweeps faster every throw.",
        ],
      },
      {
        heading: "Scoring accuracy points by country size",
        items: [
          "Accuracy points: 12 to 55 for a country, smaller ones paying more, 40 for a gold zone, 0 for water and red zones.",
        ],
        subsections: [
          {
            heading: "Landing on gold zones, red zones and open water",
            items: [
              "Gold zones offer legends, under 21 wonderkids, a free pick or a mystery gamble. Red zone sharks and storms punish greed.",
            ],
          },
        ],
      },
      {
        heading: "Falling back on the trialist and your one retry",
        items: [
          "Ocean throws and wasted darts hand you a 40 rated trialist, unless you spend the one lifeboat re-throw per game.",
        ],
      },
      {
        heading: "Scoring the series and the letter grade bands",
        items: [
          "Final score is accuracy plus XI rating plus 120 for a series win or 60 for a draw. Grades run S at 85 down to F below 54.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Opening on the striker slot with a safe country",
        paragraphs: [
          "First throw, striker slot, world map. You lock the vertical line late, stick France, and take a proven forward.",
        ],
      },
      {
        heading: "Gambling on a legend ring and paying for it",
        paragraphs: [
          "Later you aim greedily at the tiny LEGEND ring over the Atlantic and it lands: an all time keeper joins. Your last dart splashes into open water, lifeboat already spent, and the trialist at left back suffers all series.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Weighing big countries against tiny ones",
        items: [
          "Big countries are safe darts, tiny ones pay more accuracy points.",
        ],
      },
      {
        heading: "Checking the map first in World Cup mode",
        items: [
          "In World Cup mode check the map first. A dart in a non qualified nation is worth nothing.",
        ],
      },
      {
        heading: "Avoiding costly out of position picks",
        items: [
          "Out of position picks lose 8 rating, so a misplaced superstar can be worse than a natural fit.",
        ],
      },
    ],
    faqs: [
      {
        q: "What if my country has nobody at my position?",
        a: "Every nation still fields a squad: you get its academy prospect, rated 40 to 52 by squad depth, plus real players out of position.",
      },
      {
        q: "Who is The Machine?",
        a: "An AI opponent that drafts its own XI from the same pool after your last throw, then plays you over three legs.",
      },
    ],
  },

  '/career-ladder': {
    intro: [
      "Career Ladder shows a mystery footballer's career one stop at a time, earliest club first. Each rung lists the club, season, stats and that season's market value. Name the player before the ladder runs out.",
      "Early guesses are worth a fortune, late ones are worth crumbs, so every reveal is a small surrender. Play the shared daily or grind Unlimited with its two difficulty pools.",
    ],
    headings: {
      howToPlay: "How to play Career Ladder, a free daily soccer career quiz",
      rules: "Career Ladder rules: guesses, scoring and the daily pool",
      example: "Career Ladder walkthrough: naming Cristiano Ronaldo early",
      tips: "Career Ladder tips for reading value and nationality clues",
      faq: "Career Ladder FAQ: reveal costs and the Legend difficulty",
    },
    howToPlaySections: [
      {
        heading: "Choosing Daily or Unlimited mode",
        items: [
          "Pick Daily for the one ladder everyone shares today, or Unlimited for endless rounds.",
        ],
      },
      {
        heading: "Studying the first career stint",
        items: [
          "Study the first stint: a club, a season, appearances, goals and a value.",
        ],
      },
      {
        heading: "Typing a name from the suggestion list",
        items: [
          "Type at least 2 letters and pick a name from the list. Only listed names submit, so typos never cost you.",
        ],
      },
      {
        heading: "Letting wrong guesses reveal the next stop",
        items: [
          "Wrong guesses reveal the next career stop automatically. You can also reveal one on purpose, for a price.",
        ],
      },
      {
        heading: "Naming the player before the guesses run out",
        items: [
          "Name the player before the guesses run out, and early enough to protect the score.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Getting six wrong guesses per ladder",
        items: [
          "You get 6 wrong guesses per ladder. The sixth miss ends the round.",
        ],
      },
      {
        heading: "Scoring from 1000 with wrong guesses and reveals",
        items: [
          "Scoring starts at 1000. Wrong guesses cost 100 each, reveals cost points scaled to career length, and the floor is 100. Giving up scores 0.",
        ],
        subsections: [
          {
            heading: "Revealing the whole career in one go",
            items: [
              "Revealing the whole career burns about 90 percent of the base score whether the ladder has 4 stops or 14.",
            ],
          },
        ],
      },
      {
        heading: "Getting a nationality flag hint at the halfway point",
        items: [
          "A nationality flag hint appears once half the career is showing.",
        ],
      },
      {
        heading: "Resetting the daily ladder and the Legend pool",
        items: [
          "The daily flips at midnight Eastern Time and leans toward the harder half of the pool two days in three. Unlimited adds a Legend pool of pure deep cuts.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Reading a promising first rung at Sporting CP",
        paragraphs: [
          "The first rung reads Sporting CP, a teenager scoring a handful of goals. Promising, but you buy one reveal. The next rung says Manchester United, and the ladder can only really be one man.",
        ],
      },
      {
        heading: "Confirming the name with two stints showing",
        paragraphs: [
          "You type three letters, pick Cristiano Ronaldo, and the ladder unrolls to confirm it. Two stints showing, zero misses, nearly the full 1000 banked.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Reading the value column as a difficulty meter",
        items: [
          "The value column is a difficulty meter. A ladder peaking at 8 million is a journeyman story, not a superstar.",
        ],
      },
      {
        heading: "Spotting nationality clues in the youth clubs",
        items: [
          "Youth clubs and first leagues leak the nationality long before the flag hint appears.",
        ],
      },
      {
        heading: "Buying a cheap reveal over risky guesses",
        items: [
          "A cheap reveal often beats two expensive wrong guesses. Torn between three names? Buy the next rung.",
        ],
      },
    ],
    faqs: [
      {
        q: "How does the reveal cost work?",
        a: "The button always shows the exact price of the next rung. Costs are bigger per rung on short careers, so a full reveal burns about the same anywhere.",
      },
      {
        q: "What is the Legend difficulty in Unlimited?",
        a: "It draws only from the harder half of the pool by peak market value. Same rules, lower fame, much harder ladders.",
      },
    ],
  },

  '/who-am-i': {
    intro: [
      "Somewhere in the player pool a secret footballer is hiding, and every guess tells you how warm you are. Name anyone, and the game scores the similarity between your guess and the secret man from 0 to 100.",
      "Nationality, position, club, age and market value all feed the score, and clue chips show exactly which parts of your guess matched. Follow the heat until 100 clicks.",
    ],
    headings: {
      howToPlay: "How to play Who Am I?, a free online soccer guessing game",
      rules: "Who Am I? rules: scoring weights and the similarity chips",
      example: "Who Am I? walkthrough: closing in on a South American striker",
      tips: "Who Am I? tips for guesses, value arrows and teammates",
      faq: "Who Am I? FAQ: guess budgets, fame levels and the pool",
    },
    howToPlaySections: [
      {
        heading: "Picking a Casual or Expert guess budget",
        items: [
          "Pick a guess budget: Casual gives you 25 tries, Expert only 10.",
        ],
      },
      {
        heading: "Setting the fame level for the secret player",
        items: [
          "Set the fame level: Easy draws from the most famous third, Hard from the least famous third, Normal from the whole pool.",
        ],
      },
      {
        heading: "Opening with any big name from the database",
        items: [
          "Open with any big name. Type 2 or more letters and pick anyone from the database.",
        ],
      },
      {
        heading: "Reading the color coded chips and arrows",
        items: [
          "Read the chips: green matches, yellow is close, arrows point older, younger, pricier or cheaper.",
        ],
        subsections: [
          {
            heading: "Triangulating until the name clicks",
            items: [
              "Keep triangulating until you name him or run dry.",
            ],
          },
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Drawing the secret from the top 400 players",
        items: [
          "The secret is always one of the top 400 current players by market value. Guesses can be anyone among over 27,000 names.",
        ],
      },
      {
        heading: "Weighting nationality, position, club, age and value",
        items: [
          "Weights: nationality 22, position group 18 plus 10 for the exact position, same club 25, shared former club 10, up to 15 for age closeness, up to 20 for value closeness.",
        ],
      },
      {
        heading: "Zeroing out those closeness points at the far edge",
        items: [
          "Age points hit zero at 12 years apart, value points hit zero once the values are 10 times apart.",
        ],
        subsections: [
          {
            heading: "Reserving the perfect 100 for the right answer",
            items: [
              "Only the right player scores 100. Everyone else caps at 99.",
            ],
          },
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Opening with Haaland for a warm 38",
        paragraphs: [
          "You open with Haaland and get a 38: position chip green, nation gray, both arrows pointing down. So the secret is a forward, but cheaper, younger and from somewhere else.",
        ],
      },
      {
        heading: "Zeroing in through a shared club link",
        paragraphs: [
          "A young South American striker scores 74 with a past club link. Two forwards later the board flashes 100, with 19 guesses to spare on Casual.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Spending early guesses on famous, varied names",
        items: [
          "Spend the first three guesses on famous names from different continents and positions. Cheap information beats hero shots.",
        ],
      },
      {
        heading: "Following the value arrow as your compass",
        items: [
          "The value arrow is the strongest compass. A 10x gap zeroes those points, so move up or down the market fast.",
        ],
      },
      {
        heading: "Checking teammates after a high scoring guess",
        items: [
          "Same club pays 25. When a guess lands high, run through the teammates first.",
        ],
      },
    ],
    faqs: [
      {
        q: "What does a score in the 80s tell me?",
        a: "Usually nationality, position group and club all matched, or two of those plus close age and value. The chip still gray is your answer.",
      },
      {
        q: "Does the difficulty setting change my guesses?",
        a: "No. Easy, Normal and Hard only decide how famous the secret is. The 25 or 10 guess budget comes from Casual or Expert.",
      },
    ],
  },

  '/world-xi': {
    intro: [
      "World XI deals you eleven random nations, one per slot of your formation, and asks the same question eleven times: can you name a real player from this country who plays this position?",
      "Brazil in goal is a gift. A wing back from a country you have never watched is the whole game. A slot machine reel spins each nation in, so the next headache is always a surprise.",
    ],
    headings: {
      howToPlay: "How to play World XI, a free online soccer nation guessing game",
      rules: "World XI rules: respins, position families and the timer",
      example: "World XI walkthrough: easy slots and one tough respin",
      tips: "World XI tips for time, respins and reading suggestions",
      faq: "World XI FAQ: chemistry bonuses and the season simulation",
    },
    howToPlaySections: [
      {
        heading: "Picking a formation, a timer and a respin budget",
        items: [
          "Pick one of 9 formations, a timer (none, 90 seconds or 60 seconds for the whole XI), and your respin budget.",
        ],
      },
      {
        heading: "Drawing your nations in random slot order",
        items: [
          "Hit draw and the reel reveals your nations in random slot order.",
        ],
      },
      {
        heading: "Typing a player who covers the nation and slot",
        items: [
          "Type 2 or more letters and pick a player of that nationality who covers the slot.",
        ],
        subsections: [
          {
            heading: "Bouncing off wrong position picks",
            items: [
              "Wrong position picks bounce off harmlessly with an explanation. Confirmed picks lock for good.",
            ],
          },
        ],
      },
      {
        heading: "Filling all eleven and simulating a season",
        items: [
          "Fill all 11 to win, then check squad value and chemistry, and simulate a season if you are curious.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Drafting only nations with real squad depth",
        items: [
          "Every slot gets a different nation, and only countries with depth make the draw: at least 2 goalkeepers, 2 centre backs, 3 defenders, 3 midfielders and 2 strikers in the database.",
        ],
      },
      {
        heading: "Spending a shared respin budget on tough nations",
        items: [
          "Respins reroll a nation you cannot solve, shared across all slots. You choose your budget before the draw: none, 3, 5 or 10, with 3 as the default.",
        ],
      },
      {
        heading: "Matching position families and beating the clock",
        items: [
          "Position families count: wingers cover both flanks, central midfielders cover holding and attacking slots, strikers and centre forwards swap freely, full backs cover wing back slots. Front line winger slots take wingers and wide midfielders only, never wing backs.",
          "The timer covers the whole run, and zero on the clock ends it. The season sim rates your XI out of 100 across a 38 game, 20 team league.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Filling the easy goalkeeper and striker slots",
        paragraphs: [
          "A 4-3-3 on the 90 second clock. Brazil lands on the goalkeeper slot and Alisson is typed before the reel settles. France at striker is just as friendly.",
        ],
      },
      {
        heading: "Spending a respin to save the centre back slot",
        paragraphs: [
          "Then a nation you barely know lands at centre back. You spend a respin, draw a football heavyweight instead, and squeeze the last name in with four seconds left. The sim rates the squad 78 and hands you a cup.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Banking time on the easy slots first",
        items: [
          "Bank time on the easy slots. In timed modes the clock is the real opponent.",
        ],
      },
      {
        heading: "Spending respins on the thinnest nations",
        items: [
          "Spend respins on goalkeepers and centre backs, where thin footballing nations truly have nobody famous.",
        ],
      },
      {
        heading: "Reading an empty suggestion list correctly",
        items: [
          "Suggestions only show players from the drawn country, so an empty list means wrong spelling or wrong idea.",
        ],
      },
    ],
    faqs: [
      {
        q: "What is the chemistry bonus?",
        a: "Extra points for pairs of picked players who share a club or a league. Bragging rights on top of the finish, not a requirement.",
      },
      {
        q: "Is the season simulation random?",
        a: "No. It is seeded by your exact eleven, so the same squad always produces the same rating, finish and storylines. Swap one player and everything reshuffles.",
      },
    ],
  },

  '/player-bingo': {
    intro: [
      "Player Bingo hands you a 5 by 5 board of hard football categories, then reveals real players one at a time, name only. No club, no flag, no position. Tap a tile the player fits to lock it, and complete any line of five for bingo.",
      "The tension is in the taps. A wrong one costs a strike and three strikes end the game, so knowing a player won the Champions League beats vaguely feeling it.",
    ],
    headings: {
      howToPlay: "How to play Player Bingo, a free online soccer bingo game",
      rules: "Player Bingo rules: strikes, lines and the blackout bonus",
      example: "Player Bingo walkthrough: a defender tile and a risky gamble",
      tips: "Player Bingo tips for lines, skips and banking early",
      faq: "Player Bingo FAQ: fitting tiles and the category types",
    },
    howToPlaySections: [
      {
        heading: "Scanning the 24 category tiles and the free square",
        items: [
          "Scan the board: 24 category tiles around a free centre square.",
        ],
      },
      {
        heading: "Deciding whether a revealed player truly fits",
        items: [
          "A name appears. Decide whether he truly fits a tile you actually need.",
        ],
      },
      {
        heading: "Tapping a tile to lock it, or skipping free",
        items: [
          "Tap a tile to lock it with his name, or skip. Skips are free and unlimited.",
        ],
      },
      {
        heading: "Completing a line and banking the win",
        items: [
          "Complete a row, column or diagonal for bingo, then bank the win or keep the board alive.",
        ],
        subsections: [
          {
            heading: "Pushing on for extra lines and the blackout",
            items: [
              "Push on for 100 points per line, a bonus strike, and the full board blackout.",
            ],
          },
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Ending a run after three wrong taps",
        items: [
          "3 strikes end a standard run, and only wrong taps cost strikes.",
        ],
      },
      {
        heading: "Counting all twelve possible lines",
        items: [
          "12 lines are possible: 5 rows, 5 columns and 2 diagonals. The free centre gives four of them a head start.",
        ],
      },
      {
        heading: "Banking the first line or chasing a blackout",
        items: [
          "Your first line banks the win on the spot. Continuing grants a 4th strike and pays 100 points per completed line.",
          "Filling all 24 tiles is a blackout: a 500 point bonus and an instant win.",
        ],
      },
      {
        heading: "Keeping a banked win safe from later busts",
        items: [
          "The deck of players is finite, and busting on strikes after a bingo never takes the banked win away.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Choosing the tile that completes a row",
        paragraphs: [
          "A veteran defender's name comes up. He fits your Champions League Winner tile and a defender tile, but only the defender tile sits on a row with three locks already, so that is the tap. Two players later, bingo.",
        ],
      },
      {
        heading: "Gambling on a second line after a bingo",
        paragraphs: [
          "You gamble on continuing. A rash tap on Played With Messi burns strike three, but the bonus strike keeps you breathing, and a second line takes you out at 200 points with the win safe.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Playing for lines, not for single tiles",
        items: [
          "Play lines, not tiles. A correct tap that helps no line is a wasted player.",
        ],
      },
      {
        heading: "Skipping freely when a fit feels unsure",
        items: [
          "When less than sure, skip. The deck is long, the strikes are not.",
        ],
      },
      {
        heading: "Building the centre row, column and both diagonals",
        items: [
          "The centre row, centre column and both diagonals need only four real tiles each. Build there first.",
        ],
      },
      {
        heading: "Banking early when two strikes are showing",
        items: [
          "Bank the first bingo if you are already carrying two strikes.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is every revealed player guaranteed to fit my board?",
        a: "No. Plenty of names fit nothing you have open, which is why skips are free and confident wrong taps are the real killer.",
      },
      {
        q: "What kinds of categories appear?",
        a: "Clubs a player has appeared for, nationalities, positions, value bands, age brackets, World Cup and Champions League winners, and quirks like sharing a pitch with Messi.",
      },
    ],
  },

  '/alphabet-sprint': {
    intro: [
      "A letter drops, you name a footballer whose surname starts with it, and the clock does not care about your feelings. Alphabet Sprint is pure recall at speed: no suggestions, no autocomplete, no safety net.",
      "Every correct name is a point, streaks pay bonuses, and each player can only be used once per run. It is the rare trivia game where typing speed is a real skill.",
    ],
    headings: {
      howToPlay: "How to play Alphabet Sprint, a free online soccer naming game",
      rules: "Alphabet Sprint rules: scoring, letters and the streak bonus",
      example: "Alphabet Sprint walkthrough: a fast Classic mode streak",
      tips: "Alphabet Sprint tips for speed, letters and skipping",
      faq: "Alphabet Sprint FAQ: rejected answers and impossible letters",
    },
    howToPlaySections: [
      {
        heading: "Picking a Relaxed, Classic or Insane pace",
        items: [
          "Pick a pace: Relaxed is 75 seconds, Classic is 45, Insane is 20.",
        ],
      },
      {
        heading: "Typing a surname for the letter shown",
        items: [
          "A big letter appears. Type a player whose surname starts with it and press Enter.",
        ],
        subsections: [
          {
            heading: "Adding a first name when a surname is shared",
            items: [
              "A bare surname works when it can only mean one player. If several share it, the game asks for the full name without saying who they are.",
            ],
          },
        ],
      },
      {
        heading: "Skipping a letter for free at a cost",
        items: [
          "Skip any letter for free, but the skip resets your streak.",
        ],
      },
      {
        heading: "Racking up names until the clock dies",
        items: [
          "Rack up names until the clock dies, then chase your saved best.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Scoring points and the every fifth streak bonus",
        items: [
          "Scoring is 1 point per correct player, and every 5th correct answer in a row pays 2.",
        ],
      },
      {
        heading: "Reading the letter from a player's surname",
        items: [
          "Surnames decide the letter: Kylian Mbappe answers M, not K, and suffixes are skipped, so Vinicius Junior counts under V.",
        ],
      },
      {
        heading: "Weighting letters and grading Gold, Silver, Bronze",
        items: [
          "Letters are weighted by how many unused players they hold, never repeat back to back, and any letter with fewer than 5 pool players never appears.",
          "The pool is every named player in this season's market table, about 5,500 of them, so if he is playing somewhere real right now he counts. Cover every playable letter for Gold, 75 percent for Silver, 50 percent for Bronze.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Chaining a fast start on Classic mode",
        paragraphs: [
          "Classic mode, 45 seconds. M drops and Mbappe is in before the letter finishes animating. S brings Saka, B brings Bellingham, and the streak builds.",
        ],
      },
      {
        heading: "Skipping a blank and still earning a badge",
        paragraphs: [
          "Your fifth straight answer pays double. Then K lands, your mind goes blank, and you skip, swallowing the streak reset. Eleven names later it is 13 points and a Silver badge.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Typing surnames only to save seconds",
        items: [
          "Type surnames only. Haaland beats Erling Haaland by half a second, and seconds are the currency.",
        ],
      },
      {
        heading: "Keeping fallback names ready for deep letters",
        items: [
          "Keep go-to names ready for the deep letters, because the wheel favors letters with lots of players left.",
        ],
      },
      {
        heading: "Resolving the ambiguity message quickly",
        items: [
          "If the ambiguity message appears, add a first name to the most famous option and resubmit. Do not freeze.",
        ],
      },
      {
        heading: "Skipping instead of freezing on a blank",
        items: [
          "Skipping is not failing. Four blank seconds cost more than any streak bonus returns.",
        ],
      },
    ],
    faqs: [
      {
        q: "Why was my answer rejected?",
        a: "Usually the surname does not start with the shown letter, the player was already used this run, or he is not in this season's market table (about 5,500 current players; retired players and youth prospects without a value are not in it). Accents and hyphens are forgiven.",
      },
      {
        q: "Do impossible letters like Q or X come up?",
        a: "No. Letters with fewer than 5 pool players are removed from the wheel before the run starts, so you are never stuck on an unanswerable letter.",
      },
    ],
  },

  '/clue-auction': {
    intro: [
      "Clue Auction is a detective game with a budget. A secret footballer is drawn, you hold a bank of 100 points, and every scrap of information has a price. Whatever you have not spent when you name him is your score.",
      "Buy nothing and guess cold for the perfect 100, or shop your way to certainty and keep the change. Wrong guesses burn points too, so bravado is not free either.",
    ],
    headings: {
      howToPlay: "How to play Clue Auction, a free online soccer guessing game",
      rules: "Clue Auction rules: the bank, clue prices and the secret pool",
      example: "Clue Auction walkthrough: cheap clues and a club initial",
      tips: "Clue Auction tips for buying clues and timing your guess",
      faq: "Clue Auction FAQ: unavailable clues and the secret player pool",
    },
    howToPlaySections: [
      {
        heading: "Browsing the eight priced clues in the shop",
        items: [
          "Browse the clue shop: eight clues, each priced, each selling once.",
        ],
      },
      {
        heading: "Buying the clues your scouting values most",
        items: [
          "Buy what your inner scout values, maybe the age bracket for 10 or the current club for 35.",
        ],
      },
      {
        heading: "Guessing the secret player at any time",
        items: [
          "Guess whenever you like: type 2 or more letters and pick a name from the list.",
        ],
        subsections: [
          {
            heading: "Losing points on a miss, banking on a hit",
            items: [
              "Miss and you lose 10 points but keep digging. Hit and you bank everything left.",
            ],
          },
        ],
      },
      {
        heading: "Watching the case close at zero points",
        items: [
          "If the bank reaches zero, the case closes and the secret man walks.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Starting the bank at 100 points",
        items: [
          "The bank starts at 100 and doubles as your final score. Wrong guesses cost 10 each.",
        ],
      },
      {
        heading: "Setting a price on all eight clues",
        items: [
          "Clue prices: nationality 25, current club 35, one former club 30, club initial 20, position 15, age bracket 10, value band 10, career club count 10.",
          "The menu totals 155 against your 100, so buying everything is impossible, and a clue can only be bought while you hold more than its price.",
        ],
      },
      {
        heading: "Drawing the secret from the top 400 players",
        items: [
          "The secret is one of the top 400 current players by value. Clues with no real data, like a former club for a one club man, show as unavailable rather than invented.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Buying the two cheapest clues first",
        paragraphs: [
          "You open with the two cheapest clues. Age bracket says 21 to 24, value band says 80 to 120 million dollars. That is a short list of wonderkids, and you still hold 80.",
        ],
      },
      {
        heading: "Settling the case with the club initial",
        paragraphs: [
          "A confident stab misses, down to 70. The club initial for 20 settles the argument, and you name him with 50 banked. Middling, but far better than bankruptcy.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Buying the cheap clues for the best value",
        items: [
          "The 10 point clues are the value buys. Age plus value band shrinks the pool enormously for the price of two misses.",
        ],
      },
      {
        heading: "Saving the current club clue for last",
        items: [
          "Save the 35 point current club for last. The cheap clues often make it unnecessary.",
        ],
      },
      {
        heading: "Guessing once the field is down to two",
        items: [
          "Down to two candidates? A guess costs the same 10 as a cheap clue and settles it instantly.",
        ],
      },
    ],
    faqs: [
      {
        q: "Why is a clue locked as not available?",
        a: "There is no real data behind it, most often a former club for a player who has only ever had one club. The game never invents information.",
      },
      {
        q: "Who can the secret player be?",
        a: "One of the top 400 current players by market value, the same pool the Who Am I game uses. New cases never repeat the previous secret, and your best win saves on this device.",
      },
    ],
  },

  '/rarity-round': {
    intro: [
      "Rarity Round flips trivia upside down. Anyone can name a Ballon d'Or winner. The question is whether you can name one nobody else would think of, because here the obvious answer scores worst.",
      "Five categories per run, every answer checked against real soccer data, plus a mirror mode called Crowd Says where fame wins instead. Same prompts, opposite instincts.",
    ],
    headings: {
      howToPlay: "How to play Rarity Round, a free daily soccer trivia game",
      rules: "Rarity Round rules: fame ranks, Goalless runs and the daily set",
      example: "Rarity Round walkthrough: a forgotten Ballon d'Or winner",
      tips: "Rarity Round tips for obscurity and the Crowd Says mode",
      faq: "Rarity Round FAQ: valid answers and the daily ranking",
    },
    howToPlaySections: [
      {
        heading: "Choosing Daily or Unlimited categories",
        items: [
          "Choose Daily for the 5 categories everyone shares today, or Unlimited for a random 5.",
        ],
      },
      {
        heading: "Picking Rarity Round or Crowd Says scoring",
        items: [
          "Pick a scoring mode: Rarity Round rewards obscurity, Crowd Says rewards fame.",
        ],
      },
      {
        heading: "Typing a valid answer for each prompt",
        items: [
          "Read the prompt, type 2 or more letters and pick a valid answer. Names that do not fit the category cannot be submitted at all.",
        ],
        subsections: [
          {
            heading: "Locking in to see the fame rank",
            items: [
              "Lock it in to see your pick's fame rank, the best possible answer, and what everyone else said.",
            ],
          },
        ],
      },
      {
        heading: "Finishing five rounds and checking your rank",
        items: [
          "Finish all 5 rounds for your total, then check your rank among today's players.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Scoring every answer by its fame rank",
        items: [
          "Each answer scores 0 to 100 by fame rank in the category's full pool: the most famous valid answer scores 100, the most obscure 0.",
        ],
      },
      {
        heading: "Chasing a Goalless run or the 500 ceiling",
        items: [
          "In Rarity mode points are bad and 0 across 5 rounds is the perfect Goalless run. In Crowd Says points are good and 500 is the ceiling.",
        ],
      },
      {
        heading: "Resetting the daily categories at midnight",
        items: [
          "The daily set changes every day at midnight Eastern Time, drawn from 36 categories covering clubs, nationalities, positions, price tags and Ballon d'Or winners.",
          "Only valid answers can be locked in, so the risk is never being wrong, only being obvious.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Digging up a forgotten Ballon d'Or winner",
        paragraphs: [
          "The prompt asks for a Ballon d'Or winner. Messi is what the planet says, near maximum points, a disaster in Rarity mode. You dig up a forgotten winner instead, someone like Igor Belanov from 1986, and score close to zero. Beautiful.",
        ],
      },
      {
        heading: "Naming a rotation defender over the galacticos",
        paragraphs: [
          "Next: name a player who has played for Real Madrid. You skip the galacticos for a rotation defender from a decade ago, and your five round total of 74 lands top ten today.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Thinking in decades for near zero answers",
        items: [
          "Think in decades. Long retired and briefly relevant names are where the near zero answers live.",
        ],
      },
      {
        heading: "Trusting the first name in Crowd Says",
        items: [
          "In Crowd Says, do not overthink. The first name a casual fan would blurt out is usually the right play.",
        ],
      },
      {
        heading: "Reading every reveal to sharpen the next run",
        items: [
          "Read every reveal. Seeing the rarest answer and the crowd's picks is how your next run gets sharper.",
        ],
      },
    ],
    faqs: [
      {
        q: "What is a Goalless run?",
        a: "The Rarity mode perfect game: five valid answers so obscure they each scored 0. Rare enough that the result screen treats it like a trophy.",
      },
      {
        q: "How does the daily ranking work?",
        a: "When you finish, your total is compared against everyone who completed today's run, and you get a live standing, like number 4 of 31 players today.",
      },
    ],
  },

  '/missing-xi': {
    intro: [
      "One famous real lineup, ten names showing, one tile blank. Missing XI asks the simplest question in football trivia: who is missing? Champions League finals, World Cup finals, Euros deciders and iconic title run-ins all take a turn.",
      "You get three guesses and a ladder of hints that never repeat what the card already shows. Nail it first time for the full 100.",
    ],
    headings: {
      howToPlay: "How to play Missing XI, a free daily soccer lineup quiz",
      rules: "Missing XI rules: scoring, hints and the daily puzzle",
      example: "Missing XI walkthrough: naming Mascherano at centre back",
      tips: "Missing XI tips for reading lineups and formations",
      faq: "Missing XI FAQ: real lineups and the daily reset",
    },
    howToPlaySections: [
      {
        heading: "Reading the match card details",
        items: [
          "Read the match card: competition, score line, venue, formation and whose XI you are looking at.",
        ],
      },
      {
        heading: "Studying the pitch for the blank tile",
        items: [
          "Study the pitch. Ten tiles carry names, one shows only a position and a question mark.",
        ],
      },
      {
        heading: "Searching the database for your guess",
        items: [
          "Search the player database and lock in your guess for the missing man.",
        ],
        subsections: [
          {
            heading: "Unlocking a new hint after each miss",
            items: [
              "Each miss unlocks a new hint before the next try. Three misses reveals the answer.",
            ],
          },
        ],
      },
      {
        heading: "Playing the daily lineup or the archive",
        items: [
          "Play the shared daily lineup, then raid the archive in Unlimited.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Scoring three guesses on a falling scale",
        items: [
          "3 guesses per puzzle: 100 points on the first, 70 on the second, 40 on the third, 0 for a miss or a give up.",
        ],
      },
      {
        heading: "Unlocking hints that never repeat the card",
        items: [
          "Hints add new information only: a club lineup hints the missing player's nationality, a national team lineup hints his club at the time, then comes the first letter of his surname.",
        ],
      },
      {
        heading: "Sharing the daily puzzle and the Unlimited archive",
        items: [
          "The daily puzzle is the same lineup and same blanked player for everyone, changing at midnight Eastern Time.",
          "Unlimited draws from an archive of over 200 hand checked real lineups, with the blanked position varying between runs. Repeating a name you already tried never burns a guess.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Reading a 2011 Champions League final card",
        paragraphs: [
          "The card reads 2011 Champions League Final, Barcelona 3-1 Manchester United, Wembley. The blank sits at centre back beside Pique. Puyol is the reflex answer, but he started that night on the bench.",
        ],
      },
      {
        heading: "Naming Mascherano over the reflex answer",
        paragraphs: [
          "The actual partner was Javier Mascherano, a midfielder moonlighting at centre back in a European final. Land it first try for the full 100 and a fact to correct people with forever.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Reciting the famous XI before searching",
        items: [
          "Recite the famous XI before searching. The blank is usually the name memory skips, a full back or the holding midfielder, not the star.",
        ],
      },
      {
        heading: "Reading the formation label for a clue",
        items: [
          "Use the formation label. A 4-2-3-1 tells you exactly what job the blank tile is doing.",
        ],
      },
      {
        heading: "Waiting for the hint before guess two",
        items: [
          "Never rush guess two. Wait for the hint, cross reference the era, then commit.",
        ],
      },
    ],
    faqs: [
      {
        q: "Are the lineups actually real?",
        a: "Yes. Every XI is a hand checked starting lineup from a real match, surprise selections included, which is what makes some blanks so cruel.",
      },
      {
        q: "Is my daily puzzle the same as everyone's?",
        a: "Same lineup, same hidden player, worldwide, until the next puzzle arrives at midnight Eastern Time.",
      },
    ],
  },

  '/sports-bingo': {
    intro: [
      "Sports Bingo hands you a 5 by 5 card of football conditions, a goalkeeper, a Brazilian, someone worth 100M plus, and opens ten packs of real players on a timer. Your job is spotting which squares each pack can claim before it closes.",
      "The marking is the whole skill. Nothing is claimed for you: a pack sits open for fifteen seconds, you scan five real players and their real attributes, and every square you can justify, you tap. When the next pack opens, the old one is gone for good.",
      "Play the shared daily card, run unlimited fresh cards, or race a CPU on the same card with the same packs and its own board.",
    ],
    headings: {
      howToPlay: "How to play Sports Bingo, a free daily football pack opening game",
      rules: "Sports Bingo rules: conditions, scoring and the versus mode",
      example: "Sports Bingo walkthrough: one player claiming five squares",
      tips: "Sports Bingo tips for scanning packs and timing closes",
      faq: "Sports Bingo FAQ: the daily card and completable packs",
    },
    howToPlaySections: [
      {
        heading: "Picking daily, unlimited or versus CPU mode",
        items: [
          "Pick a mode: the daily card (one shared card and pack run per day), unlimited, or versus the CPU at one of three levels.",
        ],
      },
      {
        heading: "Opening ten timed packs of five players",
        items: [
          "Ten packs of five real players open one at a time, each on a fifteen second timer. You can close a pack early once you have milked it.",
        ],
        subsections: [
          {
            heading: "Tapping every square a pack satisfies",
            items: [
              "While a pack is open, tap every square that someone in the pack satisfies. A wrong tap shakes and costs nothing but time.",
            ],
          },
        ],
      },
      {
        heading: "Scoring squares, lines and the blackout",
        items: [
          "After the tenth pack the card is scored: squares, lines and the blackout bonus.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Reading the 24 conditions and free centre",
        items: [
          "The card holds 24 conditions plus a free centre. Conditions cover position, age, market value, nationality, league, and season output, all read from the same verified player data the rest of the site runs on.",
        ],
      },
      {
        heading: "Claiming a square only while its pack is open",
        items: [
          "A square can only be claimed while a pack containing a matching player is open. Closed packs never come back.",
        ],
      },
      {
        heading: "Awarding points and facing off against the CPU",
        items: [
          "Scoring: 3 points per marked square, 2 per completed row, column or diagonal, and a blackout lands exactly 100.",
          "Versus mode: the CPU plays the identical card and packs on its own board, and most squares after pack ten wins.",
        ],
      },
      {
        heading: "Guaranteeing every card is completable",
        items: [
          "Every card is completable: the pack run is checked at deal time so each condition on the card has at least one matching player somewhere in the ten packs.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Claiming five squares from one loaded player",
        paragraphs: [
          "Pack three opens: a 21 year old Brazilian winger worth 45M with 11 goals. That one player claims Age 21 or younger, A Brazilian, A winger, Worth 40M plus and 10 plus goals, if all five sit on your card and you spot them in time.",
        ],
      },
      {
        heading: "Missing one square and losing to the CPU",
        paragraphs: [
          "You tap four of them before the clock runs out, miss the goals square, and the pack closes. Seven packs later you finish on 19 squares and 4 lines: 65 points, and the ruthless CPU beat you by two squares.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Reading the card before the first pack",
        items: [
          "Read the card before the first pack opens. Knowing your rare squares (a goalkeeper, worth 100M plus) means you never let one slip by.",
        ],
      },
      {
        heading: "Scanning every attribute line, not just the name",
        items: [
          "One great player can claim four or five squares. Scan every attribute line, not just the name.",
        ],
      },
      {
        heading: "Waiting to close packs with squares still open",
        items: [
          "Do not close packs early while broad squares are still open. The timer is generous exactly so the scan is doable.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is the daily card the same for everyone?",
        a: "Yes. One card and one pack sequence per Eastern Time date, shared worldwide, so daily scores compare fairly.",
      },
      {
        q: "Are the players real?",
        a: "Every player in every pack is a real footballer from the same verified market data the rest of the site uses, and every condition reads their real attributes.",
      },
      {
        q: "Can the card be impossible?",
        a: "No. At deal time the ten packs are checked against the card, and any condition nothing satisfies gets a matching player dealt in.",
      },
    ],
  },
};
