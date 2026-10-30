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
import { SAVE_KEY, leanCareer, saveCareer, trimCareer, worldSeasonLabel, type CareerState } from './clubManager';
import { eraById, isHistoricEra } from './clubManagerEras';
import { levelFrom, noSackFrom } from '@/lib/clubManagerStart';
import type { DifficultyLevel } from '@/lib/managerDifficulty';
import { saveFence } from '@/lib/saveFence';
import { SET_ASIDE_SLOT_KEY, copyAside, type ListableStorage } from '@/lib/brokenSaveRecovery';
import { CONTINUE_SAVES } from '@/data/continueSaves';
import { clearSlotPoints } from '@/lib/cmSavePointsStore';

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
  /** Round 1342: present, and true, only on a No sacking career. */
  noSack?: true;
  /** Round 1501: present only on a career off Medium (Round 1512: any of the other four levels). */
  level?: Exclude<DifficultyLevel, 'normal'>;
  /** Round 1343: present, and true, only on a career that has retired. */
  retired?: true;
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

/** The engine's SAVE_VERSION (clubManager.ts keeps it private). Round 928
 *  review: clubManagerSlots.test.ts fails the day the two part. */
export const READABLE_SAVE_VERSION = 3;

/** The summary of a stored career, read with JSON.parse alone: no repair,
 *  no registration, nothing loadCareer does. Null when it is not a career.
 *  Review: held to the same shape test loadCareer applies before it opens a
 *  save, so a tile never offers Resume Career on a save that will not open
 *  (it shows as unreadable instead, with Clear it behind a confirm). */
export function summarize(raw: string | null): SlotSummary | null {
  if (!raw) return null;
  try {
    const c = JSON.parse(raw) as Partial<CareerState> | null;
    if (!c || typeof c !== 'object' || typeof c.clubName !== 'string' || typeof c.season !== 'number') return null;
    if (
      c.saveVersion !== READABLE_SAVE_VERSION ||
      !Array.isArray(c.squad) || !Array.isArray(c.calendar) || !Array.isArray(c.xiIds) || !Array.isArray(c.table)
    ) return null;
    const eraId = typeof c.eraId === 'string' ? c.eraId : null;
    const era = eraById(eraId ?? undefined);
    const name = c.manager && typeof c.manager.name === 'string' && c.manager.name.trim() ? c.manager.name.trim() : null;
    return {
      managerName: name,
      clubName: c.clubName,
      season: c.season,
      /* Review: the engine's own label, fallback and all, not a second copy. */
      worldSeason: worldSeasonLabel(c as CareerState),
      trophies: Array.isArray(c.trophies) ? c.trophies.length : 0,
      eraId,
      eraLabel: era.label,
      historic: isHistoricEra(eraId ?? undefined),
      sacked: c.sacked === true,
      ...(noSackFrom(c as CareerState) !== null ? { noSack: true as const } : {}),
      ...(levelFrom(c as CareerState) !== 'normal' ? { level: levelFrom(c as CareerState) as Exclude<DifficultyLevel, 'normal'> } : {}),
      ...(c.retired && typeof c.retired === 'object' ? { retired: true as const } : {}),
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
  /* Round 1323: a page whose career another tab has played on since touches
     nothing, not even the parked key (src/lib/saveFence.ts). */
  if (saveFence.moved(SAVE_KEY)) return false;
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
  /* 3. The incoming career takes SAVE_KEY, through the fence (Round 1323), so
     the page that swaps holds the new generation and every other tab is stale.
     The write inside keeps the name switchSlot: it is this swap's second
     refusal, as scripts/simStorageWrites.mjs has always counted it. */
  const took = saveFence.write(SAVE_KEY, function switchSlot() {
    try {
      if (target !== null) localStorage.setItem(SAVE_KEY, target);
      else localStorage.removeItem(SAVE_KEY);
      return true;
    } catch {
      return false;
    }
  });
  if (took !== 'written') {
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
  const key = slot === activeSlot() ? SAVE_KEY : parkedKey(slot);
  const remove = (): boolean => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  };
  /* Round 1323: the active slot's career is fenced; a parked key only ever
     changes in a swap. */
  if (key === SAVE_KEY) saveFence.write(SAVE_KEY, remove);
  else remove();
}

/* ---------------- Round 1592: a career handed in from another game ---------------- */

/*
 * Report fe949903: a player kept a Manager Hot Seat job, carried it on, and
 * lost his Club Manager career with two slots empty, because the carry wrote
 * straight over the career at SAVE_KEY. A career that starts outside Club
 * Manager now goes in by Club Manager's own rule (startNew in
 * useClubManager.ts): the first slot that is empty, never one that holds a
 * career (an unreadable save counts as a career, as on the managers screen).
 *
 * Only with all three slots full may it take one, and only the slot the
 * player picked on a screen that named its career: that career is kept aside
 * first, the same kept aside copy a fresh start makes, marked with its slot,
 * so the put back card on Club Manager's page offers it back there. Either
 * way the slot's old save points and score record go (Round 1513), so the
 * new career never lists another career's points or loses a season score.
 *
 * The swap's one rule holds: nothing is removed or replaced until the new
 * career is safely written, and a refused step puts every career back.
 */
export type HandOverResult =
  | { ok: true; slot: number; backupKey: string | null }
  | { ok: false; why: 'full' | 'changed' | 'failed' };

/** The first slot with nothing stored in it, or null when all three hold a career. */
export function freeSlot(views: SlotView[] = readSlots()): number | null {
  return views.find(v => !v.summary && !v.damaged)?.slot ?? null;
}

function listable(): ListableStorage | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
}

/** The career written to a parked key in saveCareer's shape, retried lean. False when refused. */
function writeParked(slot: number, career: CareerState): boolean {
  const full = trimCareer(career);
  try {
    localStorage.setItem(parkedKey(slot), JSON.stringify(full));
    return true;
  } catch {
    /* once more, lean */
  }
  try {
    localStorage.setItem(parkedKey(slot), JSON.stringify(leanCareer(full)));
    return true;
  } catch {
    return false;
  }
}

/** Puts a key back to the value it had, null meaning absent. Never throws. */
function putBack(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* it was that size a moment ago */ }
}

