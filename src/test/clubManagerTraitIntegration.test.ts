import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CalendarEntry, CareerState, CMPlayer, LiveMatch } from '@/lib/clubManager';
import type { CoachedStylePlayer } from '@/lib/clubManagerTraits';
import type { TeamInstructions } from '@/lib/clubManagerTacticsCore';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const stripCoaching = <T,>(value: T): T => JSON.parse(JSON.stringify(value,
  (key, item) => ['coachedStyle', 'coachedStyleCourse', 'coachedStyleRules'].includes(key) ? undefined : item)) as T;
const high = { press: 1, tempo: 0, width: 0, line: 0 } as const;
const balanced = { press: 0, tempo: 0, width: 0, line: 0 } as const;
function seeded<T>(seed: number, action: () => T) {
  const draws: number[] = [];
  const spy = vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = seed * 16807 % 2147483647;
    const value = (seed - 1) / 2147483646;
    draws.push(value); return value;
  });
  try { return { value: action(), draws }; } finally { spy.mockRestore(); }
}
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-23T16:00:00Z'));
});
afterEach(() => {
  vi.restoreAllMocks(); vi.useRealTimers();
  localStorage.clear(); sessionStorage.clear();
});
async function fresh() {
  // Real separate graphs preserve module counters and IDs across paired arms.
  vi.resetModules();
  const E = await import('@/lib/clubManager');
  await import('@/lib/clubManagerTactics');
  const H = await import('@/lib/clubManagerTraits');
  const { saveFence } = await import('@/lib/saveFence');
  saveFence.release(E.SAVE_KEY);
  const career = seeded(1455001, () => E.startCareer('Everton')).value;
  return { E, H, saveFence, career };
}
function putPlayer(career: CareerState, player: CMPlayer): CareerState {
  return { ...career, squad: career.squad.map(p => p.id === player.id ? player : p) };
}
function coursePlayer(career: CareerState): CMPlayer {
  const p = career.squad.find(row => row.position !== 'GK' && !row.onLoan && !row.retraining);
  if (!p) throw new Error('CM_TRAIT_FIXTURE: actual owned outfield player missing');
  return p;
}
function chargedWindows(career: CareerState): CareerState {
  // Explicit fictional calendar fixture, using the existing charged-window entry.
  // No fake tick, result, wages, physics or clock implementation is substituted.
  const calendar: CalendarEntry[] = Array.from({ length: 6 }, () => ({ type: 'window', round: 0 }));
  return { ...career, week: 0, calendar, live: null };
}
async function windows(withCourse: boolean) {
  const context = await fresh(), { E, H } = context;
  let state = chargedWindows(context.career);
  const carrier = coursePlayer(state);
  if (withCourse) {
    const begun = H.startCoachedStyle(carrier, 'press', { owned: true, awayOnLoan: false, live: false });
    expect(begun.ok, 'CM_TRAIT_WEEK_START_FOUNDATION').toBe(true);
    state = putPlayer(state, begun.player);
  }
  const snapshots: CareerState[] = [], draws: number[][] = [];
  for (let i = 0; i < 6; i++) {
    const input = JSON.stringify(state);
    const next = seeded(1455100 + i, () => E.playNextEntry(state, { noCoach: true }));
    expect(next.value.kind, 'CM_TRAIT_REAL_WINDOW_FOUNDATION').toBe('window');
    expect(next.value.state.week).toBe(i + 1);
    expect(JSON.stringify(state)).toBe(input);
    state = next.value.state; snapshots.push(clone(state)); draws.push(next.draws);
  }
  return { ...context, carrierId: carrier.id, snapshots, draws };
}
async function kickoff(mode: 'none' | 'starter' | 'bench', instructions: TeamInstructions = high) {
  const context = await fresh(), { E, H } = context;
  let probe = context.career;
  let prepared: { before: CareerState; seed: number } | null = null;
  for (let i = 0; i < 24; i++) {
    const before = clone(probe), seed = 1455200 + i;
    const result = seeded(seed, () => E.playNextEntry(probe, { noCoach: true }));
    if (result.value.kind === 'halftime') { prepared = { before, seed }; break; }
    probe = result.value.state;
  }
  if (!prepared) throw new Error('CM_TRAIT_FIXTURE: bounded public advance found no actual match');
  let state = clone(prepared.before);
  // Only condition is prepared so each compared arm has identical healthy availability.
  state.squad = state.squad.map(p => ({ ...p, fitness: 80, injuryWeeks: 0, suspendedMatches: 0 }));
  const instructed = E.setInstructions(state, instructions);
  if (!instructed) throw new Error('CM_TRAIT_FIXTURE: real instructions refused');
  state = instructed;
  const xi = E.effectiveXIWithSlots(state), starters = new Set(xi.map(row => row.p.id));
  const row = xi.find(x => x.slot && x.p.position !== 'GK' && ['natural', 'family'].includes(E.fitGrade(x.p, x.slot)));
  if (!row) throw new Error('CM_TRAIT_FIXTURE: actual XI has no fitted outfield carrier');
  if (mode === 'starter') state = putPlayer(state, { ...row.p, coachedStyle: { v: 1, id: 'press' } });
  if (mode === 'bench') state.squad = state.squad.map(p => !starters.has(p.id) && p.position !== 'GK'
    ? { ...p, coachedStyle: { v: 1, id: 'press' } } : p);
  const before = JSON.stringify(state);
  const result = seeded(prepared.seed, () => E.playNextEntry(state, { noCoach: true }));
  expect(result.value.kind, 'CM_TRAIT_REAL_KICKOFF_FOUNDATION').toBe('halftime');
  expect(result.value.state.live).toBeTruthy();
  expect(JSON.stringify(state)).toBe(before);
  return { ...context, state: result.value.state, input: state, draws: result.draws, carrierId: row.p.id };
}
function finiteLambda(live: LiveMatch, key: 'lamMine' | 'lam2Mine') {
  const value = live[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('CM_TRAIT_FIXTURE: actual lambda missing');
  return value;
}
function playerIn(state: CareerState, id: string): CMPlayer {
  const p = state.squad.find(row => row.id === id);
  if (!p) throw new Error('CM_TRAIT_FIXTURE: selected carrier disappeared');
  return p;
}

describe('Coached styles reach actual Club Manager state transitions', { timeout: 120000 }, () => {
  it('learns on exactly six real charged weeks and preserves every other state field and RNG draw', async () => {
    const ordinary = await windows(false), coached = await windows(true);
    expect(coached.draws, 'CM_TRAIT_WEEK_RNG_PRESERVED').toEqual(ordinary.draws);
    for (let i = 0; i < 6; i++) {
      expect(JSON.stringify(stripCoaching(coached.snapshots[i])), 'CM_TRAIT_WEEK_OTHER_STATE_PRESERVED').toBe(JSON.stringify(ordinary.snapshots[i]));
      const p = playerIn(coached.snapshots[i], coached.carrierId);
      if (i < 5) {
        expect(coached.H.readCoachedStyle(p), 'CM_TRAIT_REAL_WEEK_NO_EARLY_COMPLETION').toBeNull();
        expect(coached.H.readCoachedStyleCourse(p)?.weeksLeft).toBe(5 - i);
      } else {
        expect(coached.H.readCoachedStyle(p), 'CM_TRAIT_REAL_SIXTH_WEEK_COMPLETES').toEqual({ v: 1, id: 'press' });
        expect(coached.H.readCoachedStyleCourse(p)).toBeNull();
      }
    }
  });

  it('cancels after real charged progress without erasing the previous learned style or rewarding the next week', async () => {
    const { E, H, career } = await fresh();
    let state = chargedWindows(career);
    const carrier = { ...coursePlayer(state), coachedStyle: { v: 1 as const, id: 'link' as const } };
    const begun = H.startCoachedStyle(carrier, 'press', { owned: true, awayOnLoan: false, live: false });
    expect(begun.ok).toBe(true); state = putPlayer(state, begun.player);
    for (let i = 0; i < 2; i++) state = seeded(1455300 + i, () => E.playNextEntry(state)).value.state;
    expect(H.readCoachedStyleCourse(playerIn(state, carrier.id))?.weeksLeft).toBe(4);
    const before = JSON.stringify(state);
    const cancelled = H.cancelCoachedStyle(playerIn(state, carrier.id), { owned: true, awayOnLoan: false, live: false });
    expect(cancelled.ok).toBe(true); expect(JSON.stringify(state)).toBe(before);
    state = putPlayer(state, cancelled.player);
    const next = seeded(1455302, () => E.playNextEntry(state)).value;
    expect(next.kind).toBe('window');
    expect(H.readCoachedStyle(playerIn(next.state, carrier.id)), 'CM_TRAIT_REAL_CANCEL_OLD_STYLE_HELD').toEqual({ v: 1, id: 'link' });
    expect(H.readCoachedStyleCourse(playerIn(next.state, carrier.id))).toBeNull();
    expect(playerIn(next.state, carrier.id).rating).toBe(carrier.rating);
  });

  it('adds a matched starter edge to the actual first-half lambda and leaves the opponent lambda alone', async () => {
    const ordinary = await kickoff('none'), coached = await kickoff('starter');
    const base = finiteLambda(ordinary.state.live!, 'lamMine');
    expect(base, 'CM_TRAIT_FIRST_HALF_UNCLAMPED_FOUNDATION').toBeGreaterThan(0.06);
    expect(base).toBeLessThan(2.097);
    expect(finiteLambda(coached.state.live!, 'lamMine') - base,
      'CM_TRAIT_ACTUAL_FIRST_HALF_EDGE').toBeCloseTo(0.003, 12);
    expect(coached.state.live!.lamOpp).toBe(ordinary.state.live!.lamOpp);
    expect(coached.state.live!.coachedStyleRules).toBe(1);
    expect(Object.prototype.hasOwnProperty.call(ordinary.state.live, 'coachedStyleRules')).toBe(false);
  });

  it('keeps balanced mismatches byte-equivalent outside optional coaching fields and preserves the actual draw stream', async () => {
    const ordinary = await kickoff('none', balanced), coached = await kickoff('starter', balanced);
    expect(coached.H.coachedStyleXi(coached.E.effectiveXIWithSlots(coached.input), balanced).attack).toBe(0);
    expect(JSON.stringify(stripCoaching(coached.state)), 'CM_TRAIT_INACTIVE_MATCH_STATE_PARITY').toBe(JSON.stringify(ordinary.state));
    expect(coached.draws, 'CM_TRAIT_INACTIVE_MATCH_DRAW_PARITY').toEqual(ordinary.draws);
  });

  it('keeps an old unmarked live match neutral while a marked positive witness changes its actual second-half lambda', async () => {
    async function arm(style: boolean, marked: boolean) {
      const context = await kickoff('none');
      const state = clone(context.state);
      if (style) state.squad = state.squad.map(p => p.position === 'GK' ? p : { ...p, coachedStyle: { v: 1, id: 'press' } });
      if (marked) state.live!.coachedStyleRules = 1;
      const before = JSON.stringify(state);
      const next = seeded(1455400, () => context.E.startSecondHalf(state));
      expect(next.value, 'CM_TRAIT_REAL_SECOND_HALF_FOUNDATION').not.toBeNull();
      expect(JSON.stringify(state)).toBe(before);
      return { state: next.value!, draws: next.draws };
    }
    const ordinary = await arm(false, false), old = await arm(true, false), marked = await arm(true, true);
    const base = finiteLambda(ordinary.state.live!, 'lam2Mine');
    expect(base).toBeGreaterThan(0.06); expect(base).toBeLessThan(2.07);
    expect(finiteLambda(marked.state.live!, 'lam2Mine'), 'CM_TRAIT_OLD_LIVE_POSITIVE_GATE_WITNESS').toBeGreaterThan(base);
    expect(JSON.stringify(stripCoaching(old.state)), 'CM_TRAIT_OLD_UNMARKED_LIVE_STATE_PARITY').toBe(JSON.stringify(ordinary.state));
    expect(old.draws, 'CM_TRAIT_OLD_UNMARKED_LIVE_DRAW_PARITY').toEqual(ordinary.draws);
  });

  it('marks a learned bench carrier without a bench bonus and activates only after a real legal halftime substitution', async () => {
    const ordinary = await kickoff('none'), coached = await kickoff('bench');
    expect(coached.state.live!.coachedStyleRules, 'CM_TRAIT_BENCH_NEW_KICKOFF_MARKER').toBe(1);
    expect(coached.state.live!.lamMine, 'CM_TRAIT_NO_INITIAL_BENCH_EDGE').toBe(ordinary.state.live!.lamMine);
    expect(coached.draws).toEqual(ordinary.draws);
    let chosen: { outId: string; inId: string; state: CareerState } | null = null;
    const formation = coached.E.FORMATIONS[coached.state.live!.formationIndex ?? coached.state.formationIndex];
    for (let i = 0; i < coached.state.live!.onPitch.length && !chosen; i++) {
      const outId = coached.state.live!.onPitch[i], slot = formation.slots[i];
      if (!slot || slot.allowed.includes('GK')) continue;
      for (const p of coached.E.benchFor(coached.state, outId, i)) {
        if (!coached.H.readCoachedStyle(p) || !['natural', 'family'].includes(coached.E.fitGrade(p, slot))) continue;
        const sub = coached.E.makeHalftimeSub(coached.state, outId, p.id);
        if (sub) { chosen = { outId, inId: p.id, state: sub }; break; }
      }
    }
    expect(chosen, 'CM_TRAIT_REAL_BENCH_SUB_FOUNDATION').not.toBeNull();
    const reference = ordinary.E.makeHalftimeSub(ordinary.state, chosen!.outId, chosen!.inId);
    expect(reference).not.toBeNull();
    const firstHalf = clone({ mine: coached.state.live!.h1My, theirs: coached.state.live!.h1Opp, cards: coached.state.live!.h1Cards });
    const a = seeded(1455500, () => ordinary.E.startSecondHalf(reference!)).value!;
    const b = seeded(1455500, () => coached.E.startSecondHalf(chosen!.state)).value!;
    const base = finiteLambda(a.live!, 'lam2Mine');
    expect(base).toBeGreaterThan(0.06); expect(base).toBeLessThan(2.097);
    expect(finiteLambda(b.live!, 'lam2Mine') - base, 'CM_TRAIT_REAL_SUB_CARRIER_EDGE').toBeCloseTo(0.003, 12);
    expect({ mine: b.live!.h1My, theirs: b.live!.h1Opp, cards: b.live!.h1Cards },
      'CM_TRAIT_SUB_PRESERVES_COMMITTED_FIRST_HALF').toEqual(firstHalf);
  });

  it('retains valid and unknown optional raw payloads through the real writer and loader without read-time draws or rewrites', async () => {
    const { E, H, career, saveFence } = await fresh();
    const p = coursePlayer(career);
    for (const fields of [
      { coachedStyle: { v: 1, id: 'press' }, coachedStyleCourse: { v: 1, to: 'runner', weeksLeft: 3, weeksTotal: 6 } },
      { coachedStyle: { v: 7, id: 'future' }, coachedStyleCourse: { v: 2, to: 'future', weeksLeft: 3, weeksTotal: 6 } },
    ]) {
      saveFence.release(E.SAVE_KEY); localStorage.clear();
      const state = putPlayer(career, { ...p, ...fields } as CMPlayer);
      const before = JSON.stringify(state);
      const saved = seeded(1455600, () => E.saveCareer(state));
      expect(saved.value, 'CM_TRAIT_REAL_SAVE_FOUNDATION').toBe(true);
      const raw = localStorage.getItem(E.SAVE_KEY);
      const reloaded = seeded(1455601, () => E.loadCareer());
      expect(reloaded.value, 'CM_TRAIT_REAL_LOAD_FOUNDATION').not.toBeNull();
      const actual = playerIn(reloaded.value!, p.id) as CoachedStylePlayer;
      expect(actual.coachedStyle, 'CM_TRAIT_SAVE_RETAINS_RAW_STYLE').toEqual(fields.coachedStyle);
      expect(actual.coachedStyleCourse, 'CM_TRAIT_SAVE_RETAINS_RAW_COURSE').toEqual(fields.coachedStyleCourse);
      if (fields.coachedStyle.v !== 1) expect(H.coachedTrainingMultiplier(actual, 'double')).toBe(1);
      expect(saved.draws).toEqual([]); expect(reloaded.draws).toEqual([]);
      expect(localStorage.getItem(E.SAVE_KEY), 'CM_TRAIT_LOAD_RAW_BYTES_READ_ONLY').toBe(raw);
      expect(JSON.stringify(state)).toBe(before);
    }
    saveFence.release(E.SAVE_KEY);
  });

  it('carries learned and unfinished payloads on an actual release row and real other-club free-agent signing', async () => {
    const { E, career } = await fresh();
    const source = coursePlayer(career);
    // Fictional low-cost transfer fixture on actual initialized careers.
    const p = { ...source, name: 'Fixture Coached Transfer', rating: 55, age: 22, value: 0.3, wage: 1,
      generated: true, nation: 'England', coachedStyle: { v: 1 as const, id: 'press' as const },
      coachedStyleCourse: { v: 1 as const, to: 'runner' as const, weeksLeft: 3, weeksTotal: 6 as const } };
    const state = putPlayer(career, p);
    expect(E.releaseBlock(state, p), 'CM_TRAIT_RELEASE_ELIGIBLE_FOUNDATION').toBeNull();
    const released = E.releasePlayer(state, p.id);
    expect(released).not.toBeNull();
    const row = released!.freeAgents?.find(f => f.name === p.name);
    expect(row, 'CM_TRAIT_ACTUAL_RELEASE_ROW_FOUNDATION').toBeTruthy();
    expect(row!.coachedStyle, 'CM_TRAIT_RELEASE_RETAINS_STYLE').toEqual(p.coachedStyle);
    expect(row!.coachedStyleCourse, 'CM_TRAIT_RELEASE_RETAINS_COURSE').toEqual(p.coachedStyleCourse);
    const destination = seeded(1455700, () => E.startCareer('Fulham')).value;
    // fromMyClub is relative to the owner. This is an explicitly prepared other-club pool,
    // not a claim that the global job-change/free-agent bridge is integrated.
    destination.freeAgents = [{ ...row!, fromMyClub: undefined }];
    destination.budget = 100; destination.wageCap = 10000;
    expect(E.freeAgentBlock(destination, destination.freeAgents[0]), 'CM_TRAIT_FA_SIGN_ELIGIBLE_FOUNDATION').toBeNull();
    const signed = E.signFreeAgent(destination, p.name);
    expect(signed).not.toBeNull();
    const arrived = signed!.squad.find(f => f.name === p.name)!;
    expect(arrived.coachedStyle, 'CM_TRAIT_FA_SIGN_RETAINS_STYLE').toEqual(p.coachedStyle);
    expect(arrived.coachedStyleCourse, 'CM_TRAIT_FA_SIGN_RETAINS_COURSE').toEqual(p.coachedStyleCourse);
  });
});