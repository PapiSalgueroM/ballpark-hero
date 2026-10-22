import { COMPETITIONS, fetchCompetitionRows, type ChampRow } from '@/lib/champOrNot';
import { SORT_LABELS } from '@/lib/silverwareSort';

/**
 * Hall of Champions (Round 252): the site's third idle game, and the
 * first one built on the audited record instead of generated people.
 *
 * You run a sports museum. Every exhibit is a real championship from the
 * same verified tables the Record Books and the quiz games read: acquire
 * the 1967 season and the plaque says who really won it, and for the
 * finals leagues, who they really beat. Ten wings, one per competition,
 * roughly nine hundred real artifacts from 1889 to now. Visitors pay
 * admission, admission buys artifacts, artifacts draw more visitors.
 *
 * House rules kept, each one load bearing:
 * - NOTHING INVENTED. An artifact exists only if its row exists in the
 *   audited tables. The catalog is fetched, never typed in, and the
 *   flavor line on a finals plaque is the verified loser and series.
 *   simHallOfChampions checks every artifact against the tables.
 * - Multipliers reach their nominal value (Round 95's rule).
 * - The save loads fail closed: a doctored save gets a fresh museum,
 *   never a printing press. Offline progress runs at half speed capped
 *   at eight hours, the same cap the other idles honor.
 * - Round 1548: fail closed means nonsense (negative, NaN, a wrong shape),
 *   never a big number, because the price curve itself carries a long
 *   museum past 1e15; and a hidden tab is away time, paid by the same rule
 *   and the same meter as a closed one (advanceClock).
 * - The screen never lies: the quoted cost is the charged cost, and a
 *   plaque's year and name render exactly what the record says.
 *
 * All logic lives here, pure, so the harness can run days of museum time
 * without a browser. The hook only glues this to React.
 */

/* ------------------------------------------------------------------ tuning */

export const SAVE_KEY = 'hallOfChampionsV1';
const SAVE_VERSION = 1;

/** offline progress: half speed, capped at eight hours (site convention) */
const OFFLINE_RATE_BASE = 0.5;
const OFFLINE_CAP_SEC = 8 * 3600;
/**
 * Round 1548: the longest gap between two clock callbacks on a VISIBLE page
 * that still counts as somebody watching. A hidden page is always away,
 * whatever the gap (see advanceClock).
 *
 * Before this round the hook ticked a fixed quarter second per callback. A
 * browser slows a hidden tab's interval to once a second and then once a
 * minute, so a museum left open in a background tab overnight earned a couple
 * of minutes, and the visibility save stamped the time as it went, so not
 * even the next load paid the night. Closing the tab would have paid eight
 * hours at half speed. Wonderkid Factory fixed the same thing in Round 581
 * (src/lib/wonderkidFactory.ts, advanceClock) and this is its rule and its
 * number: visibility decides hidden, and this bound only catches a visible
 * page that was not really running (a laptop waking from sleep), five seconds
 * being far past any honest main thread stall.
 */
export const AWAY_AFTER_MS = 5000;

/** wings in unlock order: short famous start, a quick first plaque, then
 * the long shelves. Costs are the door price to OPEN the wing. */
export const WING_ORDER: { key: string; unlock: number }[] = [
  { key: 'sb', unlock: 0 },
  { key: 'wnba', unlock: 400 },
  { key: 'cfb', unlock: 2_500 },
  { key: 'nba', unlock: 12_000 },
  { key: 'cbb', unlock: 60_000 },
  { key: 'cup', unlock: 300_000 },
  { key: 'ws', unlock: 1_500_000 },
  { key: 'epl', unlock: 8_000_000 },
  { key: 'nrl', unlock: 40_000_000 },
  { key: 'afl', unlock: 200_000_000 },
];

/** economy per wing: artifact i costs COST_BASE*mult*1.11^i and earns
 * INCOME_BASE*mult*1.055^i coins a second once on the wall. Later wings
 * carry a bigger mult on both, so opening one is a step up, not a chore. */
