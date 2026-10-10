/**
 * Round 1035: Club Manager's market value curve, lifted out of
 * scripts/bakeClubManagerRosters.mjs so a second generator
 * (scripts/genClubManagerALeague.mjs) rates its players on the SAME curve
 * rather than a copy. The bake imports these; nothing here may differ from
 * what the bake shipped with, so every baked rating is unchanged.
 *
 * Round 1214 (part one of four): the age read is written here, once, and
 * NOTHING SHIPPED USES IT YET. The value curve is untouched (valueRatingOf,
 * and ratingOf with one argument still answers with it, so every generator
 * writes the bytes it wrote before). The new functions are the library the
 * later parts stand on: agePoints, ageRead, levelFrom, readInWorld, rateFrom
 * and ratingOf with an age and a position. See THE AGE POINTS below.
 *
 * THE APP IMPORTS THIS FILE (src/lib/cmAgeRead.ts), so it stays pure: no
 * import, no node module, no network, no file read, no clock.
 * src/test/cmValueCurve.test.ts fails the day an import statement appears.
 */

/** Transfermarkt detailed position -> engine position (the bake's map). */
export const POS_MAP = {
  'Goalkeeper': 'GK', 'Centre-Back': 'CB', 'Left-Back': 'LB', 'Right-Back': 'RB',
  'Defensive Midfield': 'CDM', 'Central Midfield': 'CM', 'Attacking Midfield': 'CAM',
  'Left Midfield': 'LM', 'Right Midfield': 'RM', 'Left Winger': 'LW', 'Right Winger': 'RW',
  'Centre-Forward': 'ST', 'Second Striker': 'CF',
};

/** The curve's floor and ceiling ratings. */
export const RATING_FLOOR = 48;
export const RATING_CEIL = 94;

/** Which curve a generated file was rated on. 1 is the value curve alone,
 *  which is every file shipped today. 2 is the value curve plus points for
 *  age. No generator stamps a 2 until the round that re-rates the 2026 files
 *  (part four); the constant is here so that round and its harness read one
 *  number. */
export const CURVE_VERSION = 2;

/** USD market value -> VALUE rating on a 48-94 curve ($216m -> 94, $1m -> 64).
 *  This is the whole rating every shipped file carries, and it has not moved
 *  by a point (src/test/cmValueCurve.test.ts holds a recording made from the
 *  module before Round 1214 touched it). */
export function valueRatingOf(usd) {
  if (!usd || usd <= 0) return RATING_FLOOR;
  const r = Math.round(-13.106 + 12.851 * Math.log10(usd));
  return Math.max(RATING_FLOOR, Math.min(RATING_CEIL, r));
}

/**
 * THE AGE POINTS (measured in Round 1102, redesigned for Round 1214).
 * A price is not a rating. A young man's price has his future in it and an
 * old man's price has his birthday in it, so the value curve alone puts a 21
 * year old full back above the best centre half of his time. The rating a
 * screen shows is the LEVEL his price gives him on the scale of his world,
 * plus whole points for his age, never past the top of that world:
 *
 *   ageRead(level, age, top) = clamp(level + agePoints(level, age, top), 48, top)
 *
 * level  in 2026 the value rating; in a past season the value rating AFTER
 *        that season's stretch (eraUpliftRating in src/lib/clubManagerEras.ts),
 *        so it may run above 94, to 99.
 * age    the man's age on 1 August of the season the file is for.
 * top    the best level in his world: 94 in 2026, and each past season's own.
 *
 * Where each number comes from (measured 2026-10-07 on the value table's
 * 2025 and 2026 rows, 11,631 of them):
 *  - FROM 30, POINTS BACK. 4,246 men have one row in each year, so the change
 *    in ONE man's value as he ages a year is read directly, with no survivor
 *    problem. In rating points the market takes off 0.90 at 30, then 1.12,
 *    1.28, 1.24, 1.35, 1.14 and 0.85 at 36 (about 1.2 a year after that).
 *    Three quarters of that running discount is given back and a quarter is
 *    kept as what age really takes: 1, 2, 2, 3, 4, 5, 6, 7 from 30 to 37.
 *  - THE CAP OF 8 from 38: the table holds under a dozen men a year past 37,
 *    too few to read a ninth point from.
 *  - UNDER 24, A POINT A YEAR OFF, six at most. This one is NOT in the table
 *    (no column separates a boy's future from what he is today): it is set by
 *    the outcome, how well the rating order inside a club agrees with who the
 *    manager actually played, which stops improving at about a point a year.
 *    24 is the age the same man's value stops rising.
 *  - THE HALF DISTANCE LIMIT: a young man never gives back more than half the
 *    way down from the top OF HIS OWN WORLD, so a man valued at the top stays
 *    at the top (a value at the top says nothing about growth still to come).
 *  - 24 TO 29: nothing. The level stands.
 * Both limits read `top`, never the constant 94: the half distance and the
 * upper clamp. That is what keeps the two best men of a past season on their
 * number and stops an old great passing the best of his day.
 * Position is checked (rateFrom) and NOT used. A table for each of keepers,
 * defenders, midfielders and forwards was measured and scored no better than
 * this one, so a position table later is a constant here, never a call site.
 */
