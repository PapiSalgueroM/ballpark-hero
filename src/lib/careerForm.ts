/* Round 1523: the one morale term every career's season form shares.

   The four US My Careers each carried their own copy of one line, form = rating + (morale - 60) / k + ..., with
   their own k (NBA 12, NFL 10, MLB 12, NHL 12). The copies live here now, once, and the four engines bind them
   with their own divisors and replay byte identical (scripts/simCareerForm.mjs section 1 replays seeded careers
   against the engines as they were, and its control changes one divisor to show the replay can fail).

   Import free on purpose: five engines and the Soccer Career hub read it, so it can never close a cycle. */

/** Per career: how many morale points make one point of form, and the morale that is worth nothing. */
export const CAREER_FORM = {
  nba: { per: 12, neutral: 60 },
  nfl: { per: 10, neutral: 60 },
  mlb: { per: 12, neutral: 60 },
  nhl: { per: 12, neutral: 60 },
} as const;

export type CareerFormKey = keyof typeof CAREER_FORM;

/** What his morale is worth this season in points of form: zero at the career's neutral point. */
export function moraleForm(career: CareerFormKey, morale: number): number {
  const { per, neutral } = CAREER_FORM[career];
  return (morale - neutral) / per;
}
