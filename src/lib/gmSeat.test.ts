import { describe, expect, it } from 'vitest';
import {
  seatMandate, seatGrade, leagueTiers, careerProfile, seatOffers, poachBid, takeSeat,
  newGmCareer, recordSeatSeason, endSeatStint, sitOutYear, startSeatStint, sanitizeGmCareer,
  seatFiredLine, fillSeatWords, BADLY_FIRED_CEILING, type GmCareer, type SeatTeam,
} from '@/lib/gmSeat';
import { buildOwnerMandate, gradeSeason, FO_TRUST_START, type FoGradeResult } from '@/lib/foOwnerMandate';
import { GM_SEAT_PACKS } from '@/data/gmSeat/packs';

const seeded = (s: number) => {
  let x = (s >>> 0) || 1;
  return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
};
const league = (n: number): SeatTeam[] =>
  Array.from({ length: n }, (_, i) => ({ id: `T${String(i).padStart(2, '0')}`, name: `Team ${i}`, strength: 100 - i }));
const career = (team: string, tier: 1 | 2 | 3 | 4, grades: FoGradeResult[], ended?: 'fired' | 'walked'): GmCareer => {
  let c = newGmCareer(team, tier, 2026);
  for (const g of grades) c = recordSeatSeason(c, g);
  return ended ? endSeatStint(c, ended) : c;
};
const PACKS = Object.values(GM_SEAT_PACKS);

describe('seat words', () => {
  it('keeps the ladder of buildOwnerMandate at every rank and changes only the words', () => {
    for (const pack of PACKS) {
      for (const champ of [false, true]) {
        for (let rank = 1; rank <= 30; rank++) {
          const base = buildOwnerMandate(rank, 30, champ, pack.words, 2026);
          const mine = seatMandate(pack, rank, 30, champ, 2026);
          expect({ ...mine, text: '' }).toEqual({ ...base, text: '' });
          expect(mine.text).not.toMatch(/[{}]/);
          expect(mine.text).not.toMatch(/[–—]/);
        }
      }
    }
  });

  it('never calls a program, a club or a gym a franchise owned by ownership', () => {
    for (const pack of PACKS.filter(p => p.seat !== 'franchise')) {
      for (let rank = 1; rank <= 30; rank++) {
        expect(seatMandate(pack, rank, 30, rank === 3, 2026).text).not.toMatch(/ownership|franchise/i);
      }
    }
  });

  it('grades exactly as gradeSeason does, with the seat verdict', () => {
    const m = seatMandate(GM_SEAT_PACKS.afl, 1, 6, false, 2026);
    const out = { wins: 3, madePlayoffs: false, roundsWon: 0, reachedFinal: false, wonTitle: false };
    const g = seatGrade(GM_SEAT_PACKS.afl, m, out);
    expect(g.result).toBe(gradeSeason(m, out).result);
    expect(g.trustDelta).toBe(gradeSeason(m, out).trustDelta);
    expect(g.verdict).toContain('board');
  });

  it('leaves an unknown placeholder visible', () => {
    expect(fillSeatWords('Win {nope}.', GM_SEAT_PACKS.nfl)).toBe('Win {nope}.');
  });
});

