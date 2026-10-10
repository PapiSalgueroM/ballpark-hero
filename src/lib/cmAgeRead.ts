/**
 * Round 1214 (part one of four): the typed door to Club Manager's age read.
 *
 * NOTHING IMPORTS THIS FILE YET. It lands first, with the libraries it wraps and their proof, so
 * that the round which makes the engine read the age (part two) adds an import and no rule.
 *
 * WHY A WRAPPER AND NOT A COPY. The age rule is written once, in scripts/lib/cmValueCurve.mjs,
 * because the roster bake has to run the very same lines the engine runs: a rating the bake wrote
 * and a rating the engine reads back from it must agree to the point, for ever. Those two script
 * files are pure (no import, no node module, no clock; src/test/cmValueCurve.test.ts fails the day
 * one appears), so the app can import them. They arrive untyped, so every signature is declared
 * here, and each export below IS the script's own function, not a second implementation
 * (the test holds the identity).
 *
 * THE THREE READS. All take whole numbers and throw on anything else, so a bad call can never put
 * NaN into a save. `top` is the best level of the man's own world: 94 in 2026 (the default), each
 * past season's own top otherwise.
 *   agePoints(level, age, top)  whole points for age: none above zero under 24, none below zero
 *                               from 24 on.
 *   ageRead(level, age, top)    the rating a screen shows: the level plus the points, held from 48
 *                               to the top.
 *   levelFrom(rating, age, top) the read run backwards, TOTAL: the smallest level whose read is at
 *                               least the rating, and the top when there is none. A created club's
 *                               founder is rated on numbers the read can never produce (86 at 21,
 *                               say), and this still answers a whole level for him.
 * readInWorld(valueRating, fileAge, world) writes the order down once: the season's stretch first,
 * then the age points, on the top of the stretched scale.
 */
import {
  agePoints as scriptAgePoints,
  ageRead as scriptAgeRead,
  levelFrom as scriptLevelFrom,
  readInWorld as scriptReadInWorld,
  RATING_FLOOR as SCRIPT_RATING_FLOOR,
  RATING_CEIL as SCRIPT_RATING_CEIL,
  LEVEL_MAX as SCRIPT_LEVEL_MAX,
  CURVE_VERSION as SCRIPT_CURVE_VERSION,
} from '../../scripts/lib/cmValueCurve.mjs';
import { ERA_RATING_AGE_SHIFT as SCRIPT_ERA_RATING_AGE_SHIFT } from '../../scripts/lib/cmAges.mjs';

/** The lowest rating any man is shown. */
export const RATING_FLOOR: number = SCRIPT_RATING_FLOOR;
/** The top of the 2026 world, and the default `top` of the three reads. */
export const RATING_CEIL: number = SCRIPT_RATING_CEIL;
/** The highest level a stretched past season can hold, and the highest `top` the reads accept. */
export const LEVEL_MAX: number = SCRIPT_LEVEL_MAX;
/** The curve a file rated WITH the age points carries in its META (2). Files without a stamp are on
 *  curve 1, the value rating alone, which is every file shipped today. */
export const CM_AGE_CURVE: number = SCRIPT_CURVE_VERSION;
/** A past season's file holds the 1 January age; its men are rated this many years on, at that
 *  season's August. */
export const ERA_RATING_AGE_SHIFT: number = SCRIPT_ERA_RATING_AGE_SHIFT;

/** What a world needs to say for a rating to be read in it. */
export interface AgeWorld {
  /** Turns a file's value rating into the level on the scale the screen shows. Leave out in 2026. */
  stretch?: (valueRating: number) => number;
  /** The best level of the world. 94 when left out. */
  top?: number;
  /** What the file's age is short of 1 August: 1 in a past season, 0 (the default) in 2026. */
  ageShift?: number;
}

/** One man read in his world: the level his price gives him, the age he was read at, the rating shown. */
export interface AgeReading {
  level: number;
  age: number;
  rating: number;
}

export const agePoints: (level: number, age: number, top?: number) => number = scriptAgePoints;
export const ageRead: (level: number, age: number, top?: number) => number = scriptAgeRead;
export const levelFrom: (rating: number, age: number, top?: number) => number = scriptLevelFrom;
export const readInWorld: (valueRating: number, fileAge: number, world?: AgeWorld) => AgeReading = scriptReadInWorld;