const COST_BASE = 10;
const INCOME_BASE = 0.35;
/**
 * The door fee. An empty museum with no income can never buy its first
 * exhibit, which is the oldest bootstrap hole in idle design and exactly
 * what the harness caught on its first run (zero exhibits after a
 * simulated day). The building itself draws a trickle: the first
 * champion goes up about ten seconds in, and the fee is irrelevant
 * within five minutes. It was 0.4 first, which made the cold open
 * twenty five seconds of watching a number, measured in a browser.
 */
const BASE_ADMISSION = 1;
/**
 * The pacing pair, and the numbers in this file that had to be right.
 * Cost must outrun income INCLUDING the milestone doubling, or the game
 * finishes itself: 1.02 * 2^(1/10) is about 1.093 of effective income
 * growth against 1.28 of cost, so every acquisition is meaningfully
 * dearer in real terms than the one before it and a wing gets steadily
 * harder instead of running away.
 *
 * The first draft had income growing FASTER than cost and the harness
 * caught it in the most useful way possible: a greedy player finished
 * all 909 exhibits in fifteen minutes. These values come from a measured
 * sweep, not a guess. Greedy play now reaches roughly 64 exhibits and 3
 * wings in a quarter hour, 240 and 7 wings in an hour, 604 in a day and
 * 688 in a week, which leaves the last couple of hundred as the long
 * game rededication is for.
 */
const COST_GROWTH = 1.28;
const INCOME_GROWTH = 1.02;
/** wing k (in unlock order) scales cost and income by WING_MULT^k */
const WING_MULT = 4;

/** milestone: every 10 artifacts in a wing doubles that wing's income */
export const MILESTONE_EVERY = 10;

/** completing a wing hangs a plaque: permanent, survives rededication */
export const PLAQUE_BONUS = 0.25;

export type UpgradeId = 'tours' | 'network' | 'shop' | 'archive';
export interface UpgradeDef {
  id: UpgradeId;
  label: string;
  emoji: string;
  base: number;
  growth: number;
  maxLevel: number;
  blurb: string;
}
export const UPGRADES: UpgradeDef[] = [
  { id: 'tours', label: 'Guided tours', emoji: '🎧', base: 120, growth: 1.7, maxLevel: 25, blurb: 'Every level adds 15% to all admission income.' },
  { id: 'network', label: "Curator's network", emoji: '🤝', base: 300, growth: 1.8, maxLevel: 12, blurb: 'Every level makes acquisitions 3% cheaper.' },
  { id: 'shop', label: 'Gift shop', emoji: '🧢', base: 800, growth: 1.85, maxLevel: 8, blurb: 'Every level adds 5% to the rate the hall earns while you are away.' },
  { id: 'archive', label: 'Archive vault', emoji: '🗄️', base: 500, growth: 1.75, maxLevel: 10, blurb: 'Anniversary rushes last 3 seconds longer per level.' },
];

export const TOURS_PER_LEVEL = 0.15;
export const NETWORK_DISCOUNT = 0.03;
export const SHOP_PER_LEVEL = 0.05;

/** the tap event: a real anniversary of something on your walls */
export const RUSH_MULT = 3;
export const RUSH_BASE_SEC = 20;
export const RUSH_ARCHIVE_SEC = 3;
export const RUSH_COOLDOWN = 150;

/** rededication (prestige): available from this many artifacts, pays one
 * renown star per 20 collected this run, each star +10% income forever */
export const REDEDICATE_MIN = 40;
export const RENOWN_PER = 20;
export const RENOWN_BONUS = 0.1;
export const MAX_RENOWN = 80;

/* ------------------------------------------------------------------- data */

export interface Artifact {
  /** `${comp}:${year}:${team}` */
  id: string;
  year: number;
  team: string;
  /** finals wings: "the Denver Broncos 42-10", straight from the record */
  beat?: string;
}

export interface Wing {
  key: string;
  emoji: string;
  /** e.g. "Super Bowl wins" (shared with Silverware Sort's labels) */
  title: string;
  unlock: number;
  costMult: number;
  incomeMult: number;
  artifacts: Artifact[];
}

