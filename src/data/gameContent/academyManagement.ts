import type { GameContentMap } from './types';

export const ACADEMY_MANAGEMENT_CONTENT: GameContentMap = {
  '/wonderkid-factory': {
    intro: [
      'Wonderkid Factory is a free idle football academy game. Scouts bring kids through the door, coaches make every one of them a little better every second, and each kid has a ceiling he will never grow past. The whole game is one repeated decision: sell him now, or let him cook a bit longer.',
      'A transfer fee pays for the rating on the day plus a promise premium for the room he still has to grow, and that premium is fattest while he is young. From 21 it starts to fade and at 23 it is gone completely. A kid still in an academy bed on his 24th birthday walks out on a free. Promote him before then and his first-team career can last until 34.',
      'Cash buys four upgrades, reputation stars make every future run faster, and six regions raise the ceilings your scouts can find, from District Fields all the way to the World Stage. Every kid is generated, so no real footballer ever appears in your academy.',
    ],
    headings: {
      howToPlay: 'How to play Wonderkid Factory, a free idle soccer academy game',
      rules: 'Wonderkid Factory rules: ceilings, ages and academy money',
      example: 'Wonderkid Factory walkthrough: scouting a kid through to a sale',
      tips: 'Wonderkid Factory tips for scouting, selling and region moves',
      faq: 'Wonderkid Factory FAQ: scouting, selling and the academy save',
    },
    howToPlaySections: [
      {
        heading: 'Scouts bringing in kids and reading their ceiling',
        items: [
          'Wait for the scouts: kids arrive on their own, faster with every Scouting network level.',
          'Watch each kid grow toward his hidden ceiling. Scouting level 3 reads the ceiling as a range, level 6 reads it exactly, and a kid from a pack arrives with his tier\'s band already known.',
        ],
      },
      {
        heading: 'Selling a kid when his price looks right',
        items: [
          'Press Sell on a kid when the price looks right. The fee is quoted live on his card.',
        ],
        subsections: [
          {
            heading: 'Promoting a graduate to the first team',
            items: [
              'From age 18 to 23, you can promote a kid into one of five first-team places instead. Promotion frees his bed without paying a fee. Open First team to select a graduate, see his next birthday and decide when to sell him.',
            ],
          },
        ],
      },
      {
        heading: 'Boots from Stadium Tycoon titles and academy spending',
        items: [
          'Titles at Stadium Tycoon earn fictional boots and kit upgrades. Open the Boot room from First team to choose a wearer, move a pair or improve its level. Boots add to match rating for the defensive edge, without changing the player\'s transfer fee. Your collection survives sales, retirement and moving either ground.',
          'Spend the cash on Scouting, Coaching, Dorms and the Agent office. Costs climb with every level.',
        ],
      },
      {
        heading: 'Showcase Day training runs and the Deadline Day multiplier',
        items: [
          'Press Showcase Day when it charges: training runs x3 for 25 seconds.',
          'Hold your best kids for Deadline Day, which arrives every few minutes and pays x1.5 on every fee for 50 seconds.',
        ],
      },
      {
        heading: 'Moving your academy up through the Reputation box',
        items: [
          'Earn the region target, then move the academy up in the Reputation box: kids, cash and facilities stay behind, the star is forever.',
        ],
      },
    ],
    ruleSections: [
      {
        heading: 'The fixed ceiling and the fading promise premium',
        items: [
          'Every kid has a fixed ceiling, hidden until your scouts or his pack tier tell you where it sits. Training slows as he approaches it and can never pass it.',
          'The promise premium fades from age 21 and is gone at 23. At 24 a kid still in the academy leaves on a free. Promoted players follow the longer first-team career.',
        ],
      },
      {
        heading: 'How a senior trains, ages and eventually retires',
        items: [
          'A senior trains at half the academy rate through age 27, holds his rating at 28 and 29, then loses 1.2 rating at each birthday from 30. A senior year lasts fifteen watched academy minutes. He retires at 34 for no fee, and nobody ages while you are away.',
        ],
        subsections: [
          {
            heading: 'Working out a senior\'s transfer fee',
            items: [
              'Senior fees use the same rating, potential, position and academy bonuses as youth fees. The age multiplier stays at one through 27, then falls to 0.90 at 28, 0.78 at 29, 0.64 at 30, 0.50 at 31, 0.36 at 32 and 0.22 at 33. The next-birthday quote assumes no further training and keeps today\'s fee multiplier, so a later Deadline Day can change the actual offer.',
            ],
          },
        ],
      },
      {
        heading: 'What your first team does in Stadium Tycoon matches',
        items: [
          'The first team reduces opponents\' scoring chances in Stadium Tycoon. Each rating point above 60 helps, across up to five players. Selling a senior funds academy upgrades but removes his contribution immediately. The first team travels with you when you move the academy up or sell the ground.',
        ],
      },
      {
        heading: 'Full beds, reputation stars and region ceilings',
        items: [
          'A full academy stops scouting: beds come from the Dorms.',
          'Reputation stars pay +15% training speed and +10% on every fee, each, forever.',
          'Each region raises the ceilings scouts can find. The World Stage can produce a 99.',
        ],
      },
      {
        heading: 'Progress while you are away and how saves work',
        items: [
          'Away from the game, scouting and training run at half speed for up to 8 hours, and nobody ages while you are gone. Nothing sells itself either.',
          'Progress saves on this device. No sign-up.',
        ],
      },
    ],
    exampleSections: [
      {
        heading: 'Scouting a young midfielder with a wide ceiling range',
        paragraphs: [
          'Say the scouts drop off a 17 year old midfielder rated 58, and your level 3 scouts read his ceiling as somewhere between 68 and 75. Selling on the spot pays a modest fee: decent rating, healthy promise premium.',
        ],
      },
      {
        heading: 'Watching the promise premium shrink as he grows older',
        paragraphs: [
          'You leave him with the coaches while you upgrade the Agent office. By the time he is 19 he is rated 71 and the growth has visibly slowed, which tells you the ceiling is close. His card now quotes about a quarter more than the day one fee: the rating grew, but the promise premium shrank with his age.',
        ],
      },
      {
        heading: 'Selling into Deadline Day for the fee bonus',
        paragraphs: [
          'Deadline Day lights up. You press Sell inside the window and the fee pays half as much again. That one sale funds two Scouting levels, and the next kid through the door is found faster and read more precisely.',
        ],
      },
      {
        heading: 'Weighing a bigger fee against your defensive edge',
        paragraphs: [
          'For a first-team decision, picture five graduates rated 80. Their combined edge cuts the opponent\'s scoring chance by twenty percent before the match minimum. Selling one funds facilities but drops that edge to sixteen percent. A player nearing 28 may still help win a title even as his resale multiplier begins to fall, so the bigger fee and the stronger team are different rewards.',
        ],
      },
    ],
    tipSections: [
      {
        heading: 'Selling fast early before your Scouting improves',
        items: [
          'Early on, sell quickly and often: volume beats patience until Coaching has some levels.',
          'Scouting level 3 changes the game. Knowing the ceiling range tells you who is worth the wait.',
        ],
      },
      {
        heading: 'Knowing when a kid stops earning you anything more',
        items: [
          'A kid within a point of his ceiling has stopped earning you anything by waiting. Sell him on the next Deadline Day.',
        ],
      },
      {
        heading: 'Keeping Dorms full and spending before you move up',
        items: [
          'Dorms are quietly the best value when your academy keeps sitting full: a stopped scout earns nothing.',
          'Spend before you move up. Cash, facilities and every kid stay behind when the academy moves, and the next region\'s target counts from zero, so money left in the bank on moving day is simply gone.',
        ],
      },
    ],
    faqs: [
      { q: 'Are the players real?', a: 'No. Every kid is generated, names and all, and the game checks its generated names against every real player on the site so a made up kid can never wear a real name.' },
      { q: 'What do reputation stars do?', a: 'Each star is +15% training speed and +10% on every fee, forever, and stars also unlock the next region, where scouts find kids with higher ceilings.' },
      { q: 'Do I lose everything when I move up?', a: 'Cash, facility levels and the kids still in academy beds stay behind. Your promoted first team, stars and career totals travel with you.' },
      { q: 'Does the game progress while I am away?', a: 'Scouting and training keep running at half speed for up to 8 hours, and the calendar pauses so nobody ages out while you sleep. Sales are always yours to make, so no money moves while you are gone.' },
      { q: 'When exactly should I sell?', a: 'A trained academy kid can keep gaining value up to the eve of his 24th birthday, so watch the fee and the birthday together. First-team players create a different choice: their sale multiplier falls from 28, but keeping a strong graduate can still help win matches. Compare the current fee, the next-birthday quote and your title race.' },
    ],
  },
};
