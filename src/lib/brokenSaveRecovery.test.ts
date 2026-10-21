/* Round 1515: a Club Manager copy kept aside is marked with the slot it came from, and the kept aside card offers
   it only in that slot. An unmarked copy (made before the round) is offered in every slot, and every other game's
   copies and offers read and write exactly what they did. */
import { beforeEach, describe, expect, it } from 'vitest';
import { CONTINUE_SAVES, type ContinueSave } from '@/data/continueSaves';
import {
  BROKEN_SAVE_MARK, SET_ASIDE_SLOT_KEY, copyAside, offeredBackup, setAsideSave, slotMarks, type ListableStorage,
} from '@/lib/brokenSaveRecovery';
import { SLOT_COUNT, SLOTS_INDEX_KEY, activeSlot } from '@/lib/clubManagerSlots';
import { SAVE_KEY } from '@/lib/clubManager';

const CM = CONTINUE_SAVES.find(e => e.path === '/club-manager') as ContinueSave;
const OTHER = CONTINUE_SAVES.find(e => e.path === '/soccer-career') as ContinueSave;

/** A plain map with the Storage calls the recovery code makes, and a log of every key it touched. */
function memStore(): ListableStorage & { map: Map<string, string>; log: string[]; refuse: Set<string> } {
  const map = new Map<string, string>();
  const log: string[] = [];
  const refuse = new Set<string>();
  return {
    map, log, refuse,
    get length() { return map.size; },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => { log.push(`get ${k}`); return map.has(k) ? (map.get(k) as string) : null; },
    setItem: (k: string, v: string) => { log.push(`set ${k}`); if (refuse.has(k)) throw new Error('full'); map.set(k, String(v)); },
    removeItem: (k: string) => { log.push(`remove ${k}`); map.delete(k); },
  };
}
const at = (s: number) => new Date(Date.UTC(2026, 9, 19, 10, 0, s));
const inSlot = (st: ReturnType<typeof memStore>, n: number) => st.map.set(SLOTS_INDEX_KEY, JSON.stringify({ active: n }));
const marks = (st: ReturnType<typeof memStore>) => JSON.parse(st.map.get(SET_ASIDE_SLOT_KEY) ?? '{}');

