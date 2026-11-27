import { FORMATIONS, effectiveXIWithSlots, liveGoneIds, slotPosition } from './clubManager';
import type { CareerState, CMPlayer, LiveMatch, MyGoalLine, OppXiLine, PlayEvent, ScorerLine } from './clubManager';
import { keyedRng } from './keyedRng';
import { settleGoalReviews } from './clubManagerVar';
import { clockOrder, type ClockPoint } from './clubManagerClock';
import { readCustomShape, type CustomShapePoint } from './clubManagerPositions';

export interface PhaseOrder {
  v: 1;
  withBall: 'secure-3-2-5' | 'wide-2-3-5';
  withoutBall: 'screen-4-1-4-1' | 'step-4-4-2';
  outlet: 'near' | 'beyond';
  recovery: 'screen' | 'challenge';
}
export interface PhasePerson { playerId: string; name: string; generated?: true }
export interface PhasePoint extends CustomShapePoint { role: string }
export interface PhaseRow extends PhasePerson {
  slot: number; fitness: number; base: CustomShapePoint; withBall: PhasePoint; withoutBall: PhasePoint; returnDistance: number;
}
export interface PhasePositions {
  available: boolean; reason: string | null; keeper: PhasePerson | null; rows: PhaseRow[]; missingSlots: number[];
}
export interface PhaseStep extends ClockPoint { order: PhaseOrder | null; positions?: PhasePositions }
export interface PhaseMove {
  id: string; phase: 'outlet' | 'recovery'; order: PhaseOrder; keeper: { name: string; generated?: true };
  actor: PhaseRow; other: { name: string; generated?: true }; lane: 'left' | 'centre' | 'right'; cover: number;
  support?: number; screenedLane?: boolean; highPressure?: boolean;
  outcome: 'retained' | 'released' | 'intercepted' | 'screened' | 'regained' | 'bypassed'; effort: 0 | 1; spent?: 0 | 1;
}
export function isPhaseOrder(raw: unknown): raw is PhaseOrder {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Object.keys(raw).length !== 5) return false;
  const o = raw as PhaseOrder;
  return o.v === 1 && (o.withBall === 'secure-3-2-5' || o.withBall === 'wide-2-3-5')
    && (o.withoutBall === 'screen-4-1-4-1' || o.withoutBall === 'step-4-4-2')
    && (o.outlet === 'near' || o.outlet === 'beyond') && (o.recovery === 'screen' || o.recovery === 'challenge');
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const named = (v: unknown): boolean => object(v) && typeof v.name === 'string' && !!v.name && (v.generated === undefined || v.generated === true);
const numberIn = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const plotted = (v: unknown): boolean => object(v) && numberIn(v.x, 0, 100) && numberIn(v.y, 0, 100);
const role = (v: unknown): boolean => object(v) && plotted(v) && typeof v.role === 'string' && !!v.role;
function phaseRow(v: unknown): v is PhaseRow {
  return object(v) && named(v) && typeof v.playerId === 'string' && !!v.playerId && numberIn(v.slot,0,10) && Number.isInteger(v.slot)
    && numberIn(v.fitness,0,100) && plotted(v.base) && role(v.withBall) && role(v.withoutBall) && numberIn(v.returnDistance,0,140);
}
function validPositions(v: unknown): v is PhasePositions {
  if (!object(v) || typeof v.available !== 'boolean' || (v.reason !== null && typeof v.reason !== 'string')
    || (v.keeper !== null && (!object(v.keeper) || !named(v.keeper) || typeof v.keeper.playerId !== 'string'))
    || !Array.isArray(v.rows) || v.rows.length > 10 || !v.rows.every(phaseRow) || !Array.isArray(v.missingSlots)
    || !v.missingSlots.every(n => numberIn(n,0,10) && Number.isInteger(n))) return false;
  return new Set(v.rows.map(r => r.slot)).size === v.rows.length && new Set(v.rows.map(r => r.playerId)).size === v.rows.length
    && (!v.available || (v.reason === null && !!v.keeper && v.rows.length === 10 && !v.missingSlots.length));
}
export function isPhaseStep(v: unknown): v is PhaseStep {
  return object(v) && numberIn(v.minute,0,120) && Number.isInteger(v.minute) && (v.plus === undefined || (numberIn(v.plus,0,120) && Number.isInteger(v.plus)))
    && (v.order === null ? v.positions === undefined : isPhaseOrder(v.order) && validPositions(v.positions));
}
export function readPhaseHistory(v: unknown): PhaseStep[] {
  return Array.isArray(v) && v.every(isPhaseStep) ? v : [];
}
/** Interleave actual exits with recorded coaching changes. An optional live clock hides all future play. */
export function phaseHistoryAt(live: LiveMatch, until?: ClockPoint): PhaseStep[] {
  const steps = readPhaseHistory(live.phaseHistory);
  if (!steps.length) return [];
  const exits = [...(live.h1Cards ?? []), ...(live.h2Cards ?? [])].filter(e => e.kind === 'red');
  const stream = [...steps.map(step => ({ at: step, step, id: undefined as string | undefined })),
    ...[...exits,...(live.h1Injuries ?? []),...(live.h2Injuries ?? [])].map(e => ({ at:e, step:undefined, id:e.id }))]
    .sort((a,b) => clockOrder(a.at,b.at));
  const result: PhaseStep[] = [];
  for (const { at, step, id } of stream) {
    if (until && clockOrder(at,until) > 0) break;
    if (step) { result.push(step); continue; }
    const current = result.at(-1), pos = current?.positions;
    if (!id || !current?.order || !pos) continue;
    const removed = pos.rows.find(r => r.playerId === id), keeper = pos.keeper?.playerId === id ? null : pos.keeper;
    if (!removed && keeper === pos.keeper) continue;
    const rows = pos.rows.filter(r => r.playerId !== id);
    result.push({ minute:at.minute, ...(at.plus ? {plus:at.plus} : {}), order:current.order, positions:{
      ...pos, keeper, rows, available:false, reason:keeper ? 'Ten active outfield players are required.' : 'An active goalkeeper is required.',
      missingSlots: removed ? [...pos.missingSlots,removed.slot] : pos.missingSlots,
    } });
  }
  return result;
}
export function isPhaseMove(v: unknown): v is PhaseMove {
  return object(v) && typeof v.id === 'string' && !!v.id && isPhaseOrder(v.order) && named(v.keeper) && named(v.other)
    && phaseRow(v.actor) && (v.lane === 'left' || v.lane === 'right' || v.lane === 'centre')
    && ((v.support === undefined && v.screenedLane === undefined && v.highPressure === undefined)
      || (numberIn(v.support,0,9) && Number.isInteger(v.support) && typeof v.screenedLane === 'boolean' && typeof v.highPressure === 'boolean'))
    && numberIn(v.cover,0,9) && Number.isInteger(v.cover) && (v.effort === 0 || v.effort === 1)
    && (v.spent === undefined || v.spent === 0 || v.spent === 1) && typeof v.outcome === 'string'
    && (v.phase === 'outlet' ? ['retained','released','intercepted'].includes(v.outcome)
      : v.phase === 'recovery' && ['screened','regained','bypassed'].includes(v.outcome));
}
const point = (role: string, x: number, y: number): PhasePoint => ({ role, x, y });
const front = [point('Left winger', 10, 25), point('Left inside forward', 30, 28), point('Centre forward', 50, 17),
  point('Right inside forward', 70, 28), point('Right winger', 90, 25)];
