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
    const args = { key: 'k', log: [{ minute: 0, instructions: { ...BALANCED, width: 1 as const } }], theirs: BALANCED, lastMinute: 90, possHalves: [55, 50] as [number, number], myGoalMinutes: [10, 70], oppGoalMinutes: [30], wideDuties: 2 };
    expect(tacticStatsOf(args)).toEqual(tacticStatsOf(args));
    expect(instructionsAt(args.log, 1).width).toBe(1);
    expect(isBalanced(instructionsAt(undefined, 50))).toBe(true);
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