/** Build the catalog from the audited tables. Pure given rows. */
export function buildCatalog(rowsByKey: Map<string, ChampRow[]>): Wing[] {
  const wings: Wing[] = [];
  WING_ORDER.forEach(({ key, unlock }, k) => {
    const def = COMPETITIONS.find(c => c.key === key);
    const rows = rowsByKey.get(key) ?? [];
    if (!def || rows.length < 8) return;
    const artifacts = [...rows]
      .sort((a, b) => a.year - b.year || a.team.localeCompare(b.team))
      .map(r => {
        const a: Artifact = { id: `${key}:${r.year}:${r.team}`, year: r.year, team: r.team };
        if (r.beat) a.beat = r.beat;
        return a;
      });
    const names = SORT_LABELS[key] ?? { title: 'titles', noun: 'titles' };
    wings.push({
      key, emoji: def.emoji, title: names.title, unlock,
      costMult: Math.pow(WING_MULT, k), incomeMult: Math.pow(WING_MULT, k),
      artifacts,
    });
  });
  return wings;
}

export async function fetchCatalog(): Promise<Wing[]> {
  const entries = await Promise.all(
    WING_ORDER.map(async ({ key }) => {
      const def = COMPETITIONS.find(c => c.key === key);
      const rows: ChampRow[] = def ? await fetchCompetitionRows(def).catch(() => []) : [];
      return [key, rows] as [string, ChampRow[]];
    }),
  );
  return buildCatalog(new Map(entries));
}

/* ------------------------------------------------------------------- state */

export interface HallState {
  v: number;
  seed: number;
  funds: number;
  /** career admissions, display only */
  careerEarned: number;
  /** artifact counts per wing key: artifacts own the FIRST n of a wing */
  owned: Record<string, number>;
  openWings: string[];
  levels: Record<UpgradeId, number>;
  renown: number;
  /** wing keys completed at any point, ever: plaques survive rededication */
  plaques: string[];
  rededications: number;
  /** rush event */
  rushUntil: number;
  rushReadyAt: number;
  /** seconds of museum time since the save was born */
  clock: number;
  /** Round 1548: wall milliseconds of the current absence already paid as
   *  away time (hidden or closed), so one absence meets one eight hour cap.
   *  Zero again on the first watched tick. Absent in older saves. */
  awayMs?: number;
  /** Round 1548: the admissions that absence has paid so far, hidden part and
   *  closed part together, so the note on the door tells the whole absence even
   *  when a hidden tab was closed. Zero again with the meter. Absent in older saves. */
  awayPaid?: number;
}

export function freshState(seed: number): HallState {
  return {
    v: SAVE_VERSION, seed, funds: 0, careerEarned: 0,
    owned: {}, openWings: [WING_ORDER[0].key],
    levels: { tours: 0, network: 0, shop: 0, archive: 0 },
    renown: 0, plaques: [], rededications: 0,
    rushUntil: 0, rushReadyAt: 60,
    clock: 0,
  };
}

/* ------------------------------------------------------------------ maths */

export function artifactCost(wing: Wing, index: number, s: HallState): number {
  const discount = Math.max(0.5, 1 - s.levels.network * NETWORK_DISCOUNT);
  return Math.ceil(COST_BASE * wing.costMult * Math.pow(COST_GROWTH, index) * discount);
}

export function upgradeCost(def: UpgradeDef, level: number): number {
  return Math.ceil(def.base * Math.pow(def.growth, level));
}