describe('Round 1515: the kept aside copy carries its slot', () => {
  beforeEach(() => localStorage.clear());

  it('names the slot index of Club Manager only', () => {
    expect(CM.saveKey).toBe(SAVE_KEY);
    expect(CM.slots).toBe(SLOTS_INDEX_KEY);
    expect(CONTINUE_SAVES.filter(e => e.slots).map(e => e.path)).toEqual(['/club-manager']);
  });

  it('reads the slot exactly as activeSlot() does for every index that parses, and slot 0 (no marking) for one that does not', () => {
    const shapes: (string | null)[] = [null, 'null', '[]', '{}', '"2"', '{"active":"2"}', '{"active":1.5}', '{"active":0}',
      '{"active":-1}', '{"active":null}', ...Array.from({ length: SLOT_COUNT + 1 }, (_, i) => JSON.stringify({ active: i + 1 }))];
    for (const raw of shapes) {
      localStorage.clear();
      if (raw !== null) localStorage.setItem(SLOTS_INDEX_KEY, raw);
      expect([raw, slotMarks(CM, localStorage)[0]]).toEqual([raw, activeSlot()]);
    }
    for (const raw of ['', 'junk', '{"active":']) {
      localStorage.clear();
      localStorage.setItem(SLOTS_INDEX_KEY, raw);
      expect([raw, slotMarks(CM, localStorage)]).toEqual([raw, [0, {}]]);
    }
  });

  it('marks that do not parse, or a marks key holding null, pass nothing over', () => {
    const st = memStore();
    st.map.set(`${SAVE_KEY}${BROKEN_SAVE_MARK}2026-10-02T09-00-00`, '{"career":"kept"}');
    inSlot(st, 2);
    for (const bad of ['junk', 'null', '7']) {
      st.map.set(SET_ASIDE_SLOT_KEY, bad);
      expect([bad, offeredBackup(CM, st)]).toEqual([bad, `${SAVE_KEY}${BROKEN_SAVE_MARK}2026-10-02T09-00-00`]);
    }
  });

  it('writes the mark beside a Club Manager copy, and drops the marks of copies that are gone', () => {
    const st = memStore();
    st.map.set(SAVE_KEY, '{"career":"one"}');
    inSlot(st, 2);
    const a = copyAside(CM, st, at(1));
    expect(a.ok && a.backupKey).toBe(`${SAVE_KEY}${BROKEN_SAVE_MARK}2026-10-19T10-00-01`);
    expect(marks(st)).toEqual({ [a.ok ? a.backupKey as string : '']: 2 });
    st.map.delete(a.ok ? a.backupKey as string : '');
    inSlot(st, 3);
    const b = copyAside(CM, st, at(2));
    expect(marks(st)).toEqual({ [b.ok ? b.backupKey as string : '']: 3 });
    /* No index at all is slot 1, as activeSlot() says. */
    st.map.delete(SLOTS_INDEX_KEY);
    const c = copyAside(CM, st, at(3));
    expect(marks(st)[c.ok ? c.backupKey as string : '']).toBe(1);
  });

  it('offers a copy only in its own slot, and an unmarked old copy in every slot', () => {
    const st = memStore();
    /* An old copy, made before the round: no mark. */
    st.map.set(`${SAVE_KEY}${BROKEN_SAVE_MARK}2026-10-01T09-00-00`, '{"career":"old"}');
    st.map.set(SAVE_KEY, '{"career":"slot one"}');
    inSlot(st, 1);
    const kept = copyAside(CM, st, at(5));
    const key = kept.ok ? kept.backupKey as string : '';
    st.map.set(SAVE_KEY, '{"career":"slot one, put back"}');
    expect(offeredBackup(CM, st)).toBe(key);
    /* Slot 2, its own career at the key: slot 1's copy is not offered, the unmarked one is. */
    inSlot(st, 2);
    st.map.set(SAVE_KEY, '{"career":"slot two"}');
    expect(offeredBackup(CM, st)).toBe(`${SAVE_KEY}${BROKEN_SAVE_MARK}2026-10-01T09-00-00`);
    /* An empty slot 2 is the same. */
    st.map.delete(SAVE_KEY);
    expect(offeredBackup(CM, st)).toBe(`${SAVE_KEY}${BROKEN_SAVE_MARK}2026-10-01T09-00-00`);
    /* Back in slot 1: the copy is there again. */
    inSlot(st, 1);
    st.map.set(SAVE_KEY, '{"career":"slot one, put back"}');
    expect(offeredBackup(CM, st)).toBe(key);
    /* Slot 2 with no unmarked copy left: nothing of slot 1's. */
    st.map.delete(`${SAVE_KEY}${BROKEN_SAVE_MARK}2026-10-01T09-00-00`);
    inSlot(st, 2);
    expect(offeredBackup(CM, st)).toBe(null);
  });

  it('a fresh start marks the copy too, and a refused mark leaves the copy standing, unmarked', () => {
    const st = memStore();
    st.map.set(SAVE_KEY, '{"career":"two"}');
    inSlot(st, 2);
    const moved = setAsideSave(CM, st, at(7));
    expect(moved.ok && marks(st)[moved.backupKey as string]).toBe(2);
    st.map.set(SAVE_KEY, '{"career":"three"}');
    st.refuse.add(SET_ASIDE_SLOT_KEY);
    const c = copyAside(CM, st, at(8));
    expect(c.ok).toBe(true);
    const k = c.ok ? c.backupKey as string : '';
    expect(st.map.get(k)).toBe('{"career":"three"}');
    expect(marks(st)[k]).toBeUndefined();
    /* Unmarked, so slot 1 is offered it. */
    inSlot(st, 1);
    st.map.delete(SAVE_KEY);
    expect(offeredBackup(CM, st)).toBe(k);
  });

  it('every other game reads and writes exactly what it did: no mark, no slot index', () => {
    const st = memStore();
    st.map.set(OTHER.saveKey, '{"season":3}');
    inSlot(st, 2);
    const c = copyAside(OTHER, st, at(9));
    const key = c.ok ? c.backupKey as string : '';
    expect(st.log).toEqual([`get ${OTHER.saveKey}`, `get ${key}`, `set ${key}`, `get ${key}`]);
    expect([...st.map.keys()].sort()).toEqual([OTHER.saveKey, SLOTS_INDEX_KEY, key].sort());
    st.log.length = 0;
    st.map.set(OTHER.saveKey, '{"season":4}');
    expect(offeredBackup(OTHER, st)).toBe(key);
    expect(st.log.filter(l => l.includes(SET_ASIDE_SLOT_KEY) || l.includes(SLOTS_INDEX_KEY))).toEqual([]);
    expect(slotMarks(OTHER, st, key)).toEqual([0, {}]);
    expect(st.log.filter(l => l.includes(SET_ASIDE_SLOT_KEY) || l.includes(SLOTS_INDEX_KEY))).toEqual([]);
  });
});
