/* Round 1510 (the lead's decision 5): the bridge for a kit that crosses a rollover with a PARTICIPANT of a domestic
 * super cup. A participant's calendar gains its cup's nights at the rollover (src/lib/clubManager.ts, openOneOff),
 * so a kit that compares a participant's whole state with an engine from before the round, past a rollover, would
 * read the round's design as a difference. Such a kit plays this tree with the one insertion call taken out (and
 * strips worldComps.dsc, the round's own key), which is the engine before the round on every other key; it is never
 * a new recording. The line must stand in clubManager.ts exactly once (engineOf in worldUclFleet.mjs refuses
 * otherwise), so a change to it fails the kit closed rather than quietly bridging nothing. Round 1514: the same call
 * inserts the UEFA Super Cup's night (worldComps.usc), so the bridge leaves both off; strip both keys with it.
 */
export const DSC_NIGHTS_EDIT = {
  file: 'src/lib/clubManager.ts',
  from: '    if (mine) insertOneOffNights(state, slots as number[], k);\n',
  to: '',
};

/* Round 1514: the UEFA Super Cup's open at the rollover taken out (no worldComps.usc at all). For a kit whose two arms
 * differ in the Europa League (simWorldEuro section 2: the UEFA Super Cup reads its winner, so the arms would part on
 * that key by design); simOneOffCups section 3 is the proof that the open moves nothing but its own key. */
export const USC_OPEN_OFF = {
  file: 'src/lib/clubManager.ts',
  from: "    openOneOff(state, { tables: { table: null, cupWinner: null, cupRunnerUp: null, uclWinner: exit(watchHolder), uelWinner: exit(watchUelHolder) }, seasonOne: false }, 'usc');\n",
  to: "    setOneOffSlice(state, null, 'usc');\n",
};

/* Round 1514: the UEFA Super Cup's nights alone left off a participant's calendar (the domestic cup's kept), for a
 * kit whose base already plays Round 1510's domestic cup: with --strip worldComps.usc it holds the tree to that base. */
export const USC_NIGHTS_EDIT = {
  file: 'src/lib/clubManager.ts',
  from: '    if (mine) insertOneOffNights(state, slots as number[], k);\n',
  to: "    if (mine && k === 'dsc') insertOneOffNights(state, slots as number[], k);\n",
};
