import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, cleanup, fireEvent, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import everton from '../../scripts/data/cmBookSaveEvertonFixture.json';
import { useClubManager } from '@/hooks/useClubManager';
import { SavePointsScreen } from '@/components/club-manager/SavePointsScreen';
import { clubAvailableInCareer, finishSeason, loadCareer, trimCareer, type CareerState } from '@/lib/clubManager';
import { packCareerPairs } from '@/lib/clubManagerParkedSave';
import { SAVE_KEY, SLOTS_INDEX_KEY, parkedKey } from '@/lib/clubManagerSaveKeys';
import { fenceKeyOf, saveFence } from '@/lib/saveFence';
import { reopenGame } from '@/lib/saveKeeper';
import { settlePendingSaves } from '@/lib/safeStorage';
import { brokenSaveKey, SET_ASIDE_SLOT_KEY } from '@/lib/brokenSaveRecovery';
import { postsScore } from '@/lib/clubManagerStart';
import { recordActivity, recordCompletion } from '@/lib/completions';
import { createPoint } from '@/lib/cmSavePoints';
import { readPointsIndex, seasonPosts } from '@/lib/cmSavePointsStore';

vi.mock('@/lib/completions', () => ({
  recordCompletion: vi.fn(),
  recordActivity: vi.fn(),
  recordStreakDay: vi.fn(),
}));
vi.mock('@/lib/saveKeeper', async original => ({
  ...await original<typeof import('@/lib/saveKeeper')>(),
  reopenGame: vi.fn(),
}));

const checkpoint = (slot: number) => `dukb-cm-checkpoint:${slot}`;
const slotIndex = (active: number) => JSON.stringify({ v: 1, active });
const fixtureDir = process.env.CM_CHECKPOINT_FIXTURE_DIR;

function settledReview(format: 'plain' | 'packed'): string {
  if (fixtureDir) {
    const name = format === 'packed' ? 'packed' : 'fixture-finish';
    return readFileSync(join(fixtureDir, `dukb-cm-portable-everton-12-${name}.json`), 'utf8');
  }
  const earlier = loadCareer(JSON.stringify(everton))!;
  const { state } = finishSeason({ ...earlier, week: earlier.calendar.length, live: undefined });
  const plain = trimCareer(state);
  return format === 'packed' ? packCareerPairs(plain)! : JSON.stringify(plain);
}

function openSeasonReview(format: 'plain' | 'packed', slot = 2) {
  const original = settledReview(format);
  localStorage.setItem(SLOTS_INDEX_KEY, slotIndex(slot));
  localStorage.setItem(SAVE_KEY, original);
  const hook = renderHook(() => useClubManager());
  act(() => hook.result.current.resume());
  const career = hook.result.current.career!;
  expect(hook.result.current.phase).toBe('seasonEnd');
  expect(career.season).toBe(fixtureDir ? 12 : 1);
  // The mount can normalize a plain oversized save. Both supported input
  // spellings must also work if they are the bytes at rollover.
  localStorage.setItem(SAVE_KEY, original);
  return { hook, original, career };
}

beforeEach(() => {
  localStorage.clear();
  saveFence.release(SAVE_KEY);
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
  saveFence.release(SAVE_KEY);
});

