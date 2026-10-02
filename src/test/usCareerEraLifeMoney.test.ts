/**
 * Round 833 review: every contract card in the US career life decks pays the
 * career's era money.
 *
 * The round scaled three cards (the supermax, the qualifying offer and one of
 * the two NFL franchise tags) and left the rest of the contract cards on 2026
 * money: the NFL holdout and the other franchise tag, the NBA superteam call,
 * player option and overseas offer, the MLB hometown discount, Japan offer and
 * opt out, the NHL bridge or eight year deal, no trade clause, take less to
 * chase and overseas offer, and every 2026 pay floor under them. A 2005 NFL
 * career held out for, and was tagged at, three times its league's money.
 *
 * The check knows no card by name. For each sport it takes the same career
 * twice, once in 2026 and once in the throwback era with its salary at the
 * era's scale, draws both life decks, and requires the same cards (a gate in
 * 2026 money hides a card from the throwback) and, for every option and both
 * sides of every coin, the throwback's salary to be the 2026 salary at the
 * era's scale. A card that pays a fixed 2026 amount, or floors a pay cut at
 * one, cannot pass.
 *
 * Plus two facts about the NFL tags that the old private pay table got wrong:
 * a kicker is tagged on the game's own kicker pay, and a kicker paid his free
 * agency market is not "underpaid" by the holdout card.
 *
 * scripts/simUsCareerDefects.mjs runs this file with the market copies and
 * the floors put back (control lifemoney) and requires it to go red.
 */
import { describe, expect, it } from 'vitest';
import * as nfl from '@/lib/nflMyCareer';
import * as nba from '@/lib/nbaMyCareer';
import * as mlb from '@/lib/mlbMyCareer';
import * as nhl from '@/lib/nhlMyCareer';
import { getNflLifeEventsA } from '@/lib/nflCareerLifeA';
import { getNflLifeEventsB } from '@/lib/nflCareerLifeB';
import { getNbaLifeEventsA } from '@/lib/nbaCareerLifeA';
import { getNbaLifeEventsB } from '@/lib/nbaCareerLifeB';
import { getMlbLifeEventsA } from '@/lib/mlbCareerLifeA';
import { getMlbLifeEventsB } from '@/lib/mlbCareerLifeB';
import { getNhlLifeEventsA } from '@/lib/nhlCareerLifeA';
import { getNhlLifeEventsB } from '@/lib/nhlCareerLifeB';

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const money = (x: number) => Math.round(x * 10) / 10;
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

type C = Record<string, unknown> & { salary: number; eraId?: string; earnings: number; netWorth?: number };
type Ev = { id: string; options: { apply: (c: C, r: () => number) => string }[] };

interface Sport {
  id: string;
  era: string;
  scale: number;
  positions: string[];
  start: (pos: string, seed: number) => C;
  season: (c: C, r: () => number) => void;
  decks: ((c: C, r: () => number) => Ev[])[];
}

const SPORTS: Sport[] = [
  {
    id: 'nfl', era: 'y2005', scale: nfl.nflEraById('y2005').moneyScale, positions: ['QB', 'EDGE', 'K'],
    start: (pos, seed) => nfl.startCareer('Era Money', pos as never, nfl.ARCHETYPES[pos as nfl.CareerPos][0], mulberry32(seed)) as unknown as C,
    season: (c, r) => { nfl.simSeason(c as never, 80, r); nfl.progress(c as never, r); },
    decks: [getNflLifeEventsA as never, getNflLifeEventsB as never],
  },
  {
    id: 'nba', era: 'y2004', scale: nba.nbaEraById('y2004').moneyScale, positions: ['PG', 'C'],
    start: (pos, seed) => nba.startNbaCareer('Era Money', pos as never, nba.NBA_ARCHETYPES[pos as nba.NbaCareerPos][0], mulberry32(seed)) as unknown as C,
    season: (c, r) => { nba.simNbaSeason(c as never, 80, r); nba.nbaProgress(c as never, r); },
    decks: [getNbaLifeEventsA as never, getNbaLifeEventsB as never],
  },
  {
    id: 'mlb', era: 'y2004', scale: mlb.mlbEraById('y2004').moneyScale, positions: ['SS', 'RP', 'SP'],
    start: (pos, seed) => mlb.startMlbCareer('Era Money', pos as never, mlb.MLB_ARCHETYPES[pos as mlb.MlbCareerPos][0], mulberry32(seed)) as unknown as C,
    season: (c, r) => { mlb.simMlbSeason(c as never, 80, r); mlb.mlbProgress(c as never, r); },
    decks: [getMlbLifeEventsA as never, getMlbLifeEventsB as never],
  },
  {
    id: 'nhl', era: 'y2006', scale: nhl.nhlEraById('y2006').moneyScale, positions: ['C', 'D', 'G'],
    start: (pos, seed) => nhl.startNhlCareer('Era Money', pos as never, nhl.NHL_ARCHETYPES[pos as nhl.NhlCareerPos][0], mulberry32(seed)) as unknown as C,
    season: (c, r) => { nhl.simNhlSeason(c as never, 80, r); nhl.nhlProgress(c as never, r); },
    decks: [getNhlLifeEventsA as never, getNhlLifeEventsB as never],
  },
];

/* Cards whose one off money (a fine, an offer abroad) is the contract itself,
   so the bank moves at the era's scale too. Endorsements, houses and the shop
   are lifestyle money and are not part of this check. */
