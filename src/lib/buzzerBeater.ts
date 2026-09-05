/**
 * Buzzer Beater: ten jump shots, the horn on every one.
 *
 * Round 445, the site's SECOND game you play rather than answer, and the first
 * test of the owner's one engine many sports instruction. It runs on
 * src/lib/arcade.ts: the same seeded generator, the same day seed, the same
 * spray law and the same ten round ladder as Free Kick. What differs is what a
 * sport differs in, which is the physics of the shot and the man in front of
 * you.
 *
 * WHY BASKETBALL AND WHY THIS SHOT. A penalty shootout would have reused more
 * and read as the same game: a keeper, a frame, a flat target. A jump shot
 * reuses the same four shared parts and reads nothing like a free kick,
 * because the target is a HOOP YOU DROP THE BALL INTO FROM ABOVE. That one
 * change turns the arc from decoration into the whole decision, and it makes
 * the third axis short and long rather than high and wide.
 *
 * THE PHYSICS IS REAL AND SO IS THE GEOMETRY THAT MATTERS.
 * A ball launched at angle t with speed v from release height h follows an
 * ordinary parabola, and this file solves it exactly for where it crosses rim
 * height on the way down. The dimensions are the real ones: a 10 foot rim
 * (3.05 m), an 18 inch inside diameter ring (0.2286 m radius) and a size 7
 * ball about 0.24 m across (0.1197 m radius).
 *
 * That gives the rule the whole game hangs on. Seen along the flight, the ring
 * is an ellipse: it stays its full width across, but its depth shrinks to
 * R * sin(entry angle). So the margin the ball has for being short or long is
 * R * sin(entry) - r, which COLLAPSES as the shot flattens and reaches zero at
 * about 32 degrees of entry. That is not a number invented for a game, it is
 * why coaches teach arc, and it is what makes a line drive a bad shot here
 * even when it is aimed perfectly.
 *
 * WHAT IS ARCADE, SAID PLAINLY. Those margins are centimetres, and nobody hits
 * a centimetre with a power bar and a thumb. The two FORGIVENESS constants
 * below multiply the real margins so the game is playable. They change how
 * many go in; they do not change which arc is better than which, because they
 * scale every arc by the same factor. The bar to speed mapping is arcade for
 * the same reason: it is absolute, so the right stopping point moves with
 * every shot instead of sitting at the middle of the bar for ever.
 *
 * THE TRIANGLE, which is what scripts/simBuzzerBeater.mjs actually holds:
 *   - Flat is fast and cheap but the ring closes up and the defender blocks it.
 *   - High opens the ring and clears the hand, but it needs more speed, and
 *     speed sprays (arcade.ts's shared law, the same one Free Kick runs on).
 *   - Fading away from the contest lowers the hand you have to clear, and
 *     costs you the middle of the ring to do it.
 * None of those has a fixed answer, because the best arc moves with the
 * distance and the best power moves with both.
 */
import {
  buildLadder, clamp, daySeed, lehmer, sprayFor as arcadeSpray,
  ROUNDS_PER_RUN, type SprayConfig,
} from './arcade';

export { daySeed, lehmer, ROUNDS_PER_RUN };

/* The real court, in metres. */
export const RIM_HEIGHT = 3.05;
export const RIM_RADIUS = 0.2286;
export const BALL_RADIUS = 0.1197;
/** Where a jump shot leaves the hand, roughly, above the floor. */
export const RELEASE_HEIGHT = 2.13;
/** The free throw line, measured to the centre of the ring, not the backboard. */
export const FREE_THROW = 4.19;
const G = 9.81;

/* The launch angle the arc control spans, in degrees. Below the bottom of this
   the ring has no depth left at all, above the top the ball is a moon ball. */
const ARC_MIN_DEG = 34;
const ARC_MAX_DEG = 66;

/* The strength bar, in metres per second at release. It is ABSOLUTE on purpose:
   if it were a percentage of the perfect strength for the shot in front of you,
   then "stop it in the middle" would be right on every single shot and one
   third of the game would be solved. */
const V_MIN = 6.6;
const V_MAX = 11.4;

/** Full left or full right aim, in metres off the centre of the ring. */
const LATERAL_SPAN = 0.30;

/* How much a fade to one side changes the hand you have to clear. Going at the
   defender puts the ball nearer his reach, going away from him puts it
   further, and either way you have given up the middle of the ring for it. */
const FADE_RELIEF = 0.24;

/* The arcade forgiveness, explained in the header. The depth axis gets more
   because it is the axis the strength bar has to hit and a bar is coarse; the
   side to side axis gets less because aiming is precise and spray is what
   attacks it. Both scale every arc identically, so the shape of the choice is
   the real one. */
const DEPTH_FORGIVENESS = 3.0;
const LATERAL_FORGIVENESS = 1.25;

