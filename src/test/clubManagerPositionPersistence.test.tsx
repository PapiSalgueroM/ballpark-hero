import { useLayoutEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { useClubManager } from '@/hooks/useClubManager';
import * as E from '@/lib/clubManager';
import type { CareerState } from '@/lib/clubManager';
import { readCustomShape } from '@/lib/clubManagerPositions';
import { createSaveFence, saveFence } from '@/lib/saveFence';
import { activeSlot, switchSlot } from '@/lib/clubManagerSlots';
import * as plans from '@/lib/clubManagerMatchPlans';

vi.mock('@/lib/completions', () => ({
  recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn(),
}));

type Point = { x: number; y: number };
type PositionWriter = (formationIndex: number, points: readonly Point[] | null) => boolean;
type Api = ReturnType<typeof useClubManager> & { setCustomShape?: PositionWriter };
type Commit = { career: CareerState | null; raw: string | null };
let current: Api | null = null;
let commits: Commit[] = [];

function Harness() {
  const g: Api = useClubManager();
  current = g;
  useLayoutEffect(() => {
    commits.push({ career: g.career, raw: localStorage.getItem(E.SAVE_KEY) });
  }, [g.career]);
  return <p>{g.phase}</p>;
}
function read(): Api {
  if (!current) throw new Error('The real career hook has not mounted.');
  return current;
}
function career(): CareerState {
  const value = read().career;
  if (!value) throw new Error('The real hook has not opened a career.');
  return value;
}
function action(): PositionWriter {
  const fn = read().setCustomShape;
  expect(typeof fn, 'CM_POSITION_HOOK_ACTION_AVAILABLE').toBe('function');
  if (!fn) throw new Error('The owned action assertion should fail first.');
  return fn;
}
function preset(state = career()): Point[] {
  const formation = E.FORMATIONS[state.formationIndex];
  expect(formation?.slots.length, 'CM_POSITION_HOOK_REAL_ELEVEN').toBe(11);
  return formation.slots.map(slot => ({ x: slot.x, y: slot.y }));
}
function changed(state = career()): Point[] {
  const points = preset(state);
  points[0] = { x: 62, y: 40 };
  expect(points[0], 'CM_POSITION_HOOK_CHANGED_POINT_FOUNDATION').not.toEqual(preset(state)[0]);
  return points;
}
function supported(state = career()) {
  const formation = E.FORMATIONS[state.formationIndex];
  return readCustomShape(state.customShape, state.formationIndex, formation.slots);
}
function raw(): string {
  const value = localStorage.getItem(E.SAVE_KEY);
  expect(typeof value, 'CM_POSITION_HOOK_REAL_RAW_PRESENT').toBe('string');
  return value!;
}
function storage() {
  return Object.fromEntries(Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)!)
    .sort().map(key => [key, localStorage.getItem(key)]));
}
async function boot(edit?: (state: CareerState) => CareerState) {
  const made = E.startCareer('Everton');
  const prepared = edit ? edit(made) : made;
  saveFence.release(E.SAVE_KEY);
  expect(E.saveCareer(prepared), 'CM_POSITION_HOOK_REAL_FIXTURE_WRITE').toBe(true);
  const view = render(<Harness />);
  await waitFor(() => expect(read().phase, 'CM_POSITION_HOOK_REAL_RESUME_FOUNDATION').toBe('resume'), { timeout: 10000 });
  act(() => read().resume());
  await waitFor(() => expect(read().phase).toBe('hub'), { timeout: 10000 });
  expect(career().squad.length > 10, 'CM_POSITION_HOOK_REAL_ROSTER').toBe(true);
  preset();
  commits = [];
  return view;
}
function refuseNativeCareerWrites() {
  const actual = Storage.prototype.setItem;
  return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
    if (this === localStorage && key === E.SAVE_KEY) throw new DOMException('Controlled quota refusal', 'QuotaExceededError');
    return actual.call(this, key, value);
  });
}
function otherFormation(state = career()) {
  const index = E.FORMATIONS.findIndex((formation, index) => index !== state.formationIndex && formation.slots.length === 11);
  expect(index >= 0, 'CM_POSITION_HOOK_OTHER_REAL_FORMATION').toBe(true);
  return index;
}

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); current = null; commits = [];
  saveFence.release(E.SAVE_KEY);
  let seed = 1458001;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = seed * 16807 % 2147483647;
    return (seed - 1) / 2147483646;
  });
});
afterEach(() => {
  vi.restoreAllMocks(); cleanup(); saveFence.release(E.SAVE_KEY);
  current = null; commits = []; localStorage.clear(); sessionStorage.clear();
});

