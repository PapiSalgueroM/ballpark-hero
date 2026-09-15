/**
 * Round 585: gems and packs. The only file that writes the gem ledger
 * (docs/design/round-580-tycoon-merge.md, section 6).
 *
 * THE RULES, each one held by scripts/simTycoonPacks.mjs.
 * - Gems are earned only by match results: a watched win, a watched draw, a win played
 *   while you were away, a league title and second place. Nothing else writes
 *   `earned`: not taps, idle money, away pay, whistles, sales, badges, logins,
 *   adverts, purchases or packs. No gem is ever for sale.
 * - Every full time is credited once, keyed on the career match count, so a
 *   full time replayed by a second tab or a reload pays nothing.
 * - A pack's tier is drawn from the published odds in PACKS
 *   (src/lib/wonderkidFactory.ts) on this ledger's own generator. A guarantee
 *   makes a Star or better arrive on or before the Nth pack since the last one.
 * - The draw is written here, as `pending`, before the reveal starts, so a
 *   reload shows the same kid and nothing is drawn twice. The academy counts the
 *   delivery (packsDelivered), so a pack is delivered once.
 *
 * Pure functions take a ledger and return a new one; the few functions that
 * touch storage say so in their names (load, record, commit, clear).
 */
import { PACKS, TIERS, TIER_IDS, GUARANTEED_TIERS, cleanPackKid, MAX_BOOT_LEVEL } from '@/lib/wonderkidFactory';
import type { PackId, Pack, TierId, Prospect } from '@/lib/wonderkidFactory';
import { BOOT_IDS } from '@/lib/soccerBootIds';
export { MAX_BOOT_LEVEL } from '@/lib/wonderkidFactory';

export const REWARDS_KEY = 'tycoonRewardsV1';

/** What each result pays, in gems. */
export const GEM_PAY = { win: 3, draw: 1, loss: 0, awayWin: 1, title: 20, runnerUp: 6 } as const;

export interface PendingPack { seq: number; pack: PackId; tier: TierId; kid: Prospect }

export interface RewardsLedger {
  v: 1;
  /** gems ever earned */
  earned: number;
  /** gems ever spent on packs */
  spent: number;
  /** the career match count of the last full time credited */
  lastMatch: number;
  /** packs opened, per pack */
  opened: Record<PackId, number>;
  /** packs of each kind opened since the last Star or better */
  dry: Record<PackId, number>;
  /** this ledger's own generator, so a pack never moves the academy's scouts.
   *  Seeded fresh the first time a ledger is stored, never a shared constant: the
   *  review found every player drawing the same packs in the same order. */
  seed: number;
  /** the sequence number the next pack will carry */
  nextSeq: number;
  /** a pack drawn and not yet dismissed */
  pending: PendingPack | null;
  /** Round 588: prospective title rewards, absent in untouched older ledgers. */
  gearUnlocked?: string[];
  gearLevel?: Record<string, number>;
  kitUpgrades?: number;
  /** First credited title match in each division, zero until one is observed. */
  gearTitles?: number[];
}

export const GEAR_DIVISIONS = 10;

const PACK_IDS: PackId[] = PACKS.map(p => p.id);
const zeroes = (): Record<PackId, number> => ({ scout: 0, club: 0, elite: 0 });

export function newLedger(seed = 585): RewardsLedger {
  return { v: 1, earned: 0, spent: 0, lastMatch: 0, opened: zeroes(), dry: zeroes(), seed: seed | 0, nextSeq: 1, pending: null };
}

/** A seed no other player shares, for a ledger stored for the first time. The
 *  only place this file reads a clock or Math.random; the draw never does. */
export function freshSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 2147483647)) | 0;
}

export function balance(l: RewardsLedger): number {
  return Math.max(0, l.earned - l.spent);
}

export function packById(id: PackId): Pack {
  return PACKS.find(p => p.id === id) as Pack;
}

/** Packs opened in all. */
export function packsOpened(l: RewardsLedger): number {
  return PACK_IDS.reduce((n, id) => n + l.opened[id], 0);
}

/** What this pack costs this ledger now: the first of a free pack costs nothing. */
export function priceOf(l: RewardsLedger, id: PackId): number {
  const pack = packById(id);
  return pack.firstFree && l.opened[id] === 0 ? 0 : pack.price;
}

/** Packs left before a guaranteed Star or better, counting the next one, or null. */
export function packsToGuarantee(l: RewardsLedger, id: PackId): number | null {
  const g = packById(id).guarantee;
  return g === null ? null : Math.max(1, g - l.dry[id]);
}

