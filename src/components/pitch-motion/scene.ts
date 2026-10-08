import type { PitchEvent, PitchFigure, PitchInput, PitchLine, PitchPoint, PitchSide } from '@/components/pitch-motion/contract';
import { ACTION_SPAN, BEAT_SPAN } from '@/components/pitch-motion/contract';
import type { MotionPlayer, MotionScene } from '@/components/pitch-motion/motion';
import { keyedRng } from '@/lib/keyedRng';

/** Round 1101: where everybody stands between the lines of a feed. Pure functions of (input, clock):
 *  no React, no clock of its own, and never Math.random. Everything drawn between events comes from
 *  keyedRng, one fresh stream per beat, so beat i never depends on how many draws another beat made.
 *  It decides nothing about the match: no goal, shot or minute is made here.
 *
 *  THE PLAN is a list of stretches, each with its own start on the binder's clock. Open play runs on a
 *  grid of BEAT_SPAN from the start of the span. A goal, a shot or a save at place p owns two stretches
 *  written over that grid: an approach from p - 2 beats, and a carrier stretch from p - 1 beat to the end
 *  of the action, in which the shooter has the ball, so the frame the action starts from has it at his
 *  feet and nothing changes under the action. What follows a chance (the kick off, the goal kick, the
 *  keeper with the ball) starts at exactly p + ACTION_SPAN, so the walk back is the hook's own tween.
 *  A corner, a throw in and a foul are staged from their own place. An action wins over a dead ball, a
 *  dead ball over open play, and of two at one place the later line of the feed is the one staged.
 *
 *  ONE ACTION AT A TIME. Lines sit on whole minutes and an action lasts a little longer than one, so a
 *  chance in the minute after another used to start under it: the ball jumped from the net to the next
 *  shooter and a goal never got its kick off. Such a chance now WAITS, inside its own minute: until the
 *  action before it is over, until the kick off after a goal has been seen (both sides back in their own
 *  halves, the ball on the spot), and until its own shooter has had the ball for a quarter of a minute.
 *  When a minute is too full for all three, the kick off is cut from its two beats toward one first, then
 *  the shooter's time on the ball is given up, and the last beat of a goal's kick off goes last.
 *  `actions[n].at` is when it really starts, and a binder that announces a chance itself (Club Manager's
 *  viewer) announces it then.
 *
 *  THE SHAPE places each side as ONE block around the ball, in its own frame (own goal at y 100), and
 *  mirrors the other side. */

/** A figure placed on the pitch for one scene. */
export interface PitchPlaced extends MotionPlayer { line: PitchLine }
export type PitchBeatState = 'open' | 'kickoff' | 'corner' | 'throwin' | 'freekick' | 'goalkick' | 'keeper';
/** One stretch of the plan. Read by the part and by its tests, never built by a binder. */
export interface PitchBeat {
  start: number;
  end: number;
  state: PitchBeatState;
  /** What put it there: the open grid, a chance's approach or carrier stretch, a follow up, a dead ball. */
  via: 'grid' | 'approach' | 'carrier' | 'follow' | 'dead' | 'restart';
  /** The side with the ball. */
  side: PitchSide;
  /** The key of the figure on the ball, or null when that side has nobody on the pitch. */
  carrier: string | null;
  /** Where the ball is wanted, in pitch coordinates ('me' attacks y 0). */
  anchor: PitchPoint;
  /** A control point: the ball arrives along a curve through it. */
  arc?: PitchPoint;
  /** A dead ball: the ball is exactly on its spot, nobody presses, nobody drifts. */
  dead: boolean;
  /** Keys the drift, and tells two stretches apart when they are merged. */
  id: string;
}
/** A goal, a shot or a save the plan staged, and the instant its action starts. */
export interface PitchStagedAction { event: PitchEvent; at: number }
/** Opaque to binders: build it with pitchPlan and hand it back to pitchScene and pitchSceneKey. */
export interface PitchPlan {
  readonly mine: PitchFigure[];
  readonly theirs: PitchFigure[];
  readonly seed: number;
  readonly entries: PitchBeat[];
  readonly actions: PitchStagedAction[];
}

