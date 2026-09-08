/**
 * Round 513: manager XP and the skill trees, spec section 28.
 *
 * His list, and the spec's own shape: XP earned from wins, trophies, board
 * objectives, youth promotion, successful transfers, European success and
 * overperformance, spent across seven trees (Tactics, Recruitment, Negotiation,
 * Youth, Man Management, Finance, Media). And the line that decides whether any
 * of it is worth building: "Every skill point must have visible gameplay
 * effects."
 *
 * THE TWO RULES THIS FILE IS WRITTEN TO.
 *
 * 1. NEUTRAL AT ZERO. Round 95's rule, and it is not negotiable: a manager who
 *    has spent nothing must get exactly the game that shipped before this
 *    round. Every effect below returns its identity (1 for a multiplier, 0 for
 *    a bonus) at zero points, so an old save, a fresh save and a manager who
 *    ignores the whole screen are all playing today's game.
 * 2. EVERY POINT MOVES A NUMBER THE GAME ALREADY READS. No tree adds a parallel
 *    system. Recruitment tightens the valuation band Round 506 built,
 *    Negotiation moves the patience and the convergence Round 506 measured, Man
 *    Management moves the promise ladder's own morale swing. That is what makes
 *    a point visible, and it is also what makes it MEASURABLE, because the
 *    harness can read the same number the engine reads.
 *
 * Everything here is pure. Nothing draws from Math.random and nothing is
 * evaluated at module scope, because clubManager.ts imports this file and this
 * file imports clubManager.ts for its types.
 */
import type { CareerState } from '@/lib/clubManager';

/* ================================================================== */
/* The trees                                                          */
/* ================================================================== */

export type SkillTree =
  | 'tactics' | 'recruitment' | 'negotiation' | 'youth'
  | 'manManagement' | 'finance' | 'media';

export const SKILL_TREES: SkillTree[] = [
  'tactics', 'recruitment', 'negotiation', 'youth', 'manManagement', 'finance', 'media',
];

/** The most points one tree will take. Seven trees, so 35 points is everything. */
export const MAX_TREE_POINTS = 5;

export interface TreeDef {
  id: SkillTree;
  label: string;
  emoji: string;
  /** What a point buys, in the words a manager would use. */
  blurb: string;
  /** What the fifth point has bought you, for the screen to show. */
  atMax: string;
}

export const TREE_INFO: Record<SkillTree, TreeDef> = {
  tactics: {
    id: 'tactics',
    label: 'Tactics',
    emoji: '\u{1F4CB}',
    blurb: 'Your duties get more out of the men carrying them.',
    atMax: 'Duties are worth about half as much again as they are on day one.',
  },
  recruitment: {
    id: 'recruitment',
    label: 'Recruitment',
    emoji: '\u{1F50D}',
    blurb: 'Your read on what a player is worth gets tighter.',
    atMax: 'You get a figure where the desk used to give you a range.',
  },
  negotiation: {
    id: 'negotiation',
    label: 'Negotiation',
    emoji: '\u{1F91D}',
    blurb: 'Sellers stay at the table longer and come down faster.',
    atMax: 'Two more rounds of talks, and the ask closes half again as quickly.',
  },
  youth: {
    id: 'youth',
    label: 'Youth',
    emoji: '\u{1F393}',
    blurb: 'The academy finds better boys and reads them more accurately.',
    atMax: 'Intake reports are as tight as a top scout writes them.',
  },
  manManagement: {
    id: 'manManagement',
    label: 'Man Management',
    emoji: '\u{1F5E3}',
    blurb: 'A promise you break costs you less of the dressing room.',
    atMax: 'A broken promise stings about a third less than it does on day one.',
  },
  finance: {
    id: 'finance',
    label: 'Finance',
    emoji: '\u{1F4B0}',
    blurb: 'Every matchday brings a little more through the gate.',
    atMax: 'About a tenth more money a head on every home crowd.',
  },
  media: {
    id: 'media',
    label: 'Media',
    emoji: '\u{1F3A4}',
    blurb: 'The press room warms to you faster and cools slower.',
    atMax: 'The papers give you the benefit of the doubt for a week longer.',
  },
};

