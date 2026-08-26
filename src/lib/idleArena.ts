/**
 * Round 288: Idle Arena, the site's first true incremental.
 *
 * The other three idle games (Stadium Tycoon, Wonderkid Factory, Hall of
 * Champions) are management sims with idle income bolted on. This is the
 * genre the word "idle" usually means: tap to score, buy things that score
 * for you, watch the numbers run away, reset for a permanent edge, and come
 * back to find it kept going while you were gone.
 *
 * EVERYTHING HERE IS INVENTED ON PURPOSE. No real player, club, league or
 * record appears anywhere in this game, so nothing in it can be wrong, and
 * the legal rules in CLAUDE.md have nothing to bite on. The squad is a cast
 * of archetypes ("Sunday Striker", "Point Guard") and the numbers are the
 * game.
 *
 * Every rule lives in this file and nothing here touches the DOM, so
 * scripts/simIdleArena.mjs can play thousands of hours of it in node and
 * measure whether the curve is a curve.
 */

export const SAVE_KEY = 'dukb-idle-arena-v1';
export const TICK_MS = 100;
/** the most a closed tab keeps earning for */
export const OFFLINE_CAP_MS = 8 * 3600 * 1000;
/** offline earning runs at half speed, because being there should matter */
export const OFFLINE_RATE = 0.5;
/** the trophy formula starts paying at this many points earned in one run */
export const TROPHY_FLOOR = 1_000_000;
/** each trophy is a permanent bonus on everything */
export const TROPHY_BONUS = 0.05;
export const GROWTH = 1.15;

export interface Generator {
  id: string;
  label: string;
  emoji: string;
  blurb: string;
  baseCost: number;
  baseRate: number;
}

/* Costs and rates are in a classic ratio: each tier costs about ten times the
   last and produces about seven times as much, so the cheapest thing you can
   afford is not always the best thing you can afford. Measured by the harness,
   not asserted here. */
export const GENERATORS: Generator[] = [
  { id: 'ballboy', label: 'Ball Boy', emoji: '🧒', blurb: 'Keeps the ball in play. Somebody has to.', baseCost: 15, baseRate: 0.4 },
  { id: 'striker', label: 'Sunday Striker', emoji: '⚽', blurb: 'Scores on a muddy pitch every weekend, rain or not.', baseCost: 100, baseRate: 4 },
  { id: 'guard', label: 'Point Guard', emoji: '🏀', blurb: 'Runs the floor. Every possession ends in a bucket.', baseCost: 1_100, baseRate: 32 },
  { id: 'slugger', label: 'Slugger', emoji: '⚾', blurb: 'Swings for the fences and clears them.', baseCost: 12_000, baseRate: 190 },
  { id: 'sniper', label: 'Sniper', emoji: '🏒', blurb: 'Top corner from the blue line. Every time.', baseCost: 130_000, baseRate: 1050 },
  { id: 'qb', label: 'Quarterback', emoji: '🏈', blurb: 'Reads the whole field before the snap.', baseCost: 1_400_000, baseRate: 5600 },
  { id: 'ace', label: 'Ace', emoji: '🎾', blurb: 'Serves nobody can touch, all afternoon.', baseCost: 12_000_000, baseRate: 31_000 },
  { id: 'champion', label: 'Champion', emoji: '🏆', blurb: 'Wins whatever is put in front of them.', baseCost: 150_000_000, baseRate: 176_000 },
];

export interface Upgrade {
  id: string;
  label: string;
  blurb: string;
  cost: number;
  /** multiplies every tap */
  tapMult?: number;
  /** multiplies one generator */
  gen?: string;
  genMult?: number;
  /** multiplies everything */
  globalMult?: number;
  /** taps also earn this share of a second of passive income */
  tapShare?: number;
  /** only offered once this many of the generator are owned */
  needs?: { gen: string; count: number };
}