/** Who gets the ball: the front men most, the keeper hardly ever. */
const CARRY: Record<PitchLine, number> = { attack: 3, midfield: 2.6, defence: 1.2, keeper: 0.25 };
/** Where a man wants the ball when he has it, along the pitch in his own frame. */
const ZONE: Record<PitchLine, [number, number]> = { keeper: [84, 90], defence: [62, 78], midfield: [38, 62], attack: [16, 38] };
/** How long a shooter has the ball at his feet before his line plays. */
export const PITCH_LEAD = BEAT_SPAN;
/** The least of that lead a chance is given when it has had to wait for the action before it: long enough
 *  for both sides to be all but in place around him (the hook's walk between two pictures lasts 0.3). */
export const PITCH_SQUEEZE = 0.25;
/** A whole kick off: two beats. */
export const PITCH_KICKOFF = 2 * BEAT_SPAN;
/** The least of a kick off that the next chance's shooter is never led in over: a beat. The kick off after
 *  a goal is seen for more whenever the minute has room: whole when the next chance is two minutes away or
 *  more, and for 0.6 when it is in the very next minute (1 + PITCH_LATE - ACTION_SPAN - PITCH_SQUEEZE: both
 *  sides walk back to their own halves, which is the hook's 0.3 walk between two pictures, and that picture
 *  is held for as long again). Only a third chance in three minutes brings it down to this beat. */
export const PITCH_RESTART = BEAT_SPAN;
/** The longest a chance waits for its turn after its own place: the clock still reads its minute when it starts. */
export const PITCH_LATE = 0.9;
const EPS = 1e-9;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const other = (side: PitchSide): PitchSide => (side === 'me' ? 'opp' : 'me');
/** Own frame to pitch coordinates and back: 'opp' is 'me' turned half a turn. */
const turn = (side: PitchSide, p: PitchPoint): PitchPoint => (side === 'me' ? p : { x: 100 - p.x, y: 100 - p.y });
const placeOf = (event: PitchEvent) => event.minute + (event.plus ?? 0);
const isChance = (event: PitchEvent) => (event.kind === 'goal' || event.kind === 'shot' || event.kind === 'save') && event.side !== 'none';

function pickIndex(list: PitchFigure[], roll: number): number {
  const total = list.reduce((sum, f) => sum + CARRY[f.line], 0);
  let left = roll * total;
  for (let i = 0; i < list.length; i++) { left -= CARRY[list[i].line]; if (left <= 0) return i; }
  return list.length - 1;
}
/** The most advanced outfield figure on a side's own chart, the first of them in list order. */
function mostAdvanced(list: PitchFigure[]): PitchFigure | null {
  let best: PitchFigure | null = null;
  for (const f of list) if (f.line !== 'keeper' && (!best || f.slot.y < best.slot.y)) best = f;
  return best ?? list[0] ?? null;
}
const keeperOf = (list: PitchFigure[]) => list.find(f => f.line === 'keeper') ?? list[0] ?? null;

interface Layer extends Omit<PitchBeat, 'start' | 'end' | 'anchor'> {
  start: number;
  end: number;
  priority: number;
  order: number;
  /** A fixed spot, or a spot worked out from where the ball was just before this stretch. */
  anchor: PitchPoint | ((before: PitchPoint) => PitchPoint);
  arcFrom?: (before: PitchPoint, anchor: PitchPoint) => PitchPoint;
  carrierFrom?: (anchor: PitchPoint) => string | null;
}

