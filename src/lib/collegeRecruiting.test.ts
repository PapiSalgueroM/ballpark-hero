/**
 * Round 911. The recruiting trail's rules, one case at a time. The balance
 * (the right pitch, balanced against all NIL, in-state threes against
 * chasing stars) is measured over seeds in scripts/simCollegeRecruiting.mjs;
 * this file holds the mechanics and the save contract.
 */
import { describe, it, expect } from 'vitest';
import {
  CBB_RECRUITING, CFB_RECRUITING, HOURS, OFF_BOARD, BAND_START,
  openPortal, openTrail, pickRivals, portalRisk, reach, runTrailWeek, sanitizeTrail, signingDay,
  type ProgramPitchContext, type RecruitingSchool, type RecruitingSport, type RecruitingTrail,
} from '@/lib/collegeRecruiting';
import { CFB_SCHOOLS, CFB_SCHOOL_STATES, cfbGenName } from '@/lib/cfbDynasty';
import { CBB_SCHOOLS, CBB_SCHOOL_STATES, cbbGenName } from '@/lib/cbbDynasty';

function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CFB: RecruitingSchool[] = CFB_SCHOOLS.map(s => ({ id: s.id, prestige: s.prestige, state: CFB_SCHOOL_STATES[s.id] }));
const CBB: RecruitingSchool[] = CBB_SCHOOLS.map(s => ({ id: s.id, prestige: s.prestige, state: CBB_SCHOOL_STATES[s.id] }));

function ctxFor(schools: RecruitingSchool[], id: string, nilPot = 100): ProgramPitchContext {
  const s = schools.find(x => x.id === id)!;
  return { schoolId: s.id, prestige: s.prestige, state: s.state, winPct: 0.6, coachYears: 3, openSpots: { QB: 1, PG: 1 }, nilPot };
}

function open(sport: RecruitingSport, schools: RecruitingSchool[], id: string, seed: number, nilPot = 100) {
  const rng = mulberry32(seed);
  let n = 0;
  const gen = sport.sport === 'cfb' ? cfbGenName : cbbGenName;
  const ctx = ctxFor(schools, id, nilPot);
  return { t: openTrail(sport, schools, ctx, 2026, { rng, genName: gen, newId: () => `t${++n}` }), ctx, rng };
}

describe('openTrail', () => {
  it('builds a board of the sport size, each band holding the truth at full width', () => {
    for (const [sport, schools, id] of [[CFB_RECRUITING, CFB, 'OSU'], [CBB_RECRUITING, CBB, 'KU']] as const) {
      const { t } = open(sport, schools, id, 7);
      expect(t.recruits).toHaveLength(sport.boardSize);
      expect(t.classCap).toBe(sport.classCap);
      for (const r of t.recruits) {
        expect(r.hi - r.lo).toBe(2 * BAND_START);
        expect(r.trueOvr).toBeGreaterThanOrEqual(r.lo);
        expect(r.trueOvr).toBeLessThanOrEqual(r.hi);
        expect(new Set(r.priorities).size).toBe(3);
        expect(r.rivals).not.toContain(id);
        expect(r.known).toBe(0);
      }
    }
  });

  it('puts the road to the pros first for an elite freshman in a one and done sport', () => {
    let elite = 0;
    for (let seed = 1; seed < 40; seed++) {
      const { t } = open(CBB_RECRUITING, CBB, 'KU', seed);
      for (const r of t.recruits.filter(x => x.trueOvr >= CBB_RECRUITING.eliteLine)) { elite += 1; expect(r.priorities[0]).toBe('pro-path'); }
    }
    expect(elite).toBeGreaterThan(0);
  });
});

