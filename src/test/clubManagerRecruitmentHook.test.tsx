import { StrictMode, useState } from 'react';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SAVE_KEY, leanCareer, loadCareer, marketForScreen, saveCareer, startCareer, worldSeedOf, worldYear,
} from '@/lib/clubManager';
import type { CareerState } from '@/lib/clubManager';
import { eraById } from '@/lib/clubManagerEras';
import { activeSlot, parkedKey, switchSlot } from '@/lib/clubManagerSlots';
import { createSaveFence, saveFence } from '@/lib/saveFence';
import { useClubManager } from '@/hooks/useClubManager';
import type { ClubManagerGame } from '@/hooks/useClubManager';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn() }));
type Recruitment = {
  version: 1; clubName: string; eraId: string; startYear: number; worldSeed: number | null;
  targets: { name: string; club: string; position: string; cohort: number; worldRosterKey?: string }[];
};
type RecruitmentCareer = CareerState & { recruitment?: Recruitment };
type Commit = (make: (current: CareerState) => CareerState | null) => boolean;
type Api = ClubManagerGame & { commitRecruitment?: Commit };
let api: Api;
let queueRender: () => void;
let revision = 0;
const stream = (initial: number) => {
  let seed = initial;
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
};
function metadata(career: CareerState): Recruitment {
  const player = marketForScreen(career)[0];
  expect(player, 'actual current market target').toBeTruthy();
  return {
    version: 1, clubName: career.clubName, eraId: eraById(career.eraId).id,
    startYear: worldYear(career) - Math.max(0, career.season - 1), worldSeed: worldSeedOf(career) ?? null,
    targets: [{
      name: player.name, club: player.club, position: player.position, cohort: worldYear(career) - player.age,
      ...(player.worldRosterKey ? { worldRosterKey: player.worldRosterKey } : {}),
    }],
  };
}
function request(origin: CareerState) {
  const recruitment = metadata(origin);
  return (current: CareerState): RecruitmentCareer | null => current === origin ? { ...current, recruitment } : null;
}
function commit(make: Parameters<Commit>[0]): boolean {
  expect(api.commitRecruitment, 'actual hook exposes the guarded recruitment writer').toBeTypeOf('function');
  return api.commitRecruitment!(make);
}
function Harness() {
  const game = useClubManager() as Api;
  const [tick, setTick] = useState(0);
  api = game; revision = tick; queueRender = () => setTick(value => value + 1);
  return <pre data-revision={tick}>{game.phase}</pre>;
}
async function mountCareer(career = startCareer('Brentford'), resume = true) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(career));
  const view = render(<StrictMode><Harness /></StrictMode>);
  await waitFor(() => expect(api.phase).toBe('resume'));
  expect(api.commitRecruitment).toBeTypeOf('function');
  if (resume) {
    act(() => api.resume());
    await waitFor(() => expect(api.phase).toBe('hub'));
  }
  await waitFor(() => expect(JSON.parse(localStorage.getItem(SAVE_KEY)!)).toEqual(api.career));
  return view;
}
beforeEach(() => {
  localStorage.clear(); saveFence.release(SAVE_KEY);
  vi.spyOn(Math, 'random').mockImplementation(stream(20261028));
  vi.spyOn(Date, 'now').mockReturnValue(1793145600000);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); saveFence.release(SAVE_KEY); localStorage.clear(); });