/** Cuts the stretch into its plan: open play on a grid, and every chance and dead ball of the feed over it. */
export function pitchPlan(input: PitchInput): PitchPlan {
  const seed = input.seed ?? 0;
  const possession = input.possession ?? 0.5;
  const from = input.span.from;
  const to = Math.max(from + BEAT_SPAN, input.span.to);
  const lists: Record<PitchSide, PitchFigure[]> = { me: input.mine, opp: input.theirs };
  const present = (side: PitchSide): PitchSide => (lists[side].length ? side : other(side));
  const beats = Math.max(1, Math.ceil((to - from) / BEAT_SPAN - EPS));

  /* ---- open play, the default ---- */
  const spell = (i: number): PitchSide => present(keyedRng(`${seed}:s:${Math.floor(i / 3)}`)() < possession ? 'me' : 'opp');
  const zoneAnchor = (side: PitchSide, figure: PitchFigure, rng: () => number): PitchPoint => {
    const [lo, hi] = ZONE[figure.line];
    return turn(side, { x: clamp(figure.slot.x + (rng() * 2 - 1) * 6, 6, 94), y: lo + rng() * (hi - lo) });
  };
  const open = (i: number): Layer => {
    const side = spell(i);
    const list = lists[side];
    const rng = keyedRng(`${seed}:${i}`);
    let index = list.length ? pickIndex(list, rng()) : -1;
    /* Never the same man twice running: if the raw pick repeats the last beat's, the next man in the list has it. */
    if (i > 0 && list.length > 1 && spell(i - 1) === side && pickIndex(list, keyedRng(`${seed}:${i - 1}`)()) === index) index = (index + 1) % list.length;
    const figure = index >= 0 ? list[index] : null;
    return {
      start: from + i * BEAT_SPAN, end: from + (i + 1) * BEAT_SPAN, priority: 0, order: i,
      state: 'open', via: 'grid', side, carrier: figure?.key ?? null, dead: false, id: `o${i}`,
      anchor: figure ? zoneAnchor(side, figure, rng) : { x: 50, y: 50 },
    };
  };

  const layers: Layer[] = [];
  /* A kick off is two beats long, and a kick off must be seen. A period's own kick off keeps its first beat
     above everything (`firm`): a chance of that first minute is led in after it. The kick off after a goal has
     no such layer: how much of it the next chance's shooter may be led in over is decided in ONE place, where
     that shooter's stretch is given its start (`led`, below). */
  const kickoff = (at: number, side: PitchSide, order: number, id: string, firm = 0) => {
    const kicker = present(side);
    for (const [span, priority] of [[PITCH_KICKOFF, 3], [firm, 5]] as const) if (span > 0) layers.push({
      start: at, end: at + span, priority, order, state: 'kickoff', via: 'restart', side: kicker,
      carrier: mostAdvanced(lists[kicker])?.key ?? null, dead: true, id, anchor: { x: 50, y: 50 },
    });
  };
  const opening = input.kickoffs ?? [];
  opening.forEach((k, n) => kickoff(k.at, k.side, n, `k${n}`, PITCH_RESTART));

  /* ---- the chances: which are staged, and when each action starts ---- */
  const chances = input.feed.map((event, order) => ({ event, order, place: placeOf(event) }))
    .filter(c => isChance(c.event) && c.place >= from - EPS && c.place <= to + EPS);
  /* A chance with the last kick of the span is wound up to END at the end, and nothing else plays under it. */
  const last = [...chances].reverse().find(c => c.place >= to - EPS);
  const picked = new Map<number, { event: PitchEvent; order: number; place: number; at: number }>();
  for (const c of chances) {
    if (c === last || c.place >= to - EPS || (last && c.place >= to - ACTION_SPAN - EPS)) continue;
    /* Of two at one place the later line of the feed is the one played. */
    picked.set(c.place, { event: c.event, order: c.order, place: c.place, at: c.place });
  }
  const queue = [...picked.values()].sort((a, b) => a.place - b.place).map(c => ({ ...c, floor: c.place }));
  /* ONE ACTION AT A TIME (the header says why). A chance that comes too soon after the action or the kick
     off before it waits for its turn. It never waits more than PITCH_LATE, and never so long that it would
     still be playing at the last kick's wind up or more than today's 0.05 past the whistle (`held`).
     Forward, each chance gets two instants: `floor`, the soonest it can start with everything before it
     over (that action, and a beat of kick off if it was a goal) and no lead in at all, and `at`, which is
     what it wants: the WHOLE kick off after a goal seen first, and then PITCH_SQUEEZE with its own shooter
     on the ball. A chance two minutes after a goal waits a twentieth of a minute for that. A chance in the
     very next minute waits as long as it may, and where its stretch starts (`led`, below) shares out what
     that leaves. */
  const ceiling = last ? to - 2 * ACTION_SPAN : to - 1;
  const restart = (c: { event: PitchEvent }) => (c.event.kind === 'goal' ? PITCH_RESTART : 0);
  const whole = (c: { event: PitchEvent }) => (c.event.kind === 'goal' ? PITCH_KICKOFF : 0);
  const held = (c: { place: number }, wanted: number) => Math.max(c.place, Math.min(wanted, c.place + PITCH_LATE, Math.max(c.place, ceiling)));
  queue.forEach((c, n) => {
    let floor = c.place;
    let wanted = c.place;
    /* The period's own kick off is seen for a beat before a chance of its first minute is led in. */
    for (const k of opening) if (k.at <= c.place + EPS) { floor = Math.max(floor, k.at + PITCH_RESTART); wanted = Math.max(wanted, k.at + PITCH_RESTART + PITCH_SQUEEZE); }
    const before = queue[n - 1];
    if (before) { floor = Math.max(floor, before.floor + ACTION_SPAN + restart(before)); wanted = Math.max(wanted, before.at + ACTION_SPAN + whole(before) + PITCH_SQUEEZE); }
    c.floor = held(c, floor);
    c.at = held(c, wanted);
  });
  /* And back, twice. First the lead in gives way: when the chance after this one could not wait as long,
     this one starts sooner (never before its floor), so that it and a beat of the kick off after its goal
     are over when the next one starts, the last kick's wind up included. A goal keeps that beat of kick
     off before a shooter keeps his time on the ball. */
  const windup = last ? to - ACTION_SPAN : Infinity;
  for (let n = queue.length - 1; n >= 0; n--) {
    const room = (n + 1 < queue.length ? queue[n + 1].at : windup) - ACTION_SPAN - restart(queue[n]);
    if (queue[n].at > room + EPS) queue[n].at = Math.max(queue[n].floor, room);
  }
  /* Then, where even that does not fit (three goals in three minutes), the kick off gives way: no wait may
     push an action into the one after it. */
  for (let n = queue.length - 2; n >= 0; n--) {
    if (queue[n].at + ACTION_SPAN > queue[n + 1].at + EPS) queue[n].at = Math.max(queue[n].place, queue[n + 1].at - ACTION_SPAN);
  }
  const actions: { event: PitchEvent; order: number; at: number; last?: boolean }[] = queue.map(c => ({ event: c.event, order: c.order, at: c.at }));
  if (last) actions.push({ event: last.event, order: last.order, at: to - ACTION_SPAN, last: true });

  /* ---- a chance: the approach, the carrier stretch and what follows it ---- */
  const shooterOf = (side: PitchSide, event: PitchEvent) => lists[side].find(f => f.name === event.text) ?? mostAdvanced(lists[side]);
  actions.forEach((a, n) => {
    const side = present(a.event.side as PitchSide);
    const shooter = shooterOf(side, a.event);
    const rng = keyedRng(`${seed}:a:${a.order}`);
    const mates = lists[side].filter(f => f.key !== shooter?.key && f.line !== 'keeper');
    const feeder = mates.length ? mates[pickIndex(mates, rng())] : shooter;
    if (feeder) layers.push({
      start: a.at - PITCH_LEAD - BEAT_SPAN, end: a.at - PITCH_LEAD, priority: 2, order: n, state: 'open', via: 'approach', side,
      carrier: feeder.key, dead: false, id: `a${a.order}`, anchor: zoneAnchor(side, feeder, rng),
    });
    /* From the spot (12 from the goal line) or a direct free kick (30 from it) the ball is dead: it sits on its
       spot with the taker a step behind it. From open play the shooter has it at his feet, 22 to 30 out. */
    const set = !!(a.event.penalty || a.event.freeKick);
    const shot = a.event.penalty
      ? { x: 50, y: 12 }
      : { x: clamp((shooter?.slot.x ?? 50) + (rng() * 2 - 1) * 6, 25, 75), y: a.event.freeKick ? 30 : 22 + rng() * 8 };
    /* The shooter is led in for PITCH_LEAD, but never under the action before his (the picture under an action
       does not change while it plays), and after a goal the kick off comes first. `room` is what lies between
       the end of that action and this one's start. With room for it, the kick off is seen whole and the lead
       is what is left. With less (a chance in the very next minute), the lead keeps PITCH_SQUEEZE and the
       kick off has the rest, 0.6 as a rule and never under PITCH_RESTART while there is any lead at all. With
       less than that beat the kick off has it all. A shot out of a kick off picture with nobody led in is the
       worst of these to watch, which is why the lead is not the first thing to go. Nothing at all is drawn
       over the last kick's wind up: it is the only stretch above a kick off. */
    const before = n > 0 ? actions[n - 1] : null;
    const room = before ? a.at - before.at - ACTION_SPAN : Infinity;
    const led = before ? Math.max(0, Math.min(PITCH_LEAD, Math.max(room - whole(before), Math.min(PITCH_SQUEEZE, room - restart(before))))) : PITCH_LEAD;
    const lead = a.at - led;
    layers.push({
      start: lead, end: a.at + ACTION_SPAN, priority: a.last ? 6 : 4, order: n, state: set ? 'freekick' : 'open', via: 'carrier', side,
      carrier: shooter?.key ?? null, dead: set, id: `c${a.order}`, anchor: turn(side, shot),
    });
    const after = a.at + ACTION_SPAN;
    if (after >= to - EPS) return;
    const defending = present(other(side));
    if (a.event.kind === 'goal') {
      /* The side that conceded kicks off. */
      kickoff(after, defending, n, `g${a.order}`);
    } else if (a.event.kind === 'shot') {
      const wide = a.event.flank === 'left' ? 44 : a.event.flank === 'right' ? 56 : a.event.minute % 2 < 1 ? 44 : 56;
      layers.push({
        start: after, end: after + BEAT_SPAN, priority: 3, order: n, state: 'goalkick', via: 'follow', side: defending,
        carrier: keeperOf(lists[defending])?.key ?? null, dead: true, id: `q${a.order}`,
        anchor: defending === 'me' ? { x: wide, y: 94.5 } : { x: wide, y: 5.5 },
      });
    } else {
      layers.push({
        start: after, end: after + BEAT_SPAN, priority: 3, order: n, state: 'keeper', via: 'follow', side: defending,
        carrier: keeperOf(lists[defending])?.key ?? null, dead: true, id: `h${a.order}`,
        anchor: defending === 'me' ? { x: 50, y: 91 } : { x: 50, y: 9 },
      });
    }
  });

  /* ---- corners, throw ins and fouls, each staged from its own place ---- */
  const nearest = (side: PitchSide, spot: PitchPoint, skipKeeper: boolean): PitchFigure | null => {
    let best: PitchFigure | null = null;
    let bestD = Infinity;
    for (const f of lists[side]) {
      if (skipKeeper && f.line === 'keeper') continue;
      const at = turn(side, f.slot);
      const d = Math.hypot(at.x - spot.x, (at.y - spot.y) * 0.5);
      if (d < bestD) { best = f; bestD = d; }
    }
    return best ?? lists[side][0] ?? null;
  };
  input.feed.forEach((event, order) => {
    const p = placeOf(event);
    if (event.side === 'none' || p < from - EPS || p >= to - EPS) return;
    if (event.kind === 'corner') {
      const side = present(event.side);
      const flagX = (before: PitchPoint) => (event.flank ? (event.flank === 'left' ? 2.5 : 97.5) : before.x < 50 ? 2.5 : 97.5);
      const lineY = side === 'me' ? 2.5 : 97.5;
      const flag = (before: PitchPoint): PitchPoint => ({ x: flagX(before), y: lineY });
      const taker = (anchor: PitchPoint) => (lists[side].find(f => f.name === event.text && f.line !== 'keeper') ?? nearest(side, anchor, true))?.key ?? null;
      layers.push({
        start: p, end: p + BEAT_SPAN, priority: 1, order, state: 'corner', via: 'dead', side, carrier: null, carrierFrom: taker,
        dead: true, id: `f${order}`, anchor: flag,
      });
      const rng = keyedRng(`${seed}:f:${order}`);
      const target: PitchPoint = { x: 44 + rng() * 12, y: side === 'me' ? 9 : 91 };
      const header = mostAdvanced(lists[side]);
      layers.push({
        start: p + BEAT_SPAN, end: p + 2 * BEAT_SPAN, priority: 1, order, state: 'open', via: 'dead', side,
        carrier: header?.key ?? null, dead: false, id: `d${order}`, anchor: target,
        /* The midpoint pulled 10 toward the centre of the pitch and 4 away from the goal. */
        arcFrom: (before, anchor) => {
          const mid = { x: (before.x + anchor.x) / 2, y: (before.y + anchor.y) / 2 };
          return { x: mid.x + Math.sign(50 - mid.x) * 10, y: mid.y + (side === 'me' ? 4 : -4) };
        },
      });
    } else if (event.kind === 'throwin') {
      const side = present(event.side);
      const spot = (before: PitchPoint): PitchPoint => ({ x: before.x < 50 ? 2 : 98, y: clamp(before.y, 6, 94) });
      layers.push({
        start: p, end: p + BEAT_SPAN, priority: 1, order, state: 'throwin', via: 'dead', side, carrier: null,
        carrierFrom: anchor => nearest(side, anchor, true)?.key ?? null, dead: true, id: `t${order}`, anchor: spot,
      });
      const rng = keyedRng(`${seed}:t:${order}`);
      const list = lists[side];
      const receiver = list.length ? list[pickIndex(list, rng())] : null;
      layers.push({
        start: p + BEAT_SPAN, end: p + 2 * BEAT_SPAN, priority: 1, order, state: 'open', via: 'dead', side,
        carrier: receiver?.key ?? null, dead: false, id: `u${order}`,
        anchor: receiver ? (before: PitchPoint) => { const own = zoneAnchor(side, receiver, rng); return { x: (own.x + before.x) / 2, y: own.y }; } : { x: 50, y: 50 },
      });
    } else if (event.kind === 'foul') {
      /* The line names the man who fouled, so the free kick is the other side's. */
      const side = present(other(event.side));
      layers.push({
        start: p, end: p + BEAT_SPAN, priority: 1, order, state: 'freekick', via: 'dead', side, carrier: null,
        carrierFrom: anchor => nearest(side, anchor, true)?.key ?? null, dead: true, id: `x${order}`,
        anchor: before => ({ x: clamp(before.x, 6, 94), y: clamp(before.y, 8, 92) }),
      });
      const rng = keyedRng(`${seed}:x:${order}`);
      const list = lists[side];
      const receiver = list.length ? list[pickIndex(list, rng())] : null;
      layers.push({
        start: p + BEAT_SPAN, end: p + 2 * BEAT_SPAN, priority: 1, order, state: 'open', via: 'dead', side,
        carrier: receiver?.key ?? null, dead: false, id: `y${order}`, anchor: receiver ? zoneAnchor(side, receiver, rng) : { x: 50, y: 50 },
      });
    }
  });

  /* ---- one timeline: the highest stretch at every instant, and of two equals the later ---- */
  const cuts = new Set<number>();
  const cut = (v: number) => { if (v > from - EPS && v < to + EPS) cuts.add(Math.round(clamp(v, from, to) * 1e6) / 1e6); };
  for (let i = 0; i <= beats; i++) cut(from + i * BEAT_SPAN);
  cut(from); cut(to);
  for (const layer of layers) { cut(layer.start); cut(layer.end); }
  const marks = [...cuts].sort((a, b) => a - b);
  const pieces: { start: number; end: number; layer: Layer }[] = [];
  for (let k = 0; k + 1 < marks.length; k++) {
    const mid = (marks[k] + marks[k + 1]) / 2;
    let top: Layer | null = null;
    for (const layer of layers) {
      if (layer.start > mid || mid >= layer.end) continue;
      if (!top || layer.priority > top.priority || (layer.priority === top.priority && layer.order > top.order)) top = layer;
    }
    const layer = top ?? open(Math.min(beats - 1, Math.floor((mid - from) / BEAT_SPAN)));
    const previous = pieces[pieces.length - 1];
    /* A scrap of open play shorter than half a beat is not worth a pass: the stretch before it runs on. */
    const scrap = layer.via === 'grid' && marks[k + 1] - marks[k] < BEAT_SPAN / 2 - EPS && !!previous;
    if (previous && (scrap || previous.layer.id === layer.id)) previous.end = marks[k + 1];
    else pieces.push({ start: marks[k], end: marks[k + 1], layer });
  }
  if (!pieces.length) pieces.push({ start: from, end: to, layer: open(0) });

  const entries: PitchBeat[] = [];
  let before: PitchPoint = { x: 50, y: 50 };
  for (const piece of pieces) {
    const layer = piece.layer;
    const anchor = typeof layer.anchor === 'function' ? layer.anchor(before) : layer.anchor;
    const beat: PitchBeat = {
      start: piece.start, end: piece.end, state: layer.state, via: layer.via, side: layer.side,
      carrier: layer.carrierFrom ? layer.carrierFrom(anchor) : layer.carrier, anchor, dead: layer.dead, id: layer.id,
    };
    if (layer.arcFrom) beat.arc = layer.arcFrom(before, anchor);
    entries.push(beat);
    before = anchor;
  }
  return { mine: input.mine, theirs: input.theirs, seed, entries, actions: actions.map(a => ({ event: a.event, at: a.at })) };
}

