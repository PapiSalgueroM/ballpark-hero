/**
 * Round 728: the program layer both college dynasties share.
 *
 * CFB Dynasty and CBB Dynasty were written as two copies of one idea, and
 * Rounds 426 and 431 paid for that by fixing the same bug twice. So the
 * things a college program has whatever the sport live here once, and each
 * engine binds them with its own numbers:
 *
 *   1. A coaching staff of two coordinators, one per side of the ball.
 *      Generated people, never real ones. Each has a rating that moves his
 *      unit by at most STAFF_UNIT_EDGE_MAX rating points either way, and a
 *      salary paid out of the program budget before recruiting starts.
 *   2. Rivalry week. A program's rival comes from data the game already
 *      holds: two schools in the same state (src/data/colleges.ts carries the
 *      state of every school, with its IPEDS unit id) are paired as an
 *      in-state game. Where a school has no in-state partner the game pairs
 *      it inside its conference by prestige and marks the pair 'generated',
 *      because nothing on file says those two have any history. The game
 *      carries a bounded morale swing and a bounded recruiting swing.
 *   3. Strength of schedule: the average strength of the opponents a team
 *      actually played.
 *
 * Every function here is pure over what it is handed, and nothing is
 * evaluated at module scope from another module.
 */

/* ---------------------------------------------------------------- staff */

export type StaffRole = 'OC' | 'DC';

export interface Coordinator {
  id: string;
  name: string;
  role: StaffRole;
  /** 45 to 95 when generated. The edge is clamped whatever the number says. */
  rating: number;
  /** Program budget points a season. */
  salary: number;
  /** The season he was hired for. */
  since: number;
}

/** A null chair is vacant: a grad assistant calls it, rated VACANT_RATING. */
export interface ProgramStaff { OC: Coordinator | null; DC: Coordinator | null }

export const STAFF_ROLES: StaffRole[] = ['OC', 'DC'];
export const STAFF_RATING_MIN = 45;
export const STAFF_RATING_MAX = 95;
/** The rating that moves nothing. */
export const STAFF_NEUTRAL = 70;
/** The most a coordinator can move his unit, in rating points, either way. */
export const STAFF_UNIT_EDGE_MAX = 3;
export const STAFF_EDGE_PER_POINT = 0.12;
export const VACANT_RATING = 50;
/** A coordinator better than this can be hired away as a head coach. */
export const STAFF_POACH_RATING = 85;
export const STAFF_POACH_CHANCE = 0.2;
/** An AI program with a losing record fires a coordinator this often. */
export const STAFF_FIRE_CHANCE = 0.35;

/** How far a coordinator rated `rating` moves his unit. Never past the cap,
 *  whatever the rating, so a hand edited or corrupt save cannot break it. */
export function coordinatorEdge(rating: number): number {
  const raw = (rating - STAFF_NEUTRAL) * STAFF_EDGE_PER_POINT;
  return Math.max(-STAFF_UNIT_EDGE_MAX, Math.min(STAFF_UNIT_EDGE_MAX, raw));
}

/** Both units' edges. A program with no staff object at all (a save from
 *  before Round 728) gets no staff effect. A vacant chair costs. */
export function staffEdges(staff: ProgramStaff | null | undefined): { off: number; def: number } {
  if (!staff) return { off: 0, def: 0 };
  return {
    off: coordinatorEdge(staff.OC ? staff.OC.rating : VACANT_RATING),
    def: coordinatorEdge(staff.DC ? staff.DC.rating : VACANT_RATING),
  };
}

/** 3 points a season for a 45, 16 for a 95. */
export function coordinatorSalary(rating: number): number {
  const r = Math.max(STAFF_RATING_MIN, Math.min(STAFF_RATING_MAX, rating));
  return Math.round(3 + (r - STAFF_RATING_MIN) * 0.26);
}

/** The level of coordinator a program attracts, from its prestige (60 to 97). */
export function staffQualityFor(prestige: number): number {
  return 50 + (prestige - 66) * 1.15;
}

const COACH_FIRST = ['Hollis', 'Wendell', 'Lyle', 'Garrison', 'Thaddeus', 'Merritt', 'Royce', 'Emmett', 'Booker', 'Sterling', 'Ambrose', 'Delano'];
const COACH_LAST = ['Pettibone', 'Ashcombe', 'Brannigan', 'Coldwell', 'Durrance', 'Featherstone', 'Halvorsen', 'Kettering', 'Lunsford', 'Oakhurst', 'Pellham', 'Quillen'];

export function coachGenName(rng: () => number): string {
  return `${COACH_FIRST[Math.floor(rng() * COACH_FIRST.length)]} ${COACH_LAST[Math.floor(rng() * COACH_LAST.length)]}`;
}

