export const SAVE_KEY = 'dukb-club-manager-save';
export const SLOT_COUNT = 3;
export const SLOTS_INDEX_KEY = 'dukb-cm-slots';
export const CLUB_MANAGER_ACTIVE_RESUME_QUERY = '?resume=active';
export type ClubManagerSlotRequest = number | 'active' | null;
export const parkedKey = (slot: number): string => `dukb-cm-slot-${slot}`;

// Kept in step with the engine's save version by the manager slots harness.
export const READABLE_SAVE_VERSION = 3;
export const PARKED_PAIR_SAVE_VERSION = 'parked-pairs-1';

export function readClubManagerActiveSlot(raw: string | null): number {
  return readClubManagerResumeSlot(raw) ?? 1;
}

/** An absent index belongs to legacy slot one. A malformed index cannot be resumed directly. */
export function readClubManagerResumeSlot(raw: string | null): number | null {
  if (raw === null) return 1;
  try {
    const slot = JSON.parse(raw)?.active;
    return Number.isInteger(slot) && slot >= 1 && slot <= SLOT_COUNT ? slot : null;
  } catch { return null; }
}

export function clubManagerRequestedSlot(search: string): ClubManagerSlotRequest | undefined {
  const params = new URLSearchParams(search);
  const slots = params.getAll('slot');
  const resume = params.getAll('resume');
  if (resume.length) return resume.length === 1 && resume[0] === 'active' && !slots.length ? 'active' : null;
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

/** Check the stored pair bytes before decompressing them. */
export function pairLedgerSignature(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
  return hash >>> 0;
}
