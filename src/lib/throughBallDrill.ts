/**
 * Through Ball: the position drill for CM and CAM (Round 1032).
 *
 * Until this round every midfielder who was not the holding one shot at a wall
 * like a striker. This is the drill that fits the job: a runner sets off from
 * an onside spot, bends his run across a defensive line, and you play the ball
 * in behind for him. You choose WHERE it goes (direction) and HOW FAR it rolls
 * (weight) by dragging to the spot, and WHEN by letting go.
 *
 * ONE ENGINE, MANY DRILLS. The ladder, the seed and the clamp come from
 * src/lib/arcade.ts, the day seed and the banking come from careerDrills.ts
 * (drillSeed, applyDrillResult through drillStatFor), and the saved daily is
 * First Touch's record shape and validator, imported rather than copied.
 *
 * THE WHOLE THING IS PURE AND DETERMINISTIC, like the other drills: the page
 * owns the clock, this file owns the rules, and nothing here draws a random
 * number once a round is dealt. The same seed deals the same ten runs and the
 * same input settles the same way, so scripts/simThroughBallDrill.mjs can
 * replay thousands.
 *
 * WHAT DECIDES A PASS, checked in this order:
 *   1. ONSIDE. The real rule (IFAB Law 11; The FA's copy of Law 11; both read
 *      2026-10-06, https://www.theifab.com/laws/latest/offside/ and
 *      https://www.thefa.com/football-rules-governance/lawsandrules/laws/football-11-11/law-11---offside)
 *      judges offside at the moment the ball is played: a player is offside
 *      when he is nearer the goal line than both the ball and the second-last
 *      opponent. Here the line of defenders is the second-last opponent, the
 *      keeper behind them is the last, and the ball starts deep in your own
 *      half of the drill, so the drill's rule is the law's rule: play it
 *      before he is past the line.
 *   2. PAST THE LINE. A ball that stops short of the line is the defenders'.
 *   3. CLEAR OF THE DEFENDERS. Where the pass crosses the line it has to miss
 *      every defender by BLOCK.
 *   4. SHORT OF THE KEEPER and on the pitch.
 *   5. ON HIS RUN. The spot the ball stops on has to come within the round's reach of
 *      the runner at some moment of his run.
 *   6. IN TIME. Not after he has gone past the spot (LATE_SLACK), and not so
 *      early that a defender gets back to it first (the round's `wait`).
 *
 * A clean pass scores 10, so ten balls make the same 0 to 100 session the
 * training ground has always used, and it banks through applyDrillResult.
 */
import { buildLadder, clamp, ROUNDS_PER_RUN } from './arcade';
import { validateFirstTouchRecord, type FirstTouchRecord } from './firstTouchDrill';

export interface PitchPoint { x: number; y: number; }

/* Board units: the board's viewBox is 360 by 240, up the screen is up the pitch. */
/** Where you stand when you play it. */
export const PASSER: PitchPoint = { x: 180, y: 222 };
/** The defensive line. The runner must not be past it when the ball is played. */
export const LINE_Y = 120;
/** A ball that rolls this far is the keeper's. */
export const KEEPER_Y = 36;
export const PITCH_LEFT = 18;
export const PITCH_RIGHT = 342;
/** How far a full weight pass rolls before it stops. */
export const MAX_PASS = 240;
/** How fast the ball travels, in board units a second. */
export const BALL_SPEED = 190;
/** A pass that crosses the line closer than this to a defender is cut out. */
export const BLOCK = 11;
/** A ball can still be taken this long after he went past the spot. */
export const LATE_SLACK = 0.08;
/** The ideal pass arrives this long before he does, into his stride. */
export const LEAD_IDEAL = 0.15;
/** The aim is held this many degrees either side of straight up the pitch. */
export const MAX_ANGLE = 75;

export interface ThroughBallSetup {
  /** Where the runner starts, onside. */
  start: PitchPoint;
  /** His velocity once he goes, board units a second. */
  vel: PitchPoint;
  /** Seconds he holds before he goes. */
  hold: number;
  /** Where each defender on the line stands, across the pitch. */
  defenders: number[];
  /** How long a ball can sit in behind before a defender gets back to it. */
  wait: number;
  /** How close to his run the ball has to stop for him to take it in stride. */
  reach: number;
  /** The moment the ideal pass is played, a beat before he crosses. */
  cue: number;
}

export interface ThroughBallInput {
  /** Degrees from straight up the pitch, positive to the right. */
  angle: number;
  /** 0 to 1: how far the ball rolls, as a share of MAX_PASS. */
  weight: number;
  /** Seconds after the round started that the ball was played. */
  press: number;
}

export type ThroughBallOutcome = 'through' | 'offside' | 'short' | 'cutout' | 'keeper' | 'wide' | 'behind' | 'early';

