import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyAction, createCareer, validateSavedCareer, type GrandPrixAction, type GrandPrixCareer } from '@/lib/grandPrixBoss';
import { createSaveFence, saveFence } from '@/lib/saveFence';
let useGrandPrixBoss: typeof import('@/hooks/useGrandPrixBoss')['useGrandPrixBoss'];
beforeAll(async () => {
  const file = process.env.GP_BOSS_HOOK_FILE ? path.resolve(process.env.GP_BOSS_HOOK_FILE) : path.resolve(process.cwd(), 'src/hooks/useGrandPrixBoss.ts');
  useGrandPrixBoss = (await import(/* @vite-ignore */ pathToFileURL(file).href)).useGrandPrixBoss;
});

const H = vi.hoisted(() => ({ recordCompletion: vi.fn() }));
vi.mock('@/lib/completions', () => ({ recordCompletion: H.recordCompletion }));
const KEY = 'grand-prix-boss-save-v1';
const OTHER = 'gp-market-hook-other-game';

beforeEach(() => {
  vi.restoreAllMocks(); H.recordCompletion.mockReset(); saveFence.release(KEY);
  localStorage.clear(); localStorage.setItem(OTHER, 'held other game');
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); saveFence.release(KEY);
  expect(localStorage.getItem(OTHER)).toBe('held other game');
});
function stash(career: GrandPrixCareer, completedSeasons: number[] = []) {
  const raw = JSON.stringify({ schemaVersion: 1, career, completedSeasons });
  localStorage.setItem(KEY, raw); return raw;
}
function engineMove(career: GrandPrixCareer, action: GrandPrixAction) {
  const result = applyAction(career, action);
  expect(result.ok, 'GP_HOOK_MARKET_REAL_FIXTURE').toBe(true);
  if (result.ok === false) throw new Error('Refused real engine fixture');
  expect(validateSavedCareer(result.state).ok, 'GP_HOOK_MARKET_ADMITTED_FIXTURE').toBe(true);
  return result.state;
}
function firstDeal() {
  const career = createCareer(1);
  const offer = career.marketOffers.find(row => row.affordable && row.outgoingDriverId !== row.incomingDriverId);
  expect(offer, 'GP_HOOK_MARKET_ACTUAL_AFFORDABLE_OFFER').toBeDefined();
  return { career, offer: offer!, action: { type: 'signDriver', outgoingDriverId: offer!.outgoingDriverId,
    incomingDriverId: offer!.incomingDriverId, expectedRevision: career.revision } as GrandPrixAction };
}
async function mount(career: GrandPrixCareer, claims: number[] = []) {
  stash(career, claims); const view = renderHook(() => useGrandPrixBoss());
  await waitFor(() => expect(view.result.current.status).toBe('ready')); return view;
}
function dispatch(view: { result: { current: ReturnType<typeof useGrandPrixBoss> } }, action: GrandPrixAction, marker: string) {
  let accepted: boolean | undefined, thrown: unknown;
  act(() => { try { accepted = view.result.current.dispatch(action); } catch (error) { thrown = error; } });
  expect(thrown, marker).toBeUndefined();
  return accepted;
}
function reviewWithRenewal() {
  let career: GrandPrixCareer | undefined;
  for (let seed = 0; seed < 64; seed += 1) {
    const candidate = createCareer(seed);
    if (candidate.drivers.some(driver => driver.contract?.teamId === candidate.teamId && driver.contract.years === 1)) {
      career = candidate; break;
    }
  }
  expect(career, 'GP_HOOK_MARKET_REAL_RENEWABLE_SEAT').toBeDefined();
  let state = career!;
  for (let round = 0; round < 12; round += 1) {
    state = engineMove(state, { type: 'qualify', expectedRevision: state.revision });
    const own = () => state.drivers.filter(driver => driver.contract?.teamId === state.teamId);
    state = engineMove(state, { type: 'startRace', expectedRevision: state.revision, setups: own().map(driver => ({
      driverId: driver.id, pace: 'balanced', compound: state.race!.weather === 'wet' ? 'wet' : 'medium',
    })) });
    for (let interval = 0; interval < 3; interval += 1) state = engineMove(state, {
      type: 'raceInterval', expectedRevision: state.revision, orders: own().map(driver => ({
        driverId: driver.id, pace: 'balanced', ...(state.race!.lap > 0 ? { pitTo: state.race!.weather === 'wet' ? 'wet' as const : 'medium' as const } : {}),
      })),
    });
    if (round < 11) state = engineMove(state, { type: 'continue', expectedRevision: state.revision });
  }
  const offer = state.marketOffers.find(row => row.outgoingDriverId === row.incomingDriverId && row.affordable);
  expect(offer, 'GP_HOOK_MARKET_ACTUAL_RENEWAL_QUOTE').toBeDefined();
  return { career: state, offer: offer! };
}

