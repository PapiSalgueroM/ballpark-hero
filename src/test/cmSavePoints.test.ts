/**
 * Round 1513: Club Manager's save points, one storage rule at a time, on the
 * real engine's career. scripts/simCmSavePoints.mjs plays careers through
 * them and measures sizes; scripts/playCmSavePoints.mjs walks the screen.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { compressToUTF16, decompressFromUTF16 } from 'lz-string';
import { SAVE_KEY, startCareer, trimCareer, type CareerState } from '@/lib/clubManager';
import { simToWeek } from '@/lib/clubManagerCalendar';
import { CONTINUE_SAVES } from '@/data/continueSaves';
import { backupKeysOf, offeredBackup, type ListableStorage } from '@/lib/brokenSaveRecovery';
import { PENDING_COPY_KEY, PENDING_RESTORE_KEY, applyPending } from '@/lib/saveKeeper';
import {
  POINTS_CAP, clearSlotPoints, noteSeasonCredited, pointKey, pointsIndexKey, readPointsIndex, seasonPosts,
} from '@/lib/cmSavePointsStore';
import {
  copyPoint, createPoint, defaultPointName, deletePoint, dropStrayCopy, openPoint, pointText, renamePoint, restorePoint, stageCopy,
} from '@/lib/cmSavePoints';

const T0 = new Date('2026-10-19T12:00:00Z');
const at = (n: number) => new Date(T0.getTime() + n * 1000);
const entry = CONTINUE_SAVES.find(e => e.saveKey === SAVE_KEY)!;

/** A Map backed storage that counts writes and can refuse a write by key or by its number. */
function store(seed: Record<string, string> = {}) {
  const m = new Map<string, string>(Object.entries(seed));
  const s = { sets: 0, removes: 0, refuse: (_k: string, _n: number) => false };
  const api: ListableStorage = {
    get length() { return m.size; },
    key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: (k: string, v: string) => {
      if (s.refuse(k, s.sets + 1)) throw new DOMException('full', 'QuotaExceededError');
      s.sets += 1;
      m.set(k, v);
    },
    removeItem: (k: string) => { s.removes += 1; m.delete(k); },
  };
  return { m, s, api };
}
const snapshot = (m: Map<string, string>) => JSON.stringify([...m.entries()].sort());
const stageWith = (api: ListableStorage) => (e: typeof entry, text: string) => stageCopy(e, text, api, T0);

/** Three more weeks played, past any stop for the transfer window. */
function playThree(c: CareerState): CareerState {
  const target = c.week + 3;
  let s = c;
  for (let i = 0; i < 6 && s.week < target; i += 1) s = simToWeek(s, target).state;
  return s;
}

let c0: CareerState;
let c3: CareerState;
beforeAll(() => {
  c0 = startCareer('Everton');
  c3 = playThree(c0);
  expect(c3.week).toBe(c0.week + 3);
});