describe('the market', () => {
  it('tiers a league in quarters by strength', () => {
    const t = leagueTiers(league(32));
    expect([...t.values()].filter(v => v === 1)).toHaveLength(8);
    expect(t.get('T00')).toBe(1);
    expect(t.get('T31')).toBe(4);
    expect([...leagueTiers(league(6)).values()]).toEqual([1, 1, 2, 3, 3, 4]);
  });

  it('reads a firing after a badly season as the worst exit, and caps the record fields', () => {
    const c = career('T00', 1, ['title', 'badly', 'badly', 'badly', 'badly'], 'fired');
    const p = careerProfile(c, leagueTiers(league(32)));
    expect(p.departure).toBe('relegated');
    expect(p.relegations).toBe(3);
    expect(p.managerTrophies).toBe(1);
    expect(careerProfile(career('T00', 1, ['missed'], 'fired'), leagueTiers(league(32))).departure).toBe('sacked');
  });

  it('never offers the club that let you go, and never a top tier after a badly firing', () => {
    const teams = league(32);
    const c = career('T00', 1, ['title', 'title', 'title', 'title', 'title', 'badly', 'badly', 'badly', 'badly'], 'fired');
    for (let s = 1; s <= 300; s++) {
      for (const o of seatOffers(GM_SEAT_PACKS.nfl, teams, c, 2035, seeded(s))) {
        expect(o.teamId).not.toBe('T00');
        expect(o.tier).toBeGreaterThanOrEqual(BADLY_FIRED_CEILING);
      }
    }
  });

  it('always has an offer at his level or above for a title winner who walks', () => {
    const teams = league(30);
    const c = career('T01', 1, ['title'], 'walked');
    for (let s = 1; s <= 300; s++) {
      const feed = seatOffers(GM_SEAT_PACKS.nba, teams, c, 2027, seeded(s));
      expect(feed.some(o => o.tier <= 1)).toBe(true);
    }
  });

  it('only makes college bids, only upward, and only after a big year', () => {
    const teams = league(40);
    const big = career('T20', 3, ['title']);
    let bids = 0;
    for (let s = 1; s <= 200; s++) {
      expect(poachBid(GM_SEAT_PACKS.nfl, teams, big, 2027, seeded(s))).toBeNull();
      expect(poachBid(GM_SEAT_PACKS.cfb, teams, career('T20', 3, ['met']), 2027, seeded(s))).toBeNull();
      const bid = poachBid(GM_SEAT_PACKS.cfb, teams, big, 2027, seeded(s));
      if (bid) { bids++; expect(bid.tier).toBe(2); expect(bid.buyout).toBe(true); }
    }
    expect(bids).toBeGreaterThan(0);
  });
});

describe('taking the job and the save block', () => {
  it('keeps the league and its history when the seat moves', () => {
    const lg = { season: 2031, champions: [{ season: 2030, team: 'T04' }], history: ['x'] };
    const save = { league: lg, myTeam: 'T00', trust: 0, fired: true, mandate: null, titles: 2 };
    const offer = seatOffers(GM_SEAT_PACKS.nhl, league(32), career('T00', 1, ['title'], 'walked'), 2031, seeded(4))[0];
    const next = takeSeat(save, offer);
    expect(next.league).toBe(lg);
    expect(next.titles).toBe(2);
    expect(next.myTeam).toBe(offer.teamId);
    expect(next.trust).toBe(FO_TRUST_START);
    expect(next.fired).toBe(false);
    expect(next.mandate).toEqual(offer.ask);
  });

  it('round trips a career, rejects a corrupt one, and grows idle time', () => {
    let c = career('T00', 1, ['met', 'missed'], 'fired');
    c = sitOutYear(c);
    expect(c.seasonsOut).toBe(1);
    expect(sanitizeGmCareer(JSON.parse(JSON.stringify(c)))).toEqual(c);
    expect(sanitizeGmCareer({ ...c, stints: [] })).toBeNull();
    expect(sanitizeGmCareer({ ...c, seasonsOut: -1 })).toBeNull();
    expect(sanitizeGmCareer({ ...c, stints: [{ ...c.stints[0], grades: ['great'] }] })).toBeNull();
    expect(sanitizeGmCareer({ ...c, stints: [{ ...c.stints[0], ended: undefined }, c.stints[0]] })).toBeNull();
    expect(sanitizeGmCareer('nope')).toBeNull();
    const offer = { teamId: 'T09', teamName: 'Team 9', tier: 2 as const, ask: seatMandate(GM_SEAT_PACKS.nfl, 9, 32, false, 2028), reason: '', keenness: 50 };
    const moved = startSeatStint(c, offer, 2028);
    expect(moved.stints).toHaveLength(2);
    expect(moved.seasonsOut).toBe(0);
    expect(sanitizeGmCareer(moved)).toEqual(moved);
  });

  it('never promises a call the market did not make', () => {
    const c = career('T00', 1, ['badly'], 'fired');
    expect(seatFiredLine(GM_SEAT_PACKS.nfl, c, 0)).toMatch(/Nobody has called/);
    expect(seatFiredLine(GM_SEAT_PACKS.nfl, c, 2)).toMatch(/2 franchises called/);
    expect(seatFiredLine(GM_SEAT_PACKS.cbb, c, 1)).toMatch(/1 program called/);
  });
});