/**
 * Free Kick's prices for the shared spray law are 0.34 and 0.011; these are
 * Buzzer Beater's, in metres of sideways miss and in fractions of release
 * speed. simBuzzerBeater's negative control rewrites this line.
 */
export const SPRAY: SprayConfig = { power: 0.115, distance: 0.024, vertical: 0.08 };

export interface HoopSetup {
  /** Distance from the centre of the ring, in metres. */
  distance: number;
  /** How high the contesting hand gets, in metres. Zero means nobody is there. */
  contestReach: number;
  /** How far in front of the shooter that hand is, in metres. */
  contestDist: number;
  /** Which side he closed out from, -1 or 1. */
  contestSide: number;
  label: string;
}

export interface Release {
  /** -1 to 1 across the ring. 1 is a full fade to the right. */
  x: number;
  /** 0 to 1, flat line drive up to a moon ball. */
  arc: number;
  /** 0 to 1, the strength bar. */
  power: number;
}

export interface HoopResult {
  made: boolean;
  blocked: boolean;
  swish: boolean;
  /** Metres off the centre of the ring, side to side. */
  lateral: number;
  /** Metres past the centre of the ring. Negative is short. */
  depth: number;
  /** The angle the ball arrived at, in degrees. Under about 32 nothing goes in. */
  entryDeg: number;
  launchDeg: number;
  /** Release speed in metres per second, after spray. */
  speed: number;
  /** The forgiving windows this shot actually had, in metres, for the drawing. */
  lateralWindow: number;
  depthWindow: number;
  points: number;
  /** The flight, in metres, side on. Pure, so the page draws what was scored. */
  path: Array<{ x: number; y: number }>;
  verdict: string;
}

/** The ten shots of a run: further out, a higher hand, and it arrives sooner. */
export function buildRun(seed: number): HoopSetup[] {
  return buildLadder(seed, ROUNDS_PER_RUN, (t, rng, i) => {
    const distance = Math.round((FREE_THROW + t * 4.41) * 10) / 10;
    const contestReach = i === 0 ? 0 : Math.round(clamp(2.44 + t * 0.66 + (rng() - 0.5) * 0.16, 2.34, 3.12) * 100) / 100;
    const contestDist = i === 0 ? 0 : Math.round((1.1 - t * 0.44) * 100) / 100;
    const contestSide = i === 0 ? 0 : (rng() > 0.5 ? 1 : -1);
    const hand = contestReach >= 2.88 ? 'a big hand up' : contestReach >= 2.66 ? 'a hand up' : 'a late closeout';
    return {
      distance,
      contestReach,
      contestDist,
      contestSide,
      label: i === 0 ? 'Free throw line, nobody there' : `${distance} m, ${hand} on your ${contestSide < 0 ? 'left' : 'right'}`,
    };
  });
}

/**
 * The release speed a shot of this length really needs at this launch angle,
 * solved from the same parabola the flight uses. It is what a shooter's feel
 * is a guess at, and it is what the strength bar is deliberately NOT a
 * percentage of: see the note on V_MIN above, and simBuzzerBeater's control.
 * Returns a large finite number when the angle is too flat to ever get there,
 * so a nonsense release is a rocket rather than a NaN.
 */
export function requiredSpeed(distance: number, launchDeg: number): number {
  const theta = (launchDeg * Math.PI) / 180;
  const climb = distance * Math.tan(theta) - (RIM_HEIGHT - RELEASE_HEIGHT);
  if (climb <= 0) return 60;
  return Math.min(60, Math.sqrt((G * distance * distance) / (2 * Math.cos(theta) * Math.cos(theta) * climb)));
}

/** How high the ball is, in metres, after travelling x metres downrange. */
function heightAt(x: number, vx: number, vy0: number): number {
  const t = x / vx;
  return RELEASE_HEIGHT + vy0 * t - (G * t * t) / 2;
}

/** Where the ball is x metres downrange when it falls back to a given height. */
function reachesHeight(height: number, vx: number, vy0: number): number | null {
  const rise = height - RELEASE_HEIGHT;
  const disc = vy0 * vy0 - 2 * G * rise;
  if (disc <= 0) return null;
  return (vx * (vy0 + Math.sqrt(disc))) / G;
}

export function sprayFor(release: Release, setup: HoopSetup, rng: () => number): { x: number; y: number } {
  return arcadeSpray(release.power, setup.distance - FREE_THROW, SPRAY, rng);
}

/**
 * Score one shot. The single place the rules live, so the page, the harness
 * and any future mode all agree.
 */
