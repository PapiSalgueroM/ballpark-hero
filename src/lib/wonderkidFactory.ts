/**
 * Round 216: Wonderkid Factory, the site's second idle game.
 *
 * Stadium Tycoon grows a ground; this grows people. You run a youth academy:
 * scouts bring in kids, coaches grow them toward a ceiling only better scouts
 * can see, and you decide when to cash each one out. Sell early and safe, or
 * hold while the rating climbs and the age premium melts. When the academy
 * has earned its region's respect you move the whole operation up a level,
 * keep your reputation stars forever, and start again where the ceilings are
 * higher.
 *
 * House rules kept, each one load bearing:
 * - Every kid is generated. Names come from intlNames (Round 197's banks,
 *   enumerated against every real name on the site), never from a new bank,
 *   and no two kids in the academy share a name (Round 206's rule, same
 *   reroll then walk guard).
 * - Growth respects headroom (Rounds 96 and 116): a kid slows as he nears
 *   his ceiling and NEVER passes it.
 * - Multipliers reach their nominal value (Round 95): a x3 surge measures 3.
 * - The save loads fail closed: a doctored save gets a working game, never a
 *   printing press. Offline progress is capped and cannot leak.
 * - The screen never lies: the exact price quoted is the price paid, the
 *   ceiling shown at scout level 6 is the real ceiling.
 *
 * All logic lives here, pure, so simWonderkid can run thousands of hours of
 * academy time without a browser. The hook only glues this to React.
 */

import { intlName, NATION_FAMILY } from '@/lib/intlNames';

/* ------------------------------------------------------------------ tuning */

export const SAVE_KEY = 'wonderkidFactoryV1';
const SAVE_VERSION = 1;

/** The ladder. Each region raises the ceilings scouts can find. */
export interface Region {
  name: string;
  emoji: string;
  potMin: number;
  potMax: number;
  /** lifetime earnings that unlock the move up, and pay the star */
  goal: number;
}
export const REGIONS: Region[] = [
  { name: 'District Fields', emoji: '🌾', potMin: 58, potMax: 76, goal: 8_000 },
  { name: 'Provincial Town', emoji: '🏘️', potMin: 62, potMax: 81, goal: 70_000 },
  { name: 'Port City', emoji: '⚓', potMin: 66, potMax: 86, goal: 700_000 },
  { name: 'The Capital', emoji: '🏛️', potMin: 70, potMax: 91, goal: 5_500_000 },
  { name: 'Continental Hub', emoji: '✈️', potMin: 74, potMax: 95, goal: 45_000_000 },
  { name: 'World Stage', emoji: '🌍', potMin: 78, potMax: 99, goal: 400_000_000 },
];

export type FacilityId = 'scouting' | 'coaching' | 'dorms' | 'agents';
export interface Facility {
  id: FacilityId;
  label: string;
  emoji: string;
  base: number;
  growth: number;
  maxLevel: number;
  blurb: string;
}
export const FACILITIES: Facility[] = [
  { id: 'scouting', label: 'Scouting network', emoji: '🔭', base: 60, growth: 1.6, maxLevel: 24, blurb: 'Finds kids faster. Level 3 reads a ceiling range, level 6 reads it exactly.' },
  { id: 'coaching', label: 'Coaching staff', emoji: '📋', base: 45, growth: 1.6, maxLevel: 24, blurb: 'Every session grows every kid faster.' },
  { id: 'dorms', label: 'Dorms', emoji: '🛏️', base: 150, growth: 1.75, maxLevel: 9, blurb: 'One more bed per level. A full academy stops scouting.' },
  { id: 'agents', label: 'Agent office', emoji: '🤝', base: 200, growth: 1.75, maxLevel: 20, blurb: 'Squeezes more out of every sale.' },
];

/** seconds for one scout find at level 0. */
const FIND_BASE_SEC = 30;
/** rating points per second at coaching 0, before any multiplier. */
const TRAIN_BASE = 0.085;
/** an academy year passes every this many seconds of play. */
export const YEAR_SEC = 300;
/** kids leave on a free at this age. The clock is the pressure. */
export const LEAVE_AGE = 24;

export const SHOWCASE_COOLDOWN = 150;
export const SHOWCASE_SEC = 25;
export const SHOWCASE_MULT = 3;

