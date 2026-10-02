/**
 * Round 910: the staff desk, for every manager game on the site.
 *
 * The owner, 2026-10-02: every manager game in every sport should behave like
 * the soccer one, with its own sport's things. Club Manager has had a staff
 * desk since Round 471 (hire, sack, promote, rivals poach, you match a
 * limited number of times). This file is that desk with the soccer taken out:
 * the person, the shortlist, the wage curve, the fee, the severance, the
 * approach and its deadline, the weekly tick, the summer and the payroll, all
 * over a list of posts that is handed in. src/lib/clubManagerStaff.ts hands
 * in its four and delegates every shared part here, and
 * scripts/data/cmStaffFixture.json (recorded BEFORE the move) replays three
 * seasons of twenty clubs through it to the byte.
 *
 * A NEW GAME IS DATA. The posts of every other game live in
 * src/data/gmStaff/packs.ts: what the job is called, which unit or read it
 * moves, and by how much at the most. Nothing in here knows a sport.
 *
 * NOTHING IN HERE DRAWS FROM Math.random. Every person, every shortlist and
 * every approach falls out of a hash of the owner, the world, the season,
 * the tick and the post. A game that binds this desk moves none of its own
 * seeded streams by a single draw, and a harness can say which week an
 * approach lands.
 *
 * EVERY EFFECT IS A LADDER WITH TWO ENDS AND A CLAMP. `none` is what level 1
 * and an empty chair are worth (the game exactly as it plays without the
 * desk), `best` is level 10, every level between them moves it, and nothing
 * (a hand edited save, a level of 99, NaN) can push it past either end. The
 * one exception is gmBoundedEdge, the two sided edge a college coordinator
 * carries, kept here so that model can move onto this one later.
 */

/* ------------------------------------------------------------ the shapes */

export interface GmStaffPerson {
  id: string;
  name: string;
  /** 1 to the rules' maxLevel, what he is worth today. */
  level: number;
  /** Never under his level. Where he can still get to. */
  potential: number;
  /** In the game's own wage unit, a tick. */
  wage: number;
  /** The season he took the job, for the screen. */
  since: number;
  /** True when he was promoted from inside instead of hired off the shortlist. */
  academy: boolean;
}

/** A rival's approach, sitting on the desk. A club acting, never a person speaking. */
export interface GmStaffPoach<P extends string = string> {
  postId: P;
  club: string;
  /** Ticks before he walks if nobody answers. */
  weeksLeft: number;
}

/**
 * The block a save carries: one key per post beside five of its own. This is
 * Club Manager's Round 471 shape to the letter, so its saves did not move.
 * A post may not be called v, poach, matchesLeft, hires or seasonSpend.
 */
export type GmStaffBlock<P extends string = string> = {
  v: number;
  poach: GmStaffPoach<P> | null;
  matchesLeft: number;
  hires: number;
  seasonSpend: number;
} & Record<P, GmStaffPerson | null>;

export const GM_STAFF_RESERVED_KEYS = ['v', 'poach', 'matchesLeft', 'hires', 'seasonSpend'] as const;
export const GM_STAFF_MAX = 10;

/** Everything that differs between two desks and is not a post's own words. */
export interface GmStaffRules<P extends string = string> {
  posts: readonly P[];
  /** Shape version written on the block. */
  version: number;
  maxLevel: number;
  /** Approaches the GM may match in one season. */
  matchesPerSeason: number;
  /** Ticks an approach sits on the desk before he walks. */
  poachWeeks: number;
  /** The two name banks. Registered in scripts/simInventedNames.mjs. */
  first: readonly string[];
  last: readonly string[];
  /** Wage a tick: max(1, round((wageBase + wagePerLevel * level) * pay * money)). */
  wageBase: number;
  wagePerLevel: number;
  /** A post that pays a multiple of the curve (a head coach is not paid like a scout). Missing is 1. */
  pay?: Partial<Record<P, number>>;
  /** Signing on fee in the purse unit: feeBase + feePerLevel * level * money * pay. */
  feeBase: number;
  feePerLevel: number;
  /** Severance: this many ticks of his wage, moved into the purse unit, never under severanceMin. */
  severanceTicks: number;
  wagePerPurse: number;
  severanceMin: number;
  /** Decimal places a fee is quoted to (missing is 1) and the purse, the spend and a pay off are kept to (missing is 2). */
  feeDp?: number;
  purseDp?: number;
  /** What matching a rival's offer does to his wage, for good. */
  matchRaise: number;
  /** Nobody under this level is ever approached; above it the chance a tick is poachPerLevel a level. */
  poachFromLevel: number;
  poachPerLevel: number;
  /** Posts no rival ever comes in for: a head coach leaves because the GM said so, and for no other reason. */
  unpoachable?: readonly P[];
  /** The chance a man with room grows a level over a summer, and with three or more levels of room. */
  growChance: number;
  growChanceRoomy: number;
  /** One line on where an outside candidate came from, and the line for the promotion. */
  outsideFrom: readonly string[];
  promotedFrom: string;
}

