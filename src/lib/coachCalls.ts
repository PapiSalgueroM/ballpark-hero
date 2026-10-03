/**
 * Round 947: coach's calls. A pure layer a coaching seat sits on top of the
 * engine that has already decided a game: a weekly game plan read against
 * the opponent's roster, and one to three calls inside a close game.
 *
 * Layer one, the game plan. Three or four identities on each side of the
 * ball, each scored -1, 0 or +1 against the opponent's tendency on the other
 * side. His tendency is read off his roster units: the stronger of two sub
 * units, or balanced when they sit within the pack's band. A +1 is worth
 * PLAN_EDGE rating points on that unit, the scale the coordinator edges
 * already use (STAFF_UNIT_EDGE_MAX is 3), and the pack's pointsPerEdge turns
 * rating points into points on the scoreboard, as the engines do.
 *
 * Layer two, the calls. How many moments a game has is drawn from that
 * game's own margin, and a blowout draws none. Every die a game will use is
 * drawn up front from its seed, so a different call never reshuffles a later
 * moment's dice. Each option's odds come from a unit of yours against a unit
 * of his. No single call, and no game's calls added together, can move the
 * margin more than one score.
 *
 * A coach makes these calls. A GM does not, so this is for the coaching
 * seats only and is never offered to the front offices.
 */
import { rngFrom, hashLabel } from '@/lib/careerEngine';
import { CFB_CALLS } from '@/data/coachCalls/cfb';
import { CBB_CALLS } from '@/data/coachCalls/cbb';
import { AFL_CALLS } from '@/data/coachCalls/afl';

export type CallSport = 'cfb' | 'cbb' | 'afl';
export type Units = Record<string, number>;
export interface RosterPlayer { pos: string; ovr: number }
export interface Tendency { id: string; label: string }
export interface PlanIdentity { id: string; label: string; blurb: string; vs: Record<string, -1 | 0 | 1> }
export interface PlanSide {
  /** The two of HIS units that decide his tendency on the other side. */
  read: [string, string];
  /** His tendency when read[0] leads, when read[1] leads, and when level. */
  tendencies: [Tendency, Tendency, Tendency];
  identities: PlanIdentity[];
}
export interface CallOption {
  id: string; label: string; blurb: string;
  /** Your unit and his that set the odds. */
  mine: string; theirs: string;
  /** Odds at level units, and how far each rating point moves them. */
  base: number; slope: number;
  /** Points the call is worth when it comes off, and costs when it does not. */
  win: number; lose: number;
}
export interface MomentDef {
  id: string; title: string; setup: string;
  /** The running margin (yours minus his) this moment can come up at. */
  lead: [number, number];
  weight: number;
  /** The first option is the book call. */
  options: CallOption[];
}
export interface CoachCallsPack {
  sport: CallSport;
  label: string;
  /** Each unit and the positions that make it up. */
  units: Record<string, string[]>;
  /** His two units within this many rating points read as balanced. */
  band: number;
  /** One score: the most any call, or all of a game's calls, can move. */
  oneScore: number;
  /** Beyond this margin a game is a blowout and has no calls. */
  blowout: number;
  /** Points a game per rating point of edge, the engines' own scale. */
  pointsPerEdge: number;
  /** What a level game becomes: overtime (this many points) or a draw. */
  ties: { kind: 'overtime'; points: number } | { kind: 'draw' };
  /** off reads HIS defense, def reads HIS offense. */
  plan: { off: PlanSide; def: PlanSide };
  moments: MomentDef[];
}

/** Rating points a +1 identity is worth on its unit. Half a coordinator's cap. */
export const PLAN_EDGE = 1.5;
/** Odds never leave this range, however lopsided the units. */
export const ODDS_FLOOR = 0.05;
export const ODDS_CEIL = 0.95;
/** The most calls one game can have. */
export const MAX_CALLS = 3;
/** Dice a game draws up front: the count, a kind and an outcome per slot, overtime. */
const DICE = 2 + MAX_CALLS * 2;

export const COACH_CALL_PACKS: Record<CallSport, CoachCallsPack> = { cfb: CFB_CALLS, cbb: CBB_CALLS, afl: AFL_CALLS };

const clampTo = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
/** Rounds half away from zero, so a plan worth -x is exactly a plan worth +x. */
const roundSym = (v: number) => Math.sign(v) * Math.round(Math.abs(v));

/** Each unit's average rating, 60 for a unit nobody fills. */
export function readUnits(pack: CoachCallsPack, players: RosterPlayer[]): Units {
  const out: Units = {};
  for (const [unit, positions] of Object.entries(pack.units)) {
    const xs = players.filter(p => positions.includes(p.pos) && Number.isFinite(p.ovr));
    out[unit] = xs.length ? xs.reduce((s, p) => s + p.ovr, 0) / xs.length : 60;
  }
  return out;
}