export interface ThroughBallResult {
  won: boolean;
  points: number;
  outcome: ThroughBallOutcome;
  verdict: string;
  /** Where the ball stops. */
  target: PitchPoint;
  /** Where it crossed the line, or null when it never reached it. */
  crossX: number | null;
  press: number;
  /** When the ball reaches its spot. */
  arrival: number;
  /** When the runner took it, or null. */
  taken: number | null;
}

export type ThroughBallRecord = FirstTouchRecord;
/** The saved daily has First Touch's shape, so it shares First Touch's validator. */
export const validateThroughBallRecord = validateFirstTouchRecord;

const rounded = (value: number) => Math.round(value * 1000) / 1000;
const RAD = Math.PI / 180;

/** How long his run lasts once he goes: he stops when he reaches the keeper. */
export function runTime(setup: ThroughBallSetup): number {
  return (setup.start.y - KEEPER_Y) / -setup.vel.y;
}

/** Where the runner is at a moment of the round. */
export function runnerAt(setup: ThroughBallSetup, seconds: number): PitchPoint {
  const s = clamp(seconds - setup.hold, 0, runTime(setup));
  return { x: setup.start.x + setup.vel.x * s, y: setup.start.y + setup.vel.y * s };
}

/** The moment he crosses the line. A pass played after it is offside. */
export function crossTime(setup: ThroughBallSetup): number {
  return setup.hold + (setup.start.y - LINE_Y) / -setup.vel.y;
}

/** When the round settles itself if nothing is played: he is well offside. */
export function throughBallDeadline(setup: ThroughBallSetup): number {
  return crossTime(setup) + 0.4;
}

/** Where a pass stops. Direction is the angle; how far it rolls is the weight. */
export function passTarget(angle: number, weight: number): PitchPoint {
  const a = clamp(angle, -MAX_ANGLE, MAX_ANGLE) * RAD;
  const dist = clamp(weight, 0, 1) * MAX_PASS;
  return { x: PASSER.x + Math.sin(a) * dist, y: PASSER.y - Math.cos(a) * dist };
}

/** The aim that sends the ball to a spot: what a drag to that spot sets. */
export function aimFor(point: PitchPoint): { angle: number; weight: number } {
  const dx = point.x - PASSER.x;
  const dy = PASSER.y - point.y;
  return {
    angle: clamp(Math.atan2(dx, dy) / RAD, -MAX_ANGLE, MAX_ANGLE),
    weight: clamp(Math.hypot(dx, dy) / MAX_PASS, 0, 1),
  };
}

/** Where a pass to this spot crosses the line, or null when it stops short. */
export function lineCrossX(target: PitchPoint): number | null {
  if (target.y >= LINE_Y) return null;
  return PASSER.x + (target.x - PASSER.x) * (PASSER.y - LINE_Y) / (PASSER.y - target.y);
}

/** The stretch of his run, from `from` on, when he is within reach of a spot. */
export function collectWindow(setup: ThroughBallSetup, spot: PitchPoint, from: number): [number, number] | null {
  const dx = setup.start.x - spot.x;
  const dy = setup.start.y - spot.y;
  const vv = setup.vel.x * setup.vel.x + setup.vel.y * setup.vel.y;
  const dv = dx * setup.vel.x + dy * setup.vel.y;
  const disc = dv * dv - vv * (dx * dx + dy * dy - setup.reach * setup.reach);
  if (disc < 0 || vv === 0) return null;
  const root = Math.sqrt(disc);
  const lo = Math.max(from, setup.hold + Math.max(0, (-dv - root) / vv));
  const hi = setup.hold + Math.min(runTime(setup), (-dv + root) / vv);
  return lo <= hi ? [lo, hi] : null;
}

const VERDICTS: Record<ThroughBallOutcome, string> = {
  through: 'Through. He is in on goal.',
  offside: 'Offside. He was past the line when you played it.',
  short: 'Underhit. It never got past the line.',
  cutout: 'Cut out. Straight at a defender.',
  keeper: 'Overhit. It ran through to the keeper.',
  wide: 'Wide of his run. He could not reach it.',
  behind: 'Behind him. He was already past that spot.',
  early: 'Too early. A defender got back to it first.',
};

export function takeThroughBall(input: ThroughBallInput, setup: ThroughBallSetup): ThroughBallResult {
  const press = Number.isFinite(input.press) ? Math.max(0, input.press) : Infinity;
  const target = passTarget(input.angle, input.weight);
  const arrival = press + Math.hypot(target.x - PASSER.x, target.y - PASSER.y) / BALL_SPEED;
  const crossX = lineCrossX(target);
  const settle = (outcome: ThroughBallOutcome, taken: number | null = null): ThroughBallResult => ({
    won: outcome === 'through', points: outcome === 'through' ? 10 : 0, outcome, verdict: VERDICTS[outcome],
    target, crossX, press, arrival, taken,
  });
  if (!(press <= crossTime(setup))) return settle('offside');
  if (crossX === null) return settle('short');
  if (setup.defenders.some(x => Math.abs(x - crossX) < BLOCK)) return settle('cutout');
  if (target.y <= KEEPER_Y || target.x < PITCH_LEFT || target.x > PITCH_RIGHT) return settle('keeper');
  const window = collectWindow(setup, target, press);
  if (!window) return settle('wide');
  if (window[1] < arrival - LATE_SLACK) return settle('behind');
  if (window[0] > arrival + setup.wait) return settle('early');
  return settle('through', clamp(arrival, window[0], window[1]));
}

