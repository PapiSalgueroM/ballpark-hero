/**
 * Round 928: the three manager slots, on the real engine's save shape.
 * scripts/simClubManagerSlots.mjs plays whole careers through the swap; this
 * file holds the storage rules one at a time.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SAVE_KEY, startCareer, leanCareer, trimCareer } from '@/lib/clubManager';
import {
  SLOTS_INDEX_KEY, parkedKey, activeSlot, readSlots, switchSlot, deleteSlot, slotEraId, summarize,
} from '@/lib/clubManagerSlots';

const career = (club: string) => startCareer(club);
const keys = () => Object.keys(localStorage).sort();

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('an old save, from before slots', () => {
  it('is slot 1, and reading the slots writes nothing', () => {
    const bytes = JSON.stringify(trimCareer(career('Everton')));
    localStorage.setItem(SAVE_KEY, bytes);
    const views = readSlots();
    expect(activeSlot()).toBe(1);
    expect(views.map(v => !!v.summary)).toEqual([true, false, false]);
    expect(views[0].active).toBe(true);
    expect(views[0].summary?.clubName).toBe('Everton');
    expect(localStorage.getItem(SAVE_KEY)).toBe(bytes);
    expect(keys()).toEqual([SAVE_KEY]);
  });
});

describe('switching', () => {
  it('parks the outgoing career lean and brings the incoming one to SAVE_KEY', () => {
    const a = career('Everton');
    localStorage.setItem(SAVE_KEY, JSON.stringify(a));
    expect(switchSlot(2)).toBe(true);
    expect(activeSlot()).toBe(2);
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
    expect(localStorage.getItem(parkedKey(1))).toBe(JSON.stringify(leanCareer(a)));

    const b = career('Lincoln City');
    localStorage.setItem(SAVE_KEY, JSON.stringify(b));
    expect(switchSlot(1)).toBe(true);
    expect(activeSlot()).toBe(1);
    expect(localStorage.getItem(SAVE_KEY)).toBe(JSON.stringify(leanCareer(a)));
    expect(localStorage.getItem(parkedKey(2))).toBe(JSON.stringify(leanCareer(b)));
    expect(localStorage.getItem(parkedKey(1))).toBeNull();
    /* Back on slot 1 the index is gone again, exactly as before slots. */
    expect(localStorage.getItem(SLOTS_INDEX_KEY)).toBeNull();
    expect(readSlots().map(v => v.summary?.clubName ?? null)).toEqual(['Everton', 'Lincoln City', null]);
  });

  it('parks the career held in memory when it is handed in', () => {
    const a = career('Everton');
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...a, season: 1 }));
    const fresher = { ...a, season: 4 };
    expect(switchSlot(3, fresher)).toBe(true);
    expect(summarize(localStorage.getItem(parkedKey(1)))?.season).toBe(4);
  });

  it('keeps an unreadable save byte for byte when it is parked', () => {
    localStorage.setItem(SAVE_KEY, '{not json');
    expect(switchSlot(2)).toBe(true);
    expect(localStorage.getItem(parkedKey(1))).toBe('{not json');
    expect(readSlots()[0].damaged).toBe(true);
  });
});

describe('a store that refuses the write', () => {
  const refuse = (pred: (k: string) => boolean) => {
    const real = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) {
      if (pred(k)) throw new DOMException('quota', 'QuotaExceededError');
      return real.call(this, k, v);
    });
  };

  it('never loses the outgoing career when the park is refused', () => {
    const a = JSON.stringify(career('Everton'));
    const b = JSON.stringify(leanCareer(career('Lincoln City')));
    localStorage.setItem(SAVE_KEY, a);
    localStorage.setItem(parkedKey(2), b);
    refuse(k => k === parkedKey(1));
    expect(switchSlot(2)).toBe(false);
    expect(localStorage.getItem(SAVE_KEY)).toBe(a);
    expect(localStorage.getItem(parkedKey(2))).toBe(b);
    expect(activeSlot()).toBe(1);
  });

  it('rolls the park and the index back when SAVE_KEY is refused', () => {
    const a = JSON.stringify(career('Everton'));
    const b = JSON.stringify(leanCareer(career('Lincoln City')));
    localStorage.setItem(SAVE_KEY, a);
    localStorage.setItem(parkedKey(2), b);
    refuse(k => k === SAVE_KEY);
    expect(switchSlot(2)).toBe(false);
    expect(localStorage.getItem(SAVE_KEY)).toBe(a);
    expect(localStorage.getItem(parkedKey(2))).toBe(b);
    expect(localStorage.getItem(parkedKey(1))).toBeNull();
    expect(activeSlot()).toBe(1);
  });
});

describe('deleting and reading', () => {
  it('deletes one slot and leaves the others', () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(career('Everton')));
    localStorage.setItem(parkedKey(3), JSON.stringify(leanCareer(career('Lincoln City'))));
    deleteSlot(3);
    expect(localStorage.getItem(parkedKey(3))).toBeNull();
    expect(localStorage.getItem(SAVE_KEY)).not.toBeNull();
    deleteSlot(1);
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
  });

  it('reads the manager, the era and the trophies without opening the save', () => {
    const c = { ...career('Everton'), eraId: 'era2010', startYear: 2010, season: 3, manager: { name: ' Ada Testfield ', nationality: 'England', background: 'analyst', style: 'possession' }, trophies: [{ name: 'Cup', emoji: '', season: 2 }] };
    localStorage.setItem(parkedKey(2), JSON.stringify(c));
    const s = readSlots()[1].summary!;
    expect(s.managerName).toBe('Ada Testfield');
    expect(s.trophies).toBe(1);
    expect(s.worldSeason).toBe('2012-13');
    expect(s.eraId).toBe('era2010');
    expect(s.eraLabel).toBe('2010-11');
    expect(s.historic).toBe(true);
    expect(slotEraId(2)).toBe('era2010');
    expect(slotEraId(1)).toBeNull();
    expect(slotEraId(3)).toBeNull();
  });

  it('ignores an index that names no slot', () => {
    localStorage.setItem(SLOTS_INDEX_KEY, JSON.stringify({ v: 1, active: 7 }));
    expect(activeSlot()).toBe(1);
    localStorage.setItem(SLOTS_INDEX_KEY, 'garbage');
    expect(activeSlot()).toBe(1);
  });
});
