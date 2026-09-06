/**
 * Career drills: the three training drills you actually PLAY, on the arcade
 * engine that Free Kick and Buzzer Beater run on.
 *
 * Round 468. His words, from the 2026-08-28 tweaks list: "More position
 * specific training minigames, harder: two axis wall shot timing, defender
 * tackle timing on a moving ball (click the ball not the feet), keeper
 * hold-and-drag glove save dives. Every position gets its own drills." And his
 * most repeated ask across every review: games where you move and time
 * things, not read and type.
 *
 * ONE ENGINE, MANY DRILLS. This file imports the seeded generator, the day
 * seed, the spray law and the ladder builder from src/lib/arcade.ts, and the
 * flight and the keeper from src/lib/freeKick.ts. Nothing about a ball in the
 * air is written twice: the wall shot's flight IS Free Kick's flight, its
 * keeper IS Free Kick's keeper, and power costs accuracy at Free Kick's own
 * prices. What is new is what a drill differs in: a wall that opens and
 * closes, an attacker who pushes the ball ahead of himself, a shot you have to
 * get across the goal to reach.
 *
 * THE WHOLE THING IS PURE AND DETERMINISTIC. The page owns the clock and the
 * frames; this file owns the rules. Every input is a few numbers the player
 * chose plus the moment they pressed, in seconds since the round started, so
 * the same seed plays the same ten rounds for everybody at that position on
 * that day and scripts/simCareerDrills.mjs can play thousands of them.
 *
 * THE THREE DRILLS, and who gets which (drillForPosition):
 *
 *   WALL SHOT, for CM, CAM, LW, RW and ST. Two axis aim (across and up) and
 *   one timed press. A wall stands taller than you can clip from this range,
 *   and a gap in it opens and closes on a cycle: the men step apart and back
 *   together. The rules know the gap, not a count of men, and the board
 *   draws as many as the wall needs on each side of it, so do not write a
 *   number here that the drawing then has to honour. You aim through where the gap will be, set your
 *   power, and release as it opens. Pace reaches the wall sooner (wallTravel)
 *   and sprays wider (WALL_SPRAY, Free Kick's prices), so a smashed one
 *   arrives on time and misses the gap it was aimed at. Behind the wall a
 *   keeper who knows which side the gap is on leans that way.
 *
 *   TACKLE, for CB, LB, RB and CDM. An attacker runs across the screen and
 *   every touch pushes the ball ahead of his feet before he catches it up
 *   (tackleTouchAt). You press on the BALL, where it is at that moment, while
 *   it is away from his feet. Press on the man, or go in while the ball is at
 *   his feet, and it is a foul. Press wide of the ball and he is gone.
 *
 *   GLOVE SAVE, for GK. Hold and drag to set the dive: the direction is where
 *   you drag and the reach is how far. Release to go. A longer reach takes
 *   longer to get there (diveTime), so the full stretch has to start earlier
 *   than the short hop, which means starting before you are sure. The shot's
 *   pace shortens the flight and shrinks what a glove can hold (makeSave).
 *
 * WHAT A DRILL DOES TO THE CAREER. A run is ten rounds, like the arcade games.
 * The session score is wins times ten, the same 0 to 100 scale the Round 81
 * training ground has always used, and it pays the same way: 50 is +1 to the
 * drill's attribute with next season's growth, 80 is +2. The one new rule is
 * the ceiling: the boost is capped at the room between the player's overall
 * and his effective potential (drillBoost), so a drill can never push a man
 * past his own ceiling. It is one session a season, shared with the older
 * drills through the same trainingSeasonYear, and only the daily banks.
 */
import {
  buildLadder, clamp, daySeed, lehmer, sprayFor as arcadeSpray,
  ROUNDS_PER_RUN, type SprayConfig,
} from './arcade';
import { flightPath, keeperDive, type Aim, type KickSetup } from './freeKick';
import { effectivePotential, type CareerState } from './soccerCareerEngine';

export { daySeed, lehmer, ROUNDS_PER_RUN };

export type DrillKind = 'wallshot' | 'tackle' | 'gloves';
export type DrillStat = 'shooting' | 'defending' | 'reflexes';

