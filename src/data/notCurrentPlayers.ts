/**
 * Players who must never be presented as current.
 *
 * Round 667. Who Am I builds its secret pool from the top of the market value
 * table by current value, and carries a 2025 row forward when a player has no
 * 2026 row, so a man who left the game between the two snapshots is kept as a
 * live player. That is how Diogo Jota, who died on 3 July 2025 while a
 * Liverpool player, was dealt as a secret with an age and a price, in Who Am
 * I and in Clue Auction, which draws from the same pool. Round 542 had already
 * removed him from every Club Manager squad, but as a bake time assertion
 * rather than a list anything else could read, so the pool never got the rule.
 *
 * This is that list. One place, imported by every pool that offers a player
 * as current, so the next name goes in once. It is not a data source about
 * anyone: it names a man and the reason, nothing more. Keep the reason a
 * plain fact, dated.
 *
 * Careers, records and archives are untouched by it. A Connections group
 * "Played for Wolverhampton Wanderers" is history and stays right.
 */
export interface NotCurrentPlayer {
  name: string;
  /** Plain fact, dated, no editorialising. */
  reason: string;
}

export const NOT_CURRENT_PLAYERS: readonly NotCurrentPlayer[] = [
  { name: 'Diogo Jota', reason: 'Died 3 July 2025, aged 28, while a Liverpool player.' },
];

/** Names as the pools compare them: lower case, accents folded, one space. */
export function foldPlayerName(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

const FOLDED = new Set(NOT_CURRENT_PLAYERS.map(p => foldPlayerName(p.name)));

/** True when this name must not be offered as a current player. */
export function isNotCurrentPlayer(name: string): boolean {
  return FOLDED.has(foldPlayerName(name));
}