const backFour = [point('Left back', 16, 72), point('Left centre back', 38, 77), point('Right centre back', 62, 77), point('Right back', 84, 72)];
const shapes = {
  'secure-3-2-5': [point('Left covering defender', 25, 70), point('Central defender', 50, 75), point('Right covering defender', 75, 70),
    point('Left holding midfielder', 37, 52), point('Right holding midfielder', 63, 52), ...front],
  'wide-2-3-5': [point('Left centre back', 36, 69), point('Right centre back', 64, 69), point('Left outlet', 15, 49),
    point('Central holding midfielder', 50, 54), point('Right outlet', 85, 49), ...front],
  'screen-4-1-4-1': [...backFour, point('Screening midfielder', 50, 63), point('Left midfielder', 19, 49), point('Left central midfielder', 39, 49),
    point('Right central midfielder', 61, 49), point('Right midfielder', 81, 49), point('Lone forward', 50, 26)],
  'step-4-4-2': [...backFour, point('Left midfielder', 18, 47), point('Left central midfielder', 40, 51),
    point('Right central midfielder', 60, 51), point('Right midfielder', 82, 47), point('Left pressing forward', 37, 28), point('Right pressing forward', 63, 28)],
};

// A ten-bit assignment keeps all ten duties distinct. A vacant slot retains its lane after a dismissal.
function assign(base: CustomShapePoint[], targets: PhasePoint[]): PhasePoint[] {
  const size = 1 << base.length, cost = new Float64Array(size).fill(Infinity), picked = new Int8Array(size);
  const count = new Uint8Array(size);
  cost[0] = 0;
  for (let mask = 0; mask < size - 1; mask++) {
    const index = count[mask], from = base[index];
    for (let j = 0; j < targets.length; j++) {
      const bit = 1 << j, next = mask | bit;
      if (mask === next) continue;
      count[next] = index + 1;
      const dest = targets[j], dx = from.x - dest.x, dy = from.y - dest.y;
      const value = cost[mask] + 1.5 * dx * dx + dy * dy;
      if (value < cost[next]) { cost[next] = value; picked[next] = j; }
    }
  }
  const result: PhasePoint[] = [];
  for (let mask = size - 1; mask; mask ^= 1 << picked[mask]) result.unshift(targets[picked[mask]]);
  return result;
}
const person = (p: CMPlayer): PhasePerson => ({ playerId: p.id, name: p.name, ...(p.generated ? { generated: true } : {}) });
export function phasePositions(career: CareerState, live: LiveMatch | undefined, clock: ClockPoint | undefined, order: PhaseOrder): PhasePositions {
  const unavailable = (reason: string): PhasePositions => ({ available: false, reason, keeper: null, rows: [], missingSlots: [] });
  if (!isPhaseOrder(order)) return unavailable('These phase instructions are unavailable.');
  const at = clock ?? { minute: live?.minute ?? 0 }, reached = (x: ClockPoint) => clockOrder(x, at) <= 0;
  const step = live?.formChanges?.filter(reached).at(-1);
  const shape = live ? step ?? live.kickoffShape ?? live : career;
  const index = shape.formationIndex ?? career.formationIndex, f = FORMATIONS[index];
  if (!f || f.slots.length !== 11 || f.slots.filter(s => s.label === 'GK').length !== 1) return unavailable('A full starting formation is required.');
  const custom = readCustomShape(shape.customShape, index, f.slots);
  if (shape.customShape !== undefined && !custom) return unavailable('The saved positions need review.');
  let ids: (string | undefined)[];
  if (live) {
    ids = [...(step?.order ?? live.startXi)];
    for (const sub of live.subs ?? []) {
      if (!sub.offId || !sub.onId || !reached(sub) || (step && clockOrder(sub, step) < 0)) continue;
      const idx = ids.indexOf(sub.offId);
      if (idx >= 0) ids[idx] = sub.onId;
    }
  } else {
    const xi = effectiveXIWithSlots(career);
    ids = f.slots.map(slot => xi.find(x => x.slot === slot)?.p.id);
  }
  if (ids.length !== 11 || new Set(ids.filter(Boolean)).size !== ids.filter(Boolean).length) return unavailable('A distinct player is needed in each position.');
  const gone = live ? liveGoneIds(live, at.minute, at.plus ?? 0) : new Set<string>();
  const mentality = live?.shapeChanges?.filter(reached).at(-1)?.mentality ?? live?.mentality ?? career.mentality;
  const out = f.slots.flatMap((s, i) => s.label === 'GK' ? [] : [i]);
  const base = out.map(i => slotPosition(f.slots[i], mentality, custom?.points[i]));
  const attack = assign(base, shapes[order.withBall]), defend = assign(base, shapes[order.withoutBall]);
  const available = (i: number) => career.squad.find(p => p.id === ids[i] && !gone.has(p.id));
  const goalie = available(f.slots.findIndex(s => s.label === 'GK'));
  const keeper = goalie?.position === 'GK' ? person(goalie) : null;
  const missingSlots: number[] = [];
  const rows = out.flatMap((slot, i): PhaseRow[] => {
    const p = available(slot);
    if (!p || p.position === 'GK') { missingSlots.push(slot); return []; }
    return [{ ...person(p), slot, fitness: p.fitness, base: base[i], withBall: attack[i], withoutBall: defend[i],
      returnDistance: Math.round(Math.hypot(attack[i].x - defend[i].x, attack[i].y - defend[i].y)) }];
  });
  const reason = !keeper ? 'An active goalkeeper is required.' : missingSlots.length ? 'Ten active outfield players are required.' : null;
  return { available: !reason, reason, keeper, rows, missingSlots };
}