function clampRating(v: number): number {
  return Math.max(STAFF_RATING_MIN, Math.min(STAFF_RATING_MAX, Math.round(v)));
}

export function genCoordinator(rng: () => number, role: StaffRole, quality: number, id: string, since: number): Coordinator {
  const name = coachGenName(rng);
  const rating = clampRating(quality + rng() * 16 - 8);
  return { id, name, role, rating, salary: coordinatorSalary(rating), since };
}

export function genStaff(rng: () => number, prestige: number, idPrefix: string, since: number): ProgramStaff {
  const q = staffQualityFor(prestige);
  return {
    OC: genCoordinator(rng, 'OC', q, `${idPrefix}-OC-${since}`, since),
    DC: genCoordinator(rng, 'DC', q, `${idPrefix}-DC-${since}`, since),
  };
}

/** The offseason market: for each role a bargain, a fair fit and a reach,
 *  so there is always someone cheap and always someone worth stretching for. */
export function staffCandidates(rng: () => number, prestige: number, season: number): Coordinator[] {
  const q = staffQualityFor(prestige);
  const out: Coordinator[] = [];
  for (const role of STAFF_ROLES) {
    [q - 14, q, q + 12].forEach((level, i) => {
      out.push(genCoordinator(rng, role, level, `mkt-${season}-${role}-${i}`, season + 1));
    });
  }
  return out.sort((a, b) => (a.role === b.role ? b.rating - a.rating : a.role === 'OC' ? -1 : 1));
}

export function staffPayroll(staff: ProgramStaff | null | undefined): number {
  if (!staff) return 0;
  return (staff.OC?.salary ?? 0) + (staff.DC?.salary ?? 0);
}

/**
 * Pay the staff out of a fresh season budget. If the budget cannot cover
 * the payroll, the dearest coordinator walks until it can, so the budget
 * left is never negative. Mutates `staff`; returns what is left and who left.
 */
export function chargePayroll(budget: number, staff: ProgramStaff): { left: number; walked: Coordinator[] } {
  const walked: Coordinator[] = [];
  let pot = Math.max(0, budget);
  while (staffPayroll(staff) > pot) {
    const dearest = STAFF_ROLES
      .map(r => staff[r])
      .filter((c): c is Coordinator => !!c)
      .sort((a, b) => b.salary - a.salary)[0];
    if (!dearest) break;
    staff[dearest.role] = null;
    walked.push(dearest);
  }
  pot -= staffPayroll(staff);
  return { left: pot, walked };
}

/**
 * Hire `cand` into his chair. The man already in it goes, and the salary
 * that was set aside for him comes back first, so the cost is the
 * difference. Refused, with nothing changed, when the pot cannot cover it.
 */
export function hireCoordinator(holder: { nil: number }, staff: ProgramStaff, cand: Coordinator): boolean {
  const current = staff[cand.role];
  const net = cand.salary - (current?.salary ?? 0);
  if (net > holder.nil) return false;
  holder.nil -= net;
  staff[cand.role] = { ...cand };
  return true;
}

/** Let a coordinator go. His salary was set aside for the season, so it
 *  goes back into the pot; the chair stays empty until somebody is hired. */
export function fireCoordinator(holder: { nil: number }, staff: ProgramStaff, role: StaffRole): Coordinator | null {
  const gone = staff[role];
  if (!gone) return null;
  staff[role] = null;
  holder.nil += gone.salary;
  return gone;
}

/**
 * The coaching carousel, once an offseason. A coordinator rated
 * STAFF_POACH_RATING or better can be hired away as somebody's head coach;
 * an AI program with a losing record fires people. AI chairs are refilled
 * on the spot at the program's level. The player's chairs are left empty
 * for the player to fill in the hiring window, and the reason is returned.
 */
export function staffCarousel(
  rng: () => number,
  staff: ProgramStaff,
  opts: { prestige: number; wins: number; losses: number; mine: boolean; season: number; idPrefix: string },
): { role: StaffRole; who: Coordinator; why: 'poached' | 'fired' }[] {
  const gone: { role: StaffRole; who: Coordinator; why: 'poached' | 'fired' }[] = [];
  for (const role of STAFF_ROLES) {
    const c = staff[role];
    const poachRoll = rng();
    const fireRoll = rng();
    if (!c) {
      if (!opts.mine) staff[role] = genCoordinator(rng, role, staffQualityFor(opts.prestige), `${opts.idPrefix}-${role}-${opts.season + 1}`, opts.season + 1);
      continue;
    }
    let why: 'poached' | 'fired' | null = null;
    if (c.rating >= STAFF_POACH_RATING && poachRoll < STAFF_POACH_CHANCE) why = 'poached';
    else if (!opts.mine && opts.losses > opts.wins && fireRoll < STAFF_FIRE_CHANCE) why = 'fired';
    if (!why) continue;
    gone.push({ role, who: c, why });
    staff[role] = opts.mine
      ? null
      : genCoordinator(rng, role, staffQualityFor(opts.prestige), `${opts.idPrefix}-${role}-${opts.season + 1}`, opts.season + 1);
  }
  return gone;
}

