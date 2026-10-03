/**
 * Round 911: the recruiting trail. One pure module for both college
 * dynasties, the way src/lib/collegeProgram.ts is one staff and rivalry layer.
 *
 * Recruiting is to a college program what the transfer market is to a club,
 * so it gets what Club Manager's market has: a read on the player that only
 * scouting sharpens, a pitch that has to fit the man, and rivals who act
 * every week whether you do or not. What it does NOT get is a club's money
 * model, because a college program has none of it:
 *
 *   - NIL money is paid to the player. There is no selling club and no fee.
 *   - The limit is a class cap (how many you may sign), not a wage bill.
 *   - The transfer portal is a separate window after the season. The men in
 *     it have real tape, so their rating is known, and they decide fast. And
 *     your own players can leave through it unless you sit down with them.
 *
 * The trail, week by week. The coach has a fixed number of hours a week and
 * spends them on five things:
 *
 *   evaluate  narrows the band around a recruit's true rating
 *   contact   a little interest, and he tells you his next priority
 *   pitch     sell one of six things; the one he cares about most moves him
 *             most, and only if your program can back it up
 *   visit     an official visit, limited per cycle, worth more in a week you
 *             win at home
 *   nil       a NIL offer, reserved from the pot and paid only if he signs
 *
 * Every recruit also has a short list of rival schools that add interest
 * every week. A school whose lead passes the commit line gets his
 * commitment, which can still flip until signing day. On signing day every
 * recruit signs exactly once, with the school he is committed to or else the
 * one he likes best that still has room.
 *
 * Every number in this file (the caps, hours, weeks, visit limits, the
 * portal's length) is this game's own rule, not the NCAA's, the same way the
 * dynasty file headers state theirs. Every recruit and every name is
 * generated; the schools come from the program tables the dynasties already
 * ship, handed in by the caller. Nothing here imports a dynasty, reads a
 * clock or calls Math.random: the caller hands in the seeded rng, the name
 * generator and the id minter, so a binding can pass its own.
 *
 * Held by scripts/simCollegeRecruiting.mjs.
 */

export type RecruitPriority = 'playing-time' | 'nil' | 'close-to-home' | 'winning' | 'coach-stability' | 'pro-path';

export const RECRUIT_PRIORITIES: readonly RecruitPriority[] = [
  'playing-time', 'nil', 'close-to-home', 'winning', 'coach-stability', 'pro-path',
];

export const PRIORITY_LABEL: Record<RecruitPriority, string> = {
  'playing-time': 'Playing time',
  nil: 'NIL',
  'close-to-home': 'Close to home',
  winning: 'Winning',
  'coach-stability': 'Coach stability',
  'pro-path': 'Road to the pros',
};

/** One sport's binding. Everything that differs between football and
 *  basketball recruiting lives here; the loop does not. */
export interface RecruitingSport {
  sport: 'cfb' | 'cbb';
  /** Positions a recruit can play, repeats weight the draw. */
  positions: readonly string[];
  /** Recruits on the board each cycle. */
  boardSize: number;
  /** The most a school may sign in one class. */
  classCap: number;
  /** Weeks on the trail before signing day. */
  weeks: number;
  hoursPerWeek: number;
  /** Official visits a program may host in one cycle. */
  visitLimit: number;
  /** Elite freshmen leave for the pros after one season. */
  oneAndDone: boolean;
  /** A freshman at or above this true rating is an early pro in a one and done sport. */
  eliteLine: number;
  /** A recruit's true rating is ratingBase + 5 per star + 0 to 8. */
  ratingBase: number;
  /** A recruit's NIL ask is this per star plus 0 to 7, in the dynasty's NIL units. */
  nilPerStar: number;
  /** The prestige a man of 0 to 5 stars expects to hear from, and how many
   *  points short of it cost his whole attention. Basketball's table is the
   *  top of its sport, so its needs sit higher and its span is tighter. */
  starNeed: readonly number[];
  reachSpan: number;
  /** The portal: how many outside men are in it, how long it runs, the hours, and the sit downs. */
  portalSize: number;
  portalWeeks: number;
  portalHours: number;
  retainSlots: number;
}

