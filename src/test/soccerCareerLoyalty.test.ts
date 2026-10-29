import { describe, expect, it } from 'vitest';
import {
  quoteLoyalty, chooseLoyalty, canAcceptLoyaltyOffer, loyaltySigningWage,
  commitLoyaltySigning, settleLoyaltySeason, closeLoyaltyForEmployer,
  closeLoyaltyForRetirement, closeLoyaltyForExpiry, loyaltyForfeitEuros, readLoyalty, repairLoyalty,
} from '@/lib/soccerCareerLoyalty';

const club = { name: 'Test Club', country: 'Test Country', league: 'Test League', color: '#123456', tier: 3 };
const offer = { club, wage: 10000, contractYears: 2, transferFee: 0 };
const row = (year: number, extra = {}) => ({ year, club: club.name, type: 'playing', ...extra });
const career = () => ({
  playerName: 'Generated Test Player', agentId: 'test', phase: 'contract_offer', retired: false,
  currentClub: 'Previous Club', contractYearsLeft: 0, weeklyWage: 8000, netWorth: 2, totalEarnings: 3,
  seasons: [row(2025)], events: [] as string[], pendingOffers: [structuredClone(offer)], transferSituation: null,
});
const sign = () => {
  const before = chooseLoyalty(career(), offer, 10000, 'loyalty');
  const next = { ...before, currentClub: club.name, contractYearsLeft: 2, weeklyWage: 9000, phase: 'playing', pendingOffers: [] };
  return commitLoyaltySigning(before, next, offer, 10000);
};
const append = <T extends ReturnType<typeof sign>>(state: T, year: number, extra = {}) => {
  const played = row(year, extra);
  const next = { ...state, seasons: [...state.seasons, played], contractYearsLeft: Math.max(0, state.contractYearsLeft - 1) };
  return { next, played };
};

describe('loyalty contract choices', () => {
  it('quotes a salary sacrifice and a larger completed-term total without creating state', () => {
    const state = career(), held = structuredClone(state);
    const quote = quoteLoyalty(state, offer, 10000)!;
    expect(quote).toMatchObject({ baseWeeklyWage: 10000, weeklyWage: 9000, bonusEuros: 156000, years: 2, firstYear: 2026, finalYear: 2027 });
    expect(quote.weeklyWage * 52 * 2 + quote.bonusEuros).toBe(1092000);
    expect(loyaltySigningWage(chooseLoyalty(state, offer, 10000, 'loyalty'), offer, 10000)).toBe(9000);
    expect(10000 * 52 * 2).toBe(1040000);
    expect(state).toEqual(held);
  });
  it('rounds the reduced agent-adjusted wage and fixed payout independently', () => {
    expect(quoteLoyalty(career(), offer, 12345)).toMatchObject({ weeklyWage: 11111, bonusEuros: 192582 });
  });
  it('keeps cash and absent legacy ledgers neutral', () => {
    const state = career();
    expect(chooseLoyalty(state, offer, 10000, 'cash')).toBe(state);
    expect(loyaltySigningWage(state, offer, 10000)).toBe(10000);
    expect(repairLoyalty(state)).toBe(state);
    expect(readLoyalty(state)).toBeNull();
  });
  it('clears an unaccepted loyalty quote when cash is chosen without creating a deal', () => {
    const state = career();
    const staged = chooseLoyalty(state, offer, 10000, 'loyalty');
    const cash = chooseLoyalty(staged, offer, 10000, 'cash');
    expect(cash).toEqual(state);
    expect(cash).not.toHaveProperty('loyaltyContracts');
    expect(readLoyalty(staged)?.pending?.bonusEuros).toBe(156000);
  });
  it('rejects stale terms, a changed agent and fabricated offers before signing', () => {
    const staged = chooseLoyalty(career(), offer, 10000, 'loyalty');
    expect(canAcceptLoyaltyOffer(staged, offer, 10000)).toBe(true);
    const revised = { ...offer, wage: 12000 };
    expect(canAcceptLoyaltyOffer({ ...staged, pendingOffers: [revised] }, offer, 10000)).toBe(false);
    expect(canAcceptLoyaltyOffer({ ...staged, pendingOffers: [revised] }, revised, 12000)).toBe(false);
    expect(canAcceptLoyaltyOffer({ ...staged, agentId: 'changed' }, offer, 10000)).toBe(false);
    expect(quoteLoyalty(career(), { ...offer, contractYears: 5 }, 10000)).toBeNull();
  });
  it('rejects one-year and loan offers and wages with no actual sacrifice', () => {
    for (const candidate of [{ ...offer, contractYears: 1 }, { ...offer, isLoan: true }]) {
      const state = { ...career(), pendingOffers: [candidate] };
      expect(quoteLoyalty(state, candidate, 10000)).toBeNull();
    }
    expect(quoteLoyalty(career(), offer, 1)).toBeNull();
    expect(quoteLoyalty(career(), offer, 6)).toBeNull();
  });
  it('records only an accepted quoted deal and stops repeated old sign taps', () => {
    const state = sign();
    expect(readLoyalty(state)?.deals[0]).toMatchObject({ status: 'active', completed: 0, bonusEuros: 156000, weeklyWage: 9000 });
    expect(state.weeklyWage).toBe(9000);
    expect(state.netWorth).toBe(2);
    expect(canAcceptLoyaltyOffer(state, offer, 10000)).toBe(false);
  });
});

