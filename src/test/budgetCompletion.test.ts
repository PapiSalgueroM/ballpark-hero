import { describe, expect, it } from 'vitest';
import { minimumCompletionCost } from '@/lib/budgetCompletion';
import type { Player } from '@/types/game';

type MarketPlayer = Pick<Player, 'name' | 'position' | 'marketValue'>;
type Slot = { allowed: Player['position'][] };

const slot = (...allowed: Player['position'][]): Slot => ({ allowed });
const player = (name: string, position: Player['position'], marketValue: number): MarketPlayer => ({ name, position, marketValue });

function bruteForce(slots: Slot[], market: MarketPlayer[], used: Set<string>): number | null {
  if (!slots.length) return 0;
  const [first, ...rest] = slots;
  let best = Infinity;
  for (const candidate of market) {
    if (used.has(candidate.name) || !first.allowed.includes(candidate.position)) continue;
    const next = bruteForce(rest, market, new Set(used).add(candidate.name));
    if (next !== null) best = Math.min(best, candidate.marketValue + next);
  }
  return Number.isFinite(best) ? best : null;
}

describe('Budget Builder completion cost', () => {
  it('moves a cheap shared option to the shirt that depends on him', () => {
    const slots = [slot('CB', 'LB'), slot('CB')];
    const market = [player('Centre', 'CB', 5), player('Wide', 'LB', 9), player('Replacement', 'CB', 70)];
    expect(minimumCompletionCost(slots, market, new Set())).toBe(14);
    expect(minimumCompletionCost(slots, market, new Set(['Centre']))).toBe(79);
    expect(minimumCompletionCost([slot('CB'), slot('CB')], [market[0], { ...market[0] }], new Set())).toBeNull();
    expect(minimumCompletionCost([], [], new Set())).toBe(0);
  });

  it('agrees with exhaustive assignments across overlapping slots and cost ties', () => {
    const positions = ['CB', 'LB', 'CDM'] as const;
    let seed = 528;
    const random = (max: number) => {
      seed = (seed * 16807) % 2147483647;
      return seed % max;
    };
    const outcomes = { matched: 0, unavailable: 0 };
    for (let index = 0; index < 144; index++) {
      const slots = Array.from({ length: 2 + random(4) }, () => {
        const mask = 1 + random(7);
        return slot(...positions.filter((_, index) => mask & (1 << index)));
      });
      const market = Array.from({ length: 5 + random(4) }, (_, index) =>
        player(`Player ${index}`, positions[random(positions.length)], 1 + random(8)));
      const signedNames = new Set([market[random(market.length)].name]);
      const exact = bruteForce(slots, market, signedNames);
      expect(minimumCompletionCost(slots, market, signedNames)).toBe(exact);
      outcomes[exact === null ? 'unavailable' : 'matched']++;
    }
    expect(outcomes.matched).toBeGreaterThan(30);
    expect(outcomes.unavailable).toBeGreaterThan(30);
  });
});
