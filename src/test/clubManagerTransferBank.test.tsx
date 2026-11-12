import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, within } from '@testing-library/react';
import { OverviewIntro } from '@/components/club-manager/ClubManagerDeferredViews';
import {
  finishSeason, loadCareer, saveCareer, startCareer, startNextSeason, type CareerState,
} from '@/lib/clubManager';

function withRandom<T>(run: () => T, fixed?: number): T {
  let seed = 31337;
  const random = vi.spyOn(Math, 'random').mockImplementation(() => {
    if (fixed !== undefined) return fixed;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  });
  try { return run(); } finally { random.mockRestore(); }
}

function closedCareer() {
  return withRandom(() => {
    const career = startCareer('Arsenal');
    return finishSeason({ ...career, week: career.calendar.length }).state;
  });
}

function roll(career: CareerState, budget: number, club?: string, fixed?: number) {
  return withRandom(() => startNextSeason({ ...structuredClone(career), budget }, club), fixed);
}

const cents = (n: number) => Math.round(n * 100) / 100;

beforeEach(() => localStorage.clear());

describe('Club Manager same-club summer bank', () => {
  it('retains £1bn and adds no board money above twice the usual allocation', () => {
    const closed = closedCareer();
    const empty = roll(closed, 0);
    const usual = empty.summerBudget!.allocation;
    const rich = roll(closed, 1000);
    expect(rich.budget).toBe(1000);
    expect(rich.summerBudget).toEqual({
      club: 'Arsenal', unspent: 1000, usualAllocation: usual, allocation: 0,
      carried: 1000, adjustments: 0, opening: 1000,
    });
    expect(rich.wageCap).toBe(empty.wageCap);
    expect(saveCareer(rich)).toBe(true);
    expect(loadCareer()?.summerBudget).toEqual(rich.summerBudget);
    expect(loadCareer()?.budget).toBe(1000);
  });

  it('preserves cents and tapers only the grant at the two allocation boundaries', () => {
    const closed = closedCareer();
    const usual = roll(closed, 0).summerBudget!.allocation;
    for (const [balance, grant, opening] of [
      [100.04, usual, 100.04 + usual],
      [0, usual, usual],
      [usual - 0.01, usual, 2 * usual - 0.01],
      [usual, usual, 2 * usual],
      [usual + 0.01, usual - 0.01, 2 * usual],
      [2 * usual - 0.01, 0.01, 2 * usual],
      [2 * usual, 0, 2 * usual],
      [2 * usual + 0.01, 0, 2 * usual + 0.01],
    ]) {
      const next = roll(closed, cents(balance));
      expect(next.budget).toBe(cents(opening));
      expect(next.summerBudget).toMatchObject({
        unspent: cents(balance), carried: cents(balance), allocation: cents(grant), usualAllocation: usual,
      });
    }
  });

  it('keeps the empty balance fallback, legacy cap and destination budget', () => {
    const closed = closedCareer();
    const empty = roll(closed, 0);
    for (const bad of [-20, NaN, Infinity]) {
      const repaired = roll(closed, bad);
      expect(repaired.budget).toBe(empty.budget);
      expect(repaired.summerBudget?.carried).toBe(0);
    }

    const legacy = roll({ ...closed, matchRules: 'base' }, 1000);
    expect(legacy.budget).toBe(legacy.summerBudget!.allocation * 2);
    expect(legacy.summerBudget?.carried).toBe(legacy.summerBudget?.allocation);
    expect(legacy.summerBudget).not.toHaveProperty('usualAllocation');

    const leaving = { ...closed, summerBudget: empty.summerBudget };
    const richMove = roll(leaving, 1000, 'Chelsea');
    const emptyMove = roll(leaving, 0, 'Chelsea');
    expect(richMove.clubName).toBe('Chelsea');
    expect(richMove.budget).toBe(emptyMove.budget);
    expect(richMove.wageCap).toBe(emptyMove.wageCap);
    expect(richMove.summerBudget).toBeUndefined();
  });

  it('keeps the loan option, add-on and sponsor settlement order and earned cents', () => {
    const closed = closedCareer();
    const player = closed.squad.find(p => p.rating >= 80)!;
    expect(player).toBeDefined();
    const withSettlements: CareerState = {
      ...closed,
      squad: closed.squad.filter(p => p.id !== player.id),
      loanedOut: [{ player, club: 'Chelsea', fee: 1, season: closed.season, optionFee: 3.6 }],
      pendingAddOns: [{ name: 'Fixture add-on', to: 'Chelsea', amount: 4.7 }],
      sponsor: { brand: 'Fixture Sponsor', shape: 'safe', perSeason: 12.53, bonus: 0, bonusFor: null, yearsLeft: 2, paid: 12.53 },
    };
    const rich = roll(withSettlements, 1000.04, undefined, 0.2);
    expect(rich.budget).toBe(1011.47);
    expect(rich.summerBudget).toMatchObject({ carried: 1000.04, allocation: 0, adjustments: 11.43, opening: 1011.47 });

    const due = { ...withSettlements, pendingAddOns: [{ name: 'Fixture add-on', to: 'Chelsea', amount: 10000 }] };
    const low = roll(due, 0.04, undefined, 0.2);
    expect(low.budget).toBe(17.53);
    expect(low.sponsor?.paid).toBe(25.06);
  });
});

describe('Club Manager summer receipt', () => {
  it('labels the actual top-up and keeps previous capped receipts truthful', () => {
    const other = { retired: null, freeRetired: null, freeLeft: null, deals: null, transfer: null, match: null, windowAction: null, seasonAction: null };
    const previous = { club: 'Arsenal', unspent: 1000, allocation: 165, carried: 165, adjustments: 0, opening: 330, format: (n: number) => `£${n}m` };
    const view = render(<OverviewIntro {...other} summerBudget={previous} />);
    const read = within(view.container);
    expect(read.getByText('Above carryover cap').nextElementSibling?.textContent).toBe('£835m');
    expect(read.queryByText('Board top-up')).toBeNull();

    view.rerender(<OverviewIntro {...other} summerBudget={{
      ...previous, usualAllocation: 165, allocation: 0, carried: 1000, opening: 1000,
    }} />);
    expect(read.getByText('Usual board allocation').nextElementSibling?.textContent).toBe('£165m');
    expect(read.getByText('Board top-up').nextElementSibling?.textContent).toBe('£0m');
    expect(read.getByText('Opening budget').nextElementSibling?.textContent).toBe('£1000m');
    expect(read.queryByText('Above carryover cap')).toBeNull();
  });
});
