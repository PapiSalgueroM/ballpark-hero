import { evenScoreBuckets } from '@/lib/dailyStanding';

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

/** Round 716: every sport's daily is ten rounds, so a perfect day records
    this (325), and today's standing panel runs its rows up to it. */
export const HIGHER_LOWER_DAILY_ROUNDS = 10;
export const HIGHER_LOWER_DAILY_MAX = higherLowerScore(
  Array.from({ length: HIGHER_LOWER_DAILY_ROUNDS }, () => ({ correct: true })),
);
export const HIGHER_LOWER_SCORE_BUCKETS = evenScoreBuckets(HIGHER_LOWER_DAILY_MAX);

/** Round 848: what a saved Higher or Lower daily has to look like before the
    daily hook restores it (its isValidGuesses): no more than the day's ten
    rounds, each one a decided { t: 'result', correct } with a real boolean.
    A save that fails is thrown away and the day starts fresh, where it used
    to break the page on the first round it read. */
export function isHigherLowerDailyLog(log: ReadonlyArray<unknown>): boolean {
  return log.length <= HIGHER_LOWER_DAILY_ROUNDS && log.every((a) => {
    if (a === null || typeof a !== 'object') return false;
    const round = a as { t?: unknown; correct?: unknown };
    return round.t === 'result' && typeof round.correct === 'boolean';
  });
}
