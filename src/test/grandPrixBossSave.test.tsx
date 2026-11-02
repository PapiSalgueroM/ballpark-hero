import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyAction, createCareer, validateSavedCareer, type GrandPrixAction, type GrandPrixCareer } from '@/lib/grandPrixBoss';
import { createSaveFence, fenceKeyOf, saveFence } from '@/lib/saveFence';

const H = vi.hoisted(() => ({ recordCompletion: vi.fn() }));
// The existing recorder sends anonymous and authenticated network writes. The hook's
// engine, localStorage, save fence and watch remain real; only that external boundary is held.
vi.mock('@/lib/completions', () => ({ recordCompletion: H.recordCompletion }));

const KEY = 'grand-prix-boss-save-v1';
const OTHER = 'gp-save-test-unrelated';
const HOOK_PATH = process.env.GP_BOSS_HOOK_FILE
  ? path.resolve(process.env.GP_BOSS_HOOK_FILE)
  : path.resolve(process.cwd(), 'src/hooks/useGrandPrixBoss.ts');
const hookPresent = existsSync(HOOK_PATH);
type Envelope = { schemaVersion: 1; career: GrandPrixCareer; completedSeasons: number[] };
type TeamSave = {
  career: GrandPrixCareer | null;
  status: 'empty' | 'ready' | 'unreadable' | 'unsupported' | 'invalid';
  message: string;
  moved: boolean;
  start(seed: number): boolean;
  dispatch(action: GrandPrixAction): boolean;
  reload(): void;
};
let useGrandPrixBoss: (() => TeamSave) | null = null;
beforeAll(async () => {
  if (hookPresent) {
    const loaded = await import(/* @vite-ignore */ pathToFileURL(HOOK_PATH).href);
    useGrandPrixBoss = loaded.useGrandPrixBoss;
  }
});
beforeEach(() => {
  vi.restoreAllMocks();
  H.recordCompletion.mockReset();
  saveFence.release(KEY);
  localStorage.clear();
  localStorage.setItem(OTHER, 'Other game progress');
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  saveFence.release(KEY);
  expect(localStorage.getItem(OTHER)).toBe('Other game progress');
});

it('GP_SAVE_AVAILABLE: a durable team save hook is implemented', () => {
  expect(hookPresent, 'GP_SAVE_MODULE_MISSING: durable team save hook is not implemented').toBe(true);
  expect(typeof useGrandPrixBoss, 'GP_SAVE_PUBLIC_BEHAVIOUR_MISSING').toBe('function');
});

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
function envelope(career: GrandPrixCareer, completedSeasons: number[] = []): Envelope {
  return { schemaVersion: 1, career, completedSeasons };
}
function stash(career: GrandPrixCareer, completedSeasons: number[] = []): string {
  const raw = JSON.stringify(envelope(career, completedSeasons));
  localStorage.setItem(KEY, raw);
  return raw;
}
function read(): Envelope {
  const raw = localStorage.getItem(KEY);
  expect(raw, 'GP_SAVE_REQUIRES_DURABLE_BYTES').not.toBeNull();
  return JSON.parse(raw!) as Envelope;
}
function mount() { return renderHook(() => useGrandPrixBoss!()); }
function ownOrders(career: GrandPrixCareer) {
  return career.drivers.filter(driver => driver.contract?.teamId === career.teamId)
    .map(driver => ({ driverId: driver.id, pace: 'balanced' as const }));
}
function engineMove(career: GrandPrixCareer, action: GrandPrixAction): GrandPrixCareer {
  const result = applyAction(career, action);
  expect(result.ok, 'GP_SAVE_REAL_ENGINE_FIXTURE_ACTION').toBe(true);
  if (result.ok === false) throw new Error('Unreachable refused fixture action');
  return result.state;
}
function beforeFinalSettlement(): GrandPrixCareer {
  let career = createCareer(731);
  for (let round = 0; round < 12; round += 1) {
    career = engineMove(career, { type: 'qualify', expectedRevision: career.revision });
    career = engineMove(career, { type: 'startRace', expectedRevision: career.revision,
      setups: ownOrders(career).map(order => ({ ...order, compound: career.race!.weather === 'wet' ? 'wet' as const : 'medium' as const })) });
    for (let interval = 0; interval < (round === 11 ? 2 : 3); interval += 1) {
      career = engineMove(career, { type: 'raceInterval', expectedRevision: career.revision, orders: ownOrders(career) });
    }
    if (round < 11) career = engineMove(career, { type: 'continue', expectedRevision: career.revision });
  }
  expect(career).toMatchObject({ phase: 'race', round: 11, race: { lap: 26 } });
  expect(career.results).toHaveLength(11);
  expect(validateSavedCareer(career).ok).toBe(true);
  return career;
}

