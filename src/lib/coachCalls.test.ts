/**
 * Round 947: the coach's calls layer, unit by unit. The season level claims
 * (calls matter, the roster still decides) live in scripts/simCoachCalls.mjs;
 * this file pins the pieces those claims stand on.
 */
import { describe, expect, it } from 'vitest';
import {
  CALL_SPORTS, callPack, PLAN_EDGE_CAP, MAX_CALLS, ODDS_FLOOR, ODDS_CEIL,
  readUnits, readTendency, planEdge, pickPlan, sanitizePlan, momentCount,
  startCalls, nextMoment, answerMoment, finishCalls, chooseOption, playCalls, optionOdds,
  type CallsInput, type CallSport, type CoachCallsPack, type Units,
} from '@/lib/coachCalls';

const packs = () => CALL_SPORTS.map(callPack);
const level = (pack: CoachCallsPack, v = 70): Units => Object.fromEntries(Object.keys(pack.units).map(u => [u, v]));
const input = (pack: CoachCallsPack, over: Partial<CallsInput> = {}): CallsInput => ({
  seed: 7, gameKey: 'g1', myScore: 20, oppScore: 18, mine: level(pack), his: level(pack), plan: null, ...over,
});

describe('coach call packs', () => {
  it.each(packs().map(p => [p.sport, p] as const))('%s pack is well formed', (_s, pack) => {
    expect(pack.planEdge).toBeGreaterThan(0);
    expect(pack.planEdge).toBeLessThanOrEqual(PLAN_EDGE_CAP);
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

/* What each card says, written down once by hand: which of HIS units leading
 * gives which tendency, and which of your units and his set each option's
 * odds. A swapped read or a swapped mine and theirs in a pack inverts what the
 * labels and blurbs tell the player, so it must fail here. */
const TENDENCY_WHEN_LEADS: Record<CallSport, Record<'off' | 'def', Record<string, string>>> = {
  cfb: { off: { front: 'stout-front', coverage: 'lockdown-back' }, def: { run: 'run-first', pass: 'pass-first' } },
  cbb: { off: { perimeter: 'perimeter-d', paint: 'rim-d' }, def: { perimeter: 'shooters', paint: 'post-o' } },
  afl: { off: { back: 'strong-back', mid: 'press-mid' }, def: { fwd: 'forward-heavy', mid: 'mid-run' } },
};
const OPTION_UNITS: Record<CallSport, Record<string, [string, string]>> = {
  cfb: { 'fourth-short/go': ['run', 'front'], 'two-point/two': ['pass', 'coverage'], 'onside/onside': ['kick', 'pass'], 'kneel/score': ['run', 'front'] },
  cbb: { 'foul-up-three/defend': ['perimeter', 'perimeter'], 'foul-up-three/foul': ['paint', 'paint'], 'press/press': ['perimeter', 'perimeter'], 'zone-or-man/zone': ['paint', 'perimeter'], 'ice/ice': ['perimeter', 'perimeter'] },
  afl: { 'tag/tag': ['mid', 'mid'], 'flood/shape': ['back', 'fwd'], 'flood/flood': ['back', 'fwd'], 'extra-stoppage/extra': ['ruck', 'ruck'], 'swing-tall/swing': ['fwd', 'back'] },
};
function misreads(pack: CoachCallsPack): string[] {
  const out: string[] = [];
  for (const side of ['off', 'def'] as const) {
    for (const [unit, id] of Object.entries(TENDENCY_WHEN_LEADS[pack.sport][side])) {
      const got = readTendency(pack, side, { ...level(pack), [unit]: 80 }).id;
      if (got !== id) out.push(`${side}: his ${unit} leading reads ${got}, the card says ${id}`);
    }
    if (readTendency(pack, side, level(pack)).id !== pack.plan[side].tendencies[2].id) out.push(`${side}: level units do not read level`);
  }
  return out;
}
function unitSwaps(pack: CoachCallsPack): string[] {
  const out: string[] = [];
  const table = OPTION_UNITS[pack.sport];
  let staked = 0;
  for (const m of pack.moments) for (const o of m.options) {
    if (o.win === 0 && o.lose === 0) continue;
    staked += 1;
    const want = table[`${m.id}/${o.id}`];
    if (!want) out.push(`${m.id}/${o.id} is not in the table`);
    else if (want[0] !== o.mine || want[1] !== o.theirs) out.push(`${m.id}/${o.id} reads ${o.mine} v ${o.theirs}, the card says ${want[0]} v ${want[1]}`);
  }
  if (staked !== Object.keys(table).length) out.push(`${staked} staked options, ${Object.keys(table).length} in the table`);
  return out;
}
const clonePack = (pack: CoachCallsPack): CoachCallsPack => JSON.parse(JSON.stringify(pack));

describe('the cards say what the numbers do', () => {
  it.each(packs().map(p => [p.sport, p] as const))('%s: his tendency reads the way its label says', (_s, pack) => {
    expect(misreads(pack)).toEqual([]);
  });
  it.each(packs().map(p => [p.sport, p] as const))('%s: each option names the units that set its odds', (_s, pack) => {
    expect(unitSwaps(pack)).toEqual([]);
  });
  it.each(packs().map(p => [p.sport, p] as const))('%s: controls, a swapped read and a swapped option are both caught', (_s, pack) => {
    for (const side of ['off', 'def'] as const) {
      const bad = clonePack(pack);
      bad.plan[side].read = [bad.plan[side].read[1], bad.plan[side].read[0]];
      expect(misreads(bad).length).toBeGreaterThan(0);
    }
    const bad = clonePack(pack);
    const opt = bad.moments.flatMap(m => m.options).find(o => (o.win || o.lose) && o.mine !== o.theirs)
      ?? bad.moments.flatMap(m => m.options).find(o => o.win || o.lose)!;
    if (opt.mine !== opt.theirs) [opt.mine, opt.theirs] = [opt.theirs, opt.mine];
    else opt.mine = Object.keys(pack.units).find(u => u !== opt.mine)!;
    expect(unitSwaps(bad).length).toBeGreaterThan(0);
  });
});

describe('the game plan', () => {
  const pack = callPack('cfb');
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
  it('is worth the pack planEdge a side, and a counter is worth the mirror of a miss', () => {
    const his = { ...level(pack), run: 80, pass: 70, front: 80, coverage: 70 };
    const best = planEdge(pack, pickPlan(pack, his, 'best'), his);
    const worst = planEdge(pack, pickPlan(pack, his, 'worst'), his);
    expect(best.off).toBe(pack.planEdge);
    expect(best.def).toBe(pack.planEdge);
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
  it.each(packs().map(p => [p.sport, p] as const))('%s: a blowout draws none, a one score game one to three', (_s, pack) => {
    for (let d = 0; d < 1; d += 0.05) {
      expect(momentCount(pack, pack.blowout + 1, d)).toBe(0);
      expect(momentCount(pack, -(pack.blowout + 1), d)).toBe(0);
      /* A game decided by exactly the blowout line is still a game with a call. */
      expect(momentCount(pack, pack.blowout, d)).toBeGreaterThanOrEqual(1);
      expect(momentCount(pack, -pack.blowout, d)).toBeGreaterThanOrEqual(1);
      const c = momentCount(pack, pack.oneScore, d);
      expect(c).toBeGreaterThanOrEqual(1);
      expect(c).toBeLessThanOrEqual(MAX_CALLS);
    }
  });
  it.each(packs().map(p => [p.sport, p] as const))('%s: same seed, same moments; another key, other dice', (_s, pack) => {
    const a = playCalls(pack, input(pack), 'best');
    const b = playCalls(pack, input(pack), 'best');
    expect(b).toEqual(a);
    expect(startCalls(pack, input(pack, { gameKey: 'g2' })).dice).not.toEqual(startCalls(pack, input(pack)).dice);
  });
  it.each(packs().map(p => [p.sport, p] as const))('%s: a call never reshuffles the dice and never moves past one score', (_s, pack) => {
    for (let seed = 1; seed <= 300; seed += 1) {
      const inp = input(pack, { seed, gameKey: `k${seed}`, myScore: 20 + (seed % 7), oppScore: 20 });
      const first = startCalls(pack, inp);
      for (const policy of ['best', 'worst', 'random', 'book'] as const) {
        let st = startCalls(pack, inp);
        expect(st.dice).toEqual(first.dice);
        expect(st.count).toBe(first.count);
        let pick = seed;
        for (let m = nextMoment(pack, st); m; m = nextMoment(pack, st)) {
          st = answerMoment(pack, st, chooseOption(pack, st, m, policy, () => ((pick = (pick * 16807) % 2147483647) / 2147483647)));
          expect(Math.abs(st.calls[st.calls.length - 1].swing)).toBeLessThanOrEqual(pack.oneScore);
        }
        expect(Math.abs(st.calls.reduce((s, c) => s + c.swing, 0))).toBeLessThanOrEqual(pack.oneScore);
        expect(st.dice).toEqual(first.dice);
      }
    }
  });
  it('odds stay inside the floor and ceiling however lopsided the units', () => {
    for (const pack of packs()) for (const m of pack.moments) for (const o of m.options) {
      if (o.win === 0 && o.lose === 0) continue;
      expect(optionOdds(o, level(pack, 99), level(pack, 1))).toBeLessThanOrEqual(ODDS_CEIL);
      expect(optionOdds(o, level(pack, 1), level(pack, 99))).toBeGreaterThanOrEqual(ODDS_FLOOR);
    }
  });
  it('an option with nothing at stake always goes as described', () => {
    for (const pack of packs()) for (const m of pack.moments) for (const o of m.options) {
      if (o.win !== 0 || o.lose !== 0) continue;
      expect(optionOdds(o, level(pack, 99), level(pack, 1))).toBe(1);
      expect(optionOdds(o, level(pack, 1), level(pack, 99))).toBe(1);
    }
  });
  it('a better unit of yours raises the odds and a better unit of his lowers them, every step of the ladder', () => {
    for (const pack of packs()) for (const m of pack.moments) for (const o of m.options) {
      if (o.win === 0 && o.lose === 0) continue;
      let rose = 0, fell = 0;
      for (let v = 41; v <= 99; v += 1) {
        const up = optionOdds(o, { ...level(pack), [o.mine]: v }, level(pack));
        const was = optionOdds(o, { ...level(pack), [o.mine]: v - 1 }, level(pack));
        expect(up).toBeGreaterThanOrEqual(was);
        if (up > was) rose += 1;
        const down = optionOdds(o, level(pack), { ...level(pack), [o.theirs]: v });
        const before = optionOdds(o, level(pack), { ...level(pack), [o.theirs]: v - 1 });
        expect(down).toBeLessThanOrEqual(before);
        if (down < before) fell += 1;
      }
      expect(rose, `${pack.sport} ${m.id}/${o.id}`).toBeGreaterThan(0);
      expect(fell, `${pack.sport} ${m.id}/${o.id}`).toBeGreaterThan(0);
    }
  });
  it('an unknown option is the book call', () => {
    const pack = callPack('cbb');
    const st = startCalls(pack, input(pack, { myScore: 70, oppScore: 69 }));
    const m = nextMoment(pack, st)!;
    expect(m).not.toBeNull();
    expect(answerMoment(pack, st, 'not-an-option').calls[0].option).toBe(m.def.options[0].id);
    const done = { ...st, count: 0 };
    expect(answerMoment(pack, done, m.def.options[1].id)).toBe(done);
  });
  it('overtime settles a level college game, a level Aussie Rules game is a draw', () => {
    const cfb = callPack('cfb'), afl = callPack('afl');
    const c = finishCalls(cfb, { ...startCalls(cfb, input(cfb, { myScore: 21, oppScore: 21 })), count: 0 });
    expect(c.overtime).toBe(true);
    expect(Math.abs(c.margin)).toBe(3);
    const a = finishCalls(afl, { ...startCalls(afl, input(afl, { myScore: 60, oppScore: 60 })), count: 0 });
    expect(a.result).toBe('draw');
    expect(a.overtime).toBe(false);
  });
  it.each(packs().map(p => [p.sport, p] as const))('%s: each side of the final score moves by exactly the points the plan and the call log put there', (_s, pack) => {
    let stops = 0, misses = 0;
    for (let seed = 1; seed <= 300; seed += 1) for (const policy of ['best', 'worst', 'random'] as const) {
      const my0 = 40, opp0 = 40 - 3 + (seed % 7);
      let pick = seed;
      const r = playCalls(pack, input(pack, { seed, gameKey: `s${seed}`, myScore: my0, oppScore: opp0, plan: seed % 3 ? pickPlan(pack, level(pack), 'best') : null }), policy, () => ((pick = (pick * 16807) % 2147483647) / 2147483647));
      for (const c of r.calls) {
        const opt = pack.moments.find(m => m.id === c.moment)!.options.find(o => o.id === c.option)!;
        expect(c.swing).toBe(c.cameOff ? opt.win : -opt.lose);
        expect(c.forYou - c.forThem).toBe(c.swing);
        if (c.forThem < 0) stops += 1;
        if (c.forYou < 0) misses += 1;
      }
      if (r.overtime) continue;
      expect(r.myScore).toBe(my0 + Math.max(0, r.planPoints) + r.calls.reduce((s, c) => s + c.forYou, 0));
      expect(r.oppScore).toBe(opp0 + Math.max(0, -r.planPoints) + r.calls.reduce((s, c) => s + c.forThem, 0));
    }
    const hasStop = pack.moments.some(m => m.options.some(o => o.winBy === 'stop'));
    const hasMiss = pack.moments.some(m => m.options.some(o => o.loseBy === 'miss'));
    if (hasStop) expect(stops).toBeGreaterThan(0);
    if (hasMiss) expect(misses).toBeGreaterThan(0);
  });
  it('a level game goes to overtime only when the call log makes it level, and the overtime die decides it', () => {
    const pack = callPack('cbb');
    let ot = 0;
    for (let seed = 1; seed <= 400; seed += 1) {
      const r = playCalls(pack, input(pack, { seed, gameKey: `o${seed}`, myScore: 70, oppScore: 67 }), 'worst');
      const raw = 3 + r.calls.reduce((s, c) => s + c.swing, 0);
      expect(r.overtime).toBe(raw === 0);
      if (r.overtime) { ot += 1; expect(Math.abs(r.margin)).toBe(pack.ties.kind === 'overtime' ? pack.ties.points : 0); }
    }
    expect(ot).toBeGreaterThan(0);
  });
});
