/**
 * Round 1104: the rookie deal for a draft slot (src/lib/usCareerRookieDeal.ts)
 * and the table behind it (src/data/nflRookieScale.ts).
 *
 * The harness scripts/simNflTruth.mjs holds the table's shape and the engine's
 * use of it at scale; this file pins the arithmetic on named slots, so a
 * change to the rule shows up as a named number and not as a moved digest.
 */
import { describe, it, expect } from 'vitest';
import { NFL_ROOKIE_SCALE } from '@/data/nflRookieScale';
import { rookieDeal, nflSlot, NFL_PICKS_A_ROUND, NFL_ROUNDS } from '@/lib/usCareerRookieDeal';
import { nflEraById } from '@/lib/nflMyCareer';

const pay = (era: string, pick: number) => rookieDeal('nfl', era, pick)!.salary;

describe('Round 1104: the NFL rookie deal', () => {
  it('pays round one off the slot row: the total over its years, to 0.1M', () => {
    for (const r of NFL_ROOKIE_SCALE.now.firstRound) {
      expect(pay('now', r.pick), `pick ${r.pick}`).toBe(Math.round(r.total / r.years / 100_000) / 10);
    }
    expect(pay('now', 1)).toBe(14.3);
    expect(pay('now', 32)).toBe(4.2);
  });

  it('pays later rounds by place in the round, from the real round first pick to its last', () => {
    const rounds = NFL_ROOKIE_SCALE.now.laterRounds;
    for (const r of rounds) {
      const first = (r.round - 1) * NFL_PICKS_A_ROUND + 1;
      const last = r.round * NFL_PICKS_A_ROUND;
      expect(pay('now', first), `round ${r.round} first`).toBe(Math.round(r.firstTotal / r.years / 100_000) / 10);
      expect(pay('now', last), `round ${r.round} last`).toBe(Math.round(r.lastTotal / r.years / 100_000) / 10);
    }
    expect(pay('now', 33)).toBe(3.3);
    expect(pay('now', 64)).toBe(2);
    expect(pay('now', 97)).toBe(1.4);
    expect(pay('now', 224)).toBe(1.1);
  });

  /* The fix pass of 2026-10-08. At the game's 0.1M rounding the case above cannot see an off by one in the
     line (dividing a round's place by 32 instead of 31 leaves every end pick on the same tenth), so the line
     is held to the DOLLAR at both ends of every round, and falling at every pick between. */
  it('runs the later round line from the first slot to the last slot to the dollar', () => {
    const table = NFL_ROOKIE_SCALE.now;
    for (const r of table.laterRounds) {
      const first = (r.round - 1) * NFL_PICKS_A_ROUND + 1;
      const last = r.round * NFL_PICKS_A_ROUND;
      expect(nflSlot(table, first).perYear, `round ${r.round} first`).toBeCloseTo(r.firstTotal / r.years, 6);
      expect(nflSlot(table, last).perYear, `round ${r.round} last`).toBeCloseTo(r.lastTotal / r.years, 6);
      for (let p = first + 1; p <= last; p += 1) {
        expect(nflSlot(table, p).perYear, `pick ${p} under pick ${p - 1}`).toBeLessThan(nflSlot(table, p - 1).perYear);
      }
    }
  });

  /* Where each real round ends, two sourced in the table's header (NFL.com's draft order and Pro Football
     Rumors' results). Pinned here because the first cut had round five ending at 180: a compensatory pick
     makes it 181, and the table's one source for the totals labels that pick wrongly. */
  it('holds the real round ends: 33 to 64, 65 to 100, 101 to 140, 141 to 181, 182 to 216, 217 to 257', () => {
    expect(NFL_ROOKIE_SCALE.now.laterRounds.map(r => [r.round, r.firstPick, r.lastPick])).toEqual([
      [2, 33, 64], [3, 65, 100], [4, 101, 140], [5, 141, 181], [6, 182, 216], [7, 217, 257],
    ]);
  });

  it('never pays a later pick more than an earlier one, in either era, down to the minimum', () => {
    for (const era of ['now', 'y2005']) {
      let prev = Infinity;
      for (let pick = 1; pick <= NFL_PICKS_A_ROUND * NFL_ROUNDS; pick += 1) {
        const s = pay(era, pick);
        expect(s, `${era} pick ${pick}`).toBeLessThanOrEqual(prev);
        prev = s;
      }
      expect(pay(era, 0), `${era} undrafted`).toBeLessThanOrEqual(prev);
    }
  });

  it('pays the undrafted, and a pick past the seventh round, the rookie minimum', () => {
    expect(pay('now', 0)).toBe(0.9);
    expect(pay('now', -1)).toBe(0.9);
    expect(pay('now', 225)).toBe(0.9);
    expect(rookieDeal('nfl', 'now', 0)!.held).toBe(false);
  });

  it('signs every NFL rookie for four seasons and says which slots are held', () => {
    expect(rookieDeal('nfl', 'now', 1)).toEqual({ salary: 14.3, years: 4, held: false });
    expect(rookieDeal('nfl', 'now', 40)!.held).toBe(false);
    expect(rookieDeal('nfl', 'now', 100)!.held).toBe(true);
    expect(rookieDeal('nfl', 'now', 200)!.held).toBe(true);
    expect(rookieDeal('nfl', 'y2005', 1)!.held).toBe(true);
  });

  /* The closing pass of 2026-10-08. Which later round ends are two sourced is the table's own claim, so it is
     pinned: lifting a hold, or adding one, has to touch this line as well as the header that names the
     sources. Seven ends are still on one source. Pick 140 left the list that day, when a report of the
     signed deal was found (5,169,036 against the estimate's 5,182,896); the signed figure is the one stored,
     and it moves one slot: the 19th pick of round four is paid 1.3M a year, where the estimate paid 1.4M. */
  it('names the seven later round ends that are still one sourced, and pays pick 140 its signed figure', () => {
    const table = NFL_ROOKIE_SCALE.now;
    const held = table.laterRounds.flatMap(r => [
      ...(r.held === 'first' || r.held === 'both' ? [r.firstPick] : []),
      ...(r.held === 'last' || r.held === 'both' ? [r.lastPick] : []),
    ]);
    expect(held).toEqual([100, 101, 141, 181, 182, 216, 217]);
    expect(table.laterRounds.find(r => r.round === 4)!.lastTotal).toBe(5_169_036);
    expect(pay('now', 114)).toBe(1.4);
    expect(pay('now', 115)).toBe(1.3);
  });

  it('pays a held era the named era slot times its scale, and the scale is the 2005 era money scale', () => {
    const held = NFL_ROOKIE_SCALE.y2005;
    expect('heldAs' in held).toBe(true);
    if (!('heldAs' in held)) return;
    expect(held.heldAs.scale).toBe(nflEraById('y2005').moneyScale);
    expect(pay('y2005', 1)).toBe(4.6);
    expect(pay('y2005', 32)).toBe(1.3);
    expect(pay('y2005', 0)).toBe(0.3);
    for (const pick of [1, 8, 16, 24, 32, 33, 64, 100, 224, 0]) {
      const now = pick > 0 && pick <= 32
        ? NFL_ROOKIE_SCALE.now.firstRound[pick - 1].total / 4
        : null;
      if (now !== null) expect(pay('y2005', pick), `pick ${pick}`).toBe(Math.max(0.1, Math.round(now * held.heldAs.scale / 100_000) / 10));
    }
  });

  it('reads an era it does not know as today, and answers null for a sport with no table', () => {
    expect(rookieDeal('nfl', 'y1998', 1)).toEqual(rookieDeal('nfl', 'now', 1));
    expect(rookieDeal('nba', 'now', 1)).toBeNull();
    expect(rookieDeal('mlb', 'now', 1)).toBeNull();
    expect(rookieDeal('nhl', 'now', 1)).toBeNull();
  });
});