/** Where and when: everything the desk reads from the game it sits in. */
export interface GmStaffCtx<P extends string = string> {
  /** The club, team, program or gym. The first half of every hash. */
  owner: string;
  /** The world it plays in ("now", an era id, a league id). */
  world: string;
  season: number;
  /** The tick inside the season (a week, a phase, a fight night). */
  week: number;
  /** A factor on every wage and fee (Club Manager's historic eras run at 0.75). */
  money: number;
  /** The level this owner attracts for a post: day one men and the middle of every shortlist. */
  anchor: (post: P) => number;
  /** The level of the man who can be promoted from inside. */
  inHouse: number;
  /** Who could come in for one of yours. Only read when an approach lands. */
  rivals: () => string[];
}

/* ------------------------------------------------------------ the hash */

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
/** Rounded to so many decimal places. One place is tenths, two is hundredths, exactly as Club Manager always rounded. */
const roundTo = (n: number, dp: number): number => { const m = 10 ** dp; return Math.round(n * m) / m; };
const feeDp = (rules: Pick<GmStaffRules, 'feeDp'>): number => rules.feeDp ?? 1;
const purseDp = (rules: Pick<GmStaffRules, 'purseDp'>): number => rules.purseDp ?? 2;

/** FNV-1a with a final avalanche. Same string, same number, every machine. */
export function gmHash32(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  h ^= h << 13; h >>>= 0;
  h ^= h >>> 17;
  h ^= h << 5; h >>>= 0;
  return h >>> 0;
}
/** A whole number lo to high inclusive, from a key. */
export const gmHashInt = (key: string, lo: number, high: number): number => lo + (gmHash32(key) % (high - lo + 1));
/** 0 up to but not including 1, from a key. */
export const gmHashFloat = (key: string): number => gmHash32(key) / 4294967296;

/* ------------------------------------------------------------ the people */

/**
 * The banks every desk but Club Manager's draws from (it keeps its own two,
 * which are older than this file). Old fashioned on purpose: nobody in a
 * dugout, a film room or a corner today is called any pairing of these, and
 * scripts/simInventedNames.mjs multiplies the two banks out against every
 * real name the site ships to prove it.
 */
const GM_STAFF_FIRST = [
  'Abner', 'Barnaby', 'Cormac', 'Dashiell', 'Ephraim', 'Fenwick', 'Gideon', 'Horatio', 'Ignatius', 'Jethro',
  'Kermit', 'Leopold', 'Montague', 'Nehemiah', 'Obadiah', 'Percival', 'Quimby', 'Rupert', 'Silas', 'Thurston',
  'Ulysses', 'Virgil', 'Wilbur', 'Zebulon',
];
const GM_STAFF_LAST = [
  'Applegarth', 'Birtwhistle', 'Cadwallader', 'Dunwoody', 'Entwistle', 'Fairweather', 'Goodenough', 'Hathersage',
  'Inglethorpe', 'Jessop', 'Kirkbride', 'Lindqvist', 'Mossop', 'Netherby', 'Oglethorpe', 'Pennywell', 'Quarmby',
  'Ravenscroft', 'Stanhope', 'Thistlewood', 'Underhill', 'Wetherby', 'Yarborough', 'Zeller',
];
/** The shared banks, for a pack's rules. Never mutated. */
export const GM_STAFF_NAME_BANKS: { first: readonly string[]; last: readonly string[] } = { first: GM_STAFF_FIRST, last: GM_STAFF_LAST };

type Banks = Pick<GmStaffRules, 'first' | 'last'>;

/** Deterministic name from a key. */
function nameFor(banks: Banks, key: string): string {
  return `${banks.first[gmHash32(`f|${key}`) % banks.first.length]} ${banks.last[gmHash32(`l|${key}`) % banks.last.length]}`;
}

/**
 * A name nobody in this room is already using. Two men called Bram one above
 * the other on the same desk reads like a bug, and so do two men called
 * Ilving, so each half counts on its own. Salts the key until the pair is
 * free; salting is a lottery and a lottery loses sometimes (about one draw in
 * twenty thousand at eight names in a room), so after twenty four tries it
 * walks the banks from a hashed start instead, which cannot fail while a
 * bank is longer than the room.
 */
