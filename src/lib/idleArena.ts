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
/** the most one absence keeps earning for, whether the tab was closed or open */
export const OFFLINE_CAP_MS = 8 * 3600 * 1000;
/** offline earning runs at half speed, because being there should matter */
export const OFFLINE_RATE = 0.5;
/**
 * Round 438: a gap longer than this means the clock stopped rather than ran,
 * so the time in it is away time and is paid as away time.
 *
 * An open tab is not the same thing as somebody watching it. A hidden tab gets
 * its timers clamped to a second and then to a minute, a frozen or discarded
 * tab stops firing at all, and a sleeping machine stops everything, so the tick
 * that lands afterwards carries hours in a single dt. Until this round that dt
 * was paid in full at full rate with no cap, so a tab left open for a day paid
 * six times what closing it for the same day paid (a full 24 hours against
 * 8 hours at half speed), and the game's own tip, "eight hours at half speed is
 * four hours of income you did not have to be there for", described something
 * the game did not do.
 *
 * 750ms, from measured headroom rather than taste. Chromium delivering a 100ms
 * interval on a live page: worst gap 112ms of 300 with an idle main thread, and
 * 201ms of 271 with a 200ms task blocking every second. A live tab's gap is its
 * own longest synchronous task plus the interval, and nothing on this page
 * blocks for a fifth of a second, so 750ms is three and a half times the
 * measured worst. It sits under the 1000ms floor every browser clamps a hidden
 * tab's timers to, so a backgrounded tab is caught on its first tick rather
 * than after whatever grace the browser happens to give it. The two errors are
 * not the same size: calling a live gap away costs the player under a second of
 * full rate income, and calling an absence live pays a parked tab all night.
 */
export const AWAY_AFTER_MS = 750;
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

/**
 * Round 957: the trophy room. Until this round a trophy was a flat +5% and
 * nothing else, so lifting one was automatic and then forgotten. Now a trophy
 * can be spent on a permanent perk instead, and spending it gives up its 5%,
 * so every purchase is a trade: a bigger multiplier on everything, or one
 * thing that suits the way you play.
 *
 * Each perk is a ladder of three levels. `cost` is the trophies the NEXT level
 * takes, so level two of Long Night costs cost[1] on top of what level one
 * already took. The numbers were tuned by scripts/simIdleArena.mjs section 6:
 * every level makes the next trophy come sooner for the player it is meant for,
 * and every perk makes it come later for somebody it is not meant for.
 */
export interface Perk {
  id: 'longNight' | 'nightShift' | 'headStart' | 'scouting';
  label: string;
  emoji: string;
  /** who it is for, in a few words */
  pitch: string;
  /** trophies each level costs, in order */
  cost: number[];
}

export const PERKS: Perk[] = [
  { id: 'longNight', label: 'Long Night', emoji: '🌙', pitch: 'for long days away', cost: [3, 5, 8] },
  { id: 'nightShift', label: 'Night Shift', emoji: '🔦', pitch: 'for a night away', cost: [3, 5, 8] },
  { id: 'headStart', label: 'Head Start', emoji: '🚀', pitch: 'for quick runs', cost: [3, 5, 8] },
  { id: 'scouting', label: 'Scouting Network', emoji: '🔭', pitch: 'for long runs', cost: [3, 5, 8] },
];
export const PERK_MAX = 3;
/** The worked example the rules print: with this many trophies held, the first
 *  level of this perk beats keeping the trophies for somebody who leaves it
 *  running overnight, and loses to keeping them for somebody who sits and
 *  taps. scripts/simIdleArena.mjs section 6 plays exactly this case. */
export const ROOM_EXAMPLE = { held: 30, perk: 'nightShift' } as const;

/** away cap by Long Night level, 0 to 3 */
export const LONG_NIGHT_CAP_MS = [OFFLINE_CAP_MS, ...[16, 20, 24].map(h => h * 3600 * 1000)];
/** away rate by Night Shift level; every one of them stays under full speed,
 *  because being there has to beat being away */
export const NIGHT_SHIFT_RATE = [OFFLINE_RATE, 0.7, 0.8, 0.95];
/** the squad a run starts with after a lift, by Head Start level */
export const HEAD_START_SQUAD: Record<string, number>[] = [
  { ballboy: 1 },
  { ballboy: 25, striker: 10 },
  { ballboy: 25, striker: 25, guard: 10 },
  { ballboy: 25, striker: 25, guard: 25, slugger: 10 },
];
/** Scouting Network finds the top four archetypes cheaper and leaves the rest
 *  alone, so it pays in a run long enough to sign them in numbers and does
 *  nothing for a quick one. */
