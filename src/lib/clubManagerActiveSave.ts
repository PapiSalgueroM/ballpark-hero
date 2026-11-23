import { backupKeysOf, copyAside, routeSaveEntry, slotMarks } from '@/lib/brokenSaveRecovery';
import { isPackedParkedCareer, packCareerPairs, restoreParkedCareer, unpackParkedCareer } from '@/lib/clubManagerParkedSave';
import { readClubManagerResumeSlot, readableClubManagerSave, SAVE_KEY, SLOTS_INDEX_KEY } from '@/lib/clubManagerSaveKeys';
import { saveFence } from '@/lib/saveFence';
import type { CareerState } from '@/lib/clubManager';

const PAIR_PACK_THRESHOLD = 234_000;

/** null leaves the ordinary full/lean write in charge. Once a slot uses
 *  compact bytes it keeps that format through the next season's empty ledger. */
export interface ClubManagerSaveReceipt {
  ownsClaim(): boolean;
  acknowledge(raw: string): void;
}

export function writeActivePairSave(career: CareerState, plain: string, receipt?: ClubManagerSaveReceipt): boolean | null {
  const oversized = plain.length > PAIR_PACK_THRESHOLD;
  let initial: string | null;
  let current: unknown;
  try {
    initial = localStorage.getItem(SAVE_KEY);
    current = initial === null ? null : JSON.parse(initial);
  } catch {
    return oversized ? false : null;
  }
  const compact = isPackedParkedCareer(current);
  if (!oversized && !compact) return null;
  const packed = packCareerPairs(career);
  if (!compact && (!packed || packed.length >= plain.length)) return null;
  if (!packed || unpackParkedCareer(packed) !== plain || saveFence.moved(SAVE_KEY)) return false;

  try {
    const storage = localStorage;
    const index = storage.getItem(SLOTS_INDEX_KEY);
    const slot = readClubManagerResumeSlot(index);
    if (slot === null) return false;
    const unchanged = () => storage.getItem(SAVE_KEY) === initial && storage.getItem(SLOTS_INDEX_KEY) === index;
    let kept: string | null = null;
    if (compact) {
      if (!restoreParkedCareer(current)) return false;
    } else if (initial !== null) {
      if (!readableClubManagerSave(current)) return false;
      const entry = routeSaveEntry('/club-manager');
      if (!entry || !unchanged()) return false;
      const [, marks] = slotMarks(entry, storage);
      kept = backupKeysOf(entry, storage).find(key =>
        (marks[key] === undefined || marks[key] === slot) && storage.getItem(key) === initial,
      ) ?? null;
      if (!kept) {
        const copied = copyAside(entry, storage, undefined, false, { raw: initial, slot });
        if (!copied.ok || !copied.backupKey) return false;
        kept = copied.backupKey;
      }
    }

    if (!unchanged()) return false;
    const wrote = saveFence.write(SAVE_KEY, function saveCareer() {
      try {
        if (!unchanged() || (kept !== null && storage.getItem(kept) !== initial)) return false;
        if (receipt && !receipt.ownsClaim()) return false;
        storage.setItem(SAVE_KEY, packed);
        return true;
      } catch {
        return false;
      }
    }, typeof window !== 'undefined');
    if (wrote !== 'written' || storage.getItem(SAVE_KEY) !== packed) return false;
    receipt?.acknowledge(packed);
    return true;
  } catch {
    return false;
  }
}