export function gmFreeStaffName(banks: Banks, key: string, taken: Set<string>): string {
  const clash = (n: string): boolean => n.split(' ').some(part => taken.has(part));
  let name = nameFor(banks, key);
  for (let salt = 1; salt <= 24 && clash(name); salt++) name = nameFor(banks, `${key}|${salt}`);
  if (clash(name)) {
    const start = gmHash32(`fb|${key}`);
    const free = (bank: readonly string[], offset: number): string => {
      for (let n = 0; n < bank.length; n++) {
        const v = bank[(start + offset + n) % bank.length];
        if (!taken.has(v)) return v;
      }
      return bank[start % bank.length];
    };
    name = `${free(banks.first, 0)} ${free(banks.last, 7)}`;
  }
  for (const part of name.split(' ')) taken.add(part);
  taken.add(name);
  return name;
}

const payOf = <P extends string>(rules: GmStaffRules<P>, post: P): number => rules.pay?.[post] ?? 1;

/** What a man at that level earns in a post, a tick. */
export function gmStaffWage<P extends string>(rules: GmStaffRules<P>, level: number, money: number, post?: P): number {
  const pay = post === undefined ? 1 : payOf(rules, post);
  return Math.max(1, Math.round((rules.wageBase + rules.wagePerLevel * clamp(level, 1, rules.maxLevel)) * pay * money));
}

/** A man built from a key, at a level you hand it. Pure. */
export function gmMakePerson<P extends string>(
  rules: GmStaffRules<P>, key: string, post: P, level: number, season: number, money: number, academy: boolean, taken: Set<string>,
): GmStaffPerson {
  const lv = clamp(Math.round(level), 1, rules.maxLevel);
  /* The promoted man starts low with the most room left; an outside hire is nearer what he will ever be. */
  const head = academy ? gmHashInt(`ph|${key}`, 3, 6) : gmHashInt(`ph|${key}`, 0, 3);
  return {
    id: `st-${gmHash32(key).toString(36)}`,
    name: gmFreeStaffName(rules, key, taken),
    level: lv,
    potential: clamp(lv + head, lv, rules.maxLevel),
    wage: gmStaffWage(rules, lv, money, post),
    since: season,
    academy,
  };
}

/* ------------------------------------------------------------ the block */

/** The posts of a block as a plain map, for the places TypeScript cannot follow a generic key. */
const seats = <P extends string>(block: GmStaffBlock<P>): Record<string, GmStaffPerson | null> =>
  block as unknown as Record<string, GmStaffPerson | null>;

function withSeat<P extends string>(block: GmStaffBlock<P>, post: P, person: GmStaffPerson | null, rest: Partial<GmStaffBlock<P>>): GmStaffBlock<P> {
  return { ...block, [post]: person, ...rest } as GmStaffBlock<P>;
}

/**
 * The level an owner attracts for a post, from how big it is. `stature` runs
 * from 0 (the smallest outfit in the game) to 1 (the biggest), which is
 * levels 2 to 8, and each post takes its own hashed step of minus one to plus
 * one so a staff is not one number wearing five hats. Club Manager reads its
 * own tier ladder instead; every other game can hand its ctx this.
 */
export function gmStatureAnchor(owner: string, post: string, stature: number, maxLevel: number = GM_STAFF_MAX): number {
  const s = typeof stature === 'number' && Number.isFinite(stature) ? clamp(stature, 0, 1) : 0;
  return clamp(Math.round(2 + 6 * s) + gmHashInt(`start|${owner}|${post}`, -1, 1), 1, maxLevel);
}

/** Day one: one generated man in every post, at the level this owner attracts. */
export function gmDefaultStaff<P extends string>(rules: GmStaffRules<P>, ctx: GmStaffCtx<P>): GmStaffBlock<P> {
  const taken = new Set<string>();
  const out: Record<string, unknown> = { v: rules.version };
  for (const post of rules.posts) {
    out[post] = gmMakePerson(rules, `day1|${ctx.owner}|${ctx.world}|${post}`, post, ctx.anchor(post), ctx.season, ctx.money, false, taken);
  }
  out.poach = null;
  out.matchesLeft = rules.matchesPerSeason;
  out.hires = 0;
  out.seasonSpend = 0;
  return out as GmStaffBlock<P>;
}

function isPerson(p: unknown, maxLevel: number): p is GmStaffPerson {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return false;
  const o = p as Record<string, unknown>;
  const lvl = (n: unknown): boolean => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= maxLevel;
  return typeof o.id === 'string' && o.id.length > 0
    && typeof o.name === 'string' && o.name.length > 0
    && lvl(o.level) && lvl(o.potential) && (o.potential as number) >= (o.level as number)
    && typeof o.wage === 'number' && Number.isFinite(o.wage) && o.wage >= 0
    && typeof o.since === 'number' && Number.isFinite(o.since)
    && typeof o.academy === 'boolean';
}