export const CFB_RECRUITING: RecruitingSport = {
  sport: 'cfb',
  positions: ['QB', 'RB', 'WR', 'WR', 'TE', 'OL', 'OL', 'DL', 'DL', 'LB', 'DB', 'DB'],
  boardSize: 24,
  classCap: 5,
  weeks: 10,
  hoursPerWeek: 20,
  visitLimit: 4,
  oneAndDone: false,
  eliteLine: 90,
  ratingBase: 54,
  nilPerStar: 9,
  starNeed: [0, 50, 60, 70, 80, 88],
  reachSpan: 25,
  portalSize: 8,
  portalWeeks: 2,
  portalHours: 10,
  retainSlots: 3,
};

export const CBB_RECRUITING: RecruitingSport = {
  sport: 'cbb',
  positions: ['PG', 'SG', 'SF', 'PF', 'C'],
  boardSize: 20,
  classCap: 3,
  weeks: 8,
  hoursPerWeek: 16,
  visitLimit: 3,
  oneAndDone: true,
  eliteLine: 88,
  ratingBase: 56,
  nilPerStar: 8,
  starNeed: [0, 60, 72, 80, 86, 91],
  reachSpan: 9,
  portalSize: 7,
  portalWeeks: 2,
  portalHours: 8,
  retainSlots: 2,
};

/* ------------------------------------------------------------- the rules */

/** Hours each action costs. */
export const HOURS = { evaluate: 2, contact: 1, pitch: 2, visit: 4, nil: 1 } as const;
export type TrailActionKind = keyof typeof HOURS;

/** Interest a contact adds. */
export const CONTACT_GAIN = 3;
/** Interest any pitch adds, whatever it sells. */
export const PITCH_BASE = 2;
/** What a pitch adds on top when it sells his first, second or third
 *  priority, times how well the program can back it up (0 to 1.5). A pitch
 *  about something not on his list gets only the base. */
export const PITCH_RANK_BONUS = [9, 5, 2.5];
/** An official visit, and how a home week moves it. */
export const VISIT_GAIN = 24;
export const VISIT_HOME_WIN = 1.7;
export const VISIT_HOME_LOSS = 0.9;
/** A NIL offer at his ask adds this, scaled by where NIL sits on his list. */
export const NIL_GAIN = 36;
export const NIL_RANK_MULT = [1.5, 1.0, 0.7];
export const NIL_OFF_LIST_MULT = 0.4;
/** Money from a program that never called him counts for half. */
export const NIL_COLD_MULT = 0.5;
/** An offer past this multiple of his ask buys nothing more. */
export const NIL_ASK_CAP = 1.5;
/** A standing offer adds this share of its first pull again every week it stands, the week it is made included. */
export const NIL_WEEKLY_SHARE = 0.25;

/** A school leading at this interest, by this much, gets the commitment. */
export const COMMIT_AT = 80;
export const COMMIT_LEAD = 12;
/** In the portal men decide fast: a lower line. */
export const PORTAL_COMMIT_AT = 55;
/** A committed man flips when another school with room passes his by this much. */
export const FLIP_MARGIN = 20;
/** Rivals keep working a man committed elsewhere, at this share. */
export const RIVAL_COMMITTED_SHARE = 0.6;

/** The band around a high school recruit's true rating starts this wide
 *  either way; each evaluation halves it, down to BAND_MIN. */
export const BAND_START = 8;
export const BAND_MIN = 1;

/* ------------------------------------------------------------- the shapes */

export interface RecruitingSchool { id: string; prestige: number; state?: string }

/** What my program can back a pitch up with. */
export interface ProgramPitchContext {
  schoolId: string;
  prestige: number;
  state?: string;
  /** Last season's win share, 0 to 1. */
  winPct: number;
  /** Seasons the head coach has been in the chair. */
  coachYears: number;
  /** Starting spots opening next season, by position. */
  openSpots: Partial<Record<string, number>>;
  /** NIL pot for this cycle. */
  nilPot: number;
}

export interface TrailRecruit {
  id: string;
  name: string;
  pos: string;
  stars: number;
  home: string;
  /** His three priorities, most important first. */
  priorities: RecruitPriority[];
  /** How many of them he has told me (contact tells me the next one). */
  known: number;
  trueOvr: number;
  /** The band I see. Always holds trueOvr. */
  lo: number;
  hi: number;
  rivals: string[];
  /** Interest in each school on his list, mine included. */
  interest: Record<string, number>;
  committedTo: string | null;
  signedWith: string | null;
  nilAsk: number;
  /** My NIL offer, reserved from the pot until he signs or goes elsewhere. */
  nilOffer: number;
  visited: boolean;
  contacted: boolean;
}

