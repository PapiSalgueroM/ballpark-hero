import { describe, expect, it } from 'vitest';
import {
  bracketOutcome, collegeAsk, collegeBid, collegeClose, collegeMarket, collegeMarketLine, collegeNextYear,
  collegeSeatLoad, collegeSitOut, collegeTakeJob, formerFirers, holdsSeat, isFired, lastGraded, newCollegeSeat,
  sanitizeCollegeSeat, COLLEGE_ASK_TILT,
  type CollegeLeagueView, type CollegeSeatBlock,
} from '@/lib/collegeSeat';
import { seatNextYear, endSeatStint, type GmCareer } from '@/lib/gmSeat';
import { gradeSeason, FO_TRUST_START } from '@/lib/foOwnerMandate';

/** Twenty programs: prestige falls with the letter, roster strength runs the other way for the last eight. */
function view(over: Partial<CollegeLeagueView> = {}): CollegeLeagueView {
  const programs = Array.from({ length: 20 }, (_, i) => ({
    id: `p${String(i).padStart(2, '0')}`, name: `Program ${i}`,
    strength: i < 12 ? 90 - i : 60 + i, prestige: 95 - i, wins: 6, losses: 6,
  }));
  return {
    sport: 'cfb', season: 2026, round: 1, rounds: 12, myTeam: 'p00', programs,
    champions: [], place: 3, fieldSize: 12, ...over,
  };
}
const closed = (v: CollegeLeagueView, champ = 'p01'): CollegeLeagueView => ({ ...v, champions: [...v.champions, { season: v.season, team: champ }] });
const miss = { wins: 2, madePlayoffs: false, roundsWon: 0, reachedFinal: false, wonTitle: false };
const won = { wins: 12, madePlayoffs: true, roundsWon: 3, reachedFinal: true, wonTitle: true };

