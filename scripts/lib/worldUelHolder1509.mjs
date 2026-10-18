/* Round 1509, step 6(b) (ruling 1k): the one line of the Europa League that moves anything outside worldComps,
 * written once for every harness that needs it switched off.
 *
 * WHAT IT IS. uelHolderOf (src/lib/clubManager.ts) is the Europa League winner a finished season hands the next
 * Champions League (row Q4 of scripts/data/cmEuroAccess.json: the titleholder is admitted to its league phase).
 * uclDirectQualifiersFromTables takes it right after the holders, so from this step a season after a watched
 * Europa League final can draw a different Champions League field (the participant's, through uclQualifiersFrom,
 * and the watched one, through worldUclField), and with it a different draw and a different Europa League field.
 * The line it is taken by is the whole of that change:
 *
 *   UEL_HOLDER_LINE       `  if (uelHolder) take(uelHolder);`
 *   UEL_HOLDER_REVERTED   nothing (the rule before this step: the league places, then the holders)
 *
 * WHO REVERTS IT. scripts/simWorldEuro.mjs section 5 (the attribution: with the line reverted the engine is step
 * 6(a)'s in every key), scripts/proofWorldUclFleet.mjs --uel-holder-off (the fleet proof against step 6(a)),
 * scripts/simWorldUcl.mjs section 2 (both arms, so the Champions League's binding is compared alone) and
 * scripts/simCmUnseededWorld.mjs's tree arms. Each edit fails closed: the line must stand exactly once.
 *
 *   import { UEL_HOLDER_EDIT, withoutUelHolder } from './lib/worldUelHolder1509.mjs';
 *   UEL_HOLDER_EDIT              { file, from, to } for scripts/lib/worldUclFleet.mjs's engineOf edits
 *   withoutUelHolder(source)     clubManager.ts's source with the line reverted (LF), or a thrown error
 */
export const UEL_HOLDER_FILE = 'src/lib/clubManager.ts';
export const UEL_HOLDER_LINE = '  if (uelHolder) take(uelHolder);\n';
export const UEL_HOLDER_REVERTED = '';
export const UEL_HOLDER_EDIT = { file: UEL_HOLDER_FILE, from: UEL_HOLDER_LINE, to: UEL_HOLDER_REVERTED };

export function withoutUelHolder(source) {
  const text = source.split('\r\n').join('\n');
  const count = text.split(UEL_HOLDER_LINE).length - 1;
  if (count !== 1) throw new Error(`worldUelHolder1509: the Europa League holder line stands in ${UEL_HOLDER_FILE} ${count} times, it must be exactly once`);
  return text.replace(UEL_HOLDER_LINE, UEL_HOLDER_REVERTED);
}
