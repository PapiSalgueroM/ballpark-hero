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

/* ─── Round 103: the postseason was a sentence, not a performance ───

   All four US career sims decided how far your team went and then printed a
   string: "Lost in the conference semis", "WON THE NBA FINALS". That was the
   whole postseason. You could go to seven Finals across a career and never
   find out what you did in any of them, which is backwards, because in every
   My Career game that has ever been made the playoff run IS the story. The
   guy who averages 22 all year and 31 in the Finals is a different player
   from the guy who averages 22 and then disappears in May, and the game had
   no way to tell you which one you were.

   Two pieces here. How long the run lasted, so the numbers sit on a real
   sample instead of one game. And whether you raised your level or shrank,
   which is its own roll, independent of the regular season, so a quiet year
   can still end with a monstrous playoff run and vice versa. */

/**
 * Rounds survived, -1 if the team missed out entirely, 0 for a first round
 * exit, 4 for champions.
 *
 * Every engine already computes this as an integer while it is picking the
 * result string, so it passes that integer straight in. An earlier version
 * of this parsed the string instead and got it wrong in every sport: "Lost
 * the Conference Finals" and "Lost the NBA Finals" both end in "finals", and
 * baseball and football do not use the word at all, so a run to the
 * Championship Series scored as a first round exit. Read the number, never
 * the sentence.
 */
export function playoffDepthOf(madePlayoffs: boolean, stage: number): number {
  return madePlayoffs ? Math.max(0, Math.min(4, stage)) : -1;
}

/**
 * Games actually played in that run. A first round exit is a short series,
 * a title run is two months of basketball or hockey; football is four games
 * at the very most and baseball is somewhere in between.
 */
export function playoffGames(depth: number, rng: () => number, sport: 'mlb' | 'nba' | 'nfl' | 'nhl'): number {
  if (depth < 0) return 0;
  if (sport === 'nfl') return Math.min(4, depth + 1);
  const perRound = sport === 'mlb' ? 4 : 5.6;
  const rounds = depth + 1;
  // Four best of sevens is 28 games and nobody has ever played a 29th.
  // Baseball's format tops out at 22.
  const cap = sport === 'mlb' ? 22 : 28;
  return Math.max(1, Math.min(cap, Math.round(rounds * perRound * (0.82 + rng() * 0.36))));
}

/**
 * How much a player raises or shrinks when it matters, in rating points.
 * Its own roll, nothing to do with the regular season, so the postseason is
 * genuinely a second story rather than a rerun of the first.
 */
export function clutchSwing(rng: () => number): number {
  const u = Math.max(1e-9, rng());
  const v = rng();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  let swing = z * 4.4;
  if (rng() < 0.09) swing += (rng() < 0.5 ? -1 : 1) * (4 + rng() * 5);
  return Math.max(-13, Math.min(13, swing));
}

/** A line for the season notes when the postseason was the story. */
export function clutchNote(swing: number, depth: number, sport: 'mlb' | 'nba' | 'nfl' | 'nhl'): string | null {
  if (depth < 0) return null;
  if (swing >= 7) {
    return sport === 'mlb' ? '🧊 Ice in October. You were a different hitter once the lights came on.'
      : sport === 'nba' ? '🧊 Playoff riser. Everything got harder and you got better.'
      : sport === 'nfl' ? '🧊 January football suited you. You were the best player on the field.'
      : '🧊 Playoff performer. Sixteen wins is a different sport and you were built for it.';
  }
  if (swing <= -7) {
    return sport === 'mlb' ? '😬 You could not buy a hit in October. It will follow you all winter.'
      : sport === 'nba' ? '😬 You disappeared when it mattered. The talk shows had a field day.'
      : sport === 'nfl' ? '😬 You were not the same player in January and everyone saw it.'
      : '😬 You went quiet in the playoffs. The room noticed.';
  }
  return null;
}