function isPoach<P extends string>(p: unknown, posts: readonly P[]): p is GmStaffPoach<P> | null {
  if (p === null) return true;
  if (!p || typeof p !== 'object' || Array.isArray(p)) return false;
  const o = p as Record<string, unknown>;
  return posts.includes(o.postId as P)
    && typeof o.club === 'string' && o.club.length > 0
    && typeof o.weeksLeft === 'number' && Number.isInteger(o.weeksLeft) && o.weeksLeft >= 0;
}

/** True when the block on the save is exactly the shape these rules write. Fails closed. */
export function gmIsValidStaff<P extends string>(rules: GmStaffRules<P>, s: unknown): s is GmStaffBlock<P> {
  if (!s || typeof s !== 'object' || Array.isArray(s)) return false;
  const o = s as Record<string, unknown>;
  if (o.v !== rules.version) return false;
  if (!rules.posts.every(id => o[id] === null || isPerson(o[id], rules.maxLevel))) return false;
  if (!isPoach(o.poach, rules.posts)) return false;
  /* An approach for a post nobody holds is a block that contradicts itself. */
  const poach = o.poach as GmStaffPoach<P> | null;
  if (poach && !isPerson(o[poach.postId], rules.maxLevel)) return false;
  const n = (v: unknown, lo: number, high: number): boolean =>
    typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= high;
  return n(o.matchesLeft, 0, rules.matchesPerSeason) && n(o.hires, 0, 9999)
    && typeof o.seasonSpend === 'number' && Number.isFinite(o.seasonSpend) && o.seasonSpend >= 0;
}

/** The block for reading: a save from before the desk, or a mangled one, reads its day one men. */
export function gmStaffOf<P extends string>(rules: GmStaffRules<P>, raw: unknown, ctx: GmStaffCtx<P>): GmStaffBlock<P> {
  return gmIsValidStaff(rules, raw) ? raw : gmDefaultStaff(rules, ctx);
}

/** The level in a post, or 1 for an empty one, which is the level that does nothing. */
export function gmStaffLevel<P extends string>(block: GmStaffBlock<P>, post: P): number {
  return seats(block)[post]?.level ?? 1;
}

/** Every wage on the desk, a tick. */
export function gmStaffPayroll<P extends string>(rules: GmStaffRules<P>, block: GmStaffBlock<P>): number {
  return rules.posts.reduce((n, id) => n + (seats(block)[id]?.wage ?? 0), 0);
}

/* ------------------------------------------------------------ the shortlist */

export interface GmStaffCandidate {
  person: GmStaffPerson;
  /** Signing on fee in the purse unit. The promotion is free. */
  fee: number;
  /** One line on where he came from. */
  from: string;
}

/**
 * Who is available for a post: three from outside, spread around the level
 * this owner attracts, plus one promotion from inside, who starts low, costs
 * nothing and has the most room left. Deterministic from the owner, the
 * world, the season, the post and how many people this desk has already
 * hired, so the list holds still while you look at it and a fresh vacancy
 * draws a fresh three.
 */
export function gmStaffShortlist<P extends string>(rules: GmStaffRules<P>, block: GmStaffBlock<P>, ctx: GmStaffCtx<P>, post: P): GmStaffCandidate[] {
  const seed = `cand|${ctx.owner}|${ctx.world}|${post}|${ctx.season}|${block.hires}`;
  const anchor = ctx.anchor(post);
  /* Nobody on the list shares a name with anybody else on it, or with the people already on the desk. */
  const taken = new Set<string>();
  for (const id of rules.posts) {
    const held = seats(block)[id]?.name;
    if (held) for (const part of held.split(' ')) taken.add(part);
  }
  const out: GmStaffCandidate[] = [];
  for (let i = 0; i < 3; i++) {
    const key = `${seed}|${i}`;
    const level = clamp(anchor + gmHashInt(`sp|${key}`, -2, 2), 1, rules.maxLevel);
    out.push({
      person: gmMakePerson(rules, key, post, level, ctx.season, ctx.money, false, taken),
      fee: roundTo(Math.max(rules.feeBase, rules.feeBase + rules.feePerLevel * level * ctx.money * payOf(rules, post)), feeDp(rules)),
      from: rules.outsideFrom[gmHash32(`fr|${key}`) % rules.outsideFrom.length],
    });
  }
  out.push({
    person: gmMakePerson(rules, `${seed}|academy`, post, ctx.inHouse, ctx.season, ctx.money, true, taken),
    fee: 0,
    from: rules.promotedFrom,
  });
  return out;
}

