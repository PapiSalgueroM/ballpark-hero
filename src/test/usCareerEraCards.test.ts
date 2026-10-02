/**
 * Round 833: the contract rule cards wait for their rule, and pay the era's money.
 *
 * The NBA supermax card and the MLB qualifying offer card had no era gate, so
 * a 2003-04 NBA throwback could be offered a supermax years before the 2017
 * CBA created it, and a 2004 MLB throwback a qualifying offer before the
 * system began after the 2012 season. Both cards, and the NFL franchise tag
 * card, also priced the deal in 2026 money while every other contract in a
 * throwback career is scaled by the era (0.31 NBA, 0.43 MLB, 0.32 NFL).
 *
 * Forced cases put a career exactly on the card's own conditions one year
 * either side of the gate; seeded careers then play the throwback eras through
 * the real engines and draw the real deck every offseason.
 *
 * scripts/simUsCareerDefects.mjs runs this file against copies of the decks
 * with the gate taken out (supermaxera, qoera) or the scale taken out
 * (unscaled) and requires it to go red.
 */
import { describe, expect, it } from 'vitest';
import { getNbaLifeEventsB, NBA_SUPERMAX_FIRST_YEAR } from '@/lib/nbaCareerLifeB';
import { getMlbLifeEventsB, MLB_QO_FIRST_YEAR } from '@/lib/mlbCareerLifeB';
import { getNflLifeEventsB } from '@/lib/nflCareerLifeB';
import {
  NBA_ARCHETYPES, startNbaCareer, simNbaSeason, nbaProgress, nbaShouldRetire, type NbaCareerPos,
} from '@/lib/nbaMyCareer';
import {
  MLB_ARCHETYPES, startMlbCareer, simMlbSeason, mlbProgress, mlbShouldRetire, type MlbCareerPos,
} from '@/lib/mlbMyCareer';
import { ARCHETYPES, startCareer } from '@/lib/nflMyCareer';

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const card = <E extends { id: string }>(deck: E[], id: string): E | undefined => deck.find(e => e.id === id);

describe('the sources behind the gates', () => {
  it('holds the first seasons the real rules existed', () => {
    /* The supermax: 2017 CBA, first signed July 1, 2017. The qualifying
       offer: first made after the 2012 season, so the 2013 career year. */
    expect(NBA_SUPERMAX_FIRST_YEAR).toBe(2017);
    expect(MLB_QO_FIRST_YEAR).toBe(2013);
  });
});

describe('NBA supermax', () => {
  const eligible = (eraId: string | undefined, year: number) => {
    const c = startNbaCareer('Era Test', 'SG', NBA_ARCHETYPES.SG[0], mulberry32(1), null, eraId);
    c.year = year; c.age = 28; c.ovr = 90; c.pot = 95; c.contractYears = 1; c.mvps = 1;
    return c;
  };

  it('waits for the 2017 offseason in a 2003-04 career and pays 2003 money', () => {
    expect(card(getNbaLifeEventsB(eligible('y2004', 2016), mulberry32(2)), 'nbaB_supermax')).toBeUndefined();
    const offered = card(getNbaLifeEventsB(eligible('y2004', 2017), mulberry32(2)), 'nbaB_supermax');
    expect(offered).toBeDefined();
    /* max(38, (90 - 62) * 1.95) = 54.6 in 2026 money, times the 0.31 scale. */
    expect(offered!.title).toBe('The supermax is on the table at 16.9M');
    const signed = eligible('y2004', 2017);
    offered!.options[0].apply(signed, mulberry32(3));
    expect(signed.salary).toBe(16.9);
  });

  it('is unchanged in a 2026 career', () => {
    const offered = card(getNbaLifeEventsB(eligible(undefined, 2026), mulberry32(2)), 'nbaB_supermax');
    expect(offered?.title).toBe('The supermax is on the table at 54.6M');
  });

  it('never reaches a seeded 2003-04 career before 2017, and does after', () => {
    const POS: NbaCareerPos[] = ['PG', 'SG', 'SF', 'PF', 'C'];
    let before = 0, after = 0, offseasons = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const r = mulberry32(833_100 + seed);
      const pos = POS[seed % POS.length];
      const c = startNbaCareer(`Era ${seed}`, pos, NBA_ARCHETYPES[pos][seed % NBA_ARCHETYPES[pos].length], r, null, 'y2004');
      for (let y = 0; y < 21 && !nbaShouldRetire(c); y++) {
        simNbaSeason(c, 82, r); nbaProgress(c, r);
        offseasons += 1;
        /* The deck draws on its own stream so the career's never moves. */
        if (card(getNbaLifeEventsB(c, mulberry32(seed * 1000 + y)), 'nbaB_supermax')) {
          if (c.year < NBA_SUPERMAX_FIRST_YEAR) before += 1; else after += 1;
        }
      }
    }
    console.log(`NBA 2003-04: ${offseasons} offseasons, supermax drawable ${before} times before 2017 and ${after} after`);
    expect(before).toBe(0);
    expect(after).toBeGreaterThan(0);
  });
});

