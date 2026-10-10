/** Release AT: VAR ships dark.
 *
 * Round 1181 built a review rule inside the match (src/lib/clubManagerVar.ts). Measured on the integrated
 * tree over 680 seeded matches, asking for reviews changed the score in 196 and the result in 85, and a
 * review awarded a penalty in one match in six, on rates that have no source record, in every league and
 * cup of a modern save, including competitions that use no VAR in real life. The rule is accepted as a
 * design. False rates and false coverage are not, so the game does not ask for reviews yet.
 *
 * This is the one switch. src/hooks/useClubManager.ts reads it at both places the game kicks a match off
 * (the match button and the fast forward), and ClubManagerHelp.tsx reads it for the VAR paragraph. The
 * engine, the review screen, simCmVar and the unit tests opt in at the engine and do not read it.
 * The round that turns VAR on (sourced rates by review type, a ledger of which competitions use VAR,
 * bands in the harness) makes this true and restores the What's New entry.
 *
 * Kept in its own file with no import so the help text, which several harnesses render with a plain
 * bundler, can read it without pulling the hook in. src/test/clubManagerVarLive.test.tsx holds it.
 */
export const CM_VAR_LIVE: boolean = false;
