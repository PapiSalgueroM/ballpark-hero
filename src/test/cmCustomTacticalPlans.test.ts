import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FORMATIONS, SET_PIECE_KEYS, autoPickXI, dutyOptions, instructionsOf,
  playNextEntry, setDuty, setInstructions, setSetPiece, setShootoutOrder, startCareer,
} from '@/lib/clubManager';
import type { CareerState, Mentality } from '@/lib/clubManager';
import {
  MATCH_PLAN_LIMIT, applyMatchPlan, deleteMatchPlan, matchPlansOf, previewMatchPlan, saveMatchPlan,
} from '@/lib/clubManagerMatchPlans';

type Instructions = { press: -1 | 0 | 1; tempo: -1 | 0 | 1; width: -1 | 0 | 1; line: -1 | 0 | 1 };
type Shape = { v: 1; formationIndex: number; points: { x: number; y: number }[] };
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const fields = (value: object) => value as Record<string, unknown>;
const shapeOf = (value: object) => fields(value).customShape ?? null;
const BALANCED: Instructions = { press: 0, tempo: 0, width: 0, line: 0 };
const A: Instructions = { press: 1, tempo: -1, width: -1, line: 1 };
const B: Instructions = { press: -1, tempo: 1, width: 1, line: -1 };
const POINTS = [
  { x: 50, y: 91 }, { x: 16, y: 72 }, { x: 38, y: 76 }, { x: 62, y: 76 },
  { x: 84, y: 72 }, { x: 30, y: 55 }, { x: 50, y: 50 }, { x: 70, y: 55 },
  { x: 18, y: 28 }, { x: 50, y: 18 }, { x: 82, y: 28 },
];
const shape = (formationIndex: number, second = false): Shape => ({
  v: 1, formationIndex,
  points: POINTS.map((point, index) => ({ x: point.x, y: point.y + (second && index > 0 ? 5 : 0) })),
});
let random: ReturnType<typeof vi.spyOn>;

function fixture() {
  const career = startCareer('Tactical Plan Lab', 'now', {
    name: 'Tactical Plan Lab', leagueId: 'premier', stadium: 'Plan Ground',
    budgetTier: 'small', quality: 72, replacedClub: '',
    crest: { shape: 0, pattern: 0, color1: '#2563eb', color2: '#ffffff', initials: 'TP' },
  });
  expect(career.squad.length, 'CM_CUSTOM_PLAN_REAL_FICTIONAL_BUILDER').toBeGreaterThan(14);
  return { ...career, squad: career.squad.map(player => ({
    ...player, fitness: 90, injuryWeeks: 0, suspendedMatches: 0,
  })) };
}

function setup(base: CareerState, index: number, mentality: Mentality, instructions: Instructions, custom: Shape | null) {
  let career: CareerState = {
    ...copy(base), formationIndex: index, mentality,
    xiIds: autoPickXI(base.squad, FORMATIONS[index]), xiDuties: [],
  };
  for (let slot = 0; slot < FORMATIONS[index].slots.length; slot += 1) {
    career = setDuty(career, slot, dutyOptions(FORMATIONS[index].slots[slot])[0] ?? null)!;
  }
  const outfield = career.squad.filter(player => player.position !== 'GK' && !player.onLoan);
  for (let index = 0; index < SET_PIECE_KEYS.length; index += 1) {
    career = setSetPiece(career, SET_PIECE_KEYS[index], outfield[index].id)!;
  }
  career = setShootoutOrder(career, outfield.slice(0, 5).map(player => player.id))!;
  const instructed = setInstructions(career, instructions);
  expect(instructed, 'CM_CUSTOM_PLAN_REAL_INSTRUCTIONS_SETUP').not.toBeNull();
  career = instructed!;
  if (custom) Object.assign(career, { customShape: copy(custom) });
  else delete fields(career).customShape;
  return career;
}

