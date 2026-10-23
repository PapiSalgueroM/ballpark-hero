import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CareerState, LiveMatch } from '@/lib/clubManager';

type Engine = typeof import('@/lib/clubManager');
type Shape = { v: 1; formationIndex: number; points: { x: number; y: number }[] };
type SavedPositions = { positionRules?: number; customShape?: unknown };
type SavedSnapshot = { formationIndex: number; duties: LiveMatch['duties']; customShape?: unknown };
type SavedLive = LiveMatch & SavedPositions & { kickoffShape?: SavedSnapshot };
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
function last<T>(values: readonly T[] | undefined): T | undefined {
  return values && values[values.length - 1];
}

function seeded<T>(seed: number, run: () => T) {
  const draws: number[] = [];
  const spy = vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = seed * 16807 % 2147483647;
    const value = (seed - 1) / 2147483646;
    draws.push(value);
    return value;
  });
  try { return { value: run(), draws }; } finally { spy.mockRestore(); }
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
async function fixture(custom = true) {
  vi.resetModules();
  let seed = 1457101;
  const spy = vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = seed * 16807 % 2147483647;
    return (seed - 1) / 2147483646;
  });
  let E: Engine;
  let career: CareerState;
  try {
    E = await import('@/lib/clubManager');
    await import('@/lib/clubManagerTactics');
    career = E.startCareer('Everton');
  } finally { spy.mockRestore(); }
  let probe = career;
  for (let index = 0; index < 24; index += 1) {
    const input = clone(probe);
    input.squad = input.squad.map(p => ({ ...p, fitness: 80, injuryWeeks: 0, suspendedMatches: 0 }));
    const before = E.setInstructions(input, { press: 0, tempo: 0, width: 0, line: 0 });
    expect(before, 'CM_POSITION_LIVE_REAL_BALANCED_FOUNDATION').not.toBeNull();
    const f = E.FORMATIONS[before!.formationIndex];
    const shape: Shape = { v: 1, formationIndex: before!.formationIndex,
      points: f.slots.map(p => ({ x: p.x, y: custom ? 6 : p.y })) };
    if (custom) (before as CareerState & SavedPositions).customShape = shape;
    const next = seeded(1457200 + index, () => E.playNextEntry(before!, { noCoach: true }));
    const rates = [next.value.live?.lamMine, next.value.live?.lamOpp];
    if (next.value.kind === 'halftime' && next.value.state.calendar[next.value.live!.week].type === 'league'
      && rates.every(value => typeof value === 'number' && value > 0.06 && value < 2.1)) {
      return { E, before: before!, shape, state: next.value.state, live: next.value.state.live as SavedLive };
    }
    probe = next.value.kind === 'halftime'
      ? seeded(1457300 + index, () => E.resumeMatch(next.value.state)).value.state : next.value.state;
  }
  throw new Error('CM_POSITION_LIVE_NO_ACTUAL_LEAGUE_FIXTURE');
}
function actualLive(state: CareerState | null, marker: string): SavedLive {
  expect(state?.live, marker).toBeTruthy();
  return state!.live as SavedLive;
}
function secondRates(live: LiveMatch): [number | undefined, number | undefined] {
  return [last(live.h2Segs)?.lamMine, last(live.h2Segs)?.lamOpp];
}
function markPreset(E: Engine, state: CareerState): CareerState {
  // A saved positioning envelope around a real preset match, not a fabricated result.
  const out = clone(state);
  const live = out.live as SavedLive;
  const formationIndex = live.formationIndex!;
  const f = E.FORMATIONS[formationIndex];
  const shape: Shape = { v: 1, formationIndex, points: f.slots.map(p => ({ x: p.x, y: p.y })) };
  live.positionRules = 1;
  live.customShape = clone(shape);
  live.kickoffShape = { formationIndex, duties: clone(live.duties!), customShape: clone(shape) };
  return out;
}
function dutyChange(E: Engine, state: CareerState) {
  const live = state.live!;
  const f = E.FORMATIONS[live.formationIndex!];
  for (let slot = 0; slot < f.slots.length; slot += 1) {
    const duty = E.dutyOptions(f.slots[slot]).find(d => d !== E.liveDutyAt(state, live, slot));
    if (duty) return { kind: 'duty' as const, slot, duty };
  }
  throw new Error('CM_POSITION_LIVE_NO_ACTUAL_ALTERNATE_DUTY');
}
function newFormation(E: Engine, state: CareerState) {
  const index = E.FORMATIONS.findIndex((f, i) => i !== state.live!.formationIndex && f.slots.length === 11);
  expect(index >= 0, 'CM_POSITION_LIVE_ACTUAL_ALTERNATE_FORMATION').toBe(true);
  return { kind: 'formation' as const, formationIndex: index };
}

