/**
 * Round 1522: the team instruction dials and the changes during a match.
 *
 * The dials: balanced is exactly zero and drops off the save, a junk value and a match in progress are refused,
 * each setting reads what its table says. The live change: instructions, a formation and a duty made at the break
 * and in play bite from the next minute, the pitch reads in the shape in force at each minute, the report carries
 * the day, the legs are charged once, and the match settles exactly once.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  startCareer, playNextEntry, resumeMatch, startSecondHalf, changeLive, setInstructions, liveInstructions,
  myOnPitchAt, liveShapeAt, matchFacts, strengthOf, FORMATIONS, dutyOptions,
} from '@/lib/clubManager';
import type { CareerState, Duty } from '@/lib/clubManager';
import {
  AI_STYLES, BALANCED, TACTIC_TABLE, aiStyleFor, instructionsAt, isBalanced, opponentStyle, readInstructions, tacticBoost, tacticStatsOf,
  type AiStyleId, type TeamInstructions,
} from '@/lib/clubManagerTactics';
import { tacticsImpl } from '@/lib/clubManagerTacticsCore';

const seeded = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
beforeEach(() => { vi.spyOn(Math, 'random').mockImplementation(seeded(1522)); });
afterEach(() => { vi.restoreAllMocks(); });

/** A career stopped at half time of its first match (the classic dressing room). */
function atHalftime(club = 'Everton'): CareerState {
  let s = startCareer(club);
  for (let i = 0; i < 40; i++) {
    const r = playNextEntry(s);
    s = r.state;
    if (r.kind === 'halftime' && s.live) return s;
  }
  throw new Error('no half time reached');
}

/** The match went into the books once: the week moved on, and a league match added one game to my row. */
function settledOnce(before: CareerState, after: CareerState, competition: string): boolean {
  const games = (s: CareerState) => { const r = s.table.find(t => t.club === s.clubName); return r ? r.w + r.d + r.l : 0; };
  return after.week > before.week && games(after) - games(before) === (competition === 'league' ? 1 : 0);
}