/**
 * Hands `career` to Club Manager. ok names the slot it went into and, for a
 * replaced career, the key its kept aside copy is under. 'full' when every
 * slot holds a career and no slot was named; 'changed' when the named slot no
 * longer holds the career the player was shown; 'failed' when the browser
 * refused a step (every career is then where it was).
 */
export function handOverCareer(career: CareerState, replace?: SlotView): HandOverResult {
  const failed = { ok: false, why: 'failed' } as const;
  /* A page whose Club Manager career another tab has played on since touches nothing. */
  if (saveFence.moved(SAVE_KEY)) return failed;
  const views = readSlots();
  const from = activeSlot();
  const free = freeSlot(views);
  if (free !== null) {
    if (free === from) {
      /* The active slot is empty: SAVE_KEY holds nothing to lose. */
      if (!saveCareer(career)) return failed;
    } else {
      /* Written to the free slot's own key first, so a refused write moves
         nothing; then the routine swap, which parks the career being played. */
      if (!writeParked(free, career)) return failed;
      if (!switchSlot(free)) {
        putBack(parkedKey(free), null);
        return failed;
      }
    }
    clearSlotPoints(free, listable());
    return { ok: true, slot: free, backupKey: null };
  }
  if (!replace) return { ok: false, why: 'full' };
  const named = views[replace.slot - 1];
  if (!named || named.damaged !== replace.damaged || JSON.stringify(named.summary) !== JSON.stringify(replace.summary)) {
    return { ok: false, why: 'changed' };
  }
  const entry = CONTINUE_SAVES.find(e => e.saveKey === SAVE_KEY);
  const store = listable();
  if (!entry || !store) return failed;
  const slot = replace.slot;
  if (slot !== from && !switchSlot(slot)) return failed;
  const marks = get(SET_ASIDE_SLOT_KEY);
  const copy = copyAside(entry, store);
  if (!copy.ok || copy.backupKey === null || !saveCareer(career)) {
    if (copy.ok && copy.backupKey) putBack(copy.backupKey, null);
    putBack(SET_ASIDE_SLOT_KEY, marks);
    if (slot !== from) switchSlot(from);
    return failed;
  }
  clearSlotPoints(slot, store);
  return { ok: true, slot, backupKey: copy.backupKey };
}
