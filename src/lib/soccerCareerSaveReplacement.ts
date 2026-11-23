import { SOCCER_CAREER_SAVE } from '@/data/continueSaves';
import type { ListableStorage } from '@/lib/brokenSaveRecovery';
import { createSaveFence, fenceKeyOf } from '@/lib/saveFence';
import { keepSoccerCareerBeforeImage } from '@/lib/soccerCareerMigration';
import { recordSoccerCareerSavedAt } from '@/lib/soccerCareerSaveReceipt';

export function isSoccerCareerSaveKey(saveKey: string): boolean {
  return saveKey === SOCCER_CAREER_SAVE.saveKey || SOCCER_CAREER_SAVE.alternateSaveKeys?.includes(saveKey) === true;
}

/** Install a validated restore after keeping and verifying the displaced bytes. */
export function replaceSoccerCareerSave(
  storage: ListableStorage, saveKey: string, expectedActive: string | null, replacement: string,
  sourceIsCurrent = () => true,
): 'restored' | 'changed' | 'failed' {
  if (!isSoccerCareerSaveKey(saveKey)) return 'failed';
  const unchanged = () => storage.getItem(saveKey) === expectedActive && sourceIsCurrent();
  const fence = createSaveFence(storage);
  fence.adopt(saveKey);
  try {
    if (!unchanged()) return 'changed';
    let backupKey: string | null = null;
    if (expectedActive !== null) {
      const kept = keepSoccerCareerBeforeImage(saveKey, expectedActive, storage);
      if (kept.status !== 'kept') return kept.status === 'moved' ? 'changed' : 'failed';
      backupKey = kept.backupKey;
    }

    const generationKey = fenceKeyOf(saveKey);
    const generation = storage.getItem(generationKey);
    let moved = false;
    const result = fence.write(saveKey, () => {
      const claimed = storage.getItem(generationKey);
      if (claimed === null || claimed === generation) return false;
      if (backupKey !== null && storage.getItem(backupKey) !== expectedActive) return false;
      moved = !unchanged();
      if (moved) return false;
      storage.setItem(saveKey, replacement);
      return storage.getItem(saveKey) === replacement;
    }, true);
    if (moved || result === 'moved') return 'changed';
    if (result !== 'written' || storage.getItem(saveKey) !== replacement) return 'failed';
    recordSoccerCareerSavedAt(storage, saveKey, replacement);
    return 'restored';
  } catch { return 'failed'; }
}