describe('Round 1522: the dials', () => {
  it('balanced is zero against every style, both halves', () => {
    for (const id of Object.keys(AI_STYLES) as (keyof typeof AI_STYLES)[]) for (const half of [1, 2] as const) {
      expect(tacticBoost({ mine: BALANCED, theirs: AI_STYLES[id].instructions, half, fit: 90, duties: ['winger'] })).toEqual({ atk: 0, def: 0 });
    }
  });
  it('a high press against a patient side reads the table, legs and all', () => {
    const T = TACTIC_TABLE.press.high;
    const mine = { ...BALANCED, press: 1 as const };
    const theirs = AI_STYLES.patient.instructions;
    const fresh = tacticBoost({ mine, theirs, half: 1, fit: 90, duties: [] });
    expect(fresh.atk).toBeCloseTo(T.atkH1 + T.vsPatientAtk, 10);
    expect(fresh.def).toBeCloseTo(T.defH1, 10);
    const spent = tacticBoost({ mine, theirs, half: 1, fit: 60, duties: [] });
    expect(spent.atk).toBeCloseTo(T.vsPatientAtk, 10);
    const late = tacticBoost({ mine, theirs, half: 2, fit: 90, duties: [] });
    expect(late.def).toBeCloseTo(T.defH2, 10);
  });
  it('setInstructions sets, drops the field on balanced, refuses junk and a match on', () => {
    const s = startCareer('Everton');
    const on = setInstructions(s, { press: 1, tempo: 0, width: -1, line: 0 })!;
    expect(on.instructions).toEqual({ press: 1, tempo: 0, width: -1, line: 0 });
    const off = setInstructions(on, { ...BALANCED })!;
    expect('instructions' in off).toBe(false);
    expect(JSON.stringify(off)).toBe(JSON.stringify(s));
    expect(setInstructions(s, { press: 2, tempo: 0, width: 0, line: 0 } as never)).toBeNull();
    expect(readInstructions({ press: 1 })).toBeNull();
    expect(setInstructions(atHalftime(), { ...BALANCED, press: 1 })).toBeNull();
  });
  it('a style is keyed: the same club and strength give the same style, and no draw is taken', () => {
    const spy = vi.mocked(Math.random);
    const before = spy.mock.calls.length;
    const a = aiStyleFor('Some Club', 80);
    expect(aiStyleFor('Some Club', 80)).toBe(a);
    expect(spy.mock.calls.length).toBe(before);
    const s = startCareer('Everton');
    const f = matchFacts(s)!;
    expect(opponentStyle(s, f.opponent)).toBe(aiStyleFor(f.opponent, strengthOf(s, f.opponent)));
  });
  it('the engine reads the instructions through the slot the tactics module fills', () => {
    expect(tacticsImpl()).not.toBeNull();
  });
  it('the report numbers are a pure function of the match', () => {
    const args = { key: 'k', log: [{ minute: 0, instructions: { ...BALANCED, width: 1 as const } }], theirs: BALANCED, lastMinute: 90, possHalves: [55, 50] as [number, number], myGoals: [{ minute: 10 }, { minute: 70 }], oppGoals: [{ minute: 30 }], wideDuties: 2 };
    expect(tacticStatsOf(args)).toEqual(tacticStatsOf(args));
    expect(instructionsAt(args.log, 1).width).toBe(1);
    expect(isBalanced(instructionsAt(undefined, 50))).toBe(true);
  });
  it('a penalty, a direct free kick or an own goal is never on the break or from wide (review run minor 1)', () => {
    const log = [{ minute: 0, instructions: { ...BALANCED, width: 1 as const, line: 1 as const } }];
    const base = { log, theirs: AI_STYLES.direct.instructions, lastMinute: 90, possHalves: [50, 50] as [number, number], wideDuties: 3 };
    const set = [{ minute: 12, penalty: true }, { minute: 40, freeKick: true }, { minute: 77, og: true }, { minute: 88, og: { n: 'X' } }];
    for (let k = 0; k < 40; k++) {
      const t = tacticStatsOf({ ...base, key: `set${k}`, myGoals: set, oppGoals: set });
      expect([t.breakConceded, t.wideGoals]).toEqual([0, 0]);
    }
    const open = Array.from({ length: 30 }, (_, i) => ({ minute: i + 1 }));
    const t = tacticStatsOf({ ...base, key: 'open', myGoals: open, oppGoals: open });
    expect(t.breakConceded).toBeGreaterThan(0);
    expect(t.wideGoals).toBeGreaterThan(0);
  });
});

