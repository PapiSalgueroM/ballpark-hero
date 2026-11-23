import { CONTINUE_SAVES, continueSaveEntries, type ContinueSave } from '@/data/continueSaves';
import { backupKeysOf, browserStorage, copyAside, dismissBackup, pruneBackups, type ListableStorage } from '@/lib/brokenSaveRecovery';
import { NRL_SAVE_MAX_CHARS, nrlOpeningClubId, readNrlCareerSave, type NrlCareerState } from '@/lib/nrlCareer';
import { fenceKeyOf, saveFence, type FenceWrite } from '@/lib/saveFence';

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

function saveVersion(raw: string): unknown {
  try { return JSON.parse(raw)?.version; } catch { return null; }
}

/** The receipt also catches a restore performed by the shared keeper, which writes raw bytes. */
export function writeNrlSaveSlot(key: string, expected: string | null, next: string | null): FenceWrite {
  let backupKey: string | undefined;
  try {
    if (localStorage.getItem(key) !== expected || saveFence.moved(key)) return 'moved';
    if (next !== null && next.length > NRL_SAVE_MAX_CHARS) return 'failed';
    if (expected !== null && next !== null && saveVersion(expected) === 1 && saveVersion(next) === 2) {
      // Boot may have kept this slot already. Reuse only an exact copy within the same slot.
      const entry = NRL_SAVE_SLOTS.find(slot => slot.saveKey === key);
      if (!entry) return 'failed';
      backupKey = backupKeysOf(entry, localStorage).find(backup => localStorage.getItem(backup) === expected);
      if (!backupKey) {
        const copied = copyAside(entry, localStorage);
        if (localStorage.getItem(key) !== expected || saveFence.moved(key)) return 'moved';
        if (!copied.ok || !copied.backupKey) return 'failed';
        backupKey = copied.backupKey;
        dismissBackup(entry, backupKey, localStorage);
      }
    }
  } catch {
    return 'failed';
  }
  let sourceChanged = false;
  const written = saveFence.write(key, () => {
    if (backupKey !== undefined) {
      if (localStorage.getItem(backupKey) !== expected) return false;
      if (localStorage.getItem(key) !== expected) { sourceChanged = true; return false; }
    }
    if (next === null) localStorage.removeItem(key);
    else localStorage.setItem(key, next);
    return backupKey === undefined || localStorage.getItem(key) === next;
  }, backupKey !== undefined);
  return sourceChanged ? 'moved' : written;
}

export const nrlCheckpointKey = (key: string) => 'dukb-nrl-checkpoint:' + key;
export const nrlSeasonCheckpointKey = (key: string) => 'dukb-nrl-season-checkpoint:' + key;
const replayKey = (key: string) => 'dukb-nrl-checkpoint-replay:' + key;

function careerId(career: NrlCareerState): string {
  const { openingYear, openingRoster, season, customClub } = career;
  // Rollover keeps the seed and the first completed club, even when the manager moves.
  const id = [openingYear, nrlOpeningClubId(career), season.seed,
    ...(season.domesticScoringModel ? [season.domesticScoringModel] : [])].join(':');
  if (customClub) return `${id}:custom:${JSON.stringify([customClub.name, customClub.ground, customClub.colour])}`;
  return openingRoster ? `${id}:${openingRoster}` : id;
}

export function sameNrlCareer(first: NrlCareerState, second: NrlCareerState): boolean {
  return careerId(first) === careerId(second);
}

function sameCheckpointCareer(first: NrlCareerState, second: NrlCareerState): boolean {
  return sameNrlCareer(first, second) && first.importedFromFile === second.importedFromFile;
}

export function canRestoreNrlSeasonCheckpoint(current: NrlCareerState, saved: NrlCareerState): boolean {
  return saved.season.phase === 'complete' && saved.season.year < current.season.year && sameCheckpointCareer(current, saved);
}

interface NrlSeasonCheckpointSource {
  key: string;
  raw: string;
  prior: string | null;
  nextGeneration: string;
  archivePrior: boolean;
}