export const SCOUTED_GENS = ['sniper', 'qb', 'ace', 'champion'];
/** the price growth per signing of a scouted archetype, by level */
export const SCOUTING_GROWTH = [GROWTH, 1.11, 1.08, 1.05];

const labelOf = (genId: string) => GENERATORS.find(g => g.id === genId)?.label ?? genId;
const plural = (genId: string) => `${labelOf(genId)}s`;

/** What one level gives, in the words the trophy room prints. Built from the
 *  same tables the engine reads, so the card cannot promise something else. */
export function perkEffect(id: Perk['id'], level: number): string {
  const l = Math.max(1, Math.min(PERK_MAX, Math.floor(level)));
  if (id === 'longNight') return `Time away pays for up to ${LONG_NIGHT_CAP_MS[l] / 3600000} hours, not ${LONG_NIGHT_CAP_MS[0] / 3600000}`;
  if (id === 'nightShift') return `Time away runs at ${Math.round(NIGHT_SHIFT_RATE[l] * 100)}% speed, not ${Math.round(NIGHT_SHIFT_RATE[0] * 100)}%`;
  if (id === 'headStart') {
    const squad = Object.entries(HEAD_START_SQUAD[l]).map(([g, n]) => `${n} ${plural(g)}`);
    return `Every run after a lift starts with ${listOf(squad)}`;
  }
  return `Each ${listOf(SCOUTED_GENS.map(labelOf))} you sign costs ${Math.round((SCOUTING_GROWTH[l] - 1) * 100)}% more than the last, not ${Math.round((SCOUTING_GROWTH[0] - 1) * 100)}%`;
}

const listOf = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0] ?? '');

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
  /** away time already paid for in the absence being served, against the cap */
  awayMs: number;
  started: number;
  /** Round 957: trophy room levels, perk id to level 1..3. A save from before
   *  the round has no such field and loadSave reads it as none bought. */
  perks: Partial<Record<Perk['id'], number>>;
}

/** A fresh arena starts with one Ball Boy on the payroll, so something is
 *  always scoring even for somebody who never taps at all. */
export function newState(now: number = Date.now()): ArenaState {
  const owned: Record<string, number> = {};
  for (const g of GENERATORS) owned[g.id] = 0;
  owned.ballboy = 1;
  return { v: 1, points: 0, earned: 0, allTime: 0, taps: 0, owned, upgrades: [], trophies: 0, runs: 0, ach: [], lastTick: now, awayMs: 0, started: now, perks: {} };
}

/** A perks block is coerced level by level: an unknown id is dropped, a level
 *  that is not a whole number from 1 to PERK_MAX is clamped or dropped, and
 *  anything that is not an object at all reads as nothing bought. */
function loadPerks(raw: unknown): ArenaState['perks'] {
  const out: ArenaState['perks'] = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const p of PERKS) {
    const level = Math.min(PERK_MAX, Math.floor(finite((raw as Record<string, unknown>)[p.id])));
    if (level >= 1) out[p.id] = level;
  }
  return out;
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
    const perks = loadPerks(p.perks);
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
      awayMs: Math.min(finite(p.awayMs), LONG_NIGHT_CAP_MS[perks.longNight ?? 0]),
      started: finite(p.started, now) || now,
      perks,
    };
  } catch {
    return null;
  }
}

export function serialize(s: ArenaState): string {
  return JSON.stringify(s);
}

/* ── the trophy room's levers, read by the rules below ─────────────────── */

/** the level owned of one perk, 0 when none */
export function perkLevel(s: Pick<ArenaState, 'perks'>, id: Perk['id']): number {
  return s.perks?.[id] ?? 0;
}
/** the price growth per signing this arena pays for one archetype (Scouting
 *  Network reaches only the scouted ones) */
export function growthOf(s: Pick<ArenaState, 'perks'>, genId: string): number {
  return SCOUTED_GENS.includes(genId) ? SCOUTING_GROWTH[perkLevel(s, 'scouting')] : GROWTH;
}
/** the longest one absence keeps paying for (Long Night) */
export function awayCapMs(s: Pick<ArenaState, 'perks'>): number {
  return LONG_NIGHT_CAP_MS[perkLevel(s, 'longNight')];
}
/** the share of full speed an absence pays (Night Shift) */
export function awayRate(s: Pick<ArenaState, 'perks'>): number {
  return NIGHT_SHIFT_RATE[perkLevel(s, 'nightShift')];
}
/** trophies the next level of a perk takes, or null at the top of its ladder */
export function perkCost(s: Pick<ArenaState, 'perks'>, id: Perk['id']): number | null {
  const p = PERKS.find(x => x.id === id);
  const level = perkLevel(s, id);
  if (!p || level >= PERK_MAX) return null;
  return p.cost[level];
}
/** every trophy that has gone into the room, worked out from the levels */
export function trophiesSpent(s: Pick<ArenaState, 'perks'>): number {
  let n = 0;
  for (const p of PERKS) for (let l = 0; l < perkLevel(s, p.id); l++) n += p.cost[l];
  return n;
}

