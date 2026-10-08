/* Round 1046: rankShift, the pure diff under every sliding table. Hand cases,
   then 200 seeded shuffles of 20 keys checked against an index map this test
   builds for itself. */
import { describe, expect, it } from 'vitest';
import { rankShift } from '@/lib/motion/rankShift';

/* mulberry32: the test's own generator, so a failure names its seed */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(xs: readonly T[], next: () => number): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

describe('rankShift', () => {
  it('says nobody moved when the order is the same', () => {
    expect(rankShift(['a', 'b', 'c'], ['a', 'b', 'c'])).toEqual([
      { club: 'a', from: 0, to: 0 }, { club: 'b', from: 1, to: 1 }, { club: 'c', from: 2, to: 2 },
    ]);
  });
  it('reads one swap', () => {
    expect(rankShift(['a', 'b', 'c'], ['b', 'a', 'c'])).toEqual([
      { club: 'b', from: 1, to: 0 }, { club: 'a', from: 0, to: 1 }, { club: 'c', from: 2, to: 2 },
    ]);
  });
  it('reads a full reversal', () => {
    const before = ['a', 'b', 'c', 'd', 'e'];
    const moves = rankShift(before, before.slice().reverse());
    expect(moves.map(m => m.from)).toEqual([4, 3, 2, 1, 0]);
    expect(moves.map(m => m.to)).toEqual([0, 1, 2, 3, 4]);
  });
  it('gives a key that was not there a from of -1', () => {
    expect(rankShift(['a', 'b'], ['new', 'a', 'b'])).toEqual([
      { club: 'new', from: -1, to: 0 }, { club: 'a', from: 0, to: 1 }, { club: 'b', from: 1, to: 2 },
    ]);
  });
  it('drops a key that left and keeps the rest', () => {
    expect(rankShift(['a', 'b', 'c'], ['c', 'a'])).toEqual([{ club: 'c', from: 2, to: 0 }, { club: 'a', from: 0, to: 1 }]);
  });
  it('does not change what it was handed', () => {
    const before = Object.freeze(['a', 'b', 'c']);
    const after = Object.freeze(['c', 'b', 'a']);
    rankShift(before, after);
    expect(before).toEqual(['a', 'b', 'c']);
    expect(after).toEqual(['c', 'b', 'a']);
  });
  it('agrees with an index map built here over 200 seeded shuffles of 20 keys', () => {
    const keys = Array.from({ length: 20 }, (_, i) => `k${i}`);
    let moved = 0;
    for (let seed = 1; seed <= 200; seed += 1) {
      const next = rng(seed);
      const before = shuffle(keys, next);
      const after = shuffle(keys, next);
      const was: Record<string, number> = {};
      const now: Record<string, number> = {};
      for (let i = 0; i < 20; i += 1) { was[before[i]] = i; now[after[i]] = i; }
      const moves = rankShift(before, after);
      expect(moves).toHaveLength(20);
      const places = new Set<number>();
      for (const m of moves) {
        expect(m.from, `seed ${seed} ${m.club} from`).toBe(was[m.club]);
        expect(m.to, `seed ${seed} ${m.club} to`).toBe(now[m.club]);
        places.add(m.to);
        if (m.from !== m.to) moved += 1;
      }
      expect(places.size).toBe(20);
    }
    /* a loop that shuffled nothing would prove nothing */
    expect(moved).toBeGreaterThan(3000);
  });
});