describe('create', () => {
  it('writes the career exactly as the save writes it, reads it back equal, and never touches the save', () => {
    const save = JSON.stringify(trimCareer(c3));
    const { m, api } = store({ [SAVE_KEY]: save });
    const r = createPoint(1, c3, 'Before the derby', api, T0);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.meta).toMatchObject({ name: 'Before the derby', season: c3.season, week: c3.week + 1, club: c3.clubName, at: T0.getTime() });
    const opened = openPoint(1, r.meta.id, api);
    expect(opened.ok && opened.text).toBe(pointText(c3));
    expect(pointText(c3)).toBe(save);
    expect(decompressFromUTF16(m.get(pointKey(1, r.meta.id))!)).toBe(save);
    expect(m.get(SAVE_KEY)).toBe(save);
    expect([...m.keys()].filter(k => k !== SAVE_KEY).every(k => !k.startsWith('dukb-club-manager'))).toBe(true);
  });

  it('names a blank point "Season N, week W" and cuts a long name to 24', () => {
    const { api } = store();
    const a = createPoint(1, c0, '   ', api, at(1));
    const b = createPoint(1, c0, 'A name that is far too long for the row', api, at(2));
    expect(a.ok && a.meta.name).toBe(defaultPointName(c0));
    expect(a.ok && a.meta.name).toBe(`Season ${c0.season}, week ${c0.week + 1}`);
    expect(b.ok && b.meta.name).toBe('A name that is far too l');
  });

  it('stops at three and drops nothing', () => {
    const { m, s, api } = store();
    for (let i = 0; i < POINTS_CAP; i += 1) expect(createPoint(1, c0, `P${i}`, api, at(i)).ok).toBe(true);
    const before = snapshot(m);
    const sets = s.sets;
    expect(createPoint(1, c3, 'one more', api, at(9))).toEqual({ ok: false, why: 'full' });
    expect(copyPoint(1, readPointsIndex(1, api)!.points[0].id, api, at(10))).toEqual({ ok: false, why: 'full' });
    expect(snapshot(m)).toBe(before);
    expect(s.sets).toBe(sets);
  });
});

describe('copy, rename, delete', () => {
  it('a copy stays the career it was copied from after its source is renamed, deleted and the career plays on', () => {
    const { api } = store();
    const a = createPoint(1, c0, 'Start', api, at(1));
    if (!a.ok) throw new Error('create refused');
    const b = copyPoint(1, a.meta.id, api, at(2));
    if (!b.ok) throw new Error('copy refused');
    expect(b.meta.id).not.toBe(a.meta.id);
    expect(b.meta.name).toBe('Copy of Start');
    expect(renamePoint(1, a.meta.id, 'Renamed', api)).toBe(true);
    expect(deletePoint(1, a.meta.id, api)).toBe(true);
    expect(createPoint(1, c3, 'Later', api, at(3)).ok).toBe(true);
    const opened = openPoint(1, b.meta.id, api);
    expect(opened.ok && opened.text).toBe(pointText(c0));
    expect(readPointsIndex(1, api)!.points.map(p => p.name)).toEqual(['Copy of Start', 'Later']);
  });

  it('rename and delete touch only their own point', () => {
    const { m, api } = store();
    const ids = ['One', 'Two', 'Three'].map((n, i) => {
      const r = createPoint(1, i === 1 ? c3 : c0, n, api, at(i));
      if (!r.ok) throw new Error('create refused');
      return r.meta.id;
    });
    const bytes = ids.map(id => m.get(pointKey(1, id)));
    expect(renamePoint(1, ids[1], '  Second   try ', api)).toBe(true);
    expect(readPointsIndex(1, api)!.points.map(p => p.name)).toEqual(['One', 'Second try', 'Three']);
    expect(ids.map(id => m.get(pointKey(1, id)))).toEqual(bytes);
    expect(deletePoint(1, ids[0], api)).toBe(true);
    expect(m.has(pointKey(1, ids[0]))).toBe(false);
    expect([m.get(pointKey(1, ids[1])), m.get(pointKey(1, ids[2]))]).toEqual([bytes[1], bytes[2]]);
    expect(readPointsIndex(1, api)!.points.map(p => p.id)).toEqual([ids[1], ids[2]]);
    const opened = openPoint(1, ids[1], api);
    expect(opened.ok && opened.text).toBe(pointText(c3));
  });
});