function assignments(value: {
  formationIndex: number; mentality: Mentality; xiIds: (string | null)[];
  xiDuties?: unknown; setPieces?: unknown; shootoutOrder?: unknown;
}) {
  return copy({
    formationIndex: value.formationIndex, mentality: value.mentality, xiIds: value.xiIds,
    xiDuties: value.xiDuties, setPieces: value.setPieces, shootoutOrder: value.shootoutOrder ?? [],
  });
}
const tactics = (career: CareerState) => ({
  ...assignments(career), instructions: copy(instructionsOf(career)), customShape: copy(shapeOf(career)),
});
function payload(plan: object) {
  const raw = fields(plan);
  return {
    version: raw.version, hasInstructions: Object.prototype.hasOwnProperty.call(raw, 'instructions'),
    instructions: raw.instructions ?? null, hasCustomShape: Object.prototype.hasOwnProperty.call(raw, 'customShape'),
    customShape: raw.customShape ?? null,
  };
}
function unrelated(career: CareerState) {
  const result = fields(copy(career));
  for (const key of ['formationIndex', 'mentality', 'xiIds', 'xiDuties', 'setPieces', 'shootoutOrder', 'instructions', 'customShape']) delete result[key];
  return result;
}
const withPlans = (career: CareerState, plans: unknown[]) => Object.assign(copy(career), { matchPlans: plans });
function retain(key: string, observations: unknown) {
  const raw = { case: key, fixture: 'Fictional career from the real builder; explicit synthetic PR382 v1 positions; no new sports data', observations };
  const directory = process.env.CM_CUSTOM_PLAN_HELPER_RAW;
  if (directory) {
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, key + '.json'), JSON.stringify(raw, null, 2) + '\n', { flag: 'wx' });
  }
  console.info('CM_CUSTOM_PLAN_HELPER ' + JSON.stringify(raw));
}

beforeEach(() => {
  let seed = 607;
  random = vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  });
  vi.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 10, 3, 12));
});
afterEach(() => { vi.restoreAllMocks(); });

