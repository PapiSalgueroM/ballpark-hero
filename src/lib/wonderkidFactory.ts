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
import { ensureUniqueIds, makeIdMinter } from '@/lib/entityIds';
import { basePrice } from '@/lib/playerValue';
import { BOOT_IDS } from '@/lib/soccerBootIds';
export { basePrice } from '@/lib/playerValue';

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
  { name: 'World Stage', emoji: '🌍', potMin: 78, potMax: 99, goal: 45_000_000 },
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
/** First team years run only while the academy is watched. */
export const SENIOR_YEAR_SEC = 900;
export const FIRST_TEAM_SLOTS = 5;
export const PROMOTE_AGE = 18;
export const RETIRE_AGE = 34;
export const SENIOR_DECLINE = 1.2;

export const SHOWCASE_COOLDOWN = 150;
export const SHOWCASE_SEC = 25;
export const SHOWCASE_MULT = 3;

export const DEADLINE_EVERY = 360;
export const DEADLINE_SEC = 50;
export const DEADLINE_MULT = 1.5;

/** offline progress: everything runs at half speed, capped at eight hours. */
const OFFLINE_RATE = 0.5;
const OFFLINE_CAP_SEC = 8 * 3600;
/**
 * Round 581: the longest gap between two clock callbacks on a VISIBLE page that
 * still counts as somebody watching. A hidden page is always away, whatever the
 * gap (see advanceClock).
 *
 * The first draft used Idle Arena's 750ms and decided on the gap alone. The
 * review found both halves of that wrong for this game: a hidden tab whose
 * throttled wakes jitter can land one gap under 750ms and reset the eight hour
 * meter (twenty hidden hours credited ten, against a promise of four), and a
 * slow phone whose visible callbacks come every 800ms was paid as away, so kids
 * stopped ageing while being watched and after eight hours the academy stopped
 * dead. Visibility decides hidden; this bound only catches a visible page that
 * was not really running (a sleeping laptop wakes with one huge gap), and five
 * seconds is far past any honest main thread stall.
 *
 * Before this round the hook ticked a fixed quarter second per callback, so a
 * tab hidden for three hours (a callback a second at first, then one a minute
 * once the browser throttles it hard) trained for a minute or two and stamped
 * lastSeen on every callback, so a reload could not pay those hours either. The
 * rules modal promises half speed for up to eight hours.
 */
export const AWAY_AFTER_MS = 5000;
/** Away time trains in steps of at most this many academy seconds, so one long
 *  closed absence and the same absence paid a wake at a time land on the same
 *  academy. Growth slows toward the ceiling, so one giant step used to overpay. */
const AWAY_STEP_SEC = 5;

export const MAX_REP = 60;

/* ------------------------------------------------------------ packs (585) */

/** Round 585: a pack kid's tier is a band of potential, drawn through the same
 *  generator the scouts use. */
export type TierId = 'grassroots' | 'prospect' | 'talent' | 'star' | 'phenom';
export interface Tier { id: TierId; label: string; potMin: number; potMax: number }
export const TIERS: Tier[] = [
  { id: 'grassroots', label: 'Grassroots', potMin: 58, potMax: 70 },
  { id: 'prospect', label: 'Prospect', potMin: 66, potMax: 78 },
  { id: 'talent', label: 'Talent', potMin: 74, potMax: 86 },
  { id: 'star', label: 'Star', potMin: 82, potMax: 92 },
  { id: 'phenom', label: 'Phenom', potMin: 90, potMax: 99 },
];
export const TIER_IDS: TierId[] = TIERS.map(t => t.id);

export type PackId = 'scout' | 'club' | 'elite';
export interface Pack {
  id: PackId;
  name: string;
  emoji: string;
  /** gems */
  price: number;
  /** the first one of this pack costs nothing */
  firstFree: boolean;
  /** whole percents per tier, summing to 100, printed on the panel as they are */
  odds: Record<TierId, number>;
  /** a Star or better arrives on or before this many packs since the last one */
  guarantee: number | null;
}
/** Round 585: the published odds. The Packs panel prints these numbers and no
 *  others, and scripts/simTycoonPacks.mjs draws against them. A better pack has
 *  strictly better odds; nothing about a pack is ever sold for money. */
