import type { GameContentMap } from './types';

// Soccer game guides, batch 2. Casual human tone, no em dashes anywhere.
export const SOCCER_CONTENT_2: GameContentMap = {
  '/sign-the-player': {
    intro: [
      "Three bidders, one billion pounds each: you, The Sheikh, and Moneyball Mike. Twenty two players go under the hammer across two passes, eleven journeymen wait to fill the gaps, and a simulated mini league decides who spent it best.",
      "The auction runs the way a real room does: lots come up in a random position order at real list price, a contested lot turns into a live bidding war, an unwanted one decays until somebody snaps the bargain, and the most valuable player in the room headlines the final lot.",
    ],
    howToPlay: [
      "Pick a theme: Current Stars, All-Time Legends, or World Cup 2026.",
      "Pass one is a lot per position from the middle band in a random order; pass two is the elite band, with the single most valuable player held back to headline the close. Until a position has come up, the room shows the running order, never the names.",
      "Bid in steps of 5, 10, or 25 million, or pass. If you are the only one who wants him, you get him at the list price.",
      "When the last hammer falls, every open chair on every squad is filled from the journeyman list at a fee, so nobody plays the showdown a man short.",
      "Once all three squads hit 11, the showdown simulates the league and crowns a champion.",
    ],
    rules: [
      "Every bidder starts with 1 billion pounds. Twenty two auction lots cover the 11 positions twice, middle band then elite, and eleven journeymen fill whatever stays open at the end.",
      "Two bidders or more on the same lot and it is a war, so it always finishes above list. Exactly one bidder and he takes him for the list price, not a penny over.",
      "If nobody bids at list price, the price falls step by step; anyone can snap it mid fall, and a lot that reaches thirty percent of list is withdrawn unsold.",
      "An end of auction fill costs just under half the player's list price, minimum 5 million.",
      "The showdown is a double round robin, 4 matches per club, ranked by points then goal difference.",
      "Score is a place bonus (300, 150, or 50) plus 3 per point of squad rating plus 1 per 10 million left in the bank.",
    ],
    example: [
      "A striker lot opens mid running order at his real list price. The Sheikh wants him, so you nudge the price once and let go; he wins the war at 240 million, and when the elite striker headlines the close he is too broke to fight you.",
      "The leftover striker goes to Mike, fee and all. The sim hands you the title on goal difference, and the unspent money pads your score.",
    ],
    tips: [
      "The Sheikh overpays, so tax him on lots you do not want, then step away.",
      "Moneyball Mike passes on superstars and hunts value, so fight him for the mid priced lots.",
      "Passing everything still costs you: the end of auction fill charges a fee for every open chair, and journeymen do not win showdowns.",
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
    howToPlay: [
      "Pick the daily gauntlet (the same five card choices for everyone today) or unlimited for a fresh draft.",
      "For each slot, read the five cards, star to bargain, and tap the one you keep. Position families apply, so a winger card can cover either flank.",
      "After pick eleven the knockout starts on its own: five rounds, one match each, revealed one at a time.",
      "Survive a round for 16 points; lift the trophy for exactly 100.",
    ],
    rules: [
      "Every card is a real player from the same verified market data the rest of the site uses; every opponent club is invented on purpose.",
      "The five cards per slot are spread across the value bands, so a star and a bargain are always both on the table.",
      "No player is dealt twice in one draft.",
      "The knockout is deterministic in your XI: goals come from the rating gap, level games go to extra time and then penalties, and replaying the same squad replays the same cup.",
      "Opposition ratings climb 70, 76, 81, 85, 89. A bargain draft usually falls in the first two rounds, an elite one reaches the final as a slight underdog, and even a perfect draft lifts the trophy about one run in eight.",
    ],
    example: [
      "The draw hands you a 4-3-3 and the striker slot deals a 91 rated superstar next to an 84, a 79, a 74 and a 68. You pay nothing for any of them, so the 91 is the pick unless you are chasing a story.",
      "Your finished XI rates 84. The Qualifier ends 3-0, the Last Sixteen 2-1, the Quarter Final needs penalties, and the Semi Final ends the run 1-2. Four rounds survived, 64 points, and the draft you would redo is the 74 you took at left back.",
    ],
    tips: [
      "The keeper card matters as much as the striker card: one weak slot drags the whole rating.",
      "The bargain cards exist for flavor runs, not for winning. If the score is the goal, draft the biggest number that fits.",
      "Champions need a squad in the high eighties. Check your running rating under the cards as you go.",
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
    howToPlay: [
      "Type a player's name and pick him from the suggestions.",
      "Read the tiles: green is an exact match, yellow is close, white is a miss.",
      "Follow the arrows: up means the answer's value is higher than your guess.",
      "Narrow by continent, league, and position group before sweating exact numbers.",
      "Get the name within 8 guesses and share your emoji grid.",
    ],
    rules: [
      "You get 8 guesses in both daily and unlimited mode.",
      "Yellow means close: same continent, same league, within 3 goals, assists, or kit number, within 2 years of age, within 5 million dollars of value, or the same position group.",
      "The daily tier is shared: about 40 percent of days are Easy, 55 Hard, 5 Insane.",
      "In unlimited mode you choose Easy, Hard, or Insane, and the answer always comes from that tier.",
    ],
    example: [
      "Open with Jude Bellingham. Club comes back yellow, so the answer is La Liga but not Real Madrid. Position is green, a midfielder, and the age tile points down.",
      "Young La Liga midfielders scream Barcelona. Pedri turns club green, kit number and goals steer the last step, and Gavi lights the board on guess three.",
    ],
    tips: [
      "Open with someone you know cold so the arrows mean something.",
      "Category tiles carve the pool faster than stats: continent, then league, then position group.",
      "Kit number is sneaky useful. A yellow pins the shirt to within 3.",
      "In unlimited Insane, still probe with famous names. Guessing stays open to the full pool.",
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
    howToPlay: [
      "Tap any hidden box to reveal that cell of the career table.",
      "Press Give Hint to open 4 random boxes at once, as often as you like.",
      "Guess by typing a name in the search bar, any time, even with zero boxes open.",
      "Wrong guesses burn one of your 8 chances. Revealing boxes never does.",
      "Solve it and the game logs both your guess count and your box count.",
    ],
    rules: [
      "You get 8 guesses, and 8 wrong guesses ends the run.",
      "Each hint opens exactly 4 random boxes.",
      "Five columns hide per season: club, appearances, goals, assists, and market value.",
      "The daily is shared by everyone. Unlimited mode adds Easy, Normal, and Hard tiers, splitting the pool by peak market value.",
    ],
    example: [
      "You open one club box mid career and get Juventus. Big list, so you open the market value cell on that row: star money, a player in his prime. One more club box near the top shows Ajax.",
      "Ajax to Juventus with superstar value narrows it fast. You type Zlatan Ibrahimovic and win in 1 guess with 3 boxes revealed, the kind of line worth sharing.",
    ],
    tips: [
      "Club boxes are the biggest tell. A distinctive transfer route can solve it in two reveals.",
      "Market value peaks mark the prime years and split superstars from journeymen.",
      "Goals in the twenties every season screams striker. Big appearances with few goals hints at defenders and keepers.",
      "No clock is running, so sit with the pattern before you spend a guess.",
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
      "Five career totals are in play: appearances, goals, assists, trophies, and international caps. Choose the one stat where your player beats the mystery opponent. One bad read ends the run.",
    ],
    howToPlay: [
      "Study your player's five revealed career stats.",
      "Tap the one stat where you think your player is at least as high as the hidden opponent.",
      "The reveal shows both cards for a few seconds either way.",
      "Correct picks grow your streak, and the opponent becomes your next player.",
      "A wrong pick ends the game. Share the streak and go again.",
    ],
    rules: [
      "All five stats are career totals.",
      "Ties count for you: a pick is correct when your number is higher than or equal to the opponent's.",
      "One wrong pick ends the run. There are no lives and no timer.",
      "Every matchup is winnable by design, with at least one stat where your player is not behind.",
    ],
    example: [
      "Your card is Lionel Messi. Goals feels safe until you remember a hidden Cristiano Ronaldo would edge it, so you tap trophies, and Messi's cabinet holds up against almost anybody.",
      "The reveal shows a legendary defender with huge appearances but a lighter trophy shelf. Streak to 7, and now you play as that defender, hunting his one strong column.",
    ],
    tips: [
      "Appearances reward longevity, so keepers and one club legends quietly dominate that column.",
      "Remember who might be hiding: the pool mixes current stars with retired icons carrying finished, giant totals.",
      "Ties go to you, so a merely solid stat can still be the safest pick.",
      "Your best streak of the session stays on screen. Chase it while the pool is fresh in your head.",
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
    howToPlay: [
      "Tap four players you think belong together and hit Submit.",
      "Correct sets lock in with their category name and color.",
      "Wrong sets cost one of your 4 lives. If 3 of the 4 were right, the game says you were one away.",
      "Spend a hint to reveal the category name of the easiest unsolved group.",
      "Find all four groups before the lives run out.",
    ],
    rules: [
      "Always 16 players forming exactly 4 groups of 4.",
      "You have 4 lives, and every wrong submission costs one.",
      "Up to 4 hints, and they reveal category names only, never players.",
      "Colors mark difficulty: green easy, yellow medium, blue hard, purple insane.",
    ],
    example: [
      "You spot Kaka, Maldini, Van Basten, and Gullit and submit them as AC Milan players. Locked, green. Then four Ballon d'Or winners come back one away: someone belongs to a sneakier group.",
      "Swap one name for Modric and it locks. The last eight should sort themselves, but you triple check anyway, because winning with all 4 lives intact is the real flex.",
    ],
    tips: [
      "Never submit your first idea. Hunt the trap player who fits two categories.",
      "Lock your surest group first. Every solve shrinks the board.",
      "One away means change exactly one player, not two.",
      "Save hints for the last two groups, where the categories get strange.",
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
    howToPlay: [
      "Choose one of 6 formations: 4-3-3, 4-4-2, 3-5-2, 4-2-3-1, 3-4-3, or 5-3-2.",
      "Tap a position. The spinner shows which club or national team that slot is locked to.",
      "Type a player from that team who fits. The game verifies the answer before it counts.",
      "Hate an assignment? Reroll it for a different team.",
      "Fill all 11 slots, review your chemistry links, then submit for the AI rating.",
    ],
    rules: [
      "Wrong answers are rejected with a reason but cost nothing. Retry until a valid name lands.",
      "A slot takes a player who plays there or right beside it: full backs and wing backs cover each other, wingers count on both flanks, CM covers CDM and CAM, strikers cover each other. A keeper only ever goes in goal.",
      "No duplicate players across your XI.",
      "Chemistry: each pair sharing a club is worth 3 points, a league 2, a nationality 1, capped at 9 per player.",
      "If the AI judge is unreachable, a built in offline judge grades you instead, so a run never dead ends.",
    ],
    example: [
      "You take 4-3-3. Liverpool lands on the goalkeeper slot, so Alisson goes in. Arsenal on the right wing is Saka. Then the striker slot spins a national team, and you weigh Harry Kane against saving England for a harder slot.",
      "The finished XI leans Premier League, chemistry pays you for it, and the verdict praises the spine while roasting your left back. You run it back in a 3-5-2.",
    ],
    tips: [
      "Reroll thin assignments before typing, knowing the spin can land somewhere worse.",
      "Small club on the wheel? Goalkeepers are easy to name, elite wingers are not.",
      "Stacking one league quietly adds chemistry points to the final screen.",
      "If a right sounding name is rejected, let the search autocomplete the spelling for you.",
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
    howToPlay: [
      "Grab an opponent. Blue and Red alternate turns on the same device, Blue first.",
      "Pick a column and the game highlights where your piece would drop.",
      "Name a player fitting both the column attribute and the row attribute.",
      "A valid answer claims the cell. A rejection lets you try another name or cancel.",
      "Connect 4 of your color in any direction to win.",
    ],
    rules: [
      "The board is 7 columns by 6 rows.",
      "Each player name works once per game, for either side.",
      "You can skip a turn, and a full board with no winner is a draw.",
      "Answers are AI verified. Rejections do not pass your turn, and network errors never count against you.",
    ],
    example: [
      "The column says Played for Barcelona, the row says World Cup Winner, and the drop spot blocks Red's line. Ronaldinho verifies, and the threat dies.",
      "Red answers Brazilian plus Champions League Winner with Roberto Carlos to keep a diagonal alive. Every answer is also a tactical move, and knowing the name is only half the battle.",
    ],
    tips: [
      "Play the board first, trivia second. A brilliant answer in a useless column is wasted.",
      "Center columns touch the most lines of four, so spend your deepest knowledge there.",
      "Track burned names. Spending a do everything legend early starves your endgame.",
      "Skipping beats dropping a piece that sets up your opponent.",
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
    howToPlay: [
      "Pick a difficulty tier and optional timer; your first guess locks both for the day.",
      "Tap a cell to see its two requirements, like a club crossed with a nationality.",
      "Search a player and submit. Correct answers turn green with a rarity percentage.",
      "Budget carefully: 15 guesses for 9 cells, and every submission spends one.",
      "Finish, or run out of guesses or clock, then share the emoji board.",
    ],
    rules: [
      "15 guesses total, and correct answers consume guesses too, leaving room for 6 misses.",
      "Timers: Unlimited, 90, 60, or 40 seconds, starting on your first guess.",
      "Easy grids lean on clubs, leagues, and positions. Hard brings awards plus Champions League and World Cup winners.",
      "Rarity score is the average pick percentage across your correct cells. Lower is better.",
      "If the checker cannot verify an answer, you retry free with no guess burned.",
    ],
    example: [
      "Real Madrid crossed with France makes Karim Benzema the obvious green, at 44 percent. For Barcelona and Brazil you skip Neymar and submit Rivaldo: 6 percent, beautiful.",
      "The last corner wants a Champions League winner who played in Serie A. One miss, then Kaka clicks in: 9 for 9, rarity 19 percent.",
    ],
    tips: [
      "Spend rare picks on the easy cells. Rarity is won where everyone answers.",
      "Journeymen who hopped leagues and countries cover the weird crossings.",
      "On a timer, plan all nine cells before your first submission starts the clock.",
      "Overtime lets you keep filling leftover cells with no effect on your recorded score.",
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
    howToPlay: [
      "Type exact scores for the 6 matches in each group. Standings update live.",
      "Watch the colors: green rows are through, yellow marks a possible best third.",
      "Confirm your 8 third place qualifiers and generate the bracket.",
      "Pick winners from the round of 32 through the final, third place game included.",
      "Call the Golden Boot, Golden Glove, and Golden Ball, then share it all.",
      "Read your score at the bottom: every qualifier, knockout team, the champion and each award checked against the real results, out of 166 points.",
    ],
    rules: [
      "12 groups of 4 make 72 group matches, and score inputs go up to 9 goals a side.",
      "Standings use the real rules: 3 points a win, 1 a draw, then goal difference, then goals scored.",
      "32 teams advance: 12 winners, 12 runners up, and your 8 chosen thirds.",
      "By Rank auto fill uses real FIFA rankings: the higher ranked side wins 65 percent of sims, the underdog 20, and 15 percent draw.",
    ],
    example: [
      "In Group J you hand Argentina three routine wins, then pencil an Austria and Algeria draw that leaves third place hanging on goal difference.",
      "By the knockouts your France and Brazil picks collide in a semifinal, so somebody goes home early. You send Brazil through, save the bracket, and drop the link in the group chat.",
    ],
    tips: [
      "Fill groups you know by hand, and save the auto tools for matchups you have no read on.",
      "Third place picks quietly decide brackets. A soft third in the right slot gifts your favorite an easy round of 32.",
      "Draws are rarer than instinct says. The simulator prices them at 15 percent.",
      "Reset one group instead of wiping everything when you change your mind.",
    ],
    faqs: [
      {
        q: "Do I need an account?",
        a: "Not to build a bracket; it stores in your browser as you go. Signing in with email or Google is only for saving a bracket to a share link others can open.",
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
    howToPlay: [
      "Pick your club from all 96, grouped by league. The tile shows the squad value its strength comes from.",
      "Each matchday pairs the whole continent into 48 games. Before it plays, call your club's game. The card shows each side's win odds.",
      "Play the matchday. Winners annex everything the losers held, and the map redraws in one swing.",
      "Survive 10 matchdays. The top 8 empires by region make the playoffs, record breaking ties.",
      "Win the Quarter-finals, the Semi-finals and the Imperial Final to rule the map.",
    ],
    rules: [
      "10 regular matchdays, then an 8 club knockout bracket.",
      "154 regions: 96 club home areas plus the countryside between them, which opens in the hands of the nearest club of the same country.",
      "Scoring: 25 points per correct call, 3 per region held at the end, 200 for the crown, 50 for making the playoffs.",
      "Wiped out clubs keep playing, and one win takes back a whole empire.",
      "Level games go to penalties, so there are no draws, ever.",
      "Strength is the 2026 squad market value on record, mapped onto the same 55 to 95 band the other conquest maps use. The value is the sum of the players the table holds for that club, so every tile says how many that is, and a club with only a handful on record is rated on those few and says partial data.",
      "The Daily Challenge deals every player the same date seeded season: same opening map, same fixtures, same results. One scored run per day with streaks. Free Play is unlimited and fully random.",
    ],
    example: [
      "You ride Brentford. Matchday 1 pairs you with Bayern Munich, the odds sit under fifty, you call the upset anyway and it lands on penalties: Bavaria is yours.",
      "By matchday 6 you hold a strip from west London to the Alps, then lose the lot to Lecce in ninety minutes. Matchday 8 you take an empire back off Genoa, sneak in as the eighth seed, and the bracket gets interesting.",
    ],
    tips: [
      "Call games with the odds, not your heart. The percentages come from real squad values.",
      "Landless is one good night from owning a coastline. Do not panic when you get wiped.",
      "Check the standings late. Seeding goes by regions, so the last matchdays are about protecting your count.",
      "A big empire gets overextended and a landless club fights harder, so a giant on a losing run is beatable.",
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
    howToPlay: [
      "Create your player: name, one of 50 nationalities, one of 10 positions, and a starting era from the 1990s to the 2020s.",
      "Build your look in the appearance editor: 12 skin tones, 23 hairstyles, 16 hair colours, 14 beard styles, 16 accessories, 18 boot lines, and 19 signature celebrations, or hit Surprise me.",
      "Roll your starting potential, somewhere in the mid 50s to high 60s, and reroll as many times as you like. Rerolls are free and there is no limit on them.",
      "Open Customize your build to set your starting overall anywhere from 40 to 99, move points between the six attribute families, shape the specifics under each family, and set your height and weight.",
      "Begin in an academy matched to your nationality and talent. Pro contract offers arrive from age 17.",
      "Advance season by season through simulated stats, newspaper headlines, random events, and decisions.",
      "Work the transfer windows: stay, extend, request a move, or weigh rival offers and dream club pay cuts.",
      "Spend the money in 8 shop aisles: property, vehicles, investments, lifestyle, performance, flex, family, and a shady aisle that only appears once you have something to hide.",
      "Retire, on your terms or your body's, collect the legacy verdict, then carry on as a manager, pundit, or owner if you want.",
    ],
    rules: [
      "Stats grow slowly and honestly: 1 to 3 points a year through the academy and your prime, less once you pass 86, and barely at all above 90. Reaching world class is a decade of work, not three good seasons.",
      "Growth fades once your hidden prime type (early, normal, late, or extended) ends, with decline turning brutal from 38.",
      "The club that raised you always offers you a first team deal when you turn pro, so you can spend a whole career at your boyhood club, and it can call you home again from 27.",
      "Retirement is suggested from age 30 once you drop 10 off your peak or hit 75 overall, forced below 50 overall at 33 or older, and automatic at 45.",
      "The World Cup comes every 4 years. Top nations qualify about 90 percent of the time, while a small nation mostly needs a world class you.",
      "Legacy runs 0 to 100: 90 is GOAT, 80 LEGEND, 70 GREAT, 60 SOLID PRO, and less is JOURNEYMAN. The verdict also knows the overall you started at, so climbing from 54 to 91 scores better than being handed 91 on the creation screen.",
      "There is no cap on your starting overall, but a high start eats the room you had to grow into, and if you are already world class as a teenager you pick up far more injuries before you turn 24.",
      "Your ceiling is not welded shut. Two seasons in a row that are both elite and decorated, while you are already pressed against it, buy one point back at a time. 99 is the hard wall and nothing gets past it.",
      "Height and weight are real numbers, not decoration: a tall heavy player wins more in the air and is stronger, and is slower off the mark and less agile for it.",
      "Morale runs 0 to 100 and moves with events and choices, while scandals feed an integrity ledger worth minus 30 to plus 20 legacy points at the end.",
      "A statistically dominant season cannot be snubbed at the Ballon d'Or. Outscore the whole shortlist while winning a major and the trophy is yours, and any 45 goal or 55 goal involvement season finishes on the podium at worst.",
      "Corruption heat runs 0 to 100 and cools 8 a year when you stay clean. Past 70 the financial crimes unit can raid you, and past 90 comes a conviction, seized money, and a season in prison that wrecks your stats.",
      "Unexplained money keeps generating heat every season until you wash it through a shady business or declare it and eat the tax.",
    ],
    example: [
      "Take a Nigerian striker rolled at 63, a Gifted start. Two academy years push him past 70, and at 18 a bidding war breaks out. He takes minutes over money, bags 20 league goals, and the papers crown him the next superstar.",
      "At 22 a dream club calls with a pay cut, and he signs anyway. A league title lands in year two, then a torn hamstring eats half a season, and a moral dilemma offers a shady shortcut back to fitness. He refuses, banking integrity, while the rival the game spawned at his debut, a preening Brazilian winger, lifts the Ballon d'Or. The snub becomes fuel.",
      "The revenge arc peaks at 26: a Champions League, a World Cup semifinal carrying Nigeria, then the Ballon d'Or, where he thanks the rival from the stage. An extended prime runs to 36, the fortune buys his boyhood club, and he retires at 38 with a legacy of 84, LEGEND tier, one Champions League short of GOAT talk.",
    ],
    tips: [
      "Reroll your potential to 62 or better. The gap between a Promising start and a Gifted one echoes for a decade.",
      "There is no training menu. Growth follows your age curve, and you steer it through event choices, lifestyle purchases, and the social media detox, worth plus 2 to every stat next season.",
      "Money matters: a personal trainer adds a stat point per season, and the recovery clinic halves injury layoffs.",
      "The doping storyline boosts every stat but risks a 20 percent failed test each season it runs, and failing means a 1 season ban and a wrecked reputation.",
      "Your personality and your agent shape the whole run. The Showman grows followers 60 percent faster, The Professor earns brand trust, and super agent Zara Blackwood opens dream club doors for a 10 percent cut.",
      "Loyalty pays: a decade at one club is worth about as much legacy as two and a half league titles.",
    ],
    faqs: [
      {
        q: "How do I save my career?",
        a: "Automatically, in your browser, after every decision. There is one career per browser, and starting fresh permanently deletes the old save. An optional account (email or Google) adds site stats and leaderboards, but the career lives on your device.",
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
    howToPlay: [
      "Read today's criteria first. It shapes the whole draft.",
      "Draft snake style: 22 alternating picks, with a coin flip deciding who starts.",
      "Cover every position, goalkeeper included.",
      "At 11 apiece, hit Simulate Season for the story of each team's year.",
      "Read the strengths and weaknesses report, then vote for the winner.",
    ],
    rules: [
      "Both sides draft 11 players from one shared pool, so a taken player is gone for both.",
      "Rules come with exact numbers: Under 25s, a 1 billion pound squad cap, One Nation (max 3 per country), Bargain Hunt (60 million or less each), Wonderkids (outfielders 21 or under), or Galacticos (outfielders 80 million plus).",
      "Illegal picks are blocked with the reason shown, relaxing only when no legal option remains.",
      "Voting requires signing in, so nobody stuffs the ballot.",
    ],
    example: [
      "The rule is Under 25s, so your 27 year old superstar opener dies on contact: blocked. Round one becomes a wonderkid land grab, and the AI, which leans expensive, snaps up the priciest young forward on the board.",
      "You counter with a young keeper, because the AI leaves goalkeepers late. By pick 22 both rosters are packed with kids, and the vote breaks your way.",
    ],
    tips: [
      "Draft against the AI's taste: it chases market value, so grab the cheap positional glue it ignores.",
      "Under a budget cap, one megastar eats a third of your money. Spread it.",
      "Scarcity beats stardom mid draft. Two keepers left is a pick, not a luxury.",
      "The AI picks in about 2 seconds, so keep a shortlist ready for every position.",
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
    howToPlay: [
      "Check the start player, the target, and the optimal step count on the card.",
      "Type a player who was a club teammate of the start player. Real links join the chain with the shared club labeled.",
      "Keep connecting to the most recent name in your chain.",
      "Reach the target to win. If a new player also links to the target, the chain closes automatically.",
      "Stuck? Take the hint, or give up to see a full working path.",
      "Want it harder? Pick a special rule above the card: Active players only, or Europe only. The optimal on the card changes with the rule.",
    ],
    rules: [
      "A valid link is the same club in the same season, not the same club ever.",
      "Scoring starts at 1000 for the optimal path and drops 100 per extra step, with a floor of 0.",
      "Invalid names cost nothing. No attempt limit, no timer.",
      "One shared daily puzzle, plus unlimited practice puzzles.",
      "Active players only: every name in the chain, the start and the target included, has a 2026 season. Europe only: every club a link goes through is a European club. Each rule has its own optimal, worked out on the players that rule leaves in play.",
      "A special rule reaches the daily only when today's pair has a route under it; otherwise the daily plays the everyday rule and the rule waits for you in unlimited. The daily score still counts steps against the everyday optimal, so a rule is a harder road to the same finish line. Unlimited scores against the rule's own optimal.",
    ],
    example: [
      "Say it is Steven Gerrard to Lionel Messi, optimal in 2 steps. Gerrard played with Luis Suarez at Liverpool, and Suarez spent years beside Messi at Barcelona, so you type Suarez and the chain autocompletes for the full 1000.",
      "Wander through four or five names instead and you still win, just at 800 or 700. The share line shows your steps against the optimal.",
    ],
    tips: [
      "Think in well traveled hubs: serial movers like Zlatan Ibrahimovic connect whole leagues by themselves.",
      "Work backwards from the target too. Meeting in the middle beats a blind march.",
      "Match eras before clubs. A clever link fails if the careers never overlapped there.",
      "Wrong attempts are free, so test hunches instead of agonizing.",
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
        a: "Because the rule removed it. Under Active players only a teammate with no 2025-26 season on our career records is off the board, which catches every retired player and the few whose records here stop early, and under Europe only a season shared at a club outside Europe does not count as a link. The refusal says which rule got in the way.",
      },
    ],
  },

  '/squad-deal': {
    intro: [
      "Squad Deal crosses building an XI with a blind box gamble. Every position is a wall of mystery boxes, you claim one blind, and a banker keeps ringing with tempting named alternatives.",
      "You never quite know what you are holding until it is too late, which is the point. The finished squad gets simulated, graded, and logged on a leaderboard saved to your device.",
    ],
    howToPlay: [
      "Set up: Current Stars or All-Time Legends, an optional theme like Premier League only, one of 9 formations, and whether meme players can lurk in the boxes.",
      "Tap a position, face up to 10 hidden players, and keep one box sight unseen.",
      "Open the rest in short rounds. Between rounds the banker offers a named player: accept to fill the slot or keep opening.",
      "Refuse everything and you finish the slot from the last unopened boxes.",
      "After the XI, play the 5 extras, then simulate for your grade.",
    ],
    rules: [
      "Boxes are seeded stars to scrubs: on a full board of 10, a couple come from the top of the pool and a couple from the bottom.",
      "Offers strengthen in later rounds, roughly 1 in 4 is a sweetener near the best player left, and the banker never repeats an offer.",
      "Final rating: players 82 percent, chemistry 18 percent, plus extras. Chemistry counts shared clubs and nationalities.",
      "Grades: 84 and up is A+, 76 is A, 66 is B, 55 is C, below that D.",
    ],
    example: [
      "At striker you keep box 4. Two scrubs and a star flip out, the banker offers a solid mid 80s name, and you decline. Next round burns another elite option, and his follow up is weaker, because the field left in play got worse.",
      "You ride it to the end and out comes The Traffic Cone. Your all Premier League chemistry still drags the sim to a B, logged with formation and date.",
    ],
    tips: [
      "Judge the banker against what is left, not what is gone. His offer tracks the unopened average.",
      "Take early offers at thin positions like goalkeeper. Deep positions can afford greed.",
      "In Legends mode every box holds an all time great, so gambling to the last box is far safer.",
      "Meme mode is chaos on purpose: a few joke players are secretly elite, most are Sunday league.",
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
    howToPlay: [
      "Pick the daily market (the same season and the same cards for everyone today) or unlimited, where you choose the season the market opens in, 2015 to 2022, or let it roll one.",
      "Fill the XI position by position. Each slot deals four anonymous cards from the opening season, from an expensive bet to a cheap punt. Read the age, the matches and the output, then buy exactly one at its real price.",
      "The wallet always reserves enough for the remaining slots' punts, so a run can never strand you.",
      "After the eleventh buy, step through the seasons one at a time. Each step shows what every holding is worth that year against what it was, and says plainly when a player has no row for a year rather than making one up.",
      "At the end the reveal names all eleven, prices the portfolio at the latest season's real values, and scores the run.",
    ],
    rules: [
      "The wallet is 200M for the whole XI, and prices are real market values from the opening season.",
      "Cards come only from careers the data tracks through to the latest season, stated here on purpose: you are choosing among players whose story the table can finish, and a value can still crater.",
      "A slot's four cards always span the market: one from the top of that season's range, two from the middle, and a punt the wallet can always cover. They are dealt in a shuffled order, so the price band cannot be read off where a card sits.",
      "Scoring is the return on the whole 200M. What your eleven are worth at the end is placed between the worst and the best eleven that the same 200M could really have bought from the same cards, so 100 means you played the wallet perfectly and 0 means you could not have done worse with it.",
      "Money you never spend buys nothing. Sitting on the wallet is not a safe play, it is a low score, because the cash you kept could have been eleven careers instead.",
      "A season with no row for a player is shown as exactly that. Nothing is ever filled in between two real values.",
    ],
    example: [
      "The market opens in 2018, the striker slot. One card reads age 21, 34 matches, 14 goals, 6 assists, 24M. Another reads age 29, 41 matches, 22 goals, 5 assists, 60M. The kid costs less than half; you take the age and the rate.",
      "You step through 2019, 2020 and on, watching the 24M card climb past the 60M one, and the reveal says the kid became a superstar worth several times what you paid. The portfolio closes well over 200M and the score lands in the eighties.",
    ],
    tips: [
      "Age is the loudest number on the card. A 21 year old with real minutes is the market telling you where it is going; a 31 year old at 60M is a value with mostly one direction left.",
      "Read the rate, not the raw count. Ten goals in 20 matches beats fourteen in 40.",
      "Spend the wallet, but spend it on purpose. A 60M splash is ten cheap seats later, and eleven punts is a portfolio that barely moves. The reserve rule keeps you solvent either way.",
      "Keepers and defenders show few goals, so age and matches are their story.",
      "Yes, a fan might guess who the 130M card is. The game is won on the cheap seats, where age and the rate are the only edge you have.",
    ],
    faqs: [
      { q: "Are the numbers real?", a: "Yes, every price, stat and season value is a real row from the market value history the rest of the site runs on. Nothing is authored, and a season with no row says so." },
      { q: "Why can I never see the names while buying?", a: "That is the game. Knowing the name would be the answer; the format is investing on stats alone, and the reveal at the end names everyone." },
      { q: "Which seasons can the market open in?", a: "2015 to 2022. Earlier seasons do not carry enough players the data still tracks today to give real choice at every position, and a later start would be too short a story to roll through." },
      { q: "Can I go bankrupt mid draft?", a: "No. Every slot always deals a punt the wallet can cover, and the buy button reserves the future punts' prices before letting you splash." },
    ],
  },
  '/stadium-tycoon': {
    intro: [
      "Stadium Tycoon is an idle game about the part of football nobody streams: the turnstiles. You start with a fence, two benches and ninety loyal fans, and you grow that into a ground that hums, one upgrade at a time, while a live toy match plays out on screen and pays you for every goal.",
      "It is built to be alive. The crowd fills the stand seat by seat as your real attendance grows, money floats off everything that earns, goals throw confetti, and a win streak lights a flame that multiplies the lot. Leave the tab and the turnstiles keep spinning at half speed for up to eight hours.",
      "And it goes deep. Wins climb a ladder of ten divisions that multiply everything you earn, a payroll of eight staff earns around the clock, a golden whistle drifts in with five different prizes, and 47 badges each add a permanent two percent. Selling up resets the club but never the badges, so every run starts faster than the last.",
    ],
    howToPlay: [
      "Watch the money counter climb. Every fan in the ground pays you every second.",
      "Tap the stadium for instant cash. The Megaphone track makes every tap stronger.",
      "Buy upgrades from the nine tiles: Stands add seats, Ticket Office, Snack Bar and Club Shop raise what each fan spends, Parking pays flat money, Floodlights and Academy grow the fanbase, Squad wins matches, Megaphone boosts taps.",
      "Follow the match at the top of the pitch. Goals pay a bonus scaled by the crowd, wins extend your streak, and the streak multiplies income and pulls in new fans.",
      "Win at home to climb the divisions. Every win counts toward promotion, every division multiplies all income up to five and a half times, and each promotion pays a bonus on the spot. Higher divisions send tougher opponents.",
      "Hire from the payroll: eight staff from a Turnstile Steward to a Club Legend Ambassador, each level adding steady income of its own before the multipliers touch it.",
      "Catch the golden whistle when it drifts onto the pitch. You get about twelve seconds, and it carries one of five prizes, from everything paying seven times over to fifteen minutes of income in one lump.",
      "When lifetime earnings fill the yellow bar, sell up and move grounds: the club resets, but Reputation stars (plus 50 percent income each, forever), your badges and your club records all survive.",
    ],
    rules: [
      "Attendance is the smaller of your seats and your fanbase, so Stands matter only when the ground is full and spending tracks matter only when it is not.",
      "Matches run about two real minutes. Your Squad level drives your goal chance; opponents get harder with every match played, forever.",
      "A win extends the streak, a draw keeps it alive without extending it, a loss ends it. The streak multiplier caps at ten wins.",
      "Matchday Hype charges over eight minutes of play; pressing it doubles all money for sixty seconds. It never charges or burns while you are away, and it cannot stack.",
      "Divisions are earned at your current ground: promotion needs home wins, from six for the second division to two hundred for The Summit. Selling up drops you back to the bottom league, though your best division is remembered forever in Club records.",
      "The golden whistle appears only while you are actually playing, roughly every couple of minutes, and its timed prizes (DERBY DAY at seven times everything, CROWD SURGE at twenty five times taps) cannot stack with each other.",
      "Badges pay no cash. Each of the 47 is a permanent two percent income multiplier, earned exactly once per career, and they never reset.",
      "Away earnings run at half your unboosted income rate, with hype and golden whistles excluded, capped at eight hours, and only count after you have been gone at least thirty seconds.",
      "Progress saves on this device automatically. Selling up is permanent: only Reputation, badges, club records and your lifetime totals survive.",
    ],
    example: [
      "You open the game to 90 fans and about six dollars a second. The first Stands level costs 30 and adds 40 seats nobody fills yet, so you buy the Ticket Office instead and watch the rate tick up.",
      "Ten minutes in, Floodlights have pulled your fanbase past your 280 seats, the ground is full, and Stands become the best purchase on the board. Your striker puts one in, the crowd of 280 pays a 168 dollar goal bonus, the streak hits three, and the sixth home win lifts you out of the Muddy Meadows League with a promotion bonus and a bigger multiplier on every dollar after it.",
      "Around twenty minutes in, lifetime earnings crest four million and the yellow bar glows. You sell up, keep a star, and the ninety-fan fence starts again at one and a half times the speed.",
    ],
    tips: [
      "Balance seats against spend. A full ground with a poor Snack Bar wastes fans; a rich concourse with empty seats wastes upgrades.",
      "Squad is quietly the best economy track: goals pay crowd-scaled bonuses, the streak multiplier compounds everything else, and wins are what climb the division ladder.",
      "Do not sit on the sell-up button. The first star is worth more than a few minutes of squeezing the old ground, and the badges you earned come with you.",
      "Tap during big crowds. Taps scale with your income rate, so a tap at 400 fans is worth many times a tap at 90, and a CROWD SURGE whistle makes thirty seconds of tapping the whole show.",
      "Never let a golden whistle drift past. Even the smallest prize beats nothing, and DERBY DAY during a full house with a streak going is the best moment the game can deal you.",
      "Staff are the idle half of the build: upgrade tracks need you watching the board, but a deep payroll earns at full rate while you only tap.",
    ],
    faqs: [
      {
        q: "Do I lose everything when I sell up?",
        a: "Levels, money, fanbase, staff and your place on the division ladder reset. Reputation stars, all 47 badges, club records and lifetime totals stay. Each star is a permanent 50 percent income boost and each badge a permanent two percent, so runs get faster every time.",
      },
      {
        q: "What is the golden whistle?",
        a: "A catchable bonus that drifts onto the pitch every couple of minutes while you play. Catch it inside about twelve seconds for one of five prizes: DERBY DAY (everything pays seven times over for 77 seconds), CROWD SURGE (taps pay 25 times for 30 seconds), TV WINDFALL (fifteen minutes of income at once), WONDERGOAL GOES VIRAL (a fanbase jump) or SPONSOR GIFT (a free upgrade level).",
      },
      {
        q: "Does it earn while the tab is closed?",
        a: "Yes, at half rate for up to eight hours, paid out the next time you open the game on the same device.",
      },
      {
        q: "Can the opponents be beaten forever?",
        a: "They scale without end, so eventually a run stops winning every match. That is the signal the current ground has peaked and the sell-up bar is the way forward.",
      },
      {
        q: "Is anything in it real players or clubs?",
        a: "No. Stadium Tycoon is entirely our own toy world, which is exactly why the crowd can throw confetti at whatever it likes.",
      },
    ],
  },

  '/wonderkid-factory': {
    intro: [
      'Wonderkid Factory is a free idle football academy game. Scouts bring kids through the door, coaches make every one of them a little better every second, and each kid has a ceiling he will never grow past. The whole game is one repeated decision: sell him now, or let him cook a bit longer.',
      'A transfer fee pays for the rating on the day plus a promise premium for the room he still has to grow, and that premium is fattest while he is young. From 21 it starts to fade, at 23 it is gone completely, and on his 24th birthday he walks out on a free and pays you nothing. Patience prints money right up until it does not.',
      'Cash buys four upgrades, reputation stars make every future run faster, and six regions raise the ceilings your scouts can find, from District Fields all the way to the World Stage. Every kid is generated, so no real footballer ever appears in your academy.',
    ],
    howToPlay: [
      'Wait for the scouts: kids arrive on their own, faster with every Scouting network level.',
      'Watch each kid grow toward his hidden ceiling. Scouting level 3 reads the ceiling as a range, level 6 reads it exactly.',
      'Press Sell on a kid when the price looks right. The fee is quoted live on his card.',
      'Spend the cash on Scouting, Coaching, Dorms and the Agent office. Costs climb with every level.',
      'Press Showcase Day when it charges: training runs x3 for 25 seconds.',
      'Hold your best kids for Deadline Day, which arrives every few minutes and pays x1.5 on every fee for 50 seconds.',
      'Earn the region target, then move the academy up in the Reputation box: kids, cash and facilities stay behind, the star is forever.',
    ],
    rules: [
      'Every kid has a fixed hidden ceiling. Training slows as he approaches it and can never pass it.',
      'The promise premium fades from age 21 and is gone at 23. At 24 a kid leaves on a free.',
      'A full academy stops scouting: beds come from the Dorms.',
      'Reputation stars pay +15% training speed and +10% on every fee, each, forever.',
      'Each region raises the ceilings scouts can find. The World Stage can produce a 99.',
      'Away from the game, scouting and training run at half speed for up to 8 hours, and nobody ages while you are gone. Nothing sells itself either.',
      'Progress saves on this device. No sign-up.',
    ],
    example: [
      'Say the scouts drop off a 17 year old midfielder rated 58, and your level 3 scouts read his ceiling as somewhere between 68 and 75. Selling on the spot pays a modest fee: decent rating, healthy promise premium.',
      'You leave him with the coaches while you upgrade the Agent office. By the time he is 19 he is rated 71 and the growth has visibly slowed, which tells you the ceiling is close. His card now quotes roughly triple the day one fee.',
      'Deadline Day lights up. You press Sell inside the window and the fee pays half as much again. That one sale funds two Scouting levels, and the next kid through the door is found faster and read more precisely.',
    ],
    tips: [
      'Early on, sell quickly and often: volume beats patience until Coaching has some levels.',
      'Scouting level 3 changes the game. Knowing the ceiling range tells you who is worth the wait.',
      'A kid within a point of his ceiling has stopped earning you anything by waiting. Sell him on the next Deadline Day.',
      'Dorms are quietly the best value when your academy keeps sitting full: a stopped scout earns nothing.',
      'Do not move up the moment the target clears. One more big sale first travels with you as a head start toward the NEXT star, because career earnings never reset.',
    ],
    faqs: [
      { q: 'Are the players real?', a: 'No. Every kid is generated, names and all, and the game checks its generated names against every real player on the site so a made up kid can never wear a real name.' },
      { q: 'What do reputation stars do?', a: 'Each star is +15% training speed and +10% on every fee, forever, and stars also unlock the next region, where scouts find kids with higher ceilings.' },
      { q: 'Do I lose everything when I move up?', a: 'Cash, facility levels and the kids in the academy stay behind. Stars, your career totals and your best sale record travel with you.' },
      { q: 'Does the game progress while I am away?', a: 'Scouting and training keep running at half speed for up to 8 hours, and the calendar pauses so nobody ages out while you sleep. Sales are always yours to make, so no money moves while you are gone.' },
      { q: 'When exactly should I sell?', a: 'The fee peaks somewhere between rating growth and age decay. A young kid far from his ceiling gains value fast; past 21 the promise premium drains away, and at 24 he leaves for nothing.' },
    ],
  },
  '/search-and-discard': {
    intro: [
      "Search and Discard is the squad building duel: two managers, one shared pool of real footballers, both filling the same 4-3-3. On your turn you search three players, keep exactly one, and the other two are discarded from the whole game.",
      "That discard is the heart of it. A striker you bin can never reach the other squad, so every search is two decisions at once: who makes your XI, and who you refuse to let make theirs.",
      "When both XIs are full, the arguing stops and a simulated 38 game season settles it, derbies included. Play the CPU or pass one screen between two people.",
    ],
    howToPlay: [
      "Pick your opponent: the CPU, or a second person on the same screen.",
      "On your turn, three real players appear. At least one always fits an open slot in your 4-3-3.",
      "Tap the one you keep, then tap the slot he plays. The other two are binned for good, for both squads.",
      "Eleven keeps each, alternating turns. Then both XIs play the same simulated season and the table decides.",
    ],
    rules: [
      "Both managers build the identical 4-3-3 from one shared pool, real players and real market values throughout.",
      "Position rules use the sitewide families: wingers cover both flanks, central mids cover the holding and attacking slots, a keeper is only ever a keeper.",
      "A discarded player is out of the entire game. He cannot be searched again by either side.",
      "The settle is deterministic: the same two finished XIs always produce the same season, so the draft is the game.",
      "Season scoring: 36 league games against a spread of opposition plus two head to head derbies, 3 points a win, 1 a draw. Your season score is your points as a share of the 114 available.",
    ],
    example: [
      "Your search deals an 89 rated winger, an 84 keeper and a 76 full back, with your goalkeeper slot still open. Keeping the winger is tempting, but keepers are scarce in a shrinking pool, so you take the 84 and bin the other two, and the 89 winger is gone from the duel entirely.",
      "Ten turns later both squads stand at 11. Yours rates 82, theirs 80, the derbies split, and your side edges the season by four points.",
    ],
    tips: [
      "Guard the scarce slots. Keepers and centre backs dry up fastest in a shared pool; a late empty GK slot is a disaster.",
      "Bin with intent. When your slots are nearly full, the keep matters less than which star you deny the other side.",
      "Ratings follow real market value with an age correction, so a famous veteran is often worth more than his price tag suggests.",
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
    howToPlay: [
      "Aim with the arrow keys, or drag the pitch with a finger or the mouse.",
      "Q and E bend the flight. The slower you hit it, the more it bends.",
      "Hold space, or hold the strike button, to charge. The power bar sweeps up and down and you get the number you let go on.",
      "Ten kicks a run, each one further out than the last, with more defenders in the wall and a better keeper.",
    ],
    rules: [
      "Power beats the keeper but costs accuracy, and the cost grows faster than the power does, so a full blooded strike misses far more than it scores.",
      "The wall only blocks what stays low. Lift it and the wall is irrelevant, but the keeper is not.",
      "Goals pay by distance, by the size of the wall you beat and by how close to the corner you finished. A tap into the middle pays least.",
      "The daily deals the same ten kicks to everyone and keeps your score for the day. Unlimited deals fresh ones for ever.",
    ],
    example: [
      "Kick one is a penalty with nobody in the wall. The temptation is to smash it; the points are in rolling it into a corner where the keeper is not.",
      "Kick seven is twenty metres out with four in the wall and the keeper leaning right. Lift it over the wall, bend it back toward the left post, and take about two thirds power so the bend still has time to work.",
    ],
    tips: [
      "Watch the keeper before you strike. He is already leaning, and the far side is the side he left you.",
      "Two thirds power is usually the best trade: enough to reach from distance, slow enough to bend and straight enough to land where you aimed.",
      "Height beats the wall, width beats the keeper. From distance with a big wall you need both, which is why those kicks pay the most.",
    ],
    faqs: [
      { q: 'Is the daily the same for everyone?', a: 'Yes. The ten kicks come from the date, so every player gets the same run, and your score is kept for the day.' },
      { q: 'Do I need a keyboard?', a: 'No. Drag the pitch to aim and let go to strike, which works the same on a phone.' },
      { q: 'Why did my perfect corner go wide?', a: 'Because of how hard you hit it. Power sprays the ball off the spot you picked, and near the post there is no room to spray into.' },
    ],
  },
};
