import { describe, expect, it } from 'vitest';
import { FORMATIONS } from '@/types/lineupBuilder';
import type { FilledSlot } from '@/types/lineupBuilder';
import {
  computeNeighborChemistry,
  leagueForClub,
  pitchNeighborPairs,
  xiOverall,
} from '@/lib/xiPitchChemistry';

function slot(index: number, extra: Partial<FilledSlot> = {}): FilledSlot {
  const pos = FORMATIONS['4-3-3'][index];
  return {
    ...pos,
    playerName: extra.playerName ?? `P${index}`,
    assignedTeam: extra.assignedTeam ?? 'Arsenal',
    isNation: extra.isNation ?? false,
    pick: extra.pick,
  };
}

describe('pitchNeighborPairs', () => {
  it('links same-row neighbors on a 4-3-3', () => {
    const pairs = pitchNeighborPairs(FORMATIONS['4-3-3']);
    const has = (a: number, b: number) =>
      pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

    expect(has(1, 2)).toBe(true); // LB-CB
    expect(has(8, 9)).toBe(true); // LW-ST
    expect(has(8, 4)).toBe(false); // LW is not next to RB
  });
});

describe('computeNeighborChemistry', () => {
  it('awards +3 for the same club on adjacent slots', () => {
    const filled = new Map<number, FilledSlot>([
      [8, slot(8, { playerName: 'Saka', pick: { club: 'Arsenal FC', nationality: 'England' } })],
      [9, slot(9, { playerName: 'Havertz', pick: { club: 'Arsenal FC', nationality: 'Germany' } })],
    ]);
    const result = computeNeighborChemistry(FORMATIONS['4-3-3'], filled);
    expect(result.totalBonus).toBe(3);
    expect(result.counts.club).toBe(1);
  });

  it('awards +1 for the same nationality on adjacent slots', () => {
    const filled = new Map<number, FilledSlot>([
      [8, slot(8, { playerName: 'Saka', pick: { club: 'Arsenal FC', nationality: 'England' } })],
      [9, slot(9, { playerName: 'Kane', pick: { club: 'Bayern Munich', nationality: 'England' } })],
    ]);
    const result = computeNeighborChemistry(FORMATIONS['4-3-3'], filled);
    expect(result.totalBonus).toBe(1);
    expect(result.counts.nationality).toBe(1);
  });

  it('does not invent a league when the club is unknown', () => {
    expect(leagueForClub('A Club We Do Not Track')).toBeUndefined();
    expect(leagueForClub('Arsenal FC')).toBe('Premier League');
  });
});

describe('xiOverall', () => {
  it('uses market-value ratings when picks carry them', () => {
    const filled = [
      slot(0, { playerName: 'Alisson', pick: { value: 40_000_000, age: 31 } }),
      slot(9, { playerName: 'Haaland', pick: { value: 180_000_000, age: 25 } }),
    ];
    const overall = xiOverall(filled, 0);
    expect(overall.source).toBe('market-value');
    expect(overall.score).toBeGreaterThan(40);
    expect(overall.label.toLowerCase()).toContain('market');
  });

  it('labels a placeholder formula when no ratings exist', () => {
    const filled = [slot(0), slot(1), slot(2)];
    const overall = xiOverall(filled, 4);
    expect(overall.source).toBe('placeholder');
    expect(overall.score).toBe(3 * 6 + 4);
    expect(overall.label.toLowerCase()).toContain('placeholder');
  });
});
