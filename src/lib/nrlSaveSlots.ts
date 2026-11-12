import { CONTINUE_SAVES, continueSaveEntries } from '@/data/continueSaves';
import { readNrlCareerSave } from '@/lib/nrlCareer';
import { saveFence, type FenceWrite } from '@/lib/saveFence';

export const NRL_SAVE_ENTRY = CONTINUE_SAVES.find(entry => entry.path === '/nrl-team-manager')!;
export const NRL_SAVE_SLOTS = continueSaveEntries(NRL_SAVE_ENTRY);

export function readNrlSaveSlot(key: string) {
  try {
    const raw = localStorage.getItem(key);
    return { raw, career: readNrlCareerSave(raw), available: true };
  } catch {
    return { raw: null, career: null, available: false };
  }
}

/** The receipt also catches a restore performed by the shared keeper, which writes raw bytes. */
export function writeNrlSaveSlot(key: string, expected: string | null, next: string | null): FenceWrite {
  try {
    if (localStorage.getItem(key) !== expected) return 'moved';
  } catch {
    return 'failed';
  }
  return saveFence.write(key, () => {
    if (next === null) localStorage.removeItem(key);
    else localStorage.setItem(key, next);
    return true;
  });
}
