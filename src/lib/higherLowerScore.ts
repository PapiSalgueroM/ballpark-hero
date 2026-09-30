/**
 * The Higher or Lower score, one formula for every sport's daily: 10 for a
 * correct round, and a streak bonus of 5 for every step a correct run has
 * reached before this round (the third right answer in a row adds 10 on top
 * of its 10).
 *
 * Round 643 review: this was nine inline copies of the same lines, one per
 * sport. It is shared now because the recorder needs it twice per hook: the
 * score on screen waits for a round's reveal, while the daily round is saved
 * (and recorded) the moment it is decided, so the recorder reads the score of
 * everything decided and the screen reads the score of everything revealed.
 */
export function higherLowerScore(results: ReadonlyArray<{ correct: boolean }>): number {
  const correctCount = results.filter((r) => r.correct).length;
  const streakBonus = results.reduce((sum, r, i) => {
    if (!r.correct) return sum;
    let s = 0;
    for (let j = i; j >= 0 && results[j].correct; j--) s++;
    return sum + Math.max(0, s - 1);
  }, 0);
  return correctCount * 10 + streakBonus * 5;
}

/**
 * Round 681: one decided round of the score above, as the knowledge line's
 * walk plays it (src/lib/choiceDaily.ts): `run` is how many rounds in a row
 * were right before this one, and a right answer adds 10 plus 5 for each of
 * them. Folded over a day's rounds it gives exactly higherLowerScore, which
 * scripts/simKnowledgeLine.mjs checks on all 1024 ways a ten round day can go.
 */
export function higherLowerStep(score: number, run: number, correct: boolean): { score: number; run: number } {
  if (!correct) return { score, run: 0 };
  return { score: score + 10 + 5 * run, run: run + 1 };
}

/** Round 646: the rounds in every sport's daily. The nine hooks read it
    rather than each keeping its own 10, so the ceiling below moves with it. */
export const HIGHER_LOWER_DAILY_ROUNDS = 10;

/**
 * Round 646: the most a Higher or Lower daily can record, in all nine sports.
 * Every round right: 10 rounds at 10 is 100, and the streak bonus pays 5 for
 * each step a run has reached before the round, 0 + 1 + ... + 9 = 45 steps,
 * 225. So 325. Scored through the function above rather than written down,
 * so a change to the rule or the round count moves it. game_score_caps holds
 * this number for every *-higher-lower key (scripts/simCapsAreCeilings.mjs).
 */
export const HIGHER_LOWER_DAILY_CEILING = higherLowerScore(
  Array.from({ length: HIGHER_LOWER_DAILY_ROUNDS }, () => ({ correct: true })),
);
