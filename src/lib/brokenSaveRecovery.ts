import { CONTINUE_SAVES, type ContinueSave } from '@/data/continueSaves';

/**
 * Round 958: a broken save never traps a game.
 *
 * WHY THIS EXISTS. A long game whose save throws while it draws lands on
 * RouteErrorBoundary, and before this round the only button there reloaded the
 * page, which read the same bytes and broke the same way. The player's one way
 * out was clearing site data by hand, which also wipes every other game.
 *
 * So the boundary offers a fresh start on any route that keeps a save
 * (src/data/continueSaves.ts is the list). A fresh start NEVER deletes the old
 * save. It copies the raw text, byte for byte, to a dated backup key beside
 * the original, reads the copy back, and only when the copy matches does it
 * remove the original. If the copy cannot be written (storage full, storage
 * blocked) nothing is removed and the caller is told so.
 *
 * The backup key is the game's own key plus BROKEN_SAVE_MARK plus a stamp, so
 * it sorts next to the save it came from and no game ever reads it back.
 *
 * Kept out of the boundary on purpose: the boundary is the last thing standing
 * when something has already failed, and scripts/simErrorBoundary.mjs holds its
 * class body free of storage and clock reads. Everything that touches either
 * lives here and never throws.
 */

/** The text between the game's own key and the stamp in a backup key. */
export const BROKEN_SAVE_MARK = '.broken-';

export type SaveStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** The browser's storage, or null where reading it throws (privacy modes). */
export function browserStorage(): SaveStorage | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** One route form: no trailing slash, no query, no hash. */
function routeOf(pathname: string): string {
  const bare = pathname.split(/[?#]/)[0] || '/';
  const trimmed = bare.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

/** The registered long game on this route, or null. */
export function routeSaveEntry(pathname: string): ContinueSave | null {
  const route = routeOf(pathname);
  return CONTINUE_SAVES.find(e => e.path === route) ?? null;
}

/**
 * The registered long game on this route when this browser holds a save for
 * it, else null. A route with no save gets no fresh start button, because
 * starting fresh would change nothing and the button would be a false promise.
 */
export function heldSaveEntry(pathname: string, storage: SaveStorage | null): ContinueSave | null {
  const entry = routeSaveEntry(pathname);
  if (!entry || !storage) return null;
  try {
    return storage.getItem(entry.saveKey) !== null ? entry : null;
  } catch {
    return null;
  }
}

/** heldSaveEntry for the page the browser is on right now. Never throws. */
export function heldSaveHere(): ContinueSave | null {
  try {
    return heldSaveEntry(window.location.pathname, browserStorage());
  } catch {
    return null;
  }
}

/** A full load of the game's own address: with no save there, its start screen. */
export function openGame(path: string): void {
  window.location.assign(path);
}

/** The dated backup key for a save, to the second, in UTC. */
export function brokenSaveKey(saveKey: string, now: Date): string {
  const stamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
  return `${saveKey}${BROKEN_SAVE_MARK}${stamp}`;
}

export type SetAsideResult =
  | { ok: true; backupKey: string | null }
  | { ok: false };

/**
 * Moves a save aside: copy, read the copy back, then remove the original.
 * backupKey is null when there was no save left to move (another tab cleared
 * it), which is still a fresh start. Never throws and never removes the
 * original unless an identical copy is already stored.
 */
export function setAsideSave(entry: ContinueSave, storage: SaveStorage | null, now: Date = new Date()): SetAsideResult {
  if (!storage) return { ok: false };
  let raw: string | null;
  try {
    raw = storage.getItem(entry.saveKey);
  } catch {
    return { ok: false };
  }
  if (raw === null) return { ok: true, backupKey: null };

  /* Two clicks in the same second must not overwrite the first backup. */
  const base = brokenSaveKey(entry.saveKey, now);
  let backupKey = base;
  try {
    for (let n = 2; storage.getItem(backupKey) !== null; n += 1) backupKey = `${base}-${n}`;
  } catch {
    return { ok: false };
  }

  try {
    storage.setItem(backupKey, raw);
    if (storage.getItem(backupKey) !== raw) throw new Error('backup did not read back');
  } catch {
    try { storage.removeItem(backupKey); } catch { /* nothing more to do */ }
    return { ok: false };
  }

  try {
    storage.removeItem(entry.saveKey);
  } catch {
    return { ok: false };
  }
  return { ok: true, backupKey };
}
