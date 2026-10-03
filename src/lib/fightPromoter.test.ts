import { describe, it, expect } from 'vitest';
import {
  newPromoter, handOver, canHandOver, handOverPrice, promoterVerdict, wentBroke, closeBroke,
  sanitizePromoter, HANDOVER_MIN_SHOWS, BROKE_PENALTY, type PromoterState,
} from '@/lib/fightPromoter';

/* Round 955: the promotion's deliberate ending. The show history is filled in
   directly here because these tests are about the ending, not the shows; the
   harness plays real shows. */

function withShows(n: number, money = 3, reputation = 50): PromoterState {
  const st = newPromoter('Test Promotions', 'vt-promo');
  return {
    ...st,
    money,
    reputation,
    show: n + 1,
    history: Array.from({ length: n }, (_, i) => ({
      show: i + 1, venue: 'The Leisure Centre', attendance: 900, profit: 0.05, best: 'A vs B',
    })),
  };
}

describe('handing over', () => {
  it('is refused before the minimum number of shows', () => {
    for (let n = 0; n < HANDOVER_MIN_SHOWS; n += 1) {
      expect(canHandOver(withShows(n))).toBe(false);
      expect(handOver(withShows(n))).toBeNull();
    }
  });

  it('closes the promotion with the price in the bank from the minimum on', () => {
    const st = withShows(HANDOVER_MIN_SHOWS);
    const price = handOverPrice(st);
    const h = handOver(st)!;
    expect(h.closed).toBe(true);
    expect(h.exit).toBe('handed');
    expect(h.handedFor).toBe(price);
    expect(h.money).toBeCloseTo(st.money + price, 6);
    expect(wentBroke(h)).toBe(false);
    expect(handOver(h)).toBeNull();
  });

  it('pays more for a bigger name', () => {
    expect(handOverPrice({ reputation: 80 })).toBeGreaterThan(handOverPrice({ reputation: 30 }));
  });

  it('matches the rules example: a name of 50 sells for about 1.161m', () => {
    expect(handOverPrice({ reputation: 50 })).toBeCloseTo(1.161, 3);
  });

  it('scores a hand over above the same promotion going under', () => {
    const st = withShows(14);
    const handed = promoterVerdict(handOver(st)!);
    const broke = promoterVerdict(closeBroke(st));
    expect(handed.score).toBeGreaterThan(broke.score);
    expect(broke.bullets[0]).toContain(String(BROKE_PENALTY));
    expect(handed.bullets[0]).toContain('Handed over');
  });
});

describe('old saves and bad blocks', () => {
  it('reads an old closed save with no exit as one that went under', () => {
    const st = { ...withShows(12), closed: true };
    expect(wentBroke(st)).toBe(true);
    expect(promoterVerdict(st).bullets[0]).toContain('money ran out');
  });

  it('drops only the block that does not read right', () => {
    const st = withShows(12);
    const raw = { ...st, exit: 'retired', handedFor: Number.NaN } as unknown as PromoterState;
    const clean = sanitizePromoter(raw);
    expect(clean.exit).toBeUndefined();
    expect(clean.handedFor).toBeUndefined();
    expect(clean.history).toEqual(st.history);
    expect(sanitizePromoter({ ...st, exit: 'handed', handedFor: 1.2 }).exit).toBe('handed');
  });
});