describe('Round 1522: changes during a match', () => {
  it('instructions at the break bite from the restart and reach the report and the legs', () => {
    const ht = atHalftime();
    const plain = startSecondHalf(ht)!;
    const changed = changeLive(ht, 46, { kind: 'instructions', instructions: { press: 1, tempo: 1, width: 0, line: 1 } })!;
    expect(changed.live!.instrLog).toEqual([{ minute: 46, instructions: { press: 1, tempo: 1, width: 0, line: 1 } }]);
    expect(liveInstructions(changed.live!).press).toBe(1);
    expect(changeLive(changed, 46, { kind: 'instructions', instructions: { press: 1, tempo: 1, width: 0, line: 1 } })).toBeNull();
    const drawn = startSecondHalf(changed)!;
    expect(drawn.live!.lam2Mine).not.toBe(plain.live!.lam2Mine);
    expect(ht.instructions).toBeUndefined();
    expect(drawn.instructions).toBeUndefined();
    const res = resumeMatch(drawn);
    expect(res.kind).toBe('match');
    expect(settledOnce(drawn, res.state, res.report!.competition)).toBe(true);
    expect(res.state.live ?? null).toBeNull();
    const t = res.report!.detail!.tactics!;
    expect(t.log).toEqual([{ minute: 46, instructions: { press: 1, tempo: 1, width: 0, line: 1 } }]);
    /* Minutes 47 to 90 under the press: a change at 46 bites from 47. */
    expect(t.stats.legs).toBe(Math.round(TACTIC_TABLE.legs.high * 44 / 90));
    expect(t.theirStyle).toBe(opponentStyle(drawn, drawn.live!.opponent));
  });
  it('a balanced match keeps no log and no tactics on its report', () => {
    const res = resumeMatch(atHalftime());
    expect(res.report!.detail!.tactics).toBeUndefined();
  });
  it('a formation and a duty in play reshape from the next minute and the pitch reads each minute in its own shape', () => {
    const second = startSecondHalf(atHalftime())!;
    const live0 = second.live!;
    const fromIdx = live0.formationIndex!;
    const toIdx = fromIdx === 1 ? 2 : 1;
    const before = myOnPitchAt(live0, 61);
    const reshaped = changeLive(second, 60, { kind: 'formation', formationIndex: toIdx })!;
    const live = reshaped.live!;
    expect(live.formationIndex).toBe(toIdx);
    expect(new Set(live.onPitch)).toEqual(new Set(live0.onPitch));
    expect(live.kickoffShape!.formationIndex).toBe(fromIdx);
    expect(liveShapeAt(live, 60).formationIndex).toBe(fromIdx);
    expect(liveShapeAt(live, 61).formationIndex).toBe(toIdx);
    expect(myOnPitchAt(live, 60)).toEqual(before);
    expect(myOnPitchAt(live, 61)).toEqual(live.onPitch);
    const keeperSlot = FORMATIONS[toIdx].slots.findIndex(sl => sl.label === 'GK');
    expect(reshaped.squad.find(p => p.id === live.onPitch[keeperSlot])!.position).toBe('GK');
    expect(changeLive(reshaped, 61, { kind: 'formation', formationIndex: toIdx })).toBeNull();
    const slot = FORMATIONS[toIdx].slots.findIndex(sl => sl.label !== 'GK');
    const duty = dutyOptions(FORMATIONS[toIdx].slots[slot]).find(d => d !== live.duties?.[slot])!;
    const withDuty = changeLive(reshaped, 70, { kind: 'duty', slot, duty })!;
    expect(withDuty.live!.duties![slot]).toBe(duty);
    expect(withDuty.live!.formChanges!.length).toBe(2);
    expect(changeLive(reshaped, 70, { kind: 'duty', slot, duty: 'poacher' })).toBeNull();
    expect(withDuty.formationIndex).toBe(second.formationIndex);
    const res = resumeMatch(withDuty);
    expect(res.kind).toBe('match');
    expect(settledOnce(withDuty, res.state, res.report!.competition)).toBe(true);
  });
});

/* Round 1522 review (run lens, mutation A): an instructions change in play must reach the goal rates the engine
   draws the rest of the match at, not only the log. Each case reads the rates of the stretch after the change
   against the same match left alone, and the tactics module's edge must be asked about the new set. */
