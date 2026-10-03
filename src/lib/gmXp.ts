/**
 * Round 942: one XP ladder for every manager seat.
 *
 * Club Manager has had manager XP and seven skill trees since Round 513. The GM
 * sims had nothing: a GM who built a champion and a GM who lost for five years
 * walked into the same office. The owner's rule (2026-09-04, "one engine, many
 * sports") says a new seat is data plus its own events, not a copied engine, so
 * this file is the part of clubManagerXp.ts that was never about football: the
 * level curve and the spending of points, written over a tree list passed in.
 *
 * clubManagerXp.ts now delegates to it. That move is fenced by
 * scripts/data/cmXpFixture.json, recorded from origin/main before a line moved,
 * and replayed by scripts/simGmXp.mjs section 1: Club Manager must not change by
 * one point, at any level, for any spend.
 *
 * The GM trees live here too, as data, with the one number each of them moves.
 *
 * Everything here is pure. Nothing draws from Math.random, nothing reads a
 * clock, and nothing is evaluated from an import at module scope, because
 * clubManagerXp.ts imports this file and clubManager.ts imports that one.
 */

/* ================================================================== */
/* The curve                                                          */
/* ================================================================== */

/*
 * Round 513's numbers, unchanged and now shared. 400 XP for level 2 and each
 * level 4 percent dearer than the last: the first point inside a season, ten
 * points at about eight seasons, the whole board at roughly fifty. The first
 * draft's 1.35 step made the full board cost 41 million XP, which is why the
 * step is measured rather than felt (simManagerXp section 6).
 */
export const XP_FIRST_LEVEL = 400;
export const XP_LEVEL_STEP = 1.04;

/** A set of trees: their ids, in screen order, and the most points one takes. */
export interface XpTreeSet<T extends string> {
  trees: readonly T[];
  maxPoints: number;
}

/** What a seat's save keeps: total XP earned (never spent down) and points per tree. */
export interface XpBlock<T extends string> {
  v: number;
  xp: number;
  points: Record<T, number>;
}

/** One level per point, after the first. Nothing beyond this is earnable. */
export function maxLevelOf<T extends string>(set: XpTreeSet<T>): number {
  return 1 + set.trees.length * set.maxPoints;
}

/** Total XP needed to REACH this level. Level 1 is where everybody starts. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  let total = 0;
  let step = XP_FIRST_LEVEL;
  for (let l = 2; l <= level; l++) {
    total += step;
    step = Math.round(step * XP_LEVEL_STEP);
  }
  return total;
}

/** The level this much XP has bought, capped so the trees cannot be overfilled. */
export function levelFor(xp: number, maxLevel: number): number {
  let level = 1;
  while (level < maxLevel && xp >= xpForLevel(level + 1)) level += 1;
  return level;
}

/** One point a level, after the first. */
export function pointsEarned(xp: number, maxLevel: number): number {
  return levelFor(xp, maxLevel) - 1;
}

/** How far through the current level, 0 to 1, for a bar on the screen. */
export function levelProgress(xp: number, maxLevel: number): number {
  const level = levelFor(xp, maxLevel);
  if (level >= maxLevel) return 1;
  const floor = xpForLevel(level);
  const ceiling = xpForLevel(level + 1);
  if (ceiling <= floor) return 1;
  return Math.max(0, Math.min(1, (xp - floor) / (ceiling - floor)));
}

/* ================================================================== */
/* Points                                                             */
/* ================================================================== */

/** Every tree at zero, in the set's own order (the order a save writes them in). */
export function zeroPoints<T extends string>(set: XpTreeSet<T>): Record<T, number> {
  const out = {} as Record<T, number>;
  for (const t of set.trees) out[t] = 0;
  return out;
}

/** Every tree present, a whole number, inside 0 to the cap. Fails closed on anything else. */
export function isValidPoints<T extends string>(set: XpTreeSet<T>, p: unknown): p is Record<T, number> {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return false;
  const o = p as Record<string, unknown>;
  return set.trees.every(t => {
    const n = o[t];
    return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= set.maxPoints;
  });
}

