import type { GameContentMap } from './types';

// Soccer game guides, batch 1. Casual human tone, no em dashes anywhere.
export const SOCCER_CONTENT_1: GameContentMap = {
  '/overrated-underrated': {
    intro: [
      "Overrated or Underrated is the daily debate settler. Ten real players, each shown with club, position, age and market value, and one question every time: at that price, is he overrated or underrated?",
      "There is no correct answer. The moment you vote, the live community split appears, built from real votes, and your score is simply how often you dared to disagree with everyone else.",
    ],
    howToPlay: [
      "Meet player 1 of 10. Everyone in the world gets the same ten each day.",
      "Read the card: club, position, age and market value, plus goals and assists when available.",
      "Tap Overrated or Underrated. No fence sitting.",
      "The community split appears instantly, your own vote already counted in.",
      "Work through all ten, then check your contrarian count and share the grid.",
    ],
    rules: [
      "10 players per day, identical for everyone, with a fresh set at midnight Eastern Time.",
      "Your score is your contrarian count: how many of your 10 votes went against the majority.",
      "7 or more against the crowd rates you a Certified Contrarian, 4 to 6 a Free Thinker, 2 to 3 Mostly With The Crowd, and 0 to 1 One Of The Sheep.",
      "Votes are final, there are no strikes, and progress saves on this device.",
    ],
    example: [
      "Card one is a 22 year old winger valued at 90 million with three league goals all season. That smells like hype, so you tap Overrated. The bar lands 81 to 19 on your side, so no contrarian point.",
      "Card four is a 31 year old holding midfielder worth 18 million who starts every week for a title contender. You go Underrated, the crowd goes 58 percent Overrated, and you bank a point.",
    ],
    tips: [
      "Judge the price, not the player. A brilliant forward can still be overrated at 150 million.",
      "The crowd is predictable about age: veterans get called overrated, teenagers underrated. Exploit that.",
      "Vote your true read first. Random contrarianism is a coin flip, and the crowd wins those.",
    ],
    faqs: [
      {
        q: "Is there a right answer for each player?",
        a: "No. It is a pure opinion vote against a real community split, and your score counts how often you sat in the minority.",
      },
      {
        q: "Can today's players also appear in Tier List?",
        a: "No. The two dailies share a pool, but Tier List excludes the ten names used here, so they never overlap on the same day.",
      },
    ],
  },

  '/tier-list': {
    intro: [
      "Every day this game deals eight real players and five tiers: S, A, B, C and D. Rank them, lock your list, then find out where the crowd put every single one of them.",
      "It is the internet's favourite argument format with a scoreboard. The crowd column is built from real submissions, so a disagreement is actual people telling you your B is their S.",
    ],
    howToPlay: [
      "Check the bench. Each card shows name, nationality and market value.",
      "Tap a player, then tap the tier row to drop them into.",
      "Tap a placed player to send them back and rethink.",
      "Once all eight are placed, hit lock in. Placements are final after that.",
      "Compare your list with the crowd average for each player, then share it.",
    ],
    rules: [
      "8 players per day, the same eight for everyone, refreshing at midnight Eastern Time.",
      "All 8 must be placed before you can lock in, and you submit once per day. Empty tiers are allowed.",
      "The crowd tier is the average of every submitted ranking for that player, shown with the number of votes behind it.",
      "Today's eight never include the ten players from Overrated or Underrated, so the two dailies stay fresh.",
    ],
    example: [
      "The day serves up two superstar forwards, two solid midfielders, three defenders and a keeper. You throw one forward into S, park the midfielders in B, and after a long stare drop the keeper into C.",
      "You lock in. The crowd matches you on six of eight, but rated your C keeper a full tier higher, and your S pick only averaged an A. Off to the group chat to defend yourself.",
    ],
    tips: [
      "Use market value as a sanity check, not a ranking machine. Price and current form are different things.",
      "If nobody deserves S, leave it empty. The board never forces a spread.",
      "Expect the crowd to overrate hot streaks. That is your chance to look smart tomorrow.",
    ],
    faqs: [
      {
        q: "What does the crowd tier actually mean?",
        a: "It is the average of every ranking submitted for that player, converted back to a tier. An A with 40 beside it means 40 rankings averaged out to an A.",
      },
      {
        q: "What if nobody else has ranked a player yet?",
        a: "The results screen marks you as first to rank them, and your submission becomes the seed the crowd average grows from.",
      },
    ],
  },

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
        q: "Is the budget really a billion euros?",
        a: "The modern all world cap lands near that headline number, but it is recomputed every run as 62 percent of the priciest possible XI, so each era gets the same squeeze.",
      },
      {
        q: "What is the Money XI?",
        a: "The squad money would buy with no cap at all: the priciest available player in every slot. Your capped team faces it over three legs.",
      },
    ],
  },

  '/rebuild': {
    intro: [
      "Rebuild Challenge drops you into a real club's 2026 squad with a war chest sized to the badge and a target rating. Commit your sales, flip your fortune, spend what's left, leave the place better.",
      "The target scales with the job: elite squads need a nudge, modest ones a renovation. The board deals three demands, one tied to the club's identity, a fortune card swings the books, and two AI managers rebuild rivals beside you.",
    ],
    howToPlay: [
      "Pick one of 63 real clubs, tiered from elite down to modest.",
      "Choose a coach: the free caretaker, or one of three paid names adding +1, +2 or +3 to your final rating.",
      "Flip one of ten fortune cards. Takeovers, lawsuits, anything from +60 to -35 million.",
      "Commit your sales before the market opens. Once you lock the list, nobody else leaves.",
      "Tap any XI slot to sign a replacement. Only affordable players are listed.",
      "Mind the board's three demands, then hit finish for the rivals' windows and the season sim.",
    ],
    rules: [
      "Budgets scale with the club: 200 million at elite clubs, 140 at strong, 100 at mid, 65 at modest. Sales add to it, coach fees, war premiums and money swings eat it.",
      "The target is your starting rating plus 2 for elite clubs, 3 for strong, 5 for mid and 7 for modest.",
      "Three board cards are dealt per run, and one is tied to the club's identity: superclubs demand a galactico, modest clubs demand negative net spend. Each miss gets your most valuable player force sold.",
      "Every second signing fires a finance event, from a 40 million TV windfall to a 25 million sponsor scandal, on top of whatever your fortune card did.",
      "Signing a star rated 72 or higher can spark a bidding war. The rival's hidden ceiling is 112 to 157 percent of value: outbid it or walk away.",
    ],
    example: [
      "A modest club with a 74 rated XI makes the target 81 on a 65 million budget. You keep the caretaker, flip the sell-on clause card for +20 million, and commit two aging starters to the exit list before the market opens.",
      "A rival hijacks your marquee signing and you pay 15 million over value before he folds. The XI lands on 82, both objectives hold, and the season sim puts you second of six. Job Done.",
    ],
    tips: [
      "Read the objectives before selling anyone. A missed one costs your best player.",
      "Be brave with the cuts. Once the market opens the sale window is shut for good, and a timid exit list leaves you shopping with pocket change.",
      "Walk away from wars over players you only half want. Overpaying twice sinks rebuilds.",
    ],
    faqs: [
      {
        q: "What is the fortune card?",
        a: "After hiring your coach the board hands you ten face-down envelopes and you flip exactly one. Best case is a 60 million takeover, worst is a 35 million hidden clause. The deck order is seeded per run, so there is no re-rolling your luck.",
      },
      {
        q: "What do the grades mean?",
        a: "Target plus 3 or more is Legendary Rebuild, hitting it is Job Done, improving short of it is Some Progress. Level or worse, the game says so.",
      },
      {
        q: "Who are the rival managers?",
        a: "Two AI personas who rebuild same tier clubs after your window closes, then face you in a simulated six team season, ten games each.",
      },
    ],
  },

  '/dart-draft': {
    intro: [
      "Dart Draft turns squad building into a test of nerve. Call a position, throw a timed dart at a real world map, and draft one of the stuck country's actual players for that slot.",
      "Eleven throws build your XI. Gold ocean zones pay legends and wonderkids, red zones bite, plain water means a hopeless trialist, then you face The Machine.",
    ],
    howToPlay: [
      "Pick a mode: Current Stars, World Cup 2026 where only qualified nations count, or All Time with legends.",
      "Choose which of the 11 slots in your 4-3-3 to throw for.",
      "Lock the sweeping line twice, left to right then top to bottom. Tap or press space.",
      "Hit a country and pick from up to 8 of its best players at your position.",
      "Fill all eleven, then play The Machine over three legs.",
    ],
    rules: [
      "11 throws per game. The camera alternates between the world map and zoomed continent rounds, and the crosshair sweeps faster every throw.",
      "Accuracy points: 12 to 55 for a country, smaller ones paying more, 40 for a gold zone, 0 for water and red zones.",
      "Gold zones offer legends, under 21 wonderkids, a free pick or a mystery gamble. Red zone sharks and storms punish greed.",
      "Ocean throws and wasted darts hand you a 40 rated trialist, unless you spend the one lifeboat re-throw per game.",
      "Final score is accuracy plus XI rating plus 120 for a series win or 60 for a draw. Grades run S at 85 down to F below 54.",
    ],
    example: [
      "First throw, striker slot, world map. You lock the vertical line late, stick France, and take a proven forward.",
      "Later you aim greedily at the tiny LEGEND ring over the Atlantic and it lands: an all time keeper joins. Your last dart splashes into open water, lifeboat already spent, and the trialist at left back suffers all series.",
    ],
    tips: [
      "Big countries are safe darts, tiny ones pay more accuracy points.",
      "In World Cup mode check the map first. A dart in a non qualified nation is worth nothing.",
      "Out of position picks lose 8 rating, so a misplaced superstar can be worse than a natural fit.",
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
    howToPlay: [
      "Pick Daily for the one ladder everyone shares today, or Unlimited for endless rounds.",
      "Study the first stint: a club, a season, appearances, goals and a value.",
      "Type at least 2 letters and pick a name from the list. Only listed names submit, so typos never cost you.",
      "Wrong guesses reveal the next career stop automatically. You can also reveal one on purpose, for a price.",
      "Name the player before the guesses run out, and early enough to protect the score.",
    ],
    rules: [
      "You get 6 wrong guesses per ladder. The sixth miss ends the round.",
      "Scoring starts at 1000. Wrong guesses cost 100 each, reveals cost points scaled to career length, and the floor is 100. Giving up scores 0.",
      "Revealing the whole career burns about 90 percent of the base score whether the ladder has 4 stops or 14.",
      "A nationality flag hint appears once half the career is showing.",
      "The daily flips at midnight Eastern Time and leans toward the harder half of the pool two days in three. Unlimited adds a Legend pool of pure deep cuts.",
    ],
    example: [
      "The first rung reads Sporting CP, a teenager scoring a handful of goals. Promising, but you buy one reveal. The next rung says Manchester United, and the ladder can only really be one man.",
      "You type three letters, pick Cristiano Ronaldo, and the ladder unrolls to confirm it. Two stints showing, zero misses, nearly the full 1000 banked.",
    ],
    tips: [
      "The value column is a difficulty meter. A ladder peaking at 8 million is a journeyman story, not a superstar.",
      "Youth clubs and first leagues leak the nationality long before the flag hint appears.",
      "A cheap reveal often beats two expensive wrong guesses. Torn between three names? Buy the next rung.",
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
    howToPlay: [
      "Pick a guess budget: Casual gives you 25 tries, Expert only 10.",
      "Set the fame level: Easy draws from the most famous third, Hard from the least famous third, Normal from the whole pool.",
      "Open with any big name. Type 2 or more letters and pick anyone from the database.",
      "Read the chips: green matches, yellow is close, arrows point older, younger, pricier or cheaper.",
      "Keep triangulating until you name him or run dry.",
    ],
    rules: [
      "The secret is always one of the top 300 current players by market value. Guesses can be anyone among over 27,000 names.",
      "Weights: nationality 22, position group 18 plus 10 for the exact position, same club 25, shared former club 10, up to 15 for age closeness, up to 20 for value closeness.",
      "Age points hit zero at 12 years apart, value points hit zero once the values are 10 times apart.",
      "Only the right player scores 100. Everyone else caps at 99.",
    ],
    example: [
      "You open with Haaland and get a 38: position chip green, nation gray, both arrows pointing down. So the secret is a forward, but cheaper, younger and from somewhere else.",
      "A young South American striker scores 74 with a past club link. Two forwards later the board flashes 100, with 19 guesses to spare on Casual.",
    ],
    tips: [
      "Spend the first three guesses on famous names from different continents and positions. Cheap information beats hero shots.",
      "The value arrow is the strongest compass. A 10x gap zeroes those points, so move up or down the market fast.",
      "Same club pays 25. When a guess lands high, run through the teammates first.",
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

  '/club-manager': {
    intro: [
      "Club Manager is the site's big one: a full management sim in your browser. 296 real clubs across 17 leagues in 14 countries, over 3,400 real players with their real August 2026 ages and market values, and a board that talks like a board.",
      "Pick when you start too: today's game, or one of three real past seasons. 2015-16 is the year Leicester won it at 5000 to 1, with Vardy and Mahrez at their real pre-title values and MSN at Barcelona. 2010-11 is prime Messi and Rooney. 2005-06 is Ronaldinho's Ballon d'Or Barcelona with a 17 year old Messi, Mourinho's back to back Chelsea and Henry's Arsenal. Each past season holds all 40 Premier League and La Liga clubs and hundreds of real players at their real ages and values from that year. Or found a club of your own: name it, design the crest, name the stadium, choose the money, and build it up by signing real players.",
    ],
    howToPlay: [
      "Pick your era (today, 2015-16, 2010-11 or 2005-06), then your nation, your league, and your club. Every tile quotes what that board will actually demand.",
      "Or tap Create your own club: your name, your crest (shape, pattern, colors, initials), your stadium, and one of three budgets. Your club takes the league place of the division's weakest side.",
      "Before each match set formation, mentality and your starting XI, or use auto pick, and give a team talk when it matters.",
      "Play the match, read the report, answer the press, and manage the dressing room between games.",
      "Buy and sell in the summer and January windows: negotiate fees, pay release clauses, take loans, and field bids for your own stars before rival clubs close your targets.",
      "Keep the confidence meter alive, hit the board's objectives, collect trophies, and roll into next season while the whole world ages around you.",
    ],
    rules: [
      "Boards demand the actual prize, never a number: win the league, qualify for the Champions League or Europa League, reach mid table, or stay up, plus cup targets, a rival to finish above, and squad-building mandates.",
      "Every league plays its real length: 38 rounds in the Premier League, 46 in the Championship, 34 in the Bundesliga, with the domestic cup from a round of 16 to the final and a full Champions League on top for qualified clubs.",
      "Each past era is a sealed world: real squads and values from its own year, no Conference League because it did not exist back then, and no 2026 player can leak into your market. Each era's giants rate like the legends they were, above anyone today: Messi and Ronaldo in 2015-16 and 2010-11, Ronaldinho and Henry in 2005-06, while Leicester start 2015-16 at their honest pre-title level and 2005-06 boards still call the second European prize the UEFA Cup.",
      "A club you create starts with 24 generated players, honestly marked as made up. Every real player stays real, and the transfer market is where you sign them. Budgets run 15, 40 or 90 million pounds.",
      "Board confidence starts at 60 of 100 and swings with results, cup runs and position against expectation. At zero you are sacked.",
      "Players carry contracts, wages, form, fitness and opinions. They retire, walk on expired deals, and your academy feeds the first team if you invest in it.",
    ],
    example: [
      "You take Newcastle and the board asks you to qualify for the Europa League. A summer winger signing and a cup run to the semis keep confidence healthy even in seventh.",
      "Or you found a club in the Eredivisie on the biggest budget, and the board wants the title from day one, because a squad built with 90 million should win that league. In the Premier League the same money gets told to survive first, because that league is deeper than any wallet.",
    ],
    tips: [
      "Fitness is a resource. Starters drain it every match and recover on rest weeks, so rotate early.",
      "Attacking mentality raises goals at both ends, defensive strangles the game. Match it to the opponent.",
      "Injured starters get auto replaced, so check the treatment room before kickoff.",
      "Creating a club? The weaker the league you choose, the faster your money turns into trophies.",
    ],
    faqs: [
      {
        q: "How exactly do I get sacked?",
        a: "The confidence meter hits zero. Losses and sitting below the expected position drain it, while wins, trophies and cup runs refill it.",
      },
      {
        q: "Does my career save?",
        a: "One save on this device. Close the tab mid season and the game resumes where you stopped.",
      },
      {
        q: "Are the players real?",
        a: "Yes, with real market values, in both eras. The only invented players are the ones the game clearly marks: youth padding, deep-future projections, and the starting squad of a club you create yourself.",
      },
    ],
  },

  '/world-xi': {
    intro: [
      "World XI deals you eleven random nations, one per slot of your formation, and asks the same question eleven times: can you name a real player from this country who plays this position?",
      "Brazil in goal is a gift. A wing back from a country you have never watched is the whole game. A slot machine reel spins each nation in, so the next headache is always a surprise.",
    ],
    howToPlay: [
      "Pick one of 9 formations and a timer: none, 90 seconds or 60 seconds for the whole XI.",
      "Hit draw and the reel reveals your nations in random slot order.",
      "Type 2 or more letters and pick a player of that nationality who covers the slot.",
      "Wrong position picks bounce off harmlessly with an explanation. Confirmed picks lock for good.",
      "Fill all 11 to win, then check squad value and chemistry, and simulate a season if you are curious.",
    ],
    rules: [
      "Every slot gets a different nation, and only countries with depth make the draw: at least 2 goalkeepers, 2 centre backs, 3 defenders, 3 midfielders and 2 strikers in the database.",
      "You get 3 respins per game, shared across all slots, to reroll a nation you cannot solve.",
      "Position families count: wingers cover both flanks, central midfielders cover holding and attacking slots, strikers and centre forwards swap freely, full backs cover wing back.",
      "The timer covers the whole run, and zero on the clock ends it. The season sim rates your XI out of 100 across a 38 game, 20 team league.",
    ],
    example: [
      "A 4-3-3 on the 90 second clock. Brazil lands on the goalkeeper slot and Alisson is typed before the reel settles. France at striker is just as friendly.",
      "Then a nation you barely know lands at centre back. You spend a respin, draw a football heavyweight instead, and squeeze the last name in with four seconds left. The sim rates the squad 78 and hands you a cup.",
    ],
    tips: [
      "Bank time on the easy slots. In timed modes the clock is the real opponent.",
      "Spend respins on goalkeepers and centre backs, where thin footballing nations truly have nobody famous.",
      "Suggestions only show players from the drawn country, so an empty list means wrong spelling or wrong idea.",
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
    howToPlay: [
      "Scan the board: 24 category tiles around a free centre square.",
      "A name appears. Decide whether he truly fits a tile you actually need.",
      "Tap a tile to lock it with his name, or skip. Skips are free and unlimited.",
      "Complete a row, column or diagonal for bingo, then bank the win or keep the board alive.",
      "Push on for 100 points per line, a bonus strike, and the full board blackout.",
    ],
    rules: [
      "3 strikes end a standard run, and only wrong taps cost strikes.",
      "12 lines are possible: 5 rows, 5 columns and 2 diagonals. The free centre gives four of them a head start.",
      "Your first line banks the win on the spot. Continuing grants a 4th strike and pays 100 points per completed line.",
      "Filling all 24 tiles is a blackout: a 500 point bonus and an instant win.",
      "The deck of players is finite, and busting on strikes after a bingo never takes the banked win away.",
    ],
    example: [
      "A veteran defender's name comes up. He fits your Champions League Winner tile and a defender tile, but only the defender tile sits on a row with three locks already, so that is the tap. Two players later, bingo.",
      "You gamble on continuing. A rash tap on Played With Messi burns strike three, but the bonus strike keeps you breathing, and a second line takes you out at 200 points with the win safe.",
    ],
    tips: [
      "Play lines, not tiles. A correct tap that helps no line is a wasted player.",
      "When less than sure, skip. The deck is long, the strikes are not.",
      "The centre row, centre column and both diagonals need only four real tiles each. Build there first.",
      "Bank the first bingo if you are already carrying two strikes.",
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
    howToPlay: [
      "Pick a pace: Relaxed is 75 seconds, Classic is 45, Insane is 20.",
      "A big letter appears. Type a player whose surname starts with it and press Enter.",
      "A bare surname works when it can only mean one player. If several share it, the game asks for the full name without saying who they are.",
      "Skip any letter for free, but the skip resets your streak.",
      "Rack up names until the clock dies, then chase your saved best.",
    ],
    rules: [
      "Scoring is 1 point per correct player, and every 5th correct answer in a row pays 2.",
      "Surnames decide the letter: Kylian Mbappe answers M, not K, and suffixes are skipped, so Vinicius Junior counts under V.",
      "Letters are weighted by how many unused players they hold, never repeat back to back, and any letter with fewer than 5 pool players never appears.",
      "The pool is roughly 500 of the most valuable current players. Cover every playable letter for Gold, 75 percent for Silver, 50 percent for Bronze.",
    ],
    example: [
      "Classic mode, 45 seconds. M drops and Mbappe is in before the letter finishes animating. S brings Saka, B brings Bellingham, and the streak builds.",
      "Your fifth straight answer pays double. Then K lands, your mind goes blank, and you skip, swallowing the streak reset. Eleven names later it is 13 points and a Silver badge.",
    ],
    tips: [
      "Type surnames only. Haaland beats Erling Haaland by half a second, and seconds are the currency.",
      "Keep go-to names ready for the deep letters, because the wheel favors letters with lots of players left.",
      "If the ambiguity message appears, add a first name to the most famous option and resubmit. Do not freeze.",
      "Skipping is not failing. Four blank seconds cost more than any streak bonus returns.",
    ],
    faqs: [
      {
        q: "Why was my answer rejected?",
        a: "Usually the surname does not start with the shown letter, the player was already used this run, or he is outside the pool of about 500 current stars. Accents and hyphens are forgiven.",
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
    howToPlay: [
      "Browse the clue shop: eight clues, each priced, each selling once.",
      "Buy what your inner scout values, maybe the age bracket for 10 or the current club for 35.",
      "Guess whenever you like: type 2 or more letters and pick a name from the list.",
      "Miss and you lose 10 points but keep digging. Hit and you bank everything left.",
      "If the bank reaches zero, the case closes and the secret man walks.",
    ],
    rules: [
      "The bank starts at 100 and doubles as your final score. Wrong guesses cost 10 each.",
      "Clue prices: nationality 25, current club 35, one former club 30, club initial 20, position 15, age bracket 10, value band 10, career club count 10.",
      "The menu totals 155 against your 100, so buying everything is impossible, and a clue can only be bought while you hold more than its price.",
      "The secret is one of the top 300 current players by value. Clues with no real data, like a former club for a one club man, show as unavailable rather than invented.",
    ],
    example: [
      "You open with the two cheapest clues. Age bracket says 21 to 24, value band says 80 to 120 million dollars. That is a short list of wonderkids, and you still hold 80.",
      "A confident stab misses, down to 70. The club initial for 20 settles the argument, and you name him with 50 banked. Middling, but far better than bankruptcy.",
    ],
    tips: [
      "The 10 point clues are the value buys. Age plus value band shrinks the pool enormously for the price of two misses.",
      "Save the 35 point current club for last. The cheap clues often make it unnecessary.",
      "Down to two candidates? A guess costs the same 10 as a cheap clue and settles it instantly.",
    ],
    faqs: [
      {
        q: "Why is a clue locked as not available?",
        a: "There is no real data behind it, most often a former club for a player who has only ever had one club. The game never invents information.",
      },
      {
        q: "Who can the secret player be?",
        a: "One of the top 300 current players by market value, the same pool the Who Am I game uses. New cases never repeat the previous secret, and your best win saves on this device.",
      },
    ],
  },

  '/rarity-round': {
    intro: [
      "Rarity Round flips trivia upside down. Anyone can name a Ballon d'Or winner. The question is whether you can name one nobody else would think of, because here the obvious answer scores worst.",
      "Five categories per run, every answer checked against real soccer data, plus a mirror mode called Crowd Says where fame wins instead. Same prompts, opposite instincts.",
    ],
    howToPlay: [
      "Choose Daily for the 5 categories everyone shares today, or Unlimited for a random 5.",
      "Pick a scoring mode: Rarity Round rewards obscurity, Crowd Says rewards fame.",
      "Read the prompt, type 2 or more letters and pick a valid answer. Names that do not fit the category cannot be submitted at all.",
      "Lock it in to see your pick's fame rank, the best possible answer, and what everyone else said.",
      "Finish all 5 rounds for your total, then check your rank among today's players.",
    ],
    rules: [
      "Each answer scores 0 to 100 by fame rank in the category's full pool: the most famous valid answer scores 100, the most obscure 0.",
      "In Rarity mode points are bad and 0 across 5 rounds is the perfect Goalless run. In Crowd Says points are good and 500 is the ceiling.",
      "The daily set changes every day at midnight Eastern Time, drawn from 15 categories covering clubs, nationalities, positions, price tags and Ballon d'Or winners.",
      "Only valid answers can be locked in, so the risk is never being wrong, only being obvious.",
    ],
    example: [
      "The prompt asks for a Ballon d'Or winner. Messi is what the planet says, near maximum points, a disaster in Rarity mode. You dig up a forgotten winner instead, someone like Igor Belanov from 1986, and score close to zero. Beautiful.",
      "Next: name a player who has played for Real Madrid. You skip the galacticos for a rotation defender from a decade ago, and your five round total of 74 lands top ten today.",
    ],
    tips: [
      "Think in decades. Long retired and briefly relevant names are where the near zero answers live.",
      "In Crowd Says, do not overthink. The first name a casual fan would blurt out is usually the right play.",
      "Read every reveal. Seeing the rarest answer and the crowd's picks is how your next run gets sharper.",
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
    howToPlay: [
      "Read the match card: competition, score line, venue, formation and whose XI you are looking at.",
      "Study the pitch. Ten tiles carry names, one shows only a position and a question mark.",
      "Search the player database and lock in your guess for the missing man.",
      "Each miss unlocks a new hint before the next try. Three misses reveals the answer.",
      "Play the shared daily lineup, then raid the archive in Unlimited.",
    ],
    rules: [
      "3 guesses per puzzle: 100 points on the first, 70 on the second, 40 on the third, 0 for a miss or a give up.",
      "Hints add new information only: a club lineup hints the missing player's nationality, a national team lineup hints his club at the time, then comes the first letter of his surname.",
      "The daily puzzle is the same lineup and same blanked player for everyone, changing at midnight Eastern Time.",
      "Unlimited draws from an archive of over 160 hand checked real lineups, with the blanked position varying between runs. Repeating a name you already tried never burns a guess.",
    ],
    example: [
      "The card reads 2011 Champions League Final, Barcelona 3-1 Manchester United, Wembley. The blank sits at centre back beside Pique. Puyol is the reflex answer, but he started that night on the bench.",
      "The actual partner was Javier Mascherano, a midfielder moonlighting at centre back in a European final. Land it first try for the full 100 and a fact to correct people with forever.",
    ],
    tips: [
      "Recite the famous XI before searching. The blank is usually the name memory skips, a full back or the holding midfielder, not the star.",
      "Use the formation label. A 4-2-3-1 tells you exactly what job the blank tile is doing.",
      "Never rush guess two. Wait for the hint, cross reference the era, then commit.",
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
};
