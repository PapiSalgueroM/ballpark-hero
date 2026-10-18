/* Round 1510 (the lead's decision 5): the bridge for a kit that crosses a rollover with a PARTICIPANT of a domestic
 * super cup. A participant's calendar gains its cup's nights at the rollover (src/lib/clubManager.ts, openOneOff),
 * so a kit that compares a participant's whole state with an engine from before the round, past a rollover, would
 * read the round's design as a difference. Such a kit plays this tree with the one insertion call taken out (and
 * strips worldComps.dsc, the round's own key), which is the engine before the round on every other key; it is never
 * a new recording. The line must stand in clubManager.ts exactly once (engineOf in worldUclFleet.mjs refuses
 * otherwise), so a change to it fails the kit closed rather than quietly bridging nothing.
 */
export const DSC_NIGHTS_EDIT = {
  file: 'src/lib/clubManager.ts',
  from: '    if (mine) insertOneOffNights(state, slots as number[]);\n',
  to: '',
};
