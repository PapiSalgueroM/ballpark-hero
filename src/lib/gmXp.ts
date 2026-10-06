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
  /*
   * Round 965: the tree a seat was handed one point in before it earned any,
   * which is also the record that the point has been handed over. Club
   * Manager's created manager gets it from his background. That point is a
   * gift, not a purchase, so pointsFree does not charge for it.
   *
   * OPTIONAL. No GM save writes it, and a block without it reads exactly as it
   * did before the field existed.
   */
  gift?: T;
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

/** Round 965: the points paid for with XP, which is every point less a gift
 *  that really landed (a real tree of this set, holding at least one point). */
export function pointsBought<T extends string>(set: XpTreeSet<T>, block: XpBlock<T>): number {
  const g = block.gift;
  const gifted = g !== undefined && set.trees.includes(g) && (block.points[g] ?? 0) >= 1 ? 1 : 0;
  return Math.max(0, pointsSpent(set, block) - gifted);
}

export function pointsFree<T extends string>(set: XpTreeSet<T>, block: XpBlock<T>): number {
  /* Never more than the room left on the board: with a gift in, the last level
     would otherwise show a point with nowhere to go. Without a gift the room is
     never the smaller of the two (earned tops out at every tree full), so a
     block with no gift reads exactly as it did before Round 965. */
  const room = set.trees.length * set.maxPoints - pointsSpent(set, block);
  return Math.max(0, Math.min(pointsEarned(block.xp, maxLevelOf(set)) - pointsBought(set, block), room));
}

/*
 * Round 965: put a gift point in. Pure, and once only: a block that already
 * records a gift comes back as it was. A tree already at its cap keeps the cap
 * and records the gift anyway, which hands back one of the bought points
 * through pointsFree, so the seat still receives exactly one point's worth.
 */
