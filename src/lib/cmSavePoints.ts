/**
 * Round 1513: Club Manager's save points. A player report forwarded on
 * 2026-10-18 asked for a point he can make at any time in one career, go back
 * to after a mistake, copy, rename and delete. The three manager slots (Round
 * 928) and the broken save card (Round 958) are different features and stay
 * as they are.
 *
 * WHAT A POINT HOLDS. The career exactly as saveCareer writes it (trimCareer,
 * so the world, the calendar and the random state ride along with every other
 * key), compressed with lz-string. Not leanCareer: that one drops head to head
 * meetings past six per opponent, and a point must put back the very career
 * it was made from. Keys and the index are in src/lib/cmSavePointsStore.ts.
 *
 * THE RULES IT KEEPS.
 *   - Saved means read back. A point is written, read back, opened, parsed and
 *     compared equal to the career's own text before the screen says saved; a
 *     refusal at any step takes out what this wrote, and the career and the
 *     other points are untouched.
 *   - At most POINTS_CAP a slot, and a point is never dropped to make room.
 *   - A restore never swaps under a live page. The point is opened and checked
 *     (it opens, it parses, it reads as a career of this era, its length and
 *     sum match what was saved) and only then staged through Round 1219's put
 *     back (stageCopy below, in the save keeper's journal): the page reloads, and before
 *     React mounts the career he had is copied aside, where the broken save
 *     card offers it back, and the point's career takes its place.
 *   - The season a restore lands in posts no score again (see the store).
 */
import { compressToUTF16, decompressFromUTF16 } from 'lz-string';
import { SAVE_KEY, trimCareer, type CareerState } from '@/lib/clubManager';
import { summarize } from '@/lib/clubManagerSlots';
import { CONTINUE_SAVES, type ContinueSave } from '@/data/continueSaves';
import { browserStorage, type ListableStorage } from '@/lib/brokenSaveRecovery';
import { PENDING_COPY_KEY, PENDING_RESTORE_KEY, sumOf, type KeeperRefusal } from '@/lib/saveKeeper';
import { getStorageTrouble, settlePendingSaves } from '@/lib/safeStorage';
import {
  POINTS_CAP, POINT_NAME_MAX, pointKey, pointsIndexKey, readPointsIndex, writePointsIndex, type PointMeta, type PointsIndex,
} from '@/lib/cmSavePointsStore';

export type PointRefusal = 'full' | 'no-room' | 'blocked' | 'gone' | 'damaged';
export type PointResult = { ok: true; meta: PointMeta } | { ok: false; why: PointRefusal };

/** The text a point holds: what saveCareer writes for this career. */
export const pointText = (career: CareerState): string => JSON.stringify(trimCareer(career));
/** The week the hub shows, 1 based. */
export const pointWeek = (c: CareerState): number => Math.max(1, Math.min(c.week + 1, c.calendar.length));
export const defaultPointName = (c: CareerState): string => `Season ${c.season}, week ${pointWeek(c)}`;

/** One line, trimmed, at most POINT_NAME_MAX characters; the fallback when that leaves nothing. */
export function cleanPointName(name: string, fallback: string): string {
  const t = name.replace(/\s+/g, ' ').trim().slice(0, POINT_NAME_MAX).trim();
  return t || fallback.slice(0, POINT_NAME_MAX);
}

const indexOf = (slot: number, storage: ListableStorage): PointsIndex =>
  readPointsIndex(slot, storage) ?? { v: 1, points: [], credited: [], blocked: [] };

function newId(idx: PointsIndex, now: Date): string {
  const base = now.getTime().toString(36);
  let id = base;
  for (let n = 2; idx.points.some(p => p.id === id); n += 1) id = `${base}${n.toString(36)}`;
  return id;
}