describe('runTrailWeek', () => {
  it('never spends more hours than the week has and refuses the rest', () => {
    const { t, ctx, rng } = open(CFB_RECRUITING, CFB, 'MIA', 3);
    const acts = t.recruits.flatMap(r => [{ kind: 'contact' as const, recruitId: r.id }, { kind: 'pitch' as const, recruitId: r.id, priority: r.priorities[0] }]);
    const res = runTrailWeek(CFB_RECRUITING, t, acts, ctx, { home: false, won: false }, CFB, rng);
    expect(res.spent).toBeLessThanOrEqual(t.hoursPerWeek);
    expect(res.spent).toBeGreaterThan(t.hoursPerWeek - HOURS.pitch);
    expect(res.refused).toBeGreaterThan(0);
  });

  it('takes one action of each kind per man per week, and contact tells his next priority', () => {
    const { t, ctx, rng } = open(CFB_RECRUITING, CFB, 'MIA', 4);
    const id = t.recruits[0].id;
    const res = runTrailWeek(CFB_RECRUITING, t, [{ kind: 'contact', recruitId: id }, { kind: 'contact', recruitId: id }], ctx, { home: false, won: false }, CFB, rng);
    expect(res.spent).toBe(HOURS.contact);
    expect(res.refused).toBe(1);
    expect(t.recruits[0].known).toBe(1);
  });

  it('holds the visit limit for the whole cycle', () => {
    const { t, ctx, rng } = open(CFB_RECRUITING, CFB, 'OSU', 5);
    for (let w = 0; w < t.weeks; w++) {
      const acts = t.recruits.map(r => ({ kind: 'visit' as const, recruitId: r.id }));
      runTrailWeek(CFB_RECRUITING, t, acts, ctx, { home: true, won: true }, CFB, rng);
    }
    expect(t.recruits.filter(r => r.visited)).toHaveLength(CFB_RECRUITING.visitLimit);
    expect(t.visitsLeft).toBe(0);
  });

  it('allows one official visit a man, whatever week the second is asked for', () => {
    const { t, ctx, rng } = open(CFB_RECRUITING, CFB, 'OSU', 9);
    const id = t.recruits[0].id;
    const first = runTrailWeek(CFB_RECRUITING, t, [{ kind: 'visit', recruitId: id }], ctx, { home: true, won: true }, CFB, rng);
    expect(first.spent).toBe(HOURS.visit);
    const second = runTrailWeek(CFB_RECRUITING, t, [{ kind: 'visit', recruitId: id }], ctx, { home: true, won: true }, CFB, rng);
    expect(second.spent).toBe(0);
    expect(second.refused).toBe(1);
    expect(t.visitsLeft).toBe(CFB_RECRUITING.visitLimit - 1);
    expect(t.recruits.filter(r => r.visited)).toHaveLength(1);
  });

  it('refuses a NIL offer that is not a number, and spends nothing', () => {
    const { t, ctx, rng } = open(CFB_RECRUITING, CFB, 'OSU', 10);
    const pot = t.nilLeft;
    const res = runTrailWeek(CFB_RECRUITING, t, [{ kind: 'nil', recruitId: t.recruits[0].id, amount: Number.NaN }], ctx, { home: false, won: false }, CFB, rng);
    expect(res.refused).toBe(1);
    expect(res.spent).toBe(0);
    expect(t.nilLeft).toBe(pot);
    expect(t.recruits[0].nilOffer).toBe(0);
    expect(sanitizeTrail(JSON.parse(JSON.stringify(t)), CFB_RECRUITING)).not.toBeNull();
  });

  it('backs a NIL pitch with the money still unspent, not the pot it opened with', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const { t, ctx } = open(CFB_RECRUITING, CFB, 'OSU', seed);
      const r = t.recruits.find(x => x.priorities[0] === 'nil');
      if (!r) continue;
      const gain = (left: number) => {
        const c = JSON.parse(JSON.stringify(t)) as RecruitingTrail;
        c.nilLeft = left;
        const before = c.recruits.find(x => x.id === r.id)!.interest[c.mySchool];
        runTrailWeek(CFB_RECRUITING, c, [{ kind: 'pitch', recruitId: r.id, priority: 'nil' }], ctx, { home: false, won: false }, CFB, mulberry32(seed));
        return c.recruits.find(x => x.id === r.id)!.interest[c.mySchool] - before;
      };
      expect(gain(0)).toBeLessThan(gain(t.nilLeft));
      return;
    }
    throw new Error('no recruit put NIL first in 40 seeds');
  });

  it('refuses a week run under the other sport', () => {
    const { t, ctx, rng } = open(CFB_RECRUITING, CFB, 'OSU', 6);
    const res = runTrailWeek(CBB_RECRUITING, t, [{ kind: 'contact', recruitId: t.recruits[0].id }], ctx, { home: false, won: false }, CFB, rng);
    expect(res.spent).toBe(0);
    expect(t.week).toBe(0);
  });

  it('never lets a NIL offer pass the pot, and pays only my signees', () => {
    const { t, ctx, rng } = open(CFB_RECRUITING, CFB, 'OSU', 8, 60);
    const pot = t.nilLeft;
    for (let w = 0; w < t.weeks; w++) {
      const acts = t.recruits.flatMap(r => [{ kind: 'contact' as const, recruitId: r.id }, { kind: 'nil' as const, recruitId: r.id, amount: 1e6 }]);
      runTrailWeek(CFB_RECRUITING, t, acts, ctx, { home: false, won: false }, CFB, rng);
      expect(t.nilLeft).toBeGreaterThanOrEqual(0);
    }
    expect(t.done).toBe(true);
    expect(t.nilLeft + t.nilPaid).toBe(pot);
    const mine = t.recruits.filter(r => r.signedWith === t.mySchool).reduce((a, r) => a + r.nilOffer, 0);
    expect(t.nilPaid).toBe(mine);
  });
});