/** A ledger from storage, fail closed: anything wrong comes back sane. */
export function cleanLedger(raw: unknown, seedIfMissing = 585): RewardsLedger {
  const base = newLedger(seedIfMissing);
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<RewardsLedger>;
  if (r.v !== 1) return base;
  const whole = (v: unknown, max = Number.MAX_SAFE_INTEGER) => (Number.isSafeInteger(v) && (v as number) >= 0 ? Math.min(v as number, max) : 0);
  const earned = whole(r.earned, 1e9);
  const out: RewardsLedger = {
    v: 1,
    earned,
    spent: Math.min(whole(r.spent, 1e9), earned),
    lastMatch: whole(r.lastMatch),
    opened: zeroes(),
    dry: zeroes(),
    seed: Number.isFinite(r.seed) ? (r.seed as number) | 0 : base.seed,
    nextSeq: 1,
    pending: null,
  };
  for (const id of PACK_IDS) {
    out.opened[id] = whole(r.opened?.[id], 1e9);
    const g = packById(id).guarantee;
    out.dry[id] = g === null ? whole(r.dry?.[id], 1e9) : Math.min(whole(r.dry?.[id]), g - 1);
  }
  out.nextSeq = Math.max(packsOpened(out) + 1, Number.isSafeInteger(r.nextSeq) && (r.nextSeq as number) > 0 ? Math.min(r.nextSeq as number, 1e9) : 1);
  const p = r.pending;
  if (p && typeof p === 'object' && Number.isSafeInteger(p.seq) && p.seq > 0 && p.seq < out.nextSeq
    && PACK_IDS.includes(p.pack) && TIER_IDS.includes(p.tier) && p.kid && typeof p.kid === 'object' && typeof p.kid.name === 'string') {
    const kid = cleanPackKid(p.kid, p.tier);
    if (kid) out.pending = { seq: p.seq, pack: p.pack, tier: p.tier, kid };
  }
  if (r.gearUnlocked !== undefined || r.gearLevel !== undefined || r.kitUpgrades !== undefined || r.gearTitles !== undefined) {
    const receipts = new Set<number>();
    out.gearTitles = Array.from({ length: GEAR_DIVISIONS }, (_, division) => {
      const match = Array.isArray(r.gearTitles) ? r.gearTitles[division] : 0;
      if (!Number.isSafeInteger(match) || match <= 0 || match > out.lastMatch || receipts.has(match)) return 0;
      receipts.add(match);
      return match;
    });
    out.gearUnlocked = [];
    out.gearLevel = {};
    if (receipts.size > 0 && Array.isArray(r.gearUnlocked)) {
      for (const id of BOOT_IDS) {
        if (r.gearUnlocked[out.gearUnlocked.length] !== id || out.gearUnlocked.length >= out.lastMatch) break;
        out.gearUnlocked.push(id);
        const level = Object.prototype.hasOwnProperty.call(r.gearLevel ?? {}, id) ? r.gearLevel?.[id] : 1;
        out.gearLevel[id] = Number.isSafeInteger(level) && level! >= 1 ? Math.min(level!, MAX_BOOT_LEVEL) : 1;
      }
    }
    out.kitUpgrades = receipts.size > 0 ? whole(r.kitUpgrades, Math.min(out.lastMatch, 1e9)) : 0;
  }
  return out;
}

/* ---------------------------------------------------------------- earning */

export interface FullTime {
  /** the career match count once this match is over */
  totalMatches: number;
  result: 'win' | 'draw' | 'loss';
  /** played while you were away */
  away: boolean;
  /** your final league place, when this full time ended a season */
  position?: number;
  /** The division that just finished, before a title promotes the club. */
  division?: number;
}

/** The gems one full time pays. Away matchdays never end a season. */
export function gemsFor(ft: FullTime): number {
  if (ft.away) return ft.result === 'win' ? GEM_PAY.awayWin : 0;
  const result = ft.result === 'win' ? GEM_PAY.win : ft.result === 'draw' ? GEM_PAY.draw : GEM_PAY.loss;
  const table = ft.position === 1 ? GEM_PAY.title : ft.position === 2 ? GEM_PAY.runnerUp : 0;
  return result + table;
}

/** Credit full times in order. One already credited (its match count at or under
 *  the last one) pays nothing. */
