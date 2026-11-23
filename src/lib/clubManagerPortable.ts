import { compressToUTF16, decompressFromUTF16 } from 'lz-string';
import { isPackedParkedCareer, restoreParkedCareer } from '@/lib/clubManagerParkedSave';
import {
  PARKED_PAIR_SAVE_VERSION, parkedKey, readClubManagerResumeSlot, readableClubManagerSave, READABLE_SAVE_VERSION, SAVE_KEY, SLOT_COUNT, SLOTS_INDEX_KEY,
} from '@/lib/clubManagerSaveKeys';
import { createSaveFence, fenceKeyOf, type FenceStore } from '@/lib/saveFence';

const FILE_FORMAT = 'douknowball-club-manager';
const FILE_VERSION = 1;
const MAX_FILE_BYTES = 16 * 1024 * 1024;
const MAX_SAVE_CHARS = 5 * 1024 * 1024;
const ACTIVE_FENCE_KEY = fenceKeyOf(SAVE_KEY);

type CompressionProof = { pairResults?: string; worldRoster?: string };
type ReadyFile = { kind: 'ready'; raw: string; proof?: CompressionProof };
export type ClubManagerFile = ReadyFile | { kind: 'invalid' | 'unsupported' | 'too-large' | 'unreadable' };

export type ClubManagerImportTarget = Readonly<{
  slot: number;
  index: string | null;
  activeRaw: string | null;
  activeGeneration: string | null;
}>;

type CapturedTarget = { kind: 'ready'; target: ClubManagerImportTarget } | { kind: 'occupied' | 'failed' };
type TargetStatus = 'ready' | 'occupied' | 'changed';
type ImportResult = Exclude<TargetStatus, 'ready'> | 'imported' | 'invalid' | 'failed' | 'cancelled';

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

const compressedKeys = ['pairResults', 'worldRoster'] as const;

function compressedFields(disk: Record<string, unknown>) {
  return {
    pairResults: isPackedParkedCareer(disk) ? disk.pairResults : undefined,
    worldRoster: isRecord(disk.worldRoster) ? disk.worldRoster.packedRecords : undefined,
  };
}

function hasCompressionProof(disk: Record<string, unknown>, proof: unknown): boolean {
  if (proof !== undefined && !isRecord(proof)) return false;
  const fields = compressedFields(disk);
  let units = 0;
  for (const key of compressedKeys) {
    const encoded = fields[key];
    const decoded = proof?.[key];
    if (encoded === undefined && decoded === undefined) continue;
    if (typeof encoded !== 'string' || typeof decoded !== 'string' || !decoded.length) return false;
    units += decoded.length;
    if (units > MAX_SAVE_CHARS || compressToUTF16(decoded) !== encoded) return false;
  }
  return true;
}

function parseStoredSave(raw: string): { kind: 'ready'; disk: Record<string, unknown> } | { kind: 'invalid' | 'unsupported' } {
  if (raw.length > MAX_SAVE_CHARS) return { kind: 'invalid' };
  try {
    const disk: unknown = JSON.parse(raw);
    if (!isRecord(disk)) return { kind: 'invalid' };
    const version = disk.saveVersion;
    if (version !== READABLE_SAVE_VERSION && version !== PARKED_PAIR_SAVE_VERSION) {
      return { kind: Number.isSafeInteger(version) || (typeof version === 'string' && /^parked-pairs-\d+$/.test(version)) ? 'unsupported' : 'invalid' };
    }
    return { kind: 'ready', disk };
  } catch { return { kind: 'invalid' }; }
}

/** Recompression bounds what the existing decoder can expand, without
 * changing the bytes in either storage format. */
