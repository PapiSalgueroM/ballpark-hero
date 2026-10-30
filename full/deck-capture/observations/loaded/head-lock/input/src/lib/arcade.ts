/**
 * The arcade engine: the parts every game you PLAY on this site shares.
 *
 * Round 445. Round 433 shipped /free-kick, the first game here you control
 * rather than answer, and the owner's standing instruction since 2026-09-04 is
 * that a second one is DATA plus that sport's events, not a second engine:
 * "u can use a lot of the same formatting and such for diffrent games dont
 * just made new coding if u can use a lot of the same". Round 426 is the
 * counter example, where one roster bug had to be fixed twice because two
 * sports had been written as two copies of one idea.
 *
 * So this file holds the four things Free Kick and Buzzer Beater genuinely
 * have in common, and nothing else:
 *   - the seeded generator, so one day is one run for everybody,
 *   - the day seed,
 *   - the spray model, which is the law that makes both games a game
 *     (see sprayFor: effort costs accuracy, and it costs it quadratically),
 *   - the ladder builder, so ten rounds ramp the same way in both.
 *
 * IT IMPORTS NOTHING, ON PURPOSE. scripts/simFreeKick.mjs and
 * scripts/simBuzzerBeater.mjs bundle a rewritten copy of their own rules file
 * for the negative control, and that copy has to be able to resolve this
 * module beside it in a temp directory. Storage lives in arcadeRecord.ts and
 * the animation lives in useArcadeFlight.ts for the same reason: what a
 * harness has to bundle stays free of the browser.
 */

/** How many rounds a run of either game is. */
export const ROUNDS_PER_RUN = 10;

/* A small deterministic generator, the site's usual Lehmer, so a seed plays
   the same ten rounds for everyone and a harness can replay a run exactly. */
export function lehmer(seed: number): () => number {
  let s = Math.trunc(seed) % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function daySeed(dateStr: string): number {
  /* Round 428's rule: the caller pins the day and passes it, so the round a
     player is dealt and anything filed about them always name the same date. */
  const digits = dateStr.replace(/-/g, '');
  return (parseInt(digits, 10) % 2147483647) || 7;
}

/**
 * EFFORT COSTS ACCURACY. This is the whole risk in both games, and Free Kick
 * shipped without it in its first draft: with a clean flight, "top left
 * corner, full power" beat a thinking player 2539 points to 1206 over 400
 * runs, and one button was the entire game. simFreeKick section 2 caught it
 * before launch.
 *
 * The cost grows with the SQUARE of effort, so the last fifth of the bar is
 * where the miss lives, and distance adds a little of its own. A game built on
 * this has a real triangle in it: effort beats the defender, placement beats
 * the frame, and you cannot have both.
 *
 * `effort` is 0 to 1 (how hard the ball was hit), `over` is how far past the
 * easiest range this attempt is, in that game's own units, and the config is
 * that game's prices. Both games call this with their own numbers and neither
 * one owns the rule.
 */
export interface SprayConfig {
  /** What a full effort strike costs in accuracy, in the game's own units. */
  power: number;
  /** What each unit of extra range costs on top. */
  distance: number;
  /** The second axis is usually tighter than the first: this is its share. */
  vertical: number;
}

export function sprayFor(effort: number, over: number, cfg: SprayConfig, rng: () => number): { x: number; y: number } {
  const magnitude = effort * effort * cfg.power + over * cfg.distance;
  return { x: (rng() * 2 - 1) * magnitude, y: (rng() * 2 - 1) * magnitude * cfg.vertical };
}

/**
 * The ladder: ten rounds that get harder, each one dealt from the same seeded
 * generator so the run is reproducible.
 *
 * `t` runs 0 to 1 across the run, which is the ramp, and `rng` is the shared
 * stream, so a game's own builder only has to say what gets harder and by how
 * much. The generator is created once and consumed in the order the callback
 * asks for it, so two calls with the same seed are byte identical.
 */
export function buildLadder<T>(seed: number, rounds: number, make: (t: number, rng: () => number, i: number) => T): T[] {
  const rng = lehmer(seed);
  const out: T[] = [];
  for (let i = 0; i < rounds; i += 1) {
    out.push(make(rounds > 1 ? i / (rounds - 1) : 0, rng, i));
  }
  return out;
}