export const DRILL_META: Record<DrillKind, { name: string; stat: DrillStat; statLabel: string; emoji: string; verb: string; slug: string }> = {
  wallshot: { name: 'Wall Shot', stat: 'shooting', statLabel: 'Shooting', emoji: '🧱', verb: 'scored', slug: 'career-drill-wallshot' },
  tackle: { name: 'Tackle', stat: 'defending', statLabel: 'Defending', emoji: '🦵', verb: 'won', slug: 'career-drill-tackle' },
  gloves: { name: 'Glove Save', stat: 'reflexes', statLabel: 'Reflexes', emoji: '🧤', verb: 'saved', slug: 'career-drill-gloves' },
};

/** The player's position picks the drill. Keepers dive, the back line and the
    holding midfielder tackle, everybody else shoots through the wall. */
export function drillForPosition(position: string): DrillKind {
  if (position === 'GK') return 'gloves';
  if (position === 'CB' || position === 'LB' || position === 'RB' || position === 'CDM') return 'tackle';
  return 'wallshot';
}

/* One day is one run for everybody at that position, and the three drills on
   the same day are three different runs. */
const KIND_SALT: Record<DrillKind, number> = { wallshot: 1719, tackle: 4583, gloves: 8317 };
export function drillSeed(kind: DrillKind, dateStr: string): number {
  return ((daySeed(dateStr) * 7919 + KIND_SALT[kind]) % 2147483646) + 1;
}

/* ───────────────────────────── wall shot ───────────────────────────── */

export interface WallShotSetup {
  /** Metres from the goal line. */
  distance: number;
  /** Where across the goal the gap is, -1 (left post) to 1 (right post). */
  gapCentre: number;
  /** The gap's half width at its widest, in goal x. */
  gapMax: number;
  /** Seconds for the gap to open, close and be ready to open again. */
  period: number;
  /** Where in that cycle the round starts, 0 to 1. */
  phase: number;
  keeperSkill: number;
  keeperLean: number;
  label: string;
}

export interface WallShotInput {
  /** -1 to 1 across the goal. */
  x: number;
  /** 0 to 1 up the goal. */
  y: number;
  /** 0 to 1. */
  power: number;
  /** Seconds after the round started that the ball was struck. */
  press: number;
}

export interface WallShotResult {
  x: number;
  y: number;
  /** How open the gap was when the ball reached the wall, 0 shut to 1 wide. */
  open: number;
  hitWall: boolean;
  hitPost: boolean;
  onTarget: boolean;
  saved: boolean;
  won: boolean;
  points: number;
  keeperX: number;
  keeperY: number;
  /** The flight, in goal coordinates, for the page to draw. */
  path: Array<{ x: number; y: number }>;
  verdict: string;
}

/** Free Kick's prices for the shared spray law, unchanged: this is the same
    ball struck by the same foot. simCareerDrills' control rewrites this line. */
export const WALL_SPRAY: SprayConfig = { power: 0.34, distance: 0.011, vertical: 0.7 };

/** How open the gap is at time t: the men step apart and back together on a
    sine, and for half of every cycle they are shoulder to shoulder. */
export function wallOpenAt(setup: WallShotSetup, t: number): number {
  return Math.max(0, Math.sin(2 * Math.PI * (t / setup.period + setup.phase)));
}

/** The gap's half width at time t, in goal x. */
export function wallGapAt(setup: WallShotSetup, t: number): number {
  return setup.gapMax * wallOpenAt(setup, t);
}

/** Seconds the ball takes to reach the wall. Pace buys time, and that is the
    only thing it buys for free. */
export function wallTravel(power: number): number {
  return 0.58 - 0.28 * clamp(power, 0, 1);
}

/** The moment the gap is next at its widest, at or after `from`. What a
    player is watching for; what the harness's skilled player computes. */
export function wallNextPeak(setup: WallShotSetup, from: number): number {
  const cycles = Math.ceil((from / setup.period + setup.phase - 0.25) - 1e-9);
  return (cycles + 0.25 - setup.phase) * setup.period;
}

/** The ten shots of a run: further out, a narrower gap, a quicker cycle, a
    better keeper. */
