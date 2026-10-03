/**
 * Round 943: facilities for every manager seat, one engine with the
 * buildings as data.
 *
 * Club Manager has had a facility ladder since Round 467
 * (src/lib/clubManagerFacilities.ts): four buildings, levels 1 to 10, a cost
 * step table times a building factor, and one bounded effect per building
 * that does exactly nothing at level 1, so a save that never opens the desk
 * plays the game the earlier rounds balanced. This is the neutral core of
 * that shape, lifted out of the soccer save so the GM sims, the college
 * dynasties, the fight gym and Australian football can carry it. Club
 * Manager itself is not touched by this round and keeps its own module.
 *
 * What is new against the Club Manager ladder, because the brief asks for it:
 *   - an upgrade takes time. It is paid when the work starts, it takes the
 *     pack's build periods for that level, and only one project runs at a
 *     time, so the order you build in is a decision;
 *   - every building has a running cost a period (upkeep), which the books
 *     (src/lib/gmBooks.ts) charge;
 *   - the summer finishes whatever is being built, because an offseason is
 *     long enough to pour concrete, and the season's spend resets.
 *
 * The packs live in src/data/gmFacilities/packs.ts. A pack names its
 * buildings, its ladder, its money and what a period is. Every effect is
 * neutral + step x (level - 1), rounded to the pack's digits, and
 * scripts/simGmFacilities.mjs walks every level of every building in every
 * pack to prove each step moves its consumer.
 *
 * Saves: the block is optional on whatever save carries it, and a block that
 * fails isValidFacilities resets to the day one levels on its own, leaving the
 * rest of the save alone.
 */

export interface FacilityEffect {
  /** The value the engine reads, e.g. 'growthMult'. */
  key: string;
  /** What it is, in plain words, e.g. 'Growth'. */
  label: string;
  /** The value at level 1: exactly the game with no building. */
  neutral: number;
  /** Change per level above 1. Negative for a value that shrinks. */
  step: number;
  /** Decimal places the value is rounded to. */
  digits: number;
  /** The line at level 1. */
  atNeutral: string;
  /** The line above level 1, from the value at this level. */
  line: (value: number, level: number) => string;
}

export interface FacilityDef {
  id: string;
  label: string;
  emoji: string;
  blurb: string;
  /** Bricks cost more than a physio: the ladder times this. */
  costFactor: number;
  effects: FacilityEffect[];
}

export interface FacilityPack {
  id: string;
  label: string;
  /** How money reads on this pack's screen, e.g. '$M'. */
  unit: string;
  /** What one tick of the clock is called: 'week' or 'round'. */
  period: string;
  maxLevel: number;
  /** Cost from level L to L plus 1 before the factor, index L minus 1. */
  costStep: number[];
  /** Periods the build to level L plus 1 takes, index L minus 1. */
  buildPeriods: number[];
  /** Day one level by market tier: big, middle, small. */
  startLevel: [number, number, number];
  /** Running cost a period for one building, per level it stands at. */
  upkeepPerLevel: number;
  /** One good season's income on this pack's money, and how it was found. */
  goodSeasonIncome: number;
  goodSeasonSource: string;
  facilities: FacilityDef[];
}

export interface FacilityBuild {
  id: string;
  toLevel: number;
  periodsLeft: number;
  cost: number;
}

export interface GmFacilitiesState {
  v: number;
  pack: string;
  levels: Record<string, number>;
  build: FacilityBuild | null;
  /** Money spent on upgrades this season. Reset each summer. */
  seasonSpend: number;
}

export type MarketTier = 1 | 2 | 3;

export const GM_FACILITIES_VERSION = 1;

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const roundTo = (n: number, digits: number): number => {
  const k = 10 ** digits;
  return Math.round(n * k) / k;
};
/** Money is kept to the thousandth of a unit ($1k on a $M pack), so it adds exactly. */
const money3 = (n: number): number => Math.round(n * 1000) / 1000;

export function facilityDef(pack: FacilityPack, id: string): FacilityDef | undefined {
  return pack.facilities.find(f => f.id === id);
}

/** Day one levels from the market tier alone. Deterministic, so a harness can say what a seat opens on. */
export function facilityStartLevels(pack: FacilityPack, tier: MarketTier): Record<string, number> {
  const start = clamp(Math.round(pack.startLevel[tier - 1] ?? 1), 1, pack.maxLevel);
  const out: Record<string, number> = {};
  for (const f of pack.facilities) out[f.id] = start;
  return out;
}

