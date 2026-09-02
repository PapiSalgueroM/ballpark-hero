import type { GroupSeedLike, ThirdEntry } from '@/lib/wc2026Bracket';

export const WC2026_STORAGE_KEYS = {
  knockout: 'wc2026-knockout',
  knockoutSignature: 'wc2026-knockout-signature',
  awards: 'wc2026-awards',
} as const;

export interface Wc2026Storage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Removes saved child state without touching unrelated browser storage. */
export function clearWc2026ChildStorage(storage: Wc2026Storage, includeAwards: boolean): void {
  storage.removeItem(WC2026_STORAGE_KEYS.knockout);
  storage.removeItem(WC2026_STORAGE_KEYS.knockoutSignature);
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
