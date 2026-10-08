/**
 * Round 1104, the small confirmed items, each pinned by name:
 *   a trade never lands on the club he is already at, and a man with no
 *   contract is not dealt a trade card; Brand work reaches the bank in the
 *   era's money; the franchise record card quotes no number, no week or game
 *   and no standings in any of the four sports; the NBA snub card reads his
 *   own season and is not dealt to a man honoured last season; the founder is
 *   only dealt to a bank that covers his check.
 *
 * Careers are built through the bindings (so the decks are the ones the board
 * deals) and then set by hand to the state each card needs.
 */
import { describe, it, expect } from 'vitest';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
import type { UsCareerSport } from '@/lib/usCareerSport';
import { keyedStream } from './helpers/usCareerDrive';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Save = any;

/** A career `seasons` seasons in, at the first position of the sport, in `era`. */
function careerOf(sport: UsCareerSport, seasons: number, eraIdx = 0, over: Record<string, unknown> = {}): Save {
  const keep = Math.random;
  Math.random = keyedStream(`small:${sport.slug}:${seasons}:${eraIdx}`);
  try {
    const pos = sport.create.positions[0];
    const c: Save = sport.startCareer('Small Items', pos, sport.create.archetypes[pos][0], Math.random, null as never, sport.create.eras[eraIdx].id);
    for (let i = 0; i < seasons; i += 1) { sport.simSeason(c, 80, Math.random); sport.progress(c, Math.random); }
    delete c.summer;
    return { ...c, contractYears: 3, ...over };
  } finally {
    Math.random = keep;
  }
}
const deckOf = (sport: UsCareerSport, c: Save) => sport.eventDeck(c, keyedStream('deck'));
const cardOf = (sport: UsCareerSport, c: Save, id: string) => deckOf(sport, c).find(e => e.id === id);

describe('Round 1104: trades', () => {
  it('NFL: a requested trade never lands on the club he is at, in either era', () => {
    for (const eraIdx of [0, 1]) {
      const c = careerOf(NFL_CAREER_SPORT, 2, eraIdx, { morale: 40 });
      const card = cardOf(NFL_CAREER_SPORT, c, 'frustration');
      expect(card, 'the frustration card is dealt under 55 morale with a contract').toBeTruthy();
      const r = keyedStream(`trade:${eraIdx}`);
      const seen = new Set<string>();
      const snap = JSON.stringify(c);
      for (let i = 0; i < 800; i += 1) {
        const cc = JSON.parse(snap);
        card!.options[0].apply(cc, r);
        expect(cc.team).not.toBe(c.team);
        seen.add(cc.team);
      }
      expect(seen.size).toBe(31);
    }
  }, 120_000);

  it('NFL: a man with no contract is not dealt a trade card', () => {
    const free = careerOf(NFL_CAREER_SPORT, 4, 0, { morale: 40, contractYears: 0, age: 27 });
    const ids = deckOf(NFL_CAREER_SPORT, free).map(e => e.id);
    expect(ids).not.toContain('frustration');
    expect(ids).not.toContain('lifeB_partnerCity');
    expect(ids).not.toContain('lifeB_parentHome');
    const signed = deckOf(NFL_CAREER_SPORT, { ...free, contractYears: 2 }).map(e => e.id);
    expect(signed).toContain('frustration');
  });

  it('NHL: a requested trade never lands on the club he is at', () => {
    const c = careerOf(NHL_CAREER_SPORT, 2, 0, { morale: 30 });
    const trade = deckOf(NHL_CAREER_SPORT, c).flatMap(e => e.options).find(o => o.label === 'Request a trade');
    expect(trade, 'the trade option is in the deck').toBeTruthy();
    const r = keyedStream('nhl-trade');
    const snap = JSON.stringify(c);
    for (let i = 0; i < 800; i += 1) {
      const cc = JSON.parse(snap);
      trade!.apply(cc, r);
      expect(cc.team).not.toBe(c.team);
    }
  }, 120_000);
});

