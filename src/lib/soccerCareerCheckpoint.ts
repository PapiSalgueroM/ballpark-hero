import type { ListableStorage } from '@/lib/brokenSaveRecovery';
import type { FenceWrite } from '@/lib/saveFence';
import { isSoccerCareerSave, parseSoccerCareerSave, serializeSoccerCareerSave, SOCCER_CAREER_SAVE_VERSION } from '@/lib/soccerCareerSave';
import { isSoccerCareerSaveKey, replaceSoccerCareerSave } from '@/lib/soccerCareerSaveReplacement';
import type { CareerState } from '@/lib/soccerCareerEngine';

export const soccerCareerCheckpointKey = (saveKey: string) => `dukb-soccer-checkpoint:${saveKey}`;

function readCareer(raw: string): CareerState | null {
  const value = parseSoccerCareerSave(raw);
  return isSoccerCareerSave(value) ? value as CareerState : null;
}

export function readSoccerCareerCheckpoint(
  storage: Pick<Storage, 'getItem'> | null, saveKey: string,
): { raw: string; playerName: string; year: number } | null {
  if (!storage || !isSoccerCareerSaveKey(saveKey)) return null;
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
  if (!storage || !isSoccerCareerSaveKey(saveKey) || previousRaw === verifiedRaw) return 'failed';
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
  if (!storage || !isSoccerCareerSaveKey(saveKey)) return 'failed';
  const checkpointKey = soccerCareerCheckpointKey(saveKey);
  const checkpointIsCurrent = () => storage.getItem(checkpointKey) === checkpointRaw;
  try {
    if (!checkpointIsCurrent() || storage.getItem(saveKey) !== expectedActive) return 'moved';
    const checkpoint = readCareer(checkpointRaw);
    if (!checkpoint) return 'failed';
    const restored = JSON.stringify({ ...JSON.parse(checkpointRaw), restoredFromCheckpoint: true });
    if (expectedActive === checkpointRaw || expectedActive === restored) return 'current';

    if (expectedActive !== null) {
      // Resuming writes the same recovered career in the page's normal save format.
      const canonical = serializeSoccerCareerSave({ ...checkpoint, restoredFromCheckpoint: true }, SOCCER_CAREER_SAVE_VERSION);
      if (expectedActive === canonical) return 'current';
    }
    const result = replaceSoccerCareerSave(storage, saveKey, expectedActive, restored, checkpointIsCurrent);
    return result === 'changed' ? 'moved' : result;
  } catch { return 'failed'; }
}
