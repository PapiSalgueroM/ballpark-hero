export const SAVE_KEY = 'dukb-club-manager-save';
export const SLOT_COUNT = 3;
export const SLOTS_INDEX_KEY = 'dukb-cm-slots';
export const parkedKey = (slot: number): string => `dukb-cm-slot-${slot}`;

// Kept in step with the engine's save version by the manager slots harness.
export const READABLE_SAVE_VERSION = 3;
export const PARKED_PAIR_SAVE_VERSION = 'parked-pairs-1';

export function readClubManagerActiveSlot(raw: string | null): number {
  try {
    const slot = (raw ? JSON.parse(raw) : null)?.active;
    return Number.isInteger(slot) && slot >= 1 && slot <= SLOT_COUNT ? slot : 1;
  } catch { return 1; }
}

export function clubManagerRequestedSlot(search: string): number | null | undefined {
  const slots = new URLSearchParams(search).getAll('slot');
  if (slots.length === 0) return undefined;
  if (slots.length !== 1) return null;
  const slot = Number(slots[0]);
  return Number.isInteger(slot) && slot >= 1 && slot <= SLOT_COUNT && String(slot) === slots[0] ? slot : null;
}

type ReadableCareer = {
  saveVersion: number;
  pairResults?: unknown;
  pairSignature?: unknown;
  clubName: string;
  season: number;
  week: number;
  leagueClubs: string[];
  squad: unknown[];
  calendar: unknown[];
  xiIds: unknown[];
  table: unknown[];
};

export function readableClubManagerSave(value: unknown, includeParked = false): boolean {
  if (!value || typeof value !== 'object') return false;
  const c = value as Partial<Omit<ReadableCareer, 'saveVersion'>> & { saveVersion?: unknown };
  const readableVersion = c.saveVersion === READABLE_SAVE_VERSION
    || (includeParked && c.saveVersion === PARKED_PAIR_SAVE_VERSION && typeof c.pairResults === 'string'
      && Number.isSafeInteger(c.pairSignature) && c.pairSignature === pairLedgerSignature(c.pairResults));
  return readableVersion && typeof c.clubName === 'string' && typeof c.season === 'number'
    && Number.isInteger(c.week) && c.week >= 0 && Array.isArray(c.leagueClubs) && c.leagueClubs.includes(c.clubName)
    && Array.isArray(c.squad) && Array.isArray(c.calendar) && Array.isArray(c.xiIds) && Array.isArray(c.table);
}

/** Check packed bytes without loading the codec on Home. */
export function pairLedgerSignature(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
  return hash >>> 0;
}