function entryIndex(plan: PitchPlan, clock: number): number {
  let lo = 0;
  let hi = plan.entries.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (plan.entries[mid].start <= clock + EPS) lo = mid; else hi = mid - 1;
  }
  return lo;
}

/** Changes exactly when the scene changes, so a binder can memoise the scene on it. */
export function pitchSceneKey(plan: PitchPlan, clock: number): string {
  return String(entryIndex(plan, clock));
}

/** The stretch of the plan the clock is in: for the part's own tests and for a binder's sound or label. */
export function pitchBeatAt(plan: PitchPlan, clock: number): PitchBeat {
  return plan.entries[entryIndex(plan, clock)];
}

interface Row { back: number; length: number; width: number; shift: number }
/** One side as one block around the ball `b`, both in that side's own frame. */
function rowFor(beat: PitchBeat, side: PitchSide, b: PitchPoint): Row {
  if (beat.state === 'kickoff') {
    /* Everybody in his own half, and the side not kicking off well clear of the centre spot. */
    return beat.side === side ? { back: 80, length: 27, width: 0.9, shift: 0 } : { back: 84, length: 22, width: 0.9, shift: 0 };
  }
  return beat.side === side
    ? { back: clamp(b.y + 26, 46, 80), length: 38, width: 1, shift: (b.x - 50) * 0.18 }
    : { back: clamp(b.y + 30, 58, 84), length: 30, width: 0.8, shift: (b.x - 50) * 0.3 };
}

