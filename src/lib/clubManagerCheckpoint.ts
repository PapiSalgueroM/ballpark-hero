import { backupKeysOf, copyAside, pruneBackups, routeSaveEntry, slotMarks, type ListableStorage } from '@/lib/brokenSaveRecovery';
import type { CareerState } from '@/lib/clubManager';
import { isPackedParkedCareer, restoreParkedCareer } from '@/lib/clubManagerParkedSave';
import { readClubManagerResumeSlot, readableClubManagerSave, SAVE_KEY, SLOTS_INDEX_KEY } from '@/lib/clubManagerSaveKeys';
import { createSaveFence, fenceKeyOf } from '@/lib/saveFence';
import { clubManagerCheckpointKey } from '@/lib/cmSavePointsStore';

const FENCE_KEY = fenceKeyOf(SAVE_KEY);
export type ClubManagerCheckpoint = Readonly<{ raw: string; season: number; club: string }>;
type CurrentSlot = Readonly<{ slot: number; index: string | null; generation: string | null; raw: string }>;
export type ClubManagerCheckpointSource = CurrentSlot & { season: number };
export type ClubManagerCheckpointTarget = CurrentSlot & { checkpoint: ClubManagerCheckpoint };

function storedCareer(raw: string | null): CareerState | null {
  if (raw === null) return null;
  const disk: unknown = JSON.parse(raw);
  const career = isPackedParkedCareer(disk) ? restoreParkedCareer(disk) : disk;
  return readableClubManagerSave(career) ? career as CareerState : null;
}

function settled(career: CareerState | null): career is CareerState {
  return !!career && career.week === career.calendar.length
    && career.pendingSummary?.season === career.season && career.pendingSummary.club === career.clubName;
}

function sameCareer(a: CareerState, b: CareerState): boolean {
  return a.worldSeed === b.worldSeed && a.startYear === b.startYear && (a.eraId ?? 'now') === (b.eraId ?? 'now');
}

/** A completed record stays with the manager even when the summer changes clubs. */
function followsReview(review: CareerState, later: CareerState): boolean {
  if (!sameCareer(review, later) || !Array.isArray(review.history) || !Array.isArray(later.history)) return false;
  const old = review.history.find(record => record?.season === review.season);
  const held = later.history.find(record => record?.season === review.season);
  return !!old && !!held && old.club === held.club && old.position === held.position && old.points === held.points
    && Array.isArray(old.trophies) && Array.isArray(held.trophies)
    && old.trophies.length === held.trophies.length && old.trophies.every((trophy, index) => trophy === held.trophies[index]);
}

function currentSlot(storage: ListableStorage, slot: number): CurrentSlot | null {
  const index = storage.getItem(SLOTS_INDEX_KEY);
  if (readClubManagerResumeSlot(index) !== slot || (index !== null && JSON.parse(index).v !== 1)) return null;
  const generation = storage.getItem(FENCE_KEY);
  if (generation !== null && (!/^\d+$/.test(generation) || !Number.isSafeInteger(Number(generation)))) return null;
  const raw = storage.getItem(SAVE_KEY);
  return raw === null ? null : { slot, index, generation, raw };
}

function nextGeneration(before: string | null): string | null {
  const generation = Number(before ?? 0) + 1;
  return Number.isSafeInteger(generation) ? String(generation) : null;
}

function stillCurrent(storage: ListableStorage, source: CurrentSlot, raw = source.raw, generation = source.generation): boolean {
  return storage.getItem(SLOTS_INDEX_KEY) === source.index
    && storage.getItem(FENCE_KEY) === generation && storage.getItem(SAVE_KEY) === raw;
}

export function captureClubManagerCheckpoint(storage: ListableStorage | null, slot: number, career: CareerState): ClubManagerCheckpointSource | null {
  if (!storage || !settled(career)) return null;
  try {
    const source = currentSlot(storage, slot);
    const saved = storedCareer(source?.raw ?? null);
    if (!source || !settled(saved) || saved.season !== career.season || saved.clubName !== career.clubName
        || !sameCareer(saved, career) || !stillCurrent(storage, source)) return null;
    return { ...source, season: saved.season };
  } catch { return null; }
}

export function checkpointSourceIsCurrent(storage: ListableStorage, source: ClubManagerCheckpointSource): boolean {
  try { return stillCurrent(storage, source); } catch { return false; }
}

export function checkpointClaimIsCurrent(storage: ListableStorage, source: ClubManagerCheckpointSource): boolean {
  try {
    const claimed = nextGeneration(source.generation);
    return claimed !== null && stillCurrent(storage, source, source.raw, claimed);
  } catch { return false; }
}

