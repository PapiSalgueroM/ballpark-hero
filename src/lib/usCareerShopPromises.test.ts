/* Round 1534: the US My Career shop keeps its promises. Pure cases on synthetic careers from the four real
   start functions. Every expected number is a literal or is read from the card's own printed words, never from
   US_SHOP_RETURNS (the table under test), so a typo in the table turns these red. Run through
   scripts/simUsShopPromises.mjs section 0 too. */
import { describe, expect, it } from 'vitest';
import { ARCHETYPES, startCareer, NFL_SPEND_ITEMS } from '@/lib/nflMyCareer';
import { NBA_ARCHETYPES, startNbaCareer, NBA_SPEND_ITEMS, type NbaCareerState } from '@/lib/nbaMyCareer';
import { MLB_ARCHETYPES, startMlbCareer, MLB_SPEND_ITEMS } from '@/lib/mlbMyCareer';
import { NHL_ARCHETYPES, startNhlCareer, NHL_SPEND_ITEMS } from '@/lib/nhlMyCareer';
import {
  liquidateUsCareerPurchases, settleUsCareerShop, usCareerSeasonCool, US_SHOP_HELP_RULE, US_SHOP_RETURNS,
} from '@/lib/usCareerAnnualBenefits';
import { keyedRng } from '@/lib/keyedRng';
import { summerCareerKey } from '@/lib/usCareerSummer';

type Card = { id: string; name: string; cost: number; oneTime: boolean; desc: string; effect?: string; category: string };
const SHOPS: [string, readonly Card[]][] = [['nfl', NFL_SPEND_ITEMS], ['nba', NBA_SPEND_ITEMS], ['mlb', MLB_SPEND_ITEMS], ['nhl', NHL_SPEND_ITEMS]];
const starts = {
  nfl: () => startCareer('Fictional shop test', 'WR', ARCHETYPES.WR[0], () => 0.5),
  nba: () => startNbaCareer('Fictional shop test', 'SG', NBA_ARCHETYPES.SG[0], () => 0.5),
  mlb: () => startMlbCareer('Fictional shop test', 'SS', MLB_ARCHETYPES.SS[0], () => 0.5),
  nhl: () => startNhlCareer('Fictional shop test', 'C', NHL_ARCHETYPES.C[0], () => 0.5),
};
const nba = (purchased: string[], netWorth: number): NbaCareerState & { shopCarry?: number } =>
  ({ ...startNbaCareer('Fictional shop test', 'SG', NBA_ARCHETYPES.SG[0], () => 0.5), purchased, netWorth });
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

/** The card's own words, parsed: the printed steady rate, or the printed chance and payout. */
function printed(card: Card): { rate: number } | { chance: number; flat?: number; times?: number } | null {
  const text = `${card.desc} ${card.effect ?? ''}`;
  const steady = text.match(/Steady (\d+) percent/);
  if (steady) return { rate: Number(steady[1]) / 100 };
  const flat = text.match(/(\d+) percent chance it prints ([\d.]+)M/);
  if (flat) return { chance: Number(flat[1]) / 100, flat: Number(flat[2]) };
  const times = text.match(/(\d+) percent chance of (\d+)x/);
  if (times) return { chance: Number(times[1]) / 100, times: Number(times[2]) };
  return null;
}

describe('Round 1534: the shop table is the cards\' own words', () => {
  for (const [sport, items] of SHOPS) {
    it(`${sport}: every card that prints a return is a row with the printed numbers, and every row is a card`, () => {
      const paying = items.filter(card => printed(card));
      expect(paying.length).toBe(sport === 'nfl' ? 5 : 4);
      for (const card of paying) expect(US_SHOP_RETURNS[card.id], card.id).toEqual(printed(card));
      const ids = new Set(items.map(card => card.id));
      const rows = Object.keys(US_SHOP_RETURNS).filter(id => ids.has(id));
      expect(rows.sort()).toEqual(paying.map(card => card.id).sort());
    });
  }
});