export const DEADLINE_EVERY = 360;
export const DEADLINE_SEC = 50;
export const DEADLINE_MULT = 1.5;

/** offline progress: everything runs at half speed, capped at eight hours. */
const OFFLINE_RATE = 0.5;
const OFFLINE_CAP_SEC = 8 * 3600;

export const MAX_REP = 60;

/* ------------------------------------------------------------------- state */

export type Pos = 'GK' | 'DF' | 'MF' | 'FW';

export interface Prospect {
  id: number;
  name: string;
  nation: string;
  pos: Pos;
  /** whole years, ticks up on the academy clock */
  age: number;
  ageClock: number;
  rating: number;
  potential: number;
}

export interface FactoryState {
  v: number;
  seed: number;
  cash: number;
  /** earned this run, drives the move up */
  lifetime: number;
  /** earned across every run, display only */
  careerEarned: number;
  rep: number;
  levels: Record<FacilityId, number>;
  prospects: Prospect[];
  scoutProgress: number;
  showcaseCooldown: number;
  showcaseLeft: number;
  deadlineIn: number;
  deadlineLeft: number;
  sold: number;
  soldCareer: number;
  best: number;
  leftFree: number;
  lastSeen: number;
  nextId: number;
}

/* -------------------------------------------------------------------- prng */

/** mulberry32, the Round 213 choice, for the Round 212 reason: a Lehmer
 *  step's first output is nearly linear in its seed. */