/* ================================================================== */
/* The block on the save                                              */
/* ================================================================== */

export const XP_VERSION = 1;

export interface ManagerXp {
  /** Shape version of this block. */
  v: number;
  /** Total XP earned across the whole career, never spent down. */
  xp: number;
  /** Points put into each tree. */
  points: Record<SkillTree, number>;
}

export function defaultXp(): ManagerXp {
  return {
    v: XP_VERSION,
    xp: 0,
    points: { tactics: 0, recruitment: 0, negotiation: 0, youth: 0, manManagement: 0, finance: 0, media: 0 },
  };
}

/** Fails closed on shape: anything unrecognised is replaced by a fresh block. */
export function isValidXp(u: unknown): u is ManagerXp {
  if (!u || typeof u !== 'object' || Array.isArray(u)) return false;
  const o = u as Record<string, unknown>;
  if (o.v !== XP_VERSION) return false;
  if (typeof o.xp !== 'number' || !Number.isFinite(o.xp) || o.xp < 0) return false;
  const p = o.points as Record<string, unknown> | undefined;
  if (!p || typeof p !== 'object' || Array.isArray(p)) return false;
  return SKILL_TREES.every(t => {
    const n = p[t];
    return typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= MAX_TREE_POINTS;
  });
}

/** The block for READING, never writing, so a component cannot mutate a save. */
export function xpOf(state: CareerState): ManagerXp {
  return isValidXp(state.managerXp) ? state.managerXp : defaultXp();
}

/** How many points this tree has, which is the only input every effect takes. */
export function treePoints(state: CareerState, tree: SkillTree): number {
  const n = xpOf(state).points[tree];
  return Math.max(0, Math.min(MAX_TREE_POINTS, n));
}

/* ================================================================== */
/* Earning it                                                         */
/* ================================================================== */

/*
 * The rates are per SEASON and are settled at the rollover, where every one of
 * these numbers is already known and already counted for something else. They
 * are deliberately weighted toward the things the spec names as achievements
 * rather than toward volume: a season of thirty eight games pays less than one
 * trophy, because a manager who wins nothing for four years should not out-earn
 * one who wins a league.
 */
export const XP_PER_WIN = 3;
export const XP_PER_TROPHY = 120;
export const XP_PER_OBJECTIVE = 60;
export const XP_PER_PLACE_OVERPERFORMED = 25;
export const XP_PER_YOUTH_PROMOTED = 40;
export const XP_PER_EURO_ROUND = 50;
export const XP_FOR_PROFIT = 40;

export interface XpAward {
  wins: number;
  trophies: number;
  objectives: number;
  overperformance: number;
  youth: number;
  europe: number;
  profit: number;
  total: number;
}

/**
 * What a season was worth. Pure over plain numbers rather than over the state,
 * so the harness can drive it directly and the caller stays the only thing that
 * has to know where each figure lives.
 */
export function seasonXp(input: {
  wins: number;
  trophies: number;
  objectivesMet: number;
  placesAboveExpectation: number;
  youthPromoted: number;
  euroRoundsReached: number;
  soldMoreThanBought: boolean;
}): XpAward {
  const wins = Math.max(0, Math.round(input.wins)) * XP_PER_WIN;
  const trophies = Math.max(0, Math.round(input.trophies)) * XP_PER_TROPHY;
  const objectives = Math.max(0, Math.round(input.objectivesMet)) * XP_PER_OBJECTIVE;
  const overperformance = Math.max(0, Math.round(input.placesAboveExpectation)) * XP_PER_PLACE_OVERPERFORMED;
  const youth = Math.max(0, Math.round(input.youthPromoted)) * XP_PER_YOUTH_PROMOTED;
  const europe = Math.max(0, Math.round(input.euroRoundsReached)) * XP_PER_EURO_ROUND;
  const profit = input.soldMoreThanBought ? XP_FOR_PROFIT : 0;
  return {
    wins, trophies, objectives, overperformance, youth, europe, profit,
    total: wins + trophies + objectives + overperformance + youth + europe + profit,
  };
}

/* ================================================================== */
/* Levels and points                                                  */
/* ================================================================== */

