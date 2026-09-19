import type { GroupSeedLike, ThirdEntry } from '@/lib/wc2026Bracket';

export const WC2026_STORAGE_KEYS = {
  knockout: 'wc2026-knockout',
  knockoutSignature: 'wc2026-knockout-signature',
  awards: 'wc2026-awards',
  /* Round 399: the champion whose completion was already recorded. */
  crowned: 'wc2026-crowned',
} as const;

export interface Wc2026Storage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Round 643: the names a bracket has already crowned, read from the stored
 * value. A value written before Round 643 is one plain name (the last
 * champion only) and reads back as a list of one; anything unreadable reads
 * as none, so a wiped or tampered key can never block a first crowning.
 */
export function parseCrowned(raw: string | null): string[] {
  if (!raw) return [];
  if (!raw.startsWith('[')) return [raw];
  try {
    const list: unknown = JSON.parse(raw);
    return Array.isArray(list) ? list.filter((name): name is string => typeof name === 'string' && name !== '') : [];
  } catch {
    return [];
  }
}

/**
 * Round 643: crowning `champion`. Returns the list to store when this is a
 * name the bracket has not crowned before, which is the one moment a
 * completion is recorded, and null when it has. Keeping only the last name,
 * as before, recorded A again after A, then B, then A.
 */
export function crownChampion(crowned: readonly string[], champion: string): string[] | null {
  if (!champion || crowned.includes(champion)) return null;
  return [...crowned, champion];
}

/** Removes saved child state without touching unrelated browser storage. */
export function clearWc2026ChildStorage(storage: Wc2026Storage, includeAwards: boolean): void {
  storage.removeItem(WC2026_STORAGE_KEYS.knockout);
  storage.removeItem(WC2026_STORAGE_KEYS.knockoutSignature);
  storage.removeItem(WC2026_STORAGE_KEYS.crowned);
  if (includeAwards) storage.removeItem(WC2026_STORAGE_KEYS.awards);
}

/** Stable identity for the group seeds and qualified thirds that feed a bracket. */
export function wc2026SeedSignature(
  seeds: Record<string, GroupSeedLike>,
  thirds: ThirdEntry[],
): string {
  const seedRows = Object.keys(seeds).sort().map(letter => [letter, seeds[letter].first, seeds[letter].second]);
  const thirdRows = thirds.map(entry => [entry.group, entry.team]);
  return JSON.stringify([seedRows, thirdRows]);
}

export interface AutoFillController {
  start(): number;
  schedule(generation: number, callback: () => void, delayMs: number): void;
  cancel(): void;
}

/** Owns every delayed write in one Auto Fill Everything run. */
export function createAutoFillController(): AutoFillController {
  let generation = 0;
  const timers = new Set<ReturnType<typeof setTimeout>>();

  const cancel = () => {
    generation += 1;
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
  };

  return {
    start() {
      cancel();
      return generation;
    },
    schedule(runGeneration, callback, delayMs) {
      const timer = setTimeout(() => {
        timers.delete(timer);
        if (runGeneration === generation) callback();
      }, delayMs);
      timers.add(timer);
    },
    cancel,
  };
}
