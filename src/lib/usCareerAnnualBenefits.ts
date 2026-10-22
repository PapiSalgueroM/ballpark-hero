import { raiseWithinPotential } from './careerHeadroom';
import { keyedRng } from './keyedRng';
import { summerCareerKey } from './usCareerSummer';
import type { UsCareerCore } from './usCareerSport';

type Sport = 'nfl' | 'nba' | 'mlb' | 'nhl';
type SupportedCareer = {
  age: number; health: number; morale: number; fanbase: number; ovr: number; pot: number;
  purchased?: string[]; yearlyCosts?: number;
};
type SpendItem = { id: string; category: string; yearly?: number };

/** The recurring support explicitly promised by each sport's shop. */
export function applyUsCareerAnnualBenefits(c: SupportedCareer, sport: Sport, seasonAge: number): string | null {
  const owned = new Set(c.purchased ?? []);
  const nfl = sport === 'nfl';
  const has = (id: string) => owned.has(id) ? 1 : 0;
  const young = seasonAge <= (nfl || sport === 'mlb' ? 26 : 25);
  const health = 6 * has(nfl ? 'private_gym' : 'home_court') + 4 * has(nfl ? 'private_chef' : `chef_${sport}`);
  const rating = (young ? has(nfl ? 'speed_coach' : 'shot_doctor') : 0) + (nfl ? 0 : has('film_room'));
  const morale = 6 * has(nfl ? 'family_thanksgiving' : 'road_family')
    + (nfl ? 0 : 4 * has('barber_chair')) + (sport === 'nhl' ? 4 * has('skate_sharpener') : 0);
  const fanbase = 10 * has(nfl ? 'foundation' : `foundation_${sport}`)
    + (nfl ? 0 : 6 * has('media_company') + 5 * has('tunnel_fits') + 6 * has('courtside_seats'))
    + (sport === 'nhl' ? 5 * has('beer_league') : 0);
  if (!(health || rating || morale || fanbase)) return null;

  const before = { health: c.health, ovr: c.ovr, morale: c.morale, fanbase: c.fanbase };
  c.health = Math.max(c.health, Math.min(100, c.health + health));
  c.ovr = raiseWithinPotential(c.ovr, c.pot, rating);
  c.morale = Math.max(c.morale, Math.min(100, c.morale + morale));
  c.fanbase = Math.max(c.fanbase, Math.min(100, c.fanbase + fanbase));
  const gains = [
    ['health', c.health - before.health], ['rating', c.ovr - before.ovr],
    ['morale', c.morale - before.morale], ['fanbase', c.fanbase - before.fanbase],
  ].filter(([, gain]) => Number(gain) > 0).map(([label, gain]) => `${label} +${gain}`);
  return gains.length ? `Yearly support: ${gains.join(', ')}.` : null;
}

const permanentReceipts = new Set([
  'hometown_field', 'hometown_court', 'minority_stake', 'team_stake', 'junior_stake',
  'music_video', 'shoe_line', 'album', 'signature_shoe',
]);

/** Cancel ongoing support and sell lifestyle assets without undoing earned skills or gifts. */
export function liquidateUsCareerPurchases(c: Pick<SupportedCareer, 'purchased' | 'yearlyCosts'>, items: readonly SpendItem[]): void {
  const catalog = new Map(items.map(item => [item.id, item]));
  if (c.purchased) c.purchased = c.purchased.filter(id => {
    const item = catalog.get(id);
    if (!item) return true;
    if ((item.yearly ?? 0) > 0) return false;
    return item.category === 'body' || item.category === 'family' || permanentReceipts.has(id);
  });
  c.yearlyCosts = 0;
}