/** cost of the next one, given how many are owned */
export function genCost(g: Generator, owned: number, growth: number = GROWTH): number {
  return Math.ceil(g.baseCost * Math.pow(growth, owned));
}

/** cost of the next n, summed */
export function genCostN(g: Generator, owned: number, n: number, growth: number = GROWTH): number {
  let total = 0;
  for (let i = 0; i < n; i++) total += genCost(g, owned + i, growth);
  return total;
}

/** how many can be afforded from here */
export function affordable(g: Generator, owned: number, points: number, growth: number = GROWTH): number {
  let n = 0, spend = 0;
  while (n < 1000) {
    const c = genCost(g, owned + n, growth);
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

/**
 * Advance the clock; returns the new state and what was earned.
 *
 * A gap the length of a tick is somebody sitting there watching, and that is
 * paid in real time at full rate for as long as they care to watch: it is an
 * idle game, the whole point is that it never stops. A gap of hours is not
 * somebody watching, it is a tab that was hidden, throttled, frozen or asleep,
 * so it goes through the same away rule a closed tab does.
 */
export function tick(s: ArenaState, now: number): { state: ArenaState; earned: number } {
  const gap = Math.max(0, now - s.lastTick);
  if (gap > AWAY_AFTER_MS) {
    const { state, earned } = applyOffline(s, now);
    return { state, earned };
  }
  const earned = totalRate(s) * (gap / 1000);
  return { state: withAch({ ...s, points: s.points + earned, earned: s.earned + earned, allTime: s.allTime + earned, lastTick: now, awayMs: 0 }), earned };
}

/**
 * What an absence earned: half rate, and eight hours of it at most.
 *
 * The cap counts the whole absence rather than each gap inside it, because a
 * backgrounded tab wakes up once a minute and would otherwise collect a fresh
 * eight hours every time it did. `awayMs` is the meter; the first live tick
 * after somebody comes back sets it to zero, so the next absence is a new one.
 */
export function applyOffline(s: ArenaState, now: number): { state: ArenaState; earned: number; seconds: number } {
  /* Round 957: the cap and the rate are the trophy room's (Long Night, Night
     Shift), eight hours at half speed when neither is bought. Same one meter
     for the whole absence, whatever the cap is. */
  const left = Math.max(0, awayCapMs(s) - s.awayMs);
  const away = Math.min(Math.max(0, now - s.lastTick), left);
  const seconds = away / 1000;
  const earned = totalRate(s) * seconds * awayRate(s);
  return { state: withAch({ ...s, points: s.points + earned, earned: s.earned + earned, allTime: s.allTime + earned, lastTick: now, awayMs: s.awayMs + away }), earned, seconds };
}

export function buyGen(s: ArenaState, genId: string, n = 1): ArenaState {
  const g = GENERATORS.find(x => x.id === genId);
  if (!g || n < 1) return s;
  const owned = s.owned[g.id] ?? 0;
  const cost = genCostN(g, owned, n, growthOf(s, g.id));
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
  /* Round 957: Head Start decides the squad the new run opens with; level 0 is
     the one Ball Boy every arena has always started with. */
  const owned: Record<string, number> = {};
  for (const g of GENERATORS) owned[g.id] = HEAD_START_SQUAD[perkLevel(s, 'headStart')][g.id] ?? 0;
  return withAch({
    ...s,
    points: 0, earned: 0, taps: s.taps, owned, upgrades: [],
    trophies: s.trophies + gained, runs: s.runs + 1, lastTick: now,
  });
}

/**
 * Round 957: spend trophies on the next level of a perk. The trophies leave the
 * cabinet, so their +5% each goes with them from this moment; the perk stays
 * for good. Refused, and the same state handed back, when the ladder is at
 * the top or the cabinet cannot cover the price.
 */
export function buyPerk(s: ArenaState, id: Perk['id']): ArenaState {
  const cost = perkCost(s, id);
  if (cost === null || cost > s.trophies) return s;
  return { ...s, trophies: s.trophies - cost, perks: { ...s.perks, [id]: perkLevel(s, id) + 1 } };
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
