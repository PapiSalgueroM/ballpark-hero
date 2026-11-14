import { CONTINUE_SAVES, continueSaveEntries, type ContinueSave } from '@/data/continueSaves';
import { backupKeysOf, browserStorage, copyAside, pruneBackups } from '@/lib/brokenSaveRecovery';
import { NRL_SAVE_MAX_CHARS, readNrlCareerSave, type NrlCareerState } from '@/lib/nrlCareer';
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
  if (next !== null && next.length > NRL_SAVE_MAX_CHARS) return saveFence.moved(key) ? 'moved' : 'failed';
  return saveFence.write(key, () => {
    if (next === null) localStorage.removeItem(key);
    else localStorage.setItem(key, next);
    return true;
  });
}

export const nrlCheckpointKey = (key: string) => 'dukb-nrl-checkpoint:' + key;
const replayKey = (key: string) => 'dukb-nrl-checkpoint-replay:' + key;

function careerId(career: NrlCareerState): string {
  const { openingYear, openingRoster, season, history, customClub } = career;
  // Rollover keeps the seed and the first completed club, even when the manager moves.
  const id = [openingYear, history[0]?.clubId ?? season.clubId, season.seed].join(':');
  if (customClub) return `${id}:custom:${JSON.stringify([customClub.name, customClub.ground, customClub.colour])}`;
  return openingRoster ? `${id}:${openingRoster}` : id;
}

export function sameNrlCareer(first: NrlCareerState, second: NrlCareerState): boolean {
  return careerId(first) === careerId(second);
}

interface ReplayCutoff { career: string; through: number }

function replayCutoff(raw: string | null): ReplayCutoff | null {
  try {
    const value = raw && JSON.parse(raw);
    return value && typeof value.career === 'string' && Number.isSafeInteger(value.through) ? value : null;
  } catch {
    return null;
  }
}

export function readNrlReplayCutoff(key: string): ReplayCutoff | null {
  try {
    return replayCutoff(browserStorage()?.getItem(replayKey(key)) ?? null);
  } catch {
    return null;
  }
}

export function nrlSeasonCanCredit(career: NrlCareerState, cutoff: ReplayCutoff | null): boolean {
  return !cutoff || cutoff.career !== careerId(career) || career.season.year > cutoff.through;
}

export function saveNrlCheckpoint(key: string, active: string, checkpoint: string | null): FenceWrite {
  const storage = browserStorage();
  if (!storage) return 'failed';
  const destination = nrlCheckpointKey(key);
  try {
    if (storage.getItem(key) !== active || storage.getItem(destination) !== checkpoint || saveFence.moved(key)) return 'moved';
    if (!readNrlCareerSave(active)) return 'failed';
    storage.setItem(destination, active);
    return storage.getItem(destination) === active ? 'written' : 'failed';
  } catch {
    return 'failed';
  }
}

export function restoreNrlCheckpoint(entry: ContinueSave, active: string, checkpoint: string): FenceWrite {
  const storage = browserStorage();
  if (!storage) return 'failed';
  const key = entry.saveKey;
  const source = nrlCheckpointKey(key);
  const receipt = replayKey(key);
  const unchanged = () => storage.getItem(key) === active && storage.getItem(source) === checkpoint && !saveFence.moved(key);
  let made: string | null = null;
  let previous: string | null = null;
  let marked: string | null = null;
  let outcome: FenceWrite = 'failed';
  try {
    if (!unchanged()) return 'moved';
    const current = readNrlCareerSave(active);
    const incoming = readNrlCareerSave(checkpoint);
    if (!current || !incoming || !sameNrlCareer(current, incoming)) return 'failed';
    if (active === checkpoint) return 'written';

    let kept = backupKeysOf(entry, storage).find(backup => storage.getItem(backup) === active);
    if (!kept) {
      const copy = copyAside(entry, storage);
      if (!copy.ok || !copy.backupKey) return 'failed';
      kept = made = copy.backupKey;
    }
    if (!unchanged()) return 'moved';

    const career = careerId(current);
    const completed = current.history.at(-1)?.year;
    if (completed !== undefined) {
      previous = storage.getItem(receipt);
      const prior = replayCutoff(previous);
      if (prior?.career !== career || completed > prior.through) {
        marked = JSON.stringify({ career, through: completed });
        storage.setItem(receipt, marked);
        if (storage.getItem(receipt) !== marked) return 'failed';
      }
    }
    if (!unchanged()) return 'moved';
    const written = writeNrlSaveSlot(key, active, checkpoint);
    outcome = written === 'written' && storage.getItem(key) !== checkpoint ? 'failed' : written;
    if (outcome === 'written') pruneBackups(entry, storage, kept);
    return outcome;
  } catch {
    return outcome;
  } finally {
    if (outcome !== 'written') {
      try {
        // Only remove writes made by this attempt while the displaced save is still active.
        if (storage.getItem(key) === active) {
          if (made && storage.getItem(made) === active) storage.removeItem(made);
          if (marked && storage.getItem(receipt) === marked) {
            if (previous === null) storage.removeItem(receipt);
            else storage.setItem(receipt, previous);
          }
        }
      } catch { /* A spare recovery copy can still be used if storage stops answering. */ }
    }
  }
}
