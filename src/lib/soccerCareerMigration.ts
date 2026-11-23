import { continueSaveEntries, SOCCER_CAREER_SAVE } from '@/data/continueSaves';
import { backupKeysOf, copyAside, type ListableStorage } from '@/lib/brokenSaveRecovery';

/** Remember the exact bytes before replacing or clearing this slot. A retry
 * reuses its copy, and no older copy is pruned to make this write fit. */
export function keepSoccerCareerBeforeImage(saveKey: string, raw: string, storage: ListableStorage | null, now = new Date()):
  { status: 'kept'; backupKey: string } | { status: 'moved' | 'failed' } {
  const entry = continueSaveEntries(SOCCER_CAREER_SAVE).find(slot => slot.saveKey === saveKey);
  if (!entry || !storage) return { status: 'failed' };
  try {
    if (storage.getItem(saveKey) !== raw) return { status: 'moved' };
    let backupKey = backupKeysOf(entry, storage).find(key => storage.getItem(key) === raw) ?? null;
    if (backupKey === null) {
      const result = copyAside(entry, storage, now);
      backupKey = result.ok ? result.backupKey : null;
    }
    if (storage.getItem(saveKey) !== raw) return { status: 'moved' };
    if (backupKey !== null && storage.getItem(backupKey) === raw) return { status: 'kept', backupKey };
  } catch { /* Refuse the write when either copy cannot be verified. */ }
  return { status: 'failed' };
}