export function grantGift<T extends string, B extends XpBlock<T>>(set: XpTreeSet<T>, block: B, tree: T): B {
  if (block.gift !== undefined) return block;
  const now = block.points[tree] ?? 0;
  return { ...block, gift: tree, points: { ...block.points, [tree]: Math.min(set.maxPoints, now + 1) } };
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
 *    to a clamp, so points 1 to 5 each move it, and it moves it AFTER the board
 *    stores the number: ratings are whole numbers and money is kept in tenths, so
 *    an effect hands back a whole number or a tenth, never a fraction a board
 *    would round away. scripts/simGmXp.mjs walks every step against the real
 *    numbers the front office produces, in the units the engines store.
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
    atMax: 'A prospect read is off by a little over half what it is on day one.',
    needs: 'Pays on draft night, while you read the board.',
  },
  negotiation: {
    id: 'negotiation', label: 'Negotiation', emoji: '\u{1F91D}',
    blurb: 'Agents open nearer what their man is actually worth.',
    atMax: 'About a tenth off the opening ask on a new deal.',
    needs: 'Only pays when you sign or extend somebody above the league minimum.',
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
    atMax: 'An even chance of one extra rating point a year, still capped by potential.',
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
    atMax: 'An answer that gambles lands 15 points more often.',
    needs: 'Only pays on an answer that gambles. A safe answer has nothing to land.',
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

/* ================================================================== */
/* What a GM point does                                               */
/* ================================================================== */

/*
 * Each effect takes the tree's points (read with gmTreePoints) and the number the
 * front office engine already produced, and returns the adjusted number. At zero
 * points every one of them hands back exactly what it was given.
 */

/** Scouting: the chance a second look halves a prospect's read error, per point. */
export const GM_SCOUT_SECOND_LOOK = 0.15;
/**
 * Scouting. `noise` is the scouting error on one prospect's read (the draft
 * class draws it as a whole number, -4 to +4) and `roll` is a draw in [0, 1).
 * A good roll halves the error toward zero. A whole number in, a whole number out.
 *
 * Two rules for whoever wires it in. The draft class keeps ONE grade per
 * prospect and every CPU club drafts by it, so the sharpened read must be the
 * user's own view (a field of its own beside the shared grade), never a rewrite
 * of the shared grade, or a GM's points would sharpen his rivals' board as much
 * as his. And the roll comes from a stream of its own, never the class's rng,
 * so a GM with points is dealt exactly the class an untouched GM is dealt.
 */
export function scoutedNoise(noise: number, points: number, roll: number): number {
  if (points <= 0) return noise;
  return roll < points * GM_SCOUT_SECOND_LOOK ? Math.trunc(noise / 2) : noise;
}

/*
 * Every front office keeps money in tenths of a million (salaryFor, nbaSalaryFor,
 * mlbSalaryFor, nhlSalaryFor and deadMoneyFor all round to 0.1), and a few
 * percent of a small deal is less than a tenth. Rounded to the nearest tenth,
 * the middle points would buy nothing on most deals. So the money effects hand
 * back a figure already in tenths, rounded up or down by a roll in proportion to
 * how far the exact figure sits between the two: on average a point is worth
 * exactly its percentage, and every point raises the chance of the lower tenth.
 * As with scouting, the caller draws the roll only when points are above zero,
 * from a stream of its own.
 */
function toTenths(exact: number, roll: number): number {
  const t = exact * 10;
  const lo = Math.floor(t + 1e-9);
  const frac = t - lo;
  return (frac > 1e-9 && roll < frac ? lo + 1 : lo) / 10;
}

/** Negotiation: the share of an agent's opening ask talked away, per point. */
export const GM_ASK_EDGE_PER_POINT = 0.02;
/**
 * Negotiation. `ask` is the agent's opening figure in the league's tenths and
 * `minimum` is the league's minimum deal: talk never takes an ask below it, so
 * a man already on the minimum has nothing to negotiate.
 */
export function contractAsk(ask: number, points: number, roll: number, minimum: number): number {
  if (points <= 0) return ask;
  const exact = Math.max(minimum, ask * (1 - points * GM_ASK_EDGE_PER_POINT));
  return Math.min(ask, toTenths(exact, roll));
}

/** Cap craft: the share of a release's dead money structured away, per point. */
export const GM_DEAD_MONEY_RELIEF_PER_POINT = 0.04;
/** Cap craft. `amount` is the dead money the shared cut engine charges, in tenths. */
export function craftedDeadMoney(amount: number, points: number, roll: number): number {
  if (points <= 0) return amount;
  return Math.min(amount, toTenths(amount * (1 - points * GM_DEAD_MONEY_RELIEF_PER_POINT), roll));
}

/** Development: the chance, per point, of one extra rating point in a year of growth. */
export const GM_GROWTH_CHANCE_PER_POINT = 0.1;
/**
 * Development. `growth` is the year's rating change (a whole number: every
 * engine grows a young player 1 or 2 points in the NFL, 1 to 3 elsewhere) and
 * `headroom` is what the player had left below his potential before it. A
 * fraction of a whole number rating is lost the moment a board stores it, so a
 * point buys a chance of one whole extra point instead: 10 percent a point, an
 * even chance at five. A decline is left alone, and the extra never carries a
 * player past his ceiling (the Round 96 and 116 rule). The bonus is for the
 * GM's own players only, and the roll, like scouting's, is drawn only when
 * points are above zero, from a stream of its own.
 */
export function developedGrowth(growth: number, headroom: number, points: number, roll: number): number {
  if (points <= 0 || growth <= 0) return growth;
  return roll < points * GM_GROWTH_CHANCE_PER_POINT && headroom - growth >= 1 ? growth + 1 : growth;
}

/** Trading: the share of a rival's premium over value talked away, per point. */
export const GM_PREMIUM_CUT_PER_POINT = 0.08;
/** Trading. `premium` is the multiple of value a rival asks (1.02 firm, 1.15 sour). Never below value. */
export function tradePremium(premium: number, points: number): number {
  if (points <= 0 || premium <= 1) return premium;
  return 1 + (premium - 1) * (1 - points * GM_PREMIUM_CUT_PER_POINT);
}

/** Ownership: the share of a graded season's trust LOSS absorbed, per point. */
export const GM_TRUST_CUSHION_PER_POINT = 0.07;
/** Ownership. A gain is left alone; a loss shrinks and stays a whole number, like every trust change. */
export function cushionTrustLoss(delta: number, points: number): number {
  if (points <= 0 || delta >= 0) return delta;
  return Math.round(delta * (1 - points * GM_TRUST_CUSHION_PER_POINT));
}

/** Media: odds added to a press gamble landing, per point, and the most it can reach. */
export const GM_PRESS_ODDS_PER_POINT = 0.03;
export const GM_PRESS_ODDS_CAP = 0.95;
/** Media. `odds` is the chance an answer that gambles lands. A gamble always keeps some risk. */
export function pressOdds(odds: number, points: number): number {
  if (points <= 0) return odds;
  return Math.min(GM_PRESS_ODDS_CAP, odds + points * GM_PRESS_ODDS_PER_POINT);
}

/* ================================================================== */
/* Earning it as a GM                                                 */
/* ================================================================== */

/*
 * Club Manager's rates, carried over so the same curve fills at the same pace,
 * with one change a sport neutral seat needs: wins are paid on WIN SHARE rather
 * than per win, because an NFL season is 17 games and an MLB one is 162. A .600
 * season pays 60, which is what twenty league wins pay in Club Manager. Weighted
 * toward achievements, not volume: a title is worth twice a winning season.
 */
export const GM_XP_WIN_SHARE = 100;
export const GM_XP_PER_TITLE = 120;
export const GM_XP_PER_PLAYOFF_ROUND = 50;
export const GM_XP_PER_MANDATE_STEP = 60;
export const GM_XP_PER_PLACE_OVERPERFORMED = 25;
export const GM_XP_PER_PROSPECT = 40;

export interface GmXpAward {
  wins: number;
  titles: number;
  playoffs: number;
  mandate: number;
  overperformance: number;
  prospects: number;
  total: number;
}

/** How far past the owner's ask a graded season went: met is one step, beating it or a title two. */
export function mandateSteps(result: string): number {
  if (result === 'title' || result === 'overachieved') return 2;
  return result === 'met' ? 1 : 0;
}

const count = (n: number): number => (Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0);

/** What a GM's season was worth. Pure over plain numbers, so a harness can drive it directly. */
export function gmSeasonXp(input: {
  winPct: number;
  titles: number;
  playoffRoundsWon: number;
  mandateSteps: number;
  placesAboveExpectation: number;
  prospectsGraduated: number;
}): GmXpAward {
  const pct = Number.isFinite(input.winPct) ? Math.max(0, Math.min(1, input.winPct)) : 0;
  const wins = Math.round(pct * GM_XP_WIN_SHARE);
  const titles = count(input.titles) * GM_XP_PER_TITLE;
  const playoffs = count(input.playoffRoundsWon) * GM_XP_PER_PLAYOFF_ROUND;
  const mandate = Math.min(2, count(input.mandateSteps)) * GM_XP_PER_MANDATE_STEP;
  const overperformance = count(input.placesAboveExpectation) * GM_XP_PER_PLACE_OVERPERFORMED;
  const prospects = count(input.prospectsGraduated) * GM_XP_PER_PROSPECT;
  return {
    wins, titles, playoffs, mandate, overperformance, prospects,
    total: wins + titles + playoffs + mandate + overperformance + prospects,
  };
}
