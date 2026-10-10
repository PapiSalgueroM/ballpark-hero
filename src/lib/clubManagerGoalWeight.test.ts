import { describe, expect, it } from 'vitest';
import type { Position } from '@/types/game';
import { ASSIST_SHARE, assistWeight, goalWeight } from '@/lib/clubManagerGoalWeight';

/* Round 1229. The two tables as they stood in src/lib/clubManager.ts before the lift, typed out here once
   more ON PURPOSE: scorerWeight (my squad) and oppShotWeight (the opposition in a match I play). The module
   must give the same double as both for every position and every rating a man can carry, or the seeded
   match stream reads another match. */
const ALL: Position[] = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST'];

function scorerWeightAsItWas(pos: Position, rating: number): number {
  const base =
    pos === 'ST' || pos === 'CF' ? 5 :
    pos === 'LW' || pos === 'RW' ? 3.6 :
    pos === 'CAM' ? 3 :
    pos === 'LM' || pos === 'RM' ? 2.2 :
    pos === 'CM' ? 1.6 :
    pos === 'CDM' ? 0.9 :
    pos === 'GK' ? 0.02 : 0.55;
  return base * Math.pow(rating / 70, 2);
}

function oppShotWeightAsItWas(p: { p: Position; r: number }): number {
  const base =
    p.p === 'ST' || p.p === 'CF' ? 5 :
    p.p === 'LW' || p.p === 'RW' ? 3.6 :
    p.p === 'CAM' ? 3 :
    p.p === 'LM' || p.p === 'RM' ? 2.2 :
    p.p === 'CM' ? 1.6 :
    p.p === 'CDM' ? 0.9 :
    p.p === 'GK' ? 0.02 : 0.55;
  return base * Math.pow(p.r / 70, 2);
}

describe('clubManagerGoalWeight', () => {
  it('is the same double as both of the engine tables it replaced, for every position and rating', () => {
    let checked = 0;
    for (const pos of ALL) {
      for (let rating = 40; rating <= 99; rating += 1) {
        const w = goalWeight(pos, rating);
        expect(Object.is(w, scorerWeightAsItWas(pos, rating))).toBe(true);
        expect(Object.is(w, oppShotWeightAsItWas({ p: pos, r: rating }))).toBe(true);
        checked += 1;
      }
    }
    expect(checked).toBe(15 * 60);
  });

  it('keeps the assist expression the engine pays my men by, term for term', () => {
    for (const pos of ALL) {
      for (let rating = 40; rating <= 99; rating += 1) {
        expect(Object.is(assistWeight(pos, rating), scorerWeightAsItWas(pos, rating) * 0.6 + 0.5)).toBe(true);
      }
    }
    expect(ASSIST_SHARE).toBe(0.7);
  });

  it('orders the positions the way football does at one rating', () => {
    const at = (pos: Position): number => goalWeight(pos, 80);
    expect(at('ST')).toBeGreaterThan(at('LW'));
    expect(at('LW')).toBeGreaterThan(at('CAM'));
    expect(at('CAM')).toBeGreaterThan(at('LM'));
    expect(at('LM')).toBeGreaterThan(at('CM'));
    expect(at('CM')).toBeGreaterThan(at('CDM'));
    expect(at('CDM')).toBeGreaterThan(at('CB'));
    expect(at('CB')).toBeGreaterThan(at('GK'));
    expect(at('CF')).toBe(at('ST'));
    expect(at('LB')).toBe(at('CB'));
  });
});
