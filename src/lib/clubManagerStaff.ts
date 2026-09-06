/**
 * Round 471: the staff. His words: "Staff: hire and fire attack, defense,
 * goalkeeping coaches, lead scout, and promote from the academy staff.
 * Generated people with generated portrait art, each with levels and
 * potential. Rivals can poach them; you can match offers a limited number of
 * times."
 *
 * Four posts, each held by a generated man or standing empty, all in one
 * block on the save (`staff`). Every person in here is invented: the names
 * come from the two banks at the bottom of this file (registered in
 * scripts/simInventedNames.mjs, whose section 2 multiplies them out and
 * refuses any pairing that belongs to a real footballer), and the portrait is
 * five flat shapes drawn from a hash of his id. No photograph, no likeness,
 * nothing traced.
 *
 * NOTHING IN HERE DRAWS FROM Math.random. Every person, every shortlist and
 * every rival approach falls out of a hash of the club, the season and the
 * post, so the same save always opens on the same four men, the harness can
 * say which week an approach lands, and a feature bolted onto tickWeek and
 * startCareer moves no other harness's seeded stream by a single draw.
 *
 * WHAT EACH POST DOES, on top of what the club already has:
 *
 *   attack coach       one factor inside developmentRate for the forwards
 *   defence coach      the same for the back line and the holding midfielder
 *   goalkeeping coach  the same for the keepers
 *     Each is 1.000 at level 1 and 1.099 at level 10, multiplied in BEFORE
 *     developmentRate's clamp and still under agePlayer's cap at the
 *     player's ceiling, so the Round 96 and 116 rule (growth reads headroom,
 *     nobody passes his potential) is untouched by construction. The two
 *     halves share the middle of the park: a CM, LM or RM gets the average
 *     of the attack and defence lifts, so nobody on the pitch is left out
 *     and no player is counted twice.
 *   lead scout         adds up to 6 to the ceiling of what a scout on the
 *     road turns up, inside the same 54 to 93 clamp the trip already used.
 *
 * An EMPTY post is exactly 1.0 and exactly 0, the same as a level 1 man, so
 * Round 95's rule holds twice over: no multiplier here can sit under 1 and a
 * club that never opens this desk plays the game the previous rounds
 * balanced. It is a lift, never a tax.
 *
 * NOT A SECOND COPY OF THE TRAINING GROUND. Round 467's training ground
 * lifts EVERYONE with headroom; these four lift one unit of the pitch each.
 * And the club-wide coaching number that already exists (academy.coaching,
 * 1 to 20) is not restated here: it is what decides how good the man you can
 * promote from the academy staff is, and nothing else in this file reads it.
 *
 * Money. A wage in thousands a week, scaling with his level and with the
 * era's money (historic eras run at 0.75, the same factor the gate and the
 * builders use), reaching the ledger through staffWagesWeekly in
 * clubManagerFinances. Hiring costs a fee and sacking costs severance, both
 * out of the transfer kitty and both recorded on the books' own Staff fees
 * line, because money that leaves the kitty and appears nowhere is a lie the
 * projection would tell every week.
 */
import type { CareerState, ClubDef } from '@/lib/clubManager';
import { careerLeagueOf, clubDefFor, eraClubDefFor, isHistoricEra, money } from '@/lib/clubManager';
import type { Position } from '@/types/game';

export type StaffPostId = 'attack' | 'defence' | 'goalkeeping' | 'scout';

export const STAFF_POST_IDS: StaffPostId[] = ['attack', 'defence', 'goalkeeping', 'scout'];
export const STAFF_MAX = 10;
export const STAFF_VERSION = 1;
/** Rival approaches you may match in one season. The screen prints what is left. */
export const STAFF_MATCHES_PER_SEASON = 2;
/** Weeks an approach sits on the desk before he walks. */
export const POACH_WEEKS = 2;

export interface StaffPerson {
  id: string;
  name: string;
  /** 1 to 10, what he is worth to you today. */
  level: number;
  /** 1 to 10, never under his level. Where he can still get to. */
  potential: number;
  /** Thousands a week. */
  wage: number;
  /** The season he took the job, for the screen. */
  since: number;
  /** True when he came up from the academy staff instead of the shortlist. */
  academy: boolean;
}