/** What paying off a man costs, in the purse unit. */
export function gmSeverance<P extends string>(rules: GmStaffRules<P>, person: GmStaffPerson | null | undefined): number | null {
  if (!person) return null;
  return roundTo(Math.max(rules.severanceMin, (person.wage * rules.severanceTicks) / rules.wagePerPurse), purseDp(rules));
}

/* ------------------------------------------------------------ the desk */

/*
 * Each of these returns the next block and the numbers the game needs to move
 * its own money and write its own headline, or null when the desk refuses.
 * None of them mutates what it was handed.
 */

/** Appoint one of the shortlist. Refuses a filled post, an id the list does not carry, and a purse that cannot cover the fee. */
export function gmHireStaff<P extends string>(
  rules: GmStaffRules<P>, block: GmStaffBlock<P>, ctx: GmStaffCtx<P>, post: P, candidateId: string, purse: number,
): { next: GmStaffBlock<P>; cand: GmStaffCandidate; purse: number } | null {
  if (seats(block)[post]) return null;
  const cand = gmStaffShortlist(rules, block, ctx, post).find(c => c.person.id === candidateId);
  if (!cand) return null;
  if (purse < cand.fee) return null;
  const next = withSeat(block, post, { ...cand.person }, {
    hires: block.hires + 1,
    seasonSpend: roundTo(block.seasonSpend + cand.fee, purseDp(rules)),
  } as Partial<GmStaffBlock<P>>);
  return { next, cand, purse: roundTo(purse - cand.fee, purseDp(rules)) };
}

/** Pay him off. Refuses an empty post and a purse that cannot cover it. His approach goes with him. */
export function gmSackStaff<P extends string>(
  rules: GmStaffRules<P>, block: GmStaffBlock<P>, post: P, purse: number,
): { next: GmStaffBlock<P>; person: GmStaffPerson; pay: number; purse: number } | null {
  const person = seats(block)[post];
  if (!person) return null;
  const pay = gmSeverance(rules, person);
  if (pay === null || purse < pay) return null;
  const next = withSeat(block, post, null, {
    poach: block.poach?.postId === post ? null : block.poach,
    /* A fresh vacancy draws a fresh three. */
    hires: block.hires + 1,
    seasonSpend: roundTo(block.seasonSpend + pay, purseDp(rules)),
  } as Partial<GmStaffBlock<P>>);
  return { next, person, pay, purse: roundTo(purse - pay, purseDp(rules)) };
}

/**
 * Match the rival's money. Costs one of the season's matches and puts the
 * raise on his wage for good, which is the whole price of keeping him.
 * Refuses when there is no approach on the desk or no match left.
 */
export function gmMatchStaffOffer<P extends string>(
  rules: GmStaffRules<P>, block: GmStaffBlock<P>,
): { next: GmStaffBlock<P>; person: GmStaffPerson; raised: GmStaffPerson; poach: GmStaffPoach<P> } | null {
  const poach = block.poach;
  if (!poach || block.matchesLeft <= 0) return null;
  const person = seats(block)[poach.postId];
  if (!person) return null;
  const raised: GmStaffPerson = { ...person, wage: Math.max(person.wage + 1, Math.round(person.wage * rules.matchRaise)) };
  const next = withSeat(block, poach.postId, raised, { poach: null, matchesLeft: block.matchesLeft - 1 } as Partial<GmStaffBlock<P>>);
  return { next, person, raised, poach };
}

/** Let him go. The post opens and the shortlist is waiting. */
export function gmReleaseToPoacher<P extends string>(
  block: GmStaffBlock<P>,
): { next: GmStaffBlock<P>; person: GmStaffPerson; poach: GmStaffPoach<P> } | null {
  const poach = block.poach;
  if (!poach) return null;
  const person = seats(block)[poach.postId];
  if (!person) return null;
  const next = withSeat(block, poach.postId, null, { poach: null, hires: block.hires + 1 } as Partial<GmStaffBlock<P>>);
  return { next, person, poach };
}

/* ------------------------------------------------------------ the tick and the summer */

/** The chance a rival comes in for a man at that level, a tick. Good staff get noticed and poor staff never do. */
export function gmPoachChance<P extends string>(rules: GmStaffRules<P>, level: number): number {
  return level < rules.poachFromLevel ? 0 : rules.poachPerLevel * (level - (rules.poachFromLevel - 1));
}

export interface GmStaffEvent<P extends string = string> {
  /** approach: a rival has come in and the deadline is running. walked: nobody answered and he has gone. */
  kind: 'approach' | 'walked';
  post: P;
  person: GmStaffPerson;
  club: string;
}