export const PACKS: Pack[] = [
  { id: 'scout', name: 'Scout Pack', emoji: '🔭', price: 30, firstFree: true, odds: { grassroots: 62, prospect: 30, talent: 7, star: 1, phenom: 0 }, guarantee: null },
  { id: 'club', name: 'Club Pack', emoji: '🏟️', price: 100, firstFree: false, odds: { grassroots: 0, prospect: 55, talent: 35, star: 9, phenom: 1 }, guarantee: 10 },
  { id: 'elite', name: 'Elite Pack', emoji: '👑', price: 250, firstFree: false, odds: { grassroots: 0, prospect: 0, talent: 60, star: 34, phenom: 6 }, guarantee: 3 },
];
/** The tiers a guarantee counts: a Star or better. */
export const GUARANTEED_TIERS: TierId[] = ['star', 'phenom'];

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
  /** Round 585: the pack tier a kid came from. Scouted kids have none. */
  tier?: TierId;
}

/** A graduate keeps his name and ability, with a separate first team id. */
export interface Senior extends Omit<Prospect, 'id'> {
  id: string;
  bootId?: string;
}

export type GearLevels = Readonly<Partial<Record<string, number>>>;
export const MAX_BOOT_LEVEL = 3;

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
  /** Round 581: wall ms already paid as away time in the current absence, so
   *  the eight hour cap counts the whole absence rather than each throttled
   *  callback inside it. The first watched tick sets it back to zero. Optional,
   *  so every older save loads and older builds carry it through untouched. */
  awayMs?: number;
  /** Round 585: the highest pack sequence delivered into this academy, so a pack
   *  opened once is delivered once, whatever reloads in between. Optional, so
   *  every older save loads as it did. */
  packsDelivered?: number;
  /** Optional so untouched V1 saves keep their original shape. */
  firstTeam?: Senior[];
  retired?: number;
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

/** Round 206's rule for Round 216: no two kids in the academy share a name.
 *  Reroll a dozen times, then walk deterministically, so this can neither
 *  fail nor loop. The walk crosses into OTHER nations if it has to, because
 *  intlName's stride arithmetic gives one nation only twelve distinct names
 *  and a twelve bed academy can in principle drain one nation dry. */
function uniqueKidName(s: FactoryState, nation: string, rng: () => number): string {
  const taken = new Set([...s.prospects, ...(s.firstTeam ?? [])].map(p => p.name));
  for (let i = 0; i < 12; i++) {
    const n = intlName(nation, Math.floor(rng() * 100_000));
    if (!taken.has(n)) return n;
  }
  for (const nat of [nation, ...NATIONS]) {
    for (let i = 0; i < 24; i++) {
      const n = intlName(nat, i);
      if (!taken.has(n)) return n;
    }
  }
  /* thirty two nations of twelve names against at most seventeen players: the
     walk always finds one, this line is for the type checker */
  return intlName(nation, 0);
}

export function capacity(s: FactoryState): number {
  return 3 + s.levels.dorms;
}

/** Round 585: one generated kid with a ceiling drawn inside [potMin, potMax],
 *  every draw from `rng`. The scouts call it with their region's band and the
 *  academy's own seed, in exactly the order they always drew
 *  (scripts/data/academyScoutBaseline.json holds 500 finds to it); a pack calls
 *  it with its tier's band and the pack ledger's generator. */
export function makeProspectInBand(s: FactoryState, potMin: number, potMax: number, rng: () => number): Prospect {
  const nation = NATIONS[Math.floor(rng() * NATIONS.length)];
  const pos = POSITIONS[Math.floor(rng() * POSITIONS.length)];
  const age = 15 + Math.floor(rng() * 4);
  const potential = Math.round(potMin + rng() * (potMax - potMin));
  const rating = Math.round(40 + rng() * Math.min(18, potential - 42));
  return {
    id: mintKidId(s),
    name: uniqueKidName(s, nation, rng),
    nation,
    pos,
    age,
    ageClock: rng() * YEAR_SEC * 0.5,
    rating,
    potential: Math.max(potential, rating + 4),
  };
}

function makeProspect(s: FactoryState): Prospect {
  const region = REGIONS[regionIndex(s)];
  return makeProspectInBand(s, region.potMin, region.potMax, () => rand(s));
}

