import { afterEach, describe, expect, it, vi } from 'vitest';
import { buyWageRoom, startCareer, startNextSeason, wageCapOf, type CareerState } from '@/lib/clubManager';
import { closeLedger, projectFinances } from '@/lib/clubManagerFinances';

afterEach(() => vi.restoreAllMocks());

describe('Club Manager wage allocation', () => {
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