/* -------------------------------------------------------------- rivalry */

export type RivalKind = 'in-state' | 'generated';

export interface Rivalry {
  a: string;
  b: string;
  kind: RivalKind;
  /** Only on an in-state pair: the state both schools are in. */
  state?: string;
}

export interface RivalSchool { id: string; conf: string; prestige: number }

const byPrestige = (a: RivalSchool, b: RivalSchool) => b.prestige - a.prestige || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * Pair every school with one rival for rivalry week. Deterministic, no dice:
 *   1. schools sharing a state, strongest with strongest, are in-state pairs;
 *   2. everyone left is paired inside their conference by prestige, marked
 *      'generated';
 *   3. anyone still left over is paired across conferences, also 'generated'.
 * A school with no state on file is never called in-state. With an odd
 * number of schools exactly one is left without a rival.
 */
export function buildRivalries(schools: RivalSchool[], stateOf: Record<string, string | undefined>): Rivalry[] {
  const out: Rivalry[] = [];
  const taken = new Set<string>();
  const byState = new Map<string, RivalSchool[]>();
  for (const s of schools) {
    const st = stateOf[s.id];
    if (!st) continue;
    if (!byState.has(st)) byState.set(st, []);
    byState.get(st)!.push(s);
  }
  for (const st of [...byState.keys()].sort()) {
    const group = byState.get(st)!.sort(byPrestige);
    for (let i = 0; i + 1 < group.length; i += 2) {
      out.push({ a: group[i].id, b: group[i + 1].id, kind: 'in-state', state: st });
      taken.add(group[i].id); taken.add(group[i + 1].id);
    }
  }
  const confs = [...new Set(schools.map(s => s.conf))];
  const leftovers: RivalSchool[] = [];
  for (const conf of confs) {
    const pool = schools.filter(s => s.conf === conf && !taken.has(s.id)).sort(byPrestige);
    for (let i = 0; i + 1 < pool.length; i += 2) {
      out.push({ a: pool[i].id, b: pool[i + 1].id, kind: 'generated' });
      taken.add(pool[i].id); taken.add(pool[i + 1].id);
    }
    if (pool.length % 2 === 1) leftovers.push(pool[pool.length - 1]);
  }
  leftovers.sort(byPrestige);
  for (let i = 0; i + 1 < leftovers.length; i += 2) {
    out.push({ a: leftovers[i].id, b: leftovers[i + 1].id, kind: 'generated' });
  }
  return out;
}

export function rivalOf(rivalries: Rivalry[], id: string): { rival: string; kind: RivalKind; state?: string } | null {
  const r = rivalries.find(x => x.a === id || x.b === id);
  if (!r) return null;
  return { rival: r.a === id ? r.b : r.a, kind: r.kind, state: r.state };
}

/** The swing a rivalry result carries, in its stated range: morale between
 *  RIVAL_MORALE_MIN and RIVAL_MORALE_MAX strength points, recruiting between
 *  RIVAL_RECRUIT_MIN and RIVAL_RECRUIT_MAX budget points. A blowout (the
 *  sport's `fullMargin` or more) swings the most. The winner gains it, the
 *  loser loses it. */
export const RIVAL_MORALE_MIN = 0.5;
export const RIVAL_MORALE_MAX = 1.5;
export const RIVAL_RECRUIT_MIN = 3;
export const RIVAL_RECRUIT_MAX = 8;

export function rivalrySwing(margin: number, fullMargin: number): { morale: number; recruit: number } {
  const share = Math.min(1, Math.max(0, margin) / fullMargin);
  return {
    morale: Math.round((RIVAL_MORALE_MIN + (RIVAL_MORALE_MAX - RIVAL_MORALE_MIN) * share) * 100) / 100,
    recruit: Math.round(RIVAL_RECRUIT_MIN + (RIVAL_RECRUIT_MAX - RIVAL_RECRUIT_MIN) * share),
  };
}

/* -------------------------------------------------- strength of schedule */

/** The average strength of the opponents a team has played, or null before
 *  it has played anybody. */
export function strengthOfSchedule(opps: string[] | null | undefined, strengthOf: (id: string) => number): number | null {
  if (!opps || opps.length === 0) return null;
  return opps.reduce((s, id) => s + strengthOf(id), 0) / opps.length;
}