describe('signing day', () => {
  it('signs every man exactly once and never past a cap, and a second call changes nothing', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const { t, ctx, rng } = open(CBB_RECRUITING, CBB, 'BAMA', seed);
      for (let w = 0; w < t.weeks; w++) {
        const acts = t.recruits.slice(0, 4).flatMap(r => [{ kind: 'contact' as const, recruitId: r.id }, { kind: 'pitch' as const, recruitId: r.id, priority: r.priorities[0] }]);
        runTrailWeek(CBB_RECRUITING, t, acts, ctx, { home: w % 2 === 0, won: true }, CBB, rng);
      }
      expect(t.recruits.every(r => !!r.signedWith)).toBe(true);
      const count: Record<string, number> = {};
      for (const r of t.recruits) if (r.signedWith !== OFF_BOARD) count[r.signedWith!] = (count[r.signedWith!] ?? 0) + 1;
      for (const [id, c] of Object.entries(count)) { expect(c).toBeLessThanOrEqual(t.classCap); expect(t.commits[id]).toBe(c); }
      const snap = JSON.stringify(t);
      expect(signingDay(t)).toEqual([]);
      expect(JSON.stringify(t)).toBe(snap);
    }
  });
});

describe('sanitizeTrail, the save contract', () => {
  const saved = (): RecruitingTrail => {
    const { t, ctx, rng } = open(CFB_RECRUITING, CFB, 'LOU', 11);
    runTrailWeek(CFB_RECRUITING, t, [{ kind: 'contact', recruitId: t.recruits[0].id }], ctx, { home: false, won: false }, CFB, rng);
    return JSON.parse(JSON.stringify(t));
  };

  it('hands back a valid block unchanged, as a fresh copy', () => {
    const raw = saved();
    const back = sanitizeTrail(raw, CFB_RECRUITING);
    expect(back).toEqual(raw);
    expect(back).not.toBe(raw);
  });

  it('keeps a finished trail and a portal window, each under its own sport', () => {
    const { t, ctx, rng } = open(CBB_RECRUITING, CBB, 'KU', 12);
    for (let w = 0; w < t.weeks; w++) {
      const acts = t.recruits.slice(0, 3).flatMap(r => [
        { kind: 'contact' as const, recruitId: r.id }, { kind: 'nil' as const, recruitId: r.id },
        { kind: 'visit' as const, recruitId: r.id }, { kind: 'pitch' as const, recruitId: r.id, priority: r.priorities[0] },
      ]);
      runTrailWeek(CBB_RECRUITING, t, acts, ctx, { home: true, won: true }, CBB, rng);
    }
    expect(t.done).toBe(true);
    expect(sanitizeTrail(JSON.parse(JSON.stringify(t)), CBB_RECRUITING)).toEqual(t);
    expect(sanitizeTrail(JSON.parse(JSON.stringify(t)), CFB_RECRUITING)).toBeNull();
    let q = 0;
    const p = openPortal(CFB_RECRUITING, [], [], CFB, ctxFor(CFB, 'LOU'), 2026, { rng: mulberry32(4), genName: cfbGenName, newId: () => `q${++q}` });
    expect(sanitizeTrail(JSON.parse(JSON.stringify(p.trail)), CFB_RECRUITING)).toEqual(p.trail);
  });

  it('treats a missing block as no trail', () => {
    expect(sanitizeTrail(undefined, CFB_RECRUITING)).toBeNull();
    expect(sanitizeTrail(null, CFB_RECRUITING)).toBeNull();
    expect(sanitizeTrail('trail', CFB_RECRUITING)).toBeNull();
  });

  it('resets a corrupt block, whatever is wrong with it', () => {
    const breakers: ((t: RecruitingTrail) => void)[] = [
      t => { t.recruits[0].lo = t.recruits[0].trueOvr + 1; },
      t => { (t.recruits[0].priorities as string[])[0] = 'money'; },
      t => { t.recruits[0].priorities[1] = t.recruits[0].priorities[0]; },
      t => { delete (t.recruits[0] as unknown as Record<string, unknown>).nilAsk; },
      t => { t.commits[t.mySchool] = t.classCap + 1; },
      t => { t.recruits[1].id = t.recruits[0].id; },
      t => { t.nilLeft = -1; },
      t => { t.week = t.weeks + 1; },
      t => { (t as { phase: string }).phase = 'summer'; },
      t => { t.recruits[0].interest[t.mySchool] = Number.NaN; },
      /* Fields that are each the right type but disagree with each other. */
      t => { for (const r of t.recruits.slice(0, 5)) r.committedTo = t.mySchool; t.commits = {}; },
      t => { t.recruits[0].committedTo = 'NOT_A_SCHOOL'; t.commits = { NOT_A_SCHOOL: 1 }; },
      t => { t.hoursPerWeek = 1e9; },
      t => { t.visitsLeft = 99; },
      t => { t.recruits[0].visited = true; },
      t => { t.recruits[0].known = 42; },
      t => { t.recruits[0].stars = -4; },
      t => { t.week = t.weeks; },
      t => { (t as { sport: string }).sport = 'cbb'; },
      t => { t.recruits[0].signedWith = t.mySchool; },
      t => { t.nilPaid = 5; },
      t => { t.rivalCap = CFB_RECRUITING.classCap + 1; },
      t => { t.classCap = CFB_RECRUITING.classCap + 1; },
    ];
    for (const breakIt of breakers) {
      const raw = saved();
      breakIt(raw);
      expect(sanitizeTrail(raw, CFB_RECRUITING)).toBeNull();
    }
  });
});