export function takeShot(release: Release, setup: HoopSetup, rng: () => number): HoopResult {
  const spray = sprayFor(release, setup, rng);

  const launchDeg = ARC_MIN_DEG + clamp(release.arc, 0, 1) * (ARC_MAX_DEG - ARC_MIN_DEG);
  const theta = (launchDeg * Math.PI) / 180;
  /* THE STRENGTH BAR IS ABSOLUTE, and this one line is why the game has three
     decisions in it rather than two. simBuzzerBeater's negative control
     rewrites exactly this line into the obvious alternative, a percentage of
     the strength the shot in front of you needs, and measures what that costs.
     Spray lands on the release, not on the ball in mid air: a hard shot leaves
     the hand a fraction off line and a fraction off pace, and the parabola
     honours it from there. */
  const clean = V_MIN + clamp(release.power, 0, 1) * (V_MAX - V_MIN);
  const speed = Math.max(2, clean * (1 + spray.y));
  const vx = speed * Math.cos(theta);
  const vy0 = speed * Math.sin(theta);

  const lateral = clamp(release.x, -1.2, 1.2) * LATERAL_SPAN + spray.x;

  /* The contest. Going at his side puts the ball nearer the hand, fading off
     it puts the ball further away, and the middle of the ring is the price. */
  const effectiveReach = setup.contestReach > 0
    ? setup.contestReach + setup.contestSide * clamp(release.x, -1.2, 1.2) * FADE_RELIEF
    : 0;
  const blocked = setup.contestReach > 0 && heightAt(setup.contestDist, vx, vy0) < effectiveReach;

  const crossing = reachesHeight(RIM_HEIGHT, vx, vy0);
  /* Draw a little past the ring so the ball visibly drops through it, or in
     front of it, or behind it. Same parabola, just further along. */
  const drawTo = reachesHeight(RIM_HEIGHT - 0.62, vx, vy0) ?? (2 * vx * vy0) / G;
  const stopAt = blocked ? setup.contestDist : Math.max(0.4, drawTo);
  const path: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= 26; i += 1) {
    const x = (stopAt * i) / 26;
    path.push({ x, y: heightAt(x, vx, vy0) });
  }

  let depth = 0;
  let entryDeg = 0;
  if (crossing === null) {
    /* The ball never got up to the ring at all. Call it as short as it looks. */
    depth = -Math.max(0.6, setup.distance - drawTo);
    entryDeg = 0;
  } else {
    depth = crossing - setup.distance;
    const tRim = crossing / vx;
    entryDeg = (Math.atan2(G * tRim - vy0, vx) * 180) / Math.PI;
  }

  /* The ring seen along the flight: full width across, foreshortened in depth.
     Under about 32 degrees of entry the ball simply does not fit. */
  const lateralWindow = (RIM_RADIUS - BALL_RADIUS) * LATERAL_FORGIVENESS;
  const depthWindow = Math.max(0, RIM_RADIUS * Math.sin((entryDeg * Math.PI) / 180) - BALL_RADIUS) * DEPTH_FORGIVENESS;

  const offSide = Math.abs(lateral) / lateralWindow;
  const offDepth = depthWindow > 0 ? Math.abs(depth) / depthWindow : Infinity;
  const made = !blocked && crossing !== null && offSide < 1 && offDepth < 1;
  const purity = made ? 1 - Math.max(offSide, offDepth) : 0;
  const swish = made && purity >= 0.5;

  /* Points reward the shot nobody else takes: the distance, the hand you shot
     over, and how cleanly it went through. A free throw pays least. */
  let points = 0;
  if (made) {
    const contestPay = setup.contestReach > 0 ? Math.max(0, setup.contestReach - 2.3) * 120 : 0;
    points = Math.round(80 + (setup.distance - FREE_THROW) * 28 + contestPay + purity * 100);
  }

  const verdict = blocked
    ? 'Blocked. He got a hand to it.'
    : crossing === null
    ? 'Never got up there.'
    : made
    ? (swish ? 'Swish.' : 'In, off the iron.')
    : offSide >= offDepth
    ? (lateral < 0 ? 'Off the left side of the ring.' : 'Off the right side of the ring.')
    : depth < 0
    ? (entryDeg < 33 ? 'Front rim. That was too flat to drop.' : 'Short. Front rim.')
    : entryDeg < 33
    ? 'Off the back iron. Nothing that flat goes in.'
    : 'Long. Off the back iron.';

  return {
    made, blocked, swish, lateral, depth, entryDeg, launchDeg, speed,
    lateralWindow, depthWindow, points, path, verdict,
  };
}

/** The best a run can pay, for the honest "you made N of M" line. */
export function maxRunScore(shots: HoopSetup[]): number {
  return shots.reduce((n, s) => {
    const contestPay = s.contestReach > 0 ? Math.max(0, s.contestReach - 2.3) * 120 : 0;
    return n + Math.round(80 + (s.distance - FREE_THROW) * 28 + contestPay + 100);
  }, 0);
}

/** The launch angle a given arc setting means, for the on screen readout. */
export function launchDegFor(arc: number): number {
  return ARC_MIN_DEG + clamp(arc, 0, 1) * (ARC_MAX_DEG - ARC_MIN_DEG);
}

/** The release speed a given power setting means, for the on screen readout. */
export function speedFor(power: number): number {
  return V_MIN + clamp(power, 0, 1) * (V_MAX - V_MIN);
}
