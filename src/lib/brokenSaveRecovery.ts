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
 * it sorts next to the save it came from and no game ever reads it by
 * mistake. The way back is src/components/BrokenSaveRestore.tsx: on the
 * game's own page it offers to put the newest backup back, because the crash
 * that led to a fresh start may have been a code bug that a later deploy
 * fixes, and the career must still be there when it does. Since Round 1219
 * the card does that through src/lib/saveKeeper.ts, which stages the put
 * back and applies it as the next page loads; restoreBackup below swaps at
 * once and must never be called with a game in the page's memory.
 *
 * Backups do not pile up for ever: each game keeps its newest BACKUPS_KEPT,
 * which the boundary tells the player before the click, and the card lets the
 * player delete one on purpose (deleteBackup) or wave it off for good
 * (dismissBackup), so it does not come back on every visit.
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
export function browserStorage(): ListableStorage | null {
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
 * How many backups of one game's save this browser keeps. Without a cap they
 * pile up with every fresh start, and a full storage is the one thing that
 * stops a fresh start working at all (setAsideSave then moves nothing, so the
 * player is trapped again). The boundary's line says so before the click.
 */
export const BACKUPS_KEPT = 3;

/**
 * Moves a save aside: copy, read the copy back, then remove the original, and
 * then drop backups of this game past the newest BACKUPS_KEPT (never the one
 * just written). backupKey is null when there was no save left to move
 * (another tab cleared it), which is still a fresh start. Never throws and
 * never removes the original unless an identical copy is already stored.
 */
export function setAsideSave(entry: ContinueSave, storage: SaveStorage | null, now: Date = new Date()): SetAsideResult {
  const moved = moveAside(entry, storage, now);
  if (moved.ok && moved.backupKey) pruneBackups(entry, storage, moved.backupKey);
  return moved;
}

/**
 * Removes this game's backups past the newest BACKUPS_KEPT, keeping `keep`
 * whatever its stamp says (a clock set back must not prune the save that was
 * just moved). Skipped where the storage cannot list its keys. Never throws.
 */
function pruneBackups(entry: ContinueSave, storage: SaveStorage | null, keep: string): void {
  if (!storage || typeof (storage as ListableStorage).key !== 'function') return;
  const others = backupKeysOf(entry, storage as ListableStorage).filter(k => k !== keep);
  for (const k of others.slice(BACKUPS_KEPT - 1)) {
    try { storage.removeItem(k); } catch { /* left in place, harmless */ }
  }
}

/**
 * Round 1219: the copy on its own. The save is copied to a fresh dated key and
 * the copy is read back; the original STAYS where it is, and nothing is
 * pruned (a copy made with no press must never drop a backup the player was
 * told is kept). backupKey is null when there was no save to copy. This is
 * the first half of moveAside, split out for src/lib/saveKeeper.ts, which
 * copies a save before it is replaced or refused instead of moving it: a key
 * that is never emptied is never lost to a crash between two writes.
 */
export function copyAside(entry: ContinueSave, storage: SaveStorage | null, now: Date = new Date()): SetAsideResult {
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
  return { ok: true, backupKey };
}

/** setAsideSave without the pruning, for restoreBackup's swap: copyAside, then the original goes. */
function moveAside(entry: ContinueSave, storage: SaveStorage | null, now: Date): SetAsideResult {
  const copied = copyAside(entry, storage, now);
  if (!storage || !copied.ok || copied.backupKey === null) return copied;
  try {
    storage.removeItem(entry.saveKey);
  } catch {
    /* The copy landed but the original would not go. Take the copy back out,
       so the screen's "left it where it was" stays true and a retry does not
       stack up backups of the same save. */
    try { storage.removeItem(copied.backupKey); } catch { /* a duplicate copy is harmless */ }
    return { ok: false };
  }
  return copied;
}

export type ListableStorage = SaveStorage & Pick<Storage, 'length' | 'key'>;

/** Stamp order, then the -2, -3 suffix of a same second start, as a number. */
function backupOrder(key: string): [string, number] {
  const tail = key.slice(key.indexOf(BROKEN_SAVE_MARK) + BROKEN_SAVE_MARK.length);
  return [tail.slice(0, 19), Number(tail.slice(20)) || 1];
}

/**
 * Every backup of this game's save in this browser, newest first. This is
 * what keeps a fresh start reversible: a crash the save did not cause (a code
 * bug, later fixed) must not cost the player the career for good.
 */
export function backupKeysOf(entry: ContinueSave, storage: ListableStorage | null): string[] {
  if (!storage) return [];
  const prefix = `${entry.saveKey}${BROKEN_SAVE_MARK}`;
  const out: string[] = [];
  try {
    for (let i = 0; i < storage.length; i += 1) {
      const k = storage.key(i);
      if (k && k.startsWith(prefix)) out.push(k);
    }
  } catch {
    return [];
  }
  return out.sort((a, b) => {
    const [sa, na] = backupOrder(a);
    const [sb, nb] = backupOrder(b);
    return sa === sb ? nb - na : sa < sb ? 1 : -1;
  });
}

/**
 * Puts a set-aside save back under the game's own key. A save the player has
 * now (one started since the fresh start) is set aside first, the same way,
 * so the swap never deletes anything. The backup goes only after the restored
 * copy reads back identical. Never throws.
 *
 * Round 1219: NOT for a page with a game in memory. Five long games write
 * their in memory game as the page leaves, and that write lands on top of
 * the save this just put back, whose backup this has already removed
 * (measured by scripts/playSaveKeeper.mjs). The card uses restoreNow in
 * src/lib/saveKeeper.ts instead. Kept for its tests and for that walk's
 * control, which swaps in place on purpose to show the loss.
 */
export function restoreBackup(entry: ContinueSave, backupKey: string, storage: SaveStorage | null, now: Date = new Date()): { ok: boolean } {
  if (!storage || !backupKey.startsWith(`${entry.saveKey}${BROKEN_SAVE_MARK}`)) return { ok: false };
  let raw: string | null;
  try {
    raw = storage.getItem(backupKey);
  } catch {
    return { ok: false };
  }
  if (raw === null) return { ok: false };
  /* Moved without pruning: mid swap this game holds one backup more than it
     will at the end, and pruning here would drop an old backup the swap never
     needed to touch. The cap is applied once the restored backup is gone. */
  const moved = moveAside(entry, storage, now);
  if (!moved.ok) return { ok: false };
  try {
    storage.setItem(entry.saveKey, raw);
    if (storage.getItem(entry.saveKey) !== raw) throw new Error('restore did not read back');
  } catch {
    /* The backup is untouched, and the save the player had is in its own
       backup, so nothing is lost; the game key just stays empty. */
    try { storage.removeItem(entry.saveKey); } catch { /* nothing more to do */ }
    return { ok: false };
  }
  try { storage.removeItem(backupKey); } catch { /* a duplicate copy is harmless */ }
  if (moved.backupKey) pruneBackups(entry, storage, moved.backupKey);
  return { ok: true };
}

/**
 * The player's own "Delete it" on the restore card, after they confirm. This
 * is the only removal of a backup that is not the cap or a finished restore,
 * and it only ever takes a key of this game's own backups. Never throws.
 */
export function deleteBackup(entry: ContinueSave, backupKey: string, storage: SaveStorage | null): { ok: boolean } {
  if (!storage || !backupKey.startsWith(`${entry.saveKey}${BROKEN_SAVE_MARK}`)) return { ok: false };
  try {
    storage.removeItem(backupKey);
    return { ok: storage.getItem(backupKey) === null };
  } catch {
    return { ok: false };
  }
}

/**
 * Where "Leave it aside" is remembered: one key for the whole site holding, per
 * game's save key, the backups the player waved off. Its name does not start
 * with any game's key, so no backup listing ever picks it up.
 *
 * Round 1219 review: a LIST per game. It used to be the one backup last waved
 * off, which only worked while the card looked at nothing but the newest
 * backup. A lone string (written before that round, or by an older cached
 * build) is read as a list of one.
 */
export const SET_ASIDE_SEEN_KEY = 'dukb-set-aside-seen';

function seenMap(storage: SaveStorage): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  try {
    const parsed: unknown = JSON.parse(storage.getItem(SET_ASIDE_SEEN_KEY) ?? '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return out;
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'string') out[k] = [v];
      else if (Array.isArray(v)) out[k] = v.filter((x): x is string => typeof x === 'string');
    }
  } catch {
    return {};
  }
  return out;
}

