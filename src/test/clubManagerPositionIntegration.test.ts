import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CareerState, LiveMatch } from '@/lib/clubManager';

type Engine = typeof import('@/lib/clubManager');
type Point = { x: number; y: number };
type RawShapeCarrier = { customShape?: unknown };
type ShapeMode = 'preset' | 'same' | 'forward' | 'deep' | 'future-version' | 'ten-points' | 'null-coordinate' | 'formation-mismatch' | 'null-shape';
const balanced = { press: 0, tempo: 0, width: 0, line: 0 } as const;
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function seeded<T>(seed: number, action: () => T) {
  const draws: number[] = [];
  const spy = vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = seed * 16807 % 2147483647;
    const value = (seed - 1) / 2147483646;
    draws.push(value);
    return value;
  });
  try { return { value: action(), draws }; } finally { spy.mockRestore(); }
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-23T16:00:00Z'));
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  localStorage.clear();
  sessionStorage.clear();
});

function rates(live: LiveMatch | null | undefined): [number, number] {
  expect(live, 'CM_POSITION_REAL_LIVE_FOUNDATION').toBeTruthy();
  const pair = [live?.lamMine, live?.lamOpp];
  expect(pair.every(value => typeof value === 'number' && Number.isFinite(value)),
    'CM_POSITION_REAL_FINITE_RATE_FOUNDATION').toBe(true);
  return pair as [number, number];
}

async function fresh() {
  // Separate real graphs keep module IDs and generator starting state aligned.
  vi.resetModules();
  let seed = 1456101;
  const initialDraws: number[] = [];
  const spy = vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = seed * 16807 % 2147483647;
    const value = (seed - 1) / 2147483646;
    initialDraws.push(value);
    return value;
  });
  try {
    const E = await import('@/lib/clubManager');
    await import('@/lib/clubManagerTactics');
    const career = E.startCareer('Everton');
    return { E, career, initialDraws };
  } finally {
    spy.mockRestore();
  }
}

function prepare(E: Engine, career: CareerState) {
  let probe = career;
  for (let index = 0; index < 24; index += 1) {
    // Explicit display/availability fixture preparation, not a substituted match.
    const input = clone(probe);
    input.squad = input.squad.map(player => ({
      ...player, fitness: 80, injuryWeeks: 0, suspendedMatches: 0,
    }));
    const instructed = E.setInstructions(input, balanced);
    expect(instructed, 'CM_POSITION_REAL_BALANCED_INSTRUCTIONS_FOUNDATION').not.toBeNull();
    const before = clone(instructed!);
    const seed = 1456200 + index;
    const next = seeded(seed, () => E.playNextEntry(instructed!, { noCoach: true }));
    if (next.value.kind === 'halftime') {
      const live = next.value.state.live;
      const entry = live ? next.value.state.calendar[live.week] : undefined;
      const pair = rates(live);
      // These are the existing league half-rate clamp bounds, not balance margins.
      if (entry?.type === 'league' && pair.every(value => value > 0.06 && value < 2.1)) {
        return { before, seed, expectedPresetRates: pair };
      }
      probe = seeded(1456300 + index, () => E.resumeMatch(next.value.state)).value.state;
    } else {
      probe = next.value.state;
    }
  }
  throw new Error('CM_POSITION_FIXTURE_NO_REAL_UNCLAMPED_LEAGUE_KICKOFF');
}

function shape(mode: ShapeMode, formationIndex: number, points: Point[], formationCount: number): unknown {
  const value = { v: 1, formationIndex, points: clone(points) };
  if (mode === 'forward') value.points = points.map(point => ({ x: point.x, y: 6 }));
  if (mode === 'deep') value.points = points.map(point => ({ x: point.x, y: 94 }));
  if (mode === 'future-version') return { ...value, v: 2 };
  if (mode === 'ten-points') return { ...value, points: value.points.slice(0, 10) };
  if (mode === 'null-coordinate') return { ...value, points: value.points.map((point, index) => index === 3 ? { x: null, y: point.y } : point) };
  if (mode === 'formation-mismatch') return { ...value, formationIndex: (formationIndex + 1) % formationCount };
  if (mode === 'null-shape') return null;
  return value;
}

