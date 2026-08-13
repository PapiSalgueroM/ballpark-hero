/* ─── Round 98: seasons that are actually different from each other ───

   Every one of the four US career sims turned a rating into a stat line with
   almost no room for the season itself to matter. Measured across thousands
   of prime seasons, the gap between a 5th percentile year and a 95th
   percentile year for the same kind of player was tiny: a first baseman's
   home run total lived in a narrow band, a quarterback threw for roughly the
   same yardage every year, and a goalie's save percentage barely moved. So
   nobody ever had a career year and nobody ever had a year where nothing
   worked, which is most of what makes following a career interesting.

   Real careers are lumpy. A player has the season of his life at 24 and
   cannot repeat it. Another loses a year to a shoulder and comes back fine.
   The rating tells you roughly where someone belongs; the season tells you
   what actually happened.

   This is deliberately a SWING, not a bonus: it averages out to zero over a
   career, so a player's career totals still track his ability. It only
   decides which seasons are the good ones. */

/**
 * How far this season lands from the player's usual level, in rating points.
 * Centred on zero, bell shaped, with fat tails so genuine outliers exist.
 *
 * Younger players swing hardest, which is where breakout years and lost
 * years both come from; veterans are the most predictable people in sport.
 */
export function seasonSwing(rng: () => number, age = 27): number {
  // Box-Muller: a real bell curve, so most seasons sit near the player's
  // level and the extremes are rare rather than evenly likely.
  const u = Math.max(1e-9, rng());
  const v = rng();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  const sd = age <= 23 ? 4.2 : age <= 29 ? 3.2 : 2.6;
  let swing = z * sd;
  // Roughly one season in fourteen is a genuine outlier in one direction.
  if (rng() < 0.07) swing += (rng() < 0.5 ? -1 : 1) * (3 + rng() * 4);
  return Math.max(-11, Math.min(11, swing));
}

/** A short line for the season notes when the swing was big enough to notice. */
export function swingNote(swing: number, sport: 'mlb' | 'nba' | 'nfl' | 'nhl'): string | null {
  if (swing >= 6) {
    return sport === 'mlb' ? '🔥 Everything you hit found grass. Career year.'
      : sport === 'nba' ? '🔥 The rim looked like a swimming pool all season.'
      : sport === 'nfl' ? '🔥 Every read was right. Career year.'
      : '🔥 The puck followed you around all season.';
  }
  if (swing <= -6) {
    return sport === 'mlb' ? '🥶 Nothing fell in. You hit into everything.'
      : sport === 'nba' ? '🥶 The shot never came. Long year.'
      : sport === 'nfl' ? '🥶 Nothing worked. The tape was rough all year.'
      : '🥶 Ice cold. The bounces went the other way every night.';
  }
  return null;
}
