/* Round 1593: the one line that makes a save's own club PLAY the Europa League, written once for every harness that
 * needs it switched off (the worldUelHolder1509.mjs pattern, the critic's correction 8).
 *
 * WHAT IT IS. startNextSeason opens the season's Europa League with worldCompField's opt in (`play`, its last
 * argument): when the rule gives my club a league place, the cup or the cup's place passed down, the field holds my
 * club and the slice names it `me`, and its seventeen nights go on my calendar. With the argument dropped the field
 * is the watcher's, nothing is inserted, and every save plays as it did before the round's participant half.
 *
 *   PLAY_EDITS   [{ file, from, to }] for engineOf's edits: `from` must stand exactly once (engineOf refuses
 *                otherwise), `to` is the base's call.
 * Used with scripts/lib/tickingWeeks1593.mjs's TICKING_EDITS, a head engine is the base engine again, byte for
 * byte, on every save: scripts/simCmEuroPlay.mjs section 6 holds that.
 */
export const PLAY_EDITS = [
  { file: 'src/lib/clubManager.ts',
    from: "    openWorldComp(state, 'uel', worldCompField(state, 'uel', tables, null, watchCup, null, true), null);\n",
    to: "    openWorldComp(state, 'uel', worldCompField(state, 'uel', tables, null, watchCup), null);\n" },
];
