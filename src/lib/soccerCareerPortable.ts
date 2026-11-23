import { createSaveFence, type FenceStore } from '@/lib/saveFence';
import { isSoccerCareerSave, parseSoccerCareerSave, UnsupportedSoccerCareerSaveVersion } from '@/lib/soccerCareerSave';
import { recordSoccerCareerSavedAt } from '@/lib/soccerCareerSaveReceipt';

const FILE_FORMAT = 'douknowball-soccer-career';
const FILE_VERSION = 1;
// Room for a browser-sized save encoded as UTF-8, including the JSON wrapper.
const MAX_FILE_BYTES = 16 * 1024 * 1024;

type ReadySaveFile = { kind: 'ready'; raw: string };
type SaveFile = ReadySaveFile | { kind: 'invalid' | 'unsupported' | 'too-large' | 'unreadable' };

function checkPayload(raw: string): 'ready' | 'invalid' | 'unsupported' {
  try { return isSoccerCareerSave(parseSoccerCareerSave(raw)) ? 'ready' : 'invalid'; }
  catch (error) { return error instanceof UnsupportedSoccerCareerSaveVersion ? 'unsupported' : 'invalid'; }
}

export function soccerCareerDownload(raw: string): Blob | null {
  if (checkPayload(raw) !== 'ready') return null;
  const file = new Blob([JSON.stringify({ format: FILE_FORMAT, version: FILE_VERSION, save: raw })], {
    type: 'application/json',
  });
  return file.size <= MAX_FILE_BYTES ? file : null;
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

export async function readSoccerCareerFile(file: File): Promise<SaveFile> {
  if (file.size > MAX_FILE_BYTES) return { kind: 'too-large' };
  let bytes: ArrayBuffer;
  try { bytes = await readFileBytes(file); } catch { return { kind: 'unreadable' }; }
  try {
    const payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (payload?.format !== FILE_FORMAT || !Number.isSafeInteger(payload.version)) return { kind: 'invalid' };
    if (payload.version !== FILE_VERSION) return { kind: 'unsupported' };
    if (typeof payload.save !== 'string') return { kind: 'invalid' };
    const kind = checkPayload(payload.save);
    return kind === 'ready' ? { kind, raw: payload.save } : { kind };
  } catch { return { kind: 'invalid' }; }
}

export function importSoccerCareerSave(storage: FenceStore, saveKey: string, file: ReadySaveFile): 'imported' | 'occupied' | 'failed' {
  const fence = createSaveFence(storage);
  fence.adopt(saveKey);
  try {
    if (storage.getItem(saveKey) !== null) return 'occupied';
    const raw = JSON.stringify({ ...JSON.parse(file.raw), importedFromFile: true });
    let occupied = false;
    const result = fence.write(saveKey, () => {
      occupied = storage.getItem(saveKey) !== null;
      if (occupied) return false;
      storage.setItem(saveKey, raw);
      return storage.getItem(saveKey) === raw;
    }, true);
    if (result === 'written') {
      recordSoccerCareerSavedAt(storage, saveKey, raw);
      return 'imported';
    }
    return occupied || storage.getItem(saveKey) !== null ? 'occupied' : 'failed';
  } catch { return 'failed'; }
}
