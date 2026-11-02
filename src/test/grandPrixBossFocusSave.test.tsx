import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyAction, createCareer, validateSavedCareer, type GrandPrixAction } from '@/lib/grandPrixBoss';
import { createSaveFence, saveFence } from '@/lib/saveFence';

let useGrandPrixBoss: typeof import('@/hooks/useGrandPrixBoss')['useGrandPrixBoss'];
beforeAll(async () => {
  const file = path.resolve(process.env.GP_BOSS_HOOK_FILE || 'src/hooks/useGrandPrixBoss.ts');
  useGrandPrixBoss = (await import(/* @vite-ignore */ pathToFileURL(file).href)).useGrandPrixBoss;
});
const H = vi.hoisted(() => ({ recordCompletion: vi.fn() }));
vi.mock('@/lib/completions', () => ({ recordCompletion: H.recordCompletion }));
const KEY = 'grand-prix-boss-save-v1', OTHER = 'gp-focus-hook-other-game';
beforeEach(() => {
  vi.restoreAllMocks(); H.recordCompletion.mockReset(); saveFence.release(KEY);
  localStorage.clear(); localStorage.setItem(OTHER, 'held other game');
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); saveFence.release(KEY);
  expect(localStorage.getItem(OTHER)).toBe('held other game');
});
async function fixture() {
  const career = createCareer(42), driver = career.drivers.find(row => row.contract?.teamId === career.teamId)!;
  expect(driver.focus, 'GP_FOCUS_HOOK_REAL_C_METADATA').toBe('balanced');
  const action: GrandPrixAction = { type: 'setDriverFocus', driverId: driver.id, focus: 'pace', expectedRevision: career.revision };
  const result = applyAction(career, action);
  expect(result.ok, 'GP_FOCUS_HOOK_REAL_ACTION').toBe(true);
  if (result.ok === false) throw new Error('Real focus action refused');
  expect(validateSavedCareer(result.state).ok, 'GP_FOCUS_HOOK_ADMITTED_RESULT').toBe(true);
  expect(result.state.cash).toBe(career.cash); expect(result.state.reserved).toBe(career.reserved);
  expect(result.state.drivers.find(row => row.id === driver.id)!.skills).toEqual(driver.skills);
  const bytes = JSON.stringify({ schemaVersion: 1, career, completedSeasons: [] });
  localStorage.setItem(KEY, bytes);
  const view = renderHook(() => useGrandPrixBoss());
  await waitFor(() => expect(view.result.current.status).toBe('ready'));
  expect(view.result.current.career).toEqual(career);
  return { career, driver, action, expected: result.state, bytes, view };
}
function send(view: { result: { current: ReturnType<typeof useGrandPrixBoss> } }, action: GrandPrixAction, marker: string) {
  let accepted: boolean | undefined, thrown: unknown;
  act(() => { try { accepted = view.result.current.dispatch(action); } catch (error) { thrown = error; } });
  expect(thrown, marker).toBeUndefined();
  return accepted;
}
describe('Grand Prix Boss focus persistence integration', () => {
  it('GP_HOOK_FOCUS_SAVE: persists the real free focus choice before publishing it and survives reload', async () => {
    const { career, driver, action, expected, view } = await fixture();
    expect(send(view, action, 'GP_HOOK_FOCUS_SAVE_MUST_NOT_THROW')).toBe(true);
    expect(view.result.current.career).toEqual(expected);
    expect(view.result.current.message, 'GP_HOOK_FOCUS_FEEDBACK').toBe(driver.name + ' training focus saved.');
    const bytes = localStorage.getItem(KEY)!;
    expect(JSON.parse(bytes)).toEqual({ schemaVersion: 1, career: expected, completedSeasons: [] });
    expect(expected.revision).toBe(career.revision + 1); expect(H.recordCompletion).not.toHaveBeenCalled();
    expect(send(view, action, 'GP_HOOK_FOCUS_DUPLICATE_MUST_NOT_THROW')).toBe(false);
    expect(localStorage.getItem(KEY)).toBe(bytes);
    view.unmount();
    const fresh = renderHook(() => useGrandPrixBoss());
    await waitFor(() => expect(fresh.result.current.status).toBe('ready'));
    expect(fresh.result.current.career).toEqual(expected); expect(localStorage.getItem(KEY)).toBe(bytes);
    expect(H.recordCompletion).not.toHaveBeenCalled();
  });
  it('GP_HOOK_FOCUS_QUOTA: preserves focus cash and observer generation when saving is refused', async () => {
    const { career, action, expected, bytes, view } = await fixture();
    const observer = createSaveFence(() => window.localStorage); observer.adopt(KEY);
    const set = Storage.prototype.setItem;
    const refusal = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function(key, value) {
      if (key === KEY) throw new DOMException('Storage full', 'QuotaExceededError');
      return set.call(this, key, value);
    });
    expect(send(view, action, 'GP_HOOK_FOCUS_QUOTA_MUST_NOT_THROW')).toBe(false);
    expect(view.result.current.career).toEqual(career); expect(localStorage.getItem(KEY)).toBe(bytes);
    expect(observer.moved(KEY)).toBe(false); expect(H.recordCompletion).not.toHaveBeenCalled();
    refusal.mockRestore();
    expect(send(view, action, 'GP_HOOK_FOCUS_RETRY_MUST_NOT_THROW')).toBe(true);
    expect(view.result.current.career).toEqual(expected);
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ schemaVersion: 1, career: expected, completedSeasons: [] });
    expect(H.recordCompletion).not.toHaveBeenCalled();
  });
});