function rand(s: FactoryState): number {
  s.seed = (s.seed + 0x6d2b79f5) | 0;
  let t = s.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/* ------------------------------------------------------------------- kids */

/** A spread of nations across the name families intlNames actually maps. */
const NATIONS: string[] = [
  'England', 'Spain', 'Portugal', 'France', 'Germany', 'Italy', 'Netherlands',
  'Belgium', 'Croatia', 'Poland', 'Denmark', 'Sweden', 'Norway', 'Austria',
  'Switzerland', 'Greece', 'Turkey', 'Scotland', 'Ireland', 'Wales',
  'Brazil', 'Argentina', 'Uruguay', 'Colombia', 'Mexico', 'USA',
  'Japan', 'South Korea', 'Morocco', 'Senegal', 'Ghana', 'Nigeria',
];
const POSITIONS: Pos[] = ['GK', 'DF', 'DF', 'MF', 'MF', 'MF', 'FW', 'FW'];

/** price flavour by position, mild on purpose and measured in the harness */
const POS_PRICE: Record<Pos, number> = { GK: 0.95, DF: 1.0, MF: 1.04, FW: 1.08 };

/** Round 206's rule for Round 216: no two kids in the academy share a name.
 *  Reroll a dozen times, then walk deterministically, so this can neither
 *  fail nor loop. The walk crosses into OTHER nations if it has to, because
 *  intlName's stride arithmetic gives one nation only twelve distinct names
 *  and a twelve bed academy can in principle drain one nation dry. */
function uniqueKidName(s: FactoryState, nation: string): string {
  const taken = new Set(s.prospects.map(p => p.name));
  for (let i = 0; i < 12; i++) {
    const n = intlName(nation, Math.floor(rand(s) * 100_000));
    if (!taken.has(n)) return n;
  }
  for (const nat of [nation, ...NATIONS]) {
    for (let i = 0; i < 24; i++) {
      const n = intlName(nat, i);
      if (!taken.has(n)) return n;
    }
  }
  /* thirty two nations of twelve names against at most a dozen beds: the
     walk always finds one, this line is for the type checker */
  return intlName(nation, 0);
}

export function capacity(s: FactoryState): number {
  return 3 + s.levels.dorms;
}

function makeProspect(s: FactoryState): Prospect {
  const region = REGIONS[regionIndex(s)];
  const nation = NATIONS[Math.floor(rand(s) * NATIONS.length)];
  const pos = POSITIONS[Math.floor(rand(s) * POSITIONS.length)];
  const age = 15 + Math.floor(rand(s) * 4);
  const potential = Math.round(region.potMin + rand(s) * (region.potMax - region.potMin));
  const rating = Math.round(40 + rand(s) * Math.min(18, potential - 42));
  return {
    id: s.nextId++,
    name: uniqueKidName(s, nation),
    nation,
    pos,
    age,
    ageClock: rand(s) * YEAR_SEC * 0.5,
    rating,
    potential: Math.max(potential, rating + 4),
  };
}

/* ------------------------------------------------------------- multipliers */

export function regionIndex(s: FactoryState): number {
  return Math.min(s.rep, REGIONS.length - 1);
}
export function trainMult(s: FactoryState): number {
  return (1 + 0.3 * s.levels.coaching) * (1 + 0.15 * s.rep) * (s.showcaseLeft > 0 ? SHOWCASE_MULT : 1);
}
export function priceMult(s: FactoryState): number {
  return (1 + 0.08 * s.levels.agents) * (1 + 0.1 * s.rep) * (s.deadlineLeft > 0 ? DEADLINE_MULT : 1);
}
export function findSec(s: FactoryState): number {
  return Math.max(5, FIND_BASE_SEC / (1 + 0.25 * s.levels.scouting));
}

/** what the scouts can tell you about a ceiling at this level */
export function potentialRead(s: FactoryState, p: Prospect): { kind: 'hidden' | 'range' | 'exact'; lo?: number; hi?: number } {
  if (s.levels.scouting >= 6) return { kind: 'exact', lo: p.potential, hi: p.potential };
  if (s.levels.scouting >= 3) {
    const lo = Math.max(40, Math.floor(p.potential / 5) * 5 - 2);
    return { kind: 'range', lo, hi: Math.min(99, lo + 7) };
  }
  return { kind: 'hidden' };
}

/** The age premium: a 16 year old with room to grow is the prize, a 23 year
 *  old is just his rating. Fades linearly from 21 to 23. */
function ageFactor(age: number): number {
  if (age <= 20) return 1;
  if (age >= 23) return 0;
  return (23 - age) / 3;
}

/** the raw curve, exported so the help copy quotes the exact same maths */
export function basePrice(rating: number, potential: number, age: number, pos: Pos = 'MF'): number {
  const skill = Math.pow(rating, 2.35) / 60;
  /* 0.022 sits under 2.35/99, the exact bound that keeps the fee strictly
     rising in rating: training a kid must never cut his price */
  const promise = 1 + (potential - rating) * 0.022 * ageFactor(age);
  return skill * promise * POS_PRICE[pos];
}

export function salePrice(s: FactoryState, p: Prospect): number {
  return Math.round(basePrice(p.rating, p.potential, p.age, p.pos) * priceMult(s));
}

export function facilityCost(s: FactoryState, id: FacilityId): number {
  const f = FACILITIES.find(x => x.id === id)!;
  return Math.round(f.base * Math.pow(f.growth, s.levels[id]));
}

/* ----------------------------------------------------------------- actions */

export function newFactory(now: number, seed?: number): FactoryState {
  return {
    v: SAVE_VERSION,
    seed: (seed ?? Math.floor(now % 2147483647)) | 0,
    cash: 0,
    lifetime: 0,
    careerEarned: 0,
    rep: 0,
    levels: { scouting: 0, coaching: 0, dorms: 0, agents: 0 },
    prospects: [],
    scoutProgress: 0,
    showcaseCooldown: 0,
    showcaseLeft: 0,
    deadlineIn: DEADLINE_EVERY,
    deadlineLeft: 0,
    sold: 0,
    soldCareer: 0,
    best: 0,
    leftFree: 0,
    lastSeen: now,
    nextId: 1,
  };
}

export function buyFacility(s: FactoryState, id: FacilityId): boolean {
  const f = FACILITIES.find(x => x.id === id)!;
  if (s.levels[id] >= f.maxLevel) return false;
  const cost = facilityCost(s, id);
  if (s.cash < cost) return false;
  s.cash -= cost;
  s.levels[id] += 1;
  return true;
}

export function sellProspect(s: FactoryState, id: number): number | null {
  const i = s.prospects.findIndex(p => p.id === id);
  if (i === -1) return null;
  const price = salePrice(s, s.prospects[i]);
  s.prospects.splice(i, 1);
  s.cash += price;
  s.lifetime += price;
  s.careerEarned += price;
  s.sold += 1;
  s.soldCareer += 1;
  if (price > s.best) s.best = price;
  return price;
}

export function startShowcase(s: FactoryState): boolean {
  if (s.showcaseCooldown > 0 || s.showcaseLeft > 0) return false;
  s.showcaseLeft = SHOWCASE_SEC;
  s.showcaseCooldown = SHOWCASE_COOLDOWN;
  return true;
}

/** the move up: available once lifetime clears the region goal. Cash,
 *  facilities and every kid stay behind; the star is forever. */
export function canMoveUp(s: FactoryState): boolean {
  return s.lifetime >= REGIONS[regionIndex(s)].goal && s.rep < MAX_REP;
}
export function moveUp(s: FactoryState): boolean {
  if (!canMoveUp(s)) return false;
  const now = s.lastSeen;
  const carried: Pick<FactoryState, 'rep' | 'careerEarned' | 'soldCareer' | 'seed' | 'nextId'> = {
    rep: s.rep + 1,
    careerEarned: s.careerEarned,
    soldCareer: s.soldCareer,
    seed: s.seed,
    nextId: s.nextId,
  };
  Object.assign(s, newFactory(now), carried);
  return true;
}

/* -------------------------------------------------------------------- tick */

/** Advance the academy by dt seconds of play. Never called with wall-clock
 *  gaps: applyOffline handles those under its own cap. */
export function tick(s: FactoryState, dt: number, opts?: { offline?: boolean }): void {
  if (!(dt > 0)) return;
  const offline = opts?.offline === true;

  /* clocks that only run while someone is watching */
  if (!offline) {
    if (s.showcaseLeft > 0) s.showcaseLeft = Math.max(0, s.showcaseLeft - dt);
    if (s.showcaseCooldown > 0) s.showcaseCooldown = Math.max(0, s.showcaseCooldown - dt);
    if (s.deadlineLeft > 0) {
      s.deadlineLeft = Math.max(0, s.deadlineLeft - dt);
    } else {
      s.deadlineIn -= dt;
      while (s.deadlineIn <= 0) {
        s.deadlineIn += DEADLINE_EVERY;
        s.deadlineLeft = DEADLINE_SEC;
      }
    }
  }

  /* scouting */
  if (s.prospects.length < capacity(s)) {
    s.scoutProgress += dt;
    let guard = 0;
    while (s.scoutProgress >= findSec(s) && s.prospects.length < capacity(s) && guard < 200) {
      s.scoutProgress -= findSec(s);
      s.prospects.push(makeProspect(s));
      guard += 1;
    }
    if (s.prospects.length >= capacity(s)) s.scoutProgress = Math.min(s.scoutProgress, findSec(s));
  } else {
    /* a full academy holds one find in hand, never banks a queue */
    s.scoutProgress = Math.min(s.scoutProgress + dt, findSec(s));
  }

  /* training and the clock. Growth slows toward the ceiling and never
     crosses it: headroom is the fraction of the original climb left. */
  const tm = trainMult(s);
  const leavers: number[] = [];
  for (const p of s.prospects) {
    if (p.rating < p.potential) {
      const headroom = Math.max(0.12, (p.potential - p.rating) / Math.max(1, p.potential - 40));
      p.rating = Math.min(p.potential, p.rating + TRAIN_BASE * tm * headroom * dt);
    }
    /* the calendar only turns while someone is watching. An eight hour
       offline gap is 96 academy years, and coming back to an academy the
       clock emptied reads as a lost save, not as consequence. So away time
       trains and scouts at half speed but ages nobody, and the help copy
       says exactly that. */
    if (!offline) {
      p.ageClock += dt;
      while (p.ageClock >= YEAR_SEC) {
        p.ageClock -= YEAR_SEC;
        p.age += 1;
      }
      if (p.age >= LEAVE_AGE) leavers.push(p.id);
    }
  }
  /* the honest failure state: hold a kid too long and he walks for free */
  for (const id of leavers) {
    const i = s.prospects.findIndex(p => p.id === id);
    if (i !== -1) {
      s.prospects.splice(i, 1);
      s.leftFree += 1;
    }
  }
}

/** Offline progress at half speed, capped hard. Sales are manual so cash can
 *  never accrue offline; only scouting and training move. */
export function applyOffline(s: FactoryState, now: number): number {
  const gapSec = Math.max(0, (now - s.lastSeen) / 1000);
  const applied = Math.min(gapSec, OFFLINE_CAP_SEC) * OFFLINE_RATE;
  if (applied > 1) tick(s, applied, { offline: true });
  s.lastSeen = now;
  return applied;
}

/* ------------------------------------------------------------ persistence */

export function serialize(s: FactoryState): string {
  return JSON.stringify(s);
}

/** Fail closed: anything not exactly right comes back sane or the whole
 *  save is refused. A doctored save gets a working game, never a printing
 *  press. */
export function deserialize(raw: string | null, now: number): FactoryState | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Partial<FactoryState>;
    if (!p || typeof p !== 'object' || p.v !== SAVE_VERSION) return null;
    const base = newFactory(now);
    const s: FactoryState = { ...base, ...p, levels: { ...base.levels, ...(p.levels ?? {}) } } as FactoryState;
    /* finite, non negative, and under a quadrillion: the biggest honest
       sale is about twenty million, so the cap costs a real save nothing
       and denies a doctored one its printing press */
    for (const k of ['cash', 'lifetime', 'careerEarned', 'best'] as const) {
      if (!Number.isFinite(s[k]) || s[k] < 0) s[k] = 0;
      s[k] = Math.min(s[k], 1e15);
    }
    if (!Number.isFinite(s.rep) || s.rep < 0 || s.rep > MAX_REP) s.rep = 0;
    for (const f of FACILITIES) {
      const lvl = s.levels[f.id];
      s.levels[f.id] = Number.isFinite(lvl) && lvl > 0 ? Math.min(Math.floor(lvl), f.maxLevel) : 0;
    }
    for (const k of ['sold', 'soldCareer', 'leftFree', 'nextId'] as const) {
      if (!Number.isFinite(s[k]) || s[k] < 0) s[k] = k === 'nextId' ? 1 : 0;
    }
    if (!Number.isFinite(s.seed)) s.seed = Math.floor(now % 2147483647) | 0;
    s.seed = s.seed | 0;
    if (!Number.isFinite(s.scoutProgress) || s.scoutProgress < 0) s.scoutProgress = 0;
    s.showcaseLeft = clampClock(s.showcaseLeft, SHOWCASE_SEC);
    s.showcaseCooldown = clampClock(s.showcaseCooldown, SHOWCASE_COOLDOWN);
    s.deadlineLeft = clampClock(s.deadlineLeft, DEADLINE_SEC);
    s.deadlineIn = Number.isFinite(s.deadlineIn) && s.deadlineIn > 0 ? Math.min(s.deadlineIn, DEADLINE_EVERY) : DEADLINE_EVERY;
    if (!Number.isFinite(s.lastSeen) || s.lastSeen <= 0 || s.lastSeen > now) s.lastSeen = now;
    /* only plausible kids survive: real fields, ceilings inside the game's
       world, ratings under their ceilings, and no shared names */
    const cap = 3 + s.levels.dorms;
    const seen = new Set<string>();
    const clean: Prospect[] = [];
    for (const k of Array.isArray(s.prospects) ? s.prospects : []) {
      if (!k || typeof k !== 'object') continue;
      if (typeof k.name !== 'string' || !k.name || seen.has(k.name)) continue;
      if (!POSITIONS.includes(k.pos)) continue;
      if (typeof k.nation !== 'string' || !(k.nation in NATION_FAMILY)) continue;
      if (!Number.isFinite(k.rating) || !Number.isFinite(k.potential)) continue;
      const potential = Math.min(99, Math.max(45, Math.round(k.potential)));
      const rating = Math.min(potential, Math.max(30, k.rating));
      const age = Number.isFinite(k.age) ? Math.min(LEAVE_AGE - 1, Math.max(15, Math.floor(k.age))) : 17;
      clean.push({
        id: Number.isFinite(k.id) ? k.id : s.nextId++,
        name: k.name,
        nation: k.nation,
        pos: k.pos,
        age,
        ageClock: clampClock(k.ageClock, YEAR_SEC),
        rating,
        potential,
      });
      seen.add(k.name);
      if (clean.length >= cap) break;
    }
    s.prospects = clean;
    return s;
  } catch {
    return null;
  }
}

function clampClock(v: unknown, max: number): number {
  return Number.isFinite(v) && (v as number) > 0 ? Math.min(v as number, max) : 0;
}

/** Compact money formatting, same ladder as the tycoon so the two idle games
 *  speak the same language. */
export function fmtCash(n: number): string {
  if (n >= 1e12) return `£${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `£${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `£${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e4) return `£${(n / 1e3).toFixed(1)}K`;
  return `£${Math.floor(n).toLocaleString()}`;
}