/** Round 585: a free bed for a pack kid. */
export function bedFree(s: FactoryState): boolean {
  return s.prospects.length < capacity(s);
}

/** A stored pack kid must be safe both on his reveal card and in the academy. */
export function cleanPackKid(kid: Prospect, tier: TierId): Prospect | null {
  const band = TIERS.find(t => t.id === tier);
  if (!band) return null;
  const nation = typeof kid.nation === 'string' && Object.prototype.hasOwnProperty.call(NATION_FAMILY, kid.nation) ? kid.nation : NATIONS[0];
  const potential = Math.min(band.potMax, Math.max(band.potMin, Math.round(Number.isFinite(kid.potential) ? kid.potential : band.potMin)));
  return {
    id: Number.isSafeInteger(kid.id) && kid.id > 0 ? kid.id : 1,
    name: isPlayerName(kid.name) ? kid.name : '',
    nation,
    pos: POSITIONS.includes(kid.pos) ? kid.pos : 'MF',
    age: Number.isFinite(kid.age) ? Math.min(LEAVE_AGE - 1, Math.max(15, Math.floor(kid.age))) : 16,
    ageClock: clampClock(kid.ageClock, YEAR_SEC),
    rating: Math.min(potential, Math.max(30, Number.isFinite(kid.rating) ? kid.rating : 40)),
    potential,
    tier,
  };
}

/** Round 585: move a drawn pack kid into the academy, exactly once per pack.
 *  He gets this academy's next id and, in the rare case a scout brought in his
 *  name first, a fresh name from the same nation. Returns false when the pack is
 *  already delivered or there is no bed (the hook tries again when one frees). */
export function deliverPack(s: FactoryState, seq: number, kid: Prospect, tier: TierId): boolean {
  if ((s.packsDelivered ?? 0) >= seq || !bedFree(s)) return false;
  const clean = cleanPackKid(kid, tier);
  if (!clean) return false;
  /* Review: a stored kid is data from storage, so he moves in only as the loader
     would keep him, inside his tier's band, and a name clash is walked with a
     generator of his own rather than the academy's, so the scouts never move. */
  let own = seq | 0;
  const ownRng = () => { own = (own + 0x6d2b79f5) | 0; return ((Math.imul(own ^ (own >>> 15), own | 1) >>> 0) % 1000) / 1000; };
  const name = clean.name && ![...s.prospects, ...(s.firstTeam ?? [])].some(p => p.name === clean.name) ? clean.name : uniqueKidName(s, clean.nation, ownRng);
  s.prospects.push({
    ...clean,
    id: mintKidId(s),
    name,
  });
  s.packsDelivered = seq;
  return true;
}

/* ------------------------------------------------------------- multipliers */

export function regionIndex(s: FactoryState): number {
  return Math.min(s.rep, REGIONS.length - 1);
}
/* Round 530 review: the page prints both of these, on the star card and on
   the header chip. They are exported so it reads them off the engine rather
   than re-typing them, which is how a retune here would otherwise leave the
   card announcing a bonus the game no longer pays. */
/** What one star of reputation adds to training speed. */
export const REP_TRAIN_BONUS = 0.15;
/** What one star of reputation adds to a sale fee. */
export const REP_FEE_BONUS = 0.1;

export function trainMult(s: FactoryState): number {
  return (1 + 0.3 * s.levels.coaching) * (1 + REP_TRAIN_BONUS * s.rep) * (s.showcaseLeft > 0 ? SHOWCASE_MULT : 1);
}
export function priceMult(s: FactoryState): number {
  return (1 + 0.08 * s.levels.agents) * (1 + REP_FEE_BONUS * s.rep) * (s.deadlineLeft > 0 ? DEADLINE_MULT : 1);
}
export function findSec(s: FactoryState): number {
  return Math.max(5, FIND_BASE_SEC / (1 + 0.25 * s.levels.scouting));
}

/** what the scouts can tell you about a ceiling at this level */
export function potentialRead(s: FactoryState, p: Prospect | Senior): { kind: 'hidden' | 'range' | 'exact'; lo?: number; hi?: number } {
  if (s.levels.scouting >= 6) return { kind: 'exact', lo: p.potential, hi: p.potential };
  /* Round 585: a pack kid comes with his tier, so below Scouting 6 his band is known. */
  const band = p.tier ? TIERS.find(t => t.id === p.tier) : undefined;
  if (band) return { kind: 'range', lo: band.potMin, hi: band.potMax };
  if (s.levels.scouting >= 3) {
    const lo = Math.max(40, Math.floor(p.potential / 5) * 5 - 2);
    return { kind: 'range', lo, hi: Math.min(99, lo + 7) };
  }
  return { kind: 'hidden' };
}