describe('MLB qualifying offer', () => {
  const eligible = (eraId: string | undefined, year: number) => {
    const c = startMlbCareer('Era Test', 'SS', MLB_ARCHETYPES.SS[0], mulberry32(1), null, eraId);
    c.year = year; c.age = 30; c.ovr = 85; c.pot = 90; c.contractYears = 0;
    for (let i = 0; i < 6; i++) c.seasons.push({ year: year - 6 + i, team: c.team, age: 24 + i, ovr: 80, games: 150, awards: [], teamResult: 'Missed October', salary: 1 });
    return c;
  };

  it('waits for the offseason after the 2012 season in a 2004 career and pays 2004 money', () => {
    expect(card(getMlbLifeEventsB(eligible('y2004', 2012), mulberry32(2)), 'mlbB_qualifyingOffer')).toBeUndefined();
    const offered = card(getMlbLifeEventsB(eligible('y2004', 2013), mulberry32(2)), 'mlbB_qualifyingOffer');
    expect(offered).toBeDefined();
    /* 21M in 2026 money, times the 0.43 scale. */
    expect(offered!.title).toBe('The qualifying offer is 9M');
    const took = eligible('y2004', 2013);
    offered!.options[0].apply(took, mulberry32(3));
    expect(took.salary).toBe(9);
    /* The market side of the card is the era's money too, and since the
       review it is the engine's own market (mlbMarketSalary: the shortstop's
       1.2 and the 0.43 scale, 13.2M), so the extension is 13.2 * 0.95. The
       unscaled copy it replaced paid 24.2M at this rating. */
    const extended = eligible('y2004', 2013);
    offered!.options[2].apply(extended, mulberry32(3));
    expect(extended.salary).toBe(12.5);
  });

  it('is unchanged in a 2026 career', () => {
    const offered = card(getMlbLifeEventsB(eligible(undefined, 2027), mulberry32(2)), 'mlbB_qualifyingOffer');
    expect(offered?.title).toBe('The qualifying offer is 21.4M');
  });

  it('never reaches a seeded 2004 career before 2013, and does after', () => {
    const POS: MlbCareerPos[] = ['SS', 'CF', '1B', 'C', 'SP', 'RP', 'DH', '3B'];
    let before = 0, after = 0, offseasons = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const r = mulberry32(833_200 + seed);
      const pos = POS[seed % POS.length];
      const c = startMlbCareer(`Era ${seed}`, pos, MLB_ARCHETYPES[pos][seed % MLB_ARCHETYPES[pos].length], r, null, 'y2004');
      for (let y = 0; y < 21 && !mlbShouldRetire(c); y++) {
        simMlbSeason(c, 82, r); mlbProgress(c, r);
        offseasons += 1;
        if (card(getMlbLifeEventsB(c, mulberry32(seed * 1000 + y)), 'mlbB_qualifyingOffer')) {
          if (c.year < MLB_QO_FIRST_YEAR) before += 1; else after += 1;
        }
      }
    }
    console.log(`MLB 2004: ${offseasons} offseasons, qualifying offer drawable ${before} times before 2013 and ${after} after`);
    expect(before).toBe(0);
    expect(after).toBeGreaterThan(0);
  });
});

describe('NFL franchise tag', () => {
  const eligible = (eraId: string | undefined) => {
    const c = startCareer('Era Test', 'QB', ARCHETYPES.QB[0], mulberry32(1), null, eraId);
    c.age = 28; c.ovr = 90; c.pot = 94; c.contractYears = 0;
    return c;
  };

  it('pays 2005 money in a 2005 career', () => {
    const tag = card(getNflLifeEventsB(eligible('y2005'), mulberry32(2)), 'lifeB_franchiseTag');
    /* (90 - 64) * 1.55 * 1.9 = 76.6 in 2026 money, times the 0.32 scale. */
    expect(tag?.title).toBe('Tagged at 24.5M');
  });

  it('is unchanged in a 2026 career', () => {
    const tag = card(getNflLifeEventsB(eligible(undefined), mulberry32(2)), 'lifeB_franchiseTag');
    expect(tag?.title).toBe('Tagged at 76.6M');
  });
});