describe('Round 1534: steady cards and the carry', () => {
  it('two index funds and the wine label pay 7 percent of 4M plus 10 percent of 2M, and the rest waits', () => {
    const c = nba(['index_nba', 'index_nba', 'wine_label'], 10);
    const lines = settleUsCareerShop(c, NBA_SPEND_ITEMS);
    expect(c.netWorth).toBe(10.4);
    expect(c.shopCarry).toBe(0.08);
    expect(lines).toEqual(['💵 This season your investments earned $0.48M. $0.4M went into the Bank, and $0.08M waits for next season.']);
    settleUsCareerShop(c, NBA_SPEND_ITEMS);
    expect(c.netWorth).toBe(10.9);
    expect(c.shopCarry).toBe(0.06);
    expect(c.purchased).toEqual(['index_nba', 'index_nba', 'wine_label']);
  });
  it('a one time card held twice by an old save counts once', () => {
    const c = nba(['wine_label', 'wine_label'], 5);
    settleUsCareerShop(c, NBA_SPEND_ITEMS);
    expect(c.netWorth).toBe(5.2);
    expect(c.shopCarry).toBe(0);
  });
  it('the car dealership pays its printed 9 percent of 3M in the NFL', () => {
    const c = { ...starts.nfl(), purchased: ['car_dealership'], netWorth: 4 } as ReturnType<typeof starts.nfl> & { shopCarry?: number };
    settleUsCareerShop(c, NFL_SPEND_ITEMS);
    expect(c.netWorth).toBe(4.2);
    expect(c.shopCarry).toBe(0.07);
  });
  it('a carry that is not a number in [0, 0.1) is read as nothing', () => {
    for (const bad of [Number.NaN, 0.5, -1, 0.1]) {
      const c = nba(['index_nba'], 3);
      c.shopCarry = bad;
      settleUsCareerShop(c, NBA_SPEND_ITEMS);
      expect(c.netWorth).toBe(3.1);
      expect(c.shopCarry).toBe(0.04);
    }
  });
});

describe('Round 1534: the family office', () => {
  it('adds 2 percent of cash above zero, after the steady returns', () => {
    const a = nba(['family_office_nba'], 10);
    expect(settleUsCareerShop(a, NBA_SPEND_ITEMS)).toEqual(['💵 This season the family office added $0.2M. $0.2M went into the Bank.']);
    expect(a.netWorth).toBe(10.2);
    const b = nba(['family_office_nba', 'index_nba'], 10);
    settleUsCareerShop(b, NBA_SPEND_ITEMS);
    expect(b.netWorth).toBe(10.3);
    expect(b.shopCarry).toBe(0.0428);
  });
  it('adds nothing at zero or below, and writes nothing', () => {
    for (const cash of [0, -3]) {
      const c = nba(['family_office_nba'], cash);
      const before = clone(c);
      expect(settleUsCareerShop(c, NBA_SPEND_ITEMS)).toEqual([]);
      expect(c).toEqual(before);
    }
  });
});