describe('Round 1522 review: a change in play moves the football, not just the log', () => {
  const NEXT = { press: 0 as const, tempo: 1 as const, width: 1 as const, line: 1 as const };
  type Seg = { from: number; to: number; lamMine: number; lamOpp: number };
  /** The rates in force at a minute: the last stretch that covers it (a later recut is appended or split in). */
  const ratesAt = (segs: Seg[] | undefined, fallback: [number, number], minute: number): [number, number] => {
    const s = [...(segs ?? [])].reverse().find(x => x.from <= minute && minute < x.to);
    return s ? [s.lamMine, s.lamOpp] : fallback;
  };
  const askedFor = (calls: unknown[][], half: 1 | 2): boolean =>
    calls.some(c => JSON.stringify(c[3]) === JSON.stringify(NEXT) && c[4] === half);

  it('in the first half: the stretch from the change is drawn at new rates, the one before keeps its own', () => {
    const ht = atHalftime();
    const was: [number, number] = [ht.live!.lamMine!, ht.live!.lamOpp!];
    const edge = vi.spyOn(tacticsImpl()!, 'edge');
    const changed = changeLive(ht, 20, { kind: 'instructions', instructions: NEXT })!;
    expect(changed.live!.instrLog).toEqual([{ minute: 20, instructions: NEXT }]);
    expect(askedFor(edge.mock.calls, 1)).toBe(true);
    expect(ratesAt(changed.live!.h1Segs, was, 10)).toEqual(ratesAt(ht.live!.h1Segs, was, 10));
    expect(ratesAt(changed.live!.h1Segs, was, 30)).not.toEqual(ratesAt(ht.live!.h1Segs, was, 30));
  });
  it('on the board at the end of the first half: the redraw asks for the new set', () => {
    const ht = atHalftime();
    const edge = vi.spyOn(tacticsImpl()!, 'edge');
    const changed = changeLive(ht, 45, { kind: 'instructions', instructions: NEXT }, 1)!;
    expect(changed.live!.instrLog).toEqual([{ minute: 45, plus: 1, instructions: NEXT }]);
    expect(askedFor(edge.mock.calls, 1)).toBe(true);
  });
  it('in the second half: the stretch from the change is drawn at new rates, the one before keeps its own', () => {
    const second = startSecondHalf(atHalftime())!;
    const was: [number, number] = [second.live!.lam2Mine!, second.live!.lam2Opp!];
    const edge = vi.spyOn(tacticsImpl()!, 'edge');
    const changed = changeLive(second, 60, { kind: 'instructions', instructions: NEXT })!;
    expect(askedFor(edge.mock.calls, 2)).toBe(true);
    expect(ratesAt(changed.live!.h2Segs, was, 50)).toEqual(ratesAt(second.live!.h2Segs, was, 50));
    expect(ratesAt(changed.live!.h2Segs, was, 70)).not.toEqual(ratesAt(second.live!.h2Segs, was, 70));
  });
  it('a change at a minute bites from the next one, never its own (mutation B)', () => {
    const log = [{ minute: 0, instructions: BALANCED }, { minute: 20, instructions: { ...BALANCED, press: 1 as const } }];
    expect(instructionsAt(log, 20).press).toBe(0);
    expect(instructionsAt(log, 21).press).toBe(1);
    expect(instructionsAt([{ minute: 0, instructions: { ...BALANCED, line: 1 as const } }], 1).line).toBe(1);
  });
  it('the press costs the legs of the men who played and of nobody else (mutation C)', () => {
    const drawn = startSecondHalf(changeLive(atHalftime(), 46, { kind: 'instructions', instructions: { ...BALANCED, press: 1 } })!)!;
    const impl = tacticsImpl()!;
    const realDay = impl.day;
    const copy = (): CareerState => JSON.parse(JSON.stringify(drawn));
    vi.mocked(Math.random).mockImplementation(seeded(77));
    const charged = resumeMatch(copy()).state;
    const day = vi.spyOn(impl, 'day').mockImplementation((...a: Parameters<typeof realDay>) => {
      const d = realDay(...a);
      return { ...d, stats: { ...d.stats, legs: 0 } };
    });
    vi.mocked(Math.random).mockImplementation(seeded(77));
    const free = resumeMatch(copy()).state;
    expect(day).toHaveBeenCalled();
    const legs = Math.round(TACTIC_TABLE.legs.high * 44 / 90);
    expect(legs).toBeGreaterThan(0);
    const fitOf = (s: CareerState, id: string) => s.squad.find(p => p.id === id)!.fitness;
    const moved = charged.squad.filter(p => p.fitness !== fitOf(free, p.id));
    for (const id of drawn.live!.startXi) expect(fitOf(free, id) - fitOf(charged, id)).toBe(legs);
    expect(moved.length).toBeLessThanOrEqual(drawn.live!.startXi.length + 5);
    expect(charged.squad.length).toBeGreaterThan(moved.length);
  });
});

/* Round 1522 review (run lens, mutation D): every interaction the harness header lists, through tacticBoost, against
   the sum TACTIC_TABLE says it is. A trigger that belongs to the other side must never fire off my own setting, so
   the last rows put the trigger on my side and expect nothing extra. */
