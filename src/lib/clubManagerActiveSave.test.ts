import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadCareer, saveCareer, startCareer, trimCareer } from '@/lib/clubManager';
import { unpackParkedCareer } from '@/lib/clubManagerParkedSave';
import { PARKED_PAIR_SAVE_VERSION, SAVE_KEY, SLOTS_INDEX_KEY } from '@/lib/clubManagerSaveKeys';
import { SET_ASIDE_SLOT_KEY } from '@/lib/brokenSaveRecovery';
import { fenceKeyOf, saveFence } from '@/lib/saveFence';

const backupKeys = () => Object.keys(localStorage).filter(key => key.startsWith(SAVE_KEY + '.broken-'));
const largeCareer = () => {
  const career = startCareer('Everton');
  const pairs: Record<string, [number, number]> = {};
  for (let i = 0; i < 4_500; i++) pairs[`Fixture home ${i}|Fixture away ${i}`] = [i % 4, i % 3];
  return { ...career, pairResults: { premier: pairs } };
};
const initialize = () => {
  const career = largeCareer();
  const previous = JSON.stringify(career, null, ' ');
  localStorage.setItem(SAVE_KEY, previous);
  localStorage.setItem(SLOTS_INDEX_KEY, JSON.stringify({ v: 1, active: 2 }));
  saveFence.adopt(SAVE_KEY);
  const next = { ...career, week: career.week + 1 };
  expect(JSON.stringify(trimCareer(next)).length).toBeGreaterThan(234_000);
  return { previous, next };
};

beforeEach(() => {
  localStorage.clear();
  saveFence.release(SAVE_KEY);
});
afterEach(() => {
  vi.restoreAllMocks();
  saveFence.release(SAVE_KEY);
});