export interface RecruitingTrail {
  phase: 'hs' | 'portal';
  sport: 'cfb' | 'cbb';
  season: number;
  mySchool: string;
  week: number;
  weeks: number;
  hoursPerWeek: number;
  visitsLeft: number;
  /** Money left to offer. Offers are taken out of it when made. */
  nilLeft: number;
  /** NIL actually paid to men who signed with me. */
  nilPaid: number;
  classCap: number;
  recruits: TrailRecruit[];
  /** Commitments each school holds right now (rivals included). */
  commits: Record<string, number>;
  done: boolean;
}

/** One action of mine in a week. */
export interface TrailAction {
  kind: TrailActionKind;
  recruitId: string;
  priority?: RecruitPriority;
  amount?: number;
}

/** The week's game, for the visit multiplier. */
export interface TrailWeek { home: boolean; won: boolean }

/* ------------------------------------------------------------- helpers */

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const pick = <T,>(arr: readonly T[], rng: () => number): T => arr[Math.floor(rng() * arr.length)];

/** Share of a board drawn from my own state. A board is the list my staff
 *  is working, so it leans home. */
export const HOME_SHARE = 0.4;
/** Rival schools on each recruit's list. */
export const RIVALS_PER_RECRUIT = 3;
/** Rivals' weekly pull: a base, plus this much per prestige point over 60. */
export const RIVAL_BASE = 2;
export const RIVAL_PER_PRESTIGE = 0.16;

/** Who listens. A man of this many stars expects to hear from a program of
 *  at least the sport's starNeed; every point short of it costs a share of
 *  what my work does with him, down to REACH_MIN. A low prestige school can
 *  still land a five star, it just has to outwork everyone to do it. */
export const REACH_MIN = 0.25;
export function reach(sport: RecruitingSport, stars: number, prestige: number): number {
  const need = sport.starNeed[clamp(Math.round(stars), 0, sport.starNeed.length - 1)];
  return clamp(1 - Math.max(0, need - prestige) / sport.reachSpan, REACH_MIN, 1);
}

/** How well my program can back a pitch up, 0.2 to 1.5. */
export function pitchFit(p: RecruitPriority, ctx: ProgramPitchContext, r: Pick<TrailRecruit, 'pos' | 'home' | 'nilAsk'>): number {
  switch (p) {
    case 'playing-time': return (ctx.openSpots[r.pos] ?? 0) > 0 ? 1.2 : 0.4;
    case 'nil': return clamp(ctx.nilPot / Math.max(1, r.nilAsk * 3), 0.3, 1.2);
    case 'close-to-home': return ctx.state && ctx.state === r.home ? 1.5 : 0.2;
    case 'winning': return 0.2 + 1.3 * clamp(ctx.winPct, 0, 1);
    case 'coach-stability': return clamp(0.3 + ctx.coachYears * 0.2, 0.3, 1.5);
    case 'pro-path': return clamp((ctx.prestige - 55) / 30, 0.2, 1.5);
  }
}

/** Where a priority sits on his list: 0, 1, 2, or -1 when he does not care. */
export function priorityRank(r: Pick<TrailRecruit, 'priorities'>, p: RecruitPriority): number {
  return r.priorities.indexOf(p);
}

/** The interest a pitch adds. PITCH_RANK_BONUS is the reward for selling
 *  what he actually cares about; a pitch off his list gets only the base. */
export function pitchGain(r: TrailRecruit, p: RecruitPriority, ctx: ProgramPitchContext): number {
  const rank = priorityRank(r, p);
  const bonus = rank >= 0 ? PITCH_RANK_BONUS[rank] : 0;
  return PITCH_BASE + bonus * pitchFit(p, ctx, r);
}

/** The interest a NIL offer adds when it is made. */
export function nilGain(r: TrailRecruit, amount: number): number {
  const rank = priorityRank(r, 'nil');
  const mult = rank >= 0 ? NIL_RANK_MULT[rank] : NIL_OFF_LIST_MULT;
  const share = clamp(amount / Math.max(1, r.nilAsk), 0, NIL_ASK_CAP);
  return NIL_GAIN * share * mult * (r.contacted ? 1 : NIL_COLD_MULT);
}

/** A rival school's weekly pull on one recruit. Rivals sell what their
 *  name can back: prestige for most things, the map for close to home. */