export function creditFullTimes(l: RewardsLedger, list: FullTime[], allowGear = true): RewardsLedger {
  let out = l;
  for (const ft of list) {
    if (!Number.isSafeInteger(ft.totalMatches) || ft.totalMatches <= out.lastMatch) continue;
    out = { ...out, earned: Math.min(1e9, out.earned + gemsFor(ft)), lastMatch: ft.totalMatches };
    if (allowGear && !ft.away && ft.position === 1 && Number.isInteger(ft.division) && ft.division! >= 0 && ft.division! < GEAR_DIVISIONS) {
      const division = ft.division!;
      const titles = [...(out.gearTitles ?? Array(GEAR_DIVISIONS).fill(0))];
      const unlocked = out.gearUnlocked ?? [];
      const unlock = unlocked.length < BOOT_IDS.length && (!titles[division] || division === GEAR_DIVISIONS - 1);
      if (!titles[division]) titles[division] = ft.totalMatches;
      out = { ...out, gearTitles: titles, gearUnlocked: unlocked, gearLevel: out.gearLevel ?? {}, kitUpgrades: out.kitUpgrades ?? 0 };
      if (unlock) {
        const id = BOOT_IDS[unlocked.length];
        out.gearUnlocked = [...unlocked, id];
        out.gearLevel = { ...out.gearLevel, [id]: 1 };
      } else {
        out.kitUpgrades = Math.min(1e9, out.kitUpgrades! + 1);
      }
    }
  }
  return out;
}

/** A kit upgrade raises one owned pair. It never costs gems or changes its wearer. */
export function upgradeBoot(l: RewardsLedger, id: string): RewardsLedger | null {
  const level = l.gearLevel?.[id];
  if (!BOOT_IDS.some(bootId => bootId === id) || !l.gearUnlocked?.includes(id)
    || !Number.isInteger(level) || level! < 1 || level! >= MAX_BOOT_LEVEL
    || !Number.isSafeInteger(l.kitUpgrades) || l.kitUpgrades! < 1) return null;
  return { ...l, gearLevel: { ...l.gearLevel, [id]: level! + 1 }, kitUpgrades: l.kitUpgrades! - 1 };
}

/* ------------------------------------------------------------------ packs */

/** mulberry32 on the ledger's seed, the academy's own generator shape. */
export function ledgerRng(seed: number): { next: () => number; seed: () => number } {
  let s = seed | 0;
  return {
    next: () => {
      s = (s + 0x6d2b79f5) | 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    seed: () => s,
  };
}

/** Draw a tier from a pack's published odds. When the guarantee is due, the draw
 *  is from the Star or better tiers only, in their published proportions. */
export function drawTier(pack: Pack, dry: number, roll: () => number): TierId {
  const due = pack.guarantee !== null && dry >= pack.guarantee - 1;
  const pool = TIER_IDS.filter(t => pack.odds[t] > 0 && (!due || GUARANTEED_TIERS.includes(t)));
  const total = pool.reduce((n, t) => n + pack.odds[t], 0);
  let x = roll() * total;
  for (const t of pool) {
    x -= pack.odds[t];
    if (x < 0) return t;
  }
  return pool[pool.length - 1];
}

/** Whether this ledger can open this pack into an academy with or without a bed. */
export function canOpen(l: RewardsLedger, id: PackId, bedFree: boolean): boolean {
  return bedFree && l.pending === null && balance(l) >= priceOf(l, id);
}

/** Open a pack: pay, draw the tier, make the kid, and hold him as pending. Pure.
 *  `makeKid` is the academy's generator with the tier's band; it gets this
 *  ledger's random source, never the academy's. */
export function openPack(
  l: RewardsLedger, id: PackId, bedFree: boolean,
  makeKid: (potMin: number, potMax: number, rng: () => number) => Prospect,
  minSeq = 0,
): RewardsLedger | null {
  if (!canOpen(l, id, bedFree)) return null;
  const pack = packById(id);
  const rng = ledgerRng(l.seed);
  const tier = drawTier(pack, l.dry[id], rng.next);
  const band = TIERS.find(t => t.id === tier) as (typeof TIERS)[number];
  const kid = makeKid(band.potMin, band.potMax, rng.next);
  const opened = { ...l.opened, [id]: l.opened[id] + 1 };
  const hit = GUARANTEED_TIERS.includes(tier);
  return {
    ...l,
    spent: l.spent + priceOf(l, id),
    opened,
    dry: { ...l.dry, [id]: hit ? 0 : l.dry[id] + 1 },
    seed: rng.seed(),
    /* Review: the academy counts deliveries by this number, so it must run past
       whatever the academy has already seen, even when the ledger was lost. */
    nextSeq: Math.max(l.nextSeq, minSeq) + 1,
    pending: { seq: Math.max(l.nextSeq, minSeq), pack: id, tier, kid },
  };
}

/* ---------------------------------------------------------------- storage */

const listeners = new Set<() => void>();
let cached: { raw: string | null; ledger: RewardsLedger } | null = null;
/** Set when storage refuses a write, so gems at least last for this visit. */
let memoryOnly = false;

/** The ledger as stored. The same object comes back until storage changes, so a
 *  React store can subscribe to it. */
export function loadLedger(): RewardsLedger {
  if (memoryOnly && cached) {
    try {
      const raw = localStorage.getItem(REWARDS_KEY);
      let parsed: unknown = null;
      try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = null; }
      const stored = cleanLedger(parsed);
      const gearKeys = ['gearUnlocked', 'gearLevel', 'kitUpgrades', 'gearTitles'] as const;
      if (gearKeys.some(key => JSON.stringify(cached!.ledger[key]) !== JSON.stringify(stored[key]))) {
        // Keep visit-only gems, but a deleted ledger cannot leave equipment behind.
        const ledger = { ...cached.ledger };
        for (const key of gearKeys) delete ledger[key];
        Object.assign(ledger, Object.fromEntries(gearKeys.filter(key => stored[key] !== undefined).map(key => [key, stored[key]])));
        cached = { ...cached, ledger };
      }
    } catch { /* a blocked read keeps only the previously saved gear */ }
    return cached.ledger;
  }
  let raw: string | null = null;
  try { raw = localStorage.getItem(REWARDS_KEY); } catch { raw = null; }
  if (cached && cached.raw === raw) return cached.ledger;
  let parsed: unknown = null;
  try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = null; }
  cached = { raw, ledger: cleanLedger(parsed) };
  return cached.ledger;
}