function inspectSave(raw: string, proof?: unknown): ReturnType<typeof parseStoredSave> {
  const result = parseStoredSave(raw);
  if (result.kind !== 'ready') return result;
  const { disk } = result;
  try {
    if (!hasCompressionProof(disk, proof)) return { kind: 'invalid' };
    const plain: unknown = isPackedParkedCareer(disk) ? restoreParkedCareer(disk) : disk;
    if (!isRecord(plain) || !readableClubManagerSave(plain)) return { kind: 'invalid' };
    const { clubName, season, week, budget, boardConfidence, squad, xiIds, table, calendar, eraId, realLeagueFixtures } = plain;
    if (typeof clubName !== 'string' || !clubName.trim() ||
        typeof season !== 'number' || !Number.isSafeInteger(season) || season < 1 ||
        typeof budget !== 'number' || !Number.isFinite(budget) ||
        typeof boardConfidence !== 'number' || !Number.isFinite(boardConfidence) ||
        (eraId !== undefined && typeof eraId !== 'string') ||
        (realLeagueFixtures !== undefined && typeof realLeagueFixtures !== 'string') ||
        !Array.isArray(squad) || !squad.length || !squad.every(player => isRecord(player) && typeof player.id === 'string' && typeof player.name === 'string') ||
        !Array.isArray(xiIds) || !xiIds.every(id => id === null || typeof id === 'string') ||
        !Array.isArray(table) || !table.every(row => isRecord(row) && typeof row.club === 'string') ||
        !Array.isArray(calendar) || typeof week !== 'number' || week > calendar.length ||
        !calendar.every(match => isRecord(match) && typeof match.type === 'string' && Number.isSafeInteger(match.round))) return { kind: 'invalid' };
    return { kind: 'ready', disk };
  } catch { return { kind: 'invalid' }; }
}

export function clubManagerDownload(raw: string): Blob | null {
  const stored = parseStoredSave(raw);
  if (stored.kind !== 'ready') return null;
  try {
    // These bytes are already stored as a career. Include decoded proof so a
    // receiving browser never has to inflate an unchecked file payload.
    const fields = compressedFields(stored.disk);
    const proof: CompressionProof = {};
    let units = 0;
    for (const key of compressedKeys) {
      const encoded = fields[key];
      if (encoded === undefined) continue;
      if (typeof encoded !== 'string') return null;
      const decoded = decompressFromUTF16(encoded);
      if (!decoded) return null;
      units += decoded.length;
      if (units > MAX_SAVE_CHARS) return null;
      proof[key] = decoded;
    }
    if (inspectSave(raw, proof).kind !== 'ready') return null;
    const envelope = { format: FILE_FORMAT, version: FILE_VERSION, save: raw, ...(Object.keys(proof).length ? { proof } : {}) };
    const file = new Blob([JSON.stringify(envelope)], { type: 'application/json' });
    return file.size <= MAX_FILE_BYTES ? file : null;
  } catch { return null; }
}

function readFileBytes(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.onabort = () => reject(new Error('File read was interrupted'));
    reader.readAsArrayBuffer(file);
  });
}

export async function readClubManagerFile(file: File): Promise<ClubManagerFile> {
  if (file.size > MAX_FILE_BYTES) return { kind: 'too-large' };
  let bytes: ArrayBuffer;
  try { bytes = await readFileBytes(file); } catch { return { kind: 'unreadable' }; }
  try {
    const envelope: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!isRecord(envelope) || envelope.format !== FILE_FORMAT || !Number.isSafeInteger(envelope.version)) return { kind: 'invalid' };
    if (envelope.version !== FILE_VERSION) return { kind: 'unsupported' };
    if (typeof envelope.save !== 'string') return { kind: 'invalid' };
    const { kind } = inspectSave(envelope.save, envelope.proof);
    if (kind !== 'ready') return { kind };
    return { kind, raw: envelope.save, ...(envelope.proof === undefined ? {} : { proof: envelope.proof as CompressionProof }) };
  } catch { return { kind: 'invalid' }; }
}

function targetKey(slot: number, index: string | null): string | null {
  if (!Number.isSafeInteger(slot) || slot < 1 || slot > SLOT_COUNT) return null;
  const active = readClubManagerResumeSlot(index);
  if (active === null || (index !== null && JSON.parse(index).v !== 1)) return null;
  return slot === active ? SAVE_KEY : parkedKey(slot);
}

function targetStatus(storage: FenceStore, target: ClubManagerImportTarget, key: string, generation = target.activeGeneration): TargetStatus {
  const sameCareer = storage.getItem(SAVE_KEY) === target.activeRaw && storage.getItem(ACTIVE_FENCE_KEY) === generation;
  if (storage.getItem(SLOTS_INDEX_KEY) !== target.index) return 'changed';
  if ((key === SAVE_KEY && storage.getItem(parkedKey(target.slot)) !== null) || storage.getItem(key) !== null) return 'occupied';
  return sameCareer ? 'ready' : 'changed';
}

