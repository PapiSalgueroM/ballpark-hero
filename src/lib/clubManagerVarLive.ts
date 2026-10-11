/** VAR in Club Manager: ON for goals since the fix pass of Round 1303 (it shipped dark from Release AT until then).
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
 * Round 1218 did the first half of that and left the switch where it was. Done: the rates are derived from
 * published counts of real football (scripts/data/cmVarRates.json through scripts/genCmVarRates.mjs), a match
 * gets reviews only in a competition two sources confirm uses VAR in 2026-27 (cmVarCompetitions.json), and
 * simCmVar holds both on a fleet of 4,000 league matches.
 *
 * The review fix of Round 1218 did the screen: a review never opens over an action, a goal that gets ruled out
 * is drawn first (src/test/clubManagerVarScreen.test.tsx), and scripts/playCmVar.mjs walks a lit build at 390
 * and 1280 on the real rates. It still left the switch off.
 *
 * Round 1302 read all 48 competitions, played the screen cases (every goal a review rules out is drawn before
 * its card now, with the clock stopped where the plan has no room for it) and gave penalties a band. The switch
 * is still off, for TWO reasons, both written under owed in scripts/data/cmVarRates.json and printed by the
 * generator in src/data/clubManagerVarRates.ts (CM_VAR_HOLDS). While either is open this line must read false,
 * and two harnesses hold that (scripts/simCmVarLedger.mjs, control owedlive, and scripts/simCmVar.mjs):
 *   recent-seasons: the lead asked for each rate on two publishers for two recent seasons, and the only season
 *     two publishers counted is Serie A 2017-18. The lead closes this one, with a second count for two seasons
 *     from 2022-23 on or with a ruling written into the entry.
 *   penalties-total: with reviews on the engine gives 0.45 to 0.48 penalties a match, above the band real seasons
 *     give (0.25 to 0.40). NO RULING CLOSES THIS ONE. Only the engine does: its penalties a match with reviews on
 *     has to come inside the band. Marking the entry accepted does not pass simCmVar while it is outside.
 * When both are closed: this line, the What's New entry and the cases of the unit file follow, then the lit
 * walk. docs/audits/ROUND-1302-NOTES.md has the whole list (ROUND-1218-NOTES.md has the first half).
 *
 * Round 1303 changed what holds this line, and left it false. The lead ruled on the first reason (a rate stands
 * on two independent publishers within a factor of two, derived from the lowest reading: recent-seasons is
 * accepted) and asked for goals only. So the KIND of review became data: the rates ledger's kinds block, written
 * by the generator as CM_VAR_KINDS, handed to kickOff by the hook (cmVarGameAsk in src/lib/clubManagerVar.ts)
 * and saved with the match. An open owed entry now holds the kinds it names, not this whole switch, and this
 * switch may be true only while CM_VAR_KINDS is not empty (scripts/simCmVarLedger.mjs, control owedlive). Turning
 * it on alone asks for nothing: with an empty list the game asks kickOff for no review.
 *   penalties-total still holds the penalty kind (see above).
 *   goals-level held the goal kind: measured on ten fleets, the goal kind ALONE moved goals a match by 0.066 to
 *     0.088 down (a goal a review ruled out was a goal fewer and nothing gave one back), outside the 0.05 the
 *     balance harnesses let a rule move. The fix pass of Round 1303 closed it the third way the entry named, in
 *     the engine: a match that reviews goals draws them a little more often, by exactly what its reviews rule out
 *     (cmVarGoalLift in src/lib/clubManagerVar.ts), so those goals come on top and goals a match stays level
 *     (scripts/simCmVar.mjs, bands, and its control nolift). The entry is gone and the goal kind is on in the
 *     ledger: CM_VAR_KINDS is ['goal'].
 * The switch itself was the last commit of that pass: this line reads true, the What's New entry is in, the unit
 * file runs the lit rule (and its mode dark still proves what this line reading false plays), and the walk runs
 * on the plain build. To take VAR out again, make this line false: nothing else has to move, and the game then
 * plays the byte equal match it played before (the engine is asked for nothing). docs/audits/ROUND-1303-NOTES.md
 * has the list.
 *
 * Kept in its own file with no import so the help text, which several harnesses render with a plain
 * bundler, can read it without pulling the hook in. src/test/clubManagerVarLive.test.tsx holds it.
 */
export const CM_VAR_LIVE: boolean = true;
