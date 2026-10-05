/**
 * Round 1014: a sport free finals bracket. A bracket is DATA (a list of ties
 * whose two sides are slots) and this file only resolves it: which clubs meet
 * in a given week once the earlier results are in, who is out, who won. The
 * Aussie rules final eight and the 2026 wildcard week are presets in
 * aussieRulesFormat.ts; any other sport's double chance system can be written
 * the same way without touching this file.
 *
 * Pure: no clock, no randomness, no storage.
 */

/** One side of a tie. A ladder seed (1 is top), the winner or loser of an
 *  earlier tie, or the Nth best placed (by seed) of several earlier winners. */
export type Slot =
  | { seed: number }
  | { winnerOf: string }
  | { loserOf: string }
  | { rankedWinnerOf: string[]; rank: number };

export interface FinalsTie { id: string; week: number; home: Slot; away: Slot }

/** A decided tie: the two club ids. */
export interface TieOutcome { winner: string; loser: string }

export interface Pairing { id: string; week: number; homeId: string; awayId: string }

/** Club id for a slot, or null while the tie it depends on is undecided. */
export function resolveSlot(slot: Slot, seeds: string[], results: Record<string, TieOutcome>): string | null {
  if ('seed' in slot) return seeds[slot.seed - 1] ?? null;
  if ('winnerOf' in slot) return results[slot.winnerOf]?.winner ?? null;
  if ('loserOf' in slot) return results[slot.loserOf]?.loser ?? null;
  const winners = slot.rankedWinnerOf.map(id => results[id]?.winner ?? null);
  if (winners.some(id => id === null || !seeds.includes(id))) return null;
  const ranked = [...(winners as string[])].sort((a, b) => seeds.indexOf(a) - seeds.indexOf(b));
  return ranked[slot.rank] ?? null;
}

export function finalsWeeks(ties: FinalsTie[]): number[] {
  return [...new Set(ties.map(tie => tie.week))].sort((a, b) => a - b);
}

/** Every pairing of one week, or null if any of them cannot be named yet. */
export function resolveWeek(ties: FinalsTie[], seeds: string[], results: Record<string, TieOutcome>, week: number): Pairing[] | null {
  const pairings: Pairing[] = [];
  for (const tie of ties.filter(value => value.week === week)) {
    const homeId = resolveSlot(tie.home, seeds, results);
    const awayId = resolveSlot(tie.away, seeds, results);
    if (!homeId || !awayId || homeId === awayId) return null;
    pairings.push({ id: tie.id, week, homeId, awayId });
  }
  return pairings;
}

/** The deciding tie: the one no other tie draws a side from. */
export function finalTie(ties: FinalsTie[]): FinalsTie | undefined {
  const used = new Set<string>();
  for (const tie of ties) for (const slot of [tie.home, tie.away]) {
    if ('winnerOf' in slot) used.add(slot.winnerOf);
    if ('loserOf' in slot) used.add(slot.loserOf);
    if ('rankedWinnerOf' in slot) slot.rankedWinnerOf.forEach(id => used.add(id));
  }
  return ties.find(tie => !used.has(tie.id));
}

/** Clubs out of the finals so far: everyone below the cut, plus every loser
 *  whose tie gives its loser no second chance. */
export function eliminated(ties: FinalsTie[], seeds: string[], qualifiers: number, results: Record<string, TieOutcome>): Set<string> {
  const out = new Set(seeds.slice(qualifiers));
  const secondChance = new Set(ties.flatMap(tie => [tie.home, tie.away]).flatMap(slot => 'loserOf' in slot ? [slot.loserOf] : []));
  for (const [id, outcome] of Object.entries(results)) if (!secondChance.has(id)) out.add(outcome.loser);
  return out;
}

/** The premier, once the deciding tie is in. */
export function premierOf(ties: FinalsTie[], results: Record<string, TieOutcome>): TieOutcome | null {
  const last = finalTie(ties);
  return last ? results[last.id] ?? null : null;
}