export function salePrice(s: FactoryState, p: Prospect | Senior): number {
  return Math.round(basePrice(p.rating, p.potential, p.age, p.pos) * priceMult(s));
}

/** The next birthday without further training or a change in sale bonuses. */
export function seniorBirthdayPreview(s: FactoryState, p: Senior): { age: number; rating: number; price: number; retiring: boolean } {
  const age = p.age + 1;
  const rating = age >= 30 ? Math.max(30, p.rating - SENIOR_DECLINE) : p.rating;
  const retiring = age >= RETIRE_AGE;
  return { age, rating, price: retiring ? 0 : salePrice(s, { ...p, age, rating }), retiring };
}

/** This defensive edge belongs to the first team, not a purchasable track. */
export function squadEdge(s: FactoryState, levels: GearLevels = {}): number {
  const worn = new Set<string>();
  const total = (s.firstTeam ?? []).slice(0, FIRST_TEAM_SLOTS).reduce((sum, p) => {
    const level = p.bootId && !worn.has(p.bootId) ? bootLevel(levels, p.bootId) : 0;
    if (level && p.bootId) worn.add(p.bootId);
    const effectiveRating = Math.min(99, p.rating + level);
    return sum + Math.max(0, effectiveRating - 60);
  }, 0);
  return Math.min(0.40, total * 0.002);
}

function bootLevel(levels: GearLevels, id: string): number {
  if (!BOOT_IDS.some(bootId => bootId === id) || !Object.prototype.hasOwnProperty.call(levels, id)) return 0;
  const level = levels[id];
  return Number.isInteger(level) && level! >= 1 && level! <= MAX_BOOT_LEVEL ? level! : 0;
}

/** Each unlocked line is one pair. Moving it takes it off its previous wearer. */
export function equipBoot(s: FactoryState, seniorId: string, bootId: string | null, levels: GearLevels): boolean {
  const player = s.firstTeam?.find(p => p.id === seniorId);
  if (!player || (bootId !== null && !bootLevel(levels, bootId)) || (player.bootId ?? null) === bootId) return false;
  if (bootId !== null) {
    for (const other of s.firstTeam ?? []) if (other.bootId === bootId) delete other.bootId;
    player.bootId = bootId;
  } else delete player.bootId;
  return true;
}

