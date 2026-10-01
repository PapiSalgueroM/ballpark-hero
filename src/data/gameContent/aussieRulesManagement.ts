import type { GameContentMap } from './types';

export const AUSSIE_RULES_MANAGEMENT_CONTENT: GameContentMap = {
  '/aussie-rules-manager': {
    intro: [
      'Aussie Rules Manager gives you a club, a senior squad and ten rounds to climb a six-club ladder. Pick your eighteen starters and five interchange players, prepare for the next opponent and change your approach between quarters. Goals are worth six points, behinds are worth one, and the total decides the match.',
      'The clubs, players, ratings and results in this game are fictional. The short home-and-away competition is our own format. It is not the real AFL fixture, a real player database or a prediction of actual results. The match uses Aussie Rules scoring and the 2026 eighteen-player field and five-player interchange setup.',
      'You can play without an account. Your season is kept in this browser when storage is available, including a match paused between quarters. A completed season records a play rather than adding ranked points. Try another club or a different plan after the final round.',
    ],
    headings: {
      howToPlay: 'How to Play Aussie Rules Manager',
      rules: 'Aussie Rules Manager Match and Season Rules',
      example: 'Aussie Rules Manager Worked Example',
      tips: 'Aussie Rules Manager Squad and Tactics Tips',
      faq: 'Aussie Rules Manager Questions',
    },
    howToPlay: [
      'Choose a fictional club to begin a season. Every club has thirty-six generated senior players. Read the player roles, ratings and condition before settling on the team for your next match.',
      'The matchday group has twenty-three different players: eighteen starters and five on the interchange bench. The remaining senior players sit this match out. A bench player is an available replacement, not an extra player on the oval.',
      'Make one training or rest decision before the match. In this game, training adds eight preparation points and eight fatigue points. Rest removes up to thirty fatigue points. Moving to the next round removes another twenty fatigue points and resets preparation. These are game mechanics, not claims about real training programs.',
      'Choose your quarter tactic, then play the quarter. Read the score, the opponent and your players\' condition before choosing the next approach. Each quarter represents twenty minutes of active playing time, with stoppages left out of that count.',
      'Use the bench at quarter breaks to put fresh players on the field. This game allows up to five swaps per break, with each incoming player taking the same role as the outgoing player. Keep eighteen starters and five interchange players after a swap. These are break-time changes, so this game does not display a counted in-play interchange meter.',
      'Finish all four quarters to settle the match. Review the other results and the ladder, then continue to the next round. The same six clubs meet home and away over ten rounds. The club at the top after round ten wins this fictional league.',
    ],
    rules: [
      'A goal adds six points and a behind adds one. A displayed score of 6.8 means six goals and eight behinds, for 44 points. Compare total points rather than goals alone.',
      'A match has four quarters. The 2026 match rules use eighteen players on the field, five interchange players and centre throw-ups. The five bench players do not include a separate substitute.',
      'A league win earns four ladder points, a draw earns two for each club and a loss earns none. Percentage is total points scored divided by total points conceded, multiplied by one hundred. Clubs are ranked by ladder points, then percentage. An exact tie uses the original generated club order as this fictional league\'s final tiebreak. This is separate from the six match points awarded for kicking a goal.',
      'The season schedule, generated ratings, training effects and tactic effects belong to this game. Six clubs and ten rounds are a short fictional league, not the actual AFL competition structure. There is no real-world finals series in this version.',
      'Our squad selection uses six backs, five midfielders, one ruck and six forwards, plus five bench players. Same-role swaps and the limit of five swaps per break are game constraints. They are not presented as official restrictions on all real-world positional changes.',
      'Bench changes are offered at quarter breaks. AFL Regulation 12.8 excludes changes during those intervals from the counted interchange limit. There is no pretend 75-change counter for actions that do not count toward it.',
      'Your local save belongs to this browser. Reloading a finished season does not earn another completion. Private browsing, denied storage or clearing site data can prevent a season from being kept, so the game should not promise a cloud save.',
    ],
    example: [
      'Imagine your fictional club reaches half time on 6.8 (44), while the opponent has 7.2 (44). They have kicked one more goal, but the match is level because your six extra behinds make up the difference. Reading only the first number would give you the wrong game state.',
      'You use the break to move a tired starter onto the bench and bring a fresh player in. The matchday group still contains the same twenty-three players, with eighteen on the field and five on the bench. You choose a tactic for the third quarter and see whether it helps rather than assuming every change guarantees a goal.',
      'Suppose the match ends 12.10 (82) to 11.12 (78). Your club wins by four points and receives four ladder points. Both totals also enter the season percentage calculation. You then prepare for the next fixture, with the last result and your players\' condition still relevant.',
    ],
    tips: [
      'Read condition alongside rating. A strong player who has done most of the running can be a different choice from a fresh interchange option late in the match.',
      'Read the tactic matchup before each quarter. In this simulation, Control counters Direct, Direct counters Pressure, and Pressure counters Control. Pressure also costs more condition. These advantages affect chances rather than guaranteeing the final score.',
      'Check goals, behinds and the total together. A club can kick fewer goals and still be level or ahead through behinds. Ladder points and match points also mean different things.',
      'Keep a usable bench. The interchange players should give you choices through four quarters rather than simply being the next five names on a list.',
      'Review your last match before changing the next team. Use the actual score, condition and ladder rather than assuming a new tactic must be better because its name sounds more aggressive.',
    ],
    faqs: [
      { q: 'Does Aussie Rules Manager use real AFL players or clubs?', a: 'No. Clubs, players, skills and match results are generated for this fictional league. They are labeled as game data rather than passed off as a verified real roster.' },
      { q: 'How do goals and behinds work?', a: 'Goals are worth six points and behinds are worth one. The total wins the match. For example, 6.8 and 7.2 both total 44 points.' },
      { q: 'Why are there five players on the bench?', a: 'The 2026 AFL matchday setup has eighteen players on the field and five interchange players, making twenty-three. A separate substitute is not part of this setup.' },
      { q: 'Does this use the real AFL draw and finals?', a: 'No. This game uses six fictional clubs and a ten-round home-and-away league, with the ladder leader winning. It does not claim to reproduce the actual AFL fixture or finals system.' },
      { q: 'Can I resume my season?', a: 'The game keeps its season actions in local browser storage when storage is available. You can resume between quarters. It is not an account cloud save, and clearing site data removes the local record.' },
      { q: 'Does finishing add points to the leaderboard?', a: 'This first version records a completed play with no ranked score. A restored completed season is not counted as a second finish.' },
    ],
  },
};