export function newFacilities(pack: FacilityPack, tier: MarketTier): GmFacilitiesState {
  return { v: GM_FACILITIES_VERSION, pack: pack.id, levels: facilityStartLevels(pack, tier), build: null, seasonSpend: 0 };
}

const isLevel = (pack: FacilityPack, n: unknown): n is number =>
  typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= pack.maxLevel;

const isMoney = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;

function isValidBuild(pack: FacilityPack, b: unknown, levels: Record<string, unknown>): boolean {
  if (b === null) return true;
  if (!b || typeof b !== 'object' || Array.isArray(b)) return false;
  const o = b as Record<string, unknown>;
  const def = typeof o.id === 'string' ? facilityDef(pack, o.id) : undefined;
  return !!def
    && isLevel(pack, o.toLevel) && o.toLevel === (levels[def.id] as number) + 1
    && typeof o.periodsLeft === 'number' && Number.isInteger(o.periodsLeft) && o.periodsLeft >= 1
    && isMoney(o.cost);
}

/** True when the block is exactly the shape this round writes, for this pack. */
export function isValidFacilities(pack: FacilityPack, f: unknown): f is GmFacilitiesState {
  if (!f || typeof f !== 'object' || Array.isArray(f)) return false;
  const o = f as Record<string, unknown>;
  if (o.v !== GM_FACILITIES_VERSION || o.pack !== pack.id) return false;
  const levels = o.levels;
  if (!levels || typeof levels !== 'object' || Array.isArray(levels)) return false;
  const lv = levels as Record<string, unknown>;
  if (Object.keys(lv).length !== pack.facilities.length) return false;
  if (!pack.facilities.every(d => isLevel(pack, lv[d.id]))) return false;
  return isValidBuild(pack, o.build, lv) && isMoney(o.seasonSpend);
}

/** The block for reading: a missing or mangled one reads as the day one levels, and only this block resets. */
export function facilitiesOf(pack: FacilityPack, f: unknown, tier: MarketTier): GmFacilitiesState {
  return isValidFacilities(pack, f) ? f : newFacilities(pack, tier);
}

export function facilityLevel(pack: FacilityPack, f: GmFacilitiesState, id: string): number {
  return isLevel(pack, f.levels[id]) ? f.levels[id] : 1;
}

/** Every level's price in one list, index L minus 1 is the step from L to L plus 1. */
export function facilityCostLadder(pack: FacilityPack, id: string, scale = 1): number[] {
  const def = facilityDef(pack, id);
  if (!def) return [];
  return pack.costStep.map(step => Math.max(0.001, money3(step * def.costFactor * scale)));
}

/** What the next level costs, or null at the top. `scale` follows a league's money as it grows. */
export function facilityUpgradeCost(pack: FacilityPack, f: GmFacilitiesState, id: string, scale = 1): number | null {
  const level = facilityLevel(pack, f, id);
  if (level >= pack.maxLevel) return null;
  return facilityCostLadder(pack, id, scale)[level - 1] ?? null;
}

/** Every building from level 1 to the top, the number the harness holds against a good season. */
export function fullBuildOutCost(pack: FacilityPack, scale = 1): number {
  return money3(pack.facilities.reduce((n, d) => n + facilityCostLadder(pack, d.id, scale).reduce((a, b) => a + b, 0), 0));
}

/** Why a build cannot start, or null when it can. `funds` is what the seat may spend on buildings. */
export function upgradeRefusal(pack: FacilityPack, f: GmFacilitiesState, id: string, funds: number, scale = 1): string | null {
  const def = facilityDef(pack, id);
  if (!def) return 'No such building here.';
  if (f.build) {
    const busy = facilityDef(pack, f.build.id);
    return `The builders are on the ${busy ? busy.label.toLowerCase() : 'site'} for ${f.build.periodsLeft} more ${pack.period}${f.build.periodsLeft === 1 ? '' : 's'}.`;
  }
  const cost = facilityUpgradeCost(pack, f, id, scale);
  if (cost === null) return `The ${def.label.toLowerCase()} is already at level ${pack.maxLevel}.`;
  if (funds < cost) return `It needs ${cost} ${pack.unit} and the budget has ${money3(Math.max(0, funds))} left.`;
  return null;
}