export function buildWallShotRun(seed: number): WallShotSetup[] {
  return buildLadder(seed, ROUNDS_PER_RUN, (t, rng) => {
    const distance = Math.round((16 + t * 8) * 10) / 10;
    const gapCentre = Math.round((rng() * 2 - 1) * 80) / 100;
    const gapMax = Math.round((0.30 - t * 0.17) * 100) / 100;
    const period = Math.round((2.4 - t * 1.1) * 100) / 100;
    const phase = Math.round(rng() * 100) / 100;
    const keeperSkill = clamp(0.3 + t * 0.45 + (rng() - 0.5) * 0.12, 0.2, 0.82);
    /* He knows which side the gap is on, and mostly leans that way. */
    const keeperLean = Math.round(clamp(gapCentre * 0.8 + (rng() - 0.5) * 0.6, -1, 1) * 100) / 100;
    const gap = gapMax >= 0.24 ? 'a wide gap' : gapMax >= 0.17 ? 'a gap' : 'a slit';
    return { distance, gapCentre, gapMax, period, phase, keeperSkill, keeperLean, label: `${distance} m, ${gap} in the wall` };
  });
}

/** A keeper behind a wall is unsighted: he sees the ball late, so his read of
    the shot is this much of what it would be in the open. The first draft ran
    Free Kick's keeper at full sight and he held 92 percent of what came
    through the gap, which left five of ten rounds unwinnable by any input. */
export const WALL_UNSIGHTED = 0.45;

export function takeWallShot(input: WallShotInput, setup: WallShotSetup, rng: () => number): WallShotResult {
  const aim: Aim = { x: input.x, y: input.y, power: clamp(input.power, 0, 1), curve: 0 };
  const kick: KickSetup = { distance: setup.distance, wallSize: 5, keeperSkill: setup.keeperSkill * WALL_UNSIGHTED, keeperLean: setup.keeperLean, label: setup.label };
  const spray = arcadeSpray(aim.power, setup.distance - 16, WALL_SPRAY, rng);
  const path = flightPath(aim, kick, spray);
  const end = path[path.length - 1];
  const keeper = keeperDive(aim, kick, rng);

  /* The wall: taller than you can clip from here, so the gap is the only way
     through, and it is only as wide as it is at the moment the ball arrives. */
  const arrive = Math.max(0, input.press) + wallTravel(aim.power);
  const open = wallOpenAt(setup, arrive);
  const atWall = path[Math.round(path.length * 0.45)];
  const hitWall = Math.abs(atWall.x - setup.gapCentre) >= setup.gapMax * open;

  const insideX = Math.abs(end.x) < 1;
  const insideY = end.y > 0 && end.y < 1;
  const hitPost = !hitWall && Math.abs(Math.abs(end.x) - 1) < 0.035 && insideY;
  const tooWeak = aim.power < 0.36 + (setup.distance - 16) * 0.014;
  const onTarget = !hitWall && !hitPost && insideX && insideY && !tooWeak;

  /* Free Kick's keeper, unsighted: a dive is a reach, not a teleport, and a
     late dive is a shorter one. Height is worth more here than in the open,
     because a keeper who picks the ball up late cannot also get up to it. */
  const reach = 0.34 + kick.keeperSkill * 0.2;
  const saved = onTarget && Math.abs(end.x - keeper.x) < reach && Math.abs(end.y - keeper.y) < reach * 0.5 + 0.08;
  const won = onTarget && !saved;

  let points = 0;
  if (won) {
    const corner = Math.max(Math.abs(end.x), end.y > 0.5 ? end.y : 0);
    points = Math.round(100 + (setup.distance - 16) * 8 + corner * 120 + setup.keeperSkill * 60 + (0.3 - setup.gapMax) * 200);
  }

  const verdict = hitWall
    ? (open <= 0.02 ? 'Into the wall. It was shut.' : 'Into the wall. Off the gap.')
    : hitPost
    ? 'Through the gap, off the post.'
    : tooWeak
    ? 'Never had the legs.'
    : !insideX || !insideY
    ? 'Through the gap and wide of everything.'
    : saved
    ? 'Through the gap. Keeper got there.'
    : 'Through the wall and in.';

  return { x: end.x, y: end.y, open, hitWall, hitPost, onTarget, saved, won, points, keeperX: keeper.x, keeperY: keeper.y, path, verdict };
}

