/**
 * Round 678: tsc holds the DayPoints brand.
 *
 * Nothing imports this file. It exists so that the type gate
 * (node_modules/.bin/tsc --noEmit -p tsconfig.app.json) fails the day a raw
 * number becomes acceptable as day points: each line marked below must stay a
 * type error, and if the brand on DayPoints is ever loosened to a plain
 * number, tsc reports the marker as unused and goes red.
 *
 * scripts/simKnowledgeLine.mjs section 3 compiles this file against a copy of
 * knowledgeLine.ts with the brand taken off (control rawrecord) and requires
 * that red, so the check is proved, not assumed.
 *
 * takesDayPoints stands in for the recorder until Round 679 gives the real
 * one this parameter type.
 */
import { dayPoints, pointsFromCeiling, type DayPoints } from './knowledgeLine';

function takesDayPoints(points: DayPoints): number {
  return points;
}

export const DAY_POINTS_BRAND_HOLDS = [
  takesDayPoints(dayPoints(9, 7, 10)),
  takesDayPoints(pointsFromCeiling(700, 900)),
  // @ts-expect-error a raw score is not day points
  takesDayPoints(62),
  // @ts-expect-error a number read back from anywhere is not day points either
  takesDayPoints(Number('62')),
];
