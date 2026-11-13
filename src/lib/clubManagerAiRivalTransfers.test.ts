import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildMarket, ensureEraRosters, loadCareer, makeOffer, recordAiDeals, SAVE_KEY, saveCareer,
  startCareer, startNegotiation, walkAway, worldRosterFor, type CareerState,
} from '@/lib/clubManager';
import { readWorldRoster } from '@/lib/clubManagerWorldRoster';

function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let v = seed;
    v = Math.imul(v ^ v >>> 15, v | 1);
    v ^= v + Math.imul(v ^ v >>> 7, v | 61);
    return ((v ^ v >>> 14) >>> 0) / 4294967296;
  };
}

function withRandom<T>(random: () => number, action: () => T): T {
  const mock = vi.spyOn(Math, 'random').mockImplementation(random);
  try { return action(); } finally { mock.mockRestore(); }
}

function everton(seed: number) {
  return withRandom(seeded(seed), () => startCareer('Everton', 'now'));
}

function talks(name = 'Lamine Yamal') {
  const career = everton(1);
  const player = buildMarket(career).find(p => p.name === name)!;
  return withRandom(() => 0.6, () => startNegotiation({ ...career, budget: 1000 }, player))!;
}

function withBid(career: CareerState, rivalBidder: string, rivalOffer: number): CareerState {
  return { ...career, negotiation: { ...career.negotiation!, rivalBidder, rivalOffer } };
}

function counter(career: CareerState, amount: number, buyerRoll: number) {
  const rolls = [0.6, 0.01, buyerRoll, 0.5];
  const random = vi.fn(() => rolls.shift() ?? 0.6);
  const result = withRandom(random, () => makeOffer(career, amount))!;
  expect(random).toHaveBeenCalledTimes(4);
  return result;
}

function transfer(career: CareerState, name = 'Lamine Yamal') {
  return career.transferLog?.find(line => line.name === name);
}

beforeAll(() => ensureEraRosters('now'));
beforeEach(() => localStorage.clear());

describe('Club Manager AI transfer prices', () => {
  it('keeps Yamal in Barcelona when its primary rival can only buy below asking price', () => {
    const career = everton(3);
    expect(transfer(career)).toBeUndefined();
    expect(career.aiHeadlines.some(line => line.includes('Lamine Yamal'))).toBe(false);
    expect(career.goneNames).not.toContain('Lamine Yamal');
    expect(worldRosterFor(career, 'Barcelona').some(p => p.n === 'Lamine Yamal')).toBe(true);
    expect(transfer(career, 'Declan Rice')).toMatchObject({ from: 'Arsenal', to: 'Barcelona', fee: 103 });
  });

  it('allows an affordable primary-rival deal at or above the listed price', () => {
    const career = everton(7);
    expect(transfer(career, 'Moisés Caicedo')).toMatchObject({ from: 'Chelsea', to: 'Arsenal', fee: 101 });
    expect(worldRosterFor(career, 'Arsenal').some(p => p.n === 'Moisés Caicedo')).toBe(true);

    const pending = counter(talks('Moisés Caicedo'), 90, 0);
    expect(pending.negotiation).toMatchObject({ rivalBidder: 'Arsenal', rivalOffer: 99.9 });
    const closed = withRandom(() => 0.1, () => walkAway(pending));
    expect(transfer(closed, 'Moisés Caicedo')).toMatchObject({ from: 'Chelsea', to: 'Arsenal', fee: 99.9 });
  });

  it('does not advertise a primary rival below asking price or an unaffordable other club', () => {
    const career = talks();
    expect(career.negotiation?.player.price).toBe(202.5);
    const belowAsk = counter(career, 170, 0.075);
    expect(belowAsk.negotiation).toMatchObject({ rivalBidder: null, rivalOffer: null });
    const aboveBudget = counter(career, 170, 0);
    expect(aboveBudget.negotiation).toMatchObject({ rivalBidder: null, rivalOffer: null });
    const affordable = counter(talks('Moisés Caicedo'), 90, 0.01);
    expect(affordable.negotiation).toMatchObject({ rivalBidder: 'Manchester City', rivalOffer: 99.9 });
  });

  it('withdraws an otherwise valid bid when the next raise would exceed the buyer budget', () => {
    const career = withBid(talks(), 'Arsenal', 150);
    const raised = withRandom(() => 0.6, () => makeOffer(career, 170));
    expect(raised?.negotiation).toMatchObject({ status: 'open', rivalBidder: null, rivalOffer: null });
    expect(transfer(raised!)).toBeUndefined();

    const valid = withBid(talks('Moisés Caicedo'), 'Arsenal', 90);
    const validRaise = withRandom(() => 0.6, () => makeOffer(valid, 91));
    expect(validRaise?.negotiation).toMatchObject({ status: 'open', rivalBidder: 'Arsenal', rivalOffer: 99.4 });
  });

  it('lets the manager continue talks after restoring an invalid active rival bid', () => {
    const held = withBid(talks(), 'Real Madrid', 200.8);
    expect(saveCareer(held)).toBe(true);
    const raw = localStorage.getItem(SAVE_KEY);
    const loaded = loadCareer()!;
    expect(localStorage.getItem(SAVE_KEY)).toBe(raw);
    expect(loaded.negotiation).toEqual(held.negotiation);
    const next = withRandom(() => 0.1, () => makeOffer(loaded, 177.8))!;
    expect(next.negotiation).toMatchObject({ status: 'open', myOffer: 177.8, rivalBidder: null, rivalOffer: null });
    expect(transfer(next)).toBeUndefined();
    expect(saveCareer(next)).toBe(true);
    expect(loadCareer()?.negotiation).toEqual(next.negotiation);
  });

  it('does not close an invalid stored bid when the manager walks away', () => {
    const career = withBid(talks(), 'Arsenal', 188.7);
    const away = withRandom(() => 0.1, () => walkAway(career));
    expect(away.negotiation).toBeNull();
    expect(transfer(away)).toBeUndefined();
    expect(away.worldRoster).toEqual(career.worldRoster);
    expect(away.goneNames).toEqual(career.goneNames);
  });

  it('preserves completed deals recorded before the current pricing rule', () => {
    const career = everton(1);
    const mp = buildMarket(career).find(p => p.name === 'Lamine Yamal')!;
    const row = { name: mp.name, from: mp.club, to: 'Real Madrid', fee: 194, season: 1, week: 0 };
    const old = recordAiDeals({ ...career, goneNames: [...career.goneNames, mp.name],
      transferLog: [...(career.transferLog ?? []), row] }, [{ mp, to: row.to, fee: row.fee }]);
    expect(saveCareer(old)).toBe(true);
    const raw = localStorage.getItem(SAVE_KEY);
    const loaded = loadCareer()!;
    expect(localStorage.getItem(SAVE_KEY)).toBe(raw);
    expect(transfer(loaded)).toEqual(row);
    expect(readWorldRoster(loaded)).toEqual(readWorldRoster(old));
    expect(worldRosterFor(loaded, 'Real Madrid').some(p => p.n === mp.name)).toBe(true);
  });
});