export function rivalGain(s: RecruitingSchool, r: TrailRecruit, rng: () => number): number {
  const fitOf = (p: RecruitPriority) => p === 'close-to-home'
    ? (s.state && s.state === r.home ? 1.5 : 0.3)
    : p === 'playing-time' ? 0.8 : clamp((s.prestige - 55) / 30, 0.3, 1.3);
  const fit = (fitOf(r.priorities[0]) + fitOf(r.priorities[1])) / 2;
  const pull = RIVAL_BASE + Math.max(0, s.prestige - 60) * RIVAL_PER_PRESTIGE;
  return pull * (0.6 + 0.4 * fit) * (0.75 + 0.5 * rng());
}

/** Where a school starts with a recruit before anyone calls. */
export function startInterest(s: RecruitingSchool, home: string, rng: () => number): number {
  return Math.max(0, (s.prestige - 60) * 0.4) + (s.state && s.state === home ? 6 : 0) + rng() * 5;
}

/** The band: 2w + 1 wide, always holding the truth, placed at random. */
export function bandAround(trueOvr: number, w: number, rng: () => number): { lo: number; hi: number } {
  const lo = trueOvr - Math.floor(rng() * (2 * w + 1));
  return { lo, hi: lo + 2 * w };
}

/** Three priorities, drawn without replacement. Stars tilt a man toward the
 *  pros; a one and done sport's elite freshman puts it first. */
export function drawPriorities(sport: RecruitingSport, stars: number, trueOvr: number, rng: () => number): RecruitPriority[] {
  const weight = (p: RecruitPriority) =>
    p === 'pro-path' ? 1 + Math.max(0, stars - 3)
      : p === 'close-to-home' ? (stars <= 3 ? 1.5 : 1)
        : 1;
  const out: RecruitPriority[] = [];
  if (sport.oneAndDone && trueOvr >= sport.eliteLine) out.push('pro-path');
  while (out.length < 3) {
    const left = RECRUIT_PRIORITIES.filter(p => !out.includes(p));
    const total = left.reduce((a, p) => a + weight(p), 0);
    let roll = rng() * total;
    let chosen = left[left.length - 1];
    for (const p of left) { roll -= weight(p); if (roll < 0) { chosen = p; break; } }
    out.push(chosen);
  }
  return out;
}

/** The schools a recruit of this many stars hears from: blue bloods chase
 *  five stars, the middle of the map works the threes. Plus, more often than
 *  not, a school from his own state when there is one. */
export function pickRivals(sport: RecruitingSport, stars: number, home: string, schools: RecruitingSchool[], mine: string, rng: () => number): string[] {
  const need = sport.starNeed;
  const others = schools.filter(s => s.id !== mine);
  const fits = (s: RecruitingSchool) =>
    stars >= 5 ? s.prestige >= need[5]
      : stars === 4 ? s.prestige >= need[4]
        : stars === 3 ? s.prestige >= need[3] && s.prestige <= need[5] + 2
          : s.prestige <= need[4] + 2;
  const pool = others.filter(fits);
  const from = pool.length >= RIVALS_PER_RECRUIT ? pool : others;
  const out: string[] = [];
  while (out.length < Math.min(RIVALS_PER_RECRUIT, from.length)) {
    const s = pick(from, rng);
    if (!out.includes(s.id)) out.push(s.id);
  }
  const local = others.filter(s => s.state && s.state === home && !out.includes(s.id));
  if (local.length && rng() < 0.6) out[out.length - 1] = pick(local, rng).id;
  return out;
}

/** Everything the trail needs from the caller. */
export interface TrailDeps {
  rng: () => number;
  genName: (rng: () => number) => string;
  newId: () => string;
}