/** The spot on his run where a ball played at `press` meets him, arriving
    `lead` seconds before he does. The ball is faster than any runner here, so
    one moment solves it and bisection finds it. */
export function meetingPoint(setup: ThroughBallSetup, press: number, lead = LEAD_IDEAL): PitchPoint {
  const gap = (t: number) => {
    const at = runnerAt(setup, t);
    return t - lead - press - Math.hypot(at.x - PASSER.x, at.y - PASSER.y) / BALL_SPEED;
  };
  let lo = press;
  let hi = press + 8;
  for (let i = 0; i < 60; i += 1) {
    const mid = (lo + hi) / 2;
    if (gap(mid) < 0) lo = mid; else hi = mid;
  }
  return runnerAt(setup, (lo + hi) / 2);
}

/** The pass the round was built around: played on the cue, into his stride. */
export function perfectThroughBall(setup: ThroughBallSetup): ThroughBallInput {
  return { ...aimFor(meetingPoint(setup, setup.cue)), press: setup.cue };
}

/** What a run is worth played perfectly: every ball through, 10 each. */
export function maxThroughBallScore(run: ThroughBallSetup[]): number {
  return run.reduce((sum, setup) => sum + takeThroughBall(perfectThroughBall(setup), setup).points, 0);
}

/**
 * Ten runs that get harder: he runs faster and bends further across, the gap
 * in the line narrows, a ball played early is cleared sooner, and it has to
 * stop closer to his run for him to take it in stride. Each round
 * is built around a pass that works (played a beat before he crosses, into
 * his stride) and the gap is placed where that pass crosses the line, so no
 * round is unwinnable, but the gap is not centred on it, so the round has to
 * be read rather than assumed.
 */
export function buildThroughBallRun(seed: number): ThroughBallSetup[] {
  return buildLadder(seed, ROUNDS_PER_RUN, (t, rng) => {
    /* He starts out wide and cuts in across the line, so the pass and his run
       meet at an angle and the weight decides whether they meet at all. */
    const side = rng() < 0.5 ? 1 : -1;
    const start = { x: rounded(side === 1 ? 50 + rng() * 70 : 240 + rng() * 70), y: rounded(172 + rng() * 14) };
    const endX = clamp(start.x + side * (70 + 60 * t) * (0.7 + 0.3 * rng()), 50, 310);
    const speed = 40 + 22 * t + rng() * 6;
    const len = Math.hypot(endX - start.x, 60 - start.y);
    const vel = { x: rounded(speed * (endX - start.x) / len), y: rounded(speed * (60 - start.y) / len) };
    const hold = rounded(0.5 + rng() * 0.7);
    const partial = { start, vel, hold, defenders: [] as number[], wait: rounded(0.3 - 0.15 * t), reach: rounded(12 - 4 * t), cue: 0 };
    partial.cue = rounded(crossTime(partial) - 0.2);
    const ideal = lineCrossX(meetingPoint(partial, partial.cue)) ?? PASSER.x;
    const half = 30 - 14 * t + rng() * 4;
    const left = half * (0.6 + rng() * 0.8);
    const right = 2 * half - left;
    const inner = [ideal - left - BLOCK, ideal + right + BLOCK];
    const outer = [inner[0] - (64 + rng() * 20), inner[1] + (64 + rng() * 20)];
    const defenders = [outer[0], inner[0], inner[1], outer[1]]
      .filter(x => x >= PITCH_LEFT + 6 && x <= PITCH_RIGHT - 6)
      .map(rounded);
    return { ...partial, defenders };
  });
}

/** Where the ball is at a moment after it was played. A cut out ball stops
    at the defender it hit; everything else rolls to its spot. */
export function ballAt(result: ThroughBallResult, seconds: number): PitchPoint {
  const end = result.outcome === 'cutout' && result.crossX !== null ? { x: result.crossX, y: LINE_Y } : result.target;
  const whole = Math.hypot(result.target.x - PASSER.x, result.target.y - PASSER.y);
  const part = Math.hypot(end.x - PASSER.x, end.y - PASSER.y);
  const span = Math.max(0.001, (result.arrival - result.press) * (whole > 0 ? part / whole : 0));
  const p = Number.isFinite(result.press) ? clamp((seconds - result.press) / span, 0, 1) : 1;
  return { x: PASSER.x + (end.x - PASSER.x) * p, y: PASSER.y + (end.y - PASSER.y) * p };
}

/** The moment the board's replay of a settled pass ends. */
export function replayEnd(result: ThroughBallResult): number {
  return Number.isFinite(result.press) ? Math.max(result.arrival, result.taken ?? result.arrival) : 0;
}
