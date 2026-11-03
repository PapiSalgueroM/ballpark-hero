import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { instructionsOf, startCareer } from '@/lib/clubManager';
import type { CareerState } from '@/lib/clubManager';
import { applyMatchPlan, canEditMatchPlans, deleteMatchPlan, matchPlansOf, previewMatchPlan, saveMatchPlan } from '@/lib/clubManagerMatchPlans';

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const raw = (value: object) => value as Record<string, unknown>;
let random: ReturnType<typeof vi.spyOn>;
function fixture() {
  return startCareer('Plan Preservation Lab', 'now', {
    name: 'Plan Preservation Lab', leagueId: 'premier', stadium: 'Plan Ground',
    budgetTier: 'small', quality: 72, replacedClub: '',
    crest: { shape: 0, pattern: 0, color1: '#2563eb', color2: '#ffffff', initials: 'PP' },
  });
}
function prepared() {
  const saved = saveMatchPlan(fixture(), 0, 'Known plan');
  expect(matchPlansOf(saved).length, 'CM_CUSTOM_STORE_VALID_FOUNDATION').toBe(1);
  return saved;
}
function retain(key: string, observations: unknown) {
  const receipt = { case: key, fixture: 'Fictional real-builder career; explicitly malformed saved payloads, not real player facts', observations };
  const directory = process.env.CM_CUSTOM_PLAN_STORE_RAW;
  if (directory) {
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, key + '.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  }
  console.info('CM_CUSTOM_PLAN_STORE ' + JSON.stringify(receipt));
}
function refused(current: CareerState) {
  const before = JSON.stringify(current), store = JSON.stringify(current.matchPlans);
  const results = [saveMatchPlan(current, 0, 'Refused overwrite'), saveMatchPlan(current, 2, 'Refused new plan'),
    deleteMatchPlan(current, 0), applyMatchPlan(current, 0)];
  return { editable: canEditMatchPlans(current), allSameCareer: results.every(result => result === current),
    rawStoreHeld: results.every(result => JSON.stringify(result.matchPlans) === store),
    inputUnchanged: JSON.stringify(current) === before };
}
beforeEach(() => {
  let seed = 611;
  random = vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  });
  vi.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 10, 3, 12));
});
afterEach(() => { vi.restoreAllMocks(); });

describe('Club Manager unsupported tactical plan preservation', () => {
  it('locks a mixed raw store without dropping future data while known previews remain readable', () => {
    const saved = prepared(), supported = raw(copy(matchPlansOf(saved)[0]));
    const legacy = { ...supported, version: 1 };
    delete raw(legacy).instructions; delete raw(legacy).customShape;
    const future = { ...supported, slot: 1, version: 99 };
    const malformed = { ...supported, slot: 2, version: 2, instructions: { press: 2, tempo: 0, width: 0, line: 0 }, customShape: null };
    const current = Object.assign(copy(saved), { matchPlans: [legacy, future, malformed] });
    random.mockClear();
    const actual = refused(current), knownPreview = previewMatchPlan(current, 0);
    const unknownPreviews = [previewMatchPlan(current, 1), previewMatchPlan(current, 2)];
    retain('mixed', { actual, knownPreview: knownPreview !== null, unknownPreviews: unknownPreviews.map(value => value !== null), randomDraws: random.mock.calls.length });
    expect(actual, 'CM_CUSTOM_STORE_MIXED_KEPT').toEqual({ editable: false, allSameCareer: true, rawStoreHeld: true, inputUnchanged: true });
    expect(knownPreview).not.toBeNull(); expect(unknownPreviews).toEqual([null, null]);
    expect(random).not.toHaveBeenCalled();
  });

  it('keeps malformed non-array duplicate and over-capacity stores untouched', () => {
    const saved = prepared(), plan = copy(matchPlansOf(saved)[0]);
    const stores: unknown[] = [{ version: 99, entries: [plan] }, [plan, copy(plan)],
      [plan, { ...plan, slot: 1 }, { ...plan, slot: 2 }, { ...plan, slot: 3 }]];
    random.mockClear();
    const observations = stores.map(store => refused(Object.assign(copy(saved), { matchPlans: store })));
    retain('store-shapes', { observations, randomDraws: random.mock.calls.length });
    expect(observations, 'CM_CUSTOM_STORE_MALFORMED_KEPT').toEqual(stores.map(() => ({
      editable: false, allSameCareer: true, rawStoreHeld: true, inputUnchanged: true,
    })));
    expect(random).not.toHaveBeenCalled();
  });

  it('refuses unknown instruction axes in current tactics and in a version two plan', () => {
    const saved = prepared(), plan = copy(matchPlansOf(saved)[0]);
    const current = Object.assign(copy(saved), { instructions: { ...instructionsOf(saved), buildUp: 1 } });
    const futureShape = Object.assign(copy(saved), { customShape: { v: 99, formationIndex: saved.formationIndex, points: [] } });
    const stored = Object.assign(copy(saved), { matchPlans: [{ ...plan, version: 2,
      instructions: { ...instructionsOf(saved), buildUp: 1 }, customShape: null }] });
    random.mockClear();
    const observations = [current, futureShape, stored].map(value => refused(value));
    retain('extra-axis', { observations, storedPlanReadable: matchPlansOf(stored).length, randomDraws: random.mock.calls.length });
    expect(observations, 'CM_CUSTOM_STORE_UNKNOWN_TACTICS_KEPT').toEqual([current, futureShape, stored].map(() => ({
      editable: false, allSameCareer: true, rawStoreHeld: true, inputUnchanged: true,
    })));
    expect(matchPlansOf(stored)).toEqual([]); expect(random).not.toHaveBeenCalled();
  });

  it('keeps recognized foreign plans distinct from unsupported data when starting a new club setup', () => {
    const saved = prepared(), legacy = raw(copy(matchPlansOf(saved)[0]));
    legacy.version = 1; delete legacy.instructions; delete legacy.customShape; legacy.clubName = 'Former Plan Lab';
    const current = Object.assign(copy(saved), { matchPlans: [legacy] }), before = JSON.stringify(current);
    random.mockClear();
    const replacement = saveMatchPlan(current, 0, 'New club plan');
    retain('foreign', { editable: canEditMatchPlans(current), oldApplicable: matchPlansOf(current).length,
      replacementNames: matchPlansOf(replacement).map(plan => plan.name),
      replacementClubs: matchPlansOf(replacement).map(plan => plan.clubName),
      inputUnchanged: JSON.stringify(current) === before, randomDraws: random.mock.calls.length });
    expect(canEditMatchPlans(current)).toBe(true); expect(matchPlansOf(current)).toEqual([]);
    expect(matchPlansOf(replacement).map(plan => plan.name)).toEqual(['New club plan']);
    expect(matchPlansOf(replacement)[0].clubName).toBe(current.clubName);
    expect(JSON.stringify(current)).toBe(before); expect(random).not.toHaveBeenCalled();
  });
});
