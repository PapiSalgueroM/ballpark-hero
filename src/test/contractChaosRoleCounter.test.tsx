import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useContractChaos } from '@/hooks/useContractChaos';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { buildDeal, dailySeed, freeSeed, pushOffer, roleCounterOffer, SAVE_KEY, simulateCareer, totalValue } from '@/lib/contractChaos';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(Math, 'random').mockReturnValue(0.12);
  localStorage.clear();
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

it('trades guaranteed Free Play wages for a role that changes minutes and ratings', () => {
  const { result } = renderHook(useContractChaos);
  act(() => result.current.start('free'));
  act(() => result.current.open(0));
  const opening = result.current.deal!;
  const offer = opening.offers[0];
  expect(offer.role).toBe('rotation');
  expect(offer.fa.salary).toBe(2.1);
  const projected = roleCounterOffer(offer)!;
  expect(projected.role).toBe('starter');
  expect(projected.fa.salary).toBe(1.8);
  expect(totalValue(offer) - totalValue(projected)).toBeCloseTo(1.2);
  act(() => {
    result.current.counterRole(0);
    result.current.push(0);
  });
  expect(result.current.deal!.offers[0]).toEqual(projected);
  expect(result.current.deal!.offers.slice(1)).toEqual(opening.offers.slice(1));
  expect(result.current.deal!.offers[0].fa.pushed).toBe(true);
  expect(localStorage.getItem(SAVE_KEY)).toBeNull();
  expect(result.current.talk[0]).toContain('Starter');
  act(() => result.current.counterRole(0));
  expect(result.current.deal!.offers[0]).toEqual(projected);

  const original = simulateCareer(opening, 0);
  act(() => result.current.sign(0));
  const after = result.current.outcomes[0];
  expect(after.seasons[0].role).toBe('starter');
  expect(after.avgMinutes).toBeGreaterThan(original.avgMinutes);
  expect(after.finalOvr).toBeGreaterThan(original.finalOvr);
  expect(after.earned).toBeLessThan(original.earned);
  expect(after.score).toBeGreaterThan(original.score);
  expect(result.current.save.played).toBe(1);
  expect(result.current.save.total).toBe(after.score);
  expect(useGameCompletion).toHaveBeenLastCalledWith('contract-chaos', true, undefined);
});

it('uses the same counter allowance as the wage push and leaves off-table and starting offers alone', () => {
  const { result } = renderHook(useContractChaos);
  act(() => result.current.start('free'));
  act(() => result.current.open(0));
  const deal = buildDeal(freeSeed(0.12));
  const expected = pushOffer(deal, 0).deal;
  act(() => {
    result.current.push(0);
    result.current.counterRole(0);
  });
  expect(result.current.deal).toEqual(expected);
  const base = deal.offers[0];
  expect(roleCounterOffer({ ...base, role: 'starter' })).toBeNull();
  expect(roleCounterOffer({ ...base, fa: { ...base.fa, gone: true } })).toBeNull();
  expect(roleCounterOffer({ ...base, fa: { ...base.fa, salary: 0.1 } })).toBeNull();
});

it('drops the stronger promised role after a sacking while keeping the lower salary', () => {
  const deal = buildDeal(freeSeed(0.326));
  const offer = deal.offers[2];
  expect(offer.seat).toBe('hot');
  expect(offer.role).toBe('rotation');
  const counter = roleCounterOffer(offer)!;
  const offers = deal.offers.map((o, i) => i === 2 ? counter : o);
  const baseline = simulateCareer(deal, 2);
  const changed = simulateCareer({ ...deal, offers }, 2);
  expect(changed.seasons[0].role).toBe('starter');
  expect(changed.seasons[1].lines).toContain('The manager who signed you got sacked. The new one picks his own team.');
  expect(changed.seasons[1].role).toBe(baseline.seasons[1].role);
  expect(changed.seasons[1].role).toBe('rotation');
  expect(changed.seasons[1].earned).toBeLessThan(baseline.seasons[1].earned);
});

it('keeps the same Daily offers, result and receipt without the role counter', () => {
  const { result } = renderHook(useContractChaos);
  const date = result.current.today;
  const original = buildDeal(dailySeed(date));
  const outcome = simulateCareer(original, 0);
  act(() => result.current.start('daily'));
  act(() => result.current.open(0));
  act(() => result.current.counterRole(0));
  expect(result.current.deal).toEqual(original);
  act(() => result.current.sign(0));
  expect(result.current.outcomes[0]).toEqual(outcome);
  expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).daily).toEqual({
    date, score: outcome.score, club: original.offers[0].fa.label, verdict: outcome.verdict,
  });
});