interface Own { figure: PitchFigure; x: number; y: number }
function blockOf(plan: PitchPlan, beat: PitchBeat, side: PitchSide): Own[] {
  const list = side === 'me' ? plan.mine : plan.theirs;
  const b = turn(side, beat.anchor);
  const row = rowFor(beat, side, b);
  const outfield = list.filter(f => f.line !== 'keeper');
  const front = Math.min(...outfield.map(f => f.slot.y));
  const deep = Math.max(...outfield.map(f => f.slot.y));
  const placed: Own[] = list.map(figure => {
    if (figure.line === 'keeper') return { figure, x: 50 + (b.x - 50) * 0.12, y: clamp(row.back + 12, 84, 93) };
    const t = deep > front ? (figure.slot.y - front) / (deep - front) : 0.5;
    return { figure, x: clamp(50 + (figure.slot.x - 50) * row.width + row.shift, 4, 96), y: Math.max(14, row.back - (1 - t) * row.length) };
  });
  const hasBall = beat.side === side;
  const carrier = hasBall ? placed.find(p => p.figure.key === beat.carrier) : undefined;
  if (carrier) {
    if (beat.dead) {
      /* On a dead ball the man stands a step and a half behind it, on his own side of it. */
      if (beat.state === 'keeper') { carrier.x = clamp(b.x, 40, 60); carrier.y = clamp(b.y, 86, 95); }
      /* A set shot: he stands so the ball is at the foot the action draws it on, and nothing jumps when he steps up. */
      else if (beat.via === 'carrier') { carrier.x = b.x + (side === 'me' ? -1.3 : 1.3); carrier.y = b.y + 1; }
      else { carrier.x = b.x; carrier.y = Math.min(97, b.y + 1.5); }
    } else {
      /* A man with the ball goes most of the way to where it is wanted. The shooter of a chance is all the
         way there before his line fires, so his plant is a step and not a run through his own team. */
      const pull = beat.via === 'carrier' ? 1 : 0.6;
      carrier.x += (b.x - carrier.x) * pull;
      carrier.y += (b.y - carrier.y) * pull;
    }
  }
  if (!beat.dead) {
    if (!hasBall) {
      /* The press: the nearest outfield man goes part of the way to the ball. */
      let presser: Own | null = null;
      for (const p of placed) if (p.figure.line !== 'keeper' && (!presser || Math.hypot(p.x - b.x, p.y - b.y) < Math.hypot(presser.x - b.x, presser.y - b.y))) presser = p;
      if (presser) { presser.x += (b.x - presser.x) * 0.35; presser.y += (b.y - presser.y) * 0.35; }
    }
    for (const p of placed) {
      if (p.figure.line === 'keeper' || p === carrier) continue;
      const rng = keyedRng(`${plan.seed}:d:${beat.id}:${p.figure.key}`);
      p.x += (rng() * 2 - 1) * 1.2;
      p.y += (rng() * 2 - 1) * 1.2;
    }
  }
  /* Separation, last: nobody of one side stands on a team mate. The man on the ball is never the one moved. */
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i], c = placed[j];
      const dx = c.x - a.x;
      if (Math.abs(dx) >= 5 || Math.abs(c.y - a.y) >= 4) continue;
      const short = 5 - Math.abs(dx);
      const dir = dx >= 0 ? 1 : -1;
      if (a === carrier) c.x += dir * short;
      else if (c === carrier) a.x -= dir * short;
      else { a.x -= dir * short / 2; c.x += dir * short / 2; }
    }
  }
  for (const p of placed) { p.x = clamp(p.x, 3, 97); p.y = clamp(p.y, 3, 97); }
  return placed;
}