/** The points in one tree, clamped to the cap, which is the only input an effect takes. */
export function clampTreePoints<T extends string>(set: XpTreeSet<T>, block: XpBlock<T>, tree: T): number {
  const n = block.points[tree];
  return Math.max(0, Math.min(set.maxPoints, n));
}

/** Add a season's earnings. Pure: returns the new block, never mutates. */
export function addXp<B extends { xp: number }>(block: B, amount: number): B {
  const add = Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0;
  return { ...block, xp: block.xp + add };
}

export function pointsSpent<T extends string>(set: XpTreeSet<T>, block: XpBlock<T>): number {
  return set.trees.reduce((n, t) => n + Math.max(0, block.points[t] ?? 0), 0);
}

export function pointsFree<T extends string>(set: XpTreeSet<T>, block: XpBlock<T>): number {
  return Math.max(0, pointsEarned(block.xp, maxLevelOf(set)) - pointsSpent(set, block));
}

/**
 * Put a point in. Returns null when it cannot be done, the shape every engine
 * action uses, so a hook's `?? prev` leaves the save alone. Points are never
 * refunded: a tree you can undo is not a decision.
 */
export function spendPoint<T extends string, B extends XpBlock<T>>(set: XpTreeSet<T>, block: B, tree: string): B | null {
  if (!(set.trees as readonly string[]).includes(tree)) return null;
  if (pointsFree(set, block) <= 0) return null;
  const now = block.points[tree as T] ?? 0;
  if (now >= set.maxPoints) return null;
  return { ...block, points: { ...block.points, [tree]: now + 1 } };
}

/* ================================================================== */
/* The GM trees                                                       */
/* ================================================================== */

/*
 * Seven trees, the same count and the same five point cap as Club Manager, so a
 * GM's board is exactly as long as a manager's and the curve above fills it at
 * the same pace. Round 513's three rules carry over word for word:
 *
 * 1. NEUTRAL AT ZERO. Every effect below returns what it was given when the tree
 *    is empty, so a GM who never opens the screen plays today's game.
 * 2. EVERY POINT MOVES A NUMBER THE GAME ALREADY READS. Each effect takes the
 *    number the shared front office engine already computes (a prospect grade's
 *    fog, an agent's ask, a cut's dead money, a year's growth, a rival's trade
 *    premium, a graded season's trust change, a press gamble's odds) and hands
 *    back the adjusted one.
 * 3. EVERY POINT, NOT JUST THE LAST. Every effect is a scale rather than a race
 *    to a clamp, so points 1 to 5 each move it. scripts/simGmXp.mjs walks every
 *    step against the real numbers the front office produces.
 */
export type GmTree =
  | 'scouting' | 'negotiation' | 'capCraft' | 'development'
  | 'trading' | 'ownership' | 'media';

export const GM_TREES: readonly GmTree[] = [
  'scouting', 'negotiation', 'capCraft', 'development', 'trading', 'ownership', 'media',
];

export const GM_MAX_TREE_POINTS = 5;

export const GM_TREE_SET: XpTreeSet<GmTree> = { trees: GM_TREES, maxPoints: GM_MAX_TREE_POINTS };

/** Seven trees at five points each, the same 36 levels Club Manager has. */
export const GM_MAX_LEVEL = 1 + GM_TREES.length * GM_MAX_TREE_POINTS;

export interface GmTreeDef {
  id: GmTree;
  label: string;
  emoji: string;
  /** What a point buys, in the words a GM would use. */
  blurb: string;
  /** What the fifth point has bought. */
  atMax: string;
  /** When the tree actually pays, shown on the tile so nobody buys a point blind. */
  needs: string;
}

