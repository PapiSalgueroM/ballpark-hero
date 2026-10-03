/**
 * Round 928: three manager slots for Club Manager.
 *
 * The engine keeps exactly one career under SAVE_KEY and nothing here changes
 * that: the career being played always lives at SAVE_KEY, so the engine, the
 * home page's continue row and every harness that reads that key see what
 * they always saw. The other two careers are parked, in the engine's own
 * lean shape, under keys of their own. A small index says which slot number
 * the career at SAVE_KEY belongs to. No index means slot 1, so a player with
 * one career today finds it in slot 1 without a single byte of it moved.
 *
 * The parked keys deliberately do not start with 'dukb-club-manager': two
 * harnesses find the save by that prefix.
 *
 * The one rule a swap keeps: the outgoing career is written to its parked
 * key BEFORE anything is removed or replaced, and every later step that the
 * browser refuses is rolled back, so a full store can stop a swap but can
 * never cost a career.
 */
import { SAVE_KEY, leanCareer, type CareerState } from './clubManager';
import { eraById, isHistoricEra, seasonLabel } from './clubManagerEras';

export const SLOT_COUNT = 3;
export const SLOTS_INDEX_KEY = 'dukb-cm-slots';
export const parkedKey = (slot: number): string => `dukb-cm-slot-${slot}`;

export interface SlotSummary {
  managerName: string | null;
  clubName: string;
  season: number;
  /** The real world season the career is in now, "2031-32". */
  worldSeason: string;
  trophies: number;
  eraId: string | null;
  /** The era the career started in, "2026-27" or "2010-11". */
  eraLabel: string;
  historic: boolean;
  sacked: boolean;
}

export interface SlotView {
  slot: number;
  active: boolean;
  /** Null when the slot is empty or holds nothing readable. */
  summary: SlotSummary | null;
  /** Something is stored there that cannot be read as a career. */
  damaged: boolean;
}

const isSlot = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= SLOT_COUNT;

function get(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

/** The slot the career at SAVE_KEY belongs to. Slot 1 when there is no
 *  index, or nothing readable in it. */
export function activeSlot(): number {
  const raw = get(SLOTS_INDEX_KEY);
  if (!raw) return 1;
  try {
    const parsed = JSON.parse(raw) as { active?: unknown } | null;
    return parsed && isSlot(parsed.active) ? parsed.active : 1;
  } catch {
    return 1;
  }
}

/** Where a slot's career is stored right now. */
export function slotStorageKey(slot: number): string {
  return slot === activeSlot() ? SAVE_KEY : parkedKey(slot);
}

/** The summary of a stored career, read with JSON.parse alone: no repair,
 *  no registration, nothing loadCareer does. Null when it is not a career. */
export function summarize(raw: string | null): SlotSummary | null {
  if (!raw) return null;
  try {
    const c = JSON.parse(raw) as Partial<CareerState> | null;
    if (!c || typeof c !== 'object' || typeof c.clubName !== 'string' || typeof c.season !== 'number') return null;
    const eraId = typeof c.eraId === 'string' ? c.eraId : null;
    const era = eraById(eraId ?? undefined);
    const start = typeof c.startYear === 'number' ? c.startYear : era.startYear;
    const name = c.manager && typeof c.manager.name === 'string' && c.manager.name.trim() ? c.manager.name.trim() : null;
    return {
      managerName: name,
      clubName: c.clubName,
      season: c.season,
      worldSeason: seasonLabel(start + Math.max(0, c.season - 1)),
      trophies: Array.isArray(c.trophies) ? c.trophies.length : 0,
      eraId,
      eraLabel: era.label,
      historic: isHistoricEra(eraId ?? undefined),
      sacked: c.sacked === true,
    };
  } catch {
    return null;
  }
}

/** Every slot, in order, read without opening a single save. */
export function readSlots(): SlotView[] {
  const active = activeSlot();
  const out: SlotView[] = [];
  for (let slot = 1; slot <= SLOT_COUNT; slot++) {
    const raw = get(slot === active ? SAVE_KEY : parkedKey(slot));
    const summary = summarize(raw);
    out.push({ slot, active: slot === active, summary, damaged: !!raw && !summary });
  }
  return out;
}

/** The era a slot's career plays in, so the page can fetch its squads before
 *  the save is opened. Null for an empty slot, a damaged one, or a save from
 *  before eras were stored (today's world). */
export function slotEraId(slot: number): string | null {
  return summarize(get(slotStorageKey(slot)))?.eraId ?? null;
}

/** The bytes a career is parked in: the lean shape, from the career in
 *  memory when the caller has it (the freshest truth), else from SAVE_KEY.
 *  A stored value that is not a career is parked exactly as it is, so even an
 *  unreadable save is never thrown away by a swap. Null when SAVE_KEY is empty. */
function parkedBytes(outgoing: CareerState | null | undefined): string | null {
  if (outgoing) return JSON.stringify(leanCareer(outgoing));
  const raw = get(SAVE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CareerState | null;
    if (parsed && typeof parsed === 'object' && typeof parsed.clubName === 'string') return JSON.stringify(leanCareer(parsed));
  } catch {
    /* not JSON: parked as is */
  }
  return raw;
}

function writeIndex(slot: number): void {
  if (slot === 1) localStorage.removeItem(SLOTS_INDEX_KEY);
  else localStorage.setItem(SLOTS_INDEX_KEY, JSON.stringify({ v: 1, active: slot }));
}

/**
 * Make `slot` the active one. The career at SAVE_KEY (or `outgoing`, the same
 * career as held in memory) is parked first; then the index moves; then the
 * target's parked copy is written to SAVE_KEY (or SAVE_KEY is emptied, for an
 * empty slot); then the target's parked copy is dropped, because it lives at
 * SAVE_KEY now. Any refused step undoes the ones before it and the answer is
 * false, with every career where it was. True when the slot is active.
 */
export function switchSlot(slot: number, outgoing?: CareerState | null): boolean {
  if (!isSlot(slot)) return false;
  const from = activeSlot();
  if (slot === from) return true;
  const target = get(parkedKey(slot));
  const park = parkedBytes(outgoing);
  /* 1. Park the outgoing career. Nothing has been removed yet. */
  try {
    if (park !== null) localStorage.setItem(parkedKey(from), park);
    else localStorage.removeItem(parkedKey(from));
  } catch {
    return false;
  }
  const undoPark = () => { try { localStorage.removeItem(parkedKey(from)); } catch { /* a removal is not refused for space */ } };
  /* 2. The index. */
  try {
    writeIndex(slot);
  } catch {
    undoPark();
    return false;
  }
  /* 3. The incoming career takes SAVE_KEY. */
  try {
    if (target !== null) localStorage.setItem(SAVE_KEY, target);
    else localStorage.removeItem(SAVE_KEY);
  } catch {
    try { writeIndex(from); } catch { /* the same size it was a moment ago */ }
    undoPark();
    return false;
  }
  /* 4. Its parked copy is now a duplicate. */
  try { localStorage.removeItem(parkedKey(slot)); } catch { /* harmless if it stays */ }
  return true;
}

/** Delete one slot's career for good. The active slot's goes from SAVE_KEY
 *  (the caller clears the engine's registrations, see clearCareer). */
export function deleteSlot(slot: number): void {
  if (!isSlot(slot)) return;
  try {
    localStorage.removeItem(slot === activeSlot() ? SAVE_KEY : parkedKey(slot));
  } catch {
    /* ignore */
  }
}