/** Both sides and the ball for the stretch the clock is in. */
export function pitchScene(plan: PitchPlan, clock: number): MotionScene<PitchPlaced> {
  const beat = plan.entries[entryIndex(plan, clock)];
  const place = (side: PitchSide): PitchPlaced[] => blockOf(plan, beat, side).map(own => {
    const at = turn(side, own);
    const placed: PitchPlaced = { key: own.figure.key, keeper: own.figure.line === 'keeper', line: own.figure.line, x: at.x, y: at.y };
    if (own.figure.name !== undefined) placed.name = own.figure.name;
    return placed;
  });
  const mine = place('me');
  const theirs = place('opp');
  const holder = (beat.side === 'me' ? mine : theirs).find(p => p.key === beat.carrier);
  let ball: PitchPoint;
  if (beat.dead && beat.state !== 'keeper') ball = { x: beat.anchor.x, y: beat.anchor.y };
  else if (!holder) ball = { x: clamp(beat.anchor.x, 3, 97), y: clamp(beat.anchor.y, 3, 97) };
  else if (beat.state === 'keeper') ball = { x: holder.x, y: holder.y + (beat.side === 'me' ? -1 : 1) };
  else ball = { x: clamp(holder.x + 1.6, 3, 97), y: clamp(holder.y + (beat.side === 'me' ? -2.2 : 2.2), 3, 97) };
  const scene: MotionScene<PitchPlaced> = { mine, theirs, ball, holderKey: holder?.key ?? null };
  if (beat.arc) scene.arc = beat.arc;
  return scene;
}