/** The board for one cycle, opened with week 0 still to play. */
export function openTrail(
  sport: RecruitingSport, schools: RecruitingSchool[], ctx: ProgramPitchContext,
  season: number, deps: TrailDeps,
): RecruitingTrail {
  const { rng } = deps;
  const states = [...new Set(schools.map(s => s.state).filter((s): s is string => !!s))].sort();
  const byId = new Map(schools.map(s => [s.id, s]));
  const me: RecruitingSchool = byId.get(ctx.schoolId) ?? { id: ctx.schoolId, prestige: ctx.prestige, state: ctx.state };
  const recruits: TrailRecruit[] = [];
  for (let i = 0; i < sport.boardSize; i++) {
    const roll = rng() * 100;
    const stars = roll > 93 ? 5 : roll > 72 ? 4 : roll > 34 ? 3 : 2;
    const trueOvr = sport.ratingBase + stars * 5 + Math.floor(rng() * 9);
    const home = ctx.state && (rng() < HOME_SHARE || !states.length) ? ctx.state : (states.length ? pick(states, rng) : '');
    const rivals = pickRivals(sport, stars, home, schools, ctx.schoolId, rng);
    const interest: Record<string, number> = { [me.id]: startInterest(me, home, rng) };
    for (const id of rivals) interest[id] = startInterest(byId.get(id)!, home, rng);
    const { lo, hi } = bandAround(trueOvr, BAND_START, rng);
    recruits.push({
      id: deps.newId(), name: deps.genName(rng), pos: pick(sport.positions, rng), stars, home,
      priorities: drawPriorities(sport, stars, trueOvr, rng), known: 0,
      trueOvr, lo, hi, rivals, interest,
      committedTo: null, signedWith: null,
      nilAsk: stars * sport.nilPerStar + Math.floor(rng() * 8), nilOffer: 0,
      visited: false, contacted: false,
    });
  }
  recruits.sort((a, b) => b.stars - a.stars || b.hi - a.hi);
  return {
    phase: 'hs', sport: sport.sport, season, mySchool: ctx.schoolId,
    week: 0, weeks: sport.weeks, hoursPerWeek: sport.hoursPerWeek,
    visitsLeft: sport.visitLimit, nilLeft: Math.max(0, Math.floor(ctx.nilPot)), nilPaid: 0,
    classCap: sport.classCap, recruits, commits: {}, done: false,
  };
}

/** Hours a list of actions would cost. */
export function hoursOf(actions: TrailAction[]): number {
  return actions.reduce((a, x) => a + HOURS[x.kind], 0);
}

/** Signing with a school that is not on your board: every man signs
 *  somewhere, and when every school on his list is full it is one of these. */
export const OFF_BOARD = 'elsewhere';

const hasRoom = (t: RecruitingTrail, id: string) => id === OFF_BOARD || (t.commits[id] ?? 0) < t.classCap;
const commitLine = (t: RecruitingTrail) => (t.phase === 'portal' ? PORTAL_COMMIT_AT : COMMIT_AT);

/** His schools by interest, best first, ties by id so a replay is exact. */
function ranked(r: TrailRecruit): string[] {
  return Object.keys(r.interest).sort((a, b) => r.interest[b] - r.interest[a] || (a < b ? -1 : 1));
}

/** Narrow the band: half as wide, still holding the truth, inside the old one. */
function narrow(r: TrailRecruit, rng: () => number): boolean {
  const w = (r.hi - r.lo) / 2;
  if (w <= BAND_MIN) return false;
  const nw = Math.max(BAND_MIN, Math.ceil(w / 2));
  const from = Math.max(r.lo, r.trueOvr - 2 * nw);
  const to = Math.min(r.trueOvr, r.hi - 2 * nw);
  r.lo = from + Math.floor(rng() * (to - from + 1));
  r.hi = r.lo + 2 * nw;
  return true;
}

/** One action of mine. False when the rules refuse it (nothing is spent). */
function applyAction(sport: RecruitingSport, t: RecruitingTrail, r: TrailRecruit, a: TrailAction, ctx: ProgramPitchContext, wk: TrailWeek, rng: () => number): boolean {
  const me = t.mySchool;
  const k = reach(sport, r.stars, ctx.prestige);
  switch (a.kind) {
    case 'evaluate':
      return narrow(r, rng);
    case 'contact':
      r.interest[me] = (r.interest[me] ?? 0) + CONTACT_GAIN * k;
      r.known = Math.min(r.priorities.length, r.known + 1);
      r.contacted = true;
      return true;
    case 'pitch':
      if (!a.priority || !RECRUIT_PRIORITIES.includes(a.priority)) return false;
      r.interest[me] = (r.interest[me] ?? 0) + pitchGain(r, a.priority, ctx) * k;
      return true;
    case 'visit': {
      if (t.visitsLeft <= 0 || r.visited) return false;
      const mult = wk.home ? (wk.won ? VISIT_HOME_WIN : VISIT_HOME_LOSS) : 1;
      r.interest[me] = (r.interest[me] ?? 0) + VISIT_GAIN * mult * k;
      r.visited = true;
      t.visitsLeft -= 1;
      return true;
    }
    case 'nil': {
      const amount = Math.floor(Math.min(a.amount ?? r.nilAsk, t.nilLeft));
      if (amount <= 0 || r.nilOffer > 0) return false;
      t.nilLeft -= amount;
      r.nilOffer = amount;
      r.interest[me] = (r.interest[me] ?? 0) + nilGain(r, amount) * k;
      return true;
    }
  }
}

