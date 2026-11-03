import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stagePitchInput } from '@/components/club-manager/LiveSimScreen';
import {
  FORMATIONS, engineRegistrations, pitchLineOf, playNextEntry,
  restoreEngineRegistrations, slotPosition, startCareer,
} from '@/lib/clubManager';
import type { CareerState, LiveMatch, Mentality } from '@/lib/clubManager';

type Point = { x: number; y: number };
type Shape = { v: 1; formationIndex: number; points: Point[] };
type Input = ReturnType<typeof stagePitchInput>;
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const fields = (value: object) => value as Record<string, unknown>;
let registrations: ReturnType<typeof engineRegistrations>, random: ReturnType<typeof vi.spyOn>;

function fixture() {
  const career = startCareer('Live Shape Lab', 'now', {
    name: 'Live Shape Lab', leagueId: 'premier', stadium: 'Shape Ground',
    budgetTier: 'small', quality: 72, replacedClub: '',
    crest: { shape: 0, pattern: 0, color1: '#2563eb', color2: '#ffffff', initials: 'LS' },
  });
  career.mentality = 'balanced';
  const result = playNextEntry(career);
  expect(result.kind, 'CM_CUSTOM_STAGE_REAL_KICKOFF').toBe('halftime');
  expect(result.state.live, 'CM_CUSTOM_STAGE_REAL_LIVE').toBeTruthy();
  return { career: result.state, live: result.state.live! };
}
function shape(index: number, direction: number): Shape {
  return { v: 1, formationIndex: index, points: FORMATIONS[index].slots.map((slot, i) => ({
    x: Math.max(6, Math.min(94, slot.x + direction * (i % 2 ? 8 : -8))),
    y: Math.max(6, Math.min(94, slot.y + direction * (i === 0 ? -5 : -9))),
  })) };
}
function sample(career: CareerState, live: LiveMatch | null, mineAt = 0, stage: 'first' | 'done' = 'first') {
  return stagePitchInput(career, live, null, stage, mineAt, undefined, stage === 'done' ? 90 : 45, 0, mineAt);
}
const geometry = (input: Input) => input.mine.map(figure => ({ key: figure.key, line: figure.line, slot: figure.slot }));
function expected(input: Input, value: Shape, mentality: Mentality) {
  return input.mine.map(figure => {
    expect(figure.key, 'CM_CUSTOM_STAGE_CANONICAL_KEY').toMatch(/^m\d+$/);
    const i = Number(figure.key.slice(1)), slot = FORMATIONS[value.formationIndex].slots[i];
    expect(slot, 'CM_CUSTOM_STAGE_ORIGINAL_SLOT_INDEX').toBeDefined();
    // Reuse the current public two-argument projection with the same canonical role and chosen coordinates.
    return { key: figure.key, line: pitchLineOf(slot), slot: slotPosition({ ...slot, ...value.points[i] }, mentality) };
  });
}
const withoutMineCoordinates = (input: Input) => ({ ...input, mine: input.mine.map(({ slot, ...figure }) => figure) });
function retain(key: string, observations: unknown) {
  const value = { case: key, fixture: 'Real fictional-club kickoff with explicitly synthetic saved-position metadata for presentation only; no sports data import', observations };
  const out = process.env.CM_CUSTOM_STAGE_RAW;
  if (out) {
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, key + '.json'), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  }
  console.info('CM_CUSTOM_STAGE ' + JSON.stringify(value));
}
beforeEach(() => {
  registrations = engineRegistrations(); localStorage.clear();
  let seed = 317;
  random = vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  });
  vi.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 10, 3, 12));
});
afterEach(() => { restoreEngineRegistrations(registrations); vi.restoreAllMocks(); localStorage.clear(); });

