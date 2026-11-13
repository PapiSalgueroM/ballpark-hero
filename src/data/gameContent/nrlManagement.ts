import type { GameContentMap } from './types';

export const NRL_MANAGEMENT_CONTENT: GameContentMap = {
  '/nrl-team-manager': {
    intro: [
      'Choose the 2026 or 2027 NRL season and pick a club. Select your starting 13 and six reserves, decide when to train or recover, and pick a match plan before you face the next side.',
      'The 2026 field has 17 clubs. You can start with 19 verified opening-matchday names and ages per club and 11 generated players, or use fully generated squads. Select 2027 to manage the Perth Bears in their debut season with generated squads. Both seasons use simulated ratings, contracts, fixtures and results.',
    ],
    howToPlay: [
      'Choose your season and club, then open Squad. Pick a fit starting 13 and six reserves. Save a lineup for this season and preview any replacements before applying it.',
      'Open Position training in Squad to teach one fit player a second role. In this game, a course takes four regular-season rounds, including byes. Assign the learned role in your starting 13 when you want to use it.',
      'Try Reserve-grade development in Squad to give an eligible young player four rounds away from the first team for one rating point. He keeps his contract and cap place, and you can recall him early without the gain.',
      'Courses cover the back three, wing and centre on the same side, the halves, the two props, and the second rows and lock. A player can learn one extra role.',
      'Check the next opponent and pick a tactic. Open Attack plan to compare projected attack and defence changes for playing through the middle or shifting wide. A plan lasts one match, including both halves in Play Live. Use training to prepare or give a tired squad a chance to recover.',
      'Before Play Live, you can hold one named reserve for halftime. Bring them on then, keep a rotating reserve on, or leave the held reserve unused.',
      'Play the round and check the result against the ladder. A bye is a break in the fixture list, so check who you play after it.',
      'Finish in the top eight to reach the finals. Follow the bracket and try to win the Grand Final.',
      'Open the club office to extend contracts and approach eligible recruits. Check how much cap room you have in the season the deal starts.',
      'In Academy, you can pay once from simulated club cash to improve the potential of newly scouted prospects from the next round. The facilities stay with that club if you move.',
      'Open State of Origin in the club office to coach New South Wales or Queensland through three games. Pick your 13 starters, six reserves and tactic. The 2026 series uses the official dates and venues. Later schedules and all results are simulated.',
      'Choose Rugby League World Cup beside Career saves to coach one of ten men’s national teams through the 2026 pools, semifinals and final. The fixtures and opening selections are sourced. The game uses those opening squads throughout, with simulated ratings, lineups after the first round and results. Your tournament saves separately.',
      'Offer an eligible player less than the asking salary to request a simulated three-season counteroffer. Review the salary and dates before accepting.',
      'In Contracts, arrange an offseason move for an eligible player. They stay this season, and the receiving club pays their salary for the remaining term.',
      'Set Standard, Value or Premium ticket prices in Finance before your first paid home match. That choice applies to home gates for the rest of the season.',
      'Open Season review for your final ladder, finances, recorded scoring and finals scores. Stay with your club, move to a new club, or retire and keep your career record.',
      'Before playing Round 1, accept the optional Board pathways objective in Season review. Give three players aged 23 or under four regular-season appearances each to earn a club cash bonus.',
      'Open Change clubs in Season review to see simulated openings based on expansion and the season’s ladder, with a board target for each suggested club.',
      'In Season review, open Player history and choose a player to see recorded regular-season and finals appearances, scoring and rating changes.',
    ],
    rules: [
      'The 2026 regular season spans 27 rounds, with 24 matches and three byes for each club. The game generates its own fixture list for each year.',
      'Use your fullback, halves, forwards and the rest of the starting 13 to build a balanced side. The quick sim can use up to four of your six named reserves, one per position covered.',
      'A try scores four points. Conversions and penalty goals add two. A field goal scores one, or two from beyond the 40-metre line.',
      'Wins and byes are worth two ladder points, draws are worth one and losses earn none. Points difference is the first ladder tiebreaker.',
      'Club wages count toward the Top 30 base cap. This game reserves minimum wages for open places and promotes academy players if you leave spots empty.',
      'After 2027, the game uses projected financial rules and original fixtures. The PNG Chiefs join from 2028. Your career saves on this browser without an account.',
    ],
    example: [
      'Your side scores three tries, kicks two conversions and lands a penalty goal. That is 18 match points. If the other club scores 17, you win the match and earn two ladder points.',
      'Several starters are tired after the win. Check the next opponent, then pick a fresher forward and a recovery session before playing again.',
    ],
    tips: [
      'Check condition as well as rating before locking in your starting 13.',
      'Look at the fixture list before deciding whether to train. A recovery week can matter more before a hard run of matches.',
      'Check next season’s cap before you make an offer. A player who has agreed to join still plays for his current club until rollover.',
    ],
    faqs: [
      { q: 'When can I manage the Perth Bears?', a: 'Start a 2027 career with the Perth Bears, or move there in Season review after finishing 2026.' },
      { q: 'Does the game use the published NRL fixtures?', a: 'Each season has an original simulated fixture list. The optional 2026 names and ages come from each club’s opening matchday. All match results are simulated.' },
      { q: 'Can I resume my season later?', a: 'Yes. When browser storage is available, use Career saves to keep up to three careers on the same browser and device. Each slot can keep one checkpoint to restore, and 2026 and 2027 careers can sit side by side.' },
    ],
  },
};
