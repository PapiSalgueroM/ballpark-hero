/**
 * Round 1513: the small half of Club Manager's save points, the half the page
 * needs on every draw. The points themselves (lz-string, create, restore) are
 * in src/lib/cmSavePoints.ts, which loads with the tile.
 *
 * One index per manager slot and one key per point, named after the slot. No
 * key here starts with 'dukb-club-manager': two harnesses find the save by
 * that prefix, and the broken save card lists backups by it.
 *
 * The index also carries the leaderboard record, OUTSIDE the rewind payload:
 * `credited` is every season that has posted its score since the slot's first
 * point, `blocked` every season a restore landed in. A season in either list
 * posts no score again, so going back to replay a lost match cannot post that
 * season twice, or post a better one. A career that never makes a point has no
 * index, and nothing here writes one for it.
 */
import { browserStorage, type ListableStorage } from '@/lib/brokenSaveRecovery';

export const POINTS_CAP = 3;
export const POINT_NAME_MAX = 24;
export const pointsIndexKey = (slot: number): string => `dukb-cm-points-${slot}`;
export const pointKeyPrefix = (slot: number): string => `dukb-cm-point-${slot}-`;
export const pointKey = (slot: number, id: string): string => `${pointKeyPrefix(slot)}${id}`;

export interface PointMeta {
  id: string;
  name: string;
  season: number;
  /** The week the hub shows, 1 based. */
  week: number;
  club: string;
  /** When it was made, ms since 1970. */
  at: number;
  /** The plain career text's length and sum (sumOf in saveKeeper), so a damaged point is caught. */
  len: number;
  sum: number;
  /** Characters the stored point takes. */
  size: number;
}

export interface PointsIndex { v: 1; points: PointMeta[]; credited: number[]; blocked: number[] }

const emptyIndex = (): PointsIndex => ({ v: 1, points: [], credited: [], blocked: [] });
const whole = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0;
const seasons = (a: unknown): number[] => (Array.isArray(a) ? a.filter(whole) : []);

function readMeta(o: unknown): PointMeta | null {
  if (!o || typeof o !== 'object') return null;
  const m = o as Record<string, unknown>;
  if (typeof m.id !== 'string' || !/^[a-z0-9]{1,24}$/.test(m.id) || typeof m.name !== 'string' || typeof m.club !== 'string') return null;
  if (!whole(m.season) || !whole(m.week) || !whole(m.at) || !whole(m.len) || !whole(m.sum) || !whole(m.size)) return null;
  return { id: m.id, name: m.name.slice(0, POINT_NAME_MAX), season: m.season, week: m.week, club: m.club, at: m.at, len: m.len, sum: m.sum, size: m.size };
}

/** The slot's index as stored, or null when there is none. Unreadable reads as empty. Never throws. */
export function readPointsIndex(slot: number, storage: ListableStorage | null = browserStorage()): PointsIndex | null {
  if (!storage) return null;
  let raw: string | null;
  try { raw = storage.getItem(pointsIndexKey(slot)); } catch { return null; }
  if (raw === null) return null;
  try {
    const o = JSON.parse(raw) as Record<string, unknown> | null;
    if (!o || typeof o !== 'object' || o.v !== 1) return emptyIndex();
    const points = (Array.isArray(o.points) ? o.points : []).map(readMeta).filter((m): m is PointMeta => m !== null);
    return { v: 1, points, credited: seasons(o.credited), blocked: seasons(o.blocked) };
  } catch {
    return emptyIndex();
  }
}

/** Writes the index and reads it back. False when the browser refused it. Never throws. */
export function writePointsIndex(slot: number, index: PointsIndex, storage: ListableStorage | null = browserStorage()): boolean {
  if (!storage) return false;
  const text = JSON.stringify(index);
  try {
    storage.setItem(pointsIndexKey(slot), text);
    return storage.getItem(pointsIndexKey(slot)) === text;
  } catch {
    return false;
  }
}

/** Whether a season of this slot's career may still post a score. */
export function seasonPosts(slot: number, season: number, storage: ListableStorage | null = browserStorage()): boolean {
  const idx = readPointsIndex(slot, storage);
  return !idx || (!idx.credited.includes(season) && !idx.blocked.includes(season));
}

/** A season just posted its score. Written only for a slot that keeps points. Never throws. */
export function noteSeasonCredited(slot: number, season: number, storage: ListableStorage | null = browserStorage()): void {
  const idx = readPointsIndex(slot, storage);
  if (!idx || idx.credited.includes(season)) return;
  writePointsIndex(slot, { ...idx, credited: [...idx.credited, season] }, storage);
}

/**
 * A career deleted, or a new one started in its slot: its points and its
 * record go too. Only keys that are there are removed, so a slot that never
 * had a point sees no storage call but reads. Never throws.
 */
export function clearSlotPoints(slot: number, storage: ListableStorage | null = browserStorage()): void {
  if (!storage) return;
  const prefix = pointKeyPrefix(slot);
  const keys: string[] = [];
  try {
    for (let i = 0; i < storage.length; i += 1) {
      const k = storage.key(i);
      if (k && (k.startsWith(prefix) || k === pointsIndexKey(slot))) keys.push(k);
    }
  } catch {
    /* A store that will not list: the index still goes, so nothing is offered. */
    keys.push(pointsIndexKey(slot));
  }
  for (const k of keys) {
    try { storage.removeItem(k); } catch { /* a removal is not refused for space */ }
  }
}