describe('Club Manager complete custom tactical plans', () => {
  it('captures a detached version two snapshot of the full custom plan', () => {
    const career = setup(fixture(), 0, 'attacking', A, shape(0)), before = copy(career);
    random.mockClear();
    const saved = saveMatchPlan(career, 0, '  Patient press  '), plan = matchPlansOf(saved)[0];
    expect(plan, 'CM_CUSTOM_PLAN_CAPTURE_SETUP').toBeDefined();
    expect(assignments(plan)).toEqual(assignments(before));
    expect(plan.name).toBe('Patient press'); expect(career).toEqual(before);
    expect(random).not.toHaveBeenCalled();
    const invalidInputs = [
      Object.assign(copy(saved), { instructions: { ...A, press: 2 } }),
      Object.assign(copy(saved), { customShape: { ...shape(0), v: 2 } }),
      Object.assign(copy(saved), { customShape: shape(1) }),
    ];
    const refusedCaptures = invalidInputs.map(input => {
      const before = JSON.stringify(input), result = saveMatchPlan(input, 1, 'Refuse unsupported');
      expect(JSON.stringify(input)).toBe(before);
      return result === input && JSON.stringify(result.matchPlans) === JSON.stringify(input.matchPlans);
    });
    expect(random).not.toHaveBeenCalled();
    career.instructions!.press = -1;
    (shapeOf(career) as Shape).points[0].x = 6;
    const actual = payload(plan), expected = {
      version: 2, hasInstructions: true, instructions: A, hasCustomShape: true, customShape: shape(0),
    };
    retain('capture', { actual, expected, refusedCaptures, assignments: assignments(plan), inputHeldBeforeAliasProbe: true, randomDraws: random.mock.calls.length });
    expect({ payload: actual, refusedCaptures }, 'CM_CUSTOM_PLAN_V2_CAPTURE').toEqual({ payload: expected, refusedCaptures: [true, true, true] });
  });

  it('reapplies two distinct named custom mixes without leaving the previous instructions or shape behind', () => {
    const first = setup(fixture(), 0, 'attacking', A, shape(0)), expectedFirst = tactics(first);
    const savedFirst = saveMatchPlan(first, 0, 'Patient press');
    const second = setup(savedFirst, 1, 'defensive', B, shape(1, true)), expectedSecond = tactics(second);
    const savedSecond = saveMatchPlan(second, 1, 'Wide counter');
    const current = setup(savedSecond, 2, 'balanced', BALANCED, shape(2)), before = copy(current);
    random.mockClear();
    const appliedFirst = applyMatchPlan(current, 0), firstHeld = copy(appliedFirst);
    const appliedSecond = applyMatchPlan(appliedFirst, 1);
    expect(current).toEqual(before); expect(appliedFirst).toEqual(firstHeld);
    expect(unrelated(appliedFirst)).toEqual(unrelated(current));
    expect(unrelated(appliedSecond)).toEqual(unrelated(current)); expect(random).not.toHaveBeenCalled();
    const actual = { first: tactics(appliedFirst), second: tactics(appliedSecond) };
    const expected = { first: expectedFirst, second: expectedSecond };
    retain('switch', { actual, expected, inputUnchanged: true, unrelatedStateHeld: true, randomDraws: random.mock.calls.length });
    expect(actual, 'CM_CUSTOM_PLAN_V2_APPLY_MIX').toEqual(expected);
  });

  it('previews the saved custom mix without changing the active career or plan', () => {
    const first = setup(fixture(), 0, 'attacking', A, shape(0)), expected = tactics(first);
    const saved = saveMatchPlan(first, 0, 'Patient press');
    const current = setup(saved, 1, 'defensive', B, shape(1, true)), before = copy(current);
    random.mockClear();
    const preview = previewMatchPlan(current, 0);
    expect(preview, 'CM_CUSTOM_PLAN_PREVIEW_SETUP').not.toBeNull();
    expect(current).toEqual(before); expect(preview!.plan).toEqual(matchPlansOf(current)[0]);
    expect(random).not.toHaveBeenCalled();
    const actual = tactics(preview!.state);
    retain('preview', { actual, expected, active: tactics(current), inputUnchanged: true, randomDraws: random.mock.calls.length });
    expect(actual, 'CM_CUSTOM_PLAN_V2_PREVIEW_MIX').toEqual(expected);
  });

  it('records balanced instructions and a preset shape explicitly and removes both optional career fields on apply', () => {
    const preset = setup(fixture(), 0, 'balanced', BALANCED, null), expectedTactics = tactics(preset);
    const saved = saveMatchPlan(preset, 0, 'Reset plan');
    const current = setup(saved, 1, 'attacking', A, shape(1)), before = copy(current);
    random.mockClear();
    const applied = applyMatchPlan(current, 0), plan = matchPlansOf(current)[0];
    expect(current).toEqual(before); expect(unrelated(applied)).toEqual(unrelated(current));
    expect(random).not.toHaveBeenCalled();
    const actual = { payload: payload(plan), applied: tactics(applied),
      ownsInstructions: Object.prototype.hasOwnProperty.call(applied, 'instructions'), ownsCustomShape: Object.prototype.hasOwnProperty.call(applied, 'customShape') };
    const expected = { payload: { version: 2, hasInstructions: true, instructions: BALANCED, hasCustomShape: true, customShape: null },
      applied: expectedTactics, ownsInstructions: false, ownsCustomShape: false };
    retain('reset', { actual, expected, inputUnchanged: true, unrelatedStateHeld: true, randomDraws: random.mock.calls.length });
    expect(actual, 'CM_CUSTOM_PLAN_V2_EXPLICIT_RESET').toEqual(expected);
  });

  it('keeps version one plans readable and leaves unrecorded current instructions unchanged', () => {
    const first = setup(fixture(), 0, 'attacking', A, shape(0));
    const legacy = fields(copy(matchPlansOf(saveMatchPlan(first, 0, 'Legacy XI'))[0]));
    legacy.version = 1; delete legacy.instructions; delete legacy.customShape;
    const current = withPlans(setup(first, 1, 'defensive', B, shape(1, true)), [legacy]), before = copy(current);
    random.mockClear();
    const read = matchPlansOf(current), preview = previewMatchPlan(current, 0), applied = applyMatchPlan(current, 0);
    retain('legacy', { readable: read.length, preview: preview !== null,
      actualAssignments: assignments(applied), expectedAssignments: assignments(legacy as unknown as CareerState),
      actualInstructions: instructionsOf(applied), expectedInstructions: B,
      rawLegacyFields: Object.keys(legacy), inputUnchanged: JSON.stringify(current) === JSON.stringify(before),
      randomDraws: random.mock.calls.length });
    expect(read).toHaveLength(1); expect(preview).not.toBeNull();
    expect(assignments(applied)).toEqual(assignments(legacy as unknown as CareerState));
    expect(instructionsOf(applied)).toEqual(B); expect(current).toEqual(before);
    expect(random).not.toHaveBeenCalled();
  });

  it('refuses unsupported saved payloads without repairing or applying any part of them', () => {
    const first = setup(fixture(), 0, 'attacking', A, shape(0));
    const base = fields(copy(matchPlansOf(saveMatchPlan(first, 0, 'Valid assignments'))[0]));
    const versionTwo = { ...base, version: 2, instructions: A, customShape: shape(0) };
    const inputs = [
      { ...versionTwo, version: 99 }, { ...versionTwo, instructions: { ...A, tempo: 2 } },
      { ...versionTwo, customShape: { ...shape(0), v: 2 } }, { ...versionTwo, customShape: shape(1) },
    ];
    random.mockClear();
    const observations = inputs.map(raw => {
      const current = withPlans(first, [raw]), before = JSON.stringify(current);
      const readable = matchPlansOf(current), preview = previewMatchPlan(current, 0), applied = applyMatchPlan(current, 0);
      return { readable: readable.length, preview: preview !== null, sameCareer: applied === current,
        inputUnchanged: JSON.stringify(current) === before };
    });
    retain('unsupported-plan', { observations, randomDraws: random.mock.calls.length });
    expect(observations).toEqual(inputs.map(() => ({ readable: 0, preview: false, sameCareer: true, inputUnchanged: true })));
    expect(random).not.toHaveBeenCalled();
  });

  it('keeps the three-slot limit and refuses plan changes during a real live match', () => {
    let saved = fixture();
    for (let slot = 0; slot < MATCH_PLAN_LIMIT; slot += 1) saved = saveMatchPlan(saved, slot, 'Plan ' + (slot + 1));
    const before = copy(saved), live = playNextEntry(saved).state, liveBefore = copy(live);
    expect(live.live, 'CM_CUSTOM_PLAN_REAL_LIVE_SETUP').toBeTruthy();
    random.mockClear();
    const refusedFourth = saveMatchPlan(saved, 3, 'Fourth plan');
    const refusedSave = saveMatchPlan(live, 0, 'During match'), refusedApply = applyMatchPlan(live, 0), refusedDelete = deleteMatchPlan(live, 0);
    retain('limits-live', { slots: matchPlansOf(saved).map(plan => plan.slot), fourthRefused: refusedFourth === saved,
      liveSaveRefused: refusedSave === live, liveApplyRefused: refusedApply === live, liveDeleteRefused: refusedDelete === live,
      savedInputHeld: JSON.stringify(saved) === JSON.stringify(before), liveInputHeld: JSON.stringify(live) === JSON.stringify(liveBefore), randomDraws: random.mock.calls.length });
    expect(matchPlansOf(saved).map(plan => plan.slot)).toEqual([0, 1, 2]); expect(refusedFourth).toBe(saved);
    expect(refusedSave).toBe(live); expect(refusedApply).toBe(live); expect(refusedDelete).toBe(live);
    expect(saved).toEqual(before); expect(live).toEqual(liveBefore); expect(random).not.toHaveBeenCalled();
  });
});