/* ─── Round 1534: the shop keeps its promises ───

   The Invest aisle of the four US My Careers sold "Steady 7 percent", "35 percent chance it prints 3M" and
   "20 percent chance of 5x", the Family Office said "Protects your money" and the lawyer "Heat cools twice as
   fast", and no code read any of it: the money left Cash and nothing ever came back. This block is the one rule
   for all four sports, called once from each engine's season end, straight after the pay line.

   - STEADY cards pay their printed percent of what was paid, every season held. A repeatable card (the index
     funds) pays per buy, so two buys pay twice; a one time card (the wine label, the car dealership) counts once
     even if an old save holds its id twice.
   - STAKES settle once, at the end of the first season played after the buy: the printed chance of the printed
     payout, the whole amount back into Cash, or nothing. Every buy is its own stake with its own roll, drawn on
     keyedRng keyed to the career (summerCareerKey), the id, the year AFTER the season end moved it and the stake's
     index, so the season's own stream never moves and a reload cannot re-roll. A settled stake leaves
     `purchased` (cashed out or gone), so a one time stake can be bought again once it has settled.
   - THE FAMILY OFFICE adds 2 percent of Cash a season when Cash is above zero, read after the pay, the upkeep,
     the stakes and the steady returns, the order Soccer Career's office runs in (its card: "+2% net worth growth
     per season").
   - THE LAWYER makes a clean season cool the heat twice as fast: usCareerSeasonCool, read by the four engines'
     heat drift and by the Dirty Money desk's printed bans (careerDirtyMoney.ts), so both say the same thing.
   - ROUNDING. The pay line leaves Cash in tenths. A steady return rarely is one (7 percent of 2M is 0.14M), so
     the steady money and the office go through one carry: the season's amount plus the carry is floored to the
     tenth and banked, and the rest (under 0.1M, kept to 0.0001M) waits in `shopCarry` for the next season. Over
     the seasons Cash gains the printed rate exactly, less at most 0.0999M waiting. Stake payouts are whole tenths
     and land in full.
   - A career that holds nothing that pays gets [] back and nothing written: no `shopCarry` key appears, so every
     such season replays byte for byte as it did before this round (scripts/simUsShopPromises.mjs section 8).
   - Old saves: the first season end after this round pays one season of every steady card and the office and
     settles each stake once. Nothing is paid for seasons already played.
   Every number below is the card's own printed number; none is a real world fact. */

/** What each paying card prints. Steady: its yearly rate on what was paid. Stake: its chance, and either a flat
 *  payout or a multiple of what was paid. One row per id: restaurant_group and wine_label are the same card, with
 *  the same numbers, in every sport that sells them. */
export const US_SHOP_RETURNS: Readonly<Record<string, { rate: number } | { chance: number; flat?: number; times?: number }>> = {
  index_fund: { rate: 0.07 }, index_nba: { rate: 0.07 }, index_mlb: { rate: 0.07 }, index_nhl: { rate: 0.07 },
  wine_label: { rate: 0.10 }, car_dealership: { rate: 0.09 },
  restaurant_group: { chance: 0.35, flat: 3 }, wing_franchise: { chance: 0.35, flat: 2.5 },
  crypto_punt: { chance: 0.2, times: 5 }, crypto_nba: { chance: 0.2, times: 5 },
  crypto_mlb: { chance: 0.2, times: 5 }, crypto_nhl: { chance: 0.2, times: 5 },
  esports_team: { chance: 0.3, times: 3 },
};
export const US_FAMILY_OFFICES: readonly string[] = ['family_office', 'family_office_nba', 'family_office_mlb', 'family_office_nhl'];
export const US_FAMILY_OFFICE_RATE = 0.02;
export const US_LAWYERS: readonly string[] = ['shady_lawyer', 'nshady_lawyer', 'mshady_lawyer', 'hshady_lawyer'];

/** The heat a season with no dirty money cools by: twice the usual with a lawyer on retainer. */
export function usCareerSeasonCool(purchased: readonly string[] | undefined, cool: number): number {
  return (purchased ?? []).some(id => US_LAWYERS.includes(id)) ? cool * 2 : cool;
}

type ShopCareer = UsCareerCore & { shopCarry?: number };
type ShopItem = { id: string; name: string; cost: number; oneTime: boolean };
const shopMoney = (v: number): string => `$${Number(v.toFixed(4))}M`;