/** Commitments and flips after the week's work. */
function decide(t: RecruitingTrail, r: TrailRecruit, notes: string[]): void {
  const order = ranked(r);
  const me = t.mySchool;
  if (r.committedTo) {
    const held = r.interest[r.committedTo] ?? 0;
    const to = order.find(id => id !== r.committedTo && hasRoom(t, id) && r.interest[id] >= held + FLIP_MARGIN);
    if (!to) return;
    if (r.committedTo === me) notes.push(`${r.name} (${r.stars} star ${r.pos}) flips his commitment away from you.`);
    if (to === me) notes.push(`${r.name} (${r.stars} star ${r.pos}) flips to you.`);
    t.commits[r.committedTo] = Math.max(0, (t.commits[r.committedTo] ?? 0) - 1);
    t.commits[to] = (t.commits[to] ?? 0) + 1;
    r.committedTo = to;
    return;
  }
  const lead = order.find(id => hasRoom(t, id));
  if (!lead) return;
  const second = Math.max(0, ...order.filter(id => id !== lead).map(id => r.interest[id]));
  if (r.interest[lead] < commitLine(t) || r.interest[lead] - second < COMMIT_LEAD) return;
  r.committedTo = lead;
  t.commits[lead] = (t.commits[lead] ?? 0) + 1;
  if (lead === me) notes.push(`${r.name} (${r.stars} star ${r.pos}) commits to you.`);
}

export interface TrailWeekResult { spent: number; refused: number; notes: string[] }

/**
 * One week on the trail: my actions in the order given until the hours run
 * out, then every rival works every man on its list, then commitments and
 * flips. A man gets at most one action of each kind from me a week. The
 * last week ends in signing day.
 */
export function runTrailWeek(
  sport: RecruitingSport, t: RecruitingTrail, actions: TrailAction[], ctx: ProgramPitchContext, wk: TrailWeek,
  schools: RecruitingSchool[], rng: () => number,
): TrailWeekResult {
  const notes: string[] = [];
  if (t.done || t.week >= t.weeks || t.sport !== sport.sport) return { spent: 0, refused: actions.length, notes };
  const byId = new Map(t.recruits.map(r => [r.id, r]));
  const seen = new Set<string>();
  let spent = 0;
  let refused = 0;
  for (const a of actions) {
    const r = byId.get(a.recruitId);
    const key = `${a.kind}:${a.recruitId}`;
    const cost = HOURS[a.kind];
    if (!r || r.signedWith || seen.has(key) || spent + cost > t.hoursPerWeek || !applyAction(sport, t, r, a, ctx, wk, rng)) { refused += 1; continue; }
    seen.add(key);
    spent += cost;
  }
  /* A standing NIL offer keeps talking every week until signing day. */
  for (const r of t.recruits) {
    if (r.signedWith || r.nilOffer <= 0) continue;
    r.interest[t.mySchool] = (r.interest[t.mySchool] ?? 0) + nilGain(r, r.nilOffer) * NIL_WEEKLY_SHARE * reach(sport, r.stars, ctx.prestige);
  }
  const schoolOf = new Map(schools.map(s => [s.id, s]));
  for (const r of t.recruits) {
    if (r.signedWith) continue;
    for (const id of r.rivals) {
      const s = schoolOf.get(id);
      if (!s) continue;
      const share = r.committedTo && r.committedTo !== id ? RIVAL_COMMITTED_SHARE : 1;
      r.interest[id] = (r.interest[id] ?? 0) + rivalGain(s, r, rng) * share;
    }
  }
  for (const r of t.recruits) if (!r.signedWith) decide(t, r, notes);
  t.week += 1;
  if (t.week >= t.weeks) notes.push(...signingDay(t));
  return { spent, refused, notes };
}