export function maxWallShotScore(run: WallShotSetup[]): number {
  return run.reduce((n, s) => n + Math.round(100 + (s.distance - 16) * 8 + 120 + s.keeperSkill * 60 + (0.3 - s.gapMax) * 200), 0);
}

/* ─────────────────────────────── tackle ─────────────────────────────── */

/* The tackle is played on a unit screen: x runs 0 to 1 left to right, y runs
   0 to 1 top to bottom, and the attacker enters from just off one edge. */
export const TACKLE_EDGE = 0.15;
/* The board is wider than it is tall (360 by 210 view units), so a unit of y
   is shorter on screen than a unit of x. Every distance below scales y by
   this, which makes the reach a circle on the screen the player taps rather
   than an ellipse squashed to a bit over half its height. Found by the
   browser pass on 2026-09-05, tapping the drawn ball and missing. */
export const TACKLE_ASPECT = 7 / 12;
const tackleDist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, (ay - by) * TACKLE_ASPECT);

export interface TackleSetup {
  /** Screen widths per second. */
  speed: number;
  /** 1 runs left to right, -1 right to left. */
  dir: 1 | -1;
  /** Which line across the screen he runs on, in y. */
  lane: number;
  /** How far a touch pushes the ball ahead of the feet, in screen widths. */
  touchLen: number;
  /** Seconds between touches. */
  touchPeriod: number;
  /** Where in the touch cycle the round starts, 0 to 1. */
  touchPhase: number;
  /** How close to the ball a press has to be, in screen widths. */
  reach: number;
  label: string;
}

export interface TackleInput {
  x: number;
  y: number;
  /** Seconds after the round started that the press landed. */
  press: number;
}

export interface TackleResult {
  won: boolean;
  foul: boolean;
  /** He was already off the screen. */
  late: boolean;
  points: number;
  /** Where the ball and the feet were at the press, for the page to draw. */
  ballX: number;
  ballY: number;
  feetX: number;
  feetY: number;
  /** How far the ball was from the feet at the press, 0 at the feet to 1 at full stretch. */
  loose: number;
  verdict: string;
}

/* Below this much of a touch the ball is at his feet, and going in is a foul.
   The harness's control lowers it to zero so the timing stops mattering. */
export const TACKLE_LOOSE = 0.35;
/* A press this close to the man is a press on the man. */
export const TACKLE_FEET = 0.06;

export function tackleFeetAt(setup: TackleSetup, t: number): { x: number; y: number } {
  const run = setup.speed * Math.max(0, t);
  return { x: setup.dir > 0 ? -TACKLE_EDGE + run : 1 + TACKLE_EDGE - run, y: setup.lane };
}

/** How far ahead of the feet the ball is at time t, 0 (a touch, ball at the
    feet) to 1 (pushed as far as it goes), on a half sine per touch. */
export function tackleTouchAt(setup: TackleSetup, t: number): number {
  const u = (((t / setup.touchPeriod + setup.touchPhase) % 1) + 1) % 1;
  return Math.sin(Math.PI * u);
}

export function tackleBallAt(setup: TackleSetup, t: number): { x: number; y: number } {
  const feet = tackleFeetAt(setup, t);
  const loose = tackleTouchAt(setup, t);
  return { x: feet.x + setup.dir * setup.touchLen * loose, y: feet.y + 0.03 * Math.sin(2 * Math.PI * t / setup.touchPeriod) };
}

/** The moment he is off the far edge and the chance is gone. */
export function tackleDeadline(setup: TackleSetup): number {
  return (1 + 2 * TACKLE_EDGE) / setup.speed;
}

/** The moment the ball is next furthest from his feet, at or after `from`. */
export function tackleNextLoose(setup: TackleSetup, from: number): number {
  const cycles = Math.ceil((from / setup.touchPeriod + setup.touchPhase - 0.5) - 1e-9);
  return (cycles + 0.5 - setup.touchPhase) * setup.touchPeriod;
}