/** Writes one point and the index that lists it, each read back. False, with neither left behind, on any refusal. */
function writePoint(slot: number, idx: PointsIndex, meta: PointMeta, packed: string, text: string, storage: ListableStorage): boolean {
  const key = pointKey(slot, meta.id);
  let before: string | null;
  try {
    before = storage.getItem(pointsIndexKey(slot));
    storage.setItem(key, packed);
    const back = storage.getItem(key);
    if (back !== packed || decompressFromUTF16(back) !== text) throw new Error('point did not read back');
    JSON.parse(text);
  } catch {
    try { storage.removeItem(key); } catch { /* nothing more to do */ }
    return false;
  }
  if (writePointsIndex(slot, { ...idx, points: [...idx.points, meta] }, storage)) return true;
  /* The index refused: the point goes, and the index is put back as it was. */
  try {
    storage.removeItem(key);
    if (before === null) storage.removeItem(pointsIndexKey(slot));
    else if (storage.getItem(pointsIndexKey(slot)) !== before) storage.setItem(pointsIndexKey(slot), before);
  } catch { /* a refused write leaves the old index in place */ }
  return false;
}

/** Make a point of the career in memory. Never throws. */
export function createPoint(slot: number, career: CareerState, name: string, storage: ListableStorage | null = browserStorage(), now: Date = new Date()): PointResult {
  if (!storage) return { ok: false, why: 'blocked' };
  const idx = indexOf(slot, storage);
  if (idx.points.length >= POINTS_CAP) return { ok: false, why: 'full' };
  let text: string;
  let packed: string;
  try {
    text = pointText(career);
    packed = compressToUTF16(text);
  } catch {
    return { ok: false, why: 'damaged' };
  }
  const meta: PointMeta = {
    id: newId(idx, now), name: cleanPointName(name, defaultPointName(career)), season: career.season, week: pointWeek(career),
    club: career.clubName, at: now.getTime(), len: text.length, sum: sumOf(text), size: packed.length,
  };
  return writePoint(slot, idx, meta, packed, text, storage) ? { ok: true, meta } : { ok: false, why: 'no-room' };
}

/** A point opened and checked: it is there, it opens, its length and sum match, it reads as a career (of this era, when one is given). */
export function openPoint(slot: number, id: string, storage: ListableStorage | null = browserStorage(), eraId?: string | null):
  { ok: true; meta: PointMeta; text: string; packed: string } | { ok: false; why: 'gone' | 'damaged' | 'blocked' } {
  if (!storage) return { ok: false, why: 'blocked' };
  const meta = readPointsIndex(slot, storage)?.points.find(p => p.id === id);
  if (!meta) return { ok: false, why: 'gone' };
  let packed: string | null;
  try { packed = storage.getItem(pointKey(slot, id)); } catch { return { ok: false, why: 'blocked' }; }
  if (packed === null) return { ok: false, why: 'gone' };
  let text: string | null;
  try { text = decompressFromUTF16(packed); } catch { return { ok: false, why: 'damaged' }; }
  if (typeof text !== 'string' || text.length !== meta.len || sumOf(text) !== meta.sum) return { ok: false, why: 'damaged' };
  const s = summarize(text);
  if (!s || (eraId !== undefined && s.eraId !== (eraId ?? null))) return { ok: false, why: 'damaged' };
  return { ok: true, meta, text, packed };
}

/** A second point holding the same career, under its own key. Never throws. */
export function copyPoint(slot: number, id: string, storage: ListableStorage | null = browserStorage(), now: Date = new Date()): PointResult {
  if (!storage) return { ok: false, why: 'blocked' };
  const idx = indexOf(slot, storage);
  if (idx.points.length >= POINTS_CAP) return { ok: false, why: 'full' };
  const src = openPoint(slot, id, storage);
  if (!src.ok) return src;
  const meta: PointMeta = { ...src.meta, id: newId(idx, now), name: cleanPointName(`Copy of ${src.meta.name}`, src.meta.name), at: now.getTime() };
  return writePoint(slot, idx, meta, src.packed, src.text, storage) ? { ok: true, meta } : { ok: false, why: 'no-room' };
}

/** A new name for one point; nothing else changes. Never throws. */
export function renamePoint(slot: number, id: string, name: string, storage: ListableStorage | null = browserStorage()): boolean {
  if (!storage) return false;
  const idx = readPointsIndex(slot, storage);
  const meta = idx?.points.find(p => p.id === id);
  if (!idx || !meta) return false;
  const named = cleanPointName(name, meta.name);
  return writePointsIndex(slot, { ...idx, points: idx.points.map(p => (p.id === id ? { ...p, name: named } : p)) }, storage);
}