describe('compact active Club Manager saves', () => {
  it('keeps ordinary small careers in the existing plain format', () => {
    const career = startCareer('Everton');
    expect(saveCareer(career)).toBe(true);
    expect(localStorage.getItem(SAVE_KEY)).toBe(JSON.stringify(trimCareer(career)));
    expect(backupKeys()).toEqual([]);
  });

  it('keeps an exact copy in the active slot and round-trips every field on both sides of a rollover', () => {
    const { previous, next } = initialize();
    expect(saveCareer(next)).toBe(true);
    const packed = localStorage.getItem(SAVE_KEY)!;
    expect(JSON.parse(packed).saveVersion).toBe(PARKED_PAIR_SAVE_VERSION);
    expect(packed.length).toBeLessThan(234_000);
    expect(unpackParkedCareer(packed)).toBe(JSON.stringify(trimCareer(next)));
    expect(loadCareer()?.pairResults).toEqual(next.pairResults);
    expect(backupKeys()).toHaveLength(1);
    const backup = backupKeys()[0];
    expect(localStorage.getItem(backup)).toBe(previous);
    expect(JSON.parse(localStorage.getItem(SET_ASIDE_SLOT_KEY)!)[backup]).toBe(2);

    const newSeason = { ...next, season: next.season + 1, week: 0, pairResults: {} };
    expect(JSON.stringify(newSeason).length).toBeLessThan(234_000);
    expect(saveCareer(newSeason)).toBe(true);
    const afterRollover = localStorage.getItem(SAVE_KEY)!;
    expect(JSON.parse(afterRollover).saveVersion).toBe(PARKED_PAIR_SAVE_VERSION);
    expect(unpackParkedCareer(afterRollover)).toBe(JSON.stringify(trimCareer(newSeason)));
    expect(saveCareer({ ...next, season: newSeason.season })).toBe(true);
    expect(backupKeys()).toEqual([backup]);
    expect(localStorage.getItem(backup)).toBe(previous);
  });

  it.each(['backup write', 'backup readback', 'fence'] as const)('leaves the exact old bytes on a refused %s', operation => {
    const { previous, next } = initialize();
    const oldSet = Storage.prototype.setItem;
    const oldGet = Storage.prototype.getItem;
    const currentWrites: string[] = [];
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === SAVE_KEY) currentWrites.push(value);
      if ((operation === 'backup write' && key.startsWith(SAVE_KEY + '.broken-')) ||
          (operation === 'fence' && key === fenceKeyOf(SAVE_KEY))) throw new DOMException('quota', 'QuotaExceededError');
      return oldSet.call(this, key, value);
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key) {
      const value = oldGet.call(this, key);
      if (operation === 'backup readback' && value !== null && key.startsWith(SAVE_KEY + '.broken-')) return 'incorrect bytes';
      return value;
    });

    expect(saveCareer(next)).toBe(false);
    expect(currentWrites).toEqual([]);
    expect(localStorage.getItem(SAVE_KEY)).toBe(previous);
    if (operation === 'fence') expect(backupKeys().map(key => oldGet.call(localStorage, key))).toEqual([previous]);
    else expect(backupKeys()).toHaveLength(0);
  });

  it('refuses one packed active write without trying lean and reuses the checked copy on retry', () => {
    const { previous, next } = initialize();
    const oldSet = Storage.prototype.setItem;
    const attempts: string[] = [];
    const intercept = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === SAVE_KEY) {
        attempts.push(value);
        throw new DOMException('quota', 'QuotaExceededError');
      }
      return oldSet.call(this, key, value);
    });

    expect(saveCareer(next)).toBe(false);
    expect(attempts).toHaveLength(1);
    expect(JSON.parse(attempts[0]).saveVersion).toBe(PARKED_PAIR_SAVE_VERSION);
    const kept = backupKeys();
    expect(kept).toHaveLength(1);
    expect(localStorage.getItem(kept[0])).toBe(previous);
    expect(localStorage.getItem(SAVE_KEY)).toBe(previous);

    intercept.mockRestore();
    expect(saveCareer(next)).toBe(true);
    expect(localStorage.getItem(SAVE_KEY)).toBe(attempts[0]);
    expect(backupKeys()).toEqual(kept);
  });

  it('copies nothing if the active bytes change before the backup reads them', () => {
    const { next } = initialize();
    const competing = JSON.stringify(startCareer('Lincoln City'));
    const oldKey = Storage.prototype.key;
    let scanned = false;
    vi.spyOn(Storage.prototype, 'key').mockImplementation(function (this: Storage, index) {
      if (!scanned) {
        scanned = true;
        localStorage.setItem(SAVE_KEY, competing);
        localStorage.setItem(SLOTS_INDEX_KEY, JSON.stringify({ v: 1, active: 3 }));
      }
      return oldKey.call(this, index);
    });

    expect(saveCareer(next)).toBe(false);
    expect(scanned).toBe(true);
    expect(localStorage.getItem(SAVE_KEY)).toBe(competing);
    expect(backupKeys()).toEqual([]);
  });

  it('keeps a copy marked for its original slot if another tab switches during the backup', () => {
    const { previous, next } = initialize();
    const competing = JSON.stringify(startCareer('Lincoln City'));
    const oldSet = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      oldSet.call(this, key, value);
      if (key.startsWith(SAVE_KEY + '.broken-')) {
        oldSet.call(this, SAVE_KEY, competing);
        oldSet.call(this, SLOTS_INDEX_KEY, JSON.stringify({ v: 1, active: 3 }));
      }
    });

    expect(saveCareer(next)).toBe(false);
    expect(localStorage.getItem(SAVE_KEY)).toBe(competing);
    const backup = backupKeys()[0];
    expect(localStorage.getItem(backup)).toBe(previous);
    expect(JSON.parse(localStorage.getItem(SET_ASIDE_SLOT_KEY)!)[backup]).toBe(2);
  });

  it('keeps a competing active save written while the backup was being stored', () => {
    const { previous, next } = initialize();
    const competing = JSON.stringify({ ...next, week: next.week + 2 });
    const oldSet = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      oldSet.call(this, key, value);
      if (key.startsWith(SAVE_KEY + '.broken-')) {
        oldSet.call(this, SAVE_KEY, competing);
        oldSet.call(this, fenceKeyOf(SAVE_KEY), '81');
      }
    });

    expect(saveCareer(next)).toBe(false);
    expect(localStorage.getItem(SAVE_KEY)).toBe(competing);
    expect(localStorage.getItem(fenceKeyOf(SAVE_KEY))).toBe('81');
    expect(backupKeys().map(key => localStorage.getItem(key))).toEqual([previous]);
  });
});