/** The active writer has already read back the successor. A refused checkpoint
 * must leave normal season progress alone. */
export function keepClubManagerCheckpoint(
  storage: ListableStorage, source: ClubManagerCheckpointSource, savedRaw: string,
): 'kept' | 'moved' | 'failed' {
  try {
    const generation = nextGeneration(source.generation);
    const previous = storedCareer(source.raw);
    const next = storedCareer(savedRaw);
    if (generation === null || !settled(previous) || !next || next.season !== source.season + 1
        || !followsReview(previous, next)) return 'failed';
    const key = clubManagerCheckpointKey(source.slot);
    const held = storage.getItem(key);
    if (!stillCurrent(storage, source, savedRaw, generation)) return 'moved';
    if (held === source.raw) return 'kept';
    storage.setItem(key, source.raw);
    return storage.getItem(key) === source.raw ? 'kept' : 'failed';
  } catch { return 'failed'; }
}

/** Only the currently owned slot can restore. Open its career before showing
 * a checkpoint, so a reused or incompatible slot never offers a stale career. */
export function readClubManagerCheckpoint(storage: ListableStorage | null, slot: number): ClubManagerCheckpoint | null {
  if (!storage) return null;
  try {
    const source = currentSlot(storage, slot);
    if (!source) return null;
    const raw = storage.getItem(clubManagerCheckpointKey(slot));
    const review = storedCareer(raw);
    const active = storedCareer(source.raw);
    return raw && settled(review) && active && active.season > review.season && followsReview(review, active)
      ? { raw, season: review.season, club: review.clubName } : null;
  } catch { return null; }
}

export function captureClubManagerCheckpointRestore(
  storage: ListableStorage | null, slot: number, checkpoint: ClubManagerCheckpoint,
): ClubManagerCheckpointTarget | null {
  if (!storage) return null;
  try {
    const source = currentSlot(storage, slot);
    const reading = readClubManagerCheckpoint(storage, slot);
    return source && reading?.raw === checkpoint.raw && stillCurrent(storage, source)
      ? { ...source, checkpoint: reading } : null;
  } catch { return null; }
}

export function restoreClubManagerCheckpoint(
  storage: ListableStorage | null, target: ClubManagerCheckpointTarget,
): 'restored' | 'moved' | 'failed' {
  if (!storage) return 'failed';
  try {
    const current = readClubManagerCheckpoint(storage, target.slot);
    const checkpointKey = clubManagerCheckpointKey(target.slot);
    const checkpointIsCurrent = () => storage.getItem(checkpointKey) === target.checkpoint.raw;
    if (current?.raw !== target.checkpoint.raw || !checkpointIsCurrent() || !stillCurrent(storage, target)) return 'moved';
    const generation = nextGeneration(target.generation);
    const entry = routeSaveEntry('/club-manager');
    if (generation === null || !entry) return 'failed';
    const replacement = JSON.stringify({ ...JSON.parse(target.checkpoint.raw), restoredFromCheckpoint: true });
    const [, marks] = slotMarks(entry, storage);
    let backup = backupKeysOf(entry, storage).find(key => marks[key] === target.slot && storage.getItem(key) === target.raw);
    if (!backup) {
      const kept = copyAside(entry, storage, undefined, false, { raw: target.raw, slot: target.slot });
      if (!kept.ok || !kept.backupKey) return 'failed';
      backup = kept.backupKey;
      const mark = slotMarks(entry, storage)[1][backup];
      if (mark !== target.slot) {
        if (mark === undefined && storage.getItem(backup) === target.raw) storage.removeItem(backup);
        return 'failed';
      }
    }

    const fence = createSaveFence(storage);
    fence.adopt(SAVE_KEY);
    if (!checkpointIsCurrent() || !stillCurrent(storage, target)) return 'moved';
    let moved = false;
    const status = fence.write(SAVE_KEY, function replaceWithCheckpoint() {
      if (storage.getItem(backup) !== target.raw) return false;
      moved = !checkpointIsCurrent() || !stillCurrent(storage, target, target.raw, generation);
      if (moved) return false;
      try { storage.setItem(SAVE_KEY, replacement); return true; } catch { return false; }
    }, true);
    if (moved || status === 'moved') return 'moved';
    if (status !== 'written' || storage.getItem(SAVE_KEY) !== replacement) return 'failed';
    if (!checkpointIsCurrent() || !stillCurrent(storage, target, replacement, generation)) return 'moved';
    pruneBackups(entry, storage, backup);
    return 'restored';
  } catch { return 'failed'; }
}
