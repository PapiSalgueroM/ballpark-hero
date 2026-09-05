/**
 * Free Kick, the site's first game you actually PLAY rather than answer.
 *
 * Round 433. The owner has asked for this more times than anything else on his
 * list: "add more games that your actually moving the keys and stuff and not
 * simply typing and reading", "look at cool math and there soccer games that
 * there actually moving with a player", "i would love a fuck ton more
 * animation, cause reading text is all fun and games but seeing animations
 * makes it more of a game feel". Every game on the site until now is a guess
 * or a menu. This one is aim, power, curve, and a keeper who dives at you.
 *
 * THE WHOLE ENGINE IS PURE AND DETERMINISTIC, which is what makes it testable
 * without a browser: the page owns the animation frames, this file owns the
 * physics and the rules. A shot is decided by four numbers the player chose
 * (aim x, aim y, power, curve) plus the keeper's dive, and the keeper's dive
 * for a given kick comes from the seed, so the same seed plays the same round
 * every time and scripts/simFreeKick.mjs can play thousands of them.
 *
 * The goal frame is measured in metres and the pitch is drawn from it, so the
 * numbers below read like a real goal: 7.32 wide, 2.44 high, taken from the
 * penalty spot out to 25 metres depending on the round.
 *
 * ROUND 445 MOVED THE SHARED HALF OUT AND CHANGED NOTHING ELSE. The seeded
 * generator, the day seed, the spray law and the ladder builder now live in
 * src/lib/arcade.ts, because the second arcade game runs on the same four
 * things and the owner's instruction is one engine, many sports. Every number
 * below is the number Round 433 shipped, in the same order, so a seed plays
 * the same ten kicks it always did.
 */
import {
  buildLadder, clamp, daySeed, lehmer, sprayFor as arcadeSpray,
  ROUNDS_PER_RUN, type SprayConfig,
} from './arcade';

export { daySeed, lehmer, ROUNDS_PER_RUN };

export const GOAL_WIDTH = 7.32;
export const GOAL_HEIGHT = 2.44;

/** Where the ball ends up, in goal coordinates: x is -1 (left post) to 1 (right post), y is 0 (grass) to 1 (bar). */
export interface ShotResult {
  x: number;
  y: number;
  onTarget: boolean;
  saved: boolean;
  scored: boolean;
  hitPost: boolean;
  hitWall: boolean;
  points: number;
  /* Where the keeper went, so the page can animate the dive it actually made. */
  keeperX: number;
  keeperY: number;
  /* The flight, sampled 0 to 1, for the page to draw. Pure, so a test can read it. */
  path: Array<{ x: number; y: number }>;
  verdict: string;
}

export interface KickSetup {
  /** Distance from the goal line in metres. Further is harder. */
  distance: number;
  /** How many defenders stand in the wall. */
  wallSize: number;
  /** 0 to 1, how good the keeper is at reading the shot this round. */
  keeperSkill: number;
  /** Which way the keeper is leaning before the ball is struck, -1 to 1. */
  keeperLean: number;
  label: string;
}

export interface Aim {
  /** -1 to 1 across the goal. */
  x: number;
  /** 0 to 1 up the goal. */
  y: number;
  /** 0 to 1. Under about 0.35 the ball never reaches the goal. */
  power: number;
  /** -1 to 1. Bends the flight, and bends it more the slower the ball travels. */
  curve: number;
}

/** The ten kicks of a run: further out, more men in the wall, better keepers. */
export function buildRun(seed: number): KickSetup[] {
  return buildLadder(seed, ROUNDS_PER_RUN, (t, rng, i) => {
    const distance = Math.round((11 + t * 14) * 10) / 10;
    const wallSize = i === 0 ? 0 : Math.min(5, 1 + Math.floor(t * 5 + rng() * 0.9));
    const keeperSkill = clamp(0.28 + t * 0.42 + (rng() - 0.5) * 0.12, 0.2, 0.82);
    const keeperLean = Math.round((rng() * 2 - 1) * 100) / 100;
    return {
      distance,
      wallSize,
      keeperSkill,
      keeperLean,
      label: i === 0 ? 'Penalty spot, no wall' : `${distance} m, ${wallSize} in the wall`,
    };
  });
}

/**
 * The flight. Power carries the ball, curve bends it, and a slow ball bends
 * more, which is the whole reason to trade power for placement. Sampled so the
 * page can draw exactly the arc the rules scored.
 */
export function flightPath(aim: Aim, setup: KickSetup, spray: { x: number; y: number } = { x: 0, y: 0 }): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  const bend = aim.curve * (1.25 - aim.power * 0.6) * 0.55;
  const dip = (aim.power - 0.55) * 0.22;
  for (let i = 0; i <= 24; i += 1) {
    const t = i / 24;
    /* Bend is a parabola in t: the ball leaves straight and swerves late.
       Spray is the price of power (see sprayFor) and lands the same way, so a
       hit and hope drifts off the spot the player picked. */
    const x = aim.x + bend * t * t + spray.x * t * t;
    const y = aim.y * (1 - t * t * 0.12) - dip * t * t + Math.sin(t * Math.PI) * 0.08 * aim.power + spray.y * t * t;
    pts.push({ x, y });
  }
  return pts;
}

