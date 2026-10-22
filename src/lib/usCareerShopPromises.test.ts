/* Round 1534: the US My Career shop keeps its promises. Pure cases on synthetic careers from the four real
   start functions. Every expected number is a literal or is read from the card's own printed words, never from
   US_SHOP_RETURNS (the table under test), so a typo in the table turns these red. Run through
   scripts/simUsShopPromises.mjs section 0 too. */
import { describe, expect, it } from 'vitest';
import { ARCHETYPES, startCareer, NFL_SPEND_ITEMS } from '@/lib/nflMyCareer';
import { NBA_ARCHETYPES, startNbaCareer, NBA_SPEND_ITEMS, buyNbaItem, nbaProgress, type NbaCareerState } from '@/lib/nbaMyCareer';
import { MLB_ARCHETYPES, startMlbCareer, MLB_SPEND_ITEMS, buyMlbItem } from '@/lib/mlbMyCareer';
import { NHL_ARCHETYPES, startNhlCareer, NHL_SPEND_ITEMS, buyNhlItem } from '@/lib/nhlMyCareer';
import {
  liquidateUsCareerPurchases, settleUsCareerShop, usCareerSeasonCool, US_SHOP_HELP_RULE, US_SHOP_RETURNS,
} from '@/lib/usCareerAnnualBenefits';
import { bankUsCareerFee, usCareerSkillSummer } from '@/lib/usCareerAnnualBenefits';
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