describe('Club Manager custom live pitch input', () => {
  it('projects the marked live snapshot into actual pitch input while keeping roles, opponent and feed unchanged', () => {
    const f = fixture(), index = f.live.formationIndex!;
    const saved = shape(index, 1), other = shape(index, -1);
    const live = Object.assign(copy(f.live), { positionRules: 1, customShape: saved,
      kickoffShape: { formationIndex: index, duties: [...f.live.duties!], customShape: copy(saved) } });
    const career = Object.assign(copy(f.career), { customShape: other });
    career.mentality = 'defensive'; live.mentality = 'attacking';
    const plain = copy(live);
    delete fields(plain).positionRules; delete fields(plain).customShape; delete fields(plain).kickoffShape;
    const beforeCareer = JSON.stringify(career), beforeLive = JSON.stringify(live);
    random.mockClear();
    const actual = sample(career, live), legacy = sample(career, plain), want = expected(actual, saved, live.mentality);
    retain('current', { actual: geometry(actual), expected: want, legacy: geometry(legacy),
      inputHeld: JSON.stringify(career) === beforeCareer && JSON.stringify(live) === beforeLive,
      otherInputHeld: JSON.stringify(withoutMineCoordinates(actual)) === JSON.stringify(withoutMineCoordinates(legacy)), draws: random.mock.calls.length });
    expect(actual.mine).toHaveLength(11); expect(want).not.toEqual(geometry(legacy));
    expect(withoutMineCoordinates(actual)).toEqual(withoutMineCoordinates(legacy));
    expect(JSON.stringify(career)).toBe(beforeCareer); expect(JSON.stringify(live)).toBe(beforeLive);
    expect(random).not.toHaveBeenCalled();
    expect(geometry(actual), 'CM_CUSTOM_STAGE_CURRENT_POINTS').toEqual(want);
  });

  it('uses the same strictly-after history snapshot and canonical indexes as the live lineup', () => {
    const f = fixture(), index = f.live.formationIndex!;
    const kickoff = shape(index, 1), changed = shape(index, -1), now = shape(index, 0);
    const step = Object.assign({ minute: 20, formationIndex: index, order: [...f.live.startXi], duties: [...f.live.duties!] }, { customShape: copy(changed) });
    const live = Object.assign(copy(f.live), { positionRules: 1, customShape: now,
      kickoffShape: { formationIndex: index, duties: [...f.live.duties!], customShape: copy(kickoff) }, formChanges: [step] });
    const career = Object.assign(copy(f.career), { customShape: now });
    const before = JSON.stringify({ career, live });
    random.mockClear();
    const early = sample(career, live, 19), later = sample(career, live, 20);
    const actual = { early: geometry(early), later: geometry(later) };
    const want = { early: expected(early, kickoff, live.mentality), later: expected(later, changed, live.mentality) };
    retain('history', { actual, expected: want, inputHeld: JSON.stringify({ career, live }) === before, draws: random.mock.calls.length });
    expect(want.early).not.toEqual(want.later);
    expect(JSON.stringify({ career, live })).toBe(before); expect(random).not.toHaveBeenCalled();
    expect(actual, 'CM_CUSTOM_STAGE_HISTORY_POINTS').toEqual(want);
  });

  it('keeps old unmarked live and standalone finished-report projections independent of later career positions', () => {
    const f = fixture(), index = f.live.formationIndex!;
    const clean = copy(f.career), unmarked = copy(f.live);
    delete fields(clean).customShape; delete fields(unmarked).positionRules;
    delete fields(unmarked).customShape; delete fields(unmarked).kickoffShape;
    const career = Object.assign(copy(clean), { customShape: shape(index, 1) });
    const stray = Object.assign(copy(unmarked), { customShape: shape(index, -1) });
    const before = JSON.stringify({ career, stray });
    random.mockClear();
    const actualLive = sample(career, stray), oldLive = sample(clean, unmarked);
    const actualDone = sample(career, null, 90, 'done'), oldDone = sample(clean, null, 90, 'done');
    retain('legacy', { unmarkedEqual: JSON.stringify(actualLive) === JSON.stringify(oldLive),
      reportEqual: JSON.stringify(actualDone) === JSON.stringify(oldDone), inputHeld: JSON.stringify({ career, stray }) === before, draws: random.mock.calls.length });
    expect(actualLive).toEqual(oldLive); expect(actualDone).toEqual(oldDone);
    expect(JSON.stringify({ career, stray })).toBe(before); expect(random).not.toHaveBeenCalled();
  });
});