/** Load order is stable: the first valid wearer keeps a pair if a save duplicates it. */
export function normalizeBoots(s: FactoryState, levels: GearLevels = {}): boolean {
  const worn = new Set<string>();
  let changed = false;
  for (const player of s.firstTeam ?? []) {
    if (player.bootId === undefined) continue;
    if (!bootLevel(levels, player.bootId) || worn.has(player.bootId)) {
      delete player.bootId;
      changed = true;
    } else worn.add(player.bootId);
  }
  return changed;
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

let seniorIdMinter: (() => string) | undefined;
function freshSeniorId(taken: Set<string>): string {
  seniorIdMinter ??= makeIdMinter('sr');
  let id = seniorIdMinter();
  while (taken.has(id)) id = seniorIdMinter();
  taken.add(id);
  return id;
}

/** Promote a graduate without changing his age or his progress to a birthday. */
export function promote(s: FactoryState, id: number): boolean {
  const firstTeam = s.firstTeam ?? [];
  if (firstTeam.length >= FIRST_TEAM_SLOTS) return false;
  const i = s.prospects.findIndex(p => p.id === id);
  if (i === -1) return false;
  const p = s.prospects[i];
  if (p.age < PROMOTE_AGE || p.age >= LEAVE_AGE) return false;
  firstTeam.push({
    ...p,
    id: freshSeniorId(new Set(firstTeam.map(player => player.id))),
    ageClock: p.ageClock * SENIOR_YEAR_SEC / YEAR_SEC,
  });
  s.firstTeam = firstTeam;
  s.prospects.splice(i, 1);
  return true;
}

export function sellSenior(s: FactoryState, id: string): number | null {
  const i = s.firstTeam?.findIndex(p => p.id === id) ?? -1;
  if (i === -1) return null;
  const price = salePrice(s, s.firstTeam![i]);
  s.firstTeam!.splice(i, 1);
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
  const carried: Pick<FactoryState, 'rep' | 'careerEarned' | 'soldCareer' | 'seed' | 'nextId' | 'awayMs' | 'packsDelivered' | 'firstTeam' | 'retired'> = {
    rep: s.rep + 1,
    careerEarned: s.careerEarned,
    soldCareer: s.soldCareer,
    seed: s.seed,
    nextId: s.nextId,
    awayMs: s.awayMs ?? 0,
    packsDelivered: s.packsDelivered,
    firstTeam: s.firstTeam,
    retired: s.retired,
  };
  Object.assign(s, newFactory(now), carried);
  if (carried.packsDelivered === undefined) delete s.packsDelivered;
  if (carried.firstTeam === undefined) delete s.firstTeam;
  if (carried.retired === undefined) delete s.retired;
  return true;
}

/* -------------------------------------------------------------------- tick */

/** Advance the academy by dt seconds of play. Never called with wall-clock
 *  gaps: applyOffline handles those under its own cap. */
export function tick(s: FactoryState, dt: number, opts?: { offline?: boolean }): void {
  if (!(dt > 0) || !Number.isFinite(dt)) return;
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
  /* Round 581 review: a showcase is a watched moment. Away time trains at the
     away rate without it, and its clock waits (above), so hiding the tab during
     a showcase neither multiplies the away pay by three nor burns the showcase.
     Before this, a hidden tab with a showcase lit trained at 1.5 times the
     WATCHED speed and the showcase never ran out: the stadium's Matchday Hype
     has had the same exclusion since Round 150. */
  const tm = offline && s.showcaseLeft > 0 ? trainMult(s) / SHOWCASE_MULT : trainMult(s);
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

  /* Seniors use the same academy session, with half the growth rate. Split at
     birthdays so a long watched tick cannot train through a holding year or
     miss one of the later declines. Away sessions never move this calendar. */
  for (const p of s.firstTeam ?? []) {
    let left = dt;
    while (left > 0 && p.age < RETIRE_AGE) {
      const seconds = offline ? left : Math.min(left, SENIOR_YEAR_SEC - p.ageClock);
      if (p.age <= 27 && p.rating < p.potential) {
        const headroom = Math.max(0.12, (p.potential - p.rating) / Math.max(1, p.potential - 40));
        p.rating = Math.min(p.potential, p.rating + TRAIN_BASE * tm * headroom * seconds * 0.5);
      }
      left -= seconds;
      if (offline) break;
      p.ageClock += seconds;
      if (p.ageClock >= SENIOR_YEAR_SEC) {
        p.ageClock = 0;
        p.age += 1;
        if (p.age >= 30) p.rating = Math.max(30, p.rating - SENIOR_DECLINE);
      }
    }
  }
  if (s.firstTeam) {
    const active = s.firstTeam.filter(p => p.age < RETIRE_AGE);
    const retired = s.firstTeam.length - active.length;
    if (retired > 0) {
      s.retired = (s.retired ?? 0) + retired;
      s.firstTeam = active;
    }
  }
}

/** Offline progress at half speed, capped hard. Sales are manual so cash can
 *  never accrue offline; only scouting and training move. This is the load
 *  path: the whole gap since the save was last stamped is one absence. */
export function applyOffline(s: FactoryState, now: number): number {
  const applied = applyAway(s, now - s.lastSeen);
  s.lastSeen = now;
  return applied;
}

/**
 * Round 581: pay `gapMs` of wall clock as away time. Half speed, nobody ages,
 * no Deadline Day, and the eight hour cap counts the WHOLE absence through the
 * `awayMs` meter, because a throttled tab wakes up once a minute and would
 * otherwise collect a fresh eight hours on every wake. Returns the academy
 * seconds credited. Idle Arena's shape (src/lib/idleArena.ts applyOffline).
 */
export function applyAway(s: FactoryState, gapMs: number): number {
  const used = Number.isFinite(s.awayMs) && (s.awayMs as number) > 0 ? (s.awayMs as number) : 0;
  const left = Math.max(0, OFFLINE_CAP_SEC * 1000 - used);
  const away = Math.min(Math.max(0, Number.isFinite(gapMs) ? gapMs : 0), left);
  s.awayMs = used + away;
  const applied = (away / 1000) * OFFLINE_RATE;
  for (let left = applied; left > 0; left -= AWAY_STEP_SEC) {
    tick(s, Math.min(AWAY_STEP_SEC, left), { offline: true });
  }
  return applied;
}

/**
 * Round 581: one callback of the academy's clock, `gapMs` after the last. On a
 * visible page a gap up to AWAY_AFTER_MS is somebody watching: full speed, the
 * calendar turns, and the absence meter goes back to zero. A hidden page, or a
 * longer gap, is time away and goes through applyAway. The caller stamps
 * lastSeen and says whether the page is visible.
 */
export function advanceClock(s: FactoryState, gapMs: number, visible = true): { away: boolean; seconds: number } {
  if (!(gapMs > 0)) return { away: false, seconds: 0 };
  if (!visible || gapMs > AWAY_AFTER_MS) return { away: true, seconds: applyAway(s, gapMs) };
  s.awayMs = 0;
  tick(s, gapMs / 1000);
  return { away: false, seconds: gapMs / 1000 };
}

/* ------------------------------------------------------------ persistence */

export function serialize(s: FactoryState): string {
  return JSON.stringify(s);
}

/** Fail closed: anything not exactly right comes back sane or the whole
 *  save is refused. A doctored save gets a working game, never a printing
 *  press. */
export function deserialize(raw: string | null, now: number, gear: GearLevels = {}): FactoryState | null {
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
    /* Round 581: stars are whole. A fractional rep indexes REGIONS with a
       fraction and quotes bonuses the game never pays. */
    s.rep = Math.floor(s.rep);
    for (const f of FACILITIES) {
      const lvl = s.levels[f.id];
      s.levels[f.id] = Number.isFinite(lvl) && lvl > 0 ? Math.min(Math.floor(lvl), f.maxLevel) : 0;
    }
    for (const k of ['sold', 'soldCareer', 'leftFree', 'nextId'] as const) {
      if (!Number.isFinite(s[k]) || s[k] < 0) s[k] = k === 'nextId' ? 1 : 0;
      s[k] = Math.floor(s[k]);
    }
    /* An honest academy mints a kid every few seconds at most, so a billion ids
       is centuries of play; anything at or past it is a doctored save, and past
       2^53 the arithmetic that keeps ids apart stops working at all. */
    if (s.nextId < 1 || s.nextId >= MAX_KID_ID) s.nextId = 1;
    /* Round 581: the away meter comes back inside the only range it can hold.
       Left absent when the save never had one, so an older save loads byte for
       byte as it did. */
    if (s.awayMs !== undefined) {
      s.awayMs = Number.isFinite(s.awayMs) && (s.awayMs as number) > 0 ? Math.min(s.awayMs as number, OFFLINE_CAP_SEC * 1000) : 0;
    }
    /* Round 585: absent on every older save, and left absent. */
    if (s.packsDelivered !== undefined) {
      s.packsDelivered = Number.isSafeInteger(s.packsDelivered) && (s.packsDelivered as number) > 0 ? (s.packsDelivered as number) : 0;
    }
    if (s.retired !== undefined) {
      s.retired = Number.isFinite(s.retired) && (s.retired as number) > 0 ? Math.min(1e9, Math.floor(s.retired as number)) : 0;
    }
    /* Round 581, Round 568's rule for a persisted counter: the next id must sit
       above every id already written, or the next kid scouted is handed an id a
       saved kid already wears and selling one sells the other. */
    const reservedKidIds = new Set<number>();
    for (const k of Array.isArray(s.prospects) ? s.prospects : []) {
      if (k && isKidId(k.id) && k.id >= s.nextId) s.nextId = k.id + 1;
      if (k && isKidId(k.id)) reservedKidIds.add(k.id);
    }
    if (s.nextId >= MAX_KID_ID) s.nextId = 1;
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
    const ids = new Set<number>();
    const clean: Prospect[] = [];
    for (const k of Array.isArray(s.prospects) ? s.prospects : []) {
      if (!k || typeof k !== 'object') continue;
      if (!isPlayerName(k.name) || seen.has(k.name)) continue;
      if (!POSITIONS.includes(k.pos)) continue;
      if (typeof k.nation !== 'string' || !Object.prototype.hasOwnProperty.call(NATION_FAMILY, k.nation)) continue;
      if (!Number.isFinite(k.rating) || !Number.isFinite(k.potential)) continue;
      const potential = Math.min(99, Math.max(45, Math.round(k.potential)));
      const rating = Math.min(potential, Math.max(30, k.rating));
      const age = Number.isFinite(k.age) ? Math.min(LEAVE_AGE - 1, Math.max(15, Math.floor(k.age))) : 17;
      /* First holder wins (entityIds.ts): the first kid under an id keeps it,
         so nothing already pointing at it moves, and a shadowed or broken id
         is re-minted rather than the kid dropped. */
      const id = isKidId(k.id) && !ids.has(k.id) ? k.id : mintKidId(s, reservedKidIds);
      ids.add(id);
      clean.push({
        id,
        name: k.name,
        nation: k.nation,
        pos: k.pos,
        age,
        ageClock: clampClock(k.ageClock, YEAR_SEC),
        rating,
        potential,
        ...(typeof k.tier === 'string' && TIER_IDS.includes(k.tier as TierId) ? { tier: k.tier as TierId } : {}),
      });
      seen.add(k.name);
      if (clean.length >= cap) break;
    }
    s.prospects = clean;
    if (p.firstTeam !== undefined) {
      const seniors: Senior[] = [];
      for (const player of Array.isArray(p.firstTeam) ? p.firstTeam : []) {
        if (!player || typeof player !== 'object' || !isPlayerName(player.name)) continue;
        if (!POSITIONS.includes(player.pos)) continue;
        if (typeof player.nation !== 'string' || !Object.prototype.hasOwnProperty.call(NATION_FAMILY, player.nation)) continue;
        if (!Number.isFinite(player.rating) || !Number.isFinite(player.potential) || !Number.isFinite(player.age)) continue;
        if (player.age >= RETIRE_AGE) continue;
        const potential = Math.min(99, Math.max(45, Math.round(player.potential)));
        const name = seen.has(player.name)
          ? uniqueKidName({ ...s, firstTeam: seniors }, player.nation, () => 0)
          : player.name;
        seniors.push({
          id: typeof player.id === 'string' && player.id.length <= 100 && !/\s/.test(player.id) ? player.id : '',
          name,
          nation: player.nation,
          pos: player.pos,
          age: Math.max(18, Math.floor(player.age)),
          ageClock: clampClock(player.ageClock, SENIOR_YEAR_SEC),
          rating: Math.min(potential, Math.max(30, player.rating)),
          potential,
          ...(typeof player.tier === 'string' && TIER_IDS.includes(player.tier as TierId) ? { tier: player.tier as TierId } : {}),
          ...(typeof player.bootId === 'string' ? { bootId: player.bootId } : {}),
        });
        seen.add(name);
        if (seniors.length >= FIRST_TEAM_SLOTS) break;
      }
      const reserved = new Set(seniors.map(player => player.id));
      ensureUniqueIds(() => freshSeniorId(reserved), [seniors]);
      s.firstTeam = seniors;
      normalizeBoots(s, gear);
    }
    return s;
  } catch {
    return null;
  }
}

const MAX_KID_ID = 1e9;
function isPlayerName(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 100 && !/[\u0000-\u001f\u007f]/.test(value);
}
function isKidId(v: unknown): v is number {
  return Number.isSafeInteger(v) && (v as number) >= 0 && (v as number) < MAX_KID_ID;
}

/** Reserve before minting, including when a doctored counter reaches its cap. */
function mintKidId(s: FactoryState, reserved = new Set(s.prospects.map(p => p.id))): number {
  if (!Number.isSafeInteger(s.nextId) || s.nextId < 1 || s.nextId >= MAX_KID_ID) s.nextId = 1;
  while (reserved.has(s.nextId)) {
    s.nextId += 1;
    if (s.nextId >= MAX_KID_ID) s.nextId = 1;
  }
  const id = s.nextId++;
  reserved.add(id);
  if (s.nextId >= MAX_KID_ID) s.nextId = 1;
  return id;
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