describe('a store that refuses', () => {
  it('refusing the second write (the index) leaves the career, the index and every point as they were', () => {
    const save = JSON.stringify(trimCareer(c3));
    const { m, s, api } = store({ [SAVE_KEY]: save });
    expect(createPoint(1, c0, 'Kept', api, at(1)).ok).toBe(true);
    const before = snapshot(m);
    const from = s.sets;
    s.refuse = (_k, n) => n === from + 2;
    expect(createPoint(1, c3, 'Refused', api, at(2))).toEqual({ ok: false, why: 'no-room' });
    expect(snapshot(m)).toBe(before);
  });

  it('refusing the point itself (out of room) writes nothing and keeps the rest', () => {
    const { m, s, api } = store({ [SAVE_KEY]: 'the career' });
    expect(createPoint(1, c0, 'Kept', api, at(1)).ok).toBe(true);
    const before = snapshot(m);
    s.refuse = k => k.startsWith('dukb-cm-point-');
    expect(createPoint(1, c3, 'Refused', api, at(2))).toEqual({ ok: false, why: 'no-room' });
    const id = readPointsIndex(1, api)!.points[0].id;
    expect(copyPoint(1, id, api, at(3))).toEqual({ ok: false, why: 'no-room' });
    expect(snapshot(m)).toBe(before);
  });

  it('a restore the browser cannot stage changes nothing, the season mark included', () => {
    const save = JSON.stringify(trimCareer(c3));
    const { m, s, api } = store({ [SAVE_KEY]: save });
    const r = createPoint(1, c0, 'Start', api, at(1));
    if (!r.ok) throw new Error('create refused');
    const before = snapshot(m);
    s.refuse = k => k === PENDING_COPY_KEY;
    expect(restorePoint(1, r.meta.id, c3, api, stageWith(api))).toEqual({ ok: false, why: 'no-room' });
    expect(snapshot(m)).toBe(before);
    expect(seasonPosts(1, c0.season, api)).toBe(true);
  });
});

describe('restore', () => {
  it('after three matches puts the point back byte for byte through the staged put back, the career he had kept aside and offered', () => {
    const later = JSON.stringify(trimCareer(c3));
    const { m, api } = store();
    const r = createPoint(1, c0, 'Start', api, at(1));
    if (!r.ok) throw new Error('create refused');
    m.set(SAVE_KEY, later);
    expect(restorePoint(1, r.meta.id, c3, api, stageWith(api))).toEqual({ ok: true });
    /* Staged only: the save is not touched until the next load. */
    expect(m.get(SAVE_KEY)).toBe(later);
    expect(m.has(PENDING_RESTORE_KEY) && m.has(PENDING_COPY_KEY)).toBe(true);
    expect(applyPending(api, T0)).toEqual({ path: '/club-manager', ok: true, kept: true, copy: true });
    expect(m.get(SAVE_KEY)).toBe(pointText(c0));
    expect(JSON.parse(m.get(SAVE_KEY)!).week).toBe(c0.week);
    expect(m.has(PENDING_RESTORE_KEY) || m.has(PENDING_COPY_KEY)).toBe(false);
    const aside = backupKeysOf(entry, api);
    expect(aside.map(k => m.get(k))).toEqual([later]);
    expect(offeredBackup(entry, api)).toBe(aside[0]);
    /* The point is still there, unchanged, and its season no longer posts. */
    const again = openPoint(1, r.meta.id, api);
    expect(again.ok && again.text).toBe(pointText(c0));
    expect(seasonPosts(1, c0.season, api)).toBe(false);
  });

  it('refuses a damaged point and changes nothing', () => {
    const save = JSON.stringify(trimCareer(c3));
    const { m, api } = store({ [SAVE_KEY]: save });
    const r = createPoint(1, c0, 'Start', api, at(1));
    if (!r.ok) throw new Error('create refused');
    const key = pointKey(1, r.meta.id);
    const good = m.get(key)!;
    const staged: string[] = [];
    const spy = (_e: typeof entry, t: string) => { staged.push(t); return { ok: true as const }; };
    /* A character changed in the middle, the tail cut off, and a point that opens to something that is not a career. */
    for (const bad of [good.slice(0, 500) + String.fromCharCode(good.charCodeAt(500) ^ 1) + good.slice(501), good.slice(0, good.length >> 1), compressToUTF16('{"hello":1}')]) {
      m.set(key, bad);
      const before = snapshot(m);
      expect(restorePoint(1, r.meta.id, c3, api, spy)).toEqual({ ok: false, why: 'damaged' });
      expect(snapshot(m)).toBe(before);
    }
    expect(staged).toEqual([]);
    expect(m.get(SAVE_KEY)).toBe(save);
  });

  it('refuses a point from another era', () => {
    const { api } = store();
    const r = createPoint(1, c0, 'Start', api, at(1));
    if (!r.ok) throw new Error('create refused');
    expect(restorePoint(1, r.meta.id, { ...c3, eraId: 'not-this-era' }, api, () => ({ ok: true }))).toEqual({ ok: false, why: 'damaged' });
  });

  /* Review of 2026-10-19 (run minor 4): a cut journal, or one an older tab forgot, left the plain copy until the next restore. */
  it('a staged copy no journal points at goes when the points screen opens; a staged one stays; a load with nothing staged writes nothing', () => {
    const copy = pointText(c3);
    const cut = store({ [SAVE_KEY]: 'held', [PENDING_RESTORE_KEY]: '{"v":1,"path":"/club-manager","backupKey":"dukb-save-pen', [PENDING_COPY_KEY]: copy });
    expect(applyPending(cut.api, T0)).toBeNull();
    expect([...cut.m.keys()].sort()).toEqual([PENDING_COPY_KEY, SAVE_KEY].sort());
    dropStrayCopy(cut.api);
    expect([...cut.m.keys()]).toEqual([SAVE_KEY]);
    const staged = store({ [SAVE_KEY]: 'held' });
    expect(stageCopy(entry, copy, staged.api, T0).ok).toBe(true);
    const before = [...staged.m.entries()].sort().join('|');
    dropStrayCopy(staged.api);
    expect([...staged.m.entries()].sort().join('|')).toBe(before);
    const clean = store({ [SAVE_KEY]: 'held' });
    expect(applyPending(clean.api, T0)).toBeNull();
    expect(clean.s.sets + clean.s.removes).toBe(0);
    expect(clean.m.get(SAVE_KEY)).toBe('held');
  });
});

