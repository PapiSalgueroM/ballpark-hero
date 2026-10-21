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
  myOnPitchAt, liveShapeAt, matchFacts, opponentStyle, strengthOf, FORMATIONS, dutyOptions,
} from '@/lib/clubManager';
import type { CareerState } from '@/lib/clubManager';
import {
  AI_STYLES, BALANCED, TACTIC_TABLE, aiStyleFor, instructionsAt, isBalanced, readInstructions, tacticBoost, tacticStatsOf,
} from '@/lib/clubManagerTactics';

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
    expect(f.oppStyle).toBe(aiStyleFor(f.opponent, strengthOf(s, f.opponent)));
    expect(opponentStyle(s, f.opponent)).toBe(f.oppStyle);
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
