/**
 * Round 646: the guess count score three dailies record, in one place.
 *
 * Footle, Career and UFC each wrote the same line: a win pays 100 for every
 * guess left of the game's limit, the winning guess counted as used, and never
 * less than 100; a miss pays 0. Career and UFC carried it inline, so their
 * leaderboard ceilings were a copy of the numbers rather than a reading of the
 * rule. Each game's own score function (footleScore, careerDailyScore,
 * ufcDailyScore) passes its limit here, and each ceiling is that function on a
 * first guess win, so a change to this rule moves all three ceilings with it.
 */
export const GUESS_COUNT_POINTS = 100;
export const GUESS_COUNT_FLOOR = 100;

export function guessCountScore(won: boolean, guessesUsed: number, maxGuesses: number): number {
  return won ? Math.max(GUESS_COUNT_FLOOR, (maxGuesses - guessesUsed) * GUESS_COUNT_POINTS) : 0;
}