/** A rival's approach, sitting on the desk. */
export interface StaffPoach {
  postId: StaffPostId;
  /** The real club making the approach. It is a club acting, never a person speaking. */
  club: string;
  /** Weeks before he walks if you have not answered. */
  weeksLeft: number;
}

export interface ClubStaff {
  /** Shape version of this block, STAFF_VERSION. */
  v: number;
  attack: StaffPerson | null;
  defence: StaffPerson | null;
  goalkeeping: StaffPerson | null;
  scout: StaffPerson | null;
  /** Approach on the desk, at most one at a time. */
  poach: StaffPoach | null;
  /** Matches left this season. */
  matchesLeft: number;
  /** How many men this club has hired, so a fresh vacancy draws a fresh shortlist. */
  hires: number;
  /** Millions of fees and severance this season, for the finances screen. Reset each summer. */
  seasonSpend: number;
}

export const STAFF_POST_INFO: Record<StaffPostId, { label: string; short: string; emoji: string; blurb: string }> = {
  attack: {
    label: 'Attack coach',
    short: 'Attack',
    emoji: '\u{1F3AF}',
    blurb: 'Works the forwards and the number ten. They grow a little faster, and nobody grows past his ceiling.',
  },
  defence: {
    label: 'Defence coach',
    short: 'Defence',
    emoji: '\u{1F6E1}️',
    blurb: 'Works the back line and the holding midfielder. Same lift, same ceiling.',
  },
  goalkeeping: {
    label: 'Goalkeeping coach',
    short: 'Keepers',
    emoji: '\u{1F9E4}',
    blurb: 'Works the keepers, who nobody else on the staff ever touches.',
  },
  scout: {
    label: 'Lead scout',
    short: 'Scouting',
    emoji: '\u{1F50E}',
    blurb: 'Reads a trip report properly, so the boys your scouts come home with have more in them.',
  },
};

const ERA_MONEY = 0.75;
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const round1 = (n: number): number => Math.round(n * 10) / 10;
const round2 = (n: number): number => Math.round(n * 100) / 100;

/* ---------- the hash everything in this file is built from ---------- */

