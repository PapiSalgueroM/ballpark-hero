/**
 * Round 833: a rating bought in the shop stops at potential, in all four US careers.
 *
 * "Growth that ignores potential headroom" is a regression CLAUDE.md names
 * (Rounds 96 and 116). The shop brought it back: Vision Training (NFL), the
 * Biomechanics Team (NBA, MLB, NHL) and the Home Shooting Room (NHL) raised
 * the rating with Math.min(99, ovr + n). Measured on the shipped code over 300
 * seeded careers a sport, buying the item the first offseason the rating came
 * within one of potential: 5 of 5 NBA buys and the 1 NHL buy that got there
 * left the rating above potential, where it then sat for 20 and 5 later
 * seasons, because the growth step only moves a rating that is under its
 * ceiling. The NFL and MLB careers in that sample never reached their
 * ceilings, but they ran the same line, which the forced cases below prove.
 *
 * scripts/simUsCareerDefects.mjs runs this file against copies of the four
 * engines with the old Math.min(99, ...) put back (control shoppot) and
 * requires it to go red.
 */
import { describe, expect, it } from 'vitest';
import {
  ARCHETYPES, startCareer, simSeason, progress, buyNflItem,
} from '@/lib/nflMyCareer';
import {
  NBA_ARCHETYPES, startNbaCareer, simNbaSeason, nbaProgress, buyNbaItem,
} from '@/lib/nbaMyCareer';
import {
  MLB_ARCHETYPES, startMlbCareer, simMlbSeason, mlbProgress, buyMlbItem,
} from '@/lib/mlbMyCareer';
import {
  NHL_ARCHETYPES, startNhlCareer, simNhlSeason, nhlProgress, buyNhlItem,
} from '@/lib/nhlMyCareer';

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Rated { ovr: number; pot: number; netWorth?: number; purchased?: string[] }
interface ShopCase {
  label: string;
  item: string;
  by: number;
  start: (seed: number) => Rated;
  season: (c: Rated, r: () => number) => void;
  buy: (c: Rated, id: string) => { state: Rated; log: string } | null;
}

const CASES: ShopCase[] = [
  {
    label: 'NFL Vision Training', item: 'vision_training', by: 2,
    start: seed => startCareer('Shop Test', 'WR', ARCHETYPES.WR[seed % ARCHETYPES.WR.length], mulberry32(seed)),
    season: (c, r) => { simSeason(c as never, 80, r); progress(c as never, r); },
    buy: (c, id) => buyNflItem(c as never, id),
  },
  {
    label: 'NBA Biomechanics Team', item: 'biomech_nba', by: 2,
    start: seed => startNbaCareer('Shop Test', 'SG', NBA_ARCHETYPES.SG[seed % NBA_ARCHETYPES.SG.length], mulberry32(seed)),
    season: (c, r) => { simNbaSeason(c as never, 80, r); nbaProgress(c as never, r); },
    buy: (c, id) => buyNbaItem(c as never, id),
  },
  {
    label: 'MLB Biomechanics Team', item: 'biomech_mlb', by: 2,
    start: seed => startMlbCareer('Shop Test', 'SS', MLB_ARCHETYPES.SS[seed % MLB_ARCHETYPES.SS.length], mulberry32(seed)),
    season: (c, r) => { simMlbSeason(c as never, 80, r); mlbProgress(c as never, r); },
    buy: (c, id) => buyMlbItem(c as never, id),
  },
  {
    label: 'NHL Biomechanics Team', item: 'biomech_nhl', by: 2,
    start: seed => startNhlCareer('Shop Test', 'C', NHL_ARCHETYPES.C[seed % NHL_ARCHETYPES.C.length], mulberry32(seed)),
    season: (c, r) => { simNhlSeason(c as never, 80, r); nhlProgress(c as never, r); },
    buy: (c, id) => buyNhlItem(c as never, id),
  },
  {
    label: 'NHL Home Shooting Room', item: 'shooting_room', by: 1,
    start: seed => startNhlCareer('Shop Test', 'C', NHL_ARCHETYPES.C[seed % NHL_ARCHETYPES.C.length], mulberry32(seed)),
    season: (c, r) => { simNhlSeason(c as never, 80, r); nhlProgress(c as never, r); },
    buy: (c, id) => buyNhlItem(c as never, id),
  },
];

function atRating(k: ShopCase, ovr: number, pot: number): Rated {
  const c = k.start(7);
  c.ovr = ovr; c.pot = pot; c.netWorth = 100; c.purchased = [];
  return c;
}

describe('a bought rating raise stops at potential', () => {
  it.each(CASES)('$label: on the ceiling it adds nothing and says so', k => {
    const res = k.buy(atRating(k, 84, 84), k.item);
    expect(res).not.toBeNull();
    expect(res!.state.ovr).toBe(84);
    expect(res!.log).toMatch(/already at your ceiling, so the rating stays at 84\.$/);
  });

  it.each(CASES)('$label: one under the ceiling it fills the gap and no more', k => {
    const res = k.buy(atRating(k, 83, 84), k.item);
    expect(res!.state.ovr).toBe(84);
    expect(res!.log).toMatch(k.by === 1 ? /Rating \+1\.$/ : /Rating \+1, and that is your ceiling\.$/);
  });

  it.each(CASES)('$label: with room it pays the full raise', k => {
    const res = k.buy(atRating(k, 78, 90), k.item);
    expect(res!.state.ovr).toBe(78 + k.by);
    expect(res!.log).toMatch(new RegExp(`Rating \\+${k.by}\\.$`));
  });

  it.each(CASES)('$label: a save already over its ceiling is never pulled down', k => {
    const res = k.buy(atRating(k, 86, 84), k.item);
    expect(res!.state.ovr).toBe(86);
  });

  /* The play through the real loop. Measured on this code: NFL 1, NBA 6, MLB 0
     and NHL 11 of 300 careers reach the ceiling, so the MLB row here only
     guards a future rebalance; the forced cases above are what hold MLB. */
  it.each(CASES)('$label: seeded careers that reach the ceiling stay under it for good', k => {
    let reached = 0;
    let over = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const r = mulberry32(seed * 7919);
      let c = k.start(seed * 7919);
      let bought = false;
      for (let y = 0; y < 20; y++) {
        k.season(c, r);
        if (bought && c.ovr > c.pot) over += 1;
        if (!bought && c.pot - c.ovr <= 1) {
          bought = true; reached += 1;
          c.netWorth = 100;
          const res = k.buy(c, k.item);
          if (res) c = res.state;
          if (c.ovr > c.pot) over += 1;
        }
      }
    }
    console.log(`${k.label}: ${reached} of 300 seeded careers came within one of potential, ${over} seasons above it after buying`);
    expect(over).toBe(0);
  });
});