/** The ten runs of a drill: quicker feet, shorter touches, a smaller ball to hit. */
export function buildTackleRun(seed: number): TackleSetup[] {
  return buildLadder(seed, ROUNDS_PER_RUN, (t, rng) => {
    const speed = Math.round((0.45 + t * 0.55) * 100) / 100;
    const dir: 1 | -1 = rng() > 0.5 ? 1 : -1;
    const lane = Math.round((0.35 + rng() * 0.3) * 100) / 100;
    const touchLen = Math.round((0.20 - t * 0.10) * 100) / 100;
    const touchPeriod = Math.round((0.9 - t * 0.45) * 100) / 100;
    const touchPhase = Math.round(rng() * 100) / 100;
    const reach = Math.round((0.08 - t * 0.038) * 1000) / 1000;
    const who = speed >= 0.8 ? 'a flyer' : speed >= 0.62 ? 'a quick one' : 'a plodder';
    const touch = touchLen <= 0.13 ? 'close control' : touchLen <= 0.17 ? 'tidy feet' : 'heavy touches';
    return { speed, dir, lane, touchLen, touchPeriod, touchPhase, reach, label: `${who}, ${touch}` };
  });
}

export function makeTackle(input: TackleInput, setup: TackleSetup): TackleResult {
  const t = input.press;
  const feet = tackleFeetAt(setup, t);
  const ball = tackleBallAt(setup, t);
  const loose = tackleTouchAt(setup, t);
  const base = { ballX: ball.x, ballY: ball.y, feetX: feet.x, feetY: feet.y, loose };

  if (t < 0 || t >= tackleDeadline(setup)) {
    return { ...base, won: false, foul: false, late: true, points: 0, verdict: 'He is gone. Never got near him.' };
  }
  const dBall = tackleDist(input.x, input.y, ball.x, ball.y);
  const dFeet = tackleDist(input.x, input.y, feet.x, feet.y);

  /* The man, not the ball. */
  if (dFeet < TACKLE_FEET && dFeet <= dBall) {
    return { ...base, won: false, foul: true, late: false, points: 0, verdict: 'You took the man. Free kick, and a word from the ref.' };
  }
  if (dBall < setup.reach) {
    /* The ball at his feet is his: going through it means going through him. */
    if (loose < TACKLE_LOOSE) {
      return { ...base, won: false, foul: true, late: false, points: 0, verdict: 'Ball was at his feet. Straight through him, foul.' };
    }
    const clean = 1 - dBall / setup.reach;
    const points = Math.round(80 + setup.speed * 100 + (0.22 - setup.touchLen) * 300 + loose * 40 + clean * 40);
    return { ...base, won: true, foul: false, late: false, points, verdict: loose > 0.85 ? 'Ball won. He pushed it too far and you read it.' : 'Ball won. Clean.' };
  }
  return { ...base, won: false, foul: false, late: false, points: 0, verdict: dBall < setup.reach * 2 ? 'Swiped at it. He is past you.' : 'Nowhere near it. He is past you.' };
}

export function maxTackleScore(run: TackleSetup[]): number {
  return run.reduce((n, s) => n + Math.round(80 + s.speed * 100 + (0.22 - s.touchLen) * 300 + 40 + 40), 0);
}

/* ────────────────────────────── glove save ────────────────────────────── */

/** A full stretch, in metres from where the hands start. */
export const GLOVE_MAX_REACH = 2.8;
/** Where the hands start: the middle of the goal, chest height, in metres. */
export const GLOVE_ORIGIN = { x: 0, y: 1.0 };
/** The goal in metres, for the page: 7.32 wide is x from -3.66 to 3.66, 2.44 high. */
export const GLOVE_HALF_WIDTH = 3.66;
export const GLOVE_HEIGHT = 2.44;

export interface GloveSetup {
  /** Seconds after the round starts that the ball leaves the foot. */
  shotAt: number;
  /** When his body gives the side away, before shotAt. */
  tellAt: number;
  /** Where the ball crosses the line, in metres. */
  target: { x: number; y: number };
  /** Seconds from the foot to the line. */
  flight: number;
  /** 0 to 1, how hard it was hit. */
  pace: number;
  label: string;
}

export interface GloveInput {
  /** The drag, in metres from where the hands start. Longer than a full stretch is clamped. */
  dx: number;
  dy: number;
  /** Seconds after the round started that the dive began. */
  release: number;
}

