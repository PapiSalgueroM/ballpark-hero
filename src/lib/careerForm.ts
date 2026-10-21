/* Round 1523: the one morale term every career's season form shares.

   The four US My Careers each carried their own copy of one line, form = rating + (morale - 60) / k + ..., with
   their own k (NBA 12, NFL 10, MLB 12, NHL 12). The copies live here now, once, and the four engines bind them
   with their own divisors and replay byte identical (scripts/simCareerForm.mjs section 1 replays seeded careers
   against the engines as they were, and its control changes one divisor to show the replay can fail).

   Soccer Career wrote morale in 87 places and read it in none of the places that pick a team or rate a season. It
   binds the same term with its own neutral point and turns it into a small step (below).

   Import free on purpose: five engines and the Soccer Career hub read it, so it can never close a cycle. */

/** Per career: how many morale points make one point of form, and the morale that is worth nothing.
    Soccer's neutral point is measured, not picked: the median morale at the moment of the press over the house
    fleet (scripts/lib/careerStep.mjs, 160 careers, 3,906 presses, remote check r1523-probe on 2ab9bef1) is 81,
    because a career's morale runs high. A neutral point of 60 would have handed most careers extra games for
    nothing. A chooser who picks every card at random sits at 75, one point under the zero band. */
export const CAREER_FORM = {
  nba: { per: 12, neutral: 60 },
  nfl: { per: 10, neutral: 60 },
  mlb: { per: 12, neutral: 60 },
  nhl: { per: 12, neutral: 60 },
  soccer: { per: 10, neutral: 81 },
} as const;

export type CareerFormKey = keyof typeof CAREER_FORM;

/** What his morale is worth this season in points of form: zero at the career's neutral point. */
export function moraleForm(career: CareerFormKey, morale: number): number {
  const { per, neutral } = CAREER_FORM[career];
  return (morale - neutral) / per;
}

/* ─── Soccer Career: morale that plays ───
   A step from -2 to +2, zero across the middle (76 to 85), +1 from 86, +2 from 96, -1 from 75 down to 66, -2 at
   65 and below. The step is league games (beside the dressing room's phoneAppsSwing, the two capped together at
   plus or minus three, so a happy phone and a happy head never stack past three games) and a tenth of a rating
   point a step on the season rating. A pure function of the save: no draw, so the season's dice are the same. */
export const SOCCER_MORALE_STEP_MAX = 2;
export const DRESSING_ROOM_CAP = 3;

/** His morale as a step from -2 to +2. Morale a save never had counts as neutral. */
export function soccerMoraleStep(morale: number | undefined): number {
  if (typeof morale !== 'number' || !Number.isFinite(morale)) return 0;
  const step = Math.round(moraleForm('soccer', morale));
  if (step === 0) return 0;
  return Math.max(-SOCCER_MORALE_STEP_MAX, Math.min(SOCCER_MORALE_STEP_MAX, step));
}

/** The league games the dressing room (phone) and his head (morale) are worth together, capped at three either way. */
export function dressingRoomApps(phoneSwing: number, morale: number | undefined): number {
  return Math.max(-DRESSING_ROOM_CAP, Math.min(DRESSING_ROOM_CAP, phoneSwing + soccerMoraleStep(morale)));
}

/** What his morale adds to the season rating: a tenth a step. */
export function soccerMoraleRating(morale: number | undefined): number {
  return soccerMoraleStep(morale) / 10;
}

/** The hub's line under the Morale bar: what this season's morale is worth, after the cap the phone shares. */
export function soccerMoraleLine(morale: number, phoneSwing: number): string {
  const step = soccerMoraleStep(morale);
  if (step === 0) return `Morale ${morale}: settled, no swing in games or rating this season.`;
  const games = dressingRoomApps(phoneSwing, morale) - phoneSwing;
  const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  const rating = `rating ${sign(step / 10)}`;
  if (games === 0) return `Morale ${morale}: ${rating} this season (the dressing room already has your games at the limit).`;
  return `Morale ${morale}: ${sign(games)} league game${Math.abs(games) === 1 ? '' : 's'}, ${rating} this season.`;
}
