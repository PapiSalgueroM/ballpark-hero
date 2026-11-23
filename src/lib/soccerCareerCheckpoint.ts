import { SOCCER_CAREER_SAVE } from '@/data/continueSaves';
import type { ListableStorage } from '@/lib/brokenSaveRecovery';
import { createSaveFence, fenceKeyOf, type FenceWrite } from '@/lib/saveFence';
import { keepSoccerCareerBeforeImage } from '@/lib/soccerCareerMigration';
import { isSoccerCareerSave, parseSoccerCareerSave, serializeSoccerCareerSave, SOCCER_CAREER_SAVE_VERSION } from '@/lib/soccerCareerSave';
import { recordSoccerCareerSavedAt } from '@/lib/soccerCareerSaveReceipt';
import type { CareerState } from '@/lib/soccerCareerEngine';

export const soccerCareerCheckpointKey = (saveKey: string) => `dukb-soccer-checkpoint:${saveKey}`;

function isSlot(saveKey: string): boolean {
  return saveKey === SOCCER_CAREER_SAVE.saveKey || SOCCER_CAREER_SAVE.alternateSaveKeys?.includes(saveKey) === true;
}

function readCareer(raw: string): CareerState | null {
  const value = parseSoccerCareerSave(raw);
  return isSoccerCareerSave(value) ? value as CareerState : null;
}

export function readSoccerCareerCheckpoint(
  storage: Pick<Storage, 'getItem'> | null, saveKey: string,
): { raw: string; playerName: string; year: number } | null {
  if (!storage || !isSlot(saveKey)) return null;
  try {
    const raw = storage.getItem(soccerCareerCheckpointKey(saveKey));
    if (raw === null) return null;
    const career = readCareer(raw);
    const lastSeason = career?.seasons.at(-1);
    if (!career || !lastSeason) return null;
    const roleSeasons = Math.max(0, career.managerState?.season ?? 0, career.ownerState?.season ?? 0, career.punditState?.season ?? 0);
    return { raw, playerName: career.playerName, year: lastSeason.year + roleSeasons };
  } catch { return null; }
}

/** A checkpoint is best effort and never changes the active slot or its generation. */
export function keepSoccerCareerCheckpoint(
  storage: Pick<Storage, 'getItem' | 'setItem'> | null, saveKey: string, previousRaw: string, verifiedRaw: string,
): FenceWrite {
  if (!storage || !isSlot(saveKey) || previousRaw === verifiedRaw) return 'failed';
  try {
    if (!readCareer(previousRaw)) return 'failed';
    const key = soccerCareerCheckpointKey(saveKey);
    const held = storage.getItem(key);
    if (storage.getItem(saveKey) !== verifiedRaw) return 'moved';
    if (held === previousRaw) return 'written';
    storage.setItem(key, previousRaw);
    return storage.getItem(key) === previousRaw ? 'written' : 'failed';
  } catch { return 'failed'; }
}

export function restoreSoccerCareerCheckpoint(
  storage: ListableStorage | null, saveKey: string, expectedActive: string | null, checkpointRaw: string,
): 'restored' | 'moved' | 'failed' | 'current' {
  if (!storage || !isSlot(saveKey)) return 'failed';
  const checkpointKey = soccerCareerCheckpointKey(saveKey);
  const unchanged = () => storage.getItem(checkpointKey) === checkpointRaw && storage.getItem(saveKey) === expectedActive;
  const fence = createSaveFence(storage);
  fence.adopt(saveKey);
  try {
    if (!unchanged()) return 'moved';
    const checkpoint = readCareer(checkpointRaw);
    if (!checkpoint) return 'failed';
    const restored = JSON.stringify({ ...JSON.parse(checkpointRaw), restoredFromCheckpoint: true });
    if (expectedActive === checkpointRaw || expectedActive === restored) return 'current';

    let backupKey: string | null = null;
    if (expectedActive !== null) {
      // Resuming writes the same recovered career in the page's normal save format.
      const canonical = serializeSoccerCareerSave({ ...checkpoint, restoredFromCheckpoint: true }, SOCCER_CAREER_SAVE_VERSION);
      if (expectedActive === canonical) return 'current';
      const kept = keepSoccerCareerBeforeImage(saveKey, expectedActive, storage);
      if (kept.status !== 'kept') return kept.status;
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
      storage.setItem(saveKey, restored);
      return storage.getItem(saveKey) === restored;
    }, true);
    if (moved || result === 'moved') return 'moved';
    if (result !== 'written' || storage.getItem(saveKey) !== restored) return 'failed';
    recordSoccerCareerSavedAt(storage, saveKey, restored);
    return 'restored';
  } catch { return 'failed'; }
}