export interface GloveResult {
  saved: boolean;
  /** The ball had already crossed when the dive started. */
  late: boolean;
  /** 0 to 1, how much of a full stretch this dive was. */
  reach: number;
  points: number;
  /** Where the glove was when the ball arrived, in metres. */
  gloveX: number;
  gloveY: number;
  /** What a glove could hold on this shot, in metres. */
  radius: number;
  verdict: string;
}

/** Seconds a dive of this reach takes to get there. The full stretch is the
    slow one, which is the whole trade: to reach the corner you leave early,
    and leaving early means guessing. */
export function diveTime(reach: number): number {
  return 0.16 + 0.62 * clamp(reach, 0, 1);
}

function diveVector(input: GloveInput): { dx: number; dy: number; reach: number } {
  const len = Math.hypot(input.dx, input.dy);
  if (len <= GLOVE_MAX_REACH) return { dx: input.dx, dy: input.dy, reach: len / GLOVE_MAX_REACH };
  const k = GLOVE_MAX_REACH / len;
  return { dx: input.dx * k, dy: input.dy * k, reach: 1 };
}

/** Where the gloves are at time t, in metres. Before the release they are at
    the chest; after it they travel the drag on an ease out. */
export function gloveAt(input: GloveInput, t: number): { x: number; y: number } {
  const v = diveVector(input);
  if (t <= input.release) return { ...GLOVE_ORIGIN };
  const p = clamp((t - input.release) / diveTime(v.reach), 0, 1);
  const e = p * (2 - p);
  return { x: GLOVE_ORIGIN.x + v.dx * e, y: GLOVE_ORIGIN.y + v.dy * e };
}

/** The ball's progress from the foot to the line at time t, 0 to 1, or -1
    before it has been struck. */
export function gloveBallProgress(setup: GloveSetup, t: number): number {
  if (t < setup.shotAt) return -1;
  return clamp((t - setup.shotAt) / setup.flight, 0, 1);
}

/** The moment the ball crosses the line. */
export function gloveDeadline(setup: GloveSetup): number {
  return setup.shotAt + setup.flight;
}

/** The ten shots of a run: harder, further from the hands, and the tell comes later. */
export function buildGloveRun(seed: number): GloveSetup[] {
  return buildLadder(seed, ROUNDS_PER_RUN, (t, rng) => {
    const pace = clamp(0.2 + t * 0.8 + (rng() - 0.5) * 0.1, 0.1, 1);
    const flight = Math.round((0.85 - pace * 0.4) * 100) / 100;
    const lead = Math.round((0.5 - t * 0.25) * 100) / 100;
    const shotAt = Math.round((0.9 + rng() * 0.8) * 100) / 100;
    const side = rng() > 0.5 ? 1 : -1;
    const dist = clamp(1.2 + t * 1.5 + (rng() - 0.5) * 0.4, 1.0, GLOVE_MAX_REACH);
    /* From a low one near the ground up to the top corner. */
    const angle = (-20 + rng() * 80) * Math.PI / 180;
    const target = {
      x: Math.round(clamp(GLOVE_ORIGIN.x + side * dist * Math.cos(angle), -3.4, 3.4) * 100) / 100,
      y: Math.round(clamp(GLOVE_ORIGIN.y + dist * Math.sin(angle), 0.15, 2.3) * 100) / 100,
    };
    const hit = pace >= 0.75 ? 'leathered' : pace >= 0.45 ? 'hit well' : 'placed';
    const where = Math.abs(target.x) >= 2.4 ? 'into the corner' : Math.abs(target.x) >= 1.4 ? 'wide of you' : 'close to you';
    return { shotAt, tellAt: Math.round((shotAt - lead) * 100) / 100, target, flight, pace: Math.round(pace * 100) / 100, label: `${hit}, ${where}` };
  });
}

