import type { GameContentMap } from './types';

export const NBA_MY_CAREER_CONTENT: GameContentMap = {
  '/nba-my-career': {
    intro: [
      "Draft night is where it starts: a made up prospect with your name, landing in a real NBA locker room. Where it ends is up to your summers.",
      "Each season prints a stat line shaped by your rating, archetype, health and team quality. Each summer drops up to three cards on your desk, one at a time, drawn from over a hundred of them: contracts, surgeries, trade demands, tunnel fits, a rookie who idolises you, a mural in your neighborhood.",
      "You build your player's actual face before the draft, and there is a dirty side waiting whenever you want it. Taking the under on your own rebound totals, faking load management for a bettor, tanking in March, an agent advance you were never supposed to mention. Every dirty choice raises a hidden league integrity meter, and at the top of it is an indefinite suspension and a comeback on the minimum.",
      "Decide what you want your rookie to do on the floor before picking an archetype. A guard built to make plays and a center built for the paint will put up different lines at the same overall. Read the minutes alongside the points, rebounds and assists on the season card. A move into the starting five can change those numbers without a big change in your rating.",
      "At free agency, compare the player ahead of you in the rotation with the team you would be leaving. Joining a contender can put you on the bench if that spot is already taken. If you are in the second unit, watch how camp goes the next fall. A starting job is something you can earn back.",
      "After each season, check the News box and Trophy Case. Your draft rival gives you a career to compare against your own, and the badges track milestones such as a first ring or an All-Star nod. Those are different goals from chasing a bigger contract, so pick what matters to this save before choosing your next move.",
    ],
    headings: {
      howToPlay: "How to play NBA My Career, a free NBA basketball career sim",
      rules: "NBA My Career rules: ratings, the rotation and the bank",
      example: "NBA My Career walkthrough: rookie drama to a title run",
      tips: "NBA My Career tips for building a lasting legacy",
      faq: "NBA My Career FAQ: real teams, free agency and badges",
    },
    howToPlaySections: [
      {
        heading: "Creating your player and picking a league",
        items: [
          "Create your player: name, one of 5 positions (PG, SG, SF, PF, C), and one of 15 archetypes, from Point God to Movement Sniper to Paint Beast.",
          "Your setup stays in this browser if you leave before starting the draft.",
          "Pick your league: today's NBA, or the 2003-04 throwback with the SuperSonics in Seattle, the Nets in New Jersey, the Hornets in New Orleans and no Charlotte yet.",
        ],
        subsections: [
          {
            heading: "Building your player's look",
            items: [
              "Build your look: skin tone, hair, beard, accessories and a signature celebration, or hit Surprise me.",
            ],
          },
        ],
      },
      {
        heading: "Managing your money between seasons",
        items: [
          "Open the Bank between seasons. Savings pays 2.5% a season and never loses, five things you can put money into each have a price that moves every season whether you look or not (a fund, flats back home, two shares and a coin that halves as often as it doubles), the statement keeps your last 12 moves, and the card school on the team plane is one sitting a season on odds that are printed before you sit in.",
        ],
        subsections: [
          {
            heading: "Spending across seven aisles",
            items: [
              "Spend the money in 7 aisles: home, rides, investments, body, flex, family, and a shady aisle that only appears once you have something to hide.",
              "During a playing season, open Deal with it under the heat meter when you're holding dirty money. Choose Come clean, Give it away, Keep it quiet or Wash it after reading the cost and any catch risk.",
            ],
          },
        ],
      },
      {
        heading: "Following your career in the News box",
        items: [
          "Read the News box. The paper writes up every season in your own position's stat, the SocialGram shows followers read off your fanbase with three fan comments under the latest post, and the rival's card keeps the head to head against the player drafted the same year as you.",
        ],
        subsections: [
          {
            heading: "Collecting badges in the Trophy Case",
            items: [
              "Collect badges in the Trophy Case: 26 of them, from a first ring and Rookie of the Year to an All-Star nod, 30,000 career points, a triple double season and $100M to your name, each lit the moment the facts of your career say so.",
            ],
          },
          {
            heading: "Answering your phone on the basketball calendar",
            items: [
              "Answer your phone. Texts from your agent, the head coach, the GM, a teammate or your mom land on the beats of the basketball year: draft night and your first summer league, camp, the trade deadline, the All-Star break, the playoffs if you get there, the offseason, and the summer before the last year of your deal. Every text says which beat and which year it came in on, and how you answer moves your karma, morale, fanbase or bank.",
            ],
          },
          {
            heading: "Making the call when your rival forces one",
            items: [
              "Some seasons your rival hands you a decision instead of a headline: a flagrant you can answer or let go, a debate show offering real money, a youth camp his foundation wants you to co-host, an All-Star vote his team is buying ads for. Every button prints exactly what it moves, and a gamble prints its odds.",
            ],
          },
        ],
      },
      {
        heading: "Getting drafted and cracking the rotation",
        items: [
          "Get drafted by a real NBA team. Stronger prospects go higher and earn more.",
          "Check the rotation. Top five picks open in the starting five; everyone else fights for the spot in camp every fall, and second-unit seasons come in bench minutes until you crack the five.",
        ],
      },
      {
        heading: "Playing seasons and handling the offseason",
        items: [
          "Sim each season for a full line: games, minutes, points, rebounds, assists, steals, blocks, awards, team result.",
          "Your overall can rise or fall during the season. The sim rolls the full season in one go, then the result and Career Log show the rating at each stage.",
          "After your first season, ask your agent to request a trade before the next one if your contract has at least two years left. You get one request per season, with a 50% chance of a trade. A move keeps your salary and years; a decline costs up to four morale points. For example, a two-year deal still has two years left after a move.",
          "Press 📺 Week by week instead of Play the season to watch that season one game at a time, with your stat line and your team's record after every game. It is the same season either way.",
          "Throwback careers play against unnamed teams, and the real seasons that were not a full 82 games (2011-12, 2012-13, 2019-20 and 2020-21) have no game by game view. The game tells you before you press.",
          "Handle the summer, up to three cards one at a time. Only the first card can move your rating, and a card you just saw rests for a while (press moments follow your season, so those can come right back).",
          "After a normal offseason choice, the result shows the actual changes. Expand it for any extra changes, then Continue opens the next card, or takes you back to your career after the last one, without applying the choice again.",
          "Open Career Log and pick a year to review its saved overview, regular season and postseason. Changes compare with the previous saved season; older missing values say Not recorded. Back to seasons returns to the year tiles, and Review seasons is available after retirement.",
          "In a supported year, open Regular season and choose Watch reconstructed games. Season Center recreates the games from your saved season totals, with estimated scores and quarters.",
        ],
        subsections: [
          {
            heading: "Working a real free agency window",
            items: [
              "When the contract runs out, work a real free agency window: competing offers from named franchises with their own money, length and roster quality, and one push for more on any of them.",
            ],
          },
          {
            heading: "Retiring and facing the legacy verdict",
            items: [
              "From 31, a falling rating brings the retirement talk: stop now, one more year, or a farewell season that ends the career after it. Then face the legacy verdict and the Hall of Fame wait.",
            ],
          },
        ],
      },
    ],
    ruleSections: [
      {
        heading: "How archetypes and ratings work together",
        items: [
          "Archetypes shape the stat engine: Point Gods pile up assists, Paint Beasts eat rebounds, Bucket Getters score but break down more.",
          "From 2023-24, MVP and All-NBA eligibility use the 65 game rule. Rating alone does not promise an award: your season production, role and team record matter.",
        ],
        subsections: [
          {
            heading: "How growth and decline unfold",
            items: [
              "Growth runs to age 25, decline starts at 32, and health erodes late unless you invest in it.",
            ],
          },
        ],
      },
      {
        heading: "How real the rotation actually is",
        items: [
          "The rotation is real: the man ahead of you is as good as your roster is, camps have memory both ways, bench seasons run at about 60 percent of a starter's numbers, and Sixth Man of the Year goes to actual second-unit seasons now. Joining a loaded contender can cost a mid player his spot in the five.",
        ],
      },
      {
        heading: "How the press reads your season",
        items: [
          "The press reads your actual season: a banner puts you on the podium, a collapse puts you in the scrum, a second-unit year brings the role question. Three answers every time, safe, honest or fiery, and the fiery one gambles your fanbase for real.",
        ],
        subsections: [
          {
            heading: "When a career finally ends",
            items: [
              "Careers end at 41, after 21 seasons, or when the rating craters. You can also walk anytime.",
              "Hall of Fame voters weigh the hardware first (rings, MVPs, Finals MVPs, All-NBA years), then your seasons and your numbers, and a career total near the top of this game's books in a stat your position really piles up (points, rebounds or assists) earns a push of its own, up to 390 legacy points.",
              "Example: take a point guard with ordinary numbers and one with the same hardware and more assists than 99 of 100 point guards this game has seen. The second scores at least 300 legacy points more, which can be the whole gap between a long wait and the Hall. A career you already retired keeps the ballot it was told.",
            ],
          },
        ],
      },
      {
        heading: "Playing inside the 2003 throwback world",
        items: [
          "The 2003-04 throwback is a sealed 29 team world, verified against the real season: every draft, trade and signing stays inside it, and contracts pay 2003 money, about a third of today's.",
        ],
      },
      {
        heading: "Money rules in the Bank and what fans nag about",
        items: [
          "Money has rules of its own. There is a 1% fee on both sides of every trade and a $100k floor in the account that cannot be invested away; a season that leaves you under the floor is covered out of savings first, then by a forced sale of holdings at whatever the price is that day. Cards win 42% of hands and a win pays 1.15x the stake, the most you can stake is $50k or 4% of your cash, and once you are $500k down for your career the guys stop dealing you in for good. Keep sitting in while you are losing and somebody at home notices, which costs morale and fanbase.",
          "The fans nag you for the thing your position is judged on and never the other way round: a point guard hears more assists, a center hears own the glass, and nobody hears about a three, because the season line does not count one.",
        ],
      },
      {
        heading: "How your rival's choices work",
        items: [
          "A season where your rival makes no headline has a 45% shot at a rival choice instead, never both in the same year, and every choice shows up once before any of them repeats. The buttons move only what they print: morale, fanbase, net worth, karma or the heat of the feud, and morale feeds straight into next season's box score.",
        ],
      },
      {
        heading: "How the phone's calendar works",
        items: [
          "Texts only arrive on beats your season really had. No playoff texts in a year you went home in April, no contract year texts until one year is left on the deal, and draft night's texts land before you play a game. Summer league comes round twice at most: the July after draft night and the one after your rookie year. One text a beat, up to three a season, fewer while old ones sit unanswered, and the same text never comes twice in a career.",
          "The season the game retires you (41, 21 seasons, or a rating that craters) sends nothing about a year you will not play: no summer runs, no early lifts, no extension talk.",
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
        heading: "A Rookie of the Year season turns sour",
        paragraphs: [
          "You roll a Two-Way Menace guard, go 11th, and win Rookie of the Year on a bad team. Year three, morale craters and you demand a trade. Villain arc unlocked.",
        ],
      },
      {
        heading: "A title, a Finals MVP and a Hall of Fame verdict",
        paragraphs: [
          "The new team contends. You take the discount at 28, win it all at 30, and grab Finals MVP. Decline arrives at 33, surgery buys two more years, and the verdict reads first ballot Hall of Famer. The GOAT tier stays out of reach. It usually does.",
        ],
      },
      {
        heading: "Answering your rival's flagrant",
        paragraphs: [
          "Your rival takes you out on a drive and the refs upgrade it to a flagrant. Give it right back heats the feud and usually pays Morale +8, but it carries a 30% chance you are the one who gets tossed (Morale -5, Fanbase -5, Net worth -$100k). Help him up on camera is Fanbase +5, Karma +5 and the feud cools. You pick say nothing and watch the film: Morale +6, the feud heats up, and those six points ride into next season's box score.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Choosing an archetype built to last",
        items: [
          "Pick the archetype for the career you want to live. Durability differences are real.",
        ],
      },
      {
        heading: "Why low health is worth fixing fast",
        items: [
          "Do not sit on low health. Injuries shred seasons, and awards need games played.",
        ],
      },
      {
        heading: "Free agency as a basketball decision, not just money",
        items: [
          "Team quality moves your stats and playoff odds. Free agency is a basketball decision, not just money: the contender offers less than the rebuild, and the roster number on the card is what your next seasons actually run on.",
        ],
      },
    ],
    faqs: [
      { q: "Can I play as a real NBA star?", a: "No, your player is fictional by design. The teams around you are real, 30 of them today and 29 in the throwback, but the career is yours to invent." },
      { q: "Can I start in a different era?", a: "Yes. The create screen has a 2003-04 throwback: the 29 team league with the Seattle SuperSonics, the New Jersey Nets and the New Orleans Hornets, and no Charlotte franchise yet. An era career never meets a team that did not exist then." },
      { q: "How does free agency work?", a: "An expired deal opens a window of real offers: your team's re-sign number plus named suitors, each with its own salary, years and roster quality. You can push any offer for more once. A weak case can get an offer pulled, but your own team never walks, so there is always a deal to sign." },
      { q: "Why am I coming off the bench?", a: "Because the starter is better, for now. Late picks usually open with the second unit behind an incumbent whose level tracks the roster's quality. Grow your rating and you will crack the five; until then bench minutes mean smaller numbers, slower fame and a real shot at Sixth Man of the Year. A thin rebuild is the fastest route to starting." },
      { q: "What does the legacy score reward most?", a: "MVPs and rings move it hardest, then Finals MVPs and All-NBA nods, plus longevity and points. The top verdict is the GOAT conversation, and it takes a stacked case." },
      { q: "What is in the Bank?", a: "Four tabs. Account holds your cash, a savings account that pays 2.5% a season, and a statement of your last 12 moves. Market is five prices that move every season, each with its own risk word and a read on whether it is cheap or dear against what it usually goes for. Cards is the card school on the team plane, one sitting a season, on odds the screen prints before you play. Shop is the 7 aisles. It is the same engine Soccer Career's phone runs on, in dollars." },
      { q: "Who is my rival?", a: "A generated player drafted the same year at your position. He plays his own seasons on the same scale you do, can win a ring before you and retire before you, and the head to head is kept for good. He is fictional, like your own player, so no real player's career is being simulated." },
      { q: "How do I earn badges?", a: "By doing the thing. Each of the 26 badges is a test on the facts of your career, checked every time you open the case: a ring, an MVP, an All-Star nod, twenty thousand points, five seasons with all 82 games played, a million dollars to your name. The 30 point season badge sits a long way under the single season scoring record, Wilt Chamberlain's 50.4 a game in 1961-62, which is where it belongs." },
      { q: "Is my career saved?", a: "Yes, progress auto saves in your browser. One career at a time, and starting fresh means retiring first." },
    ],
  },
};