/**
 * Signing day. A committed man signs where he is committed. Everyone else,
 * best first, signs with the school he likes most that still has room, or
 * off the board when every school on his list is full. Every man signs
 * exactly once. NIL is paid to the men who signed with me and every other
 * offer goes back into the pot.
 */
export function signingDay(t: RecruitingTrail): string[] {
  const notes: string[] = [];
  if (t.done) return notes;
  for (const r of t.recruits) {
    if (r.signedWith) continue;
    if (r.committedTo) { r.signedWith = r.committedTo; continue; }
    const to = ranked(r).find(id => hasRoom(t, id)) ?? OFF_BOARD;
    r.signedWith = to;
    if (to !== OFF_BOARD) t.commits[to] = (t.commits[to] ?? 0) + 1;
  }
  for (const r of t.recruits) {
    if (r.signedWith === t.mySchool) {
      t.nilPaid += r.nilOffer;
      notes.push(`${r.name} (${r.stars} star ${r.pos}) signs with you.`);
    } else {
      t.nilLeft += r.nilOffer;
      r.nilOffer = 0;
    }
  }
  t.done = true;
  return notes;
}

/** The men who signed with a school. */
export function signeesOf(t: RecruitingTrail, schoolId: string): TrailRecruit[] {
  return t.recruits.filter(r => r.signedWith === schoolId);
}

/** A class's worth: each signee's true rating over 50, summed. The truth,
 *  not the band, because the band is what the coach guessed. */
export function classScore(t: RecruitingTrail, schoolId: string): number {
  return signeesOf(t, schoolId).reduce((a, r) => a + Math.max(0, r.trueOvr - 50), 0);
}

/* ------------------------------------------------------------- the portal */

/** A man on my roster, as far as the portal cares. */
export interface RosterMan { id: string; name: string; pos: string; ovr: number; cls: string; starter: boolean }

/** The chance a man of mine enters the portal when nobody sits down with
 *  him. Seniors are out of eligibility, and in a one and done sport an elite
 *  freshman is off to the pros, not the portal. A good player stuck behind a
 *  starter is the one who goes. */
export const PORTAL_STARTER_RISK = 0.02;
export const PORTAL_BENCH_RISK = 0.06;
export const PORTAL_STUCK_RISK = 0.3;
export const PORTAL_STUCK_OVR = 70;

export function portalRisk(man: RosterMan, sport: RecruitingSport): number {
  if (man.cls === 'SR') return 0;
  if (sport.oneAndDone && man.cls === 'FR' && man.ovr >= sport.eliteLine) return 0;
  if (man.starter) return PORTAL_STARTER_RISK;
  return man.ovr >= PORTAL_STUCK_OVR ? PORTAL_STUCK_RISK : PORTAL_BENCH_RISK;
}

export interface PortalWindow { lost: RosterMan[]; retained: string[]; trail: RecruitingTrail }

/**
 * The portal opens after the season. First my own men decide: each one I
 * sat down with stays (at most sport.retainSlots of them, the first ones
 * named), every other one goes with his portalRisk. One draw per man in
 * roster order whoever is retained, so a sit down never changes who else
 * goes. Then the window: outside men with real tape (the band is exact),
 * a short window, a lower commit line, and room for as many as I lost plus
 * two, never more than a class.
 */
