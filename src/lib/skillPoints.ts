/**
 * Round 645 part two: no game pays the cap or a big floor for no skill.
 *
 * WHAT WAS WRONG. The points audit of 2026-09-19 found games whose recorded
 * score is mostly a floor that a run earns by existing: Build Your XI and NBA
 * Starting 5 recorded 500 of 500 for any finished lineup, Ball IQ recorded 550
 * of 1600 for twelve wrong answers, Mystery Box 450 for discarding every pack,
 * and every squad rating game recorded a rating that the worst possible
 * picks already carry most of the way (a soccer card rating runs 58 to 96, so
 * the worst XI on the board sits at 60 percent of a perfect one before a
 * single decision is made). Round 645's audit table is in scripts/
 * simFreePoints.mjs, one row per game.
 *
 * THE RULE. A zero skill run (nothing correct, the worst choice every time)
 * records 0, and a perfect run records exactly what it recorded before, so a
 * cap that was right stays right. Everything between is a straight line.
 *
 * WHERE THE ZERO COMES FROM. Wherever a game can work out what the worst
 * choices would have earned on the very board the player was dealt, it does,
 * and that number is the zero: the worst card in each Gauntlet pick, the
 * worst eligible player in each Perfect Lineup slot, the start rating of a
 * Rebuild. That is exact and needs no guess about a pool. A fixed zero is used
 * only where the zero is structural (an empty Mystery Box slot is 45, a Ball
 * IQ of no correct answers is 55).
 *
 * This file is pure and imports nothing, so the harness drives it directly.
 */

/**
 * The points a result earns above what zero skill earns on the same board.
 *
 *   score    what the run earned on the game's own scale
 *   zero     what the worst choices earn on the same board
 *   perfect  what a perfect run earns, and records unchanged
 *
 * A board where the worst choices do as well as the perfect ones leaves no
 * room for skill, so nothing below perfect is earned on it. A score at or
 * past `perfect` keeps its own value: `perfect` is sometimes a greedy best
 * rather than a proven maximum, and a player who beats it keeps what he beat
 * it by.
 */
export function skillPoints(score: number, zero: number, perfect: number): number {
  if (!Number.isFinite(score) || !Number.isFinite(zero) || !Number.isFinite(perfect)) return 0;
  if (!(perfect > zero)) return 0;
  if (score >= perfect) return Math.round(score);
  return Math.max(0, Math.round((perfect * (score - zero)) / (perfect - zero)));
}