describe('Round 1104: Brand work pays the bank', () => {
  it('banks the fee in the era money and says what it paid', () => {
    for (const [eraIdx, fee] of [[0, 3], [1, 1]] as const) {
      const c = careerOf(NFL_CAREER_SPORT, 1, eraIdx, { netWorth: 2, earnings: 10 });
      const brand = cardOf(NFL_CAREER_SPORT, c, 'training')!.options.find(o => o.label === 'Brand work')!;
      const line = brand.apply(c, keyedStream('brand'));
      expect(c.netWorth).toBe(2 + fee);
      expect(c.earnings).toBe(10 + fee);
      expect(line).toBe(`Fanbase +12 and a ${fee}M endorsement, banked.`);
    }
  });
});

describe('Round 1104: the franchise record card claims nothing it did not compute', () => {
  const CARDS: [UsCareerSport, string, Record<string, unknown>][] = [
    [NFL_CAREER_SPORT, 'lifeB_franchiseRecord', { ovr: 90, pot: 95 }],
    [NBA_CAREER_SPORT, 'nbaB_franchiseRecord', { ovr: 90, pot: 95 }],
    [MLB_CAREER_SPORT, 'mlbB_franchiseRecord', { ovr: 90, pot: 95 }],
    [NHL_CAREER_SPORT, 'nhlB_franchiseRecordChase', { ovr: 90, pot: 95 }],
  ];
  for (const [sport, id, over] of CARDS) {
    it(`${sport.label}: no number, no week or game, no standings`, () => {
      let card;
      for (let seasons = 8; seasons <= 12 && !card; seasons += 1) {
        const c = careerOf(sport, seasons, 0, over);
        /* One club all the way, so the franchise totals the card gates on are there. */
        for (const s of c.seasons) s.team = c.team;
        card = cardOf(sport, c, id);
      }
      expect(card, `${id} is dealt to a long serving star`).toBeTruthy();
      const words = `${card!.title} ${card!.body} ${card!.options.map(o => `${o.label} ${o.effect}`).join(' ')}`;
      expect(card!.title).not.toMatch(/\d/);
      expect(words).not.toMatch(/Week \d|Game \d|seed|clinched|locked|January|April|October/);
    });
  }
});

describe('Round 1104: the NBA snub card', () => {
  it('reads his own scoring and is not dealt to a man honoured last season', () => {
    const c = careerOf(NBA_CAREER_SPORT, 4, 0, { ovr: 88, pot: 92 });
    const last = c.seasons[c.seasons.length - 1];
    last.awards = [];
    const card = cardOf(NBA_CAREER_SPORT, c, 'nbaB_allStarSnub');
    expect(card).toBeTruthy();
    expect(card!.body).toContain(`${last.ppg} points a night`);
    expect(card!.body).not.toContain('24 and 7');
    last.awards = ['MVP'];
    expect(cardOf(NBA_CAREER_SPORT, c, 'nbaB_allStarSnub')).toBeUndefined();
  });
});

describe('Round 1104: the founder is dealt only to a bank that covers his check', () => {
  const CASES: [UsCareerSport, string, number][] = [
    [NFL_CAREER_SPORT, 'lifeB_techPitch', 1.5],
    [NBA_CAREER_SPORT, 'nbaB_techPitch', 2],
    [NHL_CAREER_SPORT, 'nhlB_techPitch', 0.5],
  ];
  for (const [sport, id, price] of CASES) {
    it(`${sport.label}: dealt at ${price}M, not a dime under`, () => {
      const c = careerOf(sport, 4, 0, { age: 27 });
      expect(cardOf(sport, { ...c, netWorth: price }, id), 'dealt when the bank covers it').toBeTruthy();
      expect(cardOf(sport, { ...c, netWorth: Math.round((price - 0.1) * 10) / 10 }, id), 'held out a dime short').toBeUndefined();
    });
  }
});
