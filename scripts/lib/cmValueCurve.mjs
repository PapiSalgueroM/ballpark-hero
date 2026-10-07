/**
 * Round 1035: Club Manager's market value curve, lifted out of
 * scripts/bakeClubManagerRosters.mjs so a second generator
 * (scripts/genClubManagerALeague.mjs) rates its players on the SAME curve
 * rather than a copy. The bake imports these; nothing here may differ from
 * what the bake shipped with, so every baked rating is unchanged.
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

/** USD market value -> game rating on a 48-94 curve ($216m -> 94, $1m -> 64). */
export function ratingOf(usd) {
  if (!usd || usd <= 0) return RATING_FLOOR;
  const r = Math.round(-13.106 + 12.851 * Math.log10(usd));
  return Math.max(RATING_FLOOR, Math.min(RATING_CEIL, r));
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