/**
 * One tick: an approach on the desk runs down and he walks when it expires,
 * otherwise a rival may come in for somebody. WRITES INTO THE BLOCK it is
 * handed (the engines call it on their own private copy), and returns what
 * happened so the game can write the line in its own voice.
 */
export function gmTickStaff<P extends string>(rules: GmStaffRules<P>, block: GmStaffBlock<P>, ctx: GmStaffCtx<P>): GmStaffEvent<P> | null {
  const s = seats(block);
  if (block.poach) {
    block.poach = { ...block.poach, weeksLeft: block.poach.weeksLeft - 1 };
    if (block.poach.weeksLeft > 0) return null;
    const post = block.poach.postId;
    const person = s[post];
    const club = block.poach.club;
    block.poach = null;
    if (!person) return null;
    s[post] = null;
    return { kind: 'walked', post, person, club };
  }
  for (const post of rules.posts) {
    const person = s[post];
    if (!person) continue;
    if (rules.unpoachable?.includes(post)) continue;
    const key = `poach|${ctx.owner}|${ctx.world}|${ctx.season}|${ctx.week}|${post}`;
    if (gmHashFloat(key) >= gmPoachChance(rules, person.level)) continue;
    const rivals = ctx.rivals();
    if (!rivals.length) continue;
    const club = rivals[gmHash32(`rv|${key}`) % rivals.length];
    block.poach = { postId: post, club, weeksLeft: rules.poachWeeks };
    return { kind: 'approach', post, person, club };
  }
  return null;
}

/**
 * The summer, for an owner who stays: everybody carries, a level better
 * where there was room and the hash says so, the season's spend and the
 * matches reset. A man with room gets better like anybody else, and the more
 * room he has the likelier it is. Hashed, so a season replayed grows the
 * same people. `ctx` is the NEW season.
 */
export function gmRolloverStaff<P extends string>(rules: GmStaffRules<P>, old: GmStaffBlock<P>, ctx: GmStaffCtx<P>): GmStaffBlock<P> {
  const out: Record<string, unknown> = { v: rules.version };
  for (const post of rules.posts) {
    const p = seats(old)[post];
    let next = p;
    if (p && p.potential - p.level > 0) {
      const chance = p.potential - p.level >= 3 ? rules.growChanceRoomy : rules.growChance;
      if (gmHashFloat(`grow|${ctx.owner}|${ctx.season}|${post}|${p.id}`) < chance) {
        const level = p.level + 1;
        next = { ...p, level, wage: Math.max(p.wage, gmStaffWage(rules, level, ctx.money, post)) };
      }
    }
    out[post] = next ?? null;
  }
  out.poach = null;
  out.matchesLeft = rules.matchesPerSeason;
  out.hires = old.hires;
  out.seasonSpend = 0;
  return out as GmStaffBlock<P>;
}

/* ------------------------------------------------------------ the effects */

/**
 * What a post moves. `none` is the value at level 1 and on an empty chair
 * (the game as it plays without the desk), `best` is the value at the top
 * level. A multiplier says none 1; an edge in rating points says none 0; the
 * scouting read says none 4 and best 1, because there less is better.
 */
export interface GmStaffEffect {
  /** The unit or read it moves: offEdge, defEdge, growth, injuryWeeks, scoutSpread and so on. */
  key: string;
  none: number;
  best: number;
}

/**
 * The value of an effect at a level: a straight ladder from `none` at level 1
 * to `best` at the top, every step moving it, and CLAMPED between its two
 * ends whatever the level says, so a hand edited or corrupt save cannot push
 * a unit past what the pack declared. A level that is not a number is worth
 * `none`.
 */
export function gmEffectAt(effect: GmStaffEffect, level: number, maxLevel: number = GM_STAFF_MAX): number {
  if (typeof level !== 'number' || !Number.isFinite(level)) return effect.none;
  const raw = effect.none + ((effect.best - effect.none) * (level - 1)) / (maxLevel - 1);
  return clamp(raw, Math.min(effect.none, effect.best), Math.max(effect.none, effect.best));
}

/**
 * A two sided edge around a neutral value, capped either way: the shape a
 * college coordinator carries today (src/lib/collegeProgram.ts,
 * coordinatorEdge: neutral 70, 0.12 a point, capped at 3). It is here so
 * that model can be moved onto this module without changing a number, and
 * src/lib/gmStaff.test.ts holds the two to the same answer at every rating.
 */
export function gmBoundedEdge(value: number, neutral: number, perStep: number, cap: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return clamp((value - neutral) * perStep, -cap, cap);
}

