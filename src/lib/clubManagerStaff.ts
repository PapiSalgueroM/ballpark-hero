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
 *
 * Round 910: THE MACHINERY LIVES IN src/lib/gmStaff.ts NOW. The person, the
 * name pick, the wage curve, the shortlist, the fee, the severance, the
 * approach, the tick and the summer were lifted out so every other manager
 * game can have this desk with its own posts. What stays here is what is
 * soccer's: the four posts and what each does to the pitch, the stature
 * ladder a club's men come off, the two name banks, the numbers in
 * CM_STAFF_RULES and every headline. scripts/data/cmStaffFixture.json was
 * recorded before the move (twenty clubs, three seasons, every approach,
 * hire and pay off) and scripts/simGmStaff.mjs replays it to the byte.
 */
import type { CareerState, ClubDef } from '@/lib/clubManager';
import { careerLeagueOf, clubDefFor, eraClubDefFor, isHistoricEra, money } from '@/lib/clubManager';
import type { GmStaffCtx, GmStaffPerson, GmStaffPoach, GmStaffRules } from '@/lib/gmStaff';
import {
  gmDefaultStaff, gmHashInt, gmHireStaff, gmIsValidStaff, gmMatchStaffOffer, gmReleaseToPoacher, gmRolloverStaff,
  gmSackStaff, gmSeverance, gmStaffPayroll, gmStaffPortraitSvg, gmStaffShortlist, gmStaffWage, gmTickStaff,
} from '@/lib/gmStaff';
import type { Position } from '@/types/game';

export type StaffPostId = 'attack' | 'defence' | 'goalkeeping' | 'scout';

export const STAFF_POST_IDS: StaffPostId[] = ['attack', 'defence', 'goalkeeping', 'scout'];
export const STAFF_MAX = 10;
export const STAFF_VERSION = 1;
/** Rival approaches you may match in one season. The screen prints what is left. */
export const STAFF_MATCHES_PER_SEASON = 2;
/** Weeks an approach sits on the desk before he walks. */
export const POACH_WEEKS = 2;

/**
 * One man on the desk: a level and a potential from 1 to 10 (never under his
 * level), a wage in thousands a week, the season he took the job, and whether
 * he came up from the academy staff instead of the shortlist. The shape is
 * the shared one, so a save written before Round 910 is this already.
 */
export type StaffPerson = GmStaffPerson;

/** A rival's approach, sitting on the desk: the real club making it (a club acting, never a person speaking) and the weeks before he walks. */
export type StaffPoach = GmStaffPoach<StaffPostId>;

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

const OUTSIDE_FROM = [
  'Out of work since the summer',
  'Number two at a club in the division below',
  'Ten years in an academy, wants the first team',
  'Coached abroad, back for a job at home',
  'Runs his own coaching business, would take this',
];

/**
 * Every number on this desk, in one place, read by the shared machinery in
 * gmStaff. Two banks of twenty names (four hundred pairings, and gmStaff
 * keeps two men in one room from sharing either half). A wage of 3 plus 2.1
 * a level in thousands a week. A fee of 0.2m plus 0.28m a level, a pay off of
 * half a season's wage. A quarter on his wage to match a rival. Nobody under
 * level 6 is ever approached, then 0.4 percent a week at 6 rising to 2
 * percent at 10 (scripts/simClubManagerStaff.mjs section 5 prints the
 * approaches a season rather than trusting this arithmetic). A man with room
 * grows a level over a summer about one time in three, one in two with three
 * levels of room.
 */
export const CM_STAFF_RULES: GmStaffRules<StaffPostId> = {
  posts: STAFF_POST_IDS,
  version: STAFF_VERSION,
  maxLevel: STAFF_MAX,
  matchesPerSeason: STAFF_MATCHES_PER_SEASON,
  poachWeeks: POACH_WEEKS,
  first: STAFF_FIRST,
  last: STAFF_LAST,
  wageBase: 3,
  wagePerLevel: 2.1,
  feeBase: 0.2,
  feePerLevel: 0.28,
  severanceTicks: 26,
  wagePerPurse: 1000,
  severanceMin: 0.05,
  matchRaise: 1.25,
  poachFromLevel: 6,
  poachPerLevel: 0.004,
  growChance: 0.32,
  growChanceRoomy: 0.5,
  outsideFrom: OUTSIDE_FROM,
  promotedFrom: 'On the academy staff already',
};

