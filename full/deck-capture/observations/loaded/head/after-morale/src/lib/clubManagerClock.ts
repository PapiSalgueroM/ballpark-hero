/**
 * Round 781: the Club Manager match clock, the board included.
 *
 * A line in regular time carries a minute (63). A line in the referee's board
 * carries the period's last minute and how far into the board it fell (45
 * plus 2, 90 plus 5, 120 plus 1), so every reader that asks "at or before 90"
 * still gets the ninety minute score and extra time still starts at 91. These
 * three helpers are the only place that reading is written down. They live in
 * their own small file, re-exported from clubManager, so the match centre
 * helpers and the tests can read them without loading the whole engine.
 */
export interface ClockPoint { minute: number; plus?: number }

/**
 * The clock the way a scoreboard writes it. A line in regular time reads 63';
 * one in the board reads 45+2', 90+5' or 120+1'. Every screen that prints a
 * minute goes through this, so the live banner, the report and the timeline
 * cannot label the same goal three ways.
 */
export function minuteLabel(e: ClockPoint): string {
  return e.plus ? `${e.minute}+${e.plus}'` : `${e.minute}'`;
}

/** Order on the clock, the board after the minute it extends. */
export function clockOrder(a: ClockPoint, b: ClockPoint): number {
  return a.minute - b.minute || (a.plus ?? 0) - (b.plus ?? 0);
}

/**
 * Has this line happened by a clock position? With `plus` given the position
 * is inside the board of `minute` (90+2 is minute 90, plus 2) and a line
 * deeper into the board has not. With no `plus` the whole minute counts,
 * board included, which is what every reader before this round meant by "at
 * or before minute m" and what the report still means.
 */
export function playedBy(minute: number, plus?: number): (e: ClockPoint) => boolean {
  return e => e.minute < minute || (e.minute === minute && (plus === undefined || (e.plus ?? 0) <= plus));
}