function nextNrlGeneration(raw: string | null): string | null {
  const generation = Number(raw) + 1;
  return (raw === null || /^\d+$/.test(raw)) && Number.isSafeInteger(generation) ? String(generation) : null;
}

function archiveSeasonCheckpoint(entry: ContinueSave, storage: ListableStorage, raw: string): string | null {
  const held = backupKeysOf(entry, storage).find(key => storage.getItem(key) === raw);
  if (held) return held;
  // Recovery is addressed by the career slot, but the copy reads the automatic point.
  const copy = copyAside(entry, {
    getItem: key => storage.getItem(key === entry.saveKey ? nrlSeasonCheckpointKey(key) : key),
    setItem: storage.setItem.bind(storage),
    removeItem: storage.removeItem.bind(storage),
  }, undefined, true, { raw, slot: 1 });
  return copy.ok ? copy.backupKey ?? null : null;
}

export function captureNrlSeasonCheckpoint(key: string, raw: string, next: NrlCareerState): NrlSeasonCheckpointSource | null {
  const storage = browserStorage();
  if (!storage) return null;
  try {
    const closed = readNrlCareerSave(raw);
    if (!closed || !canRestoreNrlSeasonCheckpoint(next, closed)) return null;
    const storedGeneration = storage.getItem(fenceKeyOf(key));
    const nextGeneration = nextNrlGeneration(storedGeneration);
    if (nextGeneration === null) return null;
    const prior = storage.getItem(nrlSeasonCheckpointKey(key));
    let archivePrior = false;
    if (prior !== null) {
      const previous = readNrlCareerSave(prior);
      archivePrior = !previous || previous.season.phase !== 'complete' || !sameCheckpointCareer(previous, closed);
      if (previous && !archivePrior && previous.season.year >= closed.season.year) return null;
    }
    if (storage.getItem(key) !== raw || storage.getItem(fenceKeyOf(key)) !== storedGeneration || saveFence.moved(key)) return null;
    return { key, raw, prior, nextGeneration, archivePrior };
  } catch {
    return null;
  }
}

/** A checkpoint is optional once the new season has been written. */
export function keepNrlSeasonCheckpoint(source: NrlSeasonCheckpointSource, successor: string): void {
  const storage = browserStorage();
  if (!storage) return;
  const destination = nrlSeasonCheckpointKey(source.key);
  const unchanged = () => storage.getItem(source.key) === successor
    && storage.getItem(fenceKeyOf(source.key)) === source.nextGeneration
    && !saveFence.moved(source.key) && storage.getItem(destination) === source.prior;
  try {
    if (!unchanged()) return;
    if (source.archivePrior && source.prior !== null) {
      const entry = NRL_SAVE_SLOTS.find(slot => slot.saveKey === source.key);
      const archived = entry && archiveSeasonCheckpoint(entry, storage, source.prior);
      if (!archived || storage.getItem(archived) !== source.prior || !unchanged()) return;
    }
    storage.setItem(destination, source.raw);
  } catch { /* The saved new season is still playable. */ }
}