/**
 * What the shared desk reads off a career: the club and the era are the hash,
 * the stature ladder is where its men come from, and the club's own academy
 * coaching level (1 to 20) decides how good the man you can promote is.
 */
function ctxOf(state: CareerState): GmStaffCtx<StaffPostId> {
  return {
    owner: state.clubName,
    world: state.eraId ?? 'now',
    season: state.season ?? 1,
    week: state.week,
    money: eraMoney(state),
    anchor: post => staffStartLevel(careerDef(state), state.clubName, post),
    inHouse: clamp(Math.round((state.academy?.coaching ?? 8) / 4), 1, 5),
    rivals: () => careerLeagueOf(state).clubs.filter(c => c !== state.clubName),
  };
}

/** What he earns at that level, in thousands a week. */
export function staffWage(level: number, historic: boolean): number {
  return gmStaffWage(CM_STAFF_RULES, level, historic ? ERA_MONEY : 1);
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
  return clamp(tierBase + valueAdj + gmHashInt(`start|${clubName}|${post}`, -1, 1), 1, STAFF_MAX);
}

function defaultStaff(state: CareerState): ClubStaff {
  return gmDefaultStaff(CM_STAFF_RULES, ctxOf(state));
}

/**
 * True when the block on the save is exactly the shape this round writes:
 * the version, a man or null in each of the four posts (whole levels 1 to
 * 10, potential never under level, a wage that is a number), an approach
 * only for a post somebody holds, and the three counters inside their range.
 */
export function isValidStaff(s: unknown): s is ClubStaff {
  return gmIsValidStaff(CM_STAFF_RULES, s);
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
  return gmStaffPayroll(CM_STAFF_RULES, staffOf(state));
}

/* ---------- the shortlist ---------- */

export interface StaffCandidate {
  person: StaffPerson;
  /** Signing on fee in millions. The academy man is free. */
  fee: number;
  /** One line on where he came from. */
  from: string;
}

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
  /* A bigger club attracts a better name, the same stature ladder the day
     one men come off, and the three are spread around it. Nobody on the
     list shares a name with anybody else on it, or with the three men
     already on the desk. */
  return gmStaffShortlist(CM_STAFF_RULES, staffOf(state), ctxOf(state), post);
}

/** What sacking the man in a post costs, in millions: half a season of his wage. */
export function severanceFor(state: CareerState, post: StaffPostId): number | null {
  return gmSeverance(CM_STAFF_RULES, staffIn(state, post));
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
  const done = gmHireStaff(CM_STAFF_RULES, staffOf(career), ctxOf(career), post, candidateId, career.budget);
  if (!done) return null;
  const { cand } = done;
  const state = withStaff(career, done.next);
  state.budget = done.purse;
  state.aiHeadlines = headline(career, cand.fee > 0
    ? `${STAFF_POST_INFO[post].emoji} ${career.clubName} have appointed ${cand.person.name} as ${STAFF_POST_INFO[post].label.toLowerCase()}, ${money(cand.fee)} to bring him in.`
    : `${STAFF_POST_INFO[post].emoji} ${cand.person.name} steps up from the ${career.clubName} academy staff to ${STAFF_POST_INFO[post].label.toLowerCase()}.`);
  return state;
}

/** Pay him off. Refuses on an empty post or a kitty that cannot cover it. */
export function sackStaff(career: CareerState, post: StaffPostId): CareerState | null {
  /* His approach goes with him, and a fresh vacancy draws a fresh three. */
  const done = gmSackStaff(CM_STAFF_RULES, staffOf(career), post, career.budget);
  if (!done) return null;
  const { person, pay } = done;
  const state = withStaff(career, done.next);
  state.budget = done.purse;
  state.aiHeadlines = headline(career, `${STAFF_POST_INFO[post].emoji} ${career.clubName} have paid off ${person.name}, ${money(pay)} to end it. The ${STAFF_POST_INFO[post].label.toLowerCase()} job is open.`);
  return state;
}

