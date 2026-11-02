import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyAction, createCareer, validateSavedCareer, type GrandPrixAction, type GrandPrixCareer } from '@/lib/grandPrixBoss';
import { createSaveFence, saveFence } from '@/lib/saveFence';

let useGrandPrixBoss: typeof import('@/hooks/useGrandPrixBoss')['useGrandPrixBoss'];
beforeAll(async () => {
  const file = path.resolve(process.env.GP_BOSS_HOOK_FILE || 'src/hooks/useGrandPrixBoss.ts');
  useGrandPrixBoss = (await import(/* @vite-ignore */ pathToFileURL(file).href)).useGrandPrixBoss;
});
const H = vi.hoisted(() => ({ recordCompletion: vi.fn() }));
vi.mock('@/lib/completions', () => ({ recordCompletion: H.recordCompletion }));
const KEY = 'grand-prix-boss-save-v1';
const OTHER = 'gp-rollover-hook-other-game';
beforeEach(() => {
  vi.restoreAllMocks(); H.recordCompletion.mockReset(); saveFence.release(KEY);
  localStorage.clear(); localStorage.setItem(OTHER, 'held other game');
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); saveFence.release(KEY);
  expect(localStorage.getItem(OTHER)).toBe('held other game');
});
function move(career: GrandPrixCareer, action: GrandPrixAction) {
  const result = applyAction(career, action);
  expect(result.ok, 'GP_HOOK_ROLLOVER_REAL_TRANSITION').toBe(true);
  if (!result.ok) throw new Error('Real rollover fixture refused');
  expect(validateSavedCareer(result.state).ok, 'GP_HOOK_ROLLOVER_ADMITTED_TRANSITION').toBe(true);
  return result.state;
}
function playSeason(initial: GrandPrixCareer) {
  let career = initial;
  for (let round = 0; round < career.calendar.length; round += 1) {
    career = move(career, { type: 'qualify', expectedRevision: career.revision });
    const own = () => career.drivers.filter(driver => driver.contract?.teamId === career.teamId);
    career = move(career, { type: 'startRace', expectedRevision: career.revision,
      setups: own().map(driver => ({ driverId: driver.id, pace: 'balanced',
        compound: career.race!.weather === 'wet' ? 'wet' : 'medium' })) });
    for (let interval = 0; interval < 3; interval += 1) {
      career = move(career, { type: 'raceInterval', expectedRevision: career.revision,
        orders: own().map(driver => ({ driverId: driver.id, pace: 'balanced',
          ...(career.race!.lap > 0 ? { pitTo: career.race!.weather === 'wet' ? 'wet' as const : 'medium' as const } : {}) })) });
    }
    if (round < career.calendar.length - 1) career = move(career, { type: 'continue', expectedRevision: career.revision });
  }
  expect(career.phase).toBe('seasonReview');
  expect(career.results).toHaveLength(12);
  expect(career.nextSeasonPlan?.affordable, 'GP_HOOK_ROLLOVER_REAL_AFFORDABLE_PLAN').toBe(true);
  return career;
}
async function mount(career: GrandPrixCareer) {
  const bytes = JSON.stringify({ schemaVersion: 1, career, completedSeasons: [career.season] });
  localStorage.setItem(KEY, bytes);
  const view = renderHook(() => useGrandPrixBoss());
  await waitFor(() => expect(view.result.current.status).toBe('ready'));
  expect(view.result.current.career).toEqual(career);
  return view;
}
function send(view: { result: { current: ReturnType<typeof useGrandPrixBoss> } }, action: GrandPrixAction, marker: string) {
  let accepted: boolean | undefined, thrown: unknown;
  act(() => { try { accepted = view.result.current.dispatch(action); } catch (error) { thrown = error; } });
  expect(thrown, marker).toBeUndefined();
  return accepted;
}

describe('Grand Prix Boss season rollover persistence', { timeout: 120000 }, () => {
  it('GP_HOOK_ROLLOVER_SAVE: starts the next year durably without replaying the completed season claim', async () => {
    const career = playSeason(createCareer(42)), view = await mount(career);
    const action: GrandPrixAction = { type: 'startNextSeason', expectedRevision: career.revision };
    const expected = move(career, action);
    expect(expected.race).toBeNull();
    expect(expected.history).toHaveLength(1);
    expect(expected.cash).toBe(career.nextSeasonPlan!.cashAfter);
    expect(send(view, action, 'GP_HOOK_ROLLOVER_SAVE_MUST_NOT_THROW')).toBe(true);
    expect(view.result.current).toMatchObject({ status: 'ready', career: expected });
    expect(view.result.current.message, 'GP_HOOK_ROLLOVER_YEAR_MESSAGE').toBe('Season 2 is ready. Team saved.');
    const bytes = localStorage.getItem(KEY)!;
    expect(JSON.parse(bytes)).toEqual({ schemaVersion: 1, career: expected, completedSeasons: [1] });
    expect(H.recordCompletion).not.toHaveBeenCalled();
    expect(send(view, action, 'GP_HOOK_ROLLOVER_DUPLICATE_MUST_NOT_THROW')).toBe(false);
    expect(localStorage.getItem(KEY)).toBe(bytes);
    view.unmount();
    const fresh = renderHook(() => useGrandPrixBoss());
    await waitFor(() => expect(fresh.result.current.status).toBe('ready'));
    expect(fresh.result.current.career).toEqual(expected);
    expect(localStorage.getItem(KEY)).toBe(bytes);
    expect(H.recordCompletion).not.toHaveBeenCalled();
  });

  it('GP_HOOK_ROLLOVER_QUOTA: keeps the review and old observer generation until a saved retry succeeds', async () => {
    const career = playSeason(createCareer(42)), view = await mount(career);
    const action: GrandPrixAction = { type: 'startNextSeason', expectedRevision: career.revision };
    const expected = move(career, action), bytes = localStorage.getItem(KEY)!;
    const observer = createSaveFence(() => window.localStorage); observer.adopt(KEY);
    const set = Storage.prototype.setItem;
    const refusal = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function(key, value) {
      if (key === KEY) throw new DOMException('Storage full', 'QuotaExceededError');
      return set.call(this, key, value);
    });
    expect(send(view, action, 'GP_HOOK_ROLLOVER_QUOTA_MUST_NOT_THROW')).toBe(false);
    expect(view.result.current.career).toEqual(career);
    expect(localStorage.getItem(KEY)).toBe(bytes);
    expect(observer.moved(KEY)).toBe(false);
    expect(H.recordCompletion).not.toHaveBeenCalled();
    refusal.mockRestore();
    expect(send(view, action, 'GP_HOOK_ROLLOVER_RETRY_MUST_NOT_THROW')).toBe(true);
    expect(view.result.current.career).toEqual(expected);
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ schemaVersion: 1, career: expected, completedSeasons: [1] });
    expect(observer.moved(KEY)).toBe(true);
    expect(H.recordCompletion).not.toHaveBeenCalled();
  });
});