describe('the portal', () => {
  const roster = (sport: RecruitingSport) => sport.positions.flatMap((pos, i) => [
    { id: `s${i}`, name: `S ${i}`, pos, ovr: 80, cls: 'JR', starter: true },
    { id: `b${i}`, name: `B ${i}`, pos, ovr: 78, cls: 'SO', starter: false },
    { id: `x${i}`, name: `X ${i}`, pos, ovr: 82, cls: 'SR', starter: false },
  ]);

  it('never takes a man I sat down with, and the sit down changes nobody else', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const r = roster(CFB_RECRUITING);
      const keep = ['b0', 'b1', 'b2'];
      const deps = () => ({ rng: mulberry32(seed), genName: cfbGenName, newId: () => 'p' });
      const ctx = ctxFor(CFB, 'LOU');
      const none = openPortal(CFB_RECRUITING, r, [], CFB, ctx, 2026, deps());
      const kept = openPortal(CFB_RECRUITING, r, keep, CFB, ctx, 2026, deps());
      expect(kept.lost.some(m => keep.includes(m.id))).toBe(false);
      expect(kept.lost.map(m => m.id)).toEqual(none.lost.filter(m => !keep.includes(m.id)).map(m => m.id));
      expect(none.lost.some(m => m.cls === 'SR')).toBe(false);
    }
  });

  it('keeps no more men than the sport allows sit downs', () => {
    const r = roster(CBB_RECRUITING);
    const out = openPortal(CBB_RECRUITING, r, r.map(m => m.id), CBB, ctxFor(CBB, 'KU'), 2026, { rng: mulberry32(2), genName: cbbGenName, newId: () => 'p' });
    expect(out.retained).toHaveLength(CBB_RECRUITING.retainSlots);
  });

  it('opens a short window of men with real tape', () => {
    const out = openPortal(CBB_RECRUITING, roster(CBB_RECRUITING), [], CBB, ctxFor(CBB, 'KU'), 2026, { rng: mulberry32(3), genName: cbbGenName, newId: () => 'p' });
    expect(out.trail.phase).toBe('portal');
    expect(out.trail.weeks).toBe(CBB_RECRUITING.portalWeeks);
    expect(out.trail.weeks).toBeLessThan(CBB_RECRUITING.weeks);
    for (const m of out.trail.recruits) { expect(m.lo).toBe(m.trueOvr); expect(m.hi).toBe(m.trueOvr); }
  });

  it('spends a sit down once a man, and never on a man who could not leave', () => {
    const out = openPortal(CFB_RECRUITING, roster(CFB_RECRUITING), ['b0', 'b0', 'x0', 'b1', 'b2'], CFB, ctxFor(CFB, 'LOU'), 2026, { rng: mulberry32(5), genName: cfbGenName, newId: () => 'p' });
    expect(out.retained).toEqual(['b0', 'b1', 'b2']);
  });

  it('deals every position group into each window', () => {
    const groups = (sport: RecruitingSport, schools: RecruitingSchool[], id: string, gen: (rng: () => number) => string) => {
      for (let seed = 1; seed <= 10; seed++) {
        const out = openPortal(sport, [], [], schools, ctxFor(schools, id), 2026, { rng: mulberry32(seed), genName: gen, newId: () => 'p' });
        expect(new Set(out.trail.recruits.map(m => m.pos))).toEqual(new Set(sport.positions));
      }
    };
    groups(CFB_RECRUITING, CFB, 'LOU', cfbGenName);
    groups(CBB_RECRUITING, CBB, 'KU', cbbGenName);
  });

  it('caps my portal class by my losses and leaves each rival a full class', () => {
    const out = openPortal(CFB_RECRUITING, [], [], CFB, ctxFor(CFB, 'LOU'), 2026, { rng: mulberry32(6), genName: cfbGenName, newId: () => 'p' });
    expect(out.lost).toHaveLength(0);
    expect(out.trail.classCap).toBe(2);
    expect(out.trail.rivalCap).toBe(CFB_RECRUITING.classCap);
  });

  it('never sends a one and done freshman to the portal', () => {
    expect(portalRisk({ id: 'a', name: 'A', pos: 'PG', ovr: 90, cls: 'FR', starter: false }, CBB_RECRUITING)).toBe(0);
    expect(portalRisk({ id: 'a', name: 'A', pos: 'QB', ovr: 90, cls: 'FR', starter: false }, CFB_RECRUITING)).toBeGreaterThan(0);
  });
});

describe('pickRivals', () => {
  it('finishes when the table lists a school twice', () => {
    const dup: RecruitingSchool[] = [{ id: 'A', prestige: 90 }, { id: 'A', prestige: 90 }, { id: 'B', prestige: 90 }, { id: 'ME', prestige: 70 }];
    expect(pickRivals(CFB_RECRUITING, 5, 'TX', dup, 'ME', mulberry32(1)).sort()).toEqual(['A', 'B']);
  });
});

describe('reach', () => {
  it('is full at the need, never rises as prestige falls, and never drops under its floor', () => {
    for (const sport of [CFB_RECRUITING, CBB_RECRUITING]) {
      for (let stars = 2; stars <= 5; stars++) {
        expect(reach(sport, stars, sport.starNeed[stars])).toBe(1);
        let last = 1;
        for (let p = sport.starNeed[stars]; p >= 40; p--) {
          const k = reach(sport, stars, p);
          expect(k).toBeLessThanOrEqual(last);
          expect(k).toBeGreaterThanOrEqual(0.25);
          last = k;
        }
      }
    }
  });
});