const BANK_CARDS = new Set(['lifeA_franchise_tag', 'lifeA_holdout', 'lifeB_franchiseTag', 'nbaB_overseasMegaOffer', 'nhlB_overseasMegaOffer']);

/* The career states the decks are drawn on: contract up, final year and mid
   deal; young, prime and old; paid a little and paid a lot. */
const AGES = [25, 29, 34];
const CONTRACT_YEARS = [0, 1, 2];
const SALARIES_2026 = [1, 20];

function states(sp: Sport, pos: string, seed: number): { now: C; era: C }[] {
  const base = sp.start(pos, seed);
  const r = mulberry32(seed + 1);
  for (let i = 0; i < 8; i++) sp.season(base, r);
  const out: { now: C; era: C }[] = [];
  for (const age of AGES) for (const cy of CONTRACT_YEARS) for (const sal of SALARIES_2026) {
    const now = clone(base);
    Object.assign(now, {
      year: 2020, age, ovr: 84, pot: 90, contractYears: cy, salary: sal, rings: 0, cups: 0,
      mvps: 1, mvpCys: 1, harts: 1, allNbas: 2, allPros: 1, allStars: 2, morale: 60, fanbase: 50,
      health: 80, earnings: 120, netWorth: 60, lifeFlags: {}, retired: false,
    });
    delete now.pendingRivalryEvent; delete now.pendingRivalryChoice;
    const era = clone(now);
    era.eraId = sp.era;
    era.salary = money(sal * sp.scale);
    out.push({ now, era });
  }
  return out;
}

const near = (got: number, want: number) => Math.abs(got - want) <= 0.11 + Math.abs(want) * 0.02;

describe('US career contract cards pay the era money', () => {
  it.each(SPORTS)('$id: same cards, and every salary at the era scale', sp => {
    const bad: string[] = [];
    let compared = 0;
    const seen = new Set<string>();
    for (const pos of sp.positions) {
      for (const { now, era } of states(sp, pos, 8330 + pos.length)) {
        for (const deck of sp.decks) {
          const nowDeck = deck(clone(now), () => 0);
          const eraDeck = deck(clone(era), () => 0);
          const nowIds = nowDeck.map(e => e.id).sort().join(',');
          const eraIds = eraDeck.map(e => e.id).sort().join(',');
          if (nowIds !== eraIds) bad.push(`${pos}: the 2026 and ${sp.era} decks differ: [${nowIds}] vs [${eraIds}]`);
          for (const ev of nowDeck) {
            const twin = eraDeck.find(e => e.id === ev.id);
            if (!twin) continue;
            ev.options.forEach((_, i) => {
              for (const roll of [0.01, 0.99]) {
                const a = clone(now); const b = clone(era);
                ev.options[i].apply(a, () => roll);
                twin.options[i].apply(b, () => roll);
                compared += 1;
                seen.add(ev.id);
                const want = a.salary * sp.scale;
                if (!near(b.salary, want)) bad.push(`${ev.id} option ${i} roll ${roll} (${pos}): ${sp.era} salary ${b.salary}, 2026 ${a.salary} at ${sp.scale} is ${money(want)}`);
                if (BANK_CARDS.has(ev.id)) {
                  const dNow = (a.netWorth ?? 0) - (now.netWorth ?? 0);
                  const dEra = (b.netWorth ?? 0) - (era.netWorth ?? 0);
                  if (!near(dEra, dNow * sp.scale)) bad.push(`${ev.id} option ${i} roll ${roll} (${pos}): bank moved ${money(dEra)} in ${sp.era}, ${money(dNow)} in 2026`);
                }
              }
            });
          }
        }
      }
    }
    console.log(`${sp.id}: ${compared} option outcomes compared across ${seen.size} cards`);
    expect(compared).toBeGreaterThan(300);
    expect([...new Set(bad)]).toEqual([]);
  }, 120_000);
});

describe('the NFL tags read the game\'s own pay by position', () => {
  const kicker = (eraId?: string) => {
    const c = nfl.startCareer('Tag Test', 'K', nfl.ARCHETYPES.K[0], mulberry32(5), null, eraId);
    c.age = 30; c.ovr = 80; c.pot = 84; c.contractYears = 0;
    return c;
  };

  it('tags an 80 rated kicker on kicker money, in 2026 and in 2005', () => {
    /* (80 - 64) * 1.55 * 0.35 = 8.68; 2.78 at the 0.32 scale. The old private
       table used 0.9 for every position but QB and WR: 22.3M and 7.1M. */
    const now = getNflLifeEventsB(kicker(), mulberry32(2)).find(e => e.id === 'lifeB_franchiseTag');
    const then = getNflLifeEventsB(kicker('y2005'), mulberry32(2)).find(e => e.id === 'lifeB_franchiseTag');
    expect(now?.title).toBe('Tagged at 8.7M');
    expect(then?.title).toBe('Tagged at 2.8M');
  });

  it('never calls a kicker paid his market underpaid', () => {
    for (const eraId of [undefined, 'y2005']) {
      const c = kicker(eraId);
      for (let i = 0; i < 3; i++) nfl.simSeason(c, 80, mulberry32(10 + i));
      c.ovr = 84; c.contractYears = 2; c.salary = nfl.marketSalary(c);
      expect(getNflLifeEventsA(c, () => 0).find(e => e.id === 'lifeA_holdout')).toBeUndefined();
      c.salary = money(nfl.marketSalary(c) * 0.5);
      expect(getNflLifeEventsA(c, () => 0).find(e => e.id === 'lifeA_holdout')).toBeDefined();
    }
  });
});
