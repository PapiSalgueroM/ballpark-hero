import type { GameContentMap } from './types';

// World, Olympic and game-show style guides. Casual human tone, no em dashes anywhere.
export const WORLD_CONTENT: GameContentMap = {
  '/rank-em': {
    intro: [
      "One stat, five players, one shot at the right order. Rank 'Em names a career stat, gives you five greats who sit near the top of it, and asks you to place them most to fewest.",
      "Every round is built from verified career totals in the site's database, with no ties anywhere. The order is the order.",
      "There's a daily ranking everyone shares, plus an unlimited mode.",
    ],
    howToPlay: [
      "Check the header for the sport and the stat, like NBA career assists or MLB career home runs.",
      "Tap the five names in order, starting with the player you think has the most.",
      "Changed your mind? Hit Undo last any time before your fifth pick.",
      "Your ranking submits automatically the moment the fifth player lands.",
      "The reveal shows the true order with each player's real career number beside it.",
    ],
    rules: [
      "You get exactly 1 submission per round, so the daily is one attempt per day.",
      "Scoring is 200 points for each player in the exact right slot, 1,000 for a perfect 5 for 5.",
      "The daily round is the same for everyone and flips at midnight Eastern Time.",
      "Unlimited mode deals random rounds from the same NBA, NHL and MLB pool.",
    ],
    example: [
      "Say the stat is MLB career home runs and the names are Barry Bonds, Hank Aaron, Babe Ruth, Albert Pujols and Willie Mays. Bonds at 762 feels safe on top, and Mays slots fifth at 660.",
      "The middle is the trap. Aaron hit 755, Ruth 714 and Pujols 703, so flipping Ruth above Aaron costs you two slots and leaves you at 3 of 5 for 600 points.",
    ],
    tips: [
      "Lock in the two ends first. First and fifth are usually the spots you actually know.",
      "Career totals reward longevity. A 20-year grinder often out-counts a shorter, brighter prime.",
      "Think era. Stats like three-pointers and stolen bases skew hard toward certain decades.",
      "Use undo freely. Nothing counts until the fifth tap.",
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
    howToPlay: [
      "Look at the two players and the sport badge above them.",
      "Decide whether they were ever on the same team at any point in their careers.",
      "Tap YES or NO to lock in your answer.",
      "Read the fun fact that explains the real story behind the pair.",
      "Hit Next Question and keep going until all 10 are done, then see your score.",
    ],
    rules: [
      "Each round is 10 questions: 3 easy, 3 medium and 4 hard, drawn fresh from a bigger pool.",
      "Every correct call is worth 1 point, so a perfect round is 10 out of 10.",
      "There's no timer, and a give up button ends the round early if you want out.",
      "Play again reshuffles a brand new set of pairs, as many rounds as you like.",
    ],
    example: [
      "Imagine the board serves up Kobe Bryant and Shaquille O'Neal. Easy yes, they won three straight titles together on the Lakers. Next comes Tom Brady and Peyton Manning. They defined a rivalry for years but never shared a locker room, so that's a no.",
      "The hard ones are sneakier, the pairs where you have to remember exactly when someone left. Finish 7 of 10 and you're doing better than most.",
    ],
    tips: [
      "Timelines beat team lists. Two legends at the same club in different decades were never teammates.",
      "Remember the weird late-career moves. Stars finishing on random rosters create the best traps.",
      "Don't rush the obvious no. If a pair feels impossible, ask yourself why the game picked it.",
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
    howToPlay: [
      "Start with clue one, the athlete's sport, and see if a name jumps out.",
      "Type a guess any time. Suggestions appear once you've typed a couple of letters, and last names count.",
      "Stuck? Hit Next Clue to reveal country, then the Games year and host city, achievement, career context, medal haul, and finally the athlete's initials.",
      "Wrong guesses cost nothing, so fire away and guess again.",
      "Give up if you're done, which reveals the athlete and scores zero.",
    ],
    rules: [
      "There are 7 clue levels. Solving on clue 1 scores 1,000, then 850, 700, 550, 400, 250 and 100.",
      "Points only drop when you reveal clues. Wrong guesses are free retries.",
      "Giving up ends the run at 0 and shows the answer.",
      "The daily athlete is the same for everyone, and unlimited mode deals random athletes forever.",
    ],
    example: [
      "Suppose clue one says Swimming. That's a big pool, no pun intended, so you reveal the country: USA. Still wide. Clue three says the 2008 Games in Beijing, and now your brain is screaming one name.",
      "You type Phelps, and last names count, so that's the win. Three clues used means 700 points.",
    ],
    tips: [
      "Sport plus country solves half the puzzles for big names, so always take a swing before clue three.",
      "The Games year and host city date the athlete's peak. Work out the era before guessing blind.",
      "Because wrong guesses are free, list your suspects and try them all.",
      "Save give up for genuine dead ends. Even clue seven pays 100.",
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
    howToPlay: [
      "Read the first clue describing a famous sports moment.",
      "Set your year with the arrow buttons. Single arrows move 1 year, doubles jump 10.",
      "Hit the guess button when you're ready to commit.",
      "A wrong guess automatically reveals the next clue, so every miss buys more information.",
      "You can also reveal the next clue voluntarily, or give up to see the answer.",
    ],
    rules: [
      "There are 6 clues per puzzle. Solving on clue 1 scores 1,000 points, then 800, 600, 400, 200 and 100.",
      "Every wrong guess reveals the next clue and drops you a scoring tier.",
      "The run ends after 6 wrong guesses, or immediately if you give up, both scoring 0.",
      "Answers range from 1972 to 2026, and a fresh puzzle arrives every day.",
    ],
    example: [
      "Picture this: clue one says a first baseman shattered a 37-year-old single-season home run record. You're thinking late 90s, so you guess 1997. Wrong, and clue two reveals the host nation won the World Cup on home soil.",
      "France at home, McGwire chasing Maris. That's 1998, and getting it on the second clue banks 800 points. Miss again and the year would still be gettable, just cheaper.",
    ],
    tips: [
      "Triangulate across sports. One clue narrows the decade, another pins the exact year.",
      "Use the 10-year jump buttons to get in the neighborhood before fine-tuning.",
      "A near-miss guess isn't wasted. The clue it unlocks usually tells you which direction to move.",
      "Anchor on world events you're sure of, like World Cups and Olympics, which only land in certain years.",
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
    howToPlay: [
      "Pick a mode: Daily Challenge, Unlimited, Summer or Winter focus, or filter by continent.",
      "Choose Easy for famous sporting nations or Hard for the full pool.",
      "Read the vibe word, then search and submit a country when you have a hunch.",
      "Each wrong guess reveals the next clue. The hint button reveals one too, if you'd rather not burn a guess.",
      "Keep going until you name it, run out of clues, or give up.",
    ],
    rules: [
      "There are 12 clue slots and the final one is the country's name itself, worth 0.",
      "Scoring starts at 1,200 on clue 1, then 1,100, 1,000, 850, 700, 550, 400, 250, 150, 100, 50 and 0.",
      "Consecutive wins build a streak with badges at 3, 5, 10 and 15 wins. A miss or a give up resets it.",
      "Give up any time to reveal the answer and score 0.",
    ],
    example: [
      "Say the vibe word is Sprint. Bold guessers type Jamaica immediately for 1,200. You play it safer, revealing the region, the Caribbean, then a medal count won almost entirely on the track.",
      "You commit to Jamaica on clue 3 for 1,000 points. The famous moment clue would have name-dropped a certain 100m world record in Beijing, but you didn't need it.",
    ],
    tips: [
      "The vibe word is sharper than it looks. One word can eliminate four continents.",
      "Medal totals are the biggest tell. A huge winter haul points north fast.",
      "Population plus continent narrows brutally. Big country, small medal count is its own clue.",
      "Weak hunch? Use the hint button instead of guessing, and save guesses for real suspects.",
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
    howToPlay: [
      "Read the anonymized career stats for the mystery player. The sport is shown, the name isn't.",
      "If you're torn, reveal a hint. There are up to 3 per player.",
      "Vote Hall of Fame or Bust when you've made up your mind.",
      "The reveal shows the player, the official verdict, a fun fact and the community vote split.",
      "Finish the daily player, then keep going in unlimited mode.",
    ],
    rules: [
      "A correct vote scores 1,000 points minus 100 for each hint you used. A wrong vote scores 0.",
      "You can reveal up to 3 hints per player, each costing 100 points off a win.",
      "Verdicts are Hall of Fame, Bust, or Borderline, and on a Borderline player either vote counts as correct.",
      "One shared mystery player per day, with unlimited mode serving more after that.",
    ],
    example: [
      "Imagine the card reads: 894 career goals, 4 championship rings, played into his 30s. No hints needed, numbers like that belong to one hockey player ever, and Hall of Fame is a free 1,000 points.",
      "The next card is murkier: big counting stats, zero titles, one MVP-ish season. You burn two hints, vote Bust, and you're right for 800. The community split says 61 percent agreed.",
    ],
    tips: [
      "Trophies and awards separate legends from compilers faster than raw totals.",
      "Notice what the stat line leaves out. No titles listed usually means there aren't any.",
      "Hints cost 100 each, so guess from the numbers first and spend hints only when stuck.",
      "Busts here mean careers that fell short of the hype, and hype is exactly what the stat line hides.",
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
    howToPlay: [
      "Read the match card: both teams, the competition, the date and a hint about the drama.",
      "Type your predicted score for each team.",
      "Hit Lock In Prediction. One prediction per match, no edits.",
      "The real score is revealed with a fun fact about the game.",
      "Play the daily match, then switch to unlimited for more.",
    ],
    rules: [
      "Exact score scores 1,000 points.",
      "Right result with both team scores within 1 scores 700, within 2 scores 400.",
      "Right result but way off on the numbers scores 200, and the wrong result scores 50.",
      "One featured match per day, plus an unlimited mode with the whole archive of soccer, NFL and NBA classics.",
    ],
    example: [
      "Suppose the card shows Brazil against Germany, World Cup semifinal, 2014. You remember Germany humiliated the hosts, so you lock in 1-5.",
      "The reveal says 1-7. You called the winner and Brazil's goal exactly, but being 2 off on Germany's tally drops you out of the 700 tier and out of the 400 tier too, since both scores need to be close. Right result, 200 points, and a fun fact about the strangest half in World Cup history.",
    ],
    tips: [
      "Calibrate by sport. Soccer classics live between 0 and 4 goals, NBA finals scores sit in the 80s to 110s.",
      "Famous upsets are usually tight. Blowouts are famous precisely because they're rare.",
      "The hint often nods at the drama, like a comeback or a shootout, which hints at the shape of the score.",
      "Nail the winner first. That alone is the difference between 200 and 50.",
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
    howToPlay: [
      "Choose a list from the menu, anything from Heisman winners to Stanley Cup champions.",
      "Pick Relaxed for no clock, or the timed mode for a 3:00 sprint.",
      "Type names into the box. Correct answers flash green and fill in on the board.",
      "Repeats flash yellow, misses flash red, and neither costs you anything.",
      "Give up any time to reveal what you missed, then retry or grab another list.",
    ],
    rules: [
      "Timed mode gives you exactly 180 seconds. Relaxed mode has no timer at all.",
      "Guesses need at least 3 letters, and surnames or team nicknames count when they're unique to one answer.",
      "Finishing 100 percent of a list earns Gold, 80 percent or better earns Silver, and 60 percent or better earns Bronze.",
      "Wrong guesses are free. There's no penalty and no guess limit.",
    ],
    example: [
      "Say you open Super Bowl MVPs on the 3:00 clock. You hammer out the quarterbacks first, montana, brady, mahomes, all accepted as surnames, and the board starts filling green.",
      "Around 40 seconds left you stall, dig up a defender or two, then time hits zero at 72 percent. Bronze tier, and the red misses show exactly what to remember for the Silver run.",
    ],
    tips: [
      "Dump the easy names first and save the digging for the back half of the clock.",
      "Type surnames. They're faster, and the game only asks for full names when two answers share one.",
      "Work by decade. Walking through the years surfaces names that free recall won't.",
      "If a name flashes red, try the full version. Shared surnames need spelling out.",
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
    howToPlay: [
      "Read the claim: a team, a title, a year.",
      "Tap CHAMP if it really happened, or NOT if it did not.",
      "The reveal tells you straight away, and if the claim was fake it names the team that really won that year.",
      "Ten claims per day, one point per correct call, and everyone in the world gets the same ten.",
      "Unlimited mode deals fresh sets as long as you want to keep calling, and its Hard toggle makes every fake a team that really won a nearby season.",
    ],
    rules: [
      "Every team named is a genuine champion of that competition at some point in history. The lie, when there is one, is only ever the year.",
      "Hard mode (Unlimited only) tightens the fakes: the wrong team still won for real, within about three seasons of the year on the card.",
      "Split titles count as true: if two schools share a college football crown, a claim about either one is a real claim.",
      "The daily set is the same for everyone and locks in your result for the day once you finish.",
      "No hints, no lifelines, no second guesses. One tap per claim.",
    ],
    example: [
      "The card says: The Chicago Bulls won the 1994 NBA Finals. It smells right, the Bulls won everything in the 90s, but 1994 is the baseball year: Houston won it. You tap NOT and the reveal confirms it, one point.",
      "Next card: The New York Islanders won the Stanley Cup in 1982. That is the middle of the four in a row, so you tap CHAMP. Another point, eight claims to go.",
    ],
    tips: [
      "Work out the era first. Most fakes die the moment you remember who owned that stretch of years.",
      "Dynasty gaps are the trap: the Bulls did not win in 1994 or 1995, and the Lakers missed 1990 to 1999 entirely.",
      "The reveal names the real winner on every fake, so even a wrong call teaches you the year for next time.",
      "Champions repeat. If you know the team has a pile of titles, the question is only whether THIS year is one of them.",
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
    howToPlay: [
      "Read the final: a champion and a year.",
      "Pick which of the four teams lost to them.",
      "The reveal names the answer and the series result straight away.",
      "Ten finals per day, two from each competition, one point per correct pick.",
      "The daily set is the same for everyone. Unlimited mode keeps dealing.",
    ],
    rules: [
      "Every option is a genuine finals loser from that same competition. No invented teams, ever.",
      "The wrong options are real runners up from other years, which is what makes the near misses cruel: the 1995 Magic show up as an option for the 1994 question.",
      "One pick per final, no second chances, and the daily locks your result once you finish.",
    ],
    example: [
      'The card asks: "The Houston Rockets won the 1994 NBA Finals. Who did they beat?" You remember the Knicks going to seven, pick New York, and the reveal confirms it, series 4-3.',
      "Next card is hockey: the 1942 Maple Leafs. If you know the only final ever won from three games down, you know Detroit was on the wrong end of it.",
    ],
    tips: [
      "Work out the era first, then the conference or league. Half the wrong options die on geography.",
      "Dynasty years are the easy ones: everyone knows who kept losing to the Bulls. The 40s and 50s are where scores are made.",
      "The reveal teaches the series result too, which quietly makes you better at Champ or Not.",
      "The trap options are usually from a year or two away. If two answers feel right, pick the one that fits the exact year.",
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
    howToPlay: [
      "Read the board: one competition, five teams, one right order.",
      "Tap teams into the ladder, most titles at the top, fewest at the bottom.",
      "Submit. Rungs you placed right lock in green, and you get a second try at the rest.",
      "One point per correct rung on your final answer, fifteen points across the day's three boards.",
      "The daily boards are the same for everyone. Unlimited mode keeps dealing fresh ones.",
    ],
    rules: [
      "No two teams on a board are ever tied. Every board has exactly one right order, so a miss is a miss on the record, never on a coin flip.",
      "Counts follow the name the club wore at the time, the same convention as our Record Books and Name Them All: South Melbourne's flags and Sydney's flags are separate stacks.",
      "Two tries per board. The first submit locks your greens; the second is final.",
      "The reveal always shows every team's real count, so you leave each board knowing the actual cabinet.",
    ],
    example: [
      'A World Series board deals the Yankees, the Cardinals, the Dodgers, the Cubs and the Marlins. The top is a gift: 27 Yankees titles, then the Cardinals on 11. The bottom half is the game: Dodgers, then Cubs, then the Marlins with 2.',
      "An AFL board will never hand you Essendon, Carlton and Collingwood together: all three sit on 16 flags, and tied teams never share a board. Same reason a Super Bowl board never deals the Steelers next to the Patriots.",
    ],
    tips: [
      "Anchor the ends first. The most decorated team and the clear minnow are usually easy; the middle rungs are where points die.",
      "Watch for era names. Eastern Suburbs and the Sydney Roosters are the same club but separate stacks here, and old-name entries usually carry the smaller count.",
      "A first-try miss is information: your greens lock, so the second try is a smaller puzzle. Count what is left before you tap.",
      "Reading the Record Books page once a week is basically training camp for this game.",
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
    howToPlay: [
      "Acquire champions one at a time, oldest first in each wing. Each costs more and earns more than the last.",
      "Every ten exhibits in a wing doubles that wing's income.",
      "Open new wings when the money allows, from the Super Bowl through to the NRL and the AFL.",
      "Tap the anniversary banner when it lights up: admissions triple for a few seconds.",
      "Spend on tours, the curator's network, the gift shop and the archive vault to raise everything at once.",
      "Rededicate once the hall is big enough to trade every exhibit for permanent renown stars.",
    ],
    rules: [
      "Nothing in this museum is invented. Every year, team and result comes from the same checked champion tables our quiz games and Record Books run on.",
      "The hall earns while you are away, at half speed, capped at eight hours. The gift shop raises that rate.",
      "Finishing a wing hangs a plaque worth a permanent income bonus, and a plaque survives every rededication.",
      "Rededicating clears the exhibits, the funds, the wings and the upgrades. Renown stars and plaques are the only things that carry over, and they carry over forever.",
      "The price quoted on a button is the price charged. No hidden fees, no fake discounts.",
    ],
    example: [
      "Your first purchase is the oldest Super Bowl on the books, for ten coins. Ten Super Bowls later that wing pays double, and the money starts arriving fast enough to open the WNBA wing next door.",
      "Sixty Super Bowls in, the wing is complete and its plaque is permanent: a quarter more admissions across the whole museum, forever, even after you rededicate and start the walls again.",
    ],
    tips: [
      "Wide beats deep early. Opening a new wing is usually worth more than the next expensive exhibit in your best one.",
      "Watch the milestone counter on each buy button. Being two exhibits away from doubling a wing is the best money in the game.",
      "Save the anniversary tap for right after a big acquisition run, when your per second number is at its highest.",
      "The gift shop only pays if you actually leave. If you play in long sittings, tours and the network are worth more.",
      "Do not rush the first rededication. Stars are paid per twenty exhibits, so one late rededication beats two early ones.",
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
    howToPlay: [
      "Read the category and its hint, like Premier League champions or the MLB 500 home run club.",
      "Click every tile you believe belongs. Correct picks turn green.",
      "Click a mine and it explodes, costing one of your 2 lives on that board.",
      "Find all the correct tiles to clear the board and bank a bonus.",
      "Play 3 boards per run, then see your final score and share it.",
    ],
    rules: [
      "Each board has 2 lives. Two mine hits end that board, but the run continues to the next one.",
      "Every correct tile is worth 10 points, and clearing a full board adds a 30 point bonus.",
      "Boards hold 12 to 16 tiles, with 4 to 6 mines hidden among them.",
      "The daily run is identical for everyone and flips at midnight Eastern Time. Unlimited deals random boards.",
    ],
    example: [
      "Imagine the category is Premier League champions. You click the bankers: Manchester United, Arsenal, Chelsea, Manchester City. Then Blackburn Rovers and Leicester City, both real champions, both green.",
      "Feeling smart, you click Newcastle United. Boom, never won the Premier League itself. One life left, and the remaining tiles suddenly look a lot more suspicious.",
    ],
    tips: [
      "Bank the certainties first. Every green is 10 points you keep even if the board later explodes.",
      "Read the hint line, since era limits change everything about who counts.",
      "Mines are nearly-men: famous finalists, runners-up and almost-dynasties. If a name feels like it should have won, that feeling is the trap.",
      "Down to one life? Slow down and count the board. The found counter tells you how many real ones remain.",
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
    howToPlay: [
      "Answer multiple-choice questions one at a time, four options each, easiest first.",
      "Each correct answer climbs the money ladder toward the top.",
      "Use your lifelines: 50:50 removes two wrong options, Ask the Crowd shows a poll, Swap Question trades in the current question.",
      "Before locking in, you can walk away and keep everything you've banked.",
      "Answer wrong and you drop to the last safe haven you passed.",
    ],
    rules: [
      "The ladder runs 15 questions, from $100 up to $1,000,000, all in play money.",
      "Questions 5 and 10 are safe havens worth $1,000 and $32,000. A wrong answer drops you to the last haven you cleared, or $0 if you haven't reached one.",
      "Each of the 3 lifelines can be used exactly once per run.",
      "The daily ladder is the same 15 questions for everyone. Unlimited builds a fresh random ladder every run.",
    ],
    example: [
      "Picture gliding to question 9 on football basics. Question 10 for $32,000 is a shirt-number deep cut, so you burn the 50:50, guess right, and lock the haven.",
      "At question 11 you gamble for $64,000, miss, and fall back to $32,000. That banked haven is the difference between a war story and a wipeout.",
    ],
    tips: [
      "Treat questions 5 and 10 like finish lines. Clear them, then gamble freely.",
      "Save Swap Question for the late rungs, where every question is brutal.",
      "The crowd is confident on easy questions and shaky on hard ones. Trust a landslide, doubt a coin flip.",
      "Walking away is a real strategy. A banked $16,000 beats a proud $1,000.",
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

  '/jeopardy': {
    intro: [
      "Five categories, five money rows, twenty-five clues, and a scoreboard that goes down as well as up. Sports Quiz Board is the game where the wrong answer doesn't just miss, it costs you the tile's full value.",
      "The dollars are pure scorekeeping, nothing real changes hands. The pain of blowing a $1,000 clue, though, is real.",
    ],
    howToPlay: [
      "Pick any tile on the board, in any order you like.",
      "Read the clue and type your answer in the box.",
      "Correct answers add the tile's value to your score. Wrong answers subtract it.",
      "Not sure? Close the clue and come back later, deferring is free.",
      "Answer all 25 tiles to finish the board and share your result grid.",
    ],
    rules: [
      "The board is 5 categories with clues at $200, $400, $600, $800 and $1,000 each, 25 tiles total.",
      "Wrong answers subtract the full tile value, and your score can go negative.",
      "Everyone gets the same board each day, and your progress saves so you can finish later.",
      "Answer matching is forgiving: surnames of 4 or more letters count, and accents and punctuation are ignored.",
    ],
    example: [
      "Say you open a $200 tile in a Ballon d'Or category and it asks for a very recent winner. Easy money. Emboldened, you jump straight to the $1,000 in the same column and meet a winner from decades before you were born.",
      "You type a surname, it's wrong, and $1,000 evaporates. The lesson sticks: the big tiles reach way back in time, and they're priced that way for a reason.",
    ],
    tips: [
      "Sweep the $200 and $400 rows first to build a cushion before touching the deep cuts.",
      "There's no timer. Close a hard clue, let it stew, and circle back.",
      "Type surnames. Full names are only needed when a surname alone is ambiguous.",
      "Respect the $1,000 row. High value means old and obscure, and a miss stings double.",
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
    howToPlay: [
      "Answer 12 multiple-choice questions, four options each.",
      "Each pick is graded instantly, green for right, red for wrong, then move on.",
      "The questions escalate: recent, famous stuff early, decades-old deep cuts late.",
      "Finish all 12 to get your IQ score and your rank.",
      "Copy the share squares and challenge someone who claims they know ball.",
    ],
    rules: [
      "The 12 questions follow a fixed ramp: 3 easy, 3 medium, then pairs at rising weights up to the two hardest at the end.",
      "Your IQ runs from 55 to 160 and is weighted by question value, so the hard ones move it most.",
      "Ranks: 145 and up is Certified ball knower, 125 is Knows ball, 105 is Solid ball knowledge, 85 is Casual, 70 is Knows of ball, and below that, Does not know ball.",
      "Everyone gets the same 12 questions each day, and progress saves for the day.",
    ],
    example: [
      "Imagine you cruise through the first nine, recent champions and famous MVPs, no sweat. Then the last two questions ask about winners from long before your time, and you miss both.",
      "Ten of twelve sounds elite, but those were the two heaviest questions on the test. You land around 128, Knows ball. The gap to Certified lives in the deep end.",
    ],
    tips: [
      "Budget your focus for the back half. The final questions swing your IQ more than the first six combined.",
      "Wrong options come from the same category and era as the answer, so eliminate by detail, not by vibe.",
      "A red early answer changes nothing about the questions ahead, so shake it off.",
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
    howToPlay: [
      "Look at the emoji string and the category label above it.",
      "Type your answer. Surnames are fine and spelling is forgiving on accents.",
      "Miss once and a written hint appears under the emoji.",
      "You get 3 guesses per puzzle before the answer is revealed.",
      "Clear all 5 puzzles, then share your grid of green, yellow, orange and red squares.",
    ],
    rules: [
      "Each day serves 5 puzzles: 2 easy, 2 medium and 1 hard, the same set for everyone.",
      "Scoring per puzzle: 100 points on the first guess, 60 on the second, 30 on the third, 0 for a miss. A perfect day is 500.",
      "The hint appears after your first wrong guess, at no extra cost beyond the tier you already dropped.",
      "The set flips at midnight Eastern Time, and your progress saves for the day.",
    ],
    example: [
      "Suppose puzzle one is a goat next to an Argentina flag, category Player. You type Messi, first try, 100 points. Puzzle two is a single cherry with the category Club, and you sit there blank.",
      "One wrong guess later the hint mentions England's south coast, and it clicks: Bournemouth, the Cherries, 60 points. That's the game in miniature, instant glory or a slow, hint-assisted crawl.",
    ],
    tips: [
      "Read the category label first. The same emoji means different things for a club than for a moment.",
      "Club puzzles usually run on nicknames and badges, so think about what's on the crest.",
      "Say the emoji out loud. Half these riddles are puns that only work in your ears.",
      "Down to your last guess, wait for nothing. A 30 beats a zero and keeps the grid respectable.",
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
    howToPlay: [
      "Open packs one at a time, 15 in total.",
      "Each pack reveals a real player with his club, position, rating and market value, plus a tier from fringe to superstar.",
      "Keep him by tapping a highlighted compatible slot in your 4-3-3.",
      "Or bin him, if you can afford to.",
      "After pack 15, your final XI rating and best pull are ready to share.",
    ],
    rules: [
      "You open 15 packs to fill 11 slots, which means you can only afford 4 bins all run.",
      "Pack odds per tier: superstar 3 percent, star 9, quality 22, squad player 41, fringe 25.",
      "Your rating averages all 11 slots, and an empty slot counts as a 45, below even the weakest real player.",
      "One run per day, the same sequence for everyone, saved as you go.",
    ],
    example: [
      "Imagine pack 2 pops a superstar winger. Instant keep at right wing. Packs 3 through 7 are squad-level bodies, and you bin two chasing better, leaving 2 bins for the rest of the run.",
      "Then pack 9 is a fringe goalkeeper. Keeping him feels bad, but there's one goalkeeper slot and no guarantee anything better is coming. You keep him and finish with a full XI in the low 70s.",
    ],
    tips: [
      "Count your bins. Spend all 4 early and every remaining pack becomes a forced keep.",
      "Guard the scarce spots. There's one goalkeeper slot and one striker slot, but three central midfield slots.",
      "A fringe body still beats a hole. Empty slots score 45, lower than any real player.",
      "Superstars are a 3 percent event. Don't bin solid players betting on one.",
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
};
