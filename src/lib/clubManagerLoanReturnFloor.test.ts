import { describe, expect, it, vi } from 'vitest';
import { breakLoan, doorRefusal, loanIn, loanOutPlayer, marketForScreen, startCareer } from '@/lib/clubManager';
import type { CareerState } from '@/lib/clubManager';

function borrowedKeeper() {
  const seed = vi.spyOn(Math, 'random').mockReturnValue(0.6);
  let start: CareerState;
  try { start = startCareer('Crystal Palace'); }
  finally { seed.mockRestore(); }
  const listing = marketForScreen(start).find(p => p.position === 'GK' && doorRefusal(start, p, 'loan') === null);
  if (!listing) throw new Error('Expected an eligible goalkeeper on the opening market');
  const career = loanIn(start, listing);
  if (!career) throw new Error('Expected a completed loan');
  const keeper = career.squad.find(p => p.name === listing.name);
  if (!keeper?.onLoan || keeper.loanBreakFee === undefined) throw new Error('Expected a loan with a return fee');
  return { career, keeper, fee: keeper.loanBreakFee };
}

function loanOut(career: CareerState, id: string): CareerState {
  const next = loanOutPlayer(career, id);
  if (!next) throw new Error('Expected an allowed departure');
  return next;
}

describe('early returns of Club Manager loanees', () => {
  it('keeps a borrowed goalkeeper when he is the only keeper', () => {
    const { career, keeper } = borrowedKeeper();
    const ownKeepers = career.squad.filter(p => p.position === 'GK' && !p.onLoan);
    expect(ownKeepers.length).toBeGreaterThan(0);
    const before = ownKeepers.reduce((state, p) => loanOut(state, p.id), career);
    expect(before.squad.filter(p => p.position === 'GK')).toEqual([keeper]);
    expect(before.squad.length).toBeGreaterThan(14);
    const bytes = JSON.stringify(before);
    expect(breakLoan(before, keeper.id) === null).toBe(true);
    expect(JSON.stringify(before)).toBe(bytes);
  });

  it('allows a return to exactly 14 and blocks the same return from 14', () => {
    const { career, keeper, fee } = borrowedKeeper();
    const outfield = career.squad.filter(p => p.position !== 'GK');
    const room = career.squad.length - 15;
    expect(room).toBeGreaterThan(0);
    const before = outfield.slice(0, room).reduce((state, p) => loanOut(state, p.id), career);
    expect(before.squad).toHaveLength(15);
    const random = vi.spyOn(Math, 'random');
    try {
      const returned = breakLoan(before, keeper.id);
      expect(returned?.squad).toHaveLength(14);
      expect(returned?.squad.some(p => p.id === keeper.id)).toBe(false);
      expect(returned?.budget).toBe(Math.round((before.budget - fee) * 10) / 10);
      expect(returned?.transferLog?.length).toBe((before.transferLog?.length ?? 0) + 1);
      expect(returned?.week).toBe(before.week);
      expect(random).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
    }

    const atFloor = loanOut(before, outfield[room].id);
    expect(atFloor.squad).toHaveLength(14);
    expect(atFloor.squad.filter(p => p.position === 'GK').length).toBeGreaterThan(1);
    const bytes = JSON.stringify(atFloor);
    expect(breakLoan(atFloor, keeper.id) === null).toBe(true);
    expect(JSON.stringify(atFloor)).toBe(bytes);
  });
});
