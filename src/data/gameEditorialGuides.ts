/**
 * Static, crawlable editorial for the highest traffic game routes.
 * Rendered by GameEditorialGuide under the board. Unique per game.
 * Facts follow src/data/gameContent. No invented transfers, stats, or quotes.
 */

export interface EditorialSection {
  heading: string;
  paragraphs: string[];
}

export interface GameEditorialCopy {
  title: string;
  sections: EditorialSection[];
}

export const GAME_EDITORIAL_GUIDES: Record<string, GameEditorialCopy> = {
  '/who-am-i': {
    title: 'Who Am I? player hunt guide',
    sections: [
      {
        heading: 'How to Play & Official Rules',
        paragraphs: [
          'The secret footballer is already on the pitch. You just cannot see the name yet. Who Am I? hides one current player from the top 400 by market value. Casual mode gives 25 guesses. Expert gives 10. Easy, Normal and Hard only change how famous the secret is, not the math and not the budget.',
          'Type two or more letters and pick anyone in the database, more than 27,000 names. Each guess prints a 0 to 100 score plus chips for nationality, position, club, age and market value. Green matches. Yellow is close. Arrows show older or younger, pricier or cheaper. Keep going until you name him or the budget is gone. The daily hunt is shared. Unlimited is extra practice. The ? button still opens the short rules. This article sits under the board so a phone keeps the game first.',
        ],
      },
      {
        heading: 'Scoring & Win Conditions',
        paragraphs: [
          'There is no squad chemistry here. Nationality is worth 22. Position group is 18, plus 10 for the exact role. Same current club is 25. A shared former club is 10. Age closeness can add 15 and hits zero at 12 years apart. Value closeness can add 20 and hits zero when the two values are 10 times apart. Only the true player scores 100. Everyone else caps at 99.',
          'Open with famous names from different continents and positions. The value arrow is the loudest compass, so climb or drop the market fast. When a club chip turns green, hunt teammates next. A keeper guess against a secret striker from another nation lands near the floor. Change direction.',
        ],
      },
      {
        heading: 'Sport Background & Trivia Lore',
        paragraphs: [
          'Soccer identity is a stack of facts that rarely move together. Keepers almost never post striker scoring lines. A holding midfielder and a wide forward from the same country can sit in totally different price bands because leagues pay differently. Club football and international football are different jobs too.',
          'Market value is a snapshot, not a medal. It tracks age, contract, league and form. Most outfield players peak in their mid 20s. Keepers last longer. An age arrow plus a value arrow shrinks the pool faster than guessing whoever feels famous. Follow the chips until 100 clicks.',
        ],
      },
    ],
  },

  '/career': {
    title: 'Career Quiz guide',
    sections: [
      {
        heading: 'How to Play & Official Rules',
        paragraphs: [
          'A career table with the years showing and almost every other cell taped over is a different memory test than a photo. Career Quiz hides club, appearances, goals, assists and market value behind tappable boxes. Only the years start visible. Name the player while opening as little as you can.',
          'Tap any box to reveal that cell. Give Hint opens four random boxes at once, as often as you like. Guess from search at any time, even with zero boxes open. You get 8 guesses. Wrong names burn one. Revealing boxes never does. The daily puzzle is shared. Unlimited adds Easy, Normal and Hard by peak market value. The ? button keeps the short rules. This write-up lives under the table.',
        ],
      },
      {
        heading: 'Scoring & Win Conditions',
        paragraphs: [
          'There is no chemistry meter. You win by naming the player before 8 wrong guesses. Boxes are a pride stat, not a life. Hints do not cost a guess. They only add four more facts. A one guess, three box solve is a flex. A slow peel that still gets the name is still a win. A zero box solve is legal and rare.',
          'Club cells are usually the loudest tell. A distinctive route can solve the board in two reveals. Market value peaks mark prime years. Goals in the twenties scream forward. Huge appearances with almost no goals hint at defenders and keepers. There is no clock, so sit with the pattern before you spend a guess.',
        ],
      },
      {
        heading: 'Sport Background & Trivia Lore',
        paragraphs: [
          'A football career is a trail of clubs, minutes and a price tag that rises and falls. Some players grow up, peak and finish inside one league. Others hop countries every other summer. The years on the left are the spine: youth, prime, and a last contract that often looks quieter on the value column.',
          'Appearances tell you who was trusted. Goals tell you who finished. Assists tell you who created. Market value is the transfer window talking in numbers: not a trophy, not always fair, but a useful fingerprint. Open one mid career club, then the value on that row, and you are asking where he was wanted most in the season that defined him.',
        ],
      },
    ],
  },

  '/build-your-xi': {
    title: 'Build Your XI guide',
    sections: [
      {
        heading: 'How to Play & Official Rules',
        paragraphs: [
          'Eleven slots, six formations, and a spinner that refuses to let you pick a fantasy club of your own. Build Your XI assigns a real club or national team to every position. Choose 4-3-3, 4-4-2, 3-5-2, 4-2-3-1, 3-4-3 or 5-3-2, tap a slot, watch the spinner, then search a name from that exact side.',
          'Each pick is verified before it counts. A wrong answer is rejected with a reason and costs nothing. Nearby roles cover each other: full backs and wing backs, wingers on both flanks, CM covering CDM and CAM, strikers covering each other. A keeper only goes in goal. No duplicate players. Rerolls are unlimited and skip teams already used. If the AI judge is unreachable, a built in judge still grades you.',
        ],
      },
      {
        heading: 'Scoring & Chemistry Mechanics',
        paragraphs: [
          'Two layers sit on the finished XI. The judge writes a rating headline and a short scouting report. Under that, a season report plays a year out: squad rating out of 100, a 20 team league finish, points, trophies, a top scorer, and how the lines compare. Every player is judged at his peak, so retired greats are not marked down for being retired.',
          'Chemistry is this site\'s own link math. Each pair sharing a club is worth 3, a league 2, a nationality 1, capped at 9 per player. Stacking one league quietly adds points. The chemistry line is additive display. It does not replace a legal XI, and it does not let a keeper play centre mid.',
        ],
      },
      {
        heading: 'Sport Background & Trivia Lore',
        paragraphs: [
          'A starting eleven is a compromise. 4-4-2 wants two strikers. 4-3-3 wants wide forwards who can press. 3-5-2 asks wing backs to cover a full flank. Managers pick a shape because of the players they have. This game flips that: the shape is locked, the clubs are random, and you have to remember who actually played where.',
          'National team slots are a different memory than club slots. A country has fewer names, but the famous ones get used by several positions in your head. Save a stacked nation for a hard slot if you can. Small clubs on the wheel are often easiest in goal and hardest out wide.',
        ],
      },
    ],
  },

  '/connections': {
    title: 'Soccer Connections guide',
    sections: [
      {
        heading: 'How to Play & Official Rules',
        paragraphs: [
          'Sixteen names on a grid is easy until two groups share a player who looks like he belongs in both. Connections asks you to sort 16 footballers into four hidden groups of four. Tap four names and hit Submit. A correct set locks with its category and a color. A wrong set costs one of 4 lives. If three of four were right, the game says you were one away.',
          'You get up to 4 hints. A hint names the easiest unsolved category, never the players. Colors mark difficulty: green easy, yellow medium, blue hard, purple insane. Purple is usually the trap. The daily board is shared and flips at midnight Eastern Time. Unlimited deals more puzzles. The ? button still has the short rules. This guide sits under the grid.',
        ],
      },
      {
        heading: 'Scoring & Win Conditions',
        paragraphs: [
          'There is no chemistry graph. You win by finding all four groups before lives hit zero. Each solve adds 1 to a streak stored in your browser. Any loss resets it. Hints and lives are separate budgets of 4. Spending a hint does not cost a life. You still have to find the four names.',
          'Never submit your first idea. Hunt the trap player who fits two categories. Lock your surest group first, because every solve shrinks the board. One away means change exactly one player, not two. Save hints for the last two groups, where categories get strange. Winning with all 4 lives intact is the real flex.',
        ],
      },
      {
        heading: 'Sport Background & Trivia Lore',
        paragraphs: [
          'Footballers collect overlapping labels for a living. Same club, same country, same tournament, same award, same number on the back. That overlap is why a grid like this works, and why it lies. A Ballon d\'Or winner can also be a one club legend. The category you see first is not always the category the puzzle wants.',
          'Clubs are the friendly groups. Awards and numbers are the mean ones. Shirt numbers travel: a 10 might be a playmaker in one country and a striker in another. A name from the 1990s and a name from last season can share a club without sharing a dressing room. Read the whole board once before you tap.',
        ],
      },
    ],
  },

  '/nfl-my-career': {
    title: 'NFL My Career guide',
    sections: [
      {
        heading: 'How to Play & Official Rules',
        paragraphs: [
          'Draft night is a beginning, not a highlight reel. Build a fictional prospect, get drafted by a real team, and play a career one season at a time. Pick a name, one of 8 positions (QB, RB, WR, TE, LB, CB, EDGE, K), and an archetype. Pick today\'s league, or the 2005 throwback with the Raiders in Oakland, the Chargers in San Diego and the Rams in St. Louis.',
          'Your rating decides the draft slot. Top twelve picks open as starters. Everyone else fights camp every summer. Play each season with one tap. When the deal expires, work a free agency window of named offers. Between seasons, one crossroads arrives: contracts, surgeries, trade requests, training, or the shady path if you want it. Open the Bank, read the News, collect badges, then retire into a legacy verdict. Progress saves in your browser.',
        ],
      },
      {
        heading: 'Scoring & Win Conditions',
        paragraphs: [
          'This is not a chemistry lineup game. Legacy is built from rings, MVPs, All-Pro nods, seasons and stat totals. You start at 22 on a 4 year rookie deal. Growth is 1 to 2 rating points a year through age 26. Backs fall off at 28, corners at 30, quarterbacks at 34, kickers at 39. Retirement is forced at rating 64, age 40, 34 for backs, or 19 seasons. You can walk after 6.',
          'Injuries can erase 2 to 10 games. A stacked contender can cost a mid player the job. Kickers never sit. Dirty choices raise a league security meter that cools 9 a year while you stay clean. At 90 you are suspended indefinitely. Badges light from facts: a ring, Rookie of the Year, yardage marks, a 20 sack season, $100M to your name.',
        ],
      },
      {
        heading: 'Sport Background & Trivia Lore',
        paragraphs: [
          'American football careers are short by soccer standards and brutally position specific. A quarterback can play into his late 30s if the system holds. A featured back often gets fewer healthy seasons than the highlights show. That is why this sim ages each position on its own curve instead of one generic overall.',
          'The league you pick is a sealed world. The 2005 throwback keeps franchises where they actually stood, and the money is about a third of today. Free agency is the real fork: contenders lowball, rebuilds overpay. The roster number on an offer card is the quality your next seasons run on. You are choosing between January football and a fatter cheque.',
        ],
      },
    ],
  },

  '/soccer-career': {
    title: 'Soccer Career guide',
    sections: [
      {
        heading: 'How to Play & Official Rules',
        paragraphs: [
          'You never take a touch. You take a decision, then live with the season it creates. Soccer Career starts you at 16 in a youth academy and walks through contracts, transfers, injuries, trophies and a shop. Create a name, one of 50 nationalities, one of 10 positions, and an era from the 1990s to the 2020s. Roll potential in the mid 50s to high 60s. Rerolls are free.',
          'Begin in an academy matched to your nationality and talent. Pro offers arrive from 17. Train once a season on the dumbbell button. Work windows: stay, extend, request a move, or weigh a dream club pay cut. Spend in 8 shop aisles, including a shady one that only appears once you have something to hide. Retire, read the legacy verdict, then continue as manager, pundit or owner. One career saves in your browser at a time.',
        ],
      },
      {
        heading: 'Scoring & Win Conditions',
        paragraphs: [
          'There is no card chemistry. Legacy runs 0 to 100: 90 is GOAT, 80 LEGEND, 70 GREAT, 60 SOLID PRO, and less is JOURNEYMAN. Climbing from 54 to 91 scores better than being handed 91 on create. Stats grow 1 to 3 points a year through academy and prime, less past 86. 99 is the hard wall. Decline gets brutal from 38.',
          'Your academy club always offers a first team deal, so a one club career is possible, and they can call you home from 27. A dominant season cannot be snubbed at the Ballon d\'Or if you outscore the shortlist while winning a major. Corruption heat cools 8 a year when you stay clean, and can end in a raid. Morale and integrity feed the ending too.',
        ],
      },
      {
        heading: 'Sport Background & Trivia Lore',
        paragraphs: [
          'A real football life is mostly waiting, then a window, then a season that rewrites the last one. Academies feed first teams. Loans teach minutes. The World Cup arrives every four years, and a small nation needs a world class you far more than a giant does. Height and weight are not decoration here: taller and heavier wins more in the air and gives away a step.',
          'Money is a second pitch. You can stay clean, or take envelopes until a meter you cannot see gets too hot. Loyalty still pays: a decade at one club is worth about as much as two and a half league titles. That matches how fans talk about one club players. It is not a quote put in anyone\'s mouth.',
        ],
      },
    ],
  },

  '/quiz-board': {
    title: 'Sports Quiz Board guide',
    sections: [
      {
        heading: 'How to Play & Official Rules',
        paragraphs: [
          'A quiz board that subtracts is a different animal than one that only adds. Sports Quiz Board deals five categories and five money rows, twenty-five clues, same board for everyone each day. Pick any tile. Read the clue, type an answer, and bank the value if you are right. Get it wrong and the same value comes off. Your total can go negative. Not sure? Close the clue and come back. Deferring is free.',
          'Clues run $200, $400, $600, $800 and $1,000. Lower rows are more recent. The $1,000 row reaches back decades on purpose. Surnames of 4 or more letters count, and accents and punctuation are ignored. Clear all 25 tiles to finish. Progress saves in your browser. The ? button still has the short rules. This article sits under the board so the grid stays first on a phone.',
        ],
      },
      {
        heading: 'Scoring & Win Conditions',
        paragraphs: [
          'There is no chemistry. The score is pure add and subtract. A careful sweep of the $200 and $400 rows builds a cushion. A greedy jump to $1,000 can wipe that cushion in one miss. There is no timer and no life count. The board ends when every tile is answered. Dollars are scorekeeping only. Nothing real changes hands.',
          'Type surnames unless a surname is ambiguous. Sweep recent rows first, then decide whether the deep cuts are worth the risk. High value means old and obscure, and a miss stings twice: you do not get the points, and you lose the same amount. A finished board below zero is a real outcome, not a glitch.',
        ],
      },
      {
        heading: 'Sport Background & Trivia Lore',
        paragraphs: [
          'Sports trivia lives on two clocks. One is last night: who lifted the latest Ballon d\'Or, who won the last Super Bowl, who closed out the NBA Finals. The other is your dad\'s clock: league winners from the 1990s, MVPs from a Super Bowl numbered in Roman numerals, club sides that were giants before you were born. This board prices that gap.',
          'Categories mix football, American football, basketball and the awards that cut across them. Cheap tiles ask what a sports internet already remembers. Expensive tiles ask what only stuck if you were there, or if you read back. If a clue feels like it belongs to another decade, it probably does, and it is priced that way for a reason.',
        ],
      },
    ],
  },

  '/sports-millionaire': {
    title: 'Sports Millionaire guide',
    sections: [
      {
        heading: 'How to Play & Official Rules',
        paragraphs: [
          'The ladder is pretend money and very real nerves, especially once you have cleared a safe haven. Sports Millionaire is a 15 question climb: four options, easiest first, stakes rising every time you lock an answer. Questions come from a live database of footballers: clubs, nationalities, positions, market value comparisons and shirt numbers.',
          'Each correct answer climbs toward $1,000,000 in play money. Three lifelines, one use each: 50:50 hides two wrong options, Ask the Crowd shows a poll, Swap Question trades for another at the same difficulty. Walk away before locking in to keep what you have banked. A miss drops you to the last safe haven, or $0 if you have not reached one. The daily ladder is shared. Unlimited builds a fresh one. The ? button keeps the short rules.',
        ],
      },
      {
        heading: 'Scoring & Win Conditions',
        paragraphs: [
          'No chemistry, no squad building. The score is the rung you walk away with, or the haven you fall to. Questions 5 and 10 are safe havens worth $1,000 and $32,000. Treat those like finish lines. A miss on question 3 is a wipeout. A miss on question 11 after locking $32,000 is a war story with money still on the sheet.',
          'Save Swap Question for the late rungs. The crowd is confident on easy questions and shaky on hard ones: trust a landslide, doubt a coin flip. Walking away is a real strategy. A banked $16,000 beats a proud $1,000. None of the dollars are real. Nothing is wagered and nothing is paid out. It is a score with a dollar sign.',
        ],
      },
      {
        heading: 'Sport Background & Trivia Lore',
        paragraphs: [
          'Quiz ladders work because sports knowledge is stacked, not flat. Shirt numbers, nationalities and clubs are the easy language of team sheets. Market value comparisons are harder because they ask who was expensive in which window, not just who scored. A four option question can hide two names that feel right until you remember which league they actually played in.',
          'Safe havens are TV grammar people already know: survive a chunk of questions, bank a floor, then gamble the rest. Early rungs are the stuff a casual fan has seen on a graphic. Late rungs are squad list trivia. Use the lifelines like a bench. They are not a personality test. They are a way to not throw a good climb on one stubborn shirt number.',
        ],
      },
    ],
  },

  '/nba-my-career': {
    title: 'NBA My Career guide',
    sections: [
      {
        heading: 'How to Play & Official Rules',
        paragraphs: [
          'The NBA career is a long summer of choices with a box score attached to each winter. Build a fictional prospect and get drafted by a real team. Pick a name, one of 5 positions (PG, SG, SF, PF, C), and an archetype. Pick today\'s NBA, or the 2003-04 throwback with the SuperSonics in Seattle, the Nets in New Jersey, the Hornets in New Orleans and no Charlotte yet.',
          'Stronger prospects go higher. Top five picks open in the starting five. Everyone else fights camp every fall. Sim each season for games, points, rebounds, assists, awards and the team result. One big decision arrives every summer. When the contract runs out, work a free agency window of named offers. Open the Bank, collect 21 badges, then retire when the body or the fire quits. Progress auto saves. One career at a time.',
        ],
      },
      {
        heading: 'Scoring & Win Conditions',
        paragraphs: [
          'No lineup chemistry. Archetypes shape the engine: Point Gods pile up assists, Paint Beasts eat rebounds, Bucket Getters score but break down more. All-NBA needs 62 games. MVP talk starts at a 92 rating. Growth runs to age 25. Decline starts at 32. Bench seasons run at about 60 percent of a starter. Careers end at 41, after 21 seasons, or when the rating craters. You can walk anytime.',
          'Legacy moves hardest on MVPs and rings, then Finals MVPs and All-NBA nods, plus longevity and points. The GOAT conversation is brutal to reach. Dirty choices can end in an indefinite suspension. Badges light from facts: a ring, an MVP, 30,000 points, a triple double season, $100M. Your rival is a generated player drafted the same year. Fictional, like you.',
        ],
      },
      {
        heading: 'Sport Background & Trivia Lore',
        paragraphs: [
          'Basketball stardom is minutes plus health plus the roster around you. A thin rebuild hands a young player the ball and a losing record. A loaded contender can bury a mid pick on the second unit, which is why this sim makes camp real. Load management, surgery, hometown discounts and the max somewhere new are the summer arguments that actually decide careers.',
          'The throwback is a sealed 29 team world, verified against that real season. Contracts pay 2003 money, about a third of today. Your player is made up on purpose. The teams are real. The aging curve is the story fans already know: explosion early, craft in the middle, and a last contract that is either a victory lap or a warning.',
        ],
      },
    ],
  },

  '/mystery-box': {
    title: 'Mystery Box pack guide',
    sections: [
      {
        heading: 'How to Play & Official Rules',
        paragraphs: [
          'Fifteen packs, four bins, eleven shirts. The sequence is the same for everyone, so the argument later is about judgment, not luck. Mystery Box reveals real footballers one at a time. You slot them into a 4-3-3 or bin them and hope the next pack is kinder. Each pack shows club, position, rating, market value, and a tier from fringe to superstar.',
          'Keep him by tapping a highlighted compatible slot. Or bin him, if you can afford to. You open 15 packs to fill 11 slots, which means only 4 bins all run. After pack 15, your XI rating and best pull are ready to share. One run per day. Decisions save as you go. The ? button still has the short rules. This guide sits under the pack flow.',
        ],
      },
      {
        heading: 'Scoring & Win Conditions',
        paragraphs: [
          'This is not a chemistry puzzle. Your rating averages all 11 slots. An empty slot counts as a 45, below even the weakest real player, so a hole hurts more than a fringe body. Pack odds: superstar 3 percent, star 9, quality 22, squad player 41, fringe 25. Superstars are rare on purpose. Do not bin solid players betting on one.',
          'Count your bins. Spend all 4 early and every remaining pack becomes a forced keep. Guard scarce spots: one goalkeeper, one striker, three central midfield slots. A fringe keeper in pack 1 is the classic fork. Two star strikers and one ST slot means someone plays wide or someone gets binned. Most finished squads land in the 60s or 70s.',
        ],
      },
      {
        heading: 'Sport Background & Trivia Lore',
        paragraphs: [
          'Building a football XI from imperfect arrivals is what deadline day feels like. You do not get to order eleven perfect names. You get a stream of options and a limited number of nos. Real squads live with that every window: a backup keeper because the starter market moved, a wide player asked to fake a nine, a midfield that is deeper than the attack because that is who was available.',
          'A 4-3-3 is a demanding shape for a luck-based draft. It wants a true 9, two wide forwards, and a midfield that can pass and protect. Every name in a pack is a real footballer with a real value. Everyone opens the same fifteen in the same order. The rating gap between friends is the trail of keep or bin taps: published odds, a shared sequence, and a squad that can look ugly if you get greedy.',
        ],
      },
    ],
  },
};
