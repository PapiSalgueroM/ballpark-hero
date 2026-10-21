/* Round 1502, step E5 (the critic's corrections 4 and 5): the one line of the watched Champions League that moves
 * anything outside worldComps, written once for every harness that needs it switched off.
 *
 * WHAT IT IS. uclHolderOf (src/lib/clubManager.ts) is the holder a finished season hands the next one: the final
 * of my own bracket, else the winner of the competition I watched. The holder goes into next season's field
 * whatever its league did (the real route), so from E5 a season after a watched final can draw a different
 * field, and with it different groups. Its last line is the whole of that change:
 *
 *   HOLDER_LINE       `  return own ?? worldUclWinner(career);`
 *   HOLDER_REVERTED   `  return own;` (the holder of my own bracket only, the rule before E5)
 *
 * WHO REVERTS IT. scripts/simWorldUcl.mjs section 5 (the attribution: with the line reverted the engine is the
 * engine before E5 in every key) and section 2 (both arms, so the binding is compared alone), and the kits pinned
 * to an old engine that cross a rollover with a watcher (the bridge of correction 5). Each edit fails closed: the
 * line must stand exactly once.
 *
 *   import { HOLDER_EDIT, withoutWatchedHolder } from './lib/worldUclHolder1502.mjs';
 *   HOLDER_EDIT                    { file, from, to } for scripts/lib/worldUclFleet.mjs's engineOf edits
 *   withoutWatchedHolder(source)   clubManager.ts's source with the line reverted (LF), or a thrown error
 */
export const HOLDER_FILE = 'src/lib/clubManager.ts';
export const HOLDER_LINE = '  return own ?? worldUclWinner(career);\n';
export const HOLDER_REVERTED = '  return own;\n';
export const HOLDER_EDIT = { file: HOLDER_FILE, from: HOLDER_LINE, to: HOLDER_REVERTED };

export function withoutWatchedHolder(source) {
  const text = source.split('\r\n').join('\n');
  const count = text.split(HOLDER_LINE).length - 1;
  if (count !== 1) throw new Error(`worldUclHolder1502: the holder line stands in ${HOLDER_FILE} ${count} times, it must be exactly once`);
  return text.replace(HOLDER_LINE, HOLDER_REVERTED);
}