/** The draft grade noise every front office uses today: a whole number from minus this to plus this. */
export const GM_SCOUT_SPREAD_NONE = 4;
/** And with the best scouting director there is. */
export const GM_SCOUT_SPREAD_BEST = 1;
const SCOUT_SPREAD: GmStaffEffect = { key: 'scoutSpread', none: GM_SCOUT_SPREAD_NONE, best: GM_SCOUT_SPREAD_BEST };

/** How far a scouted grade can sit from the truth, either way: 4 with nobody in the job, 1 at level 10. */
export function gmScoutSpread(level: number): number {
  return gmEffectAt(SCOUT_SPREAD, level);
}

/**
 * The scouting error on one prospect, from one draw `u` in 0 up to 1. With
 * nobody in the job it is exactly the constant the front offices use today,
 * Math.floor(u * 9) - 4, a whole number from -4 to 4, so a game that binds
 * the desk and never opens it grades its draft class as it always has. A
 * better scout scales that same draw down, so the read tightens without
 * spending a second draw. The caller rounds the grade, not the noise.
 */
export function gmScoutNoise(u: number, level: number): number {
  const draw = clamp(Math.floor(clamp(u, 0, 1) * (2 * GM_SCOUT_SPREAD_NONE + 1)), 0, 2 * GM_SCOUT_SPREAD_NONE) - GM_SCOUT_SPREAD_NONE;
  return draw * (gmScoutSpread(level) / GM_SCOUT_SPREAD_NONE);
}

/**
 * The band a scouted grade is shown inside, and the band a trade desk should
 * value a pick or a prospect inside: the grade give or take the spread.
 */
export function gmScoutBand(grade: number, level: number): { lo: number; hi: number; spread: number } {
  const spread = gmScoutSpread(level);
  return { lo: Math.round(grade - spread), hi: Math.round(grade + spread), spread };
}

/* ------------------------------------------------------------ the packs */

/** One job on a desk: its words, and what it moves. */
export interface GmStaffPost<P extends string = string> {
  id: P;
  label: string;
  short: string;
  emoji: string;
  /** One or two plain sentences for the tile: what he does, said the way the game talks. */
  blurb: string;
  effects: readonly GmStaffEffect[];
  /** The head coach. The GM appoints and sacks him, and the rules list him as unpoachable. */
  head?: boolean;
  /** A strong man in this post is approached for a head coach's job elsewhere, and the screen says so. */
  headCoachTrack?: boolean;
}

/** What one effect key means in a pack, and the most the whole desk may move it. */
export interface GmStaffKey {
  /** The value with nobody on the desk. */
  none: number;
  /** The whole desk together never moves it under lo or over hi. */
  lo: number;
  hi: number;
  /** True for a multiplier (posts multiply), false for points (posts add). */
  mult: boolean;
  /** What it is, for the screen and for whoever binds it. */
  what: string;
}

/** A game's whole desk as data: the posts, the numbers and the money scale. */
export interface GmStaffPack<P extends string = string> {
  id: string;
  /** The game it belongs to, for the screen and the harness. */
  game: string;
  posts: readonly GmStaffPost<P>[];
  rules: GmStaffRules<P>;
  keys: Readonly<Record<string, GmStaffKey>>;
  money: {
    /** What a wage is counted in, as the screen says it ("k a week", "points a season"). */
    wageUnit: string;
    /** What fees, severance and the purse are counted in. */
    purseUnit: string;
    /** How many times a season the game ticks the desk and pays the wages. */
    ticksPerSeason: number;
    /** The money this desk is expected to live inside for a season, in the purse unit, and where the number comes from. */
    seasonPurse: number;
    purseNote: string;
  };
}

/**
 * What the whole desk does to one key today: every post that moves it, read
 * at the level of whoever sits there (an empty chair is level 1, which is
 * `none`), combined, and held inside the pack's bounds whatever the save
 * says. A key the pack does not declare is worth nothing.
 */
export function gmStaffEffect<P extends string>(pack: GmStaffPack<P>, block: GmStaffBlock<P> | null | undefined, key: string): number {
  const k = pack.keys[key];
  if (!k) return 0;
  if (!block) return k.none;
  let total = k.none;
  for (const post of pack.posts) {
    for (const effect of post.effects) {
      if (effect.key !== key) continue;
      const v = gmEffectAt(effect, gmStaffLevel(block, post.id), pack.rules.maxLevel);
      total = k.mult ? total * (v / effect.none) : total + (v - effect.none);
    }
  }
  return clamp(total, k.lo, k.hi);
}

