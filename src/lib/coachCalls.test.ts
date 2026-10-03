/**
 * Round 947: the coach's calls layer, unit by unit. The season level claims
 * (calls matter, the roster still decides) live in scripts/simCoachCalls.mjs;
 * this file pins the pieces those claims stand on.
 */
import { describe, expect, it } from 'vitest';
import {
  COACH_CALL_PACKS, PLAN_EDGE, MAX_CALLS, ODDS_FLOOR, ODDS_CEIL,
  readUnits, readTendency, planEdge, pickPlan, sanitizePlan, momentCount,
  startCalls, nextMoment, answerMoment, finishCalls, chooseOption, playCalls, optionOdds,
  type CallsInput, type CoachCallsPack, type Units,
} from '@/lib/coachCalls';

const PACKS = Object.values(COACH_CALL_PACKS);
const level = (pack: CoachCallsPack, v = 70): Units => Object.fromEntries(Object.keys(pack.units).map(u => [u, v]));
const input = (pack: CoachCallsPack, over: Partial<CallsInput> = {}): CallsInput => ({
  seed: 7, gameKey: 'g1', myScore: 20, oppScore: 18, mine: level(pack), his: level(pack), plan: null, ...over,
});

describe('coach call packs', () => {
  it.each(PACKS.map(p => [p.sport, p] as const))('%s pack is well formed', (_s, pack) => {
    for (const side of ['off', 'def'] as const) {
      const s = pack.plan[side];
      expect(s.identities.length).toBeGreaterThanOrEqual(3);
      expect(s.identities.length).toBeLessThanOrEqual(4);
      for (const unit of s.read) expect(pack.units[unit]).toBeDefined();
      for (const i of s.identities) for (const t of s.tendencies) expect([-1, 0, 1]).toContain(i.vs[t.id]);
    }
    for (const m of pack.moments) {
      expect(m.options.length).toBeGreaterThanOrEqual(2);
      expect(m.options.length).toBeLessThanOrEqual(3);
      for (const o of m.options) {
        expect(pack.units[o.mine]).toBeDefined();
        expect(pack.units[o.theirs]).toBeDefined();
        expect(Math.max(o.win, o.lose)).toBeLessThanOrEqual(pack.oneScore);
        expect(Math.min(o.win, o.lose)).toBeGreaterThanOrEqual(0);
      }
    }
    for (let m = -pack.blowout; m <= pack.blowout; m += 1) {
      expect(pack.moments.some(d => m >= d.lead[0] && m <= d.lead[1])).toBe(true);
    }
  });
});

describe('the game plan', () => {
  const pack = COACH_CALL_PACKS.cfb;
  it('reads his tendency off his units, with a band for level', () => {
    expect(readTendency(pack, 'def', { ...level(pack), run: 75, pass: 70 }).id).toBe('run-first');
    expect(readTendency(pack, 'def', { ...level(pack), run: 70, pass: 75 }).id).toBe('pass-first');
    expect(readTendency(pack, 'def', { ...level(pack), run: 71, pass: 70 }).id).toBe('level-o');
  });
  it('averages a unit over its positions, 60 for an empty unit', () => {
    const u = readUnits(pack, [{ pos: 'RB', ovr: 80 }, { pos: 'OL', ovr: 70 }, { pos: 'QB', ovr: 90 }]);
    expect(u.run).toBe(75);
    expect(u.pass).toBe(90);
    expect(u.coverage).toBe(60);
  });
  it('is worth at most PLAN_EDGE a side, and a counter is worth the mirror of a miss', () => {
    const his = { ...level(pack), run: 80, pass: 70, front: 80, coverage: 70 };
    const best = planEdge(pack, pickPlan(pack, his, 'best'), his);
    const worst = planEdge(pack, pickPlan(pack, his, 'worst'), his);
    expect(best.off).toBe(PLAN_EDGE);
    expect(best.def).toBe(PLAN_EDGE);
    expect(worst.points).toBe(-best.points);
    expect(planEdge(pack, null, his).points).toBe(0);
    expect(planEdge(pack, { off: 'nope', def: 'nope' }, his).points).toBe(0);
  });
  it('reads a saved plan back only when both ids are this pack', () => {
    expect(sanitizePlan(pack, { off: 'pound', def: 'box' })).toEqual({ off: 'pound', def: 'box' });
    expect(sanitizePlan(pack, { off: 'pound', def: 'zone' })).toBeNull();
    expect(sanitizePlan(pack, 'pound')).toBeNull();
    expect(sanitizePlan(pack, null)).toBeNull();
  });
});

