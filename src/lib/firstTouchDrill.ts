import { buildLadder, clamp, ROUNDS_PER_RUN } from './arcade';

export type TouchDirection = 'left' | 'center' | 'right';
export interface TouchPoint { x: number; y: number; }
export interface FirstTouchSetup {
  target: TouchDirection;
  arrival: number;
  window: number;
  start: TouchPoint;
}
export interface FirstTouchInput { direction: TouchDirection; press: number; }
export interface FirstTouchResult {
  won: boolean;
  points: number;
  verdict: string;
  contact: TouchPoint;
  end: TouchPoint;
}
export interface FirstTouchRecord { rounds: number; count: number; score: number; banked: boolean; }

export function validateFirstTouchRecord(fields: Record<string, unknown>): FirstTouchRecord | null {
  const { rounds, count, score, banked } = fields;
  if (!Number.isInteger(rounds) || !Number.isInteger(count) || !Number.isInteger(score) || typeof banked !== 'boolean') return null;
  const record = { rounds, count, score, banked } as FirstTouchRecord;
  if (record.rounds < 0 || record.rounds > ROUNDS_PER_RUN || record.count < 0 || record.count > record.rounds || record.score !== record.count * 10 || (record.banked && record.rounds !== ROUNDS_PER_RUN)) return null;
  return record;
}

export const TOUCH_DIRECTIONS: TouchDirection[] = ['left', 'center', 'right'];
export const TOUCH_CONTACT: TouchPoint = { x: 180, y: 158 };
export const TOUCH_GATES: Record<TouchDirection, TouchPoint> = {
  left: { x: 60, y: 45 }, center: { x: 180, y: 45 }, right: { x: 300, y: 45 },
};
const rounded = (value: number) => Math.round(value * 1000) / 1000;

/** The incoming path and timing belong to the seeded round, with no outcome roll. */
export function buildFirstTouchRun(seed: number): FirstTouchSetup[] {
  return buildLadder(seed, ROUNDS_PER_RUN, (difficulty, rng) => ({
    target: TOUCH_DIRECTIONS[Math.floor(rng() * TOUCH_DIRECTIONS.length)],
    arrival: rounded(1.8 + rng() * 0.9 - difficulty * 0.55),
    window: rounded(0.26 - difficulty * 0.14),
    start: { x: rounded(90 + rng() * 180), y: 18 },
  }));
}

export function firstTouchDeadline(setup: FirstTouchSetup): number {
  return setup.arrival + setup.window;
}

/** The ball passes the contact spot at arrival and keeps going if it is not controlled. */
export function incomingBallAt(setup: FirstTouchSetup, seconds: number): TouchPoint {
  const progress = clamp(seconds / setup.arrival, 0, 1.5);
  return {
    x: setup.start.x + (TOUCH_CONTACT.x - setup.start.x) * progress,
    y: Math.min(225, setup.start.y + (TOUCH_CONTACT.y - setup.start.y) * progress),
  };
}

export function takeFirstTouch(input: FirstTouchInput, setup: FirstTouchSetup): FirstTouchResult {
  const onTime = Number.isFinite(input.press) && input.press >= setup.arrival - setup.window && input.press <= setup.arrival + setup.window;
  const matched = input.direction === setup.target;
  const won = onTime && matched;
  const contact = incomingBallAt(setup, Number.isFinite(input.press) ? input.press : firstTouchDeadline(setup));
  const end = onTime ? { ...TOUCH_GATES[input.direction] } : incomingBallAt(setup, setup.arrival * 1.5);
  const verdict = !onTime
    ? input.press < setup.arrival ? 'Too early. The ball ran past.' : 'Too late. The ball ran past.'
    : matched ? 'Clean touch. Through the gate.' : 'Wrong gate. Watch the marked exit.';
  return { won, points: won ? 10 : 0, verdict, contact, end };
}

/** The board resolves from the scored contact to the scored exit, including misses. */
export function outgoingBallAt(result: FirstTouchResult, progress: number): TouchPoint {
  const t = clamp(progress, 0, 1);
  return { x: result.contact.x + (result.end.x - result.contact.x) * t, y: result.contact.y + (result.end.y - result.contact.y) * t };
}