describe('Custom positioning frozen live boundaries', { timeout: 120000 }, () => {
  it('owns independent current and kickoff snapshots only for a valid new custom kickoff', async () => {
    const { E, before, shape, live } = await fixture();
    expect(live.positionRules, 'CM_POSITION_KICKOFF_RULE_ONE').toBe(1);
    expect(live.customShape, 'CM_POSITION_KICKOFF_CURRENT_COPY').toEqual(shape);
    expect(live.kickoffShape?.customShape, 'CM_POSITION_KICKOFF_FROZEN_COPY').toEqual(shape);
    expect(live.customShape).not.toBe(shape);
    expect(live.kickoffShape?.customShape).not.toBe(live.customShape);
    const frozen = JSON.stringify(live);
    shape.points[0].y = 94;
    expect(JSON.stringify(live), 'CM_POSITION_KICKOFF_NO_INPUT_ALIAS').toBe(frozen);
    expect((before as CareerState & SavedPositions).customShape).toBe(shape);
    expect(E.effectiveXIWithSlots(before).every(row => E.FORMATIONS[before.formationIndex].slots.includes(row.slot!)),
      'CM_POSITION_CANONICAL_ROLE_OBJECTS_HELD').toBe(true);
  });

  it('projects a custom base through the canonical role and the existing mentality shift', async () => {
    const { E } = await fixture(false);
    const slots = E.FORMATIONS[0].slots;
    const keeper = slots.find(s => s.allowed.includes('GK'))!;
    const defender = slots.find(s => !s.allowed.includes('GK') && s.y >= 62 && s.y < 86 && s.x !== 50)!;
    const project: (slot: typeof keeper, mentality: Parameters<Engine['slotPosition']>[1],
      base?: { x: number; y: number }) => { x: number; y: number } = E.slotPosition;
    expect(project(keeper, 'attacking', { x: 80, y: 30 }),
      'CM_POSITION_KEEPER_ROLE_NOT_DERIVED_FROM_CUSTOM_Y').toEqual({ x: 80, y: 28 });
    const preset = E.slotPosition(defender, 'attacking');
    const base = { x: 70, y: 90 };
    const spread = (preset.x - defender.x) / (defender.x - 50);
    expect(project(defender, 'attacking', base),
      'CM_POSITION_ONE_PROJECTION_PATH').toEqual({
      x: Math.max(6, Math.min(94, base.x + (base.x - 50) * spread)),
      y: Math.max(6, Math.min(94, base.y + preset.y - defender.y)),
    });
  });

  it('reads the saved custom second-half snapshot rather than a changed tactics-tab shape', async () => {
    const { E, state } = await fixture();
    const changed = clone(state) as CareerState & SavedPositions;
    changed.customShape = { v: 2, formationIndex: 999, points: [] };
    const a = seeded(1457401, () => E.startSecondHalf(state));
    const b = seeded(1457401, () => E.startSecondHalf(changed));
    expect(secondRates(actualLive(a.value, 'CM_POSITION_REAL_SECOND_HALF_A'))).toEqual(
      secondRates(actualLive(b.value, 'CM_POSITION_REAL_SECOND_HALF_B')));
    expect(b.draws, 'CM_POSITION_FROZEN_SECOND_HALF_DRAW_STREAM').toEqual(a.draws);
    expect(actualLive(b.value, 'CM_POSITION_SECOND_HALF_MARKER').positionRules).toBe(1);
    const legacy = clone(state);
    delete (legacy.live as SavedLive).positionRules;
    const old = seeded(1457401, () => E.startSecondHalf(legacy));
    const oldRates = secondRates(actualLive(old.value, 'CM_POSITION_SECOND_HALF_LEGACY_WITNESS'));
    expect(oldRates.every(value => typeof value === 'number' && value > 0.06 && value < 2.1),
      'CM_POSITION_SECOND_HALF_UNCLAMPED_WITNESS').toBe(true);
    expect(secondRates(actualLive(a.value, 'CM_POSITION_SECOND_HALF_ACTIVE_WITNESS')),
      'CM_POSITION_SECOND_HALF_ACTUAL_GEOMETRY_EFFECT').not.toEqual(oldRates);
  });

  it('never opts an unmarked saved live match into a later career shape', async () => {
    const { E, state } = await fixture(false);
    const changed = clone(state) as CareerState & SavedPositions;
    changed.customShape = { v: 1, formationIndex: state.formationIndex,
      points: E.FORMATIONS[state.formationIndex].slots.map(p => ({ x: p.x, y: 6 })) };
    const a = seeded(1457402, () => E.startSecondHalf(state));
    const b = seeded(1457402, () => E.startSecondHalf(changed));
    expect(secondRates(actualLive(b.value, 'CM_POSITION_LEGACY_SECOND_B'))).toEqual(
      secondRates(actualLive(a.value, 'CM_POSITION_LEGACY_SECOND_A')));
    expect(b.draws, 'CM_POSITION_LEGACY_NO_OPT_IN_DRAWS').toEqual(a.draws);
    expect(Object.prototype.hasOwnProperty.call(actualLive(b.value, 'CM_POSITION_LEGACY_NO_MARKER'), 'positionRules'),
      'CM_POSITION_LEGACY_NO_NEW_FIELDS').toBe(false);
  });

  it('keeps custom points through a real duty change and chooses history strictly after its minute', async () => {
    const { E, state, shape } = await fixture();
    const change = dutyChange(E, state);
    const moved = seeded(1457403, () => E.changeLive(state, 46, change));
    const live = actualLive(moved.value, 'CM_POSITION_REAL_DUTY_CHANGE');
    expect(moved.draws, 'CM_POSITION_BREAK_DUTY_HAS_NO_REPLAY_DRAW').toHaveLength(0);
    expect(live.customShape, 'CM_POSITION_DUTY_KEEPS_CURRENT_POINTS').toEqual(shape);
    expect((last(live.formChanges) as SavedSnapshot | undefined)?.customShape,
      'CM_POSITION_DUTY_HISTORY_OWNS_POINTS').toEqual(shape);
    const at = E.liveShapeAt(live, 46) as SavedSnapshot;
    const after = E.liveShapeAt(live, 47) as SavedSnapshot;
    expect(at.duties?.[change.slot], 'CM_POSITION_HISTORY_STRICT_MINUTE').not.toBe(change.duty);
    expect(after.duties?.[change.slot]).toBe(change.duty);
    expect(at.customShape).toEqual(shape); expect(after.customShape).toEqual(shape);
    expect(after.customShape).not.toBe(live.customShape);
  });

  it('clears only current custom points on a real formation change and retains the frozen kickoff', async () => {
    const { E, state, shape } = await fixture();
    const moved = seeded(1457404, () => E.changeLive(state, 46, newFormation(E, state)));
    const live = actualLive(moved.value, 'CM_POSITION_REAL_FORMATION_CHANGE');
    expect(live.positionRules).toBe(1);
    expect(Object.prototype.hasOwnProperty.call(live, 'customShape'), 'CM_POSITION_FORMATION_EXPLICIT_PRESET').toBe(false);
    expect(live.kickoffShape?.customShape, 'CM_POSITION_FORMATION_KEEPS_KICKOFF').toEqual(shape);
    expect((E.liveShapeAt(live, 46) as SavedSnapshot).customShape).toEqual(shape);
    expect(Object.prototype.hasOwnProperty.call(E.liveShapeAt(live, 47), 'customShape'),
      'CM_POSITION_FORMATION_PRESET_HISTORY').toBe(false);
    expect(E.startSecondHalf(moved.value!), 'CM_POSITION_MARKED_PRESET_CAN_RESUME').not.toBeNull();
  });

  it('rebuilds a missing first-half rate from kickoff geometry after a real formation change', async () => {
    const { E, state } = await fixture();
    const expected = [state.live!.lamMine, state.live!.lamOpp];
    const moved = E.changeLive(state, 46, newFormation(E, state));
    const live = actualLive(moved, 'CM_POSITION_FALLBACK_REAL_FORMATION_CHANGE');
    delete live.lamMine; delete live.lamOpp;
    const replayed = seeded(1457405, () => E.startSecondHalf(moved!));
    const actual = actualLive(replayed.value, 'CM_POSITION_FALLBACK_SECOND_HALF');
    expect([actual.lamMine, actual.lamOpp], 'CM_POSITION_FIRST_FALLBACK_USES_KICKOFF').toEqual(expected);
  });

  it('adds custom geometry to actual first-half recuts while preserving committed events', async () => {
    const { E, state } = await fixture();
    const ordinary = clone(state);
    delete (ordinary.live as SavedLive).positionRules;
    const preserved = state.live!.h1My?.filter(g => g.minute <= 30);
    const a = seeded(1457406, () => E.changeLive(state, 30, { kind: 'shape', mentality: 'balanced' }));
    const b = seeded(1457406, () => E.changeLive(ordinary, 30, { kind: 'shape', mentality: 'balanced' }));
    const marked = actualLive(a.value, 'CM_POSITION_RECUT_MARKED');
    const old = actualLive(b.value, 'CM_POSITION_RECUT_LEGACY');
    expect(marked.h1My?.filter(g => g.minute <= 30), 'CM_POSITION_RECUT_PAST_GOALS_HELD').toEqual(preserved);
    expect([last(old.h1Segs)?.lamMine, last(old.h1Segs)?.lamOpp]
      .every(value => typeof value === 'number' && value > 0.06 && value < 2.1),
    'CM_POSITION_FIRST_RECUT_UNCLAMPED_WITNESS').toBe(true);
    expect([last(marked.h1Segs)?.lamMine, last(marked.h1Segs)?.lamOpp],
      'CM_POSITION_FIRST_RECUT_HAS_GEOMETRY').not.toEqual(
      [last(old.h1Segs)?.lamMine, last(old.h1Segs)?.lamOpp]);
  });

  it('keeps a real short XI duty change valid without moving its canonical slot indexes', async () => {
    const { E, before } = await fixture(false);
    const input = clone(before);
    const formation = E.FORMATIONS[input.formationIndex];
    const full = E.effectiveXIWithSlots(input);
    expect(full, 'CM_POSITION_SHORT_XI_FULL_FOUNDATION').toHaveLength(11);
    const prefix = full.slice(0, 9);
    input.squad = input.squad.filter(p => prefix.some(row => row.p.id === p.id));
    const actual = E.effectiveXIWithSlots(input);
    expect(actual, 'CM_POSITION_SHORT_XI_ACTUAL_NINE').toHaveLength(9);
    expect(actual.map(row => row.p.id)).toEqual(prefix.map(row => row.p.id));
    actual.forEach((row, index) => {
      expect(row.slot, 'CM_POSITION_SHORT_XI_CANONICAL_INDEX').toBe(formation.slots[index]);
    });
    const ordinaryInput = clone(input);
    const shape: Shape = { v: 1, formationIndex: input.formationIndex,
      points: formation.slots.map(point => ({ x: point.x, y: point.y })) };
    (input as CareerState & SavedPositions).customShape = shape;
    const marked = seeded(1457601, () => E.playNextEntry(input, { noCoach: true }));
    const ordinary = seeded(1457601, () => E.playNextEntry(ordinaryInput, { noCoach: true }));
    expect(marked.value.kind, 'CM_POSITION_SHORT_XI_REAL_KICKOFF').toBe('halftime');
    expect(ordinary.value.kind).toBe('halftime');
    const markedLive = actualLive(marked.value.state, 'CM_POSITION_SHORT_XI_MARKED_LIVE');
    expect(markedLive.onPitch).toEqual(actual.map(row => row.p.id));
    expect(markedLive.positionRules, 'CM_POSITION_SHORT_XI_REAL_MARKER').toBe(1);
    expect([markedLive.lamMine, markedLive.lamOpp],
      'CM_POSITION_SHORT_XI_PRESET_RATE_PARITY').toEqual(
      [ordinary.value.live!.lamMine, ordinary.value.live!.lamOpp]);
    expect(marked.draws, 'CM_POSITION_SHORT_XI_PRESET_DRAW_PARITY').toEqual(ordinary.draws);
    const change = dutyChange(E, marked.value.state);
    const changed = seeded(1457602, () => E.changeLive(marked.value.state, 46, change));
    const oldChanged = seeded(1457602, () => E.changeLive(ordinary.value.state, 46, change));
    expect(changed.value, 'CM_POSITION_SHORT_XI_DUTY_ACCEPTED').not.toBeNull();
    expect(oldChanged.value, 'CM_POSITION_SHORT_XI_LEGACY_DUTY_FOUNDATION').not.toBeNull();
    const live = actualLive(changed.value, 'CM_POSITION_SHORT_XI_CHANGED_LIVE');
    expect(changed.draws, 'CM_POSITION_SHORT_XI_DUTY_ZERO_DRAWS').toHaveLength(0);
    expect(changed.draws).toEqual(oldChanged.draws);
    expect(live.onPitch, 'CM_POSITION_SHORT_XI_ORDER_HELD').toEqual(markedLive.onPitch);
    expect(last(live.formChanges)?.order, 'CM_POSITION_SHORT_XI_HISTORY_ORDER_HELD').toEqual(markedLive.onPitch);
    expect(last(live.formChanges)?.order).toHaveLength(9);
    const history = E.liveShapeAt(live, 47) as SavedSnapshot;
    expect(history.customShape, 'CM_POSITION_SHORT_XI_HISTORY_POINTS_HELD').toEqual(shape);
    expect(E.myOnPitchAt(live, 47)).toEqual(actual.map(row => row.p.id));
    expect(history.duties?.[change.slot]).toBe(change.duty);
    const resumed = seeded(1457603, () => E.startSecondHalf(changed.value!));
    const oldResumed = seeded(1457603, () => E.startSecondHalf(oldChanged.value!));
    expect(secondRates(actualLive(resumed.value, 'CM_POSITION_SHORT_XI_REAL_SECOND_HALF')),
      'CM_POSITION_SHORT_XI_SECOND_RATE_PARITY').toEqual(
      secondRates(actualLive(oldResumed.value, 'CM_POSITION_SHORT_XI_LEGACY_SECOND_HALF')));
    expect(resumed.draws, 'CM_POSITION_SHORT_XI_SECOND_DRAW_PARITY').toEqual(oldResumed.draws);
  });

  it('keeps an invalid career formation index on the old raw-preserving fallback without a new rule marker', async () => {
    const { E, before } = await fixture(false);
    const ordinaryInput = clone(before);
    ordinaryInput.formationIndex = E.FORMATIONS.length + 7;
    expect(Number.isSafeInteger(ordinaryInput.formationIndex)).toBe(true);
    expect(E.FORMATIONS[ordinaryInput.formationIndex],
      'CM_POSITION_INVALID_INDEX_IS_ACTUALLY_ABSENT').toBeUndefined();
    const input = clone(ordinaryInput);
    const shape: Shape = { v: 1, formationIndex: input.formationIndex,
      points: E.FORMATIONS[0].slots.map(point => ({ x: point.x, y: point.y })) };
    (input as CareerState & SavedPositions).customShape = shape;
    const raw = JSON.stringify(input);
    const marked = seeded(1457611, () => E.playNextEntry(input, { noCoach: true }));
    const ordinary = seeded(1457611, () => E.playNextEntry(ordinaryInput, { noCoach: true }));
    expect(marked.value.kind, 'CM_POSITION_INVALID_INDEX_REAL_KICKOFF').toBe('halftime');
    expect(ordinary.value.kind).toBe('halftime');
    const live = actualLive(marked.value.state, 'CM_POSITION_INVALID_INDEX_REAL_LIVE');
    expect([live.lamMine, live.lamOpp], 'CM_POSITION_INVALID_INDEX_NEUTRAL_RATES').toEqual(
      [ordinary.value.live!.lamMine, ordinary.value.live!.lamOpp]);
    expect(marked.draws, 'CM_POSITION_INVALID_INDEX_NEUTRAL_DRAWS').toEqual(ordinary.draws);
    expect(JSON.stringify(input), 'CM_POSITION_INVALID_INDEX_INPUT_HELD').toBe(raw);
    expect(JSON.stringify((marked.value.state as CareerState & SavedPositions).customShape),
      'CM_POSITION_INVALID_INDEX_RAW_SHAPE_HELD').toBe(JSON.stringify(shape));
    expect(Object.prototype.hasOwnProperty.call(live, 'positionRules'),
      'CM_POSITION_INVALID_INDEX_NO_NEW_RULE').toBe(false);
    expect(Object.prototype.hasOwnProperty.call(live, 'customShape')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(live, 'kickoffShape')).toBe(false);
    const resumed = seeded(1457612, () => E.startSecondHalf(marked.value.state));
    const oldResumed = seeded(1457612, () => E.startSecondHalf(ordinary.value.state));
    expect(resumed.value, 'CM_POSITION_INVALID_INDEX_FALLBACK_CAN_RESUME').not.toBeNull();
    expect(secondRates(actualLive(resumed.value, 'CM_POSITION_INVALID_INDEX_SECOND_LIVE'))).toEqual(
      secondRates(actualLive(oldResumed.value, 'CM_POSITION_INVALID_INDEX_ORDINARY_SECOND')));
    expect(resumed.draws, 'CM_POSITION_INVALID_INDEX_SECOND_DRAW_PARITY').toEqual(oldResumed.draws);
  });

  it.each(['unknown-rule', 'null-current', 'bad-current-formation', 'missing-kickoff', 'bad-history'] as const)(
    'refuses %s marked recovery before either mutation or a random draw', async kind => {
      const { E, state } = await fixture(false);
      const input = markPreset(E, state);
      const live = input.live as SavedLive;
      if (kind === 'unknown-rule') live.positionRules = 2;
      if (kind === 'null-current') live.customShape = null;
      if (kind === 'bad-current-formation') live.customShape = { v: 1, formationIndex: 999, points: [] };
      if (kind === 'missing-kickoff') delete live.kickoffShape;
      if (kind === 'bad-history') live.formChanges = [{
        minute: 30, formationIndex: live.formationIndex!, duties: clone(live.duties)!,
        order: [...live.onPitch], customShape: { v: 2 },
      } as unknown as NonNullable<LiveMatch['formChanges']>[number]];
      const raw = JSON.stringify(input);
      const checked = seeded(1457501, () => ({
        second: E.startSecondHalf(input),
        changed: E.changeLive(input, 30, { kind: 'shape', mentality: 'attacking' }),
      }));
      expect(checked.value.second, 'CM_POSITION_INVALID_MARKED_SECOND_REFUSED').toBeNull();
      expect(checked.value.changed, 'CM_POSITION_INVALID_MARKED_CHANGE_REFUSED').toBeNull();
      expect(checked.draws, 'CM_POSITION_INVALID_MARKED_ZERO_DRAWS').toHaveLength(0);
      expect(JSON.stringify(input), 'CM_POSITION_INVALID_MARKED_RAW_HELD').toBe(raw);
    },
  );

  it('returns exact paused recovery with a reason from non-null advancing APIs on an unknown rule', async () => {
    const { E, state } = await fixture(false);
    const input = markPreset(E, state);
    (input.live as SavedLive).positionRules = 2;
    const raw = JSON.stringify(input);
    const actual = seeded(1457502, () => ({
      resumed: E.resumeMatch(input), next: E.playNextEntry(input, { skipHalftime: true }),
      coached: E.coachQuickMatch(input), extra: E.startExtraTime(input),
      clock: E.markLiveMinute(input, 60), talk: E.giveHalftimeTalk(input, 'calm'),
    }));
    for (const result of [actual.value.resumed, actual.value.next]) {
      expect(result.state, 'CM_POSITION_INVALID_PAUSED_EXACT_CAREER').toBe(input);
      expect(result.kind).toBe('halftime'); expect(result.live).toBe(input.live);
      expect((result as typeof result & { blocked?: string }).blocked,
        'CM_POSITION_INVALID_PAUSED_REASON').toBe('position-state-invalid');
    }
    expect(actual.value.coached).toBe(input); expect(actual.value.extra).toBeNull();
    expect(actual.value.clock).toBe(input); expect(actual.value.talk).toBe(input);
    expect(actual.draws, 'CM_POSITION_INVALID_ADVANCE_ZERO_DRAWS').toHaveLength(0);
    expect(JSON.stringify(input)).toBe(raw);
  });
});
