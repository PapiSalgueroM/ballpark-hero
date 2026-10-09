/**
 * Round 1035: Club Manager's market value curve, lifted out of
 * scripts/bakeClubManagerRosters.mjs so a second generator
 * (scripts/genClubManagerALeague.mjs) rates its players on the SAME curve
 * rather than a copy. Every generator imports these: the 2026 bake, the
 * gathered leagues, the free agents and the four past seasons.
 *
 * Round 1102 changed what a rating is, once, here: the value curve below is
 * untouched (valueRatingOf), and ratingOf now adds points for age on top of
 * it (see THE AGE POINTS). CURVE_VERSION says which of the two a file is on.
 *
 * Pure: no network, no file reads, safe to import anywhere.
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

/** Which curve a generated file was rated on. 1 was the value curve alone
 *  (every file before Round 1102); 2 is the value curve plus points for age.
 *  Every generator stamps it into its META and scripts/simCmRatingShape.mjs
 *  refuses a file that carries another number, so two scales never ship. */
export const CURVE_VERSION = 2;

/** USD market value -> VALUE rating on a 48-94 curve ($216m -> 94, $1m -> 64).
 *  This is the whole rating every file carried before Round 1102, and it has
 *  not moved by a point (src/test/cmValueCurve.test.ts holds a recording). */
export function valueRatingOf(usd) {
  if (!usd || usd <= 0) return RATING_FLOOR;
  const r = Math.round(-13.106 + 12.851 * Math.log10(usd));
  return Math.max(RATING_FLOOR, Math.min(RATING_CEIL, r));
}

/**
 * Round 1102: THE AGE POINTS. A price is not a rating. A young man's price
 * has his future in it and an old man's price has his birthday in it, so the
 * value curve alone put a 21 year old full back above the best centre half
 * of his time. The rating is the value rating plus whole points for age:
 *
 *   rateFrom(valueRating, age, pos) = clamp(valueRating + agePoints, 48, 94)
 *   age is the man's age on 1 August of the season the file is for.
 *
 * Where each number comes from (measured 2026-10-07 on the value table's
 * 2025 and 2026 rows, 11,631 of them; the method note is section 3.1 of the
 * round's brief and scripts/simCmRatingShape.mjs measures it again):
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
 *  - THE HALF DISTANCE LIMIT: never more than half the way down from the top
 *    of the scale, so a man valued at the cap stays at the cap (a value at
 *    the cap says nothing about growth still to come).
 *  - 24 TO 29: nothing. The value rating stands.
 * Position is checked and NOT used. A table for each of keepers, defenders,
 * midfielders and forwards was measured and scored no better than this one
 * (a gain of 0.034 against 0.034 outfield, 0.023 against 0.025 with keepers),
 * so a position table later is a constant here, never a new call site.
 * What this does not promise: club tiers moved with it (the harness prints
 * the clubs), and nothing in the game engine was retuned for it.
 */
export const YOUTH_FROM = 24;
export const YOUTH_MAX = 6;
export const VETERAN_CAP = 8;
export const VETERAN_POINTS = Object.freeze({ 30: 1, 31: 2, 32: 2, 33: 3, 34: 4, 35: 5, 36: 6, 37: 7 });
/** The thirteen positions every rated file holds. */
export const ENGINE_POSITIONS = new Set(Object.values(POS_MAP));
/** The ages a rated file may hold. Outside this a row is a typing slip. */
export const AGE_MIN = 14;
export const AGE_MAX = 45;

/** Whole points for age on top of a value rating. Integers in, integer out. */
export function agePoints(valueRating, age) {
  if (age < YOUTH_FROM) return 0 - Math.min(YOUTH_FROM - age, YOUTH_MAX, Math.floor((RATING_CEIL - valueRating) / 2));
  if (age < 30) return 0;
  return age >= 38 ? VETERAN_CAP : VETERAN_POINTS[age];
}

/** Value rating, age and position -> the game rating. FAILS CLOSED: a
 *  missing age or position is a call site that was never converted, and a
 *  silent default there would ship a second scale. */
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
  return Math.max(RATING_FLOOR, Math.min(RATING_CEIL, valueRating + agePoints(valueRating, age)));
}

/** USD market value, age on 1 August and engine position -> the game rating.
 *  A call with no age or no position throws (rateFrom): there is no default. */
export function ratingOf(usd, age, pos) {
  return rateFrom(valueRatingOf(usd), age, pos);
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
