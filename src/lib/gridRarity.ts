/**
 * Round 401: one rarity formula for the three community rarity grids
 * (NFL, college, soccer), instead of the same four lines in three hooks.
 *
 * The counts are taken BEFORE the player's own selection row is inserted.
 * The two plus ones ARE that row: the player joins the crowd that picked
 * this cell, and joins the crowd that picked this name. Inserting first and
 * counting afterwards counted the row twice, so a first pick read 100
 * percent instead of the unicorn tier and every later share was biased
 * upward. The hooks now measure, then insert.
 *
 * 101 is the unicorn: nobody had picked anything for this cell yet.
 */
export function rarityPercent(totalBefore: number, playerBefore: number): number {
  if (totalBefore <= 0) return 101;
  return Math.round(((playerBefore + 1) / (totalBefore + 1)) * 100);
}