export const UPGRADES: Upgrade[] = [
  { id: 'sweetspot', label: 'Sweet Spot', blurb: 'Every tap hits it. Taps score double.', cost: 100, tapMult: 2 },
  { id: 'bothfeet', label: 'Both Feet', blurb: 'No weak side. Taps score double again.', cost: 500, tapMult: 2 },
  { id: 'bibs', label: 'Training Bibs', blurb: 'Ball Boys score double.', cost: 200, gen: 'ballboy', genMult: 2, needs: { gen: 'ballboy', count: 5 } },
  { id: 'boots', label: 'New Boots', blurb: 'Sunday Strikers score double.', cost: 1_500, gen: 'striker', genMult: 2, needs: { gen: 'striker', count: 5 } },
  { id: 'playbook', label: 'The Playbook', blurb: 'Point Guards score double.', cost: 15_000, gen: 'guard', genMult: 2, needs: { gen: 'guard', count: 5 } },
  { id: 'lumber', label: 'Better Lumber', blurb: 'Sluggers score double.', cost: 160_000, gen: 'slugger', genMult: 2, needs: { gen: 'slugger', count: 5 } },
  { id: 'tape', label: 'Fresh Tape', blurb: 'Snipers score double.', cost: 1_700_000, gen: 'sniper', genMult: 2, needs: { gen: 'sniper', count: 5 } },
  { id: 'film', label: 'Film Room', blurb: 'Quarterbacks score double.', cost: 18_000_000, gen: 'qb', genMult: 2, needs: { gen: 'qb', count: 5 } },
  { id: 'strings', label: 'Fresh Strings', blurb: 'Aces score double.', cost: 150_000_000, gen: 'ace', genMult: 2, needs: { gen: 'ace', count: 5 } },
  { id: 'mindset', label: 'Winning Mindset', blurb: 'Champions score double.', cost: 2_000_000_000, gen: 'champion', genMult: 2, needs: { gen: 'champion', count: 5 } },
  { id: 'muscle', label: 'Muscle Memory', blurb: 'Each tap also scores 1% of a second of your squad.', cost: 10_000, tapShare: 0.01 },
  { id: 'crowd', label: 'Home Crowd', blurb: 'Everything scores 10% more.', cost: 100_000, globalMult: 1.1 },
  { id: 'anthem', label: 'The Anthem', blurb: 'Everything scores 25% more.', cost: 5_000_000, globalMult: 1.25 },
  { id: 'dynasty', label: 'Dynasty', blurb: 'Everything scores 50% more.', cost: 500_000_000, globalMult: 1.5 },
];

export interface Achievement {
  id: string;
  label: string;
  blurb: string;
  test: (s: ArenaState) => boolean;
}

/* Each one is worth one percent on everything, permanently, across runs. */
export const ACHIEVEMENT_BONUS = 0.01;
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'tap100', label: 'Warmed Up', blurb: 'Tap 100 times.', test: s => s.taps >= 100 },
  { id: 'tap1k', label: 'Blisters', blurb: 'Tap 1,000 times.', test: s => s.taps >= 1_000 },
  { id: 'tap10k', label: 'Iron Thumb', blurb: 'Tap 10,000 times.', test: s => s.taps >= 10_000 },
  { id: 'squad10', label: 'Full Squad', blurb: 'Own 10 of anything.', test: s => Object.values(s.owned).some(n => n >= 10) },
  { id: 'squad100', label: 'Deep Bench', blurb: 'Own 100 of anything.', test: s => Object.values(s.owned).some(n => n >= 100) },
  { id: 'every', label: 'Every Sport', blurb: 'Own at least one of every archetype.', test: s => GENERATORS.every(g => (s.owned[g.id] ?? 0) >= 1) },
  { id: 'million', label: 'Millionaire', blurb: 'Earn a million points in one run.', test: s => s.earned >= 1_000_000 },
  { id: 'billion', label: 'Billionaire', blurb: 'Earn a billion points in one run.', test: s => s.earned >= 1_000_000_000 },
  { id: 'trophy1', label: 'Silverware', blurb: 'Lift your first trophy.', test: s => s.trophies >= 1 },
  { id: 'trophy10', label: 'Cabinet', blurb: 'Hold ten trophies.', test: s => s.trophies >= 10 },
];