export const GM_TREE_INFO: Record<GmTree, GmTreeDef> = {
  scouting: {
    id: 'scouting', label: 'Scouting', emoji: '\u{1F52D}',
    blurb: 'Your draft board reads prospects closer to what they really are.',
    atMax: 'The fog on a prospect grade is half what it is on day one.',
    needs: 'Pays on draft night, while you read the board.',
  },
  negotiation: {
    id: 'negotiation', label: 'Negotiation', emoji: '\u{1F91D}',
    blurb: 'Agents open nearer what their man is actually worth.',
    atMax: 'About a tenth off the opening ask on a new deal.',
    needs: 'Only pays when you sign or extend somebody.',
  },
  capCraft: {
    id: 'capCraft', label: 'Cap craft', emoji: '\u{1F9EE}',
    blurb: 'You build contracts so a release hurts the cap less.',
    atMax: 'Cutting a man leaves about a fifth less dead money behind.',
    needs: 'Only pays when you release somebody still under contract.',
  },
  development: {
    id: 'development', label: 'Development', emoji: '\u{1F331}',
    blurb: 'Young players grow a little faster, never past their ceiling.',
    atMax: 'About a quarter more growth a year, still capped by potential.',
    needs: 'Pays on young players with room left to grow.',
  },
  trading: {
    id: 'trading', label: 'Trading', emoji: '\u{1F501}',
    blurb: 'Other front offices ask a smaller premium in trade talks.',
    atMax: 'A rival asks about 40 percent less over value.',
    needs: 'Only pays while you are in trade talks.',
  },
  ownership: {
    id: 'ownership', label: 'Ownership', emoji: '\u{1F3DB}\u{FE0F}',
    blurb: 'A season that misses the ask costs you less trust upstairs.',
    atMax: 'A missed mandate costs about a third less trust.',
    needs: 'Only pays in a season that falls short of the ask.',
  },
  media: {
    id: 'media', label: 'Media', emoji: '\u{1F3A4}',
    blurb: 'Your gambles at the podium land more often.',
    atMax: 'A candid or bold answer lands 15 points more often.',
    needs: 'Only pays when you gamble with a candid or bold answer.',
  },
};

/* ================================================================== */
/* The GM block on a save                                             */
/* ================================================================== */

export const GM_XP_VERSION = 1;

export type GmXp = XpBlock<GmTree>;

export function defaultGmXp(): GmXp {
  return { v: GM_XP_VERSION, xp: 0, points: zeroPoints(GM_TREE_SET) };
}

/*
 * Fails closed on shape. The block is OPTIONAL on every GM save (a save written
 * before Round 942 has none), so absent and mangled both read as a fresh block,
 * and only this block resets: nothing else on the save is touched.
 */
export function isValidGmXp(u: unknown): u is GmXp {
  if (!u || typeof u !== 'object' || Array.isArray(u)) return false;
  const o = u as Record<string, unknown>;
  if (o.v !== GM_XP_VERSION) return false;
  if (typeof o.xp !== 'number' || !Number.isFinite(o.xp) || o.xp < 0) return false;
  return isValidPoints(GM_TREE_SET, o.points);
}

/** The block for reading, never writing: a component cannot mutate a save through it. */
export function gmXpOf(u: unknown): GmXp {
  return isValidGmXp(u) ? u : defaultGmXp();
}

export function gmTreePoints(u: unknown, tree: GmTree): number {
  return clampTreePoints(GM_TREE_SET, gmXpOf(u), tree);
}

export function gmLevel(u: unknown): number {
  return levelFor(gmXpOf(u).xp, GM_MAX_LEVEL);
}

export function gmPointsFree(u: unknown): number {
  return pointsFree(GM_TREE_SET, gmXpOf(u));
}

/** Spend one point. Null when it cannot be done, so `?? prev` keeps the save. */
export function spendGmPoint(u: unknown, tree: string): GmXp | null {
  return spendPoint(GM_TREE_SET, gmXpOf(u), tree);
}
