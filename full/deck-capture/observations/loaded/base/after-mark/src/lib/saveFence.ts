/**
 * Round 1323: one tab wins.
 *
 * WHY THIS EXISTS. A long game open in two tabs shares one save, and before
 * this round the older tab had no way to know the newer one had played on.
 * Closing it wrote its old career over the new one (three matches gone), and
 * pressing Quick Sim in it replayed a match the other tab had already played
 * and swapped the result. Nothing on the page said a word.
 *
 * So every write of a fenced save moves a GENERATION, a plain whole number
 * kept in its own small key beside the save (fenceKeyOf). The save's own bytes
 * and shape never change. A page adopts the generation when it opens the save
 * and writes only while the stored generation is still the one it holds; once
 * another tab has written, this page is stale, every write it tries is
 * refused, and the page tells the player to reload. The newest tab wins.
 *
 * The rules, each one load bearing:
 * - adopt BEFORE the save is read, so a write landing between the two reads
 *   makes this page stale (the safe side), never the other tab.
 * - An absent fence key is never a move. Only a person or a test clears
 *   storage, the game never removes a fence key, and a page that refused
 *   every write after a clear would lose the career it is holding. An
 *   unreadable value is treated the same way, for the same reason.
 * - A page that holds nothing for a key writes as a CLAIM: the generation
 *   moves and nothing is checked. That is a handover from another game (Hot
 *   Seat's carry on), and every sim or test that saves without a page. A claim
 *   does not start holding: only adopt does.
 * - The fence write never stops the save. If the browser refuses it, the save
 *   is still attempted and this page keeps its old generation, which is still
 *   the stored one. If the fence write lands and the save is then refused,
 *   the fence is put back as it was, so a refused write changes no byte; if
 *   even that is refused, other tabs go stale over the same bytes: a reload,
 *   nothing lost.
 * - The page's own fence works over window.localStorage, so a page in a
 *   browser (or a jsdom test) is fenced and a node sim with no window is not:
 *   there the fence has no store and every write goes straight through,
 *   byte for byte as before this round. scripts/simSaveFence.mjs plants a
 *   window to model two tabs; the sims that pin the store's exact keys
 *   (simClubManagerSlots section 4 holds a single key) stay as they were.
 *
 * It is NOT a lock. localStorage has no compare and swap, so two tabs writing
 * in the same millisecond can both pass the check. The window is one storage
 * call wide.
 *
 * Generic on purpose: no game imports, no React, nothing evaluated from an
 * import (there are none). It uses only getItem, setItem and removeItem, so it
 * runs over the stub stores the sims plant, and it never throws.
 */

export interface FenceStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** written: the save went through. moved: another tab wrote first, nothing
 *  was touched. failed: the save itself was refused. */
export type FenceWrite = 'written' | 'moved' | 'failed';

export interface SaveFence {
  /** This page now holds the stored generation of `saveKey`. */
  adopt(saveKey: string): void;
  /** This page holds nothing for `saveKey` any more. */
  release(saveKey: string): void;
  /** True when this page holds a generation and another tab has written since. */
  moved(saveKey: string): boolean;
  /** Runs `doWrite` (true when the save landed) unless the page is stale. */
  write(saveKey: string, doWrite: () => boolean): FenceWrite;
}

/** Never starts with any game's save key, so no game and no backup list reads it. */
export const FENCE_PREFIX = 'dukb-fence:';
export const fenceKeyOf = (saveKey: string): string => FENCE_PREFIX + saveKey;

export function createSaveFence(source: FenceStore | (() => FenceStore | null | undefined)): SaveFence {
  const held = new Map<string, number>();
  const store = (): FenceStore | null => {
    try {
      return (typeof source === 'function' ? source() : source) ?? null;
    } catch {
      return null;
    }
  };
  /** The stored generation, or null when absent, unreadable or unreachable. */
  const stored = (saveKey: string): number | null => {
    try {
      const raw = store()?.getItem(fenceKeyOf(saveKey));
      if (raw === null || raw === undefined || raw.trim() === '') return null;
      const n = Number(raw);
      return Number.isSafeInteger(n) && n >= 0 ? n : null;
    } catch {
      return null;
    }
  };
  const moved = (saveKey: string): boolean => {
    const mine = held.get(saveKey);
    if (mine === undefined) return false;
    const now = stored(saveKey);
    return now !== null && now !== mine;
  };
  return {
    adopt(saveKey) {
      held.set(saveKey, stored(saveKey) ?? 0);
    },
    release(saveKey) {
      held.delete(saveKey);
    },
    moved,
    write(saveKey, doWrite) {
      if (moved(saveKey)) return 'moved';
      const mine = held.get(saveKey);
      const next = Math.max(mine ?? 0, stored(saveKey) ?? 0) + 1;
      const s = store();
      let before: string | null = null;
      let fenced = false;
      try {
        if (s) {
          before = s.getItem(fenceKeyOf(saveKey));
          s.setItem(fenceKeyOf(saveKey), String(next));
          fenced = true;
        }
      } catch {
        /* refused: the career matters more, so the save is still attempted */
      }
      let ok = false;
      try {
        ok = doWrite() === true;
      } catch {
        ok = false;
      }
      /* A refused save changed nothing, so the fence goes back to what it was
         and no other tab is made stale over the same bytes. If even that is
         refused, the fence stays moved and this page holds the new number. */
      let at = fenced ? next : mine;
      if (fenced && !ok && s) {
        try {
          if (before === null) s.removeItem(fenceKeyOf(saveKey));
          else s.setItem(fenceKeyOf(saveKey), before);
          at = mine;
        } catch {
          /* left moved: a reload in the other tab, nothing lost */
        }
      }
      if (mine !== undefined && at !== undefined) held.set(saveKey, at);
      return ok ? 'written' : 'failed';
    },
  };
}

/** The page's own fence over the browser's storage; none in a node sim with no window. */
export const saveFence: SaveFence = createSaveFence(
  () => (typeof window === 'undefined' ? null : window.localStorage),
);
