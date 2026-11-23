import { compressToUTF16, decompressFromUTF16 } from 'lz-string';
import { PARKED_PAIR_SAVE_VERSION, READABLE_SAVE_VERSION, pairLedgerSignature, readableClubManagerSave } from './clubManagerSaveKeys';
import type { CareerState } from './clubManager';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Encode the full pair ledger using the existing on-disk shape. */
export function packCareerPairs(career: CareerState): string | null {
  if (career.saveVersion !== READABLE_SAVE_VERSION || !isRecord(career.pairResults)) return null;
  const pairs = compressToUTF16(JSON.stringify(career.pairResults));
  return JSON.stringify({
    ...career,
    saveVersion: PARKED_PAIR_SAVE_VERSION,
    pairResults: pairs,
    pairSignature: pairLedgerSignature(pairs),
  });
}

export function serializeParkedCareer(career: CareerState): string {
  const plain = JSON.stringify(career);
  const packed = packCareerPairs(career);
  return packed && packed.length < plain.length ? packed : plain;
}

export function isPackedParkedCareer(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && value.saveVersion === PARKED_PAIR_SAVE_VERSION;
}

export function restoreParkedCareer(career: unknown): CareerState | null {
  if (!isPackedParkedCareer(career) || !readableClubManagerSave(career, true) || typeof career.pairResults !== 'string') return null;
  try {
    const text = decompressFromUTF16(career.pairResults);
    if (!text) return null;
    const pairs: unknown = JSON.parse(text);
    if (!isRecord(pairs) || !Object.values(pairs).every(league =>
      isRecord(league) && Object.values(league).every(score =>
        Array.isArray(score) && score.length === 2 && score.every(value => Number.isSafeInteger(value) && value >= 0),
      ),
    )) return null;
    const plain = { ...career };
    delete plain.pairSignature;
    return { ...plain, saveVersion: READABLE_SAVE_VERSION, pairResults: pairs } as unknown as CareerState;
  } catch { return null; }
}

/** Legacy/current plain bytes pass through. null means a known packed save is damaged. */
export function unpackParkedCareer(raw: string): string | null {
  let career: unknown;
  try { career = JSON.parse(raw); } catch { return raw; }
  if (!isPackedParkedCareer(career)) return raw;
  const restored = restoreParkedCareer(career);
  return restored ? JSON.stringify(restored) : null;
}