describe('Round 1534: the cards say what happens', () => {
  it('the family office prints the 2 percent it pays, in every sport', () => {
    for (const [, items] of SHOPS) {
      const office = items.find(card => card.name === 'Family Office') as Card;
      expect(office.effect).toBe('Adds 2 percent to your cash every season');
    }
  });
  it('no card promises royalties, a retirement plan, hidden money or a yearly heat any more', () => {
    for (const [sport, items] of SHOPS) for (const card of items) {
      expect(`${card.desc} ${card.effect ?? ''}`, `${sport} ${card.id}`).not.toMatch(/real royalties|The retirement plan|Hides money|heat \+\d a year|Protects your money/);
    }
  });
  it('the summer camp lands its printed fanbase and morale on buy, clamped at 100 and printed as landed', () => {
    const buys = [['nba', buyNbaItem], ['mlb', buyMlbItem], ['nhl', buyNhlItem]] as const;
    for (const [sport, buy] of buys) {
      const c = { ...starts[sport](), netWorth: 10, fanbase: 40, morale: 60 };
      const got = buy(c as never, 'summer_camp');
      expect(got?.state.fanbase, sport).toBe(48);
      expect(got?.state.morale, sport).toBe(66);
      expect(got?.log, sport).toMatch(/ Fanbase \+8, morale \+6\.$/);
      const full = buy({ ...starts[sport](), netWorth: 10, fanbase: 97, morale: 100 } as never, 'summer_camp');
      expect([full?.state.fanbase, full?.state.morale], sport).toEqual([100, 100]);
      expect(full?.log, sport).toMatch(/ Fanbase \+3, morale \+0\.$/);
    }
    expect(NFL_SPEND_ITEMS.some(card => card.id === 'summer_camp')).toBe(false);
  });
  it('a real season end keys each stake on the year after it, so a reload cannot re-roll', () => {
    const rngOf = () => { let s = 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };
    const b = nba(['crypto_nba', 'crypto_nba', 'crypto_nba', 'crypto_nba', 'crypto_nba'], 10);
    const t = nba([], 10);
    const before = b.year;
    nbaProgress(b, rngOf()); nbaProgress(t, rngOf());
    expect(b.year).toBe(before + 1);
    const wins = [0, 1, 2, 3, 4].filter(i => keyedRng(`${summerCareerKey(b)}|shop|crypto_nba|${before + 1}|${i}`)() < 0.2).length;
    expect(Math.round(((b.netWorth ?? 0) - (t.netWorth ?? 0)) * 10) / 10).toBe(5 * wins);
    expect(b.purchased).toEqual([]);
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
    /* Only a season end settles a stake, and retiring by hand in the offseason plays none (review of 2026-10-22). */
    expect(US_SHOP_HELP_RULE).toContain('Retire before you play that season and it never settles.');
    expect(US_SHOP_HELP_RULE).not.toMatch(new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`));
  });
});

/* Round 1538: the paid lines and the Skill card's ceiling, on the two shared helpers. The engines' own cards are
   proved in scripts/simUsShopPromises.mjs sections 6 and 7. */
describe('Round 1538: a paid line banks what it says, and the Skill card stops at the ceiling', () => {
  it('banks the fee into earnings and Cash alike and never rounds the balance again', () => {
    const c = { earnings: 20, netWorth: 10.37 };
    expect(bankUsCareerFee(c, 5, 1)).toBe(5);
    expect(c).toEqual({ earnings: 25, netWorth: 15.37 });
    const old = { earnings: 20, netWorth: 10.37 };
    const fee = bankUsCareerFee(old, 5, 0.31);
    expect(fee).toBe(Math.round(5 * 0.31 * 10) / 10);
    expect(old.earnings).toBe(20 + fee);
    expect(old.netWorth).toBe(Math.round((10.37 + fee) * 10000) / 10000);
    const flat = { earnings: 7, netWorth: 3 };
    expect(bankUsCareerFee(flat, 0.3, 1)).toBe(0.3);
    expect(flat.netWorth).toBe(3.3);
  });
  it('starts Cash from the take home share of the earnings so far when the save has none', () => {
    const c: { earnings: number; netWorth?: number } = { earnings: 10 };
    expect(bankUsCareerFee(c, 3, 1)).toBe(3);
    expect(c).toEqual({ earnings: 13, netWorth: 7.5 });
  });
  it('the Skill answer holds the rating at the ceiling and says what landed', () => {
    const at = { age: 24, health: 70, ovr: 80, pot: 80 };
    expect(usCareerSkillSummer(at, () => 0.9, 31, 'Maintenance year.')).toBe('You were already at your ceiling, so the rating stays at 80.');
    expect(at.ovr).toBe(80);
    const under = { age: 24, health: 70, ovr: 79, pot: 80 };
    expect(usCareerSkillSummer(under, () => 0.9, 31, 'Maintenance year.')).toBe('Rating +1, and that is your ceiling.');
    expect(under.ovr).toBe(80);
    const room = { age: 24, health: 70, ovr: 70, pot: 80 };
    expect(usCareerSkillSummer(room, () => 0.9, 31, 'Maintenance year.')).toBe('Rating +2.');
    expect(room.ovr).toBe(72);
    const top = { age: 24, health: 70, ovr: 99, pot: 99 };
    usCareerSkillSummer(top, () => 0.9, 31, 'Maintenance year.');
    expect(top.ovr).toBe(99);
    /* Another card can leave the rating above the ceiling: the Skill answer keeps it there, never pulls it down. */
    const over = { age: 24, health: 70, ovr: 83, pot: 80 };
    expect(usCareerSkillSummer(over, () => 0.9, 31, 'Maintenance year.')).toBe('You were already at your ceiling, so the rating stays at 83.');
    expect(over.ovr).toBe(83);
  });
  it('the Skill answer draws once under the maintenance age and never from it', () => {
    let draws = 0;
    const r = () => { draws += 1; return 0; };
    const young = { age: 30, health: 70, ovr: 70, pot: 80 };
    expect(usCareerSkillSummer(young, r, 31, 'Maintenance year.')).toBe('Rating +1.');
    expect(draws).toBe(1);
    const vet = { age: 31, health: 70, ovr: 70, pot: 80 };
    expect(usCareerSkillSummer(vet, r, 31, 'Maintenance year.')).toBe('Maintenance year. Health +4.');
    expect(draws).toBe(1);
    expect(vet).toEqual({ age: 31, health: 74, ovr: 70, pot: 80 });
    /* The line says the health that landed (review of 2026-10-22): held at 100, part of the 4 or none of it. */
    const near = { age: 31, health: 98, ovr: 70, pot: 80 };
    expect(usCareerSkillSummer(near, r, 31, 'Maintenance year.')).toBe('Maintenance year. Health +2, and that is full health.');
    expect(near).toEqual({ age: 31, health: 100, ovr: 70, pot: 80 });
    const full = { age: 33, health: 100, ovr: 70, pot: 80 };
    expect(usCareerSkillSummer(full, r, 31, 'Maintenance year.')).toBe('Maintenance year. You were already at full health, so it stays at 100.');
    expect(full).toEqual({ age: 33, health: 100, ovr: 70, pot: 80 });
    expect(draws).toBe(1);
  });
});