/** The line a vacant chair shows. Round 471's own words. */
export const GM_STAFF_EMPTY_LINE = 'Nobody in the job. Nothing lost, nothing gained.';
/** The line a level 1 man shows: he is the job done the way it was before he came. */
export const GM_STAFF_NO_LIFT_LINE = 'No lift yet. Level 1 is the job done the way it always was.';

/**
 * What one effect of a post is worth today, in words, built from the same
 * number the game applies, so a tile cannot promise what the code does not
 * do. `level` is null for an empty chair. scripts/simGmStaff.mjs reads the
 * number back out of every line at every level and holds it to gmEffectAt.
 */
export function gmEffectLine(k: GmStaffKey, effect: GmStaffEffect, level: number | null, maxLevel: number = GM_STAFF_MAX): string {
  if (level === null) return GM_STAFF_EMPTY_LINE;
  const v = gmEffectAt(effect, level, maxLevel);
  if (v === effect.none) return GM_STAFF_NO_LIFT_LINE;
  if (k.mult) {
    const pct = Math.round((v / effect.none - 1) * 1000) / 10;
    return `${pct > 0 ? '+' : ''}${pct}% on ${k.what}.`;
  }
  if (effect.none === 0) return `+${Math.round(v * 100) / 100} ${k.what}.`;
  return `${Math.round(v * 10) / 10}, from ${effect.none} with nobody in the job: ${k.what}.`;
}

/** Weeks out after the head trainer has had him: never under one week, never longer than it was. */
export function gmInjuryWeeks(weeks: number, effect: GmStaffEffect, level: number): number {
  if (!(weeks > 0)) return 0;
  return clamp(Math.round(weeks * gmEffectAt(effect, level)), 1, Math.max(1, Math.round(weeks)));
}

/* ------------------------------------------------------------ the portrait */

/**
 * Flat shapes in a 64 by 64 box, every one of them a rectangle, a circle, an
 * arc or a rounded box, all of it a pure function of his id. No photograph,
 * no likeness, nothing traced from anybody. The ground is one constant slate
 * rather than his shirt colour, because a dark head on a dark shirt read as a
 * blob at 40 pixels; hair is an arc across the crown that stops at y=23,
 * three pixels clear of the eyes, because a hair CIRCLE big enough to look
 * like hair covered the face.
 */
export function gmStaffPortraitSvg(person: Pick<GmStaffPerson, 'id'>, size = 44): string {
  const h = gmHash32(`art|${person.id}`);
  const skins = ['#f2d3b6', '#e0b48c', '#c68a5f', '#9a6440', '#7c5138'];
  const hairs = ['#241c17', '#4a3524', '#7a5330', '#b0863f', '#8e8e8e', '#d9d3c7'];
  const shirts = ['#2c5591', '#3a8a5e', '#8f3d50', '#5e518d', '#3c7688', '#7a6238'];
  const skin = skins[h % skins.length];
  const hair = hairs[(h >> 3) % hairs.length];
  const shirt = shirts[(h >> 7) % shirts.length];
  const hairStyle = (h >> 11) % 3;
  const beard = ((h >> 14) % 3) === 0;
  const glasses = ((h >> 17) % 4) === 0;
  const parts = [
    `<rect x="0" y="0" width="64" height="64" rx="10" fill="#232a36"/>`,
    `<circle cx="32" cy="56" r="20" fill="${shirt}"/>`,
    `<rect x="27" y="38" width="10" height="8" fill="${skin}"/>`,
    `<circle cx="32" cy="27" r="14" fill="${skin}"/>`,
  ];
  /* The crown, an arc over the top of the head that never reaches the eyes. */
  if (hairStyle === 0) parts.push(`<path d="M18.6 23A14 14 0 0 1 45.4 23Z" fill="${hair}"/>`);
  else if (hairStyle === 1) parts.push(`<path d="M19.9 20A14 14 0 0 1 44.1 20Z" fill="${hair}"/>`);
  else parts.push(`<path d="M18.6 23A14 14 0 0 1 45.4 23Z" fill="${hair}"/><rect x="18.4" y="23" width="3.2" height="8" fill="${hair}"/><rect x="42.4" y="23" width="3.2" height="8" fill="${hair}"/>`);
  if (beard) parts.push(`<rect x="23" y="31" width="18" height="9" rx="4.5" fill="${hair}" opacity="0.9"/>`);
  parts.push(`<circle cx="27" cy="27" r="1.7" fill="#1b1b1b"/><circle cx="37" cy="27" r="1.7" fill="#1b1b1b"/>`);
  if (glasses) parts.push(`<rect x="22.5" y="23.5" width="19" height="7" rx="3.5" fill="none" stroke="#1b1b1b" stroke-width="1.4" opacity="0.85"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64" role="img" aria-label="staff portrait">${parts.join('')}</svg>`;
}