/**
 * Match the rival's money. Costs one of the season's matches and puts a
 * quarter on his wage for good, which is the whole price of keeping him.
 * Refuses when there is no approach on the desk or you have none left.
 */
export function matchStaffOffer(career: CareerState): CareerState | null {
  const done = gmMatchStaffOffer(CM_STAFF_RULES, staffOf(career));
  if (!done) return null;
  const { person, raised, poach } = done;
  const state = withStaff(career, done.next);
  state.aiHeadlines = headline(career, `${STAFF_POST_INFO[poach.postId].emoji} ${person.name} has turned ${poach.club} down and signed on again at ${career.clubName}, now on ${raised.wage}k a week.`);
  return state;
}

/** Let him go. The post opens and the shortlist is waiting. */
export function releaseToPoacher(career: CareerState): CareerState | null {
  const done = gmReleaseToPoacher(staffOf(career));
  if (!done) return null;
  const { person, poach } = done;
  const state = withStaff(career, done.next);
  state.aiHeadlines = headline(career, `${STAFF_POST_INFO[poach.postId].emoji} ${person.name} has left ${career.clubName} for ${poach.club}. The ${STAFF_POST_INFO[poach.postId].label.toLowerCase()} job is open.`);
  return state;
}

/* ---------- the week ---------- */

/**
 * Every calendar week: an approach on the desk runs down and he walks when
 * it expires, otherwise a rival may come in for somebody. Good staff get
 * noticed and poor staff never do (the chance is in CM_STAFF_RULES), and it
 * is deterministic from the club, the season, the week and the post. Called
 * from tickWeek on the engine's private copy, so it may write into the block
 * it is handed. The week itself is gmTickStaff; the two headlines are ours.
 */
export function tickStaff(state: CareerState): void {
  const s = ensureStaff(state);
  const event = gmTickStaff(CM_STAFF_RULES, s, ctxOf(state));
  if (!event) return;
  const { post, person, club } = event;
  state.aiHeadlines = [
    event.kind === 'walked'
      ? `${STAFF_POST_INFO[post].emoji} ${person.name} has gone to ${club} unanswered. ${state.clubName} need a new ${STAFF_POST_INFO[post].label.toLowerCase()}.`
      : `${STAFF_POST_INFO[post].emoji} ${club} have come in for ${person.name}. Match them or lose him: ${s.matchesLeft} match${s.matchesLeft === 1 ? '' : 'es'} left this season.`,
    ...state.aiHeadlines,
  ].slice(0, 8);
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
  /* A man with room gets better on the training pitch like anybody else,
     and the more room he has the likelier it is. Hashed, so a season
     replayed grows the same men. `state` is the new season. */
  state.staff = gmRolloverStaff(CM_STAFF_RULES, career.staff, ctxOf(state));
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
  const who = post === 'goalkeeping' ? 'Keepers grow' : post === 'attack' ? 'The forwards grow' : 'The back line grows';
  /* Only the two outfield coaches share the middle of the park, so the
     keepers' line must not promise the midfield anything. */
  const half = post === 'goalkeeping' ? '' : ' Midfield gets half of it.';
  return pct <= 0
    ? `${who} at the club's own rate. No lift yet.`
    : `${who} ${pct}% faster where there is room.${half}`;
}

/**
 * The portrait: flat shapes in a 64 by 64 box, every one of them a
 * rectangle, a circle, an arc or a rounded box, all of it a pure function of
 * his id. No photograph, no likeness, nothing traced from anybody. Self
 * contained, so it renders the same on the shortlist and on the desk.
 *
 * The ground is one constant slate rather than his shirt colour, because a
 * dark head on a dark shirt read as a blob at 40 pixels: the shirt is the
 * shoulders now and every skin tone has the same ground behind it. Hair is
 * an arc across the crown that stops at y=23, three pixels clear of the
 * eyes, because a hair CIRCLE big enough to look like hair covered the face.
 */
export function staffPortraitSvg(person: Pick<StaffPerson, 'id'>, size = 44): string {
  return gmStaffPortraitSvg(person, size);
}

/** What the era's money does to a wage, for the screen's own line. */
export function staffWageLine(state: CareerState, person: StaffPerson): string {
  const era = eraMoney(state) < 1 ? ' (era wages)' : '';
  return `${person.wage}k a week${era}`;
}
