/**
 * Round 706. A name that starts with an underscore is a scrape placeholder for
 * a first name the source never had, never a person: "_ Johnston" (New
 * Hampshire, 1985-86), "_ Eldredge" (Hofstra), "_ Sullivan" (UTEP, 2012),
 * "_ Polamalu" (Navy, 2012). Measured 2026-09-30: 3 rows in ncaa_player_stats,
 * 3 in cfb_qb_stats and 13 in cfb_rb_stats. The Round 706 migrations delete
 * them; until those land, and after, no search offers one.
 *
 * scripts/lib/placeholderName.mjs is the same rule for the offline scripts, and
 * scripts/simCollegeTables.mjs fails if the two ever disagree on a live name.
 */
export function isPlaceholderName(name: string | null | undefined): boolean {
  return /^\s*_/.test(String(name ?? ''));
}