/** One point gone for good (the screen asks first). The index goes first, so a point is never listed without its key. */
export function deletePoint(slot: number, id: string, storage: ListableStorage | null = browserStorage()): boolean {
  if (!storage) return false;
  const idx = readPointsIndex(slot, storage);
  if (!idx || !idx.points.some(p => p.id === id)) return false;
  if (!writePointsIndex(slot, { ...idx, points: idx.points.filter(p => p.id !== id) }, storage)) return false;
  try { storage.removeItem(pointKey(slot, id)); } catch { /* an orphan key goes with the slot's next clear */ }
  return true;
}

/**
 * Stages a put back of a point's career for the next load, in the save
 * keeper's own journal (src/lib/saveKeeper.ts, PENDING_COPY_KEY): the journal
 * is written and read back, then the career's text and read back, and the
 * next load applies it exactly as it applies a backup: the save he has is
 * copied aside first, and the game's key is never emptied. The journal goes
 * first so a tab closed between the two writes leaves a journal whose copy is
 * missing, which the next load forgets ('gone'), and never a large copy
 * nothing points at. A refused step removes what this wrote. Never throws.
 */
export function stageCopy(entry: ContinueSave, text: string, storage: ListableStorage | null, now: Date = new Date()): { ok: true } | { ok: false; why: KeeperRefusal } {
  if (!storage) return { ok: false, why: 'blocked' };
  const journal = JSON.stringify({ v: 1, path: entry.path, backupKey: PENDING_COPY_KEY, at: now.getTime(), len: text.length, sum: sumOf(text) });
  try {
    storage.setItem(PENDING_RESTORE_KEY, journal);
    if (storage.getItem(PENDING_RESTORE_KEY) !== journal) throw new Error('journal did not read back');
    storage.setItem(PENDING_COPY_KEY, text);
    if (storage.getItem(PENDING_COPY_KEY) !== text) throw new Error('copy did not read back');
  } catch {
    for (const k of [PENDING_RESTORE_KEY, PENDING_COPY_KEY]) {
      try { storage.removeItem(k); } catch { /* the next load forgets a journal it cannot apply */ }
    }
    return { ok: false, why: 'no-room' };
  }
  return { ok: true };
}

/** restoreNow (src/lib/saveKeeper.ts) for a point: a save the page still holds is retried first. The caller then calls reopenGame. */
function restoreCopyNow(entry: ContinueSave, text: string): { ok: true } | { ok: false; why: KeeperRefusal } {
  if (getStorageTrouble() === 'blocked') return { ok: false, why: 'blocked' };
  if (!settlePendingSaves()) return { ok: false, why: 'no-room' };
  return stageCopy(entry, text, browserStorage());
}

type Stage = (entry: ContinueSave, text: string) => { ok: true } | { ok: false; why: KeeperRefusal };

/**
 * Restore a point: checked first, then the season it lands in is marked as
 * not posting, then the put back is staged. The caller reloads the page
 * (reopenGame) on ok. A refusal changes nothing, the mark included. Never throws.
 */
export function restorePoint(slot: number, id: string, career: CareerState, storage: ListableStorage | null = browserStorage(), stage: Stage = restoreCopyNow):
  { ok: true } | { ok: false; why: PointRefusal } {
  if (!storage) return { ok: false, why: 'blocked' };
  const entry = CONTINUE_SAVES.find(e => e.saveKey === SAVE_KEY);
  if (!entry) return { ok: false, why: 'blocked' };
  const opened = openPoint(slot, id, storage, typeof career.eraId === 'string' ? career.eraId : null);
  if (!opened.ok) return opened;
  const idx = indexOf(slot, storage);
  const marked = idx.blocked.includes(opened.meta.season);
  if (!marked && !writePointsIndex(slot, { ...idx, blocked: [...idx.blocked, opened.meta.season] }, storage)) return { ok: false, why: 'no-room' };
  const staged = stage(entry, opened.text);
  if (staged.ok) return { ok: true };
  if (!marked) writePointsIndex(slot, idx, storage);
  return { ok: false, why: 'why' in staged && staged.why === 'blocked' ? 'blocked' : 'no-room' };
}