export function openPortal(
  sport: RecruitingSport, roster: RosterMan[], retainIds: string[], schools: RecruitingSchool[],
  ctx: ProgramPitchContext, season: number, deps: TrailDeps,
): PortalWindow {
  const { rng } = deps;
  const retained = retainIds.filter(id => roster.some(m => m.id === id)).slice(0, sport.retainSlots);
  const lost: RosterMan[] = [];
  for (const m of roster) {
    const goes = rng() < portalRisk(m, sport);
    if (goes && !retained.includes(m.id)) lost.push(m);
  }
  const states = [...new Set(schools.map(s => s.state).filter((s): s is string => !!s))].sort();
  const byId = new Map(schools.map(s => [s.id, s]));
  const me: RecruitingSchool = byId.get(ctx.schoolId) ?? { id: ctx.schoolId, prestige: ctx.prestige, state: ctx.state };
  const recruits: TrailRecruit[] = [];
  for (let i = 0; i < sport.portalSize; i++) {
    const trueOvr = sport.ratingBase + 16 + Math.floor(rng() * 16);
    const stars = trueOvr >= sport.ratingBase + 28 ? 4 : 3;
    const home = states.length ? pick(states, rng) : (ctx.state ?? '');
    let priorities = drawPriorities(sport, stars, trueOvr, rng);
    if (rng() < 0.5) priorities = ['playing-time' as RecruitPriority, ...priorities.filter(p => p !== 'playing-time')].slice(0, 3);
    const rivals = pickRivals(sport, stars, home, schools, ctx.schoolId, rng);
    const interest: Record<string, number> = { [me.id]: startInterest(me, home, rng) };
    for (const id of rivals) interest[id] = startInterest(byId.get(id)!, home, rng);
    recruits.push({
      id: deps.newId(), name: deps.genName(rng), pos: sport.positions[i % sport.positions.length], stars, home,
      priorities, known: 0, trueOvr, lo: trueOvr, hi: trueOvr, rivals, interest,
      committedTo: null, signedWith: null,
      nilAsk: Math.max(1, Math.round((trueOvr - sport.ratingBase - 8) * 1.4)), nilOffer: 0,
      visited: false, contacted: false,
    });
  }
  recruits.sort((a, b) => b.trueOvr - a.trueOvr);
  return {
    lost, retained,
    trail: {
      phase: 'portal', sport: sport.sport, season, mySchool: ctx.schoolId,
      week: 0, weeks: sport.portalWeeks, hoursPerWeek: sport.portalHours,
      visitsLeft: 1, nilLeft: Math.max(0, Math.floor(ctx.nilPot)), nilPaid: 0,
      classCap: Math.min(sport.classCap, lost.length + 2), recruits, commits: {}, done: false,
    },
  };
}

/* ------------------------------------------------------------- the save */

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNumRecord = (v: unknown): v is Record<string, number> =>
  !!v && typeof v === 'object' && !Array.isArray(v) && Object.values(v as object).every(isNum);

function validRecruit(r: unknown): r is TrailRecruit {
  if (!r || typeof r !== 'object') return false;
  const x = r as Record<string, unknown>;
  const pr = x.priorities;
  return isStr(x.id) && isStr(x.name) && isStr(x.pos) && isStr(x.home)
    && isNum(x.stars) && isNum(x.known) && isNum(x.trueOvr) && isNum(x.lo) && isNum(x.hi)
    && x.lo <= x.trueOvr && x.trueOvr <= x.hi
    && Array.isArray(pr) && pr.length === 3 && new Set(pr).size === 3
    && pr.every(p => RECRUIT_PRIORITIES.includes(p as RecruitPriority))
    && Array.isArray(x.rivals) && x.rivals.every(isStr)
    && isNumRecord(x.interest)
    && (x.committedTo === null || isStr(x.committedTo))
    && (x.signedWith === null || isStr(x.signedWith))
    && isNum(x.nilAsk) && isNum(x.nilOffer) && x.nilOffer >= 0
    && typeof x.visited === 'boolean' && typeof x.contacted === 'boolean';
}

/**
 * A saved trail, checked. This block is new and optional: a save without it
 * has no trail and plays as before, and a block that fails any check comes
 * back null so the caller resets this block alone and nothing else in the
 * save. A valid block comes back as a fresh copy.
 */
export function sanitizeTrail(raw: unknown): RecruitingTrail | null {
  if (!raw || typeof raw !== 'object') return null;
  const x = raw as Record<string, unknown>;
  const ok = (x.phase === 'hs' || x.phase === 'portal') && (x.sport === 'cfb' || x.sport === 'cbb')
    && isNum(x.season) && isStr(x.mySchool)
    && isNum(x.week) && isNum(x.weeks) && x.week >= 0 && x.week <= x.weeks
    && isNum(x.hoursPerWeek) && isNum(x.visitsLeft) && x.visitsLeft >= 0
    && isNum(x.nilLeft) && x.nilLeft >= 0 && isNum(x.nilPaid) && x.nilPaid >= 0
    && isNum(x.classCap) && x.classCap >= 0
    && Array.isArray(x.recruits) && x.recruits.every(validRecruit)
    && isNumRecord(x.commits) && Object.values(x.commits).every(n => n >= 0 && n <= (x.classCap as number))
    && typeof x.done === 'boolean';
  if (!ok) return null;
  const ids = (x.recruits as TrailRecruit[]).map(r => r.id);
  if (new Set(ids).size !== ids.length) return null;
  return JSON.parse(JSON.stringify(raw)) as RecruitingTrail;
}
