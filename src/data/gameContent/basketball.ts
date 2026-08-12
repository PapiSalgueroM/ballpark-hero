import type { GameContentMap } from './types';

// Pro basketball game guides. Casual human tone, no em dashes anywhere.
export const BASKETBALL_CONTENT: GameContentMap = {
  '/perfect-season-nba': {
    intro: [
      "The wheel owns your draft board. Every spin stops on a real NBA team season, 1950s to today, and you take exactly one player from that roster.",
      "Six picks build a cross era starting five plus a sixth man, then the simulator plays all 82 games. The goal is right there in the name: 82-0.",
    ],
    howToPlay: [
      "Choose a mode. Classic shows player ratings, Hard hides them until the sim ends, and Daily gives everyone the same wheel with one attempt per day.",
      "Spin, then draft one player from the team season you land on. Ratings run 40 to 99 and come from the player's actual stats that year.",
      "Repeat until all six slots are filled: PG, SG, SF, PF, C and a sixth man who can be anyone.",
      "Watch the season play out, or skip straight to the final record.",
    ],
    rules: [
      "One player per spin, 2 rerolls per run, and no player can be drafted twice.",
      "The sim plays a full 82 game season based on your team overall.",
      "Win 55 games or more to reach the simulated playoffs.",
      "Daily mode locks after one attempt and resets every day at midnight Eastern.",
      "Decade Mode limits every spin to one era. Daily always uses the full wheel.",
    ],
    example: [
      "Your first spin lands on the 1986-87 Lakers, so you take the best guard available. Four spins later your overall sits at 88.",
      "The sim opens 21-0, then drops three random games. You finish 76-6, sweep the First Round, and fall in the Conference Finals. Close only makes it worse.",
    ],
    tips: [
      "The sixth man slot counts slightly less toward your overall, so park your weakest pick there.",
      "Ratings reflect single seasons, not careers. One giant year can outrate a legend's farewell season.",
      "An 85 overall team averages around 58 wins. A real shot at perfection starts in the mid 90s.",
    ],
    faqs: [
      { q: "Is 82-0 actually possible?", a: "Yes, but barely. Even a 99 overall lineup averages about 80 wins, so you need a monster draft and a lucky sim on the same run." },
      { q: "Where do the ratings come from?", a: "Ratings come from the player's real points, rebounds and assists per 36 minutes that season, adjusted slightly for the era's pace." },
      { q: "What happens after the regular season?", a: "55 wins or more triggers a simulated bracket, four best of 7 rounds through the NBA Finals, with a Finals MVP from your roster if you win it all." },
    ],
  },

  '/stat-detective': {
    intro: [
      "Somewhere in the NBA record books there is a season with the name scrubbed off. You get the decade, the position and the per 36 minute stat line. That is the whole case file.",
      "Name the player within 8 guesses. Clues drip out as you miss, and the pool runs from all time greats to guys only real heads remember.",
    ],
    howToPlay: [
      "Pick a difficulty. Stars is famous seasons rated 85 or higher, Deep Cuts covers starters and cult heroes rated 60 to 84.",
      "Read the case file: era, position, minutes played, and points, rebounds and assists per 36 minutes.",
      "Type 2 or more letters and pick a player from the suggestions.",
      "Each miss unlocks a new clue, starting with the player's career span.",
      "Name the player within 8 guesses to close the case.",
    ],
    rules: [
      "You get 8 guesses per case.",
      "Wrong guesses show whether your guess ever played for the mystery player's franchise.",
      "Clues unlock after every miss: career span, surname initial, franchise count, team, first initial, then the exact season after miss 6.",
      "Steals and blocks only appear on cases from 1973-74 onward, because the league did not track them before that.",
    ],
    example: [
      "The file says 1980s, point guard, 11 assists per 36. Your first guess misses, but the chip says shared franchise, so those two wore the same uniform at some point.",
      "Then the career span clue narrows the field to one generation of playmakers. With the franchise hint on top, guess three closes the case.",
    ],
    tips: [
      "Do the era math first. A career span ending in 1991 rules out half your instincts.",
      "The franchise chip is quiet gold. Relocations count as the same franchise, so a Sonics guess can match a Thunder mystery.",
      "Big rebound numbers from the 1960s are inflated by pace. Do not assume only legends grabbed 15 boards.",
    ],
    faqs: [
      { q: "Why per 36 minutes instead of per game?", a: "The underlying season data stores totals and minutes, so per 36 rates are the honest version. They also make eras comparable, since a bench player's rate line reads the same as a starter's." },
      { q: "How many cases are there?", a: "Thousands. Every qualifying season from 1951-52 to today is a case candidate, split into Stars and Deep Cuts by season rating." },
      { q: "Does it repeat cases?", a: "Cases draw at random, and the game never serves the same case twice in a row." },
    ],
  },

  '/nba-starting-5': {
    intro: [
      "One spin sets the mission: build a starting five with the highest career scoring, or the lowest, or whatever the stat wheel demands.",
      "The catch: each of your five picks must come from a random NBA franchise, so your plan is only as good as your memory of who played where.",
    ],
    howToPlay: [
      "Spin the stat challenge. It might be highest career PPG, lowest career fouls, most championships, tallest lineup, anything from a pool of 13 stats.",
      "Pick one of the five positions: PG, SG, SF, PF or C.",
      "A random NBA team appears. Name a player who suited up for that franchise, picking from the suggestions as you type.",
      "Repeat until all five slots are filled, watching your running stat total.",
      "Submit the lineup for a verdict: a rating, a headline and a short breakdown.",
    ],
    rules: [
      "Five slots, one random team per pick, drawn from all 30 NBA franchises.",
      "Only players who really played for the shown team will appear in the suggestions.",
      "Guards fill PG or SG, forwards fill SF or PF, centers fill C.",
      "No player can appear twice in one lineup.",
      "Hit reroll to swap the current team, as often as you like.",
    ],
    example: [
      "The wheel says highest career PPG. Your first slot is SG from the Bulls, and you do not overthink Michael Jordan.",
      "Then it gets rude: PF from the Grizzlies, C from the Hornets. You dig up the best scorers you can remember, submit a total in the high 90s, and the verdict roasts your weakest link.",
    ],
    tips: [
      "Read the direction twice. On a lowest challenge, the stars you love are suddenly poison.",
      "Journeymen are cheat codes. A player with five career stops gives you outs on five different team spins.",
      "Reroll early, not late. A bad team fit hurts more when only one slot is left.",
    ],
    faqs: [
      { q: "Do the players have to be current?", a: "No. The pool spans thousands of players across NBA history, as long as they played for the shown franchise." },
      { q: "Why will the game not accept my guy at point guard?", a: "Position data is coarse: guards fit either guard slot, forwards fit either forward slot, and centers fit center. If a player is listed as a forward, he cannot fill your PG hole." },
      { q: "How is my lineup judged?", a: "Each pick gets a value for the challenge stat, then the game writes a short verdict with a rating and headline you can share." },
    ],
  },

  '/nba-connect-4': {
    intro: [
      "Connect 4 with receipts. The board is the classic 7 wide by 6 tall grid, but you cannot just drop a piece. You have to earn the cell with an NBA answer.",
      "Every column and row carries a label, things like Lakers, MVP Winner or 20+ PPG Career. To claim a cell, you need one player who matches both.",
    ],
    howToPlay: [
      "Grab a friend. It is a two player game, red against blue, on one screen.",
      "On your turn, pick a column. Your piece will fall to the lowest empty row.",
      "That landing spot commits you to two labels: the column's and the row's.",
      "Name an NBA player who fits both. A fact check reviews the claim before the piece is placed.",
      "First to four in a row wins: across, down or diagonal.",
    ],
    rules: [
      "The grid is 7 columns by 6 rows, each with its own trivia label.",
      "Each player name can only be used once per game, by either side.",
      "A rejected answer does not place a piece and does not end your turn. Try someone else or hit skip.",
      "Fill all 42 cells with no winner and it is a draw.",
    ],
    example: [
      "You drop into the Warriors column and the landing row says Champion. Andre Iguodala fits both, the check clears it, and your red piece locks in.",
      "Later, blue needs the Lakers column to block you, but the waiting row says DPOY Winner and they blank. They skip, you finish the diagonal.",
    ],
    tips: [
      "Think one row ahead. The label your piece lands on changes as the column fills.",
      "Burn common answers early. If both of you are saving the same superstar, whoever needs him second is stuck.",
      "Play the board, not just the trivia. A boring cell that blocks four in a row beats a clever one that does not.",
      "The skip button is a real move. Losing a turn beats feeding a wrong guess streak.",
    ],
    faqs: [
      { q: "Can I play alone?", a: "There is no bot, so solo play means running both sides. It works fine as trivia practice." },
      { q: "What if the checker rejects a correct answer?", a: "You keep your turn, so try again or pick another player. There is also a report button on the page if a call looks wrong." },
      { q: "Do the boards change?", a: "Yes. Each new game draws one of several curated boards, from Legends and Dynasties to Draft Pedigree, so the label combinations stay fresh." },
    ],
  },

  '/nba-chain': {
    intro: [
      "Every NBA career is a web of teammates, and this game makes you walk it. Start from one star, then name a teammate of his, then a teammate of that guy, on and on.",
      "One wrong link ends the run. The deeper you go, the more names you burn, and the more you find yourself trading superstars for that one backup center who played everywhere.",
    ],
    howToPlay: [
      "The game hands you a starting player, someone famous like LeBron James or Kevin Garnett.",
      "Name any player who was an NBA teammate of the current player.",
      "The link gets verified, and the shared team shows up on the chain.",
      "Keep adding links. Each new player must connect to the one right before them.",
      "Play Endless to chase a record, or Round mode for a fixed 10 pick challenge against par.",
    ],
    rules: [
      "A wrong link ends the game instantly. So does repeating any player already in the chain.",
      "Endless mode: build until you break, and your best streak saves on your device.",
      "Round mode: exactly 10 picks, with par set at 7.",
      "You can end a run voluntarily and bank the score.",
    ],
    example: [
      "Start: Dirk Nowitzki. You go Jason Kidd from the title Mavs, then from Kidd's Nets years you pull Vince Carter, and from Carter's Raptors days you grab Tracy McGrady.",
      "Eight links deep, you gamble on a teammate you half remember. No shared team. Chain of 8.",
    ],
    tips: [
      "Route through journeymen. A guy with six career stops opens six directions.",
      "Long careers are bridges between eras. Veterans who played 18 plus seasons connect generations.",
      "Do not chain into a dead end. A one team legend late in the run leaves you only his teammates.",
      "In Round mode you just need 10 clean links, so take the safest connection every time.",
    ],
    faqs: [
      { q: "What counts as teammates?", a: "The two players must have shared an NBA team, and the check tells you which one. Overlapping on the roster is the standard, so pick pairs you are sure actually crossed paths." },
      { q: "Do I lose if the connection cannot be verified due to a network hiccup?", a: "No. If verification fails for technical reasons, nothing is added and nothing ends. You just try the same link again." },
      { q: "Where is my best streak stored?", a: "On your device. Play on the same browser and the game keeps showing the record you are chasing." },
    ],
  },

  '/nba-higher-lower': {
    intro: [
      "Two legends, one question: who scored more career points? That is the entire game, and it is much harder than it sounds.",
      "The pool is the top 80 scorers in NBA history, so there are no easy outs. Everyone on screen scored a mountain of points. You are just deciding whose mountain is taller.",
    ],
    howToPlay: [
      "Look at the two player cards: name, position, franchises and final season.",
      "Tap the player you think finished with more career points.",
      "The totals flip over, your answer gets marked, and the next pair loads.",
      "Survive all 10 rounds and post your score.",
      "Play the Daily, then switch to Unlimited if you want more.",
    ],
    rules: [
      "Each game is 10 rounds, and every correct answer is worth 10 points.",
      "Consecutive correct answers earn a growing streak bonus. A perfect 10 for 10 run scores 325.",
      "Exact ties count as correct no matter which side you pick.",
      "Daily mode serves everyone the same pairs, once per day, with a fresh set every day at midnight Eastern.",
      "Hard mode pairs players with close totals, and it only applies in Unlimited.",
    ],
    example: [
      "Round one gives you Kobe Bryant against Michael Jordan. Feels like a coin flip, but Kobe played 20 seasons and finished ahead, 33,643 to 32,292.",
      "Then comes a 1960s name against a 2010s star, and era math takes over. An eight answer streak builds, round nine snaps it, and you close at 230.",
    ],
    tips: [
      "Longevity beats peak. A 19 year career of good scoring usually outpoints a short brilliant one.",
      "Check the final season on the card. It quietly tells you how long the career ran.",
      "Multiple franchises often means a long career, which means more total points.",
      "Guard your streak late. Rounds eight through ten carry the biggest bonuses.",
    ],
    faqs: [
      { q: "Is it always career points?", a: "Yes, this one is pure career regular season scoring totals. No averages, no playoff points, just the full body of work." },
      { q: "What is the highest possible score?", a: "325. That is all 10 correct with the streak never breaking, since each consecutive answer stacks a bigger bonus on the base 10 points." },
      { q: "Who can show up?", a: "Only the top 80 career scorers in league history, from active stars to names your dad swears by." },
    ],
  },

  '/nba-grid': {
    intro: [
      "Nine cells, nine guesses, zero mercy. This is the NBA immaculate grid formula: every cell sits at the crossroads of a row and a column, and you need one player whose career satisfies both.",
      "Sometimes that means two franchises, sometimes a franchise plus a milestone like 10,000 points. The obvious names run out fast.",
    ],
    howToPlay: [
      "Read the three row labels and three column labels. They are NBA franchises or career milestones.",
      "Tap any empty cell and type a player name.",
      "Pick from the suggestions. If the career matches both labels, the cell turns green.",
      "A wrong answer costs one of your 9 guesses and leaves the cell empty.",
      "Fill all nine cells before the guesses run out.",
    ],
    rules: [
      "You get 9 total guesses for 9 cells, so a perfect game has zero misses.",
      "Each player can only be used once per grid.",
      "Categories come from a pool of 16 franchises plus three milestones: 10,000+ career points, 5,000+ career rebounds and 900+ games played.",
      "The daily grid is the same for everyone and your progress saves. A new one drops every day at midnight Eastern.",
      "Unlimited mode adds difficulty tiers: easy uses two milestone lines, normal uses one, hard is all franchises.",
    ],
    example: [
      "Top left wants Lakers plus Celtics. You take a second, then remember Shaquille O'Neal finished up in Boston. Green.",
      "Next, Bulls plus 10,000+ career points. Jordan is the reflex, but you save him in case a tougher Bulls cell shows up, and spend Scottie Pippen instead. That little hesitation is the whole game.",
    ],
    tips: [
      "Scan the full grid before guessing. The hardest intersection should get your rarest player.",
      "Journeymen with 900+ games are the milestone cheat code, and they are rarely anyone's first thought.",
      "Answers check against career data instantly, so this is a memory game, not a debate.",
      "Short careers ruin milestone cells. A five year star probably misses the games played bar.",
    ],
    faqs: [
      { q: "Does every cell have an answer?", a: "Yes. Every pairing in the pool has at least 25 qualifying players, so a blank cell is a you problem, not a board problem." },
      { q: "Why are some famous franchises missing?", a: "The pool sticks to 16 franchises whose history lives under one code, so relocation heavy teams like the Thunder and Grizzlies sit out to keep answers clean." },
      { q: "Do wrong guesses reveal anything?", a: "No hints, just a red flash and one fewer guess. Treat every submission like it is your last." },
    ],
  },

  '/nba-connections': {
    intro: [
      "Twenty NBA players sit in a grid, and they are not random. Hiding inside are four groups of five, each tied by one connection: a shared franchise, a milestone, a birth country, a draft slot. Find all four before your lives run out.",
      "If you came from the word puzzle world, one warning: this NBA connections game runs bigger than the format you know. Groups are five deep instead of four, so there are twenty names to sort and a fifth guy to find for every theme. The easy four come quick. The fifth is where doubt moves in.",
      "Equal parts trivia and logic, and that mix is what makes a basketball connections puzzle sticky. Knowing a player is step one. Knowing which part of his career the board cares about is the game.",
    ],
    howToPlay: [
      "Read all 20 names before you touch anything. First instincts are good, first submissions are not.",
      "Tap 5 players you believe share a connection. Tap again to deselect.",
      "Hit Submit. A correct five locks in, shows its theme, and leaves the board.",
      "A wrong five shakes the board and costs one of your 4 lives.",
      "Group colors run yellow, green, blue, purple, from easiest to hardest.",
      "Clear all four groups to win. Run out of lives and the remaining answers are revealed.",
    ],
    rules: [
      "Every puzzle is exactly 4 groups of 5 players, 20 names total.",
      "You have 4 lives, and every wrong submission costs one.",
      "Each player belongs to exactly one group in the puzzle. No name ever fits two answers.",
      "The daily puzzle is identical for everyone, progress saves, and a fresh one lands every day at midnight Eastern. Unlimited deals random boards from the pool.",
    ],
    example: [
      "Say the board includes Dwyane Wade, Alonzo Mourning, Udonis Haslem, Chris Bosh and Tim Hardaway. Heat, obviously. Except Hardaway was a point guard with big assist numbers, and you suspect an assists group too. That collision is the whole puzzle.",
      "So you count. Hardaway sits comfortably short of 10,000 career assists, while John Stockton, Jason Kidd and Steve Nash all cleared it. Hardaway goes back in the Heat pile, and both groups lock in clean.",
      "The last trap is the scorers. Karl Malone, Kobe Bryant, Dirk Nowitzki and Carmelo Anthony scream career points, and your eye wants Allen Iverson as the fifth. Except Iverson was a number one overall pick, and Yao Ming and Zion Williamson are sitting there looking suspiciously like a draft group. Save Iverson for them, and the real fifth scorer appears by elimination. Lesson learned: verify the fifth name, always.",
    ],
    tips: [
      "Find the fifth before you submit. Anyone can spot four Lakers. The theme is only proven when a fifth fits.",
      "If one player fits two of your working themes, one theme is wrong. Treat the overlap as a compass.",
      "Star scorers hide in draft and country groups. Check where a player was born and picked before filing him under points.",
      "Start with the group you would bet a life on, whatever its color. Five names off the board makes everything else easier to see.",
      "Down to two groups and unsure? Submit your stronger read. If it hits, the last group solves itself.",
    ],
    faqs: [
      { q: "How is this different from other connections games?", a: "Three ways: it is all basketball, groups are five players instead of four, and you get 4 lives. Bigger groups make themes easier to spot but harder to complete." },
      { q: "Is there a one away warning?", a: "No. A wrong submission costs a life even if four of five were right, which is why the fifth name deserves the most thought." },
      { q: "Is everyone solving the same puzzle?", a: "In daily mode, yes, the whole world gets the same 20 players, and progress saves if you leave. Unlimited deals random boards." },
      { q: "What kinds of connections show up?", a: "Franchises, career milestones like 28,000 points or 2,000 threes, birth countries like France or Canada, and draft slots like number one overall. Every grouping is checked against real career data." },
      { q: "Do I need an account to play?", a: "No. An account, email or Google, is optional and only matters if you want saved stats and leaderboards. The daily puzzle itself needs nothing." },
    ],
  },

  '/nba-career': {
    intro: [
      "A mystery NBA player is hiding behind a stack of clues, and the first one is nearly useless on purpose. You start with just a position and 1,000 points on the table.",
      "Every clue you flip makes the answer easier and the payout smaller. The whole game is one question: how early do you dare to guess?",
    ],
    howToPlay: [
      "Start with the position clue and a pot of 1,000 points.",
      "Guess whenever you like. Wrong guesses are free, so swing away.",
      "Stuck? Reveal the next clue: country, then draft info, then teams, then career stats, then awards.",
      "Each reveal costs 150 points, down to a floor of 100.",
      "Name the player to bank whatever is left, or give up to see the answer.",
    ],
    rules: [
      "The score ladder runs 1000, 850, 700, 550, 400, 250, 100 depending on clues used.",
      "Wrong guesses cost nothing. Only revealed clues eat your score.",
      "A last name alone counts as a correct guess.",
      "Daily mode gives everyone the same player each day, and hard mode hides the two easiest clues.",
    ],
    example: [
      "The position says center. That could be anyone, so you flip country: Nigeria. Interesting. One more flip, draft info: first overall pick, 1984.",
      "Now it is obvious. Hakeem Olajuwon, guessed with two clues used, banks 700 points. Greedy players flip nothing and gamble at 1,000. Cowards flip five and keep 250. Pick your identity.",
    ],
    tips: [
      "Guess early and often, since misses are free. Even a wild swing at 1,000 costs nothing.",
      "The draft clue is usually the code breaker. Year plus pick number narrows history fast.",
      "Teams reveal one franchise at a time, so a one team legend gets exposed instantly.",
      "In unlimited mode, practice reading stat lines. Career numbers have a shape, and shapes have names.",
    ],
    faqs: [
      { q: "Do wrong guesses lower my score?", a: "No. You can guess as many times as you want at no cost. The only thing that drains the pot is revealing clues, at 150 points each." },
      { q: "Can I just type the last name?", a: "Yes. The game accepts the surname on its own, so no need to remember exactly how a first name is spelled." },
      { q: "What does hard mode change?", a: "It hides the two gimme clues, position and country, so you are working from draft info, teams, stats and awards. Scoring stays the same." },
    ],
  },

  '/missing-five': {
    intro: [
      "You remember the game. The shot, the score, the confetti. This one bets you do not remember who actually started.",
      "Missing Five shows a real starting five from a famous NBA Finals night with one name blanked. Every lineup is verified against the official box score, and the blanks are chosen to hurt.",
    ],
    howToPlay: [
      "Read the game context: the matchup, the date, the final score, the venue.",
      "Look at the court. Four starters are named, one is a glowing blank with only the position showing.",
      "Type the missing starter. You have 3 guesses.",
      "Each miss unlocks a hint, starting with the player's nationality, then the first letter of the surname.",
    ],
    rules: [
      "3 guesses per lineup: 100 points on the first, 70 on the second, 40 on the third.",
      "The surname alone counts, as long as it is at least four letters.",
      "Hard mode strips the hints, the name suggestions, and even the position labels.",
      "The daily lineup is the same for everyone and changes every day at midnight Eastern. Unlimited mode keeps dealing new ones.",
    ],
    example: [
      "The card reads 2016 NBA Finals, Game 7, Warriors starting five, and the blank is at center. You type Andrew Bogut with full confidence. Wrong. Bogut was hurt and never played that night.",
      "The hint says Nigeria, and somewhere in your brain a backup big raises his hand. Second guess lands. 70 points and a story.",
    ],
    tips: [
      "Think about injuries and matchups before you type the famous name. Finals coaches loved a surprise starter.",
      "The score line and date matter. They pin the exact night, not just the series.",
      "Role players who started title games are the answer more often than superstars. The stars are usually already on the card.",
      "If the nationality hint surprises you, lean into it. It usually eliminates your whole shortlist at once.",
    ],
    faqs: [
      { q: "Are these lineups real?", a: "Yes, every five was checked against the official box score for that exact game. When the answer feels wrong, that is the point: the real starter is often not the guy history remembers." },
      { q: "Why is the answer sometimes a nobody?", a: "Coaches made one night changes in huge games, and those starters are forgotten. The gap between memory and box score is the whole game." },
      { q: "Do I have to spell the full name?", a: "No. The surname on its own works, and outside hard mode the suggestion list helps with spelling." },
    ],
  },

  '/perfect-lineup-nba': {
    intro: [
      "Five slots, and the game has opinions. Three of them come stamped with a constraint, a franchise or a decade, and only players matching the tag can go there.",
      "The pool is a curated set of greats and current stars, so every pick is good. The puzzle is squeezing the best combination through the constraints while keeping the roster connected.",
    ],
    howToPlay: [
      "Check the five slots: PG, SG, SF, PF and C. Three carry a constraint like Lakers or 1990s.",
      "Tap a slot and pick from the eligible players. Constrained slots only list players who fit the tag.",
      "Fill all five, watching for chemistry links between picks.",
      "Hit Simulate for a scoreline, a grade and a chemistry rating.",
    ],
    rules: [
      "Exactly 3 of the 5 slots carry a team or era constraint, and every constraint leaves at least 4 eligible players.",
      "Positions flex one step: the PG slot also takes shooting guards, the C slot also takes power forwards.",
      "Your final rating is 80 percent player quality and 20 percent chemistry.",
      "Chemistry comes from sharing a franchise or an era with at least one other pick.",
      "Grades run from A+ at a 92 rating down to D. The daily constraint set is the same for everyone and changes every day.",
    ],
    example: [
      "Say the center slot demands Lakers and the point guard slot demands 1980s. Kareem Abdul-Jabbar takes center, and Magic Johnson at point becomes a double link: same team, same decade.",
      "Two modern wings and a 90s power forward round it out. Chemistry lifts a decent roster to an A and a green and yellow emoji row.",
    ],
    tips: [
      "Build around the constraints first. The two free slots fix whatever the tags forced on you.",
      "Chase double links. A pick sharing both team and era with a teammate feeds chemistry twice.",
      "Do not draft five strangers. A weaker player who connects often beats a loner star.",
    ],
    faqs: [
      { q: "Who is in the player pool?", a: "About 66 curated stars across every era, from Magic and Kareem to current MVPs. Not the full history books, which keeps every slot a real decision." },
      { q: "Can I redo my daily lineup?", a: "Yes. After simulating you can edit the same constraint set and run it again, chasing a better grade all day." },
      { q: "How exact is the scoring?", a: "Your five ratings average into 80 percent of the score, chemistry is the other 20, and the result maps to a grade and a shareable scoreline." },
    ],
  },

  '/conquest-nba': {
    intro: [
      "Pick a team, inherit the land around its arena, and try to own the entire country. This is the NBA imperialism map format: every game swallows empires whole.",
      "A loss does not cost a border town. It costs everything, every territory, straight into the winner's hands. Fourteen rounds later the map is a few giant blobs with grudges.",
    ],
    howToPlay: [
      "Pick your team in Imperialism mode. Every territory on the map starts owned by its nearest NBA arena.",
      "Each round, all 30 teams play. Before it runs, you call the winner of the featured game, your team's whenever they play.",
      "Watch the results redraw the map as losers hand over entire empires.",
      "Survive 14 rounds. The top 8 empires by territory make the playoffs.",
      "Win the Quarterfinals, Semifinals and Imperial Finals to rule America.",
    ],
    rules: [
      "Winners annex everything the loser owned, every single round.",
      "Wiped off the map does not mean out: one win takes your conqueror's whole empire back.",
      "Correct predictions pay 25 points each. Final score adds 3 per territory held, 50 for making the playoffs, 200 if your team takes the title.",
      "Playoff seeding is territories first, season record as the tiebreaker.",
      "Arcade mode is the original formula: battles, stealing a player from every beaten team, and power-ups.",
    ],
    example: [
      "You take Denver. Two early wins triple your land, then the Mavericks flatten you in round six and the whole empire changes color.",
      "Round eight, Denver beats Dallas in overtime and takes back everything they own, half of Texas included. You sneak in as the 7 seed and fall in the Imperial Finals to a Celtics empire covering the East Coast. Run it back!",
    ],
    tips: [
      "Predictions are steady income. Territories can vanish in one night, but called games are banked forever.",
      "Check the win percentage on each matchup before calling it. Upsets happen, but math is math.",
      "Peek at the standings. Playoff seeding sneaks up fast, and territories decide it.",
    ],
    faqs: [
      { q: "What happens when my team loses everything?", a: "You stay in the game. Landless teams keep playing, and the moment they win they seize their conqueror's entire empire. The best runs start from zero." },
      { q: "Can the season end before round 14?", a: "Yes. If one team conquers every territory, the season ends right there with a total conquest." },
      { q: "How do the two modes differ?", a: "Imperialism is the map format with predictions and annexed empires. Arcade is the original battle mode with player steals and power-ups." },
    ],
  },

  '/nba-front-office': {
    intro: [
      "Running an NBA franchise looks easy from the couch. This sim hands you a real rotation, a cap sheet and 29 rivals so you can find out.",
      "Waive the deadweight, sign the bargains, swing trades the computer actually weighs, and steer the season toward the bracket and maybe a banner. Dynasties are the real scoreboard.",
    ],
    howToPlay: [
      "Pick any of the 30 franchises and inherit its real rotation, rated player by player.",
      "Work the roster. Waive contracts, sign free agents with your cap room, and propose trades.",
      "Sim the season in 20 short stretches, watching the conference standings tighten.",
      "Finish top 6 for a direct playoff seed, or 7th through 10th for the play-in.",
      "Win four best of 7 rounds, then draft and rebuild for the repeat.",
    ],
    rules: [
      "The cap starts at 155 million and rises 7 percent every season. Rosters hold 8 to 15 players.",
      "Trades are player for player with an optional pick sweetener. The other side weighs age and rating and only takes deals that favor them.",
      "The play-in covers seeds 7 through 10, with one last game deciding the 8 seed.",
      "Draft classes have 24 prospects, you pick twice, and scouting grades can miss the truth by a few points either way.",
      "Everyone ages each summer: young players develop toward potential, decline starts at 32, veterans retire.",
    ],
    example: [
      "You take a bubble team and ship an aging star for a 24 year old, pick attached. The season starts ugly.",
      "Then the kid pops. You sneak in at the 9 seed, win two play-in games, upset the 1 seed in seven, and lose the conference finals. The rookie scouted at 91 comes in at 87. Run it back.",
    ],
    tips: [
      "Age is currency. The trade engine pays a premium for anyone 24 and under, so shop aging names early.",
      "Your best five carry most of the load, but bench quality is real when injuries hit.",
      "A champion is never finished. Contracts expire, and some role players walk every summer.",
    ],
    faqs: [
      { q: "Are the rosters real?", a: "The players are real, about ten curated per franchise. Contracts, salaries and ages in the sim are explicitly fictional." },
      { q: "Why did my trade get rejected?", a: "The engine values rating adjusted for age and wants to come out ahead. Offer youth, take back age, or add a pick." },
      { q: "Does my save persist?", a: "Yes, the league auto saves in your browser across unlimited seasons. Clearing site data wipes the franchise." },
    ],
  },

  '/nba-my-career': {
    intro: [
      "Draft night is where it starts: a made up prospect with your name, landing in a real NBA locker room. Where it ends is up to your summers.",
      "Each season prints a stat line shaped by your rating, archetype, health and team quality. Each summer drops one decision on your desk: contracts, surgeries, trade demands.",
    ],
    howToPlay: [
      "Create your player: name, position, and one of nine archetypes, from Point God to Paint Beast.",
      "Get drafted by a real NBA team. Stronger prospects go higher and earn more.",
      "Sim each season for a full line: games, points, rebounds, assists, awards, team result.",
      "Handle the offseason event, one big decision per summer.",
      "Retire when the body or the fire quits, and face the legacy verdict.",
    ],
    rules: [
      "Archetypes shape the stat engine: Point Gods pile up assists, Paint Beasts eat rebounds, Bucket Getters score but break down more.",
      "All-NBA needs 62 games played, and MVP talk starts at a 92 rating.",
      "Growth runs to age 25, decline starts at 32, and health erodes late unless you invest in it.",
      "Careers end at 41, after 21 seasons, or when the rating craters. You can also walk anytime.",
    ],
    example: [
      "You roll a Two-Way Menace guard, go 11th, and win Rookie of the Year on a bad team. Year three, morale craters and you demand a trade. Villain arc unlocked.",
      "The new team contends. You take the discount at 28, win it all at 30, and grab Finals MVP. Decline arrives at 33, surgery buys two more years, and the verdict reads first ballot Hall of Famer. The GOAT tier stays out of reach. It usually does.",
    ],
    tips: [
      "Pick the archetype for the career you want to live. Durability differences are real.",
      "Do not sit on low health. Injuries shred seasons, and awards need games played.",
      "Team quality moves your stats and playoff odds. Free agency is a basketball decision, not just money.",
    ],
    faqs: [
      { q: "Can I play as a real NBA star?", a: "No, your player is fictional by design. The 30 teams around you are real, but the career is yours to invent." },
      { q: "What does the legacy score reward most?", a: "MVPs and rings move it hardest, then Finals MVPs and All-NBA nods, plus longevity and points. The top verdict is the GOAT conversation, and it takes a stacked case." },
      { q: "Is my career saved?", a: "Yes, progress auto saves in your browser. One career at a time, and starting fresh means retiring first." },
    ],
  },
};
