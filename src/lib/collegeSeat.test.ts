import { describe, expect, it } from 'vitest';
import {
  bracketOutcome, championOf, collegeAsk, collegeBid, collegePace, collegeBidKey, collegeClose, collegeFeedKey, collegeMarket,
  collegeMarketLine, collegeNextYear, collegePack, collegeSeatLoad, collegeSeatTeams, collegeSitOut, collegeTakeJob,
  collegeTiers, formerFirers, holdsSeat, isFired, lastGraded, newCollegeSeat, sanitizeCollegeSeat, COLLEGE_ASK_TILT,
  type CollegeLeagueView, type CollegeSeatBlock,
} from '@/lib/collegeSeat';
import { seatNextYear, endSeatStint, poachBid, seatOffers, type GmCareer, type SeatStint } from '@/lib/gmSeat';
import { keyedRng } from '@/lib/keyedRng';
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
    expect(COLLEGE_ASK_TILT.cfb).toEqual({ title: -1, contend: -1, playoffs: -1 });
    /* p12's roster is the weakest of the twenty: football asks it to rebuild, basketball one step more */
    expect(collegeAsk(view({ sport: 'cfb', myTeam: 'p12' }), 2026).tier).toBe('rebuild');
    expect(collegeAsk(view({ sport: 'cbb', myTeam: 'p12' }), 2026).tier).toBe('respect');
    const top = view({ sport: 'cbb', myTeam: 'p00' });
    /* the best roster: basketball asks for the title, football one step less (a single elimination field of 12) */
    expect(collegeAsk(top, 2026).tier).toBe('title');
    expect(collegeAsk({ ...top, sport: 'cfb' }, 2026).tier).toBe('contend');
  });
});

describe('the live line', () => {
  it('words a win total ask in college words, one win as one win', () => {
    const b: CollegeSeatBlock = { ...newCollegeSeat(view()), mandate: { tier: 'respect', text: 'Win 6 games.', winFloor: 6, reqLevel: 0, season: 2026 } };
    const withWins = (wins: number, round: number) => {
      const v = view({ round });
      return { ...v, programs: v.programs.map(p => (p.id === 'p00' ? { ...p, wins } : p)) };
    };
    expect(collegePace(b, withWins(1, 3))).toEqual({ onTrack: true, line: '1 win so far, on pace for the ask.' });
    expect(collegePace(b, withWins(0, 7))).toEqual({ onTrack: false, line: '0 wins so far, behind the pace for 6 wins.' });
    expect(collegePace(b, withWins(4, 7))!.line).toBe('4 wins so far, on pace for the ask.');
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

/* This game's wider rule: a program that let him go never calls again, in the market or with a buyout.
   gmSeat's own rule drops only the last program (seatOffers) and no former one (poachBid), so these cases
   are a coach let go twice, or let go and then winning one tier below the program that let him go, with the
   keyed draw holding the first program. Every pair is tried and the draws are keyed, so the cases are the
   same on every run, and each test refuses to pass without meeting one. */
describe('a program that let him go never calls again', () => {
  for (const sport of ['cfb', 'cbb'] as const) {
    const base = view({ sport, fieldSize: sport === 'cfb' ? 12 : 32 });
    const tiers = collegeTiers(base);
    const at = (myTeam: string) => closed({ ...base, myTeam, season: 2031 });

    it(`${sport}: the market drops the first program that let him go when gmSeat draws it`, () => {
      let drawnFirst = 0;
      for (const a of base.programs) {
        for (const b of base.programs) {
          if (a.id === b.id) continue;
          const v = at(b.id);
          const career: GmCareer = { version: 1, seasonsOut: 0, stints: [
            { team: a.id, tier: tiers.get(a.id)!, from: 2026, grades: ['title', 'overachieved', 'met', 'missed', 'badly'], ended: 'fired' },
            { team: b.id, tier: tiers.get(b.id)!, from: 2031, grades: ['missed'], ended: 'fired' },
          ] };
          const m = collegeMarket({ v: 1, career, trust: 0, mandate: null }, v)!;
          for (const o of m.offers) expect([a.id, b.id]).not.toContain(o.teamId);
          const drawn = seatOffers(collegePack(sport), collegeSeatTeams(v), career, 2032, keyedRng(collegeFeedKey(v, career)), championOf(v, 2031));
          if (drawn.some(o => o.teamId === a.id)) {
            drawnFirst += 1;
            expect(m.removed).toBe(drawn.filter(o => o.teamId === a.id).length);
          }
        }
      }
      expect(drawnFirst, 'no twice fired market drew the first program that let him go, so the rule went untested').toBeGreaterThan(0);
    });

    it(`${sport}: a buyout bid from a program that let him go is dropped, and the same bid stands without that past`, () => {
      let dropped = 0;
      for (const b of base.programs) {
        if (tiers.get(b.id) === 1) continue;
        for (let k = 1; k <= 6; k += 1) {
          const v = at(b.id);
          const own: SeatStint = { team: b.id, tier: tiers.get(b.id)!, from: 2032 - k, grades: [...Array(k - 1).fill('met'), 'title'] };
          const alone: GmCareer = { version: 1, seasonsOut: 0, stints: [own] };
          const raw = poachBid(collegePack(sport), collegeSeatTeams(v), alone, 2032, keyedRng(collegeBidKey(v, alone)), championOf(v, 2031));
          if (!raw) continue;
          expect(collegeBid({ v: 1, career: alone, trust: 70, mandate: null }, v)?.teamId).toBe(raw.teamId);
          const career: GmCareer = { version: 1, seasonsOut: 0, stints: [
            { team: raw.teamId, tier: tiers.get(raw.teamId)!, from: 2029 - k, grades: ['missed', 'badly', 'badly'], ended: 'fired' }, own,
          ] };
          expect(poachBid(collegePack(sport), collegeSeatTeams(v), career, 2032, keyedRng(collegeBidKey(v, career)), championOf(v, 2031))?.teamId).toBe(raw.teamId);
          expect(collegeBid({ v: 1, career, trust: 70, mandate: null }, v)).toBeNull();
          dropped += 1;
        }
      }
      expect(dropped, 'no keyed draw bid from a program that let him go, so the rule went untested').toBeGreaterThan(0);
    });
  }
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
  it('keeps a coach who just moved: a job taken at a close starts the season after the one on record', () => {
    /* Take the job (or Go to) at the close of 2026 writes a stint from 2027 while st.season is still 2026:
       the trail does not move the season, the offseason does. A reload on that trail must keep him. */
    const moved = good();
    moved.career.stints = [
      { team: 'p05', tier: 1, from: 2024, grades: ['missed', 'badly', 'badly'], ended: 'fired' },
      { team: 'p00', tier: 1, from: 2027, grades: [] },
    ];
    moved.mandate = { ...moved.mandate, season: 2027 };
    const kept = sanitizeCollegeSeat(moved, ctx);
    expect(kept).not.toBeNull();
    expect(kept!.career.stints[1].from).toBe(2027);
    const tooLate = JSON.parse(JSON.stringify(moved));
    tooLate.career.stints[1].from = 2028;
    expect(sanitizeCollegeSeat(tooLate, ctx)).toBeNull();
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