export function deleteNrlCareerSlot(entry: ContinueSave, active: string, checkpoint: string | null): FenceWrite {
  const storage = browserStorage();
  if (!storage) return 'failed';
  const key = entry.saveKey;
  const point = nrlSeasonCheckpointKey(key);
  const fenceKey = fenceKeyOf(key);
  let generation: string | null = null;
  let claimed: string | null = null;
  let archive: string | null = null;
  let detached = false;
  const unchanged = () => storage.getItem(key) === active && storage.getItem(fenceKey) === generation
    && !saveFence.moved(key) && storage.getItem(point) === checkpoint;
  try {
    generation = storage.getItem(fenceKey);
    if (!unchanged()) return 'moved';
    if (checkpoint === null) return writeNrlSaveSlot(key, active, null);
    claimed = nextNrlGeneration(generation);
    if (claimed === null) return 'failed';
    archive = archiveSeasonCheckpoint(entry, storage, checkpoint);
    if (!archive || storage.getItem(archive) !== checkpoint) return 'failed';
    if (!unchanged()) return 'moved';
    storage.removeItem(point);
    detached = true;
    let moved = false;
    const result = saveFence.write(key, function deleteCareer() {
      try {
        if (storage.getItem(key) !== active || storage.getItem(fenceKey) !== claimed || storage.getItem(point) !== null) {
          moved = true;
          return false;
        }
        storage.removeItem(key);
        return true;
      } catch {
        return false;
      }
    }, true);
    if (moved || result !== 'written') return moved ? 'moved' : result;
    if (storage.getItem(fenceKey) !== claimed || storage.getItem(point) !== null) return 'moved';
    return storage.getItem(key) === null ? 'written' : 'failed';
  } catch {
    return 'failed';
  } finally {
    if (detached && archive && checkpoint !== null) {
      try {
        const actualGeneration = storage.getItem(fenceKey);
        if ((actualGeneration === generation || actualGeneration === claimed) && !saveFence.moved(key)
          && storage.getItem(key) === active && storage.getItem(archive) === checkpoint && storage.getItem(point) === null) {
          storage.setItem(point, checkpoint);
        }
      } catch { /* Recovery still has the exact season bytes. */ }
    }
  }
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
  return !career.importedFromFile && (!cutoff || cutoff.career !== careerId(career) || career.season.year > cutoff.through);
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

export function restoreNrlCheckpoint(entry: ContinueSave, active: string, checkpoint: string, kind: 'manual' | 'season' = 'manual'): FenceWrite {
  const storage = browserStorage();
  if (!storage) return 'failed';
  const key = entry.saveKey;
  const source = kind === 'season' ? nrlSeasonCheckpointKey(key) : nrlCheckpointKey(key);
  const receipt = replayKey(key);
  const fenceKey = fenceKeyOf(key);
  let generation: string | null = null;
  let claimed: string | null = null;
  const unchanged = () => storage.getItem(key) === active && storage.getItem(source) === checkpoint && !saveFence.moved(key)
    && (kind === 'manual' || storage.getItem(fenceKey) === generation);
  let made: string | null = null;
  let previous: string | null = null;
  let marked: string | null = null;
  let outcome: FenceWrite = 'failed';
  let landed = false;
  try {
    if (kind === 'season') {
      generation = storage.getItem(fenceKey);
      claimed = nextNrlGeneration(generation);
      if (claimed === null) return 'failed';
    }
    if (!unchanged()) return 'moved';
    const current = readNrlCareerSave(active);
    const incoming = readNrlCareerSave(checkpoint);
    if (!current || !incoming || (kind === 'season'
      ? !canRestoreNrlSeasonCheckpoint(current, incoming) : !sameCheckpointCareer(current, incoming))) return 'failed';
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
    let moved = false;
    const written = kind === 'manual' ? writeNrlSaveSlot(key, active, checkpoint) : saveFence.write(key, function replaceWithSeasonCheckpoint() {
      try {
        if (storage.getItem(key) !== active || storage.getItem(source) !== checkpoint
          || storage.getItem(kept) !== active || storage.getItem(fenceKey) !== claimed) {
          moved = true;
          return false;
        }
        storage.setItem(key, checkpoint);
        landed = true;
        return true;
      } catch {
        return false;
      }
    }, true);
    const after = written === 'written' ? storage.getItem(key) : null;
    if (moved || (kind === 'season' && landed
      && (storage.getItem(fenceKey) !== claimed || storage.getItem(source) !== checkpoint))) return 'moved';
    outcome = written === 'written' && after !== checkpoint ? 'failed' : written;
    if (outcome === 'written') pruneBackups(entry, storage, kept);
    return outcome;
  } catch {
    return outcome;
  } finally {
    if (outcome !== 'written' && !landed) {
      try {
        // Only remove writes made by this attempt while the displaced save is still active.
        if (storage.getItem(key) === active && (kind === 'manual' || storage.getItem(fenceKey) === generation)) {
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
