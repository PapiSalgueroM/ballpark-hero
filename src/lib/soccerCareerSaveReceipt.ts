import { sumOf } from '@/lib/saveKeeper';

export const soccerCareerReceiptKey = (saveKey: string) => `${saveKey}.saved-at`;

export function readSoccerCareerSavedAt(storage: Pick<Storage, 'getItem'>, saveKey: string, raw: string): string | null {
  try {
    const receipt = JSON.parse(storage.getItem(soccerCareerReceiptKey(saveKey)) ?? 'null');
    if (!receipt || receipt.length !== raw.length || receipt.sum !== sumOf(raw)
      || typeof receipt.at !== 'string' || new Date(receipt.at).toISOString() !== receipt.at) return null;
    return receipt.at;
  } catch {
    return null;
  }
}

export function recordSoccerCareerSavedAt(
  storage: Pick<Storage, 'getItem' | 'setItem'>, saveKey: string, raw: string, now = new Date(),
): void {
  try {
    if (storage.getItem(saveKey) !== raw) return;
    storage.setItem(soccerCareerReceiptKey(saveKey), JSON.stringify({ at: now.toISOString(), length: raw.length, sum: sumOf(raw) }));
  } catch {
    // Failing to record the time does not invalidate the save.
  }
}
