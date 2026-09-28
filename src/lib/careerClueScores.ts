/**
 * Round 646: the clue ladder four daily guessers pay on, in one place.
 *
 * Baseball Career, Hockey Career, NBA Career and Olympics each carried their
 * own copy of this array. A guess on the first clue pays the top rung and every
 * clue after it pays less, down to 100 on the last.
 */
export const CAREER_CLUE_SCORES = [1000, 850, 700, 550, 400, 250, 100] as const;

/**
 * The most any of the four can record: a correct guess on the first clue, the
 * top of the ladder. game_score_caps holds it for baseball-career,
 * hockey-career, nba-career and olympics (scripts/simCapsAreCeilings.mjs).
 */
export const CAREER_CLUE_CEILING = Math.max(...CAREER_CLUE_SCORES);
