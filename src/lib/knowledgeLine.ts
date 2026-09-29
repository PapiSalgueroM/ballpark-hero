/**
 * Round 678: the knowledge line. Every game day is worth 0 to 100 points,
 * and points start past what a player with no knowledge really scores.
 *
 * THE RULE (docs/design/POINTS-ECONOMY-V2.md, section 7.1). For one board:
 *   result   the game's own number (right answers, a rating, calls landed)
 *   perfect  the best play the site itself makes on that board, reachable by
 *            moves the page offers
 *   line     the smallest threshold at which every naive policy of the game's
 *            family averages at most 5 of 100 on that board, and never below
 *            what the best deterministic naive policy scores there, so the top
 *            listed option, a constant answer or standing pat pays exactly 0
 *   points   round(100 * clamp((result - line) / (perfect - line), 0, 1))
 * A board with perfect at or under its line has no room for skill: a daily
 * never deals one and a free game redeals (hasRoom says which).
 *
 * THE BRAND. A DayPoints is a number only this file can make, through
 * dayPoints and pointsFromCeiling, so tsc refuses a raw score handed to
 * anything that asks for day points. src/lib/knowledgeLine.brand.ts holds
 * that refusal under tsc, and scripts/simKnowledgeLine.mjs section 3 proves
 * it with the brand taken off (control rawrecord) and checks nothing else in
 * src mints one.
 *
 * Pure: no clock, no storage, no imports. src/lib/naivePolicies.ts drives the
 * naive policies through a game's own moves and hands their outcomes here.
 */

/** Points for one game day, 0 to 100. Only dayPoints and pointsFromCeiling make one. */
export type DayPoints = number & { readonly __dayPoints: true };

/** What a naive policy may average on a board, in points of 100. */
export const NAIVE_LIMIT = 5;

/** What the 70 percent knowledge policy must average, or the game has no room for skill. */
export const SKILL_FLOOR = 15;

/** What every engine's pointsFor(board, result) answers. */
export interface PointsAnswer {
  points: DayPoints;
  result: number;
  line: number;
  perfect: number;
  /** The result's unit as the card words it: 'right', 'rating', 'wins', 'calls'. */
  unit: string;
}

/** Everything a naive policy reaches on one board, with the chance of each. */
export interface PolicyOutcome {
  readonly policy: string;
  /** Each result the policy can end on, with its chance; the chances sum to 1. */
  readonly results: readonly { readonly value: number; readonly weight: number }[];
  /** True when the policy always ends on the same result on this board. */
  readonly deterministic: boolean;
}

/** The board facts a line needs. */
export interface LineBoard {
  readonly perfect: number;
  /** Lines are whole multiples of this: 1 for a count of right answers. */
  readonly step?: number;
}

function mint(n: number): DayPoints {
  return n as DayPoints;
}

/** The points a result earns on a board with this line and perfect. */
export function dayPoints(result: number, line: number, perfect: number): DayPoints {
  if (!Number.isFinite(result) || !Number.isFinite(line) || !Number.isFinite(perfect)) return mint(0);
  if (!(perfect > line)) return mint(0);
  const share = (result - line) / (perfect - line);
  return mint(Math.round(100 * Math.min(1, Math.max(0, share))));
}

/**
 * A game scored on its engine ceiling (scale g: typed answers, grids): the
 * line is 0, because a blank or random answer scores nothing, and every
 * board reaches the ceiling, so this is the knowledge line with line 0.
 */
export function pointsFromCeiling(raw: number, ceiling: number): DayPoints {
  return dayPoints(raw, 0, ceiling);
}

/** The whole answer an engine's pointsFor returns, built once. */
export function pointsAnswer(result: number, line: number, perfect: number, unit: string): PointsAnswer {
  return { points: dayPoints(result, line, perfect), result, line, perfect, unit };
}

/** True when a board leaves room for skill above its line. */
export function hasRoom(board: LineBoard, line: number): boolean {
  return Number.isFinite(line) && board.perfect > line;
}

/** A policy's average points on a board with this line. */
export function expectedPoints(outcome: PolicyOutcome, line: number, perfect: number): number {
  let sum = 0;
  let weight = 0;
  for (const r of outcome.results) {
    sum += r.weight * dayPoints(r.value, line, perfect);
    weight += r.weight;
  }
  return weight > 0 ? sum / weight : 0;
}

const onGrid = (k: number, step: number) => Math.round(k * step * 1e9) / 1e9;

/**
 * The line for one board: the smallest multiple of `step`, at or above what
 * the best deterministic policy scores, at which every policy averages at
 * most NAIVE_LIMIT. A policy's average only falls as the line rises, so the
 * search halves. When nothing under `perfect` works, the answer is the
 * perfect itself and hasRoom is false.
 */
export function lineFor(board: LineBoard, policies: readonly PolicyOutcome[]): number {
  const step = board.step && board.step > 0 ? board.step : 1;
  const values = policies.flatMap(p => p.results.map(r => r.value)).filter(Number.isFinite);
  if (values.length === 0 || !Number.isFinite(board.perfect)) return board.perfect;
  const deterministic = policies.filter(p => p.deterministic).flatMap(p => p.results.map(r => r.value));
  const low = deterministic.length > 0
    ? Math.ceil(onGrid(Math.max(...deterministic) / step, 1))
    : Math.floor(Math.min(...values) / step);
  const high = Math.ceil(onGrid(board.perfect / step, 1));
  const fits = (k: number) => policies.every(p => expectedPoints(p, onGrid(k, step), board.perfect) <= NAIVE_LIMIT);
  if (low >= high) return onGrid(low, step);
  if (fits(low)) return onGrid(low, step);
  let lo = low;
  let hi = high;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (fits(mid)) hi = mid;
    else lo = mid;
  }
  return onGrid(hi, step);
}
