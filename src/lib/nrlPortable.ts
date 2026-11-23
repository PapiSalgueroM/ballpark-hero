import { NRL_SAVE_MAX_CHARS, readNrlCareerSave, type NrlCareerState } from '@/lib/nrlCareer';
import { nrlCheckpointKey } from '@/lib/nrlSaveSlots';
import { createSaveFence, fenceKeyOf, type FenceStore, type FenceWrite } from '@/lib/saveFence';

const FORMAT = 'douknowball-nrl-team-manager';
const VERSION = 1;
// A JSON string can escape one UTF-16 code unit as six ASCII bytes.
const MAX_FILE_BYTES = NRL_SAVE_MAX_CHARS * 6 + 1024;

export interface NrlCareerFile {
  raw: string;
  career: NrlCareerState;
}

export interface NrlImportTarget {
  key: string;
  generation: string | null;
}

export function nrlCareerDownload(raw: string): Blob {
  return new Blob([JSON.stringify({ format: FORMAT, version: VERSION, save: raw })], { type: 'application/json' });
}

function fileBytes(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reader.onabort = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

export async function readNrlCareerFile(file: File): Promise<NrlCareerFile | null> {
  if (file.size > MAX_FILE_BYTES) return null;
  try {
    const payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await fileBytes(file)));
    if (payload?.format !== FORMAT || payload.version !== VERSION || typeof payload.save !== 'string') return null;
    const career = readNrlCareerSave(payload.save);
    if (!career) return null;
    const raw = JSON.stringify({ ...JSON.parse(payload.save), importedFromFile: true });
    return raw.length <= NRL_SAVE_MAX_CHARS ? { raw, career } : null;
  } catch {
    return null;
  }
}

function emptyTarget(storage: FenceStore, key: string): boolean {
  return storage.getItem(key) === null && storage.getItem(nrlCheckpointKey(key)) === null;
}

export function captureNrlImportTarget(storage: FenceStore, key: string): NrlImportTarget | null {
  try {
    const generation = storage.getItem(fenceKeyOf(key));
    if (generation !== null && (!/^\d+$/.test(generation) || !Number.isSafeInteger(Number(generation) + 1))) return null;
    return emptyTarget(storage, key) ? { key, generation } : null;
  } catch {
    return null;
  }
}

export function importNrlCareerFile(storage: FenceStore, target: NrlImportTarget, file: NrlCareerFile): FenceWrite | 'unverified' {
  const { key, generation } = target;
  const generationKey = fenceKeyOf(key);
  const claimed = String(Number(generation) + 1);
  const fence = createSaveFence(storage);
  try {
    fence.adopt(key);
    if (!emptyTarget(storage, key) || storage.getItem(generationKey) !== generation) return 'moved';
    let moved = false;
    const commitImportedCareer = () => {
      try {
        if (!emptyTarget(storage, key) || storage.getItem(generationKey) !== claimed) {
          moved = true;
          return false;
        }
        storage.setItem(key, file.raw);
        return true;
      } catch {
        return false;
      }
    };
    const result = fence.write(key, commitImportedCareer, true);
    if (moved || result !== 'written') return moved ? 'moved' : result;
    // The write landed. A refused read must not put the old fence back over it.
    try {
      const active = storage.getItem(key);
      if (storage.getItem(generationKey) !== claimed || storage.getItem(nrlCheckpointKey(key)) !== null) return 'moved';
      return active === file.raw ? 'written' : 'unverified';
    } catch {
      return 'unverified';
    }
  } catch {
    return 'failed';
  }
}
