import { describe, expect, it } from 'vitest';
import { ARCHETYPES, startCareer, simSeason, progress, buyNflItem, NFL_SPEND_ITEMS, type CareerState } from '@/lib/nflMyCareer';
import { NBA_ARCHETYPES, startNbaCareer, simNbaSeason, nbaProgress, buyNbaItem, NBA_SPEND_ITEMS, type NbaCareerState } from '@/lib/nbaMyCareer';
import { MLB_ARCHETYPES, startMlbCareer, simMlbSeason, mlbProgress, buyMlbItem, MLB_SPEND_ITEMS, type MlbCareerState } from '@/lib/mlbMyCareer';
import { NHL_ARCHETYPES, startNhlCareer, simNhlSeason, nhlProgress, buyNhlItem, NHL_SPEND_ITEMS, type NhlCareerState } from '@/lib/nhlMyCareer';
import { getNflCorruptionEvents } from '@/lib/nflCareerCorruption';
import { getNbaCorruptionEvents } from '@/lib/nbaCareerCorruption';
import { getMlbCorruptionEvents } from '@/lib/mlbCareerCorruption';
import { getNhlCorruptionEvents } from '@/lib/nhlCareerCorruption';

type State = CareerState | NbaCareerState | MlbCareerState | NhlCareerState;
type Gain = { health: number; ovr: number; morale: number; fanbase: number };
type Scenario = {
  sport: string; young: number; chef: string; coach: string; payout: number;
  permanent: string[]; assets: string[]; items: { id: string; yearly?: number; effect?: string; minFanbase?: number }[];
  support: { id: string; gain: Gain }[];
  start: () => State; sim: (c: State, r: () => number) => unknown; progress: (c: State, r: () => number) => string[];
  buy: (c: State, id: string) => { state: State; log: string } | null;
  events: (c: State) => { id: string; options: { apply: (c: State) => string }[] }[];
};
const zero: Gain = { health: 0, ovr: 0, morale: 0, fanbase: 0 };
const benefit = (id: string, metric: keyof Gain, amount: number) => ({ id, gain: { ...zero, [metric]: amount } });
const common = (sport: string) => [
  benefit('home_court', 'health', 6), benefit(`chef_${sport}`, 'health', 4), benefit('shot_doctor', 'ovr', 1),
  benefit('film_room', 'ovr', 1), benefit('road_family', 'morale', 6), benefit('barber_chair', 'morale', 4),
  benefit('media_company', 'fanbase', 6), benefit('tunnel_fits', 'fanbase', 5),
  benefit(`foundation_${sport}`, 'fanbase', 10), benefit('courtside_seats', 'fanbase', 6),
];
const cases: Scenario[] = [
  {
    sport: 'NFL', young: 26, chef: 'private_chef', coach: 'speed_coach', payout: 4, items: NFL_SPEND_ITEMS,
    permanent: ['sleep_lab', 'vision_training', 'mom_house', 'siblings_college', 'hometown_field', 'music_video', 'shoe_line', 'minority_stake'],
    assets: ['condo', 'first_truck', 'car_dealership', 'chain'],
    support: [benefit('private_gym', 'health', 6), benefit('private_chef', 'health', 4), benefit('speed_coach', 'ovr', 1), benefit('foundation', 'fanbase', 10), benefit('family_thanksgiving', 'morale', 6)],
    start: () => startCareer('Fictional annual support', 'WR', ARCHETYPES.WR[0], () => 0.5),
    sim: (c, r) => simSeason(c as CareerState, 80, r), progress: (c, r) => progress(c as CareerState, r),
    buy: (c, id) => buyNflItem(c as CareerState, id), events: c => getNflCorruptionEvents(c as CareerState, () => 0.5) as never,
  },
  {
    sport: 'NBA', young: 25, chef: 'chef_nba', coach: 'shot_doctor', payout: 5, items: NBA_SPEND_ITEMS,
    permanent: ['sleep_nba', 'biomech_nba', 'mom_house_nba', 'siblings_nba', 'hometown_court', 'album', 'signature_shoe', 'team_stake'],
    assets: ['downtown_loft', 'first_car', 'wine_label', 'chain_nba'], support: common('nba'),
    start: () => startNbaCareer('Fictional annual support', 'SG', NBA_ARCHETYPES.SG[0], () => 0.5),
    sim: (c, r) => simNbaSeason(c as NbaCareerState, 80, r), progress: (c, r) => nbaProgress(c as NbaCareerState, r),
    buy: (c, id) => buyNbaItem(c as NbaCareerState, id), events: c => getNbaCorruptionEvents(c as NbaCareerState, () => 0.5) as never,
  },
  {
    sport: 'MLB', young: 26, chef: 'chef_mlb', coach: 'shot_doctor', payout: 4, items: MLB_SPEND_ITEMS,
    permanent: ['sleep_mlb', 'biomech_mlb', 'mom_house_mlb', 'siblings_mlb', 'hometown_court', 'album', 'signature_shoe', 'team_stake'],
    assets: ['downtown_loft', 'first_car', 'wine_label', 'chain_mlb'], support: common('mlb'),
    start: () => startMlbCareer('Fictional annual support', 'SS', MLB_ARCHETYPES.SS[0], () => 0.5),
    sim: (c, r) => simMlbSeason(c as MlbCareerState, 80, r), progress: (c, r) => mlbProgress(c as MlbCareerState, r),
    buy: (c, id) => buyMlbItem(c as MlbCareerState, id), events: c => getMlbCorruptionEvents(c as MlbCareerState, () => 0.5) as never,
  },
  {
    sport: 'NHL', young: 25, chef: 'chef_nhl', coach: 'shot_doctor', payout: 4, items: NHL_SPEND_ITEMS,
    permanent: ['sleep_nhl', 'biomech_nhl', 'shooting_room', 'mom_house_nhl', 'siblings_nhl', 'billet_house', 'hometown_court', 'album', 'signature_shoe', 'team_stake', 'junior_stake'],
    assets: ['downtown_loft', 'first_car', 'wine_label', 'chain_nhl'],
    support: [...common('nhl'), benefit('skate_sharpener', 'morale', 4), benefit('beer_league', 'fanbase', 5)],
    start: () => startNhlCareer('Fictional annual support', 'C', NHL_ARCHETYPES.C[0], () => 0.5),
    sim: (c, r) => simNhlSeason(c as NhlCareerState, 80, r), progress: (c, r) => nhlProgress(c as NhlCareerState, r),
    buy: (c, id) => buyNhlItem(c as NhlCareerState, id), events: c => getNhlCorruptionEvents(c as NhlCareerState, () => 0.5) as never,
  },
];
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
function fixture(k: Scenario): State {
  const c = k.start();
  Object.assign(c, { age: 23, ovr: 75, pot: 99, health: 45, morale: 40, fanbase: 10, netWorth: 1000, salary: 10, earnings: 100, role: 'starter' });
  return c;
}
function buy(k: Scenario, c: State, ids: string[]): State {
  for (const id of ids) {
    const threshold = k.items.find(item => item.id === id)?.minFanbase ?? 0;
    c.fanbase = Math.max(c.fanbase, threshold);
    const result = k.buy(c, id); expect(result, id).not.toBeNull(); c = result!.state;
  }
  return c;
}
function tracked() { let count = 0; return { draw: () => { count++; return 0; }, count: () => count }; }
function values(c: State): Gain { return { health: c.health, ovr: c.ovr, morale: c.morale, fanbase: c.fanbase }; }
function difference(a: State, b: State): Gain { const av = values(a), bv = values(b); return { health: av.health - bv.health, ovr: av.ovr - bv.ovr, morale: av.morale - bv.morale, fanbase: av.fanbase - bv.fanbase }; }
function progressPair(k: Scenario, c: State) {
  const bare = clone(c); bare.purchased = []; const ar = tracked(), br = tracked();
  const notes = k.progress(c, ar.draw), baselineNotes = k.progress(bare, br.draw);
  expect(ar.count()).toBe(br.count());
  expect(c.netWorth).toBe(bare.netWorth); expect(c.money).toEqual(bare.money);
  expect(c.year).toBe(bare.year); expect(c.age).toBe(bare.age); expect(c.contractYears).toBe(bare.contractYears);
  expect(notes.filter(n => !n.startsWith('Yearly support:'))).toEqual(baselineNotes);
  return { bare, notes };
}
function broke(k: Scenario, c: State) {
  Object.assign(c, { age: 31, earnings: 100, netWorth: 1 });
  const event = k.events(c).find(e => e.id.endsWith('_broke')); expect(event).toBeDefined(); return event!;
}