export const YOUTH_FROM = 24;
export const YOUTH_MAX = 6;
export const VETERAN_FROM = 30;
export const VETERAN_CAP = 8;
export const VETERAN_POINTS = Object.freeze({ 30: 1, 31: 2, 32: 2, 33: 3, 34: 4, 35: 5, 36: 6, 37: 7 });
/** The highest level a stretched past season can hold (eraUpliftRating's cap). */
export const LEVEL_MAX = 99;
/** The thirteen positions every rated file holds. */
export const ENGINE_POSITIONS = new Set(Object.values(POS_MAP));
/** The ages a rated FILE may hold. Outside this a row is a typing slip. The
 *  three reads below take any whole age, because a saved man can be older. */
export const AGE_MIN = 14;
export const AGE_MAX = 45;

/* A read of a number that is not a whole number is a call site bug, and a
   silent NaN from here would be written into a save. So: throw, naming it. */
function wholeInputs(fn, level, age, top) {
  if (!Number.isInteger(level)) throw new RangeError(`${fn}: the level or rating must be a whole number (got ${level}, age ${age}, top ${top})`);
  if (!Number.isInteger(age)) throw new RangeError(`${fn}: the age must be a whole number (got ${age}, level or rating ${level}, top ${top})`);
  if (!Number.isInteger(top) || top < RATING_FLOOR || top > LEVEL_MAX) {
    throw new RangeError(`${fn}: the top must be a whole number from ${RATING_FLOOR} to ${LEVEL_MAX} (got ${top}, level or rating ${level}, age ${age})`);
  }
}

/** Whole points for age on top of a level. Never above zero for a man under
 *  24, never below zero for anyone else. Defined for every whole level, every
 *  whole age and every top from 48 to 99. */
export function agePoints(level, age, top = RATING_CEIL) {
  wholeInputs('agePoints', level, age, top);
  if (age < YOUTH_FROM) {
    const halfWay = Math.max(0, Math.floor((top - level) / 2));
    return 0 - Math.min(YOUTH_FROM - age, YOUTH_MAX, halfWay);
  }
  if (age < VETERAN_FROM) return 0;
  return age >= 38 ? VETERAN_CAP : VETERAN_POINTS[age];
}

/** The rating a screen shows: the level plus the age points, held between the
 *  floor and the top of the man's own world. Whole numbers in, whole number
 *  out, never NaN. */
export function ageRead(level, age, top = RATING_CEIL) {
  wholeInputs('ageRead', level, age, top);
  return Math.max(RATING_FLOOR, Math.min(top, level + agePoints(level, age, top)));
}

/**
 * The age read run backwards: the level a shown rating stands on.
 * TOTAL, on purpose. The age read skips numbers for a young man (at top 94 an
 * 18 year old can be shown 76 or 78 and never 77) and the engine builds men
 * whose rating was never read off a level at all (a created club's founders),
 * so "the level whose read IS this rating" has no answer for them. The rule:
 *   the smallest level from 48 to the top whose age read is AT LEAST the
 *   rating, and the top when there is none (a rating above the top).
 * So levelFrom(ageRead(L, age, top), age, top) is L wherever L is the first
 * level with that read, which is everywhere except under a clamp (a boy held
 * on the floor of 48, a veteran held on the top), where it is the lowest of
 * the levels that share the read. Always a whole number from 48 to the top.
 */
export function levelFrom(rating, age, top = RATING_CEIL) {
  wholeInputs('levelFrom', rating, age, top);
  for (let level = RATING_FLOOR; level < top; level += 1) {
    if (ageRead(level, age, top) >= rating) return level;
  }
  return top;
}