export function wingIncome(wing: Wing, s: HallState): number {
  const n = s.owned[wing.key] ?? 0;
  if (n === 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += INCOME_BASE * wing.incomeMult * Math.pow(INCOME_GROWTH, i);
  const milestones = Math.floor(n / MILESTONE_EVERY);
  return sum * Math.pow(2, milestones);
}

/** coins per second across the hall, all multipliers applied */
export function totalIncome(wings: Wing[], s: HallState, now: number): number {
  let base = BASE_ADMISSION;
  for (const w of wings) base += wingIncome(w, s);
  const tours = 1 + s.levels.tours * TOURS_PER_LEVEL;
  const renown = 1 + s.renown * RENOWN_BONUS;
  const plaques = 1 + s.plaques.length * PLAQUE_BONUS;
  const rush = now < s.rushUntil ? RUSH_MULT : 1;
  return base * tours * renown * plaques * rush;
}

/* ------------------------------------------------------------------ actions */

export function canBuyArtifact(wing: Wing, s: HallState): boolean {
  const n = s.owned[wing.key] ?? 0;
  return s.openWings.includes(wing.key)
    && n < wing.artifacts.length
    && s.funds >= artifactCost(wing, n, s);
}

/** buys the NEXT artifact of the wing (history hangs in order) */
export function buyArtifact(wing: Wing, s: HallState): Artifact | null {
  if (!canBuyArtifact(wing, s)) return null;
  const n = s.owned[wing.key] ?? 0;
  s.funds -= artifactCost(wing, n, s);
  s.owned[wing.key] = n + 1;
  if (s.owned[wing.key] === wing.artifacts.length && !s.plaques.includes(wing.key)) {
    s.plaques.push(wing.key);
  }
  return wing.artifacts[n];
}

export function canOpenWing(wing: Wing, s: HallState): boolean {
  return !s.openWings.includes(wing.key) && s.funds >= wing.unlock;
}

export function openWing(wing: Wing, s: HallState): boolean {
  if (!canOpenWing(wing, s)) return false;
  s.funds -= wing.unlock;
  s.openWings.push(wing.key);
  return true;
}

export function canBuyUpgrade(id: UpgradeId, s: HallState): boolean {
  const def = UPGRADES.find(u => u.id === id);
  if (!def) return false;
  const lvl = s.levels[id];
  return lvl < def.maxLevel && s.funds >= upgradeCost(def, lvl);
}

export function buyUpgrade(id: UpgradeId, s: HallState): boolean {
  if (!canBuyUpgrade(id, s)) return false;
  const def = UPGRADES.find(u => u.id === id)!;
  s.funds -= upgradeCost(def, s.levels[id]);
  s.levels[id] += 1;
  return true;
}

export function rushSeconds(s: HallState): number {
  return RUSH_BASE_SEC + s.levels.archive * RUSH_ARCHIVE_SEC;
}

export function canRush(s: HallState): boolean {
  return s.clock >= s.rushReadyAt && s.clock >= s.rushUntil;
}

/** tap the anniversary banner: a timed 3x on everything */
export function startRush(s: HallState): boolean {
  if (!canRush(s)) return false;
  s.rushUntil = s.clock + rushSeconds(s);
  s.rushReadyAt = s.rushUntil + RUSH_COOLDOWN;
  return true;
}

export function totalArtifacts(s: HallState): number {
  return Object.values(s.owned).reduce((a, b) => a + b, 0);
}

export function renownOnRededicate(s: HallState): number {
  return Math.min(MAX_RENOWN - s.renown, Math.floor(totalArtifacts(s) / RENOWN_PER));
}

export function canRededicate(s: HallState): boolean {
  return totalArtifacts(s) >= REDEDICATE_MIN && renownOnRededicate(s) > 0;
}

/** prestige: the walls empty, the plaques and renown stay forever */
export function rededicate(s: HallState): boolean {
  if (!canRededicate(s)) return false;
  s.renown = Math.min(MAX_RENOWN, s.renown + renownOnRededicate(s));
  s.rededications += 1;
  s.funds = 0;
  s.owned = {};
  s.openWings = [WING_ORDER[0].key];
  s.levels = { tours: 0, network: 0, shop: 0, archive: 0 };
  s.rushUntil = 0;
  s.rushReadyAt = s.clock + 60;
  return true;
}

/* -------------------------------------------------------------------- tick */

/** advance museum time. dt in seconds; offline runs at the shop rate. */
export function tick(wings: Wing[], s: HallState, dt: number, opts?: { offline?: boolean }): void {
  if (!(dt > 0)) return;
  const offline = opts?.offline === true;
  const capped = offline ? Math.min(dt, OFFLINE_CAP_SEC) : dt;
  const rate = offline ? Math.min(0.9, OFFLINE_RATE_BASE + s.levels.shop * SHOP_PER_LEVEL) : 1;
  // integrate in small steps so a rush that expires mid interval only
  // multiplies the seconds it really covered (the screen never lies)
  let left = capped;
  while (left > 0) {
    const step = Math.min(left, 5);
    const gain = totalIncome(wings, s, s.clock) * step * rate;
    s.funds += gain;
    s.careerEarned += gain;
    s.clock += step;
    left -= step;
  }
}

/** Round 1548: the part of the eight hour cap this absence has already used. */
function awayUsedMs(s: HallState): number {
  return Number.isFinite(s.awayMs) && (s.awayMs as number) > 0 ? (s.awayMs as number) : 0;
}

/**
 * Round 1548: pay `gapMs` of wall clock as away time, at the shop rate, and
 * count it on the `awayMs` meter, because a throttled tab wakes once a minute
 * and would otherwise collect a fresh eight hours on every wake. The meter
 * travels in the save, so time paid while hidden and the time a later load
 * pays are one absence under one cap. Returns the admissions it paid. Idle
 * Arena's shape (src/lib/idleArena.ts applyOffline), Wonderkid Factory's rule.
 */
export function applyAway(wings: Wing[], s: HallState, gapMs: number): number {
  const used = awayUsedMs(s);
  const left = Math.max(0, OFFLINE_CAP_SEC * 1000 - used);
  const away = Math.min(Math.max(0, Number.isFinite(gapMs) ? gapMs : 0), left);
  s.awayMs = used + away;
  const before = s.funds;
  tick(wings, s, away / 1000, { offline: true });
  const paid = s.funds - before;
  s.awayPaid = awayPaidSoFar(s) + paid;
  return paid;
}

/** Round 1548: what the current absence has paid so far (the note on the door). */
export function awayPaidSoFar(s: HallState): number {
  return Number.isFinite(s.awayPaid) && (s.awayPaid as number) > 0 ? (s.awayPaid as number) : 0;
}

/**
 * Round 1548: one callback of the hall's clock, `gapMs` of wall time after the
 * last one. On a visible page a gap up to AWAY_AFTER_MS is somebody watching:
 * full rate, and the absence meter and its takings go back to zero. A hidden page, or a
 * longer gap, is time away and goes through applyAway. The caller keeps the
 * time of the last callback and says whether the page is visible.
 */
export function advanceClock(wings: Wing[], s: HallState, gapMs: number, visible = true): { away: boolean; earned: number } {
  if (!(gapMs > 0)) return { away: false, earned: 0 };
  if (!visible || gapMs > AWAY_AFTER_MS) return { away: true, earned: applyAway(wings, s, gapMs) };
  s.awayMs = 0;
  s.awayPaid = 0;
  const before = s.funds;
  tick(wings, s, gapMs / 1000);
  return { away: false, earned: s.funds - before };
}

/** the offline welcome: how much the hall earned while away, for the toast.
 *  Round 1548: through the same meter as a hidden tab, so a museum hidden for
 *  three hours and then closed is paid one eight hour absence, not eleven. */
export function offlineReport(wings: Wing[], s: HallState, awaySec: number): { earned: number; capped: boolean } {
  const capped = awaySec * 1000 > Math.max(0, OFFLINE_CAP_SEC * 1000 - awayUsedMs(s));
  return { earned: applyAway(wings, s, awaySec * 1000), capped };
}

/* -------------------------------------------------------------------- save */

export function serialize(s: HallState, lastSeen: number): string {
  return JSON.stringify({ ...s, lastSeen });
}

/** Fail closed: anything off shape loads as null and the hook starts fresh. */
export function loadSave(raw: string | null): { state: HallState; lastSeen: number } | null {
  if (!raw) return null;
  try {
    const p: unknown = JSON.parse(raw);
    if (typeof p !== 'object' || p === null || Array.isArray(p)) return null;
    const o = p as Record<string, unknown>;
    if (o.v !== SAVE_VERSION) return null;
    const num = (x: unknown, lo: number, hi: number): number | null =>
      typeof x === 'number' && Number.isFinite(x) && x >= lo && x <= hi ? x : null;
    /* Round 1548: money is finite and non negative, with no ceiling. These
       were 1e15 and 1e18, and the museum's own prices walk every long player
       past them: about 136 of the 909 exhibits cost more than 1e15 even at
       the full network discount, so saving up for one wrote a save the next
       load refused, and the hook then wrote a fresh museum over it.
       Nonsense (negative, NaN, Infinity, a string) still loads as null. */
    const funds = num(o.funds, 0, Infinity);
    const careerEarned = num(o.careerEarned, 0, Infinity);
    const seed = num(o.seed, 0, 2 ** 31);
    const renown = num(o.renown, 0, MAX_RENOWN);
    const rededications = num(o.rededications, 0, 10000);
    const clock = num(o.clock, 0, 1e10);
    const rushUntil = num(o.rushUntil, 0, 1e10);
    const rushReadyAt = num(o.rushReadyAt, 0, 1e10);
    const lastSeen = num(o.lastSeen, 0, 4e12);
    if (funds === null || careerEarned === null || seed === null || renown === null
      || rededications === null || clock === null || rushUntil === null
      || rushReadyAt === null || lastSeen === null) return null;
    const owned: Record<string, number> = {};
    if (typeof o.owned !== 'object' || o.owned === null || Array.isArray(o.owned)) return null;
    for (const [k, v] of Object.entries(o.owned as Record<string, unknown>)) {
      if (!WING_ORDER.some(w => w.key === k)) return null;
      const n = num(v, 0, 200);
      if (n === null || !Number.isInteger(n)) return null;
      owned[k] = n;
    }
    if (!Array.isArray(o.openWings) || !o.openWings.every(k => typeof k === 'string' && WING_ORDER.some(w => w.key === k))) return null;
    if (!Array.isArray(o.plaques) || !o.plaques.every(k => typeof k === 'string' && WING_ORDER.some(w => w.key === k))) return null;
    const levels: Record<UpgradeId, number> = { tours: 0, network: 0, shop: 0, archive: 0 };
    if (typeof o.levels !== 'object' || o.levels === null) return null;
    for (const def of UPGRADES) {
      const lvl = num((o.levels as Record<string, unknown>)[def.id], 0, def.maxLevel);
      if (lvl === null || !Number.isInteger(lvl)) return null;
      levels[def.id] = lvl;
    }
    const state: HallState = {
      v: SAVE_VERSION, seed, funds, careerEarned,
      owned, openWings: [...new Set(o.openWings as string[])],
      levels, renown, plaques: [...new Set(o.plaques as string[])],
      rededications, rushUntil, rushReadyAt, clock,
    };
    if (state.openWings.length === 0) state.openWings = [WING_ORDER[0].key];
    /* Round 1548: the absence meter is optional (older saves have none) and
       is repaired rather than refused: a bad meter can only move one
       absence's cap, never the museum. */
    if (o.awayMs !== undefined) {
      const a = o.awayMs;
      state.awayMs = typeof a === 'number' && Number.isFinite(a) && a > 0 ? Math.min(a, OFFLINE_CAP_SEC * 1000) : 0;
    }
    /* Round 1548: the absence's takings so far, repaired the same way. It
       only feeds the note on the door, never the money. */
    if (o.awayPaid !== undefined) {
      const p = o.awayPaid;
      state.awayPaid = typeof p === 'number' && Number.isFinite(p) && p > 0 ? p : 0;
    }
    return { state, lastSeen };
  } catch {
    return null;
  }
}

/** Round 1548: the units past a thousand, the same ladder Idle Arena prints
 *  (src/lib/idleArena.ts SUFFIX). It stopped at T, so the last AFL exhibit,
 *  about 9e19, read "90000000T". */
const UNITS: [number, string][] = [
  [1e33, 'Dc'], [1e30, 'No'], [1e27, 'Oc'], [1e24, 'Sp'], [1e21, 'Sx'], [1e18, 'Qi'], [1e15, 'Qa'],
  [1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K'],
];

/** short money formatting for the plaques and buttons */
export function fmt(n: number): string {
  for (const [unit, name] of UNITS) {
    if (n >= unit) return `${(n / unit).toFixed(n >= unit * 10 ? 0 : 1)}${name}`;
  }
  return `${Math.floor(n)}`;
}