describe('Round 1522 review: every row of the table, through tacticBoost', () => {
  const T = TACTIC_TABLE;
  const P = T.press, M = T.tempo, W = T.width, L = T.line;
  interface Row { name: string; mine: Partial<TeamInstructions>; theirs?: Partial<TeamInstructions>; half?: 1 | 2; fit?: number; duties?: Duty[]; atk: number; def: number; }
  const rows: Row[] = [
    { name: 'high press, first half, fresh legs', mine: { press: 1 }, atk: P.high.atkH1, def: P.high.defH1 },
    { name: 'high press, first half, half the legs', mine: { press: 1 }, fit: 75, atk: P.high.atkH1 / 2, def: P.high.defH1 },
    { name: 'high press, first half, no legs', mine: { press: 1 }, fit: 55, atk: 0, def: P.high.defH1 },
    { name: 'high press, second half', mine: { press: 1 }, half: 2, atk: P.high.atkH2, def: P.high.defH2 },
    { name: 'high press against a patient side', mine: { press: 1 }, theirs: { tempo: -1 }, half: 2, atk: P.high.atkH2 + P.high.vsPatientAtk, def: P.high.defH2 },
    { name: 'high press against a direct side', mine: { press: 1 }, theirs: { tempo: 1 }, half: 2, atk: P.high.atkH2, def: P.high.defH2 + P.high.vsDirectDef },
    { name: 'stand off', mine: { press: -1 }, atk: P.off.atk, def: P.off.def },
    { name: 'stand off against a patient side', mine: { press: -1 }, theirs: { tempo: -1 }, atk: P.off.atk + P.off.vsPatientAtk, def: P.off.def },
    { name: 'stand off against a direct side', mine: { press: -1 }, theirs: { tempo: 1 }, atk: P.off.atk, def: P.off.def + P.off.vsDirectDef },
    { name: 'direct', mine: { tempo: 1 }, atk: M.direct.atk, def: M.direct.def },
    { name: 'direct against a high line', mine: { tempo: 1 }, theirs: { line: 1 }, atk: M.direct.atk + M.direct.vsHighLineAtk, def: M.direct.def },
    { name: 'direct against a deep line', mine: { tempo: 1 }, theirs: { line: -1 }, atk: M.direct.atk + M.direct.vsDeepLineAtk, def: M.direct.def },
    { name: 'direct with three target men and poachers (two count)', mine: { tempo: 1 }, duties: ['targetMan', 'poacher', 'targetMan'], atk: M.direct.atk + 2 * M.direct.perDutyAtk, def: M.direct.def },
    { name: 'patient', mine: { tempo: -1 }, atk: M.patient.atk, def: M.patient.def },
    { name: 'patient against a side that stands off', mine: { tempo: -1 }, theirs: { press: -1 }, atk: M.patient.atk + M.patient.vsStandOffAtk, def: M.patient.def },
    { name: 'patient against a press', mine: { tempo: -1 }, theirs: { press: 1 }, atk: M.patient.atk, def: M.patient.def + M.patient.vsPressDef },
    { name: 'patient with three builders (two count)', mine: { tempo: -1 }, duties: ['deepPlaymaker', 'playmaker', 'falseNine'], atk: M.patient.atk + 2 * M.patient.perDutyAtk, def: M.patient.def },
    { name: 'wide', mine: { width: 1 }, atk: W.wide.atk, def: W.wide.def },
    { name: 'wide against a narrow side', mine: { width: 1 }, theirs: { width: -1 }, atk: W.wide.atk + W.wide.vsNarrowAtk, def: W.wide.def },
    { name: 'wide with four wide duties (three count)', mine: { width: 1 }, duties: ['winger', 'winger', 'attackingFullBack', 'attackingFullBack'], atk: W.wide.atk + 3 * W.wide.perDutyAtk, def: W.wide.def },
    { name: 'narrow', mine: { width: -1 }, atk: W.narrow.atk, def: W.narrow.def },
    { name: 'narrow against a wide side', mine: { width: -1 }, theirs: { width: 1 }, atk: W.narrow.atk, def: W.narrow.def + W.narrow.vsWideDef },
    { name: 'narrow with four central duties (three count)', mine: { width: -1 }, duties: ['insideForward', 'playmaker', 'creator', 'shadowStriker'], atk: W.narrow.atk + 3 * W.narrow.perDutyAtk, def: W.narrow.def },
    { name: 'high line', mine: { line: 1 }, atk: L.high.atk, def: L.high.def },
    { name: 'high line against a direct side', mine: { line: 1 }, theirs: { tempo: 1 }, atk: L.high.atk, def: L.high.def + L.high.vsDirectDef },
    { name: 'high line against a patient side', mine: { line: 1 }, theirs: { tempo: -1 }, atk: L.high.atk + L.high.vsPatientAtk, def: L.high.def },
    { name: 'high line with nobody pressing', mine: { line: 1, press: -1 }, atk: L.high.atk + P.off.atk, def: L.high.def + P.off.def + L.high.noPressDef },
    { name: 'deep line', mine: { line: -1 }, atk: L.deep.atk, def: L.deep.def },
    { name: 'deep line against a patient side', mine: { line: -1 }, theirs: { tempo: -1 }, atk: L.deep.atk, def: L.deep.def + L.deep.vsPatientDef },
    { name: 'deep line against a direct side', mine: { line: -1 }, theirs: { tempo: 1 }, atk: L.deep.atk, def: L.deep.def + L.deep.vsDirectDef },
    { name: 'deep line behind a high press (a gap)', mine: { line: -1, press: 1 }, half: 2, atk: L.deep.atk + P.high.atkH2, def: L.deep.def + P.high.defH2 + L.deep.pressGapDef },
    /* The trigger on my own side: nothing extra. */
    { name: 'a high line with my own direct tempo is no direct opponent', mine: { line: 1, tempo: 1 }, atk: L.high.atk + M.direct.atk, def: L.high.def + M.direct.def },
    { name: 'a deep line with my own patient tempo is no patient opponent', mine: { line: -1, tempo: -1 }, atk: L.deep.atk + M.patient.atk, def: L.deep.def + M.patient.def },
    { name: 'a high press with my own patient tempo is no patient opponent', mine: { press: 1, tempo: -1 }, half: 2, atk: P.high.atkH2 + M.patient.atk, def: P.high.defH2 + M.patient.def },
    { name: 'direct with my own high line is no high line of theirs', mine: { tempo: 1, line: 1 }, atk: M.direct.atk + L.high.atk, def: M.direct.def + L.high.def },
    { name: 'patient while I stand off is no side that stands off', mine: { tempo: -1, press: -1 }, atk: M.patient.atk + P.off.atk, def: M.patient.def + P.off.def },
  ];
  for (const r of rows) {
    it(r.name, () => {
      const got = tacticBoost({
        mine: { ...BALANCED, ...r.mine }, theirs: { ...BALANCED, ...(r.theirs ?? {}) },
        half: r.half ?? 1, fit: r.fit ?? 90, duties: r.duties ?? [],
      });
      expect(got.atk).toBeCloseTo(r.atk, 10);
      expect(got.def).toBeCloseTo(r.def, 10);
    });
  }

  /* Every style's read on the preview says what tends to work against it; each claim must hold on the table (net
     goals a match, both halves, at 85 fitness). Review finding: the Counter attack read used to say go wide. */
  const net = (mine: Partial<TeamInstructions>, theirs: TeamInstructions, duties: Duty[] = []): number => {
    const [a, b] = ([1, 2] as const).map(half => tacticBoost({ mine: { ...BALANCED, ...mine }, theirs, half, fit: 85, duties }));
    return (a.atk + b.atk - a.def - b.def) / 2;
  };
  const READS: Record<AiStyleId, [Partial<TeamInstructions>, 'gain' | 'loss', Duty[]?][]> = {
    gegenpress: [[{ tempo: 1 }, 'gain'], [{ tempo: -1 }, 'loss']],
    possession: [[{ tempo: 1 }, 'gain'], [{ press: 1 }, 'gain']],
    patient: [[{ press: 1 }, 'gain'], [{ line: -1 }, 'loss']],
    wingplay: [[{ width: -1 }, 'loss']],
    direct: [[{ line: -1 }, 'gain'], [{ press: 1 }, 'loss']],
    counter: [[{ line: 1 }, 'loss'], [{ line: -1 }, 'gain'], [{ tempo: -1 }, 'gain']],
    lowblock: [[{ tempo: -1 }, 'gain'], [{ tempo: 1 }, 'loss'], [{ width: 1 }, 'gain', ['winger', 'winger']]],
    balanced: [],
  };
  it('every style read says what the table does against that style', () => {
    for (const id of Object.keys(READS) as AiStyleId[]) for (const [mine, way, duties] of READS[id]) {
      const v = net(mine, AI_STYLES[id].instructions, duties ?? []);
      expect({ id, mine, ok: way === 'gain' ? v > 0.005 : v < -0.005 }).toEqual({ id, mine, ok: true });
    }
    expect(AI_STYLES.counter.read).not.toMatch(/wide/i);
  });
});