/**
 * Start the next level. Paid now, finished after the pack's build periods.
 * Never mutates the block it was handed; null when upgradeRefusal says no.
 */
export function startUpgrade(
  pack: FacilityPack, f: GmFacilitiesState, id: string, funds: number, scale = 1,
): { state: GmFacilitiesState; cost: number; line: string } | null {
  if (upgradeRefusal(pack, f, id, funds, scale) !== null) return null;
  const def = facilityDef(pack, id) as FacilityDef;
  const level = facilityLevel(pack, f, id);
  const cost = facilityUpgradeCost(pack, f, id, scale) as number;
  const periods = Math.max(1, Math.round(pack.buildPeriods[level - 1] ?? 1));
  const state: GmFacilitiesState = {
    ...f,
    levels: { ...f.levels },
    build: { id, toLevel: level + 1, periodsLeft: periods, cost },
    seasonSpend: money3(f.seasonSpend + cost),
  };
  const line = `${def.emoji} Work starts on the ${def.label.toLowerCase()}: level ${level + 1} of ${pack.maxLevel}, ready in ${periods} ${pack.period}${periods === 1 ? '' : 's'}.`;
  return { state, cost, line };
}

function finishBuild(pack: FacilityPack, f: GmFacilitiesState): { state: GmFacilitiesState; line: string | null } {
  const b = f.build;
  if (!b) return { state: f, line: null };
  const def = facilityDef(pack, b.id);
  const state: GmFacilitiesState = { ...f, levels: { ...f.levels, [b.id]: b.toLevel }, build: null };
  return { state, line: def ? `${def.emoji} The ${def.label.toLowerCase()} is open at level ${b.toLevel}.` : null };
}

/** One period passes: the build moves on a period and opens when it reaches zero. */
export function tickFacilities(pack: FacilityPack, f: GmFacilitiesState): { state: GmFacilitiesState; line: string | null } {
  if (!f.build) return { state: f, line: null };
  if (f.build.periodsLeft > 1) return { state: { ...f, build: { ...f.build, periodsLeft: f.build.periodsLeft - 1 } }, line: null };
  return finishBuild(pack, f);
}

/**
 * The summer. The buildings belong to the club: stay and they carry, with
 * any build finished over the break and the season's spend reset; move and
 * the new club's own buildings are read on its first look (undefined here).
 */
export function rolloverFacilities(pack: FacilityPack, f: unknown, moving: boolean): GmFacilitiesState | undefined {
  if (moving || !isValidFacilities(pack, f)) return undefined;
  return { ...finishBuild(pack, f).state, seasonSpend: 0 };
}

/* ---------- the effects, each exactly neutral at level 1 ---------- */

export function effectValueAt(effect: FacilityEffect, level: number): number {
  return roundTo(effect.neutral + effect.step * (level - 1), effect.digits);
}

/** What one effect of one building reads at the block's level. A building the pack lacks reads neutral. */
export function facilityEffect(pack: FacilityPack, f: GmFacilitiesState, id: string, key: string): number | null {
  const effect = facilityDef(pack, id)?.effects.find(e => e.key === key);
  if (!effect) return null;
  return effectValueAt(effect, facilityLevel(pack, f, id));
}

/** One line per effect, saying what the level does today. */
export function facilityEffectLines(pack: FacilityPack, f: GmFacilitiesState, id: string): string[] {
  const def = facilityDef(pack, id);
  if (!def) return [];
  const level = facilityLevel(pack, f, id);
  return def.effects.map(e => (level <= 1 ? e.atNeutral : e.line(effectValueAt(e, level), level)));
}

/**
 * Running cost a period: one building, or every building when id is omitted.
 * Charged per level ABOVE 1, so a building at level 1 costs what the game
 * already charged before this round (nothing), the same rule as the effects.
 */
export function upkeepPerPeriod(pack: FacilityPack, f: GmFacilitiesState, id?: string, scale = 1): number {
  const ids = id ? [id] : pack.facilities.map(d => d.id);
  return money3(ids.reduce((n, x) => n + pack.upkeepPerLevel * (facilityLevel(pack, f, x) - 1) * scale, 0));
}
