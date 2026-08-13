/* ─── Round 91: give Conquest an actual strategy layer ───
   The problem: every Conquest map (NFL, NBA, MLB, NHL) decided games purely
   on team rating. The MAP ITSELF did nothing. That makes it a strength ladder
   with a map skin: the best team snowballs, and once a team is landless the
   rest of the season is a formality with no way back.

   What Risk-likes and the EA/2K franchise modes actually do, and what this
   adds, is make the board state feed back into the fight:

     1. MOMENTUM. Rolling up territory builds belief, so a growing empire gets
        a small edge.
     2. OVEREXTENSION. Past roughly 45 percent of the map that flips into a
        penalty. A superpower is stretched thin and everyone is gunning for
        it. This is the anti-snowball rule, and it is what keeps a season live
        to the final week instead of decided by week 6.
     3. LAST STAND. A landless team is playing for its existence and fights
        like it, so wipeouts are recoverable rather than terminal.
     4. FORM. Win and loss streaks nudge the number, so runs feel real.

   Everything is deliberately BOUNDED (see MAX_SWING). Ratings still decide
   most games; this only shifts the coin flip at the edges, which is exactly
   where drama lives. */

export interface MomentumCtx {
  /** Territories held by the home team. */
  homeLand: number;
  /** Territories held by the away team. */
  awayLand: number;
  /** Territories on the whole map. */
  totalLand: number;
  /** Current streak, positive for wins, negative for losses. */
  homeStreak?: number;
  awayStreak?: number;
}

/** Hard cap on how far this layer can move a win probability, either way. */
export const MAX_SWING = 0.14;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Strength-of-position score for one side, in probability points.
 * Positive helps that team. Kept small on purpose.
 */
function sideEdge(land: number, total: number, streak: number): number {
  if (total <= 0) return 0;
  const share = land / total;

  let edge = 0;
  // 1 + 2: momentum, then overextension once you are the runaway superpower.
  if (share <= 0.45) {
    edge += share * 0.14;            // up to about +0.063 while growing
  } else {
    edge += 0.45 * 0.14;             // keep the earned momentum
    edge -= (share - 0.45) * 0.30;   // but bleed it back as you overextend
  }

  // 3: last stand. Nothing left to lose, everything to play for.
  if (land === 0) edge += 0.075;

  // 4: form, capped so a hot streak is a nudge and not a cheat code.
  edge += clamp(streak, -4, 4) * 0.011;

  return edge;
}

/**
 * Adjustment to add to a rating-based home win probability.
 * Always returns a value inside [-MAX_SWING, MAX_SWING].
 */
export function momentumAdjust(ctx: MomentumCtx): number {
  const home = sideEdge(ctx.homeLand, ctx.totalLand, ctx.homeStreak ?? 0);
  const away = sideEdge(ctx.awayLand, ctx.totalLand, ctx.awayStreak ?? 0);
  return clamp(home - away, -MAX_SWING, MAX_SWING);
}

/** Apply the layer to a base probability, never letting a game become certain. */
export function applyMomentum(baseProb: number, ctx?: MomentumCtx): number {
  if (!ctx || ctx.totalLand <= 0) return baseProb;
  return clamp(baseProb + momentumAdjust(ctx), 0.05, 0.95);
}

/** Short human label for why the map is tilting a game, for the UI. */
export function edgeNote(ctx: MomentumCtx): string | null {
  if (ctx.totalLand <= 0) return null;
  const hShare = ctx.homeLand / ctx.totalLand;
  const aShare = ctx.awayLand / ctx.totalLand;
  if (ctx.homeLand === 0 || ctx.awayLand === 0) return 'Last stand: a landless team is fighting to survive';
  if (hShare > 0.45 || aShare > 0.45) return 'Overextended: the superpower is stretched thin';
  if (Math.abs(hShare - aShare) > 0.18) return 'Momentum: the bigger empire carries belief';
  return null;
}