describe('loyalty contract settlement', () => {
  it('pays exactly once through actual appended seasons and survives a reload', () => {
    const first = append(sign(), 2026);
    const afterOne = settleLoyaltySeason(first.next, first.played);
    expect(afterOne.netWorth).toBe(2);
    expect(readLoyalty(afterOne)?.deals[0].completed).toBe(1);
    const second = append(afterOne, 2027);
    const paid = settleLoyaltySeason(second.next, second.played);
    expect(paid.netWorth).toBe(2.156);
    expect(paid.totalEarnings).toBe(3.156);
    const repeated = settleLoyaltySeason(paid, second.played);
    expect(repeated.netWorth).toBe(2.156);
    expect(repeated.totalEarnings).toBe(3.156);
    expect(repeated).toBe(paid);
    expect(readLoyalty(paid)?.deals[0]).toMatchObject({ status: 'paid', completed: 2, paidEuros: 156000 });
    const loaded = structuredClone(paid);
    expect(settleLoyaltySeason(loaded, loaded.seasons[loaded.seasons.length - 1])).toBe(loaded);
  });
  it('forfeits an early permanent move without paying or mutating the original', () => {
    const state = sign(), held = structuredClone(state);
    expect(loyaltyForfeitEuros(state, 'Another Club')).toBe(156000);
    expect(loyaltyForfeitEuros(state, club.name)).toBe(0);
    const moved = closeLoyaltyForEmployer(state, 'Another Club');
    expect(readLoyalty(moved)?.deals[0]).toMatchObject({ status: 'forfeited', reason: 'move', paidEuros: 0 });
    expect(moved.netWorth).toBe(2);
    expect(state).toEqual(held);
    expect(closeLoyaltyForEmployer(moved, 'Another Club')).toBe(moved);
  });
  it('keeps parent-club rights on loan but forfeits a permanent loan buy', () => {
    const first = append(sign(), 2026, { club: 'Loan Club', onLoanFrom: club.name });
    const loaned = settleLoyaltySeason({ ...first.next, currentClub: 'Loan Club' }, first.played);
    expect(readLoyalty(loaned)?.deals[0]).toMatchObject({ status: 'active', completed: 1 });
    const bought = closeLoyaltyForEmployer(loaned, 'Loan Club');
    expect(readLoyalty(bought)?.deals[0].status).toBe('forfeited');
  });
  it('rejects recorded non-service and foreign rows despite matching live employer state', () => {
    for (const name of ['BANNED', 'BANNED (PED)', 'PRISON', 'CONVICTED', 'Foreign Club']) {
      const first = append(sign(), 2026, { club: name });
      const actual = settleLoyaltySeason({ ...first.next, loan: { parentClub: club.name } }, first.played);
      expect(readLoyalty(actual)?.deals[0]).toMatchObject({ status: 'forfeited', reason: 'gap', completed: 0, lastYear: 2025, finalYear: 2027, paidEuros: 0 });
      expect(actual.netWorth).toBe(2);
      expect(actual.totalEarnings).toBe(3);
      const later = append(actual, 2027);
      expect(settleLoyaltySeason(later.next, later.played)).toBe(later.next);
    }
  });
  it('counts a serious injury year without requiring appearances', () => {
    const first = append(sign(), 2026, { apps: 0, injurySevere: true });
    expect(readLoyalty(settleLoyaltySeason(first.next, first.played))?.deals[0].completed).toBe(1);
  });
  it('closes early expiry and retirement without inventing completed service', () => {
    const first = append(sign(), 2026);
    const expired = settleLoyaltySeason({ ...first.next, contractYearsLeft: 0 }, first.played);
    expect(readLoyalty(expired)?.deals[0]).toMatchObject({ status: 'forfeited', reason: 'expiry' });
    const retired = closeLoyaltyForRetirement(sign());
    expect(readLoyalty(retired)?.deals[0]).toMatchObject({ status: 'forfeited', reason: 'retired' });
    expect(retired.netWorth).toBe(2);
  });
  it('closes a recorded club release even before the old counter reaches zero', () => {
    const released = closeLoyaltyForExpiry({ ...sign(), transferSituation: { type: 'frozen_out', mode: 'released', offers: [] } });
    expect(readLoyalty(released)?.deals[0]).toMatchObject({ status: 'forfeited', reason: 'expiry', paidEuros: 0 });
  });
  it('does not count an unrelated copy or fill a missing contract year', () => {
    const state = sign();
    expect(settleLoyaltySeason(state, row(2026))).toBe(state);
    const gap = append(state, 2027);
    expect(readLoyalty(settleLoyaltySeason(gap.next, gap.played))?.deals[0]).toMatchObject({ status: 'forfeited', reason: 'gap' });
  });
  it('keeps the original deadline on a same-club cash renewal', () => {
    const active = sign();
    const nextOffer = { ...offer, contractYears: 3 };
    const before = { ...active, phase: 'transfer_window', transferSituation: { type: 'contract_expiry', offers: [nextOffer] } };
    const renewed = commitLoyaltySigning(before, { ...before, contractYearsLeft: 3 }, nextOffer, 12000);
    expect(readLoyalty(renewed)?.deals[0]).toMatchObject({ status: 'active', finalYear: 2027, bonusEuros: 156000 });
  });
  it('rejects malformed optional data and drops only that field during repair', () => {
    for (const bad of [null, 7, [], { v: 1, deals: [{}] }, { v: 1, deals: [], pending: {} }]) {
      const state = { ...career(), loyaltyContracts: bad };
      expect(readLoyalty(state)).toBeNull();
      expect(canAcceptLoyaltyOffer(state, offer, 10000)).toBe(true);
      expect(loyaltySigningWage(state, offer, 10000)).toBe(10000);
      const fixed = repairLoyalty(state);
      expect('loyaltyContracts' in fixed).toBe(false);
      expect(fixed).toEqual(career());
      expect(state.loyaltyContracts).toBe(bad);
    }
  });
});
