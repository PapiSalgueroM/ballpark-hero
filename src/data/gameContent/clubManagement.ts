import type { GameContentMap } from './types';

export const CLUB_MANAGEMENT_CONTENT: GameContentMap = {
  '/club-manager': {
    intro: [
      "Club Manager is the site's big one: a full management sim in your browser. 330 real clubs across 20 leagues in 17 countries, from the Premier League to the Danish Superliga, the Swiss Super League and Croatia's SuperSport HNL, over 3,600 real players with their real August 2026 ages and market values, and a board that talks like a board.",
      "Pick when you start too: today's game, or one of three real past seasons. 2015-16 is the year Leicester won it at 5000 to 1, with Vardy and Mahrez at their real pre-title values and MSN at Barcelona. 2010-11 is prime Messi and Rooney. 2005-06 is Ronaldinho's Ballon d'Or Barcelona with a 17 year old Messi, Mourinho's back to back Chelsea and Henry's Arsenal. The 2015-16 season holds all 60 clubs of that year's Premier League, La Liga and Serie A (Juventus mid five-in-a-row, Dybala newly arrived); the older seasons hold all 40 Premier League and La Liga clubs; every one carries hundreds of real players at their real ages and values from that year. Or found a club of your own: name it, design the crest, name the stadium, choose the money, and build it up by signing real players.",
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
          "Pick your era (today, 2015-16, 2010-11 or 2005-06), then your nation, your league, and your club. Every tile quotes what that board will actually demand.",
        ],
        subsections: [
          {
            heading: "Or found a club of your own",
            items: [
              "Or tap Create your own club: your name, your crest (shape, pattern, colors, initials), your stadium, and one of three budgets. Your club takes the league place of the division's weakest side.",
            ],
          },
        ],
      },
      {
        heading: "Match days: team sheet, Play Live or Quick Sim",
        items: [
          "Before each match set formation, mentality and your starting XI, or use auto pick, and give a team talk when it matters.",
          "Play the match one of two ways: Play Live puts it on the pitch with the dressing room at the break, and Quick Sim plays the same match without you and goes straight to the report. Then read the report, answer the press, and manage the dressing room between games.",
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
        ],
        subsections: [
          {
            heading: "Each past season is a sealed world",
            items: [
              "Each past era is a sealed world: real squads and values from its own year, no Conference League because it did not exist back then, and no 2026 player can leak into your market. Each era's giants rate like the legends they were, above anyone today: Messi and Ronaldo in 2015-16 and 2010-11, Ronaldinho and Henry in 2005-06, while Leicester start 2015-16 at their honest pre-title level and 2005-06 boards still call the second European prize the UEFA Cup.",
            ],
          },
          {
            heading: "Starting from 24 generated players",
            items: [
              "A club you create starts with 24 generated players, honestly marked as made up. Every real player stays real, and the transfer market is where you sign them. Budgets run 15, 40 or 90 million pounds. Every real player carries his real nationality, filterable by nation with real flags, resolved per era so a 2010 name never wears a 2026 flag.",
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
          "Playing a match live and quick simming it are the same simulation: both kick off through one engine and the only thing the live one adds is your say at the interval. The full time report reads like a scoreboard: both clubs named on every line, the stoppage time each half ran to (worked out from the goals, cards and injuries in that half), possession as two shares of a hundred, and a momentum graph drawn from who had the chances in each ten minutes rather than from the match's average.",
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
        a: "One save on this device. Close the tab mid season and the game resumes where you stopped.",
      },
      {
        q: "Are the players real?",
        a: "Yes, with real market values, in both eras. The only invented players are the ones the game clearly marks: youth padding, deep-future projections, and the starting squad of a club you create yourself.",
      },
      {
        q: "When do the transfer windows close?",
        a: "The calendar marks both. The summer window is open from kickoff and shuts at the final whistle of your fourth match; the January window opens in January and shuts after your third match from there, on the first Saturday of the new year in most leagues and a little later in a long one like the 24 club Championship, whose fixture list reaches January on its own. Deadline day wears a padlock on the grid, and every fast forward is a tap on a day that goes through the same rule.",
      },
      {
        q: "Do wages come out of my transfer budget?",
        a: "No. The projected finances screen lists player wages, staff wages and travel because a club pays them, but the board covers them and holds you to a wage ceiling on the contracts desk instead. Tickets, food and drink, the sponsor, transfers, facility upgrades and the fees and pay offs on the staff desk are the lines that move the kitty.",
      },
      {
        q: "Does quick simming a match give me a worse result than playing it?",
        a: "No. It is the same match. Both ways kick off through the same engine, so the same fixture on the same day plays out the same either way, and the only thing playing it live adds is the interval: your subs, your shape and your team talk. Change nothing at the break and the score is what the quick sim would have given you.",
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