/**
 * POWER COSTS ACCURACY. This is the whole risk in the game and it was missing
 * from the first draft: with a clean flight, "top left corner, full power"
 * beat a thinking player 2539 points to 1206 over 400 runs, which
 * scripts/simFreeKick.mjs section 2 caught before the game ever shipped. A
 * harder strike sprays further from the spot you picked, and it grows with the
 * square of power, so the last fifth of the bar is where the miss lives.
 * Distance adds a little of its own. The result is a real triangle: power
 * beats the keeper, placement beats the post, and you cannot have both.
 *
 * The rule itself is arcade.ts's, shared with Buzzer Beater since Round 445.
 * These three numbers are this game's prices for it, and they are the numbers
 * Round 433 measured. simFreeKick's negative control rewrites this line.
 */
export const SPRAY: SprayConfig = { power: 0.34, distance: 0.011, vertical: 0.7 };

export function sprayFor(aim: Aim, setup: KickSetup, rng: () => number): { x: number; y: number } {
  return arcadeSpray(aim.power, setup.distance - 11, SPRAY, rng);
}

/** Where the keeper commits, given the shot and this round's keeper. */
export function keeperDive(aim: Aim, setup: KickSetup, rng: () => number): { x: number; y: number } {
  const read = setup.keeperSkill;
  const guess = rng() * 2 - 1;
  /* The better the keeper the more the dive is the real shot and the less it
     is the guess he was leaning toward. A hard, low shot is harder to read. */
  /* Pace buys a little time off the keeper, but only a little: when this was
     large it cancelled his read entirely and full power became strictly best. */
  const hurry = clamp(aim.power - 0.5, 0, 0.5) * 0.18;
  const x = aim.x * (read - hurry) + setup.keeperLean * (1 - read) * 0.6 + guess * (1 - read) * 0.5;
  const y = clamp(aim.y * (read + 0.15) + rng() * 0.2, 0, 1);
  return { x: clamp(x, -1.35, 1.35), y };
}

/** The wall's reach, in goal x, for a given number of defenders. */
export function wallSpan(setup: KickSetup): { lo: number; hi: number } | null {
  if (setup.wallSize <= 0) return null;
  const width = 0.16 * setup.wallSize;
  /* The wall lines up to protect the near post, on the side the keeper leans away from. */
  const centre = setup.keeperLean > 0 ? -0.34 : 0.34;
  return { lo: centre - width, hi: centre + width };
}

/**
 * Score one kick. The single place the rules live, so the page, the harness
 * and any future mode all agree.
 */
export function takeShot(aim: Aim, setup: KickSetup, rng: () => number): ShotResult {
  const spray = sprayFor(aim, setup, rng);
  const path = flightPath(aim, setup, spray);
  const end = path[path.length - 1];
  const keeper = keeperDive(aim, setup, rng);

  /* Under the wall's height and through its span is blocked. The wall is only
     a factor while the ball is still low and still over the wall's ground. */
  const span = wallSpan(setup);
  const overWallAt = path[Math.round(path.length * 0.45)];
  const hitWall = !!span && overWallAt.y < 0.38 && overWallAt.x > span.lo && overWallAt.x < span.hi;

  const insideX = Math.abs(end.x) < 1;
  const insideY = end.y > 0 && end.y < 1;
  const hitPost = !hitWall && Math.abs(Math.abs(end.x) - 1) < 0.035 && insideY;
  const tooWeak = aim.power < 0.34 + (setup.distance - 11) * 0.012;
  const onTarget = !hitWall && !hitPost && insideX && insideY && !tooWeak;

  /* The keeper saves what he can reach: a dive is a reach, not a teleport. */
  const reach = 0.34 + setup.keeperSkill * 0.2;
  const dx = Math.abs(end.x - keeper.x);
  const dy = Math.abs(end.y - keeper.y);
  const saved = onTarget && dx < reach && dy < reach + 0.25;

  const scored = onTarget && !saved;

  /* Points reward the hard shot, not the safe one: distance, the wall you beat
     and the corner you found all pay. A tap into the middle is worth least. */
  let points = 0;
  if (scored) {
    const corner = Math.max(Math.abs(end.x), end.y > 0.5 ? end.y : 0);
    points = Math.round(
      100 +
      (setup.distance - 11) * 6 +
      setup.wallSize * 15 +
      corner * 120 +
      setup.keeperSkill * 60,
    );
  }

  const verdict = hitWall
    ? 'Into the wall.'
    : hitPost
    ? 'Off the post.'
    : tooWeak
    ? 'Never had the legs.'
    : !insideX || !insideY
    ? 'Wide of everything.'
    : saved
    ? 'Keeper got there.'
    : 'In the net.';

  return { x: end.x, y: end.y, onTarget, saved, scored, hitPost, hitWall, points, keeperX: keeper.x, keeperY: keeper.y, path, verdict };
}

/** The best a run can pay, for the honest "you scored N of M" line. */
export function maxRunScore(kicks: KickSetup[]): number {
  return kicks.reduce(
    (n, k) => n + Math.round(100 + (k.distance - 11) * 6 + k.wallSize * 15 + 120 + k.keeperSkill * 60),
    0,
  );
}

