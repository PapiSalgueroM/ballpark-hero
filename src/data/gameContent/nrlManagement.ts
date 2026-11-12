import type { GameContentMap } from './types';

export const NRL_MANAGEMENT_CONTENT: GameContentMap = {
  '/nrl-team-manager': {
    intro: [
      'Choose the 2026 or 2027 NRL season and pick a club. Select your starting 13 and six reserves, decide when to train or recover, and pick a match plan before you face the next side.',
      'The 2026 field has 17 clubs. Select 2027 to manage the Perth Bears in their debut season. Both seasons use original fixture lists. Clubs are real, and the game generates squads, ratings and results.',
    ],
    howToPlay: [
      'Choose your season and club, then open the squad. Look at the positions and condition of your players before filling the starting 13.',
      'Check the next opponent and pick a tactic. Use training to prepare or give a tired squad a chance to recover.',
      'Play the round and check the result against the ladder. A bye is a break in the fixture list, so check who you play after it.',
      'Finish in the top eight to reach the finals. Follow the bracket and try to win the Grand Final.',
      'Open the club office to extend contracts and approach eligible recruits. Check how much cap room you have in the season the deal starts.',
      'Review your final ladder, premiership result and finances, then advance to the next season with the players you kept or recruited.',
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
      { q: 'When can I manage the Perth Bears?', a: 'Pick the 2027 season to manage the Perth Bears. The 2026 season uses the 17 clubs in that year’s competition.' },
      { q: 'Does the game use the published NRL fixtures?', a: 'Each season has an original simulated fixture list. The game generates the squad for each real club and simulates all match results.' },
      { q: 'Can I resume my season later?', a: 'Yes, when browser storage is available. Use the same browser and device to return to your save.' },
    ],
  },
};