function saveLedger(l: RewardsLedger, mustPersist = false): void {
  const raw = JSON.stringify(l);
  try {
    localStorage.setItem(REWARDS_KEY, raw);
    memoryOnly = false;
  } catch (error) {
    if (mustPersist) throw error;
    memoryOnly = true; /* storage blocked: gems last for this visit only */
  }
  cached = { raw, ledger: l };
  for (const fn of listeners) fn();
}

/** The stored ledger for a writer: a ledger never stored before gets its own seed. */
function ledgerToWrite(): RewardsLedger {
  let stored = true;
  try { stored = memoryOnly || localStorage.getItem(REWARDS_KEY) !== null; } catch { stored = false; }
  const l = loadLedger();
  return stored ? l : { ...l, seed: freshSeed() };
}

export function subscribeLedger(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** Credit full times to the stored ledger. Returns the gems they paid. */
export function recordFullTimes(list: FullTime[], allowGear = true, onGearSaveFailure?: () => void): number {
  const before = ledgerToWrite();
  let after = creditFullTimes(before, list, allowGear);
  if (after !== before) {
    if (after.gearTitles !== before.gearTitles) {
      try { saveLedger(after, true); } catch {
        // Gems keep their visit-only fallback; unsaved gear never reaches the UI.
        after = creditFullTimes(before, list, false);
        saveLedger(after);
        onGearSaveFailure?.();
      }
    } else saveLedger(after);
  }
  return after.earned - before.earned;
}

/** Store the upgraded pair before subscribers or its wearer see the new level. */
export function commitUpgradeBoot(id: string): boolean {
  const next = upgradeBoot(loadLedger(), id);
  if (!next) return false;
  saveLedger(next, true);
  return true;
}

/** Open a pack against the stored ledger and store the draw before anything is
 *  shown. Returns the pending pack, or null when it cannot be opened. A refused
 *  storage write throws before any balance or pending draw changes in memory. */
export function commitOpenPack(
  id: PackId, bedFree: boolean,
  makeKid: (potMin: number, potMax: number, rng: () => number) => Prospect,
  minSeq = 0,
): PendingPack | null {
  const next = openPack(ledgerToWrite(), id, bedFree, makeKid, minSeq);
  if (!next) return null;
  saveLedger(next, true);
  return next.pending;
}

/** The reveal was dismissed. Only a pack the academy has delivered can be: the
 *  review found "Welcome him in" deleting a kid who never reached a bed. */
export function clearPendingPack(deliveredUpTo: number): boolean {
  const l = loadLedger();
  if (!l.pending || deliveredUpTo < l.pending.seq) return false;
  saveLedger({ ...l, pending: null });
  return true;
}