export function makeSave(input: GloveInput, setup: GloveSetup): GloveResult {
  const arrival = gloveDeadline(setup);
  const v = diveVector(input);
  const glove = gloveAt(input, arrival);
  /* A harder shot is harder to hold: what the glove can gather shrinks with pace. */
  const radius = Math.round((0.55 - setup.pace * 0.2) * 100) / 100;
  const late = input.release > arrival;
  const d = Math.hypot(glove.x - setup.target.x, glove.y - setup.target.y);
  const saved = !late && d < radius;
  const targetDist = Math.hypot(setup.target.x - GLOVE_ORIGIN.x, setup.target.y - GLOVE_ORIGIN.y);
  const points = saved ? Math.round(90 + (targetDist / GLOVE_MAX_REACH) * 130 + setup.pace * 80) : 0;
  const wrongWay = Math.sign(v.dx) !== 0 && Math.sign(v.dx) !== Math.sign(setup.target.x - GLOVE_ORIGIN.x) && Math.abs(setup.target.x) > 0.5;
  const verdict = late
    ? 'Never moved. It was past you before you went.'
    : saved
    ? (v.reach > 0.75 ? 'Full stretch. Kept it out.' : v.reach > 0.3 ? 'Got down to it. Saved.' : 'Straight at you. Gathered.')
    : wrongWay
    ? 'Wrong way. Nothing you could do once you went.'
    : d < radius * 1.6
    ? 'Fingertips. Not enough on it.'
    : 'Nowhere near. In the net.';
  return { saved, late, reach: v.reach, points, gloveX: glove.x, gloveY: glove.y, radius, verdict };
}

export function maxGloveScore(run: GloveSetup[]): number {
  return run.reduce((n, s) => {
    const targetDist = Math.hypot(s.target.x - GLOVE_ORIGIN.x, s.target.y - GLOVE_ORIGIN.y);
    return n + Math.round(90 + (targetDist / GLOVE_MAX_REACH) * 130 + s.pace * 80);
  }, 0);
}

/* ───────────────────────── what a run does to a career ───────────────────────── */

/** Wins times ten: the same 0 to 100 session score the training ground has
    used since Round 81, so 50 and 80 mean what they have always meant. */
export function sessionScore(count: number): number {
  return clamp(Math.round(count), 0, ROUNDS_PER_RUN) * 10;
}

/** The room between a player's overall and his ceiling, in points. */
export function drillHeadroom(s: Pick<CareerState, 'overall' | 'potential' | 'potentialEarned'>): number {
  return Math.max(0, effectivePotential(s as CareerState) - s.overall);
}

/** What a session pays: 50 is +1, 80 is +2, never more than the headroom. */
export function drillBoost(score: number, headroom: number): number {
  const raw = score >= 80 ? 2 : score >= 50 ? 1 : 0;
  return Math.max(0, Math.min(raw, Math.floor(headroom)));
}

/**
 * Bank a daily run. One session a season, shared with the Round 81 drills
 * through the same trainingSeasonYear, and the boost rides the same
 * statBoostNextSeason pipeline so it lands with next season's growth. The
 * one thing the older drills do not do is respect the ceiling; this does.
 */
export function applyDrillResult(prev: CareerState, kind: DrillKind, count: number): CareerState {
  const year = prev.seasons[prev.seasons.length - 1]?.year ?? 0;
  if (prev.trainingSeasonYear === year) return prev;
  const s = { ...prev };
  const meta = DRILL_META[kind];
  const score = sessionScore(count);
  const headroom = drillHeadroom(s);
  const boost = drillBoost(score, headroom);
  s.trainingSeasonYear = year;
  if (boost > 0) {
    s.statBoostNextSeason = { ...s.statBoostNextSeason, [meta.stat]: (s.statBoostNextSeason[meta.stat] || 0) + boost };
    s.morale = clamp(s.morale + 2, 0, 100);
    s.events = [...s.events, `${meta.emoji} ${meta.name} drill: ${count} of ${ROUNDS_PER_RUN}. +${boost} ${meta.statLabel} coming with next season's growth`];
  } else if (score >= 50) {
    s.events = [...s.events, `${meta.emoji} ${meta.name} drill: ${count} of ${ROUNDS_PER_RUN}. Good session, but you are at your ceiling and there is nothing left to add`];
  } else {
    s.events = [...s.events, `${meta.emoji} ${meta.name} drill: ${count} of ${ROUNDS_PER_RUN}. Rough session, no gains`];
  }
  return s;
}