/** His tendency on one side, read off his units. */
export function readTendency(pack: CoachCallsPack, side: 'off' | 'def', his: Units): Tendency {
  const s = pack.plan[side];
  const gap = (his[s.read[0]] ?? 60) - (his[s.read[1]] ?? 60);
  return gap > pack.band ? s.tendencies[0] : gap < -pack.band ? s.tendencies[1] : s.tendencies[2];
}

export interface Plan { off: string; def: string }
export interface PlanEdge {
  /** Rating points on each of your units, never past PLAN_EDGE either way. */
  off: number; def: number;
  /** What the plan is worth on the scoreboard, whole points. */
  points: number;
  /** His tendencies the plan was read against. */
  vsOff: Tendency; vsDef: Tendency;
}

function identityScore(pack: CoachCallsPack, side: 'off' | 'def', id: string, his: Units): number {
  const s = pack.plan[side];
  const identity = s.identities.find(i => i.id === id);
  if (!identity) return 0;
  return clampTo(identity.vs[readTendency(pack, side, his).id] ?? 0, -1, 1);
}

/** What a plan is worth against this opponent. An unknown identity is worth nothing. */
export function planEdge(pack: CoachCallsPack, plan: Plan | null | undefined, his: Units): PlanEdge {
  const off = plan ? identityScore(pack, 'off', plan.off, his) * PLAN_EDGE : 0;
  const def = plan ? identityScore(pack, 'def', plan.def, his) * PLAN_EDGE : 0;
  return {
    off, def,
    points: roundSym((off + def) * pack.pointsPerEdge),
    vsOff: readTendency(pack, 'off', his),
    vsDef: readTendency(pack, 'def', his),
  };
}

/** The plan that scores most (best) or least (worst) against him. Ties go to the first listed. */
export function pickPlan(pack: CoachCallsPack, his: Units, which: 'best' | 'worst'): Plan {
  const pick = (side: 'off' | 'def') => {
    let bestId = pack.plan[side].identities[0].id;
    let bestScore = identityScore(pack, side, bestId, his);
    for (const i of pack.plan[side].identities) {
      const v = identityScore(pack, side, i.id, his);
      if (which === 'best' ? v > bestScore : v < bestScore) { bestId = i.id; bestScore = v; }
    }
    return bestId;
  };
  return { off: pick('off'), def: pick('def') };
}

/** A plan read back from a save: both ids must be this pack's, or there is no plan. */
export function sanitizePlan(pack: CoachCallsPack, raw: unknown): Plan | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const ok = (side: 'off' | 'def') => typeof r[side] === 'string' && pack.plan[side].identities.some(i => i.id === r[side]);
  return ok('off') && ok('def') ? { off: r.off as string, def: r.def as string } : null;
}

export interface CallsInput {
  seed: number;
  /** Names the game, so two games in one season draw different dice. */
  gameKey: string;
  /** The engine's final score, before the plan and the calls. */
  myScore: number; oppScore: number;
  mine: Units; his: Units;
  plan?: Plan | null;
}
export interface CallRecord { moment: string; option: string; odds: number; cameOff: boolean; swing: number }
export interface CallsState {
  input: CallsInput;
  plan: PlanEdge;
  /** How many moments this game has, fixed by its own margin. */
  count: number;
  dice: number[];
  /** Yours minus his, the plan and every call so far included. */
  margin: number;
  calls: CallRecord[];
}
export interface Moment { def: MomentDef; slot: number; odds: number[] }
export interface CallsResult {
  myScore: number; oppScore: number; margin: number;
  result: 'win' | 'loss' | 'draw';
  overtime: boolean;
  planPoints: number;
  calls: CallRecord[];
}

/** How many moments a game with this margin has, from one die. */
export function momentCount(pack: CoachCallsPack, margin: number, die: number): number {
  const m = Math.abs(margin);
  if (!Number.isFinite(m) || m > pack.blowout) return 0;
  if (m <= pack.oneScore) return 1 + Math.min(MAX_CALLS - 1, Math.floor(die * MAX_CALLS));
  return die < 0.4 ? 2 : 1;
}

export function startCalls(pack: CoachCallsPack, input: CallsInput): CallsState {
  const rng = rngFrom(hashLabel(`${pack.sport}|${input.seed}|${input.gameKey}`));
  const dice = Array.from({ length: DICE }, () => rng());
  const base = input.myScore - input.oppScore;
  const plan = planEdge(pack, input.plan, input.his);
  return { input, plan, count: momentCount(pack, base, dice[0]), dice, margin: base + plan.points, calls: [] };
}

/** The odds an option comes off, your unit against his. */
export function optionOdds(opt: CallOption, mine: Units, his: Units): number {
  const gap = (mine[opt.mine] ?? 60) - (his[opt.theirs] ?? 60);
  return clampTo(opt.base + opt.slope * gap, ODDS_FLOOR, ODDS_CEIL);
}