describe('the calls', () => {
  it.each(PACKS.map(p => [p.sport, p] as const))('%s: a blowout draws none, a one score game one to three', (_s, pack) => {
    for (let d = 0; d < 1; d += 0.05) {
      expect(momentCount(pack, pack.blowout + 1, d)).toBe(0);
      expect(momentCount(pack, -(pack.blowout + 1), d)).toBe(0);
      const c = momentCount(pack, pack.oneScore, d);
      expect(c).toBeGreaterThanOrEqual(1);
      expect(c).toBeLessThanOrEqual(MAX_CALLS);
    }
  });
  it.each(PACKS.map(p => [p.sport, p] as const))('%s: same seed, same moments; another key, other dice', (_s, pack) => {
    const a = playCalls(pack, input(pack), 'best');
    const b = playCalls(pack, input(pack), 'best');
    expect(b).toEqual(a);
    expect(startCalls(pack, input(pack, { gameKey: 'g2' })).dice).not.toEqual(startCalls(pack, input(pack)).dice);
  });
  it.each(PACKS.map(p => [p.sport, p] as const))('%s: a call never reshuffles the dice and never moves past one score', (_s, pack) => {
    for (let seed = 1; seed <= 300; seed += 1) {
      const inp = input(pack, { seed, gameKey: `k${seed}`, myScore: 20 + (seed % 7), oppScore: 20 });
      const first = startCalls(pack, inp);
      for (const policy of ['best', 'worst', 'random', 'book'] as const) {
        let st = startCalls(pack, inp);
        expect(st.dice).toEqual(first.dice);
        expect(st.count).toBe(first.count);
        let pick = seed;
        for (let m = nextMoment(pack, st); m; m = nextMoment(pack, st)) {
          st = answerMoment(pack, st, m, chooseOption(pack, st, m, policy, () => ((pick = (pick * 16807) % 2147483647) / 2147483647)));
          expect(Math.abs(st.calls[st.calls.length - 1].swing)).toBeLessThanOrEqual(pack.oneScore);
        }
        expect(Math.abs(st.calls.reduce((s, c) => s + c.swing, 0))).toBeLessThanOrEqual(pack.oneScore);
        expect(st.dice).toEqual(first.dice);
      }
    }
  });
  it('odds stay inside the floor and ceiling however lopsided the units', () => {
    for (const pack of PACKS) for (const m of pack.moments) for (const o of m.options) {
      expect(optionOdds(o, level(pack, 99), level(pack, 1))).toBeLessThanOrEqual(ODDS_CEIL);
      expect(optionOdds(o, level(pack, 1), level(pack, 99))).toBeGreaterThanOrEqual(ODDS_FLOOR);
    }
  });
  it('an unknown option is the book call', () => {
    const pack = COACH_CALL_PACKS.cbb;
    const st = startCalls(pack, input(pack, { myScore: 70, oppScore: 69 }));
    const m = nextMoment(pack, st)!;
    expect(m).not.toBeNull();
    expect(answerMoment(pack, st, m, 'not-an-option').calls[0].option).toBe(m.def.options[0].id);
  });
  it('overtime settles a level college game, a level Aussie Rules game is a draw', () => {
    const cfb = COACH_CALL_PACKS.cfb, afl = COACH_CALL_PACKS.afl;
    const c = finishCalls(cfb, { ...startCalls(cfb, input(cfb)), count: 0, margin: 0 });
    expect(c.overtime).toBe(true);
    expect(Math.abs(c.margin)).toBe(3);
    const a = finishCalls(afl, { ...startCalls(afl, input(afl, { myScore: 60, oppScore: 60 })), count: 0, margin: 0 });
    expect(a.result).toBe('draw');
    expect(a.overtime).toBe(false);
  });
  it('the final score moves only by what the plan and the calls moved', () => {
    const pack = COACH_CALL_PACKS.cfb;
    for (let seed = 1; seed <= 200; seed += 1) {
      const r = playCalls(pack, input(pack, { seed, gameKey: `s${seed}`, myScore: 24, oppScore: 21 }), 'best');
      if (!r.overtime) expect(r.margin - 3).toBe(r.planPoints + r.calls.reduce((s, c) => s + c.swing, 0));
      expect(r.myScore).toBeGreaterThanOrEqual(24);
      expect(r.oppScore).toBeGreaterThanOrEqual(21);
    }
  });
});