/** FNV-1a with a final avalanche. Same string, same number, every machine. */
function sHash32(s: string): number {
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
/** A whole number lo to hi inclusive, from a key. */
const hi = (key: string, lo: number, high: number): number => lo + (sHash32(key) % (high - lo + 1));
/** 0 up to but not including 1, from a key. */
const hf = (key: string): number => sHash32(key) / 4294967296;

function careerDef(state: Pick<CareerState, 'clubName' | 'eraId'>): ClubDef {
  return state.eraId && isHistoricEra(state.eraId)
    ? eraClubDefFor(state.clubName, state.eraId)
    : clubDefFor(state.clubName);
}

function eraMoney(state: Pick<CareerState, 'eraId'>): number {
  return state.eraId && isHistoricEra(state.eraId) ? ERA_MONEY : 1;
}

/* ---------- the people ---------- */

const STAFF_FIRST = [
  'Alaric', 'Bram', 'Caspar', 'Domen', 'Emrys', 'Fabbio', 'Gethin', 'Hendrik', 'Idris', 'Joris',
  'Kaspars', 'Lorcan', 'Matteus', 'Nedim', 'Osian', 'Piet', 'Radek', 'Solly', 'Torvald', 'Ulrich',
];
const STAFF_LAST = [
  'Ackroyd', 'Bertelsen', 'Caradec', 'Drenthe', 'Eeckhout', 'Falkner', 'Grimsby', 'Hollander', 'Ilving', 'Jorgeson',
  'Kettleby', 'Lammert', 'Merrion', 'Nystrand', 'Oldroyd', 'Praeger', 'Quennell', 'Rasmusson', 'Threlfall', 'Vandeley',
];

/** Deterministic name from a key. Two banks of twenty, four hundred pairings. */
function staffName(key: string): string {
  return `${STAFF_FIRST[sHash32(`f|${key}`) % STAFF_FIRST.length]} ${STAFF_LAST[sHash32(`l|${key}`) % STAFF_LAST.length]}`;
}

/** What he earns at that level, in thousands a week. */
export function staffWage(level: number, historic: boolean): number {
  return Math.max(1, Math.round((3 + 2.1 * clamp(level, 1, STAFF_MAX)) * (historic ? ERA_MONEY : 1)));
}

/** A man built from a key, at a level you hand it. Pure. */
function makePerson(key: string, level: number, season: number, historic: boolean, academy: boolean): StaffPerson {
  const lv = clamp(Math.round(level), 1, STAFF_MAX);
  const head = academy ? hi(`ph|${key}`, 3, 6) : hi(`ph|${key}`, 0, 3);
  return {
    id: `st-${sHash32(key).toString(36)}`,
    name: staffName(key),
    level: lv,
    potential: clamp(lv + head, lv, STAFF_MAX),
    wage: staffWage(lv, historic),
    since: season,
    academy,
  };
}

/**
 * Day one levels from stature alone, exactly the way the facilities desk
 * reads it: the tier sets the base (8, 6, 4, 1), the market value nudges it
 * one up when the squad is worth more than the tier's norm and one down on
 * the 8m floor, and each post takes its own hashed step of minus one to plus
 * one so the four men are not one number wearing four hats. Deterministic,
 * so a harness can say what a club opens on.
 */
export function staffStartLevel(def: Pick<ClubDef, 'tier' | 'budget'>, clubName: string, post: StaffPostId): number {
  const tierBase = [8, 6, 4, 1][def.tier - 1] ?? 1;
  const tierNorm = [150, 85, 45, 15][def.tier - 1] ?? 15;
  const valueAdj = def.budget >= tierNorm ? 1 : def.budget <= 8 ? -1 : 0;
  return clamp(tierBase + valueAdj + hi(`start|${clubName}|${post}`, -1, 1), 1, STAFF_MAX);
}

function defaultStaff(state: CareerState): ClubStaff {
  const def = careerDef(state);
  const historic = !!state.eraId && isHistoricEra(state.eraId);
  const season = state.season ?? 1;
  const person = (post: StaffPostId): StaffPerson =>
    makePerson(`day1|${state.clubName}|${state.eraId ?? 'now'}|${post}`, staffStartLevel(def, state.clubName, post), season, historic, false);
  return {
    v: STAFF_VERSION,
    attack: person('attack'),
    defence: person('defence'),
    goalkeeping: person('goalkeeping'),
    scout: person('scout'),
    poach: null,
    matchesLeft: STAFF_MATCHES_PER_SEASON,
    hires: 0,
    seasonSpend: 0,
  };
}

function isPerson(p: unknown): p is StaffPerson {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return false;
  const o = p as Record<string, unknown>;
  const lvl = (n: unknown): boolean => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= STAFF_MAX;
  return typeof o.id === 'string' && o.id.length > 0
    && typeof o.name === 'string' && o.name.length > 0
    && lvl(o.level) && lvl(o.potential) && (o.potential as number) >= (o.level as number)
    && typeof o.wage === 'number' && Number.isFinite(o.wage) && o.wage >= 0
    && typeof o.since === 'number' && Number.isFinite(o.since)
    && typeof o.academy === 'boolean';
}

function isPoach(p: unknown): p is StaffPoach {
  if (p === null) return true;
  if (!p || typeof p !== 'object' || Array.isArray(p)) return false;
  const o = p as Record<string, unknown>;
  return STAFF_POST_IDS.includes(o.postId as StaffPostId)
    && typeof o.club === 'string' && o.club.length > 0
    && typeof o.weeksLeft === 'number' && Number.isInteger(o.weeksLeft) && o.weeksLeft >= 0;
}

/** True when the block on the save is exactly the shape this round writes. */
export function isValidStaff(s: unknown): s is ClubStaff {
  if (!s || typeof s !== 'object' || Array.isArray(s)) return false;
  const o = s as Record<string, unknown>;
  if (o.v !== STAFF_VERSION) return false;
  if (!STAFF_POST_IDS.every(id => o[id] === null || isPerson(o[id]))) return false;
  if (!isPoach(o.poach)) return false;
  /* An approach for a post nobody holds is a block that contradicts itself. */
  const poach = o.poach as StaffPoach | null;
  if (poach && !isPerson(o[poach.postId])) return false;
  const n = (v: unknown, lo: number, high: number): boolean =>
    typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= high;
  return n(o.matchesLeft, 0, STAFF_MATCHES_PER_SEASON) && n(o.hires, 0, 9999)
    && typeof o.seasonSpend === 'number' && Number.isFinite(o.seasonSpend) && o.seasonSpend >= 0;
}

/** The staff block, repaired in place when missing or mangled. Fails closed on shape. */
export function ensureStaff(state: CareerState): ClubStaff {
  if (!isValidStaff(state.staff)) state.staff = defaultStaff(state);
  return state.staff as ClubStaff;
}

/** The staff block for reading, never writing: a save from before this round reads its day one men. */
export function staffOf(state: CareerState): ClubStaff {
  return isValidStaff(state.staff) ? state.staff : defaultStaff(state);
}

export function staffIn(state: CareerState, post: StaffPostId): StaffPerson | null {
  return staffOf(state)[post];
}

/** His level, or 1 for an empty post, which is the level that does nothing. */
export function staffLevel(state: CareerState, post: StaffPostId): number {
  return staffIn(state, post)?.level ?? 1;
}

/* ---------- the effects, each exactly nothing at level 1 and on an empty post ---------- */

/** One post's lift: 1.000 at level 1, 1.099 at level 10. */
export function postGrowthMult(state: CareerState, post: StaffPostId): number {
  return 1 + 0.011 * (staffLevel(state, post) - 1);
}

const BACK_LINE: Position[] = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM'];
const FRONT_LINE: Position[] = ['CAM', 'LW', 'RW', 'CF', 'ST'];

/** Which coach owns a shirt, or null for the middle of the park, which they share. */
export function coachForPosition(position: Position): StaffPostId | null {
  if (position === 'GK') return 'goalkeeping';
  if (BACK_LINE.includes(position)) return 'defence';
  if (FRONT_LINE.includes(position)) return 'attack';
  return null;
}

/**
 * The growth factor a player gets from the coaching staff. Exactly 1 when
 * his coach's post is empty or the man in it is level 1, so the desk can
 * only ever add. Multiplied into developmentRate before its clamp, and
 * agePlayer still caps the drift at the player's own potential afterwards.
 */
export function coachGrowthMult(state: CareerState, position: Position): number {
  const post = coachForPosition(position);
  if (post) return postGrowthMult(state, post);
  /* CM, LM and RM stand on the halfway line: half of each coach's lift, so
     they are covered once and nobody is counted twice. */
  return 1 + ((postGrowthMult(state, 'attack') - 1) + (postGrowthMult(state, 'defence') - 1)) / 2;
}

/** What the lead scout adds to the ceiling of a boy found on the road: 0 at level 1, 6 at 10. */
export function scoutQualityBonus(state: CareerState): number {
  return Math.round((staffLevel(state, 'scout') - 1) * 0.667);
}

/* ---------- the wage bill ---------- */

/** Every coach and the lead scout, in thousands a week. Read by staffWagesWeekly. */
export function staffPayrollWeekly(state: CareerState): number {
  const s = staffOf(state);
  return STAFF_POST_IDS.reduce((n, id) => n + (s[id]?.wage ?? 0), 0);
}

/* ---------- the shortlist ---------- */

export interface StaffCandidate {
  person: StaffPerson;
  /** Signing on fee in millions. The academy man is free. */
  fee: number;
  /** One line on where he came from. */
  from: string;
}

const OUTSIDE_FROM = [
  'Out of work since the summer',
  'Number two at a club in the division below',
  'Ten years in an academy, wants the first team',
  'Coached abroad, back for a job at home',
  'Runs his own coaching business, would take this',
];

/**
 * Who is available for an empty post. Three men from outside plus one
 * promotion from the academy staff, and that last one is where the club's
 * existing coaching level (academy.coaching, 1 to 20) decides quality: he
 * starts low, he is free, and he has the most room left to grow.
 *
 * Deterministic from the club, the era, the season, the post and how many
 * men this club has already hired, so the list is stable while you look at
 * it and a fresh vacancy draws a fresh three.
 */
export function staffShortlist(state: CareerState, post: StaffPostId): StaffCandidate[] {
  const st = staffOf(state);
  const def = careerDef(state);
  const historic = !!state.eraId && isHistoricEra(state.eraId);
  const season = state.season ?? 1;
  const seed = `cand|${state.clubName}|${state.eraId ?? 'now'}|${post}|${season}|${st.hires}`;
  /* A bigger club attracts a better name, the same stature ladder the day
     one men come off, and the three are spread around it. */
  const anchor = staffStartLevel(def, state.clubName, post);
  const out: StaffCandidate[] = [];
  for (let i = 0; i < 3; i++) {
    const key = `${seed}|${i}`;
    const level = clamp(anchor + hi(`sp|${key}`, -2, 2), 1, STAFF_MAX);
    const person = makePerson(key, level, season, historic, false);
    out.push({
      person,
      fee: round1(Math.max(0.2, 0.2 + 0.28 * level * (historic ? ERA_MONEY : 1))),
      from: OUTSIDE_FROM[sHash32(`fr|${key}`) % OUTSIDE_FROM.length],
    });
  }
  const coaching = state.academy?.coaching ?? 8;
  const promoteKey = `${seed}|academy`;
  out.push({
    person: makePerson(promoteKey, clamp(Math.round(coaching / 4), 1, 5), season, historic, true),
    fee: 0,
    from: 'On the academy staff already',
  });
  return out;
}

/** What sacking the man in a post costs, in millions: half a season of his wage. */
export function severanceFor(state: CareerState, post: StaffPostId): number | null {
  const person = staffIn(state, post);
  if (!person) return null;
  return round2(Math.max(0.05, (person.wage * 26) / 1000));
}

/* ---------- the desk ---------- */

function withStaff(career: CareerState, next: ClubStaff): CareerState {
  return { ...career, staff: next };
}

function headline(state: CareerState, line: string): string[] {
  return [line, ...state.aiHeadlines].slice(0, 8);
}

/**
 * Appoint one of the shortlist. Refuses on a filled post, an id the list
 * does not carry, or a kitty that cannot cover the fee. Never mutates the
 * state it was handed.
 */
export function hireStaff(career: CareerState, post: StaffPostId, candidateId: string): CareerState | null {
  const current = staffOf(career);
  if (current[post]) return null;
  const cand = staffShortlist(career, post).find(c => c.person.id === candidateId);
  if (!cand) return null;
  if (career.budget < cand.fee) return null;
  const next: ClubStaff = {
    ...current,
    [post]: { ...cand.person },
    hires: current.hires + 1,
    seasonSpend: round2(current.seasonSpend + cand.fee),
  };
  const state = withStaff(career, next);
  state.budget = round2(career.budget - cand.fee);
  state.aiHeadlines = headline(career, cand.fee > 0
    ? `${STAFF_POST_INFO[post].emoji} ${career.clubName} have appointed ${cand.person.name} as ${STAFF_POST_INFO[post].label.toLowerCase()}, ${money(cand.fee)} to bring him in.`
    : `${STAFF_POST_INFO[post].emoji} ${cand.person.name} steps up from the ${career.clubName} academy staff to ${STAFF_POST_INFO[post].label.toLowerCase()}.`);
  return state;
}

/** Pay him off. Refuses on an empty post or a kitty that cannot cover it. */
export function sackStaff(career: CareerState, post: StaffPostId): CareerState | null {
  const current = staffOf(career);
  const person = current[post];
  if (!person) return null;
  const pay = severanceFor(career, post);
  if (pay === null || career.budget < pay) return null;
  const next: ClubStaff = {
    ...current,
    [post]: null,
    /* His approach goes with him, and a fresh vacancy draws a fresh three. */
    poach: current.poach?.postId === post ? null : current.poach,
    hires: current.hires + 1,
    seasonSpend: round2(current.seasonSpend + pay),
  };
  const state = withStaff(career, next);
  state.budget = round2(career.budget - pay);
  state.aiHeadlines = headline(career, `${STAFF_POST_INFO[post].emoji} ${career.clubName} have paid off ${person.name}, ${money(pay)} to end it. The ${STAFF_POST_INFO[post].label.toLowerCase()} job is open.`);
  return state;
}

/**
 * Match the rival's money. Costs one of the season's matches and puts a
 * quarter on his wage for good, which is the whole price of keeping him.
 * Refuses when there is no approach on the desk or you have none left.
 */
export function matchStaffOffer(career: CareerState): CareerState | null {
  const current = staffOf(career);
  const poach = current.poach;
  if (!poach || current.matchesLeft <= 0) return null;
  const person = current[poach.postId];
  if (!person) return null;
  const raised: StaffPerson = { ...person, wage: Math.max(person.wage + 1, Math.round(person.wage * 1.25)) };
  const next: ClubStaff = {
    ...current,
    [poach.postId]: raised,
    poach: null,
    matchesLeft: current.matchesLeft - 1,
  };
  const state = withStaff(career, next);
  state.aiHeadlines = headline(career, `${STAFF_POST_INFO[poach.postId].emoji} ${person.name} has turned ${poach.club} down and signed on again at ${career.clubName}, now on ${raised.wage}k a week.`);
  return state;
}

/** Let him go. The post opens and the shortlist is waiting. */
export function releaseToPoacher(career: CareerState): CareerState | null {
  const current = staffOf(career);
  const poach = current.poach;
  if (!poach) return null;
  const person = current[poach.postId];
  if (!person) return null;
  const next: ClubStaff = { ...current, [poach.postId]: null, poach: null, hires: current.hires + 1 };
  const state = withStaff(career, next);
  state.aiHeadlines = headline(career, `${STAFF_POST_INFO[poach.postId].emoji} ${person.name} has left ${career.clubName} for ${poach.club}. The ${STAFF_POST_INFO[poach.postId].label.toLowerCase()} job is open.`);
  return state;
}

/* ---------- the week ---------- */

/**
 * The chance a rival comes in for the man in a post, in a given week. Good
 * staff get noticed and poor staff never do: nothing at all under level 6,
 * then 0.4 percent a week at 6 rising to 2 percent at 10. Measured over the
 * playable clubs in scripts/simClubManagerStaff.mjs section 5, which prints
 * the approaches a season rather than trusting this arithmetic.
 * Deterministic from the club, the season, the week and the post.
 */
function poachChance(level: number): number {
  return level < 6 ? 0 : 0.004 * (level - 5);
}

/**
 * Every calendar week: an approach on the desk runs down and he walks when
 * it expires, otherwise a rival may come in for somebody. Called from
 * tickWeek on the engine's private copy, so it may write into the block it
 * is handed.
 */
export function tickStaff(state: CareerState): void {
  const s = ensureStaff(state);
  if (s.poach) {
    s.poach = { ...s.poach, weeksLeft: s.poach.weeksLeft - 1 };
    if (s.poach.weeksLeft <= 0) {
      const post = s.poach.postId;
      const person = s[post];
      const club = s.poach.club;
      s.poach = null;
      if (person) {
        s[post] = null;
        state.aiHeadlines = [
          `${STAFF_POST_INFO[post].emoji} ${person.name} has gone to ${club} unanswered. ${state.clubName} need a new ${STAFF_POST_INFO[post].label.toLowerCase()}.`,
          ...state.aiHeadlines,
        ].slice(0, 8);
      }
    }
    return;
  }
  const season = state.season ?? 1;
  for (const post of STAFF_POST_IDS) {
    const person = s[post];
    if (!person) continue;
    const key = `poach|${state.clubName}|${state.eraId ?? 'now'}|${season}|${state.week}|${post}`;
    if (hf(key) >= poachChance(person.level)) continue;
    const rivals = careerLeagueOf(state).clubs.filter(c => c !== state.clubName);
    if (!rivals.length) continue;
    const club = rivals[sHash32(`rv|${key}`) % rivals.length];
    s.poach = { postId: post, club, weeksLeft: POACH_WEEKS };
    state.aiHeadlines = [
      `${STAFF_POST_INFO[post].emoji} ${club} have come in for ${person.name}. Match them or lose him: ${s.matchesLeft} match${s.matchesLeft === 1 ? '' : 'es'} left this season.`,
      ...state.aiHeadlines,
    ].slice(0, 8);
    break;
  }
}

/**
 * The summer. Staff belong to the CLUB, exactly like the facilities and the
 * sponsor: stay and they carry, a year older and a level better where there
 * was room, with the season's spend and your matches reset; move and the new
 * club hands you its own on the next read.
 */
export function rolloverStaff(state: CareerState, career: CareerState, moving: boolean): void {
  if (moving || !isValidStaff(career.staff)) {
    state.staff = undefined;
    return;
  }
  const old = career.staff;
  const historic = !!state.eraId && isHistoricEra(state.eraId);
  const season = state.season ?? 1;
  const grown = (post: StaffPostId): StaffPerson | null => {
    const p = old[post];
    if (!p) return null;
    const head = p.potential - p.level;
    if (head <= 0) return p;
    /* A man with room gets better on the training pitch like anybody else,
       and the more room he has the likelier it is. Hashed, so a season
       replayed grows the same men. */
    const chance = head >= 3 ? 0.5 : 0.32;
    if (hf(`grow|${state.clubName}|${season}|${post}|${p.id}`) >= chance) return p;
    const level = p.level + 1;
    return { ...p, level, wage: Math.max(p.wage, staffWage(level, historic)) };
  };
  state.staff = {
    v: STAFF_VERSION,
    attack: grown('attack'),
    defence: grown('defence'),
    goalkeeping: grown('goalkeeping'),
    scout: grown('scout'),
    poach: null,
    matchesLeft: STAFF_MATCHES_PER_SEASON,
    hires: old.hires,
    seasonSpend: 0,
  };
}

/* ---------- the screen's words ---------- */

/** One line per post saying what the level does today. */
export function staffEffectLine(state: CareerState, post: StaffPostId): string {
  const person = staffIn(state, post);
  if (!person) return 'Nobody in the job. Nothing lost, nothing gained.';
  if (post === 'scout') {
    const bonus = scoutQualityBonus(state);
    return bonus <= 0
      ? 'Trip reports as they come. No lift yet.'
      : `Boys found on the road top out up to ${bonus} higher.`;
  }
  const pct = Math.round((postGrowthMult(state, post) - 1) * 1000) / 10;
  const who = post === 'goalkeeping' ? 'Keepers' : post === 'attack' ? 'The forwards' : 'The back line';
  return pct <= 0
    ? `${who} grow at the club's own rate. No lift yet.`
    : `${who} grow ${pct}% faster where there is room. Midfield gets half of it.`;
}

/**
 * The portrait: five flat shapes in a 64 by 64 box, every one of them a
 * rectangle, a circle or a rounded box, all of it a pure function of his id.
 * No photograph, no likeness, nothing traced from anybody. Self contained,
 * so it renders the same on the shortlist and on the desk.
 */
export function staffPortraitSvg(person: Pick<StaffPerson, 'id'>, size = 44): string {
  const h = sHash32(`art|${person.id}`);
  const skins = ['#f2d3b6', '#e0b48c', '#c68a5f', '#9a6440', '#6f4630'];
  const hairs = ['#241c17', '#4a3524', '#7a5330', '#b0863f', '#8e8e8e', '#d9d3c7'];
  const shirts = ['#1f3f6d', '#2f6d4a', '#6d2f3f', '#4a3f6d', '#2f5d6d', '#5d4a2f'];
  const skin = skins[h % skins.length];
  const hair = hairs[(h >> 3) % hairs.length];
  const shirt = shirts[(h >> 7) % shirts.length];
  const hairStyle = (h >> 11) % 3;
  const beard = ((h >> 14) % 3) === 0;
  const glasses = ((h >> 17) % 4) === 0;
  const parts = [
    `<rect x="0" y="0" width="64" height="64" rx="10" fill="${shirt}"/>`,
    `<circle cx="32" cy="52" r="18" fill="rgba(255,255,255,0.14)"/>`,
    `<circle cx="32" cy="27" r="14" fill="${skin}"/>`,
  ];
  if (hairStyle === 0) parts.push(`<path d="M18 25a14 14 0 0 1 28 0v-3a14 14 0 0 0-28 0z" fill="${hair}"/>`);
  else if (hairStyle === 1) parts.push(`<rect x="18" y="13" width="28" height="9" rx="4.5" fill="${hair}"/>`);
  else parts.push(`<circle cx="32" cy="18" r="13" fill="${hair}"/><rect x="18" y="18" width="28" height="4" fill="${hair}"/>`);
  if (beard) parts.push(`<rect x="23" y="31" width="18" height="8" rx="4" fill="${hair}" opacity="0.85"/>`);
  parts.push(`<circle cx="27" cy="26" r="1.7" fill="#1b1b1b"/><circle cx="37" cy="26" r="1.7" fill="#1b1b1b"/>`);
  if (glasses) parts.push(`<rect x="23" y="22.5" width="18" height="7" rx="3.5" fill="none" stroke="#1b1b1b" stroke-width="1.4" opacity="0.8"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64" role="img" aria-label="staff portrait">${parts.join('')}</svg>`;
}

/** What the era's money does to a wage, for the screen's own line. */
export function staffWageLine(state: CareerState, person: StaffPerson): string {
  const era = eraMoney(state) < 1 ? ' (era wages)' : '';
  return `${person.wage}k a week${era}`;
}