describe('Grand Prix Boss market persistence integration', { timeout: 120000 }, () => {
  it('GP_HOOK_MARKET_SIGN: commits a quoted seat and names its season before another decision', async () => {
    const { career, offer, action } = firstDeal(), view = await mount(career);
    const expected = engineMove(career, action);
    expect(dispatch(view, action, 'GP_HOOK_MARKET_SIGN_MUST_NOT_THROW')).toBe(true);
    expect(view.result.current.career).toEqual(expected);
    expect(JSON.parse(localStorage.getItem(KEY)!).career).toEqual(expected);
    const driver = expected.drivers.find(row => row.id === offer.incomingDriverId)!;
    expect(view.result.current.message, 'GP_HOOK_MARKET_SIGN_MESSAGE').toBe(driver.name + ' signed for season ' + offer.startsSeason + '. Team saved.');
    expect(H.recordCompletion).not.toHaveBeenCalled();
    const raw = localStorage.getItem(KEY);
    expect(dispatch(view, action, 'GP_HOOK_MARKET_DUPLICATE_MUST_NOT_THROW')).toBe(false);
    expect(localStorage.getItem(KEY)).toBe(raw);
  });

  it('GP_HOOK_MARKET_QUOTA: a refused contract save preserves the displayed team and observer generation', async () => {
    const { career, action } = firstDeal(), view = await mount(career), raw = localStorage.getItem(KEY);
    const observer = createSaveFence(() => window.localStorage); observer.adopt(KEY);
    const set = Storage.prototype.setItem;
    const refusal = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function(key, value) {
      if (key === KEY) throw new DOMException('Storage full', 'QuotaExceededError');
      return set.call(this, key, value);
    });
    expect(dispatch(view, action, 'GP_HOOK_MARKET_QUOTA_MUST_NOT_THROW')).toBe(false);
    expect(view.result.current.career).toEqual(career); expect(localStorage.getItem(KEY)).toBe(raw);
    expect(observer.moved(KEY)).toBe(false); expect(H.recordCompletion).not.toHaveBeenCalled();
    refusal.mockRestore();
    expect(dispatch(view, action, 'GP_HOOK_MARKET_RETRY_MUST_NOT_THROW')).toBe(true);
    expect(view.result.current.career?.revision).toBe(career.revision + 1);
    expect(H.recordCompletion).not.toHaveBeenCalled();
  });

  it('GP_HOOK_MARKET_UNCERTAIN: landed unconfirmed contract bytes stale the observer and cannot be repeated', async () => {
    const { career, action } = firstDeal(), view = await mount(career);
    const observer = createSaveFence(() => window.localStorage); observer.adopt(KEY);
    const get = Storage.prototype.getItem, set = Storage.prototype.setItem;
    let landed = false;
    const writing = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function(key, value) {
      set.call(this, key, value); if (key === KEY) landed = true;
    });
    const reading = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function(key) {
      if (key === KEY && landed) throw new DOMException('Confirmation unavailable', 'SecurityError');
      return get.call(this, key);
    });
    expect(dispatch(view, action, 'GP_HOOK_MARKET_UNCERTAIN_MUST_NOT_THROW')).toBe(false);
    expect(view.result.current).toMatchObject({ status: 'unreadable', career });
    expect(observer.moved(KEY)).toBe(true);
    const actual = get.call(localStorage, KEY)!;
    expect(JSON.parse(actual).career).toEqual(engineMove(career, action));
    expect(dispatch(view, action, 'GP_HOOK_MARKET_LOCKED_MUST_NOT_THROW')).toBe(false);
    expect(get.call(localStorage, KEY)).toBe(actual); expect(H.recordCompletion).not.toHaveBeenCalled();
    view.unmount(); reading.mockRestore(); writing.mockRestore();
    const fresh = renderHook(() => useGrandPrixBoss());
    await waitFor(() => expect(fresh.result.current.status).toBe('ready'));
    expect(fresh.result.current.career).toEqual(JSON.parse(actual).career);
    expect(localStorage.getItem(KEY)).toBe(actual); expect(H.recordCompletion).not.toHaveBeenCalled();
  });

  it('GP_HOOK_MARKET_RENEW: saves next-year wages without replaying the completed season claim', async () => {
    const { career, offer } = reviewWithRenewal(), view = await mount(career, [career.season]);
    const action: GrandPrixAction = { type: 'renewDriver', driverId: offer.incomingDriverId, expectedRevision: career.revision };
    const expected = engineMove(career, action);
    expect(dispatch(view, action, 'GP_HOOK_MARKET_RENEW_MUST_NOT_THROW')).toBe(true);
    expect(view.result.current.career).toEqual(expected);
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ schemaVersion: 1, career: expected, completedSeasons: [career.season] });
    const driver = expected.drivers.find(row => row.id === offer.incomingDriverId)!;
    expect(view.result.current.message, 'GP_HOOK_MARKET_RENEW_MESSAGE').toBe(driver.name + ' renewed for season ' + offer.startsSeason + '. Team saved.');
    expect(H.recordCompletion).not.toHaveBeenCalled();
    const raw = localStorage.getItem(KEY);
    expect(dispatch(view, action, 'GP_HOOK_MARKET_RENEW_DUPLICATE_MUST_NOT_THROW')).toBe(false);
    expect(localStorage.getItem(KEY)).toBe(raw); expect(H.recordCompletion).not.toHaveBeenCalled();
  });
});
