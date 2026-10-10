import type { GameContentMap } from './types';

// Pro football game guides. Casual human tone, no em dashes anywhere.
export const FOOTBALL_CONTENT: GameContentMap = {
  '/perfect-season-nfl': {
    intro: [
      "Spin a wheel of real pro football team seasons from 1999 to 2024, draft one player wherever it lands, and build a cross-era offense the sim then runs through a 17 game season.",
      "The fun is the mash-up: a 2007 Randy Moss catching passes from a 2013 Peyton Manning, rated on what each actually did that exact year.",
    ],
    headings: {
      howToPlay: "How to play 17-0 NFL Perfect Season, a free online football draft simulator",
      rules: "17-0 NFL Perfect Season rules: eras, ratings and the playoff push",
      example: "17-0 NFL Perfect Season walkthrough: a cross era draft and a 15 win season",
      tips: "17-0 NFL Perfect Season tips for building a stacked roster",
      faq: "17-0 NFL Perfect Season FAQ: daily mode, eras and the playoffs",
    },
    howToPlaySections: [
      {
        heading: "Choosing Classic, Hard or Daily mode",
        items: [
          "Pick a mode. Classic shows ratings, Hard hides them until the sim ends, Daily gives everyone the same wheel once a day.",
        ],
      },
      {
        heading: "Spinning the wheel for a team season",
        items: [
          "Spin. The wheel stops on a real team season and lists that squad's draftable players.",
        ],
      },
      {
        heading: "Filling your eight roster slots",
        items: [
          "Draft one player into an open slot. You fill 8: QB, RB, two receivers, tight end, flex, defense unit, head coach.",
        ],
        subsections: [
          {
            heading: "Using your two rerolls on a dud squad",
            items: [
              "Repeat until the roster is full. No name repeats, and you get 2 rerolls per run for dud squads.",
            ],
          },
        ],
      },
      {
        heading: "Watching the season sim and sharing it",
        items: [
          "Watch the 17 game sim reveal, then share the result or run it back.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "The wheel's full era span",
        items: [
          "The wheel spans 1999 through 2024. Decade Mode can pin Classic and Hard runs to the 2000s, 2010s, or 2020s.",
        ],
      },
      {
        heading: "How ratings come from real stats",
        items: [
          "Ratings run 40 to 99, built from real per game stats with an era adjustment.",
        ],
      },
      {
        heading: "Reaching the playoffs at 12 wins",
        items: [
          "Win 12 or more games to enter the playoffs: Wild Card, Divisional Round, Conference Championship, Super Bowl.",
        ],
      },
      {
        heading: "Daily mode and the midnight reset",
        items: [
          "Daily is one attempt that locks when the result lands. A fresh themed wheel arrives at midnight Eastern.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "A cross era draft comes together",
        paragraphs: [
          "Your first spin lands on the 2007 Patriots, so you grab Randy Moss. Later the 2013 Broncos deliver Peyton Manning, and a reroll digs up an elite defense for the last slot.",
        ],
      },
      {
        heading: "The finished squad's 15 win season",
        paragraphs: [
          "The finished 87 overall squad, better than nine drafts in ten, starts 9 and 0, drops one game by a field goal, and lands at 15-2. Division winner, playoff run, no banner. At 87 a 17-0 comes about one run in 25, so you spin again.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Spending big at the quarterback slot",
        items: [
          "Spend big on quarterback. That slot is weighted heaviest in your team overall.",
        ],
      },
      {
        heading: "Not punting on defense and coach",
        items: [
          "Do not punt on defense and coach. A bad sideline drags every Sunday down.",
        ],
      },
      {
        heading: "Treating 15 wins as a great run",
        items: [
          "A typical well drafted roster, around 82, goes 17-0 about one run in 1,100, and even an 88 only about one run in 14, so treat 15 wins as a good day.",
        ],
      },
    ],
    faqs: [
      {
        q: "What seasons can the wheel land on?",
        a: "Real team seasons from 1999 through 2024, with era-correct names like the San Diego Chargers.",
      },
      {
        q: "What happens after the regular season?",
        a: "Reach 12 wins and the sim plays four playoff rounds. Win them all for a banner and a Super Bowl MVP named from your roster.",
      },
      {
        q: "How is Hard mode different?",
        a: "Ratings show as question marks until the sim ends, so you draft on reputation alone.",
      },
    ],
  },

  '/front-office': {
    intro: [
      "Somebody has to make the hard calls, and here that somebody is you. Take over any of the 32 clubs and run it all: the cap, free agency, trades, the draft.",
      "The league moves around you: rivals sign players, stars get hurt in December, dynasties get built one contract at a time.",
    ],
    headings: {
      howToPlay: "How to play NFL Front Office, a free online NFL GM simulation game",
      rules: "NFL Front Office rules: the cap, the mandate and the draft",
      example: "NFL Front Office walkthrough: a rebuild that reaches the one seed",
      tips: "NFL Front Office tips for building a roster that contends",
      faq: "NFL Front Office FAQ: trades, firing and real rosters",
    },
    howToPlaySections: [
      {
        heading: "Picking a franchise under the salary cap",
        items: [
          "Pick a franchise and you get the whole club: every man on its real 53 (kickers, punters and long snappers sit out for now) plus its practice squad. Every player carries a fictional contract, and all 53 fit under a 301.2 million dollar cap that rises 5 percent each season.",
        ],
      },
      {
        heading: "Reading your ownership mandate",
        items: [
          "Read the ownership mandate. A loaded roster is told to win the Super Bowl, a mid one to make the playoffs, a bare one to hit an honest win number. It resets every offseason from where your roster really stands.",
        ],
      },
      {
        heading: "Shaping the roster with cuts, signings and trades",
        items: [
          "Shape the roster: cut bloated deals, sign free agents, and take trades to the phone: the other GM counters like a person, asking for a pick, offering a lesser man, or hanging up.",
        ],
        subsections: [
          {
            heading: "Playing weeks with a live pace read",
            items: [
              "Play week by week as scores, injuries, and rival moves roll in, with a live read on whether you are on pace for the mandate.",
            ],
          },
        ],
      },
      {
        heading: "Setting the depth chart from the roster",
        items: [
          "Open the depth chart from the Roster box: 8 position groups (QB, RB, WR, TE, OL, DL, LB, DB), each in the order the sim reads. Tap a man, then tap the one to swap him with. The men marked starts are the ones team strength counts, so benching a better man costs you and promoting a hidden gem pays. Injured men are skipped and the next man steps up. Anyone who joins later (a signing, a pick, a trade) slots in by his rating, so a better newcomer starts right away, and Sort by rating hands a group back to the sim.",
        ],
      },
      {
        heading: "Working a 53 man roster and the practice squad",
        items: [
          "The Roster box opens on one tile per position group plus one for the practice squad, so fifty men never turn into one long list. The men at the top of each group's depth chart start, the bench steps in when a starter gets hurt, and the practice squad sits off the cap until you call a man up. A call-up needs a roster spot and room for his displayed fictional salary, including dead money. The roster holds 53: at the limit you cut or trade before you can sign anybody.",
        ],
      },
      {
        heading: "Drafting rookies after the Super Bowl",
        items: [
          "After the Super Bowl, use the draft picks your team still owns. Trading a pick away costs a selection in your next draft. If you traded them all away, decide the franchise tag, then run the league draft and offseason. Scout grades can lie. Defensive picks join your roster like every other selection.",
        ],
      },
      {
        heading: "Using the franchise tag before free agency",
        items: [
          "On the draft screen, before your last pick opens free agency, tag one man whose deal is up. The card shows every expiring contract with its tag price, and the button says why when a tag is refused.",
        ],
      },
      {
        heading: "Running the GM desk: a coach, a contract and a deadline deal",
        items: [
          "Under the hub's own boxes sit four more: Staff, Re-sign desk, Draft picks and Trade desk. A new franchise opens with them on, and an older save plays on as it did until you open one. Say you hire a level 7 offensive coordinator off the Staff shortlist: his points land on the offense, which is 72 percent of how this game rates a team, so the club gets a little stronger every week. The computer clubs have no staff edge, so even the staff you start with is a step up on them. Your first round pick's rookie deal runs out this spring, so the Re-sign desk offers his fifth year option: one guaranteed season, priced off his rating. Pick it up, or keep him at his ask, push once with your own number, or let him go. At Week 8 you call a club that is well out of the playoff places, which makes it a seller: it marks its veterans down and wants picks and young players. So you send a young depth receiver and a third rounder for its veteran corner. Where you sit in the standings changes nothing in the price, only where they sit does. The receiver's contract goes with him, and 15 percent of his salary for every season he had left stays on your cap this year as dead money, never more than cutting him would have left. Wait until Week 10 is played and the deadline has shut every deal until the season is over. The money is this game's own, never a real contract.",
        ],
      },
      {
        heading: "Running the offseason between titles",
        items: [
          "Run the offseason, where young players grow and veterans fade, then chase the next title. Seasons are unlimited, as long as ownership keeps you.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "The 17 week regular season",
        items: [
          "The season runs 17 weeks: home and away against your division rivals plus 11 crossover games.",
        ],
      },
      {
        heading: "The real 14 team playoff format",
        items: [
          "Playoffs use the real 14 team format: 7 seeds per conference, byes for the 1 seeds, four knockout rounds.",
        ],
      },
      {
        heading: "How trade grades favor quarterbacks",
        items: [
          "Trades are judged on rating, age, and position, with quarterbacks at a premium. The AI only accepts a clear win.",
        ],
      },
      {
        heading: "Grade misses, injuries and the roster floor",
        items: [
          "Grades can miss by up to 4 points either way, injuries cost players 1 to 4 weeks, and rosters cannot drop below six players.",
        ],
      },
      {
        heading: "Cutting a player and the dead money",
        items: [
          "A cut is not free. Half the man's salary stays on this season's cap as dead money, a quarter lands on next season's if he had years left, and you cannot sign him back until the offseason. A tagged man is fully guaranteed, so cutting him puts his whole salary on the cap.",
        ],
      },
      {
        heading: "Tagged stars and who walks",
        items: [
          "One franchise tag per offseason, built on the real NFL rule: a one year, fully guaranteed deal at the average of the 5 largest salaries at his position across the league or 120 percent of his current salary, whichever is more. A man tagged two years running costs at least 120 percent of the first tag. A tagged man cannot leave in free agency. Rival clubs tag too, roughly a third of them each offseason. Untagged men whose deals are up can walk: role players rated under 76 half the time, stars 15 percent of the time.",
        ],
      },
      {
        heading: "How your starters set team strength",
        items: [
          "Team strength reads starters off the depth chart. Each group puts up the men at the top of its order (1 quarterback, 2 backs, 3 receivers, 1 tight end, 2 linemen, and 2 each of DL, LB and DB), and the sim counts the quarterback, the best 5 of those 6 skill men, both linemen and all 6 defenders. Rating decides how many of the skill slots each group gets; your order decides who fills them. A chart you have not touched is the order by rating. The bench only plays when a starter is hurt or you move a backup up the chart, so carrying the whole 53 changes nobody's strength. A five man line and real formations are still to come.",
          "A save started before full rosters keeps its fifteen men and reads every healthy lineman, exactly as it always did. It is never topped up: start a new front office to get the whole club.",
        ],
      },
      {
        heading: "The 53 man limit and the offseason refill",
        items: [
          "Every offseason each position group is refilled to its real size. The club calls up its own practice squad first and only signs a generated depth man when the squad has nobody left at that spot. A computer club the draft takes over 53 releases its lowest rated men who do not start, dead money and all, never a starter. Your club is never cut behind your back: if your picks take you over 53, the board tells you how many you owe and Play waits until you have cut down yourself. The Giants open at 54, because a starter on injured reserve still counts, so a Giants GM owes one cut before Week 1.",
        ],
      },
      {
        heading: "Trust upstairs and getting fired",
        items: [
          "Trust upstairs runs 0 to 100. Beating the mandate raises it, missing it drops it, a championship fixes almost anything, and at zero you are fired and the save ends. A fresh GM always survives one bad year, never three.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Rebuilding a bad roster from scratch",
        paragraphs: [
          "You inherit a 6-11 roster with no cap room, cut an aging receiver, and sign the best lineman available. When your quarterback goes down, you flip a backup and a pick for a veteran starter.",
        ],
      },
      {
        heading: "Riding a late blooming pick to the one seed",
        paragraphs: [
          "You sneak in as a 7 seed, lose the Wild Card game, then watch a 90 grade tackle turn out an 84 while the round 3 receiver you almost skipped blooms into an 86. Two years on, you are the 1 seed.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Building the roster around your quarterback",
        items: [
          "Build around the quarterback. Team strength leans on that slot more than anything else.",
        ],
      },
      {
        heading: "Betting on upside over aging veterans",
        items: [
          "Young players with hidden upside beat expensive 31 year olds, because decline starts there and never stops.",
        ],
      },
      {
        heading: "Knowing when you hold trade leverage",
        items: [
          "In trade talks, stand firm only when you hold leverage: a young piece, or a partner thin at his position. Push a weak hand and the price goes up.",
        ],
      },
    ],
    faqs: [
      {
        q: "Are the players real?",
        a: "The opening names and roster places come from a dated 2026 snapshot. New franchise OVRs are original simulation estimates, not official ratings or historical statistics. One position-specific method covers starters, backups and practice players using 2023 to 2025 evidence, recent seasons weighted more heavily. Passing efficiency, receiving and rushing production, playing time and limited defensive measures inform the estimate; small samples have less weight and missing metrics are not zeros. A quarterback, back, receiver or tight end is read on three things: how well he played, how much of the work he carried and what he produced a game in 2025, off two published stat sources. A fullback is not rated as a ball carrier, so he sits low on the running back shelf with the e. Linemen use participation and draft priors, which cannot measure blocking. An e marks limited evidence, and a player's row explains his opening basis. Later development belongs to your saved simulation. Existing franchises keep their own ratings and contracts. Salaries, trades, future prospects and game outcomes are fictional.",
      },
      {
        q: "Can I get fired?",
        a: "Yes. Ownership sets a mandate from your roster's honest strength, grades it every season, and tracks trust from 0 to 100. Miss badly enough for long enough and the seat goes, the save ends, and you take another front office.",
      },
      {
        q: "Does my franchise save?",
        a: "Automatically, in your browser, after every move. The abandon button wipes it for a fresh start.",
      },
    ],
  },

  '/nfl-my-career': {
    intro: [
      "Every draft night some kid hugs his mom and walks into an unwritten life. Here you get that life: create a fictional prospect, get drafted by a real team, and play a whole career, up to three big calls every offseason.",
      "Seasons produce realistic stat lines from your rating, health, and team. Between them come up to three crossroads, one at a time, drawn from over a hundred of them: contracts, trade requests, surgeries, rookie hazing, a mural in your name, and a podcast invite the front office will hate.",
      "You build your player's actual face before the draft, and there is a dirty side waiting whenever you want it. Selling the injury report to an offshore book, a bounty pool in the meeting room, a clinic in Arizona running a program the league cannot test for yet. Every dirty choice raises a hidden league security meter, and at the top of it sits an indefinite suspension and a comeback from the minimum.",
    ],
    headings: {
      howToPlay: "How to play NFL My Career, a free online NFL career simulation game",
      rules: "NFL My Career rules: growth, aging and the security meter",
      example: "NFL My Career walkthrough: a quarterback's road to a ring",
      tips: "NFL My Career tips for building a Hall of Fame legacy",
      faq: "NFL My Career FAQ: positions, free agency and the Bank",
    },
    howToPlaySections: [
      {
        heading: "Creating your player",
        items: [
          "Create your player: name, one of 8 positions (QB, RB, WR, TE, LB, CB, EDGE, K), and an archetype like Cannon Arm, Island Corner, Speed Bender or Ice in December that sets ceiling and durability.",
        ],
        subsections: [
          {
            heading: "Picking today's NFL or the 2005 throwback",
            items: [
              "Pick your league: today's NFL, or the 2005 throwback with the Raiders in Oakland, the Chargers in San Diego and the Rams in St. Louis.",
            ],
          },
          {
            heading: "Building your look or hitting surprise me",
            items: [
              "Build your look: skin tone, hair, beard, accessories and a signature celebration, or hit Surprise me.",
            ],
          },
        ],
      },
      {
        heading: "Entering the draft and winning a job",
        items: [
          "Enter the draft. Your hidden rating decides the slot, and a real team calls your name.",
        ],
        subsections: [
          {
            heading: "Winning your job over the incumbent",
            items: [
              "Check the depth chart. Top twelve picks open as starters; everyone else fights the incumbent in camp, every single summer, and backup seasons are spot duty until you take the job.",
            ],
          },
        ],
      },
      {
        heading: "Playing seasons one tap at a time",
        items: [
          "Play each season with one tap: yards, touchdowns, awards, how far the team went.",
          "Open Career Log and pick a year to review its saved overview, regular season and postseason. Changes compare with the previous saved season; older missing values say Not recorded. Back to seasons returns to the year tiles, and Review seasons is available after retirement.",
        ],
        subsections: [
          {
            heading: "Working a real free agency window",
            items: [
              "When the deal expires, work a real free agency window: competing offers from named teams with their own money, length and roster quality, and one push for more on any of them.",
            ],
          },
        ],
      },
      {
        heading: "Making tough offseason calls",
        items: [
          "Make up to three offseason calls, one card at a time: train skills or body, fix the knee or play through it, take the envelope or report it. Only the first card of a summer can move your rating, and a card you just saw rests for a while before it comes back (press moments follow your season, so those can come right back).",
          "After a normal offseason choice, the result shows the actual changes. Expand it for any extra changes, then Continue opens the next card, or takes you back to your career after the last one, without applying the choice again.",
        ],
        subsections: [
          {
            heading: "Banking, investing and the card school",
            items: [
              "Open the Bank between seasons. Savings pays 2.5% a season and never loses, five things you can put money into each have a price that moves every season whether you look or not (a fund, flats back home, two shares and a coin that halves as often as it doubles), the statement keeps your last 12 moves, and the card school in the locker room is one sitting a season on odds that are printed before you sit in.",
            ],
          },
          {
            heading: "Spending money across seven store aisles",
            items: [
              "Spend the money in 7 aisles: home, rides, investments, body, flex, family, and a shady aisle that only appears once you have something to hide.",
            ],
          },
        ],
      },
      {
        heading: "Following the news through retirement",
        items: [
          "Read the News box. The paper writes up every season in your own position's stat, the SocialGram shows followers read off your fanbase with three fan comments under the latest post, and the rival's card keeps the head to head against the player drafted the same year as you.",
          "From 30, a falling rating brings the retirement talk: stop now, play one more year, or announce a farewell season. Then the legacy verdict, and the Hall of Fame wait one ballot at a time.",
        ],
        subsections: [
          {
            heading: "Filling the Trophy Case with badges",
            items: [
              "Collect badges in the Trophy Case: 25 of them, from a first ring and Rookie of the Year to 10,000 passing yards, a 20 sack season and $100M to your name, each lit the moment the facts of your career say so.",
            ],
          },
          {
            heading: "Answering your phone on the football calendar",
            items: [
              "Answer your phone. Texts from your agent, the head coach, the GM, a teammate or your mom land on the beats of the football year: draft night, camp, the bye, the trade deadline, the playoffs if you get there, the offseason, and the summer before the last year of your deal. Every text says which beat and which year it came in on, and how you answer moves your karma, morale, fanbase or bank.",
            ],
          },
          {
            heading: "Making the call when your rival forces one",
            items: [
              "Some seasons your rival puts a decision in front of you instead of a story: a late hit you can answer or let go, a debate show offering real money, a youth camp his foundation wants you to co-host. Every button prints exactly what it moves, and a gamble prints its odds.",
            ],
          },
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Growth, ratings and aging by position",
        items: [
          "You start at 22 on a 4 year rookie deal. Growth is slow and honest, 1 to 2 rating points a year through age 26 with a late bloomer chance after that, and the last few points above 88 are the hardest in the game.",
        ],
        subsections: [
          {
            heading: "How each position ages and declines",
            items: [
              "Every position has its own stat line, its own awards and its own aging curve. Running backs fall off at 28, corners at 30, quarterbacks at 34, kickers at 39. Defenders chase Defensive Player of the Year instead of MVP, and kickers chase neither.",
              "Decline starts at 31, or 28 for running backs, and it hits them harder.",
            ],
          },
        ],
      },
      {
        heading: "Money rules and the league security meter",
        items: [
          "The league security meter runs 0 to 100 and cools 9 a year while you stay clean. Unexplained money keeps it warm. At 65 they open a file on you, at 90 you are suspended indefinitely, you lose the season, the money is seized, and you come back on a minimum deal if anyone calls.",
          "Money has rules of its own. There is a 1% fee on both sides of every trade and a $100k floor in the account that cannot be invested away; a season that leaves you under the floor is covered out of savings first, then by a forced sale of holdings at whatever the price is that day. Cards win 42% of hands and a win pays 1.15x the stake, the most you can stake is $50k or 4% of your cash, and once you are $500k down for your career the guys stop dealing you in for good. Keep sitting in while you are losing and somebody at home notices, which costs morale and fanbase.",
        ],
      },
      {
        heading: "Injuries and when retirement is forced",
        items: [
          "Injuries can erase 2 to 10 games a season and leave permanent wear on your health bar.",
          "Retirement is forced at rating 64, age 40, 34 for backs, or 19 seasons. Before that, from 30, slipping 8 points off your best (or down to 70) brings the talk: retire now, one more year, or a farewell season that ends the career after it. You can walk away after 6, and progress saves automatically.",
          "Hall of Fame voters weigh the hardware first (rings, the major awards, All-Pro years), then your seasons and your numbers, and a career total near the top of this game's books in a stat your position really piles up (passing yards for a quarterback, catches for a receiver, interceptions for a corner, tackles for a linebacker, though a kicker and an edge rusher get none) earns a push of its own, up to 390 legacy points.",
          "Example: take a corner with ordinary numbers and one with the same hardware and more interceptions than 99 of 100 corners this game has seen. The second scores at least 300 legacy points more, which can be the whole gap between a long wait and the Hall. A career you already retired keeps the ballot it was told.",
        ],
        subsections: [
          {
            heading: "Why the depth chart never guesses at fairness",
            items: [
              "The depth chart is real: the man ahead of you is as good as your team is, camps have memory (a starter is not benched over a small gap, a backup does not need a miracle), backup quarterbacks hold clipboards, and signing with a stacked contender can cost a mid player the job. Kickers never sit.",
            ],
          },
        ],
      },
      {
        heading: "How the press and fans read your season",
        items: [
          "The press reads your actual season: win it all and you take the podium, collapse and you face the accountability scrum, ride the bench and someone asks the role question. Every presser is three answers, safe, honest or fiery, and the fiery one genuinely gambles your fanbase.",
          "The fans nag you for the thing your position is judged on and never the other way round: a quarterback hears touchdowns, a corner hears lock down that side, a kicker hears just make the kicks.",
        ],
      },
      {
        heading: "The phone's calendar and your rival's choices",
        items: [
          "Texts only arrive on beats your season really had. No playoff texts in a year you went home in January, no contract year texts with years left on the deal, and draft night's text lands before you play a down. One text a beat, up to three a season, fewer while old ones sit unanswered, and the same text never comes twice in a career.",
          "A season with no rival story has a 45% shot at a rival choice instead, never both in one year, and you see every choice once before any of them comes round again. A button does exactly what it says: morale, fanbase, net worth, karma or the heat of the feud. Morale carries straight into how well you play next season.",
        ],
      },
      {
        heading: "Playing inside the 2005 sealed world",
        items: [
          "The 2005 throwback is a sealed world: all 32 franchises exactly as they stood that season, verified against the real records, and every draft, trade and signing stays inside it. Contracts pay 2005 money, about a third of today's.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Reading an actual capped change",
        paragraphs: [
          "Say Health is 98 before a recovery choice that adds 10. The 100 cap makes the result 98 to 100, so the card shows +2. Continue moves you on (to the next card, or back to your career after the last one) with Health still at 100.",
        ],
      },
      {
        heading: "A Dual Threat quarterback's rookie leap",
        paragraphs: [
          "You make a Dual Threat quarterback and go 12th overall to a shaky roster. The leap comes at 25: 4,000 plus yards, an All-Pro nod, a run that dies in the Championship game. At contract time you take the discount.",
        ],
      },
      {
        heading: "Playing through a knee injury to a ring",
        paragraphs: [
          "At 28 the knee starts talking. You play through it, lose four games, and demand a trade. The ring comes at 31, you retire at 35 with one MVP, and the verdict reads Hall of Famer.",
        ],
      },
      {
        heading: "Answering your rival's late hit",
        paragraphs: [
          "Your rival drills you a second after the whistle and the card asks what you do about it. Settle it next time heats the feud and usually pays Morale +8, but it carries a 30% chance you draw the flag yourself (Morale -5, Fanbase -5, Net worth -$100k). Shake it off on camera is Fanbase +5, Karma +5 and the feud cools. You pick say nothing and watch the film: Morale +6, the feud heats up, and those six points ride into next season's stat line.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Cashing in early at running back",
        items: [
          "Running back careers are a sprint. Cash in early, because the cliff at 28 is real.",
        ],
      },
      {
        heading: "Why body work protects everything else",
        items: [
          "Body work is boring and correct. Health protects games played, and games played protect everything else.",
        ],
      },
      {
        heading: "MVPs and rings over stat padding",
        items: [
          "MVPs move the legacy score most, rings close behind. Stat padding on bad teams only goes so far.",
        ],
      },
      {
        heading: "Choosing between a contender and the money",
        items: [
          "In free agency the contender offers less and the rebuild offers more. The roster number on the card is the exact quality your next seasons run on, so you are choosing between money and January.",
        ],
      },
    ],
    faqs: [
      {
        q: "Which positions can I play?",
        a: "Eight of them: QB, RB, WR, TE, LB, CB, EDGE and K, each with its own archetypes, stat line, awards and aging curve.",
      },
      {
        q: "Can I start in a different era?",
        a: "Yes. The create screen has a 2005 throwback: the league exactly as it stood that season, with the Raiders in Oakland, the Chargers in San Diego and the Rams in St. Louis. An era career never meets a franchise that did not exist yet, and the money is 2005 sized.",
      },
      {
        q: "How does free agency work?",
        a: "When your deal is up you get a window of real offers: your team's re-sign number plus named suitors, each with its own salary, length and roster quality. Contenders lowball because they can, rebuilds overpay because they must. You can push any offer for more once, but push a weak case and it can be pulled. Your own team never walks away, so you always have somewhere to sign.",
      },
      {
        q: "Why am I not starting?",
        a: "Because the man ahead of you is better, for now. Late picks usually open on the bench behind an incumbent whose level tracks your team's quality. Grow your rating and you will win a camp; backup years are spot duty with slower fame and sagging morale, which is exactly why they sting. A rebuild with a bare roster is the fastest route to the job.",
      },
      {
        q: "What decides the legacy verdict?",
        a: "Rings, MVPs, All-Pro nods, seasons played, and stat totals, on a scale from cup of coffee to inner circle immortal.",
      },
      {
        q: "What is in the Bank?",
        a: "Four tabs. Account holds your cash, a savings account that pays 2.5% a season, and a statement of your last 12 moves. Market is five prices that move every season, each with its own risk word and a read on whether it is cheap or dear against what it usually goes for. Cards is the locker room card school, one sitting a season, on odds the screen prints before you play. Shop is the 7 aisles. It is the same engine Soccer Career's phone runs on, in dollars.",
      },
      {
        q: "Who is my rival?",
        a: "A generated player drafted the same year at your position. He plays his own seasons on the same scale you do, can win a ring before you and retire before you, and the head to head is kept for good. He is fictional, like your own player, so no real player's career is being simulated.",
      },
      {
        q: "How do I earn badges?",
        a: "By doing the thing. Each of the 25 badges is a test on the facts of your career, checked every time you open the case: a ring, an MVP, ten thousand yards, five full seasons without a missed game, a million dollars to your name. The three single season badges sit just under the real records, 5,000 passing yards against Peyton Manning's 5,477, 2,000 rushing yards against Eric Dickerson's 2,105 and 20 sacks against Myles Garrett's 23, and the ten All-Pro badge is the mark Jerry Rice and Jim Otto share.",
      },
    ],
  },

  '/football-grid': {
    intro: [
      "The grid looks harmless: three rows, three columns, nine cells. Each row and column is a pro football criterion, a franchise, a position group, a draft story, a Super Bowl ring, and every cell needs a player who satisfies both. Then you learn that naming an undrafted Cowboys quarterback is harder than it sounds.",
      "If daily team grids ever owned your mornings, this is that same itch with a twist: a rarity score that rewards deep cuts over obvious answers. Anyone can finish a grid with superstars. Finishing it with the forgotten third receiver from 2009 is the flex.",
      "A new puzzle drops at midnight Eastern, and everyone plays the same one.",
    ],
    headings: {
      howToPlay: "How to play NFL Grid, a free online NFL trivia grid puzzle",
      rules: "NFL Grid rules: guesses, rarity scores and the daily puzzle",
      example: "NFL Grid walkthrough: chasing rarity across nine cells",
      tips: "NFL Grid tips for filling every cell without wasting guesses",
      faq: "NFL Grid FAQ: rarity scores, guesses and categories",
    },
    howToPlaySections: [
      {
        heading: "Reading the row and column criteria",
        items: [
          "Read the three row and three column criteria. A cell crossing Played for Packers with Won Super Bowl needs a player who did both.",
        ],
      },
      {
        heading: "Typing a name into each cell",
        items: [
          "Tap a cell, start typing a name, and pick the player from the suggestions.",
        ],
      },
      {
        heading: "Watching cells lock green or flash red",
        items: [
          "Correct answers lock in green with a rarity percentage. Wrong ones flash red.",
        ],
      },
      {
        heading: "Budgeting your 15 guesses",
        items: [
          "Budget carefully: you get 15 guesses for all 9 cells, and every submission counts, so you can only afford 6 misses.",
        ],
        subsections: [
          {
            heading: "Finishing the grid and sharing your score",
            items: [
              "Fill all nine cells to complete the grid, then share the emoji board and your rarity score.",
            ],
          },
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Why every answer must fit twice",
        items: [
          "Every answer must match its row and its column at the same time.",
        ],
      },
      {
        heading: "The 15 guess budget and unlimited practice",
        items: [
          "You get 15 total guesses, right or wrong. An unlimited guesses toggle exists for stress-free practice.",
        ],
      },
      {
        heading: "How your Rarity Score gets calculated",
        items: [
          "Each correct pick shows what percent of players chose that same name for that cell. Your Rarity Score is the average across your correct cells, and lower is better.",
        ],
      },
      {
        heading: "Checking answers against 22,000 careers",
        items: [
          "Every answer is checked against a career record of 22,000 players going back to 1970, right in your browser, so a guess is judged the instant you pick it.",
        ],
        subsections: [
          {
            heading: "One shared daily puzzle with saved progress",
            items: [
              "One shared puzzle per day, with your progress saved if you leave and come back.",
            ],
          },
        ],
      },
    ],
    exampleSections: [
      {
        heading: "The trap of a double eligible answer",
        paragraphs: [
          "Take rows of Patriots, Cowboys, and Packers against columns of Quarterback, Undrafted, and Won a Super Bowl. Most people type Tony Romo for the Cowboys quarterback cell and collect a fat common percentage; he answers the undrafted cell just as well, and using him twice is not allowed, so you have to choose.",
        ],
      },
      {
        heading: "Finding rarer names for busy cells",
        paragraphs: [
          "Patriots plus Won a Super Bowl is a Tom Brady magnet, so you go Corey Dillon, who carried the 2004 champs, and score single digits. Packers plus Undrafted has Tramon Williams waiting, and Packers plus Won a Super Bowl is Aaron Rodgers for everyone else, so you pick James Jones, the receiver from the 2010 champs, and the search box shows him with his seasons beside his name because four James Joneses have played in the league.",
        ],
      },
      {
        heading: "Nine cells closed and one final score",
        paragraphs: [
          "You close it 9 for 9 with two guesses to spare, and the nine percentages average out to 24. That number goes straight to the group chat.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Scanning for the hardest crossing first",
        items: [
          "Scan the whole grid before guessing. Find the hardest crossing and save your flexible answers for it.",
        ],
      },
      {
        heading: "Why journeymen cover more cells",
        items: [
          "Journeymen are gold. A four franchise veteran covers cells a one team legend never could.",
        ],
      },
      {
        heading: "Changing angles after a missed guess",
        items: [
          "If a name misses, change angles. Do not spend a second guess on a teammate from the same hunch.",
        ],
      },
      {
        heading: "Choosing a finished grid over rare picks",
        items: [
          "Chasing rarity is fun, but 9 of 9 with boring answers always beats 7 of 9 with cool ones.",
        ],
      },
    ],
    faqs: [
      {
        q: "How does the rarity score work?",
        a: "Every correct cell shows the percentage of players who picked that same name there, based on real picks on the same puzzle. Your score averages those numbers, so lower means rarer, and rarer is the brag.",
      },
      {
        q: "Do correct answers use up guesses too?",
        a: "Yes. The 15 guess budget counts every submission, so a perfect game spends 9 and leaves room for exactly 6 mistakes.",
      },
      {
        q: "What categories show up?",
        a: "All 32 franchises, with relocations folded in so the Oilers count as the Titans, plus position groups, draft stories like undrafted or first round, and Super Bowl winners. Every one is answered from a career record of 22,000 players going back to 1970, so a cell never depends on a guess about a guess.",
      },
      {
        q: "What happens when I run out of guesses?",
        a: "The grid ends and you keep the cells you filled plus their rarity score. A fresh grid lands at midnight Eastern.",
      },
      {
        q: "Is this the same as the baseball grid?",
        a: "Same core idea, pointed at football history instead, with crowd sourced rarity built in and an unlimited mode for practice.",
      },
    ],
  },

  '/nfl-career': {
    intro: [
      "One mystery pro football player, six career clues, and a score that shrinks every time you need another hint. You start with nothing but a draft round and a year, and it becomes a staring contest with your own memory.",
      "The clue order is the difficulty curve. Draft info could be thousands of guys. The full team history should feel obvious, which is exactly why solving early feels so good.",
    ],
    headings: {
      howToPlay: "How to play NFL Career Path, a free daily NFL guessing game",
      rules: "NFL Career Path rules: clues, scoring and difficulty",
      example: "NFL Career Path walkthrough: solving a sixth round mystery",
      tips: "NFL Career Path tips for reading every clue right",
      faq: "NFL Career Path FAQ: daily puzzles and hard mode",
    },
    howToPlaySections: [
      {
        heading: "Reading the draft round and year clue",
        items: [
          "Read clue one: the round and year the mystery player was drafted.",
        ],
      },
      {
        heading: "Typing a guess whenever you feel sure",
        items: [
          "Type a guess in the search box whenever you feel sure.",
        ],
      },
      {
        heading: "Unlocking clues in a fixed order",
        items: [
          "Every wrong guess reveals the next clue, in a fixed order: draft, college, first team, career stat, team history, jersey numbers.",
        ],
        subsections: [
          {
            heading: "Scoring more points for an early solve",
            items: [
              "Solve early for more points. A first clue solve scores 6, and each extra clue costs one.",
            ],
          },
        ],
      },
      {
        heading: "What happens after the sixth clue",
        items: [
          "A wrong guess after the sixth clue ends the game and reveals the player.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Six clues and six total guesses",
        items: [
          "There are 6 clues and 6 guesses, one wrong answer per clue.",
        ],
      },
      {
        heading: "Scoring from six points down to one",
        items: [
          "Scoring runs from 6 points for a first clue solve down to 1 on the last.",
        ],
      },
      {
        heading: "Daily puzzles versus unlimited mode",
        items: [
          "Daily serves everyone the same mystery player, fresh every day. Unlimited deals random players back to back.",
        ],
        subsections: [
          {
            heading: "How Hard mode hides the early clues",
            items: [
              "Hard mode hides the earliest clues once new ones arrive, so you cannot lean on the whole stack.",
            ],
          },
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Narrowing a sixth round draft class",
        paragraphs: [
          "Clue one says Round 6, 2000. One sixth rounder from that class towers over the rest, but you wait for clue two anyway: Michigan. That settles it.",
        ],
      },
      {
        heading: "Naming Tom Brady on the second clue",
        paragraphs: [
          "You type Tom Brady and take 5 points for a two clue solve. In hindsight the first clue was enough, and the missing point will bother you all day.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Reading draft position as a loaded clue",
        items: [
          "Draft position is loaded information. A first overall pick narrows to one name, and a famous late rounder often is the whole answer.",
        ],
      },
      {
        heading: "Treating the stat clue as a style hint",
        items: [
          "Read the career stat clue as a style hint. It usually points at what made the player famous.",
        ],
      },
      {
        heading: "Avoiding wasted early guesses",
        items: [
          "Do not spray early guesses. Each miss costs a point, and the search will not let you repeat one.",
        ],
      },
    ],
    faqs: [
      {
        q: "What if I am stuck on the last clue?",
        a: "Think as long as you like, give up to see the answer, or take one final swing. A wrong guess there ends at zero.",
      },
      {
        q: "Are the players current or retired?",
        a: "Both. The pool mixes active stars with legends, and the clue trail works the same either way.",
      },
      {
        q: "Does Hard mode change the scoring?",
        a: "No. It only hides the early clues from view once later ones arrive.",
      },
    ],
  },

  '/nfl-higher-lower': {
    intro: [
      "Two players, one stat, one tap. A pair of pros sit side by side under a question like who threw for more career yards, and your gut answers before your brain finishes the math.",
      "The category rotates every round: touchdowns, then receptions, then rushing yards. Ten rounds later you find out how well you really know the record book.",
    ],
    headings: {
      howToPlay: "How to play NFL Higher or Lower, a free online NFL stats game",
      rules: "NFL Higher or Lower rules: scoring, streaks and the player pool",
      example: "NFL Higher or Lower walkthrough: a photo finish streak run",
      tips: "NFL Higher or Lower tips for picking the bigger career number",
      faq: "NFL Higher or Lower FAQ: hard mode, streaks and career data",
    },
    howToPlaySections: [
      {
        heading: "Reading the rotating stat category",
        items: [
          "Read the stat question at the top. Rounds rotate through touchdowns scored, passing yards, passing touchdowns, rushing yards, receiving yards, and receptions.",
        ],
      },
      {
        heading: "Checking each player before you tap",
        items: [
          "Check each player's position, teams, and final season, then tap the one with the bigger career number.",
        ],
      },
      {
        heading: "Revealing totals round by round",
        items: [
          "Watch both totals reveal, then roll into the next round.",
        ],
      },
      {
        heading: "Finishing all ten rounds",
        items: [
          "Finish all 10 rounds and post your score.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Scoring points and the streak bonus",
        items: [
          "Each correct answer scores 10 points, and consecutive correct answers stack a growing streak bonus of 5 points per extra step.",
        ],
      },
      {
        heading: "The maximum 325 point perfect game",
        items: [
          "A perfect 10 for 10 with an unbroken streak maxes out at 325.",
        ],
      },
      {
        heading: "Why careers start in 2000 or later",
        items: [
          "Career numbers come from real play by play data, using careers that started in 2000 or later so every total is complete.",
        ],
        subsections: [
          {
            heading: "Daily mode versus unlimited Hard mode",
            items: [
              "Daily is the same 10 rounds for everyone, once per day. Unlimited is random, and its Hard toggle pairs the closest values. Rare exact ties count as correct either way.",
            ],
          },
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Misjudging a close touchdown battle",
        paragraphs: [
          "Round one asks career touchdowns and shows LaDainian Tomlinson against Adrian Peterson. Feels close, but LT finished with 162 to Peterson's 126, and the wrong pick kills your streak at zero.",
        ],
      },
      {
        heading: "Building a six round streak to the finish",
        paragraphs: [
          "You settle down, run off six straight, and the streak bonus starts doing real work. A coin flip finish lands right, and you close at 8 of 10, well past 100 points.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Why longevity beats a short peak",
        items: [
          "Longevity beats peak. A very good 15 year player usually out-totals a legend who burned bright for 8.",
        ],
      },
      {
        heading: "Matching player type to the stat",
        items: [
          "Match the player type to the stat. Volume receivers stack receptions, deep threats stack yards.",
        ],
      },
      {
        heading: "Protecting a live scoring streak",
        items: [
          "Protect a live streak. When a round feels like a coin flip, slow down, because the bonus is where big scores live.",
        ],
      },
    ],
    faqs: [
      {
        q: "What is Hard mode?",
        a: "An unlimited mode toggle that builds nothing but photo finishes, pairing players with the smallest gaps it can find.",
      },
      {
        q: "Why are older legends missing?",
        a: "The pool only uses careers starting in 2000 or later, where the play by play data is complete, so nobody's total is silently short.",
      },
      {
        q: "Can both answers be right?",
        a: "On an exact tie, yes, either pick scores. The game avoids building tie pairs, so it almost never comes up.",
      },
    ],
  },

  '/nfl-connections': {
    intro: [
      "Twenty pro football players sit in a grid, hiding four groups of five that share something: a franchise, a college, a draft slot, a milestone. Find all four groups before four wrong guesses find you.",
      "The cruelty is the overlap. That quarterback fits the LSU group and the number one picks group, but he only belongs to one.",
    ],
    headings: {
      howToPlay: "How to play NFL Connections, a free online NFL grouping puzzle",
      rules: "NFL Connections rules: groups, lives and color difficulty",
      example: "NFL Connections walkthrough: untangling an LSU overlap",
      tips: "NFL Connections tips for spotting the real theme fast",
      faq: "NFL Connections FAQ: group sizes, colors and daily play",
    },
    howToPlaySections: [
      {
        heading: "Scanning twenty names for a shared theme",
        items: [
          "Scan the 20 names for anything five of them share.",
        ],
      },
      {
        heading: "Tapping five players and submitting",
        items: [
          "Tap exactly 5 players and hit submit.",
        ],
      },
      {
        heading: "Locking a group or losing a life",
        items: [
          "A real group locks in with its theme and color. A miss costs one of your 4 lives.",
        ],
      },
      {
        heading: "Clearing the board of all four groups",
        items: [
          "Solved groups leave the board, making the rest easier to read. Clear all four to win.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Groups of five and exact matches",
        items: [
          "Groups are five players each, and a submission must match exactly. Four right and one wrong is still wrong.",
        ],
      },
      {
        heading: "Four lives and no hint system",
        items: [
          "You get 4 lives for the whole puzzle, and there is no one away hint.",
        ],
      },
      {
        heading: "What the yellow, green, blue and purple colors mean",
        items: [
          "Colors mark difficulty: yellow is gentlest, then green, then blue, and purple is the trap.",
        ],
        subsections: [
          {
            heading: "Losing all your lives and the daily puzzle",
            items: [
              "Lose all lives and the remaining groups reveal themselves. Daily is one shared puzzle with saved progress, and Unlimited pulls random ones.",
            ],
          },
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Locking an easy shared team group",
        paragraphs: [
          "You spot five players who all wore a Patriots uniform and lock the yellow group. Then an LSU group looks obvious, except six names fit, which means one of them belongs somewhere else.",
        ],
      },
      {
        heading: "Untangling an LSU overlap trap",
        paragraphs: [
          "You guess wrong once, swap the receiver for the safety you forgot went to LSU, and it locks. From ten names the rest sorts itself, and you finish with 2 lives left.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Counting candidates before you submit",
        items: [
          "Count candidates before submitting. Six names fitting a theme means you have not found the real theme yet.",
        ],
      },
      {
        heading: "Locking your surest group first",
        items: [
          "Lock your surest group first, not the first one you noticed. Every solve removes noise.",
        ],
      },
      {
        heading: "Resolving a fight between two groups",
        items: [
          "When two groups fight over one player, work out where the other four names in each group come from.",
        ],
      },
    ],
    faqs: [
      {
        q: "How is this different from other connections games?",
        a: "It runs bigger: four groups of five instead of four, so 20 players on the board and more overlap traps.",
      },
      {
        q: "What themes show up?",
        a: "Shared franchises, colleges, draft slots, and career milestones like passing yard thresholds. The purple group leans on the sneakiest link.",
      },
      {
        q: "Do I lose progress if I close the tab?",
        a: "No. The daily puzzle saves as you go and picks up where you left off.",
      },
    ],
  },

  '/nfl-connect-4': {
    intro: [
      "It is Connect 4, the childhood classic, except every disc has a price: before a piece drops you must name a player matching both the column you picked and the row where it lands.",
      "You block lines and build threats like normal, while wondering if you can produce a Steelers Defensive Player of the Year on command. Sometimes the best square is a question you cannot answer.",
    ],
    headings: {
      howToPlay: "How to play NFL Connect 4, a free online NFL trivia board game",
      rules: "NFL Connect 4 rules: boards, criteria and reused players",
      example: "NFL Connect 4 walkthrough: stealing a lane late in the game",
      tips: "NFL Connect 4 tips for winning with smart column picks",
      faq: "NFL Connect 4 FAQ: opponents, verification and eras",
    },
    howToPlaySections: [
      {
        heading: "Choosing one of six curated boards",
        items: [
          "Start a game. Each of the 6 curated boards, like Dynasties or Steel Curtain, mixes franchises with achievements.",
        ],
      },
      {
        heading: "Picking a column and reading the row",
        items: [
          "Pick a column. Gravity drops your piece to the lowest empty row, and that row's criterion is the one to satisfy.",
        ],
      },
      {
        heading: "Naming a player who fits both criteria",
        items: [
          "Name a player matching both. A verified answer claims the cell in your color.",
        ],
      },
      {
        heading: "Alternating turns with a friend",
        items: [
          "Red and blue alternate. Pass the device to a friend or play both sides.",
        ],
        subsections: [
          {
            heading: "Winning with four in a row",
            items: [
              "First to four in a row, any direction, wins. A full board is a draw.",
            ],
          },
        ],
      },
    ],
    ruleSections: [
      {
        heading: "The seven by six board and its criteria",
        items: [
          "The board is 7 columns by 6 rows, with criteria like League MVP, 100+ Career Sacks, or Undrafted.",
        ],
      },
      {
        heading: "Why a wrong answer costs nothing",
        items: [
          "Wrong answers place nothing and do not lose your turn. Rethink, try another name, or hit skip to pass.",
        ],
      },
      {
        heading: "Using every player only once",
        items: [
          "Every player can only be used once per game, by either side.",
        ],
        subsections: [
          {
            heading: "Counting relocated franchises as one history",
            items: [
              "Franchise history counts across relocations, so Oilers greats count for the Titans.",
            ],
          },
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Opening the Field Generals board",
        paragraphs: [
          "On the Field Generals board, red opens in the Super Bowl MVP column, lands on the Packers row, and claims it with Bart Starr. Blue answers on the Saints row with Drew Brees.",
        ],
      },
      {
        heading: "Stealing a lane with a backup answer",
        paragraphs: [
          "Ten turns later red needs one cell on 40,000+ Career Passing Yards crossed with the Chargers, but Philip Rivers is already used. Red blanks and skips, and blue steals the lane with Dan Fouts.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Checking where your piece will land",
        items: [
          "Look down before answering. What matters is the row your piece will actually land in.",
        ],
      },
      {
        heading: "Saving your most flexible players",
        items: [
          "Save your universal players. A name that fits many cells is worth most late.",
        ],
      },
      {
        heading: "Steering play toward your opponent's gaps",
        items: [
          "Steer the game toward columns your opponent cannot answer. That is as good as a block.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is there a computer opponent?",
        a: "No, it is two players on one screen. Grab a friend, or play both colors as a trivia workout.",
      },
      {
        q: "Who checks the answers?",
        a: "An AI referee checks each name against both criteria before the piece drops. If it cannot verify right now, nothing is placed and you retry.",
      },
      {
        q: "Can I use players from any era?",
        a: "Yes. Suggestions cover 2002 to today, but you can type any older legend's full name directly.",
      },
    ],
  },

  '/missing-eleven': {
    intro: [
      "You remember the game, the score, maybe the halftime show. Missing Eleven bets you do not remember who started. It shows a real Super Bowl starting lineup, offense or defense, with one name blanked out, and gives you 3 guesses.",
      "Every lineup is verified against official starter tables, which is exactly why this hurts. The famous name you remember was often coming off the bench that night.",
    ],
    headings: {
      howToPlay: "How to play Missing Eleven, a free daily NFL guessing game",
      rules: "Missing Eleven rules: guesses, hints and scoring",
      example: "Missing Eleven walkthrough: the Super Bowl LI running back mystery",
      tips: "Missing Eleven tips for naming the real starter",
      faq: "Missing Eleven FAQ: accuracy, offense and defense lineups",
    },
    howToPlaySections: [
      {
        heading: "Reading the Super Bowl and the final score",
        items: [
          "Read the card: which Super Bowl, the final score, and whose starting unit you are looking at.",
        ],
      },
      {
        heading: "Finding the blank starter's position",
        items: [
          "Find the blank among the 11 starters. The position shows, the name is the mystery.",
        ],
      },
      {
        heading: "Typing a guess from the suggestions",
        items: [
          "Type a guess. Suggestions search the whole league, and a last name alone works.",
        ],
      },
      {
        heading: "Earning hints after each miss",
        items: [
          "Miss and you get a hint, miss again for another. The third miss ends it.",
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Three guesses and their point values",
        items: [
          "You get 3 guesses, scoring 100 points on the first, 70 on the second, and 40 on the third.",
        ],
      },
      {
        heading: "What each missed guess reveals",
        items: [
          "The first miss reveals the player's nationality, the second reveals the first letter of the last name.",
        ],
      },
      {
        heading: "When a last name alone is enough",
        items: [
          "A surname on its own counts when it is at least 4 letters.",
        ],
        subsections: [
          {
            heading: "Hard mode and the daily lineup",
            items: [
              "Hard mode removes hints, suggestions, and position labels. Daily is one shared puzzle a day, and Unlimited deals random lineups.",
            ],
          },
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Guessing wrong on a famous name",
        paragraphs: [
          "The card reads Super Bowl LI, Patriots 34, Falcons 28 in overtime, with the blank at running back for New England. Your brain screams LeGarrette Blount, or maybe James White, who scored the overtime winner.",
        ],
      },
      {
        heading: "Finding the real starter on the last guess",
        paragraphs: [
          "Both wrong. The actual starter that night was Dion Lewis, and White came off the bench for his three touchdowns. You take 40 points on the final guess and stop trusting your memory.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Thinking starter, not star",
        items: [
          "Think starter, not star. The trap is almost always a famous name who began the night on the sideline.",
        ],
      },
      {
        heading: "Using the visible names to pin the season",
        items: [
          "Use the ten visible names to pin down the exact season, then run that year's depth chart in your head.",
        ],
      },
      {
        heading: "Watching the positions memory forgets",
        items: [
          "On offense, watch for linemen and second receivers. On defense, safeties are where memory gets fuzzy.",
        ],
      },
    ],
    faqs: [
      {
        q: "Are the lineups actually accurate?",
        a: "Yes. Each one was checked against official box score starters and cross verified. When the answer surprises you, that is the point.",
      },
      {
        q: "Is it always the offense?",
        a: "No. The pool includes starting defenses too, and the card tells you which side of the ball you have.",
      },
      {
        q: "Do I have to spell the full name?",
        a: "No. Spelling is forgiving, and a last name of 4 or more letters is accepted on its own.",
      },
    ],
  },

  '/nfl-gauntlet-draft': {
    intro: [
      "The draft mode, NFL style: seven picks, one per starting offense slot, five real players a pick from a genuine star to a bargain, and you keep exactly one.",
      "Then the cup begins. Your finished offense runs five knockout rounds against ever stronger invented opposition, rated 79 up to 97, and overtime when the game is level.",
      "The run is decided entirely by the offense you drafted: the same seven always runs the same gauntlet, so every pick is the game.",
    ],
    headings: {
      howToPlay: "How to play Gauntlet Draft: NFL, a free online NFL card draft game",
      rules: "Gauntlet Draft: NFL rules: cards, positions and the knockout",
      example: "Gauntlet Draft: NFL walkthrough: a quarterback pick and a title run",
      tips: "Gauntlet Draft: NFL tips for building a title winning offense",
      faq: "Gauntlet Draft: NFL FAQ: daily drafts, positions and opponents",
    },
    howToPlaySections: [
      {
        heading: "Choosing the daily or unlimited draft",
        items: [
          "Pick the daily gauntlet (the same five card choices for everyone today) or unlimited for a fresh draft.",
        ],
      },
      {
        heading: "Drafting each of your seven slots",
        items: [
          "For each of the seven slots (QB, two RB, three WR, TE) read the five cards, star to bargain, and tap the one you keep.",
        ],
      },
      {
        heading: "Watching the knockout begin on its own",
        items: [
          "After the seventh pick the knockout starts on its own: five rounds, one match each, revealed one at a time.",
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
          "Every card is a real player off the same 2026 roster data NFL Front Office plays; every opponent club is invented on purpose.",
        ],
      },
      {
        heading: "Why the draft covers four skill positions",
        items: [
          "The draft is scoped to the four skill positions (QB, RB, WR, TE) on purpose: their ratings are built from real production, the way the position data's own generator describes it, and every slot deals a genuine star-to-bargain spread. Offensive linemen and defenders are rated on thinner evidence (playing time, draft position and limited defensive measures, most of it marked e in NFL Front Office), so they stay out of the draft rather than padding it with picks that are not a real choice.",
        ],
      },
      {
        heading: "A star to bargain spread in every slot",
        items: [
          "The five cards per slot are spread across the pool's rating range, so a top-tier card and a bargain are always both on the table.",
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
        heading: "A knockout that replays the same way",
        items: [
          "The knockout is deterministic in your offense: scoring comes from the rating gap, level games go to overtime, and replaying the same seven replays the same cup.",
        ],
      },
      {
        heading: "Opposition ratings climbing round by round",
        items: [
          "Opposition ratings climb 79, 83, 88, 92, 97. A bargain offense usually falls in the first round, an elite one reaches the final as a slight underdog, and even a perfect draft lifts the trophy roughly one run in nine.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Five cards at the quarterback slot",
        paragraphs: [
          "The quarterback slot deals a 93 next to an 88, an 82, a 76 and a 71. There is no cost to any of them, so the 93 is the pick unless you are chasing a specific team on the card.",
        ],
      },
      {
        heading: "Two rounds survived and one regret",
        paragraphs: [
          "Your finished offense rates 90. The Qualifier wins big, the Last Sixteen is tight, the Quarter Final needs overtime, and the Semi Final ends the run. Two rounds survived, 32 points, and the card you would redo is the 76 you took at the third receiver spot.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Why the quarterback card carries the most weight",
        items: [
          "The quarterback card carries the most weight of any single pick: a weak one drags the whole rating.",
        ],
      },
      {
        heading: "Bargain cards for flavor, not for winning",
        items: [
          "The bargain cards exist for flavor runs, not for winning. If the score is the goal, draft the biggest number that fits.",
        ],
      },
      {
        heading: "Watching your running rating climb",
        items: [
          "Champions need an offense in the mid nineties. Check your running rating under the cards as you go.",
        ],
      },
    ],
    faqs: [
      { q: "Is the daily draft the same for everyone?", a: "Yes. One shared set of five card choices per Eastern Time date, so daily scores compare fairly." },
      { q: "Are the opponents real teams?", a: "No, and that is deliberate: every gauntlet opponent is an invented club, so no real logo or name is borrowed. The players you draft are real, off the same roster data NFL Front Office plays." },
      { q: "Why seven slots instead of eleven?", a: "The real position data behind this game groups linemen and defenders more broadly than it splits out quarterbacks, running backs, receivers and tight ends, so those four skill positions are where every pick is a genuinely graded choice. A full eleven man lineup is possible future scope; this round scoped it to what the data actually supports." },
      { q: "Is this the same game as the soccer Gauntlet Draft?", a: "Same engine, NFL's own pool and positions. Seven picks instead of eleven, and the ladder is tuned to this pool's own, much wider rating spread." },
    ],
  },

  '/conquest': {
    intro: [
      "Picture America painted in 32 team colors, every state owned by its nearest stadium. Now play a season where each result redraws the borders, because in this football conquest game every winner annexes the loser's entire empire. Part season sim, part sports battle map, all chaos.",
      "The headline mode is Imperialism, the format the internet fell in love with: empires balloon, collapse, and flip on one upset. Arcade mode keeps the original play by play battles, player steals, and power ups.",
      "You do not just watch. You pick a team, call their game each week, and ride your empire to the final map.",
    ],
    headings: {
      howToPlay: "How to play NFL Conquest, a free online NFL map conquest game",
      rules: "NFL Conquest rules: scoring, playoffs and the Daily Challenge",
      example: "NFL Conquest walkthrough: an empire lost and won back",
      tips: "NFL Conquest tips for surviving the imperialism map",
      faq: "NFL Conquest FAQ: territories, Arcade mode and comebacks",
    },
    howToPlaySections: [
      {
        heading: "Picking your team on the 56 region map",
        items: [
          "Pick your team in Imperialism mode. The map seeds every territory to the closest stadium, 56 regions covering the lower 48.",
        ],
      },
      {
        heading: "Calling the winner of your team's game",
        items: [
          "Each week all 32 teams pair off, and you call the winner of your team's game, with records and win odds on the card.",
        ],
      },
      {
        heading: "Watching the map redraw after each week",
        items: [
          "Play the week and watch the map redraw. Every winner absorbs everything the loser owned.",
        ],
      },
      {
        heading: "Reaching the playoffs after 18 weeks",
        items: [
          "Survive 18 weeks, and the top 8 empires by territory enter the playoffs: Quarterfinals, Semifinals, Imperial Championship.",
        ],
        subsections: [
          {
            heading: "Losing an empire in the playoff bracket",
            items: [
              "Playoff losers hand over their whole empire, so the bracket consolidates the map until one team rules America.",
            ],
          },
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Winner takes all, every single game",
        items: [
          "Winner takes all, every game. A one point squeaker annexes as completely as a blowout, and overtime means no ties.",
        ],
      },
      {
        heading: "How a wiped out team can come back",
        items: [
          "Wiped out teams keep playing their schedule, and one win seizes their conqueror's entire empire. Comebacks are the soul of the format.",
        ],
      },
      {
        heading: "Ending the season early with a full map",
        items: [
          "If a team owns the whole map before week 18, the season ends on the spot.",
        ],
      },
      {
        heading: "Seeding the playoffs by territory",
        items: [
          "Playoff seeding is territory first, with season record breaking ties.",
        ],
        subsections: [
          {
            heading: "How points get scored across the season",
            items: [
              "Scoring: 3 points per state held at the end, 25 per correct call, 50 for making the playoffs, 200 if your team takes the crown.",
            ],
          },
        ],
      },
      {
        heading: "The Daily Challenge versus Free Play",
        items: [
          "The Daily Challenge deals every player the same date-seeded season: same starting map, same fixtures, same results. One scored run per day with streaks. Free Play is unlimited and fully random.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Growing an empire across the middle of the map",
        paragraphs: [
          "You pick the Chiefs, who start with a slice of the middle of the map. Week 1 they beat the Broncos and the whole mountain empire flips red in an afternoon. By week 6 you stretch toward the Pacific, because your victims had already eaten their neighbors.",
        ],
      },
      {
        heading: "Losing a twenty state kingdom in one week",
        paragraphs: [
          "Then week 9: a 3 point loss to the Bears hands your 20 state kingdom to Chicago, and your NFL imperialism map dream is suddenly a gray footnote. You still sit at 6 and 3. You just own nothing.",
        ],
      },
      {
        heading: "Clawing back to the Imperial Championship",
        paragraphs: [
          "One win the next week puts you back in business, because your new victim sat on 14 states. You claw to the 3 seed, win two playoff rounds, and drop the Imperial Championship to a juggernaut. Final tally: 41 states, 11 correct calls, playoff bonus banked. You immediately run it back.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Not panicking after getting erased",
        items: [
          "Do not panic when you get erased. One win against a fat empire is the fastest growth in the game.",
        ],
      },
      {
        heading: "Respecting close win odds when calling games",
        items: [
          "Respect close win odds when calling games. Those 25 point picks quietly decide your final score.",
        ],
      },
      {
        heading: "Watching the standings, not just the colors",
        items: [
          "Watch the standings, not just the colors. Record breaks playoff ties, so a hot streak matters late.",
        ],
      },
      {
        heading: "Trying Arcade mode for a slower burn",
        items: [
          "Try Arcade when you want a slower burn: battles, player steals, and a 99 rated franchise legend power up.",
        ],
      },
    ],
    faqs: [
      {
        q: "How does the Daily Challenge work?",
        a: "Everyone on the planet gets the same season today: identical starting map, identical fixtures, identical results. Your score comes from which empire you back and how well you call the games, so comparing scores is a fair fight. One scored run per day, streaks build if you show up daily, and a fresh map drops at midnight Eastern. Free Play stays unlimited.",
      },
      {
        q: "How does the imperialism format work?",
        a: "Every territory starts with its nearest stadium. Each winner annexes every state the loser owned, wiped out teams stay on the schedule and can reclaim an empire with one win, and after 18 weeks the top 8 empires play a knockout bracket.",
      },
      {
        q: "How many territories are on the map?",
        a: "56: the lower 48 with the crowded football states split, California and Florida in three pieces, Texas, Ohio, Pennsylvania, and New Jersey in two, so every franchise starts with a home region.",
      },
      {
        q: "Does margin of victory matter?",
        a: "Never. Winning by 1 and winning by 30 both take everything, which is why late upsets feel like earthquakes.",
      },
      {
        q: "What is Arcade mode?",
        a: "The original formula: a random team spins a compass direction and attacks the nearest enemy or grabs neutral land, battles play out with real player names and a box score, winners steal a player from the loser, and power ups sit on marked states. Last team standing wins.",
      },
      {
        q: "Can my team win after being wiped out?",
        a: "Yes. Getting erased costs land, not life. Win once to inherit an empire, and if you crack the top 8 by week 18 the title is still live.",
      },
    ],
  },
};