export interface ArenaState {
  v: 1;
  points: number;
  /** earned this run, drives the trophy count */
  earned: number;
  /** earned across every run, for the record card */
  allTime: number;
  taps: number;
  owned: Record<string, number>;
  upgrades: string[];
  trophies: number;
  runs: number;
  ach: string[];
  lastTick: number;
  started: number;
}

/** A fresh arena starts with one Ball Boy on the payroll, so something is
 *  always scoring even for somebody who never taps at all. */
export function newState(now: number = Date.now()): ArenaState {
  const owned: Record<string, number> = {};
  for (const g of GENERATORS) owned[g.id] = 0;
  owned.ballboy = 1;
  return { v: 1, points: 0, earned: 0, allTime: 0, taps: 0, owned, upgrades: [], trophies: 0, runs: 0, ach: [], lastTick: now, started: now };
}

const finite = (n: unknown, fallback = 0): number => (typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : fallback);

/** A save that does not parse, or parses to nonsense, is a fresh arena. Every
 *  field is coerced rather than trusted: this runs on every page load. */
export function loadSave(raw: string | null, now: number = Date.now()): ArenaState | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Partial<ArenaState>;
    if (!p || typeof p !== 'object') return null;
    const owned: Record<string, number> = {};
    for (const g of GENERATORS) owned[g.id] = Math.floor(finite((p.owned as Record<string, unknown> | undefined)?.[g.id]));
    const known = new Set(UPGRADES.map(u => u.id));
    const knownAch = new Set(ACHIEVEMENTS.map(a => a.id));
    return {
      v: 1,
      points: finite(p.points),
      earned: finite(p.earned),
      allTime: finite(p.allTime),
      taps: Math.floor(finite(p.taps)),
      owned,
      upgrades: Array.isArray(p.upgrades) ? [...new Set(p.upgrades.filter((u): u is string => typeof u === 'string' && known.has(u)))] : [],
      trophies: Math.floor(finite(p.trophies)),
      runs: Math.floor(finite(p.runs)),
      ach: Array.isArray(p.ach) ? [...new Set(p.ach.filter((a): a is string => typeof a === 'string' && knownAch.has(a)))] : [],
      lastTick: finite(p.lastTick, now) || now,
      started: finite(p.started, now) || now,
    };
  } catch {
    return null;
  }
}

export function serialize(s: ArenaState): string {
  return JSON.stringify(s);
}

/** cost of the next one, given how many are owned */
export function genCost(g: Generator, owned: number): number {
  return Math.ceil(g.baseCost * Math.pow(GROWTH, owned));
}

/** cost of the next n, summed */
export function genCostN(g: Generator, owned: number, n: number): number {
  let total = 0;
  for (let i = 0; i < n; i++) total += genCost(g, owned + i);
  return total;
}

/** how many can be afforded from here */
export function affordable(g: Generator, owned: number, points: number): number {
  let n = 0, spend = 0;
  while (n < 1000) {
    const c = genCost(g, owned + n);
    if (spend + c > points) break;
    spend += c; n += 1;
  }
  return n;
}

export function globalMult(s: ArenaState): number {
  let m = 1 + s.trophies * TROPHY_BONUS + s.ach.length * ACHIEVEMENT_BONUS;
  for (const u of UPGRADES) if (u.globalMult && s.upgrades.includes(u.id)) m *= u.globalMult;
  return m;
}

export function genMult(s: ArenaState, genId: string): number {
  let m = 1;
  for (const u of UPGRADES) if (u.gen === genId && u.genMult && s.upgrades.includes(u.id)) m *= u.genMult;
  return m;
}

/** points per second from one generator line */
export function genRate(s: ArenaState, g: Generator): number {
  return (s.owned[g.id] ?? 0) * g.baseRate * genMult(s, g.id) * globalMult(s);
}

/** points per second from the whole squad */
export function totalRate(s: ArenaState): number {
  return GENERATORS.reduce((sum, g) => sum + genRate(s, g), 0);
}

export function tapValue(s: ArenaState): number {
  let v = 1;
  let share = 0;
  for (const u of UPGRADES) {
    if (!s.upgrades.includes(u.id)) continue;
    if (u.tapMult) v *= u.tapMult;
    if (u.tapShare) share += u.tapShare;
  }
  return v * globalMult(s) + share * totalRate(s);
}

