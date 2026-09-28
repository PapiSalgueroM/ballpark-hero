/**
 * Round 646: the clue ladder four daily guessers pay on, in one place.
 *
 * Baseball Career, Hockey Career, NBA Career and Olympics each carried their
 * own copy of this array. A guess on the first clue pays the top rung and every
 * clue after it pays less, down to 100 on the last.
 */
export const CAREER_CLUE_SCORES = [1000, 850, 700, 550, 400, 250, 100] as const;

/**
 * What a guess pays at clue level `clueLevel` (0 is the first clue showing):
 * that rung, the last rung for anything past the ladder, and 0 when the player
 * did not guess it. The four hooks record through this and the Olympics page
 * shows its "pts available" from it, so the number on screen is the number
 * recorded.
 */
export function careerClueScore(guessed: boolean, clueLevel: number): number {
  return guessed ? CAREER_CLUE_SCORES[Math.min(clueLevel, CAREER_CLUE_SCORES.length - 1)] : 0;
}

/**
 * The most any of the four can record: a correct guess on the first clue,
 * scored through the rule above. game_score_caps holds it for baseball-career,
 * hockey-career, nba-career and olympics (scripts/simCapsAreCeilings.mjs).
 */
export const CAREER_CLUE_CEILING = careerClueScore(true, 0);