describe('905 actual US career yearly support and liquidation', () => {
  it.each(cases)('$sport pays each advertised recurring item after a real bought season with the same RNG and upkeep', k => {
    for (const item of k.support) {
      const bought = buy(k, fixture(k), [item.id]);
      const r = tracked(); k.sim(bought, r.draw);
      const before = clone(bought); const { bare, notes } = progressPair(k, bought);
      expect(difference(bought, bare), item.id).toEqual(item.gain);
      expect(notes.filter(n => n.startsWith('Yearly support:')), item.id).toHaveLength(1);
      const upkeep = k.items.find(i => i.id === item.id)!.yearly!;
      expect(bought.yearlyCosts).toBe(upkeep);
      expect(bought.netWorth).toBe(Math.round((before.netWorth! + before.salary * 0.45 - upkeep) * 10) / 10);
    }
  });

  it.each(cases)('$sport keeps support through two seasons and JSON restore without repeating duplicate ownership or upkeep', k => {
    let c = buy(k, fixture(k), [k.chef]);
    const upkeep = k.items.find(i => i.id === k.chef)!.yearly!;
    c.purchased!.push(k.chef);
    for (let season = 0; season < 2; season++) {
      c = clone(c); const restore = clone(c); expect(c).toEqual(restore);
      k.sim(c, () => 0); const before = clone(c); const { bare, notes } = progressPair(k, c);
      expect(difference(c, bare)).toEqual({ ...zero, health: 4 });
      expect(notes.filter(n => n.startsWith('Yearly support:'))).toEqual(['Yearly support: health +4.']);
      expect(c.netWorth).toBe(Math.round((before.netWorth! + before.salary * 0.45 - upkeep) * 10) / 10);
      expect(c.yearlyCosts).toBe(upkeep);
    }
  });

  it.each(cases)('$sport uses the completed season age for the last young coaching benefit and stops next year', k => {
    for (const age of [k.young, k.young + 1]) {
      const c = buy(k, fixture(k), [k.coach]); c.age = age;
      const { bare, notes } = progressPair(k, c);
      expect(c.ovr - bare.ovr).toBe(age === k.young ? 1 : 0);
      expect(notes.filter(n => n.startsWith('Yearly support:'))).toEqual(age === k.young ? ['Yearly support: rating +1.'] : []);
    }
    expect(k.items.find(i => i.id === k.coach)!.effect).toBe(`Rating +1 each offseason through age ${k.young}, up to your ceiling`);
  });

  it.each(cases)('$sport clamps actual support at potential and 100 and reports only the earned amounts', k => {
    const c = buy(k, fixture(k), k.support.map(i => i.id));
    Object.assign(c, { ovr: 92, pot: 93, health: 99, morale: 99, fanbase: 99 });
    const { bare, notes } = progressPair(k, c);
    expect(difference(c, bare)).toEqual({ health: 1, ovr: 1, morale: 5, fanbase: 1 });
    expect(values(c)).toEqual({ health: 100, ovr: 93, morale: 100, fanbase: 100 });
    expect(notes.filter(n => n.startsWith('Yearly support:'))).toEqual(['Yearly support: health +1, rating +1, morale +5, fanbase +1.']);
    c.ovr = 95; c.pot = 93; c.morale = 100; c.health = 100; c.fanbase = 100;
    const noGain = k.progress(c, () => 0.9);
    expect(c.ovr).toBe(95);
    expect(noGain.filter(n => n.startsWith('Yearly support:'))).toEqual([]);
  });

  it.each(cases)('$sport liquidation removes recurring support and assets while holding earned training, gifts, payout and portfolio', k => {
    let c = buy(k, fixture(k), [...k.support.map(i => i.id), ...k.assets, ...k.permanent]);
    k.progress(c, () => 0); c.purchased!.push('unknown_future_receipt');
    const event = broke(k, c), before = clone(c); const log = event.options[0].apply(c);
    expect(c.purchased).toEqual([...k.permanent, 'unknown_future_receipt']);
    expect(c.yearlyCosts).toBe(0);
    expect(c.purchased!.filter(id => (k.items.find(i => i.id === id)?.yearly ?? 0) > 0)).toEqual([]);
    expect(c.netWorth).toBe(before.netWorth! + k.payout); expect(c.morale).toBe(before.morale - 6);
    expect(c.health).toBe(before.health); expect(c.ovr).toBe(before.ovr); expect(c.fanbase).toBe(before.fanbase);
    expect(c.money).toEqual(before.money); expect(c.seasons).toEqual(before.seasons); expect(log).toContain(k.payout === 5 ? 'Five million' : 'Four million');
    expect(clone(c)).toEqual(c);
    const { bare, notes } = progressPair(k, c);
    expect(difference(c, bare)).toEqual(zero); expect(notes.filter(n => n.startsWith('Yearly support:'))).toEqual([]);
  });

  it.each(cases)('$sport keeps permanent purchases blocked but lets canceled support be hired and charged again', k => {
    let c = buy(k, fixture(k), [...k.support.map(i => i.id), ...k.permanent]);
    broke(k, c).options[0].apply(c);
    for (const id of k.permanent) expect(k.buy(c, id), id).toBeNull();
    const before = clone(c); c = buy(k, c, [k.chef]);
    expect(c.netWorth).toBe(before.netWorth); expect(c.yearlyCosts).toBe(k.items.find(i => i.id === k.chef)!.yearly);
    expect(k.buy(c, k.chef)).toBeNull();
    const { bare, notes } = progressPair(k, c);
    expect(difference(c, bare)).toEqual({ ...zero, health: 4 }); expect(notes.filter(n => n.startsWith('Yearly support:'))).toEqual(['Yearly support: health +4.']);
  });

  it.each(cases)('$sport holds empty, unknown and completed-only ownership plus both other financial event choices', k => {
    for (const ids of [undefined, [], ['unknown_future_receipt'], k.permanent]) {
      const c = fixture(k); c.purchased = ids ? [...ids] : undefined;
      const { bare, notes } = progressPair(k, c); expect(difference(c, bare)).toEqual(zero);
      expect(notes.filter(n => n.startsWith('Yearly support:'))).toEqual([]); expect(c.purchased).toEqual(ids);
    }
    const c = buy(k, fixture(k), [k.chef]), event = broke(k, c), dirty = clone(c), clean = clone(c), before = clone(c);
    event.options[1].apply(dirty); event.options[2].apply(clean);
    expect(dirty.purchased).toEqual(before.purchased); expect(dirty.yearlyCosts).toBe(before.yearlyCosts);
    expect(dirty.dirtyMoney).toBe((before.dirtyMoney ?? 0) + (k.sport === 'NBA' ? 6 : 5));
    expect(dirty.heat).toBe((before.heat ?? 0) + 26);
    expect(clean.purchased).toEqual(before.purchased); expect(clean.yearlyCosts).toBe(Math.round(before.yearlyCosts! * 0.5 * 100) / 100);
    expect(clean.netWorth).toBe(before.netWorth); expect(clean.morale).toBe(before.morale + 8);
  });
});
