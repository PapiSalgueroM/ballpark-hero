/**
 * Round 1552: the site's one no tie rule for "who has more" questions.
 *
 * Face Off (Round 289) only asks a pair when the bigger number is at least
 * MIN_RATIO times the smaller, so two athletes on the same number, or close
 * enough to be the same within rounding, are never a question. Sports
 * Millionaire's "worth the most" question had no such rule and marked the
 * first of a sort right when two of the four shared the top value. Both now
 * read the rule from here, so there is one number to change and not two.
 *
 * This file imports nothing on purpose: Face Off pulls in every Higher or
 * Lower pool, and a route that only needs the rule must not pay for those.
 */
export const MIN_RATIO = 1.04;

/** True when `hi` beats `lo` by at least MIN_RATIO, so `hi` is the one right answer. */
export function clearlyAhead(hi: number, lo: number): boolean {
  return Number.isFinite(hi) && Number.isFinite(lo) && lo > 0 && hi / lo >= MIN_RATIO;
}