describe('Custom base positions through the actual career hook and storage', { timeout: 120000 }, () => {
  it('writes a copied valid shape before publishing it without changing canonical roles or player assignments', async () => {
    const view = await boot(), before = career(), beforeBody = JSON.stringify(before);
    const formation = E.FORMATIONS[before.formationIndex], canonical = formation.slots, canonicalBody = JSON.stringify(canonical);
    const points = changed(), wanted = points.map(point => ({ ...point }));
    const set = action();
    let ok = false;
    act(() => { ok = set(before.formationIndex, points); });
    expect(ok, 'CM_POSITION_HOOK_VALID_SAVE_SUCCEEDS').toBe(true);
    const after = career(), published = commits.find(row => row.career === after);
    expect(after === before, 'CM_POSITION_HOOK_NEW_STATE_PUBLISHED').toBe(false);
    expect(supported(after)?.points, 'CM_POSITION_HOOK_PUBLISHED_POINTS').toEqual(wanted);
    expect(published !== undefined, 'CM_POSITION_HOOK_REAL_PUBLICATION_WITNESS').toBe(true);
    expect(JSON.parse(published!.raw!).customShape, 'CM_POSITION_HOOK_DISK_BEFORE_FIRST_PUBLICATION').toEqual(
      { v: 1, formationIndex: before.formationIndex, points: wanted });
    expect(after.xiIds, 'CM_POSITION_HOOK_PLAYER_IDS_HELD').toEqual(before.xiIds);
    expect(after.xiDuties, 'CM_POSITION_HOOK_DUTIES_HELD').toEqual(before.xiDuties);
    expect(after.squad, 'CM_POSITION_HOOK_ACTUAL_PLAYERS_HELD').toBe(before.squad);
    expect(E.FORMATIONS[before.formationIndex].slots, 'CM_POSITION_HOOK_CANONICAL_SLOT_IDENTITY').toBe(canonical);
    expect(JSON.stringify(canonical), 'CM_POSITION_HOOK_CANONICAL_BODY_HELD').toBe(canonicalBody);
    expect(JSON.stringify(before), 'CM_POSITION_HOOK_INPUT_HELD').toBe(beforeBody);
    points[0].x = 94;
    expect(supported(after)?.points[0], 'CM_POSITION_HOOK_CALLER_POINTS_NOT_RETAINED').toEqual(wanted[0]);
    expect(JSON.parse(raw()).customShape.points, 'CM_POSITION_HOOK_RAW_POINTS_NOT_RETAINED').toEqual(wanted);
    view.unmount();
    const loaded = E.loadCareer();
    expect(loaded !== null, 'CM_POSITION_HOOK_REAL_RELOAD').toBe(true);
    expect(supported(loaded!)?.points, 'CM_POSITION_HOOK_RELOADED_POINTS').toEqual(wanted);
  });

  it('keeps memory and old raw bytes when native storage refuses a move, then saves the actual retry', async () => {
    await boot();
    const set = action(), before = career(), oldRaw = raw(), points = changed(), allOld = storage();
    const fault = refuseNativeCareerWrites();
    let ok = true;
    act(() => { ok = set(before.formationIndex, points); });
    expect(fault.mock.calls.some(([key]) => key === E.SAVE_KEY), 'CM_POSITION_HOOK_QUOTA_FAULT_REACHED_REAL_WRITER').toBe(true);
    expect(ok, 'CM_POSITION_HOOK_FAILED_MOVE_FALSE').toBe(false);
    expect(career(), 'CM_POSITION_HOOK_FAILED_MOVE_NOT_PUBLISHED').toBe(before);
    expect(raw(), 'CM_POSITION_HOOK_FAILED_MOVE_OLD_RAW').toBe(oldRaw);
    expect(storage(), 'CM_POSITION_HOOK_FAILED_MOVE_FENCE_ROLLBACK').toEqual(allOld);
    expect(read().saveFailed, 'CM_POSITION_HOOK_EXISTING_FAILURE_FEEDBACK').toBe(true);
    expect(commits.some(row => row.career !== before), 'CM_POSITION_HOOK_NO_OPTIMISTIC_COMMIT').toBe(false);
    fault.mockRestore();
    act(() => { ok = set(before.formationIndex, points); });
    expect(ok, 'CM_POSITION_HOOK_MOVE_RETRY_SAVED').toBe(true);
    expect(supported()?.points).toEqual(points);
    expect(JSON.parse(raw()).customShape.points).toEqual(points);
    expect(read().saveFailed).toBe(false);
  });

  it('resets only a supported saved shape and never publishes a refused reset', async () => {
    await boot();
    const set = action();
    act(() => { expect(set(career().formationIndex, changed())).toBe(true); });
    const before = career(), oldRaw = raw();
    const fault = refuseNativeCareerWrites();
    let ok = true;
    act(() => { ok = set(before.formationIndex, null); });
    expect(ok, 'CM_POSITION_HOOK_FAILED_RESET_FALSE').toBe(false);
    expect(career(), 'CM_POSITION_HOOK_FAILED_RESET_MEMORY_HELD').toBe(before);
    expect(raw(), 'CM_POSITION_HOOK_FAILED_RESET_RAW_HELD').toBe(oldRaw);
    fault.mockRestore();
    act(() => { ok = set(before.formationIndex, null); });
    expect(ok, 'CM_POSITION_HOOK_SUPPORTED_RESET_SAVED').toBe(true);
    expect(Object.prototype.hasOwnProperty.call(career(), 'customShape'), 'CM_POSITION_HOOK_RESET_REMOVES_SUPPORTED_FIELD').toBe(false);
    expect(Object.prototype.hasOwnProperty.call(JSON.parse(raw()), 'customShape')).toBe(false);
    const clean = raw();
    act(() => { ok = set(career().formationIndex, null); });
    expect(ok, 'CM_POSITION_HOOK_ABSENT_RESET_IS_REFUSED_NOOP').toBe(false);
    expect(raw()).toBe(clean);
  });

  it('uses the current ref for a set and reset in one pending React turn', async () => {
    await boot();
    const set = action(), before = career(), points = changed();
    let saved = false, reset = false;
    act(() => { saved = set(before.formationIndex, points); reset = set(before.formationIndex, null); });
    expect([saved, reset], 'CM_POSITION_HOOK_SAME_TURN_REF_SUCCESS').toEqual([true, true]);
    expect(Object.prototype.hasOwnProperty.call(career(), 'customShape'), 'CM_POSITION_HOOK_SAME_TURN_FINAL_PRESET').toBe(false);
    expect(Object.prototype.hasOwnProperty.call(JSON.parse(raw()), 'customShape')).toBe(false);
    expect(career().xiIds).toEqual(before.xiIds);
  });

  it('refuses stale formation indexes and malformed incoming points before touching the store', async () => {
    await boot();
    const set = action(), before = career(), oldRaw = raw(), points = changed();
    const sparse = points.slice(); delete sparse[4];
    const extra = points.map(point => ({ ...point })); extra[2] = { ...extra[2], z: 1 } as Point;
    const nan = points.map(point => ({ ...point })); nan[3].x = NaN;
    const invalid = [points.slice(0, 10), sparse, extra, nan];
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    act(() => {
      expect(set(otherFormation(before), points), 'CM_POSITION_HOOK_STALE_INDEX_REFUSED').toBe(false);
      expect(set(Number.MAX_SAFE_INTEGER + 1, points), 'CM_POSITION_HOOK_UNSAFE_INDEX_REFUSED').toBe(false);
      for (const value of invalid) expect(set(before.formationIndex, value), 'CM_POSITION_HOOK_INVALID_POINTS_REFUSED').toBe(false);
    });
    expect(writes, 'CM_POSITION_HOOK_INVALID_INPUT_NO_NATIVE_WRITE').not.toHaveBeenCalled();
    expect(career()).toBe(before); expect(raw()).toBe(oldRaw);
  });

  it.each(['future', 'null', 'malformed', 'foreign-formation'] as const)(
    'preserves %s stored shape data while blocking edits and legacy-plan application', async fault => {
      await boot(base => {
        const held = plans.saveMatchPlan(base, 0, 'Actual preset plan');
        const points = preset(base);
        const body = fault === 'future' ? { v: 2, formationIndex: base.formationIndex, points }
          : fault === 'null' ? null
          : fault === 'malformed' ? { v: 1, formationIndex: base.formationIndex, points: points.slice(0, 10) }
          : { v: 1, formationIndex: otherFormation(base), points };
        return { ...held, customShape: body };
      });
      const set = action(), before = career(), oldRaw = raw(), heldRaw = JSON.stringify(before.customShape);
      expect(plans.matchPlansOf(before).length, 'CM_POSITION_HOOK_BLOCKED_PLAN_FOUNDATION').toBe(1);
      const writes = vi.spyOn(Storage.prototype, 'setItem');
      act(() => {
        expect(set(before.formationIndex, changed()), 'CM_POSITION_HOOK_RAW_EDIT_BLOCKED_' + fault).toBe(false);
        expect(set(before.formationIndex, null), 'CM_POSITION_HOOK_RAW_RESET_BLOCKED_' + fault).toBe(false);
        expect(read().saveMatchPlan(1, 'Must not omit points'), 'CM_POSITION_HOOK_RAW_PLAN_SAVE_BLOCKED_' + fault).toBe(false);
        expect(read().applyMatchPlan(0), 'CM_POSITION_HOOK_RAW_PLAN_APPLY_BLOCKED_' + fault).toBe(false);
        read().setFormationIndex(otherFormation(before));
      });
      expect(writes, 'CM_POSITION_HOOK_RAW_BLOCKS_BEFORE_WRITE_' + fault).not.toHaveBeenCalled();
      expect(career()).toBe(before); expect(raw()).toBe(oldRaw);
      expect(JSON.stringify(career().customShape), 'CM_POSITION_HOOK_UNSUPPORTED_RAW_BODY_HELD_' + fault).toBe(heldRaw);
    });

  it('refuses a real live career without changing its stored match or advancing the engine', async () => {
    await boot(base => {
      let now = base;
      for (let index = 0; index < 24; index++) {
        const next = E.playNextEntry(now, { noCoach: true });
        now = next.state;
        if (next.kind === 'halftime' && now.live) return now;
      }
      throw new Error('The actual fixture did not reach a match.');
    });
    const set = action(), before = career(), oldRaw = raw();
    expect(before.live, 'CM_POSITION_HOOK_REAL_LIVE_FOUNDATION').toBeTruthy();
    const draws = vi.spyOn(Math, 'random').mockClear(), writes = vi.spyOn(Storage.prototype, 'setItem');
    act(() => { expect(set(before.formationIndex, changed()), 'CM_POSITION_HOOK_LIVE_EDIT_REFUSED').toBe(false); });
    expect(draws, 'CM_POSITION_HOOK_LIVE_EDIT_DRAWS_NOTHING').not.toHaveBeenCalled();
    expect(writes).not.toHaveBeenCalled(); expect(career()).toBe(before); expect(raw()).toBe(oldRaw);
  });

  it('refuses a stale action after the actual active manager slot changes', async () => {
    await boot();
    const set = action(), before = career();
    expect(activeSlot(), 'CM_POSITION_HOOK_ORIGINAL_ACTIVE_SLOT').toBe(1);
    expect(switchSlot(2, before), 'CM_POSITION_HOOK_REAL_SLOT_SWITCH').toBe(true);
    expect(activeSlot()).toBe(2);
    const held = storage(), writes = vi.spyOn(Storage.prototype, 'setItem');
    act(() => { expect(set(before.formationIndex, changed(before)), 'CM_POSITION_HOOK_STALE_SLOT_REFUSED').toBe(false); });
    expect(writes, 'CM_POSITION_HOOK_STALE_SLOT_NO_WRITE').not.toHaveBeenCalled();
    expect(storage(), 'CM_POSITION_HOOK_INCOMING_SLOT_BYTES_HELD').toEqual(held);
    expect(career()).toBe(before);
  });

  it('respects a newer actual fenced write and never overwrites its career', async () => {
    await boot();
    const set = action(), before = career(), other = createSaveFence(() => localStorage);
    other.adopt(E.SAVE_KEY);
    const newer = { ...before, budget: before.budget + 1 };
    expect(other.write(E.SAVE_KEY, () => { localStorage.setItem(E.SAVE_KEY, JSON.stringify(newer)); return true; }),
      'CM_POSITION_HOOK_OTHER_TAB_ACTUAL_FENCE_WRITE').toBe('written');
    const newerRaw = raw(), writes = vi.spyOn(Storage.prototype, 'setItem');
    act(() => { expect(set(before.formationIndex, changed(before)), 'CM_POSITION_HOOK_STALE_GENERATION_REFUSED').toBe(false); });
    expect(writes, 'CM_POSITION_HOOK_STALE_GENERATION_NO_WRITE').not.toHaveBeenCalled();
    expect(read().saveMoved, 'CM_POSITION_HOOK_EXISTING_NEWER_CAREER_FEEDBACK').toBe(true);
    expect(career()).toBe(before); expect(raw()).toBe(newerRaw);
  });

  it('clears a supported shape on a preset change only after saving the real carried lineup', async () => {
    await boot();
    const set = action();
    act(() => { expect(set(career().formationIndex, changed())).toBe(true); });
    const before = career(), oldRaw = raw(), nextIndex = otherFormation(before);
    const fault = refuseNativeCareerWrites();
    act(() => read().setFormationIndex(nextIndex));
    expect(career(), 'CM_POSITION_HOOK_REFUSED_FORMATION_MEMORY_HELD').toBe(before);
    expect(raw(), 'CM_POSITION_HOOK_REFUSED_FORMATION_RAW_HELD').toBe(oldRaw);
    fault.mockRestore(); commits = [];
    act(() => read().setFormationIndex(nextIndex));
    const after = career(), published = commits.find(row => row.career === after);
    expect(published !== undefined, 'CM_POSITION_HOOK_PRESET_PUBLICATION_WITNESS').toBe(true);
    expect(after.formationIndex, 'CM_POSITION_HOOK_NEW_PRESET_APPLIED').toBe(nextIndex);
    expect(Object.prototype.hasOwnProperty.call(after, 'customShape'), 'CM_POSITION_HOOK_NEW_PRESET_CLEARS_OLD_POINTS').toBe(false);
    expect(JSON.parse(published!.raw!).formationIndex, 'CM_POSITION_HOOK_PRESET_DISK_BEFORE_PUBLICATION').toBe(nextIndex);
    expect(Object.prototype.hasOwnProperty.call(JSON.parse(raw()), 'customShape')).toBe(false);
    expect(after.xiIds.every(id => id === null || before.squad.some(player => player.id === id)),
      'CM_POSITION_HOOK_CARRIED_IDS_ARE_ACTUAL_PLAYERS').toBe(true);
    const heldRaw = raw();
    act(() => { expect(set(before.formationIndex, changed(before)), 'CM_POSITION_HOOK_OLD_CALLBACK_READS_CURRENT_INDEX').toBe(false); });
    expect(raw()).toBe(heldRaw);
  });

  it('refuses a plan that would omit custom points and saves or deletes an ordinary plan before acknowledgement', async () => {
    await boot();
    const set = action();
    act(() => { expect(set(career().formationIndex, changed())).toBe(true); });
    const before = career(), oldRaw = raw();
    act(() => { expect(read().saveMatchPlan(0, 'Cannot omit custom shape'), 'CM_POSITION_HOOK_CUSTOM_PLAN_SAVE_REFUSED').toBe(false); });
    expect(career()).toBe(before); expect(raw()).toBe(oldRaw);
    act(() => { expect(set(before.formationIndex, null)).toBe(true); });
    const noShape = career(), noShapeRaw = raw(), fault = refuseNativeCareerWrites();
    let ok = true;
    act(() => { ok = read().saveMatchPlan(0, 'Actual preset'); });
    expect(ok, 'CM_POSITION_HOOK_FAILED_PLAN_SAVE_FALSE').toBe(false);
    expect(career()).toBe(noShape); expect(raw()).toBe(noShapeRaw);
    fault.mockRestore();
    act(() => { ok = read().saveMatchPlan(0, 'Actual preset'); });
    expect(ok, 'CM_POSITION_HOOK_PLAN_SAVE_ACTUAL_ACK').toBe(true);
    expect(plans.matchPlansOf(career()).map(plan => plan.name)).toEqual(['Actual preset']);
    expect(JSON.parse(raw()).matchPlans[0].name).toBe('Actual preset');
    const saved = career(), savedRaw = raw(), deletionFault = refuseNativeCareerWrites();
    act(() => { ok = read().deleteMatchPlan(0); });
    expect(ok, 'CM_POSITION_HOOK_FAILED_PLAN_DELETE_FALSE').toBe(false);
    expect(career()).toBe(saved); expect(raw()).toBe(savedRaw);
    deletionFault.mockRestore();
    act(() => { ok = read().deleteMatchPlan(0); });
    expect(ok, 'CM_POSITION_HOOK_PLAN_DELETE_ACTUAL_ACK').toBe(true);
    expect(plans.matchPlansOf(career())).toEqual([]);
    expect(JSON.parse(raw()).matchPlans).toEqual([]);
  });

  it('atomically clears a supported custom shape when applying an actual existing legacy plan', async () => {
    await boot(base => plans.saveMatchPlan(base, 0, 'Preset without custom points'));
    const set = action(), plan = plans.matchPlansOf(career())[0];
    expect(plan, 'CM_POSITION_HOOK_REAL_LEGACY_PLAN_FOUNDATION').toBeTruthy();
    act(() => { expect(set(career().formationIndex, changed())).toBe(true); });
    const before = career(), oldRaw = raw(), fault = refuseNativeCareerWrites();
    let ok = true;
    act(() => { ok = read().applyMatchPlan(0); });
    expect(ok, 'CM_POSITION_HOOK_FAILED_PLAN_APPLY_FALSE').toBe(false);
    expect(career()).toBe(before); expect(raw()).toBe(oldRaw);
    fault.mockRestore(); commits = [];
    act(() => { ok = read().applyMatchPlan(0); });
    expect(ok, 'CM_POSITION_HOOK_PLAN_APPLY_ACTUAL_ACK').toBe(true);
    const after = career(), published = commits.find(row => row.career === after);
    expect(published !== undefined, 'CM_POSITION_HOOK_PLAN_APPLY_PUBLICATION_WITNESS').toBe(true);
    expect(Object.prototype.hasOwnProperty.call(after, 'customShape'), 'CM_POSITION_HOOK_LEGACY_PLAN_CLEARS_SUPPORTED_POINTS').toBe(false);
    expect(after.formationIndex).toBe(plan.formationIndex); expect(after.xiIds).toEqual(plan.xiIds);
    expect(Object.prototype.hasOwnProperty.call(JSON.parse(published!.raw!), 'customShape'), 'CM_POSITION_HOOK_PLAN_APPLY_DISK_BEFORE_PUBLICATION').toBe(false);
  });
});