export function upgradeAvailable(s: ArenaState, u: Upgrade): boolean {
  if (s.upgrades.includes(u.id)) return false;
  if (u.needs && (s.owned[u.needs.gen] ?? 0) < u.needs.count) return false;
  return true;
}

/** the trophies a run of this size would lift; the floor is a million */
export function trophiesFor(earned: number): number {
  if (earned < TROPHY_FLOOR) return 0;
  return Math.floor(Math.sqrt(earned / TROPHY_FLOOR));
}

export function canLift(s: ArenaState): boolean {
  return trophiesFor(s.earned) >= 1;
}

/* ── the moves ──────────────────────────────────────────────────────────── */

export function tap(s: ArenaState): ArenaState {
  const v = tapValue(s);
  return withAch({ ...s, points: s.points + v, earned: s.earned + v, allTime: s.allTime + v, taps: s.taps + 1 });
}

/** advance the clock; returns the new state and what was earned */
export function tick(s: ArenaState, now: number): { state: ArenaState; earned: number } {
  const dt = Math.max(0, (now - s.lastTick) / 1000);
  const earned = totalRate(s) * dt;
  return { state: withAch({ ...s, points: s.points + earned, earned: s.earned + earned, allTime: s.allTime + earned, lastTick: now }), earned };
}

/** what a closed tab earned: capped, and at half rate */
export function applyOffline(s: ArenaState, now: number): { state: ArenaState; earned: number; seconds: number } {
  const away = Math.max(0, Math.min(now - s.lastTick, OFFLINE_CAP_MS));
  const seconds = away / 1000;
  const earned = totalRate(s) * seconds * OFFLINE_RATE;
  return { state: withAch({ ...s, points: s.points + earned, earned: s.earned + earned, allTime: s.allTime + earned, lastTick: now }), earned, seconds };
}

export function buyGen(s: ArenaState, genId: string, n = 1): ArenaState {
  const g = GENERATORS.find(x => x.id === genId);
  if (!g || n < 1) return s;
  const owned = s.owned[g.id] ?? 0;
  const cost = genCostN(g, owned, n);
  if (cost > s.points) return s;
  return withAch({ ...s, points: s.points - cost, owned: { ...s.owned, [g.id]: owned + n } });
}

export function buyUpgrade(s: ArenaState, id: string): ArenaState {
  const u = UPGRADES.find(x => x.id === id);
  if (!u || !upgradeAvailable(s, u) || u.cost > s.points) return s;
  return withAch({ ...s, points: s.points - u.cost, upgrades: [...s.upgrades, u.id] });
}

/** Lift the trophy: the run resets, the trophies stay, and so do the
 *  achievements and the all time total. */
export function lift(s: ArenaState, now: number = Date.now()): ArenaState {
  const gained = trophiesFor(s.earned);
  if (gained < 1) return s;
  const owned: Record<string, number> = {};
  for (const g of GENERATORS) owned[g.id] = 0;
  owned.ballboy = 1;
  return withAch({
    ...s,
    points: 0, earned: 0, taps: s.taps, owned, upgrades: [],
    trophies: s.trophies + gained, runs: s.runs + 1, lastTick: now,
  });
}

function withAch(s: ArenaState): ArenaState {
  let ach = s.ach;
  for (const a of ACHIEVEMENTS) {
    if (!ach.includes(a.id) && a.test(s)) ach = [...ach, a.id];
  }
  return ach === s.ach ? s : { ...s, ach };
}

/* ── numbers people can read ───────────────────────────────────────────── */
const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
export function fmt(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (n < 0) return '-' + fmt(-n);
  if (n < 1000) return n < 10 && n !== Math.floor(n) ? n.toFixed(1) : String(Math.floor(n));
  let i = 0, v = n;
  while (v >= 1000 && i < SUFFIX.length - 1) { v /= 1000; i += 1; }
  return `${v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : Math.floor(v)}${SUFFIX[i]}`;
}

export function fmtDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}
