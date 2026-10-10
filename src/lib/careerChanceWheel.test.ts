import { describe, expect, it, vi } from 'vitest';
import { acknowledgeChanceWheel, rollCareerChance, validChanceWheel, type CareerChanceWheelReceipt } from '@/lib/careerChanceWheel';
describe('saved chance wheel', () => {
  it.each([0, 0.29999, 0.3, 0.99999])('uses one original draw and exact chance boundary %s', roll => {
    const c: { chanceWheel?: CareerChanceWheelReceipt } = {}, rng = vi.fn(() => roll);
    expect(rollCareerChance(c, .3, 'Test', 'Caught', 'Escaped', rng)).toBe(roll < .3);
    expect(rng).toHaveBeenCalledTimes(1); expect(c.chanceWheel).toMatchObject({ roll, chance: .3, result: roll < .3, seen: false });
    expect(validChanceWheel(c.chanceWheel)).toBe(true);
  });
  it('acknowledges once without changing outcome or consuming randomness', () => {
    const c: { chanceWheel?: CareerChanceWheelReceipt } = {}; rollCareerChance(c, .5, 'Test', 'Raise', 'Rejected', () => .25);
    const before = structuredClone(c), random = vi.spyOn(Math, 'random').mockImplementation(() => { throw Error('rerolled'); });
    try { const next = acknowledgeChanceWheel(c); expect(next.chanceWheel).toEqual({ ...before.chanceWheel, seen: true }); expect(c).toEqual(before); expect(acknowledgeChanceWheel(next)).toBe(next); expect(random).not.toHaveBeenCalled(); } finally { random.mockRestore(); }
  });
  it.each([null, {}, { chance: 0 }, { title: 'x', hit: 'y', miss: 'z', chance: .3, roll: .2, result: false, seen: false }, { title: 'x', hit: 'y', miss: 'z', chance: .3, roll: NaN, result: true, seen: false }])('rejects malformed saved receipts %j', receipt => {
    expect(validChanceWheel(receipt)).toBe(false); const c = { chanceWheel: receipt } as { chanceWheel?: CareerChanceWheelReceipt }; expect(acknowledgeChanceWheel(c)).toBe(c);
  });
});