describe('Club Manager automatic season checkpoints', () => {
  it.each(['plain', 'packed'] as const)('keeps an exact %s review after the real rollover saves', format => {
    const { hook, original, career } = openSeasonReview(format);
    const peer = settledReview('plain');
    localStorage.setItem(parkedKey(3), peer);
    expect(localStorage.getItem(checkpoint(2))).toBeNull();
    act(() => hook.result.current.nextSeason());
    expect(hook.result.current.phase).toBe('hub');
    expect(loadCareer()?.season).toBe(career.season + 1);
    expect(localStorage.getItem(checkpoint(2)) === original).toBe(true);
    expect(localStorage.getItem(checkpoint(1))).toBeNull();
    expect(localStorage.getItem(parkedKey(3)) === peer).toBe(true);

    const set = vi.spyOn(Storage.prototype, 'setItem');
    act(() => window.dispatchEvent(new Event('pagehide')));
    expect(set.mock.calls.filter(([key]) => key === checkpoint(2))).toHaveLength(0);
  });

  it('waits for a refused active rollover write and keeps the exact review on retry', () => {
    const { hook, original, career } = openSeasonReview('packed');
    const set = Storage.prototype.setItem;
    const refusal = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === SAVE_KEY) throw new DOMException('quota', 'QuotaExceededError');
      set.call(this, key, value);
    });
    act(() => hook.result.current.nextSeason());
    expect(hook.result.current.saveFailed).toBe(true);
    expect(localStorage.getItem(SAVE_KEY) === original).toBe(true);
    expect(localStorage.getItem(checkpoint(2))).toBeNull();
    refusal.mockRestore();
    act(() => window.dispatchEvent(new Event('pagehide')));
    expect(loadCareer()?.season).toBe(career.season + 1);
    expect(localStorage.getItem(checkpoint(2)) === original).toBe(true);
  });

  it.each(['change tactics', 'open Managers'] as const)('keeps the pending review on normal retry from %s', action => {
    const { hook, original, career } = openSeasonReview('packed');
    const set = Storage.prototype.setItem;
    const refusal = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === SAVE_KEY) throw new DOMException('quota', 'QuotaExceededError');
      set.call(this, key, value);
    });
    act(() => hook.result.current.nextSeason());
    expect(hook.result.current.saveFailed).toBe(true);
    refusal.mockRestore();
    if (action === 'change tactics') {
      const beforeRetry = hook.result.current.career;
      act(() => hook.result.current.setMentality('attacking'));
      expect(hook.result.current.career === beforeRetry).toBe(false);
      expect(loadCareer()?.mentality).toBe('attacking');
    } else {
      act(() => hook.result.current.showSlots());
      expect(hook.result.current.phase).toBe('resume');
    }
    expect(loadCareer()?.season).toBe(career.season + 1);
    expect(localStorage.getItem(checkpoint(2)) === original).toBe(true);
  });

  it('holds a refused rollover against app refresh until the latest successor can save', () => {
    const { hook, original } = openSeasonReview('packed');
    const set = Storage.prototype.setItem;
    const refusal = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === SAVE_KEY) throw new DOMException('quota', 'QuotaExceededError');
      set.call(this, key, value);
    });
    act(() => hook.result.current.nextSeason());
    act(() => hook.result.current.setMentality('attacking'));
    act(() => expect(settlePendingSaves()).toBe(false));
    expect(localStorage.getItem(SAVE_KEY) === original).toBe(true);
    refusal.mockRestore();
    act(() => expect(settlePendingSaves()).toBe(true));
    expect(loadCareer()?.mentality).toBe('attacking');
    expect(localStorage.getItem(checkpoint(2)) === original).toBe(true);
  });

  it.skipIf(!!fixtureDir)('does not acknowledge a lost exact read-back from the ordinary plain writer', () => {
    const { hook, career } = openSeasonReview('plain');
    const get = Storage.prototype.getItem;
    const before = Number(localStorage.getItem(fenceKeyOf(SAVE_KEY)));
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key) {
      const raw = get.call(this, key);
      return key === SAVE_KEY && raw && JSON.parse(raw).season === career.season + 1 ? 'suspect readback' : raw;
    });
    act(() => hook.result.current.nextSeason());
    expect(Number(localStorage.getItem(fenceKeyOf(SAVE_KEY)))).toBe(before + 1);
    expect(localStorage.getItem(checkpoint(2))).toBeNull();
    expect(hook.result.current.saveFailed || hook.result.current.saveMoved).toBe(true);
    expect(JSON.parse(get.call(localStorage, SAVE_KEY)!).season).toBe(career.season + 1);
  });

  it('keeps the old checkpoint and commits the new season when only checkpoint storage refuses', () => {
    const { hook, career } = openSeasonReview('packed');
    const older = JSON.stringify({ ...loadCareer()!, season: career.season - 1 } satisfies CareerState);
    localStorage.setItem(checkpoint(2), older);
    const set = Storage.prototype.setItem;
    const refusal = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === checkpoint(2)) throw new DOMException('quota', 'QuotaExceededError');
      set.call(this, key, value);
    });
    act(() => hook.result.current.nextSeason());
    expect(loadCareer()?.season).toBe(career.season + 1);
    expect(refusal.mock.calls.filter(([key]) => key === checkpoint(2))).toHaveLength(1);
    expect(localStorage.getItem(checkpoint(2)) === older).toBe(true);
    expect(hook.result.current.saveFailed).toBe(false);
  });

  it.each(['plain', 'packed'] as const)('cannot overwrite the peer that switches slots during a %s rollout claim', format => {
    const { hook, original } = openSeasonReview(format);
    const peer = JSON.stringify({ ...loadCareer(original)!, boardConfidence: 77 });
    const set = Storage.prototype.setItem;
    let switched = false;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (!switched && key === fenceKeyOf(SAVE_KEY)) {
        switched = true;
        set.call(this, SLOTS_INDEX_KEY, slotIndex(3));
        set.call(this, parkedKey(2), original);
        set.call(this, SAVE_KEY, peer);
      }
      set.call(this, key, value);
    });
    act(() => hook.result.current.nextSeason());
    expect(switched).toBe(true);
    expect(localStorage.getItem(SAVE_KEY) === peer).toBe(true);
    expect(localStorage.getItem(checkpoint(2))).toBeNull();
    expect(localStorage.getItem(parkedKey(2)) === original).toBe(true);
  });

  it('leaves the checkpoint alone on an unavailable job and keeps the departed club after a valid move', () => {
    const { hook, original, career } = openSeasonReview('packed');
    expect(clubAvailableInCareer(career, 'Kashima Antlers')).toBe(false);
    act(() => hook.result.current.nextSeason('Kashima Antlers'));
    expect(hook.result.current.career === career).toBe(true);
    expect(localStorage.getItem(checkpoint(2))).toBeNull();
    act(() => hook.result.current.nextSeason('Brentford'));
    expect(hook.result.current.career?.clubName).toBe('Brentford');
    expect(loadCareer()?.clubName).toBe('Brentford');
    expect(JSON.parse(localStorage.getItem(checkpoint(2))!).clubName).toBe('Everton');
    expect(localStorage.getItem(checkpoint(2)) === original).toBe(true);
  });

  it.each(['quota', 'bad backup readback', 'refused backup slot mark', 'new slot', 'new checkpoint', 'new tab on same slot'] as const)(
    'refuses an unsafe restore after %s', reason => {
      const { hook, original } = openSeasonReview('packed');
      act(() => hook.result.current.nextSeason());
      const currentRaw = localStorage.getItem(SAVE_KEY)!;
      const screen = render(<SavePointsScreen career={hook.result.current.career!} slot={2} />);
      fireEvent.click(screen.getByRole('button', { name: 'Restore checkpoint' }));
      const peer = JSON.stringify({ ...JSON.parse(currentRaw), boardConfidence: 55 });
      const backupPrefix = SAVE_KEY + '.broken-';
      const set = Storage.prototype.setItem;
      const get = Storage.prototype.getItem;
      if (reason === 'new slot') {
        localStorage.setItem(parkedKey(2), currentRaw);
        localStorage.setItem(SLOTS_INDEX_KEY, slotIndex(3));
        localStorage.setItem(SAVE_KEY, peer);
      } else if (reason === 'new checkpoint') {
        localStorage.setItem(checkpoint(2), original + ' ');
      } else if (reason === 'new tab on same slot') {
        localStorage.setItem(SAVE_KEY, peer);
        const generation = Number(localStorage.getItem(fenceKeyOf(SAVE_KEY)));
        localStorage.setItem(fenceKeyOf(SAVE_KEY), String(generation + 1));
      } else if (reason === 'quota' || reason === 'refused backup slot mark') {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
          if (reason === 'quota' ? key.startsWith(backupPrefix) : key === SET_ASIDE_SLOT_KEY) {
            throw new DOMException('quota', 'QuotaExceededError');
          }
          set.call(this, key, value);
        });
      } else {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key) {
          const raw = get.call(this, key);
          return raw !== null && key.startsWith(backupPrefix) ? 'broken check' : raw;
        });
      }
      const expected = reason === 'new slot' || reason === 'new tab on same slot' ? peer : currentRaw;
      fireEvent.click(screen.getByRole('button', { name: 'Restore season review' }));
      expect(localStorage.getItem(SAVE_KEY) === expected).toBe(true);
      expect(localStorage.getItem(checkpoint(2)) === (reason === 'new checkpoint' ? original + ' ' : original)).toBe(true);
      expect(reopenGame).not.toHaveBeenCalled();
      if (reason === 'refused backup slot mark') {
        expect(Object.keys(localStorage).filter(key => key.startsWith(backupPrefix))).toHaveLength(0);
      }
    },
  );

  it('does not reopen under a late byte-identical restore claim from another slot', () => {
    const { hook } = openSeasonReview('packed');
    act(() => hook.result.current.nextSeason());
    const screen = render(<SavePointsScreen career={hook.result.current.career!} slot={2} />);
    fireEvent.click(screen.getByRole('button', { name: 'Restore checkpoint' }));
    const set = Storage.prototype.setItem;
    const generationKey = fenceKeyOf(SAVE_KEY);
    const generation = Number(localStorage.getItem(generationKey));
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      set.call(this, key, value);
      if (key === SAVE_KEY && JSON.parse(value).restoredFromCheckpoint === true) {
        set.call(this, SLOTS_INDEX_KEY, slotIndex(3));
        set.call(this, generationKey, String(generation + 2));
      }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Restore season review' }));
    expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).restoredFromCheckpoint).toBe(true);
    expect(localStorage.getItem(SLOTS_INDEX_KEY)).toBe(slotIndex(3));
    expect(localStorage.getItem(generationKey)).toBe(String(generation + 2));
    expect(reopenGame).not.toHaveBeenCalled();
  });

  it('does not offer another unseeded manager\'s review after recovering into the same slot', () => {
    const { hook, original } = openSeasonReview('packed');
    act(() => hook.result.current.nextSeason());
    const active = JSON.parse(localStorage.getItem(SAVE_KEY)!);
    const review = JSON.parse(original);
    delete active.worldSeed;
    delete review.worldSeed;
    localStorage.setItem(checkpoint(2), JSON.stringify(review));
    localStorage.setItem(SAVE_KEY, JSON.stringify(active));
    const current = hook.result.current.career!;
    const first = render(<SavePointsScreen career={current} slot={2} />);
    expect(first.getByRole('button', { name: 'Restore checkpoint' })).toBeTruthy();
    first.unmount();
    const previous = active.history.find((record: { season: number }) => record.season === review.season);
    expect(previous).toBeDefined();
    previous.points += 1;
    localStorage.setItem(SAVE_KEY, JSON.stringify(active));
    const second = render(<SavePointsScreen career={current} slot={2} />);
    expect(second.queryByRole('button', { name: 'Restore checkpoint' })).toBeNull();
  });

  it('restores exact packed review fields beside three manual points and suppresses scored replay', () => {
    const { hook, career, original } = openSeasonReview('packed');
    act(() => hook.result.current.nextSeason());
    const progressed = hook.result.current.career!;
    expect(postsScore(progressed)).toBe(true);
    for (const title of ['First', 'Second', 'Third']) expect(createPoint(2, progressed, title).ok).toBe(true);
    const manual = readPointsIndex(2);
    const displaced = localStorage.getItem(SAVE_KEY);
    const oldBackups = [1, 2, 3].map(day => brokenSaveKey(SAVE_KEY, new Date(Date.UTC(2025, 0, day))));
    for (const [index, key] of oldBackups.entries()) localStorage.setItem(key, JSON.stringify({ ...JSON.parse(displaced!), budget: index }));
    const peer = settledReview('plain');
    localStorage.setItem(parkedKey(3), peer);
    const view = render(<SavePointsScreen career={progressed} slot={2} />);
    expect(view.getAllByTestId('cm-point-row')).toHaveLength(3);
    fireEvent.click(view.getByRole('button', { name: 'Restore checkpoint' }));
    fireEvent.click(view.getByRole('button', { name: 'Restore season review' }));
    const existing = JSON.parse(localStorage.getItem(SAVE_KEY)!);
    expect(existing.restoredFromCheckpoint).toBe(true);
    delete existing.restoredFromCheckpoint;
    expect(JSON.stringify(existing) === JSON.stringify(JSON.parse(original))).toBe(true);
    expect(Object.keys(localStorage).some(key => key.startsWith(SAVE_KEY + '.broken-') && localStorage.getItem(key) === displaced)).toBe(true);
    expect(Object.keys(localStorage).filter(key => key.startsWith(SAVE_KEY + '.broken-'))).toHaveLength(3);
    expect(localStorage.getItem(oldBackups[0])).toBeNull();
    expect(localStorage.getItem(parkedKey(3)) === peer).toBe(true);
    expect(localStorage.getItem(checkpoint(2)) === original).toBe(true);
    expect(readPointsIndex(2)).toEqual(manual);
    expect(reopenGame).toHaveBeenCalledWith('/club-manager');

    hook.unmount();
    const resumed = renderHook(() => useClubManager());
    act(() => resumed.result.current.resume());
    expect(resumed.result.current.phase).toBe('seasonEnd');
    expect(resumed.result.current.career!.season).toBe(career.season);
    expect(recordCompletion).not.toHaveBeenCalled();
    act(() => resumed.result.current.nextSeason());
    expect(postsScore(resumed.result.current.career!)).toBe(false);
    for (let i = 0; i < 12 && resumed.result.current.phase !== 'matchResult'; i++) {
      act(() => resumed.result.current.quickPlay());
    }
    expect(recordActivity).toHaveBeenCalledWith('/club-manager');
    expect(vi.mocked(recordActivity).mock.calls.every(call => call.length === 1)).toBe(true);

    const branch = resumed.result.current.career!;
    resumed.unmount();
    const atFinalReview = { ...branch, week: branch.calendar.length, live: undefined };
    localStorage.setItem(SAVE_KEY, JSON.stringify(atFinalReview));
    const replay = renderHook(() => useClubManager());
    act(() => replay.result.current.continueFromReport());
    expect(recordCompletion).toHaveBeenCalledWith('/club-manager');
    expect(readPointsIndex(2)).toEqual(manual);
    const ranked = loadCareer(displaced!)!;
    expect(ranked.season).toBe(branch.season);
    expect(postsScore(ranked) && seasonPosts(2, ranked.season)).toBe(true);
  });
});