/** The next moment, or null once the game's calls are made. */
export function nextMoment(pack: CoachCallsPack, st: CallsState): Moment | null {
  const slot = st.calls.length;
  if (slot >= st.count) return null;
  const eligible = pack.moments.filter(m => st.margin >= m.lead[0] && st.margin <= m.lead[1]);
  if (!eligible.length) return null;
  const total = eligible.reduce((s, m) => s + m.weight, 0);
  let roll = st.dice[1 + slot * 2] * total;
  let def = eligible[eligible.length - 1];
  for (const m of eligible) { roll -= m.weight; if (roll < 0) { def = m; break; } }
  return { def, slot, odds: def.options.map(o => optionOdds(o, st.input.mine, st.input.his)) };
}

/** What a call moves the margin by, inside both caps: one score for the call, one for the game. */
function cappedSwing(pack: CoachCallsPack, st: CallsState, raw: number): number {
  const one = clampTo(raw, -pack.oneScore, pack.oneScore);
  const sofar = st.calls.reduce((s, c) => s + c.swing, 0);
  return clampTo(sofar + one, -pack.oneScore, pack.oneScore) - sofar;
}

/** Make the call. An unknown option is the book call. */
export function answerMoment(pack: CoachCallsPack, st: CallsState, moment: Moment, optionId: string): CallsState {
  const idx = Math.max(0, moment.def.options.findIndex(o => o.id === optionId));
  const opt = moment.def.options[idx];
  const odds = moment.odds[idx];
  const cameOff = st.dice[2 + moment.slot * 2] < odds;
  const swing = cappedSwing(pack, st, cameOff ? opt.win : -opt.lose);
  return { ...st, margin: st.margin + swing, calls: [...st.calls, { moment: moment.def.id, option: opt.id, odds, cameOff, swing }] };
}

/** The final score. A level game goes to overtime (a seeded coin) or stays a draw, as the sport does. */
export function finishCalls(pack: CoachCallsPack, st: CallsState): CallsResult {
  const { myScore, oppScore } = st.input;
  let margin = st.margin;
  let overtime = false;
  if (margin === 0 && pack.ties.kind === 'overtime') {
    overtime = true;
    margin = st.dice[DICE - 1] < 0.5 ? pack.ties.points : -pack.ties.points;
  }
  const delta = margin - (myScore - oppScore);
  const my = Math.max(0, myScore + Math.max(0, delta));
  const opp = Math.max(0, oppScore + Math.max(0, -delta));
  return {
    myScore: my, oppScore: opp, margin: my - opp,
    result: my > opp ? 'win' : my < opp ? 'loss' : 'draw',
    overtime, planPoints: st.plan.points, calls: st.calls,
  };
}

export type CallPolicy = 'best' | 'worst' | 'random' | 'book';

/** Your chance of winning from this margin if nothing else happens. A level game is a coin. */
const winShare = (m: number) => (m > 0 ? 1 : m === 0 ? 0.5 : 0);

/**
 * The option a policy takes. best and worst look one call ahead: the chance
 * the game is won once this call lands, then the points it is worth on
 * average, then the order the pack lists them (the book call first). random
 * draws from the caller's own generator, never the game's dice.
 */
export function chooseOption(pack: CoachCallsPack, st: CallsState, moment: Moment, policy: CallPolicy, pick: () => number = Math.random): string {
  const opts = moment.def.options;
  if (policy === 'book') return opts[0].id;
  if (policy === 'random') return opts[Math.min(opts.length - 1, Math.floor(pick() * opts.length))].id;
  const score = (i: number) => {
    const o = opts[i], p = moment.odds[i];
    const up = cappedSwing(pack, st, o.win), down = cappedSwing(pack, st, -o.lose);
    return [p * winShare(st.margin + up) + (1 - p) * winShare(st.margin + down), p * up + (1 - p) * down];
  };
  let at = 0;
  let atScore = score(0);
  for (let i = 1; i < opts.length; i += 1) {
    const s = score(i);
    const better = s[0] !== atScore[0] ? s[0] > atScore[0] : s[1] > atScore[1];
    const worse = s[0] !== atScore[0] ? s[0] < atScore[0] : s[1] < atScore[1];
    if (policy === 'best' ? better : worse) { at = i; atScore = s; }
  }
  return opts[at].id;
}

/** A whole game's calls under one policy, for the AI, the sim button and the harness. */
export function playCalls(pack: CoachCallsPack, input: CallsInput, policy: CallPolicy, pick?: () => number): CallsResult {
  let st = startCalls(pack, input);
  for (let m = nextMoment(pack, st); m; m = nextMoment(pack, st)) {
    st = answerMoment(pack, st, m, chooseOption(pack, st, m, policy, pick));
  }
  return finishCalls(pack, st);
}