async function kickoff(mode: ShapeMode) {
  const { E, career, initialDraws } = await fresh();
  const prepared = prepare(E, career);
  const input = clone(prepared.before);
  const formation = E.FORMATIONS[input.formationIndex];
  expect(formation, 'CM_POSITION_REAL_FORMATION_FOUNDATION').toBeTruthy();
  expect(formation.slots, 'CM_POSITION_EXACT_ELEVEN_SLOTS_FOUNDATION').toHaveLength(11);
  const points = formation.slots.map(slot => ({ x: slot.x, y: slot.y }));
  expect(points.every(point => Number.isFinite(point.x) && Number.isFinite(point.y)
    && point.x >= 6 && point.x <= 94 && point.y >= 6 && point.y <= 94),
  'CM_POSITION_VALID_PRESET_POINT_FOUNDATION').toBe(true);
  if (mode !== 'preset') {
    // Only this synthetic future optional field crosses a type boundary.
    (input as unknown as RawShapeCarrier).customShape = shape(mode, input.formationIndex, points, E.FORMATIONS.length);
  }
  const rawInput = JSON.stringify(input);
  const rawCustom = JSON.stringify((input as unknown as RawShapeCarrier).customShape);
  const formationBefore = JSON.stringify(E.FORMATIONS);
  const actualXI = E.effectiveXIWithSlots(input);
  expect(actualXI, 'CM_POSITION_REAL_ELEVEN_XI_FOUNDATION').toHaveLength(11);
  expect(new Set(actualXI.map(row => row.p.id)).size, 'CM_POSITION_REAL_UNIQUE_XI_FOUNDATION').toBe(11);
  actualXI.forEach((row, index) => {
    expect(row.slot, 'CM_POSITION_CANONICAL_SLOT_IDENTITY_FOUNDATION').toBe(formation.slots[index]);
    expect(E.fitGrade(row.p, row.slot!)).toBe(E.fitGrade(row.p, formation.slots[index]));
  });
  expect(actualXI.filter(row => row.slot?.allowed.includes('GK')),
    'CM_POSITION_ASSIGNED_KEEPER_FOUNDATION').toHaveLength(1);
  const result = seeded(prepared.seed, () => E.playNextEntry(input, { noCoach: true }));
  expect(result.value.kind, 'CM_POSITION_REAL_LEAGUE_KICKOFF_FOUNDATION').toBe('halftime');
  const live = result.value.state.live;
  expect(live && result.value.state.calendar[live.week]?.type,
    'CM_POSITION_ACTUAL_LEAGUE_NOT_FAKE_MATCH_FOUNDATION').toBe('league');
  expect(live?.formationIndex).toBe(input.formationIndex);
  expect(JSON.stringify(input), 'CM_POSITION_KICKOFF_INPUT_IMMUTABLE').toBe(rawInput);
  expect(JSON.stringify(E.FORMATIONS), 'CM_POSITION_PRESETS_NOT_MUTATED').toBe(formationBefore);
  expect(JSON.stringify((result.value.state as unknown as RawShapeCarrier).customShape),
    'CM_POSITION_RAW_SHAPE_RETAINED').toBe(rawCustom);
  expect(Object.prototype.hasOwnProperty.call(result.value.state, 'customShape'))
    .toBe(mode !== 'preset');
  E.effectiveXIWithSlots(input).forEach((row, index) => {
    expect(row.slot, 'CM_POSITION_CANONICAL_SLOT_IDENTITY_AFTER_KICKOFF').toBe(formation.slots[index]);
  });
  return {
    input, state: result.value.state, rates: rates(live), draws: result.draws, initialDraws,
    seed: prepared.seed, formationIndex: input.formationIndex,
    opponent: live!.opponent, preset: prepared.expectedPresetRates,
  };
}

function sameFixture(a: Awaited<ReturnType<typeof kickoff>>, b: Awaited<ReturnType<typeof kickoff>>) {
  expect([b.seed, b.formationIndex, b.opponent], 'CM_POSITION_PAIRED_REAL_FIXTURE_FOUNDATION')
    .toEqual([a.seed, a.formationIndex, a.opponent]);
  expect(b.preset, 'CM_POSITION_PAIRED_BASELINE_RATE_FOUNDATION').toEqual(a.preset);
  expect(b.initialDraws, 'CM_POSITION_PAIRED_INITIAL_DRAW_FOUNDATION').toEqual(a.initialDraws);
}

describe('Custom base positions reach actual balanced Club Manager kickoffs', { timeout: 120000 }, () => {
  it('changes a real kickoff rate pair when all eleven base positions move forward', async () => {
    const ordinary = await kickoff('preset');
    const same = await kickoff('same');
    const forward = await kickoff('forward');
    sameFixture(ordinary, same);
    sameFixture(ordinary, forward);
    expect(same.rates, 'CM_POSITION_SAME_COORDINATES_RATE_PARITY').toEqual(ordinary.rates);
    expect(forward.rates, 'CM_POSITION_FORWARD_CHANGES_REAL_RATES').not.toEqual(ordinary.rates);
    // Direction and numeric balance margins remain UNSET until an actual profile is measured.
  });

  it('changes a real kickoff rate pair when all eleven base positions move deep', async () => {
    const ordinary = await kickoff('preset');
    const deep = await kickoff('deep');
    sameFixture(ordinary, deep);
    expect(deep.rates, 'CM_POSITION_DEEP_CHANGES_REAL_RATES').not.toEqual(ordinary.rates);
  });

  it('keeps a same-coordinate custom shape neutral in real rates and the actual draw stream', async () => {
    const ordinary = await kickoff('preset');
    const same = await kickoff('same');
    sameFixture(ordinary, same);
    expect(same.rates, 'CM_POSITION_SAME_COORDINATES_NEUTRAL_RATE').toEqual(ordinary.rates);
    expect(same.draws, 'CM_POSITION_SAME_COORDINATES_NEUTRAL_DRAWS').toEqual(ordinary.draws);
  });

  it.each(['preset', 'future-version', 'ten-points', 'null-coordinate', 'formation-mismatch', 'null-shape'] as const)(
    'keeps %s input neutral without deleting its raw optional data', async mode => {
      const ordinary = await kickoff('preset');
      const inactive = await kickoff(mode);
      sameFixture(ordinary, inactive);
      expect(inactive.rates, 'CM_POSITION_INACTIVE_SHAPE_RATE_PARITY').toEqual(ordinary.rates);
      expect(inactive.draws, 'CM_POSITION_INACTIVE_SHAPE_DRAW_PARITY').toEqual(ordinary.draws);
      // This is raw optional-data preservation, not whole-old-engine parity proof.
    },
  );
});
