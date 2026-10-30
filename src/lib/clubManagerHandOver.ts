/**
 * Round 1592: a career handed to Club Manager from another game.
 *
 * Report fe949903: a player kept a Manager Hot Seat job, carried it on, and
 * lost his Club Manager career with two slots empty, because the carry wrote
 * straight over the career at SAVE_KEY. A career that starts outside Club
 * Manager now goes in by Club Manager's own rule (startNew in
 * useClubManager.ts): the first slot that is empty, never one that holds a
 * career (an unreadable save counts as a career, as on the managers screen).
 *
 * Only with all three slots full may it take one, and only the slot the
 * player picked on a screen that named its career: that career is kept aside
 * first, the same kept aside copy a fresh start makes, marked with its slot,
 * so the put back card on Club Manager's page offers it back there. Either
 * way the slot's old save points and score record go (Round 1513), so the
 * new career never lists another career's points or loses a season score.
 *
 * The swap's one rule holds: nothing is removed or replaced until the new
 * career is safely written, and a refused step puts every career back.
 *
 * A module of its own, not part of clubManagerSlots.ts, so Club Manager's own
 * page and Deadline Day (which imports the Hot Seat lib for its club pool)
 * load none of it: only the page that hands a career over does.
 * scripts/simManagerHotSeat.mjs section 5 holds it.
 */
import { SAVE_KEY, leanCareer, saveCareer, trimCareer, type CareerState } from '@/lib/clubManager';
import { activeSlot, parkedKey, readSlots, switchSlot, type SlotView } from '@/lib/clubManagerSlots';
import { saveFence } from '@/lib/saveFence';
import { SET_ASIDE_SLOT_KEY, copyAside, type ListableStorage } from '@/lib/brokenSaveRecovery';
import { CONTINUE_SAVES } from '@/data/continueSaves';
import { clearSlotPoints } from '@/lib/cmSavePointsStore';

export type HandOverResult =
  | { ok: true; slot: number; backupKey: string | null }
  | { ok: false; why: 'full' | 'changed' | 'failed' };

/** The first slot with nothing stored in it, or null when all three hold a career. */
export function freeSlot(views: SlotView[] = readSlots()): number | null {
  return views.find(v => !v.summary && !v.damaged)?.slot ?? null;
}

function listable(): ListableStorage | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
}

function read(at: string): string | null {
  try { return localStorage.getItem(at); } catch { return null; }
}

/** The career written to a parked key in saveCareer's shape, retried lean. False when refused. */
function writeParked(slot: number, career: CareerState): boolean {
  const full = trimCareer(career);
  try {
    localStorage.setItem(parkedKey(slot), JSON.stringify(full));
    return true;
  } catch {
    /* once more, lean */
  }
  try {
    localStorage.setItem(parkedKey(slot), JSON.stringify(leanCareer(full)));
    return true;
  } catch {
    return false;
  }
}

/** Puts a key back to the value it had, null meaning absent. Never the
 *  career key: only a parked key, a kept aside copy or the copies' slot marks.
 *  Never throws. */
function putBack(at: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(at);
    else localStorage.setItem(at, value);
  } catch { /* it was that size a moment ago */ }
}

/**
 * Hands `career` to Club Manager. ok names the slot it went into and, for a
 * replaced career, the key its kept aside copy is under. 'full' when every
 * slot holds a career and no slot was named; 'changed' when the named slot no
 * longer holds the career the player was shown; 'failed' when the browser
 * refused a step (every career is then where it was).
 */
export function handOverCareer(career: CareerState, replace?: SlotView): HandOverResult {
  const failed = { ok: false, why: 'failed' } as const;
  /* A page whose Club Manager career another tab has played on since touches nothing. */
  if (saveFence.moved(SAVE_KEY)) return failed;
  const views = readSlots();
  const from = activeSlot();
  const free = freeSlot(views);
  if (free !== null) {
    if (free === from) {
      /* The active slot is empty: SAVE_KEY holds nothing to lose. */
      if (!saveCareer(career)) return failed;
    } else {
      /* Written to the free slot's own key first, so a refused write moves
         nothing; then the routine swap, which parks the career being played. */
      if (!writeParked(free, career)) return failed;
      if (!switchSlot(free)) {
        putBack(parkedKey(free), null);
        return failed;
      }
    }
    clearSlotPoints(free, listable());
    return { ok: true, slot: free, backupKey: null };
  }
  if (!replace) return { ok: false, why: 'full' };
  const named = views[replace.slot - 1];
  if (!named || named.damaged !== replace.damaged || JSON.stringify(named.summary) !== JSON.stringify(replace.summary)) {
    return { ok: false, why: 'changed' };
  }
  const entry = CONTINUE_SAVES.find(e => e.saveKey === SAVE_KEY);
  const store = listable();
  if (!entry || !store) return failed;
  const slot = replace.slot;
  if (slot !== from && !switchSlot(slot)) return failed;
  const marks = read(SET_ASIDE_SLOT_KEY);
  const copy = copyAside(entry, store);
  if (!copy.ok || copy.backupKey === null || !saveCareer(career)) {
    if (copy.ok && copy.backupKey) putBack(copy.backupKey, null);
    putBack(SET_ASIDE_SLOT_KEY, marks);
    if (slot !== from) switchSlot(from);
    return failed;
  }
  clearSlotPoints(slot, store);
  return { ok: true, slot, backupKey: copy.backupKey };
}
