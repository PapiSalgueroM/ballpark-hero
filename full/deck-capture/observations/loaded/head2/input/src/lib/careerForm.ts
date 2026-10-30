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
    nothing. A chooser who picks every card at random sits at 75, inside the zero band.
    Fifteen points a step, not ten, is measured too (remote check r1523-var, 400 careers a fleet): at ten the house
    fleet, whose phone runs cold so the shared cap eats a low morale's cost, gained 0.71 league games a season and
    six points fewer journeymen, and a fleet that answers every text, whose morale sits at 98, gained 1.29 games and
    7.5 points fewer solid pros. At fifteen (1,200 careers, three seeds) the two gain 0.30 and 0.94 games a season,
    the Ballon d'Or rate stays inside its seed to seed spread, and the legacy tiers move about as much as that spread
    (scripts/simCareerForm.mjs section 4 has every number). */
export const CAREER_FORM = {
  nba: { per: 12, neutral: 60 },
  nfl: { per: 10, neutral: 60 },
  mlb: { per: 12, neutral: 60 },
  nhl: { per: 12, neutral: 60 },
  soccer: { per: 15, neutral: 81 },
} as const;

export type CareerFormKey = keyof typeof CAREER_FORM;

/** What his morale is worth this season in points of form: zero at the career's neutral point. */
export function moraleForm(career: CareerFormKey, morale: number): number {
  const { per, neutral } = CAREER_FORM[career];
  return (morale - neutral) / per;
}

/* ─── Soccer Career: morale that plays ───
   A step from -2 to +1: zero across the middle (74 to 88), +1 from 89, -1 from 73 down to 59, -2 at 58 and
   below (the scale tops out at 100, so +1 is as high as it goes). The step is league games, beside the dressing
   room's phoneAppsSwing and capped together with it at plus or minus three (a happy phone and a happy head never
   stack past three games), and a tenth of a rating point a step on the season rating. A pure function of the
   save: no draw, so the season's dice are the same. Kept small on purpose: /soccer-career is at its weight cap. */

/** His morale as a step from -2 to +1 (the "|| 0" turns a minus zero into 0). Morale a save never had is neutral. */
export function soccerMoraleStep(morale: number | undefined): number {
  return (morale ?? -1) >= 0 ? Math.max(-2, Math.min(2, Math.round(moraleForm('soccer', morale as number)) || 0)) : 0;
}

/** The league games the dressing room (phone) and his head (morale) are worth together, capped at three either way. */
export function dressingRoomApps(phoneSwing: number, morale: number | undefined): number {
  return Math.max(-3, Math.min(3, phoneSwing + soccerMoraleStep(morale)));
}

/** What his morale adds to the season rating: a tenth a step. */
export function soccerMoraleRating(morale: number | undefined): number {
  return soccerMoraleStep(morale) / 10;
}

/** The hub's line under the Morale bar: what this season's morale is worth. The games say "up to" because the
    dressing room shares the three game cap and the summer's texts can still move the phone at the press, so the
    hub cannot know the games for sure; the rating it can, and says it exactly (simCareerForm section 3 holds the
    line against every press). */
export function soccerMoraleLine(morale: number): string {
  const s = soccerMoraleStep(morale), n = Math.abs(s);
  return `Morale ${morale}: ${s ? `up to ${n} ${s > 0 ? 'more' : 'fewer'} league game${n > 1 ? 's' : ''}, rating ${s > 0 ? '+' : ''}${s / 10}` : 'no swing'} this season.`;
}