/** The season end of the shop: steady returns, stakes and the family office into Cash. Call it once per season
 *  end, after the pay line and before the money app's tick. Mutates like applyUsCareerAnnualBenefits and returns
 *  the feed lines. */
export function settleUsCareerShop(c: ShopCareer, items: readonly ShopItem[]): string[] {
  const held = c.purchased ?? [];
  const holds = (id: string) => held.reduce((n, x) => (x === id ? n + 1 : n), 0);
  const office = held.some(id => US_FAMILY_OFFICES.includes(id));
  let steady = 0;
  let payouts = 0;
  const settled = new Set<string>();
  const lines: string[] = [];
  for (const card of items) {
    const row = US_SHOP_RETURNS[card.id];
    const count = row ? holds(card.id) : 0;
    if (!row || count === 0) continue;
    if ('rate' in row) { steady += card.cost * row.rate * (card.oneTime ? 1 : count); continue; }
    settled.add(card.id);
    for (let i = 0; i < count; i++) {
      const won = keyedRng(`${summerCareerKey(c)}|shop|${card.id}|${c.year}|${i}`)() < row.chance;
      const pay = row.flat ?? card.cost * (row.times ?? 0);
      if (won) payouts += pay;
      lines.push(won
        ? `🎰 Your ${card.name} came through: ${shopMoney(pay)} back on the ${shopMoney(card.cost)} you put in.`
        : `💸 Your ${card.name} did not come through. The ${shopMoney(card.cost)} you put in is gone.`);
    }
  }
  if (!office && steady === 0 && settled.size === 0) return lines;
  if (settled.size) c.purchased = held.filter(id => !settled.has(id));
  const cash = (c.netWorth ?? 0) + payouts;
  const added = office && cash + steady > 0 ? (cash + steady) * US_FAMILY_OFFICE_RATE : 0;
  const earned = steady + added;
  if (earned > 0) {
    const prior = c.shopCarry;
    const carry = typeof prior === 'number' && Number.isFinite(prior) && prior >= 0 && prior < 0.1 ? prior : 0;
    const exact = Math.round((carry + earned) * 10000);
    const tenths = Math.floor(exact / 1000);
    c.shopCarry = (exact - tenths * 1000) / 10000;
    c.netWorth = Math.round((cash + tenths / 10) * 10) / 10;
    const what = [steady > 0 ? `your investments earned ${shopMoney(steady)}` : '', added > 0 ? `the family office added ${shopMoney(added)}` : '']
      .filter(Boolean).join(' and ');
    const waits = c.shopCarry > 0 ? `, and ${shopMoney(c.shopCarry)} waits for next season` : '';
    lines.unshift(`💵 This season ${what}. ${shopMoney(tenths / 10)} went into the Bank${waits}.`);
  } else if (payouts > 0) {
    c.netWorth = Math.round(cash * 10) / 10;
  }
  return lines;
}

/** The rule behind each page's "?", with a worked example. Written out rather than built at load (the NFL route's
 *  weight row has about a kilobyte of room); every number in it is held to the cards' own printed words by
 *  src/lib/usCareerShopPromises.test.ts and scripts/simUsShopPromises.mjs section 1, so it cannot drift from
 *  them, and the table above is held to the same words. */
export const US_SHOP_HELP_RULE = 'The shop pays what its cards say, at the end of every season you play. Put 2M in the Boring Index Fund '
  + 'and it pays 7 percent, 0.14M, every season. Cash moves in tenths, so 0.1M lands this season and the 0.04M waits for the '
  + 'next one. A stake like the Crypto Punt settles once, at the end of your next season: one time in 5 you get 5M back on '
  + 'your 1M, otherwise it is gone, and once it has settled you can buy another. The Family Office adds 2 percent of your '
  + 'cash every season, and the lawyer makes a clean season cool your heat twice as fast. Selling your lifestyle assets '
  + 'when you go broke sells your investments too.';