/**
 * The backup the restore card should offer on this game: the newest one the
 * player has not said "Leave it aside" to and that is not, byte for byte, the
 * save he is playing right now (there would be nothing to put back).
 *
 * Round 1219 review: it used to look at the newest backup only and answer null
 * when that one was waved off or was the save being played. Since a put back
 * keeps the backup it came from, that hid every older kept aside save behind
 * it: put a save back, put the other one back again, and the first career was
 * in storage with no screen that offered it. The card is the only door to a
 * kept aside save, so each one is passed over only for its own reason.
 */
export function offeredBackup(entry: ContinueSave, storage: ListableStorage | null): string | null {
  if (!storage) return null;
  const waved = seenMap(storage)[entry.saveKey] ?? [];
  try {
    const playing = storage.getItem(entry.saveKey);
    for (const k of backupKeysOf(entry, storage)) {
      if (waved.includes(k)) continue;
      if (playing !== null && storage.getItem(k) === playing) continue;
      return k;
    }
  } catch {
    /* A store that stopped answering offers nothing. */
  }
  return null;
}

/** Remembers "Leave it aside" for this backup. Never throws; false if not stored. */
export function dismissBackup(entry: ContinueSave, backupKey: string, storage: SaveStorage | null): boolean {
  if (!storage) return false;
  try {
    const map = seenMap(storage);
    /* Backups that are gone (the cap, a delete) drop off the list, so it never grows past what is held. */
    const held = typeof (storage as ListableStorage).key === 'function' ? backupKeysOf(entry, storage as ListableStorage) : [];
    const before = (map[entry.saveKey] ?? []).filter(k => k !== backupKey && (held.length === 0 || held.includes(k)));
    storage.setItem(SET_ASIDE_SEEN_KEY, JSON.stringify({ ...map, [entry.saveKey]: [...before, backupKey] }));
    return true;
  } catch {
    return false;
  }
}

/** When a backup was made, from its key's UTC stamp, or null. */
export function backupDate(backupKey: string): Date | null {
  const i = backupKey.indexOf(BROKEN_SAVE_MARK);
  const m = i < 0 ? null : /^(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})/.exec(backupKey.slice(i + BROKEN_SAVE_MARK.length));
  if (!m) return null;
  const [y, mo, d, h, mi, s] = m.slice(1).map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h, mi, s));
}