describe('the season record and the slot', () => {
  it('a career with no points has no record and nothing is written for it', () => {
    const { m, s, api } = store({ [SAVE_KEY]: 'x' });
    expect(seasonPosts(1, 1, api)).toBe(true);
    noteSeasonCredited(1, 1, api);
    clearSlotPoints(1, api);
    expect([...m.keys()]).toEqual([SAVE_KEY]);
    expect(s.sets + s.removes).toBe(0);
  });

  it('a credited season posts once; a later season still posts', () => {
    const { api } = store();
    expect(createPoint(1, c0, 'Start', api, at(1)).ok).toBe(true);
    noteSeasonCredited(1, 1, api);
    noteSeasonCredited(1, 1, api);
    expect(readPointsIndex(1, api)!.credited).toEqual([1]);
    expect(seasonPosts(1, 1, api)).toBe(false);
    expect(seasonPosts(1, 2, api)).toBe(true);
    expect(seasonPosts(2, 1, api)).toBe(true);
  });

  it('clearing a slot takes its points and record and leaves the other slots alone', () => {
    const { m, api } = store();
    expect(createPoint(1, c0, 'One', api, at(1)).ok).toBe(true);
    expect(createPoint(1, c3, 'Two', api, at(2)).ok).toBe(true);
    expect(createPoint(2, c0, 'Other slot', api, at(3)).ok).toBe(true);
    const slot2 = [...m.keys()].filter(k => k.startsWith('dukb-cm-point-2-') || k === pointsIndexKey(2)).map(k => [k, m.get(k)]);
    clearSlotPoints(1, api);
    expect([...m.keys()].some(k => k.startsWith('dukb-cm-point-1-') || k === pointsIndexKey(1))).toBe(false);
    expect(slot2.every(([k, v]) => m.get(k as string) === v)).toBe(true);
    expect(readPointsIndex(1, api)).toBeNull();
  });
});
