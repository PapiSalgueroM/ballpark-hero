import type { FormationSlot } from '@/lib/squadShape';
import type { Player } from '@/types/game';

type MarketPlayer = Pick<Player, 'name' | 'position' | 'marketValue'>;

/** The cheapest distinct set of market players that covers every empty shirt. */
export function minimumCompletionCost(
  slots: readonly Pick<FormationSlot, 'allowed'>[],
  pool: readonly MarketPlayer[],
  signedNames: ReadonlySet<string>,
): number | null {
  if (!slots.length) return 0;
  const positions = new Set(slots.flatMap(slot => slot.allowed));
  const matching = new Array<MarketPlayer | undefined>(slots.length);
  const candidates = pool.filter(player => positions.has(player.position) && !signedNames.has(player.name))
    .sort((a, b) => a.marketValue - b.marketValue);
  const added = new Set<string>();

  const place = (player: MarketPlayer, visited: Set<number>): boolean => slots.some((slot, index) => {
    if (visited.has(index) || !slot.allowed.includes(player.position)) return false;
    visited.add(index);
    const current = matching[index];
    if (current && !place(current, visited)) return false;
    matching[index] = player;
    return true;
  });

  let cost = 0;
  for (const player of candidates) {
    if (added.has(player.name) || !place(player, new Set())) continue;
    // Matchable player sets form a transversal matroid. Taking each cheapest
    // player who can be added gives the cheapest full XI, with earlier picks
    // moved between their valid positions as needed by the matching above.
    added.add(player.name);
    cost += player.marketValue;
    if (added.size === slots.length) return cost;
  }
  return null;
}
