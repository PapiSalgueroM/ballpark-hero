/**
 * Whether a game gets to call itself new.
 *
 * Round 447. His words, 2026-09-04: "a problem i have with ur labiling is that
 * u call like everything new". He was right: 111 of the 131 registry entries
 * carried `isNew: true`, most of them since the day they shipped, some of them
 * since February. A badge on 85 percent of the tiles is not a badge, it is
 * wallpaper, and it costs the site the one thing the word is for, which is
 * pointing a returning player at what they have not seen.
 *
 * The flag was the wrong shape. "New" is not a property a game has, it is a
 * relationship between the day it shipped and the day someone is looking, and
 * a boolean someone has to remember to turn off will never be turned off. So
 * the registry now records the fact (addedOn, the day the page first landed in
 * git, which scripts/simNewBadge.mjs checks against git itself) and this
 * function derives the badge from it.
 *
 * Fourteen days, measured rather than felt: over six dates spanning August and
 * September 2026, a 14 day window badges between 0 and 14 tiles of 124 live
 * (the 14 is the day eleven games shipped at once), a 30 day window badges up
 * to 25. Fourteen keeps the badge rare enough to mean something and long
 * enough that a weekly visitor sees it once.
 *
 * No clock is read here, on purpose. The caller pins the day once at mount
 * and passes it in, the same rule every daily game follows, so the home page
 * cannot disagree with itself across a midnight.
 */

/** How long a game wears the NEW badge after it ships, in days. */
export const NEW_BADGE_DAYS = 14;

const dayNumber = (isoDate: string): number => {
  const t = Date.parse(`${isoDate}T00:00:00Z`);
  return Number.isFinite(t) ? Math.floor(t / 86_400_000) : Number.NaN;
};

/**
 * @param addedOn the day the game shipped, as YYYY-MM-DD, or undefined for a
 *   game whose ship date is not recorded (never new)
 * @param todayStr the pinned current day, as YYYY-MM-DD
 */
export function isNewGame(addedOn: string | undefined, todayStr: string): boolean {
  if (!addedOn) return false;
  const age = dayNumber(todayStr) - dayNumber(addedOn);
  if (!Number.isFinite(age)) return false;
  return age >= 0 && age < NEW_BADGE_DAYS;
}
