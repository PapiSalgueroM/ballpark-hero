import type { GameContentMap } from './types';

export const CLUB_MANAGEMENT_CONTENT: GameContentMap = {
  '/club-manager': {
    intro: [
      "Club Manager is the site's big one: a full management sim in your browser. 454 real clubs across 27 leagues in 21 countries, from the Premier League, Serie B, Ligue 2 and the Segunda División to the Danish Superliga, the Swiss Super League, Croatia's SuperSport HNL, Brazil's Serie A, Liga MX, the A-League Men and the Russian Premier League, over 5,000 real players with their real 2026 ages and market values, and a board that talks like a board.",
      "Pick when you start too: today's game, or one of four real past seasons. 2020-21 is Haaland and Bellingham at Dortmund, Mbappé and Neymar at PSG and Bruno Fernandes at United, with that summer's big moves already made (Havertz and Werner at Chelsea, Thiago at Liverpool, Suárez at Atlético). 2015-16 is the year Leicester won it at 5000 to 1, with Vardy and Mahrez at their real pre-title values and MSN at Barcelona. 2010-11 is prime Messi and Rooney, and now Klopp's young Dortmund, Ibrahimovic's Milan and Lille's double too. 2005-06 is Ronaldinho's Ballon d'Or Barcelona with a 17 year old Messi, Mourinho's back to back Chelsea and Henry's Arsenal. All four past seasons hold all 98 clubs of their year's big five, the Premier League, La Liga, Serie A, the Bundesliga and Ligue 1 (in 2015-16 Juventus mid five-in-a-row, Lewandowski at Bayern, Ibrahimovic and Di Maria at PSG; in 2005-06 the Juventus of Buffon, Cannavaro, Nedved and Ibrahimovic, Ballack's Bayern and Juninho's Lyon); every one carries hundreds of real players at their real ages and values from that year. Or found a club of your own: name it, design the crest, name the stadium, choose the money, and build it up by signing real players.",
    ],
    headings: {
      howToPlay: "How to play Club Manager, a free online football management game",
      rules: "Club Manager rules: the board, the meters and the money",
      example: "Club Manager walkthrough: a Newcastle season and a brand new club",
      tips: "Club Manager tips for fitness, tactics and building a club",
      faq: "Club Manager FAQ: the sack, saves, transfer windows and wages",
    },
    howToPlaySections: [
      {
        heading: "Pick an era, a nation and a real club",
        items: [
          "Pick your era (today, 2020-21, 2015-16, 2010-11 or 2005-06), then your nation, your league, and your club. Every tile quotes what that board will actually demand.",
        ],
        subsections: [
          {
            heading: "Or found a club of your own",
            items: [
              "Or tap Create your own club: your name, your crest (shape, pattern, colors, initials), your stadium, and one of three budgets. Your club takes the league place of the division's weakest side.",
            ],
          },
          {
            heading: "Or move clubs between leagues with the world editor",
            items: [
              "In today's world, the World editor tile on the nation step lets you rebuild the map before you pick: tap a club, then tap the club in another league it swaps with. Every move is a swap, so every league keeps its real size, its fixtures and its places, and you can make as many as you like, from one club to a whole super league.",
              "Example: swap Celtic with Brentford and take Celtic. You play a full Premier League season and the FA Cup, Brentford play in Scotland, and both boards judge their club against its new league, so Brentford are asked to win the Scottish Premiership and Celtic are asked to stay up. Your first season's Europe goes to the clubs who really qualified last season, wherever they play now; after that your edited tables decide it, and the edited leagues promote and relegate like any other. Reset puts the real world back.",
            ],
          },
        ],
      },
      {
        heading: "Match days: team sheet, Play Live or Quick Sim",
        items: [
          "Before each match set formation, mentality and your starting XI, or use auto pick, and give a team talk when it matters.",
          "Play the match one of two ways: Play Live puts it on the pitch with the dressing room at the break, and Quick Sim goes straight to the report with the coach making your subs. Then read the report, answer the press, and manage the dressing room between games.",
          "A live match moves: both teams hold their shape around the ball, and goals play out on the pitch before the score changes. Pause it, change the speed or skip to the whistle, and tap one of your players at any minute to make a sub or change shape.",
        ],
        subsections: [
          {
            heading: "Sim ahead on the calendar",
            items: [
              "Or open the calendar, tap any day and sim to it: every match up to that day plays in one go, and the run stops early only for a transfer window opening, the season review, the sack or a club's approach. The four fast forwards (next match, about a month, to the window, rest of season) are the same tap on a chosen day.",
            ],
          },
        ],
      },
      {
        heading: "Transfer windows and the staff room",
        items: [
          "Buy and sell in the summer and January windows: negotiate fees, pay release clauses, take loans, and field bids for your own stars before rival clubs close your targets.",
          "Run the staff room: hire an attack, defence or goalkeeping coach and a lead scout, promote one of your own academy staff for nothing, pay somebody off, and decide whether to match a rival's offer when they come calling.",
        ],
      },
      {
        heading: "The board's market asks and the confidence meter",
        items: [
          "Meet the two asks your board makes in the market. They are on the board screen under In the market, with the line that says how each is judged, and every number in them is worked out from your squad, your pot and your era.",
          "Keep the confidence meter alive, hit the board's objectives, collect trophies, and roll into next season while the whole world ages around you.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "What the board expects each season",
        items: [
          "Boards demand the actual prize, never a number: win the league, qualify for the Champions League or Europa League, reach mid table, or stay up, plus cup targets, a rival to finish above, and squad-building mandates.",
          "On top of those, every board makes two specific asks a season, and they are the ones you go out and buy: get one more player from the club's own country into the squad, keep one more aged 30 or over, sign somebody in the thinnest line of your squad, sign somebody 21 or under at a rating floor, or spend a set fee or more on one signing. Which two you get is fixed for your club and your season, and every threshold is read off the market and the money you really have, so the pair can always be met and never costs more than the pot. Countries come from the same per-era map the market screen puts a flag next to his name with, so anyone it has no country for counts for nobody.",
        ],
        subsections: [
          {
            heading: "Your inbox and what each reply moves",
            items: [
              "Your inbox is not just the dressing room. The board chase an ask you have not met and you can take their money, give them your word or tell them no; an agent writes about a player of yours with a year left; your assistant argues about the training plan when it is wrong for the squad; the supporters trust write when the tickets are on premium; and a reporter wants a line on whether the squad is good enough. Each answer moves something with a screen behind it: the kitty, the board meter, a contract, the plan, the ticket price or the press mood. A word given to the board settles in the summer, three points of next season's opening confidence either way.",
            ],
          },
        ],
      },
      {
        heading: "League lengths, past eras and created clubs",
        items: [
          "Every league plays its real length: 38 rounds in the Premier League, 46 in the Championship, 34 in the Bundesliga, with the domestic cup from a round of 16 to the final and a full Champions League on top for qualified clubs.",
          "New modern Champions League seasons have 36 clubs in one table and eight different opponents, four home and four away. Top eight go straight into the round of 16; places 9 to 24 play two legged playoffs; places 25 to 36 go out. Every knockout before the final has two legs. Example: finish 12th and win your playoff to reach the last 16; finish 6th and skip the playoff. Qualification and fixture draws are simulated, with no real coefficient pots or association limits. Old saved groups finish their existing season before changing; historic eras keep their own format.",
          "Serie B (20 clubs), Ligue 2 (18) and the Segunda División (20) sit under Serie A, Ligue 1 and La Liga, so the bottom three of Serie A and La Liga and the bottom two of Ligue 1 really go down and swap with the top of the division below every summer. The Segunda plays 20 of its real 22 clubs: Real Sociedad B and Celta Fortuna are reserve sides that don't play the Copa del Rey, so they're left out. The promotion playoffs, Serie B's playout and the French barrages aren't played, so it's a straight swap. Most second division squads are thin in the game's data (only Pisa and Verona in Serie B, Nantes, Saint-Étienne and Reims in Ligue 2, and Girona and Mallorca in the Segunda have eight or more real players), so the rest get topped up with made up youth players, marked as made up. These squads are last season's players that each club's 2026-27 squad list still names, so summer signings at these clubs aren't in yet.",
          "Brazil's Serie A is 20 clubs over 38 rounds with four going down and the Copa do Brasil as its cup. Three simplifications: it plays on the game's August to May calendar like MLS does rather than Brazil's own January to December one, the Copa Libertadores is not modelled, so a Brazilian club's season is the league and the cup, and clubs level on points are split by goal difference then goals scored, where the real table looks at wins first.",
          "Liga MX is 18 clubs and nobody goes down, because relegation is suspended for 2026-27. Three simplifications: the Apertura and the Clausura are played as one 34 round double round robin with one champion, the Liguilla is not played (the board still asks a playoff club to finish in the top eight, the places that reach it), and clubs level on points are split by goal difference then goals scored, the real table's first two steps, and the game stops there. There is no cup, because the Copa MX has not been played since 2020, and the Leagues Cup is not modelled.",
          "The A-League Men is 12 clubs and nobody goes down, since Australia has no relegation. The real season is 26 games each (home and away plus four third meetings), and last season's finals series took the top six. Here it's a 22 round double round robin and the finals aren't played, so whoever tops the table wins it, and the board asks a contender to make the top six. The Australia Cup is for Australian clubs only from 2026, so Auckland FC and Wellington Phoenix play no cup at all, and with ten clubs in the draw six of them go straight to the quarter-finals. The squads are the twelve real 2026-27 squads, read in October 2026, and a player with no market value starts at the bottom of the rating scale rather than at a made up number. No Asian competition is modelled.",
          "The Russian Premier League is 16 clubs and 30 games. The bottom two go straight down; the real playoffs for the two places above them (13th and 14th against the fourth and third of the division below) aren't played. Russian clubs are suspended from UEFA's competitions, so the table hands out no European places. The Russian Cup really opens with groups for the top flight clubs; here it's a straight knockout with all sixteen in the draw. Clubs level on points are split by goal difference, then goals scored, where the real table looks at their games against each other first. Example: take Fakel Voronezh, finish 15th or 16th, and that goes on your record as a relegation, though the league keeps its sixteen clubs because the division below isn't in the game. The squads are the sixteen real 2026-27 squads, read in October 2026, every player found on at least two squad lists of his club, so a man on one list only isn't in. Eighteen players who still sit in another club's squad in the game (their old club) are left out for now rather than shown twice, and so are seven who share a name with a player the game already has.",
        ],
        subsections: [
          {
            heading: "Each past season is a sealed world",
            items: [
              "Each past era is a sealed world: real players and values from its own year, thin squads topped up with marked youth, no Conference League because it did not exist back then, and no 2026 player can leak into your market. Each era's giants rate like the legends they were, above anyone today: Messi and Ronaldo in 2015-16 and 2010-11, Ronaldinho and Henry in 2005-06. Money in 2020-21 was close to today's, so its stars rate about where they would now, Mbappé level with the best of 2026. Leicester still start 2015-16 at their honest pre-title level and 2005-06 boards still call the second European prize the UEFA Cup.",
            ],
          },
          {
            heading: "Starting from 24 generated players",
            items: [
              "A club you create starts with 24 generated players, honestly marked as made up. Every real player stays real, and the transfer market is where you sign them. Budgets run 15, 40 or 90 million pounds, and your backing sets your wage room. Start with a better squad than the money buys and it plays that well, but your made up players sell on at that money's squad prices, still rising as they improve. Every real player carries his real nationality, filterable by nation with real flags, resolved per era so a 2010 name never wears a 2026 flag.",
            ],
          },
        ],
      },
      {
        heading: "The board meter, the fan meter and the sack race",
        items: [
          "Two meters sit under the club name on every tab, words by default and the number out of 100 on tap. The board meter is the sack race itself: it opens at 60 in your first season, anywhere from 35 to 82 after that depending on how the last one went, and swings with results, cup runs, promises to the press and position against expectation. Safe is 60 and above, Under pressure is 10 to 59, under 10 reads One bad week from the sack, and at zero you are sacked. Only a result can sack you: a press answer or a handshake with another club can take the board to its last point, never to zero. The fan meter is read off this season's results (recent ones count most), your position against the club's expectation, the ticket policy and the trophies lifted this season: Singing at 65 and above, Grumbling from 40 to 64, Turning under 40, Hopeful before a ball is kicked.",
        ],
      },
      {
        heading: "League tables, the match engine and contracts",
        items: [
          "Every league table shows goals for and against as a pair, 25-23, beside the goal difference those two make.",
          "A Champions League knockout that is still level when the 90 minutes run out plays thirty minutes of extra time before it goes to penalties: the final when it is level on the night, a second leg when the tie is level on aggregate. In the seasons before 2021-22 away goals came first, so a tie level on aggregate but not on away goals is over at 90 with no extra time, and an away goal scored in extra time still counts as one, which leaves the home side needing two. The live match and the report mark it AET, and the bracket says the tie went to extra time. The domestic cup still goes straight to penalties, because the real cups do not all play extra time and the game does not guess which ones do.",
          "Live matches and quick sims use the same match engine. In a quick sim, the coach replaces injured players when a legal bench player and a substitution are available. At the break, the coach can also replace up to two tired or low-morale players with fresher ones who play that position, keeping one of the game's three substitutions for a later injury. After the break he looks at the bench twice more, around the hour and in the last twenty minutes: a booked player comes off first, then the most tired one, for a fresher player who plays that position, and only if the eleven is no weaker for it or you are two goals up. He never spends his last substitution or his last fit bench player on fresh legs. Calendar fast forwards use the same coach. Play live to make those calls yourself. The full time report names both clubs and shows the actual substitutions, stoppage time, possession and momentum. A goal from the penalty spot is marked (P) and an own goal (O.G) wherever a scorer is listed. An own goal sits under the club that got it, beside the defender or keeper who put it into his own net, nobody has it on his season, and the score is the one the match already had.",
          "For example, if your defender gets injured after 20 minutes and a fit defender is on the bench, quick sim brings him on at that point. The report shows who went off, who came on and when. If all three substitutions are already used, or nobody on the bench can play, the injured player cannot be replaced. Quick simming a match you paused only makes changes from the saved clock onward.",
        ],
        subsections: [
          {
            heading: "Wages, renewals and release clauses",
            items: [
              "Players carry contracts, wages, form, fitness and opinions. They retire, walk on expired deals unless you re-sign them at the contracts desk, and your academy feeds the first team if you invest in it. A renewal can trade 12 percent of the wage for a release clause at 1.5 times his value that day: any club can pay it, it cannot be refused, and only a later full price renewal deletes it.",
            ],
          },
        ],
      },
      {
        heading: "Facilities, finances and your backroom staff",
        items: [
          "The club has four facilities, stadium, training ground, medical and dressing room, each level 1 to 10 and each starting where the club's stature puts it: the giants on 8 to 10, most clubs on 1 or 2. Level 1 does nothing. Each level up is a small real lift (faster growth for players with room under their ceiling, shorter injury spells, quicker morale recovery, more food and drink money a head) paid from the transfer kitty at a price that climbs every level.",
        ],
        subsections: [
          {
            heading: "The finances desk and shirt sponsors",
            items: [
              "The finances desk sets ticket and food prices the fans and the board react to, takes one of four shirt sponsors (three honest shapes marked local or global, or a bad brand that pays 1.35 times the safe cheque and takes 6 off the fan meter for as long as the shirt carries it), lets you push any offer for six percent more until the brand walks, and projects the season's books to the last day: tickets, food, sponsor and sales in, player wages, staff wages, travel, signings, facilities and staff fees out. Wages and travel are running costs the board covers and never leave the transfer kitty.",
            ],
          },
          {
            heading: "Coaches and the lead scout",
            items: [
              "The staff room holds four made up people: an attack coach, a defence coach, a goalkeeping coach and a lead scout, each with a level 1 to 10 and a ceiling he can still reach, each starting where the club's stature puts it. Level 1 does nothing at all and neither does an empty chair, so the desk can only ever add. The attack coach speeds up the forwards and the number ten, the defence coach the back line and the holding midfielder, the goalkeeping coach the keepers, and the two coaches split the middle of the park between them, with nobody ever growing past his own ceiling. The lead scout lifts what your scouts bring back from the road. Hiring costs a fee and paying somebody off costs severance, both from the transfer kitty, or you can promote from your own academy staff for nothing and grow him yourself. Rival clubs come in for the good ones, you can match two offers a season, and an approach you ignore for two weeks takes the man with it.",
            ],
          },
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Newcastle and a Europa League target",
        paragraphs: [
          "You take Newcastle and the board asks you to qualify for the Europa League. A summer winger signing and a cup run to the semis keep confidence healthy even in seventh.",
        ],
      },
      {
        heading: "Founding an Eredivisie club on the biggest budget",
        paragraphs: [
          "Or you found a club in the Eredivisie on the biggest budget, and the board wants the title from day one, because a squad built with 90 million should win that league. In the Premier League the same money gets told to survive first, because that league is deeper than any wallet.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Fitness, mentality and the treatment room",
        items: [
          "Fitness is a resource. Starters drain it every match and recover on rest weeks, so rotate early.",
          "Attacking mentality raises goals at both ends, defensive strangles the game. Match it to the opponent.",
          "Injured starters get auto replaced, so check the treatment room before kickoff.",
        ],
      },
      {
        heading: "Choosing a league for a created club",
        items: [
          "Creating a club? The weaker the league you choose, the faster your money turns into trophies.",
        ],
      },
    ],
    faqs: [
      {
        q: "How exactly do I get sacked?",
        a: "The board meter in the header hits zero at a final whistle. Losses, sitting below the expected position, cup exits and promises to the press you broke drain it, while wins, trophies and cup runs refill it. Tap the meter for the number: under 10 it reads One bad week from the sack, and one bad week can genuinely take that much.",
      },
      {
        q: "Does my career save?",
        a: "Yes, on this device, and you can keep three managers going at once, each in its own slot. Close the tab mid season and the game resumes where you stopped.",
      },
      {
        q: "Are the players real?",
        a: "Yes, with real market values, in both eras. The only invented players are the ones the game clearly marks: youth padding, deep-future projections, and the starting squad of a club you create yourself.",
      },
      {
        q: "When do the transfer windows close?",
        a: "The calendar marks both. The summer window is open from kickoff and shuts at the final whistle of your fourth match (in 2020-21, which really kicked off late, it stays open until your last match before the real deadline of 5 October, a few matches longer); the January window opens in January and shuts after your third match from there, on the first Saturday of the new year in most leagues and a little later in a long one like the 24 club Championship, whose fixture list reaches January on its own. Deadline day wears a padlock on the grid, and every fast forward is a tap on a day that goes through the same rule.",
      },
      {
        q: "Do wages come out of my transfer budget?",
        a: "No. The projected finances screen lists player wages, staff wages and travel because a club pays them, but the board covers them and holds you to a wage ceiling on the contracts desk instead. Tickets, food and drink, the sponsor, transfers, facility upgrades and the fees and pay offs on the staff desk are the lines that move the kitty.",
      },
      {
        q: "Does quick simming a match give me a worse result than playing it?",
        a: "There is no quick sim penalty. Both ways use the same match engine, but quick sim now makes legal substitutions for injuries, for tired players at the break and for fresh legs after it. Those changes can affect the result, just as your own substitutions can in a live match. Play live if you want to choose the changes, shape and team talk yourself.",
      },
      {
        q: "The board wants a signing I cannot afford. Is that a bug?",
        a: "It should never happen, and there is a harness that walks every club in every era to prove it. Both asks are worked out from the market that save really has and the money you really hold, with spare targets on top, and the two together are checked against your pot before either goes on the board. If you genuinely cannot see a way to meet one, report it: the board is meant to ask for hard things, not impossible ones."
      },
      {
        q: "Why does the board ask for a 21 year old rated 80 rather than one who will reach 90?",
        a: "Because you can see age and rating on the market screen and you cannot see potential, so an ask about potential would be a lottery ticket rather than a target. The ceiling is still what the board is buying: a signing of 21 or under can add up to ten rating points as he grows, and about one in twelve is carrying a lot more than that."
      },
      {
        q: "Are the sponsors real companies?",
        a: "No. Every brand on the desk is invented, the good ones and the bad ones, and a harness checks the whole list against real sponsors, kit makers and bookmakers.",
      },
    ],
  },

};
