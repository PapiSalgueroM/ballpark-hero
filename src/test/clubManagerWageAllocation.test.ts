import { afterEach, describe, expect, it, vi } from 'vitest';
import { buyWageRoom, freeAgentBlock, freeAgentTerms, loadCareer, saveCareer, startCareer, startNextSeason, wageBill, wageCapOf, wageRoomQuote, SAVE_KEY, type CareerState } from '@/lib/clubManager';
import { closeLedger, projectFinances } from '@/lib/clubManagerFinances';
import { saveFence } from '@/lib/saveFence';

afterEach(() => {
  vi.restoreAllMocks();
  saveFence.release(SAVE_KEY);
  localStorage.clear();
});

describe('Club Manager wage allocation', () => {
  it('quotes and buys multiple wage increments in a single confirmed budget adjustment', () => {
    const career: CareerState = { ...startCareer('Arsenal'), budget: 2.08, wageCap: 100 };
    expect(wageRoomQuote(career, 3)).toEqual({ cost: 1.56, budget: 0.52, wageCap: 130 });
    const bought = buyWageRoom(career, 3)!;
    expect(bought.budget).toBe(0.52);
    expect(wageCapOf(bought)).toBe(130);
    expect(projectFinances(bought).spend.find(line => line.id === 'wageRoom')?.actual).toBe(1.56);
    expect(buyWageRoom(career, 4)?.budget).toBe(0);
    for (const requested of [0, -1, 1.5, NaN, Infinity, 5]) {
      expect(wageRoomQuote(career, requested)).toBeNull();
      expect(buyWageRoom(career, requested)).toBeNull();
    }
  });

  it('moves £520k once into £10k of weekly room with no change to the old career', () => {
    const career: CareerState = { ...startCareer('Arsenal'), budget: 1.04, wageCap: 100 };
    const first = buyWageRoom(career)!;
    const second = buyWageRoom(first)!;
    expect(first).toMatchObject({ budget: 0.52, wageCap: 100, purchasedWageRoom: 10 });
    expect(second).toMatchObject({ budget: 0, wageCap: 100, purchasedWageRoom: 20 });
    expect(wageCapOf(first)).toBe(110);
    expect(wageCapOf(second)).toBe(120);
    expect(projectFinances(second).spend).toContainEqual({ id: 'wageRoom', label: 'Extra wage room', actual: 1.04, projected: 1.04, kitty: true });
    expect(closeLedger(second).spend - closeLedger(career).spend).toBeCloseTo(1.04);
    expect(buyWageRoom(second)).toBeNull();
    expect(career).toMatchObject({ budget: 1.04, wageCap: 100 });
    expect(career.purchasedWageRoom).toBeUndefined();
    expect(first.squad).toBe(career.squad);
  });

  it('refuses a short kitty and an already finished season', () => {
    const career = { ...startCareer('Arsenal'), budget: 0.51, wageCap: 100 };
    expect(buyWageRoom(career)).toBeNull();
    expect(buyWageRoom({ ...career, budget: 100, week: career.calendar.length })).toBeNull();
  });

  it('persists the allocation and opens a previously wage-blocked free-agent signing', () => {
    const career = { ...startCareer('Arsenal'), budget: 12 };
    const agent = career.freeAgents!.find(player => freeAgentBlock(career, player) === null)!;
    expect(agent).toBeDefined();
    const original = { ...career, wageCap: wageBill(career) + freeAgentTerms(agent, career).wage - 1 };
    expect(freeAgentBlock(original, agent)).toBe('overCap');
    const allocated = buyWageRoom(original)!;
    expect(saveCareer(allocated)).toBe(true);
    const loaded = loadCareer()!;
    expect(loaded.budget).toBe(11.48);
    expect(wageCapOf(loaded)).toBe(original.wageCap + 10);
    expect(freeAgentBlock(loaded, agent)).toBeNull();
  });

  it('ignores malformed optional wage-room data in both cap and ledgers', () => {
    const original = startCareer('Arsenal');
    const malformed = { ...original, purchasedWageRoom: 11 };
    expect(wageCapOf(malformed)).toBe(wageCapOf(original));
    expect(closeLedger(malformed)).toEqual(closeLedger(original));
    expect(buyWageRoom(malformed)?.purchasedWageRoom).toBe(10);
  });

  it('lets the regular board ceiling reset at rollover without charging the transfer funds again', () => {
    const original = { ...startCareer('Arsenal'), budget: 12 };
    const adjusted = buyWageRoom(original)!;
    const roll = (career: ReturnType<typeof startCareer>) => {
      let seed = 31337;
      vi.spyOn(Math, 'random').mockImplementation(() => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
      });
      const next = startNextSeason(career);
      vi.restoreAllMocks();
      return next;
    };
    const withoutMove = roll(original);
    const withMove = roll(adjusted);
    expect(wageCapOf(withMove)).toBe(wageCapOf(withoutMove));
    expect(withMove.purchasedWageRoom).toBeUndefined();
    expect(withMove.season).toBe(withoutMove.season);
    expect(withoutMove.budget - withMove.budget).toBeCloseTo(0.5, 1);
  });
});
