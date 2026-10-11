/* Round 1229: who scores, as ONE table.
 *
 * Club Manager shares a side's goals among its men by position and rating. Until this round the table
 * lived in the engine twice, once for my own squad (scorerWeight) and once for the opposition in a match
 * I play (oppShotWeight), the same numbers typed out a second time, and the league's scorer race used
 * neither. Both now call this module, and so does the league book (clubManagerLeagueBook.ts), so my
 * striker, the striker I am playing against and a striker two hundred miles away are weighed by one rule.
 *
 * The expressions are the engine's own, kept term for term (base * Math.pow(rating / 70, 2)), so every
 * weight is the same double it was and the seeded stream reads the match it read before the lift.
 * src/lib/clubManagerGoalWeight.test.ts holds every position and rating against a literal copy of the
 * two tables as they stood, and scripts/simCmLeagueBook.mjs holds whole careers against the commit before.
 *
 * Pure: it imports a type and nothing else.
 */
import type { Position } from '@/types/game';

/** A man's share of his side's goals, before anything about the day: his position, then his rating squared. */
export function goalWeight(pos: Position, rating: number): number {
  const base =
    pos === 'ST' || pos === 'CF' ? 5 :
    pos === 'LW' || pos === 'RW' ? 3.6 :
    pos === 'CAM' ? 3 :
    pos === 'LM' || pos === 'RM' ? 2.2 :
    pos === 'CM' ? 1.6 :
    pos === 'CDM' ? 0.9 :
    pos === 'GK' ? 0.02 : 0.55;
  return base * Math.pow(rating / 70, 2);
}

/** His share of the assists: flatter than the goals, so a holder or a full back sets one up now and then. */
export function assistWeight(pos: Position, rating: number): number {
  return goalWeight(pos, rating) * 0.6 + 0.5;
}

/** A goal that is not from the spot or a direct free kick has an assist this often. */
export const ASSIST_SHARE = 0.7;
