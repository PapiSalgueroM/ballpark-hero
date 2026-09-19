import type { GameContentMap } from './types';

export const STADIUM_MANAGEMENT_CONTENT: GameContentMap = {
  '/stadium-tycoon': {
    intro: [
      "Stadium Tycoon is an idle game about the part of football nobody streams: the turnstiles. You start with a fence and ninety loyal fans, and you grow that into a ground that hums, one upgrade at a time, while a live toy match plays out on screen and pays you for every goal.",
      "It is built to be alive. The crowd fills the stand seat by seat as your real attendance grows, money floats off everything that earns, goals throw confetti, and a win streak lights a flame that multiplies the lot. Leave the tab and the turnstiles keep spinning at half speed for up to eight hours.",
      "And it goes deep. Your ground plays in a league with a real table, and winning it climbs a ladder of ten divisions that multiply everything you earn, a payroll of eight staff earns around the clock, a golden whistle drifts in with five different prizes, and 47 badges each add a permanent two percent. Selling up resets the club but never the badges, so every run starts faster than the last.",
      "There is a second room too. The Academy tab runs a youth academy right beside the ground, on its own save, and once you have opened it the kids keep training and ageing while you watch the match.",
    ],
    headings: {
      howToPlay: "How to play Stadium Tycoon, a free idle football stadium game",
      rules: "Stadium Tycoon rules: crowds, divisions, gems and time away",
      example: "A Stadium Tycoon walkthrough, from the fence to the first sell up",
      tips: "Stadium Tycoon tips for a faster idle build",
      faq: "Stadium Tycoon FAQ: selling up, gems and the golden whistle",
    },
    howToPlaySections: [
      {
        heading: "Turnstiles, taps and the upgrade tiles",
        items: [
          "Watch the money counter climb. Every fan in the ground pays you every second.",
          "Tap the stadium for instant cash. The Megaphone track makes every tap stronger.",
        ],
        subsections: [
          {
            heading: "What each upgrade tile does",
            items: [
              "Buy upgrades from the nine tiles: Stands add seats, Ticket Office, Snack Bar and Club Shop raise what each fan spends, Parking pays flat money, Floodlights and Academy grow the fanbase, Squad wins matches, Megaphone boosts taps.",
            ],
          },
        ],
      },
      {
        heading: "Live matches and the league ladder",
        items: [
          "Follow the match at the top of the pitch. Goals pay a bonus scaled by the crowd, wins extend your streak, and the streak multiplies income and pulls in new fans.",
          "Win your league to climb the divisions. Each division is a small league of named rival clubs with a table on the League tab, and only the champion goes up. Every division multiplies all income up to five and a half times, each promotion pays a bonus on the spot, and higher divisions send tougher opponents.",
        ],
      },
      {
        heading: "Staff, whistles and set piece offers",
        items: [
          "Hire from the payroll: eight staff from a Turnstile Steward to a Club Legend Ambassador, each level adding steady income of its own before the multipliers touch it.",
        ],
        subsections: [
          {
            heading: "Catching the golden whistle",
            items: [
              "Catch the golden whistle when it drifts onto the pitch. You get about twelve seconds, and it carries one of five prizes, from seven times the income to fifteen minutes of income in one lump.",
            ],
          },
          {
            heading: "Taking a penalty or free kick",
            items: [
              "Open a penalty or free-kick offer during a watched match. You have twelve seconds to open it, then choose your aim, power and curve while the match clock keeps running. Opening uses that match's one attempt, even if you leave or reload.",
            ],
          },
        ],
      },
      {
        heading: "Selling up for Reputation stars",
        items: [
          "When lifetime earnings fill the yellow bar, sell up and move grounds: the club resets, but Reputation stars (plus 50 percent income each, forever), your badges and your club records all survive.",
        ],
      },
      {
        heading: "The Academy tab and its graduates",
        items: [
          "Open the Academy tab to run your youth academy beside the stadium.",
        ],
        subsections: [
          {
            heading: "Promoting players into the first team",
            items: [
              "Promote academy players aged 18 to 23 into five first-team places. A graduate frees his bed, keeps developing and helps reduce the opposition's scoring chances. Open First team in the Academy to compare his current fee with the fee at his next birthday.",
            ],
          },
          {
            heading: "Boots from the boot room",
            items: [
              "League titles earn fictional boots and kit upgrades. Open First team, then Boot room, to equip a graduate or improve a pair. Boots add to match rating for defense while leaving every transfer fee unchanged. Move a pair to another player whenever you like; it stays with the club when its wearer leaves.",
            ],
          },
        ],
      },
    ],
    ruleSections: [
      {
        heading: "Attendance, the match clock and the win streak",
        items: [
          "Attendance is the smaller of your seats and your fanbase, so Stands matter only when the ground is full and spending tracks matter only when it is not.",
          "Matches run about two real minutes. Your Squad level drives your goal chance. A division's rivals stay as strong as they were when you arrived, so a club that can compete there can always win it in time, but every division up is tougher, and the longer the club has played the tougher each new division is.",
          "A win extends the streak, a draw keeps it alive without extending it, a loss ends it. The streak multiplier caps at ten wins.",
        ],
        subsections: [
          {
            heading: "Charging Matchday Hype",
            items: [
              "Matchday Hype charges over eight minutes of play; pressing it doubles your income for sixty seconds and lifts your taps with it, though goal and win bonuses are not doubled. It never charges or burns while you are away, and it cannot stack.",
            ],
          },
        ],
      },
      {
        heading: "How promotion up the divisions works",
        items: [
          "Divisions are earned by winning the league at your current ground. The bottom three divisions are six clubs playing each other once, five matchdays; the middle three are eight clubs home and away, and the top four ten clubs home and away. The table is ordered by points, then goal difference, then goals scored. Only the champion goes up, nobody goes down, and a title at The Summit pays the promotion bonus again. Selling up drops you back to the bottom league, though your best division and your league titles are remembered forever.",
        ],
      },
      {
        heading: "Whistle timing and permanent badges",
        items: [
          "The golden whistle appears only while you are actually playing, roughly every couple of minutes, and its timed prizes (DERBY DAY at seven times income, CROWD SURGE at twenty five times taps) cannot stack with each other.",
          "Badges pay no cash. Each of the 47 is a permanent two percent income multiplier, earned exactly once per career, and they never reset.",
        ],
        subsections: [
          {
            heading: "What the ground earns while you are away",
            items: [
              "Away earnings run at half your unboosted income rate, with hype and golden whistles excluded, capped at eight hours, and only count after you have been gone at least thirty seconds.",
              "Matchdays keep playing while you are away, one for every half hour of the trip and inside the same cap. They pay no goal or win bonuses, and the final matchday of a season always waits for you, so every title is won with you watching.",
            ],
          },
        ],
      },
      {
        heading: "Gems, graduates and scored set pieces",
        items: [
          "Gems are earned only by results: three for a watched win, one for a watched draw, one for a win played while you were away, twenty for a league title and six for second place. They open packs of generated kids in the Academy tab, every pack prints its odds before you open it, and gems can never be bought.",
        ],
        subsections: [
          {
            heading: "How graduates help in watched and away matches",
            items: [
              "Your first team helps in watched and away matches. Each rating point above 60 adds to its defensive edge. With five players rated 80, opponents get twenty percent fewer chances before the minimum chance is applied. This changes the odds, not a match's guaranteed result.",
            ],
          },
          {
            heading: "When a scored kick counts",
            items: [
              "A scored set piece before full time adds one goal and the usual goal bonus. A miss, save or block costs nothing. A saved shot result cannot pay twice, and a kick left open past full time cannot change the next match. Away matches have no kick offers; these kicks have no daily record or direct gem reward.",
            ],
          },
          {
            heading: "Training and ageing after the academy",
            items: [
              "First-team players train at half the academy rate through age 27. Their years take fifteen watched academy minutes, compared with five minutes for academy kids. They hold their rating at 28 and 29, lose 1.2 rating at each birthday from 30, and retire at 34 without a fee. Away time trains them without ageing them.",
            ],
          },
        ],
      },
      {
        heading: "Saves and what survives a sell up",
        items: [
          "Progress saves on this device automatically. Selling up resets the ground while Reputation, badges, club records and lifetime totals survive. Your academy save, including its first team, stays with you.",
        ],
      },
    ],
    exampleSections: [
      {
        heading: "Opening the gates and the Ticket Office",
        paragraphs: [
          "You open the game to 90 fans paying five cents each, $4.50 a second. The first Stands level costs 30 and adds 40 seats nobody fills yet, so you buy the Ticket Office instead and watch the rate tick up.",
        ],
      },
      {
        heading: "A full ground and the Muddy Meadows title",
        paragraphs: [
          "Once Floodlights pull your fanbase past your seats, the ground is full and Stands become the best purchase on the board. With 280 in the ground a goal pays a 168 dollar bonus before any streak, and the league's fifth matchday comes about ten minutes in: top the table then and the Muddy Meadows title lifts you into the Gravel Lane League, with a promotion bonus and a bigger multiplier on every dollar after it.",
        ],
      },
      {
        heading: "The yellow bar and the first star",
        paragraphs: [
          "Around a quarter of an hour in, lifetime earnings crest four million and the yellow bar glows. You sell up, keep a star, and the ninety-fan fence starts again at one and a half times the speed.",
        ],
      },
      {
        heading: "A penalty offer with the scores level",
        paragraphs: [
          "You are drawing 1-1 when a penalty offer appears. Open it and aim inside the right post with medium power. If it beats the keeper before full time, your club leads 2-1 and gets its normal goal bonus. If the keeper saves it, the score stays 1-1. The match carries on either way.",
        ],
      },
    ],
    tipSections: [
      {
        heading: "Seats, spending and the Squad track",
        items: [
          "Balance seats against spend. A full ground with a poor Snack Bar wastes fans; a rich concourse with empty seats wastes upgrades.",
          "Squad is quietly the best economy track: goals pay crowd-scaled bonuses, the streak multiplier compounds everything else, and wins are what climb the division ladder.",
        ],
      },
      {
        heading: "When to cash in and move grounds",
        items: [
          "Do not sit on the sell-up button. The first star is worth more than a few minutes of squeezing the old ground, and the badges you earned come with you.",
        ],
      },
      {
        heading: "Tapping big crowds and whistle prizes",
        items: [
          "Tap during big crowds. Taps scale with your income rate, so a tap at 400 fans is worth many times a tap at 90, and a CROWD SURGE whistle makes thirty seconds of tapping the whole show.",
          "Never let a golden whistle drift past. Even the smallest prize beats nothing, and DERBY DAY during a full house with a streak going is the best moment the game can deal you.",
        ],
      },
      {
        heading: "Staff for idle income",
        items: [
          "Staff are the idle half of the build: upgrade tracks need you watching the board, but a deep payroll earns at full rate while you only tap.",
        ],
      },
    ],
    faqs: [
      {
        q: "Do I lose everything when I sell up?",
        a: "Levels, money, fanbase, staff and your place on the division ladder reset. Reputation stars, all 47 badges, club records and lifetime totals stay, along with the separate academy and its first team. Each star is a permanent 50 percent income boost and each badge a permanent two percent, so runs get faster every time.",
      },
      {
        q: "What is the golden whistle?",
        a: "A catchable bonus that drifts onto the pitch every couple of minutes while you play. Catch it inside about twelve seconds for one of five prizes: DERBY DAY (income pays seven times over for 77 seconds), CROWD SURGE (taps pay 25 times for 30 seconds), TV WINDFALL (fifteen minutes of income at once), WONDERGOAL GOES VIRAL (a fanbase jump) or SPONSOR GIFT (a free upgrade level).",
      },
      {
        q: "Does it earn while the tab is closed?",
        a: "Yes, at half rate for up to eight hours, paid out the next time you open the game on the same device. The league keeps going too: leave for an hour and two matchdays play without you, though the final matchday of a season always waits for you.",
      },
      {
        q: "Can the opponents be beaten forever?",
        a: "Each division is tougher than the last, and a division drawn later in a club's life is tougher again, so eventually the next title stops coming. That is the signal the current ground has peaked and the sell-up bar is the way forward.",
      },
      {
        q: "Can I buy gems?",
        a: "No. Gems only come from match results at your ground, and all they do is open packs of generated academy kids, each pack showing its odds before you open it. No real money ever touches them.",
      },
      {
        q: "Is anything in it real players or clubs?",
        a: "No. Stadium Tycoon is entirely our own toy world, which is exactly why the crowd can throw confetti at whatever it likes.",
      },
      {
        q: "Is Wonderkid Factory part of this now?",
        a: "Yes. The Academy tab runs the same academy with the same save, and the Wonderkid Factory page still works too.",
      },
    ],
  },

};