describe('the ask', () => {
  it('is built off the roster rank, not the prestige rank', () => {
    const v = view({ myTeam: 'p19' });
    /* p19 has the lowest prestige but a roster stronger than eleven programs */
    const a = collegeAsk(v, 2026);
    expect(a.tier).not.toBe('rebuild');
    expect(a.text).not.toMatch(/ownership|franchise|\{/i);
  });
  it('lifts a CBB win total ask one step, and nothing else', () => {
    expect(COLLEGE_ASK_TILT.cfb).toEqual([]);
    /* p12's roster is the weakest of the twenty: football asks it to rebuild, basketball one step more */
    expect(collegeAsk(view({ sport: 'cfb', myTeam: 'p12' }), 2026).tier).toBe('rebuild');
    expect(collegeAsk(view({ sport: 'cbb', myTeam: 'p12' }), 2026).tier).toBe('respect');
    const top = view({ sport: 'cbb', myTeam: 'p00' });
    expect(collegeAsk(top, 2026).tier).toBe(collegeAsk({ ...top, sport: 'cfb' }, 2026).tier);
  });
});

describe('the close', () => {
  it('grades with gradeSeason, moves trust, and grades a season once', () => {
    const v = view();
    const b = newCollegeSeat(v);
    const res = collegeClose(b, closed(v), miss)!;
    expect(res.grade.result).toBe(gradeSeason(res.mandate, miss).result);
    expect(res.block.trust).toBe(Math.max(0, FO_TRUST_START + res.grade.trustDelta));
    expect(lastGraded(res.block)).toBe(2026);
    expect(collegeClose(res.block, closed(v), miss)).toBeNull();
  });
  it('fires at zero trust and opens a market instead of ending', () => {
    const v = closed(view());
    const b: CollegeSeatBlock = { ...newCollegeSeat(view()), trust: 10 };
    const res = collegeClose(b, v, miss)!;
    expect(res.fired).toBe(true);
    expect(isFired(res.block)).toBe(true);
    expect(holdsSeat(res.block)).toBe(false);
    const m = collegeMarket(res.block, v);
    expect(m).not.toBeNull();
    expect(['offers', 'quiet', 'closed']).toContain(m!.state);
    expect(JSON.stringify(collegeMarket(JSON.parse(JSON.stringify(res.block)), v))).toBe(JSON.stringify(m));
  });
  it('reads the bracket: the final and the title from the last game', () => {
    const g = [{ home: 'a', away: 'me', winner: 'me' }, { home: 'me', away: 'b', winner: 'me' }, { home: 'c', away: 'me', winner: 'c' }];
    expect(bracketOutcome(g, 'me', 9)).toEqual({ wins: 9, madePlayoffs: true, roundsWon: 2, reachedFinal: true, wonTitle: false });
    expect(bracketOutcome(g, 'x', 4)).toEqual({ wins: 4, madePlayoffs: false, roundsWon: 0, reachedFinal: false, wonTitle: false });
  });
});

describe('the market and the move', () => {
  it('never offers a program that let him go, and a second press takes nothing', () => {
    const v = closed(view({ myTeam: 'p05' }));
    let b: CollegeSeatBlock = { ...newCollegeSeat(view({ myTeam: 'p05' })), trust: 1 };
    b = collegeClose(b, v, miss)!.block;
    for (let out = 0; out < 3; out++) {
      const m = collegeMarket(b, v)!;
      for (const o of m.offers) expect(formerFirers(b.career).has(o.teamId)).toBe(false);
      if (m.offers.length) {
        const move = collegeTakeJob(b, v, m.offers[0].teamId, 'market')!;
        expect(move.block.trust).toBe(FO_TRUST_START);
        expect(move.block.career.stints[move.block.career.stints.length - 1].from).toBe(2027);
        expect(collegeTakeJob(move.block, v, m.offers[0].teamId, 'market')).toBeNull();
        return;
      }
      if (m.nextYear === 'shut') return;
      b = collegeSitOut(b, v);
    }
  });
  it('reads a climb as shut: a program never changes tier here', () => {
    const career: GmCareer = endSeatStint({ version: 1, seasonsOut: 2, stints: [{ team: 'old', tier: 4, from: 1, grades: ['badly', 'badly'] }] }, 'fired');
    for (let tier = 1; tier <= 4; tier++) {
      const tiers = new Map([['old', tier as 1 | 2 | 3 | 4]]);
      const s = seatNextYear(career, tiers);
      const c = collegeNextYear(career, tiers);
      expect(c.nextYear).toBe(s.nextYear === 'climb' ? 'shut' : s.nextYear);
    }
  });
  it('bids only after a big year, never at the top tier', () => {
    const v = closed(view({ myTeam: 'p00' }), 'p00');
    const res = collegeClose(newCollegeSeat(view({ myTeam: 'p00' })), v, won)!;
    expect(res.grade.result).toBe('title');
    expect(collegeBid(res.block, v)).toBeNull();
  });
  it('says the closed market plainly, with no article before a program', () => {
    const career = endSeatStint({ version: 1, seasonsOut: 0, stints: [{ team: 'p05', tier: 2, from: 2024, grades: ['missed', 'badly', 'badly'] }] }, 'fired');
    const line = collegeMarketLine(career, 'closed', 'shut', 0, 'Boise State');
    expect(line).toContain('let you go after 3 seasons and no titles at Boise State');
    expect(line).toContain('A new dynasty is the way back in.');
    expect(line).not.toContain('the Boise State');
    expect(line).not.toContain(String.fromCharCode(0x2013));
    expect(line).not.toContain(String.fromCharCode(0x2014));
  });
});

describe('the save', () => {
  const ids = new Set(view().programs.map(p => p.id));
  const ctx = { season: 2026, myTeam: 'p00', programIds: ids };
  const good = () => JSON.parse(JSON.stringify(newCollegeSeat(view())));
  it('keeps a sane block and refuses a hostile one', () => {
    expect(sanitizeCollegeSeat(good(), ctx)).not.toBeNull();
    for (const bad of [
      { ...good(), trust: 140 }, { ...good(), trust: -5 }, { ...good(), trust: '60' }, { ...good(), v: 2 },
      { ...good(), career: { version: 1, stints: [], seasonsOut: 0 } },
      { ...good(), mandate: { ...good().mandate, season: 2020 } },
      null, 'seat', 42,
    ]) expect(sanitizeCollegeSeat(bad, ctx)).toBeNull();
    expect(sanitizeCollegeSeat(good(), { ...ctx, myTeam: 'p03' })).toBeNull();
    const twoStints = good();
    twoStints.career.stints = [{ team: 'p04', tier: 1, from: 2026, grades: [], ended: 'fired' }, { team: 'p00', tier: 1, from: 2025, grades: [] }];
    expect(sanitizeCollegeSeat(twoStints, ctx)).toBeNull();
    const stranger = good();
    stranger.career.stints[0].team = 'nobody';
    expect(sanitizeCollegeSeat(stranger, { ...ctx, myTeam: 'nobody' })).toBeNull();
  });
  it('opens where the load rules say', () => {
    const seat = newCollegeSeat(view());
    const fired: CollegeSeatBlock = { ...seat, career: endSeatStint(seat.career, 'fired'), mandate: null };
    expect(collegeSeatLoad(fired, 'recap', true)).toEqual({ dropSeat: false, open: 'market' });
    expect(collegeSeatLoad(fired, 'season', true)).toEqual({ dropSeat: false, open: 'market' });
    expect(collegeSeatLoad(fired, 'market', true)).toEqual({ dropSeat: false, open: 'market' });
    expect(collegeSeatLoad(fired, 'recruit', true)).toEqual({ dropSeat: true, open: null });
    expect(collegeSeatLoad(fired, 'season', false)).toEqual({ dropSeat: true, open: null });
    expect(collegeSeatLoad(fired, 'market', false)).toEqual({ dropSeat: true, open: 'season' });
    expect(collegeSeatLoad(seat, 'market', true)).toEqual({ dropSeat: false, open: 'recruit' });
    expect(collegeSeatLoad(null, 'market', false)).toEqual({ dropSeat: false, open: 'season' });
    expect(collegeSeatLoad(seat, 'season', false)).toEqual({ dropSeat: false, open: null });
  });
});