export function setPhaseOrder(state: CareerState, live: LiveMatch, order: PhaseOrder | null, at: ClockPoint): boolean {
  if (live.penaltyCalls || (live.phaseOrder !== undefined && !isPhaseOrder(live.phaseOrder))
    || (live.phaseHistory !== undefined && (!Array.isArray(live.phaseHistory) || !live.phaseHistory.every(isPhaseStep)))) return false;
  if (order === null) {
    if (!live.phaseOrder) return false;
    delete live.phaseOrder;
    live.phaseHistory = [...(live.phaseHistory ?? []), { ...at, order: null }];
    return true;
  }
  if (!isPhaseOrder(order) || (live.phaseOrder && (Object.keys(order) as (keyof PhaseOrder)[]).every(k => order[k] === live.phaseOrder![k]))) return false;
  const positions = phasePositions(state, live, at, order);
  if (!positions.available) return false;
  live.phaseOrder = { ...order };
  live.phaseHistory = [...(live.phaseHistory ?? []), { ...at, order: live.phaseOrder, positions }];
  return true;
}

export function recordPhaseShape(state: CareerState, live: LiveMatch, at: ClockPoint): void {
  if (!isPhaseOrder(live.phaseOrder) || !Array.isArray(live.phaseHistory) || !live.phaseHistory.every(isPhaseStep)) return;
  live.phaseHistory.push({ ...at, order: live.phaseOrder, positions: phasePositions(state, live, at, live.phaseOrder) });
}

