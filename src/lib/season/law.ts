/* Round 1045: one scoring law, restated so the Season Centre never pulls
   clubManager.ts into /soccer-career.

   Club Manager scores every league game it plays with this law, and the
   Season Centre derives a Soccer Career season with the same numbers:
   - the constants come from clubManager.ts `simScore` (the clamp of
     1.25 + edge * 0.055 + boost into 0.12 to 4.2),
   - the home and away boosts from clubManager.ts `simAiMatch` (0.2 and -0.08),
   - the draw is clubManager.ts `poisson` (the Knuth loop, capped at 7), with
     the generator passed in instead of Math.random.
   scripts/simSeasonLaw.mjs fences the three: it reads clubManager.ts with its
   comments stripped, checks the constants, and feeds both bodies the same
   counted generator so a drift in either fails the gate.

   This file imports NOTHING (the arcade.ts rule), so it can sit in any chunk.

   The fold that ends the copies (critic C14): Soccer Career's European nights
   draw with soccerCareerContinental.ts `poissonGoals` (cap 11) and Club
   Manager keeps its private `poisson`. Both should import this file, with the
   behaviour held equal and simSeasonLaw switched to assert the import. That
   is a later round of this lane (recorded in docs/PROJECT-STATE.md by the
   lead); until it lands, the Season Centre's "?" never calls these scores the
   same engine as the European nights. */

export const LAW = {
  base: 1.25,
  perPoint: 0.055,
  min: 0.12,
  max: 4.2,
  cap: 7,
  home: 0.2,
  away: -0.08,
} as const;

/** Expected goals for a side whose strength is `edge` points above the other's. */
export function goalLambda(edge: number, venue: number): number {
  const raw = LAW.base + edge * LAW.perPoint + venue;
  return raw < LAW.min ? LAW.min : raw > LAW.max ? LAW.max : raw;
}

/** One Poisson draw by Knuth's loop, capped like Club Manager's. */
export function poissonDraw(lambda: number, rng: () => number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k += 1;
    p *= rng();
  } while (p > L);
  return Math.min(k - 1, LAW.cap);
}
