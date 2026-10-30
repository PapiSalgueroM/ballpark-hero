/**
 * How a Champions League knockout tie is read, one rule for every game on the
 * site that plays one. Club Manager (Round 507, extra time in Round 670) and
 * Soccer Career (Round 546) both settle their ties here, so the two cannot
 * disagree about who went through. Imports nothing, so neither engine can
 * pull the other in through it.
 *
 * THE RULE, two source verified 2026-09-28:
 *   - a tie is won on aggregate;
 *   - level on aggregate, in the seasons that had the away goals rule (up to
 *     2020-21), the side with more away goals goes through, and a tie level
 *     on both plays extra time;
 *   - extra time is thirty minutes at the second leg's ground, and in the away
 *     goals seasons an away goal in it counted like any other away goal, so a
 *     visiting side that scored in extra time left the home side needing two
 *     (uefa.com, the abolition release of 2021-06-24, names "the unfairness,
 *     especially in extra time, of obliging the home team to score twice";
 *     si.com, 2018-05-26: "if the away team scores in an extra time, the home
 *     team must score twice");
 *   - from 2021-22 away goals count for nothing, in ninety minutes or in extra
 *     time;
 *   - still level after extra time, penalties.
 * The URLs are in docs/design/round-670-extra-time-contract.md.
 *
 * So extra time needs no rule of its own: add its goals to leg two and read
 * the tie again. That is uclTieOutcome after extra time, in both games.
 */

/** One leg's score, stored in the tie's orientation: tie.home first. */
export interface UclLegScore { homeGoals: number; awayGoals: number }

/**
 * Who goes through, reading the tie the way the competition reads it.
 *
 * Both legs are stored in the TIE's orientation, tie.home first, and leg two is
 * played at tie.away's ground. So the goals that count as away goals are the
 * ones tie.away scored in leg one and the ones tie.home scored in leg two, and
 * writing that down here once is what stops every caller getting it backwards.
 *
 * Returns null for the winner when the tie is still level after everything the
 * era's rules can separate it by, which is the signal for extra time after
 * ninety minutes and for penalties after extra time.
 */
export function uclTieOutcome(
  tie: { leg1?: UclLegScore; leg2?: UclLegScore },
  awayGoalsRule: boolean,
): { homeAgg: number; awayAgg: number; winner: 'home' | 'away' | null; byAwayGoals: boolean } {
  const l1 = tie.leg1 ?? { homeGoals: 0, awayGoals: 0 };
  const l2 = tie.leg2 ?? { homeGoals: 0, awayGoals: 0 };
  const homeAgg = l1.homeGoals + l2.homeGoals;
  const awayAgg = l1.awayGoals + l2.awayGoals;
  if (homeAgg !== awayAgg) {
    return { homeAgg, awayAgg, winner: homeAgg > awayAgg ? 'home' : 'away', byAwayGoals: false };
  }
  if (awayGoalsRule) {
    const homeAway = l2.homeGoals;   // scored at tie.away's ground
    const awayAway = l1.awayGoals;   // scored at tie.home's ground
    if (homeAway !== awayAway) {
      return { homeAgg, awayAgg, winner: homeAway > awayAway ? 'home' : 'away', byAwayGoals: true };
    }
  }
  return { homeAgg, awayAgg, winner: null, byAwayGoals: false };
}