/**
 * A level costs more than the one before it, so the first few come inside a
 * season or two and the last ones are a career. 400 XP for level 2 and a 35
 * percent step means a full tree is roughly a decade of winning things, which
 * is the point: the trees are the long game, not a first season upgrade.
 */
export const XP_FIRST_LEVEL = 400;
export const XP_LEVEL_STEP = 1.35;
/** Seven trees at five points each. Nothing beyond this is earnable. */
export const MAX_LEVEL = 1 + SKILL_TREES.length * MAX_TREE_POINTS;

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
export function levelFor(xp: number): number {
  let level = 1;
  while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) level += 1;
  return level;
}

/** One point a level, after the first. */
export function pointsEarned(xp: number): number {
  return levelFor(xp) - 1;
}

export function pointsSpent(block: ManagerXp): number {
  return SKILL_TREES.reduce((n, t) => n + Math.max(0, block.points[t] ?? 0), 0);
}

export function pointsFree(block: ManagerXp): number {
  return Math.max(0, pointsEarned(block.xp) - pointsSpent(block));
}

/** How far through the current level, 0 to 1, for a bar on the screen. */
export function levelProgress(xp: number): number {
  const level = levelFor(xp);
  if (level >= MAX_LEVEL) return 1;
  const floor = xpForLevel(level);
  const ceiling = xpForLevel(level + 1);
  if (ceiling <= floor) return 1;
  return Math.max(0, Math.min(1, (xp - floor) / (ceiling - floor)));
}

/**
 * Put a point in. Returns null when it cannot be done, which is the same shape
 * every other engine action uses, so the hook's `?? prev` does the right thing.
 * Points are never refunded: the spec has no respec and a tree you can undo is
 * not a decision.
 */
export function spendPoint(block: ManagerXp, tree: SkillTree): ManagerXp | null {
  if (!SKILL_TREES.includes(tree)) return null;
  if (pointsFree(block) <= 0) return null;
  const now = block.points[tree] ?? 0;
  if (now >= MAX_TREE_POINTS) return null;
  return { ...block, points: { ...block.points, [tree]: now + 1 } };
}

/* ================================================================== */
/* What a point actually does                                         */
/* ================================================================== */

/*
 * Every one of these is the identity at zero points. That is what lets the
 * harness prove Round 95's rule by construction rather than by hoping, and it
 * is what makes an untouched save byte for byte the game it was.
 *
 * The sizes are deliberately small. A skill tree is a multiplier on a sim that
 * twelve rounds of balance already tuned, and the fastest way to ruin it is to
 * let a fully invested manager stop being able to lose. Section 4 of the
 * harness holds the whole set against an untouched manager over hundreds of
 * seasons for exactly that reason.
 */

/** Tactics: what a full set of duties is worth, 1.00 at zero to 1.50 at five. */
export function dutyEdge(state: CareerState): number {
  return 1 + treePoints(state, 'tactics') * 0.1;
}

/** Recruitment: how much of the valuation band this manager reads away. */
export function valuationTighten(state: CareerState): number {
  return treePoints(state, 'recruitment') * 0.02;
}

/** Negotiation: extra rounds a seller will sit through, 0 to 2. */
export function extraPatience(state: CareerState): number {
  return Math.floor(treePoints(state, 'negotiation') * 0.4);
}

/** Negotiation: how much faster the ask comes down, 0.00 to 0.20 on top. */
export function convergenceEdge(state: CareerState): number {
  return treePoints(state, 'negotiation') * 0.04;
}

/** Youth: added to the academy's report judgement, 0 to 2 of the 1 to 5 scale. */
export function youthReportEdge(state: CareerState): number {
  return Math.floor(treePoints(state, 'youth') * 0.4);
}

/** Man Management: what fraction of a broken promise's sting is absorbed. */
export function promiseCushion(state: CareerState): number {
  return treePoints(state, 'manManagement') * 0.066;
}

/** Finance: the multiplier on money a head, 1.00 to 1.10. */
export function gateEdge(state: CareerState): number {
  return 1 + treePoints(state, 'finance') * 0.02;
}

/** Media: press mood held back from falling, 0 to 5 points of it. */
export function pressCushion(state: CareerState): number {
  return treePoints(state, 'media');
}