describe('recruitment through the actual saved Club Manager hook', () => {
  it('leaves old careers without metadata and refuses null or identity transforms without a write', async () => {
    await mountCareer();
    const origin = api.career!, raw = localStorage.getItem(SAVE_KEY), draws = vi.mocked(Math.random).mock.calls.length;
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    act(() => {
      expect(commit(() => null)).toBe(false);
      expect(commit(current => current)).toBe(true);
    });
    expect(api.career).toBe(origin);
    expect((api.career as RecruitmentCareer).recruitment).toBeUndefined();
    expect(localStorage.getItem(SAVE_KEY)).toBe(raw);
    expect(writes.mock.calls.filter(([key]) => key === SAVE_KEY)).toHaveLength(0);
    expect(vi.mocked(Math.random).mock.calls).toHaveLength(draws);
  });

  it('commits once outside updater replay, persists first and preserves every old field and draw', async () => {
    const view = await mountCareer(), origin = api.career!, make = vi.fn(request(origin));
    const before = JSON.stringify(origin), draws = vi.mocked(Math.random).mock.calls.length;
    const original = Storage.prototype.setItem, observations: boolean[] = [];
    const storage = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      if (key === SAVE_KEY) observations.push(api.career === origin);
      original.call(this, key, value);
    });
    act(() => { queueRender(); expect(commit(make)).toBe(true); });
    expect(revision).toBe(1);
    expect(make).toHaveBeenCalledTimes(1);
    expect(observations.length).toBeGreaterThan(0);
    expect(observations[0]).toBe(true);
    const next = api.career as RecruitmentCareer;
    const { recruitment, ...core } = next;
    expect(core).toStrictEqual(origin);
    expect(recruitment).toEqual(metadata(origin));
    expect(JSON.stringify(origin)).toBe(before);
    expect(vi.mocked(Math.random).mock.calls).toHaveLength(draws);
    await waitFor(() => expect(JSON.parse(localStorage.getItem(SAVE_KEY)!)).toEqual(next));
    expect((loadCareer() as RecruitmentCareer).recruitment).toEqual(recruitment);
    storage.mockRestore(); view.unmount();
    await mountCareer(loadCareer()!);
    expect((api.career as RecruitmentCareer).recruitment).toEqual(recruitment);
  });

  it('keeps memory, disk and the unmount writer unchanged after both quota attempts refuse', async () => {
    const view = await mountCareer(), origin = api.career!, before = JSON.stringify(origin);
    const raw = localStorage.getItem(SAVE_KEY), draws = vi.mocked(Math.random).mock.calls.length;
    const original = Storage.prototype.setItem; let refused = 0;
    const storage = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      if (key === SAVE_KEY) { refused += 1; throw new DOMException('QA quota', 'QuotaExceededError'); }
      original.call(this, key, value);
    });
    act(() => expect(commit(request(origin))).toBe(false));
    expect(refused).toBe(2);
    expect(api.saveFailed).toBe(true);
    expect(api.career).toBe(origin);
    expect(JSON.stringify(api.career)).toBe(before);
    expect(localStorage.getItem(SAVE_KEY)).toBe(raw);
    expect(vi.mocked(Math.random).mock.calls).toHaveLength(draws);
    storage.mockRestore(); view.unmount();
    expect(localStorage.getItem(SAVE_KEY)).toBe(raw);
    expect((loadCareer() as RecruitmentCareer).recruitment).toBeUndefined();
  });

  it('retains metadata through a genuine lean retry and actual parked-slot roundtrip', async () => {
    const career = startCareer('Brentford');
    // Synthetic repeated history exercises the existing six-per-opponent fallback, not real match results.
    career.h2h = Array.from({ length: 12 }, () => ({ opp: 'Generated quota opponent', res: 'D' as const, score: '0-0', season: 1, comp: 'league' as const, home: true }));
    const view = await mountCareer(career), origin = api.career!;
    expect(origin.h2h).toHaveLength(12);
    const original = Storage.prototype.setItem; let attempts = 0;
    const storage = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      if (key === SAVE_KEY && ++attempts === 1) throw new DOMException('QA first full write', 'QuotaExceededError');
      original.call(this, key, value);
    });
    act(() => expect(commit(request(origin))).toBe(true));
    expect(attempts).toBeGreaterThanOrEqual(2);
    const next = api.career as RecruitmentCareer;
    expect(next.h2h).toHaveLength(12);
    const stored = JSON.parse(localStorage.getItem(SAVE_KEY)!) as RecruitmentCareer;
    // The ordinary persistence effect may follow the successful synchronous lean retry with a full write.
    const leanWrite = storage.mock.calls.filter(([key]) => key === SAVE_KEY)[1][1];
    expect(JSON.parse(leanWrite)).toEqual(leanCareer(next));
    expect(JSON.parse(leanWrite).h2h).toHaveLength(6);
    expect(stored.recruitment).toEqual(next.recruitment);
    storage.mockRestore(); view.unmount();
    const other = startCareer('Everton');
    localStorage.setItem(parkedKey(2), JSON.stringify(other));
    expect(switchSlot(2, next)).toBe(true);
    expect(activeSlot()).toBe(2);
    const parked = JSON.parse(localStorage.getItem(parkedKey(1))!) as RecruitmentCareer;
    expect(parked.h2h).toHaveLength(6); expect(parked.recruitment).toEqual(next.recruitment);
    expect(loadCareer()!.clubName).toBe(other.clubName);
    expect(switchSlot(1, loadCareer()!)).toBe(true);
    expect(activeSlot()).toBe(1);
    expect((loadCareer() as RecruitmentCareer).recruitment).toEqual(next.recruitment);
    expect(saveCareer(loadCareer()!)).toBe(true);
  });

  it('reserves the committed career so the same captured add cannot publish twice in one event', async () => {
    await mountCareer();
    const origin = api.career!, make = request(origin), draws = vi.mocked(Math.random).mock.calls.length;
    act(() => {
      expect(commit(make)).toBe(true);
      expect(commit(make)).toBe(false);
    });
    expect((api.career as RecruitmentCareer).recruitment!.targets).toHaveLength(1);
    expect(vi.mocked(Math.random).mock.calls).toHaveLength(draws);
    await waitFor(() => expect(JSON.parse(localStorage.getItem(SAVE_KEY)!)).toEqual(api.career));
  });

  it('refuses outside the actual hub before invoking a proposed metadata transform', async () => {
    await mountCareer(startCareer('Brentford'), false);
    const origin = api.career!, raw = localStorage.getItem(SAVE_KEY), make = vi.fn(request(origin));
    act(() => expect(commit(make)).toBe(false));
    expect(make).not.toHaveBeenCalled();
    expect(api.career).toBe(origin); expect(localStorage.getItem(SAVE_KEY)).toBe(raw);
  });

  it('refuses a retained hub callback after a phase-only move to the managers screen', async () => {
    await mountCareer();
    const origin = api.career!, captured = api.commitRecruitment!, make = vi.fn(request(origin));
    act(() => api.showSlots());
    await waitFor(() => expect(api.phase).toBe('resume'));
    expect(api.career).toBe(origin);
    const raw = localStorage.getItem(SAVE_KEY), draws = vi.mocked(Math.random).mock.calls.length;
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    act(() => expect(captured(make)).toBe(false));
    expect(make).not.toHaveBeenCalled();
    expect(api.career).toBe(origin); expect(localStorage.getItem(SAVE_KEY)).toBe(raw);
    expect(writes.mock.calls.filter(([key]) => key === SAVE_KEY)).toHaveLength(0);
    expect(vi.mocked(Math.random).mock.calls).toHaveLength(draws);
  });

  it('does not overwrite the manager another slot has made active', async () => {
    const view = await mountCareer(), origin = api.career!, captured = api.commitRecruitment!;
    const other = startCareer('Everton');
    localStorage.setItem(parkedKey(2), JSON.stringify(other));
    expect(switchSlot(2, origin)).toBe(true);
    const incoming = localStorage.getItem(SAVE_KEY), parked = localStorage.getItem(parkedKey(1)), make = vi.fn(request(origin));
    act(() => expect(captured(make)).toBe(false));
    expect(make).not.toHaveBeenCalled(); expect(activeSlot()).toBe(2);
    expect(localStorage.getItem(SAVE_KEY)).toBe(incoming); expect(localStorage.getItem(parkedKey(1))).toBe(parked);
    view.unmount(); expect(localStorage.getItem(SAVE_KEY)).toBe(incoming);
  });

  it('refuses a newer same-slot save fence without invoking or publishing a transform', async () => {
    await mountCareer();
    const origin = api.career!, captured = api.commitRecruitment!, make = vi.fn(request(origin));
    const external = createSaveFence(() => localStorage), incoming = JSON.stringify({ ...origin, budget: origin.budget + 1 });
    external.adopt(SAVE_KEY);
    expect(external.write(SAVE_KEY, () => { localStorage.setItem(SAVE_KEY, incoming); return true; })).toBe('written');
    act(() => expect(captured(make)).toBe(false));
    expect(make).not.toHaveBeenCalled(); expect(api.saveMoved).toBe(true);
    expect(api.career).toBe(origin); expect(localStorage.getItem(SAVE_KEY)).toBe(incoming);
  });

  it('makes an old callback validate its captured origin against the latest committed career', async () => {
    await mountCareer();
    const origin = api.career!, captured = api.commitRecruitment!, make = request(origin);
    const slot = origin.xiIds.findIndex(id => id !== null); expect(slot).toBeGreaterThanOrEqual(0);
    act(() => api.setXiSlot(slot, null));
    await waitFor(() => expect(api.career).not.toBe(origin));
    const replacement = api.career!, before = JSON.stringify(replacement), raw = localStorage.getItem(SAVE_KEY), draws = vi.mocked(Math.random).mock.calls.length;
    act(() => expect(captured(make)).toBe(false));
    expect(api.career).toBe(replacement); expect(JSON.stringify(api.career)).toBe(before);
    expect(localStorage.getItem(SAVE_KEY)).toBe(raw); expect(vi.mocked(Math.random).mock.calls).toHaveLength(draws);
  });

  it('invalidates the actual writer on unmount before a delayed add can run', async () => {
    const view = await mountCareer(), origin = api.career!, captured = api.commitRecruitment!;
    view.unmount();
    const raw = localStorage.getItem(SAVE_KEY), make = vi.fn(request(origin)), draws = vi.mocked(Math.random).mock.calls.length;
    expect(captured(make)).toBe(false);
    expect(make).not.toHaveBeenCalled(); expect(localStorage.getItem(SAVE_KEY)).toBe(raw);
    expect(vi.mocked(Math.random).mock.calls).toHaveLength(draws);
  });
});
