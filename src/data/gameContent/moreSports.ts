import type { GameContentMap } from './types';

// F1, tennis, golf, NASCAR and combat sports game guides. Casual human tone, no em dashes anywhere.
export const MORE_SPORTS_CONTENT: GameContentMap = {
  '/f1-driver': {
    intro: [
      "Somewhere in Formula 1 history sits a driver, and the game knows exactly who. Guess The F1 Driver hides one of 20 grand prix greats behind six clues that unlock one at a time.",
      "The first clue is a single word, a vibe. The rest get concrete: race wins, world titles, teams, nationality, and one famous career moment. Solve it on clue one for 1000 points; limp to clue six and you're playing for 100.",
    ],
    howToPlay: [
      "Choose Daily Challenge for the shared mystery driver, or Unlimited for random drivers on repeat.",
      "Read the one-word vibe and see if a name jumps out.",
      "Search and pick a driver to guess. A surname or a HAM style shorthand resolves to the right person.",
      "Every wrong guess reveals the next clue, so a miss always buys information.",
      "The hint button unlocks the next clue without risking a guess, though it lowers your score tier just like a miss.",
    ],
    rules: [
      "Six clues per driver, and the answer pool holds 20 drivers.",
      "Scoring by clue: 1000, 800, 600, 400, 200, then 100 points.",
      "A wrong guess while the sixth clue is showing ends the game, so six misses is the cap.",
      "Giving up reveals the driver and scores 0. The daily driver changes every day.",
    ],
    example: [
      "Imagine the vibe word is Dominant. That fits a handful of drivers, so you take a swing at Michael Schumacher. Wrong, and the next clue slides out: 105 race wins, the all-time record.",
      "Only one driver owns that number. You type Lewis Hamilton on clue two and bank 800 points.",
      "Waiting for the championship clue to confirm the seven titles would have paid 600. Confidence is worth 200 points here.",
    ],
    tips: [
      "The autocomplete list only contains drivers who can actually be the answer, so browsing it is a legitimate move.",
      "Hints never end your game, but wrong guesses can. Once all six clues are out, guess like it's match point.",
      "Unlimited recycles the same pool, so a few practice runs teach you every possible answer.",
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
        a: "No. Signing in with email or Google is optional and only matters for saved stats and leaderboards.",
      },
    ],
  },

  '/f1-higher-lower': {
    intro: [
      "Two drivers, one question: who won more Grands Prix? Simple, until the pairings leave the obvious names behind.",
      "The pool is every driver in F1 history with at least 8 career wins, 42 of them, from the 1950s through 2025. Points systems changed too much across eras to compare fairly, so the game runs on race wins, a stat that travels.",
    ],
    howToPlay: [
      "Pick Daily for today's shared matchups or Unlimited for endless random pairs.",
      "Read both cards: each shows the seasons raced, title count, and teams.",
      "Tap the driver you think won more Grands Prix.",
      "The real totals flash up, then the next pair rolls in after a couple of seconds.",
      "String correct answers together to grow the streak bonus.",
    ],
    rules: [
      "10 rounds per game, 10 points per correct answer.",
      "Streaks pay rising bonuses: the second straight correct adds 5 points, the third adds 10, and so on. A perfect 10 for 10 run maxes out at 325.",
      "Exact ties count as correct no matter which driver you picked.",
      "Hard mode, Unlimited only, deliberately pairs drivers with close win totals.",
      "The daily is the same 10 matchups for everyone and flips at midnight Eastern.",
    ],
    example: [
      "Say round one hands you Alain Prost against Ayrton Senna. Titles say 4 against 3, and the wins agree: Prost 51, Senna 41.",
      "Round five is nastier: Juan Manuel Fangio, five-time champion, against David Coulthard, zero titles. But 1950s seasons were short. Fangio sits on 24 wins, Coulthard on 13, so the legend still cashes.",
      "You close 8 of 10 with a six-round streak in the middle and post 155. The streak did the heavy lifting.",
    ],
    tips: [
      "Titles lie. Stirling Moss won 16 races and no championship, while Fangio turned 24 wins into 5 titles.",
      "Watch the seasons on the card. Long modern careers usually mean big win counts.",
      "When two drivers feel identical, relax: a dead heat pays either way.",
      "Use Hard mode as a study tool. Small gaps teach you the actual numbers fast.",
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
    howToPlay: [
      "Pick Daily Challenge for the shared team of the day or Unlimited for random constructors.",
      "Start from the vibe word and guess whenever a team feels right.",
      "Each wrong guess unlocks the next clue in the sequence.",
      "Take a hint to see the next clue without risking a miss; the score tier drops just the same.",
      "Name the constructor before the six clues run out.",
    ],
    rules: [
      "The pool holds 31 constructors and each puzzle has 6 clues.",
      "Points by clue: 1000, 800, 600, 400, 200, 100.",
      "A wrong guess with all six clues showing ends the round. Giving up scores 0.",
      "The daily constructor is picked independently of the daily driver, so the two F1 games never mirror each other.",
    ],
    example: [
      "Suppose clue one reads Iconic. Half the grid thinks that's them, so you wait. Clue two says Italy, and now it's a short list.",
      "Iconic plus Italy has one obvious owner. Ferrari on clue two banks 800 points.",
      "Holding out for the championship clue, a count of 16 titles, would have confirmed it at 600. Some clues are worth skipping.",
    ],
    tips: [
      "Country is the power clue, but Britain won't save you: McLaren, Williams, Lotus and more are all UK based.",
      "Learn the championship counts of the giants. Numbers like 16 and 9 are fingerprints.",
      "The livery clue almost always gives it away. If you have any read at all, guess before it appears.",
      "Defunct teams are in here too, so don't anchor on the current grid.",
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
    howToPlay: [
      "Check which of the five slots carry constraints: a team, era, or country tag.",
      "Tap a slot and search. The picker only lists eligible drivers, highest rated first.",
      "Chase links while you pick: drivers sharing a team, country, or era boost chemistry.",
      "Clear and swap picks freely, then hit Simulate once all five seats are filled.",
      "Share the result, or roll new constraints with New Lineup.",
    ],
    rules: [
      "Five slots, 3 of them constrained. Every constraint is guaranteed at least 4 eligible drivers.",
      "Squad rating is 80 percent average driver rating plus 20 percent chemistry.",
      "Grades: A+ at a rating of 92 or better, A at 84, B at 74, C at 62, D below.",
      "Daily mode gives everyone the same constraints once a day; New Lineup rolls random ones anytime.",
    ],
    example: [
      "Say your constraints are Ferrari, Finland and the 1990s. You go star hunting: Michael Schumacher, Kimi Raikkonen, Ayrton Senna, then Lewis Hamilton and Max Verstappen in the free seats. Average rating: just over 97.",
      "The sim returns a B. Five all-time greats, almost no connections: only the Schumacher and Raikkonen overlap registers, and chemistry lands at 27.",
      "Swap Senna for Mika Hakkinen and it flips: two Finns, two Ferrari drivers, a shared era. Chemistry 40, rating 85, grade A. Lesser name, better team.",
    ],
    tips: [
      "Ratings are 80 percent of the formula, so never tank quality for one link. Find picks that do both jobs.",
      "Fill the constrained slots first, then patch chemistry with the free seats.",
      "Era overlaps are the cheapest links: same-decade drivers connect even when teams and countries don't.",
      "In daily mode, Edit Lineup lets you rebuild and simulate again.",
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
    howToPlay: [
      "Choose the daily puzzle, shared by everyone that day, or Unlimited for random legends.",
      "Read the vibe word and take an early swing if you're feeling brave.",
      "Each wrong guess reveals the next clue in the sequence.",
      "The hint button unlocks the next clue without spending a guess; the score tier drops either way.",
      "Type the player's name and pick from the suggestions to lock it in.",
    ],
    rules: [
      "6 clues maximum, with scoring tiers of 1000, 800, 600, 400, 200 and 100 points.",
      "A wrong guess while the sixth clue is showing ends the game.",
      "Giving up ends the round at 0 and reveals the player.",
      "Common names work: the game accepts well known short versions of a name.",
    ],
    example: [
      "Suppose clue two describes an American who ruled across the 2000s and 2010s. Too many candidates, so you pass. Clue three says WTA, and clue four lands the hammer: 23 Grand Slam singles titles.",
      "Only one player in history owns exactly 23. You type Serena Williams on clue four and take 400 points.",
      "A sharper read on the era hint might have gotten you there a clue earlier for 600. That's the game inside the game.",
    ],
    tips: [
      "The tour clue instantly halves the field. Torn between a man and a woman? Wait for it.",
      "Slam counts are fingerprints at the top: 24, 23, 22 and 20 each point at one or two legends.",
      "The suggestion list doubles as a roster of possible answers. Skim it when you're lost.",
      "Early clues reward era knowledge. Knowing who peaked when beats knowing forehands.",
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
    howToPlay: [
      "Pick Daily Challenge, where everyone starts from the same player, or Unlimited for a random starter.",
      "Think of anyone who beat the current player at a major.",
      "Search the name and submit. The game verifies the matchup before the link counts.",
      "Each verified defeat adds the winner to your chain, and they become the new current player.",
      "Keep going until you miss, repeat a player, or cash out with Give Up.",
    ],
    rules: [
      "Every verified link is worth 100 points.",
      "Your total is multiplied by 1.5 once the chain reaches 5 links and by 2 at 10.",
      "Naming a player already used in the chain ends the run, and so does one wrong answer.",
      "Badges land at 3 links (Club Player), 5 (Pro Circuit) and 10 (Grand Slam Champion).",
      "If the checker hits a connection problem, nothing is lost; just retry.",
    ],
    example: [
      "Say you start on Roger Federer. Rafael Nadal beat him at Roland Garros more than once: link one. Nadal to Novak Djokovic is just as easy. Link two.",
      "From Djokovic you remember Stan Wawrinka's 2015 French Open final win. Link three, 300 points, and the Club Player badge is yours.",
      "Then you blank on who ever beat Wawrinka at a slam, toss out a name you can't back up, and the run ends at 300.",
    ],
    tips: [
      "Think finals first. Title matches are the defeats everyone remembers.",
      "Don't chain into a player whose losses you can't picture. You have to escape everyone you name.",
      "Save the big hubs, players with famous losses across eras, for when you're stuck.",
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
    howToPlay: [
      "Choose Daily for the shared matchups or Unlimited for random ones.",
      "Read both cards: each shows the years of the player's first and last major and their tour.",
      "Tap the player you think won more Grand Slam singles titles.",
      "Watch the real numbers reveal, then roll into the next round.",
      "Chain correct answers to build the streak bonus.",
    ],
    rules: [
      "10 rounds, 10 points per correct pick.",
      "Streaks add 5 extra points on the second straight correct answer, 10 on the third, and so on. A flawless game is worth 325.",
      "Ties are common with slam counts and score as correct for either pick.",
      "Hard mode, Unlimited only, serves up deliberately close matchups.",
      "The daily flips at midnight Eastern and your progress holds for the day.",
    ],
    example: [
      "Round one: Serena Williams against Roger Federer. Two icons, one number each, 23 against 20. Serena takes it.",
      "Later you draw Chris Evert against Martina Navratilova and freeze. Then you remember it doesn't matter: both won 18, and a tie pays either way.",
      "You finish 9 of 10 with one bad miss on an old-timer, a reminder that the early greats in this pool won a lot.",
    ],
    tips: [
      "Learn the tie clusters: 24, 22, 18 and 8 all have multiple owners.",
      "Respect the ancients. Margaret Court's 24 and Helen Wills' 19 outrank almost everyone modern.",
      "The year range on the card is your era anchor. A long title window usually means a big count.",
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
    howToPlay: [
      "Pick Daily, the same golfer for everyone, or Unlimited for a fresh champion every round.",
      "Study the opening clue: the span between their first and last major win.",
      "Type at least two letters to see name suggestions, then tap one to guess.",
      "Every miss unlocks the next clue in the sequence.",
      "Solve it before your sixth wrong guess or the round ends.",
    ],
    rules: [
      "Six wrong guesses end the round.",
      "Score starts at 600 for a first-clue solve and drops 100 per extra clue, bottoming out at 100.",
      "Answers come from a famous 55-golfer slice: champions with 4 or more majors from any era, plus anyone who won a major in 1980 or later.",
      "The search list is wider, covering all 61 men's champions with at least 2 career majors.",
      "The daily golfer resets at midnight Eastern, and your progress is saved for the day.",
    ],
    example: [
      "Say the first clue reads: won majors between 1959 and 1978. That's a long reign, so you gamble on Arnold Palmer. Miss; his wins sit between 1958 and 1964.",
      "Clue two says South Africa, and the long window suddenly makes sense. Gary Player, nine majors across two decades. You take 500 points on clue two.",
      "Calling the era cold would have been a 600-point flex, but 500 with certainty beats 0 with style.",
    ],
    tips: [
      "Memorize the marquee year spans: 1962 to 1986 is Nicklaus, 1997 to 2019 is Tiger.",
      "Any nationality that isn't United States slices the pool down to a handful of names.",
      "Wrong guesses are your only currency, so spend them on real hypotheses, not shrugs.",
      "If you're still alive at the initials clue, the answer is basically gift wrapped. Never lose from there.",
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
    howToPlay: [
      "Choose Daily for the shared matchups or Unlimited for random pairs.",
      "Each card shows the golfer's country and the years of their first and last major win.",
      "Tap the golfer you believe won more majors.",
      "The real counts reveal, points land, and the next pair appears.",
      "Stack correct answers for streak bonuses.",
    ],
    rules: [
      "10 rounds, 10 points per correct answer, plus a streak bonus growing by 5 with each straight correct after the first. A perfect game is 325.",
      "Exact ties score as correct on either side.",
      "Hard mode lives in Unlimited only and pairs golfers with close major counts.",
      "New daily matchups arrive at midnight Eastern.",
    ],
    example: [
      "Round one gives you Jack Nicklaus against Tiger Woods, the two biggest names in the sport, and the counts land 18 to 15 for Jack.",
      "Later it's Walter Hagen against Phil Mickelson. Recency pulls you toward Phil, but Hagen's 11 majors dwarf Phil's 6. That's the trap this game sets over and over.",
      "You stop trusting instinct, start trusting eras, and grind out 7 of 10.",
    ],
    tips: [
      "Memorize the podium: Nicklaus 18, Woods 15, Hagen 11.",
      "Early century champions stack majors quietly. When in doubt between eras, old often beats modern.",
      "The two-major club is crowded and coin-flip rounds happen. Use the win years on the card to spot the bigger legend.",
      "Ties pay both ways, so identical-feeling pairs are free points, not landmines.",
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
    howToPlay: [
      "Choose Daily for the shared matchups or Unlimited for random pairs.",
      "Each card shows the player's clubs and the years of their career.",
      "Tap the player you believe kicked more career goals.",
      "The real counts reveal, points land, and the next pair appears.",
      "Stack correct answers for streak bonuses.",
    ],
    rules: [
      "10 rounds, 10 points per correct answer, plus a streak bonus growing by 5 with each straight correct after the first. A perfect game is 325.",
      "Exact ties score as correct on either side, and this pool has real ones: Wayne Carey and Peter Hudson both finished on 727.",
      "Hard mode lives in Unlimited only and pairs players with close goal counts.",
      "New daily matchups arrive at midnight Eastern.",
    ],
    example: [
      "Round one gives you Tony Lockett against Matthew Lloyd, and the counts land 1,360 to 926 for Plugger, the only man in history past 1,300.",
      "Later it's Gordon Coventry against Jack Riewoldt. Recency pulls you toward Jack, but Coventry kicked 1,299 before World War Two. That's the trap this game sets over and over.",
      "You stop trusting recency, start trusting eras, and grind out 7 of 10.",
    ],
    tips: [
      "Memorize the podium: Lockett 1,360, Coventry 1,299, Dunstall 1,254.",
      "Only five men have ever kicked 1,000: those three plus Doug Wade and Gary Ablett Sr, with Buddy Franklin's 1,066 among them.",
      "Full forwards from the high scoring 80s stack huge numbers. A key forward from the 2010s on the same games usually sits lower.",
      "Ties pay both ways, so identical-feeling pairs are free points, not landmines.",
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
    howToPlay: [
      "Pick Daily Challenge to chase the same driver as everyone else, or Unlimited to keep the puzzles coming.",
      "Read the era clue first and guess whenever conviction strikes.",
      "Every wrong guess reveals the next clue automatically.",
      "Hints unlock the next clue without spending a guess, though the score tier drops the same either way.",
      "Pick a name from the suggestion list to submit your guess.",
    ],
    rules: [
      "6 clues per driver, scored 1000, 800, 600, 400, 200 and 100 by the clue you solve on.",
      "A wrong guess while clue six is showing ends the round.",
      "Give Up reveals the driver and scores 0.",
      "Daily and Unlimited both pull from the same 59 driver pool.",
      "Every clue is a fact from a real race result or a real championship season. Nothing about a driver is invented, and where our race records are thin the clue says \"on record\" instead of claiming a career total.",
    ],
    example: [
      "Clue one says the driver has race wins on record between 1970 and 1984, so you are in the sport's second golden era and you hold your fire.",
      "Clue two says seven Cup Series championships. Only three drivers in history have seven, and one of them raced far later, so you are down to two.",
      "Clue three says a title year came driving a Plymouth, which settles it: Richard Petty, guessed on clue three for 600 points. The 1973 Daytona 500 was waiting in clue four, and you didn't need it.",
    ],
    tips: [
      "Championship counts cluster at the top, so seven titles narrows it to a very short list before you have seen a single race.",
      "The era clue splits the generations cleanly. Use it to rule out most of the field before the race names arrive.",
      "The manufacturer in a title year dates a driver closely: Plymouth and Oldsmobile belong to one era, Toyota to another.",
      "The named races are the giveaway. If you know who won a particular Daytona 500 or Southern 500, the round is over on that clue.",
      "If a name is stuck on the tip of your tongue, scroll the suggestion list; seeing it usually unlocks it.",
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
    howToPlay: [
      "Choose Daily Challenge, same starting driver for everyone, or Unlimited for a random start.",
      "Think of a champion who won the Cup while your current driver was chasing it.",
      "Search the name; the game verifies the connection before it counts.",
      "Each verified answer joins the chain and becomes your new current driver.",
      "Run it as far as you can, then save your score with a nickname to hit the top 10 board.",
    ],
    rules: [
      "Each verified link is worth 100 points, with your total multiplied by 1.5 at a chain of 5 and by 2 at 10.",
      "Repeating a driver already in the chain ends the run instantly, and so does a wrong answer.",
      "Badges: Pit Crew at 3 links, Cup Contender at 5, NASCAR Legend at 10.",
      "Connection problems never kill a run; unverified answers just ask for a retry.",
    ],
    example: [
      "Suppose you start on Dale Earnhardt Jr., a superstar who never lifted the Cup. Plenty of drivers beat him to titles, so you open with Jimmie Johnson. Verified, link one.",
      "From Johnson you name Kyle Busch, the 2015 champion. Link two. From Busch you go Joey Logano, the 2018 title. Link three, 300 points, Pit Crew badge.",
      "Then you blank on the older eras, gamble, and it's over at 300. Steer toward seasons you actually remember.",
    ],
    tips: [
      "Anchor on seasons. Picture the champion celebrating and who finished behind them.",
      "The playoff era is fresh memory for most fans, so steer chains toward the 2000s and 2010s.",
      "Every driver is single use, so don't spend an obvious champion early if a rarer name also works.",
      "No clock runs, so place the season before you type.",
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

  '/ufc': {
    intro: [
      "You get eight guesses to name a mystery UFC fighter, and every guess talks back. Each attempt lights up a row of stats showing exactly how close you landed.",
      "Green means you matched the mystery fighter's stat, yellow means close, red means off target, and little arrows tell you whether the real number sits higher or lower. It's deduction, not luck.",
    ],
    howToPlay: [
      "Pick Daily for the fighter everyone is chasing today, or Unlimited for a random one each game.",
      "Search any fighter and submit them as your opening probe.",
      "Read the row: years active, weight class, nationality, age, wins, losses, draws, knockouts, submissions and peak pound for pound rank.",
      "Follow the arrows on numeric stats to aim your next guess higher or lower.",
      "Close the net within 8 guesses, or use Give Up to see the answer.",
    ],
    rules: [
      "8 guesses maximum, in both Daily and Unlimited.",
      "Yellow means close: one weight class off, same continent, within 2 years on age or career length, 3 wins, 2 losses, 1 draw, 3 knockouts, 2 submissions, or 2 pound for pound spots.",
      "Daily progress is saved through the day and a new fighter arrives at midnight Eastern.",
      "The pool spans all nine weight divisions, strawweight to heavyweight, women's stars included.",
    ],
    example: [
      "Suppose the mystery fighter is Khabib Nurmagomedov and you open with Conor McGregor. Weight class comes back green at lightweight, age and career length green, nationality yellow for the right continent, and the record cells glow red with arrows demanding more wins, fewer losses and more submissions.",
      "So you're hunting a European lightweight from McGregor's era with a spotless record and a pile of submissions.",
      "An undefeated Russian grappler fits every cell. Khabib in two guesses.",
    ],
    tips: [
      "Open with a fighter you know inside out so you can interpret every cell.",
      "The weight class arrow is the fastest filter in the game; two guesses can pin the division.",
      "A red loss cell pointing down toward zero screams elite champion.",
    ],
    faqs: [
      {
        q: "What does the pound for pound column compare?",
        a: "Each fighter's highest career pound for pound ranking. Within 2 spots shows yellow, and the arrow points toward the mystery fighter's rank.",
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
    howToPlay: [
      "Pick a mode: Daily (same start for everyone), Unlimited, Weight Class (one division only), or Hall of Fame (legends only).",
      "Recall who has actually beaten your current fighter.",
      "Submit a name. A verified defeat adds the winner to your chain and hands them the spotlight.",
      "Repeat until you miss, reuse a fighter, or bank your score with Give Up.",
      "Save your run with a nickname to enter the top 10 leaderboard.",
    ],
    rules: [
      "Each correct link scores 100 points, plus a 50 point bonus when the win came in a championship fight.",
      "The total multiplies by 1.5 at a chain of 5 and by 2 at 10.",
      "A wrong answer ends the run and reveals a fighter who would have worked.",
      "Weight Class mode offers 8 divisions, flyweight through heavyweight.",
      "Badges: On A Roll at 3 links, Contender at 5, Champion at 10, GOAT at 15.",
    ],
    example: [
      "Say you start on Conor McGregor. Dustin Poirier stopped him in 2021, so that's a clean first link: 100 points.",
      "Who beat Poirier? Khabib Nurmagomedov submitted him in a title fight, and championship wins pay extra: 150 more for 250 total.",
      "Now the problem: Khabib retired undefeated, so nobody in the book has beaten him. You cash out at 250. Chaining into an unbeaten legend is a beautiful dead end.",
    ],
    tips: [
      "Title fight wins pay 50 extra, so prefer the championship answer when you have options.",
      "Watch for undefeated walls. A fighter with zero losses ends your chain on the spot.",
      "Fighters are single use per run; don't burn a well connected name early.",
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