// Missing product is an explicit absence baseline, not a passing implementation.
describe.skipIf(!hookPresent)('Grand Prix Boss durable team save', { timeout: 120000 }, () => {
  it('GP_SAVE_EMPTY: opening empty storage does not create a team or record a completion', async () => {
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    const view = mount();
    await waitFor(() => expect(view.result.current.status).toBe('empty'));
    expect(view.result.current.career).toBeNull();
    expect(view.result.current.moved).toBe(false);
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(writes).not.toHaveBeenCalled();
    expect(H.recordCompletion).not.toHaveBeenCalled();
  });

  it('GP_SAVE_LOAD: adopts before reading and restores exact career bytes without rewriting', async () => {
    const career = createCareer(731);
    const raw = JSON.stringify(envelope(career), null, 2);
    localStorage.setItem(KEY, raw);
    const get = Storage.prototype.getItem;
    const reads: string[] = [];
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (key) { reads.push(key); return get.call(this, key); });
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    const view = mount();
    await waitFor(() => expect(view.result.current.status).toBe('ready'));
    expect(view.result.current.career).toEqual(career);
    const atFence = reads.indexOf(fenceKeyOf(KEY)), atCareer = reads.indexOf(KEY);
    expect(atFence, 'GP_SAVE_ADOPT_MUST_PRECEDE_CAREER_READ').toBeGreaterThanOrEqual(0);
    expect(atCareer, 'GP_SAVE_ADOPT_MUST_PRECEDE_CAREER_READ').toBeGreaterThan(atFence);
    expect(localStorage.getItem(KEY)).toBe(raw);
    expect(writes).not.toHaveBeenCalled();
    expect(H.recordCompletion).not.toHaveBeenCalled();
  });

  it('GP_SAVE_START: starts only after the complete canonical new team is durably readable', async () => {
    const view = mount();
    await waitFor(() => expect(view.result.current.status).toBe('empty'));
    let started: boolean | undefined;
    act(() => { started = view.result.current.start(731); });
    expect(started).toBe(true);
    const saved = read();
    expect(saved).toEqual(envelope(createCareer(731)));
    expect(validateSavedCareer(saved.career).ok).toBe(true);
    expect(view.result.current).toMatchObject({ status: 'ready', moved: false, career: saved.career });
    expect(H.recordCompletion).not.toHaveBeenCalled();
    const before = localStorage.getItem(KEY);
    act(() => { started = view.result.current.start(732); });
    expect(started).toBe(false);
    expect(localStorage.getItem(KEY)).toBe(before);
  });

  it('GP_SAVE_OCCUPIED_START: a save arriving after an empty read is never overwritten by Start', async () => {
    const view = mount();
    await waitFor(() => expect(view.result.current.status).toBe('empty'));
    const arrived = '{preserved unreadable existing team';
    localStorage.setItem(KEY, arrived);
    let started: boolean | undefined;
    act(() => { started = view.result.current.start(731); });
    expect(started).toBe(false);
    expect(localStorage.getItem(KEY)).toBe(arrived);
    expect(view.result.current.career).toBeNull();
    expect(view.result.current.message.length).toBeGreaterThan(0);
    expect(H.recordCompletion).not.toHaveBeenCalled();
  });

  it('GP_SAVE_QUOTA_START: a refused initial write leaves no team and can retry the same seed', async () => {
    const view = mount();
    await waitFor(() => expect(view.result.current.status).toBe('empty'));
    const beforeFence = localStorage.getItem(fenceKeyOf(KEY)), set = Storage.prototype.setItem;
    const refusal = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === KEY) throw new DOMException('Storage is full', 'QuotaExceededError');
      return set.call(this, key, value);
    });
    let started: boolean | undefined;
    act(() => { started = view.result.current.start(731); });
    expect(started).toBe(false);
    expect(view.result.current.career).toBeNull();
    expect(view.result.current.status).toBe('empty');
    expect(view.result.current.message.length).toBeGreaterThan(0);
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(localStorage.getItem(fenceKeyOf(KEY))).toBe(beforeFence);
    expect(H.recordCompletion).not.toHaveBeenCalled();
    refusal.mockRestore();
    act(() => { started = view.result.current.start(731); });
    expect(started).toBe(true);
    expect(read().career).toEqual(createCareer(731));
  });

  it('GP_SAVE_QUOTA_ACTION: a refused paid upgrade keeps the old money and retries exactly once', async () => {
    const career = createCareer(731), raw = stash(career), view = mount();
    await waitFor(() => expect(view.result.current.status).toBe('ready'));
    const action: GrandPrixAction = { type: 'upgrade', area: 'power', expectedRevision: career.revision };
    const beforeFence = localStorage.getItem(fenceKeyOf(KEY)), set = Storage.prototype.setItem;
    const refusal = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === KEY) throw new DOMException('Storage is full', 'QuotaExceededError');
      return set.call(this, key, value);
    });
    let accepted: boolean | undefined;
    act(() => { accepted = view.result.current.dispatch(action); });
    expect(accepted).toBe(false);
    expect(view.result.current.career).toEqual(career);
    expect(view.result.current.status).toBe('ready');
    expect(view.result.current.message.length).toBeGreaterThan(0);
    expect(localStorage.getItem(KEY)).toBe(raw);
    expect(localStorage.getItem(fenceKeyOf(KEY))).toBe(beforeFence);
    refusal.mockRestore();
    act(() => { accepted = view.result.current.dispatch(action); });
    expect(accepted).toBe(true);
    expect(read().career.cash).toBe(career.cash - career.upgradeCosts.power!);
    expect(read().career.revision).toBe(career.revision + 1);
    expect(view.result.current.career).toEqual(read().career);
    expect(H.recordCompletion).not.toHaveBeenCalled();
  });

  it('GP_SAVE_NOOP: a storage write returning without saving cannot publish or charge an upgrade', async () => {
    const career = createCareer(731), raw = stash(career), view = mount();
    await waitFor(() => expect(view.result.current.status).toBe('ready'));
    const set = Storage.prototype.setItem, beforeFence = localStorage.getItem(fenceKeyOf(KEY));
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key !== KEY) return set.call(this, key, value);
    });
    let accepted: boolean | undefined;
    act(() => { accepted = view.result.current.dispatch({ type: 'upgrade', area: 'power', expectedRevision: career.revision }); });
    expect(accepted).toBe(false);
    expect(view.result.current.career).toEqual(career);
    expect(localStorage.getItem(KEY)).toBe(raw);
    expect(localStorage.getItem(fenceKeyOf(KEY))).toBe(beforeFence);
    expect(H.recordCompletion).not.toHaveBeenCalled();
  });

  it('GP_SAVE_DUPLICATE: two clicks carrying one displayed revision persist and charge only once', async () => {
    const career = createCareer(731); stash(career);
    const view = mount();
    await waitFor(() => expect(view.result.current.status).toBe('ready'));
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    const action: GrandPrixAction = { type: 'upgrade', area: 'power', expectedRevision: career.revision };
    const accepted: boolean[] = [];
    act(() => { accepted.push(view.result.current.dispatch(action)); accepted.push(view.result.current.dispatch(action)); });
    expect(accepted).toEqual([true, false]);
    expect(writes.mock.calls.filter(([key]) => key === KEY)).toHaveLength(1);
    expect(read().career.revision).toBe(career.revision + 1);
    expect(read().career.cash).toBe(career.cash - career.upgradeCosts.power!);
    expect(view.result.current.career).toEqual(read().career);
    expect(H.recordCompletion).not.toHaveBeenCalled();
  });

  it('GP_SAVE_MOVED: the actual foreign fence write covers the old tab and refuses its action', async () => {
    const career = createCareer(731); stash(career);
    const view = mount();
    await waitFor(() => expect(view.result.current.status).toBe('ready'));
    const foreign = createSaveFence(() => window.localStorage);
    foreign.adopt(KEY);
    const advanced = engineMove(career, { type: 'qualify', expectedRevision: career.revision });
    const raw = JSON.stringify(envelope(advanced));
    expect(foreign.write(KEY, () => { localStorage.setItem(KEY, raw); return true; })).toBe('written');
    act(() => { window.dispatchEvent(new StorageEvent('storage', { key: fenceKeyOf(KEY), newValue: localStorage.getItem(fenceKeyOf(KEY)) })); });
    await waitFor(() => expect(view.result.current.moved).toBe(true));
    let accepted: boolean | undefined;
    act(() => { accepted = view.result.current.dispatch({ type: 'upgrade', area: 'power', expectedRevision: career.revision }); });
    expect(accepted).toBe(false);
    expect(view.result.current.career).toEqual(career);
    expect(view.result.current.message.length).toBeGreaterThan(0);
    expect(localStorage.getItem(KEY)).toBe(raw);
    expect(H.recordCompletion).not.toHaveBeenCalled();
  });

  it('GP_SAVE_BAD_RAW: unsupported, invalid and malformed envelope bytes remain preserved', async () => {
    const career = createCareer(731), olderRaw = clone(career) as unknown as Record<string, unknown>;
    // A synthetic older legacy world isolates envelope claim guards. No earlier seasons are asserted.
    olderRaw.season = 14;
    delete olderRaw.marketOffers;
    delete olderRaw.nextSeasonPlan;
    const olderRead = validateSavedCareer(olderRaw);
    expect(olderRead.ok, 'GP_SAVE_CLAIM_FIXTURE_IS_ENGINE_ADMISSIBLE').toBe(true);
    if (olderRead.ok === false) throw new Error('Refused legacy claim fixture');
    const olderClaims = olderRead.state;
    const variants: [string, TeamSave['status']][] = [
      ['{not JSON', 'invalid'],
      [JSON.stringify({ schemaVersion: 2, career, completedSeasons: [] }), 'unsupported'],
      [JSON.stringify({ schemaVersion: 1, career: { ...career, version: 2 }, completedSeasons: [] }), 'unsupported'],
      [JSON.stringify({ schemaVersion: 1, completedSeasons: [] }), 'invalid'],
      [JSON.stringify({ ...envelope(olderClaims), completedSeasons: [1, 1] }), 'invalid'],
      [JSON.stringify({ ...envelope(olderClaims), completedSeasons: [2, 1] }), 'invalid'],
      [JSON.stringify({ ...envelope(olderClaims), completedSeasons: Array.from({ length: 13 }, (_, i) => i + 1) }), 'invalid'],
      [JSON.stringify({ ...envelope(olderClaims), completedSeasons: [15] }), 'invalid'],
      [JSON.stringify({ ...envelope(olderClaims), completedSeasons: [14] }), 'invalid'],
      [JSON.stringify({ ...envelope(olderClaims), completedSeasons: [1.5] }), 'invalid'],
      [JSON.stringify({ ...envelope(career), completedSeasons: {} }), 'invalid'],
      [JSON.stringify(envelope({ ...career, cash: -1 })), 'invalid'],
    ];
    for (const [raw, status] of variants) {
      saveFence.release(KEY); localStorage.setItem(KEY, raw);
      const writes = vi.spyOn(Storage.prototype, 'setItem');
      const view = mount();
      await waitFor(() => expect(view.result.current.status).toBe(status));
      expect(view.result.current.career).toBeNull();
      expect(view.result.current.message.length).toBeGreaterThan(0);
      let started: boolean | undefined, accepted: boolean | undefined;
      act(() => { started = view.result.current.start(732); accepted = view.result.current.dispatch({ type: 'qualify', expectedRevision: 0 }); });
      expect([started, accepted]).toEqual([false, false]);
      expect(localStorage.getItem(KEY)).toBe(raw);
      expect(writes.mock.calls.filter(([key]) => key === KEY)).toHaveLength(0);
      view.unmount(); writes.mockRestore();
    }
    expect(H.recordCompletion).not.toHaveBeenCalled();
    console.log('GP_SAVE_BAD_RAW: all 12 held-byte variants rejected without replacement.');
  });

  it('GP_SAVE_UNREADABLE: a failed storage read is distinct from an empty save and Start stays refused', async () => {
    const raw = stash(createCareer(731)), get = Storage.prototype.getItem;
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (key) {
      if (key === KEY) throw new DOMException('Storage is unavailable', 'SecurityError');
      return get.call(this, key);
    });
    const writes = vi.spyOn(Storage.prototype, 'setItem'), view = mount();
    await waitFor(() => expect(view.result.current.status).toBe('unreadable'));
    expect(view.result.current.career).toBeNull();
    expect(view.result.current.message.length).toBeGreaterThan(0);
    let started: boolean | undefined;
    act(() => { started = view.result.current.start(732); });
    expect(started).toBe(false);
    expect(get.call(localStorage, KEY)).toBe(raw);
    expect(writes.mock.calls.filter(([key]) => key === KEY)).toHaveLength(0);
    expect(H.recordCompletion).not.toHaveBeenCalled();
  });

  it('GP_SAVE_CONFIRMATION: a landed but unreadable upgrade locks the old view until a fresh page reads it', async () => {
    const career = createCareer(731); stash(career);
    const view = mount();
    await waitFor(() => expect(view.result.current.status).toBe('ready'));
    const observer = createSaveFence(() => window.localStorage);
    observer.adopt(KEY);
    const get = Storage.prototype.getItem, set = Storage.prototype.setItem;
    let landed = false;
    const writing = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      set.call(this, key, value); if (key === KEY) landed = true;
    });
    const reading = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (key) {
      if (key === KEY && landed) throw new DOMException('Cannot confirm storage', 'SecurityError');
      return get.call(this, key);
    });
    const action: GrandPrixAction = { type: 'upgrade', area: 'power', expectedRevision: career.revision };
    let accepted: boolean | undefined;
    act(() => { accepted = view.result.current.dispatch(action); });
    expect(accepted).toBe(false);
    expect(view.result.current).toMatchObject({ status: 'unreadable', career });
    expect(observer.moved(KEY), 'GP_SAVE_UNCERTAIN_LANDED_BYTES_MUST_STALE_OTHER_OLD_TABS').toBe(true);
    const actual = get.call(localStorage, KEY)!;
    expect(JSON.parse(actual).career.cash).toBe(career.cash - career.upgradeCosts.power!);
    act(() => { accepted = view.result.current.dispatch(action); });
    expect(accepted).toBe(false);
    expect(get.call(localStorage, KEY)).toBe(actual);
    expect(H.recordCompletion).not.toHaveBeenCalled();
    view.unmount(); reading.mockRestore(); writing.mockRestore();
    const fresh = mount();
    await waitFor(() => expect(fresh.result.current.status).toBe('ready'));
    expect(fresh.result.current.career).toEqual(JSON.parse(actual).career);
    expect(localStorage.getItem(KEY)).toBe(actual);
  });

  it('GP_SAVE_COMPLETE: one durable final claim records one unscored completion across duplicate action and remount', async () => {
    const career = beforeFinalSettlement(); stash(career);
    const view = mount();
    await waitFor(() => expect(view.result.current.status).toBe('ready'));
    const durableAtCall: Envelope[] = [];
    H.recordCompletion.mockImplementation(() => { durableAtCall.push(read()); });
    const action: GrandPrixAction = { type: 'raceInterval', expectedRevision: career.revision, orders: ownOrders(career) };
    let accepted: boolean | undefined;
    act(() => { accepted = view.result.current.dispatch(action); });
    expect(accepted).toBe(true);
    expect(view.result.current.career?.phase).toBe('seasonReview');
    expect(read().completedSeasons).toEqual([1]);
    expect(read().career.results).toHaveLength(12);
    expect(durableAtCall).toHaveLength(1);
    expect(durableAtCall[0]).toMatchObject({ career: { phase: 'seasonReview', season: 1 }, completedSeasons: [1] });
    expect(H.recordCompletion.mock.calls).toEqual([['/grand-prix-boss']]);
    const raw = localStorage.getItem(KEY);
    act(() => { accepted = view.result.current.dispatch(action); });
    expect(accepted).toBe(false);
    view.unmount();
    const fresh = mount();
    await waitFor(() => expect(fresh.result.current.status).toBe('ready'));
    expect(fresh.result.current.career?.phase).toBe('seasonReview');
    expect(localStorage.getItem(KEY)).toBe(raw);
    expect(H.recordCompletion.mock.calls).toEqual([['/grand-prix-boss']]);
  });

  it('GP_SAVE_FINAL_QUOTA: a refused final save emits no completion and retry settles only once', async () => {
    const career = beforeFinalSettlement(), raw = stash(career), view = mount();
    await waitFor(() => expect(view.result.current.status).toBe('ready'));
    const set = Storage.prototype.setItem;
    const refusal = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === KEY) throw new DOMException('Storage is full', 'QuotaExceededError');
      return set.call(this, key, value);
    });
    const action: GrandPrixAction = { type: 'raceInterval', expectedRevision: career.revision, orders: ownOrders(career) };
    let accepted: boolean | undefined;
    act(() => { accepted = view.result.current.dispatch(action); });
    expect(accepted).toBe(false);
    expect(view.result.current.career).toEqual(career);
    expect(localStorage.getItem(KEY)).toBe(raw);
    expect(H.recordCompletion).not.toHaveBeenCalled();
    refusal.mockRestore();
    act(() => { accepted = view.result.current.dispatch(action); });
    expect(accepted).toBe(true);
    const saved = read(), last = saved.career.results[11];
    expect(saved.career.results).toHaveLength(12);
    expect(saved.career.cash).toBe(career.cash + last.teamPrize - last.operatingCost);
    expect(saved.completedSeasons).toEqual([1]);
    expect(H.recordCompletion.mock.calls).toEqual([['/grand-prix-boss']]);
  });

  it('GP_SAVE_FINAL_CONFIRMATION: an uncertain final claim stays unplayed in the old view and is not emitted again on remount', async () => {
    const career = beforeFinalSettlement(); stash(career);
    const view = mount();
    await waitFor(() => expect(view.result.current.status).toBe('ready'));
    const observer = createSaveFence(() => window.localStorage);
    observer.adopt(KEY);
    const get = Storage.prototype.getItem, set = Storage.prototype.setItem;
    let landed = false;
    const writing = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      set.call(this, key, value); if (key === KEY) landed = true;
    });
    const reading = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (key) {
      if (key === KEY && landed) throw new DOMException('Cannot confirm storage', 'SecurityError');
      return get.call(this, key);
    });
    const action: GrandPrixAction = { type: 'raceInterval', expectedRevision: career.revision, orders: ownOrders(career) };
    let accepted: boolean | undefined;
    act(() => { accepted = view.result.current.dispatch(action); });
    expect(accepted).toBe(false);
    expect(view.result.current).toMatchObject({ status: 'unreadable', career });
    expect(observer.moved(KEY), 'GP_SAVE_UNCERTAIN_FINAL_BYTES_MUST_STALE_OTHER_OLD_TABS').toBe(true);
    const actual = get.call(localStorage, KEY)!;
    expect(JSON.parse(actual)).toMatchObject({ career: { phase: 'seasonReview' }, completedSeasons: [1] });
    expect(H.recordCompletion).not.toHaveBeenCalled();
    act(() => { accepted = view.result.current.dispatch(action); });
    expect(accepted).toBe(false);
    expect(get.call(localStorage, KEY)).toBe(actual);
    view.unmount(); reading.mockRestore(); writing.mockRestore();
    const fresh = mount();
    await waitFor(() => expect(fresh.result.current.status).toBe('ready'));
    expect(fresh.result.current.career?.phase).toBe('seasonReview');
    expect(localStorage.getItem(KEY)).toBe(actual);
    expect(H.recordCompletion).not.toHaveBeenCalled();
  });
});