/**
 * ONE ORDER, EVERY WORLD: the stretch first, then the age points, on the top
 * of the stretched scale. Round 1102 added the points in the file, under a
 * past season's stretch, and the stretch multiplied them (2010 Messi 95 where
 * he had been 97). This is the order written down once:
 *   valueRating  the value rating a file row carries (48 to 94).
 *   fileAge      the age the file holds for him.
 *   world        { stretch, top, ageShift }: stretch turns a value rating into
 *                the level on the scale the screen shows (leave it out for
 *                2026); top is the best level of that world; ageShift is what
 *                the file's age is short of 1 August (1 in a past season,
 *                whose files hold the 1 January age; 0 in 2026).
 * Returns { level, age, rating }. A world that is not an object (null, a
 * number, a string) or a stretch that is not a function is a call site bug
 * and throws a RangeError naming it, like every other bad read here; only a
 * world left out altogether means 2026.
 */
export function readInWorld(valueRating, fileAge, world = {}) {
  if (world === null || typeof world !== 'object' || Array.isArray(world)) {
    throw new RangeError(`readInWorld: the world must be an object { stretch, top, ageShift }, or left out for 2026 (got ${world === null ? 'null' : typeof world}, value rating ${valueRating}, age ${fileAge})`);
  }
  const { stretch, top = RATING_CEIL, ageShift = 0 } = world;
  if (stretch && typeof stretch !== 'function') {
    throw new RangeError(`readInWorld: the stretch must be a function from a value rating to a level, or left out (got ${typeof stretch}, value rating ${valueRating}, age ${fileAge})`);
  }
  const level = stretch ? stretch(valueRating) : valueRating;
  const age = fileAge + ageShift;
  return { level, age, rating: ageRead(level, age, top) };
}

/** Value rating, age and position -> the 2026 game rating. FAILS CLOSED for
 *  a generator: a missing age or position is a call site that was never
 *  converted, and a silent default there would ship a second scale. */
export function rateFrom(valueRating, age, pos) {
  if (!Number.isInteger(valueRating) || valueRating < RATING_FLOOR || valueRating > RATING_CEIL) {
    throw new Error(`rateFrom: the value rating must be a whole number from ${RATING_FLOOR} to ${RATING_CEIL} (got valueRating ${valueRating}, age ${age}, pos ${pos})`);
  }
  if (!Number.isInteger(age) || age < AGE_MIN || age > AGE_MAX) {
    throw new Error(`rateFrom: the age must be a whole number from ${AGE_MIN} to ${AGE_MAX} (got valueRating ${valueRating}, age ${age}, pos ${pos})`);
  }
  if (!ENGINE_POSITIONS.has(pos)) {
    throw new Error(`rateFrom: the position must be one of the thirteen engine positions (got valueRating ${valueRating}, age ${age}, pos ${pos})`);
  }
  return ageRead(valueRating, age, RATING_CEIL);
}

/**
 * USD market value -> game rating.
 * ONE ARGUMENT (every generator today): the value rating, as it has always
 * been, so no shipped file moves. This form goes in the round that re-rates
 * the 2026 files, and from then on a call with no age throws.
 * WITH AN AGE AND A POSITION: the value rating read with the age (rateFrom).
 * Any call that passes a second argument is held to the full rule, so an
 * age that is missing from a row throws instead of falling back.
 */
export function ratingOf(usd, ...rest) {
  if (rest.length === 0) return valueRatingOf(usd);
  return rateFrom(valueRatingOf(usd), rest[0], rest[1]);
}

/** USD -> pounds sterling millions, one decimal by default. A generator
 *  whose values sit below the dataset's floor passes dp 2, because one
 *  decimal rounds a $50k player to zero and a value at or below zero is on
 *  the smell list. */
export function gbpM(usd, dp = 1) {
  const f = 10 ** dp;
  const m = (usd * 0.75) / 1e6;
  return Math.round(m * f) / f;
}

/** EUR -> USD at the house rate: the 1.08 that
 *  scripts/data/defensiveMidfield2026.json, staleSweep2026.json and
 *  window2026/missingPlayers.json record for every Transfermarkt EUR value
 *  written into the USD value table. */
export const EUR_USD_RATE = 1.08;
export function usdOfEur(eur) {
  return Math.round(eur * EUR_USD_RATE);
}

/** The USD value at which the unrounded curve sits exactly on its floor.
 *  A player with no market value is given this, never zero: it rates at
 *  the floor and still carries a positive value. */
export const FLOOR_USD = Math.round(10 ** ((RATING_FLOOR + 13.106) / 12.851));