// A save changes the side in possession. Only the pass made by that keeper can start this play.
export function drawPhaseMoves(live: LiveMatch, events: PlayEvent[], mineAt: (m: number) => CMPlayer[],
  theirsAt: (m: number) => OppXiLine[], fixture: string, reviewGoals: boolean) {
  const play: PlayEvent[] = [], mine: MyGoalLine[] = [], theirs: ScorerLine[] = [];
  const order = live.phaseOrder, last = readPhaseHistory(live.phaseHistory).at(-1), positions = last?.positions;
  if (!isPhaseOrder(order) || !last?.order || last.order.withBall !== order.withBall || last.order.withoutBall !== order.withoutBall
    || last.order.outlet !== order.outlet || last.order.recovery !== order.recovery || !positions?.available || !positions.keeper) return { play, mine, theirs };
  const { keeper, rows } = positions;
  const prior = [...(live.h1Play ?? []), ...(live.h2Play ?? [])];
  const earlier = prior.flatMap(e => isPhaseMove(e.phaseMove) ? [e.phaseMove] : []);
  const chanceIds = new Set(prior.flatMap(e => e.phaseChance ? [e.phaseChance] : []));
  // drawSegment works on a continuous clock until foldBoard stamps every event and scorer together.
  const clock = (e: ClockPoint) => e.plus ? e.minute + '+' + e.plus : String(e.minute);
  const busy = new Map<string, number>();
  for (const e of events) if (e.kind === 'shot' || e.kind === 'var') busy.set(clock(e), (busy.get(clock(e)) ?? 0) + 1);
  const ordinals = new Map<string, number>();
  for (const e of events) {
    if (e.kind !== 'shot' || !e.on || e.goal || e.penalty || e.freeKick || e.pressChance || e.cornerChance || e.flankChance
      || e.phaseChance || e.phaseMove) continue;
    const t = clock(e), ordinal = ordinals.get(t) ?? 0;
    ordinals.set(t, ordinal + 1);
    const active = mineAt(e.minute), there = theirsAt(e.minute);
    const otherKeeper = there.filter(p => p.p === 'GK'), outfield = there.filter(p => p.p !== 'GK');
    if (!active.some(p => p.id === keeper.playerId) || !rows.every(r => active.some(p => p.id === r.playerId))
      || otherKeeper.length !== 1 || !outfield.length || new Set(there.map(p => p.n)).size !== there.length) continue;
    const outlet = e.side === 'opp';
    const id = [fixture, 'save', t, e.side, e.who, ordinal].join('/');
    const rand = keyedRng(id), x = [20, 50, 80][Math.floor(rand() * 3)];
    const beyond = order.outlet === 'beyond', challenge = order.recovery === 'challenge';
    const dest = outlet ? (beyond ? 32 : 61) : (challenge ? 43 : 61);
    const point = (r: PhaseRow) => outlet ? r.withBall : r.withoutBall;
    const ranked = [...rows].sort((a, b) => Math.hypot(point(a).x-x, point(a).y-dest) - Math.hypot(point(b).x-x, point(b).y-dest));
    const actor = ranked[0];
    const widePos = x < 35 ? ['RW','RM','RB','RWB'] : x > 65 ? ['LW','LM','LB','LWB'] : ['CM','CAM','CDM','ST','CF'];
    const other = outfield.find(p => widePos.includes(p.p)) ?? outfield[Math.floor(rand() * outfield.length)];
    const cover = rows.filter(r => r !== actor && r.withoutBall.y >= 54 && Math.abs(r.withoutBall.x - x) <= 24).length;
    // Travel and the spaces still covered after a sprint affect both the safe outlet and the recovery race.
    const energy = actor.fitness - Math.min(e.minute, 120) * 0.18 - actor.returnDistance * 0.32;
    const support = rows.filter(r => r !== actor && Math.hypot(r.withBall.x-actor.withBall.x,r.withBall.y-actor.withBall.y) < 33).length;
    const inLane = (p: PhasePoint) => Math.abs(p.x-x) <= 26;
    const deepOutlets = rows.filter(r => inLane(r.withBall) && r.withBall.y >= 67).length;
    const wideLinks = rows.filter(r => inLane(r.withBall) && Math.abs(r.withBall.x-50) >= 29 && r.withBall.y >= 38 && r.withBall.y < 60).length;
    const screen = rows.some(r => inLane(r.withoutBall) && r.withoutBall.y >= 58 && r.withoutBall.y < 70);
    const high = rows.some(r => inLane(r.withoutBall) && r.withoutBall.y <= 34);
    const clampChance = (n: number) => Math.min(0.88, Math.max(0.12, n));
    const good = rand() < clampChance(outlet ? (beyond ? 0.44 + 0.15*wideLinks : 0.59 + 0.09*deepOutlets) + 0.032*support + (energy-70)*0.003
      : (challenge ? 0.35 + (high ? 0.20 : 0) : 0.53 + (screen ? 0.21 : 0)) + cover*0.055 + (energy-65)*0.005);
    const launched = outlet && good && rand() < (beyond ? 0.72 : 0.26);
    const outcome = outlet ? (good ? launched ? 'released' : 'retained' : 'intercepted')
      : good ? (challenge ? 'regained' : 'screened') : 'bypassed';
    const effort = (actor.returnDistance >= 20 || (!outlet && challenge)) && earlier.filter(m => m.actor.playerId === actor.playerId && m.effort).length < 2 ? 1 : 0;
    const them = (p: OppXiLine) => ({ name:p.n, ...(p.g ? {generated:true as const} : {}) });
    e.phaseMove = { id, order, phase: outlet ? 'outlet' : 'recovery', keeper: outlet ? keeper : them(otherKeeper[0]), actor,
      other: them(other), lane: x < 35 ? 'left' : x > 65 ? 'right' : 'centre', cover, support, screenedLane:screen, highPressure:high, outcome, effort };
    earlier.push(e.phaseMove);
    if (outcome === 'screened' || outcome === 'retained' || chanceIds.size >= 3 || busy.get(t) !== 1
      || rand() >= (outcome === 'bypassed' && !challenge ? 0.18 : 0.34)) continue;
    chanceIds.add(id);
    const ours = outcome === 'released' || outcome === 'regained', side = ours ? 'me' : 'opp';
    const finisher = outcome === 'released' ? ranked.filter(r => r !== actor).sort((a,b) =>
      Math.hypot(a.withBall.x-x,a.withBall.y-15)-Math.hypot(b.withBall.x-x,b.withBall.y-15))[0] : actor;
    const who = ours ? finisher.name : other.n, generated = ours ? finisher.generated : other.g;
    const xg = outcome === 'bypassed' ? (challenge ? 0.15 : 0.10) : outcome === 'released' && beyond ? 0.15 : 0.12;
    const finish = rand(), goal = finish < xg;
    if (goal) {
      const scorer = { name: who, minute: e.minute, ...(e.plus ? {plus:e.plus} : {}), phaseChance: id };
      const review = reviewGoals ? settleGoalReviews([scorer], side, id) : null;
      if (review) play.push(...review.reviews.map(r => ({ ...r, phaseChance: id })));
      if (review && !review.goals.length) continue;
      if (ours) mine.push({ ...scorer, id: finisher.playerId, ...(outcome === 'released' ? { phaseAssistId: actor.playerId } : {}) });
      else theirs.push({ ...scorer, ...(outcome === 'bypassed' ? { assist: otherKeeper[0].n } : {}), ...(generated ? {gen:true} : {}) });
    }
    play.push({ kind:'shot', side, minute:e.minute, ...(e.plus ? {plus:e.plus} : {}), who, phaseChance:id, xg, on: goal || finish < xg + 0.29,
      ...(goal ? {goal:true} : {}), ...(generated ? {whoGenerated:true} : {}) });
  }
  return { play, mine, theirs };
}

export function payPhaseCosts(state: CareerState, live: LiveMatch): void {
  if (!readPhaseHistory(live.phaseHistory).length) return;
  const paid = new Map<string, number>(), seen = new Set<string>();
  for (const e of [...(live.h1Play ?? []), ...(live.h2Play ?? [])]) {
    const move = e.phaseMove;
    if (e.kind !== 'shot' || !e.on || e.goal || !isPhaseMove(move) || seen.has(move.id)) continue;
    seen.add(move.id);
    const player = state.squad.find(p => p.id === move.actor.playerId), count = paid.get(move.actor.playerId) ?? 0;
    move.spent = move.effort && count < 2 && player && player.fitness >= 21 ? 1 : 0;
    if (player && move.spent) { player.fitness -= 1; paid.set(player.id,count + 1); }
  }
}