export function captureClubManagerImportTarget(storage: FenceStore, slot: number): CapturedTarget {
  try {
    const index = storage.getItem(SLOTS_INDEX_KEY);
    const key = targetKey(slot, index);
    if (!key) return { kind: 'failed' };
    const activeRaw = storage.getItem(SAVE_KEY);
    const activeGeneration = storage.getItem(ACTIVE_FENCE_KEY);
    if (activeGeneration !== null && (!/^\d+$/.test(activeGeneration) || !Number.isSafeInteger(Number(activeGeneration)))) return { kind: 'failed' };
    const target = { slot, index, activeRaw, activeGeneration };
    const status = targetStatus(storage, target, key);
    return status === 'ready' ? { kind: 'ready', target } : { kind: status === 'occupied' ? 'occupied' : 'failed' };
  } catch { return { kind: 'failed' }; }
}

export async function importClubManagerSave(
  storage: FenceStore,
  target: ClubManagerImportTarget,
  file: ReadyFile,
  signal?: AbortSignal,
): Promise<ImportResult> {
  if (signal?.aborted) return 'cancelled';
  try {
    const key = targetKey(target.slot, target.index);
    if (!key) return 'failed';
    const initial = targetStatus(storage, target, key);
    if (initial !== 'ready') return initial;
    const checked = inspectSave(file.raw, file.proof);
    if (checked.kind !== 'ready') return 'invalid';

    // Load the same baked era and fixture assets as the normal opening path.
    const [engine, eras, fixtures, roster] = await Promise.all([
      import('@/lib/clubManager'), import('@/lib/clubManagerEras'), import('@/lib/clubManagerFixtures'), import('@/lib/clubManagerWorldRoster'),
    ]);
    if (signal?.aborted) return 'cancelled';
    const era = engine.savedCareerEraId(file.raw) ?? undefined;
    const fixture = engine.savedCareerFixtureKey(file.raw);
    if ((era !== undefined && !eras.CM_ERAS.some(item => item.id === era)) ||
        (fixture !== null && !fixtures.REAL_LEAGUE_FIXTURES.some(item => item.key === fixture))) return 'invalid';
    await Promise.all([eras.ensureEraRosters(era), fixtures.ensureRealLeagueFixtures(fixture)]);
    if (signal?.aborted) return 'cancelled';
    const current = targetStatus(storage, target, key);
    if (current !== 'ready') return current;

    // Loading can register league membership and a custom club. Do not leave
    // either changed, and save the original representation rather than a repair.
    const registrations = engine.engineRegistrations();
    try {
      engine.restoreEngineRegistrations({ custom: null, overrides: null });
      const opened = engine.loadCareer(file.raw);
      if (!opened || (file.proof?.worldRoster !== undefined && !roster.readWorldRoster(opened))) return 'invalid';
    } finally {
      engine.restoreEngineRegistrations(registrations);
    }
    const raw = JSON.stringify({ ...checked.disk, importedFromFile: true });
    const commitPortableFile = () => {
      try {
        storage.setItem(key, raw);
        return storage.getItem(key) === raw;
      } catch { return false; }
    };
    const final = targetStatus(storage, target, key);
    if (final !== 'ready') return final;
    if (signal?.aborted) return 'cancelled';
    if (key !== SAVE_KEY) return commitPortableFile() ? 'imported' : 'failed';

    const next = Number(target.activeGeneration ?? 0) + 1;
    if (!Number.isSafeInteger(next)) return 'failed';
    const fence = createSaveFence(storage);
    fence.adopt(key);
    let refused: ImportResult = 'failed';
    const result = fence.write(key, () => {
      const status = targetStatus(storage, target, key, String(next));
      if (signal?.aborted) { refused = 'cancelled'; return false; }
      if (status !== 'ready') { refused = status; return false; }
      return commitPortableFile();
    }, true);
    return result === 'written' ? 'imported' : result === 'moved' ? 'changed' : refused;
  } catch { return signal?.aborted ? 'cancelled' : 'failed'; }
}
