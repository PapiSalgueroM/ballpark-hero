import type { GameContentMap } from './types';

export const AUSSIE_RULES_MANAGEMENT_CONTENT: GameContentMap = {
  '/aussie-rules-manager': {
    intro: [
      'Aussie Rules Manager hands you one of eighteen fictional clubs and as many seasons as you want to give it. Each season is 23 rounds, then the finals, a Grand Final, a summer of birthdays and retirements, and a national draft that fills your list back up for next year. Goals are worth six, behinds one, and the ladder runs on four points a win.',
      'The clubs, players, ratings and results are all made up. The shape of the competition is real where we could check it against two sources: the 2026 finals add a wildcard week, where 7th plays 10th and 8th plays 9th, before the final eight that has run since 2000. Playing 23 rounds with no byes, lists of 36 and the summer growth are this game\'s own rules, not the real AFL fixture or a prediction of anything. The draft order follows the real 2026 one.',
      'You can play without an account. Your career is kept in this browser when storage is available, mid match included. Every season you finish records a play rather than adding ranked points. A season takes as long as you like: three taps a round if you let the list manager pick and play each match in one go, or a quarter at a time if you want to call it.',
    ],
    headings: {
      howToPlay: 'How to Play Aussie Rules Manager',
      rules: 'Aussie Rules Manager Match and Season Rules',
      example: 'Aussie Rules Manager Worked Example',
      tips: 'Aussie Rules Manager Squad and Tactics Tips',
      faq: 'Aussie Rules Manager Questions',
    },
    howToPlay: [
      'Choose a club from the menu. The clubs are grouped from contenders down to battlers, so you can pick an easy start or a long rebuild. Every club has thirty-six generated players with a skill, a ceiling, an age and a fitness level.',
      'Before each match your list manager picks the best eighteen starters and five interchange players on current form: skill, less what fatigue takes off. You can change any spot in Squad, then choose to train or rest. Training adds eight preparation and eight fatigue to every player; rest takes thirty fatigue off.',
      'Pick a tactic and play one quarter at a time, or play the whole match in one tap with the same tactic. At each quarter break you can make up to five same-role changes from the bench.',
      'After the match you see the round\'s other results. The hub boxes show your next match, your ladder spot with points and percentage, your squad, your honour board, and the finals bracket once September comes round.',
      'Finish in the top ten to play the finals. Win the Grand Final for the flag. Then the summer ages everyone a year, some veterans retire, and on draft night you pick young players to fill your list back to thirty-six before the next season starts.',
    ],
    rules: [
      'A goal adds six points and a behind adds one. A displayed score of 6.8 means six goals and eight behinds, for 44 points. Compare totals to find the winner.',
      'A match has four quarters. The 2026 match rules use eighteen players on the field, five interchange players and centre throw-ups. The five bench players do not include a separate substitute.',
      'A league win earns four ladder points, a draw earns two for each club and a loss earns none. Percentage is total points scored divided by total points conceded, multiplied by one hundred. Clubs are ranked by ladder points, then percentage. An exact tie uses the club list order as this game\'s final tiebreak.',
      'The season is 23 rounds of nine games, so every club plays every other club once and six of them twice, home and away. The draw changes every season. Real seasons have an opening round and byes; this game leaves them out.',
      'The finals follow the 2026 system: a wildcard week where 7th hosts 10th and 8th hosts 9th, with the higher placed winner taking the 7th spot. Then qualifying finals 1st v 4th and 2nd v 3rd, where the winners rest a week and the losers drop to a semi final, and elimination finals 5th and 6th against the wildcard winners, where the losers go out. Preliminary finals and the Grand Final follow. A drawn final, the Grand Final included, plays two 3 minute periods of extra time, and two more until somebody leads, with no golden score. Real periods add time on; this game keeps them a flat 3 minutes.',
      'Our squad selection uses six backs, five midfielders, one ruck and six forwards, plus five bench players. Same-role swaps and the limit of five swaps per break are game constraints. They are not presented as official restrictions on all real-world positional changes.',
      'Bench changes are offered at quarter breaks. AFL Regulation 12.8 excludes changes during those intervals from the counted interchange limit. There is no pretend interchange counter for changes that do not count toward it.',
      'The summer is this game\'s rule. Players under 22 grow two to five points a year toward their ceiling, the mid twenties grow a little, the late twenties hold, and from thirty they slow down. Retirement starts at 31 and nobody plays past 35. The draft order is the real 2026 one: clubs that missed the finals first, worst first, then finalists by the week they went out, with the runner up and the premier last. Every list must keep seven backs, six midfielders, two rucks and seven forwards.',
      'Your local save belongs to this browser. Reloading a finished season does not earn another completion. Private browsing, denied storage or clearing site data can prevent a career from being kept, so the game does not promise a cloud save.',
    ],
    example: [
      'Imagine your club reaches half time on 6.8 (44), while the opponent has 7.2 (44). They have kicked one more goal, but the match is level on points. You use the break to bring a fresh midfielder on for a tired one.',
      'Suppose the match ends 12.10 (82) to 11.12 (78). Your club wins by four points and takes four ladder points. Over the season, 1850 points for and 1700 against gives a percentage of 1850 / 1700 x 100 = 108.8, which splits you from a club on the same points with 104.3.',
      'Now say you finish 3rd. You meet 2nd in a qualifying final. Win, and you rest a week before a preliminary final. Lose, and you still get a semi final against an elimination final winner. Finish 8th instead and you host 9th in the wildcard week, then need four more wins for the flag.',
    ],
    tips: [
      'Read fatigue alongside skill. Twenty three rounds is long, and a team that trains every week runs out of legs by the back half. Rest when the matchday group is tired.',
      'Read the tactic matchup before each quarter. In this simulation, Control counters Direct, Direct counters Pressure, and Pressure counters Control. The opponent read shows their usual style. They stick with it about half the quarters and switch the rest, so countering it helps but never locks in a win.',
      'Percentage matters. Two clubs on the same points are split by it, so a big win in round three can decide who plays a home final in September.',
      'Think about the draft before it comes. If a ruck or two are near the end, the list must keep two rucks, and a pick that would leave you short is refused. Ceilings on draft night are your scouts\' range, not a promise.',
      'Young players with room to grow are the long game. A nineteen year old with a high ceiling can be your best player in three seasons.',
    ],
    faqs: [
      { q: 'Does Aussie Rules Manager use real AFL players or clubs?', a: 'No. Clubs, players, skills and match results are generated for this fictional league. They are labeled as game data rather than passed off as a verified real roster.' },
      { q: 'How do goals and behinds work?', a: 'Goals are worth six points and behinds are worth one. The total wins the match. For example, 12.8 (80) beats 11.10 (76) even though it came from one fewer scoring shot.' },
      { q: 'Why are there five players on the bench?', a: 'The 2026 AFL matchday setup has eighteen players on the field and five interchange players. This game keeps that shape and lets you swap same-role players at the breaks.' },
      { q: 'Does this use the real AFL draw and finals?', a: 'The finals, yes in shape: the 2026 wildcard week for 7th to 10th, then the final eight. The draw, no: this game plays 23 rounds with no byes and makes a new fixture each season between eighteen fictional clubs.' },
      { q: 'Can I resume my season?', a: 'Yes. Your whole career, every season of it, is kept in local browser storage when storage is available, including a match paused at a quarter break. An older ten round season from the first version of this game still opens where you left it.' },
      { q: 'Does finishing add points to the leaderboard?', a: 'Each finished season records a completed play with no ranked score. A restored season does not record again.' },
    ],
  },
};
