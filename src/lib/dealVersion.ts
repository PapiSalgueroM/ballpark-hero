/**
 * Round 679: which deal a save was made on (docs/design/POINTS-ECONOMY-V2.md,
 * sections 5 and 10).
 *
 * Release G changes the deal of many dailies (independent answer keys, close
 * call decks, shuffled lists) at an Eastern midnight. A save carries the
 * version of the deal it was made on, and a save from another deal is not
 * restored, so a day never straddles two deals: a board saved on the old deal
 * never comes back over the new one, scored against a key it was not dealt.
 *
 * THE RULE FOR A ROUND THAT CHANGES A DEAL: add the game here at the next
 * version, in the same commit as the change, and read its saves through
 * sameDeal. Every game starts at 1, and a save written before this round
 * carries no version, which is deal 1.
 *
 * Who stamps and reads it today: useDailyPuzzle's save (the shared daily of
 * 38 games) and the ledger's run record (src/lib/playLedger.ts). A game with
 * a daily save of its own adopts it in the round that changes its deal.
 */
export const DEAL_VERSIONS: Readonly<Record<string, number>> = {};

/** The version of the deal this game deals now. */
export function dealVersionFor(game: string): number {
  return Object.prototype.hasOwnProperty.call(DEAL_VERSIONS, game) ? DEAL_VERSIONS[game] : 1;
}

/** True when a save stamped with `saved` was made on this game's current deal. */
export function sameDeal(game: string, saved: unknown): boolean {
  const version = typeof saved === 'number' && Number.isFinite(saved) ? saved : 1;
  return version === dealVersionFor(game);
}