describe('Round 1534: stakes settle once, keyed', () => {
  for (const [sport, items] of SHOPS) {
    for (const card of items.filter(item => { const p = printed(item); return p && 'chance' in p; })) {
      it(`${sport} ${card.id}: pays its printed amount or nothing, on the documented key, and leaves the save`, () => {
        const p = printed(card) as { chance: number; flat?: number; times?: number };
        let wins = 0;
        for (let k = 0; k < 40; k++) {
          const c = { ...starts[sport as keyof typeof starts](), name: `Fictional stake ${k}`, purchased: [card.id, 'first_car'], netWorth: 6 };
          const won = keyedRng(`${summerCareerKey(c)}|shop|${card.id}|${c.year}|0`)() < p.chance;
          const twin = clone(c);
          const lines = settleUsCareerShop(c, items);
          expect(c.netWorth).toBe(won ? Math.round((6 + (p.flat ?? card.cost * (p.times ?? 0))) * 10) / 10 : 6);
          expect(c.purchased).toEqual(['first_car']);
          expect(lines).toHaveLength(1);
          expect('shopCarry' in c).toBe(false);
          settleUsCareerShop(twin, items);
          expect(twin).toEqual(c);
          if (won) wins += 1;
        }
        expect(wins).toBeGreaterThan(0);
        expect(wins).toBeLessThan(40);
      });
    }
  }
  it('every buy of a repeatable stake is its own roll', () => {
    const c = nba(['crypto_nba', 'crypto_nba', 'crypto_nba'], 2);
    const expected = [0, 1, 2].filter(i => keyedRng(`${summerCareerKey(c)}|shop|crypto_nba|${c.year}|${i}`)() < 0.2).length;
    expect(settleUsCareerShop(c, NBA_SPEND_ITEMS)).toHaveLength(3);
    expect(c.netWorth).toBe(Math.round((2 + 5 * expected) * 10) / 10);
    expect(c.purchased).toEqual([]);
  });
});

describe('Round 1534: the lawyer, liquidation, and careers that hold nothing that pays', () => {
  it('a lawyer doubles a clean season\'s cooling in every sport', () => {
    for (const id of ['shady_lawyer', 'nshady_lawyer', 'mshady_lawyer', 'hshady_lawyer']) expect(usCareerSeasonCool([id], 9)).toBe(18);
    expect(usCareerSeasonCool([], 9)).toBe(9);
    expect(usCareerSeasonCool(undefined, 9)).toBe(9);
    expect(usCareerSeasonCool(['nshady_fixer'], 9)).toBe(9);
  });
  it('selling lifestyle assets sells every paying card, so nothing pays after', () => {
    for (const [sport, items] of SHOPS) {
      const ids = items.filter(card => printed(card) || /Family Office/.test(card.name)).map(card => card.id);
      const c = { ...starts[sport as keyof typeof starts](), purchased: ids, netWorth: 10 };
      liquidateUsCareerPurchases(c, items);
      const before = clone(c);
      expect(settleUsCareerShop(c, items)).toEqual([]);
      expect(c).toEqual(before);
    }
  });
  it('a career holding nothing that pays, or nothing at all, gets nothing and keeps its save as it was', () => {
    for (const purchased of [undefined, [], ['first_car', 'downtown_loft', 'media_company', 'nshady_lawyer']]) {
      const c = nba([], 7);
      c.purchased = purchased as string[] | undefined;
      const before = clone(c);
      expect(settleUsCareerShop(c, NBA_SPEND_ITEMS)).toEqual([]);
      expect(c).toEqual(before);
    }
  });
});

describe('Round 1534: the help rule prints the cards\' own numbers', () => {
  it('the index fund and the crypto punt example match the cards in all four sports', () => {
    for (const [, items] of SHOPS) {
      const index = items.find(card => /Index Fund/.test(card.name)) as Card;
      const crypto = items.find(card => card.name === 'Crypto Punt') as Card;
      expect(index.cost).toBe(2);
      expect(index.desc).toMatch(/^Steady 7 percent/);
      expect(crypto.cost).toBe(1);
      expect(crypto.desc).toMatch(/^20 percent chance of 5x/);
    }
    expect(US_SHOP_HELP_RULE).toContain('Put 2M in the Boring Index Fund and it pays 7 percent, 0.14M, every season.');
    expect(US_SHOP_HELP_RULE).toContain('so 0.1M lands this season and the 0.04M waits for the next one');
    expect(US_SHOP_HELP_RULE).toContain('one time in 5 you get 5M back on your 1M, otherwise it is gone');
    expect(US_SHOP_HELP_RULE).toContain('Family Office adds 2 percent of your cash every season');
    expect(US_SHOP_HELP_RULE).toContain('sells your investments too');
    expect(US_SHOP_HELP_RULE).not.toMatch(new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`));
  });
});
