/* ─── Round 123's field draw, lifted in Round 1525 ───
   The question every career award asks: did your season beat the best rival season in the league that year?
   careerAwards.ts asked it for the four US careers with their tables beside it; Soccer Career asks it too
   (soccerSeasonAwards.ts). The draw lives here so a career binds it without loading another sport's tables, and
   careerAwards.ts re-exports it, so every older caller reads the same functions from the same name. Moved
   verbatim, reasoning and all. Import free. */

/**
 * How hard one award is to win.
 *
 * pool is how many players are genuinely in the conversation, slots is how
 * many of them get it. Both are real counts wherever a real count exists,
 * and every one of them is sourced in the tables that use it. The model treats you
 * as needing to beat the best of pool/slots rivals, which is the standard
 * order statistic shortcut: the k-th best of n draws sits at about the same
 * place as the best of n/k draws. It slightly overstates the year to year
 * wobble on a many-slot award like All-NBA, and that is the direction I
 * wanted the error in, because wobble is what stops one player owning an
 * award for a decade.
 *
 * grade is the thumb on the scale, in standard deviations, for the part of
 * an award that is not about the numbers. It is positive when voters do not
 * give the award to your kind of player and negative when they do. No AP
 * MVP has ever gone to a wide receiver; fifty of the first fifty four
 * undisputed winners were quarterbacks. That is not something a stat line
 * knows and it is not something I am going to pretend away.
 */
export interface FieldConfig {
  pool: number;
  slots: number;
  grade?: number;
}

/** A standard Gumbel draw, G = -ln(-ln u). Mean is Euler's constant, 0.5772. */
export function gumbel(rng: () => number): number {
  const u = Math.min(1 - 1e-12, Math.max(1e-12, rng()));
  return -Math.log(-Math.log(u));
}

/**
 * Where the best of n seasons lands, in standard deviations above the mean.
 *
 * This is the textbook extreme value result for the maximum of n normal
 * draws: it converges to a Gumbel with location sqrt(2 ln n) minus a small
 * correction and scale 1 / sqrt(2 ln n). It matters that the SCALE shrinks
 * as n grows, because that is the bit that makes intuition wrong. The best
 * of 150 players is further out than the best of 15, but it is also STEADIER
 * year to year, which is exactly why MVP goes to a small handful of names
 * over a decade while the fifteenth best player in the league changes
 * constantly.
 *
 * A flat normal draw was tried first and thrown away. Modelling the field as
 * mean + sd * normal(bar, 0.7) gave an NBA MVP rate of 61 percent per season
 * for a 95 ceiling player, because a symmetric bell has far too much mass
 * below the bar. Real superstars win it about a third of their prime years.
 * Kareem Abdul-Jabbar holds the record at six, in twenty seasons.
 *
 * Round 1103: the bar with the draw passed in, so awards that share one league (All-Star, All-NBA and MVP in NBA
 * My Career) can be decided against the SAME year instead of a fresh one each. `g` is a gumbel draw.
 */
export function bestOfNAt(n: number, g: number): number {
  const nn = Math.max(2, n);
  const L = Math.log(nn);
  const root = Math.sqrt(2 * L);
  const loc = root - (Math.log(L) + Math.log(4 * Math.PI)) / (2 * root);
  return loc + g / root;
}

/**
 * Round 1525: did your season beat the field, for a career whose field table lives beside its own engine (Soccer
 * Career, soccerSeasonAwards.ts). The same z, the same rival count and the same one draw as careerAwards.ts's
 * beatsField, the field passed in.
 */
export function beatsFieldOf(
  rng: () => number, base: { mean: number; sd: number }, score: number, cfg: FieldConfig,
): boolean {
  const z = base.sd > 0 ? (score - base.mean) / base.sd : 0;
  const rivals = Math.max(1.2, cfg.pool / Math.max(1, cfg.slots));
  return z > bestOfNAt(rivals, gumbel(rng)) + (cfg.grade ?? 0);
}
